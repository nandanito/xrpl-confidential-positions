# REVIEW-004 — request packet for the execution rotation

- **Date:** 2026-08-17
- **Status:** **Both legs run 2026-08-17; adjudication NOT done.** Codex leg → `REVIEW-004a-codex-2026-08-17.md` (verdict `needs-attention`, 3 findings). Gemini leg → `REVIEW-004b-gemini-2026-08-17.md` (verdict `fix-before-merge`, 9 findings). The legs ran independently and neither saw the other. **Nothing from either has been applied.** Q3 of this packet was left open by Codex and answered by Gemini (HIGH-03); Q8 is agreed by the packet and Gemini (LOW-02). Two findings were reached by both legs independently — E-47/U-28's reintroduced range claim and E-56's one-host downgrade.
- **Under review:** everything Session 3 produced — `docs/task-zero/DEVNET-CONVERT-2026-08-17.md`, `CLAIMS.md` rows **E-4, E-22, E-32, E-45 to E-56, F-1, F-12 to F-15, B-9, B-10**, `UPSTREAM-FEEDBACK.md` **U-28 to U-33**, `tools/spike-2026-08-17/`, and the GAP-9 closure and GAP-11 opening in the TASK ZERO and XLS-66 documents.
- **Prepared by:** the coding session that produced all of it, with no cooling-off period. **A packet assembled by an interested party is not a neutral one** — §5 states where it is likely bent.
- **Method to follow:** as REVIEW-002 and REVIEW-003 — the two external legs independently, without seeing each other, then adjudication in which every disputed finding is checked against source or re-executed against Devnet before being accepted or rejected.

**This rotation differs from the previous two in kind.** REVIEW-001 to 003 reviewed *arguments* — an ADR, a domain recommendation, an inference about homomorphic arithmetic. This one reviews *measurements*. The failure mode is different: an argument fails by being unsound, a measurement fails by being unrepresentative, mis-generalised, or by not measuring what its sentence says it measures. **Reviewers should attack the gap between what was executed and what was written down**, which is where every defect in this session will be.

---

## 0. Practical note for whoever runs the legs

**The work is committed on `main`, not on a branch**, so `git diff main...HEAD` is empty and the Gemini leg's default target will produce nothing. Use the base **`8d6758a`** — the commit immediately before this session — for both legs:

- Codex: `--base 8d6758a`, full repository access.
- Gemini: diff against `8d6758a`. This reviewer cannot read unchanged files; tell it so, and treat findings that turn on unseen files accordingly.

Both legs should be given §4's questions as the focus. **The Codex leg has repository access and should be pointed at the spike code in `tools/spike-2026-08-17/`** — several claims in §4 can only be checked by reading what the harness actually did, not what the prose says it did.

---

## 1. What is under review

| Item | Claim | Grade asserted | Never reviewed |
|---|---|---|---|
| **A** | E-45 — the end-to-end client path works; a Convert was accepted | A, executed | ✅ |
| **B** | E-4 / F-13 — Send payload is 1210 B at n=3; `C₁` shared but transmitted per participant; the paper's 1177 is wrong for the wire | A on 1210, B on 1276 | ✅ |
| **C** | E-22 — a zero-amount Send is valid, and survived four indistinguishability checks | (a) A, (b) C | ✅ |
| **D** | E-50 / F-14 — GAP-9: confidential balance invisible to vault accounting; `tecINSUFFICIENT_FUNDS` misattributes | A | ✅ |
| **E** | E-47 / F-12 — the WASM build fails at emsdk 6.0.6, succeeds at the pinned 6.0.2; module cross-validates with native | A | ✅ |
| **F** | E-48 / E-55 / U-29 / U-30 — nonce construction is hedged, not deterministic; entropy under WASM is host-supplied; no test pins nonce distinctness | A on construction, C on the test negative | ✅ |
| **G** | E-53 / F-15 — `@xrplf/mpt-crypto@0.1.0` published and executed end to end; its `decryptAmount` drops `range_low` | A, executed | ✅ |
| **H** | E-56 — F-9 is a real defect but not a blocker | A | ✅ |
| **I** | B-10's revised dependency statement — not blocked, still pending, needs an adversary model this session did not build | PENDING | ✅ |

---

## 2. What changed since REVIEW-003, in one table

REVIEW-003 closed the previous day. A reviewer who has read it needs these six deltas.

| # | Change |
|---|---|
| 1 | **The project can now transact.** Eight confidential transactions on Devnet. Everything previously graded by reading is re-checkable by execution |
| 2 | **The binding work is gone.** `@xrplf/mpt-crypto@0.1.0` published 2026-08-16T15:26Z, hours after Session 2 recorded it absent. E-32 superseded. TASK ZERO §5's last work item deleted |
| 3 | **E-4 resolved**, B → A on the measured half; the 99-byte conflict is explained |
| 4 | **E-22 tested and not falsified.** B-10 is therefore not blocked — but §4 Q1 asks whether the test was as strong as its write-up implies |
| 5 | **GAP-9 closed, GAP-11 opened** (is `mpt-crypto-sys` published? crates.io refused the query; no substitute source used) |
| 6 | **REVIEW-003's own finding on ADR-0001 §(e) now has upstream input** — mpt-crypto's actual nonce construction, read and executed. It does **not** discharge the finding |

