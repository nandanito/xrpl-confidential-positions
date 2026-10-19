# ADR-0004 — The hosted demo's trust boundary

- **Status:** `Accepted`, **revision 5**. The project owner ruled D-H1 to D-H4 on
  2026-10-19, each as recommended (`CLAIMS.md` E-331). The rotation, `REVIEW-058`,
  ran three rounds and is closed; round three's fixes are reviewed by their tests
  and controls only. Nothing is built yet.
- **Revision 5, 2026-10-20.** Records the owner's rulings: H3, prerendered pages,
  with an indefinite snapshot rebuilt by hand and an isolated build machine; the
  D-H2 wording accepted as written; A, no issuer figure; and the prebuilt CLI
  deploy. Each decision below carries its ruling, and the sentences that were
  conditional on a ruling now state it.
- **Revision 4, 2026-10-19.** Round three found the wallet permanence claim at three
  more live sites, the deployment token's isolation weakened into an option, the
  reader's parity with the Rust reader still overstated, and the phrase gate blind
  to blockquotes, comments and JSX spacing (`REVIEW-058e`, `CLAIMS.md` E-330). All
  are fixed or, for the reader, documented.
- **Revision 3, 2026-10-19.** Round two reviewed round one's fixes and found three
  that had not discharged their findings: a corrected sentence that survived in a
  second section, a wallet overclaim that survived in the capability matrix, and a
  fix that dropped half of what its finding asked for (`REVIEW-058d`, `CLAIMS.md`
  E-329). It also found the ledger reader still missing one of the Rust reader's
  checks, a phrase gate that a line break defeated, and H3's costs under-priced.
  All are fixed here or in the code.
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
- **Decided by:** the project owner, 2026-10-19. D-H1 to D-H4 are priced below,
  each with the recommendation the owner took.

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

## The decision: prerendered pages, no server of ours, no visitor egress but page loads

```
Owner's machine, at build time
  └── the existing JSON-RPC reader ──► public Devnet endpoint   (one pinned snapshot for the whole build)
        └── static pages, each naming that ledger index and the date

Visitor's browser ── static files only ──► Vercel   (no functions, no middleware)
```

- **No server-side code of ours runs per request.** The deployment is static files.
  ⚠ Revision 1 said *"no code of ours"*, and the page's own script runs in every
  visitor's browser (`REVIEW-058` B1-10).
- **Every ledger value is a dated reading.** The build opens one snapshot at one
  validated index, with the reader the local tier already uses, and reads every
  entry each page needs from it; every page names that index and the date. Nothing
  refreshes it until the next build. ⚠ Revision 2 said the build read Devnet *"once
  per page"*, which is neither one read nor one snapshot per page (`REVIEW-058`
  B2-3).
- **The visitor's browser sends nothing anywhere but Vercel.** The pages are fixed:
  one per demo account, with no input, so no lookup travels in a URL.
- **The capability matrix, the custody simulation and the wallet page are static.**
  They are functions of this repository's own text (`web/api/capability.ts`,
  `web/api/custody-sim.ts`).
- **The issuer view shows no figure.** D-H3 was ruled A: the page shows
  `IssuerEncryptedBalance` present and populated under the issuance's
  `IssuerEncryptionKey`, and says the issuer can always decrypt it (P-9).

**What the hosted output may contain, by provenance.** Files built from a clean
checkout of the public repository at a named commit, with its locked dependencies,
with no environment variable admitted to the build except those named in the build
script, and with no source maps. ⚠ Revision 1 described the output as *"the static
output of the public repository's own source"* and treated that as a boundary. M11
shows a build input outside the source reaching the output, so provenance is
something the build has to enforce and the gate has to check, not a description
(`REVIEW-058` R1-3).

**The build machine is trusted, and that has to be a choice.** Installing
dependencies and building runs third-party code with the build user's file access.
An inventory of the output cannot show that the build never read a private store
or a credential. **The deployment token is never reachable while dependencies
install or the build runs; it comes in for the upload step only, whatever else is
chosen.** For the rest, build where the private stores (`~/.wconf`, `/tmp/wconf`)
are not reachable, or accept the build machine's trust by name (`REVIEW-058`
R2-10). ⚠ Revision 3 let that acceptance waive the token's isolation too (R3-2).
**Ruled 2026-10-19: isolated.** The owner did not accept the build machine's
trust, so the build runs where neither private store is reachable.

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
is the result leaving, which is E-212's lesson. That is why D-H3 is a ruling,
and it was ruled A: the output carries no issuer figure.

