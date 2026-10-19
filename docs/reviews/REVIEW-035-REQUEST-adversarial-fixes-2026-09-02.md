ADVERSARIAL review. Full read access to this repository. Modify nothing. Your
report is the deliverable. Assume the work is guilty until proven innocent.

## The subject is THE FIXES, not the original

Clean tree at `ef3b6f9` on branch `review/readme-rewrite`. `README.md`,
`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md`, `CLAUDE.md`,
`GETTING-STARTED-CLAUDE-CODE.md` and `web/README.md` have now been through
FOUR review passes. Every pass produced fixes. **Your job is to attack the
FIXES.**

`git log --oneline main..HEAD` shows the passes. `git diff main...HEAD` is the
whole change. **The most recent commits are the highest-value target**, because
their content has been reviewed least.

## Why this round exists — read this, it defines what counts as a finding

The last review found a HIGH that was **introduced by the previous round's fix**:
a paragraph ended up carrying BOTH a retracted sentence and its replacement, so
the document asserted an overclaim and contradicted it four lines later. That is
the defect class you are hunting.

⚠ **This project's own recorded failure mode is that a fix reaches the instance
someone was looking at and not the PHRASE.** Corrected sentences have copies.
`CLAIMS.md` E-168. It has recurred THREE times in this session alone.

**So: for every sentence that was CHANGED in this branch, grep the repository for
the OLD wording and for near-variants of the NEW wording.** A fix that landed in
one file and not its sibling is a finding. A retracted claim still standing
anywhere is a finding.

## What counts as a finding

1. **A fix that introduced a new defect**, or that contradicts something the same
   document says elsewhere.
2. **A fix applied to one site and not to its copies.** Grep the phrase.
3. **A claim that the source contradicts or does not support.** Cite `file:line`.
4. **A `CLAIMS.md` row id cited for something the row does not say.**
5. **A number that disagrees with another number, or with the tree.**
6. **A sentence a careful reader would take away as false**, even if literally
   defensible. This project has shipped exactly that defect four times.
7. **Anything in `docs/reviews/gemini-review-*.md`'s adjudication that is wrong** —
   including a finding I UPHELD that should have been rejected, or one I rejected
   that was real.

## Do NOT re-report

`docs/reviews/gemini-review-*.md` and `CLAIMS.md` rows E-222 and E-223 record what
the previous four passes found and what was done. **Read them first.** Re-reporting
a known, fixed finding is noise. Finding one that was recorded as fixed and is
NOT fixed is the highest-value result available to you.

## Format

For each finding: SEVERITY (P1/P2/P3), the exact quoted sentence, the `file:line`
that settles it, why it is wrong, and the corrected sentence. Then list what you
checked and found sound, so coverage is visible. Quote everything.
