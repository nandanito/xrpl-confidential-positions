# REVIEW-003a — Gemini leg, verbatim

- **Date:** 2026-08-17
- **Reviewer:** Google Antigravity CLI (`agy` 1.1.13), headless `--mode plan`, no file access
- **Target:** `git diff main...HEAD` on `research/xls-66-domain-question` — 7 files, 694 insertions
- **Prompt:** adapted from `/gemini-review adversarial`. **The skill's own prompts are code-shaped** (concurrency, injection, TOCTOU) and this diff is prose; running them unmodified would have produced a false "no findings". The prompt was rewritten to attack reasoning rather than code, keeping the skill's safety model exactly — no `--dangerously-skip-permissions`, diff passed inline, no file reads.
- **Limitation:** the reviewer could not read `ADR-0001`, `CLAIMS.md` or anything else not in the diff, and was told so. Findings that turn on unseen files are weaker for that reason.

**Verbatim below. Not adjudicated. Not re-graded.**

---

# Adversarial Review of Research & Decision Packet (XLS-66 / XLS-96)

---

## 1. Targeted Attack on Core Arguments

### 1.1 The Hybrid (ADR-0002 Ground 1)
ADR-0002 rejects the Hybrid architecture (using an XLS-65 Vault for public investor funding and off-protocol `ConfidentialMPTSend` for confidential supplier drawdowns) on three grounds, claiming Ground 1 is "decisive":
> *"It adds a public hop rather than removing one. The float cannot be converted while it sits in the vault... So the vault does not custody the confidential float; it stands beside it, and the value crosses a plaintext boundary each way."* (`ADR-0002`, lines 57–60)

**Ground 1 is NOT decisive; it is an analytical sleight of hand.**
- In the author's own proposed pure application-logic architecture (`TASK ZERO §9` step 2), the funding bank deposits the aggregate facility float publicly into an ordinary Dedicated Account, which then calls `Convert` once in public plaintext: *"The bank funds the vault publicly with the whole facility float; the vault converts once. Public: total facility size — which investors need."*
- In the Hybrid architecture, investors deposit public funds into an XLS-65 Vault, the Dedicated Account withdraws an aggregate float tranche publicly, calls `Convert` once in public plaintext, and conducts 100% of individual supplier drawdowns and repayments confidentially via `ConfidentialMPTSend`.
- **The public boundary in both designs is identical: the aggregate facility size.** Neither design exposes individual supplier drawdowns or terms to the vault.
- Rejecting the Hybrid on Ground 1 discards native investor share token issuance (`sfShareMPTID`), pool NAV tracking (`sfAssetsTotal`), and withdrawal management (`sfWithdrawalPolicy`) for *zero* gain in confidentiality. The Hybrid is in fact the superior architectural design.

---

### 1.2 The Structural Claim (CLAIMS.md B-11 / ADR-0002 Blocker 3)
Row B-11 and ADR-0002 Blocker 3 assert as a permanent structural truth:
> *"Encrypted loan accounting is structurally blocked, not merely absent — that XLS-96's additive-only homomorphism cannot support amortisation, which multiplies a balance by a rate and rounds asymmetrically by design."* (`CLAIMS.md` B-11; `ADR-0002` Blocker 3; `Investigation` §12)

**The inference is mathematically unsound and conflates "unimplemented relation" with "cryptographically impossible":**
1. **Scalar Multiplication is Additive:** In fixed-rate loan amortisation, the interest rate scalar $k$ is a known loan parameter. In additively homomorphic encryption (Pedersen commitments / ElGamal), scalar multiplication of an encrypted balance by a public scalar $k$ is trivial and linear ($k \cdot (mG + rH) = (km)G + (kr)H$). It does *not* require Fully Homomorphic Encryption (FHE) or ciphertext-by-ciphertext multiplication.
2. **Zero-Knowledge State Transitions:** In modern confidential protocols, non-linear calculations (integer division, truncation, asymmetric rounding) are *never* evaluated homomorphically by validators. Instead, the transactor client computes the rounding off-chain and submits a Zero-Knowledge proof (e.g., a Sigma/Bulletproof range relation) proving that the new commitment satisfies the rounding rules.
3. The author acknowledges this exact path (*"or a proof accompanying every LoanPay... a new relation, a new proof system, a new spec"*), but then dismisses it as a "structural impossibility." A new ZK proof relation is the exact definition of a **roadmap gap** (the same way XLS-96 was created to extend MPTs), not a permanent mathematical barrier. The evidence supports only **"does not exist today,"** not **"cannot exist structurally."**

