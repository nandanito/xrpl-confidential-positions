Step 0 results:

```text
https://github.com                              200
https://s.devnet.rippletest.net:51234/            400
pwd: $USER_TMP/T/review058.hNbSP0/repo
HEAD: d764bcaa75add41613a67d9cbb48c48038475cb4
git log: d764bca Regenerate the revision log after E-327
```

Network was available. No prohibited stores, withheld document, or historical `UPSTREAM-FEEDBACK.md` content was read. No implementation, deployment, commit, or external write was performed. Tracked files remain unchanged.

**Verdict: do not accept the design as written.** H1 is feasible, but the proposed reuse has a demonstrated browser failure, the inherited snapshot checks have an exception, and the existing secret detector cannot establish the promised deployment-output coverage.

One packet correction matters: the checked-in ADR recommends **D-H3 A**, not B. It already retracts the sum check as evidence of correct decryption (`ADR-0004:162–175`). I reviewed that revision and attacked B and C separately.

**Seam 1 — measurements: partially upheld**

| Measurement | Re-run result |
|---|---|
| M1 | Held for HTTP: OPTIONS returned `400` without `Access-Control-*`; POST returned `200` without `Access-Control-Allow-Origin`. This supports failure of the described cross-origin browser fetch. I could not reproduce Chrome’s actual behavior. |
| M2 | Bun WebSockets succeeded with hosted-origin, `null`, and example-origin headers: network `2`, build `3.4.1`. Bun supplying an Origin header does not establish browser execution on that origin. |
| M3 | Held: successive connections reported lower bounds `5193077`, `5642942`, and `5171980`. This supports different backend views; it establishes neither independent operators nor cryptographic consistency. |
| M4 | Held at ledger **6244010**: all four accounts, their MPToken entries, holder keys, spending ciphertexts, and issuer mirrors existed. The issuance existed; its public confidential outstanding amount was `1364`. |
| M5 | Public-input computation needs no native cryptography. **Browser compatibility does not follow:** the reused function requires `Buffer`. |
| M6 | Held on source inspection: JSON-RPC uses `fetch` and environment-based risk acceptance; the harness resolves `"validated"` separately for its reads. |
| M7 | Held: seven verifier names; no `verify` match in `dist/*.d.ts`. The minified WASM export mappings also contain both clawback verification and amount decryption. |
| M8 | Held only to its stated limit: the installed schema has `spa` and `prerender`. No hosted target exists to demonstrate server-free operation. The ADR correctly acknowledges that limit. |
| M9 | Held at the cited specification revision, which GitHub still identified as the latest change to that path: the mirror covers spending plus inbox; COA covers all non-issuer confidential holdings; clawback proves the claimed plaintext against the mirror. [Pinned specification](https://github.com/XRPLF/XRPL-Standards/blob/58ccd304724d328acd923a3adf11f7fccd707c81/XLS-0096-confidential-mpt/README.md). |

- **R1-1 | HIGH | M5 does not establish that the reused observer computation works in a browser |** `tools/observer-harness.ts:82–83,100–122` uses `Buffer.from`. A Vite browser bundle retained those calls; invoking `observerView` without `Buffer` threw `TypeError`. No Buffer provider exists in `web/app/vite.config.ts:8–33`. **Smallest fix:** extract the public computation into a browser-compatible module using explicit byte/hex utilities, and exercise its built output without Node globals.

- **R1-2 | MEDIUM | The origin conclusion exceeds the recorded experiment |** `ADR-0004:45` concludes that pages on each tried origin can read the endpoint, but records two Bun clients and one Chrome origin. `CLAIMS.md:387` strengthens that into pages on all three origins. **Smallest fix:** distinguish supplied Origin headers from browser-tested origins; retain only the single recorded browser result until the others are tested.

**Seam 2 — shipped content: the public-source restriction is insufficient**

Today’s application client imports the HTTP adapter, not the API implementation. It therefore does **not automatically import the signer or issuer file reader**. But it also cannot operate without `/api/meta`: the root check blocks every route (`web/app/src/routes/__root.tsx:10`, `web/app/src/api.ts:65–80`).

Browser-bundle probes of the proposed reusable modules found:

| Module | What survives |
|---|---|
| `web/api/observer.ts` | Noble/address-codec dependencies, `Buffer` calls, and the harness’s `import.meta.main` branch—including CLI strings, WebSocket reader, and bounded difference-recovery code. |
| `facility/src/loopback.ts` | Environment reads, stderr disclosure, HTTP transport, generic RPC method access, and facility-specific strings. No private store is imported. |
| Capability/custody modules | Repository-authored constants and pure computations. |
| `web/api/issuer.ts` | Snapshot path/environment logic and a browser-externalized `node:fs` import. Calling it without `process` throws; it is not a browser snapshot reader. |
| `web/api/server.ts` | Its imports reach the signer client and issuer reader. It cannot become the browser’s aggregate data module. |

The source-map-enabled observer probe included full `sourcesContent`, including the harness. Its source paths were relative; I did **not** find an absolute local path in that map. Source maps were explicitly enabled for this probe; today’s Vite config does not enable them.

Vite also inlined an **ambient public canary** supplied through `VITE_WCONF_WEB_PORT` into the client adapter. Ordinary `process.env` accesses in the loopback probe remained runtime accesses; they were not automatically expanded into the machine’s environment.

- **R1-3 | MEDIUM | “Repository text plus D-H3” is not an enforced output provenance boundary |** `ADR-0004:74–78,223–225` supplies a whitelist by origin, while its gate list at `234–242` does not establish that origin. The environment-canary probe demonstrates an additional build input. Source maps and prerendered loader results are further output surfaces. **Smallest fix:** build from the approved publication tree with a named environment allowlist, inventory every uploaded file, and gate maps, generated data, and prerendered HTML alongside JavaScript.

- **R1-4 | HIGH | Reusing today’s repository text would publish false hosted-page statements |** `web/app/src/routes/index.tsx:51` promises the holder “decrypted,” while A deliberately supplies no figure. `web/app/src/routes/wallet.tsx:24–27` describes an extension design that could close the gap, but `:78` says no release can close the reasons. The signer remains an overview panel and loader call (`index.tsx:12–15,72–85`), despite the ADR treating it as an absent “page.” **Smallest fix:** name these exact hosted exclusions and correct the conflicting copy before reusing it.

I found no actual secret or private-store contents in these probes. That is narrower than proving that arbitrary output built from repository source is safe. Repository text can contain stale factual claims, historical decrypted observations, or material excluded from the approved public tree.

**Seam 3 — issuer view: A survives; B does not authenticate figures; C needs additional constraints**

For B, I constructed **two incompatible allocations of the same public total**. At ledger **6244148**, both passed four freshly re-read mirror comparisons and the sum comparison without an issuer key. They cannot both be the correct holder balances.

Those checks establish:

- The published ciphertexts match the node’s pinned current reading.
- The asserted numbers sum to a public aggregate.

They do not bind any individual number to its ciphertext, establish when decryption happened, or show possession of the issuer key. Also, COA covers **all** non-issuer holders; the four-account convenience list is not proof of exhaustive coverage.

The checked-in ADR states the main forgery limitation correctly. A preserves E-241’s removal. B deliberately republishes the protected **result**, reopening that disclosure boundary; consent to publishing throwaway-account figures must be ruled explicitly.

For C, the clone establishes these bindings:

- Context builder inputs: issuer account, issuance, sequence, holder (`node_modules/@xrplf/mpt-crypto/src/context.ts:118–153`).
- Proof statement: issuer public key, both ciphertext points, amount point, and supplied context; the zero amount has a special encoding (`tools/spike-2026-08-18/wconf-nonces.patch:665–743,848–878`).
- The context-builder API has no network, ledger hash, balance-version, expiry, or “demonstration only” input.

Anyone can verify, copy, or relay a published proof. An arbitrary observer still lacks transaction-signing authority. However, reuse is not limited to the human holding the issuer’s ElGamal secret: the specification explicitly permits issuer delegates to submit clawbacks. [Specification §5.5](https://github.com/XRPLF/XRPL-Standards/blob/58ccd304724d328acd923a3adf11f7fccd707c81/XLS-0096-confidential-mpt/README.md#55-delegate-accounts).

- **R1-5 | MEDIUM | “Nobody submits” does not prevent transaction reuse |** `ADR-0004:164` supplies an intention, not a binding. A transaction-compatible context can remain usable with the matching ciphertext and sequence by a suitably authorized signer or delegate. **Smallest fix:** use a separately domain-separated snapshot context incorporating Devnet and the ledger hash, rather than a valid clawback transaction context; verify that exact statement.

- **R1-6 | MEDIUM | Adding C can conflict with the rest of the decision |** `ADR-0004:103,170–171,236` forbids shipped decryption routines while proposing later use of the published WASM verifier. Its loader maps `_mpt_decrypt_amount` to existing WASM export `I` and clawback verification to existing export `V`. Wrapping only the verifier does not remove the other WASM code. **Smallest fix:** price a verifier-only artifact or independently reviewed browser verifier, and gate its actual bytes.

No live clawback, signature, decryption, or issuer-secret operation was performed.

**Seam 4 — direct Devnet reading: no markup injection found; snapshot and CSP claims need repair**

The current observer page renders public amounts, balance version, ciphertexts, registration state, and the issuance aggregate (`routes/observer.tsx:67–79`). Its source panel renders node build/version information. A would additionally display the issuer mirror and associated public key.

A holder can affect its own keys, balances, and ciphertexts through accepted operations; an issuer controls issuance configuration. These are constrained ledger values, not arbitrary HTML. Free-form memo, domain, and token-metadata fields are not selected by these readers.

The selected values enter ordinary React text children. A markup payload rendered as escaped text in my React probe. I found no selected-ledger-field route to executable markup. A lying node can still supply misleading text, malformed fields, or deceptive errors; CSP does not authenticate those values.

- **R1-7 | HIGH | Snapshot does not check the index of every answer |** `facility/src/loopback.ts:534–540` converts missing-entry errors into exceptions before `Snapshot.pinned` checks the index at `221–230`; `mptoken` catches that exception and returns `null` at `246–247`. A synthetic missing-entry response naming ledger **43** was accepted as `null` by a snapshot pinned to **42**. `web/api/observer.ts:136–140` can turn that into an empty position. **Smallest fix:** preserve and validate ledger identity for negative answers; an unprovable absence must remain a failed read.

The WebSocket transport must additionally preserve:

- Correlation of replies to requests and the correct error envelope.
- One checked connection, with network `2` verified on every new connection.
- One validated index and checks on successful **and negative** answers.
- Cancellation of outstanding snapshots on disconnect; no reconnection halfway through one snapshot.
- Finite failure/timeout handling without converting failures into empty holdings.

The existing network check happens during `open`, not each snapshot (`loopback.ts:308–338,417–423`). Reusing an identity across a replacement WebSocket would weaken it.

- **R1-8 | MEDIUM | The proposed CSP does not yet specify a complete enforceable boundary |** `ADR-0004:238–239` specifies a connection target but no policy or delivery configuration. `connect-src` does not itself restrict scripts, images, frames, or form destinations, and cannot prevent misleading text. **Smallest fix:** specify the full policy, including exact Devnet `connect-src`, script rules, resource defaults, `base-uri`, `object-src`, `form-action`, and framing policy; account for generated inline scripts without broadening execution permissions. Gate the delivered policy. [CSP specification](https://www.w3.org/TR/CSP3/).

For a prebuilt Vercel deployment, response headers belong in gated `.vercel/output/config.json` routing configuration. Setting a development-server header does not configure the CDN. [Build Output configuration](https://vercel.com/docs/build-output-api/configuration#routes).

**Seam 5 — deployment and falsifier: insufficiently checkable as written**

- **R1-9 | HIGH | The existing secret detector cannot substantiate the promised output scan |** `ADR-0004:236–237` requires scanning the output directory. `tools/check-no-secrets.ts:665–683` instead selects files using Git; its parser at `1172–1190` has no arbitrary-directory mode. In a harmless fixture, the real selector scanned a normal file and omitted an ignored `dist/canary.txt`; `--dir` was rejected. **Smallest fix:** add an explicit filesystem-artifact scan using the existing detectors, with controls proving ignored build files are included. Require its declared verdict and exact file manifest.

- **R1-10 | MEDIUM | Prebuilt deployment removes Git integration privileges, not host trust |** `ADR-0004:186` should promise **no additional repository credential or write permission**. Public repository contents remain readable; Vercel receives uploaded artifacts and controls their delivery. Source maps can disclose source without Git access. Moreover, deployment settings can add behavior: Vercel documents its toolbar as enabled by default on previews, with additional script/connection origins. **Smallest fix:** name the hosting trust, explicitly disable injected features for reviewed deployments, and compare delivered assets and headers with the gated manifest without test-only toolbar suppression. [CLI prebuilt behavior](https://vercel.com/docs/cli/deploy#prebuilt), [toolbar settings](https://vercel.com/docs/vercel-toolbar/managing-toolbar).

- **R1-11 | MEDIUM | Static hosting still has abuse and availability costs |** `ADR-0004:208–214` prices only the node’s limits. Static downloads still consume host transfer/request quotas and can incur charges or loss of availability. **Smallest fix:** name the hosting plan, usage limits, spend/availability response, and owner responsible for them. No application function is required for those costs. [Vercel CDN usage](https://vercel.com/docs/manage-cdn-usage).

Architecture `§6:269` is checkable only with the following qualifications:

| Falsifier clause | Before deployment | After deployment |
|---|---|---|
| No functions/API/middleware | Inspect complete artifact **and routing configuration**. | Browser requests cannot establish their universal absence; deployment inventory is also required. |
| No socket/decryption/secret content | Inspect complete dependency/output graph; lexical scans only falsify named patterns. | Fetch and compare enumerated artifacts. An unseen secret or hidden backend cannot be excluded by black-box probing. |
| Only named connection target | Inspect policy and code. | Check delivered policy and browser traffic across routes/failures. This is not a universal egress proof. |
| Disclosure/network/index beside ledger values | Exercise actual rendered states. | Repeat against live assets, including direct navigation and failures. |
| Failure never becomes empty; no substitution | Inject protocol failures, including negative answers from wrong ledgers. | Controlled browser-side failures; current Snapshot already fails the former test. |
| Lookup absent from host URLs | Check both observer/issuer navigation and generated links. | Inspect reload, navigation, prefetch, resource, and report requests. |
| Served bytes equal gated bytes | Record hashes and deployment configuration. | Compare decoded asset bytes; include host injection and alternate responses. Cannot establish equality for all future responses. |
| Step-8 wording falsifiers | Review actual hosted copy. | Review rendered copy; local-source tests alone do not establish this. |

Missing explicit falsifiers include unauthorized snapshot publication, failed snapshot/proof validation, non-secret private data in generated output, incorrect ledger identity on **negative** answers, and loss of snapshot integrity on reconnect. The output provenance restriction should be a falsifier too.

**The sentence most likely to be false**

> “Trigger 5 fires only for what is put into the bundle on purpose, and the gate can enumerate that.” — `ADR-0004:77–78`

I would falsify it with an ambient, non-secret build canary absent from the approved source, then inspect the artifact despite a clean lexical gate. The Vite environment probe already demonstrated the first half: `VITE_WCONF_WEB_PORT` became shipped client text. Intent is not an output provenance check.

**Files opened**

The complete per-file inventory—including all 63 explicitly inspected files, 25 additional dependency inputs recorded by the bundle maps, and the review scratch artifacts—is listed in [opened-files.txt]($USER_TMP/T/review058.hNbSP0/repo/.review058-leg-a/opened-files.txt). Reproduction probes are retained beside it.
