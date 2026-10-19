# REVIEW-008 — the Cryptography Reviewer packet

- **Date:** 2026-08-17
- **Branch under review:** `review/adr-0001-nonce-construction`, diffed against `main`.
- **Two legs, run independently, neither shown the other's output.** Method as REVIEW-002 through 004.
- **Codex leg:** Codex CLI 0.135.0 via `/codex:adversarial-review --base main`, full repository access, run in a dedicated `git worktree` so all three branches could be reviewed in parallel without switching the working tree.
- **Gemini leg:** Antigravity CLI (`agy` 1.1.13), headless `--mode plan`, `--output-format json`, **no `--dangerously-skip-permissions`**. Diff passed inline; the model read nothing from disk, so anything outside the diff was invisible to it. Model and effort are `agy` defaults and the JSON envelope carries no model field, so the exact model is not recoverable.
- **Focus:** a branch-specific block; both legs received the same priority questions.

**Verbatim below. Not adjudicated. Nothing applied.**

---

## Leg A — Codex (full repository access)

# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

No ship: the packet still steers the reviewer toward upstream hedged nonces and leaves implementation-critical review requirements underspecified.

Findings:
- [high] Packet creates false compatibility pressure toward upstream hedged nonces (docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md:37-81)
  Section 4 justifies presenting upstream because it is the only shipping construction and because W-CONF proofs must verify against the same validators; section 5 then lists matching the shipping implementation only as a pro-hedging argument. But line 81 correctly says nonce derivation is prover-local and does not affect verification. A cold reviewer can be nudged to treat upstream hedging as a compatibility requirement when it is only an implementation precedent, weakening the neutrality this packet claims to provide.
  Recommendation: Remove validator-compatibility framing from the upstream section, explicitly state that validators cannot observe nonce derivation, and move upstream details to a clearly non-normative appendix after the neutral requirements.
- [high] Deliverable does not force byte-exact coverage for all four proof types (docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md:29-77)
  The hard constraints say Send, ConvertBack, Clawback, and registration use different nonce counts, but the deliverable asks only for expansion into five distinct scalars. A Rust implementer would still have to infer whether non-Send proofs use the first N outputs, separate labels, different counters, or different transcript layouts. That ambiguity is exactly where cross-type collisions or incompatible implementations can be introduced.
  Recommendation: Add a required per-proof-type table specifying exact domain bytes, witness tuple and order, statement tuple and order, nonce count, and nonce labels/counters for Send, ConvertBack, Clawback, and registration.
- [high] Hedged test requirement can pass while the catastrophic reuse case remains untested (docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md:68-79)
  For hedged nonces, the packet asks for a test that distinct statements never share nonce material. That does not exercise the dangerous case: identical witness and statement with repeated, failed, or silently substituted entropy. Distinct statements can produce different deterministic inputs even when the RNG is broken, so this test can pass while repeated identical proofs reuse nonces invisibly.
  Recommendation: Require fixed-salt known-answer vectors for the deterministic pipeline across all proof types, plus controlled-RNG tests proving identical witness/statement proofs differ with distinct salts and hard-fail on RNG error or prohibited entropy conditions.

Next steps:
- Revise the packet before sending it to an external cryptography reviewer.

---

## Leg B — Gemini (diff only, no file access)

# Adversarial Cryptographic & Specification Review: REVIEW-005

**Review Target:** Unified Diff (`ADR-0001-key-custody-and-proof-location.md` and `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`)  
**Stance:** Hostile / Adversarial — Guilty until proven innocent.

---

## Priority Focus Evaluation

### 1. Is It Neutral?
**Finding: FAILED.** Residual steering and asymmetric framing survive in two distinct places:
1. **False Validator Compatibility Pressure (§4, Line 37):** The packet claims upstream's hedged scheme is presented *"because W-CONF's proofs must verify against the same validators."* This falsely suggests validator compatibility requires matching upstream's nonce generation, nudging the reviewer to adopt upstream. This directly contradicts §6 (Line 81), which acknowledges nonce derivation is strictly prover-local.
2. **Asymmetric Concrete Detail:** Section 4 devotes 20 lines to upstream's hedged construction (C types, WASM routing, OpenSSL hooks, pseudocode), while purely deterministic constructions (e.g., RFC 6979 / synthetic nonces over witness and statement) receive zero reference pseudocode or structure.
3. **Flawed Cryptographic Framing Against Hedging (§5, Line 62):** The packet states that *"A degraded host RNG weakens a hedged construction in a way it would not weaken a purely deterministic one."* This claim is cryptographically false (see Finding HIGH-1) and skews the trade-off analysis.

