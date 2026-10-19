#!/usr/bin/env bun
/**
 * REVIEW-010 deliverable C.
 *
 * Known-answer and separation test for the ruled W-CONF derivation of the
 * ElGamal randomness `r` and the Pedersen balance blinding `rho`.
 *
 * This is intentionally a KDF test, not a signer test. No production signer
 * implementation exists in this repository yet, so there is nothing honest to
 * link against. The future signer must reproduce these vectors byte-for-byte.
 *
 *   bun tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts
 */
import { createHmac } from "node:crypto";

const LABEL = Buffer.from("WCONF-RANDOM-SCALAR-v1", "ascii");
const SALT = Buffer.from("WCONF-RANDOM-SCALAR-v1/HKDF-Extract-salt", "ascii");
const EXPAND = Buffer.from("WCONF-RANDOM-SCALAR-v1/HKDF-Expand", "ascii");
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

type Vec = {
  name: string;
  txType: "ConfidentialMPTConvert" | "ConfidentialMPTSend" | "ConfidentialMPTConvertBack";
  role: "elgamal-r" | "balance-rho";
  account: Buffer;
  issuance: Buffer;
  context: Buffer;
  entropy: Buffer;
  expected: string;
};

const u32be = (v: number) => {
  if (!Number.isSafeInteger(v) || v < 0 || v > 0xffffffff) throw new Error(`u32 out of range: ${v}`);
  const b = Buffer.alloc(4);
  b.writeUInt32BE(v);
  return b;
};

const hmac512 = (key: Buffer, ...parts: Buffer[]) => {
  const h = createHmac("sha512", key);
  for (const p of parts) h.update(p);
  return h.digest();
};

const seq = (len: number) => Buffer.from(Array.from({ length: len }, (_, i) => i & 0xff));
const pat = (byte: number, len: number) => Buffer.alloc(len, byte);

function reduceWideToScalar(okm64: Buffer): string {
  if (okm64.length !== 64) throw new Error(`OKM must be 64 bytes, got ${okm64.length}`);
  const v = BigInt(`0x${okm64.toString("hex")}`) % N;
  if (v === 0n) throw new Error("derived scalar is zero; abort, never retry");
  return v.toString(16).padStart(64, "0").toUpperCase();
}

function deriveScalar(v: Omit<Vec, "name" | "expected">): string {
  const txType = Buffer.from(v.txType, "ascii");
  const role = Buffer.from(v.role, "ascii");
  if (v.account.length !== 20) throw new Error(`account_id must be 20 bytes, got ${v.account.length}`);
  if (v.issuance.length !== 24) throw new Error(`mpt_issuance_id must be 24 bytes, got ${v.issuance.length}`);
  if (v.context.length !== 32) throw new Error(`TransactionContextID must be 32 bytes, got ${v.context.length}`);
  if (v.entropy.length !== 64) throw new Error(`entropy64 must be 64 bytes, got ${v.entropy.length}`);

  const ikm = Buffer.concat([
    LABEL,
    u32be(txType.length), txType,
    u32be(v.account.length), v.account,
    u32be(v.issuance.length), v.issuance,
    u32be(v.context.length), v.context,
    u32be(v.entropy.length), v.entropy,
  ]);
  const prk = hmac512(SALT, ikm);
  const info = Buffer.concat([
    EXPAND,
    u32be(txType.length), txType,
    u32be(role.length), role,
  ]);
  const okm = hmac512(prk, info, Buffer.from([0x01]));
  return reduceWideToScalar(okm);
}

const base = {
  txType: "ConfidentialMPTSend" as const,
  account: seq(20),
  issuance: pat(0x42, 24),
  context: pat(0xa1, 32),
  entropy: seq(64),
};

