/**
 * check-emphasis.ts — the gate for `docs/EMPHASIS-DISCIPLINE.md`.
 *
 * The discipline was specified 2026-09-09 and was **not enforced**: six rules
 * in a document, which is the shape this project has recorded failing over and
 * over (`CLAIMS.md` E-172, E-224 — *advice is what kept failing*). This is the
 * falsifier.
 *
 *   make check-emphasis
 *
 * ⚠⚠ **ENFORCED FORWARD, FROM A CUTOFF ROW ID, AND THE CUTOFF IS PRINTED.**
 * History is left exactly as written. That is not laziness: this register keeps
 * retracted claims rather than rewriting them, and **the drift is the
 * evidence** — reformatting 955 historical marks would destroy the measurement
 * that produced the rule. The grandfathered violations are COUNTED and printed
 * for that reason, so the drift stays visible without being edited.
 *
 * ⚠ **The row part REFUSES to pass vacuously.** If the cutoff sits above every
 * row in the register, zero rows are enforced and the check says nothing — so
 * it FAILS instead. Moving the cutoff forward cannot be a way to switch the
 * gate off (`CLAIMS.md` E-142, E-190).
 *
 * ⚠ **What it does NOT do** is printed in full at the end of every run, by
 * `what_this_does_not_say()`, because a residual named in a docstring nobody
 * runs is a citation to a disclosure that does not exist (`CLAIMS.md` E-203).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO = new URL("..", import.meta.url).pathname;

/**
 * ⚠⚠ **THE CUTOFF. Rows at or after these ids are ENFORCED; earlier rows are
 * grandfathered.** Set 2026-09-09 to one past the highest id then present in
 * each section — P-12, E-248, B-26, F-29, R-6 — so that the first rows written
 * under the discipline are the first rows it governs.
 *
 * ⚠ **A prefix absent from this map FAILS the gate rather than being skipped.**
 * A new section is a new cohort, and silently exempting it is how a gate stops
 * covering the thing it was built for.
 */
const CUTOFF: Record<string, number> = { P: 13, E: 249, B: 27, F: 30, R: 7 };

const MAX_DOUBLE = 1;      // rule 1
const MAX_WARN = 3;        // rule 3, ⚠⚠ counting as two
const MAX_BOLD_RATIO = 0.20; // rule 5
const MAX_PARA = 800;      // rule 6

/** A register row id, the same shape `build-claims-index.ts` parses. */
const ROW = /^ {0,3}\|\s*(?:\*\*)?([A-Z]+-\d+[a-z]?)(?:\*\*)?\s*\|/;

// ---------------------------------------------------------------------------
// The detectors. Every control below calls these same functions; nothing in
// this file re-implements a check for its own controls (`CLAIMS.md` E-182).
// ---------------------------------------------------------------------------

/**
 * Blank the CONTENTS of every code span, preserving length and the backticks.
 *
 * ⚠ **A `⚠` inside backticks is a MENTION of the character, not a mark**, and a
 * `**` inside backticks is two asterisks, not bold. Both consumers here want
 * the same thing, so one masker serves both — ⚠ **unlike `CLAIMS.md` E-203,
 * where one stripper fed two consumers with opposite polarity.** Stated because
 * that is the trap, and the reason it does not apply is worth writing down
 * rather than rediscovering.
 *
 * ⚠⚠ **ITS FIRST FORM WAS A FALSE-PASS PATH AND `REVIEW-043` MEASURED IT.** It
 * took any backtick as a delimiter and closed the span with `indexOf`, so two
 * shapes GFM renders as VISIBLE PROSE were blanked and their marks never
 * counted: a backslash-escaped backtick (`` \` ``), and an opening run closed
 * by a run of a DIFFERENT length. A governed row written either way carried two
 * `⚠⚠` and unlimited bold and the gate reported `warns=0, bold=0.0%`. **Both
 * confirmed against `cmark-gfm 0.29.0.gfm.13` before the fix and after it.**
 *
 * What it implements now, which is CommonMark's rule and GFM's:
 *
 *   - outside a span, a backslash before ASCII punctuation escapes it, so
 *     `` \` `` is a literal backtick and opens nothing;
 *   - a run of *n* backticks is closed only by a run of **exactly** *n*;
 *   - an unclosed run is literal text, not the start of a span.
 *
 * ⚠ **Backslash escapes do NOT work inside a code span** (CommonMark), so the
 * escape rule is applied outside spans only. A control pins each clause.
 *
 * Length is preserved so that character offsets, and therefore rule 4's
 * position test and rule 5's denominator, are unchanged.
 */
/**
 * ⚠⚠ **A CODE SPAN CANNOT CROSS A TABLE-CELL BOUNDARY, AND PAIRING ACROSS ONE
 * WAS A LIVE FALSE-PASS PATH** (`REVIEW-044`, leg A). GFM splits a row into
 * cells **before** it parses inline code, so a lone backtick in the claim cell
 * and a lone backtick in the evidence cell are two literal backticks — and a
 * whole-line scanner pairs them and blanks everything between. **Measured: a
 * governed row carrying four visible `⚠⚠` and 49 visibly bold characters
 * reported `doubles=0, warns=0, bold=0.0%` and passed rules 1, 3 and 5.**
 *
 * ⚠ Latent rather than live at the time it was found: exactly **one** row in
 * the register has an odd number of backticks in a cell, and **zero** marks
 * were being hidden. The path was open; nothing had walked it.
 *
 * So the masking runs **per cell**, on the same unescaped-pipe split
 * `build-claims-index.ts::splitCells` uses, and the pipes are put back so
 * length and offsets are unchanged.
 */
export function maskCodeSpans(line: string): string {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\\" && line[i + 1] === "|") { cur += "\\|"; i += 2; continue; }
    if (line[i] === "|") { out.push(cur); cur = ""; i++; continue; }
    cur += line[i];
    i++;
  }
  out.push(cur);
  return out.map(maskSpansInCell).join("|");
}

