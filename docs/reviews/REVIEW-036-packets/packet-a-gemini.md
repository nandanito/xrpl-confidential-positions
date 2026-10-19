You are an adversarial design reviewer. DO NOT USE ANY TOOLS — everything you
need is inline below. There is no filesystem to read and no repository to open.

# Your job

A software project has an architecture decision record, `ADR-0003`, whose status
is `Proposed` and which has NEVER been adversarially reviewed. It rests on ONE
central claim. Your job is to attack that claim as a DESIGN ARGUMENT.

> **THE CENTRAL CLAIM:** *A tier that reads public state and holds no credential
> grants no authority that did not already exist, so no trust boundary moves, so
> the mandatory-rotation gate does not fire.*

That claim is what let the team build a web tier WITHOUT the full adversarial
rotation their own process requires for any trust-boundary change. If the claim
is wrong, they built something under a waiver they were not entitled to.

**Attack the claim itself, not the spelling.** Prose defects, tone, and
formatting are NOT what this review is for; five earlier review legs on a
different document already collected those. What is wanted is:

1. **Is the claim VALID as an inference?** Does "grants no new authority"
   actually entail "no trust boundary moves"? Is "authority" the only thing a
   trust boundary governs? Name anything a trust boundary protects that this
   inference silently drops.
2. **Are the claim's PREMISES true as stated?** "Reads public state" — is
   everything such a tier reads public? "Holds no credential" — is holding a
   credential the only way to convey what a credential produces?
3. **Is the claim's SCOPE self-serving?** The gate fires on "movement" of a
   trust boundary, and the same document decides whether movement occurred.
   Is that circular? What would a non-circular test look like?
4. **What NEW thing exists after this tier is built that did not exist before?**
   Be concrete and list them, then say for each whether the claim covers it.
5. **The document lists three things that would falsify its claim, plus a
   fourth. Is that list COMPLETE?** Name any falsifier they missed. A missed
   falsifier is the highest-value finding you can return.

## Rules of engagement

- **Grade each finding P1 / P2 / P3.** P1 = the claim is unsound or a premise is
  false. P2 = the claim survives but is materially overstated. P3 = minor.
- **Quote the sentence you are attacking.** A finding without a quotation cannot
  be acted on.
- **Say when the claim SURVIVES your attack.** A leg that upholds nothing is not
  being adversarial, it is being agreeable. If the argument is sound, say which
  part is sound and why the obvious attack fails.
- **Do not invent facts about the codebase.** You cannot see it. If a finding
  depends on how something is implemented, say "this needs source verification"
  and state exactly what to check. Another reviewer HAS the repository and will
  check what you name.

---

# CONTEXT — the project's own standing rules

These are the project's binding constraints, quoted from its own files.

## The rotation rule this ADR is claiming an exemption from

From `CLAUDE.md`:

> **Review gates — scale to irreversibility.** Architecture, trust boundaries,
> cryptographic design, anything to be published: **full adversarial rotation
> before implementation.**

> Any step-8 design that gets a browser signing confidential transactions is a
> trust-boundary change and needs a full adversarial rotation before
> implementation, not after.

## Standing prohibitions — things the project may NEVER claim

| # | Claim | Why |
|---|---|---|
| P-4 | That a Confidential MPT demo hides identities | It hides amounts and balances. Sender and receiver remain public |
| P-5 | That anything here is trustless, non-custodial, decentralised, audited, production-ready or secure | None of it is |
| P-9 | That holders are private from the issuer | The issuer's decryption mirror is mandatory. No configuration makes this false |
| P-11 | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are hidden. The counterparty graph and event timing are fully public |

## Architecture §3 — the trust boundary the ADR says does not move

