# REVIEW-059d — adjudication of round two: the fixes to round one

- **Date:** 2026-10-20
- **Subject:** the fixes to `REVIEW-059c`'s upheld findings, `a5c897a..c08db2b`
  (E-343, E-344), and the output rebuilt from `c08db2b` under the fixed tooling.
- **Register:** `CLAIMS.md` E-345, and E-346 for the fixes. **Result:** the stopping
  condition fired; the fixes below are built, and **a third round is the owner's
  decision**.

## The legs, and how their packets differed

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a repository holding exactly two commits, the trees at `a5c897a` and `c08db2b` (verified blob for blob), plus the rebuilt and the deployed output roots; `workspace-write` with network | five seams; the findings to be judged by the round-one reports' own words. `round-two-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools | five questions, with the three round-one reports, `REVIEW-059c`, the fix diff, 25 whole files after the fixes, the records and the rebuilt pages' visible text inline (515 KB). `round-two-prompt-gemini.md` |
| self | the adjudicator | written from 11:50Z, before either leg launched. `round-two-self-notes.md` |

The self notes were deliberately absent from leg A's tree. Leg A ran its probes
in its workspace; its scripts and logs are `round-two-codex-review-work.md`.
Scrubbed with `tools/scrub-personal-data.ts`: 105 temp paths and one home path.
Neither leg was stopped by the provider's filter, and both exited on their own.

## Where the legs disagreed, and why it was possible

**Leg B found nothing in any of its five questions and ruled every finding
discharged. Leg A found twelve, two of which it graded HIGH.** The split is the
packets: leg B could read the code and judge each fix against the report's
words, and it did; leg A could also **run** each finding's own example against
the fixed code. Both of leg A's HIGHs are a round-one example that still passes,
which no reading would show without the example in hand. ⚠ This is the third
rotation in which only the leg that could execute and sweep found what survived
(`NEXT-SESSION-PROMPT` records the first two).

⚠ **A defect in my packet:** both prompts asked whether the stopping condition
*"fires"* without saying in which direction. Leg B answered *"Yes"* meaning
*round two is the last*; leg A answered *"Yes"* meaning *a fix did not discharge
its finding*. Read against their reasons they disagree, and only leg A's reason
matches the condition's text.

## Rulings

Every finding was checked at source. The two browser findings were measured by
the adjudicator, because leg A's Chrome would not start in its sandbox.

| id | claimed | ruling | why, and the fix |
|---|---|---|---|
| R2-1 | HIGH | **Upheld, MEDIUM; B1-8 was NOT discharged** | B1-8's own words: *"scan all prerendered HTML files for XRPL account addresses, issuance IDs, or ciphertext patterns"*. The fix scanned for the four demo addresses only, so B1-8's own example, `rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh`, still passed. Regraded as in round one: the deployed output complies. Fix: any address-shaped string and any 48-hex issuance ID on a page outside the two ledger pages, with B1-8's exact example as a control |
| R2-2 | HIGH | **Upheld, MEDIUM; R1-2's third request and B1-1 were narrowed** | `REVIEW-059c` ruled a disclaimer where R1-2 asked for an output regression, and the disclaimer itself overstated: *"one could enter the pages only as text in a public commit"* is false while build-time code can write the tree (R1-10's residual). Fix: a labelled issuer figure on any page fails the gate, with both of leg A's examples as controls; the printed limit names the build-time path |
| R2-3 | LOW | **Upheld** | An entity-encoded `//` and a second `srcset` candidate passed. Fix: numeric entities are decoded before the check, and every `srcset` candidate is read |
| R2-4 | MEDIUM | **Upheld; R1-7 was NOT fully discharged** | **Measured by leg A**: `readAt: "2"` passed, because the preflight matched a substring, and the manifest's endpoint was never bound. Fix: a manifest schema, the footer's exact provenance sentence, and the endpoint required to be the hosted one and shown on each ledger page |
| R2-5 | MEDIUM | **Upheld, LOW** | The content-type check dropped the parameter, so UTF-8 bytes served as `utf-16le` passed. Fix: a charset, if present, must be UTF-8 |
| R2-6 | MEDIUM | **Upheld; R1-5 was NOT fully discharged** | **Measured**: leg A's copy logging an error only on the second visit to `/` passes the browser check, because that load is cleared without being inspected. Fix: that interval is inspected like every other, with a self-test case |
| R2-7 | MEDIUM | **Upheld; R1-2's visibility half was NOT fully discharged** | **Measured**: `[data-dh2-wording]{opacity:0}` passes, because `innerText` keeps transparent text. Fix: each D-H2 element must pass `checkVisibility` with opacity and visibility, have a non-empty box, and be checked again after the client navigation; a self-test case for opacity |
| R2-8 | MEDIUM | **Rejected as a new finding** | The ledger hash is R1-9's half that `REVIEW-059c` ruled a residual, with reasons, and named. Leg A agrees it is acknowledged. It stays named |
| R2-9 | LOW | **Upheld** | `vite.hosted.config.ts:8` still said *"Nothing from the build machine's environment reaches the bundle"*, R1-11's old absolute. Fix: the limited guarantee |
| R2-10 | LOW | **Upheld** | Surviving copies of R1-12's and R1-13's corrected sentences, outside `docs/reviews/`: `ADR-0003`, the demo script, the limitations explainer, a comment in `capability.ts`, and `CLAIMS.md` E-206's *"not knowable from any published source"*. Fix: each copy scoped; E-206 gets a correction naming what its search covered |
| R2-11 | LOW | **Upheld; S-7 was not fully discharged** | The headers of `browser-check.ts` and `compare-deployed.ts` still named *"`ADR-0004` step 4"* and *"step 5"*. Fix: the README's step numbers |
| R2-12 | LOW | **Upheld** | E-344 said each completion had a test that fails against `e45321b`; the custody completion had none, and leg A restored the old custody text with every test passing. Fix: a wording test, and E-344's sentence corrected |

**Leg A also found** that E-343's *"refuses … a ledger value on a page outside the
two named ledger pages"* exceeded what was measured (R2-1's shape). Corrected
with E-346.

**Leg B's assessments rejected:** none of its rulings is wrong on what it could
read, but *"Question 2: no findings"* and *"discharged"* for B1-8, R1-2, R1-5 and
R1-7 do not survive leg A's executed examples.

## The stopping condition

*"Round one reviews the build. If it upholds any finding that changes code, a
gate or a record, round two runs on the fixes alone, and it is the last unless it
finds a fix that did not discharge its finding; a third round is then the owner's
decision."*

**It fired.** Round two found fixes that did not discharge their findings: B1-8,
R1-2 (two halves), R1-5, R1-7 and S-7. The fixes above are built in this session,
so that the owner decides on a finished state rather than an open one. **A third round
is the owner's decision.** The fixes are E-346. The recommendation follows the shape `REVIEW-050` used:
one repository leg, on the round-two fixes only, run each finding's own example,
and close the rotation after it whatever it finds.

## What changes, and what does not

Residuals, unchanged: the ledger hash (R1-9, R2-8), build-time network and
loopback (S-2), and build-time writes to the tree (R1-10's second half, which
leg A gave an exact container probe for; not run in this round). The live site
is still the round-one output.
