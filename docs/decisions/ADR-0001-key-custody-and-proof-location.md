# ADR-0001 — Key custody and proof generation location

- **Status:** **ACCEPTED 2026-08-18.** Revision 6. Blocks all downstream architecture.
- **Date:** 2026-08-13, factually updated 2026-08-16, review findings recorded 2026-08-17
- **History:** Rev 1 (2026-08-12) reviewed in REVIEW-001 and REVIEW-002. Rev 2 adds §(d) and §(e), corrects the justification in §(a), and specifies the process boundary. **§(d) and §(e) have been reviewed by nobody and are the weakest part of this document.**
- **Rev 3 (2026-08-16) is a factual update only. No decision was changed and no new argument was introduced.** It records that GAP-3 is closed and §(a)'s premise is confirmed; corrects three statements in §(a) that Session 1 falsified; and adds one new cryptographic requirement to §(e)'s review queue. **The cost basis on which Option 2 was rejected has materially changed — see §(a). That is for the review rotation to weigh, not for this edit to resolve.**
- **Rev 4 (2026-08-17) records two REVIEW-003 findings inline and answers neither.** §(e)'s nonce construction is **not implementable as written** (CRITICAL) and §(a)'s localhost boundary does not stop a hostile same-host process (MEDIUM). No decision changed. Both legs verbatim in `docs/reviews/REVIEW-003a-gemini-2026-08-17.md` and `REVIEW-003b-codex-2026-08-17.md`.
- **Rev 5 (2026-08-18) records the keygen ruling and is the first revision in which no argument in this document is unreviewed.** §(e)'s keygen half is **ruled** (REVIEW-012, adjudicated REVIEW-012c), which meets precondition 2 in both halves. The ruling **upholds** the proposal and **corrects §(e)'s argument for it** — see the box in §(e). **Status is still `Proposed`**, and one item keeps it there: precondition 3's re-weigh of Option 2 on risk alone, untouched since rev 3.
- **Rev 6 (2026-08-18) moves this ADR to `Accepted` and is the first revision to change the status.** Precondition 3's last agenda item — re-weigh Option 2 on risk alone — was **run and discharged**: `REVIEW-013`, two independent legs, **both ruling Option 3**, both handed the arguments against it. The rotation also **corrected this document in six places**, and those corrections are in §(a) rather than in a box: the build-cost table was inverted, four claims about Option 2 were stale, the revision number was wrong, and **one argument this document has made three times was false**. Legs verbatim in `REVIEW-013a` / `REVIEW-013b`, adjudicated in `REVIEW-013c`.
- **Context:** TASK ZERO item 4. See [TASK-ZERO-2026-08-13.md](../task-zero/TASK-ZERO-2026-08-13.md).

---

## The finding that drives everything

**In XLS-96, holder key custody controls spending authority. It does not control privacy.**

Every confidential balance is stored as parallel ciphertexts under the holder's key, the issuer's key, and optionally an auditor's key. `sfIssuerEncryptedBalance` is required on every `MPToken` with confidential fields, and `IssuerEncryptionKey` is *"Required to use the confidential transfer feature."* Compact sigma proofs force all ciphertexts to encrypt the same value, so the issuer's copy is always correct and always current. Clawback depends on this: the issuer decrypts the holder's balance from its own mirror.

**There is no configuration of XLS-96 in which a holder is private from the issuer.**

The prompt framed this as a trade-off in confidentiality. That framing does not survive the spec. Server-side proving would weaken confidentiality against a *third-party* operator; against the issuer there is nothing left to weaken. What the issuer gains from holding holder keys is not the ability to decrypt — it is the ability to **spend**.

*Correction carried from REVIEW-002 (Gemini B4): revision 1 justified this decision as "the only option under which the confidentiality claim is true as written." That sentence fused the two properties this document exists to separate. The correct statement:*

> **Local proof generation preserves holder spending authority. Issuer visibility is unchanged, because the protocol mandates issuer-readable ciphertexts.**

---

## (a) Where does proof generation run?

Producing a `ConfidentialMPTSend` requires the holder's ElGamal **secret**, because the compact sigma proof includes a balance-linkage statement *"verified via knowledge of the sender's secret key"* (spec §5.4). The holder must also decrypt their own spending balance to know what they can send.

**~~This premise is Grade C and rests on GAP-3.~~ CONFIRMED 2026-08-16, Grade A. GAP-3 is closed.** `cmpt-compact-sigma.pdf` (Dore & Cenk, RippleX Research, 2026-05-12) has been read in full. `sk_A` is a witness component of the send relation, `w = (m, r, b, ρ, sk_A)`; 2-special soundness extracts it (Thm 4.2, Relations 5–6) and knowledge soundness holds in the ROM under discrete log (Thm 4.4). See `docs/task-zero/GAP-3-compact-sigma-2026-08-16.md` and CLAIMS.md E-33.

**State the premise precisely, because the reason matters more than the fact.** The secret key is required because the *historical randomness is unavailable*, not because the statement is unprovable without it. §2.3:

> Since `(B₁, B₂)` is already on-ledger, the prover **may not know the original `r_b`**. However, the sender knows `sk_A` with `P_A = sk_A·G`, so the balance ciphertext satisfies `B₂ − b·G = sk_A·B₁`. This allows the sigma proof to link `PC_b` to the balance ciphertext **using `sk_A` rather than `r_b`**.

