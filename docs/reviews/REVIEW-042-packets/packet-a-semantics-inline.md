DO NOT USE ANY TOOLS. Everything you need is pasted below.

# Round three: attack a semantics change

A markdown table gate and two generators were changed to adopt a rule they
previously got backwards. **Your job is to find where the NEW rule is applied
wrongly or incompletely.**

## The rule

In a GitHub-Flavoured Markdown table, **a `|` is a cell delimiter even inside a
code span**. Only a backslash-escaped `\|` is content. The spec: include a pipe
in a cell by escaping it, *"including inside other inline spans"*.

Verified with three parsers (`cmark-gfm 0.29.0.gfm.13`, `marked@18`,
`markdown-it`) — they agree:

```
| # | A | B | C |
|---|---|---|---|
| E-1 | see `a|b` here | ev | A |     ->  cells: E-1 / "see `a" / "b` here" / ev
| E-1 | see `a\|b` here | ev | A |    ->  cells: E-1 / "see <code>a|b</code> here" / ev / A
```

Previously these tools **protected** code-span pipes. Five live rows in the
register therefore rendered with more cells than their header; GFM discards the
excess, so the **Grade column displayed a fragment of code**. 19 pipes were
escaped to fix the data, and the tools were changed to match GFM.

## The questions

1. ⚠ **`stripCode()` now strips only `\|`. Find an input where its cell count
   still disagrees with a real GFM renderer.** Consider escaped backslashes,
   an escaped pipe at end of line, empty cells, alignment colons, a row with no
   trailing pipe, HTML in a cell, autolinks, and `\` before a non-pipe.
2. ⚠ **`splitCells()` splits on unescaped pipes. Same question**, and
   additionally: does `contentCells()` drop the right things? What happens to a
   row that legitimately has an empty FIRST or LAST cell?
3. **The self-test that asserted the old rule was inverted.** Read the probe
   list. **What shape does it still not cover?**
4. **`summarise()` unescapes `\|` then re-escapes every `|`.** Is that
   round-trip correct in all cases? What about a literal backslash before a
   pipe that is NOT an escape?
5. ⚠ **The `ROW` regexes accept `/^ {0,3}\|/`.** GFM allows up to three spaces
   of indentation — but four spaces makes an indented code block. Is the
   boundary handled correctly, and does the gate agree with the generators?
6. ⚠ **Anything the new comments CLAIM that the new code does not do.** Quote
   the sentence and the code.

⚠ **Every finding must be a concrete input plus what the code does with it.**
⚠ **If the change is sound, say so.** Two earlier legs gave right diagnoses with
wrong numbers; a confident wrong finding costs more than a gap.

---

# FILE 1 — tools/check-table-integrity.ts (COMPLETE)

```typescript
#!/usr/bin/env bun
/**
 * check-table-integrity.ts — a gate for the defect that renders as a short row
 * rather than as an error.
 *
 *   bun run tools/check-table-integrity.ts
 *
 * ## What this is for
 *
 * `CLAIMS.md` is this project's register and it is a set of markdown tables. A
 * row that loses a cell **does not look broken**: markdown renders it as a
 * shorter row, silently, and every reader who scans the file sees a row that is
 * simply terse.
 *
 * It has already happened here twice, in two different ways:
 *
 *   E-148  a correction rewrote a row's item text and truncated the row
 *          mid-cell, dropping its Evidence and Grade columns. It survived five
 *          commits and was found by a one-off sweep, not by reading.
 *   F-14, F-19, F-21, F-22, F-25, F-26, F-28
 *          seven rows in the Findings table carried no Grade cell at all —
 *          three cells under a four-column header. Found 2026-08-27 by running
 *          the same sweep as a script instead of by eye (`CLAIMS.md` E-162).
 *
 * ⚠ **A sweep recorded in prose is a claim with no falsifier.** That sentence is
 * this project's own and it is why this file exists: the sweep that found the
 * seven rows was a throwaway, and a throwaway that is not committed has to be
 * re-invented by the next person who happens to suspect something.
 *
 * ## What it checks, and what it deliberately does not
 *
 * **Two properties, and they are independent.**
 *
 *   SHAPE       the separator row fixes the column count, and every body row
 *               must have exactly that many cells. Too few is the truncation
 *               defect; too many usually means an unescaped `|`.
 *   CONTINUITY  every body row must lie INSIDE a table that a header and its
 *               separator opened. A row that no header governs renders as loose
 *               pipe-delimited text, and `scan()` cannot cell-check it either.
 *
 * ⚠ **Shape was the whole gate until E-243, and continuity was added for the
 * one closer that finding happened to look at.** E-244 is what that cost: 96
 * rows still rendered outside the tables after E-243's fix shipped, 8 of them
 * carrying no Grade cell for nine days, and this gate printed PASS over all of
 * it. **The two properties are checked separately below and neither implies the
 * other** — a well-formed row can sit outside a table, and a row inside one can
 * be short.
 *
 * It says **nothing** about whether a cell's contents are true, whether a grade
 * is deserved, or whether a row belongs in its section.
 *
 * ## ⚠⚠ The rationale that was here was FALSE, and it cost five live rows
 *
 * This section used to say: *"`CLAIMS.md` is full of inline code spans
 * containing pipes … a naive `count('|')` flags every one of them and the gate
 * becomes noise that gets switched off. Code spans are stripped before any cell
 * is counted."*
 *
 * **GFM does not work that way.** The spec requires a pipe in a cell to be
 * escaped *"including inside other inline spans"*, so `` `a|b|c` `` in a table
 * row splits the row and breaks the code span. Those rows were never noise —
 * **they were broken, and this gate was built to not see them.** Five were live
 * when `REVIEW-041` measured it: `E-48`, `E-162`, `E-214`, `E-222` and `E-246`,
 * each rendering with more cells than its header, GFM discarding the excess,
 * and **the Grade column showing a fragment of code**.
 *
 * Only `\|` is content now, and the register's five rows are escaped.
 *
 * ⚠ **This gate reports a number, and E-141 is the standing warning that a gate
 * reporting a number is making a claim about what the number counts.** Each
 * check below is therefore paired with its own probe, and a probe that stops
 * being detected exits non-zero before a single file is read — the pairing is
 * what stopped an earlier gate here from hiding a broken detector behind a
 * second one that matched the same string.
 */

