# Review packet — the last item before ADR-0001 is `Accepted`, plus the A1–A3 state machine

- **Date:** 2026-08-18
- **Two questions, one rotation.** They are unrelated to each other. Answer both; do not let one colour the other.
- **Neither is a cryptography question.** Question A is a risk judgement about where code runs. Question B is a state machine that guards a cryptographic invariant, not the invariant itself.

---

## 0. Where this project stands, in one screen

A receivables financing facility on XLS-0096 Confidential MPTs, XRPL Devnet, built as an honesty artifact rather than a deployable product. Amounts are hidden from the public; **identities, counterparties, timing and frequency are not, and the issuer can always decrypt.** The architecture is `docs/architecture/ARCHITECTURE-2026-08-18.md` and it is explicitly provisional.

**Every cryptographic packet is now closed.** §(a)'s threat model is ruled (a hostile same-host process is in scope). §(e)'s sigma nonces are ruled, implemented and executed on Devnet. §(e)'s keygen half is ruled. `r` and `ρ` are ruled. Three of ADR-0001's four preconditions are met.

**One agenda item keeps ADR-0001 at `Proposed`, and it has survived three revisions without anybody being asked to do it.** That is question A. Question B is bundled because it is the last review gate in front of the signer and nobody scheduled it either.

---

# QUESTION A — re-weigh Option 2 (browser WASM) on risk alone

## A.1 What was decided, and on what

ADR-0001 §(a) asked where proof generation runs. Producing a `ConfidentialMPTSend` needs the holder's ElGamal **secret** `sk_A`, because the compact sigma proof links the balance commitment to the on-ledger ciphertext via `B₂ − b·G = sk_A·B₁` (E-33, Grade A, read in full). Whoever generates the proof holds the spending key. Three options:

| | Secret lives | Can spend | Can decrypt | Build cost |
|---|---|---|---|---|
| **1. Server-side proving** | Application server | Server | Issuer, auditor, server | Low |
| **2. Browser WASM** | Browser memory | Holder + anyone who compromises the page | Issuer, auditor | High |
| **3. Local holder-side signer** | Holder's machine | Holder | Issuer, auditor | Medium |

**Option 3 was chosen.** Option 2 was rejected on **two** grounds, stated in one sentence: *"Option 2 has the worst risk profile and the highest cost: because holder keys cannot be rotated or recovered, a single page compromise is permanent."*

## A.2 Why it is being re-opened

**Rev 3 (2026-08-16) found that the cost ground had collapsed and explicitly deferred the re-weigh:**

> *"the comparison table below now overstates Option 2's cost, and the review rotation must re-weigh it on risk alone rather than inheriting a cost argument that no longer holds."*

Rev 3, rev 4 and the keygen rotation have all passed. **No reviewer has ever been asked.** The decision is probably right; half its stated justification is retired. That is the shape of thing this project treats as unfinished, and it is the entire remaining distance between ADR-0001 and `Accepted`.

## A.3 Three things changed since the table was written. They do not all point the same way.

**This packet's job is to put all three in front of you, including the ones that argue for Option 2.** A re-weigh that only surfaces the evidence supporting the incumbent is not a re-weigh.

### Change 1 — the keygen ruling makes Option 2's risk worse. Against Option 2.

REVIEW-012 (2026-08-18) ruled that `sk_A` is **derived from the XRPL master seed** — specifically the raw 16-byte family seed, with the seed type and AccountID bound into the preimage.

- **Before:** the ElGamal key was an independent secret. A page compromise cost confidentiality of amounts. It did not touch spending authority.
- **After:** to derive `sk_A`, whatever generates proofs must hold **the root credential of the XRPL account.** Under Option 2, that is browser memory. A single page compromise now yields spending authority *and* retroactive decryption of the entire confidential history — permanently, with no rotation and no recovery (E-9, E-10, P-10).

The keygen ruling names this itself: master-seed compromise is *"the accepted cost of the ruling, not an oversight."* Option 3 accepts that cost against an adversary who must achieve code execution on the holder's machine. Option 2 would accept it against an adversary who must compromise a web origin.

### Change 2 — the cost ground did not "largely" collapse. It inverted. For Option 2.

Rev 3 understated this, and the ADR has not been updated since:

- **`@xrplf/mpt-crypto@0.1.0` is published and works** (E-53, Grade A, executed). Hex-in/hex-out TypeScript over a vendored WASM build, zero runtime dependencies. It exports all four proof generators, all four context hashes, ElGamal encrypt/decrypt, Pedersen commitments and homomorphic add/subtract.
- **`ripple-binary-codec@2.9.0` serialises everything** — all five transaction types, all 18 confidential fields, verified against a live Devnet node's `server_definitions` across all 381 fields with zero mismatches (E-30, E-46).
- **The JS client path is three published packages** — `@xrplf/mpt-crypto` + `ripple-binary-codec@2.9.0` + `ripple-keypairs` — with **no patching, no vendoring and no build step**. A `ConfidentialMPTConvert` whose every piece of proof material came from the npm package was accepted and validated on Devnet on 2026-08-17.

Meanwhile **Option 3's cost went up, materially, and by ruling.** The issue #1 threat-model ruling withdrew rev 2's pasted-token design and obliged: per-transaction confirmation rendered in the signer's own UI from the transaction the signer itself built; short-lived scoped authority; no browser-persisted bearer secret; OS-mediated IPC or native messaging preferred over localhost HTTP. That ruling says so in its own words — *"this is materially more build than the alternative, and it was chosen knowing that."* Option 3 also needs a vendored and patched C fork, an FFI binding, a Rust binary, and a distribution story it does not have.

**So the build-cost column is not merely stale in Option 2's cell. The ordering may have inverted.** On present evidence Option 2 is the cheapest path and Option 3 is the most expensive. **You are asked to weigh risk alone — but you are entitled to know that the cost argument now runs the other way, because that is exactly what makes this a real question rather than a rubber stamp.**

### Change 3 — a rescue for Option 2 that this packet is obliged to surface. Ambiguous.

Keygen condition 2 requires that, for accounts carrying `lsfDisableMaster`, a regular key or a signer list, the signer **offer an explicitly configured standalone ElGamal seed with its own backup.** That path exists and is ruled.

**If it were made general, change 1 evaporates.** A browser holding a standalone ElGamal seed does not hold the root credential, and Option 2's risk returns to what it was when the ADR rejected it.

You are asked to say whether that rescues Option 2 or merely relocates the problem. Points on both sides that this packet is not resolving for you:

- A browser-held ElGamal seed is still unrotatable and unrecoverable. Page compromise is still permanent, just narrower.
- Making the standalone path general discards §(e)'s only benefit — recoverability from a backup the holder already keeps — and reintroduces "a second thing to lose", which is the outcome §(e) was chosen to avoid.
- It would also reopen §(e), which is ruled. **Note carefully that you are not being asked to reopen it.** You are being asked whether its existence changes Option 2's risk weighting.

## A.4 Two things the original comparison never sized, and you should

**(i) The delta in required adversary capability, rather than the assertion that one is worse.** Option 3 does not eliminate secret compromise. It relocates the secret to a process on the same machine, and the issue #1 ruling is explicit that the boundary *"does not defeat an adversary who has code execution — that adversary reads `sk_A` from process memory."* The honest question is the size of the gap between:

- **Option 2's adversary:** compromise of the web origin — XSS, a malicious or compromised npm dependency in the page bundle, a hostile browser extension, a CDN or hosting compromise, a malicious service worker.
- **Option 3's adversary:** code execution on the holder's OS as the holder's user.

That gap is the whole of Option 2's risk penalty. Size it; do not inherit it.

**(ii) Option 3 carries a risk of its own that the table has no column for.** ADR-0001 §(a) names it and does not solve it: *"If the issuer writes and distributes the signer, the holder trusts the issuer's build, and 'the operator cannot spend holder funds' becomes '…provided the signer does what it claims.'"* A shipped binary is a supply chain the holder cannot inspect. A page is at least served fresh and readable. **This argues for Option 2 and has never been weighed against it.** Say whether it moves the needle.

## A.5 What to rule on

