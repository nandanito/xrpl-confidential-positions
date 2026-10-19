# REVIEW-011c — adjudication: the decision + architecture branch

- **Date:** 2026-08-18
- **Target:** `decision/threat-model-and-architecture`, three commits against `main`.
- **Three legs.** **Self** (written and fixed in `scratchpad/self-review.md` *before* either external leg was run or read), **Codex** (full repository access), **Gemini** (diff only, no file access). No leg saw another.
- **Method:** as before — every finding checked against source or re-executed before acceptance.

**Verdict: fix before merge.** One CRITICAL was raised and is **refuted**. Nine findings are accepted, and the largest cluster is a class this project has been bitten by twice already: **documents that were true when written and were made false by this branch's own changes.**

---

## 1. The conflict-of-interest check passed

I wrote the REVIEW-010 packet, adjudicated it, and rejected leg A on a circularity finding I discovered myself. Three stacked conflicts. Both external legs were pointed at it explicitly.

**Both independently affirmed it, and Codex recomputed leg A's vectors and got byte-identical values to mine** — `IKM` 222 not 188, `PRK = 110C3972C3E26309…`, `r = 50B8D53B6145814C…`. Gemini reached the same conclusion from the diff alone.

**And I applied the same test to the leg I agreed with**, which is the part that would have been easy to skip: an independent implementation written from the adopted ruling's prose reproduces its first two vectors **exactly**. The two legs' vectors were checked by one standard and came out differently for a real reason.

---

## 2. Refuted — Gemini CRITICAL-01, "unresolved `ρ` persistence causes permanent loss of funds"

**Rejected. The premise is closed by GAP-3 and contradicted by executed transactions.**

Gemini reasons that if `ρ_out` is not persisted, the next proof cannot supply `ρ_in`, so the balance becomes unspendable. That would be true of an `r_b`-based relation. **It is not true of the one XLS-96 specifies**, and the reason is the single most load-bearing fact in ADR-0001 §(a):

> *"Since `(B₁, B₂)` is already on-ledger, the prover **may not know the original `r_b`**. However, the sender knows `sk_A` … so the balance ciphertext satisfies `B₂ − b·G = sk_A·B₁`. This allows the sigma proof to link `PC_b` to the balance ciphertext **using `sk_A` rather than `r_b`**."*

Requiring `sk_A` **exists precisely so that the historical blinding is not needed.** `PC_b` is a per-proof commitment, not persistent ledger state; the ledger stores an ElGamal ciphertext.

**Executed evidence:** `tools/spike-2026-08-17/send.ts:72` draws a fresh `ρ` on every Send, and every one of this project's Sends has been accepted. If `ρ` had to persist, none of them could have been.

**But the finding is not worthless — it points at a real defect in my document, in the opposite direction.** `ARCHITECTURE-2026-08-18.md` §8 listed "whether `ρ` must be persisted" as an *open question*. It is not open; it is settled, and by a result this project already owns. Leaving it open invited exactly Gemini's reading. **Struck and replaced with the answer.** Codex's HIGH on the same territory ("the `rho` half is not settled enough to implement") is accepted **in this narrower form only**.

---

## 3. Accepted — the stale-claims cluster, and it is the important one

**Found by Codex; missed by me and by Gemini.** Flipping `WCONF_HEDGE` to 1 made four documents false without breaking a single test:

| Document | Now-false claim |
|---|---|
| `WCONF-PATCH.md` test table | "T-9: 0 entropy draws per proof in the default build" |
| `WCONF-PATCH.md` entropy table | the hedge is "off by default" |
| **`CLAIMS.md` E-62** | "**0** in the default build and **exactly 1** under `-DWCONF_HEDGE=1`" |
| `CLAUDE.md` preconditions | the randomness packet "is unruled", "no construction chosen" |
| `ADR-0001` status update | randomness packet has "no construction ruled" |

**E-62 is the serious one.** It is a register row, it is graded A, and this branch made it false. The register's entire purpose is that claims are checkable; a row that silently rots is worse than no row.

This is the **third** time this project has produced a document that was true when written and false by the end of the same session. The pattern is not carelessness about facts — it is that **changing a default is a documentation change**, and nothing in the workflow treats it as one.

---

## 4. Accepted — the hedged default is under-verified

Raised by me (SR-2) and independently by Gemini (CRITICAL-02); **Codex partially disagreed**, saying nothing previously verified is now *wholly* unverified.

**Adjudication: Gemini and I are right about the binary, Codex is right about the tree, and the distinction matters.**

