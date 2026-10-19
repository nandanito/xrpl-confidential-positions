# You are auditing EVIDENCE, not code style

You have READ-ONLY access to a git repository at
`$REPO`.

⚠⚠ **READ THE FROZEN COMMIT, NOT THE CHECKOUT.** The working tree may move under
you. Read every file as:

```
git show cb72368a1322b29262c7eb4681a7962bab6327ed:<path>
```

⚠ **DO NOT MODIFY ANYTHING.** No commits, no edits, no new files. You may run
read-only commands (`git show`, `git log`, `grep`, `bun run <gate>`).

## The subject

Branch `tools/claims-render-continuity`, four commits, frozen at `cb72368`.
It does four things:

1. Repairs `CLAIMS.md`, which was rendering 96 of its rows as loose
   pipe-delimited text rather than as table rows.
2. Extends `tools/check-table-integrity.ts` with a CONTINUITY check.
3. Assigns a Grade cell to **eight rows that had none**: `E-169` … `E-176`.
4. Adds `tools/build-claims-topics.ts` and `docs/claims/by-topic/`.

It registers two new claims, **E-244** and **E-245**, in `CLAIMS.md`.

## Your job — four questions, in priority order

### 1. ⚠ THE EIGHT GRADES. This is the highest-value question.

`E-169` … `E-176` were written without a Grade cell and nobody noticed for nine
days. This branch assigned each one: seven `A, executed (E-244)` and one
`A, source (E-244)` for `E-170`.

**The register's grade vocabulary is not decorative.** Read the surrounding rows
to infer what the project means by `A`, `A, executed`, `A, measured`,
`A, source`, `A, reasoned`. Then, **for each of the eight, read that row's OWN
evidence cell and say whether the assigned grade is supported by it.**

For each: `SUPPORTED` / `TOO STRONG` / `TOO WEAK` / `WRONG KIND`, one sentence
of why, quoting the phrase in the evidence cell that decides it.

⚠ **The precedent the branch followed is `E-162`**, where seven Findings rows
had the same defect and were repaired the same way, tagged `(E-162)`. Check
whether that precedent actually supports what was done here.

⚠ **Grading is a judgement about evidence, and the session that assigned these
is the same one that found the defect.** That is exactly the conflict this
question exists to check. Be willing to say a grade is unearned.

### 2. Do E-244 and E-245's numbers hold?

Both rows assert specific measurements. **Check each against the tree**, and say
which you could reproduce, which you could not, and which are unfalsifiable as
stated. Examples of what they claim: 96 rows outside tables in two runs; 8 rows
with 3 cells under a 4-column header; the break dating to `8f5b8bd`; ~20% of
rows in exactly one topic; 93 of 245 in four or more; 63% of rows citing another
row; 476 cross-references; eleven redundant overrides.

⚠ **A number that cannot be reproduced from the tree is a finding.** This
project has seventeen recorded instances of a restated number being wrong.

### 3. Are the gates actually falsifiable?

Both `check-table-integrity` and `build-claims-topics` claim to have been
"verified by breaking". **Break them yourself** and report what happens. In
particular:

- Does the continuity check catch a row placed after prose? After a `---`?
- Does `build-claims-topics --check` fail on an unclassified row?
- ⚠ **Is there a mutation each gate SHOULD catch and does not?**

### 4. The decision not to split

`CLAIMS.md` was NOT split into topic files; generated views were built instead.
The stated reason is that only ~20% of rows belong to exactly one topic, plus
476 cross-references and load-bearing chronology.

**Is that reasoning sound, or is it a rationalisation for the cheaper option?**
Argue the strongest case you can that a real split would have been better.

---

## Rules

- **Cite file and line for every finding.** A finding without a citation is an
  opinion.
- Grade each finding **HIGH / MEDIUM / LOW**, and say what would falsify it.
- ⚠ **If you believe something is fine, say so.** A round that returns only
  defects is not more rigorous, it is less honest.
- ⚠ **Do not report a defect you have not checked against the actual file.** A
  previous leg in this project graded a HIGH defect that did not exist, from its
  own excerpt of a file it had been given in full. Read before you claim.
