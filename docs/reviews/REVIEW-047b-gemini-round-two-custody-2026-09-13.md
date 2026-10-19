# REVIEW-047b — Gemini leg: round two, the custody disclosure against the specification

- **Date:** 2026-09-13
- **Leg:** Gemini via `agy --effort high`, no tools
- **Packet:** `docs/reviews/REVIEW-047-packets/packet-b-disclosure-auditor.md`, followed in the bundle by `facility/src/custody.ts`, the fixed decision request, `REVIEW-046c` and `ADR-0002`, all at `74bf9a1`; register rows E-117, E-256, E-266, E-290 to E-294, B-27, B-28 and B-29 whole; and XLS-0096 at `58ccd30`. The 195 KB bundle is not committed.

> **RECORDED VERBATIM. Adjudicated in `REVIEW-047c`.**

---

## FINDINGS, most serious first

1. **[new mechanism]** `"A delegate can sign movements in the account's name (H4). Send, ConvertBack and MergeInbox are delegable (transactions.macro:1106-1136), a Delegate object authorises it (Transactor.cpp:381-408), and PermissionDelegationV1_1 is enabled on Devnet. Nothing in signer/ or facility/ reads a Delegate object."` — Document 2 (*DECISION REQUEST*, §Who else holds power over the float) / Document 3 (*REVIEW-046c*, §H4) — XLS-0096 §5.5 states: *"The issuer may designate one or more delegate accounts to act on its behalf, for example, to submit `ConfidentialMPTClawback` transactions or to manage the dedicated account (Confidential Vault)... `ConfidentialMPTSend`, `ConfidentialMPTMergeInbox`, `ConfidentialMPTConvertBack`, and `ConfidentialMPTClawback` are delegable. `ConfidentialMPTConvert` is NOT delegable."* — **What it changes:** Delegation is an alternative transaction-authorization **MECHANISM** for powers already named (movement by the holder and clawback by the issuer), not an independent new holder of ungranted power. Because a delegate cannot act without an explicit on-ledger `Delegate` grant created by the account owner and still requires the principal's ElGamal secret for ZKP generation (§5.5), this is not a new power. Its omission from the runtime disclosure is correct for this artifact (which provisions no `Delegate` object), though properly noted in the decision request as a production deployment check. **No new review round is owed.**

2. **[other]** `"The issuer's ElGamal secret reads every amount and every balance in the issuance, and it cannot be rotated either."` — Document 1 (*custody.ts*, line 4) — XLS-0096 §5.3, §6.1, §16.2.1 state: *"If an auditor is set, balances are additionally encrypted under an auditor's public key (`AuditorEncryptedBalance`), enabling on-chain selective disclosure... This allows the auditor to use their own private key to independently decrypt and verify any holder's balance at any time, without needing cooperation from the issuer or the holder."* — **What it changes:** The specification defines an optional on-chain **Auditor** role capable of whole-book decryption via `AuditorEncryptionKey`. This is an inactive protocol **power** for this specific facility issuance because `facility/run-facility.ts:349-354` provisions `IssuerEncryptionKey` alone and sets no `AuditorEncryptionKey`. The disclosure is accurate for this facility's issuance, and omission of the auditor key from the runtime text reflects actual configuration.

---

## WHO CAN DO WHAT TO THE FLOAT, by the specification

