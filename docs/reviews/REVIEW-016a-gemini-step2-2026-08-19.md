# REVIEW-016: Architecture §6 Step 2 (Ledger Read Path)

---

## Executive Verdict

Architecture §6 Step 2 successfully eliminates the local storage and manual entry of ledger state from `HolderProfile`, replacing all nine fields with snapshot reads pinned to a single numeric ledger index. The cryptographic reasoning behind **F-23** is **sound and fully substantiated** by XRPL consensus and rippled transactor mechanics.

However, the review identified **two structural gaps in staleness detection**, **one direct contradiction between prose and code regarding profile validation**, and **several instances of overclaiming** in the comments and architecture documentation.

---

## 1. Challenge 1: Soundness of F-23 (The Confidentiality Break Chain)

**Verdict:** **The chain is SOUND.** Every link in the chain holds based on rippled source mechanics and XRPL ledger protocol rules.

### Detailed Link Analysis:

1. **Send encrypts to destination `HolderEncryptionKey` read from ledger:**
   * *Status:* **Sound.** In `signer/src/session.rs`, `wire_fields` encrypts the amount to `destination_pk`, which was fetched via `reader.holder_encryption_key(...)`.
2. **rippled verifies against the key on ledger (`ConfidentialMPTSend.cpp:132`):**
   * *Status:* **Sound.** rippled loads `sleDestinationMPToken` and binds verification of `sfZKProof` to `sfHolderEncryptionKey`.
3. **Key mismatch returns `tecBAD_PROOF` (`ConfidentialTransfer.cpp:451`):**
   * *Status:* **Sound.** Because the proof was constructed with the adversary's substituted public key $PK_{\text{adv}}$ while rippled verifies with $PK_{\text{dest}}$, the proof fails verification and rippled returns `tecBAD_PROOF`.
4. **`tecBAD_PROOF = 199` is a `tec` (`TER.h:371`):**
   * *Status:* **Sound.** 199 is within the `tec` range (100–199).
5. **A `tec` is applied to the ledger unless `tapFailHard` is set (`Transactor.cpp:1653–1656` / `applySteps.h:40`):**
   * *Status:* **Sound.** In XRPL consensus, transactions resulting in `tec` codes are included in validated ledgers to claim transaction fees and consume `Sequence`. The submitter can pass `tapFailHard` to fail locally prior to broadcast, but the signer only returns a raw signed blob and has zero control over submitter execution flags.
6. **The ciphertext under the adversary's key is permanently published:**
   * *Status:* **Sound.** The transaction body, containing `sfDestinationEncryptedAmount` (which is $Enc_{PK_{\text{adv}}}(\text{amount})$), is written to the ledger transaction stream.
7. **Adversary decrypts the amount:**
   * *Status:* **Sound.** The adversary holding $SK_{\text{adv}}$ decrypts `sfDestinationEncryptedAmount` from the public transaction data.

### Boundaries of the Claim:
* **What is leaked:** The *intended transfer amount* to the destination.
* **What is NOT leaked:** The sender's remaining balance is not exposed (its commitment/ciphertext remains under sender/issuer keys), and no funds are transferred on-ledger because the transaction failed.
* **Caveat:** The project documentation correctly notes this finding is **read at source, not executed on Devnet**, complying with the rule to state *"the source says"* rather than *"we saw"*.

---

## 2. Challenge 2: Staleness and `binding_differs`

**Verdict:** **`binding_differs` and `recheck` have TWO CRITICAL GAPS.**

### Gap 2.1: `binding_differs` completely omits `AccountSecurity`
In `signer/src/ledger.rs`, `LedgerSnapshot` defines:
```rust
pub struct AccountSecurity {
    pub disable_master: bool,
    pub regular_key: Option<String>,
    pub signer_lists: usize,
}
```
However, in `LedgerSnapshot::binding_differs`:
```rust
pub fn binding_differs(&self, other: &LedgerSnapshot) -> Option<String> {
    if self.sequence != other.sequence { ... }
    if self.mptoken.balance_version != other.mptoken.balance_version { ... }
    if self.mptoken.holder_encryption_key != other.mptoken.holder_encryption_key { ... }
    if self.mptoken.balance_ciphertext != other.mptoken.balance_ciphertext { ... }
    if self.issuance != other.issuance { ... }
    None
}
```
* **The Defect:** `self.security != other.security` is **never checked**.
* **Impact:** If `lsfDisableMaster` is set, a `RegularKey` is assigned/changed, or a `SignerList` is added while the human is confirming, `binding_differs` returns `None`. The signer signs with a master seed whose spending authority was just disabled or altered on-ledger.
* **Test Blindspot:** In `signer/tests/ledger_read.rs`, the test `each_binding_field_is_compared` checks `Sequence`, `ConfidentialBalanceVersion`, `HolderEncryptionKey`, `ConfidentialBalanceSpending`, `IssuerEncryptionKey`, and `AuditorEncryptionKey`, but omits `security`, creating a false sense of completeness.

