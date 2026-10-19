DO NOT USE ANY TOOLS. Everything you need is pasted below. You have no
repository and no internet.

# You are reviewing FIXES, not code

A previous round found defects in three tools. They were fixed. **Your job is to
find what the FIXES got wrong** — not to re-find the original defects.

⚠⚠ **THIS PROJECT'S RECORD SAYS THE FIX ROUND IS WHERE THE DEFECTS ARE.** Its
own register holds nine instances of a gate built to catch false passes that
itself false-passed, and several of a fix report claiming more than the fix
delivered. **Assume that happened again.**

⚠ **Every finding must be a CONCRETE INPUT** — a snippet of markdown or data,
what the code does with it, and what it should do. Do not review style. Do not
summarise the code back to me.

## What round one found, and what each fix claims

**H1.** A markdown header whose cell count differs from its delimiter row makes
GFM render NO TABLE AT ALL. Both of the gate's properties passed such a file.
*Fix claims:* `strayRows` now compares header width to delimiter width and
reports a `width` problem, under four controls.

**H2.** A row written `|E-9999| … |` — no space after the leading pipe — is
valid GFM, but both generators' `ROW` regex required `"| "`, so the row was
absent from every generated file with all gates green.
*Fix claims:* both regexes now accept `/^\|\s*/`.

**M4.** The override redundancy check used `ts.every(...)`, so an override
naming two topics where only one had become rule-covered was not flagged.
*Fix claims:* now per member, and it caught three real cases on first run.

**M5.** `headline()` took the first bold run non-greedily, so a row opening
`**When set**, …` yielded the headline `"When set"`.
*Fix claims:* a bold lead shorter than 40 characters is now ignored in favour of
the surrounding text.

**M6.** `summarise()` stripped backticks but kept pipes, so a headline
containing `` `a|b|c` `` emitted structural pipes into a generated table row.
*Fix claims:* pipes are now escaped as `\|`.

**L1/L2/L3.** `isSeparator` demanded two hyphens (GFM needs one); `stripCode`
handled only single-backtick spans; `stripCode` turned `\\|` into `\`, eating a
real delimiter.
*Fix claims:* all three corrected.

**NEW, found while verifying M6.** Both generators split rows with
`line.split("|")`, which is wrong for any row with a pipe inside a code span:
the claim cell is cut at the pipe and the wrong cell is read as the grade. Seven
live rows were affected; two printed prose where a grade belongs.
*Fix claims:* a shared `splitCells()` walks backtick runs and escapes, is used
by both generators, and is probed on six shapes before either runs.

## The questions

1. ⚠ **Does each fix actually establish the property it claims, or only defeat
   the specific input round one used?** For each, construct an input in the same
   class that still gets through.
2. ⚠ **`splitCells` is new and load-bearing for both generators.** Break it.
   Backtick runs, unterminated spans, escapes at end of line, escaped backticks,
   nested or adjacent spans — find where its cell boundaries disagree with GFM.
3. **`headline()`'s 40-character threshold is a magic number.** Find a real-shaped
   claim it now gets wrong that it got right before, and vice versa.
4. **The `width` check.** Can a header/delimiter mismatch still slip through?
   Can it now FALSE-FAIL on a legitimate table?
5. **`summarise()` escapes pipes.** Is escaping correct in every position — and
   does anything else it emits still break a table cell?
6. **Do the controls prove what they say?** For each, name what it does NOT
   cover. ⚠ A control that replays round one's exact input proves only that the
   last attack is caught.
7. ⚠ **Anything the fix comments or output CLAIM that the code does not do.**
   Quote the sentence and the code.

⚠ **If a fix is sound, say so.** A round that returns only defects is not more
rigorous, it is less honest. And **do not report a defect you have not traced
through the pasted code** — a leg in a previous round graded a HIGH defect that
did not exist.

---

# FILE 1 — tools/check-table-integrity.ts (COMPLETE, POST-FIX)

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
 * ## ⚠ The false positive this has to avoid, and how
 *
 * `CLAIMS.md` is full of inline code spans containing pipes — grep alternations
 * like `` `random|RAND|deterministic` `` are ordinary in this register. A naive
 * `count('|')` flags every one of them and the gate becomes noise that gets
 * switched off. **Code spans are stripped before any cell is counted**, and
 * `SELF_TESTS` pins that: a probe row whose only extra pipes are inside
 * backticks must NOT be reported.
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
  return (
    line
      // ⚠ An ESCAPED BACKSLASH is content and the pipe after it is STRUCTURE.
      // `\\|` used to lose its delimiter, because `/\\\|/` matched the second
      // backslash and the pipe (REVIEW-040 L3). Park `\\` first.
      .replace(/\\\\/g, "\u0000")
      .replace(/\\\|/g, "")
      .replace(/\u0000/g, "\\")
      // ⚠ A code span may be fenced by RUNS of backticks — ``a|b`` is one span
      // holding a literal pipe. Matching only single backticks left the pipe
      // structural and miscounted the row (REVIEW-040 L2).
      .replace(/(`+)[\s\S]*?\1/g, "`")
  );
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
    // ⚠ The false positive that would make this gate useless in THIS register.
    name: "pipes inside a code span are content, not cells",
    body: "| # | Claim | Evidence | Grade |\n|---|---|---|---|\n| F-1 | a `x|y|z` | b | c |\n",
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
  stripControl("a DOUBLE-backtick span keeps its pipe as content (L2)",
    "| X-1 | grep ``a|b`` here | ev | A |", 4),
  stripControl("a single-backtick span keeps its pipes as content",
    "| X-1 | `a|b|c` | ev | A |", 4),
  stripControl("an ESCAPED BACKSLASH does not eat the next delimiter (L3)",
    "| X-1 | ends with \\\\| next | A |", 4),
  stripControl("a genuinely escaped pipe is content, not a cell",
    "| X-1 | a \\| b | c | d |", 4),
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

