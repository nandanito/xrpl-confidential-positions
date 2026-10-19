#!/usr/bin/env bun
/**
 * T-1 known-answer vectors for wconf_generate_nonces, and an INDEPENDENT
 * reimplementation that has to reproduce them.
 *
 * This closes REVIEW-005b section 6.1 items 1 and 4, which leg B could not
 * produce because it was blocked on the exact Fiat-Shamir serialisation and
 * correctly declined to guess. That serialisation now exists in code, so the
 * vectors can be generated.
 *
 * The method is the one REVIEW-005c section 5 credits for leg A's T-2: the
 * TypeScript below was written from the CONSTRUCTION as specified in the block
 * comment of mpt_internal.h, not by reading the C control flow. If the two
 * agree on every vector, the specification reproduces from its own prose.
 *
 * SCOPE, stated plainly. These vectors pin the NONCE DERIVATION: given a
 * transcript, what nonces come out. They do not pin the transcript itself —
 * that is what tools/spike-2026-08-18/nonce-crosscheck.ts tests, by having the
 * pristine upstream verifier accept our proof. The two together are what the
 * ruling asked for; neither alone is.
 *
 * Consequently the `stmt` fields below are opaque byte strings. The KDF treats
 * them as opaque, so a structured test pattern is exactly as good a
 * known-answer input as a real serialised statement would be, and it keeps the
 * vectors reproducible from this file alone.
 *
 *   bun tools/spike-2026-08-18/t1-vectors.ts          check against vectors.json
 *   bun tools/spike-2026-08-18/t1-vectors.ts --write  regenerate vectors.json
 */
import { createHmac } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";

