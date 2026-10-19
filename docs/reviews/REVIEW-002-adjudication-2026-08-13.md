# REVIEW-002 — adjudication of the review rotation

- **Date:** 2026-08-13
- **Rounds:** Claude self-review (REVIEW-001) → ChatGPT → Gemini → this adjudication
- **Method:** every disputed finding was checked against rippled 3.3.0 source before being accepted or rejected. Findings that could not be checked are recorded as such.

---

## Part 1 — Verification round: six disputed findings settled

The two external reviewers disagreed about whether the §8 divergences could be asserted at all, because neither could reach the rippled transactors. I fetched them. Results below are Grade A, read directly from source at tag 3.3.0.

### D-1 — CONFIRMED, and upgraded from Grade C to Grade A

The canonical encrypted zero is written by `encryptCanonicalZeroAmount(pubKey, account, mptIssuanceID)` in **all three** cases:

- **First-time opt-in** — `ConfidentialMPTConvert.cpp:305–313`, with the comment *"Spending balance starts at zero. Must use canonical zero encryption"*
- **Inbox reset after merge** — `ConfidentialMPTMergeInbox.cpp:111–114`, *"Reset inbox to encrypted zero. Must use canonical zero encryption"*
- **After clawback** — `ConfidentialMPTClawback.cpp:138–166`, applied to spending, inbox, issuer mirror and auditor mirror

All three inputs to that function — public key, account ID, issuance ID — are public ledger data. Any observer can recompute the value and byte-compare.

**So a freshly-opted-in holder's spending balance, and any holder's inbox immediately after a merge, are publicly identifiable as exactly zero.** The RippleX documentation's claim that the reset value *"is indistinguishable from other ciphertexts to observers without the private key"* is wrong. XLS-0096 §9.4 is right.

This discharges REVIEW-001 R-2's *grading* criticism, which was correct when written. R-2's *framing* criticism stands and is addressed in Part 4.

### D-3 — CONFIRMED. Spec right, docs wrong

`MPTokenIssuanceSet.cpp` handles `tfMPTSetCanHoldConfidentialBalance` and `tifMPTCanHoldConfidentialBalance` only. There is no clear or disable flag anywhere in the transactor's flag handling, and none in the spec's flag table. Enabling confidentiality is one-way. The documentation's *"can be toggled on and off as long as no confidential balances exist"* is wrong.

*Method note: this rests on absence of a flag across the transactor plus the spec's explicit statement, which is weaker evidence than a positive read. Graded A on the combination; a reviewer who wants to re-derive it should check the full flag enumeration rather than trust the grep.*

### D-4 — CONFIRMED. Spec right, docs wrong

`ConfidentialMPTClawback.cpp:150` calls `incrementConfidentialVersion(*sleHolderMPToken)`. The version counter **increments**. The documentation's *"the version counter is reset to 0"* is wrong. A wallet that predicts a post-clawback version of 0 will bind proofs to the wrong value and fail with `tecBAD_PROOF`.

### D-6 — CONFIRMED. Funds are burned

`ConfidentialMPTClawback.cpp:170–179` decrements `sfConfidentialOutstandingAmount` and `sfOutstandingAmount`. There is no credit to any account anywhere in the transactor. The spec's §11 and §11.4 are correct; the stray sentence in §11.2 claiming funds move to the issuer's public reserve is a spec erratum.

### GAP-4 — RESOLVED in mechanism, and it produced a finding nobody predicted

`MPTokenIssuanceCreate.cpp:31–36`:

```cpp
if (ctx.tx.isFieldPresent(sfDomainID) &&
    !(ctx.rules.enabled(featurePermissionedDomains) &&
      ctx.rules.enabled(featureSingleAssetVault)))
```

**Writing `sfDomainID` to an `MPTokenIssuance` requires `PermissionedDomains` *and* `SingleAssetVault` (XLS-65) to be enabled.** Both are `Supported::Yes` in 3.3.0, so this is not blocked on unshipped code — it is blocked on which amendments the target network has enabled.

Two consequences:

1. **W-CONF needs three amendments enabled simultaneously on the Confidential Devnet: `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault`.** A special-purpose devnet stood up for XLS-96 may well carry the first and not the other two. This is now the most likely way the compliance third of the project dies, and it is checkable by the script that already exists. GAP-4 folds into GAP-1.
2. That MPT domain gating depends on the Single Asset Vault amendment is not something you would guess from any specification. Worth a line in the write-up.

**New finding, N-1.** `MPTokenIssuanceSet.cpp:369–376` — setting `sfDomainID` to zero calls `makeFieldAbsent`. **The issuer can unilaterally remove the domain gate at any time**, silently, with no holder consent. That belongs in the trust model next to clawback.

