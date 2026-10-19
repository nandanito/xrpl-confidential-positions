# REVIEW-014b — codex leg: the signer implementation (r/ρ, the A4–A9 ledger, the trust boundary)

- **Leg:** Codex (codex exec --sandbox read-only)
- **Date:** 2026-08-18
- **Target:** `git diff 87ac7a9..f7ef8a8 -- signer/` — commits `de8cd99` and `f7ef8a8`, already on `main`.
- **Packet:** the ruling's Deliverable A and amendments A1–A9, `REVIEW-013c`, architecture §3, and the complete diff.
- **Verbatim.** Adjudicated in `REVIEW-014c`. Nothing below is edited.

---

# Findings

**CRITICAL — `signer/src/store.rs:354` accepts a full rollback of `header.bin` plus `records.log`.**  
Concrete sequence: create store, reserve/commit identifier A, copy both files, reserve/commit identifier B, restore both copied files. `Store::open()` verifies only internal consistency of the restored header/log pair at `signer/src/store.rs:354-435`, so it opens successfully and forgets B. A later exact-context repeat of B is no longer blocked. This is the main A4 failure case.  
Fix: anchor the latest store tail outside the rollback domain and verify it on open, or state that full snapshot rollback is not detected. A same-directory HMAC header is not enough.

**HIGH — `Store::create` silently destroys an existing ledger.**  
At `signer/src/store.rs:331-347`, `Store::create()` calls `std::fs::write(records.log, [])` and then writes a fresh generation-0 header. Concrete sequence: reserve/commit an identifier, call `Store::create(&dir, key)` again, then reopen; the store is empty and the old identifier can be reserved again. No A6 acknowledgement, no audit gap, no generation increment.  
Fix: make creation fail if either store file exists, using `create_new`; expose a separate first-install path; make all reset paths go through `fresh_start()`.

**HIGH — the audit log is not append-only against truncation.**  
`audit_line()` chains entries at `signer/src/store.rs:727-744`, but there is no authenticated audit header or entry count, and `read_audit_log()` at `signer/src/store.rs:770-805` accepts any valid prefix. Concrete sequence: perform two `fresh_start()` calls, delete the second audit line, then `Store::read_audit()` returns one valid entry. The latest gap record is gone without detection.  
Fix: implement the A4 construction for the audit log too: authenticated header with entry count, tail sequence and tail chain, verified before append and read.

**HIGH — generation IDs can move backwards after a missing or corrupt header.**  
`fresh_start()` uses `peek_header()` only at `signer/src/store.rs:642-647`; `peek_header()` returns `None` for missing or MAC-bad headers at `signer/src/store.rs:671-693`, so the next generation becomes `1`. Concrete sequence: reach generation 3, delete or corrupt `header.bin`, acknowledge reset; the new store is generation 1. That violates “generation_id increments on every A3 fresh start” and can confuse a fresh store with an earlier one.  
Fix: derive the next generation from a verified external audit tail or monotonic generation record, not only the store header being reset.

**MEDIUM — A6 restore-before-reset is not implemented.**  
A crash after record fsync and before header write leaves `records.log` ahead of `header.bin`; `open()` reports `HeaderBehindLog` at `signer/src/store.rs:391-392`. `fresh_start()` then records a gap and deletes the store at `signer/src/store.rs:650-665`; it never attempts restore from the most recent verifying record set, contrary to A6 item 5.  
Fix: before reset, attempt recovery from a verifying latest log/header/tmp/header backup state, and only enter A6 reset if no verifying restore candidate exists.

**MEDIUM — records do not carry `generation_id`.**  
`Record` has `seq`, `kind`, `entry`, `status`, `created_at`, and `chain` at `signer/src/store.rs:131-140`; `record_body()` and `wire()` omit generation at `signer/src/store.rs:259-267` and `signer/src/store.rs:701-709`. A6 requires every subsequently signed transaction’s local record to carry the current `generation_id`.  
Fix: add `generation_id` to the record wire format and chain preimage, and validate it on open.

**MEDIUM — illegal duplicate/superseding states are accepted when the MAC verifies.**  
`open()` rebuilds the index with unconditional `index.insert()` at `signer/src/store.rs:419`, so the last record for an identifier silently wins. Concrete forged-or-buggy valid-MAC log: `pending(A)`, `pending(A)` or `committed(A)`, `pending(A)` opens and changes current status semantics. Legal duplication should only be a same-kind `pending -> committed` supersession.  
Fix: while rebuilding the index, validate duplicate identifiers as explicit state transitions and reject all other duplicates.

