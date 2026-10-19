# REVIEW-045 leg B — do the DESCRIPTIONS match the CODE?

You have no repository. You have four things: two source files, one adjudication
document, and three register rows that describe what those files do.

**Your single question: is any sentence in the adjudication or the register rows
FALSE, OVERSTATED, or UNSUPPORTED by the code you can see?**

This project has a recorded habit of writing a correct fix and then describing
it wrongly — a fix report claiming completeness it does not have, a count
restated instead of derived, a comment naming the wrong thing, a citation to a
section that does not exist. Round one and round two of this review both found
one. **You are looking for the third.**

## What counts as a finding

- A claim in the prose that the code contradicts. Quote both.
- A number that the code cannot produce, or that is stated without its unit or
  its predicate.
- A guarantee stated more broadly than the code delivers — especially the word
  "every", "all", "cannot", "never", or "always".
- A citation to something that is not there.
- A residual the prose says is disclosed, where the disclosure does not exist or
  does not say that.

## What does NOT count

- Style. Length. Tone.
- Defects in the code that the prose does not misdescribe — another leg has
  that job. If you find one anyway, report it, but mark it clearly as a code
  finding rather than a description finding.

Grade each HIGH / MEDIUM / LOW. **Quote the sentence and the code side by
side.** If you check a claim and it is TRUE, say so — a verified claim is
evidence too.

---

## DOCUMENT 1 of 4 — the round-two adjudication (complete)

# REVIEW-044d — adjudication, ROUND TWO on the emphasis gate's fixes

- **Rotation:** `REVIEW-044` — round two, reviewing `REVIEW-043`'s fixes
- **Date:** 2026-09-09
- **Subject:** `ec2e4c5`, frozen at `25d3dc3`
- **Legs, with deliberately differed packets:**
  - `REVIEW-044a` — Codex, **read-only repo** at the frozen commit, told what
    round one found and asked to attack the fixes and run a differential fuzz
  - `REVIEW-044b` — Gemini via `agy`, **no repository and no history**: the two
    tool files and the specification, nothing about what the fixes claim
  - `REVIEW-044s` — self leg, written to a scratchpad and committed after the
    others returned, reading the **fix report against the code**

⚠ The packets differ on purpose. `CLAIMS.md` E-160: identical packets give
unanimity that is one reading distributed. **They found three disjoint sets** —
leg A the two construction defects, leg B nine detector holes, leg S the
evidence and the counts. **No finding was reported by two legs.**

---

## Round two's stopping condition: NOT met

`CLAUDE.md` asks whether the findings have moved from the construction to the
instruments that check it. **They have not.** Leg A found a live false-pass in
the construction and a defect a round-one fix **introduced**. That is category
(a) and category (b) in one round, which is what a second round is for.

---

## Upheld