### 2. Is the Deliverable Spec Complete?
**Finding: FAILED.** A Rust implementer would still have to make critical design and security guesses:
- **Contradiction on Determinism vs. Hedging (§6, Line 68 vs. Lines 71, 79):** The deliverable mandates *"two independent implementers produce byte-identical nonces,"* which is impossible under live entropy hedging.
- **Proof-Type Expansion Gap (§6, Item 7 vs. §3, C-1/C-5):** Item 7 asks only for *"Expansion into five distinct scalars."* It leaves the implementer guessing how expansion, index counters, and domain separation work for 3-nonce (`ConvertBack`), 1-nonce (`Clawback`), and 1-nonce (`Registration`) proofs.
- **Rejection-Sampling Index Stepping (§6, Item 8):** The spec fails to define how sub-counters or stream indices advance when a candidate scalar $\ge q$ is rejected.
- **Memory Hygiene & Zeroization:** The spec omits requirements for zeroizing intermediate buffers (`IKM`, `PRK`) containing the raw secret key $sk_A$.

### 3. Factual Accuracy in Section 3 and Section 4
**Finding: DEFECTIVE.**
- **Section 3 (Hard Constraints):** C-1 through C-5 are logically sound in isolation, but C-1 and C-5 directly conflict with the deliverable spec in §6 Item 7, which hardcodes a 5-nonce output.
- **Section 4 (Reference Implementation):** Line 37 contains a factually misleading assertion regarding validator verification requirements for prover nonces. The 16-byte preamble arithmetic on Line 50 is factually accurate ($4 + 4 + 4 + 4 = 16$ bytes).

### 4. Soundness of Section 7 Scope Split
**Finding: PROCEDURALLY INCONSISTENT.**
- Cryptographically, the separation is sound: nonce derivation requires only that $sk_A \in \mathbb{F}_q$ as a 32-byte big-endian scalar, independent of how $sk_A$ was derived.
- Procedurally, it introduces a circular blocking contradiction: Line 7 and `ADR-0001:209` assert that this packet unblocks all signer code and ElGamal keygen, but Section 7 explicitly puts key derivation out of scope. Merging this packet will not unblock keygen.

### 5. Severity Conveyance
**Finding: PARTIALLY ACCURATE / UNDERSTATED THREAT VECTOR.**
- The consequence of nonce reuse (algebraic extraction of $sk_A$ via special-soundness equations without first-round commitments) is correctly identified from Remark 6.1.
- However, the threat model is understated by framing it purely as *"triggered by an ordinary coding error"* (Line 21). It ignores infrastructure-level root causes such as VM snapshot rollbacks, container restorations, and process forks (`fork()`), which are the primary failure modes of deterministic signing.

---

## Detailed Findings

### CRITICAL

#### [CRITICAL-1] Deliverable Spec Self-Contradiction Between Deterministic Byte-Identity and Hedging
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Lines:** 68, 71, 79
- **Problem:** Line 68 defines the core deliverable as:
  > *"A construction specified so that two independent implementers produce byte-identical nonces."*
  
  If the reviewer selects a hedged construction (which §4 details and §5 defends), two independent implementers—or two runs of the same implementer—will **never** produce byte-identical nonces because `salt` is drawn from live RNG entropy (`RAND_bytes` / `crypto.getRandomValues`). As written, any recommendation favoring hedging mathematically fails the deliverable criteria on Line 68.
- **Why it matters:** The reviewer is given an impossible specification: evaluate a hedged construction against a deliverable criterion that strictly demands pure determinism.
- **Recommended Fix:** Change Line 68 to:
  ```markdown
  A construction specified so that given identical inputs (including explicit test vectors with fixed salt when hedged), two independent implementers produce byte-identical nonces; and in operational mode, guarantees cryptographic independence across distinct proof generations.
  ```

