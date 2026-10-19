#!/usr/bin/env bun
/**
 * check-negative-claims.ts — a gate for the sentence shape that has failed
 * three times, twice in a single day.
 *
 *   bun run tools/check-negative-claims.ts
 *
 * ## What this is for
 *
 * `UPSTREAM-FEEDBACK.md` is built almost entirely out of statements of the form
 * *"the source does not say X"* — nothing documents it, no field exists, it is
 * not exported, nobody has called it out. Each one is an assertion about a
 * whole corpus, and each one is falsified by a single search.
 *
 * On 2026-08-26, three graded rows failed exactly this way (E-155, E-156):
 *
 *   U-15  quoted a sentence XLS-0096 has never contained, at any revision.
 *   U-12  said a property was "not called out as a selling point anywhere I
 *         found". The spec states it TWICE, once in wording identical to the
 *         benefit claimed as an original reading.
 *   U-10  said "nothing in the documentation says so" about a dependency the
 *         canonical docs document in two places.
 *
 * ⚠ **The reason this shape survives review is that it does not look like a
 * claim.** A quotation has quotation marks to trigger suspicion. A benchmark
 * number visibly wants a methodology. "Nobody has documented this" reads as
 * modesty, and both a self-review and an external reviewer can slide past it.
 *
 * So the gate is not "review harder". It is: **a row asserting a negative must
 * carry the search that would falsify it, in the row.**
 *
 * ## What counts as a falsifier
 *
 * A recorded search a later reader can re-run or check: a `grep`/`rg` command,
 * an explicit occurrence count ("0 occurrences", "zero matches"), a named file
 * plus line, or a dated check against a named source. Prose confidence is not a
 * falsifier. Neither is a grade.
 *
 * ## Scope, and why `Observed` is exempt
 *
 * `CLAUDE.md` requires `Observed` rows to be captured at the moment of friction,
 * ungraded and unresearched — demanding a falsifier there would fight the
 * capture rule and lose. The gate therefore binds the sections where a claim has
 * passed the bar: anything Filed, Ready to file, graded, or offered as Positive.
 * `Observed` rows are reported as advisory only.
 *
 * ⚠ **This gate reports a number, and E-141 is the standing warning that a gate
 * reporting a number is making a claim about what the number counts.** Its own
 * detection is therefore pinned by SELF_TESTS below, which run before it will
 * report anything. If the detectors break, this exits non-zero without grading
 * a single row.
 */

import { readFileSync } from "node:fs";

/**
 * Phrases that assert something is absent from a corpus.
 *
 * ⚠ **Each pattern is PAIRED with a probe string that only it should match.**
 * An earlier version kept the patterns in a bare list and self-tested them
 * against whole sentences; breaking one pattern did not fail the tests, because
 * a second pattern matched the same sentence. That is a false-pass mode in the
 * gate's own test — `CLAUDE.md`'s round-two lesson, reproduced here at the cost
 * of one revert. Pairing each pattern with its own probe is what makes a broken
 * detector detectable.
 */
const NEGATIVE_MARKERS: { pattern: RegExp; probe: string }[] = [
  { pattern: /\bnothing (?:in|about|says|said|forces|prevents|collects)\b/i, probe: "nothing in the docs" },
  { pattern: /\bno (?:mention|such field|corresponding|error|warning|counterpart|way|canonical|published|separate)\b/i, probe: "there is no mention" },
  { pattern: /\bnot (?:called out|advertised|documented|exported|stated|specified|published|surfaced|mentioned)\b/i, probe: "it is not advertised" },
  { pattern: /\b(?:does|do|did) not (?:exist|say|state|mention|appear|surface|document)\b/i, probe: "the field does not exist" },
  { pattern: /\bis silent\b/i, probe: "the spec is silent" },
  { pattern: /\bnowhere\b/i, probe: "it appears nowhere" },
  { pattern: /\bundocumented\b/i, probe: "an undocumented hazard" },
  { pattern: /\bnever (?:says|stated|mentions|documented)\b/i, probe: "the header never says" },
  { pattern: /\b(?:I|we) (?:could not|did not|couldn't|didn't) find\b/i, probe: "we could not find it" },
  { pattern: /\banywhere (?:I|we) (?:found|looked)\b/i, probe: "anywhere I looked" },
  { pattern: /\bhas no\b/i, probe: "the API has no lever" },
  { pattern: /\babsent from\b/i, probe: "the symbol is absent from the build" },
];

