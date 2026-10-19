# REVIEW-036d — Codex leg: read the document's own promises back at it

- **Rotation:** `REVIEW-036` — `ADR-0003`'s central claim
- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1, `Proposed`
- **Access:** FULL REPOSITORY, read-only sandbox. No network.
- **Packet:** `docs/reviews/REVIEW-036-packets/packet-d-codex.md` — the four acceptance preconditions, the six disclaimers, the two deferrals, and every falsifiable factual assertion. **Deliberately forbidden from reviewing the argument's logic** — that was leg a's job.

⚠ **Verbatim leg output. Adjudicated in `REVIEW-036c`** — findings here are the
leg's, not the project's, and several were rejected on source. Read the
adjudication for what was upheld.

---

## SCORECARD

Result: **4 P1, 0 P2, 2 P3.** Acceptance preconditions: **3 DONE, 1 NOT DONE**. The ADR correctly remains `Proposed`.

| promise | source | KEPT / BROKEN / PARTLY | evidence |
|---|---|---|---|
| Status is “Proposed” and “Not adversarially reviewed” | `docs/decisions/ADR-0003-web-tier-trust-boundary.md:3` | KEPT | `CLAUDE.md:173` and `docs/reviews/REVIEW-034c-adjudication-readme-2026-09-02.md:142` both say the central claim has had zero rotations. |
| Acceptance 1: “An adversarial rotation on this document’s central claim” | ADR:215 | KEPT — **NOT DONE** | No ADR-0003 review artifact exists; `REVIEW-034c:142` explicitly records zero rotations. The ADR does not falsely claim completion. |
| Acceptance 2: “The gate verified by breaking it in both directions” | ADR:216 | KEPT — **DONE** | Positive and negative controls invoke the real detectors at `tools/check-web-readonly.ts:441-489`, `:497-527`, `:538-566`, and `:581-590`. The gate ran successfully with 30 controls. |
| Acceptance 3: fourth wallet-codec reason verified or recorded as a gap | ADR:217 | KEPT — **DONE** | It is a named, non-load-bearing gap at `web/api/capability.ts:59-76`, rendered at `web/app/src/routes/wallet.tsx:70-75`, and asserted by `web/api/disclosure.test.ts:443-459`. |
| Acceptance 4: wording test over privacy claims | ADR:218 | KEPT — **DONE** | `web/api/disclosure.test.ts:1-12` declares that purpose and scans the tier at `:23-41`; targeted P-4/P-11 checks begin at `:172`. |
| Disclaimer 1: does not claim a read-only tier is secure | ADR:195 | KEPT | Consistent with `CLAIMS.md:23` and rendered invariant `web/api/capability.ts:217`. |
| Disclaimer 2: browser cannot reach signer because of transport; no bridge was built | ADR:196 | **BROKEN** | The browser requests `/api/signer` at `web/app/src/routes/index.tsx:12-15`; Elysia forwards it at `web/api/server.ts:73-76`; `web/api/signer-status.ts:176-192` opens the UDS and sends `Status`. |
| Disclaimer 3: gate does not prove no signing path exists | ADR:197 | KEPT | The gate prints that it is lexical, source-only, and over named needles at `tools/check-web-readonly.ts:609-629`. Consistent with D3’s qualification at ADR:78. |
| Disclaimer 4: gate does not cover tier security | ADR:198 | KEPT | The gate explicitly excludes behavior, dependencies, disclosure, and unnamed secrets at `tools/check-web-readonly.ts:613-628`. |
| Disclaimer 5: SSR is not a security boundary | ADR:199 | KEPT | SSR merely changes the HTTP base at `web/app/src/api.ts:20-27`; it does not become a UDS client. |
| Disclaimer 6: custody demo is not custody | ADR:200 | KEPT | Page and API state simulation/no integration/no MPC/no HSM at `web/app/src/routes/custody.tsx:17-26` and `web/api/custody-sim.ts:116-123`. |
| Deferred wallet connect: three reasons exist; connection does not | ADR:135-162 | KEPT | The exact three reasons render at `web/app/src/routes/wallet.tsx:21-39`; the matrix marks the wallet unbuilt at `web/api/capability.ts:153-160`; dependency/code search found only prose references to wallet SDKs. |
| Deferred custody stub: computed simulation exists; signing process does not | ADR:164-191 | KEPT | Requirements and availability are declared at `web/api/custody-sim.ts:20-71`; verdicts are computed at `:99-124`. The capability row is explicitly `built: false` at `web/api/capability.ts:178-181`. |
| Tier renders “the facility’s run records” | ADR:42 | **BROKEN** | The complete route set contains no facility/run-record route at `web/app/src/routeTree.gen.ts:56-64`; API routes end with custody/capabilities at `web/api/server.ts:139-152`. |
| Tier discloses nothing the protocol does not already publish | ADR:46 | **BROKEN** | `Status` exposes crate version, `keys_loaded`, generation ID and store length at `signer/src/session.rs:248-257`; that store includes cancelled/failed attempts at `signer/src/store.rs:753-759`. The API additionally returns the local socket path at `web/api/signer-status.ts:43-45`. |
| “The signer … gains no client” | ADR:207 | **BROKEN** | `web/api/signer-status.ts:2-7` calls itself the web tier’s UDS client; the gate confirms exactly one client at `tools/check-web-readonly.ts:568-573`. |
| `Status` handler description and its P-12 search | ADR:44 | KEPT | `signer/src/protocol.rs:303-318` has the corrected comment; `signer/src/session.rs:248-257` returns exactly the values described and performs no ledger access. Restricted search still returns one hit. |
| Harmonize/Metaco P-12 result | ADR:82 | PARTLY | The substantive conclusion remains true—every hit is project-authored, not a primary source—but the current search returns **five**, not three, and no longer returns the handover. |
| Gate “built before the UI” | ADR:78 | PARTLY | The files support the gate’s function, not the claimed chronology. Both gate and UI first appear in commit `4764577`; the tree cannot establish their within-session order. |

