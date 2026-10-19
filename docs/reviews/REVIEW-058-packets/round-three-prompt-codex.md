# REVIEW-058 round three — the fixes to round two, and the last round

You are an adversarial reviewer. This is the third and **last** round of a review
of a proposed design for a public, read-only demo page and of shipped code it
reuses. Round two found three fixes from round one that had not discharged their
findings, all by sweeping the whole tree for the sentence a fix corrected. The
author has fixed what round two upheld. **Your subject is those fixes.** The
rotation closes after this round, whatever it finds: anything you find will be
fixed and recorded, and nobody will review those fixes. So be precise, and say
for each finding exactly what would discharge it.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print both codes. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `29fc4ebacd24918e245e38f678dc3f621c054a69`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, any `scratchpad`
   directory, and the repository this clone was made from. Those hold real
   (Devnet, no-value) secrets. **Never print, cat or copy them.** Do not run
   `cargo`, `make check-zeroize-bounds`, `tools/rebuild-env.sh`, or
   `make check-no-secrets` without `--no-local-store`. Do not print seed or key
   literals from source files; refer to them by file and line.
4. You may write scratch files under `$TMPDIR`, run `bun install --frozen-lockfile`
   and `bun test`, and edit files in this clone to break them, as long as you
   restore them. Do not commit, push, or create, rename or edit anything on GitHub
   or anywhere else. Read-only network calls only, Devnet only.
5. ⚠ **Your transcript is committed to this repository.** Do not run `git log -p`,
   `git show`, `git blame` or `git diff` on `UPSTREAM-FEEDBACK.md` at any commit
   other than `29fc4eb`.
6. At the end, list every file you opened.

## What you are reviewing

- **The fixes:** `git diff 629f216 29fc4eb`. Read the changed files **whole**.
- **The ruling the fixes answer:**
  `docs/reviews/REVIEW-058d-adjudication-round-two-2026-10-19.md`. Its table lists
  every round-two finding, the ruling, and the fix promised.
- **Round two's raw reports**, for what each finding actually said:
  `docs/reviews/REVIEW-058-packets/round-two-codex-output.md` and
  `round-two-gemini-output.md`, and the self leg's
  `round-two-self-notes.md`.

## The three seams. Answer every one, each with an explicit verdict

List findings as `R3-n | HIGH/MEDIUM/LOW | claim | evidence you ran or read, with
paths and line numbers | exactly what would discharge it`. **If a seam has no
finding, write `Seam N: no findings` and say what you tried.** Grade HIGH only for
something that would publish a false statement of fact, expose a secret or private
datum, give the hosted page a signing or decryption path, or leave a round-two
finding undischarged.

### Seam 1 — is every upheld round-two finding discharged, at every site?

Go down `REVIEW-058d`'s table row by row and check each fix against what the
finding **said** in the raw reports, not against the adjudication's summary. Then
sweep the whole tree outside `docs/reviews/` for every sentence round two
corrected and report any copy that still stands, including paraphrases you can
find. No list is given here; derive it from the diff.

### Seam 2 — the two code fixes, broken

- `facility/src/loopback.ts`: one origin predicate now serves positive and negative
  answers. Try shapes the tests do not: `validated: "true"`, a `ledger_index` of
  `4800000.0`, a negative answer whose `ledger_index` is right and whose
  `validated` is absent, and anything else you think a node could send. Confirm
  against the public Devnet endpoint, read-only, that no honest pinned answer the
  facility or web tier uses is now refused.
- `tools/check-disclosure-phrases.ts`: the scan now flattens whitespace across
  lines. Find a wrapped copy it still misses, a true sentence it now rejects, and
  any change in what it reports for the existing tree. Say whether the gate's
  printed limitations still describe it.

### Seam 3 — new sentences

Revision 3 of `ADR-0004`, architecture §6 step 9, `REVIEW-058d`, `CLAIMS.md` E-327
and E-329, `web/api/capability.ts`'s browser-wallet row, and the gate's comments
all changed. Find any sentence that is false, overstated, or a count that does not
match what it counts.

## Last

Name the single sentence in the changed files you think is most likely to be false.
