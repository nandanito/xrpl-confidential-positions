# Contributing

This is a research artifact. It exists to find out what XLS-96 Confidential
Transfers actually hide on the XRP Ledger, by building against the protocol and
running it on Devnet. **The most useful contribution is evidence that something
here is wrong.**

## What is wanted

- **A sentence that outruns its evidence.** Every capability claim in this
  repository has a row in [`CLAIMS.md`](CLAIMS.md). If a sentence says more than
  its row, or a row says more than its evidence cell, open an issue with the
  "A claim here is wrong" template. This is the contribution the project has
  benefited from most.
- **A recorded command that gives a different result.** Many rows record the
  command that established them. Re-run it and report what you got.
- **A way to make a gate pass when it should fail.** The gates are listed by
  `grep -oE '^check-[a-z-]+:' Makefile`. Each prints what it does not check;
  anything outside that list that it misses is a defect. Send the input or the
  mutation that shows it.
- **Fixes** to the signer, the facility, the web tier or the tools, with a test
  that fails without the fix.
- **Documentation for a stranger.** If the README's *Run it* section did not work
  for you, say where it stopped.

## What is out of scope

- **Anything on mainnet.** Devnet only, at every phase, for any reason. A pull
  request that submits to mainnet, or makes it possible to, will be closed.
- **Calling any of this secure, audited, production-ready or trustless.**
  `CLAIMS.md` P-1 to P-12 are standing prohibitions. P-5 is the one most often
  crossed by accident.
- **A change that moves a trust boundary without a review.** The web tier
  reaches the signer with `Status` and nothing else, and a browser page cannot
  reach it at all (architecture §6 step 8). A change to either needs an
  adversarial review before the code, as `CLAUDE.md` describes.

## What a pull request must pass

**Every pull request** must pass what CI runs:

```bash
bun install --frozen-lockfile
make ci
```

`make ci` is `tools/ci.sh`, which is also exactly what GitHub Actions runs. It
prints the list of what it does not run at the end.

**If you touch `signer/`**, CI cannot check it, so run these yourself and say in
the pull request that you did:

```bash
tools/rebuild-env.sh               # builds the vendored mpt-crypto into /tmp/wconf (macOS, Homebrew openssl@3)
(cd signer && cargo test)          # sum every "test result:" line, and run it twice
make check-test-support
make check-zeroize-bounds          # ⚠ rewrites tracked files in signer/ while it runs; do not edit meanwhile
```

**If you add an upstream filing draft**, run
`make check-filing FILE=path/to/draft.md` on it.

**If you can run the full secret sweep** — that is, if you hold a local secret
store under `~/.wconf` or `/tmp/wconf` — run `make check-no-secrets`. CI runs
only its shape classes.

## Rules that apply to every change

- **A claim needs a register row.** Add it to `CLAIMS.md` with its evidence and
  grade. Editing `CLAIMS.md` takes two commits. The first is the register change,
  with the index and topic views regenerated:
  `bun run tools/build-claims-index.ts` and `bun run tools/build-claims-topics.ts`.
  The second is the revision log on its own: `bun run tools/build-claims-revisions.ts`.
  `make check-emphasis` enforces [`docs/EMPHASIS-DISCIPLINE.md`](docs/EMPHASIS-DISCIPLINE.md)
  on new rows.
- **Amendment status is a reading.** Never state that an amendment is enabled
  without `make check-amendments` output and its date beside it.
- **A named gap is a correct output.** If a source is unreachable, record that
  it is. Do not fill the gap from secondary coverage.
- **`tapFailHard` is this project's shorthand and appears zero times in rippled.**
  On reader-facing documents write `fail_hard` (the submission parameter) or
  `TapFailHard` (rippled's apply flag). `make check-vocabulary` enforces it.
- **`docs/reviews/` is a historical record.** Do not edit a review after its
  round; record a correction in `CLAIMS.md` instead.
- **No secrets and no personal data.** `make ci` runs the secret sweep's shape
  classes. `tools/scrub-personal-data.ts` replaces your machine's home and temp
  paths with placeholders in a transcript or a log before you commit it.
- **Branches are named `<kind>/<slug>`**, where the kind is `build`, `review`,
  `spike`, `decision`, `research` or `tools`.

## Licence

Contributions are made under the [Apache License 2.0](LICENSE), as section 5 of
that licence provides, unless you state otherwise in writing.
