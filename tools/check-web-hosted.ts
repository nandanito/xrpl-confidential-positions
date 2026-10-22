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
import { EMAIL_MARKER, LICENCE_FILE_HEADER, shippedNotice } from "../web/hosted/licence-notices.ts";

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

/**
 * React escapes these in text; the wording is compared after undoing it. ⚠
 * Numeric references are decoded too, because an attribute written as
 * `&#47;&#47;host` is `//host` to a browser and passed the URL check while it
 * was not (`REVIEW-059` R2-3).
 */
const NAMED: Record<string, string> = { quot: '"', lt: "<", gt: ">", amp: "&", apos: "'", sol: "/", colon: ":", period: ".", Tab: "\t", NewLine: "\n", nbsp: "\u00a0" };
export function decodeEntities(s: string): string {
  // ⚠ ONE pass. Sequential replacements decoded `&#x26;#47;` twice, and an
  // out-of-range reference threw (`REVIEW-059` R3-4). A numeric reference may
  // omit its semicolon, as a browser allows; an unknown name is left as written.
  return s.replace(/&(?:#[xX]([0-9a-fA-F]+);?|#(\d+);?|([A-Za-z]+);)/g, (m, hex, dec, name) => {
    if (hex !== undefined || dec !== undefined) {
      const cp = hex !== undefined ? parseInt(hex, 16) : Number(dec);
      return cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) ? "\ufffd" : String.fromCodePoint(cp);
    }
    return Object.hasOwn(NAMED, name) ? NAMED[name] : m;
  });
}

/**
 * The inner HTML of every element whose opening tag matches `open`, with nested
 * elements of the same name balanced. A regex to the first closing tag would
 * stop inside a nested `div`.
 */