A prover who *did* retain `r_b` could in principle satisfy an `r_b`-based variant of the relation. That variant is not what XLS-96 specifies and not what rippled verifies. **For the deployed protocol, `sk_A` is required — but this is a property of the chosen relation, not a mathematical necessity, and the ADR should not claim otherwise.** The custody conclusion is unaffected: whoever generates the proof holds the spending key.

### The constraint that removes one option

> **⚠ Rev 3, 2026-08-16 — this subsection's factual basis has collapsed. Read the correction before the table.**
>
> Three of its four claims were falsified by Session 1 and one still stands:
>
> - ~~"no WASM target"~~ — **false.** mpt-crypto has a WASM build in CI (`.github/workflows/build-wasm.yml`) emitting dual CJS+ESM glue for `web,node` and exporting proof generation for all four proving transactions (E-31).
> - ~~"`ripple-binary-codec@2.8.0` cannot serialise these transactions"~~ — **superseded.** `2.9.0` shipped 2026-08-13 with all five transaction types and all 18 confidential fields, 18/18 codes matching our own table (E-30).
> - ~~"an Emscripten build of a library never built for that target, plus a patched codec"~~ — **false on both counts.** The Emscripten build exists upstream; no codec patch is needed.
> - ~~**"no published package" — still true.** `@xrplf/mpt-crypto` returns `Not found` on npm as at 2026-08-16 (E-32). The WASM path exists but is not installable; it must be built from the repo's own script.~~ **FALSE SINCE 2026-08-16T15:26:21Z — struck rev 6.** `@xrplf/mpt-crypto@0.1.0` was published hours after the query that produced this row (E-53). It is installable, it works, and a `ConfidentialMPTConvert` built entirely from it was accepted on Devnet. **Four of the four claims in this subsection turned out stale, not three.**
>
> **Consequence for this decision, stated but not resolved here.** Option 2 (browser WASM) was rejected on *two* grounds: worst risk profile, and highest build cost. ~~**The cost ground is largely gone.**~~ **The cost ground is gone entirely and the ordering inverted** — see the corrected table. The risk ground is untouched and remains decisive on its own — keys cannot be rotated or recovered, so a single page compromise is permanent. Rev 3 therefore does not change the decision. **But the comparison table below now overstates Option 2's cost, and the review rotation must re-weigh it on risk alone rather than inheriting a cost argument that no longer holds.**
>
> **✅ DISCHARGED 2026-08-18, rev 6 — this is the agenda item that kept the ADR at `Proposed` for three revisions.** `REVIEW-013`, two independent legs, both ruling **Option 3** and both engaging the arguments against it. The re-weigh, the corrected table and the risk-only rejection are below. Adjudicated in `REVIEW-013c`.

~~There is no client-side proving library. mpt-crypto is C/C++ on `libsecp256k1` and OpenSSL at `0.4.0-rc4`, with no bindings, no WASM target and no published package. `xrpl.js@5.0.0` and `ripple-binary-codec@2.8.0` cannot serialise these transactions at all.~~

~~A browser-WASM path therefore needs an Emscripten build of a library never built for that target, plus a patched codec, before any application logic. That is a research spike, not a milestone.~~

| | Secret lives | Can spend | Can decrypt | Build cost |
|---|---|---|---|---|
| **1. Server-side proving** | Application server | Server | Issuer, auditor, server | Low |
| **2. Browser WASM** | Browser memory | Holder + anyone who compromises the page | Issuer, auditor | High |
| **3. Local holder-side signer** | Holder's machine | Holder | Issuer, auditor | Medium |

~~*Build-cost column is stale as of rev 3 — Option 2's "High" reflected a WASM toolchain and codec patch that no longer need writing. Option 2 is still rejected, on risk.*~~

> **CORRECTED rev 6, and the column was not merely stale — it was inverted.** Both REVIEW-013 legs, independently:
>
> | | Build cost as written | **Corrected** |
> |---|---|---|
> | 1. Server-side proving | Low | **Low** |
> | 2. Browser WASM | High | **Low** — three published packages, `@xrplf/mpt-crypto@0.1.0` + `ripple-binary-codec@2.9.0` + `ripple-keypairs`, with no patching, no vendoring and no build step (E-30, E-46, E-53) |
> | 3. Local holder-side signer | Medium | **High** — a vendored and patched C fork, an FFI binding, a Rust binary, OS-mediated IPC, a separate confirmation UI, and a distribution story this project does not have |
>
> **Option 3 is the most expensive option and was chosen anyway.** Saying so is the point: a table claiming it is cheap is a claim a reader can falsify in an afternoon.

Option 1 is honest only if labelled custodial, and makes the artifact demonstrate custody rather than confidentiality.

~~Option 2 has the worst risk profile and the highest cost: because holder keys **cannot be rotated or recovered**, a single page compromise is permanent.~~

**Option 2 is rejected on risk alone. Rewritten rev 6, because half the sentence above is now false and the surviving half was never argued.** `REVIEW-013`, both legs:

1. **Option 2's adversary is remote, repeatable and scalable across holders.** XSS, a compromised transitive dependency in the page bundle, a hostile browser extension, a malicious service worker, CDN or hosting tampering. Any script execution in the origin reads `sk_A` out of linear WASM memory.
2. **Option 3's adversary needs same-user code execution on the holder's machine**, and must additionally defeat a confirmation rendered by a separate process. Both legs size that as several privilege tiers, not a marginal step. **Option 3 does not defeat that adversary** — §(a)'s boundary ruling and `CLAIMS.md` P-5 both say so — and the claim is the difference in required capability, nothing more.
3. **Compromise is permanent either way** (E-9, E-10, P-10), which is exactly why the difference in required capability is the whole argument.

