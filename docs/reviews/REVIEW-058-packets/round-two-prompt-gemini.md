DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to read files, run commands or browse.

# REVIEW-058 round two, leg B — the fixes to round one, before any code

You reviewed `ADR-0004` revision 1 in round one. Your report is included below,
whole. The author has fixed what was upheld and written revision 2, an
adjudication (`REVIEW-058c`) ruling on every finding from three legs, and two
register rows. **Your subject now is those fixes.** In this project the second
round exists because fixing something and describing the fix are separate acts
with separate failure modes: the most common defect is a fix applied at the line a
finding cited while a copy of the same sentence stands elsewhere. Agreement is not
useful. A finding that a fix holds is useful only if you tried to break it and say
how.

One correction you made in round one is recorded: your packet said the ADR
recommended option B for D-H3, and you were right that it recommended A. The
adjudication records that as a defect in the packet, not in your review.

Each file below is complete unless its header says otherwise. You have no access
to the repository, so where your answer depends on something not shown, say so.

## Answer all five questions, each with an explicit verdict

List findings as `B2-n | HIGH/MEDIUM/LOW | claim | the passage you rely on,
quoted briefly with its file | the smallest fix`. If a question has no finding,
write `Question N: no findings` and say what you tried. Grade HIGH only for
something that would publish a false statement of fact, expose a secret or
private datum, give the hosted page a signing or decryption path, or leave a
round-one finding undischarged.

1. **Your own findings.** For each of B1-1 to B1-10 and your question 6 argument,
   read the adjudication's ruling and revision 2's text, and say whether the
   finding is discharged as you meant it. Where the adjudication regraded or
   narrowed a finding, say whether the reason given holds.
2. **The other legs' findings.** The adjudication's table also rules on leg A's
   R1-1 to R1-11 and the self leg's S-1 to S-8. From the adjudication and revision
   2 alone, find any whose stated fix does not appear in revision 2, or appears in
   a form weaker than the ruling promised.
3. **New sentences.** Revision 2, the adjudication and `CLAIMS.md` E-327 and E-328
   add many sentences. Find any that is false, overstated, internally
   inconsistent, or a count that does not match what it counts.
4. **The recommendation that moved.** D-H1 now recommends H3, prerendered pages,
   on your round-one argument. Did the author over-correct? Argue the strongest
   case that the move is wrong, then say whether it holds.
5. **The visitor-facing wording.** Read D-H2's revised two paragraphs as a
   visitor would. Is any sentence false, and is anything a visitor needs still
   missing?

## The stopping condition, copied word for word from the adjudication

> **no third round unless round two finds a fix that did not discharge its finding.**

Say explicitly, at the end, whether your findings meet that condition, and which
ones.

## Last

Name the single sentence in the changed documents you think is most likely to be
false.

---

# THE DOCUMENTS


## FILE: docs/decisions/ADR-0004-hosted-demo-trust-boundary.md (complete, at commit 629f216)

````
# ADR-0004 — The hosted demo's trust boundary

- **Status:** `Proposed`, **revision 2**, after `REVIEW-058` round one. Round two,
  on this revision's fixes, is owed and has not run. Nothing is built. The four
  decisions below are the project owner's.
- **Revision 2, 2026-10-19.** Round one ran three legs with differed packets and
  upheld findings from all three (`docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`,
  `CLAIMS.md` E-328). ⚠ **Its central sentence is retracted**: revision 1 said
  *"Trigger 5 fires only for what is put into the bundle on purpose, and the gate
  can enumerate that"*, and both external legs named it the sentence most likely
  to be false. It was. Visitors' requests are egress the bundle does not contain,
  and the repository leg showed a build input outside the source reaching the
  output. **D-H1's recommendation moves from H1 to H3.** Three defects round one
  found were in shipped code, not in this document, and are fixed: the facility's
  ledger reader accepted a "not found" answer from any ledger, and two pages of
  the local tier carried false sentences.
- **Date:** 2026-10-19
- **Context:** launch plan phase 2 step 1. Architecture §6 step 9 is the step; this
  is the decision record. Where the two disagree, §6 is the authority on scope and
  this document is the authority on why, as with `ADR-0003`.
- **Blocks:** phase 2 steps 3 to 5, the build and the deployment.
- **Decided by:** nobody yet. D-H1 to D-H4 are priced below with a recommendation
  each.

This ADR is written by the session that would implement it. `ADR-0003`'s first
revision was too, and its rotation retracted its central claim (`CLAIMS.md` E-230).
Revision 1 of this document repeated that shape, and its own rotation retracted
it. Read every recommendation here as the author's, and attack it accordingly.

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

**The hosted page is public by design, so step 8's loopback property does not
carry over to it.** Step 9's own falsifiers replace it. ⚠ Revision 1 said here
that step 8's falsifier *"has nothing to bind"*, which read as evading the
property rather than replacing it (`REVIEW-058` B1-5).

E-309 ruled the demo read-only: no hosted signer and no keys in the page. This
document asks the question the launch plan names first: **what does the hosted
tier serve that a public node does not, and what does it cause to be sent, and to
whom?** The second half was missing from revision 1.

## Measured on 2026-10-19

Everything in this table was measured on 2026-10-19, by the session that wrote this
document or by `REVIEW-058`'s repository leg where the row says so. Nothing is
carried from a previous session.

| # | What | How it was measured | Result |
|---|---|---|---|
| M1 | Public Devnet JSON-RPC and CORS | `curl` to `https://s.devnet.rippletest.net:51234/`: an `OPTIONS` preflight with `Origin` and `Access-Control-Request-Method: POST`, then a `POST` of `server_info` with `Origin`. Then a `fetch` of the same `POST` from a Chrome page at `https://example.com` | The preflight answered `400` with no `Access-Control-*` header. The `POST` answered `200` with no `Access-Control-Allow-Origin`. In Chrome the `fetch` failed with *"Failed to fetch"*. A browser page cannot read this endpoint |
| M2 | Public Devnet WebSocket and `Origin` | One page: Chrome at `https://example.com`, sending `server_info`. Two non-browser clients: Bun `WebSocket`s supplying an `Origin` header of `https://wconf-demo.vercel.app` and of `null` | All three answered `success`, `network_id` 2, `build_version` 3.4.1. ⚠ **One page was tested, on one origin.** The two Bun clients show the server did not refuse those header values; they are not pages on those origins. Revision 1 said *"a page on each origin tried"* (`REVIEW-058` R1-2) |
| M3 | The endpoint is a pool | Successive connections, by this session and by the repository leg | Lower bounds of `complete_ledgers` read 5,193,077, 5,193,077, 5,171,980 and 5,171,980 here, and 5,193,077, 5,642,942 and 5,171,980 for the leg. Successive connections reach servers holding different history. It says nothing about who operates them |
| M4 | The demo set still exists | `account_info` and `ledger_entry` for the four addresses in `web/api/demo-accounts.ts` and issuance `004625C9…FEE332CB25E8`; re-run by the leg | All four accounts and their `MPToken` entries exist at validated ledger 6,243,460, and again at 6,244,010 for the leg, each with a `HolderEncryptionKey`, a spending ciphertext and an issuer mirror. Devnet has not been reset since E-319 |
| M5 | The observer computation's dependencies | Read `tools/observer-harness.ts:51-53,82-83,100`; the repository leg bundled `web/api/observer.ts` for a browser and ran it | `canonicalEncZero` takes only public inputs and its libraries are plain JavaScript. ⚠ **It does not run in a browser as written**: its hex helpers call `Buffer`, a Node global, and the leg's browser bundle threw `TypeError`. Revision 1 said only *"needs no native code"* (`REVIEW-058` R1-1) |
| M6 | The ledger readers this repository already has | Read `facility/src/loopback.ts`, `tools/observer-harness.ts:55,152-153,237,247` and `signer/src/ledger.rs:922-965` | `loopback.ts`, which the local tier reuses, reads over JSON-RPC with `fetch`, which M1 rules out in a browser, and its remote-risk acceptance is an environment variable. The observer harness reads over WebSocket but asks for `"validated"` on each request rather than pinning one index. The Rust signer's reader checks the ledger on a "not found" answer and the type of every entry; `loopback.ts` did neither until this revision (M10) |
| M7 | Proof verifiers in the published WASM package | `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0`; the leg read the loader's export map | `wasm/mpt_crypto.mjs` references seven `_mpt_verify_*` symbols, `_mpt_verify_clawback_proof` among them. The typed API does not wrap them: `grep -n verify` over `dist/*.d.ts` returns nothing. The same WASM module also exports amount decryption |
| M8 | TanStack Start can emit a static build | Read `node_modules/@tanstack/start-plugin-core/dist/esm/schema.d.ts` at `@tanstack/react-start` 1.168.49 | The plugin schema has `spa` and `prerender` options. Whether the output runs with no server at all is not established by reading a schema, and is checked at build |
| M9 | What the issuer's mirror encrypts | `XRPL-Standards` `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, the latest commit on `master` to touch it, lines 52, 245 and 707 | `IssuerEncryptedBalance` encrypts *"the holder's **total** confidential balance (`CB_S` + `CB_IN`)"*. `ConfidentialOutstandingAmount` is the total held in confidential balances by non-issuers. The clawback `ZKProof` proves *"that the `IssuerEncryptedBalance` encrypts the plaintext `MPTAmount`"* |
| M10 | What a "not found" answer carries | `ledger_entry` for a valid account holding no `MPToken`, at a pinned index, and for ledger 100 | rippled 3.4.1 answered `entryNotFound` with `ledger_index`, `ledger_hash` and `validated: true` for the pinned index, and `lgrNotFound` for ledger 100. So a negative answer can be checked against the pinned ledger, and `loopback.ts` now does |
| M11 | A build input outside the source | The repository leg set `VITE_WCONF_WEB_PORT` to a canary value and built | Vite inlined the canary into the client bundle. A value from the build machine's environment reached the output without appearing in the source |

## The decision proposed: prerendered pages, no server of ours, no visitor egress but page loads

```
Owner's machine, at build time
  └── the existing JSON-RPC reader ──► public Devnet node   (one read per page, pinned)
        └── static pages, each naming its ledger index and date

Visitor's browser ── static files only ──► Vercel   (no functions, no middleware)
```

- **No server-side code of ours runs per request.** The deployment is static files.
  ⚠ Revision 1 said *"no code of ours"*, and the page's own script runs in every
  visitor's browser (`REVIEW-058` B1-10).
- **Every ledger value is a dated reading.** The build reads Devnet once per page,
  with the reader the local tier already uses, pinned to one validated index, and
  the page names that index and the date. Nothing refreshes it until the next
  build.
- **The visitor's browser sends nothing anywhere but Vercel.** The pages are fixed:
  one per demo account, with no input, so no lookup travels in a URL.
- **The capability matrix, the custody simulation and the wallet page are static.**
  They are functions of this repository's own text (`web/api/capability.ts`,
  `web/api/custody-sim.ts`).
- **The issuer view is D-H3**, an owner decision.

**What the hosted output may contain, by provenance.** Files built from a clean
checkout of the public repository at a named commit, with its locked dependencies,
with no environment variable admitted to the build except those named in the build
script, and with no source maps. ⚠ Revision 1 described the output as *"the static
output of the public repository's own source"* and treated that as a boundary. M11
shows a build input outside the source reaching the output, so provenance is
something the build has to enforce and the gate has to check, not a description
(`REVIEW-058` R1-3).

