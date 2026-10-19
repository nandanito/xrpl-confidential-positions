# REVIEW-036b — Codex leg: is the claim TRUE of the built tier?

- **Rotation:** `REVIEW-036` — `ADR-0003`'s central claim
- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1, `Proposed`
- **Access:** FULL REPOSITORY, read-only sandbox. No network, no test runs, no gate runs.
- **Packet:** `docs/reviews/REVIEW-036-packets/packet-b-codex.md` — enumerate every byte the tier emits and classify it PUBLIC / NOT PUBLIC; test both premises against source.

⚠ **Verbatim leg output. Adjudicated in `REVIEW-036c`** — findings here are the
leg's, not the project's, and several were rejected on source. Read the
adjudication for what was upheld.

---

## VERDICT: is the central claim true of the built tier?

**No.**

The source supports the narrower claim that the intended web path neither holds an issuer key nor reaches signing authority. It does not support the central claim:

- Premise 1 is false: the tier emits decrypted confidential balances, signer-local state, filesystem paths, configured endpoint details, process/build metadata, and locally authored or computed material.
- Premise 2 equivocates: “does not hold the credential” is not equivalent to “does not convey information produced by that credential.”
- The tier creates an unauthenticated loopback HTTP disclosure boundary that did not previously exist. In particular, it republishes a mode-`0600` plaintext snapshot over TCP.
- The named gate materially overstates what it checks.

This is a **P1 rejection** of the central claim.

## PREMISE 1 — “reads public state”

“NOT PUBLIC” below does not mean “secret.” It means the field cannot be derived by an arbitrary third party from public-ledger data alone.

