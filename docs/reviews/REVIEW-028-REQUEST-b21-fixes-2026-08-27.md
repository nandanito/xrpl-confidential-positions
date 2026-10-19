# REVIEW-028 — REQUEST: round TWO, the FIXES to REVIEW-027

**Date:** 2026-08-27. **Frozen commit:** `d535589`. **Parent:** `d8eb7a3`.

⚠ **YOU ARE REVIEWING THE FIXES, NOT THE ORIGINAL WORK.** Round one found nine
things; this round asks whether the repairs are real. `CLAUDE.md`'s rule is that
**fixing something and describing the fix are separate acts with separate failure
modes**, and only a fresh reviewer catches the second kind. Every previous round
two in this project has found something, and it has never been the construction.

⚠ **Do not use tools if you have none. Do not re-open B-21's construction** — six
independent leg-readings across three rounds have found no defect in it.

⚠ **ROUND ONE'S OWN SIGNATURE FAILURE, which you should assume recurs here:** the
commit that corrected a false claim **wrote two fresh copies of that same false
claim** in new prose (E-172). The claim was *"B-19 turned `ed25519-dalek`'s
`zeroize` feature on"*; the truth is that the feature was **always on**
(`std → alloc → "zeroize/alloc"`, no `?` sigil), verified by `cargo build -vv`
showing `rustc` receives `--cfg 'feature="zeroize"'`. **Assume the fixes for that
introduced another copy.**

---

## What round one found and what was done

| # | Finding | Fix claimed |
|---|---|---|
| 1 | **HIGH.** The test and `check-zeroize-bounds` part 2 were both blind to `sign_with_aux`'s call sites — inlining `Sha512::digest` left 267 tests green AND part 2 reporting `OK`. | New **part 3**: a source check that the Ed25519 arm contains no `Sha512::digest`/`Sha512::new` and calls `sha512_zeroizing`, with its own control. Test renamed `the_wiping_helpers_return_types_wipe_on_drop`. |
| 2 | The false B-19 premise survived in `signer/Cargo.toml:26-34`, and was **freshly written** into `Cargo.toml:36-38` and `xrpl.rs:192-196` by the correcting commit. | All four live sites rewritten, false sentence quoted in place. `docs/reviews/` deliberately untouched (historical record). |
| 3 | `sha512_zeroizing`'s headline *"leaving no unwiped digest behind"* contradicted its own note 2 twelve lines below. | Headline now names the two wipes it performs. |
| 4 | The key-derivation path (`sha512half` over `entropy` **is** the ed25519 private key) is unwiped; both legs called the scope boundary arbitrary. | **Filed as B-22, not fixed.** Dissent recorded. |
| 5 | `AccountKey`/`Inner` unwiped. | **Rejected** — refuted by the other leg via drop glue. |
| 6 | E-171 is false / B-19 was right. | **Rejected → E-174**, refuted by `cargo build -vv`. |
| 7 | Two of part 2's reverts are caught by `(type)` not `(bound)`. | Upheld as a disclosed limitation. No change. |
| 8 | No Devnet run after a change on the default signing path. | **Still open.** |
| 9 | The packet was too large and one leg truncated it. | Round two's packet is smaller — see the bound below. |

---

## THE QUESTIONS

**1. Does part 3 actually close finding 1, and can it false-pass?** Consider: what
if `ed25519_arm_of_sign_with_aux` returns an empty string or the wrong span? What
if a hash is spelled some other way? Is its control sufficient?

**2. Did the fixes for finding 2 introduce ANOTHER copy of the false claim?** This
is round one's own signature failure. Read every new sentence about B-19 or
`zeroize` in the diff and say whether each is true.

**3. Is anything in the NEW prose overstated?** `CLAIMS.md` P-5: never claim more
security than is delivered. The intended claim is *"narrows a window, removes no
channel"*.

**4. Is B-22 an honest deferral or scope-avoidance wearing a register row?** Both
round-one legs said the boundary was arbitrary. It was filed rather than fixed.

**5. Is the renamed test now accurately named**, and does anything still reference
the old name outside `docs/reviews/`?

**6. Anything else**, including anything wrong with this packet.

---

## ⚠ DECLARED BOUND

`signer/tests/hedged_signing.rs` (42 KB) changed by **one doc comment** in this
commit; its hunk is in the diff below and the file is not reproduced whole.
`CLAIMS.md` is 279 KB; rows E-171 to E-174 and B-21/B-22 are quoted. **Both are
excerpts and are declared as such** — an over-large packet bounds a leg exactly
as an excerpt does, which is round one's finding 9.

---

## THE DIFF — d8eb7a3 → d535589 (signer/ and tools/)

```diff
diff --git a/signer/Cargo.toml b/signer/Cargo.toml
index ae16341..0139a0c 100644
--- a/signer/Cargo.toml
+++ b/signer/Cargo.toml
@@ -23,19 +23,26 @@ ripemd = "0.1"
 # size: `src/lib.rs:268-271` compiles the module either way and the feature gates
 # only its publicity.
 #
-# `zeroize` — **B-19**, decided 2026-08-27, and **not** for B-16's reasons. It is
-# a crate DEFAULT (`default = ["fast", "std", "zeroize"]`) that
-# `default-features = false` turned off by accident, copied from the `k256` line
-# above where the same two words are harmless because `elliptic-curve` makes
-# `zeroize` mandatory rather than default. Without it `ExpandedSecretKey` and
-# `SigningKey` are not wiped on drop, while `hazmat.rs:39` promises
-# unconditionally that they are. ⚠ **`fast` stays off** — a speed trade with no
-# security content, and re-enabling it is not that decision.
-# `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.
+# `zeroize` — **B-19**, decided 2026-08-27. ⚠⚠ **THIS COMMENT ASSERTED THAT THE
+# FEATURE WAS OFF AND THAT IS FALSE — `CLAIMS.md` E-171.** It read: *"a crate
+# DEFAULT that `default-features = false` turned off by accident … without it
+# `ExpandedSecretKey` and `SigningKey` are not wiped on drop"*. The feature was
+# **already on**: `std = ["alloc", ..]` and `alloc` lists `"zeroize/alloc"`
+# without the `?` sigil that `serde?/alloc` beside it carries. Verified by
+# reading the `--cfg` flags rustc actually receives — a crate depending on
+# nothing but `ed25519-dalek` at `features = ["std"]` compiles its `lib.rs` with
+# `--cfg 'feature="zeroize"'`.
+#
+# **Naming it here is still right**: an implied feature is one upstream refactor
+# from vanishing, and `make check-zeroize-bounds` now pins it. ⚠ **`fast` stays
+# off** — a speed trade with no security content, and re-enabling it is not that
+# decision. `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.
 ed25519-dalek = { version = "2", default-features = false, features = ["std", "hazmat", "zeroize"] }
-# `zeroize` as a DIRECT dependency — **B-21**, 2026-08-27. B-19 turned the
-# `ed25519-dalek` feature on, which gives `SigningKey` and `ExpandedSecretKey`
-# real `Drop` impls (`hazmat.rs:67-76`, verified at source). That reaches the
+# `zeroize` as a DIRECT dependency — **B-21**, 2026-08-27. `SigningKey` and
+# `ExpandedSecretKey` have real `Drop` impls (`hazmat.rs:67-76`, read at source)
+# — ⚠ **because the feature was always on, NOT because B-19 turned it on;
+# this sentence said the latter in the same commit that corrected it elsewhere
+# (E-171, E-172).** That reaches the
 # crate's *types* and nothing else: the SHA-512 expansion this signer computes
 # itself, the nonce mask, the auxiliary entropy buffer and the ECDSA aux RNG are
 # plain locals in `xrpl.rs` that no `Drop` touches. Both `REVIEW-025` legs
diff --git a/signer/src/xrpl.rs b/signer/src/xrpl.rs
index e1c45f8..4a748b6 100644
--- a/signer/src/xrpl.rs
+++ b/signer/src/xrpl.rs
@@ -187,13 +187,21 @@ pub fn sha512half(data: &[u8]) -> [u8; 32] {
     out
 }
 
-/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.
+/// SHA-512 into a buffer that wipes itself, and wipe the `Output` it came from.
+///
+/// ⚠ **This headline read *"leaving no unwiped digest behind"* and note 2 below
+/// contradicted it twelve lines later** — returning the buffer is a move, and a
+/// move leaves its source unwiped. Both `REVIEW-027` external legs are why the
+/// headline now describes the two wipes it performs rather than an absence it
+/// cannot deliver.
 ///
 /// **`CLAIMS.md` B-21.** `Sha512::digest(..)` returns an `Output<Sha512>` — a
 /// `GenericArray` that implements no `Drop` — so over secret input it leaves 64
-/// bytes in a stack frame that the next call reuses. B-19 gave `SigningKey` and
-/// `ExpandedSecretKey` real `Drop` impls (`hazmat.rs:67-76`, read at source);
-/// it reached the crate's *types* and nothing this signer hashes itself.
+/// bytes in a stack frame that the next call reuses. `SigningKey` and
+/// `ExpandedSecretKey` do have real `Drop` impls (`hazmat.rs:67-76`, read at
+/// source) — ⚠ **because `ed25519-dalek`'s `zeroize` feature was always on, not
+/// because B-19 turned it on (E-171)** — but that reaches the crate's *types*
+/// and nothing this signer hashes itself.
 ///
 /// The `Output` is copied out and then **explicitly zeroized**, through
 /// `zeroize`'s `impl Zeroize for [Z]` rather than `GenericArray`'s own. That is
