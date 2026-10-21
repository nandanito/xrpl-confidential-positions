DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to read files, run commands or browse.

# REVIEW-059 round one, leg B — the hosted demo as BUILT and DEPLOYED

You are a code reviewer for an open-source research project, reviewing the
project's own release tooling and records for correctness. The subject is the
build of a read-only public demonstration of a confidential-token research
project: a static site, prerendered from one snapshot of a test ledger (the XRPL
Devnet), checked by a gate, and deployed to Vercel at
`https://xrpl-confidential-positions.vercel.app`. Its design was reviewed for three
rounds before any code (`REVIEW-058`). **The code that implements it has been
checked only by its own tests and controls, and by no outside reader. You are one
of the first.**

Agreement is not useful to the project owner. A finding that something holds is
useful only if you tested it against the code and say how. This project has a
history of checks that reported PASS while missing the very thing they were built
to catch, and of records that described a state the code had moved past; both
are what you are looking for.

You have the files listed at the end, each **complete** unless its header says
otherwise. They are read from the public commit
`ccf76e73bf6629b29dece98cc15a050e3f60cad4`, the commit the live site was built
from. You have no access to the repository, so where your answer depends on
something not shown, say so rather than assuming. Not included: the ledger reader
`facility/src/loopback.ts` (29 KB) and the shared page bodies under
`web/app/src/views/`; the deployed pages' visible text is included instead.

## Measurements the adjudicator took on 2026-10-20

1. `compare-deployed` against the live site: PASS at 10:39:42Z.
2. The gate on a copy of the deployed output, with the local secret store: 30/30
   controls, full sweep PASS, output digest `1332ea0a95772b12…`, the same digest
   the deployment record (E-339) names.
3. `browser-check` on that copy: PASS, 6 pages, 39 requests, all same-origin,
   footer `PASS, 18 files`.
4. The build image run with no mount sees no host path: `/Users`, `/mnt/mac`,
   `/Volumes`, `/private`, `/host` and `/run/host` are absent; the user is `node`.

## Answer all six questions, each with an explicit verdict

For each, list findings as `B1-n | HIGH/MEDIUM/LOW | claim | the passage you rely
on, quoted briefly with its file | the smallest fix`. If a question has no
finding, write `Question N: no findings` and say what you tested. Grade HIGH only
for something that would publish a false statement of fact to visitors, publish
private data, give the static page a signing or decryption path or server code,
or let the release procedure publish an output that does not meet architecture
§6 step 9's stated requirements with no later check able to notice.

1. **Ruled versus built.** `ADR-0004`'s four rulings (D-H1 to D-H4), its section
   *"What phase 2 step 4's gate must check"*, and §6 step 9's *"What it may never
   touch"* and *"Falsified if"*. Take each item in turn and say whether the code
   shown enforces it (name the check and the line), whether only a convention or a
   manual step enforces it, or whether nothing does. List every item in the last
   two classes.
2. **What each PASS means.** The gate, `browser-check.ts`, `deploy-preflight.ts`
   and `compare-deployed.ts` each print PASS, and every page's footer shows a
   visitor `PASS, 18 files`. For each, what would its reader believe, and what does
   the code establish? Where is the widest gap?
3. **The isolation claim.** `build.ts` and the `Dockerfile`. The README says the
   build runs in a container that *"cannot reach the private stores"*. What access
   does third-party dependency code that runs during the build have? What do the
   store check and the two canaries establish, and what is claimed beyond them?
4. **The records.** Of every sentence in `CLAIMS.md` E-334 to E-340, the README's
   release procedure and the gate's printed list of what it does not check, which
   single sentence is most likely false at this commit? Quote it. Then list any
   other statement the code shown contradicts.
5. **What visitors read.** The six pages' visible text, against `CLAIMS.md` P-1 to
   P-12 and `ADR-0004`'s D-H2 wording. Find any sentence that claims more than is
   delivered, states a negative without its recorded search (P-12), or is false at
   this commit.
6. **A gap in the gate, by construction.** Using only the gate's code as shown,
   describe the smallest change to the output that does not meet a requirement of
   §6 step 9 and that `runChecks()` would not report. Be concrete: the file, the
   change, and which numbered check does not fire and why.

## Then answer one more question

**The stopping condition, set before this round ran, word for word:** *"Round one
reviews the build. If it upholds any finding that changes code, a gate or a
record, round two runs on the fixes alone, and it is the last unless it finds a
fix that did not discharge its finding; a third round is then the owner's
decision."* Does anything you found argue that this condition is wrong for this
subject? Answer yes or no, and why.

End with a final line reading exactly `END OF LEG B REPORT`.

# The material


## FILE: web/hosted/README.md (complete)

````markdown
# `web/hosted/` — architecture §6 step 9, the hosted demo's build

The hosted demo is static pages, prerendered from one pinned snapshot of public Devnet state. No code of this project runs on a server when a visitor loads them: the gate fails an output that holds a function, middleware or a rewrite to another host. The decision record is `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, `Accepted` at revision 5. The owner ruled its four decisions on 2026-10-19 (`CLAIMS.md` E-331):

- **D-H1, H3.** Prerendered pages. The snapshot is kept indefinitely and rebuilt by hand. The build is isolated: it runs in a container that cannot reach the private stores.
- **D-H2.** The risk wording is accepted as written and shown beside every ledger value.
- **D-H3, A.** No issuer figure.
- **D-H4, A.** The output is built and gated locally, then deployed prebuilt from the CLI.

The pages are `web/app/src/hosted/`, a second build target beside the local tier. Four page bodies moved out of the local routes into `web/app/src/views/`, which both tiers render, so those four pages' text exists once. The overview, the issuer page and the banner have hosted texts of their own.

## The release procedure

Each step this repository owns refuses or fails loudly. Step 6 is Vercel's command.

1. **Publish the commit first.** The footer names the commit and links to it in the public repository, and step 5 refuses a commit that is not on the public `main`. Make the public update as `docs/NEXT-SESSION-PROMPT.md` describes, then build from the public clone at that commit.
2. **Build, isolated.** `make hosted-build REPO=<public clone> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<dir outside any repository>`. A container sees only a `git archive` of the commit, checks that neither private store exists, installs, takes the snapshot, builds and assembles `.vercel/output`. Two canary variables must not reach the output. `build-manifest.json` is written beside the output, not in it.
3. **Gate the output.** `make check-web-hosted OUT=<dir> COMMIT=<sha>`. This needs the local secret store. Its controls run first, each breaking a copy of the real output, and the gate prints how many passed. On a pass the gate writes `static/gate-verdict.json`, a digest of every other file, which the page's footer shows.
4. **Load it in a browser.** `make hosted-browser-check OUT=<dir>`. A headless Chrome with a fresh profile loads every page under the output's own headers. It fails on a policy violation, a request to anything but the page's origin, an exception, a page whose script never ran, or a client-side navigation that loads a new document.
5. **Preflight.** `bun run web/hosted/deploy-preflight.ts <dir>` refuses a trial build, a commit that is not on the public `main`, a missing or failed verdict, a commit mismatch and any file changed since the gate passed. It prints the deploy command.
6. **Deploy.** The owner runs the printed `vercel deploy --prebuilt --prod` with the project-scoped token present for that command only. Nothing in this repository runs it.
7. **Compare what is served.** `bun run web/hosted/compare-deployed.ts <dir> https://<name>.vercel.app` fetches every file and page and compares bytes and security headers with what the gate passed. It also requires a 404 for an unknown path and no cookie.

## The owner's one-time setup, before step 6

From `ADR-0004` D-H4 and "Abuse, availability and cost":

- A Vercel project with **no Git integration**. The Vercel GitHub app would hold write access to the public repository.
- The **Vercel toolbar off** for production and preview. The policy's `script-src` would refuse a script from another origin, and step 7 sees any change to a page's bytes; neither has been tried against the real toolbar.
- A **token scoped to the one project, with an expiry**, kept beside the publication export folder and absent from every build.
- The project's own `vercel.app` name, or a domain used for nothing else. That name is the `URL` the build takes, because the footer names it.
- The **plan, its limits, a spend cap** if the plan offers one, and **who acts when the page goes down**. The ADR asks for these to be named. For the 2026-10-20 deployment the plan is Vercel Hobby, which has no billing and so no spend to cap; the owner acts when it goes down (`CLAIMS.md` E-336, E-337).

## What these checks do not establish

The gate prints its own list. The short form:

- It reads files, so it cannot check egress. The browser check observes one browser on one run.
- The comparison in step 7 detects a change at the moment it runs, nothing later.
- Every value is a dated reading from Ripple's public Devnet endpoint, which is a pool of servers (`CLAIMS.md` E-327), under the accepted D-H2 risk. Every answer must name the one pinned, validated ledger. The reads are separate requests and are not held to one connection, so a server without that ledger fails the build rather than answering for another.

## Files

| file | what it is |
|---|---|
| `snapshot.ts` | Reads the pinned ledger at build time. It records a missing account, issuance or position as what it is, and fails on any other failed read. |
| `snapshot-types.ts` | The snapshot's shape, with no imports, so the pages can import the types without the reader. |
| `build.ts`, `Dockerfile` | The isolated build. The image is composed from two bases pinned by digest. |
| `vercel-output.ts` | Assembles Build Output API v3: static files, headers and page routes, and no functions. |
| `csp.ts` | Inline-script hashes as a browser computes them, shared by the assembler and the gate. |
| `browser-check.ts` | The headless-browser check, over the DevTools protocol. |
| `deploy-preflight.ts`, `compare-deployed.ts` | Before and after the owner's upload. |
| `pages.ts` | The six pages, one list. |
| `../../tools/check-web-hosted.ts` | The gate, run as `check-web-readonly --hosted`. |

````


## FILE: docs/decisions/ADR-0004-hosted-demo-trust-boundary.md (complete)

````markdown
# ADR-0004 — The hosted demo's trust boundary

- **Status:** `Accepted`, **revision 5**. The project owner ruled D-H1 to D-H4 on
  2026-10-19, each as recommended (`CLAIMS.md` E-331). The rotation, `REVIEW-058`,
  ran three rounds and is closed; round three's fixes are reviewed by their tests
  and controls only. ~~Nothing is built yet.~~ Built and gated 2026-10-20 (`CLAIMS.md`
  E-334), and deployed the same day; the served bytes matched the gated ones when compared (E-336); `web/hosted/README.md` is the release procedure.
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
| **H3. Prerendered pages** *(recommended)* | a build step that opens one pinned snapshot with the existing reader, naming its endpoint and the remote-risk acceptance input in the build's allowlist; replacing the application's runtime dependency on the API, because every route today passes the root's `/api/meta` check and the wallet and custody loaders call the API, with data baked at build time and checked by loading each page directly and by navigating, with no API running (`REVIEW-058` R2-9); a check that each demo account exists, so a reset, a missing token and a failed read render differently; a rebuild cadence the owner names, or an accepted indefinite snapshot; a visitor cannot enter an account | no visitor request leaves Vercel; no second ledger reader; no WebSocket, reconnection or `Buffer` problem; every value is a dated reading, P-3's habit. ⚠ The build still reads ~~one node~~ one public endpoint, a pool of servers (M3), so D-H2's first paragraph still applies. This cell said *"one node"* after `629f216` corrected the phrase elsewhere (`CLAIMS.md` E-335) |
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
who acts when the page goes down (`REVIEW-058` R1-11). Named 2026-10-20: Vercel Hobby,
which is free, has no billing and pauses a feature that exceeds its limit, so there
is no spend to cap. The owner acts when the page goes down (`CLAIMS.md` E-336, E-337). Under H1 the node's limits
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
  shaped value. ⚠ ~~**`check-no-secrets` cannot do the last part today**~~ It could not until 2026-10-20, when `--dir` was built (E-334): it selects
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

````


## FILE: docs/architecture/ARCHITECTURE-2026-08-18.md, §6 step 9 ONLY (the whole step, lines 258-273; the rest of the document is not included)

````markdown
9. **The hosted demo — a static, read-only page on a public URL.** **SCOPED AND RULED 2026-10-19; BUILT AND GATED 2026-10-20, ~~NOT DEPLOYED~~ DEPLOYED THE SAME DAY. Its rotation ran three rounds and is closed (`REVIEW-058`).** `ADR-0004` is the decision record, `Accepted` at revision 5. It carries four decisions, D-H1 to D-H4, which the project owner ruled on 2026-10-19, each as recommended: H3, with an indefinite snapshot rebuilt by hand on an isolated build machine; the D-H2 wording accepted by name; A, no issuer figure; and the prebuilt CLI deploy (`CLAIMS.md` E-331). ⚠ **A public deployment fires two of step 8's own conditions**: its falsifier *"the API binds to anything but loopback"*, and `ADR-0003`'s trigger 5, egress. The hosted page is public by design, so step 8's loopback property does not carry over to it, and this step's falsifiers replace it.

   **What the step is, in one sentence, as D-H1 was ruled:** prerendered static pages, built from one pinned snapshot of public Devnet state with the reader the local tier already uses, each naming that ledger index and the date, with no code of this project running on a server per request and nothing sent by a visitor's browser except page loads to the host. ⚠ **This said the visitor's browser would read Devnet over WebSocket until `REVIEW-058` round one**, which found that reuse failing in a browser and pricing a second reader, and found that revision 1's claim that the gate could enumerate egress was false (`CLAIMS.md` E-328).

   **It is a second build target, not a replacement.** Step 8's local tier stays as it is. Its signer panel and `/api-doc` page are absent from the hosted build.

   **What this step may touch:** public Devnet ledger state, read at build time; and files built from a clean checkout of the public repository at a named commit, with its locked dependencies, named build variables only and no source maps, on a machine where `~/.wconf` and `/tmp/wconf` are not reachable. ⚠ Until revision 11 this also admitted browser reads under H1 and one issuer snapshot if D-H3 ruled it; the owner took neither (`CLAIMS.md` E-331).

   **What it may never touch:** any server-side request handler; any socket client or the signer's socket path; any secret, seed or private key, the demo issuer key included; any decryption routine in the shipped output; any input asking a visitor for a secret; any network but Devnet; any second ledger endpoint, as a fallback or otherwise; any analytics, toolbar or third-party script; and any account a visitor chooses, carried in a URL the host receives.

   **Its gate is a hosted part of `tools/check-web-readonly.ts`, run over the UPLOADED OUTPUT DIRECTORY and its routing configuration rather than the source**, verified by breaking it in both directions. `ADR-0004` lists what it must check. ⚠ It cannot check egress. ~~`check-no-secrets` has no directory mode yet, so the scan it relies on does not exist (`REVIEW-058` R1-9).~~ The directory mode exists since 2026-10-20 and the gate runs it (`CLAIMS.md` E-334).

   **Built 2026-10-20 (`CLAIMS.md` E-334).** `web/hosted/README.md` is the release procedure: an isolated container build from a commit, the gate (`check-web-readonly --hosted`), a headless-browser check under the output's own policy, a preflight, the owner's deploy and a comparison of what is served. ~~⚠ **Not deployed.** The gate fails on the current output until the owner rules on the email address in a bundled package's licence notice, and the deploy needs the owner's Vercel project and token.~~ ⚠ The owner ruled the email redacted (E-335), and this sentence stood until the deploy. **Deployed 2026-10-20** at `https://xrpl-confidential-positions.vercel.app`, from the public commit `34ed67a`, and what was served matched what the gate passed when compared that day (`CLAIMS.md` E-336).

   *Falsified if:* the shipped output contains a server function, an API route, a serverless function or middleware, in its files or its routing configuration; or contains a socket client, the signer socket path, a decryption routine or a secret-shaped value; or contains any file the provenance rule does not admit; or asks a visitor for a seed, a key or a secret; or permits a connection to anything but its named targets; or renders a ledger value without the risk wording, the network check and the ledger index it was read at; or renders a failed or negative read that cannot be placed in the pinned ledger as an empty account, or substitutes another source; or carries a visitor's lookup in a URL the host receives; or publishes an issuer figure, which D-H3 ruled out; or ships bytes or headers other than the ones the gate passed; or does not render the commit it was built from and the gate's verdict on it. *Also falsified if:* any of step 8's wording falsifiers holds on the hosted page.


````


## FILE: CLAIMS.md — its header, then rows P-1 to P-12 and E-327 to E-338 at the public commit, then E-339 and E-340 from the private archive (complete rows)

````markdown
# CLAIMS register

⚠ **`tapFailHard` in this document is THIS PROJECT'S SHORTHAND and appears zero times in rippled** — the real names are `fail_hard` (the RPC parameter) and `TapFailHard` (the internal apply flag). See [`docs/VOCABULARY.md`](docs/VOCABULARY.md). The code always used the real one.

**The register.** Every capability claim in a README, demo, post or conversation gets an entry here with the test result or primary citation that supports it. **Before publishing anything, diff the new claims against this register.**

**Human-gated checklist, not automation.** CI cannot judge whether prose overclaims. Do not add a CI job and call it solved.

