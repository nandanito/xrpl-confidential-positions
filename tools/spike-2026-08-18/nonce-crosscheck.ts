#!/usr/bin/env bun
/**
 * T-1 / cross-verification harness for the W-CONF nonce patch.
 *
 * No network. Everything here is local and self-verifying, and it runs before
 * anything is submitted to Devnet — a tecBAD_PROOF is an expensive way to
 * learn that the transcript moved.
 *
 * The decisive check is #1. Our patched prover generates a proof; the
 * PRISTINE upstream library at 85dbac7 (tag 1.0.4) verifies it. If it accepts,
 * the Fiat-Shamir challenge bytes are unchanged despite the refactor that made
 * the prover feed those same bytes to the nonce KDF. That is the transcript
 * split in REVIEW-005b section 1.1, tested rather than asserted.
 *
 * WHY A 1.0.4 VERIFIER SAYS ANYTHING ABOUT RIPPLED, stated with its evidence
 * because the second review round flagged this as an unsupported assertion:
 * rippled 3.3.0 ships mpt-crypto 0.4.0-rc4 (CLAIMS.md E-14), not 1.0.4. But
 * `git diff 0.4.0-rc4 1.0.4 -- src/ include/` is EMPTY — the five commits
 * between the two tags touch only CI scripts, workflows and CMake. The library
 * sources are byte-identical, so a 1.0.4 verifier and rippled's 0.4.0-rc4
 * verifier are the same code. vendor-verify.sh asserts this rather than
 * leaving it as a claim in a comment.
 *
 * Checks 2 and 3 are the pair that shows the nonces are actually OURS: ours are
 * reproducible, upstream's are not, and the same harness sees both.
 */

const PATCHED = "/tmp/wconf/mptool-patched";
const PRISTINE = "/tmp/wconf/mptool-pristine";
const DETERMINISTIC = "/tmp/wconf/mptool-deterministic"; // -DWCONF_HEDGE=0 arm

function run(bin: string, ...args: string[]): string[] {
  const p = Bun.spawnSync([bin, ...args]);
  if (p.exitCode !== 0)
    throw new Error(`${bin} ${args[0]} failed: ${p.stderr.toString()}`);
  return p.stdout.toString().trim().split("\n");
}

