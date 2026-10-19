# REVIEW-044 leg B — attack the detector, COLD

You are reviewing two files in isolation. **You have no repository and no
context about why they were written.** That is deliberate: judge the code, not
the story around it.

`check-emphasis.ts` enforces a house style over Markdown table rows and
paragraphs in a GitHub-Flavored Markdown register. `break-emphasis-gate.sh`
verifies it by mutating the tree and requiring the gate to fail.

## Your task

**Find inputs where the code does the wrong thing.** Concretely:

1. `maskCodeSpans` claims to implement CommonMark's code-span rule so that a
   `⚠` or `**bold**` that GFM renders as VISIBLE PROSE is always counted, and
   one inside a real code span never is. **Find an input where it disagrees
   with a real GFM parser.** Consider: backslash escapes, unequal delimiter
   runs, runs longer than two, the CommonMark rule that strips one leading and
   one trailing space from a code span's content, backticks adjacent to
   backslashes, and anything else you can think of.
2. `midSentence` decides whether a `⚠` starts a sentence. Its allow-list is
   `.` `!` `?` `—` `(`, an unescaped `|`, a `(n)` enumerator, and a closed
   `~~retraction~~`. **Find a false positive or a false negative.**
3. `paragraphs` must treat list blocks and fenced code blocks as NOT
   paragraphs, and narrative prose as paragraphs. **Find a GFM construct it
   gets wrong** — setext headings, indented code, lazy continuation,
   blockquotes, nested lists, HTML blocks, tables without leading pipes.
4. `judgeRow` counts `⚠`, `⚠⚠` and a bold ratio per row. **Find a way to write
   a row that a reader sees as heavily marked but the counter does not.**
5. In `break-emphasis-gate.sh`, `probe()` classifies a run as PASS/FAIL/CONTROL
   from a verdict line plus an exit code, and calls anything else CRASH.
   **Find a way a probe could still report success without exercising what it
   names.**

## Rules

- **A finding must come with a concrete input and the behaviour you predict.**
  "This might be fragile" is not a finding.
- If you believe a construct is handled correctly, say so plainly — a clean
  answer on a question is useful, but only if you actually checked it.
- Grade each finding HIGH / MEDIUM / LOW and say what it would cost.
- **Do not propose a rewrite.** Name the defect and the input that shows it.

---

## FILE 1 of 3 — `tools/check-emphasis.ts` (complete)

