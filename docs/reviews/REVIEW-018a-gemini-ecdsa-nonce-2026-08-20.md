# RULING — `CLAIMS.md` B-14: XRPL Transaction Signing Nonce $k$ (Site 5)

---

### Ruling Summary

| Item | Ruling |
|---|---|
| **Does Issue #1 extend to Site 5?** | **YES.** Pure deterministic $k$ at Site 5 contradicts the Issue #1 threat model. |
| **secp256k1 Construction** | Adopt **hedged RFC 6979 §3.6 / BIP-340 auxiliary randomness** in the live signing path. |
| **Vector Pinning against `ripple-keypairs`** | **Preserved via a two-tier test structure** (deterministic arm for oracle matching; randomized self-verification for live arm). |
| **Ed25519 Live Path** | **Identical cryptographic threat**, valid on XRPL ledger, but subject to crate ergonomics. |
| **Confidence** | **9.5 / 10** on cryptographic validity; judgment call named below. |

---

### Decision 1: Does the Issue #1 Ruling Extend to Site 5?

**YES.**

Threat models apply to *identities and keys*, not isolated subroutines. Under the ruled keygen construction (Site 3), the XRPL account key and the ElGamal encryption/decryption key share an origin. Compromise of $sk_{\text{XRPL}}$ is a total compromise of both spending authority and ledger confidentiality.

From a cryptographic perspective, **ECDSA (secp256k1) at Site 5 is far more fragile to deterministic nonce exploitation than the Sigma protocols at Site 1**:
- In ECDSA, extracting even a few bits of nonce bias across signatures via microarchitectural side channels (cache timing, power analysis) or inducing a single fault during deterministic $k$ generation leads directly to full private key recovery via Hidden Number Problem (HNP) lattice reduction.
- Pure RFC 6979 determinism is precisely what leaves a signer vulnerable to repeatable same-host fault attacks.
- If a same-host adversary is inside the boundary for Site 1, leaving Site 5 unhedged creates a severe structural inconsistency: the front door (ZKP witness) is fortified against fault/side-channel analysis while the back door (the account/master key) is left exposed.

---

### Decision 2: Impact on Byte-for-Byte Vector Pinning

Adopting hedged $k$ does **not** force you to discard cross-implementation testing or test the wrong binary.

#### The Sound Construction
In RFC 6979 §3.6 (and BIP-340), hedging is implemented by mixing 32 bytes of auxiliary fresh CSPRNG entropy into the HMAC-DRBG initialization:
$$\text{HMAC\_DRBG\_Init}(sk, \text{digest}, \text{aux\_rand})$$
When $\text{aux\_rand} = 0^{32}$ (or is omitted), the algorithm is strictly pure RFC 6979. When $\text{aux\_rand} \leftarrow \text{CSPRNG}$, the algorithm is hedged.

Because XRPL validators verify ECDSA signatures by standard curve algebra $(r, s)$ against the public key without checking how $k$ was derived, **a hedged signature is 100% valid on the XRPL ledger wire format.**

#### Two-Tier Test Suite (Prevents Vacuous Testing)
1. **Tier 1: Cross-Implementation Vector Pinning (Deterministic Arm)**
   - Expose an internal/test constructor or test configuration flag (mirroring `-DWCONF_HEDGE=0` at Site 1) that passes $\text{aux\_rand} = 0$.
   - Run `tests/xrpl_vectors.rs` against `ripple-keypairs@2.0.0`. This pins wire-format serialization, low-$S$ canonicalization, and `SHA512Half` hashing byte-for-byte against an independent implementation.
2. **Tier 2: Production Path Verification (Hedged Arm)**
   - Test the live `sign_message` (which samples `OsRng` for `aux_rand`) by parsing the resulting DER/low-$S$ signature and verifying it against `k256::ecdsa::VerifyingKey::verify_prehash`.
   - This asserts that the hedged execution path produces cryptographically valid signatures under XRPL's canonical rules.

**Soundness Verdict:** This does *not* test the wrong binary. The arithmetic, pre-hashing, canonicalization, and DER encoding routines are identical between both arms; only the auxiliary entropy slice passed into `k256` differs.

---

### Decision 3: The One-Sentence Distinction (If Rejected)

If the project chooses **not** to hedge Site 5 to avoid test-suite branching, the formal justification for the register is:

> *"Site 1 protects private zero-knowledge witnesses whose wire validity is purely algebraic, whereas Site 5 produces public ledger transactions whose wire formatting must remain strictly verifiable against external reference oracles (`ripple-keypairs`)."*

*(Note: While recordable, this distinction is cryptographically brittle under the Issue #1 threat model.)*

---

### Decision 4: Ed25519 (The Live Devnet Path)

**It is the same threat in a different crate envelope.**

1. **Wire Validity:** Standard Ed25519 on XRPL verifies $(R, S)$ such that $S B = R + H(R, A, M) A$. It does not inspect the derivation of $R = r B$. A hedged Ed25519 signature is fully wire-valid on XRPL.
2. **The Crate Problem:** Unlike `k256` (which natively supports hedged auxiliary entropy in RFC 6979), `ed25519-dalek`’s default `Signer::sign` enforces RFC 8032 pure determinism:
   $$r = \text{SHA512}(\text{prefix} \parallel M) \pmod \ell$$
3. **Ruling for Ed25519:**
   - If utilizing `ed25519-dalek` v2, use the randomized signing interface (`sign_with_rng`) or mix auxiliary entropy into the expanded secret key nonce hash.
   - If modifying the Ed25519 call path introduces unacceptable unsafe/hazmat code dependencies in a Devnet research artifact, document an **explicit gap**:
     > *`GAP-ED25519-HEDGE`: Ed25519 uses RFC 8032 pure determinism due to upstream crate constraints, representing an accepted residual risk under Issue #1.*

---

### Costs and Destroyed Test Coverage

| Cost / Impact | Severity | Mitigation |
|---|---|---|
| **Direct Vector Pinning on Live Function** | **High** | `sign_message(&msg)` cannot be directly compared byte-for-byte to `ripple-keypairs` in release mode. Mitigated by Tier 1 deterministic test hooks. |
| **CSPRNG Dependency** | **Low** | Requires available system entropy at signing time. Under RFC 6979 §3.6, if the CSPRNG fails gracefully or produces zeros, security degrades to pure RFC 6979 (never worse than current behavior). |
| **Ed25519 Implementation Overhead** | **Medium** | Customizing Ed25519 nonces requires venturing into `ed25519-dalek::hazmat` or accepting an explicit tracked gap. |

---

### Confidence & Named Judgment

* **Confidence:** **9.5 / 10**
* **The Judgment Call:** The tradeoff is **defense-in-depth against same-host fault/side-channel attacks** vs. **absolute simplicity in external test-vector conformance**. Given that Issue #1 explicitly pulled same-host attackers into scope, hedging Site 5 is the only internally consistent architectural choice.
