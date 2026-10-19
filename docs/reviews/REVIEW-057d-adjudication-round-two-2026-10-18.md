# REVIEW-057d — adjudication of round two: the fixes, the push guard and step 1

**Subject:** the publication plan, the push guard and the third-party inventory at
`776ca25`: round one's fixes, and two artifacts built after round one froze its
subject, which nobody had reviewed as code.

**Leg:** one Codex leg, `gpt-6.1-sol` at `xhigh`, from a fresh clone at `776ca25`
under `$TMPDIR`, with no remote, `workspace-write` and network on, as plan-review
round 2 of 3 under the owner's hook (`publication-egress-plan-r2`). Prompt, report,
transcript and the self notes written before launch are in
`REVIEW-057-packets/round-two-*`. Its pushes went to local bare repositories only.

**Before the transcript was committed** it was checked against every private issue
body and comment and every withheld row: no 60-character run from any of them
appears in it that is not also in the tracked tree at `776ca25`. One planted
synthetic home path was redacted with `tools/redact-review-fixtures.ts`, and the
leg's clone, which held the private history, was deleted.

**Outcome: 12 findings, 4 HIGH, 6 MEDIUM, 2 LOW. All 12 upheld.** The leg ruled
five of round one's eleven fixes discharged and six discharged only in part.

## The findings

| id | grade | verdict | fix |
|---|---|---|---|
| R2-1 | HIGH | **Upheld.** A `git replace` ref showed the hook an unrelated graph while git sent the original private history | **The guard no longer judges what a push carries.** A private clone pushes only to the archive, whatever the push holds. A push behind a replace ref is now a case, refused end to end |
| R2-2 | HIGH | **Upheld.** A shallow install recorded the truncation point as the root, so older private commits passed | Moot by the redesign: the installer records no roots, and removes the old key |
| R2-3 | HIGH | **Upheld, and re-measured.** `gh api` followed `GH_HOST` to another host; with `--hostname github.com` it did not | Both lookups pin `--hostname github.com`. The fake `gh` answers from a different host's table whenever the flag is missing, so a regression fails a case, and a control proves an unpinned installer records the wrong id |
| R2-4 | MEDIUM | **Upheld.** A fail-open branch for non-commit objects survived every case | Moot by the redesign: there is no per-object branch left |
| R2-5 | MEDIUM | **Upheld, and re-measured** at the REVIEW-054 transcript from line 2351. Exact line matching missed every numbered quotation and any joined or reflowed code | Line-number prefixes are stripped, and a second pass matches identifier sequences across lines. It found far more of `mpt-crypto`, rippled and `ed25519-dalek` in the transcripts, and no further project once one false provenance was reviewed |
| R2-6 | MEDIUM | **Upheld.** A `NOTICE` of six bare names with a licence file deleted passed | The check is a manifest: each licensed project's entry must name a `LICENSES/` file byte-identical to that project's own root licence. Proved by deleting `ed25519-dalek` from `NOTICE` |
| R2-7 | HIGH | **Upheld.** History mode reports personal data instead of failing, on the assumption that history is squashed away, and both export commits are published | Step 7 adds `--strict-history`; the gate's own usage comment now says so |
| R2-8 | MEDIUM | **Upheld.** README line 384 still said *"a single squashed publication commit"*, a sentence this session wrote | Two commits, and the launch plan's and the gate's copies of the one-commit wording were found by a phrase sweep and fixed |
| R2-9 | MEDIUM | **Upheld.** `ADR-0003` and the architecture document still said the tier emits the socket path | Dated where they stand |
| R2-10 | MEDIUM | **Upheld.** D7 swept bodies while publishing titles | One manifest file per issue holds number, title and body; both `--title` and `--body-file` come from it |
| R2-11 | LOW | **Upheld.** *"Every tracked file against 108 corpora in 91 projects"*: 108 corpora were configured in 105 projects, 94 compared, and only text files are read | The inventory prints configured, compared and unavailable, and the file set it reads; D3 and E-324 corrected |
| R2-12 | LOW | **Upheld.** D8 called open after its ruling, D3 saying no `NOTICE` exists after one did, E-322's *"no review round cites E-241"* | Each dated or corrected; E-322 notes the later probe |

## What the inventory rebuild found, beyond the finding

The identifier pass first produced false attributions of three kinds, and each was
removed by a rule, not an exception: box-drawing characters in the README's
diagram, which tokenised as punctuation; licence text carried in source-file
headers; and SHA-256's published round constants in `signer/build.rs`. Tokens are
now identifiers and numbers only, a window must be at least half names, and windows
found in any project's licence file never count. **One hit needed a person**: a
rippled include block in a transcript, which clio also carries because it builds on
`libxrpl`. It was first set aside by hand, with its reason, and the same thing then
appeared in round two's own transcript; so the tool now carries the provenance as a
rule, `DERIVED_FROM`, under which a line rippled and clio both hold counts for
rippled. The hand list is kept, empty, and an entry that stops matching fails the
check. **Round two's transcript added a seventh project**, `@noble/curves`, whose
source the leg printed to plant a probe; it is in `NOTICE` and `LICENSES/`.

## Against the self notes written before the leg ran

- **T2 = R2-3** and **T3 = R2-5**, found by both.
- **T1** (roots added later) was the right class, and the leg found the sharper
  instance, a shallow install, R2-2. **T5** (an orphan commit allowed anywhere) was
  the same class as R2-1 and R2-4: the guard's judgement of what a push carries. The
  leg demonstrated it three ways; the self notes named it once.
- **T4** (corpora versions) was not raised by the leg and stands as a named limit.
- **Found by the leg alone:** R2-6, R2-7, R2-8, R2-9, R2-10, R2-11 and R2-12. As in
  round one, **the self notes caught none of the false sentences this session wrote.**

## Not done

- **Round three.** The owner's hook allows one more plan round. Round two found
  four HIGHs, so its stopping condition did not fire, and the guard's redesign and
  the inventory's rebuild have been seen by nobody. The owner's call.