| | |
|---|---|
| **Navigate** | [`docs/CLAIMS-INDEX.md`](docs/CLAIMS-INDEX.md) — one line per row, generated. ⚠ Do not hand-edit it; `make check-claims-index` fails if it drifts. |
| **Statuses** | `SUPPORTED` evidence attached · `PENDING` asserted, evidence not attached, **may not be published** · `BLOCKED` never claim · `RETRACTED` was claimed, found wrong — **keep the row** |
| **Sections** | [Standing prohibitions](#standing-prohibitions--never-claim) · [Established](#established) · [Pending](#pending--asserted-not-yet-supportable) · [Findings](#findings--verified-file-upstream-before-publishing) · [Retracted](#retracted) |
| **History** | [Revision history](#revision-history) — moved to the end 2026-09-04. ⚠ It was **5,358 characters of unbroken prose above the first heading**, so nothing in this file was visible without scrolling past it. |

---
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
| E-327 | **The hosted demo is scoped as architecture §6 step 9 and `ADR-0004`, `Proposed`, and its design rests on measurements taken on 2026-10-19.** The public Devnet JSON-RPC endpoint cannot be read from a browser page: a CORS preflight answers `400` with no `Access-Control-*` header, a `POST` answers without `Access-Control-Allow-Origin`, and a `fetch` from a Chrome page fails. Its WebSocket endpoint answered a Chrome page at `https://example.com`. ⚠ This said *"a page on each of the three origins tried"* until E-328: the other two were Bun clients supplying an `Origin` header, not pages. The endpoint is a pool, since two connections reported different `complete_ledgers`, so one snapshot must stay on one connection. The four demo accounts and their issuance exist at validated ledger 6,243,460. The ADR's first revision therefore recommended a static site whose page reads Devnet itself, and revision 2 moved that to prerendered pages (E-328). It puts four decisions to the owner: the hosting shape, a ledger-source risk acceptance for a public page, whether the page shows the issuer's decrypted figures, and how Vercel deploys. ⚠ The third reopens E-241 for a public audience: the launch plan says the snapshot *"becomes a deliberately published static artifact"*, while E-241 removed the figure from the local tier. The ADR recommends holding E-241's line, because comparing published figures with the public `ConfidentialOutstandingAmount` passes for anyone who splits that public total among holders without the key, and it names a published proof of correct decryption as the only way to show the figure. Vercel's GitHub app documents write access to a connected repository's contents and administration, which is why the ADR recommends deploying prebuilt output from the CLI. Nothing is built. ⚠ This row said the rotation had not run; round one ran the same day (E-328), and round two after it (E-329) | `curl` to `https://s.devnet.rippletest.net:51234/` with an `OPTIONS` preflight and a `POST`, both carrying `Origin`; a Bun `WebSocket` to `wss://s.devnet.rippletest.net:51233` with `Origin: https://wconf-demo.vercel.app` and `Origin: null`; both repeated from a Chrome page at `https://example.com`; `account_info` and `ledger_entry` over JSON-RPC for the four addresses in `web/api/demo-accounts.ts`. The WASM package's verifier symbols by `grep` over `node_modules/@xrplf/mpt-crypto@0.1.0`, where `dist/*.d.ts` has no occurrence of `verify`. What the issuer's mirror encrypts, from `XLS-0096-confidential-mpt/README.md` at `58ccd3047`, lines 52, 245 and 707. Vercel's `docs/cli/deploy` and `docs/git/vercel-for-github`, marked updated 2026-09-18 and 2026-09-17. `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` records each | A, measured |
| E-328 | **`REVIEW-058` round one reviewed `ADR-0004` with three differed legs and found its central sentence false, a gap in the facility's ledger reader, and two false sentences on the shipped local tier.** Both external legs named the same sentence as the one most likely to be false: that trigger 5 fired only for what is put into the bundle, and that the gate could enumerate it. Visitors' requests are egress no bundle contains, and the repository leg showed Vite inlining a value from the build machine's environment. That leg also showed the reused observer computation failing in a browser on `Buffer`, two incompatible allocations of the public `ConfidentialOutstandingAmount` both passing option B's checks, and `facility/src/loopback.ts` reading a "not found" from ledger 43 as an empty position in a snapshot pinned to 42. ⚠ The Rust reader closed that gap in `REVIEW-016` round two, so two readings of one obligation had drifted; the TypeScript reader now checks a negative answer's ledger and every entry's type, as the Rust one does. The front page still promised the issuer view showed the holder *"decrypted"* six weeks after E-241 removed the figure, and the wallet page said three reasons ~~*"cannot be closed by any release"*~~ after saying a wallet holding the key would close them. Both are corrected, with the same overclaim in `ADR-0003`, and `check-disclosure-phrases` now carries all three phrases. `ADR-0004` is at revision 2 and D-H1's recommendation moved from browser reads to prerendered pages, on the Gemini leg's argument. ⚠ Both prompts told the legs the ADR recommended option B: they were written before the self leg moved D-H3 to A and were not re-read against the frozen commit, and both legs caught it. Round two is owed | `docs/reviews/REVIEW-058c-adjudication-round-one-2026-10-19.md`, from the transcripts in `docs/reviews/REVIEW-058-packets/`, at the frozen `d764bca`. Leg A ran `gpt-6.1-sol` at `high` in a fresh clone with network; leg B ran Gemini through `agy` on an inline packet with no tools; the self leg was written before either launched. Re-measured before ruling: rippled 3.4.1's `entryNotFound` carries `ledger_index` and `validated` on Devnet; `tools/observer-harness.ts:82-83` calls `Buffer`; `tools/check-no-secrets.ts:665-683` selects files through git; Vercel's toolbar page, marked updated 2026-08-11. The three new reader tests fail against the reverted reader and pass on the fix, with 101 facility tests passing; `check-disclosure-phrases` fails on the reverted copy and passes on the fix | A, measured |
| E-329 | **`REVIEW-058` round two reviewed round one's fixes and its stopping condition fired: three fixes had not discharged their findings, all found by the leg that swept the whole tree.** A sentence corrected in one section of `ADR-0004` survived in another, the capability matrix still said no different wallet API could close the gap the wallet page had just conceded, and the fix for the self leg's own S-8 kept the commit and dropped the gate's verdict it asked for. ⚠ The leg given the documents inline ruled every fix discharged, and found other things: four findings never cited where the adjudication said all were, a regraded count of six that was five, a build described as reading Devnet once per page, and visitor wording that blamed staleness on a lying server. The ledger reader still lacked the Rust reader's `validated` check on both paths, accepted a string or a `ledger_current_index` as the index, and had an untested issuance type check; it now ~~matches the Rust checks~~ makes them, except that a decimal-form index reads as an integer here (E-330), and six mutations each turn a test red. `check-disclosure-phrases` matched within one line, so both false sentences passed once wrapped; it now flattens whitespace, ~~scopes the wallet phrases to their subject~~ scopes one of the two wallet phrases (E-330 scoped the other), and carries three new controls. ⚠ Two phrases here were struck by round three, which found both overstated. H3's costs now include replacing the application's runtime API dependency, the build machine's trust, a reset check and a rebuild cadence. Round three is owed and is the last the owner's review policy allows | `docs/reviews/REVIEW-058d-adjudication-round-two-2026-10-19.md`, from the transcripts in `docs/reviews/REVIEW-058-packets/` at the frozen `629f216`. Leg A ran `gpt-6.1-sol` at `high` in a fresh clone with network and swept the tree outside `docs/reviews/`; leg B ran Gemini through `agy` inline. Re-checked before ruling: the surviving sentence at the ADR's abuse section, `web/api/capability.ts` at the browser-wallet row, and the self notes' S-8 fix text; `grep` showed B1-1, B1-2, B1-9 and S-1 absent from revision 2. After the fixes: 107 facility tests and 129 web tests pass; the six reader mutations and the restored wrapped sentences in the real pages each fail; disabling the line-crossing fails exactly the two wrapped-copy controls | A, measured |
| E-330 | **`REVIEW-058` round three, the last the owner's review policy allows, found six more defects in round two's fixes, and the rotation is closed with its fixes reviewed only by their tests and controls.** The wallet permanence claim stood at three more live sites: the capability matrix's comment, the wallet page's own conclusion, and the web walkthrough. Revision 3 let an accepted build-machine trust waive the deployment token's isolation, which the finding had made unconditional. The reader's parity with the Rust one was still overstated: a decimal-form index such as `4800000.0` parses to an integer here and is refused there, and that difference is now documented rather than closed. One of round two's wallet phrases still had no subject, so it rejected a true sentence about another subject, and its control could not see that. A copy wrapped inside a blockquote, a comment or after JSX's `{" "}` still passed `check-disclosure-phrases`; it now drops those markers before joining lines. ⚠ The improved gate's first run found a live copy of the sentence E-224 retracted on 2026-09-02, ~~*"neither is constructible from anywhere under `web/`"*~~, still standing in `web/api/signer-status.ts`, invisible to the old scan because it wrapped across two comment lines. `ADR-0004` is at revision 4 and phase 2 waits on the owner's four rulings | `docs/reviews/REVIEW-058e-adjudication-round-three-2026-10-19.md`, from the transcripts in `docs/reviews/REVIEW-058-packets/` at the frozen `29fc4eb`; one Codex leg, `gpt-6.1-sol` at `high`, in a fresh clone with network. Re-checked before ruling: `web/api/capability.ts:75-77`, `web/app/src/routes/wallet.tsx:44-46` and `docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md:39`, and the phrase entry at `tools/check-disclosure-phrases.ts`. After the fixes: the gate passes with 22 phrases under 14 controls; removing the marker stripping, the JSX normalisation or the wallet phrase's subject each fails exactly the control written for it; the JSX-wrapped copy installed in the real front page fails the gate | A, measured |
| E-331 | **The project owner ruled `ADR-0004`'s four decisions on 2026-10-19, each as recommended, and the ADR is `Accepted` at revision 5.** D-H1 is H3, prerendered pages from one pinned snapshot, with an indefinite snapshot rebuilt by hand and an isolated build machine, so the build runs where `~/.wconf` and `/tmp/wconf` are not reachable. D-H2 accepts the hosted risk wording by name, as written. D-H3 is A: the hosted page shows no issuer figure, which holds E-241's line and supersedes the launch plan's sentence that the issuer snapshot is *"the point of the demo"*; the plan's exit no longer asks for a published snapshot. D-H4 is the prebuilt CLI deploy. The owner also ruled the branch merged and pushed to the archive, a public update carrying `REVIEW-058`'s code fixes, and D8's C not yet. Phase 2 step 3, the build, is unblocked | The owner's answers in this session on 2026-10-19, recorded under each decision in `ADR-0004` revision 5, in architecture revision 11 §6 step 9 and in the launch plan's phase 2. Pre-flight green at `7a7c9fc` before any edit: 28 steps, all exit 0, the tree clean before and after; `cargo test` summed 21 result lines to 279 / 0 / 4 on both runs; `make ci` 236 / 5 / 0 | A, recorded |
| E-332 | **The public-update procedure ran the third-party inventory before `git add`, and the inventory reads only tracked files, so it passed on 9 projects while the files being published reproduce 12.** The 25 `REVIEW-058` files copied into the export were untracked there and went unscanned. Run in the archive, where they are committed, the same tool found review transcripts reproducing the JavaScript of `@xrplf/mpt-crypto` 0.1.0 and source from vite 8.2.2 and serde_json 1.0.151, none with a `NOTICE` entry. `NOTICE` now names the first and third, each with a byte-identical licence file in `LICENSES/`; vite's quotation is elided instead (E-333). The tool refuses while any file it would scan is untracked. Caught before anything was committed or pushed to the public repository | `bun run tools/inventory-third-party.ts --check`: in the export before `git add`, 655 files and PASS on 9 projects; in the archive at `62a3e34`, 679 files and FAIL with three missing entries; after the fix, PASS on 11. The hits were read: `round-one-codex-stderr.txt` from line 5900 is the package's context-hash module, from 9549 vite's `loadEnv`, and `round-three-codex-stderr.txt` from 7488 serde_json's `number.rs`. Controls: one appended byte in `LICENSES/serde_json-MIT.txt` fails the check, and one untracked `.md` file makes the tool exit 2 | A, measured |
| E-333 | **vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses, so a verbatim copy cannot pass both the inventory's byte-identity rule and the secret sweep's email rule.** Neither gate was loosened. The 42 transcript lines that reproduced vite source, a review leg's printout of `loadEnv` and its grep hits, are elided in place, each keeping its source line number, so the transcript's line count and the later citations into it hold. The elided lines are vite's published source at 8.2.2, re-fetchable at the path each marker names. The leg's M11 finding rests on its canary build, not on the quotation | Staging `LICENSES/vite-MIT.md`, a copy of `node_modules/vite/LICENSE.md`, failed `make check-no-secrets` with 35 email hits in that file. With the elision and no vite entry, the inventory passes on 11 projects and the sweep passes. `round-one-codex-stderr.txt` keeps 10,162 lines, and lines 9817 to 9842, which `round-two-codex-output.md` cites, are unchanged. The two local commits that briefly held the copy were rebuilt before any push, so no reachable commit contains it | A, measured |
| E-334 | **Architecture §6 step 9 is built and gated but not deployed, and the browser check caught a policy the gate had passed.** `check-no-secrets --dir` reads every file under a build output with no git filter, so an ignored `dist/` file is scanned (`REVIEW-058` R1-9). The facility reader gains a pinned existence check. The hosted pages are a second route tree that renders the local tier's page bodies and reads one build-time snapshot, with no API. `web/hosted/build.ts` builds a commit's `git archive` in a container that mounts neither private store, and two canary variables must not reach the output. The hosted gate, `check-web-readonly --hosted`, runs its controls over broken copies of the real output, then checks the output and writes a verdict the footer shows. The first assembler and the gate hashed inline scripts over the file's bytes. TanStack Start's hydration script carries NUL bytes, which the HTML parser turns into U+FFFD before the policy is checked, so every page's hydration was refused under a policy the gate had passed. `web/hosted/browser-check.ts` found it, and one shared function now hashes the parsed text, with a control that a raw-byte hash fails. seroval's licence notice, which TanStack Start bundles, names its author's personal email, and the secret sweep failed the output on it until the owner ruled (E-335) | `make ci` 262 / 5 / 0; `bun test web/hosted` 19, `web/api` 131, `facility/tests/loopback.test.ts` 39. `check-no-secrets` 111 controls, `break-no-secrets-gate` 93 probes. A trial build from the working tree read ledger 6,249,946; on its output the gate passed 28 of 28 controls and failed only on the two seroval emails, and the browser check passed six pages and 39 same-origin requests. After E-335, a trial at ledger 6,258,942 passed the gate's 30 controls and its full sweep with the local store, and the footer showed `PASS, 18 files`. Before the fix, every page reported a `script-src-elem` violation with the sample `(self.$R=self.$R\|\|{})["tsr"]`, and the file's script held two NUL bytes. Devnet, rippled 3.4.1, ledger 6,249,566: an absent account root answered `entryNotFound` with `validated: true` and the pinned index. Inside the container, Vite under Bun could not prerender, and `localhost` resolved to `::1` while the request went to `127.0.0.1`; the image runs Vite under Node, and the preview server binds `127.0.0.1` | A, measured |
| E-335 | **The owner ruled the licence email redacted and kept the CLI deploy, and `claims-check` found five overstatements in the hosted build's own README before it was published.** On 2026-10-20 the owner ruled seroval's address replaced by a marker in the shipped notice, which keeps the year and holder, and the gate now checks each notice against the package's own licence file with only addresses removed. Offered Git integration's costs, the owner kept D-H4's prebuilt CLI deploy, and said yes to publishing the step 9 code. The README called the endpoint ~~*"one public node"*~~, the phrase `629f216` corrected, which also survived in ADR-0004's D-H1 table. It also called the local tier unchanged when its routes had moved into shared views, and a commit "of the public repository" that nothing checked; the preflight now asks GitHub. Controls added: decoy stores refused in the container, a planted canary found, a request to another origin and a page whose script never ran both reported, and the footer required to show a verdict that exists. The snapshot's reads are separate requests to a pooled endpoint, where E-327 said a snapshot must stay on one connection; each answer must name the pinned validated ledger, and one that cannot fails the build | `bun run web/hosted/build.ts --self-test` and `browser-check.ts --self-test` pass, and each fails with its check removed. `gh api repos/nandanito/xrpl-confidential-positions/compare/<sha>...main` answered `ahead` for `d135eed` and 404 for an archive-only commit. `bun test web/hosted` 28. A control first restored the email at the file's header line, which changes no notice, and the gate refused its own run rather than passing it. `git grep -n "vercel deploy"` finds the command only as printed text | A, measured |
| E-336 | **Architecture §6 step 9 is deployed, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** On 2026-10-20 the owner ran `vercel deploy --prebuilt --prod` in their own terminal with a project-scoped token, which never entered this session. The output was built in the container from the public commit `34ed67a` at ledger 6,259,125. The gate passed 30 of 30 controls and its full sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The host adds headers the build does not set, among them `access-control-allow-origin: *`, which lets other origins read files that are public and carry no cookie. The deployment's own URL and the project's team alias both redirect to Vercel's login; of the addresses tried, only the alias serves the page. The owner named the plan: Vercel Hobby, which is free and has no billing; in Vercel's words, exceeding a limit means waiting 30 days in most cases, so the failure is the page going down, not a bill. Vercel restricts Hobby to non-commercial, personal use. Who acts when the page goes down is not yet named. The CLI version, the toolbar setting, whether a Git repository is connected, and a check from a machine that has never run the project were not reported to this session. ⚠ Architecture §6 step 9 still said the gate failed until the owner ruled on the email, a sentence E-335's ruling made false and its commit did not touch | `bun run web/hosted/compare-deployed.ts` against `https://xrpl-confidential-positions.vercel.app` passed on 2026-10-20: 17 files by digest, six routes, the verdict file, a 404 for an unknown path and no cookie. Two controls on copies of the output, run against the live host, failed as they should: a zeroed digest named `/observer/index.html`, and an altered policy named the header on every file. Verdict digest `f88c1d4a…bfb77`, commit `34ed67a9f2f5…`. `curl -sI` on `/` and `/gate-verdict.json` showed `access-control-allow-origin: *`, `strict-transport-security` and `cache-control: public, max-age=0, must-revalidate`; the deployment URL and the team alias each answered 302 to `vercel.com/sso-api`. Vercel's Hobby page, updated 2026-09-14: 100 GB of Fast Data Transfer and 1,000,000 CDN requests a month. The output's files total 481,661 bytes uncompressed | A, measured |
| E-337 | **The owner named who acts when the demo goes down: the owner.** On 2026-10-20 the owner said they act if the page goes down, which completes `ADR-0004`'s list for availability and cost. The owner also said the project is public and approved publishing the deploy record. The demo stays on the owner's Hobby team; the owner's paid team belongs to a different organisation. Still not reported: the CLI version that ran the deploy, the toolbar setting, and whether a Git repository is connected | The owner's messages in the session of 2026-10-20 | A, recorded |
| E-338 | **The hosted demo's text was cut by about a third and its register habits removed, with every disclosure kept; not yet deployed.** On 2026-10-20 the owner asked for the demo's text to read like the README: not verbose, and without filler. The observer page printed the public and hidden lists once per holder, four times, and now prints them once. The custody page repeated one caveat on six flows and repeated the matrix's custody row; the caveat is a numbered note and the row is gone. The issuer page said two paragraphs once per holder and now says them once. Warning marks, capitalised emphasis and remarks about the register itself are gone from the page text. Two account notes called balances non-zero, which no visitor can check, the reason the issuer page publishes no figure; they now say what the ledger shows. A matrix cell said a regular key means the master seed is not the spending authority, and now says authority may sit elsewhere. A wallet cell said three wallets sign and submit any transaction type, where the source is about what their APIs accept. ⚠ The custody page chose which reasons become flow caveats by a warning mark inside the reason's text, and no test covered it, so removing the marks would have dropped every caveat silently; it is a field now, with two tests. The D-H2 wording is unchanged, as ruled | The six pages' visible text went from 5,352 words to 3,463, both counts including the header, footer and ciphertexts. A trial build from the working tree at ledger 6,263,285 passed the gate's 30 controls and its sweep, and the browser check passed six pages and 39 same-origin requests with the footer showing `PASS`. `bun test web/api web/hosted` 161 pass; `make ci` 273 / 5 / 0. Deleting the caveat field fails the new test, and a hosted route that stops importing its shared view fails the import test. Changed tests: the zero note is matched case-insensitively, the custody notice is anchored to the first finding instead of the removed panel, the custody row matches `simulation` case-insensitively, and the shared-view import may name a second export. The signer refuses a `Send` without an `IssuerEncryptedAmount` (`signer/src/txn.rs:786-793`), which is what the new sentence that send amounts are not hidden from the issuer rests on | A, measured |
| E-339 | **The demo's shorter text is live: the owner redeployed from the public commit `ccf76e7`, and when compared on 2026-10-20 what Vercel served was byte for byte what the gate passed.** PR #17 carried E-336 to E-338 to the public repository and was fast-forwarded onto `main`. The container built `ccf76e7` at ledger 6,263,910; the gate passed 30 of 30 controls and its sweep, the browser check passed six pages and 39 same-origin requests with the footer showing `PASS, 18 files`, and the preflight found the commit on public `main`. The owner ran the deploy in their own terminal. ⚠ A check that the build carried the new text first read zero matches for phrases the gate had just counted, because the pages hold NUL bytes and `grep` treated them as binary and printed nothing; `grep -a` found every phrase | `compare-deployed` against `https://xrpl-confidential-positions.vercel.app` passed at 2026-10-20T05:28:35Z, and the served `gate-verdict.json` names `ccf76e73bf66` with digest `1332ea0a95772b12…`. Two controls on copies of the output failed against the live host as they should: a zeroed digest named `/custody/index.html`, and an altered `Referrer-Policy` named the header on every file. `check-no-secrets --strict-history` on the public repository passed 111 of 111 controls over 738 files and 861 history objects; `make ci` there 273 / 5 / 0, and the `checks` workflow passed on the PR and on `main`. `grep -ao` on the built pages: no warning marks on any page, one `Two findings`, four `Observer view: ` labels, one `Public` list | A, measured |
| E-340 | **The owner reported the rest of the deploy setup: no Git repository is connected to the Vercel project, the toolbar is off, and the deploys ran on the pinned CLI, 62.4.0.** On 2026-10-20 the owner reported all three, which completes the one-time setup in `web/hosted/README.md` for this deployment. The owner also opened the site on a phone, a machine that has never run the project, and said it works. Whether the footer there showed `PASS` was not reported at first; asked, the owner reported that it did, which completes the check. The owner will delete a stray empty project that Vercel's dashboard created, and is letting the deploy token expire as planned rather than revoking it | The owner's messages in the session of 2026-10-20. `vercel --version` on the owner's machine printed `Vercel CLI 62.4.0` the same day; that shows what is installed now, not what ran the deploys | A, recorded |

````


## FILE: tools/check-web-hosted.ts (complete)

````typescript
/**
 * check-web-hosted — architecture §6 step 9's gate: the HOSTED part of
 * `check-web-readonly`, run over the UPLOADED OUTPUT and its routing
 * configuration, never over the source (`ADR-0004`, "What phase 2 step 4's gate
 * must check").
 *
 *   bun run tools/check-web-readonly.ts --hosted <output root> --commit <sha>
 *
 * `<output root>` holds `.vercel/output/`. On a pass it writes
 * `.vercel/output/static/gate-verdict.json`, which the page's footer reads: a
 * digest of every other file, so a reader can tell what the gate passed.
 *
 * ⚠ **Gates in this repository have false-passed before they worked**
 * (`CLAIMS.md` E-165, E-182, E-226). So every run first copies the real output,
 * breaks the copy one way per control, and runs the SAME `runChecks()` over it;
 * each control names the check that must fire, and the unbroken copy must pass.
 * A control that fails stops the run with `CONTROL-FAILED`.
 *
 * ⚠ **It cannot check egress.** It reads files; a visitor's requests are not in
 * them (`ADR-0004`). `web/hosted/browser-check.ts` observes one browser's
 * requests, which is evidence about that browser and not a proof. The full list
 * of what this gate does not check is printed on every run.
 *
 * The last line is always `check-web-hosted: verdict=<WORD> exit=<N>`.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeSeed } from "ripple-address-codec";
import { SOCKET_NEEDLES, SECRET_NEEDLES } from "./web-readonly-needles.ts";
import { DH2_WORDING, DEVNET_NETWORK_ID } from "../web/app/src/hosted/wording.ts";
import { DEMO_ACCOUNTS } from "../web/api/demo-accounts.ts";
import { HOSTED_PAGES } from "../web/hosted/pages.ts";
import { inlineScripts, scriptHash } from "../web/hosted/csp.ts";
import { EMAIL_MARKER, shippedNotice } from "../web/hosted/licence-notices.ts";

const REPO = join(import.meta.dir, "..");

// ------------------------------------------------------------------ the output

/** Every file under `.vercel/output`, by path relative to it. Symlinks refused. */
export function readOutput(root: string): Map<string, Buffer> {
  const base = join(root, ".vercel", "output");
  if (!existsSync(base)) throw new Error(`${base} does not exist`);
  const files = new Map<string, Buffer>();
  const walk = (rel: string) => {
    for (const name of readdirSync(join(base, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(base, r));
      if (st.isSymbolicLink()) throw new Error(`a symlink at ${r}: the uploader may follow it`);
      if (st.isDirectory()) walk(r);
      else if (st.isFile()) files.set(r, readFileSync(join(base, r)));
      else throw new Error(`${r} is not a regular file`);
    }
  };
  walk("");
  return files;
}

const VERDICT = "static/gate-verdict.json";
const text = (b: Buffer) => b.toString("utf8");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** React escapes these in text; the wording is compared after undoing it. */
export function decodeEntities(s: string): string {
  return s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}


// ------------------------------------------------------------------ the checks

export interface Finding { check: string; detail: string }
export interface Expect { commit: string }

/** What the provenance rule admits, by path. Anything else fails. */
export const ADMITTED: RegExp[] = [
  /^config\.json$/,
  /^static\/index\.html$/,
  new RegExp(`^static/(${HOSTED_PAGES.filter(Boolean).join("|")})/index\\.html$`),
  /^static\/assets\/[A-Za-z0-9_-]+\.(js|css)$/,
  /^static\/third-party-licenses\.txt$/,
  /^static\/gate-verdict\.json$/,
];

/**
 * The packages the client bundle may contain, as its licence file lists them.
 * ⚠ A package added by a framework update fails this until the list is changed
 * in review; a cryptography, ledger or server package is never admitted.
 */
export const ADMITTED_PACKAGES = new Set([
  "@tanstack/history", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-start-client",
  "@tanstack/react-store", "@tanstack/router-core", "@tanstack/start-client-core", "@tanstack/store",
  "react", "react-dom", "scheduler", "seroval", "seroval-plugins", "use-sync-external-store", "tailwindcss",
]);

/**
 * Absolute URLs the output may contain, each with why. ⚠ None is fetched: the
 * policy's `connect-src 'self'` refuses any connection elsewhere, and this list
 * exists so a new third-party URL fails the gate rather than passing silently.
 */
export const ADMITTED_URLS: [RegExp, string][] = [
  [/^http:\/\/www\.w3\.org\/(1999\/xlink|2000\/svg|XML\/1998\/namespace|1998\/Math\/MathML)$/, "XML namespace names in React's DOM code"],
  [/^https:\/\/react\.dev\/errors\/$/, "React's error-decoder link in production messages"],
  [/^https:\/\/tailwindcss\.com$/, "Tailwind's licence banner in the stylesheet"],
  [/^http:\/\/localhost$/, "TanStack Router's fallback origin when window.origin is null"],
  [/^https:\/\/github\.com\/nandanito\/xrpl-confidential-positions(\/commit\/[0-9a-f]{40}|#run-it)?$/, "links to the public repository"],
  [/^https:\/\/s\.devnet\.rippletest\.net:51234$/, "the ledger endpoint, NAMED on the page as the source of its values"],
  [/^https:\/\/[a-z0-9-]+\.vercel\.app$/, "the canonical address the footer names"],
];

const FORMS = /<(input|textarea|select|form)\b|contenteditable/i;
const PAGE_HTML = (p: string) => (p ? `static/${p}/index.html` : "static/index.html");

export function runChecks(files: Map<string, Buffer>, want: Expect): Finding[] {
  const f: Finding[] = [];
  const add = (check: string, detail: string) => f.push({ check, detail });
  const paths = [...files.keys()].filter((p) => p !== VERDICT);
  const html = new Map(paths.filter((p) => p.endsWith(".html")).map((p) => [p, text(files.get(p)!)]));

  // 1. Inventory and provenance.
  for (const p of paths) if (!ADMITTED.some((re) => re.test(p))) add("inventory", `${p} is not admitted by the provenance rule`);
  for (const p of HOSTED_PAGES) if (!files.has(PAGE_HTML(p))) add("inventory", `the page /${p} is missing`);

  // 2. No source maps.
  for (const p of paths) if (/sourceMappingURL|\.map$/.test(p) || /[#@]\s*sourceMappingURL=/.test(text(files.get(p)!))) add("no-source-maps", `${p} carries or references a source map`);

  // 3. No server code: no function, no middleware, routes to files only.
  for (const p of paths) if (p.startsWith("functions/") || p.includes("/functions/")) add("no-server-code", `${p} is a function`);
  let config: any = null;
  try { config = JSON.parse(text(files.get("config.json") ?? Buffer.from("null"))); } catch { add("no-server-code", "config.json is not JSON"); }
  if (!config || config.version !== 3) add("no-server-code", "config.json is missing or not Build Output API version 3");
  else {
    for (const k of Object.keys(config)) if (k !== "version" && k !== "routes") add("no-server-code", `config.json has a top-level key ${k}`);
    for (const r of config.routes ?? []) {
      for (const k of Object.keys(r)) if (!["src", "dest", "headers", "continue", "handle"].includes(k)) add("no-server-code", `a route has the key ${k}`);
      if (r.handle !== undefined && r.handle !== "filesystem") add("no-server-code", `a route hands off to ${r.handle}`);
      if (r.dest !== undefined && (typeof r.dest !== "string" || !files.has(`static${r.dest}`))) add("no-server-code", `a route's dest ${JSON.stringify(r.dest)} is not a file in the output`);
    }
  }

  // 4. No socket client, signer path, decryption routine, secret name or build variable.
  const NEEDLES = [...SOCKET_NEEDLES, ...SECRET_NEEDLES, "WebAssembly", ".wasm", "ProjectivePoint", "mptool", "mpt_", "elgamal_", "VITE_", "WCONF_", "eval(", "new Function"];
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    const t = text(files.get(p)!);
    for (const n of NEEDLES) if (t.includes(n)) add("no-socket-secret-or-decryption", `${p} contains ${JSON.stringify(n)}`);
    for (const api of ["new WebSocket", "EventSource(", "sendBeacon", "XMLHttpRequest"]) if (t.includes(api)) add("no-other-connection", `${p} uses ${api}`);
  }

  // 5. Absolute URLs, against the admitted list.
  for (const p of paths) {
    if (p === "static/third-party-licenses.txt") continue;
    for (const m of text(files.get(p)!).matchAll(/\bhttps?:\/\/[A-Za-z0-9.:/#_-]+/g)) {
      const u = m[0].replace(/[.:]+$/, "");
      if (!ADMITTED_URLS.some(([re]) => re.test(u))) add("urls", `${p} names ${u}`);
    }
  }

  // 6. The Content Security Policy, as config.json delivers it.
  const first = config?.routes?.[0];
  const csp: string | undefined = first?.src === "/(.*)" && first?.continue === true ? first?.headers?.["Content-Security-Policy"] : undefined;
  if (!csp) add("csp", "the first route does not set a Content-Security-Policy on every path");
  else {
    const dirs = new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v] as const; }));
    const exact: Record<string, string[]> = {
      "default-src": ["'self'"], "style-src": ["'self'"], "img-src": ["'self'"], "font-src": ["'self'"],
      "connect-src": ["'self'"], "object-src": ["'none'"], "base-uri": ["'none'"], "form-action": ["'none'"], "frame-ancestors": ["'none'"],
    };
    for (const [k, v] of Object.entries(exact)) if (JSON.stringify(dirs.get(k) ?? null) !== JSON.stringify(v)) add("csp", `${k} is ${JSON.stringify(dirs.get(k) ?? null)}, not ${v.join(" ")}`);
    for (const k of dirs.keys()) if (!(k in exact) && k !== "script-src") add("csp", `an unexpected directive ${k}`);
    const script = dirs.get("script-src") ?? [];
    if (script[0] !== "'self'") add("csp", "script-src does not start with 'self'");
    const allowed = new Set(script.slice(1));
    for (const tok of allowed) if (!/^'sha256-[A-Za-z0-9+/]+=*'$/.test(tok)) add("csp", `script-src admits ${tok}`);
    const needed = new Set([...html.values()].flatMap((h) => inlineScripts(h).map(scriptHash)));
    for (const h of needed) if (!allowed.has(h)) add("csp", `an inline script's hash ${h} is not admitted, so the page would not run`);
    for (const h of allowed) if (!needed.has(h)) add("csp", `script-src admits ${h}, which no page carries`);
    for (const [h, v] of Object.entries({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" })) if (first.headers?.[h] !== v) add("csp", `${h} is not ${v}`);
  }
  for (const [p, h] of html) if (/\sstyle="|<style[\s>]/.test(h)) add("csp", `${p} carries inline style, which style-src 'self' refuses`);

  // 7. No input that asks a visitor for anything.
  for (const [p, h] of html) if (FORMS.test(h)) add("no-inputs", `${p} renders a form control`);

  // 8. Every page that renders a ledger value renders the wording, the network check and the index.
  const indices = new Set<string>();
  for (const [p, h] of html) {
    if (!h.includes("data-ledger-value")) continue;
    const plain = decodeEntities(h);
    for (const para of DH2_WORDING) if (!plain.includes(para)) add("ledger-wording", `${p} renders a ledger value without the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))}`);
    if (!h.includes(`data-network-id="${DEVNET_NETWORK_ID}"`)) add("ledger-wording", `${p} renders a ledger value without the Devnet network check`);
    const idx = h.match(/data-ledger-index="(\d+)"/);
    if (!idx) add("ledger-wording", `${p} renders a ledger value without the ledger index`);
    else indices.add(idx[1]);
  }
  if (indices.size > 1) add("ledger-wording", `pages name different ledgers: ${[...indices].join(", ")}`);
  for (const [p, label] of [["static/observer/index.html", "Observer view: "], ["static/issuer/index.html", "Issuer&#x27;s copy: "]] as const) {
    const n = (html.get(p) ?? "").split(label).length - 1;
    if (html.has(p) && n !== DEMO_ACCOUNTS.length) add("accounts", `${p} renders ${n} account panels, not ${DEMO_ACCOUNTS.length}`);
  }

  // 9. The commit and the verdict, on every page.
  for (const [p, h] of html) {
    if (!h.includes(`/commit/${want.commit}`)) add("commit-and-verdict", `${p} does not name commit ${want.commit}`);
    if (!h.includes("data-gate-verdict")) add("commit-and-verdict", `${p} has no gate-verdict slot`);
  }

  // 10. Licence notices for what is bundled, and nothing that should never be.
  const lic = files.get("static/third-party-licenses.txt");
  if (!lic) add("licences", "static/third-party-licenses.txt is missing");
  else {
    // Separator, `name@version (licence)`, separator, licence text: split on the
    // separator lines, so each header is followed by its own body.
    const parts = text(lic).split(/^={20,}$/m);
    const names: [string, string, string][] = [];
    for (let i = 1; i + 1 < parts.length; i += 2) {
      const head = parts[i].trim().match(/^((?:@[^/\s]+\/)?[^@\s]+)@\S+ \([^)]*\)$/);
      if (!head) { add("licences", `an entry header is malformed: ${JSON.stringify(parts[i].trim().slice(0, 60))}`); continue; }
      names.push([head[0], head[1], parts[i + 1]]);
    }
    // Each notice must be the package's own licence file with only its email
    // addresses removed (E-335), read from this checkout's node_modules at the
    // same version. A version this checkout does not hold cannot be verified.
    for (const [header, name, body] of names) {
      const root = join(REPO, "node_modules", name);
      const version = header.slice(name.length + 1, header.indexOf(" "));
      const have = existsSync(join(root, "package.json")) ? JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version : null;
      if (have !== version) { add("licences", `${name}@${version} cannot be verified: this checkout's node_modules holds ${have ?? "nothing"}`); continue; }
      if (shippedNotice(root) !== body.trim()) add("licences", `${name}'s notice is not its own licence file with only email addresses removed`);
    }
    if (names.length === 0) add("licences", "the licence file lists no package");
    for (const [, name, body] of names) {
      if (!ADMITTED_PACKAGES.has(name)) add("licences", `the bundle contains ${name}, which is not admitted`);
      if (body.trim().length < 100) add("licences", `${name}'s licence text is missing or truncated`);
    }
    for (const must of ["react", "react-dom"]) if (!names.some((m) => m[1] === must)) add("licences", `${must} is bundled and not listed`);
  }
  return f;
}

// ------------------------------------------------------------------ the secret scan

/** `check-no-secrets --dir`, with the local store. Its verdict line is required. */
export function secretScan(root: string): { ok: boolean; line: string } {
  const r = Bun.spawnSync(["bun", "run", join(REPO, "tools/check-no-secrets.ts"), "--dir", join(root, ".vercel", "output")], { stdout: "pipe", stderr: "pipe" });
  const lines = r.stdout.toString().trim().split("\n");
  const last = lines[lines.length - 1] ?? "";
  return { ok: last === "check-no-secrets: verdict=PASS exit=0" && r.exitCode === 0, line: last };
}

// ------------------------------------------------------------------ controls

type Mutate = (dir: string) => void;
const out = (dir: string, p: string) => join(dir, ".vercel", "output", p);
const edit = (dir: string, p: string, fn: (s: string) => string) => writeFileSync(out(dir, p), fn(readFileSync(out(dir, p), "utf8")));
const firstJs = (dir: string) => "static/assets/" + readdirSync(out(dir, "static/assets")).find((n) => n.endsWith(".js"))!;
const editConfig = (dir: string, fn: (c: any) => void) => edit(dir, "config.json", (s) => { const c = JSON.parse(s); fn(c); return JSON.stringify(c); });

/** Each control: what it breaks, and the check that must fire. */
export const CONTROLS: [string, string, Mutate][] = [
  ["a stray file", "inventory", (d) => writeFileSync(out(d, "static/notes.txt"), "x")],
  ["a source map", "inventory", (d) => writeFileSync(out(d, "static/assets/app.js.map"), "{}")],
  ["a sourceMappingURL comment", "no-source-maps", (d) => edit(d, firstJs(d), (s) => s + "\n//# sourceMappingURL=app.js.map\n")],
  ["a missing page", "inventory", (d) => rmSync(out(d, "static/issuer/index.html"))],
  ["a serverless function", "no-server-code", (d) => { const p = out(d, "functions/api.func"); mkdirSync(p, { recursive: true }); writeFileSync(join(p, ".vc-config.json"), "{}"); }],
  ["middleware in config.json", "no-server-code", (d) => editConfig(d, (c) => c.routes.unshift({ src: "/(.*)", middlewarePath: "_middleware" }))],
  ["a rewrite to another host", "no-server-code", (d) => editConfig(d, (c) => c.routes.splice(1, 0, { src: "/x", dest: "https://example.com/x" }))],
  ["a top-level overrides key", "no-server-code", (d) => editConfig(d, (c) => (c.overrides = {}))],
  ["the signer socket path in a script", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const p="/run/wconf/signer.sock";')],
  ["a WebAssembly module", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ";WebAssembly.instantiate(x);")],
  ["a build variable inlined", "no-socket-secret-or-decryption", (d) => edit(d, firstJs(d), (s) => s + ';const v="VITE_WCONF_WEB_PORT";')],
  ["a WebSocket", "no-other-connection", (d) => edit(d, firstJs(d), (s) => s + ';new WebSocket("wss://x");')],
  ["a third-party URL", "urls", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<a href="https://analytics.example.net/x">x</a></body>'))],
  ["'unsafe-inline' in script-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")))],
  ["a widened connect-src", "csp", (d) => editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("connect-src 'self'", "connect-src 'self' https://s.devnet.rippletest.net:51234")))],
  ["an inline script the policy does not admit", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", "<script>window.x=1</script></body>"))],
  ["no policy at all", "csp", (d) => editConfig(d, (c) => delete c.routes[0].headers["Content-Security-Policy"])],
  // ⚠ The first build hashed the file's bytes; the browser hashes the parsed
  // text, refused every page's hydration script, and this gate had passed it.
  ["a script carrying NUL, admitted by its RAW hash", "csp", (d) => {
    const raw = "window.y='\u0000'";
    edit(d, "static/index.html", (s) => s.replace("</body>", `<script>${raw}</script></body>`));
    const rawHash = `'sha256-${createHash("sha256").update(raw, "utf8").digest("base64")}'`;
    editConfig(d, (c) => (c.routes[0].headers["Content-Security-Policy"] = c.routes[0].headers["Content-Security-Policy"].replace("script-src 'self'", `script-src 'self' ${rawHash}`)));
  }],
  ["an inline style attribute", "csp", (d) => edit(d, "static/index.html", (s) => s.replace("<body>", '<body><div style="color:red">x</div>'))],
  ["an input asking for a seed", "no-inputs", (d) => edit(d, "static/index.html", (s) => s.replace("</body>", '<input name="seed"></body>'))],
  ["the D-H2 wording removed from the observer page", "ledger-wording", (d) => edit(d, "static/observer/index.html", (s) => s.replace(/Vercel, which hosts this page/g, "This host"))],
  ["the network check changed", "ledger-wording", (d) => edit(d, "static/issuer/index.html", (s) => s.replace(`data-network-id="${DEVNET_NETWORK_ID}"`, 'data-network-id="0"'))],
  ["an account panel dropped", "accounts", (d) => edit(d, "static/observer/index.html", (s) => s.replace("Observer view: ", "Observed: "))],
  ["another commit on one page", "commit-and-verdict", (d) => edit(d, "static/wallet/index.html", (s) => s.replace(/\/commit\/[0-9a-f]{40}/g, "/commit/" + "0".repeat(40)))],
  ["a cryptography package bundled", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s + "\n" + "=".repeat(78) + "\n@noble/curves@1.9.7 (MIT)\n" + "=".repeat(78) + "\n" + "MIT ".repeat(40) + "\n")],
  ["the licence file removed", "licences", (d) => rmSync(out(d, "static/third-party-licenses.txt"))],
  ["a licence notice altered", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => s.replace("Permission is hereby granted", "Permission is granted"))],
  // ⚠ The LAST marker: the first is the file's header line explaining it, and
  // restoring that one changes no notice, so this control first tested nothing.
  ["a personal email restored to a notice", "licences", (d) => edit(d, "static/third-party-licenses.txt", (s) => {
    const at = s.lastIndexOf(EMAIL_MARKER);
    return at < 0 ? s : s.slice(0, at) + "someone@example.org" + s.slice(at + EMAIL_MARKER.length);
  })],
];

export function runControls(root: string, want: Expect): { run: number; failed: string[] } {
  const failed: string[] = [];
  let run = 0;
  const fresh = () => { const d = mkdtempSync(join(tmpdir(), "check-web-hosted-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  try {
    const clean = fresh(); dirs.push(clean);
    run++;
    const base = runChecks(readOutput(clean), want);
    if (base.length) failed.push(`the unbroken copy must pass, and has ${base.length} finding(s): ${base[0].check}: ${base[0].detail}`);
    for (const [name, check, mutate] of CONTROLS) {
      const d = fresh(); dirs.push(d);
      run++;
      mutate(d);
      const got = runChecks(readOutput(d), want);
      if (!got.some((x) => x.check === check)) failed.push(`${name}: expected a '${check}' finding, got ${got.length ? got.map((x) => x.check).join(", ") : "none"}`);
    }
    // The secret scan, through the same function the real check calls.
    const d = fresh(); dirs.push(d);
    run++;
    edit(d, firstJs(d), (s) => s + `;const s="${plantedSeed()}";`);
    if (secretScan(d).ok) failed.push("a seed planted in a script: check-no-secrets --dir passed it");
  } finally {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return { run, failed };
}

/** A real-entropy ed25519 seed, made at run time so this file holds none. */
function plantedSeed(): string {
  return encodeSeed(randomBytes(16), "ed25519");
}

// ------------------------------------------------------------------ disclosure

export function whatThisDoesNotCheck(): string[] {
  return [
    "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
    "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store; the isolated build is what addresses that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. A form control built in the BROWSER after hydration. The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. The licence list's COMPLETENESS beyond the module graph the build reported. A package inlined without its module path would be missed.",
  ];
}

// ------------------------------------------------------------------ main

export function verdictFile(files: Map<string, Buffer>, want: Expect, controls: number) {
  const entries = [...files].filter(([p]) => p !== VERDICT).sort(([a], [b]) => a.localeCompare(b));
  const perFile = Object.fromEntries(entries.map(([p, b]) => [p, sha256(b)]));
  return {
    verdict: "PASS",
    gate: "check-web-readonly --hosted (tools/check-web-hosted.ts)",
    checkedAt: new Date().toISOString(),
    commit: want.commit,
    controls,
    files: entries.length,
    outputDigest: sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n")),
    perFile,
    doesNotCheck: whatThisDoesNotCheck(),
  };
}

export async function runHosted(argv: string[]): Promise<number> {
  const finish = (word: string, exit: number) => { console.log(`check-web-hosted: verdict=${word} exit=${exit}`); return exit; };
  try {
    const at = argv.indexOf("--hosted"), ct = argv.indexOf("--commit");
    const root = argv[at + 1], commit = argv[ct + 1];
    if (!root || root.startsWith("--")) throw new Error("--hosted needs the output root, the directory that holds .vercel/output");
    if (!commit || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("--commit needs the full public commit id the build ran from");
    const want = { commit };
    console.log(`check-web-hosted over ${join(root, ".vercel/output")}, expecting commit ${commit}`);

    const c = runControls(root, want);
    console.log(`controls: ${c.run - c.failed.length}/${c.run} passed, each through the same runChecks() and secretScan() as the real check`);
    if (c.failed.length) { for (const x of c.failed) console.log(`  CONTROL FAILED: ${x}`); return finish("CONTROL-FAILED", 2); }

    const files = readOutput(root);
    const findings = runChecks(files, want);
    const secrets = secretScan(root);
    if (!secrets.ok) findings.push({ check: "secrets", detail: `check-no-secrets --dir: ${secrets.line}` });
    console.log(`scanned: ${[...files.keys()].filter((p) => p !== VERDICT).length} file(s); secret sweep: ${secrets.line}`);
    console.log("\nWhat this gate does NOT check:");
    for (const l of whatThisDoesNotCheck()) console.log(`  ${l}`);
    if (findings.length) {
      console.log(`\nFAILING: ${findings.length}`);
      for (const x of findings) console.log(`  ${x.check}: ${x.detail}`);
      return finish("FAIL", 1);
    }
    const v = verdictFile(files, want, c.run);
    writeFileSync(join(root, ".vercel/output", VERDICT), JSON.stringify(v, null, 2) + "\n");
    console.log(`\nwrote ${VERDICT}: ${v.files} files, output digest ${v.outputDigest}`);
    return finish("PASS", 0);
  } catch (e) {
    console.log(`REFUSED: ${String(e)}`);
    return finish("REFUSED", 2);
  }
}

if (import.meta.main) process.exit(await runHosted(process.argv.slice(2)));

````


## FILE: web/hosted/build.ts (complete)

````typescript
/**
 * The hosted demo's isolated build: `ADR-0004` D-H1 (H3), with the owner's two
 * sub-choices, ruled 2026-10-19 (`CLAIMS.md` E-331): an indefinite snapshot
 * rebuilt by hand, and an ISOLATED build machine.
 *
 *   bun run web/hosted/build.ts --repo <git repo> --commit <sha> \
 *     --canonical-url https://<name>.vercel.app --out <dir outside any repo>
 *
 * # What isolation means here
 *
 * Installing dependencies and building run third-party code with the build
 * user's file access (`ADR-0004`, the build machine). This script therefore
 * runs both inside a container that sees ONE directory: a `git archive` of the
 * named commit. Neither private store (`~/.wconf`, `/tmp/wconf`) is mounted, the
 * container checks that neither exists before it installs anything, and no
 * deployment token exists anywhere in it: D-H4's token comes in for the upload
 * only, after this script and the gate have finished.
 *
 * ⚠ **The environment is an allowlist.** The container receives only the
 * variables named below, plus two CANARIES: random values under the `VITE_` and
 * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
 * bundle; if either canary's value appears anywhere in the output, the build
 * fails.
 *
 * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
 * was built. `--worktree` exists for local trials only: it copies the working
 * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
 * `deploy.ts` refuses.
 */

import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { RISK_ACCEPTANCE_PHRASE } from "../../facility/src/loopback.ts";

/**
 * The build image: `web/hosted/Dockerfile`, whose two bases are pinned by
 * digest. Tagged by the Dockerfile's own hash, so an edit makes a new image.
 */
const DOCKERFILE = join(import.meta.dir, "Dockerfile");
export const DOCKER_CONTEXT = process.env.WCONF_DOCKER_CONTEXT ?? "orbstack";

function run(cmd: string[], opts: { cwd?: string; stdin?: Uint8Array } = {}): string {
  const r = Bun.spawnSync(cmd, { cwd: opts.cwd, stdin: opts.stdin, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.slice(0, 4).join(" ")} … failed (${r.exitCode}):\n${r.stderr.toString().slice(-2000)}`);
  return r.stdout.toString();
}

function args(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const a = { repo: get("--repo"), commit: get("--commit"), canonicalUrl: get("--canonical-url"), out: get("--out"), worktree: argv.includes("--worktree") };
  if (!a.repo || !a.out || !a.canonicalUrl) throw new Error("usage: --repo <git repo> (--commit <sha> | --worktree) --canonical-url <https origin> --out <dir>");
  if (!a.worktree && !a.commit) throw new Error("--commit is required: the build is of a commit, not a working tree");
  return a as { repo: string; commit?: string; canonicalUrl: string; out: string; worktree: boolean };
}

/** The source tree, exported into `dest`: a commit's archive, or a trial's working tree. */
function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
  mkdirSync(dest, { recursive: true });
  if (worktree) {
    const files = run(["git", "-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
    for (const f of files) if (existsSync(join(repo, f))) cpSync(join(repo, f), join(dest, f), { recursive: false, dereference: false });
    return run(["git", "-C", repo, "rev-parse", "HEAD"]).trim();
  }
  const full = run(["git", "-C", repo, "rev-parse", "--verify", `${commit}^{commit}`]).trim();
  const tar = Bun.spawnSync(["git", "-C", repo, "archive", "--format=tar", full], { stdout: "pipe", stderr: "pipe" });
  if (tar.exitCode !== 0) throw new Error(`git archive failed: ${tar.stderr.toString()}`);
  run(["tar", "-x", "-C", dest], { stdin: tar.stdout });
  return full;
}

/** Inside the container. `set -eu`, and the store checks come before anything third-party runs. */
// ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
// list, and the first version ran the next step after Vite had failed.
const CONTAINER_SCRIPT = [
  "set -eu",
  'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done',
  "bun install --frozen-lockfile",
  "mkdir -p web/hosted/.build",
  "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
  "cd web/app",
  "bunx vite build --config vite.hosted.config.ts",
  "cd /src",
  "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
].join("\n");

/** Build (or reuse) the image named by the Dockerfile's hash. */
function image(): string {
  const tag = `wconf-hosted-build:${createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex").slice(0, 16)}`;
  const have = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "image", "inspect", tag], { stdout: "ignore", stderr: "ignore" });
  if (have.exitCode !== 0) run(["docker", "--context", DOCKER_CONTEXT, "build", "-q", "-t", tag, "-f", DOCKERFILE, import.meta.dir]);
  return tag;
}

export async function build(argv: string[]) {
  const a = args(argv);
  const out = resolve(a.out);
  if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
  if (existsSync(join(out, ".vercel"))) throw new Error(`${out}/.vercel exists; use a fresh --out for each build`);
  const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
  if (out.startsWith(repoTop + "/")) throw new Error("--out must be outside the repository, so no build file lands in a tree that can be committed");

  const work = join(out, "work");
  const src = join(work, "src");
  const commit = exportSource(repoTop, src, a.worktree, a.commit);
  const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
  const env: Record<string, string> = {
    WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
    WCONF_HOSTED_COMMIT: commit,
    WCONF_HOSTED_CANONICAL_URL: a.canonicalUrl,
    ...canaries,
  };
  const IMAGE = image();
  const docker = [
    "docker", "--context", DOCKER_CONTEXT, "run", "--rm",
    "-v", `${src}:/src`, "-w", "/src",
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    IMAGE, "sh", "-c", CONTAINER_SCRIPT,
  ];
  console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
  const r = Bun.spawnSync(docker, { stdout: "pipe", stderr: "pipe" });
  writeFileSync(join(out, "container.log"), r.stdout.toString() + "\n--- stderr ---\n" + r.stderr.toString());
  if (r.exitCode !== 0) throw new Error(`the container build failed (${r.exitCode}); see ${join(out, "container.log")}`);

  cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
  const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));

  // The canaries: neither value may appear anywhere in what is uploaded.
  const leaked = leakedCanaries(join(out, ".vercel"), Object.values(canaries));
  if (leaked.length) throw new Error(`a build variable reached the output (REVIEW-058 M11): ${leaked.join(", ")}`);

  const manifest = {
    trial: a.worktree,
    commit,
    image: IMAGE,
    dockerfileSha256: createHash("sha256").update(readFileSync(DOCKERFILE)).digest("hex"),
    dockerContext: DOCKER_CONTEXT,
    builtAt: new Date().toISOString(),
    snapshot: { ledgerIndex: snapshot.source.ledgerIndex, readAt: snapshot.readAt, endpoint: snapshot.source.endpoint, canonicalUrl: snapshot.canonicalUrl },
    environment: Object.keys(env).sort(),
    canaries: "two random values, under VITE_ and WCONF_; neither appears in the output",
    isolation:
      `the container mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit"}; ` +
      "it checked /tmp/wconf and ~/.wconf absent before installing; no deployment token was present",
  };
  writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  rmSync(work, { recursive: true, force: true });
  console.log(`built ${join(out, ".vercel/output")} from ${commit} at ledger ${snapshot.source.ledgerIndex}; manifest at ${join(out, "build-manifest.json")}`);
  console.log(`next: bun run tools/check-web-readonly.ts --hosted ${out} --commit ${commit}`);
}

/** Every file under `dir` holding any of `values`. `grep` exits 1 for none, 2 for an error. */
export function leakedCanaries(dir: string, values: string[]): string[] {
  const r = Bun.spawnSync(["grep", "-rlF", ...values.flatMap((v) => ["-e", v]), dir], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode === 2) throw new Error(`grep failed: ${r.stderr.toString()}`);
  return r.exitCode === 0 ? r.stdout.toString().trim().split("\n") : [];
}

/**
 * The build's own controls, through the same container script and the same
 * leak check the build runs. Needs Docker; reads no ledger.
 */
export function selfTest(): string[] {
  const failed: string[] = [];
  const tag = image();
  // The image's own home directory, asked rather than assumed: its user is set
  // by the Dockerfile, and a hard-coded path would test the wrong directory.
  const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
  if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
  for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
    const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", "--tmpfs", store, tag, "sh", "-c", CONTAINER_SCRIPT], { stdout: "pipe", stderr: "pipe" });
    const err = r.stderr.toString();
    if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before install (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
  }
  const d = mkdtempSync(join(tmpdir(), "wconf-build-self-test-"));
  try {
    const canary = randomBytes(12).toString("hex");
    mkdirSync(join(d, "static", "assets"), { recursive: true });
    writeFileSync(join(d, "static", "assets", "app.js"), `const p = "${canary}";`);
    if (leakedCanaries(d, [canary]).length !== 1) failed.push("a canary planted in an asset was not found");
    if (leakedCanaries(d, [randomBytes(12).toString("hex")]).length !== 0) failed.push("a canary that is absent was reported");
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv.includes("--self-test")) {
    const failed = selfTest();
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  await build(process.argv.slice(2));
}

````


## FILE: web/hosted/Dockerfile (complete)

````typescript
# The hosted demo's build image (ADR-0004, the isolated build machine).
#
# Node for Vite, Bun for everything else: the toolchain the hosted build is
# developed and tested with on the host. `bunx vite` runs Vite under Node, by
# its shebang; under Bun alone the prerender step could not reach its own
# preview server. Both bases are pinned by digest, and Bun is copied out of its
# own image rather than installed from a registry at build time.
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS bun
FROM node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
USER node

````


## FILE: web/hosted/snapshot.ts (complete)

````typescript
/**
 * The hosted demo's one pinned snapshot: `ADR-0004`, architecture §6 step 9.
 *
 * Runs at BUILD time, inside the isolated build, and never in a visitor's
 * browser. It opens the reader the local tier already uses
 * (`facility/src/loopback.ts`) against ONE named endpoint under the named risk
 * acceptance, pins one validated ledger, and reads every value the hosted pages
 * render from it. It writes public ledger data only.
 *
 * ⚠ **A failed read stops the build.** A negative read the pinned ledger
 * answered (`entryNotFound`, carrying that ledger's index) is recorded as what it
 * is: a missing account, a missing position or a missing issuance. Nothing is
 * substituted (`CLAUDE.md`: a substituted source is a corrupted one), and no
 * failed read is rendered as an empty account (architecture §6 step 9's
 * falsifier).
 *
 * ⚠ **No issuer figure.** D-H3 was ruled A (`CLAIMS.md` E-331). The snapshot
 * records whether `IssuerEncryptedBalance` is present and the key it is under,
 * both ledger readings, and holds no key and decrypts nothing.
 *
 *   WCONF_ACCEPT_REMOTE_LEDGER_RISK="<the sentence>" WCONF_HOSTED_COMMIT=<sha> \
 *   WCONF_HOSTED_CANONICAL_URL=https://<name>.vercel.app bun run web/hosted/snapshot.ts <out.json>
 */

import { writeFileSync } from "node:fs";
import { LoopbackLedger, LedgerRefusal } from "../../facility/src/loopback.ts";
import { observerView } from "../api/observer.ts";
import { DEMO_ACCOUNTS, DEMO_ISSUANCE, validDemoAccounts } from "../api/demo-accounts.ts";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "../api/capability.ts";
import { walkFlows } from "../api/custody-sim.ts";
import { SNAPSHOT_SCHEMA, type HostedAccount, type HostedSnapshot } from "./snapshot-types.ts";

export { SNAPSHOT_SCHEMA };
export type { HostedAccount, HostedSnapshot };

/**
 * The one ledger endpoint the hosted build may read. ⚠ A constant, not an
 * input: a second endpoint, as a fallback or otherwise, is a rotation trigger
 * (`ADR-0004` trigger 3), so no variable can name one.
 */
export const HOSTED_ENDPOINT = "https://s.devnet.rippletest.net:51234";

/** One account at the pinned ledger. Exported for tests. */
export async function readAccount(
  snap: { accountExists(a: string): Promise<boolean>; mptoken: (a: string, i: string) => Promise<any>; issuance: (i: string) => Promise<any>; index: number },
  account: { address: string; issuanceId: string; label: string; note: string },
  issuanceExists: boolean,
): Promise<HostedAccount> {
  const base = { address: account.address, label: account.label, note: account.note };
  if (!(await snap.accountExists(account.address))) {
    return { ...base, state: "account-missing", observer: null, issuerMirror: null };
  }
  if (!issuanceExists) return { ...base, state: "issuance-missing", observer: null, issuerMirror: null };
  const mpt = await snap.mptoken(account.address, account.issuanceId);
  if (!mpt) return { ...base, state: "no-position", observer: null, issuerMirror: null };
  const observer = await observerView(snap as any, account.address, account.issuanceId);
  return {
    ...base,
    state: "present",
    observer,
    issuerMirror: mpt.issuerEncryptedBalance
      ? { present: true, ciphertext: mpt.issuerEncryptedBalance }
      : { present: false },
  };
}

export async function takeSnapshot(commit: string, canonicalUrl: string, endpoint = HOSTED_ENDPOINT): Promise<HostedSnapshot> {
  if (endpoint !== HOSTED_ENDPOINT) throw new Error(`the hosted build reads ${HOSTED_ENDPOINT} and nothing else (ADR-0004 trigger 3)`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`WCONF_HOSTED_COMMIT must be a full 40-hex commit id, not ${JSON.stringify(commit)}`);
  if (!/^https:\/\/[a-z0-9.-]+\/?$/.test(canonicalUrl)) throw new Error(`WCONF_HOSTED_CANONICAL_URL must be an https origin, not ${JSON.stringify(canonicalUrl)}`);
  const accounts = validDemoAccounts();
  if (accounts.length !== DEMO_ACCOUNTS.length) throw new Error("a demo account failed its own format check; fix web/api/demo-accounts.ts");

  const ledger = await LoopbackLedger.open(endpoint);
  const snap = await ledger.snapshot();
  const readAt = new Date().toISOString();

  let issuanceExists = true;
  let iss: any = null;
  try {
    iss = await snap.issuance(DEMO_ISSUANCE);
  } catch (e) {
    if (!(e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING")) throw e;
    issuanceExists = false;
  }

  const out: HostedAccount[] = [];
  for (const a of accounts) out.push(await readAccount(snap, a, issuanceExists));

  return {
    schema: SNAPSHOT_SCHEMA,
    readAt,
    commit,
    canonicalUrl: canonicalUrl.replace(/\/$/, ""),
    source: {
      endpoint: ledger.endpoint,
      networkId: ledger.identity.networkId,
      buildVersion: ledger.identity.buildVersion,
      ledgerIndex: snap.index,
    },
    issuance: issuanceExists
      ? {
          id: DEMO_ISSUANCE,
          exists: true,
          issuer: iss.issuer,
          confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
          issuerEncryptionKey: iss.issuerEncryptionKey,
          hasAuditorKey: Boolean(iss.auditorEncryptionKey),
        }
      : { id: DEMO_ISSUANCE, exists: false },
    accounts: out,
    repositoryText: {
      capabilities: {
        rows: CAPABILITY_MATRIX,
        invariants: INVARIANTS,
        disclosures: { masterSeed: MASTER_SEED_DISCLOSURE, derivationNotPublished: DERIVATION_NOT_PUBLISHED },
        namedGaps: { walletCodec: WALLET_CODEC_GAP },
      },
      custody: walkFlows(),
    },
  };
}

if (import.meta.main) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: bun run web/hosted/snapshot.ts <out.json>");
  const snapshot = await takeSnapshot(process.env.WCONF_HOSTED_COMMIT ?? "", process.env.WCONF_HOSTED_CANONICAL_URL ?? "");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
  const states = snapshot.accounts.map((a) => `${a.label.split(" —")[0]}: ${a.state}`).join(", ");
  console.log(`snapshot: ledger ${snapshot.source.ledgerIndex} on ${snapshot.source.endpoint}, rippled ${snapshot.source.buildVersion}; ${states}`);
}

````


## FILE: web/hosted/snapshot-types.ts (complete)

````typescript
/**
 * The shape of the hosted build's snapshot, with no imports.
 *
 * ⚠ It is a separate file so the browser application can import the TYPES
 * without importing the node-side reader. `snapshot.ts` assigns its real values
 * to these types, so a change on either side that breaks the shape fails the
 * type-check rather than drifting (`CLAIMS.md` E-141's shape).
 */

export const SNAPSHOT_SCHEMA = "wconf-hosted-snapshot/1";

/** What the pinned ledger said about one demo account. */
export type AccountState = "present" | "account-missing" | "no-position" | "issuance-missing";

export interface HostedCiphertext {
  ciphertext: string;
  publiclyKnownZero: boolean;
  note: string;
}

/** `web/api/observer.ts`'s `ObserverView`, as the build serialises it. */
export interface HostedObserverView {
  account: string;
  issuanceId: string;
  publicAmount: string;
  registered: boolean;
  holderEncryptionKey?: string;
  confidentialBalanceVersion: number;
  spending: HostedCiphertext | null;
  inbox: HostedCiphertext | null;
  issuance: { issuer: string; confidentialOutstandingAmount: string; hasIssuerKey: boolean; hasAuditorKey: boolean };
  whatIsPublic: string[];
  whatIsHidden: string[];
}

export interface HostedAccount {
  address: string;
  label: string;
  note: string;
  state: AccountState;
  /** Present only when `state` is `present`. */
  observer: HostedObserverView | null;
  /** D-H3 option A: whether the mirror is on the ledger, never a figure. */
  issuerMirror: { present: boolean; ciphertext?: string } | null;
}

export interface HostedSnapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  /** When the build read the ledger, ISO 8601. */
  readAt: string;
  /** The public repository commit the build ran from. */
  commit: string;
  /**
   * The address this page is published at, which the page names so a copy
   * hosted elsewhere can be told from it (`ADR-0004`, "Copies").
   */
  canonicalUrl: string;
  source: { endpoint: string; networkId: number; buildVersion: string; ledgerIndex: number };
  issuance: {
    id: string;
    exists: boolean;
    issuer?: string;
    confidentialOutstandingAmount?: string;
    issuerEncryptionKey?: string;
    hasAuditorKey?: boolean;
  };
  accounts: HostedAccount[];
  /**
   * What the local tier's API serves from this repository's own text, baked at
   * build time so no page calls an API (`REVIEW-058` R2-9). Not ledger data.
   */
  repositoryText: {
    capabilities: { rows: any[]; invariants: any[]; disclosures: { masterSeed: string; derivationNotPublished: string }; namedGaps: { walletCodec: string } };
    custody: { flows: any[] };
  };
}

````


## FILE: web/hosted/vercel-output.ts (complete)

````typescript
/**
 * Assembles the hosted demo's upload: Vercel's Build Output API, version 3,
 * with STATIC FILES ONLY (`ADR-0004`, D-H4 ruled A: the prebuilt output is
 * what is deployed).
 *
 * ⚠ **No `functions/` directory is ever written, and `config.json` routes only
 * to files.** Code of ours running per request is `ADR-0004` rotation trigger 1;
 * the hosted gate checks both from the output, not from this file.
 *
 * ⚠ **The Content Security Policy is delivered by `config.json`'s headers**,
 * because a policy set only on a development server does not configure the CDN
 * (`REVIEW-058` R1-8). The framework emits inline scripts for hydration, and
 * each is admitted by its SHA-256 hash rather than by `'unsafe-inline'`.
 *
 *   bun run web/hosted/vercel-output.ts <vite client dir> <output root>
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { HOSTED_PAGES } from "./pages.ts";
import { inlineScripts, scriptHash } from "./csp.ts";

/** The pages below the root, each a directory's index.html. */
const PAGES = HOSTED_PAGES.filter(Boolean);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}


/** The policy, given every inline script the pages carry. Exported for the gate. */
export function contentSecurityPolicy(hashes: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(hashes)].sort().join(" ")}`.trim(),
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function assemble(clientDir: string, root: string): { files: number; hashes: number } {
  if (!existsSync(join(clientDir, "index.html"))) throw new Error(`${clientDir} has no index.html; is it the hosted build's client output?`);
  for (const p of PAGES) {
    if (!existsSync(join(clientDir, p, "index.html"))) throw new Error(`the page /${p} was not prerendered`);
  }
  const out = join(root, ".vercel", "output");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "static"), { recursive: true });
  cpSync(clientDir, join(out, "static"), { recursive: true, dereference: false });

  const files = walk(join(out, "static"));
  const hashes = files.filter((f) => f.endsWith(".html")).flatMap((f) => inlineScripts(readFileSync(f, "utf8")).map(scriptHash));

  const headers = {
    "Content-Security-Policy": contentSecurityPolicy(hashes),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  };
  const config = {
    version: 3,
    routes: [
      { src: "/(.*)", headers, continue: true },
      // Each page is a directory's index.html; named explicitly rather than
      // relying on the host's directory-index behaviour.
      ...PAGES.map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })),
      { handle: "filesystem" },
    ],
  };
  writeFileSync(join(out, "config.json"), JSON.stringify(config, null, 2) + "\n");
  return { files: files.length, hashes: new Set(hashes).size };
}

