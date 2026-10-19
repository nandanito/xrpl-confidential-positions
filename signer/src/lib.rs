//! W-CONF holder signer. **Devnet only. Never mainnet, at any phase.**
//!
//! Architecture §6 steps 1, **2**, 3 and 4.
//!
//! ~~This binary holds **no keys**, generates **no proofs**, and signs
//! **nothing**.~~ **All three became false on 2026-08-18**, which is the step 3
//! milestone. It holds **throwaway Devnet keys**, generates **real proofs**
//! through a vendored patched `mpt-crypto`, and signs **real XRPL
//! transactions**. `CLAIMS.md` P-5 still forbids calling any of it secure,
//! non-custodial, audited or production-ready.
//!
//! ## ⚠ This paragraph is the seventh instance of one failure, and it is why
//! ## the file is written this way
//!
//! Every sentence struck above was **true when written and false within the
//! same session**. `REVIEW-014b` caught the previous one — *"there is no store
//! in this skeleton"*, in a file exporting `pub mod store` — and the very next
//! session left *"holds no keys, generates no proofs, signs nothing"* sitting
//! above `pub mod prover` and `pub mod xrpl`. **The strikethroughs stay.** A
//! clean rewrite would remove the only evidence that this keeps happening.
//!
//! **Instance eight is struck below on 2026-08-19**, and it is a milder kind:
//! *"reading the ledger — step 2 — is genuinely absent"* was true for one
//! session and is now false, in a file that gained `pub mod ledger`.
//!
//! **Instance nine is struck below on 2026-08-20**, and it is the same kind:
//! *"real key generation is genuinely absent"* was true for one session and is
//! now false, in a file that gained `pub mod keygen` and `pub mod onboarding`.
//! ⚠ It was accompanied by a tenth in `xrpl.rs`, which is worse because nobody
//! struck it: that module's header called the ECDSA nonce *"unruled"* and
//! described the module as signing with pure RFC 6979 for a full day after
//! `REVIEW-018` ruled it and the code was changed to hedge.
//!
//! ## What is genuinely absent
//!
//! * ~~**Real key generation.** The ElGamal key comes from the library's own
//!   generator, *not* REVIEW-012c's ruled derivation. That is step 6 and it
//!   still owes issues #10 (publish the derivation) and #11 (onboarding
//!   branches on ledger state).~~ **Built 2026-08-20** — [`keygen`] is the
//!   ruled derivation and [`onboarding`] is issue #11's branch on ledger
//!   state. What remains true, and is narrower: **issue #10 is not
//!   discharged.** The derivation is specified in one repository document and
//!   is not a published standard, so a holder who has their seed and not this
//!   repository cannot reconstruct the key — which is the entire benefit the
//!   ruling trades for. Publishing it is a hand-over, not a coding-session
//!   item.
//! * ~~**Reading the ledger.** Step 2. Sequence numbers, balances, balance
//!   versions and other holders' encryption keys come from a profile file
//!   ([`holder`]), which is trusted input and a named gap.~~ **Built
//!   2026-08-19** — [`ledger`]. Nine fields left [`holder`], which now carries
//!   secrets and policy only and **refuses any of the nine by name**. What
//!   remains true, and is smaller and sharper: a read authenticates the
//!   **channel to a node the operator chose**, not the ledger (`CLAIMS.md`
//!   F-23, B-15).
//! * ~~**`ConfidentialMPTConvertBack`.** Refused by name, not silently
//!   missing.~~ **BUILT 2026-08-24** — architecture §6 step 7 needs the
//!   facility's exit. Its field set is XLS-0096 **§10.3's**, read at source
//!   rather than inherited from Convert's, and `tests/convert_back.rs` asserts
//!   each of the three differences negatively. ⚠ Building it made
//!   `REFUSED_NOT_IMPLEMENTED` unreachable; the variant was removed rather than
//!   left as a refusal no client can receive (`CLAIMS.md` E-130).
//! * **The Bulletproof's internal randomness.** Issue #8, and no ruling exists.
//! * **Submitting anything.** This signs and hands back a blob.
//!
//! ## The wiring, which is the part a reader will assume is still missing
//!
//! ~~`session` does not call `store` or `randomness` on any path.~~ **It does.**
//! `session::prepare` draws fresh entropy, derives `r` and `ρ` bound to the
//! transaction context, reserves both identifiers in the ledger **before**
//! generating a proof, and burns them on any refusal **that happens after the
//! reservation** — a declined confirmation, a failed proof. Anything decidable
//! earlier is decided earlier, in `preflight`, and touches the ledger not at
//! all. `tests/signing_path.rs` fails if either half stops holding.

pub mod confirm;
pub mod grant;
pub mod holder;
pub mod ipc;
pub mod keygen;
pub mod ledger;
pub mod mpt;
pub mod onboarding;
pub mod protocol;
pub mod prover;
pub mod randomness;
pub mod scalar;
pub mod session;
pub mod store;
pub mod txn;
pub mod xrpl;