## FINDINGS

F1 — **P1** — “This decision declines to build a bridge around [the browser’s inability to reach the signer]” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:196` — The browser calls `api.signer()` (`web/app/src/routes/index.tsx:12-15`), Elysia exposes `GET /signer` (`web/api/server.ts:73-76`), and that handler opens the signer UDS (`web/api/signer-status.ts:176-192`). A read-only `Status` bridge is still a bridge. This disclaimer also contradicts the ADR’s own diagram at ADR:31-34, so it meets the requested P1 rule for an internally contradictory disclaimer.

F2 — **P1** — “What the tier discloses that the protocol does not already publish: nothing” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:46` — `Status` returns signer-local crate version, a hardcoded key-loaded state, randomness-ledger generation, and record count (`signer/src/session.rs:248-257`). Records are committed even for cancelled confirmations, failed proofs, and aborted attempts (`signer/src/store.rs:753-759`), so their count is not limited to protocol-published transactions. The API also returns the signer’s local socket path (`web/api/signer-status.ts:43-45`). The follow-on claim that this is exactly public protocol activity metadata is false.

F3 — **P1** — “The tier renders … the facility’s run records” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:42` — The generated application route list contains only `/`, `/api-doc`, `/capabilities`, `/custody`, `/issuer`, `/observer`, and `/wallet` (`web/app/src/routeTree.gen.ts:56-64`). The API has no run-record endpoint (`web/api/server.ts:119-152`). The only facility dependency under `web/` is the ledger-reading implementation, not run records (`web/api/ledger-view.ts:19-20`).

F4 — **P1** — “The signer keeps its whole authority and gains no client” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:207` — Authority remains with the signer, but “gains no client” is factually false. `web/api/signer-status.ts:2-7` is explicitly the web tier’s UDS client, and the gate reports exactly one at `tools/check-web-readonly.ts:568-573`.

F5 — **P3** — “`tools/check-web-readonly.ts`, built before the UI” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:78` — The cited gate calls itself the step-8 falsifier (`tools/check-web-readonly.ts:1-5`) but records no construction order. Git history first contains both the gate and UI in commit `4764577`. The statement may describe uncommitted work order, but it is not verifiable from the artifact it cites.

F6 — **P3** — “The Harmonize/Metaco search … matches three files” — `docs/decisions/ADR-0003-web-tier-trust-boundary.md:82` — The current source-tree search returns five files: architecture, ADR-0003, the limitations explainer, the custody research document, and the disclosure test. The dated 2026-08-28 result may have been correct then, and the conclusion “no primary source” still survives, but the recorded search no longer reproduces against this tree.

## THE TWO P-12 SEARCHES, RE-RUN

### `Request::Status`

```text
$ sed -n '248,258p' signer/src/session.rs | grep -En 'self\.view|LedgerReader|\.snapshot|Randomness ledger'
5:                    "throwaway Devnet keys for {}. Devnet only. Randomness ledger generation {}, \
```

Result: **KEPT.** Exactly one hit, and it is the `Randomness ledger` string. The cited surrounding spellings remain at `signer/src/session.rs:39`, `:151`, `:176`, `:207`, `:301`, and `:534`, outside the `Status` arm.

### Harmonize/Metaco

