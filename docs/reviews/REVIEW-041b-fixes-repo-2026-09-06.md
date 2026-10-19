# REVIEW-041b — auditing the fixes (Codex, read-only repo)

- **Rotation:** `REVIEW-041` — ROUND TWO, reviewing `REVIEW-040`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `1733bfd`
- **Access:** READ-ONLY repository at the frozen commit `1733bfd`.
- **Packet:** `docs/reviews/REVIEW-041-packets/packet-b-fixes-repo.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-041d`.**

---


codex
The fixes have not converged. Several are sound, but the new shared cell parser implements non-GFM semantics, E-245’s corrected numbers are still wrong, and E-246 is itself malformed under GFM.

## Findings

### HIGH — `splitCells()` and the table gate agree with each other, not with GFM

GFM table splitting happens on every unescaped pipe, including pipes inside code spans. `marked@18.0.11` and Pandoc 3.9’s GFM reader agree. The new splitter instead skips a matched backtick span, and `stripCode()` applies the same assumption. Its probes therefore certify the wrong model. `tools/build-claims-index.ts@1733bfd:86-117,211-243`; `tools/check-table-integrity.ts@1733bfd:109-129,323-332`.

Five current register rows have different project/GFM field counts:

- E-48: 4 vs 8 — `CLAIMS.md@1733bfd:99`
- E-162: 4 vs 11 — `CLAIMS.md@1733bfd:222`
- E-214: 4 vs 6 — `CLAIMS.md@1733bfd:274`
- E-222: 4 vs 6 — `CLAIMS.md@1733bfd:282`
- E-246: 4 vs 8 — `CLAIMS.md@1733bfd:306`

Most seriously, E-246’s own unescaped `` `|E-9999| … |` `` is parsed by Marked as the third and fourth cells; its real Evidence/Grade tail is discarded. The fix round therefore introduced a live construction defect while claiming the gate was correct all along. `CLAIMS.md@1733bfd:306`.

**Falsified if:** a conforming GFM parser renders an unescaped `|` inside a code span as non-structural, or those five rows are escaped and the gate rejects their unescaped mutations.

### HIGH — H3 remains false, and the leg’s 121 was reproducible

Executing the exact frozen `1733bfd` classifier over the 245 pre-E-245 Established rows gives:

- 119 single-topic, 48.6%
- 86 two-topic
- 35 three-topic
- 5 four-topic

Neither 113/46.1% nor 4 four-plus is correct. The old `cb72368` classifier gives exactly the leg’s 121 single-topic and 4 four-topic rows. The change to `headline()`, overrides, and cell parsing changed the distribution during the fix. `tools/build-claims-topics.ts@1733bfd:69-106,116-203`.

Worse, the original discarded-instrument rationale remains live in E-245’s headline, the generator documentation, the Makefile, and the handover. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:13-24`; `Makefile@1733bfd:220-226`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:58-68`.

**Falsified if:** the exact frozen classifier produces 113 singletons and 4 four-plus rows, or a documented different cohort/instrument reproduces those figures.

### HIGH — the completeness fix still recognizes only examples of GFM rows

The exact `|E-9999|...|` mutation is now parsed and rejected. But both generators still require the leading pipe at column zero, while the table gate requires both outer pipes. GFM permits up to three leading spaces and permits omitted outer pipes. Those mutations remain invisible to all three gates. `tools/build-claims-index.ts@1733bfd:43-52`; `tools/build-claims-topics.ts@1733bfd:54-61`; `tools/check-table-integrity.ts@1733bfd:138-143`.

The round-one four-space mutation also remains missed: Marked renders the indented rows as a code block, while `isRow()` accepts arbitrary whitespace and reports them governed by the preceding header.

**Falsified if:** an appended three-space or outer-pipe-less claim row changes either generated view, or a four-space body-row mutation makes `check-tables` fail continuity.

### MEDIUM — E-244/E-246 contain fresh count drift

E-246’s 2→16 target count is right, but 357→1231 is not a measurement of the frozen fix:

- `cb72368`, original two targets: 359 checked rows
- `cb72368`, expanded to all 16 files: 1231
- `1733bfd`, all 16 files: 1241

