> **RECORDED VERBATIM AS LEG B. Adjudicated in `REVIEW-005c-adjudication-nonce-construction-2026-08-17.md`.**
>
> Cryptography Reviewer, leg B of two — a cold conversation outside any project,
> with no sight of leg A. Same packet.
>
> **It agrees with leg A on the finding and disagrees on the design.** Both
> independently concluded that ADR-0001 §(e) is *wrong* rather than
> underspecified, by the same route. Leg A rules hedged; this leg rules fully
> deterministic. §2 of the adjudication resolves what that disagreement reduces
> to — and it is not a nonce question.
>
> Two of its findings were rejected on source: §6.2's zero-amount Clawback
> concern (upstream substitutes a documented 33-zero sentinel) and §5.3's
> escalation that the register mis-records TOB-RIPCTX-10 (it does not). §6.1
> item 3 is answered: upstream's `statement_hash` **does** cover the context.
> ---
>
> **READ THIS FIRST — about the word "broken" below.**
>
> This leg says the compact-sigma paper's Remark 6.1 "is broken in its
> deterministic mode." **The paper is not broken, and this project does not
> claim it is.**
>
> What the finding actually establishes is narrower: **Remark 6.1's
> justification omits the transaction context from the statement it reasons
> over.** The construction is sound; one paragraph explaining why it is sound
> is incomplete. `REVIEW-005c`, which adjudicated this leg, records that the
> upstream implementation is sound on the nonce-context axis.
>
> ⚠ **The leg's words are unedited and stay that way.** A review packet is the
> record of what a reviewer was shown and what they said; editing it after the
> fact makes it a worse record. **This note corrects the impression without
> touching the evidence.** Added 2026-09-05 after `REVIEW-039c` — a leg reading
> as the criticised party — flagged the phrasing as stronger than the finding
> supports (`CLAIMS.md` E-242).
>
> The paper is Dore & Cenk, RippleX Research (P-7).

---

# REVIEW-005 — Cryptography Reviewer ruling: nonce construction for XLS-0096 compact sigma proofs

- **Replaces:** `ADR-0001-key-custody-and-proof-location.md` §(e), lines 175–191.
- **Scope:** nonce derivation only. Does **not** rule on ElGamal key derivation from the XRPL master seed (packet §7). Does **not** reopen §(a)'s proving location.
- **Verdict:** the sketch at line 180 is replaced, not amended. The replacement is **fully deterministic — no fresh entropy at proving time** — and is **this project's own construction**, not upstream's.

---

## 0. Ruling, in one page

**Adopt: our own construction. Deterministic. HKDF-SHA-512, keyed on the witness, bound to the exact Fiat–Shamir pre-image including `TransactionContextID`, wide-reduced into the scalar field. Specified byte-exactly in §1.**

Four things drove it, and three of them are findings rather than preferences.

1. **The paper's Remark 6.1, read literally, is broken in its deterministic mode.** `cmpt-compact-sigma.pdf` §6.1 derives nonces over `sk_A ‖ r ‖ m ‖ b ‖ ρ ‖ statement ‖ fresh entropy`. Under the paper's own terminology (§2.4, §6.2) the *statement* `x` **does not include `TransactionContextID`** — §6.2 lists it as a separate, fourth hash input. But the challenge `e` **does** include it. Two proofs with identical statements and different `TransactionContextID`s therefore get **identical nonces under distinct challenges**, which is exactly the extraction condition of Theorem 4.2. This is reachable: a wallet that caches ciphertexts and commitments and re-proves after the on-ledger `CB_S_Version` advances — the routine case created by TOB-RIPCTX-12 and the still-**Unresolved** TOB-RIPCTX-13 — produces precisely that pair. The paper's optional "fresh entropy" is what papers over this. Bind the context properly and the hedging becomes unnecessary; leave it unbound and hedging is the only thing standing between you and `sk_A`. ADR §(e) line 180 copies the gap verbatim.