### E-3 / E-4 byte sizes — NOT fully settled. New gap.

`Protocol.h:466–471` defines `kEcSendProofLength = kEcSendSigmaProofLength + kEcDoubleBulletproofLength`, resolving to `SECP256K1_COMPACT_STANDARD_PROOF_SIZE` and `kMPT_DOUBLE_BULLETPROOF_SIZE` — macros defined in mpt-crypto's headers, not in rippled. The **structure** (fixed length, sigma plus double Bulletproof, enforced at preflight) is source-verified. The **numbers** 192, 754 and 946 remain spec-only.

`mpt-crypto`'s headers were not reachable: path probing failed and the GitHub tree API rate-limited. **Recorded as GAP-6**, closed by cloning the repo and reading `include/`.

---

## Part 2 — ChatGPT's findings, adjudicated

| # | Finding | Ruling |
|---|---|---|
| 1.1 | E-3/E-4/E-6 graded A without underlying verification | **PARTIALLY ACCEPTED** |
| 1.2 | E-17 graded A while GAP-4 open | **REJECTED** |
| 2.1 | Trust model omits issuer's destroy authority | **ACCEPTED, wording corrected** |
| 3.1 | Local signer contradicts the declared web stack | **ACCEPTED — blocking** |
| 4.1 | GAP-1 is cheaply resolvable, run the script | **REJECTED** |
| 5.1 | Issuer-view harness is scope growth | **ACCEPTED, fix adopted** |
| 6.1 | No FFI failure-mode specification | **PARTIALLY ACCEPTED** |
| D.1 | Domain §9 fails its confidentiality claim | **ACCEPTED — blocking** |
| A.1 | ADR-0001 has no key derivation/storage/backup spec | **ACCEPTED — blocking** |

**1.1 — partially accepted, rationale rejected.** The conclusion is right for E-3 and E-4 and both should drop to Grade B, but not for the stated reason. The sizes do not depend on `cmpt-compact-sigma.pdf` (GAP-3), which concerns what the proof *proves*, not how long it is. They depend on mpt-crypto's header constants — now GAP-6. **E-6 stays Grade A**: `kTxMaxSizeBytes` was read directly out of `Protocol.h` by executing a grep, which is the definition of Grade A in the register, and GAP-3 has no bearing on it. Lumping it in was wrong.

**1.2 — rejected.** This conflates two claims the register already separates. E-17 is a claim about *mechanism* — that `requireAuth` consults `sfDomainID` and is called on both sender and destination — and it was read from source. Whether `sfDomainID` can be written is a separate claim, already filed as **B-8, status PENDING**. The register is not asserting an unverified capability. *Wording fix accepted:* E-17 will read "when set, gates…" so it cannot be misread as operational.

**2.1 — accepted, wording corrected.** The trust model does mention clawback twice, but never states that the issuer can *destroy* a balance it cannot spend. That asymmetry belongs in the honest label. ChatGPT's proposed wording — *"the Issuer HAS the absolute technical power to unilaterally destroy any holder's entire confidential balance at any time"* — is itself overstated: XLS-0096 §11.3.2 returns `tecNO_PERMISSION` unless `lsfMPTCanClawback` is set on the issuance. The correct statement is conditional, and whether to set that flag is a design decision W-CONF gets to make and must then disclose.

**3.1 — accepted, blocking. Best finding of the round.** `CLAUDE.md` declares Bun / TypeScript / TanStack Start / Elysia / Tailwind. ADR-0001 selects a native local signer. A browser page cannot invoke a local binary without a localhost daemon, a native messaging host, or a desktop shell, and none is specified. Neither my self-review nor Gemini caught this as a contradiction. Gemini's B5 arrives at the same place from the security side — it asks for transport, serialisation, zeroization and process boundary. Merged into one blocking item.

**4.1 — rejected.** Misreads GAP-1. The gap is not that no tool exists; it is that no reading has been taken, and the research session had no node access, which §0 states plainly. `tools/check-amendments.ts` was written *for* this gap and §12 lists running it as action item 1. *Wording fix accepted:* §0 will say "not yet taken, action assigned" rather than leaving "gap" to imply unresolvable.

**5.1 — accepted, fix adopted.** REVIEW-001 R-12 flagged the issuer-view harness as unlabelled scope growth. ChatGPT's fix is better than mine: make it a single CLI command that decrypts one account's `sfIssuerEncryptedBalance` given the issuer key, not a standalone application. Adopted.

**6.1 — partially accepted.** The dependency risk is real and REVIEW-001 R-10 already names it (`0.4.0-rc4`, 33 open issues, 18 open PRs). The proposed fix — mandating FFI boundary sanitisation and buffer limits — is generic engineering advice about code that does not exist and whose binding strategy has not been chosen. Folded into R-10 as a risk note. Rejected as a TASK ZERO deliverable.

