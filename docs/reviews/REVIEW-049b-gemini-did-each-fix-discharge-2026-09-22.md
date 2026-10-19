## FINDINGS, most serious first

*None.* All seventeen round-one findings are fully discharged, and no new defect was introduced by the fix round.

---

## EVERY ROUND-ONE FINDING, one line each

- **Finding A (F-17 / E-306 — §6.2 usage & ambiguity):** *discharged* — `"The ambiguity is what the filing reports, not a defeat of it (REVIEW-048c §A)."` (E-306 claim cell) and `"The filing reports the ambiguity and its consequence, not the x reading alone (REVIEW-048c §A)."` (F-17 claim cell).
- **Finding B (Six rows — Sherlock audit gap):** *discharged* — `"Six rows of this register settle 'has upstream already raised this?' against Trail of Bits alone — E-296, E-303, E-304, E-305, E-306 and E-307 — and there are two audits, not one."` (B-30 claim cell).
- **1. E-306 (HIGH — unqualified implementation safety):** *discharged* — `"F-17 still holds at mpt-crypto 1.0.5, on reading, and so does its note that the implementation is not affected — on the utility path, and with a non-NULL context_id."` (E-306 headline).
- **2. E-304 (HIGH — unobtained internal document absence claim):** *discharged* — `"...no upstream text this project has read says which was intended, and the one that would — paper/cmpt-progress-and-changes.tex — is internal."` (E-304 claim cell).
- **3. E-296 (MEDIUM — mis-recorded grep output):** *discharged* — `"`git grep -c "if (context_id)"` at `f196bdb` lists FOUR files — `bulletproof_aggregated.c` 8, `proof_link.c` 1, `src/proof_pok_sk.c` 1 and `proof_same_plaintext_multi_shared_r.c` 1 — while `proof_same_plaintext.c:107` spells it `if (tx_context_id)`."` (E-296 evidence cell).
- **4. E-296 (MEDIUM — F-19 prior art overbroad for instance vs class):** *discharged* — `"F-19's defect CLASS is not new. Trail of Bits' April 2026 report already raises it, the fix review does not track it, and upstream mpt-crypto has not made the field required since."` (E-296 headline).
- **5. E-299 (MEDIUM — unchanged conditions stated as live status):** *discharged* — `"F-7's and F-12's conditions are unchanged at upstream HEAD, on reading, and F-18 is overtaken."` (E-299 headline).
- **6. E-299 (MEDIUM — missing denominator for re-checks):** *discharged* — `"Three of the five mpt-crypto re-checks — F-7, F-12 and F-18, against F-9's and F-15's runs — are readings, not runs."` (E-299 headline).
- **7. E-299 (MEDIUM — 'not on mainline' contradicted by evidence cell):** *discharged* — `"⚠ F-18's 'silently links an mpt-crypto four tag-generations behind' is true of 0.1.0-beta.1 only; 'not on the mainline branch' still describes 0.1.0's publish commit, which this row's own compare call shows diverged, and what changed is that main now carries the same 1.0.4 pin."` (E-299 claim cell).
- **8. E-299 (MEDIUM — exact-spelling search hid `1,000,000` cap):** *discharged* — `"⚠ That is an exact-token search, and 1,000,000 with separators stands at secp256k1_mpt.h:40, mpt_utility.h:183, elgamal.c:29 and bsgs_dlp.h:149, which calls it a cap; no caller hard-codes it, so F-7's code claim survives (REVIEW-048a)."` (E-299 claim cell).
- **9. E-297 (MEDIUM — 'fixed upstream' overclaimed consumer position):** *discharged* — `"F-8 is fixed in upstream's SOURCE TREE. The BSGS decrypt function mpt-crypto's documentation pointed to exists from tag 1.0.5, so there is nothing to file."` (E-297 headline) and `"⚠ 'Fixed' therefore reaches the source tree and not the API..."` (E-297 claim cell).
- **10. E-304 (MEDIUM — unstated intermediate for 1276 B and 1210 B):** *discharged* — `"...sum to 1276 B with an auditor and 1210 B without, which are the sizes F-13 measured: replacing the paper's one shared C₁ plus n C₂ with n full 66-byte pairs adds 99 B at n=4, and at n=3 the paper's total is first 33 B lower and 66 B is then added."` (E-304 claim cell).
- **11. E-303 (MEDIUM — pseudo-account search limited to two spellings):** *discharged* — `"⚠ Two spellings, so a guard containing neither token is outside that search (REVIEW-048)."` (E-303 evidence cell).
- **12. E-301 (LOW — missing `Not checked:` clause):** *discharged* — `"Not checked: whether loadWasmModule is documented or supported rather than merely exported, and the window, which was exercised at one width on one value"` (E-301 evidence cell).
- **13. E-299 (LOW — `Not checked:` omitted emsdk execution gap):** *discharged* — `"Not checked: executing build-wasm.sh under any emsdk, which is F-12's primary gap, and whether the natives tarball 0.1.0 downloads still matches its BUNDLE_SHA256"` (E-299 evidence cell).
- **14. E-298 (LOW — 'upstream closed both' when unfiled):** *discharged* — `"F-8 and F-18 are recorded as not-to-file because upstream overtook both, which follows F-27's precedent and is not a ruling."` (E-298 headline).
- **15. E-303 (LOW — `3.4.0-rc5` gap omitted from `Not checked:`):** *discharged* — `"Not checked: the source of 3.4.0-rc5, which has no public tag, and the May 2026 revision (B-13)"` (E-303 evidence cell).

