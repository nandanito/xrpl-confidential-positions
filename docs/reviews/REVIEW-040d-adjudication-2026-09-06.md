# REVIEW-040d — adjudication, round one

- **Rotation:** `REVIEW-040` — round one on `tools/claims-render-continuity`
- **Date:** 2026-09-06
- **Subject:** the branch at `cb72368`, four commits
- **Legs:** `REVIEW-040a` (detector attack, Gemini via `agy`, no repo),
  `REVIEW-040b` (evidence audit, Codex, read-only repo at the frozen commit),
  `REVIEW-040c` (reader, Gemini via `agy`, document text only),
  `REVIEW-040s` (self leg, written to a scratchpad and committed after the
  external legs returned).

⚠ **Every finding below was re-measured against the tree before being upheld.**
`CLAUDE.md`: a review finding is evidence, not an instruction. Two of the legs'
specific numbers were wrong while their diagnoses were right; both are recorded
as such rather than being quietly adopted or quietly discarded.

⚠⚠ **INDEPENDENCE LIMIT, STATED UP FRONT.** The `gemini` CLI is retired
(`IneligibleTierError`, redirecting to Antigravity), so **legs A and C both ran
through `agy` — one model, two very different packets.** Only leg B is a
genuinely separate model. `CLAIMS.md` E-160: unanimity can be one reading
distributed. Where A and C agree, that is one reading; where B agrees with
either, that is two.

---

## UPHELD — HIGH

### H1. A header/separator width mismatch makes the whole table vanish, and both checks pass.
**Found independently by leg A (§1B) and leg B (§3).** Two models, two packets.

`scan()` takes its column count from the **separator** and never compares it to
the header; `strayRows()` opens a table merely because a row precedes a
separator. GFM requires header and delimiter to have the same cell count — when
they differ, **nothing renders as a table at all.**

**Re-measured here:** header 2 cells / separator 4 / body 4 → `scan()` reports
zero problems, `strayRows` reports zero, and `marked@18` renders **no table**:
every line becomes a paragraph. Exit 0.

⚠ **This is the third distinct way this gate has certified a file whose rows do
not render** (blank line → E-243; prose and `---` → E-244; this). **Latent** —
no current instance, because every table in the register renders today.

### H2. A claim row without a space after the leading pipe is SILENTLY DROPPED from the index and every topic view.
**Found by leg B (§3).**

`| ` with a space is required by the `ROW` regex in both generators. GFM does
not require it. A row written `|E-9999| … |` is a **real table row** — confirmed
with `marked` — but is never parsed, so it appears in no index, no topic file,
and **no gate objects**.

⚠ **Leg B graded it "Missed, exit 0" and the first re-measurement here exited
non-zero** — because inserting a line shifted later row numbers and made the
generated files stale, which is a different detector firing for a different
reason. **Appending the row at the END of the last table, where nothing shifts,
reproduces leg B's result exactly: all three gates exit 0 and the row is in
neither generated file.** The finding stands; the conditions matter.

⚠⚠ **This bounds `check-claims-topics`'s headline property.** "Every row carries
a topic" is quantified over **parsed** rows. An unparsed row is not incomplete —
it is invisible. The gate does not say so.

### H3. E-245's central anti-split numbers came from an instrument that was then DISCARDED.
**Found by leg B (§2, §4).** ⚠ **This is the most serious finding of the round
and it lands on the justification for the branch's main design decision.**

E-245 says *"only ~20% of rows belong to exactly one topic; 93 of 245 matched
four or more"*. Those numbers come from an **exploratory nine-topic pass matching
WHOLE ROWS**, run before the classifier was designed. What shipped is a
**twelve-topic classifier matching HEADLINES**.

**Re-measured against the shipped rules, on the same 245 pre-E-245 rows:**

| instrument | exactly one topic | four or more |
|---|---|---|
| exploratory: 9 topics, whole rows (**quoted in E-245**) | 49 (20%) | 93 |
| **shipped: 12 topics, headlines** | **113 (46.1%)** | **4** |
| shipped 12 topics, whole rows | — | 197 (80.4%) |