Thus 1231 is the parent generated corpus, not the fixed tree; the fix spliced measurements from intermediate states. The frozen counting path is `tools/check-table-integrity.ts@1733bfd:507-548`; the false claim is `CLAIMS.md@1733bfd:306`.

E-244 also still says nine controls, but the L1 fix makes ten continuity controls. `CLAIMS.md@1733bfd:304`; `tools/check-table-integrity.ts@1733bfd:259-288`. E-246’s total of 18 is correct: ten continuity plus eight width/strip controls at `tools/check-table-integrity.ts@1733bfd:303-332`.

The handover likewise still says 318 rows where the generated frozen index says 319. `docs/NEXT-SESSION-PROMPT.md@1733bfd:70-74`; `docs/CLAIMS-INDEX.md@1733bfd:14`.

**Falsified if:** frozen execution prints 1231, nine continuity controls exist, and the frozen generated index contains 318 rows.

### MEDIUM — M8 remains evidence-free

E-245 now admits that the 37-entry override state and comment-out incident are unrecoverable, but continues to assert both under `A, measured`; the same eleven-of-37 statement remains in live source and the handover. Disclosure is better than silence, but it does not make the measurement reproducible. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:320-326`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:151-160`.

**Falsified if:** the 37-entry snapshot and mutation output reproducing exactly eleven redundancies and the E-87/E-90 state are recovered.

## Round-one disposition matrix