import { readFileSync, readdirSync } from "node:fs";

/**
 * ⚠ **TWO FILES, NOT THE CORPUS — a named limit, measured rather than assumed.**
 * On 2026-09-05, **132 tracked markdown files contain table rows** and this gate
 * reads two of them. A sweep of all 132 with `marked@18` found stray rows in
 * exactly **two** others, both historical packets this project deliberately does
 * not rewrite: `docs/reviews/REVIEW-027-REQUEST-…` (3 rows) and
 * `docs/decisions/DECISION-REQUEST-b22-…` (1 row). ⚠ **They are disclosed, not
 * fixed** — `CLAUDE.md` keeps `docs/reviews/` as the record of what a leg was
 * shown, and E-175 extends that to the request documents.
 *
 * ⚠ **The register and the feedback file are gated because they are the files
 * whose rows carry evidence and grades.** A table added to any other document
 * is unchecked, and the defect is silent: an indented table inside a list item
 * renders as literal text, which is how `docs/NEXT-SESSION-PROMPT.md` acquired
 * one **in the commit that documented this class of defect** (E-244).
 */
const TARGETS = [
  "CLAIMS.md",
  "UPSTREAM-FEEDBACK.md",
  // ⚠⚠ **THE GENERATED FILES ARE GATED TOO, AS OF REVIEW-040 M6.** They were
  // not, and `summarise()` strips backticks while KEEPING pipes — so a headline
  // containing `` `a|b|c` ``, an ordinary grep alternation in this register,
  // emits structural pipes into a generated row and breaks the very table this
  // gate exists to protect. Being generated is not the same as being correct.
  "docs/CLAIMS-INDEX.md",
  ...readdirSync("docs/claims/by-topic")
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `docs/claims/by-topic/${f}`),
];

/**
 * Remove inline code spans, so pipes inside backticks are not cells.
 *
 * ⚠ Escaped pipes (`\|`) are removed too. Both are ways of writing a pipe that
 * is content rather than structure, and a gate that understood one and not the
 * other would fail on whichever the register happens to use next.
 */
function stripCode(line: string): string {
  // ⚠⚠ **IN A GFM TABLE A PIPE IS STRUCTURAL EVEN INSIDE A CODE SPAN.** The spec
  // is explicit: include a pipe in a cell by escaping it, *"including inside
  // other inline spans"*. This function used to PROTECT code-span pipes, on the
  // reasoning that `` `a|b|c` `` is ordinary in this register and counting it
  // would make the gate noise. **That reasoning was false and it cost five live
  // rows** (`E-48`, `E-162`, `E-214`, `E-222` and `E-246`, the row written to
  // record the previous round): each rendered with more cells than its header,
  // GFM discarded the excess, and the **Grade column displayed a fragment of
  // code**. Measured with `marked@18`, corroborated by a leg using Pandoc.
  //
  // ⚠ **Fourth distinct way this gate certified a file whose rows do not
  // render**: a blank line (E-243), prose and `---` (E-244), a header/delimiter
  // mismatch (REVIEW-040 H1), and this (REVIEW-041).
  //
  // Only a BACKSLASH-ESCAPED pipe is content. An escaped backslash is content
  // and does NOT escape the pipe that follows it.
  return line.replace(/\\\\/g, "\u0000").replace(/\\\|/g, "").replace(/\u0000/g, "\\");
}


/** Cell count of a table row, code spans stripped. */
function cells(line: string): number {
  const bare = stripCode(line).trim().replace(/^\|/, "").replace(/\|$/, "");
  return bare.split("|").length;
}

/**
 * ⚠ **GFM requires at least ONE `-` per delimiter cell, not two.** Demanding
 * `-{2,}` made `| - | - |` — a perfectly valid table — report every row as
 * stray: a FALSE FAIL, found by REVIEW-040 leg A. The register writes `|---|`,
 * so this never fired here; a gate that is wrong about the format it polices is
 * still wrong.
 */
function isSeparator(line: string): boolean {
  return /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line);
}

function isRow(line: string): boolean {
  return /^\s*\|/.test(line) && line.trim().endsWith("|");
}

type Problem = { file: string; line: number; got: number; want: number; head: string;
  /**
   * ⚠ "continuity" = rows outside a table (E-243, E-244), which have no cell
   * counts. "width" = a header/delimiter mismatch, which renders NO table at
   * all (REVIEW-040 H1).
   */
  kind?: "continuity" | "width"; detail?: string };

