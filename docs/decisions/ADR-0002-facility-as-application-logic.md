# ADR-0002 — The facility is application logic, not XLS-66

- **Status:** Proposed. **Revision 4.** **Reviewed twice, adversarially, and it did not survive either round intact.**
- **Date:** 2026-08-16, revised 2026-08-17, and twice on 2026-08-20
- **History:** Rev 1 written by the session that produced the evidence. **Rev 2 (2026-08-17) after REVIEW-003's two independent adversarial legs, which converged on the same two defects:** blocker 3's permanence argument was mathematically wrong and is withdrawn (CLAIMS.md R-6), and the hybrid alternative's decisive rejection does not hold. **The decision itself stands; two of the arguments for it did not.** Both legs are recorded verbatim in `docs/reviews/REVIEW-003a-gemini-2026-08-17.md` and `REVIEW-003b-codex-2026-08-17.md`.
- **Context:** TASK ZERO §9, "The alternative that may make this moot". Answered by [`XLS-66-INVESTIGATION-2026-08-16.md`](../task-zero/XLS-66-INVESTIGATION-2026-08-16.md).
- **Blocks:** the architecture document, jointly with ADR-0001. Does not block Session 3's spike.

**This ADR was written by the same session that made the recommendation, and that is a weakness, not a formality.** Its evidence is strong and independently reproducible; its *weighing* of that evidence has had no adversarial pass. It enters the rotation as `Proposed` for the same reason ADR-0001 §(d) and §(e) do.

---

## The finding that drives everything

**XLS-66 publishes exactly what this project exists to hide, and cannot hold a confidential balance at all.**

`LendingProtocol`, `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` are all enabled on standard Devnet (E-26, dated). They are not composable, and nothing in the protocol, the specifications or the error codes says so.

Five independent blockers, any one of which is sufficient. Full evidence and line citations in the investigation §6; summarised here because an ADR that makes a reader open another document to find its own premise is not doing its job.

1. **The vault share token cannot be confidential.** `VaultCreate` constructs the share issuance's flags itself from two transaction flags and never sets `lsfMPTCanHoldConfidentialBalance`; there is no path to add it later, because the issuer is a pseudo-account and pseudo-accounts cannot sign `MPTokenIssuanceSet`. Observed: share `Flags: 56`; an owner-submitted attempt returns `tecNO_PERMISSION`.
2. **Vault and broker pseudo-accounts cannot hold a confidential balance.** They cannot sign the `ConfidentialMPTConvert` that initialises the fields (observed: `tefBAD_AUTH`), and cannot receive a `ConfidentialMPTSend`, whose destination must already carry `sfHolderEncryptionKey`.
3. **Every value in the protocol is a plaintext ledger field** — vault totals, broker debt and cover, loan principal, outstanding balance, periodic payment, management fee, and the `Amount` on every `LoanSet` and `LoanPay`.
4. **There are no revolving drawdowns.** Each draw is a separate `Loan` object with its own public terms, permanently linked to the borrower. Drawdown frequency — the residual leak TASK ZERO §9 identified — becomes *more* legible, not less.
5. **§9's design rule is unsatisfiable inside XLS-66.** Value cannot enter confidentiality once in aggregate and then move only by `ConfidentialMPTSend`, because every per-participant event in XLS-66 is a public-amount transaction and value must leave confidentiality before it can enter a vault at all.

**Rev 1 claimed blocker 3 was structural rather than a missing feature. That claim is withdrawn — see CLAIMS.md R-6.** The argument was that XLS-96's additive homomorphism cannot support amortisation because amortisation multiplies. It can: scalar multiplication by a *public* scalar is native to an additively homomorphic scheme, and an interest rate is a public loan parameter. Both REVIEW-003 legs found this independently.

What survives is smaller and is enough: **blocker 3 is true today**, every value is plaintext at rippled 3.3.0.