**Hosted exclusions.** The local tier's signer panel and its loader call
(`web/app/src/routes/index.tsx:12-15,72-85`) are absent, not merely the signer
page; ⚠ revision 1 called it a page. The `/api-doc` page describes an API that does
not exist in the hosted build and is absent too. Two false sentences found on the
local tier by round one are corrected at source: the front page promised the issuer
view showed the holder *"decrypted"*, and the wallet page said three reasons
~~*"cannot be closed by any release"*~~ after saying a wallet that held the key would
close them (`REVIEW-058` R1-4, `CLAIMS.md` E-328). ⚠ Round two found the same
permanence claim surviving in the capability matrix, which the wallet page renders
(`web/api/capability.ts`, the browser-wallet row), and it is now scoped to the
wallets examined (R2-2, E-329).

## What the hosted surface may touch, and may never touch

**May touch:** public Devnet ledger state, read from one pinned snapshot at build
time; and static content built as the provenance rule above says. ⚠ Until revision
5 this also admitted browser reads under H1 and, if D-H3 ruled it, one published
snapshot file. The owner took neither (E-331).

**May never touch:** any server-side request handler; any socket client or the
signer's socket path; any secret, seed or private key, the demo issuer key
included; any decryption routine in the shipped output; any input that asks a
visitor for a seed, a key or any secret (`REVIEW-058` S-1); any network but Devnet;
any second ledger endpoint, as a fallback or otherwise; any analytics, toolbar or
third-party script; and any account or issuance a visitor chooses, carried in a URL
the host receives (B1-2).

## The owner's decisions

### D-H1. The hosting shape

| option | cost | what it buys |
|---|---|---|
| **H3. Prerendered pages** *(recommended)* | a build step that opens one pinned snapshot with the existing reader, naming its endpoint and the remote-risk acceptance input in the build's allowlist; replacing the application's runtime dependency on the API, because every route today passes the root's `/api/meta` check and the wallet and custody loaders call the API, with data baked at build time and checked by loading each page directly and by navigating, with no API running (`REVIEW-058` R2-9); a check that each demo account exists, so a reset, a missing token and a failed read render differently; a rebuild cadence the owner names, or an accepted indefinite snapshot; a visitor cannot enter an account | no visitor request leaves Vercel; no second ledger reader; no WebSocket, reconnection or `Buffer` problem; every value is a dated reading, P-3's habit. ⚠ The build still reads one node, so D-H2's first paragraph still applies |
| H1. Static site, the visitor's browser reads Devnet | a WebSocket transport under `Snapshot`, after `loopback.ts` is refactored to separate its transport (`REVIEW-058` B1-9); a browser-safe replacement for the harness's `Buffer` helpers; snapshot integrity across reconnects; a Content Security Policy that admits the node; no loader cache reused across navigation | a visitor can look up any Devnet account. ⚠ Their IP and every lookup go to Ripple's node. Port 51233 is not 443, and networks that block other ports will fail the page (B1-1); whether a Devnet WebSocket endpoint on 443 exists has **not been searched** |
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

**Ruled 2026-10-19 by the owner: H3.** Rebuild cadence: an indefinite snapshot,
rebuilt by hand whenever the owner chooses to deploy; every page names its ledger
and date, so a stale page says how stale it is. Build machine: isolated, as the
provenance section above records.

### D-H2. The ledger-source risk acceptance for a hosted page

B-15's named risk acceptance was written for a local operator who chose their
node (E-110, extended to the facility demo by E-151). A hosted page needs its own,
and accepting a risk is the owner's act, not this document's. The proposed wording,
shown beside every ledger value:

> *This page shows the XRPL Devnet, a test network. Its tokens have no value, and
> it is reset from time to time. Each value was read from Ripple's public Devnet
> endpoint, at the ledger and date shown, and a lying or lagging server behind it
> would have made it wrong. The page does not update: it shows Devnet as it was at
> that ledger, not as it is now. Nothing on this page signs or submits. Do not use a
> value shown here to build a transaction.*
>
> *Vercel, which hosts this page, sees your IP address and the pages you open.*

Under H1 the second paragraph gains: *"Your browser also connects to the public
Devnet node operated by Ripple, which sees your IP address and every account you
look up."*

