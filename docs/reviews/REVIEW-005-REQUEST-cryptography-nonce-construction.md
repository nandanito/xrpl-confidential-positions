# REVIEW-005 — request packet for the Cryptography Reviewer

- **Prepared:** 2026-08-17. **Revised the same day** after `REVIEW-008-crypto-packet-2026-08-17.md`, in which two independent adversarial legs both returned "not fit to send". Five defects are fixed below and the revision notes are in §9. **Read §9 if you want to know how this packet was steering, because it was.**
- **Under review:** `ADR-0001-key-custody-and-proof-location.md` §(e), the nonce construction at lines 175–191.
- **The ask is not "approve this".** REVIEW-003b returned a CRITICAL finding that §(e) is *not implementable as written*. **The deliverable is a construction specified so completely that a Rust implementer makes no judgement calls.** Approving the existing sketch is not an available outcome; neither is rejecting it without a replacement.
- **What acceptance unblocks:** the **nonce construction**, and with it proof-generation code in the signer. **It does not unblock ElGamal key generation** — that is §(e)'s other half and needs its own ruling (§7). ADR-0001 stays `Proposed` until both land.

---

## 1. The question, in one paragraph

W-CONF will build a local signer that generates XLS-0096 compact sigma proofs. Those proofs need up to five secret nonces each. **Nonce reuse leaks the signing key outright, and the compact proof format makes the leak invisible to everyone including the victim.** ADR-0001 §(e) answers this with one line of pseudocode. We need the real thing: a construction specified to the byte, with its failure modes stated explicitly.

## 2. Why it is critical, not merely important

From `cmpt-compact-sigma.pdf` §6.1 and Remark 6.1 (Dore & Cenk, RippleX Research, 2026-05-12), recorded as `CLAIMS.md` E-34:

> Two proofs sharing nonce material permit witness extraction directly from the special-soundness equations. Because the compact form transmits `(e, z_m, z_r, z_b, z_ρ, z_sk)` and **not** the first-round commitments, the failure **"is not detectable from the proof alone"** — both proofs verify normally, and anyone holding the pair recovers the witness.

The witness includes `sk_A`, the sender's ElGamal secret key (E-33). The failure mode is therefore **silent, total, unbounded key compromise, triggered by an ordinary coding error rather than by an attacker**. No telemetry shows it. No verifier rejects it. It outranks every other cryptographic risk in this project, including the Trail of Bits timing findings, because those need an adversary with local measurement and this needs only a bug.

## 3. Hard constraints

| # | Constraint | Source |
|---|---|---|
| C-1 | **Nonce counts differ per proof type.** Send: **5**, over witness `(m, r, b, ρ, sk_A)`. ConvertBack: **3**, over `(b, ρ, sk_A)`. Clawback: **1**, over `sk_iss`. Registration PoK: **1**, over `sk`. | E-33; `secp256k1_mpt.h` proof sizes 192 / 128 / 64 / 64 B |
| C-2 | Four distinct Fiat-Shamir domains already exist: `CMPT_SEND_SIGMA`, `CMPT_CONVERTBACK_SIGMA`, `CMPT_CLAWBACK_SIGMA`, `CMPT_POK_SK_REGISTER` | `secp256k1_mpt.h` |
| C-3 | Proofs are **not** batch-verifiable; each is verified independently | E-35 |
| C-4 | The signer must never accept caller-supplied randomness across its localhost interface | ADR-0001 §(a), §(e) |
| C-5 | Scalars live in the secp256k1 order. A zero or out-of-range candidate must be handled, not assumed away | curve arithmetic |
| C-6 | **Nonce derivation is prover-local. Validators never observe it and it cannot affect whether a proof verifies.** Any construction that produces well-formed scalars is interoperable | `cmpt-compact-sigma.pdf`; the verifier takes only `(e, z…)` |

**C-6 is the one to keep in mind throughout.** There is no compatibility argument here. You are free to specify something entirely unlike any existing implementation.

## 4. The deliverable

A construction specified so that **two independent implementers, given the same inputs — including the same value for any randomness the construction consumes — produce the same nonces.** If your construction is deterministic, that means byte-identical output from the witness and statement alone. If it consumes fresh randomness, it means byte-identical output once that randomness is fixed, and you must say exactly how it enters.

