# Gemini Adversarial Review — spike/wconf-nonce-patch vs main

🔭 Read-only second opinion via the Antigravity CLI (`agy` 1.1.13) — automated, advisory.

- target: `main...HEAD` (branch `spike/wconf-nonce-patch`) · pathspec: none
- model: agy default (envelope carries no model field) · effort: agy default
- mode: adversarial · focus: yes (8 numbered priorities)
- reviewed: 14 files, 3179 insertions · duration: 63s
- tokens: 156659 in / 23631 thinking / 26357 out

**Verbatim below. Not adjudicated.**

---

# Adversarial Code Review: Nonce Derivation Patch (`XRPLF/mpt-crypto` @ `85dbac7`)

---

## Priority Focus Assessment

### (1) `secp256k1_mpt_scalar_reduce64` Wide Reduction & Scalar Overflow
* **Status**: **VERIFIED CORRECT**
* **Analysis**: 
  * The wide reduction computes $\text{out} = (\text{hi} \cdot 2^{256} + \text{lo}) \pmod n$ using scalar-field arithmetic:
    $$\text{out} \equiv (\text{hi} \bmod n) \cdot (2^{128} \bmod n) \cdot (2^{128} \bmod n) + (\text{lo} \bmod n) \pmod n$$
  * **Byte Index Verification**: In a 32-byte big-endian scalar array `shift_be[32]`, index $0$ is the MSB ($2^{248}$) and index $31$ is the LSB ($2^0$). Index $15$ corresponds to $256^{31 - 15} = 256^{16} = 2^{128}$. Thus `shift_be[15] = 1` exactingly encodes $2^{128}$.
  * **Overflow Handling**: `secp256k1_scalar_set_b32(r, b32, NULL)` implicitly performs full modular reduction $\bmod\ n$ (subtracting $n$ if $b32 \ge n$). Discarding the overflow indicator is algebraically sound because reduction modulo $n$ is a homomorphism over $(\mathbb{Z} \to \mathbb{Z}/n\mathbb{Z})$.

### (2) HKDF-SHA-512 Preimage Framing & Expand Loop
* **Status**: **VERIFIED CORRECT & UNAMBIGUOUS**
* **Analysis**:
  * **Preimage Framing**: Every variable-length field (`domain`, `witness`, `stmt_bytes`, `context_id`) is preceded by a 4-byte big-endian length tag `u32be(...)`. When `context_id` is `NULL`, `ctx_len = 0` emits `00 00 00 00` with 0 trailing payload bytes; when present, it emits `00 00 00 20` followed by 32 bytes. This forms a prefix-free encoding; no two distinct input tuples can yield identical IKM byte streams.
  * **Expand Loop**: Counter $i \in [1, k]$ with $k \le 8$ is encoded in 1 byte without overflow risk. Chunk 0 (`prev`) is skipped on iteration 0 via `chunk_lens[0] == 0`. Chaining $T(i) = \text{HMAC-SHA512}(\text{PRK}, T(i-1) \parallel \text{domain} \parallel i)$ conforms to HKDF-Expand (RFC 5869) with per-round domain separation.

### (3) Statement Serialization Refactor & Fiat–Shamir Challenge Bytes
* **Status**: **VERIFIED COMPATIBLE**
* **Analysis**:
  * The serialization order in `std_serialize_statement`, `claw_serialize_statement`, `cb_serialize_statement`, and `proof_pok_sk.c` precisely replicates upstream point-by-point ordering (e.g., standard statement: $Pk_1 \dots Pk_n \parallel pk_A \parallel C_1 \parallel C_{2,1} \dots C_{2,n} \parallel PC_m \parallel PC_b \parallel B_1 \parallel B_2$).
  * The zero-amount clawback sentinel ($33$ zero bytes for $m \cdot G$ when $m = 0$) is preserved in `put_amount_point`.
  * Because SHA-256 is an iterative Merkle–Damgård hash, passing a pre-built contiguous buffer to `EVP_DigestUpdate` produces a transcript digest byte-identical to upstream's sequential point updates.

### (4) Hedged Branch & Secret Witness Masking
* **Status**: **VERIFIED CORRECT (with minor edge-case findings below)**
* **Analysis**:
  * Witness layout and secret key offsets are accurately mapped: offset $0$ for standard, clawback, and `pok_sk`; offset $64$ for convertback whose canonical witness tuple is $(b, \rho, sk_A)$.
  * Tagged hashing $\text{HMAC-SHA512}(\text{SALT}, \text{"WCONF-NONCE-v1/aux"} \parallel \text{aux})$ prevents bit-manipulation attacks from low-entropy `aux` inputs.
  * Masking is performed on a stack-allocated buffer `masked`, leaving the caller's witness untouched.

### (5) Secret Buffer Zeroization on Exit Paths
* **Status**: **DEFECTS IDENTIFIED (See Findings)**
* **Analysis**: While primary secret buffers (`witness_buf`, `nonces`, `prk`, `masked`, `s_hi`, `s_lo`) are cleansed across all paths, early exits during statement serialization in `proof_compact_clawback.c`, `proof_compact_convertback.c`, and `proof_pok_sk.c` bypass zeroization of `aux_buf`.