/** The scanner itself, over ONE cell. See `maskCodeSpans` for why. */
export function maskSpansInCell(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    // Outside a span: an escaped character is content, never a delimiter.
    if (line[i] === "\\" && i + 1 < line.length && /[!-\/:-@\[-`{-~]/.test(line[i + 1])) {
      out += line[i] + line[i + 1];
      i += 2;
      continue;
    }
    if (line[i] !== "`") { out += line[i]; i++; continue; }

    let n = 0;
    while (line[i + n] === "`") n++;

    // A closing run of EXACTLY n backticks. Escapes are inert inside a span.
    let close = -1;
    let j = i + n;
    while (j < line.length) {
      if (line[j] !== "`") { j++; continue; }
      let m = 0;
      while (line[j + m] === "`") m++;
      if (m === n) { close = j; break; }
      j += m;
    }

    if (close === -1) {
      // ⚠ An unclosed run is literal text. Emitting it verbatim is what keeps a
      // stray backtick from blanking the rest of the row.
      out += "`".repeat(n);
      i += n;
      continue;
    }
    out += "`".repeat(n) + "x".repeat(close - (i + n)) + "`".repeat(n);
    i = close + n;
  }
  return out;
}

/**
 * Characters a reader sees as bold. Markers themselves are not counted.
 *
 * ⚠⚠ **`**` WAS THE ONLY FORM COUNTED, AND `__bold__` RENDERS AS `<strong>`
 * IN COMMONMARK** — so a row could be 100% bold to a reader and report 0.0%
 * (`REVIEW-044`, leg B). `<b>` and `<strong>` were invisible to it too.
 *
 * ⚠ **The `__` and HTML matches deliberately OVER-count**, ignoring
 * CommonMark's flanking and intraword rules. Rule 5 is a **maximum**, so
 * over-counting can only produce a false FAIL — loud, and fixed by whoever
 * hits it — while under-counting is the silent direction that let the shape
 * through. `CLAIMS.md` E-203's two-consumer lesson, resolved by naming the
 * direction rather than arguing it.
 */
export function boldChars(masked: string): number {
  let n = 0;
  for (const re of [
    /\*\*([\s\S]+?)\*\*/g,
    /__([\s\S]+?)__/g,
    /<b>([\s\S]*?)<\/b>/gi,
    /<strong>([\s\S]*?)<\/strong>/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(masked))) n += m[1].length;
  }
  return n;
}

/**
 * The two normalisations, kept apart because **their consumers want opposite
 * things** — `CLAIMS.md` E-203, and the reason each has its own function.
 *
 * `forMarks` is what rules 1, 3 and 4 count. It DELETES the emoji variation
 * selector and decodes the numeric entities, so ⚠ **`⚠️⚠️` and `&#9888;`, both
 * of which a reader sees and neither of which the counter saw, now count**
 * (`REVIEW-044`, leg B). It is shorter than its input; nothing downstream
 * depends on its length.
 *
 * `forBold` is rule 5's denominator. It REMOVES HTML comments, which render as
 * nothing, so ⚠ padding a cell with an invisible comment can no longer dilute
 * the ratio under the cap.
 */
export function forMarks(masked: string): string {
  return masked
    .replace(/\uFE0F/g, "")
    .replace(/&#0*9888;/g, "⚠")
    .replace(/&#[xX]0*26[aA]0;/g, "⚠");
}

export function forBold(masked: string): string {
  return masked.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Rule 4 — is this `⚠` mid-sentence?
 *
 * `before` is the text preceding the mark on its line, already code-masked.
 * A mark is at a sentence start when nothing precedes it, when what precedes it
 * ends a sentence, or when it follows a list enumerator or a closed
 * strikethrough — `~~a retracted phrase~~ ⚠ the correction` is this register's
 * standard idiom and the correction does start there.
 *
 * ⚠ **The em dash is accepted, and rule 4's prose (*"never mid-clause"*) argues
 * it should not be.** `docs/EMPHASIS-DISCIPLINE.md`'s own specification of this
 * gate names `—` as an allowed predecessor, so the gate follows the gate's
 * specification and the disagreement is disclosed rather than silently resolved.
 *
 * ⚠⚠ **`;` AND `:` WERE ACCEPTED HERE UNTIL `REVIEW-043` AND NEITHER WAS
 * DOCUMENTED.** A semicolon joins clauses inside one sentence, so `first clause;
 * ⚠ correction` is exactly what rule 4 forbids, and the gate was silently not
 * enforcing it. **Removed after measuring the cost: across 795 contiguous `⚠`
 * runs in the register at `b97966c`, the two account for 5** — `;` four times and `:` once, against 597
 * full stops — so the register never depended on them. The complete allow-list
 * is now `.` `!` `?` `—` `(`, an unescaped `|`, a `(n)` enumerator and a closed
 * `~~retraction~~`, plus a list marker — `1)` or `-` — opening a cell.
 * ⚠ **This said *"every one of them is named in the printed disclosure"* and
 * the disclosure names none of them** (`REVIEW-045`); it also omitted the list
 * marker it had just added. A citation to a disclosure that does not exist
 * reads exactly like a disclosure — `CLAIMS.md` E-203.
 *
 * ⚠ **The `|` is a CELL boundary, and one character of lookback decides it** —
 * the same convention `build-claims-index.ts::splitCells` uses, validated there
 * against `cmark-gfm`. `\|` is content, so it does not start a cell.
 */
export function midSentence(before: string): boolean {
  let b = before.replace(/\s+$/, "");
  if (b === "") return false;
  // ⚠⚠ **`/\([0-9a-z]{1,3}\)$/` MATCHED ANY SHORT PARENTHETICAL WORD, NOT AN
  // ENUMERATOR** — `(due)`, `(and)`, `(the)`, `(see)` all passed rule 4 and let
  // a mid-clause mark through (`REVIEW-044`, leg B). An enumerator is digits or
  // a SINGLE letter, either case; `(A)` used to false-FAIL for the same reason.
  if (/\((\d{1,3}|[A-Za-z])\)$/.test(b)) return false;
  // ⚠ A list marker opening a cell — `| 1) ⚠ …` — is a sentence start. It
  // false-FAILED before, because stripping the `)` left a bare digit.
  if (/(?:^|\|)\s*(?:\d{1,9}[.)]|[-*+])$/.test(b)) return false;
  // ⚠ The strikethrough test runs BETWEEN two strips, not before them, so a
  // BOLDED retraction — `**~~withdrawn~~** ⚠ the correction` — is recognised.
  // Checking `~~$` on the raw text missed it (`REVIEW-044`, leg B).
  b = b.replace(/[*_`"'’”)\]]+$/, "").replace(/\s+$/, "");
  if (/~~$/.test(b)) return false;
  b = b.replace(/[*_`~"'’”)\]]+$/, "").replace(/\s+$/, "");
  if (b === "") return false;
  if (/[.!?—(]$/.test(b)) return false;
  return !/(^|[^\\])\|$/.test(b);
}

export interface RowVerdict {
  doubles: number;
  warns: number;
  boldRatio: number;
  midSentence: number;
  problems: string[];
}

/** Rules 1, 3, 4 and 5 over one table row, as written. */
export function judgeRow(line: string): RowVerdict {
  const masked = maskCodeSpans(line);
  const marks = forMarks(masked);
  const bold = forBold(masked);
  const doubles = (marks.match(/⚠⚠/g) || []).length;
  const warns = (marks.match(/⚠/g) || []).length;
  const boldRatio = bold.length ? boldChars(bold) / bold.length : 0;
  let mid = 0;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i] !== "⚠") continue;
    if (i > 0 && marks[i - 1] === "⚠") continue;
    if (midSentence(marks.slice(0, i))) mid++;
  }
  const problems: string[] = [];
  if (doubles > MAX_DOUBLE) problems.push(`rule 1: ${doubles} ⚠⚠, at most ${MAX_DOUBLE}`);
  if (warns > MAX_WARN) problems.push(`rule 3: ${warns} ⚠ (⚠⚠ counts two), at most ${MAX_WARN}`);
  if (mid > 0) problems.push(`rule 4: ${mid} ⚠ not at a sentence start`);
  if (boldRatio > MAX_BOLD_RATIO)
    problems.push(`rule 5: ${(boldRatio * 100).toFixed(1)}% bold, at most ${(MAX_BOLD_RATIO * 100).toFixed(0)}%`);
  return { doubles, warns, boldRatio, midSentence: mid, problems };
}

export interface Para { line: number; len: number; head: string }

/**
 * Rule 6 — narrative paragraphs only.
 *
 * ⚠⚠ **A LIST BLOCK AND A FENCED BLOCK ARE NOT PARAGRAPHS, HOWEVER LONG THEY
 * RUN.** `docs/EMPHASIS-DISCIPLINE.md` found this by applying the rule to
 * itself: its first draft flagged its own 1,437-character bullet list, which is
 * a false positive of the measurement rather than a violation. A reader scans a
 * list by its bullets. Controls 9 and 10 pin both boundaries.
 *
 * Table rows, headings, blockquotes and rules are structural for the same
 * reason. An indented line inside a list block continues that list.
 */
/**
 * ⚠⚠ **RULE 6 IS ANSWERED BY `cmark-gfm` WHEN IT IS INSTALLED, AND BY THE
 * HEURISTIC BELOW ONLY WHEN IT IS NOT.** Three rounds patched the hand-written
 * splitter and `REVIEW-045` still found **six false PASSES and two false
 * fails** in it — a leading pipe with no table, `#text` with no space, an
 * indented fence, `2.` where CommonMark says an ordered marker may not
 * interrupt a paragraph, a `~~~` inside a ``` fence, and a heading that never
 * cleared the list state; each hid a real 900-character paragraph. **Patching a
 * block parser one construct at a time is what was failing**, so the authority
 * answers instead.
 *
 * `--sourcepos` carries the line numbers, and `<p>` inside `<li>`,
 * `<blockquote>`, `<pre>` or `<table>` is dropped, because
 * `docs/EMPHASIS-DISCIPLINE.md` rule 6 is about **narrative** paragraphs and a
 * reader scans a list by its bullets.
 *
 * ⚠ The fallback is real and is disclosed on every run: with no `cmark-gfm` the
 * gate says so in its output and in `what_this_does_not_say()`, rather than
 * quietly answering with the instrument that was wrong eight ways.
 */
export function paragraphs(text: string): Para[] {
  const viaCmark = paragraphsViaCmark(text);
  if (viaCmark) return viaCmark;
  return paragraphsHeuristic(text);
}

export function paragraphsViaCmark(text: string): Para[] | null {
  const r = spawnSync("cmark-gfm", ["--extension", "table", "--sourcepos"], { input: text, encoding: "utf8" });
  if (r.error || r.status !== 0 || !r.stdout) return null;
  const html = r.stdout
    .replace(/<li\b[\s\S]*?<\/li>/g, "")
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/g, "")
    .replace(/<pre\b[\s\S]*?<\/pre>/g, "")
    .replace(/<table\b[\s\S]*?<\/table>/g, "");
  const out: Para[] = [];
  for (const m of html.matchAll(/<p data-sourcepos="(\d+):\d+-\d+:\d+">([\s\S]*?)<\/p>/g)) {
    const plain = m[2].replace(/<[^>]+>/g, "");
    out.push({ line: Number(m[1]), len: [...plain].length, head: plain.slice(0, 72) });
  }
  return out;
}

/** The pre-`REVIEW-045` heuristic. Used only when `cmark-gfm` is absent. */
export function paragraphsHeuristic(text: string): Para[] {
  const lines = text.split("\n");
  const out: Para[] = [];
  let buf: string[] = [];
  let start = 0;
  let fenced = false;
  let inList = false;
  const flush = () => {
    if (buf.length) {
      const joined = buf.join(" ").trim();
      out.push({ line: start, len: [...joined].length, head: joined.slice(0, 72) });
    }
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(```|~~~)/.test(l)) { flush(); fenced = !fenced; continue; }
    if (fenced) continue;
    if (/^\s*$/.test(l)) { flush(); inList = false; continue; }
    // ⚠ An indented code block is not prose. It cannot interrupt a paragraph,
    // so this only applies when nothing is accumulating (`REVIEW-044`, leg B).
    if (!inList && buf.length === 0 && /^(    |\t)/.test(l)) { flush(); continue; }
    // ⚠ **`1)` IS AN ORDERED-LIST MARKER IN GFM AND THIS REGEX READ ONLY `1.`**
    // until `REVIEW-043`, so a parenthesised list over 800 characters was
    // measured as a narrative paragraph and FALSE-FAILED rule 6 — the exact
    // false positive the rule's own note (E-247's shape) exists to prevent.
    // Confirmed against `cmark-gfm`: `1)` renders as `<ol><li>`.
    // ⚠⚠ **`\d+` ACCEPTED UNLIMITED DIGITS AND GFM ALLOWS AT MOST NINE**, so
    // `1234567890) …` — a PARAGRAPH to any GFM parser — was discarded as a list
    // and a 912-character wall passed rule 6. ⚠ **That defect was introduced by
    // the `1)` fix itself** (`REVIEW-044`, leg A), which is the category a
    // second round exists to find.
    if (/^\s*([-*+]|\d{1,9}[.)])\s/.test(l)) { flush(); inList = true; continue; }
    if (inList && /^\s{2,}\S/.test(l)) { flush(); continue; }
    // ⚠ CommonMark LAZY CONTINUATION: an unindented line directly under a list
    // item belongs to that item. It was measured as a standalone paragraph.
    if (inList && buf.length === 0) { continue; }
    if (/^\s*\|/.test(l) || /^#/.test(l) || /^\s*>/.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      flush(); inList = false; continue;
    }
    inList = false;
    if (!buf.length) start = i + 1;
    buf.push(l);
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// Scope. Named sets, and what is outside them is printed, not hidden.
// ---------------------------------------------------------------------------

/**
 * Rule 6 over `CLAIMS.md` is enforced with ONE recorded exemption, keyed by a
 * stable opening phrase rather than a line number.
 *
 * ⚠ **A recorded exemption that matches nothing FAILS**, and so does one that
 * matches more than one paragraph — the idiom `check-loopback` and
 * `check-blinding` already use. A stale exemption is a hole that reads like a
 * decision.
 */
const CLAIMS_PARA_EXEMPT: { key: string; why: string }[] = [
  {
    key: "So the honest conclusion is not",
    why: "E-148's loopback-node note. Historical narrative inside the register, " +
      "predating the discipline; left as written for the same reason the rows are.",
  },
];

/**
 * `CLAUDE.md` is RATCHETED, not exempted by name.
 *
 * ⚠ **Deliberately a different instrument from `CLAIMS.md`'s, and the reason is
 * churn.** `CLAUDE.md`'s long paragraphs are its Status blocks, which are
 * rewritten most sessions; a by-name exemption list over them would false-fail
 * on every ordinary edit, and a gate that false-fails gets switched off. The
 * ratchet is **a bound, not a guarantee** (`CLAIMS.md` E-186): it catches a
 * fourteenth long paragraph and would not catch one long paragraph replacing
 * another.
 */
/**
 * ⚠⚠ **TWO BASELINES, BECAUSE TWO INSTRUMENTS MEASURE DIFFERENT THINGS.** A
 * single number calibrated on `cmark-gfm` made the gate FAIL on a machine
 * without it — the heuristic counts **13** over-length paragraphs in
 * `CLAUDE.md` where `cmark-gfm` counts **11**. **Found by hiding `cmark-gfm`
 * from `PATH` and running the gate**, which is the only way that path gets
 * exercised (`CLAIMS.md` E-261).
 *
 * ⚠ The gap is not noise: it is two of the heuristic's false FAILS, measured on
 * a real file rather than on a synthetic case.
 */
const CLAUDE_PARA_BASELINE = { cmark: 11, heuristic: 13 } as const;

/** Density is REPORTED for these and enforced for none of them. */
const DENSITY_FILES = ["CLAIMS.md", "CLAUDE.md", "README.md", "UPSTREAM-FEEDBACK.md"];

// ---------------------------------------------------------------------------
// Controls. Every one runs through the detector the real check calls, and the
// count is incremented by the helper that runs them (`CLAIMS.md` E-203).
// ---------------------------------------------------------------------------

let controls = 0;
let controlFailures = 0;
let cmarkRan = false;

function control(name: string, ok: boolean): void {
  controls++;
  if (ok) {
    console.log(`  CONTROL ✓ ${name}`);
  } else {
    controlFailures++;
    console.log(`  CONTROL ✗ ${name}  — THE DETECTOR IS WRONG, not the tree`);
  }
}

const CLEAN = "| E-999 | A claim stated plainly. ⚠ **A correction to it.** The rest of the row is ordinary prose carrying the evidence, at length, without emphasis, so that the bold ratio stays where the rule wants it and the reader can tell the headline from the body of the row. |";

/**
 * ⚠⚠ **THE DIFFERENTIAL AGAINST A REAL GFM PARSER, COMMITTED.** `REVIEW-044`'s
 * self leg found that the whole warrant for the masker rewrite — *"agrees with
 * `cmark-gfm` on nine shapes"* — ~~STRUCK, it is thirteen and committed~~ — was
 * a shell command run once and thrown away.
 * Four comments cited it and **nothing executed it**: `CLAIMS.md` E-165, *a
 * gate described is not a gate run*, landing on the evidence for the fix to a
 * false-pass path. The hand-written controls encode this author's reading of
 * GFM, which is the thing round one proved wrong.
 *
 * ⚠ **It does not silently pass when `cmark-gfm` is absent.** It prints that it
 * could not run and the summary line says so, because a differential that
 * quietly skips is worse than none.
 *
 * The oracle is the count of `⚠` **rendered outside `<code>`** — exactly what
 * rules 1 and 3 must see. Bold is compared as a boolean (`any` versus `none`),
 * because `<strong>` character counts and source `**` ratios have different
 * denominators and comparing them would be a false precision.
 */
function cmarkDifferential(): void {
  const probe = spawnSync("cmark-gfm", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    cmarkRan = false;
    console.log("  ⚠ DIFFERENTIAL SKIPPED — `cmark-gfm` is not installed, so the masker was NOT");
    console.log("    checked against a real GFM parser on this run. Install it (`brew install cmark-gfm`).");
    return;
  }
  cmarkRan = true;
  const shapes: [string, string][] = [
    ["a real code span",                 "| E-999 | x `⚠⚠ inner **b**` y | ev |"],
    ["backslash-escaped backticks",      "| E-999 | x \\` ⚠⚠ **b** \\` y | ev |"],
    ["unequal runs, 1 then 2",           "| E-999 | x ` ⚠⚠ **b** `` y | ev |"],
    ["unequal runs, 2 then 1",           "| E-999 | x `` ⚠⚠ **b** ` y | ev |"],
    ["equal double runs",                "| E-999 | x `` ⚠⚠ inner **b** `` y | ev |"],
    ["an unclosed run",                  "| E-999 | x ` ⚠⚠ **b** y | ev |"],
    ["a backtick inside a double span",  "| E-999 | x `` a ` b `` ⚠⚠ **c** y | ev |"],
    ["two spans, marks between",         "| E-999 | x `a` ⚠⚠ **b** `c` y | ev |"],
    ["backticks in TWO DIFFERENT CELLS", "| E-999 | ` ⚠⚠ **b**. ⚠⚠ **c**. | ` ev |"],
    ["the emoji variation selector",     "| E-999 | ⚠️⚠️ one. ⚠️⚠️ two. | ev |"],
    ["a numeric entity",                 "| E-999 | &#9888; one. &#9888; two. | ev |"],
    ["underscore bold",                  "| E-999 | __all of this is bold__ | ev |"],
    ["plain prose, no marks",            "| E-999 | ordinary evidence prose | ev |"],
  ];
  for (const [name, row] of shapes) {
    const doc = "| # | Claim | Evidence |\n|---|---|---|\n" + row + "\n";
    const html = spawnSync("cmark-gfm", ["--extension", "table"], { input: doc, encoding: "utf8" }).stdout ?? "";
    const body = html.slice(html.indexOf("<tbody>"));
    // ⚠⚠ **THE ORACLE COUNTED `⚠` IN RAW HTML, ATTRIBUTES INCLUDED**, so for a
    // row carrying `[x](url "⚠⚠⚠⚠")` it reported 4 — agreeing with the detector
    // while **both disagreed with the reader**, who sees none (`REVIEW-045`).
    // An oracle that can agree for the wrong reason is not an oracle. Tags are
    // stripped now, so what is counted is what is rendered.
    const noCode = body.replace(/<code>[\s\S]*?<\/code>/g, "");
    // ⚠ Two readings of one render, because the two questions differ: marks are
    // counted in the TEXT a reader sees, bold is detected in the MARKUP that
    // makes it bold. Stripping tags for both is what broke this on its first
    // form — eight differential controls failed at once and said so.
    const want = (noCode.replace(/<[^>]+>/g, "").match(/⚠/g) || []).length;
    const wantBold = /<strong>/.test(noCode);
    const v = judgeRow(row);
    const gotBold = boldChars(forBold(maskCodeSpans(row))) > 0;
    control(
      `cmark-gfm differential — ${name}: ${want} visible ⚠, bold ${wantBold ? "yes" : "no"}`,
      v.warns === want && gotBold === wantBold,
    );
  }
}