```typescript
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
export function maskCodeSpans(line: string): string {
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

/** Characters inside matched `**…**` pairs. Markers themselves are not counted. */
export function boldChars(masked: string): number {
  let n = 0;
  const re = /\*\*([\s\S]+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) n += m[1].length;
  return n;
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
 * enforcing it. **Removed after measuring the cost: across 795 marks in the
 * register the two account for 5** — `;` four times and `:` once, against 597
 * full stops — so the register never depended on them. The complete allow-list
 * is now `.` `!` `?` `—` `(`, an unescaped `|`, a `(n)` enumerator and a closed
 * `~~retraction~~`, and every one of them is named in the printed disclosure.
 *
 * ⚠ **The `|` is a CELL boundary, and one character of lookback decides it** —
 * the same convention `build-claims-index.ts::splitCells` uses, validated there
 * against `cmark-gfm`. `\|` is content, so it does not start a cell.
 */
export function midSentence(before: string): boolean {
  let b = before.replace(/\s+$/, "");
  if (b === "") return false;
  if (/\([0-9a-z]{1,3}\)$/.test(b)) return false;
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
  const doubles = (masked.match(/⚠⚠/g) || []).length;
  const warns = (masked.match(/⚠/g) || []).length;
  const boldRatio = masked.length ? boldChars(masked) / masked.length : 0;
  let mid = 0;
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] !== "⚠") continue;
    if (i > 0 && masked[i - 1] === "⚠") continue;
    if (midSentence(masked.slice(0, i))) mid++;
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
export function paragraphs(text: string): Para[] {
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
    if (/^\s*$/.test(l)) { flush(); continue; }
    // ⚠ **`1)` IS AN ORDERED-LIST MARKER IN GFM AND THIS REGEX READ ONLY `1.`**
    // until `REVIEW-043`, so a parenthesised list over 800 characters was
    // measured as a narrative paragraph and FALSE-FAILED rule 6 — the exact
    // false positive the rule's own note (E-247's shape) exists to prevent.
    // Confirmed against `cmark-gfm`: `1)` renders as `<ol><li>`.
    if (/^\s*([-*+]|\d+[.)])\s/.test(l)) { flush(); inList = true; continue; }
    if (inList && /^\s{2,}\S/.test(l)) { flush(); continue; }
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
const CLAUDE_PARA_BASELINE = 13;

/** Density is REPORTED for these and enforced for none of them. */
const DENSITY_FILES = ["CLAIMS.md", "CLAUDE.md", "README.md", "UPSTREAM-FEEDBACK.md"];

// ---------------------------------------------------------------------------
// Controls. Every one runs through the detector the real check calls, and the
// count is incremented by the helper that runs them (`CLAIMS.md` E-203).
// ---------------------------------------------------------------------------

let controls = 0;
let controlFailures = 0;

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

function runControls(): void {
  console.log("Controls — each one calls the same detector the real check calls\n");

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
    "A `⚠` DISCUSSED in prose — *\"beneath the ⚠⚠ banner\"* — is counted as a mark unless it is inside backticks. Writing about the notation costs the row its budget. The asserted-uncaught control above fails if that ever stops being true.",
    "Rule 5 counts `**` only. Emphasis by CAPITALS, by single-`*` italics, or by sheer sentence length is invisible to it, and the register uses all three.",
    "`CLAUDE.md`'s paragraph check is a RATCHET over a count. It catches a new long paragraph; it does not catch one long paragraph being swapped for another. A bound, not a guarantee.",
    "The cutoff is enforced by row ID, not by date. A row inserted with an old id — an `E-3b` beside `E-3a` — is grandfathered however recently it was written.",
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
  if (claudeOver.length > CLAUDE_PARA_BASELINE) {
    console.log(`\nFAIL  CLAUDE.md: ${claudeOver.length} paragraphs over ${MAX_PARA} characters, ` +
      `baseline ${CLAUDE_PARA_BASELINE}. The ratchet only turns one way.`);
    for (const p of claudeOver.sort((a, b) => b.len - a.len).slice(0, 5))
      console.log(`      :${p.line}  ${p.len}  "${p.head}…"`);
    failures++;
  } else {
    console.log(`  CLAUDE.md: ${claudeParas.length} narrative paragraphs, ${claudeOver.length} over ` +
      `${MAX_PARA} characters, ratchet baseline ${CLAUDE_PARA_BASELINE}.`);
    if (claudeOver.length < CLAUDE_PARA_BASELINE)
      console.log(`    ⚠ Below the baseline. Lower CLAUDE_PARA_BASELINE to ${claudeOver.length} so the ratchet keeps its grip.`);
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
 * A crash cannot print this line, so a caller that requires it, and requires it
 * to agree with the exit code, can separate the three outcomes.
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
```

## FILE 2 of 3 — `tools/break-emphasis-gate.sh` (complete)

