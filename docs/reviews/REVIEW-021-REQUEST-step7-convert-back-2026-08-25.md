# Review packet — `ConfidentialMPTConvertBack`, and E-76's `tools/` migration

- **Date:** 2026-08-25
- **What this is:** round one of an adversarial review of the code that opened architecture §6 step 7. **Two commits, `aa1f349` and `e685cab`, on branch `step7-convert-back-and-e76`.**
- **Round two will review the FIXES**, and that is this project's rule, not a formality.

> ## Read this first — the failure this review exists to catch has already happened once
>
> `REVIEW-015` **round three** was run against this project's own two-round rule, because round two's fixes had changed a transaction's **wire format on the adjudicator's own reading of the specification, with no second reader**. It found that `parse` had been giving `ConfidentialMPTConvertBack` the field set of `ConfidentialMPTConvert`, which XLS-0096 §10.3 contradicts in three places. A **valid** ConvertBack would have been rejected twice over, and an **invalid** one — carrying a key that transaction cannot register — accepted. `CLAIMS.md` E-96.
>
> **The session under review has just implemented that entire field set, on one person's reading of §10.3, with no second reader.** That is the same condition, one layer further in. Treat §10.3 as the primary source and the code as the claim.

---

## 0. Where this project stands, in one screen

A receivables financing facility on XLS-0096 Confidential MPTs, XRPL Devnet, built as an **honesty artifact** rather than a deployable product. Amounts are hidden from the public; **identities, counterparties, timing and frequency are not, and the issuer can always decrypt** (`CLAIMS.md` P-4, P-9, P-11).

`signer/` is a Rust binary on the holder's machine. It reads the ledger over JSON-RPC, derives its ElGamal key from the XRPL master seed under a ruled construction, generates real proofs against a vendored patched `mpt-crypto`, signs real transactions — and **does not submit**. Architecture §6 steps 1, 2, 3, 4 and 6 are built, each reviewed in two rounds and executed on Devnet.

**Step 7 is the facility as application logic, and it is still gated.** Three things stood in front of it; this session took the two that were code. The third — `CLAIMS.md` B-15's requirement that the facility not run against a single remote ledger endpoint — was **deliberately not decided**, and is handed over in `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md`.

---

## 1. What changed

| | |
|---|---|
| **`ConfidentialMPTConvertBack`** | Built. Previously **refused by name** in three places. XLS-0096 §10.3's field set, the 816-byte proof, the `(b, ρ, sk_A)` witness, three new preconditions. Executed twice on Devnet |
| **`Refusal::NotImplemented` removed** | Building ConvertBack made it unreachable — it had exactly one producer. The variant was **deleted** rather than left as a refusal code no client can receive |
| **`confidential_outstanding` added to the ledger read** | A new field on `LedgerSnapshot`, **deliberately not on `IssuanceState`** |
| **E-76's `tools/` migration** | Eight harnesses moved from upstream's `mpt_generate_blinding_factor` to the ruled `r`/`ρ` derivation, via a new `tools/wconf-randomness.ts`. Four call sites deliberately exempt |
| **`tools/rebuild-env.sh`** | Could not recover a partially-cleaned `/tmp`; now can, and keeps a `state.json` backup outside `/tmp` |
| **Documents** | `CLAIMS.md` E-129…E-134 and F-24; architecture rev 6; the facility walkthrough's §3 step 9 and §4 table corrected |

**244 tests, five consecutive clean runs**, plus four live Devnet tests. Eight fixes were spot-checked by reverting them; **two reverts did not compile on the first attempt and were redone**.

---

## 2. THE QUESTIONS — in priority order

### Q1 (highest value). Is the ConvertBack field set right, against §10.3 and nothing else?

**§10.3's table is reproduced verbatim in §5 below. Use it. Do not reconstruct the field list from this project's own review notes** — that is the corrupted-source failure `CLAUDE.md` names, and it is how the original defect survived.

Check specifically:

- Every **required** field is emitted, and nothing outside the permitted set is accepted by `parse`.
- The **three differences from Convert** are real and enforced *in both directions*: `ZKProof` required at 816 bytes here vs optional at 64 there; **no `HolderEncryptionKey` field at all** here; `BalanceCommitment` required here and absent from Convert entirely.
- `AuditorEncryptedAmount` — the spec makes it **conditional** on the issuance carrying `sfAuditorEncryptionKey`. ⚠ A `REVIEW-015` leg previously recommended removing auditor support from `Convert` and was **wrong**; the same trap exists here in reverse.
- Anything §10.4.1 or §10.4.2 refuses that the signer does not.

### Q2. Is the proof bound to the right statement?

`mpt_get_convert_back_proof(priv, pub, context_hash, amount, params, out_proof)`. The vendored C is at `/tmp/wconf/mpt-crypto/src/utility/mpt_utility.cpp:770`; its header is `include/utility/mpt_utility.h:271`.

- The witness is `(b, ρ, sk_A)` — **the balance, not the amount being withdrawn**. `amount` is the public `m`.
- `params->amount` is the **balance**; `params->blinding_factor` is `ρ`; `params->ciphertext` is the on-ledger `ConfidentialBalanceSpending`.
- ⚠ **`ρ` is used twice**: once as `pc_b`'s blinding in the sigma proof, and again as the blinding of the **remainder** Bulletproof over `b − m`, because `pc_rem = pc_b − m·G` keeps `pc_b`'s blinding. **Is that reading right, and is `prepare_convert_back` consistent with it?**
- The context hash includes `ConfidentialBalanceVersion` for ConvertBack and **not** for Convert. Is that asymmetry handled correctly end to end, including in the pre-signature re-read?

### Q3. Was removing `Refusal::NotImplemented` right, or did it delete a distinction a client needs?

`signer/README.md` documents the refusal codes as *"distinct by design"* so a client *"can only decline to collapse errors it can tell apart"*. ConvertBack was that code's **only** producer.

An operation this signer does not build — `ConfidentialMPTMergeInbox`, `ConfidentialMPTClawback`, both real XLS-0096 transactions — is now refused as `REFUSED_MALFORMED` *"unknown operation"*, **before a grant can be minted**.

**Is `REFUSED_MALFORMED` the honest answer for a real protocol transaction this signer chooses not to build?** Argue it either way; the session's reasoning is in `signer/src/protocol.rs`'s replacement comment and `CLAIMS.md` E-130.

### Q4. Is `confidential_outstanding` in the right place, and is the check load-bearing?

It is a field of `LedgerSnapshot` and **deliberately not of `IssuanceState`**, because `binding_differs` compares `IssuanceState` **whole** and this number moves whenever *any* holder converts — none of which a transaction of ours binds to. The session's claim is that putting it in `IssuanceState` would turn a busy ledger into spurious `REFUSED_LEDGER_MOVED`.

- Is that right, or does keeping it out leave a hole?
- ⚠ It is read as a **JSON string**, as rippled serialises every `UINT64`. Reading it with a numeric helper returns `None` → **0** → *every* value looks absent, and a precondition that always passes looks identical to one that works. Is `u64_amount_field` correct, and is `the_confidential_outstanding_check_is_not_reading_every_value_as_zero` actually a control or is it vacuous?
- ⚠ `REVIEW-016` found **five** defects on this exact read path, including one both legs found independently. Assume nothing about it.

### Q5. Is `tools/wconf-randomness.ts` a faithful third implementation?

REVIEW-010's ruled `r`/`ρ` derivation now has **three** implementations: `signer/src/randomness.rs`, the KAT at `tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts`, and this new one. `REVIEW-005c`'s lesson is that a second copy of a construction is a divergence waiting to happen.

The mitigation is that the new module **reproduces all nine published vectors before it will derive anything**, and asserts its own zero-scalar abort fires.

- Is that mitigation sufficient, or is a third copy still the wrong shape?
- Is the derivation itself byte-exact against the ruling? The construction is in `docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md` — **read the prose, not the other implementations**.
- ⚠ **Entropy failure must ABORT, not degrade**, and a zero scalar must abort **and never retry with the same entropy**. This is the opposite of the sigma-nonce rule and of keygen's total reduction, and all four are correct. Confirm this module has the right one of the four.

