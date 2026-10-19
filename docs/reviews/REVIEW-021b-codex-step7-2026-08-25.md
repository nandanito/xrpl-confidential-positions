# REVIEW-021b — Codex leg, round one: step 7's ConvertBack and the E-76 migration

- **Date:** 2026-08-25
- **Tool:** `codex exec --sandbox read-only --skip-git-repo-check`, run from the repository with **read access to the source, the vendored `mpt-crypto` at `/tmp/wconf`, and the review rulings**. It read primary sources rather than the packet's summary of them, and said so.
- **Verdict: two MEDIUM and five LOW.** No finding against the proof construction or the field set the builder emits.

> ## Why this leg is the one that earned the round
>
> **Three of its findings match, independently, three the session's own leg had
> already found** — the incomplete migration inventory, the Convert disclosure
> omitting its public amount, and the `rebuild_inner` helper silently dropping
> fields. Independent agreement is the strongest signal this project gets.
>
> **Four are new**, and one of them — Q1-1 — is a real hole in the parse-back
> boundary that neither the session nor the other leg saw.
>
> ⚠ **It also read `git show HEAD:` explicitly** rather than the working tree,
> and noted why: *"I reviewed the two commit objects directly because the
> working tree contains later uncommitted changes."* That is the correct target
> for round one and it is the kind of thing a leg usually gets wrong.

**Dispositions are in `REVIEW-021c`. All seven findings were upheld**; one — Q1-2,
frozen state — is upheld **as a named gap rather than as a fix**, for the reason
the leg itself gave.

---

## Verbatim output

The generated `ConfidentialMPTConvertBack` wire transaction and its proof construction are correct: the builder emits §10.3’s field set, the witness is `(b, ρ, sk_A)`, the remainder proof correctly retains `ρ`, and the balance version is bound and rechecked. I found two MEDIUM and five LOW defects: `parse` does not enforce the complete ConvertBack schema; frozen-state preflight is absent; the `tools/` migration inventory missed a Devnet-submitting harness; three exemptions are broader than their experiments require; and Q7 exposed three low-severity test/disclosure/documentation issues. I reviewed the two commit objects directly because the working tree contains later uncommitted changes.

## Q1. ConvertBack field set

### Finding Q1-1 — `parse` accepts incomplete and wrongly sized ConvertBacks

