# Review rounds — a historical record

Every file here is the record of an adversarial review round: the request or
packet a leg was given, each leg's output, and the adjudication that ruled on it.
`REVIEW-nnn` numbers the round; a letter suffix names a leg (`a`, `b`, and so on),
`s` the self leg, and `c` or `d` the adjudication. Packets and transcripts kept
whole are under `REVIEW-nnn-packets/`.

**These files are not edited after the round, and that is the point.** A packet
is the record of what a leg was shown, and a leg's output is the record of what
it found. Correcting either afterwards would make the round unreviewable. Where a
review was later found wrong, the correction lives in `CLAIMS.md`, which cites
the round.

## Two things to know before reading one

- **`tapFailHard` in these files is this project's shorthand, and it is not a
  real name.** It appears zero times in rippled. The real names are `fail_hard`,
  the submission parameter a client sets, and `TapFailHard`, rippled's internal
  apply flag. [`docs/VOCABULARY.md`](../VOCABULARY.md) is the translation. The
  reader-facing documents were translated on 2026-10-18, and
  `make check-vocabulary` keeps them that way. These files were left as written.
- **Personal paths and third-party email addresses were redacted on 2026-10-18.**
  That was the only change. 41 files here had the home directory, the macOS
  per-user temp root or a transcript's email addresses replaced with `$HOME`,
  `$REPO`, `$USER_TMP` or `redacted@example.invalid`, so that the repository
  could pass `make check-no-secrets` before publication. Every file kept its
  line count, and no other text changed. The per-file record is
  [`docs/evidence/secret-sweep-2026-10-18/`](../evidence/secret-sweep-2026-10-18/README.md).
