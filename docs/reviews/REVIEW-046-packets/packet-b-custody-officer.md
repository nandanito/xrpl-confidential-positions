DO NOT USE ANY TOOLS. Everything you need is pasted below. Do not try to read files, run commands, or browse. Answer from the text alone.

# REVIEW-046, leg B — read the custody request as the person who would carry the risk

**You are the custody risk officer at a bank.** Your bank is considering running the confidential receivables facility described below, on the XRP Ledger, using Confidential MPTs (XLS-0096). Before it does, someone has written a **decision request** about who should hold the key to the facility's Dedicated Account, and it recommends an option.

You have four documents, pasted in full below:

1. **The decision request** — the document you are evaluating.
2. **ADR-0002** — the architecture decision that chose this design over an XLS-65 Vault.
3. **The facility walkthrough** — how the facility works, step by step, and what each step publishes.
4. **The XLS-0096 specification** — the protocol, at `XRPLF/XRPL-Standards` commit `58ccd304724d328acd923a3adf11f7fccd707c81`.

Plus the project's standing prohibitions: the things it may never claim.

⚠ **The specification is the authority on what the protocol does.** Where the request, the ADR or the walkthrough disagree with it, the specification wins, and that disagreement is a finding. Cite the specification by section and quote it.

## Your questions

1. **Who can do what to the float?** Using the specification and the walkthrough, list every party, key or credential that can move, remove, freeze, or read the facility's float or the amounts that flow through it. For each, name the power and quote the specification section that grants it. **Then: which of them does the decision request name, and which does it leave out?**
2. **Where would the request lead you to misjudge the risk?** Quote each sentence that, if you believed it, would make you underestimate or overestimate who can move or read the float. Say which way it misleads.
3. **Do the options do what they claim?** For each of the request's options, does the benefit it claims follow from the specification? What would it cost your bank that the request does not mention — in operations, availability, or recovery if something is lost?
4. **Is the recommendation's reasoning sound on its own terms?** Not whether you agree with it — whether the argument it gives follows from the facts it states, and whether those facts are complete.
5. **What would you need to know before signing off that the request does not tell you?**

## Rules

- **Quote the sentence and cite the section** for every point. No quotation, no finding.
- **Rank your findings, most serious first.** A list of twenty is a way of not choosing.
- **Separate "this is false" from "this is left out".**
- **Do not soften.** If the request is sound, say so plainly; that is a useful answer.
- **Say what you checked and found correct.**

# Return format

```
## FINDINGS, most serious first
   n. [false | left out | misleading] quoted sentence — request section — what the specification says, quoted with section — which way it misleads
## WHO CAN DO WHAT TO THE FLOAT
   party / credential — power — specification section — named in the request? (yes / no / partly)
## THE OPTIONS, one line each
## THE RECOMMENDATION'S REASONING
## WHAT I WOULD STILL NEED TO KNOW
## CHECKED AND CORRECT
```

---
