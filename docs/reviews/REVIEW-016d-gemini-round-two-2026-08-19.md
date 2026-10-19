Here is the Round Two review of the fixes.

---

### 1. Findings (Ranked by Severity)

#### [MEDIUM] Defect: Cluster desync / torn ledger reads are misclassified as permanent non-retryable misconfigurations (`REFUSED_LEDGER_NOT_USABLE`)

- **Severity:** Medium
- **What is wrong:** `LedgerReader::came_from` returns `LedgerError::Malformed` when an RPC response comes from a ledger index different from the pinned index or fails `validated: true`. In `session.rs::refusal_for`, all `LedgerError::Malformed` errors are mapped to `Refusal::LedgerNotUsable` (`REFUSED_LEDGER_NOT_USABLE`), whose user-facing text states: *"**Not retryable** — an operator must change something"*.
- **Concrete failure:**
  - **Inputs:** The signer connects to Devnet via a clustered endpoint (`DEFAULT_ENDPOINT`). `server_info` pins ledger index `4600000`. The next call (`account_info` or `ledger_entry`) hits a cluster host that is one ledger behind and answers from `4599999` (the exact scenario recorded in `CLAIMS.md` E-103).
  - **Wrong behavior:** `came_from` detects the mismatched index and returns `LedgerError::Malformed`. `refusal_for` converts this to `REFUSED_LEDGER_NOT_USABLE`. The client is told that the endpoint is permanently misconfigured and cannot be retried. In reality, this is a transient cluster race across backend nodes that would resolve on an immediate retry to another cluster node.
- **Support & Recommendation:** `signer/README.md` explicitly promises:
  > *"REFUSED_LEDGER_UNAVAILABLE — the XRPL, unreachable or behind. Retryable, and a public endpoint is a cluster so the next call may reach a different host."*
  
  `came_from` mismatches are transient ledger-state synchronization faults, not malformed payloads or wrong-network misconfigurations. Introduce a specific `LedgerError` variant (e.g., `LedgerError::IndexMismatch` or `LedgerError::NotValidated`) and map it in `refusal_for` to `Refusal::LedgerUnavailable`.

---

#### [LOW] Overstatement: `ARCHITECTURE-2026-08-18.md` claims "nothing branches on them yet" after branching was added

- **Severity:** Low (Documentation / Architecture overclaim)
- **What is wrong:** Architecture §6 Step 2 still includes the sentence:
  > *"Issue #11 requires detecting `lsfDisableMaster`, a regular key or a signer list, and that is a ledger read. `AccountSecurity` reads all three today. **Step 6 is not built and nothing branches on them yet**; saying otherwise would claim work that does not exist."*
- **Concrete failure:** `session.rs` (preflight) now explicitly branches on `snapshot.security.disable_master` to return `REFUSED_MASTER_KEY_DISABLED`, and `LedgerSnapshot::binding_differs` branches on `self.security.disable_master != other.security.disable_master` to return `REFUSED_LEDGER_MOVED`. 
- **Support & Recommendation:** While `regular_key` and `signer_lists` remain unbranched (reserved for Step 6 keygen onboarding), `disable_master` **is** actively branched on. Update the architecture note to state that `disable_master` is enforced at preflight and recheck, while regular key and signer lists do not branch yet.

---

#### [LOW] Test Gap: `mptoken_is_the_one_asked_for` issuance ID mismatch is untested

- **Severity:** Low (Test coverage gap)
- **What is wrong:** `LedgerReader::mptoken_is_the_one_asked_for` checks two distinct fields: `node.Account == account` and `node.MPTokenIssuanceID.eq_ignore_ascii_case(issuance_id)`. `tests/ledger_read.rs::an_mptoken_for_the_wrong_account_or_type_is_refused` tests account mismatch (`mptoken_says_account`) and node type mismatch (`mptoken_says_type`), but does not test `MPTokenIssuanceID` mismatch.
- **Concrete failure:** If the `MPTokenIssuanceID` check in `mptoken_is_the_one_asked_for` is removed or corrupted, all 165 tests in the suite still pass.
- **Support & Recommendation:** Add `mptoken_says_issuance: Option<String>` to `FakeLedger` in `support/mod.rs` and assert in `tests/ledger_read.rs` that an `MPToken` returned with a different issuance ID is rejected as malformed.

