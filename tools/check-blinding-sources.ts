#!/usr/bin/env bun
/**
 * check-blinding-sources.ts — the gate that makes `CLAIMS.md` E-76 stay closed.
 *
 * # Why this exists, and it is not "extra rigour"
 *
 * On 2026-08-24 a session migrated the `tools/` harnesses from upstream's
 * `mpt_generate_blinding_factor` to the ruled `r`/`ρ` derivation and recorded
 * the migration as **complete, with four named exemptions**. It was not
 * complete. The search had been `grep 'tool("blinding")'` — a **name-based**
 * search — and it missed two call sites that reach the same upstream generator
 * through different names:
 *
 * * `spike-2026-08-18/devnet-send-our-nonces.ts` wraps `mptool` in a helper
 *   called `ours(...)`, so `ours("blinding")` matched nothing.
 * * `spike-2026-08-17/npm-e2e-convert.ts` calls the **npm package's**
 *   `mpt.generateBlindingFactor()`, which shares no identifier with the C
 *   symbol at all.
 *
 * Both were found by a review leg grepping differently, not by the session that
 * wrote the claim. `CLAIMS.md` **E-137**.
 *
 * ⚠ **The lesson is not "grep harder".** It is that a one-off search produces a
 * claim with no falsifier, and this project's rule is that every capability
 * claim needs a test that fails if the claim is false. This file is that test.
 *
 * # What it does
 *
 * Enumerates the **known spellings** of upstream's blinding generator, by pattern
 * rather than by call-site name, and fails if any file outside [`EXEMPT`] uses
 * one. A new harness that reaches for the superseded source fails this check
 * rather than being noticed four sessions later.
 *
 * ⚠ **"Known spellings", not "every route", and the narrower word is the honest
 * one.** A subcommand assembled at run time is invisible to every pattern here
 * and no regex closes that. `REVIEW-021` round two asked for the guarantee to be
 * narrowed rather than overclaimed (`CLAIMS.md` E-142).
 *
 *   bun tools/check-blinding-sources.ts
 *
 * ⚠ **`mpt_generate_blinding_factor` is not unsafe. It is UNRULED.** Upstream's
 * CSPRNG is a fine source of a scalar; it is simply not the one REVIEW-010
 * ruled, and an `r` published on Devnet is published forever. Nothing here says
 * the exempt harnesses are producing weak scalars.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/**
 * Where to look.
 *
 * ⚠ **`signer/` is walked too, and that is new.** The signer *deliberately does
 * not bind* `mpt_generate_blinding_factor` — `src/mpt.rs` says so — but until
 * `REVIEW-021` round two that was **asserted in prose and gated by nothing**.
 * It is gated now. (Its two mentions are comments, and the patterns require an
 * open paren, so prose about the symbol does not fire.)
 */
// ⚠ **`facility/` is walked too, added 2026-08-25 with architecture §6 step 7.**
// The facility generates no proofs and draws no blinding factors — everything
// that publishes an `r` is built by `signer/` under the ruled derivation — and
// that is a claim, so it is gated here rather than asserted in a README. A gate
// whose roots do not include the newest tree is a gate whose PASS is about the
// old tree.
const ROOTS = [
  join(ROOT, "tools"),
  join(ROOT, "signer", "src"),
  join(ROOT, "signer", "tests"),
  join(ROOT, "facility"),
];

/**
 * ⚠ **This file excludes ITSELF from the walk**, and the alternative was worse.
 *
 * It necessarily contains every pattern it searches for, so it matched its own
 * regex literals and appeared in the exempt list — inflating the count with a
 * file that is **not a call site**. `REVIEW-021` round two found the count being
 * reported as *"nine call sites"* when two of the nine were this file and a
 * dead entry (`CLAIMS.md` E-141).
 */
const SELF = join(ROOT, "tools", "check-blinding-sources.ts");

/**
 * Every route to the superseded generator, by pattern.
 *
 * ⚠ **Add to this list when a new route appears** — a WASM export, an npm
 * method, a differently-named shell wrapper. The list being incomplete is the
 * exact failure this file exists to prevent, so it is deliberately broad and
 * accepts false positives: an extra exemption line is cheap and a missed call
 * site is what happened.
 */
