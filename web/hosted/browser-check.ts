/**
 * The hosted demo in a real browser, under its real policy: `ADR-0004` step 4.
 *
 *   bun run web/hosted/browser-check.ts <output root>
 *
 * Serves `<output root>/.vercel/output` the way its `config.json` says (every
 * response carries the first route's headers, the page routes rewrite to their
 * `index.html`, everything else is a file or a 404), opens each page in a
 * headless Chrome with a fresh profile, and FAILS on:
 *
 *   - any Content Security Policy violation, which is how a hash the gate
 *     computed and a script the browser runs would disagree;
 *   - any request to anything but the page's own origin;
 *   - any uncaught exception or console error other than the expected 404
 *     for a missing verdict file;
 *   - a page whose script never ran, read from the footer's verdict slot,
 *     which only the page's own script changes;
 *   - a client-side navigation that loads a new document or does not render.
 *
 * ⚠ **This observes ONE browser on ONE run.** It is evidence about what the
 * pages request, not a proof about every browser, and it says nothing about
 * what the host adds after upload (`ADR-0004`; the gate's own "does not check"
 * list, items 1 and 2).
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";

const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", txt: "text/plain; charset=utf-8",
};

/** A local stand-in for the host, from the output's own config.json. */
export function serveOutput(root: string) {
  const base = join(root, ".vercel", "output");
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const headers: Record<string, string> = config.routes[0].headers;
  const rewrites: [RegExp, string][] = config.routes.filter((r: any) => r.dest).map((r: any) => [new RegExp(r.src), r.dest]);
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      let path = new URL(req.url).pathname;
      for (const [re, dest] of rewrites) if (re.test(path)) { path = dest; break; }
      if (path === "/") path = "/index.html";
      const file = join(base, "static", path);
      if (!file.startsWith(join(base, "static")) || !existsSync(file) || !statSync(file).isFile()) return new Response("not found", { status: 404, headers });
      const ext = file.slice(file.lastIndexOf(".") + 1);
      return new Response(Bun.file(file), { headers: { ...headers, "Content-Type": TYPES[ext] ?? "application/octet-stream" } });
    },
  });
}

