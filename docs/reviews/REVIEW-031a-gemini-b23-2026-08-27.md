# REVIEW-031a — Gemini 3.1 Pro (High), INLINE PACKET — B-23

Frozen commit `0766d49317743f9fbf0f422af37246cadcbd8aa1`. **Packet: inline** — the
complete diff, the complete `holder.rs`, the complete test file and the complete
`REVIEW-029c` ruling, pasted. No repo access, no tools. Deliberately differed from
the Codex leg (E-160, E-180).

---

Here is the adversarial review of B-23 against `REVIEW-029c`'s ruling and claims, evaluated without assuming the comments are correct.

### 1. `holder.rs` double-decodes the seed, reproducing the defect B-23 fixed (HIGH)
**File and Line:** `signer/src/holder.rs:414` and `:441`
**Description:** `REVIEW-029a` finding 3 explicitly named "the seed decoded twice" in `keygen.rs` as a defect because allocating a second heap buffer for the master seed creates an avoidable copy with its own live window. B-23 removed it from `keygen.rs`, but identically reproduced it in `holder.rs`.
When a derived-key profile is loaded, the code calls `AccountKey::from_family_seed(&seed)`, which decodes the base58 string into a heap buffer. Then, it calls `keygen::derive_from_master_seed(&seed, Some(&account.account_id()))`, which decodes the same base58 string a *second* time. The comment admits the ID check is tautological, but misses that this tautological verification is paid for by duplicating the decode buffer. 
**Falsification:** Remove `AccountKey::from_family_seed` and instead get the `AccountKey` directly from the `DerivedKey` returned by `derive_from_master_seed(&seed, None)`. The tests will pass, proving the first decode was entirely redundant.

### 2. `check-zeroize-bounds.py`'s revert count for E0053 is a false claim (HIGH)
**File and Line:** `tools/check-zeroize-bounds.py:629`
**Description:** The script asserts that reverting the return type of `ask_secret` to a bare `Option<String>` produces exactly "ONE error, E0053, biting at `TerminalIo`'s impl, which is the REAL terminal reader and not a test double". This is false.
Because the script runs `cargo build --tests`, the test suite is also compiled. `tests/onboarding.rs` contains the `Script` test double, which also implements `OnboardingIo::ask_secret`. Reverting the trait definition causes **TWO** E0053 errors (one in `src/onboarding.rs` and one in `tests/onboarding.rs`). This is an E-181 shape defect: a numeric claim about compiler behavior that is demonstrably wrong.
**Falsification:** Revert `OnboardingIo::ask_secret`'s return type to `Option<String>` and run `cargo build --tests`. Rustc will emit E0053 in both files.

### 3. `StdinLock` retains an unnamed plaintext seed copy (MEDIUM)
**File and Line:** `signer/src/onboarding.rs:809`
**Description:** B-23 correctly provisions a non-growing `Zeroizing` buffer for the typed seed to prevent `read_line` reallocation. However, `std::io::stdin().lock()` yields a `StdinLock`, which is a buffered reader (`BufRead`). The standard library reads the user's keystrokes from the OS into `Stdin`'s global, fixed-size internal heap buffer before copying it into the caller's `line` string. 
This internal buffer retains a copy of the plaintext seed and is never zeroized; it lives until overwritten by subsequent stdin reads. While P-5 governs the claim, this buffer is a distinct copy from "read_line's buffer growth" and is **not listed** in the named residuals.
**Falsification:** Trace the standard library implementation of `std::io::StdinLock` and `BufRead::read_line`; observe that the bytes are read into an internal buffer (`fill_buf`) that does not implement zeroization.

### 4. Flawed reasoning in `holder.rs` about explicit bindings vs return types (LOW)
**File and Line:** `signer/src/holder.rs:424-430`
**Description:** The comment explicitly claims that writing `ask_seed()?.trim().to_string()` without an intermediate binding would not "wipe the copy and drop the original," labeling that idea as "false". However, its own reasoning proves the opposite: *"the temporary is a `Zeroizing<String>` and Rust drops it at the end of the statement, which wipes it."* 
If Rust drops and wipes the temporary at the end of the statement, then an inline expression **would** wipe the copy just as effectively as the explicit binding. The comment correctly identifies that the protection stems from the return type, but its rationale for refuting the inline expression contradicts itself.
**Falsification:** Write `Zeroizing::new(ask_seed()?.trim().to_string())` and examine the drop semantics; the temporary `Zeroizing<String>` returned by `ask_seed()?` will drop and zeroize at the end of the statement, achieving the exact same wipe.

*(Note on area evaluated: The `IgnoredAny` swap in `holder.rs` and its corresponding tests in `profile_parse_b23.rs` are confirmed to be behavior-preserving. The tests are tight to the new implementation and correctly check the error variants rather than substrings, avoiding the E-193 false-pass shape.)*
