# REVIEW-030 — ROUND TWO: the B-22 fixes themselves

DO NOT USE ANY TOOLS — everything you need is inline below.

This project's rule: **two rounds, and the second reviews the FIXES.** Round one
(REVIEW-029) ruled the decision. This is the code that ruling produced. Nobody
has reviewed it. Its own history says why this round matters: the last time,
round two found a **false-pass mode in the regression test round one had
written**, plus two sentences that overstated what the fixes established.

## The ruling's six conditions, which the diff must satisfy

1. A `Zeroizing<[u8; 32]>` helper, NOT a slice of the 64-byte one.
2. `xrpl.rs:471`'s preimage is OUT of scope — its input is `root_pub || 0 || i`,
   a public key and two counters. `intermediate`, `root`, `sum`, `candidate` and
   the decoded seed arrays ARE in scope.
3. `check-zeroize-bounds` gains a part for these sites, verified by breaking it in
   BOTH directions, with its guarantee stated over a NAMED SET, not as completeness.
4. `tests/xrpl_vectors.rs` stays green untouched.
5. `keygen.rs`'s copy-not-move is fixed or registered.
6. Round two reviews the fixes. This is it.

## Standing constraints

- **P-5:** wiping **narrows a window and removes no channel**. No artifact may
  claim more. The SHA-512 block buffer, the source of every Rust move, and
  `serde_json`'s parse scratch are all unreachable.
- **A count in a fix report is a claim with no falsifier.** This project has got
  one wrong at least six times.
- **A revert that PASSES is a finding about the code, not a bad revert.**

## What you are asked — answer ALL, terse, most serious first

1. **Is there any defect in the CONSTRUCTION?** A secret that is now wiped in one
   path and not another; a wipe that does not happen; a behaviour change to the
   derived keys.
2. **Does part 5 of the gate actually falsify what it claims?** Look for the
   false-pass modes: a needle that matches something other than what it names, a
   control that cannot fail, a guarantee stated wider than the check.
3. **Does any PROSE in this diff claim more than the code delivers?** Comments,
   the register rows, the gate's own output text.
4. **Is condition 2 honoured correctly** — is `xrpl.rs`'s second closure genuinely
   safe to leave on the unwiped `sha512half`?
5. What did this diff MISS that is in the ruled scope?

---

## THE DIFF (complete, signer/ and tools/)