| # | Leg | Finding | Measured | Fix |
|---|---|---|---|---|
| 1 | A | **The masker paired backticks ACROSS a table-cell boundary.** GFM splits cells before parsing inline code, so a lone backtick in the claim cell and another in the evidence cell are two literal backticks | A governed row showing a reader four `⚠⚠` and 49 bold characters reported `doubles=0, warns=0, bold=0.0%` and passed rules 1, 3 and 5. **Latent, not live: one register row has an odd-backtick cell and zero marks were hidden** | Masking runs per cell, on the same unescaped-pipe split `splitCells` uses |
| 2 | A | **The `1)` fix accepted unlimited digits**; GFM allows nine | `1234567890) …` renders `<p>` and was discarded as a list, so a 912-character wall passed rule 6. **Introduced by a round-one fix** | `\d{1,9}[.)]`, with controls on both sides of the boundary |
| 3 | A | *"A crash cannot print this line"* is **false** | A process printing the verdict then throwing was classified `FAIL` | The verdict must be the **last** line |
| 4 | B | `/\([0-9a-z]{1,3}\)$/` matched any short parenthetical word | `(due) ⚠ …` passed rule 4 | Digits, or a **single** letter — which also fixed `(A)` false-failing |
| 5 | B | `__bold__`, `<b>`, `<strong>` invisible to rule 5 | A 100%-bold row reported `0.0%` | All three counted, deliberately over-counting |
| 6 | B | `⚠️` (variation selector) invisible to rule 1; `&#9888;` invisible to rule 3 | `doubles=0` on `⚠️⚠️`; `warns=0` on four entities | Normalised before counting |
| 7 | B | An HTML comment dilutes rule 5's denominator | 60 bold characters read as 15.6% | Comments removed from the denominator |
| 8 | B | Four false FAILS: `1)` opening a cell, `(A)`, `**~~x~~**`, indented code, lazy continuation | Each reproduced | Fixed; pipe-less tables and HTML blocks are **disclosed** instead, with asserted-uncaught controls |
| 9 | B | `probe()` asserted only that *something* failed | The rule-1 mutation trips rules **1 and 3** | Each probe names a needle that must appear |
| 10 | S | *"Agrees with `cmark-gfm` on nine shapes"* was **a shell command run once and discarded** — four comments cite it, nothing executed it | `grep -c cmark` finds four mentions, no `spawnSync` | **The differential is now a control**, thirteen shapes, shelling out to `cmark-gfm`, and it says so loudly when the binary is absent |
| 11 | S, A | *"795 marks"* is stale **and** the wrong unit | 795 is contiguous runs on the parent tree; 797 at HEAD; 957 mark characters | Corrected in E-258, with the reason |
| 12 | A | A mutation whose needle goes stale no-ops silently | `str.replace(…, 1)` exits 0 on zero matches | The harness hashes the tree before and after |

---

## Rejected, with the measurement, so they are not relitigated

**B2.5 — *"`\|` needs two characters of lookback"*.** Leg B argued that `\\|`
is an escaped backslash followed by a real cell boundary. ⚠ **Measured against
`cmark-gfm`: `| trailing backslash \\| next cell |` renders as ONE cell**
containing a literal `|`. One character of lookback is correct for GFM tables,
which is also what `REVIEW-042` measured for `splitCells`. Treating `\\|` as a
boundary would be the defect.

**B5.2 — *"the vacuity probe is masked by other cohorts"*.** It would be, if any
row outside `E-` sat at or above its cutoff. ⚠ **None does** — the maxima are
P-12, B-26, F-29, R-6 against cutoffs of 13, 27, 30 and 7 — and the probe was
measured firing the vacuity branch. **Real as a latent fragility, and fixed
anyway**: the probe now raises every cutoff, not just `E`.

---

## The fix round's own defect, found by testing the fix

⚠⚠ **The needle check added by finding 9 FALSE-PASSED, and only running it
showed that.** It required a probe's expected rule to appear in the gate's
output, searched over the **whole run** — and the gate prints its controls, one
of which reads `CONTROL ✓ rule 1: a row with TWO ⚠⚠ fails`. So `rule 1` is
present in every passing run, and a probe producing a genuine **rule 3** failure
while claiming rule 1 was accepted.

**Scoped to the `FAIL` lines, and the three broken probes are committed** as
`tools/break-emphasis-gate.sh --self-test`, with a fourth correct probe as the
positive control — without it a harness that rejected everything would score
full marks. `CLAIMS.md` E-260.

⚠ **Four layers of one shape in one branch**: the gate, the probes that check
it, the exit codes that classify the probes, and the needle that scopes the
classification. Each was added to stop a false pass and each false-passed until
it was broken on purpose.

---

## What this round did not do

⚠ **One leg had a repository and two did not**, so leg A's differential fuzz —
167,481 ordinary-inline strings, zero mismatches — is the only exhaustive
evidence here, and it covers plain inline text only. **Its own conclusion is the
useful one: the remaining disagreements live where GFM's block and inline
contexts constrain where a code span may exist**, which a flat string search
cannot reach. Autolinks are the known open case and are disclosed.

⚠ **Round three is not owed by default.** Round two's stopping condition is the
test: if the next round's findings are about the instruments rather than the
construction, it stops there.

## DOCUMENT 2 of 4 — the three register rows that describe this work (complete)

