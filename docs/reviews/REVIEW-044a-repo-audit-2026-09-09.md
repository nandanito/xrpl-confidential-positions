## Findings

### HIGH — The rewritten masker still disagrees with GFM and permits a governed-row bypass

This falsifies the new description that the scanner “implements CommonMark’s rule” in [check-emphasis.ts]($REPO/tools/check-emphasis.ts:75) and [E-258]($REPO/CLAIMS.md:318).

Concrete governed row:

````markdown
| E-999 | ` ⚠⚠ **first visible correction**. ⚠⚠ **second visible correction**. | ` evidence | A |
````

Observed with the real detector:

```text
sourceLength: 97
visibleBoldChars: 49
readerBoldRatio: 50.5%

judgeRow:
  doubles: 0
  warns: 0
  boldRatio: 0
  problems: []
```

Observed with `cmark-gfm -e table`:

```html
<td>` ⚠⚠ <strong>first visible correction</strong>.
⚠⚠ <strong>second visible correction</strong>.</td>
<td>` evidence</td>
```

GFM parses table cells before inline code spans, so a code span cannot cross the structural `|`. `maskCodeSpans()` scans the entire source line and pairs the backticks across that boundary, masking four visible warnings and 49 visibly bold characters. This row violates rules 1, 3, and 5 yet passes.

A second, same-cell differential exists:

````markdown
<https://example.test/`⚠⚠`/`⚠⚠`>
````

`cmark-gfm` renders all four warnings visibly as autolink text; `judgeRow()` reports `warns=0`.

This behavior predates the fix, so the round-two defect is category (b): the newly written claim of CommonMark/GFM implementation is overstated. The four new controls at [check-emphasis.ts:380]($REPO/tools/check-emphasis.ts:380) cover only plain-inline examples.

Differential-search result: 167,481 exhaustive ordinary-inline strings—one warning inserted at every position among up to seven characters from `{a, space, backslash, backtick}`—produced zero mismatches. I found no case in that corpus where a real code-span warning was counted. The defect appears when GFM parsing context constrains where code spans can exist.

### MEDIUM — The `1)` fix introduced a new Rule 6 false pass

The replacement regex at [check-emphasis.ts:241]($REPO/tools/check-emphasis.ts:241) accepts unlimited digits:

```ts
/^\s*([-*+]|\d+[.)])\s/
```

GFM ordered-list markers allow at most nine digits.

Concrete input:

```text
1234567890) aaaaaaaaa...   # 900 “a” characters
```

Observed:

```text
source length:             912
parent treats as list:     false
fixed version treats list: true
paragraphs(input):         []
cmark-gfm output begins:   <p>1234567890) aaaaa...
```

Thus the parent correctly measured this as a 912-character narrative paragraph, while the fix discards it as a list. This is category (a), introduced specifically for the newly accepted `)` branch.

The new control tests valid `1)`/`2)` markers only; it does not test the nine-digit boundary.

### MEDIUM — A crash can still be classified as a rule verdict

The fix says, “A crash cannot [print the verdict line]” at [break-emphasis-gate.sh:77]($REPO/tools/break-emphasis-gate.sh:77). The classifier actually greps anywhere in the log and takes the last match; it does not require the verdict to be the final output or prove normal completion.

I ran an uncaught-throw process that first emitted the magic line through the classifier’s exact matching logic:

```js
console.log("check-emphasis: verdict=FAIL exit=1");
throw new Error("boom");
```

Observed:

```text
rc=1
said=check-emphasis: verdict=FAIL exit=1
classified=FAIL
```

The process crashed, but [the classifier]($REPO/tools/break-emphasis-gate.sh:92) accepted it as the expected tree failure. This is both a defect in the new protocol and a direct falsifier for its description.

The three new crash probes cover a syntax error, a throw before any verdict, and a suppressed verdict. None covers a crash after a matching verdict.

### LOW — “795 marks” is really 795 contiguous warning runs

Recomputing the parent tree used for the measurement produced:

```text
raw ⚠ characters:                 961
⚠ characters after code masking: 957
contiguous ⚠/⚠⚠ runs:            795
```

The predecessor buckets reproduce exactly over those 795 runs:

```text
period 597; cell 118; em dash 28; enumerator 22;
retraction 12; semicolon 4; colon 1; other 13.
```

Therefore 597, four semicolons, and one colon are correct. But [the report’s “795 marks”]($REPO/docs/reviews/REVIEW-043-codex-emphasis-gate-2026-09-09.md:29) is an unstated change of unit: it counts each `⚠⚠` run once, whereas the gate counts it as two warnings and elsewhere calls individual `⚠` characters “marks.” The accurate wording would be “795 warning runs.”

## Checks that were correct

- `34 controls`: correct; all 34 passed.
- `18 probes`: correct. The parent had exactly 15; the fix adds three crash probes.
- Pinned fixture: exactly one matching paragraph exists at `124e959`, and its Python character length is exactly 4,811.
- `1)` itself renders as `<ol><li>`; `"1) " + 900 characters` was indeed measured as 903 characters by the old splitter.
- Bun returned exit 1 for each independently tested syntax error, missing import, and uncaught throw.
- All current literal mutation needles checked occur exactly once.
- The dirty-tree scope and restore paths cover exactly the three files the harness mutates. No restore/refusal defect was found by source inspection.
- “Nine shapes” is not independently reproducible: the repository records seven masker controls, only four newly annotated as checked against `cmark-gfm`, and none invokes `cmark-gfm`. The narrow historical assertion may be true for an unrecorded set, but the broader claim of GFM agreement is falsified above.
- The positive grandfathered-row probe still has a latent no-op path: Python `str.replace(..., 1)` exits successfully when its needle has zero matches, and the unchanged baseline returns `PASS`. Its current `E-100` needle exists exactly once, so it is not presently stale.

No tracked files were modified.