**What the hosted tier causes to be sent, and to whom.** Each page load goes to
Vercel, which sees the visitor's IP address and the page requested. Under H3 that
is all. Under H1 the visitor's browser also connects to Ripple's Devnet node and
sends every account it looks up. ⚠ **Revision 1 said trigger 5 fired only for what
is put into the bundle, and that the gate could enumerate it. Both halves were
false.** Visitors' requests are egress no bundle contains, and `ADR-0003` itself
says its gate does not check what the tier emits or to whom. The gate can
enumerate the uploaded files; it cannot enumerate egress (`REVIEW-058` B1-4, and
the repository leg's closing finding).

**Trigger 4, the decryption oracle.** No request reaches a decryption under any
D-H3 option: A and B decrypt nothing at request time, and C adds a verifier. That
is narrower than revision 1's *"cannot fire: there is no request handler"*. A
static file server answers requests, and a pre-decrypted figure served to everyone
is the result leaving, which is E-212's lesson. That is why D-H3 is a ruling.

**Hosted exclusions.** The local tier's signer panel and its loader call
(`web/app/src/routes/index.tsx:12-15,72-85`) are absent, not merely the signer
page; ⚠ revision 1 called it a page. The `/api-doc` page describes an API that does
not exist in the hosted build and is absent too. Two false sentences found on the
local tier by round one are corrected at source: the front page promised the issuer
view showed the holder *"decrypted"*, and the wallet page said three reasons
~~*"cannot be closed by any release"*~~ after saying a wallet that held the key would
close them (`REVIEW-058` R1-4, `CLAIMS.md` E-328).

## What the hosted surface may touch, and may never touch

**May touch:** public Devnet ledger state, read once per page at build time, or
under H1 from the visitor's browser over the one named WebSocket endpoint; static
content built as the provenance rule above says; and, only if D-H3 rules it, one
published snapshot file.

**May never touch:** any server-side request handler; any socket client or the
signer's socket path; any secret, seed or private key, the demo issuer key
included; any decryption routine in the shipped output; any input that asks a
visitor for a seed, a key or any secret; any network but Devnet; any second ledger
endpoint, as a fallback or otherwise; any analytics, toolbar or third-party script;
and any account or issuance a visitor chooses, carried in a URL the host receives.

## The owner's decisions

### D-H1. The hosting shape

| option | cost | what it buys |
|---|---|---|
| **H3. Prerendered pages** *(recommended)* | a build step that reads Devnet once per page with the existing reader; a rebuild whenever the owner wants fresher values; a visitor cannot enter an account | no visitor request leaves Vercel; no second ledger reader; no WebSocket, reconnection or `Buffer` problem; every value is a dated reading, P-3's habit. ⚠ The build still reads one node, so D-H2's first paragraph still applies |
| H1. Static site, the visitor's browser reads Devnet | a WebSocket transport under `Snapshot`, after `loopback.ts` is refactored to separate its transport; a browser-safe replacement for the harness's `Buffer` helpers; snapshot integrity across reconnects; a Content Security Policy that admits the node; no loader cache reused across navigation | a visitor can look up any Devnet account. ⚠ Their IP and every lookup go to Ripple's node. Port 51233 is not 443, and networks that block other ports will fail the page; whether a Devnet WebSocket endpoint on 443 exists has **not been searched** |
| H2. Vercel functions running the Elysia API against Devnet over JSON-RPC, with SSR | the API on the public internet: CORS for the deployed origin, rate limiting, caching, function logs holding visitors' IPs and queries, and billing exposure on the owner's account | the existing reader unchanged, and visitors' IPs hidden from Ripple's node. ⚠ Every route added later runs our code per request, which is trigger 4's shape |

**Why H3.** Revision 1 recommended H1, and round one priced what H1 costs. Its
reuse fails in a browser as written (M5); the reader it would reuse had a gap the
Rust reader closed long ago (M10); it adds a second transport, reconnection, a CSP
exception and a cache rule; and it sends every visitor's lookups to a second
party. What it buys is a lookup box. The confidential positions this demo shows are
the project's own four demo accounts, and most readers of the posts will have no
Devnet account to look up. H3 shows the same views, as dated readings, with nothing to
reconcile. ⚠ The argument for H3 is the Gemini leg's, upheld (`REVIEW-058` Q6).
**If "so people can try it" means a visitor looking up an account of their own,
H1 is the option, at the costs above.**

### D-H2. The ledger-source risk acceptance for a hosted page

B-15's named risk acceptance was written for a local operator who chose their
node (E-110, extended to the facility demo by E-151). A hosted page needs its own,
and accepting a risk is the owner's act, not this document's. The proposed wording,
shown beside every ledger value:

> *This page shows the XRPL Devnet, a test network. Its tokens have no value, and
> it is reset from time to time. Each value was read from Ripple's public Devnet
> endpoint, at the ledger and date shown, and a lying or lagging server behind it
> would have made it wrong. Nothing on this page signs or submits. Do not use a value shown here to
> build a transaction.*
>
> *Vercel, which hosts this page, sees your IP address and the pages you open.*

Under H1 the second paragraph gains: *"Your browser also connects to the public
Devnet node operated by Ripple, which sees your IP address and every account you
look up."*

⚠ Revision 1's wording said *"no amount can be published because of it"*, which is
true of the page and not of a reader who copies a displayed key into their own
tooling, where a lying node reaches F-23 through them. It named only Ripple as a
party that sees visitors, and Vercel sees every one. It omitted that Devnet has no
value and is reset (`REVIEW-058` B1-6, B1-7, S-4).

| option | what it means |
|---|---|
| **Accept, by name, with this wording beside every ledger value** *(recommended)* | the same shape as E-151: the risk is unmet by name, and the page says so where the value is |
| Do not accept | no hosted demo with ledger values. ⚠ Revision 1 offered H3 here as the way to avoid the acceptance, and H3 reads one node too, at build time (`REVIEW-058` S-5) |

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
| B. A published snapshot of the issuer's figures | run `tools/issuer-view-snapshot.ts` locally and publish its results with the ledger index and, for each holder, the `IssuerEncryptedBalance` the figure was decrypted from. The tool does not record that ciphertext today (`tools/issuer-view-snapshot.ts:220-262`), so B changes the one tool that holds the issuer key | the contrast the plan wants: the observer sees a ciphertext, the issuer sees a number. ⚠ Nothing a visitor can run shows the figures are true. Re-reading each ciphertext shows only that the snapshot is current. Comparing the figures' sum with `ConfidentialOutstandingAmount` shows nothing about the key either: that total is public, and anyone can split it among holders without decrypting anything (M9). The repository leg built two incompatible allocations of the same total at ledger 6,244,148, and both passed |
| C. B, plus a proof of correct decryption that the browser verifies | unpriced. XLS-0096's clawback proof is a proof that the mirror encrypts a stated amount (M9), and M7 shows its verifier in the WASM build. ⚠ Two constraints from round one. A proof built with a real clawback context could be used by any account XLS-0096 lets submit a clawback for the issuer, delegates included, so a published proof needs its own domain-separated context naming Devnet and the ledger hash (`REVIEW-058` R1-5). And the published WASM module also exports amount decryption, so shipping it contradicts the rule against decryption routines in the output; C needs a verifier-only artifact (R1-6) | the only option under which a visitor can check each figure, and so the only one that answers E-241 |

**Why A.** E-241's reasoning holds with more force on a public page. A figure no
visitor can check is a claim with no falsifier, published under this project's
name. B's checks cannot change that, because both pass for a publisher who never
held the key, and the repository leg built that forgery. C is the way to show the
number, and it needs the two constraints above priced first. Launching with A costs
nothing, and C can be added later without reopening the rest of this decision.

⚠ **This recommendation departs from the launch plan**, whose phase 2 text calls
the snapshot *"the point of the demo"*. A draft of revision 1 recommended B with
the sum check as its falsifier. Preparing the self leg showed that the check passes
for a forger, so the draft changed before review.

### D-H4. What Vercel deploys, and from where

Read on 2026-10-19 from Vercel's own pages: `vercel.com/docs/cli/deploy`, marked
updated 2026-09-18; `vercel.com/docs/git/vercel-for-github`, marked updated
2026-09-17; and `vercel.com/docs/vercel-toolbar/managing-toolbar`, marked updated
2026-08-11.

| option | cost | what it buys |
|---|---|---|
| **A. Build and gate locally, deploy the prebuilt output from the CLI** *(recommended)* | a Vercel token on the owner's machine, which can replace what the public page says: scope it to the one project, give it an expiry, and keep it beside D8's export folder. Each deployment is a deliberate act. `vercel build` writes `.vercel/output`, and `vercel deploy --prebuilt` uploads that directory | the gate runs on the exact bytes that ship, which is phase 1 step 7's lesson. No additional repository credential or write permission is granted. ⚠ Revision 1 said *"no third party gains any access"*; Vercel still receives every file and controls how it is delivered (`REVIEW-058` R1-10, S-6) |
| B. Vercel's Git integration, production from `main` | Vercel builds from source, so the gate has to run inside Vercel's build and fail it. ⚠ The Vercel for GitHub app's documented repository permissions include write access to `Administration`, `Contents`, `Pull Requests` and `Web Hooks`. That is a third party with write access to the public repository, which D8's option C exists to restrict | deploys follow merges. The integration deploys every push by default, previews included. A pull request from a fork needs a team member's authorization before it deploys, and that protection can be switched off. A fork's preview is a page under the owner's project saying whatever the fork says, which is E-209's presentation-integrity shape |

**Why A.** It keeps the gate on the shipped bytes and keeps the public
repository's write access where D8 put it.

**Under either option, the host can add to the page.** Vercel's toolbar appears on
preview deployments and on any environment where it is enabled, and it loads
script from `vercel.live`. Set it off for both environments in the project, serve a
policy that would block it anyway, and compare the served bytes and headers with
the gated output after every deployment. ⚠ The deployed bytes are Vercel's to
deliver; the comparison detects a change, it does not prevent one (`REVIEW-058`
S-3, B1-3, R1-10).

**The domain.** Serve it from its own `vercel.app` name or a domain used for
nothing else. A subdomain of a domain that also hosts the owner's writing would
share its cookie scope. A `vercel.app` name freed by deleting the project can be
claimed by someone else, and every post linking it would then point at them.

## Devnet resets

The demo accounts are throwaway. Under H3 a page is a reading at a named ledger
and date, and stays one: when Devnet resets, the next build finds the accounts
gone and the page must say so rather than drop them.

> *This account does not exist on Devnet at ledger N. Devnet is reset from time to
> time and the demo accounts are throwaway. No other source is substituted.*

A failed read must never render as an empty account, which reads exactly like a
true statement about the ledger. ⚠ **That was not true of the reader this design
reuses**: `facility/src/loopback.ts` turned a "not found" answer from any ledger
into an empty position, and the observer view would have rendered it. It now checks
the ledger a negative answer names, and the type of every entry, as the Rust
reader has since `REVIEW-016` (M10, `REVIEW-058` R1-7). Old transaction hashes are
not a foundation either, because the public endpoint stopped serving them without
a reset (E-319).

## Abuse, availability and cost

Under H3 and H1 nothing of ours runs per request, so there is nothing of ours to
rate limit. Static hosting still has costs: page loads and transfer count against
the owner's Vercel plan, and a flood of them can exhaust a free plan's quota or
bill a paid one. Name the plan, its limits, a spend cap if the plan offers one, and
who acts when the page goes down (`REVIEW-058` R1-11). Under H1 the node's limits
are Ripple's, and the page must render a refused, failed or rate-limited read as a
named failure, never as an empty account. Under H2 all of it becomes ours.

**Copies.** The bundle is public and anyone can host a copy that reads a node of
their choosing. Nothing prevents that. The page names its canonical address and
the repository, and that is the whole defence.

## Caching

Under H3 every value is baked into the page with its index and date, and nothing
is cached that the page does not show. ⚠ Revision 1 said *"Ledger values are not
cached"* without a mechanism, and under H1 TanStack Router's loaders keep data
across navigation by default (`REVIEW-058` B1-8). Under H1 the build must disable
loader caching for ledger reads, and a test must show that returning to a view
reads again.

## Rotation triggers

`ADR-0003`'s five triggers apply to the hosted build unchanged. Four more are
specific to hosting:

1. **Anything that runs code of ours per request**: a serverless function, edge
   middleware, or on-demand rendering. That is H2, and it needs its own rotation.
2. **Any datum in the shipped output that the provenance rule does not admit.**
   D-H3's snapshot is the only exception that can be ruled, and only by name.
3. **A second network endpoint**, a fallback, or any widening of the page's
   permitted connection targets.
4. **Any new party that receives a visitor's requests**, and any visitor input
   that leaves the browser. Moving from H3 to H1 is one.

## What phase 2 step 4's gate must check

The local gate, `tools/check-web-readonly.ts`, asserts the local shape. The hosted
build needs its own part, run over the **uploaded output directory and its routing
configuration**, not the source:

- an inventory of every file in the output, compared with what the provenance rule
  admits; no source maps;
- no server function, API route, serverless function or middleware, in the files
  or in `.vercel/output/config.json`;
- no socket client, no signer socket path, no decryption routine and no secret-
  shaped value. ⚠ **`check-no-secrets` cannot do the last part today**: it selects
  files through git (`tools/check-no-secrets.ts:665-683`) and has no directory
  mode, and the repository leg showed an ignored `dist/` file going unscanned
  (`REVIEW-058` R1-9). The hosted part needs a directory mode with controls that
  prove ignored build files are read;
- the Content Security Policy as delivered, from `.vercel/output/config.json`'s
  headers, with `default-src 'self'`, `script-src 'self'` plus hashes for any
  inline script the framework emits, `connect-src 'self'` (and the one Devnet
  WebSocket under H1), `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`
  and `frame-ancestors 'none'`; a policy set only on the development server does
  not configure the CDN (`REVIEW-058` R1-8);
- no input asking for a seed, a key or a secret;
- every view that renders a ledger value also renders the D-H2 wording, the
  network check and the ledger index;
- the third-party licence notices the bundle's dependencies require, shipped with
  it (`REVIEW-058` S-2);
- the public commit the output was built from, rendered on the page, so a reader
  can tell what built it (S-8).

It is verified by breaking it, in both directions, with its controls run through
the real detector, and it says in its own output what it does not check. Gates in
this repository have false-passed before they worked, `ADR-0003`'s own among them
(E-165, E-182, E-226). ⚠ **It cannot check egress**: it reads files, and a visitor's
requests are not in them.

## What this decision does not claim

- **That the hosted page is secure.** P-5 governs. It is a static demonstration.
- **That the values it shows are true.** TLS to Ripple's node authenticates the
  channel, not the values (architecture §7, F-23). D-H2 is the acceptance of that.
- **That visitors are private.** Vercel sees every page load. Under H1, Ripple's
  node sees each visitor's IP and lookups.
- **That a holder is private from the issuer** (P-9), that confidential transfers
  hide who or when (P-4, P-11), or that a fresh balance is hidden when F-1 says
  it is publicly known to be zero. `web/api/disclosure.test.ts` pins the local
  tier's wording, and the hosted build must run the same tests.
- **That the gate covers egress, or proves the served bytes stay the gated ones.**
  It checks files before upload; the comparison after deployment detects a change
  at the moment it runs.
- **That Devnet evidence is permanent.** E-319.

## Before this ADR can be accepted

1. The owner's rulings on D-H1 to D-H4.
2. ~~Round one of the rotation.~~ **Run 2026-10-19, `REVIEW-058`.** Round two, on
   revision 2's fixes, is owed. Its stopping condition, set before it runs and
   unchanged from revision 1: no third round unless round two finds a fix that did
   not discharge its finding.

````


## REVISION 1 of the same file, for comparison


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


## FILE: docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md (complete, at commit 629f216)

````
# REVIEW-058c — adjudication of round one: the hosted demo's trust boundary

- **Date:** 2026-10-19
- **Subject:** `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` revision 1 and
  architecture §6 step 9, at the frozen commit `d764bcaa75add41613a67d9cbb48c48038475cb4`.
- **Why it ran:** the launch plan's phase 2 step 2 requires a full adversarial
  rotation before any code, because a hosted deployment is a trust-boundary change
  (`CLAIMS.md` E-309).
- **Register:** `CLAIMS.md` E-328. **Result:** `ADR-0004` revision 2.

## The legs, and how their packets differed

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a fresh clone of the frozen commit under `$TMPDIR` with no remote, `workspace-write` with network | five seams, with instructions to re-run the measurements and build probes. `REVIEW-058-packets/round-one-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools, from an empty directory | six questions, with 13 whole files and 25 whole register rows inline. `round-one-prompt-gemini.md` |
| self | the author of the subject | written from 10:30Z, before either leg was launched, and committed only after both returned. `round-one-self-notes.md` |

Leg A ran 41 shell commands. None touched `~/.wconf`, `/tmp/wconf`, `~/.claude`,
`~/.codex` or the scratchpad, checked by listing every command in its transcript.
Its list of opened files is `round-one-codex-opened-files.txt`. The transcripts
were scrubbed with `tools/scrub-personal-data.ts` before commit: 48 temp paths in
leg A's, and six author emails in the copy of XLS-0096 inside leg B's packet.

## ⚠ A defect in both packets, recorded first

Both prompts told the legs that the ADR recommended D-H3's option B. Leg A's seam
3 said so outright, and leg B's question 3 and question 6 assumed it. The frozen
ADR recommends A. The prompts were drafted before the self leg found that B's sum
check passes for a forger, the draft moved to A, and nobody re-read the prompts
against the frozen commit before launching them. **Both legs read the subject,
noticed, and reviewed what it says.** Leg A: *"the checked-in ADR recommends **D-H3
A**, not B"*. Leg B: *"This is factually false against the text of `ADR-0004`"*.

This is E-160's shape with the adjudicator writing the packet, as in
`REVIEW-048`. It cost nothing this time
because both legs had the subject whole. **A prompt is part of the subject's
history, and it has to be re-read against the frozen commit, not against the
draft it was written beside.**

## Where the legs agreed, and whether they could have disagreed

Both external legs, asked separately for the single sentence most likely to be
false, named the same one: *"Trigger 5 fires only for what is put into the bundle on
purpose, and the gate can enumerate that."* Leg B argued it from `ADR-0003`'s own
text, which it had inline. Leg A demonstrated it with a probe leg B could not run: a
build-machine environment value inlined into the bundle. Different packets,
different evidence, one sentence. That agreement is not one reading distributed.

## Rulings

Grades are the leg's unless the ruling changes them. Every finding below was
checked at source before it was ruled.

| id | leg | claimed | ruling | why, and the fix |
|---|---|---|---|---|
| R1-1 | A | HIGH | **Upheld, HIGH** | `tools/observer-harness.ts:82-83` calls `Buffer`, and the leg's browser bundle threw. The design's reuse fails as written. M5 is corrected; H1's cost names a browser-safe replacement |
| R1-2 | A | MEDIUM | **Upheld** | One page on one origin was tested; the other two were Bun clients supplying a header. M2 and E-327 are corrected |
| R1-3 | A | MEDIUM | **Upheld** | Provenance was a description, not a rule. Revision 2 states the rule (clean checkout at a named commit, locked dependencies, named build variables only, no source maps) and the gate inventories the output |
| R1-4 | A | HIGH | **Upheld, HIGH, and wider than the leg said** | The two false sentences are live on the shipped local tier, not only on a future hosted page. `web/app/src/routes/index.tsx:51` promised the issuer view showed the holder *"decrypted"* six weeks after E-241, two lines below a paragraph saying the opposite; `wallet.tsx:78` contradicted `wallet.tsx:24-27`. Both corrected, with the same overclaim in `ADR-0003` D2. The signer is a panel and loader call, not a page; revision 2 says so |
| R1-5 | A | MEDIUM | **Upheld** | XLS-0096 lets delegates submit a clawback, so a proof built with a real clawback context is usable beyond the key holder. C's cost now requires a domain-separated context |
| R1-6 | A | MEDIUM | **Upheld** | The published WASM exports decryption beside the verifier. C's cost now requires a verifier-only artifact |
| R1-7 | A | HIGH | **Upheld, regraded MEDIUM, and fixed** | Confirmed at `facility/src/loopback.ts`: the error path threw before `Snapshot.pinned` checked the index. **Measured**: rippled 3.4.1 answers `entryNotFound` with `ledger_index` and `validated`, and a ledger it lacks with `lgrNotFound`, which already failed. No honest path is known to reach the gap and a lying node can lie at the right index, so the bypass gives an attacker nothing new: MEDIUM. It was still a false sentence about a check, under a class comment saying *"every answer is checked"*. ⚠ **The Rust reader closed the same gap in `REVIEW-016` round two and also checks every entry's type; the TypeScript reader, written later, had neither.** Both are fixed, with three tests that fail against the reverted reader |
| R1-8 | A | MEDIUM | **Upheld** | Revision 2 names the directives and where a prebuilt deployment delivers them, and the gate reads the delivered header |
| R1-9 | A | HIGH | **Upheld, HIGH** | `tools/check-no-secrets.ts:665-683` selects files with `git ls-files --exclude-standard`, so an ignored build directory is never read, and there is no directory option. The gate list promised a scan that does not exist. Revision 2 says so and names the directory mode as build work with controls |
| R1-10 | A | MEDIUM | **Upheld** | *"No third party gains any access"* becomes *"no additional repository credential or write permission"*. Vercel's toolbar default was **re-read at source** (`vercel.com/docs/vercel-toolbar/managing-toolbar`, updated 2026-08-11): it shows on previews and any enabled environment and loads script from `vercel.live` |
| R1-11 | A | MEDIUM | **Upheld** | Static hosting has quota and cost. Revision 2 asks for the plan, limits, a spend cap and an owner |
| falsifier table | A | — | **Upheld** | Step 9's falsifier now covers provenance, a secret-asking input, an unruled issuer figure, negative reads that cannot be placed in the pinned ledger, and served headers as well as bytes |
| B1-1 | B | HIGH | **Upheld, regraded MEDIUM** | Port 51233 can be blocked where only 443 is open. It degrades the page for some visitors and does not make the design fail. Moot under H3; named under H1 with an unsearched 443 endpoint as a gap |
| B1-2 | B | MEDIUM | **Upheld** | A lookup in a URL the host receives is now on the never-touch list and in the falsifier. Under H3 there is no visitor input |
| B1-3 | B | MEDIUM | **Upheld** | With R1-10 and S-3 |
| B1-4 | B | HIGH | **Upheld, HIGH** | The trigger-5 sentence. Retracted in revision 2's status line and rewritten: the gate can enumerate the uploaded files, and it cannot enumerate egress |
| B1-5 | B | HIGH | **Upheld, regraded MEDIUM** | *"Nothing to bind"* read as evasion. Revision 2 says the page is public by design and step 9's falsifiers replace step 8's loopback property. Wording, not a design failure |
| B1-6 | B | HIGH | **Upheld, HIGH** | The visitor-facing sentence named only Ripple as a party that sees visitors; Vercel sees every page load. Rewritten |
| B1-7 | B | MEDIUM | **Upheld in part** | Devnet, no value and resets are now in the wording, and *"lying or lagging"*. Dropped messages are a reader failure and render as a named failure, not as a disclosure |
| B1-8 | B | HIGH | **Upheld, regraded MEDIUM** | *"Ledger values are not cached"* was a requirement stated as a fact with no mechanism. Under H3 it is true by construction; under H1 the build must disable loader caching, with a test |
| B1-9 | B | HIGH | **Upheld, regraded MEDIUM** | The single-reader sentence described a requirement as if the code already met it. Revision 2 says `loopback.ts` must first be refactored to separate its transport |
| B1-10 | B | LOW | **Upheld** | *"No server-side code of ours"* |
| Q6 | B | — | **Upheld: D-H1's recommendation moves from H1 to H3** | H1's reuse fails in a browser, needs a reader refactor, adds reconnection, a CSP exception and a cache rule, and sends visitors' lookups to a second party, to buy a lookup box for an audience with no Devnet accounts. H3 shows the same views as dated readings. The ADR keeps H1 as the option if the owner wants visitors to look up their own accounts |
| S-1 | self | MEDIUM | **Upheld** | Never ask for a secret: never-touch list, gate and falsifier |
| S-2 | self | MEDIUM | **Upheld** | The bundle's third-party licence notices are a gate item |
| S-3 | self | MEDIUM | **Upheld** | Corroborated by R1-10 and B1-3 |
| S-4 | self | LOW | **Upheld** | With B1-6: *"Do not use a value shown here to build a transaction."* |
| S-5 | self | LOW | **Upheld** | H3 still reads one node, at build time; *"Do not accept"* no longer offers it as an escape |
| S-6 | self | LOW | **Upheld** | Token scope, expiry and location |
| S-7 | self | LOW | **Subsumed by R1-8** | |
| S-8 | self | LOW | **Upheld** | The page renders the commit it was built from |

**Rejected:** none. Six findings were regraded down, each for the reason given.
None was regraded up.

## What leg B's question 3 confirmed

Asked about B with a false premise, leg B still ruled on the substance: B *"routes
around"* E-241 and passes for a forger, C is unpriced, A is sound. Leg A built the
forgery: two incompatible allocations of the public total at ledger 6,244,148, both
passing B's checks. The self leg's pre-freeze finding is therefore confirmed twice,
once by argument and once by construction.

## What changed in the subject

- `ADR-0004` revision 2, with every upheld finding cited at its site.
- Architecture §6 step 9 rewritten for H3, with the wider falsifier; revision 10
  amended the same day.
- `facility/src/loopback.ts`: negative answers checked against the pinned ledger,
  and entry types checked. `facility/tests/loopback.test.ts` adds three tests, and
  both test files' fake nodes now answer as rippled 3.4.1 does.
- `web/app/src/routes/index.tsx`, `web/app/src/routes/wallet.tsx` and `ADR-0003`
  D2 corrected; `tools/check-disclosure-phrases.ts` carries the three phrases, keyed
  to E-328, and was broken by restoring the old copy.

## Round two

**Owed**, because round one found defects in the subject and in shipped code, and
the fixes have been seen by nobody. Its stopping condition was set before round one
ran and is unchanged: **no third round unless round two finds a fix that did not
discharge its finding.** The owner's Codex policy allows two more plan rounds for
this key.

````


## FILE: docs/reviews/REVIEW-058-packets/round-one-gemini-output.md (complete, at commit 629f216)

````
# REVIEW-058 round one, leg B — The hosted demo's trust boundary, before any code

---

## Question 1: The threat model

**Explicit verdict:** `INCOMPLETE`

`ADR-0004` treats moving from a loopback process to a static site as an elimination of server-side attack surface. In doing so, it leaves substantial parts of the public web threat model unexamined.

### 1. The build's supply chain
- **What is unconsidered:** The local build pipeline (`bun run build`, `vercel build`) pulls and executes dependencies from `npm` (`@tanstack/react-start`, `@noble/curves`, `ripple-address-codec`, etc.). Build scripts or compromised transitives execute arbitrary code on the developer/owner machine where the Vercel deploy token resides. The ADR considers M7 (WASM symbol presence) and M8 (plugin schema), but never mentions package lockfile pinning, build-time provenance, or subresource integrity (SRI) for the generated static bundle.
- **Does it matter for Devnet with throwaway accounts?** **YES.** While Devnet account seeds are throwaway, the owner's machine hosts the Vercel deployment token and the private repository environment. Furthermore, supply chain tampering can inject malicious scripts into the static output, destroying presentation integrity (e.g. rendering false claims under the project's name, which [CLAIMS.md](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L98-L101) E-209 rules as a trust-boundary failure).

### 2. The hosting account (Vercel)
- **What is unconsidered:** Platform-level features outside Git control: Vercel Web Analytics, Speed Insights, automatic preview comments/toolbars, edge error pages, and dashboard-level environment variables or redirects. The ADR assumes in D-H4 that `vercel deploy --prebuilt` uploads pure directory bytes, but Vercel's edge network can inject headers, platform telemetry scripts, or caching layers unless explicitly disabled in project configuration. It also omits account takeover, token leakage on the owner's workstation, and DDoS/bandwidth consumption resulting in account suspension.
- **Does it matter?** **YES.** The ADR claims the tier "may never touch: ... any analytics or third-party script" ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L77-L81)). If the Vercel project configuration injects platform scripts, that prohibition is violated automatically without a single line of repo code changing.

### 3. The domain
- **What is unconsidered:** The ADR names `https://wconf-demo.vercel.app` in M2. It does not consider subdomain hijacking if the project is renamed or deprovisioned, nor origin isolation if deployed under a custom domain (such as a subdomain of `nandan.me`, which the launch plan names for writing). Shared cookies or storage across `*.nandan.me` would broaden the ambient authority of the demo page.
- **Does it matter?** **LOW for `vercel.app`, HIGH if on a personal apex/subdomain.** On `vercel.app`, the PSL (Public Suffix List) isolates cookies, but abandonment allows takeover. On `nandan.me`, any cross-subdomain cookie leakage becomes possible.

### 4. The WebSocket endpoint (`wss://s.devnet.rippletest.net:51233`)
- **What is unconsidered:**
  1. *Egress port blocking:* Port `51233` is a non-standard port. Many corporate, academic, and restricted guest Wi-Fi networks block outbound TCP ports other than 80 and 443.
  2. *Connection drops and pool flapping:* M3 observes that two connections reach two servers with different validated ledger ranges. When a browser's WebSocket disconnects and reconnects, it lands on an entirely different server in the pool, causing ledger index regression or sequence divergence.
  3. *Denial of service:* Rate limiting or IP bans from Ripple's public node against visitor IP ranges.
- **Does it matter?** **YES.** Port 51233 egress blocking causes silent or generic connection failures for enterprise/corporate visitors—the exact capital-markets audience the demo targets.

### 5. The visitor
- **What is unconsidered:**
  1. *Browser extensions:* Wallet extensions (Xaman, Crossmark, GemWallet) or ad/script injectors can tamper with DOM values, intercept WebSocket frames, or fail unexpectedly.
  2. *URL history and referrer leakage:* As noted in D-H1, `web/app/src/routes/observer.tsx` serializes the account and issuance ID into the URL query parameters. When a visitor reloads, shares, or follows a link, the exact account query is logged in Vercel's HTTP access logs and browser history.
  3. *Accidental Mainnet confusion:* Visitors entering their own real XRPL Mainnet accounts or addresses into the search bar.
- **Does it matter?** **YES.** It causes privacy egress to Vercel (violating Trigger 5) and creates user confusion when Mainnet accounts report as non-existent or un-initialised.

### 6. Anyone who might misuse or misread the page
- **What is unconsidered:**
  1. *Clone phishing:* Since the bundle is static and open-source, an adversary can clone the Vercel deployment, point the WebSocket to a malicious node that reports false keys, and trick users into transacting.
  2. *Decontextualised screenshots:* A visitor screenshotting the observer view and claiming "confidential amounts are publicly zero" (misinterpreting F-1 canonical zero vs. homomorphic zero) or "XRPL confidential tokens are live on Mainnet".
- **Does it matter?** **YES.** In a research artifact whose primary output is factual demonstration and credibility, presentation misinterpretation and fraudulent cloning are primary risks.

### Findings for Question 1

- `B1-1 | HIGH | Non-standard WebSocket port 51233 firewall block | "A Bun WebSocket to wss://s.devnet.rippletest.net:51233 carrying Origin: https://wconf-demo.vercel.app ... A page on each origin tried can read this endpoint" (ADR-0004:47-49) | Verify whether Ripple provides a port 443 WSS endpoint for Devnet, or explicitly disclose port 51233 firewall restrictions in the connection failure UI.`
- `B1-2 | MEDIUM | URL query param leakage to Vercel HTTP access logs | "today's observer route carries the account in the URL (web/app/src/routes/observer.tsx:7-8,51), so a reload or a shared link sends the lookup to Vercel too unless the hosted build keeps it out of the URL" (ADR-0004:96-98) | Migrate the hosted build's router to hash-based routing (/#/observer/...) or in-memory state so account lookups never leave the browser in HTTP request lines.`
- `B1-3 | MEDIUM | Vercel platform script and telemetry injection unaddressed | "May never touch: ... any analytics or third-party script" (ADR-0004:77-81) | Add explicit vercel.json configuration disabling Vercel Analytics and Speed Insights, and add a gate check verifying that no platform scripts appear in deployed HTML.`

---

## Question 2: "Why this shape"

**Explicit verdict:** `UNSOUND`

The argument in `ADR-0004` under *"Why this shape"* states:
> *"Under it, the hosted tier serves the static output of the public repository's own source, plus whatever D-H3 deliberately adds. Trigger 4, the decryption oracle, cannot fire: there is no request handler for a request to reach. Step 8's loopback falsifier has nothing to bind. Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L67-L71))

This reasoning reproduces the exact structural mistake of `ADR-0003` revision 1:

1. **"Trigger 4 cannot fire: there is no request handler for a request to reach."**
   In `ADR-0003`, the author believed Trigger 4 only applied to an incoming key in a request. `CLAIMS.md` E-212 and E-228 proved that serving a pre-decrypted plaintext result over an unauthenticated `GET` is structurally the same oracle: the result leaves in a response. In `ADR-0004`, asserting that Trigger 4 cannot fire because there is no server-side request handler ignores that a static file server *is* a request handler. If D-H3 were to adopt Option B, the pre-decrypted snapshot is served to the world without authentication. Claiming Trigger 4 cannot fire simply because the file is static rather than dynamically computed is the exact semantic loophole E-212 and E-228 struck down.
2. **"Step 8's loopback falsifier has nothing to bind."**
   This is rhetorical evasion. Architecture §6 step 8 is falsified if *"the API binds to anything but loopback"*. The purpose of that falsifier was to prevent exposing the tier to external networks. Eliminating the local server and placing the entire application on Vercel's public edge does not honor the property—it abandons it. Vercel binds to `0.0.0.0:443`. Claiming the falsifier "has nothing to bind" is arguing that an obligation ceases to exist once violated at a higher layer.
3. **"Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."**
   This is flatly false on two counts:
   - *Trigger 5 is runtime egress, not just bundle content.* When a visitor loads the page and searches an account, their browser transmits their IP address and search query to Ripple's node and to Vercel's servers. Those data flows did not exist before this tier was deployed.
   - *The gate cannot enumerate egress.* `ADR-0003` explicitly says under *What this decision does not claim*: *"That the gate covers egress. It checks what the tier can REACH (parts 1-3), what it HOLDS (part 4), and where it BINDS (part 6). It does not check what the tier EMITS, or to whom, and it now says so in its own output (item 11)."* ([ADR-0003](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L283-L285)). `ADR-0004` directly contradicts `ADR-0003` by asserting that the gate can enumerate what fires Trigger 5.

### Findings for Question 2

- `B1-4 | HIGH | Contradicting ADR-0003 by claiming gate enumerates egress | "Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that." (ADR-0004:69-71) | Strike the claim. Acknowledge that Trigger 5 fires dynamically upon visitor interaction (IP and queries sent to Ripple and Vercel) and that static lexical gates cannot enumerate runtime egress.`
- `B1-5 | HIGH | False evasion of Step 8's loopback falsifier | "Step 8's loopback falsifier has nothing to bind." (ADR-0004:68-69) | Replace with an explicit statement that Step 8's loopback constraint is deliberately replaced by Step 9's public static hosting boundary, and define Step 9's specific boundary falsifiers instead.`

---

## Question 3: D-H3, the issuer figure

**Explicit verdict:** `FLAWED PREMISE IN PROMPT; ADR-0004 RECOMMENDATION A IS SOUND, OPTION B IS DISQUALIFIED`

### 1. The discrepancy between the prompt and `ADR-0004`
The prompt asserts: *"The ADR recommends publishing it on the hosted page, with a consistency check."*
**This is factually false against the text of `ADR-0004` (commit d764bca).**
`ADR-0004` explicitly recommends **Option A: No figure**:
> *"Why A. E-241's reasoning holds with more force on a public page. A figure no visitor can check is a claim with no falsifier, published under this project's name. B's checks cannot change that, because both pass for a publisher who never held the key... ⚠ This recommendation departs from the launch plan... An earlier draft of this document recommended B with the sum check as its falsifier. Preparing the self leg showed that the check passes for a forger, so the draft changed before review."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L141-L150))

