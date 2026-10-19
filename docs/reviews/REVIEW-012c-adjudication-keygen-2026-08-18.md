# REVIEW-012c — adjudication: ElGamal key derivation

- **Date:** 2026-08-18
- **Target:** ADR-0001 §(e)'s keygen half. Packet: `REVIEW-012-REQUEST-keygen-2026-08-18.md`.
- **Three legs.** **Self** (`REVIEW-012s`, written and committed *before* either external leg was run or read). **Leg A — Gemini** (`agy`, packet and all attachments inline, **no file access, no code execution**). **Leg B — Codex** (`codex exec`, sandbox `read-only`, full repository read access, **executed code**). No leg saw another.
- **Method:** as REVIEW-002 through 011 — every disputed claim checked against source or re-executed before being accepted. **Leg B's known-answer vectors were recomputed here, and so was the construction this adjudication adopts.**
- **Adjudicator:** the session that wrote the packet and closed issue #4 the same morning. Three stacked conflicts, disclosed in the packet's §9, and both external legs were pointed at them.

**Outcome: all three legs rule the same way on the decision. The construction is leg B's, the reduction is leg A's, and the binding condition came from the self leg and was missed by both externals.**

---

## 1. Unanimous, and therefore not the interesting part

All three legs approve deterministic master-seed derivation. All three reach it the same way: the `r`/`ρ` ruling's disclosure argument does not transfer, because `sk_A` is never published and because derivation here *buys* something — the only recovery mechanism a protocol with no rotation permits.

Also agreed by all three, and not in dispute:

- **Raw 16-byte family seed** as input, never a derived XRPL private key, so the ElGamal identity does not depend on the account's signature algorithm.
- **AccountID bound into the preimage**, so one seed serving several accounts yields distinct keys.
- **HKDF-SHA-512**, length-framed throughout.
- **Wide 64-byte reduction**, no rejection sampling.
- **Upstream's `test_pok_sk` / `test_elgamal` / `test_elgamal_verify` prove well-formedness, not derivation correctness** — a constant `sk_A = 1` passes all three — so a separate derivation KAT is required. Both externals reached this independently and the self leg did too.
- **Repository-local now, with the specification published**; the derivation must not live only in a binary.
- **The signer must always pass a non-NULL `context_id`** to the registration PoK. Both externals picked up F-19 from the packet unprompted.

**A substantial agreed core, and it can be built now.** The disagreements below are all inside it.

---

## 2. Leg B's vectors are genuine — recomputed, and every value reproduces

**This is the check REVIEW-010c's §3 exists to force, and this time it comes out the other way.**

Leg B shipped two known-answer vectors, computed by executing code. An independent implementation written here from leg B's **prose** — not from its code path — reproduces **every asserted value exactly**: both family seeds, both AccountIDs, both `PRK`s, both `OKM64`s, both `sk_A`, both `pk_A`. The seed-encoding cross-check also holds: `encodeSeed(000102…0F)` really does produce `sp6Jdwov…` for `secp256k1` and `sEdSJHdn…` for `ed25519`, which is the sort of detail a fabricator gets wrong.

**The contrast with the last round is worth recording.** In REVIEW-010, leg A (Gemini) shipped vectors in which every value was invented, and leg B (Codex) shipped runnable code. This round leg B again shipped executed values and they are sound, and **leg A shipped no vectors and said exactly why** — no code execution, and fabricating hex creates false ground truth. That is the correct behaviour the packet asked for, and leg A named REVIEW-010's failure as its reason for declining.

**Shipping no vectors is acceptable. Shipping wrong vectors is worse than shipping none.** Both legs behaved correctly by that standard this round.

---

## 3. The split that matters: the reduction, and leg A wins it

| | Leg A (Gemini) | Leg B (Codex) |
|---|---|---|
| Reduction | `sk = (X mod (n−1)) + 1` — **total**, cannot be zero, no branch | `sk = X mod n`; **if zero, abort and do not retry** |

**Leg A is right, and the reason is that leg B carried over a rule whose consequences invert here.**

*Abort on zero, never retry* is correct in the sigma-nonce ruling and in the `r`/`ρ` ruling. In both, the input is **fresh entropy**, and aborting means declining to sign **one transaction**, which the caller retries with new randomness. The rule costs nothing.

**Keygen's input is a fixed seed.** An abort is therefore **deterministic and permanent**: that holder aborts on every attempt, forever, and cannot participate in confidential transfers at all. There is no rotation, no recovery, and no way to retry short of abandoning the account. The probability is about `2⁻²⁵⁶` and will never occur — but leg A's form removes the failure mode rather than handling it, at zero cost, and leg B's form introduces an unrecoverable state for no benefit.

