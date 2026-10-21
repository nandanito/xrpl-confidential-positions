# REVIEW-059 round two — self leg

- **Subject:** the fixes to round one's upheld findings, `a5c897a..c08db2b`
  (`6b537e3`, E-343, and `2ffcafb`, E-344, each with its revision log), and the
  output rebuilt from `c08db2b` under the fixed tooling,
  `wconf-hosted-builds/review059-r2-c08db2b`.
- **Written:** from 2026-10-20T11:50Z, before either leg was launched; committed
  after both returned.
- **Stopping condition, from `REVIEW-059c`, word for word:** *"Round one reviews
  the build. If it upholds any finding that changes code, a gate or a record,
  round two runs on the fixes alone, and it is the last unless it finds a fix that
  did not discharge its finding; a third round is then the owner's decision."*
  `REVIEW-059c` ruled that *"the fixes"* means the diff and an output rebuilt,
  gated, browser-checked and preflighted under it.

## ⚠ Recorded first: the adjudicator's own fixes were checked against the summaries

E-344. Re-reading leg A's report finding by finding before this round launched,
four fixes had discharged half a finding each: R1-12's second sentence
(amount policy, three copies), R1-8's issuance read, R1-7's read time and
address, and R1-5's *"reject unsupported configurations"*. All four were fixed
in `2ffcafb`, with a test each that fails against `e45321b`. **The legs are asked
to check every fix against the round-one report's words, not the ruling's, for
the same reason.**

## Measurements, 2026-10-20

1. The output rebuilt from `c08db2b`: two containers, the second with
   `--network none`; the tree check passed on the full commit; ledger 6,270,649.
2. The fixed gate on it: 44 of 44 controls, full sweep with the local store,
   PASS, digest `577fc9d5…`.
3. The fixed browser check on it: PASS, 6 pages, 41 requests, footer `PASS, 18
   files`. 41 rather than 39 because the interval after the client navigation
   is now counted.
4. The fixed preflight on it: REFUSED on one ground only, that `c08db2b` is not on
   the public `main`, which is correct.
5. `grep -a` on the rebuilt pages finds each of the four changed sentences, and
   not the old Holder A note.
6. Each of the 14 new gate checks, deleted from a copy, failed its control. Each
   of the browser check's three new checks, deleted, failed its self-test. The
   build's network control fails with the offline arguments removed, on both
   halves, after two defects in it were fixed (E-343).
7. `bun test web/hosted web/api facility` 290 pass; `make ci` 290 / 5 / 0.

## What I would attack, and what I found

- **S2-1, LOW. The commit-label check matches the string anywhere on the
  page.** Check 9 requires `<code>${commit.slice(0, 12)}</code>` somewhere, not
  inside the commit link. A page carrying the right label elsewhere and a wrong
  one in the link would pass. The link's `href` is checked separately, so the
  residual is a label that disagrees with its own link.
- **S2-2, LOW. Two copies of the expected `Permissions-Policy`.** The gate's
  `EXPECTED_HEADERS` and the assembler each carry the string. A change to one
  fails the gate loudly, which is the safe direction, but it is E-141's shape of
  two readings of one obligation.
- **S2-3, note.** The ciphertext rule outside the ledger pages matches exactly
  132 hex characters. A 33-byte key (66) or a hash (64) on another page is not a
  ledger value in the falsifier's sense, and the printed limit (item 8) says what
  is caught.
- **Residuals, named and unchanged:** the ledger hash is not pinned (R1-9); code
  that runs during install or the snapshot has the network and the build
  machine's loopback (S-2); dependency code can change `/src` during the build
  (R1-10's second half). The install log names no dependency script, run or
  blocked, so how much code runs with network during install is not measured.
- **The live site is the round-one output.** Nothing here is deployed. Four
  visitor-facing sentences differ, and the custody page's overstated sentence
  stays live until the owner redeploys from a public commit carrying these
  fixes.

## What I tried and could not break

- The duplicate-directive refusal in mixed case (`Connect-Src`), and a
  comma-separated second policy, which the directive parser reads as one
  malformed directive and refuses.
- A later route that sets headers, at three positions, and a header name repeated
  in another case: all refused, each by its own control.
- The preflight's new ledger binding against the rebuilt output: every ledger
  page names 6,270,649, which is the manifest's.
