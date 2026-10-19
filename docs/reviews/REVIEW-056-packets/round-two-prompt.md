# REVIEW-056 round two — review the FIXES to `make check-no-secrets`

Round one of this review found 13 defects in a publication gate. They were fixed
and adjudicated. **Nobody has reviewed the fixes.** This repository's rule is that
fixing a defect and describing the fix fail separately, so the second round
reviews the fixes. Your job is to find a fix that does not discharge its finding,
and any new false pass the fixes introduced.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. If either fails, print `NO NETWORK` and continue without network.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `cef0b4f6dc344c12ed337cbd7c2daa073d9b8945`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.wconf`, `/tmp/wconf`, any `scratchpad` directory, and
   the repository this clone was made from. `~/.wconf` and `/tmp/wconf` hold real
   (Devnet, no-value) secrets. The gate's default run loads them in-process and
   never prints them; that is allowed. **Never print, cat or copy them.** To test
   the known-value class, build a synthetic store and pass `--store <dir>`.
4. You may write scratch files under `$TMPDIR`. Do not commit anything.

## What to read

- `docs/reviews/REVIEW-056-packets/round-one-output.md` — round one's findings.
- `docs/reviews/REVIEW-056c-adjudication-check-no-secrets-2026-10-18.md` — the
  verdict on each, the fix, and what pins it.
- The fix: `git diff b1dba96 04aa4f3 -- tools/`. The three files are
  `tools/check-no-secrets.ts`, `tools/break-no-secrets-gate.ts` and
  `tools/scrub-personal-data.ts`. Read the gate whole, not only the diff.
- The record: `CLAIMS.md` row `E-318`, and
  `docs/evidence/secret-sweep-2026-10-18/README.md`.

Commands (Bun is installed and `node_modules` is present):

```sh
bun run tools/check-no-secrets.ts --controls-only
bun run tools/check-no-secrets.ts --tree-only --no-local-store
bun run tools/check-no-secrets.ts --repo <some-repo> --rev <commit> --no-local-store
bun run tools/break-no-secrets-gate.ts            # ~90 s; writes tools/.mutant-<pid>.ts
bun run tools/break-no-secrets-gate.ts --self-test
```

## The five seams. Report on EACH, and say "no findings" explicitly where you have none

1. **Does each round-one fix discharge its finding?** Take round one's thirteen
   findings, and for each, re-run the input or mutation round one used against
   the fixed gate. A fix applied to the example the finding gave, and not to the
   class it named, is a fix that did not discharge it.
2. **The allow rules the adjudication ADDED.** A credential ending in sixteen
   copies of one character is a placeholder. `alice` and `bob` are generic user
   names. A scalar of one repeated byte is public. A cited fixture from round one.
   The toy bound is now 2^32. And the previous-line label window was NARROWED to
   a line ending in `key:` or `key =`. Can a real secret or a real person's path
   pass through any of these?
3. **The new refusals and the git environment.** `GIT_NO_REPLACE_OBJECTS` on every
   call; refusal of content-transforming attributes (parsed from `git check-attr
   -z`), submodules, untracked nested repositories, shallow history and grafts.
   Look for a false pass, a crash without the verdict line, and a refusal that
   fires on an ordinary repository.
4. **The new controls and mutations.** Does each new control exercise the variant
   its fix exists for? Is there a fix whose revert passes every control and every
   probe? Write the revert and run it.
5. **The record.** `REVIEW-056c`, `E-318` and the corrected evidence README. Does
   any sentence claim more than the code and the measurements show? Check the
   counts.

## Output

For each finding: a severity (HIGH = a false pass that could publish a secret or
a person's data; MEDIUM = a false pass on a narrower shape, or a false sentence in
the record; LOW = everything else), the file and line, the concrete input and the
wrong output, and **the command you ran that shows it**. A finding you could not
reproduce must say so.

End with a section headed `FINAL REPORT` listing every finding in one line each,
then `no findings` for each seam that has none. **State explicitly, for each of
round one's thirteen findings, `discharged` or `not discharged`.**
