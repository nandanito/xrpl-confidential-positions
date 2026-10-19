/**
 * `check-filing` — the mechanical half of `docs/UPSTREAM-FILING-PROTOCOL.md`.
 *
 *   make check-filing FILE=docs/upstream-filings/<date>/NN-name.md
 *
 * Five checks, from the five rules:
 *
 *   1. **Length.** At most `WORD_LIMIT` words, excluding code blocks, block quotes and
 *      the disclosure footer.
 *   2. **One ask, early.** A concrete request in the first paragraph.
 *   3. **No positives-only filing.** An issue tracker is for things that need
 *      doing.
 *   4. **Every negative claim carries its search.**
 *   5. **Plain English.** Sentence length, project shorthand, internal emphasis.
 *
 * ⚠ **It is LEXICAL and it cannot tell whether a claim is TRUE.** That is rule
 * 1's adversarial review, which is a person or another model, not this file.
 * This gate only stops shapes that have already gone wrong — `CLAIMS.md` E-155
 * and E-156.
 *
 * ⚠ **Gates in this repository have been built to catch false passes and have
 * false-passed** (E-165, E-168, E-182, E-203, E-207, E-215). Every check here is
 * a named function, every control runs through the same function the real check
 * calls, and the control count is incremented by the helper that runs them.
 */

