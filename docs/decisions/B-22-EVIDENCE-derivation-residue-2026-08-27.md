# B-22 — EVIDENCE ONLY: unwiped secret material in the key-derivation path

**Date:** 2026-08-27. **Tree:** `cd7637b`. **Status: NOT a decision, NOT a
decision request, and deliberately NOT a set of options.**

---

## ⚠ What this file is, and what it is not

It is the **facts** a B-22 decision will need, gathered while the tree and the
review legs' reports were in front of the session that deferred B-22.

**It contains no recommendation and no options table, on purpose.** The session
that wrote it is the session that drew the scope boundary B-22 exists to
re-examine, and **framing a choice is how a packet steers its readers** — this
project has the receipts: `REVIEW-024`'s three legs reached unanimity partly
because the adjudicator selected what they read (E-160), and a leg graded a
defect that does not exist from its own excerpt of a file supplied in full
(E-170). An options table written by the interested party is the same failure
one level up.

So: line numbers, verbatim quotations, and measured costs. **Whoever decides
B-22 should frame it themselves.**

⚠ **Line numbers are pinned to `cd7637b` and were re-derived from that tree, not
copied from the review reports.** The legs read `d535589`; every line has moved
since. `CLAIMS.md` E-141 and E-168 are what that caution costs when skipped.

---

## 1. The sites

`signer/src/xrpl.rs` unless noted. "Wiped" means some `Drop` reaches it.

| Line | Value | Why it is secret | Wiped? |
|---|---|---|---|
| **445** | `sha512half(entropy)` passed to `SigningKey::from_bytes` | ⚠ **This expression IS the ed25519 private key.** XRPL's derivation is `sk = SHA512Half(entropy)`. | **No** — a `[u8; 32]` temporary |
| 184 | `full` — the 64-byte `Output<Sha512>` inside `sha512half` | Its first half is the key at 445; the second half is discarded but derived from the same seed | **No** |
| 185 | `out` — the returned `[u8; 32]` | The key itself | **No**, and it is *returned*, so the move source stays too |
| 449 | `Inner::Ed25519(Box::new(sk))` | The `SigningKey` is moved into a `Box` | Box contents **yes** (`ZeroizeOnDrop`); the **move source is not** |
| 460, 470 | `root`, `intermediate` — `k256::NonZeroScalar` | secp256k1 private scalars | **No** `Drop`. ⚠ `NonZeroScalar` implements `Zeroize` but nothing calls it |
| 477 | `sum` — the account scalar | The secp256k1 private key | **No** |
| 478 | `sum.to_bytes()` temporary | Serialised private key | **No** |
| 483 | `AccountKey { inner: Inner::Secp256k1(signing), .. }` | Move of the signing key | Final storage **yes** via drop glue; **move source no** |
| 943 | `candidate` in `derive_scalar` | Rejection-loop candidate private scalars, one per iteration | **No** |
| 893, 926 | `decode_ed25519_seed`, `decode_family_seed` returning `[u8; 16]` | ⚠ **The master seed** — under the ruled keygen construction this is *also* the ElGamal decryption key's input | **No** |
| 315 | `b58_decode` returns `Vec<u8>` | The decoded seed passes through a **heap** buffer | **No**, and it is heap rather than stack |
| 844, 849 | `OneShotAux::next_u32` / `next_u64`, local `b` | 4- and 8-byte chunks of the ECDSA auxiliary entropy | **No** |

⚠ **One claim was REFUTED and is recorded so it is not re-raised.** The Gemini
leg said `AccountKey`/`Inner` are themselves unwiped. **Codex refuted it:**
recursive drop glue reaches the `k256::SigningKey` and the boxed
`ed25519_dalek::SigningKey`, whose destructors zeroize. *Final storage* is
covered; *move sources and temporaries* are not.

⚠ **`sha512half` has PUBLIC callers too** — 566 (message prehash), 1202
(`signing_digest`), 1245. Any change to it touches the transaction-hash path,
which is pinned byte-for-byte by `tests/xrpl_vectors.rs`.

---

## 2. What the review legs said, verbatim

