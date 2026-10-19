# REVIEW-003 — request packet for the second adversarial rotation

- **Date:** 2026-08-16, revised 2026-08-17
- **Status:** **Round 1 complete; this packet is now the input to round 2.** Round 1 ran 2026-08-17 against Codex and Google Antigravity, independently. Both legs verbatim: `REVIEW-003a-gemini-2026-08-17.md`, `REVIEW-003b-codex-2026-08-17.md`. Questions answered in round 1 are struck through below rather than deleted, so round 2 does not re-run them.
- **What round 1 changed:** CLAIMS.md **R-6** (an inference withdrawn as mathematically wrong), **E-40 and F-10 regraded A → B**, ADR-0002 to **rev 2**, ADR-0001 to **rev 4** (two findings recorded, neither answered), and this packet's scope corrected — it had wrongly shielded TASK ZERO §9 from review.
- **Prepared by:** the coding session that produced `XLS-66-INVESTIGATION-2026-08-16.md`. **A packet assembled by an interested party is not a neutral one** — §5 lists what it is likely to have under-argued.
- **Method to follow:** as REVIEW-002 — Claude self-review, then two external chat-window reviewers independently, then adjudication with every disputed finding checked against rippled 3.3.0 source before acceptance.

**Why a packet exists at all.** REVIEW-002's external reviewers could not reach the rippled transactors, and six findings had to be settled afterwards by fetching four source files. That round-trip is avoidable: this packet carries the source excerpts, the live-ledger observations and the register state inline, so a reviewer without file access can argue from the same evidence rather than from recollection.

---

## 1. What is under review

Two documents, one rotation.

| Item | Document | Never reviewed | Reviewed at rev 1 |
|---|---|---|---|
| **A** | ADR-0001 §(d) — XRPL account key custody | ✅ | — |
| **B** | ADR-0001 §(e) — key generation, storage, backup | ✅ | — |
| **B′** | ADR-0001 §(e) nonce generation — *added rev 3, takes precedence within (e)* | ✅ | — |
| **C** | ADR-0001 §(a) process boundary — the localhost signer interface | ✅ | §(a)'s core decision only |
| **D** | ADR-0001 §(a) — **re-weigh Option 2 on risk alone**, since its cost argument no longer holds | ✅ | cost argument only |
| **E** | ADR-0002 in full — facility as application logic, not XLS-66 | round 1 done; **rev 2 unreviewed** | — |
| **F** | **TASK ZERO §9** — the facility design itself, and the cover-traffic argument its confidentiality depends on. *Added 2026-08-17; was wrongly out of scope in round 1* | ✅ | — |

**Out of scope. Do not relitigate.** ADR-0001's central finding (holder key custody controls spending, not privacy) was settled in REVIEW-002 and confirmed by primary source on 2026-08-16 (E-33). The rejected-claims register in REVIEW-002 Part 6 stands.

> **Corrected 2026-08-17 after round 1.** This section originally also placed **TASK ZERO §9's facility design out of scope**. REVIEW-003a called that what it was: shielding. The packet asked reviewers to validate rejecting §9's *alternative* while forbidding them to examine §9 itself — whose confidentiality rests entirely on an unreviewed cover-traffic argument and on E-22, a Grade C inference never tested. A rotation constructed that way can only return one answer.
>
> **§9 is now in scope.** Item F below. Question 14 is promoted out of "carried forward" and into the numbered set.

---

## 2. What has changed since REVIEW-002 — the reviewer needs all six

REVIEW-002 was 2026-08-13. Six things have landed since, three of which change arguments rather than facts.

1. **GAP-3 closed. ADR-0001 §(a)'s premise is confirmed** (E-33). `sk_A` is a witness component of the send relation; balance linkage is proved as `B₂ − b·G = sk_A·B₁` precisely because the historical randomness is unavailable to the prover; 2-special soundness extracts `sk_A`. Source: `cmpt-compact-sigma.pdf` §2.3, §2.4 Eq. 1, Thm 4.2, Thm 4.4 — Dore & Cenk, RippleX Research, 2026-05-12.
2. **E-34 — nonce reuse leaks `sk_A` and is undetectable from the proofs.** Compact form transmits `(e, z…)` and not the first-round commitments, so two proofs sharing nonce material verify normally while permitting witness extraction by anyone holding both. This is **new** and it is the sharpest cryptographic constraint on ADR-0001's local-proving decision. It needs only a bug in our own signer — no adversary with local measurement, no failing transaction, no observable error.
3. **The cost basis for rejecting Option 2 has materially changed.** Serialisation shipped upstream (`ripple-binary-codec@2.9.0`, E-30) and a WASM proof-generation build exists in mpt-crypto's CI (E-31). Rev 3 records this and explicitly declines to re-decide it. **Item D exists because of this.**
4. **Measured performance replaced the unusable spec figures** (E-24). Stated in full, because P-8 forbids a benchmark number without its hardware, parameter set and methodology — and a packet written for reviewers who cannot open the file cannot discharge that by citing the file:

   > Apple M3 Pro, macOS 26.6.1, Apple clang 21, `-O3 -DNDEBUG`, n = 50.
   > Aggregated Bulletproof (m=2): proving median **34.583 ms**, verification median **16.100 ms**.
   > Compact sigma, standard: prove **0.214 ms**, verify **0.328 ms**. Full Send bundle ≈ 34.8 ms prove / 16.4 ms verify.
   > Spread per run in `benchmarks-2026-08-16.md`.

   **Carry the block, not the numbers.** XLS-0096 §14.2's own "laptop-class CPU" figures remain unquotable (B-1).
