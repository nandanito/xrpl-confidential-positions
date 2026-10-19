# REVIEW-013c — adjudication: Option 2 re-weigh, and amendments A1–A3

- **Date:** 2026-08-18
- **Packet:** `REVIEW-013-REQUEST-option-2-and-amendments-2026-08-18.md`
- **Legs:** `REVIEW-013a` (Gemini, `--effort high`), `REVIEW-013b` (Codex, read-only sandbox). Both verbatim, neither edited.
- **Two questions, unrelated. They land in opposite places and that is the correct outcome, not a compromise.**

---

## 1. Question A — ruling: **Option 3 confirmed, on risk alone.**

**Both legs rule Option 3, independently, and neither treats it as a formality.** The re-weigh is discharged.

**The risk argument now stands without the cost argument**, which is what rev 3 asked for and what the ADR could not previously do:

1. **Option 2's adversary is remote, repeatable and scalable across holders.** XSS, a compromised transitive npm dependency in the page bundle, a hostile browser extension, a malicious service worker, CDN or hosting tampering. Any script execution in the origin reads `sk_A` out of linear WASM memory.
2. **Option 3's adversary needs same-user code execution on the holder's machine**, and must additionally defeat a confirmation rendered by a separate process. Both legs size this as multiple privilege tiers, not a marginal step.
3. **Compromise is permanent in both cases** — no rotation, no recovery (E-9, E-10, P-10) — which is precisely why the difference in required capability is the whole of the argument.

**Neither leg's ruling depends on the cost column.** Both were told the cost column had inverted, both re-derived it against Option 2, and both still ruled Option 3. That is the property the packet was written to test.

### 1a. The packet's own change-1 argument was wrong, and both legs caught it

The packet asserted, inheriting the sentence from ADR-0001's rev 5 box:

> *"Before: the ElGamal key was an independent secret. A page compromise cost confidentiality of amounts. It did not touch spending authority."*

**That is false, and it is false in the ADR too.** Gemini states it flatly, Codex conditionally. Under Option 2 the browser also builds and signs the outer XRPL transaction — ADR-0001 §(a)'s own table says Option 2's page *"Can spend"*. A page compromise under Option 2 always cost spending authority. **Upheld against the packet and against the ADR.**

**The argument survives in a sharper form, and the sharper form is the one the ADR must now carry.** The keygen ruling's effect on Option 2 is not that spending exposure is new. It is that:

- **It removes Option 2's only escape hatch.** A browser that merely needed an *independent* ElGamal key could have delegated outer-transaction signing to a wallet extension or a regular key and never held the master seed at all. Under REVIEW-012 §2.1 the derivation input is **the raw 16-byte master family seed**, so proof generation itself now requires it. That mitigation is foreclosed.
- **It welds a rotatable exposure to an unrotatable one.** An XRPL signing key can be retired — `SetRegularKey`, `lsfDisableMaster`. `sk_A` cannot, at any level (P-10). After the keygen ruling both descend from one credential, and the unrotatable half governs.

**So Option 2's risk is worse than when the ADR rejected it — for a different reason than the one three documents have been giving.** The correction is recorded rather than smoothed over, and the false sentence is struck from the ADR.

### 1b. The build-cost table is inverted. Both legs agree on the correction.

| | Build cost, as written | Corrected |
|---|---|---|
| 1. Server-side proving | Low | **Low** — unchanged |
| 2. Browser WASM | High | **Low** — three published packages, no patching, no vendoring, no build step (E-30, E-46, E-53) |
| 3. Local holder-side signer | Medium | **High** — vendored and patched C fork, FFI binding, Rust binary, OS-mediated IPC, a separate confirmation UI, and a distribution story that does not exist |

**Option 3 is now the most expensive option and was chosen anyway.** The ADR must say that, because a table claiming Option 3 is cheap is a claim a reader can falsify in an afternoon.

### 1c. The standalone-ElGamal-seed path does not rescue Option 2

**Both legs: it relocates the problem.** Three reasons, and the packet deliberately did not resolve them:

- A browser-held standalone ElGamal seed is still unrotatable and unrecoverable. Page compromise is still permanent, only narrower.
- Per §1a, Option 2's browser signs the outer transaction regardless, so the account remains exposed with or without the standalone seed.
- It discards §(e)'s only benefit — recoverability from a backup the holder already keeps — and reintroduces a second unrotatable thing to lose, which is the outcome §(e) exists to avoid.