⚠ **Leg B reported 121 (49.4%) singletons where this re-measurement gives 113
(46.1%).** The discrepancy is not resolved and does not change the conclusion:
under the instrument that ships, **roughly half the rows are single-topic and
only four carry four or more.** The "80% in 4+" figure is reproducible only
against whole rows, which is not what the classifier reads.

**The conclusion survives; the argument for it does not.** Generated views are
still defensible — ~half the rows are multi-topic, so a split would force a
single home for about 120 rows — but that is a materially weaker claim than the
one E-245 makes, and **the number in the register cannot be reproduced from the
tree**, which is this project's own standing prohibition.

⚠ **Leg B's further point is upheld: the framing was a FALSE DICHOTOMY.** A
physical split and generated secondary indexes are not mutually exclusive; rows
could live in one primary file and still be surfaced under every tag. E-245 and
the handover both present it as either/or.

---

## UPHELD — MEDIUM

### M1. Three of the eight grades are the WRONG KIND. (leg B §1)
The register's grade vocabulary is **evidentiary modality**: `executed` means
behaviour was exercised, `measured` a count, `source`/`read` an inspection.

| row | verdict | why |
|---|---|---|
| E-169 | **WRONG KIND** | *"Reconciled to the receipt"* is a source comparison, and the cell itself says *"nothing gates that today"*. |
| E-172 | **WRONG KIND** | *"the post-round-two sweep found three more live assertions"* is a sweep, not an executed result. |
| E-174 | **WRONG KIND** | the `cargo build -vv` evidence is in the **Claim** cell; the **Evidence** cell says only *"Rejected, with the evidence recorded"*. |
| E-170, E-171, E-173, E-175, E-176 | SUPPORTED | each names an executed probe, mutation or receipt in its own evidence cell. |

⚠ **The self leg reached the same verdict on E-169 independently and missed
E-172 and E-174.** That is the expected shape: the session that assigned the
grades caught one of its own three errors.
⚠ **E-174's is the sharpest distinction in the round** — evidence in the wrong
*cell* is not evidence for that cell's grade.

### M2. E-244's dating is wrong for six of the eight rows. (leg B §2)
E-244 says the eight have carried three cells *"since 2026-08-27 (`432dad4`)"*.
Only **E-169 and E-170** existed at `432dad4`; the other six entered in four
later commits **the same day**. The date is right, the commit attribution is not.

### M3. E-245 says 317 rows; the tree says 318. (leg B §2)
⚠ **A self-referential count — E-236's exact shape, in the row that documents a
generator built to stop restated numbers.** 317 was true when the sentence was
written and false once E-245 itself was added.

### M4. The redundancy check uses `.every()`, so a PARTIALLY redundant override is missed. (leg A §5, leg B §3)
Found as a mechanism by leg A and as a **live instance** by leg B.
**Re-measured:** `OVERRIDES["E-111"] = ["review-rounds", "decisions-and-scope"]`,
and `byRules` already returns `["claims-and-drift", "decisions-and-scope"]`. The
`decisions-and-scope` half is dead weight and the gate is silent, because
`.every()` requires **all** members to be redundant.
⚠ Also: an empty override array `[]` is vacuously "redundant".

### M5. `headline()` throws away the row, and an override HIDES that. (leg A §4, self S2)
`/^\*\*(.+?)\*\*/` is non-greedy. `E-17` opens `**When set**, \`sfDomainID\` …`,
so its headline is **`"When set"`** — nine characters carrying no subject. It
matches no rule, and the branch resolved that with an `OVERRIDES` entry.
⚠ **The override asserts *the patterns do not reach this row* when the truth is
*the extractor discarded the row's content*.**

### M6. `summarise()` strips backticks but keeps PIPES, and no generated file is gated. (self S1)
A headline containing `` `a|b|c` `` — a grep alternation, ordinary in this
register — emits `a|b|c` into a generated table row, where the pipes are
structural. **`docs/CLAIMS-INDEX.md` and the 13 files under
`docs/claims/by-topic/` are not in `check-table-integrity`'s `TARGETS`.**
**Latent:** 0 current headlines would trigger it, verified with a probe that was
itself verified by injecting a positive.