Address each item by number.

1. **KDF and primitive** — named function, named hash, and why.
2. **Randomness** — does the construction consume any? If so: how much, from where, at which step, and **what the signer does when the source fails or is suspect**. If not, say so explicitly.
3. **Domain and version labelling** — exact bytes, a version tag, and the rule for migrating when the layout changes.
4. **Per-proof-type table.** One row for each of Send, ConvertBack, Clawback and registration, giving: exact domain bytes, the witness tuple **and its order**, the statement tuple **and its order**, the nonce count, and the label or counter for each nonce. **A single "five scalars" answer is not sufficient — three of the four types need a different count (C-1), and cross-type collision is a live failure mode (C-2).**
5. **Canonical encoding of every witness element** — width, endianness, and the encoding of a scalar that is zero.
6. **Canonical encoding of the statement** — which public elements, in which order, point compression, and how the transaction context binds in.
7. **Length framing** — explicit, and unambiguous under any future field addition.
8. **Expansion** — how one keystream becomes N independent nonces, and why they are independent.
9. **Mapping into the scalar field** — reduction or rejection sampling, the bias argument, behaviour on a zero result, and **if sampling: exactly how the counter advances per rejected candidate**, so that two implementations cannot desynchronise.
10. **Memory hygiene** — what must be zeroised and when. Intermediate buffers hold `sk_A` in the clear.
11. **Failure behaviour** — what the signer does when any step fails. **Silent fallback must be impossible.**
12. **A test plan that can actually fail.** State which tests detect nonce reuse. If your construction consumes randomness, note that a test asserting *"distinct statements yield distinct nonces"* **passes even when the randomness source is completely dead**, because distinct statements already yield distinct deterministic inputs — so say what additionally pins the random component and what proves the signer hard-fails rather than degrading quietly.

**Then answer explicitly:** is this construction deterministic, or does it consume fresh randomness? State the trade-off as you see it and choose. §5 sets out what we think is at stake; treat that as our view, not a constraint.

## 5. The trade-off as we understand it — our view, not a constraint

The project has no position and wants the reviewer's.

**For consuming fresh randomness ("hedging"):** it survives a witness-encoding collision, or a caller bug that reuses `(witness, statement)`, which a purely deterministic construction does not. It hedges against a future weakness in the statement encoding.

**Against it:** proofs stop being reproducible, so there are no fixed known-answer vectors over proof bytes and tests must assert verification rather than equality. It requires live entropy at signing time, which is hostile to an air-gapped or hardware signer and to any story where an auditor re-derives a signature from the witness. **And the operational risk is that a dead or degraded randomness source is undetectable by the obvious tests** (§4 item 12) — the construction keeps producing valid-looking proofs.

**One claim was removed from this section on 2026-08-17 because it appears to be false.** An earlier draft asserted that a degraded host RNG "weakens a hedged construction in a way it would not weaken a purely deterministic one". Under a constant or predictable salt a hedged construction degrades to its deterministic core, which is no *worse* than the deterministic scheme. **If you disagree, say so** — this was the single most load-bearing sentence in the earlier draft and we would rather be corrected than quietly right.

**A question we could not settle, offered without a position:** how should either choice behave under VM snapshot rollback, or any environment that can replay a signer's state?

## 6. Context on the runtime

ADR-0001 §(a) places proof generation in a **localhost daemon on the holder's machine**, not in a browser. If that changes which construction you would recommend, say so — the architecture is settled but this specific dependency has never been stated.

## 7. Out of scope

- **Deriving the ElGamal key from the XRPL master seed** — §(e)'s other half. It needs its own ruling and its own packet. **Answering nonces does not unblock keygen code**, and an earlier draft of this packet implied otherwise.
- **§(a)'s localhost boundary.** REVIEW-003b's MEDIUM finding, still unanswered, but a different question.
- Whether proving belongs local at all. Settled in ADR-0001; not reopened.

## 8. How to run this review

**Away from the repository, and twice.**