# FILE 2 — tools/build-claims-index.ts (COMPLETE, POST-FIX)

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
const ROW = /^\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

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
 * Split a table row into cells, splitting ONLY on structural pipes.
 *
 * ⚠⚠ **BOTH GENERATORS USED `line.split("|")`, AND SEVEN LIVE ROWS PAY FOR IT.**
 * A pipe inside a code span — `` `grep -E 'a|b|c'` ``, ordinary in this register
 * — is CONTENT, and a naive split cuts the claim cell at it and then reads the
 * wrong cell as the grade. Measured on the tree that found this: seven rows
 * disagree with their true cell count, and **`E-48` and `B-21` had a fragment of
 * prose printed where their grade belongs** (REVIEW-040 round two).
 *
 * ⚠ `check-table-integrity` got this right — it strips code spans before
 * counting — so the gate was correct while the two tools reading the same rows
 * were not. **Agreeing with the gate is the property; this is the shared
 * instrument that makes it true.**
 *
 * Returns cell CONTENT unchanged: code spans and escapes are preserved, because
 * the caller renders them.
 */
export function splitCells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "\\" && i + 1 < line.length) {       // an escape covers the next char
      cur += ch + line[i + 1];
      i += 2;
      continue;
    }
    if (ch === "`") {                              // a code span fenced by a RUN
      let n = 0;
      while (line[i + n] === "`") n++;
      const fence = "`".repeat(n);
      const end = line.indexOf(fence, i + n);
      if (end !== -1) {
        cur += line.slice(i, end + n);
        i = end + n;
        continue;
      }
      cur += line.slice(i, i + n);                 // unterminated: treat as text
      i += n;
      continue;
    }
    if (ch === "|") { out.push(cur); cur = ""; i++; continue; }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
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
    const cells = splitCells(l).map((c) => c.trim());
    const claim = cells[2] ?? "";
    const grade = (cells.length >= 5 ? cells[cells.length - 2] : "") ?? "";
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
    ["pipe inside a single-backtick span",
      "| E-1 | see `a|b|c` here | evidence | A, executed |", 6, "A, executed"],
    ["pipe inside a DOUBLE-backtick span",
      "| E-1 | see ``a|b`` here | evidence | A |", 6, "A"],
    ["escaped pipe is content",
      "| E-1 | a \\| b | evidence | A |", 6, "A"],
    ["escaped BACKSLASH does not swallow the delimiter",
      "| E-1 | ends \\\\| next | A |", 6, "A"],
    ["two spans in one cell",
      "| E-1 | `a|b` and `c|d` | ev | A |", 6, "A"],
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
  if (bad) {
    console.error(`\n⚠ ${bad} splitter probe(s) failed. Nothing was generated.`);
    process.exit(2);
  }
  console.log(`Splitter probes: ${T.length} pass. Cell boundaries verified before use.`);
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