| Item | Verdict | Frozen evidence |
|---|---|---|
| H1 | **PARTIAL** | Ordinary width mismatches are caught, but a header containing an unescaped code-span pipe still false-passes because width uses the non-GFM `cells()`. `tools/check-table-integrity.ts@1733bfd:109-129,425-448` |
| H2 | **PARTIAL** | The named no-space form is fixed; indented and outer-pipe-less GFM rows remain invisible. `tools/build-claims-index.ts@1733bfd:51`; `tools/build-claims-topics.ts@1733bfd:61` |
| H3 | **NOT FIXED** | Current result is 119/5; false 20%/93 and 113/4 claims remain. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:13-24` |
| M1 | **FIXED** | E-169 and E-174 are `source`; E-172 is `measured`, matching their Evidence cells. `CLAIMS.md@1733bfd:229,232,234` |
| M2 | **FIXED** | E-244 now distinguishes `432dad4` from the four later commits. `CLAIMS.md@1733bfd:304` |
| M3 | **PARTIAL** | E-245’s 317 was removed, but the same fix leaves the handover’s 318 stale against 319. `CLAIMS.md@1733bfd:305`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:73`; `docs/CLAIMS-INDEX.md@1733bfd:14` |
| M4 | **FIXED** | Redundancy is checked per member, and empty arrays are rejected. `tools/build-claims-topics.ts@1733bfd:328-348` |
| M5 | **PARTIAL** | E-17 and the round-one “Phase 1” example work, but 40 characters is only a heuristic; a longer generic bold lead still discards the continuation. `tools/build-claims-topics.ts@1733bfd:171-193` |
| M6 | **FIXED** | Summaries escape pipes and all generated documents are targeted. `tools/build-claims-index.ts@1733bfd:119-132`; `tools/check-table-integrity.ts@1733bfd:87-100` |
| M7 | **PARTIAL** | E-244 labels 320 as uncommitted, but the handover still presents it as “now.” `CLAIMS.md@1733bfd:304`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:18-25` |
| M8 | **PARTIAL** | Unrecoverability is disclosed, but the assertions remain graded measured. `CLAIMS.md@1733bfd:305` |
| L1 | **FIXED** | Single-hyphen delimiters are accepted. `tools/check-table-integrity.ts@1733bfd:131-140,284-287` |
| L2 | **MISREPORTED** | The round-one GFM premise was wrong; unescaped code-span pipes are structural. The “fix” creates false passes. `tools/check-table-integrity.ts@1733bfd:118-121,323-327` |
| L3 | **FIXED** | Escaped backslash pairs are parked before escaped-pipe removal. `tools/check-table-integrity.ts@1733bfd:109-117` |
| L4 | **NOT FIXED** | 63% remains in E-245, tool documentation, and the handover; 156/245 rounds to 64%. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:21-24`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:62` |
| L5 | **NOT FIXED** | Provenance remains embedded in Grade cells, e.g. `A, source (E-244, …)`. `CLAIMS.md@1733bfd:229-236` |
| L6 | **PARTIAL** | Headline-only indexing remains, but is now clearly disclosed where readers encounter it. `tools/build-claims-topics.ts@1733bfd:242-246`; `docs/claims/by-topic/protocol-and-crypto.md@1733bfd:12-16` |
| L7 | **PARTIAL** | The broad filter remains—140/319, 43.9%—but is disclosed. `docs/claims/by-topic/README.md@1733bfd:17,39-41` |
| L8 | **FIXED** | The handover now distinguishes ten preflight gates from thirteen Makefile targets. `docs/NEXT-SESSION-PROMPT.md@1733bfd:227-250`; `Makefile@1733bfd:1` |

## The seven claimed mis-splits

Counts below are natural structural fields before GFM truncates extra body cells to the table header width.

| Row | Old split | New split | GFM | Verdict |
|---|---:|---:|---:|---|
| E-48 | 8 | 4 | 8 | **Refuted.** Old index grade was wrong, but the new boundary model is also wrong; canonical rendering remains truncated. `CLAIMS.md@1733bfd:99` |
| E-162 | 11 | 4 | 11 | **Refuted.** GFM renders its fourth cell as `Finding`, not the intended grade. `CLAIMS.md@1733bfd:222` |
| E-204 | 6 | 4 | 4 | **Confirmed fixed.** Its `\|` pipes are escaped content. `CLAIMS.md@1733bfd:264` |
| E-214 | 6 | 4 | 6 | **Refuted.** Its unescaped code-span pipes are structural. `CLAIMS.md@1733bfd:274` |
| E-222 | 6 | 4 | 6 | **Refuted.** Its unescaped code-span pipe is structural. `CLAIMS.md@1733bfd:282` |
| E-229 | 5 | 4 | 4 | **Confirmed fixed.** Its `\|` is escaped content. `CLAIMS.md@1733bfd:289` |
| B-21 | 5 | 3 | 3 | **Confirmed fixed.** Its escaped grep alternation belongs in the third cell. `CLAIMS.md@1733bfd:314` |

The old index really did print fragments for E-48 and B-21. `docs/CLAIMS-INDEX.md@cb72368:85,288`. But only E-204, E-229, and B-21 were genuine `.split("|")` disagreements with GFM.

Edge cases against Marked:

- Single, double, and triple backtick runs with unescaped pipes: **wrong**; `splitCells()` shields them, GFM splits them.
- Unterminated span: **right**; both treat its pipe structurally.
- Escaped opening backtick: **right** for the tested shape; no span opens.
- Escaped pipe and terminal backslash: **right**.
- Adjacent spans: **wrong**; GFM splits every unescaped pipe. Additionally, `indexOf(fence)` can match a shorter fence inside a longer run, so it is not a correct CommonMark code-span matcher even on its own premise. `tools/build-claims-index.ts@1733bfd:97-109`.

## Gate mutations

The frozen baselines are internally green: index byte-match at 319 rows, 13 topic files byte-match with all 319 parsed rows classified, and the table checker reports zero problems across 16 targets. `docs/CLAIMS-INDEX.md@1733bfd:14`; `docs/claims/by-topic/README.md@1733bfd:11`; `tools/check-table-integrity.ts@1733bfd:526-560`.

Mutation results:

| Mutation | Post-fix result |
|---|---|
| Row after prose / after `---` | Caught |
| Plain header-width mismatch | Caught |
| Exact no-space `\|E-9999\|` row | Caught |
| Partial E-111 redundancy / empty override | Caught |
| Short first bold span, “Phase 1” | Correctly classified |
| Single-hyphen delimiter | Correctly accepted |
| Even backslashes before delimiter | Correctly handled |
| Four-space indented rows | **Missed** |
| Three-space indented claim row | **Missed by both generators** |
| Row without outer pipes | **Missed by all three gates** |
| Header-width mismatch caused by a code-span pipe | **Missed** |
| Extra body cell caused by a code-span pipe | **Missed** |
| “Field observation on reviewer rotation” | Still assigned both protocol and review; this remains the disclosed lexical false-positive tradeoff |

The sound fixes are H2’s exact no-space case, M1, M2, M4, M6, L1, L3, and L8; M5 fixes E-17 specifically. But because the fix introduced malformed E-246, left five canonical rows inconsistent with GFM, and registered incorrect fresh measurements, the round has not moved cleanly from construction to instruments. It is not converged.
hook: Stop
hook: Stop Completed
tokens used
276,608
The fixes have not converged. Several are sound, but the new shared cell parser implements non-GFM semantics, E-245’s corrected numbers are still wrong, and E-246 is itself malformed under GFM.

## Findings

### HIGH — `splitCells()` and the table gate agree with each other, not with GFM

GFM table splitting happens on every unescaped pipe, including pipes inside code spans. `marked@18.0.11` and Pandoc 3.9’s GFM reader agree. The new splitter instead skips a matched backtick span, and `stripCode()` applies the same assumption. Its probes therefore certify the wrong model. `tools/build-claims-index.ts@1733bfd:86-117,211-243`; `tools/check-table-integrity.ts@1733bfd:109-129,323-332`.

Five current register rows have different project/GFM field counts:

- E-48: 4 vs 8 — `CLAIMS.md@1733bfd:99`
- E-162: 4 vs 11 — `CLAIMS.md@1733bfd:222`
- E-214: 4 vs 6 — `CLAIMS.md@1733bfd:274`
- E-222: 4 vs 6 — `CLAIMS.md@1733bfd:282`
- E-246: 4 vs 8 — `CLAIMS.md@1733bfd:306`

Most seriously, E-246’s own unescaped `` `|E-9999| … |` `` is parsed by Marked as the third and fourth cells; its real Evidence/Grade tail is discarded. The fix round therefore introduced a live construction defect while claiming the gate was correct all along. `CLAIMS.md@1733bfd:306`.

**Falsified if:** a conforming GFM parser renders an unescaped `|` inside a code span as non-structural, or those five rows are escaped and the gate rejects their unescaped mutations.

### HIGH — H3 remains false, and the leg’s 121 was reproducible

Executing the exact frozen `1733bfd` classifier over the 245 pre-E-245 Established rows gives:

- 119 single-topic, 48.6%
- 86 two-topic
- 35 three-topic
- 5 four-topic

Neither 113/46.1% nor 4 four-plus is correct. The old `cb72368` classifier gives exactly the leg’s 121 single-topic and 4 four-topic rows. The change to `headline()`, overrides, and cell parsing changed the distribution during the fix. `tools/build-claims-topics.ts@1733bfd:69-106,116-203`.

Worse, the original discarded-instrument rationale remains live in E-245’s headline, the generator documentation, the Makefile, and the handover. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:13-24`; `Makefile@1733bfd:220-226`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:58-68`.

**Falsified if:** the exact frozen classifier produces 113 singletons and 4 four-plus rows, or a documented different cohort/instrument reproduces those figures.

### HIGH — the completeness fix still recognizes only examples of GFM rows

The exact `|E-9999|...|` mutation is now parsed and rejected. But both generators still require the leading pipe at column zero, while the table gate requires both outer pipes. GFM permits up to three leading spaces and permits omitted outer pipes. Those mutations remain invisible to all three gates. `tools/build-claims-index.ts@1733bfd:43-52`; `tools/build-claims-topics.ts@1733bfd:54-61`; `tools/check-table-integrity.ts@1733bfd:138-143`.

The round-one four-space mutation also remains missed: Marked renders the indented rows as a code block, while `isRow()` accepts arbitrary whitespace and reports them governed by the preceding header.

**Falsified if:** an appended three-space or outer-pipe-less claim row changes either generated view, or a four-space body-row mutation makes `check-tables` fail continuity.

### MEDIUM — E-244/E-246 contain fresh count drift

E-246’s 2→16 target count is right, but 357→1231 is not a measurement of the frozen fix:

- `cb72368`, original two targets: 359 checked rows
- `cb72368`, expanded to all 16 files: 1231
- `1733bfd`, all 16 files: 1241

Thus 1231 is the parent generated corpus, not the fixed tree; the fix spliced measurements from intermediate states. The frozen counting path is `tools/check-table-integrity.ts@1733bfd:507-548`; the false claim is `CLAIMS.md@1733bfd:306`.

E-244 also still says nine controls, but the L1 fix makes ten continuity controls. `CLAIMS.md@1733bfd:304`; `tools/check-table-integrity.ts@1733bfd:259-288`. E-246’s total of 18 is correct: ten continuity plus eight width/strip controls at `tools/check-table-integrity.ts@1733bfd:303-332`.

The handover likewise still says 318 rows where the generated frozen index says 319. `docs/NEXT-SESSION-PROMPT.md@1733bfd:70-74`; `docs/CLAIMS-INDEX.md@1733bfd:14`.

**Falsified if:** frozen execution prints 1231, nine continuity controls exist, and the frozen generated index contains 318 rows.

### MEDIUM — M8 remains evidence-free

E-245 now admits that the 37-entry override state and comment-out incident are unrecoverable, but continues to assert both under `A, measured`; the same eleven-of-37 statement remains in live source and the handover. Disclosure is better than silence, but it does not make the measurement reproducible. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:320-326`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:151-160`.

**Falsified if:** the 37-entry snapshot and mutation output reproducing exactly eleven redundancies and the E-87/E-90 state are recovered.

## Round-one disposition matrix

| Item | Verdict | Frozen evidence |
|---|---|---|
| H1 | **PARTIAL** | Ordinary width mismatches are caught, but a header containing an unescaped code-span pipe still false-passes because width uses the non-GFM `cells()`. `tools/check-table-integrity.ts@1733bfd:109-129,425-448` |
| H2 | **PARTIAL** | The named no-space form is fixed; indented and outer-pipe-less GFM rows remain invisible. `tools/build-claims-index.ts@1733bfd:51`; `tools/build-claims-topics.ts@1733bfd:61` |
| H3 | **NOT FIXED** | Current result is 119/5; false 20%/93 and 113/4 claims remain. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:13-24` |
| M1 | **FIXED** | E-169 and E-174 are `source`; E-172 is `measured`, matching their Evidence cells. `CLAIMS.md@1733bfd:229,232,234` |
| M2 | **FIXED** | E-244 now distinguishes `432dad4` from the four later commits. `CLAIMS.md@1733bfd:304` |
| M3 | **PARTIAL** | E-245’s 317 was removed, but the same fix leaves the handover’s 318 stale against 319. `CLAIMS.md@1733bfd:305`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:73`; `docs/CLAIMS-INDEX.md@1733bfd:14` |
| M4 | **FIXED** | Redundancy is checked per member, and empty arrays are rejected. `tools/build-claims-topics.ts@1733bfd:328-348` |
| M5 | **PARTIAL** | E-17 and the round-one “Phase 1” example work, but 40 characters is only a heuristic; a longer generic bold lead still discards the continuation. `tools/build-claims-topics.ts@1733bfd:171-193` |
| M6 | **FIXED** | Summaries escape pipes and all generated documents are targeted. `tools/build-claims-index.ts@1733bfd:119-132`; `tools/check-table-integrity.ts@1733bfd:87-100` |
| M7 | **PARTIAL** | E-244 labels 320 as uncommitted, but the handover still presents it as “now.” `CLAIMS.md@1733bfd:304`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:18-25` |
| M8 | **PARTIAL** | Unrecoverability is disclosed, but the assertions remain graded measured. `CLAIMS.md@1733bfd:305` |
| L1 | **FIXED** | Single-hyphen delimiters are accepted. `tools/check-table-integrity.ts@1733bfd:131-140,284-287` |
| L2 | **MISREPORTED** | The round-one GFM premise was wrong; unescaped code-span pipes are structural. The “fix” creates false passes. `tools/check-table-integrity.ts@1733bfd:118-121,323-327` |
| L3 | **FIXED** | Escaped backslash pairs are parked before escaped-pipe removal. `tools/check-table-integrity.ts@1733bfd:109-117` |
| L4 | **NOT FIXED** | 63% remains in E-245, tool documentation, and the handover; 156/245 rounds to 64%. `CLAIMS.md@1733bfd:305`; `tools/build-claims-topics.ts@1733bfd:21-24`; `docs/NEXT-SESSION-PROMPT.md@1733bfd:62` |
| L5 | **NOT FIXED** | Provenance remains embedded in Grade cells, e.g. `A, source (E-244, …)`. `CLAIMS.md@1733bfd:229-236` |
| L6 | **PARTIAL** | Headline-only indexing remains, but is now clearly disclosed where readers encounter it. `tools/build-claims-topics.ts@1733bfd:242-246`; `docs/claims/by-topic/protocol-and-crypto.md@1733bfd:12-16` |
| L7 | **PARTIAL** | The broad filter remains—140/319, 43.9%—but is disclosed. `docs/claims/by-topic/README.md@1733bfd:17,39-41` |
| L8 | **FIXED** | The handover now distinguishes ten preflight gates from thirteen Makefile targets. `docs/NEXT-SESSION-PROMPT.md@1733bfd:227-250`; `Makefile@1733bfd:1` |

