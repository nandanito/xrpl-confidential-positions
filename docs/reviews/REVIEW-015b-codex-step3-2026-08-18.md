<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015b — leg B, architecture §6 step 3

**Date:** 2026-08-18. **Leg:** Codex, via `codex exec --sandbox read-only`, with repository access.
**Target:** the committed diff of `16e2e58`, wiring the vendored prover into the
signer.

**This file is the leg's raw output and is not edited.** Dispositions —
including which findings were refuted and why — are in
`REVIEW-015c-adjudication-step3-2026-08-18.md`. Read the adjudication before
acting on anything here: **two findings in this round were wrong**, and one of
them proposed a field code that would have produced a valid-looking transaction
meaning something else.

---

Found defects, ranked most severe first.

**HIGH — [signer/src/session.rs:163]($REPO/signer/src/session.rs:163), [signer/src/session.rs:273]($REPO/signer/src/session.rs:273)**  
Validation still happens after randomness reservation. `prepare` reserves `r`/`ρ`, then `wire_fields` rejects issuance mismatch, overspend, or missing destination key. That violates the stated order: build and validate plan before entropy and reservation.

Concrete scenario: a same-user hostile process pairs for `ConfidentialMPTSend`, then repeatedly sends amounts above balance or destinations without registered keys. Each request burns four ledger records without ever reaching confirmation or proof generation.

Fix: split `wire_fields` into preflight validation and proof materialization. Check issuance, balance, destination key, operation support, and profile consistency before entropy draw and `store.reserve`.

**HIGH — [signer/src/txn.rs:505]($REPO/signer/src/txn.rs:505)**  
`ParsedTransaction::parse` accepts `MPTAmount` on a `ConfidentialMPTSend` and then treats the amount as `AmountView::Public`. A Send must never confirm a plaintext amount; it must decrypt `SenderEncryptedAmount`.

Concrete scenario: a future serializer bug adds `MPTAmount=1` to a Send whose sender ciphertext encrypts `9999`. The confirmation renders `1 (PUBLIC...)` instead of decrypting the ciphertext. This is exactly the value-shaped confirmation failure the milestone is supposed to prevent.

Fix: make parsing type-specific. For Send, reject `MPTAmount`, `HolderEncryptedAmount`, `BlindingFactor`, etc.; require only the Send field set; always initialize Send amount as unrecovered and decrypt it.

**HIGH — [signer/src/prover.rs:519]($REPO/signer/src/prover.rs:519), [signer/src/txn.rs:302]($REPO/signer/src/txn.rs:302), [signer/src/xrpl.rs:463]($REPO/signer/src/xrpl.rs:463)**  
Auditor ciphertext is generated for the proof participant set but never serialized. `prepare_send` includes an auditor participant when configured, but `WireFields::Send` and the XRPL field table have no `AuditorEncryptedAmount`.

Concrete scenario: an issuance with `AuditorEncryptionKey` produces a proof over four participants, but the transaction only carries sender/destination/issuer ciphertexts. Either rippled rejects the proof/field mismatch, or the auditor mirror silently does not exist on-chain.

Fix: add the auditor encrypted amount field from the codec definitions, serialize it when `auditor_pk` is present, parse it, enforce shared `C1`, and add a vector/live test with an auditor-enabled issuance.

**MEDIUM — [signer/src/main.rs:173]($REPO/signer/src/main.rs:173)**  
Startup promotion errors are ignored: `let _ = s.promote_expired_pending(...)`. If stale pending entries cannot be promoted, the signer still runs.

Concrete scenario: the store opens but the log/header cannot be written due to permissions or disk failure. Expired reservations remain pending instead of burned, but signing continues until a later failure.

Fix: treat promotion failure as a randomness ledger fault and route through A6 acknowledgement or refuse to run.

**MEDIUM — [signer/src/txn.rs:463]($REPO/signer/src/txn.rs:463)**  
The parser accepts `NetworkID` on Devnet. The prose says Devnet transactions carrying `NetworkID: 2` are noncanonical and rejected, but `ParsedTransaction::parse` accepts and renders it.

Concrete scenario: a serializer regression includes `NetworkID=2`; the signer can parse and confirm bytes rippled rejects.

Fix: because this signer is Devnet-only, reject any present `NetworkID`. More generally, reject `NetworkID <= 1024`.

**MEDIUM — [signer/src/xrpl.rs:548]($REPO/signer/src/xrpl.rs:548)**  
`TxBuilder::drops` ORs arbitrary `u64` with the native amount bit and does not bound-check XRP drops. A large profile fee can set invalid amount bits and produce noncanonical bytes.

Concrete scenario: a bad profile sets `fee_drops = u64::MAX`; the signer signs a malformed Amount field that the network rejects.

Fix: make `drops` return `Result`, enforce XRPL native amount bounds, and reject invalid/zero fee values before signing.

**MEDIUM — [signer/tests/prover_pristine.rs:29]($REPO/signer/tests/prover_pristine.rs:29)**  
The “pristine verifier” test does not verify that the binary is pristine. It trusts `WCONF_MPTOOL_PRISTINE` or `/tmp/wconf/mptool-pristine`; the corruption check only proves the verifier is not “OK to everything”.

Concrete scenario: the env var points to the patched verifier or a wrapper with the same behavior on tested cases. All tests pass while the named falsifier no longer exercises pristine upstream.

Fix: verify the binary/library identity before running: pinned digest, build metadata, or a symbol check proving the patched-only `secp256k1_mpt_scalar_reduce64` is absent.

**MEDIUM — [signer/tests/falsifier.rs:96]($REPO/signer/tests/falsifier.rs:96), [signer/tests/support/mod.rs:78]($REPO/signer/tests/support/mod.rs:78)**  
`the_destination_receives_the_amount_the_holder_confirmed` does not decrypt the destination ciphertext. The fixture stores only `destination_pk`, not the destination secret, so the test name overclaims.

Concrete scenario: a regression encrypts the destination amount under the wrong key or wrong amount while sender confirmation still decrypts. This test still passes.

Fix: keep the destination and issuer keypairs in the fixture and decrypt both destination and issuer ciphertexts to the confirmed amount.

**LOW — [signer/tests/signing_path.rs:123]($REPO/signer/tests/signing_path.rs:123)**  
The test suite codifies the bad ordering from the first finding: `a_refusal_after_reserving_still_burns_the_reservation` expects an overspend to reserve before refusal. That makes the implementation defect look intentional.

Fix: replace it with a post-reservation failure that truly cannot be validated earlier, and add a test that overspend/missing destination key leave the ledger unchanged.

No direct FFI buffer-length, struct-layout, or return-code defect was visible from the diff text alone; the FFI concern I found is the falsifier’s identity check, not an unsafe call-site bug.