function scan(file: string, text: string): Problem[] {
  const out: Problem[] = [];
  const lines = text.split("\n");
  let want: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!isRow(l)) {
      want = null;
      continue;
    }
    if (isSeparator(l)) {
      want = cells(l);
      continue;
    }
    if (want === null) continue; // header, or a row before its separator
    const got = cells(l);
    if (got !== want) {
      out.push({ file, line: i + 1, got, want, head: stripCode(l).slice(0, 72) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Self-tests. Each pairs one behaviour with a probe only it should decide.
// ---------------------------------------------------------------------------

const SELF_TESTS: { name: string; body: string; expect: number }[] = [
  {
    name: "a row missing a cell is reported",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a | b |\n",
    expect: 1,
  },
  {
    name: "a row with an extra cell is reported",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a | b | c | d |\n",
    expect: 1,
  },
  {
    name: "a well-formed row is not reported",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a | b | c |\n",
    expect: 0,
  },
  {
    // ⚠⚠ **THIS PROBE ASSERTED THE OPPOSITE UNTIL REVIEW-041, AND IT IS THE
    // SENTENCE THAT CAUSED THE DEFECT.** It read *"pipes inside a code span are
    // content, not cells"* and called that "the false positive that would make
    // this gate useless in THIS register". **GFM disagrees**: a pipe is
    // structural even inside a code span, and five live rows rendered with the
    // wrong Grade because the gate believed otherwise. A row like this one IS
    // malformed and must be reported.
    name: "a pipe inside a code span IS a cell (GFM), so this row is short",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a `x|y|z` | b | c |\n",
    expect: 1,
  },
  {
    name: "an ESCAPED pipe inside a code span is content",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a `x\\|y` | b | c |\n",
    expect: 0,
  },
  {
    name: "an escaped pipe is content, not a cell",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a \\| b | c | d |\n",
    expect: 0,
  },
  {
    name: "two tables in one file are counted against their own headers",
    body:
      "| # | A | B |\n|---|---|---|\n| X-1 | a | b |\n\n" +
      "| # | A | B | C |\n|---|---|---|---|\n| Y-1 | a | b |\n",
    expect: 1,
  },
];

let selfFailures = 0;
for (const t of SELF_TESTS) {
  const got = scan("<probe>", t.body).length;
  if (got !== t.expect) {
    console.error(`SELF-TEST FAILED: ${t.name} — expected ${t.expect} problem(s), got ${got}`);
    selfFailures++;
  }
}
if (selfFailures > 0) {
  console.error(
    `\n⚠ ${selfFailures} self-test(s) failed. Not a single file was scanned.\n` +
      `  A gate whose detection is broken reports "clean" and means nothing.`,
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Controls for the stray-row detector.
//
// ⚠ **Each runs through `strayRows` itself.** Four gates in this repository
// false-passed because their controls re-ran a count or checked an unrelated
// absence instead of calling the real detector (`CLAIMS.md` E-182, E-198,
// E-203). ⚠ **And each names the shape it pins**: controls that only replay the
// last round's attack prove the gate catches the last attack (E-201).
// ---------------------------------------------------------------------------

const H = "| # | A | B |\n|---|---|---|\n";
let controlsRun = 0; // ⚠ incremented by the helper, never typed (E-203).

function control(name: string, body: string, expectRows: number): boolean {
  controlsRun++;
  const got = strayRows("<control>", body).reduce((n, p) => n + p.got, 0);
  if (got === expectRows) {
    console.log(`  CONTROL ✓ ${name}`);
    return true;
  }
  console.error(`  CONTROL ✗ ${name} — expected ${expectRows} stray row(s), got ${got}`);
  return false;
}

console.log("Controls — each runs through the SAME detector the real check calls");
const controlResults = [
  // The property, in the two shapes that were live in the register.
  control("PROSE between rows leaves the rest OUTSIDE the table",
    H + "| X-1 | a | b |\n\n**a paragraph.**\n\n| X-2 | a | b |\n| X-3 | a | b |\n", 2),
  control("a `---` thematic break leaves the row after it OUTSIDE",
    H + "| X-1 | a | b |\n\n---\n| X-2 | a | b |\n", 1),
  // ⚠ E-243's own case. The narrower property must not regress.
  control("a BLANK line inside a table leaves the rest OUTSIDE (E-243)",
    H + "| X-1 | a | b |\n\n| X-2 | a | b |\n", 1),
  // The repair idiom, which must not be flagged — a false-fail here would push
  // someone to "fix" the register by deleting its section notes.
  control("a re-emitted HEADER after prose is NOT flagged (the repair)",
    H + "| X-1 | a | b |\n\n*a section note.*\n\n" + H + "| X-2 | a | b |\n", 0),
  control("an unbroken table is NOT flagged", H + "| X-1 | a | b |\n| X-2 | a | b |\n", 0),
  // ⚠ The false positive that would make this gate noise in THIS register:
  // CLAIMS.md's navigation table has an EMPTY header row.
  control("a table with an EMPTY header row is NOT flagged (CLAIMS.md:9)",
    "| | |\n|---|---|\n| **Navigate** | see the index |\n", 0),
  control("a heading closes a table, and a row after it is stray",
    H + "| X-1 | a | b |\n\n## Next\n\n| X-2 | a | b |\n", 1),
  // Grouping: one defect reported once, with the right count.
  control("consecutive stray rows are ONE run carrying the full count",
    H + "| X-1 | a | b |\n\ntext\n\n| X-2 | a | b |\n| X-3 | a | b |\n| X-4 | a | b |\n", 3),
  // ⚠ A row before ANY header at all — the file-start case the run's cause names.
  control("a row before any header at all is stray", "| X-1 | a | b |\n", 1),
  // ⚠ REVIEW-040 L1: a single-hyphen delimiter is VALID GFM. The old rule
  // demanded two and reported every row of such a table as stray.
  control("a SINGLE-hyphen delimiter opens a table (L1, was a false fail)",
    "| # | A | B |\n| - | - | - |\n| X-1 | a | b |\n", 0),
];

// ---------------------------------------------------------------------------
// Controls for the WIDTH detector (REVIEW-040 H1) and the strippers (L2, L3).
// ⚠ Separate helper, separate count, because a control that runs the wrong
// detector proves nothing about this one.
// ---------------------------------------------------------------------------
let widthControlsRun = 0;
function widthControl(name: string, body: string, expect: number): boolean {
  widthControlsRun++;
  const got = strayRows("<control>", body).filter((p) => p.kind === "width").length;
  if (got === expect) { console.log(`  CONTROL ✓ ${name}`); return true; }
  console.error(`  CONTROL ✗ ${name} — expected ${expect} width problem(s), got ${got}`);
  return false;
}
console.log("Controls — header/delimiter width, and the cell strippers");
const widthResults = [
  widthControl("a header WIDER than its delimiter is caught (H1)",
    "| # | A | B | C |\n|---|---|---|\n| X-1 | a | b |\n", 1),
  widthControl("a header NARROWER than its delimiter is caught (H1)",
    "| # | A |\n|---|---|---|---|\n| X-1 | a | b | c |\n", 1),
  widthControl("a matching header and delimiter is NOT caught",
    "| # | A | B |\n|---|---|---|\n| X-1 | a | b |\n", 0),
  widthControl("an EMPTY header row still matches its delimiter (CLAIMS.md:9)",
    "| | |\n|---|---|\n| **Navigate** | see the index |\n", 0),
];
// ⚠ Stripper controls assert CELL COUNTS, so they call `cells` — the function
// the real check calls — not a re-implementation.
function stripControl(name: string, line: string, expect: number): boolean {
  widthControlsRun++;
  const got = cells(line);
  if (got === expect) { console.log(`  CONTROL ✓ ${name}`); return true; }
  console.error(`  CONTROL ✗ ${name} — expected ${expect} cells, got ${got}`);
  return false;
}
const stripResults = [
  // ⚠⚠ **GFM: a pipe inside a code span IS a cell delimiter.** These controls
  // asserted the opposite until REVIEW-041, which is why five live rows with
  // unescaped code-span pipes rendered with the wrong Grade and this gate said
  // PASS. Only `\\|` is content.
  stripControl("a pipe inside a code span IS a delimiter (REVIEW-041)",
    "| X-1 | `a|b|c` | ev | A |", 6),
  stripControl("a DOUBLE-backtick span does not protect its pipe either",
    "| X-1 | grep ``a|b`` here | ev | A |", 5),
  stripControl("an ESCAPED pipe inside a span IS content",
    "| X-1 | `a\\|b` | ev | A |", 4),
  stripControl("an escaped pipe in plain text is content",
    "| X-1 | a \\| b | c | d |", 4),
  stripControl("an ESCAPED BACKSLASH does not protect the pipe after it (L3)",
    "| X-1 | ends with \\\\| next | A |", 4),
];
if ([...widthResults, ...stripResults].some((ok) => !ok)) {
  console.error("\n⚠ A width/stripper control failed. Not a single file was scanned.");
  process.exit(2);
}
console.log(`  ${widthControlsRun} controls pass, a count incremented by the helpers that run them.\n`);
if (controlResults.some((ok) => !ok)) {
  console.error(
    `\n⚠ A control failed. Not a single file was scanned.\n` +
      `  A detector that cannot be shown to detect is not evidence of anything.`,
  );
  process.exit(2);
}
console.log(`  ${controlsRun} controls pass, a count incremented by the helper that runs them.\n`);


// ---------------------------------------------------------------------------


/**
 * ⚠⚠ **A ROW IS ONLY IN A TABLE IF A HEADER AND ITS SEPARATOR OPENED ONE, AND
 * E-243's FIX CHECKED A SPECIAL CASE INSTEAD OF THAT PROPERTY.**
 *
 * E-243 found `CLAIMS.md` rendering as roughly twenty fragments because 24 blank
 * lines sat inside its tables, and the fix that followed detected exactly that:
 * *a blank line whose next non-blank line is a row*. **The register still
 * rendered 96 rows as loose pipe-delimited text after that fix shipped**, because
 * a table is closed by **any** non-row line, not only by a blank one:
 *
 *   `CLAIMS.md:200-205`  three PROSE paragraphs elaborating E-148 close the
 *                        Established table. Rows E-149…E-243 follow with no
 *                        header — **95 rows**, every one of them the project's
 *                        most recent history.
 *   `CLAIMS.md:374-383`  prose and a `---` thematic break close the Findings
 *                        table, and `F-29` follows it alone — **1 row**.
 *
 * Neither is a blank-line split, so the E-243 detector was silent and the gate
 * reported PASS. ⚠ **This is `CLAIMS.md` E-237's shape — a fix applied to the
 * instance a finding named rather than to the property — landing on the fix for
 * a finding whose own lesson was that shape and continuity are different
 * questions.**
 *
 * ⚠ **The cell check was blind on the same rows, so this is not only a rendering
 * defect.** `scan()` clears its expected column count on any non-row line, so a
 * stray row is never compared against a header at all: on the tree that found
 * this, **224 of `CLAIMS.md`'s 320 body rows were cell-checked and 96 were
 * not**. The gate's original purpose — catching E-148's truncated row — was
 * defeated over the register's whole recent history.
 *
 * ## What this checks
 *
 * Every table row must lie inside a table that a header and separator opened. A
 * run of rows that no header governs is reported once, at its first line, with
 * the line that closed the table.
 *
 * ⚠ **It subsumes the E-243 blank-line check** — that case is a table closed by
 * a blank rather than by prose — and a control below pins it, so the older,
 * narrower property cannot regress unnoticed.
 *
 * ⚠ **Verified against a real markdown parser, not only by reasoning.** On the
 * tree that found this, `marked@18` lexed `CLAIMS.md` into 8 tables holding 224
 * rows and left 96 rows in paragraph tokens; this detector reported the same 96,
 * in the same two runs. The parser is not a dependency of this repository — the
 * cross-check was run once, deliberately, because a lexical gate agreeing with
 * itself proves nothing (`CLAIMS.md` E-165).
 */
function strayRows(file: string, text: string): Problem[] {
  const lines = text.split("\n");
  const out: Problem[] = [];
  let inTable = false;
  let run: { from: number; count: number; cause: string; head: string } | null = null;

  const flush = () => {
    if (!run) return;
    out.push({
      file,
      line: run.from,
      got: run.count,
      want: 0,
      kind: "continuity",
      head: stripCode(run.head).slice(0, 72),
      detail:
        `${run.count} row(s) render OUTSIDE any table — no header governs them. ` +
        `The table was closed by ${run.cause}`,
    });
    run = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // A header followed by its separator OPENS a table. It also ends any stray
    // run: the rows after it are governed again.
    if (isRow(l) && !isSeparator(l) && isSeparator(lines[i + 1] ?? "")) {
      flush();
      // ⚠⚠ **GFM REQUIRES THE HEADER AND ITS DELIMITER TO HAVE THE SAME CELL
      // COUNT. WHEN THEY DIFFER, NOTHING RENDERS AS A TABLE AT ALL** — every
      // line becomes a paragraph. `scan()` takes its width from the SEPARATOR
      // and never looks at the header, and this function opened a table merely
      // because a row preceded a separator, so a mismatch passed BOTH
      // properties (REVIEW-040 H1, found independently by two legs).
      //
      // ⚠ **Third distinct way this gate has certified a file whose rows do not
      // render**: a blank line (E-243), prose and `---` (E-244), and this.
      const hw = cells(l);
      const sw = cells(lines[i + 1] ?? "");
      if (hw !== sw) {
        out.push({
          file, line: i + 1, got: hw, want: sw, kind: "width",
          head: stripCode(l).slice(0, 72),
          detail:
            `header has ${hw} cell(s), its delimiter has ${sw} — GFM renders ` +
            `NO TABLE here, and every row below is prose`,
        });
      }
      inTable = true;
      i++; // consume the separator
      continue;
    }

    if (isRow(l)) {
      if (inTable) continue;
      if (!run) {
        // Name what closed the table, so the repair is obvious from the report.
        let k = i - 1;
        while (k >= 0 && lines[k].trim() === "") k--;
        const closer = k >= 0 ? lines[k].trim() : "the start of the file";
        run = {
          from: i + 1,
          count: 0,
          head: l,
          cause:
            k >= 0 && closer === "---"
              ? "a `---` thematic break"
              : k >= 0
                ? `prose at line ${k + 1}: ${closer.slice(0, 44)}…`
                : "the start of the file",
        };
      }
      run.count++;
      continue;
    }

    // ⚠ A BLANK LINE CLOSES A TABLE — that is E-243's case, and it must keep
    // closing it here or the older property silently regresses. It does NOT
    // flush the run: consecutive stray rows separated by blanks are one defect,
    // reported once.
    if (l.trim() === "") {
      inTable = false;
      continue;
    }

    // Any other line is prose, a heading or a rule. It closes the table and
    // starts a new cause for anything stray that follows.
    inTable = false;
    flush();
  }
  flush();
  return out;
}

const problems: Problem[] = [];
let rowsChecked = 0;
let rowsBody = 0;
let rowsHeaders = 0;

/**
 * How many body rows `scan()` actually COMPARED against a header.
 *
 * ⚠ **The gate used to report every line beginning with a pipe as a row it had
 * checked, and that was a claim about a number it did not count** (`CLAIMS.md`
 * E-141). A stray row is skipped by `scan()` — `want` is null — so it was
 * counted as scanned and never examined. Header rows are skipped for the same
 * reason and are legitimately not body rows.
 */
function cellChecked(text: string): { checked: number; headers: number } {
  const lines = text.split("\n");
  let want: number | null = null;
  let checked = 0;
  let headers = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!isRow(l)) { want = null; continue; }
    if (isSeparator(l)) { want = cells(l); continue; }
    // ⚠ A HEADER is legitimately not governed by a header. Counting it as an
    // unchecked row would inflate the defect number by one per table — a gate
    // claiming something its number does not count (`CLAIMS.md` E-141).
    if (isSeparator(lines[i + 1] ?? "")) { headers++; continue; }
    if (want === null) continue;
    checked++;
  }
  return { checked, headers };
}

for (const file of TARGETS) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`cannot read ${file}: ${e}`);
    console.error("⚠ Run this from the repository root. E-157: a run that opened no files reported clean.");
    process.exit(2);
  }
  rowsBody += text.split("\n").filter((l) => isRow(l) && !isSeparator(l)).length;
  const counted = cellChecked(text);
  rowsChecked += counted.checked;
  rowsHeaders += counted.headers;
  problems.push(...scan(file, text));
  problems.push(...strayRows(file, text));
}

