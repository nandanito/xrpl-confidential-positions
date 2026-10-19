# REVIEW-042b — auditing round two's fixes (Codex, read-only repo)

- **Rotation:** `REVIEW-042` — ROUND THREE, reviewing `REVIEW-041`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `dc0e415`
- **Access:** READ-ONLY repository at the frozen commit `dc0e415`, with `cmark-gfm` and `pandoc` available.
- **Packet:** `docs/reviews/REVIEW-042-packets/packet-b-fixes-repo.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-042d`.**

---


codex
## Verdict

Round two fixed the five live rendering defects: all 19 escapes render correctly, every current claim row has the intended four cells, and the derived topic distribution is reproducible.

However, the GFM implementation is not complete. Consecutive backslashes expose a real parser disagreement that can silently move a purported Grade into Evidence. The adjudication therefore overstates the GFM fix as complete.

### Findings

1. **HIGH — escaped-backslash handling disagrees with both real renderers**

The gate explicitly assumes that an escaped backslash does not protect the following pipe, and its self-test enforces that assumption. The index splitter makes the same assumption. `tools/check-table-integrity.ts@dc0e415:132`, `tools/check-table-integrity.ts@dc0e415:360`, `tools/build-claims-index.ts@dc0e415:82`, `tools/build-claims-index.ts@dc0e415:229`

For this four-column table:

```markdown
| # | Claim | Evidence | Grade |
|---|---|---|---|
| X-1 | ends with \\| next | A |
```

The gate counts four source cells and passes. `cmark-gfm` and Pandoc instead treat the pipe as escaped and render:

- Claim: `ends with | next`
- Evidence: `A`
- Grade: empty

The generator then interprets `A` as the Grade. A fuller row using the same shape makes the raw disagreement explicit: the gate infers five cells while cmark parses four.

This is latent—the frozen register contains no such row—but it can recreate exactly the wrong-Grade failure round two intended to eliminate.

**Falsified by:** either renderer treating that pipe as a delimiter, or the frozen gate rejecting the short row.

2. **MEDIUM — two row-boundary shapes remain inconsistent**

A leading-pipe row without a trailing pipe, such as:

```markdown
| X-1 | claim | A
```

is a valid GFM row. Cmark pads its missing Grade, but the gate ignores it because `isRow()` requires a final pipe. Both generators accept it and interpret the last present cell as Grade. `tools/check-table-integrity.ts@dc0e415:151`, `tools/build-claims-index.ts@dc0e415:51`, `tools/build-claims-index.ts@dc0e415:104`, `tools/build-claims-index.ts@dc0e415:143`

Conversely, the gate accepts four-or-more leading spaces through `^\s*\|`, while both generators correctly cap indentation at three spaces. Cmark renders a four-space row as indented code, not a table row. `tools/check-table-integrity.ts@dc0e415:155`, `tools/build-claims-index.ts@dc0e415:51`, `tools/build-claims-topics.ts@dc0e415:66`

The named H2 fix—zero through three spaces—is sound, but the components still do not recognize the same language.

**Falsified by:** the gate flagging the no-trailing-pipe case and rejecting the four-space case consistently with cmark.

3. **MEDIUM — the GFM rationale was not completely retracted**

The gate’s main header was corrected, but live text still says code spans protect pipes and describes backtick-run parsing that no longer exists. `CLAIMS.md@dc0e415:306`

That directly contradicts the next row’s corrected account. `CLAIMS.md@dc0e415:307`

There are also stale implementation comments saying code spans are stripped or protect pipes. `tools/check-table-integrity.ts@dc0e415:110`, `tools/check-table-integrity.ts@dc0e415:138`, `tools/build-claims-topics.ts@dc0e415:219`

Thus `REVIEW-041d`’s statement that `stripCode` and `splitCells` now implement GFM semantics is too broad. `docs/reviews/REVIEW-041d-adjudication-2026-09-06.md@dc0e415:51`

**Falsified by:** striking or correcting E-246 and the stale comments, plus making the consecutive-backslash probes agree with cmark.