⚠ **Rev 2 then understated what closing it would take, and REVIEW-017 corrected that in turn.** Rev 2 said it needs *"a new proof relation for the non-linear part (rounding, fixed-point truncation), a specification, and validator-side changes"*. Rounding and truncation are **examples** of the obstacle, not its extent. Closing blocker 3 would require confidential loan-state fields, new transaction semantics, and proof relations for **everything validators currently check in plaintext** — linkage between confidential payment movement and loan state, range and non-negativity constraints, fees, interest accrual, overpayment handling, and the public/private boundary rules — as well as the non-linear fixed-point effects.

**And a second obstacle rev 2 did not name at all:** XLS-66 accrues loan state **autonomously, on ledger closes**. A zero-knowledge relation needs a prover holding the witness. Moving to client-submitted proofs for every accrual would change XLS-66 from an autonomous on-ledger state machine into a client-driven settlement layer — a different protocol, not a feature added to this one.

**Weight it as cost and timeline, not as a law of nature** — the mathematics is not the barrier, and rev 1's claim that it was is still withdrawn. But the roadmap item is considerably larger than rev 2 made it sound. See W-3 in the investigation §12, corrected to match.

---

## Decision

**The receivables financing facility is built as application logic on Confidential MPTs. The project does not build on XLS-66, and does not use an XLS-65 `Vault` object.**

⚠ **Rev 3 split this into a settled Decision A and an open Decision B, because rev 2 had asserted both in one sentence while reopening the second two sections later.** REVIEW-017's Codex leg was right to call that out. **Rev 4 merges them, because the `Vault` half turned out to have a technical answer** — see *Alternatives* — **and the scope question rev 2 and rev 3 both deferred to does not decide it.**

**Every participant — the funder or funders, and the suppliers — holds a confidential balance in one issuance.** Accountability does not come from publishing anyone's position; it comes from three tiers the primitive already has:

| Tier | Sees | Mechanism |
|---|---|---|
| Public / market | facility size and its changes; the counterparty set; the fact and timing of every event | `sfConfidentialOutstandingAmount`, and the transaction graph (P-11) |
| Arranger / issuer | **every** participant's balance | the **mandatory** issuer decryption mirror (P-9) |
| Supervisor / trustee | **every** participant's balance | the **optional** `AuditorEncryptionKey` |

⚠ **That is a statement about who can decrypt what. It is NOT a compliance claim** — `CLAIMS.md` **P-6** forbids asserting that anything here satisfies a named jurisdiction's requirements, and this table must never be read as doing so.

⚠ **And "confidential position" means AMOUNTS ONLY.** Which accounts are enrolled, and when they transact, stays public (P-4, P-11). If participant *identity* confidentiality is what a use case needs, this primitive does not provide it.

TASK ZERO §9's facility design stands unchanged, including R-5's single-conversion structure and the balance-tracking requirement that replaced the float cap.

### Terminology hazard this decision creates

**TASK ZERO §9 step 2 says "the vault converts once".** Read alongside step 1, "vault" there means the **Dedicated Account** — an ordinary XRPL account — and not an XLS-65 `Vault` ledger object. That reading was harmless when written and is now load-bearing: an XLS-65 `Vault` *cannot* convert, so a later session that reads the word as the ledger object will conclude the design is impossible. §9 has been annotated. **Prefer "Dedicated Account" over "vault" everywhere in this project from now on.**

---

## Alternatives considered

### Build on XLS-66 natively — rejected

The five blockers above. Not a close call, and the closeness is worth stating precisely: fixing blockers 1 and 2 upstream would not be enough, because 3 would still publish every supplier's financing terms.

### Hybrid — an XLS-65 vault for the funding side, confidential sends for the drawdown side — rejected, and this is the strongest alternative

The shape: investors deposit into a real `Vault` and hold share MPTs, which models the funding side natively with proper share accounting; drawdowns and repayments happen as `ConfidentialMPTSend` between ordinary accounts, outside the lending protocol. This has real appeal, because §9 already accepts that the funding side is public — *"Public: total facility size — which investors need."*

**Rev 1 rejected it on three grounds and called the first decisive. REVIEW-003 rejected that, both legs independently, and they are right.** Ground 1 said the hybrid "adds a public hop": the float cannot be converted inside the vault (blocker 2), so it must be withdrawn publicly and then converted. But §9's own design *already* funds a Dedicated Account publicly in aggregate and converts once in plaintext. **The plaintext boundary is the same in both designs, so ground 1 is not a confidentiality argument at all.**

