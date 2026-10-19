# ADR-0003 — The web tier's trust boundary

- **Status:** ⚠⚠ **ACCEPTED 2026-09-05. Revision 3.** Every acceptance precondition is discharged: the rotation ran (`REVIEW-036`, four legs) and its **round two** and a **detector spot-check** followed; the gate is verified by breaking it against the real tree; the wallet-codec question is a named gap; the wording test exists; and **the issuer route is ruled** (E-241). ⚠ **Accepted does NOT mean the central claim was upheld — it was RETRACTED and rewritten.** What is accepted is the rewritten decision: *the tier adds no signing authority*, with a disclosure boundary named, priced and closed by removal. **Revision 2.** ⚠ **ADVERSARIALLY REVIEWED 2026-09-02 — `REVIEW-036`, four legs with deliberately differed packets — AND THE CENTRAL CLAIM DID NOT SURVIVE.** All four legs ruled it **unsound as stated**: both factual premises are false against source. Revision 2 rewrites the claim, adds the falsifier the list was missing, and corrects five factual assertions. ~~⚠ **It remains `Proposed`, and one item is a RULING this document may not take for itself — see *What revision 2 does not settle*.**~~ **Superseded by revision 3 above: ruled and `Accepted` on 2026-09-05.**
- **Date:** 2026-08-28
- **Context:** architecture §6 step 8, written the same day. This ADR is the *decision record*; §6 step 8 is the *step*. Where the two disagree, §6 is the authority on scope and this document is the authority on why.
- **Blocks:** nothing. It records a decision that removes a blocker rather than creating one.
- **Decided by:** the project owner, 2026-08-28, on four questions put during scoping.

⚠ **This ADR is written by the session that will implement it, and that is a weakness rather than a formality.** ADR-0001 §(d) and §(e) and ADR-0002 entered the rotation as `Proposed` for the same reason.

⚠⚠ **REVISION 1 SAID THE SENTENCE BELOW, AND THE ROTATION FALSIFIED IT. IT IS KEPT, STRUCK, BECAUSE THE RETRACTION IS THE POINT:** ~~*"What makes it publishable as `Proposed` without a rotation is not the quality of the argument — it is that the decision removes authority rather than granting it."*~~ **STRUCK 2026-09-02 by `REVIEW-036`.** The decision does remove *signing* authority. ⚠ **It also ADDS a disclosure surface, and the sentence above is what stopped anyone looking for one** — the exemption was granted on the half of the picture the author had examined. **See *The claim, rewritten* below, which replaces the load-bearing section revision 1 offered for attack.**

---

## The finding that drives everything

**A browser page cannot reach this signer at all, and that is a property of the transport rather than a policy.**

`signer/src/ipc.rs` is a Unix domain socket: *"A browser page cannot connect at all. No web API opens a Unix socket."*

⚠⚠ **THE SECOND HALF OF THAT QUOTATION IS NO LONGER TRUE OF THIS TREE, AND THIS DOCUMENT IS WHY.** `web/api/signer-status.ts:176-192` opens the UDS, at the browser's request, when a page calls `/api/signer` (`web/app/src/routes/index.tsx:12-15` → `web/api/server.ts:73-76`). **D1's own diagram draws that arrow**, so revision 1 contradicted itself between its premise section and its decision section — found independently by `REVIEW-036b` F3 and `REVIEW-036d` F1.

⚠ **What survives is the half that carries the weight, and it is narrower than the quotation:** *a browser cannot open a Unix socket ITSELF, cannot select which request is sent, and cannot reach `Pair` or `Prepare`.* **It is a fixed, non-selectable, non-signing bridge — but it IS a bridge, and revision 1 said none was built.** Architecture §3 item 4 preferred OS-mediated IPC to generic localhost HTTP, and `REVIEW-003b` said why — **an origin allowlist constrains pages, not processes**, any local process can forge an `Origin` header, and the issue #1 ruling puts a hostile same-host process **in scope**. Architecture §3 rule 3 records the consequence: *"Persist no bearer secret in the browser. ADR-0001 rev 2's pasted-token design is **withdrawn**."*

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