if (import.meta.main) {
  const [clientDir, root] = process.argv.slice(2);
  if (!clientDir || !root) throw new Error("usage: bun run web/hosted/vercel-output.ts <vite client dir> <output root>");
  const r = assemble(clientDir, root);
  console.log(`assembled ${relative(process.cwd(), join(root, ".vercel/output"))}: ${r.files} static files, ${r.hashes} inline-script hashes in the policy`);
}

````


## FILE: web/hosted/csp.ts (complete)

````typescript
/**
 * Inline-script hashes as a BROWSER computes them, shared by the output
 * assembler and the hosted gate so the two cannot disagree.
 *
 * ⚠ **A hash over the file's bytes is not the hash the browser checks.** The
 * HTML parser normalises line endings before tokenising and replaces every NUL
 * in script text with U+FFFD, and the policy is checked against the PARSED
 * text. TanStack Start's hydration script carries NUL bytes (`i:"\0\0"` in the
 * router's serialised state), so the first build hashed the raw bytes, the
 * browser refused the script on every page, and hydration failed. The gate
 * passed it; `web/hosted/browser-check.ts` caught it.
 */
import { createHash } from "node:crypto";

/** Every inline script's raw body in one HTML document. */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** The script's text after HTML input-stream preprocessing and script-data tokenisation. */
export function parsedScriptText(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\u0000/g, "\uFFFD");
}