It was the *launch plan* (`PLAN-PUBLIC-LAUNCH-2026-09-22.md` phase 2 step 1) and an *earlier draft* of ADR-0004 that proposed publishing Option B with the sum check. The author of ADR-0004 caught this defect and reversed the recommendation to A prior to this review.

### 2. Does Option B answer E-241's reasoning or route around it?
Option B **routes around it**, and the mechanism is completely broken:
- E-241 established that the plaintext balance integer only ever proved that *this project* holds the private key, which is not an architectural property of the protocol.
- The proposed "consistency check" for Option B was verifying that the sum of decrypted balances matches `ConfidentialOutstandingAmount` on the issuance.
- But as M9 and D-H3 in `ADR-0004` observe, `ConfidentialOutstandingAmount` is **public plaintext on the ledger**. Any adversary who never held the issuer key can take that public total, split it arbitrarily into numbers that sum to it, and publish them.
- A visitor has no mathematical or cryptographic way to verify that the split matches the ciphertexts. Thus, Option B publishes an unfalsifiable claim under the project's authority, directly violating E-241.

### 3. Recommendation among A, B, and C
**Recommend Option A.**
- **Option B** is disqualified: it is cryptographic theatre that passes for a complete forgery.
- **Option C** (generating and verifying a ZK proof of correct decryption in browser WASM) is technically the only path that cryptographically answers E-241. However, it is unpriced, relies on unwrapped C WASM symbols (`_mpt_verify_clawback_proof`, M7), and requires binding a proof to an unsubmitted transaction context whose cryptographic safety has not been reviewed. Launching with Option C introduces unreviewed cryptographic attack surface.
- **Option A** carries forward E-241 cleanly: it displays the on-chain `IssuerEncryptedBalance` and cites the protocol specification invariant (P-9: the issuer can always decrypt). It asserts no unverified numbers, requires no untrusted assertions, and introduces zero cryptographic risk.