const KAT = "/tmp/wconf/wconf-kat";
const VECTORS = new URL("./t1-vectors.json", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Independent implementation, from the specification.
//
//   IKM   = "WCONF-NONCE-v1"
//        || u32be(k)
//        || u32be(domain_len)  || domain
//        || u32be(witness_len) || witness'
//        || u32be(stmt_len)    || stmt
//        || u32be(ctx_len)     || context_id       (ctx_len = 0 if absent)
//   PRK   = HMAC-SHA512(SALT, IKM)
//   T(i)  = HMAC-SHA512(PRK, T(i-1) || domain || i)     T(0) empty, i from 1
//   n_i   = T(i) interpreted big-endian, reduced mod the secp256k1 order
//   abort if any n_i is zero; never retry
//
// Hedged variant: witness'[sk_offset .. +32] = witness[...] XOR
//   HMAC-SHA512(SALT, "WCONF-NONCE-v1/aux" || aux)[0..32]
// ---------------------------------------------------------------------------
const LABEL = Buffer.from("WCONF-NONCE-v1");
const SALT = Buffer.from("WCONF-NONCE-v1/HKDF-Extract-salt");
const AUX_TAG = Buffer.from("WCONF-NONCE-v1/aux");
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

const u32be = (v: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(v);
  return b;
};
const hmac512 = (key: Buffer, ...parts: Buffer[]) => {
  const h = createHmac("sha512", key);
  for (const p of parts) h.update(p);
  return h.digest();
};

function deriveNonces(
  k: number,
  witness: Buffer,
  domain: string,
  stmt: Buffer,
  ctx: Buffer | null,
  aux: Buffer | null = null,
  skOffset = 0,
): string[] {
  if (k < 1 || k > 8) throw new Error("k out of range");
  if (witness.length === 0 || witness.length % 32 !== 0)
    throw new Error("witness must be a whole number of 32-byte scalars");

  const dom = Buffer.from(domain, "ascii");

  let w = witness;
  if (aux) {
    const mask = hmac512(SALT, AUX_TAG, aux).subarray(0, 32);
    w = Buffer.from(witness);
    for (let i = 0; i < 32; i++) w[skOffset + i] ^= mask[i];
  }

  const prk = hmac512(
    SALT,
    LABEL,
    u32be(k),
    u32be(dom.length), dom,
    u32be(w.length), w,
    u32be(stmt.length), stmt,
    u32be(ctx ? 32 : 0), ctx ?? Buffer.alloc(0),
  );

  const out: string[] = [];
  let prev = Buffer.alloc(0);
  for (let i = 1; i <= k; i++) {
    const block = hmac512(prk, prev, dom, Buffer.from([i]));
    const wide = BigInt("0x" + block.toString("hex"));
    const n = wide % N;
    if (n === 0n) throw new Error("derived nonce is zero — abort, never retry");
    out.push(n.toString(16).padStart(64, "0"));
    prev = block;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The vectors.
// ---------------------------------------------------------------------------
const pat = (byte: number, len: number) =>
  Buffer.alloc(len, byte).toString("hex");
const seq = (len: number) =>
  Buffer.from(Array.from({ length: len }, (_, i) => i & 0xff)).toString("hex");

type Vec = {
  name: string; k: number; witness: string; domain: string;
  stmt: string; ctx: string | null; aux?: string; skOffset?: number;
  note: string;
};

const vectors: Vec[] = [
  {
    name: "send/n=3, five nonces, context bound",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(396), // 2n+6 = 12 compressed points at n=3
    ctx: pat(0xcd, 32),
    note: "the shape ConfidentialMPTSend actually uses",
  },
  {
    name: "send/n=3, context differing in one byte",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(396),
    ctx: pat(0xcd, 31) + "ce",
    note: "every nonce must differ from the vector above — this is the resequencing case",
  },
  {
    name: "send/n=4, longer statement",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(462), // 2n+6 = 14 points at n=4
    ctx: pat(0xcd, 32),
    note: "statement length is framed, so n=3 and n=4 cannot collide",
  },
  {
    name: "pok_sk, single nonce",
    k: 1,
    witness: pat(0xa5, 32),
    domain: "CMPT_POK_SK_REGISTER",
    stmt: seq(33),
    ctx: pat(0x01, 32),
    note: "registration proof",
  },
  {
    name: "pok_sk, no context (the NULL caller-error surface)",
    k: 1,
    witness: pat(0xa5, 32),
    domain: "CMPT_POK_SK_REGISTER",
    stmt: seq(33),
    ctx: null,
    note: "must differ from the vector above; upstream documents context_id as optional and a NULL caller gets the extraction bug, so the two cases must not collide",
  },
  {
    name: "clawback, zero-amount sentinel in the statement",
    k: 1,
    witness: pat(0x77, 32),
    domain: "CMPT_CLAWBACK_SIGMA",
    stmt: seq(99) + "00".repeat(33),
    ctx: pat(0x02, 32),
    note: "REVIEW-005c section 5: m*G for m=0 is 33 zero bytes, a deliberate sentinel. Mirrored, never re-derived",
  },
  {
    name: "convertback, three nonces, witness order (b, rho, sk_A)",
    k: 3,
    witness: pat(0x0b, 32) + pat(0x40, 32) + pat(0x5a, 32),
    domain: "CMPT_CONVERTBACK_SIGMA",
    stmt: seq(132),
    ctx: pat(0x03, 32),
    note: "witness order verified against upstream 85dbac7, matching REVIEW-005c C-1",
  },
  {
    name: "domain separation: same inputs, different domain",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_CLAWBACK_SIGMA",
    stmt: seq(396),
    ctx: pat(0xcd, 32),
    note: "must differ from vector 1 in every nonce",
  },
  {
    name: "count separation: same inputs, k=4 instead of 5",
    k: 4,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(396),
    ctx: pat(0xcd, 32),
    note: "k is in the preimage, so a k=4 prefix must not match the k=5 one",
  },
  {
    name: "hedged (issue #1, leg A): aux masks sk_A at offset 0",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(396),
    ctx: pat(0xcd, 32),
    aux: pat(0xee, 32),
    skOffset: 0,
    note: "the one branch the open decision controls; must differ from vector 1",
  },
  {
    name: "hedged convertback: mask at sk_offset=64, NOT 0",
    k: 3,
    witness: pat(0x0b, 32) + pat(0x40, 32) + pat(0x5a, 32),
    domain: "CMPT_CONVERTBACK_SIGMA",
    stmt: seq(132),
    ctx: pat(0x03, 32),
    aux: pat(0xee, 32),
    skOffset: 64,
    note: "ConvertBack's witness order is (b, rho, sk_A), so its long-lived secret is at offset 64. This pins the KDF's HANDLING of a non-zero offset. It does NOT catch a prover that passes the wrong offset — these vectors call wconf-kat, not the ConvertBack prover, so a regression from 64 to 0 at the call site would still pass here. That call site is asserted at source level by vendor-verify.sh instead; the two checks together cover what neither does alone",
  },
  {
    name: "hedged convertback: same aux masked at offset 0 instead",
    k: 3,
    witness: pat(0x0b, 32) + pat(0x40, 32) + pat(0x5a, 32),
    domain: "CMPT_CONVERTBACK_SIGMA",
    stmt: seq(132),
    ctx: pat(0x03, 32),
    aux: pat(0xee, 32),
    skOffset: 0,
    note: "the regression this guards against — must differ from the offset=64 vector in every nonce",
  },
  {
    name: "hedged with all-zero aux",
    k: 5,
    witness: pat(0x11, 32) + pat(0x22, 32) + pat(0x33, 32) + pat(0x44, 32) + pat(0x55, 32),
    domain: "CMPT_SEND_SIGMA",
    stmt: seq(396),
    ctx: pat(0xcd, 32),
    aux: "00".repeat(32),
    skOffset: 0,
    note: "a dead RNG returning zeros still yields a well-formed, unpredictable mask because aux is tagged-hashed before use — it does NOT degrade to vector 1, it degrades to a fixed alternative",
  },
];

// ---------------------------------------------------------------------------
function fromC(v: Vec): string[] {
  const args = [
    String(v.k), v.witness, v.domain, v.stmt, v.ctx ?? "-",
    // sk_offset is only meaningful with aux, and the C only reads it then.
    ...(v.aux ? [v.aux, String(v.skOffset ?? 0)] : []),
  ];
  const p = Bun.spawnSync([KAT, ...args]);
  if (p.exitCode !== 0)
    throw new Error(`wconf-kat failed: ${p.stderr.toString()}`);
  return p.stdout.toString().trim().split("\n");
}

function fromTS(v: Vec): string[] {
  return deriveNonces(
    v.k,
    Buffer.from(v.witness, "hex"),
    v.domain,
    Buffer.from(v.stmt, "hex"),
    v.ctx ? Buffer.from(v.ctx, "hex") : null,
    v.aux ? Buffer.from(v.aux, "hex") : null,
    v.skOffset ?? 0,
  );
}

const write = process.argv.includes("--write");
let pass = 0, fail = 0;
const generated: Record<string, string[]> = {};

console.log("T-1 known-answer vectors — wconf_generate_nonces\n");
console.log("  C   = the patched mpt-crypto at 85dbac7 (wconf-kat)");
console.log("  TS  = independent implementation, written from the spec prose\n");

for (const v of vectors) {
  const c = fromC(v);
  const ts = fromTS(v);
  const agree = c.length === ts.length && c.every((x, i) => x === ts[i]);
  generated[v.name] = c;
  if (agree) { pass++; console.log(`  PASS  ${v.name}`); }
  else {
    fail++;
    console.log(`  FAIL  ${v.name}`);
    console.log(`        C : ${c[0]}`);
    console.log(`        TS: ${ts[0]}`);
  }
}

// Cross-vector distinctness — the separation properties, asserted not assumed.
console.log("\nseparation properties");
const g = (n: string) => generated[vectors.find(v => v.name.startsWith(n))!.name];
const distinct = (a: string[], b: string[]) => !a.some(x => b.includes(x));
const pairs: [string, string, string][] = [
  ["send/n=3, five", "send/n=3, context differing", "context binding"],
  ["send/n=3, five", "send/n=4", "statement length framing"],
  ["send/n=3, five", "domain separation", "per-proof-type domain separation"],
  ["send/n=3, five", "count separation", "count separation"],
  ["send/n=3, five", "hedged (issue #1", "the hedge flag actually changes the output"],
  ["hedged (issue #1", "hedged with all-zero", "aux value reaches the output"],
  ["pok_sk, single", "pok_sk, no context", "NULL context does not collide with a real one"],
  ["hedged convertback: mask at sk_offset=64", "hedged convertback: same aux masked at offset 0",
   "sk_offset reaches the KDF output (the PROVER's argument is checked by vendor-verify.sh, not here)"],
];
for (const [a, b, why] of pairs) {
  const ok = distinct(g(a), g(b));
  if (ok) { pass++; console.log(`  PASS  ${why}`); }
  else { fail++; console.log(`  FAIL  ${why}`); }
}

if (write) {
  writeFileSync(VECTORS, JSON.stringify(
    { generator: "tools/spike-2026-08-18/t1-vectors.ts", mptCryptoCommit: "85dbac7", vectors, expected: generated },
    null, 2) + "\n");
  console.log(`\nwrote ${VECTORS}`);
} else if (existsSync(VECTORS)) {
  const saved = JSON.parse(readFileSync(VECTORS, "utf8")).expected;
  let drift = 0;
  for (const [name, exp] of Object.entries(saved as Record<string, string[]>)) {
    const got = generated[name];
    if (!got || got.join() !== exp.join()) { drift++; console.log(`  FAIL  committed vector drifted: ${name}`); }
  }
  if (drift === 0) { pass++; console.log(`\n  PASS  all committed vectors reproduce`); }
  else fail += drift;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
