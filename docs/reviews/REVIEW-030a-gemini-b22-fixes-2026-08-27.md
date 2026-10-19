### 1. Defects in the Construction

1. **Stack copy leak in `intermediate` derivation (`xrpl.rs:518`):**
   The second closure calls `Zeroizing::new(sha512half(&m))`. Because `sha512half` returns a bare `[u8; 32]` (`Copy`), passing it by value into `Zeroizing::new` **copies** the array, leaving the 32-byte secret scalar candidate temporary sitting unwiped on the stack. This reproduces the exact copy-not-move defect `keygen.rs` was modified to prevent.
2. **Unwiped secret scalar primitives (`xrpl.rs:520-524`):**
   `root` ([`k256::NonZeroScalar`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L500-L530)), `intermediate` ([`k256::NonZeroScalar`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L510-L530)), and `sum` ([`k256::Scalar`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L520-L530)) are left unwiped in the stack frame of `from_entropy`. While `sum_bytes` is wiped, `sum` itself and both component scalars remain live in stack memory until overwritten.
3. **Unwiped heap buffers (`xrpl.rs:506, 515`):**
   `root_pub` is allocated as a bare `Vec<u8>`, and `m` in the second closure is cloned into a bare `Vec<u8>`. Neither uses [`Zeroizing`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/keygen.rs#L130-L150) to clear its heap allocation on drop.

---

### 2. Part 5 Gate Falsification and False-Pass Modes

1. **Circular positive control:**
   `CONTROL(+)` sets `_present = B22_SITES[0][1]` and runs the exact same string count check that the `B22_SITES` loop already ran. It does not act as an independent control of the harness machinery.
2. **Non-falsifying negative control:**
   `CONTROL(-)` checks `any(_absent in open(f).read())`. It does **not** route `_absent` through `B22_SITES` or `bad += len(missing)`, failing to verify that a missing table entry actually fails the gate.
3. **False-pass in Part 2 revert description (`tools/check-zeroize-bounds.py:165`):**
   The revert on [`sha512half_zeroizing`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L242-L278) claims to falsify `"the ed25519 private key and the secp256k1 root preimage digest"`. As the inline comment acknowledges, `ed25519_from_entropy` compiles cleanly against a bare `[u8; 32]` because `SigningKey::from_bytes` takes `&[u8; 32]`. The revert only breaks at `derive_scalar`, so the gate does not test the ed25519 call site via compilation.
4. **Scope omits intermediate closure:**
   `B22_SITES` pins the first closure's `Vec::with_capacity` buffer, but completely omits the second closure's return expression and `root_pub` buffer.

---

### 3. Prose Overclaiming

1. **`xrpl.rs:520` — `"Both wipe"`:**
   Claims both `sum` and `sum.to_bytes()` wipe. `sum` (`k256::Scalar`) is never wiped; only `sum_bytes` is cleared.
2. **`xrpl.rs:521` — `"crate's boundary, not an omission"`:**
   Calling the failure to wipe `root` and `intermediate` a "boundary" directly contradicts Ruling Condition 2, which explicitly mandated `intermediate`, `root`, and `sum` in scope.
3. **`xrpl.rs:260-270` — `"The INPUT there is public"`:**
   `root_pub` is an unpublished intermediate generator point (`root · G`). It is not the account public key (`sum · G`) and is never broadcast. Calling it "public" overstates its exposure and understates the risk of leaking it.
4. **`tools/check-zeroize-bounds.py:165` — `"2 compile errors"`:**
   Reverting [`sha512half_zeroizing`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L242-L278) only breaks the single `root` closure bound in `derive_scalar`; claiming 2 compile errors overstates caller-side breakage.
5. **`xrpl.rs:994` — `"it is a MOVE"`:**
   `out` is `[u8; 16]`, which is `Copy`, not move.

---

### 4. Condition 2 Honour & Safety of the Second Closure

**Condition 2 is not honoured correctly, and leaving the second closure on `sha512half` is unsafe:**
1. **Output is secret:** The closure output is the derived intermediate private scalar. Returning `sha512half(&m)` into `Zeroizing::new(...)` leaves a 32-byte unwiped stack copy of that private scalar in the closure's stack frame.
2. **Input is not public:** `root_pub` is an intermediate secret curve point. If `root_pub` leaks alongside `sum`, an attacker can compute `intermediate` and recover `root = sum - intermediate`, compromising all sibling accounts derived from the master seed.

---

### 5. What the Diff Missed in Ruled Scope

1. **Zeroization of `root` and `intermediate` (`k256::NonZeroScalar`):** Ruled in scope (Condition 2), but left unzeroized.
2. **Zeroization of `sum` (`k256::Scalar`):** Ruled in scope (Condition 2), but left unzeroized.
3. **Use of [`sha512half_zeroizing`](file://$HOME/.gemini/antigravity-cli/scratch/signer/src/xrpl.rs#L242-L278) in the second closure:** Left using `sha512half`, causing the stack temporary copy leak.
4. **Zeroization of `root_pub` and closure buffer `m`:** Left as unwiped heap `Vec<u8>` allocations.
5. **Gate coverage for all scoped sites:** `B22_SITES` in [`check-zeroize-bounds.py`](file://$HOME/.gemini/antigravity-cli/scratch/tools/check-zeroize-bounds.py#L425-L480) omitted pinning the second derivation closure and scalar cleanup sites.