**D.1 and A.1 — accepted, both blocking.** D.1 is the same finding as R-1 and Gemini's B3; see Part 3. A.1 is a genuine gap my review missed: ADR-0001 decides *who holds* the ElGamal key and never says how it is generated, stored, or backed up, in a protocol where loss is unrecoverable and rotation impossible.

**On A.1's proposed fix — accepted as the leading candidate, not adopted outright.** Deriving the ElGamal key deterministically from the XRPL master seed would solve recovery. It also means one seed compromise yields both spending authority *and* retroactive decryption of the holder's entire confidential history, permanently, with no rotation available. That is a real trade-off, not an obstacle — deterministic derivation with proper domain separation is standard practice — but it is a cryptographic design decision and goes to the Cryptography Reviewer before it goes into the ADR.

**One assertion rejected on method.** ChatGPT's §8 table states *"Code confirms burn"* for D-6 and marks several rows verified, while elsewhere admitting it could not check implementation. It reached the right answer, but it was not entitled to it. Recorded below.

---

## Part 3 — Gemini's findings, adjudicated

| # | Finding | Ruling |
|---|---|---|
| — | Refusal to claim verification it could not perform | **CORRECT — credited** |
| B1 | Divergences stated more strongly than available evidence | **ACCEPTED, now discharged by Part 1** |
| B2 | D-2 conflates protocol permanence with operational practice | **ACCEPTED** |
| B3 | Domain recommendation claims success prematurely | **ACCEPTED — blocking** |
| B4 | ADR-0001 silently shifts from confidentiality to spending authority | **ACCEPTED — blocking** |
| B5 | "Never receives key material" is asserted, not specified | **ACCEPTED, merged with ChatGPT 3.1** |
| B6 | "Can read" versus "can decrypt" | **ACCEPTED — polish** |
| — | Blanket caution on D-3 through D-5 | **PARTIALLY REJECTED** |

**The refusal was the correct behaviour and should be credited.** The prompt required primary-source verification and forbade filling gaps from training data. Gemini could not reach the rippled tree, said so, and declined to label findings as source-verified. That is the discipline the project asks for, applied to itself. It also means Gemini's findings are the more trustworthy of the two on questions of provenance, even though ChatGPT produced more of them.

**B1 — accepted, now discharged.** The demand was that every divergence be tagged as reproduced-against-implementation, reproduced-against-documentation-only, or hypothesis-awaiting-verification. Correct, and Part 1 supplies the missing tags for D-1, D-3, D-4 and D-6.

**B2 — accepted.** The distinction is precise and improves the finding rather than weakening it. Protocol capability: the issuer key is permanent and unrotatable. Operational pattern: an issuer *choosing* Mechanism 2 shares that key. The claim that survives is conditional and sharper — *if* an issuer uses issuer-mediated auditing, the disclosure it grants can never be withdrawn, because the key can never be rotated. Restate D-2 in those two layers.

**B4 — accepted, blocking.** The sharpest single sentence in either review: *"It makes one sentence wrong."* ADR-0001 establishes that the issuer already reads every balance, then justifies the local signer as *"the only option under which the confidentiality claim in the README is true as written."* The property the local signer protects is custody. Confidentiality from the issuer is unchanged and unchangeable. Having found that custody and privacy come apart in XLS-96, the ADR then wrote a sentence that fuses them again. Fix as Gemini proposes: *local proof generation preserves holder spending authority; issuer visibility is unchanged because the protocol mandates issuer-readable ciphertexts.*

**B6 — accepted as polish.** The ledger holds ciphertexts; the issuer decrypts them. "Can read" is loose prose in documents that are otherwise precise about mechanism.

**Blanket caution on D-3 through D-5 — partially rejected.** Correct for D-3 and D-4 at the time, and Part 1 now settles both. **Wrong for D-5**, which was executed directly: `grep -i "revealed" sfields.macro` returned `NOT PRESENT`, and absence of a field from the field enumeration is verification, not inference. D-5 was Grade A when written and stays Grade A.

---

## Part 4 — Convergence, and the reframed headline finding

**All three passes independently found the same defect in TASK ZERO §9** (R-1, D.1, B3): the restructured facility hides amounts and leaves the counterparty graph, event timing and drawdown frequency fully public, while §9 concludes the confidentiality requirement is satisfied. Three independent passes, two of them verifying against the spec. **This is the strongest finding of the rotation and it is not further disputable.** §9's conclusion must be replaced with the narrower true statement, and the domain must then be re-argued against the residual leak — a facility whose drawdown *timing* is public may still be viable, but that case has not been made and cannot be assumed.

