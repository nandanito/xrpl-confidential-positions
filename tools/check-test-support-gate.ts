/**
 * Gate: **the test-only signing API is absent from an ordinary build.**
 *
 * `CLAIMS.md` **B-20**, raised by `REVIEW-024`'s Codex leg and a condition on the
 * B-16 build (`REVIEW-024` §7 item 3). Before 2026-08-27 `Hedge`,
 * `Hedge::DeterministicForVectors` and `AccountKey::sign_message_with` were
 * `pub` in a plain release build, and the only thing saying the deterministic
 * arm was for vectors was a doc comment. Every caller was a test; **nothing
 * enforced that.**
 *
 * ⚠ **This is the same shape `REVIEW-014` found once already** — the README
 * claimed a release build dropped `test-support` and it did not — and
 * `Makefile`'s `signer-release` **carried** the sentence *"Verified by compiling
 * a release binary that references them and watching it fail to resolve"* above
 * a recipe that was a bare `cargo build --release` and referenced nothing.
 * **A claim about what a build excludes needs a build that tries to include
 * it.** This is that build.
 *
 * ⚠ That sentence said *"still carries"* until round two, **in the same commit
 * that removed it** — this file describing the Makefile it had just fixed.
 * `REVIEW-026`, Codex leg.
 *
 * # ⚠ This gate FALSE-PASSED in its first form, and REVIEW-025 caught it
 *
 * Round one, **both external legs independently**: the first version put every
 * probe in **one** source file and asked whether the compiler's output
 * `includes(symbol)`. rustc echoes the offending **source line** in its
 * diagnostic, and that line contains every symbol written on it — so a symbol
 * was reported "gated" whenever *any* symbol sharing its line failed.
 *
 * ⚠ **Demonstrated rather than reasoned.** A control entry naming `0u8` — a
 * literal, not a symbol, appearing only in an echoed line — was reported
 * **gated**, and the run still said PASS. *A gate that reports a number is
 * making a claim about what the number counts* (`CLAIMS.md` E-141), and this one
 * was counting echoed text.
 *
 * # How it cannot pass for the wrong reason now
 *
 * **Each probe gets its own pair of compiles**, in a scratch crate rewritten
 * between probes, so a failure is attributable to that probe's expression and to
 * nothing else. ⚠ This said *"its own crate"* for one commit and that was
 * false — there is one temp crate, rewritten (`REVIEW-026`, Codex leg):
 *
 *   1. WITH `test-support` the probe must **compile**. If it does not, the entry
 *      is VOID — a renamed symbol fails to compile either way, and a gate that
 *      called that a pass would check nothing.
 *   2. WITHOUT `test-support` that same probe must **fail** to compile.
 *   3. A **negative control** probe, using only ungated API, must compile in
 *      BOTH directions. If it fails without the feature, the harness is broken
 *      — something unrelated to the gate is stopping every build, and every
 *      "gated" verdict above would be spurious.
 *
 * ⚠ **What a probe still cannot separate:** `Hedge::FixedAux` names a variant of
 * a gated enum, so its probe fails if *either* is gated, and no compile can tell
 * you which. The symbol column names the **expression's subject**, not a symbol
 * resolved in isolation. That is stated rather than papered over.
 *
 * ⚠ Why a throwaway crate rather than an `examples/` target: `signer/Cargo.toml`
 * carries a self dev-dependency that turns `test-support` on for test targets,
 * and Cargo unifies features across a build — so an example would be compiled
 * with the feature enabled and the without-feature direction would silently
 * succeed.
 *
 * Run: bun run tools/check-test-support-gate.ts
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SIGNER = resolve(import.meta.dir, "..", "signer");

/** Each gated symbol, with the feature that is supposed to be gating it. */
const GATED: Array<{ symbol: string; register: string; probe: string }> = [
  {
    symbol: "sign_message_with",
    register: "B-20 — the deterministic signing arm",
    probe: `let _ = k.sign_message_with(wconf_signer::xrpl::Hedge::DeterministicForVectors, b"x");`,
  },
  {
    symbol: "Hedge",
    register: "B-20 — the hedge selector type itself",
    // ⚠ `Hedge::Fresh` was here and the variant was DELETED in REVIEW-025's
    // round-one fixes — it had one reference, its own match arm. The gate
    // reported VOID rather than passing, which is the behaviour it was rebuilt
    // for: a probe that cannot compile either way proves nothing.
    probe: `let _h: wconf_signer::xrpl::Hedge = wconf_signer::xrpl::Hedge::DeterministicForVectors;`,
    // (bare too — nothing else appears in this expression except the variant it
    //  must name to construct a value)
  },
  {
    symbol: "FixedAux",
    register: "B-16 §6 item 2 — caller-supplied auxiliary entropy",
    // ⚠ **Bare, not wrapped in `sign_message_with`.** It was wrapped, so its
    // probe named three symbols and could not distinguish which one was gating
    // it. Both `REVIEW-026` legs. The enum/variant coupling below is irreducible;
    // the method coupling was not.
    probe: `let _h = wconf_signer::xrpl::Hedge::FixedAux([0u8; 32]);`,
  },
  {
    symbol: "acknowledgement_for_test",
    register: "A6 — the fabricated human acknowledgement (REVIEW-014's original)",
    probe: `let _ = wconf_signer::confirm::acknowledgement_for_test("x");`,
  },
  {
    symbol: "fail_next_entropy_draw_for_test",
    register: "the induced entropy failure",
    probe: `wconf_signer::store::fail_next_entropy_draw_for_test();`,
  },
  {
    symbol: "next_entropy_draw_returns_for_test",
    register: "B-16 §6 item 3 — the induced SUCCESSFUL draw",
    probe: `wconf_signer::store::next_entropy_draw_returns_for_test([0u8; 32]);`,
  },
];