---

## 3. Evidence a reviewer cannot reach without help

Neither leg can query Devnet. The transactions are re-queryable by anyone who can; the load-bearing values are inline here so a reviewer can reason without network access.

**Convert (native proofs):** `5019EF9754F678CA3F4B564AC1E07144A171D6016D229D5F5BCFBDEB6FAC05BB`
**Convert (npm-only proof material):** `CA37BC1B95E861F13C374F43B702F7B2C4C5A0DEDD633CB8D253A8A985C916E7`
**Issuance:** `00453A78D67EB7E60002C33AAD59E7F544C136A8D30F5D52` · **Vault:** `ABE70D6C5019EAC3E5336BAD90C9154E19C5BF5A9C806447BEC06C209D2E462C`

**Send measurements, all three transactions identical:**

| | non-zero (100) | zero #1 | zero #2 |
|---|---|---|---|
| engine result | `tesSUCCESS` | `tesSUCCESS` | `tesSUCCESS` |
| signed blob | 1423 B | 1423 B | 1423 B |
| `ZKProof` | 946 B | 946 B | 946 B |
| metadata | 1219 B | 1219 B | 1219 B |
| `AffectedNodes` | 3 | 3 | 3 |
| sender balance at proving time | **250** | **150** | **150** |
| sender version before | 1 | 2 | 3 |

**The bolded row is the one to look at.** See Q1.

**Field sizes on the wire:** `SenderEncryptedAmount` 66 · `DestinationEncryptedAmount` 66 · `IssuerEncryptedAmount` 66 · `AmountCommitment` 33 · `BalanceCommitment` 33 · `ZKProof` 946.

**`C₁` (first 33 bytes) identical across all three ciphertexts in every transaction.** Example, zero send #1: `037CC639220801377B664022A17EB2CD0A065012A46AB4C3918D780A6C3DCB08C4`.

**F-1, executed:** holder's `sfConfidentialBalanceSpending` after first-time Convert = `03A878115FAE18FD6A32709052DE459C4A8E83809C921DC2CFEF0798DD490C0132…`, byte-identical to independently recomputed canonical `EncZero`.

**GAP-9:** holder 750 public + 150 confidential → deposit 700 public → `tesSUCCESS`, `AssetsTotal "700"`, public 50, confidential **unchanged at 150, version unchanged**. Pseudo-account `MPToken` carries neither `HolderEncryptionKey` nor `ConfidentialBalanceSpending`. Next deposit of 100 → `tecINSUFFICIENT_FUNDS`.

---

## 4. The questions, in priority order

### Q1 — Is "E-22 survived four checks" stronger than what was run? *(highest priority)*

Three specific worries, all of which the author noticed only while writing this packet:

1. **The side-by-side was not a controlled comparison.** The non-zero send was proved against a balance of **250**; both zero sends against **150**. Balance is a witness in the sigma relation and an input to the aggregated Bulletproof. Comparing transactions that differ in *two* variables and finding no difference is weaker than comparing transactions that differ in one. **Does this invalidate check 4, or merely weaken it?**
2. **n=1 on the control.** One non-zero send against two zero sends. A single sample cannot show that non-zero sends are themselves stable in the observables being compared.
3. **The brief's check 4 named "fee charged", and that was answered by argument, not experiment.** All three were submitted at a hard-coded 5000 drops, so of course the fee matched. The session reasoned that the fee is sender-chosen and that validators cannot see the amount, so the *minimum* cannot differ — plausible, and **not tested**. `calculateBaseFee` was never read (it is also unread for E-5). **Is an untested check being counted among "four checks"?**

Also worth attacking: everything ran with **one sender, one destination, one issuer, one issuance, no auditor**. Every E-22 statement inherits that.

### Q2 — ~~Is "stranded" in the GAP-9 result an unexamined inheritance from the prediction?~~ **SETTLED — it was, and it was wrong**

**Left in the packet as a finding, not a question.** This was raised while writing §5, tested immediately, and the answer falsified the session's own reported result.

The recorded prediction said the confidential portion would be "stranded" and the session reported that clause as holding. It does not hold. What had actually been measured was that the confidential balance was *unchanged* and *not counted by vault accounting* — which is equally consistent with "simply outside the vault and fully spendable". **No confidential operation had been run after the vault deposit.**

One `ConfidentialMPTSend` settled it: after the deposit the holder sent **50 confidential units** to a second holder — `tesSUCCESS`, sender 150 → 100, destination inbox 100 → 150, public balance untouched at 50. **The confidential balance is not stuck. It is outside the vault and invisible to its accounting.** E-50, the session document §7 and the XLS-66 GAP-9 note are corrected.