const NEGATIVE_PATTERNS: RegExp[] = NEGATIVE_MARKERS.map((m) => m.pattern);

/** Evidence that the negative was actually searched for. */
const FALSIFIER_MARKERS: RegExp[] = [
  /\bgrep\b|\brg\b|`grep[^`]*`/i,
  /\b(?:0|zero|no)\s+(?:occurrences?|matches?|hits?|results?)\b/i,
  /\b\d+\s+(?:occurrences?|matches?|hits?)\b/i,
  /\bmatches nothing\b/i,
  /\breturns? nothing\b/i,
  /\b(?:checked|verified|re-?checked|read|confirmed)\b[^|]{0,120}\b20\d\d-\d\d-\d\d\b/i,
  /\b20\d\d-\d\d-\d\d\b[^|]{0,120}\b(?:checked|verified|re-?checked|read|grep)\b/i,
  /\b[A-Za-z0-9_.-]+\.(?:cpp|h|macro|md|ts|sh|json|rs)[:#]\d+/,
  /\bacross (?:the whole|all)\b[^|]{0,60}\b(?:org|tree|repo)\b/i,
];

/** Sections whose rows have passed the bar and are therefore gated. */
const GATED_SECTION = /^##+\s*(?:.*(?:Filed|Ready to file|Positive|New this session|Ecosystem gaps).*)$/i;
/** Explicitly advisory — CLAUDE.md requires these to be ungraded captures. */
const ADVISORY_SECTION = /^##+\s*Observed/i;
/** Rows here are already retired; a withdrawal is not a live claim. */
const EXEMPT_SECTION = /^##+\s*(?:Withdrawn|Considered and deliberately NOT filed|The bar for anything)/i;

interface Row {
  id: string;
  line: number;
  section: string;
  text: string;
}

function hit(text: string, pats: RegExp[]): string | null {
  for (const p of pats) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

/** Rows are `| U-12 | ... |`. Struck ids (`~~U-10~~`) are retired, not live. */
function parseRows(md: string): Row[] {
  const rows: Row[] = [];
  let section = "(preamble)";
  md.split("\n").forEach((line, i) => {
    if (/^##+\s/.test(line)) {
      section = line.replace(/^#+\s*/, "").trim();
      return;
    }
    const m = line.match(/^\|\s*(~~)?([A-Z]-\d+)(~~)?\s*\|/);
    if (!m) return;
    if (m[1]) return; // struck through: withdrawn, not a live claim
    rows.push({ id: m[2], line: i + 1, section, text: line });
  });
  return rows;
}

function classify(section: string): "gated" | "advisory" | "exempt" {
  if (EXEMPT_SECTION.test("## " + section)) return "exempt";
  if (ADVISORY_SECTION.test("## " + section)) return "advisory";
  if (GATED_SECTION.test("## " + section)) return "gated";
  return "advisory";
}

/**
 * The gate's own claim, pinned. Each case asserts what the detectors must say.
 * ⚠ These run BEFORE any row is graded. A broken detector must not be able to
 * report "0 violations" — that is the E-141 failure mode one layer up.
 */
const SELF_TESTS: { name: string; text: string; negative: boolean; falsifiable: boolean }[] = [
  {
    name: "U-12's real wording — a negative with no falsifier",
    text: "It is not called out as a selling point anywhere I found",
    negative: true,
    falsifiable: false,
  },
  {
    name: "U-10's real wording — a negative with no falsifier",
    text: "Nothing in XLS-96, XLS-80 or the MPT documentation says so",
    negative: true,
    falsifiable: false,
  },
  {
    name: "a negative WITH a recorded occurrence count",
    text: "the export list omits it (0 occurrences) and the package does not surface it",
    negative: true,
    falsifiable: true,
  },
  {
    name: "a negative WITH a file:line citation",
    text: "no such field exists; sfields.macro:149 names the real one",
    negative: true,
    falsifiable: true,
  },
  {
    name: "a plain positive claim — not a negative at all",
    text: "The transactor decrements both counters and credits no account",
    negative: false,
    falsifiable: false,
  },
];

function runSelfTests(): void {
  const failures: string[] = [];

  // ⚠ Per-pattern coverage FIRST. Without this, breaking one detector is
  // invisible whenever another happens to match the same sentence — which is
  // exactly how the first version of this gate passed while broken.
  NEGATIVE_MARKERS.forEach(({ pattern, probe }, i) => {
    if (!pattern.test(probe)) {
      failures.push(`  NEGATIVE_MARKERS[${i}] no longer matches its own probe: "${probe}"`);
      return;
    }
    const others = NEGATIVE_MARKERS.filter((_, j) => j !== i).map((m) => m.pattern);
    if (hit(probe, others)) {
      failures.push(`  NEGATIVE_MARKERS[${i}]'s probe "${probe}" is also matched by another pattern — it cannot isolate a break`);
    }
  });

  for (const t of SELF_TESTS) {
    const neg = hit(t.text, NEGATIVE_PATTERNS) !== null;
    if (neg !== t.negative) {
      failures.push(`  ${t.name}: expected negative=${t.negative}, detector said ${neg}`);
      continue;
    }
    if (!t.negative) continue;
    const fal = hit(t.text, FALSIFIER_MARKERS) !== null;
    if (fal !== t.falsifiable) {
      failures.push(`  ${t.name}: expected falsifier=${t.falsifiable}, detector said ${fal}`);
    }
  }
  if (failures.length) {
    console.error("SELF-TEST FAILED — the detectors do not do what this gate claims.\n");
    console.error(failures.join("\n"));
    console.error("\nRefusing to grade any row. Fix the detectors first.");
    process.exit(2);
  }
  console.log(`Self-tests: ${NEGATIVE_MARKERS.length} detector probes + ${SELF_TESTS.length} row cases pass. Detectors verified before use.\n`);
}

