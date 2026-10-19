/**
 * B-16 KAT generator — the hedged ed25519 nonce, written from `REVIEW-024` §3's
 * prose by a SECOND implementation.
 *
 * ⚠ **This exists because a signer checked only against itself proves nothing.**
 * It is the same pattern `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`
 * and `tools/wconf-randomness.ts` follow: the ruling is normative prose, and the
 * check on the Rust is a byte-for-byte agreement with an implementation written
 * from that prose in another language, against another curve library
 * (`@noble/curves@1.9.7`), by someone who is not `ed25519-dalek`.
 *
 * ⚠ **Nothing here calls `ed25519.sign`.** That would only re-derive RFC 8032,
 * which is the arm that is NOT the point. The scalar arithmetic below is written
 * out against RFC 8032 §5.1.6 with `q` substituted for the nonce prefix, exactly
 * as the ruling specifies. `nobleAgreesWithUsOnUnmaskedRfc8032` is the control:
 * with the mask omitted, this construction must reproduce `ed25519.sign` byte
 * for byte, and if it does not then the harness is wrong rather than the signer.
 *
 * ⚠ **NO NETWORK. Nothing here is submitted anywhere and no `r` or `ρ` blinding
 * factor is derived** — this is a signing nonce, a different site with a
 * different ruling. See `tools/check-blinding-sources.ts`.
 *
 * Run:  bun run tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts
 * Emits: tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json
 */
import { ed25519 } from "@noble/curves/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { writeFileSync } from "node:fs";

const Point = (ed25519 as any).Point;
const L: bigint = Point.Fn.ORDER;

/** `REVIEW-024` §3, normative: 28 printable bytes and a trailing NUL. */
const DST = new Uint8Array([...Buffer.from("WCONF/ed25519-nonce-hedge/v1", "ascii"), 0x00]);
if (DST.length !== 29) throw new Error(`DST must be 29 bytes, got ${DST.length}`);

const cat = (...xs: Uint8Array[]) => {
  const out = new Uint8Array(xs.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of xs) { out.set(x, o); o += x.length; }
  return out;
};
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex").toUpperCase();
const unhex = (s: string) => new Uint8Array(Buffer.from(s, "hex"));

/** Little-endian bytes → bigint. RFC 8032 is little-endian throughout. */
const leToInt = (b: Uint8Array) => {
  let n = 0n;
  for (let i = b.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(b[i]!);
  return n;
};
const intToLe32 = (n: bigint) => {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) { out[i] = Number(n & 0xffn); n >>= 8n; }
  return out;
};

/** RFC 8032 §5.1.5 step 1's clamp, written out rather than imported. */
const clamp = (h32: Uint8Array) => {
  const c = new Uint8Array(h32);
  c[0]! &= 248;
  c[31]! &= 127;
  c[31]! |= 64;
  return c;
};

/**
 * The XRPL ed25519 derivation: the private key is `SHA512Half(entropy)`.
 * `signer/src/xrpl.rs::ed25519_from_entropy`, and pinned independently by
 * `tests/xrpl_vectors.rs` against `ripple-keypairs@2.0.0`.
 */
const skFromEntropy = (entropy: Uint8Array) => sha512(entropy).slice(0, 32);

/**
 * `REVIEW-024` §3, in full. `aux === null` means the mask is not applied, which
 * is both the deterministic vector arm and where a reported entropy failure
 * lands.
 */
function hedgedSign(sk: Uint8Array, message: Uint8Array, aux: Uint8Array | null) {
  const h = sha512(sk);                                  // h := H(sk)
  const a = leToInt(clamp(h.slice(0, 32))) % L;          // a := clamp(h[0..32])
  const p = h.slice(32, 64);                             // p := h[32..64]
  const A = Point.BASE.multiply(a).toBytes();            // A := encode(a·B)

  let q = new Uint8Array(p);
  if (aux !== null) {
    const mask = sha512(cat(DST, aux));                  // H(DST ‖ aux)
    for (let i = 0; i < 32; i++) q[i]! ^= mask[i]!;      // q := p XOR mask[0..32]
  }

  const r = leToInt(sha512(cat(q, message))) % L;        // r := reduce(H(q ‖ M))
  const R = Point.BASE.multiply(r).toBytes();            // R := encode(r·B)
  const k = leToInt(sha512(cat(R, A, message))) % L;     // k := reduce(H(R ‖ A ‖ M))
  const s = (r + ((k * a) % L)) % L;                     // s := r + k·a  (mod ℓ)

  return { publicKey: A, signature: cat(R, intToLe32(s)), q, R };
}

/**
 * ⚠ **The control, and it runs BEFORE any vector is emitted.**
 *
 * With no mask, this construction must be byte-identical to `@noble/curves`'
 * own `ed25519.sign` — a third implementation again. If it is not, the scalar
 * arithmetic above is wrong and every vector it emits would pin that error into
 * the Rust suite. This project has shipped a fabricated expected value once
 * (`CLAIMS.md` E-72); a generator that cannot check itself is how.
 */