### Gap 2.2: `recheck` does not detect transaction expiration (`LastLedgerSequence`)
* **The Defect:** When a transaction is built during `prepare`, its `LastLedgerSequence` is set to `snapshot.ledger_index + LAST_LEDGER_SEQUENCE_WINDOW` (+20 ledgers, ~60–80s). If a human holds the confirmation prompt open for 3 minutes (e.g., 40 ledgers), `self.refresh()` pulls `after.ledger_index = before.ledger_index + 40`.
* **Impact:** Because `binding_differs` explicitly ignores ledger index progression (and tests enforce that it ignores index advances), and `recheck` fails to check whether `after.ledger_index > ctx.last_ledger_sequence`, `recheck` returns `Ok(())`. The signer proceeds to sign an **already-expired transaction** that rippled will reject with `tefMAX_LEDGER`.
* **Prose Overclaim:** The claim in `E-102` that *"staleness is now detected, not merely bounded... the window is the confirmation itself, which a human can hold open for minutes"* is false for the transaction's validity lifetime.

### Evaluation of the Destination Key Re-read:
* Comparing $PK_{\text{dest}}(B)$ (read at ledger $B$) against $PK_{\text{dest}}(A)$ (used to build the proof at ledger $A$) is the **correct check for ledger drift** during human confirmation.
* However, as acknowledged in **B-15**, this check only detects *drift between $A$ and $B$*. If the node lied at index $A$ and continues to return the same adversary key at index $B$, $PK_{\text{dest}}(B) == PK_{\text{dest}}(A)$ will pass.

---

## 3. Challenge 3: Profile Refusal List & Config Ingestion

**Verdict:** **The 9 refused fields are complete, BUT `RawProfile` lacks `deny_unknown_fields`, creating a direct contradiction with documentation.**

### 3.1 Completeness of Refused Fields
All 9 fields removed from `RawProfile` are accounted for in `MOVED_TO_THE_LEDGER`:
1. `balance`
2. `balance_ciphertext`
3. `balance_version`
4. `holder_key_registered`
5. `issuer_encryption_key`
6. `auditor_encryption_key`
7. `sequence`
8. `last_ledger_sequence`
9. `destination_keys`

The remaining fields in `RawProfile` (`account_seed`, `elgamal_sk`, `elgamal_pk`, `issuance_id`, `network_id`, `fee_drops`, `ledger_endpoint`, `amount_search_to`) represent secrets, static position identifiers, or local operator policy. No ledger state remains in the profile.

### 3.2 Code Defect: Missing `#[serde(deny_unknown_fields)]`
* In `signer/src/holder.rs`, the module doc claims:
  > *"deny_unknown_fields below means an old profile fails loudly rather than having its stale ledger fields quietly ignored."*
* And in `HolderProfile::from_json`:
  > *"// Named before serde's generic "unknown field" so the operator is told the value moved to the ledger..."*
* **The Reality:** `RawProfile` (line 96 of `holder.rs`) **does NOT have `#[serde(deny_unknown_fields)]`**.
* **Impact:** If an operator specifies an unknown or misspelled field (e.g., `"ledger_url"` instead of `"ledger_endpoint"`, `"destination_key"` singular, or `"fee"` instead of `"fee_drops"`), serde silently ignores it and applies default fallback values without warning.

---

## 4. Challenge 4: Overclaiming and Prose Contradictions

| Location | Text in Diff | Issue / Overclaim |
|---|---|---|
| `signer/src/holder.rs:24–27` | `deny_unknown_fields below means an old profile fails loudly rather than having its stale ledger fields quietly ignored.` | **False.** `#[serde(deny_unknown_fields)]` is missing from `RawProfile`. |
| `signer/src/ledger.rs:58–63` / `E-102` | `Staleness is not bounded, it is detected.` | **Overstated.** It does not detect transaction expiration if the confirmation window exceeds `LAST_LEDGER_SEQUENCE_WINDOW`, nor does it detect changes to `AccountSecurity`. |
| `signer/src/lib.rs:22–24` | `Instance eight is struck below on 2026-08-19... in a file that gained pub mod ledger.` | **Meta-drift.** This continues the project's tracked history of prose invalidation, but adds new claims that are themselves partially inaccurate regarding `deny_unknown_fields`. |
| `ARCHITECTURE-2026-08-18.md` §6 Step 2 | `refuses any of the nine by name rather than ignoring it` | **Incomplete.** Refuses only those exact nine; any variation or other unrecognized field is silently ignored due to missing serde attribute. |

---

## 5. Summary of Required Remediations

1. **Add `AccountSecurity` to `binding_differs`:**
   Include checks for `self.security != other.security` so that modifications to `lsfDisableMaster`, `RegularKey`, or `SignerList` during confirmation refuse signing.
2. **Enforce `LastLedgerSequence` check in `recheck`:**
   Verify in `recheck` that `after.ledger_index < built_transaction.last_ledger_sequence()`, returning `Refusal::LedgerMoved` if the human confirmation window exceeded transaction expiration.
3. **Add `#[serde(deny_unknown_fields)]` to `RawProfile`:**
   Ensure `RawProfile` rejects any unrecognized JSON key, matching the behavior claimed in `holder.rs`.
4. **Update `each_binding_field_is_compared` test:**
   Add test assertions covering mutations to `AccountSecurity` and transaction expiration.