This is the same shape as the contradiction the architecture document already records between the nonce and `r`/`ρ` entropy-failure rules: **two rulings that look inconsistent and are not, because the role of the input differs.** Recorded in the ruling's §2.3 so a later reader does not "fix" it back.

**Leg B's own reasoning here is not careless** — it explicitly says "do not retry with altered labels or counters", which is the right instinct against grinding. It simply did not notice that a total function makes the question moot.

**Consequence for the vectors.** Adopting leg A's reduction changes only the final step, so **`PRK` and `OKM64` carry over from leg B's recomputed values unchanged**; only `sk_A` and `pk_A` differ. Both were recomputed here by two implementations of the adopted prose — one calling `HMAC-SHA-512` directly, one through `@noble/hashes`' `hkdf()` — which agree.

---

## 4. Everything else in the construction is leg B's, and it is better specified

Leg B wins the framing on completeness:

- **It binds `seed_type`** into the IKM. Leg A binds only the seed and puts AccountID in `info`. Leg A's is *not* broken — the two seed types produce different AccountIDs, so the keys diverge anyway — but leg B's is explicit rather than incidentally safe, and this project has been bitten before by properties that held by accident.
- **It was executed.** Leg A's construction is unrun. Adopting an unexecuted construction and generating its vectors here would have made the adjudicator the sole author of both.
- **Its salt uses one hash function.** Leg A defines `SALT = SHA-256("WCONF-SALT-KEYGEN-v1")`, introducing SHA-256 into a construction that is otherwise pure SHA-512. Leg B uses an ASCII string directly as the HMAC key. Both are correct — HMAC accepts any key length and neither is concatenated with anything, so there is no framing ambiguity — but fewer primitives is fewer things to get wrong. **This one is close to a coin flip and is recorded as such.**

**Rejected from leg A: the `key_index` field.** Leg A adds `u32be(key_index)` to `info`, always zero, as forward-compatibility for multiple ElGamal keys per account. An always-zero field invites inconsistent later use, and the `v1` in the label is already the extension point. Dropped.

**Neither leg addressed a question the protocol raises, and the ruling now answers it.** `HolderEncryptionKey` is registered on the **`MPToken` object**, so it is per `(account, issuance)` — a holder in two confidential issuances registers a key on each. Neither leg said whether the derivation should bind `MPTokenIssuanceID`. It should not, and the reason is worth stating: per-issuance keys could only be intended to unlink a holder's positions across issuances, and the holder's AccountID is public on every one of them regardless (P-11). They would add state and a way to register the wrong key, and defend nothing. Ruling §2.4.

---

## 5. What the self leg found that both externals missed

**§(e)'s central defence rests on a premise that is false in a configuration XRPL explicitly supports, and neither external leg said so.**

The premise: *"seed compromise already means total loss of spending authority, so the marginal harm is retroactive confidentiality."*

An XRPL account may set a regular key and **disable the master key**, or enforce multi-signing through a `SignerList`. Verified at source in rippled 3.3.0 rather than recalled — the self leg flagged its own claim as unread and it has since been read: `asfDisableMaster` at `include/xrpl/protocol/TxFlags.h:421`, `lsfDisableMaster = 0x00100000` commented *"True, force regular key"* at `include/xrpl/protocol/LedgerFormats.h:142`, enforced at `src/libxrpl/tx/Transactor.cpp:1024`, with `SetRegularKey` and `SignerListSet` transactors present.

In those configurations **the master seed is not spending authority.** It may be a decommissioned credential in cold storage precisely because the holder followed standard key hygiene. Under §(e) that retired seed still derives `sk_A`, and so still yields full retroactive decryption of the entire confidential history, permanently.

- The marginal-harm argument fails **exactly for the holders who took the most care**.
- The two arms differ in **observability**, which §(e) treats as commensurable: a holder knows when a key is lost, and never knows when a seed backup has been copied.
- **The design anchors the one key that cannot be rotated to the one credential XRPL says may be retired.**

**Both externals brushed this.** Leg B says the profile "may be used only with the AccountRoot master family seed … a regular-key seed or a signer-list member seed must be refused as the derivation root" — correct, and about *which* seed to use. Leg A says multi-sign accounts have "no single master seed" and must be allowed a standalone ElGamal seed — also correct, and framed as an *availability* problem. **Neither says the retired seed remains live as a decryption credential**, which is the security consequence and the reason the onboarding flow has to change.

This became **condition 2** of the ruling, and it is the condition that obliges work: a disclosure before the first Convert, a signer check for `lsfDisableMaster` / regular key / signer list, and a standalone-seed path for those accounts.

**The three-leg shape earned its cost again**, and in the direction the record predicts: the self leg found a *mechanism*, and would have missed the vector recomputation and the reduction defect entirely.

---

## 6. Where a leg corrected the packet, and it is accepted