*Question 3: no new B1 finding required against ADR-0004's text*, as ADR-0004 already recommends A and discredits B.

---

## Question 4: D-H2, the risk acceptance wording

**Explicit verdict:** `INCOMPLETE AND MATERIALLY MISLEADING BY OMISSION`

The proposed disclosure wording in `ADR-0004` D-H2:
> *Sentence 1: "A lying or substituted node makes this page show wrong values. Nothing on this page signs or submits, so no amount can be published because of it."*
> *Sentence 2: "Your browser connects to the public Devnet node operated by Ripple. That operator sees your IP address and every account you look up here."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L106-L113))

### What is false or misleading
1. **Sentence 2's privacy claim is false by omission.**
   Sentence 2 says: *"That operator [Ripple] sees your IP address and every account you look up here."*
   This implies that *only* Ripple sees the visitor's IP and search queries.
   In reality, **Vercel also sees the visitor's IP address on every request, and sees every account looked up whenever the account is in the URL query string** (as implemented today in `web/app/src/routes/observer.tsx:7-8` upon reload or link navigation).
2. **"no amount can be published because of it" is ambiguous.**
   In this project's vocabulary, F-23 defines "published" as writing a ciphertext to the on-chain ledger via a submitted transaction. A casual visitor reads "published" as "displayed publicly on this page". Because the page *does* publish and display plaintext amounts (public balance, `ConfidentialOutstandingAmount`), this sentence confuses users.

