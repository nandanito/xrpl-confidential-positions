/**
 * Wording tests over every sentence this tier renders.
 *
 * ⚠⚠ **`claims-check` is necessary and it is NOT sufficient, and this project
 * has the receipts.** A false disclosure sentence survived that gate once
 * already (`CLAIMS.md` F-24 — *"Public: the aggregate change"*, when
 * `MPTAmount` is plaintext on **every individual** ConvertBack). **The surface
 * without a wording test is where the false sentence always lives**, and a UI
 * is the largest disclosure surface this project has built.
 *
 * These tests fail if the interface claims something `CLAIMS.md` forbids, or
 * stops saying something a ruling obliges.
 */

import { test, expect, describe } from "bun:test";
import { readFileSync, readdirSync, statSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "./capability.ts";
import { CANONICAL_ZERO_NOTE, NOT_CANONICAL_NOTE, WHAT_IS_PUBLIC, WHAT_IS_HIDDEN } from "./observer.ts";
import { MIRROR_FIELD_LEDGER_NAME, ISSUER_KEY_POLICY, FORBIDDEN_SECRET_ENV, issuerView } from "./issuer.ts";
import { FLOWS, walkFlows } from "./custody-sim.ts";
import { SECRET_NEEDLES, stripComments, stripStringLiterals } from "../../tools/check-web-readonly.ts";

const REPO = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

function sources(dir: string): { rel: string; text: string }[] {
  const out: { rel: string; text: string }[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      if (e === "node_modules" || e === "dist" || e === ".output") continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e) && !e.endsWith(".test.ts")) {
        out.push({ rel: p.slice(REPO.length + 1), text: readFileSync(p, "utf8") });
      }
    }
  };
  walk(join(REPO, dir));
  return out;
}

const TIER = [...sources("web/api"), ...sources("web/app/src")];

/** Stable per-body temp filename, so parallel tests do not collide. */
function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Does this text ASSERT that a balance is non-zero?
 *
 * ⚠ The hedged forms — *"not the same as saying it is non-zero"*, *"some
 * non-zero value, or never reset"* — are the CORRECT copy and must not match.
 */
