/**
 * t2-independent.ts — REVIEW-005a's test T-2, run for real.
 *
 * T-2 requires a second implementation, in a different language, WRITTEN FROM
 * THE RULING'S PROSE AND NOT FROM THE PYTHON. It is the only test in the ruling
 * that can fail because the SPECIFICATION is unclear rather than because code is
 * wrong, and the packet's own deliverable — "two independent implementers
 * produce the same nonces" — is evidenced by nothing else.
 *
 * This file was written from §1.2–§1.6 of REVIEW-005a alone. `cmpt_nonce_ref.py`
 * was not read. Only the vector INPUTS were taken from cmpt_nonce_vectors.py.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { createHash, createHmac } from "node:crypto";

const sha256 = (b: Uint8Array) => new Uint8Array(createHash("sha256").update(b).digest());
const sha512 = (b: Uint8Array) => new Uint8Array(createHash("sha512").update(b).digest());
const hmac512 = (k: Uint8Array, m: Uint8Array) => new Uint8Array(createHmac("sha512", k).update(m).digest());
const cat = (...a: Uint8Array[]) => { const n = a.reduce((s, x) => s + x.length, 0); const o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const ascii = (s: string) => new TextEncoder().encode(s);

// --- §1.2 primitives and constants ----------------------------------------
const q = secp256k1.CURVE.n;
const LABEL = ascii("CMPT-NONCE");                 // 10 bytes
const VERSION = Uint8Array.from([0x01]);
const SALT = sha256(cat(LABEL, VERSION));          // 32 bytes, fixed and public
const AUX_TAG = ascii("CMPT-NONCE/v1/aux");        // 17 bytes

const u8 = (n: number) => Uint8Array.from([n & 0xff]);
const u16be = (n: number) => Uint8Array.from([(n >> 8) & 0xff, n & 0xff]);
const u32be = (n: number) => Uint8Array.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const scalar32 = (x: bigint) => { const o = new Uint8Array(32); let v = x; for (let i = 31; i >= 0; i--) { o[i] = Number(v & 0xffn); v >>= 8n; } return o; };
const intBE = (b: Uint8Array) => { let v = 0n; for (const x of b) v = (v << 8n) | BigInt(x); return v; };

/** TH(tag, msg) := SHA-512( SHA-256(tag) ‖ SHA-256(tag) ‖ msg ) */
const TH = (tag: Uint8Array, msg: Uint8Array) => { const t = sha256(tag); return sha512(cat(t, t, msg)); };

// --- §1.3 FS_PREFIX --------------------------------------------------------
const KIND_POINT = 0x01, KIND_OPAQUE = 0x02;
function fsPrefix(elems: [number, Uint8Array][]): Uint8Array {
  const parts: Uint8Array[] = [u16be(elems.length)];
  for (const [kind, bytes] of elems) parts.push(u8(kind), u32be(bytes.length), bytes);
  return cat(...parts);
}

// --- §1.4 + §1.5 -----------------------------------------------------------
const SLOT_PLAIN = 0x00, SLOT_MASKED = 0x01;
function deriveNonces(ptid: number, domain: string, fs: Uint8Array,
                      slots: [number, bigint][], labels: string[], aux: Uint8Array): bigint[] {
  if (aux.length !== 32) throw new Error("aux must be exactly 32 bytes");
  const dom = ascii(domain);
  const K = slots.length;

  const parts: Uint8Array[] = [LABEL, VERSION, u8(ptid), u32be(dom.length), dom, u32be(fs.length), fs, u8(K)];
  for (let j = 0; j < K; j++) {
    const [kind, value] = slots[j];
    if (kind === SLOT_MASKED) {
      if (value <= 0n || value >= q) throw new Error("sk must be in [1,q)");
      const mask = TH(AUX_TAG, aux).slice(0, 32);
      const sk = scalar32(value);
      const skStar = new Uint8Array(32);
      for (let i = 0; i < 32; i++) skStar[i] = sk[i] ^ mask[i];
      parts.push(u8(j), u8(kind), skStar);
    } else {
      parts.push(u8(j), u8(kind), scalar32(value));
    }
  }
  const IKM = cat(...parts);
  const PRK = hmac512(SALT, IKM);                       // HKDF-Extract

  const out: bigint[] = [];
  for (let j = 0; j < K; j++) {
    const lab = ascii(labels[j]);
    const info = cat(LABEL, VERSION, u8(ptid), u8(0x6e), u8(j), u8(lab.length), lab);
    const okm = hmac512(PRK, cat(info, u8(0x01)));      // HKDF-Expand, L = 64 = one block
    const a = intBE(okm) % q;
    if (a === 0n) throw new Error("alpha == 0, abort");
    out.push(a);
  }
  return out;
}