/** The CSP source expression that admits this inline script. */
export function scriptHash(raw: string): string {
  return `'sha256-${createHash("sha256").update(parsedScriptText(raw), "utf8").digest("base64")}'`;
}

````


## FILE: web/hosted/browser-check.ts (complete)

````typescript
/**
 * The hosted demo in a real browser, under its real policy: `ADR-0004` step 4.
 *
 *   bun run web/hosted/browser-check.ts <output root>
 *
 * Serves `<output root>/.vercel/output` the way its `config.json` says (every
 * response carries the first route's headers, the page routes rewrite to their
 * `index.html`, everything else is a file or a 404), opens each page in a
 * headless Chrome with a fresh profile, and FAILS on:
 *
 *   - any Content Security Policy violation, which is how a hash the gate
 *     computed and a script the browser runs would disagree;
 *   - any request to anything but the page's own origin;
 *   - any uncaught exception or console error other than the expected 404
 *     for a missing verdict file;
 *   - a page whose script never ran, read from the footer's verdict slot,
 *     which only the page's own script changes;
 *   - a client-side navigation that loads a new document or does not render.
 *
 * ⚠ **This observes ONE browser on ONE run.** It is evidence about what the
 * pages request, not a proof about every browser, and it says nothing about
 * what the host adds after upload (`ADR-0004`; the gate's own "does not check"
 * list, items 1 and 2).
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";

const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", txt: "text/plain; charset=utf-8",
};

/** A local stand-in for the host, from the output's own config.json. */
export function serveOutput(root: string) {
  const base = join(root, ".vercel", "output");
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const headers: Record<string, string> = config.routes[0].headers;
  const rewrites: [RegExp, string][] = config.routes.filter((r: any) => r.dest).map((r: any) => [new RegExp(r.src), r.dest]);
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      let path = new URL(req.url).pathname;
      for (const [re, dest] of rewrites) if (re.test(path)) { path = dest; break; }
      if (path === "/") path = "/index.html";
      const file = join(base, "static", path);
      if (!file.startsWith(join(base, "static")) || !existsSync(file) || !statSync(file).isFile()) return new Response("not found", { status: 404, headers });
      const ext = file.slice(file.lastIndexOf(".") + 1);
      return new Response(Bun.file(file), { headers: { ...headers, "Content-Type": TYPES[ext] ?? "application/octet-stream" } });
    },
  });
}