---

### HIGH

#### [HIGH-1] Factually False Cryptographic Claim Regarding Degraded Host RNG in Hedged Schemes
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Line:** 62
- **Problem:** Line 62 asserts:
  > *"A degraded host RNG weakens a hedged construction in a way it would not weaken a purely deterministic one."*
  
  This is cryptographically false. In standard hedged constructions ($PRK = \text{HMAC}(salt, IKM)$ where $IKM$ binds the secret witness and statement):
  - If the host RNG fails completely (e.g., outputs zeros or constant bytes), the construction gracefully collapses into a purely deterministic PRF over $(witness, statement)$.
  - It does *not* become weaker than deterministic derivation; its security is the maximum (upper bound) of deterministic and randomized generation.
- **Why it matters:** It presents a false technical claim as a bullet against hedging, misleading the external reviewer and corrupting the trade-off evaluation.
- **Recommended Fix:** Replace Line 62 with:
  ```markdown
  If the host RNG fails completely, hedging collapses to purely deterministic security (offering no additional entropy), but does not introduce weaknesses beyond pure determinism unless implemented incorrectly (e.g., if entropy replaces rather than augments witness binding).
  ```

#### [HIGH-2] Blocking Scope Deadlock Between Section 7, Line 7, and ADR-0001
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md:7, 85` and `docs/decisions/ADR-0001-key-custody-and-proof-location.md:209`
- **Lines:** `REVIEW-005:7, 85`; `ADR-0001:209`
- **Problem:** Line 7 states:
  > *"This blocks: all signer code. ADR-0001 stays Proposed until this lands, and no ElGamal keygen or proof-generation code may be written before it..."*
  
  And `ADR-0001:209` links this packet to resolving precondition 2 before any keygen code. However, Section 7 (Line 85) explicitly excludes key derivation:
  > *"§(e)'s other half — deriving the ElGamal key from the XRPL master seed. That is a separate ruling in the same section and the project has been explicit that no keygen code exists yet. Rule on nonces first..."*
- **Why it matters:** Completing REVIEW-005 will *not* unblock ElGamal keygen code, because key derivation is explicitly excluded from this packet. The documents present an internal contradiction regarding what is being unblocked.
- **Recommended Fix:** Clarify in Line 7, Section 7, and `ADR-0001:209` that REVIEW-005 unblocks *proof-generation specification*, while ElGamal keygen remains blocked pending a separate key derivation review packet; or combine both topics into this packet.

---

### MEDIUM

#### [MEDIUM-1] Factually Misleading Validator Compatibility Claim Steering Reviewer Toward Upstream Nonces
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Lines:** 37, 81
- **Problem:** Line 37 justifies providing upstream's construction:
  > *"...because it is the only shipping construction for exactly this problem, and because W-CONF's proofs must verify against the same validators."*
  
  In compact Sigma protocols, nonce generation is strictly prover-internal. Validators only verify $(e, z_1, \dots, z_k)$ against public commitments and statement elements. Validators have no knowledge of, and cannot verify, the prover's nonce derivation mechanism.
- **Why it matters:** Line 37 creates false architectural pressure on the reviewer to conform to upstream's construction, contradicting Line 81 (which correctly notes nonce derivation does not affect verification).
- **Recommended Fix:** Delete `and because W-CONF's proofs must verify against the same validators` from Line 37, and explicitly state that validator verification imposes zero constraints on nonce generation.

#### [MEDIUM-2] Deliverable Spec Hardcodes 5 Nonces, Omitting Multi-Proof-Type Expansion
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Lines:** 29, 33, 76
- **Problem:** Section 3 (C-1, C-5) establishes that four proof types exist (`Send` with 5 nonces, `ConvertBack` with 3, `Clawback` with 1, `Registration` with 1). However, Section 6 Item 7 specifies the deliverable strictly as:
  > *"7. **Expansion into five distinct scalars** — the counter or label scheme, and why the outputs are independent."*