2. **Correctly bound, determinism is provably reuse-free.** See Lemma 1.1. Nonce reuse under distinct challenges becomes *impossible for a conforming signer*, not merely unlikely — and it becomes **testable**, which a hedged construction never is (§4 item 12's concern, generalised).

3. **A dead RNG is already fatal upstream of the nonces, so hedging buys nothing.** `r` (ElGamal encryption randomness) and `ρ` (balance commitment blinding) are *witness elements* generated from the same RNG a hedged salt would use. A dead RNG repeats `r`, which leaks amount differences directly from the ciphertexts and, for Convert/ConvertBack, is disclosed on-chain in `BlindingFactor`. Hedging cannot rescue a signer whose `r` is dead; it can only add a second, untestable dependency on a source whose failure is already game-over. Packet §5 does not notice this.

4. **The genuine argument for hedging is fault injection, and the packet never makes it.** Deterministic signatures are the classic differential-fault-attack target: glitch the response computation twice against the same nonce and extract the witness. That threat requires an adversary with physical or fine-grained execution control over the prover. Under ADR §(a) — a daemon on the holder's own machine — such an adversary can already read `sk_A` out of process memory, so DFA is not in the threat model. **This is the §6 runtime dependency the packet asked me to name:** if proving ever moves to a hardware signer, smartcard, or HSM, revisit this ruling. The `v1` label in §1 is the migration point.

### Consequence the packet does not let you see

The packet's C-6 says: *"You are free to specify something entirely unlike any existing implementation."* **That is not true as the architecture currently stands, and the packet's own §8 attachment list is what conceals it.**

ADR §(a) lines 86–87 (not attached per §8, which sends only §(e)) establish that the signer is a **Rust FFI wrapper around mpt-crypto**, not an independent prover. Packet Appendix A then states that mpt-crypto has **"no exported entry point [that] lets a caller influence the nonce — no seed argument, no RNG hook, no global."** Those two facts together mean a Rust caller **cannot** implement this ruling, or any ruling other than "keep upstream's hedged construction," through the existing FFI surface. C-6 grants a freedom the build does not provide.

Adopting this ruling therefore requires one of:

| Path | Delta | Assessment |
|---|---|---|
| **A. Vendor mpt-crypto at a pinned commit; replace one function** | `generate_deterministic_nonces` → `mpt_nonce_v1`, plus its call site in `proof_compact_standard.c` (the call site must gain the transcript-prefix and context bytes, since upstream passes only `statement_hash(32)`) | **Recommended.** Two-file diff. CI can assert the rest of the tree is byte-identical to upstream `85dbac7`. Keeps the audited transcript serialisation shared with the C library. |
| **B. Reimplement the compact sigma prover in Rust** (`k256` / `secp256k1`) | ~300 lines: five nonces, ~11 multi-scalar multiplications, one SHA-256 | Viable and gives clean zeroization, but you must re-derive the Fiat–Shamir transcript byte-for-byte against rippled's verifier. Failure mode is *loud* (proofs reject on devnet), not silent, so the risk is schedule not security. Choose this if the vendored fork proves unmaintainable across the audit cycle. |
| **C. Upstream a nonce-injection API** | New public entry point taking caller-supplied nonces | **Reject.** A public nonce-injection hook is a footgun of exactly the class this review exists to prevent, and it violates the spirit of C-4. |

This is an engineering call, not a cryptographic one, and I flag it rather than decide it. But **no signer code should be written against the assumption in C-6 until it is decided**, because the ruling below is unimplementable without it.

---

## 1. The construction

### 1.0 Primitives and notation

```
q      = secp256k1 group order
       = 0xFFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141

be16(x)      2-byte big-endian unsigned integer
be32(x)      4-byte big-endian unsigned integer
LP(b)        be32(len(b)) || b                    -- length-prefixed byte string
S32(a)       32-byte big-endian encoding of a scalar in [0, q).
             Fixed width always. No minimal-length encoding. Zero encodes as 32 × 0x00.
PT(P)        33-byte SEC1 compressed encoding of a curve point.

HMAC-SHA-512, HKDF-Extract/Expand per RFC 5869 instantiated with SHA-512.
HKDF-Expand: T(0) = ""; T(i) = HMAC-SHA-512(PRK, T(i-1) || INFO || byte(i));
             OKM = T(1) || T(2) || ...
```

Two fixed ASCII constants, no NUL terminator:

```
SALT_V1  = "XLS0096-nonce-v1"           16 bytes
LABEL_V1 = "W-CONF/XLS0096/nonce/v1"    23 bytes
```

### 1.1 Transcript decomposition — the load-bearing definition

Every compact sigma proof computes its challenge as a hash over a byte string of the form

```
FS_preimage  =  A  ||  T  ||  Z
```

where

- **`A`** — everything the prover feeds the challenge hash **before** the first commitment element. Begins with the Fiat–Shamir domain tag and continues through all statement elements. (For Send this is Eq. (25) up to and including `B2`.)
- **`T`** — the concatenated first-round commitments. Derived from the nonces; therefore **not** an input to nonce derivation.
- **`Z`** — everything fed **after** the last commitment element. In every current proof type this is exactly `TransactionContextID`.

> **MUST:** the signer constructs `A` and `Z` **once**, into two buffers, and passes **the same buffer contents** to both the nonce KDF and the challenge hash. It must not rebuild, re-serialise, or re-order them for the KDF.

This requirement does the work of three separate checklist items. Because the KDF consumes the identical bytes the challenge consumes, any encoding ambiguity in the statement serialisation is *shared* by both and cannot cause them to diverge. Reconstructing `A` independently for the KDF re-introduces exactly the divergence this construction exists to eliminate, and is the single most likely implementation error (§3.3).

### 1.2 Derivation

For a proof type `P` with domain tag `TAG`, nonce count `k`, and witness scalars `w[1..k]` in the order fixed by Table 1.3:

```
IKM  =  LP(LABEL_V1)
     || LP(TAG)
     || be16(k)
     || LP( S32(w[1]) || S32(w[2]) || ... || S32(w[k]) )
     || LP(A)
     || LP(Z)

PRK  =  HKDF-Extract-SHA-512(salt = SALT_V1, ikm = IKM)
     =  HMAC-SHA-512(key = SALT_V1, msg = IKM)

INFO =  LP(LABEL_V1) || LP(TAG) || be16(k)

OKM  =  HKDF-Expand-SHA-512(PRK, INFO, 64 * k)          -- exactly k blocks

for i in 1..k:
    B_i  = OKM[64*(i-1) .. 64*i]                        -- 64 bytes
    n_i  = big_endian_integer(B_i)  mod  q
    if n_i == 0:  ABORT(ERR_NONCE_ZERO)                 -- never retry, never increment

nonce for witness element w[i]  :=  n_i
```

`SALT_V1` is a fixed public constant. It is **not** random and there is no RNG input anywhere in this function. The secret enters through `IKM`, which is RFC 5869's intended position for keying material.

### 1.3 Per-proof-type table

| Proof type | Domain tag (ASCII) | len | `k` | Witness order `w[1..k]` | Nonce assignment |
|---|---|---:|---:|---|---|
| Send | `CMPT_SEND_SIGMA` | 15 | 5 | `m, r, b, ρ, sk_A` | `n1=α_m, n2=α_r, n3=α_b, n4=α_ρ, n5=α_sk` |
| ConvertBack | `CMPT_CONVERTBACK_SIGMA` | 22 | 3 | `b, ρ, sk_A` | `n1=t_b, n2=t_ρ, n3=t_sk` |
| Clawback | `CMPT_CLAWBACK_SIGMA` | 19 | 1 | `sk_iss` | `n1=t_sk` |
| Registration PoK | `CMPT_POK_SK_REGISTER` | 20 | 1 | `sk` | `n1=t_sk` |

**Transcript prefixes `A` and suffixes `Z`**, all points as `PT(·)`:

```
Send          A = "CMPT_SEND_SIGMA" || P_1..P_n || P_A || C1 || C2,1..C2,n
                  || PC_m || PC_b || B1 || B2
              Z = TransactionContextID (32 B)

ConvertBack   A = "CMPT_CONVERTBACK_SIGMA" || P_A || B1 || B2 || PC_b
              Z = TransactionContextID (32 B)

Clawback      A = "CMPT_CLAWBACK_SIGMA" || P_iss || C1 || C2 || PT(m·G)
              Z = TransactionContextID (32 B)

Registration  A = UNRESOLVED — see §6.1
              Z = UNRESOLVED — see §6.1
```

**Convert has no entry.** Production Convert uses deterministic `r`-disclosure via `BlindingFactor` (paper §8.1) and generates no sigma proof, therefore no nonces. The packet's C-1 is correct to omit it and the paper's §8.1 `Π_plain` is hypothetical. Convert's security rests entirely on `r` being fresh — see §6.2.

**Two ordering divergences resolved by fiat, both flagged in §5:**

- ConvertBack: packet C-1 says `(b, ρ, sk_A)`; paper §8.3 says `w = (b, sk_A, ρ)`; the proof serialises `(e, z_b, z_ρ, z_sk)`. **I fix `(b, ρ, sk_A)`** — the packet's order, which matches serialisation order and so minimises the chance of a transposition between the nonce array and the response array.
- Send: packet, paper and serialisation all agree on `(m, r, b, ρ, sk_A)`. No divergence.

### 1.4 Why this cannot reuse a nonce

> **Lemma 1.1.** Fix a proof type. Let `N = KDF(w, A, Z)` per §1.2 and `e = H(A ‖ T(N, A) ‖ Z)`. If two proof instances produced by a conforming signer satisfy `N = N′`, then — except with probability bounded by the collision resistance of SHA-512 over the length-framed encoding of `IKM` — `(w, A, Z) = (w′, A′, Z′)`, hence `T = T′` and `e = e′`.
>
> *Contrapositive:* `e ≠ e′ ⟹ N ≠ N′`.

Theorem 4.2 extraction requires two accepting transcripts **with the same first-round commitments and `e ≠ e′`**. Lemma 1.1 makes that pair unproducible. The ADR's second stated hazard at line 175 — "distinct statements under the same challenge" — is covered by the same argument: `A ≠ A′ ⟹ N ≠ N′`.

The `IKM` encoding is injective because every variable-length component is length-prefixed and every scalar is fixed-width, so the collision requirement reduces cleanly to SHA-512 collision resistance.

Two corollaries worth recording:

- **Repeating an entire transaction is safe.** Identical `(w, A, Z)` gives byte-identical nonces, challenge, responses and proof. Identical output is not a nonce-reuse condition — extraction needs two *different* challenges. This is the point packet §5 gets backwards (§5.2).
- **Version migration is always safe.** A `v1` and a `v2` proof over the same `(A, Z)` produce different nonces, hence different `T`, hence different `e`. Different nonces with different challenges is not an extraction pair. The signer may change version at any point in a key's lifetime without a rotation event.

---

## 2. The checklist, item by item

> **Numbering note before anything else.** The cover instruction says *"Section 6 of the packet lists ten items."* In the revised packet, the deliverable checklist is **§4 and it has twelve items**; §6 is the one-paragraph runtime note. Items 11 (failure behaviour) and 12 (the dead-RNG test problem) are precisely the two that §9 records as *added* by the 2026-08-17 adversarial rotation. **The cover instruction appears to reference the pre-revision packet, and answering "ten items in §6" would have silently dropped both.** I answer §4's twelve, then §6 separately.

### Item 1 — KDF and primitive

**HKDF-SHA-512** (RFC 5869), i.e. HMAC-SHA-512 in both Extract and Expand.

Why SHA-512 rather than the SHA-256 used elsewhere in mpt-crypto: an HKDF-Expand block is exactly 64 bytes, so **one block is one nonce** and one wide-reduction input. That collapses the entire expansion-and-mapping problem (items 8 and 9) into a single index with no counters, no sub-counters, and nothing to desynchronise. With SHA-256 you need two blocks per nonce and a concatenation rule, which is one more thing to get wrong for no benefit. Nonce derivation is prover-local (C-6 is correct on this narrow point), so there is no reason to match the challenge hash.

Why not RFC 6979's HMAC\_DRBG: its `bits2int`/`bits2octets` conversions and rejection loop exist to handle a message hash of arbitrary width against arbitrary curve order. We have neither problem, and its rejection loop reintroduces the desync hazard that item 9 is worried about.

Why not upstream's construction: §0, and §5.1.

### Item 2 — Randomness

**None. The construction consumes no randomness at any step.**

Enforced structurally, not by discipline: the nonce derivation function's signature **must not accept an RNG handle, a seed, an entropy parameter, or a `&mut impl RngCore`**, and must not read a global or thread-local RNG. There is no source, therefore no "source failed" branch, therefore no silent fallback path can exist (item 11). C-4 is satisfied trivially rather than by policy.

The witness elements `r` and `ρ` *are* random and are generated **outside this boundary**, by the encryption/commitment layer, before the prover is called. That is where the project's remaining RNG risk lives and no packet currently owns it (§5.7).

### Item 3 — Domain and version labelling

Exact bytes in §1.0 and §1.3. `LABEL_V1` carries the version and appears in **both** `IKM` (so it is inside the hashed input) and `INFO` (so it separates keystreams). `TAG` and `k` likewise appear in both, so a Send (`k=5`) and a ConvertBack (`k=3`) can never share a keystream even if every other input matched — C-2's cross-type collision concern is closed twice over.

**Migration rule.** Bump `v1 → v2` in `LABEL_V1` and `SALT_V1` on **any** change to: the KDF primitive; the `IKM` field layout or order; the witness encoding; the set of fields bound; or the scalar mapping. Both label positions must be bumped together. Old and new versions may coexist indefinitely and even interleave within one key's lifetime, per §1.4's second corollary. There is no migration ceremony, no re-keying, and no on-chain coordination, because validators never observe nonce derivation.

### Item 4 — Per-proof-type table

Table 1.3. Four rows: Send (5), ConvertBack (3), Clawback (1), Registration PoK (1). Convert excluded with reason. Witness order fixed and both known divergences resolved and flagged.

Registration's `A`/`Z` are **unresolved for want of information** — see §6.1. The rest of the row (tag, `k=1`, witness `sk`) is fixed.

### Item 5 — Canonical encoding of witness elements

`S32(·)`: **32 bytes, big-endian, fixed width, always.** Zero encodes as thirty-two `0x00` bytes. No minimal-length encoding, no leading-zero stripping, no `BN_bn2bin` (which strips), no sign byte.

This matters concretely: `m` may legitimately be zero (a zero-amount send) and `b` may legitimately be zero (a fully-spent balance). A variable-width encoding would make `(m=0, r=X)` and `(m=?, r=?)` pairs collide across the unframed boundary. The `LP(...)` wrapper around the concatenated witness makes total length explicit as a second guard.

### Item 6 — Canonical encoding of the statement

**Defined by reference, not restated:** the statement encoding is *exactly the byte string `A` that the prover feeds the Fiat–Shamir challenge hash*, per §1.1. Points are 33-byte SEC1 compressed, in the order given in §1.3, which follows the paper's Eq. (25) and Eq. (31).

The transaction context binds in as `Z`, appended after `A` under its own length prefix and **never merged into `A`**. Keeping them as two separately framed fields is deliberate: it makes "did you bind the context?" a structurally visible property of the `IKM` layout rather than a comment.

**Inherited dependency, stated because it is real.** This construction is exactly as unambiguous as the Fiat–Shamir transcript it mirrors. If that transcript has framing defects, they propagate here. The transcript has had real defects: TOB-RIPCTX-3 (two proof systems sharing a domain tag) and TOB-RIPCTX-15 (`TxSpecific` diverging from the specification for Convert and ConvertBack) are both transcript bugs found by audit. That is an argument for the mirror-the-bytes rule, not against it — if the transcript is ambiguous, at least the KDF is ambiguous in the identical way and cannot diverge from it. Fixing the transcript itself is out of scope for this ruling.

### Item 7 — Length framing

`be32` length prefix on every variable-length component of `IKM`; fixed width on every scalar and point; `be16(k)` for the nonce count. Every byte of `IKM` is therefore parseable back into its fields, which is the definition of injective framing.

Under future field addition: append the new field with its own `LP(...)` **and bump the version** (item 3). Appending without a bump would be safe in the narrow sense — a longer `IKM` cannot collide with a shorter one given the framing — but the version bump is mandatory anyway so that "which construction produced this proof" is answerable from the label alone.

### Item 8 — Expansion into `k` nonces

`HKDF-Expand-SHA-512(PRK, INFO, 64k)` yields exactly `k` blocks; block `i` is nonce `i`. No counter beyond HKDF's own single-byte block index, which is part of the standard and not a project-local invention. `k ≤ 5 ≪ 255`, so the block-count limit is never approached.

**Independence, stated precisely rather than loosely.** The `n_i` are not information-theoretically independent — all derive from one `PRK`. They are *computationally* indistinguishable from independent uniform values in `[0,q)` to any adversary without the witness, because HKDF-Expand is a PRF under `PRK` and `PRK` is unpredictable without `IKM`, which contains the long-term secret. That is the property special-soundness security actually needs, and the honest-verifier zero-knowledge argument of Theorem 4.3 requires nothing stronger.

### Item 9 — Mapping into the scalar field

**Wide reduction. 512-bit block interpreted big-endian, reduced mod `q`. No rejection sampling.**

Bias: for uniform `X ∈ [0, 2^512)`, the statistical distance of `X mod q` from uniform on `[0,q)` is at most `q / 2^512 < 2^-256`. Negligible against every other term in the security argument.

**Item 9's sub-question — "if sampling: exactly how the counter advances per rejected candidate" — is therefore vacuous under this construction, by design.** There is no rejection loop, so there is nothing to desynchronise. That is the main reason to prefer wide reduction over RFC 6979-style sampling here: it deletes a whole class of divergence between two implementations rather than specifying it very carefully.

**Zero result: `ABORT`, do not retry.** Three reasons. (i) `P[n_i = 0] ≈ 2^-256`; an occurrence is not a rare-but-legitimate event, it is evidence that the KDF, the reduction, or the memory holding it is broken, and continuing is wrong. (ii) Retry logic is a code path that will never execute in testing and is exactly where two implementations desynchronise. (iii) A zero nonce is *directly* witness-revealing: `z = 0 + e·w`, and `e` is public, so `w = z/e`. It is not a degenerate-but-harmless case.

Out-of-range cannot occur: reduction guarantees `n_i ∈ [0,q)`.

### Item 10 — Memory hygiene

Zeroise, in this order, before the derivation function returns and on **every** error path:

1. the `IKM` buffer (contains `sk_A` and the full witness in the clear),
2. `PRK` (64 bytes),
3. `OKM` (`64k` bytes),
4. the per-block `B_i` buffers,
5. the `n_i` scalars, after the responses `z_i = n_i + e·w_i` are computed — not before.

`A` and `Z` are public and need not be zeroised. The witness buffer owned by the caller is the caller's responsibility and must be zeroised at the same boundary the ElGamal secret is.

Requirements on the implementation, in whichever of paths A/B from §0 is taken:

- Use volatile-write zeroisation (`zeroize` crate in Rust; `OPENSSL_cleanse` in the C path). A plain `memset` is dead-store-eliminable and a `Drop` impl that assigns zeros is not sufficient.
- **Preallocate `IKM` with exact capacity.** A growing `Vec<u8>` reallocates and leaves witness bytes in freed heap that nothing will ever zero. This is the most likely zeroisation failure in a Rust FFI wrapper and it is invisible in review of the zeroing code itself, because the zeroing code is correct — it is the copies that are the problem.
- No `Debug`, `Display`, `format!`, `hex::encode`, or `tracing` field capture on any type holding the witness or the nonces. Wrap in `secrecy::Secret` or an equivalent with a redacting `Debug`.
- If path A (vendored C) is taken: **audit `proof_compact_standard.c` for `OPENSSL_cleanse` coverage of the new compact-proof intermediates.** TOB Appendix B records that upstream already misses `s_m, s_r1, s_r2, term` in `proof_same_plaintext.c`, so the library's cleanse discipline is known to be incomplete and the compact prover is newer code than the audit.
- Process-level protections (no core dumps, `mlock`/`madvise(MADV_DONTDUMP)`, no swap) are real but belong to §(a)'s daemon hardening, not here.

### Item 11 — Failure behaviour

Every step returns a typed error; no step has a fallback.

| Condition | Behaviour |
|---|---|
| `n_i == 0` | `ABORT(ERR_NONCE_ZERO)`. No retry, no counter increment. |
| HMAC/HKDF returns non-success | `ABORT(ERR_KDF_FAILED)`. (Non-hypothetical: TOB-RIPCTX-2 found the library ignoring SHA-256 return values across eight files.) |
| `A` or `Z` empty, or `Z` not 32 bytes | `ABORT(ERR_TRANSCRIPT_MALFORMED)` — a missing context is the exact failure this construction exists to prevent, so it must be an error and never a permitted absence. Contrast TOB Appendix B, where `context_id == NULL` is silently accepted and omitted from the hash. |
| Witness element ≥ `q`, or `sk` element == 0 | `ABORT(ERR_WITNESS_INVALID)` before any derivation. |
| Any allocation failure | `ABORT`. |

**Silent fallback is impossible by construction, not by policy**, because there is no alternative nonce source to fall back to: no RNG parameter, no cached nonces, no "if the KDF fails use `RAND_bytes`" branch. Any such branch would be visible as a change to the function signature or to its dependency list, which is a reviewable and CI-checkable property (§4, T-9).

The daemon surfaces all of these as a single opaque failure to the localhost client. It must not return distinguishing error text over the HTTP interface — an oracle that reveals *which* witness element was invalid is a small leak the value-shaped interface should not offer.

### Item 12 — A test plan that can actually fail

Full plan in §4. The item's specific concern — that *"distinct statements yield distinct nonces"* passes even with a completely dead RNG — **does not arise here, because there is no RNG.** But the underlying worry generalises to "which of these tests can actually fail," so I have graded the plan on exactly that axis and included T-9, a test that fails if anyone ever reintroduces a randomness dependency, and T-6, a test oracle that is itself tested against a deliberately broken prover.

### §6 — Runtime (the packet asked, so I answer)

**The localhost-daemon assumption is load-bearing and I am relying on it.** It is what removes differential fault attack from the threat model, which is the only surviving argument for hedging (§0 point 4). Concretely, revisit this ruling if any of the following becomes true:

- proving moves to a hardware signer, smartcard, HSM, or secure element;
- proving runs on a shared or multi-tenant host, or inside a VM whose hypervisor is not under the holder's control;
- the signer is asked to prove on behalf of more than one holder in one process.

None of those changes the *construction*; they change whether a hedged variant becomes preferable. That is what the `v1` label is for.

---

## 3. Failure analysis

### 3.1 What breaks it

| Break | Effect | Guard |
|---|---|---|
| `Z` (`TransactionContextID`) omitted from `IKM` | **Total, silent `sk_A` recovery** from any two proofs sharing a statement across a version or sequence bump | §1.1 MUST; T-2 |
| `A` rebuilt independently for the KDF instead of reusing the challenge buffer | Divergence between the two encodings; reuse becomes possible whenever the two disagree | §1.1 MUST; T-3 |
| Variable-width witness encoding | Collision across the `m=0` / `b=0` cases | `S32`; T-4 |
| Rejection sampling reintroduced | Two implementations desynchronise; KATs diverge | Wide reduction; T-1 |
| Retry-on-zero | Same, plus masks a broken KDF | Abort; T-7 |
| SHA-512 collision | Lemma 1.1 fails | Out of scope |
| Fault injection during response computation | Witness extraction from two faulted runs | Out of threat model per §(a); revisit per §6 |

### 3.2 What a weak or absent RNG does to it

**To the nonces: nothing.** There is no RNG in the derivation.

**To the system: it is still catastrophic, and this is the point packet §5 misses in both directions.** `r` and `ρ` are witness elements drawn from the host RNG before the prover is called. A dead or predictable RNG means:

- **Repeated `r` across two Sends:** `C1 = rG` repeats and `C2,i − C2,i′ = (m − m′)G`, leaking the difference of two confidential amounts to any observer, with the difference recoverable by brute force over the same 10⁶ range the library already searches.
- **Predictable `r`:** every ciphertext under it is decryptable by anyone, since `C2 − r·pk = mG`.
- **Repeated `r` in Convert/ConvertBack:** worse, because `r` is *disclosed on-chain* in `BlindingFactor`. An attacker who learns one disclosed `r` learns nothing extra, but a signer that reuses a value it discloses in one transaction and hides in another hands over the hidden one directly.
- **Repeated `ρ`:** `PC_b` becomes linkable across transactions.

So the honest summary of the RNG question is: **the RNG is a single point of catastrophic failure regardless of which nonce construction you choose, and hedging places a second dependency on it without removing the first.** Under determinism the RNG's failure at least remains confined to the confidentiality layer and does not additionally hand over `sk_A`. That is a point *for* determinism that the packet's §5 does not contain.

**On the packet's unanswered VM-snapshot-rollback question (§5, final paragraph).** It is answerable and the answer is asymmetric in an instructive way:

- *Nonces, deterministic:* rollback replays `(w, A, Z)`. If the transaction is identical, the proof is byte-identical — harmless. If the transaction differs, `A` or `Z` differs, so nonces differ. **Safe either way.**
- *Nonces, hedged:* rollback replays the RNG state, so the salt replays, so a hedged construction degrades to its deterministic core. **Identical outcome. Hedging provides zero rollback protection.** This independently confirms that §9's defect 3 was correctly struck, and goes further than the packet did.
- *`r` and `ρ`:* rollback replays them, and if the post-rollback transaction differs, you get the repeated-`r` disaster above. **This is unsafe under both constructions and is the real rollback exposure.**

Recommendation: treat VM rollback as an RNG-state problem, not a nonce problem. Mitigation belongs with whoever owns `r` generation (§6.2), and the standard answer — reseed from `getrandom` per operation rather than from a long-lived userspace CSPRNG state, and use `MADV_WIPEONFORK` — is theirs to specify.

### 3.3 What an implementer is most likely to get wrong

Ranked by probability × silence:

1. **Rebuilding `A` for the KDF.** It looks like refactoring hygiene ("the KDF shouldn't depend on the transcript builder"). It is the bug. Silent.
2. **Omitting `Z`.** Especially likely because the paper's Remark 6.1 says "statement," and the paper's "statement" excludes it. An implementer following the paper faithfully writes the bug. Silent.
3. **`Vec<u8>` reallocation leaving witness copies on the heap.** Zeroisation code reviews as correct. Silent.
4. **ConvertBack witness transposition** — `(b, ρ, sk_A)` vs the paper's `(b, sk_A, ρ)`. Produces `z_ρ` where `z_sk` belongs. **Loud** — proofs fail verification — so lower risk, but it will cost a debugging day if nobody reads Table 1.3.
5. **Reducing a 32-byte block instead of 64.** Introduces a `2^-128`-ish bias that no test will catch, and tempts the implementer into rejection sampling to "fix" it. Silent.
6. **Hex-encoding the witness into a log line** during development and not removing it. Silent until someone reads the logs.
7. **Assuming the FFI boundary is where zeroisation happens**, when the C side owns the buffers. ADR §(a) line 86 already assigns this to "the Rust FFI wrapper," which is the wrong side if path A is chosen.

---

## 4. Test plan

Graded on the axis item 12 cares about: *what has to be true for this test to fail?* A test that cannot fail is listed and marked as such.

| # | Test | Fails when | Grade |
|---|---|---|---|
| **T-1** | **KAT.** Fixed `(w, A, Z)` per proof type → assert exact hex of all `k` nonces **and** the full proof bytes. | Any change to primitive, framing, encoding, order, or reduction. Two implementations diverging by one byte. | **Decisive.** Only possible because the construction is deterministic. Blocked on §6.1. |
| **T-2** | **Context-binding test.** Hold `w` and `A` fixed; vary `Z` across N values. Assert all `k·N` nonces pairwise distinct. | The `Z`-omission bug (§3.3 #2) — i.e. it fails against a literal implementation of the paper's Remark 6.1. | **Decisive.** This is the test that catches the finding in §0.1. |
| **T-3** | **Byte-sweep over `A`.** For each byte offset in `A`, flip one bit, re-derive, assert the nonce vector changes. Same for `Z` and for the witness buffer. | Any statement field silently absent from `IKM`. Generic — catches omissions nobody thought to name. | **Decisive.** |
| **T-4** | **Zero-scalar encoding.** Prove with `m=0`; prove with `b=0`; prove with `m=0,b=0`. Assert distinct nonces and valid proofs. | Minimal-length witness encoding. | Strong. |
| **T-5** | **Cross-type separation.** Same key, contrived identical `A`/`Z`, all four proof types. Assert no nonce value appears in two types. | `TAG` or `k` dropped from `INFO`/`IKM`. | Strong. |
| **T-6** | **Extraction harness, dual-armed.** Implement Theorem 4.2's extractor. (a) Run against ~10⁴ proof pairs from the real signer → assert it recovers nothing. (b) Run against a `#[cfg(test)]` prover deliberately hardcoding a fixed nonce vector → **assert it recovers `sk_A` exactly.** | (a) any reuse path at all. (b) a broken or vacuous harness. | **Decisive, and self-validating.** Arm (b) is what makes arm (a) meaningful; without it, arm (a) passes trivially against a no-op extractor. |
| **T-7** | **Zero-nonce path.** Feature-gated hook forcing one `OKM` block to all-zero. Assert `ERR_NONCE_ZERO`, assert no proof emitted, assert no retry occurred. | A retry loop was added, or the check was omitted. | Strong. The only way to exercise a `2^-256` branch. |
| **T-8** | **Determinism.** Same input twice → byte-identical proof, in-process and across a restart. | Any hidden state or entropy. | Strong. |
| **T-9** | **No-randomness enforcement.** Run proving under a syscall filter (`seccomp` on Linux, `sandbox-exec`/DTrace on macOS) that aborts on `getrandom`/`getentropy`/`RDRAND`. Assert zero calls during proof generation. Pair with a compile-time assertion that the derivation signature contains no RNG type. | Anyone reintroduces a randomness dependency, at any depth, including inside vendored C. | **Decisive.** This is the direct answer to item 12: it is the test a hedged construction cannot have. |
| **T-10** | **Cross-implementation.** Independent second implementation (different language, written from §1 alone, not from the first implementation's source) → assert T-1 vectors match. | Any residual ambiguity in this document. | **Decisive**, and the only real test of whether §1 is byte-exact. |
| **T-11** | **Vendored-fork integrity** (path A only). CI asserts `git diff upstream/85dbac7` touches exactly the two expected files. | Fork drift. | Strong. |
| **T-12** | **Zeroisation.** Post-proof heap scan for witness byte patterns; Valgrind/ASan for the C path. | Reallocation copies, missed cleanse. | **Weak — say so.** Best-effort; a pass proves little, a failure proves a bug. Do not report it as coverage. |
| **T-13** | "Distinct statements yield distinct nonces." | — | **Cannot fail. Listed only to be struck.** It is implied by T-3 and subsumed by T-2, and it is the exact test item 12 warns about. Do not count it. |

**On-ledger acceptance is not a nonce test.** Every proof this construction produces verifies, including ones with catastrophically reused nonces. No devnet transaction, no integration suite, and no observer harness can distinguish a correct signer from a broken one. T-1, T-2, T-3, T-6 and T-9 are the entire safety net.

---

## 5. What is wrong with, missing from, or steering in the packet

### 5.1 The sixth defect: C-6 asserts a design freedom the architecture does not provide, and §8's attachment list conceals it

§9 defect 1 struck a sentence that manufactured *compatibility pressure* toward upstream. The fix was to install **C-6**, which reads: *"You are free to specify something entirely unlike any existing implementation."* Emphasised again at the end of §3: *"There is no compatibility argument here."*

**That over-corrects into a second false claim.** ADR §(a) lines 86–87 establish that the signer is a Rust FFI wrapper around mpt-crypto; packet Appendix A establishes that mpt-crypto exposes **no** entry point permitting a caller to influence the nonce. A reviewer given exactly what §8 says to attach — *this packet, ADR-0001 §(e), and the paper* — sees C-6's grant of freedom and Appendix A's confirmation that no injection point exists, but **not** the fact that makes those two collide, because it lives in §(a) and §(a) was not attached.

The result is a packet that asks for a construction it cannot install, and asks a reviewer who cannot see the constraint. This is the same species as defect 1 — architecture-derived pressure smuggled into the framing — with the sign flipped, which is what makes it easy to miss: the reviewer's instinct after reading §9 is to be alert for pressure *toward* upstream, not for unearned freedom *from* it.

**Fix:** restate C-6 accurately — *nonce derivation is prover-local and imposes no protocol-level compatibility constraint; it is nevertheless constrained by the FFI surface, and adopting a different construction requires a decision on §0's paths A/B/C* — and add ADR §(a)'s process/interface subsection to §8's attachment list.

### 5.2 §5's remaining pro-hedging bullet is false in both halves, and §9 struck only the anti-hedging one

§5 currently claims hedging *"survives a witness-encoding collision, or a caller bug that reuses `(witness, statement)`, which a purely deterministic construction does not."* Both halves fail:

- **A caller bug reusing `(witness, statement)` is not a hazard.** Identical statement → identical challenge → byte-identical proof. Extraction needs two *distinct* challenges. The stated hazard is the one benign case (§1.4, first corollary). The genuinely dangerous case — same witness, *different* statement — is handled by a deterministic construction **by construction**, and by a hedged one only by luck of the RNG.
- **A witness-encoding collision is not a hazard either**, provided the statement is bound: distinct witnesses produce distinct commitments (Pedersen binding), hence a distinct statement, hence distinct nonces.

This matters because of what §9 did. Defect 3 struck §5's *anti*-hedging claim as probably false and recorded the reasoning. Nothing struck the *pro*-hedging claim, which is also false. **The net effect of the §9 revision was to remove one thumb from the anti-hedging side of a scale that still has a broken weight on the pro-hedging side** — so the packet, after its own adversarial review, steers harder toward hedging than the draft that was found to be steering. And hedging is what upstream does. Together with 5.1, the residual steering after §9 is one-directional and unrecorded.

**Fix:** strike the bullet with reasoning shown, as §5 did for defect 3. §5's remaining content then supports determinism unanimously, and the section's claim that "the project has no position" becomes true in a way it currently is not.

### 5.3 Appendix A miscites the Trail of Bits report, and lends upstream audit authority it does not have

Appendix A: *"The 16-byte length-prefix preamble answers **TOB-RIPCTX-10**, which upstream documents as a brittle-API concern rather than a live exploit."*

Checked against the attached report: **TOB-RIPCTX-10 is "Missing range proof enables confidential balance overdraft," severity High**, described as *the most pressing finding*, with the recommendation that the two affected transaction types *must not be enabled* until it is closed. It has nothing to do with length prefixes and it was not a brittle-API concern. The finding the sentence *describes* is TOB-RIPCTX-17 (missing input length validation, Low) or Appendix D's "Implicit Length Assumptions."

Additionally, packet §8 writes the ID as **`TOB-RIPCTXR-10`**, with an extra `R`, which matches no finding in the report. Two spellings, neither pointing at the right thing.

Two consequences. First, a non-normative appendix is citing a named third-party audit as validation of the incumbent construction's framing choice — which is the manufactured-authority pattern defect 1 was about, in a section that §9 explicitly repositioned to stop steering. Second, and more seriously for the project rather than for this review: **if the packet's author believes TOB-RIPCTX-10 is a brittle-API concern, the highest-severity finding in this audit is mis-recorded somewhere in the project's risk register.** Worth checking CLAIMS.md independently of this ruling.

### 5.4 C-1's ConvertBack witness order contradicts the paper

Packet C-1: `(b, ρ, sk_A)`. Paper §8.3: `w = (b, sk_A, ρ)`. Proof serialisation: `(e, z_b, z_ρ, z_sk)`. Three orderings, two of which disagree. The packet cites the paper as its source for C-1 without noting the divergence. I resolved it (Table 1.3) but a reviewer who took C-1 as authoritative and then implemented from the paper would transpose. Add the divergence note to C-1.

### 5.5 §1 overstates the blast radius in one direction and may understate it in another

§1: *"Nonce reuse leaks the signing key outright."* Extraction yields **`sk_A`, the ElGamal secret** — not the XRPL account signing key. The distinction matters: `sk_A` gives an attacker retroactive decryption of the holder's entire confidential history and the ability to forge that holder's confidential proofs; it does **not** by itself give spending authority over the XRPL account. §2 gets this right ("the sender's ElGamal secret key"); §1 does not.

The direction this could bite is the interaction with §(e)'s *other* half. If §(e)'s proposal — derive the ElGamal key deterministically from the XRPL master seed — is adopted, then the relationship is one-way (seed → `sk_A`, not `sk_A` → seed) and §1's phrasing remains wrong. But that is a property of the derivation that has not been ruled on yet, and §1's phrasing quietly assumes an answer to the question §7 says is out of scope. Tighten §1 to match §2.

### 5.6 Missing: the only real argument for hedging is absent

Differential fault attack is the standard, well-documented reason to prefer hedged over deterministic signatures, and it appears nowhere in §5. Its absence is *why* §5's pro-hedging case is weak — the packet argued for hedging using two claims that are false while omitting the one that is true. I have disposed of DFA in §0 point 4 on threat-model grounds and made it the explicit revisit trigger in §6, but §5 should record it so that a future reviewer re-opening this decision starts from the right argument.

### 5.7 Missing: nobody owns `r` and `ρ`

§7 defers ElGamal keygen to its own packet. Nothing defers, or claims, the question of **where the ElGamal encryption randomness `r` and the Pedersen blinding `ρ` come from, and what the signer does when that source fails.** §3.2 shows that is now the project's largest remaining randomness exposure and that it is unchanged by whatever this ruling decides. It should be a third packet, and it should be scheduled ahead of the keygen one, since Convert — the first irreversible transaction a holder makes, per ADR §(e) line 197 — discloses `r` on-chain.

### 5.8 Minor: §8 excludes CLAIMS.md and then imports it anyway

§8 says *"Do not attach `CLAIMS.md` — it carries our grades and our framing,"* and the packet then cites E-33, E-34, E-35, E-48, E-55, U-30, and quotes a grade ("graded C") in Appendix A. The framing arrives regardless, just unauditable — the reviewer sees the conclusions without the evidence. Either attach it or paraphrase the underlying facts without the identifiers.

---

## 6. What I could not settle, and why

### 6.1 Blocking for T-1 KAT vectors (not for the construction)

The construction in §1 is complete and implementable. **The known-answer vectors are not producible from what I was given**, because they require the exact bytes of `A` and `Z` as the signer will emit them:

1. **The Fiat–Shamir pre-image as implemented, per proof type**, split at the first commitment element — i.e. the source of `proof_compact_standard.c` (and its Clawback/ConvertBack siblings) at the pinned mpt-crypto commit, or the equivalent Rust transcript builder. The paper's Eq. (25) and Eq. (31) give the field order but not the serialisation.
2. **The registration PoK's transcript.** `CMPT_POK_SK_REGISTER` is listed in C-2 and `proof_pok_sk.c` appears in the audit's target lists, so it is real, but neither the packet nor the paper says what it binds. **If it binds only `P`, note that its proof is replayable by anyone who has seen it** — a protocol issue that nonce derivation cannot fix, but which should be checked before registration is treated as a solved case.
3. **The definition of `statement_hash(32)` in upstream's `generate_deterministic_nonces`.** This is not idle curiosity. **If that hash excludes `TransactionContextID`, upstream's construction has the §0.1 flaw and is protected only by its random salt** — which would make it a finding worth reporting to XRPLF, and would make "keep upstream's hedged construction" (path C, or path A abandoned) materially more dangerous than it currently looks. If it includes the context, upstream is sound on that axis and only the hedging is at issue. I cannot tell from Appendix A's summary, and it changes the severity of the fallback option.
4. **Which rippled commit defines the post-TOB-RIPCTX-15 `getXxxContextHash` functions.** The audit records those as Resolved, so the pre-fix layouts in the report's Figures 15.1/15.2 are stale; KAT vectors must be built against the fixed ones.

I have not guessed at any of these. Items 1, 2 and 4 are mechanical to obtain. Item 3 is the one worth reading source for before anything else.

### 6.2 Deliberately not settled

- **`r` / `ρ` generation and RNG failure policy** — §5.7. Adjacent, larger than this ruling, and unowned.
- **Path A vs B in §0** — an engineering and maintenance-cost decision, not a cryptographic one. I have stated the criteria and recommended A; the choice is the project's.
- **The Clawback transcript's `PT(m·G)` for `m = 0`.** `0·G` is the point at infinity, which libsecp256k1 cannot serialise — the same defect class as TOB-RIPCTX-5 and TOB-RIPCTX-6. A zero-amount clawback would therefore fail to build a transcript at all. That is a bug in the proof system, not in nonce derivation, but it makes `A_claw` undefined for one input and should be raised separately.

---

## 7. Recommended disposition of ADR-0001 §(e)

- Replace lines 175–191 with a pointer to this document. Do not paraphrase §1 into the ADR; a second copy of a byte-exact specification is a divergence waiting to happen.
- Line 183's *"deterministic synthetic nonces... RFC 6979 in spirit"* becomes accurate for the first time under this ruling, but line 180's formula must go rather than be annotated — it is the one that omits the context.
- Line 187's testability sentence is superseded by §4, and REVIEW-003b's objection to it is upheld: a KAT that does not assert exact derived values is not a KAT. Under this construction there is no entropy input to fix, so the objection resolves rather than being answered.
- **REVIEW-003b's CRITICAL finding is answered by this document.** ADR-0001 stays `Proposed` — §(e)'s keygen half (packet §7) and §(a)'s MEDIUM boundary finding are both still open, and §5.7 argues a third packet should exist before the keygen one.
- **`No signer code before that exists` (line 195) can be lifted for nonce derivation specifically**, conditional on the §0 path decision. It cannot be lifted for the prover as a whole until §6.1 items 1–2 are resolved.