/** A minimal DevTools-protocol client over one WebSocket. */
class Cdp {
  private id = 0;
  private waiting = new Map<number, (v: any) => void>();
  readonly events: { method: string; params: any; sessionId?: string }[] = [];
  private constructor(private ws: WebSocket) {
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data));
      if (msg.id !== undefined) this.waiting.get(msg.id)?.(msg);
      else this.events.push(msg);
    };
  }
  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    return new Cdp(ws);
  }
  async send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    const id = ++this.id;
    const reply = new Promise<any>((ok) => this.waiting.set(id, ok));
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    const r = await reply;
    if (r.error) throw new Error(`${method}: ${JSON.stringify(r.error)}`);
    return r.result;
  }
  close() { this.ws.close(); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function browserCheck(root: string): Promise<{ problems: string[]; pages: number; requests: number; footer: string | null }> {
  const server = serveOutput(root);
  const origin = `http://127.0.0.1:${server.port}`;
  const profile = mkdtempSync(join(tmpdir(), "wconf-browser-check-"));
  const chrome = Bun.spawn([CHROME, "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
    "--disable-component-update", "--disable-sync", "about:blank"], { stdout: "ignore", stderr: "ignore" });
  const problems: string[] = [];
  let requests = 0;
  let footer: string | null = null;
  try {
    let port = "";
    for (let i = 0; i < 100 && !port; i++) {
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0];
      else await sleep(100);
    }
    if (!port) throw new Error("Chrome did not open a DevTools port");
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m: string, p: any = {}) => cdp.send(m, p, sessionId);
    for (const d of ["Page", "Network", "Runtime", "Log"]) await s(`${d}.enable`);
    // Runs before the page's own scripts, and is not itself subject to the page's policy.
    await s("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__violations=[];document.addEventListener('securitypolicyviolation',e=>window.__violations.push(e.violatedDirective+' '+e.blockedURI));",
    });
    const evalJs = async (expr: string) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

    for (const page of HOSTED_PAGES) {
      const before = cdp.events.length;
      await s("Page.navigate", { url: `${origin}/${page}` });
      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
      await sleep(1200);
      const ev = cdp.events.slice(before);
      for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
        requests++;
        const u = e.params.request.url as string;
        if (!u.startsWith(origin + "/")) problems.push(`/${page}: a request to ${u}`);
      }
      const violations = await evalJs("window.__violations");
      for (const v of violations ?? []) problems.push(`/${page}: CSP violation ${v}`);
      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`/${page}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
      for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
        const t: string = e.params.entry.text ?? "";
        // Two same-origin 404s are expected: the verdict file before the gate
        // has written it, and the favicon a browser asks for unprompted.
        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`/${page}: console error ${t} (${e.params.entry.url ?? "no url"})`);
      }
      const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
      if (page === "") footer = slot;
      // With a verdict file beside the pages, the footer must show the pass it records.
      if (slot !== null && existsSync(join(root, ".vercel/output/static/gate-verdict.json")) && !/^PASS, /.test(slot)) problems.push(`/${page}: a verdict file exists and the footer shows ${JSON.stringify(slot)}`);
      if (slot === null) problems.push(`/${page}: no gate-verdict slot`);
      else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
    }

    // Client-side navigation: one link, no new document, the target renders.
    await s("Page.navigate", { url: `${origin}/` });
    await sleep(1500);
    const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
    await sleep(1200);
    const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
    const path = await evalJs("location.pathname");
    const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
    if (path !== "/observer" || !rendered) problems.push(`client navigation to /observer did not render (path ${path}, rendered ${rendered})`);
    if (docsAfter !== docsBefore) problems.push("client navigation loaded a new document; the router did not hydrate");
    cdp.close();
  } finally {
    chrome.kill();
    server.stop(true);
    rmSync(profile, { recursive: true, force: true });
  }
  return { problems, pages: HOSTED_PAGES.length, requests, footer };
}

/**
 * The check's own controls, each a broken copy of a good output run through the
 * same `browserCheck()`. ⚠ The other-origin control removes the policy from its
 * copy, because with the policy in place the browser blocks the request and the
 * violation detector fires instead; this control is for the request detector.
 */
export async function selfTest(root: string): Promise<string[]> {
  const failed: string[] = [];
  const copy = () => { const d = mkdtempSync(join(tmpdir(), "wconf-browser-self-test-")); cpSync(join(root, ".vercel"), join(d, ".vercel"), { recursive: true }); return d; };
  const dirs: string[] = [];
  const elsewhere = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("x") });
  try {
    const good = copy(); dirs.push(good);
    const g = await browserCheck(good);
    if (g.problems.length) failed.push(`the unbroken copy must pass, and reported: ${g.problems[0]}`);

    const other = copy(); dirs.push(other);
    const cfg = join(other, ".vercel/output/config.json");
    const c = JSON.parse(readFileSync(cfg, "utf8"));
    delete c.routes[0].headers["Content-Security-Policy"];
    writeFileSync(cfg, JSON.stringify(c));
    const idx = join(other, ".vercel/output/static/index.html");
    writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<img src="http://127.0.0.1:${elsewhere.port}/pixel.png"></body>`));
    if (!(await browserCheck(other)).problems.some((p) => p.includes(`a request to http://127.0.0.1:${elsewhere.port}/`))) failed.push("a request to another origin was not reported");

    const dead = copy(); dirs.push(dead);
    const wal = join(dead, ".vercel/output/static/wallet/index.html");
    writeFileSync(wal, readFileSync(wal, "utf8").replace(/<script type="module"[^>]*><\/script>/, ""));
    if (!(await browserCheck(dead)).problems.some((p) => p.startsWith("/wallet: the page's script never ran"))) failed.push("a page whose script never ran was not reported");
  } finally {
    elsewhere.stop(true);
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  }
  return failed;
}

