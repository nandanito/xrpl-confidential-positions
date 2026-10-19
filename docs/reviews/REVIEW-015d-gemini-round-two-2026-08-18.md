<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015d-gemini-round-two-2026-08-18 — round two, reviewing the FIXES

**Date:** 2026-08-18. **Leg:** Gemini via `agy --effort high`. **Target:** the diff of `9d42545`, the
fixes to round one.

This is the round `CLAUDE.md` says is worth having: *"fixing something and
describing the fix are separate acts with separate failure modes."* It found a
defect introduced BY a fix, a new test that passed for the wrong reason, and
four sentences that overstated what the fixes established.

⚠ **One of this round's recommendations is wrong** — see
`REVIEW-015c-adjudication-step3-2026-08-18.md` §3. Read the adjudication first.

---

# REVIEW-015 Round Two — Review of the Fixes

---

### Executive Summary

- **Refutations 10 and 11 are both mathematically and canonically CORRECT.**
- **The fixes contain one new defect:** `AuditorEncryptedAmount` was erroneously added to `permitted_fields` for `Convert`/`ConvertBack`, allowing an unvalidated, unrendered auditor ciphertext to bypass `parse`.
- **One new test has a false-claim / missed assertion:** `an_auditor_enabled_issuance_puts_the_auditor_ciphertext_on_the_wire` claims in its comment that the confirmation informs the holder of the auditor, but neither does the test check this nor does `ParsedTransaction` even store auditor presence.
- **`assert_pristine` contains a blindspot:** A stripped or hidden-visibility patched binary will pass as pristine.
- **Dead code:** The explicit `NetworkID` check in `ParsedTransaction::parse` is unreachable because the field allowlist rejects it first.

---

## 1. Are the fixes actually correct?

### (a) The `preflight` Split
**Status: Correct (with one minor structural caveat).**
- **No failure before reservation:** `preflight` checks issuance matching, `amount <= balance` (for Send), destination address encryption key presence (for Send), and refuses `ConvertBack`. If any check fails, `Session::prepare` returns before drawing entropy or reserving ledger identifiers.
- **No double derivation / drift:** `preflight` returns `Preflight::Send { destination_pk }`. `wire_fields` consumes this directly instead of looking up keys again, eliminating key resolution divergence.
- **Caveat:** `TxBuilder::drops` overflow (`fee > MAX_DROPS`) is detected during serialization inside `prove_confirm_and_sign`, *after* reservation. However, this represents an invalid signer configuration rather than client-request validation, so burning on ledger error is acceptable.