**Leg A, §11.1, against the packet's §5.2.** The packet argued that master-seed derivation "collapses to one secret" the two authentications on a registration transaction — the XRPL signature and the ElGamal PoK. Leg A calls this "mathematically superficial": the master seed is already the root of trust, so an adversary holding it can sign the transaction anyway, and splitting into two roots doubles the chance of unrecoverable loss without defending against a root-compromised adversary.

**Accepted. The packet's §5.2 point 2 was weak and leg A is right about the ordinary case.**

**But its general claim fails in exactly the case of §5 above**, and the two findings interlock. Where the master key is *disabled*, the master seed does **not** sign transactions — so an attacker holding only that seed cannot register or spend, and can still decrypt everything. There the two authentications do not collapse; they come apart in the attacker's favour, and leg A's premise — "the master seed is *already* the absolute root of trust" — is the thing that is false. Leg A is right about the case it considered and wrong to state it generally.

---

## 7. Conflict-of-interest check

The packet was written and is adjudicated by one session, which also closed issue #4 that morning and supplied E-66 as packet input. Both externals were pointed at this explicitly.

- **Leg A engaged**, and found the packet's §2 warning "constructive and cryptographically accurate" while rejecting §5.2's inference. A leg that contradicts the packet on one point and endorses it on another is doing the job.
- **Leg B engaged**, calling the packet "somewhat biased toward derivation" while noting it discloses the bias, and identifying the same §(e) sentence about spending authority as the underweighted claim — arriving near the self leg's §5 from a different direction, though without the disabled-master case.
- **The same test was applied to the leg that was agreed with.** Leg B's vectors were recomputed even though its construction was adopted. That is the step REVIEW-011c said would be easy to skip.
- **The adopted construction was then checked against itself**: two implementations of the adopted prose, and a negative control confirming the committed test **fails** when a single vector byte is corrupted.

**One error was caught this way, and it was the adjudicator's.** The first draft of `t-keygen-construction.ts` carried leg B's *pre-adoption* `sk_A` and `pk_A` for vector 2 while the ruling document carried the recomputed ones — the test failed 2 of 34 on first run and named the discrepancy. **The ruling was right and the test was wrong**, which is the good direction, but a test written to agree with itself would have hidden it. Fixed; the harness now passes 34/34 and exits non-zero on a corrupted vector.

---

## 8. Disposition

**Adopt `REVIEW-012-RULING-keygen-2026-08-18.md`** — leg B's construction with leg A's reduction, five conditions, and a runnable test at `tools/spike-keygen-2026-08-18/t-keygen-construction.ts` (34 assertions, negative control verified).

**Carried from leg A:** the total reduction (§3); the explicit residual-risk taxonomy, which is more complete than leg B's — as it was last round, and it was carried then too; the Argon2id and memory-lifecycle specifics in storage; the third-party-restore risk, which leg B does not name.

**Carried from leg B:** the IKM framing including `seed_type`; the single-hash salt; the refusal rules on regular-key and signer-list seeds; the executed `PRK`/`OKM64` values.

**Rejected:** leg B's abort-on-zero (§3). Leg A's `key_index` field (§4). Leg A's SHA-256 salt (§4, on simplicity, and recorded as close).

**Added in adjudication, from no leg:** the one-key-per-account ruling and its reasoning (§4, ruling §2.4); condition 2's onboarding and signer-warning obligations (§5); the note that a `v2` label bump is a fork rather than a rollout, because registered holders cannot migrate.

**Not settled here, and deliberately:** the Bulletproof's internal blinding (issue #8). Out of packet scope, and no leg strayed into it.

**Not implemented.** This adjudication rules; it does not build. No signer exists, and the ruling's construction is not wired into anything. The committed test exercises the construction over published vectors and nothing else.

---

## 9. What this does and does not do for ADR-0001

**§(e) is now ruled in both halves.** The nonce half was ruled, implemented and executed on 2026-08-18; the keygen half is ruled here. **Precondition 2 is met.**

**ADR-0001 still cannot move to `Accepted`, and the reason is narrow.** Its precondition 3 carries an agenda item that has now survived three revisions untouched: **re-weigh Option 2 (browser WASM) on risk alone**, since rev 3 established that the cost half of its rejection had collapsed. No reviewer in this rotation was asked to do it, and none did.

**This ruling supplies the decisive input without discharging the task.** Before it, the ElGamal key was an independent secret whose compromise did not touch spending authority. After it, the ElGamal key is derived from the master seed — so under Option 2 a single page compromise exposes a secret welded to the holder's root credential, permanently and unrotatable. **The keygen ruling makes Option 2's risk strictly worse than it was when the ADR rejected it.** The re-weigh is very likely a formality that confirms the existing decision, and it is still nobody's completed work, and saying so is the correct output.

**Recorded so the next session does not have to rediscover it:** that is the last item.