## The seven claimed mis-splits

Counts below are natural structural fields before GFM truncates extra body cells to the table header width.

| Row | Old split | New split | GFM | Verdict |
|---|---:|---:|---:|---|
| E-48 | 8 | 4 | 8 | **Refuted.** Old index grade was wrong, but the new boundary model is also wrong; canonical rendering remains truncated. `CLAIMS.md@1733bfd:99` |
| E-162 | 11 | 4 | 11 | **Refuted.** GFM renders its fourth cell as `Finding`, not the intended grade. `CLAIMS.md@1733bfd:222` |
| E-204 | 6 | 4 | 4 | **Confirmed fixed.** Its `\|` pipes are escaped content. `CLAIMS.md@1733bfd:264` |
| E-214 | 6 | 4 | 6 | **Refuted.** Its unescaped code-span pipes are structural. `CLAIMS.md@1733bfd:274` |
| E-222 | 6 | 4 | 6 | **Refuted.** Its unescaped code-span pipe is structural. `CLAIMS.md@1733bfd:282` |
| E-229 | 5 | 4 | 4 | **Confirmed fixed.** Its `\|` is escaped content. `CLAIMS.md@1733bfd:289` |
| B-21 | 5 | 3 | 3 | **Confirmed fixed.** Its escaped grep alternation belongs in the third cell. `CLAIMS.md@1733bfd:314` |

