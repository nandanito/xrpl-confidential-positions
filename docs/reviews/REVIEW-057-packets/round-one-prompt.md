# REVIEW-057 round one — the phase 1 publication plan, before any step runs

You are an adversarial reviewer. The subject is a plan to publish a private
research repository as a public one. The owner has ruled every decision in it,
and asked for this review **before any step runs**. Publication is not
reversible: anything pushed to a public GitHub repository can be cloned, cached
and indexed within minutes. Your job is to find what in the plan is false, what
would leak, what would fail, and what the plan has not priced. Agreement is not
useful to the owner. A finding that the plan survives is useful only if you
tried to break it and say how.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. Run `gh auth status 2>&1 | head -3` and say whether `gh` is
   authenticated. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `adee1f0`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, any `scratchpad`
   directory, and the repository this clone was made from. `~/.wconf` and
   `/tmp/wconf` hold real (Devnet, no-value) secrets. **Never print, cat or copy
   them.** You do not need them: do not run `make check-no-secrets` without
   `--no-local-store`, and do not run `cargo`, `make check-zeroize-bounds` or
   `tools/rebuild-env.sh`.
4. You may write scratch files under `$TMPDIR`. Do not commit, push, create,
   rename or edit anything on GitHub. **Read-only `gh` calls only.**
5. ⚠ **Your transcript is committed to this repository after redaction.** Two
   sources must never appear in it as text:
   - **The private repository's issue bodies and comments.** You may query
     `nandanito/xrpl-confidential-positions` with `gh issue list` / `gh issue view`
     **only through `--json … --jq` that prints numbers, states, dates, counts,
     titles and `U-nn` ids**. Never print a body or a comment, or any sentence
     from one.
   - **Withheld rows.** The file `docs/upstream-observed-WITHHELD.md` is
     gitignored and is not in your clone. Its row ids are listed under seam 3.
     Do not try to obtain its contents. ⚠ **Your clone's history still holds
     them**: `UPSTREAM-FEEDBACK.md` carried those rows until they were withheld.
     Do not run `git log -p`, `git show`, `git blame` or `git diff` on
     `UPSTREAM-FEEDBACK.md` at any commit other than `adee1f0`.

## What you are reviewing

Read each of these **whole**, not as a diff:

- `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md` — the
  subject. Sections D3, D4, D7, the drafted `NOTICE`, and *Item 5, the
  publication steps*.
- `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` — phase 1 and its gate.
- `CLAIMS.md` rows `E-240`, `E-241`, `E-309`, `E-317`, `E-319`, `E-320`, `E-321`,
  `E-322`. Find them with `grep -n '^| E-3' CLAIMS.md` and `grep -n '^| E-24' CLAIMS.md`.
- `README.md`, `NOTICE` (it does not exist yet — that is the point of D3),
  `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.github/`, `tools/ci.sh`,
  `tools/build-claims-revisions.ts`, `tools/check-no-secrets.ts`.

Context you cannot re-derive: the private repository is
`nandanito/xrpl-confidential-positions`, visibility PRIVATE. A sibling study
already uses the target pattern: `nandanito/evm-confidential-positions-private`
(private) and `nandanito/evm-confidential-positions` (public). You may confirm
both with `gh repo view <name> --json nameWithOwner,visibility,createdAt`.

## The five seams. Answer every one, each with an explicit verdict

For each seam: list findings as `R1-n | HIGH/MEDIUM/LOW | claim | evidence you
ran or read, with paths and line numbers | the smallest fix`. **If a seam has no
finding, write `Seam N: no findings` and say what you tried.** Grade HIGH only
for something that would leak private material, publish a false statement of
fact, or make the publication fail.

### Seam 1 — D3: the licence facts and the drafted `NOTICE`

Re-measure every number and fact D3 states, by running it:
the patch's removed, context and added lines
(`tools/spike-2026-08-18/wconf-nonces.patch`); the share of
`tools/mpt-crypto-bench/wconf_bench.c` that is verbatim in upstream's `tests/`
at `85dbac73d033241b73f0565ae7cce86d07005c70`; that `XRPLF/mpt-crypto` has no
licence at that commit or at `main`; what `@xrplf/mpt-crypto@0.1.0` ships and
under which licence (`npm view`, `npm pack`, or `bun install --frozen-lockfile`
and read `node_modules`).

Then attack the scope. **Is any other third-party material in the tracked tree
that the `NOTICE` would have to name?** Search beyond `.c` and `.h`: copied
source in TypeScript or Rust, test vectors or KAT data taken from upstream,
fonts, images, icons or component code under `web/`, vendored JavaScript,
quoted specification text of a length that matters. `git ls-files` is the
universe. Say what you searched and what you did not.

