/**
 * check-web-hosted — architecture §6 step 9's gate: the HOSTED part of
 * `check-web-readonly`, run over the UPLOADED OUTPUT and its routing
 * configuration, never over the source (`ADR-0004`, "What phase 2 step 4's gate
 * must check").
 *
 *   bun run tools/check-web-readonly.ts --hosted <output root> --commit <sha>
 *
 * `<output root>` holds `.vercel/output/`. On a pass it writes
 * `.vercel/output/static/gate-verdict.json`, which the page's footer reads: a
 * digest of every other file, so a reader can tell what the gate passed.
 *
 * ⚠ **Gates in this repository have false-passed before they worked**
 * (`CLAIMS.md` E-165, E-182, E-226). So every run first copies the real output,
 * breaks the copy one way per control, and runs the SAME `runChecks()` over it;
 * each control names the check that must fire, and the unbroken copy must pass.
 * A control that fails stops the run with `CONTROL-FAILED`.
 *
 * ⚠ **It cannot check egress.** It reads files; a visitor's requests are not in
 * them (`ADR-0004`). `web/hosted/browser-check.ts` observes one browser's
 * requests, which is evidence about that browser and not a proof. The full list
 * of what this gate does not check is printed on every run.
 *
 * The last line is always `check-web-hosted: verdict=<WORD> exit=<N>`.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeSeed } from "ripple-address-codec";
import { SOCKET_NEEDLES, SECRET_NEEDLES } from "./web-readonly-needles.ts";
import { DH2_WORDING, DEVNET_NETWORK_ID } from "../web/app/src/hosted/wording.ts";
import { DEMO_ACCOUNTS } from "../web/api/demo-accounts.ts";
import { HOSTED_PAGES } from "../web/hosted/pages.ts";
import { inlineScripts, scriptHash } from "../web/hosted/csp.ts";
import { EMAIL_MARKER, shippedNotice } from "../web/hosted/licence-notices.ts";

const REPO = join(import.meta.dir, "..");

// ------------------------------------------------------------------ the output

/** Every file under `.vercel/output`, by path relative to it. Symlinks refused. */
export function readOutput(root: string): Map<string, Buffer> {
  const base = join(root, ".vercel", "output");
  if (!existsSync(base)) throw new Error(`${base} does not exist`);
  const files = new Map<string, Buffer>();
  const walk = (rel: string) => {
    for (const name of readdirSync(join(base, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(base, r));
      if (st.isSymbolicLink()) throw new Error(`a symlink at ${r}: the uploader may follow it`);
      if (st.isDirectory()) walk(r);
      else if (st.isFile()) files.set(r, readFileSync(join(base, r)));
      else throw new Error(`${r} is not a regular file`);
    }
  };
  walk("");
  return files;
}

const VERDICT = "static/gate-verdict.json";
const text = (b: Buffer) => b.toString("utf8");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** React escapes these in text; the wording is compared after undoing it. */
export function decodeEntities(s: string): string {
  return s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}


// ------------------------------------------------------------------ the checks

export interface Finding { check: string; detail: string }
export interface Expect { commit: string }

/** What the provenance rule admits, by path. Anything else fails. */
export const ADMITTED: RegExp[] = [
  /^config\.json$/,
  /^static\/index\.html$/,
  new RegExp(`^static/(${HOSTED_PAGES.filter(Boolean).join("|")})/index\\.html$`),
  /^static\/assets\/[A-Za-z0-9_-]+\.(js|css)$/,
  /^static\/third-party-licenses\.txt$/,
  /^static\/gate-verdict\.json$/,
];

/**
 * The packages the client bundle may contain, as its licence file lists them.
 * ⚠ A package added by a framework update fails this until the list is changed
 * in review; a cryptography, ledger or server package is never admitted.
 */
export const ADMITTED_PACKAGES = new Set([
  "@tanstack/history", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-start-client",
  "@tanstack/react-store", "@tanstack/router-core", "@tanstack/start-client-core", "@tanstack/store",
  "react", "react-dom", "scheduler", "seroval", "seroval-plugins", "use-sync-external-store", "tailwindcss",
]);

/**
 * Absolute URLs the output may contain, each with why. ⚠ None is fetched: the
 * policy's `connect-src 'self'` refuses any connection elsewhere, and this list
 * exists so a new third-party URL fails the gate rather than passing silently.
 */
export const ADMITTED_URLS: [RegExp, string][] = [
  [/^http:\/\/www\.w3\.org\/(1999\/xlink|2000\/svg|XML\/1998\/namespace|1998\/Math\/MathML)$/, "XML namespace names in React's DOM code"],
  [/^https:\/\/react\.dev\/errors\/$/, "React's error-decoder link in production messages"],
  [/^https:\/\/tailwindcss\.com$/, "Tailwind's licence banner in the stylesheet"],
  [/^http:\/\/localhost$/, "TanStack Router's fallback origin when window.origin is null"],
  [/^https:\/\/github\.com\/nandanito\/xrpl-confidential-positions(\/commit\/[0-9a-f]{40}|#run-it)?$/, "links to the public repository"],
  [/^https:\/\/s\.devnet\.rippletest\.net:51234$/, "the ledger endpoint, NAMED on the page as the source of its values"],
  [/^https:\/\/[a-z0-9-]+\.vercel\.app$/, "the canonical address the footer names"],
];

const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");

export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
  const f: Finding[] = [];
  const add = (check: string, detail: string) => f.push({ check, detail });
  const paths = [...files.keys()].filter((p) => p !== VERDICT);
  const html = new Map(paths.filter((p) => p.endsWith(".html")).map((p) => [p, text(files.get(p)!)]));

  // 1. Inventory and provenance.
  for (const p of paths) if (!ADMITTED.some((re) => re.test(p))) add("inventory", `${p} is not admitted by the provenance rule`);
  for (const p of HOSTED_PAGES) if (!files.has(PAGE_HTML(p))) add("inventory", `the page /${p} is missing`);

  // 2. No source maps.
  for (const p of paths) if (/sourceMappingURL|\.map$/.test(p) || /[#@]\s*sourceMappingURL=/.test(text(files.get(p)!))) add("no-source-maps", `${p} carries or references a source map`);

  // 3. No server code: no function, no middleware, routes to files only.
  for (const p of paths) if (p.startsWith("functions/") || p.includes("/functions/")) add("no-server-code", `${p} is a function`);
  let config: any = null;
  try { config = JSON.parse(text(files.get("config.json") ?? Buffer.from("null"))); } catch { add("no-server-code", "config.json is not JSON"); }
  if (!config || config.version !== 3) add("no-server-code", "config.json is missing or not Build Output API version 3");
  else {
    for (const k of Object.keys(config)) if (k !== "version" && k !== "routes") add("no-server-code", `config.json has a top-level key ${k}`);
    for (const r of config.routes ?? []) {
      for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
      if (r.handle !== undefined && r.handle !== "filesystem") add("no-server-code", `a route hands off to ${r.handle}`);
      if (r.dest !== undefined && (typeof r.dest !== "string" || !files.has(`static${r.dest}`))) add("no-server-code", `a route's dest ${JSON.stringify(r.dest)} is not a file in the output`);
    }
  }

  // 4. No socket client, signer path, decryption routine, secret name or build variable.
  const NEEDLES = [...SOCKET_NEEDLES, ...SECRET_NEEDLES, "WebAssembly", ".wasm", "ProjectivePoint", "mptool", "mpt_", "elgamal_", "VITE_", "WCONF_", "eval(", "new Function"];
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    const t = text(files.get(p)!);
    for (const n of NEEDLES) if (t.includes(n)) add("no-socket-secret-or-decryption", `${p} contains ${JSON.stringify(n)}`);
    for (const api of ["new WebSocket", "EventSource(", "sendBeacon", "XMLHttpRequest"]) if (t.includes(api)) add("no-other-connection", `${p} uses ${api}`);
  }

  // 5. Absolute URLs, against the admitted list.
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    for (const m of text(files.get(p)!).matchAll(/\bhttps?:\/\/[A-Za-z0-9.:/#_-]+/g)) {
      const u = m[0].replace(/[.:]+$/, "");
      if (!ADMITTED_URLS.some(([re]) => re.test(u))) add("urls", `${p} names ${u}`);
    }
  }

  // 6. The Content Security Policy, as config.json delivers it.
  const first = config?.routes?.[0];
  const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
  if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
  else {
    const dirs = new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; }));
    const exact: Record<string, string[]> = {
      "default-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'"], "font-src": ["'self'"],
      "connect-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "form-action": ["'none'"], "frame-ancestors": ["'none'"],
    };
    for (const [k, v] of Object.entries(exact)) if (JSON.stringify(dirs.get(k) ?? null) !== JSON.stringify(v)) add("csp", `${k} is ${JSON.stringify(dirs.get(k) ?? null)}, not ${v.join(" ")}`);
    for (const k of dirs.keys()) if (!(k in exact) && k !== "script-src") add("csp", `an unexpected directive ${k}`);
    const script = dirs.get("script-src") ?? [];
    if (script[0] !== "'self'") add("csp", "script-src does not start with 'self'");
    const allowed = new Set(script.slice(1));
    for (const tok of allowed) if (!/^'sha256-[A-Za-z0-9+/]+=*'$/.test(tok)) add("csp", `script-src admits ${tok}`);
    const needed = new Set([...html.values()].flatMap((h) => inlineScripts(h).map(scriptHash)));
    for (const h of needed) if (!allowed.has(h)) add("csp", `an inline script's hash ${h} is not admitted, so the page would not run`);
    for (const h of allowed) if (!needed.has(h)) add("csp", `script-src admits ${h}, which no page carries`);
    for (const [h, v] of Object.entries({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" })) if (first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
  }
  for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);

  // 7. No input that asks a visitor for anything.
  for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);

  // 8. Every page that renders a ledger value renders the wording, the network check and the index.
  const indices = new Set<string>();
  for (const [p, h] of html) {
    if (!h.includes("data-ledger-value")) continue;
    const plain = decodeEntities(h);
    for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", `${p} renders a ledger value without the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))}`);
    if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", `${p} renders a ledger value without the Devnet network check`);
    const idx = h.match(/data-ledger-index="(\d+)"/);
    if (!idx) add("ledger-wording", `${p} renders a ledger value without the ledger index`);
    else indices.add(idx[1]);
  }
  if (indices.size > 1) add("ledger-wording", `pages name different ledgers: ${[...indices].join(", ")}`);
  for (const [p, label] of [["static/observer/index.html", "Observer view: "], ["static/issuer/index.html", "Issuer&#x27;s copy: "]] as const) {
    const n = (html.get(p) ?? "").split(label).length - 1;
    if (html.has(p) && n !== DEMO_ACCOUNTS.length) add("accounts", `${p} renders ${n} account panels, not ${DEMO_ACCOUNTS.length}`);
  }

  // 9. The commit and the verdict, on every page.
  for (const [p, h] of html) {
    if (!h.includes(`/commit/${want.commit}`)) add("commit-and-verdict", `${p} does not name commit ${want.commit}`);
    if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
  }

  // 10. Licence notices for what is bundled, and nothing that should never be.
  const lic = files.get("static/third-party-licenses.txt");
  if (!lic) add("licences", "static/third-party-licenses.txt is missing");
  else {
    // Separator, `name@version (licence)`, separator, licence text: split on the
    // separator lines, so each header is followed by its own body.
    const parts = text(lic).split(/^={20,}$/m);
    const names: [string, string, string][] = [];
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const head = parts[i].trim().match(/^((?:@[^/\s]+\/)?[^@\s]+)@\S+ \([^)]*\)$/);
      if (!head) { add("licences", `an entry header is malformed: ${JSON.stringify(parts[i].trim().slice(0, 60))}`); continue; }
      names.push([head[0], head[1], parts[i + 1]]);
    }
    // Each notice must be the package's own licence file with only its email
    // addresses removed (E-335), read from this checkout's node_modules at the
    // same version. A version this checkout does not hold cannot be verified.
    for (const [header, name, body] of names) {
      const root = join(REPO, "node_modules", name);
      const version = header.slice(name.length + 1, header.indexOf(" "));
      const have = existsSync(join(root, "package.json")) ? JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version : null;
      if (have !== version) { add("licences", `${name}@${version} cannot be verified: this checkout's node_modules holds ${have ?? "nothing"}`); continue; }
      if (shippedNotice(root) !== body.trim()) add("licences", `${name}'s notice is not its own licence file with only email addresses removed`);
    }
    if (names.length === 0) add("licences", "the licence file lists no package");
    for (const [, name, body] of names) {
      if (!ADMITTED_PACKAGES.has(name)) add("licences", `the bundle contains ${name}, which is not admitted`);
      if (body.trim().length < 100) add("licences", `${name}'s licence text is missing or truncated`);
    }
    for (const must of ["react", "react-dom"]) if (!names.some((m) => m[1] === must)) add("licences", `${must} is bundled and not listed`);
  }
  return f;
}