```
| E-258 | **`REVIEW-043` found five defects in the emphasis gate and its harness, and the sharpest is that the harness could not tell a crash from a verdict.** Two were false-passes in the code-span masker: a backslash-escaped backtick, and an opening run closed by a run of a different length, are both visible prose in GFM and both were blanked, so a governed row carrying two `⚠⚠` and unlimited bold reported `warns=0, bold=0.0%`. One was a false-fail — `1)` is an ordered-list marker and the splitter read only `1.`, so a parenthesised list over 800 characters was measured as a narrative paragraph. One was an undocumented allow-list: `;` and `:` passed rule 4 and appeared in none of the departures the gate discloses. ⚠ The fifth is this gate's own lesson one layer up — Bun exits 1 for a syntax error, an import failure and an uncaught throw, which `probe()` read as *the tree broke a rule*, so a mutation that stopped the gate running would have reported a tick from every probe expecting a failure | **All five measured before any fix was written, and all five upheld.** `cmark-gfm 0.29.0.gfm.13` renders both masker shapes visibly and renders `1)` as `<ol><li>`; the rewritten masker implements CommonMark's rule and **agrees with `cmark-gfm` on nine shapes**. Rule 4's allow-list was cut after counting the register rather than by argument: over the tree at `b97966c`, of **795 contiguous `⚠` runs** 597 followed a full stop, 118 opened a cell, and `;` and `:` accounted for five between them. ⚠ **This said *"795 marks"* and both halves were wrong** — the unit is runs, not marks, since the gate counts a `⚠⚠` as two and the same tree holds 957 mark characters; and the figure was measured before this row existed, so it was 797 the moment it was committed. **E-252 refuses to quote a corpus count of this file for exactly that reason, two rows earlier.** Corrected by `REVIEW-044` (E-259). The gate now prints `check-emphasis: verdict=<X> exit=<n>` as its last line, the harness requires it to agree with the exit code, and three new probes must be classified `CRASH`. ⚠ **Fifteen probes had reported ✓ with two false-pass paths standing**: a mutation harness measures the shapes it models, and a leg reading the detector's parsing rules is what found the rest. Counted where they run at this commit — 34 controls, 18 probes; `docs/reviews/REVIEW-043-codex-emphasis-gate-2026-09-09.md` | A, measured |
| E-259 | ⚠⚠ **`REVIEW-044`, round two, three legs with differed packets: the fixes carried a live false-pass, one defect a fix INTRODUCED, and a sentence that was false about the fix beside it.** The masker paired backticks **across a table-cell boundary**, which GFM never does because it splits cells before parsing inline code — a governed row with a lone backtick in two cells showed four `⚠⚠` and 49 bold characters to a reader and reported `warns=0, bold=0.0%`. The `1)` fix accepted **unlimited digits** where GFM allows nine, so `1234567890)` — prose to any parser — was discarded as a list. And *"a crash cannot print the verdict line"* was false: printing it and then throwing was classified as a rule failure. Nine further detector holes came from the cold leg, none of them present in the register: `(due)` read as an enumerator, `__bold__` and `<b>` invisible to rule 5, `⚠️` and `&#9888;` invisible to rules 1 and 3, and four false fails | **Every finding measured before any fix.** The masker now masks per cell and the whole differential is **committed as a control that shells out to `cmark-gfm`** over thirteen shapes — ⚠ *"agrees on nine shapes"* had been a shell command run once and discarded, cited in four comments and executed by nothing, which is E-165 landing on the evidence for a false-pass fix. `probe()` now requires the verdict to be the **last** line, requires a **needle naming the rule** that must appear (the rule-1 mutation trips rules 1 and 3, so a `FAIL` never established that rule 1 ran), and **hashes the tree** so a stale needle cannot no-op. 59 controls. Two claims were REJECTED with measurements: `\|` is content to `cmark-gfm`, so one character of lookback is right; and the vacuity probe was not masked, because no row outside `E-` sits at its cutoff | A, measured |
| E-260 | ⚠⚠ **`REVIEW-044`'s own fix for false-passing probes false-passed, and testing the fix is what found it.** The needle check added in round two required a probe's expected rule to appear in the gate's output — searched over the WHOLE run. The gate PRINTS its controls, and one of them reads `CONTROL ✓ rule 1: a row with TWO ⚠⚠ fails`, so the string `rule 1` is present in every passing run. A probe that produced a genuine **rule 3** failure while claiming rule 1 was accepted. The needle is scoped to the `FAIL` lines now | Measured by breaking the harness: three deliberately broken probes — a stale needle, a wrong needle, and a crash after a printed verdict — of which the first and third were rejected and the second ticked. **`tools/break-emphasis-gate.sh --self-test` is those probes, committed**, with a fourth correct probe as the positive control, because a harness that failed everything would otherwise score full marks. This is the fourth layer of one shape in one branch: the gate, then the probes that check it, then the exit codes that classify them, then the needle that scopes them | A, measured |
```

## FILE 3 of 4 — `tools/check-emphasis.ts` (complete)

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
const CLAUDE_PARA_BASELINE = 13;

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
 * `cmark-gfm` on nine shapes"* — was a shell command run once and thrown away.
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
    const outside = body.replace(/<code>[\s\S]*?<\/code>/g, "");
    const want = (outside.match(/⚠/g) || []).length;
    const wantBold = /<strong>/.test(outside);
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
  control(
    "a pipe-less GFM table is still measured as prose (disclosure 7)",
    paragraphs("Claim | Status\n---|---\nE-1 | " + "x".repeat(900)).some((p) => p.len > MAX_PARA),
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
    "The paragraph splitter models fenced blocks, list items and their lazy continuations, indented code, table rows with a leading pipe, headings, blockquotes and thematic breaks. It does NOT model pipe-less GFM tables, HTML blocks or setext headings, and measures each as prose. Those are false FAILS — loud, and the direction chosen on purpose.",
    "The inline model is code spans, per table cell. It does NOT model autolinks, so backticks inside `<…>` mask marks that a reader sees. Both residuals carry an asserted-uncaught control above, so this sentence fails the gate if it ever stops being true.",
    cmarkRan
      ? "The masker was checked against `cmark-gfm` on this run, shape by shape, above."
      : "⚠ `cmark-gfm` was NOT available on this run, so the masker was checked only against this author's own expectations — which is the thing REVIEW-043 proved wrong.",
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

## FILE 4 of 4 — `tools/break-emphasis-gate.sh` (complete)

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

# probe <name> <PASS|FAIL|CONTROL|CRASH> <expect-needle|-> <mutation…>
#
# ⚠⚠ **CLASSIFIED BY THE GATE'S OWN VERDICT LINE, AND THE LINE MUST BE THE LAST
# ONE.** Round one's form read the exit code only, and Bun exits **1** for a
# syntax error, a failed import and an uncaught throw. Round two then found that
# requiring the line *somewhere* in the output was still not enough: a process
# that PRINTS the verdict and then throws was classified as a rule failure, so
# `REVIEW-043`'s own sentence — *"a crash cannot print this line"* — was false
# (`CLAIMS.md` E-259). A crash cannot print it **last**.
#
# ⚠ **THE NEEDLE IS WHAT MAKES A PROBE ABOUT ITS OWN RULE.** `probe()` used to
# assert only that *something* failed. Measured: the rule-1 mutation trips rule
# 1 **and** rule 3, so a `FAIL` verdict never established that rule 1's detector
# ran. A probe now names a string that must appear in the gate's output, and `-`
# is the explicit opt-out for probes whose outcome is the whole claim.
#
# ⚠ **A mutation that changes nothing is a probe that proves nothing.** Python's
# `str.replace(…, 1)` exits 0 when its needle has zero matches, so a stale
# needle would no-op silently and the unchanged tree would answer `PASS`. The
# files are hashed before and after.
probe(){
  local name="$1" want="$2" needle="$3"; shift 3
  local before after
  before="$(cat CLAIMS.md CLAUDE.md tools/check-emphasis.ts | shasum | cut -d' ' -f1)"
  if ! "$@" >"$TMP/mutate.log" 2>&1; then
    echo "  ✗ $name — THE MUTATION ITSELF FAILED. A probe that cannot apply is not a probe."
    tail -4 "$TMP/mutate.log" | sed 's/^/        /'
    restore; FAILED=1; return
  fi
  after="$(cat CLAIMS.md CLAUDE.md tools/check-emphasis.ts | shasum | cut -d' ' -f1)"
  if [ "$before" = "$after" ]; then
    echo "  ✗ $name — THE MUTATION CHANGED NOTHING. Its needle has gone stale;"
    echo "      this probe would have reported the unmutated tree's verdict."
    restore; FAILED=1; return
  fi

  bun run tools/check-emphasis.ts >"$TMP/run.log" 2>&1; local rc=$?
  restore

  local last got=CRASH
  last="$(tail -1 "$TMP/run.log")"
  case "$last" in
    "check-emphasis: verdict=PASS exit=0")    [ "$rc" = "0" ] && got=PASS ;;
    "check-emphasis: verdict=FAIL exit=1")    [ "$rc" = "1" ] && got=FAIL ;;
    "check-emphasis: verdict=CONTROL exit=2") [ "$rc" = "2" ] && got=CONTROL ;;
  esac

  if [ "$got" != "$want" ]; then
    if [ "$got" = "CRASH" ] && [ "$want" != "CRASH" ]; then
      echo "  ✗ $name — CRASH (rc=$rc, last line was not a verdict). The gate did not"
      echo "      complete; this probe proved nothing. Last lines of its output:"
      tail -4 "$TMP/run.log" | sed 's/^/        /'
    else
      echo "  ✗ $name — wanted $want, got $got (rc=$rc)"
    fi
    FAILED=1; return
  fi

  # ⚠⚠ **THE NEEDLE IS SEARCHED IN THE `FAIL` LINES ONLY.** Its first form
  # grepped the whole run, and the gate PRINTS its controls — `CONTROL ✓ rule 1:
  # a row with TWO ⚠⚠ fails` — so a needle of `rule 1` matched a passing run's
  # own output. Measured: a probe that produced a **rule 3** failure and claimed
  # rule 1 reported ✓. **A false pass inside the fix for false passes**, found
  # by breaking the harness rather than by reading it (`CLAIMS.md` E-260).
  if [ "$needle" != "-" ] && ! grep '^FAIL' "$TMP/run.log" | grep -qF "$needle"; then
    echo "  ✗ $name — got $want, but the output never mentions \"$needle\"."
    echo "      Something else failed. This probe did not exercise what it names."
    FAILED=1; return
  fi
  echo "  ✓ $name — $got (rc=$rc)"
}