⚠ Revision 1's wording said *"no amount can be published because of it"*, which is
true of the page and not of a reader who copies a displayed key into their own
tooling, where a lying node reaches F-23 through them. It named only Ripple as a
party that sees visitors, and Vercel sees every one. It omitted that Devnet has no
value and is reset (`REVIEW-058` B1-6, B1-7, S-4). ⚠ Revision 2's wording blamed any
difference from today's ledger on a lying or lagging server, when under H3 the page
is simply a fixed reading (B2-4). The public endpoint also keeps only recent
history, about a million ledgers on 2026-10-18 (E-319), so a visitor can check the
ledger shown against it for some weeks and not after.

| option | what it means |
|---|---|
| **Accept, by name, with this wording beside every ledger value** *(recommended)* | the same shape as E-151: the risk is unmet by name, and the page says so where the value is |
| Do not accept | no hosted demo with ledger values. ⚠ Revision 1 offered H3 here as the way to avoid the acceptance, and H3 reads one node too, at build time (`REVIEW-058` S-5) |

**Ruled 2026-10-19 by the owner: accepted, by name, with the wording above as
written.** The H1 sentence does not apply, because D-H1 was ruled H3.

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

**Ruled 2026-10-19 by the owner: A.** The hosted page shows no issuer figure, and
the launch plan's snapshot sentence is superseded (E-331). C remains open and
unpriced; adding it later reopens this decision and no other.

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

**Ruled 2026-10-19 by the owner: A**, the prebuilt CLI deploy.

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
into an empty position, and the observer view would have rendered it. It now
requires, on every pinned answer, positive or negative, a numeric `ledger_index`
equal to the pinned index and `validated: true`; it tolerates only `entryNotFound`;
and it checks the type of every entry. Those are the Rust reader's checks
(`signer/src/ledger.rs`, `came_from` and `ledger_entry`), with one difference that
is documented rather than closed: this reader sees the index after JSON parsing, so
a decimal form such as `4800000.0` on the wire reads as `4800000`, where the Rust
reader refuses it. rippled sends integers, so no honest answer differs. ⚠ Revision
3 called the two readers' checks the same (`REVIEW-058` R3-3). ⚠ Round one's fix stopped
at the index of a negative answer and revision 2 called that parity; round two
found `validated` unchecked on both paths and the issuance's type check untested
(M10, `REVIEW-058` R1-7, R2-4, R2-5). Old transaction hashes are
not a foundation either, because the public endpoint stopped serving them without
a reset (E-319).

## Abuse, availability and cost

Under H3 and H1 no server-side code of ours runs per request, so there is nothing
of ours to rate limit. ⚠ This said *"nothing of ours"* in revision 2, a copy of the
sentence round one corrected two sections up (`REVIEW-058` R2-1). Static hosting still has costs: page loads and transfer count against
the owner's Vercel plan, and a flood of them can exhaust a free plan's quota or
bill a paid one. Name the plan, its limits, a spend cap if the plan offers one, and
who acts when the page goes down (`REVIEW-058` R1-11). Under H1 the node's limits
are Ripple's, and the page must render a refused, failed or rate-limited read as a
named failure, never as an empty account. Under H2 all of it becomes ours.

**Copies.** The bundle is public and anyone can host a copy that reads a node of
their choosing. Nothing prevents that. The page names its canonical address and
the repository, and that is the whole defence.

## Caching

Under H3 the pages are cached, dated observations, deliberately: each names its
ledger index and date and none claims to be current. ⚠ `REVIEW-058c` said H3 made
*"Ledger values are not cached"* true by construction, and it does the opposite
(R2-6). ⚠ Revision 1 said *"Ledger values are not
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
   D-H3 was ruled A, so no exception is admitted; a figure in the output reopens
   D-H3.
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
- the public commit the output was built from, and the gate's verdict on that
  output, rendered on the page, so a reader can tell what built it and whether it
  passed (S-8). ⚠ Revision 2 kept the commit and dropped the verdict, which the
  finding asked for (`REVIEW-058` R2-3).

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

1. ~~The owner's rulings on D-H1 to D-H4.~~ **Ruled 2026-10-19**, each as
   recommended (`CLAIMS.md` E-331).
2. ~~Round one of the rotation.~~ **Run 2026-10-19, `REVIEW-058`.** ~~Round two.~~
   **Run the same day, and its stopping condition fired**: three of round one's fixes
   had not discharged their findings (`REVIEW-058d`). ~~Round three.~~ **Run the
   same day, the last the owner's review policy allows; the rotation is closed**
   (`REVIEW-058e`). Its fixes are reviewed by their tests and controls only.
