# REVIEW-042a — attacking the semantics change (Gemini via agy)

- **Rotation:** `REVIEW-042` — ROUND THREE, reviewing `REVIEW-041`'s fixes
- **Date:** 2026-09-06
- **Subject:** the fixes at `dc0e415`
- **Access:** NO REPOSITORY. The gate and the index generator pasted in full.
- **Packet:** `docs/reviews/REVIEW-042-packets/packet-a-semantics-inline.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-042d`.**

---

Here is the detailed analysis of the semantic changes across `tools/check-table-integrity.ts` and `tools/build-claims-index.ts`.

---

### 1. `stripCode()` / `cells()` Disagreements with GFM

`stripCode()` replaces `\\\|` with `""`. In combination with `cells()`, it still miscounts valid GFM rows in two concrete scenarios:

#### Finding 1.1: A row with no trailing delimiter pipe where the last cell ends in `\|` (or is only `\|`)
* **Concrete Input:**
  ```markdown
  | # | Claim |
  |---|---|
  | E-1 | \|
  ```
  *(A 2-column table where the second cell consists only of an escaped pipe `\|` with no optional trailing table delimiter pipe).*
* **Real GFM Behavior:** GFM does not require a trailing delimiter pipe. This is parsed as 2 cells: `E-1` and `|`.
* **What the code does:**
  1. `stripCode("| E-1 | \\|")` replaces `\\\|` with `""`, returning `"| E-1 | "`.
  2. `cells()` calls `.trim()`, collapsing `"| E-1 | "` to `"| E-1 |"`.
  3. `bare.replace(/^\|/, "")` leaves `" E-1 |"`.
  4. `bare.replace(/\|$/, "")` sees the `|` at the end (which was actually the cell delimiter between column 1 and column 2!) and strips it, leaving `" E-1 "`.
  5. `bare.split("|")` returns `[" E-1 "]` (length **1** instead of **2**).
  `cells()` returns **1**, reporting a false mismatch against a 2-column header.

#### Finding 1.2: A row with no trailing delimiter pipe rejected by `isRow()`
* **Concrete Input:**
  ```markdown
  | # | Claim | Grade
  |---|---|---
  | E-1 | text | A
  ```
* **Real GFM Behavior:** Valid table with 3 columns and 3 cells per row.
* **What the code does:**
  `isRow(line)` checks `/^\s*\|/.test(line) && line.trim().endsWith("|")`.
  Because `line.trim().endsWith("|")` is `false`, `isRow()` returns `false`. `scan()` resets `want = null` and skips checking this row (and prematurely breaks table continuity).

---

### 2. `splitCells()` & `contentCells()` on Empty First/Last Cells

`splitCells()` correctly preserves tokens, but `contentCells()` makes a false assumption: it assumes any leading or trailing empty element in `splitCells()` was created by outer table border pipes (`|`).

#### Finding 2.1: Legitimate empty FIRST cell without leading pipe
* **Concrete Input:**
  ```markdown
   | Claim | Evidence | Grade |
  ```
  *(Column 1 is empty; there is no outer leading pipe before the first cell delimiter).*
* **Real GFM Behavior:** 4 cells: `""`, `"Claim"`, `"Evidence"`, `"Grade"`.
* **What the code does:**
  1. `splitCells` returns `[" ", " Claim ", " Evidence ", " Grade ", ""]`.
  2. `contentCells` tests `parts[0].trim() === ""` (which is `true` for `" "`), and executes `parts.shift()`.
  3. Result returned: `[" Claim ", " Evidence ", " Grade "]` (3 cells).
  **Cell 1 is dropped.**

#### Finding 2.2: Legitimate empty LAST cell without trailing pipe (Misidentifies Grade)
* **Concrete Input:**
  ```markdown
  | E-1 | A bug description | Evidence text | 
  ```
  *(4 columns: `id`, `claim`, `evidence`, and an empty `grade`, written without an optional trailing pipe).*
* **Real GFM Behavior:** 4 cells: `"E-1"`, `"A bug description"`, `"Evidence text"`, `""`.
* **What the code does:**
  1. `splitCells` returns `["", " E-1 ", " A bug description ", " Evidence text ", " "]`.
  2. `contentCells` executes `parts.shift()` (dropping `""`) and then tests `parts[parts.length - 1].trim() === ""` (which is `true` for `" "`). It executes `parts.pop()`, dropping the empty 4th cell.
  3. Result returned: `[" E-1 ", " A bug description ", " Evidence text "]` (3 cells).
  4. In `build-claims-index.ts:parse()`, `cells.length >= 3` is satisfied, so `cells[cells.length - 1]` reads `"Evidence text"` as the row's **Grade**!

---

### 3. Probe List Coverage Gaps

The probe list inverted its previous expectation, but several key shapes remain uncovered:

1. **Escaped backslash inside a code span before a pipe (` `x\\|y` ` / ` `\\|` `):**
   The probes check plain text `\\\\|` and code-span `x\|y`, but never test an escaped backslash *inside* a code span before a pipe to verify that `\\\\|` inside backticks correctly treats `|` as a cell delimiter.
