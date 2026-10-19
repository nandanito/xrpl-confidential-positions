You are an adversarial reviewer with READ-ONLY access. Do not modify anything. Print your report to stdout.

# REVIEW-046, leg A — the custody decision request, against source

## The subject

`docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md` in this repository.

This project runs a confidential receivables facility on the XRP Ledger Devnet, using Confidential MPTs (XLS-0096). A bank issues an MPT and converts a float into a confidential balance held by a **Dedicated Account**. Suppliers draw down from it and repay into it. The request asks the project owner to rule on **who holds the Dedicated Account's key, and what the design says about it**. It prices five options and makes a recommendation.

The request has already been corrected several times. The corrections are marked in its text with ⚠. **Do not re-report a defect that is already marked as corrected.**

## Your job

Find where the request would lead its reader to a wrong decision. In priority order:

1. **Enumerate, from primary source, every credential and every party that has any power over the facility's float or over the confidentiality of its amounts.** For each one: what the power is, what it requires, and the `path:line` that establishes it. Then compare your list with the request's. **A credential or power the request omits is the highest-value finding.**
2. **Every security statement in the request.** Verify it at source. Report any that is false, overstated, or understated. Separate *false* from *incomplete*; they need different fixes.
3. **Each option.** Does its stated benefit hold at source? What does it cost that the request does not price? Does anything the request treats as independent turn out to depend on something else?
4. **The recorded evidence.** The request cites line numbers, a search, counts and a quoted comment. Check that each one reproduces.

## Sources

- **This repository**, read-only. `facility/` is the facility (TypeScript). `signer/` is the Rust signer that builds and proves confidential transactions. `tools/` holds harnesses.
- **rippled at tag `3.3.0`**, a complete shallow clone at commit `00a178fb92ca49521b937ae1a99d863765ea8a90`:
  `/private/tmp/claude-501/$REPO_SLUG/cb7ca921-3854-4770-8bd9-d19a55ab2115/scratchpad/review-046/rippled-3.3.0`
- **mpt-crypto**, the proof library, as this project vendors it: `/tmp/wconf/mpt-crypto`
- **No network.** Read nothing outside the repository and those two trees.

⚠ **`CLAIMS.md` and everything under `docs/` are this project's own claims, not evidence.** Use them to find where to look. Establish each finding from code, rippled, or mpt-crypto.

## Rules

- **Cite `path:line` and quote the text** for every finding. No citation, no finding.
- **Rank findings, most severe first**, with a severity: HIGH (would change the decision or its disclosure), MEDIUM (a false or unsupported statement that would not change the decision), LOW (a record that does not reproduce).
- **Say what you checked and found correct**, so the coverage is legible.
- **Do not rewrite the recommendation.** The ruling is the owner's. Say what is wrong with its inputs.
- If you cannot establish something at source, say so. A named gap is a correct output.

# Return format

```
## FINDINGS, most severe first
   n. [SEVERITY] [false | incomplete | does not reproduce] claim quoted — request line — what source shows, with path:line — what it changes
## EVERY CREDENTIAL AND POWER, from source
   credential — power — requires — path:line — named in the request? (yes / no / partly)
## CHECKED AND CORRECT
## WHAT I COULD NOT ESTABLISH
```
