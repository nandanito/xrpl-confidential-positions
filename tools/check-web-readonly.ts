/**
 * `check-web-readonly` — architecture §6 step 8's falsifier.
 *
 * **The web tier is READ-ONLY. It never signs and it holds no key** (`ADR-0003`
 * D1). This gate is what makes that a property rather than an intention.
 *
 * ⚠ **It asserts SIX things, and this header said *"five"* while listing FOUR
 * until 2026-09-02** — part 4 was added after E-212 and never reached the list,
 * and part 6 was added by `REVIEW-036`. **A gate's own description going stale
 * at the moment it is extended is `REVIEW-037` F6 (`CLAIMS.md` E-234).**
 *
 *   1. **Nothing under `web/app/` reaches the signer's Unix socket** — not by
 *      naming its path, not by importing the one client, not by opening a
 *      socket itself.
 *   2. **The Elysia process builds `Request::Status` and nothing else.** `Pair`
 *      and `Prepare` are the requests that carry authority.
 *   3. **No route, loader or server function reaches a signing operation.**
 *   4. **The tier holds no secret, decrypts nothing and spawns no process** —
 *      added after E-212, because parts 1-3 ask what the tier can REACH and an
 *      issuer key held INSIDE the API process is a different property.
 *   5. **There is exactly ONE socket client in the whole tier**, so the surface
 *      the other parts reason about is one file rather than a set.
 *   6. **Every bind resolves to a loopback literal** — the API's `.listen(`/
 *      `Bun.serve(` and `web/app`'s dev-server `host:`, which proxies `/api`.
 *      ⚠ Added by `REVIEW-036`: architecture §6 step 8 names this as a
 *      falsifier and nothing checked it (E-227).
 *
 * ⚠ **Part 6 does NOT address egress.** It checks the tier binds to loopback;
 * loopback is **not uid-scoped**, and that is E-228's open finding.
 *
 * ⚠ **Gates in this repository have been built to catch false passes and have
 * false-passed** (`CLAIMS.md` E-165, E-168, E-182, E-198, E-203). This one is
 * therefore built to the standard those rounds produced: every control runs
 * through **the same function the real check calls**, every count is
 * **incremented by the helper that runs it** rather than typed, and the
 * residual it cannot close is printed in its own output by
 * `whatThisDoesNotSay()` — as **asserted-uncaught controls**, so a gap that
 * silently closes makes the gate FAIL rather than leaving a stale disclosure.
 *
 * # Why this does not share `check-zeroize-bounds.py`'s stripper
 *
 * ⚠ **Two measured reasons, because "write it again" is normally the wrong
 * answer** (`CLAIMS.md` E-141: a second implementation of one obligation is a
 * second thing to drift).
 *
 *   1. **Rust block comments nest and TypeScript's do not, and that stripper
 *      counts depth.** Measured 2026-08-28: `console.log("A"); /* outer /*
 *      inner *\/ console.log("B");` prints **both** under `bun run`, so TS ends
 *      the comment at the first `*\/`. A depth-counting stripper keeps
 *      consuming and swallows real code. ⚠ **Over-stripping is THIS gate's
 *      unsafe direction** — stripped code cannot be found, so a violation
 *      hides. That is E-203's "no safe direction" lesson landing on a third
 *      consumer.
 *   2. **That stripper BLANKS string literals; this one must PRESERVE them.**
 *      The socket path and `type: "status"` *are* string literals. Blanking
 *      them would blind this gate to the exact thing it exists to find.
 *
 * **What is shared is the discipline, not the code**: parse string literals so
 * a `//` inside one does not open a comment, and keep their contents.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SOCKET_NEEDLES, SECRET_NEEDLES } from "./web-readonly-needles.ts";

const REPO = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/**
 * ⚠ `--hosted <output root> --commit <sha>` runs the HOSTED part, architecture
 * §6 step 9's gate, over a build's `.vercel/output`, and nothing else: the
 * source checks below are the local tier's (`ADR-0004`).
 */
if (process.argv.includes("--hosted")) {
  const { runHosted } = await import("./check-web-hosted.ts");
  process.exit(await runHosted(process.argv.slice(2)));
}

// ---------------------------------------------------------------------------
// The stripper. Comments out, string literals IN.
// ---------------------------------------------------------------------------

/**
 * Blank `//` tails and `/* ... *\/` blocks, **preserving string literals**.
 *
 * ⚠ **A commented-out violation is not a violation** — that is why comments go
 * (E-182: a gate that counts a needle anywhere false-passes on a commented-out
 * line). ⚠ **A violation written as a string literal IS one** — that is why
 * literals stay.
 *
 * Handles `'...'`, `"..."` with backslash escapes, and `` `...` `` template
 * literals **including `${...}` interpolation**, whose contents are code and
 * are scanned as code. Block comments do **not** nest, matching TypeScript.
 */