**What the keygen ruling changed, stated correctly — the version this document gave three times was wrong.** ~~Before REVIEW-012 a page compromise under Option 2 cost confidentiality and not spending authority.~~ **False, and the table three lines above says so: Option 2's page "can spend".** A browser that builds and signs the outer transaction always held spending authority. The ruling's actual effect is sharper:

- **It removes Option 2's only escape hatch.** A browser needing merely an *independent* ElGamal key could have delegated outer-transaction signing to a wallet extension or a regular key and never held the master seed. REVIEW-012 §2.1 makes the **raw 16-byte master family seed** the derivation input, so proof generation itself now requires it. That mitigation is foreclosed.
- **It welds a rotatable exposure to an unrotatable one.** An XRPL signing key can be retired — `SetRegularKey`, `lsfDisableMaster`. `sk_A` cannot, at any level (P-10). After the ruling both descend from one credential and the unrotatable half governs.

**The standalone-ElGamal-seed path does not rescue Option 2** (both legs). It leaves the browser holding an unrotatable, unrecoverable key; the browser signs the outer transaction regardless; and it discards §(e)'s only benefit while adding a second thing to lose. **§(e) is not reopened by any of this.**

### Decision

**Option 3 — holder-side proof generation in a local signer, browser as a thin client.**

1. It preserves a real, testable property: the application server cannot spend holder balances.
2. ~~It avoids making a WASM toolchain a prerequisite for milestone 1. A native build is the path mpt-crypto already supports.~~ **STALE — struck rev 6.** The WASM build is published, installable and executed end to end (E-31, E-47, E-53); the **native** path is the one that hit blockers (F-9, F-18). This reason has inverted and is retired rather than reworded. The decision does not depend on it.
3. It makes the separation between XRPL account keys and ElGamal keys visible in the architecture rather than buried.

**Accepted cost.** Worse UX, narrower audience, **and the highest build cost of the three**. The right trade for an artifact whose purpose is correctness.

~~Revisit if a maintained WASM build appears.~~ **The condition has occurred and the revisit has been done.** A maintained WASM build appeared on 2026-08-16 (E-53); `REVIEW-013` re-weighed Option 2 with that in hand and confirmed Option 3. **This trigger is retired** — it has fired once and re-firing it on the same fact would relitigate a settled decision.

**One obligation this decision creates, carried over from `REVIEW-013c` §1d.** The distribution risk in the boundary section below argues *for* Option 2 and was weighed against it: a served page is mutable per request and a minified bundle plus a WASM blob is not meaningfully readable, whereas a binary can be hash-pinned, reproducibly built and signed. **That converts into work on Option 3, not a reason to choose Option 2** — signed releases, source distribution, reproducible builds. It is named here so it is not mistaken for solved.

### Process boundary — how the thin client reaches the signer

*Added rev 2. REVIEW-002 accepted ChatGPT 3.1 and Gemini B5: revision 1 asserted "the browser never receives key material" as a property while declaring a browser-only stack that cannot invoke a local binary, and specified no transport.*

The signer is a **localhost HTTP daemon**, not a library and not a browser extension.

- **Transport.** HTTP bound explicitly to `127.0.0.1` only, with an origin allowlist and a per-session token the daemon prints at startup and the user pastes once. No network listener.
- **Interface.** Narrow and value-shaped: the client sends `{issuanceID, destination, amount}`; the daemon returns a signed transaction blob. It never accepts a key as a parameter and never returns one.
- **Process boundary.** ElGamal secret material exists only inside the daemon process. Never serialised into a response, never logged, never written to disk in plaintext.
- **Zeroization.** Secret buffers zeroed after use — a Rust FFI wrapper responsibility, reviewed with the binding rather than here.
- **Stack reconciliation.** `CLAUDE.md`'s stack is web-first and cannot invoke a local binary. The signer is therefore a **separate Rust binary distributed alongside the web application**, not part of the TanStack/Elysia tree. `CLAUDE.md` amended accordingly.

**Unresolved trust assumption, named rather than solved.** If the issuer writes and distributes the signer, the holder trusts the issuer's build, and "the operator cannot spend holder funds" becomes "…provided the signer does what it claims." The demo does not solve this. Source distribution and reproducible builds would; saying so plainly is the minimum.

> **REVIEW-003b finding, 2026-08-17, severity MEDIUM. Recorded, not answered.**
>
> **The boundary above is a browser boundary, not a local-process boundary.** An origin allowlist controls *pages*; any same-host process can forge an `Origin` header. Security then rests entirely on the session token, whose secrecy, storage, lifetime and UI handling are unspecified. And because the interface is deliberately value-shaped — `{issuanceID, destination, amount}` in, a **complete signed blob** out — token exposure turns the daemon into a **spend oracle** even though no key byte ever leaves the process. The design's best property protects the key and not the authority.
>
> Two ways out, per the reviewer: state that hostile same-user local processes are out of scope for a devnet demo — defensible, but it must then be said in the README rather than implied — or add a real boundary: per-transaction confirmation in the signer's own UI showing parsed transaction details, short-lived scoped tokens, no browser-persisted bearer secret, and preferably OS-mediated IPC or native messaging instead of generic localhost HTTP.
>
> **Unresolved.** Note this interacts with §(d): the signer holds the XRPL account key too, so a spend oracle is not limited to confidential balances.