```bash
#!/usr/bin/env bash
#
# break-emphasis-gate.sh — verify `check-emphasis` by BREAKING it, in both
# directions, against the real tree.
#
#   tools/break-emphasis-gate.sh
#
# ⚠⚠ **A gate that has never been broken is a claim, not an instrument.** This
# repository has recorded four gates that reported PASS while the thing they
# checked was broken (`CLAIMS.md` E-165, E-168, E-182, E-203), and each was
# found by mutating the tree rather than by reading the check. So the mutations
# are committed, and the next session can re-run them instead of inheriting a
# sentence in a commit message.
#
# ⚠ **The exit code distinguishes two failures and the distinction is the
# point.** `rc=1` is the TREE failing a rule; `rc=2` is a CONTROL failing, which
# says the detector is wrong and nothing it reported can be believed. A probe
# that expects `rc=1` and gets `rc=2` passed for the wrong reason: it tripped a
# control before reaching the branch it names. That happened here — raising the
# cutoff hit a control hardcoding `E-249` instead of the vacuity branch — and it
# is why the cutoff controls are derived from `CUTOFF` (`CLAIMS.md` E-253).
#
# ⚠ Refuses to run on a dirty tree, so an interrupted run is recoverable with
# `git checkout -- CLAIMS.md CLAUDE.md tools/check-emphasis.ts`.
set -u
R="$(cd "$(dirname "$0")/.." && pwd)"
cd "$R"

if [ -n "$(git status --porcelain -- CLAIMS.md CLAUDE.md tools/check-emphasis.ts)" ]; then
  echo "REFUSED: CLAIMS.md, CLAUDE.md or tools/check-emphasis.ts is dirty."
  echo "         This script mutates all three. Commit or stash first, so an"
  echo "         interrupted run is recoverable with git checkout."
  exit 3
fi

TMP="$(mktemp -d)"
trap 'cp "$TMP"/CLAIMS.md CLAIMS.md; cp "$TMP"/CLAUDE.md CLAUDE.md; cp "$TMP"/check-emphasis.ts tools/check-emphasis.ts; rm -rf "$TMP"' EXIT
cp CLAIMS.md CLAUDE.md "$TMP/"; cp tools/check-emphasis.ts "$TMP/"
restore(){ cp "$TMP"/CLAIMS.md CLAIMS.md; cp "$TMP"/CLAUDE.md CLAUDE.md; cp "$TMP"/check-emphasis.ts tools/check-emphasis.ts; }

FAILED=0
py(){ python3 -c "$1"; }

# ⚠⚠ **PINNED TO A COMMIT, NOT TO `main`.** This probe reproduces the real
# defect by re-appending the 4,811-character paragraph the rewrite replaced —
# and it used to read it from `main:CLAIMS.md`. **The moment this branch merges,
# `main` carries the rewritten table and that line is gone**, so the lookup
# raises and the probe reports a failed mutation forever after. A reusable
# harness may not depend on a moving reference to the state it exists to
# reproduce (`CLAIMS.md` E-258).
#
# ⚠ The pin asserts the paragraph's LENGTH as well as its presence, so a pin
# that ever resolves to something else fails loudly instead of mutating with the
# wrong text. If the commit is unreachable — a shallow clone — the probe reports
# the mutation as failed, which is the safe direction.
PRE_REWRITE_PIN=124e95910bb223cc0cbf4c9fcf018aa07d60ec71
PRE_REWRITE_PARAGRAPH="import io,subprocess,sys
r=subprocess.run(['git','show','$PRE_REWRITE_PIN:CLAIMS.md'],capture_output=True,text=True)
if r.returncode: sys.exit('pinned commit $PRE_REWRITE_PIN unreachable: '+r.stderr.strip())
hits=[l for l in r.stdout.split(chr(10)) if l.startswith('**Last revised 2026-08-25**')]
if len(hits)!=1: sys.exit('expected 1 pre-rewrite paragraph at the pin, found %d' % len(hits))
if len(hits[0])!=4811: sys.exit('pinned paragraph is %d characters, expected 4811' % len(hits[0]))
p='CLAIMS.md'
t=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(t+chr(10)+chr(10)+hits[0]+chr(10))"

# probe <name> <PASS|FAIL|CONTROL> <mutation…>
#
# ⚠⚠ **CLASSIFIED BY THE GATE'S OWN VERDICT LINE, NOT BY THE EXIT CODE ALONE.**
# Its first form read the exit code only, and Bun exits **1** for a syntax
# error, a failed import and an uncaught throw — the same code the gate uses for
# *the tree broke a rule*. So a mutation that stopped the gate from running was
# reported as ✓ by every probe expecting FAIL, and any other exit code was
# silently labelled PASS. **A probe passing for the wrong reason is this
# script's whole subject, and the script had the defect** (`CLAIMS.md` E-258).
#
# A completed run prints `check-emphasis: verdict=<X> exit=<n>` as its last
# line. A crash cannot. So: no verdict line, or a verdict disagreeing with the
# exit code, or an exit code outside {0,1,2} is **CRASH** — which is never an
# expected outcome, and prints the tail of the captured output rather than
# discarding it.
probe(){
  local name="$1" want="$2"; shift 2
  if ! "$@" >"$TMP/mutate.log" 2>&1; then
    echo "  ✗ $name — THE MUTATION ITSELF FAILED. A probe that cannot apply is not a probe."
    sed 's/^/        /' "$TMP/mutate.log" | tail -4
    restore; FAILED=1; return
  fi
  bun run tools/check-emphasis.ts >"$TMP/run.log" 2>&1; local rc=$?
  restore

  local said
  said="$(grep -o 'check-emphasis: verdict=[A-Z]* exit=[0-9]*' "$TMP/run.log" | tail -1)"
  local got=CRASH
  case "$said" in
    "check-emphasis: verdict=PASS exit=0")    [ "$rc" = "0" ] && got=PASS ;;
    "check-emphasis: verdict=FAIL exit=1")    [ "$rc" = "1" ] && got=FAIL ;;
    "check-emphasis: verdict=CONTROL exit=2") [ "$rc" = "2" ] && got=CONTROL ;;
  esac

  if [ "$got" = "$want" ]; then
    echo "  ✓ $name — $got (rc=$rc)"
  elif [ "$got" = "CRASH" ]; then
    echo "  ✗ $name — CRASH (rc=$rc, no matching verdict line). The gate did not run;"
    echo "      this probe proved nothing. Last lines of its output:"
    tail -4 "$TMP/run.log" | sed 's/^/        /'
    FAILED=1
  else
    echo "  ✗ $name — wanted $want, got $got (rc=$rc)"; FAILED=1
  fi
}

echo "=============================================================================="
echo "break-emphasis-gate — verifying check-emphasis by breaking it"
echo "=============================================================================="
echo
echo "The GOVERNED rows — each rule must actually fail"
probe "rule 1: a second ⚠⚠ in E-251" FAIL py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-251 | **','| E-251 | ⚠⚠ **X.** ⚠⚠ **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 3: four ⚠ in E-249" FAIL py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 4: a mid-clause ⚠ in E-250" FAIL py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('and the dangling date stood','and ⚠ the dangling date stood',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 5: the whole claim cell of E-250 bolded" FAIL py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');i=[n for n,l in enumerate(L) if l.startswith('| E-250 |')][0];c=L[i].split(' | ');c[1]='**'+c[1].replace('*','')+'**';L[i]=' | '.join(c);io.open(p,'w',encoding='utf-8').write('\n'.join(L))"
probe "rule 5 in a REVISION-HISTORY row, which carries no cutoff" FAIL py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| 2026-08-13 | — | \`REVIEW-001\`','| 2026-08-13 | — | **REVIEW-001 and REVIEW-002 and a verification round, every word of it bold**  \`REVIEW-001\`',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The FORWARD-ONLY property — history must stay untouched"
probe "a GRANDFATHERED row made far worse still passes" PASS py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-100 | ','| E-100 | ⚠⚠ A. ⚠⚠ B. ⚠ C. ⚠ D. ',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "Rule 6 and the recorded exemptions"
probe "the pre-rewrite 4,811-character paragraph, from the pinned commit" FAIL py "$PRE_REWRITE_PARAGRAPH"
probe "a fourteenth over-length paragraph in CLAUDE.md trips the ratchet" FAIL py "import io;p='CLAUDE.md';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t+'\n\n'+'z'*900+'\n')"
probe "the recorded CLAIMS.md exemption's target removed — a STALE exemption" FAIL py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');L=[l for l in L if 'So the honest conclusion is not' not in l];io.open(p,'w',encoding='utf-8').write('\n'.join(L))"

echo
echo "The cutoff, and the fail-closed paths"
probe "the cutoff raised above every row — the VACUITY branch, not a control" FAIL py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('E: 249','E: 9999',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "a row carrying a prefix the cutoff does not cover" FAIL py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 |','| G-1 | placeholder | placeholder | A |\n| E-249 |',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The DETECTOR — neutering it must be caught by the controls, at rc=2"
probe "judgeRow neutered to report nothing" CONTROL py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  return { doubles, warns, boldRatio, midSentence: mid, problems };','  return { doubles, warns, boldRatio, midSentence: mid, problems: [] };',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "the code-span masker turned into the identity function" CONTROL py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function maskCodeSpans(line: string): string {','export function maskCodeSpans(line: string): string { return line;',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "the paragraph splitter made blind to fences" CONTROL py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('if (/^\\\\s*(\`\`\`|~~~)/.test(l)) { flush(); fenced = !fenced; continue; }','',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "midSentence made always-false" CONTROL py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function midSentence(before: string): boolean {','export function midSentence(before: string): boolean { return false;',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "A CRASH is not a verdict — the harness must not read one as the other"
probe "a SYNTAX ERROR in the gate is CRASH, not a rule failure" CRASH py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('export function judgeRow','export function judgeRow(((',1))"
probe "an UNCAUGHT THROW is CRASH, not a rule failure" CRASH py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  runControls();','  runControls();'+chr(10)+'  throw new Error(\"boom\");',1))"
probe "a SUPPRESSED verdict line is CRASH even when the exit code looks right" CRASH py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  console.log(\`check-emphasis: verdict=\${what} exit=\${code}\`);','',1))"

echo
if [ "$FAILED" = "0" ]; then
  echo "PASS: every probe behaved as specified. The gate fails on each rule it claims"
  echo "      to enforce, passes on history it claims to leave alone, and its controls"
  echo "      catch a neutered detector."
  echo "⚠ This says the gate DETECTS these shapes. It says nothing about the shapes it"
  echo "  does not model — check-emphasis prints those itself."
else
  echo "FAIL: a probe misbehaved. Either the gate no longer detects what it claims,"
  echo "      or a mutation has rotted against the tree it edits. Both need reading."
fi
exit $FAILED
```