export function stripComments(text: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (c === "/" && next === "/") {
      // Blank to end of line, keeping the newline so line numbers survive.
      while (i < text.length && text[i] !== "\n") { out.push(" "); i++; }
      continue;
    }
    if (c === "/" && next === "*") {
      // ⚠ First `*/` closes it. TypeScript does not nest — measured, and it is
      // the reason this is not the Rust stripper.
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? text.length : end + 2;
      for (let k = i; k < stop; k++) out.push(text[k] === "\n" ? "\n" : " ");
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = endOfQuoted(text, i, c);
      out.push(text.slice(i, end));
      i = end;
      continue;
    }
    if (c === "`") {
      const end = endOfTemplate(text, i);
      out.push(text.slice(i, end));
      i = end;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

function endOfQuoted(text: string, start: number, quote: string): number {
  let k = start + 1;
  while (k < text.length) {
    if (text[k] === "\\") { k += 2; continue; }
    if (text[k] === quote) return k + 1;
    if (text[k] === "\n") return k; // unterminated; do not run away
    k++;
  }
  return text.length;
}

/**
 * End of a template literal. `${...}` is CODE and is kept as code — a nested
 * template inside an interpolation is handled by recursing on depth.
 */
function endOfTemplate(text: string, start: number): number {
  let k = start + 1;
  let depth = 0;
  while (k < text.length) {
    if (text[k] === "\\") { k += 2; continue; }
    if (text[k] === "$" && text[k + 1] === "{") { depth++; k += 2; continue; }
    // ⚠ **An ORDINARY `{` inside an interpolation must be counted, or its `}`
    // closes the interpolation early.** `${fn({a: 1}) + signAndSubmit(i)}` was
    // truncated at the object literal's brace, and everything after it —
    // including the signing call — was treated as template text and blanked
    // (`CLAIMS.md` E-220).
    // ⚠ **A brace inside a STRING within the interpolation is not syntax.**
    // Round one counted it, so `${format("{")}` never returned depth to zero
    // and the rest of the file was treated as template text — a false FAILURE
    // rather than a false pass, but the same class (E-221).
    if (depth > 0 && (text[k] === '"' || text[k] === "'")) { k = endOfQuoted(text, k, text[k]); continue; }
    if (depth > 0 && text[k] === "{") { depth++; k++; continue; }
    if (depth > 0 && text[k] === "}") { depth--; k++; continue; }
    if (depth === 0 && text[k] === "`") return k + 1;
    k++;
  }
  return text.length;
}

/**
 * Blank string-literal **contents**, keeping the quotes and the line shape.
 *
 * ⚠⚠ **THIS EXISTS BECAUSE THE GATE'S FIRST RUN AGAINST THE REAL TREE CAUGHT
 * PROSE, AND THE FIX IS A POLARITY DISTINCTION RATHER THAN AN EXEMPTION.**
 * `capability.ts` describes a wallet's published API in a sentence that
 * contains the word `signAndSubmit`. That is a **mention**, not a call — but
 * `"/run/wconf/signer.sock"` in a string literal IS a socket path, and
 * blanking it would be this gate's false-pass direction.
 *
 * ⚠ **So the two needle classes need OPPOSITE treatment, and each gets the one
 * it needs instead of one being argued into a "safe direction":**
 *
 *   * `SOCKET_NEEDLES` are **values** — paths, env names. Scanned with string
 *     literals **PRESERVED**.
 *   * `SIGNING_NEEDLES` are **identifiers** — function and property names.
 *     Scanned with string literals **BLANKED**, so prose about someone else's
 *     API is not a violation of ours.
 *   * `AUTHORITY_NEEDLES` are the wire tags `"pair"` / `"prepare"` **including
 *     their quotes**, so they are literal-shaped by construction and are
 *     scanned with literals preserved.
 *
 * ⚠ **This is `CLAIMS.md` E-203 landing on a fourth consumer.** That row's
 * lesson was that a "safe direction" argument is only as good as the list of
 * consumers, and the list grew after the argument was written. Here the list
 * was known in advance and the consumers were given different instruments.
 * **The residual is named**: a signing call assembled from strings at runtime
 * is invisible to the identifier pass, and that is `whatThisDoesNotSay()` item 1.
 */
export function stripStringLiterals(text: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const end = endOfQuoted(text, i, c);
      out.push(c);
      for (let k = i + 1; k < end - 1; k++) out.push(text[k] === "\n" ? "\n" : " ");
      out.push(text[end - 1] === c ? c : " ");
      i = end;
      continue;
    }
    if (c === "`") {
      const end = endOfTemplate(text, i);
      // ⚠ `${...}` inside a template is CODE. Blanking the whole template would
      // hide a real call written as `${signAndSubmit(x)}`, so the interpolations
      // are kept and only the literal text between them is blanked.
      out.push(blankTemplateText(text.slice(i, end)));
      i = end;
      continue;
    }
    out.push(c);
    i++;
  }
  return out.join("");
}

function blankTemplateText(t: string): string {
  const out: string[] = [];
  let depth = 0;
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (c === "$" && t[k + 1] === "{") { depth++; out.push("$", "{"); k++; continue; }
    // ⚠ Same nested-brace correction as `endOfTemplate`. Without it an object
    // literal inside an interpolation ends the interpolation early and the real
    // code after it is blanked (E-220).
    // ⚠ Same string-awareness as `endOfTemplate`; the two must agree or one
    // will blank what the other kept.
    if (depth > 0 && (c === '"' || c === "'")) {
      const e = endOfQuoted(t, k, c);
      out.push(t.slice(k, e));
      k = e - 1;
      continue;
    }
    if (depth > 0 && c === "{") { depth++; out.push("{"); continue; }
    if (depth > 0 && c === "}") { depth--; out.push("}"); continue; }
    if (depth > 0) { out.push(c); continue; }
    out.push(c === "\n" ? "\n" : c === "`" ? "`" : " ");
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mts|cts)$/;

function walk(dir: string): string[] {
  let found: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }
  for (const e of entries) {
    if (e === "node_modules" || e === "dist" || e === ".output" || e === ".tanstack") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) found = found.concat(walk(p));
    else if (SOURCE_EXT.test(e)) found.push(p);
  }
  return found;
}

interface Source {
  path: string;
  rel: string;
  /** Comments blanked, string literals PRESERVED. For value-shaped needles. */
  code: string;
  /** Comments AND string-literal contents blanked. For identifier needles. */
  ident: string;
}

function load(dir: string): Source[] {
  return walk(join(REPO, dir)).map((p) => make(relative(REPO, p), readFileSync(p, "utf8"), p));
}

function make(rel: string, raw: string, path = rel): Source {
  const code = stripComments(raw);
  return { path, rel, code, ident: stripStringLiterals(code) };
}

// ---------------------------------------------------------------------------
// The detectors. ⚠ Every control below calls THESE functions, not a copy.
// ---------------------------------------------------------------------------

// ⚠ The socket and secret needle lists live in `web-readonly-needles.ts`, which
// has no side effects, so the hosted part (`check-web-hosted.ts`) reads the same
// lists rather than a copy (`CLAIMS.md` E-141's shape).
export { SOCKET_NEEDLES, SECRET_NEEDLES };


/** The two requests that carry authority. Never constructible from this tier. */
export const AUTHORITY_NEEDLES = [
  '"pair"', "'pair'", "`pair`",
  '"prepare"', "'prepare'", "`prepare`",
];

/** Signing operations. A read-only tier reaches none of them. */
export const SIGNING_NEEDLES = ["tx_blob", "txBlob", "signAndSubmit", "submitAndWait", "sign("];

/**
 * ⚠⚠ **SECRETS. Added after the tier SHIPPED A DECRYPTION ORACLE.**
 *
 * `web/api/issuer.ts` read `WCONF_ELGAMAL_SK` and decrypted per request over an
 * unauthenticated `GET` — violating architecture §6 step 8's own *"may never
 * touch any private key"*, written by the session that then broke it
 * (`CLAIMS.md` E-212). ⚠ **The gate did not catch it because the gate was about
 * REACHABILITY, not about what the tier HOLDS.** Those are different properties
 * and this part is the second one.
 *
 * ⚠ `decryptInRange` is named because it spawns `mptool decrypt <ct> <sk>` and
 * **argv is world-readable via `ps`** — the exposure the issuer CLI refuses a
 * `--key` flag to avoid.
 */