**Gemini (`REVIEW-027a`), answering "what is still unwiped that B-21 should have
covered?":**

> **Verdict on scope:** Leaving `sha512half` out of scope was **the wrong call**.
> In `ed25519_from_entropy`, `sha512half(entropy)` computes
> `Sha512::digest(entropy)`. The 64-byte `full` digest and the returned
> `[u8; 32]` holding root private key material are left completely unwiped on the
> stack. Wiping ephemeral nonce entropy while leaving long-term root seed
> derivation buffers unwiped in the same module is an arbitrary and inconsistent
> boundary.

**Codex (`REVIEW-027b`), same question, independently:**

> **CONFIRMED.** Unwiped secret-bearing sites, most sensitive first: Master-seed
> entropy … secp256k1 private scalars … Ed25519 private key: `sha512half` result
> temporary … `sha512half`: `full` SHA-512 digest, `out`, and its return move;
> the SHA-512 internal block buffer is also not zeroized.

**The reason recorded for deferring**, from `CLAIMS.md` B-22, so the decision can
test it rather than inherit it:

> B-21's registered subject was the signing helper, and widening a security
> change mid-commit on the strength of a review's advice is how a fix comes to
> claim more than it did — `OneShotAux` was already one such widening this
> session.

---

## 3. Costs, measured rather than estimated

- **B-21's comparable change** was `zeroize` as a direct dependency plus three
  `Zeroizing` wrappers: `git diff --numstat d8eb7a3~1 d8eb7a3 -- signer/src/xrpl.rs`
  gives **193 insertions, 20 deletions**, most of the insertions comment, and
  **zero** change to any test vector. No new download — `zeroize 1.9.0` was
  already in `Cargo.lock` before that commit, via `elliptic-curve`
  (`git show d8eb7a3~1:signer/Cargo.lock`).
  ⚠ A first draft of this bullet said *"+213 lines"*, which is the diffstat's
  **changed-line** count and not an insertion count. Both numbers are now the
  command that produces them.
- **Runtime cost: not measured, in either case.** `CLAIMS.md`'s own rule is that
  an unmeasured number is not a number; B-19's *"nothing measurable"* was
  corrected to *"expected negligible, NOT MEASURED"* by two review legs.
- **A falsifier already exists in template form.** `make check-zeroize-bounds`
  part 2 reverts a wiping type to a bare array and requires the build to break;
  part 3 is a source check for call sites; part 4 scans live prose. Any of the
  three extends to these sites without new machinery.
- ⚠ **`sha512half`'s public callers mean a change there is NOT type-local.**
  `tests/xrpl_vectors.rs` pins the transaction-hash path byte-for-byte against
  three independently written JS implementations; that suite is the check.

---

## 4. What P-5 permits to be claimed, whatever is decided

Identical to B-21, and the wording has not moved: **it narrows a window and
removes no channel.** An adversary with code execution reads the scalar while it
is live. Rust leaves the source of every move unwiped. The `Sha512` hasher's own
block buffer holds the secret input and `sha2 0.10` offers no zeroizing drop —
**P-12 search recorded 2026-08-27: `grep -rn "zeroize\|Zeroize\|impl.*Drop"` over
the vendored sources *and* manifests of `sha2 0.10.9`, `digest 0.10.7`,
`crypto-common 0.1.6` and `block-buffer 0.10.4` returns ZERO hits.**

⚠ **One asymmetry is a fact and not an argument**, stated because it will
otherwise be discovered mid-decision: the values at 445, 477 and 893/926 are
**long-lived** — a master seed is reconstructible for the life of the account —
whereas B-21's nonce entropy is per-signature. Whether that difference should
move the boundary is the decision, not this file.

---

## 5. Not established here

- Whether the deferral was right. **That is the decision.**
- Whether these sites are reachable by any real adversary. Nothing here models
  one; P-5 governs.
- Whether wiping them changes any measurable behaviour. Not benchmarked.
- Whether `NonZeroScalar`'s existing `Zeroize` impl can be used directly, or
  whether the rejection loop at 941-948 needs restructuring. **Not investigated.**
