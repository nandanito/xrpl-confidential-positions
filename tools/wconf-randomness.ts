/**
 * wconf-randomness.ts — the ruled `r`/`ρ` derivation, for the `tools/` harnesses.
 *
 * # Why this file exists — `CLAIMS.md` E-76
 *
 * REVIEW-010 ruled how `r` (the published ElGamal blinding) and `ρ` (the
 * Pedersen balance blinding) are derived, and adjudicated it in REVIEW-010c.
 * That ruling was implemented on 2026-08-18 **in the signer** —
 * `signer/src/randomness.rs` — and nowhere else. Every harness under
 * `tools/spike-2026-08-17/` went on calling `mptool blinding`, which is
 * upstream's `mpt_generate_blinding_factor`, and E-76 has recorded the gap
 * through four sessions.
 *
 * ⚠ **`mpt_generate_blinding_factor` is not unsafe. It is UNRULED**, and the
 * distinction matters: upstream's CSPRNG is a perfectly good source of a
 * scalar. What it is not is *the* source this project ruled on, and a harness
 * that publishes an `r` on Devnet from a second source is a second source of
 * `r` in the permanent record. That is the whole of the argument; nothing here
 * claims the harnesses were producing weak scalars.
 *
 * # What is NOT migrated, and why that is deliberate
 *
 * ⚠ **FIVE call sites reach upstream's generator deliberately, and this header
 * does NOT list them** — `tools/check-blinding-sources.ts` does, each with its
 * reason, and that file **fails if the list is ever wrong**. A second copy of
 * the list here is a second thing to leave stale, which is exactly what
 * happened twice: this paragraph said *"three"* until round one found four more
 * routes (`CLAIMS.md` E-137), and then *"nine"* until round two found that two
 * of the nine were not call sites at all (E-141).
 *
 * ⚠ **And the reason those exemptions exist is narrower than it first read.**
 * Saying *"migrating would delete the finding"* was **false** for three of them:
 * a harness that reuses one `r`, or needs an `alt` unequal to the transaction's
 * `r`, needs exactly **one** unruled scalar and could derive the rest. They stay
 * unmigrated because they produced recorded evidence with these exact scalars,
 * which is a true reason and a smaller one (`CLAIMS.md` E-140).
 *
 * # ⚠ This is a SECOND IMPLEMENTATION and that is the hazard
 *
 * `REVIEW-005c`'s lesson is that a second copy of a construction is a
 * divergence waiting to happen. There are now three implementations of this
 * KDF — the Rust signer, the TypeScript KAT, and this. The mitigation is that
 * **this one checks itself against the published vectors before it will derive
 * anything** (see [`selfCheck`]), which runs once per process and costs nine
 * HMACs. A divergence here fails loudly **before the first derivation** rather than
 * quietly on chain. (It is lazy, not import-time — `REVIEW-021`'s Codex leg
 * noted the earlier wording said "at import", which has no behavioural
 * consequence and is corrected here rather than argued about.)
 *
 * The vectors are REVIEW-010 Deliverable B's, copied from
 * `tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts`. That file
 * stays the authority and stays independent — it is the KAT, and a KAT that
 * imported the thing it tests would be worthless.
 *
 * # The rule this implements, stated so it is not "fixed" by a later session
 *
 * ⚠ **Entropy failure ABORTS. It does not degrade.** For `r` and `ρ` entropy
 * *is* the source rather than a hedge over a secret-derived core, and `r` is
 * published on chain. Synthesising a published blinding value from a long-lived
 * key is exactly what the ruling forbids. This is the opposite of the
 * sigma-nonce and ECDSA-nonce rules, and of keygen's total reduction, and all
 * four are correct — architecture §4 has them side by side.
 *
 * ⚠ **A zero scalar aborts the attempt and is never retried with the same
 * entropy.**
 */
import { createHmac, randomBytes } from "node:crypto";

const LABEL = Buffer.from("WCONF-RANDOM-SCALAR-v1", "ascii");
const SALT = Buffer.from("WCONF-RANDOM-SCALAR-v1/HKDF-Extract-salt", "ascii");
const EXPAND = Buffer.from("WCONF-RANDOM-SCALAR-v1/HKDF-Expand", "ascii");
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

export type TxKind =
  | "ConfidentialMPTConvert"
  | "ConfidentialMPTSend"
  | "ConfidentialMPTConvertBack";