/**
 * Environment variables that must never be READ by this tier.
 *
 * ⚠⚠ **Detected STRUCTURALLY, not by name in a needle list, because the name is
 * a string and the identifier pass blanks strings.** `process.env["WCONF_ELGAMAL_SK"]`
 * passed part 4 cleanly: the ident pass erased the literal before the search ran
 * (`CLAIMS.md` E-220). ⚠ **And the name cannot simply be moved to the
 * literal-preserving pass either** — `issuer.ts` legitimately declares
 * `FORBIDDEN_SECRET_ENV = "WCONF_ELGAMAL_SK"` in order to forbid it, so a
 * name-only match would flag the guard as the violation. **What is forbidden is
 * the ACCESS, so the access is what is matched.**
 */
export const SECRET_ENV_NAMES = ["WCONF_ELGAMAL_SK", "WCONF_SIGNER_PROFILE"];

/** `process.env.NAME`, `process.env["NAME"]`, `process.env['NAME']`, backticks. */
export function secretEnvReads(sources: Source[]): { rel: string; needle: string; line: number }[] {
  const hits: { rel: string; needle: string; line: number }[] = [];
  for (const s of sources) {
    // ⚠⚠ **MATCHED OVER THE WHOLE SOURCE, NOT LINE BY LINE.** The first version
    // split on newlines and then applied a regex that allows whitespace — so a
    // read wrapped by a formatter, `process.env[` on one line and the key on the
    // next, produced no hit and part 4 reported PASS (`CLAIMS.md` E-221).
    // **A line-based scan cannot see an expression that spans lines**, and
    // formatters wrap expressions for a living.
    for (const name of SECRET_ENV_NAMES) {
      const re = new RegExp(
        `process\\s*\\.\\s*env\\s*(?:\\.\\s*${name}\\b|\\[\\s*["'\`]${name}["'\`]\\s*\\])`,
        "g",
      );
      for (const m of s.code.matchAll(re)) {
        // Line number derived from the match offset, so it still points at code.
        const line = s.code.slice(0, m.index).split("\n").length;
        hits.push({ rel: s.rel, needle: `read of ${name}`, line });
      }
    }
  }
  return hits;
}

/** Every needle in `needles` that occurs in `sources`, with where. */
export function findNeedles(
  sources: Source[],
  needles: string[],
  field: "code" | "ident" = "code",
): { needle: string; rel: string; line: number }[] {
  const hits: { needle: string; rel: string; line: number }[] = [];
  for (const s of sources) {
    const lines = s[field].split("\n");
    for (const needle of needles) {
      lines.forEach((l, idx) => { if (l.includes(needle)) hits.push({ needle, rel: s.rel, line: idx + 1 }); });
    }
  }
  return hits;
}

/**
 * Files that reference the socket at all. Part 5 requires exactly one.
 *
 * ⚠⚠ **THIS LIST DISAGREED WITH `SOCKET_NEEDLES` AND THE NARROWER ONE WAS THE
 * GATE — `CLAIMS.md` E-226, the SIXTH instance in this repository of a gate
 * built to catch false passes false-passing** (E-165, E-168, E-182, E-198,
 * E-203). `SOCKET_NEEDLES` carries **eight** needles including `node:net` and
 * `createConnection`; this list carried **four** and omitted both. Part 1
 * applies the eight to `web/app` ONLY, so **a second UDS client in `web/api`
 * written with `node:net`'s `createConnection` was invisible to the whole-tier
 * count** — the gate would print *"exactly one socket client"* over two.
 * Found by `REVIEW-036b` with repository access.
 *
 * ⚠ **It is deliberately NOT `SOCKET_NEEDLES` itself.** That set includes
 * `signer-status` and `signerSocketPath`, which match an ordinary *import* of
 * the one client — `server.ts` imports `readSignerStatus` from
 * `./signer-status` — so using it here would count importers as clients and
 * the check would fail on a correct tree. **This list is the constructs that
 * OPEN a socket; that list is anything that names one.** Two consumers, two
 * instruments (E-203's fourth lesson, and `CLAIMS.md` E-220).
 */
export const SOCKET_OPENERS = [
  "signer.sock",
  "WCONF_SIGNER_SOCKET",
  "Bun.connect",
  "unix:",
  // ⚠ Added by E-226. Both are how Node opens a UDS, and both were missing.
  "node:net",
  "createConnection",
  // ⚠⚠ Added by REVIEW-037 F3 (E-234). E-226's fix added the two spellings the
  // FINDING named and stopped there — so `import net from "net"; net.connect(p)`
  // still counted zero, and the leg demonstrated it against the real source
  // set. **A fix written against a finding's list is a fix against that list**
  // (E-168's rule, landing on the fix for E-226 one round later).
  "net.connect",
  'from "net"',
  "from 'net'",
  'require("net")',
  "require('net')",
];

/**
 * ⚠ **`CLAIMS.md` E-238.** Three corrections from the REVIEW-037 spot-check:
 *
 *  - **`from "net"` may span lines.** `import transport from\n  "net";` evaded
 *    the substring needle, so the specifier is matched by regex, not `includes`.
 *  - **`await import("net")` is a bare-specifier client** and matched nothing.
 *  - ⚠ **A TYPE-ONLY import opens no socket** and was counted, which is a
 *    FALSE-FAIL: `import type { Socket } from "node:net"` raised the client
 *    count with no runtime effect. Type-only import lines are stripped first.
 */
