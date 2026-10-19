/**
 * t-keygen-construction.ts
 *
 * The test REVIEW-012-RULING-keygen-2026-08-18.md section 7 condition 5 requires:
 * a derivation KAT distinct from mpt-crypto's interop vectors.
 *
 * WHAT THIS IS NOT. It does not generate a key for any real holder, and it does
 * not implement keygen for the signer. ADR-0001's prohibition on writing ElGamal
 * keygen code applied until the ruling landed; this is the ruling's own test
 * harness over fixed published vectors, which is the thing the ruling asks for.
 *
 * WHY TWO IMPLEMENTATIONS. The ruling's vectors must be reproducible from its
 * PROSE, not from one code path. `deriveRaw` calls HMAC-SHA-512 twice, straight
 * from the written construction. `deriveHkdf` goes through @noble's hkdf().
 * They must agree; if a future edit breaks one, the disagreement is the alarm.
 *
 *   bun tools/spike-keygen-2026-08-18/t-keygen-construction.ts
 *
 * Exits non-zero on any failure.
 */
import { hmac } from "@noble/hashes/hmac";
import { hkdf } from "@noble/hashes/hkdf";
import { sha512 } from "@noble/hashes/sha512";
import { secp256k1 } from "@noble/curves/secp256k1";
import { decodeSeed, decodeAccountID, encodeSeed } from "ripple-address-codec";
import { deriveKeypair, deriveAddress } from "ripple-keypairs";

// ---------------------------------------------------------------- constants

const LABEL = "WCONF-ELGAMAL-KEYGEN-v1";
const SALT = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt";
const EXPAND = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand";
const ROLE = "secp256k1-scalar";
const N = secp256k1.CURVE.n;

// ---------------------------------------------------------------- helpers

const enc = (s: string) => new TextEncoder().encode(s);
const hex = (b: Uint8Array) =>
  Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
const u32be = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
};
const cat = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((a, x) => a + x.length, 0));
  let o = 0;
  for (const x of p) { out.set(x, o); o += x.length; }
  return out;
};

// ---------------------------------------------------------------- preimage

/** Rejects everything the ruling section 2.1 says to reject, before hashing. */
function preimage(familySeed: string, expectedAccountId?: string) {
  const d = decodeSeed(familySeed);
  const seed = Uint8Array.from(d.bytes);
  const type = String(d.type);
  if (seed.length !== 16) throw new Error(`seed entropy is ${seed.length} bytes, must be 16`);
  if (type !== "secp256k1" && type !== "ed25519") throw new Error(`unknown seed type "${type}"`);
  const acct = Uint8Array.from(
    decodeAccountID(deriveAddress(deriveKeypair(familySeed).publicKey)),
  );
  if (acct.length !== 20) throw new Error(`account id is ${acct.length} bytes, must be 20`);
  if (expectedAccountId && hex(acct) !== expectedAccountId.toUpperCase())
    throw new Error(`account id mismatch: derived ${hex(acct)}, expected ${expectedAccountId}`);

  const IKM = cat(
    enc(LABEL),
    u32be(type.length), enc(type),
    u32be(16), seed,
    u32be(20), acct,
  );
  const INFO = cat(enc(EXPAND), u32be(ROLE.length), enc(ROLE));
  return { seed, type, acct, IKM, INFO };
}

/** The reduction. Total by construction — see ruling section 2.3. */
function reduce(OKM: Uint8Array): bigint {
  return (BigInt("0x" + hex(OKM)) % (N - 1n)) + 1n;
}

/** Implementation 1 — raw HMAC, written from the ruling's prose. */
function deriveRaw(familySeed: string, expectedAccountId?: string) {
  const { type, acct, IKM, INFO } = preimage(familySeed, expectedAccountId);
  const PRK = hmac(sha512, enc(SALT), IKM);
  const OKM = hmac(sha512, PRK, cat(INFO, new Uint8Array([0x01])));
  const sk = reduce(OKM);
  return {
    type, accountId: hex(acct), ikmLen: IKM.length,
    PRK: hex(PRK), OKM: hex(OKM), skInt: sk,
    sk: sk.toString(16).padStart(64, "0").toUpperCase(),
    pk: hex(secp256k1.getPublicKey(sk, true)),
  };
}

/** Implementation 2 — the same spec through a different library path. */
function deriveHkdf(familySeed: string) {
  const { IKM, INFO } = preimage(familySeed);
  const OKM = hkdf(sha512, IKM, enc(SALT), INFO, 64);
  const sk = reduce(OKM);
  return {
    OKM: hex(OKM), sk: sk.toString(16).padStart(64, "0").toUpperCase(),
    pk: hex(secp256k1.getPublicKey(sk, true)),
  };
}

// ---------------------------------------------------------------- vectors