## FILE 3 of 3 — `docs/EMPHASIS-DISCIPLINE.md` (complete, the specification)

# Emphasis discipline

**Status:** specified 2026-09-09, **enforced the same day** by
`tools/check-emphasis.ts` (`make check-emphasis`), forward from a cutoff the
gate prints. `tools/break-emphasis-gate.sh` is the fifteen mutations that verify
it. ⚠ Rules 1, 3, 4, 5 and 6 are enforced; **rule 2 is not machine-checkable and
is not checked**, which the gate says on every run.

## The measurement that produced this

No convention was ever written down. Density grew by accretion, monotonically,
at every sample:

| | ⚠ per KB of `CLAIMS.md` |
|---|---|
| 2026-08-16 | 0 |
| 2026-08-20 | 0.5 |
| 2026-08-27 | 1.1 |
| 2026-09-06 | 2.1 |

Per-row, the same shape: **0.6 per KB across E-1…E-99, 2.3 across the whole
register, 4.0 across E-244…E-248** — the rows written in the session that
measured this. **The session complaining about the drift was its largest single
amplifier.**

The `Revision history` section is the worst instance and is what prompted the
rule: **one paragraph of 4,811 characters, 42 bold runs inside it, 37% of the
section's characters inside `**`.** Past roughly a third, bold is the baseline
and marks nothing.

