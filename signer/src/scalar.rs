//! secp256k1 scalar arithmetic — only what the ruled derivations need.
//!
//! Two operations, sharing one loop: reduce 64 wide bytes modulo `n`
//! ([`reduce_wide`]), and modulo `n − 1` with one added
//! ([`reduce_wide_total`]). Every W-CONF ruling that produces a scalar chose
//! **wide 64-byte reduction with no secret-dependent retry branch**, rejecting
//! rejection sampling.
//!
//! ⚠ **They differ in what happens at zero, and that difference is ruled, not
//! incidental.** `reduce_wide` returns an error the caller must abort on;
//! `reduce_wide_total` cannot produce zero and has no error at all, because
//! keygen's input is a fixed seed and an abort there would be permanent.
//! Architecture §4 has all four rules side by side. Do not merge them.
//!
//! # Why this is hand-written rather than a bigint dependency
//!
//! The input is secret in every caller. A general-purpose bignum reduces in
//! time that depends on its operands, and the obvious library choices are not
//! constant-time. The loop below performs the **same 512 iterations of the same
//! operations** regardless of input, and its one conditional subtraction is a
//! mask rather than a branch.
//!
//! ⚠ **Constant-time is claimed for this function's control flow and nothing
//! more.** It is not a claim about compiler output, about the caller, or about
//! the machine — and `CLAIMS.md` P-5 still forbids calling any of this secure.
//! An adversary with code execution reads the scalar out of memory and none of
//! this matters (architecture §3).

/// `n`, the order of the secp256k1 group. Little-endian 64-bit limbs.
/// `n = FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141`
/// — note the `FFFE` in the second word from the top. Getting that digit wrong
/// produces a reduction that is silently wrong for most inputs and correct for
/// small ones, which is why this is validated against published vectors rather
/// than by inspection.
const N: U256 = U256([
    0xBFD2_5E8C_D036_4141,
    0xBAAE_DCE6_AF48_A03B,
    0xFFFF_FFFF_FFFF_FFFE,
    0xFFFF_FFFF_FFFF_FFFF,
]);

/// `n − 1`. The modulus of the **keygen** reduction, which is
/// `(X mod (n−1)) + 1` rather than `X mod n`.
///
/// ⚠ The only difference from `N` is the final nibble: `…D0364140` against
/// `…D0364141`. That is exactly the kind of digit an eye slides over, so it is
/// checked arithmetically rather than by reading — `n_minus_1_is_n_minus_one`
/// in this file's tests recomputes it by subtracting one from `N`.
const N_MINUS_1: U256 = U256([
    0xBFD2_5E8C_D036_4140,
    0xBAAE_DCE6_AF48_A03B,
    0xFFFF_FFFF_FFFF_FFFE,
    0xFFFF_FFFF_FFFF_FFFF,
]);

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
struct U256([u64; 4]);

impl U256 {
    const ZERO: U256 = U256([0; 4]);

    /// Shift left one bit, shifting `bit_in` into the least significant
    /// position. Returns the bit shifted out of the top.
    #[inline]
    fn shl1(&mut self, bit_in: u64) -> u64 {
        let mut carry = bit_in;
        for limb in self.0.iter_mut() {
            let out = *limb >> 63;
            *limb = (*limb << 1) | carry;
            carry = out;
        }
        carry
    }

    /// Wrapping subtraction. Returns the difference and a borrow of 1 when
    /// `self < other`.
    #[inline]
    fn sub(&self, other: &U256) -> (U256, u64) {
        let mut r = [0u64; 4];
        let mut borrow = 0u64;
        for i in 0..4 {
            let (d1, b1) = self.0[i].overflowing_sub(other.0[i]);
            let (d2, b2) = d1.overflowing_sub(borrow);
            r[i] = d2;
            borrow = (b1 as u64) | (b2 as u64);
        }
        (U256(r), borrow)
    }

