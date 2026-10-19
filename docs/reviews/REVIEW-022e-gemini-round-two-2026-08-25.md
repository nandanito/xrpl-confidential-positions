# ADVERSARIAL REVIEW: REVIEW-022 Round Two (Architecture §6 Step 7)

**Date:** 2026-08-25  
**Review Target:** Round-one fixes and architecture §6 step 7 implementation  
**Outcome:** **8 findings upheld** (1 HIGH, 3 MEDIUM, 4 LOW).

---

## Executive Summary & Key Questions

1. **Did any fix introduce a defect?**
   * **Yes.** In `facility/src/facility.ts` (`enrolSupplier`), `this.suppliers.set` mutates in-memory state *before* transactions are executed. A failure in `authorize`, `payPublicly`, or `convertFloat` leaves the supplier registered in memory, causing any retry to fail with `REFUSED_ALREADY_ENROLLED`.
   * **Yes.** In `run-facility.ts` §1 (`failHardControl`), the swapped logic cannot distinguish between "Arm A was discarded and Arm B was applied" vs "Arm A failed to discard and Arm B was rejected as a duplicate". If `tapFailHard` fails completely on rippled, the test will still report `✓ The flag is the difference`.
2. **Is any sentence written to explain a fix FALSE?**
   * **Yes.** `facility/tests/submit.test.ts` claims *"every one of them reaches the ledger through submitBlob"*. `sign` and `waitValidated` do not call `submitBlob`.
   * **Yes.** `facility/tests/hostile-endpoints.ts` claims it avoids *"fourteen near-identical"* exemptions; there are 12.
3. **Is "BUILT AND NOT EXECUTED" stated consistently?**
   * **No.** `facility/tests/facility.test.ts` (lines 6–7) explicitly claims: *"the happy path is executed on Devnet by `facility/run-facility.ts`"*.
4. **Are `submitValidated`'s two failure modes distinguishable and reachable?**
   * **Reachable:** Yes, consensus reordering can turn a provisional `tesSUCCESS` into a validated `tec`.
   * **Distinguishability:** Both throw `LedgerRefusal` with identical code `REFUSED_NOT_APPLIED`. Furthermore, calling a validated `tec` `REFUSED_NOT_APPLIED` is factually inaccurate because the transaction *was* applied to the ledger and fees/state were committed.
5. **Is the single-conversion guard ordering right?**
   * In `convertFloat`, the ordering is correct. However, `enrolSupplier` suffers from premature state mutation before transaction validation.

---

## Detailed Findings

### 1. [HIGH] "BUILT AND NOT EXECUTED" breached in `facility.test.ts`

* **File:** `facility/tests/facility.test.ts`, lines 6–7
* **Exact sentence:**
  > *"That is deliberate: the happy path is executed on Devnet by `facility/run-facility.ts` and a happy path is not evidence of anything (`CLAUDE.md`: 'a demo of the happy path is not evidence of confidentiality')."*
* **Why it is wrong:**
  The milestone status was formally updated to **BUILT AND NOT EXECUTED** because the loopback node did not finish syncing Devnet (`E-148`, `B-18`). `README.md` and `run-facility.ts` state in terms that *"No transaction from this facility has been submitted to any ledger."* Stating in `facility.test.ts` that the happy path *"is executed on Devnet by `facility/run-facility.ts`"* is a factual falsehood in the test documentation that directly contradicts the milestone status.
* **What would falsify this claim:**
  Demonstrating that `facility/run-facility.ts` has executed against Devnet and submitted transactions, or showing that the comment uses conditional/design language (e.g., "is written to be executed").

---

### 2. [MEDIUM] Premature state mutation in `Facility.enrolSupplier` blocks retries

* **File:** `facility/src/facility.ts`, lines 274–287
* **Exact code:**
  ```typescript
  this.suppliers.set(supplier.address, supplier);
  const out: Movement[] = [];
  out.push(await this.authorize(supplier));
  out.push(await this.payPublicly(supplier, tokenAmount));
  const convert = await this.confidential(supplier, { ... });
  ```