---

### 1.3 Evidential Sufficiency (E-40, F-10, GAP-8, GAP-9)
The claim that *"nothing rejects a confidential-capable MPT inside the lending protocol"* and that the two amendments are *"silently non-composable"* is awarded **Grade A** in `CLAIMS.md` (E-40, F-10) and `Investigation` §9.

**The evidence does not support Grade A as written:**
- Grade A requires primary source cross-checking or direct execution. Only **2 of 15** transactor code paths were executed (`VaultCreate`, `VaultDeposit`).
- The remaining 13 transactors (`VaultWithdraw`, `VaultClawback`, `LoanBrokerSet`, `LoanSet`, `LoanPay`, `LoanManage`, `LoanBrokerCoverClawback`, etc.) were evaluated solely by running `grep confidential` across transactor source files.
- Grep does not trace cross-cutting helper functions (`MPTokenHelpers.cpp`), ledger view verifications, or invariant guards. The author admits in `Investigation` §11 that a rejection could hide in `VaultClawback` or `LoanBrokerCoverClawback`.
- Furthermore, under `GAP-9`, **no `MPToken` with an actual confidential balance was ever deposited**. The claim that public balances deposit while confidential balances are stranded without error is an untested hypothesis.
- Awarding Grade A to a negative claim spanning 13 unexecuted transactor paths and an unexecuted token state is grade inflation.

---

### 1.4 Self-Serving Structure
The artifacts reveal clear signs of confirmation bias and motivated reasoning:
1. **Pre-Ordained Narrative ("The domain does not move"):** The phrase *"the domain does not move"* appears repeatedly across `TASK-ZERO`, `GETTING-STARTED`, `ADR-0002`, and the `Investigation` as a foregone conclusion rather than an open hypothesis.
2. **Incentive to Manufacture Upstream Bugs (F-10 / U-24):** The author frames normal multi-state token behavior as a critical upstream defect (*"F-10 now leads... The negative result is worth more than the positive one would have been"*), attempting to convert an architectural incompatibility into a headline bug report to justify the session's labor.
3. **Premature Milestone Completion:** `GETTING-STARTED-CLAUDE-CODE.md` strikes through the domain question as **"DONE 2026-08-16"**, while the underlying ADR-0002 is marked `Proposed` and "reviewed by nobody."
4. **Shielding the Application Design from Scrutiny:** In `REVIEW-003-REQUEST` §1, the author declares `TASK ZERO §9`'s facility design *"Out of scope. Do not relitigate."* This conveniently fences off the application layer's catastrophic metadata leakage (which depends entirely on unreviewed, untested cover traffic in E-22/B-10) while forcing reviewers to evaluate only the rejection of XLS-66.

---

### 1.5 Omissions, Contradictions, and Watchlist Gaps
1. **Stale Self-Contradiction on ADR-0002 Creation:** `Investigation` §13 claims ADR-0002 is *"Not written; deliberately not written by the session that made the recommendation,"* yet the diff creates `ADR-0002-facility-as-application-logic.md` in that exact same commit.
2. **Arithmetic Contradiction on Amendments:** `ADR-0002` claims *"The project rests on one amendment, not two,"* and immediately follows with *"ConfidentialTransfer, plus PermissionedDomains/SingleAssetVault"* (which is three amendments).
3. **Omission of Atomic Batching (`featureBatchV1_1`):** In `Transactor.cpp:927`, the diff notes `featureBatchV1_1` is enabled on Devnet. Atomic transaction batching could allow simultaneous vault withdrawal and conversion, eliminating the intermediate public exposure. This is omitted from both the Hybrid evaluation and the §12 Watchlist.

---

## 2. Findings Ranked by Severity

### CRITICAL