    /// `mask` is all ones or all zeros. Returns `a` on all ones, `b` otherwise.
    #[inline]
    fn select(mask: u64, a: &U256, b: &U256) -> U256 {
        let mut r = [0u64; 4];
        for i in 0..4 {
            r[i] = (a.0[i] & mask) | (b.0[i] & !mask);
        }
        U256(r)
    }

    fn is_zero(&self) -> bool {
        self.0 == [0u64; 4]
    }

    /// `self + 1`, wrapping. Only ever called on a value already known to be
    /// at most `n − 2`, where it cannot wrap.
    #[inline]
    fn add1(&self) -> U256 {
        let mut r = self.0;
        let mut carry = 1u64;
        for limb in r.iter_mut() {
            let (v, c) = limb.overflowing_add(carry);
            *limb = v;
            carry = c as u64;
        }
        U256(r)
    }

    fn to_be_bytes(self) -> [u8; 32] {
        let mut out = [0u8; 32];
        for i in 0..4 {
            // limb 3 is most significant
            out[i * 8..(i + 1) * 8].copy_from_slice(&self.0[3 - i].to_be_bytes());
        }
        out
    }
}

/// A non-zero scalar in `[1, n-1]`.
///
/// The type carries the range guarantee: there is no way to construct one that
/// is zero or out of range, so no downstream caller has to re-check.
/// ⚠⚠ **NOT `Copy`, AND THAT IS THE WHOLE POINT — `REVIEW-032b`, `CLAIMS.md`
/// B-25.** A `Scalar` is a SECRET: `sk_A`, `r`, `ρ`, and every blinding factor
/// this crate derives. It was `Copy` with no `Drop`, so **every one of them was
/// left on the stack unwiped**, and `keygen::finish()`'s comment explained the
/// omission by calling this *"a `k256` type this crate does not own"*. ⚠ **It is
/// this crate's own type, thirty lines from the function that said so** (E-200).
///
/// ⚠ **`Copy` and `Drop` are MUTUALLY EXCLUSIVE in Rust**, so wiping on drop
/// required removing `Copy`. **Measured before it was written: removing `Copy`
/// gives ZERO compile errors** — every caller already takes `&Scalar` — so the
/// producer fix cost nothing, exactly as B-24's decoder fix did (E-196's
/// lesson, applied the right way round this time).
#[derive(Clone, PartialEq, Eq)]
pub struct Scalar([u8; 32]);

// ⚠ Hand-written rather than derived: `zeroize`'s derive macros live behind its
// `derive` feature, and the manifest carries `features = ["alloc"]`. Adding a
// proc-macro dependency to write these six lines is the worse trade.
impl zeroize::Zeroize for Scalar {
    fn zeroize(&mut self) {
        self.0.zeroize();
    }
}

impl Drop for Scalar {
    fn drop(&mut self) {
        use zeroize::Zeroize;
        self.0.zeroize();
    }
}

// The marker, so a `ZeroizeOnDrop` bound can be asserted in a test the way
// `xrpl.rs` asserts it for the ed25519 secret types.
//
// ⚠⚠ **WHAT THIS DOES AND DOES NOT REACH, stated HERE because this is where a
// reader forms the belief.** It wipes the bytes a live binding owns, when that
// binding is dropped. ⚠ **A Rust move is a `memcpy` and a moved-from source is
// NOT dropped**, so every hop a `Scalar` takes — out of `reduce_wide`, through a
// `Result`, into a tuple, out of `derive_pair` — can leave a copy behind that no
// destructor reaches. **`CLAIMS.md` B-22 already names *"the source of every
// move"* as a residual; it was named there and not here, and here is where it
// matters** (`REVIEW-033a` finding 1, `REVIEW-033c`). P-5 governs: this narrows
// a window and removes no channel.
impl zeroize::ZeroizeOnDrop for Scalar {}

impl Scalar {
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    pub fn to_hex_upper(&self) -> String {
        self.0.iter().map(|b| format!("{b:02X}")).collect()
    }
}

// A scalar is secret. Never let it into a log line by accident.
impl std::fmt::Debug for Scalar {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Scalar(<redacted>)")
    }
}

