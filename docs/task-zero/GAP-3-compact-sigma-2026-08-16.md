# GAP-3 closed — the compact sigma proof, read

**Source:** `docs/references/cmpt-compact-sigma.pdf` — *Compact Sigma Protocols for Standard
EC-ElGamal in Confidential Multi-Purpose Tokens on XRPL*, **Tess Dore and Murat Cenk,
RippleX Research, 12 May 2026.** 19 pages, read in full 2026-08-16.

Closes **GAP-3**, the last gap blocking the architecture document. Resolves **B-7**.

---

## 1. The question ADR-0001 depends on

**Does the balance-linkage statement require the sender's secret key?**

**Yes. Confirmed, Grade A, from the formal statement with security proofs.**

§2.3 is explicit. The sender's on-ledger balance ciphertext is `B₁ = r_b·G`,
`B₂ = b·G + r_b·P_A` for some historical randomness `r_b`. The paper's own words:

> Since `(B₁, B₂)` is already on-ledger, the prover **may not know the original `r_b`**.
> However, the sender knows `sk_A` with `P_A = sk_A·G`, so the balance ciphertext satisfies
> `B₂ − b·G = sk_A·B₁`. This allows the sigma proof to link `PC_b` to the balance ciphertext
> **using `sk_A` rather than `r_b`**.

The prover's witness for `ConfidentialMPTSend` (Equation 1) is

```
w = (m, r, b, ρ, sk_A)
```

`sk_A` is a witness component, not an input. **Theorem 4.2 (2-special soundness)** extracts it
— `sk_A = (z_sk − z′_sk)/Δe` — and Relations 5 and 6 confirm the extracted value satisfies
both `P_A = sk_A·G` and `B₂ − b·G = sk_A·B₁`. **Theorem 4.4** lifts this to knowledge
soundness in the ROM under the discrete logarithm assumption via the forking lemma.

**Remark 4.5** states the security of `sk_A` "reduces to the discrete logarithm assumption,
identically to a standalone Schnorr PoK."

**Therefore: whoever generates a `ConfidentialMPTSend` proof must hold the sender's ElGamal
secret key. ADR-0001's central premise holds, and its custody argument stands.**

The same relation, standing alone, governs `ConfidentialMPTConvertBack` (§8.3, Eq. 30,
witness `(b, sk_A, ρ)`). `ConfidentialMPTClawback` requires `sk_iss` instead (§8.2) — the
issuer's key, which is why clawback needs no holder cooperation.

**One honest qualification.** `sk_A` is used *because* `r_b` is generally unavailable to the
prover, not because the statement is unprovable otherwise — a prover who did know `r_b`
could in principle prove an `r_b`-based variant. That variant is not the deployed relation.
For XLS-96 as specified and implemented, `sk_A` is required. ADR-0001 should state the
premise this way rather than as a mathematical necessity.

---

## 2. A correction to E-4, made this morning and wrong

I regraded E-4 (total Send payload) from B to **A** earlier today on the strength of
arithmetic over mpt-crypto's size constants: `4×66 + 2×33 + 946 = 1276`. **That grade was
over-confident and I am reversing it to B.**

The paper's Table 2 gives the total as **1177 bytes for n=4**, not 1276. The gap is exactly
**99 bytes = 3 × 33**, and it is a layout question I did not check:

| | ciphertexts | commitments | sigma | Bulletproof | **total** |
|---|---|---|---|---|---|
| **Per-CT layout** (my arithmetic) | 4 × 66 = 264 | 66 | 192 | 754 | **1276** |
| **Shared-`C₁` layout** (paper Table 2) | 33 + 4×33 = 165 | 66 | 192 | 754 | **1177** |

All four ciphertexts share the same first component `C₁ = r·G`, because they encrypt the
same amount under shared randomness `r`. §2.1 asserts "the shared first component `C₁` is
transmitted **once on-chain**."

**The conflict is unresolved and I am not resolving it by preference.**

*Points to per-CT (1276):* mpt-crypto's data model uses `kMPT_ELGAMAL_TOTAL_SIZE 66` with a
full `uint8_t ciphertext[66]` per participant and exposes no shared-`C₁` concept;
`sfields.macro` carries four separate encrypted-amount fields and no shared-`C₁` field;
spec §14.1 gives 264 B of ciphertext.

*Points to shared-`C₁` (1177):* §2.1's direct assertion about on-chain encoding, and
Table 3's progression, which treats shared-`C₁` as configuration (B) — **a change
independent of the compact sigma.** The paper is explicit that compact sigma alone requires
"no specification of new ciphertext formats; only the proof serialization changes."

So the two changes were proposed separately, and we have confirmed only that the *compact
sigma* landed (192/128/64 are in the headers). **Whether the shared-`C₁` ciphertext layout
landed is unverified.**

**Settled by:** one real `ConfidentialMPTSend` on devnet — measure the serialised blob.
This is now a concrete, high-value acceptance check for the spike, worth 99 bytes and a
published number.