if (import.meta.main) {
  if (process.argv[2] === "--self-test") {
    const failed = await selfTest(process.argv[3] ?? "");
    for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
    console.log(`browser-check self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
    process.exit(failed.length ? 2 : 0);
  }
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/browser-check.ts <output root>");
  const r = await browserCheck(root);
  console.log(`browser-check: ${r.pages} pages, ${r.requests} requests observed, all to the page's own origin unless listed below`);
  console.log(`  the overview's footer shows: ${r.footer}`);
  for (const p of r.problems) console.log(`  PROBLEM: ${p}`);
  console.log(`browser-check: verdict=${r.problems.length ? "FAIL" : "PASS"} exit=${r.problems.length ? 1 : 0}`);
  process.exit(r.problems.length ? 1 : 0);
}

````


## FILE: web/hosted/deploy-preflight.ts (complete)

````typescript
/**
 * Before `vercel deploy --prebuilt`: is this output the one the gate passed,
 * built from a commit, and nothing since? `ADR-0004` D-H4, ruled A.
 *
 *   bun run web/hosted/deploy-preflight.ts <output root>
 *
 * ⚠ **This does not deploy.** Deploying needs the owner's Vercel token, and
 * D-H4 keeps that token away from everything that installs or builds. This
 * checks the output and prints the command; the owner runs it.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readOutput } from "../../tools/check-web-hosted.ts";

const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export const PUBLIC_REPO = "nandanito/xrpl-confidential-positions";

/**
 * Whether `commit` is on the public `main`. ⚠ Asked as a comparison, not a
 * lookup: `repos/<repo>/commits/<sha>` also answers for commits that exist only
 * in a fork, because forks share an object store.
 */
export function onPublicMain(commit: string, compare = (sha: string) => {
  const r = Bun.spawnSync(["gh", "api", `repos/${PUBLIC_REPO}/compare/${sha}...main`, "--jq", ".status"], { stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() : `error: ${r.stderr.toString().trim()}`;
}): boolean {
  const status = compare(commit);
  return status === "identical" || status === "ahead";
}

export function preflight(root: string, isOnPublicMain: (commit: string) => boolean = onPublicMain): string[] {
  const problems: string[] = [];
  const manifestPath = join(root, "build-manifest.json");
  if (!existsSync(manifestPath)) return [`no build-manifest.json beside the output; build with web/hosted/build.ts`];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.trial) problems.push("the manifest says TRIAL: this output was built from a working tree, not a commit");
  else if (!isOnPublicMain(manifest.commit)) problems.push(`${manifest.commit} is not on the public repository's main, so the footer's link names a commit readers cannot see`);
  const files = readOutput(root);
  const v = files.get("static/gate-verdict.json");
  if (!v) return [...problems, "no static/gate-verdict.json: the gate has not passed this output"];
  const verdict = JSON.parse(v.toString("utf8"));
  if (verdict.verdict !== "PASS") problems.push(`the verdict is ${JSON.stringify(verdict.verdict)}`);
  if (verdict.commit !== manifest.commit) problems.push(`the gate checked ${verdict.commit}, the build was of ${manifest.commit}`);
  const entries = [...files].filter(([p]) => p !== "static/gate-verdict.json").sort(([a], [b]) => a.localeCompare(b));
  if (entries.length !== verdict.files) problems.push(`${entries.length} files now, ${verdict.files} when the gate passed`);
  for (const [p, b] of entries) if (verdict.perFile[p] !== sha256(b)) problems.push(`${p} changed since the gate passed`);
  const digest = sha256(entries.map(([p, b]) => `${p}\t${sha256(b)}`).join("\n"));
  if (digest !== verdict.outputDigest) problems.push("the output digest does not match the verdict's");
  return problems;
}

if (import.meta.main) {
  const root = process.argv[2];
  if (!root) throw new Error("usage: bun run web/hosted/deploy-preflight.ts <output root>");
  const problems = preflight(root);
  for (const p of problems) console.log(`  REFUSED: ${p}`);
  if (problems.length) { console.log("deploy-preflight: verdict=REFUSED exit=1"); process.exit(1); }
  const m = JSON.parse(readFileSync(join(root, "build-manifest.json"), "utf8"));
  console.log(`deploy-preflight: ${root} is the output the gate passed, built from ${m.commit} at ledger ${m.snapshot.ledgerIndex}.`);
  console.log("\nThe owner deploys it, with the project-scoped token present for this command only:");
  console.log(`  VERCEL_TOKEN=… VERCEL_ORG_ID=… VERCEL_PROJECT_ID=… vercel deploy --prebuilt --prod --cwd ${root}`);
  console.log(`\nThen compare what is served with what passed:\n  bun run web/hosted/compare-deployed.ts ${root} ${m.snapshot.canonicalUrl}`);
  console.log("deploy-preflight: verdict=PASS exit=0");
}

````


## FILE: web/hosted/compare-deployed.ts (complete)

````typescript
/**
 * After the upload: are the bytes and headers the host serves the ones the gate
 * passed? `ADR-0004` D-H4 and step 5.
 *
 *   bun run web/hosted/compare-deployed.ts <output root> <https origin>
 *
 * Fetches every file `gate-verdict.json` lists, and each page by its route,
 * and compares bytes with the verdict's digests and the security headers with
 * `config.json`'s. Fails on any difference, on a cookie, on a redirect, and on
 * an unknown path that does not answer 404.
 *
 * ⚠ **It detects a change at the moment it runs, nothing later.** The deployed
 * bytes are the host's to deliver (`ADR-0004`, `REVIEW-058` S-3, R1-10).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HOSTED_PAGES } from "./pages.ts";

const sha256 = (b: ArrayBuffer | Buffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");
const CHECKED_HEADERS = ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Permissions-Policy"];

export async function compareDeployed(root: string, origin: string): Promise<string[]> {
  const base = join(root, ".vercel", "output");
  const verdict = JSON.parse(readFileSync(join(base, "static/gate-verdict.json"), "utf8"));
  const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const want: Record<string, string> = config.routes[0].headers;
  const problems: string[] = [];
  const get = async (path: string) => {
    const r = await fetch(origin.replace(/\/$/, "") + path, { redirect: "manual", headers: { "cache-control": "no-cache" } });
    if (r.headers.get("set-cookie")) problems.push(`${path}: the host set a cookie`);
    return r;
  };
  const checkHeaders = (path: string, r: Response) => {
    for (const h of CHECKED_HEADERS) if (r.headers.get(h) !== want[h]) problems.push(`${path}: ${h} is ${JSON.stringify(r.headers.get(h))}, not what config.json sets`);
  };
  for (const [p, digest] of Object.entries<string>(verdict.perFile)) {
    if (!p.startsWith("static/")) continue;
    const path = p.slice("static".length);
    const r = await get(path);
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== digest) problems.push(`${path}: the served bytes differ from what the gate passed`);
    checkHeaders(path, r);
  }
  for (const page of HOSTED_PAGES) {
    const path = `/${page}`;
    const r = await get(path);
    const file = page ? `static/${page}/index.html` : "static/index.html";
    if (r.status !== 200) { problems.push(`${path}: HTTP ${r.status}`); continue; }
    if (sha256(await r.arrayBuffer()) !== verdict.perFile[file]) problems.push(`${path}: the page served at its route differs from ${file}`);
    checkHeaders(path, r);
  }
  const served = await get("/gate-verdict.json");
  if (sha256(await served.arrayBuffer()) !== sha256(readFileSync(join(base, "static/gate-verdict.json")))) problems.push("/gate-verdict.json differs from the local one");
  const missing = await get(`/no-such-page-${Date.now()}`);
  if (missing.status !== 404) problems.push(`an unknown path answered ${missing.status}, not 404`);
  return problems;
}

if (import.meta.main) {
  const [root, origin] = process.argv.slice(2);
  if (!root || !origin?.startsWith("https://")) throw new Error("usage: bun run web/hosted/compare-deployed.ts <output root> <https origin>");
  const problems = await compareDeployed(root, origin);
  for (const p of problems) console.log(`  DIFFERS: ${p}`);
  console.log(`compare-deployed: verdict=${problems.length ? "FAIL" : "PASS"} exit=${problems.length ? 1 : 0}`);
  process.exit(problems.length ? 1 : 0);
}

````


## FILE: web/hosted/licence-notices.ts (complete)

````typescript
/**
 * The licence notices shipped with the hosted bundle, shared by the build's
 * plugin (`web/app/vite.hosted.config.ts`) and the gate, so both read one rule.
 *
 * ⚠ **Email addresses are removed from the shipped notices, and only those.**
 * seroval's MIT notice, which TanStack Start bundles, names its author's
 * personal address, and this repository does not republish personal addresses
 * (`check-no-secrets`'s email class). The project owner ruled on 2026-10-20 to
 * keep each notice and replace the address with a marker; the copyright line
 * keeps its year and holder (`CLAIMS.md` E-335). The gate checks that every
 * shipped notice is the package's own licence file with that one change.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EMAIL_MARKER = "[email address removed; the package's own licence file carries it]";
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export function redactEmails(text: string): string {
  return text.replace(EMAIL, EMAIL_MARKER);
}

const LICENCE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md", "LICENCE"];

/** A package root's licence file, or null. */
export function licenceFileOf(root: string): string | null {
  return LICENCE_FILES.map((f) => join(root, f)).find(existsSync) ?? null;
}

/** The notice as it is shipped: the package's licence file, emails removed, trailing space trimmed. */
export function shippedNotice(root: string): string | null {
  const f = licenceFileOf(root);
  return f ? redactEmails(readFileSync(f, "utf8")).trimEnd() : null;
}

````


## FILE: web/hosted/pages.ts (complete)

````typescript
/**
 * The hosted demo's pages, by path segment ("" is the overview). One list, read
 * by the Vite build, the output assembler and the gate.
 */
export const HOSTED_PAGES = ["", "capabilities", "observer", "issuer", "wallet", "custody"] as const;

````


## FILE: web/app/vite.hosted.config.ts (complete)

````typescript
/**
 * The hosted demo's build: `ADR-0004`, architecture §6 step 9.
 *
 * ⚠ **A second build target, not a replacement.** `vite.config.ts` is the local
 * tier and is untouched. This one builds `src/hosted/`, prerenders every page
 * from the build's one snapshot, and emits static files only.
 *
 * ⚠ **Nothing from the build machine's environment reaches the bundle.**
 * `REVIEW-058` M11: a `VITE_` variable set on the build machine was inlined into
 * the client bundle without appearing in the source. `envPrefix` names a prefix
 * nothing sets, and `web/hosted/build.ts` sets canary variables under both
 * prefixes and fails if either value appears in the output.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { HOSTED_PAGES } from "../hosted/pages.ts";
import { EMAIL_MARKER, shippedNotice } from "../hosted/licence-notices.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = resolve(HERE, "../hosted/.build/snapshot.json");
const VIRTUAL = "virtual:wconf-snapshot";

/** The build's one snapshot, as a module. A missing snapshot fails the build. */
function hostedSnapshot(): Plugin {
  return {
    name: "wconf-hosted-snapshot",
    resolveId(id) {
      return id === VIRTUAL ? `\0${VIRTUAL}` : null;
    },
    load(id) {
      if (id !== `\0${VIRTUAL}`) return null;
      if (!existsSync(SNAPSHOT_PATH)) {
        throw new Error(`no snapshot at ${SNAPSHOT_PATH}; run web/hosted/build.ts, which takes one first`);
      }
      const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
      if (snap.schema !== "wconf-hosted-snapshot/1") throw new Error(`unexpected snapshot schema ${JSON.stringify(snap.schema)}`);
      return `export default ${JSON.stringify(snap)};`;
    },
  };
}

/**
 * The licence notices the client bundle's dependencies require, shipped with
 * it (`REVIEW-058` S-2). Collected from the modules actually in the client
 * bundle, so a package that is bundled cannot be missed and one that is not is
 * not listed. A bundled package without a licence file fails the build.
 */
function licenceNotices(): Plugin {
  return {
    name: "wconf-licence-notices",
    generateBundle(_options, bundle) {
      if ((this as any).environment?.name && (this as any).environment.name !== "client") return;
      const roots = new Map<string, string>();
      for (const out of Object.values(bundle)) {
        // ⚠ Tailwind's generated stylesheet is not a JS module, so the module
        // walk below cannot see it; its banner is how it is found.
        if (out.type === "asset" && out.fileName.endsWith(".css") && String(out.source).includes("tailwindcss")) {
          const root = resolve(HERE, "../../node_modules/tailwindcss");
          roots.set(root, "tailwindcss");
        }
        if (out.type !== "chunk") continue;
        for (const id of Object.keys(out.modules)) {
          const clean = id.replace(/^\0/, "").split("?")[0];
          const m = clean.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//);
          if (m) roots.set(m[1], m[1].slice(m[1].lastIndexOf("node_modules/") + "node_modules/".length));
        }
      }
      const parts: string[] = [
        "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
        "each package ships. Collected at build time from the modules actually bundled.",
        `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
        "",
      ];
      for (const [root, name] of [...roots].sort((a, b) => a[1].localeCompare(b[1]))) {
        const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        const notice = shippedNotice(root);
        if (!notice) throw new Error(`${name}@${pkg.version} is in the client bundle and ships no licence file`);
        parts.push("=".repeat(78), `${name}@${pkg.version} (${pkg.license ?? "licence field absent"})`, "=".repeat(78), notice, "");
      }
      this.emitFile({ type: "asset", fileName: "third-party-licenses.txt", source: parts.join("\n") + "\n" });
    },
  };
}

export default defineConfig({
  envPrefix: "WCONF_HOSTED_BUNDLE_NEVER_",
  build: { sourcemap: false },
  // ⚠ The prerender step serves the build to itself through Vite's preview
  // server. `localhost` resolved to ::1 inside the build container while the
  // request went to 127.0.0.1, and every page was refused; a literal fixes
  // both, and keeps the server on loopback.
  preview: { host: "127.0.0.1" },
  plugins: [
    hostedSnapshot(),
    licenceNotices(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/hosted",
      // ⚠ Not crawled: the six pages are named, and the crawler followed the
      // footer's links to files the gate writes after the build, and failed.
      prerender: { enabled: true, crawlLinks: false, failOnError: true },
      pages: HOSTED_PAGES.map((p) => ({ path: `/${p}` })),
    }),
    react(),
  ],
});

````


## FILE: web/app/src/hosted/wording.ts (complete)

````typescript
/**
 * The hosted page's ledger-source risk wording, as the project owner accepted
 * it on 2026-10-19 (`ADR-0004` D-H2, `CLAIMS.md` E-331).
 *
 * ⚠ **Ruled text, rendered beside every ledger value.** `web/hosted/wording.test.ts`
 * compares it with the ADR's blockquote, so the page cannot drift from what was
 * accepted, and the hosted gate checks that every page showing a ledger value
 * carries it.
 */
export const DH2_WORDING: readonly string[] = [
  "This page shows the XRPL Devnet, a test network. Its tokens have no value, and " +
    "it is reset from time to time. Each value was read from Ripple's public Devnet " +
    "endpoint, at the ledger and date shown, and a lying or lagging server behind it " +
    "would have made it wrong. The page does not update: it shows Devnet as it was at " +
    "that ledger, not as it is now. Nothing on this page signs or submits. Do not use a " +
    "value shown here to build a transaction.",
  "Vercel, which hosts this page, sees your IP address and the pages you open.",
];

/** The network every hosted reading must come from. */
export const DEVNET_NETWORK_ID = 2;

````


## FILE: web/app/src/hosted/data.ts (complete)

````typescript
/**
 * The hosted application's ONLY data source: the build's one pinned snapshot,
 * compiled into the bundle by `vite.hosted.config.ts`.
 *
 * ⚠ **There is no fetch here, and none may be added for ledger data.** A page
 * that read the ledger at view time would send each visitor's requests to a
 * second party, which `ADR-0004` rules out under H3. `REVIEW-058` R2-9: the
 * local application reaches its API from every route, and this module is what
 * replaces that dependency rather than pointing it somewhere else.
 */
import snapshot from "virtual:wconf-snapshot";
import { DEVNET_NETWORK_ID } from "./wording";

if (snapshot.source.networkId !== DEVNET_NETWORK_ID) {
  // The build's reader refuses anything else; this is the page's own check.
  throw new Error(`the snapshot was read from network ${snapshot.source.networkId}, not Devnet`);
}

export const SNAPSHOT = snapshot;

````


## FILE: web/app/src/hosted/Footer.tsx (complete)

````typescript
/**
 * The footer: what built this page, and whether its gate passed (`ADR-0004`,
 * `REVIEW-058` S-8 and R2-3).
 *
 * ⚠ **The verdict cannot be compiled into the page it judges**, because the
 * gate runs over the finished output. The gate writes `/gate-verdict.json`
 * after it passes, listing a digest of every other file, and this component
 * reads it from the same host. A missing file renders as missing, never as a
 * pass.
 */
import { useEffect, useState } from "react";
import { SNAPSHOT } from "./data";

const REPO = "https://github.com/nandanito/xrpl-confidential-positions";

export function Footer() {
  const [verdict, setVerdict] = useState("not loaded (it is read from /gate-verdict.json once the page's script runs)");
  useEffect(() => {
    fetch("/gate-verdict.json", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((v: any) =>
        setVerdict(
          v?.verdict === "PASS"
            ? `PASS, ${v.files} files, output digest ${String(v.outputDigest).slice(0, 16)}…, checked ${v.checkedAt}`
            : `not a pass: ${JSON.stringify(v?.verdict ?? null)}`,
        ),
      )
      .catch((e) => setVerdict(`missing: no gate verdict was published with this build (${String(e)})`));
  }, []);
  const c = SNAPSHOT.commit;
  return (
    <footer className="mt-12 pt-6 border-t border-black/10 dark:border-white/15 text-xs opacity-70 space-y-1">
      <p>
        Built from commit <a className="underline" href={`${REPO}/commit/${c}`}><code>{c.slice(0, 12)}</code></a> of
        the public repository. Ledger values were read at validated ledger {SNAPSHOT.source.ledgerIndex} on{" "}
        {SNAPSHOT.readAt}.
      </p>
      <p>
        This page is published at <code>{SNAPSHOT.canonicalUrl}</code>. A copy hosted anywhere else
        is not this build.
      </p>
      <p>
        Gate verdict: <span data-gate-verdict="">{verdict}</span>{" "}
        (<a className="underline" href="/gate-verdict.json">gate-verdict.json</a>)
      </p>
      <p>
        Third-party licences for the code in these pages:{" "}
        <a className="underline" href="/third-party-licenses.txt">third-party-licenses.txt</a>
      </p>
    </footer>
  );
}

````


## FILE: web/app/src/hosted/LedgerReading.tsx (complete)

````typescript
/**
 * Where a hosted page's ledger values came from, and the accepted risk wording.
 *
 * ⚠ **Every hosted page that renders a ledger value renders this**, and the
 * hosted gate checks it from the built HTML: the D-H2 wording, the network
 * check and the ledger index (`ADR-0004`, "What phase 2 step 4's gate must
 * check"). The `data-` attributes are what the gate reads.
 */
import { Panel } from "../components/Verdict";
import { SNAPSHOT } from "./data";
import { DH2_WORDING } from "./wording";

export function LedgerReading() {
  const s = SNAPSHOT.source;
  return (
    <Panel title="Where these values come from" tone="warn">
      <div className="text-sm space-y-1" data-ledger-source="" data-network-id={s.networkId} data-ledger-index={s.ledgerIndex}>
        <div><span className="opacity-60">read from</span> <code>{s.endpoint}</code></div>
        <div>
          <span className="opacity-60">validated ledger</span> <code>{s.ledgerIndex}</code>{" "}
          <span className="opacity-60">at</span> <code>{SNAPSHOT.readAt}</code>
        </div>
        <div>
          <span className="opacity-60">network_id</span> <code>{s.networkId}</code> (Devnet){" "}
          <span className="opacity-60">rippled</span> <code>{s.buildVersion}</code>
        </div>
      </div>
      <div className="mt-3 space-y-2" data-dh2-wording="">
        {DH2_WORDING.map((p) => <p key={p} className="text-sm leading-relaxed">{p}</p>)}
      </div>
    </Panel>
  );
}

/** One account's address and note, with the ledger it was read at. The panel title carries its label. */
export function AccountHeading({ address, note }: { address: string; note: string }) {
  return (
    <div className="mb-3">
      <code className="text-[10px] opacity-60 break-all" data-ledger-value="">{address}</code>
      <p className="text-xs opacity-75 mt-1">{note}</p>
      <p className="text-xs opacity-60 mt-1">read at validated ledger {SNAPSHOT.source.ledgerIndex}</p>
    </div>
  );
}

/** What the pinned ledger said when there is no position to show. */
export function AbsentReading({ state }: { state: string }) {
  const n = SNAPSHOT.source.ledgerIndex;
  const at = `At validated ledger ${n}`;
  const text: Record<string, string> = {
    // ⚠ `ADR-0004`'s own sentence, word for word (its "Devnet resets" section).
    "account-missing":
      `This account does not exist on Devnet at ledger ${n}. Devnet is reset from time to time and the demo accounts are throwaway. No other source is substituted.`,
    "issuance-missing": `${at} the demo issuance does not exist, so no account holds a position in it.`,
    "no-position": `${at} this account exists and holds no position in the demo issuance.`,
  };
  return <p className="text-sm" data-ledger-value="">{text[state] ?? `Unrecognised state ${JSON.stringify(state)}.`}</p>;
}

````


## FILE: web/app/src/hosted/routes/__root.tsx (complete)

````typescript
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import styles from "../../styles.css?url";
import { Footer } from "../Footer";

/**
 * The hosted demo's root (`ADR-0004`, architecture §6 step 9).
 *
 * ⚠ **No `beforeLoad` identity check and no API**: there is no API. Every
 * value comes from the build's one snapshot (`../data`), so no route can be
 * reached that fetches anything but files from this host.
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "W-CONF: confidential MPT on the XRPL Devnet" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: Root,
});

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/capabilities", label: "Capability matrix" },
  { to: "/observer", label: "Observer view" },
  { to: "/issuer", label: "Issuer view" },
  { to: "/wallet", label: "Wallet" },
  { to: "/custody", label: "Custody" },
] as const;

function Root() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <div className="bg-[var(--color-warn)] text-white text-sm px-4 py-2 font-medium">
          Devnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">W-CONF</h1>
            <p className="text-sm opacity-70 mt-1">
              What confidential MPT on the XRP Ledger hides, and what it does not. A research
              project, shown on one snapshot of the Devnet.
            </p>
            <nav className="flex flex-wrap gap-4 mt-4 text-sm">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className="underline underline-offset-4 opacity-80 hover:opacity-100"
                      activeProps={{ className: "underline underline-offset-4 font-semibold opacity-100" }}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          <Outlet />
          <Footer />
        </div>
        <Scripts />
      </body>
    </html>
  );
}

````


## FILE: web/app/src/hosted/routes/index.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/")({ component: Overview });

/**
 * ⚠ The local overview's signer panel and its loader call are ABSENT here, not
 * hidden (`ADR-0004`, hosted exclusions): there is no signer behind this page.
 */
function Overview() {
  const { invariants } = SNAPSHOT.repositoryText.capabilities;
  return (
    <>
      <Panel title="What this is">
        <p className="text-sm leading-relaxed">
          A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from
          one snapshot of the ledger, taken when this site was built. The site signs nothing and holds
          no keys. No code of this project runs on a server when you load it, and your browser
          requests only this site&rsquo;s own files.
        </p>
      </Panel>

      <Panel title="Start here">
        <ol className="text-sm space-y-1 list-decimal pl-5 opacity-85">
          <li><strong>Capability matrix</strong>: what each kind of key can and cannot do.</li>
          <li><strong>Observer view</strong>: what anyone can read on the ledger, including which balances are visibly zero.</li>
          <li><strong>Issuer view</strong>: the issuer&rsquo;s copy of each balance, without the figure.</li>
          <li><strong>Wallet</strong>: why the browser wallets examined cannot hold a confidential position.</li>
          <li><strong>Custody</strong>: where confidentiality and custody approval policies conflict.</li>
        </ol>
      </Panel>

      <Panel title="To transact, run it yourself">
        <p className="text-sm leading-relaxed">
          Signing happens only in <code>wconf-signer</code>, a separate program on the holder&rsquo;s own
          machine, never in a web page. The README explains how to build it and run the local version
          of this site. It does not yet explain how to create a holder profile and funded Devnet
          accounts, which a transaction needs.
        </p>
        <p className="text-sm mt-2">
          <a className="underline" href="https://github.com/nandanito/xrpl-confidential-positions#run-it">
            README, &ldquo;Run it&rdquo;
          </a>
        </p>
      </Panel>

      <Panel title="What it never claims" tone="warn">
        <ul className="text-sm space-y-2">
          {invariants.map((i: any) => (
            <li key={i.rule}>
              <code className="text-xs font-semibold mr-2 opacity-70">{i.rule}</code>
              {i.text}
            </li>
          ))}
        </ul>
        <p className="text-xs opacity-60 mt-3">Each label is a row in the repository&rsquo;s CLAIMS.md.</p>
      </Panel>
    </>
  );
}

````


## FILE: web/app/src/hosted/routes/issuer.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { SNAPSHOT } from "../data";
import { AbsentReading, AccountHeading, LedgerReading } from "../LedgerReading";

export const Route = createFileRoute("/issuer")({ component: Issuer });

/**
 * What the issuer can read, without the figure: `ADR-0004` D-H3, ruled A
 * (`CLAIMS.md` E-331).
 *
 * ⚠ **Every value here is a ledger reading.** The page shows that each
 * holder's `IssuerEncryptedBalance` is on the ledger and the issuance key the
 * protocol encrypts it under. It does not show a decrypted balance: E-241's
 * reasoning holds with more force on a public page, because a figure no visitor
 * can check is a claim with no falsifier.
 */
function Issuer() {
  const iss = SNAPSHOT.issuance;
  return (
    <>
      <Panel title="A holder is never private from the issuer" tone="warn">
        <p className="text-sm leading-relaxed">
          The protocol keeps a second copy of every confidential balance, the
          {" "}<code>IssuerEncryptedBalance</code>, encrypted to the issuer&rsquo;s key. The issuer can
          always decrypt it, and no setting turns this off (CLAIMS.md P-9).
        </p>
        <p className="text-sm leading-relaxed mt-2">
          This page shows that each copy is on the ledger. It does not show the decrypted figures: a
          visitor could not check them, so this project does not publish them (ADR-0004 D-H3).
        </p>
      </Panel>

      <LedgerReading />

      <Panel title="The issuance">
        {iss.exists ? (
          <div className="text-sm space-y-1">
            <div><span className="opacity-60">MPTokenIssuanceID</span> <code className="break-all" data-ledger-value="">{iss.id}</code></div>
            <div><span className="opacity-60">issuer</span> <code data-ledger-value="">{iss.issuer}</code></div>
            <div>
              <span className="opacity-60">IssuerEncryptionKey</span>{" "}
              <code className="text-[10px] break-all" data-ledger-value="">{iss.issuerEncryptionKey ?? "absent"}</code>
            </div>
          </div>
        ) : (
          <AbsentReading state="issuance-missing" />
        )}
      </Panel>

      {SNAPSHOT.accounts.map((a) => (
        <Panel key={a.address} title={`Issuer's copy: ${a.label}`}>
          <AccountHeading address={a.address} note={a.note} />
          {a.state === "present" && a.issuerMirror ? (
            a.issuerMirror.present ? (
              <div className="text-sm space-y-2">
                <div>
                  <span className="opacity-60">IssuerEncryptedBalance</span>{" "}
                  <code className="text-[10px] break-all block my-1 opacity-80" data-ledger-value="">{a.issuerMirror.ciphertext}</code>
                </div>
                <p>
                  Present, encrypted to the <code>IssuerEncryptionKey</code> above. It is a different
                  ciphertext from the holder&rsquo;s own balance.
                </p>
              </div>
            ) : (
              <p className="text-sm" data-ledger-value="">
                At validated ledger {SNAPSHOT.source.ledgerIndex} this position carries no
                {" "}<code>IssuerEncryptedBalance</code>.
              </p>
            )
          ) : (
            <AbsentReading state={a.state} />
          )}
        </Panel>
      ))}
    </>
  );
}

````


## FILE: web/app/src/hosted/routes/observer.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { ObserverLists, ObserverReading } from "../../views/ObserverReading";
import { SNAPSHOT } from "../data";
import { AbsentReading, AccountHeading, LedgerReading } from "../LedgerReading";

export const Route = createFileRoute("/observer")({ component: Observer });

/**
 * What a full-ledger observer sees of each demo account, as the build read it.
 *
 * ⚠ **No input and no lookup.** The local tier takes any account; this page
 * shows the four demo accounts and nothing a visitor chooses, so no lookup
 * travels in a URL the host receives (`ADR-0004`).
 */
function Observer() {
  // What is public and what is hidden is the same for every position, so it is shown once.
  const lists = SNAPSHOT.accounts.find((a) => a.state === "present" && a.observer)?.observer;
  return (
    <>
      <LedgerReading />
      {lists && <ObserverLists view={lists} />}
      {SNAPSHOT.accounts.map((a) => (
        <Panel key={a.address} title={`Observer view: ${a.label}`}>
          <AccountHeading address={a.address} note={a.note} />
          {a.state === "present" && a.observer ? <ObserverReading view={a.observer} lists={false} /> : <AbsentReading state={a.state} />}
        </Panel>
      ))}
    </>
  );
}

````


## FILE: web/app/src/hosted/routes/capabilities.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { CapabilitiesView } from "../../views/CapabilitiesView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/capabilities")({
  component: () => <CapabilitiesView {...SNAPSHOT.repositoryText.capabilities} />,
});