/** A minimal DevTools-protocol client over one WebSocket. */
class Cdp {
  private id = 0;
  private waiting = new Map<number, (v: any) => void>();
  readonly events: { method: string; params: any; sessionId?: string }[] = [];
  private constructor(private ws: WebSocket) {
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data));
      if (msg.id !== undefined) this.waiting.get(msg.id)?.(msg);
      else this.events.push(msg);
    };
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    return new Cdp(ws);
  }
  async send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    const reply = new Promise<any>((ok) => this.waiting.set(id, ok));
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    const r = await reply;
    if (r.error) throw new Error(`${method}: ${JSON.stringify(r.error)}`);
    return r.result;
  }
  close() { this.ws.close(); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function browserCheck(root: string): Promise<{ problems: string[]; pages: number; requests: number; footer: string | null }> {
  const server = serveOutput(root);
  const origin = `http://127.0.0.1:${server.port}`;
  const profile = mkdtempSync(join(tmpdir(), "wconf-browser-check-"));
  const chrome = Bun.spawn([CHROME, "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
    "--disable-component-update", "--disable-sync", "about:blank"], { stdout: "ignore", stderr: "ignore" });
  const problems: string[] = [];
  let requests = 0;
  let footer: string | null = null;
  try {
    let port = "";
    for (let i = 0; i < 100 && !port; i++) {
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0];
      else await sleep(100);
    }
    if (!port) throw new Error("Chrome did not open a DevTools port");
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m: string, p: any = {}) => cdp.send(m, p, sessionId);
    for (const d of ["Page", "Network", "Runtime", "Log"]) await s(`${d}.enable`);
    // Runs before the page's own scripts, and is not itself subject to the page's policy.
    await s("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective+' '+e.blockedURI));",
    });
    const evalJs = async (expr: string) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

    for (const page of HOSTED_PAGES) {
      const before = cdp.events.length;
      await s("Page.navigate", { url: `${origin}/${page}` });
      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
      await sleep(1200);
      const ev = cdp.events.slice(before);
      for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
        requests++;
        const u = e.params.request.url as string;
        if (!u.startsWith(origin + "/")) problems.push(`/${page}: a request to ${u}`);
      }
      const violations = await evalJs("window.__violations");
      for (const v of violations ?? []) problems.push(`/${page}: CSP violation ${v}`);
      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`/${page}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
      for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
        const t: string = e.params.entry.text ?? "";
        // Two same-origin 404s are expected: the verdict file before the gate
        // has written it, and the favicon a browser asks for unprompted.
        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`/${page}: console error ${t} (${e.params.entry.url ?? "no url"})`);
      }
      const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
      if (page === "") footer = slot;
      // With a verdict file beside the pages, the footer must show the pass it records.
      if (slot !== null && existsSync(join(root, ".vercel/output/static/gate-verdict.json")) && !/^PASS, /.test(slot)) problems.push(`/${page}: a verdict file exists and the footer shows ${JSON.stringify(slot)}`);
      if (slot === null) problems.push(`/${page}: no gate-verdict slot`);
      else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
    }

    // Client-side navigation: one link, no new document, the target renders.
    await s("Page.navigate", { url: `${origin}/` });
    await sleep(1500);
    const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
    await sleep(1200);
    const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    const path = await evalJs("location.pathname");
    const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
    if (path !== "/observer" || !rendered) problems.push(`client navigation to /observer did not render (path ${path}, rendered ${rendered})`);
    if (docsAfter !== docsBefore) problems.push("client navigation loaded a new document; the router did not hydrate");
    cdp.close();
  } finally {
    chrome.kill();
    server.stop(true);
    rmSync(profile, { recursive: true, force: true });
  }
  return { problems, pages: HOSTED_PAGES.length, requests, footer };
}

/**
 * The check's own controls, each a broken copy of a good output run through the
 * same `browserCheck()`. ⚠ The other-origin control removes the policy from its
 * copy, because with the policy in place the browser blocks the request and the
 * violation detector fires instead; this control is for the request detector.
 */
export async function selfTest(root: string): Promise<string[]> {
  const failed: string[] = [];
  const copy = () => { const d = mkdtempSync(join(tmpdir(), "wconf-browser-self-test-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  const elsewhere = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("x") });
  try {
    const good = copy(); dirs.push(good);
    const g = await browserCheck(good);
    if (g.problems.length) failed.push(`the unbroken copy must pass, and reported: ${g.problems[0]}`);

    const other = copy(); dirs.push(other);
    const cfg = join(other, ".vercel/output/config.json");
    const c = JSON.parse(readFileSync(cfg, "utf8"));
    delete c.routes[0].headers["Content-Security-Policy"];
    writeFileSync(cfg, JSON.stringify(c));
    const idx = join(other, ".vercel/output/static/index.html");
    writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<img src="http://127.0.0.1:${elsewhere.port}/pixel.png"></body>`));
    if (!(await browserCheck(other)).problems.some((p) => p.includes(`a request to http://127.0.0.1:${elsewhere.port}/`))) failed.push("a request to another origin was not reported");

    const dead = copy(); dirs.push(dead);
    const wal = join(dead, ".vercel/output/static/wallet/index.html");
    writeFileSync(wal, readFileSync(wal, "utf8").replace(/<script type="module"[^>]*><\/script>/, ""));
    if (!(await browserCheck(dead)).problems.some((p) => p.startsWith("/wallet: the page's script never ran"))) failed.push("a page whose script never ran was not reported");
  } finally {
    elsewhere.stop(true);
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv[2] === "--self-test") {
    const failed = await selfTest(process.argv[3] ?? "");
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`browser-check self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/browser-check.ts <output root>");
  const r = await browserCheck(root);
  console.log(`browser-check: ${r.pages} pages, ${r.requests} requests observed, all to the page's own origin unless listed below`);
  console.log(`  the overview's footer shows: ${r.footer}`);
  for (const p of r.problems) console.log(`  PROBLEM: ${p}`);
  console.log(`browser-check: verdict=${r.problems.length ? "FAIL" : "PASS"} exit=${r.problems.length ? 1 : 0}`);
  process.exit(r.problems.length ? 1 : 0);
}