2. **Escaped pipes inside multi-backtick spans (` ``a\|b`` `):**
   The probes verify unescaped pipes in double backticks (`` ``a|b`` ``), but do not probe escaped pipes inside double backticks.
3. **Triple backslash sequences (`\\\|`):**
   No probe tests a literal backslash followed by an escaped pipe (`\\\|`), neither in plain text nor in code spans.
4. **Genuinely short rows caused by code-span splits:**
   The probe named `"a pipe inside a code span IS a cell (GFM), so this row is short"` actually provides 5 cells for a 4-column header (an *extra* cell, not short). It does not test an actually short row (e.g., 3 cells under a 4-column header).

---

### 4. Round-Trip in `summarise()` Corrupts Literal Backslashes

**The round-trip is NOT sound.** It corrupts a literal backslash that precedes a pipe (`\\|`).

* **Concrete Input:**
  ```typescript
  summarise("ends with \\\\| next")
  ```
  *(Source text containing an escaped backslash `\\` followed by a pipe `|`).*
* **What the code does:**
  1. `.replace(/\\\|/g, "|")`: The regex `/\\\|/` matches the second `\` and the `|`. It replaces `\|` with `|`, turning `ends with \\| next` into `ends with \| next`.
  2. `.replace(/\|/g, "\\|")`: Matches the pipe and escapes it, turning `ends with \| next` back into `ends with \\| next`.
* **The Failure in Generated Output:**
  When written into `docs/CLAIMS-INDEX.md`:
  ```markdown
  | [E-1](../CLAIMS.md#L10) | ends with \\| next | A |
  ```
  In GFM, `\\|` is an escaped backslash `\\` (content) followed by an unescaped `|` (**structural cell delimiter**). GFM splits the cell on `|`, producing 4 body cells under a 3-column header and breaking the generated table.

---

### 5. Indentation Boundary Disagreement: `/^ {0,3}\|/` vs `/^\s*\|/`

The gate and the index generator disagree on row indentation boundaries:

* **The Rule:** In GFM, up to 3 spaces of indentation are permitted for table rows. 4 spaces (or tabs) creates an indented code block, not a table row.
* **The Disagreement:**
  * **Gate (`check-table-integrity.ts`):** `isRow()` uses `/^\s*\|/`, accepting any amount of indentation (including 4+ spaces and tabs).
  * **Generator (`build-claims-index.ts`):** `ROW` uses `/^ {0,3}\|/`, strictly enforcing 0 to 3 spaces.
* **Concrete Input:**
  ```markdown
      | E-100 | claim text | evidence | A |
  ```
  *(A row indented with 4 spaces).*
* **What happens:**
  * `check-table-integrity.ts` matches the row via `isRow()` and includes it in `rowsBody` / `rowsChecked`.
  * `build-claims-index.ts` fails `l.match(ROW)`, silently skipping the row and dropping it from `docs/CLAIMS-INDEX.md`.

---

### 6. Discrepancies Between Comments and Code

#### Quote 1: Docstring of `stripCode()` vs Implementation
* **Comment (`tools/check-table-integrity.ts:104-106`):**
  > `"Remove inline code spans, so pipes inside backticks are not cells."`
* **Code (`tools/check-table-integrity.ts:114`):**
  ```typescript
  return line.replace(/\\\\/g, "\u0000").replace(/\\\|/g, "").replace(/\u0000/g, "\\");
  ```
  *The code does not strip inline code spans at all.*

#### Quote 2: Docstring of `cells()` vs Implementation
* **Comment (`tools/check-table-integrity.ts:117`):**
  > `"/** Cell count of a table row, code spans stripped. */"`
* **Code (`tools/check-table-integrity.ts:118-121`):**
  ```typescript
  function cells(line: string): number {
    const bare = stripCode(line).trim().replace(/^\|/, "").replace(/\|$/, "");
    return bare.split("|").length;
  }
  ```
  *Code spans are not stripped.*

#### Quote 3: Probe Name in `SELF_TESTS` vs Probe Data
* **Comment / Name (`tools/check-table-integrity.ts:182`):**
  > `name: "a pipe inside a code span IS a cell (GFM), so this row is short",`
* **Code (`tools/check-table-integrity.ts:183`):**
  ```typescript
  body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a `x|y|z` | b | c |\n",
  ```
  *The row has 5 cells (`F-1`, `a `x`, `y`, `z` | b`, `c`) under a 4-column header; it is an **extra-cell / over-width row**, not a short row.*

#### Quote 4: Comment in `parse()` vs `contentCells()` Behavior
* **Comment (`tools/build-claims-index.ts:145`):**
  > `// Cells: leading "" | id | claim | evidence | grade | trailing ""`
* **Code (`tools/build-claims-index.ts:146`):**
  ```typescript
  const cells = contentCells(l).map((c) => c.trim());
  ```
  *`contentCells()` has already stripped leading and trailing empty elements; `cells` contains `[id, claim, evidence, grade]`, not flanking empty strings.*
