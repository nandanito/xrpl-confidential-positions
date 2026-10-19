# REVIEW-056 round one — adversarial review of `make check-no-secrets`

You are reviewing a security gate in a research repository. The gate decides
whether the repository can be made public. A false pass publishes a secret or a
person's data; a false fail blocks the launch. Your job is to find false passes
first.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. If either fails, print `NO NETWORK` and continue without network.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `b1dba966f309755a1d5be1e088ae39b77df647e1`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.wconf`, `/tmp/wconf`, any `scratchpad` directory, and
   the repository this clone was made from. `~/.wconf` and `/tmp/wconf` hold real
   (Devnet, no-value) secrets. The gate's default run loads them in-process and
   never prints them; that is allowed. **Never print, cat or copy them.** To test
   the known-value class, build a synthetic store and pass `--store <dir>`.
4. You may write scratch files under `$TMPDIR`. Do not commit anything.

## The subject

The gate and its two companions, added by commits `3732bc8` and `d854d2e`:

- `tools/check-no-secrets.ts` — the gate. Read the whole file.
- `tools/break-no-secrets-gate.ts` — its mutation harness (`--self-test` too).
- `tools/scrub-personal-data.ts` — the scrubber that made the tree pass.
- `Makefile` targets `check-no-secrets`, `check-no-secrets-shapes`,
  `break-no-secrets-gate`, `break-no-secrets-gate-self-test`.
- The record of its first run: `docs/evidence/secret-sweep-2026-10-18/README.md`,
  `CLAIMS.md` row `E-317`, and the two notes added to
  `docs/evidence/f12-emsdk-2026-10-18/README.md` (its paragraph 2 and the
  sentence before `install-emsdk.sh`).

Useful commands (Bun is installed and `node_modules` is present):

```sh
bun run tools/check-no-secrets.ts --controls-only
bun run tools/check-no-secrets.ts --tree-only --no-local-store
bun run tools/check-no-secrets.ts --tree-only --store <synthetic-store-dir>
bun run tools/check-no-secrets.ts --repo <some-repo> --rev <commit> --no-local-store
bun run tools/break-no-secrets-gate.ts            # ~45 s; writes tools/.mutant-<pid>.ts
bun run tools/break-no-secrets-gate.ts --self-test
```

Exit codes: 0 pass, 1 findings, 2 a control failed or the gate refused. The last
output line is always `check-no-secrets: verdict=<WORD> exit=<N>`.

## What this repository has learned about gates, which binds this review

- It has shipped four gates that reported PASS while broken (`CLAIMS.md` E-165,
  E-168, E-182, E-201). Each was found by **breaking** the gate, not by reading it.
- **A control must call the same function the real check calls**, or it proves
  only that the control's own code runs.
- **A control can exercise the wrong variant of its subject.** This round's own
  harness found one: the control store had no duplicate value, so deleting the
  de-duplication passed every control. Ask what input actually produces the
  case a rule exists for.
- **A limit the gate prints must be an asserted-uncaught control**, so the
  disclosure fails when it goes stale.
- **A count in prose is a claim.** The record states counts; check them.

## What was already found and fixed before this round

- The control store had no duplicate, so de-duplication was untested. Fixed by a
  second store copy.
- The symlink-following probe crashed the controls instead of reaching its
  control. Reshaped to check the target exists, as a real regression would.
- The scrubber first used `<home>`-style placeholders, which GitHub renders as
  HTML tags and drops. Changed to `$HOME`-style names.

## The five seams to attack. Report on EACH, and say "no findings" explicitly where you have none

1. **False passes in the controls and the harness.** Can a detector be broken
   while every control and every mutation probe still passes? Write the mutation
   and run it. Are the 33 mutations shaped like real regressions? Does the
   harness classify a crash, a wrong control and a no-op correctly?
2. **Enumeration.** Does the scanned set equal what would be published, in the
   tree mode, the `--rev` mode and the history mode? Consider submodules,
   `.gitattributes`, filenames with odd characters, the index versus disk,
   symlinks, renamed paths, merge commits and annotated tags.
3. **Detector holes a real leak would plausibly take.** Not the exotic encodings
   the gate already lists as limits — the ordinary shapes: a seed or scalar in a
   JSON dump, a log line, a test fixture, a shell transcript, a Markdown table; a
   home path or email in a transcript. Construct inputs and run them through
   `scanText` or a temp repository.
4. **The allow rules.** Can a real secret pass under `PUBLIC_ENTROPY`,
   `publicScalars()`, `CITED_VECTORS`, the toy-scalar bound, `GENERIC_USERS`, the
   reserved email domains or the role addresses? Is each cited vector's source
   accurate against the file it names?
5. **The decision layer and the record.** Refusal semantics, `PASS-SHAPES-ONLY`,
   the history policy (personal data reported, secrets failed), exit codes. And
   whether `docs/evidence/secret-sweep-2026-10-18/README.md`, `E-317` or the F-12
   README notes claim more than the gate and the measurements show.

The scrubber belongs to seam 3 or 5: can it change anything other than the spans
it reports, or leave a personal datum it claims to remove?

## Output

For each finding: a severity (HIGH = a false pass that could publish a secret or
a person's data; MEDIUM = a false pass on a narrower shape, or a false sentence in
the record; LOW = everything else), the file and line, the concrete input and
the wrong output, and **the command you ran that shows it**. A finding you could
not reproduce must say so.

End with a section headed `FINAL REPORT` listing every finding in one line each,
then `no findings` for each seam that has none.