Before the flip, T-9 asserted **zero** entropy draws on the default build. Upstream's `generate_deterministic_nonces` draws **one** (its Extract salt, `mpt_internal.h:262` at `85dbac7`, verified). So "zero" could only be true if upstream's derivation had been replaced — a genuine discriminator.

After the flip the default draws **exactly one**, and so does upstream. **T-9 no longer distinguishes our hedged binary from an unpatched one.** Nor does crosscheck check 1: upstream's verifier accepts upstream's own proofs too.

What remains for the *default* binary is `vendor-verify.sh`'s source grep — which proves the **tree** is patched, not that **this binary was built from it**. Codex is right that the deterministic arm still carries the reproducibility proof; it is the wrong arm.

**Accepted as a verification gap, not a defect.** Gemini's fix is the right shape and there is a cheaper version of it: `t9-entropy.c` already overrides `RAND_bytes` deterministically. The same technique gives a hedged build whose `aux` is fixed, making the hedged path reproducible and therefore KAT-able. Recorded as follow-up; it changes the harness, not the construction.

**Also mine, and neither external leg found it:** the hedged default **has never been executed on Devnet**. E-60's accepted transaction used the deterministic build. Cheap to close, and this project's standard is that executed beats argued.

---

## 5. Accepted — the ruling's durable randomness ledger is under-specified, and leaks

Three findings converge:

- **Gemini HIGH-01 — it deanonymises the holder locally.** §7 records `r_commit = C₁` in a durable local store. `C₁` is broadcast on every Send. A same-host process — **in scope as of this branch** — reads the file and correlates local state to on-chain transactions, including *aborted* ones that were never broadcast. **Accepted, and sharp: the ruling's own defence is a disclosure under the threat model the same branch adopted.**
- **Gemini HIGH-03 / Codex MEDIUM — crash leaves entries `pending` forever**, so a retry is refused permanently.
- **Codex MEDIUM — no loss/corruption semantics.** Strict loss bricks signing; permissive loss destroys the invariant.

**All accepted, and written into the ruling as amendments A1–A3 on 2026-08-18.**

**Writing the fix corrected one of them.** Gemini's HIGH-03 described a *permanent* deadlock — crash, then "the client retries under identical context parameters" and is refused forever. **A retry cannot collide:** `r` is derived from `entropy64` drawn fresh per signing *attempt*, so a retry over an identical transaction produces a different `r` and never matches the orphaned entry. The deadlock requires entropy reuse, which the construction forbids. What survives is Codex's narrower point — orphans accumulate unbounded with no defined fate — and A2 fixes that by *promoting* expired `pending` entries to `committed` rather than deleting them, which is free because the value they guard was one-time anyway.

Worth naming: this is the second finding in this round whose *territory* was right and whose *mechanism* was wrong, after CRITICAL-01. Both came from the diff-only leg, which is the leg least able to check a mechanism against source — and both were still worth having, because neither the source-grounded leg nor I looked at that territory at all.

---

## 6. Accepted — smaller, and fixed now

| Finding | Leg | Disposition |
|---|---|---|
| `t-r-and-rho-construction.ts:183` checks uniqueness over hardcoded `v.expected`, not derived output — a check that reports a property it does not test | Gemini | **Fixed.** Downgraded from HIGH: the per-vector loop compares derived-vs-expected and the nine expected values differ, so a real collision would still fail the suite. Redundant-but-lying, not a coverage hole |
| Architecture §6 licenses "Sends and Converts end-to-end" before the §5 gate | Gemini + Codex | **Fixed** — §5's embargo now says explicitly what it covers and what it does not |
| Architecture §5 calls keygen "the last one before `Accepted`" in a table listing two other outstanding items | **self** | **Fixed** |
| ADR-0001 precondition 3 marked met on a policy ruling, before any confirmation UI or IPC exists | Gemini | **Accepted, scoped** — met *as a design decision*, open as an implementation |
| Some "falsified if" clauses are partial | Codex | **Accepted, LOW.** Sharpened where cheap; a partial falsifier is still better than none, and the honest fix is to say what it does not cover |

---

## 7. What no leg found

Recorded so the next round knows where the blind spots were: nothing in this adjudication came from all three legs agreeing. **Every accepted finding was raised by one or two legs and missed by the rest** — the stale-claims cluster only by Codex, the local-deanonymisation only by Gemini, the never-executed hedged default only by me. The three-leg shape earned its cost here; two would have missed something.

**Self-review's standing weakness held again, in the direction the record predicts.** My leg found mechanisms — a weakened discriminator, an internal contradiction, an unexecuted configuration — and missed *instances*: I did not open the test I had run, and I did not notice that my own register row had gone false.