- **Why it matters:** An implementer will not know whether 3-nonce and 1-nonce proofs truncate a 5-scalar stream or use dedicated counters/domain labels. Truncating a shared stream with identical witness prefixes can lead to cross-proof nonce collisions.
- **Recommended Fix:** Update Section 6 Item 7 to:
  ```markdown
  7. **Expansion into $k \in \{1, 3, 5\}$ distinct scalars per proof type** — the counter or label scheme, parameterization across the four proof types, and proof of independence both within a proof and across distinct proof types.
  ```

#### [MEDIUM-3] Incomplete Spec on Rejection-Sampling State Advancement and Secret Zeroization
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Lines:** 76, 77, 78
- **Problem:**
  1. Item 8 asks for rejection sampling vs. reduction, but does not ask the reviewer to specify index/counter progression on rejection (e.g., whether a sub-counter increments per candidate or the main counter advances).
  2. The deliverable omits any requirement for constant-time memory wiping / zeroization of intermediate buffers (`IKM`, `PRK`) holding the raw secret key $sk_A$.
- **Why it matters:** Implementers must guess how to implement rejection loops without desynchronizing test vectors, and may leave long-lived copies of $sk_A$ in heap/stack memory.
- **Recommended Fix:** Add explicit requirements in Section 6 for rejection loop counter mechanics and memory zeroization semantics.

---

### LOW

#### [LOW-1] Omission of VM Snapshot Rollback / State-Reset Hazard in Trade-Off Framing
- **File:** `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`
- **Lines:** 60–64
- **Problem:** Section 5 lists arguments for and against hedging, but omits the standard cryptographic justification for hedging in local daemons: protection against VM/container snapshot rollbacks, process cloning (`fork()`), and duplicate state replays.
- **Why it matters:** The reviewer is deprived of a primary industry rationale (e.g., BIP-340 / RFC 8032 hedged variants) for choosing hedged nonces over pure determinism in daemon architectures.
- **Recommended Fix:** Add VM snapshot rollback and container state-reset protection to Section 5 under "For hedging".

---

## Verdict

**fix-before-merge** — The packet contains an internal specification contradiction (§6 Line 68 vs. hedging), a factually false cryptographic assertion (§5 Line 62), a misleading validator-compatibility claim (§4 Line 37), and an unaligned blocking scope between Line 7, Section 7, and ADR-0001.


---

## Recording notes — not adjudication

**Both legs say the packet is not fit to send. It has not been sent.**

1. **Two findings were reached by both legs independently.** The **validator-compatibility framing** — §4 justifies including upstream partly because "W-CONF's proofs must verify against the same validators", while §6 states nonce derivation is prover-local and does not affect verification. **Those two sentences contradict each other and the contradiction pushes toward hedging.** And the **five-nonce hardcoding** — constraint C-1 says ConvertBack needs three, Clawback one, registration one, while deliverable item 7 asks only for "expansion into five distinct scalars", leaving the other three proof types unspecified. Both verified against the packet text.
2. **The legs disagree about the DIRECTION of the bias, which is itself the finding.** Codex says the packet steers *toward* hedged nonces; Gemini says a claim in §5 is cryptographically false in a way that skews *against* it. Both cannot be describing the same defect, and a packet that steers both ways is worse than one that steers consistently.
3. **Gemini HIGH-1 deserves the closest scrutiny in adjudication and looks correct.** §5 says "a degraded host RNG weakens a hedged construction in a way it would not weaken a purely deterministic one". Under a broken RNG a hedged construction degrades to its deterministic core with a fixed salt, which is no worse than the purely deterministic scheme. **If that reasoning holds, the sentence is false and must be struck rather than softened.**
4. **Gemini CRITICAL-1 is a logical defect in the ask itself.** §6 demands a construction where "two independent implementers produce byte-identical nonces" while §5 presents hedging as a live option — and hedging makes byte-identity impossible by construction. The deliverable spec contradicts the choice it claims to leave open.
5. **Codex HIGH-3 is the sharpest practical point.** The hedged test requirement — that distinct statements never share nonce material — **passes even with a completely dead RNG**, because distinct statements produce distinct deterministic inputs regardless. The test as specified cannot detect the failure the whole packet exists to prevent.
6. Nothing here has been fixed. **Do not send the packet until adjudication is done.**