export type Role = "elgamal-r" | "balance-rho";

/** The transaction this scalar is bound to. Hex in, as the harnesses hold it. */
export interface Context {
  /** The transaction type. Part of both the IKM and the info string. */
  txKind: TxKind;
  /** 20-byte AccountID, hex. */
  accountIdHex: string;
  /** 24-byte MPTokenIssuanceID, hex. */
  issuanceIdHex: string;
  /**
   * The 32-byte `TransactionContextID`, hex — `mptool convert-ctx`,
   * `send-ctx` or `convertback-ctx`.
   *
   * ⚠ **The context hash, not a placeholder.** It is what makes two attempts
   * on two different transactions produce different scalars even from repeated
   * entropy, and it is why the store catches only *exact-context* repeats.
   */
  contextHashHex: string;
}

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

function hexBuf(name: string, s: string, bytes: number): Buffer {
  const t = (s ?? "").trim();
  if (t.length !== bytes * 2 || !/^[0-9a-fA-F]*$/.test(t)) {
    throw new Error(`${name}: expected ${bytes * 2} hex characters, got ${t.length}`);
  }
  return Buffer.from(t, "hex");
}

function reduce(okm64: Buffer): string {
  if (okm64.length !== 64) throw new Error(`OKM must be 64 bytes, got ${okm64.length}`);
  const v = BigInt(`0x${okm64.toString("hex")}`) % N;
  // ⚠ Abort, never retry with the same entropy. See the module header.
  if (v === 0n) throw new Error("derived scalar is zero; abort this attempt, never retry");
  return v.toString(16).padStart(64, "0").toUpperCase();
}

function deriveFrom(ctx: Context, role: Role, entropy64: Buffer): string {
  const txType = Buffer.from(ctx.txKind, "ascii");
  const roleBytes = Buffer.from(role, "ascii");
  const account = hexBuf("account_id", ctx.accountIdHex, 20);
  const issuance = hexBuf("mpt_issuance_id", ctx.issuanceIdHex, 24);
  const context = hexBuf("TransactionContextID", ctx.contextHashHex, 32);
  if (entropy64.length !== 64) throw new Error(`entropy64 must be 64 bytes, got ${entropy64.length}`);

  const ikm = Buffer.concat([
    LABEL,
    u32be(txType.length), txType,
    u32be(account.length), account,
    u32be(issuance.length), issuance,
    u32be(context.length), context,
    u32be(entropy64.length), entropy64,
  ]);
  const prk = hmac512(SALT, ikm);
  const info = Buffer.concat([
    EXPAND,
    u32be(txType.length), txType,
    u32be(roleBytes.length), roleBytes,
  ]);
  return reduce(hmac512(prk, info, Buffer.from([0x01])));
}

// ---------------------------------------------------------------------------
// The self-check. Nothing below derives anything until this has passed.
// ---------------------------------------------------------------------------

const seq = (len: number) => Buffer.from(Array.from({ length: len }, (_, i) => i & 0xff));
const pat = (byte: number, len: number) => Buffer.alloc(len, byte);

/**
 * REVIEW-010 Deliverable B's published vectors, and the abort path.
 *
 * ⚠ **A negative control is included on purpose.** A vector set that only ever
 * matches proves the code is self-consistent; the zero-scalar case is what
 * proves the abort exists at all. The last spike's regression test passed when
 * it should not have (`CLAIMS.md` E-68), and that is the failure this guards.
 */
