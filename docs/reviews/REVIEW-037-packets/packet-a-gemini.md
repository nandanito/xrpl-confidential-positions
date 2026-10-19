You are an adversarial reviewer. DO NOT USE ANY TOOLS — everything is inline.

# ROUND TWO — you are reviewing a FIX, and the fix is an ARGUMENT

A project's architecture decision record made a central claim. An adversarial
rotation ruled it unsound. The document was then rewritten. **Your job is to
attack the REWRITE.**

⚠ **The specific failure mode you are hunting: a fix that overstates what it
established, or that replaces a bad argument with a subtler bad argument.** This
project's own recorded history is that "fixing something and describing the fix
are separate acts with separate failure modes."

## Attack these, in order

1. **The REWRITTEN claim.** The retracted claim was *"a tier that reads public
   state and holds no credential grants no authority that did not already exist,
   so no trust boundary moves."* It is replaced by a narrower claim about
   **signing authority**. ⚠ **Is the replacement sound? Is it complete? Does it
   carry the same defect one level down?** Is it *verifiable*, and by what?
2. **The new fifth trigger (EGRESS).** Is it correctly stated? Is it too broad to
   be actionable — would it fire on anything at all, including things that should
   not trigger a rotation? Is it too narrow? **A trigger that fires on everything
   is not a trigger.**
3. **Does the rewrite overstate its own fixes?** Every sentence claiming
   something was fixed, measured or verified is a claim. Which are load-bearing
   and which are decoration?
4. **Is the handover of the issuer-route decision honest, or is it a way of not
   deciding?** Four options are offered. Are they the real options? Is one
   obviously right and being disguised as a genuine choice?
5. **What did the rewrite NOT fix?** Read what the document still asserts.

⚠ **Do not re-litigate round one.** Its findings are settled and are given below
only as context. **Attack the fix.**

Grade P1/P2/P3, quote what you attack, and include a section on **what you
attacked and could not break** — a leg that upholds nothing is being agreeable,
not adversarial.

---

# ROUND ONE'S RULING (context — settled, not for re-litigation)

# REVIEW-036c — adjudication: `ADR-0003`'s central claim is UNSOUND AS STATED

- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1
- **Legs:** `REVIEW-036a` (Gemini, document only), `REVIEW-036b` (Codex, repo),
  `REVIEW-036d` (Codex, repo, promises), `REVIEW-036s` (self)
- **Frozen at:** `5f8cf42`

## RULING

**All four legs returned the same verdict independently: the central claim is
UNSOUND AS STATED.** Not overstated — unsound: **both of its factual premises are
false against source**, and its inference drops properties a trust boundary
governs.

> *A tier that reads public state and holds no credential grants no authority
> that did not already exist, so no trust boundary moves.*

⚠⚠ **What the claim proves, it proves about SIGNING — and it was written as a
universal about AUTHORITY.** Every leg agreed the signing half is sound: the
transport property holds, `Pair` and `Prepare` are unreachable, and the holder's
confirmation is untouched. **The tier adds no signing authority.** The ADR
established that, and then stated it as a general claim its own evidence does not
carry.

**13 findings upheld, 2 rejected, 1 partly upheld.** The rotation did **not**
find that step 8 should be torn out. It found that the *waiver* was granted on a
claim that does not survive contact, and that **the boundary which actually moved
is a DISCLOSURE boundary that nothing in the ADR, and nothing in the gate,
looks at.**

---

## THE HEADLINE — U1

### U1 — [P1] THE TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY, IN TWO PLACES, EACH WITH A COMMENT SAYING WHY

**Found independently by leg s and leg b.** Leg b drew it as a pipeline; leg s
found it from the mode bits. **Leg a could not see it** — it had no tree — which
is the differed-packet design working exactly as intended.

The project enforces a **per-user** barrier at both sensitive resources this
tier touches, and says so at each site:

| resource | barrier | the project's own words |
|---|---|---|
| the signer's Unix socket | `signer/src/ipc.rs:105` `set_mode(dir, 0o700)`; `:128` `set_mode(path, 0o600)` | *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic and must not be ignored"* (`:100-104`) |
| the decrypted-balance snapshot | `tools/issuer-view-snapshot.ts:272` `writeFileSync(OUT, …, { mode: 0o600 })` | owner-only, written by the tool that holds the issuer key |

**The web API re-serves the product of both over an unauthenticated loopback TCP
listener that every local uid can reach:**

