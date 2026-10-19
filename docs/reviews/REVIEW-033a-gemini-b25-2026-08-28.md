# REVIEW-033a — LEG — Gemini 3.1 Pro (High), INLINE PACKET

Frozen `dee8570c8996deae3976d043d1566b65870c7adf`. Round three, B-25.

**Packet:** inline and complete — the request, the complete
`git diff cfd81db 8acb334 -- signer/ tools/`, and the COMPLETE current text of
`scalar.rs`, `keygen.rs`, `randomness.rs`, `prover.rs`, `store.rs`,
`keygen_kat.rs` and `check-zeroize-bounds.py` (249 KB). ⚠ **Nothing excerpted**
— E-160. **No tools.** Everything it asserts empirically is PREDICTED and it
labelled every claim so, as asked.

⚠ **Deliberately differed from `REVIEW-033b`, which had read-only repo access**
and could execute the gate's own functions. E-180.

⚠ **`agy` invocation, unchanged from `REVIEW-032a` and still true:** `--effort`
is REJECTED for `--model "Gemini 3.1 Pro (High)"` — the effort is in the model
name. Every flag **before** `-p`. Non-repo cwd. `--print-timeout 9m`.
⚠ **`agy` resets the shell cwd when it exits.**

⚠ **Adjudicator's note, recorded here rather than only in `REVIEW-033c`:** this
leg's two HIGHs — moved-from source slots, and drop-on-the-error-path timing —
are the two findings `REVIEW-033c` **REJECTED**, and they are also the two on
which it declared a CONSTRUCTION defect. Its other four findings, graded lower,
were **all upheld**, two of them measured false passes nobody else found first.
**The grading was inverted and the round's value was in the lower half.**

---

### HIGH: `?` propagation and destructuring leave moved-from `Result` and tuple source slots unwiped
**File:** `signer/src/randomness.rs`, `derive_pair` (and `derive`)
Adding `Drop` to `Scalar` only wipes the final bound variables. When `reduce_wide` returns `Result<Scalar, ZeroScalar>`, the `?` operator moves the `Scalar` out. Rust moves are `memcpy`, leaving the 32 bytes of the secret inside the `Result`'s stack slot. Because it was moved from, `Drop` does NOT run on the `Result`'s slot. The exact same leak occurs when the returned `Result<(Scalar, Scalar), DeriveError>` is destructured into `let (r, rho) = ...`. These intermediate containers are destructuring sources left live on the stack unwiped, and represent an unnamed residual.
**Falsifier:** A demonstration that Rust's `?` operator or tuple destructuring automatically zeroes the memory of the moved-from container, or that `Drop` executes on the source slots despite the move.
**PREDICTED** (I cannot compile or inspect the stack memory).

### HIGH: `Scalar`'s new destructor introduces a data-dependent timing difference on the error path
**File:** `signer/src/randomness.rs`, `derive_pair`
`reduce_wide`'s zero branch is secret-dependent. In `derive_pair`, if `rho`'s `reduce_wide` hits this zero branch, the function propagates the error and returns early. Because `r` (a `Scalar`) is already successfully bound in the local scope, this early return causes `r.drop()` to run. This adds the time taken to zeroize 32 bytes *exclusively* to the secret-dependent error path, introducing a timing difference that did not exist when `Scalar` was `Copy`.
**Falsifier:** A demonstration that `r.drop()` runs unconditionally in `derive_pair` regardless of whether `rho` is zero, or that the zeroization takes zero CPU cycles.
**PREDICTED** (I cannot compile or measure execution time).

### HIGH: The `U256` residual's stated reason is a false dichotomy because `Zeroize` does not require removing `Copy`
**File:** `signer/src/scalar.rs`, `reduce_wide_mod`
The docstring claims the `U256` residual is "NOT fixed here deliberately" because removing `Copy` to add a destructor would rewrite the routine. This is false: nothing requires adding a destructor to wipe a type. One can explicitly call `zeroize::Zeroize::zeroize(&mut diff.0)` inside the loop, and do the same for `acc` before returning, because `[u64; 4]` implements `Zeroize`. The constant-time property is fully preserved without removing `Copy`. The residual rests on a fabricated reason standing in for a measurement.
**Falsifier:** A compiler error showing that `diff.0.zeroize()` fails because `U256` is `Copy`, or a proof that explicitly calling zeroize breaks the constant-time execution of the loop.
**PREDICTED** (I cannot compile to verify the explicit zeroize call).