> ### ANSWERED 2026-08-18. The finding is accepted and the boundary is redesigned.
>
> **Ruling: a hostile same-host process IS in this system's threat model.** Nandan, issue #1.
>
> This closes REVIEW-003b's MEDIUM as *accepted*, not deflected. The reviewer offered two ways out — declare local processes out of scope and say so in the README, or build a real boundary. **The second was chosen.** The first was available and defensible; it was not taken.
>
> **What this obliges, and none of it is optional:**
>
> 1. **Per-transaction confirmation in the signer's own UI**, showing parsed transaction details — destination, issuance, amount — before anything is signed. This is what converts a silent spend oracle into a reviewable action. The confirmation must render what the signer is *about to sign*, not what the client *claims* it asked for.
> 2. **Short-lived, scoped tokens.** No long-lived bearer secret, and no browser-persisted one. A token authorises a bounded set of operations for a bounded time, not "any signature, forever".
> 3. **No browser-persisted bearer secret at all.** The pasted-token design of rev 2 is withdrawn.
> 4. **OS-mediated IPC or native messaging preferred over generic localhost HTTP.** Localhost HTTP remains acceptable only if 1–3 hold and the README states what it does and does not constrain. A same-host process can forge an `Origin` header; that fact does not go away by being written down.
>
> **What it forbids claiming.** None of this makes the signer safe against an adversary with code execution and patience — that adversary can read `sk_A` out of process memory regardless. `CLAIMS.md` P-5 already forbids calling any of this secure. The boundary raises the bar from *a leaked token* to *code execution on the holder's machine*, which is a real and worthwhile difference, and it is the whole of the claim.
>
> **Cost, stated plainly.** This is materially more build than the alternative, and it was chosen knowing that. It changes §(a)'s process boundary rather than adding a flag.
>
> **Consequence for §(e), which is the reason this was urgent:** the nonce construction is settled by this ruling. See §(e).

---

## (b) The three keys

Verified against spec §6, §7, §12, `sfields.macro` and `ledger_entries.macro` at 3.3.0.

**Holder key.** 33-byte compressed EC-ElGamal public key over secp256k1, generated off-chain, registered once on the first `ConfidentialMPTConvert` with a 64-byte Schnorr PoK. Both fields present together or absent together. A zero-amount convert is a valid registration. **Rotation impossible** (`tecDUPLICATE`). **Recovery: none** (spec §A.6) — balances remain valid on-ledger but permanently unspendable.

**Issuer key.** Set on the `MPTokenIssuance` via `MPTokenIssuanceSet`, optionally atomically with the enable flag. **Rotation impossible** (`tecNO_PERMISSION`), and it cannot be set at all once `sfConfidentialOutstandingAmount` exists — once anything is in confidential circulation the key set is frozen permanently.

**Auditor key.** Same permanence. Requires the issuer key present. **Exactly one auditor** (spec §A.12). If set, `sfAuditorEncryptedAmount` becomes mandatory on every Convert, Send and ConvertBack, and is covered by the same sigma proof, so the issuer cannot feed the auditor a wrong value.

**What the PoK defends against.** Rogue-key attacks. mpt-crypto states it directly: *"Proves ownership of the secret key during account registration to prevent rogue key attacks."* Without it, an account could register a key derived from another party's — shifted or combined — so that ciphertexts meant for one owner become decryptable by an attacker, or so the multi-ciphertext consistency guarantee can be subverted. Requiring knowledge of the discrete log at registration forecloses it.

**XLS-96 has no key rotation at any level.** Any design showing a rotation step is wrong. The only recovery mechanism in the protocol is issuer clawback, which **burns** the balance and reduces both OA and COA; the issuer would then re-issue publicly. Destroy-and-recreate, issuer-mediated, and the only option.

---

## (c) The custody model and its honest label

**Model.** Holder-custodied ElGamal keys, local proof generation. Issuer-operated application server, running as the funding bank. Issuer and one auditor hold permanent decryption mirrors of every holder balance — by protocol design, not by our choice.

**Honest label, for the README:**

> **Hidden:** individual balances, and the amounts moved in confidential transfers.
>
> **Public:** the sender and receiver of every transfer, always, by design. The transaction type. The token. Total supply and total confidential supply. The amount of every conversion into or out of confidential form. The fact and timing of every transfer, and therefore how often any participant transacts.
>
> **Who can decrypt every holder's balance:** the issuer, always — the mirror under the issuer's key is mandatory. The auditor, if one is named. Naming an auditor is permanent; there is no way to revoke it. ⚠ **STRUCK 2026-09-02 — this is a corpus-wide negative with no recorded search, which P-12 forbids.** The registered auditor *key* cannot be rotated (E-9); whether the auditor *designation* can later be removed **was never searched** and is a named gap.
>
> **Who can spend a holder's balance:** only that holder.
>
> **What the issuer can do without holder consent:** if `lsfMPTCanClawback` is set on the issuance, **destroy** any holder's entire confidential balance at any time — burned, not transferred. The issuer can also remove the Permissioned Domain gate unilaterally by clearing `DomainID`. Whether to set the clawback flag is this project's choice and must be disclosed either way. ⚠ **Corrected 2026-10-24 (R-11):** under `DynamicMPT` an issuer can also set `lsfMPTCanClawback` after creation, unless it has made that flag immutable, at creation or later (E-361).
>
> **If a holder loses their key:** the balance is permanently unspendable. No rotation, no recovery. ~~The only remedy is clawback, which destroys it.~~ ⚠ **STRUCK 2026-10-24 (R-11):** if the issuance allows clawback, or the issuer can still enable it, the issuer can remove the balance, and a clawback destroys it; nothing establishes that it is the only remedy.
>
> **Trusted parties:** the issuer, for supply integrity, for clawback, and for decryption of every balance. The auditor, if named, for decryption of every balance.