import { readFileSync, existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// The detectors. Controls below call THESE, never a copy.
// ---------------------------------------------------------------------------

export const WORD_LIMIT = 300;
export const SENTENCE_WORD_LIMIT = 30;

/** The issue body: everything after the first `---` line. */
export function bodyOf(text: string): string {
  const i = text.indexOf("\n---\n");
  return i < 0 ? text : text.slice(i + 5);
}

/**
 * Prose only — code blocks, block quotes and the disclosure footer removed.
 *
 * ⚠ Quoted source and permalinks are **encouraged** by the protocol, so
 * counting them against the limit would push a filing toward paraphrasing its
 * evidence, which is the opposite of what rule 2 wants.
 */
export function prose(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, " ")     // ⚠ HTML comments are not prose, and the first version counted them
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*>.*$/gm, " ")
    .replace(/^\s*\*Disclosure:[\s\S]*$/m, " ")
    .replace(/^\s*>?\s*⚠ \*\*SUPERSEDED[\s\S]*?\*\*\s*$/gm, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

export function wordCount(body: string): number {
  return prose(body).split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
}

/**
 * Sentences longer than the limit, as [sentence, words] pairs.
 *
 * ⚠ **Headings and list items are sentence boundaries too, and the first
 * version did not treat them as such** — it reported a 110-word "sentence" that
 * was a `###` heading followed by a bullet list. **A check that flags a
 * structure as a run-on sentence trains the author to ignore it**, which is how
 * a wording gate stops working (`CLAIMS.md` E-215's shape, in a new gate).
 */
export function longSentences(body: string): [string, number][] {
  return prose(body)
    .split(/\n\s*[-*]\s+|\n\s*\d+\.\s+|\n#{1,6}\s+|\n\s*\n/)   // structure ends a sentence
    .flatMap((block) => block.replace(/^#{1,6}\s+/, "").split(/(?<=[.!?:])\s+/))
    .map((s) => [s.trim(), s.trim().split(/\s+/).filter(Boolean).length] as [string, number])
    .filter(([, n]) => n > SENTENCE_WORD_LIMIT);
}

/** Negative-claim shapes. Mirrors `check-negative-claims`, applied to a draft. */
export const NEGATIVE_SHAPES = [
  /\bno such (field|method|type|flag|parameter)\b/i,
  /\bdoes not (exist|appear|say|document|export)\b/i,
  /\bis not (exported|documented|mentioned|stated)\b/i,
  /\bnot (called out|documented|advertised|mentioned) anywhere\b/i,
  /\bnothing (documents|says|in the spec|states)\b/i,
  /\bnobody has\b/i,
  /\bI could not find\b/i,
  /\bthere is no\b/i,
  /\bappears? (zero|0) times\b/i,
];

/** A recorded search: a command plus what it returned. */
export const SEARCH_MARKERS = [/\bgrep\b/i, /\brg\b/, /\bnpm view\b/i, /\bgh api\b/i, /\breturns? (zero|0|nothing|no)\b/i, /\b0 hits\b/i, /\bsearched\b/i];

/** Paragraphs asserting a negative with no search marker in the same paragraph. */
export function unsearchedNegatives(body: string): string[] {
  const out: string[] = [];
  for (const para of body.split(/\n\s*\n/)) {
    if (!NEGATIVE_SHAPES.some((re) => re.test(para))) continue;
    if (SEARCH_MARKERS.some((re) => re.test(para))) continue;
    out.push(para.trim().replace(/\s+/g, " ").slice(0, 130));
  }
  return out;
}

export const PRAISE_SHAPES = [/\bbetter than (they|it) looked\b/i, /\bdesign decisions?\b.*\bgood\b/i, /\bwell[- ]designed\b/i, /\bpraise\b/i, /\bthank you for\b/i, /\bgot (this|it) right\b/i];
export const DEFECT_SHAPES = [/\bcontradict/i, /\bincorrect\b/i, /\bwrong\b/i, /\berrat(a|um)\b/i, /\bdoes not match\b/i, /\bmissing\b/i, /\bnot exported\b/i, /\bdefect\b/i, /\bmisleading\b/i, /\bunconditional/i, /\bambiguous\b/i, /\bthe opposite\b/i, /\bwill believe\b/i, /\bis not\b.*\btrue\b/i];
export function isPositivesOnly(body: string): boolean {
  return PRAISE_SHAPES.some((re) => re.test(body)) && !DEFECT_SHAPES.some((re) => re.test(body));
}

/**
 * Does the first paragraph say what is wrong?
 *
 * ⚠ **The first version looked for a REQUEST and that was the wrong test.** The
 * protocol wants the *defect* stated in the opening and the *fix* under its own
 * heading — so a well-formed draft that opens *"the page says X, the spec says
 * the opposite"* was failed for not saying "please". **A gate that fails its own
 * template is measuring the wrong thing**, and the template is the positive
 * control precisely so that shows up.
 */
/**
 * ⚠ **Inflections matter, and the first version missed them.** `/\bsuggest\b/`
 * does not match *"Suggested fix"* — the exact phrase this project's own
 * template uses — so the ask detector was weaker than it looked and was passing
 * only because the template also says *"pull request"*. Found by a control
 * written in the same round (`CLAIMS.md` E-220).
 */
export const ASK_SHAPES = [
  /\bplease\b/i, /\bsuggest(s|ed|ing|ion)?\b/i, /\bshould (be|say|read|state)\b/i,
  /\bwould (fix|help|resolve)\b/i, /\bcorrect(ion|ed)?\b/i, /\berrat(a|um)\b/i,
  /\bconsider\b/i, /\brequest(s|ed|ing)?\b/i, /\bpropos(e|ed|al|ing)\b/i,
  /\bfix\b/i, /\bchange\b/i, /\bdocument(s|ed|ing)?\b/i, /\badd\b/i,
  /\bcannot\b/i, /\bexport\b/i,
];
export function hasEarlyAsk(body: string): boolean {
  const first = prose(body).split(/\n\s*\n/).filter((p) => p.trim())[0] ?? "";
  return ASK_SHAPES.some((re) => re.test(first)) || DEFECT_SHAPES.some((re) => re.test(first));
}

/**
 * Is there a concrete REQUEST anywhere in the draft?
 *
 * ⚠⚠ **`hasEarlyAsk` accepts a DEFECT in the opening, which is what the protocol
 * wants there — but nothing then checked that the draft ever ASKS for
 * anything.** A draft saying only *"the documentation is incorrect"*, with no
 * requested change, passed the gate while rule 2 requires **one concrete ask**
 * (`CLAIMS.md` E-220). ⚠ **This was introduced by the fix to an earlier
 * finding**: broadening the early check to accept a defect quietly removed the
 * only place an ask was looked for. The two are separate properties and are now
 * separate checks.
 */
export function hasConcreteAsk(body: string): boolean {
  // ⚠⚠ **HEADINGS ARE NOT ASKS, AND THE FIRST VERSION ACCEPTED ONE.** `prose()`
  // keeps Markdown headings, and the broadened `ASK_SHAPES` match both
  // "Suggested" and "fix" — so a draft copied from the template, carrying an
  // empty `**Suggested fix**` heading and no request under it, passed
  // (`CLAIMS.md` E-221). ⚠ **The heading is the template's own scaffolding, so
  // every draft has it**: matching on it made the check unfalsifiable.
  //
  // An ask is a SENTENCE. Headings, bold-only lines and list bullets shorter
  // than a clause are stripped before the search.
  const text = prose(body)
    .replace(/^#{1,6}\s+.*$/gm, " ")                    // ATX headings
    .replace(/^\s*\*\*[^*\n]{0,60}\*\*\s*$/gm, " ")   // a bold line standing alone
    ;
  // ⚠ **No word-count filter.** The first attempt required five words per line
  // and rejected *"Please document the dependency."* and *"This should say X."*
  // — short but entirely concrete asks. **Caught by a control written in the
  // same round.** Stripping the LABEL is what was needed; length is not a proxy
  // for concreteness.
  return ASK_SHAPES.some((re) => re.test(text));
}

/**
 * A positives-only filing: praise with nothing to do.
 *
 * ⚠ The test is the ABSENCE of a defect, not the presence of praise — a filing
 * may reasonably note that something is well designed on the way to reporting a
 * problem with it.
 */
/** Project shorthand and internal emphasis that must not travel outward. */
export const OUTWARD_BANNED = ["tapFailHard", "⚠⚠", "CLAIMS.md", "UPSTREAM-FEEDBACK.md"];

/** Internal register references of any number: E-215, F-24, P-9, U-54, B-15. */
export const REGISTER_REF = /\b(?:CLAIMS\.md|UPSTREAM-FEEDBACK\.md)?\s*\b[EFPBRU]-\d{1,3}\b/;
export const REVIEW_REF = /\bREVIEW-\d{2,3}[a-z]?\b/;

/**
 * Project vocabulary that must not travel outward.
 *
 * ⚠⚠ **Scanned WITHOUT stripping inline code, and matched GENERICALLY.** The
 * first version ran on `prose()`, which blanks `` `...` `` spans — so a
 * backticked `` `tapFailHard` `` sailed through, which is **the most likely way
 * anyone would actually write it**. And the ban list held literal prefixes
 * `E-1`, `F-2`, `P-5`, so `E-215` matched none of them (`CLAIMS.md` E-220).
 *
 * ⚠ Fenced code blocks ARE still removed: a filing may legitimately quote a
 * command or a source line containing anything.
 */
export function outwardLeaks(body: string): string[] {
  const scanned = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\*Disclosure:[\s\S]*$/m, " ");
  const found = OUTWARD_BANNED.filter((n) => scanned.includes(n));
  const reg = scanned.match(REGISTER_REF);
  if (reg) found.push(reg[0].trim());
  const rev = scanned.match(REVIEW_REF);
  if (rev) found.push(rev[0]);
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------

export function whatThisDoesNotSay(): string[] {
  return [
    "1. It cannot tell whether a claim is TRUE. Every defect in the 2026-08-26 round was a claim that " +
      "was false or overstated, and not one of them would have been caught by counting words. Rule 1's " +
      "adversarial review is the instrument for that.",
    "2. The negative-claim shapes are a NAMED LIST. A negative phrased differently is invisible.",
    "3. It reads the draft, not the sources. A citation to a line that has moved still passes.",
    "4. It cannot check that authorisation was given, or that the review in rule 1 actually ran.",
  ];
}

/**
 * Files that are allowed to state the limit in prose, and are checked to agree.
 *
 * ⚠ **The first version checked ONE file and claimed a "two-copy invariant"
 * while `Makefile` and `CLAUDE.md` were also telling agents "300".** Four active
 * copies, two of them unchecked — so changing `WORD_LIMIT` would have left two
 * documents confidently wrong and the guard still green. Those two now state no
 * number; the protocol states the rule and **every file in this list is
 * verified**.
 *
 * ⚠ **`CLAIMS.md` is deliberately absent and that is not an exemption of
 * convenience**: it is an append-only record of what was true when each row was
 * written, so a row naming an old limit is correct history and must not be
 * rewritten. **Nothing else may be added to that reasoning without a row of its
 * own.**
 */
export const LIMIT_STATING_FILES = ["docs/UPSTREAM-FILING-PROTOCOL.md"];

/**
 * Does every file allowed to state the limit agree with `WORD_LIMIT`?
 *
 * ⚠ **Takes its sources as an argument so a control can drive it with a
 * deliberately wrong one.** The first control was `Number("999") !== WORD_LIMIT`
 * — an expression that never called this function, so it would have printed
 * `CONTROL ✓` forever after the parser broke. That is the same-function
 * invariant this file states at the top and then violated.
 */
export function limitDisagreements(
  read: (f: string) => string,
  files: string[] = LIMIT_STATING_FILES,
): string[] {
  const bad: string[] = [];
  for (const f of files) {
    let text: string;
    try { text = read(f); } catch { bad.push(`${f}: unreadable`); continue; }
    const m = text.match(/at most (\d+) words/i);
    if (!m) { bad.push(`${f}: states no 'at most N words' rule`); continue; }
    if (Number(m[1]) !== WORD_LIMIT) bad.push(`${f}: says ${m[1]}, WORD_LIMIT is ${WORD_LIMIT}`);
  }
  return bad;
}

/** Any file OUTSIDE the allowed list that states a limit is drift by definition. */
export function straySources(read: (f: string) => string, files: string[]): string[] {
  return files.filter((f) => /at most \**\d+\** words/i.test((() => { try { return read(f); } catch { return ""; } })()));
}

// ---------------------------------------------------------------------------
// The runner. ⚠ **Guarded, so the detectors above can be IMPORTED and tested.**
// `check-zeroize-bounds.py` cannot be imported without running its whole gate,
// which is why its stripper had to be re-derived rather than shared (E-207).
// This file does not repeat that.
// ---------------------------------------------------------------------------

let controls = 0;
let failures = 0;
const control = (label: string, passed: boolean, detail: string) => {
  controls++;
  console.log(passed ? `  CONTROL ✓ ${label}` : `  CONTROL ✗ ${label} — ${detail}`);
  if (!passed) failures++;
};
const check = (label: string, passed: boolean, detail: string) => {
  console.log(passed ? `  ✓ ${label}` : `  ✗ ${label}\n      ${detail}`);
  if (!passed) failures++;
};

function main() {
const file = process.env.FILE ?? process.argv[2];
console.log("check-filing — docs/UPSTREAM-FILING-PROTOCOL.md");
console.log("=".repeat(74));

if (!file) {
  console.log("\nusage: make check-filing FILE=<draft.md>");
  console.log("⚠ No file given. This gate checks ONE draft; it does not sweep a directory,");
  console.log("  because a sweep over zero files is a pass that means nothing.");
  process.exit(2);
}
if (!existsSync(file)) { console.log(`\nFAIL: ${file} does not exist.`); process.exit(1); }

const body = bodyOf(readFileSync(file, "utf8"));
console.log(`\n  draft: ${file}`);

console.log("\nRule 2 — every file allowed to state the limit agrees with the gate");
const readFile = (f: string) => readFileSync(f, "utf8");
const disagreements = limitDisagreements(readFile);
check(`${LIMIT_STATING_FILES.length} file(s) may state the limit, and all agree with WORD_LIMIT=${WORD_LIMIT}`,
  disagreements.length === 0, disagreements.join("\n      "));

// ⚠ Nothing outside the allowed list may state a limit at all. CLAIMS.md is
// append-only history and is excluded by name, with the reason at the constant.
const OTHER_LIVE_DOCS = ["Makefile", "CLAUDE.md", "docs/upstream-filings/TEMPLATE.md",
                         ".claude/commands/upstream-issue.md", ".claude/commands/issue-review.md"];
const strays = straySources(readFile, OTHER_LIVE_DOCS);
check("no other live document restates the limit", strays.length === 0,
  `${strays.join(", ")} state a number they are not the source of`);

control("a DISAGREEING file IS caught, THROUGH THE REAL FUNCTION",
  limitDisagreements(() => "A filing is at most 999 words, with one concrete ask.").length === 1,
  "⚠ the checker did not report a mismatch it was handed — the control now drives the real parser");
control("a file stating NO rule is reported, not silently passed",
  limitDisagreements(() => "this document states no limit at all").length === 1,
  "a missing rule was treated as agreement");
control("an AGREEING file is NOT reported",
  limitDisagreements(() => `A filing is at most ${WORD_LIMIT} words, with one concrete ask.`).length === 0,
  "a correct file was flagged");
control("the stray detector CATCHES a restatement elsewhere",
  straySources(() => "prose is at most **300** words", ["x.md"]).length === 1,
  "the stray detector missed a restated limit");

console.log(`\nRule 2 — at most ${WORD_LIMIT} words, one ask, stated early`);
const words = wordCount(body);
check(`prose is ${words} words (limit ${WORD_LIMIT})`, words <= WORD_LIMIT,
  `${words - WORD_LIMIT} over. Link evidence instead of inlining the argument for it.`);
check("the opening states the defect or the ask", hasEarlyAsk(body),
  "the opening paragraph states no defect and requests no change");
check("the draft asks for something concrete, somewhere", hasConcreteAsk(body),
  "⚠ it reports a problem and never requests a change. Rule 2 wants ONE CONCRETE ASK — " +
  "say what should happen, even as 'one possible approach'.");

control("an EMPTY '**Suggested fix**' heading is NOT an ask",
  !hasConcreteAsk("The docs are incorrect.\n\n**Suggested fix**\n"),
  "⚠ the template's own heading satisfied the check, making it unfalsifiable");
control("a heading WITH a real request under it IS an ask",
  hasConcreteAsk("The docs are incorrect.\n\n**Suggested fix**\n\nChange the sentence to say the value is publicly recomputable."),
  "a genuine request under a heading was rejected");

control("a defect with NO ask anywhere IS caught",
  !hasConcreteAsk("The documentation is incorrect and contradicts the specification."),
  "⚠ a draft that never asks for anything was accepted — the defect this check exists for");
control("a draft WITH a request is accepted — including inflected forms",
  hasConcreteAsk("The page is wrong.\n\nSuggested fix: say the value is recomputable.") &&
  hasConcreteAsk("This should say X.") &&
  hasConcreteAsk("Please document the dependency."),
  "⚠ a real request was not recognised — check the inflection, not just the stem");

control("an over-long draft IS caught", wordCount("word ".repeat(400)) > WORD_LIMIT, "the counter did not exceed the limit");
control("code blocks and quotes do NOT count toward the limit",
  wordCount("```\n" + "x ".repeat(500) + "```\n> " + "y ".repeat(500)) < 20,
  "quoted evidence was counted, which pushes drafts toward paraphrasing their sources");
control("an opening with no defect and no ask IS caught",
  !hasEarlyAsk("I was reading the specification this week and found it enjoyable.\n\nmore text"),
  "a paragraph stating nothing wrong was accepted");
control("an opening that STATES THE DEFECT is accepted without saying please",
  hasEarlyAsk("The page says X. The specification says the opposite, and rippled follows the specification."),
  "⚠ a well-formed opening was failed for not containing a request — the gate's own template shape");
control("HTML comments do not count as the first paragraph",
  hasEarlyAsk("<!-- a long editorial note about how to use this template -->\n\nThe page contradicts the spec."),
  "an HTML comment was read as the opening paragraph");

console.log("\nRule 4 — every negative claim carries its search");
const bare = unsearchedNegatives(body);
check("no unsearched negative claim", bare.length === 0, bare.join("\n      "));
control("an unsearched negative IS caught",
  unsearchedNegatives("There is no such field anywhere in the specification.").length > 0,
  "the detector missed a bare negative");
control("the SAME claim with a recorded search is NOT caught",
  unsearchedNegatives("There is no such field: `grep -n RevealedAmount` over the field tables returns 0 hits.").length === 0,
  "a properly searched negative was flagged, which trains authors to drop the search");

console.log("\nRule 3 — no positives-only filing to a bug tracker");
check("the draft reports something that needs doing", !isPositivesOnly(body),
  "this reads as appreciation with no defect. Capture it in UPSTREAM-FEEDBACK.md instead.");
control("a praise-only draft IS caught",
  isPositivesOnly("Four design decisions that were better than they looked. Thank you for the auditor ciphertext."),
  "a positives-only filing was accepted");
control("praise ALONGSIDE a defect is NOT caught",
  !isPositivesOnly("The auditor ciphertext is well-designed, but §13.1 is incorrect and contradicts the transactor."),
  "a real defect report was rejected for containing a compliment");

console.log("\nRule 5 — plain English, nothing internal travels outward");
const leaks = outwardLeaks(body);
check("no project shorthand or internal register reference", leaks.length === 0,
  `remove: ${leaks.join(", ")} — say \`fail_hard\`, not project vocabulary`);
const longs = longSentences(body);
check(`no sentence over ${SENTENCE_WORD_LIMIT} words (${longs.length} found)`, longs.length === 0,
  longs.map(([s, n]) => `${n} words: ${s.slice(0, 110)}…`).join("\n      "));
control("project shorthand IS caught", outwardLeaks("we set tapFailHard on submission").length > 0, "the detector missed tapFailHard");
control("BACKTICKED shorthand is caught — the way anyone would actually write it",
  outwardLeaks("we set `tapFailHard` on submit").length > 0,
  "⚠ prose() blanked the inline-code span and the shorthand escaped");
control("a register reference of ANY number is caught — E-215, not just E-1",
  outwardLeaks("see E-215 for detail").length > 0 && outwardLeaks("per F-24").length > 0,
  "the ban list held literal prefixes and missed higher numbers");
control("a FENCED code block may contain anything",
  outwardLeaks("```\ngrep -n tapFailHard rippled/\n```\nordinary prose").length === 0,
  "⚠ a quoted command was treated as vocabulary leaking outward");
control("a long sentence IS caught", longSentences("a ".repeat(40) + ".").length > 0, "a 40-word sentence was accepted");
control("a short sentence is NOT caught", longSentences("This field does not exist.").length === 0, "a short sentence was flagged");
control("a HEADING plus a LIST is not one run-on sentence",
  longSentences("### What rippled does\n\n" + Array.from({ length: 6 }, (_, i) => `- item ${i} ` + "w ".repeat(8)).join("\n")).length === 0,
  "⚠ structure was read as prose — the false positive that trains authors to ignore this check");

console.log("\n  What this gate does NOT say:");
for (const l of whatThisDoesNotSay()) console.log(`    ${l}`);

console.log("\n" + "-".repeat(74));
if (failures > 0) { console.log(`FAIL: ${failures} check(s) or control(s) did not land as declared.`); process.exit(1); }
console.log(`PASS: within ${WORD_LIMIT} words, one early ask, no unsearched negative, a real`);
console.log(`      defect reported, and no internal vocabulary — under ${controls} controls, a count`);
console.log(`      incremented by the helper that runs them.`);
console.log(`⚠ LEXICAL, over a NAMED SET. It does not check whether the claim is true.`);
}

if (import.meta.main) main();