1. **Option 2 or Option 3.** On risk, argued on its own terms.
2. **If Option 3 is confirmed** — state the risk argument in a form that stands *without* the retired cost argument, because that is precisely what rev 3 said the current text cannot do. A one-line restatement of "worst risk profile" is not a discharge.
3. **Correct the table.** Whichever way you rule, the build-cost column is wrong and the ADR will carry your correction. Say what it should read, including Option 3's cell.
4. **Change 3.** Does the standalone-ElGamal-seed path rescue Option 2, relocate the problem, or neither?
5. **A.4(i) and A.4(ii).** Size the capability gap; weigh the distribution risk.
6. **Anything the ADR claims about Option 2 that is no longer true.** Rev 3 caught three false claims in this subsection and struck them. Assume there are more.

## A.6 The expected outcome, stated up front because a hidden expectation is worse than a declared one

**This project expects Option 3 to be confirmed.** Change 1 is decisive on its face: welding the proof-generation secret to the account's root credential and then putting it in a web page is a materially worse position than the one the ADR rejected.

**If you reach the opposite conclusion, say so plainly and argue it.** A re-weigh that cannot come out the other way is not a re-weigh, and this packet has deliberately handed you the two strongest arguments against its own expected outcome (changes 2 and 3). **A leg that returns "Option 3, obviously" without engaging change 2's cost inversion or change 3's rescue path has not done the task.**

---

# QUESTION B — adversarial review of amendments A1–A3

## B.1 What this is

The `r`/`ρ` ruling (REVIEW-010, adjudicated REVIEW-010c) is a byte-exact KDF, ruled and tested, with known-answer vectors that pass. **Nothing about the KDF is in question here.**

Its §7 adds a **durable local randomness ledger** — a store the signer consults before signing, to refuse a scalar it has already used. After three legs reviewed the branch carrying that ruling, the adjudicator wrote three amendments to §7. **Those amendments have been reviewed by nobody.**

Architecture §6 step 4 is explicit about why that matters: they are **state-machine rules guarding a cryptographic invariant, so they need adversarial review *before* the signer is built, not after.** No signer exists. This is the last gate in front of it.

## B.2 Why the store exists at all

E-63, executed: a passive full-ledger observer holding no keys recovered the **difference between two confidential amounts** when `r` was reused across two Sends. `C₁ = r·G` repeats on chain and is visible; subtracting the two `C₂` values annihilates the shared `r·pk` term, leaving `(m − m′)·G`, and a bounded discrete-log search returns the difference. Both bad Sends were **accepted by the ledger**. There is no ledger-side defence.

**The primary defence is 64 bytes of fresh OS entropy per signing attempt.** The store is defence-in-depth against a CSPRNG that silently repeats.

## B.3 The three amendments, verbatim in the attachment, summarised here

- **A1 — the ledger must not store `C₁` in the clear.** §7 stored `r_commit = compressed(r·G)` durably, and `C₁ = r·G` is broadcast on chain, so the file was a linkable index into the holder's on-chain activity — including attempts never broadcast. Amendment: store `HMAC-SHA-256(k_local, label ‖ value)` under a 32-byte per-installation secret `k_local`, kept with the signer's other key material. Duplicate detection is unaffected. Accepted residual: the file still reveals **how many** signing attempts occurred and **when**, to a local reader.
- **A2 — orphaned `pending` entries.** On startup the signer **promotes** every `pending` entry older than a lease interval to `committed` — promotes, never deletes. Rationale: a burned entry costs nothing, because the value it guarded was one-time and freshly derived; deleting could permit a reuse the store exists to prevent.
- **A3 — loss and corruption: degrade loudly, never brick.** On a missing or corrupt store the signer must refuse to sign until a human acknowledges it, then start a fresh store, and record the gap durably so a later audit knows there is a window in which reuse would not have been detected. It must not silently continue and must not refuse permanently.

## B.4 Specific things to attack — non-exhaustive, and finding something not on this list is worth more than answering one that is