### What is missing that a visitor needs
1. **Devnet & Monetary Value:** It never states that the data is from XRPL **Devnet** (network ID 2), that balances are test tokens with zero financial value, and that Devnet is subject to periodic resets that wipe all data.
2. **Node Pool Flapping / Staleness:** Sentence 1 blames wrong values solely on a "lying or substituted node". It omits benign distributed systems failure modes: cluster desynchronization (M3), lagging nodes, or dropped WebSocket messages.
3. **TLS vs. Ledger Integrity:** Visitors need to know that while TLS authenticates the connection to `rippletest.net`, it does not authenticate the ledger contents (Architecture §7, F-23). The browser performs no state-tree verification.

### Findings for Question 4

- `B1-6 | HIGH | Incomplete and misleading privacy disclosure in D-H2 | "Your browser connects to the public Devnet node operated by Ripple. That operator sees your IP address and every account you look up here." (ADR-0004:111-113) | Amend Sentence 2 to explicitly disclose that Vercel also sees the visitor's IP address and, if URLs are shared or reloaded, any account parameters in the request.`
- `B1-7 | MEDIUM | Node failure disclosure understates cluster desync and Devnet resets | "A lying or substituted node makes this page show wrong values." (ADR-0004:107) | Expand Sentence 1 to state that out-of-sync cluster nodes, lagging nodes, and periodic Devnet resets also cause missing or conflicting values.`

---

## Question 5: The prohibitions (P-1 to P-12)

**Explicit verdict:** `VIOLATIONS FOUND`

Reviewing `ADR-0004` and `Architecture §6 step 9` against P-1 through P-12:

1. **P-3 / Caching Claim (Claims more than is delivered):**
   In `ADR-0004` under *Abuse, rate limiting and caching*:
   > *"Static files cache normally. Ledger values are not cached; each view names the index it read."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L182-L183))
   In TanStack Start / TanStack Router applications, route loaders cache returned data in client memory by default (`staleTime` / `gcTime`). Unless explicitly disabled with `gcTime: 0`, navigating away from `/observer` and returning will display cached in-memory ledger responses without re-fetching from WebSocket, presenting stale values under an old ledger index. The claim that "ledger values are not cached" is false for the client-side SPA.
