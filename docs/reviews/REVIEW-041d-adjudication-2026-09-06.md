# REVIEW-041d — adjudication, ROUND TWO

- **Rotation:** `REVIEW-041` — round two, reviewing `REVIEW-040`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `1733bfd`
- **Legs:** `REVIEW-041a` (attack the fixes, Gemini via `agy`, no repo),
  `REVIEW-041b` (audit the fixes, Codex, read-only at the frozen commit),
  `REVIEW-041s` (self leg, written to a scratchpad while the repo leg read).

⚠ **Two external legs, which is what `CLAUDE.md` records B-21's round two as
lacking.** Independence is real here: different models, different access, and
the two agreed on the headline finding without seeing each other.

---

## ⚠⚠ THE ROUND'S HEADLINE — a false premise the gate was BUILT on

**In a GFM table a pipe is a cell delimiter EVEN INSIDE A CODE SPAN.** The spec
requires escaping a pipe to put it in a cell, *"including inside other inline
spans"*. **Found independently by the self leg and by leg B**, the latter
corroborating with two parsers (`marked@18` and Pandoc 3.9). Measured here:

```
| E-1 | `a|b|c` | ev | A |   ->  cells ["E-1", "`a", "b", "c`"]   code span BROKEN
| E-1 | `a\|b\|c` | ev | A | ->  cells ["E-1", "`a|b|c`", "ev", "A"]
```

⚠ **`stripCode()` protected code-span pipes, and the gate's own header argued
for it**: *"a naive `count('|')` flags every one of them and the gate becomes
noise that gets switched off."* **That rationale was false.** Those rows were
never noise — they were broken, and the gate was built to not see them.

**Five live rows in `CLAIMS.md` rendered with more cells than their header. GFM
discards the excess, so the Grade column displayed the wrong thing:**

| row | GFM cells | header | Grade column showed |
|---|---|---|---|
| E-48 | 8 | 4 | truncated grade |
| E-162 | 11 | 4 | **`Finding`** |
| E-214 | 6 | 4 | **a fragment of code** |
| E-222 | 6 | 4 | **`sort -u`** |
| **E-246** | 8 | 4 | wrong |

⚠⚠ **`E-246` IS THE ROW WRITTEN THIS SESSION TO RECORD ROUND ONE.** The register
entry documenting a rendering defect was itself one.

⚠ **Fourth distinct way this gate has certified a file whose rows do not
render**: a blank line (E-243), prose and `---` (E-244), a header/delimiter
width mismatch (`REVIEW-040` H1), and this.

**Fixed:** 19 pipes escaped across the five rows; `stripCode` and `splitCells`
now implement GFM semantics (only `\|` is content); the self-test that asserted
the falsehood is inverted and carries the history; the header rationale is
retracted in place. **Verified by breaking it:** unescaping E-162's pipes again
exits 1.

⚠ **Round two's own fix went the WRONG WAY first.** `splitCells` was given
code-span awareness to stop the generators truncating claim cells — which moved
them *away* from GFM. The register was the thing that was wrong.

---

## UPHELD — the rest

### H3, THIRD FIGURE FOR ONE MEASUREMENT (HIGH, leg B)
Round one corrected *"~20%, 93 of 245"* to *"113 (46.1%), 4"*. **That was also
wrong** — or rather, incomplete: it counted **rule matches only**. A leg counted
**final assignment** and got 121; leg B got 119. **All three are right for
different predicates** (rules-only vs rules+overrides, which cohort, which
commit). Re-measured here, at both commits, both ways — every figure reproduces
once its predicate is stated.

⚠ **The defect is the unstated predicate, not the arithmetic** — E-236 landing a
fourth time. **Fixed by deriving it**: `build-claims-topics.ts` now PRINTS the
distribution with its predicate named, and no figure is quoted in prose.

⚠⚠ **And the discarded numbers were live in FOUR places, not one.** Round one
corrected `CLAIMS.md`'s body and left them in **E-245's own headline**, the
`Makefile`, the generator docstring and the handover. **E-168's shape inside the
correction for it.** All four fixed by grepping the phrase.

### H1 PARTIAL, H2 PARTIAL (leg B)
- **H1**: ordinary width mismatches are caught. ⚠ The run FAILS, so nothing
  ships — but the output printed *"Every body row is governed by a header"*
  above a mismatch meaning no table exists. **Leg A graded this as rows going
  unflagged, which overstates it**; the verdict was right and the sentence was
  wrong.
- **H2**: the named no-space form was fixed; **three-space-indented rows were
  still invisible.** Both `ROW` regexes now accept `/^ {0,3}\|/`, verified by
  appending an indented no-space row where nothing shifts.

### MEDIUM — count drift inside the fix round itself (leg B)
- **`E-246` said *"cell-checked rows 357 → 1231"*, and that SPLICED TWO TREES**:
  1231 is the parent's corpus over 16 targets; the fixed tree reports **1241**.
  ⚠ **A before/after pair must come from one tree each.** Corrected.
- **`E-244` said *"nine controls"*** and the L1 fix made it ten, the same day.
  Corrected by removing the number: the gate prints it.
- **The handover said 318 rows** where the generated index said 319. Replaced
  with a pointer to the generators.

### MEDIUM — a control that could not discriminate (self leg)
The probe added for the backtick-run fix returned **6 parts under both the fixed
and the broken matcher**. Weakening `if (m === n)` to `if (m >= 1)` left it
passing. ⚠ **A control that cannot tell the fix from the bug is not a control** —
tenth instance of that shape here. Moot now that GFM semantics removed the
backtick logic entirely, and recorded because the *method* that found it
(breaking the fix, not reading the probe) is the transferable part.

### LOW — `MIN_HEADLINE = 40` is a heuristic (leg A, self leg)
A genuinely short headline now drags its following prose into the classifier.
**No live instance.** Disclosed rather than tuned; tuning it would re-open the
distribution the round was measured against.

---

## REJECTED, with reasons

- **Leg A: "H1 leaves body rows unflagged, gate passes".** The gate FAILS. What
  is wrong is a contradictory summary line, not the verdict.
- **Leg A: outer-pipe-less rows (`E-1 | claim | ev |`) should be accepted.**
  True of GFM, deliberately out of scope: every row in this register is written
  with outer pipes, and accepting bare rows would make any prose line containing
  pipes a candidate claim row. **Named as a limit in the gate rather than fixed.**
- **Leg B: "1231 is not a measurement of the frozen fix" — upheld — but its
  companion "E-244 still says nine controls" needed checking**; it did, and it
  does not any more.
- **Leg B's 119 and round one's leg B's 121 are not errors.** Both reproduce
  exactly, under their own predicates. Recorded so a third round does not
  "correct" a fourth time.

---

## ⚠ CONVERGENCE — NOT reached, and the condition is explicit

`CLAUDE.md`: *"When the findings move from the construction to the INSTRUMENTS
THAT CHECK IT, that is convergence and it stops."*

**Round two's headline is a CONSTRUCTION defect** — five live register rows
displaying the wrong Grade — **not an instrument defect.** The stopping condition
did not fire.

⚠ **But the defect's CAUSE was an instrument premise**, and the same measurement
now reproduces under every leg's predicate. **What a third round should test is
narrow and stated: whether the five escaped rows and the GFM-semantics gate hold
against a parser this project has not used** — round two used `marked`, leg B
used Pandoc, and both agree. **A third round that only re-reads the same two
parsers adds nothing.**