const vectors: Vec[] = [
  {
    name: "send r",
    ...base,
    role: "elgamal-r",
    expected: "3D1F32A8397999734FAE3068DD3C5BB595760441812DCA2C59F7623637C0E574",
  },
  {
    name: "send rho",
    ...base,
    role: "balance-rho",
    expected: "410444D77C876FCF0A76B23B6C29424DC8ADC90FCD68D7B1D665272387A9EEDD",
  },
  {
    name: "send r, one context byte changed",
    ...base,
    role: "elgamal-r",
    context: Buffer.concat([pat(0xa1, 31), Buffer.from([0xa0])]),
    expected: "7A9299AFE6FE3A556D636224EE0605D199904734D83DA95BD7746B33B8AC6484",
  },
  {
    name: "send r, one entropy byte changed",
    ...base,
    role: "elgamal-r",
    entropy: Buffer.concat([seq(63), Buffer.from([0xbf])]),
    expected: "542839218E14ED94DC81534DBBA1D6C78A3A12D6CE31B68912588D810E3A5291",
  },
  {
    name: "convert r, same account/issuance/context/entropy",
    ...base,
    txType: "ConfidentialMPTConvert",
    role: "elgamal-r",
    expected: "6F37E0F43B07E14DEF5BB775C8D8EF5CDE9ED1D632F26138E389C2E8109F833F",
  },
  {
    name: "convertback r, same account/issuance/context/entropy",
    ...base,
    txType: "ConfidentialMPTConvertBack",
    role: "elgamal-r",
    expected: "95A2F938AD598E70FC9E964AF5EBF429D70FBAB9A1BC0CE4D16B302C587527F1",
  },
  {
    name: "convertback rho, same account/issuance/context/entropy",
    ...base,
    txType: "ConfidentialMPTConvertBack",
    role: "balance-rho",
    expected: "96C5FCD8098C37E44AB1DC38FBB0520CB6356F28BE5A20137B106C0E59EF8CCC",
  },
  {
    name: "send r, different account",
    ...base,
    role: "elgamal-r",
    account: pat(0x19, 20),
    expected: "2A72A3A127B28E1E8CBAE32AF3DAA945E04670322A38C8A490B83F8331DC9730",
  },
  {
    name: "send r, different issuance",
    ...base,
    role: "elgamal-r",
    issuance: pat(0x43, 24),
    expected: "D113B7211EE89D09CA4A6AE58A6521C16BEF9BD3E4DE8E96171D3FF1AEE62D79",
  },
];

let failed = 0;
for (const v of vectors) {
  const got = deriveScalar(v);
  const ok = got === v.expected;
  console.log(`${ok ? "MATCH" : "MISMATCH"}  ${v.name}`);
  if (!ok) {
    console.log(`  got      ${got}`);
    console.log(`  expected ${v.expected}`);
    failed++;
  }
}

function expectThrows(name: string, f: () => unknown) {
  try {
    f();
    console.log(`MISMATCH  ${name}: did not throw`);
    failed++;
  } catch {
    console.log(`MATCH     ${name}: threw`);
  }
}

expectThrows("zero scalar abort path", () => reduceWideToScalar(Buffer.alloc(64)));
expectThrows("reject short entropy", () => deriveScalar({ ...base, role: "elgamal-r", entropy: seq(63) }));
expectThrows("reject missing TransactionContextID bytes", () => deriveScalar({ ...base, role: "elgamal-r", context: Buffer.alloc(0) }));
expectThrows("reject malformed account id", () => deriveScalar({ ...base, role: "elgamal-r", account: seq(19) }));
expectThrows("reject malformed issuance id", () => deriveScalar({ ...base, role: "elgamal-r", issuance: seq(23) }));

// Separation must be checked over DERIVED output, not over the hardcoded
// fixtures. The original form mapped `v.expected`, so it tested that the
// fixture strings differ from each other -- which they trivially do -- and
// would have reported "all vector outputs differ" even if deriveScalar
// collapsed two domains onto one scalar. Found by adversarial review
// (Gemini leg, 2026-08-18); see REVIEW-011c section 6.
const allOutputs = vectors.map((v) => deriveScalar(v));
if (new Set(allOutputs).size !== allOutputs.length) {
  console.log("MISMATCH  separation: at least two vectors collide");
  failed++;
} else {
  console.log("MATCH     separation: all derived outputs differ");
}

if (failed !== 0) {
  console.log(`\nT-r/rho RESULT: ${failed} failure(s)`);
  process.exit(1);
}
console.log(`\nT-r/rho RESULT: ${vectors.length} vectors and 6 structural checks passed`);
