/**
 * submit.ts — the facility's ONLY submission path, and it always sets
 * `tapFailHard`.
 *
 * # The second half of B-15's step-7 ruling
 *
 * Ruled 2026-08-25: loopback for the facility's reads, **and `tapFailHard` set
 * by whatever submits — which is NOT the signer**. The signer signs and hands
 * back a blob; *"the signer reads the ledger and still does not write to it"*
 * is a trust-boundary claim architecture §1 says is load-bearing in both
 * halves, and putting a submitter inside it would be a different system from
 * the one ADR-0001 accepted. So the submitter lives here, outside.
 *
 * # What the flag does, read at source rather than assumed
 *
 * rippled 3.3.0 (`00a178f`, the same commit `CLAIMS.md` F-23 was read at):
 *
 * * `src/xrpld/rpc/handlers/transaction/Submit.cpp:32-37` — the `submit` RPC's
 *   `fail_hard` parameter becomes `NetworkOPs::FailHard`.
 * * `src/xrpld/app/misc/NetworkOPs.cpp:1683-1684` — `FailHard::Yes` sets
 *   `TapFailHard` in the flags the transaction is applied under.
 * * `src/libxrpl/tx/Transactor.cpp:1645-1651` —
 *   `if (isTecClaim(result) && (view().flags() & TapFailHard))` then
 *   `ctx_.discard(); applied = false;`, under the comment *"If the TapFailHard
 *   flag is set, a tec result must not do anything"*.
 * * `NetworkOPs.cpp:1833` — `enforceFailHard` also stops the transaction being
 *   kept locally **or relayed to peers**, so a `tec` never reaches the network.
 *
 * That removes F-23's consequence **at the ledger**: a `tecBAD_PROOF` no longer
 * publishes its ciphertexts.
 *
 * ⚠ **It does NOT remove the consequence at the NODE.** The blob is submitted
 * to an endpoint, and under a remote ledger source that endpoint is the same
 * one whose keys the transaction was built against — so a lying source receives
 * the ciphertext encrypted under its own key before the flag can prevent
 * anything. `CLAIMS.md` **F-28**.
 *
 * ⚠ **With loopback the node is the operator's own, which NARROWS the question
 * rather than removing it.** This said *"the question does not arise"* until
 * `REVIEW-023` round two, and `loopback.ts`'s own header refutes it: the issue
 * #1 ruling puts a hostile same-host process in scope, and that adversary *"can
 * point this at a different endpoint, or edit the local node's answers"*. A
 * compromised local node lies about the key and reads the blob exactly as a
 * remote one does. Against an **honest, operator-controlled** node the
 * disclosure has nowhere to go — which is why the ruling calls loopback the
 * protection and this the seatbelt.
 *
 * # ⚠ Where this stops, stated because a flag looks like a guarantee
 *
 * * **It is a convention, not a property.** `REVIEW-019` named a `tapFailHard`
 *   submitter as *"a real F-23 mitigation nobody had named"*, and the decision
 *   request is equally clear that **nothing forces a separate submitter to set
 *   the flag**. This module cannot be asked not to; another submitter can
 *   simply not be this module. **Loopback is the half that removes the risk;
 *   this is a seatbelt that only helps if someone buckles it.**
 * * **It covers `tec`, not `tem`/`tef`/`ter`.** Those were never applied.
 * * **It does not make a wrong read right.** The transaction still fails; what
 *   changes is that it fails *without publishing*.
 * * **The ruling had no adversarial review.** It is not one of `REVIEW-019`'s
 *   three options as stated — it is A plus a reading of C.
 */
import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";
import type { LoopbackLedger } from "./loopback.ts";
import { LedgerRefusal } from "./loopback.ts";

export interface SubmitResult {
  engineResult: string;
  engineMessage: string;
  hash: string;
  /** What the node did with it. Under fail-hard a `tec` reports `false`. */
  applied: boolean;
  blob: string;
}

/**
 * ⚠ **There is no `failHard` parameter anywhere in this file, and that is the
 * enforcement.** A caller cannot ask for a submission without it, because
 * there is no way to express the request. `REVIEW-021` is the reason to prefer
 * that shape: three false sentences were written to explain fixes, one of them
 * excusing a defect on the grounds that *"the typed builder cannot produce
 * one"* when it could. A property enforced by there being no other constructor
 * cannot decay into a property enforced by everyone remembering.
 */
export class FailHardSubmitter {
  constructor(private readonly ledger: LoopbackLedger) {}

  /** Submit an already-signed blob — what the signer hands back. */
  async submitBlob(blob: string): Promise<SubmitResult> {
    const r = await this.ledger.call("submit", { tx_blob: blob, fail_hard: true });
    const engineResult = String(r.engine_result ?? "(none)");
    return {
      engineResult,
      engineMessage: String(r.engine_result_message ?? ""),
      hash: String(r.tx_json?.hash ?? ""),
      applied: r.applied === true,
      blob,
    };
  }

