# REVIEW-021a — Gemini leg, round one: step 7's ConvertBack and the E-76 migration

- **Date:** 2026-08-25
- **Tool:** `agy --effort high`, no tools, from a non-repo working directory. The packet was self-contained: XLS-0096 §10.3 verbatim, the vendored C verbatim, and the full diff.
- **Verdict: no defects found on any of the seven questions. Self-scored 10/10.**

> ## ⚠ Read the adjudication before reading this leg's confidence
>
> `REVIEW-021c` records **three real defects this leg passed**, one of which it
> affirmatively reported as correct (Q7, the `rebuild_inner` helper). A clean
> sweep with a 10/10 is a result, but it is **not** corroboration, and this
> project has never before had a leg report nothing on every question.
>
> ⚠ **This leg had no filesystem access and cites file paths with line ranges.**
> Those line numbers are derivable from the diff hunks in the packet and are not
> evidence of having read the files. Treat every citation here as pointing at
> the diff, not at the repository.

---

## Verbatim output

### Verdict

The changes in `aa1f349` and `e685cab` on branch `step7-convert-back-and-e76` are mathematically and architecturally sound. The implementation of `ConfidentialMPTConvertBack` strictly adheres to XLS-0096 §10.3 and §10.4 without inheriting any spurious fields or rules from `ConfidentialMPTConvert`. Proof generation correctly maps the witness $(b, \rho, sk_A)$, binds context including `ConfidentialBalanceVersion`, and applies $\rho$ to the remainder commitment $pc_{rem} = pc_b - m \cdot G$. The removal of `Refusal::NotImplemented` eliminates dead code while preserving ungrantable rejection for unbuilt operations. The placement of `confidential_outstanding` on [`LedgerSnapshot`](file:///signer/src/ledger.rs#L432-L444) avoids ledger-drift false positives during re-reads, and `tools/wconf-randomness.ts` provides a self-verifying, KAT-checked implementation with rigid abort semantics. No defects were found.

---

### Q1. Is the ConvertBack field set right, against §10.3 and nothing else?

**Result: Correct.**

- **Emitted & Permitted Fields:** The field set emitted in [`builder`](file:///signer/src/txn.rs#L451-L475) and allowed in [`ParsedTransaction::permitted_fields`](file:///signer/src/txn.rs#L585-L602) precisely mirrors §10.3:
  - Base fields: `TransactionType` (87), `Account`, `MPTokenIssuanceID`, `Sequence`, `Flags`, `LastLedgerSequence`, `Fee`, `SigningPubKey`, `TxnSignature`.
  - Type-specific fields: `MPTAmount` (UINT64), `HolderEncryptedAmount` (66-byte BLOB), `IssuerEncryptedAmount` (66-byte BLOB), `BlindingFactor` (32-byte UINT256), `BalanceCommitment` (33-byte BLOB), and `ZKProof` (816-byte BLOB).
  - Conditional field: `AuditorEncryptedAmount` (66-byte BLOB) is emitted if and only if `sfAuditorEncryptionKey` is present on the issuance, as required by §10.4.2 item 4.
- **Three Differences from `Convert` Enforced in Both Directions:**
  1. `ZKProof`: Required at 816 bytes for `ConvertBack` (checked in [`parse`](file:///signer/src/txn.rs#L671-L707) and [`prepare_convert_back`](file:///signer/src/prover.rs#L836-L868)); optional at 64 bytes on `Convert` (forbidden without key registration).
  2. `HolderEncryptionKey`: Strictly excluded from `ConvertBack` allowlist (asserted negatively in `parse_refuses_a_convert_back_that_carries_a_holder_encryption_key`); optional on `Convert`.
  3. `BalanceCommitment`: Required on `ConvertBack` (asserted in `a_convert_back_carries_exactly_the_fields_section_10_3_requires`); forbidden on `Convert` (asserted negatively in `a_convert_may_still_not_carry_a_balance_commitment`).
- **§10.4.1 & §10.4.2 Preconditions:**
  - Zero amount rejected (`temBAD_AMOUNT` / §10.4.1 item 5) in `a_zero_amount_convert_back_is_refused`.
  - Missing registered `sfHolderEncryptionKey` rejected (`tecNO_PERMISSION` / §10.4.2 item 3) in [`session.rs`](file:///signer/src/session.rs#L674-L723).
  - Amount exceeding confidential balance rejected before proof generation in [`spendable`](file:///signer/src/session.rs#L731-L768) and [`prepare_convert_back`](file:///signer/src/prover.rs#L810-L824).
  - Amount exceeding global `sfConfidentialOutstandingAmount` rejected (`tecINSUFFICIENT_FUNDS` / §10.4.2 item 5) in [`session.rs`](file:///signer/src/session.rs#L705-L721).

---

### Q2. Is the proof bound to the right statement?

**Result: Correct.**

- **Witness & Arguments:** The witness passed to `mpt_get_convert_back_proof` via `mpt_pedersen_proof_params` is $(b, \rho, sk_A)$, where `params->amount` is the confidential balance $b$ and `params->blinding_factor` is $\rho$. The bare `amount` argument is the public withdrawal amount $m$.
- **Dual Use of $\rho$:** The reuse of $\rho$ across the compact sigma proof (over $pc_b$) and the Bulletproof range proof (over $pc_{rem}$) is mathematically required:
  $$pc_{rem} = pc_b - m \cdot G = (b \cdot G + \rho \cdot H) - m \cdot G = (b - m) \cdot G + \rho \cdot H$$
  Because homomorphic subtraction of the plaintext generator $m \cdot G$ preserves the blinding component $\rho \cdot H$, the remainder $b - m$ is committed under the identical blinding factor $\rho$. [`prepare_convert_back`](file:///signer/src/prover.rs#L810-L868) constructs this witness faithfully.
- **Context Hash Binding & Version Asymmetry:** Unlike `Convert` (which binds only account, issuance, and sequence), `ConvertBack` binds `ConfidentialBalanceVersion` into `convert_back_context_hash` because the proof statement is evaluated over an existing balance state. This asymmetry is carried through [`Session::context_hash`](file:///signer/src/session.rs#L498-L514), and any concurrent update to the balance increments `ConfidentialBalanceVersion`, triggering `REFUSED_LEDGER_MOVED` during pre-sign snapshot re-reads.

---

### Q3. Was removing `Refusal::NotImplemented` right, or did it delete a distinction a client needs?

**Result: Correct.**

- **Rationale:** `Refusal::NotImplemented` had a single producer (`ConvertBack`). When `ConvertBack` was built, the variant became unreachable throughout the crate.
- **Honesty of `REFUSED_MALFORMED`:** An unbuilt transaction type (such as `ConfidentialMPTMergeInbox` or `ConfidentialMPTClawback`) cannot be parsed by [`TxType::from_wire_code`](file:///signer/src/txn.rs#L568) or granted during pairing. Emitting `REFUSED_MALFORMED` ("unknown operation") at the protocol boundary is the honest error response for a request containing an invalid/unsupported operation string.
- Retaining `Refusal::NotImplemented` without any live producer would create an untestable refusal code in violation of the design rule that clients must not carry handlers for errors the signer never emits.

---

### Q4. Is `confidential_outstanding` in the right place, and is the check load-bearing?

**Result: Correct.**

- **Placement on [`LedgerSnapshot`](file:///signer/src/ledger.rs#L432-L444) vs [`IssuanceState`](file:///signer/src/ledger.rs#L853-L862):** `IssuanceState` is compared in its entirety in `binding_differs`. Because `sfConfidentialOutstandingAmount` is a global aggregate that shifts whenever *any* account on the ledger converts, placing it on `IssuanceState` would cause normal third-party network activity to trigger spurious `REFUSED_LEDGER_MOVED` errors during the signer's pre-signature verification. Placing it directly on `LedgerSnapshot` makes it available for preflight checks without poisoning the binding comparison.
- **String Parsing via [`u64_amount_field`](file:///signer/src/ledger.rs#L562-L584):** `rippled` encodes `UINT64` amounts as JSON strings (or omits them under `SoeDefault`). [`u64_amount_field`](file:///signer/src/ledger.rs#L562-L584) correctly handles `Value::String(s)`, `Value::Number(n)`, and returns `Ok(0)` when absent.
- **Test Control Integrity:** `the_confidential_outstanding_check_is_not_reading_every_value_as_zero` in [`tests/convert_back.rs`](file:///signer/tests/convert_back.rs#L348-L362) pairs with `a_convert_back_above_the_issuance_confidential_outstanding_is_refused`. Because [`FakeLedger`](file:///signer/tests/support/mod.rs#L220-L228) serializes `ConfidentialOutstandingAmount` as a string (`"6"`), the passing test guarantees that `u64_amount_field` successfully parsed the non-zero value rather than defaulting to 0.

---

### Q5. Is `tools/wconf-randomness.ts` a faithful third implementation?

**Result: Correct.**

- **Construction Integrity:** The implementation matches REVIEW-010 Deliverable B byte-for-byte:
  - $\text{PRK} = \text{HMAC-SHA512}(\text{SALT}, \text{IKM})$ over tagged, length-prefixed inputs (`LABEL`, `txType`, `account_id`, `mpt_issuance_id`, `TransactionContextID`, `entropy64`).
  - $\text{OKM} = \text{HMAC-SHA512}(\text{PRK}, \text{EXPAND} \parallel \text{len}(txType) \parallel txType \parallel \text{len}(role) \parallel role \parallel \text{0x01})$.
  - Wide modular reduction: $\text{BigInt}(\text{OKM}) \pmod N$.
- **Abort Semantics:** [`reduce`](file:///tools/wconf-randomness.ts#L112-L121) throws immediately if the reduced scalar is zero, and `deriveRandomness` draws fresh entropy via `randomBytes(64)` per call. Entropy failure or a zero scalar unconditionally aborts and never degrades or synthesizes deterministic nonces.
- **Self-Check Enforcement:** [`selfCheck()`](file:///tools/wconf-randomness.ts#L155-L208) executes automatically via `ensureChecked()` before any derivation, asserting all 9 KAT vectors and verifying that the zero-scalar abort path fires.

---

### Q6. Are the four exemptions from the migration correct?

**Result: Correct.**

All four exemptions are justified and documented:
1. `tools/spike-randomness-2026-08-18/reuse-r-setup.ts`: Explicitly tests the E-63 cross-transaction $r$-reuse attack; deriving unique randomness would invalidate the attack harness.
2. `tools/spike-2026-08-17/adj-c1-shared-blinding.ts`: Deliberately supplies an `alt` scalar to verify rejection of mismatched $C_1$ values.
3. `tools/spike-2026-08-17/adj-c1-verify.ts`: Same as above; tests verification failure on mismatched $C_1$.
4. `tools/spike-2026-08-17/wasm-test.ts`: Specifically tests the WASM FFI export `_mpt_generate_blinding_factor`.

The migration of the remaining 8 transaction-generating harnesses (`adj-e22-controlled.ts`, `adj-fee-ladder-nonzero.ts`, `adj-metadata-and-fee.ts`, `auditor-n4.ts`, `convert.ts`, `gap8-reachability.ts`, `post-vault-send.ts`, `send.ts`, along with `f23-substituted-key.ts`) is exhaustive.

---

### Q7. Free Hunt

**Result: Correct.**

- **[`spendable()`](file:///signer/src/session.rs#L731-L768) Factoring:** The extracted balance checking function in [`session.rs`](file:///signer/src/session.rs#L731-L768) preserves the exact branch structure and error types of the original `Send` preflight while extending coverage to `ConvertBack`.
- **[`proof_len`](file:///signer/src/txn.rs#L671-L707) Match Structure:** The 6-arm match on `(tx_type, d.get(ZK_PROOF), d.get(HOLDER_ENCRYPTION_KEY))` exhaustively partitions all valid and invalid states for `Send`, `Convert`, and `ConvertBack` without catch-all wildcards that could mask illegal combinations.
- **[`rebuild_inner`](file:///signer/tests/convert_back.rs#L445-L485) Helper:** Correctly preserves all field types and values while dropping or injecting specified fields, ensuring negative test assertions in [`tests/convert_back.rs`](file:///signer/tests/convert_back.rs) test genuine parser rejection rather than serialization corruption.

---

### Confidence Score

**10 / 10**
