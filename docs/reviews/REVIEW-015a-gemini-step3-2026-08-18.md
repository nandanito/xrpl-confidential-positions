<!-- VERBATIM OUTPUT. Not edited. -->

# REVIEW-015a — leg A, architecture §6 step 3

**Date:** 2026-08-18. **Leg:** Gemini, via `agy --effort high`, given the diff only and no repository access.
**Target:** the committed diff of `16e2e58`, wiring the vendored prover into the
signer.

**This file is the leg's raw output and is not edited.** Dispositions —
including which findings were refuted and why — are in
`REVIEW-015c-adjudication-step3-2026-08-18.md`. Read the adjudication before
acting on anything here: **two findings in this round were wrong**, and one of
them proposed a field code that would have produced a valid-looking transaction
meaning something else.

---

# Adversarial Review: Architecture §6 Step 3 (W-CONF Holder Signer Diff)

This review evaluates the implementation diff against the rules, attack model, cryptographic invariants, and prose claims defined for W-CONF on XRPL Devnet.

---

## Summary of Findings

| ID | Severity | File & Location | Summary |
|---|---|---|---|
| **F-01** | **CRITICAL** | `signer/src/txn.rs:299-317`, `signer/src/session.rs:360-372`, `signer/src/xrpl.rs:438-460` | `AuditorEncryptedAmount` is dropped during transaction serialization when an auditor is present; proof commits to 4 participants but wire transaction emits only 3, producing an unvalidatable transaction. |
| **F-02** | **CRITICAL** | `signer/src/xrpl.rs:154-162` | `b58_encode` strips payload digits matching `'r'`, corrupting base58check-encoded addresses and seeds whenever a high-order digit is zero. |
| **F-03** | **HIGH** | `signer/src/txn.rs:441-518` | `ParsedTransaction::parse` silently ignores unrecognised transaction fields, directly violating its stated security contract ("an unshown field is an unconfirmed field"). |
| **F-04** | **HIGH** | `signer/src/session.rs:373-398` | `wire_fields` fails to validate `issuance_id` on `Convert` transactions, allowing amounts to be encrypted under the profile's configured issuer key while targeting a foreign issuance. |
| **F-05** | **HIGH** | `signer/src/main.rs:146-154` | Corrupted or short `k_local.bin` exits immediately via `?` instead of routing to the A6 fault-acknowledgement workflow. |
| **F-06** | **MEDIUM** | `signer/src/holder.rs:94-98`, `signer/src/txn.rs:528-537` | Hardcoded default `amount_search_to = 100_000` causes legitimate transactions above 100,000 units to fail amount recovery, triggering false alarm warnings on the confirmation screen. |
| **F-07** | **MEDIUM** | `signer/src/xrpl.rs:498-502` | `drops()` unconditionally sets bit 62, producing non-canonical encoding for 0-drop amounts. |
| **F-08** | **LOW** | `signer/src/build.rs:145-160` | Missing `cargo:rerun-if-env-changed=WCONF_OPENSSL` directive causes stale OpenSSL build configuration. |
| **F-09** | **LOW** | `signer/src/session.rs:201-209` | Error message on store commit failure claims a signed blob exists when the blob was already dropped. |

---

## Detailed Findings

