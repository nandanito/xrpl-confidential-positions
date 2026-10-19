# REVIEW-014c — adjudication: the signer implementation

- **Date:** 2026-08-18
- **Target:** `de8cd99` and `f7ef8a8`, both already on `main` and pushed.
- **Legs:** `REVIEW-014a` (Gemini), `REVIEW-014b` (Codex). Both verbatim.
- **Why this ran at all.** `REVIEW-013c` §3c ruled the next artifact after A4–A9 is *"the implementation and a test that fails if it is not followed — not a third packet."* That was followed. **A code review of the implementation is a different artifact from a third design packet**, and the code had been seen by nobody but its author. Step 3 will build on it, so it was reviewed before that, not after.

**The review was worth running. Both legs found real defects, and the two most serious were found by one leg each rather than by both.**

---

## 1. Confirmed and fixed

### C-1 — full-snapshot rollback is not detected. **Codex only. The sharpest finding.**

Restore **both** `header.bin` and `records.log` from a copy and the pair is internally consistent: the header MAC verifies, the chain verifies, and the store opens having forgotten everything after the snapshot. **A same-directory HMAC cannot detect this**, because everything the check depends on is inside the thing being rolled back.

The existing test only restored the *old log under the current header*, which is the easy half. **The README claimed "rollback … detected" without qualification. That was an overclaim.**

**Disposition.** Two changes, and the second matters more than the first:

1. The audit log now carries the store's tail generation and is consulted on open, so a rollback that restores the store but not the audit log is caught.
2. **The residual is stated rather than papered over.** An adversary who restores *every* file in the directory is not detected by anything local, and no amount of same-directory MACing changes that. Detecting it needs an anchor outside the rollback domain — which this project does not have and is not pretending to.

### C-2 — `Store::create` silently destroyed an existing ledger. **Codex only.**

`create()` was public and unconditionally wrote an empty `records.log`. Calling it on a live store wiped every identifier with **no acknowledgement, no audit record and no generation bump** — the exact outcome A6 exists to prevent, reachable by calling the wrong constructor.

**Fixed:** `create()` now fails if either file exists. Every reset path goes through `fresh_start`.

### C-3 — generation IDs moved *backwards*. **Both legs.**

`fresh_start` read the generation only from `peek_header`, which returns `None` for a missing *or* MAC-failing header — so the commonest reset trigger reset the counter to 1. A store at generation 4 whose header was deleted came back as generation 1.

The existing test passed only because it corrupted `records.log` and left the header valid.

**Fixed:** the next generation is `max(header, highest new_generation in the audit log) + 1`. The audit log is the durable record precisely because it survives the store.

### C-4 — the audit log was not append-only against truncation. **Both legs.**

A4's set-integrity argument was applied to the record log and **not** to the audit log, which was chained per-entry only. Deleting the last audit line left a shorter, perfectly valid chain — the same defect A4 was written to fix, reproduced one file over.

**Fixed:** the audit log gets A4's construction — an authenticated header carrying entry count and tail chain, verified before append and on read.

### C-5 — A6 item 5, restore-before-reset, was not implemented. **Both legs.**

A crash between the record fsync and the header write leaves the log one record ahead. `open()` returned `HeaderBehindLog`, and the only path from there was a full reset — burning every identifier in the store over one crash.

**Fixed, and the disposition disagrees with Gemini on direction.** Gemini's suggested fix was to **truncate** the log back to the header's count. **That is the wrong direction and A2's own reasoning rejects it:** *"Deleting could permit a reuse the store exists to prevent; promoting cannot."* An identifier that was written and fsynced may already have been used. The conservative move is to **adopt** the trailing records when they chain correctly from the header's tail, and rewrite the header. That can only over-restrict, never under-restrict.

### C-6 — records did not carry `generation_id`. **Codex only.** A6 item 6 requires it. Added to the wire format and the chain preimage.

### C-7 — illegal duplicate states were accepted on open. **Codex only.**

`open()` rebuilt the index with an unconditional insert, so a valid-MAC log containing `pending(A), committed(A), pending(A)` opened and the last record won. The only legal duplication is a same-kind `pending → committed` supersession.

**Fixed:** duplicates are validated as state transitions on open; anything else is corruption.