Then attack the reasoning: does the `NOTICE` as drafted state anything false,
or anything the evidence does not support? Does option A′ do what its row says?

### Seam 2 — D4: the rename, the local folder, and the pre-push guard

The ruling keeps the local folder named `xrpl-confidential-positions` while its
`origin` becomes `xrpl-confidential-positions-private`, and adds a `pre-push`
hook that refuses any URL naming `nandanito/xrpl-confidential-positions` without
the `-private` suffix. The full private history must never reach the public
repository.

Attack the guard as a design, before it is written. What URL does git pass to
`pre-push` — as typed, after `url.<base>.insteadOf`, after `pushurl`? Which pushes
skip the hook: `--no-verify`, `gh repo create --source . --push`, `gh repo sync`,
a fresh clone, a second worktree, `core.hooksPath`, a push from an IDE? Is a
regular expression over the URL enough when GitHub accepts
`git@github.com:nandanito/xrpl-confidential-positions`,
`https://github.com/NANDANITO/xrpl-confidential-positions.git`, trailing slashes
and `ssh://` forms? **Name any route by which the private history reaches the
public repository that the plan does not close.** Also check GitHub's rename
behaviour as the request quotes it, against GitHub's current docs.

### Seam 3 — D7: copying the issues

The request says the documents cite the private repository's issue numbers, a
fresh repository numbers from #1, and six of the 13 issues cite withheld rows.
The ruling: title-only stubs for the ten closed issues, full copies of the three
open ones (#5, #8, #10) with #10's withheld passage redacted, created in order
while the public repository is still private.

The withheld row ids are: U-16 U-17 U-19 U-20 U-21 U-22 U-23 U-25 U-26 U-27
U-28 U-29 U-30 U-31 U-32 U-33 U-35 U-36 U-37 U-38 U-39 U-40 U-42 U-43 U-44 U-45
U-46 U-47 U-48 U-49 U-52 U-53 U-54 U-55 U-56 U-57. Public rows are in
`UPSTREAM-FEEDBACK.md`.

Re-measure the request's counts (citations of `issue #N` in the tree; issues,
states, comment counts; which bodies and comments cite which `U-nn`) **using only
`--jq` output that prints ids and counts**. Then attack the plan: will the issue
numbers actually match — what else on GitHub consumes that counter (pull
requests, Discussions, anything a push or a workflow creates)? Do any of the 13
**titles** carry withheld content or a withheld id? Do the three open bodies
cite or restate withheld material beyond #10's U-32? Is the stub sentence true
for every citation it covers? Does anything in step 9 publish an issue body the
sweep did not see?

### Seam 4 — the ten publication steps, in order

Walk steps 1 to 10 as the person executing them. Find every step whose output
contradicts a later step or a sentence the plan publishes. **In particular:
how many commits does the public repository have after steps 4, 5 and 6, and
what does the step 6 README sentence say?** Does step 7's gate run on the commit
that is actually pushed in step 9? Does `make ci` pass in the export after steps
4 to 6 — you may rehearse it: `git archive adee1f0 | tar -x -C "$TMPDIR/x"`,
`git init`, commit, and run `bun install --frozen-lockfile && make ci` there
(network needed). Does anything the plan publishes depend on the private
repository being reachable? Is any setting in step 9 unavailable on a private
repository or a free plan, given the order the step sets them in?

### Seam 5 — this session's README and surface fixes, and E-322

Commits `20297cf..adee1f0` also corrected the README and five other surfaces
after the owner's claims-check (`CLAIMS.md` E-322). Read
`git diff 20297cf adee1f0 -- README.md web/ docs/explainer/ CLAUDE.md`. Is any
new sentence false against source? Re-run what it rests on: XLS-0096's status
header at `33ea4ca66`, `58ccd3047` and `master` in `XRPLF/XRPL-Standards`
(`XLS-0096-confidential-mpt/README.md`); what `web/api/server.ts` and
`web/api/issuer.ts` serve. **Are there remaining copies anywhere in the tree** of
the stale states E-322 names — XLS-0096 as Draft, the issuer route serving a
decrypted figure or awaiting a ruling, the withheld rows staying in public
history — outside `docs/reviews/` and the register rows that record them?

## The report

End with: a table of every finding; for each seam, one line saying whether the
plan survives it; and **the single change you would make before step 1 runs**.
