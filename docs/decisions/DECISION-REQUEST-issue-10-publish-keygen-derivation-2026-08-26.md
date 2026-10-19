# DECISION REQUEST — publish the W-CONF keygen derivation as an XLS informational draft?

**Raised:** 2026-08-26, by the upstream-filing session.
**Status:** ⚠ **RULED 2026-08-26 — OPTION 3.** The project owner accepted this request's recommendation. **Nothing was published upstream, and no XLS draft exists.**
**Discharges:** issue #10 / `REVIEW-012c` §7 condition 1 — or rules that it stays discharged at the minimum level.

---

## Why this is a request and not a filing

This session was authorised to file upstream and filed five items. **This one was deliberately not among them**, and the reason is not caution about the channel — the channel was checked and is open.

An XLS informational draft is a **new public cryptographic artifact**. `CLAUDE.md`'s review gates put "cryptographic design, anything to be published" in the full-adversarial-rotation category, before implementation. The derivation itself has been ruled and reviewed; **a document proposing it to the ecosystem as a standard has been reviewed by nobody**, and the two acts have separate failure modes — which is this project's own two-round lesson, one layer out.

⚠ **And the artifact is unusually unforgiving.** Issue #10 records it: a `v2` of the derivation label is **a fork, not a rollout**, because registered holders cannot migrate — XLS-96 has no key rotation. A published draft that is wrong cannot be corrected for anyone who has already used it. That is the opposite of the profile that justifies shipping a draft to get feedback.

## What is already true, and what is not

**Condition 1 is discharged at its minimum level and has been since 2026-08-18.** `docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md` §2 is precise enough to reimplement from prose alone, and that was demonstrated rather than asserted: `signer/src/keygen.rs` was written against the prose and reproduces both published vectors (E-118). Reconstruction does not depend on our binary.

**The benefit ADR-0001 §(e) trades for is still not delivered.** A holder with their seed and not this repository cannot reconstruct their key. The repository is public, so "not this repository" is a narrower gap than it sounds — but it is not the same as a standard a third-party wallet would implement.

**The gap upstream is real and was re-confirmed this session.** XLS-0096 is silent on ElGamal key derivation. That is not inference: the spec was read at `master` on 2026-08-26 for the errata filing (#608), and key derivation appears nowhere in it. Upstream tooling sources the ElGamal key as a distinct secret from the CSPRNG (U-32, U-43). **There is no canonical derivation for anyone to adopt**, which is what makes proposing one plausible — and also what makes proposing a wrong one costly.

## The decision

**Option 1 — publish an XLS informational draft.** Delivers §(e)'s benefit properly. Requires: a full adversarial rotation on the *draft as a public proposal*, not on the derivation; a decision on authorship and on how this project is named; and acceptance that the text cannot be revised in a way that helps anyone who has already registered a key under it.

**Option 2 — do not publish; make the onboarding disclosure carry the whole load.** Issue #10 already contains the sentence Leg A drafted for this case. ⚠ **If this is chosen, the disclosure needs a wording test** — this project's own record is that the one disclosure surface without a test is where the false sentence already lives (E-125, F-24). It is cheap and it is not currently there.

**Option 3 — publish, but not as a standard.** A repository document written to be lifted verbatim, linked from the onboarding disclosure, with no claim of ecosystem adoption. Delivers most of the recoverability benefit to a determined holder, avoids the fork-not-rollout trap, and needs a much lighter review than Option 1.

## The ruling, and what it obliges

**Option 3 is ruled.** A repository document written to be lifted verbatim, linked from the onboarding disclosure, making no claim of ecosystem adoption. Option 1 is **deferred, not rejected** — revisit once XLS-0096 settles.

**What this obliges, and none of it is done:**

1. The liftable document itself. ⚠ **It must not paraphrase `REVIEW-012-RULING-keygen-2026-08-18.md` §2** — either lift it or supersede it explicitly. Two documents describing one derivation is how E-126 happened.
2. **A wording test on the onboarding disclosure.** This project's record is that the one disclosure surface without a test is where the false sentence lives (E-125, F-24). The sentence Leg A drafted, in issue #10, is the text to pin.
3. A re-check of Option 1's premise before revisiting: XLS-0096 was still taking errata on 2026-08-26 — five filed, one (#610) an open question about a stated invariant.

## What this session recommended (for the record)

**Option 3, then reconsider Option 1 once XLS-0096 is closer to final.** The upstream spec is still taking errata — five were filed against it today, one of which (#610) is an unresolved question about a stated invariant. Proposing a derivation standard that binds permanently, against a specification still under correction, is the wrong order.

⚠ **This is a recommendation from the session that raised it, and it has had no adversarial review either.** It should not be treated as more than an input.

## What must not happen either way

**Do not paraphrase the construction.** `CLAUDE.md` is explicit: the construction lives in `REVIEW-012-RULING-keygen-2026-08-18.md` and **only** there. Whatever is published must be lifted or must supersede the ruling explicitly — not restated alongside it. Two documents describing one derivation is how the two-sentence merge in E-126 happened.