export function assertsNonZero(text: string): boolean {
  for (const m of text.matchAll(/non-zero/gi)) {
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (/\b(?:not|never|neither|nothing|isn't|is not)\b[^.]{0,60}$/i.test(before)) continue;
    if (/\bsome\s*$/i.test(before)) continue;   // "some non-zero value, or never reset"
    if (/\bof a\s*$|\bthe value of\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

/** Does this line ASSERT that a holder is private from the issuer? P-9 says no
 * configuration makes that true, so every occurrence in this tier is a negation
 * and the detector must distinguish the two.
 */
export function claimsPrivateFromIssuer(line: string): boolean {
  const claim = /private\s+from\s+the\s+issuer/i;
  if (!claim.test(line)) return false;
  const before = line.slice(0, line.search(claim));
  return !/\b(?:no|not|never|neither|nothing|cannot|does\s+not|is\s+not)\b/i.test(before);
}

/** Does this line ASSERT that identities are hidden?
 *
 * ⚠ The guard is the negation FORM. `No key source hides identities` and
 * `It does not hide who transacts` are the tier's own correct sentences and
 * must not match; `hides identities` standing alone must.
 */
export function claimsIdentitiesHidden(line: string): boolean {
  const claim = /\bhide[sn]?\b[^.]{0,40}?\b(?:identit|who\s+transacts|sender|receiver)/i;
  if (!claim.test(line)) return false;
  // A negator anywhere earlier in the same sentence inverts it.
  const upToClaim = line.slice(0, line.search(claim));
  return !/\b(?:no|not|never|neither|nothing|cannot|does\s+not|is\s+not)\b/i.test(upToClaim);
}

/** Does this text ASSERT that something is hidden or confidential? */
export function assertsHidden(text: string): boolean {
  for (const m of text.matchAll(/\b(?:hidden|confidential|private)\b/gi)) {
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    if (/\b(?:not|never|no|nothing|neither|publicly)\b\s*$|\b(?:not|never)\b[^.]{0,20}$/i.test(before)) continue;
    // `confidential balance` / `ConfidentialMPT` are NAMES, not claims.
    const after = text.slice(m.index, m.index + 40);
    if (/^confidential\s+(?:balance|transaction|position|MPT|send)/i.test(after)) continue;
    return true;
  }
  return false;
}

describe("the tier's own sources", () => {
  test("more than one file is scanned — an empty set would pass every test below", () => {
    expect(TIER.length).toBeGreaterThan(8);
  });
});

describe("P-5 — never trustless, non-custodial, audited, production-ready or secure", () => {
  // ⚠ The needle is the CLAIM, not the word. "not secure" and "is secure" both
  // contain "secure", and a test that banned the word would fail on its own
  // disclaimer — which is how a wording test gets deleted rather than fixed.
  const FORBIDDEN = [
    /\bis\s+(?:fully\s+)?secure\b/i,
    /\bproduction[- ]ready\b(?!\s*\()/i,
    /\bnon-custodial\b/i,
    /\btrustless\b/i,
    /\bfully\s+audited\b/i,
  ];

  for (const re of FORBIDDEN) {
    test(`no rendered sentence asserts ${re}`, () => {
      const hits: string[] = [];
      for (const s of TIER) {
        for (const line of s.text.split("\n")) {
          // A line that cites the prohibition is not making the claim.
          if (/P-5|CLAIMS\.md|forbid|never claim|prohibition/i.test(line)) continue;
          if (re.test(line)) hits.push(`${s.rel}: ${line.trim().slice(0, 120)}`);
        }
      }
      expect(hits).toEqual([]);
    });
  }
});

describe("P-9 — a holder is never private from the issuer", () => {
  // ⚠ **Third test in this file whose first form failed on its own correct
  // copy** — *"No key source makes a holder private from the issuer"* matched a
  // guard looking for `not`. Same fix, same reason: the guard is the negation
  // FORM, and the detector is exercised in both directions.
  test("no sentence claims privacy from the issuer", () => {
    const hits: string[] = [];
    for (const s of TIER) {
      for (const line of s.text.split("\n")) if (claimsPrivateFromIssuer(line)) hits.push(`${s.rel}: ${line.trim()}`);
    }
    expect(hits).toEqual([]);
  });

  test("...and that detector CATCHES a real violation (verified by breaking it)", () => {
    expect(claimsPrivateFromIssuer("Your balance stays private from the issuer.")).toBe(true);
    expect(claimsPrivateFromIssuer("This keeps holders private from the issuer.")).toBe(true);
  });

  test("...and does NOT fire on the negations the tier actually renders", () => {
    expect(claimsPrivateFromIssuer("No key source makes a holder private from the issuer.")).toBe(false);
    expect(claimsPrivateFromIssuer("A holder is never private from the issuer.")).toBe(false);
    expect(claimsPrivateFromIssuer("Nothing makes a holder private from the issuer.")).toBe(false);
  });

  test("the issuer view states P-9 positively rather than omitting it, on both tiers", () => {
    const issuers = TIER.filter((s) => s.rel.endsWith("routes/issuer.tsx"));
    expect(issuers.map((s) => s.rel).sort()).toEqual(["web/app/src/hosted/routes/issuer.tsx", "web/app/src/routes/issuer.tsx"]);
    for (const issuer of issuers) expect(issuer.text).toMatch(/never private from the issuer/i);
  });

  test("P-9 is in the invariants the overview renders", () => {
    expect(INVARIANTS.map((i) => i.rule)).toContain("P-9");
  });
});

describe("P-4 and P-11 — amounts are hidden; identities, timing and frequency are not", () => {
  // ⚠ **The first form of this test FAILED ON THE NEGATIONS** — *"No key source
  // hides identities"* matched, because the guard looked for `not` and the
  // sentence says `No`. A wording test that false-fails on correct copy gets
  // deleted rather than fixed, so the guard is the negation FORM, not a word
  // list, and `claimsIdentitiesHidden` is exercised in both directions below.
  test("no sentence claims identities are hidden", () => {
    const hits: string[] = [];
    for (const s of TIER) {
      for (const line of s.text.split("\n")) if (claimsIdentitiesHidden(line)) hits.push(`${s.rel}: ${line.trim()}`);
    }
    expect(hits).toEqual([]);
  });

  test("...and that detector CATCHES a real violation (verified by breaking it)", () => {
    expect(claimsIdentitiesHidden("Confidential MPT hides identities from the network.")).toBe(true);
    expect(claimsIdentitiesHidden("This hides who transacts with whom.")).toBe(true);
  });

  test("...and does NOT fire on the negations the tier actually renders", () => {
    expect(claimsIdentitiesHidden("No key source hides identities. Sender and receiver are public.")).toBe(false);
    expect(claimsIdentitiesHidden("It does not hide who transacts.")).toBe(false);
    expect(claimsIdentitiesHidden("Nothing here hides the sender.")).toBe(false);
  });

  test("the observer view enumerates what is public before what is hidden", () => {
    const obs = readFileSync(join(REPO, "web/api/observer.ts"), "utf8");
    expect(obs.indexOf("whatIsPublic")).toBeLessThan(obs.indexOf("whatIsHidden"));
  });
});

describe("F-1 — a zero confidential balance is publicly known", () => {
  test("the observer view says so in the ciphertext note, not in a footnote", () => {
    expect(CANONICAL_ZERO_NOTE).toMatch(/publicly known to be exactly zero/i);
    expect(CANONICAL_ZERO_NOTE).toMatch(/F-1/);
  });

  test("no sentence presents a canonically-zero balance as hidden", () => {
    expect(assertsHidden(CANONICAL_ZERO_NOTE)).toBe(false);
    expect(CANONICAL_ZERO_NOTE).toMatch(/not hidden|publicly known/i);
  });

  test("...and that detector CATCHES a note that claims the zero balance is hidden", () => {
    expect(assertsHidden('A zero balance is hidden from observers.')).toBe(true);
    expect(assertsHidden('The amount remains confidential.')).toBe(true);
    expect(assertsHidden('A zero confidential balance is not hidden.')).toBe(false);
  });
});

describe("E-211 — a non-canonical ciphertext is NOT evidence of a non-zero balance", () => {
  // ⚠⚠ This test exists because the sentence it forbids was SHIPPED. Measured
  // on Devnet 2026-08-28: an account decrypting to 0 through the issuer mirror
  // carried a spending ciphertext that did not match the canonical EncZero, and
  // the page called it "Non-zero". `tools/observer-harness.ts:277` had the
  // correct hedge — "some non-zero value, or never reset" — one import away.
  //
  // ⚠ It asserts on the exported VALUES, not on the file's source text. The
  // first version scanned the source and failed on the COMMENT that documents
  // this very bug — a detector that reads comments fires on the documentation
  // of the error it is looking for (E-182's shape, in a test rather than a gate).

  test("the non-matching note does not assert the balance is non-zero", () => {
    expect(assertsNonZero(NOT_CANONICAL_NOTE)).toBe(false);
  });

  test("it says explicitly that a spent-to-zero balance looks the same", () => {
    expect(NOT_CANONICAL_NOTE).toMatch(/NOT the same as saying it is non-zero/i);
    expect(NOT_CANONICAL_NOTE).toMatch(/reached zero by spending/i);
  });

  test("the canonical-zero note still states F-1 plainly", () => {
    expect(CANONICAL_ZERO_NOTE).toMatch(/publicly known to be exactly zero/i);
    expect(assertsHidden(CANONICAL_ZERO_NOTE)).toBe(false);
  });

  test("the detector CATCHES the sentence that was actually shipped", () => {
    expect(assertsNonZero("Non-zero, and the amount is hidden from an observer.")).toBe(true);
    expect(assertsNonZero("This balance is non-zero.")).toBe(true);
  });

  test("...and does NOT fire on the corrected hedge, or on the harness's wording", () => {
    expect(assertsNonZero("That is NOT the same as saying it is non-zero.")).toBe(false);
    expect(assertsNonZero("not the canonical zero (some non-zero value, or never reset)")).toBe(false);
  });

  test("what is PUBLIC carries F-1's condition rather than claiming zeros are always visible", () => {
    const f1 = WHAT_IS_PUBLIC.filter((l) => /zero/i.test(l));
    expect(f1.length).toBeGreaterThan(0);
    for (const line of f1) expect(line).toMatch(/canonical/i);
  });

  test("what is HIDDEN does not describe the hidden value as non-zero", () => {
    for (const line of WHAT_IS_HIDDEN) expect(assertsNonZero(line)).toBe(false);
  });
});

describe("the issuer view holds NO key and performs NO decryption", () => {
  // ⚠⚠ It DID hold one, and decrypted per request, which is a decryption
  // oracle over an unauthenticated GET — the fourth rotation trigger ADR-0003
  // names, written by the same session one file over (CLAIMS.md E-212).
  // Architecture §6 step 8 lets this tier touch the TOOL'S OUTPUT and never a
  // private key. These tests are what stop it drifting back.
  // ⚠ **The gate's own instruments, imported rather than re-derived.** These
  // needles are IDENTIFIERS, so string literals are blanked: declaring
  // `FORBIDDEN_SECRET_ENV = "WCONF_ELGAMAL_SK"` is the name being forbidden,
  // not a use of it, and a weaker stripper in the test would disagree with the
  // gate about the same file. One instrument, two callers (CLAIMS.md E-207).
  const src = readFileSync(join(REPO, "web/api/issuer.ts"), "utf8");
  const code = stripStringLiterals(stripComments(src));

  test("it never reads the issuer secret from the environment", () => {
    expect(code).not.toContain(`process.env.${FORBIDDEN_SECRET_ENV}`);
    expect(code).not.toMatch(/process\.env\[/);
  });

  test("no file under web/ reads the issuer secret", () => {
    const hits = TIER.filter((f) =>
      stripStringLiterals(stripComments(f.text)).includes(`process.env.${FORBIDDEN_SECRET_ENV}`),
    ).map((f) => f.rel);
    expect(hits).toEqual([]);
  });

  test("it spawns nothing — argv is world-readable via `ps`", () => {
    // ⚠ The version that decrypted used `decryptInRange`, which spawns
    // `mptool decrypt <ciphertext> <sk> …`. That is the exact exposure the
    // issuer CLI refuses a `--key` flag to avoid.
    // ⚠ Built from the gate's own needle list rather than re-spelled here.
    // Two reasons: one source of truth, and a literal spelling in a test file
    // is itself a secret reference the gate must then flag — which it did.
    for (const needle of SECRET_NEEDLES) expect(code).not.toContain(needle);
  });

  test("it never accepts a key from the request", () => {
    expect(code).not.toMatch(/params\.(key|sk|secret)/);
    expect(code).not.toMatch(/query\.(key|sk|secret)/);
    expect(code).not.toMatch(/headers\.get\(["'`](x-)?(key|sk|secret)/i);
  });

  // ⚠⚠ **THE FALLBACK COPY WAS STALE AND CONTRADICTED THE SAME SITE.** Before an
  // account is picked, `view` is null and the issuer page rendered a default
  // string saying the web process reads the key from its environment — false
  // since the snapshot design, and contradicting `/api/meta`'s
  // `holdsKeys: false` two clicks away. `/api-doc` carried the same sentence.
  // ⚠ **A default rendered only in an empty state is exactly where a stale
  // sentence survives**: nobody screenshots the empty state.
  test("no rendered copy claims THIS process reads the issuer key", () => {
    const hits: string[] = [];
    for (const f of TIER) {
      if (!f.rel.startsWith("web/app/")) continue;
      for (const line of f.text.split("\n")) {
        if (/^\s*(\/\/|\*|\{\/\*)/.test(line)) continue;          // a comment about the defect is not the defect
        if (/(issuer )?key is read from|key from the environment|environment only/i.test(line)) {
          hits.push(`${f.rel}: ${line.trim().slice(0, 110)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test("...and the detector CATCHES the sentence that was actually rendered", () => {
    const bad = '    "The issuer key is read from this process environment and from nowhere else."';
    expect(/(issuer )?key is read from|key from the environment|environment only/i.test(bad)).toBe(true);
  });

  test("the key policy states the absence, not a guard around a presence", () => {
    expect(ISSUER_KEY_POLICY).toMatch(/holds NO issuer key/i);
    // ⚠ Was `/no oracle to authenticate/`. E-241 made the property STRONGER —
    // the tier no longer serves the decryption RESULT either — so the test
    // follows the property rather than the old sentence. Retargeted, not
    // deleted: it still fails if the policy starts describing a guard.
    expect(ISSUER_KEY_POLICY).toMatch(/no request that reaches a decryption and none that returns one/i);
    expect(ISSUER_KEY_POLICY).not.toMatch(/authenticat(e|ed|ion) (the|this) (request|caller|endpoint)/i);
  });

  // ⚠ E-241: the policy must state the WITHHOLDING, because a reader who sees
  // "no key here" may still assume the figure is served.
  test("the key policy says the decrypted figure is NOT served", () => {
    expect(ISSUER_KEY_POLICY).toMatch(/DOES NOT SERVE a decrypted balance/i);
    expect(ISSUER_KEY_POLICY).toMatch(/loopback is not uid-scoped/i);
  });

  test("it names the mirror, never a holder-keyed balance", () => {
    expect(MIRROR_FIELD_LEDGER_NAME).toBe("IssuerEncryptedBalance");
    expect(MIRROR_FIELD_LEDGER_NAME).not.toMatch(/ConfidentialBalance/);
  });

  // ⚠⚠ **THIS TEST FALSE-PASSED, AND IT WAS WRITTEN IN THE ROUND THAT FIXED A
  // FALSE PASS.** `SNAPSHOT_PATH` was a module-level `const`, bound at import
  // time, so setting the env var afterwards did nothing and `await import()`
  // returned the cached module. It read the DEFAULT path — absent in a clean
  // checkout — so `issuerView` said unavailable for that reason and the test
  // passed with the refusal DELETED. **Measured: removing both refusal lines
  // left all 46 tests green.** The path is read lazily now, and the control
  // below is what proves the assertion can fail (`CLAIMS.md` E-215).
  const withSnapshot = (body: unknown, fn: () => void) => {
    const tmp = join(REPO, `web/api/.test-snapshot-${Math.abs(hashOf(JSON.stringify(body)))}.json`);
    writeFileSync(tmp, JSON.stringify(body));
    const prev = process.env.WCONF_ISSUER_SNAPSHOT;
    process.env.WCONF_ISSUER_SNAPSHOT = tmp;
    try { fn(); } finally {
      if (prev === undefined) delete process.env.WCONF_ISSUER_SNAPSHOT;
      else process.env.WCONF_ISSUER_SNAPSHOT = prev;
      rmSync(tmp, { force: true });
    }
  };

  test("CONTROL — a clean snapshot IS read, so the refusal test below can fail", () => {
    // ⚠ Without this the refusal test proves nothing: an unavailable result is
    // the default for a missing file, which is what made it false-pass.
    withSnapshot({ producedAtUnix: 1, entries: { "a/b": { available: true, decrypted: "5" } } }, () => {
      const v = issuerView("a", "b");
      expect(v.available).toBe(true);
      // ⚠ E-241: the snapshot HAS the value; the API reports only that it exists.
      expect(v.decryptable).toBe(true);
    });
  });

  // ⚠⚠ **THE POINT OF E-241, AND THE ONLY TEST THAT FAILS IF IT REGRESSES.**
  // The decrypted figure must never cross this boundary. Loopback is not
  // uid-scoped, so a served value reaches every local user out of a file the
  // producing tool writes `mode 0600` (REVIEW-036 U1, E-228).
  test("the decrypted balance is NEVER served, even when the snapshot has it", () => {
    const secret = "123456789";
    withSnapshot({ producedAtUnix: 1, entries: { "a/b": { available: true, decrypted: secret, publicAmount: "7" } } }, () => {
      const v = issuerView("a", "b");
      expect(v.available).toBe(true);
      expect(v.decryptedWithheld).toBe(true);
      // The figure appears NOWHERE in the serialised response.
      expect(JSON.stringify(v)).not.toContain(secret);
      // ...while the public plaintext amount, which IS public, still does.
      expect(JSON.stringify(v)).toContain("7");
    });
  });

  test("CONTROL — the withholding is not vacuous: an absent value is distinguishable", () => {
    withSnapshot({ producedAtUnix: 1, entries: { "a/b": { available: true, publicAmount: "7" } } }, () => {
      expect(issuerView("a", "b").decryptable).toBe(false);
    });
  });

  test("the snapshot reader REFUSES a file carrying anything key-shaped", () => {
    withSnapshot(
      { producedAtUnix: 1, sk: "deadbeef", entries: { "a/b": { available: true, decrypted: "5" } } },
      () => expect(issuerView("a", "b").available).toBe(false),
    );
  });

  test("...and refuses one naming the secret env var anywhere in it", () => {
    withSnapshot(
      { producedAtUnix: 1, note: `produced with ${FORBIDDEN_SECRET_ENV}`, entries: { "a/b": { available: true, decrypted: "5" } } },
      () => expect(issuerView("a", "b").available).toBe(false),
    );
  });

  test("balances are DECIMAL STRINGS, so a UINT64 above 2^53 survives", () => {
    // ⚠ 18446744073709551615 is UINT64 max; Number() would render it as
    // 18446744073709552000 with no indication anything happened (E-215).
    const big = "18446744073709551615";
    withSnapshot({ producedAtUnix: 1, entries: { "a/b": { available: true, decrypted: big, publicAmount: big } } }, () => {
      const v = issuerView("a", "b");
      // ⚠ `decrypted` is withheld now (E-241), so the UINT64 property is
      // asserted on `publicAmount` — which IS public ledger data and is served.
      expect(v.publicAmount).toBe(big);
      expect(String(Number(big))).not.toBe(big); // the loss this avoids, demonstrated
    });
  });

});

describe("REVIEW-012 condition 2 — the ruled disclosure, before the seed is asked for", () => {
  test("the master-seed disclosure names it a PERMANENT decryption credential", () => {
    expect(MASTER_SEED_DISCLOSURE).toMatch(/permanent decryption credential/i);
  });

  test("it says the protocol has no rotation and no recovery", () => {
    expect(MASTER_SEED_DISCLOSURE).toMatch(/no key rotation and no key recovery|P-10/i);
  });

  test("every derived-from-master-seed row carries it — none may opt out", () => {
    const derived = CAPABILITY_MATRIX.filter((r) => r.profileToken === "derived-from-master-seed");
    expect(derived.length).toBeGreaterThan(0);
    for (const r of derived) expect(r.ruledDisclosure).toBe(MASTER_SEED_DISCLOSURE);
  });

  test("the capability page renders the disclosure, not just the matrix", () => {
    // ⚠ The page body moved into a view both tiers render (ADR-0004).
    const page = readFileSync(join(REPO, "web/app/src/views/CapabilitiesView.tsx"), "utf8");
    expect(page).toMatch(/disclosures\.masterSeed/);
  });
});

describe("issue #10 — the derivation is not a published standard", () => {
  test("the disclosure says a holder with the seed but not this repository cannot reconstruct", () => {
    expect(DERIVATION_NOT_PUBLISHED).toMatch(/cannot reconstruct/i);
    expect(DERIVATION_NOT_PUBLISHED).toMatch(/not a published standard/i);
  });

  test("nothing implies the key is recoverable from the seed alone", () => {
    const hits: string[] = [];
    for (const s of TIER) {
      for (const line of s.text.split("\n")) {
        if (/recoverable from (?:the |your |their )?(?:master )?seed/i.test(line) && !/not |cannot |only if/i.test(line)) {
          hits.push(`${s.rel}: ${line.trim()}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("E-206 — the wallet codec gap is disclosed and is NOT load-bearing", () => {
  test("the gap says it is not the reason a wallet cannot hold a position", () => {
    expect(WALLET_CODEC_GAP).toMatch(/NOT why/i);
  });

  test("the wallet row's three reasons do not mention the codec", () => {
    const wallet = CAPABILITY_MATRIX.find((r) => r.id === "browser-wallet")!;
    expect(wallet.decryptOwnBalance.detail).not.toMatch(/codec/i);
    expect(wallet.proveAndSign.detail).not.toMatch(/codec/i);
  });

  test("the wallet page states the three structural reasons", () => {
    const page = readFileSync(join(REPO, "web/app/src/views/WalletView.tsx"), "utf8");
    expect(page).toMatch(/ElGamal secret/);
    expect(page).toMatch(/derived from the master\s*\n?\s*seed/i);
    expect(page).toMatch(/not to release seed material/i);
  });
});

describe("the custody demo is a simulation on every surface", () => {
  test("the custody page says so before it says anything else", () => {
    const page = readFileSync(join(REPO, "web/app/src/views/CustodyView.tsx"), "utf8");
    const sim = page.indexOf("This is a simulation");
    expect(sim).toBeGreaterThan(-1);
    // Before any finding or flow verdict is rendered. ⚠ The anchor was the
    // capability panel until 2026-10-20, when the page stopped repeating the
    // matrix's custody row; an anchor that is gone would make this pass.
    expect(page.indexOf("Two findings")).toBeGreaterThan(-1);
    expect(sim).toBeLessThan(page.indexOf("Two findings"));
  });

  test("no surface calls it custody-compatible or an integration", () => {
    const hits: string[] = [];
    for (const s of TIER) {
      for (const line of s.text.split("\n")) {
        if (/custody-compatible/i.test(line) && !/exactly that kind of claim|forbid/i.test(line)) hits.push(`${s.rel}: ${line.trim()}`);
        if (/\bHarmonize integration\b/i.test(line) && !/no\b|never/i.test(line)) hits.push(`${s.rel}: ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  test("every surviving flow that decrypts says it needs a standalone ElGamal key", () => {
    // ⚠ The caveat was chosen by a "⚠" inside the reason's text until 2026-10-20,
    // and no test saw it: a wording pass that dropped the mark dropped the caveat.
    const needs = new Set(FLOWS.filter((f) => f.requires.includes("elgamal-decrypt")).map((f) => f.id));
    const surviving = walkFlows().flows.filter((f) => f.survives && needs.has(f.id));
    expect(surviving.length).toBeGreaterThan(0);
    for (const f of surviving) expect(f.caveats.join(" ")).toMatch(/standalone ElGamal key/);
  });

  test("retiring in tranches says each tranche size is public", () => {
    const f = walkFlows().flows.find((x) => x.id === "retire-tranches")!;
    expect(f.caveats.join(" ")).toMatch(/F-24/);
  });

  test("the custody row is marked not built", () => {
    const row = CAPABILITY_MATRIX.find((r) => r.id === "custody-simulated")!;
    expect(row.existsToday.built).toBe(false);
    expect(row.existsToday.where).toMatch(/simulation/i);
  });
});

describe("tapFailHard is this project's shorthand and must not leak outward", () => {
  // ⚠ It escaped into a public upstream filing once (CLAIMS.md E-156). A web UI
  // is the most likely thing yet to leak project vocabulary.
  test("no user-facing string contains it", () => {
    const hits: string[] = [];
    for (const s of TIER) {
      for (const line of s.text.split("\n")) {
        if (!line.includes("tapFailHard")) continue;
        // A comment explaining the hazard is not a leak; a rendered string is.
        const stripped = line.replace(/^\s*(\/\/|\*|\/\*).*$/, "");
        if (stripped.includes("tapFailHard")) hits.push(`${s.rel}: ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("the tier never claims to sign", () => {
  test("meta reports signs:false and holdsKeys:false", () => {
    const server = readFileSync(join(REPO, "web/api/server.ts"), "utf8");
    expect(server).toMatch(/signs:\s*false/);
    expect(server).toMatch(/holdsKeys:\s*false/);
  });
});

describe("ADR-0004: the hosted tier renders the same pages and reaches nothing", () => {
  const SHARED: [string, string][] = [
    ["capabilities", "CapabilitiesView"], ["wallet", "WalletView"], ["custody", "CustodyView"], ["observer", "ObserverReading"],
  ];
  test("each shared page body is rendered by BOTH tiers' routes, so there is one copy of its text", () => {
    for (const [route, view] of SHARED) {
      for (const dir of ["web/app/src/routes", "web/app/src/hosted/routes"]) {
        const src = readFileSync(join(REPO, dir, `${route}.tsx`), "utf8");
        expect(src).toMatch(new RegExp(`import \\{[^}]*\\b${view}\\b[^}]*\\} from "(\\.\\./)+views/${view}"`));
      }
    }
  });

  test("no hosted source imports the local API client, and the only fetch is the verdict file", () => {
    const hosted = TIER.filter((s) => s.rel.startsWith("web/app/src/hosted/"));
    expect(hosted.length).toBeGreaterThan(5);
    for (const s of hosted) {
      expect(s.text).not.toMatch(/from "(\.\.\/)+api"/);
      for (const m of s.text.matchAll(/fetch\(\s*([^,)]+)/g)) expect(m[1].trim()).toBe('"/gate-verdict.json"');
    }
  });
});