⚠ **Rewritten as a table on 2026-09-09, and the wall turned out to be hiding
two things.** The log had not been maintained since 2026-08-25 — 62 commits and
118 rows earlier — and the `2026-08-17` entry's body had been deleted on
2026-08-18, leaving a date, a comma and nothing after it, for twenty-two days.
**Neither was found by reading; both were found by giving every entry cells.**
`CLAIMS.md` E-249 and E-250.

## Why it matters here

This register's whole purpose is that a reader can tell a claim from its
evidence and a live statement from a retracted one. **Emphasis is the instrument
that carries that distinction, and an instrument used on everything measures
nothing.** `REVIEW-039`'s reader leg already reported the symptom: with several
ordinal counters shouting at once it was hard to tell which belonged to which
failure mode.

⚠ The project already knows these marks are internal scaffolding —
`.claude/commands/upstream-issue.md` strips them before anything is filed
upstream: *"No internal emphasis style."*

## The rules

1. **`⚠⚠` — at most ONE per row.** It marks the single thing that would cost the
   next session real time if they missed it. A row with two is a row that has
   not decided what its headline is.
2. **`⚠` marks a RETRACTION or a CORRECTION** — a statement that was made and is
   now withdrawn, or a number that was wrong. **It does not mean "important".**
   Importance is what the row is for.
3. **At most THREE `⚠` per row**, `⚠⚠` included.
4. **A `⚠` starts a sentence.** Never mid-sentence, never mid-clause.
5. **Bold carries the claim, not the prose.** At most **20%** of a row's
   characters inside `**`. The claim's headline and the retracted phrase being
   quoted are the normal uses.
