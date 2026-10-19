# REVIEW-024a — Gemini leg on `CLAIMS.md` B-16, the ed25519 signing nonce

**Date:** 2026-08-27. `agy --effort high`, run from an empty non-repository directory with
the complete packet inline and instructed to use no tools. Verbatim below.

---

### Ruling

**`CLAIMS.md` B-16 is RULED: Option B is adopted.** The issue #1 threat-model ruling extends to the ed25519 signing nonce because the threat model attaches to the holder's master key material and its derived confidentiality, not to the curve algorithm. Ed25519 signing shall use **hedged RFC 8032** on the default path by mixing fresh CSPRNG entropy with the key's deterministic SHA-512 secret prefix under domain separation using `ed25519-dalek`'s `hazmat::raw_sign` interface, leaving the secret scalar and signature verification equations untouched. Byte-for-byte cross-implementation vector pinning against `ripple-keypairs` is preserved on a **deterministic arm that is the same signing routine with the auxiliary entropy omitted**. On entropy failure, the nonce derivation **degrades to pure deterministic RFC 8032** rather than refusing to sign.

---

### 1. Threat-Model Extension to the Ed25519 Nonce

The split identified in B-14 is sound: **the extension of the threat model is an unavoidable technical conclusion, whereas the disposition (hedging vs. accepting the gap) is an engineering judgement.**

* **The Technical Conclusion:** Threat models apply to *keys* and the attacker boundary, not to specific signature equations. Under REVIEW-012c, the XRPL master seed is the direct preimage for the holder's ElGamal decryption key. If a signing nonce fails, repeats, or leaks under fault injection or side-channel observation, the account signing key is recovered; under this project's keygen architecture, that recovery retroactively and permanently compromises the holder's confidential transaction history. Because the threat model ruled in 2026-08-18 explicitly puts a hostile same-host process in scope, defending against fault injection and nonce perturbation during signature generation is required for all long-lived secret keys.
* **Algorithm-Specific Considerations:** Nothing about Ed25519 defeats or weakens this threat model. Ed25519 is a Schnorr-variant signature where $S = r + k \cdot s \pmod \ell$. If $r$ repeats across two distinct messages $M_1 \neq M_2$, an observer computes:
  $$S_1 - S_2 = (k_1 - k_2) s \pmod \ell \implies s = (S_1 - S_2)(k_1 - k_2)^{-1} \pmod \ell$$
  The secret scalar $s$ is exposed by trivial linear arithmetic without even needing the modular inversions of ECDSA. The vulnerability to fault attacks or repeated state under pure determinism is identical between secp256k1 and ed25519.

---

### 2. Analysis of the B-14 Ground for Leaving Ed25519 Open

B-14’s stated justification—that randomising Ed25519 requires "hand-rolling a signature scheme"—was **factually incorrect** and arose from reading library capabilities from recollection rather than checking crate source.

As read directly from the `ed25519-dalek 2.2.0` source in §6:
1. **What `hazmat` exposes:** Enabling the `hazmat` feature exposes `pub struct ExpandedSecretKey { pub scalar: Scalar, pub hash_prefix: [u8; 32] }` and `pub fn raw_sign<CtxDigest>(esk: &ExpandedSecretKey, message: &[u8], verifying_key: &VerifyingKey) -> Signature`.
2. **What remains inside the crate:** Inside `src/signing.rs` (`raw_sign_byupdate`), the crate executes the complete cryptographic signing implementation:
   * Base-point scalar multiplication and point compression: $R = r \cdot B$ (`EdwardsPoint::mul_base(&r).compress()`).
   * Challenge digest hashing: $k = \text{Scalar::from\_hash}(\text{Sha512}(R \parallel A \parallel M))$.
   * Scalar arithmetic and group reduction: $S = (k \cdot \text{scalar}) + r \pmod \ell$.
   * Signature packing into standard wire bytes.
3. **What the caller controls:** The caller provides *only* the `ExpandedSecretKey` fields. The caller does *not* write curve arithmetic, point compression, group order reductions, or the challenge equation.
4. **Signature Equation:** The signature equation $S = (k \cdot \text{scalar}) + r$ is unchanged. The only modified parameter is how $r$ is derived before base multiplication.

---

### 3. Specification of the Hedged Ed25519 Construction

The construction is defined below with sufficient precision to be implemented directly:

```
+-------------------------------------------------------------------------------+
|                           Hedged Ed25519 Nonce Derivation                     |
+-------------------------------------------------------------------------------+
|                                                                               |
|  sk (32 bytes) = SHA512Half(entropy_16)                                       |
|  H(sk) (64 bytes) = SHA512(sk)                                                |
|    |                                                                          |
|    +---> H(sk)[0..32]  --[clamp]--> scalar (Scalar, mod order) [RFC 8032]     |
|    |                                                                          |
|    +---> H(sk)[32..64] -----------> prefix_det (32 bytes)                     |
|                                                                               |
|  Hedge Selection:                                                             |
|    * Fresh:                                                                   |
|        aux = CSPRNG (32 bytes)                                                |
|        hash_prefix = SHA512Half("wconf-ed25519-hedged-v1\0" || prefix_det || aux)
|    * DeterministicForVectors / Entropy Failure:                               |
|        hash_prefix = prefix_det                                               |
|                                                                               |
|  raw_sign::<Sha512>(ExpandedSecretKey { scalar, hash_prefix }, M, vk):        |
|    r = Scalar::from_hash(SHA512(hash_prefix || M))                            |
|    R = r * B                                                                  |
|    k = Scalar::from_hash(SHA512(R || vk || M))                                |
|    S = (k * scalar) + r mod l                                                 |
|    emit (R || S)                                                              |
|                                                                               |
+-------------------------------------------------------------------------------+
```

#### Step-by-Step Specification

1. **Key Setup & Clamping (Exact RFC 8032):**
   * Let $sk$ be the 32-byte secret key (`sha512half(entropy)`).
   * Compute the 64-byte digest $H_{\text{sk}} = \text{Sha512}(sk)$.
   * Derive the secret scalar `scalar`:
     $$\text{scalar} = \text{Scalar::from\_bytes\_mod\_order}(\text{clamp\_integer}(H_{\text{sk}}[0..32]))$$
   * Extract the 32-byte deterministic prefix: $\text{prefix}_{\text{det}} = H_{\text{sk}}[32..64]$.
   * Public verifying key: $A = \text{scalar} \cdot B$ (32 bytes).

2. **Nonce Auxiliary Derivation:**
   * Constant Domain Separation Tag: `TAG = b"wconf-ed25519-hedged-v1\0"` (23 bytes).
   * **Under `Hedge::Fresh`:**
     * Draw 32 bytes of fresh entropy `aux` from `crate::store::getrandom`.
     * On successful entropy draw:
       $$\text{hash\_prefix} = \text{sha512half}(\text{TAG} \parallel \text{prefix}_{\text{det}} \parallel \text{aux})$$
     * On entropy failure: degrade to $\text{hash\_prefix} = \text{prefix}_{\text{det}}$.
   * **Under `Hedge::DeterministicForVectors`:**
     * $\text{hash\_prefix} = \text{prefix}_{\text{det}}$.

3. **Signature Computation:**
   * Construct `esk = ed25519_dalek::hazmat::ExpandedSecretKey { scalar, hash_prefix }`.
   * Call `ed25519_dalek::hazmat::raw_sign::<Sha512>(&esk, message, &verifying_key)`.

#### Invariant vs. Variant Parameters
* **Must remain exactly RFC 8032:** `scalar`, `verifying_key`, challenge generation $k = \text{Sha512}(R \parallel A \parallel M) \pmod \ell$, base multiplication $R = r \cdot B$, and signature scalar $S = (k \cdot \text{scalar} + r) \pmod \ell$.
* **May vary:** The `hash_prefix` field of `ExpandedSecretKey`. When varied with fresh entropy, $r = \text{Sha512}(\text{hash\_prefix} \parallel M) \pmod \ell$ is randomized per signing invocation.

---

### 4. Evaluation of Crate Warnings and the `ed25519-unsafe-libs` Attack

* **Scope of Warning vs. Cited Attack:** The warning in `hazmat.rs` is broader than the cited attack. The comment cites the MystenLabs `ed25519-unsafe-libs` report, which analyzes vulnerabilities when `scalar` does not match `verifying_key` ($A \neq \text{scalar} \cdot B$) or when `scalar` is un-clamped. If an attacker can submit or observe signatures where `scalar` deviates while $A$ remains fixed, $k = \text{Sha512}(R \parallel A \parallel M)$ is computed against $A$, but $S$ is computed against the perturbed scalar, allowing extraction of the true private key across operations.
* **Position of this Construction:** Our construction is **completely outside** the cited attack. `scalar` is strictly clamped and derived from $sk$ using standard RFC 8032 rules, and matches `verifying_key` identically.
* **Residual Failure Modes for `hash_prefix`:**
  1. *Lattice / Nonce Bias:* If $\text{hash\_prefix}$ generation produces non-uniform $r$, bias attacks could emerge. Because $r = \text{Sha512}(\text{hash\_prefix} \parallel M) \pmod \ell$, the reduction of a 512-bit hash modulo a 252-bit prime $\ell$ introduces bias $< 2^{-260}$, which is cryptographically negligible.
  2. *Cross-Key Nonce Collisions:* If $\text{hash\_prefix}$ omitted $\text{prefix}_{\text{det}}$, two different keys signing the same message under identical `aux` would produce identical $R$. Including $\text{prefix}_{\text{det}}$ and `TAG` ensures key and domain binding.

