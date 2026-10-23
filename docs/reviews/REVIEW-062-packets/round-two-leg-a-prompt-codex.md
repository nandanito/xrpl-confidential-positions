# REVIEW-062 round two, leg A — do round one's fixes discharge their findings?

You are a documentation and code reviewer for an open-source research project,
checking fixes made after a first review of two draft posts and one public web
page. The project studies what XLS-96 (confidential Multi-Purpose Tokens on the
XRP Ledger) hides and what it does not. Its claims register, `CLAIMS.md`, governs
every sentence it publishes: **E** rows are evidence, **F** findings, **P**
standing prohibitions, **B** blockers, **R** corrections. Where a text and a row
disagree, the row wins. Agreement is not useful; a fix that holds is worth
reporting only if you checked it and say how.

This is the second and last round. Its stopping condition was set before it ran:
there is no third round, and whatever this round finds is fixed and checked by
its own tests and controls. So report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two commits:
   round one's subject, and the tree after its fixes. **`git diff HEAD~1 HEAD` is
   the subject.** Generated files (`docs/claims/`, `docs/CLAIMS-INDEX.md`,
   `docs/CLAIMS-REVISIONS.md`) change only because their generators ran.
2. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com/repos/XRPLF/mpt-crypto`.
   If it is not 200, print `NO NETWORK` at the top of your report and mark every
   upstream claim as not checked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold the
   owner's private configuration for a test network and you do not need them.
4. You may write scratch files under `$TMPDIR` or a `review-work/` directory, run
   `bun install --frozen-lockfile`, `bun test`, and the `make` targets named below,
   and make mutation tests on copies. Do not commit or push.

## What changed, and why

1. **Round one's fixes to both drafts**, `docs/posts/BLOG-2026-10-22-draft.md` and
   `docs/posts/LINKEDIN-2026-10-22-draft.md`. Round one's findings and rulings are
   `docs/reviews/REVIEW-062c-adjudication-2026-10-22.md`: leg A's A-1 to A-3 and
   leg B's B-1 to B-13. Its packets are in `docs/reviews/REVIEW-062-packets/`.
2. **The owner's two requests of 2026-10-22.** The blog no longer says what tools
   the project was built or reviewed with. And the sentence *"it hides the shape of
   the book, not its size"* is replaced on the hosted page
   (`web/app/src/hosted/routes/how-it-works.tsx`), in `README.md` and in
   `docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md`, recorded as `CLAIMS.md`
   R-9.
3. **Two tool changes made on the way.** `tools/check-disclosure-phrases.ts`
   gained an entry for the replaced phrase. `tools/build-claims-index.ts`'s
   `summarise()` now keeps `~~` strikes in excerpts instead of deleting them, and
   closes a strike that truncation cuts.

## Questions, in this order

1. **Each upheld finding.** For every finding round one upheld, in whole or in
   part: does the text after the fix discharge it? Run the finding's own example —
   read the sentence the way the finding read it — rather than taking the
   adjudication's summary. Quote the finding, the fixed text, and your verdict:
   *discharged*, *partly*, or *not*.
2. **New sentences.** Every sentence the fixes added or rewrote: is it true against
   `CLAIMS.md` and the repository, and does it claim more than its source? Pay
   attention to the reviews paragraph after the AI sentence was removed: does
   anything now imply outside or human reviewers, or an audit?
3. **Surviving copies.** For each corrected phrase, grep the whole tree, not just
   the drafts: *"shape of the book"*, *"three reviews of this code"*, *"each a
   sentence"*, *"later found false"*, *"fit neither"*, *"Read on 2026"*, and any
   other you find. Report each live copy (files under `docs/reviews/` are records
   and exempt).
4. **R-9's replacement sentence**, *"it hides how much each supplier draws and owes,
   not who borrows, when, or the size of the float"*: does it hold against E-146,
   F-24, R-1 and the facility walkthrough? Does it now understate or overstate
   anything?
5. **The two tools.** Run `make check-disclosure-phrases`, `make check-claims-index`,
   `make check-claims-topics` and `make check-tables`. Break the new phrase entry on
   a copy of a live file (an unmarked copy, a copy citing R-9 with no strike, a copy
   wrapped across lines) and say whether each fails. For `summarise()`: does keeping
   strikes break any generated table, and does a cut inside a strike close it?
   Look for any excerpt in the generated files whose strike is now unbalanced.

## Report

Print the whole report to stdout, as Markdown. For each finding: an id (R2-A1,
R2-A2, …), a severity (**HIGH**: false, or claims more than the evidence, or a
gate that passes what it should refuse; **MEDIUM**: unsupported, misleading, or a
finding not discharged; **LOW**: wording), the quoted text, the evidence with
paths and line numbers, and a suggested correction. Then question 1's verdict for
every round-one finding, one line each. End with what you did not check, and the
line `END OF ROUND TWO LEG A REPORT`.