---

# FILE 3 — tools/build-claims-topics.ts (COMPLETE, POST-FIX)

```typescript
/**
 * build-claims-topics.ts — topic views of `CLAIMS.md`, DERIVED.
 *
 *   bun run tools/build-claims-topics.ts            # write docs/claims/by-topic/
 *   bun run tools/build-claims-topics.ts --check    # fail if stale (the gate)
 *
 * ## Why this exists, and why it is not a split
 *
 * `docs/CLAIMS-INDEX.md` answers *"where is E-181?"*. It does not answer *"what
 * has this project learned about gates?"* — for that you need the register
 * grouped by subject, and the register is chronological.
 *
 * ⚠⚠ **THE ROWS ARE NOT MOVED, AND THAT IS A MEASURED DECISION, NOT TIMIDITY.**
 * Classifying every `Established` row against nine candidate topics found that
 * **only ~20% belong to exactly one**; 93 of 245 matched four or more. E-203 is
 * a gate that false-passed *and* a miscount *and* a review finding *and* a
 * lesson about stripping string literals. **A physical split files such a row
 * under one topic and hides it from readers of the other three.** A generated
 * view lists it under all of them.
 *
 * Three further properties a move would cost, all measured on the register:
 *
 *   - **63% of rows cite another row**, 476 cross-references in total. Moving
 *     rows scatters those across files.
 *   - **Chronology is load-bearing.** *"Seventh instance of a wrong count"* is
 *     only legible because the register is append-only and in order.
 *   - Every gate that opens `CLAIMS.md` by path would need updating and
 *     **re-verifying by breaking it**. None needs to change here.
 *
 * ## How a row gets its topics
 *
 * A **lexical rule over the row's HEADLINE** — the leading bold run of the claim
 * cell — plus an explicit `OVERRIDES` list for rows the rules do not reach.
 *
 * ⚠ **The headline, not the whole row, and that is the instrument.** Matching
 * the full row put 80% of rows in 4+ topics, because an evidence cell mentions
 * everything: the gate, the review, the Devnet run and the secret. The headline
 * states what the row is *about*.
 *
 * ⚠⚠ **What this does NOT say.** A topic is a finding aid, not a judgement. It
 * does not say a row is true, that its grade is deserved, or that the topic set
 * is the right one. It is **LEXICAL, over a NAMED SET of patterns**, and a row
 * whose headline uses different vocabulary lands only where `OVERRIDES` puts it.
 * **The row is the authority — never cite a topic file.**
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { summarise, splitCells } from "./build-claims-index.ts";

const REPO = new URL("..", import.meta.url).pathname;
const SRC = join(REPO, "CLAIMS.md");
const OUTDIR = join(REPO, "docs/claims/by-topic");

/**
 * Same id shapes the index parses — `E-3a` and `R-6` included.
 *
 * ⚠⚠ **The space after the leading pipe is OPTIONAL in GFM.** Requiring it made
 * `|E-9999| … |` — a valid row — invisible to this generator AND to the index,
 * with every gate green (REVIEW-040 H2).
 */
const ROW = /^\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

interface Topic { slug: string; title: string; blurb: string; pattern: RegExp }

/**
 * ⚠ Order is display order only. Every rule is tested against every row; a row
 * belongs to as many topics as match it.
 */
const TOPICS: Topic[] = [
  { slug: "protocol-and-crypto", title: "Protocol and cryptography",
    blurb: "What XLS-0096 and the libraries actually do — field codes, sizes, proofs, encryption, the confidential balance model.",
    pattern: /nonce|ElGamal|sigma|Bulletproof|ed25519|secp256k1|keygen|proof|XLS-|MPT|amendment|homomorphic|transaction type|ZKProof|payload|confidential|encrypt|decrypt|clawback|issuer|balance|\bfield\b|byte|auditor|domain/i },
  { slug: "instruments-and-gates", title: "Instruments and gates",
    blurb: "Gates, tests and detectors — including the many that reported PASS while the thing they checked was broken.",
    pattern: /\bgate\b|gates|false[- ]pass|falsifier|\bcontrol\b|detector|revert|check-|\btest(s)? (that|which|was|were|named)|harness|sweep|flaky|suite/i },
  { slug: "review-rounds", title: "Review rounds and adjudication",
    blurb: "What adversarial rounds found, what legs got wrong, and what the two-round rule has cost and bought.",
    pattern: /\bleg(s)?\b|REVIEW-|round (one|two|three|four)|adjudicat|packet|reviewer|rotation|independent|adversarial/i },
  { slug: "claims-and-drift", title: "Claims, prose and drift",
    blurb: "Sentences that outran their evidence: stale notes, false disclosures, retracted claims and the documents that carried them.",
    pattern: /stale|false (sentence|claim|premise|disclosure|security)|overstat|retract|prose|disclosure|CLAUDE\.md|CLAIMS\.md|register|README|documentation|docs (say|claim)|walkthrough|comment|sentence|describ|legib|readab/i },
  { slug: "secret-handling", title: "Secret handling",
    blurb: "Keys, seeds and scalars — what wipes, what does not, and the residuals named rather than closed.",
    pattern: /zeroiz|wipe[ds]?|unwiped|secret|scalar|seed|entropy|\bCopy\b|\bdrop\b|custody|credential/i },
  { slug: "devnet-execution", title: "Devnet execution",
    blurb: "What was actually submitted and validated on standard Devnet, and what a `tesSUCCESS` does and does not establish.",
    pattern: /Devnet|validated|tesSUCCESS|receipt|executed|transaction hash|ledger|submit|node|mainnet/i },
  { slug: "counts-and-numbers", title: "Counts and numbers",
    blurb: "The project's most persistent failure mode: a number restated instead of derived.",
    pattern: /\bcount(s|ed|ing)?\b|miscount|restated|arithmetic|\bnumber\b|instance/i },
  { slug: "upstream-and-filings", title: "Upstream, libraries and filings",
    blurb: "rippled, mpt-crypto and the published packages — findings raised upstream and the build friction behind them.",
    pattern: /upstream|rippled|filing|issue #|mpt-crypto|XRPL-Standards|npm|library|vendor|conan|WASM|FFI|package/i },
  { slug: "confidentiality-limits", title: "Confidentiality limits",
    blurb: "What this system does not hide: the counterparty graph, timing, and every claim the register forbids.",
    pattern: /quantum|trustless|non-custodial|compliant|private from|hide|hidden|observer|public|anonym|counterparty|privacy|original research/i },
  { slug: "environment-and-tooling", title: "Environment and tooling",
    blurb: "The build environment, the ephemeral `/tmp/wconf` tree, and the session mechanics that have cost real work.",
    pattern: /rebuild-env|\/tmp\/wconf|state\.json|environment|bun build|type-check|typecheck|toolchain|cargo|manifest|feature/i },
  { slug: "decisions-and-scope", title: "Decisions, rulings and scope",
    blurb: "ADRs, decision requests and rulings — what was decided, what was reopened, and what a coding session may not choose.",
    pattern: /ADR-|decision|ruling|ruled|B-\d|scope|blocker|option [123AB]|superseded|reversal/i },
  { slug: "web-tier", title: "Web tier",
    blurb: "Architecture §6 step 8: the read-only Elysia/TanStack tier, its gate, and the boundary it does and does not move.",
    pattern: /web tier|web\/api|web\/app|ADR-0003|Elysia|TanStack|socket|browser|loopback|HTTP/i },
];

/**
 * Rows whose headline the rules do not reach, with the reason each is here.
 *
 * ⚠ **An override is a hand judgement and it can rot.** The generator FAILS if
 * an override names an id the register does not contain, or a topic slug that
 * does not exist — so a deleted row or a renamed topic is caught at the next
 * run rather than becoming a quietly wrong line in a published file.
 */
const OVERRIDES: Record<string, string[]> = {
  // ⚠ ONE ENTRY PER LINE, DELIBERATELY. These were packed several to a line
  // until 2026-09-05, when deleting a redundant entry pulled the next two up
  // onto a `//` comment and silently commented them out — caught only because
  // the completeness check then reported E-87 and E-90 as carrying no topic.
  // A mechanical edit to a packed line is a semantic change waiting to happen.

  // Bookkeeping rows whose headline is a pointer, not a statement.
  "E-76": ["decisions-and-scope"],

  // Process findings whose headline names no instrument by keyword.
  "E-87": ["review-rounds", "instruments-and-gates"],
  "E-90": ["review-rounds"],
  "E-93": ["review-rounds", "instruments-and-gates"],
  "E-95": ["review-rounds"],
  "E-96": ["review-rounds"],
  "E-111": ["review-rounds"],
  "E-113": ["instruments-and-gates"],
  "E-139": ["claims-and-drift"],
  "E-162": ["instruments-and-gates"],
  "E-172": ["claims-and-drift"],
  "E-185": ["claims-and-drift"],
  "E-197": ["instruments-and-gates"],
  "E-214": ["instruments-and-gates"],
  "E-97": ["environment-and-tooling"],

  // ⚠ E-17 and E-45 USED to be here and are not any more. E-17's headline was
  // "When set" until `headline()` stopped trusting a short bold lead
  // (REVIEW-040 M5); the rules reach both now, and the per-member redundancy
  // check FAILS if either is re-added.

  // Early protocol facts stated as bare measurements.
  "E-3a": ["protocol-and-crypto"],
  "E-56": ["upstream-and-filings"],

  // Prohibitions and retractions the rules miss.
  "P-7": ["claims-and-drift"],
  "R-1": ["confidentiality-limits"],
  "R-5": ["confidentiality-limits"],

  // Standing gaps.
  "B-13": ["upstream-and-filings"],
  "B-17": ["protocol-and-crypto"],
  "B-18": ["decisions-and-scope"],
  "B-20": ["secret-handling"],
};