*Wording note (REVIEW-002, Gemini B6): the issuer **decrypts**; it does not "read." The ledger holds no plaintext balances. Use the precise verb.*

**Never used about this system:** non-custodial, trustless, private without saying private *from whom*, anonymous, identity-hiding. The spec is careful here: *"Confidential MPTs intentionally do not provide sender or receiver anonymity."*

---

## (d) XRPL account key custody

*New in rev 2. REVIEW-001 R-3: revision 1 correctly separated the ElGamal key from the XRPL account key, decided custody for the first, and silently left the second undecided — carrying exactly the unstated assumption TASK ZERO item 4 forbids.*

Two different keys, two different jobs. The ElGamal key decrypts and proves. The XRPL account key signs and submits. A party holding one and not the other has partial powers, and the README claim depends on which.

If the server held holders' XRPL account keys while holders held ElGamal keys, the server could not spend confidential balances — but it could submit `ConfidentialMPTMergeInbox` (proof-free), move the holder's *public* MPT balance, and act on the account generally. "The server cannot move holder funds" would be false.

**Decision: holders hold their own XRPL account keys, in the same local signer. No custodial mode is offered.**

The split model produces a trust story too intricate to state honestly in a README paragraph, and a reference application whose central output is an accurate trust description should not adopt an architecture that resists accurate description. The cost is onboarding friction on a devnet demo, which is acceptable.

Consequence: the signer signs as well as proves, and returns a complete transaction blob rather than a proof bundle.

---

## (e) Key generation, storage and backup

*New in rev 2. REVIEW-002 accepted ChatGPT A.1: revision 1 decided who holds the ElGamal key and never said how it is generated, stored or backed up — in a protocol where loss is permanent and rotation impossible.*

**Proposed: derive the ElGamal keypair deterministically from the holder's XRPL master seed, with explicit domain separation.** One backup then covers both keys.

**The trade-off, stated rather than hidden.** Seed compromise would then yield both spending authority *and* retroactive decryption of the holder's entire confidential history, permanently, with no rotation available. Against that: seed compromise already means total loss of spending authority, so the marginal harm is retroactive confidentiality — and the issuer already holds a decryption mirror of every balance, so confidentiality-from-an-attacker-who-has-your-seed is a narrow property to begin with. The gain is that an otherwise unrecoverable key becomes recoverable from a backup the holder already keeps.

**On balance the recovery gain outweighs the marginal confidentiality loss.** Deterministic derivation with domain separation is standard practice, and the alternative — an independently generated key with its own separate backup — raises the probability of the one failure mode that has no remedy at all.

> ### RULED 2026-08-18 — upheld, with conditions, and §(e)'s own argument corrected
>
> ~~Reviewed by nobody — and as of 2026-08-18 this is the single largest thing between this ADR and `Accepted`.~~ **Ruled the same day.** Three legs, unanimous on the decision: `REVIEW-012-RULING-keygen-2026-08-18.md`, adjudicated in `REVIEW-012c`. The nonce half was already ruled, implemented and executed. **Both halves of §(e) are now ruled and precondition 2 is met.**
>
> **The proposal above stands.** The `r`/`ρ` ruling went the other way on deriving from a long-lived secret, and it does **not** govern here: `r` is published in `BlindingFactor` and an ElGamal private key is not, and derivation here buys the only recovery mechanism the protocol permits. All three legs reached that independently.
>
> **Do not restate the construction here.** It lives in the ruling — preimage framing, KDF, reduction, refusals, two known-answer vectors, and a runnable test at `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`. A second copy of a byte-exact specification is a divergence waiting to happen (REVIEW-005c).
>
> **The ruling is conditional, and two conditions oblige work this ADR did not anticipate:**
>
> 1. **The derivation must be published in reproducible detail.** §(e)'s only benefit is that the key becomes recoverable from a backup the holder already keeps — which is **false** if the algorithm exists only in our binary. §(e) listed "standard or repository-local" as an open question of equal rank; it is not, it is a precondition on the benefit.
> 2. **§(e)'s central defence is false in a configuration XRPL supports, and the onboarding flow must change.** The paragraph above argues that seed compromise "already means total loss of spending authority, so the marginal harm is retroactive confidentiality." An account may set a regular key and **disable the master key** (`asfDisableMaster` / `lsfDisableMaster`, rippled 3.3.0), or enforce multi-signing. For those holders the master seed is **not** spending authority — and under this derivation it remains a permanent decryption credential anyway. **The marginal-harm argument fails exactly for the holders who took the most care**, and this design anchors the one key that cannot be rotated to the one credential XRPL says may be retired. The signer must disclose this before the first Convert, warn when the account has `lsfDisableMaster`, a regular key or a signer list, and offer those accounts a standalone ElGamal seed.
>
> **The trade-off paragraph above is left standing rather than edited**, because condition 2 is a correction *to* it and striking it would hide what was corrected.
>
> **Open questions from the original text, answered:** derivation function and domain-separation label — specified. Bias from reduction to the group order — negligible, below `2⁻²⁵⁶`, and the adopted reduction is **total** rather than abort-on-zero, deliberately departing from the other two rulings because a fixed seed makes an abort permanent rather than retryable. Standard or repository-local — repository-local now, published, and an XLS informational draft is the better discharge.
>
> ~~**Still not implemented.** The ruling specifies; no signer exists and no keygen code is wired into anything.~~ **IMPLEMENTED AND EXECUTED 2026-08-20** — `signer/src/keygen.rs`, reproducing both published vectors from an implementation written against the ruling's prose, and a Devnet account holding a confidential position under a derived key (`CLAIMS.md` E-118). ⚠ **Condition 1 is NOT discharged**: the derivation is specified in one repository document and is not a published standard, so §(e)'s only benefit — recoverability from a backup the holder already keeps — holds only for a holder who can reach `docs/reviews/`. Issue #10, and no code discharges it.