**§(e) is not reopened.** It was not asked to be, and nothing here disturbs it.

### 1d. Signer distribution — the argument that cuts for Option 2, weighed and rejected

Both legs weigh it and both reject it as decisive, on the same ground: **"a page is auditable" is not true of a minified bundle plus a WASM blob**, and web delivery is *mutable per request* — a compromised host can serve a malicious bundle to one targeted holder. A binary can be hash-pinned, reproducibly built and signed. **The risk is real and it converts into an obligation on Option 3, not a reason to choose Option 2:** signed releases, source distribution and reproducible builds. ADR-0001 §(a) already names the trust assumption and still does not solve it; it now also carries what would.

### 1e. Stale claims in ADR-0001 §(a), upheld and struck

Both legs, independently, on all four:

- *"no published package — still true"* — **false since 2026-08-16T15:26:21Z** (E-53).
- *"highest cost"* — **false**, see §1b.
- *"avoids making a WASM toolchain a prerequisite for milestone 1"* — **stale**. The WASM build is published and executed; the native path is the one that hit blockers (F-9, F-18).
- *"Revisit if a maintained WASM build appears"* — **the condition has already occurred.** It is retired and replaced by the ruling above.

Two document defects, also upheld:

- **The ADR header says "Revision 4" while the document carries a rev 5 history entry and a rev 5 status box** (Codex). Real.
- **The "Status update 2026-08-18" block still reads "Precondition 2 is half met… the keygen half remains unruled and is now the single largest thing between this ADR and `Accepted`"** (Gemini). It is marked *"Superseded in part"*, so a careful reader is warned — **but the marking is weaker than the false sentence it guards.** Partly upheld; the false clause is struck rather than left to the marking.
- **Architecture §6 step 5 says the ADR gate "Requires the keygen ruling"** (Codex). Stale — §5 of the same document already says the remaining gate is this re-weigh. Real.

### 1f. One reviewer claim REJECTED, with the reason, so it is not relitigated

**Gemini, "Stale or wrong" item 4:** that REVIEW-012 §2.1's `deriveKeypair(family_seed)` needs an explicit `{ algorithm: 'ed25519' }` and otherwise *"generates an invalid secp256k1 keypair or throws"*.

**Refuted by execution, 2026-08-18.** `ripple-keypairs.deriveKeypair("sEdSJHdnVumf99WfaHTnU8DaQkx5Q4n")` returns a 66-char public key with the `ED` prefix — an ed25519 key — with no algorithm option passed. The algorithm is carried by the seed's own encoding and recovered by `decodeSeed`, which is why §2.1 reads `decoded.type` separately. **REVIEW-012 §2.1 is correct as written and is not changed.** (→ E-71.)

---

## 2. Question A disposition

**ADR-0001 moves to `Accepted`.** Precondition 3's last agenda item is discharged: two independent legs, both ruling Option 3, both engaging the arguments against it.

**What is carried into the ADR:** the corrected table (§1b), the risk-only rejection (§1), the sharper change-1 argument (§1a), the distribution obligation (§1d), and the four struck claims plus two document defects (§1e).

---

## 3. Question B — ruling: **the signer may NOT be built against A1–A3 as they stand.**

**Both legs, independently, reach the same disposition and converge on four of the same defects.** This is the second review round on this state machine and it found real defects in round one's fixes — which is the pattern `CLAUDE.md` records and expected.

### 3a. Findings upheld

**B-I — the set is not authenticated; truncation and rollback are undetectable. HIGH. Both legs.**
A1 HMACs each entry under `k_local`. Nothing binds the *set*. An adversary — or a VM snapshot restore, or a backup rollback — truncates the store; every surviving entry still verifies, so A3's corruption path never fires. Truncation is exactly what A3 exists to catch and is indistinguishable from a valid store. **Both legs propose the same fix shape: a hash-chained authenticated append-only log with an authenticated header.**

**B-II — A1's "pruning bounds the window" contradicts A2's "promote, never delete". HIGH/MEDIUM. Both legs.**
As written an implementer can read A1 as licence to prune committed entries, which reopens the reuse window the store exists to close. Read the other way the store grows without bound and the pre-sign check degrades linearly. **Both legs: identifiers are append-only for the installation lifetime; only metadata may be pruned.**

