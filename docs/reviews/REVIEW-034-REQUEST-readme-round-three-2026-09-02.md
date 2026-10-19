# REVIEW-034 — request: round three on the README rewrite

- **Date:** 2026-09-01 / 2026-09-02
- **Subject:** `README.md` at `b197315`, branch `review/readme-rewrite`
- **Devnet only.** No mainnet writes, at any phase, for any reason.

## Why a third round is owed

`CLAUDE.md`'s two-round rule stops at round two **unless round two's stopping
condition never fired.** The condition, in the file's own words: *"When the
findings move from the construction to the INSTRUMENTS THAT CHECK IT, that is
convergence and it stops."*

Round two's findings did **not** move to the instruments. They were in the
substance: a **false disclosure sentence** about the scope of the canonical
`EncZero`, a **false scope claim** that the project exercises XLS-70 and XLS-80,
and an **overclaimed security statement** about the decryption oracle. So the
condition never fired, and a third round is owed — **not by default, but by the
rule's own terms.**

## What rounds one and two were, and why they were not enough

Five legs, all fresh readers given **only the document text**, all the same model.
They found a great deal — `CLAIMS.md` **E-222** records it. But:

⚠ **Five same-model legs given packets I selected is one reading distributed**,
which is `CLAIMS.md` **E-160**'s lesson landing on the person who wrote it. And
**no leg could see the tree**, so not one claim was verified against source.

## Round three's legs, deliberately differed

| leg | model | access | job |
|---|---|---|---|
| **a — Gemini** | external | **document text only** | Attack the claims. Find what two rounds missed. No repo, so no contamination from `E-222`. |
| **b — Codex** | external | **full repo, read-only** | **Verify every claim against source.** The one thing five earlier legs could not do. |
| **s — self** | — | full repo + session history | Grep the *phrase*, not the line (E-168). Adjudicate remedies against source. |

⚠ **The Codex leg sees `CLAIMS.md` E-222 and therefore knows what rounds one and
two found.** Recorded as a known contamination and accepted deliberately: a
*verification* leg should know what has already been checked, and its job is
source-agreement rather than discovery. The Gemini leg is the uncontaminated one.

## The known weakness of this round

⚠ **Two external legs, one adjudicator, and the adjudicator wrote the subject.**
That is the same structural weakness `ADR-0001` §(d) and `ADR-0002` carry. It is
not fixed here and is stated rather than argued away.