const NEGATIVE_CONTROL = {
  symbol: "(negative control)",
  register: "ungated API only — must compile BOTH ways, or the harness is broken",
  probe: `let _ = k.public()[0];`,
};

const body = (probe: string) => `fn main() {
    let k = wconf_signer::xrpl::AccountKey::ed25519_from_entropy(&[7u8; 16]).unwrap();
    let _ = &k;
    ${probe}
}
`;

const manifest = (withFeature: boolean) => `[package]
name = "wconf-test-support-probe"
version = "0.0.0"
edition = "2021"
publish = false

[workspace]

[dependencies]
wconf-signer = { path = ${JSON.stringify(SIGNER)}${withFeature ? `, features = ["test-support"]` : ""} }
`;

function compile(dir: string, probe: string, withFeature: boolean) {
  writeFileSync(join(dir, "Cargo.toml"), manifest(withFeature));
  writeFileSync(join(dir, "src", "main.rs"), body(probe));
  const r = spawnSync("cargo", ["build", "--quiet"], { cwd: dir, encoding: "utf8" });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const dir = mkdtempSync(join(tmpdir(), "wconf-test-support-gate-"));
// ⚠ `process.exit()` does NOT run a pending `finally`, so every failure path
// below leaked the scratch crate. `REVIEW-026`, Gemini leg.
const cleanup = () => rmSync(dir, { recursive: true, force: true });
const bail = (): never => { cleanup(); process.exit(1); };
try {
  mkdirSync(join(dir, "src"));

  console.log("check-test-support-gate — CLAIMS.md B-20, REVIEW-024 section 7 item 3\n");
  console.log(`  scratch crate: ${dir}   (rewritten per probe; one pair of compiles each)`);
  console.log(`  signer:      ${SIGNER}\n`);

  // ⚠ The negative control runs FIRST. If an ungated probe cannot build without
  // the feature, something unrelated is breaking every build and every "gated"
  // verdict below would be spurious.
  const ctlWith = compile(dir, NEGATIVE_CONTROL.probe, true);
  const ctlWithout = compile(dir, NEGATIVE_CONTROL.probe, false);
  if (!ctlWith.ok || !ctlWithout.ok) {
    console.log((ctlWith.ok ? ctlWithout : ctlWith).out.split("\n").map((l) => `      ${l}`).join("\n"));
    console.error(
      "\nFAIL (VOID, not passing): the negative control does not compile " +
        `${ctlWith.ok ? "WITHOUT" : "WITH"} test-support.\n` +
        "  It uses only ungated API, so this is a broken harness — a missing toolchain,\n" +
        "  an unbuildable signer, a bad path — and NOT evidence that anything is gated.",
    );
    bail();
  }
  console.log(`  negative control: compiles both ways. The harness works.\n`);

  const rows: Array<{ g: (typeof GATED)[number]; verdict: "gated" | "REACHABLE" | "VOID"; out: string }> = [];
  for (const g of GATED) {
    const withFeat = compile(dir, g.probe, true);
    if (!withFeat.ok) {
      rows.push({ g, verdict: "VOID", out: withFeat.out });
      continue;
    }
    const without = compile(dir, g.probe, false);
    rows.push({ g, verdict: without.ok ? "REACHABLE" : "gated", out: without.out });
  }

  console.log("  symbol                              verdict     register");
  for (const r of rows) {
    console.log(`  ${r.g.symbol.padEnd(35)} ${r.verdict.padEnd(11)} ${r.g.register}`);
  }

  const reachable = rows.filter((r) => r.verdict === "REACHABLE");
  const voided = rows.filter((r) => r.verdict === "VOID");
  if (voided.length) {
    console.log("\n" + voided[0]!.out.split("\n").slice(0, 12).map((l) => `      ${l}`).join("\n"));
    console.error(
      `\nFAIL (VOID, not passing): ${voided.length} probe(s) do not compile even WITH test-support.\n` +
        "  A probe that cannot compile either way would report the feature gate working\n" +
        "  while checking nothing. Fix the probe in this file — a renamed symbol is the\n" +
        "  usual cause.",
    );
    bail();
  }
  if (reachable.length) {
    console.error(
      `\nFAIL: ${reachable.length} test-only symbol(s) are REACHABLE from an ordinary build:\n` +
        reachable.map((r) => `    ${r.g.symbol}`).join("\n") +
        "\n  That is CLAIMS.md B-20 open again, and it is what REVIEW-014 found once already.",
    );
    bail();
  }

  console.log(
    `\nPASS: ${GATED.length} test-only probes are unreachable without \`test-support\`,\n` +
      "      each compiles WITH it, and the negative control compiles both ways.",
  );
  console.log(
    "\n⚠ WHAT THIS DOES NOT SAY, because the alternative is a false guarantee:\n" +
      "  1. It checks the probes listed in this file. A test-only entry point added\n" +
      "     later and not listed here is invisible to it — the guarantee is over a\n" +
      "     NAMED SET, not over the crate's whole public surface.\n" +
      "  2. It establishes that each probe EXPRESSION is unreachable, not that every\n" +
      "     symbol named in it is independently gated. `Hedge::FixedAux` cannot be\n" +
      "     uncoupled from `Hedge` — a variant needs its enum — so that row means\n" +
      "     'the enum or the variant is gated'. ⚠ The METHOD coupling WAS avoidable\n" +
      "     and was removed in REVIEW-026: probes no longer wrap a variant in\n" +
      "     `sign_message_with` just to mention it.\n" +
      "  ⚠ Its first form claimed per-symbol attribution it did not have, and both\n" +
      "  REVIEW-025 external legs caught it. The narrower wording is the honest one\n" +
      "  (CLAIMS.md E-142's precedent).",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