- **A fresh conversation with file uploads, not a coding session in this repo.** This is a design ruling that needs the papers and careful reasoning. More importantly the repository carries this project's framing throughout, and REVIEW-001 established that external reviewers must see the question **cold**.
- **Attach:** this packet, `ADR-0001` §(e), and `cmpt-compact-sigma.pdf` §6.1 and Remark 6.1. Optionally the Trail of Bits report for TOB-RIPCTXR-10 context. **Do not attach `CLAIMS.md`** — it carries our grades and our framing.
- **Two independent legs, then adjudicate.** Two models, neither seeing the other. On REVIEW-004 and again on REVIEW-008 the two legs independently converged on the same defects, which a single leg cannot show you.
- **Hold the reviewer to §4.** The failure mode is a thoughtful essay that leaves an implementer with the same judgement calls the ADR already left them.
- **Record both legs verbatim and unadjudicated**, then adjudicate separately. Do not apply findings in the pass that records them.

## 9. What was wrong with the first draft of this packet

Recorded because the reviewer should know what kind of document this is, and because §5 asks them to catch what we missed. All five were found by adversarial review on 2026-08-17 (`REVIEW-008`), before the packet was sent.

| # | Defect | Found by |
|---|---|---|
| 1 | §4 justified showing the upstream construction partly because *"W-CONF's proofs must verify against the same validators"* — **a non-sequitur, since validators never observe nonce derivation.** It manufactured compatibility pressure toward the incumbent design. Struck; now stated as C-6, and the upstream description is moved to a non-normative appendix **after** the requirements | **both legs** |
| 2 | The deliverable asked only for *"expansion into five distinct scalars"* while the constraints state three of four proof types need a different count. Now a required per-proof-type table (§4 item 4) | **both legs** |
| 3 | §5 claimed a degraded RNG weakens a hedged construction more than a deterministic one. Probably false; struck, with the reasoning shown so it can be re-argued | Gemini |
| 4 | The deliverable demanded *"byte-identical"* output while offering a randomised option, which makes byte-identity impossible by construction. Reworded | Gemini |
| 5 | The hedged test requirement passed even with a completely dead RNG. Now called out explicitly in §4 item 12 | Codex |

**The two legs disagreed about which way the packet was steering** — Codex said toward randomisation, Gemini said against it. A packet that steers both ways is worse than one that steers consistently, and that disagreement is the clearest evidence that the framing needed rewriting rather than adjusting.

---

## Appendix A — what one existing implementation does. Non-normative.

**Read this last, and only if you want it.** It is placed after the deliverable deliberately: an earlier draft put it before, and both review legs found the packet was steering. **You are not being asked to ratify, match or even consider this.** Per C-6 there is no interoperability reason to follow it.

`XRPLF/mpt-crypto`, `generate_deterministic_nonces` (`src/mpt_internal.h:218`) at commit `85dbac7`, read from source and confirmed by execution (`CLAIMS.md` E-48, E-55). **It is hedged, despite the function's name:**

```
IKM  = "MPT1" ‖ k(4,BE) ‖ witness_len(4,BE) ‖ domain_len(4,BE)
             ‖ witness ‖ statement_hash(32) ‖ domain
PRK  = HMAC-SHA256(salt, IKM)                       [Extract]
n_i  = HMAC-SHA256(PRK, prev ‖ i [‖ sub_counter])   [Expand]
```

- `salt` is 32 bytes from `RAND_bytes`, so output is randomness-dependent. Two proofs over an identical statement differ — verified by execution, natively and under WASM.
- Each output is reduced mod the curve order; a zero result retries with an extra counter byte, capped at 256 attempts.
- The 16-byte length-prefix preamble answers **TOB-RIPCTXR-10**, which upstream documents as a brittle-API concern rather than a live exploit. The `"MPT1"` tag reserves a migration point.
- Under WASM, `RAND_bytes` reaches `getentropy`, which Emscripten routes to `crypto.getRandomValues` in a browser and `node:crypto` under Node.
- **No exported entry point lets a caller influence the nonce** — no seed argument, no RNG hook, no global.
- **No upstream test asserts that two proofs over identical statements use distinct nonce material.** That is a grep-based negative, graded C, and a second reviewer with repository access did not contradict it (`UPSTREAM-FEEDBACK` U-30).