### [CRITICAL] F-01: `AuditorEncryptedAmount` dropped during wire serialization breaks 4-participant proofs
* **Location:** [`signer/src/txn.rs:299-317`](file:///signer/src/txn.rs#L299-L317), [`signer/src/session.rs:360-372`](file:///signer/src/session.rs#L360-L372), [`signer/src/xrpl.rs:438-460`](file:///signer/src/xrpl.rs#L438-L460)

#### Description
[`HolderProfile`](file:///signer/src/holder.rs#L104) and [`SendInputs`](file:///signer/src/prover.rs#L487) support `auditor_encryption_key: Option<[u8; 33]>`. When present, [`prover::prepare_send`](file:///signer/src/prover.rs#L529) generates a 4-participant ZK proof committing to `[sender, destination, issuer, auditor]` ciphertexts. 

However, [`WireFields::Send`](file:///signer/src/txn.rs#L299-L308) does not hold `auditor_ciphertext`, [`session::wire_fields`](file:///signer/src/session.rs#L365-L372) discards `m.auditor_ciphertext`, and [`xrpl.rs`](file:///signer/src/xrpl.rs#L438-L460) has no field definition for `AuditorEncryptedAmount`. As a result, the transaction is serialized with only 3 ciphertext fields (`SenderEncryptedAmount`, `DestinationEncryptedAmount`, `IssuerEncryptedAmount`).

#### Failure Scenario
1. An issuance configured on Devnet with an `AuditorEncryptionKey` is loaded into `HolderProfile`.
2. A Send intent is submitted. The prover generates a 946-byte proof across 4 participants.
3. The signer serializes the transaction without the auditor's ciphertext and signs it.
4. The transaction is submitted to Devnet (`rippled`). The node's verifier attempts to verify the 4-participant proof against only 3 participant ciphertexts (or fails due to missing `AuditorEncryptedAmount`), returning `temMALFORMED` or `tecCRYPTOCONDITION_ERROR`.

#### Suggested Fix
1. Add `AUDITOR_ENCRYPTED_AMOUNT` (`FieldDef { name: "AuditorEncryptedAmount", kind: Kind::Blob, nth: 42, signing: true }`) to [`signer/src/xrpl.rs`](file:///signer/src/xrpl.rs).
2. Add `auditor_encrypted_amount: Option<[u8; 66]>` to [`WireFields::Send`](file:///signer/src/txn.rs).
3. Include `auditor_encrypted_amount` in [`txn::builder`](file:///signer/src/txn.rs) and update [`ParsedTransaction::parse`](file:///signer/src/txn.rs) to verify shared $C_1$ across all 4 ciphertexts when present.

---

### [CRITICAL] F-02: `b58_encode` strips payload digits matching `'r'`, corrupting address & seed encoding
* **Location:** [`signer/src/xrpl.rs:154-162`](file:///signer/src/xrpl.rs#L154-L162)

#### Description
In [`b58_encode`](file:///signer/src/xrpl.rs#L132), after prepending `leading` count of `'r'` characters (`ALPHABET[0]`), the implementation contains the following cleanup logic:

```rust
    // A leading zero byte already contributed a digit above; strip the extra.
    if leading > 0 && out.len() > leading {
        let extra = out.chars().skip(leading).take_while(|c| *c == ALPHABET[0] as char).count();
        if extra > 0 {
            out = out[..leading].to_string() + &out[leading + extra..];
        }
    }
```

This logic incorrectly assumes that any `'r'` digit occurring immediately after the prefix count is an artifact rather than a valid base-58 digit of the payload. Whenever the numerical base-58 conversion of the payload produces a leading zero remainder (`*d == 0`), this loop deletes that digit from the resulting string, altering the value and failing checksum round-trips.

#### Failure Scenario
1. An account ID or family seed whose base-58 payload conversion produces `ALPHABET[0]` at digit offset `leading` is passed to `base58check_encode`.
2. `b58_encode` strips the `'r'`.
3. The resulting string is invalid base58check; subsequent decoding fails with `XrplError::Checksum` or decodes to the wrong account ID.

#### Suggested Fix
Remove the `extra` stripping block entirely. Standard base-58 conversion from byte array to digits should not inspect or trim digits from `out` after prepending the exact number of leading zero bytes from the input.

---

### [HIGH] F-03: `ParsedTransaction::parse` ignores unrecognised fields, violating confirmation invariant
* **Location:** [`signer/src/txn.rs:441-518`](file:///signer/src/txn.rs#L441-L518)

#### Description
Rule 1 and the doc-comment on [`ParsedTransaction::parse`](file:///signer/src/txn.rs#L441-L445) state:
> *"Refuses a transaction carrying a field this signer does not itself emit, rather than ignoring it: an unshown field is an unconfirmed field."*

In the diff, [`ParsedTransaction::parse`](file:///signer/src/txn.rs#L446) calls [`xrpl::decode(bytes)`](file:///signer/src/xrpl.rs) and queries only specific expected field IDs (`TRANSACTION_TYPE`, `ACCOUNT`, `DESTINATION`, `MPT_ISSUANCE_ID`, etc.). It never inspects the total number of decoded fields or verifies that every decoded field is in the allowlist.

#### Failure Scenario
1. If a defect in `txn::builder` or an external input introduces extra fields (e.g. `Memos`, unauthorized `Flags`, or secondary destinations) into the transaction bytes, `ParsedTransaction::parse` succeeds without error.
2. [`confirm::render`](file:///signer/src/confirm.rs#L34) renders only the expected subset of fields.
3. The holder confirms the transaction without having seen the unrendered fields that will be signed into the transaction payload.

#### Suggested Fix
Track all fields present in the decoded STObject and assert that no field IDs exist outside the set explicitly processed and rendered by [`ParsedTransaction`](file:///signer/src/txn.rs).

---

### [HIGH] F-04: `wire_fields` omits `issuance_id` validation on `Convert`
* **Location:** [`signer/src/session.rs:373-398`](file:///signer/src/session.rs#L373-L398)

#### Description
In [`Session::wire_fields`](file:///signer/src/session.rs#L326), `TxType::Send` explicitly verifies that the requested issuance matches the holder's loaded profile:
```rust
if built.issuance_bytes() != &self.holder.issuance_id {
    return Err(Refusal::Malformed { reason: "this signer holds no position in that issuance".into() });
}
```
However, `TxType::Convert` contains no such check. It takes `built.amount()` and encrypts it under `self.holder.issuer_encryption_key` regardless of what `built.issuance_bytes()` contains.

#### Failure Scenario
1. A client submits a `Convert` intent referencing an `issuance_id` belonging to a different MPT asset on Devnet.
2. The signer computes `convert_context_hash` using the requested foreign `issuance_id`, but encrypts the amount to the local profile's `issuer_encryption_key`.
3. The transaction is built and confirmed. The issuer of the foreign asset receives an encrypted amount ciphertext encrypted to an unrelated key, preventing the legitimate issuer from decrypting the deposit.

#### Suggested Fix
Add the same issuance check at the top of `TxType::Convert` in [`Session::wire_fields`](file:///signer/src/session.rs):
```rust
if built.issuance_bytes() != &self.holder.issuance_id {
    return Err(Refusal::Malformed {
        reason: "this signer holds no position in that issuance".into(),
    });
}
```

---

### [HIGH] F-05: Corrupt `k_local.bin` exits process instead of entering A6 acknowledgement workflow
* **Location:** [`signer/src/main.rs:146-154`](file:///signer/src/main.rs#L146-L154)

#### Description
Amendment A6 states that any randomness ledger fault or corruption routes to an explicit human acknowledgement (`confirm::acknowledge_store_fault`) to write a gap record to the audit log and start a fresh generation.

In [`open_or_acknowledge`](file:///signer/src/main.rs#L146):
```rust
    let key = if key_path.exists() {
        let b = std::fs::read(&key_path).ok()?;
        LocalKey::from_bytes(b.try_into().ok()?)
    } else { ... };
```
If `k_local.bin` exists but has been truncated or corrupted (e.g. length $\ne 32$), `b.try_into().ok()?` returns `None`. This causes `open_or_acknowledge` to return `None` immediately, bypassing [`Store::open`](file:///signer/src/store.rs) and the `acknowledge_store_fault` branch, terminating the daemon with `exit(2)`.

#### Failure Scenario
1. `k_local.bin` is partially corrupted or zeroed on disk due to a crash.
2. The daemon is started. Rather than prompting the operator to acknowledge the ledger fault and recreate the store under A6, the process crashes out immediately with no recovery path.

#### Suggested Fix
Handle read/parse errors for `k_local.bin` as a [`StoreFault::Corrupt`](file:///signer/src/store.rs) condition, prompting the operator for acknowledgement and generating a fresh key/ledger.

---

### [MEDIUM] F-06: `amount_search_to` default (100,000) causes unreadable confirmation on larger amounts
* **Location:** [`signer/src/holder.rs:94-98`](file:///signer/src/holder.rs#L94-L98), [`signer/src/txn.rs:528-537`](file:///signer/src/txn.rs#L528-L537)

#### Description
In [`RawProfile`](file:///signer/src/holder.rs#L94), `amount_search_to` defaults to `100_000`. [`ParsedTransaction::recover_amount`](file:///signer/src/txn.rs#L528) performs discrete log decryption over `[0, search_to]`. If the transaction amount exceeds 100,000, `recover_amount` fails and sets [`AmountView::NotRecovered`](file:///signer/src/txn.rs#L408).

[`confirm::render`](file:///signer/src/confirm.rs#L72) displays:
```text
*** COULD NOT BE READ *** — no value in 0..=100000 decrypts this transaction's ciphertext. DO NOT CONFIRM unless you know why.
```
While the prover correctly constructed the transaction for the requested amount, the confirmation screen treats it as an unrecoverable ciphertext and actively warns the user not to sign.

#### Failure Scenario
1. Holder sets up a profile with default `amount_search_to`.
2. A legitimate Send for 250,000 units is initiated.
3. The confirmation screen displays `*** COULD NOT BE READ ***` and instructs the user not to sign, preventing valid transactions above 100,000 units from being confirmed.

#### Suggested Fix
Either:
- Set a higher default or ensure the search range accommodates `built.amount()` when bounded by `holder.balance`, or
- Document in `holder.rs` and the confirmation instructions that `amount_search_to` must be configured equal to or greater than the holder's balance.

---

### [MEDIUM] F-07: `drops()` bitwise OR produces non-canonical encoding for 0 drops
* **Location:** [`signer/src/xrpl.rs:498-502`](file:///signer/src/xrpl.rs#L498-L502)

#### Description
In [`TxBuilder::drops`](file:///signer/src/xrpl.rs#L498):
```rust
pub fn drops(mut self, def: FieldDef, v: u64) -> Self {
    self.fields.push(Field { def, value: (v | 0x4000_0000_0000_0000).to_be_bytes().to_vec() });
    self
}
```
In XRPL binary format, bit 62 is the "is positive" bit. For non-zero XRP drop values, bit 62 is set (`0x40...`). However, for an amount of `0` drops (e.g. zero fee in special transactions or zero-value checks), XRPL canonical binary serialization requires `0x0000_0000_0000_0000` (all 64 bits zero). Setting bit 62 on a zero value creates an invalid/non-canonical amount encoding.

#### Failure Scenario
If any future field or zero-fee transaction invokes `.drops(FEE, 0)`, the serialiser emits `0x4000000000000000` instead of `0x0000000000000000`, causing `rippled` to reject the transaction as non-canonical.

#### Suggested Fix
Update `drops` to set bit 62 only when `v > 0`:
```rust
let val = if v > 0 { v | 0x4000_0000_0000_0000 } else { 0 };
self.fields.push(Field { def, value: val.to_be_bytes().to_vec() });
```

---

### [LOW] F-08: Missing `rerun-if-env-changed` for `WCONF_OPENSSL` in `build.rs`
* **Location:** [`signer/build.rs:145-160`](file:///signer/build.rs#L145-L160)

#### Description
[`signer/build.rs`](file:///signer/build.rs#L62-L65) uses `env_path` to emit `cargo:rerun-if-env-changed` for `WCONF_MPT_SRC`, `WCONF_MPT_LIB`, and `WCONF_SECP256K1`. However, `openssl_prefix()` reads `std::env::var("WCONF_OPENSSL")` directly without emitting `cargo:rerun-if-env-changed=WCONF_OPENSSL`.

#### Failure Scenario
If an operator builds the project and subsequently overrides `WCONF_OPENSSL` to point to a different libcrypto path, cargo will not detect the environment variable change and will link against the previous cached path.

#### Suggested Fix
Add `println!("cargo:rerun-if-env-changed=WCONF_OPENSSL");` to `openssl_prefix()`.

---

### [LOW] F-09: Erroneous error message on store commit failure
* **Location:** [`signer/src/session.rs:201-209`](file:///signer/src/session.rs#L201-L209)

#### Description
In [`Session::prepare`](file:///signer/src/session.rs#L198):
```rust
if let Err(e) = self.store.commit(reservation, now_unix()) {
    return Err(Refusal::RandomnessLedgerFault {
        detail: format!(
            "the reservation could not be committed after the attempt finished: {e}. \
             If a signed blob was returned it exists; this signer no longer knows \
             whether its identifiers are recorded"
        ),
    });
}
```
If `commit` fails, `prepare` returns `Err(Refusal::RandomnessLedgerFault)`. The signed blob in `outcome` is dropped and is never returned in the response.

#### Suggested Fix
Clarify the detail message to state that the signing attempt was aborted and no signed blob was returned.