| Endpoint | Field(s) | Classification | Evidence |
|---|---|---:|---|
| `GET /api/meta` | `service`, `tier`, `signs`, `holdsKeys`, `architecture`, `decision`, `network`; `neverClaims[].rule/text` | **NOT PUBLIC** | These are local service/configuration and repository assertions, not ledger fields: `web/api/server.ts:60-71`, `web/api/capability.ts:210-217`. |
| `GET /api/signer` — success | `reachable`, `socketPath`, `status.version`, `status.keysLoaded`, `status.note`, `whatThisIs`, `whatThisIsNot` | **NOT PUBLIC** | The response includes the discovered local socket path and signer response: `web/api/signer-status.ts:109-125`. The signer constructs the note from its loaded holder, local store generation, and local record count: `signer/src/session.rs:248-257`. |
| `GET /api/signer` — failure | `reachable`, `socketPath`, `reason`, `whatThisIs`, `whatThisIsNot` | **NOT PUBLIC** | `reason` contains raw local errors and every candidate filesystem path examined: `web/api/signer-status.ts:126-137`. |
| `GET /api/accounts` | Top-level `issuance`; `accounts[].address`, `accounts[].issuanceId` | **PUBLIC** | These values are intended to identify public ledger objects: `web/api/demo-accounts.ts:29-63`. I did not revalidate their current Devnet existence because network access was prohibited. |
| `GET /api/accounts` | `accounts[].label`, `accounts[].note`, `dropped`, top-level `note` | **NOT PUBLIC** | Labels disclose local roles and history such as derived-key and ed25519 accounts; `dropped` is an aggregate over a local curated array: `web/api/demo-accounts.ts:32-74`, `web/api/server.ts:94-100`. |
| `GET /api/source` — success | `endpoint`, `isLoopback`, `networkId`, `buildVersion`, `underB15Conditions`, `note` | **NOT PUBLIC** | `endpoint` comes from process environment/configuration; loopback and B-15 status derive from it. Network/build values are selected-node process metadata, not ledger state: `web/api/ledger-view.ts:25-55`, `facility/src/loopback.ts:331-344`. |
| `GET /api/source` — failure | HTTP `503`; `reachable`, `error`, `namedGap` | **NOT PUBLIC** | The status and error expose local connectivity/configuration state: `web/api/server.ts:104-115`. |
| `GET /api/observer/:account/:issuanceId` | `account`, `issuanceId` | **NOT PUBLIC** | They are echoed unvalidated route parameters; the endpoint can emit arbitrary caller-supplied strings whether or not they name ledger objects: `web/api/observer.ts:126-135`. |
| Same — successful ledger fields | `publicAmount`, `registered`, optional `holderEncryptionKey`, `confidentialBalanceVersion`; `spending`/`inbox` presence, `.ciphertext`, `.publiclyKnownZero`; `issuance.issuer`, `.confidentialOutstandingAmount`, `.hasIssuerKey`, `.hasAuditorKey` | **PUBLIC** | The underlying values come from pinned ledger entries: `facility/src/loopback.ts:239-279`. Canonical-zero classification uses only public key/account/issuance inputs: `web/api/observer.ts:110-147`, `tools/observer-harness.ts:85-120`. |
| Same | `spending.note`, `inbox.note`, `whatIsPublic[]`, `whatIsHidden[]` | **NOT PUBLIC** | These are locally authored interpretations and disclosures: `web/api/observer.ts:56-108`, `web/api/observer.ts:148-149`. |
| Same — failure | HTTP `502`/`503`; `error` | **NOT PUBLIC** | The status distinguishes local exception classes and the body emits raw error text: `web/api/server.ts:119-126`. |
| `GET /api/issuer/:account/:issuanceId` | `account`, `issuanceId` | **NOT PUBLIC** | Unvalidated request echoes: `web/api/issuer.ts:126-135`. |
| Same — all branches | `available`, `reason`, `keyPolicy`, `whatThisProves`, `snapshotAtUnix`, `snapshotAgeNote` | **NOT PUBLIC** | These expose filesystem availability, curated-set membership, local tool execution time, decryption success, and local prose: `web/api/issuer.ts:126-173`. |
| Same — entry fields | `mirrorField`, `searchedTo`, `publicAmount` | **NOT PUBLIC as emitted** | The intended producer derives `mirrorField` and `publicAmount` from public state, but the API reads them from an untyped, unauthenticated `Record<string, any>` file and forwards them without validation: `web/api/issuer.ts:102-120`, `web/api/issuer.ts:162-170`. |
| Same | `decrypted` | **NOT PUBLIC** | It is explicitly the result of decrypting `IssuerEncryptedBalance` with the issuer key: `tools/issuer-view-snapshot.ts:230-245`; the API returns it directly: `web/api/issuer.ts:162-170`. |
| `GET /api/custody` | `simulation`, `disclaimer`; `flows[].id`, `.label`, `.survives`, `.blockedBy[].requirement/because`, `.caveats[]` | **NOT PUBLIC** | This is a locally declared simulation and locally computed aggregate over `CUSTODY_SHAPE`: `web/api/custody-sim.ts:36-71`, `web/api/custody-sim.ts:79-124`. |
| `GET /api/capabilities` | `rows[].id`, `.label`, `.profileToken`, `.existsToday.{built,where}`; each capability’s `verdict/detail/citation`; `ruledDisclosure`; `invariants[].rule/text`; `disclosures.*`; `namedGaps.*` | **NOT PUBLIC** | These are repository-derived capability judgments and disclosures, not public-ledger records: `web/api/capability.ts:20-41`, `web/api/capability.ts:48-81`, `web/api/capability.ts:83-217`; response assembly at `web/api/server.ts:146-152`. |
| Every API route and `OPTIONS` | Explicit CORS headers: `Vary`, allow-origin/methods/headers/credentials, exposed headers, max-age; `OPTIONS` status `204` | **NOT PUBLIC** | CORS reflects request origins, methods, and header names or emits local policy constants: `web/api/server.ts:53-54`, `node_modules/@elysiajs/cors/dist/index.mjs:57-115`, `node_modules/@elysiajs/cors/dist/index.mjs:116-139`. |

Therefore Premise 1 is false even without considering the issuer route. `/api/signer` alone emits signer-local data that cannot be reconstructed from the ledger.

The ADR’s claim that the randomness-ledger count is merely public transaction-frequency metadata is specifically wrong. Reservations are created before proving and confirmation, and even declined or failed attempts are committed permanently: `signer/src/session.rs:351-385`, `signer/src/session.rs:426-435`, `signer/src/store.rs:716-775`. `Store::len()` counts those local records: `signer/src/store.rs:703-707`. Public transaction history cannot reveal declined, failed, or otherwise unsubmitted signing attempts.

## PREMISE 2 — “holds no credential”

The intended key separation is real but insufficient.

The snapshot path is `/tmp/wconf/issuer-view-snapshot.json`, overridable with `WCONF_ISSUER_SNAPSHOT`: `web/api/issuer.ts:74-76`, `tools/issuer-view-snapshot.ts:102`.

I verified:

- No snapshot exists in this checkout.
- No snapshot existed at the default `/tmp/wconf/issuer-view-snapshot.json`.
- `WCONF_ISSUER_SNAPSHOT` was unset.

I therefore did **not** invent or claim to have read a live plaintext snapshot. The source-defined snapshot contains:

- `producedBy`
- `producedAtUnix`
- `issuance`
- `endpoint`
- `searchedTo`
- `ledgerIndex`
- `entries`

Successful entries contain `available`, `decrypted`, `publicAmount`, `mirrorField`, and `searchedTo`: `tools/issuer-view-snapshot.ts:217-271`. The file is written mode `0600`: `tools/issuer-view-snapshot.ts:272`.

Answers to the required questions:

- **Does the tier serve decrypted confidential balances?** Yes, conditionally on a snapshot being present. The producer writes `decrypted`, the API copies `entry.decrypted` into its response, and the UI labels it “decrypted confidential balance”: `tools/issuer-view-snapshot.ts:237-245`, `web/api/issuer.ts:162-170`, `web/app/src/routes/issuer.tsx:61-89`.

- **Could the recipient compute them without this tier?** Not from public ledger state alone. The producer must invoke `decryptAmount(mirror, key, max)` using the issuer secret: `tools/issuer-view-snapshot.ts:179-189`, `tools/issuer-view-snapshot.ts:230-245`. The public observer receives ciphertext, not that plaintext.

- **Is “holds no credential” equivalent to “conveys nothing a credential produces”?** No. The source establishes the difference directly: the CLI holds the key and produces plaintext; the API holds no intended key but republishes that plaintext. The central argument equivocates between key custody and privileged disclosure.

- **What authenticates a request?** Nothing. The server installs CORS and then declares unauthenticated `.get` routes: `web/api/server.ts:53-60`, `web/api/server.ts:134-137`. CORS only conditionally sets response headers; it does not reject a disallowed or origin-less request: `node_modules/@elysiajs/cors/dist/index.mjs:57-81`, `node_modules/@elysiajs/cors/dist/index.mjs:116-139`.

- **What is the listener bound to?** Explicitly `127.0.0.1`: `web/api/server.ts:177-180`. That is sound against remote-host access but is not authentication against the in-scope same-host adversary.

A further weakness: the “anything key-shaped is refused” check is incomplete. It rejects only keys named `sk`, `secret`, `privateKey`, `elgamal_sk`, or `seed`, plus one environment-variable name: `web/api/issuer.ts:107-120`. It will parse an entire file containing names such as `private_key`, `account_seed`, `issuer_key`, `passphrase`, or an innocuously named raw credential. Thus “holds no credential” is true of the intended producer output, not a complete property of the reader.

## NEW REACHABLE SURFACE

| New surface | What became reachable | Could it be reached before? | Does the ADR’s claim cover it? |
|---|---|---|---|
| Unauthenticated TCP listener on `127.0.0.1:3011` | All eight API GETs plus CORS `OPTIONS` | No web listener existed before this tier. | No. The central argument reasons about signing authority, not confidentiality, metadata, filesystem boundaries, or availability: `web/api/server.ts:53-152`, `web/api/server.ts:177-180`. |
| Plaintext issuer snapshot over HTTP | Decrypted balances, snapshot time, decryption-window data, curated membership, and errors containing the snapshot path | The intended file is `0600`, so a different local UID could not read it directly. A same-UID hostile process already could. | No. The ADR covers only whether a request *causes* decryption, then concludes there is “no oracle”; it does not cover a request returning prior decryption output: `docs/decisions/ADR-0003-web-tier-trust-boundary.md:100-104`. |
| HTTP-to-UDS signer bridge | A caller can cause a signer connection and `Request::Status`, then receive signer-local metadata and the socket path | A browser and a different UID were blocked by UDS transport/permissions. A hostile same-UID process could already connect directly: `signer/src/ipc.rs:8-24`, `signer/src/ipc.rs:78-150`. | Partially and inconsistently. D1 allows Status, while the ADR’s load-bearing finding says no web API opens a Unix socket: `docs/decisions/ADR-0003-web-tier-trust-boundary.md:15-17`, `docs/decisions/ADR-0003-web-tier-trust-boundary.md:31-34`. |
| Configured-ledger read proxy | Requests can trigger `server_info` and pinned ledger reads through the API process, and can disclose configured endpoint/build/reachability information | Public ledger data was already obtainable, but the selected local endpoint, its health, and server identity were not public-ledger state. | Only the ledger payload is covered. Source/configuration metadata and request-driven resource use are not. |
| Local filesystem and process-error disclosure | Snapshot paths, signer socket candidates, UIDs embedded in paths, raw connection errors, source reachability | Previously required corresponding filesystem/process access. | No. These are neither public ledger data nor signing authority. |
| Request-driven resource use | Repeated requests cause UDS connections, synchronous snapshot reads/JSON parses, and ledger RPCs | A same-UID attacker could implement its own clients, but the tier newly offers a stable unauthenticated proxy; other local users gain reach they did not have through the UDS/file permissions. | No. Availability and cross-UID amplification are outside the claim. |

