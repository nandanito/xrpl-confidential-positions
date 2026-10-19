# REVIEW-004c — adjudication

- **Date:** 2026-08-17
- **Inputs:** `REVIEW-004-REQUEST` (packet), `REVIEW-004a` (Codex, full repo access, 3 findings, `needs-attention`), `REVIEW-004b` (Gemini, diff-only, 9 findings, `fix-before-merge`). The legs ran independently and neither saw the other.
- **Method:** as REVIEW-002 — every disputed finding checked against source or **re-executed against Devnet** before being accepted or rejected. This rotation reviewed measurements, so most disputes were settled by running the experiment rather than by argument. **17 further Devnet transactions.**
- **Adjudicator:** the same session that produced the work. Stated plainly because it is the known weakness of this round: a party grading criticism of its own output. Two findings were rejected, and both rejections are backed by an execution or a specification citation rather than by judgement, so they are checkable by anyone.

**Outcome: 11 findings accepted, 2 rejected, 1 partly rejected. Two findings that neither leg raised were produced by the adjudication experiments themselves, and one of them falsifies a claim both legs let through.**

---

## 1. Decisions

| # | Finding | Decision | Basis |
|---|---|---|---|
| **A-1** | Codex [high] — TASK ZERO §9 still asserts E-22 indistinguishability and rests cover traffic on it | **ACCEPTED** | Verified: `TASK-ZERO-2026-08-13.md:264–266` unchanged. The register and its prose disagreed |
| **A-2 / B-MED-01** | E-47 and U-28 reintroduce the range claim F-12 was narrowed away from | **ACCEPTED** | **Both legs, independently.** Verified at `CLAIMS.md:94` and `UPSTREAM-FEEDBACK.md:118` |
| **A-3 / B-MED-03** | E-56 downgrades F-9 to "not a blocker" from one host | **ACCEPTED** | **Both legs, independently.** One machine, one OS, one compiler |
| **B-HIGH-01** | E-22's "survived four checks" is uncontrolled: confounded baseline, n=1 control, fee dimension argued not measured; and check 1 is circular | **ACCEPTED, then CLOSED BY EXECUTION** | See §2. Controlled rerun performed; the conclusion survives on better evidence, the *wording* does not |
| **B-HIGH-02** | `npm-e2e-convert.ts:71` calls `decryptAmount` with 4 args against a 3-arg signature | **ACCEPTED** | Correct. Fixed. See §4 for what it does and does not undermine |
| **B-HIGH-03** | `C₁`-sharing may be a harness artifact; regrade E-4/F-13 A → B/C | **METHOD ACCEPTED, CONCLUSION REJECTED** | See §3. The reviewer's proposed experiment was run and refutes its own hypothesis |
| **B-MED-02** | E-53 and TASK ZERO §5 generalise from one executed transaction | **ACCEPTED** | Only `Convert` ran through the npm package. Send, ConvertBack, Clawback, MergeInbox used the native tool |
| **B-MED-04** | U-29 contains editorial endorsement; §8 omits the downsides of hedged nonces | **ACCEPTED** | *"the construction looks like the right one"* is a judgement inside the upstream register. The three named downsides are real and were absent |
| **B-LOW-01** | The nonce-test negative rests on a naive grep | **ACCEPTED** | Already graded C; the exact query is now recorded |
| **B-LOW-02** | E-45's "first submission, no retries" is a vanity metric | **ACCEPTED** | The packet asked the same thing as Q8. Removed |
| **B-LOW-03** | `vault.ts:46` comment says 128, should be 256 | **REJECTED — false positive** | XLS-0096 §6.2 gives `lsfMPTCanHoldConfidentialBalance` = `0x00000080` = **128**, a *ledger-state* flag on `sfFlags`, which is what that line prints. The 256 cited is `tfMPTSetCanHoldConfidentialBalance` (§12.3), a *transaction* flag on a different field, used correctly at `convert.ts:164`. The finding conflates `lsf` with `tf` |
| **B-Q7.1** | Payload sizes are "computed via arithmetic rather than extracted from raw bytes" | **PARTLY REJECTED** | `send.ts` decodes the signed blob with `ripple-binary-codec` and measures each field from the decoded wire bytes — those are measurements. Only the 1210/1276 totals are arithmetic *over measured fields*, and E-4 already discloses the 1276 case. Accepted only as a wording tightening |
| **B-Q6.2** | F-10's "unreachable from every vault and lending transaction" blurs deposit refusal into unspendability | **PARTLY ACCEPTED** | The statement is true as scoped — the post-vault Send is a confidential transaction, not a vault one. Wording clarified; no regrade |