* **Why it is wrong:**
  `this.suppliers.set(supplier.address, supplier)` is executed at line 274 *before* `this.authorize`, `this.payPublicly`, and `this.confidential`. If any of these three asynchronous ledger operations fail (e.g., ledger timeout, transient error, or insufficient bank balance), `supplier` remains in `this.suppliers`. If the caller attempts to re-enrol the supplier, line 262 immediately triggers:
  ```typescript
  if (this.suppliers.has(supplier.address)) {
    throw new FacilityRefusal("REFUSED_ALREADY_ENROLLED", supplier.label);
  }
  ```
  The facility instance is left in an unrecoverable state where the supplier is marked enrolled in memory but not enrolled on ledger. (In contrast, `adoptEnrolledSupplier` correctly sets `this.suppliers.set` at the very end after all checks succeed).
* **What would falsify this claim:**
  Showing that an aborted `enrolSupplier` removes the supplier from `this.suppliers` on error, or moving `this.suppliers.set` to the end of the method after all transactions have validated.

---

### 3. [MEDIUM] Flawed control logic in `run-facility.ts` §1 (`failHardControl`)

* **File:** `facility/run-facility.ts`, lines 122–165
* **Exact code & comment:**
  ```typescript
  // Arm A — with the flag.
  const blob = await submitter.sign(tx, bank.seed);
  const withFlag = await submitter.submitBlob(blob);
  ...
  // Arm B — WITHOUT the flag.
  const rawResult = await ledger.call("submit", { tx_blob: blob });
  ...
  await Bun.sleep(9000);
  const found = await ledger
    .call("tx", { transaction: withFlag.hash })
    .then((r) => !!r.validated)
    .catch(() => false);
  ...
  if (found) {
    console.log(`\n ✓ The flag is the difference. Arm A set tapFailHard and the tec was discarded; ...`);
  }
  ```
* **Why it is wrong:**
  Arm A and Arm B submit the **exact same signed blob** with the **exact same hash** back-to-back before waiting for a ledger close.
  Suppose `tapFailHard` were completely broken or ignored by rippled: Arm A would *not* be discarded, but would instead be applied to the ledger. Arm B would then return a duplicate / sequence error (`tefALREADY` / `tefPAST_SEQ`). When the ledger closes, `found` will evaluate to `true` (because Arm A landed).
  The script will then output:
  `✓ The flag is the difference. Arm A set tapFailHard and the tec was discarded; arm B did not and the SAME bytes were applied.`
  The control cannot distinguish between "Arm A was discarded and Arm B applied it" vs "Arm A failed to discard and Arm B was a duplicate". It prints a pass on the very failure mode it is intended to detect.
* **What would falsify this claim:**
  Demonstrating that `failHardControl` verifies that Arm A was not on the ledger *prior* to Arm B's submission, or showing that Arm A and Arm B use distinct transactions with distinct hashes.

---

### 4. [MEDIUM] False claim in `submit.test.ts` regarding pinned methods

* **File:** `facility/tests/submit.test.ts`, lines 117–120
* **Exact sentence:**
  > *"And every one of them reaches the ledger through `submitBlob`, which is the single place `fail_hard` is set. The two behavioural tests above are what prove it is set; this is what proves there is no third door."*
* **Why it is wrong:**
  The test pins `FailHardSubmitter.prototype` methods to `["sign", "submitBlob", "submitValidated", "waitValidated"]`.
  The claim that *"every one of them reaches the ledger through `submitBlob`"* is demonstrably false:
  1. `sign` calls `this.ledger.snapshot()` and `this.ledger.currentIndex()`; it does *not* call `submitBlob` (and test 2 specifically verifies that `sign` does not submit anything).
  2. `waitValidated` calls `this.ledger.call("tx", ...)`; it does *not* call `submitBlob`.
  Only `submitValidated` reaches the ledger through `submitBlob`.
* **What would falsify this claim:**
  Showing that `sign` and `waitValidated` call `submitBlob`.

---

### 5. [LOW] Inconsistency & false count in `hostile-endpoints.ts` header

* **File:** `facility/tests/hostile-endpoints.ts`, lines 4–5
* **Exact sentence:**
  > *"This file exists so that `tools/check-loopback.ts` needs exactly one whole-file exemption instead of fourteen near-identical ones."*
* **Why it is wrong:**
  `HOSTILE_ENDPOINTS` contains exactly 12 items (explicitly asserted by `facility/tests/loopback.test.ts`: `expect(HOSTILE_ENDPOINTS.length).toBe(12)`), and `tools/check-loopback.ts` line 67 states *"One exemption instead of twelve near-identical ones"*.
  `hostile-endpoints.ts` states *"fourteen"* twice in its header comments. This is a round-two documentation count inaccuracy (`CLAIMS.md` E-141).
