# REVIEW-031s — SELF LEG — B-23

⚠ **NOT AN INDEPENDENT THIRD READING, AND SAYING SO IS THE POINT.** This was
written **after** reading `REVIEW-031a` (Gemini). `CLAIMS.md`'s own record is
that self-review finds mechanisms and misses instances; treat agreement here as
one reading, not two.

## S1 — `AccountKey::from_family_seed` leaves 16 bytes of master-seed entropy unwiped (HIGH)

`signer/src/xrpl.rs:475`.

```rust
pub fn from_family_seed(seed: &str) -> R<AccountKey> {
    let (entropy, algo) = decode_family_seed(seed)?;   // <- [u8; 16], no Drop
    match algo { ... }
}
```

`decode_family_seed` returns `([u8; 16], KeyAlgorithm)` **by value**, and its own
B-22 comment says so in terms: *"`[u8; 16]` is `Copy`, so returning it is a COPY
… the source stays live and unwiped either way."* **B-22 acted on that sentence
inside the decoder and no caller acted on it.**

⚠ **This is the entry point `holder.rs` calls on EVERY profile load, under BOTH
key sources.** `keygen::derive_raw` — the only other caller in the crate — does
wipe it (`entropy.zeroize_source_copy()` at `keygen.rs:251`). **The two callers of
one function disagree, and the unwiped one is the one on the live path.**

⚠ **B-22 wiped the decoder's heap buffer; B-23 wiped the strings. The raw
entropy BETWEEN them was missed by both rounds.**

**Falsifier:** none exists today — `[u8; 16]` has no `Drop`, so no revert breaks.
It needs a source pin in `check-zeroize-bounds` part 6, and `keygen.rs:251` shows
the fix idiom already exists in the crate.

## S2 — `looks_like_a_family_seed` discards decoded entropy without wiping it (LOW)

`signer/src/onboarding.rs:264`.

```rust
pub fn looks_like_a_family_seed(arg: &str) -> bool {
    crate::xrpl::decode_family_seed(arg).is_ok()
}
```

`.is_ok()` drops the `Ok(([u8; 16], _))` payload. `[u8; 16]` has no `Drop`, so the
16 bytes stay in the stack temporary.

⚠ **LOW, and the reason is worth stating rather than assumed:** this function
exists *because* a seed reaching argv is already catastrophic — it is the refusal
path. The memory copy is not the main harm. **But it is avoidable residue created
by this crate, which is exactly the ruling's subject, and *the input was already
exposed* is the same argument both `REVIEW-029` legs rejected as Option D.**

## S3 — the one thing I want a leg to disagree with me about

I claim `holder.rs`'s `expected_account_id` check is **tautological on that
path** and can therefore be dropped in favour of one decode. The existing comment
says so and cites a revert. ⚠ **If that is wrong, S1's fix direction is wrong
too.** It is the load-bearing assumption in the fix and it is mine.

## What I did NOT find, recorded so the absence is legible

* No `Zeroizing` wrapped around a `Copy` type in the B-23 diff (E-178's shape) —
  every wrapper is around a `String`, which moves.
* No seed-bearing `String` outside the four sites plus the two `onboarding.rs`
  idioms; `io.ask` (`onboarding.rs:460`) is the key-source answer, not a secret.
* ⚠ **I did not independently find `REVIEW-031a`'s finding 1** (the `holder.rs`
  double decode), and I had noted the same call pair mid-build, said I would
  "name the other", and then did not. **E-172's shape, on my own sweep.**
