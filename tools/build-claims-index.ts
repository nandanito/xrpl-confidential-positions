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
    // ⚠ **A `|` PRECEDED BY A BACKSLASH IS CONTENT — one character of lookback,
    // no escaped-backslash counting.** This used to treat `\\` as escaping the
    // backslash, making the pipe in `\\|` structural; `cmark-gfm` and Pandoc
    // both treat it as escaped (`REVIEW-042`). Validated cell-for-cell against
    // `cmark-gfm 0.29.0.gfm.13` over twelve row shapes.
    if (line[i] === "\\" && line[i + 1] === "|") { cur += "\\|"; i += 2; continue; }
    if (line[i] === "|") { out.push(cur); cur = ""; i++; continue; }
    cur += line[i];
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
    // ⚠ STRIKES ARE KEPT, NOT DELETED (R-9, 2026-10-22). Deleting `~~` turned a
    // struck quotation into an unstruck one: F-9's headline read *"cannot be
    // resolved from public remotes does not resolve"*, and R-9's retracted phrase
    // reached three topic files as an assertion, which `check-disclosure-phrases`
    // caught. A strike in the register is a strike in its excerpt.
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
    // A lone `~`, as in "~44.8 ms", is a GFM strike delimiter too, and paired
    // with a `~~` it swallows the strike. Escape it; `~~` is left alone.
    .replace(/(?<![~\\])~(?!~)/g, "\\~")
    .trim();
  return truncate(tightenStrikes(flat), max);
}

/**
 * Stripping `⚠` and `**` can leave a space just inside a strike delimiter —
 * `~~⚠ **RULED**~~` becomes `~~ RULED~~` — and GFM does not render a `~~`
 * followed by a space as an opener (`REVIEW-062` round two, R2-A4). Pair the
 * delimiters left to right and pull each one against its text; drop a pair left
 * empty.
 */
export function tightenStrikes(text: string): string {
  const parts = text.split("~~");
  if (parts.length < 2) return text;
  let out = parts[0];
  for (let k = 1; k < parts.length; k++) {
    const opening = k % 2 === 1;
    if (opening && k + 1 < parts.length) {
      const inner = parts[k].trim();
      if (inner === "") {
        const left = out.trimEnd(), right = parts[k + 1].trimStart();
        out = left && right ? `${left} ${right}` : left + right;
        k++;
        continue;
      }
      out += "~~" + inner + "~~" + parts[k + 1];
      k++;
    } else {
      // An opener with no partner: the excerpt was cut before the closer, and
      // truncate() closes it. Pull it against its text all the same.
      out += "~~" + (opening ? parts[k].trimStart() : parts[k]);
    }
  }
  return out;
}

function truncate(flat: string, max: number): string {
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const kept = (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd();
  // A cut inside a strike would leave it open and strike the rest of the row.
  const open = (kept.match(/~~/g) ?? []).length % 2 === 1;
  return kept + "…" + (open ? "~~" : "");
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
      // GitHub renders CLAIMS.md as a preview, where #L anchors do not scroll;
      // ?plain=1 opens the source view, where they do (E-360).
      L.push(`| [${e.id}](../CLAIMS.md?plain=1#L${e.line}) | ${e.summary} | ${e.grade} |`);
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
  // ⚠⚠ **EVERY EXPECTATION BELOW WAS VALIDATED CELL-FOR-CELL AGAINST
  // `cmark-gfm 0.29.0.gfm.13`** — GitHub's own reference implementation,
  // installed for `REVIEW-042` because the two parsers used in earlier rounds
  // had already been used. **These are not reasoned; they are measured.**
  const T: [string, string, number, string][] = [
    // ⚠ Six parts, not four: a leading and a trailing empty flank the cells.
    ["plain row", "| E-1 | claim | evidence | A |", 6, "A"],
    // ⚠ GFM splits on a pipe even inside a code span. Only `\\|` is content.
    ["a pipe inside a code span IS a delimiter",
      "| E-1 | see `a|b` here | evidence | A |", 7, "A"],
    ["a pipe inside a DOUBLE-backtick span is also a delimiter",
      "| E-1 | see ``a|b`` here | evidence | A |", 7, "A"],
    ["an ESCAPED pipe inside a span is content",
      "| E-1 | see `a\\|b` here | evidence | A |", 6, "A"],
    ["an escaped pipe in plain text is content",
      "| E-1 | a \\| b | evidence | A |", 6, "A"],
    // ⚠⚠ **A BACKSLASH BEFORE A PIPE ESCAPES IT EVEN IF THE BACKSLASH LOOKS
    // ESCAPED ITSELF.** This probe asserted the OPPOSITE for one round, and
    // cmark-gfm and Pandoc both disagreed with it (REVIEW-042).
    ["a doubled backslash still escapes the pipe after it",
      "| E-1 | ends \\\\| next | A |", 5, "A"],
    ["a pipe in inline HTML is a delimiter",
      "| E-1 | <b>x|y</b> | ev | A |", 7, "A"],
    ["a lone backslash pair is content",
      "| E-1 | a \\\\ b | ev | A |", 6, "A"],
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
    // ⚠ Strikes are kept and must still render (R-9; REVIEW-062 round two R2-A4):
    // stripped markup inside a delimiter, a strike left empty, a lone `~`, and a
    // strike cut by truncation, which must be closed.
    ["~~⚠ **RULED AND NOT IMPLEMENTED**~~ done", "~~RULED AND NOT IMPLEMENTED~~ done"],
    ["a ~~⚠~~ b", "a b"],
    ["~~proving ~44.8 ms~~", "~~proving \\~44.8 ms~~"],
    ["x ~~ " + "word ".repeat(40) + "~~ y", "x ~~" + "word ".repeat(23).trimEnd() + "…~~"],
  ];
  for (const [input, want] of S) {
    const got = summarise(input);
    if (got !== want) {
      console.error(`SUMMARY PROBE FAILED: ${JSON.stringify(input)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
      bad++;
    }
  }
  if (bad) {
    console.error(`\n⚠ ${bad} probe(s) failed. Nothing was generated.`);
    process.exit(2);
  }
  console.log(
    `Probes: ${T.length} splitter + ${C.length} content-cell + ${S.length} summary pass. ` +
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