---

## B-30's SIX ROWS

`B-30` names **E-296, E-303, E-304, E-305, E-306, and E-307**.

1. **Each of the six is verified**:
   - **E-296**: Asserts prior art and absence from fix review against Trail of Bits' April report and Appendix B/D/F.
   - **E-303**: Asserts *"Trail of Bits does not raise it"* with `0 matches for pseudo`.
   - **E-304**: Asserts *"Trail of Bits does not raise it"* based on paper absence from the April report.
   - **E-305**: Asserts *"Trail of Bits has 0 matches for LoanSet and lending"*.
   - **E-306**: Asserts absence from the April report and checks the 20 issue citations of the May revision.
   - **E-307**: Asserts *"Trail of Bits has 0 matches for NetworkID and network id"*.

2. **Completeness check**:
   - The remaining rows in scope (**E-297, E-298, E-299, E-300, E-301, E-302, F-12, F-17**) do **NOT** settle upstream prior art or coverage against Trail of Bits alone. E-298 and E-299 reference Trail of Bits recommendations or cross-reference E-296/E-297, but do not use absence from Trail of Bits as an instrument to prove an issue is unraised upstream.
   - Therefore, `B-30`'s list of six rows is **exact, exhaustive, and correct**.

---

## E-310 AGAINST THE ADJUDICATION

`E-310` states what `REVIEW-048c` says, **no more and no less**. Every count and fact matches:
- **Verdict counts**: 17 upheld, 2 rejected, 1 withdrawn (matches `REVIEW-048c`).
- **Filing impact**: 2 findings land on rulings already taken (Section A / F-17 ambiguity and Section B / 6 rows on Trail of Bits).
- **Sherlock audit coverage**: 6 rows named (B-30).
- **Command output mis-recording**: 1 evidence cell (E-296 grep count: 1 file asserted, 4 actual).
- **Overbroad sentences**: 8 rows named (**E-296, E-297, E-298, E-299, E-301, E-303, E-304, E-306**), which exactly accounts for all rows with text findings outside the clean/executed rows.
- **Leg consensus**: Exactly 1 finding reached by all three legs (Finding 5 / E-299 headline).
- **Leg B rejection**: Matches the rejection of Leg B's HIGH on F-12, recording total count 684 and workflow run `32380884181` on `main`.

---

## THE PLAN AND THE FEEDBACK BULLET

1. **`UPSTREAM-FEEDBACK.md` bullet**:
   - Correctly incorporates Finding A / E-306, recording that the F-17 filing reports the ambiguity between Remark 6.1 and §6.2 and its consequence rather than a settled omission.
   - Accurately records the completion of `REVIEW-048` and that round two is owed.

2. **Launch Plan Phase 0**:
   - **Step 1 & 2**: Accurately reflect the 17 upheld findings, B-30 addition, and the two-round stopping condition.
   - **Step 3 (Four filing instructions)**:
     - **F-9**: Leads with the remote-add substitution from E-300. Directly follows from the evidence.
     - **F-12**: Discloses green CI at the pin on `main` and remedies 3 link lines instead of 2. Directly follows from `REVIEW-048c` §4 and finding 13.
     - **F-13**: Requires presenting the full component table rather than totals alone. Directly follows from `REVIEW-048c` §4 and finding 10.
     - **F-17**: Leads with the definition ambiguity of `statement` and its consequence. Directly follows from `REVIEW-048c` §A.
   - **Step 4**: Requires searching B-30's Sherlock corpus before filing. Directly follows from `REVIEW-048c` §B.
   - **No instruction exceeds or contradicts the adjudication.**

---

## CHECKED AND CORRECT

- **Question 6 (Uncaught round-one findings)**: No valid findings were improperly rejected or overlooked in round one. The two rejected findings (Leg B's HIGH and Leg B's finding 5) and the withdrawn self finding were properly checked against primary evidence and falsified.
- **Stopping condition**: Every round-one finding has been discharged, and no new defect was introduced. Under the stopping condition set in Phase 0 item 2, **no third round is required; this rotation is closed.**
