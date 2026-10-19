# REVIEW-056e — adjudication of round three, and the rotation closes

**Subject:** round two's fixes, at `88fa707`. **Leg:** one Codex leg, same model,
effort and isolation as rounds one and two; prompt and output in
`REVIEW-056-packets/round-three-*`. It reproduced every count in the record before
attacking it. **The owner ruled on 2026-10-18 that this round runs and that the
rotation closes after it, whatever it finds.**

**Outcome: 9 findings, 6 MEDIUM and 3 LOW, no HIGH. 8 upheld, 1 upheld in part.**
The leg ruled 6 of round two's 10 upheld fixes discharged, and 4 not. It agreed
with `REVIEW-056d`'s rejection of R2-3, and found no new false pass in seam 2.

⚠ **This adjudication corrects `REVIEW-056d`, which stays as written.** Its
sentences that three fixes "needed round two to discharge their class" and that
the redactor "refuses any file outside `docs/reviews/`" were both false (R3-8,
R3-9). The corrections are here and in `CLAIMS.md` E-321.

## The findings

| id | grade | verdict | fix | pinned by |
|---|---|---|---|---|
| R3-1 | MEDIUM | **Upheld in part.** See below | Known-value needles are searched without their leading zeros; the 48-digit shape bound stays, as a printed limit | control with a stored secret printed unpadded; asserted-uncaught control for a 47-digit value; one mutation |
| R3-2 | MEDIUM | **Upheld.** The AWS label allowed `_` and `-` between its words, not spaces, so `AWS Secret Access Key =` passed | Spaces and tabs allowed too | control; one mutation |
| R3-3 | MEDIUM | **Upheld.** The cited name `Alice` allowed every path under it, not the cited fixture | **Removed.** There is no name-wide allowance for any fixture now; the leg transcripts' synthetic paths were redacted instead | control on a path under that name |
| R3-4 | MEDIUM | **Upheld.** The gate's table said a placeholder's "whole value" repeats; the code tests the part after the fixed prefix | The table now says that | — |
| R3-5 | LOW | **Upheld.** The redactor checked the argument's text, so `docs/reviews/../../tools/x` passed and an outside credential could be hidden | Paths are resolved with `realpath` and must lie under `docs/reviews/` | tested by traversal and by an absolute path outside; both refused |
| R3-6 | LOW | **Upheld.** A file whose NAME fails the gate was reported as "nothing; 0 left" | The redactor checks the name and reports it as left, exit 1 | tested on `docs/reviews/state.json` |
| R3-7 | LOW | **Upheld, and fixed by deletion.** The cited-name stale check had no probe | The allowance and its stale check are gone with R3-3 | — |
| R3-8 | MEDIUM | **Upheld.** `REVIEW-056d` and E-320 overstated that three classes were discharged | Corrected here and in E-321 | — |
| R3-9 | MEDIUM | **Upheld.** Both records said the redactor refuses outside files, which R3-5 falsified | Corrected here and in E-321; the code now does refuse | — |

## R3-1, the part not upheld

The leg showed a labelled 47-digit scalar passing the shape rule. **The bound is
kept.** A uniformly drawn 256-bit scalar is printed in fewer than 48 hex digits only
when its top 17 nibbles are zero, which happens with probability 2^-68. Any lower
bound leaves a tail, and lowering it toward short hex brings in commit hashes and
account IDs that sit next to words like *private*. The bound is now a printed limit,
pinned by an asserted-uncaught control, so the disclosure fails if it goes stale.

**The finding exposed a different gap, and that part is upheld.** The known-value
class searched each stored secret as stored, with its leading zeros, so a real
stored secret printed unpadded, as `BigInt.toString(16)` prints one in sixteen,
was missed. Each hex needle is now searched with its leading zeros removed, which
also matches the padded form.

## What this adjudication found

- **Two of my own controls were wrong and the instruments caught both.** On a
  case-insensitive filesystem `home-alice.txt` and `home-Alice.txt` are one file,
  so two controls merged and one failed. And renaming the store control from "two
  secrets" to "three" left a harness needle naming the old text; the harness
  reported `WRONG-CONTROL` rather than counting it.
- **Round three's leg printed no synthetic secret**, as its prompt asked, so its
  transcript needed only personal-path redaction. 65 spans were redacted across the
  round-one, round-two and round-three transcripts and `REVIEW-056c`, all synthetic
  home paths; none was a value from the real store.

## The rotation is closed

97 controls and 83 harness probes, all passing; 30 consecutive control runs clean;
the full gate passes on the tree and on history. **Round three's fixes have not been
reviewed, and by the owner's ruling no round will review them.** What that leaves is
named in E-321. Five code changes are each pinned by a control or a tested refusal.
The docstring correction has no falsifier. One limit is stated and pinned.
