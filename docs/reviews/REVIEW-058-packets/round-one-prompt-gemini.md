DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to read files, run commands or browse.

# REVIEW-058 round one, leg B — the hosted demo's trust boundary, before any code

You are an adversarial reviewer. The subject is `ADR-0004`, a proposed design for
putting a read-only demonstration of a confidential-token research project on a
public URL. It is `Proposed`, nothing is built, and the project requires an
adversarial review of any trust-boundary change before implementation. The author
is the session that would build it. A previous decision record for the same web
tier, `ADR-0003`, had its central claim retracted by exactly this kind of review,
and that history is included below so you can see what kind of error this project
makes.

Agreement is not useful to the project owner, who will rule on four decisions in
this document. A finding that the design survives is useful only if you tried to
break it and say how.

You have been given the documents and source files listed at the end of this
prompt, each **complete** unless a header says otherwise. You have no access to
the repository, so where your answer depends on something not shown, say so
rather than assuming.

## Answer all six questions, each with an explicit verdict

For each, list findings as `B1-n | HIGH/MEDIUM/LOW | claim | the passage you rely
on, quoted briefly with its file | the smallest fix`. If a question has no
finding, write `Question N: no findings` and say what you tried. Grade HIGH only
for something that would publish a false statement of fact, expose a secret or
private datum, give the hosted page a signing or decryption path, or make the
design fail as written.

1. **The threat model.** A public static page is a different object from a local
   process serving one operator. List what the ADR has not considered: the build's
   supply chain, the hosting account, the domain, the WebSocket endpoint, the
   visitor, and anyone who might misuse or misread the page. For each, say whether
   it matters for a Devnet demonstration with throwaway accounts, and why.
2. **"Why this shape."** The ADR says that under its recommended option H1,
   `ADR-0003`'s trigger 4 (a decryption oracle) cannot fire, and trigger 5
   (egress) fires only for what is deliberately put into the bundle. Is that sound?
   `ADR-0003`'s revision 1 made an argument of the same shape — *no authority,
   so no boundary moves* — and it was retracted. Is this the same mistake?
3. **D-H3, the issuer figure.** `CLAIMS.md` E-241 removed the decrypted figure
   from the local tier, reasoning that *"the plaintext integer only ever
   demonstrated that THIS PROJECT holds the demo issuer key."* The ADR recommends
   publishing it on the hosted page, with a consistency check. Does the
   recommendation answer E-241's reasoning, or route around it? Which of A, B and
   C would you recommend, and why?
4. **D-H2, the risk acceptance wording.** Read the two sentences the ADR proposes
   a visitor sees beside every ledger value. Is anything in them false, and is
   anything a visitor needs missing?
5. **The prohibitions.** Read `CLAIMS.md` P-1 to P-12. Find any sentence in
   `ADR-0004` or architecture §6 step 9 that claims more than is delivered, states
   a negative without its search (P-12), or would mislead a reader who stopped
   reading there.
6. **The recommendation you would overturn.** Of the four recommendations (H1,
   accept with both sentences, B, prebuilt CLI deploy), name the one you think is
   most likely wrong and argue for the alternative as strongly as you can.

## Last

Name the single sentence in the ADR you think is most likely to be false.

---

# THE DOCUMENTS


## FILE: docs/decisions/ADR-0004-hosted-demo-trust-boundary.md (complete, at commit d764bca)

````
# ADR-0004 — The hosted demo's trust boundary

- **Status:** `Proposed`, revision 1. **Not reviewed.** The launch plan requires a
  full adversarial rotation before any code (`docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`,
  phase 2 step 2), and the four decisions below are the project owner's.
- **Date:** 2026-10-19
- **Context:** launch plan phase 2 step 1. Architecture §6 step 9 is the step; this
  is the decision record. Where the two disagree, §6 is the authority on scope and
  this document is the authority on why, as with `ADR-0003`.
- **Blocks:** phase 2 steps 3 to 5, the build and the deployment.
- **Decided by:** nobody yet. D-H1 to D-H4 are priced below with a recommendation
  each.

This ADR is written by the session that would implement it. `ADR-0003`'s first
revision was too, and its rotation retracted its central claim (`CLAIMS.md` E-230).
Read every recommendation here as the author's, and attack it accordingly.

---

## What changes

Step 8's tier is a process on the holder's own machine, bound to loopback, serving
one operator. A hosted demo is a public URL that anyone can load. Two of this
project's own conditions fire for any public deployment, which is why E-309 ruled
it a trust-boundary change and not a deploy step:

- Architecture §6 step 8 is *falsified if* *"the API binds to anything but
  loopback"*.
- `ADR-0003`'s trigger 5 fires when *"this tier makes any datum reachable by a
  party who could not obtain that datum before the tier existed"*.

E-309 ruled the demo read-only: no hosted signer and no keys in the page. This
document asks the question the launch plan names first: **what does the hosted
tier serve that a public node does not?** The design below is chosen so that the
answer is a short, fixed list that the gate can check.

## Measured on 2026-10-19

Everything in this table was measured in the session that wrote this document,
against the public Devnet endpoints. Nothing is carried from a previous session.

| # | What | How it was measured | Result |
|---|---|---|---|
| M1 | Public Devnet JSON-RPC and CORS | `curl` to `https://s.devnet.rippletest.net:51234/`: an `OPTIONS` preflight with `Origin` and `Access-Control-Request-Method: POST`, then a `POST` of `server_info` with `Origin`. Then a `fetch` of the same `POST` from a Chrome page at `https://example.com` | The preflight answered `400` with no `Access-Control-*` header. The `POST` answered `200` with no `Access-Control-Allow-Origin`. In Chrome the `fetch` failed with *"Failed to fetch"*. A browser page cannot read this endpoint |
| M2 | Public Devnet WebSocket and `Origin` | A Bun `WebSocket` to `wss://s.devnet.rippletest.net:51233` carrying `Origin: https://wconf-demo.vercel.app`, then `Origin: null`, sending `server_info`. Then the same request from a Chrome page at `https://example.com` | All three answered `success`, `network_id` 2, `build_version` 3.4.1. The browser's own `Origin` was `https://example.com`. A page on each origin tried can read this endpoint; no other origin was tried |
| M3 | The endpoint is a pool | The two connections in M2, a second apart | They reported different `complete_ledgers` lower bounds, 5,193,077 and 5,171,980. Two connections can reach two different servers |
| M4 | The demo set still exists | `account_info` and `ledger_entry` for the four addresses in `web/api/demo-accounts.ts` and issuance `004625C9…FEE332CB25E8` | All four accounts and their `MPToken` entries exist at validated ledger 6,243,460, each with a `HolderEncryptionKey` and a spending ciphertext. Devnet has not been reset since E-319 |
| M5 | The observer view needs no native code | Read `tools/observer-harness.ts:51-53,100` | `canonicalEncZero` uses `@noble/curves`, `@noble/hashes` and `ripple-address-codec`, all plain JavaScript, and takes only public inputs |
| M6 | The ledger readers this repository already has | Read `facility/src/loopback.ts:443,497` and `tools/observer-harness.ts:55,152-153,237,247` | `loopback.ts`, which the local tier reuses, reads over JSON-RPC with `fetch`, which M1 rules out in a browser, and its remote-risk acceptance is an environment variable, which a browser does not have. The observer harness already reads Devnet over WebSocket, but asks for `ledger_index: "validated"` on each request rather than pinning one index |
| M7 | Proof verifiers in the published WASM package | `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0` | `wasm/mpt_crypto.mjs` references seven `_mpt_verify_*` symbols, `_mpt_verify_clawback_proof` among them. The typed API does not wrap them: `grep -n verify` over `dist/*.d.ts` returns nothing |
| M8 | TanStack Start can emit a static build | Read `node_modules/@tanstack/start-plugin-core/dist/esm/schema.d.ts` at `@tanstack/react-start` 1.168.49 | The plugin schema has `spa` and `prerender` options. ⚠ Whether the output runs with no server at all is not established by reading a schema, and is checked at build |
| M9 | What the issuer's mirror encrypts | `XRPL-Standards` `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, the latest commit on `master` to touch it, lines 52, 245 and 707 | `IssuerEncryptedBalance` encrypts *"the holder's **total** confidential balance (`CB_S` + `CB_IN`)"*. `ConfidentialOutstandingAmount` is the total held in confidential balances by non-issuers. The clawback `ZKProof` proves *"that the `IssuerEncryptedBalance` encrypts the plaintext `MPTAmount`"* |

## The decision proposed: a static site with no server of ours

```
Visitor's browser ── static files ──► Vercel (static output only: no functions, no middleware)
       │
       └── WSS, read-only ──► public Devnet node (operated by Ripple, not by this project)
```

- **No code of ours runs per request.** The deployment is static files. There is
  no API, no server function, no serverless function and no edge middleware.
- **The observer view is computed in the visitor's browser**, from one WebSocket
  connection, pinned to one validated ledger index that the page shows (M2, M3, M5).
- **The capability matrix, the custody simulation and the wallet page are
  static.** They are pure functions of this repository's own text today
  (`web/api/capability.ts`, `web/api/custody-sim.ts`), so they are computed at
  build time.
- **The signer page is absent from the hosted build.** The launch plan already
  says so, and E-241 had withdrawn its contents from the local tier.
- **The issuer view is D-H3**, an owner decision.

**Why this shape.** Under it, the hosted tier serves the static output of the
public repository's own source, plus whatever D-H3 deliberately adds. Trigger 4,
the decryption oracle, cannot fire: there is no request handler for a request to
reach. Step 8's loopback falsifier has nothing to bind. Trigger 5 fires only for
what is put into the bundle on purpose, and the gate can enumerate that.

**What it costs.** The browser application's data layer moves from HTTP-to-Elysia
to a WebSocket reader in the page, and `/api/*` stops existing in the hosted
build. That is a second build target beside the local one, not a replacement:
step 8's local tier stays as it is.