| Party | Power | Mechanism | XLS-0096 Section | Named in the disclosure? |
|---|---|---|---|---|
| **Dedicated Account (Holder)** | **Move** (Drawdown / Send) | `ConfidentialMPTSend` with XRPL account signature + Holder ElGamal secret (192-byte compact Send sigma proof + 754-byte aggregated Bulletproof) | §5.4, §5.5, §7.1, §9.2 | **Yes** |
| **Dedicated Account (Holder)** | **Move** (Retire / Convert Back) | `ConfidentialMPTConvertBack` with XRPL account signature + Holder ElGamal secret (128-byte compact ConvertBack sigma proof + 688-byte single Bulletproof) | §5.4, §7.1, §11.3 | **Yes** |
| **Dedicated Account (Holder)** | **Move** (Consolidate Inbox) | `ConfidentialMPTMergeInbox` with XRPL account signature (proof-free homomorphic merge into `CB_S`) | §5.2, §10.2, §10.3, §10.5 | **Yes** (subsumed under movement) |
| **Dedicated Account (Holder)** | **Read** (Own movements & balance) | Decrypt `ConfidentialBalanceSpending` (`CB_S`), `ConfidentialBalanceInbox` (`CB_IN`), `SenderEncryptedAmount`, and incoming `DestinationEncryptedAmount` using Holder ElGamal secret | §5.3, §7.1, §9.2 | **Yes** |
| **Issuer (Bank)** | **Remove / Erase** (Burn confidential float) | `ConfidentialMPTClawback` with Issuer XRPL signature + Issuer ElGamal secret (64-byte compact Clawback sigma proof); permanently burns holder confidential balance, decreasing `COA` and `OA` without crediting any account | §3, §4.1, §5.4, §12.1, §12.5 | **Yes** |
| **Issuer (Bank)** | **Freeze** (Immobilise confidential float) | Enable `CanLock` via `MPTokenIssuanceSet` (under `DynamicMPT`) and set `lsfMPTLocked` on `MPToken` or `MPTokenIssuance`; causes `ConfidentialMPTSend`, `Convert`, `ConvertBack`, `MergeInbox` to fail with `tecLOCKED` | §6.2, §8.4.2, §9.4.2, §10.4.2, §11.5.2, §12.1, §13.1 | **Yes** |
| **Issuer (Bank)** | **Read** (Whole issuance balances & amounts) | Decrypt `IssuerEncryptedBalance` on all `MPToken` entries and `IssuerEncryptedAmount` on all `Send`, `Convert`, and `ConvertBack` transactions using Issuer ElGamal secret | §5.3, §7.1, §8.2, §9.2, §11.3, §16.2.2 | **Yes** |
| **Delegate Account** | **Move / Erase** (Delegated execution) | Submit `ConfidentialMPTSend`, `ConvertBack`, `MergeInbox`, or `Clawback` via XRPL `Delegate` object (`PermissionDelegationV1_1`); requires principal's ElGamal secret for ZKPs | §5.5 | **No** (New **mechanism** for existing powers, unprovisioned in demo) |
| **Auditor** *(Optional)* | **Read** (Whole issuance balances & amounts) | Decrypt `AuditorEncryptedBalance` and `AuditorEncryptedAmount` using Auditor ElGamal secret | §5.3, §6.1, §7.1, §9.2, §16.2.1 | **No** (Inactive; issuance sets no `AuditorEncryptionKey`) |
| **Public / External Observers** | **Read** (Detect zero balances) | Deterministic matching of on-ledger ciphertexts against the canonical encrypted zero for an account's initialized spending balance or reset inbox | §16.1.1 | **No** (Inherent ledger inspection mechanism) |
| **Public / External Observers** | **Read** (Supply totals & conversion amounts) | Read plaintext ledger fields: `OutstandingAmount` (OA), `ConfidentialOutstandingAmount` (COA), `MaximumAmount` (MA), and plaintext `MPTAmount` disclosed on `Convert` and `ConvertBack` | §6.1, §6.6, §8.2, §11.3, §14.3, §16.1.1, §16.1.3 | **Partly** (Conversion boundary plaintext nature is noted in design) |
| **Host / Application Readers** | **Read** (Whole facility book) | Read plaintext `~/.wconf/facility-book.json` directly on disk | Off-ledger application | **Yes** |
| **Host / Network Controller** | **Intercept / Redirect** | Compromise loopback RPC/ledger source to force encryption to an attacker's ElGamal public key (CLAIMS.md F-23) | Off-ledger RPC/network | **Yes** |

---

## THE RULING'S REASONING

The project owner's ruling on **B-27** (accepting the custody risk by name for the Devnet artifact, printing a mandatory disclosure on every run, enforcing `0600` file modes under B-29, and building no key split) is **sound on its own terms**:

1. **Dual Nature of Spending Authority:** Under XLS-0096 §5.5 and §7.1, spending authority is fundamentally dual: it requires an XRPL transaction signature *and* an EC-ElGamal zero-knowledge proof. Splitting the XRPL signing key (via an M-of-N `SignerList` or a regular key with `lsfDisableMaster`) splits only the transaction signature. The ElGamal secret remains an indispensable, un-splittable witness input to every `ConfidentialMPTSend` and `ConfidentialMPTConvertBack` proof (§5.4). Whoever holds the ElGamal secret retains unilateral veto power over every movement and must remain online to generate proofs.
2. **Asymmetry of Issuer vs. Holder Powers:** Hardening the Dedicated Account's key boundaries does nothing to limit the issuer (the bank). Under XLS-0096 §12 and §13, the issuer possesses independent, unilateral authority to freeze the float (`lsfMPTLocked`) and permanently erase/burn it (`ConfidentialMPTClawback`) without the Dedicated Account's seed or consent. The issuer also holds permanent read access over every balance and amount via `IssuerEncryptedBalance` (§5.3, §16.2.2).
3. **Proportionality and Security Honesty:** In a Devnet demonstration holding zero financial value, building multisig signing logic into `signer/` would introduce substantial new code onto the critical signing path while achieving only a partial property (splitting transaction signatures while leaving ElGamal proof generation and issuer overrides concentrated). It would create the illusion of non-custodial custody while violating `CLAIMS.md` P-5.
4. **Honest Acceptance via Mandatory Disclosure:** Accepting the risk by name, enforcing strict at-rest secret file permissions (`0600`, B-29), printing an uncompromising disclosure of all credential holders on every run (`custody.ts`), and documenting the exact checklist required for a production deployment (issuer key custody, prover isolation, delegation checks, immutable issuance flags, and book encryption) directly satisfies the design goals without architectural pretense.

---

## CHECKED AND CORRECT

1. **The Disclosure (`facility/src/custody.ts`):**
   - Correctly states that the Dedicated Account's seed signs movements and derives the ElGamal secret required for drawdown (`Send`, §5.4) and retirement (`ConvertBack`, §5.4) proofs.
   - Correctly cites XLS-0096 §A.6 that the ElGamal secret cannot be rotated and that key loss permanently and irrecoverably locks the balance.
   - Correctly identifies that the issuer can erase the balance via `ConfidentialMPTClawback` (§12.1) and freeze it via lock flags (§9.4.2, §10.4.2, §11.5.2) without the Dedicated Account's seed.
   - Correctly identifies that the issuer's ElGamal secret provides whole-issuance read access (§5.3, §7.1, §9.2) and is non-rotatable (§13.4.2).
   - Correctly includes the application-level plaintext file risk (`facility-book.json`) and ledger-source substitution risk (F-23).

2. **The Decision Request Fixes (`DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md`):**
   - Correctly and accurately incorporates every finding from `REVIEW-046c` (H1–H4, M1–M7, L1–L2) without overstatement or understatement.
   - Accurately withdraws the original recommendation and records *The ruling* verbatim.
   - Accurately details the limitations of XRPL flags (`lsfDisableMaster`, `SignerListSet`, regular keys) against XLS-0096 proof requirements (§5.4, §5.5).

3. **ADR-0002 & Register Rows (`CLAIMS.md` E-117, E-256, E-266, E-290, E-291, E-292, E-293, E-294, B-27, B-28, B-29):**
   - The comparison table in ADR-0002 accurately reflects both sides of the custody axis: ordinary account with issuer overrides vs. pseudo-account with shareholder withdrawal/clawback capabilities (M2).
   - B-29 file mode hardening (`0600`) and profile deletion are verified by automated tests (`facility/tests/secret-file.test.ts`).
   - The custody disclosure is pinned and enforced by lexical and execution unit tests (`facility/tests/custody-disclosure.test.ts`).