### Q6. Are the four exemptions from the migration correct?

Four call sites still call upstream's `mpt_generate_blinding_factor` and each carries a comment saying why:

- `spike-randomness-2026-08-18/reuse-r-setup.ts` — reuses one `r` across two Sends **on purpose**; that is `CLAIMS.md` E-63, an executed attack.
- `spike-2026-08-17/adj-c1-verify.ts` and `adj-c1-shared-blinding.ts` — need an `alt` scalar deliberately **unequal** to the transaction's `r`.
- `spike-2026-08-17/wasm-test.ts` — tests the WASM **export surface**, of which that symbol is one.

**Is each exemption justified, and is the list complete?** A migrated site that should have been exempt, or an exempt site that should have been migrated, are different defects.

### Q7. Free hunt.

Anything else. The session's own highest-suspicion areas, offered honestly:

- The `spendable()` helper factored out of `preflight`, now shared by Send and ConvertBack — did the refactor change Send's behaviour?
- `parse`'s `proof_len` match, restructured from two arms to six.
- `rebuild_inner` in `tests/convert_back.rs` — a test helper that reconstructs a transaction to add or drop one field. **A test helper that is subtly wrong makes every test using it vacuous**, which is the `t-nbound.c` failure `REVIEW-009` §8 found.

---

## 3. ⚠ DO NOT RELITIGATE THESE

Settled, with reasons recorded. Reopening one costs this project a round and has happened five times.

| | Why it is settled |
|---|---|
| **There are FOUR randomness rules and they differ deliberately** | Sigma nonces **degrade** on entropy failure; `r`/`ρ` **refuse to sign**; the ECDSA nonce **degrades**; keygen **has no failure path at all**. Entropy is a *hedge* in the first and third and *the source* in the second; keygen's input is a **fixed seed**, so an abort would be permanent. Architecture §4. **Two previous attempts to merge these were rejected** |
| **`scalar::reduce_wide` returns `Result`; `keygen`'s `reduce_wide_total` returns a bare `Scalar`** | Ruled asymmetry, not an oversight. See above |
| **The signer does not submit** | ADR-0001. A submitter is one of B-15's step-7 options and is **handed over**, not decided. Architecture §1 says both halves of that sentence are load-bearing |
| **`lsfDisableMaster` branches in three places; a regular key and a signer list in exactly one** | rippled `Transactor.cpp:1039-1045` accepts a master-key signature regardless of a regular key or a signer list, so refusing on them at signing time would refuse transactions the ledger applies. A `REVIEW-016` leg proposed the broader check and was narrowed |
| **`Scalar` has no constructor from bytes** | Deliberate: a `Scalar` is only ever the output of a reduction, which is what stops a caller supplying one. A test needing one is not a reason to add one |
| **`NetworkID` is omitted on Devnet and the confirmation says "not in this transaction"** | `CLAIMS.md` F-21, observed. A number that did not come out of the transaction's bytes may not appear on the confirmation screen |

---

## 4. What a finding must look like

This project has had **five** review findings whose diagnosis was right and whose remedy was backwards, or whose premise was simply false — most recently a leg whose only HIGH was that a line *"cannot compile"* when the type in question is `Copy` and every build of the crate is the counterexample.

So, for each finding:

1. **The defect**, in one sentence.
2. **The primary source that establishes it** — §10.3, the vendored C, the ruling's prose, rippled at `3.3.0`. Not "this looks wrong".
3. **What breaks, concretely.** A transaction that is rejected, a proof that fails, an amount that leaks, a claim that is false.
4. **Severity**, and say if you are unsure.
5. ⚠ **A remedy is optional and a wrong one is expensive.** If you are not certain, say what is wrong and stop.

**Say when you find nothing.** A leg that reports the code correct on a question is a result, and both legs agreeing is the strongest signal this project gets.