**What reviewers should take from this is the mechanism, not the fact.** The error was repeating a prediction's vocabulary after measuring something adjacent to it — and the session had been told explicitly not to reconcile deviations against the prediction. It did not reconcile the clause it noticed; it failed to notice this one. **Q4 asks for other instances of the same mechanism, and this is now a worked example of what to look for.** It also narrows the finding usefully: `tecINSUFFICIENT_FUNDS` (F-14) is now the whole of the GAP-9 result rather than half of it.

### Q3 — Is `C₁`-sharing a protocol property or an artifact of this harness?

E-4 and F-13 rest on `C₁` being identical across the three ciphertexts. But the harness passed **one** `tx_blinding_factor` because `mpt_get_confidential_send_proof` takes exactly one. So the observation may be a property of the API this session used rather than of the wire format.

The author's reading is that it is protocol-mandated — the compact sigma language is `C1 = r*G`, `C_{2,i} = m*G + r*pk_i` over a single `r`, so a conforming client *cannot* use per-participant randomness. **A reviewer should verify that from `cmpt-compact-sigma.pdf` §2.3 and the rippled verifier rather than take this paragraph's word for it.** If per-participant randomness were admissible, F-13 collapses and E-4's explanation of the 99 bytes is wrong.

### Q4 — Which other claims have F-12's shape?

F-12 originally read "fails on any emsdk newer than its CI pin" from a single newer version tested. It was narrowed before this packet was written. **Find the others.** Candidates the author suspects: E-56 (one machine, one OS, one compiler), E-51 (one issuance, n=3), E-47 (one build host).

### Q5 — Grep-based negatives

U-30 / E-48's "no test asserts distinct nonces across identical statements" is a grep proving a negative — **the same evidence shape REVIEW-003 regraded A → B for E-40 and F-10.** It has been graded C for that reason. **The Codex leg has repository access; check it properly rather than accepting the grade.** Same question for E-54's reading of upstream's Rust/Python intent.

### Q6 — Does the nonce write-up risk being read as an endorsement?

`DEVNET-CONVERT-2026-08-17.md` §8 reports that upstream uses a hedged construction and calls it "input for the Cryptography Reviewer". **Two ways that could go wrong:**

1. A later session reads it as precedent and implements hedged nonces without the byte-exact construction REVIEW-003 demanded. The ADR-0001 §(e) finding is **not** discharged by this session and nothing here should suggest it is.
2. The write-up does not examine the *downsides* of hedging at all — non-reproducible proofs complicate testing, and any deterministic-signing or air-gapped-signer story interacts badly with a mandatory RNG draw. **Is the observation neutral, or quietly favourable?**

### Q7 — Was the mandate exceeded?

The brief said "do not build anything you intend to keep" and "do not generalise the spike into a library". The session committed ~1000 lines of spike code to `tools/spike-2026-08-17/`, justified under P-8 (a measurement whose code is unavailable is not publishable) and by the `tools/mpt-crypto-bench/` precedent. **Is that the right call, or scope creep wearing a rule as a hat?** If it is right, the README's "do not build on it" needs to be load-bearing, and a reviewer should check whether anything in the tree already does.

### Q8 — Is E-45's "first submission, no retries" a claim or a boast?

It is in the register and in the commit message. It carries no capability information — a transaction that took five attempts would prove the same thing. **Should it be cut?**

---

## 5. Where this packet is likely biased

- **Written by the session that produced the results, on the same day, with no cooling-off.** REVIEW-003's equivalent section under-called the severity of its own weakest item; assume this one does too.
- **Success bias.** The primary objective succeeded early and cleanly. That makes every subsequent measurement feel more solid than its sample size warrants, and it is the most likely reason Q1 and Q4 were not caught before write-up.
- **Q1 and Q2 were found while writing this packet, not while running the experiments.** That is the wrong order and it means the experiments were not designed against these objections. **Q2 then turned out to be a real error in the reported result** — which is the strongest available evidence that this section is not merely ritual, and also that one pass of self-scrutiny is not enough. Assume there is a Q9 that this section did not reach.
- **The npm discovery is flattering to the plan** — it deletes the largest work item and makes the schedule look better. A reviewer should be suspicious of how quickly that was accepted and written into TASK ZERO §5, on the strength of one afternoon's testing.
- **The session graded its own homework twice** — once in `CLAIMS.md`, once via the `claims-check` skill run by the same session. That gate did catch a real defect (E-4's unmeasured auditor case), which is evidence it works, and is *not* evidence that it caught everything.
- **No adversarial thought was given to what an observer with a full ledger history could do.** E-22 was tested transaction-by-transaction. B-10 is about traffic patterns over time. Those are different problems and only the first was touched.

---

## 6. What acceptance would unblock

Nothing architectural. **This rotation does not gate anything** — the architecture blockers remain ADR-0001 §(e)'s byte-exact nonce construction and the second ADR review round, neither of which this session touched.

What it does affect is what may be **published** and what may be **filed upstream**. F-12 is currently the only item this session produced that is cheap, uncontested and fileable today; if the legs find nothing against it, it can go. E-4, E-22 and the GAP-9 result are the strongest candidates for external writing, and all three should be considered unpublishable until this rotation has run.