const BARE_NET_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["'](?:node:)?net["']/;

export function socketClients(sources: Source[]): string[] {
  return [...new Set(
    sources
      .filter((s) => {
        // A type-only import is erased at compile time and opens nothing.
        const runtime = s.code.replace(/^\s*import\s+type\b[^;]*;?/gm, "");
        return SOCKET_OPENERS.some((n) => runtime.includes(n)) || BARE_NET_SPECIFIER.test(runtime);
      })
      .map((s) => s.rel),
  )];
}

// ---------------------------------------------------------------------------
// Controls — counted by the helper that runs them (E-203), never typed.
// ---------------------------------------------------------------------------

let controlsRun = 0;
let failures = 0;

function control(label: string, passed: boolean, detail: string) {
  controlsRun++;
  if (!passed) { failures++; console.log(`  CONTROL ✗ ${label} — ${detail}`); }
  else console.log(`  CONTROL ✓ ${label}`);
}

function check(label: string, passed: boolean, detail: string) {
  if (!passed) { failures++; console.log(`  ✗ ${label}\n      ${detail}`); }
  else console.log(`  ✓ ${label}`);
}

/** Build a synthetic source so a control runs through the REAL detector. */
function synthetic(rel: string, body: string): Source {
  return make(rel, body);
}

// ---------------------------------------------------------------------------

console.log("check-web-readonly — architecture §6 step 8, ADR-0003 D1");
console.log("=".repeat(78));

const app = load("web/app");
const apiSrc = load("web/api");

console.log(`\n  web/app: ${app.length} source file(s)`);
console.log(`  web/api: ${apiSrc.length} source file(s)`);

// ⚠ **A gate over an empty set proves nothing, and this one had that hole in
// its first run** — `web/app` was empty and Parts 1 and 3 reported ✓ over
// nothing. Found by reading the gate's own output rather than by a control,
// which is why it is a hard refusal now: **deleting the UI must not be a way to
// pass.** `CLAIMS.md` E-142's narrowing, and E-190's precedent — a gate that
// refuses its own extension loudly.
if (apiSrc.length === 0) {
  console.log("\nFAIL: web/api has no sources. Parts 2 and 4 would pass vacuously.");
  process.exit(1);
}
if (app.length === 0) {
  console.log("\nFAIL: web/app has no sources. Parts 1 and 3 would pass over an EMPTY SET,\n" +
              "      so the gate would certify a property it never checked. A gate over an\n" +
              "      empty set proves nothing (CLAIMS.md E-142). Build the app, or remove\n" +
              "      this gate deliberately — do not let it pass by absence.");
  process.exit(1);
}

// --- Part 1 -----------------------------------------------------------------
console.log("\nPart 1 — nothing under web/app reaches the signer socket");
const appHits = findNeedles(app, SOCKET_NEEDLES);
check("web/app names no socket path, imports no UDS client, opens no socket",
  appHits.length === 0,
  appHits.map((h) => `${h.rel}:${h.line} contains "${h.needle}"`).join("\n      "));

control("an INJECTED socket reference in web/app is caught by the real detector",
  findNeedles([synthetic("web/app/evil.tsx", 'const s = await Bun.connect({ unix: "/tmp/signer.sock" });')], SOCKET_NEEDLES).length > 0,
  "the detector missed a literal Bun.connect + socket path");

control("a COMMENTED-OUT socket reference is NOT counted (E-182)",
  findNeedles([synthetic("web/app/ok.tsx", '// const s = Bun.connect({ unix: "/tmp/signer.sock" })')], SOCKET_NEEDLES).length === 0,
  "a commented-out line was treated as a violation");

control("a BLOCK-commented socket reference is NOT counted",
  findNeedles([synthetic("web/app/ok2.tsx", '/* Bun.connect({ unix: "x/signer.sock" }) */')], SOCKET_NEEDLES).length === 0,
  "a block comment was treated as a violation");

control("a socket path inside a STRING LITERAL IS counted — literals are preserved",
  findNeedles([synthetic("web/app/evil2.tsx", 'const p = "/run/wconf/signer.sock";')], SOCKET_NEEDLES).length > 0,
  "⚠ the stripper blanked a string literal, which is this gate's false-pass direction");

control("a socket path inside a TEMPLATE literal IS counted",
  findNeedles([synthetic("web/app/evil3.tsx", "const p = `${base}/signer.sock`;")], SOCKET_NEEDLES).length > 0,
  "a template literal hid a socket path");

control("code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)",
  findNeedles([synthetic("web/app/evil4.tsx", '/* outer /* inner */ const p = "signer.sock";')], SOCKET_NEEDLES).length > 0,
  "⚠ the stripper nested block comments and swallowed live code — MEASURED as wrong for TypeScript");

// --- Part 2 -----------------------------------------------------------------
console.log("\nPart 2 — the Elysia process builds Status, and never Pair or Prepare");
const buildsStatus = apiSrc.some((s) => /type:\s*["']status["']/.test(s.code));
check("web/api constructs a `status` request", buildsStatus,
  "no `type: \"status\"` found — the one call this tier is allowed to make is absent");

const authorityHits = findNeedles(apiSrc, AUTHORITY_NEEDLES);
check("web/api constructs neither `pair` nor `prepare`", authorityHits.length === 0,
  authorityHits.map((h) => `${h.rel}:${h.line} contains ${h.needle}`).join("\n      "));

control("an INJECTED pair request is caught by the real detector",
  findNeedles([synthetic("web/api/evil.ts", 'await ask({ type: "pair", operations: ["send"] });')], AUTHORITY_NEEDLES).length > 0,
  "the detector missed a literal pair request");

control("a TEMPLATE-LITERAL authority tag is caught — type: `prepare`",
  findNeedles([synthetic("web/api/e.ts", "const r = { type: `prepare` };")], AUTHORITY_NEEDLES).length > 0,
  "a backtick-tagged prepare request was missed");

control("an INJECTED prepare request is caught by the real detector",
  findNeedles([synthetic("web/api/evil.ts", "await ask({ type: 'prepare', intent });")], AUTHORITY_NEEDLES).length > 0,
  "the detector missed a single-quoted prepare request");

control("the status detector FAILS on a tree with no status request",
  !/type:\s*["']status["']/.test(stripComments('const r = { type: "pear" };')),
  "the status detector matched something that is not a status request");

// --- Part 3 -----------------------------------------------------------------
console.log("\nPart 3 — no route, loader or server function reaches a signing operation");
const signingHits = findNeedles([...app, ...apiSrc], SIGNING_NEEDLES, "ident");
check("no signing operation anywhere in the web tier", signingHits.length === 0,
  signingHits.map((h) => `${h.rel}:${h.line} contains "${h.needle}"`).join("\n      "));

control("an INJECTED signing call is caught by the real detector",
  findNeedles([synthetic("web/app/routes/send.tsx", "const { tx_blob } = await prepareSend();")], SIGNING_NEEDLES, "ident").length > 0,
  "the detector missed a tx_blob destructure");

control("an INJECTED server function that signs is caught",
  findNeedles([synthetic("web/app/routes/x.tsx", "export const go = createServerFn().handler(async () => signAndSubmit(i));")], SIGNING_NEEDLES, "ident").length > 0,
  "the detector missed a createServerFn wrapping a signing call");

control("PROSE naming another project's signing API is NOT a violation of ours",
  findNeedles([synthetic("web/api/doc.ts", 'const d = "Crossmark publishes sign/submit/signAndSubmit.";')], SIGNING_NEEDLES, "ident").length === 0,
  "⚠ a mention inside a string literal was counted as a call — this is what the ident pass exists for");

control("⚠ and the SAME text IS still caught when it is real code, not prose",
  findNeedles([synthetic("web/api/evil.ts", "await signAndSubmit(intent);")], SIGNING_NEEDLES, "ident").length > 0,
  "⚠⚠ blanking literals blinded the identifier pass to a real call — the false-pass direction");

control("a QUOTED brace inside an interpolation does NOT unbalance the scan",
  findNeedles([synthetic("web/api/e.ts", 'const s = `x ${format("{")}`;\nconst note = "prose naming signAndSubmit";')], SIGNING_NEEDLES, "ident").length === 0,
  "⚠ a brace inside a string was counted as syntax, so later prose failed the gate");

control("⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught",
  findNeedles([synthetic("web/api/e.ts", "const s = `x: ${fn({a: 1}) + signAndSubmit(i)}`;")], SIGNING_NEEDLES, "ident").length > 0,
  "⚠ the object literal's brace closed the interpolation early and blanked the real code");

control("⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught",
  findNeedles([synthetic("web/api/evil2.ts", "const s = `result: ${signAndSubmit(i)}`;")], SIGNING_NEEDLES, "ident").length > 0,
  "the template blanker swallowed an interpolation, which is code");

control("⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass",
  findNeedles([synthetic("web/app/evil5.tsx", 'const p = "/run/signer.sock";')], SOCKET_NEEDLES).length > 0,
  "⚠⚠ the two passes were confused and the socket check lost string literals");

// --- Part 4 -----------------------------------------------------------------
console.log("\nPart 4 — the tier holds NO secret and decrypts nothing");
const secretHits = findNeedles([...app, ...apiSrc], SECRET_NEEDLES, "ident");
const envHits = secretEnvReads([...app, ...apiSrc]);
check("no file under web/ reads a secret env var, decrypts, or spawns a process",
  secretHits.length === 0 && envHits.length === 0,
  [...secretHits.map((h) => `${h.rel}:${h.line} contains "${h.needle}"`),
   ...envHits.map((h) => `${h.rel}:${h.line} ${h.needle}`)].join("\n      "));

control("a WRAPPED env read is caught — the expression spans lines",
  secretEnvReads([synthetic("web/api/e.ts", 'const k = process.env[\n  "WCONF_ELGAMAL_SK"\n];')]).length > 0,
  "⚠ a line-based scan cannot see an expression a formatter wrapped");

control("a BRACKET env read is caught — process.env[\"NAME\"]",
  secretEnvReads([synthetic("web/api/e.ts", 'const k = process.env["WCONF_ELGAMAL_SK"];')]).length > 0,
  "⚠ the ident pass blanks the literal, so a name-only needle cannot see this");
control("a DOTTED env read is caught — process.env.NAME",
  secretEnvReads([synthetic("web/api/e.ts", "const k = process.env.WCONF_ELGAMAL_SK;")]).length > 0,
  "the dotted form was missed");
control("DECLARING the forbidden name in order to forbid it is NOT a violation",
  secretEnvReads([synthetic("web/api/ok.ts", 'export const FORBIDDEN = "WCONF_ELGAMAL_SK";')]).length === 0,
  "⚠ the guard that names the variable was flagged as the violation");

control("an INJECTED secret env read is caught by the real detector",
  findNeedles([synthetic("web/api/evil.ts", "const k = process.env.WCONF_ELGAMAL_SK;")], SECRET_NEEDLES, "ident").length > 0,
  "the detector missed a read of the issuer secret");

control("an INJECTED decryption call is caught",
  findNeedles([synthetic("web/api/evil.ts", "const v = await decryptInRange(ct, sk, 0, 5000);")], SECRET_NEEDLES, "ident").length > 0,
  "the detector missed a call that passes a secret through argv");

control("an INJECTED subprocess spawn is caught",
  findNeedles([synthetic("web/api/evil.ts", 'Bun.spawnSync(["mptool", "decrypt", ct, sk]);')], SECRET_NEEDLES, "ident").length > 0,
  "the detector missed a subprocess spawn");

control("PROSE naming the secret in a doc string is NOT a violation",
  findNeedles([synthetic("web/api/doc.ts", 'const p = "The key lives in WCONF_ELGAMAL_SK, in the CLI tool.";')], SECRET_NEEDLES, "ident").length === 0,
  "⚠ a mention inside a string literal was counted — the ident pass exists for this");

// --- Part 5 -----------------------------------------------------------------
console.log("\nPart 5 — exactly one socket client in the whole tier");
const clients = socketClients([...app, ...apiSrc]);
check(`exactly one file references the socket (found ${clients.length}: ${clients.join(", ") || "none"})`,
  clients.length === 1 && clients[0].startsWith("web/api/"),
  `expected exactly one, under web/api/. Found: ${clients.join(", ") || "none"}`);

// ⚠ **Built from synthetics ONLY, and that is a correction.** The first form
// appended one synthetic client to the REAL `apiSrc` and asserted the count was
// 2 — so it failed whenever the tree legitimately had a second client, i.e.
// exactly when the real check was already failing. **A control whose verdict
// depends on the tree's state is measuring the tree, not the detector.** Found
// by break-test 7 against the real tree, which is the only place it shows.
control("a SECOND socket client is caught by the real detector",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/two.ts", 'Bun.connect({ unix: "/y/signer.sock" })'),
  ]).length === 2,
  "two distinct socket clients did not both raise the count");

control("a file with NO socket reference is not counted as a client",
  socketClients([synthetic("web/app/plain.tsx", "export const x = 1;")]).length === 0,
  "a file with no socket reference was counted as a socket client");

// ⚠ **E-226's control, and it is the one that was missing.** A second client
// written with `node:net` rather than `Bun.connect` was invisible to this
// count while Part 1's broader needle set never looked at `web/api`. Both
// spellings now run through the SAME detector the real check calls.
// ⚠ REVIEW-037 F3's EXACT evasion, run through the real detector.
control("a `import net from \"net\"` + net.connect client IS counted",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/evil.ts", 'import net from "net";\nconst s = net.connect({ path });'),
  ]).length === 2,
  "the bare-specifier `net` client is invisible — REVIEW-037 F3 is open again");