/// The zero case.
///
/// **`r`/`ρ` and sigma nonces: abort the attempt and never retry** — the input
/// is fresh entropy, so an abort costs one transaction and a retry over a
/// *derived* value would be a secret-dependent branch. **Keygen is different
/// and its reduction is total**, because its input is a fixed seed and an abort
/// would lock a holder out permanently. Architecture §4 records all three side
/// by side. Do not "fix" any of them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ZeroScalar;

/// Reduce 64 wide bytes modulo an arbitrary 256-bit modulus.
///
/// Big-endian Horner evaluation, one bit at a time: `acc = 2·acc + bit mod m`.
/// Because `acc < m` on entry to each step, `2·acc + bit < 2m`, so exactly one
/// conditional subtraction restores the range — done with a mask, not a branch.
///
/// The modulus is a parameter because the ruled derivations do not all use the
/// same one: `r`/`ρ` and the sigma nonces reduce modulo `n`, keygen modulo
/// `n − 1`. Sharing the loop means the constant-time argument above is made
/// once and holds for both, rather than being made twice and drifting.
/// ⚠⚠ **THE `diff` HALF OF B-25'S NAMED RESIDUAL IS NOW CLOSED, AND THE REASON
/// IT WAS LEFT OPEN WAS FALSE (`REVIEW-033c` finding 5, `CLAIMS.md` B-26).**
/// B-25 wrote that the residual was *"NOT fixed here deliberately"* because
/// `U256` *"is the constant-time arithmetic type … and removing `Copy` to add a
/// destructor would rewrite the routine"*. ⚠ **Every clause of that was true and
/// the conclusion did not follow: wiping a value does not require a destructor,
/// and only a destructor requires removing `Copy`.** `[u64; 4]` already
/// implements `zeroize::Zeroize`.
///
/// ⚠ **All three `REVIEW-033` legs reached that independently, and it is
/// E-181's and E-200's shape** — *"the crate's boundary, not an omission"*, *"a
/// `k256` type this crate does not own"* — **a plausible sentence standing in
/// for a measurement, written into the file that documents the fix for those
/// two.**
///
/// The wipe below is **unconditional and once per iteration**, so it is
/// data-independent: `Copy` is untouched, and `select`, `shl1`, `sub` and the
/// mask discipline are exactly as they were. **The routine was not rewritten.**
///
/// ⚠ **`acc` IS STILL A RESIDUAL and it is NOT the same one-liner.** It is
/// returned by value, so wiping it means moving the modulus-specific tail
/// (`is_zero`, `add1`, `to_be_bytes`) inside this function and changing what it
/// hands back — a change of ownership, not a line. **Same species as B-21's
/// `Sha512` block buffer and `serde_json`'s escape scratch: named, in scope for
/// a later decision, and not quietly dropped.** P-5 governs: this narrows a
/// window and removes no channel.
#[inline]
fn reduce_wide_mod(wide: &[u8; 64], m: &U256) -> U256 {
    let mut acc = U256::ZERO;

    for byte in wide.iter() {
        for shift in (0..8).rev() {
            let bit = ((*byte >> shift) & 1) as u64;

            // value = 2·acc + bit, held as (carry, acc) across 257 bits.
            let carry = acc.shl1(bit);

            // Subtract m when value >= m, i.e. when carry is set or acc >= m.
            let (mut diff, borrow) = acc.sub(m);
            // borrow == 1 means acc < m. Subtract when carry==1 or borrow==0.
            let should_sub = carry | (1 ^ borrow);
            let mask = 0u64.wrapping_sub(should_sub); // 1 -> all ones, 0 -> zero
            acc = U256::select(mask, &diff, &acc);
            // ⚠ `diff` is dead from here. Four fixed stores, every iteration,
            // taken whether or not the subtraction was selected — so this adds
            // no secret-dependent control flow and no branch. `REVIEW-033c`
            // finding 5; `CLAIMS.md` B-26.
            zeroize::Zeroize::zeroize(&mut diff.0);
        }
    }
    acc
}