6. **No paragraph over 800 characters** in a narrative section (`Revision
   history`, section notes, `CLAUDE.md` prose). A chronological log belongs in
   a table — this register's own idiom — not in a wall.

   ⚠ **A "paragraph" here is prose only.** A list block and a fenced code block
   are not paragraphs, however long they run: a reader scans a list by its
   bullets. Found by applying this rule to the document that states it — the
   first draft flagged its own 1,437-character bullet list, which is a false
   positive of the measurement, not a violation. **The gate must split on list
   and fence boundaries, and a control must pin that.**

## Scope, and what is deliberately NOT changed

⚠ **Enforced forward, from the cutoff row recorded in the gate.** Existing rows
are left as written.

**That is not laziness, it is this register's own principle**: it keeps
retracted claims rather than rewriting them, because the record of what was
believed is evidence. Reformatting 955 historical marks would rewrite the
evidence of how the drift happened — **and this document is that evidence.**

**The one exception is `Revision history`**, which is a navigational surface
rather than a claim record. It is rewritten as a table.

## The gate

`tools/check-emphasis.ts`, `make check-emphasis`:

- per row after the cutoff: `⚠⚠` ≤ 1, total `⚠` ≤ 3, bold ratio ≤ 20%
- no `⚠` preceded on its line by a non-space, non-`(`, non-`—` character
- no narrative paragraph over 800 characters in the named files
- ⚠ **controls in both directions**, each running through the real detector: a
  compliant row must pass, and one row violating each rule must fail
- the cutoff is a row id, stated in the gate and printed in its output

## What was built, and where it departs from the specification above

⚠ Three departures, each measured rather than argued:

- **Rule 6 uses two instruments, not one.** `CLAIMS.md` gets a by-name exemption
  list, and each entry must match exactly one over-length paragraph or the gate
  fails. `CLAUDE.md` gets a **ratchet on a count** instead, because its long
  paragraphs are Status blocks that most sessions rewrite: a by-name list over
  them would false-fail on every ordinary edit, and a gate that false-fails gets
  switched off. **A bound, not a guarantee.**
- **The `⚠`-position rule accepts an em dash**, as the bullet above specifies,
  which rule 4's own prose (*"never mid-clause"*) arguably forbids. The gate
  follows the gate's specification and discloses the disagreement rather than
  resolving it silently. **The complete allow-list is `.` `!` `?` `—` `(`, an
  unescaped `|` opening a cell, a `(n)` enumerator and a closed `~~retraction~~`
  — and it is complete because `REVIEW-043` found `;` and `:` in it and in no
  disclosure.** Both were removed: a semicolon joins clauses inside a sentence,
  which is what rule 4 forbids, and the register used the two **five times in
  795 marks**, so nothing depended on them.
- **A `⚠` inside backticks is a mention, not a mark**, and does not count. The
  same masking makes `**` inside a code span not bold. Without it a row that
  discusses the notation spends its whole budget describing it — and a row that
  discusses it *outside* backticks still does, which is one of six residuals the
  gate prints.

  ⚠⚠ **The first masker was a false-pass path, and `REVIEW-043` measured it.**
  It took any backtick as a delimiter, so two shapes GFM renders as **visible
  prose** — a backslash-escaped backtick, and an opening run closed by a run of
  a different length — were blanked, and a governed row written either way
  carried two `⚠⚠` past the gate. It now implements CommonMark's rule and is
  **validated against `cmark-gfm` on nine shapes.**

⚠ **Verify it by breaking it against the real tree** before believing it, and
**do not let it report a number it did not count.** Both were done:
`make break-emphasis-gate` runs the mutations, and two of them were found to
have passed for the wrong reason after every one first reported ✓ (E-253).

⚠⚠ **And a mutation harness bounds itself.** `REVIEW-043` found two false-pass
paths in the masker's *parsing rules* that no mutation of the tree could reach,
and found that the harness read Bun's exit **1** — which a crash also produces —
as *the tree broke a rule*, so a probe whose mutation stopped the gate running
reported ✓. **The gate now prints a verdict line the harness must see and must
find agreeing with the exit code**, and anything else is `CRASH`. E-258.