**B-III — A3's fresh-start path is underspecified and inducible. HIGH. Both legs.**
Acknowledgement has no specified interface. If it can arrive over IPC, a hostile local process corrupts the store and acknowledges its own reset. If it is a plain modal, repeated induced corruption produces alert fatigue. **Codex adds the sharper half neither the packet nor Gemini raised: if the gap record lives inside the store being reset, the adversary deletes that too, and the audit trail the amendment promises does not exist.**

**B-IV — A1's protection is overclaimed against the in-scope adversary. Both legs.**
`k_local` is stored "with the signer's other key material". The hostile same-host process that A1 cites as its motivation can read `k_local` as well as the store. **A1 is an offline-file-copy and backup-hygiene defence.** It is still worth having; the claim must be sized to what it does.

**B-V — §7 step 7 contradicts A2 outright. LOW. Gemini only, and it is real.**
§7 step 7: *"clear `pending` only on a hard local failure before emission."* A2: *promotes, never deletes.* A local failure before emission — a cancelled confirmation, a failed proof — hits both rules at once. **A2 wins:** the scalar was one-time and freshly derived, so burning it is free and deleting it is not.

**B-VI — lease expiry races the human confirmation. MEDIUM. Gemini only, and it is real.**
The entry is reserved `pending` *before* proof generation and signing, and the confirmation UI (§3 item 1) waits on a human. A holder who steps away past the lease interval has their live entry promoted by a startup sweep, and the signing path then sees its own reservation as a collision. **The confirmation timeout must be strictly shorter than the lease, and promotion must be idempotent.**

**B-VII — a randomness-ledger refusal must not be swallowed. Both legs.**
Nothing specifies how a store failure surfaces. Returned as a generic error over IPC, the web client shows "transaction failed, please retry" and the amendment's *loud* degradation is quiet. It must render in the signer's own window, and the IPC error must be distinguishable.

### 3b. One packet claim corrected by a leg

**Codex, against packet §B.2:** *"the store is defence-in-depth against a CSPRNG that silently repeats"* is **overstated**. REVIEW-010 Deliverable A binds `entropy64` together with `TransactionContextID` in the HKDF preimage, so repeated entropy across *different* contexts does not produce a repeated scalar. **What the store actually catches is exact-context repeats, rollback, and implementation bugs.** Upheld. It narrows the store's stated value without weakening A3's conclusion — the primary defence is still fresh entropy per attempt, which is precisely why losing the store must not brick the signer.

### 3c. Disposition, and where review stops

**A1–A3 are amended by A4–A8, written below into `REVIEW-010-RULING-r-and-rho-2026-08-18.md`, which is their one canonical home.** Nothing in the KDF, preimage, reduction, abort behaviour or known-answer vectors is touched, so `t-r-and-rho-construction.ts` is unaffected and still passes.

**These corrections are adjudicated and unreviewed, and that is a deliberate stop rather than an oversight.** `CLAUDE.md`'s gate: *"Two rounds is the right number… the second round reviews the FIXES… A third round would review the fixes to the fixes; that is where it stops paying."* The A1–A3 block was round one's fixes. This rotation is round two, and it reviewed them and found six real defects. **The next artifact that touches this state machine is the implementation and a test that fails if it is not followed — not a third packet.** Recorded as a judgement so a later session can disagree with it knowingly.

**Architecture §6 step 4 is satisfied by this rotation** — the amendments have now had the adversarial review it required before the signer is built.

---

## 4. What each leg contributed that the other did not

**Gemini:** the change-1 refutation stated unconditionally (§1a); the §7-step-7 / A2 contradiction (B-V); the lease-versus-confirmation race (B-VI); the ADR's internal precondition-2 contradiction. Also the one rejected claim (§1f).

**Codex:** the gap record must live outside the store being reset (B-III); the correction to the packet's own defence-in-depth framing (§3b); the ADR revision-number defect; the stale Architecture §6 step 5. It also reported honestly that it could not reach npm or crates.io from its sandbox and that indexed third-party sources disagreed with the local lockfile — **a named gap rather than a backfilled answer**, which is the behaviour this project asks for.

**Neither leg found a reason to overturn Option 3, and both were handed the arguments to do it with.**