⚠ **One obligation must not be reimplemented.** `web/api/ledger-view.ts` says
why it composes `facility/src/loopback.ts` instead of reading the ledger itself:
two readings of one obligation drift (E-141's shape). The hosted reader is the
same `Snapshot` discipline with a second transport, WebSocket beside JSON-RPC,
not a second reader. The network check (`network_id` 2, refuse anything else),
the single pinned validated index, and the check that every answer came from
that index stay in one implementation. ⚠ The observer harness's WebSocket client
is not that implementation and should not be lifted into the page: it reads
`validated` per request, so two reads on one view can come from two ledgers (M6).

## What the hosted surface may touch, and may never touch

**May touch:** public Devnet ledger state, read from the visitor's browser over
the one named WebSocket endpoint; static content built from the public
repository; and, only if D-H3 rules it, one published snapshot file.

**May never touch:** any server-side request handler; any socket client or the
signer's socket path; any secret, seed or private key, the demo issuer key
included; any decryption routine in the shipped output; any network but Devnet;
any second ledger endpoint, as a fallback or otherwise; and any analytics or
third-party script.

## The owner's decisions

### D-H1. The hosting shape

| option | cost | what it buys |
|---|---|---|
| **H1. Static site, browser reads Devnet directly** *(recommended)* | the page's data layer moves into the browser; a WebSocket transport under `Snapshot`; a second build target | no code of ours runs per request, so there is no rate limiting and no CORS change, and trigger 4 cannot fire. ⚠ Residual: the visitor's IP and every address they look up go to Ripple's node. Vercel sees each page load, and today's observer route carries the account in the URL (`web/app/src/routes/observer.tsx:7-8,51`), so a reload or a shared link sends the lookup to Vercel too unless the hosted build keeps it out of the URL |
| H2. Vercel functions running the Elysia API against Devnet over JSON-RPC, with SSR | the API on the public internet: CORS for the deployed origin, rate limiting, caching, function logs holding visitors' IPs and queries, and billing exposure on the owner's account | the existing reader unchanged, and visitors' IPs hidden from Ripple's node. ⚠ Every route added later runs our code per request, which is trigger 4's shape |
| H3. Prerendered pages only | the build reads Devnet once and bakes every view, with its ledger index and date | the cheapest and the most honest about time, since every value is a dated reading (P-3's habit). ⚠ A visitor cannot enter an account, so *"so people can try it"* reduces to *"so people can read it"* |

**Why H1.** It is the only shape in which the answer to *"what does the hosted
tier serve that a public node does not?"* is fixed at build time. H2 answers it
with a promise about future routes. H3 answers it well and drops the live half
of the goal.

### D-H2. The ledger-source risk acceptance for a hosted page

B-15's named risk acceptance was written for a local operator who chose their
node (E-110, extended to the facility demo by E-151). A hosted page needs its
own, and accepting a risk is the owner's act, not this document's. The proposed
wording, from the launch plan:

> *A lying or substituted node makes this page show wrong values. Nothing on this
> page signs or submits, so no amount can be published because of it.*

Under H1 it gains a second sentence, because the visitor's browser makes the
connection:

> *Your browser connects to the public Devnet node operated by Ripple. That
> operator sees your IP address and every account you look up here.*

| option | what it means |
|---|---|
| **Accept, by name, with both sentences on every view that shows a ledger value** *(recommended)* | the same shape as E-151: the risk is unmet by name, and the page says so where the value is |
| Do not accept | H3 only, with every value a dated reading the page does not refresh |

Corroboration across independently operated Devnet nodes is not offered as an
option. Every Devnet host this repository names is under `rippletest.net`
(`git grep -ohiE` for `devnet` hostnames, 2026-10-19), so every endpoint it knows
has one operator. Whether an independently operated public Devnet node exists has
**not been searched** outside this repository. That is a named gap, not a
negative.

### D-H3. The issuer view: what, if anything, the hosted page says the issuer reads

`ADR-0003`'s ruled position for the local tier is E-241: the route reports
whether a balance is decryptable and never the figure, because *"the plaintext
integer only ever demonstrated that THIS PROJECT holds the demo issuer key."* The
launch plan's phase 2 text proposes the opposite for the hosted page: the
snapshot *"is the point of the demo and becomes a deliberately published static
artifact over throwaway Devnet accounts, with the disclosure beside it."* The two
cannot both stand without a ruling.

| option | cost | what it buys |
|---|---|---|
| **A. No figure** *(recommended)*. The page shows `IssuerEncryptedBalance` present and populated under the issuance's `IssuerEncryptionKey`, and says the issuer can always decrypt it (P-9) | none beyond the static page | E-241's position, carried unchanged to a public audience. The ciphertext and the key it is under are ledger readings a visitor can check. That the issuer can decrypt it is the specification's, cited as P-9, and no figure is asserted |
| B. A published snapshot of the issuer's figures | run `tools/issuer-view-snapshot.ts` locally and publish its results with the ledger index and, for each holder, the `IssuerEncryptedBalance` the figure was decrypted from. The tool does not record that ciphertext today (`tools/issuer-view-snapshot.ts:220-262`), so B changes the one tool that holds the issuer key | the contrast the plan wants: the observer sees a ciphertext, the issuer sees a number. ⚠ Nothing a visitor can run shows the figures are true. Re-reading each ciphertext live shows only that the snapshot is current. Comparing the figures' sum with `ConfidentialOutstandingAmount` shows nothing about the key either: that total is public plaintext, and anyone can split it among holders without decrypting anything (M9) |
| C. B, plus a proof of correct decryption that the browser verifies | unpriced. XLS-0096's clawback proof is exactly a proof that the mirror encrypts a stated amount (M9), and M7 shows its verifier compiled into the WASM build but not wrapped by the typed API. Whether a clawback-shaped proof can be published safely, given that it is bound to a transaction context nobody submits, is a cryptographic question for the rotation | the only option under which a visitor can check each figure, and so the only one that answers E-241 |

**Why A.** E-241's reasoning holds with more force on a public page. A figure no
visitor can check is a claim with no falsifier, published under this project's
name. B's checks cannot change that, because both pass for a publisher who never
held the key. C is the way to show the number, and it needs the rotation's
answer first. Launching with A costs nothing, and C can be added later without
reopening the rest of this decision.

⚠ **This recommendation departs from the launch plan**, whose phase 2 text calls
the snapshot *"the point of the demo"*. An earlier draft of this document
recommended B with the sum check as its falsifier. Preparing the self leg showed
that the check passes for a forger, so the draft changed before review.

### D-H4. What Vercel deploys, and from where

Read on 2026-10-19 from Vercel's own pages: `vercel.com/docs/cli/deploy`, marked
updated 2026-09-18, and `vercel.com/docs/git/vercel-for-github`, marked updated
2026-09-17.

| option | cost | what it buys |
|---|---|---|
| **A. Build and gate locally, deploy the prebuilt output from the CLI** *(recommended)* | a Vercel token on the owner's machine; each deployment is a deliberate act. `vercel build` writes `.vercel/output`, and `vercel deploy --prebuilt` uploads exactly that directory | the gate runs on the exact bytes that ship, which is phase 1 step 7's lesson: a rehearsal does not substitute for the gate on the published artifact. No third party gains any access to the public repository |
| B. Vercel's Git integration, production from `main` | Vercel builds from source, so the gate has to run inside Vercel's build and fail it. ⚠ The Vercel for GitHub app's documented repository permissions include write access to `Administration`, `Contents`, `Pull Requests` and `Web Hooks`. That is a third party with write access to the public repository, which D8's option C exists to restrict | deploys follow merges. The integration deploys every push by default, previews included. A pull request from a fork needs a team member's authorization before it deploys, and that protection can be switched off in the project's settings. A fork's preview is a page under the owner's project saying whatever the fork says, which is E-209's presentation-integrity shape |

**Why A.** It keeps the gate on the shipped bytes and keeps the public
repository's write access where D8 put it.

## Devnet resets

The demo accounts are throwaway. When Devnet is reset they stop existing, and the
page must say so:

> *This account does not exist on Devnet at ledger N. Devnet is reset from time to
> time and the demo accounts are throwaway. No other source is substituted.*

A failed read must never render as an empty account, which reads exactly like a
true statement about the ledger (`web/api/demo-accounts.ts` already guards the
typo version of this). Under D-H3 B, a snapshot whose ciphertexts no longer match
is shown as void, never as current. Old transaction hashes are not a foundation
either, because the public endpoint stopped serving them without a reset (E-319).

## Abuse, rate limiting and caching

Under H1 nothing of ours runs per request, so there is nothing of ours to rate
limit. The node's limits are Ripple's, not this project's. The page must render a
refused or failed read, a rate-limit refusal included, as a named failure, not as
an empty account. Static files cache normally. Ledger values are not cached; each view
names the index it read.

Under H2 all of this becomes ours, which is part of H2's cost.

## Rotation triggers

`ADR-0003`'s five triggers apply to the hosted build unchanged. Three more are
specific to hosting:

1. **Anything that runs code of ours per request**: a serverless function, edge
   middleware, or on-demand rendering. That is H2, and it needs its own rotation.
2. **Any datum in the shipped output that is not public ledger state or this
   repository's own text.** D-H3's snapshot is the only exception that can be
   ruled, and only by name.
3. **A second network endpoint**, a fallback, or any widening of the page's
   permitted connection targets.

## What phase 2 step 4's gate must check

The local gate, `tools/check-web-readonly.ts`, asserts the local shape. The
hosted build needs its own part, run over the **built output**, not the source:

- no server function, API route, serverless function or middleware in the output;
- no socket client and no signer socket path;
- no decryption routine and no secret-shaped value, with `check-no-secrets` run
  over the output directory;
- one permitted connection target, the named Devnet WebSocket, enforced by the
  page's Content Security Policy and checked against it;
- no account or issuance a visitor looks up carried in a URL the host receives;
- every view that renders a ledger value also renders the source disclosure, the
  network check and the ledger index.

It is verified by breaking it, in both directions, with its controls run through
the real detector, and it says in its own output what it does not check. Gates in
this repository have false-passed before they worked, `ADR-0003`'s own among them
(E-165, E-182, E-226).

## What this decision does not claim

- **That the hosted page is secure.** P-5 governs. It is a static demonstration.
- **That the values it shows are true.** TLS to Ripple's node authenticates the
  channel, not the values (architecture §7, F-23). D-H2 is the acceptance of that.
- **That visitors are private.** Under H1 the node operator sees each visitor's IP
  and queries, and Vercel sees page loads and anything carried in their URLs.
- **That a holder is private from the issuer** (P-9), that confidential transfers
  hide who or when (P-4, P-11), or that a fresh balance is hidden when F-1 says
  it is publicly known to be zero. `web/api/disclosure.test.ts` pins the local
  tier's wording, and the hosted build must run the same tests.
- **That Devnet evidence is permanent.** E-319.

## Before this ADR can be accepted

1. The owner's rulings on D-H1 to D-H4.
2. The rotation: three legs with differed packets, before implementation
   (launch plan phase 2 step 2). Its stopping condition is set before it runs: no
   third round unless round two finds a fix that did not discharge its finding.

````


## FILE: docs/architecture/ARCHITECTURE-2026-08-18.md (complete, at commit d764bca)

````
# W-CONF architecture — revision 10

⚠ **This document said `tapFailHard` until 2026-10-18, which is THIS PROJECT'S SHORTHAND and appears zero times in rippled.** It now uses the real names: `fail_hard`, the submission parameter a client sets, and `TapFailHard`, rippled's internal apply flag. See [`docs/VOCABULARY.md`](../VOCABULARY.md). The code always used the real one.

- **Revision 10 on 2026-10-19** — **§6 step 9 written: the hosted demo, scoped and NOT ruled.** `ADR-0004` is the decision record, `Proposed`, with four decisions for the project owner and a full adversarial rotation owed before any code (launch plan phase 2, `CLAIMS.md` E-309). The design rests on measurements taken the same day and recorded in the ADR: the public Devnet JSON-RPC endpoint cannot be read from a browser page, its WebSocket endpoint can, and the four demo accounts still exist (`CLAIMS.md` E-327).
- **Revision 9 on 2026-08-28** — **§6 step 8 written for the first time.** ⚠ **This revision exists because `CLAUDE.md` asserted a step that did not exist.** *"It is architecture §6 step 8 and step 8 was written on 2026-08-26"* was false: §6 had **seven** numbered steps, §7 followed step 7 directly, `grep -n "step 8"` over this document returned **nothing**, and revision 8 is recorded as *"§6 step 7 only"*. The web tier therefore had no scope, no falsifier and no gate in the authority document, and the line every new session reads first said otherwise for two days (`CLAIMS.md` **E-204**). Step 8 now carries the four decisions the project owner ruled on 2026-08-28, the read-only trust boundary that keeps it out of a rotation, its gate, and its falsifier. **`ADR-0003` is the decision record; this is the step.** ⚠ **One source correction came out of the scoping itself**: `Request::Status`'s doc comment called it a *"Public ledger read"* and it reads no ledger — the sentence D1's safety argument quotes was wrong about what the call does (**E-205**).
- **Revision 8 on 2026-08-26**, after **`REVIEW-023` ROUND TWO** — three legs, seventeen findings upheld, one rejected. §6 step 7 only. ⚠ **Round two's subject was round one's FIXES, and its largest finding is that they were incomplete**: sentences at file:line references the round-one findings themselves cited were never changed, three of them in this document (`:205`, `:215`, `:217`). ⚠ **The `fail_hard` claim was narrowed everywhere**: it removes F-23's consequence **at the ledger**, not at the node the blob was submitted to (**F-28**), and it is set on every facility *movement* rather than on *every submission* — §1's control deliberately submits one arm without it. `CLAIMS.md` **E-153**.
- **Revision 7 on 2026-08-25**, after **architecture §6 step 7 was BUILT AND EXECUTED** — the facility as application logic (§5's B-15 paragraph, §6 step 7, §8). **28 validated facility transactions on Devnet.** ⚠ **NOT under B-15's step-7 conditions**: loopback was ruled, taken, and then **costed** — a fresh rippled could not acquire Devnet's account state tree on this hardware (`CLAIMS.md` **E-148**) — so the project owner **amended** the ruling to extend `REVIEW-019`'s named risk acceptance to the demo (**E-151**). `fail_hard` was in force; loopback was not, and every run record says so.
- **Revision 6 on 2026-08-24**, after **`ConfidentialMPTConvertBack` was built and executed** and **`CLAIMS.md` E-76 was closed** (§4's `r`/`ρ` row, §5's B-15 row, §6 step 7, §8). ⚠ **Step 7 is OPEN, not done.** What was built is the facility's *exit transaction* and the randomness migration that step 7 would otherwise have made dearer; **the facility itself is still behind B-15's gate**, which is costed and handed over in `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md` rather than decided.
- **Date:** 2026-08-18, **revision 5 on 2026-08-20 after §6 step 6 was built and executed** — real key generation and onboarding (§4's keygen row, §5's issue #10 and #11 rows, §6 step 6, §8). Revised on 2026-08-19 after §6 step 2 was built and executed. Revised three times on the 18th: after the keygen ruling (REVIEW-012c), after **REVIEW-013c** (which accepted ADR-0001 and ruled the `r`/`ρ` store amendments not buildable as they stood), and after **step 3 was built and executed on Devnet**. Revision 4 records **step 2**: the signer reads the ledger itself, the holder profile no longer carries any ledger state, and a wrong read turns out to be a **confidentiality** problem rather than a liveness one (`CLAIMS.md` F-23).
- **Status:** **Provisional and living.** This document records what the rulings so far *oblige*, marks what is still open, and will change as things are decided. Nothing here is carved in stone, and anything that turns out wrong should be struck rather than annotated — the project's own convention.
- **What it does not do:** ~~it does not license building application logic. ADR-0001 is still `Proposed`~~ — **ADR-0001 was ACCEPTED 2026-08-18** (`REVIEW-013c`), so §6 step 7 is unblocked. **Several other gates are not**, and §5 says which.

---

## 0. What this system is, in one paragraph

A receivables financing facility built as **application logic on XLS-0096 Confidential MPTs**, on the XRPL Devnet. Amounts and balances are hidden from the public; **identities, counterparties, timing and frequency are not, and the issuer can always decrypt** (`CLAIMS.md` P-4, P-9, P-11). The holder's cryptographic secrets never leave their own machine, which is enforced by putting proof generation in a **local signer process** rather than in a server or a browser. The artifact's purpose is to demonstrate correctness honestly, not to be deployable.

## 1. Shape

```
┌─────────────────────────┐          ┌──────────────────────────────────┐
│  Web application        │          │  Local signer  (Rust binary)     │
│  Bun · TanStack · Elysia│          │  runs on the HOLDER's machine    │
│  Tailwind · shadcn/ui   │          │                                  │
│                         │          │  ┌────────────────────────────┐  │
│  - reads public ledger  │  IPC     │  │ ElGamal secret  (sk_A)     │  │
│  - builds INTENT        │◄────────►│  │ XRPL account key           │  │
│  - never sees a secret  │  §3      │  │ never serialised out       │  │
│  - shows public state   │          │  └────────────────────────────┘  │
└────────────┬────────────┘          │                                  │
             │                       │  mpt-crypto (vendored, patched)  │
             │                       │  proof generation + signing      │
             │                       │  PER-TRANSACTION CONFIRMATION UI │
             │                       │  READS THE LEDGER  (§6 step 2)   │
             │                       └──────────────┬───────────────────┘
             │                                      │ JSON-RPC over TLS,
             │                                      │ read-only
             └──────────────┬───────────────────────┘
                            ▼
                   XRPL Devnet (network_id 2)
                   rippled 3.3.0 · ConfidentialTransfer *
```

\* **Amendment status is a reading, not knowledge (P-3).** `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` were observed enabled on **standard** Devnet — there is no separate "Confidential Devnet" — by a `feature` RPC check on **2026-08-16** (E-25, E-26), and confidential transactions have been accepted there on 2026-08-17 and 2026-08-18. **Re-checked 2026-08-24T14:42:31Z** — `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` all still `ENABLED` on Devnet, alongside `MPTokensV1`, `DynamicMPT`, `LendingProtocol`, `BatchV1_1`, `PermissionDelegationV1_1` and `Sponsor`. Confidential transactions were accepted on Devnet again on 2026-08-24 under this reading (E-131). ⚠ **`ConfidentialTransfer` is `supported, not enabled` on TESTNET** under the same reading, which is a difference worth not discovering by accident. **That is a dated observation and it expires.** Re-run `tools/check-amendments.ts` and date-stamp the answer before relying on it; do not carry this line forward as a standing fact.

**The signer is a separate binary, not part of the web tree.** A browser page cannot invoke a local process; that constraint is what forces the split, and `CLAUDE.md` already records it.

⚠ **The signer reads the ledger and still does not write to it.** Since 2026-08-19 it opens an outbound read-only JSON-RPC connection (§6 step 2). It has no path that submits anything: it signs and hands back a blob. Both halves of that sentence are load-bearing and neither should be trimmed.

## 2. The three keys, and who holds what

| Key | Held by | Can | Source |
|---|---|---|---|
| **XRPL account key** | signer | spend XRP, sign transactions | ADR-0001 §(d) |
| **ElGamal `sk_A`** | signer | decrypt own balance, prove Sends | ADR-0001 §(b) |
| **Issuer ElGamal key** | issuer | **decrypt every holder's balance** | protocol-mandatory |
| Auditor ElGamal key | auditor, optional | decrypt every holder's balance | protocol, optional |

**The issuer mirror is not optional and no configuration removes it** (P-9). Any UI or copy implying holder-from-issuer privacy is a defect.

⚠ **Keys cannot be rotated or recovered** (E-9, E-10, P-10). A lost key is a permanently lost balance; a compromised key is permanently compromised. This shapes every recovery story the application might otherwise offer — there isn't one.

## 3. The trust boundary — hardened 2026-08-18

**Ruled (issue #1): a hostile same-host process IS in the threat model.** REVIEW-003b found that an origin allowlist plus a pasted session token constrains *pages*, not *processes*, and that a value-shaped interface makes a leaked token a **spend oracle**. The reviewer offered two ways out; the harder one was taken.

The boundary therefore **must**:

1. **Confirm every transaction in the signer's own UI**, rendering what the signer is *about to sign* — destination, issuance, amount — parsed from the transaction it built, **never** echoing what the client claimed to ask for.
2. **Use short-lived, scoped authority.** Bounded operations, bounded time. No long-lived bearer secret.
3. **Persist no bearer secret in the browser.** ADR-0001 rev 2's pasted-token design is **withdrawn**.
4. **Prefer OS-mediated IPC or native messaging** to generic localhost HTTP. Localhost HTTP is acceptable only with 1–3 and an explicit README statement of what it does and does not constrain.
5. **Never accept caller-supplied randomness.** No `r`, no `ρ`, no entropy, on any endpoint that can sign (REVIEW-010c §1). A test-only offline API may inject entropy provided it cannot sign or submit.

**What this buys, and the claim stops here:** it raises the bar from *a leaked token* to *code execution on the holder's machine*. It does **not** defeat an adversary who has code execution — that adversary reads `sk_A` from process memory. P-5 forbids calling any of this secure.

## 4. The cryptographic core — what is settled and where it lives

| Concern | Status | Where |
|---|---|---|
| Serialisation | **Done upstream, and REIMPLEMENTED IN THE SIGNER 2026-08-18** | `ripple-binary-codec@2.9.0` (E-30) is the reference; `signer/src/xrpl.rs` is the Rust encoder, pinned against it byte-for-byte plus `ripple-keypairs` for **both** secp256k1 and ed25519 (E-83) |
| Proof generation | **Done upstream, and WIRED INTO THE SIGNER 2026-08-18** | `@xrplf/mpt-crypto`, and a vendored C fork the signer links directly. `signer/src/mpt.rs`, `signer/src/prover.rs`, `signer/build.rs`. The **pristine upstream verifier accepts proofs the signer produces** (E-80) |
| **Sigma nonces** | **Ruled, implemented, executed** | vendored fork; described in `tools/spike-2026-08-18/WCONF-PATCH.md` §1 |
| **`r` and `ρ`** | **Ruled, amended twice, IMPLEMENTED 2026-08-18, and IMPLEMENTED EVERYWHERE 2026-08-24** — `signer/src/randomness.rs`, all nine published vectors reproduced by a second implementation written from the prose (E-75). Ledger per A4–A9 in `signer/src/store.rs`. ⚠ **E-76's `tools/` half is CLOSED (E-132)**: eight transaction-building harnesses moved to `tools/wconf-randomness.ts`, which reproduces the same nine vectors **before it will derive anything**. **FIVE call sites reach it deliberately**, each with a reason at its own call site, and `tools/check-blinding-sources.ts` fails if that list is wrong. ⚠ **The count has been wrong twice, in both directions** — four from a name-based sweep (E-137), then nine from counting flagged files rather than call sites (E-141) | `REVIEW-010-RULING-…`. Adjudicated in `REVIEW-010c`; storage and state machine amended by **A1–A3** (after REVIEW-011c) and then by **A4–A9** (after REVIEW-013c, which ruled A1–A3 not buildable). **Built against A4–A9** |
| Bulletproof blinding | **OPEN** | issue #8 |
| **ElGamal keygen** | **Ruled 2026-08-18, IMPLEMENTED AND EXECUTED 2026-08-20** — `signer/src/keygen.rs`, written from the ruling's prose and reproducing both published vectors; the registered key on Devnet was cross-checked against a second, independent TypeScript derivation through a validated ledger entry (E-118) | `REVIEW-012-RULING-keygen-…`, adjudicated in `REVIEW-012c`. **Still the only copy of the construction** |

**Do not restate any construction in this document.** They live in one place each, and a second copy is a divergence waiting to happen (REVIEW-005c). This table points; it does not duplicate.

**The KDF has never changed.** Every amendment to the `r`/`ρ` ruling touches storage and the state machine around it; the preimage, reduction, abort behaviour and known-answer vectors are untouched and `t-r-and-rho-construction.ts` still passes. Do not read "amended twice" as "the construction moved".

**Three rules that look contradictory and are not.** Nonce derivation degrades gracefully when the RNG fails, because entropy there is a *hedge* over a deterministic secret-derived core. `r`/`ρ` derivation **refuses to sign** on entropy failure, because entropy there *is* the source and synthesising a published blinding value from a long-lived key is forbidden. **Keygen has no failure path at all** — its reduction is total, and cannot yield an invalid scalar — because its input is a **fixed seed**, so an abort would be deterministic and permanent rather than retryable with fresh entropy. All three are correct. Do not "fix" any of them.

~~**And there is now a further scalar source with no ruling at all: the transaction's own ECDSA nonce `k`.**~~ **RULED 2026-08-20 (`REVIEW-018`), and the count of rules is now FOUR, not three.** Two independent legs ruled that the issue #1 ruling — a hostile same-host process is in the threat model — extends to `k` exactly as it did to the sigma nonces, and neither found a principled distinction. `signer/src/xrpl.rs` uses **hedged RFC 6979** for secp256k1; byte-for-byte vector pinning moved to a deterministic arm that is the same implementation with one input varied.

⚠ **`k`'s rule is the SIGMA-NONCE shape, not the `r`/`ρ` shape** — and so is ed25519's, ruled 2026-08-27 below, and that is the whole reason the rules stay separate: entropy here is a **hedge over a deterministic core that is safe alone**, so entropy failure **degrades** to pure RFC 6979 rather than refusing to sign. A leg recommended refusing; that was rejected as importing the wrong rule.

~~⚠ **Ruled for secp256k1 only. ed25519 is deterministic by construction and is `CLAIMS.md` B-16** — and it is the live path, since every account this project holds has an `sEd…` seed.~~ **RULED 2026-08-27 (`REVIEW-024`), and the count of SITES is now FIVE while the count of BEHAVIOURS is still THREE.** Three independent legs ruled that the issue #1 ruling extends to the ed25519 nonce too and that the residual risk is **not** accepted: the RFC 8032 nonce prefix is hedged with 32 bytes of fresh entropy, tagged-hashed under a fixed DST and **XORed** over it — the same idiom site 1 uses — with the scalar, the public key, the challenge transcript and the signature equation untouched.

⚠ **ed25519's rule is the SIGMA-NONCE / `k` shape: degrade, do not refuse.** A reported entropy failure omits the mask and lands on **byte-identical RFC 8032**. ⚠ **A successful draw of thirty-two ZERO BYTES is not an omission and stays hedged** — the distinction `REVIEW-018` §4a got wrong in the mirror direction, and a session that assumes zeros recover RFC 8032 will write a false test.

~~⚠ **RULED AND NOT BUILT.**~~ **BUILT AND EXECUTED 2026-08-27 — `CLAIMS.md` E-163.** All eight of `REVIEW-024` §6's items have run, ending in a validated Devnet transaction on the default path with `SigningPubKey` decoded out of the submitted blob (`5A8CF0B4…`, receipt at `docs/runs/`). *"The signer hedges ed25519"* is now accurate. ⚠ **Built and executed is not REVIEWED**: §7 item 4 requires two adversarial rounds and the second reviews the fixes. `REVIEW-025c` is round one — eleven findings, **none of them the construction**, all fixed.

## 5. What is blocked, and by what

~~**ADR-0001 is `Proposed`. Application logic does not start until it is `Accepted`.**~~

**✅ ADR-0001 is `ACCEPTED` as of 2026-08-18.** The last agenda item — re-weigh Option 2 (browser WASM) on risk alone — was run as `REVIEW-013`: two independent legs, **both ruling Option 3**, both handed the two strongest arguments against it (the inverted build-cost table and the standalone-ElGamal-seed rescue path) and neither moved. Adjudicated in `REVIEW-013c`; the ADR carries six corrections from it.

**What that unblocks: step 7, the facility as application logic. That is all it unblocks.** The gates below are separate and are still shut. In particular the rotation ruled that **the signer may not be built against amendments A1–A3 as they stood** (§6 step 4). ~~and step 6 still owes issues #10 and #11~~ — **step 6 was built and executed 2026-08-20**: issue #11 is discharged, and **issue #10 is not**. ⚠ It turned out not to be a gate on the *build* at all, which the table below now says: publishing a derivation is not something code can do, and treating it as a build blocker would have meant either never building or pretending a repository document is a standard.

**What the embargo covers, stated because two review legs read §6 as violating it.** It covers **the facility** — the Dedicated Account, the financing flows, anything a user would call the product — and **all real key generation and onboarding**. It does **not** cover throwaway-key integration spikes against Devnet, which is the category every session so far has worked in and which `CLAUDE.md`'s review gates put outside the gate. Steps 1–4 below are spikes and harnesses; **step 7 is the facility, and it is behind the gate.** If a step starts producing something a user would rely on, it has crossed the line regardless of which number it carries.

| Blocker | Blocks | Owner |
|---|---|---|
| ~~**§(e) keygen half — reviewed by nobody**~~ **RULED 2026-08-18** | ~~any ElGamal key generation~~ — **unblocked**, subject to the ruling's five conditions | `REVIEW-012c`. Three legs, unanimous on the decision. **Not implemented** |
| ~~**Option 2 re-weigh (ADR-0001 rev 3)**~~ **DISCHARGED 2026-08-18** | ~~ADR-0001 reaching `Accepted`, and therefore step 7~~ — **both unblocked** | `REVIEW-013c`. Two legs, both Option 3. **The build-cost table was inverted, not merely stale** — Option 2 is now the cheapest option and Option 3 the most expensive, and Option 3 was confirmed anyway, on risk |
| **`r`/`ρ` amendments A1–A3 — NOT buildable as they stood** | **§6 step 4, the `r`/`ρ` implementation** | `REVIEW-013c` §3. Both legs ruled *do not build*; six defects. Corrected by **A4–A9** in `REVIEW-010-RULING-r-and-rho-2026-08-18.md`. **Adjudicated, not themselves reviewed — a deliberate stop under `CLAUDE.md`'s two-round rule.** Next artifact is the implementation and its test |
| **Publication of the keygen derivation (#10)** | ~~**§6 step 6**~~ — **it did not block the build and it is NOT discharged.** Step 6 was built and executed on 2026-08-20 with the condition open, which is the honest position: the code can exist, the *benefit it trades for* cannot be delivered by code | keygen ruling condition 1. ⚠ **What changed on 2026-08-20 is evidence, not discharge.** Three implementations of the ruling's prose now agree — the Rust signer, the TypeScript spike, and a third written for the Devnet driver — which is what "precise enough to reimplement from prose alone" would look like if it were true. **A holder who cannot reach `docs/reviews/` still cannot recover their key**, and `onboarding::THIRD_PARTY_WALLET_NOTICE` says so to their face. An XLS informational draft is the real discharge and **filing it is a Desktop-project decision, not a coding-session one** |
| ~~**Onboarding branches on ledger state (#11)**~~ **DISCHARGED 2026-08-20** | ~~§6 step 6~~ | keygen ruling condition 2. `signer/src/onboarding.rs`: all three conditions detected, **each one flipping the recommendation on its own**; the disclosures reach the holder **before the seed is asked for**; two key sources (`derived-from-master-seed`, `standalone`) with two backup stories, both selectable from the holder profile. ⚠ The ruling says **warn and offer**, not refuse — deriving on a retired-master account is possible and costs a second typed sentence (E-121) |
| **Bulletproof blinding (#8)** | a complete randomness story; not the critical path for a first milestone | a ruling on whether determinism is acceptable when the scalars *are* the zero-knowledge |

**What is NOT blocked** and can be built now: everything in `tools/`, measurement, harnesses, and the signer's **non-cryptographic** scaffolding — IPC transport, the confirmation UI, transaction construction, ~~ledger reads~~ **(built 2026-08-19)**. None of that touches keygen.

**Updated 2026-08-18 — one blocker was discharged and no new one appeared.** Step 3 is built and executed; the `r`/`ρ` row above is discharged in full (the signer *is* built against A4–A9, and the wiring is done). What remains shut is exactly steps 6 and 7's own items: issues #10 and #11 for keygen and onboarding, and the ADR-0002 review for the facility. **Issue #8 remains open and is still not on the critical path.**

**Updated 2026-08-19 — step 2 is built, and it moved issue #11 from blocked to buildable.** Issue #11's onboarding must branch on `lsfDisableMaster`, a regular key and a signer list; that is a ledger read, and the read now exists (`AccountSecurity`). **Nothing branches on it yet.** Issue #10 — publish the derivation — is untouched by this and is still shut.

⚠ **One NEW open item appeared, and it is not a blocker of anything in this table.** `CLAIMS.md` **B-15**: the signer now trusts **one remote node** for values that, if wrong, cause it to publish an amount encrypted under an adversary's key (F-23). TLS removes the on-path adversary and removes nothing else. This does not gate step 6; it gates anything a user would rely on, which is step 7's territory.

**Updated 2026-08-24 — B-15's step-7 gate is the ONLY thing between here and the facility, and it is a decision rather than a build.** `REVIEW-019` named three ways out — loopback, corroboration across independently operated nodes, or a submitter that sets `fail_hard` — and said which of the three is a step 7 decision. The three are costed in `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md`. ⚠ **ANSWERED 2026-08-25 by the project owner: loopback for the facility, plus `fail_hard` set by whatever submits — which is NOT the signer**, so §1's sentence stands unchanged and the trust boundary is exactly what ADR-0001 accepted. **The gate is open.** ⚠ **The answer is not one of the three as the ruling stated them, and it had no adversarial review**; the residual is that nothing forces a separate submitter to set the flag, making that half a convention rather than a property.

⚠ **Two things that stood in front of step 7 and were NOT decisions are now done**: `ConfidentialMPTConvertBack` (E-131) and E-76's `tools/` half (E-132). Neither passes the gate; both were things step 7 would have had to pay for later at a higher price.

## 6. Build sequence

Ordered by dependency, not by appetite. Each step names what would make it wrong.

1. ~~**Signer skeleton — no keys.**~~ **BUILT 2026-08-18 — `signer/`, and it runs.** IPC transport per §3, per-transaction confirmation UI, scoped short-lived authority, refusal of caller-supplied randomness. *Falsified if:* the confirmation renders client-supplied strings rather than parsed transaction fields. **The falsifier is written and passing** — `signer/tests/falsifier.rs::confirmation_never_renders_what_the_client_claimed` sends REVIEW-003b's own attack (an intent claiming *"Send 1 unit to Alice"* while its real fields say 9999 elsewhere) and asserts no client string reaches the screen. 25 tests, all passing (E-73).

   **The property is enforced by types, not by discipline:** `ParsedTransaction` has one constructor, `parse(&[u8])`, and `confirm::render` takes `&ParsedTransaction` and nothing else, so a client string cannot reach the holder without someone first widening a signature.

   **Transport is a Unix domain socket, not localhost HTTP** — §3 item 4's preferred option, taken. A browser page cannot open one by any web API, so the XSS-to-spend-oracle path is closed by construction rather than by an `Origin` check. **It does not stop a hostile process running as the same user**, which is in scope and was never going to be stopped there; the confirmation is the boundary.

   ~~**There is no randomness ledger in this skeleton, deliberately.** Step 4 is not built, and a REVIEW-013 leg warned that scaffolding must not bake in the A1–A3 store semantics.~~ **Both halves are now spent**: step 4 was built later the same day against **A4–A9**, and the warning was heeded — no A1–A3 semantics were ever written. **`txn::serialize`'s length-framed placeholder is also gone**, replaced by canonical XRPL bytes at step 3.
2. ~~**Ledger read path.** Public state, the observer view, issuance and holder objects. Already largely exists in `tools/`.~~ **BUILT AND EXECUTED 2026-08-19 — `signer/src/ledger.rs`.** *Falsified if:* the signer builds a transaction against ledger state it did not read, or a stale read is indistinguishable from a fresh one. *Also falsified if:* it implies amounts are visible or that identities are hidden.

   **The one line above understated it in the same way step 3's did.** *"Already largely exists in `tools/`"* was true of the reading and false of everything that matters: `tools/` reads the ledger to *print* it, and a signer reads it to *prove against it*. Three things followed that the line did not contain.

   - **A wrong read is a confidentiality break, not a rejection.** A Send encrypts the amount to the destination's and the issuer's keys, **both read from the ledger**, and rippled verifies against the keys it holds. A substituted key fails the proof with `tecBAD_PROOF` — and a `tec` is **applied to the ledger**, so the ciphertext under the adversary's key is published permanently. The signer does not submit, so it cannot set the `fail_hard` that would prevent it. `CLAIMS.md` **F-23**, read at rippled `3.3.0`/`00a178f`, **not executed**. Consequence: TLS is required for any non-loopback endpoint, and B-15 — whether **one** endpoint is acceptable at all — is open.
   - **Two `"validated"` reads seconds apart land in different ledgers.** Observed live: `account_objects` at 4596692 and `account_info` at 4596693, back to back, because the public endpoint is a cluster (E-103). A snapshot assembled from both is a state that never existed, so the index is pinned once and every later call carries that number.
   - **Staleness had to be *detected*, not bounded.** The window is the confirmation, which a human holds open for minutes. The signer **re-reads after the human confirms** and refuses if any binding field moved (`REFUSED_LEDGER_MOVED`), with a control test proving an ordinary ledger close does not fire it (E-102).

   **Nine fields left the holder profile**, which now carries secrets and policy only and **refuses any of the nine by name** rather than ignoring it. 168 tests; `tests/ledger_read.rs` is 43 of them and `tests/ledger_devnet.rs` runs the same code against a live node. **On Devnet:** a `ConfidentialMPTSend` built, proved and signed from state the signer read for itself — `tesSUCCESS`, validated, `C63CDCB41183DF55A1CBE9B955AD5EB5C7FE037037AC87EDE31DC4799C5C0EDE` (E-101), then a Convert and **two** Sends on a fresh holder where the second Send's sequence and balance version came from the signer's own read with no help from the driver.

   **REVIEWED 2026-08-19 (`REVIEW-016`), two legs, and the review found real defects.** ⚠ **Both legs independently found the same one**, which is the strongest signal available: `LastLedgerSequence` was read-index + 20, borrowed from `xrpl.js`'s `autofill` — which runs at *submit* time — while this signer puts a **120-second human confirmation** between building and signing. 20 ledgers is ~60–80s on Devnet, so a holder who took ninety seconds got a transaction that had already expired and the signer signed it. Four more, one leg each: the plaintext rule was bypassable by naming a host `127.attacker.example`; `network_id` was cast `as u32`, so `4294967298` truncated to `2` and passed the Devnet guard; *"one pinned ledger index"* was asked for and **never checked**; and `signer_lists` was read from one of the **two** places rippled puts it, so issue #11's third condition would read as zero against an `apiVersion` 2 endpoint. All fixed with tests, all seven spot-checked by reverting them. **Two leg claims were wrong and are pinned by tests rather than by disposition notes** (E-106).

   **F-23 is EXECUTED as of 2026-08-19**, not merely read at source: `tecBAD_PROOF` recorded on validated ledger 4603815, and the amount recovered from public ledger data by the party who supplied the wrong key while the intended destination could not decrypt it.

    **`CLAIMS.md` B-15 was ruled 2026-08-20** (`REVIEW-019`): one endpoint stands for this research artifact **as a named risk acceptance**, with a mandatory disclosure printed whenever it is not loopback. ⚠ **It is a GATE on step 7** — the facility requires loopback, corroboration across independently operated nodes, or a submitter that sets `fail_hard`, and which of the three is a step 7 decision.

   ⚠ **This is what unblocks step 6.** Issue #11 requires detecting `lsfDisableMaster`, a regular key or a signer list, and that **is** a ledger read. `AccountSecurity` reads all three today. ~~**Step 6 is not built and nothing branches on them yet**~~ — **that became false within the same session and round two of `REVIEW-016` caught it.** `lsfDisableMaster` **is** branched on, in two places: `preflight` refuses outright (`REFUSED_MASTER_KEY_DISABLED`, because a master-key signature on such an account is answered `tefMASTER_DISABLED`), and `binding_differs` refuses when it is set mid-confirmation. **A regular key and a signer list are read and branched on nowhere** — they belong to step 6's keygen question, not to signing, and folding them in would refuse transactions rippled would apply.
3. ~~**Wire the vendored prover into the signer**~~ **BUILT AND EXECUTED 2026-08-18.** Throwaway Devnet keys from `mpt_generate_keypair`. Sends and Converts end-to-end. *Falsified if:* `vendor-verify.sh` fails or the pristine upstream verifier rejects a proof. **Neither happened.**

   **The falsifier fired and passed.** `signer/tests/prover_pristine.rs` hands proofs this signer generated to `/tmp/wconf/mptool-pristine` — a **separate binary linked against pristine upstream `85dbac7`** — at n=3, n=4 and a zero-amount Send, and all are accepted (E-80). **It can fail:** corrupting one nibble makes the same verifier answer `FAIL`, which is asserted, because a verifier that answers `OK` to everything makes every other assertion vacuous. `vendor-verify.sh` passes, including its `0.4.0-rc4` vs `1.0.4` source-identity check — which is what makes a `1.0.4` verifier the ledger's verifier rather than a local curiosity.

   **On Devnet:** a `ConfidentialMPTSend` built, proved and signed entirely by `signer/` was accepted — `tesSUCCESS`, validated, `9170912934A842CE90494E66485ADC82739B2276ECD48E2900A1F62A164F9DB0` (E-84). The hash the signer computed matched the node's exactly.

   **Three things this step turned out to contain that its one line did not say:**

   - **The FFI could not use the published crate.** `mpt-crypto-sys@0.1.0-beta.1` pins `0.3.0-rc2` and declares seven functions that no longer exist at `1.0.4` (F-18), so the signer declares its own `extern "C"` surface and `build.rs` pins the three header digests. Two guards, both spot-checked in **both** directions: a pristine library fails to **link**, and a one-line header change stops the **build** (E-81).
   - **XRPL serialisation had to be written.** There is no Rust `ripple-binary-codec` that knows Confidential MPT fields, so `signer/src/xrpl.rs` is a new encoder, decoder, address codec and signer — pinned byte-for-byte against `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0` and `ripple-address-codec@5.0.1` (E-83). **ed25519 was not optional**: every account this project holds on Devnet has an `sEd…` seed.
   - **The confirmation had to change, because the amount is not on the wire.** A Send carries no plaintext amount. The confirmation now **decrypts `SenderEncryptedAmount` out of the transaction it is about to sign**, with the holder's own key, and says `*** COULD NOT BE READ ***` rather than guessing. That is strictly stronger than what step 1 achieved, and it is the same property.

   **REVIEWED 2026-08-18 (`REVIEW-015`), two legs, and the review found real defects.** **Both legs independently found the same one**, which is the strongest signal available: the signer built a **four-participant** proof when an auditor key was configured and serialised only **three** ciphertexts, so every Send on an auditor-enabled issuance would have been unverifiable (F-22). It hid because the Devnet issuance has no auditor and no test fixture had one — **a whole configuration branch with zero coverage, looking fully exercised**. Both legs also found that `Convert` skipped the issuance check `Send` performs. Upheld and fixed: validation ran *after* the randomness reservation, and a test had codified that as intent (E-90); `parse` ignored unrecognised fields while claiming to refuse them, and `MPTAmount` on a Send would have put a **plaintext amount on the confirmation screen** (E-91); and **the step's own falsifier could be aimed at the patched binary and pass** (E-92). **Two findings were wrong and are pinned by tests rather than by a disposition note** (E-93). **A third round** (2026-08-19) was run against this document's own two-round rule, because round two's fixes changed `Convert`'s wire format on the adjudicator's reading of the spec with no second reader. It found `parse` giving `ConvertBack` *Convert's* field set — XLS-0096 §10.3 contradicts that in three places, and a valid ConvertBack would have been **rejected twice over** (E-96). ⚠ **The rule is not overturned; it counts rounds of review, and a fix that introduces new protocol-facing behaviour is a new thing to review.** Adjudicated in `REVIEW-015c`, §8.
4. **Implement the `r`/`ρ` construction** from REVIEW-010c, with its test. ~~**The three amendments A1–A3 are now written into the ruling** (2026-08-18) and the signer must satisfy them: keyed storage so the ledger is not a linkable index into on-chain activity, promotion of expired `pending` entries rather than deletion, and loud degradation rather than bricking on store loss. **They are state-machine rules guarding a cryptographic invariant, so they need adversarial review before the signer is built**, not after.~~ **REVIEWED 2026-08-18 (`REVIEW-013`), and both legs ruled the signer may NOT be built against A1–A3 as they stood.** Six defects, four found independently by both: the store's *set* was unauthenticated so truncation and rollback were undetectable; A1's "pruning bounds the window" contradicted A2's "promote, never delete"; A3's reset was acknowledgeable over IPC and its gap record lived inside the store being reset; A1's protection was overclaimed against the same-host adversary it cited. **Build against A4–A9**, which correct A1–A3 in the same document. The gate this step named is discharged.

   **BUILT 2026-08-18 — `signer/src/randomness.rs` and `signer/src/store.rs`.** The KDF reproduces all nine of REVIEW-010 Deliverable B's vectors from a **second implementation written from the ruling's prose rather than from the TypeScript** (E-75). The ledger implements A4–A9, with a test per amendment: truncation, rollback, reordering and alteration all detected; identifiers append-only; the reset acknowledgeable only in the signer's own window with the gap record in a **separate** log that survives deleting the store; a cancelled confirmation burns rather than clears; a live reservation is not swept out from under a waiting human. **57 tests pass.**

   ~~⚠ **The named falsifier for this step — `observer-harness.ts --assert-no-r-reuse` — has NOT been run against a transaction built by this code**~~ **IT HAS NOW, AND IT PASSED (E-85).** It could not be run against the 2026-08-17 holder: that account's history contains **E-63's deliberately broken Sends**, and the assertion fires on them correctly whatever this signer does. So `tools/spike-step3-2026-08-18/devnet-clean-account.ts` built a clean holder — `rnU7af8QRAgE2Qp7qeAYJLgeMmmTcbvX81` — whose every confidential transaction came from `signer/`: one Convert and **two** Sends, because "no reuse" across a single transaction is vacuous. **ASSERTION PASSED: no ElGamal randomness reuse across 7 transactions**, exit 0.

   **And a second, sharper check the step never named.** `r_entry` commits to `compressed(r·G)`, and `C₁ = r·G` is on the wire — so `signer/src/bin/store-check.rs` takes `C₁` values off the public ledger and confirms the randomness they published is the randomness the ledger recorded. All three **RECORDED, committed**; E-63's reused `C₁` from the other account reports **NOT IN THE LEDGER** (E-86).

   ~~⚠ **And the signing path does not call either of them yet.**~~ **WIRED 2026-08-18**, as this line said it would be. `session::prepare` now runs the eight steps in the order the rulings require, and `signer/tests/signing_path.rs` is what fails if it does not: a signing appends four records; the recorded identifier is the one for the published `C₁`; **a declined confirmation burns rather than clears**, and so does a refusal after the reservation; five signings never share a `C₁`; two attempts in a byte-identical context still produce different randomness (E-88). ⚠ **One real defect surfaced here and no review found it** — `SigningPubKey` is a signing field and was being added *after* the digest, so the signature covered a serialisation the blob did not contain. Every validator would have rejected it (E-87).

   **REVIEWED 2026-08-18 (`REVIEW-014`), and the review found real defects.** Two independent legs against the committed diff. One CRITICAL and four HIGH, the two most serious found by one leg each: a full-directory snapshot rollback is undetectable by any local check (now **stated** rather than claimed away); `Store::create` could silently destroy a live ledger; the generation moved *backwards* when the header was destroyed; the audit log was not append-only against truncation — **A4's own defect, reproduced one file over in the same commit**; and A6 item 5's restore-before-reset was missing. All fixed, each with a falsifying test, and two of the fixes were spot-checked by reverting them to confirm the tests fail. Adjudicated in `REVIEW-014c`; the disposition disagrees with one leg on the recovery *direction* and says why. *Falsified if:* `observer-harness.ts --assert-no-r-reuse` ever fires on our own transactions — **a partial falsifier, and deliberately named as one**: it catches `r` reuse after the fact and says nothing about `ρ` lifecycle, entropy-failure handling, or refusal of caller-supplied fields.
5. ~~**— gate — ADR-0001 `Accepted`.** Requires the keygen ruling.~~ **✅ PASSED 2026-08-18.** The gate was never the keygen ruling by the end — that landed on 2026-08-18 and the ADR still did not move. It was the Option 2 re-weigh, discharged in `REVIEW-013c`. **Steps 6 and 7 are no longer blocked by the ADR; they are blocked by their own items in §5.**
6. ~~**Real key generation and onboarding**, per the keygen ruling — which now exists.~~ **BUILT AND EXECUTED 2026-08-20 — `signer/src/keygen.rs`, `signer/src/onboarding.rs`.** ⚠ **The step was under-scoped by the line it used to be, and issue #11 carried the correction**, and that correction was right: the *cryptography* is about fifty lines and its test already passed, while the *onboarding* is a second key-source path, a second backup story and a second flow. *Falsified if:* `tools/spike-keygen-2026-08-18/t-keygen-construction.ts` fails, or onboarding does not warn when the account carries `lsfDisableMaster`, a regular key or a signer list. **Both halves of that falsifier are written and firing** — `tests/keygen_kat.rs` reproduces the spike's vectors from a Rust implementation written from the ruling's prose, and `tests/onboarding.rs` drives all three conditions **individually**.

   **Four things this step turned out to contain that its line did not say.**

   - **The interop tests `CLAUDE.md` requires cannot be run as they stand, and the sentence next to them is the load-bearing one.** `test_pok_sk`, `test_elgamal` and `test_elgamal_verify` are C programs over *random* keys, so `tests/keygen_interop.rs` drives their **properties** with a derived key instead. And it drives the caveat: *"a constant `sk_A = 1` passes all three"* is a claim, so `a_constant_sk_of_one_passes_every_upstream_check` runs it and asserts they **pass**. That is what makes the known-answer vectors load-bearing rather than decorative.
   - **`ElGamalKeypair::from_parts` never checked that `pk` was `sk·G`**, and the failure it allowed is the worst one this protocol offers: register a key nobody holds the secret for, encrypt every balance to it, and have every step succeed. `CLAIMS.md` **E-120**. Two existing test fixtures were using a pair that had never corresponded.
   - **A profile can now hold no secret at all.** With `"account_seed": "prompt"` and the derived key source, the seed is typed into the daemon's own window and nothing is on disk — which is the only arrangement here where the ruling's §4 holds (E-123). ⚠ It is **opt-in**, because the Devnet drivers run the daemon without a terminal.
   - **§(e)'s benefit is executable, and it was executed.** `cargo run --bin onboard` in recovery mode takes a seed and the account address and reproduces the key on the ledger (E-119). ⚠ **That is not issue #10.** It shows the seed is sufficient *given the derivation*; #10 is about whether the derivation is reachable at all, and no code discharges it.

   **On Devnet:** a `ConfidentialMPTConvert` registering a **derived** `HolderEncryptionKey` — `tesSUCCESS`, validated, `39C7834DD71742B4FEE27D521B4953799B70866443478DF6B7C98901EC8A31D9`, holder `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8` — then a MergeInbox and two Sends, and the registered key **compared against a second, independent TypeScript derivation** through a validated ledger entry (E-118). `observer-harness.ts --assert-no-r-reuse` passed, 7 transactions, exit 0.

   **REVIEWED 2026-08-20 (`REVIEW-020`), two rounds, four legs, and NOT ONE finding touched the derivation.** Both round-one legs independently walked the ruling's §2 against `signer/src/keygen.rs` and both reported it byte-exact; neither recommended putting an abort path back. **Every finding landed in the onboarding half**, which is what issue #11 predicted. Round one upheld three: the confirmation told a holder at the approval step that the registered key *"can never be recovered"* — **false for a derived key, and false about the only thing deriving buys** (E-125); *"the only time the secret is shown"* printed it twice, with the guarding test asserting a count of two; and the ordering test drove only a clean account. ⚠ **Two round-one claims were wrong and are pinned by tests rather than by notes** — the fifth time.

   **Round two found no defect in any fix, and two false sentences written about them** — which is the category a second round exists for. ⚠ **One of them had survived a full round of review because it lived in the one disclosure surface that was not a constant with an asserted wording** (E-126): the daemon banner said *"Neither key can be ROTATED: XLS-0096 has no rotation and no recovery"*, and XLS-0096 does not govern XRPL account keys — an account's spending authority **can** be moved, which is the case this signer warns about a few lines below, in the same window, on the same run.

   ⚠ **What condition 2 buys and where it stops.** The signer warns, flips the recommended source and demands a second typed sentence. It does **not refuse**, because the ruling says *warn and offer*; and none of it defeats an adversary with code execution, who reads `sk_A` from process memory (ruling §8 item 2). **`mlock` is not implemented and is a named gap, not a claim.**
7. **The facility as application logic** — Dedicated Account, single conversion, balance tracking (ADR-0002, TASK ZERO §9). **Say "Dedicated Account", never "vault"**: an XLS-65 `Vault` cannot convert, and the word has already nearly derailed one reading.

   **OPENED 2026-08-24, and what was built is NOT the facility.** Three things stood in front of it and two were code:

   - **`ConfidentialMPTConvertBack` — BUILT AND EXECUTED.** The walkthrough's step 9, and a facility whose exit does not exist is not the facility. Its field set is XLS-0096 **§10.3's**, with the text **re-fetched at source** rather than reconstructed from this project's review notes; the three differences from Convert — a **required** 816-byte `ZKProof`, **no `HolderEncryptionKey` field at all**, and a **required** `BalanceCommitment` — each have a negative assertion. Two on Devnet under a **derived** key, both validated, with all four of §10.5's state changes checked against ledger state rather than inferred from `tesSUCCESS` (E-131).
   - **E-76's other half — CLOSED** (E-132). The ruled `r`/`ρ` derivation is no longer *"in the signer, not everywhere"*.
   - **B-15's step-7 gate — ANSWERED 2026-08-25.** Loopback for the facility's reads, `fail_hard` set by whatever submits. ⚠ **Neither is enforced by the signer**, so both are obligations on the build: a non-loopback endpoint anywhere in the facility, or a submitter that omits the flag, silently reopens F-23. ~~**HANDED OVER, NOT DECIDED.**~~ `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md` costs the three options. ⚠ **One of them adds a submitter, and *"the signer reads the ledger and still does not write to it"* is a claim §1 says is load-bearing in both halves.**

   ⚠ **Building the exit transaction is not passing the gate.** ConvertBack is a transaction type, built under exactly the risk acceptance `REVIEW-019` allows for a research artifact. ~~The Dedicated Account, the drawdowns, the repayments and the balance tracking are what the gate covers and none of them exists.~~ **BUILT 2026-08-25 — `facility/`.** The Dedicated Account, the single conversion, supplier enrolment, drawdowns, repayments, the balance book and retirement in tranches. **81 tests, a real type-check, and four gates** (2026-08-26; the count read *"63 tests, three gates"* until `REVIEW-023` round two, and 63 was stale even at round one's tree, which runs 77). ~~⚠ **NOT EXECUTED — see below.**~~ **EXECUTED 2026-08-25 — 28 validated facility transactions, NOT under B-15's step-7 conditions.** ⚠ **That strike is dated 2026-08-26, because `REVIEW-023` C-6 named this line by file and line and the fix did not reach it** — so this document said *NOT EXECUTED* here and *BUILT AND EXECUTED* ten lines below, for a day, in the document `CLAUDE.md` calls the authority on what is open.

   **What the build actually consists of**, because "application logic" understates it in the way step 2's one line did:

   - **`facility/src/loopback.ts` is the only ledger read path**, and it refuses a non-loopback literal **before it connects** — so a misconfigured facility cannot tell a remote host the shape of its reads on the way to failing. ⚠ **Unless the risk has been accepted by name** (`WCONF_ACCEPT_REMOTE_LEDGER_RISK`, E-151), in which case it prints the disclosure and stamps the run `underB15Conditions: false`. It is **stricter than the signer**: only a numeric literal in `127.0.0.0/8` or `::1`, because a name is resolved by something the process does not control. `REVIEW-016`'s two bypasses and round two's unterminated `[::1` are negative test inputs.
   - **`facility/src/submit.ts` is the submission path for everything the facility does**, and it has **no method that can omit `fail_hard`**. The flag's effect is read at source — rippled 3.3.0 `Transactor.cpp:1645-1651`, *"If the TapFailHard flag is set, a tec result must not do anything"*, plus `NetworkOPs.cpp:1833`, which also stops it being kept locally **or relayed**. ⚠ **One deliberate exception exists and is not in that file**: the fail-hard control's second arm submits once *without* the flag, because demonstrating that the flag makes a difference requires an arm that does not set it. ⚠ **`CLAIMS.md` F-25 is why the flag cannot be bound into the transaction at all** — it is an `ApplyFlags` value chosen by the submitter, not a field of the signed blob, which is the structural reason B-15's Part C is a convention.
   - ⚠ **The driver is NOT the web application of §1, and it holds every party's seed.** §1's box says the web tier *"never sees a secret"*; that remains the design and it is not what `facility/run-facility.ts` is. One process plays the bank, the Dedicated Account and every supplier, writes each family seed into a signer profile on disk, and derives every ElGamal secret to reconcile the book. **Every property that depends on three parties on three machines is not demonstrated by this milestone** (`REVIEW-022g` §2).
   - **`tools/check-loopback.ts` is the static half** of the loopback obligation, and `LoopbackLedger.open` is the dynamic half. Neither alone is the property; both together are close, and *"close"* is the honest word.
   - **`facility/src/book.ts` is TASK ZERO §9's balance-tracking requirement** (R-5, F-8), and the run prints what a lost book costs in **search width** rather than in seconds, because P-8 forbids a benchmark number without hardware, parameter set and methodology.

   ⚠ **BUILT AND EXECUTED 2026-08-25 — 28 validated facility transactions — but NOT under B-15's step-7 conditions.** Every party's decrypted `ConfidentialBalanceSpending` equals the book's prediction, all four registered `HolderEncryptionKey`s are the ruled derivation, the issuance's plaintext `ConfidentialOutstandingAmount` of 2030 is exactly the sum of the three hidden positions, `fail_hard` executed in **both** arms, and `observer-harness --assert-no-r-reuse` passed over 14 transactions. ⚠ **The ledger source was remote**, under the owner's amendment (`CLAIMS.md` **E-151**), so the run is stamped `underB15Conditions: false` and is **not evidence about the loopback obligation**. ⚠ **The first RECONCILIATION refused and that is how F-27 was found**: `ConfidentialMPTConvert` deposits into the **inbox**, not the spendable balance, and the **then-existing** tests could not have caught the mistake because the suite asserts this project's model of the protocol against itself. ⚠ **Both narrowings are round two's.** This sentence said *"the first Devnet transaction"* — the authorize, the public `Payment` and the issuance setup all came first — and *"no unit test could have caught"*, which is false: `facility/tests/book.test.ts` encodes the rule now and fails if `convert` credits `spending`. `REVIEW-023` C-7 ruled both fabricated absolutes **and cited this line**; the fix reached `book.ts` and not this document.

⚠ **What Option A cost, which is why the amendment exists.** B-15's answer requires loopback, so the facility needs a rippled node syncing Devnet. `tools/loopback-node/` is that node — rippled 3.3.0 at git `00a178f`, **the same commit `CLAIMS.md` F-23 was read at** — and it did **not** finish its initial sync inside the session: a fresh node must acquire a whole account state tree while Devnet keeps closing ledgers, and each attempt aborted before completing (`InboundLedger: … abort good:29130 dupe:822`) with 3 GB fetched and no validated ledger. ~~**No facility transaction has been submitted.**~~ **Struck 2026-08-26 — 28 were, on 2026-08-25**, and `REVIEW-023` C-6 cited this line too. Falling back to the public endpoint was available and was **refused by the coding session** — and then **ruled, taken and disclosed**, because the owner amended B-15's answer the same day (**E-151**). ⚠ **The sentence stated the project's final position and had it backwards.** What survives is the narrow rule it was reaching for: *a coding session may not substitute a ledger source on its own authority.* The whole content of the ruling is that the public endpoint is not sufficient here.

   ⚠ **A standalone rippled is NOT a fallback, and the reason is a property of this project rather than an accident.** `signer/src/ledger.rs` hardcodes `DEVNET_NETWORK_ID = 2` and *"refuses every network but Devnet, at any phase, for any reason"*. A local network would have to claim `network_id` 2 to drive the signer — a local ledger presenting itself as Devnet, which is exactly the substitution this project forbids. **So Option A costs a full Devnet sync and there is no rehearsal network.** That was not in the decision request's cost table.

   ⚠ **One thing step 7 turned up that ADR-0002 does not contain, and it is a disclosure error in our own document**: `CLAIMS.md` **F-24**. The facility walkthrough said a ConvertBack publishes *"the aggregate change"*. `MPTAmount` is a plaintext field on **every individual** ConvertBack, so retiring a facility in tranches publishes **every tranche size**. Corrected in the walkthrough; recorded because it survived that document's own `claims-check`.

   *Falsified if:* the facility is built against a remote ledger endpoint while B-15's gate is shut, or if any part of it is described as hiding who transacts, when, or how often.

8. **The web tier — a READ-ONLY, multi-role demonstration surface.** Bun · TanStack Start · Elysia · Tailwind · shadcn-idiom components. **SCOPED, BUILT AND EXERCISED 2026-08-28** — `web/api/` (Elysia, read-only) and `web/app/` (TanStack Start), **89 tests**, both type-checks clean, `make check-web-readonly` is the seventh gate, and the observer view was read against **live Devnet state** under the remote risk acceptance: two accounts at issuance `004625C9…FEE332CB25E8`, **`ConfidentialBalanceInbox` publicly identifiable as exactly zero on both** while `ConfidentialBalanceSpending` was non-zero on the same code path — **F-1 demonstrated live rather than asserted.** ⚠ **NOT under B-15's loopback condition**; the view is stamped `underB15Conditions: false` and says so on the page. **The scoping began with a correction**: ⚠ **`CLAUDE.md` told every new session that *"step 8 was written on 2026-08-26"* and it never was.** §6 had seven steps, §7 followed step 7 directly, and `grep -n "step 8"` over this document returned nothing. So the web tier had **no scope, no falsifier and no gate in the authority document** while the file every session reads first asserted that it did. **A scope note needs a re-check date exactly as much as an amendment claim does** — this document's own lesson about the `xrpl.js` blocker paragraph, landing one section over (`CLAIMS.md` **E-204**).

   **What the step is, in one sentence: it renders what is already readable, and it adds no SIGNING authority.** ⚠⚠ **THIS READ *"and it adds no authority"* UNTIL 2026-09-02, AND THAT IS THE CLAIM `REVIEW-036` RETRACTED** (`CLAIMS.md` E-230): the tier served a decrypted issuer view and signer-local status, unauthenticated, to **any local uid**, out from behind `0600`/`0700` mode bits the project sets deliberately (E-228), until E-241 removed both on 2026-09-05. ⚠ This said *"serves"* until 2026-10-18. **A DISCLOSURE boundary moved. The signing claim is the sound one and is the one this step needs.** Four decisions were put to the project owner during scoping and ruled; they are recorded in **`ADR-0003`** and summarised here because §6 is where a step's shape lives.

   - **D1 — the tier is read-only and never signs.** Browser → Elysia over localhost HTTP → a rippled node over JSON-RPC, plus **one** call into the signer's Unix socket: `Request::Status`, and nothing else. **Signing stays in the `wconf-signer` CLI**, where the holder confirms in the signer's own UI against parsed transaction fields (step 1's falsifier). ⚠⚠ ~~**This is the entire reason step 8 is buildable without an adversarial rotation** — it moves no trust boundary, because it introduces no new authority.~~ **STRUCK 2026-09-02 by `REVIEW-036`** — the rotation ran and ruled that reasoning unsound. **What is true: it introduces no new SIGNING authority**, and that is a narrower statement than *no boundary moves*. ⚠ **The rotation this sentence said was unnecessary is the one that falsified it.** The moment any path in this tier can reach a signing operation, it is a different design and §3's rotation requirement applies **before** implementation.
   - **D2 — the browser wallet is prove-and-contrast, not a participant.** Connect a wallet, prove account control, show that account's **observer view**, and then show the capability matrix explaining what it cannot do. ⚠ **A browser wallet cannot perform a confidential operation**, and that is the demonstration rather than a gap: the operation needs the ElGamal secret **and** the XRPL account key; under the ruled keygen (`REVIEW-012`) the ElGamal secret is **derived from the master seed**; and a wallet extension exists precisely in order not to export seed material. **A fourth reason — that the extension's bundled codec does not know the XLS-0096 types — is asserted by no primary source this repository holds and is carried as a NAMED GAP, not as a premise.**
   - **D3 — TanStack Start is kept, and the split is what makes it safe.** The capital-markets case is multi-role — issuer, auditor, supplier, facility operator, holder — and file-based routing with loaders is what lets those grow without a rewrite. SSR crosses no *new* boundary, because Elysia is already a local process reading holder data. ⚠ **The caveat makes the gate matter MORE, not less: server functions are exactly the one-line mechanism by which a later session adds a signing call.** Only the Elysia process may open the socket.
   - **D4 — Ripple Custody is a research document and a simulated demo mode**, never an integration. This repository holds **no** Metaco Harmonize primary sources; every Harmonize specific is a dated named gap.

   **What this step may touch:** public ledger state at a pinned validated index; the observer harness's view; the issuer-view decryption tool's output, given a demo issuer key handled as the secret it is; `Request::Status`; the facility's run records; and this repository's own documents.

   **What it may never touch:** `Request::Pair`, `Request::Prepare`, any private key, any seed, any proof generation, and the Unix socket from anywhere but the Elysia process.

   ⚠ **One thing verified at source during scoping, because D1's safety argument quotes it.** `signer/src/protocol.rs` documents `Status` as *"Public ledger read. Needs no grant and touches no secret."* **The second sentence is true and the first is false**: the handler at `signer/src/session.rs:248` reads **no ledger at all**. It returns the crate version, a hardcoded `keys_loaded: true`, and a note carrying the holder's address, the randomness ledger's generation id and its **entry count**. ⚠ **None of that is a secret and ⚠⚠ ~~none of it exceeds what the protocol already publishes~~ **STRUCK 2026-09-04, `CLAIMS.md` E-239 — the entry count includes cancelled confirmations, failed proofs and aborted attempts (`store.rs:753-756`), which no observer can reconstruct, and the API also returned the local socket path.** ⚠ E-241 withheld both on 2026-09-05; this said *"returns"* until 2026-10-18. P-4 and P-11 leave *who transacts and how often* public and publish neither of those — **but a comment that misdescribes what a call does is how E-200's secret went unwiped**, and this one sits under the sentence a ruling rests on. Corrected at the source rather than argued around (`CLAIMS.md` **E-205**).

   **The gate is the load-bearing artifact of this step, and it is built before the UI.** `tools/check-web-readonly.ts`, wired into the `Makefile` beside the other six, asserting that no file under the web application imports a UDS client or names the socket path, that the Elysia process constructs `Status` and never `Pair` or `Prepare`, and that no route, loader or server function reaches a signing operation. ⚠ **Gates in this repository have been built to catch false passes and have false-passed** (E-165, E-168, E-182, E-198, E-203), so this one is verified by breaking it in both directions, its controls run through the real detector, and it **states what it does not check** in its own output.

   **The capability matrix is the spine of the demonstration, not a footnote**, and it is derived from what the code supports rather than restated from a handover table. ⚠ **The `derived-from-master-seed` rows carry `REVIEW-012` condition 2's disclosure, which is RULED and not optional** — the master seed becomes a permanent decryption credential, and the warning for `lsfDisableMaster`, a regular key or a signer list must reach the user **before the seed is asked for**. ⚠ **Issue #10 is open and no code discharges it**: the derivation is specified in one repository document and is not a published standard, so the interface must not imply a holder with their seed and not this repository can reconstruct their key.

   ⚠⚠ **THE FIRST BUILD VIOLATED THIS STEP'S OWN *"may never touch any private key"*, AND THE GATE COULD NOT SEE IT.** `web/api/issuer.ts` read the issuer secret and decrypted **per request** behind an unauthenticated `GET` — a decryption oracle, and `ADR-0003`'s own fourth rotation trigger, missed by the session that wrote the trigger (`CLAIMS.md` **E-212**). ⚠ **The gate asked what the tier could REACH; this was about what it HELD**, so a **part 4** now checks that no file under `web/` reads a secret environment variable, calls a decryption routine, or spawns a process. **The key lives in `tools/issuer-view-snapshot.ts` and the tier reads its output**, which is what the clause above always said. ⚠ **Two more of the same species**: the API listened on `0.0.0.0` because a bare port number forwards no hostname to `Bun.serve` (**measured on the LAN**), and the browser identity check ran in one loader rather than at the root (**E-213**).

   *Falsified if:* any file under the web application opens a Unix domain socket, imports a UDS client, or names the signer socket path; or the Elysia process constructs `Request::Pair` or `Request::Prepare`; or any route, loader or server function reaches a signing operation. *Also falsified if:* **any process under `web/` reads a private key, performs a decryption, or spawns a subprocess**, or **the API binds to anything but loopback**. *Also falsified if:* the interface claims a holder is private from the issuer (P-9), presents a freshly-initialised balance as hidden when F-1 says it is publicly known to be exactly zero, describes the custody demo mode as an integration with any custody platform, or emits this project's `tapFailHard` shorthand — which is **not a real name** and has escaped into a public filing once already (E-156).

9. **The hosted demo — a static, read-only page on a public URL.** **SCOPED 2026-10-19. NOT RULED, NOT REVIEWED, NOT BUILT.** `ADR-0004` is the decision record and is `Proposed`. It carries four decisions for the project owner, D-H1 to D-H4, each priced with a recommendation. ⚠ **A public deployment fires two of step 8's own conditions**: its falsifier *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5, egress. So E-309 ruled it a trust-boundary change, and the launch plan's phase 2 requires a three-leg rotation before any code.

   **What the step is, in one sentence, if D-H1 is ruled as recommended:** static files built from the public repository, with no code of this project running per request, and the visitor's browser reading public Devnet state directly over WebSocket. The launch plan asks what the hosted tier serves that a public node does not, and under that shape the answer is fixed at build time: this repository's own text, plus whatever D-H3 deliberately adds.

   **It is a second build target, not a replacement.** Step 8's local tier stays as it is. ⚠ **The hosted reader composes the same `Snapshot` discipline with a WebSocket transport**, because a browser cannot read the public JSON-RPC endpoint and `web/api/ledger-view.ts` already records why a second reader of one obligation is not acceptable.

   **What this step may touch:** public Devnet ledger state, read from the visitor's browser over the one named WebSocket endpoint; static content built from the public repository; and one published issuer snapshot, only if D-H3 rules it.

   **What it may never touch:** any server-side request handler; any socket client or the signer's socket path; any secret, seed or private key, the demo issuer key included; any decryption routine in the shipped output; any network but Devnet; any second ledger endpoint, as a fallback or otherwise; and any analytics or third-party script.

   **Its gate is a hosted part of `tools/check-web-readonly.ts`, run over the BUILT OUTPUT rather than the source**, verified by breaking it in both directions. `ADR-0004` lists what it must check.

   *Falsified if:* the shipped output contains a server function, an API route, a serverless function or middleware; or contains a socket client, the signer socket path, a decryption routine or a secret-shaped value; or permits a connection to anything but the named Devnet WebSocket endpoint; or renders a ledger value without its source disclosure, its network check and the ledger index it was read at; or renders a failed read as an empty account, or substitutes another source; or carries a visitor's lookup in a URL the host receives; or ships bytes other than the ones the gate passed. *Also falsified if:* any of step 8's wording falsifiers holds on the hosted page.

## 7. What this architecture must never claim

Beyond the standing prohibitions in `CLAIMS.md`, which govern:

- That it hides **who** transacts, with whom, when, or how often. It hides amounts (P-4, P-11).
- That a holder is private from the issuer (P-9).
- That anything is secure, audited, non-custodial or production-ready (P-5).
- That keys can be rotated or recovered (P-10).
- That the local-signer boundary stops an adversary with code execution (§3).
- That a demo of the happy path is evidence of confidentiality. It is not — that is what the observer harness is for.
- **That reading the ledger over TLS makes the ledger data trustworthy.** It authenticates the channel to a node the operator chose. A hostile node substitutes a destination's `HolderEncryptionKey` just as well over TLS, and F-23 says that costs the amount, not the transaction. Added 2026-08-19 with §6 step 2, because the temptation to write "reads the ledger securely" is exactly the shape this list exists to stop.

## 8. Open questions this document does not answer

Recorded rather than resolved, so they are not mistaken for settled:

- ~~**Where the signer's ledger state comes from.** §6 step 2 is not built, so the signer reads sequence numbers, balances, balance versions and other holders' encryption keys from a **profile file** an operator points it at.~~ **ANSWERED 2026-08-19 — it reads the ledger.** The question it turned into is narrower and is **open**: *a signer that read the ledger itself would not need to trust anything local* was true and incomplete — it now trusts **one remote node**, and F-23 says what a lying node costs. `CLAIMS.md` **B-15**: whether corroboration across independent endpoints is required, or whether "the operator chose the node" is the whole answer. Reading the same fields twice is cheap under the existing `LedgerSource` trait and is not built. **Named as a gap, not designed around.**
- ~~**Whether the transaction's ECDSA nonce needs a ruling.**~~ **ANSWERED 2026-08-20 — it did, and it has one** (`REVIEW-018`, B-14 → E-109). ~~What is left open is narrower and is **B-16**: ed25519 is deterministic by construction, it is the live path here, and nobody has ruled on whether that residual is accepted.~~ **B-16 IS RULED TOO, 2026-08-27** (`REVIEW-024`, three legs): the residual is **not** accepted and the nonce prefix is hedged. ~~⚠ **Ruled and not built**~~ — **built and executed the same day (E-163).** What is open is the *second review round*, which reviews round one's fixes.
- ⚠ **Whether issue #10 can be discharged at all inside this project.** Condition 1 asks that the derivation be *published in reproducible detail*, and its benefit — a holder who has the seed and not this binary recovers their key — is real only if the specification is reachable **without this repository**. Three independent implementations now agree on the ruling's prose, which is the best evidence available that it is reimplementable; it is **not** publication. An XLS informational draft is the discharge, and **filing one is a Desktop-project decision**. Recorded here so that "step 6 is built" is never read as "condition 1 is met".
- ⚠ **Who holds the Dedicated Account's key.** `CLAIMS.md` E-117 and ADR-0002 rev 4: rejecting the XLS-65 `Vault` traded away a real property — a `Vault` pseudo-account holds pooled assets **with no key**, and the Dedicated Account replacing it does not. ~~**The facility's whole float therefore sits under one ordinary key, and no review has asked who holds it.**~~ **Answered 2026-09-13:** `REVIEW-046` and `REVIEW-047` asked, and found more holders than one key (the issuer can erase or freeze the float, and the key that decrypts is also required to spend), and the owner ruled B-27: accepted by name, printed on every facility run (`CLAIMS.md` E-290, E-294). Added here on 2026-08-24 because step 7 makes it live rather than theoretical, and because the ADR's own comparison table gained a custody row only after the decision was taken.
- ⚠ **Whether a `fail_hard` submitter that is NOT the signer satisfies B-15's gate.** `REVIEW-019` says *"this signer cannot use it: it does not submit. Whoever submits should."* A separate submitter keeps §1's claim intact and gets the F-23 mitigation — but nothing forces that submitter to set the flag, so the mitigation becomes a convention rather than a property. **That is the question the decision request hands over**, and it is not one of the three options as the ruling stated them.
- **How the signer is distributed**, and the trust that follows. If the issuer builds and ships it, "the operator cannot spend holder funds" becomes "…provided the signer does what it claims." Source distribution and reproducible builds would address it. ADR-0001 names this and does not solve it.
- ~~**Whether the spec requires `r` to be unique** — `CLAIMS.md` B-12, unchecked, and this repo holds no XLS-0096 text.~~ **ANSWERED 2026-08-18 → E-67.** The spec text was obtained; it is **silent**, which makes it a specification gap. The premise that this repo holds no XLS-0096 text was true and is no longer.
- **What the Trail of Bits May 2026 revision audit says.** **Still not obtained, and now known not to be publicly published** (issue #5, `CLAIMS.md` B-13): the Trail of Bits publications repository is current through 2026-08 and holds only the April report. The gap is **bounded** rather than unknown — upstream cites `RIPCTXR-1` (decryption timing, reintroduced) and `RIPCTXR-10` (nonce-KDF IKM framing, Informational) in source, and **neither is keygen or randomness sourcing**, so on present evidence it does not gate any ruling made so far.
- ~~**Whether `rho` must be persisted** across transactions.~~ **STRUCK 2026-08-18 — this was never open, and listing it as open invited a wrong and alarming reading.** It does **not** need to persist, and the reason is the most load-bearing fact in ADR-0001 §(a): the proof links `PC_b` to the on-ledger balance ciphertext **using `sk_A` rather than the historical blinding** (`B₂ − b·G = sk_A·B₁`). Requiring `sk_A` exists *precisely so* the old `ρ` is not needed. `PC_b` is a per-proof commitment, not persistent ledger state. **Executed:** `tools/spike-2026-08-17/send.ts:72` draws a fresh `ρ` on every Send and every one has been accepted — if `ρ` had to persist, none could have been. An adversarial leg read the open question as implying permanent fund loss (REVIEW-011c §2); that is refuted, and the question is closed rather than re-opened.

````


## FILE: docs/decisions/ADR-0003-web-tier-trust-boundary.md (complete, at commit d764bca)

````
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

````


## FILE: docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md (complete, at commit d764bca)

````
# PLAN — public repository, hosted demo, and the two posts

**Status:** the shape is ruled (`CLAIMS.md` E-309, 2026-09-22). Nothing in phases 1
to 3 starts before phase 0's exit criterion is met. **This is a plan, not an
authorisation:** each phase names the gate it must pass, and two of them require an
adversarial rotation before any code is written.

**The four goals, in the owner's words:** make the repository public and
contributable; deploy a frontend to Vercel so people can try it; a LinkedIn post
answering *"is confidential transfer possible on XRPL?"*; a blog post on
`nandan.me/writing` covering the project.

**What was ruled on 2026-09-22**, four decisions, each taken on the recommendation:

| Decision | Ruling |
|---|---|
| Demo scope | **Read-only.** No hosted signer, no keys in the page |
| History | **Squashed at publication.** This repository stays the archive of record |
| Filing gate | **The four findings are filed first.** B-28's own condition |
| Repo scope | **Everything but `docs/upstream-observed-WITHHELD.md`**, `docs/reviews/` included |

---

## Phase 0 — close the upstream loop

**Why it is first:** B-28 says the repository stays private until the unfiled
findings are filed or recorded as not-to-file. Eight are recorded (E-298, E-302,
E-308). Four are ruled to file and none is drafted. Publishing a register that names
defects in another team's code, by file and line, before that team has been told is
the thing `docs/UPSTREAM-FILING-PROTOCOL.md` exists to prevent.

1. ~~**The external review of `CLAIMS.md` E-296 to E-307**, ruled in E-308.~~
   **DONE 2026-09-22 — `REVIEW-048`, `CLAIMS.md` E-310.** Three differed legs,
   seventeen findings upheld, all fixed in the rows. Two of them change what gets
   filed (below), and one added **B-30**: the register had settled *"has upstream
   already raised this?"* against Trail of Bits alone, and a second audit of the same
   code exists and is not publicly obtainable.
2. **Round two on `REVIEW-048`'s fixes.** Added 2026-09-22. `CLAUDE.md`'s two-round
   rule — the second round reviews the fixes — and it is owed because round one
   found defects in the rows. **Its stopping condition, set before it runs: no
   third round unless round two finds a fix that did not discharge its finding.**
   **DONE 2026-09-22 — `REVIEW-049`, `CLAIMS.md` E-311, and THE CONDITION FIRED.**
   Three of its eight findings were undischarged, all of them surviving copies or
   short lists, the worst being that B-30's list missed the two filings already sent.
   All eight are fixed. **A third round is owed and running it is the owner's call:**
   recommended as one corpus leg on the native light pass, asking only whether any
   corrected sentence has a surviving copy, **with the rotation closing after it
   whatever it finds.**
   **Ruled and DONE 2026-09-22 — `REVIEW-050`, `CLAIMS.md` E-312. The rotation is
   closed.** Five more surviving copies, all fixed, the worst being the README's
   front door naming one audit.
3. **Draft F-9, F-12, F-13 and F-17.** `/upstream-issue`, then `/issue-review`, then
   the owner's sign-off on each final text. All four go to `XRPLF/mpt-crypto`.
   Each draft states how its finding was established — F-9 run, F-12 run at
   `85dbac7` and read at `1.0.5`, F-13 and F-17 read at `1.0.5`. Four instructions
   from `REVIEW-048`:
   - **F-9** leads with the substitution: rippled's `init.sh` was not run, only its
     remote-add was reproduced by hand.
   - **F-12** says in its first paragraph that upstream's WASM job is green on `main`
     at the pinned emsdk, and **its remedy is three link lines, not the two its
     register row names** (`build-wasm.sh:363`, `:365`, `:374`).
   - **F-13** shows the component table, not the totals. Of two reviewers who re-derived
     1276 B and 1210 B from the row, one got the composition wrong.
   - **F-17 changed shape.** It may not claim the paper's nonce input omits
     `TransactionContextID`: Remark 6.1 never defines `statement`, §6.2 uses the
     word to include the context, and upstream's prover calls its variable
     `stmt_hash`. It files the ambiguity and its consequence.
4. **Search B-30's corpus before sending**, and record the search in each draft.
   `docs/UPSTREAM-FILING-PROTOCOL.md` rule 4. The reachable Sherlock-citing issues
   touch none of these four subjects, so this is unlikely to move them; it still has
   to be recorded rather than assumed.
   **DONE 2026-09-22 — `CLAIMS.md` E-313, `REVIEW-051`.** *Attackathon* widened the corpus to 104
   items, plus the 16 PRs against the contest's public code branch. None touches the four subjects.
5. **File them, and close issue #6** when F-12 is filed. **F-9 FILED 2026-09-28 as `mpt-crypto#148`** (E-314). **F-17, F-12 and F-13 FILED 2026-10-18 as `mpt-crypto#153`, `#154` and `#155`** (E-315). All four are filed.

**Exit:** four filings live at upstream, or a recorded ruling deferring one by name. **Met 2026-10-18.**

---

## Phase 1 — the public repository

**Gate:** phase 0's exit, plus the secret sweep in 1.1 passing on the exact tree that
will be published.

1. **Secret sweep, over the publication tree and over history.** `/tmp/wconf/state.json`
   was never tracked, and that is the claim to verify rather than assume: account
   seeds, ElGamal secrets, `WCONF_ELGAMAL_SK` values, personal addresses and any
   `~/.wconf` path. Write it as a gate (`make check-no-secrets`) with a control that
   must fail, because a sweep recorded in prose is a claim with no falsifier.
2. **Vocabulary.** `tapFailHard` is this project's invention and appears across the
   tree; `docs/VOCABULARY.md` carries the translation. Translate every
   **reader-facing** surface — `README.md`, `GETTING-STARTED-CLAUDE-CODE.md`, the
   architecture document, the web copy, both posts. `docs/reviews/` is a historical
   record and keeps its wording under a banner that points at the translation.
   ⚠ This shorthand escaped into a public upstream filing once already (E-156).
3. **The front door for a stranger.** `README.md` rewritten around what the artifact
   proves, what it refuses to claim (`CLAIMS.md` P-1 to P-12, P-4 and P-9 especially),
   and a five-minute path to running it. Add `CONTRIBUTING.md` (what contributions are
   wanted, the gates a PR must pass, the Devnet-only rule), `CODE_OF_CONDUCT.md`,
   `SECURITY.md` saying plainly that this is a research artifact and not production
   software, and issue and PR templates. ⚠ Added 2026-10-18: the README's *Upstream*
   section describes the filings by outcome and was five weeks stale when E-316 was
   found; run phase 3's survey again on the day the README is finalised. Its *Before
   opting in* item 2 and `docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md` §6 still
   describe #610 as filed, and XLS-0096 PR #604 fixed it: read §7.2 and §7.4 at
   `58ccd30` before rewriting either.
4. **CI.** GitHub Actions running what does not need the vendored build environment:
   the register gates, `check-emphasis`, `check-tables`, `check-web-readonly`,
   `check-filing`, `bun test facility tools`, `tsc --noEmit`. The signer's `cargo test`
   needs `tools/rebuild-env.sh`, which needs network and Conan; either give CI that
   step or document the suite as local-only. **Do not let CI claim coverage it does
   not run.**
5. **Publish.** A squashed publication in the public repository, as two commits since
   `REVIEW-057` (the tree, then its derived revision log); this one keeps
   the full history. The README must say that public history starts at publication and
   that the register's commit citations resolve only in the private archive.
6. **Attribution.** Apache-2.0 is already in `LICENSE`. Check that the vendored
   `mpt-crypto` patch and every third-party citation name their upstream, and that
   `CLAIMS.md` P-7's credits are correct on every public surface.

**Exit:** the repository is public, a stranger can run the test suite from the README,
and `CONTRIBUTING.md` tells them what a good PR looks like.

---

## Phase 2 — the hosted demo

⚠⚠ **This is not a deployment task with a gate attached. It is a trust-boundary
change, and the project's rule is a full adversarial rotation BEFORE implementation.**
Architecture §6 step 8 is *falsified if* *"the API binds to anything but loopback"*
(`ARCHITECTURE-2026-08-18.md:254`), and `ADR-0003`'s trigger 5 fires when any datum
becomes reachable by a party who could not obtain it before. A public deployment is
both. The same tier shipped a decryption oracle once, written by the session that had
just written the trigger (E-212).

1. **Scope it as its own architecture step** with its own falsifier, and write the ADR
   for the hosted surface. The questions it has to answer:
   - **What does the hosted tier serve that a public node does not?** Two things are
     known: `/api/signer` (signer-local status, including a record count covering
     attempts that never reached the ledger) and the decrypted issuer snapshot
     (E-228, E-239). ⚠ **Both had already been withdrawn from the local tier on
     2026-09-05 (E-241)**, before this plan was written: no route serves the figure,
     the record count or the socket path. The hosted design starts from that, and
     this note was added on 2026-10-18 (`REVIEW-057` R1-11). The first is removed
     from the hosted build. The second is the point of the demo and becomes a deliberately published static artifact over
     throwaway Devnet accounts, with the disclosure beside it.
   - **The ledger endpoint.** B-15's named risk acceptance was written for a local
     operator. A hosted page needs its own wording: a lying source makes the page show
     wrong numbers, and nothing signs, so no amount can be published by it.
   - **Devnet resets.** The demo accounts are throwaway. When they vanish the page must
     say so rather than fall back to another source, which is the substitution
     `CLAUDE.md` forbids.
   - Abuse, rate limiting and caching, since the endpoint is no longer one operator's.
   **Drafted 2026-10-19: `ADR-0004`, `Proposed`, and architecture §6 step 9** (`CLAIMS.md` E-327).
   It answers each question above and puts four decisions to the owner, D-H1 to D-H4. The
   snapshot sentence in the first question is D-H3 and is not ruled. Under the recommended
   hosting shape there is no server, so step 3's CORS item and step 4's request-time checks
   change; the ADR says how. Step 2's rotation is owed and has not run.
2. **The rotation.** Three legs, differed packets, before implementation.
3. **Build.** A hosted build target that excludes the socket client entirely; CORS for
   the deployed origin, which today is a localhost regex; the static issuer snapshot;
   a page that tells a visitor how to run the signer locally to transact.
4. **Extend the gate.** `tools/check-web-readonly.ts` asserts the local shape. The
   hosted surface needs its own part: zero socket clients in the deployed bundle,
   no decryption at request time, and the deployed origin checked against what the
   ADR allows. Verify it by breaking it.
5. **Deploy to Vercel and check the live surface** against the ADR's list, from a
   machine that has never run the project.

**Exit:** a live URL that serves public ledger data and one published snapshot,
carries its disclosures on the page, and cannot sign.

---

## Phase 3 — the two posts

**Gate:** the repository is public and the demo is live, so both posts link to
something a reader can check. Each draft runs `claims-check` and one adversarial read
before it is published, and the owner signs off the final text.

⚠ **Gate amended 2026-10-18, on E-316: every filing is re-surveyed at source before
a word of either post is drafted.** The survey is the one E-316 records: the comments
on each issue this project filed, by anyone but this project; `gh pr view` on every
PR a closing comment names; the fix grepped in the merged text rather than taken from
the comment. Each filing is then described by its outcome on the survey date, not by
its register row. On 2026-10-18 the register carried four filings as open that
upstream had fixed and closed in September; a post written from it would have called
four fixed defects open. Phase 1's README states the same outcomes in its *Upstream*
section and runs the same survey before publication.

1. **The blog post** (`nandan.me/writing`). The honest spine: what XLS-96 hides
   (amounts and balances), what it does not (who, when, how often — P-4, P-11), that
   the issuer can always decrypt (P-9), that there is no rotation or recovery (P-10),
   Devnet only with a dated amendment reading (P-3). Then the part that is genuinely
   this project's own: execution over reading, the adversarial rotations and what they
   caught, the gates that catch a false sentence, and the findings filed upstream.
   Credit Cenk, Malhotra, Akinyele, Chen, Xie, Qian and Dore where the work is theirs
   (P-7). **Do not describe the Trail of Bits report as *the* audit of this code**,
   and do not call a finding *unreported* or *new*: B-30 records a second audit,
   the Sherlock XRP Ledger Attackathon, whose findings this project cannot read,
   and B-31 a third, Zellic's scan of mpt-crypto, known only through the three
   identifiers mpt-crypto#147 cites (added 2026-10-18). Name all three, and say
   which one could be checked.
2. **The LinkedIn post.** Short, answers the question in the first line, links the
   demo, the repository and the post. Same prohibitions. No benchmark number without
   hardware and method (P-8). Nothing that reads as *audited*, *production-ready* or
   *secure* (P-5).

**Exit:** both published, both pointing at a live demo and a public repository.

---

## What this plan does not cover

- **The license terms, the public repository's name and owner**, and whether the
  vocabulary translation extends into `docs/reviews/`.
- **Whether CI can run the signer's tests**, which need the vendored build environment.
- **Issue #10**, the unpublished keygen derivation. Publishing it is a new public
  cryptographic artifact and needs its own rotation. It is not a launch blocker, and
  the README should say the derivation is repository-specific and unpublished.
- **The `Observed` rows.** They stay withheld and out of the public tree, by
  `REVIEW-039b` and `REVIEW-039c`.

````


## FILE: web/api/server.ts (complete, at commit d764bca)

````
/**
 * The read-only Elysia API — architecture §6 step 8, `ADR-0003` D1.
 *
 * ```
 * Browser  ──HTTP, localhost, READ-ONLY──►  this process  ──►  rippled (Devnet)
 *                                                │
 *                                                └──►  signer UDS: Status ONLY
 * ```
 *
 * ⚠ **This process is the only thing in the web tier that may open the signer's
 * Unix socket, and `Request::Status` is the only request it may build.** `Pair`
 * and `Prepare` carry authority. `tools/check-web-readonly.ts` asserts both
 * halves and is wired into the `Makefile`.
 *
 * ⚠ **There is no write path here at all — not a disabled one, an absent one.**
 * The tier signs nothing and holds no key, so an XSS in the browser
 * application reaches no SIGNING authority.
 *
 * ⚠⚠ **THIS SAID AN XSS *"reaches exactly what a `curl` against a public node
 * reaches"* UNTIL 2026-09-04, AND THAT WAS FALSE — `CLAIMS.md` E-239.** This
 * same process served a **decrypted issuer snapshot** and **signer-local
 * status**, including a record count that includes attempts which never reached
 * the ledger and the local socket path. **None of that is on a public node.**
 * ⚠ All three were withdrawn on 2026-09-05 (E-241); see the `/signer` route
 * and `issuer.ts`.
 *
 * ⚠ **It is the retracted trust-boundary claim (E-230) surviving as a
 * PARAPHRASE in live source, which is the one shape `check-disclosure-phrases`
 * cannot catch** — it matches copies, not restatements. Found by an adversarial
 * leg asked for the single most overclaiming sentence in the repository.
 * Adding a signing route is not a code-review question; it is the
 * trust-boundary change `ADR-0003` names as a rotation trigger.
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { readSignerStatus } from "./signer-status.ts";
import { LedgerView, LedgerRefusal } from "./ledger-view.ts";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "./capability.ts";
import { observerView } from "./observer.ts";
import { walkFlows } from "./custody-sim.ts";
import { validDemoAccounts, DEMO_ACCOUNTS } from "./demo-accounts.ts";
import { issuerView } from "./issuer.ts";

/**
 * ⚠ **The ledger source is opened lazily and its failure is a rendered
 * disclosure, not a crash.** A tier that cannot reach a node must say which
 * node it could not reach; falling back to another one is the substitution
 * `CLAUDE.md` forbids.
 */
let view: LedgerView | null = null;
let viewError: string | null = null;

async function ledger(): Promise<LedgerView> {
  if (view) return view;
  try {
    view = await LedgerView.open();
    viewError = null;
    return view;
  } catch (e) {
    viewError = e instanceof LedgerRefusal ? `${e.code}: ${e.message}` : String(e);
    throw e;
  }
}

export const api = new Elysia({ prefix: "/api" })
  .use(cors({ origin: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/ }))

  /**
   * What this tier is and what it refuses to be. Served first because a demo
   * that explains itself last has already misled whoever stopped reading.
   */
  .get("/meta", () => ({
    // ⚠ The client asserts this exact string before it trusts any other
    // response. See DEFAULT_PORT above for what it is guarding against.
    service: "wconf-read-only-api",
    tier: "read-only",
    signs: false,
    holdsKeys: false,
    architecture: "ARCHITECTURE-2026-08-18.md §6 step 8, revision 9",
    // ⚠ Was "(Proposed, not adversarially reviewed)" until 2026-09-02 — the
    // rotation ran and the running interface still said it had not (E-234).
    decision:
      "ADR-0003 — the web tier's trust boundary (ACCEPTED 2026-09-05, revision 3). Adversarially reviewed " +
      "2026-09-02 (REVIEW-036): the central claim was ruled UNSOUND and rewritten. This tier adds " +
      "no SIGNING authority; it does NOT follow that no boundary moved. It served a decrypted " +
      "issuer view and signer-local status unauthenticated to any local uid — a disclosure " +
      "boundary, named in CLAIMS.md E-228 and closed by removal on 2026-09-05 (E-241): the " +
      "issuer route reports whether a balance decrypted, never the figure.",
    network: "Devnet only. This project never writes to any other network, at any phase, for any reason.",
    neverClaims: INVARIANTS,
  }))

  /** The signer's own status. The ONE socket call this tier can make. */
  .get("/signer", async () => {
    const probe = await readSignerStatus();
    // ⚠⚠ **`socketPath` AND THE SIGNER'S `note` ARE WITHHELD — `CLAIMS.md` E-241.**
    // `...probe` used to spread both. The socket path is the holder's local
    // filesystem layout (on macOS a per-user `/var/folders/<hash>/T/…`), and
    // the note carries the randomness ledger's generation id and ENTRY COUNT —
    // which `signer/src/store.rs:753-756` commits for "a cancelled
    // confirmation, a failed proof, an aborted attempt", so it counts work that
    // never reached the ledger and no observer can reconstruct.
    //
    // ⚠ The signer's socket is `0600` inside a `0700` directory precisely to
    // keep other users off it (`ipc.rs:100-128`). Re-serving its answer on an
    // unauthenticated loopback listener undid that, because loopback is not
    // uid-scoped (`REVIEW-036` U1, E-228).
    const { socketPath: _withheld, ...safe } = probe as typeof probe & { socketPath?: string };
    const status = "status" in safe ? { ...safe.status, note: undefined } : undefined;
    return {
      ...safe,
      ...(status ? { status } : {}),
      withheld:
        "socketPath and the signer's note (holder address, randomness-ledger generation and entry " +
        "count) are deliberately not served. The entry count includes attempts that never reached " +
        "the ledger, so it is not recoverable from public state (CLAIMS.md E-228, E-241).",
      // ⚠ E-205: the variant's comment said "public ledger read" and it reads
      // no ledger. What comes back is signer-local, and the UI says so.
      whatThisIs:
        "Signer-local status: crate version and whether keys are loaded. The signer's note, which " +
        "names the holder address and the randomness ledger's size, is withheld (see `withheld`). " +
        "It performs no ledger read (CLAIMS.md E-205).",
      whatThisIsNot:
        "Not authority. Status needs no grant and touches no secret; Pair and Prepare are the requests " +
        "that carry authority and this tier cannot construct either.",
    };
  })

  /**
   * Known Devnet accounts, so the demonstration does not open on an empty form.
   * ⚠ Public ledger data only — addresses and issuance ids. The secrets file is
   * not read by this process and must not be.
   */
  .get("/accounts", () => ({
    issuance: "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8",
    accounts: validDemoAccounts(),
    dropped: DEMO_ACCOUNTS.length - validDemoAccounts().length,
    note:
      "A convenience, not a registry. The observer and issuer views take any account and issuance; " +
      "these only save pasting. Addresses and issuance ids are public ledger data (CLAIMS.md P-4, P-11).",
  }))

  /** The ledger source, disclosed. */
  .get("/source", async ({ status }) => {
    try {
      const v = await ledger();
      return v.disclosure;
    } catch {
      return status(503, {
        reachable: false,
        error: viewError,
        namedGap:
          "The ledger source is unreachable. This is a named gap and is reported as one — " +
          "no other endpoint is substituted (CLAUDE.md: a substituted source is a corrupted one).",
      });
    }
  })

  /** What a full-ledger observer sees. The honest counterpart to the demo. */
  .get("/observer/:account/:issuanceId", async ({ params, status }) => {
    try {
      const v = await ledger();
      return await observerView(await v.snapshot(), params.account, params.issuanceId);
    } catch (e) {
      return status(e instanceof LedgerRefusal ? 502 : 503, { error: String(e) });
    }
  })

  /**
   * What the ISSUER sees. ⚠ P-9: no configuration makes a holder private from
   * the issuer, and showing this is the honest counterpart to showing the
   * observer view.
   */
  .get("/issuer/:account/:issuanceId", ({ params }) =>
    // ⚠ **No ledger read, no key, no decryption.** This reads the CLI tool's
    // output file. The route that decrypted per request was an oracle (E-212).
    issuerView(params.account, params.issuanceId))

  /**
   * The custody demo mode. ⚠ A SIMULATION — every response says so, and the
   * verdicts are computed from a declared key-source shape rather than written
   * per flow, so a flow added later cannot be quietly marked "works".
   */
  .get("/custody", () => walkFlows())

  /** The capability matrix — the spine of the demonstration. */
  .get("/capabilities", () => ({
    rows: CAPABILITY_MATRIX,
    invariants: INVARIANTS,
    disclosures: { masterSeed: MASTER_SEED_DISCLOSURE, derivationNotPublished: DERIVATION_NOT_PUBLISHED },
    namedGaps: { walletCodec: WALLET_CODEC_GAP },
  }));

/**
 * ⚠ **3001 was the first default and it collided with a Docker-hosted Gitea on
 * the development machine** — the API died with `EADDRINUSE` while the browser
 * application's proxy happily forwarded `/api/*` to the stranger, which
 * answered `303 See Other` with a login redirect. **Nothing in the tier noticed.**
 * The port moved to 3011 AND `/api/meta` now carries an identity the client
 * checks, because a free port is luck and a checked identity is not.
 */
export const DEFAULT_PORT = Number(process.env.WCONF_WEB_PORT ?? 3011);

/**
 * ⚠⚠ **LOOPBACK, EXPLICITLY — AND THE DEFAULT WAS NOT.** `listen(port)` with a
 * bare number forwards no hostname to `Bun.serve`, whose default is
 * **`0.0.0.0`**. **Measured 2026-08-28**: a `Bun.serve({port})` with no hostname
 * answered on this machine's LAN address. So `make web-api` was publishing a
 * holder's ledger view — and, while the issuer route still decrypted, an
 * unauthenticated decryption oracle — **on every interface** (`CLAIMS.md`
 * E-213).
 *
 * ⚠ **CORS was not a defence and was never going to be**: it constrains
 * browsers, and `curl` is not a browser. The comment in `vite.config.ts` about
 * binding to `127.0.0.1` was applied to the *dev server* and not to this one.
 */
export const BIND_HOSTNAME = "127.0.0.1";

export function serve(port = DEFAULT_PORT) {
  const app = new Elysia().use(api).listen({ port, hostname: BIND_HOSTNAME });
  console.log(`W-CONF read-only API on http://${BIND_HOSTNAME}:${port}/api`);
  console.log(`⚠ READ-ONLY. This process signs nothing and holds no key (ADR-0003 D1).`);
  console.log(`⚠ Bound to ${BIND_HOSTNAME} only — not reachable from another machine.`);
  console.log(`⚠ Devnet only.`);
  return app;
}

if (import.meta.main) serve();

````


## FILE: web/api/observer.ts (complete, at commit d764bca)

````
/**
 * What a full-ledger observer sees.
 *
 * ⚠ **A demo of the happy path is not evidence of confidentiality** — this is
 * the surface that says what is actually public, and its first duty is
 * `CLAIMS.md` **F-1**: a freshly-initialised or post-merge balance is
 * **publicly identifiable as exactly zero**, because `EncZero` is canonical and
 * recomputable by anyone from the holder's public key, the account id and the
 * issuance id. The observer harness proves that by recomputing it
 * independently; this view reports it.
 *
 * ⚠ **P-4 and P-11 govern every sentence here.** Sender, receiver, timing and
 * frequency are public. Only amounts are hidden.
 */

import type { Snapshot } from "../../facility/src/loopback.ts";
import { canonicalEncZero } from "../../tools/observer-harness.ts";

export interface ObserverView {
  account: string;
  issuanceId: string;
  /**
   * Public and plaintext. Not hidden by anything.
   *
   * ⚠ **A DECIMAL STRING.** `MPTAmount` is a UINT64 and a JS `Number` rounds
   * anything over 2^53 — the issuer path was fixed for this (E-215) and this
   * one was missed, which is the fix-the-instance-not-the-phrase shape again
   * (`CLAIMS.md` E-220).
   */
  publicAmount: string;
  registered: boolean;
  holderEncryptionKey?: string;
  confidentialBalanceVersion: number;
  /** ⚠ The whole point of F-1. */
  spending: CiphertextView | null;
  inbox: CiphertextView | null;
  issuance: {
    issuer: string;
    /** ⚠ PLAINTEXT on the issuance object. The sum of every hidden position. */
    /** ⚠ A decimal string, for the same reason as `publicAmount`. */
    confidentialOutstandingAmount: string;
    hasIssuerKey: boolean;
    hasAuditorKey: boolean;
  };
  whatIsPublic: string[];
  whatIsHidden: string[];
}

export interface CiphertextView {
  ciphertext: string;
  /** True when the ciphertext equals the canonical encryption of zero. */
  publiclyKnownZero: boolean;
  note: string;
}

/** Everything on an observer page that is readable with no secret at all. */
export const WHAT_IS_PUBLIC: string[] = [
      "This account's address, and every counterparty it has transacted with (P-4, P-11).",
      "Every transaction's timing and frequency (P-11).",
      "The public, plaintext MPT balance shown above.",
      "The issuance's ConfidentialOutstandingAmount — plaintext, and the sum of every hidden position.",
      "The holder's registered encryption key, once they have converted.",
      "The ConfidentialBalanceVersion, which counts state changes.",
      "⚠ Whether a confidential balance is exactly zero — but ONLY when it carries the canonical " +
        "encryption of zero, which is used on first-time init, merge reset and clawback (F-1). " +
        "⚠ A balance that reached zero by SPENDING is not publicly identifiable as zero (E-211).",
      "⚠ Every individual tranche size when a position is retired in tranches — MPTAmount is plaintext on each ConvertBack (F-24).",
    ];

/**
 * ⚠ **The complete list, and it is two items.** Anything not here is public.
 */
export const WHAT_IS_HIDDEN: string[] = [
      "The value of a confidential balance that does not carry the canonical encryption of zero — " +
        "⚠ including when that value happens to BE zero (E-211).",
      "The amount moved by a ConfidentialMPTSend, from an observer.",
      "⚠ That is the complete list. Nothing else on this page is hidden from anyone.",
    ];

/** ⚠ F-1, stated where it is true rather than in a footnote. */
export const CANONICAL_ZERO_NOTE =
  "⚠ PUBLICLY KNOWN TO BE EXACTLY ZERO. EncZero is canonical — anyone recomputes it from the " +
  "holder's public key, the account id and the issuance id, with no secret at all. A zero " +
  "confidential balance is not hidden (CLAIMS.md F-1).";

/**
 * ⚠⚠ **THIS SAID "Non-zero, and the amount is hidden from an observer" AND THAT
 * WAS FALSE (`CLAIMS.md` E-211).**
 *
 * Measured on Devnet 2026-08-28: holder `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8`
 * decrypts to **0** through the issuer mirror, while its
 * `ConfidentialBalanceSpending` does **not** match the canonical `EncZero`.
 * **A balance can be exactly zero and not publicly identifiable as zero** —
 * F-1's canonical form is used on first-time init, merge reset and clawback, so
 * a balance that reached zero by SPENDING is a homomorphic result: a randomised
 * encryption of zero that matches nothing.
 *
 * ⚠ `tools/observer-harness.ts:277` had the correct hedge — *"not the canonical
 * zero (some non-zero value, or never reset)"* — and this tier flattened it into
 * a flat claim. **The correct source was one import away.**
 */
export const NOT_CANONICAL_NOTE =
  "Does NOT match the canonical encryption of zero, so an observer cannot determine this " +
  "balance's value. ⚠ That is NOT the same as saying it is non-zero: a balance that reached " +
  "zero by spending is a randomised encryption of zero and matches nothing, so it looks exactly " +
  "like this. Only a freshly-initialised, post-merge or post-clawback balance uses the canonical " +
  "form (CLAIMS.md F-1). ⚠ Whatever the value is, it is NOT hidden from the issuer — the " +
  "decryption mirror is mandatory and no configuration disables it (P-9).";

function classify(ciphertext: string | undefined, encZero: string | null): CiphertextView | null {
  if (!ciphertext) return null;
  if (encZero && ciphertext.toUpperCase() === encZero) {
    return {
      ciphertext,
      publiclyKnownZero: true,
      note: CANONICAL_ZERO_NOTE,
    };
  }
  return {
    ciphertext,
    publiclyKnownZero: false,
    note: NOT_CANONICAL_NOTE,
  };
}

export async function observerView(snap: Snapshot, account: string, issuanceId: string): Promise<ObserverView> {
  const mpt = await snap.mptoken(account, issuanceId);
  const iss = await snap.issuance(issuanceId);

  const key = mpt?.holderEncryptionKey;
  const encZero = key ? canonicalEncZero(key, account, issuanceId) : null;

  return {
    account,
    issuanceId,
    publicAmount: mpt?.publicAmountRaw ?? "0",
    registered: Boolean(key),
    holderEncryptionKey: key,
    confidentialBalanceVersion: mpt?.confidentialBalanceVersion ?? 0,
    spending: classify(mpt?.confidentialBalanceSpending, encZero),
    inbox: classify(mpt?.confidentialBalanceInbox, encZero),
    issuance: {
      issuer: iss.issuer,
      confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
      hasIssuerKey: Boolean(iss.issuerEncryptionKey),
      hasAuditorKey: Boolean(iss.auditorEncryptionKey),
    },
    whatIsPublic: WHAT_IS_PUBLIC,
    whatIsHidden: WHAT_IS_HIDDEN,
  };
}

````


## FILE: web/api/issuer.ts (complete, at commit d764bca)

````
/**
 * What the ISSUER sees — read from the CLI tool's OUTPUT, never decrypted here.
 *
 * ⚠ **`CLAIMS.md` P-9: a holder is never private from the issuer.** The
 * decryption mirror is mandatory and no configuration makes this false. Showing
 * the issuer's view beside the observer's is the honest counterpart to showing
 * what the public sees.
 *
 * # ⚠⚠ THIS MODULE HELD THE ISSUER KEY AND DECRYPTED PER REQUEST. THAT WAS A
 * DECRYPTION ORACLE, AND IT VIOLATED THIS MILESTONE'S OWN SCOPE.
 *
 * Architecture §6 step 8 — written by the session that then broke it — says the
 * tier **may touch** *"the issuer-view decryption tool's **output**, given a
 * demo issuer key handled as the secret it is"* and **may never touch** *"any
 * private key"*. `CLAUDE.md` says the issuer-view tool is *"a single CLI
 * command … **Not a standalone application**."*
 *
 * The first version read `WCONF_ELGAMAL_SK` from the environment and decrypted
 * on demand. ⚠ **An unauthenticated `GET` where the caller chooses the account
 * and receives a decrypted balance is an oracle** — CORS constrains browsers,
 * not `curl`, and `/meta`'s `holdsKeys: false` was false while it ran. It is
 * the **fourth rotation trigger `ADR-0003` names**, written by the same session
 * one file over (`CLAIMS.md` E-212).
 *
 * ⚠ **And the helper it used passed the secret through `argv`** —
 * `decryptInRange` spawns `mptool decrypt <ct> <sk> …`, and argv is
 * world-readable via `ps`: the precise exposure the issuer CLI refuses a
 * `--key` flag to avoid.
 *
 * # What it is now
 *
 * **A file reader.** `tools/issuer-view-snapshot.ts` holds the key, decrypts the
 * curated demo set in-process via `@xrplf/mpt-crypto`, and writes results. This
 * module reads those results. ⚠ **There is no key here, no decryption, no
 * subprocess and no attacker-chosen input** — the oracle is *removed*, not
 * guarded, so there is nothing to authenticate.
 */

import { readFileSync } from "node:fs";

/**
 * ⚠ **Named here so `check-web-readonly` can assert the web tier never READS
 * it.** The variable belongs to the CLI tool; this constant exists to be
 * checked against, not to be consulted.
 */
export const FORBIDDEN_SECRET_ENV = "WCONF_ELGAMAL_SK";

export const ISSUER_KEY_POLICY =
  "This process holds NO issuer key, performs NO decryption, and DOES NOT SERVE a decrypted " +
  "balance. The key lives only in tools/issuer-view-snapshot.ts, which reads it from the " +
  "environment — never a flag, because argv is world-readable via `ps` — decrypts a curated set " +
  "in-process, and writes results to a file it creates with mode 0600. ⚠ This tier reads that file " +
  "and forwards WHETHER a balance was decryptable, never the figure. " +
  "⚠⚠ Serving the figure was a disclosure boundary, not a signing one: loopback is not uid-scoped, " +
  "so an unauthenticated GET handed every local user a value the producing tool had just " +
  "restricted to one (CLAIMS.md E-228, ruled and removed E-241). There is no request that reaches " +
  "a decryption and none that returns one. The figure is in tools/issuer-decrypt-balance.ts, a CLI " +
  "command, which is where CLAUDE.md says the issuer view belongs.";

/** The ledger field the snapshot tool decrypts. Named once, asserted in tests. */
export const MIRROR_FIELD_LEDGER_NAME = "IssuerEncryptedBalance" as const;

/**
 * ⚠⚠ **READ LAZILY, AND THAT IS A CORRECTNESS FIX RATHER THAN A STYLE ONE.**
 *
 * As a module-level `const` this bound at import time — so a test that set
 * `WCONF_ISSUER_SNAPSHOT` afterwards was ignored, and a `await import()` handed
 * back the **cached** module rather than re-reading it. The refusal test
 * therefore pointed at the DEFAULT path, which is absent in a clean checkout,
 * so `issuerView` returned unavailable for that reason and the test passed
 * **whether or not the refusal existed**. ⚠ **Measured: deleting both refusal
 * lines left all 46 tests green** (`CLAIMS.md` E-215).
 *
 * ⚠ **Fifth instance in this repository of a check built to catch false passes
 * false-passing** (E-165, E-168, E-182, E-203, E-207) — and this one was
 * written in the round that fixed a false pass.
 */
function snapshotPath(): string {
  return process.env.WCONF_ISSUER_SNAPSHOT ?? "/tmp/wconf/issuer-view-snapshot.json";
}

export interface IssuerViewResult {
  available: boolean;
  reason?: string;
  keyPolicy: string;
  account: string;
  issuanceId: string;
  mirrorField?: string;
  /**
   * ⚠⚠ **`decrypted` IS NO LONGER SERVED — `CLAIMS.md` E-241, ruled 2026-09-05.**
   *
   * The snapshot still holds it; **this API does not forward it.** The tool that
   * produces the snapshot writes it `mode 0o600`, and serving its contents over
   * an unauthenticated loopback listener handed every local uid a value the
   * project had just restricted to one — `REVIEW-036` U1, `CLAIMS.md` E-228.
   *
   * ⚠ **The remedy is E-212's own: REMOVE the capability rather than guard it.**
   * There is no request that reaches a decryption **and none that returns one**,
   * so there is still nothing to authenticate.
   *
   * ⚠ **What the view keeps is the point it was making.** That the issuer CAN
   * read this balance is proved by `mirrorField` being present and populated on
   * the ledger — P-9, which no configuration removes. **The plaintext integer
   * demonstrated only that THIS PROJECT holds the demo issuer key**, which
   * nobody doubted. The integer lives where `CLAUDE.md` says it belongs: in
   * `tools/issuer-decrypt-balance.ts`, a CLI command, not a served field.
   */
  decryptedWithheld: true;
  /** ⚠ Whether the tool COULD decrypt it. The fact, not the figure. */
  decryptable?: boolean;
  searchedTo?: string;
  publicAmount?: string;
  /** ⚠ When the snapshot was taken. Balances move; a stale number is a lie by omission. */
  snapshotAtUnix?: number;
  snapshotAgeNote?: string;
  whatThisProves: string;
}

interface Snapshot {
  producedAtUnix?: number;
  entries?: Record<string, any>;
}

function loadSnapshot(): Snapshot | null {
  try {
    const parsed = JSON.parse(readFileSync(snapshotPath(), "utf8"));
    // ⚠ **A snapshot carrying anything key-shaped is REFUSED, not filtered.**
    // The tool writes results only; a file that does not look like that is not
    // a file this tier should be reading.
    const raw = JSON.stringify(parsed);
    // ⚠ Built from the constant, not inlined. A regex literal is not a string
    // literal, so an inlined spelling survives the gate's comment/literal
    // stripping and reads as a genuine secret reference — which is exactly what
    // it did on the first run of part 4.
    if (/"(sk|secret|privateKey|elgamal_sk|seed)"\s*:/i.test(raw)) return null;
    if (new RegExp(`\\b${FORBIDDEN_SECRET_ENV}\\b`).test(raw)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function issuerView(account: string, issuanceId: string): IssuerViewResult {
  const base = {
    decryptedWithheld: true as const,
    keyPolicy: ISSUER_KEY_POLICY,
    account,
    issuanceId,
    whatThisProves:
      "⚠ That the issuer can read this holder's balance, always. P-9 is not a limitation of this " +
      "demo — the decryption mirror is part of the protocol and no configuration removes it. A " +
      "holder is confidential from the PUBLIC, never from the ISSUER.",
  };

  const snap = loadSnapshot();
  if (!snap?.entries) {
    return {
      ...base,
      available: false,
      reason:
        `No issuer-view snapshot at ${snapshotPath()}. ⚠ This is a NAMED GAP in the view, not ` +
        `evidence that the issuer cannot decrypt — P-9 says it can. Produce one with: ` +
        `WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts`,
    };
  }

  const entry = snap.entries[`${account}/${issuanceId}`];
  if (!entry) {
    return {
      ...base,
      available: false,
      snapshotAtUnix: snap.producedAtUnix,
      reason:
        `This account is not in the snapshot. ⚠ The snapshot covers a CURATED demo set, not every ` +
        `account — that bound is what removes the attacker-chosen input, and it is deliberate. ` +
        `Add it to web/api/demo-accounts.ts and re-run the tool.`,
    };
  }

  return {
    ...base,
    available: Boolean(entry.available),
    reason: entry.reason,
    mirrorField: entry.mirrorField,
    // ⚠⚠ E-241: `entry.decrypted` is READ and deliberately NOT forwarded. Only
    // whether it exists crosses the boundary, never its value.
    decryptedWithheld: true,
    decryptable: entry.decrypted !== undefined,
    searchedTo: entry.searchedTo,
    publicAmount: entry.publicAmount,
    snapshotAtUnix: snap.producedAtUnix,
    snapshotAgeNote:
      "⚠ A SNAPSHOT, not a live read. Balances move; this is what the issuer saw when the tool ran.",
  };
}

````


## FILE: web/api/ledger-view.ts (complete, at commit d764bca)

````
/**
 * The web tier's ledger reads — **the facility's path, not a second one.**
 *
 * `facility/src/loopback.ts` already carries B-15's obligation: it refuses a
 * non-loopback endpoint *before it connects*, it demands the risk-acceptance
 * sentence by name when the owner's amendment is in force, it refuses any
 * network but Devnet, and its `Snapshot` pins one validated index and checks
 * every answer came from it (E-103). ⚠ **Reimplementing any of that here would
 * produce a second reading of one obligation and the two would drift** — which
 * is `CLAIMS.md` E-141's shape. This module composes it instead.
 *
 * ⚠ **What a wrong read costs is a CONFIDENTIALITY break, not a rejected
 * transaction** (`CLAIMS.md` F-23, executed on 2026-08-19). That is why the
 * endpoint discipline is inherited rather than relaxed for a read-only tier:
 * the tier does not sign, but the values it *renders* are what a reader
 * believes, and a substituted key renders a lie.
 */

import { LoopbackLedger, Snapshot, LedgerRefusal, type MPTokenState, type IssuanceState, type NodeIdentity } from "../../facility/src/loopback.ts";

export { LedgerRefusal };
export type { MPTokenState, IssuanceState, NodeIdentity };

/** What the tier shows about its own ledger source. Rendered, never hidden. */
export interface SourceDisclosure {
  endpoint: string;
  isLoopback: boolean;
  networkId: number;
  buildVersion: string;
  /** ⚠ False means B-15's step-7 conditions are NOT met and the UI must say so. */
  underB15Conditions: boolean;
  note: string;
}

export class LedgerView {
  private constructor(
    private readonly ledger: LoopbackLedger,
    readonly disclosure: SourceDisclosure,
  ) {}

  static async open(endpoint = process.env.WCONF_LEDGER_ENDPOINT ?? "http://127.0.0.1:5005"): Promise<LedgerView> {
    const ledger = await LoopbackLedger.open(endpoint);
    const id = ledger.identity;
    return new LedgerView(ledger, {
      endpoint: ledger.endpoint,
      isLoopback: id.isLoopback,
      networkId: id.networkId,
      buildVersion: id.buildVersion,
      underB15Conditions: id.isLoopback,
      note: id.isLoopback
        ? "Loopback ledger source. B-15's step-7 condition is met for reads."
        : "⚠ REMOTE ledger source, under the project owner's named risk acceptance (CLAIMS.md E-151). " +
          "B-15's step-7 condition is NOT met and this view is not evidence about it. A hostile node " +
          "substitutes a key just as well over TLS (CLAIMS.md F-23).",
    });
  }

  /** One pinned validated index for everything a page renders together. */
  async snapshot(): Promise<Snapshot> {
    return this.ledger.snapshot();
  }
}

````


## FILE: web/api/demo-accounts.ts (complete, at commit d764bca)

````
/**
 * Known Devnet accounts, so the demonstration does not open on an empty form.
 *
 * ⚠⚠ **PUBLIC LEDGER DATA ONLY, AND THE OMISSION IS DELIBERATE.** An account
 * address and an `MPTokenIssuanceID` are readable by anyone with a block
 * explorer — that is `CLAIMS.md` P-4 and P-11, and rendering them gives nothing
 * away that the protocol was hiding.
 *
 * ⚠ **`/tmp/wconf/state.json` IS NOT READ AND MUST NOT BE.** That file holds
 * throwaway account seeds and ElGamal secrets. The addresses below were
 * transcribed from it by hand, once, and **the secrets stayed there** — a
 * read-only rendering tier that opens a file full of seed material has become
 * something else, whatever it does with the contents. If this list needs to
 * grow, transcribe the public fields again rather than teaching this process to
 * read that file.
 *
 * ⚠ **It is a convenience, not a registry.** The observer and issuer views take
 * any account and issuance; this only saves pasting 34 and 48 characters.
 */

export interface DemoAccount {
  address: string;
  issuanceId: string;
  label: string;
  /** What this account is useful for showing. Rendered, so it is a claim. */
  note: string;
}

/** The issuance every account below holds. */
export const DEMO_ISSUANCE = "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder A — an active position",
    note:
      "A non-zero spending balance the public cannot read, and an inbox that is publicly " +
      "identifiable as exactly zero. The clearest single view of what is and is not hidden.",
  },
  {
    address: "rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder B — a derived-key account",
    note:
      "Onboarded under the ruled derivation, so its viewing key comes from its master seed. " +
      "The capability matrix's first row, on the ledger.",
  },
  {
    address: "rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder C — the ed25519 signing account",
    note:
      "The account the hedged-ed25519 work was executed on. Its ledger view is ordinary — which " +
      "is the point: a signature change is invisible to an observer.",
  },
  {
    address: "rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder D — an early spike account",
    note: "Kept because a second non-zero position makes the contrast legible rather than anecdotal.",
  },
];

/**
 * ⚠ **Every entry is checked to be a plausible address and issuance id before
 * it is served**, because a typo here renders as "this account holds nothing"
 * — which reads exactly like a true statement about the ledger.
 */
export function validDemoAccounts(): DemoAccount[] {
  return DEMO_ACCOUNTS.filter(
    (a) => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a.address) && /^[0-9A-F]{48}$/.test(a.issuanceId),
  );
}

````


## FILE: web/app/src/routes/observer.tsx (complete, at commit d764bca)

````
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";
import { AccountPicker } from "../components/AccountPicker";

export const Route = createFileRoute("/observer")({
  validateSearch: (s: Record<string, unknown>) => ({
    account: (s.account as string) ?? "",
    issuanceId: (s.issuanceId as string) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [source, picker] = await Promise.all([
      api.source().catch((e) => ({ error: String(e) })),
      api.accounts().catch(() => ({ accounts: [] })),
    ]);
    if (!deps.account || !deps.issuanceId) return { source, picker, view: null };
    const view = await api.observer(deps.account, deps.issuanceId).catch((e) => ({ error: String(e) }));
    return { source, picker, view };
  },
  component: Observer,
});

function Observer() {
  const { source, picker, view } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/observer" });

  return (
    <>
      <Panel title="Ledger source" tone={source.isLoopback ? "plain" : "warn"}>
        {source.error ? (
          <p className="text-sm">{source.error}</p>
        ) : (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">endpoint</span> <code>{source.endpoint}</code></div>
            <div><span className="opacity-60">rippled</span> <code>{source.buildVersion}</code></div>
            <div><span className="opacity-60">network_id</span> <code>{source.networkId}</code> (Devnet)</div>
            <p className="mt-2">{source.note}</p>
          </div>
        )}
      </Panel>

      <Panel title="Look up an account">
        <AccountPicker to="/observer" accounts={picker.accounts ?? []} current={search} />
        <form
          className="flex flex-wrap gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            navigate({ search: { account: String(f.get("account") ?? ""), issuanceId: String(f.get("issuanceId") ?? "") } });
          }}
        >
          <input name="account" defaultValue={search.account} placeholder="r..." className="border rounded px-2 py-1 flex-1 min-w-56 bg-transparent" />
          <input name="issuanceId" defaultValue={search.issuanceId} placeholder="MPTokenIssuanceID (48 hex)" className="border rounded px-2 py-1 flex-1 min-w-56 bg-transparent" />
          <button className="border rounded px-3 py-1 font-medium">Read</button>
        </form>
        <p className="text-xs opacity-60 mt-2">
          Reads only. Nothing here can build, sign or submit a transaction.
        </p>
      </Panel>

      {view && !view.error && (
        <>
          <Panel title="What a full-ledger observer sees">
            <div className="text-sm space-y-1 mb-4">
              <div><span className="opacity-60">public MPT balance</span> <code>{view.publicAmount}</code> — plaintext, hidden from nobody</div>
              <div><span className="opacity-60">registered</span> <code>{String(view.registered)}</code></div>
              <div><span className="opacity-60">ConfidentialBalanceVersion</span> <code>{view.confidentialBalanceVersion}</code></div>
              <div><span className="opacity-60">ConfidentialOutstandingAmount</span> <code>{view.issuance.confidentialOutstandingAmount}</code> — plaintext on the issuance, the sum of every hidden position</div>
            </div>
            {["spending", "inbox"].map((k) => {
              const ct = (view as any)[k];
              if (!ct) return <p key={k} className="text-sm opacity-60">no {k} ciphertext</p>;
              return (
                <div key={k} className={`mt-3 p-3 rounded border ${ct.publiclyKnownZero ? "border-[var(--color-warn)]" : "border-black/10 dark:border-white/15"}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-60">{k}</div>
                  <code className="text-[10px] break-all block my-1 opacity-80">{ct.ciphertext}</code>
                  <p className="text-sm">{ct.note}</p>
                </div>
              );
            })}
          </Panel>

          <Panel title="Public" >
            <ul className="text-sm space-y-1 list-disc pl-5">
              {view.whatIsPublic.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </Panel>

          <Panel title="Hidden">
            <ul className="text-sm space-y-1 list-disc pl-5">
              {view.whatIsHidden.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </Panel>
        </>
      )}
      {view?.error && <Panel title="Read failed"><p className="text-sm">{view.error}</p></Panel>}
    </>
  );
}

````


## FILE: facility/src/loopback.ts (complete, at commit d764bca)

````
/**
 * loopback.ts — the facility's ONLY ledger read path.
 *
 * # Why this module exists, and why it refuses rather than warns
 *
 * `CLAIMS.md` **B-15**'s step-7 gate was ruled by the project owner on
 * 2026-08-25: **the facility's ledger reads go to loopback.** Not "should"; the
 * ruling is what opened architecture §6 step 7 at all, and `REVIEW-019` is
 * explicit that *"we ran a local node once" is not the property* — the property
 * is that **every** read the facility makes goes to a node the operator runs.
 *
 * What it is defending against is `CLAIMS.md` **F-23**, and F-23 is
 * **executed**, not reasoned. A `ConfidentialMPTSend` encrypts the amount to
 * the destination's `HolderEncryptionKey` and the issuer's
 * `IssuerEncryptionKey`, **both read from the ledger**. A substituted key fails
 * the proof with `tecBAD_PROOF` — and a `tec` is *applied to the ledger* with
 * every ciphertext in it. On 2026-08-19 that was run on Devnet and the amount
 * **42 was recovered from public ledger data by the party who supplied the
 * wrong key**, while the intended destination could not decrypt it.
 *
 * So a lying ledger source does not cost a transaction. It costs the
 * confidentiality of the amount, permanently, in public. **TLS does not address
 * it** — TLS authenticates the channel to a node the operator chose, and a
 * hostile node lies just as well over TLS.
 *
 * # ⚠ What this module does NOT buy
 *
 * Nothing about the same-host adversary the issue #1 ruling put in scope. That
 * adversary can point this at a different endpoint, or edit the local node's
 * answers. The trust boundary is unchanged and `CLAIMS.md` P-5 still forbids
 * calling any of this secure.
 *
 * # Stricter than the signer, deliberately
 *
 * `signer/src/ledger.rs` accepts the *name* `localhost` as loopback. This
 * accepts only an **address**, never a name, because a name is resolved by
 * something this process does not control and there is no cost to requiring
 * the address. `REVIEW-016` found the hosts `127.attacker.example` and
 * `127.0.0.1@attacker.example` walking through the Rust check that exists
 * *because of* F-23. Those two shapes are negative test inputs in
 * `facility/tests/loopback.test.ts` — written there rather than quoted here, so
 * that they are executed rather than described.
 *
 * ⚠ **"Address" means what `URL` canonicalises to, and that is wider than a
 * dotted quad.** WHATWG `URL` folds `2130706433`, `0177.0.0.1`, `0x7f.1`,
 * `127.1`, a trailing dot and even Unicode digit forms all to `127.0.0.1`
 * before this check ever sees them, so **all of those are ACCEPTED** — and
 * correctly, because every one of them genuinely is loopback. An earlier
 * version of this comment said *"only a dotted-quad literal"* and the session's
 * own review leg then asserted those forms were **refused**, from reasoning
 * rather than from running them. `REVIEW-022`'s Codex leg ran them.
 * `facility/tests/loopback.test.ts` now pins them as accepted, so that a later
 * session cannot "tighten" the check into rejecting real loopback addresses.
 *
 * # ⚠ Redirects are refused, because a redirect is the whole check undone
 *
 * `fetch` follows redirects by default. A loopback endpoint answering `307`
 * could forward the POST — and every one after it — to a remote host, and
 * `LoopbackLedger.open`'s check would have passed on the original URL.
 * `signer/src/ledger.rs` sets `max_redirects(0)` for exactly this reason and
 * this file did not until `REVIEW-022`'s Codex leg found it.
 */

// ---------------------------------------------------------------------------
// The escape hatch, and everything about it is deliberate.
// ---------------------------------------------------------------------------

/**
 * The exact string `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold before this
 * module will read a ledger anywhere but loopback.
 *
 * ⚠ **It is a sentence, not a `1`, and that is the point.** A flag that can be
 * set by muscle memory is a flag that gets set by muscle memory. Somebody has
 * to type this, and typing it is the acknowledgement.
 *
 * ⚠ **This does not make a remote endpoint safe. It makes it RECORDED.**
 * `CLAIMS.md` F-23 is executed: on 2026-08-19 an amount was recovered from
 * public ledger data by the party who supplied a wrong key. Nothing here
 * changes that; what changes is that a run which accepted the risk says so, in
 * its output and in its own run record.
 */
export const RISK_ACCEPTANCE_PHRASE =
  "I accept CLAIMS.md F-23: a lying ledger source publishes the amount";

/**
 * Printed to stderr, in full, on every run that uses the hatch.
 *
 * ⚠ **A constant with an asserted wording**, because `CLAIMS.md` E-126 records
 * that the one disclosure surface which was not a constant is where a false
 * sentence lived through a whole round of review — and `REVIEW-022` then found
 * this file's sibling citing a wording test that did not exist. This one has
 * `facility/tests/risk-acceptance.test.ts`.
 */
export const REMOTE_LEDGER_DISCLOSURE = [
  "⚠ THIS RUN IS NOT UNDER B-15's STEP-7 CONDITIONS.",
  "",
  "  The facility's ledger source is REMOTE and is trusted for amount",
  "  confidentiality. CLAIMS.md F-23 is EXECUTED, not theoretical: a source that",
  "  lies about a destination's HolderEncryptionKey makes the signer publish the",
  "  amount encrypted under the liar's key, permanently, in public. TLS does not",
  "  address it — it authenticates the channel to a node someone chose.",
  "",
  "  B-15's step-7 answer was AMENDED by the project owner on 2026-08-25 to",
  "  extend REVIEW-019's named risk acceptance to this demo. That amendment, like",
  "  the ruling it amends, has had NO adversarial review.",
  "",
  "  What a run under this hatch CAN establish: that the transactions serialise,",
  "  that rippled accepts them, that the balances decrypt to what the book",
  "  predicts, and what a full-ledger observer sees.",
  "",
  "  ⚠ It does NOT establish XLS-0096 §10.5's state changes. This sentence said it",
  "  did, while run-facility.ts's own header said it did not — REVIEW-023 found the",
  "  pair. The driver checks the outstanding-amount delta on the float conversion",
  "  and reconciles decrypted balances; there are no per-movement assertions over",
  "  the public amount or the balance version. CLAIMS.md B-18.",
  "",
  "  What it CANNOT establish: anything whatever about the loopback obligation.",
  "  Do not record a run under this hatch as evidence that the facility keeps it.",
].join("\n");

/** A read or a check that must stop the facility, distinct from a bug. */
export class LedgerRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "LedgerRefusal";
  }
}

/**
 * Is this endpoint a loopback literal?
 *
 * Parsing is delegated to `URL`, which is what strips userinfo (`user@host`)
 * and rejects an unterminated `[::1`. A hand-rolled split on `@`, `:` or `]`
 * is exactly how the Rust version acquired two holes.
 */
export function isLoopbackEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return false;
  // `URL.hostname` is the host with userinfo removed and IPv6 brackets kept.
  const host = url.hostname.toLowerCase();
  if (host === "[::1]") return true;
  // Only a dotted-quad literal in 127.0.0.0/8. A name — `localhost` included —
  // is resolved by something outside this process.
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o > 255)) return false;
  return octets[0] === 127;
}

/** The fields a facility read needs from one holder's `MPToken`. */
export interface MPTokenState {
  /** Public, plaintext MPT balance. Absent means zero. */
  publicAmount: number;
  /**
   * ⚠ **The same value as a DECIMAL STRING, losslessly.**
   * `MPTAmount` is a UINT64 and rippled serialises it as a string for that
   * reason; `publicAmount` above rounds anything over 2^53. The number is kept
   * because the facility does arithmetic on it and its values are small; **any
   * surface that DISPLAYS the amount must use this field** (`CLAIMS.md` E-220,
   * the same defect E-215 fixed on the issuer path and missed here).
   */
  publicAmountRaw: string;
  /** 33-byte compressed ElGamal point, hex — absent until the holder Converts. */
  holderEncryptionKey?: string;
  confidentialBalanceSpending?: string;
  confidentialBalanceInbox?: string;
  /** Present as a JSON **string** when non-zero, absent when zero. */
  confidentialBalanceVersion: number;
  /**
   * ⚠ **The issuer's mandatory decryption mirror.** `CLAIMS.md` P-9: no
   * configuration removes it, so this field is present on every confidential
   * balance and the issuer's ElGamal secret decrypts it.
   *
   * ⚠ **It is a DIFFERENT ciphertext from `confidentialBalanceSpending`, and
   * assuming otherwise costs an afternoon** — measured 2026-08-28: the issuer
   * key against the holder's spending ciphertext returns `rc=-1` from `mptool
   * decrypt`, and against this field returns the balance.
   *
   * Added 2026-08-28 for architecture §6 step 8's issuer view. The facility
   * never read it: it reconciles each party's OWN balance with that party's own
   * key, which is a different question from what the issuer can see.
   */
  issuerEncryptedBalance?: string;
  /** The optional auditor's mirror, present only if an auditor was named. */
  auditorEncryptedBalance?: string;
}

export interface IssuanceState {
  issuer: string;
  /** ⚠ rippled serialises every `UINT64` as a JSON **string**. */
  confidentialOutstandingAmount: number;
  /** ⚠ The same value as a decimal string, losslessly. See `publicAmountRaw`. */
  confidentialOutstandingAmountRaw: string;
  issuerEncryptionKey?: string;
  auditorEncryptionKey?: string;
  transferFee: number;
  flags: number;
}

/**
 * A pinned read.
 *
 * Two `"validated"` reads seconds apart land in **different ledgers** — E-103
 * observed it live against the public cluster. The index is taken once and
 * every later call carries that number, and every answer is checked to have
 * come from it. That check is the part `REVIEW-016` found *"asked for and never
 * checked"* in the Rust version.
 */
export class Snapshot {
  constructor(
    private readonly ledger: LoopbackLedger,
    readonly index: number,
  ) {}

  private async pinned(method: string, params: Record<string, unknown>): Promise<any> {
    const result = await this.ledger.call(method, { ...params, ledger_index: this.index });
    const answered = Number(result.ledger_index ?? result.ledger_current_index ?? NaN);
    if (answered !== this.index) {
      throw new LedgerRefusal(
        "REFUSED_LEDGER_TORN",
        `${method} answered from ledger ${answered}, not the pinned ${this.index}. ` +
          `A snapshot assembled from two ledgers is a state that never existed`,
      );
    }
    return result;
  }

  async sequenceOf(address: string): Promise<number> {
    const r = await this.pinned("account_info", { account: address });
    return Number(r.account_data.Sequence);
  }

  /** Every field of one holder's position, or `null` if they hold no MPToken. */
  async mptoken(address: string, issuanceId: string): Promise<MPTokenState | null> {
    let r: any;
    try {
      r = await this.pinned("ledger_entry", {
        mptoken: { mpt_issuance_id: issuanceId, account: address },
      });
    } catch (e) {
      if (e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING") return null;
      throw e;
    }
    const n = r.node;
    return {
      publicAmount: Number(n.MPTAmount ?? 0),
      publicAmountRaw: String(n.MPTAmount ?? "0"),
      holderEncryptionKey: n.HolderEncryptionKey,
      confidentialBalanceSpending: n.ConfidentialBalanceSpending,
      confidentialBalanceInbox: n.ConfidentialBalanceInbox,
      confidentialBalanceVersion: Number(n.ConfidentialBalanceVersion ?? 0),
      issuerEncryptedBalance: n.IssuerEncryptedBalance,
      auditorEncryptedBalance: n.AuditorEncryptedBalance,
    };
  }

  async issuance(issuanceId: string): Promise<IssuanceState> {
    const r = await this.pinned("ledger_entry", { mpt_issuance: issuanceId });
    const n = r.node;
    return {
      issuer: n.Issuer,
      // ⚠ **A JSON string, as rippled serialises every `UINT64`.** Reading it
      // with a numeric helper sees every value as absent, and a preflight check
      // that always passes looks identical to one that works. The signer has a
      // control test for exactly this; so does `facility/tests`.
      confidentialOutstandingAmount: Number(n.ConfidentialOutstandingAmount ?? 0),
      confidentialOutstandingAmountRaw: String(n.ConfidentialOutstandingAmount ?? "0"),
      issuerEncryptionKey: n.IssuerEncryptionKey,
      auditorEncryptionKey: n.AuditorEncryptionKey,
      transferFee: Number(n.TransferFee ?? 0),
      flags: Number(n.Flags ?? 0),
    };
  }
}

export interface NodeIdentity {
  buildVersion: string;
  gitHash?: string;
  networkId: number;
  serverState: string;
  validatedIndex: number;
  /** Whether the endpoint is a loopback address. */
  isLoopback: boolean;
}

/** Devnet, and nothing else. `CLAUDE.md`'s hard rule, checked before any read. */
const DEVNET_NETWORK_ID = 2;

export class LoopbackLedger {
  private constructor(
    readonly endpoint: string,
    readonly identity: NodeIdentity,
  ) {}

  /**
   * Open the facility's ledger source.
   *
   * Refuses a non-loopback endpoint **before it connects**, so a misconfigured
   * facility cannot leak the shape of its reads to a remote host on the way to
   * failing.
   */
  static async open(endpoint: string): Promise<LoopbackLedger> {
    const loopback = isLoopbackEndpoint(endpoint);
    if (!loopback) assertRemoteRiskAccepted(endpoint);
    const identity = await LoopbackLedger.probe(endpoint);
    identity.isLoopback = loopback;
    if (identity.networkId !== DEVNET_NETWORK_ID) {
      throw new LedgerRefusal(
        "REFUSED_NOT_DEVNET",
        `network_id ${identity.networkId}, expected ${DEVNET_NETWORK_ID} (Devnet). ` +
          `This project never writes to any other network, at any phase, for any reason`,
      );
    }
    if (identity.serverState !== "full") {
      throw new LedgerRefusal(
        "REFUSED_NODE_NOT_FULL",
        `the local node reports server_state "${identity.serverState}". A node that is running ` +
          `is not a node that can answer a pinned read; wait for it with ` +
          `tools/loopback-node/node.sh wait`,
      );
    }
    return new LoopbackLedger(endpoint, identity);
  }

  private static async probe(endpoint: string): Promise<NodeIdentity> {
    const info = (await rawCall(endpoint, "server_info", {})).info;
    return {
      buildVersion: info.build_version,
      gitHash: info.git?.hash,
      networkId: Number(info.network_id),
      serverState: info.server_state,
      validatedIndex: Number(info.validated_ledger?.seq ?? 0),
      // Overwritten by `open`, which is the only caller and the only place that
      // knows whether the hatch was used. Defaulting to the SAFE answer here
      // means a future second caller that forgets cannot silently claim the
      // permissive one.
      isLoopback: false,
    };
  }

  /**
   * How many submissions went out **without** `fail_hard`.
   *
   * ⚠ Counted here because this is the only place that sees every RPC **made
   * after the connection is open** — which is not the same as every RPC, and
   * the comment said it was until `REVIEW-023` round two. `probe` reaches the
   * node through `rawCall`, so the `server_info` every connection makes never
   * passes through `call`. That costs nothing today because no submission goes
   * through `probe`; what it costs is a reader who believes nothing can get
   * past this, and adds a `rawCall` submit inside this file.
   *
   * The facility's own submitter cannot omit the flag, but `run-facility.ts`'s
   * fail-hard control deliberately makes one unflagged submission through
   * `call` — and B-15's Part C says *"whatever submits"*, with no control-arm
   * exception in the ruling's text.
   */
  private unflagged = 0;

  /**
   * ⚠ **Whether BOTH halves of B-15's step-7 answer were in force for the whole
   * of this connection's life.**
   *
   * Loopback **and** no unflagged submission. It measured only the first until
   * `REVIEW-023` pointed out that every run of `run-facility.ts` makes an
   * unflagged submission before the stamp is written — so a future loopback run
   * would have been recorded as *"both halves in force"* while having submitted
   * once without the flag. The stamp is what a later reader trusts instead of
   * re-deriving; a stamp that measures one half and claims two is worse than
   * none.
   *
   * ⚠ It is a **getter, not a field**, because the answer changes during the
   * run. Read it when you record, not when you connect.
   */
  get underB15Conditions(): boolean {
    return this.identity.isLoopback && this.unflagged === 0;
  }

  /** Why the answer above is what it is, in words a run record can carry. */
  get b15Note(): string {
    if (!this.identity.isLoopback) {
      return (
        "REMOTE endpoint under the accepted-risk hatch (CLAIMS.md E-151). The loopback half " +
        "of B-15's step-7 answer was NOT in force. This run is not evidence about the loopback " +
        "obligation (CLAIMS.md F-23)"
      );
    }
    if (this.unflagged > 0) {
      return (
        `loopback, but ${this.unflagged} submission(s) went out without tapFailHard — the ` +
        `fail-hard control's own second arm does this deliberately. B-15's Part C says ` +
        `"whatever submits" and names no exception, so both halves were not in force for the ` +
        `whole of this run`
      );
    }
    return "loopback and every submission flagged: both halves of B-15's step-7 answer in force";
  }

  async call(method: string, params: Record<string, unknown>): Promise<any> {
    // ⚠ **Every method that submits, not just `submit`.** It matched the exact
    // string until `REVIEW-023` round two pointed at `submit_multisigned`,
    // which is also a submission and also takes `fail_hard`. Nothing here uses
    // it; a counter that has to be right about which submission APIs exist is
    // a counter that goes wrong when one is added, so it asks the broader
    // question. A non-boolean `fail_hard` — the string `"true"`, say — counts
    // as unflagged, which is the conservative answer and the right one.
    if (method.startsWith("submit") && params.fail_hard !== true) this.unflagged++;
    return rawCall(this.endpoint, method, params);
  }

  /** Pin one validated index. Everything the facility reads comes from it. */
  async snapshot(): Promise<Snapshot> {
    const info = (await this.call("server_info", {})).info;
    const seq = Number(info.validated_ledger?.seq ?? 0);
    if (!Number.isInteger(seq) || seq <= 0) {
      throw new LedgerRefusal("REFUSED_NO_VALIDATED_LEDGER", "the node has no validated ledger");
    }
    return new Snapshot(this, seq);
  }

  /** The current (not yet validated) index, for `LastLedgerSequence`. */
  async currentIndex(): Promise<number> {
    const r = await this.call("ledger_current", {});
    return Number(r.ledger_current_index);
  }
}

/**
 * Refuse a non-loopback endpoint unless the risk has been accepted **by name**.
 *
 * ⚠ **Three refusals, not one.** An unset variable, a variable set to something
 * else, and the accepted case are different situations and a caller who gets
 * them confused is a caller who thinks they turned the hatch on. `REVIEW-013c`
 * §3a B-VII is the standing reason: a refusal a client renders as "please try
 * again" is a loud refusal made quiet.
 */
function assertRemoteRiskAccepted(endpoint: string): void {
  const accepted = process.env.WCONF_ACCEPT_REMOTE_LEDGER_RISK;
  if (accepted === RISK_ACCEPTANCE_PHRASE) {
    // stderr, not stdout: a disclosure that can be lost to a pipe is a
    // disclosure that will be.
    process.stderr.write(`\n${REMOTE_LEDGER_DISCLOSURE}\n\n  endpoint: ${endpoint}\n\n`);
    return;
  }
  if (accepted !== undefined) {
    throw new LedgerRefusal(
      "REFUSED_RISK_NOT_ACCEPTED",
      `WCONF_ACCEPT_REMOTE_LEDGER_RISK is set, but not to the acceptance sentence. It must be ` +
        `EXACTLY:\n\n    ${RISK_ACCEPTANCE_PHRASE}\n\n` +
        `A near miss is refused rather than accepted, because a hatch that opens on anything ` +
        `truthy is a hatch that opens by accident`,
    );
  }
  throw new LedgerRefusal(
    "REFUSED_NOT_LOOPBACK",
    `${endpoint} is not a loopback address. CLAIMS.md B-15's step-7 ruling requires the ` +
      `facility's ledger reads to go to a node the operator runs, and a remote endpoint ` +
      `reopens F-23 — which is executed, not theoretical. Start one with ` +
      `tools/loopback-node/node.sh start.\n\n` +
      `To proceed against a remote endpoint anyway — which the project owner amended B-15's ` +
      `answer to allow on 2026-08-25, for a Devnet demo with throwaway keys and NOT for ` +
      `anything else — set WCONF_ACCEPT_REMOTE_LEDGER_RISK to the acceptance sentence in ` +
      `facility/README.md. The run will say so in its output and in its own record`,
  );
}

/**
 * Whether two URLs name the same endpoint, ignoring the trailing slash `fetch`
 * adds to `response.url`.
 *
 * Exported so the comparison can be tested directly: the path that reaches it
 * in `rawCall` requires a runtime that ignores `redirect: "error"`, which is not
 * a state a test can produce — and an untestable check is one nobody finds out
 * is wrong until it fires in production, which is exactly what happened to its
 * first version.
 */
export function sameEndpoint(a: string, b: string): boolean {
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

async function rawCall(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params: [params] }),
      // ⚠ **A redirect is the loopback check undone.** `fetch` follows them by
      // default; `307`/`308` preserve the method and body, so a loopback
      // responder could forward this POST to a remote host and every later
      // call with it. `error` makes the fetch reject instead.
      redirect: "error",
    });
  } catch (e) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: ${String(e)}`);
  }
  // Belt as well as braces: if a runtime ever honoured a redirect anyway, the
  // response carries the final URL and it must be the one we asked.
  //
  // ⚠ **This compared against LOOPBACK-ness until the first run under the
  // accepted-risk hatch, and that was wrong in both directions.** It refused
  // every remote endpoint even when the risk had been accepted — which is how
  // it was found, by running the artifact rather than by reading it — and it
  // would have *accepted* a redirect from one loopback port to another. The
  // invariant a redirect violates is "the answer came from where I asked", and
  // that is what this checks now. `CLAIMS.md` E-139: running the artifact
  // catches what a fix leaves standing.
  if (response.url && !sameEndpoint(response.url, endpoint)) {
    throw new LedgerRefusal(
      "REFUSED_REDIRECTED",
      `${method}: asked ${endpoint} and the answer came from ${response.url}. A redirect is ` +
        `the endpoint check undone`,
    );
  }
  if (!response.ok) {
    throw new LedgerRefusal("REFUSED_LEDGER_UNAVAILABLE", `${method}: HTTP ${response.status}`);
  }
  const body: any = await response.json();
  const result = body.result;
  if (!result) throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `${method}: no result`);
  if (result.status === "error") {
    // `entryNotFound` is an answer, not a failure — a holder who has not opted
    // in has no `MPToken`, and the caller distinguishes that from a broken read.
    const code = result.error === "entryNotFound" || result.error === "objectNotFound"
      ? "REFUSED_LEDGER_ENTRY_MISSING"
      : "REFUSED_LEDGER_ERROR";
    throw new LedgerRefusal(code, `${method}: ${result.error} ${result.error_message ?? ""}`);
  }
  return result;
}

````


## FILE: tools/issuer-view-snapshot.ts (complete, at commit d764bca)

````
/**
 * `issuer-view-snapshot` — decrypt the demo set ONCE, to a file the web tier reads.
 *
 * ⚠⚠ **THIS EXISTS BECAUSE THE WEB TIER HELD THE ISSUER KEY AND THAT VIOLATED
 * ITS OWN SCOPE.** Architecture §6 step 8, written by the session that then
 * broke it, says the tier **may touch** *"the issuer-view decryption tool's
 * **output**, given a demo issuer key handled as the secret it is"* and **may
 * never touch** *"any private key"*. `CLAUDE.md` is equally plain: the
 * issuer-view tool is *"a single CLI command … **Not a standalone
 * application**."*
 *
 * The first implementation put `WCONF_ELGAMAL_SK` in the API process and
 * decrypted per request. ⚠ **That is a decryption oracle**: an unauthenticated
 * `GET` where the caller chooses the account and receives a decrypted balance —
 * **the exact thing `ADR-0003` names as its fourth rotation trigger, written by
 * the same session, one file over** (`CLAIMS.md` E-212).
 *
 * # What this is instead
 *
 * A CLI. It holds the key, decrypts the **curated demo set**, and writes a JSON
 * file of *results*. The web tier reads that file and **never sees a key**.
 *
 * ⚠ **The attacker-chosen input is gone, not merely guarded.** There is no
 * request that reaches a decryption, so there is nothing to authenticate.
 *
 * # Why `decryptAmount` and not `mptool`
 *
 * ⚠ **`facility/src/mptool.ts::decryptInRange` passes the secret as a
 * COMMAND-LINE ARGUMENT** — `Bun.spawnSync([tool, "decrypt", ct, sk, …])` — and
 * argv is world-readable via `ps`. **That is the precise exposure the issuer
 * tool refuses a `--key` flag to avoid**, reintroduced by the helper chosen to
 * avoid a different problem. `@xrplf/mpt-crypto`'s `decryptAmount` is
 * **in-process**: no subprocess, no argv, and it is what
 * `tools/issuer-decrypt-balance.ts` already uses.
 *
 * # Usage
 *
 *   WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts [--max N] [--out PATH]
 *
 * ⚠ **No `--key` flag, on purpose**, matching the tool this one stands beside.
 */

import { decryptAmount } from "@xrplf/mpt-crypto";
import { writeFileSync } from "node:fs";
import { DEMO_ACCOUNTS, DEMO_ISSUANCE } from "../web/api/demo-accounts.ts";

const DEVNET_RPC = process.env.WCONF_LEDGER_ENDPOINT ?? "https://s.devnet.rippletest.net:51234";
const DEVNET_NETWORK_ID = 2;
/**
 * Strict argument parsing.
 *
 * ⚠ **A mistyped `--out` silently used the default and wrote decrypted results
 * somewhere the operator did not choose**; `--out` with no value did the same.
 * For a tool that decrypts confidential balances, a typo must stop it rather
 * than redirect its output (`CLAIMS.md` E-220).
 */
const KNOWN_FLAGS = new Set(["--out", "--max"]);

/** An argument reduced to its option name. ⚠ Anything after `=` is dropped. */
export function redact(arg: string): string {
  const eq = arg.indexOf("=");
  if (eq >= 0) return `${arg.slice(0, eq)}=<redacted>`;
  // A bare value that looks like key material must not be echoed either.
  if (/^[0-9A-Fa-f]{32,}$/.test(arg)) return "<redacted>";
  return arg;
}
const FLAGS: Record<string, string> = (() => {
  const argv = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // ⚠⚠ **NEVER ECHO THE VALUE.** The obvious misuse of a tool that
    // deliberately has no key flag is `--key=<64 hex>`, and the first version
    // wrote the whole argument to stderr — turning transient argv exposure into
    // a persistent CI or service log (`CLAIMS.md` E-221). Only the option NAME
    // is ever printed, and anything after `=` is dropped.
    const shown = redact(a);
    if (!a.startsWith("--")) {
      console.error(`unexpected argument: ${shown}`);
      process.exit(2);
    }
    if (!KNOWN_FLAGS.has(a.split("=")[0])) {
      console.error(`unknown flag: ${shown}. Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
      process.exit(2);
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) {
      console.error(`${a.split("=")[0]} requires a value`);
      process.exit(2);
    }
    if (a in out) { console.error(`${a.split("=")[0]} given twice`); process.exit(2); }
    out[a] = v;
    i++;
  }
  return out;
})();

function flag(name: string): string | undefined {
  return FLAGS[name];
}

const OUT = flag("--out") ?? "/tmp/wconf/issuer-view-snapshot.json";



/**
 * A UINT64 as a **decimal string**, never a JS `Number`.
 *
 * ⚠⚠ **`Number.MAX_SAFE_INTEGER` is 9007199254740991; a UINT64 reaches
 * 18446744073709551615.** `MPTAmount`, `ConfidentialOutstandingAmount` and a
 * decrypted balance are all UINT64, and rippled serialises them as JSON
 * **strings** for exactly this reason — so converting them to `Number` on the
 * way into the snapshot silently rounds any value above 2^53 and the issuer
 * page then displays a wrong balance with no indication anything happened
 * (`CLAIMS.md` E-215).
 *
 * ⚠ **The demo's values are small, which is precisely why this would not have
 * been noticed.** Kept lossless end to end — snapshot, API and UI all carry the
 * string.
 */
function dec(v: unknown): string {
  if (v === undefined || v === null) return "0";
  if (typeof v === "bigint") return v.toString();
  return String(v);
}

async function rpc(method: string, params: Record<string, unknown>): Promise<any> {
  // ⚠⚠ **`redirect: "error"`, because a followed redirect is a SUBSTITUTED
  // SOURCE that the snapshot would then record as the configured endpoint.**
  // `fetch` follows 307/308 by default, so a redirecting endpoint could serve
  // ledger data from another origin while the file said otherwise — exactly the
  // substitution `CLAUDE.md` forbids, in the tool whose whole output is a claim
  // about what a ledger said (`CLAIMS.md` E-220).
  const r = await fetch(DEVNET_RPC, {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params: [params] }),
  });
  // ⚠ Belt and braces: even with redirects refused, assert the origin answered.
  if (new URL(r.url).origin !== new URL(DEVNET_RPC).origin) {
    throw new Error(
      `${method} was answered by ${new URL(r.url).origin}, not the configured ` +
      `${new URL(DEVNET_RPC).origin}. A substituted source is a corrupted one.`,
    );
  }
  if (!r.ok) throw new Error(`${method} answered ${r.status}`);
  const j = await r.json();
  if (j.result?.error) throw new Error(`${method}: ${j.result.error_message ?? j.result.error}`);
  return j.result;
}

/**
 * A read PINNED to one validated index, and CHECKED to have come from it.
 *
 * ⚠⚠ **`CLAIMS.md` E-103, observed live: two `"validated"` reads seconds apart
 * land in DIFFERENT ledgers**, because the public endpoint is a cluster —
 * `account_objects` at 4596692 and `account_info` at 4596693, back to back. **A
 * snapshot assembled from both is a state that never existed.**
 *
 * ⚠ The first version of this tool resolved `"validated"` **per account, in a
 * loop, with an ElGamal discrete-log search between each one** — so the window
 * was seconds wide and the output was labelled as one snapshot. `Snapshot` in
 * `facility/src/loopback.ts` has done this correctly since step 7; this tool
 * did not compose it and re-made the mistake the project had already paid for.
 */
async function pinned(index: number, method: string, params: Record<string, unknown>): Promise<any> {
  const result = await rpc(method, { ...params, ledger_index: index });
  const answered = Number(result.ledger_index ?? result.ledger_current_index ?? NaN);
  if (answered !== index) {
    throw new Error(
      `${method} answered from ledger ${answered}, not the pinned ${index}. ` +
      `A snapshot assembled from two ledgers is a state that never existed (CLAIMS.md E-103).`,
    );
  }
  return result;
}

const key = process.env.WCONF_ELGAMAL_SK;
if (!key) {
  console.error("WCONF_ELGAMAL_SK is not set.\n");
  console.error("There is no --key flag on purpose: argv is world-readable via `ps` and is logged");
  console.error("to shell history. Export it, or run this from a shell that does not persist history.");
  process.exit(2);
}
if (!/^[0-9A-Fa-f]{64}$/.test(key)) {
  console.error(`WCONF_ELGAMAL_SK must be 64 hex characters, got ${key.length}`);
  process.exit(2);
}

const srv = await rpc("server_info", {});
const netId = Number(srv?.info?.network_id ?? NaN);
if (netId !== DEVNET_NETWORK_ID) {
  console.error(`refusing to proceed: network_id ${netId}, expected ${DEVNET_NETWORK_ID} (Devnet).`);
  process.exit(1);
}

// ⚠ **One index, taken once, and every later call carries it.** See `pinned`.
const LEDGER_INDEX = Number(
  (await rpc("ledger", { ledger_index: "validated" }))?.ledger_index ??
  (await rpc("server_info", {}))?.info?.validated_ledger?.seq,
);
if (!Number.isFinite(LEDGER_INDEX)) {
  console.error("could not resolve a validated ledger index to pin to");
  process.exit(1);
}

const iss = (await pinned(LEDGER_INDEX, "ledger_entry", { mpt_issuance: DEMO_ISSUANCE }))?.node;
// ⚠ The issuance's own outstanding amount is a SOUND upper bound and the cost is
// linear in it from zero (CLAIMS.md F-15) — so this is a bound, not a guess.
const max = BigInt(flag("--max") ?? iss?.ConfidentialOutstandingAmount ?? "100000");

console.log(`issuer-view snapshot — ${DEMO_ACCOUNTS.length} account(s), searching [0, ${max}]`);
console.log(`pinned to validated ledger ${LEDGER_INDEX}`);
console.log(`⚠ Devnet only. The holders did not consent to this read and cannot prevent it.\n`);

const entries: Record<string, unknown> = {};
let ok = 0;

for (const a of DEMO_ACCOUNTS) {
  const objs = await pinned(LEDGER_INDEX, "account_objects", { account: a.address, type: "mptoken" });
  const mpt = (objs?.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === a.issuanceId);
  const id = `${a.address}/${a.issuanceId}`;

  if (!mpt) {
    entries[id] = { available: false, reason: `${a.address} holds no MPToken for this issuance.` };
    console.log(`  ${a.address}  no MPToken`);
    continue;
  }
  const mirror = mpt.IssuerEncryptedBalance;
  if (!mirror) {
    entries[id] = { available: false, publicAmount: dec(mpt.MPTAmount), reason: `no ${"IssuerEncryptedBalance"} — confidential state was probably never initialised.` };
    console.log(`  ${a.address}  no mirror`);
    continue;
  }

  try {
    const amount = await decryptAmount(mirror, key, max);
    entries[id] = {
      available: true,
      decrypted: dec(amount),
      publicAmount: dec(mpt.MPTAmount),
      mirrorField: "IssuerEncryptedBalance",
      searchedTo: dec(max),
    };
    console.log(`  ${a.address}  ${String(amount).padStart(8)}   (public MPTAmount ${mpt.MPTAmount ?? 0})`);
    ok++;
  } catch {
    entries[id] = {
      available: false,
      publicAmount: dec(mpt.MPTAmount),
      // ⚠ A miss is AN ANSWER, and it has two readings this file will not collapse.
      reason: `did not decrypt in [0, ${max}] — either the balance exceeds the window (raise --max; ` +
        `cost is linear from zero, F-15) or WCONF_ELGAMAL_SK is not this issuance's issuer key. ` +
        `⚠ It is NOT evidence that the issuer cannot decrypt (CLAIMS.md P-9).`,
    };
    console.log(`  ${a.address}  no decrypt in [0, ${max}]`);
  }
}

// ⚠ Results only. **No key material of any kind reaches this file** — that is
// the whole point of the tool, and `web/api/issuer.ts` asserts the shape.
const snapshot = {
  producedBy: "tools/issuer-view-snapshot.ts",
  producedAtUnix: Math.floor(Number(process.env.WCONF_SNAPSHOT_UNIX ?? Date.now()) / 1000),
  issuance: DEMO_ISSUANCE,
  endpoint: DEVNET_RPC,
  searchedTo: dec(max),
  ledgerIndex: LEDGER_INDEX,
  entries,
};
writeFileSync(OUT, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

console.log(`\n${ok}/${DEMO_ACCOUNTS.length} decrypted -> ${OUT}`);
console.log(`⚠ This file contains RESULTS, never a key. The web tier reads it and holds no secret.`);
console.log(`⚠ It is a SNAPSHOT: balances move, and the web tier prints when it was taken.`);

````


## CLAIMS.md — the rows named below, each complete; the register has over 400 rows and the rest are omitted

Columns: id | claim | evidence | grade (P rows: id | never claim | why).

| P-1 | That this work makes XRPL quantum-safe or quantum-resistant | It does not |
| P-2 | That an application-layer PQ scheme protects funds at the ledger level | An adversary who breaks secp256k1 signs a valid classical transaction and the network accepts it |
| P-3 | That any amendment is live or enabled, without a dated `feature` RPC check | Amendment state is a reading, not knowledge |
| P-4 | That a Confidential MPT demo hides identities | It hides amounts and balances. Sender and receiver remain public |
| P-5 | That anything here is trustless, non-custodial, decentralised, audited, production-ready or secure | None of it is; ADR-0001 names the trusted parties |
| P-6 | That anything is compliant with regulation in a named jurisdiction | Not a compliance project |
| P-7 | That analysis of published work is original research | Cite Cenk, Malhotra, Akinyele, Chen, Xie, Qian by name where the work is theirs. **Add Tess Dore (2026-08-16):** the compact sigma protocol, the twisted-ElGamal analysis and the Bulletproofs++ analysis are Dore & Cenk, RippleX Research — Dore is *not* an XLS-0096 author and is easy to omit by copying E-1's list |
| P-8 | Any benchmark number without hardware, parameter set and methodology | Includes re-quoting XLS-0096 §14.2's "laptop-class CPU" timings — see B-1 |
| P-9 | That holders are private from the issuer | The issuer's decryption mirror is mandatory. No configuration makes this false |
| P-10 | That XLS-96 supports key rotation or key recovery | It supports neither, at any level |
| P-11 | That confidential transfers hide *who* transacts, or *when*, or *how often* | Only amounts are hidden. The counterparty graph and event timing are fully public |
| P-12 | **Any claim that a source does NOT say something — *nothing documents it*, *no such field*, *not exported*, *nobody has called it out*, *I could not find it* — without the search that would falsify it recorded alongside** | It is an assertion about a whole corpus and one search settles it. **Three graded rows failed this way on 2026-08-26** (E-155, E-156), two of them **positives**: U-15 quoted a sentence XLS-0096 has never contained; U-12 said a property was *"not called out anywhere I found"* when the spec states it **twice**, once in wording identical to the benefit claimed as an original reading. ⚠ **This shape survives review because it does not look like a claim** — a quotation has quotation marks, a benchmark visibly wants a methodology, and *"nobody has documented this"* reads as modesty. Gated by `tools/check-negative-claims.ts` |
| E-110 | **B-15 ruled: one ledger endpoint stands for this artifact, as a NAMED RISK ACCEPTANCE, and the disclosure is a condition of the ruling rather than a courtesy.** Two legs whose **headline verdicts read as opposite and are not** — Gemini *"one endpoint is acceptable, corroboration is theatre"*, Codex *"corroboration is required for anything a user relies on… one endpoint can be allowed only as a named gap"* — agreeing on every operative point: loopback is the clean answer, two hostnames of one operator buys nothing, the artifact may run one endpoint, anything user-facing may not, and it must be said out loud. **Corroboration is NOT built**, and the reason is not cost: the default endpoint is one operator's cluster, the in-scope adversary can reconfigure both, and agreement is not authenticity. **The cryptographic alternative is closed** — `ledger_entry` returns no Merkle proof at rippled `3.3.0`, verified at source and live | **2026-08-20.** `REMOTE_SOURCE_DISCLOSURE` is printed whenever the endpoint is not loopback, and `the_remote_disclosure_says_what_the_ruling_requires` **asserts the wording, not its presence** — a disclosure softened to "note: remote endpoint" satisfies presence and nothing else. `is_loopback` defaults to **false** on the trait: a source that does not know is remote, because the failure that matters is suppressing the disclosure | A, executed |
| E-151 | **B-15's step-7 answer was AMENDED by the project owner, and the amendment is recorded in code rather than only in prose.** Option A — loopback — was ruled on 2026-08-25, taken, and then **costed**: two runs, ~2.5 hours, 6.9 GB of node store, `complete_ledgers: empty` throughout, one OOM kill and one hour pegged at 1663% CPU after the memory ceiling was raised (E-148). The remaining routes are not coding-session decisions, so the choice went back to the owner, who **extended `REVIEW-019`'s named risk acceptance to the facility's Devnet demo**. ⚠ **The reasoning is that every earlier milestone — steps 2, 3, 4, 6 and ConvertBack — ran against the same public endpoint under the same acceptance, and that a demo with throwaway keys that will never hold value is not *"anything a user would rely on"*. That is a judgement, not a fact.** ⚠ **Part C is unchanged**: `tapFailHard` is set on every **facility movement** and removes the *consequence* of a wrong read **at the ledger**; the loopback half, which removes the *risk* at its source, is not in force. ⚠ **Two narrowings, both from `REVIEW-023` round two.** *"Every submission"* was false — §1's fail-hard control submits one arm **without** the flag on every run, deliberately, and B-15's Part C says *"whatever submits"* with no control-arm exception. And *"removes the consequence"* is true only at the ledger: the submitting node receives the ciphertext first (**F-28**). ⚠ **Nothing about F-23 changed** — it is executed, and TLS does not address it | **2026-08-25.** Kept honest rather than kept quiet: `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold a **full sentence naming F-23** before `facility/` reads a non-loopback endpoint; a near miss is refused **differently** from an unset variable, so nobody can believe they enabled it when they did not; `REMOTE_LEDGER_DISCLOSURE` prints in full on **stderr**; and every run record carries **`underB15Conditions`**, so a later reader gets the answer from the record instead of reasoning about a hostname — which is what `REVIEW-016` found two ways past. `facility/tests/risk-acceptance.test.ts`: 10 tests over the four states and the disclosure's wording, the latter because E-126 records what an unasserted disclosure surface collects. ⚠ **The amendment has had no adversarial review, and neither had the ruling it amends** | A, reasoned |
| E-209 | ⚠⚠ **TWO DEFECTS THAT A CLEAN TYPE-CHECK, A CLEAN BUILD AND A PASSING GATE ALL MISSED, AND BOTH WERE FOUND BY LOADING THE PAGE.** (1) ⚠⚠ **THE API'S DEFAULT PORT 3001 WAS OCCUPIED BY A DOCKER-HOSTED GITEA, AND THE TIER DID NOT NOTICE.** The Elysia process died with `EADDRINUSE`; the browser application's Vite proxy forwarded `/api/*` to whatever was listening; **Gitea answered `303 See Other` with `Location: /user/login` and a `Set-Cookie: i_like_gitea=…`**, and nothing questioned it. ⚠ **A proxy to a free port is a proxy to whatever happens to be there** — and this is a tier whose entire purpose is to render trustworthy statements about a confidential ledger. **Fixed twice over**: the port moved to 3011 **and** `/api/meta` now carries `service: "wconf-read-only-api"`, which `assertOurApi()` checks in the overview route's loader **before any other response is rendered**, alongside a `content-type` check that refuses non-JSON. ⚠ **A free port is luck; a checked identity is not.** (2) **SSR `fetch` cannot parse a relative URL**, so `fetch("/api/meta")` threw `Failed to parse URL from /api/meta` on the server. **The banner, the navigation and the page shell all rendered correctly and every loader failed** — the failure mode that looks most like success. The base is now absolute during SSR and relative in the browser, ⚠ **which means the server path bypasses the proxy entirely and is why the identity check has to run on both sides rather than only in the browser** | **Both found 2026-08-28 by loading the page**, after `bunx tsc --noEmit` was clean on both projects, `vite build` succeeded, `make check-web-readonly` passed and 89 tests were green. ⚠ **This is `CLAIMS.md` E-145's lesson one layer out** — *a build is not a type-check* becomes *a type-check is not a run*. Neither defect is in the class the step-8 gate checks: it asserts what the tier **cannot reach**, and these were about what it **actually talks to**. **A gate over a named property is not a substitute for running the artifact** | A, measured |
| E-212 | ⚠⚠ **THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER.** `web/api/issuer.ts` read `WCONF_ELGAMAL_SK` from the environment and decrypted **per request**, behind an unauthenticated `GET /api/issuer/:account/:issuanceId` — **the caller chooses the account and receives a decrypted confidential balance.** ⚠ **Architecture §6 step 8 says the tier may touch *"the issuer-view decryption tool's OUTPUT"* and may never touch *"any private key"*, and `CLAUDE.md` says the issuer-view tool is *"a single CLI command … Not a standalone application"*.** ⚠⚠ **AND `ADR-0003` NAMES THIS EXACTLY, AS ITS FOURTH ROTATION TRIGGER**: *"a tier that accepts an issuer key over HTTP has built a decryption oracle"* — written by the same session, one file over. **The trigger was written about the key ARRIVING over HTTP; the oracle is the RESULT LEAVING over HTTP, and the author read their own warning as narrower than it was.** ⚠ `/meta`'s `holdsKeys: false` was false while it ran, and **CORS is not a defence** — it constrains browsers, and `curl` is not a browser. ⚠ **A second exposure rode along**: the chosen helper `decryptInRange` spawns `mptool decrypt <ciphertext> <sk> …`, and **argv is world-readable via `ps`** — the precise exposure `tools/issuer-decrypt-balance.ts` refuses a `--key` flag to avoid, reintroduced by the helper picked to avoid a *different* problem. ⚠⚠ **`@xrplf/mpt-crypto`'s `decryptAmount` is IN-PROCESS and is what that CLI already uses**, so the better path was in the file the rule came from | **Found by Codex review 2026-08-28, three P1s, and the diagnosis was correct on all three.** **Fixed by removing the capability, not guarding it:** `tools/issuer-view-snapshot.ts` holds the key, decrypts the **curated demo set** in-process via `decryptAmount`, and writes **results**; `web/api/issuer.ts` reads that file. ⚠ **There is no request that reaches a decryption, so there is nothing to authenticate** — the attacker-chosen input is *gone*, not bounded. **Measured after the fix: with `WCONF_ELGAMAL_SK` exported into the API process, the issuer route still returns `available: false`** — the key changes nothing because no decryption path exists. The snapshot reader **refuses wholesale** any file carrying key-shaped fields. Same demo, same numbers — 75, 0, 270, 778 | A, measured |
| E-228 | ⚠⚠ **THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND `ADR-0003`'s FALSIFIER LIST HAD NO ENTRY FOR THE SHAPE.** `signer/src/ipc.rs:105` sets `0700` on the socket directory — *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic"* — and `:128` sets `0600` on the socket; `tools/issuer-view-snapshot.ts:272` writes the decrypted-balance snapshot `mode: 0o600`. ⚠⚠ **The API re-serves the product of BOTH, unauthenticated, over a loopback listener — and loopback is NOT uid-scoped.** `GET /api/signer` returns the socket's answer **and the socket path** (`web/api/server.ts:74-78` spreads `...probe`; `signer-status.ts:43-45`); `GET /api/issuer/:account/:issuanceId` returns `decrypted` balances (`web/api/issuer.ts:162-170`); there are **zero** auth constructs in `web/api`. **A second local user who cannot `connect()` the `0600` socket and cannot `cat` the `0600` snapshot can `curl` both.** ⚠ **The rebuttal fails**: architecture §3 concedes defeat to *"an adversary who has code execution"* — **as the holder** — and this party is strictly weaker. ⚠⚠ **It is E-212's lesson applied to the KEY and not to the RESULT**: *"the trigger was written about the key ARRIVING; the oracle is the RESULT LEAVING"* — the remedy moved the key out and left the result leaving, so trigger 4 is satisfied to the letter and the property it protected is not | **Found independently by `REVIEW-036s` (from the mode bits) and `REVIEW-036b` (which drew the pipeline); the document-only leg could not see it.** `ADR-0003` rev 2 adds **trigger 5 — EGRESS**: *if this tier makes any datum reachable by a party who could not obtain it before the tier existed, the boundary has MOVED, regardless of signing, keys or computation.* ⚠⚠ **THE ROUTE ITSELF IS A RULING AND IS HANDED OVER, NOT TAKEN** — four options are priced in the ADR's *What revision 2 does not settle*, and a coding session may not choose among them | A, measured |
| E-230 | ⚠⚠ **`ADR-0003`'s CENTRAL CLAIM WAS ADVERSARIALLY REVIEWED FOR THE FIRST TIME AND ALL FOUR LEGS RULED IT UNSOUND AS STATED.** `REVIEW-036`, four legs with **deliberately differed packets** — Gemini on document text only, two Codex legs with repository access pointed at **different questions** (verify the premises against source / read the document's own promises back at it), and a self leg. **13 findings upheld, 2 rejected, 1 partly upheld.** The claim — *"a tier that reads public state and holds no credential grants no authority that did not already exist, so no trust boundary moves"* — fails three ways: **premise 1 is false** (`Store::len()` counts *"a cancelled confirmation, a failed proof, an aborted attempt"*, `signer/src/store.rs:753-756`, which public ledger history cannot reveal), **premise 2 equivocates** (*holds no credential* ≠ *conveys nothing a credential produces*), and **the inference is invalid** (a trust boundary also governs confidentiality, transport exposure and presentation integrity). ⚠⚠ **WHAT THE ADR PROVED, IT PROVED ABOUT SIGNING, AND IT WROTE IT AS A UNIVERSAL ABOUT AUTHORITY** — the signing half is sound and every leg affirmed it | ⚠ **The differed packets are why this worked, and it is measured**: the two findings that mattered (E-227, E-228) came from the **repository-access** legs and the self leg; the document-only leg could see neither, and **two of its five extra falsifiers were REJECTED on source** — an IPC-injection claim (no HTTP input reaches the socket bytes; `signer-status.ts:192` writes a hardcoded literal) and a connection-starvation claim (fixed by E-213). ⚠ **Six prior code-review rounds found the CONSEQUENCE of this gap once (E-212) and never tested the claim**, because code review reads the artifact the argument licensed rather than the argument | A, executed |
| E-241 | ⚠⚠ **THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05.** `GET /api/issuer/:account/:issuanceId` no longer returns `decrypted`; it reports **`decryptable`** — *whether* the issuer could read the balance — and never the figure. `GET /api/signer` no longer returns `socketPath` or the signer's `note`, which carried the holder address, the randomness-ledger generation id and its **entry count** — and `signer/src/store.rs:753-756` commits a record for *"a cancelled confirmation, a failed proof, an aborted attempt"*, so that count includes work **no observer can reconstruct**. ⚠ **This is E-212's own remedy applied one layer further**: that fix moved the KEY out and left the RESULT leaving. **There is now no request that reaches a decryption and none that returns one, so there is still nothing to authenticate.** ⚠ **What the demonstration keeps is the point it was making** — that the issuer can read any balance is proved by `IssuerEncryptedBalance` being populated on the ledger (P-9). **The plaintext integer only ever demonstrated that THIS PROJECT holds the demo issuer key**, and it lives in `tools/issuer-decrypt-balance.ts`, which is where `CLAUDE.md` says the issuer view belongs | **Falsifier: `disclosure.test.ts` — *"the decrypted balance is NEVER served, even when the snapshot has it"*, which asserts the figure appears NOWHERE in the serialised response while the public `MPTAmount` still does.** ⚠ **Verified by reverting the withholding: that test fails and it is the ONLY one that does** — a test that passes against the reverted code proves nothing. A second control asserts the withholding is not vacuous, distinguishing an absent value from a withheld one. **129 web tests, both type-checks clean.** ⚠⚠ **THIS DOES NOT MAKE THE TIER uid-SAFE; IT MAKES IT DISCLOSE NOTHING WORTH uid-PROTECTING.** `ADR-0003` trigger 5 (EGRESS) stays in the falsifier list, because the next route someone adds is where it fires again. **E-228 is closed by removal.** `ADR-0003`'s last open acceptance precondition is discharged | A, measured |
| E-309 | **The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four filings first, and everything but the withheld file published.** The goals are a public and contributable repository, a demo deployed to Vercel, a LinkedIn post and a blog post on `nandan.me/writing`. Four decisions were put with recommendations, and each was taken. The demo stays read-only, because `ADR-0003`'s standing property is that the tier never signs, and a hosted signer or keys in the page would reopen `ADR-0003` or `ADR-0001`. The public repository starts at a squashed publication commit, so the observations `REVIEW-039b` and `REVIEW-039c` ruled unpublishable stay out of it, and this repository remains the archive of record. The four findings E-308 ruled to file are filed before publication, which is B-28's own condition. `docs/reviews/` is published; `docs/upstream-observed-WITHHELD.md` is not. ⚠⚠ **A hosted deployment is a trust-boundary change and not a deploy step.** Architecture §6 step 8 is *falsified if* *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5 fires when a datum becomes reachable by a party who could not obtain it before. Both conditions hold for any public deployment, so the demo needs its own architecture step, an ADR and a full adversarial rotation before implementation. ⚠ The register's commit citations will not resolve in the public repository, and its README has to say so. | The owner's answers in this session on 2026-09-22, to four questions that each carried a recommendation. `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` is the plan, with the gate for each phase. Step 8's falsifier is `ARCHITECTURE-2026-08-18.md:254`; `ADR-0003`'s triggers are `docs/decisions/ADR-0003-web-tier-trust-boundary.md:146-175`, trigger 5 at `:160-168`. The two things the tier serves that a public node does not are E-228 and E-239: `/api/signer`'s signer-local status and the decrypted issuer snapshot. B-28's condition is E-294; the withheld rows are E-240. `LICENSE` is Apache-2.0 and `docs/VOCABULARY.md` carries the `tapFailHard` translation. Not decided here: the licence terms, the public repository's name and owner, whether the vocabulary translation reaches `docs/reviews/`, and whether CI can run the signer's suite, which needs the vendored build environment | A, recorded |
| E-319 | **The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and Devnet was not reset.** On 2026-10-18, `tx` returned `txnNotFound` for all four, with `searched_all: false`. `server_info` reported rippled 3.4.1, network_id 2, and `complete_ledgers` 5171980 to 6213418, so the endpoint now keeps about a million ledgers. Two facility accounts still exist with their sequence numbers, which a reset would have erased. ⚠ `docs/NEXT-SESSION-PROMPT.md` recorded Devnet as running `3.4.0-rc5`; it reads 3.4.1 now. Whether a full-history node or an explorer still serves these transactions was not checked | `tx`, `server_info` and `account_info` against `https://s.devnet.rippletest.net:51234/`, 2026-10-18. The README's evidence block said so until the README was shortened on 2026-10-19 and the block removed; the four hashes stay in this register and in `docs/runs/` | A, executed |
| E-327 | **The hosted demo is scoped as architecture §6 step 9 and `ADR-0004`, `Proposed`, and its design rests on measurements taken on 2026-10-19.** The public Devnet JSON-RPC endpoint cannot be read from a browser page: a CORS preflight answers `400` with no `Access-Control-*` header, a `POST` answers without `Access-Control-Allow-Origin`, and a `fetch` from a Chrome page fails. Its WebSocket endpoint answered a page on each of the three origins tried. The endpoint is a pool, since two connections reported different `complete_ledgers`, so one snapshot must stay on one connection. The four demo accounts and their issuance exist at validated ledger 6,243,460. The ADR therefore recommends a static site whose page reads Devnet itself, so that no code of this project runs per request, and puts four decisions to the owner: the hosting shape, a ledger-source risk acceptance for a public page, whether the page shows the issuer's decrypted figures, and how Vercel deploys. ⚠ The third reopens E-241 for a public audience: the launch plan says the snapshot *"becomes a deliberately published static artifact"*, while E-241 removed the figure from the local tier. The ADR recommends holding E-241's line, because comparing published figures with the public `ConfidentialOutstandingAmount` passes for anyone who splits that public total among holders without the key, and it names a published proof of correct decryption as the only way to show the figure. Vercel's GitHub app documents write access to a connected repository's contents and administration, which is why the ADR recommends deploying prebuilt output from the CLI. Nothing is built, and the rotation the launch plan requires has not run | `curl` to `https://s.devnet.rippletest.net:51234/` with an `OPTIONS` preflight and a `POST`, both carrying `Origin`; a Bun `WebSocket` to `wss://s.devnet.rippletest.net:51233` with `Origin: https://wconf-demo.vercel.app` and `Origin: null`; both repeated from a Chrome page at `https://example.com`; `account_info` and `ledger_entry` over JSON-RPC for the four addresses in `web/api/demo-accounts.ts`. The WASM package's verifier symbols by `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0`, where `dist/*.d.ts` has no occurrence of `verify`. What the issuer's mirror encrypts, from `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, lines 52, 245 and 707. Vercel's `docs/cli/deploy` and `docs/git/vercel-for-github`, marked updated 2026-09-18 and 2026-09-17. `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` records each | A, measured |
| B-15 | ⚠ **AMENDED AGAIN 2026-08-25 → E-151: the named risk acceptance is EXTENDED to the facility's Devnet demo, because Option A turned out not to be payable on this hardware (E-148).** Part C — `tapFailHard` on whatever submits — is unchanged and in force. The loopback requirement is **not retired**; it is unmet, by name, with a printed disclosure and a stamp on every run record. ~~**Whether one trusted endpoint is an acceptable ledger source for a signer, given F-23.**~~ **RULED 2026-08-20 → E-110.** One endpoint stands for this Devnet research artifact **as a named risk acceptance**, with a mandatory disclosure; loopback is the clean answer; corroboration across one operator's hosts is not built and both legs called it near-theatre. ⚠ **A GATE ON STEP 7**: the facility requires loopback, corroboration across independently operated nodes, or a submitter that sets `tapFailHard` | **RESOLVED → `REVIEW-019-RULING-ledger-source-2026-08-20.md`.** The ruling's premise is that `ledger_entry` returns no Merkle proof (verified at rippled `3.3.0`); **if that changes, revisit**. ⚠ ~~**The step-7 gate is STILL SHUT as of 2026-08-25**~~ **ANSWERED 2026-08-25 by the project owner: loopback for the facility, plus `tapFailHard` set by whatever submits, which is NOT the signer.** ⚠ **The answer is not one of the ruling's three options** — it is A plus a reading of C that puts the flag outside the signer — and **it had no adversarial review**. The residual stands: **nothing forces a separate submitter to set the flag**, so that half is a convention rather than a property. Loopback is the half that removes the risk at its source. ⚠ **Earlier state, retained:**, and the three options are costed and handed over in `docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md` — **not decided**, because one of them adds a submitter and *"the signer does not submit"* is a trust-boundary claim in three places. ⚠ **`ConfidentialMPTConvertBack` being built (E-131) is not this gate being passed**: it is a transaction type, built under exactly the risk acceptance the ruling allows for the artifact |
| F-1 | Docs claim the reset inbox value is indistinguishable; it is the canonical `EncZero`, recomputable by any observer from public inputs, and used on first-time init, merge reset and clawback | `ConfidentialMPTConvert.cpp:305–313`, `MergeInbox.cpp:111–114`, `Clawback.cpp:138–166`. **Executed on Devnet 2026-08-17 → E-49**: recomputed independently and byte-matched against a live `sfConfidentialBalanceSpending`. No longer a source reading | A |
| F-23 | **A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which.** A `ConfidentialMPTSend` encrypts the amount to the destination's `HolderEncryptionKey` and the issuer's `IssuerEncryptionKey`, both read from the ledger. rippled verifies against the keys **it** holds — `ConfidentialMPTSend.cpp:132` takes `(*sleDestinationMPToken)[sfHolderEncryptionKey]` — so a substituted key fails the proof. It fails with **`tecBAD_PROOF`** (`ConfidentialTransfer.cpp:451`; `TER.h:371` makes it 199, a `tec`), and `Transactor.cpp:1653-1656` with `isTecClaimHardFail` (`applySteps.h:40`) **applies a `tec` to the ledger** unless the submitter set `tapFailHard`. So an adversary who controls what the signer reads gets the holder to publish the amount encrypted under a key the adversary holds, **and the failed transaction keeps it on chain**. The signer does not submit, so it does not get to set that flag | ~~**Read at source 2026-08-19.** ⚠ **Not executed**~~ — **EXECUTED 2026-08-19 and it HELD.** `tools/spike-step2-2026-08-19/f23-substituted-key.ts` built a Send encrypting the amount to an adversary's key instead of the destination's registered one. `tecBAD_PROOF`, **recorded on validated ledger 4603815**, hash `7A283EE5920EBB97AB90F4BC92B4E4E293C6DCE541A9607277D45DA4145AF160`. The amount **42 was recovered from public ledger data by the adversary**, holding only the key they supplied; **the intended destination could not decrypt it at all**. The published ciphertext is byte-identical to what was submitted. ⚠ **This is what a wrong READ costs. It is not a network attack** — nothing was compromised. Mitigated, not closed: TLS is required for any non-loopback endpoint, the signer re-reads the destination key before signing, and it checks the ledger's `HolderEncryptionKey` for **its own** account against the key it holds — **there is no such anchor for the destination's key or the issuer's** (B-15) | A, executed |


## FILE: XRPL-Standards XLS-0096-confidential-mpt/README.md (complete, at upstream commit 58ccd3047, fetched 2026-10-19)

````
<pre>
    title:  Confidential Transfers for Multi-Purpose Tokens
    description: This amendment introduces Confidential Transfers for Multi-Purpose Tokens (MPTs) on the XRP Ledger.
    implementation: https://github.com/XRPLF/rippled/pull/5860
    author: Murat Cenk <redacted@example.invalid>, Aanchal Malhotra <redacted@example.invalid>, Ayo Akinyele <redacted@example.invalid>, Peter Chen <redacted@example.invalid>, Shawn Xie <redacted@example.invalid>, Yinyi Qian <redacted@example.invalid>
    proposal-from: https://github.com/XRPLF/XRPL-Standards/discussions/372
    status: Final
    category: Amendment
    requires: XLS-33
    created: 2026-01-15
    updated: 2026-09-10
</pre>

# Confidential Transfers for Multi-Purpose Tokens

## 1. Abstract

This specification introduces **Confidential Transfers for Multi-Purpose Tokens (Confidential MPTs)** on the XRP Ledger as an extension of XLS-33 (Multi-Purpose Token). Confidential MPTs enable **confidential balances and transfers** using EC-ElGamal encryption and zero-knowledge proofs (ZKPs), while preserving the core accounting semantics and supply invariants of XLS-33.

The design provides the following properties:

- **Confidentiality:** Individual balances and transfer amounts are encrypted and are not revealed to validators or external observers.
- **Public auditability:** Issuance limits remain publicly enforceable through the existing invariant
  `OutstandingAmount ≤ MaximumAmount`, without requiring decryption of confidential balances.
- **Selective disclosure:** The protocol supports a trust-minimized, on-chain auditor model based on encrypted balance mirroring and zero-knowledge consistency proofs.
- **Compatibility:** Public and confidential balances may coexist for the same token. The issuer account itself cannot hold confidential balances; issuers who wish to participate in confidential circulation must use a separate dedicated holder account, which is treated identically to other non-issuer holders, preserving XLS-33 issuance semantics.
- **Issuer control:** Existing issuer controls are preserved and extended to confidential balances, including issuer-initiated freezing and clawback that burns the clawed-back funds.

Confidential MPTs align directly with XLS-33 by maintaining `OutstandingAmount` as the sum of all non-issuer balances. Supply consistency is enforced deterministically by validators using plaintext ledger fields, while confidentiality is achieved at the transaction level through AND-composed compact sigma proofs and range proofs.

## 2. Motivation

XLS-33 enables flexible tokenization on the XRP Ledger, but all balances and transfers remain publicly visible. This transparency limits adoption in institutional and privacy-sensitive contexts. Confidential MPTs address this gap by introducing encrypted balances and confidential transfers while preserving XLS-33 semantics.

The design maintains the standard definition of OutstandingAmount (OA) as the sum of all non-issuer balances. A complementary value, ConfidentialOutstandingAmount (COA), tracks the confidential portion of circulation, ensuring that while individual balances are encrypted, the global supply remains auditable. MaximumAmount (MA) continues to cap the total supply, allowing validators to enforce consistency with the existing invariant OA ≤ MA.

### 2.1 Benefits

- Confidentiality: Hides individual balances and transfer amounts using EC-ElGamal encryption and ZKPs.
- Auditability: Public auditability is preserved via XLS-33’s existing OA semantics.
- Flexible Compliance: Enables selective disclosure through a trust-minimized on-chain auditor model.
- Compatibility: Maintains backward compatibility with XLS-33. The issuer account cannot hold confidential balances; any issuer-controlled dedicated holder account is treated as a standard holder.
- Enhanced Issuer Control: Provides optional Freeze and a Clawback transaction, giving issuers the tools needed to manage assets and enforce compliance. Clawback burns the holder’s confidential balance.

## 3. Definitions & Terminology

- **MPT (Multi-Purpose Token):** A token standard defined by XLS-33, extended here to support confidential balances and transfers.
- **MPTokenIssuance (Object):** Ledger object storing metadata for an MPT, including `MPTokenIssuanceID`, `MaximumAmount` (MA), `OutstandingAmount` (OA) and etc.
- **MPToken (Object):** Ledger object representing a holder’s balance of a given MPT. Extended to include confidential balance fields.
- **Dedicated Account (Issuer-as-Holder):** An optional account controlled by the issuer but treated by the ledger as a standard non-issuer holder. The issuer account itself cannot hold confidential balances for it's own issuance; an issuer that wishes to participate in confidential circulation must use a dedicated account. This account is sometimes called the "Confidential Vault."
- **OutstandingAmount (OA):** The total of all non-issuer balances (public and confidential), including any issuer-controlled dedicated account.
- **ConfidentialOutstandingAmount (COA):** The total amount of an MPT currently held in confidential balances by non-issuers, including any issuer-controlled dedicated account.
- **MaximumAmount (MA):** The maximum allowed token supply. Invariant: `OA ≤ MA`.
- **EC-ElGamal Encryption:** A public-key encryption scheme with additive homomorphism, used for encrypted balances and homomorphic balance updates.
- **Zero-Knowledge Proofs (ZKPs):** Cryptographic proofs used to validate confidential transactions without revealing amounts, including:
  - **AND-composed compact sigma proofs** (referred to as _compact sigma proofs_ throughout this document): proofs that AND-compose multiple ZK statements under a single Fiat–Shamir challenge into a single fixed-size proof per transaction type, bundling ciphertext consistency, amount linkage, and balance linkage checks.
  - **Range proofs**, ensuring confidential amounts and post-transfer balances are non-negative and lie within a valid range.
- **Split-Balance Model:** Confidential balances are divided into:
  - **Spending (CB_S):** Stable balance used for spending and proofs.
  - **Inbox (CB_IN):** Receives incoming transfers and must be explicitly merged into `CB_S`, preventing stale-proof rejection.
- **Auditor Policy:** An optional issuance-level configuration that enables selective disclosure by encrypting balances under an auditor’s public key.
- **Clawback:** A privileged issuer-only operation performed via a `ConfidentialMPTClawback` transaction, which forcibly burns a holder’s entire confidential balance (decreasing both COA and OA) while preserving ledger accounting consistency through ZKPs. The burned funds are permanently removed from circulation.

## 4. Scope

This XLS specifies the protocol changes required to support confidential MPTs, including:

### 4.1 New Transaction Types

- ConfidentialMPTConvert: Converts public MPT balances into encrypted form for a holder.
- ConfidentialMPTSend: Confidential transfer of tokens between accounts, with encrypted amounts validated by ZKPs.
- ConfidentialMPTMergeInbox: Merges a holder’s inbox balance into their spending balance, preventing stale-proof issues.
- ConfidentialMPTConvertBack: Converts confidential balances back into public form, restoring visible balances.
- ConfidentialMPTClawback: An issuer-only transaction to forcibly burn a holder’s entire confidential balance, permanently removing those tokens from circulation.

## 5. Protocol Overview

The Confidential MPT protocol is built on three core design principles: the **Dedicated Account** model, the **Split-Balance** model for reliable transfers, and a **Multi-Ciphertext** architecture for privacy and compliance.

### 5.1 The Dedicated Account Model

The issuer account itself **cannot** hold or convert to it's own token to confidential balances. To participate in confidential circulation, the issuer may optionally use an issuer-controlled **Dedicated Account** (also known as a "Confidential Vault"). While this account remains under the control of the issuer, it is treated by the ledger as a standard **Holder** with no special privileges.

The operational setup, when the issuer wishes to seed confidential circulation, follows these steps:

1.  The **Issuer** creates an `MPTokenIssuance` object.
2.  The **Issuer** optionally creates a **Dedicated Account** to act as the "Confidential Vault."
3.  The **Issuer** sends a public MPT amount to the **Dedicated Account**.
4.  The **Dedicated Account** converts the public balance to a confidential balance.

- **Preserving invariants:** Because the dedicated account is a non-issuer, its balance is included in `OutstandingAmount` (OA). This preserves the existing `OA ≤ MaximumAmount` invariant and allows validators to enforce the supply cap without decrypting confidential balances. All subsequent confidential transfers between non-issuer holders are redistributions that do not modify OA.

### 5.2 The Split-Balance Model

To prevent stale-proof failures—where an incoming transfer could invalidate a proof generated for an outgoing transfer—each account’s confidential balance is split into two components:

- **Spending balance (CB_S):** A stable balance used for generating proofs in outgoing `ConfidentialMPTSend` transactions.
- **Inbox balance (CB_IN):** A separate balance that receives all incoming confidential transfers.
- **Merging:** Holders explicitly merge `CB_IN` into `CB_S` using the proof-free `ConfidentialMPTMergeInbox` transaction. Each merge increments a monotonically increasing version number (`CB_S_Version`), which is bound to newly generated proofs to prevent replay and ensure proofs reference a stable balance.

### 5.3 The Multi-Ciphertext Architecture

A single confidential balance is represented by multiple parallel ciphertexts, each serving a distinct purpose. Compact sigma proofs ensure that all ciphertexts correspond to the same hidden amount.

- **Holder encryption:** The primary balance is encrypted under the holder’s public key, granting exclusive spending authority.
- **Issuer encryption:** The same balance is also encrypted under the issuer’s public key (`IssuerEncryptedBalance`). This encrypted mirror supports supply consistency checks and issuer-level auditing without granting spending capability.
- **Optional auditor encryption:** If an auditor is set, balances are additionally encrypted under an auditor’s public key (`AuditorEncryptedBalance`), enabling on-chain selective disclosure.

### 5.4. Proof System

The protocol relies on a set of ZKPs to validate confidential transactions without revealing balances or transfer amounts. The following proof types are used:

- **Schnorr Proof of Knowledge (64 bytes)**: Used in `ConfidentialMPTConvert` when registering a new holder key. Proves ownership of the private key associated with the ElGamal public key.
- **compact sigma proofs**: Cryptographic proofs that bundle multiple ZK statements into a single fixed-size blob verified in one pass. Each transaction uses a dedicated sigma proof optimized for its specific set of hidden values.
  - **Compact Send sigma proof (192 bytes)**: Used in `ConfidentialMPTSend`. Simultaneously proves:
    - **Ciphertext consistency**: All encrypted copies of the transfer amount (sender, receiver, issuer, optional auditor) encrypt the same value using shared randomness.
    - **Amount linkage**: The `AmountCommitment` commits to that same transfer amount. Critically, it intentionally reuses the ElGamal ciphertext randomness as its blinding factor rather than introducing an independent scalar, which means the relationship between the commitment and the ciphertexts is captured directly within the compact sigma proof, eliminating the need for a separate amount-linkage proof.
    - **Balance linkage**: The `BalanceCommitment` encodes the same spending balance as the sender's on-ledger encrypted balance, verified via knowledge of the sender's secret key.
  - **Compact ConvertBack sigma proof (128 bytes)**: Used in `ConfidentialMPTConvertBack`. Proves the holder owns the spending balance and that their balance commitment is correctly derived from it.
  - **Compact Clawback sigma proof (64 bytes)**: Used in `ConfidentialMPTClawback`. Proves the issuer's on-ledger encrypted balance mirror contains the plaintext amount being claimed.
- **Plaintext–ciphertext equality (deterministic):** In `ConfidentialMPTConvert` and `ConfidentialMPTConvertBack`, the disclosed blinding factor allows validators to verify ciphertexts deterministically without a ZKP.
- **Range proofs (Bulletproofs):** Prove that confidential amounts and post-transfer balances lie within a valid range, enforcing non-negativity and preventing overspending.
  - **Aggregated Bulletproof (754 bytes)**: Used in `ConfidentialMPTSend`. Proves both the transfer amount and the remaining balance are in [0, 2^64). Note that, while the Bulletproof covers the full 64-bit range, transactors independently reject any amount exceeding the protocol cap `maxMPTokenAmount` (2^63 − 1), so accepted values lie in [0, 2^63 − 1].
  - **Single Bulletproof (688 bytes)**: Used in `ConfidentialMPTConvertBack`. Proves the remaining balance after withdrawal is non-negative.

### 5.5. Delegate Accounts

The issuer may designate one or more **delegate accounts** to act on its behalf, for example, to submit `ConfidentialMPTClawback` transactions or to manage the dedicated account (Confidential Vault). Delegate accounts must be considered **fully trusted** by the issuer. A delegate account has complete operational authority within the scope delegated to it, and the protocol does not impose additional on-chain restrictions on delegate actions beyond those that apply to the issuer itself. Issuers should apply the same key-management standards to delegate accounts as to their primary issuer account.

`ConfidentialMPTSend`, `ConfidentialMPTMergeInbox`, `ConfidentialMPTConvertBack`, and `ConfidentialMPTClawback` are delegable. **`ConfidentialMPTConvert` is NOT delegable.** It is the transaction that registers an account's `HolderEncryptionKey`, and that key carries exclusive spending authority over the account's confidential balance — delegating it would let the delegate register a key whose secret it alone controls, and thereby take over the account's confidential funds.

## 6. Ledger Entry: `MPTokenIssuance`

To support confidential MPTs, the existing `MPTokenIssuance` ledger object is extended. These new fields and flags serve as the global configuration and control settings for the token's confidential features.

### 6.1. Fields

| FieldName                       | Required? | JSON Type | Internal Type | Description                                                                                                                                                                                                                                                                 |
| :------------------------------ | :-------- | :-------- | :------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IssuerEncryptionKey`           |           | `string`  | `Blob`        | A 33-byte compressed ElGamal public key for the issuer. **Required** to use the confidential transfer feature.                                                                                                                                                              |
| `AuditorEncryptionKey`          |           | `string`  | `Blob`        | A 33-byte compressed ElGamal public key for an optional on-chain auditor.                                                                                                                                                                                                   |
| `ConfidentialOutstandingAmount` | (default) | `number`  | `UINT64`      | The total amount of this token that is currently held in confidential balances. This value is adjusted with every `ConfidentialMPTConvert`, `ConfidentialMPTConvertBack`, and `ConfidentialMPTClawback` transaction. **Required** to use the confidential transfer feature. |

### 6.2. Flags

Two new flags are introduced for the `MPTokenIssuance` ledger object. Note that **`lsfMPTCanHoldConfidentialBalance`** is stored in the standard `Flags` field, while **`lsifMPTCanHoldConfidentialBalance`** is stored in the `ImmutableFlags` field.

| Flag Name                           | Field            | Hex Value    | Description                                                                                         |
| :---------------------------------- | :--------------- | :----------- | :-------------------------------------------------------------------------------------------------- |
| `lsfMPTCanHoldConfidentialBalance`  | `Flags`          | `0x00000080` | Indicates that confidential transfers are enabled for this token issuance.                          |
| `lsifMPTCanHoldConfidentialBalance` | `ImmutableFlags` | `0x00000080` | If set, the `lsfMPTCanHoldConfidentialBalance` flag can never be changed after the token is issued. |

**Note**: `ImmutableFlags` is introduced in the amendment [`DynamicMPT`](../XLS-0094-dynamic-MPT/README.md). To use this field, the `DynamicMPT` amendment must be enabled.

### 6.3. Managing Confidentiality Settings

The `lsfMPTCanHoldConfidentialBalance` flag enables the use of confidential transactions for an `MPTokenIssuance`. Only when this flag is enabled can the token support confidential transfers.

#### 6.3.1. Mutability & Defaults

> **Note on Terminology:**

- `Flags`: The prefix `lsf` refers to ledger state flags, while `tf` refers to the transaction flags.
- `ImmutableFlags`: The prefix `lsif` refers to the immutable ledger state flags.

- **Default Behavior (Mutable):** By default, without setting `tifMPTCanHoldConfidentialBalance`, the issuer retains the ability to enable the confidential balance setting (`lsfMPTCanHoldConfidentialBalance`) via [`MPTokenIssuanceSet`](https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuanceset) transactions. Enabling is one-way; the flag cannot be cleared once set.
- **Permanent Lock (Immutable):** If the issuer sets the immutable flag `tifMPTCanHoldConfidentialBalance` through [`MPTokenIssuanceCreate`](https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuancecreate) transaction, the `lsfMPTCanHoldConfidentialBalance` can never be changed after issuance.

#### 6.3.2. Enabling Confidentiality

There are two ways to enable the `lsfMPTCanHoldConfidentialBalance` flag:

- **At Creation:** The issuer can enable the `tfMPTCanHoldConfidentialBalance` flag directly within the `MPTokenIssuanceCreate` transaction at the time the token is issued.
- **Post-Creation (Update):** If the issuance was created with confidential mutability allowed (that is, `lsifMPTCanHoldConfidentialBalance` was not set — which is the default behavior), the issuer may later submit an `MPTokenIssuanceSet` transaction to activate the `lsfMPTCanHoldConfidentialBalance` flag.

#### 6.3.3. Disabling Confidentiality

Enabling confidentiality is **one-way**. Once `lsfMPTCanHoldConfidentialBalance` is set it cannot be cleared — there is no transaction flag to disable confidential balance on an existing issuance. This guarantees that funds already converted to a confidential state can never be stranded by the capability being turned off underneath them.

### 6.4. Transfer Fee Compatibility

Confidential MPTs are incompatible with non-zero `TransferFee`. An `MPTokenIssuance` MUST NOT have both a non-zero `TransferFee` and `lsfMPTCanHoldConfidentialBalance` enabled.

This restriction exists because XLS-33 transfer fees are percentage-based while `ConfidentialMPTSend` hides the transferred amount; see §14.4.

The following cases are invalid:

- `MPTokenIssuanceCreate` with both a non-zero `TransferFee` and `tfMPTCanHoldConfidentialBalance`. (`temBAD_TRANSFER_FEE`)
- `MPTokenIssuanceSet` that sets `tfMPTSetCanHoldConfidentialBalance` while the issuance already has a non-zero `TransferFee`. (`tecNO_PERMISSION`)
- `MPTokenIssuanceSet` that sets a non-zero `TransferFee` while the issuance already has `lsfMPTCanHoldConfidentialBalance`. (`tecNO_PERMISSION`)
- `MPTokenIssuanceSet` that sets a non-zero `TransferFee` and `tfMPTSetCanHoldConfidentialBalance` in the same transaction. (`temBAD_TRANSFER_FEE`)

`ConfidentialMPTSend` will fail with `tecNO_PERMISSION` if the issuance has a non-zero `TransferFee`.

### 6.5. Deletion

**Deletion Transactions:** `MPTokenIssuanceDestroy`.

**Deletion Conditions:**

- All XLS-33 conditions continue to apply unchanged, in particular `OutstandingAmount == 0`.
- The issuance can only be destroyed while `ConfidentialOutstandingAmount` is 0, but this requires no confidential-specific condition on `MPTokenIssuanceDestroy`. Because `ConfidentialOutstandingAmount <= OutstandingAmount` holds at all times (§6.6), the existing XLS-33 requirement already implies it.
- Registered encryption keys (`IssuerEncryptionKey`, `AuditorEncryptionKey`) do not block destruction; they are removed with the issuance.

**Account Deletion Blocker:** Yes. This is unchanged from XLS-33: an `MPTokenIssuance` must be deleted before its issuer account can be deleted, and this amendment adds no new exemption.

### 6.6. Invariants

In the rules below, `ΔCOA` and `ΔOA` denote a transaction's net change to this issuance's `ConfidentialOutstandingAmount` and `OutstandingAmount`, and `ΔMPTAmount` denotes its net change to `MPTAmount` summed over _every_ `MPToken` of this issuance rather than that of any single holder.

- `ConfidentialOutstandingAmount` <= `OutstandingAmount`. Since `ConfidentialOutstandingAmount` is an unsigned 64-bit field, this also catches any underflow: a subtraction below zero wraps to a value that necessarily exceeds `OutstandingAmount`.
- Whenever `ΔCOA != 0`, the identity `ΔMPTAmount + ΔCOA = ΔOA` MUST hold.
- Whenever `ΔCOA = 0` and the transaction is one of the five confidential MPT transaction types, both `ΔMPTAmount = 0` and `ΔOA = 0` MUST hold. Besides `ConfidentialMPTSend` and `ConfidentialMPTMergeInbox`, this case also covers a zero-amount `ConfidentialMPTConvert` submitted purely to register a `HolderEncryptionKey`.

### 6.7. Example JSON

```json
{
  "LedgerEntryType": "MPTokenIssuance",
  "Flags": 128,
  "Issuer": "rf1BiGeXwwQoi8Z2ueOMErvmAzyxw",
  "OutstandingAmount": "1000000",
  "MaximumAmount": "5000000",
  "ConfidentialOutstandingAmount": "500000",
  "IssuerEncryptionKey": "028d...",
  "AuditorEncryptionKey": "037c...",
  "PreviousTxnID": "5DFD494A15AED58DE4335DAEDD3E1EEFECE...",
  "PreviousTxnLgrSeq": 1234567,
  "index": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864"
}
```

## 7. Ledger Entry: `MPToken`

To support confidential MPTs, the existing `MPToken` ledger object is extended with the fields that hold a holder's confidential balance. All of these fields are absent until the holder opts in by submitting their first `ConfidentialMPTConvert`, and the issuer's own account never carries them, since the issuer cannot hold a confidential balance of its own issuance.

### 7.1. Fields

| FieldName                     | Required? | JSON Type | Internal Type | Description                                                                                                                                                                                                                                 |
| :---------------------------- | :-------- | :-------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HolderEncryptionKey`         |           | `string`  | `Blob`        | A 33-byte compressed ElGamal public key belonging to the holder. Registered by the holder's first `ConfidentialMPTConvert` and immutable thereafter. Possession of the matching secret key is what grants authority to spend the balance.   |
| `ConfidentialBalanceSpending` |           | `string`  | `Blob`        | A 66-byte ElGamal ciphertext (`CB_S`) encrypting the holder's spendable confidential balance under `HolderEncryptionKey`. Initialized to the canonical encrypted zero. Only this balance may be spent or converted back.                    |
| `ConfidentialBalanceInbox`    |           | `string`  | `Blob`        | A 66-byte ElGamal ciphertext (`CB_IN`) encrypting incoming confidential value under `HolderEncryptionKey`. Credited by `ConfidentialMPTConvert` and `ConfidentialMPTSend`, and folded into `CB_S` by `ConfidentialMPTMergeInbox` (§10).     |
| `ConfidentialBalanceVersion`  | (default) | `number`  | `UINT32`      | A counter bound into the holder's proofs to prevent stale-proof replay. Incremented whenever `ConfidentialBalanceSpending` changes; wraps to 0 after reaching the maximum 32-bit value.                                                     |
| `IssuerEncryptedBalance`      |           | `string`  | `Blob`        | A 66-byte ElGamal ciphertext encrypting the holder's **total** confidential balance (`CB_S` + `CB_IN`) under the issuance's `IssuerEncryptionKey`. The issuer's mirror, used for supply reconciliation and as the basis for clawback (§12). |
| `AuditorEncryptedBalance`     |           | `string`  | `Blob`        | A 66-byte ElGamal ciphertext encrypting the same total balance under the issuance's `AuditorEncryptionKey`. Present only when the issuance has an auditor configured.                                                                       |

### 7.2. Deletion

**Deletion Transactions:** `MPTokenAuthorize` (with `tfMPTUnauthorize`), and implicitly by transactions that reclaim an empty holding on the holder's behalf — `VaultDelete`, `VaultWithdraw`, `VaultClawback`, and `LoanBrokerDelete`.

**Deletion Conditions:**

- All XLS-33 conditions continue to apply unchanged, including a zero public `MPTAmount`.
- **Holder-initiated deletion:** An `MPToken` that carries confidential balance fields cannot be deleted while the issuance's `ConfidentialOutstandingAmount` is non-zero, because the ledger cannot tell from the ciphertexts alone whether that particular holder's balance is zero. The attempt fails with `tecHAS_OBLIGATIONS`. Once `ConfidentialOutstandingAmount` reaches 0, every holder's confidential balance is necessarily zero and the `MPToken` may be deleted normally, even if the confidential fields are still present on it.
- **Implicit deletion:** Deletion performed implicitly by one of the vault or loan-broker transactions above is blocked whenever the `MPToken` still carries any confidential balance field (`ConfidentialBalanceSpending`, `ConfidentialBalanceInbox`, `IssuerEncryptedBalance`, or `AuditorEncryptedBalance`), irrespective of `ConfidentialOutstandingAmount`, and fails with `tecHAS_OBLIGATIONS`. This is deliberately stricter than the holder-initiated rule, as defense in depth: objects reachable through those paths cannot acquire confidential fields in the first place — vault share issuances are created without `lsfMPTCanHoldConfidentialBalance`, and a vault or loan-broker pseudo-account cannot submit the `ConfidentialMPTConvert` that would register the fields — so the two rules never disagree on a state the protocol can actually produce.

**Account Deletion Blocker:** This is unchanged from XLS-33: an `MPToken` must be deleted before its owner account can be deleted, and this amendment adds no new exemption.

### 7.3. Invariants

- `ConfidentialBalanceSpending`, `ConfidentialBalanceInbox`, and `IssuerEncryptedBalance` are all present or all absent. A single `ConfidentialMPTConvert` creates all three at once.
- `AuditorEncryptedBalance` may be present only if the three core fields are present.
- If a transaction creates or modifies any of `ConfidentialBalanceSpending`, `ConfidentialBalanceInbox`, `IssuerEncryptedBalance`, or `AuditorEncryptedBalance`, then the corresponding `MPTokenIssuance` MUST have the `lsfMPTCanHoldConfidentialBalance` flag enabled. The converse is deliberately not required: these fields may remain on an `MPToken` after all confidential balances have returned to zero, so merely carrying them is not constrained — only changing them is.
- If a transaction changes the value of `ConfidentialBalanceSpending` on an existing `MPToken`, then `ConfidentialBalanceVersion` MUST also change. Initial creation of `ConfidentialBalanceSpending` by the holder's first `ConfidentialMPTConvert` is exempt, since there is no prior value to invalidate.
- While the issuance's `ConfidentialOutstandingAmount` is greater than 0, no `MPToken` may be removed from the ledger if, immediately before removal, it had a non-zero `MPTAmount` or carried any of `ConfidentialBalanceSpending`, `ConfidentialBalanceInbox`, `IssuerEncryptedBalance`, or `AuditorEncryptedBalance`. This holds regardless of which transaction attempts the removal (§7.2).

### 7.4. Example JSON

```json
{
  "LedgerEntryType": "MPToken",
  "Account": "rHolderAccountAddress",
  "MPTokenIssuanceID": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864",
  "MPTAmount": "500000",
  "Flags": 0,
  "HolderEncryptionKey": "038d...",
  "ConfidentialBalanceSpending": "02a1...",
  "ConfidentialBalanceInbox": "03b2...",
  "ConfidentialBalanceVersion": 7,
  "IssuerEncryptedBalance": "02c3...",
  "AuditorEncryptedBalance": "03d4...",
  "OwnerNode": "0000000000000000",
  "PreviousTxnID": "5DFD494A15AED58DE4335DAEDD3E1EEFECE...",
  "PreviousTxnLgrSeq": 1234567,
  "index": "36D91DEE5EFE4A93119A8B84C944A528F2B444B3F3EC6D64C1F9D2FE9F1E5EB4"
}
```

## 8. Transaction: `ConfidentialMPTConvert`

**Purpose:**
Converts a holder’s own visible (public) MPT balance into confidential form. The converted amount is credited to the holder’s confidential inbox balance (`CB_IN`) to avoid immediate proof staleness, requiring an explicit merge into the spending balance (`CB_S`) before use. This transaction also serves as the opt-in mechanism for confidential MPT participation: by executing it (including a zero-amount conversion), a holder’s `HolderEncryptionKey` is recorded on their `MPToken` object, enabling the holder to receive and manage confidential funds.

This transaction is a **self-conversion only**. The issuer account itself **cannot** execute this transaction; only non-issuer holders may convert public balances to confidential form of its own MPT issuance. Issuers introduce supply exclusively through existing XLS-33 public issuance mechanisms. An issuer-controlled dedicated account participates in confidential MPTs by executing `ConfidentialMPTConvert` as a regular holder, with no special privileges. In all cases, `OutstandingAmount` (OA) and `ConfidentialOutstandingAmount` (COA) are maintained in plaintext according to existing invariants.

### 8.1 Use Cases

- **Holder → self (public → confidential):**
  Public balance decreases and confidential balance increases; OA unchanged, COA increases (both in plaintext).
- **Issuer dedicated account → self (public → confidential):**
  After being funded publicly via XLS-33 issuance, the dedicated account converts its own balance like any holder; OA unchanged, COA increases.
- **Hybrid circulation:**
  Tokens may coexist in public and confidential form.

### 8.2 Fields

| Field Name               | Required? | JSON Type | Internal Type | Default Value | Description                                                                                                                                                                                                                |
| :----------------------- | :-------- | :-------- | :------------ | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TransactionType`        | Yes       | `string`  | `UINT16`      | N/A           | Identifies this as a `ConfidentialMPTConvert`, which is 85.                                                                                                                                                                |
| `Account`                | Yes       | `string`  | `ACCOUNTID`   | N/A           | The account initiating the conversion.                                                                                                                                                                                     |
| `MPTokenIssuanceID`      | Yes       | `string`  | `UINT192`     | N/A           | The unique identifier for the MPT issuance.                                                                                                                                                                                |
| `MPTAmount`              | Yes       | `number`  | `UINT64`      | N/A           | The public plaintext amount $inline$m$inline$ to convert.                                                                                                                                                                  |
| `HolderEncryptionKey`    | No        | `string`  | `BLOB`        | N/A           | The holder's ElGamal public key ($inline$pk_A$inline$). **Required** if initializing (no key registered). **Forbidden** if key already registered.                                                                         |
| `HolderEncryptedAmount`  | Yes       | `string`  | `BLOB`        | N/A           | A 66-byte ElGamal ciphertext credited to the holder's $inline$CB\_{IN}$inline$.                                                                                                                                            |
| `IssuerEncryptedAmount`  | Yes       | `string`  | `BLOB`        | N/A           | A 66-byte ElGamal ciphertext credited to the issuer's mirror balance.                                                                                                                                                      |
| `AuditorEncryptedAmount` | No        | `string`  | `BLOB`        | N/A           | A 66-byte ElGamal Ciphertext for the auditor. **Required** if `AuditorEncryptionKey` is present on the issuance.                                                                                                           |
| `BlindingFactor`         | Yes       | `string`  | `UINT256`     | N/A           | The scalar value used to encrypt the amount. Used by validators to verify the ciphertexts match the plaintext `MPTAmount`. Its length is fixed at 32 bytes by the `UINT256` encoding, so no separate length check applies. |
| `ZKProof`                | No        | `string`  | `BLOB`        | N/A           | A Schnorr Proof of Knowledge (PoK). **Required** only when `HolderEncryptionKey` is present. **MUST** be absent when `HolderEncryptionKey` is absent.                                                                      |

**Notes:**

- This transaction performs **self-conversion only**; there is no `Receiver` field.
- Issuers introduce supply via existing XLS-33 public issuance. An issuer-controlled dedicated account executes this transaction as a regular holder.

### 8.3. Transaction Fee

**Fee Structure:** Custom

This transaction requires 10 times the standard base fee because zero-knowledge proof verification costs validators significantly more than processing a public MPT transaction.

### 8.4. Failure Conditions

#### 8.4.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled on the ledger. (`temDISABLED`)
2. `Account` is the Issuer. (`temMALFORMED`)
3. `HolderEncryptionKey` is present but `ZKProof` is missing. (`temMALFORMED`)
4. `HolderEncryptionKey` is absent but `ZKProof` is present. (`temMALFORMED`)
5. The length of `HolderEncryptionKey` is not exactly 33 bytes. (`temMALFORMED`)
6. The length of `ZKProof` is not exactly 64 bytes. (`temMALFORMED`)
7. Any provided ciphertext (`Holder`, `Issuer`, or `Auditor`) has an invalid length or represents an invalid elliptic curve point. (`temBAD_CIPHERTEXT`)
8. `MPTAmount` exceeds the maximum allowable MPT amount. (`temBAD_AMOUNT`)

#### 8.4.2. Protocol-Level Failures

1. The `MPTokenIssuance` or the holder's `MPToken` object does not exist. (`tecOBJECT_NOT_FOUND`)
2. The issuance does not have the `lsfMPTCanHoldConfidentialBalance` flag set, or has no registered `IssuerEncryptionKey`. (`tecNO_PERMISSION`)
3. The issuance has `AuditorEncryptionKey` set but the transaction does not include `AuditorEncryptedAmount`, or the issuance has no auditor key but the transaction includes `AuditorEncryptedAmount`. (`tecNO_PERMISSION`)
4. The holder's `MPToken` is locked, or the entire issuance is locked. (`tecLOCKED`)
5. The issuance requires authorization (`lsfMPTRequireAuth`) and the holder's `MPToken` is not authorized (`lsfMPTAuthorized` is not set). (`tecNO_AUTH`)
6. The holder does not have sufficient public MPT balance to cover the `MPTAmount`. (`tecINSUFFICIENT_FUNDS`)
7. No `HolderEncryptionKey` is provided in the transaction and the account does not have a registered `HolderEncryptionKey` on ledger. (`tecNO_PERMISSION`)
8. A public key is provided in the transaction, but the account already has a registered key. (`tecDUPLICATE`)
9. The `BlindingFactor` fails to reconstruct the provided ciphertexts given the plaintext `MPTAmount`. (`tecBAD_PROOF`)
10. The Schnorr `ZKProof` fails to verify the holder's knowledge of the secret key. (`tecBAD_PROOF`)

### 8.5. State Changes

If the transaction is successful:

1. The holder's public **`MPTAmount`** is decreased by the converted amount.
2. The **`ConfidentialOutstandingAmount`** on the `MPTokenIssuance` object is increased by the converted amount.
3. The holder's **`HolderEncryptionKey`** is registered on their `MPToken` object if it was not already present.
4. The **`ConfidentialBalanceInbox`** and **`IssuerEncryptedBalance`** are updated by homomorphically adding the provided ciphertexts.
5. If the issuance has an auditor configured (`AuditorEncryptionKey` present), **`AuditorEncryptedBalance`** is likewise updated by homomorphically adding `AuditorEncryptedAmount`.
6. If initializing confidential state for the first time, **`ConfidentialBalanceSpending`** is initialized with an encrypted zero and the version counter is set to 0.

### 8.6 Example JSON

```json
{
  "Account": "rBob...",
  "TransactionType": "ConfidentialMPTConvert",
  "MPTokenIssuanceID": "610F33...",
  "MPTAmount": 1000,
  "HolderEncryptionKey": "038d...",
  "HolderEncryptedAmount": "AD3F...",
  "IssuerEncryptedAmount": "BC2E...",
  "BlindingFactor": "EE21...",
  "ZKProof": "ABCD..."
}
```

## 9. Transaction: `ConfidentialMPTSend`

**Purpose:**
Performs a confidential transfer of MPT value between accounts while keeping the transfer amount hidden. The transferred amount is credited to the receiver’s confidential inbox balance (`CB_IN`) to avoid proof staleness; the receiver may later merge these funds into the spending balance (`CB_S`) via `ConfidentialMPTMergeInbox`.

This transaction honors **Deposit Authorization** and **Credentials** (XLS-70), ensuring that confidential transfers respect the same authorization requirements as standard MPT payments.

### 9.1 Use Cases

- **Holder → holder (including any issuer-controlled dedicated account):**
  Confidential redistribution of value with the transfer amount hidden.
- **Dedicated account ↔ holder:**
  Confidential redistribution among non-issuer holders under identical rules.

### 9.2. Fields

| Field Name                   | Required? | JSON Type | Internal Type | Default Value | Description                                                                                                                                                                                                                                                                                                                                    |
| :--------------------------- | :-------- | :-------- | :------------ | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TransactionType`            | Yes       | `string`  | `UINT16`      | N/A           | Identifies this as a `ConfidentialMPTSend`, which is 88.                                                                                                                                                                                                                                                                                       |
| `Account`                    | Yes       | `string`  | `ACCOUNTID`   | N/A           | The sender's XRPL account.                                                                                                                                                                                                                                                                                                                     |
| `Destination`                | Yes       | `string`  | `ACCOUNTID`   | N/A           | The receiver's XRPL account.                                                                                                                                                                                                                                                                                                                   |
| `DestinationTag`             | No        | `number`  | `UINT32`      | N/A           | Arbitrary tag identifying the reason for the transfer, or a hosted recipient at the destination. **Required** if the destination account has `lsfRequireDestTag` set.                                                                                                                                                                          |
| `MPTokenIssuanceID`          | Yes       | `string`  | `UINT192`     | N/A           | Identifier of the MPT issuance being transferred.                                                                                                                                                                                                                                                                                              |
| `SenderEncryptedAmount`      | Yes       | `string`  | `BLOB`        | N/A           | Ciphertext used to homomorphically debit the sender's spending balance.                                                                                                                                                                                                                                                                        |
| `DestinationEncryptedAmount` | Yes       | `string`  | `BLOB`        | N/A           | Ciphertext credited to the receiver's inbox balance.                                                                                                                                                                                                                                                                                           |
| `IssuerEncryptedAmount`      | Yes       | `string`  | `BLOB`        | N/A           | Ciphertext used to update the issuer mirror balance.                                                                                                                                                                                                                                                                                           |
| `ZKProof`                    | Yes       | `string`  | `BLOB`        | N/A           | A 946-byte bundle containing a **compact sigma proof** (192 bytes, proving ciphertext consistency across all recipients, amount linkage to `AmountCommitment`, and balance linkage to `BalanceCommitment`) and an **aggregated Bulletproof range proof** (754 bytes, proving both the transfer amount and remaining balance are non-negative). |
| `BalanceCommitment`          | Yes       | `string`  | `BLOB`        | N/A           | A cryptographic commitment to the user's confidential spending balance.                                                                                                                                                                                                                                                                        |
| `AmountCommitment`           | Yes       | `string`  | `BLOB`        | N/A           | A cryptographic commitment to the amount being transferred.                                                                                                                                                                                                                                                                                    |
| `AuditorEncryptedAmount`     | No        | `string`  | `BLOB`        | N/A           | Ciphertext for the auditor. **Required** if `AuditorEncryptionKey` is present on the issuance.                                                                                                                                                                                                                                                 |
| `CredentialIDs`              | No        | `array`   | `Vector256`   | N/A           | Credential(s) to attach to the transaction for authorization purposes (XLS-70).                                                                                                                                                                                                                                                                |

### 9.3. Transaction Fee

**Fee Structure:** Custom

This transaction requires 10 times the standard base fee because zero-knowledge proof verification costs validators significantly more than processing a public MPT transaction.

### 9.4. Failure Conditions

#### 9.4.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled on the ledger. (`temDISABLED`)
2. The sender is the issuer of the MPT. (`temMALFORMED`)
3. The destination is the issuer of the MPT. (`temMALFORMED`)
4. The sender and destination accounts are the same. (`temMALFORMED`)
5. The `ZKProof` is not exactly 946 bytes. (`temMALFORMED`)
6. The `BalanceCommitment` or `AmountCommitment` is not a valid 33-byte compressed elliptic curve point. (`temMALFORMED`)
7. Any required encrypted amount (`SenderEncryptedAmount`, `DestinationEncryptedAmount`, or `IssuerEncryptedAmount`) has an invalid length or represents an invalid elliptic curve point. (`temBAD_CIPHERTEXT`)
8. The `AuditorEncryptedAmount` (if present) has an invalid length or represents an invalid elliptic curve point. (`temBAD_CIPHERTEXT`)

#### 9.4.2. Protocol-Level Failures

1. The destination account does not exist. (`tecNO_TARGET`)
2. The destination account has `lsfRequireDestTag` set, but the transaction does not include a `DestinationTag`. (`tecDST_TAG_NEEDED`)
3. The `MPTokenIssuance`, or the sender's or destination's `MPToken` object, does not exist. (`tecOBJECT_NOT_FOUND`)
4. The issuance does not have the `lsfMPTCanTransfer` flag set. (`tecNO_AUTH`)
5. The issuance does not support confidential balance (`lsfMPTCanHoldConfidentialBalance` is not set). (`tecNO_PERMISSION`)
6. The issuance has a non-zero `TransferFee`. (`tecNO_PERMISSION`)
7. The issuance has no registered `IssuerEncryptionKey`. (`tecNO_PERMISSION`)
8. The issuance has `AuditorEncryptionKey` set but the transaction does not include `AuditorEncryptedAmount`, or the issuance has no auditor key but the transaction includes `AuditorEncryptedAmount`. (`tecNO_PERMISSION`)
9. One of the participating accounts lacks a registered ElGamal public key or the confidential fields required for its role: the sender needs `HolderEncryptionKey`, `ConfidentialBalanceSpending`, and `IssuerEncryptedBalance`; the destination needs `HolderEncryptionKey`, `ConfidentialBalanceInbox`, and `IssuerEncryptedBalance`. (`tecNO_PERMISSION`)
10. Either the sender's or receiver's balance is currently locked. (`tecLOCKED`)
11. The issuance requires authorization (`lsfMPTRequireAuth`) and either the sender's or the destination's `MPToken` is not authorized (`lsfMPTAuthorized` is not set). (`tecNO_AUTH`)
12. The provided Zero-Knowledge Proof fails to verify equality or range constraints. (`tecBAD_PROOF`)

##### 9.3.2.1. Authorization Failures

1. The destination account has Deposit Authorization enabled (`lsfDepositAuth`), and the sender is not preauthorized. (`tecNO_PERMISSION`)
2. The destination account requires credentials (via `DepositPreauth` with `AuthorizeCredentials`), but the transaction does not include valid matching credentials in the `CredentialIDs` field. (`tecNO_PERMISSION`)
3. A credential ID specified in `CredentialIDs` does not exist, does not belong to the sender, or is not accepted: (`tecBAD_CREDENTIALS`)
4. A credential in CredentialIDs is expired:
   - If deposit-preauth otherwise passes and doApply runs, cleanupExpiredCredentials deletes it and returns `tecEXPIRED`.
   - If deposit-preauth fails first because the credential issuer/type is not authorized, preclaim returns `tecNO_PERMISSION`, and cleanup does not run.

### 9.5. State Changes

If the transaction is successful:

- **Sender Balance**: The sender's `ConfidentialBalanceSpending` is homomorphically decremented by `SenderEncryptedAmount`.
- **Sender Versioning**: The sender's `ConfidentialBalanceVersion` is incremented by 1 to prevent stale-proof replay.
- **Receiver Balance**: The receiver's `ConfidentialBalanceInbox` is homomorphically incremented by the **re-randomized** `DestinationEncryptedAmount`.
- **Issuer Mirrors**: The sender's `IssuerEncryptedBalance` is homomorphically decremented by `IssuerEncryptedAmount`, and the receiver's `IssuerEncryptedBalance` is homomorphically incremented by the **re-randomized** `IssuerEncryptedAmount`.
- **Auditor Mirrors**: If the issuance has an auditor configured (`AuditorEncryptionKey` present), the sender's `AuditorEncryptedBalance` is homomorphically decremented by `AuditorEncryptedAmount`, and the receiver's `AuditorEncryptedBalance` is homomorphically incremented by the **re-randomized** `AuditorEncryptedAmount`.
- **Receiver Versioning**: The receiver's `ConfidentialBalanceVersion` is **not** modified. Incoming transfers land in the inbox and therefore cannot invalidate proofs bound to the receiver's spending balance.
- **Global Supply**: Plaintext supply fields (`OA` and `COA`) remain unchanged.

**Note on re-randomization:** "Re-randomized" means that, before a ciphertext is credited to the receiver, an encryption of **zero** under the same public key is homomorphically added to it. The randomness for that zero encryption is the first 32 bytes of the `ZKProof` field. Since the added ciphertext encrypts 0, the credited value is unchanged; and since the randomness is read directly from the transaction, every validator derives identical ledger state. Only the three credit-side ciphertexts are treated this way, the ciphertexts subtracted from the sender are applied exactly as submitted. This prevents an attacker from choosing transfer randomness that cancels against a target holder's existing ciphertexts (see §16.8).

### 9.6. Example JSON

```javascript
{
  "Account": "rSenderAccount...",
  "TransactionType": "ConfidentialMPTSend",
  "Destination": "rReceiverAccount...",
  "MPTokenIssuanceID": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864",
  "SenderEncryptedAmount": "AD3F...",
  "DestinationEncryptedAmount": "DF4E...",
  "BalanceCommitment": "038A...",
  "AmountCommitment": "049B...",
  "IssuerEncryptedAmount": "BC2E...",
  "CredentialIDs": ["DD40031C6C21164E7673...17D467CEEE9"],  // Optional: for credential-based authorization
  "ZKProof": "84af..."
}
```

Net effect: Public balances unchanged; confidential balance is redistributed (sender CB_S ↓, receiver CB_IN ↑). OA (plaintext) unchanged; COA (plaintext) unchanged.

## 10. Transaction: `ConfidentialMPTMergeInbox`

**Purpose:** Moves all funds from the inbox balance into the spending balance, then resets the inbox to a canonical encrypted zero (EncZero). This ensures that proofs reference only stable spending balances and prevents staleness from incoming transfers.

This transaction respects **authorization** and **lock** constraints, ensuring that unauthorized or locked holders cannot merge funds.

### 10.1 Use Cases

- A holder merges newly received confidential transfers into their spendable balance.
- An issuer-controlled dedicated account merges its own inbox into the spending balance, like any holder.
- Required periodically to combine funds before subsequent confidential sends.

### 10.2 Fields

| Field Name          | Required? | JSON Type | Internal Type | Default Value | Description                                                                |
| :------------------ | :-------- | :-------- | :------------ | :------------ | :------------------------------------------------------------------------- |
| `TransactionType`   | Yes       | `string`  | `UINT16`      | N/A           | Identifies this as a `ConfidentialMPTMergeInbox` transaction, which is 86. |
| `Account`           | Yes       | `string`  | `ACCOUNTID`   | N/A           | The account performing the merge.                                          |
| `MPTokenIssuanceID` | Yes       | `string`  | `UINT192`     | N/A           | The unique identifier for the MPT issuance.                                |

### 10.3. Transaction Fee

**Fee Structure:** Custom

This transaction requires 10 times the standard base fee because it performs homomorphic operations on the holder's, issuer's, and auditor's ciphertext balances. It carries no zero-knowledge proof, but pays the same fee as the other confidential MPT transactions.

### 10.4. Failure Conditions

#### 10.4.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled. (`temDISABLED`)
2. The account submitting the transaction is the **Issuer**. (`temMALFORMED`)

#### 10.4.2. Protocol-Level Failures

1. The `MPTokenIssuance` or the user's `MPToken` object does not exist. (`tecOBJECT_NOT_FOUND`)
2. The issuance does not have the `lsfMPTCanHoldConfidentialBalance` flag set. (`tecNO_PERMISSION`)
3. The user's `MPToken` object has not been initialized (missing `ConfidentialBalanceInbox`, `ConfidentialBalanceSpending`, or `HolderEncryptionKey`). (`tecNO_PERMISSION`)
4. The issuance requires authorization (`lsfMPTRequireAuth`) and the holder's `MPToken` is not authorized (`lsfMPTAuthorized` is not set). (`tecNO_AUTH`)
5. The holder's `MPToken` is **locked** at the individual level (the `lsfMPTLocked` flag is set on the `MPToken`). (`tecLOCKED`)
6. The entire token issuance is **locked** (the `lsfMPTLocked` flag is set on the `MPTokenIssuance`). (`tecLOCKED`)
7. A system invariant failure where the issuer attempts to merge. (`tefINTERNAL`)

### 10.5. State Changes

If the transaction is successful:

- **Update Spending Balance:** The current `ConfidentialBalanceInbox` is homomorphically **added** to `ConfidentialBalanceSpending`.
- **Reset Inbox:** The `ConfidentialBalanceInbox` is reset to a canonical **encrypted zero**. This ensures the account is ready to receive new transfers without arithmetic errors.
- **Increment Version:** The `ConfidentialBalanceVersion` is incremented by 1. If the version reaches the maximum 32-bit integer value, it wraps around to 0.
- **Mirrors Untouched:** `IssuerEncryptedBalance` and `AuditorEncryptedBalance` are not written. They mirror the holder's _total_ confidential balance, and this transaction only moves value between `CB_IN` and `CB_S`, so that total is unchanged.
- **No-op with encrypted zero:** If either or both of `ConfidentialBalanceInbox` and `ConfidentialBalanceSpending` already contain an encrypted zero at the time of the merge, the transaction is still valid and succeeds. The inbox (EncZero) is homomorphically added to the spending balance (leaving it unchanged), the inbox is reset to EncZero, and `ConfidentialBalanceVersion` is still incremented. This is a valid no-op: no value moves, but the version bump still occurs, allowing holders to advance their proof version without any pending inbound funds.

### 10.6. Example JSON

```json
{
  "Account": "rUserAccount...",
  "TransactionType": "ConfidentialMPTMergeInbox",
  "MPTokenIssuanceID": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864"
}
```

## 11. Transaction: `ConfidentialMPTConvertBack`

### 11.1 Purpose: Convert confidential into public MPT value.

- For a holder: restore public balance from CB_S.
- For an issuer-controlled dedicated account: return confidential supply to public form (credited to the dedicated account’s public balance).

### 11.2 Account Effects

- Confidential Supply (COA): Decreases (COA ↓).
- Total Supply (OA): Unchanged. (Tokens are converted to public form, not burned).
- Holder Public Balance: Increases.
- Holder Confidential Balance: Decreases.

### 11.3. Fields

| Field Name               | Required? | JSON Type | Internal Type | Default Value | Description                                                                                                                                                                                                                |
| :----------------------- | :-------- | :-------- | :------------ | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TransactionType`        | Yes       | `string`  | `UINT16`      | N/A           | Identifies this as a `ConfidentialMPTConvertBack`, which is 87.                                                                                                                                                            |
| `Account`                | Yes       | `string`  | `ACCOUNTID`   | N/A           | The account performing the conversion.                                                                                                                                                                                     |
| `MPTokenIssuanceID`      | Yes       | `string`  | `UINT192`     | N/A           | The unique identifier for the MPT issuance.                                                                                                                                                                                |
| `MPTAmount`              | Yes       | `number`  | `UINT64`      | N/A           | The plaintext amount to credit to the public balance.                                                                                                                                                                      |
| `HolderEncryptedAmount`  | Yes       | `string`  | `BLOB`        | N/A           | A 66-byte ciphertext to be subtracted from the holder's `ConfidentialBalanceSpending`.                                                                                                                                     |
| `IssuerEncryptedAmount`  | Yes       | `string`  | `BLOB`        | N/A           | A 66-byte ciphertext to be subtracted from the issuer's mirror balance.                                                                                                                                                    |
| `BlindingFactor`         | Yes       | `string`  | `UINT256`     | N/A           | The scalar value used to encrypt the amount. Used by validators to verify the ciphertexts match the plaintext `MPTAmount`. Its length is fixed at 32 bytes by the `UINT256` encoding, so no separate length check applies. |
| `AuditorEncryptedAmount` | No        | `string`  | `BLOB`        | N/A           | A 66-byte ciphertext for the auditor. **Required** if `AuditorEncryptionKey` is present on the issuance.                                                                                                                   |
| `BalanceCommitment`      | Yes       | `string`  | `BLOB`        | N/A           | A 33-byte cryptographic commitment to the user's confidential spending balance.                                                                                                                                            |
| `ZKProof`                | Yes       | `string`  | `BLOB`        | N/A           | An 816-byte bundle containing a **compact sigma proof** (128 bytes, proving balance ownership and key linkage) and a **single Bulletproof range proof** (688 bytes, proving the remaining balance is non-negative).        |

### 11.4. Transaction Fee

**Fee Structure:** Custom

This transaction requires 10 times the standard base fee because zero-knowledge proof verification costs validators significantly more than processing a public MPT transaction.

### 11.5. Failure Conditions

#### 11.5.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled. (`temDISABLED`)
2. The account submitting the transaction is the Issuer. (`temMALFORMED`)
3. Ciphertext lengths or formats are invalid. (`temBAD_CIPHERTEXT`)
4. `MPTAmount` is zero or greater than the maximum allowable supply. (`temBAD_AMOUNT`)
5. The `BalanceCommitment` is not a valid 33-byte compressed elliptic curve point. (`temMALFORMED`)
6. The `ZKProof` is not exactly 816 bytes. (`temMALFORMED`)

#### 11.5.2. Protocol-Level Failures

1. The `MPToken` or `MPTokenIssuance` does not exist. (`tecOBJECT_NOT_FOUND`)
2. The issuance does not have the `lsfMPTCanHoldConfidentialBalance` flag set, or has no registered `IssuerEncryptionKey`. (`tecNO_PERMISSION`)
3. The user's `MPToken` is missing the `ConfidentialBalanceSpending`, `HolderEncryptionKey`, or `IssuerEncryptedBalance` fields. (`tecNO_PERMISSION`)
4. The issuance has `AuditorEncryptionKey` set but the transaction does not include `AuditorEncryptedAmount`, or the issuance has no auditor key but the transaction includes `AuditorEncryptedAmount`. (`tecNO_PERMISSION`)
5. The global `ConfidentialOutstandingAmount` is less than the requested `MPTAmount`. (`tecINSUFFICIENT_FUNDS`)
6. The holder's `MPToken` is locked, or the entire issuance is locked. (`tecLOCKED`)
7. The issuance requires authorization (`lsfMPTRequireAuth`) and the holder's `MPToken` is not authorized (`lsfMPTAuthorized` is not set). (`tecNO_AUTH`)
8. The `BlindingFactor` fails to verify the integrity of the ciphertexts. (`tecBAD_PROOF`)
9. The `ZKProof` fails the **compact sigma proof** check. (`tecBAD_PROOF`)
10. The `ZKProof` fails the **Bulletproof range proof** check. (`tecBAD_PROOF`)

### 11.6. State Changes

If the transaction is successful:

- **Public Balance:** The user's `MPTAmount` is increased by `MPTAmount`.
- **Global Supply:** The `ConfidentialOutstandingAmount` on the issuance is decreased by `MPTAmount`.
- **Spending Balance:** The `ConfidentialBalanceSpending` is updated via **homomorphic subtraction** of `HolderEncryptedAmount`.
- **Issuer Mirror:** The `IssuerEncryptedBalance` is updated via **homomorphic subtraction** of `IssuerEncryptedAmount`.
- **Auditor Mirror:** If the issuance has an auditor configured (`AuditorEncryptionKey` present), the `AuditorEncryptedBalance` is updated via **homomorphic subtraction** of `AuditorEncryptedAmount`.
- **Version:** The `ConfidentialBalanceVersion` is incremented by 1.

### 11.7. Example JSON

```json
{
  "Account": "rUserAccount...",
  "TransactionType": "ConfidentialMPTConvertBack",
  "MPTokenIssuanceID": "610F33...",
  "MPTAmount": 500,
  "HolderEncryptedAmount": "AD3F...",
  "IssuerEncryptedAmount": "BC2E...",
  "AuditorEncryptedAmount": "C1A9...",
  "BlindingFactor": "12AB...",
  "BalanceCommitment": "038A...",
  "ZKProof": "ABCD..."
}
```

### 11.8. Edge Case Analysis (Low-Volume Transaction Flow):

\*\* Alice, the issuer, funds her dedicated account with 50 ConfidentialMPT publicly, the dedicated account converts to confidential, performs a single confidential send of 20 to Bob (a holder), and then executes a ConvertBack of 30\.

Step 1. Issuer funds dedicated account, dedicated account converts (50\)

- Publicly revealed: Amount \= 50\.
- Ledger effect: OA ↑ 50, COA ↑ 50, IPB ↓ 50\.
- Outsiders now know: 50 CMPT entered confidential circulation.

Step 2. Confidential Send (Alice’s dedicated account → Bob, amount 20\)

- Public sees: sender \= Alice’s dedicated account, receiver \= Bob, ciphertexts, ZKPs.
- Amount 20 is hidden.
- Ledger effect: OA, COA, IPB unchanged (just redistribution).

Step 3. _ConvertBack_ (Alice’s dedicated account, 30\)

- Publicly revealed: Amount \= 30\.
- Ledger effect: OA unchanged, COA ↓ 30, IPB ↑ 30
- Alice’s confidential balance is now 0, but outsiders cannot know this since ElGamal ciphertexts for 0 look indistinguishable from nonzero.

### 11.8.1 What Outsiders can Infer:

- Net change in the confidential pool is 50  −  30  = 20\. So, 20 CMPT remain somewhere in confidential circulation.
- But they cannot know whether Bob got 20, 15, 5, or even 0 — because Alice’s dedicated account may still hold some of the 20\.

### 11.8.2 Why no exact leakage:

- ElGamal ciphertexts are randomized: encrypting 0 produces a different-looking ciphertext each time.
- Outsiders cannot look at the dedicated account’s balance ciphertext and say it is zero.
- Thus, they cannot deduce whether Alice’s dedicated account was emptied or kept some confidential balance.

**Note:** This design allows tokens to move between public and private states. While the Convert and ConvertBack transactions show their amounts to provide this flexibility, they still protect the privacy of individual balances and transfers. Observers can only see the total change in circulation, not how the private supply is shared among holders. ElGamal randomization makes it impossible to tell the difference between accounts with zero balances. This ensures that outsiders cannot know if a specific account is empty or still holds private tokens.

## 12. Transaction: `ConfidentialMPTClawback`

Clawback involves the issuer forcibly reclaiming funds from a holder's account. This action is fundamentally incompatible with standard confidential transfers, as the issuer does not possess the holder's private ElGamal key and therefore cannot generate the required ZKPs for a normal ConfidentialMPTSend. To solve this, the protocol introduces a single and privileged transaction that allows an issuer to verifiably reclaim funds in one uninterruptible step.

This issuer-only transaction is designed to forcibly burn a holder's entire confidential balance, permanently removing those tokens from circulation. Both `OutstandingAmount` (OA) and `ConfidentialOutstandingAmount` (COA) are reduced, effectively destroying the tokens rather than returning them to the issuer's reserve.

### 12.1 How the Clawback Process Works

1. Issuer Decrypts and Prepares: The issuer takes the `IssuerEncryptedBalance` ciphertext from the HolderToClawback's MPToken object and uses its own private key to decrypt it, revealing the holder's total confidential balance, m.
2. Issuer Submits Transaction: The issuer creates and signs a ConfidentialMPTClawback transaction, setting the `MPTAmount` field to m. It also generates and includes a compact Clawback sigma proof.
3. Validator Verification and Execution: Validators receive the transaction and perform a series of checks and state changes as a single:
   - Verification: They first confirm the transaction was signed by the token Issuer and that the ZKProof is valid. The proof provides cryptographic certainty that `MPTAmount` is the true value hidden in the holder's on-ledger ciphertext.
   - Ledger Changes: If the proof is valid, the validators execute all of the following changes at once:
     1. The `ConfidentialBalanceSpending` and `ConfidentialBalanceInbox` are set to a valid encryption of zero.
     2. The global `ConfidentialOutstandingAmount` (COA) is decreased by `MPTAmount`.
     3. The global `OutstandingAmount` (OA) is decreased by `MPTAmount`, burning the clawed-back tokens. The funds are permanently removed from circulation and are **not** credited to any account.

**Note**: We recommend locking the MPT before clawing back. This prevents the holder from sending any more mpt transactions while the clawback is in progress.

### 12.2. Fields

| Field Name          | Required? | JSON Type | Internal Type | Default Value | Description                                                                                                                           |
| :------------------ | :-------- | :-------- | :------------ | :------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| `TransactionType`   | Yes       | `string`  | `UINT16`      | N/A           | Identifies this as a `ConfidentialMPTClawback` transaction, which is 89.                                                              |
| `Account`           | Yes       | `string`  | `ACCOUNTID`   | N/A           | The **Issuer** account sending the transaction.                                                                                       |
| `Holder`            | Yes       | `string`  | `ACCOUNTID`   | N/A           | The account from which funds are being clawed back.                                                                                   |
| `MPTokenIssuanceID` | Yes       | `string`  | `UINT192`     | N/A           | The unique identifier for the MPT issuance.                                                                                           |
| `MPTAmount`         | Yes       | `number`  | `UINT64`      | N/A           | The plaintext total amount being removed.                                                                                             |
| `ZKProof`           | Yes       | `string`  | `BLOB`        | N/A           | A 64-byte **AND-composed compact Clawback sigma proof** proving that the `IssuerEncryptedBalance` encrypts the plaintext `MPTAmount`. |

This single transaction securely and verifiably burns the holder's confidential balance, removing the tokens from circulation without crediting them to any account, while ensuring the integrity of the ledger's public accounting is perfectly maintained.

### 12.3. Transaction Fee

**Fee Structure:** Custom

This transaction requires 10 times the standard base fee because zero-knowledge proof verification costs validators significantly more than processing a public MPT transaction.

### 12.4. Failure Conditions

#### 12.4.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled. (`temDISABLED`)
2. The `Account` is not the issuer of the `MPTokenIssuanceID`. (`temMALFORMED`)
3. The `Account` is attempting to claw back from itself (`Account` == `Holder`). (`temMALFORMED`)
4. The `ZKProof` is not exactly 64 bytes. (`temMALFORMED`)
5. `MPTAmount` is zero or exceeds the maximum limits. (`temBAD_AMOUNT`)

#### 12.4.2. Protocol-Level Failures

1. The `Holder` account does not exist. (`tecNO_TARGET`)
2. The `MPTokenIssuance` or the holder's `MPToken` object does not exist. (`tecOBJECT_NOT_FOUND`)
3. The issuance does not have the `lsfMPTCanClawback` flag set. (`tecNO_PERMISSION`)
4. The issuance is missing the `IssuerEncryptionKey`. (`tecNO_PERMISSION`)
5. The issuance does not have the `lsfMPTCanHoldConfidentialBalance` flag set. (`tecNO_PERMISSION`)
6. The holder's `MPToken` is missing the `IssuerEncryptedBalance`. (`tecNO_PERMISSION`)
7. The holder's `MPToken` is missing the `HolderEncryptionKey`. (`tecNO_PERMISSION`)
8. The `MPTAmount` exceeds the global `ConfidentialOutstandingAmount`, or exceeds the global `OutstandingAmount`. (`tecINSUFFICIENT_FUNDS`)
9. The ZKP fails to prove that the `IssuerEncryptedBalance` (the mirror balance) encrypts the plaintext `MPTAmount`. (`tecBAD_PROOF`)

### 12.5. State Changes

If the transaction is successful, the holder's confidential state is reset, and the tokens are removed from the total supply:

- **Holder State Reset:**
  - `ConfidentialBalanceInbox` is set to **Encrypted Zero**.
  - `ConfidentialBalanceSpending` is set to **Encrypted Zero**.
  - `IssuerEncryptedBalance` is set to **Encrypted Zero**.
  - `AuditorEncryptedBalance` (if present) is set to **Encrypted Zero** (using the Auditor's public key).
  - `ConfidentialBalanceVersion` is **incremented by 1**.
- **Supply Reduction:**
  - The global `ConfidentialOutstandingAmount` (COA) is decreased by `MPTAmount`.
  - The global `OutstandingAmount` (OA) is decreased by `MPTAmount`.

### 12.6. Example JSON

```json
{
  "Account": "rIssuerAccount...",
  "TransactionType": "ConfidentialMPTClawback",
  "Holder": "rMaliciousHolder...",
  "MPTokenIssuanceID": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864",
  "MPTAmount": 1000,
  "ZKProof": "a1b2..."
}
```

## 13. Transaction: `MPTokenIssuanceSet`

The existing `MPTokenIssuanceSet` transaction is extended to manage the confidential lifecycle of an MPT issuance. This includes enabling confidential balance status and registering encryption keys.

### 13.1. Usage & Mutability

This transaction is the only method to register keys or enable the confidential balance status (via the `Flags` field with the `tfMPTSetCanHoldConfidentialBalance` bit flag) of an issuance. However, these actions are subject to strict state constraints to prevent funds from becoming locked or un-auditable.

**Key Registration:** Encryption keys (`IssuerEncryptionKey` and `AuditorEncryptionKey`) can be set in the same transaction that enables the `lsfMPTCanHoldConfidentialBalance` flag using `tfMPTSetCanHoldConfidentialBalance`, allowing issuers to enable confidential transfers and register keys in a single atomic operation.

### 13.2. Fields

The following fields are introduced by this extension to support encryption key registration on the `MPTokenIssuance` object:

| Field Name             | Required? | JSON Type | Internal Type | Description                                                                      |
| :--------------------- | :-------- | :-------- | :------------ | :------------------------------------------------------------------------------- |
| `IssuerEncryptionKey`  | No        | `string`  | `BLOB`        | The 33-byte EC-ElGamal public key used for the issuer's mirror balances.         |
| `AuditorEncryptionKey` | No        | `string`  | `BLOB`        | The 33-byte EC-ElGamal public key used for regulatory oversight (if applicable). |

The following existing field is extended with a new bit flag to support enabling the confidential balance feature post-issuance:

| Field Name       | Required? | JSON Type | Internal Type | Description                                                                                |
| :--------------- | :-------- | :-------- | :------------ | :----------------------------------------------------------------------------------------- |
| `ImmutableFlags` | No        | `number`  | `UINT32`      | Indicates which fields or flags of this token issuance can NOT be modified after creation. |

### 13.3. Flags

The following bit flag is added to the `Flags` field to enable the confidential balance feature:

| Flag Name                            | Hex Value    | Decimal Value | Description                                                                                                                              |
| :----------------------------------- | :----------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `tfMPTSetCanHoldConfidentialBalance` | `0x00000100` | 256           | Sets the `lsfMPTCanHoldConfidentialBalance` flag on the `MPTokenIssuance`. Only valid if `lsifMPTCanHoldConfidentialBalance` is not set. |

**Usage Notes:**

- These flags can only be used if the `lsifMPTCanHoldConfidentialBalance` flag was **not** set under `ImmutableFlags` during `MPTokenIssuanceCreate`.
- Setting `tfMPTSetCanHoldConfidentialBalance` enables confidential transfers for the token.
- Enabling confidential transfers is one-way: there is no flag to clear `lsfMPTCanHoldConfidentialBalance` once it has been set.

### 13.4. Failure Conditions

#### 13.4.1. Data Verification

1. The `ConfidentialTransfer` feature is not enabled and the transaction supplies `IssuerEncryptionKey` or `AuditorEncryptionKey`, sets `tfMPTSetCanHoldConfidentialBalance`, or sets `lsifMPTCanHoldConfidentialBalance` in `ImmutableFlags`. (`temDISABLED`)
2. The provided Public Key is not a valid 33-byte (`ecPubKeyLength`) compressed elliptic curve point. (`temMALFORMED`)
3. The transaction attempts to mutate confidential amount fields while also acting as a Holder, that is, it includes `Holder` together with `IssuerEncryptionKey`, `AuditorEncryptionKey`, or `tfMPTSetCanHoldConfidentialBalance`. (`temMALFORMED`)
4. The transaction contains `AuditorEncryptionKey` but does **not** contain `IssuerEncryptionKey`. (`temMALFORMED`)
5. The transaction sets `tfMPTSetCanHoldConfidentialBalance` or `lsifMPTCanHoldConfidentialBalance` while the `DynamicMPT` amendment is not enabled. (`temDISABLED`)
6. The transaction sets a non-zero `TransferFee` and `tfMPTSetCanHoldConfidentialBalance` in the same transaction (see §6.4). (`temBAD_TRANSFER_FEE`)

#### 13.4.2. Protocol-Level Failures

1. The transaction attempts to use `tfMPTSetCanHoldConfidentialBalance`, but the `lsifMPTCanHoldConfidentialBalance` flag is set in `ImmutableFlags`. (`tecNO_PERMISSION`)
2. The transaction provides a `IssuerEncryptionKey` (or Auditor Key), but the issuance object **already** has one. (`tecNO_PERMISSION`)
3. The transaction provides a `IssuerEncryptionKey` or `AuditorEncryptionKey`, but the issuance does not have the `lsfMPTCanHoldConfidentialBalance` flag enabled.
   - **Exception:** Keys can be set if the `lsfMPTCanHoldConfidentialBalance` flag is being enabled in the same transaction via `tfMPTSetCanHoldConfidentialBalance`. (`tecNO_PERMISSION`)
4. The transaction attempts to upload keys or set `tfMPTSetCanHoldConfidentialBalance`, but `ConfidentialOutstandingAmount` is greater than zero (tokens are already in confidential circulation). (`tecNO_PERMISSION`)
5. The `MPTokenIssuance` does not exist. (`tecOBJECT_NOT_FOUND`)
6. The transaction sets a non-zero `TransferFee` while the issuance already has `lsfMPTCanHoldConfidentialBalance`, or sets `tfMPTSetCanHoldConfidentialBalance` while the issuance already has a non-zero `TransferFee` (see §6.4). (`tecNO_PERMISSION`)

### 13.5. State Changes

If successful:

- **Flags:** The `lsfMPTCanHoldConfidentialBalance` flag is updated (if mutable).
- **Keys:** The `IssuerEncryptionKey` and/or `AuditorEncryptionKey` are stored on the `MPTokenIssuance` ledger entry.

### 13.6. Example JSON

#### 13.6.1. Enabling Confidential Balance Feature

```json
{
  "Account": "rIssuerAccount...",
  "TransactionType": "MPTokenIssuanceSet",
  "MPTokenIssuanceID": "610F33...",
  "Flags": 256, // tfMPTSetCanHoldConfidentialBalance
  "IssuerEncryptionKey": "028d...",
  "AuditorEncryptionKey": "037c..."
}
```

This transaction enables the confidential balance feature by setting the `tfMPTSetCanHoldConfidentialBalance` bit flag in the `Flags` field, and simultaneously registers the encryption keys in the same atomic operation. This demonstrates that keys can be set when the `lsfMPTCanHoldConfidentialBalance` flag is being enabled in the same transaction.

## 14. Rationale

This section records why the design looks the way it does, which alternatives were considered, and which trade-offs were accepted. The normative rules themselves are in §6 through §13.

### 14.1. Issuer Participation Through a Dedicated Account

Under XLS-33, issuers don't hold MPTokens directly on their issuance object—OutstandingAmount only tracks tokens held by ordinary accounts. Changing OutstandingAmount to include issuer holdings would break accounting for existing MPTs, while tracking issuer holdings separately would destroy the safety check anchoring encrypted supply to plaintext supply. Instead, the issuer simply uses a dedicated holder account (§5.1), allowing its balance to be tracked in OutstandingAmount like any other user's.

### 14.2. Parallel Ciphertexts for the Issuer and Auditor

A confidential balance is stored as parallel ciphertexts of the same value under the holder's key, the issuer's key, and optionally an auditor's key (§5.3). Encrypting only under the holder's key would leave the issuer unable to verify its own supply and would leave no compliance path short of voluntary disclosure by each holder. Compact sigma proofs bind the parallel ciphertexts to a single hidden value, so a holder cannot present different amounts to different readers.

### 14.3. Amounts Are Revealed on Conversion

`ConfidentialMPTConvert` and `ConfidentialMPTConvertBack` disclose their amounts in plaintext, unlike `ConfidentialMPTSend`. Hiding them would require proving in zero knowledge that the public balance change matches the confidential one, and would force `OutstandingAmount` and `ConfidentialOutstandingAmount` to be tracked as ciphertexts. Keeping both totals in plaintext is what makes the supply invariants in §6.6 checkable at all. §11.8 works through the resulting leakage for a low-volume flow.

### 14.4. Incompatibility with Percentage Transfer Fees

XLS-33 transfer fees are based on a percentage of the amount being sent, but ConfidentialMPTSend intentionally hides that amount. To charge the fee correctly, you’d have to either reveal the transfer amount, trust the sender to report it honestly, or add a new zero-knowledge proof to verify the fee math.

Revealing the amount ruins privacy, and adding complex zero-knowledge proofs isn't worth the overhead for a feature issuers can just turn off. Because of this, an issuance cannot use both transfer fees and confidential transfers (§6.4).

### 14.5. A Flat Fee Multiplier

Every confidential transaction pays 10 times the standard base fee. Pricing each transaction type in proportion to its actual verification cost was considered and rejected as unnecessary complexity, with the consequence that `ConfidentialMPTMergeInbox`, which carries no proof at all, pays the same multiplier as `ConfidentialMPTSend`.

### 14.6. Proof System

An earlier version of this design used separate equality and range proofs in each transaction. Those were replaced by a single compact sigma proof per transaction type, which bundles the statements into a fixed-size blob verified in one pass and reduced the `ConfidentialMPTSend` sigma component from roughly 619 bytes to 192 bytes (§A.11). Range proofs use Bulletproofs, aggregated where a transaction must prove more than one range; their verification remains the dominant cost (§17.2).

The scheme is EC-ElGamal over secp256k1 and is not quantum-safe. Migration to a post-quantum construction is an open research area (§A.13).

## 15. Operational Considerations

Issuers must choose between enabling transfer fees and enabling confidential transfers — these two features are mutually exclusive on the same `MPTokenIssuance`. `ConfidentialMPTSend` will fail with `tecNO_PERMISSION` if the issuance has a non-zero `TransferFee`.

## 16. Security Considerations

Confidential MPTs introduce cryptographic mechanisms that require careful validation and enforcement. This section summarizes key privacy guarantees, auditability mechanisms, proof requirements, and considerations against potential attack vectors.

### 16.1 Privacy Properties

Confidential MPT transactions are designed to minimize information leakage while preserving verifiability of supply and balances. Validators and external observers see only ciphertexts and ZKPs and never learn the underlying amounts except where amounts are already revealed in XLS-33 semantics.

#### 16.1.1 Publicly Visible Information

- Transaction type (ConfidentialMPTConvert, ConfidentialMPTSend, etc.).
- Involved accounts (Account, Issuer, Destination).
- MPTokenIssuanceID.
- Ciphertexts (ElGamal pairs under holder, issuer, optional auditor keys).
- ZKPs (non-interactive proofs of correctness).
- For issuer funding (issuer sends public MPT to dedicated account, which then converts): Amount is revealed, consistent with visible mint events in XLS-33.
- Whether a stored ciphertext is a canonical encrypted zero. Because that value is deterministic, anyone can compare a stored ciphertext against the known encrypted zero for that account; if they match, the balance is known to be exactly 0. This applies to a newly initialized spending balance and to a reset inbox. Non-zero ciphertexts remain opaque.

Note: `tecBAD_PROOF` and the other `tec` codes named in this specification are applied to the ledger: the fee is charged and the transaction is recorded in full, ciphertexts included, even though no confidential balance changed. A submitter can set `fail_hard` when submitting to request that the receiving node discard a locally failing `tec` result instead of applying it, and that node will not relay, queue, or apply the transaction; this does not prevent the transaction from being recorded if it is submitted to (or relayed by) another node. This only takes effect when the transaction already fails at that node, so it does not cover a proof that verifies on submission and fails later against changed ledger state.

#### 16.1.2 Hidden Information

- Amounts moved in ConfidentialMPTSend, ConfidentialMPTMergeInbox.
- Holder balances (except their public balance field).
- Distribution of confidential supply across holders.

#### 16.1.3 Transaction-Type Privacy Notes

- Convert (holder):
  - Public → Confidential: Amount is revealed once, but only as a conversion event.
  - Thereafter, spending is hidden.
  - OA unchanged, COA ↑.
- Send:
  - No amounts revealed.
  - OA unchanged, COA unchanged.
- Merge:
  - No amounts revealed.
  - OA unchanged, COA unchanged.
- Convert back:
  - Amount revealed.
  - OA unchanged, COA ↓.

### 16.2 Auditability & Compliance

The Confidential MPT model is designed to provide robust privacy for individual transactions while ensuring both the integrity of the total token supply and a high degree of flexibility for regulatory compliance and auditing.

#### 16.2.1 On-Chain Selective Disclosure

On-chain selective disclosure provides cryptographically enforced auditability directly on the ledger.

- Auditor-Specific Encryption: When an auditor is set, each confidential balance is dually encrypted under the designated auditor's public key and stored in the AuditorEncryptedBalance field on the ledger.
- Independent Verification: This allows the auditor to use their own private key to independently decrypt and verify any holder's balance at any time, without needing cooperation from the issuer or the holder.
- Adding or Replacing an Auditor After Issuance: This is not possible with this amendment. [XLS-99 Confidential MPT Key Rotation](../XLS-0099-confidential-mpt-key-rotation/README.md) addresses this.

#### 16.2.2 Foundational Elements for Public Integrity

This model is built upon foundational elements that ensure the integrity of the total token supply remains publicly verifiable at all times.

- Issuer Ciphertexts (`IssuerEncryptedBalance`): Every confidential balance is dually encrypted under the issuer's public key. This allows the issuer to monitor aggregate confidential circulation and reconcile it with public issuance.
- Confidential Outstanding Amount (COA): This plaintext field on the ledger tracks the aggregate total of all non-issuer confidential balances. It provides a global, public view of the confidential supply, allowing any observer to validate the system's most important invariant: OutstandingAmount ≤ MaximumAmount.

#### 16.2.3 Example Audit Flows

- Public Supply Audit (No Keys Required)
  1. An observer reads the public ledger fields: OA, COA, and MA.
  2. They validate the invariant OA ≤ MA.
  3. They can conclude that the total supply is within its defined limits without seeing any individual balances.
- Selective Disclosure Audit (Auditor Uses Own Key)
  1. A regulator is designated as an auditor under the on-chain policy.
  2. The auditor fetches a holder’s ledger object and uses their own private key to decrypt the `AuditorEncryptedBalance` field, revealing the holder's confidential balance.
  3. This balance can be cross-checked against the global COA for consistency.

### 16.3 Proof Requirements

Every confidential transaction must carry appropriate ZKPs:

- Convert: Deterministic ElGamal verification using the disclosed
  blinding factor. If a new holder key is registered, a Schnorr
  Proof of Knowledge is required.
- Send: compact sigma proof (ciphertext consistency, amount linkage, and balance linkage) and aggregated range proof (transfer amount and remaining balance are non-negative).
- Optional auditor keys: The auditor ciphertext is covered by the same compact sigma proof; no separate proof is required.

### 16.4 Confidential Balance Consistency

- Each confidential balance entry maintains parallel ciphertexts:
- Holder key (spendable balance).
- Issuer key.
- Auditor key(s), if enabled.
- Validators require a proof that all ciphertexts encrypt the same plaintext, preventing divergence between views.

### 16.5 Dedicated Account Model

- The issuer account cannot hold or convert to confidential balances. Issuers who wish to participate in confidential circulation may optionally use a dedicated holder account (Confidential Vault), which is treated as a standard non-issuer holder of its own MPT issuance.
- Prevents redefinition of OA semantics and keeps compatibility with XLS-33.
- Validators enforce that `ConfidentialMPTConvert` from the issuer account is invalid.

### 16.6 Privacy Guarantees

- Transaction amounts are hidden in all confidential transfers except:
  - Issuer mint events (already visible in legacy MPTs).
  - Conversion from public → confidential, where only the converted amount is disclosed once.
- Redistribution among holders (including any issuer-controlled dedicated account) leaks no amounts.

### 16.7 Auditor & Compliance Controls

- If auditor is set, ciphertexts under auditor keys are validated by the compact sigma proof alongside holder, issuer, and other recipient ciphertexts.
- Prevents issuers from selectively encrypting incorrect balances for auditors.
- Selective disclosure allows compliance without undermining public confidentiality.

### 16.8 Attack Surface & Mitigations

- Replay attacks: Transactions bound to unique ledger indices/versions; proofs must include domain separation.
- Malformed ciphertexts: Validators reject invalid EC points.
- Balance underflow: Range proofs prevent spending more than available.
- Ciphertext cancellation: Homomorphic addition adds the ciphertexts' randomness, so ciphertexts with randomness `r` and `−r` sum to the point at infinity, which is not representable and makes the update fail. Because the canonical encrypted zero is deterministic, its randomness is publicly computable, so an attacker free to choose the transfer randomness could cancel it against a target holder's existing ciphertexts and permanently break their `ConfidentialMPTMergeInbox` or auditor-balance update. Any holder of the issuance can attempt this with an unsolicited, arbitrarily small transfer, since incoming confidential transfers cannot be refused. Mitigated by re-randomizing the credit-side ciphertexts (§9.5) with the proof's Fiat–Shamir challenge, which the attacker cannot steer.
- Auditor collusion: An auditor sees balances only if the issuer has registered that auditor's public key as `AuditorEncryptionKey` field, and only by decrypting `AuditorEncryptedBalance` with the auditor's own private key; public supply integrity remains trustless regardless.
- Issuer misbehavior: Enforced by supply invariants and public COA/OA/MA checks.

## 17. Analysis of Transaction Cost and Performance

The efficiency of Confidential MPT transactions is critical to their practical deployment within XRPL’s performance constraints. This section analyzes the cryptographic payload size and verification cost of the ConfidentialMPTSend transaction, which represents the most complex confidential operation in the protocol.

We assume the common configuration where the transfer amount is encrypted under four public keys (sender, receiver, issuer mirror, auditor mirror), hence Nciphers = 4 throughout this section. All estimates assume secp256k1, 32-byte scalars, compressed curve points of 33 bytes, and EC–ElGamal ciphertexts of 66 bytes. The cryptographic payload consists of ElGamal ciphertexts, two Pedersen commitments, a compact sigma proof binding all ciphertexts under a single Fiat-Shamir challenge, and an aggregated Bulletproof enforcing range constraints.

### 17.1 Cryptographic Payload Structure (Nciphers = 4)

Each EC–ElGamal ciphertext contains two compressed curve points, giving 66 bytes per ciphertext and 4 × 66 = 264 bytes in total. Two Pedersen commitments are included, one for the transfer amount m and one for the balance b, contributing 2 × 33 = 66 bytes. The compact sigma proof (`ZKProof` prefix) is a fixed 192 bytes regardless of recipient count, replacing the legacy shared-randomness equality proof. An aggregated Bulletproof proves that both the transfer amount and the post-spend remainder lie in [0, 2^64), though transactors cap accepted amounts at `maxMPTokenAmount` (2^63 − 1); for two aggregated 64-bit values, the proof size is 754 bytes. The `ZKProof` field therefore carries 192 + 754 = 946 bytes total. Combining all components:

Total crypto size = 264 bytes (ciphertexts) + 66 bytes (Pedersen commitments) + 946 bytes (ZKProof: 192-byte compact sigma proof + 754 aggregated Bulletproof)
= 1276 bytes (with auditor). Without auditor (Nciphers = 3): 198 + 66 + 946 = 1210 bytes. Ledger metadata and transaction headers are excluded from this estimate, as the goal is to isolate the cryptographic overhead.

### 17.2 Computational Complexity

For `ConfidentialMPTSend`, the dominant cost is verification of the aggregated Bulletproof, whose work grows linearly with the total bit length being proved: the verifier derives a scalar per bit and folds the generator vectors, both proportional to that length. `ConfidentialMPTConvertBack` carries a single Bulletproof over one 64-bit value rather than two, and behaves the same way. The remaining transaction types carry no range proof, and `ConfidentialMPTMergeInbox` carries no proof at all.

The compact sigma proof adds only a small overhead compared to Bulletproof verification: its size is fixed regardless of recipient count, and its verification is constant work apart from a few point operations per recipient ciphertext, of which there are three or four. Ledger execution following proof validation performs deterministic homomorphic ciphertext updates and version checks, which add negligible computational overhead relative to proof verification.

# Appendix

## Appendix A: FAQ

This section addresses common questions about Confidential MPTs and their design choices, ranging from basic functionality to advanced research topics.

### A.1 Can confidential and public balances coexist?

Yes, both issuers and holders may simultaneously maintain both public and confidential balances of the same MPT, fully supporting hybrid ecosystems with explicit conversions between the two using ConfidentialMPTConvert transactions.

### A.2 Why introduce a separate Merge transaction?

A separate Merge transaction is introduced because incoming transfers could cause proofs to become stale if all balances were in a single field, while split balances (CB_S and CB_IN) isolate proofs to a stable spending balance, allowing the Merge transaction to consolidate funds deterministically and update the version counter without requiring a proof, making it cheap to validate.

### A.3 What happens if a user forgets to merge their inbox?

If a user forgets to merge their inbox, incoming funds will accumulate in CB_IN, remaining safe but unable to be spent until they are consolidated into CB_S via a merge, therefore wallets are expected to perform this merge before a send if necessary.

### A.4 Can confidential transactions be used in DEX, escrow, or checks?

No, this version of confidential MPT extensions focuses solely on regular confidential MPT payments between accounts, as integration with XRPL’s DEX, escrow, or checks would require further research into how to represent offers or locked balances without revealing their amounts.

### A.5 How does compliance fit in?

Compliance is supported by storing each confidential balance as parallel ciphertexts under the holder’s key (CB_S/CB_IN), the issuer’s key (`IssuerEncryptedBalance`), and an optional auditor’s key (`AuditorEncryptedBalance`) if enabled, with ZKPs ensuring all ciphertexts encrypt the same value, allowing the public to verify supply limits via issuer ciphertexts and auditors to decrypt balances if permitted.

### A.6 What happens if a holder loses their ElGamal private key?

If a holder loses their ElGamal private key, they will be unable to decrypt or spend their confidential balances, which will remain valid on-ledger but are effectively locked and irrecoverable by that holder.

### A.7 What prevents replay or proof reuse?

Replay and proof reuse are prevented because all ZKPs are transcript-bound with domain separation, meaning the binding includes transaction type, issuer, currency, and version counters, so attempting to replay a proof in another context will result in a failed verification.

### A.8 Are confidential transactions more expensive than standard MPT transactions?

Yes, confidential transactions are more expensive than standard MPT transactions as they include extra ciphertexts and ZKPs, which increase both transaction size and verification cost, though efficiency remains a design goal with lightweight proofs and future aggregation possibilities.

### A.9 What happens if validators cannot verify a ZKP?

If validators cannot verify a ZKP, the transaction is rejected during consensus, functioning identically to an invalid signature and thus preventing malformed or incorrect confidential balances from entering the ledger.

### A.10 Why can't the issuer account hold confidential balances of its own MPT Issuance?

The issuer account has a special role on the ledger: its balance is excluded from `OutstandingAmount` to preserve the XLS-33 accounting invariant. Allowing the issuer to hold confidential balances directly would break this invariant, since COA and OA would need to account for the issuer's hidden balance. Instead, an issuer that wishes to participate in confidential circulation uses an optional dedicated holder account (Confidential Vault), which is treated as a standard non-issuer holder. Its confidential balance is included in both OA and COA, keeping all accounting consistent and validators able to enforce `OA ≤ MaximumAmount` without decryption. (See §14.1 for the full rationale.)

### A.11 Will proofs be optimized in future versions?

The original design employed separate range and equality proofs for each transaction. This has been superseded by the compact sigma proof construction, which replaces the separate sigma proofs with a single fixed-size proof per transaction type, reducing the `ConfidentialMPTSend` sigma component from ~619 bytes to 192 bytes (a 27% reduction in total transaction size). Further optimizations to range proof aggregation or batched verification may be explored in future versions. (See §14.6 for the full rationale.)

### A.12 Can there be more than one auditor?

At present, the protocol supports only a single optional auditor. Future extensions could explore multi-auditor setups, potentially leveraging advanced cryptographic techniques such as threshold encryption or more sophisticated policy-driven key distribution mechanisms.

### A.13 Is the system quantum-safe?

Today's design relies on EC-ElGamal over secp256k1, which is not considered quantum-safe. The long-term plan includes migrating to post-quantum friendly schemes, such as those based on lattice cryptography. The specific migration path and timeline for achieving quantum resistance remain an open area of research.

### A.14 Why require explicit Merge instead of eliminating it in future?

The explicit MergeInbox transaction is currently required because it deterministically solves the issue of "staleness," ensuring that all received funds are consolidated before spending. While issuers and wallets might prefer less operational overhead, the current design offers clear, verifiable guarantees. Future designs may revisit whether we can eliminate this explicit merge requirement.

# Acknowledgements

We would like to thank David Schwartz, Ayo Akinyele, Kenny Lei, Shashwat Mittal, Shawn Xie, Yinyi Qian, and Peter Chen for their invaluable feedback and insightful discussions which improved this specification.

````
