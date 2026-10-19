DO NOT USE ANY TOOLS. Everything you need is pasted below. Do not try to read files, run commands, or browse. Answer from the text alone.

# REVIEW-047, leg B — round two: is the custody disclosure complete, and is anything in it overstated?

**You are an auditor checking a risk disclosure before it is relied on.** A confidential receivables facility runs on the XRP Ledger using Confidential MPTs (XLS-0096). A bank issues the token and funds a float held by a **Dedicated Account**; suppliers draw down from it and repay into it.

A first review round found that a decision request about custody of that float named one key when several parties can act on it. The project owner then ruled: **the custody risk is accepted by name, with a disclosure printed on every run, and no key split is built.** You are checking the result.

You have, pasted in full below:

1. **The disclosure** printed on every run (`facility/src/custody.ts`).
2. **The decision request, as fixed**, including its *Who else holds power over the float* section and *The ruling*.
3. **The first round's adjudication**, which is what the fixes were made against.
4. **ADR-0002**, including its revised custody row.
5. **The register rows** that record the findings and the rulings, whole.
6. **The XLS-0096 specification**, at `XRPLF/XRPL-Standards` commit `58ccd304724d328acd923a3adf11f7fccd707c81`.

⚠ **The specification is the authority on what the protocol allows.** Where the disclosure, the request or a row disagrees with it, that is a finding. Cite the specification by section and quote it.

## Your questions

1. **Using the specification alone, who can move, remove, freeze or read the float or its amounts, and by what mechanism?** For each, is it named in the disclosure? **Say whether anything missing is a NEW power or a new MECHANISM for a power the disclosure already names.** That distinction decides whether another review round is owed.
2. **Is any sentence in the disclosure or in *The ruling* overstated or understated against the specification?** Quote it, say which way, and quote the section that shows it.
3. **Do the fixes to the request say what the first round's adjudication found, no more and no less?** A fix can overstate what it fixed.
4. **Is *The ruling*'s reasoning sound on its own terms?** Not whether you would rule the same way.

## Rules

- **Quote the sentence and cite the section** for every point. No quotation, no finding.
- **Rank your findings, most serious first.**
- **Do not soften.** If the disclosure is complete and accurate, say so plainly; that is a useful answer.
- **Say what you checked and found correct.**

# Return format

```
## FINDINGS, most serious first
   n. [new power | new mechanism | overstated | understated | other] quoted sentence — where — what the specification says, quoted with section — what it changes
## WHO CAN DO WHAT TO THE FLOAT, by the specification
   party — power — mechanism — section — named in the disclosure? (yes / no / partly)
## THE RULING'S REASONING
## CHECKED AND CORRECT
```

---