The tier renders what is already readable: public ledger state at a pinned validated index, the observer view, the issuer view given a demo issuer key, and the signer's own status. ⚠ **REVISION 1 ALSO LISTED *"the facility's run records"* AND THERE IS NO SUCH ROUTE** — `web/app/src/routeTree.gen.ts:56-64` carries exactly `/`, `/api-doc`, `/capabilities`, `/custody`, `/issuer`, `/observer`, `/wallet`, and `web/api/server.ts` ends at `/capabilities`. **A decision record described shipped scope that does not exist**, found by two repo-access legs (`REVIEW-036b` F7, `REVIEW-036d` F3). No authority was added; the defect is that the document misdescribed the artifact it licensed.

⚠ **`Request::Status` is the only signer call, and its doc comment was wrong about what it does.** It read *"Public ledger read. Needs no grant and touches no secret."* **The handler performs no ledger read at all** — it returns the crate version, a hardcoded `keys_loaded`, and a note carrying the holder's address, the randomness ledger's generation id and its entry count. ⚠ **P-12's search, recorded**: `session.rs` reaches the ledger through `self.view`, `LedgerReader` and `.snapshot` (imported at `:39`, used at `:151`, `:176`, `:207`, `:301`, `:534`); grepping those four spellings over the `Request::Status` arm at `:248-258` returns **one** hit, and it is the word *"Randomness ledger"* inside the note's format string. *Touches no secret* is true and is the half this decision needs. **The description was corrected at the source rather than argued around** (`CLAIMS.md` **E-205**), because a comment that misdescribes a call is how E-200's live secret went unwiped, and this one sits directly under the sentence this ADR rests on.

⚠⚠ **REVISION 1 SAID HERE: ~~*"What the tier discloses that the protocol does not already publish: nothing … the `Status` note's entry count is activity metadata of exactly the kind the protocol leaves public."*~~ STRUCK 2026-09-02, `CLAIMS.md` E-230.** It is false. `signer/src/store.rs:753-756` commits a record *"on success **and** on any local failure before emission — a cancelled confirmation, a failed proof, an aborted attempt"*, so **`Store::len()` counts attempts that never reached the ledger and no observer can reconstruct.** The tier also emitted the **local socket path** and every candidate filesystem path it probed (`web/api/signer-status.ts:43-45`, spread by `web/api/server.ts:74-78`), until E-241 withheld them on 2026-09-05.

⚠⚠ **THIS SENTENCE SURVIVED THE FIRST FIX PASS AND WAS FOUND BY ROUND TWO — `REVIEW-037`, E-232.** The retraction was written three sections below and **this instance, in the operative Decision, was left standing**, so the document asserted in D1 what it retracted later. ⚠ **`E-168` in its purest form, and the gate that exists to catch it FALSE-PASSED**: the marker `REVIEW-036` sat twice in the six-line window — in *neighbouring citations added by the same fix pass* — and forgave the hit. **A marker naming the review that produced a retraction is worthless, because that review is cited throughout the document it corrects.**

**What is true, and it is narrower:** P-4 and P-11 leave *who transacts, with whom, when and how often* public — so the **existence** of holder activity is not a new disclosure. **The COUNT is**, and so is the path.

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

⚠⚠ **The point is not that reason 4 is false — it is that it was the wrong argument to lead with.** It is a **version fact that an upstream release can close at any time**; reasons 1–3 are **structural** and ~~cannot be closed by any wallet update~~ cannot be closed by a codec release. ⚠ The struck words overclaimed and were corrected on 2026-10-19 (`CLAIMS.md` E-328): a wallet that held the viewing key and produced the proofs itself would close all three, as the wallet page already said. **A demonstration resting on reason 4 would be falsified by a release note.** It is therefore carried as a **named gap** — in the capability matrix, in the wallet page's own copy, and here — and the decision rests on reasons 1–3 (`CLAIMS.md` **E-206**).