// ------------------------------------------------------------------ the secret scan

/** `check-no-secrets --dir`, with the local store. Its verdict line is required. */
export function secretScan(root: string): { ok: boolean; line: string } {
  const r = Bun.spawnSync(["bun", "run", join(REPO, "tools/check-no-secrets.ts"), "--dir", join(root, ".vercel", "output")], { stdout: "pipe", stderr: "pipe" });
  const lines = r.stdout.toString().trim().split("\n");
  const last = lines[lines.length - 1] ?? "";
  return { ok: last === "check-no-secrets: verdict=PASS exit=0" && r.exitCode === 0, line: last };
}

// ------------------------------------------------------------------ controls

type Mutate = (dir: string) => void;
const out = (dir: string, p: string) => join(dir, ".vercel", "output", p);
const edit = (dir: string, p: string, fn: (s: string) => string) => writeFileSync(out(dir, p), fn(readFileSync(out(dir, p), "utf8")));
const firstJs = (dir: string) => "static/assets/" + readdirSync(out(dir, "static/assets")).find((n) => n.endsWith(".js"))!;
const editConfig = (dir: string, fn: (c: any) => void) => edit(dir, "config.json", (s) => { const c = JSON.parse(s); fn(c); return JSON.stringify(c); });

/** Each control: what it breaks, and the check that must fire. */
export const CONTROLS: [string, string, Mutate][] = [
  ["a stray file", "inventory", (d) => writeFileSync(out(d, "static/notes.txt"), "x")],
  ["a source map", "inventory", (d) => writeFileSync(out(d, "static/assets/app.js.map"), "{}")],
  ["a sourceMappingURL comment", "no-source-maps", (d) => edit(d, firstJs(d), (s) => s + "\n//# sourceMappingURL=app.js.map\n")],
  ["a missing page", "inventory", (d) => rmSync(out(d, "static/issuer/index.html"))],
  ["a serverless function", "no-server-code", (d) => { const p = out(d, "functions/api.func"); mkdirSync(p, { recursive: true }); writeFileSync(join(p, ".vc-config.json"), "{}"); }],
  ["middleware in config.json", "no-server-code", (d) => editConfig(d, (c) => c.routes.unshift({ src: "/(.*)", middlewarePath: "_middleware" }))],
  ["a rewrite to another host", "no-server-code", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/x", dest: "https://example.com/x" }))],
  ["a top-level overrides key", "no-server-code", (d) => editConfig(d, (c) => (c.overrides = {}))],
  ["the signer socket path in a script", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const p="/run/wconf/signer.sock";')],
  ["a WebAssembly module", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ";WebAssembly.instantiate(x);")],
  ["a build variable inlined", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const v="VITE_WCONF_WEB_PORT";')],
  ["a WebSocket", "no-other-connection", (d) => edit(d, firstJs(d), (s) => s + ';new WebSocket("wss://x");')],
  ["a third-party URL", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="https://analytics.example.net/x">x</a></body>'))],
  ["'unsafe-inline' in script-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")))],
  ["a widened connect-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("connect-src 'self'", "connect-src 'self' https://s.devnet.rippletest.net:51234")))],
  ["an inline script the policy does not admit", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<script>window.x=1</script></body>"))],
  ["no policy at all", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Content-Security-Policy"])],
  // ⚠ The first build hashed the file's bytes; the browser hashes the parsed
  // text, refused every page's hydration script, and this gate had passed it.
  ["a script carrying NUL, admitted by its RAW hash", "csp", (d) => {
    const raw = "window.y='\u0000'";
    edit(d, "static/index.html", (s) => s.replace("</body>", `<script>${raw}</script></body>`));
    const rawHash = `'sha256-${createHash("sha256").update(raw, "utf8").digest("base64")}'`;
    editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", `script-src 'self' ${rawHash}`)));
  }],
  ["an inline style attribute", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("<body>", '<body><div style="color:red">x</div>'))],
  ["an input asking for a seed", "no-inputs", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<input name="seed"></body>'))],
  ["the D-H2 wording removed from the observer page", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replace(/Vercel, which hosts this page/g, "This host"))],
  ["the network check changed", "ledger-wording", (d) => edit(d, "static/issuer/index.html", (s) => s.replace(`data-network-id="${DEVNET_NETWORK_ID}"`, 'data-network-id="0"'))],
  ["an account panel dropped", "accounts", (d) => edit(d, "static/observer/index.html", (s) => s.replace("Observer view: ", "Observed: "))],
  ["another commit on one page", "commit-and-verdict", (d) => edit(d, "static/wallet/index.html", (s) => s.replace(/\/commit\/[0-9a-f]{40}/g, "/commit/" + "0".repeat(40)))],
  ["a cryptography package bundled", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s + "\n" + "=".repeat(78) + "\n@noble/curves@1.9.7 (MIT)\n" + "=".repeat(78) + "\n" + "MIT ".repeat(40) + "\n")],
  ["the licence file removed", "licences", (d) => rmSync(out(d, "static/third-party-licenses.txt"))],
  ["a licence notice altered", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s.replace("Permission is hereby granted", "Permission is granted"))],
  // ⚠ The LAST marker: the first is the file's header line explaining it, and
  // restoring that one changes no notice, so this control first tested nothing.
  ["a personal email restored to a notice", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => {
    const at = s.lastIndexOf(EMAIL_MARKER);
    return at < 0 ? s : s.slice(0, at) + "someone@example.org" + s.slice(at + EMAIL_MARKER.length);
  })],
];