---

## 5. XLS-0096 §10.3, verbatim

Fetched from `XRPLF/XRPL-Standards`, `XLS-0096-confidential-mpt/README.md`, 2026-08-24, 86,456 bytes. **The specification text is not committed to this repository**; this is the primary source for Q1.

```
### 10.3. Fields

| Field Name               | Required? | JSON Type | Internal Type | Description |
| `TransactionType`        | Yes       | string    | UINT16        | Identifies this as a ConfidentialMPTConvertBack, which is 87. |
| `Account`                | Yes       | string    | ACCOUNTID     | The account performing the conversion. |
| `MPTokenIssuanceID`      | Yes       | string    | UINT192       | The unique identifier for the MPT issuance. |
| `MPTAmount`              | Yes       | number    | UINT64        | The plaintext amount to credit to the public balance. |
| `HolderEncryptedAmount`  | Yes       | string    | BLOB          | A 66-byte ciphertext to be subtracted from the holder's sfConfidentialBalanceSpending. |
| `IssuerEncryptedAmount`  | Yes       | string    | BLOB          | A 66-byte ciphertext to be subtracted from the issuer's mirror balance. |
| `BlindingFactor`         | Yes       | string    | UINT256       | The 32-byte scalar value used to encrypt the amount. Used by validators to verify the ciphertexts match the plaintext MPTAmount. |
| `AuditorEncryptedAmount` | No        | string    | BLOB          | A 66-byte ciphertext for the auditor. **Required** if sfAuditorEncryptionKey is present on the issuance. |
| `BalanceCommitment`      | Yes       | string    | BLOB          | A 33-byte cryptographic commitment to the user's confidential spending balance. |
| `ZKProof`                | Yes       | string    | BLOB          | An 816-byte bundle containing a compact sigma proof (128 bytes, proving balance ownership and key linkage) and a single Bulletproof range proof (688 bytes, proving the remaining balance is non-negative). |

### 10.4.1. Data Verification (temMALFORMED / temBAD_* )
1. The ConfidentialTransfer feature is not enabled. (temDISABLED)
2. The account submitting the transaction is the Issuer. (temMALFORMED)
3. The BlindingFactor is not exactly 32 bytes. (temMALFORMED)
4. Ciphertext lengths or formats are invalid. (temBAD_CIPHERTEXT)
5. MPTAmount is zero or greater than the maximum allowable supply. (temBAD_AMOUNT)

### 10.4.2. Protocol-Level Failures
1. The MPToken or MPTokenIssuance does not exist. (tecOBJECT_NOT_FOUND)
2. The issuance does not have lsfMPTCanHoldConfidentialBalance set. (tecNO_PERMISSION)
3. The user's MPToken is missing sfConfidentialBalanceSpending or sfHolderEncryptionKey. (tecNO_PERMISSION)
4. The issuance has sfAuditorEncryptionKey set, but the transaction does not include sfAuditorEncryptedAmount. (tecNO_PERMISSION)
5. The global sfConfidentialOutstandingAmount is less than the requested MPTAmount. (tecINSUFFICIENT_FUNDS)
6. The BlindingFactor fails to verify the integrity of the ciphertexts. (tecBAD_PROOF)
7. The ZKProof fails the compact sigma proof check. (tecBAD_PROOF)
8. The ZKProof fails the Bulletproof range proof check. (tecBAD_PROOF)
9. The account or issuance is frozen. (terFROZEN)

### 10.5. State Changes
- Public Balance: the user's sfMPTAmount is increased by MPTAmount.
- Global Supply: sfConfidentialOutstandingAmount on the issuance is decreased by MPTAmount.
- Spending Balance: sfConfidentialBalanceSpending is updated via homomorphic subtraction of HolderEncryptedAmount.
- Issuer Mirror: sfIssuerEncryptedBalance is updated via homomorphic subtraction of IssuerEncryptedAmount.
- Version: sfConfidentialBalanceVersion is incremented by 1.
```

**And §7.2, `ConfidentialMPTConvert`, for the contrast** — the field set ConvertBack was wrongly given:

```
| HolderEncryptionKey | No  | BLOB | The holder's ElGamal public key. Required if initializing (no key registered). Forbidden if key already registered. |
| ZKProof             | No  | BLOB | A Schnorr Proof of Knowledge (PoK). Required only when HolderEncryptionKey is present. MUST be absent when HolderEncryptionKey is absent. |
(§7.3.1 item 6: the length of sfZKProof is not exactly 64 bytes -> temMALFORMED)
(no BalanceCommitment field exists on a Convert)
```

---

## 6. The vendored prover, verbatim

`/tmp/wconf/mpt-crypto/src/utility/mpt_utility.cpp:770` — the function being wrapped. **This is the authority for Q2.**

```c
int mpt_get_convert_back_proof(
    uint8_t const priv[32], uint8_t const pub[33],
    uint8_t const context_hash[32], uint64_t const amount,
    mpt_pedersen_proof_params const* params, uint8_t out_proof[816])
{
    if (!priv || !pub || !context_hash || !params || !out_proof) return -1;
    if (amount > params->amount) return -1;
    /* ... parse pub -> pk, params->ciphertext -> (b1,b2),
           params->pedersen_commitment -> pc_b ... */
    if (secp256k1_compact_convertback_prove(
            ctx, out_proof, params->amount, priv, params->blinding_factor,
            &pk, &b1, &b2, &pc_b, context_hash) != 1) return -1;

    uint64_t const remaining_balance = params->amount - amount;
    uint8_t* bp_ptr = out_proof + SECP256K1_COMPACT_CONVERTBACK_PROOF_SIZE;
    size_t bp_len = kMPT_SINGLE_BULLETPROOF_SIZE;
    uint8_t const* blinding_ptrs[1] = {params->blinding_factor};
    return mpt_get_bulletproof_agg(&remaining_balance, blinding_ptrs, 1,
                                   context_hash, bp_ptr, &bp_len);
}
```

`mpt_pedersen_proof_params` is `{ pedersen_commitment[33]; amount; ciphertext[66]; blinding_factor[32]; }`.

⚠ **Note `params->amount` is the BALANCE and the bare `amount` argument is the public withdrawal.** The two are one letter apart in the C and mean opposite things.

`tools/spike-2026-08-18/vendor-verify.sh` independently asserts:
`PASS: ConvertBack passes sk_offset=64 for its (b, rho, sk_A) witness order` — where every other compact proof passes `sk_offset=0`.

---

## 7. What was executed, so a leg knows what is claimed

- Two ConvertBacks on Devnet, **validated**: 95 (`34117EFEFE2EFE5446B5C3C66F8089C99298637D4E315B16780F82D77ABD7FB0`, ledger 4743286) and the **entire remaining balance**, 191 (`C34363951C527E357E248B8D78712BF1740B895CFCB09FC4BC62A62F00C209BC`, ledger 4743289), on `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8` **under a derived ElGamal key**.
- All four of §10.5's state changes checked against ledger state before and after, including **decrypting** the remainder.
- The **pristine upstream `85dbac7`** verifier — a separate binary, separate library, hex on argv — accepts the proof at a non-zero and a zero remainder, and rejects both a corrupted proof and one verified against a wrong `MPTAmount`.
- `observer-harness.ts --assert-no-r-reuse` passed, 9 transactions, exit 0.
- A `ConfidentialMPTSend` built the way a **migrated harness** now builds one was accepted: `6943D8F0DFCDDA812512D55BEF10D61ABA9DD597792E2F39EC912A45BC9AA55E`.
- **244 tests, five consecutive clean runs.** ⚠ `CLAIMS.md` E-98: a flaky entropy hook once made several "all passing" reports true but lucky.

⚠ **`tesSUCCESS` is not a confidentiality claim and this packet does not offer it as one.**

---

## 8. The diff

Appended below as `git diff 8dff3ec..HEAD`. The signer source is the part that matters; the documents are included because a false sentence about the code is a defect this project treats as equal to a defect in it.