The most concrete moved boundary is:

```text
issuer key
   │
   ▼
CLI decrypts ──► mode-0600 plaintext file ──► API process ──► unauthenticated loopback TCP
```

The credential stayed left of the API, but credential-produced confidential data crossed the filesystem permission boundary.

## FINDINGS

F1 — **[P1]** — “What the tier discloses that the protocol does not already publish: nothing.” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:46`; `signer/src/session.rs:248-257`; `signer/src/store.rs:716-775` — The signer response includes local build state, socket location, holder-to-process association, randomness-store generation, and an append-only count that includes failed and declined attempts. Those are not derivable from public ledger history. — Premise 1 is false and the safety argument built on `Status` uses the wrong equivalence between local activity and public transactions.

F2 — **[P1]** — “A tier that reads public state and holds no credential grants no authority that did not already exist.” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:90-100`; `tools/issuer-view-snapshot.ts:237-245`; `web/api/issuer.ts:162-170`; `web/api/server.ts:134-137` — The tier returns credential-produced plaintext confidential balances. Removing the key removed live chosen-input decryption but did not remove privileged disclosure. — An unauthenticated local party without the issuer credential receives information it cannot compute from public ledger state.

F3 — **[P1]** — “A browser page cannot reach this signer at all… No web API opens a Unix socket.” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:13-19`; `signer/src/ipc.rs:8-12`; `web/app/src/api.ts:84-92`; `web/api/server.ts:73-87`; `web/api/signer-status.ts:157-192` — The browser calls `/api/signer`; that route opens the UDS and sends Status. This is a fixed, non-signing bridge, but it is still a web API opening the Unix socket at browser request. — The tier does something the ADR’s load-bearing finding expressly says no web API does. The narrower “browser cannot directly open a UDS or select arbitrary signer requests” claim is true.

F4 — **[P1]** — “This gate is what makes [READ-ONLY, never signs, holds no key] a property rather than an intention.” — `tools/check-web-readonly.ts:1-18`; `docs/architecture/ARCHITECTURE-2026-08-18.md:246-252` — The gate does not check generic writes or mutating HTTP routes, does not check the required loopback hostname, scans only `web/app` and `web/api`, skips `dist`, and does not follow repository-local imports into `facility/` or `tools/`: `tools/check-web-readonly.ts:236-248`, `tools/check-web-readonly.ts:273-358`, `tools/check-web-readonly.ts:410-411`. Its printed seven-item limitation list omits all of those facts: `tools/check-web-readonly.ts:609-629`. — A `.post` route, filesystem write, non-loopback bind, signing helper in a new `web/bridge` directory, or dangerous local dependency could leave the gate green. Because the ADR names this as its falsifier, the overstatement is P1.

F5 — **[P1]** — “There is exactly ONE socket client in the whole tier.” — `tools/check-web-readonly.ts:17-18`, `tools/check-web-readonly.ts:568-590` — Part 1 applies the broad socket needles only to `web/app`; Part 5’s whole-tier count uses a narrower four-string detector that omits `node:net` and `createConnection`: `tools/check-web-readonly.ts:273-283`, `tools/check-web-readonly.ts:376-379`, `tools/check-web-readonly.ts:434-439`. A second `web/api` UDS client implemented with `node:net` and an indirectly supplied path is invisible. This precise limitation is not printed. — The gate can certify the exact-one-client premise when it is false.

F6 — **[P2]** — “A snapshot carrying anything key-shaped is REFUSED.” — `web/api/issuer.ts:107-120`; `web/api/issuer.ts:102-105` — The parser reads the complete JSON into memory but rejects only five exact key spellings and one environment-variable name. Common credential names such as `private_key` and `account_seed` pass. — The intended producer is key-free, but the reader does not enforce the claimed invariant against a misconfigured or replaced snapshot.

F7 — **[P3]** — “The tier renders … the facility’s run records.” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:40-46` — The complete API route chain ends after `/capabilities` and contains no run-record route or import: `web/api/server.ts:53-152`. A repository search found the run-record claim only in the ADR. — The decision overstates shipped scope, though this does not add authority.