---

## 2. B-HIGH-01 — the controlled rerun

Both legs were right that the original run could not isolate amount-invariance. **Re-run with the confound removed.** The fix was ordering: a zero send does not move the balance, so putting the zero sends *first* makes every sample prove against the same balance.

| arm | amount | balance at proving | version before | result | blob | proof | metadata | nodes |
|---|---|---|---|---|---|---|---|---|
| ZERO #1 | 0 | **80** | 7 | `tesSUCCESS` | 1423 | 946 | 1219 | 3 |
| ZERO #2 | 0 | **80** | 8 | `tesSUCCESS` | 1423 | 946 | 1219 | 3 |
| NON-ZERO #1 | 10 | **80** | 9 | `tesSUCCESS` | 1423 | 946 | 1219 | 3 |
| NON-ZERO #2 | 10 | **80** | 11 | `tesSUCCESS` | 1423 | 946 | 1225 | 3 |

Balance identical across all four arms; n=2 per arm; metadata *shape* identical across all four —
`ModifiedNode:AccountRoot[Balance|Sequence]`, `ModifiedNode:MPToken[ConfidentialBalanceInbox|IssuerEncryptedBalance]`, `ModifiedNode:MPToken[ConfidentialBalanceSpending|ConfidentialBalanceVersion|IssuerEncryptedBalance]`.

**The fee dimension is now measured, not argued.** A full ladder was run on *both* arms:

| fee | zero-amount | non-zero |
|---|---|---|
| 1 drop | `telINSUF_FEE_P` | `telINSUF_FEE_P` |
| 5 drops | `telINSUF_FEE_P` | — |
| 9 drops | `telINSUF_FEE_P` | `telINSUF_FEE_P` |
| **10 drops** | **`tesSUCCESS`** | **`tesSUCCESS`** |

**Identical threshold. The fee is not a distinguisher, and that is now executed rather than deduced.**

**The circular-counting point is accepted and is the sharpest thing either leg found.** Check 1 (validity) *is* E-22(a); counting it among four indistinguishability checks used the validity claim as evidence for the indistinguishability claim. E-22 is restated as **three** indistinguishability checks — randomisation, `EncZero` non-match, and side-by-side — with validity separated out as the (a) limb it always was.

**Net effect: the conclusion survives on materially better evidence and the wording does not.** "Survived four checks" is retired.

---

## 3. B-HIGH-03 — `C₁`-sharing: the reviewer's own experiment, run

The finding was that `C₁`-sharing might be an artifact of the harness passing one `tx_blinding_factor`, and it proposed the settling experiment: submit a Send built with independent per-participant blinding factors and see whether rippled rejects it. **That experiment was run.** Three layers reject it:

1. **The prover refuses.** `mpt_get_confidential_send_proof` returns `-1` and generates nothing when handed ciphertexts under different randomness. A conforming client cannot even construct the transaction through the sanctioned path.
2. **The verifier refuses.** Forcing a proof from consistent ciphertexts and then verifying against mismatched ones: `mpt_verify_send_proof` → `FAIL` for destination-independent and for destination-and-issuer-independent. The shared-`C₁` control → `OK`.
3. **rippled refuses.** Same construction submitted to Devnet: shared-`C₁` control → **`tesSUCCESS`**; destination independent → **`tecBAD_PROOF`**; destination *and* issuer independent → **`tecBAD_PROOF`**.

**`C₁`-sharing is enforced by the sigma proof, not chosen by this harness.** The finding's factual premise is refuted and E-4 and F-13 stand — now on non-circular evidence, which is exactly what the finding asked for. Its *methodological* criticism was correct: the original evidence was the harness observing its own input, and it should not have been graded A on that basis.