### D3 — TanStack Start is kept

The project owner's reasoning, and it holds: **the capital-markets case is multi-role** — issuer, auditor, supplier, facility operator, holder — and file-based routing with loaders is what lets those grow without a rewrite. SSR crosses no *new* boundary, because the Elysia API is already a local process reading holder data.

⚠⚠ **The caveat makes the gate matter more, not less. TanStack Start's server functions are exactly the mechanism by which a later session adds a signing call** — they make *"call server code from a component"* one line, and one line is the whole distance between this decision and the design `REVIEW-003b` killed. Therefore:

- **Only the Elysia process may open the Unix socket.**
- **Nothing under the web application may import a UDS client or name the socket path.** The application talks to Elysia over HTTP.
- The Elysia process constructs `Request::Status` and never `Pair` or `Prepare`.

**This is enforced by a gate, not by discipline** — `tools/check-web-readonly.ts`. ⚠ **Revision 1 said it was *"built before the UI"* and the tree cannot establish that** — gate and UI first appear together in commit `4764577` (`REVIEW-036d` F5). The claim may describe true working order; **a decision record should not assert what its own evidence cannot show.** ⚠ **It is a lexical gate over a named set and it says so**, because a gate that implies more than it checks is this repository's most-repeated defect (E-165, E-168, E-182, E-198, E-203).

### D4 — Ripple Custody: a research document and a simulated demo mode

Never an integration. ⚠ **This repository holds no Metaco Harmonize primary sources.** **P-12's search, recorded and RE-RUN**: `grep -rli "harmonize\|metaco"` over every `.md`, `.ts`, `.rs` and `.json` outside `node_modules`.

⚠⚠ **THE COUNT IS NOT STATED HERE, AND THAT IS THE FIX. THIS SEARCH IS SELF-REFERENTIAL: every document the project writes ABOUT the search adds a file TO the search.**

- **2026-08-28:** three files.
- **2026-09-02, first correction:** *"five"* — ⚠ **already false when it was committed**, because the review packets, the adjudication and the `CLAIMS.md` row recording the correction all name Harmonize (`REVIEW-037` F5).
- **2026-09-02, measured properly:** **ten** tracked files matching, or **six** excluding `docs/reviews/`.

⚠⚠ **SIXTEENTH RECORDED INSTANCE OF A RESTATED NUMBER GOING STALE, AND IT HAPPENED INSIDE THE FIX FOR THE FIFTEENTH** (`CLAIMS.md` **E-229**, corrected by **E-234**). **The predicate is what P-12 needs and the count never was:**

> **No file in this repository is a Harmonize or Metaco primary source. Every match is this project naming the deliverable.**

**Re-run it rather than reading a number:**

```sh
git ls-files -- '*.md' '*.ts' '*.rs' '*.json' | grep -v node_modules \
  | xargs grep -lie 'harmonize\|metaco'
```

⚠ **A recorded search's date is a RE-CHECK date. And a count over the project's own corpus is not a fact about the world — it is a fact about how much the project has written, which the act of recording increases.** So the method is to derive from *our* side what the protocol requires of a key holder, test custodial models against that, and record every Harmonize specific as a dated named gap. **Every surface of the demo mode says it is a simulation**; *"custody-compatible"* over a stub is precisely the claim P-5 forbids.

---

## Why revision 1 thought it did not need a rotation, what the rotation found, and when the gate fires

⚠⚠ **THIS HEADING READ *"Why this did not need a rotation"* UNTIL 2026-09-02. It needed one, it has had one, and the rotation ruled the claim in this section UNSOUND.** The section is kept — rewritten below the retraction — because *"this is the one to attack"* was the right instruction and the attack is what produced revision 2.

