/**
 * wconf-keygen.ts — the ruled ElGamal derivation, for TypeScript callers.
 *
 * # Why this file exists
 *
 * `REVIEW-012-RULING-keygen-2026-08-18.md` §2 rules how a holder's ElGamal
 * secret is derived from their XRPL master seed, and
 * `docs/reviews/REVIEW-012c` adjudicated it. The construction lives in that
 * ruling and **only** there; this is an *implementation* of its prose, and
 * where the two disagree **the ruling wins**.
 *
 * Before 2026-08-25 there were two byte-identical copies of it in `tools/` —
 * one in `spike-step6-2026-08-20/devnet-derived-key.ts`, one in
 * `spike-step7-2026-08-24/devnet-convert-back.ts` — and architecture §6 step 7
 * was about to add a third. `REVIEW-005c`'s lesson is that a second copy of a
 * construction is a divergence waiting to happen; a third is that lesson
 * ignored twice. This is the single copy those callers now import.
 *
 * # ⚠ What the independence that matters actually is
 *
 * The cross-check that makes the Devnet drivers evidence is **TypeScript
 * against Rust**, mediated by a validated ledger entry: `signer/src/keygen.rs`
 * derives the key the account registers, and a driver derives it again here
 * and compares. Collapsing three identical TypeScript copies into one does not
 * weaken that, because they never differed. What it removes is three places
 * for a future edit to land in two of.
 *
 * ⚠ `tools/spike-keygen-2026-08-18/t-keygen-construction.ts` stays the KAT and
 * stays independent — it runs the construction through **two** library paths
 * (raw HMAC and @noble's `hkdf`) precisely so the vectors are reproducible from
 * the prose rather than from one code path. **A KAT that imported the thing it
 * tests would be worthless**, so it does not import this and this does not
 * import it.
 *
 * # The self-check, and why it is not decoration
 *
 * Like `wconf-randomness.ts`, this **reproduces the ruling's published vectors
 * before it will derive anything** — including the `PRK` and `OKM`
 * intermediates, so a divergence is located rather than merely detected. A
 * caller that gets a key from this module has already been told the module
 * agrees with §6 of the ruling.
 *
 * # ⚠ The reduction is TOTAL and has NO abort path
 *
 * Unlike the sigma-nonce and `r`/`ρ` rulings, which both say *abort on zero,
 * never retry*. That is correct there, where the input is fresh entropy and an
 * abort costs one transaction. **Keygen's input is a fixed seed**, so an abort
 * would be permanent — that holder could never participate. `(OKM mod (n−1)) +
 * 1` cannot yield zero and cannot yield `n`. Do not "fix" it back.
 *
 * # ⚠ What deriving buys, and what it does not
 *
 * A derived key is reconstructible from the master seed **under this
 * derivation**, which is the only thing deriving buys. It is not "recoverable"
 * in any wider sense: XLS-0096 has no rotation and no recovery (`CLAIMS.md`
 * P-10), and the derivation is **not a published standard** (issue #10), so a
 * holder who has their seed and not this repository cannot reconstruct their
 * key. Those are two sentences about two layers and merging them is
 * `CLAIMS.md` E-125 and E-126.
 *
 *   bun tools/wconf-keygen.ts        # runs the self-check and prints the result
 */
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { secp256k1 } from "@noble/curves/secp256k1";
import { decodeSeed, decodeAccountID } from "ripple-address-codec";
import { deriveKeypair, deriveAddress } from "ripple-keypairs";

const LABEL = "WCONF-ELGAMAL-KEYGEN-v1";
const SALT = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt";
const EXPAND = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand";
const ROLE = "secp256k1-scalar";
const N = secp256k1.CURVE.n;

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

export interface DerivedElGamalKey {
  /** 32-byte scalar, uppercase hex. */
  sk: string;
  /** 33-byte compressed point, uppercase hex — what `HolderEncryptionKey` carries. */
  pk: string;
  /** The account the seed belongs to, classic address. */
  address: string;
  /** 20-byte AccountID, uppercase hex. */
  accountId: string;
  /** `secp256k1` or `ed25519` — the XRPL seed type, part of the preimage. */
  seedType: string;
}

