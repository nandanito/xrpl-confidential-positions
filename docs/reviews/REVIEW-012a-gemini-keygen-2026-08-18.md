# REVIEW-012a — leg A (Gemini), keygen packet

- **Date:** 2026-08-18
- **Reviewer:** Gemini via `agy`, effort high.
- **Access:** **None.** The packet and every attachment were supplied inline; the leg had no file access and could not execute code.
- **Verbatim.** Reproduced exactly as returned. Adjudicated in `REVIEW-012c`.

---

# REVIEW-012 — Cryptography Review: ElGamal Keypair Derivation Construction (ADR-0001 §(e))

- **Date:** 2026-08-18  
- **Reviewer:** Independent Cryptography Reviewer  
- **Scope:** ADR-0001 §(e) keygen half — deterministic derivation of the holder's ElGamal keypair ($sk_A, pk_A$) from the XRPL root master seed.  
- **Status:** **APPROVED WITH SPECIFIED CONSTRUCTION.**

---

## 1. Executive Ruling and the Central Adjacency Analysis

### 1.1 The Adjacency Question: Why the $r / \rho$ Reasoning Inverts
In REVIEW-010c, derivation of the ElGamal encryption randomness $r$ from the long-lived secret $sk_A$ was rejected on the definitive ground that:
> *"Public disclosure of one $r$ must not create a public oracle keyed by holder secret material."*

On `ConfidentialMPTConvert` and `ConfidentialMPTConvertBack`, the value $r$ is published on-chain in cleartext in the `BlindingFactor` field (`CLAIMS.md` E-67). Deriving a publicly disclosed value from a long-lived secret unnecessarily forces reliance on the pseudorandom function (PRF) assumption under public oracle exposure, while providing **zero** recovery benefit (since historical $r_b$ is not needed to prove subsequent transfers; balance linkage is established using $sk_A$ via $B_2 - b \cdot G = sk_A \cdot B_1$, `CLAIMS.md` E-33).

**For the ElGamal private key $sk_A$, the logic of REVIEW-010c does not merely fail to transfer — it completely inverts:**

1. **No Cleartext Disclosure:** $sk_A$ is never published in cleartext or in any oracle-evaluatable format on-chain. The only public value is $pk_A = sk_A \cdot G$, which is the standard discrete-logarithm hard relation underpinning all elliptic-curve public-key cryptography.
2. **Standard Cryptographic Paradigm:** Deriving an asymmetric private key deterministically from a root master seed via a secure Key Derivation Function (KDF) with strong domain separation is the universal foundation of modern deterministic wallets (e.g., BIP-32, SLIP-0010, RFC 6979). It does not publish PRF evaluations; it derives a private scalar inside an isolated cryptographic boundary.
3. **Decisive Asymmetry of Failure Modes:** For $r$, fresh entropy is free and deterministic derivation buys nothing. For $sk_A$, deterministic derivation buys the **sole operational disaster-recovery mechanism** available to a holder in a protocol where key rotation is impossible (`tecDUPLICATE`, `CLAIMS.md` E-9) and key loss results in permanent, unrecoverable token lockup (spec §A.6, `CLAIMS.md` E-10, P-10).

The analogy with the $r/\rho$ ruling breaks because the threat model, disclosure profile, and operational necessity are diametrically opposed.

---

### 1.2 Adjudication on ADR-0001 §(e): APPROVED
**Ruling: YES.** The proposal to derive the holder's ElGamal keypair deterministically from the XRPL master seed with explicit domain separation is **APPROVED**.