```text
$ rg --files -0 -g '*.md' -g '*.ts' -g '*.rs' -g '*.json' -g '!node_modules/**' | xargs -0 grep -ilE 'harmonize|metaco' | sort
docs/architecture/ARCHITECTURE-2026-08-18.md
docs/decisions/ADR-0003-web-tier-trust-boundary.md
docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md
docs/research/CUSTODY-2026-08-28.md
web/api/disclosure.test.ts
```

Result: **the count is not kept: five, not three.** All five remain project-authored mentions; none is a Harmonize primary source. Representative lines are `docs/architecture/ARCHITECTURE-2026-08-18.md:238`, `docs/research/CUSTODY-2026-08-28.md:12-18`, and `web/api/disclosure.test.ts:476`.

Other substantive greps actually run:

```text
rg -n 'Request::Status|Request::Pair|Request::Prepare|self\.view|LedgerReader|\.snapshot|Response::Status|Randomness ledger' signer/src/session.rs
rg -n 'Bun\.connect|node:net|createConnection|signer\.sock|WCONF_SIGNER_SOCKET|type:\s*["'\''`]?(pair|prepare|status)' web/app web/api --glob '!*.test.ts'
rg -n 'facility|run record|docs/runs|runRecords|Facility' web --glob '!*.test.ts'
rg -n -- '--key|key-file|WCONF_ELGAMAL_SK|VALUED' tools/issuer-decrypt-balance.ts
rg -n '@gemwallet|@crossmarkio|\bxumm\b|\bxaman\b|GemWallet|Crossmark|wallet.*connect|connect.*wallet' package.json bun.lock web/app web/api --glob '!*.test.ts'
rg -n 'FLOWS\.map|blockedBy|CUSTODY_SHAPE\[r\]|survives: blockedBy\.length|simulation: true' web/api/custody-sim.ts
rg -n 'ADR-0003|read-only tier moves no|read-only tier.*boundary|central claim' docs/reviews docs/decisions CLAIMS.md CLAUDE.md --glob '!docs/decisions/ADR-0003-web-tier-trust-boundary.md'
```

I also ran:

```text
bun run tools/check-web-readonly.ts
```

It passed all real-tree checks and **30 controls**, while printing its lexical/named-set limitations.

## PROMISES KEPT

- The ADR does not grade its outstanding rotation as complete. `Proposed` and “not adversarially reviewed” remain accurate; acceptance precondition 1 is still open.

- The gate exists, is wired through `Makefile:209-210`, currently passes, constructs only `Status`, finds no `Pair`/`Prepare`, finds no signing operation, detects no secret/decryption path, and finds exactly one UDS client.

- The quoted `Status` correction is exact. `signer/src/protocol.rs:303-318` no longer calls it a ledger read, and `signer/src/session.rs:248-257` performs none.

- `tools/issuer-decrypt-balance.ts` keeps its promise. It explicitly forbids a raw `--key` (`tools/issuer-decrypt-balance.ts:20-24`); accepted flags are only `--key-file`, `--max`, and `--field` (`:58-69`); the key comes from the environment or file (`:76-90`).

- The current web tier holds no issuer key and exposes no request-triggered decryption. `web/api/issuer.ts:107-123` only reads and validates a snapshot; `web/api/server.ts:134-137` calls that reader; gate part 4 passes.

- Wallet connect is genuinely deferred. The page renders the three promised reasons verbatim (`web/app/src/routes/wallet.tsx:21-39`), the codec issue is visibly a named gap (`:70-75`), and there is no wallet SDK dependency or connection implementation.

- `web/api/custody-sim.ts` genuinely computes verdicts: flows declare requirements, unavailable requirements produce `blockedBy`, and `survives` is derived from `blockedBy.length` (`web/api/custody-sim.ts:79-113`).

- The custody simulation is labelled honestly on the page, in the API response, and in the capability matrix. The wording test checks those surfaces at `web/api/disclosure.test.ts:462-485`.

- The facility substitute cited by the deferral exists and says it holds all parties’ seeds (`facility/src/signer.ts:11-18`). The driver creates a bank, a Dedicated Account, and three suppliers (`facility/run-facility.ts:301-307`, `:454-489`).

- The remaining named historical claims checked locally—withdrawn pasted-token design, REVIEW-003b’s same-host-process finding, REVIEW-012 derivation, and REVIEW-013’s risk-only Option 3 ruling—match their cited artifacts.

The dated external wallet-document/npm assertions were not re-fetched because network access was forbidden. The tree preserves them in `CLAIMS.md:267`, but the decision correctly treats the codec conclusion as an unresolved gap rather than a premise.