#### Finding C-01: False "Decisive" Blocker on the Hybrid Architecture
- **File & Passage:** [`ADR-0002-facility-as-application-logic.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/decisions/ADR-0002-facility-as-application-logic.md#L53-L64) (Alternatives considered — Hybrid, Ground 1); [`REVIEW-003-REQUEST-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/reviews/REVIEW-003-REQUEST-2026-08-16.md#L107) (Question 11).
- **Reasoning Flaw:** Ground 1 asserts that the Hybrid model adds an unacceptable "public hop" because float must be withdrawn publicly to an ordinary account before conversion. However, in the author's own application-logic design ([`TASK-ZERO-2026-08-13.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/TASK-ZERO-2026-08-13.md#L238-L245) §9 step 2), the funding bank *already* funds the Dedicated Account publicly in aggregate. The total facility size is public in both models. Individual drawdowns remain confidential under both models. Ground 1 manufactures an illusory privacy delta for an aggregate step that is already public, dismissing the Hybrid architecture on invalid grounds.
- **Remediation:** Re-open the Hybrid architecture in ADR-0002. Model the funding side using native XLS-65 Vaults (retaining native investor share issuance and pool accounting) while executing drawdowns via application-level `ConfidentialMPTSend` from the facility manager account.

#### Finding C-02: Cryptographically and Architecturally Invalid "Structural Impossibility" Inference
- **File & Passage:** [`CLAIMS.md`](file://$HOME/.gemini/antigravity-cli/scratch/CLAIMS.md#L102) (Row B-11); [`ADR-0002-facility-as-application-logic.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/decisions/ADR-0002-facility-as-application-logic.md#L26-L28) (Blocker 3); [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L358-L373) (§12, "Why W-3 is unlikely").
- **Reasoning Flaw:** The author asserts that encrypted loan accounting is "structurally blocked" because additive homomorphism cannot support multiplication or rounding. This is cryptographically false: multiplication of an encrypted balance by a public interest rate scalar is linear and natively supported in additively homomorphic schemes ($k \cdot [m] = [k \cdot m]$). Furthermore, non-linear amortisation and rounding do not require FHE; they are solved via client-side Zero-Knowledge range and equality proofs accompanying state updates. Labeling the absence of an amortisation ZK relation as a "permanent structural impossibility" rather than a specification/roadmap gap invalidates the premise that upstream changes could never reverse the decision.
- **Remediation:** Regrade B-11 from Grade C (asserting structural impossibility) to Grade C (speculative/roadmap gap). Retract the claim that W-3 is mathematically impossible. Base the rejection of native XLS-66 strictly on current protocol absence in rippled 3.3.0.

---

### HIGH

#### Finding H-01: Grade Inflation on Unexecuted Transactor Negative Paths
- **File & Passage:** [`CLAIMS.md`](file://$HOME/.gemini/antigravity-cli/scratch/CLAIMS.md#L78) (Row E-40), [`CLAIMS.md`](file://$HOME/.gemini/antigravity-cli/scratch/CLAIMS.md#L125) (Row F-10); [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L264-L270) (§4.2, §4.5, §9, §10 GAP-8).
- **Reasoning Flaw:** E-40 and F-10 are graded Grade A (direct execution or cross-checked primary sources) for asserting that *"nothing rejects a confidential-capable MPT as a vault asset across all fifteen vault and lending transactors."* In reality, only 2 transactors were executed (`VaultCreate`, `VaultDeposit`). The remaining 13 transactors were only searched via `grep`. Grep cannot prove the absence of rejections in shared helpers or invariants (e.g., `VaultClawback`), and no token carrying an actual confidential balance was ever tested (GAP-9).
- **Remediation:** Demote E-40 and F-10 from Grade A to Grade B/C until GAP-8 and GAP-9 are fully executed on Devnet. Scope the claim text strictly to the executed transactors.

#### Finding H-02: Scope Shielding of Unreviewed Core Vulnerabilities in REVIEW-003
- **File & Passage:** [`REVIEW-003-REQUEST-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/reviews/REVIEW-003-REQUEST-2026-08-16.md#L26) (§1 "Out of scope"); [`TASK-ZERO-2026-08-13.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/TASK-ZERO-2026-08-13.md#L250-L260) (§9).
- **Reasoning Flaw:** The review request packet explicitly marks `TASK ZERO §9`'s facility design as *"Out of scope. Do not relitigate."* However, `TASK ZERO §9`'s application-logic design leaks transaction metadata and timing, relying entirely on unproven cover traffic (E-22 / B-10, both unreviewed Grade C inferences). Shielding §9 from REVIEW-003 forces reviewers to accept the application-logic alternative without assessing whether its own privacy claims are viable.
- **Remediation:** Remove the out-of-scope restriction on §9 in `REVIEW-003-REQUEST-2026-08-16.md`. Place the feasibility of application-layer cover traffic and metadata leakage directly into the review rotation alongside ADR-0002.

---

### MEDIUM

#### Finding M-01: Direct Contradiction on ADR-0002 Status
- **File & Passage:** [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L380-L387) (§13) vs [`ADR-0002-facility-as-application-logic.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/decisions/ADR-0002-facility-as-application-logic.md#L1).
- **Reasoning Flaw:** Section 13 of the investigation explicitly claims ADR-0002 was *"Not written; deliberately not written by the session that made the recommendation."* Yet the diff adds `ADR-0002-facility-as-application-logic.md` and updates multiple registers citing it. This is an unmaintained internal contradiction within the evidence packet.
- **Remediation:** Update Section 13 of `XLS-66-INVESTIGATION-2026-08-16.md` to state accurately that ADR-0002 was drafted as `Proposed` and submitted to the REVIEW-003 rotation.

#### Finding M-02: Self-Contradiction Regarding Amendment Count
- **File & Passage:** [`ADR-0002-facility-as-application-logic.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/decisions/ADR-0002-facility-as-application-logic.md#L73-L75) (Consequences, bullet 2).
- **Reasoning Flaw:** The text claims: *"The project rests on one amendment, not two. `ConfidentialTransfer`, plus `PermissionedDomains`/`SingleAssetVault` for the domain gate only..."* Listing three required amendments while asserting the project rests on "one amendment, not two" is an arithmetic and logical contradiction.
- **Remediation:** Correct the text to state that the project depends on three amendments (`ConfidentialTransfer`, `PermissionedDomains`, `SingleAssetVault`), or clarify that it depends on one confidential primitive plus two permissioning primitives.

#### Finding M-03: Erroneous Framing of Dual-State Tokens as an Upstream Bug
- **File & Passage:** [`CLAIMS.md`](file://$HOME/.gemini/antigravity-cli/scratch/CLAIMS.md#L125) (Row F-10); [`UPSTREAM-FEEDBACK.md`](file://$HOME/.gemini/antigravity-cli/scratch/UPSTREAM-FEEDBACK.md#L106) (Row U-24); [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L264-L270) (§4.2, §4.5).
- **Reasoning Flaw:** The author frames `VaultDeposit` accepting a confidential-capable MPT with `tesSUCCESS` as an upstream defect ("silently non-composable") and considers proposing a `tecWRONG_ASSET` rejection in `VaultCreate::preclaim`. On XRPL, an MPT issuance can support confidential transfers while maintaining public balances (`sfMPTAmount`). Pools and vaults operate on public balances. Rejecting confidential-capable MPTs from public vaults would unnecessarily break token composability across public DeFi.
- **Remediation:** Reframe U-24 and F-10 as documentation requests (advising clarifying notes in XLS-65/XLS-96) rather than protocol defects requiring transaction rejection.

#### Finding M-04: Omission of Atomic Batching Alternative (`featureBatchV1_1`)
- **File & Passage:** [`ADR-0002-facility-as-application-logic.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/decisions/ADR-0002-facility-as-application-logic.md#L53-L64) (Alternatives considered); [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L205) (§4.3), [`XLS-66-INVESTIGATION-2026-08-16.md`](file://$HOME/.gemini/antigravity-cli/scratch/docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md#L325) (§12).
- **Reasoning Flaw:** In arguing against the Hybrid model, the author treats intermediate plaintext float exposure as unavoidable. However, the diff notes that `featureBatchV1_1` is enabled on Devnet (`Transactor.cpp:927`). Atomic transaction batching could execute vault withdrawal, conversion, and disbursement in a single atomic transaction bundle. The author fails to analyze batching as an alternative or watch item.
- **Remediation:** Add `featureBatchV1_1` / atomic transaction batching to the considered alternatives and reversal watch list in §12.

---

### LOW

#### Finding L-01: Premature Milestone Completion in Development Roadmap
- **File & Passage:** [`GETTING-STARTED-CLAUDE-CODE.md`](file://$HOME/.gemini/antigravity-cli/scratch/GETTING-STARTED-CLAUDE-CODE.md#L312-L318) (Lines 312–318).
- **Reasoning Flaw:** The roadmap marks "The domain question is settled (Session 2)" as completed (`DONE 2026-08-16`) and asserts "Three of four cleared," despite ADR-0002 being unreviewed and `Proposed`.
- **Remediation:** Revert the status to `PENDING REVIEW` until ADR-0002 passes the second review rotation.

---

## 3. Final Verdict on Decision Soundness

**Verdict:** The ultimate decision to reject pure native XLS-66 for individual loan drawdowns is sound for rippled 3.3.0, but the rejection of the Hybrid architecture and the claim of structural cryptographic impossibility are fundamentally flawed.

