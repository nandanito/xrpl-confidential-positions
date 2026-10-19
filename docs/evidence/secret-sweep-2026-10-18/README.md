# Secret sweep, 2026-10-18: what it found, and what was changed

Phase 1 of `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` is gated on *"the secret sweep
passing on the exact tree that will be published"*. The sweep is
`make check-no-secrets` (`tools/check-no-secrets.ts`). This file records its first
run over the real repository, the scrub that made it pass, and what the scrub
changed. The register row is `CLAIMS.md` E-317.

## What the gate searched

The publication set (every file `git add -A` would commit), every blob, commit
message and tag message reachable from any ref, and every path any commit touched.
The known-value class searched for the exact values in the local secret store:
`state.json` in both locations `tools/rebuild-env.sh` keeps it, plus the
facility's state, book and book backup. It searched each seed in five encodings,
including the ElGamal key the ruled derivation gives it.

From the gate's own output, run on the exact tree of commit `04aa4f3` with
`--rev`, and then over history with `--history-only`:

```text
controls: 84/84 passed, run through the same scanRepo() as the real check
known-value: 19 secret(s) from 5 file(s) in the local store, 67 encodings searched; 0 stored seed(s) skipped as public by construction
scanned: 620 file(s) in the tree, 0 history object(s)
check-no-secrets: verdict=PASS exit=0

scanned: 0 file(s) in the tree, 2688 history object(s)
check-no-secrets: verdict=PASS exit=0
```

`git ls-tree -r 04aa4f3` lists 620 paths, so the two counts agree.

⚠ **This block was corrected after `REVIEW-056` round one (S5-3).** It used to
quote a working-tree run as *"the final tree"*, reporting 613 files, and three
files were committed after that run. The gate then counted unique blobs rather
than paths, which made the miscount invisible. Both are fixed: the count is by
path, and this block names the commit it was run on.

## What it found

- **No secret, anywhere.** None of the 19 local secrets appears in the tree or in
  history, in any encoding the gate searches. In the first run no credential
  shape appeared either. ⚠ **That sentence said "no credential shape appears"
  without a date until `REVIEW-056` round two (R2-10).** The review transcripts
  committed since carry placeholders the gate allows by rule, such as an AWS
  secret of forty identical characters.
- **No secret-store file was ever committed.** No commit on any ref ever touched
  a path named `state.json`, `facility-state.json`, `facility-book.json`,
  `profile.json`, `.env` or a key file. With the line above, this verifies the
  plan's claim two ways rather than assuming it. Neither the path nor any value
  from `/tmp/wconf/state.json` ever entered git.
- **Every seed in the tree is public by construction.** Eleven checksum-valid
  seeds appear, and the gate decoded each one. Each has entropy from a published
  rule: one byte repeated, the bytes `0x00` to `0x0f`, or rippled's genesis
  passphrase.
- **Personal paths in 42 tracked files**: the home directory, the macOS
  per-user temp root, and the repository's dash-encoded scratchpad name. 40 of
  them are review transcripts and outputs, mostly Codex and Gemini legs that
  printed their working directory. One is the F-12 evidence README. One was code,
  a spike with the repository root hardcoded.
- **Third-party email addresses in 4 review files**, one of which had no path.
  They came from `git log` output and crate metadata that legs printed. None is
  material to a finding.

## What was changed

1. **The spike was fixed, not scrubbed**: it now computes its root
   (commit `2667870`). A redacted path in code no longer runs.
2. **42 files were scrubbed**, 41 under `docs/reviews/` and the F-12 README, by
   `tools/scrub-personal-data.ts`, which derives
   every substitution from the machine and finds emails with the gate's own
   detector. `scrub-tracked-files.md` is its output, with per-file counts and no
   values. Every changed file kept its line count. A word diff of the result
   showed that every added token carries a placeholder.

   | placeholder | replaces |
   |---|---|
   | `$REPO` | the repository root |
   | `$REPO_SLUG` | the root, dash-encoded |
   | `$HOME` | the home directory |
   | `$USER_TMP` | the macOS per-user temp root |
   | `redacted@example.invalid` | a third-party email address |

3. **The F-12 build logs were committed, scrubbed.** The handover listed 42 of
   them as home-path hits the sweep should expect. The count was right and the
   premise was not: **no log was in the publication tree**, because `*.log` is
   gitignored and only the README was ever committed. So the README beside them
   cited 57 log files that a reader of the repository could not open. All 57 are now committed under one `.gitignore` negation for that
   directory alone. 46 changed in the scrub: 42 carried the home directory and
   more carried the per-user temp root. `scrub-emsdk-logs.md` is the table.

## What the scrub costs, measured

- **Three recorded hashes no longer reproduce from the scrubbed text.**
  `logs/06-runner-scripts.log` lists five runner scripts with their sha256.
  Re-hashing each listing from the original log reproduces all five. From the
  scrubbed log, `install-emsdk.sh` and `run-group.sh` still reproduce, and
  `run-build.sh`, `run-test.sh` and `run-xtrace.sh` do not. Each of those three
  had the home directory on its `NODE22=` line. The F-12 README says so where it
  prints the scripts.
- **No other recorded hash is affected.** The undefined-symbol set hashes in
  `logs/08-gen-tables-and-symbol-sets.log` are over symbol names; that log's
  only two changed lines are the paths in a `shasum` listing. The build-output
  hashes are over binary outputs, and only the paths beside them changed.
- **The originals are kept, locally, unpublished**, at
  `docs/evidence/f12-emsdk-2026-10-18/logs-unscrubbed/`, which stays ignored. If
  a negation or a `git add -f` ever brought them into the tree, the gate would fail
  on them. `emsdk-logs-unscrubbed.sha256` and `emsdk-logs-scrubbed.sha256` record
  both sides.

## A decision this took, and why it is reversible

`docs/reviews/` is a historical record, and the launch plan publishes it. 41
review files had personal paths or emails redacted. **That changes the bytes of a
record and not what any leg was shown to mean**: a path under the home directory is
still a path under the home directory. The private archive keeps every original in
history, which is not rewritten. The squash ruling (`CLAIMS.md` E-309) means history
is not published. Vocabulary in `docs/reviews/` is untouched. Whether the
translation of the `tapFailHard` shorthand reaches those files is still the owner's decision.

## What this does not establish

- **Personal data is still in history.** The gate reports 1,045 path hits and 30
  email hits in old blobs, and does not fail on them, because history is squashed
  at publication. If anyone proposes publishing the history,
  `bun run tools/check-no-secrets.ts --strict-history` fails on them, and history
  would need rewriting first.
- **The gate is lexical, over named classes.** `check-no-secrets` prints what it
  cannot see on every run. That covers a secret split across literals, any
  re-encoding, an unlabelled scalar that is not in the local store, and hostnames
  and names. Each limit is an asserted-uncaught control, so the list cannot go
  stale silently.
- **The publication commit has not been scanned, because it does not exist yet.**
  Phase 1 item 5 creates it, and the gate's `--repo <clone> --rev <commit>` form
  runs on exactly that tree. That run is the phase 1 gate, and this one is not.
- **The gate has had three external review rounds, and the rotation is closed.**
  `REVIEW-056` round one found 13 defects (`REVIEW-056c`). ⚠ **This said all 13
  were "fixed in `04aa4f3`", and round two showed three were fixed for their
  example and not their class** (`REVIEW-056d`, R2-9). Round two found 11 more;
  round three, which the owner ruled would be the last, found 9 (`REVIEW-056e`).
  All upheld findings are fixed. **Round three's fixes have not been reviewed.**