export function runControls(root: string, want: Expect): { run: number; failed: string[] } {
  const failed: string[] = [];
  let run = 0;
  const fresh = () => { const d = mkdtempSync(join(tmpdir(), "check-web-hosted-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  try {
    const clean = fresh(); dirs.push(clean);
    run++;
    const base = runChecks(readOutput(clean), want);
    if (base.length) failed.push(`the unbroken copy must pass, and has ${base.length} finding(s): ${base[0].check}: ${base[0].detail}`);
    for (const [name, check, mutate] of CONTROLS) {
      const d = fresh(); dirs.push(d);
      run++;
      mutate(d);
      const got = runChecks(readOutput(d), want);
      if (!got.some((x) => x.check === check)) failed.push(`${name}: expected a '${check}' finding, got ${got.length ? got.map((x) => x.check).join(", ") : "none"}`);
    }
    // The secret scan, through the same function the real check calls.
    const d = fresh(); dirs.push(d);
    run++;
    edit(d, firstJs(d), (s) => s + `;const s="${plantedSeed()}";`);
    if (secretScan(d).ok) failed.push("a seed planted in a script: check-no-secrets --dir passed it");
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return { run, failed };
}

/** A real-entropy ed25519 seed, made at run time so this file holds none. */
function plantedSeed(): string {
  return encodeSeed(randomBytes(16), "ed25519");
}

// ------------------------------------------------------------------ disclosure

export function whatThisDoesNotCheck(): string[] {
  return [
    "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
    "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store; the isolated build is what addresses that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. A form control built in the BROWSER after hydration. The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. The licence list's COMPLETENESS beyond the module graph the build reported. A package inlined without its module path would be missed.",
  ];
}

// ------------------------------------------------------------------ main

export function verdictFile(files: Map<string, Buffer>, want: Expect, controls: number) {
  const entries = [...files].filter(([p]) => p !== VERDICT).sort(([a], [b]) => a.localeCompare(b));
  const perFile = Object.fromEntries(entries.map(([p, b]) => [p, sha256(b)]));
  return {
    verdict: "PASS",
    gate: "check-web-readonly --hosted (tools/check-web-hosted.ts)",
    checkedAt: new Date().toISOString(),
    commit: want.commit,
    controls,
    files: entries.length,
    outputDigest: sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n")),
    perFile,
    doesNotCheck: whatThisDoesNotCheck(),
  };
}

export async function runHosted(argv: string[]): Promise<number> {
  const finish = (word: string, exit: number) => { console.log(`check-web-hosted: verdict=${word} exit=${exit}`); return exit; };
  try {
    const at = argv.indexOf("--hosted"), ct = argv.indexOf("--commit");
    const root = argv[at + 1], commit = argv[ct + 1];
    if (!root || root.startsWith("--")) throw new Error("--hosted needs the output root, the directory that holds .vercel/output");
    if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("--commit needs the full public commit id the build ran from");
    const want = { commit };
    console.log(`check-web-hosted over ${join(root, ".vercel/output")}, expecting commit ${commit}`);

    const c = runControls(root, want);
    console.log(`controls: ${c.run - c.failed.length}/${c.run} passed, each through the same runChecks() and secretScan() as the real check`);
    if (c.failed.length) { for (const x of c.failed) console.log(`  CONTROL FAILED: ${x}`); return finish("CONTROL-FAILED", 2); }

    const files = readOutput(root);
    const findings = runChecks(files, want);
    const secrets = secretScan(root);
    if (!secrets.ok) findings.push({ check: "secrets", detail: `check-no-secrets --dir: ${secrets.line}` });
    console.log(`scanned: ${[...files.keys()].filter((p) => p !== VERDICT).length} file(s); secret sweep: ${secrets.line}`);
    console.log("\nWhat this gate does NOT check:");
    for (const l of whatThisDoesNotCheck()) console.log(`  ${l}`);
    if (findings.length) {
      console.log(`\nFAILING: ${findings.length}`);
      for (const x of findings) console.log(`  ${x.check}: ${x.detail}`);
      return finish("FAIL", 1);
    }
    const v = verdictFile(files, want, c.run);
    writeFileSync(join(root, ".vercel/output", VERDICT), JSON.stringify(v, null, 2) + "\n");
    console.log(`\nwrote ${VERDICT}: ${v.files} files, output digest ${v.outputDigest}`);
    return finish("PASS", 0);
  } catch (e) {
    console.log(`REFUSED: ${String(e)}`);
    return finish("REFUSED", 2);
  }
}

if (import.meta.main) process.exit(await runHosted(process.argv.slice(2)));