/** Everything ruling §2.1 says to reject, rejected before anything is hashed. */
function preimage(familySeed: string) {
  const d = decodeSeed(familySeed);
  const seed = Uint8Array.from(d.bytes);
  const seedType = String(d.type);
  if (seed.length !== 16) throw new Error(`seed entropy is ${seed.length} bytes, must be 16`);
  if (seedType !== "secp256k1" && seedType !== "ed25519") {
    throw new Error(`unknown seed type "${seedType}"`);
  }
  const address = deriveAddress(deriveKeypair(familySeed).publicKey);
  const acct = Uint8Array.from(decodeAccountID(address));
  if (acct.length !== 20) throw new Error(`account id is ${acct.length} bytes, must be 20`);

  const IKM = cat(
    enc(LABEL),
    u32be(seedType.length), enc(seedType),
    u32be(16), seed,
    u32be(20), acct,
  );
  const INFO = cat(enc(EXPAND), u32be(ROLE.length), enc(ROLE));
  return { seedType, address, acct, IKM, INFO };
}

/** Ruling §2.3. Total: the output is in `[1, n−1]` for every input. */
function reduce(OKM: Uint8Array): bigint {
  return (BigInt("0x" + hex(OKM)) % (N - 1n)) + 1n;
}

function deriveRaw(familySeed: string) {
  const { seedType, address, acct, IKM, INFO } = preimage(familySeed);
  const PRK = hmac(sha512, enc(SALT), IKM);
  const OKM = hmac(sha512, PRK, cat(INFO, new Uint8Array([0x01])));
  const sk = reduce(OKM);
  return {
    seedType,
    address,
    accountId: hex(acct),
    ikmLen: IKM.length,
    PRK: hex(PRK),
    OKM: hex(OKM),
    sk: sk.toString(16).padStart(64, "0").toUpperCase(),
    pk: hex(secp256k1.getPublicKey(sk, true)),
  };
}

// ---------------------------------------------------------------------------
// The self-check. Nothing below derives anything until this has passed.
// ---------------------------------------------------------------------------

/** Verbatim from `REVIEW-012-RULING-keygen-2026-08-18.md` §6. */
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

function selfCheck(): void {
  for (const v of VECTORS) {
    const got = deriveRaw(v.familySeed);
    // Every intermediate, not just the answer: a mismatch in the PRK and a
    // mismatch in the reduction are different defects and deserve to be
    // distinguishable without a debugger.
    const fields: [string, string | number, string | number][] = [
      ["seedType", got.seedType, v.seedType],
      ["accountId", got.accountId, v.accountId],
      ["ikmLen", got.ikmLen, v.ikmLen],
      ["PRK", got.PRK, v.PRK],
      ["OKM", got.OKM, v.OKM],
      ["sk", got.sk, v.sk],
      ["pk", got.pk, v.pk],
    ];
    for (const [field, actual, expected] of fields) {
      if (actual !== expected) {
        throw new Error(
          `wconf-keygen: KAT FAILED on ${v.name}, field ${field}.\n` +
          `  got      ${actual}\n  expected ${expected}\n` +
          `This implementation has diverged from REVIEW-012's §6 vectors. Nothing is derived.`,
        );
      }
    }
  }
  // The reduction's claim is that it is TOTAL — that is the property the
  // ruling relies on and the one a later session is most likely to "fix". An
  // all-zero OKM and an all-ones OKM are its two edges, and both must land in
  // [1, n-1] rather than throwing.
  for (const [name, okm] of [
    ["all-zero OKM", new Uint8Array(64)],
    ["all-ones OKM", new Uint8Array(64).fill(0xff)],
  ] as const) {
    const v = reduce(okm);
    if (v < 1n || v >= N) {
      throw new Error(`wconf-keygen: the reduction is not total — ${name} produced ${v}`);
    }
  }
}

let checked = false;
function ensureChecked(): void {
  if (!checked) {
    selfCheck();
    checked = true;
  }
}

// ---------------------------------------------------------------------------
// The API.
// ---------------------------------------------------------------------------

/**
 * The holder's ElGamal keypair, derived from their XRPL family seed.
 *
 * ⚠ **This is the `derived-from-master-seed` key source and nothing else.** A
 * profile that declares `standalone` carries its own `elgamal_sk`/`elgamal_pk`
 * from the library's CSPRNG, and an absent `elgamal_key_source` reads as
 * `standalone` and is **not** upgraded.
 */
export function deriveElGamalKey(familySeed: string): DerivedElGamalKey {
  ensureChecked();
  const d = deriveRaw(familySeed);
  return { sk: d.sk, pk: d.pk, address: d.address, accountId: d.accountId, seedType: d.seedType };
}

/** Run the self-check on demand, so a caller can fail early and loudly. */
export function assertConstruction(): void {
  ensureChecked();
}

if (import.meta.main) {
  selfCheck();
  console.log(
    `wconf-keygen: both published vectors reproduced (PRK, OKM, sk and pk), reduction is total`,
  );
}