/** Verbatim from REVIEW-012-RULING-keygen-2026-08-18.md section 6. */
const VECTORS = [
  {
    name: "V1 secp256k1",
    familySeed: "sp6JdwovBCsiwnMhXuvZGZtPUoGVj",
    seedType: "secp256k1",
    accountId: "7F0BBA382512C0A00A1630506AE44EBE8AC20D27",
    ikmLen: 80,
    PRK: "8A26F1B7BFC755769AEADFA7D0A45A0D023036928C6E628639AA88DB15FEFBFAEEE1BC77E72F36D553DE22DF9D4773E0A82694949FD2C30840883BE51744F2BA",
    OKM: "DCAA926637AEBD02488FBE27C6DD7DE96BF97329FFA70F496A50AFD25F3CB34CC784161154F3DA9CCB996D4012005C4D01D92A8758FC9D012C1DB48AEB1615E3",
    sk: "D1CE6CB547E3010BEE0DE614330D745A2ADE751C8BD16A66962616EFE7453964",
    pk: "02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246",
  },
  {
    name: "V2 ed25519",
    familySeed: "sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n",
    seedType: "ed25519",
    accountId: "A8683DC013F856ACCDD629E0730E9FBB707D0D1B",
    ikmLen: 78,
    PRK: "81055659C9DEF2D99E78D7AFFACBADF6A0121800CA707DF25B987E4539EFA34C15D36DD41BC9A30DCDE537B41D8795AB72A8704717334E33CE914B9E3725394C",
    OKM: "2D6B093FFF62DECFE39223786E68B329C73C252FB82A8895E1099391149254F73FFD650EF16813BA78F25E9012A1E1F094246D7ADCCA25576219F2E53E6A13E9",
    sk: "601AF0DF8C25B04441802E2E6A5B69D93AD56343CA6556885A2B0F75CBE295EA",
    pk: "02763AF7208A6D7557F638D5959CD65C6BA0C3BF320A84CCA36E4A55E7B099877B",
  },
] as const;

// ---------------------------------------------------------------- harness

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const throws = (name: string, fn: () => unknown) => {
  try { fn(); ok(name, false, "expected a throw, got none"); }
  catch { ok(name, true); }
};

console.log("T-1  known-answer vectors");
for (const v of VECTORS) {
  const g = deriveRaw(v.familySeed, v.accountId);
  ok(`${v.name} seed type`, g.type === v.seedType, `got ${g.type}`);
  ok(`${v.name} account_id`, g.accountId === v.accountId, `got ${g.accountId}`);
  ok(`${v.name} IKM length`, g.ikmLen === v.ikmLen, `got ${g.ikmLen}`);
  ok(`${v.name} PRK`, g.PRK === v.PRK, `got ${g.PRK}`);
  ok(`${v.name} OKM64`, g.OKM === v.OKM, `got ${g.OKM}`);
  ok(`${v.name} sk_A`, g.sk === v.sk, `got ${g.sk}`);
  ok(`${v.name} pk_A`, g.pk === v.pk, `got ${g.pk}`);
}

console.log("\nT-2  the two implementations agree");
for (const v of VECTORS) {
  const a = deriveRaw(v.familySeed), b = deriveHkdf(v.familySeed);
  ok(`${v.name} raw-HMAC == noble-hkdf`,
    a.OKM === b.OKM && a.sk === b.sk && a.pk === b.pk);
}

console.log("\nT-3  the scalar is always in range, and the reduction is total");
for (const v of VECTORS) {
  const g = deriveRaw(v.familySeed);
  ok(`${v.name} 1 <= sk_A < n`, g.skInt >= 1n && g.skInt < N);
}
ok("OKM = 0^64 yields sk_A = 1, not an abort", reduce(new Uint8Array(64)) === 1n);
ok("OKM = 0xFF..FF stays in range", (() => {
  const s = reduce(new Uint8Array(64).fill(0xff));
  return s >= 1n && s < N;
})());

console.log("\nT-4  separation — the same entropy under two seed types must diverge");
{
  const e = Buffer.from("000102030405060708090A0B0C0D0E0F", "hex");
  const s1 = encodeSeed(e, "secp256k1"), s2 = encodeSeed(e, "ed25519");
  ok("family seeds encode as the published vectors",
    s1 === VECTORS[0].familySeed && s2 === VECTORS[1].familySeed, `got ${s1} / ${s2}`);
  const a = deriveRaw(s1), b = deriveRaw(s2);
  ok("same entropy, different seed type -> different account", a.accountId !== b.accountId);
  ok("same entropy, different seed type -> different sk_A", a.sk !== b.sk);
  ok("same entropy, different seed type -> different pk_A", a.pk !== b.pk);
}

console.log("\nT-5  every framing element is load-bearing");
{
  // Re-derive V1 with one element altered at a time; each must change OKM64.
  const { seed, type, acct } = preimage(VECTORS[0].familySeed);
  const base = (label: string, salt: string, expand: string, role: string,
                t: string, a: Uint8Array) => {
    const IKM = cat(enc(label), u32be(t.length), enc(t), u32be(16), seed, u32be(20), a);
    const PRK = hmac(sha512, enc(salt), IKM);
    const INFO = cat(enc(expand), u32be(role.length), enc(role));
    return hex(hmac(sha512, PRK, cat(INFO, new Uint8Array([0x01]))));
  };
  const ref = base(LABEL, SALT, EXPAND, ROLE, type, acct);
  ok("reference reproduces V1 OKM64", ref === VECTORS[0].OKM);
  ok("changing LABEL changes OKM64", base(LABEL + "x", SALT, EXPAND, ROLE, type, acct) !== ref);
  ok("changing SALT changes OKM64", base(LABEL, SALT + "x", EXPAND, ROLE, type, acct) !== ref);
  ok("changing EXPAND changes OKM64", base(LABEL, SALT, EXPAND + "x", ROLE, type, acct) !== ref);
  ok("changing ROLE changes OKM64", base(LABEL, SALT, EXPAND, ROLE + "x", type, acct) !== ref);
  ok("changing seed_type changes OKM64", base(LABEL, SALT, EXPAND, ROLE, "ed25519", acct) !== ref);
  ok("changing account_id changes OKM64",
    base(LABEL, SALT, EXPAND, ROLE, type, Uint8Array.from(acct).fill(0, 0, 1)) !== ref);
}

console.log("\nT-6  malformed input is refused before any derivation");
throws("a seed whose account_id does not match is refused",
  () => deriveRaw(VECTORS[0].familySeed, VECTORS[1].accountId));
throws("a non-seed string is refused", () => deriveRaw("not-a-seed"));
throws("an AccountID-shaped string is not a seed",
  () => deriveRaw("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