5. **The decryption "bound" is not a bound** (F-7). It is a caller-supplied window; cost is linear in window *width* with no early exit. Consequence: an application must track expected balances off-ledger. R-5 was un-retracted on this basis.
6. **XLS-66 was investigated and found non-composable with confidential balances** — item E. Evidence in §3 below.

---

## 3. Evidence for item E, inline

Reviewers cannot fetch these. All line numbers are rippled at tag `3.3.0`, commit `00a178fb92ca49521b937ae1a99d863765ea8a90`.

**Share-token flag construction — `VaultCreate.cpp:179–183`:**
```cpp
std::uint32_t mptFlags = 0;
if (!tx.isFlag(tfVaultShareNonTransferable))
    mptFlags |= (lsfMPTCanEscrow | lsfMPTCanTrade | lsfMPTCanTransfer);
if (tx.isFlag(tfVaultPrivate))
    mptFlags |= lsfMPTRequireAuth;
```
`lsfMPTCanHoldConfidentialBalance` (0x80) is never set and there is no `VaultCreate` field that could request it.

**Pseudo-accounts cannot sign — `Transactor.cpp:925–936`:**
```cpp
if ((view.rules().enabled(featureLendingProtocol) ||
     view.rules().enabled(featureBatchV1_1) || view.rules().enabled(fixCleanup3_3_0)) &&
    isPseudoAccount(sle))
{
    // Pseudo-accounts can't sign transactions. …
    return tefBAD_AUTH;
}
```
All three gating amendments are enabled on Devnet as at 2026-08-16T13:41Z.

**Confidential send requires a prepared destination — `ConfidentialMPTSend.cpp:227–233`:** the destination's `MPToken` must already carry `sfHolderEncryptionKey`, `sfConfidentialBalanceInbox` and `sfIssuerEncryptedBalance`, all of which only a self-signed `Convert` can create.

**Pseudo-account authorisation exemption — `MPTokenHelpers.cpp:331–337`, returning at `:350–351` (post-`fixCleanup3_3_0`) *before* the domain block at `:395–413`.**

**Live-ledger observations, standard Devnet, 2026-08-16.** Re-queryable by anyone with `account_objects` / `account_tx`:

| Observation | Result |
|---|---|
| `VaultCreate` with a `CanTransfer\|CanHoldConfidentialBalance` MPT as asset | `tesSUCCESS` |
| Vault share issuance flags | `56` — no 0x80 |
| `MPTokenIssuanceSet` adding the confidential flag to that share issuance | `tecNO_PERMISSION` |
| `AccountSet` submitted as the vault pseudo-account | `tefBAD_AUTH` |
| `VaultDeposit` of 600 units | `tesSUCCESS`; `AssetsTotal: "600"` in cleartext |
| Uncredentialed account receiving a domain-gated MPT | `tecNO_AUTH` |
| Credentials held by a pseudo-account custodying 600 units of that gated MPT | `[]` — none |
| `VaultWithdraw` after the holder's credential was revoked | `tecNO_AUTH` — position trapped |

Vault pseudo-accounts: `rLa7bb8kydTQAfSmv6kevTr14a9rEEveb6` (ungated), `rBHJWCVjNTBeoZxihQZmH7xeJYZ6bcogmr` (domain-gated).

---

## 4. The questions, in priority order

**Answer B′ first.** It is the only item whose failure mode is silent, irreversible and invisible to every harness this project plans to build.

### B′ — nonce generation *(Cryptography Reviewer, first)*
1. Is `HKDF(sk_A ‖ r ‖ m ‖ b ‖ ρ ‖ statement ‖ fresh entropy)` over the **full** witness the right construction, and is the domain-separation label specified adequately to implement without ambiguity?
2. Is mixing fresh entropy into an otherwise deterministic derivation correct here, or does it reintroduce the failure it prevents on a platform with a weak RNG?
3. What is the known-answer test suite that would actually catch a reuse bug, given that reuse produces proofs which verify normally?
4. Does the localhost signer interface (item C) leak any caller influence over nonce material?

