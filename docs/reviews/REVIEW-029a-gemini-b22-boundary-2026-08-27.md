# Adversarial Review: Decision Request B-22 (Secret-Residue Boundary)

---

### 1. Is the re-framing in §0 right, or is it SCOPE CREEP?

**It is SCOPE CREEP.**

The inherited, bounded question was straightforward: *Should the unwiped key-derivation sites within the cryptographic engine (`signer/src/xrpl.rs`) be wiped to match the zeroization standard established for signing nonces in B-21?*

The author re-frames this into an unbounded architectural question: *"what is the unit whose secret residue this signer manages, and is there a defensible boundary anywhere short of the whole seed-to-key path?"*

This re-framing is an evasive maneuver. By expanding the scope from a well-defined cryptographic module cleanup (`xrpl.rs`) to the entire application lifecycle (spanning `std::fs`, `serde_json`, CLI prompting, and `holder.rs`), the author constructs a false dilemma:
- Either perform an unmeasured, high-risk refactor across the entire application stack (Option C/D)—which the author admits is not even known to be feasible—
- Or declare any partial cleanup "inconsistent" and do nothing (Option A).

In secure systems engineering, the cryptographic core (`xrpl.rs`) is a standard, defensible boundary. Conflating cryptographic primitive hygiene with whole-process memory sanitization is classic scope inflation designed to paralyze decision-making.

---

### 2. Does F2 defeat Option B?

**NO.**

F2 notes that `signer/src/holder.rs` holds the seed in plaintext heap `String`s before passing it to `xrpl.rs`. The author claims this "defeats" Option B because wiping `xrpl.rs` locals without wiping `holder.rs` strings merely relocates the seam from "`xrpl.rs` vs the rest" to "`xrpl.rs` vs `holder.rs`".

This argument relies on the **Nirvana Fallacy** (demanding all-or-nothing perfection) and directly violates **`CLAIMS.md` P-5**:
> *"wiping narrows a window and removes no channel."*

Under P-5, wiping never claims whole-memory eradication (the SHA-512 block buffer and Rust move sources remain unwiped regardless). The consistency objection raised by `REVIEW-027` was **internal to the cryptographic module**: within `xrpl.rs`, the code meticulously zeroized ephemeral signature nonces (`OneShotAux`, `sha512_zeroizing`) while leaving long-term root private key scalars (`sum`, `root`, `intermediate`, `sha512half(entropy)`) completely raw on the stack and heap.

Option B is entirely defensible and honestly stated as:
> *Cryptographic core hygiene within `signer/src/xrpl.rs`: zeroizing derived private keys, intermediate scalars, and hash buffers during key derivation, matching the zeroization invariant enforced for signing nonces in `xrpl.rs`. Per P-5, this narrows the exposure window of derivation intermediates within the cryptographic module; it does not eliminate upstream configuration string copies in `holder.rs` or `serde` buffers.*

The boundary between a cryptographic library module (`xrpl.rs`) and an application profile loader (`holder.rs`) is a standard separation of concerns, not an arbitrary seam.

---

### 3. Is F3's regime split (file-based vs prompted profile) real, or is it a way of not deciding?

**It is A WAY OF NOT DECIDING.**

F3 claims that for file-based profiles, memory wiping is irrelevant because the seed is already plaintext on disk, whereas for prompted profiles, memory is the sole exposure.

This rationale is flawed for two reasons:
1. **It violates Defense-in-Depth:** Filesystem permissions (e.g., `0600`, dedicated user/group isolation, read-only mounts, ephemeral container volumes) and memory access (`/proc/$PID/mem`, core dumps, memory scraping) represent distinct exposure windows and access controls. An application may read a configuration file at startup and drop privileges or run in a sandbox. Leaving secrets lingering indefinitely in heap and stack debris because "it was once on disk" is an anti-pattern.
2. **It breaks Cryptographic Layering:** `xrpl.rs` does not and should not know or care where a seed string originated. `AccountKey::from_family_seed(&seed)` receives a string slice. Attempting to condition cryptographic memory hygiene on application-level configuration modes (Option D) adds untestable prose and superficial complexity.

F3 is a rationalization created to split options and evade a clean architectural choice.

---

### 4. WHICH OPTION, and why

**OPTION B (with strict P-5 bounding).**