/// Reduce 64 wide bytes modulo `n`.
///
/// Returns `Err(ZeroScalar)` when the result is zero. Probability ≈ 2⁻²⁵⁶; it
/// is handled because a construction with an unhandled case is not a
/// construction.
///
/// ⚠ **This is the `r`/`ρ` and sigma-nonce reduction, not keygen's.** See
/// [`reduce_wide_total`].
pub fn reduce_wide(wide: &[u8; 64]) -> Result<Scalar, ZeroScalar> {
    let acc = reduce_wide_mod(wide, &N);
    if acc.is_zero() {
        return Err(ZeroScalar);
    }
    Ok(Scalar(acc.to_be_bytes()))
}

/// Keygen's reduction: `sk = (X mod (n − 1)) + 1`. **Total — there is no error
/// case, and adding one would be a defect.**
///
/// `REVIEW-012-RULING-keygen-2026-08-18.md` §2.3, which is the only copy of the
/// construction and the authority if this comment ever disagrees with it.
///
/// # ⚠ Why this one cannot abort, when the other two must
///
/// [`reduce_wide`]'s callers derive from **fresh entropy**, so a zero result
/// costs one transaction and the caller retries with new entropy. Keygen's
/// input is a **fixed seed**. An abort would be deterministic and permanent:
/// that holder would abort forever, unable to participate in confidential
/// transfers at all, with no rotation and no recourse. Reducing modulo `n − 1`
/// and adding one removes the failure mode instead of handling it — the result
/// is in `[1, n − 1]` for every input, including all-zero and all-ones.
///
/// Architecture §4 carries all four randomness rules side by side. A future
/// reader who "corrects" this back to `mod n` with an abort will have made it
/// worse, and the ruling says so in as many words.
///
/// Bias is negligible: reducing a uniform 512-bit value modulo `n − 1 ≈ 2²⁵⁶`
/// leaves statistical distance below `2⁻²⁵⁶`.
pub fn reduce_wide_total(wide: &[u8; 64]) -> Scalar {
    // acc <= n − 2, so acc + 1 <= n − 1 and the add cannot carry out of 256
    // bits.
    Scalar(reduce_wide_mod(wide, &N_MINUS_1).add1().to_be_bytes())
}

#[cfg(test)]
mod modulus_tests {
    use super::*;

    /// The two moduli differ in one nibble. Recomputed rather than read.
    #[test]
    fn n_minus_1_is_n_minus_one() {
        let (diff, borrow) = N.sub(&U256([1, 0, 0, 0]));
        assert_eq!(borrow, 0, "n − 1 underflowed, which cannot happen");
        assert_eq!(diff, N_MINUS_1, "N_MINUS_1 is not N − 1");
    }

    /// The endpoints the ruling names, plus the boundary the `+ 1` protects.
    #[test]
    fn the_total_reduction_is_in_range_at_both_extremes() {
        let one = reduce_wide_total(&[0u8; 64]);
        assert_eq!(
            one.to_hex_upper(),
            "0000000000000000000000000000000000000000000000000000000000000001",
            "X = 0 must give sk = 1, not an abort"
        );

        let hi = reduce_wide_total(&[0xFFu8; 64]);
        assert_ne!(hi.as_bytes(), &[0u8; 32], "the total reduction produced zero");
        // sk <= n − 1 <=> sk − n borrows.
        let v = {
            let mut limbs = [0u64; 4];
            for (i, chunk) in hi.as_bytes().chunks(8).enumerate() {
                let mut b = [0u8; 8];
                b.copy_from_slice(chunk);
                limbs[3 - i] = u64::from_be_bytes(b);
            }
            U256(limbs)
        };
        let (_, borrow) = v.sub(&N);
        assert_eq!(borrow, 1, "the total reduction produced a value >= n");
    }

