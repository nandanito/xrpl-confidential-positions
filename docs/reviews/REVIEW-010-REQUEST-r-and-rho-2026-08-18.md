# Cryptography Reviewer packet — where `r` and `ρ` come from

- **Date:** 2026-08-18
- **Scope:** the ElGamal encryption randomness `r` and the Pedersen balance blinding `ρ`. **The Bulletproof's internal blinding is explicitly OUT of scope** and has its own issue (#8) — it is a different question and bundling them was the mistake this packet exists to avoid.
- **You are ruling on a construction.** The output should be implementable byte-for-byte without a second conversation.

---

## 0. Read this first — what is already decided, and what you may overturn

**Decided, and not open to you unless you find them wrong:**

| | |
|---|---|
| Sigma nonce construction | HKDF-SHA-512 over a length-framed preimage binding witness, the **serialised statement bytes**, and `TransactionContextID`; wide 64-byte reduction; no rejection sampling; abort on zero; per-proof-type domain and count separation |
| Hedging | **Hedged.** 32 bytes of aux, tagged-hashed, XORed over the long-lived secret. Ruled 2026-08-18: a hostile same-host process is in the threat model |
| Where it runs | A local signer on the holder's machine. Not a server, not a browser |

**The construction above is implemented and executing.** A `ConfidentialMPTSend` using it was accepted on Devnet. You may consult it at `tools/spike-2026-08-18/wconf-nonces.patch` (`src/mpt_internal.h`, `wconf_generate_nonces`) and `tools/spike-2026-08-18/WCONF-PATCH.md` §1. **You are free to rule that `r` and `ρ` should NOT follow it** — symmetry is an argument, not a requirement.

**You may overturn any of it** if you think it is wrong. Say so explicitly and give the reason; a previous round of this rotation improved a ruling by contradicting its own packet.

---

## 1. The question

**Nobody has specified where `r` and `ρ` come from, or what happens when that source fails.**

Today both come from `mpt_generate_blinding_factor`:

```c
do {
    if (RAND_bytes(out_factor, kMPT_BLINDING_FACTOR_SIZE) != 1)
        return -1;
} while (secp256k1_ec_seckey_verify(ctx, out_factor) != 1);
```

Three things about that, stated as observations:

1. It is an unstructured RNG call. Nothing binds the output to the transaction being signed.
2. It uses **rejection sampling** — the exact pattern the sigma-nonce ruling rejected, for reasons that were about the nonces specifically. Whether those reasons transfer is yours to decide.
3. It is **caller-side**: our signer calls it. Whatever you rule needs no upstream change and has no FFI obstacle. This is unlike the nonce ruling, which needed a vendored fork.

## 2. What is at stake, executed rather than argued

**Reusing `r` across two Sends lets a passive observer with no keys recover the difference between two hidden amounts.**

This was asserted by two reviewers and has since been **executed on Devnet**:

- Two `ConfidentialMPTSend`s from one holder, amounts 7 and 3, sharing one `r`. Everything else — `ρ`, sequence, balance, context — differed.
- Both accepted, `tesSUCCESS`: `E1F1E41AF1ED0F1AA85D69487507B332279BB13DBF06045B3F2DB22B485A8085` and `77A9B8E515F4E918233444A358F0ED2593FE8504098767857BF25DD2A4BDBA77`.
- `C₁ = r·G` byte-identical on chain. An observer subtracted the two `C₂` values — the `r·pk_ᵢ` term cancels — and recovered `m − m′ = 4` by bounded discrete log **in 0 ms**, using only `@noble/curves` and public data.

Three consequences that bear on your ruling:

- **rippled does not reject a reused `r`.** Both were accepted on first submission, and realistically no validator could reject it: that would need unbounded historical `C₁` state, and `C₁` legitimately repeats *within* a Send across participants. **The burden is entirely the signer's.**
- **The recovery works independently from all three participant ciphertexts** — sender, destination and issuer. One signer's bad randomness degrades the issuer's mirror too.
- **It recovers the difference, not either amount.** This is not a break of XLS-96 as specified, and the ruling should not be written as though it were.

**Reproduce it:** `tools/spike-randomness-2026-08-18/reuse-r-setup.ts` then `reuse-r-attack.ts`. The detector is also in `tools/observer-harness.ts --assert-no-r-reuse`.

## 3. What makes `r` different from a nonce, and possibly harder

Four asymmetries. We do not know which of them matter; that is the point of asking.

1. **`r` is disclosed on-chain for Convert and ConvertBack.** The `BlindingFactor` field carries it in clear. A nonce is never published. Whatever derives `r` must therefore assume `r` becomes public *after* the transaction — which is fine for a one-time value and fatal for anything derived from a long-lived secret in a recoverable way.
2. **Convert is the first irreversible transaction a holder makes.** If `r`'s derivation is wrong there, it is wrong at the worst moment.
3. **`r` is shared across participants within one Send** — protocol-enforced, not our choice. So "fresh per ciphertext" is not available; it is fresh per *transaction*.
4. **`ρ` blinds a balance commitment that persists.** Repeating `ρ` makes balance commitments linkable across transactions.

## 4. What to rule on

1. **Derivation.** Deterministic from witness and transaction context, hedged as the nonces are, or fresh RNG with structure? Note `r` becomes public for Convert/ConvertBack — does that change the answer versus Send?
2. **Whether `r` and `ρ` get the same treatment**, or differ.
3. **Admissibility.** Wide reduction, abort-on-zero, no rejection sampling — carry over, or not, and why?
4. **Failure behaviour** when the entropy source fails, if your construction uses one.
5. **Domain separation** from the nonce derivation. They must not collide; say how.
6. **What the signer must refuse.** Should the localhost interface ever accept a caller-supplied `r`? (§(a)'s interface is value-shaped, so it currently cannot.)
7. **A detection rule.** `--assert-no-r-reuse` catches reuse *after* the fact. Is there something the signer should check *before* signing?

## 5. Deliverable

- A byte-exact construction, in the form the sigma-nonce ruling took: preimage layout with framing, KDF, reduction, failure behaviour.
- Known-answer vectors, or a statement of exactly what blocks them.
- A test that fails if the construction is not followed.
- Explicit scope: what your construction does **not** protect against.

## 6. Attachments

`tools/spike-randomness-2026-08-18/FINDINGS.md` · `tools/spike-2026-08-18/WCONF-PATCH.md` · `tools/spike-2026-08-18/wconf-nonces.patch` · `docs/reviews/REVIEW-005c-adjudication-nonce-construction-2026-08-17.md` · `docs/decisions/ADR-0001-key-custody-and-proof-location.md` §(a) and §(e).

**`CLAIMS.md` is attached in full.** A previous packet said not to attach it and then quoted seven of its identifiers as authority, so the reviewer saw conclusions without evidence. Read it or ignore it; do not take a grade on trust.

**One warning.** This packet was written by the session that executed the attack in §2. That session has an interest in `r` being important. Weigh §2 as evidence, not as framing.
