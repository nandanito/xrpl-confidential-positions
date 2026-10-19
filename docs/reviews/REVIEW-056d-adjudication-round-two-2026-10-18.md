# REVIEW-056d — adjudication of round two, on round one's fixes

**Subject:** the fixes in `04aa4f3`, and the record of them in `REVIEW-056c`, `E-318`
and the secret-sweep evidence README, at `cef0b4f`. **Leg:** one Codex leg, same
model, effort and isolation as round one, prompt and output in
`REVIEW-056-packets/round-two-*`. It reproduced the baseline first: 84 of 84
controls, 74 of 74 probes, 4 of 4 self-test, and 60 of 60 repeated control runs.

**Outcome: 11 findings, 7 MEDIUM and 4 LOW, no HIGH. 10 upheld, 1 rejected.** The
leg ruled 10 of round one's 13 fixes discharged and 3 not.

⚠ **This adjudication corrects `REVIEW-056c`, which stays as written.** Two of its
sentences were false, and R2-9 to R2-11 say which. `docs/reviews/` is not edited
after a round, so the corrections are here and in `CLAIMS.md` E-318 and E-320.

## The findings

| id | grade | verdict | fix | pinned by |
|---|---|---|---|---|
| R2-1 | MEDIUM | **Upheld.** S3-1 was fixed for its example and not its class: a blank line between a JSON key and its value hid the label, and a 57-digit value fell below the range | The previous-line search skips blank lines; the range is 48 to 66 digits, the point where a uniform scalar's chance of being that short is 2^-64 | two controls; two mutations |
| R2-2 | MEDIUM | **Upheld.** The AWS pattern matched one spelling of the label; the AWS CLI's own JSON says `SecretAccessKey` | Any spelling: optional `aws`, `_` or `-` separators, any case | two controls; one mutation |
| R2-3 | LOW | **Rejected.** See below | — | — |
| R2-4 | MEDIUM | **Upheld.** The placeholder rule looked only at a token's last 16 characters, so a real token followed by sixteen dashes passed | Each pattern captures its variable part, and a placeholder is one whose whole variable part is one character repeated | control with a real token and a repeated tail; one mutation |
| R2-5 | MEDIUM | **Upheld.** `alice` and `bob` as generic names let a real home directory under either name pass | Removed. The leg's own fixture is allowed as one exact, case-sensitive, cited name, `Alice`, which the stale check would fail if its source lost it | control with a lower-case alice path; one mutation |
| R2-6 | LOW | **Upheld.** `--rev` searched `.gitattributes` text, so a comment mentioning `filter=` refused an ordinary repository | `--rev` reads attributes from the commit with `git check-attr --source`, and git parses them | must-pass control on a comment; the `--source` mutation |
| R2-7 | LOW | **Upheld.** The grafts refusal had no control, and reverting it passed everything | A control repository with a grafts file that hides a parent holding a seed | control; one mutation |
| R2-8 | LOW | **Upheld.** The Google fix was pinned only by a random sample, which ends in `-` one time in 64 | A deterministic sample ending in `-` | control; one mutation |
| R2-9 | MEDIUM | **Upheld.** `REVIEW-056c`'s *"each code fix is pinned"* was false for the grafts refusal and the Google boundary, and E-318's *"fixed in `04aa4f3`"* was false for three findings | Recorded here and in E-318 and E-320; the evidence README corrected | — |
| R2-10 | MEDIUM | **Upheld.** The gate's table said credentials are never allowed, and the evidence README said none appears, while the gate allowed two placeholders | Both sentences corrected | — |
| R2-11 | MEDIUM | **Upheld.** *"One key in 32"* was one in 64: `_` is a word character, so only `-` was ever missed | Corrected in the gate's comment, E-318 and E-320 | — |

## R2-3, rejected

Round one's S2-4 was that a submodule made `--rev` crash with *"object … missing"*.
The fix made the gate refuse instead, naming the submodule and saying its content
is another repository. Round two counts the refusal as not discharged, because an
ordinary submodule still refuses.

**The refusal is the intended behaviour.** A submodule's content is not published
by this repository, and the gate cannot vouch for content it does not read. The
defect round one named was a crash with a misleading message, and that is gone.
This repository has no submodule. If one is ever added, the refusal makes the
decision visible rather than silently passing over it.

## What this adjudication found

- ⚠ **The harness caught a control exercising the wrong variant again.** The R2-6
  control removed `.gitattributes` from the working tree after committing it, so
  that `--rev` would have to read the commit. But git falls back to the index copy
  of a missing `.gitattributes`, so dropping `--source` still refused and every
  control passed. Removing the file from the index too fixed it.
- **The round-two transcript failed the strengthened gate, correctly.** The leg
  planted 37 random-entropy seeds, labelled scalars, AWS-shaped values and other
  people's home paths, 358 spans in all. A periodicity allowance would have passed
  most of them, and was rejected: it would weaken the gate to accommodate its own
  reviewer, one round after that reviewer criticised the allowances.
  `tools/redact-review-fixtures.ts` replaced each span with a marker instead. It
  refuses any file outside `docs/reviews/`, and refuses if a value from the real
  secret store appears, because a real secret in a transcript is an incident.
  No stored value appeared.
- **The gate caught a personal path in its own source.** A comment written in this
  round quoted a home directory under the name alice. No file is exempt, so it was
  reworded.

## Where this leaves the gate

93 controls and 81 harness probes, all passing, and 30 consecutive control runs
clean. Three of round one's fixes needed round two to discharge their class, and
two were unpinned until round two.

⚠ **The stopping condition set before round two fired.** It was *"no third round
unless round two finds a fix that did not discharge its finding"*, and round two
found three. This project's precedent for that case (`REVIEW-049`, E-311) hands the
third round to the owner, with a recommendation. **Recommended: one leg, on the
round-two fixes only, with the rotation closing after it whatever it finds.** The
case for stopping instead is that round two found no HIGH, and its findings moved
from the gate's coverage to the record's sentences: the convergence pattern
`CLAUDE.md` describes.