> **Ruled (issue #1): a hostile same-host process IS in the threat model.**
> `REVIEW-003b` found that an origin allowlist plus a pasted session token
> constrains *pages*, not *processes*, and that a value-shaped interface makes a
> leaked token a **spend oracle**.
>
> The boundary therefore **must**:
>
> 1. **Confirm every transaction in the signer's own UI**, rendering what the
>    signer is *about to sign* — destination, issuance, amount — parsed from the
>    transaction it built, **never** echoing what the client claimed to ask for.
> 2. **Use short-lived, scoped authority.** Bounded operations, bounded time. No
>    long-lived bearer secret.
> 3. **Persist no bearer secret in the browser.** The pasted-token design is
>    **withdrawn**.
> 4. **Prefer OS-mediated IPC or native messaging** to generic localhost HTTP.
>    Localhost HTTP is acceptable only with 1–3 and an explicit README statement
>    of what it does and does not constrain.
> 5. **Never accept caller-supplied randomness.**
>
> **What this buys, and the claim stops here:** it raises the bar from *a leaked
> token* to *code execution on the holder's machine*. It does **not** defeat an
> adversary who has code execution — that adversary reads `sk_A` from process
> memory. P-5 forbids calling any of this secure.

## What the confidential protocol does and does not hide

The system is a confidential-balance protocol on a public ledger. Balances and
transfer amounts are encrypted; **who transacts, with whom, when and how often
are fully public** (P-4, P-11). The issuer holds a mandatory decryption mirror
and can decrypt every holder's balance (P-9). Two of the five transaction types
— `Convert` (moving funds INTO confidential form) and `ConvertBack` (taking them
out) — publish their amount in **plaintext** on the ledger, every time. Only a
`Send` between two confidential holders hides an amount.

There is a separate command-line signer, a Rust binary, which holds the holder's
seed and the derived decryption key, and which speaks a **Unix domain socket**.
A browser page cannot open a Unix domain socket, so a browser page cannot reach
the signer at all. That transport property is what the ADR builds on.

---

# THE SUBJECT — `ADR-0003` in full

# ADR-0003 — The web tier's trust boundary

- **Status:** Proposed. **Revision 1.** **Not adversarially reviewed.**
- **Date:** 2026-08-28
- **Context:** architecture §6 step 8, written the same day. This ADR is the *decision record*; §6 step 8 is the *step*. Where the two disagree, §6 is the authority on scope and this document is the authority on why.
- **Blocks:** nothing. It records a decision that removes a blocker rather than creating one.
- **Decided by:** the project owner, 2026-08-28, on four questions put during scoping.

⚠ **This ADR is written by the session that will implement it, and that is a weakness rather than a formality.** ADR-0001 §(d) and §(e) and ADR-0002 entered the rotation as `Proposed` for the same reason. **What makes it publishable as `Proposed` without a rotation is not the quality of the argument — it is that the decision removes authority rather than granting it**, and §3's rotation requirement is triggered by trust-boundary *movement*. See *"Why this did not need a rotation, and exactly when that stops being true"* below, which is the load-bearing section and the one to attack first.

---

## The finding that drives everything

**A browser page cannot reach this signer at all, and that is a property of the transport rather than a policy.**

`signer/src/ipc.rs` is a Unix domain socket: *"A browser page cannot connect at all. No web API opens a Unix socket."* Architecture §3 item 4 preferred OS-mediated IPC to generic localhost HTTP, and `REVIEW-003b` said why — **an origin allowlist constrains pages, not processes**, any local process can forge an `Origin` header, and the issue #1 ruling puts a hostile same-host process **in scope**. Architecture §3 rule 3 records the consequence: *"Persist no bearer secret in the browser. ADR-0001 rev 2's pasted-token design is **withdrawn**."*

So the question a web tier poses is not *"how do we secure the browser's access to the signer?"* — that question has already been asked, answered, and the answer was **do not give it any**. The live question is narrower: **what is worth building on the readable side of a boundary that will not move?**

---

## Decision

**The web tier is read-only. It never signs, and it never holds a key.**

```
Browser (TanStack Start)
   │   HTTP, localhost, READ-ONLY
   ▼
Elysia API ────────────►  rippled node (Devnet, JSON-RPC/WS)   — public ledger state
   │
   └──────────────────►  signer UDS: `Request::Status` and nothing else
```

**Signing stays in the `wconf-signer` CLI**, where the holder confirms against parsed transaction fields in the signer's own UI. That confirmation is architecture §6 step 1's falsifier and it is the actual trust boundary; nothing in this decision touches it.

Four sub-decisions, all ruled 2026-08-28.

### D1 — read-only, and never signing

The tier renders what is already readable: public ledger state at a pinned validated index, the observer view, the issuer view given a demo issuer key, the facility's run records, and the signer's own status.

⚠ **`Request::Status` is the only signer call, and its doc comment was wrong about what it does.** It read *"Public ledger read. Needs no grant and touches no secret."* **The handler performs no ledger read at all** — it returns the crate version, a hardcoded `keys_loaded`, and a note carrying the holder's address, the randomness ledger's generation id and its entry count. ⚠ **P-12's search, recorded**: `session.rs` reaches the ledger through `self.view`, `LedgerReader` and `.snapshot` (imported at `:39`, used at `:151`, `:176`, `:207`, `:301`, `:534`); grepping those four spellings over the `Request::Status` arm at `:248-258` returns **one** hit, and it is the word *"Randomness ledger"* inside the note's format string. *Touches no secret* is true and is the half this decision needs. **The description was corrected at the source rather than argued around** (`CLAIMS.md` **E-205**), because a comment that misdescribes a call is how E-200's live secret went unwiped, and this one sits directly under the sentence this ADR rests on.

**What the tier discloses that the protocol does not already publish: nothing.** P-4 and P-11 say this system hides amounts, not who transacts, with whom, when or how often. The `Status` note's entry count is activity metadata of exactly the kind the protocol leaves public.

### D2 — the browser wallet is prove-and-contrast

Connect a wallet, prove account control, render that account's **observer view**, and then show the capability matrix explaining what the wallet cannot do and why.

⚠ **A browser wallet cannot perform a confidential operation, and that is the sharpest thing the demonstration teaches.** Three of the four reasons are derivable from this repository:

1. The operation needs the **ElGamal secret** — to decrypt the balance and produce the proof — **and** the XRPL account key, to sign.
2. Under the ruled keygen (`REVIEW-012`), the ElGamal secret is **derived from the master seed**.
3. A wallet extension exists in order **not** to export seed material.

⚠⚠ **THE FOURTH REASON — that a wallet's bundled codec does not know the XLS-0096 types — WAS CHECKED AT SOURCE ON 2026-08-28 AND IS WITHDRAWN AS A PREMISE.** What the wallets' own documentation says:

- **GemWallet** publishes raw-transaction methods — `signTransaction`, `submitTransaction`, `submitBulkTransactions` — over *"transaction payloads as defined in the XRPL Protocol"*.
- **Crossmark** publishes `sign`, `submit`, `signAndSubmit`, their bulk forms and their `…AndWait` forms, over arbitrary transaction objects.
- **Xaman** accepts `txjson` **and** `txblob`, a pre-serialised HEX blob.

**So all three accept an arbitrary `TransactionType` at the API surface.** ⚠ **And the codec version is not knowable from any published source**: `npm view`, 2026-08-28, shows `@crossmarkio/sdk@0.4.0` depending on `events` and `@crossmarkio/typings` only, with `@gemwallet/api@3.8.0` and `xumm@1.8.0` likewise thin bridges — **none carries `ripple-binary-codec` or `xrpl.js` at all.** Serialisation happens inside the closed extension bundle or in Xaman's backend. Xaman's docs further say it *"can add missing fields (signer account, fee, sequence)"*, which implies parsing even on the blob path.

⚠⚠ **The point is not that reason 4 is false — it is that it was the wrong argument to lead with.** It is a **version fact that an upstream release can close at any time**; reasons 1–3 are **structural** and cannot be closed by any wallet update. **A demonstration resting on reason 4 would be falsified by a release note.** It is therefore carried as a **named gap** — in the capability matrix, in the wallet page's own copy, and here — and the decision rests on reasons 1–3 (`CLAIMS.md` **E-206**).

### D3 — TanStack Start is kept

The project owner's reasoning, and it holds: **the capital-markets case is multi-role** — issuer, auditor, supplier, facility operator, holder — and file-based routing with loaders is what lets those grow without a rewrite. SSR crosses no *new* boundary, because the Elysia API is already a local process reading holder data.

⚠⚠ **The caveat makes the gate matter more, not less. TanStack Start's server functions are exactly the mechanism by which a later session adds a signing call** — they make *"call server code from a component"* one line, and one line is the whole distance between this decision and the design `REVIEW-003b` killed. Therefore:

- **Only the Elysia process may open the Unix socket.**
- **Nothing under the web application may import a UDS client or name the socket path.** The application talks to Elysia over HTTP.
- The Elysia process constructs `Request::Status` and never `Pair` or `Prepare`.

**This is enforced by a gate, not by discipline** — `tools/check-web-readonly.ts`, built before the UI. ⚠ **It is a lexical gate over a named set and it says so**, because a gate that implies more than it checks is this repository's most-repeated defect (E-165, E-168, E-182, E-198, E-203).

### D4 — Ripple Custody: a research document and a simulated demo mode

Never an integration. ⚠ **This repository holds no Metaco Harmonize primary sources.** **P-12's search, recorded**: `grep -rli "harmonize\|metaco"` over every `.md`, `.ts`, `.rs` and `.json` outside `node_modules`, 2026-08-28, matches **three** files — the handover, this ADR and architecture §6 step 8 — **all three this project naming the deliverable, none of them a Harmonize document.** So the method is to derive from *our* side what the protocol requires of a key holder, test custodial models against that, and record every Harmonize specific as a dated named gap. **Every surface of the demo mode says it is a simulation**; *"custody-compatible"* over a stub is precisely the claim P-5 forbids.

---

## Why this did not need a rotation, and exactly when that stops being true

⚠ **This section is the one to attack.**

`CLAUDE.md`'s standing rule: *"Any step-8 design that gets a browser signing confidential transactions is a trust-boundary change and needs a full adversarial rotation before implementation, not after."* Architecture §3's gate is on **movement** of a trust boundary. The claim made here is narrow:

> **A tier that reads public state and holds no credential grants no authority that did not already exist, so no boundary moves, so the gate does not fire.**

**Three things could falsify that, and each is a rotation trigger rather than a code review:**

1. **Any path from the browser to a signing operation** — a localhost HTTP bridge, a pasted token, an origin allowlist. ⚠ **`REVIEW-003b` killed this design and architecture §3 rule 3 records it as WITHDRAWN.**
2. **Keys or proving in the page** — ADR-0001 Option 2, rejected on risk, and re-confirmed **on risk alone** by two independent legs in `REVIEW-013c`. ⚠ **Do not repeat *"Option 2 is expensive"*; the build-cost table was inverted and Option 2 is the cheapest.** It was rejected anyway, on risk.
3. **A native shell — Tauri, Electron — that opens the socket.** ⚠ **This one is defensible**: it is not a browser page, so `ipc.rs`'s property survives. **It is nonetheless out of scope for this milestone, and it is an ADR rather than a commit.**

⚠ **A fourth trigger that is easy to miss, because it is a change in what is displayed rather than in what is reachable:** the demo issuer key. The issuer view decrypts balances, and `tools/issuer-decrypt-balance.ts` already refuses to take the key on the command line. **A web tier that accepts an issuer key over HTTP has built a decryption oracle**, whatever its authority to sign. The discipline the CLI tool set is matched and not lowered.

⚠⚠ **THIS TRIGGER FIRED, AND THE SESSION THAT WROTE IT DID NOT NOTICE (`CLAIMS.md` E-212).** Hours after writing the paragraph above, the same session put `WCONF_ELGAMAL_SK` into the API process and decrypted per request behind an unauthenticated `GET`. ⚠ **The sentence was read as narrower than it is: it says *"accepts an issuer key over HTTP"*, and the author took that to mean the key ARRIVING in a request — while the oracle is the RESULT LEAVING in a response.** Both are the same trigger. **The wording is kept unchanged, because the defect was in the reading and rewriting it would hide what happened.**

**What the trigger means, stated so it cannot be read narrowly again:** ⚠ **if any request to this tier can cause a decryption, the tier is an oracle**, regardless of where the key came from, whether the caller supplies it, or whether a browser is involved. **CORS is not a defence** — it constrains browsers, and `curl` is not a browser. The remedy taken was to **remove the capability rather than guard it**: the key lives in a CLI tool, the tier reads that tool's output, and there is no request that reaches a decryption.

---

## Alternatives considered

### A signing web tier over a localhost HTTP bridge — rejected, and previously

An origin allowlist plus a session token. ⚠ **Withdrawn by architecture §3 rule 3 on `REVIEW-003b`'s finding**: an allowlist constrains pages, not processes; any local process forges an `Origin` header; and the issue #1 ruling puts a hostile same-host process in scope. **A value-shaped interface plus a leaked token is a spend oracle.** Recording it here so that a later session finds the rejection rather than rediscovering the design.

### Keys and proving in the browser (ADR-0001 Option 2) — rejected

⚠ **And the reason is not cost.** `CLAIMS.md` **E-53**: Option 2 is the *cheapest* option — three published npm packages, no patching, no vendoring, no build step — while Option 3 is the most expensive. **Option 3 was chosen on risk**, and `REVIEW-013c`'s two legs, handed the strongest arguments against it, both ruled Option 3 on risk alone. ⚠ **The keygen ruling additionally removes Option 2's escape hatch**: the page can no longer delegate signing and hold only an ElGamal key, because the derivation input is the master seed — so the design **welds a rotatable exposure to an unrotatable one**.

### A native shell that opens the socket — deferred, not rejected

See trigger 3. Defensible on the transport property; out of scope; an ADR if it is wanted.

### No web tier at all — rejected by the owner

The CLI demonstrates the protocol to someone who will read Rust. **The capability matrix — what each key source can and cannot do, and why — is the thing a capital-markets reader needs**, and it does not survive being explained in a terminal transcript.

---

## Deferred deliberately — recorded so they are not rediscovered as oversights

⚠ **Both were scoped, both were reachable, and both were left unbuilt on
purpose.** Recording the reasoning is the point: an unbuilt thing with no record
reads as a thing nobody thought of, and the next session rebuilds the argument
from scratch or, worse, builds the thing.

### Wallet connect — deferred (2026-08-28)

**What exists:** the wallet page states the three structural reasons a browser
wallet cannot hold a confidential position. **What does not:** any actual
connection to Xaman, GemWallet or Crossmark.

**Why deferred, and the first reason is the strongest:**

1. ⚠ **The argument does not need it.** The three reasons are structural — the
   operation needs the ElGamal secret and the account key; the ElGamal secret is
   derived from the master seed; a wallet exists in order not to release seed
   material. **A connected wallet would not make any of them more true**, and a
   demonstration that *needs* the connection to make its point has a weaker
   point.
2. **It can only demonstrate the half that already works.** A connected wallet
   proves account control and then shows that account's **observer view** —
   which the observer page already shows for any address. The interesting half,
   the confidential operation, is exactly what cannot happen.
3. ⚠ **It cannot be verified the way everything else here is.** It needs a real
   extension in a real browser with a funded account. There is no headless path,
   so it would be the only claim in this tier with no test that fails when it is
   false — in the milestone whose central lesson is that untested disclosure
   surfaces collect false sentences.

⚠ **Reversal condition:** build it when the demonstration is being shown to an
audience that will not accept *"a wallet cannot do this"* without watching a
wallet fail to do it. **That is a presentation requirement, not a technical
one**, and it should be named as such when it arrives.

### The custody external-signer stub — deferred (2026-08-28)

**What exists:** `web/api/custody-sim.ts` declares what a custody-shaped key
source has and lacks, and **computes** each flow's verdict from that — so a flow
added later cannot be quietly marked *"works"*. **What does not:** a stub process
that actually signs, so the surviving flows can be walked end to end.

**Why deferred:**

1. ⚠ **The two findings are structural and a stub cannot strengthen them.** A
   custodied account cannot derive its own viewing key because derivation needs
   the seed; a policy engine cannot read an amount that is a proof. **Neither is
   an integration detail a stub would expose** — see
   `docs/research/CUSTODY-2026-08-28.md`.
2. ⚠⚠ **A stub that signs is a signing path, and this tier has none.** It would
   sit outside `web/`, but the moment the demonstration wants to *drive* it from
   a page, D1 is under pressure and `tools/check-web-readonly.ts` is what stands
   in the way. **Building the stub before that question is asked is building
   toward the boundary rather than away from it.**
3. **The honest artifact already exists at a lower cost.** `facility/` drives
   real signing across five parties on Devnet, under a driver that holds every
   party's seed and **says so**. A custody stub would be a second such driver
   with a different label.

⚠ **Reversal condition:** build it when someone wants to see a **specific**
custodial flow break rather than read that it breaks — and when that happens,
**the stub belongs beside `facility/`, not under `web/`**, and the question of
what may drive it is an ADR of its own.

## What this decision does not claim

- **That a read-only tier is secure.** P-5 governs. It grants no authority; that is a narrower statement than *safe*, and the narrower one is the true one.
- **That the browser cannot reach the signer because of this decision.** It cannot reach it because of the **transport** (`ipc.rs`). This decision declines to build a bridge around that; it does not create the property.
- **That the gate proves no signing path exists.** It is a **lexical check over a named set**. A path it does not name is invisible to it, and it prints that limitation in its own output.
- **That the gate covers the tier's security.** ⚠ It checks what the tier can **reach**. It did not — and until part 4 was added, could not — see an issuer key held **inside** the API process, a listener bound to every interface, or a leaked socket. **Reachability and exposure are different properties** (E-212, E-213).
- **That SSR is a security boundary.** It is not one. Server-side rendering here is a rendering strategy; the boundary is the Unix socket and the confirmation behind it.
- **That the custody demo mode is custody.** There is no Harmonize integration, no MPC and no HSM (D4).

---

## Consequences

- **Architecture §6 step 8 is buildable now**, without a rotation, and its falsifier is the gate.
- **The signer keeps its whole authority and gains no client.** `Pair` and `Prepare` remain reachable only from a process that can open the socket.
- ⚠ **A future signing web tier is more expensive than it would have been**, because it must now argue against a recorded decision as well as design a mechanism. **That is the intended cost.**
- **`CLAUDE.md`'s stack line becomes true rather than aspirational** once step 8 is built, and the line should say when it became true.

---

## Before this ADR can be accepted

1. **An adversarial rotation on this document's central claim** — that a read-only tier moves no boundary. ⚠ **It has had none**, and the session that wrote it is the session that will build against it.
2. **The gate verified by breaking it in both directions**, with controls that run through the real detector.
3. **D2's fourth reason verified at source or recorded as a gap** — the wallet codec question.
4. **A wording test over the interface's privacy claims.** ⚠ `claims-check` is necessary and not sufficient: **the surface without a wording test is where the false sentence always lives**, and a UI is the largest disclosure surface this project has built.

---

# Return format

```
## VERDICT ON THE CENTRAL CLAIM
SOUND / SOUND BUT OVERSTATED / UNSOUND — one paragraph of why.

## FINDINGS
### F1 — [P1|P2|P3] short title
QUOTE: "the sentence you are attacking"
DEFECT: what is wrong with it
WHY IT MATTERS: the consequence if it stands
NEEDS SOURCE CHECK: yes/no — if yes, exactly what another reviewer should grep

## WHAT SURVIVES
The parts of the argument that are sound, and why the obvious attack on each fails.

## THE FALSIFIER LIST
Is the ADR's list of rotation triggers complete? Name any it missed.
```
