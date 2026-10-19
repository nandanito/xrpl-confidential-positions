# REVIEW-032a — LEG — Gemini 3.1 Pro (High), INLINE PACKET

Frozen `2cf6ee186a6bec0d801fd9ed22f11d20c01c789b`. Round two, B-24.

**Packet:** inline and complete — the request, `REVIEW-031c`, the complete
`git diff a2561ec 9878046 -- signer/ tools/`, and the COMPLETE current text of
`keygen.rs`, `holder.rs`, `xrpl.rs`, `onboarding.rs`, `profile_parse_b23.rs` and
`check-zeroize-bounds.py` (318 KB, ~80k tokens). ⚠ **Nothing excerpted** — E-160.
**No tools.** Everything it asserts about compiling is PREDICTED.

⚠ **Deliberately differed from `REVIEW-032b`, which had read-only repo access**
and could run the test binaries. E-180: identical packets give unanimity that is
one reading distributed. The two legs overlapped on the comment stripper and
diverged everywhere else.

⚠ **`agy` invocation note:** `--effort high` is REJECTED for
`--model "Gemini 3.1 Pro (High)"` — *"--effort is not supported for model"* —
because the effort is already in the model name. Every flag before `-p`.

---

### HIGH: The needle check is blind to string literals, making the pin trivial to bypass
**File:** `tools/check-zeroize-bounds.py`, line 523 (`strip_line_comments`)
The check claims the only thing standing between the fix and silent regression is the two source needles, but `strip_line_comments` does not parse string literals. 
**Falsifier:** Revert both decoders to return bare `[u8; 16]` arrays, and assign the exact needle text to dummy string variables (e.g., `let _bypass = "pub fn decode_family_seed(...) -> ...";`). The gate will see the needles in the strings, count them as 1, and FALSELY PASS the broken build.

### HIGH: `strip_line_comments` is NOT safe-direction-only due to nested block comments
**File:** `tools/check-zeroize-bounds.py`, line 523 (`strip_line_comments`)
The docstring claims the scanner's lack of lexer awareness can only make a needle "harder to satisfy". This is false. A nested block comment will turn `in_block` off at the first `*/`, exposing the rest of the commented code to the scanner. This makes the needle *easier* to satisfy by matching code that is actually commented out.
**Falsifier:** Comment out a required wiping line with nested block comments: `/* /* */ <needle> */`. The gate will find the needle and FALSELY PASS, even though the wipe is removed from the compiled code.

### HIGH: `finish()` and the new public entry point are completely blind to the KATs
**File:** `signer/src/keygen.rs`, line 436 (`intermediates_for_test`) and `signer/tests/keygen_kat.rs`
The known-answer tests call `intermediates_for_test`, which invokes `derive_raw` directly and returns the intermediates. It NEVER calls `finish()`. Therefore, the KATs do not test the actual `sk` and `pk` derivation, nor do they test the new `derive_from_master_seed_with_account` entry point. 
**Falsifier:** Corrupt the `sk` or `pk` computation inside `finish()`, or mutate `derive_from_master_seed_with_account`. The KATs will still pass.

### MEDIUM: `single_decode_findings` is scoped too tightly and misses other public entry points
**File:** `tools/check-zeroize-bounds.py`, line 663 (`derive_raw_body`) and 677 (`single_decode_findings`)
`derive_raw_body` slices only up to the next `\nfn ` or `\npub fn `, restricting the check exclusively to the `derive_raw` function. It completely ignores `derive_from_master_seed`, `derive_from_master_seed_with_account`, and `finish`. If a double-decode is introduced in those public wrappers, the gate is blind to it. The controls fail to expose this because they do not run a mutation outside of `derive_raw`.
**Falsifier:** Add a call to `from_family_seed` inside `derive_from_master_seed`. Run the gate; it will pass.

### LOW: Hand-restated counts have expired again
**File:** `tools/check-zeroize-bounds.py`, line 6 and `signer/tests/profile_parse_b23.rs`, line 23
Despite the explicit warning against restated counts, the docstring for the gate still says "Three questions" when there are now 6 parts. The test file `profile_parse_b23.rs` claims "These four tests are that falsifier" but actually contains 5 tests.
**Falsifier:** Count the parts in the script and the tests in the file. They are 6 and 5, respectively.

### CORRECT FIXES (Absences Verified)
* **`holder.rs` DROPPED THE `expected_account_id` CHECK:** The fix is **CORRECT**. Both `AccountKey::from_family_seed` and `derive_from_master_seed` run deterministic pure functions on the exact same `seed`. The check was comparing an account derived from the seed against an account derived from the identical seed using the identical algorithm. It was a tautology, and deleting it correctly removes the second decode without weakening any defense.
* **The `Stale` vs `Json` behaviour change (E-197):** The fix is **CORRECT**. `serde_json`'s `IgnoredAny` successfully skips invalid JSON values (like `1e999` or `\uD800`) without returning a syntax error, allowing the stale field check to correctly surface `Stale` instead of failing the overall parse.
