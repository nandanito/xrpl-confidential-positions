# REVIEW-036 — request: the adversarial rotation `ADR-0003` never had

- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1, `Proposed`
- **Frozen at:** `5f8cf42` (`main`, clean, in sync with origin)
- **Devnet only.** No mainnet writes, at any phase, for any reason.

## Why this rotation is owed, and why it is not another code review

`ADR-0003` is `Proposed` and its own final section says what it needs first:
*"An adversarial rotation on this document's central claim — that a read-only
tier moves no boundary. ⚠ **It has had none**, and the session that wrote it is
the session that will build against it."*

The claim:

> **A tier that reads public state and holds no credential grants no authority
> that did not already exist, so no trust boundary moves, so the gate does not
> fire.**

⚠ **That claim is what excused the web tier from the full adversarial rotation
`CLAUDE.md` requires before any trust-boundary change.** If it is wrong, step 8
was built under a waiver the project was not entitled to grant itself.

⚠⚠ **Six code-review rounds found the CONSEQUENCE of the gap once — the
decryption oracle, `CLAIMS.md` E-212 — and never tested the claim itself.** Code
review is the wrong instrument. This is a design argument, not an
implementation, and an implementation reviewer reads the code the argument
licensed rather than the argument.

## The legs, and the packets are DELIBERATELY DIFFERENT

⚠ **`CLAIMS.md` E-160 and E-223: identical packets give unanimity that is one
reading distributed, not independent confirmation.** The 2026-09-02 README
rounds settled it — five same-model legs reading only a document found prose
defects, while the two findings that mattered came from a leg with **repository
access** and from a leg reading **the document's own promises back at it**.

| leg | model | access | job |
|---|---|---|---|
| **a — Gemini** | external | **document text only** | Attack the claim as an ARGUMENT. Is the inference valid? Are the premises true as stated? Is the falsifier list complete? **No repository**, so no contamination from the tree or from the other legs. |
| **b — Codex** | external | **full repo, read-only** | **Is the claim TRUE of the built tier?** Enumerate every byte the tier emits, classify each PUBLIC / NOT PUBLIC, and test both premises against source. |
| **d — Codex** | external | **full repo, read-only** | **Read the document's own promises back at it.** The four acceptance preconditions, the six disclaimers, the two deferrals, every falsifiable assertion, and both recorded P-12 searches re-run. ⚠ **Forbidden from reviewing the argument's logic** — that is leg a's job, and the separation is the point. |
| **s — self** | — | full repo + session history + `CLAIMS.md` | Attack from the corpus. Adjudicate remedies against source. |

⚠ **Leg d was deliberately NARROWED and told not to widen.** Legs b and d are the
same model with repository access; giving them the same brief would have bought
one reading twice. The differentiator is the QUESTION, not the access.

## Independence controls actually applied

- ⚠ **The self leg was written to a scratchpad and held out of the tree until
  both repo-access legs returned**, then committed. `CLAUDE.md`'s `REVIEW-022`
  rule: do not let your own answers appear in the tree a leg is reading.
- ⚠ **No file was modified between launching the legs and collecting them.** The
  branch was cut afterwards.
- The three packets are stored verbatim in `REVIEW-036-packets/`.

## The known weaknesses of this round, stated rather than argued away

- ⚠ **The adjudicator wrote neither the ADR nor the tier** — unlike `REVIEW-034`,
  where the adjudicator wrote the subject. That is an improvement and not a
  cure: the adjudicator is still the party who chose the packets.
- ⚠ **Legs b and d are the same model.** Their agreement on any point is worth
  less than agreement between b and a.
- ⚠ **Leg a cannot verify anything.** Every factual claim it makes was checked
  against source by the adjudicator before being upheld, and two were rejected.