console.log(`Self-tests: ${SELF_TESTS.length} probes pass. Detection verified before use.`);
const ungoverned = rowsBody - rowsChecked - rowsHeaders;
console.log(
  `Scanned ${TARGETS.length} files: ${rowsBody} rows beginning with a pipe = ` +
    `${rowsHeaders} header(s) + ${rowsChecked} CELL-CHECKED body row(s) + ` +
    `${ungoverned} governed by no header.`,
);
// ⚠ Three numbers that sum to the first, because the single number this line
// used to print counted rows it had not examined (`CLAIMS.md` E-141).
console.log(
  ungoverned === 0
    ? "  Every body row is governed by a header.\n"
    : `  ⚠ ${ungoverned} row(s) render outside a table — see below.\n`,
);

if (problems.length === 0) {
  console.log("PASS: every table row has exactly as many cells as its header,");
  console.log("      every row lies INSIDE a table a header opened (E-243, E-244),");
  console.log("      and every header matches its delimiter's width (REVIEW-040 H1).");
  console.log("\n⚠ This is a SHAPE and CONTINUITY check. It says nothing about whether a cell");
  console.log("  is true, whether a grade is deserved, or whether a row belongs in its section.");
  console.log(`⚠ It reads ${TARGETS.length} files, and the repository has many more that`);
  console.log("  carry tables. Two of those are known to hold stray rows and are DISCLOSED");
  console.log("  rather than fixed — see the TARGETS note for the measurement and its date.");
  // ⚠ NO CORPUS COUNT IS PRINTED HERE. A number in a gate's OUTPUT reads as
  // current on every run, and this project has been wrong about a restated
  // count seventeen times (E-236, E-199, E-141). The dated measurement lives in
  // the TARGETS note, where it is legible as an observation rather than a claim.
  process.exit(0);
}

