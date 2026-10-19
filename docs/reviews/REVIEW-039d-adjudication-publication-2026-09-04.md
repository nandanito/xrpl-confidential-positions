# REVIEW-039d — adjudication: the publication rotation

- **Date:** 2026-09-04
- **Subject:** the repository as a **public artifact**, at `7d7149c`
- **Legs:** `REVIEW-039a` (fresh reader, no context), `REVIEW-039b` (hostile outsider, repo), `REVIEW-039c` (RippleX reader, repo)

## RULING

**The entry points are honest. The interior is not, in specific and fixable places — and one recommendation this project had already accepted was WRONG.**

⚠⚠ **THE HEADLINE IS A RETRACTION OF THE ADJUDICATOR'S OWN ADVICE.** Two legs, independently, reached the opposite conclusion to the recommendation given to the project owner on 2026-09-04 and accepted by them: that `UPSTREAM-FEEDBACK.md`'s *"Observed — not yet verified, do not send"* section could be published as-is because **the label does the work**. See U6.

---

## U1 — [POSITIVE, and it is the most important result] THE ENTRY POINTS SURVIVED A READER WITH NO CONTEXT

**`REVIEW-039a`.** A reader given only the four README-class documents, no repository and no prior knowledge, answered all six questions **substantively correctly**:

- Correctly reported that `Convert`/`ConvertBack` **publish amounts in plaintext** and only a `Send` hides one.
- Correctly reported that the issuer can decrypt **every** balance, always.
- Correctly answered **"no"** to *"would you describe this as secure?"*, and gave five accurate reasons.
- Correctly listed **all seven** trusted parties, including the submitter and the ledger node.
- Summarised maturity as *"a single-machine simulation… nowhere near an audited, deployable system."*

⚠ **This is what four README rounds and a disclosure-phrase gate bought**, and it is the strongest evidence the project has that its disclosure discipline works on someone who is not in on it.

## U2 — [P1] THE READER'S ONE WRONG INFERENCE TRACED TO A STALE ONBOARDING FILE

The same reader reported the pipeline as *"Rust, C, and **WebAssembly**"*. **There is no WebAssembly in the built artifact** — `ADR-0001` ruled Option 3 and the signer links a vendored C fork.

It traced to `GETTING-STARTED-CLAUDE-CODE.md` §*Session 3*, which still instructed: *"Proof generation is LARGELY DONE UPSTREAM… **The npm package `@xrplf/mpt-crypto` is NOT published**, so build from the repo's script."* **Both halves are false** — the package **is** published (E-53) and the WASM path was rejected.

⚠⚠ **`CLAUDE.md` tells every session to start with that file.** This is **E-204's shape** — a true sentence that went false and was never re-read — in the onboarding document. **Struck, with a historical banner on the section.**

## U3 — [P1] A RETRACTED CLAIM SURVIVED AS A PARAPHRASE IN LIVE SOURCE, IN THREE PLACES

**`REVIEW-039b`'s worst finding.** `web/api/server.ts:16`:

> *"The tier signs nothing, so it holds no key, so an XSS in the browser application reaches **exactly what a `curl` against a public node reaches**."*

**False.** The same process serves a **decrypted issuer snapshot** and **signer-local status** — a record count that includes attempts which never reached the ledger, and the local socket path. **None of that is on a public node.**

Two more copies: `web/api/signer-status.ts` (*"none of it exceeds what P-4 and P-11 already say this system leaves public"*) and `ARCHITECTURE-2026-08-18.md:246` (*"none of it exceeds what the protocol already publishes"*).

⚠⚠ **This is E-230 surviving as a RESTATEMENT, which is precisely the shape `check-disclosure-phrases` says it cannot catch** — it matches copies, not paraphrases. **All three fixed, and all three formulations added to the gate**, so the next copy is caught even though the next paraphrase still will not be.

## U4 — [P1] A NAMED INDIVIDUAL AND AN IMPUTED MOTIVE

**`REVIEW-039c`.** `CLAIMS.md` recorded that `rippled#8118` was closed *"by `<maintainer>`, WITHOUT COMMENT, thirteen hours after our own correction landed."*

⚠⚠ **That names a real person and sets their action beside our timing — motive by juxtaposition, about someone who never explained and was never asked.** **This project's own filing protocol says non-response *"is not evidence of anything, in either direction."*** The rule was applied to upstream and not to ourselves.

**Fixed: status and timeline only. The name and the inference are gone.**

## U5 — [P2] THE GATE COUNT WAS STALE WITHIN A DAY, IN THE COMMIT THAT ADDED A GENERATED INDEX

**`REVIEW-039b`, and its framing is the finding:** *"The project added a generated index because hand-maintained facts go stale, then immediately left its gate count hand-maintained and stale. An outsider disproves the headline discipline with one grep."*

