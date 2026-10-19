# REVIEW-049, leg A — round two: are the FIXES true?

You are an adversarial reviewer with **read-only** access to this repository and to a local clone of `XRPLF/mpt-crypto`. A first review round, `REVIEW-048`, found seventeen defects in `CLAIMS.md` rows E-296 to E-307. The rows were then edited. **The fix edits added new factual sentences, and nobody has checked them.** That is your job.

## The subject

- `git diff a130479 65e16e8 -- CLAIMS.md UPSTREAM-FEEDBACK.md docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md docs/NEXT-SESSION-PROMPT.md` — every change the fix round made.
- `docs/reviews/REVIEW-048c-adjudication-2026-09-22.md` — the list of findings the edits were meant to fix. Read it whole.
- Two new rows: `B-30` and `E-310` in `CLAIMS.md`.

## What you can reach

- **This repository** at `65e16e8` (the current checkout; nothing will move under you).
- **`/tmp/wconf/mpt-crypto`**, a real clone holding `f196bdb`, `85dbac7`, `3baaaac` and tags `1.0.0` to `1.0.5`. Use `git -C /tmp/wconf/mpt-crypto` with explicit revisions; the checkout is at `85dbac7`.
- `docs/references/` — the Trail of Bits April 2026 PDF and `cmpt-compact-sigma.pdf`.
- **No network.**

## What to do

1. **Every new factual sentence the diff adds to `CLAIMS.md`: check it against source.** Every line number, count, file list, quoted string and "every other"/"only"/"none" in the added text. Examples of the kind of sentence meant — not a complete list, find them all in the diff:
   - the four files and counts now recorded for `git grep -c "if (context_id)"` at `f196bdb`;
   - the `1,000,000` sites now listed, and whether `bsgs_dlp.h:149` says *cap*;
   - *"the exported prover `MPT_ARG_CHECK`s every other pointer and not `context_id`"*;
   - *"`mpt_utility.cpp:654-656` rejects a NULL `context_hash`"* — at which revision, and is that the path that calls this prover;
   - the paper's §6.2 enumeration, item 4, and its closing sentence;
   - the composition now written into E-304 for 1276 B and 1210 B — does the arithmetic hold at the stated component sizes;
   - *"the three link lines"* at `build-wasm.sh:363`, `:365`, `:374`.
2. **`B-30` names six rows — E-296, E-303, E-304, E-305, E-306, E-307 — as settling upstream coverage against Trail of Bits alone.** Search the WHOLE of `CLAIMS.md` and `UPSTREAM-FEEDBACK.md`, not only those rows, for sentences of that kind (*"Trail of Bits does not raise"*, *"0 matches"* in the report, *"not among the report's"*, and other spellings). Is the list of six right? Is it complete? **A list of rows is a shape this project has got wrong repeatedly.**
3. **Surviving copies.** For every sentence the fix round corrected, grep the whole tree outside `docs/reviews/` for the old wording and for close paraphrases. Report any copy still asserting the corrected claim.
4. **Did any fix go too far?** A correction that now under-claims, or retracts something the evidence did support, is also a defect.

## Rules

- **Quote and cite.** Every finding: the sentence, the command you ran, its actual output.
- **Rank most serious first**, HIGH / MEDIUM / LOW.
- **Label each finding *undischarged* (a round-one finding the fix did not close) or *new defect*.** Only undischarged findings reopen the rotation; that stopping condition was set before this round ran.
- Do not soften, do not pad. Name what you checked and confirmed.
- You are read-only. Do not edit anything.

# Return format

```
## FINDINGS, most serious first
   n. [HIGH|MEDIUM|LOW] [undischarged | new defect] — row — quoted sentence
      command run, and its actual output
      what follows
## B-30's LIST — checked against the whole register
## SURVIVING COPIES
## NEW SENTENCES CHECKED AND CONFIRMED
## COULD NOT CHECK (no network)
```