```diff
diff --git a/signer/src/keygen.rs b/signer/src/keygen.rs
index a446b77..bd11454 100644
--- a/signer/src/keygen.rs
+++ b/signer/src/keygen.rs
@@ -130,6 +130,26 @@ impl<const N: usize> Drop for Zeroizing<N> {
     }
 }
 
+/// Wipe a `Copy` array that was copied INTO a [`Zeroizing`], leaving the source live.
+///
+/// ⚠ **This exists because of a real defect, not for symmetry.** `let seed =
+/// Zeroizing(entropy)` on a `[u8; 16]` copies rather than moves, so the wrapper
+/// wipes its own copy and the original binding is untouched. Named so the call
+/// site says *why* it is there — a bare `.zeroize()` would read as belt-and-braces.
+pub trait ZeroizeSourceCopy {
+    fn zeroize_source_copy(&mut self);
+}
+
+impl<const N: usize> ZeroizeSourceCopy for [u8; N] {
+    fn zeroize_source_copy(&mut self) {
+        for b in self.iter_mut() {
+            // SAFETY: `b` is a live, aligned `u8` this value owns.
+            unsafe { std::ptr::write_volatile(b, 0) };
+        }
+        std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
+    }
+}
+
 impl<const N: usize> std::fmt::Debug for Zeroizing<N> {
     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
         write!(f, "Zeroizing<{N}>(<redacted>)")
@@ -216,9 +236,19 @@ fn derive_raw(
     expected_account_id: Option<&[u8; 20]>,
 ) -> Result<(KeyAlgorithm, [u8; 20], usize, Zeroizing<64>, Zeroizing<64>), KeygenError> {
     // ---- §2.1 Inputs, and what must be rejected before anything is hashed ---
-    let (entropy, algo) =
+    let (mut entropy, algo) =
         xrpl::decode_family_seed(family_seed).map_err(|e| KeygenError::Seed(e.to_string()))?;
+    // ⚠ **`Zeroizing(entropy)` IS A COPY, NOT A MOVE, AND THE ORIGINAL SURVIVED
+    // IT.** `[u8; 16]` is `Copy`, so wrapping it leaves `entropy` live and unwiped
+    // for the rest of this function — the wrapper wiped one of the two copies and
+    // this line read as though it had wiped the seed. Found by the `REVIEW-029`
+    // self leg; `REVIEW-029c` condition 5; `CLAIMS.md` B-22.
+    //
+    // ⚠ **THE GENERAL RULE, which is the part worth carrying: WRAPPING A `Copy`
+    // TYPE IN A ZEROIZING WRAPPER DOES NOT WIPE THE SOURCE.** It is not specific
+    // to this line and it is not specific to this crate's `Zeroizing`.
     let seed = Zeroizing(entropy);
+    entropy.zeroize_source_copy();
 
     // `decode_family_seed` returns exactly 16 bytes or an error, so
     // `len(seed_bytes) != 16` cannot reach here. The type is the check.
@@ -362,6 +392,30 @@ mod tests {
         }
     }
 
+    /// ⚠ **The defect this is named for: wrapping a `Copy` array in `Zeroizing`
+    /// COPIES it, and the source stays live and unwiped.**
+    ///
+    /// `REVIEW-029` self leg; `REVIEW-029c` condition 5; `CLAIMS.md` B-22. The
+    /// first half asserts the defect **still exists** — if `[u8; 16]` ever
+    /// stopped being `Copy` this test should fail rather than quietly pass and
+    /// leave `zeroize_source_copy` looking like belt-and-braces.
+    ///
+    /// ⚠ This tests the WIPE, on a live value. It does not and cannot test that
+    /// no copy survives elsewhere — P-5, and `sha512_zeroizing`'s note 3.
+    #[test]
+    fn wrapping_a_copy_array_leaves_the_source_and_the_helper_wipes_it() {
+        let mut entropy = [0xCDu8; 16];
+        let wrapped = Zeroizing(entropy);
+
+        // The wrapper holds its own copy; the source is untouched by the wrap.
+        assert_eq!(wrapped.0, [0xCDu8; 16]);
+        assert_eq!(entropy, [0xCDu8; 16], "the wrap moved rather than copied — re-read the call site");
+
+        entropy.zeroize_source_copy();
+        assert_eq!(entropy, [0u8; 16], "the source copy was not wiped");
+        assert_eq!(wrapped.0, [0xCDu8; 16], "wiping the source must not disturb the wrapper");
+    }
+
     /// The overwrite itself, on a live value.
     #[test]
     fn zeroize_overwrites_every_byte() {
diff --git a/signer/src/xrpl.rs b/signer/src/xrpl.rs
index 51bb370..0a5774b 100644
--- a/signer/src/xrpl.rs
+++ b/signer/src/xrpl.rs
@@ -242,6 +242,42 @@ fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
     out
 }
 
+/// `SHA512Half` over secret input, into a buffer that wipes itself.
+///
+/// **`CLAIMS.md` B-22, `REVIEW-029c` ruling item 2 and condition 1.** This exists
+/// because [`sha512_zeroizing`] is **not** a drop-in for [`sha512half`] and the
+/// B-22 decision request said it was. `REVIEW-029a` finding 1: the former returns
+/// 64 bytes and every derivation caller needs 32, so slicing one back down
+/// **recreates the bare `[u8; 32]` stack temporary the change exists to remove**.
+///
+/// ⚠ **[`sha512half`] IS NOT CHANGED AND MUST NOT BE.** Its callers split by input
+/// secrecy, and only the derivation ones move here:
+///
+/// | caller | preimage | secret? |
+/// |---|---|---|
+/// | `ed25519_from_entropy` | the master seed | **yes** — and the digest *is* the private key |
+/// | `from_entropy`'s first closure | `entropy ‖ i` | **yes** |
+/// | `from_entropy`'s second closure | `root_pub ‖ 0 ‖ i` | **no** — a curve point and two counters |
+/// | `sign_message_with`'s prehash | a public transaction | no |
+/// | `signing_digest`, `transaction_hash` | a public transaction | no |
+///
+/// ⚠ **The second closure is on that list because `REVIEW-029b` found the decision
+/// request had MISCLASSIFIED it as secret.** `root_pub` is a public key. ⚠ **But
+/// the leg's own consequence was too strong and is not inherited: `root_pub` is
+/// never published** — `AccountKey::public` is `sum·G`, not `root_pub` — so
+/// `intermediate` is not computable by an observer. **The INPUT there is public;
+/// the OUTPUT is still a private scalar**, and the output is wiped.
+///
+/// **P-5 governs this exactly as it governs B-21: it narrows a window and removes
+/// no channel.** The `Sha512` block buffer and the source of every move are
+/// untouched, for the reasons and with the recorded search at [`sha512_zeroizing`].
+fn sha512half_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 32]> {
+    let full = sha512_zeroizing(parts);
+    let mut out = Zeroizing::new([0u8; 32]);
+    out.copy_from_slice(&full[..32]);
+    out
+}
+
 /// `RIPEMD160(SHA256(x))` — the AccountID of a public key.
 pub fn account_id_of(pubkey: &[u8; 33]) -> [u8; 20] {
     let sha = Sha256::digest(pubkey);
@@ -442,7 +478,12 @@ impl AccountKey {
         if entropy.len() != 16 {
             return Err(XrplError::Length { what: "ed25519 seed", want: 16, got: entropy.len() });
         }
-        let sk = ed25519_dalek::SigningKey::from_bytes(&sha512half(entropy));
+        // ⚠ **`sha512half_zeroizing`, NOT `sha512half`: THIS EXPRESSION IS THE
+        // PRIVATE KEY.** XRPL's ed25519 derivation is `sk = SHA512Half(entropy)`,
+        // so the digest handed to `from_bytes` is the secret itself, not a
+        // precursor to it. `CLAIMS.md` B-22.
+        let sk_bytes = sha512half_zeroizing(&[entropy]);
+        let sk = ed25519_dalek::SigningKey::from_bytes(&sk_bytes);
         let mut public = [0u8; 33];
         public[0] = 0xED;
         public[1..].copy_from_slice(sk.verifying_key().as_bytes());
@@ -457,26 +498,45 @@ impl AccountKey {
     }
 
     pub fn from_entropy(entropy: &[u8]) -> R<AccountKey> {
+        // ⚠ The preimage carries the **master seed**, so both the heap buffer and
+        // the digest wipe. `Zeroizing<Vec<u8>>` wipes the Vec's contents on drop;
+        // ⚠ **it does not wipe anything a `Vec` reallocation left behind** — the
+        // capacity is reserved up front so no growth reallocation occurs here.
         let root = derive_scalar(|i| {
-            let mut m = entropy.to_vec();
+            let mut m = Zeroizing::new(Vec::with_capacity(entropy.len() + 4));
+            m.extend_from_slice(entropy);
             m.extend_from_slice(&(i as u32).to_be_bytes());
-            sha512half(&m)
+            sha512half_zeroizing(&[&m[..]])
         })?;
         let root_pub = {
             use k256::elliptic_curve::sec1::ToEncodedPoint;
             k256::PublicKey::from_secret_scalar(&root).to_encoded_point(true).as_bytes().to_vec()
         };
 
+        // ⚠ **DELIBERATELY STILL `sha512half`, AND THIS IS NOT AN OVERSIGHT.**
+        // The preimage is `root_pub ‖ 0 ‖ i` — a **public key** and two counters,
+        // carrying no secret. `REVIEW-029b` found the B-22 decision request had
+        // misclassified this call as secret input; `REVIEW-029c` condition 2 rules
+        // the buffer out of scope. ⚠ **The OUTPUT is still a private scalar**, and
+        // `derive_scalar` wipes it — so the digest is returned into a wiping
+        // buffer even though the input needed none.
         let intermediate = derive_scalar(|i| {
             let mut m = root_pub.clone();
             m.extend_from_slice(&0u32.to_be_bytes());
             m.extend_from_slice(&(i as u32).to_be_bytes());
-            sha512half(&m)
+            Zeroizing::new(sha512half(&m))
         })?;
 
+        // ⚠ **`sum` IS THE ACCOUNT PRIVATE KEY** and `sum.to_bytes()` is it
+        // serialised. Both wipe; `CLAIMS.md` B-22. ⚠ **`root` and `intermediate`
+        // are NOT wiped here and that is the crate's boundary, not an omission**:
+        // `k256::NonZeroScalar` implements `Zeroize` but has no `Drop`, so
+        // nothing runs on scope exit — see the note on `derive_scalar`.
         let sum: k256::Scalar = *root.as_ref() + *intermediate.as_ref();
-        let signing = SigningKey::from_bytes(&sum.to_bytes())
+        let mut sum_bytes = Zeroizing::new(sum.to_bytes());
+        let signing = SigningKey::from_bytes(&sum_bytes)
             .map_err(|e| XrplError::Key(format!("account scalar is not a valid key: {e}")))?;
+        sum_bytes.as_mut_slice().zeroize();
         let pubkey = signing.verifying_key().to_encoded_point(true);
         let mut public = [0u8; 33];
         public.copy_from_slice(pubkey.as_bytes());
@@ -891,7 +951,12 @@ impl k256::elliptic_curve::rand_core::CryptoRng for OneShotAux {}
 
 /// Decode an `sEd…` seed to its 16 bytes of entropy, checksum verified.
 pub fn decode_ed25519_seed(seed: &str) -> R<[u8; 16]> {
-    let raw = b58_decode(seed)?;
+    // ⚠ **`raw` carries the MASTER SEED on the heap.** `CLAIMS.md` B-22. The
+    // checksum `body` and the version prefix are slices of it, so wiping the one
+    // buffer covers all three reads. ⚠ **The `Sha256` digests below hash secret
+    // input and their own block buffers are NOT reachable** — the same residual
+    // `sha512_zeroizing` names, with the same recorded search.
+    let raw = Zeroizing::new(b58_decode(seed)?);
     if raw.len() != 3 + 16 + 4 {
         return Err(XrplError::Length { what: "ed25519 seed", want: 23, got: raw.len() });
     }
@@ -927,21 +992,32 @@ pub fn decode_family_seed(seed: &str) -> R<([u8; 16], KeyAlgorithm)> {
     if seed.starts_with("sEd") {
         return Ok((decode_ed25519_seed(seed)?, KeyAlgorithm::Ed25519));
     }
-    let entropy = base58check_decode(seed, VER_FAMILY_SEED)?;
+    // ⚠ **Heap copy of the MASTER SEED.** `CLAIMS.md` B-22.
+    let entropy = Zeroizing::new(base58check_decode(seed, VER_FAMILY_SEED)?);
     if entropy.len() != 16 {
         return Err(XrplError::Length { what: "family seed", want: 16, got: entropy.len() });
     }
     let mut out = [0u8; 16];
     out.copy_from_slice(&entropy);
+    // ⚠ **`out` IS RETURNED, so it is a MOVE and the source is not wiped.** That
+    // residual is stated rather than hidden: `sha512_zeroizing` note 2, and P-5.
     Ok((out, KeyAlgorithm::Secp256k1))
 }
 
 /// The rejection loop both derivation stages share: increment until the
 /// candidate is a valid non-zero scalar below the group order.
-fn derive_scalar<F: Fn(u32) -> [u8; 32]>(f: F) -> R<k256::NonZeroScalar> {
+/// ⚠ **`CLAIMS.md` B-22.** The closure now returns a `Zeroizing<[u8; 32]>`, so
+/// **every rejected candidate wipes at the end of its own iteration** rather than
+/// leaving one 32-byte private-scalar candidate per rejection in the frame. The
+/// accepted one wipes when `candidate` drops at the `return`.
+///
+/// ⚠ **`k256::SecretKey` owns the surviving copy from there on**, and its own
+/// `Drop` zeroizes — that is the crate's, verified by `REVIEW-027b` for the
+/// sibling case, **not** something this signer does.
+fn derive_scalar<F: Fn(u32) -> Zeroizing<[u8; 32]>>(f: F) -> R<k256::NonZeroScalar> {
     for i in 0u32..=u32::MAX {
         let candidate = f(i);
-        if let Ok(sk) = k256::SecretKey::from_slice(&candidate) {
+        if let Ok(sk) = k256::SecretKey::from_slice(&*candidate) {
             return Ok(sk.to_nonzero_scalar());
         }
     }
diff --git a/tools/check-zeroize-bounds.py b/tools/check-zeroize-bounds.py
index aed07a0..a5d14dc 100755
--- a/tools/check-zeroize-bounds.py
+++ b/tools/check-zeroize-bounds.py
@@ -163,6 +163,20 @@ REVERTS = [
 }""",
    "the ed25519 SHA-512 expansion `h` and the nonce mask"),
 
+  # ---- B-22 / REVIEW-029c condition 3 -------------------------------------
+  # ⚠ VERIFIED TO BREAK BEFORE BEING WRITTEN HERE: 2 compile errors. It bites
+  # through `derive_scalar`'s `Fn(u32) -> Zeroizing<[u8; 32]>` bound, NOT at
+  # `ed25519_from_entropy` — `from_bytes(&x)` accepts either form, so that call
+  # site alone would have false-passed (E-164's shape, found before shipping).
+  ("`sha512half_zeroizing` returns a bare array (the DERIVED PRIVATE KEY)",
+   """fn sha512half_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 32]> {
+    let full = sha512_zeroizing(parts);
+    let mut out = Zeroizing::new([0u8; 32]);""",
+   """fn sha512half_zeroizing(parts: &[&[u8]]) -> [u8; 32] {
+    let full = sha512_zeroizing(parts);
+    let mut out = ([0u8; 32]);""",
+   "the ed25519 private key and the secp256k1 root preimage digest"),
+
   ("`fresh_aux` returns a bare array (the drawn auxiliary entropy)",
    """fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
     let mut b = Zeroizing::new([0u8; 32]);
@@ -408,13 +422,89 @@ else:
     print("  ⚠ VOID: the control was NOT detected. Part 4 is blind.")
     bad += 1
 
+# ---------------------------------------------------------------------------
+# Part 5 - the B-22 derivation sites that NO type revert can catch
+#
+# ⚠ **WHY THIS PART EXISTS, AND IT IS AN EMPIRICAL RESULT, NOT A PRECAUTION.**
+# Before writing it, each B-22 site was reverted by hand and the build re-run.
+# `sha512half_zeroizing`'s return type breaks the build (2 errors, now part 2's
+# newest revert). **Wrapping an existing binding in `Zeroizing` does NOT**:
+# reverting `Zeroizing::new(base58check_decode(..))` back to the bare call gave
+# **ZERO errors**, because `Zeroizing<T>` derefs to `T` and every use site -
+# `.len()`, `split_at`, indexing - compiles identically either way.
+#
+# **So for these sites a compile-time falsifier does not exist**, and part 2's
+# machinery applied to them would have been a false pass of exactly the shape
+# `CLAIMS.md` E-164 records. A source check is the honest instrument.
+#
+# ⚠⚠ **WHAT THIS PART DOES NOT SAY, because `REVIEW-029a` finding 4 was right:**
+# a gate pins the sites it NAMES. **It cannot establish that no unlisted
+# secret-bearing site exists anywhere in the crate.** The B-22 decision request
+# claimed it could and that was a category error. The guarantee below is over a
+# **NAMED SET**, the same narrowing `check-test-support` and `check-blinding`
+# carry (E-142).
+B22_SITES = [
+  ("signer/src/xrpl.rs", "Zeroizing::new(b58_decode(seed)?)",
+   "the ed25519 master seed on the heap"),
+  ("signer/src/xrpl.rs", "Zeroizing::new(base58check_decode(seed, VER_FAMILY_SEED)?)",
+   "the family-seed master seed on the heap"),
+  ("signer/src/xrpl.rs", "let mut sum_bytes = Zeroizing::new(sum.to_bytes());",
+   "the serialised secp256k1 ACCOUNT PRIVATE KEY"),
+  ("signer/src/xrpl.rs", "sum_bytes.as_mut_slice().zeroize();",
+   "the explicit wipe of that key after `from_bytes` copied it"),
+  ("signer/src/xrpl.rs", "let sk_bytes = sha512half_zeroizing(&[entropy]);",
+   "the ed25519 private key - the digest IS the key"),
+  ("signer/src/xrpl.rs", "let mut m = Zeroizing::new(Vec::with_capacity(entropy.len() + 4));",
+   "the secp256k1 root preimage, which carries the master seed"),
+  # ⚠ The needle is the two-line PRODUCTION sequence, not the bare call. The
+  # bare call also appears in `wrapping_a_copy_array_..`, so a lone-call needle
+  # counted 2 and this part failed the moment its own test landed — a gate
+  # reporting a number was claiming "the production site" and counting every
+  # occurrence, which is E-141's lesson landing on this file the day it was
+  # written. Pinning the sequence says what it means.
+  ("signer/src/keygen.rs",
+   "let seed = Zeroizing(entropy);\n    entropy.zeroize_source_copy();",
+   "the Copy source `Zeroizing(entropy)` left live, at the PRODUCTION site (REVIEW-029c condition 5)"),
+]
+
+print("\nPart 5 - the B-22 derivation sites a type revert cannot reach")
+missing = []
+for path, needle, why in B22_SITES:
+    text = open(path).read()
+    n = text.count(needle)
+    if n == 1:
+        print(f"  present   {why}")
+    else:
+        print(f"  \u26a0 MISSING ({n}x)  {why}\n              expected in {path}: {needle}")
+        missing.append((path, needle))
+bad += len(missing)
+
+# ⚠ The control, in BOTH directions - E-165: both of B-21's gates false-passed
+# before they worked, and one certified a literal as a gated symbol.
+_absent = "Zeroizing::new(this_call_does_not_exist(seed)?)"
+if any(_absent in open(f).read() for f in {p for p, _, _ in B22_SITES}):
+    print("  \u26a0 VOID: the negative control string is actually present. Part 5 is blind.")
+    bad += 1
+else:
+    print("  CONTROL(-): a site that is NOT in the tree is reported missing  OK")
+
+_present = B22_SITES[0][1]
+if open(B22_SITES[0][0]).read().count(_present) == 1:
+    print("  CONTROL(+): a site that IS in the tree is reported present  OK")
+else:
+    print("  \u26a0 VOID: the positive control did not match. Part 5 is blind.")
+    bad += 1
+
 print("\n" + "-" * 106)
 if bad:
     print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
 else:
     print(f"PASS: {len(PROBES)} feature probes, {len(REVERTS)} reverts, the known-spelling")
-    print(f"      call-site regression check and the live-prose scan all landed as")
-    print(f"      declared, with a control in every direction.")
+    print(f"      call-site regression check, the live-prose scan and {len(B22_SITES)} B-22")
+    print(f"      derivation sites all landed as declared, with a control in every direction.")
+    print("\u26a0 Part 5's guarantee is over a NAMED SET of sites, NOT over the crate's whole")
+    print("  secret-bearing surface. A derivation site added later and not listed there is")
+    print("  invisible to it - REVIEW-029a finding 4, and the same narrowing E-142 forced.")
 print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
 print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
 print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")
```
