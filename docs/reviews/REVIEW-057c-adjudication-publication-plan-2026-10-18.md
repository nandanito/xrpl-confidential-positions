# REVIEW-057c — adjudication of round one on the phase 1 publication plan

**Subject:** `docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md` at
`adee1f0`, after the owner ruled D3, D4 and D7 and asked for a review before any
step runs. Secondary: this session's README and surface fixes, `20297cf..adee1f0`
(`CLAIMS.md` E-322).

**Leg:** one Codex leg, `gpt-6.1-sol` at `xhigh`, the strongest model this Codex
install offers as configured, at the owner's request. It ran in a fresh clone at
`adee1f0` under `$TMPDIR`, with no remote, no gitignored files, `workspace-write`
and network on, as a targeted plan-review round (`publication-egress-plan-r1`, round
1 of 3 under the owner's hook). Prompt, final report and transcript are in
`REVIEW-057-packets/round-one-*`, scrubbed by `tools/scrub-personal-data.ts`.

**Before the transcript was committed** it was checked against every private issue
body and comment, and every withheld row: no 60-character run from any of them
appears in it that is not also in the tracked tree at `adee1f0`. The one run not
found in file contents is a tracked file's name.

**Outcome: 11 findings, 4 HIGH, 6 MEDIUM, 1 LOW. All 11 upheld, R1-3 in part, and
R1-8 regraded MEDIUM.** Each was re-measured at source before it was ruled on.

## The findings

| id | grade | verdict | fix |
|---|---|---|---|
| R1-1 | MEDIUM | **Upheld.** `REVIEW-027`'s request reproduces the whole of `ed25519-dalek` 2.2.0's `src/hazmat.rs`; the crate is BSD-3-Clause (`Cargo.toml`, `LICENSE` in the registry copy). rippled is ISC and XRPL-Standards is MIT (`gh api`) | D3 now names the records' quotations; the `NOTICE` gains a second list and each licence's notice; **a scripted inventory is step 1**, because 133 records mention *verbatim* or a primary source and none of this was counted |
| R1-2 | LOW | **Upheld, and reproduced.** By hunk: 756 added, 500 removed, 341 context, so 841 upstream lines, 764 non-blank. `wconf_bench.c`: 96 of 321 lines exact, 101 trimmed. The request's 832 and 70/217 came from patterns that skipped blank lines and lines starting `--` | D3 carries the hunk counts and the definitions |
| R1-3 | HIGH | **Upheld in part.** `--no-verify`, a fresh clone and `core.hooksPath` each skip a hook, and the plan read as though the hook closed the route. Not upheld: that the guard should match URLs; it was built after the freeze as an allowlist by GitHub repository id, which is the leg's own preferred design | **D8, new, for the owner**: the guard plus a clone inventory (recommended), credential isolation, or a server-side ruleset |
| R1-4 | MEDIUM | **Upheld.** *"Full copies"* invited comments, while step 9 swept *"13 bodies"*, and the id scan cannot see a paraphrase | D7: title and body only, a read of the three open bodies, a sweep, and creation from the swept file |
| R1-5 | MEDIUM | **Upheld.** `REVIEW-013`'s request cites the re-weigh while it was open; the outcome is in `REVIEW-013c` | The stub drops the promise and links an outcome only where one is verified |
| R1-6 | HIGH | **Upheld.** Steps 4 to 6 made four commits under a sentence saying one, and squashing fails `check-claims-revisions`, because the log names the commit it was derived from | **Two commits**: the tree, then the log. Rehearsed at `bceea15`: the check passed |
| R1-7 | HIGH | **Upheld.** `tools/check-no-secrets.ts:1203` turns history off under `--rev`; step 6 committed nothing; action pinning came after the gate | Step 7 runs without `--rev` on a clean export, records `HEAD`, and step 9 pushes only that commit. Pinning moved to step 2. Rehearsed: tree and both commits' history scanned, PASS |
| R1-8 | MEDIUM | **Upheld, regraded from HIGH.** `.github/workflows/ci.yml` names the job `checks`, so a required check named `ci` never reports. It blocks merges and leaks nothing, and the setting is reversible in a minute, so it is not a publication failure under the packet's own definition | Step 10 requires the check name step 9 records |
| R1-9 | MEDIUM | **Upheld.** No Linux run has happened, and the plan saw the first one after going public | Step 9 waits for the private staging repository's first run to pass |
| R1-10 | MEDIUM | **Upheld.** *"A Draft for most of this project's life"* was false: 18 of 63 days. This session wrote it, in the commit that corrected a Draft claim | README: *"still a Draft when this project began on 2026-08-16"* |
| R1-11 | MEDIUM | **Upheld.** E-322's sweep missed live copies in the architecture document, the stack explainer, the launch plan, the disclosure gate's own messages and `ADR-0003` | Each dated where it stands; a phrase sweep then found three more in `ADR-0003` (lines 129, 291, 336), also dated |

## Against the self notes written before the leg ran

`REVIEW-057-packets/round-one-self-notes.md` was written to the scratchpad before
launch and committed only now. It had seven items:

- **S1 = R1-6**, found by both. The leg went further and showed that the obvious
  fix, squashing afterwards, fails the gate.
- **S2 ≈ R1-3.** The self notes named the hook's bypasses; the leg demonstrated them
  and drew the conclusion the notes did not, that a hook cannot be the boundary.
- **S3** (Discussions share the counter) and **S6** (settings on a private repository)
  were confirmed by the leg, the second as *no finding*.
- **S4 = R1-5** and **S7 ≈ R1-4.** S5 (the inventory covered only `.c` and `.h`)
  was the small half of R1-1.
- **Found by the leg alone:** R1-1's quoted crate source, R1-7's history-off gate,
  R1-8, R1-9, R1-10 and R1-11. **The self notes caught none of the false sentences
  this session wrote** — the pattern the project's memory records, again.

## Not done

- **Round two.** The leg reviewed the plan as frozen. The revised steps, D8 and the
  push guard's code have been seen by nobody, and round one had four HIGH findings,
  so the stopping condition did not fire. Owed, and the owner's call.
- **The R1-1 inventory**, which is step 1 and not a plan edit.
