Here is the cold review of `tools/check-emphasis.ts` and `tools/break-emphasis-gate.sh` against CommonMark/GFM specifications and the requirements in `docs/EMPHASIS-DISCIPLINE.md`.

---

### 1. `maskCodeSpans` — Disagreements with GFM / CommonMark

**Verdict: HANDLED CORRECTLY for single-line table row inputs (Clean).**

`maskCodeSpans` was checked against CommonMark 0.30 (§6.1 Backslash escapes, §6.2 Code spans) across the following edge cases:
- **Unequal delimiter runs**: In `` `foo ``bar` ``, the opening run of 1 matches the final 1, masking through the internal 2-backtick run. In `` `foo`` ``, an unmatched opening run of 1 is left verbatim as literal text.
- **Backslash escapes outside spans**: An escaped backtick `` \` `` does not open a span; `` \\`foo` `` correctly treats `\\` as an escaped backslash and opens a code span on the subsequent backtick. The ASCII punctuation character class `/[!-\/:-@\[-`{-~]/` covers all 32 ASCII punctuation characters defined in CommonMark §2.1.
- **Inert escapes inside spans**: In `` `foo\`bar` ``, the backslash does not escape the inner backtick; the span closes immediately after `foo\`, leaving `bar` as visible prose.
- **Length & offset preservation**: Masking replaces interior characters with equal-length `"x"` runs, keeping character offsets and denominators stable.

No input on single-line strings was found where `maskCodeSpans` disagrees with GFM's delimiter pairing.

---

### 2. `midSentence` — False Positives and False Negatives

#### Finding 2.1: False Negative via parenthetical English words matching `/\([0-9a-z]{1,3}\)$/`
- **Grade**: **HIGH**
- **Cost**: Allows mid-clause `⚠` marks in ordinary prose whenever preceded by a parenthetical note.
- **Input**:
  ```markdown
  | E-251 | Latency increased (due) ⚠ to database lock contention. |
  ```
- **Predicted Behavior**: `/\([0-9a-z]{1,3}\)$/` was intended for list enumerators like `(1)` or `(a)`, but matches any 1-to-3 letter word in parentheses (`(due)`, `(and)`, `(the)`, `(see)`, `(for)`, `(bad)`, `(fix)`). `midSentence` returns `false` (valid sentence start) and passes the row, failing to catch a mid-sentence violation.

#### Finding 2.2: False Positive on standard GFM ordered list enumerators `1)` / `2)`
- **Grade**: **MEDIUM**
- **Cost**: Rejects valid table rows using GFM-compliant ordered list syntax.
- **Input**:
  ```markdown
  | E-251 | 1) ⚠ First failure mode. |
  ```
- **Predicted Behavior**: `b.replace(/[*_`~"'’”)\]]+$/, "")` strips the trailing `)`. `b` becomes `"| E-251 | 1"`. Step 6 (`/[.!?—(]$/`) fails on `'1'`, and Step 7 flags it as mid-sentence (`return true`). The row fails Rule 4.

#### Finding 2.3: False Positive on uppercase enumerators `(A)`, `(B)`, `(I)`
- **Grade**: **MEDIUM**
- **Cost**: Rejects standard uppercase list numbering in table cells.
- **Input**:
  ```markdown
  | E-251 | (A) ⚠ First failure mode. |
  ```
- **Predicted Behavior**: `/\([0-9a-z]{1,3}\)$/` only permits lowercase `a-z`. Stripping `)` leaves `'A'`, which is not in `[.!?—(]`. `midSentence` returns `true` and fails Rule 4.

#### Finding 2.4: False Positive on bolded strikethrough retractions `**~~retraction~~** ⚠`
- **Grade**: **LOW**
- **Cost**: Breaks the register's standard retraction idiom when combined with bold emphasis.
- **Input**:
  ```markdown
  | E-251 | **~~Original claim~~** ⚠ Correction. |
  ```
- **Predicted Behavior**: `/~~$/` checks `b` before `**` is stripped, so it fails. The subsequent regex `replace(/[*_`~"'’”)\]]+$/, "")` strips both `*` and `~`, leaving unpunctuated text (`"**Original claim"`). Step 6 fails and `midSentence` returns `true`.

#### Finding 2.5: False Positive on escaped backslash before pipe `\\| ⚠`
- **Grade**: **LOW**
- **Cost**: Flags a valid sentence start following a literal backslash at a cell boundary.
- **Input**:
  ```markdown
  | E-251 | Literal backslash \\| ⚠ New cell content. |
  ```
- **Predicted Behavior**: `/(^|[^\\])\|$/` checks only one character of lookback. It sees `\` before `|` and treats `\\|` as an escaped pipe `\|` rather than an escaped backslash followed by an unescaped cell boundary.

---

### 3. `paragraphs` — GFM Constructs Handled Incorrectly

#### Finding 3.1: Indented code blocks (4 spaces / tabs) are measured as narrative paragraphs
- **Grade**: **HIGH**
- **Cost**: Indented code examples over 800 characters trigger false Rule 6 failures.
- **Input**:
  ```markdown
      // Indented code block exceeding 800 characters
      const buffer = new Uint8Array(1024);
      buffer.fill(0);
  ```
- **Predicted Behavior**: `paragraphs()` only checks for fenced blocks (`/^\s*(```|~~~)/`). Indented code lines (when not in a list) do not match any exemption filter and are pushed to `buf`, merged, and evaluated as an over-length narrative paragraph.

#### Finding 3.2: GFM tables without leading pipes are measured as narrative paragraphs
- **Grade**: **HIGH**
- **Cost**: Valid GFM tables without leading pipes are misidentified as narrative prose and fail Rule 6.
- **Input**:
  ```markdown
  Claim ID | Status | Notes
  ---------|--------|------
  E-251    | PASS   | Detailed prose totaling over 800 characters across table rows.
  ```
- **Predicted Behavior**: In GFM (§4.10), leading pipes are optional. Because `paragraphs()` filters table lines with `/^\s*\|/`, table lines starting without `|` bypass the filter, get pushed into `buf`, and fail Rule 6 if the table exceeds 800 characters.

#### Finding 3.3: Lazy continuation lines in lists and blockquotes are treated as narrative paragraphs
- **Grade**: **MEDIUM**
- **Cost**: CommonMark lazy continuation in lists creates false narrative paragraphs.
- **Input**:
  ```markdown
  - Item 1 lead
  lazy continuation line without leading spaces extending over 800 characters
  ```
- **Predicted Behavior**: Line 2 fails `/^\s{2,}\S/`, resetting `inList = false`. Line 2 is pushed into `buf` as a standalone narrative paragraph.

#### Finding 3.4: Setext headings and HTML blocks are treated as narrative paragraphs
- **Grade**: **MEDIUM**
- **Cost**: Multi-line HTML blocks (`<details>`, `<div>`) and setext heading underlines (`===`) accumulate in `buf` and are counted as prose.
- **Input**:
  ```markdown
  <details>
  <summary>Changelog</summary>
  Prose inside HTML block...
  </details>
  ```
- **Predicted Behavior**: `paragraphs()` has no parser for HTML block structures or `===` setext underlines; lines are accumulated into `buf` as narrative paragraphs.

---

### 4. `judgeRow` — Counter Evasion

#### Finding 4.1: Underscore bold `__bold__` and HTML `<b>`/`<strong>` evade Rule 5
- **Grade**: **HIGH**
- **Cost**: A row can be rendered as 100% bold in GFM while reporting `boldRatio = 0.0%`.
- **Input**:
  ```markdown
  | E-251 | __This entire cell is formatted in bold using standard CommonMark underscores.__ |
  ```
- **Predicted Behavior**: `boldChars()` only searches for `/\*\*([\s\S]+?)\*\*/g`. It ignores `__...__`, `<b>...</b>`, and `<strong>...</strong>`. `judgeRow` computes `boldRatio = 0`, bypassing Rule 5 entirely.

#### Finding 4.2: Emoji variation selector (`\uFE0F`) evades Rule 1 (`⚠⚠`)
- **Grade**: **HIGH**
- **Cost**: Double-warning headlines rendered with standard emoji presentation (`⚠️⚠️`) are invisible to Rule 1.
- **Input**:
  ```markdown
  | E-251 | ⚠️⚠️ Headline one. ⚠️⚠️ Headline two. |
  ```
- **Predicted Behavior**: The standard emoji presentation appends Variation Selector-16 (`\uFE0F`), making the string `\u26A0\uFE0F\u26A0\uFE0F`. `(masked.match(/⚠⚠/g) || []).length` tests literal `\u26A0\u26A0` and fails to match. `doubles` evaluates to `0`, bypassing Rule 1.

#### Finding 4.3: HTML entity warning signs (`&#9888;`) evade Rule 3 (`warns`)
- **Grade**: **MEDIUM**
- **Cost**: Unlimited warning icons can be rendered in a row while reporting `warns = 0`.
- **Input**:
  ```markdown
  | E-251 | &#9888; One. &#9888; Two. &#9888; Three. &#9888; Four. |
  ```
- **Predicted Behavior**: GFM renders `&#9888;` as `⚠`, but `judgeRow` matches only literal `⚠`. `warns` evaluates to `0`, bypassing Rule 3.

#### Finding 4.4: HTML comments dilute the `boldRatio` denominator
- **Grade**: **LOW**
- **Cost**: An author can mask an over-length bold claim by padding the cell with an invisible comment.
- **Input**:
  ```markdown
  | E-251 | **100% BOLD CLAIM TEXT** <!--                                                  --> |
  ```
- **Predicted Behavior**: `boldRatio` divides `boldChars` by `masked.length`. The non-rendered whitespace inside the HTML comment inflates `masked.length`, pulling `boldRatio` below the 20% ceiling.

---

### 5. `break-emphasis-gate.sh` — Probe False Passes

#### Finding 5.1: Generic `verdict=FAIL` masks whether the probe exercised its intended rule
- **Grade**: **HIGH**
- **Cost**: A probe reports `✓` even if its specific mutation was a no-op or the detector for that rule was deleted, provided any secondary failure exists in the tree.
- **Input**: Add an unknown prefix row `| Z-1 | test |` to `CLAIMS.md`, or have any unrelated rule violation present.
- **Predicted Behavior**: When `check-emphasis.ts` runs on any mutation, `unknownPrefix` or the secondary failure sets `failures++`, causing the gate to print `check-emphasis: verdict=FAIL exit=1` and exit with code 1. Every probe expecting `FAIL` (Rules 1, 3, 4, 5, Rule 6, exemptions, prefix checks) matches `got=FAIL` and reports `✓`, without testing its specific rule.

#### Finding 5.2: Vacuity probe is masked if other cohorts have governed rows
- **Grade**: **MEDIUM**
- **Cost**: The vacuity probe passes for the wrong reason if other sections have governed rows.
- **Input**: Run probe `"the cutoff raised above every row — the VACUITY branch, not a control"` when `CLAIMS.md` contains a row in section `P` with `ID >= 13` (e.g. `P-13`).
- **Predicted Behavior**: The probe mutates only `E: 249` -> `E: 9999` in `CUTOFF`. `governed` still contains `P-13`. `idRows.filter(...)` is non-empty, so the vacuity branch (`idRows.length === 0`) does not trigger. If the probe fails, it does so because of another section's row or a secondary control, not the vacuity check it names.

#### Finding 5.3: Output injection spoofing `verdict` line on crashes
- **Grade**: **LOW**
- **Cost**: A crash during mutation can falsely report `FAIL` if the log output contains the verdict string.
- **Input**: A Python mutation script or error output that prints `check-emphasis: verdict=FAIL exit=1` to stderr/stdout and exits 1.
- **Predicted Behavior**: `probe()` extracts the verdict using `grep -o 'check-emphasis: verdict=[A-Z]* exit=[0-9]*' | tail -1`. It matches the injected string, checks `[ "$rc" = "1" ]`, and classifies the crash as `got=FAIL`, reporting a false `✓` instead of `CRASH`.