### C-8 — A8's constants were not constants. **Codex only.**

A8(a) requires the confirmation timeout and the lease interval to be *"stated constants rather than implementation choices"*, with the timeout strictly shorter. `lease_secs` was a caller parameter and the confirmer had no timeout at all.

**Fixed:** `LEDGER_LEASE_SECS` and `CONFIRMATION_TIMEOUT_SECS` are named constants with a test asserting the ordering.

### C-9 — store faults were not in the refusal model. **Both legs (Codex sharper).**

A8(b) requires ledger refusals to be loud and distinguishable over IPC. `ReserveError` and `StoreFault` existed but `protocol::Refusal` had no ledger variants, so a duplicate or a corrupt store would have surfaced as a generic failure — precisely what `REVIEW-013c` §3a B-VII said a client renders as "please retry".

**Fixed:** `REFUSED_RANDOMNESS_REUSE` and `REFUSED_RANDOMNESS_LEDGER_FAULT`, with distinct detail text.

### C-10 — the forbidden-field scan missed obvious spellings. **Gemini only.**

`skA` and `entropy_64` passed, because matching was exact-after-lowercasing. **Fixed:** separators are stripped before comparison, and the tests now cover the variants.

### C-11 — `read_audit_log` could panic. **Codex only.** A seven-field line with a short MAC sliced out of bounds. **Fixed:** length-checked, returns `InvalidData`.

### C-12 — `install_id` was regenerated on every reset. **Gemini only.** It is now derived from `k_local`, so it is genuinely per-installation and needs no separate persistence.

### C-13 — base58 shape check accepted `0OIl`. **Gemini only.** Already labelled a placeholder for `ripple-address-codec`, but tightening to the XRPL alphabet was two lines, so it was done.

---

## 2. False or overstated comments — all confirmed, all mine

| Where | Claimed | Reality |
|---|---|---|
| `lib.rs` | *"There is no store in this skeleton"* | The same file exports `pub mod store`. **Written in the skeleton commit and left stale by the next commit** — this project's signature failure, committed twice in one session |
| `protocol.rs` | `Pair` *"requires a human in the signer's own UI"* | `Session::handle` issued grants directly. **Aspiration written as fact** |
| `README` | *"Truncation, rollback … all detected"* | Full-snapshot rollback is not. See C-1 |
| `README` | *"a release build drops it"* | `test-support` was a **default** feature, so plain `cargo build --release` kept it |

All four corrected. The `test-support` fix keeps `cargo test` working with no flags *and* makes the claim true, via a dev-dependency on the crate itself rather than a default feature.

---

## 3. Confirmed and NOT fixed, deliberately

**The store and the KDF are not wired into `Session`.** Both legs noted it. It is true and it is **not a defect in this code** — it is architecture §6 step 3, which needs the prover. A `Prepare` that reserved randomness without generating a proof would burn identifiers for nothing.

**What was wrong was the scope claim, not the code.** Architecture §6 step 4 read as though the step were discharged. Corrected: the construction and its state machine are built and tested; **the signing path does not call them yet** (E-76 already said nothing is signed; this makes the wiring gap explicit too).

---

## 4. What each leg contributed alone

**Codex:** C-1 (full-snapshot rollback — the most serious), C-2 (`create` destroying a ledger), C-6, C-7, C-8, C-11, and the `lib.rs` / `protocol.rs` stale comments. Its instinct for *"what does this API let a caller do by accident"* found the two worst.

**Gemini:** C-3's precise mechanism, C-10, C-12, C-13, and the clearest statement of the `test-support` overclaim. **Its fix for C-5 was wrong in direction** and is recorded above so it is not adopted later by someone reading only the leg.

**Neither leg found a defect in the KDF or in `reduce_wide`.** Codex noted correctly that KATs are not a falsifier for all carry/borrow paths and asked for a differential test against an independent bigint over random inputs. **Added** — 10,000 random 512-bit inputs checked against an independent implementation.

---

## 5. Standing

**Reviewed once, by two independent legs, and the findings are applied.** By this project's own rule the fixes themselves have now been seen by nobody — and that is where it stops paying for a state machine with a falsifying test per amendment. The tests are the check on the fixes, and every fix above landed with one.