  /**
   * Build and sign a **plaintext** transaction. **It does not submit.**
   *
   * ⚠ **Signing and submitting are separate on purpose, and they were not in
   * the first draft of this file.** `signAndSubmit` did both, so every caller
   * that wanted a validated result submitted the blob a second time through
   * `submitValidated` — a double submission whose second attempt could only
   * fail. Found by reading this file against its callers rather than by a test,
   * which is the reason to read the whole file (`CLAIMS.md` E-139).
   *
   * Splitting it also leaves exactly **one** path to the network, which is what
   * makes "no path omits `tapFailHard`" a property of the shape rather than of
   * everyone remembering.
   *
   * ⚠ **Only for transactions that carry no proof and no blinding factor** —
   * `MPTokenIssuanceCreate`, `MPTokenIssuanceSet`, `MPTokenAuthorize`,
   * `Payment`, `ConfidentialMPTMergeInbox`. Everything that publishes an `r`
   * is built, proved and signed by `signer/`, under the ruled `r`/`ρ`
   * derivation, and reaches this class as a finished blob.
   *
   * ⚠ **This holds a seed, and that is a property of the facility's operator
   * roles rather than of the holder signer.** Devnet throwaways only.
   */
  async sign(
    tx: Record<string, unknown>,
    seed: string,
    opts: { fee?: string } = {},
  ): Promise<string> {
    const kp = deriveKeypair(seed);
    const address = deriveAddress(kp.publicKey);
    const snapshot = await this.ledger.snapshot();
    const current = await this.ledger.currentIndex();
    const filled: Record<string, unknown> = {
      ...tx,
      Account: tx.Account ?? address,
      Sequence: tx.Sequence ?? (await snapshot.sequenceOf(address)),
      Fee: tx.Fee ?? opts.fee ?? "5000",
      // ⚠ **Not read-index + 20.** `REVIEW-016` found both legs independently
      // catching that borrowing `xrpl.js`'s autofill window is wrong when
      // anything sits between building and signing. Nothing human sits here,
      // but a Devnet cluster's ledgers close in ~4s and this process talks to
      // a node that may still be catching up.
      LastLedgerSequence: tx.LastLedgerSequence ?? current + 60,
      SigningPubKey: kp.publicKey,
    };
    // ⚠ **No `NetworkID` on Devnet** — `CLAIMS.md` F-21.
    const signed = { ...filled, TxnSignature: sign(encodeForSigning(filled), kp.privateKey) };
    return encode(signed);
  }

  /**
   * Wait for a hash to be validated.
   *
   * Returns the `tx` result, or `null` if it never validated inside the window
   * — which is an outcome, not an exception: a transaction that was discarded
   * under fail-hard will never validate, and that is the point.
   */
  async waitValidated(hash: string, tries = 40): Promise<any | null> {
    for (let i = 0; i < tries; i++) {
      await Bun.sleep(1500);
      try {
        const r = await this.ledger.call("tx", { transaction: hash });
        if (r.validated) return r;
      } catch (e) {
        if (!(e instanceof LedgerRefusal)) throw e;
        // `txnNotFound` until it is in a closed ledger. Keep waiting.
      }
    }
    return null;
  }

  /**
   * Submit, wait for validation, and require `tesSUCCESS` **in the validated
   * metadata**.
   *
   * ⚠ **The engine result at submit time is PROVISIONAL and the two can
   * differ.** `submit` reports what happened when the transaction was applied
   * to this node's open ledger; what settles it is `TransactionResult` in the
   * metadata of the validated transaction. Checking only the provisional
   * answer is how a facility comes to record a movement for a transaction that
   * ended up `tec` — and the book would then be wrong by exactly that amount,
   * permanently, with every later reconciliation blaming the wrong thing.
   */
  async submitValidated(blob: string, what: string): Promise<{ hash: string; tx: any }> {
    const res = await this.submitBlob(blob);
    if (!res.engineResult.startsWith("tes")) {
      throw new LedgerRefusal(
        "REFUSED_NOT_APPLIED",
        `${what}: ${res.engineResult} ${res.engineMessage}` +
          (res.engineResult.startsWith("tec")
            ? ` — discarded rather than applied, because this submitter sets tapFailHard`
            : ""),
      );
    }
    const tx = await this.waitValidated(res.hash);
    if (!tx) throw new LedgerRefusal("REFUSED_NEVER_VALIDATED", `${what}: ${res.hash}`);
    const finalResult = tx.meta?.TransactionResult ?? tx.metaData?.TransactionResult;
    if (finalResult !== "tesSUCCESS") {
      throw new LedgerRefusal(
        "REFUSED_NOT_APPLIED",
        `${what}: validated as ${finalResult}, though submit reported ${res.engineResult}`,
      );
    }
    return { hash: res.hash, tx };
  }
}
