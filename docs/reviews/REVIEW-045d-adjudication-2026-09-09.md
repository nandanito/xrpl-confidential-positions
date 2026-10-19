# REVIEW-045d — adjudication, ROUND THREE on the emphasis gate

- **Rotation:** `REVIEW-045` — round three, reviewing `REVIEW-044`'s fixes
- **Date:** 2026-09-09
- **Subject:** `f8bce8b`, frozen
- **Legs, differed again — and differed from round two's packets:**
  - `REVIEW-045a` — Codex, read-only repo, asked for a **corpus-scale
    differential** and an attack on the block splitter
  - `REVIEW-045b` — Gemini via `agy`, no repository, given the round-two
    **adjudication and register rows alongside the code** and asked only whether
    any sentence is false. ⚠ Round two's cold leg was given *no* history; this
    one was given nothing but history and code, which is the opposite packet.
  - `REVIEW-045s` — self leg, scratchpad, running the **E-168 phrase sweep**

---

## The stopping condition: STILL NOT MET, and the reason changed

Leg A found a **construction** defect, so by the letter of `CLAUDE.md` the round
did not converge. ⚠ **But the character of the fix is different, and that is the
finding worth carrying.** The previous two rounds patched the hand-written block
splitter one construct at a time. Round three showed that approach failing at
scale — **six false PASSES**, each hiding a real 900-character paragraph — and
the fix delegates rule 6 to `cmark-gfm` rather than adding a seventh patch.

**What remains hand-written is the inline layer alone**, and it is validated
against `cmark-gfm` on thirteen shapes by a committed control.

---

## Upheld

