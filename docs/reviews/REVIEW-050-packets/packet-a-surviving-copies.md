# REVIEW-050 — round three, narrow: does any corrected sentence survive?

You are a reviewer with access to this repository at `7462add` and to a clone of `XRPLF/mpt-crypto` at `/tmp/wconf/mpt-crypto` (use `git -C` with explicit revisions). **No network. Do not edit anything** — this pass can write, and must not.

## Background, in two lines

Two review rounds (`REVIEW-048`, `REVIEW-049`) corrected sentences in `CLAIMS.md`, `UPSTREAM-FEEDBACK.md`, `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` and `docs/NEXT-SESSION-PROMPT.md`. **In both rounds the defects that survived were the same kind: a corrected sentence or list that had a second copy somewhere nobody edited.** This round exists only to find those.

## The subject

- Every correction is in `git diff a130479 7462add -- CLAIMS.md UPSTREAM-FEEDBACK.md docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md docs/NEXT-SESSION-PROMPT.md`.
- What each correction was for is in `docs/reviews/REVIEW-048c-adjudication-2026-09-22.md` and `docs/reviews/REVIEW-049c-adjudication-2026-09-22.md`. Read both whole.

## One question, two parts

1. **For every sentence the diff corrects, does the OLD claim survive anywhere in the tree outside `docs/reviews/`?** Search for the old wording AND for paraphrases of the same claim — not only the exact string. Examples of old claims, not a complete list: *upstream mpt-crypto is unchanged on F-19*; *F-19 is not new* without scoping to the class; *F-8 is fixed upstream* or *nothing to file* without the packaging caveat; *F-7 and F-12 still hold at HEAD* as a status; *the implementation is not affected* without scope; *the paper's nonce input omits TransactionContextID* as settled; *no upstream text says which was intended*; *two emcc link lines* asserted of `1.0.5`; *six rows* for B-30; *neither got the composition whole*.
   - **Exempt, and do not report:** `docs/reviews/`, and documents dated before 2026-09-14 that describe what was true at their own date (a dated record of a build at `85dbac7` is not a copy of a claim about `1.0.5`). If unsure whether something is a dated record, report it and say why.
2. **`B-30` lists the sites where this register settled "has upstream already raised this?" against Trail of Bits alone.** Its recorded sweep is `rg -n -i '0 matches|report matches|neither is in the Trail|Trail of Bits report does not touch|Trail of Bits does not|not among the (April )?report' CLAIMS.md UPSTREAM-FEEDBACK.md`. **Search with spellings that regex does NOT use** — *ToB*, *TOB-RIPCTX*, *the audit*, *the security review*, *audit coverage*, *no existing coverage*, *not previously reported*, *unreported*, *nobody has raised*, *the report does not*, and others you think of — across the whole tree outside `docs/reviews/`, including `README.md`, `docs/`, `web/` and `facility/`. Report every site B-30 does not already name.

## Rules

- **Quote and cite** each hit: file, line, the sentence, and the command that found it.
- **Say for each whether it is a real surviving claim or a false match**, and why.
- **List the searches you ran that found nothing**, so the negative is checkable.
- **Rank** HIGH / MEDIUM / LOW. If nothing survives, say so plainly.

# Return format

```
## SURVIVING COPIES, most serious first
## B-30 — sites it does not name
## FALSE MATCHES, and why
## SEARCHES THAT FOUND NOTHING
```
