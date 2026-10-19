# REVIEW-017 — ADR-0002 (Revision 2) Adversarial Review

---

## Executive Summary & Verdict

- **Verdict:** **Revise again (to Revision 3).** The ADR cannot be `Accepted` in its current form.
- **Core Finding:** The core decision (*build the receivables facility as application logic on Confidential MPTs without XLS-66 or XLS-65 Vaults*) is **technically sound and survives**. However, **Revision 2 introduced new critical flaws in its replacement arguments**:
  1. The **Hybrid Comparison Table is dishonest/incomplete** (Rows 6 & 7 claim supplier drawdowns/repayments are hidden under the Hybrid, which is mechanically false during active revolving operations).
  2. The **framing of Item 2 is wrong**: the Hybrid does *not* hinge solely on the product scope question *"is investor confidentiality in scope?"* — it is structurally disqualified by the boundary-crossing leak of revolving yield and float rebalancing.
  3. The **corrected Blocker 3 is still cryptographically and architecturally flawed**: scalar multiplication of encrypted values in $\mathbb{Z}_q$ does not solve fractional interest calculation (modular inverse wraps the field), and validator-executed automated state updates cannot be replaced by ZK proof relations without an off-chain prover for every tick.
  4. **Acceptance Item 3 is stale** (claims GAP-8 is open with 2/15 transactors when it was fully closed with 15/15).

---

## Ranked Adversarial Findings

### 1. [HIGH SEVERITY] The Hybrid Comparison Table is False on Rows 6–7 and Hides the Continuous Boundary-Crossing Leak

- **What is wrong:**
  In the Rev 2 comparison table:
  - Row 6: *Per-supplier drawdown amount* is marked **hidden** for Hybrid.
  - Row 7: *Per-supplier repayment amount* is marked **hidden** for Hybrid.

  This is mechanically impossible in a revolving facility unless the XLS-65 `Vault` is emptied 100% on Day 1 into the Dedicated Account (which renders the `Vault` completely useless).
- **Why it matters concretely:**
  In an XLS-65 `Vault`, assets sit in **plaintext**. In a revolving facility:
  1. **Drawdowns:** If capital remains in the `Vault` until needed, every supplier drawdown requires a `VaultWithdraw` (or broker borrow) of that specific amount in plaintext, followed by a `ConfidentialMPTConvert`. **The drawdown amount and timestamp are published in plaintext on-ledger.**
  2. **Repayments:** When a supplier repays confidentially to the Dedicated Account, that repayment **must cross back into plaintext** via `Convert` and `VaultDeposit` so that the `Vault` can update its `sfTotalAssets`, increase share value, and fund investor redemptions. **The repayment amount and timestamp are published in plaintext on-ledger.**
  3. **The Buffer Dilemma:** If the Dedicated Account instead pulls large aggregate "tranches" to maintain a float, the frequency, size, and timing of those tranche crossings directly leak supplier drawdown velocity and aggregate volume.