`CLAUDE.md`'s standing rule: *"Any step-8 design that gets a browser signing confidential transactions is a trust-boundary change and needs a full adversarial rotation before implementation, not after."* Architecture §3's gate is on **movement** of a trust boundary.

## ⚠⚠ THE CLAIM REVISION 1 MADE, AND WHY IT IS RETRACTED

> ~~**A tier that reads public state and holds no credential grants no authority that did not already exist, so no boundary moves, so the gate does not fire.**~~
> **RETRACTED 2026-09-02 — `REVIEW-036`, all four legs, unsound as stated. `CLAIMS.md` E-230, and the disclosure boundary it was hiding is E-228.**

**Both factual premises are false against source, and the inference is invalid.**

- ⚠ **"reads public state" is false.** `Request::Status` returns the randomness ledger's **entry count**, and `signer/src/store.rs:753-756` commits a record *"on success **and** on any local failure before emission — a cancelled confirmation, a failed proof, an aborted attempt."* **Public ledger history cannot reveal a declined confirmation.** The tier also emitted the local socket path and every candidate filesystem path it probed, until E-241 on 2026-09-05. **Revision 1's defence — ~~*"activity metadata of exactly the kind the protocol leaves public"*~~, STRUCK — answered a question about SENSITIVITY with the premise written about PUBLICNESS (`CLAIMS.md` E-230).**
- ⚠ **"holds no credential" is true and does not carry the weight put on it.** It is not the same property as **conveys nothing a credential produces**. The tier served `decrypted` confidential balances (until E-241, 2026-09-05), which no recipient could compute from public ledger state.
- ⚠ **"grants no authority ⇒ no boundary moves" is invalid.** A trust boundary also governs **confidentiality**, **transport exposure** and **presentation integrity**. `CLAIMS.md` **E-209** is this project's own proof of the last one: the tier rendered a Docker-hosted Gitea's `303` as its own API response. **No authority moved; the display still lied.**

## The claim, rewritten

> **This tier adds no SIGNING authority: it constructs neither `Pair` nor `Prepare`, it holds no key, and it cannot reach the holder's confirmation.**
>
> ⚠ **That property rests on THREE different things, and revision 2 first credited it to one — `REVIEW-037` F1, `CLAIMS.md` E-233:**
>
> 1. ⚠ **The TRANSPORT carries only one half** — that a *browser page* cannot open a Unix socket. **It does NOT carry the other half.** The UDS accepts `Pair` and `Prepare` from whatever process holds the descriptor, **and the Elysia process holds one**. So *"the tier sends only `Status`"* is **application discipline inside Elysia**, not a transport property.
> 2. **The GATE checks that discipline lexically, over a NAMED SET** — and ⚠ **it cannot prove a signing path does not exist**, which this document says itself under *What this decision does not claim*. ~~*"verified by `tools/check-web-readonly.ts` parts 1-3"*~~ **overstated it**; the gate **falsifies** the property, it does not verify it.
> 3. **The holder's confirmation in the signer's own UI** is what actually stands between a request and a signature, and it is untouched by this tier.
>
> ⚠ **It is NOT a claim that no boundary moved. A DISCLOSURE boundary did move**, and revision 1 neither noticed nor priced it — see trigger 5.

⚠⚠ **THE DISTINCTION THAT MATTERS, AND IT IS WHAT REVISION 1 COLLAPSED: the milestone only ever needed the signing claim, and the signing claim is sound. Revision 1 proved that and then wrote it as a universal about *authority*, which its evidence does not carry.**

**Five things are ROTATION TRIGGERS. ⚠ They are NOT all falsifiers of the rewritten claim, and revision 2 first said they were — `REVIEW-037` F2, `CLAIMS.md` E-233.**

⚠⚠ **The paradox that wording created, in the leg's own words:** *"Trigger 5 falsifies the rewritten claim; trigger 5 has already fired; therefore the rewritten claim is currently falsified"* — while the document went on asserting the claim stands. **The premise was the drafting, not the claim.**

