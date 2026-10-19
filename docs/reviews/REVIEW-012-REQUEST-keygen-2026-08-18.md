# Cryptography Reviewer packet — where the ElGamal keypair comes from

- **Date:** 2026-08-18
- **Scope:** ADR-0001 §(e)'s **keygen half** — the proposal to derive the holder's ElGamal keypair deterministically from their XRPL master seed with domain separation. **Nonces are out of scope** (ruled, implemented, executed). **`r` and `ρ` are out of scope** (ruled 2026-08-18). **The Bulletproof's internal blinding is out of scope** — issue #8, a different question.
- **You are ruling on a construction, and on whether to have one at all.** The output should be implementable byte-for-byte without a second conversation, or should say plainly that the proposal is wrong and what replaces it.
- **This is the last packet between ADR-0001 and `Accepted`.** That is a reason to be slow, not a reason to approve.

---

## 0. What is already decided, and what you may overturn

**Decided. Not open to you unless you find them wrong — in which case say so, explicitly, with reasons.**

| | Ruling | Where |
|---|---|---|
| **Where proving runs** | A local signer binary on the **holder's machine**. Not a server, not a browser | ADR-0001 §(a) |
| **Threat model** | **A hostile same-host process IS in scope** (ruled 2026-08-18, issue #1). This obliges per-transaction confirmation in the signer's own UI, short-lived scoped authority, no browser-persisted bearer secret, and OS-mediated IPC preferred over generic localhost HTTP | ADR-0001 §(a), architecture §3 |
| **What that does NOT buy** | It raises the bar from *a leaked token* to *code execution on the holder's machine*. An adversary with code execution reads `sk_A` out of process memory. `CLAIMS.md` P-5 forbids calling any of it secure | architecture §3 |
| **XRPL account key custody** | The holder holds it, **in the same signer**. No custodial mode. The signer signs as well as proves | ADR-0001 §(d) |
| **Sigma nonces** | **Hedged**: 32 bytes of aux, tagged-hashed and XORed over the long-lived secret, BIP-340 style, over a deterministic secret-derived core. Implemented, adversarially reviewed twice, executed on Devnet | REVIEW-005c; `tools/spike-2026-08-18/WCONF-PATCH.md` §1 |
| **`r` and `ρ`** | **Structured fresh CSPRNG entropy**, with `sk_A` and every long-lived secret **FORBIDDEN** from the preimage. Entropy failure is **fatal — refuse to sign.** Ruled, **not implemented** | REVIEW-010, adjudicated REVIEW-010c |

**You may overturn any of it.** A previous round of this rotation improved a ruling by contradicting its own packet. If a keygen decision forces a change upstream of it, say so rather than working around it.

**Do not restate any of the above constructions in your output.** They live in one place each and a second copy is a divergence waiting to happen.

---

## 1. The proposal you are ruling on

ADR-0001 §(e), verbatim and unedited:

> **Proposed: derive the ElGamal keypair deterministically from the holder's XRPL master seed, with explicit domain separation.** One backup then covers both keys.
>
> **The trade-off, stated rather than hidden.** Seed compromise would then yield both spending authority *and* retroactive decryption of the holder's entire confidential history, permanently, with no rotation available. Against that: seed compromise already means total loss of spending authority, so the marginal harm is retroactive confidentiality — and the issuer already holds a decryption mirror of every balance, so confidentiality-from-an-attacker-who-has-your-seed is a narrow property to begin with. The gain is that an otherwise unrecoverable key becomes recoverable from a backup the holder already keeps.
>
> **On balance the recovery gain outweighs the marginal confidentiality loss.** Deterministic derivation with domain separation is standard practice, and the alternative — an independently generated key with its own separate backup — raises the probability of the one failure mode that has no remedy at all.

The ADR names its own open questions: **the derivation function and domain-separation label; whether reduction to the secp256k1 group order introduces bias; whether the derivation should be proposed as a standard or kept repository-local.**

**Nobody has reviewed any of this.** It is the single largest item between ADR-0001 and `Accepted`.

---

## 2. THE TRAP IN THIS PACKET — read this before you reason from the last ruling

**The `r`/`ρ` ruling came out AGAINST deriving from a long-lived secret. Do not carry that conclusion here by analogy. The reason it was decided that way does not obviously transfer, and it may invert.**

REVIEW-010c's ground for rejecting `sk_A`-derived `r`:

> *"Public disclosure of one `r` must not create a public oracle keyed by holder secret material."*

`r` is **published in clear**, in the `BlindingFactor` field, on Convert and ConvertBack — the first irreversible transaction a holder makes. Deriving a published value from a long-lived secret means publishing PRF outputs keyed by that secret. The ruling held that we should not have to lean on the PRF assumption to buy nothing.

**An ElGamal private key is never published.** Nothing about it is disclosed on-chain except `pk_A = sk_A·G`, which is the public key by construction. The disclosure argument that decided `r` **has no counterpart here**. The analogy may therefore run the other way, and this packet is not asking you to be consistent with the last ruling — it is asking you to decide this question on its own terms.

**Why this warning is here at all.** REVIEW-010's leg A produced a construction that was **circular and could not be implemented**: it derived `r` from the serialised Fiat–Shamir statement bytes, which contain `C₁ = r·G`. To derive `r` you needed the statement; to build the statement you needed `r`. That error came from reasoning by analogy with the nonce construction, where binding the statement is not only possible but required. **The analogy broke exactly where that leg leaned on it hardest.** Two rounds, two different analogies, one failure mode.

**Engage with the adjacency explicitly in your output.** State whether you think the `r`/`ρ` reasoning transfers, partly transfers, or inverts, and why. A ruling that reaches the right answer without addressing this will be treated as under-argued.

---

## 3. The fact that makes this permanent

**There is no recovery story to design around, and no rotation.**

- **Rotation is impossible.** A second `HolderEncryptionKey` on the same `MPToken` returns `tecDUPLICATE`. Same at issuer and auditor level (`tecNO_PERMISSION`), and the issuer key cannot be set at all once `sfConfidentialOutstandingAmount` exists. `CLAIMS.md` E-9; ADR-0001 §(b).
- **Recovery is none.** Spec §A.6: a holder who loses the key *"will be unable to decrypt or spend their confidential balances, which will remain valid on-ledger but are effectively locked and irrecoverable by that holder."* `CLAIMS.md` E-10.
- **`CLAIMS.md` P-10 forbids ever claiming otherwise.**
- The only protocol remedy is issuer **clawback**, which **burns** the balance — it does not return it.

So the two failure modes are not symmetric in kind:

| | Consequence | Reversible? |
|---|---|---|
| **Key lost** | Balance permanently unspendable. Remedy is the issuer destroying it | No |
| **Key compromised** | Attacker decrypts the entire history, retroactively and forever | No |

§(e) argues the first is worse and buys insurance against it. **That is the trade you are ruling on.** Both arms are permanent; neither has a mitigation available after the fact.

---

## 4. Upstream does something different, and the packet is obliged to say so

**mpt-crypto sources ElGamal keys from `ripple-keypairs` as a *distinct* secp256k1 seed — not from master-seed derivation.**

- Recorded at `docs/task-zero/DEVNET-CONVERT-2026-08-17.md` §8: *"upstream sources ElGamal keys from `ripple-keypairs` as a distinct secp256k1 seed — which is *not* ADR-0001 §(e)'s master-seed derivation."*
- `UPSTREAM-FEEDBACK.md` **U-32** records this as a *positive, specific* observation: the WASM build **deliberately does not export** `_mpt_generate_keypair`, and the reason is stated inline at the export list — ElGamal keys come from `ripple-keypairs`, not the WASM CSPRNG. Confirmed absent from the built module (`CLAIMS.md` E-47) and absent from the published npm wrapper (E-53).

**Two readings, and the packet does not choose between them:**

1. Upstream has considered key sourcing and landed on a *separate* seed, which is evidence against §(e).
2. Upstream has simply declined to ship a keygen in a library that would be the wrong place for it, and "use `ripple-keypairs`" is an integration note rather than a design position.

**Weigh it. Do not treat it as settled in either direction.** If you think it is decisive, say which reading you are taking.

**The specification is silent.** XLS-0096 describes `HolderEncryptionKey` as *"The holder's ElGamal public key (pk_A)"*, requires 33 bytes and a Schnorr PoK, and says **nothing whatsoever** about how the keypair is produced — no derivation guidance, no prohibition, no reference to the XRPL account key. Verified against the full spec text, obtained 2026-08-18 (`docs/task-zero/SOURCES-2026-08-18.md` §2). **Master-seed derivation is neither blessed nor forbidden by the protocol.** This is a design decision the specification leaves entirely to the integrator, which is why it is ours to get right.

---

## 5. New this session — issue #4 is closed, and it bears on your ruling

**The registration PoK IS bound to the account.** This was an open question when this packet was scheduled, and it was answered from source today. `CLAIMS.md` **E-66**; full chain in `docs/task-zero/SOURCES-2026-08-18.md` §1.

The Fiat–Shamir challenge for `CMPT_POK_SK_REGISTER` is

```
SHA-256( "CMPT_POK_SK_REGISTER" ‖ pk(33) ‖ T(33) ‖ context_id(32) )
```

and rippled always supplies `context_id = sha512_half( u16(txtype) ‖ acc(20) ‖ iss(24) ‖ u32(seq) ‖ acc(20) ‖ u32(0) )`. The registration proof therefore binds **(account, issuance, sequence)**. It is not copyable to another account.

**Three consequences for this ruling.**

1. **§(b)'s rogue-key defence is NOT weaker than claimed.** The concern that motivated putting this question in front of you is refuted. If anything the ADR undersells it, describing only the rogue-key property and not the account binding.

2. **The ElGamal key is cryptographically welded to one XRPL account at registration, permanently.** That is the fact §(e) has to live with. A `ConfidentialMPTConvert` carrying a key registration is authenticated **twice**: the XRPL account key signs the transaction, and the ElGamal secret proves the PoK. **Under master-seed derivation those two authentications collapse to one secret.** Whether that is a real weakening or merely an accurate description of a trust boundary that was always single-rooted is a question for you. Note that the *transaction* is already only as strong as the XRPL account key regardless — but the *registration binding* currently requires two independent witnesses and would then require one.

3. **A caution about the library you will be reasoning about.** `secp256k1_mpt_pok_sk_verify` accepts a **NULL** `context_id`; with NULL the challenge is `SHA-256(domain ‖ pk ‖ T)` and the proof is bound to nothing but the public key — valid, account-unbound, replayable by anyone who has seen it. The public header declares the parameter with **no doc comment at all**. **rippled cannot reach this path** — the utility wrapper rejects NULL — but our signer links the library directly and can. `CLAIMS.md` **F-19**. If your construction touches registration, say what the signer must assert here.

---

## 6. What to rule on

1. **Master-seed derivation: yes or no.** Rule on §(e)'s proposal as stated. If no, say what replaces it and what the backup story is, given §3 — a design that trades an unrecoverable key for a second unrecoverable backup has not obviously improved anything.

2. **If yes: a byte-exact construction.** KDF, salt and info, domain-separation label and version tag, canonical encoding of the seed input, length framing, and expansion to a single scalar. The nonce ruling's standard applies — the REVIEW-003b CRITICAL that started this whole rotation was *"not implementable from this text"*, and a sketch will be treated the same way.

3. **Scalar generation and bias.** Reduction to the secp256k1 group order. The other two rulings both chose **wide 64-byte reduction** with no secret-dependent retry branch, and both rejected rejection sampling. State whether that carries here and why. Note the asymmetry: a keypair is generated **once, offline, per holder, for all time** — the performance and side-channel arguments that shaped the per-transaction rulings may not apply, and a retry loop that is unacceptable in a signing hot path may be fine here. Say so if you think it is.

4. **Which seed input, exactly.** "The XRPL master seed" is 16 bytes of entropy that expands to the account keypair through a defined XRPL derivation. State precisely which value enters the KDF — the raw 16-byte seed, the derived account private key, or something else — and what happens under the different XRPL key types (`secp256k1` vs `ed25519`), and for accounts using a **regular key** or **multi-signing**, where the "master seed" may not be the key that signs.

5. **Domain separation from everything already ruled.** It must not collide with `WCONF-NONCE-v1`, with the `r`/`ρ` labels, or with any `CMPT_*` domain. Say how, and say whether the label should carry a version.

6. **Storage and backup.** §(e) states the secret is never written to disk in plaintext, and is encrypted at rest under a passphrase-derived key if cached. Is that sufficient given §0's threat model — a hostile same-host process? What must the signer do at rest, in memory, and on shutdown?

7. **What the signer must refuse.** The interface must never accept a caller-supplied `r` or `ρ` (REVIEW-010c). Does the same rule extend to seeds, passphrases or derived key material? Is there any endpoint that may legitimately accept key material at all?

8. **Standard or repository-local.** §(e) asks whether the derivation should be proposed as a standard. Given §4 — upstream uses a separate seed and the spec is silent — is a repo-local derivation a liability, in that a holder who loses our signer cannot reconstruct their key from any other tool?

9. **Validation.** `CLAUDE.md` requires that keygen, when written, be validated against mpt-crypto's own vectors — `test_pok_sk`, `test_elgamal`, `test_elgamal_verify`. State what those actually establish and what they do not. A vector that proves a keypair is *well-formed* says nothing about whether it was *derived correctly*.

---

## 7. Deliverable

- **A ruling on the proposal**, argued on its own terms and engaging with §2's adjacency explicitly.
- **If you rule for derivation:** a byte-exact construction — preimage layout with framing, KDF, reduction, failure behaviour — in the form the sigma-nonce ruling took.
- **Known-answer vectors, or a plain statement of exactly what blocks them.** See the warning below.
- **A test that fails if the construction is not followed.**
- **Explicit scope:** what your construction does **not** protect against. Leg A of the last round contributed a residual-risk taxonomy that was better than the winning leg's, and it was carried over on its own merits.

### On known-answer vectors — a specific warning, from the last round

**Leg A of REVIEW-010 shipped fabricated vectors.** Every asserted value was wrong: claimed IKM length 188 against an actual 222, and `PRK`, `OKM` and `r` all invented. The structure reproduced cleanly from its own prose, which is exactly what made the invented hex dangerous rather than obvious — a later session could have adopted them as ground truth. It also contradicted itself on the mask between two of its own sections.

**Every vector you produce will be recomputed independently before it is adopted**, including the vectors of whichever leg wins. REVIEW-005c credited a leg for refusing to guess and shipping none. **Shipping no vectors is acceptable. Shipping wrong vectors is worse than shipping none.** If you cannot execute your construction, say so and describe what would be needed to generate them.

---

## 8. Attachments

**`CLAIMS.md` is attached in full**, and is the register of what this project believes and on what evidence. A packet two rounds ago quoted seven of its identifiers as authority while telling the reviewer not to read it, so the reviewer saw conclusions without evidence. **Read it or ignore it — do not take a grade on trust.** Rows most likely to matter: **P-5, P-9, P-10** (standing prohibitions), **E-9, E-10** (no rotation, no recovery), **E-33** (`sk_A` is a proof witness), **E-34, F-17** (nonce reuse extracts `sk_A`), **E-47, E-53** (keygen not exported), **E-63** (the executed `r`-reuse attack), **E-66, E-67, F-19** (new today).

Also attached:

- `docs/decisions/ADR-0001-key-custody-and-proof-location.md` — §(e) in full, plus §(a), §(b) and §(d) for the surrounding decisions.
- `docs/architecture/ARCHITECTURE-2026-08-18.md` — provisional, and §5 says what is gated.
- `docs/reviews/REVIEW-010c-adjudication-r-and-rho-2026-08-18.md` — the adjacent ruling and the circularity finding.
- `docs/reviews/REVIEW-005c-adjudication-nonce-construction-2026-08-17.md` — the nonce ruling.
- `docs/task-zero/SOURCES-2026-08-18.md` — issue #4's answer, the spec silence, the TOB gap.
- `UPSTREAM-FEEDBACK.md` — U-32 in particular.

---

## 9. Two things this packet is obliged to disclose about itself

**Conflict of interest.** This packet was written by the session that will also adjudicate it, and by the session that closed issue #4 this morning. Three stacked conflicts, the same shape as the last round. The previous adjudication survived being pointed at by both external legs, and both were asked to check it explicitly. **You are asked to do the same: if §2's framing, §5's inference about collapsing authentications, or §4's refusal to choose between two readings looks like a thumb on the scale, say so.**

**A standing bias in this project's self-review.** Its own record: self-review finds *mechanisms* and misses *instances*. It has three times produced a document that was true when written and false by the end of the same session. If you find a factual claim in this packet that is stale rather than wrong-in-principle, that is the most valuable thing you can return.