// --- vector inputs, taken from cmpt_nonce_vectors.py ----------------------
const pub = (k: bigint) => secp256k1.Point.BASE.multiply(k).toRawBytes(true);
const sk_A = 0x7n, sk_R = 0xBn, sk_I = 0xDn, sk_iss = 0x11n;
const m = 1234567n;
const r = 0x2b1f8c0d9e4a5713c8f60b2d3a94e7561fb08c2d7e93a4150c6b8d2f3e5a7091n;
const b = 98765432100n;
const rho = 0x0c9d3a7e15b284f6039e7c1d5a8b3f240761c9e83d5a2b4f108e6c3d97a5b201n;
const P1 = pub(sk_A), P2 = pub(sk_R), P3 = pub(sk_I), PA = P1;
const C1 = pub(r), C2_1 = pub(0x21n), C2_2 = pub(0x22n), C2_3 = pub(0x23n);
const PCm = pub(0x31n), PCb = pub(0x32n), B1 = pub(0x41n), B2 = pub(0x42n);
const mG = pub(m), Piss = pub(sk_iss);
const TXCTX_A = Uint8Array.from(Buffer.from("a1".repeat(32), "hex"));
const TXCTX_B = Uint8Array.from(Buffer.from("a1".repeat(31) + "a0", "hex"));
const AUX_ZERO = new Uint8Array(32);
const AUX_ONE = Uint8Array.from(Buffer.from("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f", "hex"));

const sendPrefix = (tx: Uint8Array) => fsPrefix([[KIND_POINT,P1],[KIND_POINT,P2],[KIND_POINT,P3],[KIND_POINT,PA],[KIND_POINT,C1],
  [KIND_POINT,C2_1],[KIND_POINT,C2_2],[KIND_POINT,C2_3],[KIND_POINT,PCm],[KIND_POINT,PCb],[KIND_POINT,B1],[KIND_POINT,B2],[KIND_OPAQUE,tx]]);
const cbPrefix = fsPrefix([[KIND_POINT,PA],[KIND_POINT,B1],[KIND_POINT,B2],[KIND_POINT,PCb],[KIND_OPAQUE,TXCTX_A]]);
const clawPrefix = fsPrefix([[KIND_POINT,Piss],[KIND_POINT,C1],[KIND_POINT,C2_1],[KIND_POINT,mG],[KIND_OPAQUE,TXCTX_A]]);

const L_SEND = ["send/alpha_m","send/alpha_r","send/alpha_b","send/alpha_rho","send/alpha_sk"];
const L_CB = ["convertback/t_b","convertback/t_rho","convertback/t_sk"];
const L_CLAW = ["clawback/t_sk"];

const send = (aux: Uint8Array, tx = TXCTX_A) => deriveNonces(0x01, "CMPT_SEND_SIGMA", sendPrefix(tx),
  [[SLOT_PLAIN,m],[SLOT_PLAIN,r],[SLOT_PLAIN,b],[SLOT_PLAIN,rho],[SLOT_MASKED,sk_A]], L_SEND, aux);
const cb = (aux: Uint8Array) => deriveNonces(0x02, "CMPT_CONVERTBACK_SIGMA", cbPrefix,
  [[SLOT_PLAIN,b],[SLOT_PLAIN,rho],[SLOT_MASKED,sk_A]], L_CB, aux);
const claw = (aux: Uint8Array) => deriveNonces(0x03, "CMPT_CLAWBACK_SIGMA", clawPrefix, [[SLOT_MASKED,sk_iss]], L_CLAW, aux);

