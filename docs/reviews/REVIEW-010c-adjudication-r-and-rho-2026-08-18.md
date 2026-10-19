# REVIEW-010c — adjudication: `r` and `ρ`

- **Date:** 2026-08-18
- **Inputs:** two legs on the same packet, neither shown the other's output. **Leg A — Gemini** (`agy`, packet and attachments inline, no file access). **Leg B — Codex** (full repository access; it read the source and cited line numbers throughout).
- **Method:** as REVIEW-002 through 009 — every disputed claim checked against source or re-executed before being accepted. **Leg A's known-answer vectors were recomputed here.**
- **Adjudicator:** the session that wrote the packet. The usual caveat applies, and the packet itself warned the reviewer about it.

**Outcome: the legs agree on eight things and split on the central one. Leg B wins the split, on two independent grounds — one of which is that leg A's construction cannot be implemented at all.**

---

## 1. What both legs ruled the same

Not in dispute, and implementable as stated:

- **One construction for both `r` and `ρ`**, separated by role label rather than by two different designs.
- **Wide 64-byte reduction.** Both carry it over from the nonce ruling, both for the same reason: negligible bias with no secret-dependent retry branch.
- **Abort on zero, never retry.**
- **No rejection sampling** — both name `mpt_generate_blinding_factor`'s `do { RAND_bytes } while (!seckey_verify)` loop as the thing being replaced.
- **Length framing throughout**, `u32be` before every variable-length field.
- **Domain separation from the nonce construction**, with fresh labels and salts. Neither reuses `WCONF-NONCE-v1` or any `CMPT_*_SIGMA` domain.
- **The signer must never accept a caller-supplied `r` or `ρ`.** Both reach this independently, and both connect it to §(a)'s value-shaped interface.
- **A pre-sign detection rule is required**, not merely a post-hoc observer check.

That is a substantial agreed core, and it can be built now.

---

## 2. The split, and why leg B wins it

| | Leg A (Gemini) | Leg B (Codex) |
|---|---|---|
| **Source of `r`, `ρ`** | Derived from `sk_A` via hedged HKDF, mirroring the nonce construction | **Structured fresh CSPRNG entropy**, with `sk_A` and every long-lived secret **forbidden** from the preimage |
| **On the on-chain disclosure of `r`** | Safe: revealing a PRF output leaks nothing about the key, under HMAC's PRF assumption | We should not *need* that assumption for a value we deliberately publish |
| **Entropy failure** | Fall back to the deterministic core | **Fatal.** Refuse to sign |

### 2a. Leg A's construction is circular and cannot be implemented

**This is decisive and it is not a matter of taste.** Leg A's IKM for `r` includes the serialised Fiat–Shamir statement bytes:

```
|| u32be(stmt_len) || stmt_bytes
```

and defines `stmt_bytes` as *"the exact serialized bytes of the statement as passed to the Fiat–Shamir challenge hash (including sender, destination, and issuer public keys and commitment points)."*

**That statement contains `C₁ = r·G`, every `C₂,ᵢ = m·G + r·pk_ᵢ`, and `PC_m = m·G + r·H`. All three are computed *from* `r`.** To derive `r` you would need the statement; to build the statement you need `r`.

Leg B names exactly this and excludes statement bytes for exactly this reason:

> *"`r` and `rho` are inputs used to build ciphertexts, commitments and proofs; they cannot depend on the final statement bytes without circularity."*

It is the sort of error that comes from reasoning by analogy with the nonce construction — where binding the statement is not only possible but required, because the nonce is chosen *before* the commitments and the statement is already fixed. The analogy breaks precisely at the point leg A leaned on it hardest.

### 2b. On the merits, independently of 2a

`r` is **published in clear** in `BlindingFactor` for Convert and ConvertBack. Leg A's position is that publishing a PRF output keyed by `sk_A` is safe. That is very probably true. Leg B's position is that we should not have to depend on it:

> *"Public disclosure of one `r` must not create a public oracle keyed by holder secret material."*