const patched = (...a: string[]) => run(PATCHED, ...a);
const pristine = (...a: string[]) => run(PRISTINE, ...a);
const upstream_verify = (args: string[]) => pristine(...args)[0];
const deterministic = (...a: string[]) => run(DETERMINISTIC, ...a);

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? "  " + detail : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? "  " + detail : ""}`);
  }
}

console.log("W-CONF nonce patch — local cross-verification");
console.log("patched  =", PATCHED);
console.log("pristine =", PRISTINE, "(upstream 85dbac7, unmodified)\n");

// ---------------------------------------------------------------------------
// Fixtures. Keys come from mpt_generate_keypair — no ElGamal keygen is written
// here, per the standing prohibition on ADR-0001 section (e)'s unruled half.
// ---------------------------------------------------------------------------
const [SK_A, PK_A] = patched("keygen");
const [, PK_B] = patched("keygen");
const [, PK_I] = patched("keygen");

const amount = 25n;
const balance = 500n;

const [r32] = patched("blinding");
const [rho] = patched("blinding");
const [ctA] = patched("encrypt", String(amount), PK_A, r32);
const [ctB] = patched("encrypt", String(amount), PK_B, r32);
const [ctI] = patched("encrypt", String(amount), PK_I, r32);
const [pcM] = patched("pedersen", String(amount), r32);
const [pcB] = patched("pedersen", String(balance), rho);
const [balCt] = patched("encrypt", String(balance), PK_A, rho);

// A transaction context. The 20-byte account ids and 24-hex issuance id are
// arbitrary here; only the resulting 32-byte hash matters to the transcript.
const ACC = "a1".repeat(20);
const DST = "b2".repeat(20);
const ISS = "00".repeat(4) + "cc".repeat(20);
const [ctxh] = patched("send-ctx", ACC, ISS, "42", DST, "7");
// A second context differing only in Sequence — this is precisely the
// resubmission case REVIEW-005c section 1 is about.
const [ctxh2] = patched("send-ctx", ACC, ISS, "43", DST, "7");

const proofArgs = (h: string) => [
  "send-proof", SK_A, PK_A, String(amount), r32, h, pcM,
  pcB, String(balance), balCt, rho, "3",
  PK_A, ctA, PK_B, ctB, PK_I, ctI,
];
const verifyArgs = (h: string, proof: string) => [
  "verify-send", proof, balCt, pcM, pcB, h, "3",
  PK_A, ctA, PK_B, ctB, PK_I, ctI,
];

// ---------------------------------------------------------------------------
// 1. THE DECISIVE ONE. Patched prover -> pristine upstream verifier.
// ---------------------------------------------------------------------------
console.log("1. transcript compatibility");
const [proofOurs] = patched(...proofArgs(ctxh));
const upstreamVerdict = pristine(...verifyArgs(ctxh, proofOurs))[0];
check(
  "pristine upstream 85dbac7 verifier accepts our proof",
  upstreamVerdict === "OK",
  `verdict=${upstreamVerdict} proof=${proofOurs.length / 2}B`,
);

const [proofUpstream] = pristine(...proofArgs(ctxh));
check(
  "our verifier accepts an upstream proof (no one-way drift)",
  patched(...verifyArgs(ctxh, proofUpstream))[0] === "OK",
);

// ---------------------------------------------------------------------------
// 2. The nonces are ours: identical inputs must give an identical SIGMA proof.
//    Upstream cannot do this — its Extract salt is 32 bytes of RAND_bytes.
//
//    SCOPE, and it is a real limit, not a caveat. The 946-byte blob is
//    192 bytes of compact sigma proof followed by a 754-byte aggregated
//    Bulletproof. This patch replaced the SIGMA nonces. The Bulletproof draws
//    its own randomness through generate_random_scalar() — eight call sites in
//    bulletproof_aggregated.c — and is untouched here. So the sigma prefix is
//    reproducible and the tail is not, which is exactly what the assertions
//    below pin down. REVIEW-005c section 6 already owns that gap: r, rho and
//    the Bulletproof randomness are unowned and want their own review packet.
// ---------------------------------------------------------------------------
const SIGMA_HEX = 192 * 2; // SECP256K1_COMPACT_STANDARD_PROOF_SIZE
const sigma = (p: string) => p.slice(0, SIGMA_HEX);
const bp = (p: string) => p.slice(SIGMA_HEX);

console.log("\n2. whose nonces are these? (issue #1 ruled hedged, so read this carefully)");
const [again] = patched(...proofArgs(ctxh));
check(
  "DEFAULT build does NOT reproduce — it is hedged, as ruled",
  sigma(proofOurs) !== sigma(again),
  "one entropy draw per proof; T-9 counts it",
);
// Reproducibility is what shows the derivation is ours rather than upstream's,
// and the hedged default deliberately gives that up. The deterministic arm is
// kept precisely so the property remains demonstrable.
const [det1] = deterministic(...proofArgs(ctxh));
const [det2] = deterministic(...proofArgs(ctxh));
check(
  "deterministic arm (-DWCONF_HEDGE=0) reproduces byte-identically",
  sigma(det1) === sigma(det2),
  "this is what shows the KDF is ours, not upstream's",
);
check(
  "and the deterministic arm's proof also verifies upstream",
  upstream_verify(verifyArgs(ctxh, det1)) === "OK",
);
check(
  "hedged and deterministic arms differ (the mask reaches the output)",
  sigma(proofOurs) !== sigma(det1),
);
check(
  "Bulletproof tail differs on the deterministic arm too — NOT covered by this patch",
  bp(det1) !== bp(det2),
  "REVIEW-005c section 6, unowned randomness",
);

const [up1] = pristine(...proofArgs(ctxh));
const [up2] = pristine(...proofArgs(ctxh));
check(
  "upstream sigma over the same inputs -> DIFFERENT (control)",
  sigma(up1) !== sigma(up2),
  "confirms the harness can tell reproducible from not",
);

// ---------------------------------------------------------------------------
// 3. Context binding. This is the defect REVIEW-005c section 1 found: the
//    ADR sketch derived nonces over the statement, which excludes
//    TransactionContextID, so a resubmission at a changed Sequence reused
//    commitments under a new challenge. Ours must move with the context.
// ---------------------------------------------------------------------------
console.log("\n3. TransactionContextID is bound into the nonce, not just the challenge");
const [proofSeq43] = patched(...proofArgs(ctxh2));
check("context hash changes with Sequence", ctxh !== ctxh2);
check(
  "a Sequence-only change gives a different sigma proof",
  sigma(proofOurs) !== sigma(proofSeq43),
);

// The commitments are what leak sk_A when reused. In the compact form they are
// not transmitted, but z = nonce + e*witness is: if two proofs shared nonces
// under distinct challenges, sk_A falls out by subtraction. Distinct z values
// across a context change are the observable form of "the nonces moved".
const zOurs = sigma(proofOurs).slice(64);
const zSeq43 = sigma(proofSeq43).slice(64);
check(
  "every sigma response differs across the context change",
  zOurs !== zSeq43,
);
check(
  "the two proofs verify under their own contexts and not each other's",
  patched(...verifyArgs(ctxh, proofOurs))[0] === "OK" &&
    patched(...verifyArgs(ctxh2, proofSeq43))[0] === "OK" &&
    patched(...verifyArgs(ctxh2, proofOurs))[0] === "FAIL",
);

// ---------------------------------------------------------------------------
// 4. n=4 — the auditor case. THIS IS A TRANSCRIPT-COMPATIBILITY CHECK, and it
//    exists because adversarial review caught the claim without it.
//
//    Everything above runs at n=3. WCONF-PATCH.md claimed the compatibility
//    checks covered "n=3 and n=4", but the only n=4 evidence was a nonce-KDF
//    vector over opaque bytes in t1-vectors.ts — which cannot detect a
//    statement-serialisation bug that only affects n=4, because the KDF never
//    sees a real statement. The Codex leg named that gap on 2026-08-18. This
//    closes it: a fourth participant, proved by us, verified by the pristine
//    upstream library.
// ---------------------------------------------------------------------------
console.log("\n4. n=4 transcript compatibility (the auditor shape)");
const [, PK_AUD] = patched("keygen");
const [ctAud] = patched("encrypt", String(amount), PK_AUD, r32);

const proofArgs4 = (h: string) => [
  "send-proof", SK_A, PK_A, String(amount), r32, h, pcM,
  pcB, String(balance), balCt, rho, "4",
  PK_A, ctA, PK_B, ctB, PK_I, ctI, PK_AUD, ctAud,
];
const verifyArgs4 = (h: string, proof: string) => [
  "verify-send", proof, balCt, pcM, pcB, h, "4",
  PK_A, ctA, PK_B, ctB, PK_I, ctI, PK_AUD, ctAud,
];

const [proofN4] = patched(...proofArgs4(ctxh));
check(
  "pristine upstream 85dbac7 verifier accepts our n=4 proof",
  upstream_verify(verifyArgs4(ctxh, proofN4)) === "OK",
  `proof=${proofN4.length / 2}B`,
);
check(
  "n=4 sigma proof reproduces on the deterministic arm",
  sigma(deterministic(...proofArgs4(ctxh))[0]) ===
    sigma(deterministic(...proofArgs4(ctxh))[0]),
);
check(
  "n=4 and n=3 sigma proofs differ (statement length is framed)",
  sigma(proofN4) !== sigma(proofOurs),
);

// ---------------------------------------------------------------------------
// 5. Witness binding — a different amount must move the nonces.
// ---------------------------------------------------------------------------
console.log("\n5. witness binding");
const [ctA2] = patched("encrypt", "26", PK_A, r32);
const [ctB2] = patched("encrypt", "26", PK_B, r32);
const [ctI2] = patched("encrypt", "26", PK_I, r32);
const [pcM2] = patched("pedersen", "26", r32);
const [proofAmt26] = patched(
  "send-proof", SK_A, PK_A, "26", r32, ctxh, pcM2,
  pcB, String(balance), balCt, rho, "3",
  PK_A, ctA2, PK_B, ctB2, PK_I, ctI2,
);
check(
  "a different amount gives a different sigma proof",
  sigma(proofOurs) !== sigma(proofAmt26),
);
check(
  "and it verifies upstream",
  pristine(
    "verify-send", proofAmt26, balCt, pcM2, pcB, ctxh, "3",
    PK_A, ctA2, PK_B, ctB2, PK_I, ctI2,
  )[0] === "OK",
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