1. **A1's threat model.** `k_local` is stored *with the signer's other key material*. The adversary A1 defends against is the same hostile same-host process that the issue #1 ruling put in scope — and that adversary can read `k_local` too. **Is A1 defence against a file-copying adversary only?** It may still be worth having; the claim needs sizing rather than assuming.
2. **A1 versus A2 — an apparent contradiction.** A1 says *"pruning bounds the window"* for the count-and-timing residual. A2 says *promote, never delete*. If entries are never deleted the store grows monotonically and forever; if they are pruned, does pruning reopen the reuse window the store exists to close? Reconcile them or find the tension real.
3. **Set integrity versus entry integrity.** A1's HMAC gives each entry integrity under `k_local`. **Nothing binds the set.** An adversary who truncates the file removes entries, and the signer sees a shorter but perfectly well-formed store. Truncation is exactly what A3's "corrupt" path is supposed to catch, and on this construction it is indistinguishable from a valid store. Is that real? What would fix it, and is the fix worth its cost given B.2's "primary defence is fresh entropy"?
4. **A3's fresh-start path as an attack surface.** Refuse-until-acknowledged, then start fresh. What does a human acknowledgement mean here, who is qualified to give it, and can it be induced repeatedly? What is presented to them?
5. **Backups and sync.** A `k_local`-keyed store that gets backed up next to `k_local` — Time Machine, cloud sync, a disk image — is not keyed against whoever holds the backup. Does A1's linkability defence survive ordinary consumer backup software?
6. **Interaction with the confirmation UI.** §3 item 1 requires per-transaction confirmation in the signer's own window. A refusal to sign originating in the randomness ledger must be legible to the holder rather than swallowed as a generic failure — otherwise the state machine's loud degradation is quiet after all. Is anything specified about this? (It is not. Say what should be.)
7. **A2's premise.** It rests on the claim that *"a retry cannot collide"*, because `r` derives from `entropy64` drawn fresh per signing **attempt**, not per transaction. Check that premise against the construction in the attachment. If it is false, A2 is wrong and the deadlock finding it corrected was right.
8. **Concurrency.** §7 requires an atomic reserve under a lock. Two signer instances, or one instance and a stale lock, or a crash between reserve and emission on a filesystem without atomic rename — is the state machine well-defined?
9. **What the store must never contain.** It holds commitments to per-transaction randomness. Confirm nothing in the specified layout reveals amount, counterparty or issuance to a local reader, and say so if it does.

## B.5 What to deliver for question B

- **Findings with severity**, each with the concrete sequence that produces the harm.
- **Corrections to A1, A2 or A3 where they are wrong** — stated precisely enough to implement from the prose alone. The standard this project applies is that a sketch fails: the finding that began the whole `r`/`ρ` rotation was *"not implementable from this text."*
- **An explicit statement of what the amended store does NOT protect against.** Prior rounds have been credited for this and it is not optional.
- **A ruling on whether the signer may be built against A1–A3 as they stand**, with or without your corrections.

---

## Attachments

- `docs/decisions/ADR-0001-key-custody-and-proof-location.md` — §(a) is question A. Read the rev 3 box before the table.
- `docs/architecture/ARCHITECTURE-2026-08-18.md` — provisional; §3 is the trust boundary, §5 says what is gated, §6 is the build sequence.
- `docs/reviews/REVIEW-010-RULING-r-and-rho-2026-08-18.md` — §7 and the amendments are question B. The KDF above §7 is context, not the subject.
- `docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md` — §7's five conditions and §8's residual risk bear on question A change 1 and change 3.
- `CLAIMS.md` — the register of what this project believes and on what evidence, with grades. **Read it or ignore it; do not take a grade on trust.** Rows most likely to matter: **P-5, P-9, P-10** (standing prohibitions), **E-9, E-10** (no rotation, no recovery), **E-30, E-46, E-53** (the collapsed cost ground), **E-33** (`sk_A` is a proof witness), **E-63** (the executed `r`-reuse attack), **E-31, E-47** (the WASM build, and `mpt_generate_keypair` not exported).

---

## Two disclosures this packet is obliged to make about itself

**Conflict of interest, partial.** This packet was written by the session that will also adjudicate it. That conflict is standing in this project and has been disclosed every round. **One conflict was deliberately removed:** issue #9 records that the session which ruled on keygen argued three times that Option 2's risk is worse, and directs that it must not frame this question. It did not. This packet was written from a cold read of the ADR and the architecture, and §A.3 changes 2 and 3 — the two arguments that cut against the expected outcome — are its own additions, present in no prior document.

**A standing bias in this project's self-review: it finds *mechanisms* and misses *instances*.** It has three times shipped a document that was true when written and false by the end of the same session. **If you find a factual claim in this packet that is stale rather than wrong-in-principle, that is the most valuable thing you can return** — particularly any package version, any published/not-published status, or any assertion about what upstream exports. Re-check registries at review time, not from the text.