| link | evidence |
|---|---|
| `GET /api/signer` returns the socket's answer **and the socket path** | `web/api/server.ts:74-78` spreads `...probe`; `web/api/signer-status.ts:43-45` |
| `GET /api/issuer/:account/:issuanceId` returns `decrypted` balances | `web/api/issuer.ts:162-170` |
| **No authentication of any kind** | zero auth constructs in `web/api/*.ts`; leg b: CORS *"does not reject a disallowed or origin-less request"* |
| Reachable by any local uid | `web/api/server.ts:177,180` — `BIND_HOSTNAME = "127.0.0.1"`; **loopback is not uid-scoped** |

Leg b's pipeline, which is the clearest statement of it:

```
issuer key
   │
   ▼
CLI decrypts ──► mode-0600 plaintext file ──► API process ──► unauthenticated loopback TCP
```

⚠⚠ **A second local user who cannot `connect()` the `0600` socket and cannot
`cat` the `0600` snapshot can `curl` both through this tier.**

### Why the obvious rebuttal fails

Architecture §3: *"It does not defeat an adversary who has code execution — that
adversary reads `sk_A` from process memory."*

⚠ **That concession is to an adversary with code execution AS THE HOLDER.** The
party this tier newly serves is **strictly weaker** — a different local uid, no
code execution as the holder, who could not open a `0700` directory and now does
not need to. **§3's concession does not cover them, and `ipc.rs`'s own comment is
the project's evidence that it draws the line exactly there.** Both repo legs
reached this independently; leg b states it as *"a different UID gains access to
data formerly protected by mode `0600`; a hostile same-UID process already
could."*

⚠⚠ **This is E-212's lesson applied to the KEY and not to the RESULT.** E-212's
correction reads *"the trigger was written about the key ARRIVING; the oracle is
the RESULT LEAVING."* The remedy moved the key out and left the **result** leaving,
over the same unauthenticated GET, to the same callers. **The ADR's restated
trigger — *"if any request to this tier can cause a decryption, the tier is an
oracle"* — is satisfied to the letter, because the decryption now happens ahead
of time. The property it was protecting is not.**

---

## UPHELD — the claim's own premises

### U2 — [P1] PREMISE 1 IS FALSE: THE TIER EMITS STATE THAT IS NOT PUBLIC

**All four legs.** Leg b enumerated every endpoint and classified every field;
its table is the evidence and is reproduced in `REVIEW-036b`.

The decisive instance, which leg b found and leg s had only hypothesised:

⚠⚠ **`Store::len()` counts attempts that NEVER REACHED THE LEDGER.**
`signer/src/store.rs:753-756` — `commit` is *"called on success **and** on any
local failure before emission — a cancelled confirmation, a failed proof, an
aborted attempt."* `Store::len()` returns `self.records.len()` (`:703-707`) and
that count leaves over HTTP via `Request::Status` (`signer/src/session.rs:248-257`).

⚠ **Public ledger history cannot reveal a declined confirmation or a failed
proof.** So the ADR's defence — *"the entry count is activity metadata of exactly
the kind the protocol leaves public"* (P-4, P-11 leave *how often* public) — **is
specifically wrong**, not merely loose. It is an argument about SENSITIVITY
answering a premise about PUBLICNESS, and the two come apart at a measurable
point.

Also emitted and not public: the **local socket path** (`signer-status.ts:43-45`,
on macOS the per-user `/var/folders/<hash>/T/…`), the failure `reason` carrying
every candidate filesystem path probed, and the configured ledger endpoint.

---

# THE REWRITTEN DOCUMENT — ADR-0003 revision 2, in full

# ADR-0003 — The web tier's trust boundary

- **Status:** Proposed. **Revision 2.** ⚠ **ADVERSARIALLY REVIEWED 2026-09-02 — `REVIEW-036`, four legs with deliberately differed packets — AND THE CENTRAL CLAIM DID NOT SURVIVE.** All four legs ruled it **unsound as stated**: both factual premises are false against source. Revision 2 rewrites the claim, adds the falsifier the list was missing, and corrects five factual assertions. ⚠ **It remains `Proposed`, and one item is a RULING this document may not take for itself — see *What revision 2 does not settle*.**
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

**This is enforced by a gate, not by discipline** — `tools/check-web-readonly.ts`. ⚠ **Revision 1 said it was *"built before the UI"* and the tree cannot establish that** — gate and UI first appear together in commit `4764577` (`REVIEW-036d` F5). The claim may describe true working order; **a decision record should not assert what its own evidence cannot show.** ⚠ **It is a lexical gate over a named set and it says so**, because a gate that implies more than it checks is this repository's most-repeated defect (E-165, E-168, E-182, E-198, E-203).

### D4 — Ripple Custody: a research document and a simulated demo mode

Never an integration. ⚠ **This repository holds no Metaco Harmonize primary sources.** **P-12's search, recorded and RE-RUN**: `grep -rli "harmonize\|metaco"` over every `.md`, `.ts`, `.rs` and `.json` outside `node_modules`.

