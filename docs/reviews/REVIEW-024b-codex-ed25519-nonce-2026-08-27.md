# REVIEW-024b — Codex leg on `CLAIMS.md` B-16, the ed25519 signing nonce

**Date:** 2026-08-27. `codex exec --sandbox read-only --skip-git-repo-check`, run from an
empty non-repository directory with the complete packet inline and instructed to use no
tools. Verbatim below.

---

**Ruling: adopt Option B.** The issue #1 reasoning extends to Ed25519: its nonce protects the same XRPL account key and therefore the derived confidentiality key. I recommend a narrowly scoped hedge that changes only Ed25519’s secret nonce prefix, leaves the secret scalar and verification equation untouched, and uses `ed25519-dalek`’s `raw_sign` for all group arithmetic and encoding. Entropy is a hedge over RFC 8032, so a reported entropy failure must degrade to byte-identical RFC 8032; an all-zero but successful draw remains a hedged input. This is a project-specific construction, not something supplied or vetted by the crate, so B-16 remains open until implementation, targeted tests, independent review, and an actual Ed25519 Devnet transaction have all succeeded.

1. **Does issue #1 extend?**

Yes. I agree with B-14’s split:

- The threat-model extension is a technical conclusion. Ed25519 has the same relevant shape: a nonce derived deterministically from long-lived secret material protects the account key, and this project welds that key to historical confidentiality.
- Whether the incremental mitigation justifies enabling `hazmat` and maintaining a nonstandard nonce derivation is a judgement call.

Nothing specific to Ed25519 defeats the extension. If anything, Ed25519 makes nonce failure sharper: two signatures with the same `r` but different challenges disclose the secret scalar directly.

That does not mean ordinary RFC 8032 is defective. It means the previously ruled fault-injection concern reaches this site too.

2. **Does randomising Ed25519 require hand-rolling the scheme?**

B-14’s statement was too broad, although its caution was justified.

From the quoted crate source:

- There is no `SigningKey::sign_with_rng`.
- `raw_sign_byupdate`, which could directly alter the nonce transcript, is `pub(crate)` and unavailable to this project.
- Enabling `hazmat` exposes `ExpandedSecretKey`, including its `scalar` and `hash_prefix`, and exposes `raw_sign`.
- `raw_sign` still performs nonce reduction, base-point multiplication, challenge hashing, scalar arithmetic, and signature encoding.

Therefore the project need not hand-roll the Ed25519 equation or curve arithmetic. It can derive the standard expanded key, vary only `hash_prefix`, and call the crate’s existing `raw_sign::<Sha512>`.

What remains hand-specified is the nonce-prefix combiner. The crate provides the mechanism, not a vetted randomized-Ed25519 construction. Enabling `hazmat` also makes misuse possible in project code, so the original “rolling one is worse than the gap” concern remains substantial but is not an absolute technical barrier.

The signature equation remains:

\[
S = r + H(R \parallel A \parallel M)a \pmod L
\]

Only the derivation of `r` changes.

3. **Recommended construction**

This construction is my reasoning, not one stated by the crate or RFC 8032.

Let:

- `sk` be the existing 32-byte Ed25519 signing-key seed. Do not change XRPL key derivation.
- `H = SHA-512`.
- `H(sk) = h[0..64]`.
- `a` be derived from `h[0..32]` using exactly RFC 8032’s clamping and scalar conversion.
- `p = h[32..64]`, the standard 32-byte secret nonce prefix.
- `A = encode([a]B)`, exactly as today.
- `M` be the complete XRPL signing message, directly—not a prehash and not Ed25519ph.
- `aux` be exactly 32 bytes from the project’s CSPRNG.
- `DST` be the exact ASCII bytes `WCONF/ed25519-nonce-hedge/v1` followed by one `0x00` byte.

Select the effective prefix `q` as follows:

| Mode | Effective prefix |
|---|---|
| Deterministic vector arm | `q = p` |
| Reported entropy failure | `q = p` |
| Successful entropy draw | `mask = H(DST ‖ aux)[0..32]`; `q[i] = p[i] XOR mask[i]` |

Then perform ordinary pure Ed25519 signing with `q` substituted for the standard prefix:

1. `r = reduce_L(H(q ‖ M))`, using RFC 8032’s interpretation and reduction.
2. `R = encode([r]B)`.
3. `k = reduce_L(H(R ‖ A ‖ M))`.
4. `S = (r + k·a) mod L`.
5. Emit `R ‖ encode_scalar(S)` as the normal 64-byte Ed25519 signature.

The following must not vary:

- `a`, its clamping, or its relationship to `A`;
- the base point, group order, point encoding, or scalar encoding;
- the challenge transcript `R ‖ A ‖ M`;
- the message bytes or pure-Ed25519 mode;
- the public key supplied to `raw_sign`.

No auxiliary bytes are placed on the wire.

A successful draw of 32 zero bytes is not omission: it produces `p XOR H(DST ‖ 0³²)[0..32]`. Only an absent auxiliary input—either the deliberate vector arm or a reported entropy error—recovers RFC 8032.

