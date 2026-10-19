ROUND THREE of an adversarial review. Read-only access to this repository,
frozen at f8bce8b. Do not modify tracked files; copy into a temp directory to
experiment.

Rounds one and two are in docs/reviews/REVIEW-043-*.md and REVIEW-044*.md. Read
REVIEW-044d first -- it names round three's scope IN ADVANCE, and you should
treat that as your assignment plus anything else you find.

SUBJECT: tools/check-emphasis.ts and tools/break-emphasis-gate.sh at HEAD.

Round two's stopping condition did NOT fire: its findings were defects in the
CONSTRUCTION of the detector, not in the instruments that check it. Round three
exists to test whether that is still true. If everything you find is about
evidence, prose, counts or controls -- and nothing about the construction --
say so plainly, because that is the convergence signal this project stops on.

YOUR ASSIGNMENT, in priority order:

A. THE CORPUS DIFFERENTIAL, AT SCALE. Nobody has run one. Round two compared 13
   hand-picked shapes against cmark-gfm. Run EVERY row of CLAIMS.md -- all of
   them, governed and grandfathered -- through cmark-gfm and through judgeRow,
   and report every row where the detector's count of VISIBLE warning signs
   disagrees with what cmark-gfm renders outside <code>. Do the same for the
   bold ratio where you can define a fair comparison; if you cannot, say why
   rather than inventing one. cmark-gfm 0.29.0.gfm.13 is installed.

B. ATTACK THE BLOCK SPLITTER, which is `paragraphs()`. It claims to model fenced
   blocks, list items and their lazy continuations, indented code, table rows
   with a leading pipe, headings, blockquotes and thematic breaks -- and to NOT
   model pipe-less tables, HTML blocks or setext headings. Verify both halves.
   Find a GFM block construct where it produces a wrong measurement, especially
   one that causes a FALSE PASS (a real over-800-character paragraph it does not
   measure) rather than a false fail.

C. IS THE ORACLE ITSELF RIGHT? cmarkDifferential() extracts "visible warning
   signs" by slicing from <tbody> and deleting <code>...</code>. Find an input
   where that extraction is wrong, so the differential would agree with the
   detector while both disagree with what a reader sees.

D. THE ROUND-TWO FIXES, AGAINST THEIR OWN DESCRIPTIONS. Read CLAIMS.md rows
   E-258, E-259, E-260 and docs/reviews/REVIEW-044d-adjudication-2026-09-09.md.
   Every number and claim there is falsifiable. This repository has fourteen
   recorded instances of a restated count being wrong.

E. THE HARNESS SELF-TEST. `tools/break-emphasis-gate.sh --self-test` claims to
   reject three broken probes and accept one correct one. Can a broken probe
   still be accepted? Can the self-test itself pass vacuously?

RULES:
- Every finding needs a concrete input or command and the observed behaviour.
  Run things.
- Grade HIGH / MEDIUM / LOW, and say whether it is a CONSTRUCTION defect or an
  INSTRUMENT/EVIDENCE defect. That distinction is what this round is for.
- If you check something and it is correct, say so explicitly.
- Do not fix anything. Report only.
