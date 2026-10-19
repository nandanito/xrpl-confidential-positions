# Round THREE: audit round two's fixes

READ-ONLY access to `$REPO`.

⚠⚠ **READ THE FROZEN COMMIT:**

```
git show dc0e415afffba57902069e47022ee5e18451e600:<path>
```

⚠ **DO NOT MODIFY ANYTHING.** Read-only commands and in-memory execution only.

## Where this is

Branch `tools/claims-render-continuity`. Three rounds:

- `REVIEW-040` (round one, `cb72368`) — adjudication in
  `docs/reviews/REVIEW-040d-adjudication-2026-09-06.md`
- `REVIEW-041` (round two, reviewing round one's fixes at `1733bfd`) —
  adjudication in `docs/reviews/REVIEW-041d-adjudication-2026-09-06.md`
- **This is round three, and round two's own fixes (`dc0e415`) are unreviewed.**

Round two's headline: **in a GFM table a pipe is a cell delimiter even inside a
code span**, so five live rows rendered with the wrong Grade. The fixes were:

1. **19 pipes escaped** across `E-48`, `E-162`, `E-214`, `E-222`, `E-246`.
2. **`stripCode()` and `splitCells()` changed to GFM semantics** — only `\|` is
   content; code spans no longer protect pipes.
3. A self-test that asserted the opposite was **inverted**; the gate header's
   rationale was **retracted in place**.
4. Both `ROW` regexes now accept up to three leading spaces.
5. The topics-per-row distribution is **printed by the generator** instead of
   quoted, after three different figures (113 / 119 / 121) were published for
   one measurement — all correct under different predicates.
6. Two count splices corrected: `"357 → 1231"` (halves from two trees) and
   `"nine controls"` (stale the same day).

## Your job

### 1. ⚠ Did round two's fixes break anything round one's fixes had established?

Re-run round one's and round two's own mutations against `dc0e415`. **A fix that
closes a hole while opening another is this project's most common shape.**

### 2. The GFM semantics change is the big one. Is it right, and is it complete?

`stripCode` now strips only `\|`. **Find a row shape where the gate's cell count
still disagrees with a real GFM renderer.** Consider: escaped backslashes,
pipes in HTML, autolinks, reference links, nested emphasis, an escaped pipe at
end of line, a row with no trailing pipe, alignment colons, an empty cell.

⚠ **Use a real parser, not reasoning.** `cmark-gfm 0.29.0.gfm.13` is installed
(`cmark-gfm -e table`), as is `pandoc`.

### 3. Are the 19 escapes correct — and complete?

Check each of the five rows. **Did escaping change what the row SAYS?** A `\|`
inside a code span renders as `|`, but check it actually does in each case, and
that no *other* row still carries an unescaped pipe that a renderer will eat.

### 4. Does the derived distribution actually say what it claims?

The generator prints "FINAL assignment (rules + overrides), ALL sections". Verify
that is what it computes, and that the printed figure matches an independent
count.

### 5. ⚠ Has the round-two adjudication OVERSTATED its own fixes?

`CLAIMS.md` E-168: a round recorded eleven findings FIXED and the next found
four were not. **Work the `REVIEW-041d` list and grade each FIXED / PARTIAL /
NOT FIXED / MISREPORTED**, with citations.

### 6. Is convergence reached?

`REVIEW-041d` says it was not, because round two's headline was a *construction*
defect rather than an instrument one. **Do you agree?** If round three's findings
are all in the instruments, say so plainly — that is the stopping condition.

---

## Rules

- **Cite `path@dc0e415:line` for every finding.**
- Grade **HIGH / MEDIUM / LOW**, and say what would falsify each.
- ⚠ **Say plainly what is sound.** A round returning only defects is less honest.
- ⚠ **Do not report a defect you have not traced in the actual file**, and
  **do not report a number you have not computed.** Two legs in earlier rounds
  gave right diagnoses with wrong numbers.