export function elementsInner(html: string, tag: string, open: RegExp): string[] {
  const out: string[] = [];
  const any = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  for (const m of html.matchAll(new RegExp(open.source, open.flags.includes("g") ? open.flags : open.flags + "g"))) {
    const start = m.index! + m[0].length;
    any.lastIndex = start;
    let depth = 1, end = -1;
    for (let t = any.exec(html); t; t = any.exec(html)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    if (end >= 0) out.push(html.slice(start, end));
  }
  return out;
}

/** HTML read as text: block elements spaced, inline elements removed with nothing in their place. */
export function blockText(html: string): string {
  return decodeEntities(
    html.replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?(?:p|div|li|br|tr|td|th|h[1-6]|section|footer|header|ul|ol|table|thead|tbody|dl|dt|dd)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  ).replace(/\s+/g, " ").trim();
}

/** A page's text as a reader sees it: no comments, no tags, entities undone. */
export function pageText(h: string): string {
  return decodeEntities(h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
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
  // Check 9 holds the commit in either link to the build's own.
  [/^https:\/\/github\.com\/nandanito\/xrpl-confidential-positions\/blob\/[0-9a-f]{40}\/(CLAIMS\.md|docs\/explainer\/FACILITY-WALKTHROUGH-2026-08-20\.md)$/, "the two repository files the explainer cites, at the build's commit"],
  [/^https:\/\/s\.devnet\.rippletest\.net:51234$/, "the ledger endpoint, NAMED on the page as the source of its values"],
  [/^https:\/\/[a-z0-9-]+\.vercel\.app$/, "the canonical address the footer names"],
];

/**
 * The ref a link into the public repository names (a commit, abbreviated or
 * whole, lower-cased), or null if it is not such a link. Parsed, not matched
 * on the raw string: an entity-encoded scheme, a percent-encoded host or an
 * encoded slash is still that link to a browser (`REVIEW-060` A-5). A ref that
 * is not hex is left to check 5, which admits only a 40-hex commit.
 */
export function repoLinkCommit(href: string): string | null {
  let u: URL;
  try { u = new URL(href); } catch { return null; }
  if (u.hostname.toLowerCase().replace(/^www\./, "") !== "github.com") return null;
  let path = u.pathname;
  try { path = decodeURIComponent(path); } catch { /* keep the encoded form */ }
  const m = path.match(/^\/nandanito\/xrpl-confidential-positions\/(?:commit|blob|tree|raw|blame)\/([0-9a-f]{7,40})(?![0-9a-z])/i);
  return m ? m[1].toLowerCase() : null;
}

const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
/** A stand-in for the page's own origin, to resolve relative attribute URLs against. */
const SAME_ORIGIN = "https://same-origin.invalid/";
const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");

/**
 * The pages that render ledger values, NAMED rather than inferred. ⚠ Check 8
 * first applied to any page carrying `data-ledger-value`, a marker the page sets
 * on itself, so a page that rendered a value without it was never checked
 * (`REVIEW-059` R1-2, B1-8). Each page here must carry the marker and the
 * wording; every other page must carry no marker, no ciphertext and no demo
 * account address. A new ledger page is added here in review.
 */
export const LEDGER_PAGES = ["observer", "issuer"] as const;

/** A 66-byte ElGamal ciphertext as the pages print it: 132 hex characters. */
const CIPHERTEXT = /\b[0-9A-Fa-f]{132}\b/;
/**
 * Any XRPL classic address and any MPT issuance ID. ⚠ The first fix matched the
 * four demo addresses by name, so B1-8's own example, an address that is not a
 * demo account, still passed (`REVIEW-059` R2-1). The shape is matched, not the
 * checksum, so an address-shaped typo is caught too.
 */
const ADDRESS = /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/;
const ISSUANCE_ID = /\b[0-9A-Fa-f]{48}\b/;
/** An X-address encodes an account too, and a 64-hex string is a hash or a key (`REVIEW-059` S3-2, S3-3). */
const X_ADDRESS = /\b[XT][1-9A-HJ-NP-Za-km-z]{46}\b/;
const HASH64 = /\b[0-9A-Fa-f]{64}\b/;
/**
 * The three readings of a page an identifier check runs over. ⚠ The source
 * spelling alone let `&#114;Hb9…` and an address split by a `<span>` through
 * (`REVIEW-059` R3-1): so also the page decoded, and its text with tags removed
 * and nothing put in their place.
 */
function readings(h: string): string[] {
  const noComments = h.replace(/<!--[\s\S]*?-->/g, "");
  return [h, decodeEntities(noComments), decodeEntities(noComments.replace(/<[^>]+>/g, ""))];
}
/**
 * A figure labelled as decrypted or plaintext: D-H3 was ruled A, no issuer
 * figure, and no page decrypts anything. ⚠ `REVIEW-059c` answered R1-2's request
 * for an output regression with a disclaimer; round two ran *"Decrypted issuer
 * balance: 42"* and *"Issuer plaintext balance: 73"* and both passed (R2-2).
 * This finds a LABELLED figure; an unlabelled number is prose (printed limit 8).
 */
// ⚠ Round three found the first version a word list one word wide: *"decrypted
// issuer balance is 42"*, *"decrypted view … : 42"*, *"decrypts … to 42"* and
// *"42 (decrypted issuer balance)"* all passed (`REVIEW-059` R3-2, S3-1). Now:
// any number later in the same clause as *decrypt* or *plaintext*, except one
// that is part of a reference such as `P-9`, `E-241` or `#10`; and any number
// followed by a parenthetical naming either word.
const ISSUER_FIGURE = [
  /\b(?:decrypt\w*|plaintext)\b[^.!?;]{0,80}?(?<![A-Za-z]-|#|\w|\.)\d/i,
  /(?<![\w.#-])\d[\d,.]*\s*(?:[A-Za-z]+\s+){0,2}\(\s*[^)]{0,40}\b(?:decrypted|plaintext)\b[^)]{0,40}\)/i,
];

/**
 * The response headers the first route sets, exactly: no fewer, no others
 * (`REVIEW-059` S-3: two of the five the assembler sets were unchecked). The
 * policy itself is checked directive by directive in check 6.
 */
export const EXPECTED_HEADERS: Record<string, string | null> = {
  "Content-Security-Policy": null,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

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
    for (const [i, r] of (config.routes ?? []).entries()) {
      for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
      // ⚠ Every reader of the policy (this gate, the browser check, the live
      // comparison) reads the FIRST route's headers. A later route's headers
      // would be read by none of them, so only the first may set any
      // (`REVIEW-059` S-1).
      if (i > 0 && r.headers !== undefined) add("csp", `route ${i} sets headers; only the first route may, because it is the only one any check reads`);
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
  // ⚠ A scheme-relative address (`src="//host/x.js"`) has no `https:` for the
  // pattern above to match (`REVIEW-059` R1-2's table), and an encoded one
  // (`&#47;&#47;host`, `https&#58;//host`) has neither (R2-3). So every
  // URL-bearing attribute is decoded first, and each `srcset` candidate is read.
  const URL_ATTRS = /\b(src|href|action|formaction|srcset|poster|data|background|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const [p, h] of html) {
    for (const m of h.matchAll(URL_ATTRS)) {
      const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "").trim();
      const candidates = m[1].toLowerCase() === "srcset" ? value.split(",").map((c) => c.trim().split(/\s+/)[0]) : [value];
      // ⚠ Resolved, not prefix-tested: a tab between the slashes or a
      // backslash is `//` to a URL parser (`REVIEW-059` R3-3).
      for (const c of candidates) {
        const cleaned = c.replace(/[\t\n\r]/g, "");
        let u: URL;
        try { u = new URL(cleaned, SAME_ORIGIN); } catch { add("urls", `${p} has an attribute URL that does not parse: ${JSON.stringify(c)}`); continue; }
        if (u.origin === new URL(SAME_ORIGIN).origin) continue;
        if (/^[\\/]{2}/.test(cleaned)) add("urls", `${p} names the scheme-relative ${c}`);
        else if (!ADMITTED_URLS.some(([re]) => re.test(cleaned.replace(/[.:]+$/, "")) || re.test(u.href.replace(/\/$/, "")))) add("urls", `${p} names ${c} in an attribute`);
      }
    }
  }

  // 6. The Content Security Policy, as config.json delivers it.
  const first = config?.routes?.[0];
  const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
  if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
  else {
    // ⚠ A browser enforces the FIRST of two directives with one name and
    // ignores the second; a Map keeps the LAST. So `connect-src *;` placed
    // before the real one passed this check while the page permitted a
    // connection anywhere (`REVIEW-059` R1-1, measured). A repeated name, in
    // any case, is refused before anything else is read.
    const parsed = csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; });
    const seen = new Set<string>();
    for (const [k] of parsed) { if (seen.has(k.toLowerCase())) add("csp", `the directive ${k} appears twice; a browser enforces the first`); seen.add(k.toLowerCase()); }
    const dirs = new Map(parsed);
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
    const names = Object.keys(first.headers ?? {});
    for (const n of names) if (!(n in EXPECTED_HEADERS)) add("csp", `the first route sets ${n}, which is not one of the expected headers`);
    const lower = names.map((n) => n.toLowerCase());
    if (new Set(lower).size !== lower.length) add("csp", "the first route sets one header name twice in different case");
    for (const [h, v] of Object.entries(EXPECTED_HEADERS)) if (v !== null && first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
  }
  for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);

  // 7. No input that asks a visitor for anything.
  for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);

  // 8. Every ledger page renders the wording, the network check and the index,
  //    and no other page renders a ledger value.
  const indices = new Set<string>();
  const ledgerHtml = new Set(LEDGER_PAGES.map((lp) => PAGE_HTML(lp)));
  for (const lp of ledgerHtml) if (html.has(lp) && !html.get(lp)!.includes("data-ledger-value")) add("ledger-wording", `${lp} is a ledger page and marks no ledger value`);
  for (const [p, h] of html) {
    if (ledgerHtml.has(p)) continue;
    if (h.includes("data-ledger-value")) add("ledger-wording", `${p} marks a ledger value and is not one of the named ledger pages`);
    const r = readings(h);
    const first = (re: RegExp) => r.map((t) => t.match(re)?.[0]).find(Boolean);
    if (first(CIPHERTEXT)) add("ledger-wording", `${p} carries a ciphertext and is not one of the named ledger pages`);
    else if (first(HASH64)) add("ledger-wording", `${p} carries a 64-hex value, ${first(HASH64)}, and is not one of the named ledger pages`);
    const addr = first(ADDRESS) ?? first(X_ADDRESS);
    if (addr) add("ledger-wording", `${p} names an address, ${addr}, and is not one of the named ledger pages`);
    const iid = first(ISSUANCE_ID);
    if (iid) add("ledger-wording", `${p} names an issuance ID, ${iid}, and is not one of the named ledger pages`);
  }
  // 8b. No issuer figure, on any page (D-H3).
  for (const [p, h] of html) {
    const t = pageText(h);
    for (const re of ISSUER_FIGURE) { const m = t.match(re); if (m) add("no-issuer-figure", `${p} shows a labelled figure: ${JSON.stringify(m[0])}`); }
  }
  for (const [p, h] of html) {
    if (!ledgerHtml.has(p)) continue;
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
    if (!h.includes(`<code>${want.commit.slice(0, 12)}</code>`)) add("commit-and-verdict", `${p} does not show commit ${want.commit.slice(0, 12)} as its link text`);
    if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
  }
  // A link into the repository at any commit but the build's would cite text
  // the gate never saw. Every file is read, a page after decoding its
  // entities, because a literal in a script and an encoded attribute each
  // passed the first version (`REVIEW-060` A-5). A link assembled by a script
  // at run time is the browser check's to find.
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    const t = p.endsWith(".html") ? decodeEntities(text(files.get(p)!)) : text(files.get(p)!);
    for (const m of t.matchAll(/\bhttps?:\/\/[^\s"'<>`\\]+/gi)) {
      const ref = repoLinkCommit(m[0]);
      if (ref !== null && ref !== want.commit) add("commit-and-verdict", `${p} links the repository at ${ref.slice(0, 12)}, not the build's commit`);
    }
  }

  // 10. Licence notices for what is bundled, and nothing that should never be.
  const lic = files.get("static/third-party-licenses.txt");
  if (!lic) add("licences", "static/third-party-licenses.txt is missing");
  else {
    // Separator, `name@version (licence)`, separator, licence text: split on the
    // separator lines, so each header is followed by its own body.
    const parts = text(lic).split(/^={20,}$/m);
    // ⚠ The text before the first notice, and any part after the last one,
    // were read by no check (`REVIEW-059` S-4). The first must be the build's
    // fixed header; there must be no second.
    if (parts[0].trim() !== LICENCE_FILE_HEADER.join("\n").trim()) add("licences", "the text before the first notice is not the build's fixed header");
    if (parts.length % 2 === 0) add("licences", "the file has text after its last notice");
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
    // ⚠ Only React and React DOM were required, so deleting seroval's whole
    // entry passed (`REVIEW-059` R1-4). The listed set must equal the admitted
    // set: a package the framework stops bundling is removed here in review,
    // as one it starts bundling is added.
    for (const must of ADMITTED_PACKAGES) if (!names.some((m) => m[1] === must)) add("licences", `${must} is admitted and not listed, so a bundled package may be shipped without its notice`);
  }
  return f;
}

// ------------------------------------------------------------------ the secret scan

/**
 * `check-no-secrets --dir`, with the local store. Its verdict line is required.
 *
 * ⚠ It reads a copy WITHOUT `static/gate-verdict.json`, the file this gate writes
 * after the sweep. Re-running the gate on its own output failed whenever Vite's
 * hash put `Sk` in an asset's name, because the sweep reads the digest beside that
 * name as a labelled scalar (`REVIEW-059` R3-12, measured). Every other file is
 * read as before.
 */
export function secretScan(root: string): { ok: boolean; line: string } {
  const copy = mkdtempSync(join(tmpdir(), "check-web-hosted-sweep-"));
  try {
    cpSync(join(root, ".vercel", "output"), join(copy, "output"), { recursive: true });
    rmSync(join(copy, "output", VERDICT), { force: true });
    return sweep(join(copy, "output"));
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

function sweep(dir: string): { ok: boolean; line: string } {
  const r = Bun.spawnSync(["bun", "run", join(REPO, "tools/check-no-secrets.ts"), "--dir", dir], { stdout: "pipe", stderr: "pipe" });
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

const LIC = "static/third-party-licenses.txt";
const csp = (d: string, fn: (p: string) => string) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = fn(c.routes[0].headers["Content-Security-Policy"])));
const WEAK_POLICY = "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *";

/**
 * Each control: what it breaks, the check that must fire and, where a check
 * has several reasons to fire, the words its finding must contain. ⚠ Without
 * the last, a control can pass on a finding next to the one it is named for:
 * the cryptography-package control fired because its fabricated notice did not
 * match a licence file, and kept passing with the admission rule deleted
 * (`REVIEW-059` R1-3).
 */
export const CONTROLS: [string, string, Mutate, string?][] = [
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
  ["a cited file at another commit", "commit-and-verdict", (d) => edit(d, "static/how-it-works/index.html", (s) => s.replace(/\/blob\/[0-9a-f]{40}\//, "/blob/" + "0".repeat(40) + "/")), "not the build's commit"],
  // ⚠ `REVIEW-060` A-5's two spellings that passed the first version.
  ["a cited file at another commit, entity-encoded", "commit-and-verdict", (d) => edit(d, "static/how-it-works/index.html", (s) => s.replace(/https:\/\/github\.com\/nandanito\/xrpl-confidential-positions\/blob\/[0-9a-f]{40}\//, `https&#58;//github.com/nandanito/xrpl-confidential-positions&#47;blob&#47;${"0".repeat(40)}/`)), "not the build's commit"],
  ["a repository link at another commit in a script", "commit-and-verdict", (d) => edit(d, firstJs(d), (s) => s + `;const u="https://github.com/nandanito/xrpl-confidential-positions/blob/${"0".repeat(40)}/CLAIMS.md";`), "not the build's commit"],
  ["a repository file the list does not name", "urls", (d) => edit(d, "static/how-it-works/index.html", (s) => s.replace(/\/blob\/([0-9a-f]{40})\/CLAIMS\.md/, "/blob/$1/docs/NEXT-SESSION-PROMPT.md"))],
  // The package's AUTHENTIC notice, at the version this checkout holds, so the
  // only reason left to refuse it is that it is not admitted.
  ["a cryptography package bundled, with its real notice", "licences", (d) => {
    const root = join(REPO, "node_modules", "@noble/curves");
    const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
    edit(d, LIC, (s) => s + "=".repeat(78) + `\n@noble/curves@${version} (MIT)\n` + "=".repeat(78) + "\n" + shippedNotice(root) + "\n");
  }, "which is not admitted"],
  ["seroval's whole entry removed", "licences", (d) => edit(d, LIC, (s) => s.replace(/={78}\nseroval@[^\n]*\n={78}\n[\s\S]*?(?=={78}\n)/, "")), "admitted and not listed"],
  ["text before the first notice changed", "licences", (d) => edit(d, LIC, (s) => "Extra line.\n" + s), "fixed header"],
  ["text after the last notice", "licences", (d) => edit(d, LIC, (s) => s + "=".repeat(78) + "\nan unpaired part\n"), "after its last notice"],
  ["a duplicate connect-src placed first", "csp", (d) => csp(d, (p) => "connect-src *; " + p), "appears twice"],
  ["a later catch-all route replacing the policy", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
  ["a path route replacing the policy for /issuer", "csp", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/issuer(/.*)?", headers: { "Content-Security-Policy": WEAK_POLICY }, continue: true })), "only the first route"],
  ["Permissions-Policy removed", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Permissions-Policy"]), "Permissions-Policy is not"],
  ["an extra header on the first route", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Access-Control-Allow-Origin"] = "*")), "not one of the expected headers"],
  ["the policy's name repeated in lower case", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["content-security-policy"] = WEAK_POLICY)), "twice in different case"],
  ["a scheme-relative script", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<script src="//cdn.example.net/a.js"></script></body>')), "scheme-relative"],
  ["the ledger marker and the wording removed together", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replaceAll('data-ledger-value=""', "").replace(/Vercel, which hosts this page/g, "This host")), "marks no ledger value"],
  ["a ciphertext on a page that is not a ledger page", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", `<p>${"0A".repeat(66)}</p></body>`)), "carries a ciphertext"],
  ["a demo address on the overview", "ledger-wording", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", `<p>${DEMO_ACCOUNTS[0].address}</p></body>`)), "names an address"],
  // `REVIEW-059` B1-8's own example, which the first fix let through (R2-1).
  ["B1-8's own example on the wallet page", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", "<p>Demo account rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh holds confidential balance 5000</p></body>")), "names an address"],
  ["an issuance ID on the capabilities page", "ledger-wording", (d) => edit(d, "static/capabilities/index.html", (s) => s.replace("</body>", `<p>${"00" + "7A".repeat(23)}</p></body>`)), "names an issuance ID"],
  ["a decrypted issuer balance on the issuer page", "no-issuer-figure", (d) => edit(d, "static/issuer/index.html", (s) => s.replace("</body>", "<p>Decrypted issuer balance: 42</p></body>")), "labelled figure"],
  ["a plaintext figure on the overview", "no-issuer-figure", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<p>Issuer plaintext balance: <code>73</code></p></body>")), "labelled figure"],
  // ⚠ This was named "a figure labelled after its value" and planted a label
  // BEFORE its value (`REVIEW-059` R3-2). Renamed, and the real case added.
  ["a parenthetical label before the value", "no-issuer-figure", (d) => edit(d, "static/custody/index.html", (s) => s.replace("</body>", "<p>Holder A balance (decrypted): 1,000</p></body>")), "labelled figure"],
  ["a figure before its label", "no-issuer-figure", (d) => edit(d, "static/issuer/index.html", (s) => s.replace("</body>", "<p>42 (decrypted issuer balance)</p></body>")), "labelled figure"],
  ["a figure joined to its label by 'is'", "no-issuer-figure", (d) => edit(d, "static/issuer/index.html", (s) => s.replace("</body>", "<p>Decrypted issuer balance is 42</p></body>")), "labelled figure"],
  ["a decrypted view of a holder", "no-issuer-figure", (d) => edit(d, "static/issuer/index.html", (s) => s.replace("</body>", "<p>Issuer&#x27;s decrypted view of Holder A: 42</p></body>")), "labelled figure"],
  ["the verb, not a label", "no-issuer-figure", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<p>The issuer decrypts Holder A&#x27;s balance to 42.</p></body>")), "labelled figure"],
  ["an address written with a character reference", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", "<p>&#114;Hb9CJAWyB4rj91VRWn96DkukG4bwdtyTh</p></body>")), "names an address"],
  ["an address written with a reference inside an attribute", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", '<span title="&#114;Hb9CJAWyB4rj91VRWn96DkukG4bwdtyTh">x</span></body>')), "names an address"],
  ["an address split by an inline element", "ledger-wording", (d) => edit(d, "static/wallet/index.html", (s) => s.replace("</body>", "<p>rHb9<span>CJAWyB4rj91VRWn96DkukG4bwdtyTh</span></p></body>")), "names an address"],
  ["an issuance ID written with a character reference", "ledger-wording", (d) => edit(d, "static/capabilities/index.html", (s) => s.replace("</body>", `<p>&#48;${"0" + "7A".repeat(23)}</p></body>`)), "names an issuance ID"],
  ["an X-address on the custody page", "ledger-wording", (d) => edit(d, "static/custody/index.html", (s) => s.replace("</body>", "<p>XVLhHMPHU98es4dbozjVtdWzVrDjtV18pX8yuPT7y4xaEHi</p></body>")), "names an address"],
  ["a 64-hex hash on the overview", "ledger-wording", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", `<p>${"AB".repeat(32)}</p></body>`)), "64-hex value"],
  ["a named-entity scheme-relative link", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="&sol;&sol;tracker.example.net/x">x</a></body>')), "scheme-relative"],
  ["a numeric reference without its semicolon", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="&#47&#47tracker.example.net/x">x</a></body>')), "scheme-relative"],
  ["a tab between the slashes", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="/&#9;/tracker.example.net/x">x</a></body>')), "scheme-relative"],
  ["a backslash for a slash", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="\\\\tracker.example.net/x">x</a></body>')), "scheme-relative"],
  ["an entity-encoded scheme-relative script", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<script src="&#47;&#47;analytics.example.net/a.js"></script></body>')), "scheme-relative"],
  ["an external second srcset candidate", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<img srcset="/a.png 1x, //cdn.example.net/b.png 2x"></body>')), "scheme-relative"],
  ["an entity-encoded absolute address", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="https&#58;//tracker.example.net/x">x</a></body>')), "in an attribute"],
  ["the commit's link text changed", "commit-and-verdict", (d) => edit(d, "static/custody/index.html", (s) => s.replace(/<code>[0-9a-f]{12}<\/code>/, "<code>000000000000</code>")), "link text"],
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
    for (const [name, check, mutate, detail] of CONTROLS) {
      const d = fresh(); dirs.push(d);
      run++;
      mutate(d);
      const got = runChecks(readOutput(d), want);
      if (!got.some((x) => x.check === check && (!detail || x.detail.includes(detail)))) failed.push(`${name}: expected a '${check}' finding${detail ? ` saying "${detail}"` : ""}, got ${got.length ? got.map((x) => `${x.check}: ${x.detail}`).join(" | ") : "none"}`);
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
    "2. The SERVED bytes and headers. It checks the output before upload; step 7 of web/hosted/README.md compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store, or that every file came from the named commit; the isolated build and its tree check are what address that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. Anything a script asks a visitor for after hydration, by a form control or a dialog such as prompt(). The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. A package inlined without its module path. The licence list is collected from the module graph the build reported, and the gate requires that list to equal the admitted set.",
    "8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, a 64-hex value, a classic or X-address, an issuance ID or a marked value, read in the source, decoded, and with tags removed; a figure written as prose is not.",
    "9. NO ISSUER FIGURE (D-H3): the build container holds no key, so no figure can be computed. This gate refuses a number in the same clause after 'decrypt' or 'plaintext', or followed by a parenthetical naming either, on any page. That is a pattern, not an understanding of the sentence: a figure phrased another way is prose, and code that runs during the build could write one (item 3).",
    "10. A link into the repository that a script assembles at run time. This gate reads files and finds a literal in any of them; the browser check reads the links each page renders. A URL a script uses without rendering it as a link is seen by neither.",
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
