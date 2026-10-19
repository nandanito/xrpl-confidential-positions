# Issue #3 — measurement, not design

**Executed 2026-08-18.** Input for the third review packet (`r`, `ρ`,
Bulletproof randomness). **No construction is designed here, deliberately** —
that is the packet's job, and pre-empting it would repeat exactly the mistake
ADR-0001 §(e) made.

Three questions, all answered.

---

## 1. The repeated-`r` attack is real, and it is as cheap as claimed

Issue #3's central claim was **asserted, not executed**:

> *"Repeated `r` across two Sends: `C₁ = r·G` repeats on chain, so any observer
> computes `C₂,ᵢ − C₂′,ᵢ = (m − m′)·G` and recovers amount differences… No
> second proof, no adversarial effort, no cryptographic work."*

**Executed on Devnet. Confirmed in full.**

Two `ConfidentialMPTSend`s from one holder, amounts 7 and 3, sharing one `r`.
Everything else — `ρ`, sequence, balance, context — differed.

| | |
|---|---|
| Send A, amount 7 | `E1F1E41AF1ED0F1AA85D69487507B332279BB13DBF06045B3F2DB22B485A8085` |
| Send B, amount 3 | `77A9B8E515F4E918233444A358F0ED2593FE8504098767857BF25DD2A4BDBA77` |
| Both engine results | `tesSUCCESS`, validated |
| `C₁` on chain | **byte-identical across both** |
| Observer recovered | **`m − m′ = 4`**, in **0 ms** |

Three things the run established beyond the claim as written:

- **rippled does not reject a reused `r`.** Both sends were accepted on the
  first submission. There is no ledger-side defence; this is entirely the
  signer's responsibility.
- **The recovery works from all three ciphertexts independently** — sender,
  destination *and* issuer. They share one `r`, so each yields the difference on
  its own. Corrupted randomness is not contained to the party that produced it.
- **The observer needs nothing.** `reuse-r-attack.ts` takes two transaction
  hashes, holds no key, links no mpt-crypto, and uses `@noble/curves` alone. The
  attack half is a **separate file** from the setup half so that this is a
  structural property, not a claim in a comment.

**Scope, so this is not over-read.** It recovers the *difference* `m − m′`, not
either amount. It requires `r` to be reused, which a correct signer never does.
It is evidence that `r`'s source is unowned and its failure mode is cheap — **not
a break of XLS-96 as specified**, and it must never be described as one.

---

## 2. Every secret scalar the signer produces, and where it comes from today

| Scalar | Role | Owner | Source today | Bound to the transaction? |
|---|---|---|---|---|
| sigma nonces ×5 | Fiat–Shamir first-round | **library** | `wconf_generate_nonces` (ours, as of the nonce patch) | **yes** — witness, statement bytes and `TransactionContextID` |
| `r` | ElGamal encryption randomness | **caller** | `mpt_generate_blinding_factor` → bare `RAND_bytes` | **no** |
| `ρ` | Pedersen balance blinding | **caller** | same | **no** |
| `alpha`, `rho` | Bulletproof commitment blinding | library | `generate_random_scalar` → bare `RAND_bytes` | **no** |
| `sl`, `sr` vectors | Bulletproof blinding vectors | library | same | **no** |
| `tau1`, `tau2` | Bulletproof polynomial blinding | library | same | **no** |
| ElGamal keypair | long-lived identity | caller | `mpt_generate_keypair` | n/a |

**The asymmetry that matters for scoping the packet:**

- **`r` and `ρ` are caller-owned.** Our signer already supplies them. Whatever
  the packet rules can be implemented with **zero upstream changes and no FFI
  problem at all** — this is the easy half, and it is also the half with the
  demonstrated attack above.
- **The Bulletproof scalars are library-owned**, and need the Path A treatment.

**Consistency point the packet will want:** `mpt_generate_blinding_factor` is a
`do { RAND_bytes } while (!seckey_verify)` loop — **rejection sampling**, the
exact pattern REVIEW-005c §2 ruled against for nonces ("no rejection sampling;
abort on zero, never retry"). Whatever governs the nonces should govern this, or
the project holds two contradictory rules for the same kind of value.

---

## 3. Is determinism reachable for the Bulletproof? Yes — and more cheaply than expected

The eight `generate_random_scalar` call sites are **not** scattered:

| Site | Function |
|---|---|
| 6 of 8 | `secp256k1_bulletproof_prove_agg` — the top-level prover |
| 2 of 8 | `secp256k1_bulletproof_compute_vectors_block`, called from it |

And the top-level prover already receives everything a KDF needs:

```c
int secp256k1_bulletproof_prove_agg(
    const secp256k1_context *ctx, unsigned char *proof_out, size_t *proof_len,
    const uint64_t *values,            /* <- witness */
    const unsigned char *blindings_flat, /* <- witness */
    size_t m,
    const secp256k1_pubkey *h_generator,
    const unsigned char *context_id);  /* <- transaction context */
```

So the same Path A move applies: derive a per-proof seed from
`(values ‖ blindings ‖ m ‖ context_id ‖ domain)`, expand it for the eight
consumers, and thread the seed plus a counter into the one helper — a signature
change on a single internal function. **No new information has to be plumbed
from the caller.**

**Not attempted here, and the reason is not effort.** The Bulletproof scalars are
**not** analogous to sigma nonces, and the difference is exactly what a
cryptographer must rule on:

- A sigma nonce must be unpredictable and unique; deterministic derivation is
  standard practice (RFC 6979) and the failure mode of reuse is key extraction.
- `alpha`, `ρ`, `sl`, `sr`, `tau1`, `tau2` are **blinding values that provide the
  zero-knowledge property itself**. Deriving them deterministically is also
  standard, but it makes the range proof a deterministic function of its witness
  and context — so two proofs over an identical `(values, blindings, context)`
  become byte-identical. Whether that is acceptable, and what it implies when a
  holder resubmits, is a design question with a real answer that is **not**
  "obviously the same as the nonces".

That judgement belongs in the packet. This document establishes only that the
packet is not blocked on feasibility.

---

## What runs

```bash
bun tools/spike-randomness-2026-08-18/reuse-r-setup.ts     # prover, holds keys, Devnet
bun tools/spike-randomness-2026-08-18/reuse-r-attack.ts <hashA> <hashB>   # observer, holds nothing
```

The attack script exits reporting a refutation if `C₁` does not repeat or the
difference does not resolve in range, and says in-line not to widen the range to
manufacture a hit.

## What this does not do

No construction is specified for `r`, `ρ` or the Bulletproof. No upstream issue
is filed. The Bulletproof is not patched. ~~ADR-0001 is still `Proposed` and the
architecture document still does not exist.~~

**Superseded 2026-08-18, later the same day.** `r` and `ρ` are **ruled**
(REVIEW-010, adjudicated REVIEW-010c; storage and state machine amended by A1–A3
and then by **A4–A9** after REVIEW-013c). **ADR-0001 is `Accepted`** and the
architecture document exists. **The Bulletproof half is still open** — issue #8 —
and that part of this section stands. ~~Ruled is not implemented: this harness
still calls `mpt_generate_blinding_factor`.~~ **Struck 2026-08-24 — it is
implemented, in the signer since 2026-08-18 and in `tools/` since 2026-08-24
(`CLAIMS.md` E-132).** ⚠ **`reuse-r-setup.ts` in this directory still calls
`mpt_generate_blinding_factor` and MUST**: it reuses one `r` across two Sends on
purpose, which is E-63, and deriving correctly would delete the finding.