**The distinction, stated so it cannot collapse again:**

- **Triggers 1-3 falsify the rewritten claim.** It is a claim about **signing authority**, and each of those puts a signing path in the tier.
- ⚠ **Triggers 4 and 5 do NOT falsify it. They fire a ROTATION**, because they move a boundary the rewritten claim says nothing about. **Trigger 5 has fired, the rewritten claim still stands, and both facts are true at once** — which is exactly why the rewritten claim is not a licence and why this document is still `Proposed`.
- ⚠ **A trigger is a condition requiring a rotation. A falsifier is a condition making a claim false. Revision 1 collapsed those two and that is how the exemption was granted; revision 2 did it again in one sentence.**

1. **Any path from the browser to a signing operation** — a localhost HTTP bridge, a pasted token, an origin allowlist. ⚠ **`REVIEW-003b` killed this design and architecture §3 rule 3 records it as WITHDRAWN.**
2. **Keys or proving in the page** — ADR-0001 Option 2, rejected on risk, and re-confirmed **on risk alone** by two independent legs in `REVIEW-013c`. ⚠ **Do not repeat *"Option 2 is expensive"*; the build-cost table was inverted and Option 2 is the cheapest.** It was rejected anyway, on risk.
3. **A native shell — Tauri, Electron — that opens the socket.** ⚠ **This one is defensible**: it is not a browser page, so `ipc.rs`'s property survives. **It is nonetheless out of scope for this milestone, and it is an ADR rather than a commit.**

⚠ **A fourth trigger that is easy to miss, because it is a change in what is displayed rather than in what is reachable:** the demo issuer key. The issuer view decrypts balances, and `tools/issuer-decrypt-balance.ts` already refuses to take the key on the command line. **A web tier that accepts an issuer key over HTTP has built a decryption oracle**, whatever its authority to sign. The discipline the CLI tool set is matched and not lowered.

⚠⚠ **THIS TRIGGER FIRED, AND THE SESSION THAT WROTE IT DID NOT NOTICE (`CLAIMS.md` E-212).** Hours after writing the paragraph above, the same session put `WCONF_ELGAMAL_SK` into the API process and decrypted per request behind an unauthenticated `GET`. ⚠ **The sentence was read as narrower than it is: it says *"accepts an issuer key over HTTP"*, and the author took that to mean the key ARRIVING in a request — while the oracle is the RESULT LEAVING in a response.** Both are the same trigger. **The wording is kept unchanged, because the defect was in the reading and rewriting it would hide what happened.**

**What the trigger means, stated so it cannot be read narrowly again:** ⚠ **if any request to this tier can cause a decryption, the tier is an oracle**, regardless of where the key came from, whether the caller supplies it, or whether a browser is involved. **CORS is not a defence** — it constrains browsers, and `curl` is not a browser. The remedy taken was to **remove the capability rather than guard it**: the key lives in a CLI tool, the tier reads that tool's output, and there is no request that reaches a decryption.

### 5. ⚠⚠ EGRESS — the trigger the list was MISSING, and the one that had already fired

**Added by `REVIEW-036`, found independently by the self leg and the repo-access leg.**

> **If this tier makes any datum reachable by a party who could not obtain that datum before the tier existed, the boundary has MOVED — regardless of whether the tier signs, holds a key, or performs any computation.**

⚠⚠ **THIS FIRED THE DAY THE TIER WAS BUILT AND NOBODY LOOKED, BECAUSE TRIGGERS 1-4 ALL ASK WHAT THE TIER CAN *DO*. None asks what it PUBLISHES, or to whom.**

**The project sets a per-user barrier at both sensitive resources this tier touches, deliberately, and says so at each site:**

| resource | barrier | the project's own words |
|---|---|---|
| the signer's Unix socket | `signer/src/ipc.rs:105` `set_mode(dir, 0o700)`; `:128` `set_mode(path, 0o600)` | *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic and must not be ignored"* |
| the decrypted-balance snapshot | `tools/issuer-view-snapshot.ts:272` `writeFileSync(OUT, …, { mode: 0o600 })` | owner-only, written by the tool that holds the issuer key |