- **2026-08-28:** three files.
- ⚠ **2026-09-02, re-run by `REVIEW-036d` and by the adjudicator: FIVE** — `docs/architecture/ARCHITECTURE-2026-08-18.md`, this ADR, `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md`, `docs/research/CUSTODY-2026-08-28.md`, `web/api/disclosure.test.ts`.

**The conclusion SURVIVES** — all five are this project naming the deliverable and **none is a Harmonize document** — so D4 stands. ⚠⚠ **What failed is the COUNT, and it failed inside a P-12 search whose entire purpose is to be re-runnable.** Fifteenth recorded instance of a restated number going stale (`CLAIMS.md` **E-229**). **A recorded search's date is a re-check date, exactly as an amendment claim's is** — so the number is now carried per-date rather than as a bare fact. So the method is to derive from *our* side what the protocol requires of a key holder, test custodial models against that, and record every Harmonize specific as a dated named gap. **Every surface of the demo mode says it is a simulation**; *"custody-compatible"* over a stub is precisely the claim P-5 forbids.

---

## Why revision 1 thought it did not need a rotation, what the rotation found, and when the gate fires

⚠⚠ **THIS HEADING READ *"Why this did not need a rotation"* UNTIL 2026-09-02. It needed one, it has had one, and the rotation ruled the claim in this section UNSOUND.** The section is kept — rewritten below the retraction — because *"this is the one to attack"* was the right instruction and the attack is what produced revision 2.

`CLAUDE.md`'s standing rule: *"Any step-8 design that gets a browser signing confidential transactions is a trust-boundary change and needs a full adversarial rotation before implementation, not after."* Architecture §3's gate is on **movement** of a trust boundary.

## ⚠⚠ THE CLAIM REVISION 1 MADE, AND WHY IT IS RETRACTED

> ~~**A tier that reads public state and holds no credential grants no authority that did not already exist, so no boundary moves, so the gate does not fire.**~~
> **RETRACTED 2026-09-02 — `REVIEW-036`, all four legs, unsound as stated.**

**Both factual premises are false against source, and the inference is invalid.**

- ⚠ **"reads public state" is false.** `Request::Status` returns the randomness ledger's **entry count**, and `signer/src/store.rs:753-756` commits a record *"on success **and** on any local failure before emission — a cancelled confirmation, a failed proof, an aborted attempt."* **Public ledger history cannot reveal a declined confirmation.** The tier also emits the local socket path and every candidate filesystem path it probed. **Revision 1's defence — that the count is *"activity metadata of exactly the kind the protocol leaves public"* — answered a question about SENSITIVITY with the premise written about PUBLICNESS.**
- ⚠ **"holds no credential" is true and does not carry the weight put on it.** It is not the same property as **conveys nothing a credential produces**. The tier serves `decrypted` confidential balances, which no recipient could compute from public ledger state.
- ⚠ **"grants no authority ⇒ no boundary moves" is invalid.** A trust boundary also governs **confidentiality**, **transport exposure** and **presentation integrity**. `CLAIMS.md` **E-209** is this project's own proof of the last one: the tier rendered a Docker-hosted Gitea's `303` as its own API response. **No authority moved; the display still lied.**

## The claim, rewritten

> **This tier adds no SIGNING authority: it cannot construct `Pair` or `Prepare`, it holds no key, and it cannot reach the holder's confirmation. That property is real, is verified by `tools/check-web-readonly.ts` parts 1-3, and rests on the transport rather than on this decision.**
>
> ⚠ **It is NOT a claim that no boundary moved. A DISCLOSURE boundary did move**, and revision 1 neither noticed nor priced it — see trigger 5.

⚠⚠ **THE DISTINCTION THAT MATTERS, AND IT IS WHAT REVISION 1 COLLAPSED: the milestone only ever needed the signing claim, and the signing claim is sound. Revision 1 proved that and then wrote it as a universal about *authority*, which its evidence does not carry.**

**Five things falsify the rewritten claim, and each is a rotation trigger rather than a code review:**

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