control("a second client using node:net/createConnection IS counted",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/two.ts", 'import { createConnection } from "node:net";'),
  ]).length === 2,
  "a node:net client did not raise the count — the E-226 hole is open again");

// --- Part 6 -----------------------------------------------------------------
// ⚠⚠ **A FALSIFIER CONDITION NAMED IN THE ARCHITECTURE HAD NO FALSIFIER —
// `CLAIMS.md` E-227.** Architecture §6 step 8's *Falsified if:* clause says the
// step is falsified if *"the API binds to anything but loopback"*, and this
// gate — **the artifact that clause names** — contained ZERO references to
// `hostname`, `127.0.0.1`, `0.0.0.0` or `BIND_HOSTNAME` until this part was
// written. **E-213 measured the `0.0.0.0` defect on the LAN; the fix went into
// the code and the gate was never extended to the condition.** Found by
// `REVIEW-036b` with repository access.
//
// ⚠ `Bun.serve` defaults to `0.0.0.0` when `listen` is handed a bare port
// number, so "passes no hostname" is the defect, not merely a style.
console.log("\nPart 6 — the API binds to loopback, and nothing else");

const LOOPBACK_LITERALS = ['"127.0.0.1"', "'127.0.0.1'", '"localhost"', "'localhost'", '"::1"', "'::1'"];