| # | Leg | Finding | Measured | Fix |
|---|---|---|---|---|
| 1 | A | **`paragraphs()` false-passed six real over-length paragraphs** — a leading pipe with no table, `#text`, an indented fence, `2.` interrupting a paragraph, a `~~~` inside a ``` fence, a heading not clearing the list state — and false-failed two more | Each run through `paragraphs()` and `cmark-gfm`; six walls of 900+ characters measured as nothing | Rule 6 answers through `cmark-gfm --sourcepos`, dropping `<p>` inside `<li>`, `<blockquote>`, `<pre>` and `<table>`. All eight cases agree now |
| 2 | A | **The differential's oracle counted `⚠` in raw HTML, attributes included** | For `[x](url "⚠⚠⚠⚠")` the oracle said 4 and the detector said 4, while a reader sees **0** | Marks counted in rendered TEXT, bold detected in MARKUP — two readings of one render, because the questions differ |
| 3 | A, B | **The self-test required only ONE of three rejections.** `probe` sets `FAILED=1` and never clears it, so `broken=$FAILED` was true after any single rejection | Sabotaging one broken probe to tick still printed *"rejected all three"* and exited 0 | Counted per probe; the sabotaged run now reports *"2 of 3"* and exits 1 |
| 4 | A | Link metadata counts as visible marks | `judgeRow` reports 4 where a reader sees 0 | **Disclosed, not fixed** — a false FAIL, loud — with an asserted-uncaught control |
| 5 | B | The adjudication contradicted itself: *"No finding was reported by two legs"* against its own row 11, credited to **S and A** | One overlap in twelve | Struck and corrected in `REVIEW-044d` |
| 6 | B | *"Four false FAILS"* over a list of **five** | Counted | Corrected in `REVIEW-044d` and E-259 |
| 7 | B, S | Retracted sentences standing at live sites: *"A crash cannot print this line"* **in the file that prints it**, *"795 marks"*, *"every one of them is named in the printed disclosure"* — where the disclosure names none | `grep` | All corrected |
| 8 | S | **Four MORE live sites than the reading leg found** — a second *"795 marks"*, two *"nine shapes"*, and *"implements CommonMark's rule"*, which the same round had retracted | The sweep | Corrected, and **four phrases added to `check-disclosure-phrases.ts`**, which is the falsifier the previous three rounds lacked |

---

## The defect the fix introduced, found by exercising the fallback

⚠⚠ **Delegating rule 6 to `cmark-gfm` broke the `CLAUDE.md` ratchet on any
machine without it.** The heuristic counts **13** over-length paragraphs where
`cmark-gfm` counts **11**, and a single baseline calibrated on one instrument
made the other fail. **Found by hiding `cmark-gfm` from `PATH` and running the
gate** — the only way that branch is exercised.

There are two baselines now, each named for its instrument, and the run says
which it used. ⚠ **The gap is not noise: it is two of the heuristic's false
fails, measured on a real file rather than a synthetic case.**

---

## Rejected

**None.** Every finding from all three legs was reproduced before it was fixed.

⚠ That is itself worth recording: rounds one and two each rejected a claim on a
measurement, and round three rejected nothing. The legs are converging on the
artifact even though the artifact has not converged.

---

## Round four — NOT RUN. The rotation STOPS here, and this is the reason.

⚠⚠ **This is a deliberate departure from `CLAUDE.md`'s rule as written, taken by
the project owner on 2026-09-09.** The rule says a further round is owed
whenever the previous one's stopping condition did not fire, and round three's
did not: it found a construction defect. **Recorded here so no later session
relitigates it, and with the condition that reopens it stated.**

### Why it stops

1. **The construction that kept failing no longer exists.** All three rounds
   found defects in the same place — hand-written parsing of a format that has a
   reference implementation. Round three did not patch the block splitter a
   seventh time; it **deleted that layer**, and `cmark-gfm --sourcepos` answers
   rule 6. There is no seventh construct defect to find in a parser that is gone.
2. **The corpus is clean against the authority.** Leg A ran every content row
   through both instruments: **347 rows, 970 visible warnings by `cmark-gfm` and
   970 by `judgeRow`, zero mismatches**, bold presence matching everywhere.
3. **Everything still open is synthetic, disclosed, and LOUD.** Autolinks and
   link metadata occur in no row, and both are false **FAILS** rather than false
   passes. Each carries an asserted-uncaught control, so the gate fails the day
   either quietly changes — **a mechanism that proved itself in this very
   round**, when the pipe-less-table disclosure went stale in the same commit
   that fixed what it disclosed and its control caught it immediately.
4. **The findings have moved to the instruments.** Round three upheld eight:
   **two** in the construction, one of those disclosed rather than fixed, and
   six in the oracle, the self-test, the probes and the prose. The retargeting
   afterwards found three more, **all** in instruments. That is the convergence
   `CLAUDE.md` describes, even though the binary test kept firing.
5. **Proportion.** This is a gate on documentation formatting, and it has had
   three adversarial rotations — more per artifact than the secret-wiping
   milestones received. `E-117`'s custody question is a real trust boundary and
   is still a decision waiting on the owner.

### What would reopen it

- **A construction defect in the inline layer**, found by ordinary use rather
  than by synthesis. That layer — the per-cell code-span masker, the mark
  normalisation, the bold counter — is the only hand-written parsing left.
- **An autolink or a link title actually appearing in a row.** The two
  asserted-uncaught controls are what surface it: if either shape ever stops
  behaving as disclosed, `check-emphasis` fails.
- **A disagreement with `cmark-gfm` on the corpus.** The differential is a
  committed control and runs on every invocation.

### One gap named rather than chased

⚠ **Rule 5's RATIO has never been compared against a rendered oracle, and
cannot be fairly.** Leg A was asked for that comparison and **declined, with its
reason**: the detector's denominator is masked raw Markdown while a parser
exposes rendered text with markup removed and entities decoded, so the
numerators differ on **220 of 336 id-bearing rows** at this commit for that
reason alone. **A leg refusing to manufacture a comparison is the right answer.**
What is comparable is bold presence against absence, which agreed on every row
on both trees measured. **Rule 5 is therefore checked in KIND and not in
DEGREE**, and the gate now prints that as disclosure 9.
