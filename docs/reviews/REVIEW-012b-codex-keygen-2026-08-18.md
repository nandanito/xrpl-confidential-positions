# REVIEW-012b — leg B (Codex), keygen packet

- **Date:** 2026-08-18
- **Reviewer:** Codex (`codex exec`, gpt-5.4-codex default), sandbox `read-only`.
- **Access:** **Full repository read access, and it executed code** to compute its known-answer vectors.
- **Verbatim.** Reproduced exactly as returned. Adjudicated in `REVIEW-012c`.
- ⚠ **Line-number citations are this leg's own and were spot-checked, not exhaustively verified.** Where the adjudication relies on one it says so.

---

# REVIEW-012 Ruling: ElGamal Keygen

## Verdict

I approve ADR-0001 section (e)'s deterministic master-seed derivation, but only as a versioned W-CONF profile, not as an XLS-0096 standard yet. ADR-0001 is still `Proposed`, and keygen is the named unreviewed blocker (`docs/decisions/ADR-0001-key-custody-and-proof-location.md:3`, `docs/decisions/ADR-0001-key-custody-and-proof-location.md:182`, `docs/decisions/ADR-0001-key-custody-and-proof-location.md:188`, `CLAUDE.md:27`, `CLAUDE.md:29`).

The packet is somewhat biased toward derivation, but it discloses that bias (`docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:176`, `docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:178`). Its stale or underweighted claim is that seed compromise “already means total loss of spending authority”: after a holder key is registered, an independent ElGamal key would still be needed to prove Sends, because `sk_A` is a proof witness (`CLAIMS.md:70`). The packet later notices the collapse of two authentications (`docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:115`, `docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:117`), but the proposal text understates that cost (`docs/decisions/ADR-0001-key-custody-and-proof-location.md:184`).

## Adjacency

The `r`/`rho` reasoning partly transfers, and the central conclusion inverts. What transfers: versioned domain separation, length framing, wide 64-byte reduction, abort-on-zero, and refusal of caller-supplied scalar material; those are engineering invariants from REVIEW-010c (`docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:16`, `docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:23`). What does not transfer is the decisive disclosure argument: `r` is published in `BlindingFactor`, while an ElGamal private key is not published; only `pk_A = sk_A * G` is public by design (`docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:49`, `docs/reviews/REVIEW-012-REQUEST-keygen-2026-08-18.md:55`). For keygen, deterministic derivation is the recovery mechanism; for `r`, deterministic derivation from a long-lived secret creates a public PRF-output oracle and buys nothing (`docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:57`, `docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:61`).

## Rulings On Section 6

1. **Master-seed derivation: yes.** Loss is permanent and rotation/recovery do not exist (`CLAIMS.md:46`, `CLAIMS.md:47`, `CLAIMS.md:28`; `docs/decisions/ADR-0001-key-custody-and-proof-location.md:124`, `docs/decisions/ADR-0001-key-custody-and-proof-location.md:132`). The recovery gain wins, provided the README says seed compromise now gives both XRPL signing authority and ElGamal proof/decryption authority.

2. **Byte-exact construction:** below.

3. **Scalar generation:** use wide 64-byte reduction modulo secp256k1 order. Rejection sampling would be acceptable offline, but unnecessary; wide reduction gives negligible bias and keeps this aligned with the ruled scalar constructions (`docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:16`, `docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md:19`). Abort if the reduced scalar is zero; do not retry.

4. **Seed input:** feed the decoded XRPL family seed entropy, not a derived XRPL private key. `ripple-address-codec` encodes seeds from exactly 16 entropy bytes plus a seed type (`node_modules/ripple-address-codec/src/xrp-codec.ts:165`, `node_modules/ripple-address-codec/src/xrp-codec.ts:178`), and decodes to `bytes` plus `type` (`node_modules/ripple-address-codec/src/xrp-codec.ts:185`, `node_modules/ripple-address-codec/src/xrp-codec.ts:201`). Both `secp256k1` and `ed25519` seeds are supported and separated by the decoded type. For regular-key or multi-signing accounts, this profile may be used only with the AccountRoot master family seed for the account being registered; a regular-key seed or a signer-list member seed must be refused as the derivation root.

5. **Domain separation:** the label is `WCONF-ELGAMAL-KEYGEN-v1`. It does not reuse `WCONF-NONCE-v1`, `WCONF-RANDOM-SCALAR-v1`, or any `CMPT_*` proof domain (`docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md:64`, `docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md:72`).