function selfCheck(): void {
  const baseCtx = {
    accountIdHex: seq(20).toString("hex"),
    issuanceIdHex: pat(0x42, 24).toString("hex"),
    contextHashHex: pat(0xa1, 32).toString("hex"),
  };
  const e = seq(64);
  const cases: [string, Context, Role, Buffer, string][] = [
    ["send r", { ...baseCtx, txKind: "ConfidentialMPTSend" }, "elgamal-r", e,
      "3D1F32A8397999734FAE3068DD3C5BB595760441812DCA2C59F7623637C0E574"],
    ["send rho", { ...baseCtx, txKind: "ConfidentialMPTSend" }, "balance-rho", e,
      "410444D77C876FCF0A76B23B6C29424DC8ADC90FCD68D7B1D665272387A9EEDD"],
    ["send r, one context byte changed",
      { ...baseCtx, txKind: "ConfidentialMPTSend",
        contextHashHex: Buffer.concat([pat(0xa1, 31), Buffer.from([0xa0])]).toString("hex") },
      "elgamal-r", e, "7A9299AFE6FE3A556D636224EE0605D199904734D83DA95BD7746B33B8AC6484"],
    ["send r, one entropy byte changed", { ...baseCtx, txKind: "ConfidentialMPTSend" }, "elgamal-r",
      Buffer.concat([seq(63), Buffer.from([0xbf])]),
      "542839218E14ED94DC81534DBBA1D6C78A3A12D6CE31B68912588D810E3A5291"],
    ["convert r", { ...baseCtx, txKind: "ConfidentialMPTConvert" }, "elgamal-r", e,
      "6F37E0F43B07E14DEF5BB775C8D8EF5CDE9ED1D632F26138E389C2E8109F833F"],
    ["convertback r", { ...baseCtx, txKind: "ConfidentialMPTConvertBack" }, "elgamal-r", e,
      "95A2F938AD598E70FC9E964AF5EBF429D70FBAB9A1BC0CE4D16B302C587527F1"],
    ["convertback rho", { ...baseCtx, txKind: "ConfidentialMPTConvertBack" }, "balance-rho", e,
      "96C5FCD8098C37E44AB1DC38FBB0520CB6356F28BE5A20137B106C0E59EF8CCC"],
    ["send r, different account",
      { ...baseCtx, txKind: "ConfidentialMPTSend", accountIdHex: pat(0x19, 20).toString("hex") },
      "elgamal-r", e, "2A72A3A127B28E1E8CBAE32AF3DAA945E04670322A38C8A490B83F8331DC9730"],
    ["send r, different issuance",
      { ...baseCtx, txKind: "ConfidentialMPTSend", issuanceIdHex: pat(0x43, 24).toString("hex") },
      "elgamal-r", e, "D113B7211EE89D09CA4A6AE58A6521C16BEF9BD3E4DE8E96171D3FF1AEE62D79"],
  ];
  for (const [name, ctx, role, entropy, expected] of cases) {
    const got = deriveFrom(ctx, role, entropy);
    if (got !== expected) {
      throw new Error(
        `wconf-randomness: KAT FAILED on "${name}".\n  got      ${got}\n  expected ${expected}\n` +
        `This implementation has diverged from REVIEW-010 Deliverable B. Nothing is derived.`
      );
    }
  }
  // The abort path must exist, or the checks above are decoration.
  let aborted = false;
  try { reduce(Buffer.alloc(64)); } catch { aborted = true; }
  if (!aborted) throw new Error("wconf-randomness: the zero-scalar abort path does not fire");
}

let checked = false;
function ensureChecked() {
  if (!checked) {
    selfCheck();
    checked = true;
  }
}

// ---------------------------------------------------------------------------
// The API the harnesses use.
// ---------------------------------------------------------------------------

/**
 * `r` and `ρ` for one signing **attempt**, from 64 bytes of fresh entropy.
 *
 * ⚠ **Once per attempt, not once per scalar.** Both roles share the entropy and
 * are separated by the info string — that is the ruled construction, and
 * drawing entropy twice would be a different one.
 *
 * ⚠ **A retry is a new attempt and must call this again.** Reusing a returned
 * pair across two transactions publishes the same `C₁` twice, which is E-63:
 * a passive observer holding no keys recovers the difference between two hidden
 * amounts, and rippled accepts both transactions.
 */
export function deriveRandomness(ctx: Context): { r: string; rho: string } {
  ensureChecked();
  const entropy = randomBytes(64);
  return {
    r: deriveFrom(ctx, "elgamal-r", entropy),
    rho: deriveFrom(ctx, "balance-rho", entropy),
  };
}

/**
 * `r` alone, for a Convert that carries no balance commitment.
 *
 * A Convert's `ρ` has nothing to blind — there is no `BalanceCommitment` field
 * on one (XLS-0096 §7.2) — so deriving one and discarding it would suggest a
 * value exists that does not.
 */
export function deriveR(ctx: Context): string {
  ensureChecked();
  return deriveFrom(ctx, "elgamal-r", randomBytes(64));
}

/** Run the self-check on demand, so a harness can fail early and loudly. */
export function assertConstruction(): void {
  ensureChecked();
}

if (import.meta.main) {
  selfCheck();
  console.log("wconf-randomness: all 9 published vectors reproduced, abort path fires");
}