/**
 * Every `.listen(` call must pass a `hostname`, and the bound value must be a
 * loopback literal. ⚠ **LEXICAL, and it resolves ONE level of indirection** —
 * a `const` naming a literal. A hostname computed at run time is invisible and
 * is an asserted-uncaught control below.
 */
export function bindVerdict(sources: Source[]): { ok: boolean; why: string } {
  const calls: { rel: string; call: string }[] = [];
  for (const s of sources) {
    // ⚠ `Bun.serve(` as well as `.listen(` — REVIEW-037 F2 showed a
    // `Bun.serve({ hostname: "0.0.0.0" })` was invisible beside a correct
    // `.listen(`, caught only by the vacuous-pass guard when it stood alone.
    //
    // ⚠⚠ **BALANCED, not `[^)]*` — `CLAIMS.md` E-237.** The first version
    // stopped at the FIRST `)`, so a legitimate
    // `.listen({ port: Number(p), hostname: BIND_HOSTNAME })` truncated to
    // `.listen({ port: Number(` — the hostname fell outside the captured text
    // and the call was reported as passing NO hostname. **A FALSE-FAIL, and a
    // gate that cries wolf on correct code gets disabled**, which is the
    // failure mode that ends a gate's life rather than merely blunting it.
    for (const m of s.code.matchAll(/(?:\.listen|Bun\.serve)\s*\(/g)) {
      let depth = 0, i = m.index! + m[0].length - 1;
      for (; i < s.code.length; i++) {
        if (s.code[i] === "(") depth++;
        else if (s.code[i] === ")") { depth--; if (depth === 0) break; }
      }
      calls.push({ rel: s.rel, call: s.code.slice(m.index!, i + 1).replace(/\s+/g, " ").trim() });
    }
  }
  if (calls.length === 0) return { ok: false, why: "no .listen( or Bun.serve( call found — this part would pass vacuously" };

  for (const { rel, call } of calls) {
    // ⚠⚠ **EVERY `hostname` KEY, NOT THE FIRST — `CLAIMS.md` E-238.** A
    // duplicate key `{ hostname: "127.0.0.1", hostname: "0.0.0.0" }` passed,
    // because the first match was inspected and **in JavaScript the LAST
    // duplicate key wins** — so the check read the one value that does not take
    // effect. Found by the REVIEW-037 detector spot-check.
    const all = [...call.matchAll(/hostname\s*:\s*([^,}]+)/g)];
    if (all.length === 0) return { ok: false, why: `${rel}: ${call} passes NO hostname — Bun.serve then defaults to 0.0.0.0 (E-213)` };
    for (const m of all) {
    const expr = m[1].trim();

    // A quoted literal is checked directly.
    if (/^["'`]/.test(expr)) {
      if (!LOOPBACK_LITERALS.some((l) => expr === l)) return { ok: false, why: `${rel}: hostname ${expr} is not a loopback literal` };
      continue;
    }
    // ⚠ A bare identifier is resolved to its declaration — ONE level, and only
    // to a literal. REVIEW-037 F2: the first version checked that the call
    // contained the WORD `hostname` and, separately, that SOME loopback
    // constant existed somewhere — it never connected the two, so
    // `.listen({ hostname: "10.13.156.66" })` passed while an unused
    // `BIND_HOSTNAME = "127.0.0.1"` sat in the same file.
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
      const decls = sources.flatMap((s) => s.code.match(new RegExp(`\\b${expr}\\s*=\\s*("[^"]*"|'[^']*'|\`[^\`]*\`)`, "g")) ?? []);
      if (decls.length === 0) return { ok: false, why: `${rel}: hostname \`${expr}\` resolves to no string literal in this source set` };
      for (const d of decls) {
        const lit = d.slice(d.indexOf("=") + 1).trim();
        if (!LOOPBACK_LITERALS.some((l) => lit === l)) return { ok: false, why: `${rel}: hostname \`${expr}\` = ${lit}, which is not a loopback literal` };
      }
      continue;
    }
    // ⚠ Anything else — env read, ternary, concatenation, call — is NOT
    // PROVABLY loopback, and this gate fails closed rather than assuming.
    return { ok: false, why: `${rel}: hostname ${expr} is not a literal or a resolvable constant — not provably loopback` };
    }
  }
  return { ok: true, why: `${calls.length} bind call(s), every hostname resolved to a loopback literal` };
}

// ⚠ Test files are excluded from the BIND scan — E-238. `probe.listen()` in a
// test helper is not a network bind, and a gate that false-fails on correct
// test code gets disabled. They remain in every other part.
const bind = bindVerdict(apiSrc.filter((s) => !/\.test\.tsx?$/.test(s.rel)));
check("every .listen( passes an explicit loopback hostname", bind.ok, bind.why);

/**
 * ⚠⚠ **THE DEV SERVER'S BIND IS PART OF THE SAME PROPERTY, AND THE FIRST
 * VERSION OF PART 6 MISSED IT — found by this round's own self-attack, not by a
 * leg** (`CLAIMS.md` E-231). `web/app/vite.config.ts` sets `host` **and**
 * proxies `/api` to the API process. **A dev server on `0.0.0.0` therefore
 * publishes the whole API — the issuer route included — to the LAN, bypassing
 * the API's own loopback bind entirely.**
 *
 * ⚠ **E-213's shape, exactly inverted.** There the `127.0.0.1` reasoning lived
 * in `vite.config.ts` and the API got a bare port; part 6 was written to gate
 * the API and left `vite.config.ts` ungated. **A gate written against the last
 * defect gates the last defect.**
 */
