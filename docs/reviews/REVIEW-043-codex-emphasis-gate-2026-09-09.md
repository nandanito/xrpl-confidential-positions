# REVIEW-043 — the emphasis gate, one leg, and the harness had the defect it exists to catch

- **Rotation:** `REVIEW-043` — round one on `tools/emphasis-gate`
- **Date:** 2026-09-09
- **Subject:** `b97966c` — `tools/check-emphasis.ts`, `tools/break-emphasis-gate.sh`,
  the `Revision history` rewrite and the rows E-249 … E-257
- **Legs:** one — Codex, read-only at the branch tip, invoked by the project
  owner through `/codex:review --scope branch --base main`
- **Findings:** five, graded P2. **All five upheld. None rejected.**

⚠ **One leg is not a rotation, and this is not one.** `CLAUDE.md` reserves the
full adversarial rotation for architecture, trust boundaries and anything to be
published; a gate is measurement code, which that rule says to build
immediately. This round happened because the owner asked for it, and what it
found is the argument for asking.

---

## What the leg found, and what measuring it showed

Every finding was checked against `cmark-gfm 0.29.0.gfm.13` or against the
detector itself before any fix was written. **The measurements are the reason
the dispositions are not just agreement.**

| # | Finding | Measured | Disposition |
|---|---|---|---|
| 1 | `break-emphasis-gate.sh` reads `main:CLAIMS.md` for its history fixture, which disappears the moment this branch merges | The lookup raises and `probe()` reports a failed mutation — loud, but the target is unusable after merge | **Upheld.** Pinned to `124e959`, and the pin now asserts the paragraph is exactly 4,811 characters so a pin resolving elsewhere fails rather than mutating with the wrong text |
| 2 | `maskCodeSpans` treats any backtick as a delimiter and closes with `indexOf`, so shapes GFM renders as visible prose are blanked | `cmark-gfm` renders `\` … \`` and an opening run closed by a different-length run as **visible text**; the gate reported `warns=0, doubles=0, bold=0.0%` on rows carrying two `⚠⚠` | **Upheld — a false-pass path.** Rewritten to CommonMark's rule: escapes outside spans only, a run of *n* closed only by exactly *n*, an unclosed run literal. **Validated against `cmark-gfm` on nine shapes** |
| 3 | `;` and `:` sit in rule 4's allow-list and appear in none of the documented departures | Across 795 marks in the register: 597 follow a full stop, 118 open a cell, 28 an em dash, 22 an enumerator, 12 a closed retraction — and **`;` four times, `:` once** | **Upheld.** Both removed, because rule 4's prose says *never mid-clause* and the measurement shows the register never depended on them. The `\|` case is now one character of lookback, matching `splitCells` |
| 4 | The paragraph splitter reads `1.` but not `1)`, which GFM also accepts | `cmark-gfm` renders `1)` as `<ol><li>`; a 900-character `1)` list was measured as a 903-character paragraph | **Upheld — a false-fail**, and the one this document's own rule 6 note exists to prevent |
| 5 | `probe()` classifies by exit code alone, and Bun exits **1** for a crash — the same code the gate uses for *the tree broke a rule* | A syntax error and an uncaught throw both exit **1**. Any probe expecting `FAIL` would report ✓ against a gate that never ran; any other exit code was labelled `PASS`; stderr was discarded | **Upheld, and it is the sharpest.** The gate now prints `check-emphasis: verdict=<X> exit=<n>` as its last line; the harness requires it, requires agreement with the exit code, and calls anything else `CRASH` |

---

## The thing worth carrying

⚠⚠ **Finding 5 is the defect the harness exists to detect, in the harness.**
`break-emphasis-gate.sh` was written because two of its own probes had passed
for the wrong reason, and the fix — distinct exit codes per failure class — was
then read by a classifier that could not tell a crash from a verdict. **The
instrument was one layer short of its own lesson.**

⚠ **Fifteen probes reported ✓ while two false-pass paths stood.** The break
harness measures the shapes it models and says nothing about the ones it does
not; that residual was printed and it was accurate. **A leg reading the
detector's parsing rules is what found them**, which no mutation of the tree
would have.

⚠ **Nothing was rejected, so there is nothing here to protect from
relitigation** — the record is that all five were confirmed by measurement
before being fixed, and the measurements are in the table above.

---

## Round two

**Owed.** Round two reviews the fixes, and these are the fixes. `CLAUDE.md`'s
stopping condition — findings moving from the construction to the instruments
that check it — **has not fired**: findings 2 and 4 are defects in the
construction of the detector itself, not in its evidence or its prose.
