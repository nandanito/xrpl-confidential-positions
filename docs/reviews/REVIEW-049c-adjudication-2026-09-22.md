# REVIEW-049c — adjudication: round two on `REVIEW-048`'s fixes

- **Date:** 2026-09-22
- **Legs:** `REVIEW-049a` (Codex native pass, corpus), `REVIEW-049b` (Gemini, before-and-after text), `REVIEW-049s` (self).
- **Verdict:** **eight findings upheld, one rejected in part. ⚠⚠ THE STOPPING CONDITION FIRED.** Three of the eight are round-one findings the fixes did not discharge, so by the rule set before this round ran, **a third round is owed.** Every finding is a surviving copy, an incomplete list or a sentence that overstates its evidence. **None is in the construction of a claim, and the executed evidence is untouched.**

## UPHELD

| # | Where | Finding | Legs | Kind | Severity |
|---|---|---|---|---|---|
| 1 | B-30, E-310 | **B-30's list of six rows was short.** A whole-register sweep finds the same one-audit coverage check in **E-157**, the record of the two filings **already sent**, in their rows **`U-24`** (`XRPL-Standards#611`) and **`U-34`** (`mpt-crypto#141`), and in two of the register's **publication headlines**, the F-7/F-8 one (*"neither is in the Trail of Bits report"*) and the F-10 one (*"it has no existing coverage, and the Trail of Bits report does not touch it"*). B-30 copied `REVIEW-048c` §B's list, so the fix was faithful to a finding that was itself short. **Undischarged at the level of the property.** Fixed: B-30 names every site and records the sweep, and E-310 no longer says six | a, s | undischarged | HIGH |
| 2 | F-17 | **The bold sentence *"Upstream's implementation is NOT affected"* survived unscoped** after E-306 was scoped to the utility path and a non-NULL `context_id`. The row qualified it one sentence later, so a reader was not misled for long, but a bold sentence is what gets quoted. Fixed | a | undischarged | MEDIUM |
| 3 | E-297, E-298 | **"Nothing to file" rests on the question the row lists as unchecked.** If `bsgs_dlp.h` is not installed, F-8 still holds for consumers. Round one qualified *"fixed"* and left the conclusion it supported unqualified, and E-298 repeated it. Fixed: *"on present evidence"*, with the reopening condition named, in both | a | undischarged | MEDIUM |
| 4 | F-12 | **The remedy said *"the two `emcc` link lines"* while the row says it still holds at `1.0.5`, where there are three**, and the third links the browser glue. Round one put this in *what happens next* rather than in its findings table, so the fix round never tried it. Fixed: the remedy is dated to `85dbac7` and the three lines are named | a | new | MEDIUM |
| 5 | plan, handover | **"Neither got the composition whole" overstated leg A.** The paper's Send is `1045 + 33n` and the enforced one `1012 + 66n`. Leg A's *"adds 66 for n=3"* is right against the paper's own n=3 total; only leg B's *"1177 + 33 = 1210"* is wrong. Round one's finding stands, since one reader of the row alone got it wrong, but its evidence was overstated at two live sites. Fixed at both. `REVIEW-048c` is a record and is corrected here, not edited | s | new | MEDIUM |
| 6 | E-296 | The added sentence named `proof_same_plaintext.c:107` as the `if (tx_context_id)` site. **`equality_proof.c:105` is a second.** A list taken from a one-example spot check. Fixed | s | new | LOW |
| 7 | B-30 | **Merging B-30's surplus cells in round one dropped a full stop**, leaving *"security-adjacent negatives The searches"*. Found while applying finding 1. Fixed. ⚠ The same round's `rg` command was first recorded with bare `|` characters, which split the table row into eight cells, and **`make check-tables` caught it** | — | new | LOW |
| 8 | `REVIEW-048c` | **Its legs column says finding 10 was reached by *"a, b, s"*, and its summary says only finding 5 was reached by all three.** Legs A and B reproduced the totals and did not raise the finding. **The summary is right and the column is wrong**, so E-310, which repeats the summary, is right | s | record | LOW |

## REJECTED IN PART

**Finding 4's other two sites.** `docs/task-zero/DEVNET-CONVERT-2026-08-17.md:124` and `tools/spike-2026-08-17/README.md:56` also say two link lines. Both are dated 2026-08-17 and describe the build at `85dbac7`, where there were two. **They are true records of their date**, and rewriting them would make them false about what was run. The F-12 row is different: it asserts the finding still holds at `1.0.5`.

## ON THE GEMINI LEG

It returned **no findings** and ruled all seventeen round-one findings discharged. Its verdict that B-30's list was *"exact, exhaustive, and correct"* was **right over the rows it was given.** The whole-register sweep was assigned to leg A, and E-157, `U-24` and `U-34` were deliberately outside packet B.

⚠ **It still missed two defects that were inside its packet.** F-17 was pasted whole, and it marked round-one finding 1 discharged by quoting E-306 without checking F-17's copy of the same sentence. E-297 was pasted before and after, and it marked finding 9 discharged without asking whether *"nothing to file"* depended on the unchecked item. **This is `REVIEW-048c`'s observation a second time: a leg without the corpus is good at generating suspicion and weak at checking where a phrase has copies.** Round two gave it before-and-after text to make that checking possible. It did not find the copies.

## WHAT THE STOPPING CONDITION SAYS, AND WHAT IS RECOMMENDED

**The rule set before this round: no third round unless round two finds a fix that did not discharge its finding. Findings 1, 2 and 3 are that.** A third round is owed by the rule and is not waived here.

What the findings look like matters to how it is run. **All three undischarged findings are the same failure: a corrected phrase or list that has copies**, the E-141/E-168 shape, and each was found by a **whole-tree sweep**, which is mechanical. None needed judgement about cryptography or evidence. **Recommended: a narrow third round**, one corpus leg on the native light pass, scoped to `65e16e8..HEAD`, with one question: *does every sentence this round corrected have a surviving copy anywhere outside `docs/reviews/`?* Its stopping condition, set now: **the rotation closes after round three, whatever it finds;** anything it finds is fixed without a fourth round, because a fourth would review fixes to fixes to fixes (`CLAUDE.md`). **Whether to run it is the owner's call.**
