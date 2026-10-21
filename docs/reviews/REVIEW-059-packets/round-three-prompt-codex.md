# REVIEW-059 round three — the fixes to round two's findings, and the last round

You are a code reviewer for an open-source research project, reviewing the
project's own release tooling for correctness. Two earlier rounds of this review
found defects in the build of a read-only static demonstration site; round two
found that five of round one's fixes had not done what their findings asked, and
the project has fixed those. **Your job is to check round two's fixes**: whether
each discharges its round-two finding, **judged against the round-two report's
own words and by running that report's own examples**, whether any fix introduced
a new defect, and whether a corrected sentence survives elsewhere. Agreement is
not useful. A fix that holds is worth reporting only if you tested it and say how.

**This is the last round.** The stopping condition, set before it ran, word for
word: *"Round three reviews round two's fixes only, with one repository leg; the
rotation closes after it, whatever it finds."* So report everything you find now;
there is no later round to catch it.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print both codes. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline`. The working copy is a repository with
   exactly two commits: the project tree after round two's record, and the tree
   after round two's fixes. `git diff HEAD~1 HEAD` is the subject. Work only
   inside this directory.
3. `review-input/rebuilt/` is the output root built from the second tree by the
   fixed build, then gated, browser-checked and preflighted by the adjudicator
   (results below). `review-input/deployed/` is what the live site serves, built
   before any fix. Both are untracked and public.
4. **Do not read** any directory outside this one, and in particular any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold the
   owner's private configuration for a test network and you do not need them. Do
   not run `cargo`, `make check-zeroize-bounds`, `tools/rebuild-env.sh`,
   `make check-web-hosted`, or `tools/check-no-secrets.ts` without
   `--no-local-store`.
5. You may write scratch files under `$TMPDIR` or a `review-work-r3/` directory
   here, copy the output roots as often as you like, and run
   `bun install --frozen-lockfile`. Do not commit, push, or create, rename or edit
   anything on GitHub, Vercel or anywhere else. Read-only network calls only.
   Never send anything to Mainnet or Testnet. Never submit a transaction.
6. ⚠ **Your transcript is committed to a repository**, so keep it free of
   anything from outside this directory.
7. If your sandbox's Chrome will not start, prepare each browser case as a copy of
   `review-input/rebuilt/`, give the exact command, and say what result would
   confirm it; the adjudicator will run it. Docker is not available to you either;
   the same applies to any build-container probe.
8. At the end, list every file you opened.

## What you are reviewing

- **The findings, in their own words:**
  `docs/reviews/REVIEW-059-packets/round-two-codex-output.md` (R2-1 to R2-12), and
  the scripts and logs that produced them in
  `docs/reviews/REVIEW-059-packets/round-two-codex-review-work.md`. **Read the
  report first and whole.**
- **The rulings:** `docs/reviews/REVIEW-059d-adjudication-round-two-2026-10-20.md`.
  It upheld 11 and rejected R2-8 as an already-named residual.
- **The fixes:** `git diff HEAD~1 HEAD`, then each changed file whole. The record
  is `CLAIMS.md` E-346, with corrections to E-206, E-343 and E-344.

## Measurements the adjudicator took on 2026-10-21, which you may not be able to

1. The rebuild from the second tree: two containers, the second with
   `--network none`, after the tree check passed; ledger 6,285,074.
2. The fixed gate on it, with the local secret store: 52 of 52 controls, full sweep
   PASS, digest `981bc510…`.
3. The fixed browser check on it, with Chrome: PASS, 6 pages, 47 requests. The
   browser check's self-test passed; removing the second-load inspection, the
   visibility test or the check after navigation each failed it. Round two's
   `browser-second-home` and `opacity-zero` copies now fail it.
4. The fixed preflight on it: REFUSED only because the commit is not on the
   public repository's `main`, which is correct for an unpublished commit.
5. `make ci`: 297 pass, 5 skip, 0 fail.

## Five seams. Report on every one, with an explicit "no findings" where you found none

For each finding: `R3-n | HIGH/MEDIUM/LOW | claim | evidence: the command you ran
and its output, or file:line | the smallest fix`. Grade HIGH only for a fix that
does not discharge a round-two finding upheld at HIGH or MEDIUM, or a new defect
that would publish a false statement of fact to visitors, publish private data,
or let the release procedure publish an output that does not meet architecture
§6 step 9's requirements with no later check able to notice.

1. **The gate's new checks** (R2-1, R2-2, R2-3). Re-run round two's own examples
   from its scripts against the fixed `runChecks()`. Then write the next case in
   each class, and report whether it is caught: other forms of an account or an
   issuance on a page outside the two ledger pages; other wordings of an issuer
   figure; other encodings of an off-site address in an attribute. Does each new
   control test the check it names? (Use `runChecks` directly; `runControls` needs
   a secret store you do not have.)
2. **The release-time fixes** (R2-4, R2-5, R2-6, R2-7). `deploy-preflight.ts`
   (`manifestProblems`, the provenance sentence, the endpoint), `compare-deployed.ts`
   (the charset rule) and `browser-check.ts` (the second load, the visibility test
   and the check after navigation). Run `bun test web/hosted`. Construct inputs
   where each passes while its property fails, and inputs where each fails on a
   correct output.
3. **The text and record fixes** (R2-9, R2-10, R2-11, R2-12). Grep the whole tree,
   outside `docs/reviews/`, for every phrase round two reported as a surviving
   copy, and for the old forms of the sentences round two's fixes changed. Report
   every live copy. Does the new custody wording test fail when each of the three
   custody surfaces loses its exception?
4. **The records of the fixes.** `CLAIMS.md` E-346 and the corrections it made to
   E-206, E-343 and E-344; `web/hosted/README.md` steps 4, 5 and 7; the gate's
   printed limits 8 and 9. Find any sentence that says more than the code does.
5. **The rebuilt output.** `review-input/rebuilt/`. Run `runChecks` over it, and
   read its six pages against `CLAIMS.md` P-1 to P-12.

## Then answer one question

**Is any round-two finding upheld at HIGH or MEDIUM not discharged by its fix,
judged by the round-two report's words and its examples?** List each by id, or say
none. There is no fourth round: the rotation closes after this one.

## Last

End with the list of every file you opened, and a final line reading exactly
`END OF ROUND THREE REPORT`.