const cellProblems = problems.filter((p) => p.kind === undefined);
const splitProblems = problems.filter((p) => p.kind === "continuity");
const widthProblems = problems.filter((p) => p.kind === "width");
const strayCount = splitProblems.reduce((n, p) => n + p.got, 0);
console.error(
  `FAIL: ${cellProblems.length} malformed row(s); ` +
    `${strayCount} row(s) outside a table, in ${splitProblems.length} run(s); ` +
    `${widthProblems.length} header/delimiter width mismatch(es).\n`,
);
for (const p of widthProblems) {
  console.error(`  ${p.file}:${p.line}  ${p.detail}`);
  console.error(`    header: ${p.head}…`);
}
for (const p of cellProblems) {
  const how = p.got < p.want ? "MISSING a cell" : "an EXTRA cell";
  console.error(`  ${p.file}:${p.line}  ${p.got} cells, header says ${p.want} — ${how}`);
  console.error(`    ${p.head}…`);
}
for (const p of splitProblems) {
  console.error(`  ${p.file}:${p.line}  ${p.detail}`);
  console.error(`    first row: ${p.head}…`);
  console.error(
    "    FIX: re-emit the header and separator after the prose, which is the idiom" +
      "\n         this register already uses (CLAIMS.md:81 and :94) — or move the row" +
      "\n         back inside the table it belongs to.",
  );
}
console.error(
  "\n⚠ A short row renders as a short row, not as an error (E-148). Do not fix one by\n" +
    "  inventing a cell: a missing Grade is a missing judgement, and the honest repair is\n" +
    "  either the grade the row's own evidence already states, or an explicit ungraded marker.",
);
process.exit(1);
```

---

# FILE 2 — tools/build-claims-index.ts (COMPLETE)

```typescript
/**
 * build-claims-index.ts — a navigable index of `CLAIMS.md`, DERIVED.
 *
 * `CLAIMS.md` is 416 KB across 305 rows with a mean row of ~1,400 characters.
 * It is a register, not a document: you cannot read it, you grep it. **The
 * index is the thing that makes it navigable, and the only safe index is a
 * generated one.**
 *
 * ⚠ **DERIVED, NEVER RESTATED — `CLAIMS.md` E-199, E-203, E-236.** This project
 * has sixteen recorded instances of a hand-maintained number or summary going
 * stale, including one that was already false in the commit that corrected it.
 * A hand-written index of 305 rows would be the seventeenth before the week was
 * out. So it is generated, and `--check` fails when it drifts.
 *
 *   bun run tools/build-claims-index.ts            # write docs/CLAIMS-INDEX.md
 *   bun run tools/build-claims-index.ts --check     # fail if stale (the gate)
 *
 * ⚠ **What this does NOT do.** It does not judge a row, check an evidence cell,
 * or verify a grade. It is a table of contents. The register's discipline lives
 * in the rows and in `check-tables`, not here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("..", import.meta.url).pathname;
const SRC = join(REPO, "CLAIMS.md");
const OUT = join(REPO, "docs/CLAIMS-INDEX.md");

/**
 * A row id: E-1, F-24, B-15, P-12, U-54, **R-6** and **E-3a**.
 *
 * ⚠⚠ **THE FIRST VERSION MISSED TWO FORMS AND THE COUNT IS WHAT EXPOSED IT.**
 * It read `[EFBPU]-\d+`, which (a) omitted `R-` entirely, silently dropping the
 * **whole Retracted section**, and (b) truncated the SUFFIXED id `E-3a` to
 * `E-3`, which then looked like a duplicate of the real `E-3` one line above.
 * **A phantom defect in the register, manufactured by the indexer's own regex.**
 *
 * ⚠ **It was caught because the tool PRINTS its counts and they disagreed with
 * the source** — 304 against 305, four sections against five. `CLAIMS.md` E-141:
 * *a gate that reports a number is claiming what the number counts.* **The
 * number is the falsifier; a silent index would have shipped both bugs.**
 */