---

## 3. Nonce generation is safety-critical, and failures are invisible

**§6.1 and Remark 6.1. This is the most operationally important thing in the paper and it
belongs in the Cryptography Reviewer's queue immediately.**

Reusing a nonce across two proofs with distinct challenges — or across two distinct
statements under the same challenge — **allows trivial witness extraction via the special
soundness equations.** The extracted witness includes `sk_A`.

The compact form makes this worse in a specific way:

> Because the compact form transmits `(e, z_m, z_r, z_b, z_ρ, z_sk)` rather than the
> commitments, **a nonce-reuse attack is not detectable from the proof alone**; the
> resulting proofs would simply be valid proofs of distinct statements that happen to share
> the underlying nonces. An adversary observing both proofs can extract the witnesses.

So: a nonce bug in our signer leaks the holder's spending key, produces proofs that verify
normally, and leaves **no on-chain signal**. There is no failing transaction to alert us.

The paper's recommendation (RFC 6979 style):

```
(α_m, …, α_sk) ← HKDF(sk_A ‖ r ‖ m ‖ b ‖ ρ ‖ statement ‖ fresh entropy)
```

Including the full witness makes nonces unique per transaction; the fresh entropy is
defence in depth.

**Consequences for this project:**

1. ADR-0001 puts proof generation in the holder's Rust signer. This is now the **highest**
   cryptographic risk in that decision — above TOB-RIPCTX-5's partially-mitigated timing
   channel, because a timing channel needs an adversary with local measurement and this
   needs only a coding error.
2. The signer must derive nonces deterministically per the above and must never accept
   caller-supplied randomness.
3. **This is untestable from the outside.** It cannot be caught by an observer harness or
   by any on-chain check. It needs a known-answer test against fixed inputs plus an explicit
   test that two proofs over distinct statements never share nonces.

---

## 4. Other findings

**Authorship — P-7 applies.** This work is **Tess Dore and Murat Cenk**. Dore does not
appear in E-1's XLS-0096 author list and must be credited wherever the compact sigma,
the twisted-ElGamal analysis (`[Dor26a]`) or the Bulletproofs++ analysis (`[Dor26b]`) is
discussed. The constant-size shared-randomness equality proof of §5 is Cenk's (`[Cen26]`).

**Compact proofs cannot be batch-verified (Remark 6.2).** Because commitments are
*reconstructed* rather than transmitted, each proof's commitments depend on its own
challenge, so there is no cross-proof linear structure to batch. The paper argues the
tradeoff is favourable on XRPL because network latency and size limits dominate. **Relevant
to any throughput claim we make** — verification is `O(n)` multi-scalar multiplications per
proof, 11 at n=4, with no amortisation across a ledger.

**Convert has no production sigma proof (§8.1).** "No sigma proof is required or defined for
Convert in the production protocol" — it uses deterministic r-disclosure via the
`BlindingFactor` field. The 64-byte `Π_plain` in Table 4 is **hypothetical, for reference
only.** This does *not* contradict TASK ZERO §3: the 64-byte proof on Convert is the
`kMPT_SCHNORR_PROOF_SIZE` PoK for **key registration**, a different statement. Do not read
Table 4's Convert row as a production size.

**The paper's §8.5 proposals have since shipped.** It proposes new source files
`proof_compact_clawback.c` and `proof_compact_convertback.c` as future work. Both exist in
the tree I built today and both compile — so Clawback (64 B) and ConvertBack (128 B)
compact forms are implemented, not merely proposed. The paper is three months stale on
implementation status.

**Amendment gating (§8.5).** Compact proof formats are consensus-visible and gated behind an
amendment; during transition validators accept both forms. Since rippled 3.3.0 pins
mpt-crypto `0.4.0-rc4`, whose constants are 192/128/64, **the compact forms are what devnet
verifies.** Consistent with TASK ZERO §3.

**Twisted ElGamal was considered and rejected (§A).** Under compact form its advantage
shrinks from 292 B to an irreducible **64 B**, which the team judged insufficient to justify
"the specification, implementation, and audit costs." The 64-byte gap is structural — it
comes from twisted ElGamal having three scalar witnesses `(r, m, sk_A)` against standard
EC-ElGamal's five `(m, r, b, ρ, sk_A)`. Useful context for W-PQ: the scheme choice was
deliberate and quantified, not incidental.

---

## 5. What remains open

| | |
|---|---|
| **Shared-`C₁` on-chain layout** | 1177 vs 1276. Decidable by one devnet transaction |
| **Bulletproofs++ (§7.3, config C)** | Would take Send to ~905 B. Cited as `[Dor26b]`, orthogonal, not adopted. Unread |
| **`[Cen26]`, `[Dor26a]`, `[Dor26b]`** | Referenced throughout; not in `docs/references/`. None load-bearing for W-CONF |