````


## FILE: web/app/src/hosted/routes/custody.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { CustodyView } from "../../views/CustodyView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/custody")({
  component: () => <CustodyView sim={SNAPSHOT.repositoryText.custody} />,
});

````


## FILE: web/app/src/hosted/routes/wallet.tsx (complete)

````typescript
import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "../../views/WalletView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/wallet")({
  component: () => <WalletView {...SNAPSHOT.repositoryText.capabilities} />,
});

````


## FILE: deployed output: .vercel/output/config.json (complete)

````json
{
  "version": 3,
  "routes": [
    {
      "src": "/(.*)",
      "headers": {
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'sha256-+rHkFU33O+WHorrpwoX9XCxboO8pJ6ggrxDZwQ6cuNg=' 'sha256-33od5FbBFVLwzQwYGbU2gDV1WAZSBjw2tGcOJ6CoTAE=' 'sha256-7O8osbD9gh5L2u7iTf84r12qsPs6M5irdGD4eb0Y8w4=' 'sha256-7p3h/I2zYFxfRkwq/ymDNoaZolaDS313GRVTQvE2Kns=' 'sha256-k6P9vqZeMvEPpE2CQrLO3OWhlMdURvRXT7N/lXgYJfs=' 'sha256-tgXuvcCxGEZ0N5NVF1naNI0ikgPEh0j6pD/5d+Xko+g=' 'sha256-zFML+AEdb/HsbX66VlYzBOqJKNNHs5/WNGYP8JiblyY='; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
      },
      "continue": true
    },
    {
      "src": "^/capabilities/?$",
      "dest": "/capabilities/index.html"
    },
    {
      "src": "^/observer/?$",
      "dest": "/observer/index.html"
    },
    {
      "src": "^/issuer/?$",
      "dest": "/issuer/index.html"
    },
    {
      "src": "^/wallet/?$",
      "dest": "/wallet/index.html"
    },
    {
      "src": "^/custody/?$",
      "dest": "/custody/index.html"
    },
    {
      "handle": "filesystem"
    }
  ]
}

