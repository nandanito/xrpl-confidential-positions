# You are reviewing FIXES with repository access

READ-ONLY access to `$REPO`.

⚠⚠ **READ THE FROZEN COMMIT.** The working tree may move under you:

```
git show 1733bfd140271aac1cc63e825788d254061bee44:<path>
```

⚠ **DO NOT MODIFY ANYTHING.** No commits, no edits, no new files. Read-only
commands and in-memory execution only.

## What happened

`REVIEW-040` round one reviewed branch `tools/claims-render-continuity` and
returned three HIGHs and eight MEDIUMs. The adjudication is
`docs/reviews/REVIEW-040d-adjudication-2026-09-06.md`. The fixes are commit
`1733bfd`; round one's subject was `cb72368`.

**Your job is to check the FIXES.** Round one's findings are already known — do
not re-report them. Report what the fix round got wrong.

⚠⚠ **THE SPECIFIC FAILURE THIS PROJECT KEEPS REPEATING IS AN ADJUDICATION THAT
OVERSTATES ITS OWN FIXES.** `CLAIMS.md` E-168: a round recorded eleven findings
FIXED and the next round found four were not. **Check the claim, not the
intent.**

## The questions

### 1. ⚠ Is every round-one finding ACTUALLY fixed, or only its example?

Work from the adjudication's own list — H1, H2, H3, M1–M8, L1–L8 — and for each
say **FIXED / PARTIAL / NOT FIXED / MISREPORTED**, with a citation. ⚠ **A fix
applied to the instance a finding named is not a fix to the property**; that
sentence is this project's own and it has failed it repeatedly.

### 2. The new `splitCells()`, and whether it is right

It is now load-bearing for both generators. **Verify it against a real GFM
parser's cell boundaries**, not against its own probes. Backtick runs,
unterminated spans, escaped backticks, escapes at end of line, adjacent spans.

⚠ **Check the SEVEN rows round two claims were mis-split** — `E-48`, `E-162`,
`E-204`, `E-214`, `E-222`, `E-229`, `B-21`. Confirm or refute that they were
wrong before `1733bfd` and are right after.

### 3. The corrected register rows

`E-244`, `E-245` and the new `E-246` were rewritten to correct numbers round one
found wrong. **Check the corrections themselves.** In particular:

- E-245 now states **113 single-topic (46.1%)** for the shipped classifier and
  records that a leg's recount gave **121 (49.4%)**. ⚠ **Which is right?**
  Compute it from the frozen classifier and say so.
- The three regraded rows: `E-169` and `E-174` → `A, source`, `E-172` →
  `A, measured`. Are those the right kinds now?
- ⚠ **Does E-246 claim anything the tree does not support?** It asserts seven
  mis-split rows, two with visibly wrong grades, 2→16 files scanned, 357→1231
  rows cell-checked, 18 controls.

### 4. Do the gates still hold, and did the fixes break anything?

Mutation-test the post-fix gates. ⚠ **Include the mutations round one used** —
a fix that closes a hole while opening another is this project's most common
shape.

---

## Rules

- **Cite file and line for every finding.** Prefer `path@1733bfd:line`.
- Grade **HIGH / MEDIUM / LOW**, and say what would falsify each.
- ⚠ **Say plainly which fixes are sound.** Convergence is a real finding: if the
  findings have moved from the construction to the instruments, say so.
- ⚠ **Do not report a defect you have not traced in the actual file.**
