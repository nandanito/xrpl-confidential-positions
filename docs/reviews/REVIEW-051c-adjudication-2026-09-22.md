# REVIEW-051c — adjudication: the preparation for filing F-9, F-12, F-13 and F-17

- **Date:** 2026-09-22
- **Subject:** the pre-drafting preparation the owner asked for: issue templates, a re-check at upstream HEAD, prior-report searches, and the evidence each draft can cite. It is not a review of the register rows, whose rotation closed in `REVIEW-050c`.
- **Owner's ruling:** one Codex leg before `/upstream-issue F-9`, then record the result in the register before drafting.
- **Leg:** `REVIEW-051a`, one Codex pass with network, given the preparation report and eleven register rows in full. There is no self leg. The preparation is the author's own reading, and the leg is what checks it.
- **Recorded as:** `CLAIMS.md` E-313.

## Verdicts

| # | Attack point | Leg | Adjudication |
|---|---|---|---|
| 1 | `clio#3118` is F-9's remedy | NARROWED | **Upheld.** See below |
| 2 | F-9 re-run at `3baaaac` | NOT FALSIFIED | Same result as the author's run: exit 1 against `conan.xrplf.org`, exit 0 against `conan.ripplex.io` |
| 3 | F-17's NULL `context_id` half is Trail of Bits Appendix B | NOT FALSIFIED | The F-17 draft credits Appendix B for that half or drops it |
| 4 | The Sherlock/Attackathon sweep found nothing | FALSIFIED on method | **Upheld on method.** The hit it found is not a prior report of F-9. See below |
| 5 | Each finding holds at HEAD | NOT FALSIFIED | `3baaaac`, `8b1a228` and the XLS-0096 blob are unchanged. F-12 stays limited to 6.0.2 against 6.0.6 |
| 6 | Anything else overstated | none reported | — |

## Finding 1: migration, not retirement

The preparation said `clio#3118` *"swapped `conan.ripplex.io` for `conan.xrplf.org`"* and called the first *"the old remote"*. Both are true of clio and rippled. The leg showed the old remote is not retired. The author re-ran each part of that:

- `curl https://conan.ripplex.io/v1/ping` returns 200.
- `gh api -X GET search/code -f q='conan.ripplex.io org:XRPLF'` returns 5 hits. Three are in mpt-crypto: `conan/lockfile/regenerate.sh`, `.github/scripts/build-native-libs.sh` and `.github/workflows/build.yml`. Two are in xrpl-py.
- `conan.xrplf.org` serves `openssl/3.6.3` at `f806de89` and `1163d4dd`. rippled `develop` pins the first and clio#3118 the second.
- No XRPLF deprecation notice was found.

**Real:** yes. **Cure worth it:** yes, because it changes the ask. The draft describes the move as one to the remote rippled and clio now use. It names all three mpt-crypto sites, not only `regenerate.sh:17`. Its CI uses the old remote too, which is how CI passes while the README's route fails. `build.yml:71` adds it for the macOS jobs, and the Linux jobs run in a `clio-ci` image whose Dockerfile adds it (clio `14342e0`, `docker/ci/Dockerfile:115`). This said `build.yml:71` alone explained it until 2026-09-28, and that line covers macOS only.

## Finding 4: the sweep read no PR review comments

The preparation fetched the bodies and issue comments of the 104 issues and PRs that match *Sherlock* or *Attackathon*. It fetched no PR review comments. The leg found one about a lockfile, on `rippled#6861`: a bot review comment asking for rippled's own `conan.lock` to be regenerated rather than hand-edited. Read in full, it concerns two mpt-crypto release candidates in rippled's lock. It is not F-9's defect.

**Real:** yes as a gap in method, no as a prior report. The author then asked why `#6861` was in the corpus at all. The only match is a Codecov comment naming its base branch, **`ripple/attackathon-april-2026`**. That branch is public, at `a1613e5b0`. `gh pr list --base ripple/attackathon-april-2026` returns 16 PRs, including *"Confidential Transfer for Attackathon"* (#6809, #6828). All 16 were fetched with bodies, comments, review comments and changed-file lists. Every match on the four subjects is the word *conan* in rippled's own lockfile updates. None is about WASM, the shared-C₁ layout, Remark 6.1 or nonces.

**Cure:** the search statement in each draft names both corpora and the fields read. B-30 records the term *Attackathon* and the public branch.

## A count corrected before commit

The preparation report, and the packet the leg was given, say *"22 across `XRPLF`"*. The search log has 21 lines. E-313 carries 21. The report also said no search reached its limit, and the first *Attackathon* query did, at 50. It was re-run at 500 before the 88 was recorded, and E-313 says so.

## What this does not settle

- The contest's findings are still unobtainable. The public branch is the code the contest ran against, not what it found.
- Every search is lexical.
