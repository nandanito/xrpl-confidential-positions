# REVIEW-061 leg A — diagrams on seven public pages, checked against the claims register

You are a documentation and code reviewer for an open-source research project,
checking new diagrams on a public demonstration site for accuracy before they are
published. The project studies what XLS-96 (confidential Multi-Purpose Tokens on
the XRP Ledger) hides and what it does not, and keeps a claims register,
`CLAIMS.md`, that governs every sentence it publishes: **E** rows are established
evidence, **F** findings, **P** standing prohibitions, **B** blockers, **R**
corrections. Where a page and a row disagree, the row wins. Agreement is not
useful to the project; a label that holds is worth reporting only if you checked
it and say against what.

The owner ruled two reads before deployment: this one, against the register and
the repository, and a separate newcomer read that sees only screenshots. No later
round is planned, so report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two commits:
   the project tree before the diagrams and after them. **`git diff HEAD~1 HEAD`
   is the subject.** Work only inside this directory.
2. `review-input/rebuilt/` is the site built from the second tree by the
   project's release build, gated (70 of 70 controls) and checked in a headless
   browser (7 pages, all requests same-origin). `review-input/screens/` holds
   screenshots of that build, desktop at 1100 pixels and phone at 390, cut into
   segments. `review-input/rebuilt-pages-visible-text.md` is the seven pages'
   visible text. All three are untracked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold
   the owner's private configuration for a test network and you do not need
   them. Do not run `make check-web-hosted` or `tools/check-no-secrets.ts`: both
   need that private store. `runChecks()` in `tools/check-web-hosted.ts` is
   exported and needs no store.
4. You may write scratch files under `$TMPDIR` or a `review-work/` directory
   here, and run `bun install --frozen-lockfile` and `bun test`. Do not commit,
   push, or edit the two committed trees except in copies.

## What changed

1. `web/app/src/hosted/Diagrams.tsx`, new: nine diagrams drawn in markup (the
   site's policy refuses inline styles), and a colour key: amber means public,
   green hidden from the public, violet that the issuer can read it.
2. The diagrams placed on the pages: the overview (`routes/index.tsx`): where
   the line falls between public and hidden, and how the site is made; the
   explainer (`routes/how-it-works.tsx`): a position's journey with the inbox,
   which replaced three cards, who can read what, the facility, and a new panel
   on the project's architecture; `/observer` and `/issuer`: one position, field
   by field; `/capabilities` and `/wallet`: the two keys; `/custody`: the page's
   two findings.
3. `web/hosted/browser-check.ts`: the self-test now chooses the script chunk
   every page loads from the pages themselves, instead of a chunk by file name;
   the old name stopped existing when the diagrams module was added.

## Section 1 — every diagram label, arrow, colour and caption

For each diagram: does each box, edge label and caption say what its page and
the rows the page cites say? Report a label that says **more** (more hidden than
is hidden, more leaked than leaks, a power or property not established), says
**less** in a way that changes the meaning, or is supported by nothing. Then
the parts that are not words: does an **arrow** connect the two things the
source connects, in the right direction? Does a **grouping** imply something
false? Does each box's **colour** match the key's meaning for what it shows? The
architecture panel must match `README.md`'s *How it fits together*; the facility
diagram `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md` and E-146, B-18,
F-24, F-26; the position diagram the observer page's lists in
`web/api/observer.ts`; the key diagrams the capability rows in
`web/api/capability.ts`; the custody diagram `web/app/src/views/CustodyView.tsx`.

## Section 2 — consistency

Between the diagrams (the three visible-zero cases, who can read, the inbox),
between each diagram and the text on its own page, and with the README. A label
true in one diagram and contradicted or narrowed in another is a finding.

## Section 3 — the code

`Diagrams.tsx`: any inline style, any ledger value, any wording the gate's
no-issuer-figure check (8b) would read as a figure, any markup that breaks the
pages' structure or accessibility (the diagrams are figures with captions). The
self-test change: can it choose a chunk that does not carry its controls' effect
to the pages each control inspects, choose differently between runs, or pass when
a control is not exercised? Test on copies of `review-input/rebuilt/` where you
can.

## Section 4 — reading the layout

If you can view images, read `review-input/screens/`: does any diagram read
wrongly at either width, in a way the markup alone would not show? If you cannot
view images, say so and skip this section.

## Output

Write your full report to `review-work/report.md`, then print the whole of it to
stdout, in this order:
1. STEP 0's results.
2. Findings, most severe first. For each: severity (HIGH: a published label is
   false or claims more than the evidence; MEDIUM: misleading, or missing a
   condition that changes the meaning; LOW: imprecise), the file and line, the
   label quoted exactly, the source you checked it against, and the smallest
   change that would fix it.
3. For each section, an explicit *"no findings"* if you found none, with what
   you checked.
4. What you did not check, and why.
End with the line `END OF LEG A REPORT`.