export function hostKeyVerdict(sources: Source[]): { ok: boolean; why: string } {
  // ⚠⚠ **EVERY `host:` IS COLLECTED, NOT ONLY THE QUOTED-LITERAL ONES —
  // `CLAIMS.md` E-237, THE NINTH FALSE-PASSING GATE IN THIS REPOSITORY.** The
  // first version's regex matched only `host:` followed by a quoted literal, so
  // a `host: process.env.H` was **not collected at all** and passed silently
  // whenever one legitimate loopback literal existed elsewhere to satisfy the
  // vacuous-pass guard.
  //
  // ⚠ **That is E-235's defect — the one `bindVerdict` was rewritten to fix —
  // reproduced in its SIBLING, twenty lines away, IN THE SAME COMMIT.** The fix
  // was applied to the function the finding named rather than to the property
  // both functions share. `CLAIMS.md` E-168, and the rule is still not
  // self-executing.
  const hits: { rel: string; decl: string }[] = [];
  for (const s of sources) {
    // ⚠ `host:`, `"host":`, `'host':` and `["host"]:` — E-238. A computed key
    // bypassed collection entirely while a harmless sibling satisfied the
    // vacuous-pass guard, and a legitimately quoted key FALSE-FAILED.
    for (const d of s.code.match(/(?:\bhost|["']host["']|\[\s*["']host["']\s*\])\s*:\s*[^,}\n]+/g) ?? []) {
      hits.push({ rel: s.rel, decl: d.trim() });
    }
  }
  if (hits.length === 0) return { ok: false, why: "no `host:` key found under web/app — this check would pass vacuously" };
  for (const { rel, decl } of hits) {
    const val = decl.slice(decl.indexOf(":") + 1).trim();
    if (/^["'`]/.test(val)) {
      if (!LOOPBACK_LITERALS.some((l) => val === l)) return { ok: false, why: `${rel}: ${decl} is not a loopback literal` };
      continue;
    }
    // Fail closed: not a literal, so not provably loopback.
    return { ok: false, why: `${rel}: ${decl} is not a string literal — not provably loopback` };
  }
  return { ok: true, why: `${hits.length} host: key(s), all loopback` };
}

const hostBind = hostKeyVerdict(app);
check("every `host:` under web/app is a loopback literal", hostBind.ok, hostBind.why);

// ⚠⚠ E-237's controls. The first two are the ninth false-pass and the
// false-fail that came with it, both found by a self-attack during the
// REVIEW-037 detector spot-check.
// ⚠⚠ E-238's controls — six evasions and false-fails found by the REVIEW-037
// detector spot-check, each run through the REAL detector.
control("a DUPLICATE hostname key is caught (the LAST one wins in JS)",
  !bindVerdict([synthetic("web/api/s.ts",
    'app.listen({ port: 3011, hostname: "127.0.0.1", hostname: "0.0.0.0" });')]).ok,
  "only the first hostname was inspected — the check reads the value that does NOT take effect");

control("a COMPUTED host key [\"host\"] is caught",
  !hostKeyVerdict([synthetic("web/app/v.ts",
    'export default { server: { ["host"]: "0.0.0.0" }, preview: { host: "127.0.0.1" } };')]).ok,
  "a computed host key bypassed collection while a sibling satisfied the vacuous guard");

control("a QUOTED host key is NOT a false-FAIL",
  hostKeyVerdict([synthetic("web/app/v.ts", 'export default { server: { "host": "127.0.0.1" } };')]).ok,
  "a legitimately quoted host key was not collected and failed vacuously");

control("a dynamic `await import(\"net\")` client IS counted",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/two.ts", 'const transport = await import("net"); transport.connect({ path: p });'),
  ]).length === 2,
  "a dynamic bare-specifier net client was invisible");

control("a MULTI-LINE `from \"net\"` import IS counted",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/three.ts", 'import transport from\n  "net";\ntransport.connect({ path: "/x" });'),
  ]).length === 2,
  "the specifier needle broke across a newline");

control("a TYPE-ONLY socket import is NOT counted as a client",
  socketClients([
    synthetic("web/api/one.ts", 'Bun.connect({ unix: "/x/signer.sock" })'),
    synthetic("web/api/types.ts", 'import type { Socket } from "node:net";\nexport type C = Socket;'),
  ]).length === 1,
  "a type-only import raised the client count — it opens nothing and is a false-FAIL");

control("a NON-LITERAL host: beside a legitimate loopback host IS caught",
  !hostKeyVerdict([
    synthetic("web/app/vite.config.ts", 'export default { server: { host: "127.0.0.1" } };'),
    synthetic("web/app/other.ts", 'export const s = { server: { host: process.env.H } };'),
  ]).ok,
  "a non-literal host was not collected — E-237 is open again, and it is E-235's defect in the sibling");

control("a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL",
  bindVerdict([synthetic("web/api/server.ts",
    'export const BIND_HOSTNAME = "127.0.0.1";\napp.listen({ port: Number(p), hostname: BIND_HOSTNAME });')]).ok,
  "a legitimate nested-call bind was rejected — the extractor is truncating at the first ) again");

control("a 0.0.0.0 host STILL caught with the widened collector",
  !hostKeyVerdict([synthetic("web/app/vite.config.ts", 'export default { server: { host: "0.0.0.0" } };')]).ok,
  "widening the collector lost the original catch");

control("a 0.0.0.0 dev-server host IS caught",
  !hostKeyVerdict([synthetic("web/app/vite.config.ts", 'export default { server: { host: "0.0.0.0" } };')]).ok,
  "a 0.0.0.0 dev-server host was not caught — it would proxy the API to the LAN");

control("a LAN dev-server host IS caught",
  !hostKeyVerdict([synthetic("web/app/vite.config.ts", 'export default { server: { host: "10.13.156.66" } };')]).ok,
  "a LAN dev-server host was accepted as loopback");

control("the REAL dev-server form is NOT caught",
  hostKeyVerdict([synthetic("web/app/vite.config.ts", 'export default { server: { host: "127.0.0.1" } };')]).ok,
  "the correct loopback dev-server host was rejected — the check would false-FAIL");

control("a source set with NO host: key FAILS rather than passing vacuously",
  !hostKeyVerdict([synthetic("web/app/plain.tsx", "export const x = 1;")]).ok,
  "an empty host: set passed vacuously");

control("a BARE .listen(port) with no hostname IS caught",
  !bindVerdict([synthetic("web/api/x.ts", 'const BIND_HOSTNAME = "127.0.0.1"; app.listen(3011);')]).ok,
  "a bare port bind was not caught — E-213's exact defect is invisible again");

control("an explicit 0.0.0.0 bind IS caught",
  !bindVerdict([synthetic("web/api/x.ts", 'const BIND_HOSTNAME = "0.0.0.0"; app.listen({ port, hostname: BIND_HOSTNAME });')]).ok,
  "a 0.0.0.0 bind was not caught");