### M7. "320 rows inside 9 tables" describes an uncommitted intermediate. (leg B §2)
No commit holds that state: the repair commit has 321 (it also adds E-244) and
the frozen tree 322. The measurement was real and is not reproducible from any
tree, which makes it unauditable as written.

### M8. "Eleven of the first thirty-seven overrides" is unfalsifiable from the tree. (leg B §2)
The 37-entry list and the E-87/E-90 comment-out incident survive only as
retrospective prose. Both happened; neither is recoverable from a commit.

---

## UPHELD — LOW

- **L1** (leg A §2) `| - | - | - |` is a valid GFM delimiter row; `isSeparator`
  demands `-{2,}` and the gate **false-FAILS** on it. Re-measured: `marked`
  renders a table, the gate reports 3 stray rows. Latent — 0 instances.
- **L2** (leg A §3C) A double-backtick code span containing a pipe miscounts:
  `cells()` returns 5 where GFM sees 4. Three `` `` `` occurrences exist; none
  currently breaks a count.
- **L3** (leg A §3C) A cell ending in a literal backslash loses a delimiter:
  `stripCode` turns `\\|` into `\`. Latent — 0 instances.
- **L4** (leg B §2) 156/245 is **63.67%**, which rounds to **64%**; E-245 says 63%.
- **L5** (leg C §7, self S5) `A, executed (E-244)` reads as part of the grade
  rather than as provenance. Consistent with E-162's precedent, and still
  confusing to a reader who met it cold.
- **L6** (leg C §5, §7) **Both navigation aids index headlines only.** A concept
  discussed in a row body is invisible to both; the reader put confidence at
  ~60% for "everything about secrets" and said they would fall back to grep.
- **L7** (self S4) `protocol-and-crypto` holds 139 of 318 rows — a filter that
  returns 44% of the corpus has not narrowed much.
- **L8** (self S6) "Ten gates" is right for the preflight block and reads as a
  project total; the Makefile has **13** `check-*` targets.

---

## REJECTED, with reasons — so they are not relitigated

- **Leg A §3C, the backslash cell count.** The leg said `cells()` returns **2**;
  re-measured it returns **3**, and GFM sees **4**. ⚠ The first re-measurement
  here was also wrong — it asserted GFM sees 3 — and was settled by running
  `marked`, not by reasoning. **The defect is real; both stated numbers were not.**
- **Leg A §1A, four-space indentation.** Upheld as stated: 4+ spaces make an
  indented code block and the gate misses it. ⚠ **But it is NOT the same defect
  as the handover's 3-space case**, which `marked` keeps inside the table; that
  one broke because of list-item context. Two mechanisms, one symptom.
- **Leg B's 121 single-topic rows (49.4%).** Re-measured as **113 (46.1%)**
  against the shipped rules. Not resolved, does not change H3's conclusion,
  recorded so the next round does not adopt either number unchecked.
- **Leg B §3, "no-space row missed, exit 0".** Upheld only under the conditions
  named in H2. The naive reproduction exits non-zero for an unrelated reason.

---

## AFFIRMED — what the round did NOT find

- **No defect in the repair itself.** Leg B: *"the continuity repair is real and
  most E-244 measurements hold."* The re-emitted header and the `F-29` move are
  the register's own idiom, and `marked` confirms 0 rows outside a table.
- **Both gates are genuinely falsifiable.** Leg B mutation-tested them
  independently and both advertised positive mutations were caught.
- ⚠ **The navigation design was VALIDATED by the instrument that was supposed to
  attack it.** Leg C answered every retrieval question correctly, used the index
  for id lookup and the topic files for thematic questions, and reported that
  **neither aid is redundant** — *"they serve completely different access
  modes"*. That is the third question E-243 said to add to a rotation, asked for
  the first time, and the design passed it.
- **No row was lost or altered by the repair**: 291→292 ids, every regraded row
  a pure append, diffed against `main`.

---

## What round two must review

Round two reviews the **FIXES**, per `CLAUDE.md`. The stopping condition it
should test: **round one's findings are about the instruments and the evidence,
not the construction.** If round two's findings move back to the construction,
the two-round rule has not converged.