**The API re-serves the product of both, unauthenticated, over a loopback listener — and loopback is not uid-scoped:**

```
issuer key
   │
   ▼
CLI decrypts ──► mode-0600 plaintext file ──► API process ──► unauthenticated loopback TCP
```

⚠ **A second local user who cannot `connect()` the `0600` socket and cannot `cat` the `0600` snapshot can `curl` both through this tier.**

⚠⚠ **The obvious rebuttal fails.** Architecture §3 concedes defeat to *"an adversary who has code execution"* — **as the holder**. The party this tier newly serves is **strictly weaker**: a different local uid, no code execution as the holder. **§3's concession does not cover them, and `ipc.rs`'s own comment is the project's evidence that it draws the line exactly there.**

⚠⚠ **This is trigger 4's lesson applied to the KEY and not to the RESULT.** E-212's correction reads *"the trigger was written about the key ARRIVING; the oracle is the RESULT LEAVING."* The remedy moved the key out and **left the result leaving**, over the same unauthenticated GET, to the same callers. **Trigger 4 is satisfied to the letter — the decryption now happens ahead of time — and the property it was protecting is not.** `CLAIMS.md` **E-228**.

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

- **That a read-only tier is secure.** P-5 governs. ⚠ **This said *"It grants no authority"* until 2026-09-02 and that is the retracted claim** (E-230). **It grants no SIGNING authority** — narrower than *safe*, narrower than *grants no authority*, and the only one of the three that is true.
- **That the browser cannot reach the signer because of this decision.** It cannot reach it because of the **transport** (`ipc.rs`). This decision declines to build a bridge around that; it does not create the property.
- **That the gate proves no signing path exists.** It is a **lexical check over a named set**. A path it does not name is invisible to it, and it prints that limitation in its own output.
- **That the gate covers the tier's security.** ⚠ It checks what the tier can **reach**. It did not — and until part 4 was added, could not — see an issuer key held **inside** the API process, a listener bound to every interface, or a leaked socket. **Reachability and exposure are different properties** (E-212, E-213).
- **That SSR is a security boundary.** It is not one. Server-side rendering here is a rendering strategy; the boundary is the Unix socket and the confirmation behind it.
- **That the custody demo mode is custody.** There is no Harmonize integration, no MPC and no HSM (D4).
- ⚠⚠ **THAT NO BOUNDARY MOVED. ONE DID.** A **disclosure** boundary moved: the tier served (until E-241, 2026-09-05), unauthenticated and to any local uid, the product of two resources the project protects with `0700`/`0600` mode bits. **It adds no SIGNING authority — that claim is sound and verified — and it is not the same claim.** See trigger 5 and *What revision 2 does not settle*.
- ⚠ **That the gate covers egress.** It checks what the tier can REACH (parts 1-3), what it HOLDS (part 4), and where it BINDS (part 6). **It does not check what the tier EMITS, or to whom**, and it now says so in its own output (item 11).

---

## Consequences

- ~~**Architecture §6 step 8 is buildable now**, without a rotation, and its falsifier is the gate.~~ ⚠⚠ **STRUCK 2026-09-02.** The rotation ran (`REVIEW-036`), the claim that excused it did not survive, and **the gate is a falsifier for the SIGNING property only** — it does not check egress and now says so in its own output. **What is true: step 8 is BUILT, its signing property holds and is gated, and its disclosure boundary is open and named.**
- **The signer keeps its whole AUTHORITY and gains no client that can exercise it.** `Pair` and `Prepare` remain reachable only from a process that can open the socket. ⚠ **Revision 1 said *"gains no client"* flatly and that is false** — `web/api/signer-status.ts` is the tier's UDS client and `check-web-readonly` part 5 counts exactly one (`REVIEW-036d` F4). The substance was right and the sentence was loose.
- ⚠ **A future signing web tier is more expensive than it would have been**, because it must now argue against a recorded decision as well as design a mechanism. **That is the intended cost.**
- **`CLAUDE.md`'s stack line becomes true rather than aspirational** once step 8 is built, and the line should say when it became true.

