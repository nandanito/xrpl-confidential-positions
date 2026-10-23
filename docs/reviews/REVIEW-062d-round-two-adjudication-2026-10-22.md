# REVIEW-062d — round two, on round one's fixes, adjudicated

**Subject:** `git diff 41098e8 8fa293d`: round one's fixes to both post drafts
(`REVIEW-062c`), and two requests the owner made on 2026-10-22, after round one.
The blog no longer names the tools the project was built or reviewed with. And
*"it hides the shape of the book, not its size"* is replaced on the hosted page, in
the README and in `WHAT-CONFIDENTIAL-MEANS`, recorded as `CLAIMS.md` R-9, with an
entry in `check-disclosure-phrases` and a change to the register summariser made
on the way.
**Requested by the owner:** *"run the second read on the fixes"*.
**Stopping condition, set before it ran:** no third round. What this round finds
is fixed and checked by its own tests and controls.

| leg | reviewer | packet |
|---|---|---|
| A | Codex native pass at its default effort, because the subject now includes code, in a two-commit repository under `$TMPDIR` built from `git archive`, with network | every upheld round-one finding, to be checked by running its own example; new sentences; surviving copies over the whole tree; R-9's sentence; the two tool changes, broken on copies. `round-two-leg-a-prompt-codex.md` |
| B | Gemini through `agy`, effort high, no tools, from an empty directory | the fixed posts' text and the changed page section's visible text, read as a stranger. `round-two-leg-b-prompt-gemini.md` |

Leg A ran eight minutes and leg B two (`timings.txt`). Leg A's network check
returned 200. The native pass printed only its six comments to stdout; its full
report, with a verdict for every round-one finding and its mutation tables, is in
its transcript and is copied to `round-two-leg-a-codex-report.md`.

## Round one's findings, as leg A ran them

Discharged: A-1, A-2, B-1, B-3 (in source; the live page waited on a redeploy),
B-4, B-6, B-7, B-8, B-12, B-13. Partly: B-2, B-5 and B-11a, carried as R2-A1 and
R2-A5. Not: A-3, which is a publication condition rather than a text defect, and
is discharged by the public update that follows this round.

## Leg A — six findings, all upheld

| id | finding | ruling | fix |
|---|---|---|---|
| R2-A1 | MEDIUM. With the tools sentence gone, *"reviewers"*, *"their agreement"* and *"four reviewers independently"* read as human security reviewers | UPHELD. The owner's instruction removes tool names, not the need to stop the inference | *"the project's own reviews: not outside audits, and not reviews by outside security professionals"*; *"review passes"* in place of *"reviewers"* throughout |
| R2-A2 | HIGH. R-9 and REVIEW-062 changed the counts: nine corrections, 62 review records, and R-8 is no longer the last | UPHELD | Nine corrections, with R-8 and R-9 both told; *"more than sixty numbered review records"*, which holds whether or not REVIEW-062 is public when the post goes out |
| R2-A3 | HIGH. The new R-9 entry was forgiven by an unrelated strike or a *"no longer"* in the window, so the row's promise that the wording must be *"struck beside this id"* was false. Measured on copies of the README | UPHELD. Confirmed with the leg's own two mutations | A per-entry `ownStrike` rule: the copy itself must sit inside a `~~` strike, counted within its own paragraph or table cell, and every copy there must be struck. Four controls through `scan()`. Broken six ways on a live file: unrelated strike, *"no longer"*, one struck and one not in a paragraph, the same in a table row each fail; a struck wrapped blockquote and a struck cell pass. The gate now prints that the rule covers one of 23 phrases |
| R2-A4 | MEDIUM. Keeping strikes left `~~ RULED…~~` where stripped `⚠` and `**` put a space inside the delimiter, which GFM does not render; E-76's and B-16's excerpts | UPHELD | `tightenStrikes()` pulls each delimiter against its text, drops a pair left empty and tightens an opener whose closer was cut; a lone `~`, as in B-1's *"~44.8 ms"*, is escaped. Four summary probes run before every build, and reverting each of the three fixes fails one. Rendered with `cmark-gfm`: every `~~` pair in the index and the topic files now gives a `<del>`, from four mismatches before. B-1's source row has the same lone-tilde problem and is not changed |
| R2-A5 | MEDIUM. The inbox's reason was still missing | UPHELD. XLS-0096 §8, §9 and §10 give it: arrivals are credited to the inbox *"to avoid proof staleness"* | *"Arrivals wait in the inbox so that they cannot change a balance while a proof about it is being built"* |
| R2-A6 | MEDIUM. The next-session prompt still listed the tools sentence as the owner's open decision | UPHELD | Recorded as removed at the owner's request |

Leg A also noted, outside its numbered findings, that the compact sigma protocol
is one of a Send's proofs, not the whole of it; both drafts now say so. It found
sentence-initial *"Read on"* for other dates in the README and an ADR, which it
graded below a finding; not changed.

## Leg B — six upheld in whole or part, six rejected

| id | finding | ruling | fix |
|---|---|---|---|
| B2-1 | *"Of the three"* reads as the three Zellic identifiers | UPHELD, LOW | *"Of the three reviews"* |
| B2-3 | *"adversarial review"* still sounds like an outside engagement | UPHELD with R2-A1 | |
| B2-5 | *"hides how much each supplier draws and owes"* reads as absolute, against the post's own bounding paragraph | UPHELD in part. `WHAT-CONFIDENTIAL-MEANS` limit 1: public totals bound hidden values, *"and in a small enough system they pin them exactly"* | The facility section says so. The page's summary sentence sits under the page's own bounding paragraph and is not changed |
| B2-6 | The run is offered as evidence while the design's local-node requirement was not met | UPHELD in part: the post stated both and not the relation | *"The run says nothing about that requirement"*, as the page already says |
| B2-7 | Terms: amendment, float, tranche, XRPLF, `tec`, vaults | UPHELD in part | A clause each. Rejected: W-CONF, which is a name, and ElGamal, which already has a gloss |
| B2-8 | *"the row wins"* is jarring | UPHELD, LOW | *"If this post and a row ever disagree, trust the row"* |
| B2-2 | *"three outside reviews"* implies three full, accessible audits | REJECTED. The paragraph says in the next three sentences which one could be read and what is known of the others | |
| B2-4 | The page's summary omits the limit, the issuer, enrolment and tranches | REJECTED. It is a summary under the lists it summarises and the bank line. Widening it to *"each supplier's amounts"* would overclaim: enrolment amounts are public | |
| B2-9 | The R-8 sentence is dense | Rewritten under R2-A2 | |
| B2-10 | Who were the reviewers | Answered by R2-A1 without tool names, as the owner asked | |
| B2-11 | How is a limit represented on the ledger | REJECTED. It is not on the ledger, which is why it is hidden; the post makes no claim about its representation | |
| B2-12 | A run-on legend string and fragmented diagram text | REJECTED. Both are artefacts of extracting text from the page's diagrams for this packet; the browser shows separate elements | |

## What this does not establish

The fixes from this round are checked by their own controls and probes, as set
before the round ran. No third read. The live page carries R-9 only after the
release procedure: a public update, a rebuild from that public commit, the
gate, the browser check, the preflight, the owner's deploy and `compare-deployed`.