- **Option A is rejected:** Deferring key-derivation wiping leaves long-term master private keys (`ed25519_from_entropy` at `xrpl.rs:445`, secp256k1 `root`, `intermediate`, `sum` at `:460-478`, and candidate scalars in `derive_scalar` at `:943`) completely unzeroized in `xrpl.rs`. Leaving root master key material exposed while wiping ephemeral nonces in the very same file is indefensible. The asymmetry noted in §1 (long-term master seed vs single-use nonce) makes wiping derivation intermediates *more* critical, not less.
- **Option C is rejected (for this step):** Option C attempts an unvetted, sprawling refactor into `serde_json` and `holder.rs`. As §4 notes, `serde_json` allocates internal `String`s during parsing; attempting to guarantee zeroization across third-party JSON deserializers risks making unverifiable claims.
- **Option D is rejected:** It relies on F3's flawed regime split and creates an untestable, bifurcated security contract.
- **Option B is the sound cryptographic engineering choice:**
  1. It cleans up private key scalars, preimages, and intermediate buffers inside the cryptographic engine (`signer/src/xrpl.rs`).
  2. The infrastructure (`sha512_zeroizing`, `Zeroizing`) is already implemented and verified in `xrpl.rs`.
  3. It is verified by existing test vectors (`tests/xrpl_vectors.rs`) and test gates (`make check-zeroize-bounds`).
  4. It complies strictly with P-5: narrowing the exposure window of key derivation in `xrpl.rs` without making false promises about the outer application shell.

---

### 5. What is WRONG with this request itself?

1. **`sha512_zeroizing` Signature Mismatch (F1):**
   In §2 F1, the author claims: *"Routing the three secret callers through it leaves `sha512half` and every public caller untouched."*
   `sha512_zeroizing` (`xrpl.rs:233`) returns `Zeroizing<[u8; 64]>`, whereas `sha512half` returns `[u8; 32]`. Slicing a 64-byte `Zeroizing` buffer into a bare `[u8; 32]` array recreates the exact unzeroized stack temporary the change aims to prevent. A helper returning `Zeroizing<[u8; 32]>` (or explicit zeroization of the slice) is required; `sha512_zeroizing` is not a drop-in replacement as claimed.

2. **Incomplete Audit of `holder.rs` (Missed `serde_json::Value` at `:287`):**
   In §2 F2, the author criticizes the evidence file for missing `holder.rs` and lists three unzeroized sites (`:272`, `:162`, `:313`). However, the author missed `holder.rs:287-288`:
   ```rust
   let tree: serde_json::Value =
       serde_json::from_str(raw).map_err(|e| ProfileError::Json(e.to_string()))?;
   ```
   `holder.rs` parses the JSON *twice*. Line 287 parses `raw` into a dynamic `serde_json::Value` AST, creating heap `Map` and `String` allocations for the entire profile (including `account_seed` and `elgamal_sk`). The author's "complete" site list of `holder.rs` is itself an incomplete hand-enumeration.

3. **Incomplete Audit of `keygen.rs` (Missed Duplicate Derivation at `:225`):**
   In §2 F4, the author notes that `keygen.rs:220` calls `decode_family_seed`. But the author fails to note line `:225`:
   ```rust
   let account = xrpl::AccountKey::from_family_seed(family_seed)
   ```
   `keygen.rs` calls `from_family_seed`, which calls `decode_family_seed` a *second* time and re-derives the account key. This duplicates the entire set of unzeroized decode and derivation stack/heap buffers.

4. **Category Error Regarding CI Gates (§5):**
   In §5, the author claims that `make check-zeroize-bounds` solves the problem of hand-enumerated site lists being unfalsifiable. This is false. A CI gate can verify that *known, designated sites* use zeroizing types or break on modification; it **cannot** prove that no unlisted secret-bearing sites exist. Asserting that a gate falsifies the completeness of an enumerated site list confuses positive verification of known targets with exhaustive discovery of unknown sites.

5. **Missed Unwiped Cryptographic Intermediates in Decoders:**
   While F6 notes heap `Vec` allocations in `b58_decode`, the request omits that `base58check_decode` (`xrpl.rs:273`) and `decode_ed25519_seed` (`xrpl.rs:899`) execute double `Sha256` digests over secret seed bytes, leaving raw hash outputs and intermediate digest states unwiped on the stack during seed decoding.
