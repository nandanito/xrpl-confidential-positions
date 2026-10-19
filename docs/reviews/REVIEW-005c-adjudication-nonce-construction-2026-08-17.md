# REVIEW-005c — adjudication: nonce construction

- **Date:** 2026-08-17
- **Inputs:** `REVIEW-005a` (leg A, Claude Desktop inside the XRPL project) and `REVIEW-005b` (leg B, cold conversation outside any project). Neither leg saw the other. Both were given the same packet.
- **Method:** as REVIEW-002 through 008 — every disputed finding checked against source or re-executed before being accepted or rejected. Seven checks were run against mpt-crypto source, the Trail of Bits report, and `CLAIMS.md`.
- **Adjudicator:** the session that wrote the packet under review. The usual caveat applies and is sharper than usual here, because **both legs found defects in the packet that its own adversarial rotation (REVIEW-008) missed.**

**Outcome: the two legs agree on the finding and disagree on the design. The agreement is decisive; the disagreement is not resolvable at this layer and that is itself the ruling.**

---

## 1. What both legs found independently — this is the headline

**ADR-0001 §(e)'s nonce sketch is not underspecified. It is wrong, and the way it is wrong is reachable in ordinary operation.**

Both reviewers, working from the same packet but with no sight of each other, produced the same finding by the same route:

- The sketch derives nonces over `… ‖ statement ‖ …`.
- `TransactionContextID` is **not** in the statement as `cmpt-compact-sigma.pdf` defines it, but **is** in the Fiat–Shamir challenge.
- It contains the account **Sequence** (leg A, via TOB-RIPCTX-15) or advances with **`CB_S_Version`** (leg B, via TOB-RIPCTX-12/13).
- So an ordinary resubmission — a requeue, a `tefPAST_SEQ`, a wallet retry, a version bump — with cached ciphertexts yields **two proofs sharing first-round commitments under distinct challenges**, which is exactly Theorem 4.2's extraction condition.
- Nothing fails. Both proofs verify. `sk_A` falls out by subtraction.

**Two independent cryptography reviewers reaching the same non-obvious conclusion from the same primary sources is the strongest signal this project has produced.** It is accepted without reservation.

**Consequence:** ADR-0001 §(e) line 180's formula must be **struck, not annotated**. Both legs say so independently, and both give the same reason — a future reader will otherwise re-derive it from the paper's Remark 6.1, which contains the identical error.

### 1a. The paper's own justification is false, and that is an upstream finding

Both legs land on it. `cmpt-compact-sigma.pdf` Remark 6.1 justifies its construction with *"Including the full witness ensures nonces are unique per transaction."* **The witness is byte-identical across a resequenced or version-bumped resubmission.** The recommendation is fine; the stated reason is not, and a reader who trusts the reason builds the bug.

**Verified here, and it changes the severity in upstream's favour:** `src/proof_compact_standard.c` hashes `context_id` into `stmt_hash` after the point block, and the same holds in the convertback, clawback and pok_sk provers. **Upstream's implementation is sound on this axis and is not relying on its salt.** Leg B's §6.1 item 3 asked exactly this question and reserved judgement pending it; the answer is favourable and it removes the escalation leg B was contemplating.

**But the guard is `if (context_id)` and `proof_pok_sk.c` documents it as `/* context_id is optional */`.** A caller passing `NULL` reintroduces the full bug. So the mechanism is live as a **caller-error surface** even though upstream's own default is safe. That is the form the upstream feedback should take.

---

## 2. The disagreement, and why it is not settled here

| | Leg A | Leg B |
|---|---|---|
| **Ruling** | **Hedged.** 32 bytes of `aux`, entering as an XOR mask on the long-lived secret, BIP-340 style | **Fully deterministic.** No randomness at any step; the function signature must not even accept an RNG handle |
| **Why** | Fault injection is in scope: a same-host adversary is already in the threat model, per REVIEW-003b's MEDIUM on the localhost boundary and TOB-RIPCTX-5's timing finding | Fault injection is out of scope: an adversary with that much control over the prover can already read `sk_A` out of process memory |
| **On the RNG** | Masking degrades safely to the deterministic core; never worse | A dead RNG is *already* fatal via `r`, so hedging adds a second dependency on a source whose failure is game-over anyway |

**Both arguments are sound. They differ on one question: is an adversary who can fault the prover's execution inside this system's threat model?**

