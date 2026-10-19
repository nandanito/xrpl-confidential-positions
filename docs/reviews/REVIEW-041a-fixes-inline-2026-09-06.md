# REVIEW-041a — attacking the fixes (Gemini via agy)

- **Rotation:** `REVIEW-041` — ROUND TWO, reviewing `REVIEW-040`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `1733bfd`
- **Access:** NO REPOSITORY. All three tool sources pasted in full, post-fix.
- **Packet:** `docs/reviews/REVIEW-041-packets/packet-a-fixes-inline.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-041d`.**

---

# Adversarial Review of Round Two Fixes

---

### Question 1: Does each fix establish the claimed property or only defeat the specific probe?

#### H1. Header vs Delimiter Width Mismatch
* **Claim:** `strayRows` compares header width to delimiter width, reports a `width` problem, and ensures files with broken tables do not pass.
* **Finding — Defeated only on the exact probe; leaves downstream rows unflagged:**
  When `hw !== sw`, `strayRows` records a `width` problem, but then immediately executes `inTable = true; i++; continue;` ([File 1, lines 434–442](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/check-table-integrity.ts#L434-L442)). Because `inTable` is set to `true`, **none of the body rows below the broken header are flagged as stray/continuity defects**. Furthermore, `scan()` compares rows against `want = cells(delimiter)` rather than header width.
* **Concrete Input:**
  ```markdown
  | # | Col A | Col B | Col C |
  |---|---|
  | E-1 | val A | val B |
  ```
* **What the code does:**
  1. `strayRows()` flags line 1 as a `width` problem (got 4, want 2), but sets `inTable = true`.
  2. `strayRows()` evaluates `| E-1 | val A | val B |` with `inTable === true`, reporting **0 continuity errors**.
  3. `scan()` sets `want = cells(delimiter) = 2`. For row `E-1`, `cells = 2`. `scan()` reports **0 cell errors**.
  4. `cellChecked()` records 1 cell-checked body row and prints: `"Every body row is governed by a header."`
* **What it should do:** Because GFM renders **no table at all** when `hw !== sw`, the detector must mark `inTable = false`, treat all subsequent rows as ungoverned stray rows, and `scan()` must not certify those rows.

---

#### H2. Leading Pipe Regex
* **Claim:** Both generators accept `/^\|\s*/` so rows formatted without spaces after the leading pipe are parsed.
* **Finding — Sound for `|ID|`, but fails on standard GFM tables omitting boundary pipes:**
  `ROW = /^\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/` ([File 2, line 43](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-index.ts#L43)).
* **Concrete Input:**
  ```markdown
  E-9999 | Claim text | Evidence text | Grade |
  ```
* **What the code does:** `ROW.test(...)` returns `false` because the leading pipe is mandatory in the regex. The row is silently ignored by both generators.
* **What it should do:** If the generator claims compliance with GFM table syntax (where outer pipes are optional), it should accept rows without leading pipes, or the specification of the gate should explicitly state that outer pipes are required by convention.

---

#### M4. Override Redundancy Check
* **Claim:** Now per-member using `ts.filter((t) => rules.has(t))`.
* **Verdict — SOUND:**
  [File 3, lines 231–238](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-topics.ts#L231-L238) computes `const dead = ts.filter((t) => rules.has(t))` and rejects any entry where `dead.length > 0`. Every member in `OVERRIDES[id]` is evaluated individually against `byRules(e.headline)`.

---

#### M5. `headline()` 40-Character Threshold
* **Claim:** Bold lead shorter than 40 characters is ignored in favor of surrounding text.
* **Finding — Defective (Magic number breaks concise headlines and leaks body prose):**
  Detailed under [Question 3](#question-3-headline-40-character-threshold).

---

#### M6. `summarise()` Pipe Escaping
* **Claim:** Pipes are escaped as `\|`.
* **Finding — Defective (Converts existing content escapes `\|` into table delimiters `\\|`):**
  Detailed under [Question 5](#question-5-summarise-pipe-escaping).

---

#### L1. Single-Hyphen Separator
* **Claim:** `/^\s*\|(\s*:?-+:?\s*\|)+\s*$/` accepts single-hyphen delimiters.
* **Verdict — SOUND for delimited tables:** Correctly recognizes `| - | - |` and `| :-: | - |`.

---

#### L2. Multi-Backtick Spans in `stripCode`
* **Claim:** `/(`+)[\s\S]*?\1/g` correctly handles backtick runs of any length.
* **Finding — Defective (Mismatched run lengths):**
  `stripCode` uses `/(`+)[\s\S]*?\1/g` ([File 1, line 114](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/check-table-integrity.ts#L114)). Non-greedy matching pair matching matches the *first* backtick of a longer run instead of a run of identical length.
* **Concrete Input:**
  ```markdown
  | X-1 | `foo```bar | baz` | ev | A |
  ```
* **What the code does:**
  1. In GFM, opening delimiter is `` ` `` (length 1). ``` ``` ``` is length 3, so it does not close the span. The code span continues through `bar | baz` to the final `` ` ``. The row has 4 cells.
  2. `stripCode` matches `` `foo` `` against the first character of ``` ``` ```, replacing it with `` ` ``.
  3. The remaining string ` ``bar | baz` ` has unstripped `|`.
  4. `cells()` returns 5 cells instead of 4, causing `check-table-integrity.ts` to falsely fail a valid table.
* **What it should do:** Backtick strings must only be closed by backtick strings of the exact same length, as defined by CommonMark §6.2.

---

#### L3. Escaped Backslash in `stripCode`
* **Claim:** `\\|` does not eat the following delimiter.
* **Verdict — SOUND:**
  [File 1, lines 105–108](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/check-table-integrity.ts#L105-L108) safely parks `\\\\` as `\u0000`, strips `\\|`, and restores `\u0000` to `\\`. `\\|` retains its structural pipe delimiter while `\|` and `\\\|` have content pipes stripped.

---

### Question 2: Breaking `splitCells`

`splitCells` ([File 2, lines 74–102](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-index.ts#L74-L102)) contains several structural divergences from GFM parsing:

#### Defect 2.1: Multi-Backtick Run Delimiter Mismatch
* **Mechanism:** `line.indexOf(fence, i + n)` matches any substring containing `fence`, even if it is part of a longer backtick run.
* **Concrete Input:**
  ```markdown
  | E-1 | `foo```bar | baz` | ev | A |
  ```
* **Trace:**
  1. `i = 8` sees `` ` `` (`fence = "\`"`).
  2. `line.indexOf("\`", 9)` returns 12 (the first backtick of ``` ``` ```).
  3. `cur` appends `` `foo` ``.
  4. The remaining string ` ``bar | baz` ` is processed as raw text; `splitCells` splits on `|` inside `bar | baz`.
* **Result:** Returns 7 cells instead of 6. Grade is read as `"ev"` instead of `"A"`.

#### Defect 2.2: Escaped Pipe at End of Line Corrupts Column Indexing
* **Mechanism:** When a row terminates in an escaped content pipe `\|` rather than a delimiter pipe `|`:
* **Concrete Input:**
  ```markdown
  | E-1 | claim | ev | A \|
  ```
* **Trace:**
  1. `splitCells` parses `\|` at the end as content characters, yielding `["", "E-1", "claim", "ev", "A \\|"]` (length 5).
  2. `parse()` in `build-claims-index.ts` and `build-claims-topics.ts` accesses:
     `const grade = (cells.length >= 5 ? cells[cells.length - 2] : "") ?? "";`
  3. `cells.length` is 5. `cells[5 - 2] = cells[3] = "ev"`.
* **Result:** Evidence prose (`"ev"`) is extracted and rendered as the Grade.

#### Defect 2.3: Unterminated Code Spans Crossing Cells
* **Mechanism:** CommonMark §6.2 specifies that unterminated backticks are treated as literal text. In `splitCells`, if an unclosed backtick in one cell happens to find a backtick in a later cell, `line.indexOf` merges all intermediate cells.
* **Concrete Input:**
  ```markdown
  | E-1 | `col1 | col2 | `col3` | A |
  ```
* **Trace:** `line.indexOf("`", ...)` matches the backtick in column 3, swallowing `| col2 |` into `cur`.
* **Result:** Produces 4 cells instead of 6, corrupting table parsing.

---

### Question 3: `headline()` 40-Character Threshold Failures

`MIN_HEADLINE = 40` ([File 3, line 180](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-topics.ts#L180)).

#### 1. Got RIGHT before, gets WRONG now (Concise valid headline corrupted by body prose):
* **Concrete Input:**
  ```markdown
  | E-301 | **Zeroization.** Evaluated during review round two for ADR-0002. | ev | A |
  ```
* **Before:** `headline()` extracted `"Zeroization"` (11 chars). Matched topic `secret-handling`.
* **Now:** `bold[1].length < 40`, so `headline()` executes `flat.replace(/\*\*/g, "").slice(0, 200)`. It returns:
  `"Zeroization. Evaluated during review round two for ADR-0002."`
* **Result:** Now matches `review-rounds` (`/review|round/`), `decisions-and-scope` (`/ADR-/`), and `secret-handling`. A row strictly about secret zeroization is erroneously filed under review process and architectural decisions.

#### 2. Got WRONG before, gets RIGHT now (Opening clause discarded in favor of subject):
* **Concrete Input:**
  ```markdown
  | E-17 | **When set**, `sfDomainID` on the `MPTokenIssuance` gates confidential transfers... | ev | A |
  ```
* **Before:** Extracted `"When set"`, matching no topics and requiring an override.
* **Now:** `"When set"` (< 40) is bypassed; the returned 200-char string contains `sfDomainID`, `MPTokenIssuance`, and `confidential`, correctly matching `protocol-and-crypto`.

#### 3. New Failure Mode: Tagged bold headlines:
* **Concrete Input:**
  ```markdown
  | E-302 | **FIX** **Bulletproof verification fails on zero balance scalar** | ev | A |
  ```
* **Trace:** Regex `flat.match(/^\*\*(.+?)\*\*/)` matches `**FIX**` (length 3 < 40). It discards the lead tag and strips all `**`, flattening both bold runs.

---

### Question 4: The `width` Check — Leakage and False Failures

#### Can a mismatch still slip through?
**Yes.**
1. **Omitted Trailing Pipe on Delimiter:**
   GFM allows delimiter rows without a trailing pipe:
   ```markdown
   | Col A | Col B |
   | --- | ---
   | 1 | 2 |
   ```
   `isSeparator` requires trailing `|` (`/^\s*\|(\s*:?-+:?\s*\|)+\s*$/`). Because line 2 fails `isSeparator`, `strayRows` does not recognize line 2 as a delimiter. It treats line 2 as prose that closes the table, failing to report a `width` error and instead reporting rows below as `continuity` stray errors.
2. **Indented Tables (4 Spaces / Code Blocks):**
   ```markdown
       | Col A | Col B | Col C |
       |---|---|
       | 1 | 2 |
   ```
   GFM treats 4-space indented blocks as code blocks (no table). `check-table-integrity.ts` strips leading whitespace via `/^\s*\|/`, accepts it as an active table, and runs cell verification.

---

### Question 5: `summarise()` Pipe Escaping & Formatting

`summarise()` in `build-claims-index.ts` ([File 2, lines 104–119](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-index.ts#L104-L119)):

#### 1. Corrupting Already-Escaped Pipes
* **Concrete Input:** A claim cell with an escaped pipe:
  `"Use \`grep\` with \| character"`
* **Trace:**
  1. `.replace(/`/g, "")` yields `"Use grep with \| character"`.
  2. `.replace(/\|/g, "\\|")` matches the pipe in `\|` and replaces it with `\|`, yielding:
     `"Use grep with \\| character"`.
  3. When rendered into `docs/CLAIMS-INDEX.md`:
     `| [E-1](../CLAIMS.md#L1) | Use grep with \\| character | A |`
  4. In GFM and in `check-table-integrity.ts`'s `stripCode`, `\\` is an escaped backslash, leaving `|` as an unescaped **structural pipe**.
* **Result:** The generated table row acquires an extra cell (4 columns instead of 3), causing `check-table-integrity.ts` to fail on the generated index.

#### 2. Truncation Splitting Escapes
* **Mechanism:** If `flat` is truncated at `max` (120 chars) and an escaped pipe `\|` sits across index 120:
* **Concrete Input:** A claim where characters 118–122 are `foo \| bar` with no preceding spaces in the last 40% of the slice:
* **Trace:** `flat.slice(0, 120)` cuts between `\` and `|`.
* **Result:** Emits a trailing dangling backslash `\` followed by ellipsis (`…`).

---

### Question 6: Deficiencies in the Control Suites

| Control Name | What it Asserts | What it Does **NOT** Cover |
| :--- | :--- | :--- |
| `H1: header WIDER than delimiter` | Mismatch is recorded as `kind: "width"` | Does NOT test that subsequent body rows are flagged as stray; does NOT test `scan()` behavior. |
| `L1: SINGLE-hyphen delimiter` | `| - | - | - |` opens a table | Does NOT test delimiters with alignment colons (`| :- | -: |`) or delimiters without boundary pipes (`- | -`). |
| `L2: DOUBLE-backtick span` | `grep ``a\|b`` here` has 4 cells | Does NOT test spans of length $\ge 3$ or mismatched closing lengths (e.g. `` `a```b\|c` ``). |
| `L3: ESCAPED BACKSLASH` | `ends with \\\| next` has 4 cells | Does NOT test odd backslash counts $>3$ (`\\\\\|`) or `\\` inside backticks. |
| `probeSplitter: 6 probes` | Tests 6 fixed-shape 4-column rows | Does NOT test rows without trailing pipes, rows with $>4$ columns, or unterminated backtick spans. |

---

### Question 7: Unsubstantiated Claims in Comments and Outputs

#### 1. Claim regarding GFM table invalidation on width mismatch
* **Quote (Comment):**
  > `"GFM REQUIRES THE HEADER AND ITS DELIMITER TO HAVE THE SAME CELL COUNT. WHEN THEY DIFFER, NOTHING RENDERS AS A TABLE AT ALL — every line becomes a paragraph."` ([File 1, lines 426–429](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/check-table-integrity.ts#L426-L429))
* **Quote (Output):**
  > `"Every body row is governed by a header."` ([File 1, line 477](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/check-table-integrity.ts#L477))
* **Code Contradiction:**
  ```typescript
  if (hw !== sw) {
    out.push({ file, line: i + 1, got: hw, want: sw, kind: "width", ... });
  }
  inTable = true;
  i++;
  continue;
  ```
  The code sets `inTable = true`, treating every subsequent row as validly inside a table. `cellChecked()` increments `checked++` for those rows and prints that `0` rows are ungoverned.

#### 2. Claim regarding shared instrument
* **Quote (Comment):**
  > `"Agreeing with the gate is the property; this is the shared instrument that makes it true."` ([File 2, lines 86–87](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-index.ts#L86-L87))
* **Code Contradiction:**
  `check-table-integrity.ts` does not use `splitCells()`; it uses `stripCode()` and `bare.split("|")`. They are two distinct parsers with divergent handling of multi-backtick runs, escaped characters, and row boundaries.

#### 3. Claim regarding headline scope
* **Quote (Comment):**
  > `"A bold lead shorter than MIN_HEADLINE is treated as an opening clause rather than a headline, and the surrounding text is taken instead."` ([File 3, lines 183–185](file://$HOME/.gemini/antigravity-cli/brain/61c1859e-be49-4f2a-bc38-f08f4ccc5c1f/tools/build-claims-topics.ts#L183-L185))
* **Code Contradiction:**
  ```typescript
  return flat.replace(/\*\*/g, "").slice(0, 200);
  ```
  The code does not extract "the surrounding text" of the clause; it takes an arbitrary 200-character slice of the entire cell, including evidence and review notes.