---

## Before this ADR can be accepted

1. ~~**An adversarial rotation on this document's central claim.**~~ ⚠ **DISCHARGED 2026-09-02 — `REVIEW-036`, four legs, differed packets. The rotation's answer is that the claim needed REWRITING, not ratifying**, and revision 2 is that rewrite. **This item is closed; item 5 replaced it.**
2. ~~**The gate verified by breaking it in both directions.**~~ **DONE, and extended.** `REVIEW-036` found the gate silent on **the loopback bind that architecture §6 step 8 names as a falsifier** (E-227) and carrying **two socket detectors that disagreed**, the narrower one wired to the whole-tier count (E-226). ⚠ **The pre-fix gate was MEASURED exiting 0 with a real second UDS client in the tree.** Both are fixed, part 6 is new, and **four** break tests against the real tree exit 1 — a `0.0.0.0` bind, a bare `listen(port)`, a LAN literal, and a `0.0.0.0` **dev-server** host. ⚠⚠ **PART 6 DOES NOT ADDRESS U1 AND MUST NOT BE READ AS DOING SO** (`REVIEW-037` F6): it checks the tier binds to **loopback**, and U1's whole point is that **loopback is not uid-scoped**. **Part 6 closes a falsifier the architecture named; the egress boundary is still open and is trigger 5's subject.** ⚠ **Round two additionally found part 6's first version checked the API and NOT `web/app/vite.config.ts`, which sets a `host` AND proxies `/api` — so a dev server on `0.0.0.0` would have published the whole API, issuer route included, to the LAN, bypassing the API's own loopback bind** (`CLAIMS.md` E-231). **Found by self-attack, not by a leg.**
3. **D2's fourth reason verified at source or recorded as a gap** — the wallet codec question. **DONE** — a named, non-load-bearing gap, verified by `REVIEW-036d` at `web/api/capability.ts:59-76` and pinned by `web/api/disclosure.test.ts:443-459`.
4. **A wording test over the interface's privacy claims.** **DONE as an artifact** — `web/api/disclosure.test.ts`. ⚠ **Its existence does not repair a false claim it does not name**, and `REVIEW-036` found five factual errors in this document that no wording test was ever going to catch.
5. ~~**NEW, AND IT IS A RULING THIS DOCUMENT MAY NOT TAKE FOR ITSELF.**~~ ⚠ **RULED 2026-09-05 — option 2, remove the disclosure. `CLAIMS.md` E-241.** The tier serves neither the decrypted figure nor the socket path. **This was the last open precondition.**

## ⚠⚠ RULED 2026-09-05 — the issuer route, and it is OPTION 2

**The project owner ruled: remove the disclosure rather than guard it.** `CLAIMS.md` **E-241**.

- **`GET /api/issuer/:account/:issuanceId` no longer returns `decrypted`.** It reports `decryptable` — *whether* the issuer could read the balance — and never the figure.
- **`GET /api/signer` no longer returns `socketPath` or the signer's `note`**, which carried the holder address, the randomness-ledger generation id and its **entry count**.

⚠ **The remedy is E-212's own, applied one layer further.** That fix moved the KEY out and left the RESULT leaving; this moves the result out too. **There is no request that reaches a decryption and none that returns one, so there is still nothing to authenticate.**

⚠ **What the demonstration keeps is the point it was making.** That the issuer *can* read any holder's balance is proved by `IssuerEncryptedBalance` being present and populated on the ledger — P-9, which no configuration removes. **The plaintext integer only ever demonstrated that THIS PROJECT holds the demo issuer key.** The figure is in `tools/issuer-decrypt-balance.ts`, which is where `CLAUDE.md` says the issuer view belongs: *"a single CLI command … Not a standalone application."*

