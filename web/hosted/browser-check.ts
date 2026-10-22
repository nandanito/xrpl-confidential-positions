/**
 * The hosted demo in a real browser, under its real policy: step 4 of
 * `web/hosted/README.md`'s release procedure (`ADR-0004`).
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
 *   - any uncaught exception, or any console error other than the expected
 *     404 for a missing verdict file, whether the browser logged it or the
 *     page's own script did (`console.error`), on every page AND after the
 *     final client-side navigation (`REVIEW-059` R1-5: both were missed);
 *   - a ledger page whose D-H2 wording is missing from the rendered text, or
 *     present but not visible: every element of it that carries text must pass
 *     the browser's own `checkVisibility` with opacity and visibility, have a
 *     box, keep an effective opacity of at least 0.5 through its ancestors and
 *     be at least 8px, on the page and again after the client navigation
 *     (`REVIEW-059` R1-2, and R2-7: transparent text counted as rendered). ⚠
 *     Text coloured like its background, moved off screen or covered by
 *     another element is not detected;
 *   - a page whose script never ran, read from the footer's verdict slot,
 *     which only the page's own script changes;
 *   - a rendered link into the repository at any commit but the one
 *     `build-manifest.json` names, including one a script assembled after
 *     load, which no reading of the files finds (`REVIEW-060` A-5);
 *   - a client-side navigation that loads a new document or does not render.
 *
 * ⚠ **This observes ONE browser on ONE run.** It is evidence about what the
 * pages request, not a proof about every browser, and it says nothing about
 * what the host adds after upload (`ADR-0004`; the gate's own "does not check"
 * list, items 1 and 2).
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";
import { ADMITTED_URLS, LEDGER_PAGES, repoLinkCommit } from "../../tools/check-web-hosted.ts";
import { DH2_WORDING } from "../app/src/hosted/wording.ts";

const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", txt: "text/plain; charset=utf-8",
};

/** A local stand-in for the host, from the output's own config.json. */
export function serveOutput(root: string) {
  const base = join(root, ".vercel", "output");
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  // ⚠ This server models one shape: headers on the first route only, file
  // rewrites, and the filesystem. A configuration outside it would be served
  // as if it were that shape, so it is refused instead (`REVIEW-059` R1-5).
  for (const [i, r] of (config.routes ?? []).entries()) {
    const keys = Object.keys(r).filter((k) => !["src", "dest", "headers", "continue", "handle"].includes(k));
    if (keys.length || (i > 0 && r.headers !== undefined) || (r.handle !== undefined && r.handle !== "filesystem")) {
      throw new Error(`browser-check cannot model route ${i} (${JSON.stringify(r).slice(0, 120)}); the gate refuses it too`);
    }
  }
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
  // The commit every repository link must name. A missing manifest is a refusal, not a skipped check.
  const manifest = join(root, "build-manifest.json");
  const commit: string | null = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")).commit ?? null : null;
  if (!commit || !/^[0-9a-f]{40}$/.test(commit)) problems.push("no build commit in build-manifest.json, so repository links cannot be checked");
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

    /**
     * Every check over one interval of events, the same for a page load and for
     * the client navigation. ⚠ The intervals are one continuous cursor over the
     * event stream: an event that arrived while an interval was being inspected
     * fell between two of them and was never read (`REVIEW-059` R3-8, measured).
     */
    let cursor = cdp.events.length;
    const inspect = async (label: string) => {
      const violations = await evalJs("window.__violations.splice(0)");
      const ev = cdp.events.slice(cursor);
      cursor = cdp.events.length;
      for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
        requests++;
        const u = e.params.request.url as string;
        if (!u.startsWith(origin + "/")) problems.push(`${label}: a request to ${u}`);
      }
      for (const v of violations ?? []) problems.push(`${label}: CSP violation ${v}`);
      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`${label}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
      for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
        const t: string = e.params.entry.text ?? "";
        // Two same-origin 404s are expected: the verdict file before the gate
        // has written it, and the favicon a browser asks for unprompted.
        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`${label}: console error ${t} (${e.params.entry.url ?? "no url"})`);
      }
      // ⚠ `Log.entryAdded` carries what the BROWSER logs; a page's own
      // `console.error` arrives only as `Runtime.consoleAPICalled`.
      for (const e of ev.filter((e) => e.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(e.params.type))) {
        problems.push(`${label}: console.${e.params.type} ${(e.params.args ?? []).map((a: any) => a.value ?? a.description ?? "").join(" ")}`);
      }
    };
    const squash = (t: string) => t.replace(/\s+/g, " ").trim();
    /** The D-H2 wording, present AND visible, on the page now loaded. */
    const dh2 = async (label: string) => {
      const shown = squash(await evalJs("document.body.innerText"));
      for (const para of DH2_WORDING) if (!shown.includes(squash(para))) problems.push(`${label}: the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))} is not in the rendered text`);
      // ⚠ Measured on the TEXT, not on element boxes: an element under
      // `display:contents` has no box and its text is visible, and an element
      // whose box is fine can have its text clipped away (`REVIEW-059` R3-9).
      // The centre of the text's first rectangle is hit-tested after scrolling
      // it into view, which a clip, an ancestor's overflow or a covering
      // element defeats. Text coloured like its background is not detected.
      const seen = await evalJs(`(() => {
        const out = [];
        for (const root of document.querySelectorAll('[data-dh2-wording]')) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent.trim()) continue;
            const el = n.parentElement;
            let host = el;
            while (host && host.getClientRects().length === 0) host = host.parentElement;
            let opacity = 1;
            for (let e = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
            const range = document.createRange();
            range.selectNodeContents(n);
            const rects = () => [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
            let hit = false;
            if (rects().length) {
              window.scrollTo(0, Math.max(0, window.scrollY + rects()[0].top - window.innerHeight / 2));
              const r = rects()[0];
              const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
              hit = !!at && (el.contains(at) || (host !== null && (host === at || host.contains(at))));
            }
            const visible = host ? host.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true }) : false;
            out.push({ text: n.textContent.trim().slice(0, 30), visible, opacity, rects: rects().length, hit, size: parseFloat(getComputedStyle(el).fontSize) });
          }
        }
        window.scrollTo(0, 0);
        return out;
      })()`);
      if (!seen?.length) problems.push(`${label}: no element carries the D-H2 wording`);
      for (const e of seen ?? []) {
        if (!e.visible || e.opacity < 0.5 || !e.rects || !e.hit || e.size < 8) problems.push(`${label}: D-H2 text ${JSON.stringify(e.text)} is not visible (checkVisibility ${e.visible}, opacity ${e.opacity.toFixed(2)}, ${e.rects} text rectangles, hit-test ${e.hit}, ${e.size}px)`);
      }
    };
    /**
     * Every URL attribute as the browser parsed it, resolved, and refused if it
     * names another origin the gate does not admit. ⚠ The gate decodes and
     * resolves too, and a browser's own parser is the reference it approximates
     * (`REVIEW-059` R3-3).
     */
    const attributes = async (label: string) => {
      const found = await evalJs(`(() => {
        const out = [];
        for (const el of document.querySelectorAll('[src],[href],[action],[formaction],[poster],[data],[srcset]')) {
          for (const a of ['src', 'href', 'action', 'formaction', 'poster', 'data', 'srcset']) {
            const v = el.getAttribute(a);
            if (v === null) continue;
            const candidates = a === 'srcset' ? v.split(',').map((c) => c.trim().split(/\\s+/)[0]).filter(Boolean) : [v];
            for (const c of candidates) {
              let u;
              try { u = new URL(c, location.href); } catch { out.push({ a, c, href: null }); continue; }
              if (u.origin !== location.origin) out.push({ a, c, href: u.href });
            }
          }
        }
        return out;
      })()`);
      for (const f of found ?? []) {
        if (f.href === null) problems.push(`${label}: an attribute URL does not parse: ${JSON.stringify(f.c)}`);
        else if (!ADMITTED_URLS.some(([re]) => re.test(f.href.replace(/\/$/, "")))) problems.push(`${label}: an attribute names another origin: ${f.href}`);
        else {
          const ref = repoLinkCommit(f.href);
          if (ref !== null && ref !== commit) problems.push(`${label}: a link into the repository names ${ref.slice(0, 12)}, not the build's commit: ${f.href}`);
        }
      }
    };

    for (const page of HOSTED_PAGES) {
      const before = cdp.events.length;
      await s("Page.navigate", { url: `${origin}/${page}` });
      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
      await sleep(1200);
      await inspect(`/${page}`);
      await attributes(`/${page}`);
      if ((LEDGER_PAGES as readonly string[]).includes(page)) await dh2(`/${page}`);
      const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
      if (page === "") footer = slot;
      // With a verdict file beside the pages, the footer must show the pass it records.
      if (slot !== null && existsSync(join(root, ".vercel/output/static/gate-verdict.json")) && !/^PASS, /.test(slot)) problems.push(`/${page}: a verdict file exists and the footer shows ${JSON.stringify(slot)}`);
      if (slot === null) problems.push(`/${page}: no gate-verdict slot`);
      else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
    }

    // Client-side navigation: one link, no new document, the target renders,
    // and the interval after the click passes every check a page load does.
    // ⚠ This second load of the overview was cleared without being inspected,
    // so an error on it alone passed (`REVIEW-059` R2-6).
    await s("Page.navigate", { url: `${origin}/` });
    await sleep(1500);
    await inspect("/ loaded again, before the client navigation");
    const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
    await sleep(1200);
    await inspect("client navigation to /observer");
    const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    const path = await evalJs("location.pathname");
    const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
    if (path !== "/observer" || !rendered) problems.push(`client navigation to /observer did not render (path ${path}, rendered ${rendered})`);
    else {
      await dh2("client navigation to /observer");
      await attributes("client navigation to /observer");
    }
    if (docsAfter !== docsBefore) problems.push("client navigation loaded a new document; the router did not hydrate");
    // Whatever arrived during the last checks belongs to an interval too.
    await sleep(300);
    await inspect("after the last check");
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
  const copy = () => {
    const d = mkdtempSync(join(tmpdir(), "wconf-browser-self-test-"));
    cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true });
    cpSync(join(root, "build-manifest.json"), join(d, "build-manifest.json"));
    return d;
  };
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

    // ⚠ The three cases `REVIEW-059` found passing: a page's own console
    // error, an exception after the client navigation, and the D-H2 wording
    // present in the HTML but hidden by the stylesheet.
    const asset = (d: string, re: RegExp) => join(d, ".vercel/output/static/assets", readdirSync(join(d, ".vercel/output/static/assets")).find((n) => re.test(n))!);
    // The module script every page RUNS, read from the pages rather than named.
    // ⚠ This chose `Verdict-*.js` until 2026-10-22, when a shared diagrams
    // module took that chunk's place and the self-test crashed on the name. Its
    // first replacement took any common reference, and a `modulepreload` link is
    // fetched but not run, so a control appended there would never execute
    // (`REVIEW-061` A-9). Only `<script type="module" src>` counts, and it must
    // be one script, the same on every page.
    const shared = (d: string) => {
      const entries = HOSTED_PAGES.map((p) => {
        const h = readFileSync(join(d, ".vercel/output/static", p ? `${p}/index.html` : "index.html"), "utf8");
        const srcs = [...h.matchAll(/<script\b[^>]*>/g)].map((m) => m[0])
          .filter((t) => /\btype=["']?module\b/.test(t))
          .map((t) => t.match(/\bsrc=["']?\/assets\/([^"' >]+\.js)/)?.[1])
          .filter((x): x is string => !!x);
        return [...new Set(srcs)];
      });
      const first = entries[0];
      if (first.length !== 1 || entries.some((e) => e.length !== 1 || e[0] !== first[0])) {
        throw new Error(`the pages do not all run one and the same module script (${JSON.stringify(entries)}), so the self-test has nothing it can rely on to execute`);
      }
      return join(d, ".vercel/output/static/assets", first[0]);
    };
    const logs = copy(); dirs.push(logs);
    const v1 = shared(logs);
    writeFileSync(v1, readFileSync(v1, "utf8") + '\nconsole.error("BROWSER_CHECK_CONTROL");\n');
    if (!(await browserCheck(logs)).problems.some((p) => p.includes("console.error BROWSER_CHECK_CONTROL"))) failed.push("a page's own console.error was not reported");
    const nav = copy(); dirs.push(nav);
    const v2 = shared(nav);
    writeFileSync(v2, readFileSync(v2, "utf8") + "\ndocument.addEventListener('click',e=>{if(e.target.closest('a[href=\"/observer\"]'))setTimeout(()=>{throw Error('BROWSER_CHECK_NAV')},0)});\n");
    if (!(await browserCheck(nav)).problems.some((p) => p.startsWith("client navigation to /observer: exception") && p.includes("BROWSER_CHECK_NAV"))) failed.push("an exception after the client navigation was not reported");
    const hidden = copy(); dirs.push(hidden);
    const css = asset(hidden, /\.css$/);
    writeFileSync(css, readFileSync(css, "utf8") + "\n[data-dh2-wording]{display:none}\n");
    if (!(await browserCheck(hidden)).problems.some((p) => p.startsWith("/observer: the D-H2 sentence"))) failed.push("D-H2 wording hidden by the stylesheet was not reported");
    // ⚠ Round two's examples and the next in each class (`REVIEW-059` R2-6, R2-7).
    for (const [name, rule] of [
      ["transparent", "[data-dh2-wording]{opacity:0}"],
      ["one paragraph nearly transparent", "[data-dh2-wording] p{opacity:0.05}"],
      ["one paragraph at zero size", "[data-dh2-wording] p{font-size:0}"],
    ] as const) {
      const d = copy(); dirs.push(d);
      const c = asset(d, /\.css$/);
      writeFileSync(c, readFileSync(c, "utf8") + `\n${rule}\n`);
      const r = await browserCheck(d);
      if (!r.problems.some((p) => p.startsWith("/observer: D-H2 text") || p.startsWith("/observer: the D-H2 sentence"))) failed.push(`D-H2 wording made invisible (${name}) was not reported`);
      if (!r.problems.some((p) => p.startsWith("client navigation to /observer: D-H2") || p.startsWith("client navigation to /observer: the D-H2"))) failed.push(`D-H2 wording made invisible (${name}) was not reported after the client navigation`);
    }
    // ⚠ Round three's cases (`REVIEW-059` R3-3, R3-8, R3-9), including one
    // that must NOT be reported: visible wording under `display:contents`.
    for (const [name, rule] of [
      ["clipped", "[data-dh2-wording]{clip-path:inset(50%)}"],
      ["clipped by an ancestor's overflow", "section:has(>[data-dh2-wording]){overflow:hidden;max-height:0}"],
    ] as const) {
      const d = copy(); dirs.push(d);
      const c = asset(d, /\.css$/);
      writeFileSync(c, readFileSync(c, "utf8") + `\n${rule}\n`);
      if (!(await browserCheck(d)).problems.some((p) => p.startsWith("/observer: D-H2 text"))) failed.push(`D-H2 wording ${name} was not reported`);
    }
    const contents = copy(); dirs.push(contents);
    const cc = asset(contents, /\.css$/);
    writeFileSync(cc, readFileSync(cc, "utf8") + "\n[data-dh2-wording], [data-dh2-wording] p {display:contents}\n");
    const rc = await browserCheck(contents);
    if (rc.problems.some((p) => p.includes("D-H2"))) failed.push(`visible wording under display:contents was reported: ${rc.problems.find((p) => p.includes("D-H2"))}`);
    const gap = copy(); dirs.push(gap);
    const v4 = shared(gap);
    writeFileSync(v4, readFileSync(v4, "utf8") + "\nif(location.pathname==='/'){const n=Number(sessionStorage.getItem('bc-gap')||0);sessionStorage.setItem('bc-gap',String(n+1));if(n===1){const o=window.__violations.splice;window.__violations.splice=function(...a){if(location.pathname==='/')console.error('BROWSER_CHECK_INSPECT_GAP');return o.apply(this,a)}}}\n");
    if (!(await browserCheck(gap)).problems.some((p) => p.includes("BROWSER_CHECK_INSPECT_GAP"))) failed.push("an error emitted during an inspection was not reported");
    const link = copy(); dirs.push(link);
    const li = join(link, ".vercel/output/static/index.html");
    writeFileSync(li, readFileSync(li, "utf8").replace("</body>", '<a href="&sol;&sol;tracker.example.net/x">x</a></body>'));
    if (!(await browserCheck(link)).problems.some((p) => p.startsWith("/: an attribute names another origin:") && p.includes("//tracker.example.net/x"))) failed.push("an encoded off-site link was not reported");

    // ⚠ A link a script assembles after load: no file holds the URL, so only the rendered page can show it.
    const built = copy(); dirs.push(built);
    const v5 = shared(built);
    writeFileSync(v5, readFileSync(v5, "utf8") + "\nsetTimeout(()=>{const a=document.querySelector('a[href*=\"/blob/\"]');if(a)a.setAttribute('href',['https://github.com','nandanito','xrpl-confidential-positions','blob','0'.repeat(40),'CLAIMS.md'].join('/'))},300);\n");
    if (!(await browserCheck(built)).problems.some((p) => p.startsWith("/how-it-works: a link into the repository names 000000000000"))) failed.push("a repository link assembled at run time at another commit was not reported");

    const second = copy(); dirs.push(second);
    const v3 = shared(second);
    writeFileSync(v3, readFileSync(v3, "utf8") + "\nif(location.pathname==='/'){const n=Number(sessionStorage.getItem('bc-home')||0);sessionStorage.setItem('bc-home',String(n+1));if(n===1)console.error('BROWSER_CHECK_SECOND_HOME')}\n");
    if (!(await browserCheck(second)).problems.some((p) => p.startsWith("/ loaded again") && p.includes("BROWSER_CHECK_SECOND_HOME"))) failed.push("an error on the second load of the overview was not reported");

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