const ROUTES: [string, RegExp][] = [
  // `tool("blinding")`, `ours("blinding")`, `patched("blinding")`.
  ["mptool subcommand", /\(\s*["']blinding["']\s*\)/],
  // The ARRAY form: `Bun.spawnSync([MPTOOL, "blinding"])`.
  ["mptool subcommand, array form", /[[,]\s*["']blinding["']\s*[\],]/],
  // ⚠ **The SHELL form, bare and unquoted**: `mptool blinding`, `$MPTOOL blinding`.
  // No quotes and no parens, so every other route misses it — and `tools/` holds
  // five shell scripts (`CLAIMS.md` E-142).
  ["mptool subcommand, shell form", /\bmptool\b[^\n]*\bblinding\b/i],
  // ⚠ **The SYMBOL, with no open-paren requirement.** An earlier version
  // required `\(` so the gate would stop firing on prose. `REVIEW-021` round
  // two produced the counterexamples that kills: `const f = mpt.generateBlindingFactor; f()`
  // and `M["_mpt_generate_blinding_factor"](pR)` both reach the generator and
  // match no paren form. Prose is excluded **structurally** now — comments are
  // stripped before matching — rather than by a heuristic that was wrong in
  // both directions (`CLAIMS.md` E-142).
  ["C symbol", /\bmpt_generate_blinding_factor\b/],
  ["WASM export", /_mpt_generate_blinding_factor\b/],
  ["npm method", /\bgenerateBlindingFactor\b/],
];

/**
 * Strip comments before matching.
 *
 * ⚠ **This is what makes "a call, not a mention" true rather than hoped for.**
 * Several files name the symbol in a comment explaining what they replaced, and
 * a gate that fires on those trains a reader to skip its output. The previous
 * approach — requiring an open paren — got this wrong in **both** directions:
 * it still matched `generateBlindingFactor()` inside a comment, and it missed
 * every reference that is not a direct call.
 *
 * ⚠ **It is line-based and therefore approximate.** A string literal containing
 * `//` will lose its tail. That is acceptable for a gate whose failure mode is
 * an extra exemption line; it is **not** a parser and does not claim to be.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1").replace(/^\s*[*#].*$/, ""))
    .join("\n");
}

/**
 * Files that reach the superseded generator **deliberately**, with the reason.
 *
 * ⚠ Each of these would lose the finding it exists to demonstrate if it were
 * migrated. Every one also carries the same reason as a comment at its own call
 * site, because a reader of the file should not have to find this list.
 */
const EXEMPT: Record<string, string> = {
  // ⚠ **THREE ENTRIES WERE REMOVED 2026-08-25 BECAUSE THEIR HARNESSES WERE
  // MIGRATED, and the reasons that had kept them here were false twice over.**
  //
  // `reuse-r-setup.ts`, `adj-c1-verify.ts` and `adj-c1-shared-blinding.ts` each
  // **submit to Devnet**, so under this project's own stated principle —
  // *migrate what publishes an `r` to a ledger* — they never qualified. The
  // first reason said migrating *"would delete the finding"*: false, because
  // each needs exactly ONE scalar to violate the rule and the ruled derivation
  // supplies the rest. The replacement reason said they preserved *"these exact
  // scalars"*: **also false**, because upstream's generator draws fresh entropy
  // every run and a rerun never reproduced them. `CLAIMS.md` E-143.
  "tools/spike-2026-08-17/mptool.c":
    "the retained ADAPTER — `mptool.c:54` genuinely calls the generator, and it is what the " +
    "remaining exempt harnesses invoke as the `blinding` subcommand. ⚠ Its earlier reason said " +
    "it 'is not itself a caller', which was false (E-143)",
  "tools/spike-2026-08-17/wasm-test.ts":
    "tests the WASM export surface, of which this symbol is one — migrating it would stop " +
    "testing it. Local only: nothing is submitted",
  "tools/spike-2026-08-17/npm-package-test.ts":
    "asks whether @xrplf/mpt-crypto reproduces the NATIVE library's proof material byte for " +
    "byte, so both generators are the subject. Local only: zero submit calls",
  "tools/spike-2026-08-18/nonce-crosscheck.ts":
    "NO NETWORK — its own header says so, and nothing it derives is ever published. E-76's " +
    "concern is an `r` on a public ledger forever; a local determinism crosscheck has none",
  "tools/spike-2026-08-17/npm-e2e-convert.ts":
    "its whole claim is that EVERY piece of proof material came from @xrplf/mpt-crypto off npm " +
    "(E-53); deriving would falsify the sentence it exists to support. ⚠ **AND IT CANNOT RUN**: " +
    "it imports from /tmp/wconf/convert.ts, which does not exist, so it publishes nothing as it " +
    "stands. ⚠ **If anyone repairs that import this exemption must be re-argued** — a running " +
    "version WOULD publish an unruled `r` to Devnet",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p));
    } else if (/\.(ts|js|mjs|cjs|c|h|rs|sh)$/.test(name)) {
      // ⚠ `.sh` and `.mjs`/`.cjs` were missing until `REVIEW-021` round two.
      // No shell script calls the generator today; this is a latent hole
      // closed, not a live one (`CLAIMS.md` E-142).
      out.push(p);
    }
  }
  return out;
}

let violations = 0;
let exemptSeen = 0;
const unusedExemptions = new Set(Object.keys(EXEMPT));

const files = ROOTS.filter((r) => { try { statSync(r); return true; } catch { return false; } })
  .flatMap(walk)
  .filter((f) => f !== SELF)
  .sort();

for (const file of files) {
  const rel = relative(ROOT, file);
  const text = stripComments(readFileSync(file, "utf8"));
  const hits = ROUTES.filter(([, re]) => re.test(text)).map(([what]) => what);
  if (hits.length === 0) continue;

  unusedExemptions.delete(rel);
  if (rel in EXEMPT) {
    exemptSeen++;
    console.log(`  exempt   ${rel}\n             ${hits.join(", ")} — ${EXEMPT[rel]}`);
    continue;
  }
  violations++;
  console.error(
    `\n✗ ${rel} reaches upstream's blinding generator (${hits.join(", ")}) and is not exempt.\n` +
    `  The ruled derivation is tools/wconf-randomness.ts — deriveRandomness() or deriveR().\n` +
    `  If this harness needs the superseded source deliberately, add it to EXEMPT here\n` +
    `  WITH the reason, and put the same reason at its call site.`
  );
}

// ⚠ **A stale exemption is a defect too.** An entry for a file that no longer
// reaches the generator means the list is describing a state that has moved,
// which is how a list stops being evidence.
for (const stale of unusedExemptions) {
  // ⚠ **No exceptions, deliberately.** This loop carried two hardcoded skips and
  // one of them grew into a mask. If a file belongs here but does not match, it
  // does not belong here.
  console.error(`\n✗ ${stale} is listed as exempt but no longer reaches the generator. Remove it.`);
  violations++;
}

// ⚠ **"call sites", not "files", and the distinction cost a false sentence.**
// The count was being reported as *"nine call sites"* while including this file
// (which only contains the patterns) and a dead entry. Every number below is now
// a file that actually **calls** the generator (`CLAIMS.md` E-141).
console.log(
  `\n${violations === 0 ? "PASS" : "FAIL"}: ${exemptSeen} deliberate call site${exemptSeen === 1 ? "" : "s"}, ` +
  `${violations} unrecorded use${violations === 1 ? "" : "s"} of the superseded generator. ` +
  `${files.length} files scanned across tools/, signer/ and facility/.`
);
if (violations === 0) {
  console.log(
    "⚠ WHAT THIS DOES NOT CATCH, stated because the alternative is a false guarantee:\n" +
    "  a subcommand assembled at run time — `const c = \"blind\"+\"ing\"` — is invisible to\n" +
    "  every pattern here, and no regex closes that. The guarantee is over KNOWN SPELLINGS,\n" +
    "  not over reachability. REVIEW-021 round two asked for the narrower wording and it is\n" +
    "  the honest one (CLAIMS.md E-142).\n\n" +
    "⚠ This says the ruled derivation is the only unrecorded source of r and rho across\n" +
    "  tools/, signer/ AND facility/ — the signer's claim that it deliberately does not bind\n" +
    "  the symbol, and the facility's claim that it draws no blinding factors at all, are gated\n" +
    "  is gated here rather than only asserted in its own comments.\n" +
    "  It says nothing about whether that derivation is correct — the nine published vectors\n" +
    "  in tools/wconf-randomness.ts are what say that, and it refuses to derive without them."
  );
}
process.exit(violations === 0 ? 0 : 1);
