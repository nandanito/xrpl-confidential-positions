**Ruling: B-14 is a real gap. Issue #1 extends to site 5.**

There is no principled cryptographic distinction between the sigma nonce ruling and the ECDSA `k` ruling that would justify pure determinism for `k` under the same same-host adversary. The amount is irrelevant here: `k` protects the XRPL account signing key. If `k` is repeated, biased, faulted, or partially exposed badly enough, the account key is at risk; in this project that also risks the derived ElGamal confidentiality key.

What I would do:

Use hedged ECDSA for secp256k1 release/default signing: RFC 6979-style deterministic nonce derivation with additional fresh 32-byte CSPRNG input, or the closest library-supported equivalent. If entropy fails, refuse to sign. Do not silently fall back to pure RFC 6979, because that converts the ruled mitigation into best effort.

Cost:

The production secp256k1 signature can no longer be byte-for-byte pinned against `ripple-keypairs`, because `ripple-keypairs` is deterministic. That exact-output test must stop being a claim about the default release path.

The replacement test structure should be:

1. Keep a deterministic compatibility arm for tests only, equivalent to `WCONF_HEDGE=0` at site 1.
2. Continue byte-for-byte pinning that deterministic arm against `ripple-keypairs`; that still tests XRPL serialization, hash selection, DER encoding, low-S normalization, and secp256k1 compatibility.
3. Add default-path tests that assert hedging is enabled, signatures verify, repeated signatures over the same message are valid and normally differ, and entropy failure refuses signing.
4. Make the deterministic arm visibly non-default and impossible to enable accidentally in release packaging.

That is sound only if the deterministic arm is the same signing implementation with the hedge input disabled or fixed. If it is a separate signer, it tests the wrong thing.

For ed25519: same threat question, worse engineering position. Standard Ed25519 is deterministic by construction, and I would not recommend hand-rolling randomized Ed25519 for XRPL just to achieve symmetry. Unless the project adopts a vetted library-supported hedged Ed25519 construction whose signatures XRPL validators accept, this remains a named residual gap for the live `sEd...` path. Do not mark B-14 closed by fixing only secp256k1.

One-sentence register entry:

> Issue #1 extends to transaction signing nonces: ECDSA `k` must be hedged in the default path where library support permits it; deterministic vector pinning is retained only as a test-only compatibility arm, while Ed25519 remains a tracked residual deterministic-signing risk unless a vetted hedged implementation is adopted.

Confidence: medium-high. The threat-model extension is a technical conclusion; the ed25519 treatment is a judgment call driven by ecosystem risk and the constraint against custom signature code.
