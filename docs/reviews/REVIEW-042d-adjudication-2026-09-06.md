# REVIEW-042d — adjudication, ROUND THREE

- **Rotation:** `REVIEW-042` — round three, reviewing `REVIEW-041`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `dc0e415`
- **Legs:** `REVIEW-042a` (attack the semantics change, Gemini via `agy`, no
  repo), `REVIEW-042b` (audit the fixes, Codex, read-only at the frozen commit,
  with `cmark-gfm` and `pandoc`), `REVIEW-042s` (self leg, scratchpad).

⚠ **Round three was owed and its scope was written in advance.** `REVIEW-041d`
said the stopping condition had not fired and named the test: *"whether the five
escaped rows and the GFM-semantics gate hold against a parser this project has
not used."*

---

## THE NAMED TEST — met, with a control

`cmark-gfm 0.29.0.gfm.13` — **GitHub's own reference implementation**, installed
for this round — and `markdown-it`, neither used before:

| parser | files | body rows | wrong width | stray paragraphs |
|---|---|---|---|---|
| `cmark-gfm` | 17 | 1256 | 0 | 0 |
| `markdown-it` | 17 | 1256 | 0 | 0 |

⚠⚠ **AND THE FIRST VERSION OF THAT CHECK COULD NOT FAIL.** Comparing `<td>`
count to `<th>` count over rendered HTML **always** passes, because GFM pads and
truncates every row to the header width. It reported "clean" on `cb72368`, where
four rows were known broken. **A check that returns clean on a tree known to be
broken is not evidence.** The working instrument compares the author's last cell
to the rendered last cell:

| commit | rows whose last cell the renderer DISCARDED |
|---|---|
| `cb72368` (before round one) | **4** |
| `1733bfd` (after round one) | **5** — round one's own `E-246` joined them |
| `dc0e415` (after round two) | **0** |

**The escaping is sound: 19 escapes, all five rows show their real Grade.**

---

## UPHELD — HIGH

### H1. `\|` handling disagreed with every real renderer, and my correction was the wrong one. (leg B, corroborated by leg A)

Round two's `stripCode` parked `\\` before stripping `\|`, so a **doubled**
backslash was treated as escaping the backslash and the pipe after it counted as
structural. `splitCells` did the same.

⚠⚠ **`cmark-gfm` and Pandoc both disagree: a `|` preceded by a backslash is
content, full stop. GFM's table scanner does a ONE-CHARACTER LOOKBACK and no
escape-counting.** Measured:

```
| X-1 | ends \\| next | A |   ->  cmark: 3 cells, content "ends | next"
                              ->  ours : 4 cells        (WRONG)
```

⚠ **This is the shape round two set out to eliminate, reintroduced by round
two's own fix**: the gate would pass a row whose Grade the renderer moves into
Evidence. **Latent** — no such row exists.

**Fixed.** `stripCode` is now one `replace(/\\\|/g, "")`; `splitCells` does the
one-character lookback. ⚠ **Validated CELL-FOR-CELL against `cmark-gfm` over
twelve row shapes** — plain, escaped pipe, doubled backslash, code spans single
and double, escaped pipe inside a span, no trailing pipe, empty cell, inline
HTML, a lone backslash pair. **Eleven match exactly; the twelfth differs only
because the comparison strips HTML tags, and its boundaries agree.**

---

## UPHELD — MEDIUM

### M1. The docstring still stated the false premise, directly above the corrected code. (self leg, leg B)
`stripCode`'s docstring read *"Remove inline code spans, so pipes inside
backticks are not cells"* — **the exact sentence `REVIEW-041` retracted** — and
`cells()`'s one-liner said *"code spans stripped"*. Round two replaced the body
and its inline comment and left the docstring above it.
⚠ **E-168's shape, in the fix for a finding whose lesson is E-168.** A reader
trusting the docstring re-introduces the defect. Also stale at
`build-claims-topics.ts`'s call site. All corrected in place, with the history.

### M2. The gate and the generators did not recognise the same language. (both legs)
`isRow()` matched `/^\s*\|/` — any indentation, tabs included — and required a
trailing pipe. **GFM allows at most three spaces (four is an indented code
block, not a row) and the trailing pipe is optional.** So a four-space row was
counted by the gate and skipped by both generators, and a valid row without a
trailing pipe was ignored by the gate and read by the generators. `isRow` is now
`/^ {0,3}\|/`.

### M3. `E-246` describes a splitter that no longer exists. (leg B)
It says the shared splitter *"walks backtick runs and escapes"*. Both halves
were subsequently retracted — code-span awareness was the wrong direction
(`REVIEW-041`), the escape handling was wrong (`REVIEW-042`). ⚠ **A register row
narrating a fix outlives the fix.** Marked in place rather than rewritten.

---

## UPHELD — LOW

- **The distribution's gloss pointed at the wrong side of the split** (leg B):
  it called the **singleton** share *"what a split would have to file under a
  single home"*. It is the **multi-topic** rows — now 169 of 320 (52.8%) — and
  the generator prints that.
- **The handover's "139 rows"** for the largest topic was stale against the
  generated 140 (leg B). Replaced with a pointer, not a corrected number.
- **Two probe names described the wrong shape** (leg A): a probe named *"so this
  row is short"* supplies an over-wide row; `parse()`'s comment still described
  flanking empties `contentCells()` removes.

---

## REJECTED, with reasons

- **Leg A: rows with no outer pipes should be accepted.** True of GFM,
  deliberately out of scope — every row in this register has outer pipes, and
  accepting bare rows would make any prose line containing a pipe a candidate
  claim row. **Named as a limit rather than fixed**, for the second round
  running.
- **Leg A findings 2.1 / 2.2 (empty first or last cell without an outer pipe).**
  Real for GFM, unreachable here for the same reason.
- **Two "LOST last cell" hits in `UPSTREAM-FEEDBACK.md`** raised by this
  adjudication's own sweep were **false positives of the sweep**: both cells are
  markdown links, rendering correctly as `<a>#608</a>` with four cells. ⚠ **Found
  by checking the instrument before believing it**, which is the same discipline
  that caught the `<td>`-count check above.

---

## ⚠⚠ CONVERGENCE — REACHED

`CLAUDE.md`: *"When the findings move from the construction to the INSTRUMENTS
THAT CHECK IT, that is convergence and it stops."*

**Round three found NO live construction defect.** Leg B, with repo access and
two renderers, states it plainly: *"I found no current rendered-row defect."*
Every finding this round is in an instrument or in prose:

- a semantics bug in the gate with **no row that triggers it**,
- a docstring contradicting its own function,
- a regex boundary disagreement with **no file that hits it**,
- a stale narration in a register row,
- a gloss pointing at the wrong side of a ratio.

⚠ **Leg B withholds the stricter form**, on the ground that `E-246` and the
handover still carried stale prose. **Those are fixed in this round**, which is
what its own falsifier asked for.

**Three rounds, nine legs, three parsers. The stopping condition has fired.**
A fourth round would review the fixes to a docstring.