- **Defect:** The builder emits every required §10.3 field, but `ParsedTransaction::parse` accepts a ConvertBack with no `MPTAmount`, no `BlindingFactor`, no `BalanceCommitment`, or a `ZKProof` of any length.
- **Primary source:** [XLS-0096 §10.3](https://xls.xrpl.org/xls/XLS-0096-confidential-mpt.html) makes those fields required and fixes `BlindingFactor` at 32 bytes, `BalanceCommitment` at 33 bytes, and `ZKProof` at 816 bytes.
- **Evidence:** In target `signer/src/txn.rs`, the proof match records `p.len()` without comparing it to 816; absent `BlindingFactor` becomes `None`; absent `MPTAmount` becomes `AmountView::Unrecovered`; and `BalanceCommitment` is never read after the allowlist.
- **What breaks:** A malformed or internally regressed transaction can cross the parse-back confirmation boundary and be approved even though rippled rejects it. The existing missing-proof test is strong, but equivalent missing-field tests for `MPTAmount`, `BlindingFactor`, and `BalanceCommitment`, plus short/long proof tests, would currently fail to detect acceptance.
- **Severity:** **MEDIUM**, with some uncertainty. The typed builder currently prevents these malformed shapes on the production path, so this is not presently a client-controlled blob injection; however, it defeats the parse-back boundary’s stated purpose if construction later regresses.
- **Remedy:** Require nonzero `MPTAmount`, exactly 32-byte `BlindingFactor`, exactly 33-byte `BalanceCommitment`, and exactly 816-byte `ZKProof` in the ConvertBack parse branch. Add remove/shorten mutation tests.

The rest of the field-set implementation is correct:

- The builder emits the exact §10.3 transaction-specific fields.
- `HolderEncryptionKey` is absent and rejected by the ConvertBack allowlist.
- Convert still rejects `BalanceCommitment`.
- Auditor ciphertext generation is conditional on the issuance’s auditor key and survives the pre-signature issuance-key re-read.
- Holder and issuer ciphertexts are required and checked at 66 bytes.

### Finding Q1-2 — frozen state is not preflighted

- **Defect:** The signer neither reads nor checks the account/token or issuance freeze state for ConvertBack.
- **Primary source:** XLS-0096 §10.4.2 item 9 says a frozen account or issuance returns `terFROZEN`.
- **What breaks:** The signer can draw and reserve randomness, generate a proof, obtain human approval, and return a signed blob that rippled refuses while the relevant state is frozen.
- **Severity:** **LOW**. This is liveness and honest-error reporting, not a confidentiality failure, and the signer does not submit.
- **Remedy:** Not prescribed here without pinning the exact rippled 3.3.0 flag and precedence rules.

I found no other missing §10.4 precondition on the signer’s reachable ConvertBack path.

## Q2. Proof statement and context

**No finding.**

The mapping is exact against the vendored authority:

- [`mpt_utility.h`](/tmp/wconf/mpt-crypto/include/utility/mpt_utility.h:272) defines the balance witness and 816-byte proof.
- [`mpt_utility.cpp`](/tmp/wconf/mpt-crypto/src/utility/mpt_utility.cpp:770) receives the public withdrawal as the standalone `amount`, while `params->amount` is the balance, `params->ciphertext` is the ledger balance ciphertext, and `params->blinding_factor` is `ρ`.
- `prepare_convert_back` constructs `pc_b = bG + ρH`, passes balance `b`, the ledger ciphertext and `ρ`, and separately encrypts public `m` under transaction randomness `r`.
- The Bulletproof uses `b − m` and the same `ρ`. That is correct because `pc_rem = pc_b − mG` leaves the `H` coefficient unchanged.
- ConvertBack context includes `ConfidentialBalanceVersion`; Convert context does not. The pre-signature re-read compares both the version and the balance ciphertext, so it catches movement of the statement after confirmation.

The pristine-verifier wrong-amount and zero-remainder controls are meaningful and support this result.

## Q3. Removing `Refusal::NotImplemented`

**No finding.**

Removing the dead variant was correct. `NotImplemented` had no producer once ConvertBack was built. The signer’s JSON protocol has a closed vocabulary of operations it can grant, rather than the entire XRPL transaction namespace. In that application protocol, `ConfidentialMPTMergeInbox` and `ConfidentialMPTClawback` really are unknown operations, and `REFUSED_MALFORMED` names the rejected string before authority is issued.

An explicit `REFUSED_UNSUPPORTED_OPERATION` could improve capability discovery, but no current client distinction was deleted: MergeInbox and Clawback were not previously producing `REFUSED_NOT_IMPLEMENTED`.

## Q4. `confidential_outstanding`

**No finding.**

The placement and reader are correct:

- Putting the aggregate inside `IssuanceState` would make the whole-struct comparison fire whenever another holder converts, although this transaction binds neither its proof nor its serialization to that aggregate.
- Keeping it on `LedgerSnapshot` does not leave an honest-ledger hole. After `amount ≤ this holder’s balance`, the issuance aggregate must also cover the amount; other holders cannot reduce the aggregate below an unchanged holder balance.
- `u64_amount_field` parses rippled’s decimal JSON string correctly and rejects malformed values.
- The positive control is non-vacuous: with balance and outstanding both six, a reader that silently produced zero would take the refusal branch and fail the expected `signed` assertion.

The outstanding check is therefore a useful inconsistent-read diagnostic, though logically redundant on an internally consistent ledger.

## Q5. `tools/wconf-randomness.ts`

**No finding.**

The implementation is byte-exact against the prose of the [REVIEW-010 ruling]($REPO/docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md:62):

- Correct labels, salt and expand prefix.
- Correct `u32be` framing and field order.
- One 64-byte entropy draw shared by the two roles.
- HMAC-SHA-512 Extract and one-block Expand.
- Big-endian reduction modulo secp256k1 order.
- Zero aborts without a retry loop.
- `randomBytes` failure propagates; there is no fallback or degradation.

I also ran `bun tools/wconf-randomness.ts`; all nine published vectors matched and the zero-scalar control fired.

A third implementation remains a maintenance cost, but fixed independent vectors checked before the first derivation are a sufficient mitigation for this bounded harness module. One comment says failure occurs “at import”; it actually occurs lazily before first derivation. That wording has no behavioral consequence.

## Q6. Migration exemptions and completeness

### Finding Q6-1 — the migration inventory is incomplete

- **Defect:** The four-exemption inventory missed four routes to the same upstream generator, including one unrelated Devnet-submitting harness that should have migrated.
- **Primary source:** REVIEW-010 requires transaction `r`/`ρ` to come from its exact entropy-bound construction; upstream `mpt_generate_blinding_factor` is a different, unruled source.
- **Evidence:** In the target commit:
  - `tools/spike-2026-08-18/devnet-send-our-nonces.ts:79-80` calls `ours("blinding")` for both `r` and `ρ`, then submits the Send.
  - `nonce-crosscheck.ts` calls `patched("blinding")`.
  - `npm-e2e-convert.ts` and `npm-package-test.ts` call `generateBlindingFactor()`.
- **What breaks:** Rerunning `devnet-send-our-nonces.ts` permanently publishes `C₁ = rG` from the unruled source even though the harness’s experiment concerns sigma nonces, not transaction blinding. Consequently E-132’s closure and the packet’s “four exemptions” statement are false. `CLAIMS.md` also says eight harnesses moved while enumerating eight in one directory plus `f23-substituted-key.ts`—nine total.
- **Severity:** **MEDIUM**. Upstream’s generator is not cryptographically weak; the defect is failure of the ruled-source and evidence claims.
- **Remedy:** Compute the Send context first and use `deriveRandomness` in `devnet-send-our-nonces.ts`. Record the local/npm cases as explicit exemptions and gate the inventory by generator pattern, not wrapper name.

The omitted npm and local cases are defensible exemptions:

- `nonce-crosscheck.ts`: local-only proof fixture.
- `npm-package-test.ts`: npm export-surface test.
- `npm-e2e-convert.ts`: deliberately tests that every proof-material component comes from the npm package, although it submits and therefore must be named explicitly.

### Finding Q6-2 — three named exemptions are overbroad

- **Defect:** The deliberate attacks need reuse or mismatched `C₁`, but do not require their ordinary `r` and `ρ` values to come from upstream’s generator.
- **Primary source:** REVIEW-010 rules scalar derivation; E-63 and the C₁ experiments define the intentional misuse separately.
- **What breaks:** The comments claim that ruled derivation would delete the findings. It would not:
  - `reuse-r-setup.ts` can derive a ruled `r` once and intentionally reuse it; its per-transaction `ρ` values have no reason to remain upstream-generated.
  - Both `adj-c1-*` harnesses can derive the control transaction’s `r`/`ρ` normally and derive a second independent scalar for `alt`; the mismatched ciphertext remains mismatched.
- **Severity:** **LOW**. These are deliberate negative harnesses, not signer behavior.
- **Remedy:** Migrate the normal scalar path and preserve only the explicit reuse/substitution as the intentional violation.

The WASM exemption is fully justified because nothing is submitted and the generator symbol itself is under test.

## Q7. Free hunt

### Finding Q7-1 — Convert’s disclosure summary omits its public amount

- **Defect:** The Convert disclosure lists the public blinding factor but omits `MPTAmount`, the principal plaintext disclosure.
- **Primary source:** [XLS-0096 §7.2](https://xls.xrpl.org/xls/XLS-0096-confidential-mpt.html) makes `MPTAmount` a plaintext field on Convert.
- **What breaks:** The summary sentence understates what a public observer learns. The separate amount line does say `PUBLIC`, so the complete screen is not false.
- **Severity:** **LOW**.
- **Remedy:** Name the public amount in the disclosure summary and test all three transaction types, including the negative Send case.

### Finding Q7-2 — `rebuild_inner` silently drops unknown fields

- **Defect:** The helper iterates a hard-coded field list without asserting that every decoded input field was reproduced.
- **Primary source:** The target builder’s Send field set includes `Destination`, `SenderEncryptedAmount`, `DestinationEncryptedAmount`, and `AmountCommitment`; the helper’s list includes none of them.
- **What breaks:** Feeding it a Send silently removes required fields, so a future mutation test can pass because the rebuilt transaction is incomplete rather than because the intended mutation was rejected.
- **Severity:** **LOW**, test infrastructure only. The existing Convert and ConvertBack tests are not vacuous; their actual fields are covered.
- **Remedy:** Fail on every unrecognized decoded key and add a round-trip field-set control.

### Finding Q7-3 — `rebuild-env.sh` contradicts its new backup behavior

- **Defect:** Its header still says `state.json` “CANNOT” be restored and the secrets are “gone for good,” while the same script now restores them from `$BACKUP`.
- **Primary source:** Target `tools/rebuild-env.sh:16-20` versus its restore branch at `:141-153`.
- **What breaks:** The script’s own documentation can cause an operator to treat recoverable Devnet state as irretrievable.
- **Severity:** **LOW**, documentation.
- **Remedy:** Narrow the header to “cannot be reconstructed without an existing backup.”

Finally, the `spendable()` refactor preserves Send’s three branches and amount comparison; I found no Send behavior change there.