6. **Storage and backup:** passphrase-encrypted-at-rest is necessary but not sufficient against the accepted same-host threat model (`docs/architecture/ARCHITECTURE-2026-08-18.md:54`, `docs/architecture/ARCHITECTURE-2026-08-18.md:66`). The signer must keep key material out of IPC, argv, env, logs and browser storage; decrypt only inside the signer; zeroize buffers on use and shutdown; prefer OS keychain or sealed storage; and state plainly that code execution on the holder machine can still read secrets from memory.

7. **What the signer refuses:** production IPC must not accept seeds, passphrases, derived keys, `r`, `rho`, entropy, or caller-built cryptographic fields. ADR-0001’s interface is value-shaped and says it never accepts keys or returns them (`docs/decisions/ADR-0001-key-custody-and-proof-location.md:81`, `docs/decisions/ADR-0001-key-custody-and-proof-location.md:85`). Seed/passphrase entry belongs only in the signer’s local onboarding UI. A test-only offline API may inject fixed inputs only if it cannot sign, submit, or return a production transaction blob.

8. **Standard or repository-local:** repository-local now, with public vectors and a stable spec. Upstream currently documents ElGamal keys as a distinct secp256k1 key generated with `ripple-keypairs` (`node_modules/@xrplf/mpt-crypto/README.md:36`, `node_modules/@xrplf/mpt-crypto/README.md:39`), and U-32 records keypair generation as deliberately not exported from WASM (`UPSTREAM-FEEDBACK.md:124`, `UPSTREAM-FEEDBACK.md:125`). A repo-local profile is a liability only if it lives in code alone; with this byte-exact text and KATs, reconstruction does not depend on this signer binary.

9. **Validation:** mpt-crypto validation establishes well-formedness and API compatibility, not derivation correctness. The package exposes 32-byte private keys and 33-byte public keys (`node_modules/@xrplf/mpt-crypto/src/constants.ts:7`, `node_modules/@xrplf/mpt-crypto/src/constants.ts:10`), proof generation consumes `publicKey`, `privateKey` and a 32-byte context hash (`node_modules/@xrplf/mpt-crypto/src/proofs.ts:21`, `node_modules/@xrplf/mpt-crypto/src/proofs.ts:47`), and CLAUDE.md requires validation against `test_pok_sk`, `test_elgamal`, and `test_elgamal_verify` (`CLAUDE.md:49`, `CLAUDE.md:51`). Those tests do not prove the seed decoding, framing, labels, HKDF inputs, or type separation; the KDF KAT must do that.

## Byte-Exact Construction

All strings are ASCII. All integers are `u32be`. All byte arrays are raw bytes, not hex text.

```
LABEL  = "WCONF-ELGAMAL-KEYGEN-v1"
SALT   = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt"
EXPAND = "WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand"
ROLE   = "secp256k1-scalar"
N      = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

decoded = ripple-address-codec.decodeSeed(family_seed)

Require decoded.bytes length = 16.
Require decoded.type is exactly "secp256k1" or "ed25519".
Derive root AccountID from ripple-keypairs.deriveKeypair(family_seed).
If an expected AccountID is supplied, require equality.

IKM = LABEL
   || u32be(len(decoded.type)) || decoded.type
   || u32be(16)                || decoded.bytes
   || u32be(20)                || root_account_id

PRK    = HMAC-SHA512(key = SALT, msg = IKM)
INFO   = EXPAND || u32be(len(ROLE)) || ROLE
OKM64  = HMAC-SHA512(key = PRK, msg = INFO || 0x01)
sk_A   = int_be(OKM64) mod N
```

If `sk_A == 0`, abort onboarding and do not retry with altered labels or counters. Otherwise encode `sk_A` as 32-byte big-endian. `pk_A` is compressed secp256k1 `sk_A * G`.

The registration proof must always use a non-NULL transaction context. rippled’s path binds registration to account, issuance and sequence (`docs/task-zero/SOURCES-2026-08-18.md:35`, `docs/task-zero/SOURCES-2026-08-18.md:65`), but the lower library API accepts NULL and then becomes account-unbound (`docs/task-zero/SOURCES-2026-08-18.md:67`, `docs/task-zero/SOURCES-2026-08-18.md:75`; `CLAIMS.md:161`).

## Known-Answer Vectors