**No regrade. The evidence column is rewritten to cite the negative control instead of the self-observation.**

---

## 4. B-HIGH-02 — what the arity bug does and does not undermine

`npm-e2e-convert.ts` called `decryptAmount(ct, sk, 0n, 1000n)` against a three-argument signature, so `rangeHigh` received `0n` and the call threw. **Correct, and fixed.**

Three things must be separated, and the finding merges them:

- **The transaction was accepted and validated before the throw** — `CA37BC1B…`, `tesSUCCESS`, confirmed independently by a later `tx` query. E-53's end-to-end claim does not rest on the broken line.
- **Decryption through the npm package was verified separately**, in `npm-decrypt-window.ts`, which is how F-15's fixed `range_low` was found at all.
- **A committed evidence file nonetheless contained a call that cannot work.** That is a real defect in the evidence base and is the part accepted.

---

## 5. Findings neither leg raised, produced by the adjudication experiments

### N-1 — E-51 is wrong. Metadata is not a constant.

Both legs let E-51's "1219 B" through; Gemini questioned only its sample size. **It is false as stated.** The controlled rerun produced **1219 B and 1225 B for structurally identical sends**, and the cause is exact:

| metadata | destination `MPToken` FinalFields |
|---|---|
| 1219 B | Account, ConfidentialBalanceInbox, ConfidentialBalanceSpending, Flags, HolderEncryptionKey, IssuerEncryptedBalance, MPTokenIssuanceID, OwnerNode |
| 1225 B | …the same, **plus `ConfidentialBalanceVersion`** |

`sfConfidentialBalanceVersion` is a `UInt32` at code 69 — a 2-byte field header plus 4 bytes of payload = **exactly the 6-byte delta**. A destination that has never run `MergeInbox` has version 0, which is the default and is not serialised; once it merges, the field exists and every subsequent transaction's metadata carries it.

**Metadata size tracks participant state, not amount.** E-51 is corrected.

**This strengthens E-22 rather than weakening it.** At matched destination state the two arms are byte-identical — 1219/1219 before the destination merged, 1225/1225 after. Had the original run happened to straddle a destination merge, it would have reported a 6-byte "distinguisher" that has nothing to do with the amount.

### N-2 — E-5's mechanism is now measured, and its headline number is network-dependent

E-5 has carried "*arithmetic relating constant to result not verified*" since 2026-08-13. Settled by ladder rather than by reading `calculateBaseFee`:

- `fee` RPC on Devnet: `base_fee = 1`, `open_ledger_fee = 1`.
- `ConfidentialMPTSend` rejected at 1, 5 and 9 drops with `telINSUF_FEE_P`; accepted at **10**.
- A standard `AccountSet` on the same account in the same conditions: accepted at **1 drop**.

**The confidential multiplier is exactly 10× the standard base fee, executed.** The "100 drops" in the specification and RippleX documentation is that ratio against a `base_fee` of 10; on a network whose base fee is 1 the real floor is 10 drops. **The ratio is the durable fact; the absolute number is not, and must not be published as one.**

---

## 6. What this rotation cost and what it is worth

Seventeen further Devnet transactions, of which the three `tecBAD_PROOF`/`telINSUF_FEE_P` rejections are the most informative — a negative control that fires is worth more than another success.

**Score for the self-review process, stated because it is unflattering.** The packet named the sample-size failure mode as Q4 and then missed three instances of it (E-47, U-28, E-56) plus a fourth the legs also missed (E-51). It raised Q1's confound and then did not run the rerun until a reviewer insisted. It got the `C₁` question right on instinct and wrong on evidence quality. **Self-review found the mechanisms and missed the instances, three times in one session.** The instance-level catch came from the external legs every time.

**What still is not done.** E-22(b) remains unprovable by this method and B-10 still needs an adversary model over transaction sequences that nobody has built. GAP-8 and GAP-11 are untouched. No auditor-configured issuance has ever been exercised, so every size and metadata figure here is n=3.
