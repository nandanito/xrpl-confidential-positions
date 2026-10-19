# Emphasis discipline

**Status:** specified 2026-09-09, **enforced the same day** by
`tools/check-emphasis.ts` (`make check-emphasis`), forward from a cutoff the
gate prints. `tools/break-emphasis-gate.sh` is the fifteen mutations that verify
it. ⚠ Rules 1, 3, 4, 5 and 6 are enforced; **rule 2 is not machine-checkable and
is not checked**, which the gate says on every run.

## The measurement that produced this

No convention was ever written down. Density grew by accretion, monotonically,
at every sample:

| | ⚠ per KB of `CLAIMS.md` |
|---|---|
| 2026-08-16 | 0 |
| 2026-08-20 | 0.5 |
| 2026-08-27 | 1.1 |
| 2026-09-06 | 2.1 |

Per-row, the same shape: **0.6 per KB across E-1…E-99, 2.3 across the whole
register, 4.0 across E-244…E-248** — the rows written in the session that
measured this. **The session complaining about the drift was its largest single
amplifier.**

The `Revision history` section is the worst instance and is what prompted the
rule: **one paragraph of 4,811 characters, 42 bold runs inside it, 37% of the
section's characters inside `**`.** ⚠ That is a SOURCE count; since `REVIEW-045`
the gate measures RENDERED text and reports **4,631** for the same paragraph.
Both are true of different units, and the gate's is the one rule 6 means. Past roughly a third, bold is the baseline
and marks nothing.

⚠ **Rewritten as a table on 2026-09-09, and the wall turned out to be hiding
two things.** The log had not been maintained since 2026-08-25 — 62 commits and
118 rows earlier — and the `2026-08-17` entry's body had been deleted on
2026-08-18, leaving a date, a comma and nothing after it, for twenty-two days.
**Neither was found by reading; both were found by giving every entry cells.**
`CLAIMS.md` E-249 and E-250.

## Why it matters here

This register's whole purpose is that a reader can tell a claim from its
evidence and a live statement from a retracted one. **Emphasis is the instrument
that carries that distinction, and an instrument used on everything measures
nothing.** `REVIEW-039`'s reader leg already reported the symptom: with several
ordinal counters shouting at once it was hard to tell which belonged to which
failure mode.

⚠ The project already knows these marks are internal scaffolding —
`.claude/commands/upstream-issue.md` strips them before anything is filed
upstream: *"No internal emphasis style."*

## The rules

1. **`⚠⚠` — at most ONE per row.** It marks the single thing that would cost the
   next session real time if they missed it. A row with two is a row that has
   not decided what its headline is.
2. **`⚠` marks a RETRACTION or a CORRECTION** — a statement that was made and is
   now withdrawn, or a number that was wrong. **It does not mean "important".**
   Importance is what the row is for.
3. **At most THREE `⚠` per row**, `⚠⚠` included.
4. **A `⚠` starts a sentence.** Never mid-sentence, never mid-clause.
5. **Bold carries the claim, not the prose.** At most **20%** of a row's
   characters inside `**`. The claim's headline and the retracted phrase being
   quoted are the normal uses.
6. **No paragraph over 800 characters** in a narrative section (`Revision
   history`, section notes, `CLAUDE.md` prose). A chronological log belongs in
   a table — this register's own idiom — not in a wall.

   ⚠ **A "paragraph" here is prose only.** A list block and a fenced code block
   are not paragraphs, however long they run: a reader scans a list by its
   bullets. Found by applying this rule to the document that states it — the
   first draft flagged its own 1,437-character bullet list, which is a false
   positive of the measurement, not a violation. **The gate must split on list
   and fence boundaries, and a control must pin that.**

## Scope, and what is deliberately NOT changed

⚠ **Enforced forward, from the cutoff row recorded in the gate.** Existing rows
are left as written.

**That is not laziness, it is this register's own principle**: it keeps
retracted claims rather than rewriting them, because the record of what was
believed is evidence. Reformatting 955 historical marks would rewrite the
evidence of how the drift happened — **and this document is that evidence.**

**The one exception is `Revision history`**, which is a navigational surface
rather than a claim record. It is rewritten as a table.

## The gate

`tools/check-emphasis.ts`, `make check-emphasis`:

- per row after the cutoff: `⚠⚠` ≤ 1, total `⚠` ≤ 3, bold ratio ≤ 20%
- no `⚠` preceded on its line by a non-space, non-`(`, non-`—` character
- no narrative paragraph over 800 characters in the named files
- ⚠ **controls in both directions**, each running through the real detector: a
  compliant row must pass, and one row violating each rule must fail
- the cutoff is a row id, stated in the gate and printed in its output

## What was built, and where it departs from the specification above

⚠ Three departures, each measured rather than argued:

- **Rule 6 uses two instruments, not one.** `CLAIMS.md` gets a by-name exemption
  list, and each entry must match exactly one over-length paragraph or the gate
  fails. `CLAUDE.md` gets a **ratchet on a count** instead, because its long
  paragraphs are Status blocks that most sessions rewrite: a by-name list over
  them would false-fail on every ordinary edit, and a gate that false-fails gets
  switched off. **A bound, not a guarantee.**
- **The `⚠`-position rule accepts an em dash**, as the bullet above specifies,
  which rule 4's own prose (*"never mid-clause"*) arguably forbids. The gate
  follows the gate's specification and discloses the disagreement rather than
  resolving it silently. **The complete allow-list is `.` `!` `?` `—` `(`, an
  unescaped `|` opening a cell, a `(n)` enumerator and a closed `~~retraction~~`
  — and it is complete because `REVIEW-043` found `;` and `:` in it and in no
  disclosure.** Both were removed: a semicolon joins clauses inside a sentence,
  which is what rule 4 forbids, and the register used the two **five times in
  795 contiguous `⚠` runs** at `b97966c`, so nothing depended on them.
- **A `⚠` inside backticks is a mention, not a mark**, and does not count. The
  same masking makes `**` inside a code span not bold. Without it a row that
  discusses the notation spends its whole budget describing it — and a row that
  discusses it *outside* backticks still does, which is one of six residuals the
  gate prints.

  ⚠⚠ **The first masker was a false-pass path, and `REVIEW-043` measured it.**
  It took any backtick as a delimiter, so two shapes GFM renders as **visible
  prose** — a backslash-escaped backtick, and an opening run closed by a run of
  a different length — were blanked, and a governed row written either way
  carried two `⚠⚠` past the gate. It now implements CommonMark's **code-span**
  rule, **per table cell**, and the differential against `cmark-gfm` is a
  **committed control over thirteen shapes** that runs on every invocation.
  ⚠ *"Implements CommonMark's rule"* and *"nine shapes"* both overstated it:
  the masker models code spans and not autolinks, and the nine-shape check was
  a shell command run once and discarded (`CLAIMS.md` E-259, E-261).

⚠ **Verify it by breaking it against the real tree** before believing it, and
**do not let it report a number it did not count.** Both were done:
`make break-emphasis-gate` runs the mutations, and two of them were found to
have passed for the wrong reason after every one first reported ✓ (E-253).

⚠⚠ **And a mutation harness bounds itself.** `REVIEW-043` found two false-pass
paths in the masker's *parsing rules* that no mutation of the tree could reach,
and found that the harness read Bun's exit **1** — which a crash also produces —
as *the tree broke a rule*, so a probe whose mutation stopped the gate running
reported ✓. **The gate now prints a verdict line the harness must see and must
find agreeing with the exit code**, and anything else is `CRASH`. E-258.