- **Supporting Recommendation:**
  The table falsely presents the Hybrid as matching §9 on supplier confidentiality. It must be corrected: under the Hybrid, supplier drawdowns and repayments either **leak on-ledger during boundary crossing** or require total decoupling from the Vault (destroying the Vault's share accounting).

---

### 2. [HIGH SEVERITY] Item 2's Framing is False: The Hybrid Rejection Does Not Hinge Solely on Investor Scope

- **What is wrong:**
  Rev 2 states: *"The question it turns on is not technical: is investor-side confidentiality in scope for this project? If yes, the hybrid is out on rows 3–5 of the table. If no, the hybrid is probably the better design and this ADR is wrong. Nobody has decided this and it is not the coding session's call."*
- **Why it matters concretely:**
  This framing creates an artificial dilemma and paralyzes the ADR on an external product scope question.
  - **The hidden decisive factor:** Even if the project sponsor explicitly decides that *investor-side confidentiality is completely out of scope* (i.e. investors are fine having their positions and deposits public), **the Hybrid is still broken for revolving receivables**.
  - **Yield & Share Accounting Breakdown:** In XLS-65, share price appreciation is strictly driven by the assets held inside the `Vault` object. If supplier repayments and interest remain inside the confidential Dedicated Account, the `Vault` cannot see them; its share price remains flat and investors earn zero yield on-ledger. To credit investors with yield, confidential interest must be converted to plaintext and deposited into the `Vault`, publishing supplier repayment and financing metrics.
- **Supporting Recommendation:**
  The ADR should **firmly reject the Hybrid on structural and lifecycle grounds**, not defer it as an open product scope question. The Hybrid fails because an on-chain plaintext vault cannot service an off-chain/confidential revolving asset pool without continuously compromising the confidential boundary.

---

### 3. [MEDIUM SEVERITY] Corrected Blocker 3 is Still Cryptographically and Architecturally Flawed

- **What is wrong:**
  Rev 2 replaced the flawed "homomorphism cannot multiply" claim with:
  *"Scalar multiplication by a public scalar is native to an additively homomorphic scheme, and an interest rate is a public loan parameter... closing it would require a new proof relation for the non-linear part (rounding, fixed-point truncation), a specification, and validator-side changes. That is a large roadmap item, not an impossibility."*
- **Why it matters concretely:**
  This replacement contains two major technical errors:
  1. **Finite Field Arithmetic Failure:** An interest rate in finance is fractional (e.g., $r = \frac{500}{10000}$). Multiplying ciphertext commitment $C = g^m h^r$ by scalar $500$ yields $500 \cdot m$. To divide by $10,000$, one cannot simply multiply by $10000^{-1} \pmod q$. In discrete log / scalar field $\mathbb{Z}_q$, multiplying by $10000^{-1} \pmod q$ wraps around the 252-bit field for any value not an exact multiple of 10,000, destroying the plaintext value and breaking range bounds ($[0, 2^{64}-1]$).
  2. **Automated Ledger vs. Client Prover Architecture:** In XLS-66, the ledger autonomously updates loan state (accruing interest on ledger closes). Validators cannot evaluate a zero-knowledge "proof relation" for truncation homomorphically on encrypted state without an off-chain prover who knows the plaintext witness. Shifting to client-submitted ZKPs for every interest accrual would completely alter XLS-66 from an autonomous state machine to a client-driven settlement layer.
- **Supporting Recommendation:**
  Downgrade the claim that this is merely a "missing proof relation on the roadmap." Accurately state that **automated, on-chain fractional interest accrual over encrypted balances is impossible in additively homomorphic schemes without either off-chain provers, multi-party computation, or fully homomorphic encryption (FHE)**.

---

### 4. [MEDIUM SEVERITY] Acceptance Item 3 Contains Stale Text Contradicting Closed GAP-8

- **What is wrong:**
  Under *Before this ADR can be accepted*, Item 3 reads:
  *"3. GAP-8 closed — a full loan lifecycle over a confidential-capable MPT. Two of fifteen transactor paths were executed. Both review legs called this out; E-40 and F-10 are regraded A → B until it closes."*
- **Why it matters concretely:**
  GAP-8 was closed on 2026-08-17 with all 15 transactor paths executed. Leaving this text un-updated in Rev 2 makes the ADR appear empirically deficient and unready for acceptance when the underlying verification has already succeeded.
- **Supporting Recommendation:**
  Update Item 3 to reflect that GAP-8 is **CLOSED** (15/15 transactors executed) and reinstate the evidence grading.

---

### 5. [LOW SEVERITY] Premature Assertion of U-24 in Consequences While Item 4 Remains Open

- **What is wrong:**
  In *Consequences*: *"The negative result becomes a project output. Two live amendments that silently do not compose is a finding with a named audience. Captured as U-24 under `Observed`; nothing is filed from a coding session."*
  However, Acceptance Item 4 explicitly notes that the competing interpretation of F-10 is still open: if a confidential MPT holding a public balance in a vault is intended design, U-24 is a documentation request, not a composability failure defect.
- **Why it matters concretely:**
  The Consequences section claims U-24 as an established bug/defect finding before the ADR's own prerequisite condition (Item 4) has settled whether it is intended behavior.
- **Supporting Recommendation:**
  Qualify U-24 in *Consequences* as an observation pending resolution of Item 4.

---

## Detailed Answers to the Explicit Review Questions

### 1. Does the decision still follow?
**Yes.** The decision (*The receivables financing facility is built as application logic on Confidential MPTs. The project does not build on XLS-66, and does not use an XLS-65 Vault object*) still strictly follows.
- Blockers 1 and 2 (Vault share tokens cannot be confidential; Vault and broker pseudo-accounts cannot hold confidential balances or sign `ConfidentialMPTConvert`) are physically absolute on Devnet (rippled 3.3.0).
- Blockers 4 and 5 (no revolving lines of credit, discrete public loan objects) remain unassailable.
- The decision does *not* rest on a thin base; it rests on the concrete protocol mechanics of XRPL Devnet. However, Rev 2 weakened its own presentation by pretending the Hybrid alternative is viable if investor confidentiality is out of scope.

### 2. Is Rev 2's corrected Blocker 3 right this time?
**No.** It is still mathematically and architecturally flawed.
- Multiplying an additively homomorphic commitment by an integer scalar does not enable fractional interest calculations because division by $10^4$ modulo $q$ causes field wrap-around.
- More fundamentally, a "proof relation" requires an off-chain prover who knows the secret plaintext. An on-chain automated protocol like XLS-66 cannot advance interest or loan amortization states homomorphically on its own. Calling this a "missing roadmap item" mischaracterizes the boundary between autonomous on-chain computation and off-chain ZK proving.

### 3. Is the Hybrid Comparison Table complete and honest?
**No.**
1. **False entries (Rows 6 & 7):** Per-supplier drawdowns and repayments cannot be hidden in the Hybrid without permanently decoupling the Vault from all assets (which destroys the Vault's functionality). When funds cross between the plaintext Vault and the Dedicated Account, amounts and timings are exposed.
2. **Missing Row — Yield / Interest Realization:** In §9, yield is accumulated confidentially in the pool. In the Hybrid, yield must be converted to plaintext and deposited in the Vault to update `sfTotalAssets` and share price, exposing financing margins.
3. **Missing Row — Float Capital Efficiency & Synchronization:** The Hybrid requires splitting liquidity between plaintext Vault reserves and confidential revolving float, causing idle capital or synchronization drift.
4. **Impact of F-23 (`tecBAD_PROOF`):** In application logic, a bad proof submitted by the Dedicated Account commits corrupt ciphertexts to ledger state; in XLS-65, standard transactions fail cleanly.

### 4. What does the ADR claim that its evidence does not support?
1. It claims the Hybrid preserves supplier drawdown/repayment confidentiality (Table rows 6 & 7) while providing native XLS-65 pool accounting. (Unsupported; fund flows must cross the plaintext boundary).
2. It claims U-24 is a verified "silent non-composition defect" while Item 4 acknowledges it may be intended composability.
3. It claims Blocker 3 can be solved simply by adding a "rounding proof relation" to XLS-66 validators.
4. It claims in Item 3 that GAP-8 is open at 2/15 transactors (stale).

---

## Required Revisions for Revision 3

To move ADR-0002 to `Accepted`, apply the following exact text revisions:

```diff
--- ADR-0002 (Rev 2)
+++ ADR-0002 (Rev 3)

## The finding that drives everything
- What survives is smaller and is enough: **blocker 3 is true today**, every value is plaintext at rippled 3.3.0, and closing it would require a new proof relation for the non-linear part (rounding, fixed-point truncation), a specification, and validator-side changes. That is a large roadmap item, not an impossibility.
+ What survives is smaller and is enough: **blocker 3 is true today**, every value is plaintext at rippled 3.3.0. Automated on-chain interest accrual and fixed-point division cannot be computed homomorphically over encrypted commitments by validators without off-chain provers supplying witnesses for every state update, which contradicts XLS-66's autonomous on-ledger execution model.

## Alternatives considered
### Hybrid — an XLS-65 vault for the funding side, confidential sends for the drawdown side — rejected
| Value | §9 application-logic | Hybrid with an XLS-65 vault |
|---|---|---|
| Per-supplier drawdown amount | hidden | **public or tranche-leaked** (VaultWithdraw must be plaintext) |
| Per-supplier repayment amount | hidden | **public or tranche-leaked** (VaultDeposit must be plaintext to realize yield) |
+| Yield / Interest realization | hidden (accumulates in pool) | **public** (must convert to plaintext to update Vault share price) |
+| Revolving float synchronization | native in Dedicated Account | **complex / capital inefficient** (split between Vault and float) |

- **The real argument against the hybrid is in rows 3 to 5, and rev 1 did not make it... The question it turns on is not technical: is investor-side confidentiality in scope?**
+ **The hybrid is rejected on both investor and supplier grounds.** Even if investor-side confidentiality were out of scope, the hybrid cannot support a revolving facility: capital crossing the boundary between the plaintext XLS-65 Vault and the confidential Dedicated Account continuously leaks drawdown amounts, repayment velocity, and yield margins on-ledger.

## Consequences
- **The negative result becomes a project output.** Two live amendments that silently do not compose is a finding with a named audience. Captured as U-24 under `Observed`...
+ **The negative result is documented.** Depending on the resolution of Item 4, the interaction between ConfidentialTransfer and SingleAssetVault/LendingProtocol is captured either as an unexpected non-composability finding (U-24) or as a documentation clarification.

## Before this ADR can be accepted
- 1. ~~Adversarial rotation.~~ First round done 2026-08-17. Second round required.
+ 1. ~~Adversarial rotation.~~ First round done 2026-08-17 (REVIEW-003). Second round done 2026-08-20 (REVIEW-017).
- 2. The hybrid resolved, not deferred.
+ 2. ~~The hybrid resolved, not deferred.~~ Resolved: rejected on structural float-leakage and yield-realization grounds.
- 3. GAP-8 closed — a full loan lifecycle over a confidential-capable MPT. Two of fifteen transactor paths were executed.
+ 3. ~~GAP-8 closed.~~ Closed 2026-08-17. Full fifteen-transactor lifecycle executed on Devnet; E-40 and F-10 confirmed Grade A.
  4. The competing reading of F-10 settled.
```

---

### Final Recommendation
Do not Accept Revision 2. **Adopt Revision 3 with the corrections above.** Once Revision 3 is committed and Item 4 (F-10 interpretation) is settled, ADR-0002 is ready to be **`Accepted`**.
