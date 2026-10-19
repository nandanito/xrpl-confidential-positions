# RULING — ElGamal key derivation from the XRPL master seed

- **Date:** 2026-08-18
- **Status:** **Ruled.** Adopted in `REVIEW-012c-adjudication-keygen-2026-08-18.md`, which adjudicates three legs.
- **Supersedes:** ADR-0001 §(e)'s keygen proposal, which was a paragraph of intent. This is the construction.
- **Not implemented.** This ruling specifies; it does not build. No signer exists.
- **This is the only copy of this construction.** Do not paraphrase it into ADR-0001 or the architecture document. A second copy of a byte-exact specification is a divergence waiting to happen (REVIEW-005c).

---

## 1. The decision

**Derive the holder's ElGamal keypair deterministically from the XRPL master seed, with domain separation. §(e)'s proposal is upheld** — unanimously across three legs — **subject to five conditions in §7, of which conditions 1 and 2 are load-bearing and §(e) does not currently contain either.**

**Why the `r`/`ρ` ruling does not govern here.** That ruling forbade deriving `r` from a long-lived secret because `r` is **published in clear** in `BlindingFactor`, so derivation would publish PRF outputs keyed by holder secret material and buy nothing in return. Neither half of that reasoning holds for `sk_A`: it is never published, and derivation buys the **only** recovery mechanism available in a protocol with no rotation and no recovery. **The conclusion inverts.**

**But state the reason precisely, because a nearby version of it is false.** It is *not* true that nothing seed-derived is published. Under this construction `pk_A = sk_A·G` is published permanently and welded to the account by the registration PoK (E-66). The distinction that carries the ruling is narrower: **one published group element at one fixed label is not an oracle.** An oracle is queryable — the `r` case gives an adversary a growing family of PRF outputs at inputs they influence by choosing when to transact. Here there is exactly one output, per account, forever, and recovering the seed from it requires solving a discrete log and then inverting HKDF.

---

## 2. Construction

All strings are ASCII with no terminator. All lengths are `u32be`. All byte strings are raw bytes, never hex text.

```
LABEL   = "WCONF-ELGAMAL-KEYGEN-v1"                      (23 bytes)
SALT    = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt"    (41 bytes)
EXPAND  = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand"          (35 bytes)
ROLE    = "secp256k1-scalar"                             (16 bytes)
n       = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
```

### 2.1 Inputs, and what must be rejected before anything is hashed

```
decoded      = decodeSeed(family_seed)          // ripple-address-codec
seed_bytes   = decoded.bytes                    // MUST be exactly 16
seed_type    = decoded.type                     // MUST be "secp256k1" or "ed25519"
account_id   = decodeAccountID(deriveAddress(deriveKeypair(family_seed).publicKey))
                                                // MUST be exactly 20 bytes
```

**Refuse, before deriving anything:**

- `len(seed_bytes) != 16`.
- `seed_type` not exactly one of the two strings above.
- A supplied expected AccountID that does not equal the derived one.
- **A regular-key seed or a signer-list member seed.** The derivation root is the AccountRoot **master** family seed for the account being registered, and nothing else. See §7 condition 2 for the case where that seed has been retired.

### 2.2 Derivation

```
IKM   = LABEL
      ‖ u32be(len(seed_type)) ‖ seed_type
      ‖ u32be(16)             ‖ seed_bytes
      ‖ u32be(20)             ‖ account_id

PRK   = HMAC-SHA-512(key = SALT, msg = IKM)                        [HKDF-Extract]

INFO  = EXPAND ‖ u32be(len(ROLE)) ‖ ROLE
OKM64 = HMAC-SHA-512(key = PRK, msg = INFO ‖ 0x01)                 [HKDF-Expand, L=64]

X     = OS2IP(OKM64)                                               // 512-bit big-endian
sk_A  = (X mod (n − 1)) + 1                                        // in [1, n−1], TOTAL
pk_A  = compressed_SEC1(sk_A · G)                                  // 33 bytes
```

`IKM` is **80 bytes** for a `secp256k1` seed and **78 bytes** for an `ed25519` seed. `INFO` is 55 bytes.