function runControls(): void {
  console.log("Controls — each one calls the same detector the real check calls\n");

  cmarkDifferential();

  control("a compliant row PASSES", judgeRow(CLEAN).problems.length === 0);

  control(
    "rule 1: a row with TWO ⚠⚠ fails",
    judgeRow(CLEAN.replace("⚠ **A correction", "⚠⚠ **A correction") + " ⚠⚠ **And another headline.**")
      .problems.some((p) => p.startsWith("rule 1")),
  );

  control(
    "rule 3: a row with FOUR ⚠ fails",
    judgeRow(CLEAN + " ⚠ **One.** ⚠ **Two.** ⚠ **Three.**").problems.some((p) => p.startsWith("rule 3")),
  );

  control(
    "rule 3: ⚠⚠ counts as TWO — one ⚠⚠ plus two ⚠ is four and fails",
    judgeRow(CLEAN.replace("⚠ **A correction", "⚠⚠ **A correction") + " ⚠ **One.** ⚠ **Two.**")
      .problems.some((p) => p.startsWith("rule 3")),
  );

  control(
    "rule 4: a ⚠ mid-clause fails",
    judgeRow("| E-999 | The read was stale and ⚠ **that is a confidentiality break.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );

  control(
    "rule 4: a ⚠ after a full stop PASSES",
    !judgeRow("| E-999 | The read was stale. ⚠ **That is a confidentiality break.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );

  control(
    "rule 4: a ⚠ after a (1) enumerator PASSES — the register's list idiom",
    !judgeRow("| E-999 | Three defects, all measured: (1) ⚠ **the first one.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );

  control(
    "rule 4: a ⚠ after a closed ~~retraction~~ PASSES",
    !judgeRow("| E-999 | ~~It was claimed~~ ⚠ **and it is withdrawn.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );

  control(
    "rule 5: a row 30% bold fails",
    judgeRow("| E-999 | **" + "b".repeat(40) + "** " + "p".repeat(60) + " |")
      .problems.some((p) => p.startsWith("rule 5")),
  );

  // ⚠ The masker is what separates a MARK from a MENTION. Without it a row
  // discussing the notation spends its whole budget describing it.
  control(
    "the masker: ⚠ inside a code span is not counted",
    judgeRow("| E-999 | The gate forgives a hit near any `⚠⚠⚠⚠` token. |").warns === 0,
  );

  control(
    "the masker: ** inside a code span is not bold",
    boldChars(maskCodeSpans("| E-999 | The glob is `**/*.ts` and nothing here is bold. |")) === 0,
  );

  control(
    "the masker preserves LENGTH, so rule 4's offsets and rule 5's denominator hold",
    maskCodeSpans("a `bcd` e").length === "a `bcd` e".length,
  );

  // ⚠ The four below are `REVIEW-043`'s false-pass shapes. Each one is a row
  // GFM renders with the mark VISIBLE, which the first masker blanked. Every
  // expectation here was checked against `cmark-gfm 0.29.0.gfm.13`.
  control(
    "the masker: a BACKSLASH-ESCAPED backtick opens nothing — the mark still counts",
    judgeRow("| E-999 | x \\` ⚠⚠ **visible to a reader** \\` y |").warns === 2,
  );
  control(
    "the masker: an opening run closed by a DIFFERENT-length run is not a span",
    judgeRow("| E-999 | x ` ⚠⚠ **visible to a reader** `` y |").warns === 2,
  );
  control(
    "the masker: an UNCLOSED run is literal text, not a span to the end of the row",
    judgeRow("| E-999 | x ` ⚠⚠ **visible to a reader** y |").warns === 2,
  );
  control(
    "the masker: a backtick INSIDE a double-run span does not close it",
    judgeRow("| E-999 | x `` a ` b `` ⚠⚠ **visible to a reader** y |").warns === 2,
  );

  control(
    "rule 4: a SEMICOLON is mid-sentence and fails",
    judgeRow("| E-999 | the first clause; ⚠ **the correction.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );
  control(
    "rule 4: a COLON is mid-sentence and fails",
    judgeRow("| E-999 | three defects: ⚠ **the first.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );
  control(
    "rule 4: a mark opening a CELL passes — the `|` is a boundary",
    !judgeRow("| E-999 | ⚠ **this opens the cell.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );
  control(
    "rule 4: an ESCAPED pipe is content, so a mark after it is mid-sentence",
    judgeRow("| E-999 | a pipe \\| ⚠ **mid-sentence.** |")
      .problems.some((p) => p.startsWith("rule 4")),
  );

  // Rule 6's splitter. The spec demands both boundaries be pinned.
  const wall = "w".repeat(900);
  control("rule 6: a 900-character narrative paragraph is measured as one",
    paragraphs(wall).some((p) => p.len > MAX_PARA));
  control("rule 6: a long LIST is not a paragraph",
    paragraphs("- " + "a".repeat(700) + "\n- " + "b".repeat(700)).every((p) => p.len <= MAX_PARA));
  // ⚠⚠ **A TIGHT LIST NEVER EXERCISED THE `<li>` EXCLUSION.** GFM puts no `<p>`
  // inside a tight `<li>`, so deleting the exclusion from `paragraphsViaCmark`
  // changed nothing and **no control noticed** — measured (`CLAIMS.md` E-263).
  // A LOOSE list is the one that produces `<p>` inside `<li>`, and it is what
  // pins the exclusion that makes rule 6 about NARRATIVE paragraphs.
  control("rule 6: a long LOOSE list is not a paragraph either — this pins the <li> exclusion",
    paragraphs("- " + "a".repeat(900) + "\n\n- " + "b".repeat(900)).every((p) => p.len <= MAX_PARA));
  control("rule 6: a long NUMBERED list is not a paragraph",
    paragraphs("1. " + "a".repeat(700) + "\n2. " + "b".repeat(700)).every((p) => p.len <= MAX_PARA));
  // ⚠ `1)` is an ordered-list marker in GFM and the splitter read only `1.`,
  // so such a list FALSE-FAILED rule 6 (`CLAIMS.md` E-258).
  control("rule 6: a long list using `1)` markers is not a paragraph either",
    paragraphs("1) " + "a".repeat(700) + "\n2) " + "b".repeat(700)).every((p) => p.len <= MAX_PARA));
  control("rule 6: a long FENCED block is not a paragraph",
    paragraphs("```\n" + "c".repeat(1400) + "\n```").length === 0);
  control("rule 6: a long TABLE is not a paragraph",
    paragraphs("| a | b |\n|---|---|\n| " + "x".repeat(900) + " | y |").length === 0);
  control("rule 6: an indented continuation of a list item is not a paragraph",
    paragraphs("- lead in\n  " + "d".repeat(900)).every((p) => p.len <= MAX_PARA));
  control("rule 6: a paragraph that FOLLOWS a list is still measured",
    paragraphs("- a list item\n\n" + "e".repeat(900)).some((p) => p.len > MAX_PARA));

  // The cutoff comparator, in both directions.
  // ⚠ DERIVED from CUTOFF, not from a literal id. A control hardcoding `E-249`
  // would false-fail the day the cutoff legitimately moves, and — measured —
  // it also swallowed the vacuity probe: raising the cutoff tripped the control
  // before the "zero rows governed" branch could fire, so the probe passed for
  // the wrong reason and the branch it named went untested.
  control(`the cutoff: E-${CUTOFF.E - 1} (one below) is grandfathered`, !enforced(`E-${CUTOFF.E - 1}`));
  control(`the cutoff: E-${CUTOFF.E} (the boundary itself) is enforced`, enforced(`E-${CUTOFF.E}`));
  control("the cutoff: the suffixed id E-3a resolves to 3 and is grandfathered", !enforced("E-3a"));
  control("the cutoff: an unknown prefix is REFUSED rather than skipped", unknownPrefix("G-1"));

  // ⚠ `REVIEW-044`'s fixes, each pinned. The masker cases are covered by the
  // cmark-gfm differential above; these are the ones that differential cannot
  // express, because they are about SENTENCE POSITION and BLOCK STRUCTURE.
  control("rule 4: `(due)` is a word, not an enumerator, and fails",
    judgeRow("| E-999 | Latency increased (due) ⚠ to lock contention. |")
      .problems.some((p) => p.startsWith("rule 4")));
  control("rule 4: `(1)` and `(A)` are enumerators and pass",
    !judgeRow("| E-999 | Three defects: (1) ⚠ the first. |").problems.some((p) => p.startsWith("rule 4")) &&
    !judgeRow("| E-999 | (A) ⚠ the first. |").problems.some((p) => p.startsWith("rule 4"))); 
  control("rule 4: a `1)` list marker OPENING a cell passes",
    !judgeRow("| E-999 | 1) ⚠ the first failure mode. |").problems.some((p) => p.startsWith("rule 4")));
  control("rule 4: a BOLDED ~~retraction~~ passes",
    !judgeRow("| E-999 | **~~The original claim~~** ⚠ the correction. |")
      .problems.some((p) => p.startsWith("rule 4")));
  control("rule 5: an HTML comment cannot dilute the denominator",
    judgeRow("| E-999 | **" + "B".repeat(60) + "** <!--" + " ".repeat(300) + "--> |")
      .problems.some((p) => p.startsWith("rule 5")));
  control("rule 6: a marker of TEN digits is prose, not a list — GFM allows nine",
    paragraphs("1234567890) " + "a".repeat(900)).some((p) => p.len > MAX_PARA));
  control("rule 6: a NINE-digit marker is still a list",
    paragraphs("123456789) " + "a".repeat(900)).every((p) => p.len <= MAX_PARA));
  control("rule 6: an indented code block is not a narrative paragraph",
    paragraphs("    " + "c".repeat(900)).every((p) => p.len <= MAX_PARA));
  control("rule 6: a LAZY continuation line belongs to its list item",
    paragraphs("- lead in\n" + "l".repeat(900)).every((p) => p.len <= MAX_PARA));
  control("rule 6: ordinary prose is still measured",
    paragraphs("p".repeat(900)).some((p) => p.len > MAX_PARA));

  console.log("\nAsserted-uncaught — the disclosure below goes stale if these start passing\n");
  control(
    "a ⚠ DISCUSSED in prose, outside backticks, still burns the row's budget (disclosure 3)",
    judgeRow("| E-999 | It sits beneath the ⚠⚠ banner. ⚠ **And that is the point.** |").warns === 3,
  );
  control(
    "emphasis by CAPITALS or by single-* italics is invisible to rule 5 (disclosure 4)",
    judgeRow("| E-999 | *" + "i".repeat(60) + "* AND SHOUTING AT LENGTH, ALL OF IT UNMARKED. |")
      .problems.length === 0,
  );
  // ⚠ `REVIEW-044` leg A's second differential. GFM consumes an autolink before
  // inline code, so backticks inside `<…>` never open a span and the marks are
  // visible. This detector models code spans per CELL and not autolinks, so it
  // under-counts here. Asserted so disclosure 8 cannot go stale.
  control(
    "backticks inside an AUTOLINK still under-count — modelled by neither (disclosure 8)",
    judgeRow("| E-999 | <https://example.test/`⚠⚠`/`⚠⚠`> |").warns === 0,
  );
  // ⚠ **This slot held *"a pipe-less GFM table is still measured as prose"*
  // and the control FAILED the moment `cmark-gfm` began answering rule 6 —
  // which is what an asserted-uncaught control is for.** The disclosure had
  // gone stale in the same commit that fixed the thing it disclosed.
  control(
    "`⚠` in LINK METADATA counts although a reader sees none (disclosure 7)",
    judgeRow('| E-999 | [plain](https://example.test/x "⚠⚠⚠⚠") | ev |').warns === 4,
  );
  console.log("");
}

function enforced(id: string): boolean {
  const m = id.match(/^([A-Z]+)-(\d+)/);
  if (!m) return false;
  const c = CUTOFF[m[1]];
  return c !== undefined && Number(m[2]) >= c;
}

function unknownPrefix(id: string): boolean {
  const m = id.match(/^([A-Z]+)-(\d+)/);
  return !m || CUTOFF[m[1]] === undefined;
}

// ---------------------------------------------------------------------------
// The real check.
// ---------------------------------------------------------------------------

interface Target { label: string; line: number; text: string }

const DELIM = /^\s*\|[\s:|-]*\|?\s*$/;

/**
 * The rows the gate governs: every id-bearing register row at or after the
 * cutoff, plus **every** content row of the `Revision history` table.
 *
 * ⚠ Revision history carries no cutoff because the whole section was rewritten
 * on 2026-09-09 under this discipline — `docs/EMPHASIS-DISCIPLINE.md` names it
 * as the one part of the register that is a navigational surface rather than a
 * claim record, and therefore the one part that is rewritten rather than kept.
 */
function collect(text: string): { governed: Target[]; grandfathered: Target[]; unknown: string[] } {
  const lines = text.split("\n");
  const governed: Target[] = [];
  const grandfathered: Target[] = [];
  const unknown: string[] = [];
  let section = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = l.match(/^## (.+)$/);
    if (h) { section = h[1].replace(/[*`]/g, "").trim(); continue; }
    const m = l.match(ROW);
    if (m) {
      if (unknownPrefix(m[1])) unknown.push(`${m[1]} (line ${i + 1})`);
      else if (enforced(m[1])) governed.push({ label: m[1], line: i + 1, text: l });
      else grandfathered.push({ label: m[1], line: i + 1, text: l });
      continue;
    }
    if (section === "Revision history" && /^\s*\|/.test(l) && !DELIM.test(l) && !DELIM.test(lines[i + 1] ?? "")) {
      governed.push({ label: `Revision history line ${i + 1}`, line: i + 1, text: l });
    }
  }
  return { governed, grandfathered, unknown };
}

function what_this_does_not_say(): void {
  console.log("\nWhat this gate does NOT say:");
  for (const [n, s] of [
    "It is LEXICAL. It cannot tell whether a ⚠ marks a real retraction or whether the sentence under it is true — rule 2 (`⚠` means a retraction or a correction, not \"important\") is NOT machine-checkable and is NOT checked here. Five of the six rules are enforced; rule 2 is the sixth.",
    "It governs a NAMED SET: id-bearing rows of `CLAIMS.md` at or after the cutoff, the `Revision history` table, and narrative paragraphs of `CLAIMS.md` and `CLAUDE.md`. Every other file in the repository is unchecked; the densities printed above are reported for orientation and enforce nothing.",
    "A `⚠` DISCUSSED in prose — *\"beneath the ⚠⚠ banner\"* — is counted as a mark. Only a code span exempts one. `⚠️` (with the emoji variation selector) and `&#9888;` DO count, since REVIEW-044; before it they counted as nothing at all.",
    "Rule 5 counts `**`, `__`, `<b>` and `<strong>`. Emphasis by CAPITALS, by single-`*` italics, or by sheer sentence length is invisible to it, and the register uses all three. The `__` and HTML matches deliberately OVER-count, ignoring CommonMark's flanking rules, because rule 5 is a maximum and over-counting can only false-FAIL.",
    "`CLAUDE.md`'s paragraph check is a RATCHET over a count. It catches a new long paragraph; it does not catch one long paragraph being swapped for another. A bound, not a guarantee.",
    "The cutoff is enforced by row ID, not by date. A row inserted with an old id — an `E-3b` beside `E-3a` — is grandfathered however recently it was written.",
    "Rule 6 is answered by `cmark-gfm` itself when it is installed — its `<p>` elements, minus those inside a list, a blockquote, a code block or a table. What is NOT modelled is the inline layer: `⚠` inside link metadata (`[x](url \"⚠\")`) is counted although a reader sees none. That is a false FAIL, loud, and it carries an asserted-uncaught control above.",
    "The inline model is code spans, per table cell. It does NOT model autolinks, so backticks inside `<…>` mask marks that a reader sees — an asserted-uncaught control pins that too, so this sentence fails the gate if it ever stops being true.",
    "Rule 5's RATIO has never been compared against a rendered oracle, and cannot be fairly: the denominator here is masked raw Markdown — pipes, marker syntax, tags, backticks — while a parser exposes rendered text with those removed and entities decoded. Measured at this commit, the NUMERATORS differ on 220 of 336 id-bearing rows for that reason alone. What IS comparable is bold presence against absence, and `REVIEW-045` found it agreeing on every row, twice, on two different trees. **So rule 5 is checked in KIND and not in DEGREE**, and that is a limit of the method rather than an unexamined surface.",
    cmarkRan
      ? "The masker was checked against `cmark-gfm` on this run, shape by shape, above, and rule 6 was answered by it."
      : "⚠⚠ `cmark-gfm` was NOT available on this run. The masker was checked only against this author's own expectations — the thing REVIEW-043 proved wrong — AND rule 6 fell back to the hand-written splitter, in which REVIEW-045 measured six false passes and two false fails. Install it (`brew install cmark-gfm`).",
  ].entries()) console.log(`    ${n + 1}. ${s}`);
}

function main(): void {
  console.log("=".repeat(78));
  console.log("check-emphasis — docs/EMPHASIS-DISCIPLINE.md, enforced FORWARD");
  console.log("=".repeat(78));
  console.log(
    "\nCutoff: " +
      Object.entries(CUTOFF).map(([p, n]) => `${p}-${n}`).join("  ") +
      "   (a row at or after its section's cutoff is enforced)\n",
  );

  runControls();

  let failures = 0;
  const claims = readFileSync(join(REPO, "CLAIMS.md"), "utf8");
  const { governed, grandfathered, unknown } = collect(claims);

  if (unknown.length) {
    console.log(`FAIL: ${unknown.length} row(s) carry a prefix the cutoff does not cover: ${unknown.join(", ")}`);
    console.log("      A new section is a new cohort. Add it to CUTOFF rather than letting it through.\n");
    failures++;
  }

  // ⚠ Refuses to pass vacuously: a cutoff above every row checks nothing.
  const idRows = governed.filter((g) => !g.label.startsWith("Revision"));
  if (idRows.length === 0) {
    console.log("FAIL: ZERO id-bearing rows are at or after the cutoff, so the row rules check nothing.");
    console.log("      Moving the cutoff forward is not a way to switch this gate off (E-142, E-190).\n");
    failures++;
  }

  console.log(`Rows governed: ${governed.length}  (${idRows.length} register rows, ` +
    `${governed.length - idRows.length} Revision-history rows)`);
  console.log(`Rows grandfathered: ${grandfathered.length}\n`);

  let rowProblems = 0;
  for (const t of governed) {
    const v = judgeRow(t.text);
    for (const p of v.problems) {
      console.log(`FAIL  ${t.label}  (CLAIMS.md:${t.line})  ${p}`);
      rowProblems++;
    }
  }
  if (rowProblems) failures++;
  else console.log(`  rules 1, 3, 4, 5 hold across all ${governed.length} governed rows.`);

  // The drift, counted rather than edited.
  const drift = { d: 0, w: 0, b: 0, m: 0 };
  for (const t of grandfathered) {
    const v = judgeRow(t.text);
    if (v.doubles > MAX_DOUBLE) drift.d++;
    if (v.warns > MAX_WARN) drift.w++;
    if (v.boldRatio > MAX_BOLD_RATIO) drift.b++;
    if (v.midSentence > 0) drift.m++;
  }
  console.log(
    `\n  Grandfathered, for the record — of ${grandfathered.length} rows: ` +
      `${drift.d} carry more than one ⚠⚠, ${drift.w} more than ${MAX_WARN} ⚠, ` +
      `${drift.b} more than ${(MAX_BOLD_RATIO * 100).toFixed(0)}% bold, ${drift.m} a mid-sentence ⚠.`,
  );
  console.log("  ⚠ These are NOT edited. The drift is the evidence the rule was measured from.");

  // Rule 6 — CLAIMS.md, enforced with recorded exemptions.
  console.log("\nRule 6 — narrative paragraphs\n");
  const claimsParas = paragraphs(claims);
  const claimsOver = claimsParas.filter((p) => p.len > MAX_PARA);
  const used = new Set<number>();
  for (const ex of CLAIMS_PARA_EXEMPT) {
    const hits = claimsOver.filter((p) => p.head.includes(ex.key) || claimsHead(claims, p).includes(ex.key));
    if (hits.length !== 1) {
      console.log(`FAIL: exemption "${ex.key}" matches ${hits.length} over-length paragraphs, expected exactly 1.`);
      console.log("      A recorded exemption that matches nothing is a hole that reads like a decision.");
      failures++;
    }
    for (const h of hits) used.add(h.line);
  }
  const claimsLive = claimsOver.filter((p) => !used.has(p.line));
  if (claimsLive.length) {
    for (const p of claimsLive) console.log(`FAIL  CLAIMS.md:${p.line}  ${p.len} characters  "${p.head}…"`);
    failures++;
  } else {
    console.log(`  CLAIMS.md: ${claimsParas.length} narrative paragraphs, ` +
      `${claimsOver.length} over ${MAX_PARA} characters, all ${used.size} recorded.`);
    for (const ex of CLAIMS_PARA_EXEMPT) console.log(`    exempt — "${ex.key}…": ${ex.why}`);
  }

  const claude = readFileSync(join(REPO, "CLAUDE.md"), "utf8");
  const claudeParas = paragraphs(claude);
  const claudeOver = claudeParas.filter((p) => p.len > MAX_PARA);
  const baseline = cmarkRan ? CLAUDE_PARA_BASELINE.cmark : CLAUDE_PARA_BASELINE.heuristic;
  if (claudeOver.length > baseline) {
    console.log(`\nFAIL  CLAUDE.md: ${claudeOver.length} paragraphs over ${MAX_PARA} characters, ` +
      `baseline ${baseline} (${cmarkRan ? "cmark-gfm" : "the fallback heuristic"}). The ratchet only turns one way.`);
    for (const p of claudeOver.sort((a, b) => b.len - a.len).slice(0, 5))
      console.log(`      :${p.line}  ${p.len}  "${p.head}…"`);
    failures++;
  } else {
    console.log(`  CLAUDE.md: ${claudeParas.length} narrative paragraphs, ${claudeOver.length} over ` +
      `${MAX_PARA} characters, ratchet baseline ${baseline} — measured by ` +
      `${cmarkRan ? "cmark-gfm" : "the FALLBACK HEURISTIC, which REVIEW-045 found wrong eight ways"}.`);
    if (claudeOver.length < baseline)
      console.log(`    ⚠ Below the baseline. Lower it to ${claudeOver.length} so the ratchet keeps its grip.`);
  }

  // Density, reported and enforced nowhere.
  console.log("\nDensity, reported for orientation — enforced for none of these\n");
  for (const f of DENSITY_FILES) {
    const t = readFileSync(join(REPO, f), "utf8");
    const marks = (t.match(/⚠/g) || []).length;
    const kb = Buffer.byteLength(t, "utf8") / 1024;
    console.log(`    ${f.padEnd(22)} ${String(marks).padStart(4)} ⚠   ${(marks / kb).toFixed(2)} per KB`);
  }

  what_this_does_not_say();

  console.log("\n" + "-".repeat(78));
  if (controlFailures) {
    console.log(`FAIL: ${controlFailures} of ${controls} controls failed. The DETECTOR is wrong; ` +
      "nothing it reported about the tree can be believed.");
    verdict("CONTROL", 2);
  }
  if (failures) {
    console.log(`FAIL: ${failures} check(s) failed, under ${controls} controls in both directions.`);
    verdict("FAIL", 1);
  }
  console.log(
    `PASS: ${governed.length} governed rows keep rules 1, 3, 4 and 5; narrative paragraphs keep ` +
      `rule 6 in CLAIMS.md and hold at the CLAUDE.md ratchet — under ${controls} controls, a count ` +
      "incremented by the helper that runs them.",
  );
  console.log("⚠ Rule 2 is not machine-checkable and is not checked. See the disclosure above.");
  verdict("PASS", 0);
}

/**
 * The last line of every completed run, and the only thing a caller may
 * classify a run by.
 *
 * ⚠⚠ **AN EXIT CODE ALONE CANNOT TELL A VERDICT FROM A CRASH, AND
 * `REVIEW-043` MEASURED IT.** A syntax error, a failed import or an uncaught
 * throw all make Bun exit **1** — the same code this gate uses for *the tree
 * broke a rule* — so `break-emphasis-gate.sh` was reporting ✓ for probes whose
 * mutation had stopped the gate from running at all. **That is precisely the
 * defect the 1-versus-2 split was introduced to catch, one layer up.**
 *
 * ⚠ **A crash cannot print this line LAST, and the word is load-bearing.** This
 * sentence read *"a crash cannot print this line"* until `REVIEW-045`, and a
 * process that prints it and then throws disproves that — `break-emphasis-gate`
 * was classifying such a crash as a rule failure. **The correction reached the
 * harness, the adjudication and E-259, and not the sentence in the file that
 * PRINTS the line** (`CLAIMS.md` E-168's shape, E-261). A caller that requires
 * this as the FINAL line, agreeing with the exit code, can separate the three
 * outcomes.
 */
function verdict(what: "PASS" | "FAIL" | "CONTROL", code: number): never {
  console.log(`check-emphasis: verdict=${what} exit=${code}`);
  process.exit(code);
}

/** The full text of a paragraph, for exemption matching beyond the 72-char head. */
function claimsHead(text: string, p: Para): string {
  return text.split("\n").slice(p.line - 1, p.line + 3).join(" ");
}

if (import.meta.main) main();