### Nonce generation — added rev 3, and it outranks everything else in this section

*New 2026-08-16 from `cmpt-compact-sigma.pdf` §6.1 and Remark 6.1. CLAIMS.md E-34.*

**Reusing a sigma-proof nonce leaks `sk_A`, and the compact form makes the leak invisible.** Two proofs sharing nonces under distinct challenges — or over distinct statements under the same challenge — permit witness extraction straight from the special-soundness equations. Because compact form transmits `(e, z_m, z_r, z_b, z_ρ, z_sk)` and **not** the first-round commitments, the paper states the failure "is not detectable from the proof alone": both proofs verify normally, and anyone holding the pair recovers the witness.

**Requirement on the signer, not a suggestion:**

```
~~(α_m, α_r, α_b, α_ρ, α_sk) ← HKDF(sk_A ‖ r ‖ m ‖ b ‖ ρ ‖ statement ‖ fresh entropy)~~

STRUCK 2026-08-17. NOT annotated, NOT amended — struck, on the independent
rulings of two cryptography reviewers who never saw each other's work.

This formula CAUSES the failure the surrounding paragraph quotes it to prevent.
`statement` does not include TransactionContextID as cmpt-compact-sigma.pdf
defines it; the Fiat-Shamir challenge does. So an ordinary resubmission at a
changed sequence or CB_S_Version, with cached ciphertexts, produces two proofs
sharing first-round commitments under distinct challenges — Theorem 4.2's
extraction condition. No attacker, no failing transaction, nothing observable.

It is struck rather than annotated because it was copied verbatim from the
paper's Remark 6.1, whose stated justification is itself false (CLAIMS.md F-17),
and a future session reading the paper will otherwise re-derive it.

Replaced by: docs/reviews/REVIEW-005c-adjudication-nonce-construction-2026-08-17.md
and the two rulings it adjudicates. Do not paraphrase the construction back into
this ADR — a second copy of a byte-exact specification is a divergence waiting
to happen.
```

> ### SETTLED 2026-08-18 — hedged, and implemented
>
> The one thing REVIEW-005c could not decide was deterministic (leg B) versus hedged (leg A), because it reduced to §(a)'s threat-model question. **§(a) is now answered: a hostile same-host process is in scope, which selects leg A.**
>
> **The construction is hedged**: 32 bytes of auxiliary randomness, tagged-hashed and XORed over the long-lived secret before hashing, BIP-340 style, over the deterministic core both legs agreed on.
>
> **Do not restate the construction here.** It lives in `src/mpt_internal.h` of the vendored fork (`tools/spike-2026-08-18/wconf-nonces.patch`), described — not duplicated — in `tools/spike-2026-08-18/WCONF-PATCH.md` §1. REVIEW-005c's instruction stands: a second copy of a byte-exact specification is a divergence waiting to happen.
>
> **Status: implemented and executed, not merely ruled.** A `ConfidentialMPTSend` with these nonces was accepted on Devnet (`CLAIMS.md` E-60), the patch was adversarially reviewed in two rounds, and `WCONF_HEDGE` defaults to 1 with `vendor-verify.sh` failing if that changes.
>
> **What the hedge does not buy, so nobody later thinks it did.** It protects against fault injection and a degraded-but-not-dead RNG. It does not protect against an adversary who can read process memory — that adversary has `sk_A` directly. And because the mask is a *tagged hash* of aux, a dead RNG degrades to the deterministic construction rather than to a broken one; the hedge can only add entropy, never subtract it.

Deterministic synthetic nonces over the **full** witness, RFC 6979 in spirit — **now hedged, see the box above**. The signer must never accept caller-supplied randomness through the localhost interface described in §(a) — the value-shaped interface already forbids it, and this is a second reason why.

**Why this belongs in front of §(e)'s other questions.** §(a) puts proof generation on the holder's machine, in our code. A timing side channel (TOB-RIPCTX-5, Partially Resolved) needs an adversary with local measurement. **This needs only a bug in our own signer, and produces no failing transaction, no error code, and nothing an observer harness can see.** It is the highest-severity consequence of the local-proving decision and the Cryptography Reviewer should take it before the key-derivation question.

**Testable, but only from inside:** known-answer tests over fixed witnesses, plus an explicit test that two proofs over distinct statements never share nonce material.

> **REVIEW-003b finding, 2026-08-17, severity CRITICAL. Recorded, not answered.**
>
> *"ADR-0001 turns the highest-severity signer failure into a one-line HKDF sketch."* The construction above is **not implementable from this text**. It does not specify: HKDF salt and info, the domain and version label, canonical encodings for every witness and statement field, length framing, fresh-entropy semantics and behaviour under a weak RNG, expansion into five separate scalar nonces, or the mapping into the scalar field including rejection sampling / mod-order handling. Two implementations — or one rushed Rust FFI wrapper — can collide or reuse nonce material, and by this section's own argument nothing observable will show it.
>
> The reviewer also holds that the known-answer-test language above is **incomplete**: a KAT is only meaningful if the entropy input is fixed and the exact derived `α` values are asserted, which the sentence above does not require.
>
> **This is the highest-severity finding of the whole rotation, and it landed on the item the packet ranked first.** It is not resolved here. The Cryptography Reviewer's task is now to produce a byte-exact construction, not to approve a sketch. **No signer code before that exists.**