Generated by executing inline Node code against the installed `ripple-address-codec`, `ripple-keypairs`, and `@noble/curves` packages. I ship no transaction/proof vectors; no production signer exists in this repository yet (`CLAIMS.md:108`, `docs/architecture/ARCHITECTURE-2026-08-18.md:105`, `docs/architecture/ARCHITECTURE-2026-08-18.md:106`).

Vector 1:

```
seed_type:    secp256k1
seed_entropy: 000102030405060708090A0B0C0D0E0F
family_seed:  sp6JdwovBCsiwnMhXuvZGZtPUoGVj
account_id:   7F0BBA382512C0A00A1630506AE44EBE8AC20D27
PRK:          8A26F1B7BFC755769AEADFA7D0A45A0D023036928C6E628639AA88DB15FEFBFAEEE1BC77E72F36D553DE22DF9D4773E0A82694949FD2C30840883BE51744F2BA
OKM64:        DCAA926637AEBD02488FBE27C6DD7DE96BF97329FFA70F496A50AFD25F3CB34CC784161154F3DA9CCB996D4012005C4D01D92A8758FC9D012C1DB48AEB1615E3
sk_A:         F523DA4F10344409A57E27EC6C2FF66E612962C4002AE347D53226FBCA26925A
pk_A:         02658DF33DCE8368C1FA17D7DE828D234D9CE5593285A69BDE7338EF1A2C023EEC
```

Vector 2:

```
seed_type:    ed25519
seed_entropy: 000102030405060708090A0B0C0D0E0F
family_seed:  sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n
account_id:   A8683DC013F856ACCDD629E0730E9FBB707D0D1B
PRK:          81055659C9DEF2D99E78D7AFFACBADF6A0121800CA707DF25B987E4539EFA34C15D36DD41BC9A30DCDE537B41D8795AB72A8704717334E33CE914B9E3725394C
OKM64:        2D6B093FFF62DECFE39223786E68B329C73C252FB82A8895E1099391149254F73FFD650EF16813BA78F25E9012A1E1F094246D7ADCCA25576219F2E53E6A13E9
sk_A:         32AFE79F8CC2D1745DEE0AB5FBF2B6AF39E1F63DC5B8D83C7200A05C8F56EE51
pk_A:         033CE826BEA6E591B1760885CFAA8AC6D91625A127CE9A4135F46B5BB96581D2FF
```

## Failing Test

The future committed test must reproduce both vectors, assert that the two seed types separate, reject malformed seed length/type, reject AccountID mismatch, reject scalar zero by stubbing `OKM64 = 0^64`, and fail on any label, salt, role, framing, or reduction change.

Minimum assertion:

```ts
assert.equal(vector1.sk_A, "F523DA4F10344409A57E27EC6C2FF66E612962C4002AE347D53226FBCA26925A")
assert.equal(vector1.pk_A, "02658DF33DCE8368C1FA17D7DE828D234D9CE5593285A69BDE7338EF1A2C023EEC")
assert.equal(vector2.sk_A, "32AFE79F8CC2D1745DEE0AB5FBF2B6AF39E1F63DC5B8D83C7200A05C8F56EE51")
assert.equal(vector2.pk_A, "033CE826BEA6E591B1760885CFAA8AC6D91625A127CE9A4135F46B5BB96581D2FF")
assert.notEqual(vector1.sk_A, vector2.sk_A)
```

## Explicit Scope

This construction does not protect against compromise of the XRPL family seed, passphrase, host OS, signer binary, or signer memory. The architecture already says the local boundary raises the bar from leaked token to code execution, not to security against code execution (`docs/architecture/ARCHITECTURE-2026-08-18.md:58`, `docs/architecture/ARCHITECTURE-2026-08-18.md:66`). It does not provide holder privacy from the issuer; issuer visibility is mandatory (`CLAIMS.md:27`, `docs/architecture/ARCHITECTURE-2026-08-18.md:43`, `docs/architecture/ARCHITECTURE-2026-08-18.md:50`). It does not solve key rotation, recovery, or post-compromise repair (`CLAIMS.md:28`, `CLAIMS.md:46`, `CLAIMS.md:47`). It does not protect `r`, `rho`, sigma nonces, or Bulletproof blinding; those live in separate rulings or remain open (`docs/architecture/ARCHITECTURE-2026-08-18.md:72`, `docs/architecture/ARCHITECTURE-2026-08-18.md:77`).