    /// `X = n − 2` is the largest input that must map to `n − 1`, and `X = n − 1`
    /// wraps back to `1`. Both are checked because an off-by-one in the modulus
    /// shows up here and nowhere else — every smaller input agrees under either
    /// modulus.
    #[test]
    fn the_wrap_point_is_where_the_ruling_puts_it() {
        let mut wide = [0u8; 64];
        wide[32..].copy_from_slice(&N.sub(&U256([2, 0, 0, 0])).0.to_be_bytes());
        assert_eq!(
            reduce_wide_total(&wide).as_bytes(),
            &N_MINUS_1.to_be_bytes(),
            "X = n − 2 must give sk = n − 1"
        );

        let mut wide2 = [0u8; 64];
        wide2[32..].copy_from_slice(&N_MINUS_1.to_be_bytes());
        assert_eq!(
            reduce_wide_total(&wide2).to_hex_upper(),
            "0000000000000000000000000000000000000000000000000000000000000001",
            "X = n − 1 must wrap to sk = 1"
        );
    }
}

#[cfg(test)]
mod wiping_tests {
    use super::*;

    /// ⚠ **The bound is the falsifier `REVIEW-032` wanted and `REVIEW-032b`
    /// showed was missing.** `keygen::finish()` binds `sk: Scalar` — the derived
    /// ElGamal secret — and B-24 left it `Copy` with no `Drop` while a comment
    /// said it was a foreign type that could not be wiped. `CLAIMS.md` E-200.
    ///
    /// ⚠ **This is a COMPILE-time check and it really does break.** Measured by
    /// removing `impl zeroize::ZeroizeOnDrop for Scalar`: E0277, the bound is
    /// not satisfied. That is what `Zeroizing`-around-a-binding could never give
    /// (E-179), and it is why the producer fix is the one worth having.
    #[test]
    fn a_scalar_wipes_on_drop() {
        fn wipes_on_drop<T: zeroize::ZeroizeOnDrop>(_: &T) {}
        wipes_on_drop(&reduce_wide_total(&[0xABu8; 64]));
    }

    /// ⚠ **The bound is a marker trait and a marker trait can LIE** — nothing
    /// stops `impl ZeroizeOnDrop` on a type whose `Drop` does nothing. So the
    /// bytes are read back after the destructor runs.
    ///
    /// ⚠⚠ **THE PREVIOUS VERSION OF THIS TEST WAS UNDEFINED BEHAVIOUR, AND ITS
    /// OWN DOC COMMENT CONDEMNED IT.** It said *"a test that is undefined
    /// behaviour proves nothing"* — about the naive drop-then-read version it
    /// replaced — and then took a `*const u8` from `held.as_bytes().as_ptr()`, a
    /// **shared** reference, called `ManuallyDrop::drop(&mut held)`, which
    /// retags **Unique** over the same bytes, and read through the stale
    /// pointer. **`ManuallyDrop` fixed the use-after-free and introduced an
    /// aliasing violation.** `REVIEW-033a` and `REVIEW-033b` both found it;
    /// neither could run Miri. `CLAIMS.md` E-202.
    ///
    /// ⚠ **MEASURED under both borrow models at `dee8570`:** Stacked Borrows —
    /// *"attempting a read access using `<525589>` … but that tag does not exist
    /// in the borrow stack"*; Tree Borrows — *"read access through `<518924>` …
    /// is forbidden"*. Miri names the chain: `SharedReadOnly` retag at the
    /// `as_ptr()`, invalidated by a `Unique` retag at the `drop`, read after.
    ///
    /// ⚠ **The `unsafe` that made it UB was never load-bearing.**
    /// `ManuallyDrop` already keeps the storage owned by this frame, so an
    /// ordinary `&self` read *after* the destructor is both sound and
    /// sufficient. That is all this now does.
    ///
    /// ⚠⚠ **A SOUND REPLACEMENT IS NOT AUTOMATICALLY A FALSIFIER, and that is
    /// why three candidates were measured rather than one reasoned.** A version
    /// that calls `Zeroize::zeroize` and reads back is Miri-clean, reads like
    /// this test, and **PASSES with `Drop::drop` emptied** — it exercises
    /// `Zeroize`, and the property at issue is `Drop`. **This version and
    /// [`dropping_a_scalar_through_a_raw_pointer_overwrites_its_bytes`] were
    /// both verified by emptying the destructor: both FAIL.**
    #[test]
    fn dropping_a_scalar_overwrites_its_bytes() {
        let s = reduce_wide_total(&[0xABu8; 64]);
        assert_ne!(s.as_bytes(), &[0u8; 32], "setup: the scalar must be non-zero");

        // `ManuallyDrop` keeps the storage owned by this frame. Nothing here
        // outlives it and no pointer is retained across the destructor.
        let mut held = std::mem::ManuallyDrop::new(s);

        // SAFETY: `held` is never used as a live `Scalar` again. Reading its
        // bytes after the destructor is reading owned, initialised storage.
        unsafe { std::mem::ManuallyDrop::drop(&mut held) };

        assert_eq!(held.as_bytes(), &[0u8; 32], "a dropped Scalar kept its bytes");
    }