---

### 5. Entropy Failure Rule

The **Degrade** rule applies to the ed25519 nonce.

| Site | Entropy Role | On Failure | Reason |
|---|---|---|---|
| Sigma nonces | Hedge over deterministic core | **Degrade** | Core is secure alone; avoids liveness failure |
| $r$ / $\rho$ blinding factors | Primary randomness source (on-chain) | **Refuse** | Zero/constant entropy destroys commitment privacy |
| ElGamal keygen | Fixed seed | **No failure path** | Strictly deterministic derivation |
| $k$ (secp256k1) | Hedge over RFC 6979 | **Degrade** | Baseline RFC 6979 is safe |
| **Ed25519 nonce (B-16)** | **Hedge over RFC 8032** | **Degrade** | **Baseline RFC 8032 is safe** |

#### Resilience Against Catastrophic Nonce Reuse
In Ed25519, catastrophic private key extraction occurs if $r_1 = r_2$ across different messages $M_1 \neq M_2$. This construction **cannot reach catastrophic nonce reuse**, even under complete CSPRNG failure:
1. **RNG returns an error:** `Hedge::Fresh` catches the error and assigns $\text{hash\_prefix} = \text{prefix}_{\text{det}}$. The signer executes standard RFC 8032. For $M_1 \neq M_2$, $\text{Sha512}(\text{prefix}_{\text{det}} \parallel M_1) \neq \text{Sha512}(\text{prefix}_{\text{det}} \parallel M_2)$ by SHA-512 collision resistance.
2. **RNG is broken/stuck (returns all zeros or a repeating constant):** $\text{hash\_prefix}$ evaluates to a static 32-byte constant $C = \text{sha512half}(\text{TAG} \parallel \text{prefix}_{\text{det}} \parallel \text{constant})$. Nonces are computed as $r = \text{Sha512}(C \parallel M) \pmod \ell$. Because the message $M$ is hashed into $r$, $r(M_1) \neq r(M_2)$ for all $M_1 \neq M_2$.
3. **Identical message signed twice under a stuck RNG:** Produces $r_1 = r_2$ and $S_1 = S_2$. The output is simply identical signatures over identical messages (pure determinism), which reveals zero information about $s$.

---

### 6. Vector Pinning and Implementation Costs

* **Byte-for-Byte Pinning on Default Path:** As with secp256k1 under B-14, the default signing path emits different wire-valid signatures on each call and cannot be pinned byte-for-byte against deterministic test vectors (`ripple-keypairs@2.0.0`).
* **Deterministic Arm:** Retained via `AccountKey::sign_message_with(Hedge::DeterministicForVectors, message)`.
* **Single Implementation Rule:** There is **one signing implementation with one input varied**. Both arms call the exact same `raw_sign::<Sha512>(&esk, message, &vk)` function. The only difference is the 32-byte slice assigned to `esk.hash_prefix` (hedged hash vs. `prefix_det`).
* **RFC 8032 Byte-Identity:** The deterministic arm is **byte-identical to pure RFC 8032**. When `hash_prefix = prefix_det`, `raw_sign` performs the exact RFC 8032 calculation. It matches `ripple-keypairs` output byte-for-byte in `tests/xrpl_vectors.rs`.

---

### 7. Wire Validity Analysis