**Storage, regardless of derivation.** The secret is never written to disk in plaintext; if cached, it is encrypted at rest under a passphrase-derived key. The onboarding flow states the no-rotation, no-recovery position **before** the holder's first `ConfidentialMPTConvert` — a transaction irreversible in three ways at once: it registers an unchangeable key, it permanently blocks deletion of the `MPToken` and locks its reserve, and it publishes the converted amount in plaintext.

---

## Consequences

- The **observer harness** is not optional. First test is F-1: recompute the canonical `EncZero` independently and confirm freshly-initialised and post-merge balances are byte-identical to it. Verified in source; confirm on a live ledger.
- An **issuer-view tool** is needed and was not in the original plan. Scoped per REVIEW-002 as a single CLI command — `tools/issuer-decrypt-balance.ts`, reading one account's `sfIssuerEncryptedBalance` and decrypting it given the issuer key — not a standalone application.
- The signer is a separate Rust binary in the tree, not part of the web application.

## Before this ADR can be accepted

1. ~~**Close GAP-3.**~~ **DONE 2026-08-16.** Paper read in full; balance linkage confirmed to require `sk_A`, with the qualification recorded in §(a). §(a)'s premise holds.
2. ~~**Cryptography Reviewer on §(e)**, before any keygen code~~ — **MET 2026-08-18, both halves.** Nonce generation ruled, implemented, reviewed twice and executed on Devnet; key derivation ruled in `REVIEW-012-RULING-keygen-2026-08-18.md`, three legs, adjudicated in `REVIEW-012c`. The original text follows for the record. **Covered two items, nonce generation first, then key derivation.** **Packet prepared 2026-08-17: `docs/reviews/REVIEW-005-REQUEST-cryptography-nonce-construction.md`.** It carries the upstream construction as input — mpt-crypto's nonces are *hedged*, not deterministic as §(e)'s sketch assumes (E-48, E-55) — and states the trade-off in both directions without taking a position. ~~Not yet run.~~ **Run 2026-08-17 and adjudicated in REVIEW-005c.**
3. ~~**Second adversarial rotation**~~ **MET 2026-08-18, rev 6.** Covering §(d), §(e) and the process boundary in §(a). **Round 1 ran 2026-08-17** (REVIEW-003a Gemini, REVIEW-003b Codex) and returned two findings against this document: the nonce construction is not implementable as written (CRITICAL) — **answered**, ruled in REVIEW-005c, implemented and executed — and the localhost boundary does not stop a hostile same-host process (MEDIUM) — **answered** by the issue #1 ruling above. ~~**Rev 3's agenda item stands: re-weigh Option 2 on risk alone, since its cost argument no longer holds** — no reviewer took it in round 1.~~ **Taken and discharged 2026-08-18 in `REVIEW-013`**, two legs, both Option 3. **Still open as an IMPLEMENTATION**, unchanged: the confirmation UI and the IPC boundary do not exist yet, and reviewing prose is not reviewing them.
4. ~~Confirm mpt-crypto builds and its tests pass on the target platform; time `test_bulletproof_agg` on stated hardware.~~ **DONE 2026-08-16.** Builds clean on macOS 26.6.1 / arm64 / Apple clang 21; 11/11 tests pass in 6.20 s; timings in `docs/task-zero/benchmarks-2026-08-16.md` (E-24, E-28). Note the Ripple Conan remote is required (F-9).

> **Status update 2026-08-18.** Preconditions 1 and 4 were already met. **Precondition 3 is met for §(a) as a DESIGN DECISION and remains open as an IMPLEMENTATION** — adversarial review flagged, correctly, that ruling the threat model does not review a confirmation UI and an IPC boundary that do not yet exist. The finding is answered; the controls it obliges are prose: REVIEW-003b's MEDIUM is answered by the issue #1 ruling above, and the boundary is redesigned rather than waived. ~~**Precondition 2 is half met**: the nonce half of §(e) is ruled, implemented, adversarially reviewed twice and executed on Devnet; the **keygen half remains unruled and is now the single largest thing between this ADR and `Accepted`**.~~ **STRUCK rev 6.** Both halves are ruled. A REVIEW-013 leg flagged that marking this block "superseded in part" was weaker than the false sentence it was guarding, and it was right. The FFI blocker (REVIEW-005c §3) is closed — issue #2, path A, merged.
>
> **Superseded in part by the 2026-08-18 rev 5 box below.**
>
> **What remains before `Accepted`:**
> 1. ~~**The keygen packet** — §(e)'s master-seed derivation proposal, still reviewed by nobody. No keygen code before it.~~ **DONE 2026-08-18.** Ruled, three legs, `REVIEW-012c`.
> 2. ~~**The randomness packet** — `r`, `ρ` and the Bulletproof, issue #3.~~ **HALF CLOSED the same day.** `r` and `ρ` are **ruled** — REVIEW-010, adjudicated in REVIEW-010c: structured fresh CSPRNG entropy, `sk_A` forbidden from the preimage because `r` is published in `BlindingFactor`. Ruled, **not implemented**. The **Bulletproof half is open** as issue #8 and is a different question. **Note the paragraph immediately below is older than this box and is superseded by it wherever they disagree** — in particular the nonce ruling is no longer blocked on §(a), and the FFI blocker is closed.
> 3. **A re-weigh of Option 2 on risk alone**, per rev 3. Still nobody has done it.