interface Entry { id: string; line: number; section: string; headline: string; grade: string; topics: string[] }

/**
 * The row's headline: the leading bold run of the claim cell, else its opening.
 *
 * ⚠ This is what the rules see. A row whose claim opens with unbolded prose
 * falls back to its first 200 characters, which is why `OVERRIDES` exists.
 */
/** A bold lead shorter than this says nothing on its own — see below. */
const MIN_HEADLINE = 40;

/**
 * The row's headline: the leading bold run of the claim cell, else its opening.
 *
 * ⚠⚠ **A NON-GREEDY FIRST BOLD RUN CAN THROW THE ROW AWAY.** `E-17` opens
 * `**When set**, \`sfDomainID\` on the \`MPTokenIssuance\` gates confidential
 * transfers…`, so this returned **`"When set"`** — nine characters carrying no
 * subject. It matched no topic, and the first repair was an `OVERRIDES` entry,
 * which asserts *the patterns do not reach this row* when the truth was *the
 * extractor discarded the row* (REVIEW-040 M5).
 *
 * A bold lead shorter than `MIN_HEADLINE` is treated as an opening clause
 * rather than a headline, and the surrounding text is taken instead.
 */
export function headline(claim: string): string {
  const flat = claim.replace(/⚠+/g, "").replace(/\s+/g, " ").trim();
  const bold = flat.match(/^\*\*(.+?)\*\*/);
  if (bold && bold[1].length >= MIN_HEADLINE) return bold[1];
  // Strip emphasis markers so a short lead and its continuation read as one.
  return flat.replace(/\*\*/g, "").slice(0, 200);
}