**Cryptographic Rationale:**
- **The Recovery Trade-off:** In XLS-0096, an independently generated, non-derived $sk_A$ requires an independent backup separate from the holder's XRPL master seed. If this secondary backup is lost or corrupted, the holder's confidential balance is permanently destroyed (the only protocol remedy being issuer clawback/burn, `CLAIMS.md` E-12). In contrast, deriving $sk_A$ from the master seed guarantees that a standard XRPL account backup restores both spending authority and confidential balance access.
- **Marginal Confidentiality Loss is Negligible:** If an adversary compromises the holder's master seed, the adversary already commands total spending authority over the account (they can transfer all XRP, drain public MPT balances, or submit transactions). The marginal gain to the attacker is retroactive decryption of confidential transfer history. However, privacy against an attacker who has stolen your root signing seed is not an achievable or standard property, and furthermore, the token issuer already holds a mandatory, permanent decryption mirror of every confidential balance on-ledger (`CLAIMS.md` P-9, E-52, E-58).
- **Upstream Alignment:** Upstream `mpt-crypto` declined to export key generation in WASM (`CLAIMS.md` E-47, E-53) because `mpt-crypto` is a low-level zero-knowledge and encryption arithmetic library, not a key-management or wallet daemon. Upstream's integration notes directing users to `ripple-keypairs` represent appropriate separation of library concerns, not a cryptographic objection to master-seed derivation.

---

## 2. Byte-Exact Construction: Derivation Specification

The key derivation function MUST be implemented byte-for-byte according to the following specification. Sketches, omissions, or unpadded variable-length preimages are strictly prohibited.

```
                    ┌────────────────────────────────────────┐
                    │     Raw XRPL Master Seed (16 bytes)    │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │              HKDF-Extract              │
                    │   Salt: SHA-256("WCONF-SALT-KEYGEN-v1")│
                    └───────────────────┬────────────────────┘
                                        │
                                        │  PRK (64 bytes)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │               HKDF-Expand              │
                    │   Info: "WCONF-ELGAMAL-KEYGEN-v1"      │
                    │         || u32be(20) || AccountID      │
                    │         || u32be(0)                    │
                    │   Length: 64 bytes                     │
                    └───────────────────┬────────────────────┘
                                        │
                                        │  OKM (64 bytes)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Wide Modular Reduction        │
                    │   X = OS2IP(OKM)                       │
                    │   sk_A = (X mod (q - 1)) + 1           │
                    │   assert sk_A != 0                     │
                    └───────────────────┬────────────────────┘
                                        │
                                        │  sk_A (32-byte scalar)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Point Multiplication          │
                    │   pk_A = sk_A · G  (secp256k1)         │
                    │   Serialize SEC1 compressed (33 bytes) │
                    └────────────────────────────────────────┘
```

### 2.1 Cryptographic Primitives
- **Base Hash Function:** SHA-512 (FIPS 180-4).
- **Key Derivation Function:** HKDF-SHA-512 (RFC 5869), consisting of `HKDF-Extract` and `HKDF-Expand`.
- **Target Curve:** secp256k1 (Standards for Efficient Cryptography 2).
- **Group Order $q$:**  
  `q = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141`

---

### 2.2 Preimage Framing and HKDF Parameters

#### Step 1: Salt Definition
The salt is a fixed 32-byte value derived by hashing a dedicated ASCII domain label with SHA-256:
$$\text{SALT} = \text{SHA-256}(\text{"WCONF-SALT-KEYGEN-v1"})$$
- `SALT` is exactly 32 bytes.
- This ensures absolute cryptographic domain isolation from standard RFC 5869 default-zero salts and from all other W-CONF salt structures.

#### Step 2: Input Keying Material (IKM)
The IKM encapsulates the raw 16-byte XRPL master seed with explicit length framing:
$$\text{IKM} = \texttt{u32be}(16) \parallel \text{seed\_bytes}$$
- `seed_bytes`: The 16 raw entropy bytes of the holder's XRPL master seed (decoded from the `s...` family seed).
- Total IKM length: exactly 20 bytes.

#### Step 3: HKDF-Extract
$$\text{PRK} = \text{HMAC-SHA-512}(\text{Key} = \text{SALT}, \text{Data} = \text{IKM})$$
- `PRK` is exactly 64 bytes.