### 2.3 The reduction is total, and that is deliberate

`sk_A = (X mod (n−1)) + 1` **cannot produce zero and needs no branch.** There is no abort path, no retry, and no secret-dependent control flow.

**This deliberately departs from the other two rulings, and the reason is that the same rule has opposite consequences here.** Sigma nonces and `r`/`ρ` both specify *abort on zero, never retry* — correct there, because the input is **fresh entropy** and aborting means declining to sign one transaction, which the caller retries. **Keygen's input is a fixed seed.** An abort would be **deterministic and permanent**: the same holder would abort forever, unable to participate in confidential transfers at all, with no rotation and no recourse. A total function removes the failure mode instead of handling it.

Bias is negligible: reducing a uniform 512-bit value modulo `n−1 ≈ 2²⁵⁶` leaves statistical distance below `2⁻²⁵⁶`.

**Rejection sampling is not forbidden here on the grounds the other rulings used.** Those grounds were about a signing hot path repeatedly sampled by a timing adversary; keygen runs once, offline, per holder. Wide reduction is chosen because it is total and simpler, **not** by symmetry with the other rulings — and a future reader who "corrects" this back to `mod n` with an abort will have made it worse.

### 2.4 One key per account, not per issuance — stated because the protocol invites the opposite

`HolderEncryptionKey` is registered on the **`MPToken` object**, so it is per `(account, issuance)`. A holder in two confidential issuances registers a key on each, and **may use the same `pk_A` for both**; nothing forbids it.

**This construction derives one keypair per account and reuses it across issuances.** The `MPTokenIssuanceID` is deliberately **not** in the preimage. Per-issuance keys would buy nothing: they would be intended to unlink a holder's positions across issuances, and the holder's AccountID is public on every one of them regardless (P-11). A per-issuance derivation would add state, add a way to register the wrong key, and defend nothing.

**No key index field.** An always-zero index invites inconsistent later use. The `v1` in the label is the extension point.

---

## 3. Domain separation

Disjoint from every label already in use. Checked against the nonce ruling, the `r`/`ρ` ruling and upstream's Fiat–Shamir domains:

| Purpose | Label | Ruling |
|---|---|---|
| **ElGamal keygen** | `WCONF-ELGAMAL-KEYGEN-v1` (+ `/HKDF-Extract-salt`, `/HKDF-Expand`) | **this ruling** |
| Sigma nonces | `WCONF-NONCE-v1` | REVIEW-005c |
| `r`, `ρ` | `WCONF-RANDOM-SCALAR-v1` (+ `/HKDF-Extract-salt`, `/HKDF-Expand`, `/store/*`), roles `elgamal-r` and `balance-rho` | REVIEW-010c |
| Registration PoK challenge | `CMPT_POK_SK_REGISTER` | upstream |
| Sigma challenges | the `CMPT_*_SIGMA` family | upstream |

**Corrected 2026-08-18 (`REVIEW-013c`).** The `r`/`ρ` row previously read *"the `WCONF-R-*` / `WCONF-RHO-*` family"*. **No such family exists** — both REVIEW-013 legs caught it independently. REVIEW-010's Deliverable A uses a single label with two role strings, as now shown. **Domain separation was never at risk** — `WCONF-ELGAMAL-KEYGEN-v1` is disjoint from `WCONF-RANDOM-SCALAR-v1` either way — but a table whose purpose is to prove disjointness must name the labels it is comparing against correctly.

Every W-CONF label carries `v1`. Any change to framing, hash, curve or reduction **bumps to `v2`** — and note what that means here, unlike elsewhere: a version bump changes every holder's key, and a holder who has already registered **cannot migrate**. **A `v2` is not a rollout, it is a fork.** Treat the version tag as a one-way door.

---

## 4. Storage, memory and process boundary