/**
 * ⚠⚠ **THE SPACE AFTER THE LEADING PIPE IS OPTIONAL IN GFM, AND REQUIRING IT
 * SILENTLY DROPPED ROWS.** `|E-9999| … |` is a real table row — a parser
 * confirms it — and this regex used to demand `"| "`, so such a row appeared in
 * NO index, NO topic view, and no gate objected (REVIEW-040 H2).
 * ⚠ **Completeness quantified over PARSED rows says nothing about a row that is
 * never parsed.**
 */
const ROW = /^ {0,3}\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

interface Entry {
  id: string;
  line: number;
  section: string;
  summary: string;
  grade: string;
}

/**
 * Reduce a claim cell to one scannable line.
 *
 * ⚠ **Markup is stripped, not rendered.** The rows carry heavy `⚠`/`⚠⚠` and
 * bold emphasis that is load-bearing *in the row* and pure noise *in an index*.
 * Truncation is at a word boundary so a summary never ends mid-token.
 */
/**
 * Split a table row into cells on STRUCTURAL pipes.
 *
 * ⚠⚠ **A PIPE IS STRUCTURAL EVEN INSIDE A CODE SPAN — the GFM spec says so
 * explicitly, and two parsers agree.** An earlier version of this function
 * skipped over backtick spans, which made the generators disagree with the
 * renderer in the opposite direction from the bug they were fixing
 * (`REVIEW-041`). **Only `\\|` is content.**
 *
 * ⚠ **The register was the thing that was wrong**, not the splitter: five rows
 * carried unescaped pipes inside code spans and rendered with the wrong Grade.
 * They are escaped now, and `check-table-integrity` counts the same way this
 * does, so a regression fails the gate.
 */