The old index really did print fragments for E-48 and B-21. `docs/CLAIMS-INDEX.md@cb72368:85,288`. But only E-204, E-229, and B-21 were genuine `.split("|")` disagreements with GFM.

Edge cases against Marked:

- Single, double, and triple backtick runs with unescaped pipes: **wrong**; `splitCells()` shields them, GFM splits them.
- Unterminated span: **right**; both treat its pipe structurally.
- Escaped opening backtick: **right** for the tested shape; no span opens.
- Escaped pipe and terminal backslash: **right**.
- Adjacent spans: **wrong**; GFM splits every unescaped pipe. Additionally, `indexOf(fence)` can match a shorter fence inside a longer run, so it is not a correct CommonMark code-span matcher even on its own premise. `tools/build-claims-index.ts@1733bfd:97-109`.

## Gate mutations

The frozen baselines are internally green: index byte-match at 319 rows, 13 topic files byte-match with all 319 parsed rows classified, and the table checker reports zero problems across 16 targets. `docs/CLAIMS-INDEX.md@1733bfd:14`; `docs/claims/by-topic/README.md@1733bfd:11`; `tools/check-table-integrity.ts@1733bfd:526-560`.

Mutation results:

| Mutation | Post-fix result |
|---|---|
| Row after prose / after `---` | Caught |
| Plain header-width mismatch | Caught |
| Exact no-space `\|E-9999\|` row | Caught |
| Partial E-111 redundancy / empty override | Caught |
| Short first bold span, “Phase 1” | Correctly classified |
| Single-hyphen delimiter | Correctly accepted |
| Even backslashes before delimiter | Correctly handled |
| Four-space indented rows | **Missed** |
| Three-space indented claim row | **Missed by both generators** |
| Row without outer pipes | **Missed by all three gates** |
| Header-width mismatch caused by a code-span pipe | **Missed** |
| Extra body cell caused by a code-span pipe | **Missed** |
| “Field observation on reviewer rotation” | Still assigned both protocol and review; this remains the disclosed lexical false-positive tradeoff |

The sound fixes are H2’s exact no-space case, M1, M2, M4, M6, L1, L3, and L8; M5 fixes E-17 specifically. But because the fix introduced malformed E-246, left five canonical rows inconsistent with GFM, and registered incorrect fresh measurements, the round has not moved cleanly from construction to instruments. It is not converged.
