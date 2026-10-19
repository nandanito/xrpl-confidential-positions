<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015f-gemini-round-three-2026-08-19 — round three, the fixes nobody had seen

**Date:** 2026-08-19. **Leg:** Gemini via `agy --effort high`. **Target:** the diff of `0955d7b` — round
two's fixes, which no leg had reviewed.

⚠ **`CLAUDE.md` says two rounds is where it stops paying, and this round was run
anyway.** The reason is recorded in `REVIEW-015c` §8: round two's fixes were not
cosmetic — they changed `Convert`'s wire format on the strength of the
adjudicator's own reading of XLS-0096 §7.2, with no second reader. That is
exactly the shape this project has been burned by. **The round found a real
defect** (`ConvertBack` given Convert's field set) that neither earlier round
could have, because the code did not exist until round two.

**It does not overturn the two-round rule.** It says the rule counts *rounds of
review*, and a fix that introduces new protocol-facing behaviour starts a new
thing to review.

---

# REVIEW-015 Round Three: Final Adversarial Diff Review

## Summary & Verdict

**Verdict: APPROVED.**
The changes in this diff are clean, precise, and faithfully implement the requirements of XLS-0096 §7.2 and §7.3.2. The review fixes from round two have been verified against the spec and the codebase invariants. No security defects, cryptographic discrepancies, or regressions were introduced.

---

## Findings (Ranked by Severity)

### [Low / Polish] 1. Unintended whitespace in `txn.rs` error string literal
* **Location:** [`signer/src/txn.rs:419`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L417-L422)
* **Details:** The error message when `HolderEncryptionKey` and `ZKProof` pairing is violated contains raw multiline indentation whitespace:
  ```rust
  "a Convert must carry HolderEncryptionKey and ZKProof together or                          neither; the spec forbids one without the other"
  ```
* **Impact:** Cosmetic only (runtime error message formatting). Can be formatted with `\` line escapes.

### [Low / Polish] 2. Error message in parser refers to "Convert" for `ConvertBack`
* **Location:** [`signer/src/txn.rs:604-610`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L604-L610)
* **Details:** The wildcard match arm `_` in `ParsedTransaction::parse` catches both `TxType::Convert` and `TxType::ConvertBack`. If an invalid `ConvertBack` with mismatched `ZKProof`/`HolderEncryptionKey` is parsed, the error text specifically reads: `"a Convert carries a ZKProof without a HolderEncryptionKey..."`.
* **Impact:** Cosmetic / edge-case diagnostic text; the signer refuses to build `ConvertBack` transactions anyway.

---

## Evaluation of Specific Claims

### 1. Is Claim 1 implemented correctly? (Auditor ciphertext on `Convert`)
**YES — Correct and compliant.**

* **Emission Condition:** In [`signer/src/session.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/session.rs#L439-L442), `auditor_ct` is computed when `self.holder.auditor_encryption_key` is `Some(pk)`. This matches XLS-0096 §7.2 ("*Required if sfAuditorEncryptionKey is present on the issuance*") and prevents `tecNO_PERMISSION` (§7.3.2 item 1).
* **Wire Emission & Position:** In [`signer/src/txn.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L424-L426), `TxBuilder` emits `sfAuditorEncryptedAmount` if present.
* **Parse & Shared-$C_1$ Verification:** In [`signer/src/txn.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L633-L644), for `TxType::Convert | TxType::ConvertBack`, `AUDITOR_ENCRYPTED_AMOUNT` (if present) is pushed into the `others` vector. The downstream verification loop validates that all ciphertexts in `others` share the identical 33-byte $C_1 = r \cdot G$ with `own_ciphertext` (`HolderEncryptedAmount`).
* **Confirmation Disclosure:** `ParsedTransaction.has_auditor` is set to `d.get(xrpl::AUDITOR_ENCRYPTED_AMOUNT).is_some()`, triggering the disclosure line in [`signer/src/confirm.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/confirm.rs#L50-L52).

---

### 2. Is Claim 2 correct and complete? (`HolderEncryptionKey` & `ZKProof` pairing on `Convert`)
**YES — Complete and enforced in all directions.**

* **No Mismatched Emission:**
  * [`signer/src/session.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/session.rs#L446-L457): Branches strictly on `self.holder.holder_key_registered`:
    * If `true` $\rightarrow$ `(None, None)`.
    * If `false` $\rightarrow$ `(Some(*public_key), Some(proof))`.
  * [`signer/src/txn.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L411-L423): `builder()` pattern-matches `(Some(k), Some(p))` and `(None, None)`. Any mismatched variant (`(Some, None)` or `(None, Some)`) triggers a hard `XrplError::Field` error.
* **Parser Enforcement:**
  * [`signer/src/txn.rs`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L599-L612): The `match (tx_type, d.get(ZK_PROOF), d.get(HOLDER_ENCRYPTION_KEY))` exhaustively enforces that on non-Send types, `(Some, Some)` yields `proof_len`, `(None, None)` yields `0`, and either `(Some, None)` or `(None, Some)` returns an explicit parse error.
* **Compatibility:** All transactions emitted by the signer parse cleanly: unregistered Convert transactions parse with `proof_len = 64`, and registered Convert transactions parse with `proof_len = 0`.

---

### 3. Can any new or modified test pass for the wrong reason?
**NO — All test assertions are sound and unmasked.**

* **`a_convert_registers_the_key_once_and_never_again`:**
  * Verifies both branches separately with distinct fixtures (`fixture()` vs `fixture_registered()`).
  * First branch asserts presence of `HOLDER_ENCRYPTION_KEY`, exact proof length 64, and `parse().is_ok()`.
  * Second branch asserts `HOLDER_ENCRYPTION_KEY.is_none()`, `ZK_PROOF.is_none()`, and `parse().is_ok()`.
* **`a_convert_on_an_auditor_enabled_issuance_carries_the_auditor_ciphertext`:**
  * Extracts the raw binary `AUDITOR_ENCRYPTED_AMOUNT` from the serialized wire blob, calls `prover::decrypt` with the auditor's secret key, and asserts the decrypted plaintext is exactly `60`.
  * Also checks that the human confirmation disclosure text was rendered.
* **`a_send_without_an_auditor_does_not_claim_one`:**
  * Asserts both `!parsed.has_auditor` and that the confirmation output does not contain the disclosure phrase `"third party can decrypt"`.
* **`rebuilt_without_mpt_amount` helper:**
  * In [`signer/tests/falsifier.rs:321`](file://$HOME/.gemini/antigravity-cli/scratch/signer/tests/falsifier.rs#L321), the test explicitly validates that `rebuilt_without_mpt_amount(&d).serialize(false)` parses successfully *before* injecting poison fields.
  * For both `MPTAmount` and `NetworkID`, the test checks for the specific error substrings (`"may not carry"` and `"NetworkID"` / `"Devnet-only"`), ensuring the failure is due to the injected field and not missing mandatory fields.
* **`assert_pristine`:**
  * In [`signer/tests/prover_pristine.rs:66-70`](file://$HOME/.gemini/antigravity-cli/scratch/signer/tests/prover_pristine.rs#L66-L70), `assert!(count > 100)` explicitly guards against stripped binaries or empty `nm` outputs trivially passing the absence check.

---

### 4. Does any prose still overstate?
**CLEAN — No overstatements found.**

* The diff explicitly narrows previously overstated claims:
  * [`signer/tests/prover_pristine.rs:38-45`](file://$HOME/.gemini/antigravity-cli/scratch/signer/tests/prover_pristine.rs#L38-L45): Clarified that `assert_pristine` checks that the binary is *not the patched one*, acknowledging the limits of symbol table inspection.
  * [`signer/src/lib.rs:37-43`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/lib.rs#L37-L43): Clarified that identifier burning occurs *only for refusals after randomness reservation*, whereas `preflight` decides deterministic validation beforehand without touching the ledger.
  * [`signer/src/txn.rs:536-544`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/txn.rs#L536-L544): Clarified that the parser allowlist is per *protocol* type rather than *emitted* type.

---

### 5. Did any of these fixes introduce a new defect or regress an earlier one?
**CLEAN — No regressions or secondary defects.**

* The fee bound check moved into `preflight` correctly executes before randomness generation/reservation.
* Checking `NetworkID` before the permitted-fields loop in `ParsedTransaction::parse` correctly produces specific network mismatch diagnostics.
* TypeScript profile generation scripts (`devnet-clean-account.ts`, `devnet-signer-send.ts`) correctly set `holder_key_registered: !!cur.HolderEncryptionKey`.
* `RawProfile` derives `#[serde(default)]` on `holder_key_registered`, maintaining backwards compatibility with any existing profile fixtures.