#### Step 4: Context Info Framing (`info`)
The `info` parameter binds the derivation context, the target XRPL `AccountID`, and a sub-key index:
$$\text{info} = \text{LABEL} \parallel \texttt{u32be}(20) \parallel \text{account\_id} \parallel \texttt{u32be}(\text{key\_index})$$
Where:
- $\text{LABEL} = \text{"WCONF-ELGAMAL-KEYGEN-v1"}$ (23 ASCII bytes, no null terminator).
- $\texttt{u32be}(20) = \texttt{0x00000014}$ (4 bytes big-endian length prefix).
- $\text{account\_id}$: Exactly 20 bytes representing the 160-bit `AccountID` (the hash160 of the account's public key) of the target XRPL account.
- $\texttt{u32be}(\text{key\_index}) = \texttt{0x00000000}$ (4 bytes big-endian; default holder key index is `0`).
- Total `info` length: $23 + 4 + 20 + 4 = 51\text{ bytes}$.

#### Step 5: HKDF-Expand
Generate 64 bytes of Output Keying Material ($\text{OKM}$):
$$\text{OKM} = \text{HKDF-Expand}(\text{PRK}, \text{info}, L = 64)$$
Because $L = 64$ matches the output size of SHA-512, this evaluates as a single HMAC iteration:
$$\text{OKM} = \text{HMAC-SHA-512}(\text{PRK}, \text{info} \parallel \texttt{0x01})$$
- `OKM` is exactly 64 bytes.

---

### 2.3 Scalar Reduction and Bias Elimination
Let $\text{OKM}$ be interpreted as a 512-bit unsigned big-endian integer $X$:
$$X = \sum_{i=0}^{63} \text{OKM}[63 - i] \cdot 256^i$$

Compute the private scalar $sk_A$ via wide modular reduction:
$$sk_A = (X \bmod (q - 1)) + 1$$

#### Bias and Security Proof:
1. **Scalar Range:** By definition, $(X \bmod (q - 1)) \in [0, q - 2]$, which guarantees:
   $$sk_A \in [1, q - 1]$$
   $sk_A$ can never equal $0$, and is strictly less than the group order $q$.
2. **Statistical Bias:** The input space is $2^{512}$. The modular reduction over $q - 1 \approx 2^{256}$ induces a statistical distance $\Delta$ from uniform distribution bounded by:
   $$\Delta \le \frac{q - 1}{2^{512}} < \frac{2^{256}}{2^{512}} = 2^{-256}$$
   A bias of $2^{-256}$ is mathematically indistinguishable from zero across all computational security bounds (standard threshold is $2^{-128}$).
3. **Rejection Sampling is Rejected:** Although key generation is an offline, one-time operation, wide 64-byte reduction is chosen over rejection sampling because:
   - It eliminates all secret-dependent branching, loops, and variable timing profiles.
   - It guarantees complete mathematical and architectural consistency with the sigma-nonce ruling (REVIEW-005c) and the $r/\rho$ ruling (REVIEW-010c).
4. **Zero Check & Failure Handling:** If, due to hardware fault or library corruption, the computed $sk_A = 0$, the signer MUST immediately **ABORT** and refuse to output key material.

---

### 2.4 Public Key Derivation and Serialization
1. Compute the public key point $P_A$ via fixed-base scalar multiplication on secp256k1:
   $$P_A = sk_A \cdot G$$
2. Serialize $pk_A$ into SEC1 compressed format (33 bytes):
   - Format: $\texttt{0x02} \parallel X(P_A)$ if $Y(P_A)$ is even; $\texttt{0x03} \parallel X(P_A)$ if $Y(P_A)$ is odd.
3. Return keypair: $(sk_A\text{ [32 bytes]}, pk_A\text{ [33 bytes]})$.

---

## 3. Seed Inputs, Key Types, and Account Topologies

### 3.1 Raw 16-Byte Seed Input
The KDF MUST consume the **raw 16-byte master seed entropy**.
- XRPL master seeds are 128-bit entropy values (commonly encoded in Base58 with prefix `s...`).
- The derivation MUST decode the Base58 string to its raw 16 bytes before passing to `HKDF-Extract`.
- The signer MUST NOT use the derived XRPL account private key as IKM. Deriving directly from the 16-byte root entropy preserves cryptographic independence between the transaction signing key and the ElGamal encryption key.

### 3.2 XRPL Algorithm Independence (`secp256k1` vs `ed25519`)
XRPL supports both `secp256k1` and `ed25519` for ledger account signing keys.
- XLS-0096 ElGamal keys **MUST always be secp256k1 scalars**, regardless of the signing algorithm used by the underlying XRPL account.
- Because this construction derives $sk_A$ directly from the 16-byte raw master seed (and not from the derived signing key), the derivation function is **100% algorithm-agnostic**. An account using Ed25519 for transaction signatures produces a valid secp256k1 ElGamal keypair from its root seed via this identical construction.

### 3.3 Disjointness Across Accounts (`AccountID` Binding)
If a user derives multiple XRPL accounts from the same root mnemonic or master seed, using the bare seed alone would generate colliding ElGamal keys across accounts.
- By binding `account_id` (20 bytes) into the `info` parameter of `HKDF-Expand`, every distinct XRPL account is guaranteed a cryptographically distinct, uncorrelated ElGamal keypair.
- Collisions between different accounts under the same seed are cryptographically impossible ($2^{-256}$ security).

### 3.4 Regular Keys and Multi-Signing Configurations
- **Regular Keys (`SetRegularKey`):** A regular key is an authorized delegate that can sign transactions, but does not own the account and can be rotated or deleted at any time. Because `HolderEncryptionKey` registration is permanent (`tecDUPLICATE`), $sk_A$ **MUST NEVER** be derived from a Regular Key seed. It MUST always be derived from the account's root master seed.
- **Multi-Signing Accounts (`SignerListSet`):** In accounts where the master key has been disabled and multi-signing is enforced, no single master seed exists. In such institutional configurations, deterministic master-seed derivation is unavailable. The local signer MUST allow an explicit, standalone ElGamal seed configuration for multi-sign accounts.

---

## 4. Domain Separation Registry

To prevent any cross-protocol or cross-primitive interference, the following domain labels are established and verified to be mutually disjoint:

| Subsystem | Purpose | Exact Label / Salt String | Reference |
|---|---|---|---|
| **Keygen Salt** | Salt derivation for $sk_A$ | `"WCONF-SALT-KEYGEN-v1"` | REVIEW-012 |
| **Keygen Info** | Context framing for $sk_A$ | `"WCONF-ELGAMAL-KEYGEN-v1"` | REVIEW-012 |
| **Sigma Nonces** | Nonce generation core | `"WCONF-NONCE-v1"` | REVIEW-005c / E-60 |
| **Randomness $r$ (Convert)** | ElGamal $r$ generation | `"WCONF-R-CONVERT-v1"` | REVIEW-010c |
| **Randomness $r$ (Send)** | ElGamal $r$ generation | `"WCONF-R-SEND-v1"` | REVIEW-010c |
| **Randomness $\rho$ (Send)** | Pedersen blinding $\rho$ | `"WCONF-RHO-SEND-v1"` | REVIEW-010c |
| **Registration PoK** | Fiat–Shamir challenge | `"CMPT_POK_SK_REGISTER"` | upstream / E-66 |
| **Standard Sigma** | Fiat–Shamir challenge | `"CMPT_SIGMA_STANDARD"` | upstream |

**Versioning Rule:** The string `v1` is embedded directly in both the salt and info labels. If any future modification alters the framing, curve parameters, or hash algorithms, bumping the version tag to `v2` provides complete cryptographic isolation without key collision.

---

## 5. Storage, Memory Lifecycle, and Signer Process Boundary

The threat model explicitly includes **a hostile same-host process** (issue #1 ruling, ADR-0001 §(a)). The local signer binary MUST enforce strict memory and storage controls:

```
┌────────────────────────────────────────────────────────────────────────┐
│ HOLDER HOST                                                            │
│                                                                        │
│  ┌───────────────────────┐                    ┌─────────────────────┐  │
│  │ Local Client / UI     │                    │ Local Signer Binary │  │
│  │ (Thin Browser/App)    │                    │ (Rust Process)      │  │
│  └───────────┬───────────┘                    └──────────┬──────────┘  │
│              │                                           │             │
│              │ Value-Shaped Intent (IPC)                 │             │
│              │ {issuance, dest, amount}                  │             │
│              ├──────────────────────────────────────────►│             │
│              │                                           │             │
│              │                                 ┌─────────┴──────────┐  │
│              │                                 │ Memory:            │  │
│              │                                 │ - mlock pinned     │  │
│              │                                 │ - ZeroizeOnDrop    │  │
│              │                                 │ - sk_A in memory   │  │
│              │                                 │                    │  │
│              │                                 │ Local UI:          │  │
│              │                                 │ - Prompt user to   │  │
│              │                                 │   confirm intent   │  │
│              │                                 └─────────┬──────────┘  │
│              │                                           │             │
│              │ Signed Transaction Blob (No Secrets)      │             │
│              │◄──────────────────────────────────────────┤             │
│              │                                                         │
│  ┌───────────┴───────────┐                    ┌─────────────────────┐  │
│  │ Hostile Local Process │                    │ Encrypted Keystore  │  │
│  │ (Cannot read memory   │                    │ (Argon2id + AEAD)   │  │
│  │  or bypass UI prompt) │                    └─────────────────────┘  │
│  └───────────────────────┘                                             │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Memory Isolation:**
   - Raw seed buffers, intermediate PRK/OKM buffers, and $sk_A$ scalar bytes MUST be allocated in protected memory using `mlock` (to prevent paging to swap disk) and wrapped in Rust types implementing `Zeroize` and `ZeroizeOnDrop`.
   - Temporary buffers MUST be explicitly wiped immediately after scalar reduction and public key generation.
2. **Storage at Rest:**
   - Plaintext private keys or seeds MUST NEVER be written to non-volatile storage.
   - If the signer caches credentials locally between executions, the data MUST be encrypted at rest using an authenticated cipher (`ChaCha20-Poly1305` or `AES-256-GCM`), with the encryption key derived from a user passphrase via **Argon2id** (memory $\ge 64\text{ MiB}$, iterations $\ge 3$, parallelism $= 4$, with a unique 16-byte CSPRNG salt).
3. **Process Termination:**
   - The signer MUST register signal handlers (`SIGINT`, `SIGTERM`, panic hooks) to zeroize all sensitive memory structures prior to process termination.

---

## 6. Signer Interface Invariants and Refusal Rules

To prevent the signer from acting as an oracle or being subverted by a malicious local process:

1. **No Key Import/Export via IPC:** The signer MUST NOT provide any IPC endpoint that returns $sk_A$, accepts an external $sk_A$, or accepts external entropy.
2. **Onboarding Isolation:** Master seed entry MUST occur exclusively through the Signer’s own native, secure console or OS-level UI. The browser client MUST NEVER receive, handle, or forward the master seed.
3. **Value-Shaped IPC Only:** The IPC interface MUST accept only transaction parameters (`issuanceID`, `destination`, `amount`). The signer derives keys internally, builds the proof, signs the transaction, and returns the signed transaction blob.
4. **Mandatory In-Signer Confirmation UI:** The signer MUST parse the transaction it constructed and render an interactive confirmation dialog in its own independent UI (displaying Destination, Issuance, Amount, and Fee) before applying any signature or generating any proof. This directly mitigates REVIEW-003b's spend-oracle finding.

---

## 7. Standardization vs. Repository-Local Architecture

- **Status:** **Repository-Local Implementation with Open Standard Path.**
- **Analysis:** XLS-0096 is completely silent on key derivation (`CLAIMS.md` E-67), and upstream provides no canonical derivation standard. 
- **Risk:** A holder who uses this derivation in W-CONF will not be able to restore their ElGamal key in a third-party wallet if that wallet uses an ad-hoc random keygen, creating ecosystem fragmentation.
- **Remedy:**
  1. The derivation construction specified in Section 2 MUST be implemented immediately in W-CONF as repository-local.
  2. The specification in Section 2 MUST be published as an informational standard proposal (e.g., an XLS draft: *"Deterministic ElGamal Key Derivation for XLS-0096"*).
  3. The signer onboarding documentation MUST display an explicit notice:  
     *"Your confidential balance access is deterministically derived from your XRPL seed under the W-CONF standard. Restoring your seed in third-party wallets that do not support this derivation standard will restore your public account but not your confidential balance history until those tools adopt this standard."*

---

## 8. Cryptographic Validation and Upstream Test Boundaries

`CLAUDE.md` requires validation against upstream `mpt-crypto` test vectors (`test_pok_sk`, `test_elgamal`, `test_elgamal_verify`). The exact cryptographic boundary of what these tests prove MUST be understood:

| Upstream Test | What It Proves | What It Does NOT Prove |
|---|---|---|
| `test_elgamal` | Validates that $D_{sk}(E_{pk}(m)) = m$ and checks homomorphic addition. | Does not validate how $sk_A$ was generated. An insecure constant $sk_A = 1$ passes completely. |
| `test_pok_sk` | Validates that a given $(sk_A, pk_A)$ pair produces a valid Schnorr PoK under `CMPT_POK_SK_REGISTER`. | Does not validate seed derivation, domain separation, or key freshness. |
| `test_elgamal_verify` | Validates ciphertext consistency. | Does not validate key derivation logic. |

**Conclusion:** Upstream tests validate **cryptosystem mathematical well-formedness**, not **derivation correctness**. The W-CONF test harness MUST implement independent unit tests verifying the exact derivation pipeline, domain separation, and failure modes.

---

## 9. Known-Answer Vectors (KAT) Generation Protocol

### 9.1 Statement on Vector Blocking
In accordance with hard cryptographic review standards, **no numeric hex vectors are fabricated in this document**. The reviewer does not have code-execution capabilities in this session; fabricating uncomputed hex vectors creates false ground truth (as occurred in REVIEW-010 leg A, where every fabricated vector was mathematically corrupt).

### 9.2 Protocol for Downstream KAT Generation
A subsequent session with tool access MUST execute the following test harness (`tools/test-keygen-kat.ts` or Rust equivalent) to compute and commit the ground-truth KAT vectors:

```typescript
// KAT Generation Protocol Specification
import { hkdf } from "@noble/hashes/hkdf";
import { sha256, sha512 } from "@noble/hashes/sha512";
import { secp256k1 } from "@noble/curves/secp256k1";

const q = secp256k1.CURVE.n; // secp256k1 group order

function deriveKey(rawSeedHex: string, accountIdHex: string, keyIndex: number = 0) {
  const seedBytes = Buffer.from(rawSeedHex, "hex");
  const accountIdBytes = Buffer.from(accountIdHex, "hex");
  
  // 1. Salt
  const salt = sha256(Buffer.from("WCONF-SALT-KEYGEN-v1", "utf8"));
  
  // 2. IKM: u32be(seed_len) || seed_bytes
  const ikmLen = Buffer.alloc(4);
  ikmLen.writeUInt32BE(seedBytes.length, 0);
  const ikm = Buffer.concat([ikmLen, seedBytes]);
  
  // 3. Info: LABEL || u32be(account_len) || account_id || u32be(key_index)
  const label = Buffer.from("WCONF-ELGAMAL-KEYGEN-v1", "utf8");
  const accLen = Buffer.alloc(4);
  accLen.writeUInt32BE(accountIdBytes.length, 0);
  const idxBuf = Buffer.alloc(4);
  idxBuf.writeUInt32BE(keyIndex, 0);
  const info = Buffer.concat([label, accLen, accountIdBytes, idxBuf]);
  
  // 4. HKDF-SHA-512
  const okm = hkdf(sha512, ikm, salt, info, 64);
  
  // 5. Wide reduction: (X mod (q - 1)) + 1
  const x = BigInt("0x" + Buffer.from(okm).toString("hex"));
  const skBig = (x % (q - 1n)) + 1n;
  if (skBig === 0n) throw new Error("FATAL: zero scalar derived");
  
  const skHex = skBig.toString(16).padStart(64, "0");
  const pkBytes = secp256k1.getPublicKey(skHex, true); // 33-byte compressed
  const pkHex = Buffer.from(pkBytes).toString("hex");
  
  return { ikmHex: ikm.toString("hex"), okmHex: Buffer.from(okm).toString("hex"), skHex, pkHex };
}
```

The downstream session must generate and assert test fixtures for:
1. Standard XRPL Devnet Account A (`seed_len = 16`, `key_index = 0`).
2. Standard XRPL Devnet Account B (`seed_len = 16`, `key_index = 0`).
3. Multi-account differentiation (`same seed`, different `AccountID`).
4. Key index differentiation (`same seed`, same `AccountID`, `key_index = 1`).

---

## 10. Explicit Residual-Risk Taxonomy

The following risks are explicitly outside the scope of this cryptographic construction:

1. **Root Master Seed Compromise:** An attacker with read access to the raw master seed can derive $sk_A$ and decrypt all past confidential balances on-ledger.
2. **Compromised Host Environment with Arbitrary Code Execution:** If an attacker executes code inside the local signer process space, memory isolation (`mlock`, `zeroize`) cannot prevent live extraction of $sk_A$ from active CPU registers.
3. **Issuer and Auditor Decryption:** Deterministic derivation protects spending authority against third parties; it does not and cannot prevent decryption by the token issuer or designated auditor, who possess protocol-mandated decryption mirrors (`CLAIMS.md` P-9).
4. **Third-Party Restores Without W-CONF Derivation Support:** Restoring a master seed into a third-party XRPL wallet that lacks this derivation standard will recover public XRP/MPT balances but will not reconstruct $sk_A$.

---

## 11. Review of Packet Bias, Stale Claims, and Cryptographic Critique

### 11.1 Packet Framing and Steering Assessment
- **Packet Section 2 (The Adjacency Trap):** The packet warned heavily against applying the $r/\rho$ ruling by false analogy. This warning was constructive and cryptographically accurate: as demonstrated in Section 1.1, the mathematical disclosure profiles of $r$ and $sk_A$ are opposite.
- **Section 5.2 ("Collapsing Two Authentications to One Secret"):** The packet raised a concern that deriving $sk_A$ from the master seed collapses the transaction signature authentication and the registration PoK authentication to a single root secret.  
  *Critique:* This concern is mathematically superficial. In the single-holder self-custody threat model, the master seed is *already* the absolute root of trust. Splitting the secret into two uncorrelated roots of trust does not improve defense-in-depth against a root-compromised adversary (who can already steal all account assets), but it doubles the probability of catastrophic operational fund loss.

### 11.2 Audit of Factual and Stale Claims
- **Upstream Key Generation Export:** The packet notes that `@xrplf/mpt-crypto` does not export key generation (`CLAIMS.md` E-47, E-53). Verified: the WASM wrapper exports provers, verifiers, and arithmetic, but omits key generation. This reinforces the necessity of the standalone derivation specified in Section 2.
- **`context_id` Verification Guard (CLAIMS.md F-19):** The packet correctly notes that low-level `secp256k1_mpt_pok_sk_verify` accepts a `NULL` context hash, but rippled’s utility wrapper rejects `NULL`. The local Rust signer binary MUST explicitly supply the non-null `context_id` to prevent emitting unbound registration proofs.

---

## 12. Final Deliverable Summary & ADR-0001 Disposition

1. **Proposal §(e) Keygen Half:** **APPROVED.**
2. **Construction:** HKDF-SHA-512 over length-framed 16-byte raw master seed, domain-separated with `"WCONF-SALT-KEYGEN-v1"` and `"WCONF-ELGAMAL-KEYGEN-v1"` bound to `AccountID`, reduced to secp256k1 via wide 64-byte modular reduction $(X \bmod (q - 1)) + 1$.
3. **ADR-0001 Status:** Precondition 2 of ADR-0001 is now **FULLY SATISFIED**. ADR-0001 §(e) is cleared for transition to **`Accepted`** upon committing this specification.