2. **Architecture Step 9 / Code Reuse (Claims more than is delivered):**
   In `Architecture §6 step 9`:
   > *"The hosted reader composes the same `Snapshot` discipline with a WebSocket transport, because a browser cannot read the public JSON-RPC endpoint and `web/api/ledger-view.ts` already records why a second reader of one obligation is not acceptable."* ([ARCHITECTURE-2026-08-18.md](file:///docs/architecture/ARCHITECTURE-2026-08-18.md#L416-L418))
   `web/api/ledger-view.ts` composes `facility/src/loopback.ts`, which is hardcoded to Node/Bun `fetch` over HTTP JSON-RPC and reads environment variables. There is currently no generic transport abstraction in `loopback.ts`. To run in a browser, a brand-new WebSocket client must be written. Calling this "the same Snapshot discipline... not a second reader" claims an architectural unification that does not exist in the codebase today.
3. **Misleading if reading stops there (No code runs per request):**
   In `ADR-0004`:
   > *"No code of ours runs per request. The deployment is static files."* ([ADR-0004](file:///docs/decisions/ADR-0004-hosted-demo-trust-boundary.md#L57))
   If a reader stops there, this is misleading. Client-side JavaScript written by this project runs on every visitor action, processes every WebSocket event, and performs elliptic curve operations in the browser (`canonicalEncZero`). The sentence should specify "No server-side code runs per HTTP request."

### Findings for Question 5

- `B1-8 | HIGH | False claim regarding client-side ledger caching | "Ledger values are not cached; each view names the index it read." (ADR-0004:182-183) | Specify explicit TanStack Router loader cache-busting (staleTime: 0, gcTime: 0) so in-memory client state never retains stale ledger snapshots across route navigations.`
- `B1-9 | HIGH | Overclaiming single-reader implementation for browser WebSocket | "The hosted reader composes the same `Snapshot` discipline with a WebSocket transport ... stay in one implementation" (ADR-0004:72-76 / ARCHITECTURE-2026-08-18.md:416-418) | Clarify that facility/src/loopback.ts must first be refactored to decouple the Snapshot state machine from HTTP fetch before the claim of a single unified reader is true.`
- `B1-10 | LOW | Unqualified claim of no code running per request | "No code of ours runs per request. The deployment is static files." (ADR-0004:57) | Change to "No server-side code of ours runs per request."`

---

## Question 6: The recommendation you would overturn

**Explicit verdict:** `OVERTURN H1 IN FAVOR OF H3` (and uphold rejection of B)

*(Note on candidate list: If evaluating the prompt's listed option "B", overturning B in favor of A is mandatory for the reasons detailed in Question 3: B's sum check is an unfalsifiable forger's pass. However, because `ADR-0004` already recommends A, the operative recommendation to overturn in `ADR-0004` is **H1**).*

### Overturning Recommendation H1 (Static site with browser WebSocket) in favor of H3 (Prerendered pages only)

`ADR-0004` recommends H1 on the premise that it allows visitors to "try it" by entering accounts. This is a bad trade-off for this project:

1. **Visitor privacy destruction:** Under H1, every visitor's IP address and account search query are leaked directly to Ripple's public node operator and to Vercel (D-H1). Under H3, the build reads Devnet once locally; visitors make **zero** network requests to Ripple.
2. **Network failure modes on port 51233:** Devnet WebSocket runs on non-standard port 51233 (M2). Strict enterprise, bank, and corporate firewalls block non-standard egress, causing connection failures for the core intended audience. H3 uses pure standard HTTPS (port 443) for static assets.
3. **Eliminates the "second reader" problem entirely:** H1 forces the project to write a new browser-compatible WebSocket ledger reader, duplicating the `Snapshot` discipline and risking drift. H3 reuses the existing, tested `facility/src/loopback.ts` JSON-RPC reader at build time.
4. **Devnet accounts are a fixed set anyway:** Devnet has no arbitrary user community holding confidential MPT tokens. The only accounts with active confidential balances are this project's four curated demo accounts (`Holder A` through `D`, M4). A visitor typing their own address will see nothing. The promise of "trying it" under H1 reduces in practice to looking up accounts that don't exist.
5. **Absolute fidelity to P-3:** P-3 mandates treating ledger state as dated observations rather than standing truth. H3 bakes the exact ledger index, timestamp, and amendment set into the static HTML, making it impossible for a lagging or lying node to display deceptive live state.

---

## Last: The single sentence in the ADR most likely to be false

> **`"Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that."`**  
> — `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, line 70

**Why it is false:**
1. **Clause 1 is false:** Trigger 5 governs *egress*—making data reachable by a party who could not obtain it before. The hosted demo dynamically causes the visitor's IP address and query data to reach Ripple's node and Vercel. That egress happens at runtime and is not in the bundle.
2. **Clause 2 is false:** `ADR-0003` explicitly proved and documented that lexical gates run over build artifacts *cannot* enumerate runtime egress: *"That the gate covers egress... It does not check what the tier EMITS, or to whom, and it now says so in its own output (item 11)"* ([ADR-0003:283-285](file:///docs/decisions/ADR-0003-web-tier-trust-boundary.md#L283-L285)). `ADR-0004` asserts the exact opposite.

````


## FILE: docs/architecture/ARCHITECTURE-2026-08-18.md (complete, at commit 629f216)

````
# W-CONF architecture — revision 10

⚠ **This document said `tapFailHard` until 2026-10-18, which is THIS PROJECT'S SHORTHAND and appears zero times in rippled.** It now uses the real names: `fail_hard`, the submission parameter a client sets, and `TapFailHard`, rippled's internal apply flag. See [`docs/VOCABULARY.md`](../VOCABULARY.md). The code always used the real one.

- **Revision 10 on 2026-10-19, amended the same day after `REVIEW-058` round one** (step 9's shape moved from browser reads to prerendered pages, and its falsifier grew; `CLAIMS.md` E-328). **§6 step 9 written: the hosted demo, scoped and NOT ruled.** `ADR-0004` is the decision record, `Proposed`, with four decisions for the project owner and a full adversarial rotation owed before any code (launch plan phase 2, `CLAIMS.md` E-309). The design rests on measurements taken the same day and recorded in the ADR: the public Devnet JSON-RPC endpoint cannot be read from a browser page, its WebSocket endpoint can, and the four demo accounts still exist (`CLAIMS.md` E-327).
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

9. **The hosted demo — a static, read-only page on a public URL.** **SCOPED 2026-10-19. NOT RULED, NOT BUILT. Round one of its rotation has run (`REVIEW-058`); round two is owed.** `ADR-0004` is the decision record, `Proposed` at revision 2. It carries four decisions for the project owner, D-H1 to D-H4, each priced with a recommendation. ⚠ **A public deployment fires two of step 8's own conditions**: its falsifier *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5, egress. The hosted page is public by design, so step 8's loopback property does not carry over to it, and this step's falsifiers replace it.

   **What the step is, in one sentence, if D-H1 is ruled as recommended:** prerendered static pages, each built from one pinned read of public Devnet state with the reader the local tier already uses, each naming its ledger index and date, with no code of this project running on a server per request and nothing sent by a visitor's browser except page loads to the host. ⚠ **This said the visitor's browser would read Devnet over WebSocket until `REVIEW-058` round one**, which found that reuse failing in a browser and pricing a second reader, and found that revision 1's claim that the gate could enumerate egress was false (`CLAIMS.md` E-328).

   **It is a second build target, not a replacement.** Step 8's local tier stays as it is. Its signer panel and `/api-doc` page are absent from the hosted build.

   **What this step may touch:** public Devnet ledger state, read at build time (or, under D-H1's H1, from the visitor's browser over the one named WebSocket endpoint); files built from a clean checkout of the public repository at a named commit, with its locked dependencies, named build variables only and no source maps; and one published issuer snapshot, only if D-H3 rules it.

   **What it may never touch:** any server-side request handler; any socket client or the signer's socket path; any secret, seed or private key, the demo issuer key included; any decryption routine in the shipped output; any input asking a visitor for a secret; any network but Devnet; any second ledger endpoint, as a fallback or otherwise; any analytics, toolbar or third-party script; and any account a visitor chooses, carried in a URL the host receives.

   **Its gate is a hosted part of `tools/check-web-readonly.ts`, run over the UPLOADED OUTPUT DIRECTORY and its routing configuration rather than the source**, verified by breaking it in both directions. `ADR-0004` lists what it must check. ⚠ It cannot check egress, and `check-no-secrets` has no directory mode yet, so the scan it relies on does not exist (`REVIEW-058` R1-9).

   *Falsified if:* the shipped output contains a server function, an API route, a serverless function or middleware, in its files or its routing configuration; or contains a socket client, the signer socket path, a decryption routine or a secret-shaped value; or contains any file the provenance rule does not admit; or asks a visitor for a seed, a key or a secret; or permits a connection to anything but its named targets; or renders a ledger value without the risk wording, the network check and the ledger index it was read at; or renders a failed or negative read that cannot be placed in the pinned ledger as an empty account, or substitutes another source; or carries a visitor's lookup in a URL the host receives; or publishes an issuer figure D-H3 has not ruled; or ships bytes or headers other than the ones the gate passed. *Also falsified if:* any of step 8's wording falsifiers holds on the hosted page.

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


## FILE: facility/src/loopback.ts (complete, at commit 629f216)

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
  /**
   * @param answeredIndex the ledger a negative answer said it came from, when
   * the node named one. Only `REFUSED_LEDGER_ENTRY_MISSING` sets it, because a
   * "not found" is an answer about one ledger and `Snapshot` checks it as one.
   */
  constructor(readonly code: string, message: string, readonly answeredIndex?: number) {
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
    let result: any;
    try {
      result = await this.ledger.call(method, { ...params, ledger_index: this.index });
    } catch (e) {
      // ⚠ **A "not found" is an answer, and it is checked like one.** `REVIEW-058`
      // found this path returning before the index check below, so a negative
      // answer naming ledger 43 read as `null` in a snapshot pinned to 42. The
      // Rust reader closed the same gap in `REVIEW-016` round two
      // (`signer/src/ledger.rs`, `ledger_entry`) and this one never got the fix:
      // two readings of one obligation, drifting (`CLAIMS.md` E-141's shape).
      // rippled 3.4.1 names `ledger_index` on `entryNotFound`, measured on
      // Devnet 2026-10-19; an absence that names no ledger proves nothing.
      if (
        e instanceof LedgerRefusal &&
        e.code === "REFUSED_LEDGER_ENTRY_MISSING" &&
        e.answeredIndex !== this.index
      ) {
        throw new LedgerRefusal(
          "REFUSED_LEDGER_TORN",
          `${method} said "not found" from ledger ${e.answeredIndex ?? "(none named)"}, not the ` +
            `pinned ${this.index}. An absence that cannot be placed in the pinned ledger is not ` +
            `an answer about it`,
        );
      }
      throw e;
    }
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
    const n = entryOfType(r, "MPToken");
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
    const n = entryOfType(r, "MPTokenIssuance");
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

/**
 * The node must be the kind of object that was asked for. Without this a node
 * could return an `MPTokenIssuance` where an `MPToken` was requested, and the
 * reader would take whichever fields happened to have the right names. The Rust
 * reader has checked this since `REVIEW-016`; this one did not until `REVIEW-058`.
 */
function entryOfType(r: any, expected: string): any {
  const n = r?.node;
  if (!n || typeof n !== "object") {
    throw new LedgerRefusal("REFUSED_LEDGER_MALFORMED", `ledger_entry returned no node`);
  }
  if (n.LedgerEntryType !== expected) {
    throw new LedgerRefusal(
      "REFUSED_LEDGER_MALFORMED",
      `ledger_entry was asked for a ${expected} and returned a ${String(n.LedgerEntryType ?? "(no LedgerEntryType)")}`,
    );
  }
  return n;
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
    const missing = result.error === "entryNotFound" || result.error === "objectNotFound";
    const code = missing ? "REFUSED_LEDGER_ENTRY_MISSING" : "REFUSED_LEDGER_ERROR";
    // The ledger a negative answer names travels with it, so `Snapshot` can
    // check it like any other answer. `NaN` when the node named none.
    const answered = missing ? Number(result.ledger_index ?? result.ledger_current_index ?? NaN) : undefined;
    throw new LedgerRefusal(code, `${method}: ${result.error} ${result.error_message ?? ""}`, answered);
  }
  return result;
}

````


## FILE: facility/tests/loopback.test.ts (complete, at commit 629f216)

````
/**
 * loopback.test.ts — the facility's ledger source refuses anything that is not
 * a loopback literal, and reads a pinned ledger or refuses.
 *
 * Every capability claim needs a test that fails if the claim is false. The
 * claim here is B-15's step-7 obligation, and it is the one the whole milestone
 * rests on.
 */
import { describe, expect, test } from "bun:test";
import { isLoopbackEndpoint, LedgerRefusal, LoopbackLedger } from "../src/loopback.ts";
import { withHatch } from "./with-hatch.ts";
import {
  CANONICALISED_LOOPBACK,
  HOSTILE_ENDPOINTS,
  LOOPBACK_ENDPOINTS,
  NOT_ENDPOINTS,
} from "./hostile-endpoints.ts";

describe("isLoopbackEndpoint", () => {
  test("accepts loopback literals", () => {
    for (const e of LOOPBACK_ENDPOINTS) expect(isLoopbackEndpoint(e)).toBe(true);
    expect(LOOPBACK_ENDPOINTS.length).toBeGreaterThan(4);
  });

  // ⚠ Every hostile endpoint lives in `./hostile-endpoints.ts`, with the reason
  // it is there. `REVIEW-016` found two of them — a host NAMED to look numeric,
  // and userinfo before the real host — walking through the Rust check that
  // exists BECAUSE of F-23. The unterminated IPv6 literal is round two's: a
  // parser that split on `]` and took what came before accepted it.
  //
  // ⚠ `tools/check-loopback.ts` carries ONE whole-file exemption for that
  // fixture rather than a dozen near-identical entries, and it reports how many
  // literals the exemption excused. A gate that skipped its own test files
  // silently would be the mask CLAIMS.md E-141 records.
  test.each(HOSTILE_ENDPOINTS.map((h) => [h.endpoint, h.why]))(
    "refuses %s — %s",
    (endpoint) => {
      expect(isLoopbackEndpoint(endpoint as string)).toBe(false);
    },
  );

  test("accepts the forms URL canonicalises to 127.0.0.1 — they ARE loopback", () => {
    // ⚠ `2130706433`, `0177.0.0.1`, `0x7f.1`, `127.1`, a trailing dot and an
    // uppercase scheme are all folded to `127.0.0.1` by WHATWG `URL` before the
    // check sees them. Accepting them is correct. This test exists because the
    // session's own review leg asserted the OPPOSITE — from reasoning, not from
    // running them — and because a later session reading "literal" in the
    // comments might otherwise tighten the check into rejecting real loopback.
    for (const e of CANONICALISED_LOOPBACK) {
      expect(isLoopbackEndpoint(e)).toBe(true);
    }
    expect(CANONICALISED_LOOPBACK.length).toBe(6);
  });

  test("refuses input that is not a URL at all", () => {
    for (const e of NOT_ENDPOINTS) expect(isLoopbackEndpoint(e)).toBe(false);
  });

  test("the hostile list is not silently empty", () => {
    // A `test.each` over an empty array passes by running nothing. That is the
    // false-pass shape REVIEW-009 §8 found in `t-nbound.c` and this project has
    // paid for twice since.
    expect(HOSTILE_ENDPOINTS.length).toBe(13);
  });
});

/** A node that answers whatever the test tells it to, on 127.0.0.1. */
function fakeNode(handler: (method: string, params: any) => any) {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body: any = await req.json();
      const result = handler(body.method, body.params?.[0] ?? {});
      return Response.json({ result: { status: "success", ...result } });
    },
  });
  return { server, endpoint: `http://127.0.0.1:${server.port}` };
}

const FULL_INFO = {
  info: {
    build_version: "3.3.0",
    git: { hash: "00a178fb92ca49521b937ae1a99d863765ea8a90" },
    network_id: 2,
    server_state: "full",
    validated_ledger: { seq: 4_800_000 },
  },
};

describe("LoopbackLedger.open", () => {
  test("refuses a remote endpoint BEFORE it connects", async () => {
    // The refusal must not require the endpoint to answer: a facility that
    // reached out to a remote host on the way to failing has already told that
    // host what it was about to ask for.
    // ⚠ **The refusal depends on `WCONF_ACCEPT_REMOTE_LEDGER_RISK` being unset,
    // and this test owns that rather than hoping.** With the acceptance
    // sentence exported this asserted nothing: `REVIEW-023` round two ran the
    // suite that way and got 76 pass / 3 fail, with THIS test failing because
    // the promise RESOLVED — `open` reached the public endpoint and got
    // `server_info` back. A test that asserts an environment-dependent outcome
    // must own the environment.
    const remote = HOSTILE_ENDPOINTS.find((h) => h.why.includes("every other harness"))!.endpoint;
    await withHatch(undefined, async () => {
      await expect(LoopbackLedger.open(remote)).rejects.toThrow(/REFUSED_NOT_LOOPBACK/);
    });
  });

  test("refuses a node that is not Devnet", async () => {
    const { server, endpoint } = fakeNode(() => ({
      info: { ...FULL_INFO.info, network_id: 1 },
    }));
    try {
      await expect(LoopbackLedger.open(endpoint)).rejects.toThrow(/REFUSED_NOT_DEVNET/);
    } finally {
      server.stop(true);
    }
  });

  test("refuses a node that is running but not yet full", async () => {
    const { server, endpoint } = fakeNode(() => ({
      info: { ...FULL_INFO.info, server_state: "connected" },
    }));
    try {
      await expect(LoopbackLedger.open(endpoint)).rejects.toThrow(/REFUSED_NODE_NOT_FULL/);
    } finally {
      server.stop(true);
    }
  });

  test("opens against a full Devnet node on loopback", async () => {
    const { server, endpoint } = fakeNode(() => FULL_INFO);
    try {
      const ledger = await LoopbackLedger.open(endpoint);
      expect(ledger.identity.buildVersion).toBe("3.3.0");
      expect(ledger.identity.networkId).toBe(2);
    } finally {
      server.stop(true);
    }
  });
});

describe("Snapshot", () => {
  test("refuses an answer that came from a different ledger than the pinned one", async () => {
    // E-103, observed live: two "validated" reads seconds apart landed in
    // different ledgers. REVIEW-016 found the Rust version asking for one
    // pinned index and never checking it.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_001, node: { Sequence: 7 }, account_data: { Sequence: 7 } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(snapshot.index).toBe(4_800_000);
      await expect(snapshot.sequenceOf("rTest")).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("reads ConfidentialOutstandingAmount from a STRING, not a number", async () => {
    // ⚠ rippled serialises every UINT64 as a JSON string. Reading it with a
    // numeric helper sees every value as absent — and a preflight check that
    // always passes looks identical to one that works. This is the control the
    // signer has for the same field; the facility needs its own.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return {
        ledger_index: 4_800_000,
        node: {
          LedgerEntryType: "MPTokenIssuance",
          Issuer: "rBank",
          ConfidentialOutstandingAmount: "12345",
          IssuerEncryptionKey: "02AA",
          TransferFee: 0,
          Flags: 0,
        },
      };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      const issuance = await snapshot.issuance("00".repeat(24));
      expect(issuance.confidentialOutstandingAmount).toBe(12345);
      // The control: a reader that saw every value as zero would also pass a
      // test that only ever asserted `>= 0`.
      expect(issuance.confidentialOutstandingAmount).not.toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("a holder with no MPToken reads as null rather than as an error", async () => {
    // rippled 3.4.1 names the ledger on `entryNotFound` (measured on Devnet,
    // 2026-10-19), and the snapshot now checks it like any other answer.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_000, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      expect(await snapshot.mptoken("rNobody", "00".repeat(24))).toBeNull();
    } finally {
      server.stop(true);
    }
  });

  test("a 'not found' from a DIFFERENT ledger is refused, not read as an empty position", async () => {
    // REVIEW-058 R1-7: the negative path returned before the index check, so
    // this answer read as `null` in a snapshot pinned to 4_800_000, and the
    // observer view would have rendered an empty position. The Rust reader
    // closed the same gap in REVIEW-016 round two.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound", ledger_index: 4_800_001, validated: true };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("a 'not found' that names no ledger is refused, because it proves nothing", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "entryNotFound" };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_TORN/);
    } finally {
      server.stop(true);
    }
  });

  test("an entry of the wrong type is refused rather than read field by field", async () => {
    // An MPTokenIssuance returned where an MPToken was asked for would
    // otherwise be read for whichever fields share a name.
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { ledger_index: 4_800_000, node: { LedgerEntryType: "MPTokenIssuance", MPTAmount: "5" } };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toThrow(/REFUSED_LEDGER_MALFORMED/);
    } finally {
      server.stop(true);
    }
  });

  test("a real error is not swallowed as an absent entry", async () => {
    const { server, endpoint } = fakeNode((method) => {
      if (method === "server_info") return FULL_INFO;
      return { status: "error", error: "internal", error_message: "the node fell over" };
    });
    try {
      const snapshot = await (await LoopbackLedger.open(endpoint)).snapshot();
      await expect(snapshot.mptoken("rSomeone", "00".repeat(24))).rejects.toBeInstanceOf(
        LedgerRefusal,
      );
    } finally {
      server.stop(true);
    }
  });
});

````


## FILE: web/app/src/routes/index.tsx (complete, at commit 629f216)

````
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";

export const Route = createFileRoute("/")({
  loader: async () => {
    // ⚠ Loaders read. There is no server function here and none may be added
    // that reaches a signing operation — ADR-0003 D3 names that as exactly the
    // one-line mechanism to watch for.
    // ⚠ Identity is asserted in the ROOT route's beforeLoad, so it covers every
    // route rather than this one.
    const [meta, signer] = await Promise.all([
      api.meta().catch((e) => ({ error: String(e) })),
      api.signer().catch((e) => ({ error: String(e) })),
    ]);
    return { meta, signer };
  },
  component: Overview,
});

function Overview() {
  const { meta, signer } = Route.useLoaderData();

  return (
    <>
      <Panel title="What this is">
        <p className="text-sm leading-relaxed mb-3">
          A read-only view of confidential positions on the XRPL Devnet. It adds no{" "}
          <strong>signing</strong> authority: it never signs, never holds a key, and cannot reach
          the two signer requests that carry authority. It does not follow that it moves no
          boundary — it used to serve a decrypted issuer view and signer-local status to any
          local caller. ADR-0003 named that disclosure, and it was removed rather than guarded:
          the issuer page says whether a balance decrypted and never shows the figure.
        </p>
        <p className="text-sm leading-relaxed">
          Signing lives in a separate binary — <code>wconf-signer</code> — where the holder confirms
          each transaction against parsed fields in the signer’s own interface. That split is the
          trust boundary, and this tier is on the readable side of it.
        </p>
      </Panel>

      <Panel title="Start here">
        <p className="text-sm leading-relaxed">
          The running order, what each screen shows, what not to say, and what is missing are in{" "}
          <code className="text-xs">docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md</code>. The
          limitations note beside it is what this demonstration does <em>not</em> establish.
        </p>
        <ol className="text-sm mt-3 space-y-1 list-decimal pl-5 opacity-85">
          <li><strong>Capability matrix</strong> — what each key source can and cannot do.</li>
          <li><strong>Observer view</strong> — what anyone can read, including which zero balances are visible.</li>
          <li><strong>Issuer view</strong> — the same holder as the issuer reads it: whether its decryption succeeded, never the figure.</li>
          <li><strong>Wallet</strong> — three structural reasons a wallet cannot hold a position.</li>
          <li><strong>Custody</strong> — where confidentiality and policy controls collide.</li>
        </ol>
      </Panel>

      <Panel title="What it never claims" tone="warn">
        <ul className="text-sm space-y-2">
          {(meta.neverClaims ?? []).map((i: any) => (
            <li key={i.rule}>
              <code className="text-xs font-semibold mr-2 opacity-70">{i.rule}</code>
              {i.text}
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 mt-3">
          These are CLAIMS.md rows cited, not restated. A second copy of a claim is a second thing
          to go stale.
        </p>
      </Panel>

      <Panel title="Signer">
        {signer.reachable ? (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">version</span> <code>{signer.status.version}</code></div>
            <div><span className="opacity-60">note</span> {signer.status.note}</div>
          </div>
        ) : (
          <p className="text-sm opacity-70">
            Not reachable: {signer.reason ?? signer.error}. This is a named gap, not a failure — the
            tier is read-only and every ledger view is complete without it.
          </p>
        )}
        <p className="text-xs opacity-60 mt-3">{signer.whatThisIs}</p>
        <p className="text-xs opacity-60 mt-1">{signer.whatThisIsNot}</p>
      </Panel>
    </>
  );
}

````


## FILE: web/app/src/routes/wallet.tsx (complete, at commit 629f216)

````
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { Panel, Verdict } from "../components/Verdict";

export const Route = createFileRoute("/wallet")({
  loader: () => api.capabilities(),
  component: Wallet,
});

/**
 * Prove-and-contrast. ⚠ The contrast is the lesson: a browser wallet cannot
 * hold a confidential position, and the reasons are structural rather than
 * missing features.
 */
function Wallet() {
  const { rows, namedGaps } = Route.useLoaderData();
  const wallet = rows.find((r: any) => r.id === "browser-wallet");

  return (
    <>
      <Panel title="A browser wallet cannot hold a confidential position">
        <p className="text-sm leading-relaxed mb-4">
          This is not a feature gap in the three wallet APIs examined (Xaman, GemWallet,
          Crossmark, checked 2026-08-28). ⚠ It is <em>not</em> a claim that no wallet API
          could ever close it — an extension that derived or held an ElGamal key internally,
          and exposed a prove-and-sign operation without exporting seed material, would.
          Nothing observed does. Three reasons, each structural to the design as it stands:
        </p>
        <ol className="text-sm space-y-3 list-decimal pl-5">
          <li>
            A confidential operation needs <strong>two</strong> secrets — the ElGamal secret, to
            decrypt the balance and produce the proof, and the XRPL account key, to sign. A wallet
            supplies the second.
          </li>
          <li>
            Under the ruled key generation, the ElGamal secret is <strong>derived from the master
            seed</strong>. There is no other way to obtain it for a derived-key account.
          </li>
          <li>
            A wallet extension exists <strong>in order not to release seed material</strong>. That is
            the product, not a limitation of its API.
          </li>
        </ol>
        <p className="text-sm mt-4">
          So the operation cannot be assembled at all. The wallet is not being denied permission —
          there is nothing to grant.
        </p>
      </Panel>

      <Panel title="What a wallet CAN do">
        <div className="text-sm space-y-3">
          <div className="flex gap-3 items-start">
            <Verdict v={wallet.publicTransactions.verdict} />
            <div>
              <div className="font-medium">Ordinary XRPL transactions</div>
              <p className="opacity-80">{wallet.publicTransactions.detail}</p>
              <p className="text-xs opacity-50 mt-1">{wallet.publicTransactions.citation}</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Verdict v="yes" />
            <div>
              <div className="font-medium">Prove control of an account</div>
              <p className="opacity-80">
                Which is enough to show that account’s observer view — the same view anyone with the
                address can read.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="What this page does not claim" tone="warn">
        <p className="text-sm">{namedGaps.walletCodec}</p>
        <p className="text-xs opacity-60 mt-3">
          CLAIMS.md E-206. Recorded because an earlier draft of this project’s reasoning led with
          exactly this point, and it is a version fact an upstream release could close at any time.
          The three reasons above cannot be closed by a codec release. A wallet that held the
          viewing key and produced the proofs itself would close them, and none observed does.
        </p>
      </Panel>
    </>
  );
}

````


## FILE: web/app/src/routes/issuer.tsx (complete, at commit 629f216)

````
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { Panel } from "../components/Verdict";
import { AccountPicker } from "../components/AccountPicker";

export const Route = createFileRoute("/issuer")({
  validateSearch: (s: Record<string, unknown>) => ({
    account: (s.account as string) ?? "",
    issuanceId: (s.issuanceId as string) ?? "",
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const picker = await api.accounts().catch(() => ({ accounts: [] }));
    if (!deps.account || !deps.issuanceId) return { picker, view: null };
    const view = await api.issuer(deps.account, deps.issuanceId).catch((e) => ({ error: String(e) }));
    return { picker, view };
  },
  component: Issuer,
});

function Issuer() {
  const { picker, view } = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <>
      <Panel title="A holder is never private from the issuer" tone="warn">
        <p className="text-sm leading-relaxed">
          The issuer’s decryption mirror is part of the protocol. No configuration removes it, and
          no key source changes it. This page exists because showing what the issuer sees is the
          honest counterpart to showing what the public sees — a demo of the happy path is not
          evidence of confidentiality.
        </p>
        <p className="text-xs opacity-60 mt-3">CLAIMS.md P-9.</p>
      </Panel>

      <Panel title="Choose an account">
        <AccountPicker to="/issuer" accounts={picker.accounts ?? []} current={search} />
      </Panel>

      <Panel title="Where the decryption happened" tone="warn">
        <p className="text-sm leading-relaxed">
          Not here. This page reads a file produced by a command-line tool that holds the issuer key
          and decrypts a fixed set of accounts. ⚠ <strong>There is no request on this site that
          reaches a decryption</strong>, so there is no oracle to authenticate — an earlier version
          decrypted per request and that was a defect, not a feature.
        </p>
      </Panel>

      <Panel title="Key handling">
        <p className="text-sm">
          {/* ⚠ The fallback fires before an account is picked, and it said the
              web process reads the issuer key from its environment — false
              since the snapshot design, and contradicting /api/meta's
              holdsKeys:false on the same site (CLAIMS.md E-215). */}
          {view?.keyPolicy ??
            "This process holds no issuer key and performs no decryption. A command-line tool holds the key, decrypts a fixed set of accounts and writes results; this page reads those results. There is no request here that reaches a decryption."}
        </p>
      </Panel>

      {view && !("error" in view) && (
        <Panel title="Issuer view" tone={view.available ? "warn" : "plain"}>
          {view.available ? (
            <>
              <div className="text-sm space-y-1">
                <div>
                  <span className="opacity-60">issuer decryption</span>{" "}
                  <code className="text-base font-semibold">
                    {view.decryptable ? "SUCCEEDED" : "not available"}
                  </code>{" "}
                  <span className="opacity-60">— the figure is withheld</span>
                </div>
                <div className="opacity-70">
                  read from <code>{view.mirrorField}</code>, searched [0, {view.searchedTo}]
                </div>
                <div className="opacity-70">
                  ⚠ The decrypted balance is <strong>not served by this tier</strong>. Loopback is
                  not scoped to your user account, so an unauthenticated response would hand it to
                  every local process — out of a file the producing tool writes{" "}
                  <code>mode 0600</code>. To see the figure, run the CLI:{" "}
                  <code>bun run tools/issuer-decrypt-balance.ts</code>.
                </div>
                {view.publicAmount !== undefined && (
                  <div className="opacity-70">
                    public plaintext MPT balance <code>{view.publicAmount}</code> — ⚠ a different
                    number and a different thing; do not read one as the other
                  </div>
                )}
              </div>
              <p className="text-sm mt-3">
                ⚠ The observer view shows this same holder’s balance as an opaque ciphertext. It was
                read with one key that the protocol requires to exist.
              </p>
              {view.snapshotAgeNote && (
                <p className="text-xs opacity-60 mt-2">
                  {view.snapshotAgeNote}
                  {view.snapshotAtUnix
                    ? ` Taken ${new Date(view.snapshotAtUnix * 1000).toISOString()}.`
                    : ""}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm">{view.reason}</p>
          )}
          <p className="text-sm mt-3">{view.whatThisProves}</p>
        </Panel>
      )}
      {view && "error" in view && <Panel title="Read failed"><p className="text-sm">{String(view.error)}</p></Panel>}
    </>
  );
}

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
| E-212 | ⚠⚠ **THE WEB TIER SHIPPED A DECRYPTION ORACLE, AND IT VIOLATED THE SCOPE THE SAME SESSION HAD WRITTEN HOURS EARLIER.** `web/api/issuer.ts` read `WCONF_ELGAMAL_SK` from the environment and decrypted **per request**, behind an unauthenticated `GET /api/issuer/:account/:issuanceId` — **the caller chooses the account and receives a decrypted confidential balance.** ⚠ **Architecture §6 step 8 says the tier may touch *"the issuer-view decryption tool's OUTPUT"* and may never touch *"any private key"*, and `CLAUDE.md` says the issuer-view tool is *"a single CLI command … Not a standalone application"*.** ⚠⚠ **AND `ADR-0003` NAMES THIS EXACTLY, AS ITS FOURTH ROTATION TRIGGER**: *"a tier that accepts an issuer key over HTTP has built a decryption oracle"* — written by the same session, one file over. **The trigger was written about the key ARRIVING over HTTP; the oracle is the RESULT LEAVING over HTTP, and the author read their own warning as narrower than it was.** ⚠ `/meta`'s `holdsKeys: false` was false while it ran, and **CORS is not a defence** — it constrains browsers, and `curl` is not a browser. ⚠ **A second exposure rode along**: the chosen helper `decryptInRange` spawns `mptool decrypt <ciphertext> <sk> …`, and **argv is world-readable via `ps`** — the precise exposure `tools/issuer-decrypt-balance.ts` refuses a `--key` flag to avoid, reintroduced by the helper picked to avoid a *different* problem. ⚠⚠ **`@xrplf/mpt-crypto`'s `decryptAmount` is IN-PROCESS and is what that CLI already uses**, so the better path was in the file the rule came from | **Found by Codex review 2026-08-28, three P1s, and the diagnosis was correct on all three.** **Fixed by removing the capability, not guarding it:** `tools/issuer-view-snapshot.ts` holds the key, decrypts the **curated demo set** in-process via `decryptAmount`, and writes **results**; `web/api/issuer.ts` reads that file. ⚠ **There is no request that reaches a decryption, so there is nothing to authenticate** — the attacker-chosen input is *gone*, not bounded. **Measured after the fix: with `WCONF_ELGAMAL_SK` exported into the API process, the issuer route still returns `available: false`** — the key changes nothing because no decryption path exists. The snapshot reader **refuses wholesale** any file carrying key-shaped fields. Same demo, same numbers — 75, 0, 270, 778 | A, measured |
| E-228 | ⚠⚠ **THE WEB TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY IN TWO PLACES, EACH WITH A COMMENT SAYING WHY — AND `ADR-0003`'s FALSIFIER LIST HAD NO ENTRY FOR THE SHAPE.** `signer/src/ipc.rs:105` sets `0700` on the socket directory — *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic"* — and `:128` sets `0600` on the socket; `tools/issuer-view-snapshot.ts:272` writes the decrypted-balance snapshot `mode: 0o600`. ⚠⚠ **The API re-serves the product of BOTH, unauthenticated, over a loopback listener — and loopback is NOT uid-scoped.** `GET /api/signer` returns the socket's answer **and the socket path** (`web/api/server.ts:74-78` spreads `...probe`; `signer-status.ts:43-45`); `GET /api/issuer/:account/:issuanceId` returns `decrypted` balances (`web/api/issuer.ts:162-170`); there are **zero** auth constructs in `web/api`. **A second local user who cannot `connect()` the `0600` socket and cannot `cat` the `0600` snapshot can `curl` both.** ⚠ **The rebuttal fails**: architecture §3 concedes defeat to *"an adversary who has code execution"* — **as the holder** — and this party is strictly weaker. ⚠⚠ **It is E-212's lesson applied to the KEY and not to the RESULT**: *"the trigger was written about the key ARRIVING; the oracle is the RESULT LEAVING"* — the remedy moved the key out and left the result leaving, so trigger 4 is satisfied to the letter and the property it protected is not | **Found independently by `REVIEW-036s` (from the mode bits) and `REVIEW-036b` (which drew the pipeline); the document-only leg could not see it.** `ADR-0003` rev 2 adds **trigger 5 — EGRESS**: *if this tier makes any datum reachable by a party who could not obtain it before the tier existed, the boundary has MOVED, regardless of signing, keys or computation.* ⚠⚠ **THE ROUTE ITSELF IS A RULING AND IS HANDED OVER, NOT TAKEN** — four options are priced in the ADR's *What revision 2 does not settle*, and a coding session may not choose among them | A, measured |
| E-241 | ⚠⚠ **THE ISSUER ROUTE IS RULED AND THE DISCLOSURE IS REMOVED RATHER THAN GUARDED — OPTION 2, 2026-09-05.** `GET /api/issuer/:account/:issuanceId` no longer returns `decrypted`; it reports **`decryptable`** — *whether* the issuer could read the balance — and never the figure. `GET /api/signer` no longer returns `socketPath` or the signer's `note`, which carried the holder address, the randomness-ledger generation id and its **entry count** — and `signer/src/store.rs:753-756` commits a record for *"a cancelled confirmation, a failed proof, an aborted attempt"*, so that count includes work **no observer can reconstruct**. ⚠ **This is E-212's own remedy applied one layer further**: that fix moved the KEY out and left the RESULT leaving. **There is now no request that reaches a decryption and none that returns one, so there is still nothing to authenticate.** ⚠ **What the demonstration keeps is the point it was making** — that the issuer can read any balance is proved by `IssuerEncryptedBalance` being populated on the ledger (P-9). **The plaintext integer only ever demonstrated that THIS PROJECT holds the demo issuer key**, and it lives in `tools/issuer-decrypt-balance.ts`, which is where `CLAUDE.md` says the issuer view belongs | **Falsifier: `disclosure.test.ts` — *"the decrypted balance is NEVER served, even when the snapshot has it"*, which asserts the figure appears NOWHERE in the serialised response while the public `MPTAmount` still does.** ⚠ **Verified by reverting the withholding: that test fails and it is the ONLY one that does** — a test that passes against the reverted code proves nothing. A second control asserts the withholding is not vacuous, distinguishing an absent value from a withheld one. **129 web tests, both type-checks clean.** ⚠⚠ **THIS DOES NOT MAKE THE TIER uid-SAFE; IT MAKES IT DISCLOSE NOTHING WORTH uid-PROTECTING.** `ADR-0003` trigger 5 (EGRESS) stays in the falsifier list, because the next route someone adds is where it fires again. **E-228 is closed by removal.** `ADR-0003`'s last open acceptance precondition is discharged | A, measured |
| E-309 | **The owner ruled the shape of publication on 2026-09-22: a read-only hosted demo, a squashed public history, the four filings first, and everything but the withheld file published.** The goals are a public and contributable repository, a demo deployed to Vercel, a LinkedIn post and a blog post on `nandan.me/writing`. Four decisions were put with recommendations, and each was taken. The demo stays read-only, because `ADR-0003`'s standing property is that the tier never signs, and a hosted signer or keys in the page would reopen `ADR-0003` or `ADR-0001`. The public repository starts at a squashed publication commit, so the observations `REVIEW-039b` and `REVIEW-039c` ruled unpublishable stay out of it, and this repository remains the archive of record. The four findings E-308 ruled to file are filed before publication, which is B-28's own condition. `docs/reviews/` is published; `docs/upstream-observed-WITHHELD.md` is not. ⚠⚠ **A hosted deployment is a trust-boundary change and not a deploy step.** Architecture §6 step 8 is *falsified if* *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5 fires when a datum becomes reachable by a party who could not obtain it before. Both conditions hold for any public deployment, so the demo needs its own architecture step, an ADR and a full adversarial rotation before implementation. ⚠ The register's commit citations will not resolve in the public repository, and its README has to say so. | The owner's answers in this session on 2026-09-22, to four questions that each carried a recommendation. `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` is the plan, with the gate for each phase. Step 8's falsifier is `ARCHITECTURE-2026-08-18.md:254`; `ADR-0003`'s triggers are `docs/decisions/ADR-0003-web-tier-trust-boundary.md:146-175`, trigger 5 at `:160-168`. The two things the tier serves that a public node does not are E-228 and E-239: `/api/signer`'s signer-local status and the decrypted issuer snapshot. B-28's condition is E-294; the withheld rows are E-240. `LICENSE` is Apache-2.0 and `docs/VOCABULARY.md` carries the `tapFailHard` translation. Not decided here: the licence terms, the public repository's name and owner, whether the vocabulary translation reaches `docs/reviews/`, and whether CI can run the signer's suite, which needs the vendored build environment | A, recorded |
| E-319 | **The four Devnet transactions the README offers a stranger can no longer be fetched from the public Devnet endpoint, and Devnet was not reset.** On 2026-10-18, `tx` returned `txnNotFound` for all four, with `searched_all: false`. `server_info` reported rippled 3.4.1, network_id 2, and `complete_ledgers` 5171980 to 6213418, so the endpoint now keeps about a million ledgers. Two facility accounts still exist with their sequence numbers, which a reset would have erased. ⚠ `docs/NEXT-SESSION-PROMPT.md` recorded Devnet as running `3.4.0-rc5`; it reads 3.4.1 now. Whether a full-history node or an explorer still serves these transactions was not checked | `tx`, `server_info` and `account_info` against `https://s.devnet.rippletest.net:51234/`, 2026-10-18. The README's evidence block said so until the README was shortened on 2026-10-19 and the block removed; the four hashes stay in this register and in `docs/runs/` | A, executed |
| E-327 | **The hosted demo is scoped as architecture §6 step 9 and `ADR-0004`, `Proposed`, and its design rests on measurements taken on 2026-10-19.** The public Devnet JSON-RPC endpoint cannot be read from a browser page: a CORS preflight answers `400` with no `Access-Control-*` header, a `POST` answers without `Access-Control-Allow-Origin`, and a `fetch` from a Chrome page fails. Its WebSocket endpoint answered a Chrome page at `https://example.com`. ⚠ This said *"a page on each of the three origins tried"* until E-328: the other two were Bun clients supplying an `Origin` header, not pages. The endpoint is a pool, since two connections reported different `complete_ledgers`, so one snapshot must stay on one connection. The four demo accounts and their issuance exist at validated ledger 6,243,460. The ADR's first revision therefore recommended a static site whose page reads Devnet itself, and revision 2 moved that to prerendered pages (E-328). It puts four decisions to the owner: the hosting shape, a ledger-source risk acceptance for a public page, whether the page shows the issuer's decrypted figures, and how Vercel deploys. ⚠ The third reopens E-241 for a public audience: the launch plan says the snapshot *"becomes a deliberately published static artifact"*, while E-241 removed the figure from the local tier. The ADR recommends holding E-241's line, because comparing published figures with the public `ConfidentialOutstandingAmount` passes for anyone who splits that public total among holders without the key, and it names a published proof of correct decryption as the only way to show the figure. Vercel's GitHub app documents write access to a connected repository's contents and administration, which is why the ADR recommends deploying prebuilt output from the CLI. Nothing is built, and the rotation the launch plan requires has not run | `curl` to `https://s.devnet.rippletest.net:51234/` with an `OPTIONS` preflight and a `POST`, both carrying `Origin`; a Bun `WebSocket` to `wss://s.devnet.rippletest.net:51233` with `Origin: https://wconf-demo.vercel.app` and `Origin: null`; both repeated from a Chrome page at `https://example.com`; `account_info` and `ledger_entry` over JSON-RPC for the four addresses in `web/api/demo-accounts.ts`. The WASM package's verifier symbols by `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0`, where `dist/*.d.ts` has no occurrence of `verify`. What the issuer's mirror encrypts, from `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, lines 52, 245 and 707. Vercel's `docs/cli/deploy` and `docs/git/vercel-for-github`, marked updated 2026-09-18 and 2026-09-17. `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` records each | A, measured |
| E-328 | **`REVIEW-058` round one reviewed `ADR-0004` with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two false sentences on the shipped local tier.** Both external legs named the same sentence as the one most likely to be false: that trigger 5 fired only for what is put into the bundle, and that the gate could enumerate it. Visitors' requests are egress no bundle contains, and the repository leg showed Vite inlining a value from the build machine's environment. That leg also showed the reused observer computation failing in a browser on `Buffer`, two incompatible allocations of the public `ConfidentialOutstandingAmount` both passing option B's checks, and `facility/src/loopback.ts` reading a "not found" from ledger 43 as an empty position in a snapshot pinned to 42. ⚠ The Rust reader closed that gap in `REVIEW-016` round two, so two readings of one obligation had drifted; the TypeScript reader now checks a negative answer's ledger and every entry's type, as the Rust one does. The front page still promised the issuer view showed the holder *"decrypted"* six weeks after E-241 removed the figure, and the wallet page said three reasons ~~*"cannot be closed by any release"*~~ after saying a wallet holding the key would close them. Both are corrected, with the same overclaim in `ADR-0003`, and `check-disclosure-phrases` now carries all three phrases. `ADR-0004` is at revision 2 and D-H1's recommendation moved from browser reads to prerendered pages, on the Gemini leg's argument. ⚠ Both prompts told the legs the ADR recommended option B: they were written before the self leg moved D-H3 to A and were not re-read against the frozen commit, and both legs caught it. Round two is owed | `docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`, from the transcripts in `docs/reviews/REVIEW-058-packets/`, at the frozen `d764bca`. Leg A ran `gpt-6.1-sol` at `high` in a fresh clone with network; leg B ran Gemini through `agy` on an inline packet with no tools; the self leg was written before either launched. Re-measured before ruling: rippled 3.4.1's `entryNotFound` carries `ledger_index` and `validated` on Devnet; `tools/observer-harness.ts:82-83` calls `Buffer`; `tools/check-no-secrets.ts:665-683` selects files through git; Vercel's toolbar page, marked updated 2026-08-11. The three new reader tests fail against the reverted reader and pass on the fix, with 101 facility tests passing; `check-disclosure-phrases` fails on the reverted copy and passes on the fix | A, measured |
| F-23 | **A wrong ledger read is a CONFIDENTIALITY break, not a rejected transaction — and the signer cannot control which.** A `ConfidentialMPTSend` encrypts the amount to the destination's `HolderEncryptionKey` and the issuer's `IssuerEncryptionKey`, both read from the ledger. rippled verifies against the keys **it** holds — `ConfidentialMPTSend.cpp:132` takes `(*sleDestinationMPToken)[sfHolderEncryptionKey]` — so a substituted key fails the proof. It fails with **`tecBAD_PROOF`** (`ConfidentialTransfer.cpp:451`; `TER.h:371` makes it 199, a `tec`), and `Transactor.cpp:1653-1656` with `isTecClaimHardFail` (`applySteps.h:40`) **applies a `tec` to the ledger** unless the submitter set `tapFailHard`. So an adversary who controls what the signer reads gets the holder to publish the amount encrypted under a key the adversary holds, **and the failed transaction keeps it on chain**. The signer does not submit, so it does not get to set that flag | ~~**Read at source 2026-08-19.** ⚠ **Not executed**~~ — **EXECUTED 2026-08-19 and it HELD.** `tools/spike-step2-2026-08-19/f23-substituted-key.ts` built a Send encrypting the amount to an adversary's key instead of the destination's registered one. `tecBAD_PROOF`, **recorded on validated ledger 4603815**, hash `7A283EE5920EBB97AB90F4BC92B4E4E293C6DCE541A9607277D45DA4145AF160`. The amount **42 was recovered from public ledger data by the adversary**, holding only the key they supplied; **the intended destination could not decrypt it at all**. The published ciphertext is byte-identical to what was submitted. ⚠ **This is what a wrong READ costs. It is not a network attack** — nothing was compromised. Mitigated, not closed: TLS is required for any non-loopback endpoint, the signer re-reads the destination key before signing, and it checks the ledger's `HolderEncryptionKey` for **its own** account against the key it holds — **there is no such anchor for the destination's key or the issuer's** (B-15) | A, executed |