4. **LOW — another handover count drifted during the count cleanup**

The handover no longer hard-codes the index total, but still says the largest topic contains 139 rows. `docs/NEXT-SESSION-PROMPT.md@dc0e415:73`

The committed generated outputs say 140. `docs/claims/by-topic/README.md@dc0e415:17`, `docs/claims/by-topic/protocol-and-crypto.md@dc0e415:18`

**Falsified by:** an independent generated count of 139, or replacing the handover figure with a derived pointer.

5. **LOW — the distribution’s concluding gloss uses the wrong side of the split**

The computed singleton bucket is 151/320, or 47.2%. The following sentence calls that the share a split “would have to file under a single home.” `tools/build-claims-topics.ts@dc0e415:413`, `tools/build-claims-topics.ts@dc0e415:417`

All rows receive a home; the meaningful forced-choice population is the 169 multi-topic rows, 52.8%.

**Falsified by:** wording that explicitly defines “that share” as something other than the immediately preceding singleton share.

## What is sound

- The escape counts are exactly **4 + 7 + 2 + 2 + 4 = 19** across E-48, E-162, E-214, E-222 and E-246. `CLAIMS.md@dc0e415:99`, `CLAIMS.md@dc0e415:222`, `CLAIMS.md@dc0e415:274`, `CLAIMS.md@dc0e415:282`, `CLAIMS.md@dc0e415:306`
- Cmark renders every escaped pipe visibly as `|`; all five rows retain their intended Grades.
- A full cmark scan found **9 tables and 320 unique claim IDs**, with no missing or extra IDs. An independent per-row boundary comparison found **0 mismatches** among the 320 live rows. No other live claim row has an unescaped pipe consumed incorrectly.
- Raw pipes inside code spans, HTML, autolinks, reference links and nested emphasis are structural in cmark and Pandoc, matching the new central rule. Single `\|`, including at end of line and inside code, is content. Alignment colons and valid empty cells also agree.
- The baseline gates all pass: **16 files, 1,282 pipe rows, 36 headers, 1,246 checked body rows, 0 ungoverned rows; 320 index rows; 320 topic rows across 12 topics.**
- Replayed mutations still work: missing reheader → 99 stray rows; orphan F-29 → 1 stray row; blank E-176 Grade → 3 cells versus 4; header-width mutation → 2 versus 4; unescaping E-162 → 11 versus 4.
- The corrected historical counts independently reproduce as **359** for the original two-target tree, **1,231** for the expanded parent, and **1,241** for the fixed tree.
- The current topic distribution independently reproduces as:

| Topics per row | Rows |
|---:|---:|
| 1 | 151 |
| 2 | 113 |
| 3 | 48 |
| 4+ | 8 |

That is 320 assigned rows and 553 memberships. The committed topic files independently produce the same distribution. The generator genuinely applies rules plus overrides to every parsed section before counting. `tools/build-claims-topics.ts@dc0e415:200`, `tools/build-claims-topics.ts@dc0e415:210`, `tools/build-claims-topics.ts@dc0e415:396`

The historical singleton figures **113, 119 and 121** also reproduce under their respective rules-only/final-assignment, cohort and commit predicates.

## `REVIEW-041d` fix grades

| Adjudicated item | Grade |
|---|---|
| 19 live escapes | **FIXED** |
| `stripCode` / `splitCells` implement GFM | **PARTIAL** — consecutive backslashes are wrong |
| Inverted code-span test | **PARTIAL** — correct direction, incomplete discriminator |
| Printed distribution and named predicate | **FIXED** |
| Removal of four stale quoted distributions | **FIXED** |
| H1 header-width handling | **PARTIAL** — failure is correct; governance summary remains contradictory |
| H2 zero-to-three-space generator regexes | **FIXED** for the stated case |
| `357 → 1231` count splice | **FIXED** |
| “nine controls” | **FIXED** |
| Handover’s 318-row count | **PARTIAL** — removed, but adjacent 139-row figure is stale |
| `MIN_HEADLINE = 40` heuristic | **NOT FIXED**, explicitly disclosed; no live instance |