* **Reasoning vs. Execution:** Following B-14 precedent, wire acceptance by network validators **must be confirmed by execution on a live network** (Devnet) before the claim may be recorded in `CLAIMS.md`.
* **Cryptographic Reasoning:** *(Reasoning flag)*
  1. *Verification Equation:* A validator checks $S \cdot B = R + k \cdot A$. Because $R = r \cdot B$ and $S = (k \cdot \text{scalar} + r) \pmod \ell$, this equality holds for *every* scalar $r \in \mathbb{Z}_\ell$.
  2. *Canonicality of $S$:* `curve25519-dalek` guarantees $S$ is strictly reduced modulo $\ell$ ($0 \le S < \ell$).
  3. *Canonicality of $R$:* $R$ is compressed using `EdwardsPoint::compress()`, which outputs a canonical 32-byte point in the prime-order subgroup $\mathcal{E}[\ell]$.
  4. *Cofactor / Batch Verification:* Because $r \in \mathbb{Z}_\ell$, $R$ has no small-subgroup component ($8R = 8(r \cdot B)$). Verification succeeds whether the validator executes single-signature verification ($S \cdot B = R + k \cdot A$) or batched verification ($8S \cdot B = 8R + 8k \cdot A$).
  5. *Low-S Distinction:* Unlike secp256k1 ECDSA (where $(r, -s \pmod n)$ is also valid and requires low-$S$ enforcement), Ed25519 has no $\pm S$ symmetry.

---

### 8. Case Against Recommendation (Option B vs. Option A)

The strongest counter-arguments against adopting Option B:
1. **Removal of Compile-Time Guardrails:** Enabling `features = ["hazmat"]` on `ed25519-dalek` in `Cargo.toml` exposes low-level cryptographic functions across the entire crate. It removes the compiler enforcement that previously prevented any developer from bypassing the safe `Signer` API.
2. **Attacker Boundary Limits (Issue #1 Losing Argument):** An adversary with same-host execution capability capable of injecting hardware faults or executing precision side-channel attacks on signing routines could potentially read the private key directly from memory. If memory extraction is achieved, hedging provides no defense.
3. **Ecosystem Divergence:** Pure RFC 8032 is the industry standard across XRPL and libsodium. Deviating from the standard deterministic path introduces custom nonce management code that must be maintained and verified.

---

### 9. Verification Requirements Before Claiming B-16 Closed

Before `CLAIMS.md` B-16 may be marked closed:

1. **Devnet Execution:** Run a live integration script funding an `sEd...` account from the Devnet faucet, submit a `ConfidentialMPTConvert` or `ConfidentialMPTSend` transaction signed on the default hedged path, verify that `SigningPubKey` begins with prefix `0xED`, and confirm `tesSUCCESS` in a validated ledger.
2. **Suite Pinning:** The following tests must be implemented and pass:
   * `ed25519_default_path_does_not_repeat`: 16 signatures over identical messages produce 16 distinct values.
   * `ed25519_hedged_signature_verifies`: Hedged signatures verify against `ed25519_dalek::VerifyingKey`.
   * `ed25519_deterministic_arm_matches_ripple_keypairs`: Byte-for-byte pinning against `ripple-keypairs` holds on `Hedge::DeterministicForVectors`.
   * `ed25519_entropy_failure_degrades`: Injected `getrandom` failure produces output identical to `Hedge::DeterministicForVectors`.
   * `ed25519_one_implementation_not_two`: Both arms verify under the same verifying key and message.

---

### 10. Confidence and Judgement Call

* **Confidence:** 9.0 / 10.
* **The Judgement Call:** The decision turns on **trading compile-time library guardrails (`hazmat` feature exposure) for defense-in-depth on the primary live signing path**. A reviewer could reasonably choose Option A to keep `hazmat` disabled and rely solely on RFC 8032 determinism. However, because `sEd...` accounts represent 100% of the live Devnet deployment and hold retroactive ElGamal confidentiality keys, leaving the live path unhedged while hedging the unused secp256k1 path is an untenable architectural contradiction.

---

### Unrelated Defect Found in §5 Code

**Defect in `signer/src/xrpl.rs` (line 489): Version Mismatch Error Formatting in `decode_ed25519_seed`**

In `decode_ed25519_seed`:
```rust
const VER_ED25519_SEED: [u8; 3] = [0x01, 0xE1, 0x4B];
...
if body[..3] != VER_ED25519_SEED {
    return Err(XrplError::Version { want: VER_ED25519_SEED[0], got: body[0] });
}
```
If a seed has a valid first byte `body[0] == 0x01` but corrupt or mismatched second/third bytes (e.g. `[0x01, 0x00, 0x00]`), the check correctly fails, but the error struct constructs `XrplError::Version { want: 0x01, got: 0x01 }`. The formatted error message will state `"wrong base58 version byte: expected 0x01, got 0x01"`, hiding the true cause of the error. `XrplError` should support multi-byte prefix reporting or report the mismatched byte index.
