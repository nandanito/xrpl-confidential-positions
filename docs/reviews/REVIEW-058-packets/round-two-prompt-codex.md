# REVIEW-058 round two, leg A — the fixes to round one, before any code

You are an adversarial reviewer. Round one of this review found defects in a
proposed design for a public, read-only demo page, and in shipped code the design
reuses. The author fixed them. **Your subject is those fixes**, which nobody has
reviewed. In this project the second round exists because fixing something and
describing the fix are separate acts with separate failure modes: a fix applied
to the line a finding cited, while a copy of the same sentence stands elsewhere,
is the most common defect here. Agreement is not useful. A finding that a fix
holds is useful only if you tried to break it and say how.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print both codes. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `629f21621c723cd7f61afec032c09248760b3ddf`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, any `scratchpad`
   directory, and the repository this clone was made from. `~/.wconf` and
   `/tmp/wconf` hold real (Devnet, no-value) secrets. **Never print, cat or copy
   them.** Do not run `cargo`, `make check-zeroize-bounds`, `tools/rebuild-env.sh`,
   or `make check-no-secrets` without `--no-local-store`.
4. You may write scratch files under `$TMPDIR`, run `bun install --frozen-lockfile`
   and `bun test` in this clone, and edit files in this clone to break them, as
   long as you restore them. Do not commit, push, or create, rename or edit
   anything on GitHub or anywhere else. Read-only network calls only, Devnet only.
5. ⚠ **Your transcript is committed to this repository.** Never print a secret,
   a seed, or any value from a file you were told not to read. Do not run
   `git log -p`, `git show`, `git blame` or `git diff` on `UPSTREAM-FEEDBACK.md`
   at any commit other than `629f216`.
6. At the end, list every file you opened.

## What you are reviewing

- **The fixes:** `git diff d764bca 629f216`. Read the changed files **whole**, not
  only the diff.
- **The ruling the fixes answer:**
  `docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`. Its table lists
  every round-one finding, the ruling, and the fix the ruling promised.
- **Round one's raw reports:** `docs/reviews/REVIEW-058-packets/round-one-codex-output.md`
  and `round-one-gemini-output.md`. Read them for what each finding actually said;
  the adjudication is a summary of them.
- `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` (now revision 2),
  architecture §6 step 9, `CLAIMS.md` rows `E-327` and `E-328`.
- ⚠ **Not reviewed in this round, and stated so you do not spend effort on it:**
  the self leg's notes for round two are kept outside this clone until you return.

## The five seams. Answer every one, each with an explicit verdict

For each seam list findings as `R2-n | HIGH/MEDIUM/LOW | claim | evidence you
ran or read, with paths and line numbers | the smallest fix`. **If a seam has no
finding, write `Seam N: no findings` and say what you tried.** Grade HIGH only for
something that would publish a false statement of fact, expose a secret or
private datum, give the hosted page a signing or decryption path, or leave a
round-one finding undischarged.

### Seam 1 — is every upheld finding discharged, at every site?

Go down `REVIEW-058c`'s table row by row. For each finding ruled upheld, say
whether the fix it names is present and whether it discharges what the finding
**said**, not what the adjudication summarised. Then grep the whole tree, outside
`docs/reviews/`, for every sentence a fix corrected, and report any copy that still
stands. Round one's corrected sentences include the trigger-5 sentence, *"nothing
to bind"*, *"no code of ours runs per request"*, *"a page on each origin tried"*,
*"Ledger values are not cached"*, the front page's *"decrypted"*, and the wallet
page's *"cannot be closed by any release"*. That list is the author's and may be
short; find the ones it misses.

### Seam 2 — the ledger reader fix

`facility/src/loopback.ts` now checks the ledger a "not found" answer names, and
the type of every entry. Three tests were added to `facility/tests/loopback.test.ts`.
Break the fix partially: remove only the index check on negative answers, then
only the type check, and say for each whether any test fails. Is any honest path
now broken: a method or response shape the facility or the web tier uses that
rippled answers without the fields the fix now requires? You may probe the public
Devnet JSON-RPC endpoint read-only to see what it actually returns. Compare the
TypeScript reader with the Rust reader's `came_from` and `ledger_entry` in
`signer/src/ledger.rs` and say whether the two now perform the same checks.

### Seam 3 — new or changed sentences

Revision 2, architecture §6 step 9, `REVIEW-058c` and `E-328` add many sentences.
Find any that is false, overstated, or a count that does not match what it counts.
Check every quoted measurement against the round-one transcripts it cites.

### Seam 4 — the H3 recommendation

Revision 2 moves D-H1's recommendation from browser reads (H1) to prerendered
pages (H3), on round one's leg B's argument. Does the reasoning hold? What does H3
leave unpriced: build provenance on the owner's machine, the risk-acceptance
variable the existing reader needs for a remote endpoint, how a reset is shown,
how often it is rebuilt, or anything else?

### Seam 5 — the gate and the copy fixes

`tools/check-disclosure-phrases.ts` gained three phrases keyed to `E-328`. Can a
copy of either false sentence return and pass the gate, for example reworded or
split across lines? Does any phrase false-fail on a sentence that is true? Are the
two corrected pages, `web/app/src/routes/index.tsx` and `wallet.tsx`, now true
against `web/app/src/routes/issuer.tsx` and the capability matrix?

## The stopping condition, copied word for word from the adjudication

> **no third round unless round two finds a fix that did not discharge its finding.**

Say explicitly, at the end, whether your findings meet that condition, and which
ones.

## Last

Name the single sentence in the changed files you think is most likely to be
false, and say how you would falsify it.