The live table construction has converged: I found no current rendered-row defect. The stricter stopping condition has **not** been met, because the remaining findings are not all confined to instruments—E-246 and the handover still contain live false or stale prose.
hook: Stop
hook: Stop Completed
tokens used
304,339
## Verdict

Round two fixed the five live rendering defects: all 19 escapes render correctly, every current claim row has the intended four cells, and the derived topic distribution is reproducible.

However, the GFM implementation is not complete. Consecutive backslashes expose a real parser disagreement that can silently move a purported Grade into Evidence. The adjudication therefore overstates the GFM fix as complete.

### Findings

1. **HIGH — escaped-backslash handling disagrees with both real renderers**

The gate explicitly assumes that an escaped backslash does not protect the following pipe, and its self-test enforces that assumption. The index splitter makes the same assumption. `tools/check-table-integrity.ts@dc0e415:132`, `tools/check-table-integrity.ts@dc0e415:360`, `tools/build-claims-index.ts@dc0e415:82`, `tools/build-claims-index.ts@dc0e415:229`

For this four-column table:

```markdown
| # | Claim | Evidence | Grade |
|---|---|---|---|
| X-1 | ends with \\| next | A |
```

The gate counts four source cells and passes. `cmark-gfm` and Pandoc instead treat the pipe as escaped and render:

- Claim: `ends with | next`
- Evidence: `A`
- Grade: empty

The generator then interprets `A` as the Grade. A fuller row using the same shape makes the raw disagreement explicit: the gate infers five cells while cmark parses four.

This is latent—the frozen register contains no such row—but it can recreate exactly the wrong-Grade failure round two intended to eliminate.

**Falsified by:** either renderer treating that pipe as a delimiter, or the frozen gate rejecting the short row.

2. **MEDIUM — two row-boundary shapes remain inconsistent**

A leading-pipe row without a trailing pipe, such as:

```markdown
| X-1 | claim | A
```

is a valid GFM row. Cmark pads its missing Grade, but the gate ignores it because `isRow()` requires a final pipe. Both generators accept it and interpret the last present cell as Grade. `tools/check-table-integrity.ts@dc0e415:151`, `tools/build-claims-index.ts@dc0e415:51`, `tools/build-claims-index.ts@dc0e415:104`, `tools/build-claims-index.ts@dc0e415:143`

Conversely, the gate accepts four-or-more leading spaces through `^\s*\|`, while both generators correctly cap indentation at three spaces. Cmark renders a four-space row as indented code, not a table row. `tools/check-table-integrity.ts@dc0e415:155`, `tools/build-claims-index.ts@dc0e415:51`, `tools/build-claims-topics.ts@dc0e415:66`

The named H2 fix—zero through three spaces—is sound, but the components still do not recognize the same language.

**Falsified by:** the gate flagging the no-trailing-pipe case and rejecting the four-space case consistently with cmark.

3. **MEDIUM — the GFM rationale was not completely retracted**

The gate’s main header was corrected, but live text still says code spans protect pipes and describes backtick-run parsing that no longer exists. `CLAIMS.md@dc0e415:306`

That directly contradicts the next row’s corrected account. `CLAIMS.md@dc0e415:307`

There are also stale implementation comments saying code spans are stripped or protect pipes. `tools/check-table-integrity.ts@dc0e415:110`, `tools/check-table-integrity.ts@dc0e415:138`, `tools/build-claims-topics.ts@dc0e415:219`

Thus `REVIEW-041d`’s statement that `stripCode` and `splitCells` now implement GFM semantics is too broad. `docs/reviews/REVIEW-041d-adjudication-2026-09-06.md@dc0e415:51`

**Falsified by:** striking or correcting E-246 and the stale comments, plus making the consecutive-backslash probes agree with cmark.

4. **LOW — another handover count drifted during the count cleanup**

The handover no longer hard-codes the index total, but still says the largest topic contains 139 rows. `docs/NEXT-SESSION-PROMPT.md@dc0e415:73`

