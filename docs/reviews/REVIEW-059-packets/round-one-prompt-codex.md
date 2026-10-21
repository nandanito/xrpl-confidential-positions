# REVIEW-059 round one, leg A — the hosted demo as BUILT and DEPLOYED

You are a code reviewer for an open-source research project, reviewing the
project's own release tooling for correctness. The subject is the build of a
read-only public demonstration of a confidential-token research project: a static site,
prerendered from one snapshot of a test ledger, gated, and deployed to Vercel at
`https://xrpl-confidential-positions.vercel.app`. Its design was reviewed for
three rounds before any code (`REVIEW-058`). **The code that implements it has
been checked only by its own tests and controls, each broken before it was
believed, and by no outside reader. You are the first.** Your job is to find
defects: checks that do not detect the changes they are meant to detect, steps
that would fail, and statements in the project's records that the code does not
deliver. Agreement is not useful. A finding that something holds is useful only
if you tested it and say how.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com`,
   `curl -s -o /dev/null -w '%{http_code}\n' https://xrpl-confidential-positions.vercel.app/`
   and `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print all three codes. If network fails, print `NO NETWORK` and continue
   without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a fresh clone of the
   PUBLIC repository at commit `ccf76e73bf6629b29dece98cc15a050e3f60cad4`, the
   commit the live site was built from. Work only inside this clone.
3. `review-input/deployed/` inside this clone is a byte copy of the output root
   that was deployed: `build-manifest.json`, `container.log` and `.vercel/output/`.
   It is untracked. It is public: it is what the site serves, plus the build's
   manifest and log.
4. **Do not read** any directory outside this clone, and in particular any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, `~/Library`, any
   `scratchpad` directory, and anything under `/Users/*/Development`. They hold the
   owner's private configuration for a test network and you do not need them. Do
   not run `cargo`, `make check-zeroize-bounds`,
   `tools/rebuild-env.sh`, `make check-web-hosted`, or `tools/check-no-secrets.ts`
   without `--no-local-store`.
5. You may write scratch files under `$TMPDIR`, copy `review-input/deployed/` as
   often as you like, and run `bun install --frozen-lockfile` in this clone. Do not
   commit, push, or create, rename or edit anything on GitHub, Vercel or anywhere
   else. Read-only network calls only: `GET` and `HEAD` to the live site, and
   read-only JSON-RPC to Devnet (`https://s.devnet.rippletest.net:51234`). Never
   send anything to Mainnet or Testnet. Never submit a transaction.
6. ⚠ **Your transcript is committed to a repository**, so keep it free of
   anything from outside this clone.
7. Docker is not available to you. If a finding depends on running the build
   container, state the exact probe and the result that would confirm or refute
   it; the adjudicator will run it.
8. At the end, list every file you opened.

## What you are reviewing

Read each of these **whole**, not as a diff:

- `web/hosted/` — every file: `README.md` (the release procedure), `build.ts`,
  `Dockerfile`, `snapshot.ts`, `snapshot-types.ts`, `vercel-output.ts`, `csp.ts`,
  `browser-check.ts`, `deploy-preflight.ts`, `compare-deployed.ts`,
  `licence-notices.ts`, `pages.ts`, and the four test files.
- `tools/check-web-hosted.ts` — the gate, run as `check-web-readonly --hosted`.
  Also `tools/check-web-readonly.ts` for how `--hosted` dispatches, and the
  `--dir` mode of `tools/check-no-secrets.ts`.
- `web/app/vite.hosted.config.ts` and `web/app/src/hosted/` — the second build
  target and its pages. The four shared page bodies are in `web/app/src/views/`.
- `facility/src/loopback.ts` — the ledger reader the snapshot uses. Its pinned
  existence check was added for step 9.
- The decision and the step: `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`
  (`Accepted`, revision 5), and `docs/architecture/ARCHITECTURE-2026-08-18.md`
  §6 step 9, especially *"What it may never touch"* and *"Falsified if"*.
- `CLAIMS.md` rows `P-1` to `P-12`, `E-327` to `E-338`. Find them with
  `grep -n '^| E-334' CLAIMS.md` and so on. Two later rows exist only in the
  project's private archive and are summarised here: **E-339**, the redeploy from
  this commit, whose comparison passed at 05:28:35Z with verdict digest
  `1332ea0a95772b12…`; and **E-340**, the owner's report that no Git repository is
  connected to the Vercel project, the toolbar is off, the CLI was 62.4.0, and
  the footer showed `PASS` on a phone.

## Measurements the adjudicator took on 2026-10-20, which you cannot

1. `compare-deployed` against the live alias: PASS at 10:39:42Z.
2. The gate on a COPY of `review-input/deployed/` (it writes its verdict into
   the directory it checks), with the local secret store: 30/30 controls, full
   sweep PASS, output digest `1332ea0a95772b12…`. The new verdict differs from
   the deployed one only in `checkedAt`.
3. `browser-check` on that copy with Chrome: PASS, 6 pages, 39 requests, all
   same-origin, footer `PASS, 18 files`.
4. The build image run with no mount sees no host path: `/Users`, `/mnt/mac`,
   `/Volumes`, `/private`, `/host` and `/run/host` are absent; the user is `node`.

## Five seams. Report on every one, with an explicit "no findings" where you found none

For each finding: `R1-n | HIGH/MEDIUM/LOW | claim | evidence: the command you ran
and its output, or file:line | the smallest fix`. Grade HIGH only for something
that would publish a false statement of fact to visitors, publish private data,
give the static page a signing or decryption path or server code, or let the
release procedure publish an output that does not meet §6 step 9's stated
requirements with no later check able to notice.

1. **The gate's coverage, tested by mutation.** `runChecks()` in
   `tools/check-web-hosted.ts` needs no secret store, so import it and run it
   over modified local copies of `review-input/deployed/.vercel/output`. For each
   item of §6 step 9's *"may never touch"* list, its *"Falsified if"* clause and
   `ADR-0004`'s list of what the gate must check, write the smallest modification
   that the requirement forbids and report whether `runChecks()` reports it. Then
   review the gate's own controls: does each one modify the property it is named
   for, or something adjacent? Which requirement has no control?
2. **The release-time checks.** `deploy-preflight.ts`, `browser-check.ts` and
   `compare-deployed.ts`. What does each PASS establish, and what would a reader
   of it believe? Find inputs, using local copies, where each reports PASS while
   the property it stands for does not hold. Run `compare-deployed` against the live alias (`bun run
   web/hosted/compare-deployed.ts review-input/deployed https://xrpl-confidential-positions.vercel.app`),
   and read the live headers with `curl -sI`. What does the host add or change,
   and does anything in the records say otherwise?
3. **The snapshot.** `snapshot.ts` over `facility/src/loopback.ts`, against a
   pooled public endpoint. Can a lagging, inconsistent or mixed pool produce a snapshot
   whose values are not all from the one pinned validated ledger, or render a
   failed read as an empty account or position, without the build failing?
   Run the snapshot tests, and run the reader against Devnet read-only if you can.
4. **Build isolation and provenance.** `build.ts`, the `Dockerfile`,
   `vite.hosted.config.ts`, `build-manifest.json` and `container.log`. The records
   say the build runs in a container that cannot reach the private stores, from
   a `git archive` of a public commit, with two canaries proving no build variable
   reaches the output. What access does third-party dependency code that runs
   during the build have? What does each check establish, and what is claimed
   beyond it? What would let an output be deployed that was not built from the commit
   its footer names?
5. **What the pages say.** The six prerendered pages under
   `review-input/deployed/.vercel/output/static/`, their footer, and the
   `doesNotCheck` text in the served `gate-verdict.json`. Read them against
   `CLAIMS.md` P-1 to P-12, `ADR-0004`'s D-H2 wording, and the code that produced
   each sentence. Find any sentence a visitor reads that claims more than is
   delivered, states a negative without its search (P-12), or is false at this
   commit.

## Then answer two questions

- **The single sentence in the records or on the pages most likely to be false.**
  Quote it, with its file.
- **The stopping condition, set before this round ran, word for word:** *"Round
  one reviews the build. If it upholds any finding that changes code, a gate or a
  record, round two runs on the fixes alone, and it is the last unless it finds a
  fix that did not discharge its finding; a third round is then the owner's
  decision."* Does anything you found argue that this condition is wrong for this
  subject? Answer yes or no, and why.

## Last

End with the list of every file you opened, and a final line reading exactly
`END OF LEG A REPORT`.