export function splitCells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    // ⚠ An escape covers exactly the next character. `\\` is a literal
    // backslash and does NOT protect a following pipe.
    if (ch === "\\" && i + 1 < line.length) { cur += ch + line[i + 1]; i += 2; continue; }
    if (ch === "|") { out.push(cur); cur = ""; i++; continue; }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
}


/**
 * The CONTENT cells of a row: `splitCells` minus the empties that flank a row
 * written with outer pipes.
 *
 * ⚠⚠ **A trailing pipe is OPTIONAL in GFM, and assuming one shifted the grade by
 * a cell.** `| E-1 | claim | ev | A \|` ends in an ESCAPED pipe — content, not a
 * delimiter — so there is no trailing empty, and `cells[length - 2]` read the
 * EVIDENCE as the grade. `check-table-integrity` correctly passes such a row:
 * it is valid GFM with four cells (REVIEW-041 leg A, defect 2.2).
 */
export function contentCells(line: string): string[] {
  const parts = splitCells(line);
  if (parts.length && parts[0].trim() === "") parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === "") parts.pop();
  return parts;
}

export function summarise(cell: string, max = 120): string {
  const flat = cell
    .replace(/⚠+/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/~~/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // ⚠⚠ **A PIPE IN A HEADLINE BECOMES A CELL BOUNDARY IN THE GENERATED ROW.**
    // Backticks are stripped above, so `` `a|b|c` `` — an ordinary grep
    // alternation in this register — used to emit `a|b|c` and break the very
    // table this index is made of (REVIEW-040 M6). Escape, do not delete: the
    // pipe is content and the reader should see it.
    // ⚠⚠ **NORMALISE, THEN ESCAPE ONCE.** Escaping every `|` turned a source
    // `\|` — already an escape — into `\\|`, which renders as a literal
    // backslash followed by a STRUCTURAL pipe, adding a cell to the generated
    // row (REVIEW-041 leg A, question 5). Unescape first so the count is one.
    .replace(/\\\|/g, "|")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

export function parse(text: string): Entry[] {
  const out: Entry[] = [];
  let section = "(none)";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = l.match(/^## (.+)$/);
    if (h) { section = h[1].replace(/[*`]/g, "").trim(); continue; }
    const m = l.match(ROW);
    if (!m) continue;
    // Cells: leading "" | id | claim | evidence | grade | trailing ""
    const cells = contentCells(l).map((c) => c.trim());
    const claim = cells[1] ?? "";
    const grade = (cells.length >= 3 ? cells[cells.length - 1] : "") ?? "";
    out.push({
      id: m[1],
      line: i + 1,
      section,
      summary: summarise(claim),
      grade: summarise(grade, 22) || "—",
    });
  }
  return out;
}

export function render(entries: Entry[]): string {
  const bySection = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!bySection.has(e.section)) bySection.set(e.section, []);
    bySection.get(e.section)!.push(e);
  }
  const L: string[] = [
    "# CLAIMS index",
    "",
    "⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-index.ts`;",
    "`make check-claims-index` fails if this file drifts from `CLAIMS.md`.",
    "",
    "**Why it exists:** `CLAIMS.md` is a register of hundreds of rows averaging over a",
    "thousand characters each. It is not readable end to end and was never meant to be —",
    "this is how you find a row. **Line numbers link into the file and are regenerated,**",
    "so they do not rot the way a hand-written index would (`CLAIMS.md` E-199, E-236).",
    "",
    "⚠ **A summary is not a claim.** Each line below is a truncated, markup-stripped",
    "excerpt for finding things. **The row is the authority** — never cite the index.",
    "",
    `**${entries.length} rows** across **${bySection.size} sections**, counted where they are parsed.`,
    "",
  ];
  for (const [section, rows] of bySection) {
    L.push(`## ${section} — ${rows.length} rows`, "");
    L.push("| id | summary | grade |", "|---|---|---|");
    for (const e of rows) {
      L.push(`| [${e.id}](../CLAIMS.md#L${e.line}) | ${e.summary} | ${e.grade} |`);
    }
    L.push("");
  }
  return L.join("\n");
}

/**
 * ⚠ **The main body runs ONLY when this file is the entry point.**
 * `build-claims-topics.ts` imports `summarise` from here, and without this guard
 * that import REWRITES `docs/CLAIMS-INDEX.md` as a side effect — and under
 * `--check` would run this gate's own exit path from inside another tool.
 * Measured 2026-09-05, on the first run of the importer.
 */
/**
 * ⚠ **`splitCells` is load-bearing for BOTH generators, so it is probed before
 * either runs.** A splitter that is wrong does not crash — it prints a fragment
 * of prose where a grade belongs, which is exactly how this defect shipped.
 */
function probeSplitter(): void {
  const T: [string, string, number, string][] = [
    // ⚠ Six parts, not four: a leading and a trailing empty flank the cells.
    ["plain row", "| E-1 | claim | evidence | A |", 6, "A"],
    // ⚠⚠ **GFM SPLITS ON A PIPE EVEN INSIDE A CODE SPAN.** These probes assert
    // that, and they used to assert the OPPOSITE — which is how five live rows
    // rendered with the wrong Grade (REVIEW-041). Only `\\|` is content.
    ["a pipe inside a code span IS a delimiter",
      "| E-1 | see `a|b` here | evidence | A |", 7, "A"],
    ["a pipe inside a DOUBLE-backtick span is also a delimiter",
      "| E-1 | see ``a|b`` here | evidence | A |", 7, "A"],
    ["an ESCAPED pipe is content, inside a span or out",
      "| E-1 | see `a\\|b` here | evidence | A |", 6, "A"],
    ["an escaped pipe in plain text is content",
      "| E-1 | a \\| b | evidence | A |", 6, "A"],
    ["an escaped BACKSLASH does not protect the pipe after it",
      "| E-1 | ends \\\\| next | A |", 6, "A"],
  ];

  // ⚠ `contentCells` is what both generators actually read, and a row with no
  // trailing structural pipe has no trailing empty to drop (REVIEW-041 2.2).
  const C: [string, number, string][] = [
    ["| E-1 | claim | ev | A |", 4, "A"],
    ["| E-1 | claim | ev | A \\|", 4, "A \\|"],
  ];
  let bad = 0;
  for (const [name, line, cells, grade] of T) {
    const got = splitCells(line).map((c) => c.trim());
    const gotGrade = got[got.length - 2];
    if (got.length !== cells || gotGrade !== grade) {
      console.error(
        `SPLITTER PROBE FAILED: ${name} — expected ${cells} cells ending "${grade}", ` +
          `got ${got.length} ending "${gotGrade}"`,
      );
      bad++;
    }
  }
  for (const [line, n, grade] of C) {
    const got = contentCells(line).map((c) => c.trim());
    if (got.length !== n || got[got.length - 1] !== grade) {
      console.error(
        `CONTENT-CELL PROBE FAILED: ${JSON.stringify(line)} — expected ${n} cells ` +
          `ending "${grade}", got ${got.length} ending "${got[got.length - 1]}"`,
      );
      bad++;
    }
  }
  // ⚠ `summarise` must escape a pipe EXACTLY once, or a source `\|` becomes
  // `\\|` and adds a cell to the generated row (REVIEW-041 question 5).
  const S: [string, string][] = [
    ["plain a|b pipe", "plain a\\|b pipe"],
    ["already \\| escaped", "already \\| escaped"],
  ];
  for (const [input, want] of S) {
    const got = summarise(input);
    if (got !== want) {
      console.error(`ESCAPE PROBE FAILED: ${JSON.stringify(input)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
      bad++;
    }
  }
  if (bad) {
    console.error(`\n⚠ ${bad} probe(s) failed. Nothing was generated.`);
    process.exit(2);
  }
  console.log(
    `Probes: ${T.length} splitter + ${C.length} content-cell + ${S.length} escape pass. ` +
      `Verified before use.`,
  );
}

function main(): void {
  probeSplitter();
const text = readFileSync(SRC, "utf8");
const entries = parse(text);
if (entries.length === 0) {
  console.log("FAIL: parsed ZERO rows from CLAIMS.md — the index would be empty and say nothing.");
  process.exit(1);
}
const rendered = render(entries);

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch { /* absent */ }
  if (current !== rendered) {
    console.log("FAIL: docs/CLAIMS-INDEX.md is STALE.");
    console.log("      Rebuild it:  bun run tools/build-claims-index.ts");
    process.exit(1);
  }
  console.log(`PASS: the index matches CLAIMS.md — ${entries.length} rows, regenerated and byte-compared.`);
  console.log("⚠ This says the index is CURRENT. It says nothing about whether a row is TRUE.");
} else {
  writeFileSync(OUT, rendered);
  console.log(`wrote docs/CLAIMS-INDEX.md — ${entries.length} rows`);
}
}

if (import.meta.main) main();
```