````


## FILE: deployed output: .vercel/output/static/gate-verdict.json (as served) (complete)

````json
{
  "verdict": "PASS",
  "gate": "check-web-readonly --hosted (tools/check-web-hosted.ts)",
  "checkedAt": "2026-10-20T05:22:25.906Z",
  "commit": "ccf76e73bf6629b29dece98cc15a050e3f60cad4",
  "controls": 30,
  "files": 18,
  "outputDigest": "1332ea0a95772b12b18f4a91cb650db551faf6edcdb124a6e222b8b8282bf462",
  "perFile": {
    "config.json": "54445da39f3a9fb6d1bb8590301f2c7cfd6237c05debf98f125d322d01f689b4",
    "static/assets/capabilities-CyBiSyzZ.js": "01a2f0ff39f216661b11c4addbc9189ced44251bf48cf552bf4a5381343df117",
    "static/assets/custody-hkJYX5SB.js": "8f6b42d79787285cc1bdb9f08f31e33c167e8624f9f5481fb431c673978ea303",
    "static/assets/index-CKAZ0d8y.js": "71b01046b4c03372d563dd8b58968a9ebc51e0ba9014aa69faac883205ad4f60",
    "static/assets/issuer-B7oYAUmM.js": "6881ee819656396752016bfee5e80d49f18e6c397db19ee302f71fd9f4851f9a",
    "static/assets/LedgerReading-DqqbK6gq.js": "20940497f8c6f393496b09cda31ff75afc0ef54e4fb1a68e2d694d39b5d4a1aa",
    "static/assets/observer-DQA-_pWg.js": "01891693179020c6f29599b4372c0b240c9ca1d42867dae16fb42da12eed0a03",
    "static/assets/routes-D9R1YHa2.js": "2e3d9ecf3ffa6bbe9f41895c8d1bb54cdc736129790ef4d23f257040181f33d8",
    "static/assets/styles-DJVXuOe6.css": "f6b5bac79d30d9490c35ac0630a3717599dfeb0aa4375ee995e094ff7d7adfce",
    "static/assets/Verdict-CNiIxuke.js": "23e33297f9f9da8f1d0eea5d6e684a11d09c03d279a933df5b230368731e0c90",
    "static/assets/wallet-yjF0ml3-.js": "dd8107ec4a117b4348ecf836beef06a6815cbf35096b6c703919b706863e75d9",
    "static/capabilities/index.html": "8b46954f9441b9419760eee068539d463724604bcebb826c265c088ccb47a09a",
    "static/custody/index.html": "4fbadb0090beef1884480b21d57e7907df591e1e4306291d801a9a8c55aeb4fa",
    "static/index.html": "a9218cac8c5ee5cdafbb9ccab5e974a334000c3cd234539b611cd498a0424261",
    "static/issuer/index.html": "2796f9ec550ba3125857d8e8758d003149c9b49a9114c087c880a267a4f16b3f",
    "static/observer/index.html": "d3e9b2c5bdbf9b16a00755e89badc00dfa1e852f1ad41f065fac8cb754002aba",
    "static/third-party-licenses.txt": "4418cf3aa788a8137aa32fc2614b6624fe718ba71b7a4228fd80b46bded3cec7",
    "static/wallet/index.html": "373b7698245fdf3fbc4c1ed82c475338d4c81755aec614bc1e883974f6004c1a"
  },
  "doesNotCheck": [
    "1. EGRESS. It reads files; what a visitor's browser sends is not in them. The policy's connect-src 'self' is checked as written, not as a browser enforces it.",
    "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
    "3. The BUILD MACHINE. An inventory of the output cannot show that the build never read a private store; the isolated build is what addresses that.",
    "4. Whether the PROSE is true. Wording is claims-check's and the wording tests' question; this gate checks that the ruled D-H2 sentences are present, not that every other sentence is right.",
    "5. A form control built in the BROWSER after hydration. The check reads the prerendered HTML; React's DOM code names input elements internally, so the bundle cannot be read for them.",
    "6. A decryption routine under a name it does not list. It forbids WebAssembly, the named mpt-crypto and ElGamal identifiers and any cryptography package in the licence list, which is a named set.",
    "7. The licence list's COMPLETENESS beyond the module graph the build reported. A package inlined without its module path would be missed."
  ]
}

````


## FILE: deployed output root: build-manifest.json (beside the output, not uploaded) (complete)

````json
{
  "trial": false,
  "commit": "ccf76e73bf6629b29dece98cc15a050e3f60cad4",
  "image": "wconf-hosted-build:b5fac27dc2516788",
  "dockerfileSha256": "b5fac27dc25167883ae2867af7a14c8fd25eebef0e0a4c7d358acce7156c7c6f",
  "dockerContext": "orbstack",
  "builtAt": "2026-10-20T05:22:10.712Z",
  "snapshot": {
    "ledgerIndex": 6263910,
    "readAt": "2026-10-20T05:22:05.191Z",
    "endpoint": "https://s.devnet.rippletest.net:51234",
    "canonicalUrl": "https://xrpl-confidential-positions.vercel.app"
  },
  "environment": [
    "VITE_WCONF_CANARY",
    "WCONF_ACCEPT_REMOTE_LEDGER_RISK",
    "WCONF_CANARY",
    "WCONF_HOSTED_CANONICAL_URL",
    "WCONF_HOSTED_COMMIT"
  ],
  "canaries": "two random values, under VITE_ and WCONF_; neither appears in the output",
  "isolation": "the container mounted only a git archive of the commit; it checked /tmp/wconf and ~/.wconf absent before installing; no deployment token was present"
}

````


## FILE: the six deployed pages' VISIBLE TEXT, extracted from the prerendered HTML (scripts and markup removed) (complete)

````markdown

### Page /

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
What this is
A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.
Start here
Capability matrix: what each kind of key can and cannot do.
Observer view: what anyone can read on the ledger, including which balances are visibly zero.
Issuer view: the issuer’s copy of each balance, without the figure.
Wallet: why the browser wallets examined cannot hold a confidential position.
Custody: where confidentiality and custody approval policies conflict.
To transact, run it yourself
Signing happens only in wconf-signer, a separate program on the holder’s own machine, never in a web page. The README explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.
README, “Run it”
What it never claims
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Each label is a row in the repository’s CLAIMS.md.
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /observer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6263910 at 2026-10-20T05:22:05.191Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
Public
The account's address, and every account it has transacted with (P-4).
When each transaction happened, and how often (P-11).
The public MPT balance.
The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.
The holder's encryption key, once registered.
The ConfidentialBalanceVersion, which counts changes to the balance.
Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).
Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).
Hidden
The value of a confidential balance that is not the canonical encryption of zero, even when that value is zero (E-211).
The amount of each ConfidentialMPTSend.
Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.
Observer view: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.
read at validated ledger 6263910
What a full-ledger observer sees
public MPT balance 750
registered true
ConfidentialBalanceVersion 11
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
021D3288E7E5BF982641DF0ADCDB067DCFDBA95E312F0159A85E2A81B5496999B4029652CF4E578E5E03E539CBBBF04D57F5244A56D7FC1FDF4E8672E76418FDF947Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03B67732AAE2EDB348088A27B147EE3D01387631CDDD357B12C24659F6EB26A04F02EE0D0A18BEED84DA931C481F57A712C8CC0731F822B5013ADE72739A0C3217C4Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6263910
What a full-ledger observer sees
public MPT balance 586
registered true
ConfidentialBalanceVersion 5
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
02C8F5B45590A1CF7F9006F974DAA91FFD7C64FAA85FC2964F18F6495E23577313028556C7AA02F610759762A7449B7AF4A4A4EDFA73F8BF96BF93A09DFB09B87EBCNot the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03C9FC4098EDC4B287A3873E21ABCA828FFE9CF50150DEE079221267F21AD8535D0289A21820DDA63C5FB4BC107A710898DBB7F10E5EEE4B8DBA205D7D8967CD8214Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6263910
What a full-ledger observer sees
public MPT balance 30
registered true
ConfidentialBalanceVersion 0
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
031AE5A70B242D81691C1FC43D684FCD908BC7DCCC07CE3ED7DD1096A9575F5D1C03CE6F696A2AACEBEB02E4728249B72E362D2DD76754F084B819A289628691F31CPublicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
inbox
022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F980348759FC36C71AE3F6FE16A6904C23312D36DEFAAE95A9A2C9EE7DA7E6F84D9F2Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
Observer view: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6263910
What a full-ledger observer sees
public MPT balance 0
registered true
ConfidentialBalanceVersion 4
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
0382CD36EC99297C61FE6D878C8ED59CFE0C38EEB36A316EB0FE0AC8379FC66A9603A2AA18361F6ACFBE85FDC97EEAC7F6822C5767CB74256564FDA95009C6E11A17Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
0266912F17A098DC7E54BFEC56277DEA0422888A0212874D411A841E385A1D1D4D0240B6B9DB0AF95113717F95B056815D5B3A1C69FE596518ACB564F0A5E92FECE5Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /issuer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A holder is never private from the issuer
The protocol keeps a second copy of every confidential balance, the IssuerEncryptedBalance, encrypted to the issuer’s key. The issuer can always decrypt it, and no setting turns this off (CLAIMS.md P-9).
This page shows that each copy is on the ledger. It does not show the decrypted figures: a visitor could not check them, so this project does not publish them (ADR-0004 D-H3).
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6263910 at 2026-10-20T05:22:05.191Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
The issuance
MPTokenIssuanceID 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8
issuer rP9wBAcBUXNDSiUNPgLRv2WWjMn1L8xzRa
IssuerEncryptionKey 029DDE4953B75D741FC54DB86B44DF7E486E5B1BDFBCECD5F671B68E7E1CFD6CB9
Issuer's copy: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.
read at validated ledger 6263910
IssuerEncryptedBalance 0227B2F019BB9F3887355B85C959B2011DBEF7AC80439E42514390BBB236CF43A80237189EBACB6E36B5C7AE7B8F251B8E97D55D37C3AC01B281F93C84C7395A75D3
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6263910
IssuerEncryptedBalance 034958E9C943B437E117E9021E017799168DF9EE45270FE310212BF8F5BA957C10035E00F894315900DBBE99B2BC859F4FB45ECDA17381C0768E4F5C2D435412302D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6263910
IssuerEncryptedBalance 022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F9802EDC9E003481C3DB14F60A83767C9B88C53525104C1A408DA61677EFAE4887CD0
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6263910
IssuerEncryptedBalance 03578671D93AB129EA4196A34214E45B4EA639DB43758C63D2516A457F7735CF5702C2587A7AAD3AFFD05A691C26390E5623C44DAE1E4FCFF5DC3952D5342563C93D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /custody

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
This is a simulation
No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break.
Two findings
1. The derived key does not work with custodial key management
The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So a custodied account cannot derive its own ElGamal key or read its own confidential balance.
A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117).
2. Approval policies cannot read a confidential amount
An approval workflow sees a proof, not a value, so a rule like “two approvers above $1M” has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other.
Which flows survive, and which break
Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has.
Note 1: Only with a standalone ElGamal key, held outside the custody platform (E-117).
survives: Send a public XRPL payment
breaks: Onboard with the ruled derived key
Structural: a custody platform never releases seed material, so a custodied account cannot derive its own ElGamal key.
survives: Onboard with a standalone ElGamal key (note 1)
survives: Read own confidential balance (note 1)
survives: Send a confidential amount (note 1)
breaks: Send confidentially, under an amount-capped approval policy (note 1)
Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read. It is hidden from the policy engine too.
survives: Send confidentially, under a destination-allowlist policy (note 1)
survives: Retire a position in tranches (note 1)
Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /capabilities

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Capability matrix
What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential balances; the XRPL account key signs. The rows follow the signer’s ownKeySource type, which has two variants, and rows that are not built say so.
key sourcedecrypt own balanceprove + sign confidentialpublic transactionsexists today
| Generated demo seed, faucet-fundedderived-from-master-seed
| yesThe ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.
docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs
| yesOne seed gives both the ElGamal secret and the XRPL account key.
signer/src/keygen.rs; signer/src/onboarding.rs
| yesAn ordinary XRPL account. Public transactions are unaffected.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Existing Devnet seed, pastedderived-from-master-seed
| yesSame as a generated seed: the derivation does not depend on where the seed came from.
signer/src/keygen.rs
| conditionalOnly if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.
signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2
| yesAn ordinary XRPL account.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Standalone ElGamal keystandalone
| yesA separate ElGamal secret kept in the profile: two secrets to keep instead of one.
signer/src/onboarding.rs:279; signer/src/holder.rs:48
| conditionalThe ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).
CLAIMS.md E-117; signer/src/holder.rs
| yesUnaffected: the ElGamal key plays no part in public transactions.
signer/src/xrpl.rs
| builtsigner/src/holder.rs — KeySource::Standalone
| Browser wallet extension | noDecrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).
REVIEW-012 (derivation from master seed); ADR-0003 D2
| noA confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).
ADR-0003 D2; signer/src/keygen.rs
| yesOrdinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
| not builtnot built, for the reasons in this row
| Custody platform (simulated)standalone
| conditionalOnly with a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.
REVIEW-012; CLAIMS.md E-117
| conditionalThe external signer can sign. It cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.
docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4
| yesPublic transactions carry plain amounts, so approval policies work as usual.
docs/research/CUSTODY-2026-08-28.md
| not builtSimulation: an external-signer stub. No MPC, no HSM, no integration.
Shown before the seed is asked for
The master seed becomes a permanent decryption credential. Anyone who ever holds it can decrypt every confidential balance this account has held, past and future. XLS-96 has no key rotation and no key recovery (P-10), so this cannot be undone.
The derivation is specified only in this repository and is not a published standard. A holder with their seed but without this repository cannot reconstruct their key. Issue #10 tracks this.
Required by the key-derivation ruling, REVIEW-012 condition 2.
What no key source changes
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /wallet

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A browser wallet cannot hold a confidential position
The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the reasons are structural, not missing features. A wallet that kept the ElGamal key inside the extension and offered a prove-and-sign operation could; none of those examined does.
A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
Under the ruled key generation, the ElGamal secret is derived from the master seed. A derived-key account has no other way to get it.
A wallet extension exists in order not to release seed material. That is the product, not a gap in its API.
So a page cannot assemble the transaction through these wallets. They are not refusing a permission; they hold nothing they are built to give a page.
What a wallet can do
yesOrdinary XRPL transactions
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
yesProve control of an account
Enough to show that account’s observer view, which anyone with the address can read anyway.
What this page does not claim
Not determined: whether a given wallet build can serialise XLS-0096 transactions. The page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.
CLAIMS.md E-206.
Built from commit ccf76e73bf66 of the public repository. Ledger values were read at validated ledger 6263910 on 2026-10-20T05:22:05.191Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json)
Third-party licences for the code in these pages: third-party-licenses.txt

````


END OF MATERIAL. Now answer the six questions and the stopping-condition question, and end with `END OF LEG B REPORT`.
