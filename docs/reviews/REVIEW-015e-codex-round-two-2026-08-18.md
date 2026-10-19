<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015e-codex-round-two-2026-08-18 — round two, reviewing the FIXES

**Date:** 2026-08-18. **Leg:** Codex via `codex exec --sandbox read-only`. **Target:** the diff of `9d42545`, the
fixes to round one.

This is the round `CLAUDE.md` says is worth having: *"fixing something and
describing the fix are separate acts with separate failure modes."* It found a
defect introduced BY a fix, a new test that passed for the wrong reason, and
four sentences that overstated what the fixes established.

⚠ **One of this round's recommendations is wrong** — see
`REVIEW-015c-adjudication-step3-2026-08-18.md` §3. Read the adjudication first.

---

**Findings**

1. **HIGH: `assert_pristine` still has a false-pass mode.**  
   `signer/tests/prover_pristine.rs` no longer blindly trusts the path, but it now trusts `nm` output from the executable. A patched verifier can pass this check if the patch symbol is stripped, hidden, statically inlined, or lives in a dynamically loaded library rather than the `mptool` binary’s own symbol table. The new test only proves that the current patched binary exposes `secp256k1_mpt_scalar_reduce64`; it does not prove that “absence of that symbol” means pristine upstream. The prose “really is the pristine one” overstates what the check establishes.

2. **MEDIUM: deterministic `drops()` overflow can still fail after randomness reservation.**  
   The new `TxBuilder::drops` bound is good, but it records overflow and refuses only in `serialize()`. Serialization appears to happen inside the post-reservation signing path, after proof material is prepared. So a bad profile fee above `MAX_DROPS` can still burn identifiers before refusal. This is less attacker-controlled than the original request-validation bug, but it contradicts the new “Everything checkable, checked BEFORE any entropy is drawn” claim.

3. **MEDIUM: the auditor test can pass while the confirmation still hides the auditor.**  
   `an_auditor_enabled_issuance_puts_the_auditor_ciphertext_on_the_wire` checks wire presence, shared `C1` with sender, decryptability, and parseability. Those are valuable. But the comment says “the confirmation must say so,” and the test never asserts rendered confirmation text mentions the auditor or third-party decryptability. If `confirm::render` still omits that fact, this test passes for the wrong reason.

4. **MEDIUM: `ParsedTransaction::parse` still accepts `ConvertBack` even though the signer refuses to emit it.**  
   The allowlist permits `TxType::ConvertBack` with Convert-like fields. That may be intentional for a future parser, but it conflicts with the parse doc claim that it permits fields “this signer emits for this transaction type.” Today the signer emits no `ConvertBack`. Either parse should refuse unsupported transaction types, or the prose should narrow the claim.

5. **LOW: the `NetworkID` rejection test is weaker than the fix claim.**  
   The allowlist rejects `NetworkID` before the Devnet-specific `NetworkID` block can run, so that tailored error path is effectively unreachable. The test only asserts `is_err()` on a transaction that is also missing required fields. It should assert the error is specifically about `NetworkID` or “may not carry.”

**Fix Correctness**

The core preflight split is mostly right: issuance is now checked once for both Send and Convert, Send destination key lookup is carried forward in `Preflight::Send`, and I do not see a duplicated validation path with an obvious chance to disagree. The remaining gap is deterministic serialization failure, especially `drops()` overflow, after reservation.

The Send/Convert allowlist is broadly right for fields the signer emits. It now rejects `MPTAmount` on Send, and the amount rendering is keyed by transaction type rather than field presence, which addresses the plaintext Send failure.

The auditor ciphertext fix looks correct at the wire level. `AuditorEncryptedAmount` is added as Blob nth 43, canonical field sorting handles position, `WireFields::Send` carries it, the builder serializes it when present, and parse includes it in the shared-`C1` ciphertext set.

**New Tests**

`the_pristine_identity_check_rejects_the_patched_binary`: valuable but not sufficient; can pass while the identity check remains bypassable.

`a_request_refusable_before_signing_never_touches_the_randomness_ledger`: good for overspend, unknown destination, and foreign issuance. It does not cover deterministic signer/profile serialization failures like an excessive Fee.

`an_auditor_enabled_issuance_puts_the_auditor_ciphertext_on_the_wire`: good wire/proof-adjacent test, but false-passes the stated confirmation disclosure requirement.

`a_transaction_carrying_a_field_this_type_may_not_have_is_refused`: good for `MPTAmount` on Send. The `NetworkID` half is under-asserted.

`base58check_round_trips_over_a_wide_spread_of_payloads`: by itself it is self-consistency, but the added reference-vector test makes the refutation much stronger.

**Refutations**

10 is correct. XRPL native XRP Amount zero is encoded with the positive bit set: `4000000000000000`, not eight zero bytes.

11 is also correct. For a non-zero base-58 integer, the most significant digit cannot be the zero digit in canonical encoding; trimming zero digits from the most-significant side only removes representation padding. The round-trip spread plus reference vectors are reasonable evidence.

**Prose Overclaims**

The main overclaims are: “really is pristine” for the symbol-table check, “Everything checkable” before entropy despite `drops()` overflow, “burns them on any refusal” despite preflight refusals intentionally burning nothing, and the auditor test comment claiming confirmation disclosure without asserting it.