echo "=============================================================================="
echo "break-emphasis-gate — verifying check-emphasis by breaking it"
echo "=============================================================================="
echo
# ⚠⚠ **`--self-test` VERIFIES THE HARNESS, and it is committed because running
# it is how the needle check's own false pass was found.** Three deliberately
# broken probes that must be REPORTED broken, and one correct probe that must
# still tick — without the last one, a harness that failed everything would
# score full marks.
if [ "${1:-}" = "--self-test" ]; then
  echo "SELF-TEST — three broken probes must be reported broken, one correct probe must tick"
  echo
  probe "STALE NEEDLE: the mutation matches nothing and changes nothing" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('| E-99999 | ','ZZZ',1))"
  probe "WRONG NEEDLE: a real rule-3 failure claimed as rule 1" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
  probe "CRASH AFTER A VERDICT: the line printed, then a throw" FAIL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  runControls();','  console.log(\"check-emphasis: verdict=FAIL exit=1\");'+chr(10)+'  throw new Error(\"boom\");'+chr(10)+'  runControls();',1);io.open(p,'w',encoding='utf-8').write(t)"
  broken=$FAILED; FAILED=0
  probe "CORRECT: a real rule-3 failure claimed as rule 3" FAIL "rule 3" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
  echo
  if [ "$broken" = "1" ] && [ "$FAILED" = "0" ]; then
    echo "PASS: the harness rejected all three broken probes and accepted the correct one."
    exit 0
  fi
  echo "FAIL: the harness accepted a broken probe, or rejected a correct one."
  exit 1
fi

echo "The GOVERNED rows — each rule must actually fail"
probe "rule 1: a second ⚠⚠ in E-251" FAIL "rule 1" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-251 | **','| E-251 | ⚠⚠ **X.** ⚠⚠ **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 3: four ⚠ in E-249" FAIL "rule 3" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 | **','| E-249 | ⚠ A. ⚠ B. ⚠ C. ⚠ D. **',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 4: a mid-clause ⚠ in E-250" FAIL "rule 4" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('and the dangling date stood','and ⚠ the dangling date stood',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "rule 5: the whole claim cell of E-250 bolded" FAIL "rule 5" py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');i=[n for n,l in enumerate(L) if l.startswith('| E-250 |')][0];c=L[i].split(' | ');c[1]='**'+c[1].replace('*','')+'**';L[i]=' | '.join(c);io.open(p,'w',encoding='utf-8').write('\n'.join(L))"
probe "rule 5 in a REVISION-HISTORY row, which carries no cutoff" FAIL "rule 5" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| 2026-08-13 | — | \`REVIEW-001\`','| 2026-08-13 | — | **REVIEW-001 and REVIEW-002 and a verification round, every word of it bold**  \`REVIEW-001\`',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The FORWARD-ONLY property — history must stay untouched"
probe "a GRANDFATHERED row made far worse still passes" PASS "-" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-100 | ','| E-100 | ⚠⚠ A. ⚠⚠ B. ⚠ C. ⚠ D. ',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "Rule 6 and the recorded exemptions"
probe "the pre-rewrite 4,811-character paragraph, from the pinned commit" FAIL "4811 characters" py "$PRE_REWRITE_PARAGRAPH"
probe "a fourteenth over-length paragraph in CLAUDE.md trips the ratchet" FAIL "The ratchet only turns one way" py "import io;p='CLAUDE.md';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t+'\n\n'+'z'*900+'\n')"
probe "the recorded CLAIMS.md exemption's target removed — a STALE exemption" FAIL "matches 0 over-length paragraphs" py "import io;p='CLAIMS.md';L=io.open(p,encoding='utf-8').read().split('\n');L=[l for l in L if 'So the honest conclusion is not' not in l];io.open(p,'w',encoding='utf-8').write('\n'.join(L))"

echo
echo "The cutoff, and the fail-closed paths"
probe "the cutoff raised above every row — the VACUITY branch, not a control" FAIL "ZERO id-bearing rows" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('{ P: 13, E: 249, B: 27, F: 30, R: 7 }','{ P: 9999, E: 9999, B: 9999, F: 9999, R: 9999 }',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "a row carrying a prefix the cutoff does not cover" FAIL "prefix the cutoff does not cover" py "import io;p='CLAIMS.md';t=io.open(p,encoding='utf-8').read();t=t.replace('| E-249 |','| G-1 | placeholder | placeholder | A |\n| E-249 |',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "The DETECTOR — neutering it must be caught by the controls, at rc=2"
probe "judgeRow neutered to report nothing" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('  return { doubles, warns, boldRatio, midSentence: mid, problems };','  return { doubles, warns, boldRatio, midSentence: mid, problems: [] };',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "the code-span masker turned into the identity function" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function maskCodeSpans(line: string): string {','export function maskCodeSpans(line: string): string { return line;',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "the paragraph splitter made blind to fences" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('if (/^\\\\s*(\`\`\`|~~~)/.test(l)) { flush(); fenced = !fenced; continue; }','',1);io.open(p,'w',encoding='utf-8').write(t)"
probe "midSentence made always-false" CONTROL "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();t=t.replace('export function midSentence(before: string): boolean {','export function midSentence(before: string): boolean { return false;',1);io.open(p,'w',encoding='utf-8').write(t)"

echo
echo "A CRASH is not a verdict — the harness must not read one as the other"
probe "a SYNTAX ERROR in the gate is CRASH, not a rule failure" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('export function judgeRow','export function judgeRow(((',1))"
probe "an UNCAUGHT THROW is CRASH, not a rule failure" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  runControls();','  runControls();'+chr(10)+'  throw new Error(\"boom\");',1))"
probe "a SUPPRESSED verdict line is CRASH even when the exit code looks right" CRASH "-" py "import io;p='tools/check-emphasis.ts';t=io.open(p,encoding='utf-8').read();io.open(p,'w',encoding='utf-8').write(t.replace('  console.log(\`check-emphasis: verdict=\${what} exit=\${code}\`);','',1))"

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