Where the two designs actually differ, per participant:

**Rev 3 adds five rows. REVIEW-017 found the table incomplete on both sides — two rows favour the hybrid and three count against it — and a table that is doing the weighing cannot leave them in prose.**

| Value | §9 application-logic | Hybrid with an XLS-65 vault |
|---|---|---|
| Total facility size | public, once | public, once |
| Aggregate conversion into confidentiality | public, once | public, once |
| **Individual investor's contribution** | **not on ledger** — one funder | **public**, one `VaultDeposit` each |
| **Individual investor's position** | not on ledger | **public** — share MPT balance |
| Investor redemption | not on ledger | **public** `VaultWithdraw` amount |
| Per-supplier drawdown amount | hidden | hidden |
| Per-supplier repayment amount | hidden | hidden |
| Supplier counterparty set and timing | public (P-11) | public (P-11) |
| **Boundary crossings after funding** | **one**, at setup | **recurring** — value must re-enter the `Vault` in plaintext for share value to move. Amounts are aggregate, not per-supplier, but the *frequency and size* leak drawdown and repayment velocity |
| **Yield realisation** | not on ledger | **public in aggregate** — `sfTotalAssets` cannot grow without plaintext deposits, so financing margin is inferable over time |
| Pool and share accounting | **custom application logic** | **protocol-native**, and better than we would build |
| Withdrawal policy enforcement | **custom application logic** | **protocol-native** |
| Compliance surface | one application model | imports the pseudo-account domain exemption (investigation §5) |
| **Custody of the pooled float** | ⚠ **an ordinary account with an ordinary key — whoever holds it can move the whole float**. ⚠ **Not the only holder, 2026-09-13 (`REVIEW-046`):** the key that decrypts is also required to spend, and the issuer can erase or freeze the float without that key. Accepted by name, B-27 | **a pseudo-account with no key**; nothing moves outside the protocol's rules. ⚠ **But the pool is not keyless (`REVIEW-046` M2):** a shareholder can withdraw, a sole shareholder can withdraw all of it (`VaultWithdraw.cpp:211-226`), and the asset's issuer can claw back from the vault when the asset allows clawback (`VaultClawback.cpp:167-187`) |

**The real argument against the hybrid is in rows 3 to 5, and rev 1 did not make it.** The hybrid publishes each investor's contribution, position and redemption. Whether that matters depends on a question §9 never answers: is investor-side confidentiality in scope? §9 says total facility size is public "which investors need" — that is about investors *seeing* the total, not about their own positions being visible to each other.

**Rev 3: rows 9 and 10 are new and they cost the hybrid something rev 2 did not count.** A plaintext `Vault` cannot service a confidential pool without value crossing back: share value moves only when `sfTotalAssets` moves, and that needs plaintext deposits. So the hybrid keeps paying a disclosure the §9 design pays once. **The amounts that cross are aggregate, not per-supplier** — §9's own design crosses in aggregate at funding, and the same tranching applies here — so this is a difference of *degree and frequency*, not of kind.

⚠ **REVIEW-017's Gemini leg argued this makes the hybrid structurally impossible and closes the question. That is REJECTED** — see `REVIEW-017c` §3. It marks per-supplier drawdowns and repayments as *"public"*, which holds only if capital is withdrawn per-drawdown; under aggregate tranching, which is what both designs do, they stay hidden. **The hybrid is more expensive that way, not impossible.**

### ⚠ Rev 4 — the hybrid is rejected, and NOT on the scope question

Rev 2 and rev 3 both deferred to *"is investor-side confidentiality in scope?"*. **That question does not decide it, and framing it as the pivot was the mistake both revisions made.**

**The hybrid is not a tradeoff that can be tuned. It is a hard fork, and blocker 1 is why.** An XLS-65 `Vault`'s share token **cannot be confidential** — `VaultCreate` constructs the share issuance's flags itself from two transaction flags and never sets `lsfMPTCanHoldConfidentialBalance`, and there is no path to add it later because the issuer is a pseudo-account and pseudo-accounts cannot sign `MPTokenIssuanceSet`. So the hybrid forces:

> **native share accounting XOR confidential investor positions.** Not both, today.

**Three things then settle it, none of them a scope call:**

1. **The accounting is commodity; the confidentiality is the differentiator.** Share arithmetic is arithmetic the application layer can do. A confidential position with a mandatory issuer mirror is the thing that does not exist elsewhere and is the entire reason to be on XLS-0096.
2. **Most of the `Vault`'s benefit is unrealisable here anyway.** §9 already forces `TransferFee = 0` and settles fees and interest **off-ledger**. Share-price arithmetic was never going on-chain, so "protocol-native pool accounting" buys markedly less than rev 3's table row implies.
3. **Accountability does not require publishing positions.** The Decision's three-tier table covers it: public aggregate, mandatory issuer mirror, optional auditor key. The hybrid publishes each investor's contribution, position and redemption *in addition* to all of that — it adds disclosure without adding accountability.

**And this is why the funder count stops mattering.** One funder or twenty, every participant is a confidential MPT holder in one issuance and **the architecture does not fork.** Rev 2's table row — *"individual investor's contribution: not on ledger — one funder"* — described §9's single funding bank and made the design look contingent on it. It is not.

Grounds 2 and 3 from rev 1 stand and are now supporting rather than load-bearing: the hybrid imports the pseudo-account domain exemption into the compliance story, and doubles the amendment surface.

⚠ **One cost rev 4 does not price, added 2026-08-20 (E-117).** The custody row above is new and it cuts *against* this decision: a `Vault` pseudo-account holds pooled assets **with no key**, and the Dedicated Account replacing it does not. **The real axis is confidential positions XOR non-custodial pooling**, and this ADR picks the first because it is the project's premise — but it has never said out loud that it is giving up the second. ~~**That belongs in the weighing before this ADR is accepted**, and it is live for step 7: the facility's float sits under one key and no review has asked who holds it.~~ **Answered 2026-09-13.** `REVIEW-046` asked, and found more holders than one key: the issuer's clawback and freeze, the issuer's ElGamal secret, the plaintext facility book, and a decrypting key that is also required to spend. The project owner then ruled B-27: the custody risk is **accepted by name** for this Devnet artifact, printed on every facility run (`facility/src/custody.ts`), and no key split is built here. The issuer's powers apply to both columns of the table above, so they do not move the weighing; the axis stays confidential positions XOR non-custodial pooling. ⚠ **This ADR is still `Proposed` on item 4**, which the ruling does not touch.

**It is still the alternative to revisit if W-2 lands** — and specifically **if `lsfMPTCanHoldConfidentialBalance` ever becomes settable on a `Vault` share issuance, this rejection's premise is gone and the whole section must be re-argued.** That is the reversal condition to watch, and it is narrower and more checkable than the scope question it replaces. Note one thing REVIEW-003 raised and got wrong: atomic `Batch` does not rescue the hybrid, because batching removes the *window* between withdrawal and conversion, not the *disclosure* — the `Convert` amount is plaintext either way, and `Batch` does not let a pseudo-account sign.

### Wait for upstream — rejected

W-1 (a `VaultSet` field for the share flag) is cheap enough that it plausibly lands. It would not be sufficient on its own, because blocker 3 would remain — and with R-6, blocker 3 is now "a large roadmap item" rather than "impossible", which makes waiting *more* tempting, not less. It is still the wrong call on schedule: the project has an eight-week budget and no visibility into whether any of W-1 to W-3 is on anyone's roadmap. Revisit if that changes.

---

## What this decision does not claim

- **Not** that XLS-66 is deficient. It is a careful primitive for the product it specifies — uncollateralised fixed-term amortising loans with off-chain underwriting, which XLS-66 §5 states plainly. It is the wrong primitive for a confidential revolving facility, which it never claimed to be.
- **Not** that the two features were built in ignorance of each other. `requireAuth` recurses into vault pseudo-accounts (investigation §4.4); the authorisation models are integrated. Confidential *balances* are not.
- **Not** permanent. Dated to rippled 3.3.0 and Devnet as at 2026-08-16, with eight named reversal conditions and a four-command re-check procedure in the investigation §12.

