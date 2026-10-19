You are an adversarial reviewer with READ-ONLY access to this repository. Do not
modify anything. Your report goes to stdout.

# The subject

`docs/decisions/ADR-0003-web-tier-trust-boundary.md` is `Proposed` and has never
been adversarially reviewed. It rests on one central claim, and that claim is
what excused the team from running the full adversarial rotation their own
process (`CLAUDE.md`, "Review gates — scale to irreversibility") requires before
any trust-boundary change:

> **A tier that reads public state and holds no credential grants no authority
> that did not already exist, so no trust boundary moves.**

# Your job — and it is a job only YOU can do

Three other review legs are running. One has ONLY the document text and is
attacking the argument's logic. You are the leg with **the repository**. Your
job is therefore NOT to critique the prose. It is to answer, against source:

## **IS THE CLAIM TRUE OF THE THING THAT WAS ACTUALLY BUILT?**

The claim has two factual premises. Test each against the tree:

### Premise 1 — "reads public state"

**Enumerate every byte the tier can emit**, endpoint by endpoint. Start at
`web/api/server.ts` and follow every route. For each field in each response,
classify it:

- **PUBLIC** — recoverable by any observer from the public ledger alone.
- **NOT PUBLIC** — anything else: signer-local state, decrypted values, local
  filesystem content, host or process metadata, aggregates that are cheap here
  and expensive from the ledger.

⚠ **A field is not public because it is unimportant. It is public if and only if
an arbitrary third party could compute it from public data.** If any emitted
field is NOT PUBLIC, premise 1 is false as stated and that is a P1.

Pay attention to `web/api/signer-status.ts` and what the signer's `Status`
request actually returns (`signer/src/session.rs`, `signer/src/protocol.rs`),
and to `web/api/issuer.ts` and whatever file it reads.

### Premise 2 — "holds no credential"

The tier once held a decryption key and served decrypted balances behind an
unauthenticated GET. That was removed: a CLI tool now holds the key, decrypts a
curated set, and writes results to a file the tier reads.

**Test whether removing the key removed the property the claim needs.** Find the
snapshot file. Read what is in it. Then answer:

- Does the tier serve **decrypted confidential balances**?
- Could the party receiving them have computed them without this tier?
- Is "holds no credential" the same property as "conveys nothing a credential
  produces"? If those differ, the claim is equivocating and that is a P1.
- What authenticates a request for that data? What is the listener bound to?
  Check `Bun.serve` / `listen` in `web/api/server.ts` for the hostname argument.

### Then: what NEW reachable surface exists?

The project's threat model (`CLAUDE.md`, architecture §3) rules that **a hostile
same-host process IS in scope**. Enumerate what a hostile same-host process can
reach after this tier is built that it could not reach before. For each, say
whether `ADR-0003`'s claim covers it.

# What else to check against source

1. **The gate.** `tools/check-web-readonly.ts` is the ADR's named falsifier.
   Read it. **What does it NOT catch that the ADR implies it does?** It prints
   its own limitations — check whether that printed list is COMPLETE against
   what the code actually does. A gate that overstates itself is a P1 here
   because the ADR leans on it.
2. **The ADR's "Before this ADR can be accepted" list** — four items. Which are
   actually done? Check each against the tree, not against the prose.
3. **`Request::Status`.** The ADR quotes its behaviour as a safety argument.
   Verify the quotation against `signer/src/session.rs`.
4. **Any claim in the ADR that a grep can falsify.** The project's own rule is
   that a claim a source does not support is a defect regardless of how
   plausible it reads.

# Rules of engagement

- **Grade P1 / P2 / P3.** P1 = a premise of the central claim is false against
  source, or the tier does something the ADR says it does not.
- **Cite `path:line` for every finding.** A finding without a citation cannot be
  acted on and will be rejected.
- **Distinguish what you VERIFIED from what you INFER.** This project has been
  burned by legs that graded a defect from their own excerpt of a file rather
  than from the file. If you did not open it, say so.
- **Report what is SOUND too.** If a premise holds against source, say so and
  show the evidence. An all-negative report is as useless as an all-clean one.
- Do not run any network command. Do not write files. Do not run the test suite
  or the gates; read.

# Return format

```
## VERDICT: is the central claim true of the built tier?
## PREMISE 1 — "reads public state"
   [the enumeration table: endpoint | field | PUBLIC / NOT PUBLIC | evidence]
## PREMISE 2 — "holds no credential"
## NEW REACHABLE SURFACE
## FINDINGS   (Fn — [P1|P2|P3] — quote — path:line — defect — consequence)
## WHAT I VERIFIED vs WHAT I INFERRED
## WHAT IS SOUND
```