**The falsifier is a test that fails if the figure ever crosses the boundary again** — `disclosure.test.ts`, *"the decrypted balance is NEVER served, even when the snapshot has it"*, ⚠ **verified by reverting the withholding: it fails, and it is the only test that does.**

⚠⚠ **This does NOT make the tier uid-safe. It makes it disclose nothing worth uid-protecting.** **Trigger 5 stays in the falsifier list**, because the next route someone adds is where it fires again.

---

### The options as they were priced, kept for the record

**The four options put to the owner:**

**`REVIEW-036` U1 established TWO sites, and revision 2 first carried only one into this section — `REVIEW-037` F4, `CLAIMS.md` E-233:**

1. **`GET /api/issuer/:account/:issuanceId`** served `decrypted` confidential balances (until E-241, 2026-09-05), unauthenticated, out of a file the project writes `mode 0600`.
2. ⚠ **`GET /api/signer`** returns the signer's answer **and the socket path and every candidate path probed** (`web/api/server.ts:74-78` spreads `...probe`), out from behind a directory the project sets `0700` *"to stop another **user** reaching the socket."* **Its `note` carries the holder address and the randomness ledger's count.**

⚠⚠ **Dropping the second was the same narrowing E-212 records** — *"the author read their own warning as narrower than it was"* — **committed against a finding written four hours earlier. Both sites are in scope and both are handed over.**

⚠ **A coding session may not rule on this, and this one did not.** The choice is a genuine trade and it belongs to the project owner:

- **Authenticate the route**, and accept that the demonstration now has a credential in it — which is the shape `REVIEW-003b` killed on the signing side, and the reason *"there is nothing to authenticate"* was treated as a feature when the oracle was removed.
- **Stop serving `decrypted`**, and accept that the issuer view — *"the honest counterpart to showing what the public sees"*, which `CLAUDE.md` requires — loses the number that makes the point.
- **Accept it as a named risk**, the way `E-151` extended `REVIEW-019`'s acceptance to the facility demo, and stamp every issuer response with the disclosure the way every facility run record carries `underB15Conditions: false`.
- **Move the API off loopback TCP and onto a Unix domain socket with `0600`**, which binds its reach to the same mode bits as the data. ⚠ **Revision 2 first wrote this as *"serve it only to a caller that can already read the file"* and called it *"the only option that ADDS no credential"*, which was a PHANTOM** (`REVIEW-037` F4b, `CLAIMS.md` E-233): **loopback TCP carries no peer credential** — `LOCAL_PEERCRED` is a Unix-socket facility — so on TCP the only way to prove a caller could read the file is to hand it a token FROM the file, **which is adding a credential**. The sound version of the option is a **transport change**, and it costs the browser: a page cannot open a Unix socket, which is the property this whole ADR rests on.

## ⚠⚠ Shipping without a ruling IS a choice, and it is option 3

**Round two's sharpest procedural finding, upheld** (`REVIEW-037` F3): a document cannot say *"a coding session may not rule on this"* and *"the tier ships with the boundary open"* and *"step 8 is buildable now"* — **because shipping open selects option 3 by default while keeping the appearance of having deferred.**

**Stated plainly, which is what was owed** — ⚠ *true until the ruling of 2026-09-05 below, and kept as written*: ⚠ **this project currently accepts local cross-uid disclosure of a demo issuer's decrypted balances and the signer's local metadata, on a Devnet demonstration, under P-5.** That is option 3, taken by default and now written down. **It is reversible and it is the owner's to reverse** — the other three options stay open, and the register row (E-228) is the falsifier if anyone later claims the tier discloses nothing.

⚠ ~~**`ADR-0003` stays `Proposed` on this item alone**~~ — **RULED 2026-09-05, option 2, and this document is now `Accepted`.** Every precondition is discharged.