The committed generated outputs say 140. `docs/claims/by-topic/README.md@dc0e415:17`, `docs/claims/by-topic/protocol-and-crypto.md@dc0e415:18`

**Falsified by:** an independent generated count of 139, or replacing the handover figure with a derived pointer.

5. **LOW — the distribution’s concluding gloss uses the wrong side of the split**

The computed singleton bucket is 151/320, or 47.2%. The following sentence calls that the share a split “would have to file under a single home.” `tools/build-claims-topics.ts@dc0e415:413`, `tools/build-claims-topics.ts@dc0e415:417`

All rows receive a home; the meaningful forced-choice population is the 169 multi-topic rows, 52.8%.

**Falsified by:** wording that explicitly defines “that share” as something other than the immediately preceding singleton share.

## What is sound

- The escape counts are exactly **4 + 7 + 2 + 2 + 4 = 19** across E-48, E-162, E-214, E-222 and E-246. `CLAIMS.md@dc0e415:99`, `CLAIMS.md@dc0e415:222`, `CLAIMS.md@dc0e415:274`, `CLAIMS.md@dc0e415:282`, `CLAIMS.md@dc0e415:306`
- Cmark renders every escaped pipe visibly as `|`; all five rows retain their intended Grades.
- A full cmark scan found **9 tables and 320 unique claim IDs**, with no missing or extra IDs. An independent per-row boundary comparison found **0 mismatches** among the 320 live rows. No other live claim row has an unescaped pipe consumed incorrectly.
- Raw pipes inside code spans, HTML, autolinks, reference links and nested emphasis are structural in cmark and Pandoc, matching the new central rule. Single `\|`, including at end of line and inside code, is content. Alignment colons and valid empty cells also agree.
- The baseline gates all pass: **16 files, 1,282 pipe rows, 36 headers, 1,246 checked body rows, 0 ungoverned rows; 320 index rows; 320 topic rows across 12 topics.**
- Replayed mutations still work: missing reheader → 99 stray rows; orphan F-29 → 1 stray row; blank E-176 Grade → 3 cells versus 4; header-width mutation → 2 versus 4; unescaping E-162 → 11 versus 4.
- The corrected historical counts independently reproduce as **359** for the original two-target tree, **1,231** for the expanded parent, and **1,241** for the fixed tree.
- The current topic distribution independently reproduces as:

| Topics per row | Rows |
|---:|---:|
| 1 | 151 |
| 2 | 113 |
| 3 | 48 |
| 4+ | 8 |

That is 320 assigned rows and 553 memberships. The committed topic files independently produce the same distribution. The generator genuinely applies rules plus overrides to every parsed section before counting. `tools/build-claims-topics.ts@dc0e415:200`, `tools/build-claims-topics.ts@dc0e415:210`, `tools/build-claims-topics.ts@dc0e415:396`

The historical singleton figures **113, 119 and 121** also reproduce under their respective rules-only/final-assignment, cohort and commit predicates.

## `REVIEW-041d` fix grades

| Adjudicated item | Grade |
|---|---|
| 19 live escapes | **FIXED** |
| `stripCode` / `splitCells` implement GFM | **PARTIAL** — consecutive backslashes are wrong |
| Inverted code-span test | **PARTIAL** — correct direction, incomplete discriminator |
| Printed distribution and named predicate | **FIXED** |
| Removal of four stale quoted distributions | **FIXED** |
| H1 header-width handling | **PARTIAL** — failure is correct; governance summary remains contradictory |
| H2 zero-to-three-space generator regexes | **FIXED** for the stated case |
| `357 → 1231` count splice | **FIXED** |
| “nine controls” | **FIXED** |
| Handover’s 318-row count | **PARTIAL** — removed, but adjacent 139-row figure is stale |
| `MIN_HEADLINE = 40` heuristic | **NOT FIXED**, explicitly disclosed; no live instance |

The live table construction has converged: I found no current rendered-row defect. The stricter stopping condition has **not** been met, because the remaining findings are not all confined to instruments—E-246 and the handover still contain live false or stale prose.