### ADR acceptance checklist

| Item | Source status |
|---|---|
| 1. Full adversarial rotation on the central claim | **NOT DONE in the reviewed tree.** The ADR remains `Proposed` and states it has had none: `docs/decisions/ADR-0003-web-tier-trust-boundary.md:3-9`, `docs/decisions/ADR-0003-web-tier-trust-boundary.md:213-216`. This review is currently one leg, not a completed adjudicated rotation. |
| 2. Gate broken in both directions through the real detector | **PARTIALLY IMPLEMENTED, not fully established.** Positive and negative controls exist for the named detectors: `tools/check-web-readonly.ts:441-463`, `tools/check-web-readonly.ts:475-527`, `tools/check-web-readonly.ts:538-590`. The Status control duplicates the inline regex instead of calling a shared detector: `tools/check-web-readonly.ts:467-489`. I did not execute it, as instructed. |
| 3. Wallet codec verified or recorded as a gap | **DONE.** It is explicitly a named, non-load-bearing gap: `web/api/capability.ts:59-76`; wording tests pin that treatment: `web/api/disclosure.test.ts:443-459`. |
| 4. Wording test over privacy claims | **DONE as an artifact.** `web/api/disclosure.test.ts` scans the API/application sources and includes positive and negative controls: `web/api/disclosure.test.ts:1-41`, `web/api/disclosure.test.ts:138-217`. Its existence does not repair the central factual errors above. |

## WHAT I VERIFIED vs WHAT I INFERRED

Verified from opened source:

- Every explicit route and response-producing module under `web/api`.
- The actual `Request::Status` handler, protocol variants, randomness-store semantics, and UDS permissions.
- The snapshot producer and consumer, including the exact plaintext field flow.
- The CORS implementation’s behavior.
- The gate’s scanners, scope, controls, and printed limitations.
- Absence of a snapshot in the repository, at the default path, and through the unset override.
- Explicit loopback binding and absence of any authentication middleware in `server.ts`.

Not executed:

- No tests.
- No gates.
- No server.
- No network calls.
- No live Devnet validation.

Inferred and bounded:

- A normal same-host process can connect to an unauthenticated loopback TCP port regardless of Unix UID. External firewall, sandbox, or OS policy could add constraints not represented in this repository.
- A different UID gains access to data formerly protected by mode `0600`; a hostile same-UID process already could read that file and reach the signer UDS.
- Public classifications for the hardcoded demo account and issuance identifiers rely on their intended ledger provenance; I did not revalidate current Devnet state.
- I enumerated every explicit application response field and explicit CORS-generated header. Bun/Elysia may add automatic HTTP framing headers that could not be byte-verified without running the server.

## WHAT IS SOUND

- The server is now explicitly bound to loopback, not `0.0.0.0`: `web/api/server.ts:177-180`.
- The traced web path constructs exactly `{ type: "status" }`, validates a Status response, and has no path to `Pair` or `Prepare`: `web/api/signer-status.ts:109-125`, `web/api/signer-status.ts:157-195`.
- The ADR’s factual quotation of the current `Request::Status` handler is accurate: version, hardcoded `keys_loaded`, holder address, store generation, and store length; it performs no ledger read: `signer/src/protocol.rs:303-318`, `signer/src/session.rs:248-257`.
- `Status` touches no secret or signing operation on the traced handler path. Its disclosure is the defect, not signing authority.
- The intended API path performs no decryption and reads no issuer key. Decryption is isolated in the CLI: `web/api/issuer.ts:39-54`, `tools/issuer-view-snapshot.ts:179-189`, `tools/issuer-view-snapshot.ts:237-245`.
- The intended snapshot producer writes results without the key and uses mode `0600`: `tools/issuer-view-snapshot.ts:261-275`.
- Successful observer-state fields are sourced from a pinned, checked ledger snapshot: `facility/src/loopback.ts:215-231`, `facility/src/loopback.ts:239-279`.
- The original signing trust boundary remains intact: the web route cannot select a transaction, obtain a grant, prepare a transaction, or bypass holder confirmation. The failure is a new **disclosure/reachability boundary**, not a new signing path.
