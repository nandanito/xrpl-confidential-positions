<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015g-codex-round-three-2026-08-19 — round three, the fixes nobody had seen

**Date:** 2026-08-19. **Leg:** Codex via `codex exec --sandbox read-only`. **Target:** the diff of `0955d7b` — round
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

No tools used.

**Findings**

1. [signer/src/txn.rs]($REPO/signer/src/txn.rs:594): `ParsedTransaction::parse` applies the Convert `HolderEncryptionKey`/`ZKProof` pairing rule to every non-Send transaction via `_`, which includes `ConvertBack`. If `ConvertBack` is valid with `ZKProof` and no `HolderEncryptionKey`, this now rejects valid protocol bytes; if `ConvertBack` requires a proof, it also now accepts one with neither. The nearby prose says parse covers `ConvertBack`, so this is a real regression unless XLS-0096 gives `ConvertBack` the same pairing rule.

2. [signer/src/holder.rs]($REPO/signer/src/holder.rs:84): `holder_key_registered` defaults to `false`. That means an older or incomplete profile for a holder whose key is already on-ledger silently takes the initializing branch and emits `HolderEncryptionKey` + `ZKProof`, hitting the duplicate-key path the fix is meant to avoid. If the profile is the source of truth, this field should probably be required, or the profile schema should make “unknown” impossible.

3. [signer/tests/falsifier.rs]($REPO/signer/tests/falsifier.rs:221): `a_convert_on_an_auditor_enabled_issuance_carries_the_auditor_ciphertext` proves the auditor field exists, decrypts to the amount, and reaches confirmation. It does not independently lock the shared-`C1` invariant; it could pass if the auditor ciphertext used independent randomness and the parser forgot to include it in the `C1` set. The implementation currently does include it, but the test is weaker than the claim. Add either a direct `aud[..33] == parsed.c1` assertion or a poisoned-auditor-C1 parse rejection.

4. [signer/README.md]($REPO/signer/README.md:373): “XLS-0096 §7.2 requires it there” is compressed enough to read as unconditional. The actual rule is conditional on the issuance having `sfAuditorEncryptionKey`. I would change it to “requires it there when the issuance has an auditor key.”

**Claim Checks**

Claim 1 is implemented correctly in code: Convert emits `AuditorEncryptedAmount` when `holder.auditor_encryption_key` is present, the builder serializes it when present, and parse includes it in the shared ciphertext set before the `C1` consistency check. I see no position issue from this diff, assuming `TxBuilder` canonicalizes field order as the rest of the tests imply.

Claim 2 is correct for signer-emitted Converts: session creates `HolderEncryptionKey` and `ZKProof` together when not registered, omits both when registered, and `builder` refuses mismatched `WireFields::Convert`. Parser enforces the same pairing for Convert, but over-enforces it for `ConvertBack` as noted above. I do not see a path where the signer emits a Convert that its parser cannot parse.

The rebuilt `NetworkID` helper is materially better: it first proves the unpoisoned rebuild parses, then adds one field and asserts the specific `NetworkID` error. `a_convert_registers_the_key_once_and_never_again` and `a_send_without_an_auditor_does_not_claim_one` do not appear to pass for the old wrong reasons. The remaining weak test is the auditor Convert shared-`C1` gap above.