- **That a read-only tier is secure.** P-5 governs. It grants no authority; that is a narrower statement than *safe*, and the narrower one is the true one.
- **That the browser cannot reach the signer because of this decision.** It cannot reach it because of the **transport** (`ipc.rs`). This decision declines to build a bridge around that; it does not create the property.
- **That the gate proves no signing path exists.** It is a **lexical check over a named set**. A path it does not name is invisible to it, and it prints that limitation in its own output.
- **That the gate covers the tier's security.** ⚠ It checks what the tier can **reach**. It did not — and until part 4 was added, could not — see an issuer key held **inside** the API process, a listener bound to every interface, or a leaked socket. **Reachability and exposure are different properties** (E-212, E-213).
- **That SSR is a security boundary.** It is not one. Server-side rendering here is a rendering strategy; the boundary is the Unix socket and the confirmation behind it.
- **That the custody demo mode is custody.** There is no Harmonize integration, no MPC and no HSM (D4).
- ⚠⚠ **THAT NO BOUNDARY MOVED. ONE DID.** A **disclosure** boundary moved: the tier serves, unauthenticated and to any local uid, the product of two resources the project protects with `0700`/`0600` mode bits. **It adds no SIGNING authority — that claim is sound and verified — and it is not the same claim.** See trigger 5 and *What revision 2 does not settle*.
- ⚠ **That the gate covers egress.** It checks what the tier can REACH (parts 1-3), what it HOLDS (part 4), and where it BINDS (part 6). **It does not check what the tier EMITS, or to whom**, and it now says so in its own output (item 11).

---

## Consequences

- **Architecture §6 step 8 is buildable now**, without a rotation, and its falsifier is the gate.
- **The signer keeps its whole AUTHORITY and gains no client that can exercise it.** `Pair` and `Prepare` remain reachable only from a process that can open the socket. ⚠ **Revision 1 said *"gains no client"* flatly and that is false** — `web/api/signer-status.ts` is the tier's UDS client and `check-web-readonly` part 5 counts exactly one (`REVIEW-036d` F4). The substance was right and the sentence was loose.
- ⚠ **A future signing web tier is more expensive than it would have been**, because it must now argue against a recorded decision as well as design a mechanism. **That is the intended cost.**
- **`CLAUDE.md`'s stack line becomes true rather than aspirational** once step 8 is built, and the line should say when it became true.

---

## Before this ADR can be accepted

1. ~~**An adversarial rotation on this document's central claim.**~~ ⚠ **DISCHARGED 2026-09-02 — `REVIEW-036`, four legs, differed packets. The rotation's answer is that the claim needed REWRITING, not ratifying**, and revision 2 is that rewrite. **This item is closed; item 5 replaced it.**
2. ~~**The gate verified by breaking it in both directions.**~~ **DONE, and extended.** `REVIEW-036` found the gate silent on **the loopback bind that architecture §6 step 8 names as a falsifier** (E-227) and carrying **two socket detectors that disagreed**, the narrower one wired to the whole-tier count (E-226). ⚠ **The pre-fix gate was MEASURED exiting 0 with a real second UDS client in the tree.** Both are fixed, part 6 is new, and three break tests against the real tree exit 1.
3. **D2's fourth reason verified at source or recorded as a gap** — the wallet codec question. **DONE** — a named, non-load-bearing gap, verified by `REVIEW-036d` at `web/api/capability.ts:59-76` and pinned by `web/api/disclosure.test.ts:443-459`.
4. **A wording test over the interface's privacy claims.** **DONE as an artifact** — `web/api/disclosure.test.ts`. ⚠ **Its existence does not repair a false claim it does not name**, and `REVIEW-036` found five factual errors in this document that no wording test was ever going to catch.
5. ⚠⚠ **NEW, AND IT IS A RULING THIS DOCUMENT MAY NOT TAKE FOR ITSELF — see below.**

## ⚠⚠ What revision 2 does NOT settle — the issuer route is HANDED OVER, not decided

**`REVIEW-036` U1 established that `GET /api/issuer/:account/:issuanceId` serves `decrypted` confidential balances, unauthenticated, on a loopback listener every local uid can reach — out of a file the project deliberately writes `mode 0600`.**

⚠ **A coding session may not rule on this, and this one did not.** The choice is a genuine trade and it belongs to the project owner:

- **Authenticate the route**, and accept that the demonstration now has a credential in it — which is the shape `REVIEW-003b` killed on the signing side, and the reason *"there is nothing to authenticate"* was treated as a feature when the oracle was removed.
- **Stop serving `decrypted`**, and accept that the issuer view — *"the honest counterpart to showing what the public sees"*, which `CLAUDE.md` requires — loses the number that makes the point.
- **Accept it as a named risk**, the way `E-151` extended `REVIEW-019`'s acceptance to the facility demo, and stamp every issuer response with the disclosure the way every facility run record carries `underB15Conditions: false`.
- **Bind the snapshot's reach to the file's own mode** — serve it only to a caller that can already read the file, which is the only option that ADDS no credential and REMOVES no disclosure.

⚠ **Until it is ruled, the tier ships with the disclosure boundary open and this section is the record that it was seen, priced and not quietly closed.** **`ADR-0003` stays `Proposed` on this item alone** — every other precondition is now discharged.