function nobleAgreesWithUsOnUnmaskedRfc8032() {
  let checked = 0;
  for (let i = 0; i < 8; i++) {
    const sk = sha512(new Uint8Array([i])).slice(0, 32);
    const msg = new Uint8Array([0x53, 0x54, 0x58, 0x00, i, i + 1, i + 2]);
    const ours = hedgedSign(sk, msg, null);
    const theirs = (ed25519 as any).sign(msg, sk);
    const pub = (ed25519 as any).getPublicKey(sk);
    if (hex(ours.signature) !== hex(theirs)) {
      throw new Error(`unmasked arm disagrees with @noble ed25519.sign at i=${i}:\n  ours   ${hex(ours.signature)}\n  noble  ${hex(theirs)}`);
    }
    if (hex(ours.publicKey) !== hex(pub)) {
      throw new Error(`public key disagrees with @noble at i=${i}`);
    }
    checked++;
  }
  console.log(`  control: ${checked}/8 unmasked signatures byte-identical to @noble/curves ed25519.sign`);
}

// ---------------------------------------------------------------------------

console.log("B-16 hedged ed25519 nonce — KAT generator (REVIEW-024 §3)\n");
console.log(`  DST: ${hex(DST)}  (${DST.length} bytes)`);
nobleAgreesWithUsOnUnmaskedRfc8032();

/**
 * The cases. Each is chosen to pin something a wrong implementation gets wrong:
 * a zero aux (must be MASKED, not a fallback), two auxes over one message
 * (distinct R), one aux over two messages (message separation), and an empty
 * message (the mask must not be standing in for the message in the preimage).
 */
const ENTROPY = unhex("07070707070707070707070707070707"); // tests/hedged_signing.rs's key
const PROBE = unhex("5354580012005821000000022200000000");

const cases: Array<{ name: string; entropy: string; aux: string | null; message: string }> = [
  { name: "no-mask — must be byte-identical RFC 8032", entropy: hex(ENTROPY), aux: null, message: hex(PROBE) },
  { name: "aux = 32 zero bytes — a SUCCESSFUL draw, so HEDGED", entropy: hex(ENTROPY), aux: "00".repeat(32), message: hex(PROBE) },
  { name: "aux = 32 x 0x01", entropy: hex(ENTROPY), aux: "01".repeat(32), message: hex(PROBE) },
  { name: "aux = 0x00..0x1f, ascending", entropy: hex(ENTROPY), aux: [...Array(32).keys()].map((i) => i.toString(16).padStart(2, "0")).join(""), message: hex(PROBE) },
  { name: "same aux, different message — message separation", entropy: hex(ENTROPY), aux: "01".repeat(32), message: hex(unhex("5354580012005821000000032200000000")) },
  { name: "same aux, EMPTY message", entropy: hex(ENTROPY), aux: "01".repeat(32), message: "" },
  { name: "a second key, no mask", entropy: "000102030405060708090A0B0C0D0E0F", aux: null, message: hex(PROBE) },
  { name: "a second key, aux = 0xFF x 32", entropy: "000102030405060708090A0B0C0D0E0F", aux: "ff".repeat(32), message: hex(PROBE) },
];

const vectors = cases.map((c) => {
  const sk = skFromEntropy(unhex(c.entropy));
  const out = hedgedSign(sk, unhex(c.message), c.aux === null ? null : unhex(c.aux));
  return {
    name: c.name,
    entropy: c.entropy.toUpperCase(),
    aux: c.aux === null ? null : c.aux.toUpperCase(),
    message: c.message.toUpperCase(),
    public_key: hex(out.publicKey),
    nonce_prefix_q: hex(out.q),
    R: hex(out.R),
    signature: hex(out.signature),
  };
});

// Two assertions the generator makes about its OWN output, so a broken
// generator cannot emit a self-consistent-looking file.
const byMsg = vectors.filter((v) => v.aux === "01".repeat(32).toUpperCase() && v.entropy === hex(ENTROPY));
if (byMsg.length < 2) throw new Error("message-separation pair missing");
if (byMsg[0]!.R === byMsg[1]!.R) throw new Error("one aux over two messages produced the same R — the message left the nonce preimage");
const zero = vectors.find((v) => v.aux === "00".repeat(32).toUpperCase())!;
const none = vectors.find((v) => v.aux === null && v.entropy === hex(ENTROPY))!;
if (zero.signature === none.signature) throw new Error("aux = 32 zero bytes reproduced the unmasked arm — the mask is not being applied");

const path = "tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json";
writeFileSync(path, JSON.stringify({
  generated_by: "tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts",
  ruling: "docs/reviews/REVIEW-024-RULING-ed25519-nonce-2026-08-27.md",
  independent_of: "ed25519-dalek — written from the ruling's prose against @noble/curves@1.9.7",
  dst_hex: hex(DST),
  vectors,
}, null, 2) + "\n");

console.log(`\n  ${vectors.length} vectors -> ${path}`);
for (const v of vectors) console.log(`    ${v.signature.slice(0, 24)}…  ${v.name}`);
console.log("\nPASS. The generator agrees with a third implementation on the unmasked arm.");
