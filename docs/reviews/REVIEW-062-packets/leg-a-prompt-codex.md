# REVIEW-062 leg A — two draft posts, checked against the claims register and upstream sources

You are a documentation reviewer for an open-source research project, checking
two draft posts for factual accuracy before they are published. The project
studies what XLS-96 (confidential Multi-Purpose Tokens on the XRP Ledger) hides
and what it does not. It keeps a claims register, `CLAIMS.md`, that governs every
sentence it publishes: **E** rows are established evidence, **F** findings, **P**
standing prohibitions (things it must never claim), **B** blockers, **R**
corrections. Where a post and a row disagree, the row wins. Agreement is not
useful to the project; a sentence that holds is worth reporting only if you
checked it and say against what.

The project's plan allows one adversarial read of each draft before the owner
signs off the final text. A separate reader sees only the posts' text, as a
stranger would. There is no later round planned, so report everything now.

## STEP 0 — do this first and print the results

1. Run `pwd` and `git log --oneline`. The working copy holds exactly two commits:
   the project tree before the drafts and after them. **`git diff HEAD~1 HEAD` is
   the subject.** Work only inside this directory.
2. Run `curl -s -o /dev/null -w '%{http_code}\n' https://api.github.com/repos/XRPLF/mpt-crypto`
   and the same for `https://xrpl.org/`. If either is not 200, print `NO NETWORK`
   at the top of your report, check what the repository alone can settle, and
   mark every upstream claim as not checked.
3. **Do not read** anything outside this directory, in particular any path under
   `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold the
   owner's private configuration for a test network and you do not need them.
4. You may write scratch files under `$TMPDIR` or a `review-work/` directory here.
   Do not commit, push, or edit the committed files.

## The subject

- `docs/posts/BLOG-2026-10-22-draft.md`, a long post for the owner's blog.
- `docs/posts/LINKEDIN-2026-10-22-draft.md`, a short post answering *"is
  confidential transfer possible on XRPL?"*.
- `tools/check-vocabulary.ts` gained `docs/posts` in its scope, with a control.
  Not the main subject; one line on it is enough.

## What the posts must obey

- `CLAIMS.md` P-1 to P-12, at the top of the file. P-3 (a dated amendment reading),
  P-4 and P-11 (identities, timing and frequency are public), P-5 (nothing that
  reads as audited, production-ready, secure, trustless or non-custodial), P-7
  (credit Cenk, Malhotra, Akinyele, Chen, Xie, Qian and Dore where the work is
  theirs), P-8 (no benchmark number without hardware and method), P-9 (the issuer
  can always decrypt), P-10 (no rotation or recovery in XLS-96), P-12 (no negative
  claim about a source without its search).
- `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, the section *Phase 3 — the two posts*,
  read whole. In particular: name all three audits (Trail of Bits, the Sherlock
  XRP Ledger Attackathon, Zellic's scan of mpt-crypto) and say which one could be
  checked; never call a finding *new* or *unreported*; say there is no rotation or
  recovery *"in XLS-96, or on Mainnet, Testnet or Devnet"* and name XLS-99 as a
  draft; describe each filing by its outcome on the survey date, not by its
  register row.
- The survey the posts rest on: `docs/evidence/upstream-survey-2026-10-22/README.md`
  and `CLAIMS.md` E-353.

## Questions, in this order

1. **Every factual sentence.** For each one in both drafts: does the cited row,
   or the repository file it rests on, support it exactly, or does the sentence
   say more than its source? Quote the sentence and the source text. A sentence
   that is true but would mislead a reader who does not know the register counts.
2. **Sentences with no citation.** What supports them? Check against the
   repository, and check upstream state at source with network (the GitHub API
   unauthenticated, xrpl.org, the npm registry). Where the survey and your own
   reading disagree, say so with both.
3. **Counts and dates.** Re-derive every number from the tree or the source and
   say how: 61 numbered review records; eleven filings in four repositories; 28
   validated facility transactions; 57 days; eight corrections; twelve
   prohibitions; 500, 475 and 25; the amendment reading's date and time; *"since
   mid-August"*.
4. **What is missing.** Anything the plan's phase 3 or a P row requires that a
   draft lacks, and any disclosure the register attaches to a claim the drafts
   make without it.
5. **Links.** Every link in both drafts: does it resolve now? The public
   repository is `nandanito/xrpl-confidential-positions`; for each linked path in
   it, check through the GitHub API whether the path exists on its `main` today,
   and list the ones that do not yet.

## Report

Print the whole report to stdout, as Markdown. For each finding: an id (A-1,
A-2, …), a severity (**HIGH**: false, or claims more than the evidence; **MEDIUM**:
unsupported, or true and misleading; **LOW**: wording), the quoted sentence, the
evidence with paths and line numbers or URLs, and a suggested correction. Then,
for each `##` section of the blog draft and for the LinkedIn draft, either its
findings' ids or the words *no findings*. End with what you did not check, and
the line `END OF LEG A REPORT`.
