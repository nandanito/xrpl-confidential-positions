# REVIEW-056 round three — the last round on `make check-no-secrets`

Two rounds have reviewed a publication gate. Round two found that three of round
one's fixes covered their example and not their class. Round two's own fixes have
been seen by nobody. **This is the last round: the rotation closes after it,
whatever it finds.** Your job is to find a round-two fix that does not discharge
its finding, and any new false pass those fixes introduced.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org`. Print
   both codes. If either fails, print `NO NETWORK` and continue without network.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `88fa7077fab0b448128d5b6f31e5c3708887bfe0`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.wconf`, `/tmp/wconf`, any `scratchpad` directory, and
   the repository this clone was made from. `~/.wconf` and `/tmp/wconf` hold real
   (Devnet, no-value) secrets. The gate's default run loads them in-process and
   never prints them; that is allowed. **Never print, cat or copy them.** To test
   the known-value class, build a synthetic store and pass `--store <dir>`.
4. You may write scratch files under `$TMPDIR`. Do not commit anything.
5. ⚠ **Generate synthetic secrets at run time and do not print their values.**
   Your transcript is committed after redaction, and a printed random seed is
   indistinguishable from a real one.

## What to read

- `docs/reviews/REVIEW-056-packets/round-two-output.md` — round two's findings.
- `docs/reviews/REVIEW-056d-adjudication-round-two-2026-10-18.md` — the verdict on
  each, the fix, and what pins it.
- The fix: `git diff cef0b4f f0d86f1 -- tools/`. Read `tools/check-no-secrets.ts`
  whole, not only the diff, and `tools/redact-review-fixtures.ts`, which is new.
- The record: `CLAIMS.md` row `E-320`.

```sh
bun run tools/check-no-secrets.ts --controls-only
bun run tools/check-no-secrets.ts --tree-only --no-local-store
bun run tools/check-no-secrets.ts --repo <some-repo> --rev <commit> --no-local-store
bun run tools/break-no-secrets-gate.ts            # ~2 min; writes tools/.mutant-<pid>.ts
bun run tools/break-no-secrets-gate.ts --self-test
```

## The five seams. Report on EACH, and say "no findings" explicitly where you have none

1. **Does each upheld round-two fix discharge its CLASS?** R2-1, R2-2 and R2-4 to
   R2-11. Round two's lesson was that a fix built from the finding's example misses
   the class, so for each, construct members of the class the example did not
   contain, and run them.
2. **New false passes from the round-two changes.** The previous-line label search
   that skips blank lines; the 48-digit lower bound; the broadened AWS label; the
   placeholder rule on each pattern's capture group; `alice` and `bob` removed and
   one cited, case-sensitive name added; `--rev` attributes read with
   `git check-attr --source`.
3. **`tools/redact-review-fixtures.ts`.** It must refuse outside `docs/reviews/`,
   refuse when a value from the real store appears, and redact exactly what the
   gate fails on. Can it hide a real secret, redact the wrong span, or leave a
   failing span behind while reporting none?
4. **Controls and mutations.** Is there a round-two fix whose revert passes every
   control and every probe? Write the revert and run it.
5. **The record.** `REVIEW-056d` and `E-320`. Does any sentence claim more than the
   code and the measurements show? Check the counts.

R2-3, a submodule refusing, was rejected with a reason in `REVIEW-056d`. Challenge
the reason if you think it wrong; do not re-report the behaviour alone.

## Output

For each finding: a severity (HIGH = a false pass that could publish a secret or a
person's data; MEDIUM = a false pass on a narrower shape, or a false sentence in the
record; LOW = everything else), the file and line, the concrete input described
without printing a synthetic secret's value, the wrong output, and **the command you
ran that shows it**. A finding you could not reproduce must say so.

End with a section headed `FINAL REPORT` listing every finding in one line each,
`no findings` for each seam that has none, and **for each of R2-1, R2-2 and R2-4 to
R2-11, `discharged` or `not discharged`.**
