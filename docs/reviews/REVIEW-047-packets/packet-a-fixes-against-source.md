You are an adversarial reviewer with READ-ONLY access. Do not modify anything. Print your report to stdout.

# REVIEW-047, leg A — round two: review the FIXES, against source

## What happened, and what you are reviewing

This project runs a confidential receivables facility on the XRP Ledger Devnet using Confidential MPTs (XLS-0096). A decision request asked who should hold the facility's Dedicated Account key. Its first review round, `REVIEW-046`, found the request priced the wrong set of credentials. The adjudication is `docs/reviews/REVIEW-046c-adjudication-custody-request-2026-09-13.md`. The session then fixed the request, the project owner ruled, and the session built a disclosure and a file-mode fix.

**You are reviewing those fixes, at the repository's current commit (`74bf9a1`).** `git diff 5328ed4..74bf9a1` shows everything that changed. The fixes live in:

- `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md` — corrections marked `REVIEW-046` in place, a new section *Who else holds power over the float*, and a new section *The ruling*
- `docs/decisions/ADR-0002-facility-as-application-logic.md` — the custody row and the note below the table
- `docs/research/CUSTODY-2026-08-28.md` — one struck sentence
- `CLAIMS.md` rows E-117, E-256, E-266, E-290, E-291, E-292, E-293, E-294, B-27, B-28, B-29
- `facility/src/custody.ts` — the disclosure printed on every run
- `facility/src/secret-file.ts`, `facility/src/book.ts`, `facility/src/signer.ts`, `facility/run-facility.ts` — the file-mode fix
- `facility/tests/secret-file.test.ts`, `facility/tests/custody-disclosure.test.ts`, `tools/break-secret-file-modes.py` — the tests and the falsifier

⚠ **The verbatim review records under `docs/reviews/REVIEW-046*` are records, not fixes. Do not review them.** Generated files (`docs/CLAIMS-INDEX.md`, `docs/claims/`, `docs/CLAIMS-REVISIONS.md`) are not fixes either.

## Your job, in priority order

1. **Is there any credential or power over the float, or over the confidentiality of its amounts, that the disclosure in `facility/src/custody.ts` and the request's *Who else holds power* section still do not name?** Enumerate from primary source. **Say explicitly whether each thing you find is a NEW power or a new MECHANISM for a power already named**, because that distinction decides whether a third round is owed.
2. **Does any corrected or added sentence claim more than source supports?** Fixing a finding and describing the fix are separate acts, and the second is where round two usually finds something.
3. **Did any corrected phrase survive somewhere else in the live tree?** A sentence corrected in one file is a string, and strings have copies.
4. **Can any new test or the falsifier pass while the property it names is broken?** Name the false-pass mode concretely.
5. **The accepted recommendation, in the request's *The ruling* section:** does its stated reasoning follow from source?

## Sources

- **This repository**, read-only.
- **rippled at tag `3.3.0`**, a complete shallow clone at commit `00a178fb92ca49521b937ae1a99d863765ea8a90`:
  `/private/tmp/claude-501/$REPO_SLUG/cb7ca921-3854-4770-8bd9-d19a55ab2115/scratchpad/review-046/rippled-3.3.0`
- **mpt-crypto**, as vendored: `/tmp/wconf/mpt-crypto`
- **No network.** Read nothing outside the repository and those two trees.

⚠ `CLAIMS.md`, `docs/` and the review records are this project's own claims. Use them to find where to look, and establish findings from code, rippled or mpt-crypto.

## Rules

- **Cite `path:line` and quote the text.** No citation, no finding.
- **Rank findings, most severe first**: HIGH (a missing power, or a false sentence that would change the ruling), MEDIUM (a false or unsupported sentence, or a false-pass test), LOW (a record or wording defect).
- **Say what you checked and found correct.**
- **Do not rewrite the ruling.** It is the owner's.

# Return format

```
## FINDINGS, most severe first
   n. [SEVERITY] [new power | new mechanism | overstated | surviving copy | false pass | other] quoted text — path:line — what source shows, with path:line — what it changes
## POWERS OVER THE FLOAT, from source
   credential — power — mechanism(s) — path:line — named in the disclosure? (yes / no / partly)
## CHECKED AND CORRECT
## WHAT I COULD NOT ESTABLISH
```