### B — key derivation *(Cryptography Reviewer, second)*
5. Is deriving the ElGamal keypair from the XRPL master seed acceptable given that seed compromise then yields retroactive decryption of the entire confidential history, permanently, with no rotation?
6. Does reduction to the secp256k1 group order introduce bias, and does the proposed derivation handle it correctly?
7. Repository-local scheme, or proposed as a standard?

### D — re-weigh Option 2 on risk alone
8. Option 2 (server-side proving) was rejected on a cost argument that no longer holds. **On risk alone, is local proving still correct?** Note both directions: local proving preserves spending authority (E-33), and local proving is what makes E-34 our bug to make rather than someone else's.

### C — the process boundary
9. Is a localhost HTTP daemon with an origin allowlist and a session token an adequate boundary between a browser page and a binary holding spending authority? What does a hostile local process get?

### A — XRPL account key custody
10. Is "no custodial mode is offered" right for a *reference application*, given the onboarding friction it imposes on a demo?

### E — the XLS-66 decision
11. ~~**Attack the hybrid.**~~ **ANSWERED in round 1 — both legs, independently. Ground 1 was not decisive.** §9's own design already funds publicly in aggregate and converts once in plaintext, so the plaintext boundary is identical in both designs. ADR-0002 rev 2 relocates the argument to investor-side disclosure and downgrades the rejection to a tradeoff. **The replacement argument is unreviewed — see question 17.**
12. ~~Is the C-grade inference sound?~~ **ANSWERED in round 1 — no, and the error was mathematical.** Scalar multiplication by a public scalar is native to an additively homomorphic scheme. Withdrawn as CLAIMS.md **R-6**; B-11 rewritten. **Do not re-run this question; run question 12a instead.**
12a. The two checks B-11 still carries are undone: does `secp256k1_mpt.h` export any multiplicative or comparison operation beyond what E-31 records, and have XLS-0096's authors said anything about arithmetic beyond addition?
13. ~~Does the evidence support "cannot" or only "does not today"?~~ **ANSWERED: only "does not today".** Both legs. E-40 and F-10 regraded A → B on the same reasoning.

### F — TASK ZERO §9 and cover traffic *(promoted into scope 2026-08-17)*
14. **Does §9's facility design deliver the confidentiality the project claims?** Its sole answer to the residual metadata leak — that drawdown *frequency* is legible as financial stress even when amounts are hidden — is scheduled zero-value `ConfidentialMPTSend` cover traffic. That recommendation is `Proposed`, reviewed by nobody, and rests on **E-22, Grade C, inferred and never tested**. B-10 depends on it explicitly. Session 3 attempts falsification.
15. **If E-22 falls, what happens?** B-10 becomes `BLOCKED` and §9's conclusion falls with it. Is there a second line of defence, or is the domain then indefensible as chosen?
16. **Is cover traffic honest for a reference application at all?** §9 concedes the alternative is to keep the domain and state plainly that timing is public — at the cost of a weaker commercial justification than the project's framing claims.

### Round 2 additions — findings from round 1 that need a second pair of eyes
17. **ADR-0002 rev 2's hybrid comparison table** is new and unreviewed. It relocates the argument from "public hop" to "investor-side disclosure". Is the new argument any better?
18. **The question rev 2 exposes and cannot answer: is investor-side confidentiality in scope for this project?** The hybrid design turns entirely on it. Nobody has decided it.

---

## 5. Where this packet is likely biased

Stated so a reviewer can correct for it rather than discover it.

- **Item E is argued by the party that produced it**, one working day after producing it, with no cooling-off period.
- **The hybrid alternative got roughly one paragraph of genuine adversarial thought.** It deserves more and did not get it.
- **Two of fifteen transactor paths were executed** (GAP-8). The claim "nothing rejects the combination" is a grep plus two experiments, not fifteen experiments.
- ~~**The "structural, not a roadmap gap" inference was not verified against mpt-crypto's exported API.**~~ **Round 1 did better than predicted: the inference was not merely unverified, it was wrong.** Withdrawn as R-6. The self-assessment in this section identified the right item and understated the severity — worth remembering next time this section is written, because "least-tested" and "false" are different failure modes and the author reached for the gentler one.
- **The packet's framing of §5's domain-gating result as a weakening may be wrong.** A RippleX engineer could reasonably say the pool is not a party and never needed a credential. Both readings are stated in the investigation; only one is stated in the ADR.

---

## 6. What acceptance would unblock

ADR-0001 and ADR-0002 both accepted, plus the Cryptography Reviewer's ruling on B′ and B, discharges the last two of ADR-0001's four preconditions and the first of ADR-0002's three. **The architecture document then becomes writable** — for the first time in this project. It is not writable now, and no amount of further research makes it so.