export function byRules(head: string): string[] {
  return TOPICS.filter((t) => t.pattern.test(head)).map((t) => t.slug);
}

export function classify(id: string, head: string): string[] {
  const hits = byRules(head);
  for (const extra of OVERRIDES[id] ?? []) if (!hits.includes(extra)) hits.push(extra);
  return hits;
}

export function parse(text: string): Entry[] {
  const out: Entry[] = [];
  let section = "(none)";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^## (.+)$/);
    if (h) { section = h[1].replace(/[*`]/g, "").trim(); continue; }
    const m = lines[i].match(ROW);
    if (!m) continue;
    // ⚠ The SHARED splitter, not `split("|")` — a pipe inside a code span is
    // content, and splitting on it truncates the claim and misreads the grade
    // (REVIEW-040 round two).
    const cells = splitCells(lines[i]).map((c) => c.trim());
    const claim = cells[2] ?? "";
    const head = headline(claim);
    out.push({
      id: m[1], line: i + 1, section, headline: head,
      grade: summarise(cells.length >= 5 ? (cells[cells.length - 2] ?? "") : "", 22) || "—",
      topics: classify(m[1], head),
    });
  }
  return out;
}

function renderTopic(t: Topic, rows: Entry[]): string {
  const L = [
    `# ${t.title}`,
    "",
    "⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;",
    "`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.",
    "",
    t.blurb,
    "",
    "⚠ **A row may appear under several topics, and that is deliberate** — filing each",
    "row under exactly one would hide it from readers of the others. **The row in",
    "[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**",
    "",
    "⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the",
    "row's opening headline. **A point discussed only inside a row's evidence prose is",
    "invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *\"everything",
    "about secrets\"* and said they would fall back to grep. **They were right to.** For an",
    "exhaustive sweep, search `CLAIMS.md` directly.",
    "",
    `**${rows.length} rows.**`,
    "",
    "| id | section | headline | grade |",
    "|---|---|---|---|",
  ];
  for (const e of rows) {
    L.push(`| [${e.id}](../../../CLAIMS.md#L${e.line}) | ${shortSection(e.section)} | ${summarise(e.headline, 150)} | ${e.grade} |`);
  }
  L.push("");
  return L.join("\n");
}

function shortSection(s: string): string {
  return s.split("—")[0].trim().replace("Standing prohibitions", "Prohibitions")
    .replace("Findings", "Findings").replace("Pending", "Pending") || "—";
}

function renderReadme(entries: Entry[], byTopic: Map<string, Entry[]>): string {
  const L = [
    "# CLAIMS by topic",
    "",
    "⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;",
    "`make check-claims-topics` fails if these files drift from `CLAIMS.md`.",
    "",
    "[`CLAIMS.md`](../../../CLAIMS.md) is chronological and append-only. **These are views of",
    "it grouped by subject** — the rows are not moved, and a row appears under every topic",
    "it belongs to. [`docs/CLAIMS-INDEX.md`](../../CLAIMS-INDEX.md) answers *where is E-181*;",
    "these answer *what has this project learned about X*.",
    "",
    `**${entries.length} rows across ${byTopic.size} topics**, counted where they are parsed.`,
    "⚠ The topic counts below sum to more than the row count, because a row can carry",
    "several topics. That is the point of a view rather than a split.",
    "",
    "| topic | rows | what is in it |",
    "|---|---|---|",
  ];
  for (const t of TOPICS) {
    const rows = byTopic.get(t.slug) ?? [];
    L.push(`| [${t.title}](${t.slug}.md) | ${rows.length} | ${t.blurb} |`);
  }
  L.push("", "⚠ **A topic is a finding aid, not a judgement.** It says nothing about whether a",
    "row is true or its grade deserved. Assignment is **LEXICAL, over a NAMED SET** of",
    "patterns matched against each row's headline, plus an explicit override list in",
    "`tools/build-claims-topics.ts` for the rows the patterns do not reach.",
    "",
    "⚠⚠ **WHAT THESE VIEWS DO NOT DO** (`REVIEW-040`):",
    "",
    "- **They index HEADLINES, not row bodies.** A point made only inside a row's evidence",
    "  prose is invisible to every file here. **Grep `CLAIMS.md` for an exhaustive sweep.**",
    `- **\`protocol-and-crypto\` holds ${(byTopic.get("protocol-and-crypto") ?? []).length} of ${entries.length} rows.** A filter returning that share of the`,
    "  corpus has not narrowed much. It is disclosed rather than re-cut, because re-cutting",
    "  the taxonomy would invalidate the measurements this round was reviewed against.",
    "- **A row's topics are as good as its headline.** A row whose headline uses different",
    "  vocabulary lands only where the override list puts it.", "");
  return L.join("\n");
}

const text = readFileSync(SRC, "utf8");
const entries = parse(text);
if (entries.length === 0) {
  console.log("FAIL: parsed ZERO rows from CLAIMS.md — the topic views would be empty.");
  process.exit(1);
}

// --- completeness and staleness, before anything is written ----------------
const ids = new Set(entries.map((e) => e.id));
const slugs = new Set(TOPICS.map((t) => t.slug));
const problems: string[] = [];
for (const [id, ts] of Object.entries(OVERRIDES)) {
  if (!ids.has(id)) problems.push(`OVERRIDES names ${id}, which CLAIMS.md does not contain`);
  for (const t of ts) if (!slugs.has(t)) problems.push(`OVERRIDES[${id}] names unknown topic "${t}"`);
}
/**
 * ⚠⚠ **A REDUNDANT OVERRIDE IS A FALSE STATEMENT ABOUT THE RULES, AND ELEVEN OF
 * THE FIRST THIRTY-SEVEN BECAME ONE WITHIN AN HOUR.** Each entry asserts *the
 * patterns do not reach this row*. Widening a pattern can make that untrue, and
 * nothing would say so — the file would keep a hand-maintained list that no
 * longer does anything, which is the rot this project has recorded seventeen
 * times. **Deleting the line is the whole fix.**
 */
for (const [id, ts] of Object.entries(OVERRIDES)) {
  const e = entries.find((x) => x.id === id);
  if (!e) continue; // already reported above as naming a row that does not exist
  const rules = new Set(byRules(e.headline));
  if (ts.length === 0) {
    problems.push(`OVERRIDES[${id}] is EMPTY — it adds nothing. Delete the line.`);
    continue;
  }
  // ⚠⚠ **PER MEMBER, NOT PER ENTRY.** This used `ts.every(...)`, so an override
  // was flagged only when EVERY topic it named had become rule-covered. A
  // partially redundant entry — `E-111` naming `decisions-and-scope`, which its
  // "ADR-0002's second round…" headline already matches — sat undetected on the
  // clean tree (REVIEW-040 M4, mechanism from leg A, live instance from leg B).
  const dead = ts.filter((t) => rules.has(t));
  if (dead.length) {
    problems.push(
      `OVERRIDES[${id}] names ${dead.length} topic(s) the patterns ALREADY give it: ` +
        `${dead.join(", ")}. Remove ${dead.length === ts.length ? "the line" : "those entries"}.`,
    );
  }
}

const orphans = entries.filter((e) => e.topics.length === 0);
for (const o of orphans) problems.push(`${o.id} matches no topic — add a pattern or an OVERRIDES entry: ${o.headline.slice(0, 60)}`);
if (problems.length) {
  console.log(`FAIL: ${problems.length} problem(s) — every row must carry at least one topic.`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}

const byTopic = new Map<string, Entry[]>();
for (const t of TOPICS) byTopic.set(t.slug, []);
for (const e of entries) for (const t of e.topics) byTopic.get(t)!.push(e);

const files = new Map<string, string>();
files.set("README.md", renderReadme(entries, byTopic));
for (const t of TOPICS) files.set(`${t.slug}.md`, renderTopic(t, byTopic.get(t.slug)!));

if (process.argv.includes("--check")) {
  let stale: string[] = [];
  let present: string[] = [];
  try { present = readdirSync(OUTDIR).filter((f) => f.endsWith(".md")); } catch { /* absent */ }
  for (const [name, body] of files) {
    let cur = "";
    try { cur = readFileSync(join(OUTDIR, name), "utf8"); } catch { /* absent */ }
    if (cur !== body) stale.push(name);
  }
  // ⚠ A file left behind by a REMOVED topic is drift too, and byte-comparing
  // only the files we generate would never see it.
  for (const f of present) if (!files.has(f)) stale.push(`${f} (orphaned — no topic generates it)`);
  if (stale.length) {
    console.log(`FAIL: ${stale.length} topic file(s) STALE or orphaned: ${stale.join(", ")}`);
    console.log("      Rebuild them:  bun run tools/build-claims-topics.ts");
    process.exit(1);
  }
  console.log(`PASS: ${files.size} topic files match CLAIMS.md — ${entries.length} rows, every row carrying`);
  console.log(`      at least one of ${TOPICS.length} topics, regenerated and byte-compared.`);
  console.log("⚠ LEXICAL, over a NAMED SET of headline patterns plus an override list. It says");
  console.log("  the views are CURRENT — nothing about whether a row is true or well filed.");
} else {
  mkdirSync(OUTDIR, { recursive: true });
  for (const [name, body] of files) writeFileSync(join(OUTDIR, name), body);
  console.log(`wrote ${files.size} files to docs/claims/by-topic/ — ${entries.length} rows`);
  for (const t of TOPICS) console.log(`  ${String(byTopic.get(t.slug)!.length).padStart(4)}  ${t.slug}`);
}
```
