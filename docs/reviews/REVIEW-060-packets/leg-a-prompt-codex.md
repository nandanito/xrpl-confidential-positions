# REVIEW-060 leg A — two new public pages, checked against the claims register

You are a documentation and code reviewer for an open-source research project,
checking new public web pages for factual accuracy before they are published.
The project studies what XLS-96 (confidential Multi-Purpose Tokens on the XRP
Ledger) hides and what it does not. It keeps a claims register, `CLAIMS.md`,
that governs every sentence it publishes: **E** rows are established evidence,
**F** findings, **P** standing prohibitions (things it must never claim), **B**
blockers, **R** corrections. Where a page and a row disagree, the row wins.
Agreement is not useful to the project; a sentence that holds is worth
reporting only if you checked it and say against what.

The owner ruled two reads before these pages are deployed: this one, against
the register and the repository, and a separate newcomer read that sees only
the rendered text. There is no later round planned, so report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two
   commits: the project tree before the change and after it. **`git diff
   HEAD~1 HEAD` is the subject.** Work only inside this directory.
2. `review-input/rebuilt/` is the site built from the second tree by the
   project's release build, then gated (68 of 68 controls passed) and
   checked in a headless browser (7 pages, 53 requests, all same-origin).
   `review-input/rebuilt-pages-visible-text.md` is the visible text of the two
   changed pages, extracted from that build. Both are untracked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold
   the owner's private configuration for a test network and you do not need
   them. Do not run `make check-web-hosted` or `tools/check-no-secrets.ts`:
   both need that private store. `runChecks()` in `tools/check-web-hosted.ts`
   is exported and needs no store; call it on copies of the output instead.
4. You may write scratch files under `$TMPDIR` or a `review-work/` directory
   here, and run `bun install --frozen-lockfile` and `bun test`. Do not commit,
   push, or edit the two committed trees except in copies.

## What changed

1. **A new page, `/how-it-works`** (`web/app/src/hosted/routes/how-it-works.tsx`):
   an explainer for readers new to XLS-96, in seven panels. Each panel names
   the register rows it restates under *Sources*.
2. **The overview, `/`, rewritten as orientation** (`web/app/src/hosted/routes/index.tsx`),
   and the navigation relabelled (`web/app/src/hosted/routes/__root.tsx`).
3. **A correction**: `docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md`
   limit 1, and its register row **R-7**.
4. **A release-gate change** in `tools/check-web-hosted.ts`: two repository
   files admitted as links, pinned to the build's commit; a new loop in check 9;
   two new controls.
5. Regenerated files: the register index, topic pages, revision log and
   third-party inventory, and the route tree.

## Section 1 — every factual sentence on the two pages

For each sentence that states a fact: which row or project document supports
it, and whether the sentence
- says **more** than its source (an overclaim, in either direction: more hidden
  than is hidden, or more leaked than leaks);
- says **less** in a way that changes the meaning (a dropped condition, date,
  scope, or *read in the source, not executed*);
- says something **no row or document supports**.

Check that the rows named under *Sources* say what the panel says, and name any
row a panel should cite and does not. Pay particular attention to:
- the amendment status sentence, which must be dated and match a dated reading;
- any implication that confidential MPT hides identities or timing (P-4, P-11),
  or that a holder is private from the issuer (P-9);
- the words *trustless*, *non-custodial*, *private*, *secure*, *audited*,
  *production-ready*, or anything that reads like them;
- what a Send's proofs prove, against `docs/task-zero/TASK-ZERO-2026-08-13.md`
  §3 and E-33;
- *"only the holder can spend"*, and the master-seed qualification;
- the visible-zero cases, against F-1 and E-211, and the overview's
  *"some zero balances are recognisable"*;
- the facility's description and its *28 validated transactions*, against
  `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md`, E-146, B-18, F-24, F-26;
- the description of the four demo accounts, against `web/api/demo-accounts.ts`
  and whatever records how and when they were created;
- the limits, against P-10, E-9, E-341, E-12, E-21, E-290, E-292 and P-5.

## Section 2 — consistency

With the site's other pages (the observer page's *Public* and *Hidden* lists in
`web/app/src/views/ObserverReading.tsx` and its rendered page, the issuer page,
the capability matrix, the wallet and custody pages), with `README.md`'s section
*What XLS-96 hides, and what it does not*, and between the overview's
three-line summary and the explainer. A sentence true on one page and
contradicted or narrowed on another is a finding.

## Section 3 — R-7 and the corrected sentence

Is the correction right? Does the old wording, or another copy of the same
claim, survive anywhere live (search by phrase and by meaning; exclude
`docs/reviews/`, which keeps history as written)? Does R-7's row say anything
its evidence does not?

## Section 4 — the gate change

Does the new admitted-URL entry admit more than the two files? Does the new
check-9 loop catch a link into the repository at another commit in every form a
page could carry it: an abbreviated sha, an entity- or percent-encoded URL, a
URL assembled in the JavaScript bundle rather than written in the HTML, a
`/tree/` or `/raw/` path, another host spelling? Does each new control fail for
the reason its name gives, and would it still fail if the check it targets were
removed? Test on copies of `review-input/rebuilt/` by calling `runChecks()`.

## Output

Print to stdout, in this order:
1. STEP 0's results.
2. Findings, most severe first. For each: severity (HIGH: a published sentence
   is false or claims more than the evidence; MEDIUM: misleading, or missing a
   condition that changes meaning; LOW: imprecise), the file and line, the
   sentence quoted exactly, the row or source you checked it against, and the
   smallest change that would fix it.
3. For each section, an explicit *"no findings"* if you found none, with what
   you checked.
4. What you did not check, and why.
End with the line `END OF LEG A REPORT`.