---

#### [INFORMATIONAL] Imprecise Assertion: `an_mptoken_for_the_wrong_account_or_type_is_refused`

- **Severity:** Informational
- **What is wrong:** In `an_mptoken_for_the_wrong_account_or_type_is_refused`:
  ```rust
  f.ledger.lock().unwrap().mptoken_says_type = Some("MPTokenIssuance".into());
  let err = f.session.refresh().expect_err("the wrong object type was accepted");
  assert!(format!("{err}").contains("MPToken"), "{err}");
  ```
  The error string produced by `ledger_entry` is `"ledger_entry was asked for a MPToken and returned a `MPTokenIssuance`"`. 
- **Why it matters:** `"MPToken"` is a substring of both the expected type (`MPToken`) and the rejected type (`MPTokenIssuance`). 
- **Recommendation:** Assert `.contains("MPTokenIssuance")` or `.contains("was asked for a MPToken and returned")` to ensure the assertion specifically validates the type mismatch message.

---

### 2. Answers to Explicit Questions

#### 1. Did any of these fixes introduce a defect?
**Yes (Medium severity).** Mapping `LedgerError::Malformed` unconditionally to `Refusal::LedgerNotUsable` causes transient cluster ledger-skew errors detected by `came_from` (where one node in the cluster answers from a different ledger sequence than the pinned index) to be classified as permanent operator misconfigurations with *"Not retryable"*, rather than retryable network conditions (`REFUSED_LEDGER_UNAVAILABLE`).

#### 2. Does any new test pass for the wrong reason, or would it pass against a broken implementation?
- All new tests properly fail when their corresponding core fixes are reverted (the regression checks hold).
- However, there is **one untested branch**: `mptoken_is_the_one_asked_for` checking `MPTokenIssuanceID` has no test fixture driving an issuance ID mismatch (only account and object type mismatches are tested).
- `an_mptoken_for_the_wrong_account_or_type_is_refused` uses a slightly loose assertion (`.contains("MPToken")`) that matches both the expected and received type names.

#### 3. Which sentences in the new comments, README prose or register rows say more than the fixes establish?
1. **`docs/architecture/ARCHITECTURE-2026-08-18.md` (§6 Step 2):** Claims *"Step 6 is not built and nothing branches on them yet"*, but the fix added explicit branching on `AccountSecurity.disable_master` in `session.rs` preflight (`REFUSED_MASTER_KEY_DISABLED`) and `LedgerSnapshot::binding_differs` (`REFUSED_LEDGER_MOVED`).
2. **`signer/README.md` (Refusal codes):** Claims `REFUSED_LEDGER_UNAVAILABLE` is returned when a cluster endpoint hits a node that is behind, but `refusal_for` actually returns `REFUSED_LEDGER_NOT_USABLE` whenever `came_from` catches a lagging node answering from a different ledger.

#### 4. Are the two rejections above correct?
- **Rejection 1 (`RawProfile` unknown fields attribute): CORRECT.** `#[serde(deny_unknown_fields)]` is present above `RawProfile`. The new test `a_profile_carrying_an_unknown_field_is_refused` pins and confirms that extra fields fail deserialization.
- **Rejection 2 (Narrowing `binding_differs` from full `AccountSecurity` to `disable_master`): CORRECT.** In rippled (`Transactor.cpp:1039-1045`), a master-key signature (`idAccount == idSigner`) is accepted with `tesSUCCESS` when regular keys or signer lists are present, as long as `lsfDisableMaster` is not set. Refusing on regular key or signer list changes mid-confirmation would reject transactions that the ledger accepts. `a_regular_key_or_signer_list_arriving_mid_confirmation_does_not_refuse` correctly pins this behavior.