**MEDIUM — A8’s timeout/lease constants are not stated or enforced.**  
`promote_expired_pending()` accepts caller-provided `lease_secs` at `signer/src/store.rs:523`, while `TerminalConfirmer` blocks on stdin with no timeout at `signer/src/confirm.rs:80-92`. There is no stated constant proving confirmation timeout is strictly shorter than the lease interval.  
Fix: define `CONFIRMATION_TIMEOUT_SECS` and `LEDGER_LEASE_SECS`, enforce the timeout in the confirmer, and make sweep use the fixed lease constant.

**MEDIUM — randomness-ledger refusals are not wired to the trust-boundary refusal model.**  
`ReserveError` and `StoreFault` exist at `signer/src/store.rs:145-168`, but `protocol::Refusal` has no ledger-specific variants at `signer/src/protocol.rs:47-59`, and `session.rs` never renders store faults in the signer window. A8(b) requires duplicate, lock failure, I/O error, and corruption to be loud and distinguishable over IPC.  
Fix: add explicit ledger refusal codes and a signer-window renderer for store refusal states before any signing path uses this store.

**LOW — malformed audit MAC fields can panic instead of returning corruption.**  
`read_audit_log()` slices `parts[6][i * 2..i * 2 + 2]` at `signer/src/store.rs:798-800` without checking length. A line with seven pipe-separated fields and a short MAC panics.  
Fix: check the MAC field is exactly 64 hex characters before slicing, and return `InvalidData` on failure.

# Where the implementation diverges from the ruling

A4 requires rollback detection. The implementation detects log-only rollback under a newer header, but not rollback of both `header.bin` and `records.log`.

A6 says the audit log is chained under A4’s construction. This audit log is chained, but lacks A4’s authenticated header/tail, so suffix deletion is accepted.

A6 says the signer must attempt restore before fresh start. `fresh_start()` does not attempt restore.

A6 says every subsequently signed transaction’s local record carries `generation_id`. `Record` does not.

A8 says confirmation timeout and lease interval must be stated constants with timeout strictly shorter. The implementation has neither constant and stdin confirmation has no timeout.

A8 says ledger refusals must render in the signer’s own window and be distinguishable over IPC. Store errors are not integrated into `protocol::Refusal` or `session`.

A3/A6 require missing/corrupt store reset only after acknowledgement plus durable gap. Public `Store::create()` bypasses that and can overwrite an existing store.

# Overstated or false comments

`signer/README.md:139` says “Truncation, rollback, reordering and alteration are all detected.” Full rollback of header plus log is not detected.

`signer/tests/store_a4_a9.rs:157-161` says restoring both log and header is caught by the audit log. No code compares store state to the audit log, and ordinary appends are not audited.

`signer/src/lib.rs:12-15` says “There is no store in this skeleton,” but `signer/src/lib.rs:24` exports `pub mod store`.

`signer/README.md:146-150` says `HumanAcknowledgement` has one constructor. With default features, `acknowledgement_for_test()` is compiled and public at `signer/src/confirm.rs:176-178`; `test-support` is default at `signer/Cargo.toml:16-23`.

`signer/src/protocol.rs:154-155` says `Pair` requires a human in the signer UI. `Session::handle()` issues grants directly at `signer/src/session.rs:58-76`.

`signer/src/store.rs:323-325` implies deleting the randomness store does not delete evidence. That is only true if `audit.log` is not deleted or suffix-truncated; the audit log itself is not append-only under A4.

# What the tests do not cover

They do not test full rollback of both `header.bin` and `records.log`; the existing rollback test only restores an old log under the current header.

They do not test that `Store::create()` refuses to run on an existing ledger.

They do not test audit suffix deletion; they only test alteration of an existing audit line.

They do not test generation monotonicity when the store header is missing or MAC-bad after prior resets.

They do not test restore-before-reset for the crash window where `records.log` is ahead of `header.bin`.

They do not test illegal duplicate transitions in a valid-MAC log.

They do not test the required relationship between confirmation timeout and lease interval.

They do not test that store faults map to signer-window UI plus distinct IPC refusal codes.

They do not test that release builds cannot construct `HumanAcknowledgement` through default features.

They do not fuzz or differentially test `reduce_wide()` against an independent bigint implementation over random 512-bit inputs; KATs are good evidence, but not a falsifier for all carry/borrow paths.
