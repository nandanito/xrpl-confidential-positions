ROUND TWO of an adversarial review. You have read-only access to this repository,
frozen at commit 25d3dc3a44596f893cacfc5900fef3ba4b440ee9. Do not modify tracked
files; if you must experiment, copy into a temp directory.

SUBJECT: commit ec2e4c5 -- the FIXES for five findings from round one
(REVIEW-043). Round two exists to find two things and only two things:
  (a) a defect INTRODUCED by a fix;
  (b) a false or overstated sentence written to DESCRIBE a fix.

Round one found, in tools/check-emphasis.ts and tools/break-emphasis-gate.sh:
  1. break-emphasis-gate.sh read `main:CLAIMS.md` for a fixture that disappears
     on merge -> now pinned to 124e959 with a length assertion.
  2. maskCodeSpans treated any backtick as a delimiter and closed with indexOf,
     so backslash-escaped backticks and unequal-length runs -- both VISIBLE
     PROSE in GFM -- were blanked -> rewritten to CommonMark's rule.
  3. `;` and `:` were in midSentence's allow-list and in no disclosure ->
     removed.
  4. paragraphs() read `1.` but not `1)` -> fixed.
  5. probe() classified by exit code alone, and Bun exits 1 for a crash, the
     same code the gate uses for a rule failure -> the gate now prints
     `check-emphasis: verdict=<X> exit=<n>` and the harness requires agreement.

WHAT I WANT FROM YOU, in priority order:

A. ATTACK THE FIXES THEMSELVES. Especially maskCodeSpans: it is a hand-written
   CommonMark code-span scanner. `cmark-gfm` is installed. Write a differential
   fuzzer or an exhaustive small-input search comparing maskCodeSpans against
   cmark-gfm's rendering, and report any input where a mark GFM renders VISIBLY
   is masked, or a mark inside a real code span is counted. This is the highest
   value thing you can do and I could not do it exhaustively myself.

B. CHECK THE FIX REPORT AGAINST THE CODE. Read docs/reviews/
   REVIEW-043-codex-emphasis-gate-2026-09-09.md and CLAIMS.md row E-258. Every
   number and claim in them is a claim with a falsifier. Check: "nine shapes",
   "34 controls", "18 probes", "795 marks", "597 follow a full stop", "; four
   times, : once", "4,811 characters", "agrees with cmark-gfm". This repository
   has THIRTEEN recorded instances of a restated count being wrong.

C. CAN A GOVERNED ROW STILL EVADE THE GATE? A row at or after the cutoff
   (P-13, E-249, B-27, F-30, R-7) must obey: <=1 double-warning, <=3 warnings
   total, <=20% of characters inside **, every warning at a sentence start.
   Find a row a reader sees as violating that but the gate passes.

D. CAN A PROBE STILL PASS FOR THE WRONG REASON? probe() in
   break-emphasis-gate.sh. Consider: a mutation that changes the tree but not
   in the way its name says; a mutation whose needle no longer matches; the
   restore path; the dirty-tree refusal.

E. IS ANY NEW CONTROL FAKE? Controls were added for the fixes. A control that
   replays the exact attack that was just fixed proves the gate catches that
   attack and nothing else. Ask what each control does NOT cover.

RULES:
- Every finding needs a concrete input or command and the observed behaviour.
  Run things. "Might be" is not a finding.
- Grade HIGH / MEDIUM / LOW.
- If you check something and it is CORRECT, say so explicitly -- a clean answer
  on a named question is evidence.
- Do not fix anything. Report only.
