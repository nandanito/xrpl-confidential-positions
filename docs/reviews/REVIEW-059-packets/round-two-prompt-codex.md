# REVIEW-059 round two, leg A — the fixes to round one's findings

You are a code reviewer for an open-source research project, reviewing the
project's own release tooling for correctness. Round one of this review found
defects in the build of a read-only static demonstration site; the project has
now fixed them. **Your job is to check the fixes**: whether each one discharges
the finding it answers, **judged against the round-one report's own words and
not against the adjudicator's summary of it**, whether any fix introduced a new
defect, and whether a corrected sentence survives elsewhere. Agreement is not
useful. A fix that holds is worth reporting only if you tested it and say how.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print both codes. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline`. The working copy is a repository with
   exactly two commits: `before fixes` is the project tree after round one, and
   `after fixes` is the tree at the fixes. `git diff HEAD~1 HEAD` is the subject.
   Work only inside this directory.
3. `review-input/rebuilt/` is the output root built from the `after fixes` tree
   by the fixed build, then gated, browser-checked and preflighted by the
   adjudicator (results below). `review-input/deployed/` is the output the live
   site serves, built before the fixes. Both are untracked and public.
4. **Do not read** any directory outside this one, and in particular any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold the
   owner's private configuration for a test network and you do not need them. Do
   not run `cargo`, `make check-zeroize-bounds`, `tools/rebuild-env.sh`,
   `make check-web-hosted`, or `tools/check-no-secrets.ts` without
   `--no-local-store`.
5. You may write scratch files under `$TMPDIR`, copy the two output roots as often
   as you like, and run `bun install --frozen-lockfile` here. Do not commit, push,
   or create, rename or edit anything on GitHub, Vercel or anywhere else.
   Read-only network calls only. Never send anything to Mainnet or Testnet. Never
   submit a transaction.
6. ⚠ **Your transcript is committed to a repository**, so keep it free of
   anything from outside this directory.
7. Docker is not available to you. If a finding depends on running the build
   container, state the exact probe and the result that would confirm or refute
   it; the adjudicator will run it.
8. At the end, list every file you opened.

## What you are reviewing

- **The findings, in their own words:**
  `docs/reviews/REVIEW-059-packets/round-one-codex-output.md` (findings R1-1 to
  R1-14), `round-one-gemini-output.md` (B1-1 to B1-8) and
  `round-one-self-notes.md` (S-1 to S-8). **Read these first and whole.**
- **The rulings:** `docs/reviews/REVIEW-059c-adjudication-round-one-2026-10-20.md`.
  It upheld 24 findings, rejected B1-7, and named three residuals it did not fix.
- **The fixes:** `git diff HEAD~1 HEAD`, then each changed file whole. The
  records of the fixes are `CLAIMS.md` E-342, E-343 and E-344; E-344 records
  four fixes the adjudicator found, before this round, had discharged only half a
  finding, and the second commit's tree includes their completions.

## Measurements the adjudicator took on 2026-10-20, which you cannot

1. The rebuild from the `after fixes` tree ran as two containers, the second with
   `--network none`, after the tree check passed on the full commit; ledger
   6,270,649.
2. The fixed gate on it, with the local secret store: 44 of 44 controls, full
   sweep PASS, digest `577fc9d5…`.
3. The fixed browser check on it, with Chrome: PASS, 6 pages, 41 requests.
4. The fixed preflight on it: REFUSED only because the commit is not on the public
   repository's `main`, which is correct for a commit that has not been published.
5. Each of the 14 new gate checks, deleted from a copy, failed its control; each of
   the browser check's three new checks, deleted, failed its self-test; the
   build's network control failed on both halves with `--network none` removed.
6. `bun test web/hosted web/api facility`: 290 pass. `make ci`: 290 pass, 5 skip,
   0 fail.

## Five seams. Report on every one, with an explicit "no findings" where you found none

For each finding: `R2-n | HIGH/MEDIUM/LOW | claim | evidence: the command you ran
and its output, or file:line | the smallest fix`. Grade HIGH only for a fix that
does not discharge a HIGH finding, or a new defect that would publish a false
statement of fact to visitors, publish private data, or let the release procedure
publish an output that does not meet architecture §6 step 9's requirements with
no later check able to notice.

1. **The gate's fixes, tested by mutation.** `runChecks()` and `runControls()` in
   `tools/check-web-hosted.ts`. For R1-1, R1-2, R1-3, R1-4, B1-8, S-1, S-3, S-4
   and the scheme-relative URL check: does the fix catch the round-one report's
   own example, and the class that example belongs to? Write the next modification
   in each class and report whether it is caught. Do the new controls each test
   the check they name? (`runControls` calls the secret sweep, which needs a store
   you do not have; use `runChecks` directly and run
   `tools/check-no-secrets.ts --dir <out> --no-local-store` separately.)
2. **The release-time fixes.** `browser-check.ts` (R1-5, R1-2's visibility half),
   `compare-deployed.ts` (R1-6) and `deploy-preflight.ts` (R1-7, S-5). Run
   `bun test web/hosted`. Run `compare-deployed` against
   `https://xrpl-confidential-positions.vercel.app` with `review-input/deployed`
   (it must still pass) and with `review-input/rebuilt` (it must fail: that build
   is not deployed). Construct inputs where a fixed check still passes while its
   property fails.
3. **The build and snapshot fixes.** `build.ts` (R1-10, R1-11, S-2) with
   `build.test.ts`, and `snapshot.ts` with `facility/src/loopback.ts` (R1-8, R1-9).
   Does the tree check close R1-10 as the report described it, including its
   *"out === repoTop"* half? Does anything in the build still let a file not in
   the commit reach the output? Is the network split described accurately in the
   README, the manifest's `isolation` string and `ADR-0004`?
4. **Text and records, swept across the whole tree.** R1-12, R1-13, R1-14, B1-2,
   B1-5, S-6, S-7 and S-9 changed sentences. For each corrected sentence, grep the
   whole tree for its old phrasing and report every live copy outside
   `docs/reviews/`. Are the new sentences true, and does any of them state a
   negative without its search (`CLAIMS.md` P-12)? Are E-342, E-343 and E-344
   accurate about what was fixed and measured?
5. **The rebuilt output.** `review-input/rebuilt/`. Run `runChecks` over it, and
   read its six pages against `CLAIMS.md` P-1 to P-12 and the D-H2 wording.
   Anything a visitor reads there that is false or overstated?

## Then answer two questions

- **Is any upheld finding not discharged by its fix, judged by the round-one
  report's words?** List each by id, or say none.
- **The stopping condition, word for word:** *"Round one reviews the build. If it
  upholds any finding that changes code, a gate or a record, round two runs on
  the fixes alone, and it is the last unless it finds a fix that did not
  discharge its finding; a third round is then the owner's decision."* On your
  findings, does it fire? Answer yes or no, and why.

## Last

End with the list of every file you opened, and a final line reading exactly
`END OF LEG A REPORT`.