That is **not a nonce question**. It is ADR-0001 §(a)'s question, and **§(a) has an open, unanswered MEDIUM finding from REVIEW-003b on precisely that boundary** — that a localhost origin allowlist and pasted session token do not constrain a hostile same-host process.

**Adjudication: the nonce construction cannot be finalised until §(a)'s boundary finding is answered.** Leg A's reasoning is correct *if* the local adversary is in scope; leg B's is correct *if* not. Neither reviewer could settle it because neither was given §(a) — the packet's §8 attachment list sends only §(e).

**This is a clean result, not a stalemate.** The two legs have reduced a cryptographic decision to an architectural one that another open finding already owns, and they have made the dependency explicit in both directions. Leg B states the revisit trigger precisely: hardware signer, smartcard, HSM, shared or multi-tenant host, or one process proving for multiple holders. Leg A's `VERSION` byte and leg B's `v1` label are both the migration point.

**What is not in dispute**, and can be implemented under either ruling: HKDF-SHA-512; the transaction context bound in; one encoder shared with the challenge; wide 64-byte reduction; **no rejection sampling**; **abort on zero, never retry**; fixed-width `S32` witness encoding; length framing throughout; per-proof-type domain and count separation; the `(b, ρ, sk_A)` ConvertBack order. **The two constructions differ only in whether a mask is XORed over the long-lived secret before hashing.**

---

## 3. The second thing both legs found independently

**The packet asks for a construction the project may not be able to install** — leg A's GAP-A, leg B's §5.1. Both call it "the sixth defect", both by the same argument:

- ADR §(a) makes the signer a **Rust FFI wrapper around mpt-crypto**.
- The packet's own Appendix A records that mpt-crypto has **no exported entry point that lets a caller influence the nonce**.
- Therefore a Rust caller cannot implement *either* ruling through the existing FFI surface. **C-6 grants a freedom the build does not provide.**

Both note the irony precisely: REVIEW-008's defect #1 was fixed by moving the upstream description *after* the requirements, and that move filed the fact that upstream **is the thing that will actually run** under a heading reading *"Read this last, and only if you want it."* **The fix for one steering defect created another.**

Leg B goes further and costs the options: vendor mpt-crypto at a pinned commit and replace one function (recommended, two-file diff, CI-assertable against `85dbac7`); reimplement the prover in Rust (~300 lines, loud failure mode); or upstream a nonce-injection API (**reject** — a public nonce-injection hook is the footgun this review exists to prevent).

**Accepted. This blocks implementation of either construction and is now the critical path.** E-57 makes it sharper than either leg knew: `mpt-crypto-sys` and `mpt-crypto` are **published Rust crates from `XRPLF/xrpl-rust`**, which makes the FFI branch more likely, not less.

---

## 4. Rejected, with citations

| Finding | Decision | Basis |
|---|---|---|
| **Leg B §6.2** — a zero-amount Clawback cannot build a transcript, because `0·G` is the point at infinity and libsecp256k1 cannot serialise it | **REJECTED — already handled upstream** | `proof_compact_clawback.c:34–60` substitutes **33 zero bytes**, with a comment noting that 33 zeros is not a valid compressed-point prefix (`0x02`/`0x03`), so the sentinel is unambiguous, and that prover and verifier must both use the helper. Anticipated and documented, not broken |
| **Both legs** — the packet's `TOB-RIPCTXR-10` should be `TOB-RIPCTX-17` | **HALF ACCEPTED, substitution REJECTED** | Both are right that the April report has **no `RIPCTXR` series at all** (zero occurrences) and that `TOB-RIPCTX-10` is the High-severity overdraft finding. But the packet was repeating **upstream's own comment** at `src/mpt_internal.h:199–201`, which cites *"The TOB **May 2026 revision audit** (RIPCTXR-10, Informational)"* — a **second document this project has never obtained**. Leg A flags its own substitution as an inference; leg B asserts it. **Neither is supported.** Recorded as a gap, not backfilled |
| **Leg B §5.3** — the audit's highest-severity finding may be mis-recorded in the project's risk register | **REJECTED — checked and clean** | `CLAIMS.md` references `TOB-RIPCTX` in exactly three places: E-34 (correct), the standing rule to check the audit, and R-4 citing TOB-RIPCTX-11. **`TOB-RIPCTX-10` is not mis-recorded anywhere.** The error was confined to the packet's Appendix A. A correct escalation to raise; it checks out clean |

---

## 5. Found by adjudication, not by either leg