* **What would falsify this claim:**
  Showing 14 endpoints in `HOSTILE_ENDPOINTS`.

---

### 6. [LOW] Missing test coverage for round-one fix S-4 (`adoptEnrolledSupplier`)

* **File:** `facility/tests/facility.test.ts`
* **Why it is wrong:**
  S-4 was upheld as a MEDIUM finding in round one, resulting in the creation of `Facility.adoptEnrolledSupplier` with three security validations (seed check, derivation check, ledger check). However, `facility/tests/facility.test.ts` contains **zero unit tests** for `adoptEnrolledSupplier`. None of its refusal paths (`REFUSED_NOT_ENROLLED`, `REFUSED_KEY_NOT_DERIVED`, `REFUSED_SEED_ADDRESS_MISMATCH`) or its adoption path are tested in `facility.test.ts`.
* **What would falsify this claim:**
  Locating a unit test executing `adoptEnrolledSupplier` in `facility/tests/facility.test.ts`.

---

### 7. [LOW] Defense-in-depth gap: `assertLoopbackProfile` not invoked in `SignerSession.start`

* **File:** `facility/src/signer.ts`, lines 71–105
* **Why it is wrong:**
  `assertLoopbackProfile` was introduced in `signer.ts` to enforce B-15 on endpoints handed to the signer daemon. However, `SignerSession.start` accepts `profile: SignerProfile` and writes `profile.ledgerEndpoint` directly to `profile.json` without calling `assertLoopbackProfile(profile.ledgerEndpoint)`. The check is only called in `Facility`'s constructor. Direct callers of `SignerSession.start` bypass the TypeScript check.
* **What would falsify this claim:**
  Showing that `SignerSession.start` calls `assertLoopbackProfile`.

---

### 8. [LOW] In-memory position mutated before negative balance check in `FacilityBook.record`

* **File:** `facility/src/book.ts`, lines 183–216
* **Why it is wrong:**
  In `FacilityBook.record`, `p.spending` or `p.inbox` is updated in-place before evaluating `if (p.spending < 0 || p.inbox < 0)`. When an illegal movement throws, the position object in `this.data.positions[m.account]` retains the negative number in memory. While `save()` is not invoked, any subsequent in-memory operation (e.g. `expected()`) reads the corrupted negative position.
* **What would falsify this claim:**
  Showing that `FacilityBook.record` computes new balances into temporary variables and validates non-negativity before mutating `this.data.positions[m.account]`.

---

## Specific Questions & Inquiries Addressed

### Q3: Do the new and changed tests falsify?
* **Pinned method set (`submit.test.ts`):** Falsifies addition/removal of methods on `FailHardSubmitter.prototype`, though its comment makes a false claim about `sign` and `waitValidated` (Finding 4).
* **`FacilityRefusal` type assertion (`facility.test.ts`):** Falsifies premature facility guard failures. However, because `LedgerRefusal` is not an instance of `FacilityRefusal`, an infrastructure failure in `positionOf` would also pass `expect(boundary).not.toBeInstanceOf(FacilityRefusal)`.
* **Merge amount check (`book.test.ts`):** Falsifies attempts to record a merge with an amount differing from the book's inbox.

### Q5: `submitValidated` failure modes
* Mode 1 (provisional `!startsWith("tes")`) and Mode 2 (validated metadata `finalResult !== "tesSUCCESS"`) both throw `LedgerRefusal("REFUSED_NOT_APPLIED", ...)`. They are not distinguishable by refusal code.
* Mode 2 is reachable when consensus orders preceding transactions that cause a `tec` during ledger closing.
* When Mode 2 triggers, the error code `REFUSED_NOT_APPLIED` is misleading because a `tec` on a validated ledger *is* applied to the ledger.

### Q6: Single-conversion guard ordering
* In `convertFloat`, `positionOf` is queried, `already?.holderEncryptionKey` is checked, and `this.floatConverted` is set only after validation. The ordering in `convertFloat` is sound.
* However, in `enrolSupplier`, `this.suppliers.set` occurs prior to transaction validation (Finding 2).

[exited with code 0]