The threat model includes a hostile same-host process (ADR-0001 §(a), issue #1).

- Plaintext seed and `sk_A` are **never** written to non-volatile storage.
- If cached at rest: authenticated encryption (`ChaCha20-Poly1305` or `AES-256-GCM`) under a key from **Argon2id** (≥64 MiB, ≥3 iterations, parallelism 4, unique 16-byte CSPRNG salt).
- Seed, `PRK`, `OKM64` and `sk_A` buffers are pinned against swap where the OS allows, and zeroized on drop and on `SIGINT`/`SIGTERM`/panic.
- Key material never appears in IPC, argv, environment, logs or browser storage.
- **The claim stops here.** None of it defeats an adversary with code execution, who reads `sk_A` from process memory. P-5 forbids calling it secure.

---

## 5. What the signer must refuse

1. **No endpoint accepts a seed, a passphrase, `sk_A`, `r`, `ρ`, or entropy of any kind.** Carried forward from REVIEW-010c and extended to key material.
2. **No endpoint returns `sk_A` or any derived secret.**
3. **Seed entry happens only in the signer's own local UI**, never through the browser client and never over IPC.
4. **The registration PoK must always be given a non-NULL `context_id`.** The library accepts NULL and then produces an account-unbound, freely replayable registration proof (F-19). rippled's own path cannot reach that, but the signer links the library directly and can. Assert non-NULL at the call site rather than relying on the wrapper.
5. A test-only offline API may inject fixed seeds **only** if it cannot sign, submit, or emit a production transaction blob.

---

## 6. Known-answer vectors

**Computed, not asserted.** `PRK` and `OKM64` are leg B's values, which were independently recomputed during adjudication and reproduced **exactly**; only the reduction differs from leg B's, so only `sk_A` and `pk_A` changed. Both vectors are reproduced by two implementations of this prose — one calling `HMAC-SHA-512` directly, one via `@noble/hashes`' `hkdf()` — which agree.

Both vectors use seed entropy `000102030405060708090A0B0C0D0E0F`.

### Vector 1 — `secp256k1`

```
family_seed  sp6JdwovBCsiwnMhXuvZGZtPUoGVj
seed_type    secp256k1
account_id   7F0BBA382512C0A00A1630506AE44EBE8AC20D27
IKM length   80
PRK          8A26F1B7BFC755769AEADFA7D0A45A0D023036928C6E628639AA88DB15FEFBFAE
             EE1BC77E72F36D553DE22DF9D4773E0A82694949FD2C30840883BE51744F2BA
OKM64        DCAA926637AEBD02488FBE27C6DD7DE96BF97329FFA70F496A50AFD25F3CB34C
             C784161154F3DA9CCB996D4012005C4D01D92A8758FC9D012C1DB48AEB1615E3
sk_A         D1CE6CB547E3010BEE0DE614330D745A2ADE751C8BD16A66962616EFE7453964
pk_A         02295AD17728DBD75FAB16EE3A38E7D1ED96908DD7E530C90BD8965AF0A7E71246
```

### Vector 2 — `ed25519`

```
family_seed  sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n
seed_type    ed25519
account_id   A8683DC013F856ACCDD629E0730E9FBB707D0D1B
IKM length   78
PRK          81055659C9DEF2D99E78D7AFFACBADF6A0121800CA707DF25B987E4539EFA34C
             15D36DD41BC9A30DCDE537B41D8795AB72A8704717334E33CE914B9E3725394C
OKM64        2D6B093FFF62DECFE39223786E68B329C73C252FB82A8895E1099391149254F7
             3FFD650EF16813BA78F25E9012A1E1F094246D7ADCCA25576219F2E53E6A13E9
sk_A         601AF0DF8C25B04441802E2E6A5B69D93AD56343CA6556885A2B0F75CBE295EA
pk_A         02763AF7208A6D7557F638D5959CD65C6BA0C3BF320A84CCA36E4A55E7B099877B
```

**The two vectors share seed entropy and differ in everything downstream**, which is the point: the same 16 bytes encode to two different family seeds, two different accounts, and therefore two different ElGamal keys.

**Line wrapping above is presentational.** `PRK` and `OKM64` are 64 bytes each, unwrapped in the test.

**Runnable test:** `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`.

---

## 7. Conditions. The ruling is conditional and two of these are load-bearing

**1. The derivation must be published in reproducible detail.** §(e)'s *only* benefit is that the key becomes *"recoverable from a backup the holder already keeps."* That is false if the algorithm exists only in our binary: in the scenario that matters — holder has the seed, no longer has our signer — the seed is necessary but not sufficient. §(e) treats "standard or repository-local" as an open question of equal rank to the others. **It is not. It is a precondition on the benefit that justifies the whole proposal.** This document, §2, is the minimum discharge: precise enough to reimplement from prose alone. Publishing it as an XLS informational draft is the better discharge and should be considered separately.

**2. The onboarding flow must disclose that the master seed becomes a permanent decryption credential, and the signer must warn when the account's master key has been retired.**

§(e)'s central defence is that *"seed compromise already means total loss of spending authority, so the marginal harm is retroactive confidentiality."* **That premise is false in a configuration XRPL explicitly supports.** An account may set a regular key (`SetRegularKey`) and disable the master key (`asfDisableMaster` — `lsfDisableMaster`, commented *"True, force regular key"*), or enforce multi-signing through a `SignerList`. In those configurations the master seed is **not** spending authority; it may be a decommissioned credential kept only in cold backup precisely because the holder followed standard key hygiene.

Under this construction that retired seed **still derives `sk_A`**, and therefore still yields full retroactive decryption of the entire confidential history, permanently, with no rotation. Three consequences:

- The marginal-harm argument fails **exactly for the holders who took the most care**. For them the confidentiality loss is the whole loss, not the margin.
- The two arms differ in **observability**. A holder knows when a key is lost. A holder never knows when a seed backup has been copied.
- **This design anchors the one key that cannot be rotated to the one credential XRPL says may be retired.** A holder who exercises a right the ledger grants discovers the retired credential was never retired.

So the signer must, before the first `ConfidentialMPTConvert`:

- State that the master seed becomes a permanent decryption credential for all confidential history, and that this cannot be undone or rotated.
- **Detect and warn** when the target account has `lsfDisableMaster` set or a regular key or signer list configured — that holder has been given every reason to believe the master seed is decommissioned.
- Offer, for those accounts, an **explicitly configured standalone ElGamal seed** with its own backup, and say plainly that it is a second thing to lose.

This condition does not make derivation wrong. It makes §(e)'s argument for it honest.

**3. Input is the raw 16-byte family seed**, never a derived XRPL private key — so the ElGamal identity does not depend on the account's signature algorithm. The seed type and AccountID are bound in the preimage (§2.2).

**4. `1 ≤ sk_A ≤ n−1` guaranteed without a secret-dependent branch** (§2.3).

**5. A derivation KAT, distinct from upstream's interop vectors.** `test_pok_sk`, `test_elgamal` and `test_elgamal_verify` establish that a keypair is **well-formed and interoperates** — a constant `sk_A = 1` passes all three. They establish **nothing** about whether the key was derived correctly. `CLAUDE.md`'s requirement to validate against them stands and is necessary; it is not sufficient, and the derivation needs its own vectors, reproduced by an implementation written from this prose rather than from reference control flow.

---

## 8. Residual risk — what this construction does not protect against

1. **Master seed compromise.** The attacker derives `sk_A` and decrypts the holder's entire confidential history, retroactively and permanently. This is the accepted cost of the ruling, not an oversight.
2. **Code execution on the holder's machine.** Reads `sk_A` from memory. `mlock` and zeroization do not help.
3. **The issuer and auditor.** They decrypt every balance by protocol design. Nothing here touches that (P-9).
4. **Loss of both the seed and the signer, where the derivation is unpublished.** Condition 1 exists to close this and is not closed by writing code.
5. **Third-party restore.** A wallet that restores the seed without implementing this derivation recovers the public account and **not** the confidential balance.
6. **Everything downstream of keygen.** Sigma nonces, `r`, `ρ` and Bulletproof blinding have their own rulings or are open (issue #8). A correctly derived key proves nothing about how it is later used.
7. **The registration proof, if the signer passes a NULL `context_id`.** Not a protocol weakness — a library footgun this signer can walk into (§5 item 4, F-19).