**Accepted.** Fresh entropy is free here, the signer already has a CSPRNG, and the value in question is deliberately published on the first irreversible transaction a holder makes. Taking a dependency on an assumption to buy nothing is the wrong trade.

### 2c. Entropy failure — leg B, and the apparent inconsistency is real but resolved

Leg A would fall back to deterministic derivation; leg B refuses to sign. **Leg B is right, and its reasoning also resolves something a future reader will otherwise flag as a contradiction.**

The nonce ruling says a dead RNG degrades gracefully to the deterministic core. This ruling says entropy failure is fatal. Both are correct, because entropy plays a different role in each:

- For **nonces**, entropy is a *hedge over* a deterministic, secret-derived core. Losing it falls back to something that was already safe.
- For **`r` and `ρ`**, entropy is the *primary* source. There is nothing underneath to fall back to, and synthesising a published blinding value from a long-lived key is exactly what 2b forbids.

Record this distinction where both rules are visible, or someone will "fix" one of them.

---

## 3. Leg A's known-answer vectors are fabricated

**Recomputed here, and every asserted value is wrong.**

| | |
|---|---|
| Claimed IKM length | 188 bytes |
| Actual, from leg A's own layout and inputs | **222 bytes** |
| Claimed `PRK` | `8A752B3B0C731D79…` |
| Computed | `110C3972C3E26309…` |
| Claimed `OKM` | `B4D581A43F881358…` |
| Computed | `4D68F450C186451A…` |
| Claimed `r` | `4B8E1D94C381E152…` |
| Computed | `50B8D53B6145814C…` |

**The structure reproduces cleanly** — an independent implementation of leg A's stated layout runs and produces self-consistent values — which is what makes the fabricated hex dangerous rather than obvious. A later session could have adopted those vectors as ground truth.

Leg A also contradicts itself on the mask: §2.3 computes it as a tagged hash of `aux` even when `aux = 0³²`, while §3.1 asserts `mask = 0³²` and `sk'_A = sk_A`. Those cannot both hold.

**Leg B shipped a runnable test instead, and it passes** — 9 vectors and 6 structural checks, executed here (`tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts`).

REVIEW-005c noted that leg B of *that* round shipped no vectors and called its refusal to guess correct behaviour. This round is the same lesson with the sign flipped: **shipping wrong vectors is worse than shipping none.**

---

## 4. What leg A contributed that leg B did not

Not a wash — leg A earned its place:

- **The clearest statement of the disclosure question.** Its PRF argument is what forced the issue to be decided on the merits rather than by defaulting to symmetry with the nonces.
- **Per-transaction-type domain tags** (`WCONF-R-CONVERT-v1` vs `WCONF-R-SEND-v1`). Leg B achieves the same separation by framing `tx_type` into the preimage; leg A makes it explicit in the label. Equivalent, and leg A's is harder to get wrong by omission.
- **The explicit residual-risk taxonomy** in its §5, which is more complete than leg B's and should be carried into the ADR.

---

## 5. Disposition

**Adopt leg B's construction**, `docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md`, with its runnable test. It is byte-exact, non-circular, and executes.

**Carry over from leg A:** the residual-risk taxonomy, and the recommendation that `tx_type` appear in the domain label as well as the framed preimage.

**Rejected:** leg A's derivation from `sk_A` (circular as specified, and unnecessary on the merits); leg A's KAT block (fabricated); leg A's deterministic fallback on entropy failure.

**Not settled here, and deliberately:** the Bulletproof's internal blinding. Issue #8. Both legs kept to the packet's scope.

**Still open:** the keygen half of ADR-0001 §(e). That is now the last packet between this ADR and `Accepted`.

**Not implemented.** This adjudication rules; it does not build. No signer exists, and `mpt_generate_blinding_factor` is still what the harnesses call. Wiring leg B's construction into a signer is downstream of the architecture document and of ADR-0001 reaching `Accepted`.