@@ -589,8 +597,9 @@ impl AccountKey {
                 // of RFC 8032 but the same expression.
                 // ⚠ `as_bytes`, not `to_bytes`: `to_bytes` returns the secret
                 // **by value** (`signing.rs:114`) and that copy is a stack local
-                // no `Drop` reaches — in the same commit that enabled `zeroize`
-                // so secret material would be wiped. `REVIEW-025`, self leg.
+                // no `Drop` reaches. ⚠ This said *"in the same commit that
+                // enabled `zeroize`"*; that commit made an already-enabled
+                // feature explicit (E-171). `REVIEW-025`, self leg.
                 //
                 // ⚠ **`h` and `mask` were the same class and are now wiped —
                 // B-21, 2026-08-27.** [`sha512_zeroizing`] returns a buffer with
@@ -1442,7 +1451,19 @@ mod aux_tests {
         rng.fill_bytes(&mut out);
     }
 
-    /// **B-21's falsifier, and it is a COMPILE-TIME one on purpose.**
+    /// **B-21's falsifier for the TYPES, and a COMPILE-TIME one on purpose.**
+    ///
+    /// ⚠⚠ **RENAMED from `the_signing_helpers_secret_locals_wipe_on_drop`, which
+    /// overstated it and both `REVIEW-027` external legs said so (E-173).** It
+    /// does not exercise [`AccountKey::sign_with_aux`] at all — it calls the
+    /// three helpers directly. **Verified by execution:** inlining
+    /// `Sha512::digest` back into `sign_with_aux` leaves this test green, all
+    /// 267 tests green, **and `check-zeroize-bounds` part 2 still reporting
+    /// OK**, because the helper survives and the test still calls it.
+    ///
+    /// **What closes that hole is `check-zeroize-bounds` part 3**, a source
+    /// check that the Ed25519 arm hashes only through `sha512_zeroizing` — no
+    /// type can express "this call site must use that function".
     ///
     /// `REVIEW-025` considered a runtime *"is the buffer zero now?"* assertion
     /// for B-19 and **rejected it**: reading a stack slot after its frame is
@@ -1463,10 +1484,11 @@ mod aux_tests {
     /// the three residues that remain, and P-5 for why an adversary with code
     /// execution is unaffected either way.
     #[test]
-    fn the_signing_helpers_secret_locals_wipe_on_drop() {
+    fn the_wiping_helpers_return_types_wipe_on_drop() {
         fn wipes_on_drop<T: zeroize::ZeroizeOnDrop>(_: &T) {}
 
-        // `sha512_zeroizing` — the ed25519 expansion `h` and the nonce mask.
+        // `sha512_zeroizing` — what the ed25519 expansion `h` and the nonce
+        // mask are built from. ⚠ That `sign_with_aux` USES it is part 3's job.
         wipes_on_drop(&sha512_zeroizing(&[b"probe"]));
 
         // `fresh_aux` — the drawn auxiliary entropy.
diff --git a/signer/tests/hedged_signing.rs b/signer/tests/hedged_signing.rs
index 677a18d..3614d2e 100644
--- a/signer/tests/hedged_signing.rs
+++ b/signer/tests/hedged_signing.rs
@@ -833,8 +833,15 @@ fn the_construction_matches_a_second_model() {
 /// with code execution reads the scalar while it is live regardless.
 /// ⚠ **B-21's locals are NOT checked here** — `sha512_zeroizing`, `fresh_aux`
 /// and `OneShotAux` are all private, so their bounds are named in
-/// `xrpl::aux_tests::the_signing_helpers_secret_locals_wipe_on_drop`, in-crate,
+/// `xrpl::aux_tests::the_wiping_helpers_return_types_wipe_on_drop`, in-crate,
 /// and reverted for real by `make check-zeroize-bounds` part 2.
+///
+/// ⚠ **That test checks the TYPES, not that the signing path uses them** —
+/// `check-zeroize-bounds` **part 3** is what checks the call sites, and it
+/// exists because both `REVIEW-027` external legs found parts 1 and 2 blind to
+/// them (E-173). ⚠ This sentence named the pre-rename test for one commit,
+/// which is `REVIEW-026` finding 12's shape — *renamed the test, not its
+/// references* — caught here by grepping for the phrase rather than the line.
 #[test]
 fn ed25519_secret_types_implement_zeroize_on_drop() {
     fn requires_zeroize_on_drop<T: zeroize::ZeroizeOnDrop>() {}
diff --git a/tools/check-zeroize-bounds.py b/tools/check-zeroize-bounds.py
index 79c2fb6..6984ee3 100755
--- a/tools/check-zeroize-bounds.py
+++ b/tools/check-zeroize-bounds.py
@@ -2,8 +2,8 @@
 """
 Wiping-type gate — `CLAIMS.md` **B-19**, **B-21** and **E-171**.
 
-Two questions, both answered by making a compiler decide rather than by reading
-a manifest:
+Three questions. The first two are answered by making a compiler decide rather
+than by reading a manifest; the third cannot be, and says so:
 
   **Part 1 — is `ed25519-dalek`'s `zeroize` feature on, and what turns it on?**
   Scratch-crate probes, one per feature set, each naming the `ZeroizeOnDrop`
@@ -13,6 +13,11 @@ a manifest:
   **Part 2 — do the signer's own secret locals wipe?** In-tree reverts to bare
   arrays, each of which must break the build.
 
+  **Part 3 — does the SIGNING HELPER actually use the wiping helper?** A source
+  check, because no type can express it. ⚠ **Added after both `REVIEW-027`
+  external legs found parts 1 and 2 are blind to it** (E-173): inlining
+  `Sha512::digest` back into `sign_with_aux` leaves every other check green.
+
 ⚠ **PART 1 EXISTS BECAUSE B-19 WAS WRONG, AND THIS SCRIPT IS WHAT FOUND IT
 (E-171).** `CLAIMS.md` E-167 said the `zeroize` feature *"was OFF, by accident,
 for nine days"* and the B-19 decision said *"reverting the manifest line fails to
@@ -183,9 +188,17 @@ impl OneShotAux {
    "the same drawn bytes, held across `sign_prehash_with_rng`"),
 ]
 
-CONTROL = ("CONTROL — a comment edited inside the signing helper. Must still BUILD.",
-           "/// SHA-512 into a buffer that wipes itself, leaving no unwiped digest behind.",
-           "/// SHA-512 into a buffer that wipes itself. (negative control edit)")
+# ⚠ **Anchored on a STRUCTURAL line, not on prose.** Its first form patched the
+# `sha512_zeroizing` doc headline — and a `REVIEW-027` fix rewrote that headline,
+# so the control reported VOID and took the whole gate down with it. A control
+# that breaks whenever someone edits a comment is a control that will be
+# loosened, which is how `check-test-support-gate` acquired E-165.
+CONTROL = ("CONTROL — a no-op line added inside the wiping helper. Must still BUILD.",
+           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
+    let mut hasher = Sha512::new();""",
+           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
+    let _negative_control = ();
+    let mut hasher = Sha512::new();""")
 
 print("\nPart 2 — the signer's own secret locals, decided by reverting them")
 print("  baseline: the unmodified tree must build its tests ...")
@@ -232,12 +245,76 @@ for name, old, new, register in REVERTS:
     print(f"  {'build broke  OK (' + mech + ')':<24} {name}\n    {register}")
 restore()
 
+# ---------------------------------------------------------------------------
+# Part 3 - does the SIGNING HELPER actually use the wiping helper?
+#
+# ⚠ **BOTH `REVIEW-027` EXTERNAL LEGS FOUND THAT PARTS 1 AND 2 MISS THIS, AND
+# THEY ARE RIGHT (CLAIMS.md E-173).** Part 2 mutates `sha512_zeroizing`'s
+# RETURN TYPE, and the in-crate test calls `sha512_zeroizing` DIRECTLY. So if
+# `sign_with_aux` stopped calling it and inlined `Sha512::digest(..)` again, the
+# helper would still exist, the test would still name its bound, part 2's revert
+# would still break the build - and the signing path would be back to unwiped
+# digests with every check green.
+#
+# **A type cannot express "this call site must use that function", so this is a
+# SOURCE-level check** - the same shape as `check-blinding-sources.ts`, which
+# gates which call sites may reach the superseded generator.
+#
+# ⚠ **It is a check over a KNOWN SPELLING, not over reachability.** A hash
+# assembled some other way is invisible to it, exactly as `check-blinding`'s own
+# header says of itself (E-142). Stated because the alternative is a false
+# guarantee.
+def ed25519_arm_of_sign_with_aux(text):
+    """The Ed25519 match arm inside `sign_with_aux`, or None if not locatable."""
+    i = text.find("fn sign_with_aux(")
+    if i < 0:
+        return None
+    j = text.find("Inner::Ed25519(k) =>", i)
+    if j < 0:
+        return None
+    k = text.find("\n        }\n    }\n}", j)
+    return text[j:k if k > 0 else len(text)]
+
+print("\nPart 3 - the signing helper must hash THROUGH the wiping helper")
+restore()
+src = open(XRPL).read()
+arm = ed25519_arm_of_sign_with_aux(src)
+if arm is None:
+    print("  VOID: could not locate the Ed25519 arm of `sign_with_aux`.")
+    bad += 1
+else:
+    BANNED = ("Sha512::digest", "Sha512::new")
+    stray = [b for b in BANNED if b in arm]
+    uses_helper = "sha512_zeroizing(" in arm
+    if stray or not uses_helper:
+        print(f"  ⚠ FALSE: the Ed25519 arm {'contains ' + ', '.join(stray) if stray else 'does not call sha512_zeroizing'}.")
+        print("    Every hash over secret input on the signing path must go through")
+        print("    `sha512_zeroizing`, or its digest is an unwiped stack local again.")
+        bad += 1
+    else:
+        n = arm.count("sha512_zeroizing(")
+        print(f"  no stray `Sha512::` in the arm, and {n} call(s) to `sha512_zeroizing`  OK")
+
+    # ⚠ The control: the check must DETECT the inlining it exists to forbid.
+    # Without this, "no stray Sha512" could mean the locator returned an empty
+    # string - which is E-165's false pass exactly.
+    mutated = arm.replace("sha512_zeroizing(&[k.as_bytes()])",
+                          "Sha512::digest(k.as_bytes())")
+    if mutated == arm:
+        print("  VOID: the control could not be applied - the expected call site moved.")
+        bad += 1
+    elif any(b in mutated for b in BANNED):
+        print("  CONTROL: inlining `Sha512::digest` at the call site IS detected  OK")
+    else:
+        print("  ⚠ VOID: the control was applied and NOT detected. This check is blind.")
+        bad += 1
+
 print("\n" + "-" * 106)
 if bad:
     print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
 else:
-    print(f"PASS: {len(PROBES)} feature probes and {len(REVERTS)} reverts all landed as declared,")
-    print(f"      with a control in each direction.")
+    print(f"PASS: {len(PROBES)} feature probes, {len(REVERTS)} reverts and the call-site check")
+    print(f"      all landed as declared, with a control in each direction.")
 print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
 print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
 print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")

```


## CLAIMS.md rows, complete

```
| E-171 | ⚠⚠ **B-19's PREMISE AND B-19's GATE WERE BOTH FALSE, AND THE THING THAT FOUND IT WAS BUILDING THE GATE B-19 SAID IT HAD.** E-167 said `ed25519-dalek`'s `zeroize` feature *"was OFF, by accident, for nine days"*; the decision said *"reverting the manifest line fails to COMPILE"*. **Neither is true.** The historical line at `16e2e58` — `default-features = false, features = ["std"]` — resolves to **`alloc,std,zeroize`**, because `std = ["alloc", ..]` and `alloc = [.., "zeroize/alloc", ..]` **omits the `?` sigil** that the `serde?/alloc` entry two lines above it carries. `ExpandedSecretKey` and `SigningKey` were wiped on drop the whole time, and removing the word `zeroize` from our manifest **still builds today**. ⚠ **`alloc` is the switch, not `std`** — probed separately. ⚠ **THE SHAPE, AND IT IS THIS PROJECT'S OWN, LANDING ON ITS OWN GATE-BUILDING RULE:** E-165 and E-168 both say *verify a gate by breaking it*, and B-19's gate was **asserted in three documents and never once executed** — the register row, the decision, and a test doc comment all describing a compile failure nobody had produced. ⚠ **Three `REVIEW-025` legs and a `REVIEW-026` round accepted it**, because **reading a manifest is not running one**, and a feature-resolution claim has no falsifier that reading can supply. ⚠⚠ **AND ROUND TWO LOOKED STRAIGHT AT IT.** `REVIEW-026c` finding 10 is *"the B-19 decision gave the feature list as `["std", "zeroize"]` — the manifest has **`hazmat`** too"*. **A leg read that exact list, counted its members, corrected an omission in it, and never asked what `std` pulls in.** There is no stronger demonstration that the question was unaskable from the text: the word that made the whole row false was on the line being corrected. ⚠ **E-167's first draft was ALSO false and P-12's falsifier caught it; the corrected row was false on a different premise, and no falsifier existed for that one.** ⚠ **What survives: B-19 was still worth doing.** An implied feature made explicit is legible, and it is now pinned by a probe rather than by a sentence. ⚠ **What does NOT survive: the nine-day story.** Nothing was unwiped, nothing was at risk, and E-167's *"the truth is a worse finding"* was a worse finding about a thing that had not happened | **`tools/check-zeroize-bounds.py`, `make check-zeroize-bounds`.** Part 1 probes the feature in a scratch crate at four feature sets — `[]` **must fail** (the control), `["std"]`, `["alloc"]` and today's line must all compile. Part 2 reverts each of B-21's three locals and requires the build to break, with a comment-edit control that must not. ⚠ **B-19's own revert is deliberately NOT in the revert list** — it belongs to the probe table, as a thing that compiles. ⚠ **Found while building B-21, which is B-19's continuation**; the gate was written to test B-21 and the B-19 arm was included because the decision claimed it. It reported `STILL BUILDS FALSE` on its first run |

| E-172 | ⚠⚠ **THE FALSE B-19 PREMISE SURVIVED THE COMMIT THAT CORRECTED IT — AND TWO OF THE SURVIVORS WERE WRITTEN BY THAT COMMIT.** E-171 was corrected in `CLAIMS.md`, the decision document and a test doc comment, and the phrase was grepped for. **Both `REVIEW-027` external legs still found it standing**, in `signer/Cargo.toml:26-34` — a pre-existing block asserting *"`default-features = false` turned off by accident … without it `ExpandedSecretKey` and `SigningKey` are not wiped on drop"* — which no leg's line list had named and which my grep did not reach because I searched for the sentences I had written, not for the claim. ⚠⚠ **WORSE, AND THIS IS THE PART WITH NO PRECEDENT: `signer/Cargo.toml:36-38` and `signer/src/xrpl.rs:192-196` ASSERT THE FALSE PREMISE IN NEW PROSE THAT THE SAME COMMIT ADDED** — *"B-19 turned the `ed25519-dalek` feature on"* — written while correcting the identical claim four files away. **E-168 is a fix that missed a copy; this is a fix that MADE one.** ⚠ **The mechanism is not carelessness, it is order**: the new sentences were drafted from the B-19 decision *before* the probe was run, and nothing re-read them after the finding inverted | **Fixed at all four live sites**, with the false sentence quoted in place rather than deleted so the correction is legible. ⚠ **`docs/reviews/` is deliberately NOT corrected** — those are the historical record of what legs were told and CLAUDE.md forbids rewriting them. ⚠ **THE RULE THIS ADDS, and it is one layer beyond `CLAUDE.md`'s existing pair:** *tick the leg's list, grep for the phrase* — **and then grep the DIFF YOU JUST WROTE for the claim you just falsified.** A correction commit is the single most likely place to find a fresh copy of the thing being corrected |

| E-173 | ⚠⚠ **THE TEST AND THE GATE WERE BOTH BLIND TO THE ONLY THING THAT MATTERS — THE CALL SITE — AND BOTH `REVIEW-027` EXTERNAL LEGS FOUND IT INDEPENDENTLY.** `the_signing_helpers_secret_locals_wipe_on_drop` was named for the signing helper's locals and **never touches `sign_with_aux`**: it calls `sha512_zeroizing`, `fresh_aux` and `OneShotAux` directly. So does the gate's part 2, which mutates the helper's RETURN TYPE. ⚠ **VERIFIED BY EXECUTION, not by argument:** inlining `Sha512::digest(k.as_bytes())` back into `sign_with_aux` left **all 267 tests green** *and* left **part 2 reporting `OK (bound)`** — because the helper still exists and the test still calls it. The signing path was back to an unwiped 64-byte digest with every check passing. ⚠ **This is the FOURTH instance of one failure mode in this file** — `aux_is_exactly_one_field_of_entropy`, `one_implementation_not_two` (E-161), `zero_aux_is_hedged_not_a_fallback` (E-164), and now this. ⚠ **And it is the first where the GATE built to catch the previous three shared the blind spot** | **Fixed: `check-zeroize-bounds` part 3**, a SOURCE check that the Ed25519 arm of `sign_with_aux` contains no `Sha512::digest`/`Sha512::new` and calls `sha512_zeroizing` — the `check-blinding-sources.ts` idiom, because **no type can express *this call site must use that function***. It carries its own control: the check must DETECT a simulated inlining, or an empty locator result would read as *no stray hashes*. **Re-verified by really inlining it and watching part 3 fire while parts 1-2 and 267 tests did not.** ⚠ **It is a check over KNOWN SPELLINGS, not over reachability** (E-142's wording, and the honest one). The test is renamed `the_wiping_helpers_return_types_wipe_on_drop`, which is what it checks |

| E-174 | ⚠ **A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS REFUTED BY THE COMPILER'S OWN FLAGS.** `REVIEW-027`'s Gemini leg answered question 1 **"E-171 IS FALSE (INCORRECT)"**, citing RFC 3143: *"enabling `zeroize/alloc` does NOT activate `ed25519-dalek`'s own `zeroize` feature"*, and concluded *"B-19 was right: `zeroize` was off for those 9 days."* It is a lucid argument from the namespaced-features rules and it is **wrong**. **Settled by `cargo build -vv` on a crate depending on NOTHING but `ed25519-dalek` at `features = ["std"]`**: `rustc` compiles `ed25519-dalek-2.2.0/src/lib.rs` with **`--cfg 'feature="zeroize"'`**, and `cargo tree -f '{p} {f}'` reports `alloc,std,zeroize`. The Codex leg, asked the same question independently, answered **CORRECT**. ⚠ **THE SHAPE, AND IT IS THIS SESSION'S OWN LESSON POINTED BACK AT A LEG:** *reading a manifest is not running one* — the leg did exactly what the previous session did, one level more expertly, and reached the same wrong place. ⚠ **A rules-derivation and an experiment are not two opinions**; where they disagree about an observable, the experiment settles it | **Rejected, with the evidence recorded so it is not relitigated.** ⚠ **AND THE REPORT WAS KEPT**: `CLAUDE.md`'s rule — *the point beneath a false premise can still be worth taking* — paid for itself here. The same leg's answers 4, 5, 6 and 7 produced **E-173**, the contradicted `sha512_zeroizing` headline, **E-172**'s surviving sites and **B-22**, and three of the four were independently confirmed by the Codex leg. **Discarding the report over its headline verdict would have cost the session's most serious finding** |

| B-21 | ~~**Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and `fresh_aux`'s 32-byte buffer.**~~ **BUILT 2026-08-27.** `zeroize` is a direct `wconf-signer` dependency; `sha512_zeroizing` returns a `Zeroizing<[u8; 64]>` and wipes the `Output<Sha512>` it copied out of, `fresh_aux` returns `Option<Zeroizing<[u8; 32]>>`, and `OneShotAux` holds its bytes in a `Zeroizing`. ⚠ **`OneShotAux` was NOT in this row's list and is the longest-lived of the four** — it holds the drawn entropy for the whole of `sign_prehash_with_rng`. Fixed here rather than filed as a fourth item, and said out loud rather than folded in, because a widened scope recorded as the original is how a fix comes to claim more than it did. ⚠ **The wipe goes through `zeroize`'s `impl Zeroize for [Z]`, NOT `GenericArray`'s own** — `generic-array`'s `zeroize` feature is on in this graph only because `k256` pulls it in transitively, and resting a security property on a feature no line of our manifest declares is E-171's mistake repeated | **CLOSED as a build. `make check-zeroize-bounds` is the falsifier**, and it is a COMPILE-time one: `REVIEW-025` rejected a runtime *"is the buffer zero now?"* assertion because reading a dead stack frame is undefined behaviour. ⚠ **P-5 GOVERNS WHAT THIS MAY EVER CLAIM, and the wording has not moved: it narrows a window and removes NO channel.** ⚠ **Three residues are named at `signer/src/xrpl.rs::sha512_zeroizing` and are NOT fixed**: the `Sha512` hasher's own block buffer, which holds the 32-byte secret input — ⚠ **P-12: `grep -rn "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources AND manifests of `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and `block-buffer 0.10.4` returns ZERO hits, run 2026-08-27, so there is no feature to enable**, **the source of every move** (a Rust move is a bitwise copy that does not run `Drop` on its source), and anything the optimiser spills. A fourth is `ExpandedSecretKey::from_slice`'s own `bytes.try_into()` into an unwiped `[u8; 64]` (`hazmat.rs:108-117`), which is the crate's and unreachable from here |

| B-22 | **The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it.** `sha512half` is used for public transaction digests *and* for secrets: `ed25519_from_entropy`'s `SHA512Half(entropy)` **is the ed25519 private key**, and `from_entropy`'s two closures derive the secp256k1 scalars. Its `full` `Output<Sha512>` and its returned `[u8; 32]` are unwiped, as are the decoded seed arrays from `decode_family_seed`/`decode_ed25519_seed`, the `root`/`intermediate`/`sum` scalars, and `OneShotAux::next_u32`/`next_u64`'s 4- and 8-byte chunks. ⚠ **BOTH `REVIEW-027` EXTERNAL LEGS SAID THE SCOPE BOUNDARY WAS WRONG**, in the same words independently: *"wiping ephemeral nonce entropy while leaving long-term root seed derivation buffers unwiped in the same module is an arbitrary and inconsistent boundary"*. ⚠ **One leg's claim that `AccountKey`/`Inner` are themselves unwiped is REFUTED** by the other: drop glue reaches the k256 and boxed dalek signing keys, whose destructors zeroize | **Filed rather than fixed, and the dissent is recorded rather than settled.** B-21's registered subject was the signing helper, and widening a security change mid-commit on the strength of a review's advice is how a fix comes to claim more than it did — `OneShotAux` was already one such widening this session. ⚠ **The counter-argument is strong and is not dismissed**: the derived value is longer-lived and more sensitive than the nonce entropy this row's predecessor wiped. ⚠ **P-5 governs it identically**: it would narrow a window and remove no channel. Needs its own decision, and `make check-zeroize-bounds` part 2 is the template for its falsifier |
```


## FILE (complete): `signer/src/xrpl.rs`

```rust
//! XRPL binary serialisation, address handling and transaction signing.
//!
//! Architecture §6 step 3. This replaces the length-framed placeholder that
//! `txn.rs` used while nothing signed, and it is the first code in this
//! repository that produces bytes intended for a network. **Devnet only.**
//!
//! # How this is checked, because "it looked right" is not a check
//!
//! Every claim this module makes is pinned by
//! `tests/xrpl_vectors.rs` against vectors generated by
//! `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0` and
//! `ripple-address-codec@5.0.1` — three independently written implementations
//! this project did not author. The generator is committed at
//! `tools/spike-step3-2026-08-18/xrpl-vectors.ts` under standing prohibition
//! **P-8**: a value whose generator is unavailable is not checkable. The codec
//! itself is verified against a live node's `server_definitions` across all 381
//! fields (`CLAIMS.md` E-46).
//!
//! An expected value written from recollection rather than computed is the
//! exact defect this project shipped once already. Nothing here is recalled.
//!
//! # ⚠ The ECDSA signing nonce is a fifth randomness site, and it is RULED
//!
//! ~~and no packet has covered it. This module uses RFC 6979 deterministic
//! `k` … that is a defensible default and it is not a ruling.~~ **Struck
//! 2026-08-20 — `REVIEW-018` ruled `k`, and this header outlived it by a day.**
//! It described the module as using pure RFC 6979 while the code below had
//! already been changed to hedge, which is the ninth instance of the failure
//! `lib.rs` keeps a running record of: *a statement that is true when written
//! is false by the end of the same session.*
//!
//! What holds now: sigma nonces (REVIEW-005c), `r` and `ρ` (REVIEW-010c),
//! ElGamal keygen (REVIEW-012c) and the transaction's ECDSA `k` (REVIEW-018)
//! all have rulings; the Bulletproof's internal scalars are issue #8 and are
//! **open**. This module signs secp256k1 with **hedged RFC 6979** — the
//! deterministic construction plus 32 bytes of fresh entropy as additional
//! data — because the issue #1 ruling extends here and neither leg found a
//! principled distinction from the sigma nonces.
//!
//! ⚠ **Entropy failure DEGRADES to pure RFC 6979; it does not refuse.** That is
//! the sigma-nonce rule, and importing `r`/`ρ`'s "refuse to sign" here was
//! recommended by a leg and rejected. ~~⚠ **Ruled for secp256k1 only** —
//! ed25519 is deterministic by construction, it is the live path for every
//! account this project holds, and it is `CLAIMS.md` **B-16**, open.~~
//!
//! # ⚠ Ed25519 is hedged too — B-16, ruled 2026-08-27, BUILT and EXECUTED
//!
//! ~~**B-16 IS RULED … AND THIS FILE DOES NOT IMPLEMENT IT.**~~ **Struck
//! 2026-08-27, in the session that built it.** Three independent legs
//! (`REVIEW-024`) ruled that the issue #1 extension holds for the ed25519 nonce
//! and that the residual is **not** accepted. Both algorithms hedge now.
//!
//! ⚠ **BUILT AND EXECUTED IS NOT REVIEWED, and they are different things** — the
//! distinction `REVIEW-024` §6 drew between *ruled* and *built*, one step along.
//! All eight of §6's execution gates have run, including the Devnet transaction,
//! so *"the signer hedges ed25519"* is the accurate sentence. §7 item 4 —
//! **two adversarial rounds, the second reviewing the fixes** — is what is still
//! in flight; `REVIEW-025` is round one and both external legs said not to
//! write "closed" before round two. They were right and this paragraph is the
//! correction.
//!
//! The construction is normative in
//! `docs/reviews/REVIEW-024-RULING-ed25519-nonce-2026-08-27.md` §3 — **where
//! this file and the ruling disagree, the ruling wins**:
//!
//! ```text
//!   h   := SHA512(sk)          p := h[32..64]          a := clamp(h[0..32])
//!   DST := b"WCONF/ed25519-nonce-hedge/v1\0"          (29 bytes, fixed)
//!   q   := p XOR SHA512(DST ‖ aux)[0..32]     when the mask is applied
//!   q   := p                                  when it is not
//! ```
//!
//! and then **exactly RFC 8032 with `q` in place of `p`**, evaluated by
//! `ed25519_dalek::hazmat::raw_sign::<Sha512>`. The scalar, its clamping, the
//! public key, the base point, the challenge transcript `R ‖ A ‖ M` and the
//! encodings are untouched; **this project writes no elliptic-curve
//! arithmetic**. Nothing auxiliary goes on the wire — the signature is 64
//! ordinary bytes and any conforming verifier accepts it.
//!
//! ⚠ **A successful draw of thirty-two ZERO bytes stays hedged.** Only a
//! *reported* entropy failure omits the mask, and then the output is
//! byte-identical RFC 8032. `REVIEW-018` §4a got the mirror of this wrong and it
//! cost a round.
//!
//! ⚠ **`a_successful_all_zero_draw_still_hedges` is what holds that**, and this
//! comment credited `zero_aux_is_hedged_not_a_fallback` for one commit —
//! **which is the test that cannot see it**, because it enters at
//! `sign_with_aux` and the decision is made one function earlier in
//! [`fresh_aux`]. Reverting `fresh_aux` left all 263 tests green. Found by the
//! §6 item 8 revert sweep, not by reading; the miscredit was found by
//! `REVIEW-025`'s Codex leg.
//!
//! ⚠ **`hazmat` is enabled crate-wide for one call site**, and all three legs
//! named that as the strongest argument against the change. What contains it is
//! [`AccountKey::sign_with_aux`]: the verifying key is **derived inside that
//! helper** from the same expanded key and is never a parameter this signer
//! accepts. A caller-supplied verifying key is the one input to `raw_sign` that
//! enters the challenge without entering the scalar arithmetic — the
//! two-equations-one-unknown shape that recovers the secret key, and what the
//! crate's warning is really about.
//!
//! ⚠ **One private helper, one varied input — and that is now STRUCTURAL.**
//! [`AccountKey::sign_with_aux`] takes `Option<Zeroizing<[u8; 32]>>` and is the
//! only place either algorithm signs. ⚠ It read `Option<[u8; 32]>` until B-21
//! wrapped the auxiliary entropy; the property is the *one helper*, not the
//! parameter's spelling, but a doc naming a type has to name the type. `REVIEW-024` §4d: `one_implementation_not_two`
//! asserted a property no black-box test can see, because two separately written
//! correct signers pass every assertion it made.

use k256::ecdsa::{
    signature::hazmat::{PrehashSigner, RandomizedPrehashSigner},
    Signature, SigningKey,
};
use ripemd::Ripemd160;
use sha2::{Digest, Sha256, Sha512};
use zeroize::{Zeroize, Zeroizing};

/// XRPL's base58 alphabet. Note the absent `0`, `O`, `I` and `l`.
pub const ALPHABET: &[u8] = b"rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";

const VER_ACCOUNT_ID: u8 = 0x00;
const VER_FAMILY_SEED: u8 = 0x21;

/// The three-byte version prefix of an `sEd…` ed25519 seed.
///
/// Determined by base58-decoding a real Devnet faucet seed and reading the
/// bytes before the 16-byte entropy, **not** from recollection. A wrong prefix
/// here would decode a valid seed into a different key, silently.
const VER_ED25519_SEED: [u8; 3] = [0x01, 0xE1, 0x4B];

#[derive(Debug, PartialEq, Eq)]
pub enum XrplError {
    Base58(String),
    Checksum,
    Version { want: u8, got: u8 },
    /// A multi-byte base58 version prefix that did not match.
    ///
    /// ⚠ **Separate from [`XrplError::Version`] because reusing it lied.**
    /// `decode_ed25519_seed` compares a **three**-byte prefix and reported
    /// `Version { want: VER[0], got: body[0] }`, so a seed whose first byte
    /// matched and whose second or third did not produced *"expected 0x01, got
    /// 0x01"* — an error message that hides its own cause. Found by
    /// `REVIEW-024`'s Gemini leg, outside what that packet asked about.
    VersionPrefix { what: &'static str, want: Vec<u8>, got: Vec<u8> },
    Length { what: &'static str, want: usize, got: usize },
    Field(String),
    Key(String),
}

impl std::fmt::Display for XrplError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            XrplError::Base58(s) => write!(f, "base58: {s}"),
            XrplError::Checksum => write!(f, "base58check checksum mismatch"),
            XrplError::Version { want, got } => {
                write!(f, "wrong base58 version byte: expected {want:#04x}, got {got:#04x}")
            }
            XrplError::VersionPrefix { what, want, got } => {
                let hex = |b: &[u8]| b.iter().map(|x| format!("{x:02x}")).collect::<String>();
                write!(
                    f,
                    "{what}: wrong base58 version prefix: expected {}, got {}",
                    hex(want),
                    hex(got)
                )
            }
            XrplError::Length { what, want, got } => {
                write!(f, "{what}: expected {want} bytes, got {got}")
            }
            XrplError::Field(s) => write!(f, "field: {s}"),
            XrplError::Key(s) => write!(f, "key: {s}"),
        }
    }
}

type R<T> = Result<T, XrplError>;

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/// XRPL's `SHA512Half`: the first 32 bytes of SHA-512.
pub fn sha512half(data: &[u8]) -> [u8; 32] {
    let full = Sha512::digest(data);
    let mut out = [0u8; 32];
    out.copy_from_slice(&full[..32]);
    out
}

/// SHA-512 into a buffer that wipes itself, and wipe the `Output` it came from.
///
/// ⚠ **This headline read *"leaving no unwiped digest behind"* and note 2 below
/// contradicted it twelve lines later** — returning the buffer is a move, and a
/// move leaves its source unwiped. Both `REVIEW-027` external legs are why the
/// headline now describes the two wipes it performs rather than an absence it
/// cannot deliver.
///
/// **`CLAIMS.md` B-21.** `Sha512::digest(..)` returns an `Output<Sha512>` — a
/// `GenericArray` that implements no `Drop` — so over secret input it leaves 64
/// bytes in a stack frame that the next call reuses. `SigningKey` and
/// `ExpandedSecretKey` do have real `Drop` impls (`hazmat.rs:67-76`, read at
/// source) — ⚠ **because `ed25519-dalek`'s `zeroize` feature was always on, not
/// because B-19 turned it on (E-171)** — but that reaches the crate's *types*
/// and nothing this signer hashes itself.
///
/// The `Output` is copied out and then **explicitly zeroized**, through
/// `zeroize`'s `impl Zeroize for [Z]` rather than `GenericArray`'s own. That is
/// deliberate: `generic-array`'s `zeroize` feature is on in this graph, and
/// `cargo tree -e features -i generic-array` (2026-08-27) attributes it to
/// **`elliptic-curve v0.13.8`** — the `k256` branch, not ours. Resting a
/// security property on a feature **no line of our manifest declares** is
/// precisely E-171's mistake, where `std` silently implied `zeroize` and three
/// documents described a consequence that never happened. Wiping through a
/// slice needs no feature at all.
///
/// ⚠ **What this does NOT wipe, stated because the alternative is a false
/// guarantee:**
///
/// 1. The `Sha512` **hasher's own block buffer**, which holds the last partial
///    block of input — for a 32-byte secret, all of it. ⚠ **P-12, so the search
///    is recorded rather than the absence asserted:** `grep -rn
///    "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources of
///    `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and
///    `block-buffer 0.10.4` — sources **and** manifests — returns **zero hits**
///    (run 2026-08-27). There is no feature to enable and nothing here can reach
///    inside `CoreWrapper`.
/// 2. The **source of a move**. Rust moves are bitwise copies and do not run
///    `Drop` on the source, so returning this buffer leaves a copy behind.
/// 3. Anything the optimiser spills to a second stack slot or a register.
///
/// So this narrows a window and **removes no channel** — P-5, and the same
/// sentence `CLAIMS.md` B-21 carries.
fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let mut digest = hasher.finalize();
    let mut out = Zeroizing::new([0u8; 64]);
    out.copy_from_slice(digest.as_slice());
    digest.as_mut_slice().zeroize();
    out
}

/// `RIPEMD160(SHA256(x))` — the AccountID of a public key.
pub fn account_id_of(pubkey: &[u8; 33]) -> [u8; 20] {
    let sha = Sha256::digest(pubkey);
    let rip = Ripemd160::digest(sha);
    let mut out = [0u8; 20];
    out.copy_from_slice(&rip);
    out
}

// ---------------------------------------------------------------------------
// base58check
// ---------------------------------------------------------------------------

pub fn base58check_encode(version: u8, payload: &[u8]) -> String {
    let mut v = Vec::with_capacity(1 + payload.len() + 4);
    v.push(version);
    v.extend_from_slice(payload);
    let c = Sha256::digest(Sha256::digest(&v));
    v.extend_from_slice(&c[..4]);
    b58_encode(&v)
}

pub fn base58check_decode(s: &str, want_version: u8) -> R<Vec<u8>> {
    let raw = b58_decode(s)?;
    if raw.len() < 5 {
        return Err(XrplError::Base58("too short".into()));
    }
    let (body, check) = raw.split_at(raw.len() - 4);
    let c = Sha256::digest(Sha256::digest(body));
    if check != &c[..4] {
        return Err(XrplError::Checksum);
    }
    if body[0] != want_version {
        return Err(XrplError::Version { want: want_version, got: body[0] });
    }
    Ok(body[1..].to_vec())
}

fn b58_encode(data: &[u8]) -> String {
    let mut digits: Vec<u8> = vec![0];
    for byte in data {
        let mut carry = *byte as u32;
        for d in digits.iter_mut() {
            carry += (*d as u32) << 8;
            *d = (carry % 58) as u8;
            carry /= 58;
        }
        while carry > 0 {
            digits.push((carry % 58) as u8);
            carry /= 58;
        }
    }
    let leading = data.iter().take_while(|b| **b == 0).count();
    let mut out = String::new();
    for _ in 0..leading {
        out.push(ALPHABET[0] as char);
    }
    for d in digits.iter().rev() {
        out.push(ALPHABET[*d as usize] as char);
    }
    // A leading zero byte already contributed a digit above; strip the extra.
    if leading > 0 && out.len() > leading {
        let extra = out.chars().skip(leading).take_while(|c| *c == ALPHABET[0] as char).count();
        if extra > 0 {
            out = out[..leading].to_string() + &out[leading + extra..];
        }
    }
    out
}

fn b58_decode(s: &str) -> R<Vec<u8>> {
    let mut bytes: Vec<u8> = vec![0];
    for ch in s.chars() {
        let idx = ALPHABET
            .iter()
            .position(|c| *c as char == ch)
            .ok_or_else(|| XrplError::Base58(format!("`{ch}` is not in the XRPL alphabet")))?;
        let mut carry = idx as u32;
        for b in bytes.iter_mut() {
            carry += (*b as u32) * 58;
            *b = (carry & 0xFF) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            bytes.push((carry & 0xFF) as u8);
            carry >>= 8;
        }
    }
    let leading = s.chars().take_while(|c| *c == ALPHABET[0] as char).count();
    let mut out = vec![0u8; leading];
    out.extend(bytes.iter().rev().skip_while(|b| **b == 0).copied());
    if out.len() == leading {
        out.push(0);
        out.truncate(leading.max(1));
    }
    Ok(out)
}

/// `r…` classic address from an AccountID.
pub fn encode_address(account_id: &[u8; 20]) -> String {
    base58check_encode(VER_ACCOUNT_ID, account_id)
}

/// AccountID from an `r…` classic address, **checksum verified**.
///
/// `txn::normalise_account` checks shape and alphabet only, and says so. This
/// is the real thing, and it is what the signing path uses.
pub fn decode_address(addr: &str) -> R<[u8; 20]> {
    let v = base58check_decode(addr, VER_ACCOUNT_ID)?;
    if v.len() != 20 {
        return Err(XrplError::Length { what: "AccountID", want: 20, got: v.len() });
    }
    let mut out = [0u8; 20];
    out.copy_from_slice(&v);
    Ok(out)
}

// ---------------------------------------------------------------------------
// Account keys
// ---------------------------------------------------------------------------

/// Which signature algorithm an account key uses.
///
/// XRPL supports both, and Devnet's faucet hands out **ed25519** — every
/// account in this project's own Devnet state has an `sEd…` seed. A signer
/// that only spoke secp256k1 could not sign for any of them.
///
/// ⚠ **The two sign different things.** secp256k1 signs `SHA512Half` of the
/// signing serialisation; ed25519 signs those bytes **directly**, because
/// Ed25519 hashes internally. Getting that backwards produces a signature that
/// verifies against nothing, and it is pinned by vectors rather than reasoned
/// about.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyAlgorithm {
    Secp256k1,
    Ed25519,
}

/// A secp256k1 XRPL account key, derived from a family seed.
///
/// ⚠ **Devnet keys only.** ~~Architecture §6 step 6 owns real key handling and
/// still owes issues #10 and #11.~~ **Step 6 is built as of 2026-08-20**, and
/// what it changed for this type is that the seed below may now also be the
/// ElGamal derivation input. Issue #10 remains open. Nothing that reaches this
/// type should ever hold value.
///
/// ⚠ **The master seed is also the ElGamal derivation input under REVIEW-012c**,
/// so a holder who has retired their master key — `lsfDisableMaster`, a regular
/// key, a signer list — is in the case that ruling's condition 2 requires a
/// warning for. This type does not know about the ledger and cannot check it;
/// step 6's onboarding must.
pub struct AccountKey {
    inner: Inner,
    public: [u8; 33],
}

enum Inner {
    Secp256k1(SigningKey),
    Ed25519(Box<ed25519_dalek::SigningKey>),
}

impl std::fmt::Debug for AccountKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AccountKey")
            .field("public", &hex(&self.public))
            .field("secret", &"<redacted>")
            .field("address", &self.address())
            .field("algorithm", &self.algorithm())
            .finish()
    }
}

impl AccountKey {
    /// XRPL's secp256k1 family-seed derivation.
    ///
    /// Two stages, both `SHA512Half` with a rejection loop on an out-of-range
    /// candidate:
    ///
    /// 1. **root** — `candidate(i) = SHA512Half(seed16 ‖ u32be(i))`, first
    ///    valid scalar wins.
    /// 2. **account** — `intermediate(i) = SHA512Half(rootpub33 ‖ u32be(0) ‖ u32be(i))`,
    ///    and the account key is `root + intermediate mod n`.
    ///
    /// ⚠ **Unrelated to the ElGamal keygen ruling.** That derivation is
    /// REVIEW-012's, lives in its ruling document only, and is step 6.
    pub fn from_family_seed(seed: &str) -> R<AccountKey> {
        let (entropy, algo) = decode_family_seed(seed)?;
        match algo {
            KeyAlgorithm::Ed25519 => Self::ed25519_from_entropy(&entropy),
            KeyAlgorithm::Secp256k1 => Self::from_entropy(&entropy),
        }
    }

    /// XRPL's ed25519 derivation: the private key is `SHA512Half(entropy)`, and
    /// the public key is that key's Ed25519 point with a leading `0xED` so the
    /// 33-byte field can carry either algorithm.
    pub fn ed25519_from_entropy(entropy: &[u8]) -> R<AccountKey> {
        if entropy.len() != 16 {
            return Err(XrplError::Length { what: "ed25519 seed", want: 16, got: entropy.len() });
        }
        let sk = ed25519_dalek::SigningKey::from_bytes(&sha512half(entropy));
        let mut public = [0u8; 33];
        public[0] = 0xED;
        public[1..].copy_from_slice(sk.verifying_key().as_bytes());
        Ok(AccountKey { inner: Inner::Ed25519(Box::new(sk)), public })
    }

    pub fn algorithm(&self) -> KeyAlgorithm {
        match self.inner {
            Inner::Secp256k1(_) => KeyAlgorithm::Secp256k1,
            Inner::Ed25519(_) => KeyAlgorithm::Ed25519,
        }
    }

    pub fn from_entropy(entropy: &[u8]) -> R<AccountKey> {
        let root = derive_scalar(|i| {
            let mut m = entropy.to_vec();
            m.extend_from_slice(&(i as u32).to_be_bytes());
            sha512half(&m)
        })?;
        let root_pub = {
            use k256::elliptic_curve::sec1::ToEncodedPoint;
            k256::PublicKey::from_secret_scalar(&root).to_encoded_point(true).as_bytes().to_vec()
        };

        let intermediate = derive_scalar(|i| {
            let mut m = root_pub.clone();
            m.extend_from_slice(&0u32.to_be_bytes());
            m.extend_from_slice(&(i as u32).to_be_bytes());
            sha512half(&m)
        })?;

        let sum: k256::Scalar = *root.as_ref() + *intermediate.as_ref();
        let signing = SigningKey::from_bytes(&sum.to_bytes())
            .map_err(|e| XrplError::Key(format!("account scalar is not a valid key: {e}")))?;
        let pubkey = signing.verifying_key().to_encoded_point(true);
        let mut public = [0u8; 33];
        public.copy_from_slice(pubkey.as_bytes());
        Ok(AccountKey { inner: Inner::Secp256k1(signing), public })
    }

    pub fn public(&self) -> &[u8; 33] {
        &self.public
    }

    pub fn account_id(&self) -> [u8; 20] {
        account_id_of(&self.public)
    }

    pub fn address(&self) -> String {
        encode_address(&self.account_id())
    }

    /// Sign the **signing serialisation**, including its `STX\0` prefix.
    ///
    /// This takes the message rather than a digest because the two algorithms
    /// disagree about what is hashed, and letting a caller pick would be
    /// letting a caller get it wrong:
    ///
    /// * **secp256k1** — ECDSA over `SHA512Half(message)`, DER-encoded, low-`S`
    ///   normalised, with **hedged** RFC 6979 `k` — deterministic plus fresh
    ///   auxiliary entropy, per `REVIEW-018`.
    /// * **ed25519** — a raw 64-byte signature over `message` itself, with a
    ///   **hedged** RFC 8032 nonce prefix, per `REVIEW-024`. Ed25519 hashes
    ///   internally; pre-hashing would produce a signature over the wrong
    ///   thing.
    ///
    /// **Both arms draw their auxiliary entropy here and nowhere else**, and
    /// both degrade to their standard deterministic construction when the draw
    /// reports a failure. This is the only signing entry point that exists in a
    /// build without `test-support`.
    pub fn sign_message(&self, message: &[u8]) -> R<Vec<u8>> {
        self.sign_with_aux(fresh_aux(), message)
    }

    /// Sign, choosing where the nonce's auxiliary entropy comes from.
    ///
    /// ⚠ **`test-support` only, as of the B-16 build — `CLAIMS.md` B-20.** This
    /// was `pub` in an ordinary release build with only a doc comment saying the
    /// deterministic arm was for vectors; every caller was a test and nothing
    /// enforced it. Found by `REVIEW-024`'s Codex leg, and it is the same shape
    /// `REVIEW-014` found when the README claimed a release build dropped
    /// `test-support`. Gated the way `confirm::acknowledgement_for_test` is.
    #[doc(hidden)]
    #[cfg(feature = "test-support")]
    pub fn sign_message_with(&self, hedge: Hedge, message: &[u8]) -> R<Vec<u8>> {
        // ⚠ **The wrapper goes on HERE, not inside `Hedge`.** `Hedge` is `Copy`
        // and its bytes are a test's own literal rather than drawn entropy, so
        // wrapping the enum would buy nothing and cost its `Copy`. What matters
        // is that everything reaching `sign_with_aux` wipes on drop, and B-21's
        // subject is the signing helper. `Hedge::aux`'s own returned copy is
        // **not** covered and is named as such at that function.
        self.sign_with_aux(hedge.aux().map(Zeroizing::new), message)
    }

    /// **The one signing implementation.** Both entry points call this and
    /// nothing else signs.
    ///
    /// ⚠ **This is the property `REVIEW-018`'s two legs made the deterministic
    /// arm conditional on, and until 2026-08-27 it was true by inspection and
    /// enforced by nothing.** `tests/hedged_signing.rs::one_implementation_not_two`
    /// was named for it and could not see it: it asserted both arms are DER,
    /// low-`S` and verify under the same key, and **two independently written
    /// correct signers pass all of that** (`REVIEW-024` §4d, `CLAIMS.md` E-161).
    /// A private helper taking the varied input is the structural form, and it
    /// is a condition on the B-16 build (`REVIEW-024` §7 item 1) — for **both**
    /// algorithms, not only the one the ruling was about.
    ///
    /// `aux` is `Some` when the nonce is hedged and `None` when it is not.
    /// `None` reaches here two ways and they must stay distinguishable from the
    /// caller's side: the deterministic vector arm asks for it, and a *reported*
    /// entropy failure degrades to it. ⚠ **`Some([0u8; 32])` is neither** — it
    /// is a successful draw and it is hedged.
    ///
    /// ⚠ **`Zeroizing` is B-21 and changes no construction.** The bytes inside
    /// are the same bytes; the wrapper only gives them a `Drop`. Every KAT and
    /// every cross-implementation vector in `tests/` is unchanged and green,
    /// which is what says the refactor was a refactor.
    fn sign_with_aux(&self, aux: Option<Zeroizing<[u8; 32]>>, message: &[u8]) -> R<Vec<u8>> {
        match &self.inner {
            Inner::Secp256k1(k) => {
                let prehash = sha512half(message);
                let sig: Signature = match aux {
                    // RFC 6979 §3.6: 32 bytes of fresh entropy as the
                    // additional data `k` is derived over.
                    Some(aux) => k
                        .sign_prehash_with_rng(&mut OneShotAux::new(aux), &prehash)
                        .map_err(|e| XrplError::Key(format!("signing failed: {e}")))?,
                    // ⚠ **Empty additional data, NOT thirty-two zero bytes.**
                    // `rfc6979::generate_k` seeds an HMAC-DRBG with
                    // `key ‖ h1 ‖ ad`, so zeros are *data* and produce a
                    // different `k` from omitting it. `REVIEW-018`'s Gemini leg
                    // wrote "aux_rand = 0^32 (or is omitted)" as though the two
                    // were the same; following that literally would have broken
                    // the vector pinning the arm exists for.
                    None => k
                        .sign_prehash(&prehash)
                        .map_err(|e| XrplError::Key(format!("signing failed: {e}")))?,
                };
                Ok(sig.normalize_s().unwrap_or(sig).to_der().as_bytes().to_vec())
            }
            Inner::Ed25519(k) => {
                use ed25519_dalek::hazmat::{raw_sign, ExpandedSecretKey};
                use ed25519_dalek::VerifyingKey;

                // `h := SHA512(sk)`, then `ExpandedSecretKey::from_bytes` splits
                // it exactly as RFC 8032 Appendix A does: `clamp(h[0..32])` as
                // the scalar, `h[32..64]` as the nonce prefix. This is
                // byte-for-byte what `SigningKey::try_sign` computes —
                // `signing.rs:566-569` is
                // `ExpandedSecretKey::from(&secret_key).raw_sign::<Sha512>(msg, &vk)`
                // — which is why the unmasked arm below is not an approximation
                // of RFC 8032 but the same expression.
                // ⚠ `as_bytes`, not `to_bytes`: `to_bytes` returns the secret
                // **by value** (`signing.rs:114`) and that copy is a stack local
                // no `Drop` reaches. ⚠ This said *"in the same commit that
                // enabled `zeroize`"*; that commit made an already-enabled
                // feature explicit (E-171). `REVIEW-025`, self leg.
                //
                // ⚠ **`h` and `mask` were the same class and are now wiped —
                // B-21, 2026-08-27.** [`sha512_zeroizing`] returns a buffer with
                // a `Drop`, and wipes the `Output<Sha512>` it copied out of. Read
                // that function for the three residues it does **not** reach; one
                // of them is inside `from_slice` on the very next line, which does
                // `bytes.try_into()` into an unwiped `[u8; 64]` before
                // `from_bytes` consumes it (`hazmat.rs:108-117`). That copy is
                // the crate's and this signer cannot reach it.
                let h = sha512_zeroizing(&[k.as_bytes()]);
                let mut esk = ExpandedSecretKey::from_slice(&h[..])
                    .map_err(|e| XrplError::Key(format!("expanding the ed25519 key failed: {e}")))?;

                if let Some(aux) = aux {
                    // `q := p XOR SHA512(DST ‖ aux)[0..32]`.
                    //
                    // ⚠ The mask covers **only** `hash_prefix`. `esk.scalar` is
                    // untouched, so `A`, the signature equation and every byte a
                    // verifier checks are exactly RFC 8032's.
                    //
                    // ⚠ **The mask is secret material too, and it is not
                    // obviously so.** It is `SHA512(DST ‖ aux)` over a public
                    // constant and 32 bytes of fresh entropy — but `q = p XOR
                    // mask` is the nonce prefix, so anyone holding the mask and
                    // one signature recovers `p`. B-21 wipes it for the same
                    // reason it wipes `h`.
                    let mask = sha512_zeroizing(&[ED25519_NONCE_HEDGE_DST, &aux[..]]);
                    for (b, m) in esk.hash_prefix.iter_mut().zip(mask.iter()) {
                        *b ^= *m;
                    }
                }

                // ⚠ **`REVIEW-024` §7 item 2, and it is what contains enabling
                // `hazmat` at all.** `A` is derived here, from this same
                // expanded key, and is never a parameter this signer accepts. It
                // is the one input to `raw_sign` that enters the challenge
                // `H(R ‖ A ‖ M)` without entering `s = r + k·a`; supplying a
                // mismatched one gives an attacker two equations in one unknown
                // and recovers the secret scalar. That is the attack the crate's
                // hazmat warning points at.
                let vk = VerifyingKey::from(&esk);
                // ⚠ **A hard assert, and it was `debug_assert_eq!` for one
                // commit — compiled out of the only binary that signs real
                // transactions.** `REVIEW-025`, self leg and Gemini leg. It sat
                // directly under the comment above, so a reader took it for the
                // guard against the attack that comment describes, and
                // `make signer-release` did not have it. That is `REVIEW-014`'s
                // shape again: present in the build you test, absent from the
                // build you ship.
                //
                // The condition cannot be false today — `vk` comes from the same
                // expanded key three lines up and `self.public` from the same
                // seed — so this guards a *future* edit, which is exactly the
                // kind that survives to release. `OneShotAux`'s precedent
                // applies: stopping beats continuing with weakened crypto, and
                // `[profile.release] panic = "abort"` makes it a clean stop.
                assert_eq!(
                    vk.as_bytes()[..],
                    self.public[1..],
                    "the verifying key derived for signing is not the one this signer publishes \
                     as SigningPubKey. A is the one input that enters the challenge H(R || A || M) \
                     without entering s = r + k*a, so a mismatch makes every signature this key \
                     emits inconsistent with the key a verifier checks against, and is the \
                     precondition the ed25519-unsafe-libs key-recovery attacks build on. \
                     Refusing to continue"
                );

                // ⚠ Pure Ed25519 over `message` itself, NOT Ed25519ph. Ed25519
                // hashes internally and pre-hashing would sign the wrong thing.
                Ok(raw_sign::<Sha512>(&esk, message, &vk).to_bytes().to_vec())
            }
        }
    }
}

/// The fixed 29-byte domain separator the ed25519 nonce mask is tagged under.
///
/// `REVIEW-024` §3, normative and not to be regenerated from a description of
/// it. The trailing `0x00` is part of the tag, not a C string terminator.
///
/// ⚠ **`pub` so that a test can actually reach it.** It was `pub(crate)`, and
/// `the_dst_is_the_ruled_bytes` — an integration test, which cannot see
/// `pub(crate)` — therefore compared a literal to the same literal while this
/// comment claimed it *"pins all 29 of them"*. **A tautology under a sentence
/// asserting it was not one.** Found by `REVIEW-025`'s self leg and its Codex
/// leg independently. Publishing a constant removes no capability.
///
/// What pins it now: `the_dst_is_the_ruled_bytes` compares **this constant** to
/// a literal written out in the test, and
/// `the_construction_matches_a_second_model` pins it behaviourally, because the
/// vectors were produced under the ruled DST by a separate implementation.
pub const ED25519_NONCE_HEDGE_DST: &[u8; 29] = b"WCONF/ed25519-nonce-hedge/v1\0";

/// Draw the auxiliary entropy for a hedged nonce, or report that the draw
/// failed.
///
/// ⚠ **Degrade, do not refuse — and the two are not interchangeable.**
/// Architecture §4 keeps the randomness rules side by side because they differ:
/// `r`/`ρ` **refuse to sign**, because entropy *is* the source there and `r` is
/// published on chain; sigma nonces **degrade**, because entropy is a hedge over
/// a deterministic core that is safe on its own. Both signing nonces have the
/// second shape, so both degrade to their standard construction — RFC 6979 and
/// RFC 8032 respectively — rather than declining to sign.
///
/// `REVIEW-018`'s Codex leg said refuse. That would import the `r`/`ρ` rule into
/// a site with the sigma-nonce shape, which is the merge `CLAUDE.md` warns
/// against by name, and it was rejected. `REVIEW-024` reached the same answer
/// for ed25519 and **corrected its own self leg**, which had ruled that failure
/// should land on a third fixed construction.
///
/// ⚠ **A successful draw of thirty-two zero bytes returns `Some([0u8; 32])`.**
/// That is a hedged signature. Only the `Err` arm below returns `None`.
///
/// ⚠ **`Zeroizing` is B-21 and does not change the draw.** The buffer is filled
/// by the same `getrandom` and carries the same bytes; the wrapper gives it a
/// `Drop`. `a_successful_all_zero_draw_still_hedges` is unchanged and still
/// green, which is what says so — the `Some`/`None` distinction lives in the
/// match arms here and the wrapper is outside it.
///
/// ⚠ **Returning it still leaves a copy.** `Some(b)` moves the buffer, and a
/// Rust move is a bitwise copy that does not run `Drop` on its source. What is
/// bounded is the lifetime of every *named binding* along the way, not every
/// byte the compiler ever wrote down. Boxing would fix this one site and was not
/// taken: it trades an allocation on the signing path for a residue that
/// `sha512_zeroizing`'s note 2 says is unfixable in general anyway.
fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
    let mut b = Zeroizing::new([0u8; 32]);
    match crate::store::getrandom(&mut b[..]) {
        Ok(()) => Some(b),
        Err(_) => None,
    }
}

/// Where a signing nonce's auxiliary entropy comes from.
///
/// ⚠ **`test-support` only — `CLAIMS.md` B-20.** The default path does not go
/// through this type at all: [`AccountKey::sign_message`] calls [`fresh_aux`]
/// and then the same private helper this does. A release build cannot ask for a
/// deterministic signature or supply its own auxiliary bytes.
///
/// ⚠ Its doc used to say the default draw happens in `Hedge::aux`. It does not,
/// and has not since the §7 item 1 restructure — `REVIEW-025`, Codex leg.
///
/// **`CLAIMS.md` B-14, ruled 2026-08-20 (`REVIEW-018`); B-16, ruled 2026-08-27
/// (`REVIEW-024`).** The issue #1 ruling — a hostile same-host process is in the
/// threat model — is what made the sigma nonces hedged. It extends to both
/// signing nonces: they protect the **account key**, and under the ruled keygen
/// construction that key is also the input the ElGamal decryption key is derived
/// from, so a nonce failure is a confidentiality failure as well as a spending
/// one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[cfg(feature = "test-support")]
pub enum Hedge {
    // ⚠ **A `Fresh` variant was here and is gone.** It had exactly one
    // reference in the repository — its own match arm — because
    // `sign_message` calls `fresh_aux` directly and does not go through this
    // type at all. That made it *a second, unexercised entry to fresh
    // entropy*, which is a small version of the problem §7 item 1 exists to
    // solve. `REVIEW-025`, self leg. `sign_message` is what `Fresh` was.
    /// No mask — **for cross-implementation vectors only.**
    ///
    /// `ripple-keypairs` is deterministic, so byte-for-byte pinning is only
    /// possible on this arm. For secp256k1 it is pure RFC 6979; for ed25519 it
    /// is **byte-identical RFC 8032**, because an unmasked `hash_prefix` makes
    /// `raw_sign` the same expression `SigningKey::sign` evaluates. It pins the
    /// serialisation, the digest choice, the low-`S` normalisation and the DER
    /// encoding, which is what that test was ever really for.
    ///
    /// ⚠ This is also where a **reported entropy failure** lands, which is what
    /// makes that failure testable by equality rather than by a third pinned
    /// construction (`REVIEW-024` §4b).
    DeterministicForVectors,
    /// A caller-chosen mask — **for driving the construction in tests.**
    ///
    /// `REVIEW-024` §6 item 2: the hedge has to be *drivable* rather than only
    /// observable, or the only checkable property is "the output changed". With
    /// a fixed `aux` the mask is reproducible, so message separation, `R`
    /// distinctness and the KAT against a second model all become equalities.
    /// ⚠ *"an independent implementation"* here for one commit — the curve
    /// library is external, the model is this project's (`REVIEW-025`).
    ///
    /// ⚠ **`FixedAux([0u8; 32])` is a HEDGED signature and differs from
    /// [`Self::DeterministicForVectors`].** `REVIEW-018` §4a got the mirror of
    /// this wrong for secp256k1 — treating `aux = 0³²` and *omitted* as
    /// interchangeable, which would have broken the vector pinning. Here the
    /// same pair must stay distinct in the opposite direction.
    ///
    /// ⚠ Architecture §3 rule 5 forbids caller-supplied randomness on anything
    /// that can sign, which is why this variant does not exist in a release
    /// build rather than merely being discouraged in one.
    FixedAux([u8; 32]),
}

#[cfg(feature = "test-support")]
impl Hedge {
    /// ⚠ **Not `Zeroizing`, deliberately — B-21 does not cover this copy.**
    /// `Hedge` is `Copy`, its bytes are a test's own literal rather than drawn
    /// entropy, and this arm does not exist in a release build at all. The
    /// wrapper goes on at [`AccountKey::sign_message_with`], which is where the
    /// value enters the helper B-21 is about. Saying "the aux bytes are wiped"
    /// without this sentence would be the overstatement `REVIEW-026` found round
    /// one making about its own fixes.
    fn aux(self) -> Option<[u8; 32]> {
        match self {
            Hedge::DeterministicForVectors => None,
            Hedge::FixedAux(a) => Some(a),
        }
    }
}

/// Feeds exactly the bytes it was given, once.
///
/// `sign_prehash_with_rng` wants an RNG; this project wants to choose the
/// entropy source and to know when it failed. So the draw happens in
/// [`fresh_aux`] — through the same `getrandom` every other site uses — and this
/// hands those bytes over.
///
/// ⚠ This said the draw happens in `Hedge::aux`, which stopped being true at the
/// §7 item 1 restructure. `REVIEW-025`'s Codex leg named the staleness and round
/// one annotated **a different occurrence of it**, leaving this one standing.
///
/// ⚠ **`bytes` is `Zeroizing` — B-21, and this one was NOT in B-21's registered
/// list.** The row named the SHA-512 expansion, the mask and `fresh_aux`'s
/// buffer; this holds the same 32 drawn bytes for the whole of
/// `sign_prehash_with_rng`, which is the longest any of them is live. It is the
/// same class at the same helper, so it is fixed here rather than filed as a
/// fourth thing — and it is called out rather than folded in silently, because
/// a widened scope recorded as if it were the original is how a fix comes to
/// claim more than it did.
struct OneShotAux {
    bytes: Zeroizing<[u8; 32]>,
    used: usize,
}

impl OneShotAux {
    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {
        OneShotAux { bytes, used: 0 }
    }
}

impl k256::elliptic_curve::rand_core::RngCore for OneShotAux {
    fn next_u32(&mut self) -> u32 {
        let mut b = [0u8; 4];
        self.fill_bytes(&mut b);
        u32::from_le_bytes(b)
    }
    fn next_u64(&mut self) -> u64 {
        let mut b = [0u8; 8];
        self.fill_bytes(&mut b);
        u64::from_le_bytes(b)
    }
    fn fill_bytes(&mut self, dest: &mut [u8]) {
        // ⚠ **Over-drawing PANICS rather than repeating.**
        //
        // This held 32 bytes and wrapped with `% 32` if asked for more, on the
        // reasoning that `sign_prehash_with_rng` asks for exactly the field
        // size. That is true at `ecdsa 0.16.9` and it is not a property this
        // code controls — and the test that claimed to guard it
        // (`aux_is_exactly_one_field_of_entropy`) could not: repeated entropy
        // still produces distinct signatures, so the assertion passed either
        // way. **A test that cannot see the thing it is named for is the
        // failure mode this project keeps finding**, so the check moved here,
        // where it is enforced rather than asserted.
        //
        // Continuing with recycled entropy would silently weaken a nonce
        // derivation, which is worse than stopping.
        assert!(
            self.used + dest.len() <= 32,
            "the ECDSA nonce's auxiliary entropy was drawn beyond one field element \
             ({} + {} > 32). Recycling it would silently weaken the nonce, so this stops \
             instead. A crate upgrade changed how much `sign_prehash_with_rng` asks for; \
             CLAIMS.md B-14",
            self.used,
            dest.len()
        );
        dest.copy_from_slice(&self.bytes[self.used..self.used + dest.len()]);
        self.used += dest.len();
    }
    fn try_fill_bytes(
        &mut self,
        dest: &mut [u8],
    ) -> Result<(), k256::elliptic_curve::rand_core::Error> {
        self.fill_bytes(dest);
        Ok(())
    }
}

impl k256::elliptic_curve::rand_core::CryptoRng for OneShotAux {}

/// Decode an `sEd…` seed to its 16 bytes of entropy, checksum verified.
pub fn decode_ed25519_seed(seed: &str) -> R<[u8; 16]> {
    let raw = b58_decode(seed)?;
    if raw.len() != 3 + 16 + 4 {
        return Err(XrplError::Length { what: "ed25519 seed", want: 23, got: raw.len() });
    }
    let (body, check) = raw.split_at(raw.len() - 4);
    let c = Sha256::digest(Sha256::digest(body));
    if check != &c[..4] {
        return Err(XrplError::Checksum);
    }
    if body[..3] != VER_ED25519_SEED {
        return Err(XrplError::VersionPrefix {
            what: "ed25519 seed",
            want: VER_ED25519_SEED.to_vec(),
            got: body[..3].to_vec(),
        });
    }
    let mut out = [0u8; 16];
    out.copy_from_slice(&body[3..]);
    Ok(out)
}

/// Decode a family seed to its **16 bytes of entropy and its type**.
///
/// The keygen ruling's §2.1 needs both — `seed_type` and `seed_bytes` are
/// separate framed fields of the derivation preimage, so the same 16 bytes
/// under two seed types must produce two different keys. Splitting the decoder
/// out of [`AccountKey::from_family_seed`] means there is one decoder rather
/// than two that can disagree about what a seed is.
///
/// **Exactly 16 bytes or an error.** `len(seed_bytes) != 16` is one of §2.1's
/// refusals and it is enforced here, in the type the caller receives, rather
/// than re-checked downstream.
pub fn decode_family_seed(seed: &str) -> R<([u8; 16], KeyAlgorithm)> {
    if seed.starts_with("sEd") {
        return Ok((decode_ed25519_seed(seed)?, KeyAlgorithm::Ed25519));
    }
    let entropy = base58check_decode(seed, VER_FAMILY_SEED)?;
    if entropy.len() != 16 {
        return Err(XrplError::Length { what: "family seed", want: 16, got: entropy.len() });
    }
    let mut out = [0u8; 16];
    out.copy_from_slice(&entropy);
    Ok((out, KeyAlgorithm::Secp256k1))
}

/// The rejection loop both derivation stages share: increment until the
/// candidate is a valid non-zero scalar below the group order.
fn derive_scalar<F: Fn(u32) -> [u8; 32]>(f: F) -> R<k256::NonZeroScalar> {
    for i in 0u32..=u32::MAX {
        let candidate = f(i);
        if let Ok(sk) = k256::SecretKey::from_slice(&candidate) {
            return Ok(sk.to_nonzero_scalar());
        }
    }
    Err(XrplError::Key("no valid scalar in 2^32 candidates".into()))
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

/// How a field's bytes are laid out.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    UInt16,
    UInt32,
    UInt64,
    /// Fixed-width hash, length in bytes. `Hash192` is `MPTokenIssuanceID`.
    Hash(usize),
    /// XRP drops. `Amount` in the definitions; only the XRP form is produced.
    Amount,
    /// Variable-length, VL-prefixed.
    Blob,
    /// 20 bytes, VL-prefixed like a Blob.
    AccountId,
}

impl Kind {
    fn type_code(&self) -> u16 {
        match self {
            Kind::UInt16 => 1,
            Kind::UInt32 => 2,
            Kind::UInt64 => 3,
            Kind::Hash(32) => 5,
            Kind::Hash(24) => 21,
            Kind::Hash(n) => panic!("no type code for a {n}-byte hash in this table"),
            Kind::Amount => 6,
            Kind::Blob => 7,
            Kind::AccountId => 8,
        }
    }
    fn vl_encoded(&self) -> bool {
        matches!(self, Kind::Blob | Kind::AccountId)
    }
}

/// The wire type code for a [`Kind`], exposed so `tests/xrpl_vectors.rs` can
/// compare it against the codec's `TYPES` table.
pub fn type_code_of(kind: Kind) -> u16 {
    kind.type_code()
}

/// One field of a transaction.
///
/// The `nth` codes come from `ripple-binary-codec@2.9.0`'s `definitions.json`,
/// which `CLAIMS.md` E-46 records as verified against a live node's
/// `server_definitions` across all 381 fields. `tests/xrpl_vectors.rs` fails if
/// any of them is wrong, because a wrong code changes the encoding.
#[derive(Debug, Clone, Copy)]
pub struct FieldDef {
    pub name: &'static str,
    pub kind: Kind,
    pub nth: u16,
    /// `false` only for `TxnSignature`, which is excluded from the signing
    /// serialisation by definition.
    pub signing: bool,
}

pub const TRANSACTION_TYPE: FieldDef =
    FieldDef { name: "TransactionType", kind: Kind::UInt16, nth: 2, signing: true };
pub const NETWORK_ID: FieldDef =
    FieldDef { name: "NetworkID", kind: Kind::UInt32, nth: 1, signing: true };
pub const FLAGS: FieldDef = FieldDef { name: "Flags", kind: Kind::UInt32, nth: 2, signing: true };
pub const SEQUENCE: FieldDef =
    FieldDef { name: "Sequence", kind: Kind::UInt32, nth: 4, signing: true };
pub const LAST_LEDGER_SEQUENCE: FieldDef =
    FieldDef { name: "LastLedgerSequence", kind: Kind::UInt32, nth: 27, signing: true };
pub const MPT_AMOUNT: FieldDef =
    FieldDef { name: "MPTAmount", kind: Kind::UInt64, nth: 26, signing: true };
pub const BLINDING_FACTOR: FieldDef =
    FieldDef { name: "BlindingFactor", kind: Kind::Hash(32), nth: 40, signing: true };
pub const FEE: FieldDef = FieldDef { name: "Fee", kind: Kind::Amount, nth: 8, signing: true };
pub const SIGNING_PUB_KEY: FieldDef =
    FieldDef { name: "SigningPubKey", kind: Kind::Blob, nth: 3, signing: true };
pub const TXN_SIGNATURE: FieldDef =
    FieldDef { name: "TxnSignature", kind: Kind::Blob, nth: 4, signing: false };
pub const HOLDER_ENCRYPTION_KEY: FieldDef =
    FieldDef { name: "HolderEncryptionKey", kind: Kind::Blob, nth: 36, signing: true };
pub const ZK_PROOF: FieldDef = FieldDef { name: "ZKProof", kind: Kind::Blob, nth: 37, signing: true };
pub const HOLDER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "HolderEncryptedAmount", kind: Kind::Blob, nth: 38, signing: true };
pub const ISSUER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "IssuerEncryptedAmount", kind: Kind::Blob, nth: 39, signing: true };
pub const SENDER_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "SenderEncryptedAmount", kind: Kind::Blob, nth: 40, signing: true };
pub const DESTINATION_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "DestinationEncryptedAmount", kind: Kind::Blob, nth: 41, signing: true };
/// ⚠ **nth 43, not 42.** 42 is `AuditorEncryptedBalance`, a different field on
/// a different object. A review leg proposed 42 for this and it would have
/// produced a transaction that encodes cleanly and means something else.
pub const AUDITOR_ENCRYPTED_AMOUNT: FieldDef =
    FieldDef { name: "AuditorEncryptedAmount", kind: Kind::Blob, nth: 43, signing: true };
pub const AMOUNT_COMMITMENT: FieldDef =
    FieldDef { name: "AmountCommitment", kind: Kind::Blob, nth: 45, signing: true };
pub const BALANCE_COMMITMENT: FieldDef =
    FieldDef { name: "BalanceCommitment", kind: Kind::Blob, nth: 46, signing: true };
pub const ACCOUNT: FieldDef =
    FieldDef { name: "Account", kind: Kind::AccountId, nth: 1, signing: true };
pub const DESTINATION: FieldDef =
    FieldDef { name: "Destination", kind: Kind::AccountId, nth: 3, signing: true };
pub const MPT_ISSUANCE_ID: FieldDef =
    FieldDef { name: "MPTokenIssuanceID", kind: Kind::Hash(24), nth: 1, signing: true };

/// Networks at or below this ID must **omit** `NetworkID`; above it, they
/// require it.
///
/// Devnet is 2. A `ConfidentialMPTSend` carrying `NetworkID: 2` was rejected on
/// Devnet with `telNETWORK_ID_MAKES_TX_NON_CANONICAL` on 2026-08-18 —
/// observed, not read off a document.
pub const NETWORK_ID_OMIT_AT_OR_BELOW: u32 = 1024;

/// `TRANSACTION_TYPES` from the same definitions.
pub mod tx_type {
    pub const CONFIDENTIAL_MPT_CONVERT: u16 = 85;
    pub const CONFIDENTIAL_MPT_MERGE_INBOX: u16 = 86;
    pub const CONFIDENTIAL_MPT_CONVERT_BACK: u16 = 87;
    pub const CONFIDENTIAL_MPT_SEND: u16 = 88;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/// A field with its value, ready to serialise.
pub struct Field {
    def: FieldDef,
    value: Vec<u8>,
}

/// An `STObject` under construction. Fields may be added in any order; the
/// canonical order is imposed at serialisation time.
/// 100 billion XRP, in drops — the total supply, and the largest value an XRPL
/// native Amount can express.
pub const MAX_DROPS: u64 = 100_000_000_000 * 1_000_000;

#[derive(Default)]
pub struct TxBuilder {
    fields: Vec<Field>,
    /// Set by [`TxBuilder::drops`] when a value exceeds [`MAX_DROPS`], so the
    /// refusal happens at `serialize` where it can be returned.
    overflowed_drops: Option<(&'static str, u64)>,
}

impl TxBuilder {
    pub fn new() -> TxBuilder {
        TxBuilder { fields: Vec::new(), overflowed_drops: None }
    }

    pub fn u16(mut self, def: FieldDef, v: u16) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    pub fn u32(mut self, def: FieldDef, v: u32) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    pub fn u64(mut self, def: FieldDef, v: u64) -> Self {
        self.fields.push(Field { def, value: v.to_be_bytes().to_vec() });
        self
    }
    /// XRP drops. Bit 62 marks a positive amount; bit 63 (the "is issued
    /// currency" flag) stays clear for drops.
    ///
    /// ⚠ **Zero is `0x4000000000000000`, not zero.** The positive bit is set
    /// for a zero drops amount too — checked against `ripple-binary-codec`,
    /// not assumed, after a review leg claimed the opposite.
    ///
    /// ⚠ **Bounded.** `MAX_DROPS` is the total XRP supply in drops; anything
    /// above it would set bits the format reserves and produce an Amount that
    /// means something else. An unbounded `|` was the original, and a bad
    /// profile fee of `u64::MAX` would have been signed (`REVIEW-015b`).
    pub fn drops(mut self, def: FieldDef, v: u64) -> Self {
        // Recorded rather than silently clamped: `serialize` refuses it.
        self.fields.push(Field { def, value: (v | 0x4000_0000_0000_0000).to_be_bytes().to_vec() });
        if v > MAX_DROPS {
            self.overflowed_drops = Some((def.name, v));
        }
        self
    }
    pub fn blob(mut self, def: FieldDef, v: &[u8]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }
    pub fn hash(mut self, def: FieldDef, v: &[u8]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }
    pub fn account(mut self, def: FieldDef, v: &[u8; 20]) -> Self {
        self.fields.push(Field { def, value: v.to_vec() });
        self
    }

    pub fn has(&self, name: &str) -> bool {
        self.fields.iter().any(|f| f.def.name == name)
    }

    /// Canonical XRPL serialisation.
    ///
    /// Fields sort by `(type code, field code)`, and each is preceded by its
    /// header and, where the type is variable-length, a VL prefix.
    /// `for_signing` drops every field whose `signing` flag is false — which is
    /// `TxnSignature` and nothing else.
    pub fn serialize(&self, for_signing: bool) -> R<Vec<u8>> {
        if let Some((name, v)) = self.overflowed_drops {
            return Err(XrplError::Field(format!(
                "{name} is {v} drops, above the {MAX_DROPS} drop total supply. An Amount that \
                 large sets bits the format reserves and would mean something else"
            )));
        }
        let mut fields: Vec<&Field> =
            self.fields.iter().filter(|f| !for_signing || f.def.signing).collect();
        fields.sort_by_key(|f| (f.def.kind.type_code(), f.def.nth));

        let mut out = Vec::new();
        for f in fields {
            if let Kind::Hash(n) = f.def.kind {
                if f.value.len() != n {
                    return Err(XrplError::Length { what: "hash field", want: n, got: f.value.len() });
                }
            }
            if f.def.kind == Kind::AccountId && f.value.len() != 20 {
                return Err(XrplError::Length {
                    what: "AccountID",
                    want: 20,
                    got: f.value.len(),
                });
            }
            out.extend_from_slice(&field_header(f.def.kind.type_code(), f.def.nth));
            if f.def.kind.vl_encoded() {
                out.extend_from_slice(&vl_prefix(f.value.len())?);
            }
            out.extend_from_slice(&f.value);
        }
        Ok(out)
    }

    /// `"STX\0" ‖ signing serialisation` — the message an account key signs.
    ///
    /// Not a digest, because ed25519 and secp256k1 hash differently and the
    /// choice belongs to [`AccountKey`].
    pub fn signing_message(&self) -> R<Vec<u8>> {
        let mut m = 0x5354_5800u32.to_be_bytes().to_vec();
        m.extend_from_slice(&self.serialize(true)?);
        Ok(m)
    }

    /// `SHA512Half` of [`Self::signing_message`] — what **secp256k1** signs.
    pub fn signing_digest(&self) -> R<[u8; 32]> {
        Ok(sha512half(&self.signing_message()?))
    }
}

/// The field header: a nibble each for type and field code, with a zero nibble
/// meaning "the real code is in the next byte".
pub fn field_header(type_code: u16, field_code: u16) -> Vec<u8> {
    let mut out = Vec::with_capacity(3);
    if type_code < 16 && field_code < 16 {
        out.push(((type_code << 4) as u8) | field_code as u8);
    } else if type_code < 16 {
        out.push((type_code << 4) as u8);
        out.push(field_code as u8);
    } else if field_code < 16 {
        out.push(field_code as u8);
        out.push(type_code as u8);
    } else {
        out.push(0);
        out.push(type_code as u8);
        out.push(field_code as u8);
    }
    out
}

/// XRPL's three-range variable-length prefix.
pub fn vl_prefix(len: usize) -> R<Vec<u8>> {
    if len <= 192 {
        Ok(vec![len as u8])
    } else if len <= 12480 {
        let l = len - 193;
        Ok(vec![193 + (l >> 8) as u8, (l & 0xFF) as u8])
    } else if len <= 918744 {
        let l = len - 12481;
        Ok(vec![241 + (l >> 16) as u8, ((l >> 8) & 0xFF) as u8, (l & 0xFF) as u8])
    } else {
        Err(XrplError::Field(format!("{len} bytes exceeds the VL maximum of 918744")))
    }
}

/// The transaction hash rippled reports: `SHA512Half("TXN\0" ‖ signed blob)`.
pub fn transaction_hash(signed_blob: &[u8]) -> [u8; 32] {
    let mut m = 0x5458_4E00u32.to_be_bytes().to_vec();
    m.extend_from_slice(signed_blob);
    sha512half(&m)
}

pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02X}")).collect()
}

pub fn unhex(s: &str) -> R<Vec<u8>> {
    if s.len() % 2 != 0 {
        return Err(XrplError::Field("odd-length hex".into()));
    }
    (0..s.len() / 2)
        .map(|i| {
            u8::from_str_radix(&s[2 * i..2 * i + 2], 16)
                .map_err(|_| XrplError::Field(format!("`{}` is not hex", &s[2 * i..2 * i + 2])))
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/// A field recovered from bytes, keyed by `(type code, field code)`.
///
/// The decoder exists for one reason: architecture §6 step 1's property —
/// *"the confirmation renders fields parsed back out of the transaction the
/// signer built"* — is only real if something actually parses. While the
/// serialisation was a placeholder, a hand-rolled round trip was enough. Now
/// that the bytes are the ones going to a network, the parse has to be of
/// those bytes.
///
/// It decodes **only the field types this signer emits**. An unknown type is an
/// error, not a skip: a decoder that silently ignores what it does not
/// understand would let a field the confirmation never shows ride along.
pub struct Decoded {
    fields: Vec<((u16, u16), Vec<u8>)>,
}

impl Decoded {
    pub fn get(&self, def: FieldDef) -> Option<&[u8]> {
        let key = (def.kind.type_code(), def.nth);
        self.fields.iter().find(|(k, _)| *k == key).map(|(_, v)| v.as_slice())
    }

    pub fn u16(&self, def: FieldDef) -> Option<u16> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u16::from_be_bytes)
    }
    pub fn u32(&self, def: FieldDef) -> Option<u32> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u32::from_be_bytes)
    }
    pub fn u64(&self, def: FieldDef) -> Option<u64> {
        self.get(def).and_then(|b| b.try_into().ok()).map(u64::from_be_bytes)
    }
    /// XRP drops, with the type bit stripped.
    pub fn drops(&self, def: FieldDef) -> Option<u64> {
        self.u64(def).map(|v| v & 0x3FFF_FFFF_FFFF_FFFF)
    }
    pub fn account(&self, def: FieldDef) -> Option<[u8; 20]> {
        self.get(def).and_then(|b| b.try_into().ok())
    }
    pub fn count(&self) -> usize {
        self.fields.len()
    }
    /// Every `(type, field)` pair present, in wire order. Used to assert that
    /// nothing rode along that the confirmation does not show.
    pub fn keys(&self) -> Vec<(u16, u16)> {
        self.fields.iter().map(|(k, _)| *k).collect()
    }

    /// The value at a raw `(type, field)` key, for callers walking [`Self::keys`].
    pub fn fields_at(&self, key: (u16, u16)) -> Option<&[u8]> {
        self.fields.iter().find(|(k, _)| *k == key).map(|(_, v)| v.as_slice())
    }
}

/// Decode a canonical XRPL serialisation.
///
/// Rejects trailing bytes, truncation, a non-canonical field order, and any
/// type this signer does not itself emit.
pub fn decode(bytes: &[u8]) -> R<Decoded> {
    let mut i = 0usize;
    let mut fields: Vec<((u16, u16), Vec<u8>)> = Vec::new();
    let mut last: Option<(u16, u16)> = None;

    while i < bytes.len() {
        let b0 = bytes[i];
        i += 1;
        let hi = (b0 >> 4) as u16;
        let lo = (b0 & 0x0F) as u16;
        let (type_code, field_code) = match (hi, lo) {
            (0, 0) => {
                let t = *bytes.get(i).ok_or(XrplError::Field("truncated type code".into()))? as u16;
                let f =
                    *bytes.get(i + 1).ok_or(XrplError::Field("truncated field code".into()))? as u16;
                i += 2;
                (t, f)
            }
            (0, f) => {
                let t = *bytes.get(i).ok_or(XrplError::Field("truncated type code".into()))? as u16;
                i += 1;
                (t, f)
            }
            (t, 0) => {
                let f =
                    *bytes.get(i).ok_or(XrplError::Field("truncated field code".into()))? as u16;
                i += 1;
                (t, f)
            }
            (t, f) => (t, f),
        };

        // Canonical order is part of the encoding, so a decoder that accepts
        // any order accepts bytes rippled would reject.
        if let Some(prev) = last {
            if (type_code, field_code) <= prev {
                return Err(XrplError::Field(format!(
                    "field ({type_code},{field_code}) is out of canonical order after \
                     ({},{})",
                    prev.0, prev.1
                )));
            }
        }
        last = Some((type_code, field_code));

        let len = match type_code {
            1 => 2,
            2 => 4,
            3 => 8,
            5 => 32,
            6 => 8, // XRP drops only; an issued amount is 48 and this signer emits none
            21 => 24,
            7 | 8 => {
                let (n, used) = read_vl(&bytes[i..])?;
                i += used;
                n
            }
            other => {
                return Err(XrplError::Field(format!(
                    "type code {other} is not one this signer emits; refusing to skip it"
                )))
            }
        };
        if type_code == 6 && bytes.get(i).map(|b| b & 0x80 != 0).unwrap_or(false) {
            return Err(XrplError::Field(
                "an issued-currency Amount was found; this signer emits XRP drops only".into(),
            ));
        }
        let end = i.checked_add(len).ok_or(XrplError::Field("length overflow".into()))?;
        if end > bytes.len() {
            return Err(XrplError::Field(format!(
                "field ({type_code},{field_code}) claims {len} bytes; only {} remain",
                bytes.len() - i
            )));
        }
        fields.push(((type_code, field_code), bytes[i..end].to_vec()));
        i = end;
    }

    Ok(Decoded { fields })
}

fn read_vl(b: &[u8]) -> R<(usize, usize)> {
    let b0 = *b.first().ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
    if b0 <= 192 {
        Ok((b0, 1))
    } else if b0 <= 240 {
        let b1 = *b.get(1).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        Ok((193 + ((b0 - 193) << 8) + b1, 2))
    } else if b0 <= 254 {
        let b1 = *b.get(1).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        let b2 = *b.get(2).ok_or(XrplError::Field("truncated VL prefix".into()))? as usize;
        Ok((12481 + ((b0 - 241) << 16) + (b1 << 8) + b2, 3))
    } else {
        Err(XrplError::Field(format!("{b0} is not a valid first VL byte")))
    }
}

#[cfg(test)]
mod aux_tests {
    use super::*;
    use k256::elliptic_curve::rand_core::RngCore;

    /// The auxiliary RNG hands over exactly what it was given, in order.
    #[test]
    fn one_shot_aux_yields_its_bytes_once_and_in_order() {
        let mut src = [0u8; 32];
        for (i, b) in src.iter_mut().enumerate() {
            *b = i as u8;
        }
        let mut rng = OneShotAux::new(Zeroizing::new(src));
        let mut out = [0u8; 32];
        rng.fill_bytes(&mut out);
        assert_eq!(out, src, "the aux RNG did not yield the entropy it was given");
    }

    /// ...and refuses to yield more than one field element.
    ///
    /// **This is the check `aux_is_exactly_one_field_of_entropy` could not
    /// make.** Repeated entropy still produces distinct signatures, so no
    /// black-box test over signature outputs can see recycling.
    #[test]
    #[should_panic(expected = "beyond one field element")]
    fn one_shot_aux_refuses_to_recycle() {
        let mut rng = OneShotAux::new(Zeroizing::new([7u8; 32]));
        let mut out = [0u8; 33];
        rng.fill_bytes(&mut out);
    }

    /// **B-21's falsifier for the TYPES, and a COMPILE-TIME one on purpose.**
    ///
    /// ⚠⚠ **RENAMED from `the_signing_helpers_secret_locals_wipe_on_drop`, which
    /// overstated it and both `REVIEW-027` external legs said so (E-173).** It
    /// does not exercise [`AccountKey::sign_with_aux`] at all — it calls the
    /// three helpers directly. **Verified by execution:** inlining
    /// `Sha512::digest` back into `sign_with_aux` leaves this test green, all
    /// 267 tests green, **and `check-zeroize-bounds` part 2 still reporting
    /// OK**, because the helper survives and the test still calls it.
    ///
    /// **What closes that hole is `check-zeroize-bounds` part 3**, a source
    /// check that the Ed25519 arm hashes only through `sha512_zeroizing` — no
    /// type can express "this call site must use that function".
    ///
    /// `REVIEW-025` considered a runtime *"is the buffer zero now?"* assertion
    /// for B-19 and **rejected it**: reading a stack slot after its frame is
    /// gone is undefined behaviour, and the test would pass or fail for reasons
    /// unrelated to the change. E-108's rule — *a revert that does not compile
    /// proves nothing* — inverts for a `Drop`-carrying type, because the compile
    /// failure IS the proof.
    ///
    /// So this names the bound on the **actual return types of the actual
    /// private functions**, not on `Zeroizing` in the abstract. Reverting any of
    /// the three to a bare array fails to compile here. A test that asserted
    /// `Zeroizing::<[u8; 32]>::new(..)` is `ZeroizeOnDrop` would pass forever
    /// while the signer used plain arrays — that is `check-test-support-gate`'s
    /// own false-pass shape (E-165), one layer along.
    ///
    /// ⚠ **It proves the types wipe on drop. It does not prove the secret is
    /// unrecoverable**, and B-21 never claimed that: see `sha512_zeroizing` for
    /// the three residues that remain, and P-5 for why an adversary with code
    /// execution is unaffected either way.
    #[test]
    fn the_wiping_helpers_return_types_wipe_on_drop() {
        fn wipes_on_drop<T: zeroize::ZeroizeOnDrop>(_: &T) {}

        // `sha512_zeroizing` — what the ed25519 expansion `h` and the nonce
        // mask are built from. ⚠ That `sign_with_aux` USES it is part 3's job.
        wipes_on_drop(&sha512_zeroizing(&[b"probe"]));

        // `fresh_aux` — the drawn auxiliary entropy.
        //
        // ⚠ **`expect`, not `if let Some`.** The first draft skipped the check
        // when the draw reported a failure, which is a test that passes by not
        // running — the exact shape E-164 and E-161 are about, written into the
        // test whose whole subject is B-21. No hook is armed here, so a `None`
        // is a real entropy failure and this stops instead of certifying
        // nothing.
        let aux = fresh_aux().expect("the entropy draw failed, so this test checked nothing");
        wipes_on_drop(&aux);

        // `OneShotAux` — the same drawn bytes, held for the whole ECDSA sign.
        let rng = OneShotAux::new(Zeroizing::new([0u8; 32]));
        wipes_on_drop(&rng.bytes);
    }

    /// The wiping helper computes **SHA-512** and not something adjacent to it.
    ///
    /// ⚠ **This is the half a trait bound cannot see.** B-21 moved two live
    /// hashes onto a new function; if that function hashed its parts in the
    /// wrong order, or dropped one, every `ZeroizeOnDrop` bound above would
    /// still be satisfied and the nonce construction would have silently
    /// changed. The end-to-end KATs in `tests/hedged_signing.rs` would catch it
    /// — this catches it at the unit that changed, and pins concatenation order
    /// explicitly, which the KATs only do implicitly.
    #[test]
    fn the_wiping_hash_is_sha512_over_its_parts_in_order() {
        assert_eq!(
            sha512_zeroizing(&[b"abc"])[..],
            Sha512::digest(b"abc")[..],
            "the wiping helper is not plain SHA-512"
        );
        assert_eq!(
            sha512_zeroizing(&[b"ab", b"c"])[..],
            Sha512::digest(b"abc")[..],
            "the wiping helper does not concatenate its parts"
        );
        assert_ne!(
            sha512_zeroizing(&[b"a", b"bc"])[..],
            sha512_zeroizing(&[b"bc", b"a"])[..],
            "the wiping helper is order-insensitive, so DST || aux is not pinned"
        );
    }

    /// Two draws that together stay inside the budget are fine; the one that
    /// crosses it is not. Pins the boundary rather than only the far side.
    #[test]
    fn the_budget_is_thirty_two_bytes_in_total_not_per_call() {
        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
        let mut a = [0u8; 16];
        let mut b = [0u8; 16];
        rng.fill_bytes(&mut a);
        rng.fill_bytes(&mut b);
        assert_eq!(a, [3u8; 16]);
        assert_eq!(b, [3u8; 16]);

        let mut rng = OneShotAux::new(Zeroizing::new([3u8; 32]));
        let mut a = [0u8; 24];
        rng.fill_bytes(&mut a);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut c = [0u8; 16];
                rng.fill_bytes(&mut c);
            }))
            .is_err(),
            "24 + 16 bytes were drawn from a 32-byte budget without stopping"
        );
    }
}

```


## FILE (complete): `signer/Cargo.toml`

```toml
[package]
name = "wconf-signer"
version = "0.0.1"
edition = "2021"
publish = false
description = "W-CONF holder signer. Real keys, real proofs, real signatures, hedged nonces on both algorithms. Devnet only. (This read 'skeleton. No keys, no proofs, no signing' until 2026-08-27, nine days after it stopped being true — REVIEW-025, Codex leg.)"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
libc = "0.2"
hmac = "0.12"
sha2 = "0.10"
k256 = { version = "0.13", default-features = false, features = ["arithmetic", "ecdsa"] }
ripemd = "0.1"
# `hazmat` — **B-16**, `REVIEW-024` 2026-08-27. It is what makes
# `ExpandedSecretKey`'s `hash_prefix` field and `hazmat::raw_sign` reachable, and
# hedging the RFC 8032 nonce prefix is one assignment to that field. ⚠ **This is
# a project-wide guardrail removal for one call site** — all three legs named it
# as the strongest argument against the change, and the ruling's §7 item 2 is
# what contains it: the verifying key is derived inside the signing helper and is
# never a parameter this signer accepts. It costs no compile time and no binary
# size: `src/lib.rs:268-271` compiles the module either way and the feature gates
# only its publicity.
#
# `zeroize` — **B-19**, decided 2026-08-27. ⚠⚠ **THIS COMMENT ASSERTED THAT THE
# FEATURE WAS OFF AND THAT IS FALSE — `CLAIMS.md` E-171.** It read: *"a crate
# DEFAULT that `default-features = false` turned off by accident … without it
# `ExpandedSecretKey` and `SigningKey` are not wiped on drop"*. The feature was
# **already on**: `std = ["alloc", ..]` and `alloc` lists `"zeroize/alloc"`
# without the `?` sigil that `serde?/alloc` beside it carries. Verified by
# reading the `--cfg` flags rustc actually receives — a crate depending on
# nothing but `ed25519-dalek` at `features = ["std"]` compiles its `lib.rs` with
# `--cfg 'feature="zeroize"'`.
#
# **Naming it here is still right**: an implied feature is one upstream refactor
# from vanishing, and `make check-zeroize-bounds` now pins it. ⚠ **`fast` stays
# off** — a speed trade with no security content, and re-enabling it is not that
# decision. `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md`.
ed25519-dalek = { version = "2", default-features = false, features = ["std", "hazmat", "zeroize"] }
# `zeroize` as a DIRECT dependency — **B-21**, 2026-08-27. `SigningKey` and
# `ExpandedSecretKey` have real `Drop` impls (`hazmat.rs:67-76`, read at source)
# — ⚠ **because the feature was always on, NOT because B-19 turned it on;
# this sentence said the latter in the same commit that corrected it elsewhere
# (E-171, E-172).** That reaches the
# crate's *types* and nothing else: the SHA-512 expansion this signer computes
# itself, the nonce mask, the auxiliary entropy buffer and the ECDSA aux RNG are
# plain locals in `xrpl.rs` that no `Drop` touches. Both `REVIEW-025` legs
# confirmed the residue independently.
#
# ⚠ **`default-features = false`** — the default is `alloc`, and `Zeroizing` is a
# `core` type. Nothing here zeroizes a heap collection.
#
# ⚠ **What this buys is bounded and P-5 governs the claim**: it narrows the
# window in which secret bytes sit in a stack frame that is later reused. It
# removes **no channel** — an adversary with code execution reads the scalar
# while it is live, Rust leaves the source of a move unwiped, and the curve
# arithmetic's temporaries are outside all of it.
zeroize = { version = "1", default-features = false }
ureq = { version = "3.4.0", default-features = false, features = ["rustls"] }

[features]
# Exposes `confirm::acknowledgement_for_test`, which fabricates the
# HumanAcknowledgement that A6 otherwise requires come from the signer's own
# window.
#
# NOT a default feature. It was one, and the README then claimed "a release
# build drops it" — false, because a plain `cargo build --release` keeps default
# features (REVIEW-014a/b). The dev-dependency on this crate below turns it on
# for tests only, so `cargo test` needs no flags AND a release binary genuinely
# cannot construct a HumanAcknowledgement.
test-support = []

# Self dev-dependency: enables `test-support` for the test targets only.
[dev-dependencies]
sha2 = "0.10"
# ⚠ **The `zeroize` dev-dependency is GONE and that is not an omission.** It was
# here for exactly one assertion — `hedged_signing.rs`'s
# `ed25519_secret_types_implement_zeroize_on_drop`, which names the
# `ZeroizeOnDrop` bound so reverting B-19's manifest line fails to COMPILE — and
# its comment said *"the signer itself does not depend on `zeroize`"*. **B-21
# made that false**, and a `[dependencies]` entry is already on the test targets'
# extern prelude, so keeping both would have been a duplicate carrying a stale
# reason. `CLAIMS.md`'s twenty-two-instance lesson, caught by grepping for what
# this commit contradicts.
wconf-signer = { path = ".", features = ["test-support"] }

[profile.release]
panic = "abort"

```


## FILE (complete): `tools/check-zeroize-bounds.py`

```python
#!/usr/bin/env python3
"""
Wiping-type gate — `CLAIMS.md` **B-19**, **B-21** and **E-171**.

Three questions. The first two are answered by making a compiler decide rather
than by reading a manifest; the third cannot be, and says so:

  **Part 1 — is `ed25519-dalek`'s `zeroize` feature on, and what turns it on?**
  Scratch-crate probes, one per feature set, each naming the `ZeroizeOnDrop`
  bound. Isolated from the signer so the answer cannot be confounded by anything
  else in this tree.

  **Part 2 — do the signer's own secret locals wipe?** In-tree reverts to bare
  arrays, each of which must break the build.

  **Part 3 — does the SIGNING HELPER actually use the wiping helper?** A source
  check, because no type can express it. ⚠ **Added after both `REVIEW-027`
  external legs found parts 1 and 2 are blind to it** (E-173): inlining
  `Sha512::digest` back into `sign_with_aux` leaves every other check green.

⚠ **PART 1 EXISTS BECAUSE B-19 WAS WRONG, AND THIS SCRIPT IS WHAT FOUND IT
(E-171).** `CLAIMS.md` E-167 said the `zeroize` feature *"was OFF, by accident,
for nine days"* and the B-19 decision said *"reverting the manifest line fails to
COMPILE"*. **Both are false.** The historical line —
`default-features = false, features = ["std"]`, at `16e2e58` — resolves to
`alloc,std,zeroize`, because `std = ["alloc", ..]` and `alloc` lists
`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry beside
it carries. The secret types were wiped on drop the whole time. B-19 made an
implied feature explicit, which is worth doing and is **not** what it said it
did. Three `REVIEW-025` legs and a `REVIEW-026` round accepted the claim, because
reading a manifest is not running one.

⚠ **CONTROLS RUN IN BOTH DIRECTIONS, and a gate without them is the false pass it
was built to catch (E-165, E-168).** Part 1's `[]` probe must FAIL, or "it
compiles" says nothing. Part 2's comment-edit control must still BUILD, or "the
build broke" says nothing.

⚠ **WHAT THIS DOES NOT SAY.** It says these types wipe on drop and these reverts
break the build. It does **not** say secret material is unrecoverable — see the
three residues named at `signer/src/xrpl.rs::sha512_zeroizing`, and P-5: an
adversary with code execution reads the scalar while it is live. This narrows a
window and removes no channel.

Run from the repository root:  python3 tools/check-zeroize-bounds.py
Exit 0 when every probe and every revert lands the way it is declared to.
"""
import subprocess, sys, shutil, os, tempfile, atexit, signal

MANIFEST = 'signer/Cargo.toml'
XRPL = 'signer/src/xrpl.rs'
FILES = [MANIFEST, XRPL]

if not all(os.path.exists(f) for f in FILES):
    sys.exit(f"run me from the repository root; {FILES} not found from {os.getcwd()}")

_bakdir = tempfile.mkdtemp(prefix='wconf-zeroize-bounds-')
_baks = {}
for _f in FILES:
    _b = os.path.join(_bakdir, os.path.basename(_f))
    shutil.copy(_f, _b)
    _baks[_f] = _b

def restore():
    for f, b in _baks.items():
        shutil.copy(b, f)

atexit.register(restore)
for _sig in (signal.SIGINT, signal.SIGTERM):
    signal.signal(_sig, lambda *_: (restore(), sys.exit(130)))

bad = 0

# ---------------------------------------------------------------------------
# Part 1 — what actually enables ed25519-dalek's `zeroize` feature
# ---------------------------------------------------------------------------
SCRATCH = tempfile.mkdtemp(prefix='wconf-zeroize-probe-')
os.makedirs(os.path.join(SCRATCH, 'src'), exist_ok=True)
open(os.path.join(SCRATCH, 'src', 'lib.rs'), 'w').write(
    "pub fn probe() {\n"
    "    fn requires<T: zeroize::ZeroizeOnDrop>() {}\n"
    "    requires::<ed25519_dalek::SigningKey>();\n"
    "}\n")

def probe(feats):
    """Build a scratch crate naming the bound. Returns True if it compiles."""
    open(os.path.join(SCRATCH, 'Cargo.toml'), 'w').write(
        '[package]\nname = "zprobe"\nversion = "0.0.0"\nedition = "2021"\n'
        '[dependencies]\n'
        f'ed25519-dalek = {{ version = "2", default-features = false, features = [{feats}] }}\n'
        'zeroize = { version = "1", default-features = false }\n')
    r = subprocess.run(['cargo', 'build', '-q'], cwd=SCRATCH,
                       capture_output=True, text=True)
    return r.returncode == 0

# (features, must_compile, what it establishes)
PROBES = [
  ('', False,
   "CONTROL — no features at all. Must FAIL, or 'it compiles' below means nothing."),
  ('"std"', True,
   "⚠ THE HISTORICAL LINE at 16e2e58. E-167 said this left zeroize OFF. It did not."),
  ('"alloc"', True,
   "`alloc` is the switch — it lists \"zeroize/alloc\" with no `?` sigil."),
  ('"std", "hazmat", "zeroize"', True,
   "today's line. Explicit, and — E-171 — not a behaviour change."),
]

print("check-zeroize-bounds — CLAIMS.md B-19, B-21, E-171\n")
print(f"  signer:  {os.path.abspath('signer')}")
print(f"  scratch: {SCRATCH}\n")
print("Part 1 — ed25519-dalek's `zeroize` feature, decided by a compiler")
print(f"  {'features':<32} {'result':<22} establishes")
print("  " + "-" * 104)
for feats, must, why in PROBES:
    got = probe(feats)
    ok = (got == must)
    verdict = ('compiles' if got else 'fails') + ('  OK' if ok else '  ⚠ NOT AS DECLARED')
    print(f"  [{feats}]".ljust(34) + f"{verdict:<22} {why}")
    if not ok:
        bad += 1

# ---------------------------------------------------------------------------
# Part 2 — the signer's own secret locals
# ---------------------------------------------------------------------------
def apply(old, new):
    hits = [(f, open(f).read()) for f in FILES]
    hits = [(f, t) for f, t in hits if t.count(old) == 1]
    if len(hits) != 1:
        counts = {f: open(f).read().count(old) for f in FILES}
        return f"BAD REVERT: pattern occurs {counts}; must be exactly once in exactly one file"
    f, t = hits[0]
    open(f, 'w').write(t.replace(old, new))
    return None

def compile_tests():
    r = subprocess.run(['cargo', 'test', '--all-features', '--no-run'],
                       cwd='signer', capture_output=True, text=True)
    return r.returncode == 0, r.stdout + r.stderr

REVERTS = [
  ("`sha512_zeroizing` returns a bare array (the expansion and the mask)",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let mut digest = hasher.finalize();
    let mut out = Zeroizing::new([0u8; 64]);
    out.copy_from_slice(digest.as_slice());
    digest.as_mut_slice().zeroize();
    out
}""",
   """fn sha512_zeroizing(parts: &[&[u8]]) -> [u8; 64] {
    let mut hasher = Sha512::new();
    for part in parts {
        hasher.update(part);
    }
    let digest = hasher.finalize();
    let mut out = [0u8; 64];
    out.copy_from_slice(digest.as_slice());
    out
}""",
   "the ed25519 SHA-512 expansion `h` and the nonce mask"),

  ("`fresh_aux` returns a bare array (the drawn auxiliary entropy)",
   """fn fresh_aux() -> Option<Zeroizing<[u8; 32]>> {
    let mut b = Zeroizing::new([0u8; 32]);
    match crate::store::getrandom(&mut b[..]) {""",
   """fn fresh_aux() -> Option<[u8; 32]> {
    let mut b = [0u8; 32];
    match crate::store::getrandom(&mut b[..]) {""",
   "the 32 bytes `getrandom` drew for the nonce hedge"),

  ("`OneShotAux` holds a bare array (the ECDSA aux, live for the whole sign)",
   """struct OneShotAux {
    bytes: Zeroizing<[u8; 32]>,
    used: usize,
}

impl OneShotAux {
    fn new(bytes: Zeroizing<[u8; 32]>) -> OneShotAux {""",
   """struct OneShotAux {
    bytes: [u8; 32],
    used: usize,
}

impl OneShotAux {
    fn new(bytes: [u8; 32]) -> OneShotAux {""",
   "the same drawn bytes, held across `sign_prehash_with_rng`"),
]

# ⚠ **Anchored on a STRUCTURAL line, not on prose.** Its first form patched the
# `sha512_zeroizing` doc headline — and a `REVIEW-027` fix rewrote that headline,
# so the control reported VOID and took the whole gate down with it. A control
# that breaks whenever someone edits a comment is a control that will be
# loosened, which is how `check-test-support-gate` acquired E-165.
CONTROL = ("CONTROL — a no-op line added inside the wiping helper. Must still BUILD.",
           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let mut hasher = Sha512::new();""",
           """fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
    let _negative_control = ();
    let mut hasher = Sha512::new();""")

print("\nPart 2 — the signer's own secret locals, decided by reverting them")
print("  baseline: the unmodified tree must build its tests ...")
ok, out = compile_tests()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print("\nVOID, not passing: the unmodified tree does not compile.")
    print("  Every revert below would 'break the build' for a reason that is not the revert.")
    sys.exit(1)
print("    builds. Every failure below is one a revert CAUSED.\n")

print(f"  {'result':<24} revert")
print("  " + "-" * 104)

name, old, new = CONTROL
restore()
err = apply(old, new)
if err:
    print(f"  {'VOID':<24} {name}\n    {err}")
    sys.exit(1)
ok, out = compile_tests()
restore()
if not ok:
    print("    " + "\n    ".join(out.splitlines()[-12:]))
    print(f"\nVOID, not passing: the negative control BROKE THE BUILD.")
    print("  'The build broke' then carries no information and every arm is a false pass. E-165.")
    sys.exit(1)
print(f"  {'still builds  OK':<24} {name}")

for name, old, new, register in REVERTS:
    restore()
    err = apply(old, new)
    if err:
        print(f"  {'BAD PATTERN':<24} {name}\n    {err}")
        bad += 1
        continue
    ok, out = compile_tests()
    if ok:
        print(f"  {'STILL BUILDS  ⚠ FALSE':<24} {name}\n    {register}")
        print("    ⚠ The secret stopped being a wiping type and NOTHING objected.")
        bad += 1
        continue
    mech = 'bound' if 'ZeroizeOnDrop' in out else 'type'
    print(f"  {'build broke  OK (' + mech + ')':<24} {name}\n    {register}")
restore()

# ---------------------------------------------------------------------------
# Part 3 - does the SIGNING HELPER actually use the wiping helper?
#
# ⚠ **BOTH `REVIEW-027` EXTERNAL LEGS FOUND THAT PARTS 1 AND 2 MISS THIS, AND
# THEY ARE RIGHT (CLAIMS.md E-173).** Part 2 mutates `sha512_zeroizing`'s
# RETURN TYPE, and the in-crate test calls `sha512_zeroizing` DIRECTLY. So if
# `sign_with_aux` stopped calling it and inlined `Sha512::digest(..)` again, the
# helper would still exist, the test would still name its bound, part 2's revert
# would still break the build - and the signing path would be back to unwiped
# digests with every check green.
#
# **A type cannot express "this call site must use that function", so this is a
# SOURCE-level check** - the same shape as `check-blinding-sources.ts`, which
# gates which call sites may reach the superseded generator.
#
# ⚠ **It is a check over a KNOWN SPELLING, not over reachability.** A hash
# assembled some other way is invisible to it, exactly as `check-blinding`'s own
# header says of itself (E-142). Stated because the alternative is a false
# guarantee.
def ed25519_arm_of_sign_with_aux(text):
    """The Ed25519 match arm inside `sign_with_aux`, or None if not locatable."""
    i = text.find("fn sign_with_aux(")
    if i < 0:
        return None
    j = text.find("Inner::Ed25519(k) =>", i)
    if j < 0:
        return None
    k = text.find("\n        }\n    }\n}", j)
    return text[j:k if k > 0 else len(text)]

print("\nPart 3 - the signing helper must hash THROUGH the wiping helper")
restore()
src = open(XRPL).read()
arm = ed25519_arm_of_sign_with_aux(src)
if arm is None:
    print("  VOID: could not locate the Ed25519 arm of `sign_with_aux`.")
    bad += 1
else:
    BANNED = ("Sha512::digest", "Sha512::new")
    stray = [b for b in BANNED if b in arm]
    uses_helper = "sha512_zeroizing(" in arm
    if stray or not uses_helper:
        print(f"  ⚠ FALSE: the Ed25519 arm {'contains ' + ', '.join(stray) if stray else 'does not call sha512_zeroizing'}.")
        print("    Every hash over secret input on the signing path must go through")
        print("    `sha512_zeroizing`, or its digest is an unwiped stack local again.")
        bad += 1
    else:
        n = arm.count("sha512_zeroizing(")
        print(f"  no stray `Sha512::` in the arm, and {n} call(s) to `sha512_zeroizing`  OK")

    # ⚠ The control: the check must DETECT the inlining it exists to forbid.
    # Without this, "no stray Sha512" could mean the locator returned an empty
    # string - which is E-165's false pass exactly.
    mutated = arm.replace("sha512_zeroizing(&[k.as_bytes()])",
                          "Sha512::digest(k.as_bytes())")
    if mutated == arm:
        print("  VOID: the control could not be applied - the expected call site moved.")
        bad += 1
    elif any(b in mutated for b in BANNED):
        print("  CONTROL: inlining `Sha512::digest` at the call site IS detected  OK")
    else:
        print("  ⚠ VOID: the control was applied and NOT detected. This check is blind.")
        bad += 1

print("\n" + "-" * 106)
if bad:
    print(f"FAIL: {bad} probe(s) or revert(s) did not land as declared.")
else:
    print(f"PASS: {len(PROBES)} feature probes, {len(REVERTS)} reverts and the call-site check")
    print(f"      all landed as declared, with a control in each direction.")
print("⚠ '(bound)' means the `ZeroizeOnDrop` bound refused it; '(type)' means an incidental")
print("  type mismatch did. Both break the build; only the first is a check on the PROPERTY.")
print("⚠ ⚠ **B-19's own claim is NOT in the revert list, because it is FALSE** — removing the")
print("  `zeroize` word from the ed25519-dalek line does NOT break the build. Part 1's")
print('  [\"std\"] probe is what establishes why. CLAIMS.md E-171.')
print("⚠ This says these types wipe on drop. It does NOT say the secret is unrecoverable —")
print("  see `sha512_zeroizing`'s three named residues, and P-5.")
sys.exit(1 if bad else 0)

```