> ### Rev 5 status, 2026-08-18 — three of four preconditions met, and ONE item remains
>
> **Precondition 1** (GAP-3) and **precondition 4** (build + benchmarks): met since 2026-08-16.
> **Precondition 2** (Cryptography Reviewer on §(e)): **met today, both halves.**
> **Precondition 3** (second adversarial rotation over §(d), §(e), §(a)'s boundary): **met as a design decision.** §(a)'s MEDIUM is answered by the issue #1 ruling; §(e)'s CRITICAL is answered twice over and both halves are now ruled; §(d) drew no findings in round 1. It **remains open as an IMPLEMENTATION** — reviewing a confirmation UI and an IPC boundary that do not yet exist is not possible, and the rulings say what they must satisfy.
>
> ~~**The one thing keeping this `Proposed`:** rev 3's agenda item — **re-weigh Option 2 (browser WASM) on risk alone**, since its cost argument collapsed. Untouched across rev 3, rev 4 and this rotation; no reviewer has been asked.~~ **DONE 2026-08-18 — `REVIEW-013`, two legs, Option 3 confirmed. This box describes rev 5 and is superseded by the ACCEPTED box at the end of this section.**
>
> **The keygen ruling supplies the decisive input and does not discharge the task.** ~~Before it, the ElGamal key was an independent secret whose compromise did not touch spending authority.~~ **That clause is FALSE and was struck rev 6** — both REVIEW-013 legs caught it, and the table in §(a) says so directly: Option 2's page *"can spend"*. The correct statement of what the ruling changed is in §(a). ~~The re-weigh is very likely a formality confirming Option 3, and it is still nobody's completed work.~~ **Done 2026-08-18: `REVIEW-013`, two legs, Option 3 confirmed.**
>
> **Nothing else is outstanding.** The Bulletproof half of the randomness story (issue #8) is tracked separately and is **not** a precondition of this ADR — REVIEW-010c named keygen as the last packet, and it has landed.

~~**Still Proposed.** ~~Two~~ **three** of four preconditions met.~~

> ## ✅ ACCEPTED 2026-08-18 — all four preconditions met
>
> Precondition 3's last agenda item was run as `REVIEW-013` and discharged: **two independent legs, both ruling Option 3**, both given the two strongest arguments against it (the inverted cost table, and the standalone-ElGamal-seed rescue path) and neither moved by them.
>
> **What `Accepted` unblocks:** architecture §6 step 7 — the facility as application logic. Steps 1–4 were never behind this gate.
>
> **What it does NOT unblock, and these are separate gates:**
> - **Step 6, real key generation and onboarding**, still owes issue #10 (the derivation must be published, or §(e)'s benefit does not exist) and issue #11 (onboarding branches on ledger state — `lsfDisableMaster`, regular key, signer list).
> - **Step 4, the `r`/`ρ` construction.** `REVIEW-013` ruled the signer may **not** be built against amendments A1–A3 as they stood; they are corrected by A4–A9 in `REVIEW-010-RULING-r-and-rho-2026-08-18.md`.
> - **Three of four rulings are ruled and NOT implemented.** Only the sigma nonces have run.
> - **Precondition 3 remains open as an implementation review.** Ruling on a confirmation UI and an IPC boundary that do not exist is not the same as reviewing them.
>
> **Nothing about `Accepted` weakens `CLAIMS.md`.** P-5 still forbids calling any of this secure, non-custodial or production-ready; P-9 still forbids claiming holder-from-issuer privacy; P-10 still forbids claiming rotation or recovery.

> **The three numbered items below are all CLOSED as of 2026-08-18 and are kept only as a record of the path.** (1) The nonce ruling's dependency on §(a) — resolved by the issue #1 ruling; hedged, implemented, executed. (2) The FFI blocker — closed, issue #2 path A, merged. (3) The third packet — `r` and `ρ` ruled in REVIEW-010c, and the Bulletproof half split out as issue #8, which is not a precondition of this ADR. **Read the rev 5 box above for the current position; where the two disagree the box wins.**

**REVIEW-003b's CRITICAL on §(e) is answered as of 2026-08-17** — twice, independently — but three things followed that did not exist before:

1. **The nonce ruling is now blocked on §(a).** The two legs agree on everything except deterministic versus hedged, and that reduces entirely to whether an adversary who can fault the prover's execution is in this system's threat model. **That is §(a)'s open MEDIUM finding, not a nonce question.** Answering §(a) settles the nonce choice; leaving it open leaves the choice open.
2. **Neither construction may be implementable through the planned FFI.** Both legs found this independently: §(a) makes the signer a Rust wrapper around mpt-crypto, and mpt-crypto exposes no entry point letting a caller influence the nonce. This is the critical path — see REVIEW-005c §3.
3. **A third packet is needed before the keygen one**, covering where `r`, `ρ` and the Bulletproof randomness come from and what happens when that source fails. Both legs raised it; leg B argues it is now the larger exposure, since Convert discloses `r` on-chain and is the first irreversible transaction a holder makes. The two that remain are review — and round 1 of that review made precondition 2 *larger*, not smaller: the Cryptography Reviewer must now produce a byte-exact nonce construction rather than approve the sketch in §(e). No signer code before that exists.