// --- compare against Appendix A -------------------------------------------
const hx = (v: bigint) => v.toString(16).padStart(64, "0");
const EXPECTED: Record<string, string[]> = {
  "V1 Send aux=0": ["a9bcaa51f8003d53175334d3acb8eb7e2c7ed5fa9b4f41452c80bfe02385668e","240e4be931f35e78696b1d1b024a22707ae875b170d00beca6ecf9b50394184c","14b28a5d6a729e770aa8702566b786958faeafa22a965a265511a32502458a51","0353a1a92b16795f375e3e6c33319adfcfa3cf5bb62826ef3b2c4b14b86bc319","d0f5579962bfda138d1ccad641922d3886cf912d9f16936d957ce808d8daac65"],
  "V2 Send aux=1": ["05c38c4c4bb91ed1c9b503252054cb5909100293deeaf5979eb9edee80d6395e","9c9295f439a701da16a1975225e12436291c18f2d7440b9803a15e5bc6e8071b","b7528f60682ef62fd87b93037e2b2e7df8c0f84efa30f9e09594bad5997cf6ad","e936140870098f913fbcb3a428bf56246f387c8d098cde6842b67aacccb1f535","255b28c2d975c512de82f86c31bac6ef2f861abe7798d1627da1ee1bad935bf8"],
  "V3 Send txctxB": ["a0ac26845d0799cefda95c70ecca5ee4f531cef59444f987b545c397e2105de1","9fb1336dcc4b648ffa807d1caa4826e873d1f040cc4c6ab2e4e8c8370771f9b0","6944c728be5e4852b4213551763928e1751a9c3c7058af368b105fc2749f168b","14fcafd334ca1ab11f3229678453833335294faf17fdab7b22de61f721303653","b41cd14ee4e703100d9f6359d3fe8740922840aed12cfd72cb9b4e7c78f9e7e8"],
  "V4 ConvertBack": ["f6fef2b389216aa84468f2180343939252e07990f8b22cc5168f7b54de9a15b4","400c115093003bbb3efec193a69b056ff48a21df090645a7cff5503d90d816b7","60a5b83fb38d52ea389ebd6eec164823e7e8b9077ef171ebb2517c13a6c56321"],
  "V5 Clawback": ["8d2b054d2cc7d12a57cc4214ee8d95e3ca11e27b04bc7f3f6ae0d755407b45ce"],
};

console.log(`SALT   ${Buffer.from(SALT).toString("hex")}`);
console.log(`  ruling states 374e013f8714020a88570fb12d7af8b4c3e1d915b5fd2e13226d9274a993f332`);
console.log(`  MATCH: ${Buffer.from(SALT).toString("hex") === "374e013f8714020a88570fb12d7af8b4c3e1d915b5fd2e13226d9274a993f332"}\n`);
console.log(`FS_PREFIX lengths — send ${sendPrefix(TXCTX_A).length} (ruling: 495), convertback ${cbPrefix.length} (191), clawback ${clawPrefix.length} (191)\n`);

const got: Record<string, bigint[]> = {
  "V1 Send aux=0": send(AUX_ZERO), "V2 Send aux=1": send(AUX_ONE), "V3 Send txctxB": send(AUX_ZERO, TXCTX_B),
  "V4 ConvertBack": cb(AUX_ZERO), "V5 Clawback": claw(AUX_ZERO),
};
let pass = 0, fail = 0;
for (const [name, exp] of Object.entries(EXPECTED)) {
  const mine = got[name].map(hx);
  const ok = mine.length === exp.length && mine.every((v, i) => v === exp[i]);
  console.log(`${ok ? "MATCH" : "MISMATCH"}  ${name}`);
  if (!ok) mine.forEach((v, i) => { if (v !== exp[i]) console.log(`    [${i}] mine ${v}\n         them ${exp[i]}`); });
  ok ? pass++ : fail++;
}
console.log(`\nT-2 RESULT: ${pass} vectors reproduced, ${fail} failed`);
console.log(fail === 0
  ? "The specification is reproducible from its prose alone. T-2 PASSES."
  : "The specification did NOT reproduce from prose alone — an ambiguity exists. T-2 FAILS.");
