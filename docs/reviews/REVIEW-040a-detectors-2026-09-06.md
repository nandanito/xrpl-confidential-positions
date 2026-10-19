# REVIEW-040a — the detector attack (Gemini via agy)

- **Rotation:** `REVIEW-040` — round one on `tools/claims-render-continuity`
- **Date:** 2026-09-06
- **Subject:** the branch at `cb72368`
- **Access:** NO REPOSITORY. Both gate sources pasted in full; no diff, no tools.
- **Packet:** `docs/reviews/REVIEW-040-packets/packet-a-detectors.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-040d`.**

---

### 1. Row renders OUTSIDE a table, but Gate 1 reports PASS

Here are two concrete inputs that break Gate 1's continuity and shape detection:

#### Input 1A: Indented table rows (4 spaces = Indented Code Block in GFM)
```markdown
| # | Claim | Evidence | Grade |
|---|---|---|---|
| E-1 | Valid row | Some evidence | A |
    | E-2 | Stray code row | Truncated evidence |
    | E-3 | Stray code row 2 | Another evidence | B |
```

* **What GFM does:** Under GFM Specification §4.10, table rows cannot have 4 or more spaces of indentation. Line 4 is parsed as an **indented code block** (`<pre><code>`), which terminates the table at line 3. Lines 4 and 5 render completely outside any table as literal code. Line 4 is also missing a cell.
* **What Gate 1 does:**
  1. `isRow` checks `/^\s*\|/.test(line)` — `\s*` permits leading 4 spaces, so `isRow` returns `true`.
  2. `cells` trims whitespace before splitting, returning 3 cells for line 4 and 4 cells for line 5.
  3. `strayRows` sees `inTable === true` and `isRow === true`, so it does not detect any discontinuity.
  4. Gate 1 reports **PASS** (or reports only line 4's shape if cell count differs, but claims lines 4 and 5 are inside a table governed by a header). If line 4 has 4 cells, Gate 1 reports a 100% clean **PASS**.
* **What Gate 1 should do:** Report a continuity violation: lines 4 and 5 render outside the table.

---

#### Input 1B: Header column count mismatch with Delimiter row
```markdown
| # | Claim |
|---|---|---|---|
| E-1 | First claim | Some evidence | A |
| E-2 | Second claim | More evidence | B |
```

* **What GFM does:** Under GFM Specification §4.10, the delimiter row must have the exact same number of cells as the header row. Because 2 ≠ 4, GFM rejects the table structure completely and renders every line as raw paragraph text (`<p>`). All rows render outside a table.
* **What Gate 1 does:**
  1. `strayRows` checks `isRow(lines[0]) && !isSeparator(lines[0]) && isSeparator(lines[1])`. Both regexes match, so it sets `inTable = true`.
  2. `scan` skips line 1 (since `want` is `null`), then on line 2 sets `want = cells(lines[1])` (= 4).
  3. Body rows (lines 3 and 4) have 4 cells, matching `want`.
  4. Gate 1 reports:
     `PASS: every table row has exactly as many cells as its header, and every row lies INSIDE a table a header opened.`
* **What Gate 1 should do:** Report FAIL: the header has 2 cells while the delimiter has 4 cells, invalidating the table in markdown.

---

### 2. Legitimate table Gate 1 wrongly flags (False Failure)

#### Input: Single-hyphen delimiter cells
```markdown
| # | Claim | Evidence | Grade |
| - | - | - | - |
| E-1 | Legitimate row | Evidence text | A |
```

* **What GFM does:** GFM Specification §4.10 states: *"Each delimiter row cell must contain at least one `-` character."* A single hyphen per cell is fully valid GFM. This renders as a standard 4-column HTML table.
* **What Gate 1 does:**
  `isSeparator` tests `/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/`, which requires at least **two** hyphens (`-{2,}`).
  `isSeparator` returns `false` for `| - | - | - | - |`.
  In `strayRows`, `isSeparator(lines[1])` is `false`, so `inTable` is never set to `true`. Every line matches `isRow`, causing `strayRows` to flag all 3 lines as stray rows.
  Gate 1 exits with non-zero:
  `FAIL: 0 malformed row(s); 3 row(s) outside a table, in 1 run(s).`
* **What Gate 1 should do:** Report **PASS**.

---

### 3. Disagreements between Gate 1 helpers and GFM Rendering

#### A. `isRow`
* **Input (no outer pipes):** `E-1 | some claim | some evidence | A`
  * **GFM:** Renders as a valid table row (outer pipes are optional in GFM §4.10).
  * **Gate 1:** `isRow` returns `false` because `/^\s*\|/` and `.endsWith("|")` require outer pipes.
* **Input (escaped trailing pipe):** `| E-1 | some claim | evidence ending with \|`
  * **GFM:** The trailing pipe is escaped content, so the row is unclosed / malformed.
  * **Gate 1:** `line.trim().endsWith("|")` evaluates to `true`, treating it as a closed row.

#### B. `isSeparator`
* **Input:** `--- | :---: | ---`
  * **GFM:** Valid delimiter row without outer pipes.
  * **Gate 1:** `isSeparator` returns `false` (requires leading and trailing `|`).

#### C. `stripCode`
* **Input (multi-backtick code span with pipes):**
  `| E-1 | grep ``a|b`` pattern | evidence | A |`
  * **GFM:** `` ``a|b`` `` is a single code span containing a literal pipe. The row has 4 columns.
  * **Gate 1:** `stripCode` uses `/`[^`]*`/g`. It matches the first two backticks as an empty code span and the last two as another empty code span, leaving `a|b` unstripped. `cells()` returns **5** cells instead of 4, causing `scan()` to report a false shape error.
* **Input (escaped backslash before delimiter pipe):**
  `| E-1 | Path ends with \\| next cell | A |`
  * **GFM:** `\\` is an escaped backslash (`\`) and `|` is the cell delimiter (3 cells).
  * **Gate 1:** `stripCode` executes `.replace(/\\\|/g, "")`, matching `\\|` and deleting the pipe delimiter. `cells()` returns **2** cells instead of 3.

#### D. `cells`
* **Input (row with single empty cell):** `||`
  * **GFM:** Single cell with empty content.
  * **Gate 1:** `bare` becomes `""`. `"".split("|").length` evaluates to `1`. For `| |`, `bare` becomes `" "`, `" ".split("|").length` is `1`.

---

### 4. Gate 2 headline extraction & topic misassignment

#### Input: Ambiguous keyword in plain English headline
```markdown
| E-250 | **Field observation on reviewer rotation** | Notes on rotation | A |
```

* **What `headline()` returns:** `"Field observation on reviewer rotation"`
* **What Gate 2 does:**
  In `TOPICS[0]` (`protocol-and-crypto`):
  `pattern: /...|\bfield\b|byte|auditor|domain/i`
  Because `\bfield\b` matches case-insensitively on `"Field"`, Gate 2 assigns `protocol-and-crypto` to this row.
* **Misassignment:** A process observation about reviewer rotation is misassigned to **Protocol and cryptography**.

#### Input: Headline with multiple bold spans (non-greedy regex cut-off)
```markdown
| E-251 | **Phase 1:** **Bulletproof ZKProof verification** in FFI | Proof verification details | A |
```

* **What `headline()` returns:**
  `flat.match(/^\*\*(.+?)\*\*/)` is non-greedy (`.+?`) and stops at the first `**`.
  `headline()` returns `"Phase 1:"`.
* **What Gate 2 does:**
  `byRules("Phase 1:")` matches 0 topics.
  Gate 2 halts with:
  `FAIL: 1 problem(s) — every row must carry at least one topic.`
  `  E-251 matches no topic — add a pattern or an OVERRIDES entry: Phase 1:`
* **Misassignment:** The row is falsely treated as an orphan, completely missing its true topic **Protocol and cryptography** (`protocol-and-crypto`).

---

### 5. Gate 2 redundancy check

#### Can an override be redundant and not caught?
**YES.**

* **Mechanism:**
  Line 208 in `build-claims-topics.ts`:
  ```typescript
  if (ts.every((t) => rules.has(t))) {
    problems.push(`OVERRIDES[${id}] is REDUNDANT — the patterns already give it ${ts.join(", ")}. Delete the line.`);
  }
  ```
* **Concrete failure scenario:**
  Suppose `OVERRIDES["E-87"] = ["review-rounds", "instruments-and-gates"]`.
  A contributor widens the `instruments-and-gates` regex, which now matches `E-87`'s headline.
  * `rules` for `E-87` contains `"instruments-and-gates"`, but not `"review-rounds"`.
  * `ts.every((t) => rules.has(t))` tests whether *both* topics match. Because `"review-rounds"` does not match, `every` returns **`false`**.
  * `problems.push(...)` is **not called**.
  * The override entry for `"instruments-and-gates"` is completely redundant (dead rot), but Gate 2 reports PASS.

#### Can an override be caught and not redundant?
* For any override with non-empty topics, if `ts.every()` returns `true`, all specified topics are indeed produced by `byRules()`, so it is genuinely redundant.
* **Edge case (Empty array):** If an entry is `OVERRIDES["E-99"] = []`, `[].every(...)` returns `true` in JavaScript, producing:
  `OVERRIDES[E-99] is REDUNDANT — the patterns already give it . Delete the line.`

---

### 6. Claims in comments or output that the code does not do

#### Discrepancy 1: Header row cell count is never checked
* **Comment & Output Claims:**
  > Line 40: `* SHAPE the separator row fixes the column count, and every body row must have exactly that many cells.`
  > Line 320: `PASS: every table row has exactly as many cells as its header,`
* **Code in `scan()` (lines 118–137):**
  ```typescript
  if (want === null) continue; // header, or a row before its separator
  const got = cells(l);
  if (got !== want) { ... }
  ```
  `want` is initialized to `null`. When `scan()` encounters the header line, `want` is `null`, so it skips the header. On the next line (the separator), it sets `want = cells(separator)`. `scan()` **never** checks the header row against `want`. If the header has 2 cells and the separator has 4 cells, `scan()` reports 0 problems.

#### Discrepancy 2: Comment claims widening a pattern will catch redundant overrides
* **Comment Claim (lines 201–205):**
  > `* ⚠⚠ A REDUNDANT OVERRIDE IS A FALSE STATEMENT ABOUT THE RULES... Widening a pattern can make that untrue, and nothing would say so... Deleting the line is the whole fix.`
* **Code in `build-claims-topics.ts` (line 208):**
  ```typescript
  if (ts.every((t) => rules.has(t)))
  ```
  Because it uses `.every()`, widening a pattern that reaches one topic in a multi-topic override is **not** caught.

#### Discrepancy 3: Comment claims `\|` stripping handles content pipes safely
* **Comment Claim (lines 101–104):**
  > `* Remove inline code spans, so pipes inside backticks are not cells.`
  > `* ⚠ Escaped pipes (\|) are removed too. Both are ways of writing a pipe that is content rather than structure...`
* **Code in `stripCode()` (line 107):**
  ```typescript
  return line.replace(/\\\|/g, "").replace(/`[^`]*`/g, "`");
  ```
  The regex `/\\\|/g` removes any backslash followed by a pipe without checking if the backslash was itself escaped (e.g. `\\|`). This deletes structural column delimiters when a cell ends in a literal backslash.