**The headline publication candidate has changed shape, and improved.** REVIEW-001 R-2 warned that framing D-1 as a discovered privacy weakness would misrepresent a documented design choice. Part 1 resolves this. The finding is not about the protocol at all:

> The RippleX prerelease documentation for XLS-96 contradicts the specification in four places — the detectability of the canonical encrypted zero, whether confidentiality can be disabled once enabled, the clawback version counter, and the nature of issuer-mediated auditing. In all four, the rippled 3.3.0 implementation agrees with the specification. The documentation is wrong.

That is a documentation-accuracy finding, fully verified against source, checkable by anyone, and it carries no risk of appearing to mistake a design choice for a weakness. Two of the four have operational consequences: a wallet built from the documentation will mispredict the post-clawback version counter, and an integrator will believe balances are less observable than they are. **File all four upstream as documentation issues before writing anything public.** Publishing first would be the wrong order.

---

## Part 5 — Net blocking list

1. **§9's confidentiality conclusion is false as written.** Three-way convergence. Rewrite, then re-argue the domain against timing and graph leakage.
2. **ADR-0001 does not decide XRPL account key custody.** (R-3)
3. **ADR-0001 has no ElGamal key generation, storage or backup specification.** (ChatGPT A.1) Derivation strategy to the Cryptography Reviewer first.
4. **ADR-0001's local signer contradicts the declared stack, with no transport or process boundary specified.** (ChatGPT 3.1 + Gemini B5)
5. **ADR-0001 justifies the decision on confidentiality when the property is custody.** (Gemini B4) One sentence.
6. **The README describes a non-existent system in the present tense.** (R-4)

Non-blocking, fix in the same pass: regrade E-3/E-4 to B and open GAP-6; add the conditional clawback destroy-authority and N-1 (issuer can clear the domain gate) to the trust model; correct the document dates (R-5); verify or drop the fee-mechanism explanation (R-6); check the metadata cap (R-7); add the mpt-crypto RC dependency to §11 (R-10); downscope the issuer-view harness to a CLI command; "decrypt" not "read".

Then GAP-1, which now also carries GAP-4: confirm `ConfidentialTransfer`, `PermissionedDomains` **and** `SingleAssetVault` are all enabled on the Confidential Devnet.

---

## Part 6 — Rejected claims register

Recorded so later sessions do not relitigate them.

| Claim | Source | Rejected because |
|---|---|---|
| E-6 (`kTxMaxSizeBytes`) should drop from Grade A | ChatGPT 1.1 | Read directly from `Protocol.h` by execution, which is Grade A by definition. GAP-3 has no bearing on a size constant. |
| E-3/E-4 grading depends on `cmpt-compact-sigma.pdf` | ChatGPT 1.1 | That paper concerns what the proof proves, not its length. The dependency is on mpt-crypto's header constants — now GAP-6. Conclusion accepted, rationale rejected. |
| E-17 should move to PENDING | ChatGPT 1.2 | Conflates mechanism with capability. The mechanism was read from source; the capability is already filed separately as B-8, PENDING. |
| GAP-1 was listed despite being cheaply resolvable | ChatGPT 4.1 | The session had no node access. The gap is an untaken reading, and §12 assigns it as action item 1. |
| Mandate FFI boundary sanitisation and buffer limits now | ChatGPT 6.1 | Generic advice about unwritten code with an unchosen binding strategy. Risk retained via R-10. |
| "Code confirms burn" (D-6) | ChatGPT §8 table | Correct conclusion, unsupported method — the reviewer had not read the transactor. Independently verified in Part 1; the claim stands, the attribution does not. |
| D-5 should not be published pending implementation check | Gemini | Executed directly: `sfRevealedAmount` is absent from `sfields.macro`. Absence from the field enumeration is verification. |
| Clawback gives the issuer unconditional destroy power | ChatGPT 2.1 wording | Requires `lsfMPTCanClawback` on the issuance (XLS-0096 §11.3.2). Substance accepted, wording corrected to conditional. |

---

## Part 7 — Note for the next rotation

The two reviewers failed in opposite directions and both failures are informative. ChatGPT produced more findings, including the two best of the round, and asserted source verification it had not performed. Gemini produced fewer findings, declined to assert what it could not check, and was right to. Weight them accordingly: ChatGPT for finding things, Gemini for whether a claim is entitled to its grade.

Neither could reach the rippled source tree. **That is the binding constraint on this rotation, not model capability.** Six of the disputed findings were settled in one session by fetching four files. Future rounds should either attach the relevant transactor source to the prompt, or route implementation questions to the Protocol Researcher persona in Claude Code — which has file access and a live node — rather than to a chat window that does not.
