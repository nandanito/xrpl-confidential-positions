# REVIEW-014a — gemini leg: the signer implementation (r/ρ, the A4–A9 ledger, the trust boundary)

- **Leg:** Gemini (agy, --effort high)
- **Date:** 2026-08-18
- **Target:** `git diff 87ac7a9..f7ef8a8 -- signer/` — commits `de8cd99` and `f7ef8a8`, already on `main`.
- **Packet:** the ruling's Deliverable A and amendments A1–A9, `REVIEW-013c`, architecture §3, and the complete diff.
- **Verbatim.** Adjudicated in `REVIEW-014c`. Nothing below is edited.

---

# Findings

### CRITICAL
*No findings at this severity.*

---

### HIGH

#### 1. `Store::fresh_start` resets `generation_id` to 1 on a missing or corrupt header, violating generation monotonicity and cross-generation collision resistance (A4 / A6)
- **File & Line:** [`signer/src/store.rs:604-610`](file:///signer/src/store.rs#L604-L610), [`signer/src/store.rs:640-654`](file:///signer/src/store.rs#L640-L654)
- **Concrete Sequence:**
  1. The store advances normally to `generation_id = 4`.
  2. A disk fault, crash, or adversary deletes or corrupts `header.bin` (triggering `StoreFault::Missing` or `StoreFault::HeaderMacMismatch`).
  3. The holder enters the typed confirmation phrase to start fresh via `Store::fresh_start`.
  4. `fresh_start` calls `Store::peek_header(dir, &key)`. Because `header.bin` is missing or fails MAC verification, `peek_header` returns `None`.
  5. `fresh_start` falls back to `(old_generation, last_seq) = (0, -1)` and computes `new_generation = 0 + 1 = 1`.
  6. The fresh store is initialized with `generation_id = 1`, rolling back from generation 4 to 1. All subsequent transactions tag their records with `generation_id = 1`, colliding with records created under the original generation 1.
- **Specific Fix:** `Store::fresh_start` must read the separate `audit.log` via `read_audit_log` and determine `old_generation` as `max(header.generation_id, max(audit_entries.new_generation))` so that `generation_id` monotonically increases even when `header.bin` is completely destroyed or tampered with.

---

#### 2. `append_audit` blind-chains off the file tail without verifying the audit log, permitting undetected audit log truncation and middle-entry deletion (A6)
- **File & Line:** [`signer/src/store.rs:680-702`](file:///signer/src/store.rs#L680-L702)
- **Concrete Sequence:**
  1. An adversary with same-user filesystem access modifies or deletes middle entries from `audit.log`, or truncates the file to hide a previous store fault/reset.
  2. Later, a new fault occurs and `Store::fresh_start` executes.
  3. `append_audit` calls `last_audit_chain`, which simply reads the last non-empty line in `audit.log` and parses its hex MAC. It does not verify the chain preceding it.
  4. `append_audit` computes an HMAC chaining off this arbitrary line and appends the new record.
  5. Because neither `Store::open`, `Store::create`, nor `Store::fresh_start` ever calls `read_audit_log`, the deletion/alteration of historical audit entries is never detected during daemon operation.
- **Specific Fix:** `append_audit` (and `Store::open`) must call `read_audit_log` to verify the entire audit log chain from sequence 0 before appending. If verification fails, the signer must refuse to append and raise an unrecoverable audit fault.

---

#### 3. `Store::open` fails unrecoverably on a crash between record write and header atomic write, violating A6 item 5 (Crash Recovery / Restore)
- **File & Line:** [`signer/src/store.rs:398-403`](file:///signer/src/store.rs#L398-L403), [`signer/src/store.rs:555-558`](file:///signer/src/store.rs#L555-L558)
- **Concrete Sequence:**
  1. `Store::append` writes a new record to `records.log` and successfully fsyncs it (`f.sync_all()`).
  2. The system crashes or loses power immediately before `write_header()` replaces `header.bin`.
  3. On restart, `records.log` contains $N + 1$ records, while `header.bin` still contains `entry_count = N`.
  4. `Store::open` reads `found = N + 1` and `header.entry_count = N`. Because `found > header.entry_count`, it returns `Err(StoreFault::HeaderBehindLog)`.
  5. The signer refuses to open and forces a manual `fresh_start` reset (burning duplicate detection across the entire log history), even though the first $N$ records match the authenticated `tail_chain` perfectly.
- **Specific Fix:** Per A6 item 5 (*"the signer must attempt restore from the most recent store whose chain verifies"*), when `found > header.entry_count` and the first `header.entry_count` records verify against `header.tail_chain`, `Store::open` should automatically truncate `records.log` back to `header.entry_count * RECORD_WIRE_LEN` (or check if the trailing record's chain is valid and update the header) to recover cleanly without declaring a gap.

---

### MEDIUM

#### 4. Leased sequence numbers leak in memory on abandoned `Reservation` or partial `commit()` failure, preventing expired pending sweeps (A8)
- **File & Line:** [`signer/src/store.rs:485-486`](file:///signer/src/store.rs#L485-L486), [`signer/src/store.rs:500-512`](file:///signer/src/store.rs#L500-L512)
- **Concrete Sequence:**
  1. `Store::reserve` appends two `Pending` records and pushes `r_seq` and `rho_seq` to `self.leased`.
  2. If proof generation fails, the connection drops, or `commit` fails on the second `promote_entry` (`res.rho_entry`), `commit` exits early via `?`.
  3. `self.release_lease(&res)` is never reached. Furthermore, `Reservation` does not implement `Drop`.
  4. `r_seq` and `rho_seq` remain in `self.leased` for the lifetime of the process.
  5. When `promote_expired_pending` runs on subsequent startup sweeps or maintenance, line 521 (`!self.leased.contains(&r.seq)`) skips these entries forever, leaving them permanently in `Pending` status in memory and on disk.
- **Specific Fix:** Implement an explicit `abort(res)` method, execute lease release in a guard or `finally` block in `commit`, and associate leases with timestamps rather than indefinite sequence number retention.

---

#### 5. `Store::create` generates a new random `install_id` on every creation and `fresh_start`, destroying installation identity (A4 / A6)
- **File & Line:** [`signer/src/store.rs:356-357`](file:///signer/src/store.rs#L356-L357), [`signer/src/store.rs:625`](file:///signer/src/store.rs#L625)
- **Concrete Sequence:**
  1. `Store::create` draws `install_id = getrandom()`.
  2. When `Store::fresh_start` executes, it wipes the store and calls `Store::create`, generating a brand new random `install_id`.
  3. All new records are chained under this new `install_id`, breaking continuity of the installation identifier across generations.
- **Specific Fix:** Derive `install_id` deterministically from `k_local` (e.g. `HMAC-SHA256(k_local, "WCONF-INSTALLATION-ID")[..16]`) or persist it alongside `k_local` so that it remains invariant across store generations.

---

#### 6. Forbidden field scanner checks exact lowercase equality, failing on standard camelCase or snake_case variants
- **File & Line:** [`signer/src/protocol.rs:26-45`](file:///signer/src/protocol.rs#L26-L45), [`signer/src/protocol.rs:98-115`](file:///signer/src/protocol.rs#L98-L115)
- **Concrete Sequence:**
  1. A caller sends `{"claimed": {"skA": "deadbeef"}}` or `{"entropy_64": "..."}`.
  2. `scan_for_forbidden` lowercases keys to `"ska"` and `"entropy_64"`.
  3. `FORBIDDEN_FIELDS` contains `"sk_a"` and `"entropy64"`, but not `"ska"` or `"entropy_64"`.
  4. `scan_for_forbidden` returns `None`, allowing the request past the pre-parse filter without returning `REFUSED_CALLER_RANDOMNESS`.
- **Specific Fix:** Normalize key strings by removing underscores and dashes before comparing against `FORBIDDEN_FIELDS`, and include camelCase/snake_case variants explicitly.

---

### LOW

#### 7. `test-support` feature is enabled by default in `Cargo.toml`, retaining test helper in default release builds
- **File & Line:** [`signer/Cargo.toml:22-23`](file:///signer/Cargo.toml#L22-L23), [`signer/src/confirm.rs:172-179`](file:///signer/src/confirm.rs#L172-L179)
- **Concrete Sequence:**
  1. A developer or packager runs standard `cargo build --release`.
  2. Because `default = ["test-support"]`, `acknowledgement_for_test` is compiled into the release binary.
  3. The claim in `README.md` that a release build drops the test constructor is false unless `--no-default-features` is passed.
- **Specific Fix:** Change `Cargo.toml` to `default = []` and run test suites with `cargo test --features test-support`.

---

#### 8. Loose address shape validation accepts non-Base58 characters
- **File & Line:** [`signer/src/txn.rs:160-168`](file:///signer/src/txn.rs#L160-L168)
- **Concrete Sequence:**
  1. `normalise_account` checks `t.bytes().all(|b| b.is_ascii_alphanumeric())`.
  2. Characters prohibited in Ripple Base58 ('0', 'O', 'I', 'l') are accepted and pass through to confirmation.
- **Specific Fix:** Validate characters against Ripple's Base58 dictionary `rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz`.

---

# Where the implementation diverges from the ruling

1. **A6 item 5 (Automatic Restore Attempt):**
   - *Ruling:* *"Before starting fresh, the signer must attempt restore from the most recent store whose chain verifies."*
   - *Implementation:* No restore logic exists in `Store`. Any header mismatch or trailing crash byte immediately errors with `StoreFault::HeaderBehindLog` / `HeaderMacMismatch` and forces deletion of the database.

2. **A4 & A6 (Monotonic Generation ID across Failures):**
   - *Ruling:* *"`generation_id` starts at 0 and increments on every A3 fresh start, so a store can never be silently confused with an earlier one."*
   - *Implementation:* `fresh_start` only queries `peek_header`. If `header.bin` is missing or corrupt, `generation_id` resets back to 1. `audit.log` is ignored when determining the next generation ID.

3. **A6 item 4 (Chained Audit Log Verification):**
   - *Ruling:* Audit log is an authenticated append-only chain.
   - *Implementation:* `append_audit` blind-chains from whatever line happens to be at the end of `audit.log` using `last_audit_chain`. Neither `open()` nor `fresh_start()` verifies the audit chain.

4. **A4 (Installation ID Persistence):**
   - *Ruling:* `install_id` is an installation-level identifier bound into all records and headers.
   - *Implementation:* `Store::create` generates a random 16-byte array on every fresh start, causing `install_id` to change across store resets.

5. **Integration Divergence (Step 1/4 Wiring):**
   - *Ruling & README:* Architecture §6 Step 4 defines the randomness store as the state machine guarding `r` and `ρ` before signing.
   - *Implementation:* `Session` in [`signer/src/session.rs`](file:///signer/src/session.rs) does not integrate `Store` or `randomness::derive`. `Prepare` processes requests without consulting the randomness ledger.

---

# Overstated or false comments

1. **`signer/README.md:157` vs `signer/Cargo.toml:22` (`test-support` feature in release builds):**
   - *Claim:* *"The test-only constructor is behind the `test-support` feature and a release build drops it."*
   - *Reality:* `Cargo.toml` sets `default = ["test-support"]`. A standard `cargo build --release` compiles with default features enabled, keeping `acknowledgement_for_test` in the binary. It is only dropped if `--no-default-features` is explicitly passed.

2. **`signer/README.md:144` (Rollback and Truncation Detection Claim):**
   - *Claim:* *"Truncation, rollback, reordering and alteration are all detected — under A1's per-entry MACs a truncated store verified perfectly"*
   - *Reality:* While record log truncation is detected, `audit.log` middle-entry deletion or truncation is not detected by the daemon during `open` or `fresh_start` because `last_audit_chain` blindly trusts the file tail.

3. **`signer/src/store.rs:597` (Durable Gap Record Isolation):**
   - *Claim:* *"Start a fresh store after a fault, and record the gap durably outside the store being reset."*
   - *Reality:* While written to `audit.log`, the reset logic does not read from `audit.log` to recover the previous generation index if `header.bin` is corrupt, undermining the durable audit trail.

---

# What the tests do not cover

1. **Missing / Corrupt Header Reset Test:**
   - No test deletes or corrupts `header.bin` and then calls `fresh_start`. A test asserting that `new_generation > old_generation` when `header.bin` is missing would immediately fail and expose Flaw #1.
2. **Crash Window Test (`HeaderBehindLog`):**
   - No test appends a record to `records.log` without updating `header.bin` to verify whether `Store::open` can restore the valid prefix up to `header.entry_count` per A6 item 5.
3. **Audit Log Tampering During Daemon Startup:**
   - `tampering_with_the_audit_log_is_detected` only tests the standalone `read_audit_log` helper. No test verifies whether `Store::open` or `Store::fresh_start` rejects a tampered `audit.log`.
4. **Lease Leak on Dropped `Reservation`:**
   - No test creates a `Reservation` via `store.reserve()`, drops it without calling `commit()`, and checks whether `promote_expired_pending` can promote the orphaned sequence numbers after `lease_secs` has elapsed.
5. **Partial `reserve()` Failure Cleanup:**
   - No test simulates a disk I/O failure when writing `rho` after `r` has already been written to `records.log`.
6. **Forbidden Field Variant Coverage:**
   - No test passes camelCase (`skA`) or snake_case (`entropy_64`) variants to verify rejection by `scan_for_forbidden`.
7. **Scalar Reduction Boundary Inputs:**
   - While `reduce_wide` tests $N$, $N+1$, $2N$, and $2^{512}-1$, no test covers $N-1$, $2N-1$, or inputs causing intermediate bit carries with $acc < N$.
