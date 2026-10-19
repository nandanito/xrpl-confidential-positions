## Findings

### HIGH — CONSTRUCTION — `paragraphs()` false-passes real over-length GFM paragraphs

The line heuristics at [check-emphasis.ts:307]($REPO/tools/check-emphasis.ts:307) recognize prefixes without validating their GFM block context, and the list/fence state can swallow later paragraphs.

Executed each input through `paragraphs()` and `cmark-gfm --extension table`:

| Input | `paragraphs()` | cmark-gfm |
|---|---:|---|
| `"| " + "x".repeat(900)` | `[]` | `<p>` of 902 characters |
| `"#" + "x".repeat(900)` | `[]` | `<p>` of 901 characters; `#text` is not an ATX heading |
| `"    ```\n" + "x".repeat(900)` | `[]` | indented code followed by a 900-character `<p>` |
| `"a".repeat(450) + "\n2. " + "b".repeat(450)` | one paragraph of 450 | one `<p>` of about 904 characters; `2.` cannot interrupt that paragraph |
| ``"```\ncode\n~~~\n```\n" + wall`` | `[]` | backtick fence closes at the second ```; then a 900-character `<p>` |
| `"- item\n# Heading\n" + wall` | `[]` | list, heading, then a 900-character `<p>` |

The causes are visible at:

- Fence toggling on any matching line, regardless of indent, fence kind, or closing grammar: [check-emphasis.ts:323]($REPO/tools/check-emphasis.ts:323).
- Ordered markers accepted without the “may interrupt a paragraph only when starting at 1” rule: [check-emphasis.ts:339]($REPO/tools/check-emphasis.ts:339).
- The lazy-continuation branch runs before headings, blockquotes, tables and thematic breaks, so those interrupters never clear `inList`: [check-emphasis.ts:343]($REPO/tools/check-emphasis.ts:343).
- Any leading pipe and any leading `#` are treated as structural: [check-emphasis.ts:344]($REPO/tools/check-emphasis.ts:344).

This is the round’s decisive construction finding.

The opposite direction is also wrong: `"   # " + wall` is a valid three-space-indented heading but is measured as a 902-character paragraph; `"> lead\n" + wall` is a blockquote lazy continuation but the second line is measured as a standalone 900-character paragraph.

### MEDIUM — CONSTRUCTION — invisible link metadata counts as visible warning signs

Concrete row:

```markdown
| E-999 | [plain](https://example.test/x "⚠⚠⚠⚠") | ev |
```

Observed:

```text
judgeRow:
  doubles: 2
  warns: 4
  problems: rules 1, 3 and 4
```

cmark renders:

```html
<a href="https://example.test/x" title="⚠⚠⚠⚠">plain</a>
```

The visible row text contains zero warning signs. `judgeRow()` therefore false-fails a row because it counts warning characters in Markdown link metadata.

### MEDIUM — INSTRUMENT/EVIDENCE — `cmarkDifferential()` certifies that wrong result

For the same link-title row, the oracle at [check-emphasis.ts:458]($REPO/tools/check-emphasis.ts:458) removes `<code>` but then counts `⚠` in raw HTML, including tag attributes:

```text
judgeRow = 4
current oracle = 4
visible text = 0
```

Thus the differential agrees with the detector while both disagree with the reader—the exact requested oracle failure.

### HIGH — INSTRUMENT/EVIDENCE — the harness self-test requires only one broken probe to be rejected

At [break-emphasis-gate.sh:154]($REPO/tools/break-emphasis-gate.sh:154), all three broken probes collapse into the boolean `FAILED`. The final predicate checks only:

```bash
broken=1 && positive_probe_failed=0
```

The first stale-needle probe necessarily sets `FAILED=1`. Consequently, the wrong-needle and crash-after-verdict probes no longer affect the final result.

I executed the exact aggregate logic with both later broken probes accepted:

```text
✗ stale
✓ WRONG-NEEDLE (incorrectly accepted)
✓ CRASH-AFTER-VERDICT (incorrectly accepted)
✓ correct
PASS: the harness rejected all three broken probes
```

So yes: broken probes can be accepted, and two of the three negative checks are vacuous with respect to the self-test’s exit status. The positive control prevents “reject everything,” but does not establish that all three broken probes were rejected.

The managed read-only sandbox refused `mktemp -d`, so the mutation script itself could not be run end-to-end; `bash -n` passed, and the actual final predicate was executed independently as above.

### LOW — INSTRUMENT/EVIDENCE — round-two descriptions still contain incorrect restatements

- [REVIEW-044d:34]($REPO/docs/reviews/REVIEW-044d-adjudication-2026-09-09.md:34) and [E-259]($REPO/CLAIMS.md:319) say the cross-cell row showed “four `⚠⚠`.” cmark shows **four warning characters forming two `⚠⚠` runs**, plus 49 bold characters.
- [REVIEW-044d:41]($REPO/docs/reviews/REVIEW-044d-adjudication-2026-09-09.md:41) says “Four false FAILS” and immediately lists **five**: `1)`, `(A)`, bolded strikethrough, indented code, and lazy continuation. E-259 repeats “four”; its derived “nine detector holes” therefore lacks a consistent counting unit.
- REVIEW-044d says exactly one historical register cell had unmatched backticks. Exhaustively splitting all 365 pipe rows at frozen `25d3dc3` found **zero** unclosed per-cell spans; comparing the old whole-line masker with the per-cell masker changed **zero rows**.
- [E-258]($REPO/CLAIMS.md:318) does not recap REVIEW-043’s five upheld findings: it omits the moving-`main` fixture defect and counts the two examples within the single masker finding as two defects.

## Corpus differential

I ran every content row independently through cmark and `judgeRow`:

```text
347 content rows
  12 governed ID rows
  321 grandfathered ID rows
  10 Revision-history rows
  4 navigation-table rows

visible warnings:
  cmark-gfm: 970
  judgeRow:  970
  mismatches: 0

bold present/absent mismatches: 0
```

Thus the actual `CLAIMS.md` corpus is clean despite the synthetic construction holes.

I did not invent an exact bold-ratio comparison. The detector’s denominator is masked raw Markdown, including pipes, marker syntax, HTML tags and backticks; cmark exposes rendered text nodes with those removed and entities decoded. Even the numerator differs on 214 of 333 ID rows—for example, code-span backticks inside `**…**` remain counted by `boldChars`. Only bold presence/absence is fairly comparable, and that matched everywhere.

## Checks that held

- Basic fenced blocks, bullet/numbered lists, ordinary lazy list continuations, indented code, real leading-pipe tables, unindented ATX headings, blockquotes and contiguous thematic breaks are excluded as claimed.
- The disclosed non-models behave as disclosed: pipe-less table measured at 918 characters, HTML comment block at 909, setext heading at 904.
- Historical counts at `b97966c` reproduce exactly: 795 visible warning runs, 957 warning characters; buckets `597/118/28/22/12/4/1/13`.
- The next commit has 797 runs.
- Historical counts of 34 controls, 15 original probes and 18 post-fix probes are correct.
- Current differential has 13 shapes and the full gate executes 59 controls.
- The cross-cell example has 49 rendered bold characters.
- The two rejected round-two claims remain correctly rejected: `\\|` renders as one cell, and the non-E maxima remain P-12/B-26/F-29/R-6 below their cutoffs.
- `167,481` is the correct size of the stated exhaustive inline corpus.

**Conclusion:** round three does not converge. The corpus itself agrees with cmark, but `paragraphs()` still has multiple direct false-pass constructions; the oracle and self-test also have independent instrument defects.