### (b) Per-Type Field Allowlist in `ParsedTransaction::parse`
**Status: Flawed — introduces a new bypass on `Convert`.**
- **Defect in `permitted_fields`:** In [`signer/src/txn.rs`](file://$HOME/.gemini/antigravity-cli/signer/src/txn.rs#L488-L495), `xrpl::AUDITOR_ENCRYPTED_AMOUNT` was added to `TxType::Convert | TxType::ConvertBack`. But:
  1. The signer never generates or emits `AuditorEncryptedAmount` on a `Convert`.
  2. `ParsedTransaction::parse` lines 569–573 checks shared-$C_1$ on `[ISSUER_ENCRYPTED_AMOUNT]` only for Convert.
  3. `ParsedTransaction` does not store or render `AuditorEncryptedAmount`.
  - **Result:** A poisoned `Convert` transaction carrying an arbitrary `AuditorEncryptedAmount` will pass `parse` without failing the allowlist, without having its $C_1$ checked, and without appearing on the confirmation screen.
- **Dead Code:** `d.u32(xrpl::NETWORK_ID)` (lines 528–537) is unreachable because `NETWORK_ID` is not in `permitted_fields(tx_type)`; the loop above it rejects the field with a generic error first.

### (c) The Auditor Ciphertext
**Status: Correct for `Send`.**
- **Position & Serialization:** `nth: 43` with `Kind::Blob` (type code 7) is canonically sorted by `(type_code, nth)` between `DestinationEncryptedAmount` (7, 41) and `AmountCommitment` (7, 45).
- **Shared-$C_1$ Check:** On `TxType::Send`, if `AuditorEncryptedAmount` is present, it is pushed to `others` and checked against `sender_ct[..33]`.

---

## 2. Can any of the NEW tests pass for the wrong reason?

### 1. `an_auditor_enabled_issuance_puts_the_auditor_ciphertext_on_the_wire` (CRITICAL Test Gap / False Claim)
In [`signer/tests/falsifier.rs`](file://$HOME/.gemini/antigravity-cli/signer/tests/falsifier.rs#L179-L182):
```rust
// ⚠ And the confirmation must say so. A third party who can decrypt every
// amount is exactly the kind of thing a holder must not have to infer.
assert!(ParsedTransaction::parse(&blob).is_ok(), "the four-field Send does not re-parse");
```
- **Why it passes for the wrong reason:** The test claims the confirmation warns the user about the auditor. However, it **never inspects the confirmation recorder** (`c.seen` or `c.last()`). Furthermore, `ParsedTransaction` does not even have an `auditor` field, and `confirm::render` contains no logic to mention an auditor. The test passes merely because `parse` does not error on re-parsing the blob.

### 2. `a_transaction_carrying_a_field_this_type_may_not_have_is_refused` (False Pass on NetworkID)
In [`signer/tests/falsifier.rs`](file://$HOME/.gemini/antigravity-cli/signer/tests/falsifier.rs#L229-L236):
```rust
let with_net = xrpl::TxBuilder::new()
    .u16(xrpl::TRANSACTION_TYPE, xrpl::tx_type::CONFIDENTIAL_MPT_SEND)
    .u32(xrpl::NETWORK_ID, 2)
    .serialize(false)
    .unwrap();
assert!(ParsedTransaction::parse(&with_net).is_err(), "NetworkID was accepted");
```
- **Why it passes for the wrong reason:** `with_net` is missing mandatory fields (`Account`, `Sequence`, etc.) and triggers the generic unknown-field error from `permitted_fields`. It does *not* test the dedicated `NetworkID` refusal branch in `ParsedTransaction::parse`.

### 3. `the_pristine_identity_check_rejects_the_patched_binary` / `assert_pristine` (Symbol Visibility Blindspot)
In [`signer/tests/prover_pristine.rs`](file://$HOME/.gemini/antigravity-cli/signer/tests/prover_pristine.rs#L47-L67):
- `assert_pristine` searches `nm` output for `secp256k1_mpt_scalar_reduce64` (a private/internal C symbol) and `mpt_verify_send_proof` (a public API export).
- **False-pass mode:** If a patched `mptool` binary is compiled with default release stripping (`strip`) or `-fvisibility=hidden`, local C symbols like `secp256k1_mpt_scalar_reduce64` are omitted from the symbol table while `mpt_verify_send_proof` remains in the dynamic export table. Such a patched binary will pass `assert_pristine` without panicking.

### 4. `a_request_refusable_before_signing_never_touches_the_randomness_ledger`
**Status: Clean.**
- Accurately verifies that `store.len() == 0` for overspends, unkeyed destinations, and foreign issuances across both `Send` and `Convert`.

### 5. `base58check_round_trips_over_a_wide_spread_of_payloads`
**Status: Clean.**
- While round-trip tests can theoretically mask symmetric codec bugs, this test is backed by `base58check_agrees_with_the_reference_codec_on_every_vector_key`, which tests against authoritative vectors generated by `ripple-address-codec`.

---

## 3. Are the two refutations (10, 11) correct?

### Refutation 10: Zero XRP Drops Amount Bit 62
**Status: CORRECT (Refutation stands).**
- In the XRPL binary codec specification (`rippled` / `ripple-binary-codec`):
  - Native XRP amounts (drops) use 64-bit integers where bit 63 is `0` (not issued currency) and bit 62 is `1` (positive / non-negative amount).
  - A zero drops fee is encoded canonically as `0x4000000000000000` (`Fee: "0"`).
  - Encoding zero as eight zero bytes (`0x0000000000000000`) is non-canonical and rejected by `rippled`.

### Refutation 11: Base58 Trailing Cleanup
**Status: CORRECT (Refutation stands).**
- In XRPL Base58Check:
  - Account IDs are 20 bytes, prepended with a `0x00` version byte, plus a 4-byte checksum (25 bytes total).
  - The leading zero bytes (at least the version byte `0x00`) are mapped directly to leading `'r'` characters.
  - The remaining integer value $V$ is strictly positive ($V > 0$). In base 58, the most significant non-zero digit of any positive integer cannot be 0 (`'r'`).
  - Therefore, trailing zero characters in the division buffer represent unused high-order padding, not legitimate payload digits. Stripping them is correct.

---

## 4. Prose Overstatements

1. **[`signer/tests/falsifier.rs:179-180`](file://$HOME/.gemini/antigravity-cli/signer/tests/falsifier.rs#L179-L180):**
   > *"⚠ And the confirmation must say so. A third party who can decrypt every amount is exactly the kind of thing a holder must not have to infer."*
   - **Overstatement:** The implementation does not render auditor visibility on the confirmation UI, and `ParsedTransaction` does not store auditor presence.
2. **[`signer/src/txn.rs:460-463`](file://$HOME/.gemini/antigravity-cli/signer/src/txn.rs#L460-L463):**
   > *"Refuses a transaction carrying a field this signer does not itself emit **for this transaction type**, rather than ignoring it..."*
   - **Overstatement:** As noted in §1(b), `permitted_fields` permits `AuditorEncryptedAmount` on `Convert`, which the signer never emits for that type.

---

## 5. Summary of New Defects (Ranked by Severity)

### [HIGH] 1. `AuditorEncryptedAmount` Permitted on `Convert` Without Validation
- **Location:** [`signer/src/txn.rs:488-495`](file://$HOME/.gemini/antigravity-cli/signer/src/txn.rs#L488-L495)
- **Problem:** `permitted_fields(TxType::Convert)` allows `AUDITOR_ENCRYPTED_AMOUNT`, but `WireFields::Convert` does not emit it, `ParsedTransaction::parse` does not check shared-$C_1$ for it on Convert, and `confirm::render` does not show it.
- **Remedy:** Remove `xrpl::AUDITOR_ENCRYPTED_AMOUNT` from the `TxType::Convert | TxType::ConvertBack` arm in `permitted_fields`.

### [MEDIUM] 2. Dead Code in `ParsedTransaction::parse` for `NetworkID`
- **Location:** [`signer/src/txn.rs:528-537`](file://$HOME/.gemini/antigravity-cli/signer/src/txn.rs#L528-L537)
- **Problem:** `d.u32(xrpl::NETWORK_ID)` is unreachable because `NETWORK_ID` is omitted from `permitted_fields`, causing the allowlist check to abort first.
- **Remedy:** Either handle `NETWORK_ID` explicitly with its dedicated error before the allowlist loop, or remove the redundant block.

### [LOW] 3. Symbol Stripping Blindspot in Pristine Falsifier
- **Location:** [`signer/tests/prover_pristine.rs:47-67`](file://$HOME/.gemini/antigravity-cli/signer/tests/prover_pristine.rs#L47-L67)
- **Problem:** `assert_pristine` relies on unstripped `nm` symbol names. Stripped patched binaries falsely pass as pristine.
- **Remedy:** Assert that symbol extraction via `nm` returns non-empty local symbols before asserting on symbol absence.