Implementation should create the standard `ExpandedSecretKey`, replace only its `hash_prefix` when `aux` is present, and invoke the same `raw_sign::<Sha512>` in both modes.

4. **Scope of the crate warning**

Yes. The warning is broader than “every modification of `hash_prefix` leaks the key.” It is an API-level warning that the caller is now responsible for several catastrophic invariants.

The linked write-up is not quoted in the packet, so the following is reasoning from the Ed25519 equation and the exposed API. Key recovery requires `r` to be known, or the same `r` to occur in signatures having different challenges.

For nonce reuse:

\[
S_1=r+k_1a,\qquad S_2=r+k_2a
\]

so:

\[
a=(S_1-S_2)(k_1-k_2)^{-1}\pmod L.
\]

One unsafe-library attack obtains this by signing the same message with the same expanded secret but different caller-supplied public keys. `r` is unchanged because its standard derivation omits `A`, while `k=H(R‖A‖M)` changes. Another catastrophic construction makes the prefix public or predictable; then the attacker computes `r` and recovers `a` from one signature.

Changing only the prefix while preserving the scalar and binding `A` to that scalar is not inherently inside either attack. The proposed XOR also preserves the secrecy contributed by `p`; it does not replace `p` with public auxiliary data.

However, merely using fresh prefixes does not make `raw_sign` safe to expose generally. The implementation must never accept `A` from a caller. If entropy repeats or falls back, a public-key-substitution interface could still recreate the same-`r` attack.

Other failure modes include:

- replacing `p` with `H(aux)` rather than combining it with `p`, making the nonce knowable when `aux` is known;
- changing `a` without deriving the corresponding `A`;
- reusing a prefix across improperly derived related keys or protocols;
- inconsistent `M` between nonce and challenge hashing;
- malformed framing or accidental mode collisions;
- retaining expanded secret material because zeroization is not enabled;
- arbitrary computation faults that bypass the combiner entirely.

5. **Entropy failure**

Ed25519 is a fifth row with the same failure *shape* as the sigma and ECDSA hedge rows, but its own construction:

| Site | Deterministic source | Entropy role | On reported failure |
|---|---|---|---|
| Ed25519 transaction `r` | RFC 8032 `H(prefix ‖ M)` | Prefix mask over that safe deterministic core | Omit the mask and sign using exact RFC 8032 |

It must degrade, not refuse. Entropy is not the nonce’s sole source as it is for `r`/`ρ`; RFC 8032 remains the established floor. Refusal would turn a recoverable entropy outage into a signing outage without avoiding a broken baseline.

For the proposed construction:

- A repeated or constant successful `aux` gives a fixed `q`. Different messages are still hashed as `H(q ‖ M)`, so they do not systematically reuse `r`.
- An all-zero successful `aux` likewise gives a fixed, secret-derived construction distinct from RFC 8032.
- A reported failure uses `q=p`; different messages retain RFC 8032’s message separation.
- Re-signing the same message with the same `q` repeats `r`, but also repeats the challenge and signature. That does not provide two independent equations.
- Switching between successful and fallback modes does not create a designed collision.

A dangerous repeat across different messages remains mathematically possible through a SHA-512/reduction collision and possible through an implementation or injected-computation fault. There is no ordinary constant-RNG or repeated-RNG path to it. No hedge protects against an adversary who can directly overwrite `q`, `r`, or the message seen by one hashing phase.

6. **Cost and vector pinning**

The default Ed25519 signature will no longer match `ripple-keypairs` byte for byte.

A proper deterministic arm is available and can be exact RFC 8032—not merely deterministic:

- Both arms expand the same key and invoke the same `raw_sign::<Sha512>`.
- The sole varied input is `ExpandedSecretKey.hash_prefix`.
- `None` uses the unmodified RFC prefix and must remain byte-identical to `ripple-keypairs`.
- `Some([0; 32])` is a hedged, deterministic test case and must not match the `None` arm.

Other costs are:

- enabling the crate’s `hazmat` feature;
- enabling `zeroize` or otherwise explicitly wiping expanded secrets;
- one SHA-512 and one 32-byte CSPRNG draw per signature;
- loss of reproducible default signatures;
- more review and maintenance around a project-specific construction;
- a Devnet acceptance gate.

The existing `one_implementation_not_two` behavioral test is insufficient to prove code-path identity. Two independently written, correct signers could both emit canonical signatures that verify under the same key and pass that test. The single-path requirement must primarily be enforced by code structure: one private signing helper accepting `Option<[u8; 32]>`, with both production and vector entry points calling it.

7. **Wire validity**

Reasoning establishes that the construction produces an ordinary Ed25519 equation:

- `R=[r]B` is generated by the crate from the standard base point and is in the prime-order subgroup.
- `R` uses the crate’s compressed Edwards encoding.
- `S` is produced from a scalar modulo `L`, so its encoding is canonical.
- The public key and challenge remain standard.
- A verifier cannot recompute or enforce the secret nonce derivation.

That is enough to predict local verification. It is not enough, under this project’s evidentiary rule, to claim acceptance by XRP Ledger validators.