---

## Consequences

- **The application layer must model financing terms itself, and will do it worse than XLS-66 does.** Whatever represents drawdown limits, interest and repayment schedules will be weaker than a reviewed protocol primitive. The README must scope this honestly and must not imply otherwise.
- **Three amendments are required, not four.** `ConfidentialTransfer` for the facility itself, plus `PermissionedDomains` **and** `SingleAssetVault` for the domain gate — E-19: `SingleAssetVault` is required to *write* `sfDomainID` even though no `Vault` object is ever created. What building on XLS-66 would have added is `LendingProtocol`, a fourth. *(Rev 1 said "one amendment, not two" and then listed three; REVIEW-003 was right that this reads as a contradiction. The intended point was one confidentiality primitive rather than two protocol families, which is not worth the confusion.)*
- **The negative result becomes a project output — subject to item 4.** Two live amendments that silently do not compose is a finding with a named audience. ⚠ **Rev 3 qualifies this**: acceptance item 4 records a competing reading in which a confidential-capable issuance holding a public balance in a public vault is *intended* composability. If that reading wins, this is a documentation request and not a defect, and the Consequences section should not have asserted otherwise while its own prerequisite was open. Captured as U-24 under `Observed` either way; nothing is filed from a coding session.
- **TASK ZERO §9 stands**, and both of its carry-forward items are unaffected in the way §8 of the investigation describes: the cover-traffic argument is unchanged and still unreviewed; the pseudo-account balance-tracking question is dissolved, not answered.
- **Session 3's spike is unaffected** and should proceed. This ADR does not gate it.

---

## Before this ADR can be accepted

1. ~~**Adversarial rotation.**~~ **DISCHARGED.** First round 2026-08-17 (`REVIEW-003a` Gemini, `REVIEW-003b` Codex) produced rev 2. **Second round 2026-08-20** (`REVIEW-017a` Gemini, `REVIEW-017b` Codex) read rev 2's replacements — the hybrid table and the corrected blocker 3 — and produced rev 3. Adjudicated in `REVIEW-017c`, which records **two leg claims rejected**.
2. ~~**The hybrid resolved, not deferred**~~ — **DISCHARGED 2026-08-20, and not the way two revisions expected.** Rev 2 and rev 3 deferred to *"is investor-side confidentiality in scope?"* and treated it as the pivot. **It is not the pivot.** Blocker 1 makes the hybrid a hard fork — native share accounting **XOR** confidential investor positions — and the choice between those is not a scope call for this project, whose entire premise is the second. See *Alternatives*. ⚠ **Reversal condition:** if `lsfMPTCanHoldConfidentialBalance` ever becomes settable on a `Vault` share issuance, this discharge is void.
3. ~~**GAP-8 closed**~~ — **DISCHARGED, and this ADR was stale about it for three days.** ⚠ Both REVIEW-017 legs found it independently: the text said *"two of fifteen transactor paths were executed"*, and GAP-8 **closed 2026-08-17** with the full fifteen-transactor lifecycle (`XLS-66-INVESTIGATION-2026-08-16.md`, E-40). The ADR was making itself look less supported than it was. The A → B regrade is lifted.
4. **The competing reading of F-10 settled** — that a confidential-capable issuance holding a public balance in a public vault is intended composability rather than a defect. If that reading wins, U-24 is a documentation request and not a finding. **Still open.**

**Still `Proposed`. Three of four discharged, and the one that remains is item 4 — research, not a decision.**

⚠ **Item 4 may not actually block this ADR, and that is deliberately not resolved here.** It settles whether U-24 is a *finding* or a *documentation request* — a question about the **Consequences** section, which rev 3 already qualified to say so. It does not bear on whether the decision is right. **Whether that is enough to move this ADR to `Accepted` is not a coding session's call**, and the register would rather carry an ADR that is `Proposed` for one traceable reason than one promoted by an agent reasoning its way past its own gate.