**Leg A's identity-point rule is wrong for Clawback, and leg B's structure avoids the problem without knowing it.**

Leg A §1.2 states: *"The identity has no encoding. If any statement element is the identity, ABORT."* But the real Clawback transcript encodes `m·G` for `m = 0` as **33 zero bytes**, deliberately. A signer following leg A's rule literally would **abort on a legal zero-amount clawback** that upstream's prover and verifier both handle.

Leg B's §1.1 rule — *construct the transcript once and pass the identical bytes to both the KDF and the challenge hash* — inherits the sentinel automatically and cannot diverge. **Neither reviewer knew this; it comes from reading the C.**

It is a narrow point and it does not decide §2's disagreement. But it is direct evidence for the *shared* rule both legs independently reached: **mirror the bytes, do not re-derive them.** Leg A stated that as D-7 and then, in §1.2, wrote an encoding rule that violates it.

**Also recorded: the two legs are not equally verifiable.** Leg A shipped a reference implementation and vectors, and its T-2 was **run and passed here** — an independent TypeScript implementation written from its prose reproduced all five vectors, zero mismatches (`REVIEW-005a-reference/`). Leg B's construction ships no vectors, and its own T-10 **cannot be run**, because leg B's §6.1 blocks its KATs on transcript bytes it declined to guess. That is not an argument that leg B is wrong — its refusal to guess is correct behaviour — but the two rulings currently sit at different evidentiary grades and should not be compared as though they did not.

---

## 6. Packet defects accepted, beyond the sixth

| Leg | Defect | Verified |
|---|---|---|
| B §5.2 | §5's surviving **pro**-hedging bullet is also false. A caller bug reusing `(witness, statement)` is the *benign* case — identical challenge, byte-identical proof, nothing extractable. REVIEW-008 struck the anti-hedging claim and left this one, so the packet ended up steering **harder** toward hedging after its own adversarial rotation | Confirmed against §5 |
| B §5.5 | Packet §1 says nonce reuse *"leaks the signing key"*. It leaks **`sk_A`, the ElGamal secret** — retroactive decryption and proof forgery, **not** spending authority over the XRPL account. §2 gets it right; §1 does not, and `CLAIMS.md` E-34 is more precise than the packet | Confirmed at line 12 |
| B §5.8 | §8 says *"do not attach `CLAIMS.md`"*, then the packet cites **E-33, E-34, E-35, E-48, E-55, U-30** and quotes a grade. The framing arrives anyway, unauditable — the reviewer sees conclusions without evidence | Confirmed; seven identifiers |
| Both | The cover instruction says *"§6 lists ten items"*; the checklist is **§4 with twelve**. Leg B notes items 11 and 12 are exactly the two REVIEW-008 added, so answering the cover note literally would have dropped both | Confirmed |
| A, B | C-1 cites the paper for the ConvertBack witness order without noting the paper says **three different things** — relation `(b, sk_A, ρ)`, sampling `(t_b, t_sk, t_ρ)`, serialisation `(e, z_b, z_ρ, z_sk)` | Both resolve to serialisation order |

**Both legs independently identified `r` and `ρ` as unowned** — nobody has specified where the ElGamal encryption randomness and Pedersen blinding come from, or what happens when that source fails. Leg B argues it is now the project's **largest** remaining randomness exposure and should be a third packet scheduled **ahead of** the keygen one, since Convert discloses `r` on-chain and is the first irreversible transaction a holder makes. **Accepted.**

---

## 7. Disposition

**Accepted and actionable now:**

1. **ADR-0001 §(e) line 180 is struck.** Not annotated. The reason is recorded so it is not re-derived from Remark 6.1.
2. **REVIEW-003b's CRITICAL is answered** — twice, independently. ADR-0001 stays `Proposed`: §(a)'s MEDIUM and §(e)'s keygen half are both open, and §2 above adds a dependency between the first and this ruling.
3. **A third packet is needed for `r` / `ρ` / Bulletproof randomness, before the keygen packet.**
4. **The FFI question (§3) is the critical path** and blocks implementation of either construction.

**Not settled, and deliberately left open:** deterministic versus hedged, pending §(a). Recording the dependency is the correct output; picking a side by adjudicator's preference would be the wrong one, and neither leg gave this adjudicator grounds to overrule the other.

**Still not obtained:** the TOB May 2026 revision audit; the registration PoK transcript; the exact Fiat–Shamir serialisation split for KAT vectors.