An actual network execution remains necessary because a validator may impose implementation-specific canonicality, decoding, cofactor, or batch-verification rules not captured by the local verifier. I see no Ed25519-specific reason that the crate’s honestly generated `R` or `S` should fail those rules, but that is a reason to expect success, not evidence that it occurred.

The run must use an `sEd…` account, decode the submitted `SigningPubKey` and confirm its `0xED` prefix, submit a signature produced by the hedged default path, and reach validated `tesSUCCESS`.

8. **Strongest case against Option B**

The strongest objection is that this exchanges a standard, simple, deterministic construction for a project-specific nonce combiner exposed through an API whose own documentation warns of full private-key recovery.

Enabling `hazmat` removes a compile-time guardrail from this project’s code. It exposes a type whose scalar, prefix, and public-key relationship must be maintained exactly. A future refactor could replace a secret prefix with public randomness, supply the wrong public key, alter the scalar, or create a nonce collision. Those mistakes are far more severe than the residual concern in ordinary RFC 8032.

The proposed combiner is reasoned rather than standardized or supplied by `ed25519-dalek`. Its benefit is also narrow. The losing issue #1 argument remains strong: a same-host adversary with enough control to inject faults into signing may be able to read the signing key directly from process memory, making nonce hedging irrelevant. Pure RFC 8032 avoids dependence on runtime entropy, retains independent byte-for-byte vectors on the live path, and has substantially less maintenance surface. Option C—requiring secp256k1 accounts—would avoid new signature-scheme code entirely.

I nevertheless recommend Option B because the project has already ruled that fault injection matters despite the memory-read objection; the account and confidentiality consequences are welded together; and this is the one transaction-signing arm its current accounts actually exercise. The construction can be kept narrow: preserve `a` and `A`, vary only the secret prefix, use the crate for the complete signature equation, and do not expose the raw hazmat inputs outside one module.

9. **Execution gates before claiming “the Ed25519 nonce is hedged”**

B-16 must remain open until all of these have executed successfully:

1. **Deterministic external vector:** `aux=None` is byte-identical to the existing `ripple-keypairs` Ed25519 vector.

2. **Controlled auxiliary-input tests:** a test-only input permits fixed `aux` values. Two distinct fixed values must produce distinct `R` values and signatures that verify under the same key and message.

3. **Zero-versus-absence test:** `Some([0; 32])` must differ from `None`. This pins the same distinction B-14 previously got wrong.

4. **Failure injection:** a reported entropy failure must sign successfully and produce exactly the deterministic RFC 8032 vector.

5. **Constant-entropy cases:** the same fixed `aux` and same message must reproduce exactly; the same fixed `aux` over selected different messages must produce different `R` values. This does not prove collision resistance, but it pins message inclusion and avoids a stateful-only hedge.

6. **Invariant tests:** both modes retain the identical public key, produce canonical 64-byte signatures, and pass a strict Ed25519 verifier. The implementation must internally derive the verifying key from the same `SigningKey`; no caller-supplied verifying key is permitted.

7. **Release-path check:** the production `sign_message` path must be shown to request `aux`, while the deterministic/fixed-aux interfaces are unavailable in an ordinary release build.

8. **Feature and secret-lifecycle check:** `hazmat` and `zeroize` configuration must be inspected in the resolved build, and expanded secret values must not be logged or returned.

9. **Devnet execution:** an actual confidential transaction signed through the default Ed25519 path must be submitted using an `sEd…` account, its `SigningPubKey` decoded as Ed25519, and the transaction observed as validated with `tesSUCCESS`.

A probabilistic “sixteen signatures differ” test alone is insufficient: time, counters, unintended mutable state, or another source of nondeterminism could pass it without implementing the ruled construction.

The controlled tests establish the nonce source; the network run establishes wire acceptance. Until both exist, the accurate statement is “hedged Ed25519 has been ruled for adoption,” not “the signer hedges Ed25519.”

10. **Confidence**

**8/10.**

The judgement call is whether the narrow fault-resistance benefit justifies enabling `hazmat` and maintaining a project-specific nonce-prefix combiner, rather than accepting deterministic RFC 8032 as a named gap or requiring secp256k1 accounts. The equation, exact fallback, and same-implementation vector arm are relatively clear; the benefit-versus-new-cryptographic-surface decision is where a reasonable reviewer could rule the other way.

## Additional defects found

- **`one_implementation_not_two` does not establish its named property.** It checks semantic compatibility, not implementation identity. A separate correct signer would pass. Retain the behavioral assertions under a truthful name, and enforce the single implementation through one private helper receiving the auxiliary input.

- **The deterministic arm is not actually test-only.** `Hedge::DeterministicForVectors` and `sign_message_with` are public in ordinary builds. Documentation saying “for vectors only” is not enforcement. Keep the production helper private and expose deterministic/fixed-aux entry points only under `test-support`.

- **The current feature set does not enable the quoted zeroization behavior.** `ed25519-dalek` is built with `default-features = false` and only `std`; the quoted `Drop` implementation for `ExpandedSecretKey` exists only under `feature = "zeroize"`. If the project relies on automatic overwriting, the manifest currently does not provide it.