function main(): void {
  runSelfTests();

  const path = process.argv[2] ?? "UPSTREAM-FEEDBACK.md";
  const md = readFileSync(path, "utf8");
  const rows = parseRows(md);

  const violations: { row: Row; marker: string }[] = [];
  const advisory: { row: Row; marker: string }[] = [];
  let negatives = 0;

  for (const row of rows) {
    const kind = classify(row.section);
    if (kind === "exempt") continue;
    const marker = hit(row.text, NEGATIVE_PATTERNS);
    if (!marker) continue;
    negatives++;
    if (hit(row.text, FALSIFIER_MARKERS)) continue;
    (kind === "gated" ? violations : advisory).push({ row, marker });
  }

  console.log(`${path}: ${rows.length} live rows, ${negatives} asserting a negative.\n`);

  if (advisory.length) {
    console.log(`Advisory — ${advisory.length} negative claim(s) in Observed with no recorded search.`);
    console.log("  These are captures, not claims. CLAUDE.md requires them ungraded, so this is");
    console.log("  not a failure — but each one needs its search BEFORE it is ever filed.");
    for (const { row, marker } of advisory) {
      console.log(`    ${row.id} (line ${row.line})  matched: "${marker}"`);
    }
    console.log("");
  }

  if (violations.length) {
    console.error(`FAIL: ${violations.length} graded/filed row(s) assert a negative with no falsifier.\n`);
    for (const { row, marker } of violations) {
      console.error(`  ${row.id}  line ${row.line}  [${row.section}]`);
      console.error(`     asserts: "${marker}"`);
      console.error(`     needs:   the search that would falsify it — a grep, an occurrence count,`);
      console.error(`              a file:line, or a dated check against the named source.\n`);
    }
    console.error("This is E-155/E-156's failure mode. A negative about a corpus is a claim.");
    process.exit(1);
  }

  console.log("PASS: every graded or filed row asserting a negative carries a recorded search.");
  console.log("");
  console.log("⚠ This says the falsifier is PRESENT. It does not say it was re-run today, and it");
  console.log("  cannot: an upstream corpus moves. Four rows have been withdrawn because a gap");
  console.log("  closed upstream between writing and filing. Re-run the search before you file.");
}

main();