### HIGH: `dropping_a_scalar_overwrites_its_bytes` is UB under Stacked Borrows
**File:** `signer/src/scalar.rs`, `wiping_tests::dropping_a_scalar_overwrites_its_bytes`
The test derives a raw pointer `storage` from a shared reference (`held.as_bytes().as_ptr()`). It then calls `ManuallyDrop::drop(&mut held)`, which creates a mutable reference `&mut held` that overlaps the entire object. Under Stacked/Tree Borrows, this mutable reference invalidates the previously derived shared pointer. Reading through `storage` afterwards is Undefined Behaviour, meaning the test proves nothing. A sound construction must derive the raw pointer from a mutable reference (e.g., `let ptr = &mut *held as *mut Scalar; let storage = ptr as *const u8;`) and use `std::ptr::drop_in_place(ptr)`.
**Falsifier:** A successful run of this exact test under Miri with Stacked Borrows enabled that does not report a use-after-invalidation error.
**PREDICTED** (I cannot compile or run Miri).

### MEDIUM: `strip_line_comments` stripping inside string literals is unsafe for negative needles
**File:** `tools/check-zeroize-bounds.py`, `strip_line_comments`
The docstring claims that stripping `/*` inside a string literal is safe because "it can only make a needle harder to satisfy". While true for positive needles (which fail safe if stripped), `single_decode_findings` enforces a *maximum* count (`total != 1`). A malicious committer can write `let decoy = "/*";` to open a comment block that swallows a real second decode on the following lines, closing it later with `"*/"`. This hides the second decode from the scanner, leaving the count at 1 and producing a FALSE PASS.
**Falsifier:** A demonstration that `single_decode_findings` still catches a second decode placed between `"/*"` and `"*/"` in string literals.
**PREDICTED** (I cannot run the Python script to verify the exploit).

### MEDIUM: `single_decode_findings` helper regex misses `pub fn` and space-formatted functions
**File:** `tools/check-zeroize-bounds.py`, `single_decode_findings`
The script attempts to find helpers that `derive_raw` calls using the regex `r"\nfn ([a-z_0-9]+)\("`. This strictly requires exactly `\nfn ` and no space before the parenthesis. If an attacker declares the helper as `pub fn duplicate_decode(` or `fn duplicate_decode (`, the regex completely misses it. The B-25 control only replays the exact `fn duplicate_decode(` mutation, so it fails to prove that the script reliably catches helpers.
**Falsifier:** A demonstration that the regex `r"\nfn ([a-z_0-9]+)\("` successfully matches a line starting with `pub fn ` or containing a space before the parenthesis.
**PREDICTED** (I cannot run the regex matcher).

### LOW: The request table miscounts `B23_SITES` as 12; there are exactly 11
**File:** (Request text)
The table claims "`B23_SITES` grows from 9 to 12". However, reading the list in `check-zeroize-bounds.py` yields exactly 11 entries (4 for decoders, 1 for Scalar, 4 in holder.rs, 2 in onboarding.rs). The total needle count of 12 is correct only because it correctly includes the 1 needle from `B22_SITES`.
**Falsifier:** A 12th entry existing in `B23_SITES` in the frozen commit.
**PREDICTED** (I cannot execute `len(B23_SITES)`).

## What is correct
* **The Producer Fix (Drop on Scalar):** Replacing the consumer-side `.zeroize_source_copy()` calls with `ZeroizeOnDrop` for `Scalar` correctly ensures the final bound variables of `r`, `rho`, and `sk` are wiped unconditionally when their scopes end.
* **The Decoder Needles:** Updating the decoder needles to span the signature, body, and return correctly pins that the decoding is built directly into a wiping array, preventing a reversion to a bare `out` source that leaves a copy live.
* **Single Decode Verification:** `single_decode_findings` now correctly counts every seed decoder by name across both public wrappers, properly enforcing the "one decode" rule globally rather than looking for a specific spelling.
* **Nesting Awareness in Comments:** Updating `strip_line_comments` to use a `depth` counter instead of a boolean correctly prevents inner `*/` tokens from prematurely closing nested block comments.

## Convergence
There **IS A CONSTRUCTION DEFECT**. 
The findings are not limited to sentences, counts, and gates. Finding 1 identifies a structural leak where destructuring `Result` and tuples leaves 64 bytes of live secrets unwiped on the stack due to Rust's move semantics. Finding 2 identifies a newly introduced data-dependent timing side channel in the constant-time path caused by the destructor running exclusively on the secret-dependent error path. The rotation must continue to address these construction flaws.