    /// The same property through a **raw pointer**, because two constructions
    /// that must agree is the discipline the rest of this file already uses.
    ///
    /// ⚠ **The provenance discipline is the whole point:** the pointer is
    /// derived from `&mut *held` and the destructor is run **through that same
    /// pointer** with `ptr::drop_in_place`, so the read that follows shares its
    /// tag. Deriving it from `as_bytes()` instead is exactly the UB above.
    /// **MEASURED Miri-clean under Stacked Borrows and Tree Borrows.**
    #[test]
    fn dropping_a_scalar_through_a_raw_pointer_overwrites_its_bytes() {
        let s = reduce_wide_total(&[0xABu8; 64]);
        let mut held = std::mem::ManuallyDrop::new(s);

        let ptr: *mut Scalar = &mut *held;
        let storage = ptr as *const u8;
        // SAFETY: `ptr` points at 32 initialised bytes this frame owns.
        assert_ne!(unsafe { std::ptr::read_volatile(storage) }, 0, "setup is wrong");

        // SAFETY: run the destructor through the SAME pointer the reads use, so
        // the reads below are not through an invalidated tag. `held` is never
        // used as a live `Scalar` again and `ManuallyDrop` suppresses the
        // automatic second drop.
        unsafe { std::ptr::drop_in_place(ptr) };

        for i in 0..32 {
            // SAFETY: as above; the storage is still owned by this frame.
            let b = unsafe { std::ptr::read_volatile(storage.add(i)) };
            assert_eq!(b, 0, "byte {i} of a dropped Scalar survived");
        }
    }

    // ⚠⚠ **THERE IS NO THIRD TEST ASSERTING `Scalar` IS NOT `Copy`, AND THE
    // REASON IS THAT I WROTE ONE AND IT FALSE-PASSED.** `CLAIMS.md` E-201.
    //
    // It was a `Probe<T: Copy>` inherent const beside a blanket
    // `impl<T> NotCopy for T { const IS_COPY: bool = false; }`, read as
    // `<Scalar as NotCopy>::IS_COPY`. **The blanket impl always applies**, so
    // the const is always `false` and the `Copy` bound is never consulted.
    // ⚠ **Measured: restoring `Copy`, deleting `Drop` and deleting the marker —
    // the complete regression — left it reporting `ok`.**
    //
    // ⚠ **It was also unnecessary, which is why it is deleted rather than
    // repaired.** `Copy` and `Drop` are mutually exclusive, so regaining `Copy`
    // REQUIRES deleting the destructor, and deleting the destructor is what
    // `dropping_a_scalar_overwrites_its_bytes` fails on. **The property is
    // covered by the compiler plus the test above it; a third test only added a
    // false pass.**
    //
    // ⚠ **Written in the fix round for a finding about a gate that could not see
    // its own regression — E-193's shape, in a test written this session, by the
    // session that had just adjudicated it.**
}