### (6) TypeScript Cross-Verification (`t1-vectors.ts`)
* **Status**: **VERIFIED INDEPENDENT & SOUND**
* **Analysis**: `t1-vectors.ts` implements the wide modular reduction via JS native `BigInt(hex) % N`. This directly tests the mathematical specification rather than replicating C pointer operations, providing genuine cross-validation.

### (7) Entropy Counting via `RAND_bytes` Override (`t9-entropy.c`)
* **Status**: **ACCEPTABLE WITH KNOWN SANDBOX LIMITATIONS**
* **Analysis**: Intercepting `RAND_bytes` accurately counts calls from statically linked translation units in `libmpt-crypto.a`. However, due to dynamic linker symbol resolution on macOS (`dyld` two-level namespaces), any internal entropy draws inside `libcrypto.dylib` or direct syscalls (`getentropy`/`getrandom`) would bypass the override.

### (8) Claims & Evidence Audit
* **Status**: **NO UNBACKED CLAIMS DETECTED**
* **Analysis**: Claims E-60 through E-62 and F-18 maintain precise boundaries between empirical execution and static analysis (e.g., explicitly separating the 192-byte Sigma nonces from the 754-byte Bulletproof randomness, and grading unlinked Rust crates as Grade B).

---

## Detailed Findings

### CRITICAL Severity
*(No issues found)*

---

### HIGH Severity
*(No issues found)*

---

### MEDIUM Severity
*(No issues found)*

---

### LOW Severity

#### [LOW-01] Missing Zeroization of `aux_buf` on Statement Serialization Failure
* **File**: `tools/spike-2026-08-18/wconf-nonces.patch` (`src/proof_compact_clawback.c:174-177`, `src/proof_compact_convertback.c:163-166`, `src/proof_pok_sk.c:113-114`)
* **Failing Scenario**:
  When compiled with `-DWCONF_HEDGE=1`, `wconf_hedge_aux(aux_buf)` populates `aux_buf[32]` with fresh CSPRNG entropy. If statement serialization immediately fails (e.g., malformed public key or point conversion failure):
  ```c
  // src/proof_compact_clawback.c
  if (!claw_serialize_statement(ctx, stmt_bytes, P_iss, C1, C2, amount))
  {
      OPENSSL_cleanse(witness_buf, sizeof(witness_buf));
      goto cleanup; // aux_buf remains uncleansed on the stack
  }
  ```
  `aux_buf` is left dirty on the stack frame upon function return.
* **Fix**:
  Ensure `aux_buf` is cleansed on all early return paths, or move `OPENSSL_cleanse(aux_buf, sizeof(aux_buf))` to the shared `cleanup:` block:
  ```diff
  --- a/src/proof_compact_clawback.c
  +++ b/src/proof_compact_clawback.c
  @@ -173,6 +173,7 @@ int secp256k1_compact_clawback_prove(...)
       if (!claw_serialize_statement(ctx, stmt_bytes, P_iss, C1, C2, amount))
       {
         OPENSSL_cleanse(witness_buf, sizeof(witness_buf));
  +      OPENSSL_cleanse(aux_buf, sizeof(aux_buf));
         goto cleanup;
       }
  ```

---

#### [LOW-02] Potential Integer Wrap in `sk_offset` Bounds Guard
* **File**: `tools/spike-2026-08-18/wconf-nonces.patch` (`src/mpt_internal.h:331`)
* **Failing Scenario**:
  In `wconf_generate_nonces`:
  ```c
  if (sk_offset + 32 > witness_len)
      return 0;
  ```
  If `sk_offset` is provided as an adversarial or unchecked unsigned value near `SIZE_MAX` (e.g., `SIZE_MAX - 10`), the addition `sk_offset + 32` wraps around `size_t`, resulting in a value $\le \text{witness\_len}$. This allows execution to proceed to:
  ```c
  for (size_t i = 0; i < 32; i++)
      masked[sk_offset + i] ^= aux_hash[i];
  ```
  causing an out-of-bounds write to stack memory.
* **Fix**:
  Replace the additive check with an underflow-safe subtraction check:
  ```diff
  --- a/src/mpt_internal.h
  +++ b/src/mpt_internal.h
  @@ -330,7 +330,7 @@ wconf_generate_nonces(...)
       if (aux32)
       {
  -        if (sk_offset + 32 > witness_len)
  +        if (sk_offset > witness_len || witness_len - sk_offset < 32)
               return 0;
  ```

---

#### [LOW-03] Uninitialized `prev` Buffer Passed to `wconf_hmac_sha512`
* **File**: `tools/spike-2026-08-18/wconf-nonces.patch` (`src/mpt_internal.h:397`)
* **Failing Scenario**:
  `unsigned char prev[64];` is allocated on the stack without initialization. On iteration $i = 0$, `ch[0] = prev` passes a pointer to uninitialized memory. Although `cl[0] = 0` causes `wconf_hmac_sha512` to skip reading from it, static analysis tools (and MSan runtime sanitizers) can flag pointer passing of uninitialized stack variables.
* **Fix**:
  Zero-initialize `prev` at declaration:
  ```diff
  --- a/src/mpt_internal.h
  +++ b/src/mpt_internal.h
  @@ -396,7 +396,7 @@ wconf_generate_nonces(...)
       {
  -        unsigned char prev[64];
  +        unsigned char prev[64] = {0};
           size_t prev_len = 0;
  ```

---

## Verdict
**fix-before-merge** (Address LOW-01 stack hygiene and LOW-02 integer wrap before landing in production).