control("a non-loopback hostname literal IS caught",
  !bindVerdict([synthetic("web/api/x.ts", 'const BIND_HOSTNAME = "10.13.156.66"; app.listen({ port, hostname: BIND_HOSTNAME });')]).ok,
  "a LAN address was accepted as loopback");

control("the REAL form is NOT caught",
  bindVerdict([synthetic("web/api/x.ts", 'const BIND_HOSTNAME = "127.0.0.1"; app.listen({ port, hostname: BIND_HOSTNAME });')]).ok,
  "the correct loopback form was rejected — the check would false-FAIL");

control("a source set with NO listen call FAILS rather than passing vacuously",
  !bindVerdict([synthetic("web/api/plain.ts", "export const x = 1;")]).ok,
  "an empty listen set passed vacuously — parts 1 and 3's guard is missing here");

// ---------------------------------------------------------------------------
// The residual, and the two shapes this gate CANNOT catch, asserted as
// uncaught. ⚠ If either is ever caught, the gate FAILS — because the
// disclosure below would then be stale (E-203's mechanism).
// ---------------------------------------------------------------------------
console.log("\nAsserted-uncaught — the disclosure below fails if these ever start passing");

control("ASSERTED UNCAUGHT: an indirect socket path assembled at runtime",
  findNeedles([synthetic("web/app/sneak.tsx", 'const p = ["signer", "sock"].join(".");')], SOCKET_NEEDLES).length === 0,
  "⚠ this is now CAUGHT — good, but whatThisDoesNotSay() item 1 is STALE. Update it.");

// ⚠ **This was an ASSERTED-UNCAUGHT control and is now a positive one.**
// `REVIEW-037` F2 showed part 6's first version never connected the hostname
// ARGUMENT to the constant it checked, so a run-time hostname passed. The
// rewrite FAILS CLOSED on anything it cannot resolve to a literal — and the
// asserted-uncaught control then failed, correctly, saying item 10 was stale.
// **That is E-203's mechanism catching a disclosure that had gone false.**
control("a hostname computed at run time IS caught — part 6 fails closed",
  !bindVerdict([synthetic("web/api/x.ts",
    'const BIND_HOSTNAME = "127.0.0.1"; app.listen({ port, hostname: pick() });')]).ok,
  "a computed hostname was accepted — part 6 is assuming rather than resolving");

control("a hostname read from the environment IS caught",
  !bindVerdict([synthetic("web/api/x.ts",
    'const BIND_HOSTNAME = "127.0.0.1"; app.listen({ port, hostname: process.env.H });')]).ok,
  "an env-supplied hostname was accepted as loopback");

control("a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present",
  !bindVerdict([synthetic("web/api/x.ts",
    'export const BIND_HOSTNAME = "127.0.0.1";\napp.listen({ port, hostname: "10.13.156.66" });')]).ok,
  "REVIEW-037 F2 is open again: the check is not connecting the argument to the declaration");

control("a Bun.serve( bind is seen, not only .listen(",
  !bindVerdict([synthetic("web/api/x.ts",
    'export const BIND_HOSTNAME = "127.0.0.1";\napp.listen({ port, hostname: BIND_HOSTNAME });\nBun.serve({ port, hostname: "0.0.0.0" });')]).ok,
  "a Bun.serve bind beside a correct .listen was invisible");

control("ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read",
  findNeedles([synthetic("web/app/dep.tsx", 'import { talk } from "some-pkg"; await talk();')], SOCKET_NEEDLES).length === 0,
  "⚠ this is now CAUGHT — whatThisDoesNotSay() item 2 is STALE. Update it.");

// ---------------------------------------------------------------------------

export function whatThisDoesNotSay(): string[] {
  return [
    "1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, " +
      "a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.",
    "2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a " +
      "socket is not read, and could not be gated this way; the property there is that nothing in " +
      "web/app has a reason to call one.",
    "3. The needle sets are NAMED. A signing helper spelled differently from every entry in " +
      "SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).",
    "4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what " +
      "it constructs, and it is not a substitute for reading that file.",
    "5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is " +
      "true is `claims-check`'s question and the wording tests', not this gate's.",
    "6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are " +
      "different properties and the gate had only the second when an issuer key was added to the " +
      "API process (E-212). A secret obtained some way this list does not name is still invisible.",
    "7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is " +
      "invisible to it. That is the price of not treating prose about another project's API as a " +
      "violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the " +
      "value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).",
    // --- added by REVIEW-036 (E-226, E-227). Every one of these was a limit
    // the gate ALREADY had and did NOT print, which is what made the
    // overstatement a P1: ADR-0003 leans on this list as the gate's reach.
    "8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed " +
      "in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the " +
      "count in Part 5 is over the two directories it loads (REVIEW-036b).",
    "9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible " +
      "to every part; 'read-only' is checked as 'reaches no signing operation and holds no " +
      "secret', which is not the same property (REVIEW-036b).",
    "10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE " +
      "level of indirection to a constant declared in the same source set; anything else — an env " +
      "read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It " +
      "reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in " +
      "a directory this gate does not load, is invisible (REVIEW-037 F2).",
    "11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an " +
      "outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` " +
      "called with a routable address passes. Full scope analysis needs a parser; this is a named " +
      "limit, not an oversight (REVIEW-037 spot-check, E-238).",
    "12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a " +
      "bind through a framework helper, or an aliased reference is invisible. Chasing spellings is " +
      "how a named set pretends to be a property; it is disclosed instead (E-238).",
    "13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` " +
      "with the specifier assembled at run time — is invisible. The import spellings are matched; " +
      "the aliasing is not, and cannot be lexically (E-238).",
    "14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: \"0.0.0.0\"` inside a " +
      "quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is " +
      "loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).",
    "15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on " +
      "loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-" +
      "design is reachable by any local user. Egress is a third property beside REACH and HOLD, " +
      "and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).",
  ];
}

console.log("\n  What this gate does NOT say:");
for (const line of whatThisDoesNotSay()) console.log(`    ${line}`);

console.log("\n" + "-".repeat(78));
if (failures > 0) {
  console.log(`FAIL: ${failures} check(s) or control(s) did not land as declared.`);
  process.exit(1);
}
console.log(`PASS: web/app reaches no socket, web/api builds Status and neither Pair nor`);
console.log(`      Prepare, no signing operation exists in the tier, exactly one socket`);
console.log(`      client exists, and the API binds to loopback only — under ${controlsRun} controls,`);
console.log(`      a count INCREMENTED BY THE`);
console.log(`      HELPER THAT RUNS THEM (E-203), each running through the same detector the`);
console.log(`      real checks call.`);
console.log(`⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.`);
