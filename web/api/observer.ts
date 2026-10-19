/**
 * What a full-ledger observer sees.
 *
 * ⚠ **A demo of the happy path is not evidence of confidentiality** — this is
 * the surface that says what is actually public, and its first duty is
 * `CLAIMS.md` **F-1**: a freshly-initialised or post-merge balance is
 * **publicly identifiable as exactly zero**, because `EncZero` is canonical and
 * recomputable by anyone from the holder's public key, the account id and the
 * issuance id. The observer harness proves that by recomputing it
 * independently; this view reports it.
 *
 * ⚠ **P-4 and P-11 govern every sentence here.** Sender, receiver, timing and
 * frequency are public. Only amounts are hidden.
 */

import type { Snapshot } from "../../facility/src/loopback.ts";
import { canonicalEncZero } from "../../tools/observer-harness.ts";

export interface ObserverView {
  account: string;
  issuanceId: string;
  /**
   * Public and plaintext. Not hidden by anything.
   *
   * ⚠ **A DECIMAL STRING.** `MPTAmount` is a UINT64 and a JS `Number` rounds
   * anything over 2^53 — the issuer path was fixed for this (E-215) and this
   * one was missed, which is the fix-the-instance-not-the-phrase shape again
   * (`CLAIMS.md` E-220).
   */
  publicAmount: string;
  registered: boolean;
  holderEncryptionKey?: string;
  confidentialBalanceVersion: number;
  /** ⚠ The whole point of F-1. */
  spending: CiphertextView | null;
  inbox: CiphertextView | null;
  issuance: {
    issuer: string;
    /** ⚠ PLAINTEXT on the issuance object. The sum of every hidden position. */
    /** ⚠ A decimal string, for the same reason as `publicAmount`. */
    confidentialOutstandingAmount: string;
    hasIssuerKey: boolean;
    hasAuditorKey: boolean;
  };
  whatIsPublic: string[];
  whatIsHidden: string[];
}

export interface CiphertextView {
  ciphertext: string;
  /** True when the ciphertext equals the canonical encryption of zero. */
  publiclyKnownZero: boolean;
  note: string;
}

/** Everything on an observer page that is readable with no secret at all. */
export const WHAT_IS_PUBLIC: string[] = [
      "This account's address, and every counterparty it has transacted with (P-4, P-11).",
      "Every transaction's timing and frequency (P-11).",
      "The public, plaintext MPT balance shown above.",
      "The issuance's ConfidentialOutstandingAmount — plaintext, and the sum of every hidden position.",
      "The holder's registered encryption key, once they have converted.",
      "The ConfidentialBalanceVersion, which counts state changes.",
      "⚠ Whether a confidential balance is exactly zero — but ONLY when it carries the canonical " +
        "encryption of zero, which is used on first-time init, merge reset and clawback (F-1). " +
        "⚠ A balance that reached zero by SPENDING is not publicly identifiable as zero (E-211).",
      "⚠ Every individual tranche size when a position is retired in tranches — MPTAmount is plaintext on each ConvertBack (F-24).",
    ];

/**
 * ⚠ **The complete list, and it is two items.** Anything not here is public.
 */
export const WHAT_IS_HIDDEN: string[] = [
      "The value of a confidential balance that does not carry the canonical encryption of zero — " +
        "⚠ including when that value happens to BE zero (E-211).",
      "The amount moved by a ConfidentialMPTSend, from an observer.",
      "⚠ That is the complete list. Nothing else on this page is hidden from anyone.",
    ];

/** ⚠ F-1, stated where it is true rather than in a footnote. */
export const CANONICAL_ZERO_NOTE =
  "⚠ PUBLICLY KNOWN TO BE EXACTLY ZERO. EncZero is canonical — anyone recomputes it from the " +
  "holder's public key, the account id and the issuance id, with no secret at all. A zero " +
  "confidential balance is not hidden (CLAIMS.md F-1).";

/**
 * ⚠⚠ **THIS SAID "Non-zero, and the amount is hidden from an observer" AND THAT
 * WAS FALSE (`CLAIMS.md` E-211).**
 *
 * Measured on Devnet 2026-08-28: holder `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8`
 * decrypts to **0** through the issuer mirror, while its
 * `ConfidentialBalanceSpending` does **not** match the canonical `EncZero`.
 * **A balance can be exactly zero and not publicly identifiable as zero** —
 * F-1's canonical form is used on first-time init, merge reset and clawback, so
 * a balance that reached zero by SPENDING is a homomorphic result: a randomised
 * encryption of zero that matches nothing.
 *
 * ⚠ `tools/observer-harness.ts:277` had the correct hedge — *"not the canonical
 * zero (some non-zero value, or never reset)"* — and this tier flattened it into
 * a flat claim. **The correct source was one import away.**
 */
export const NOT_CANONICAL_NOTE =
  "Does NOT match the canonical encryption of zero, so an observer cannot determine this " +
  "balance's value. ⚠ That is NOT the same as saying it is non-zero: a balance that reached " +
  "zero by spending is a randomised encryption of zero and matches nothing, so it looks exactly " +
  "like this. Only a freshly-initialised, post-merge or post-clawback balance uses the canonical " +
  "form (CLAIMS.md F-1). ⚠ Whatever the value is, it is NOT hidden from the issuer — the " +
  "decryption mirror is mandatory and no configuration disables it (P-9).";

function classify(ciphertext: string | undefined, encZero: string | null): CiphertextView | null {
  if (!ciphertext) return null;
  if (encZero && ciphertext.toUpperCase() === encZero) {
    return {
      ciphertext,
      publiclyKnownZero: true,
      note: CANONICAL_ZERO_NOTE,
    };
  }
  return {
    ciphertext,
    publiclyKnownZero: false,
    note: NOT_CANONICAL_NOTE,
  };
}

export async function observerView(snap: Snapshot, account: string, issuanceId: string): Promise<ObserverView> {
  const mpt = await snap.mptoken(account, issuanceId);
  const iss = await snap.issuance(issuanceId);

  const key = mpt?.holderEncryptionKey;
  const encZero = key ? canonicalEncZero(key, account, issuanceId) : null;

  return {
    account,
    issuanceId,
    publicAmount: mpt?.publicAmountRaw ?? "0",
    registered: Boolean(key),
    holderEncryptionKey: key,
    confidentialBalanceVersion: mpt?.confidentialBalanceVersion ?? 0,
    spending: classify(mpt?.confidentialBalanceSpending, encZero),
    inbox: classify(mpt?.confidentialBalanceInbox, encZero),
    issuance: {
      issuer: iss.issuer,
      confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
      hasIssuerKey: Boolean(iss.issuerEncryptionKey),
      hasAuditorKey: Boolean(iss.auditorEncryptionKey),
    },
    whatIsPublic: WHAT_IS_PUBLIC,
    whatIsHidden: WHAT_IS_HIDDEN,
  };
}