`README.md` said *"Nine run over the repository"*; a tenth had just landed. `.PHONY` was missing three targets. ⚠ **Seventeenth instance, committed by the session writing E-236 about exactly this.**

**Fixed the way E-236 says: no number.** The README points at `grep -oE '^check-[a-z-]+:' Makefile`. `.PHONY` completed.

## U6 — ⚠⚠ [P1] THE ADJUDICATOR'S OWN RECOMMENDATION, RETRACTED

**Both repo legs, independently.**

- `REVIEW-039b`: *"'Observed — do not send' is meaningless once the repository itself is public and indexed."*
- `REVIEW-039c`: *"Definitive bold headlines… are published assertions regardless of the section heading. The heading therefore risks looking like **cover**: the project gets the reputational effect of an accusation while disclaiming that it has verified it."*

⚠ **The recommendation given to the project owner — publish as-is, because the label does the work — does not survive.** A label constrains a reader who reads it; it does not constrain a search engine, a quotation, or a screenshot. ⚠ **And the register's own promise is stronger than the label**: it says every entry carries a grade and a citation, while `check-negative-claims` **deliberately exempts** the Observed section.

**Also: the count was wrong.** *"37 ungraded rows"* — there are **37 rows in the section, of which 4 are filed and graded** (U-18, U-24, U-34, U-41), so **33 are ungraded.** ⚠ **The adjudicator derived it by counting rows after a heading rather than by reading them.**

⚠⚠ **THIS IS A DECISION AND IT GOES BACK TO THE OWNER**, with the recommendation reversed. Options, in the legs' order of preference: **keep the section out of the public tree**, or **rewrite every live entry as a dated, scoped question** with its missing verification named.

## U7 — [P1] THREE KNOWN-FALSE ROWS SURVIVED IN THE *GRADED* PART

**`REVIEW-039c`.** Each is contradicted by **a correction this project itself filed**, and none was propagated back into the row:

- **U-12** — still said the auditor property is *"not called out as a selling point anywhere I found"*. **XLS-0096 states it twice**, and one passage gives the exact benefit the row claimed as an original reading (`correction-8118.md:3-10`). Nine days standing.
- **U-51** — still praised §13.1's *"currency code"* entry. **A confidential MPT transaction has no currency field**; our own correction withdrew it (`correction-8118.md:16-21`).
- **U-48** — admits its documentation premise could not be established, then **repeats it in bold, unstruck, one sentence later**.

**All three corrected inline.** ⚠ **`E-194`'s shape: a finding is not discharged by filing a correction somewhere else.**

## U8 — [P2] FOUR MORE OVERCLAIMS, EACH A QUANTIFIER

**`REVIEW-039b`.**

- *"no wallet API would close it"* (`wallet.tsx`) — a universal a wallet implementer refutes with a design. **Bounded to the three APIs actually examined.**
- *"A policy engine **cannot** enforce an amount limit"* (`custody.tsx`) — while the project's own research lists constructions that could. **Narrowed to "by reading it".**
- *"`capability.test.ts` checks that each citation… **says what the cell claims**"* — **it checks existence only.** A citation to an irrelevant existing file passes. ⚠ **A gate asserting more than it checks, in the file describing the capability matrix.** Corrected to *"resolves and exists"*.
- `PREFLIGHT.md` still said *"delete this file once Session 1 has reported"* (three weeks ago) and *"there is deliberately **no `package.json`**"* (there is one). **Marked historical.**

## WHAT THE LEGS SAID WAS FAIR, AND IT MATTERS

⚠ **`REVIEW-039c` — the leg reading as the criticised party — affirmed most of the corpus.** The specification errata are *"concrete and mechanical… they criticize text, not people."* U-28, U-29, U-30, U-39, U-40, U-43, U-46, U-47 are named as exemplary, several for **recording the limits of their own search**. The review documents were called *"disciplined rather than contemptuous"* where they narrow a claim rather than inflate it.

**What it asked to be kept and made prominent:** the executed `tecBAD_PROOF` finding — *"rare, reproducible protocol feedback with a transaction hash and a demonstrated consequence."*

## OPEN, AND NOT A CODING SESSION'S TO CLOSE

1. ⚠⚠ **`UPSTREAM-FEEDBACK.md`'s Observed section** — U6. **The recommendation is reversed and the decision is the owner's.**
2. **Tone in the archived review packets** — `REVIEW-039c` flags *"the paper is broken"*, *"guilty until proven innocent"*, and a leg's accusation that the project's own author had an *"incentive to manufacture upstream bugs"*. **All are internal-review language, technically grounded, and theatrical in a public record.** ⚠ **Not edited: a packet is the record of what a leg was shown, and editing it makes it a worse record.** Whether that principle survives publication is a decision.
3. **The issuer route** — still open from `REVIEW-036`.
