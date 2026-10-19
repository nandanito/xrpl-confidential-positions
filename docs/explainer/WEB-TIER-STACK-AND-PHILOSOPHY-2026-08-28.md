# The web tier's stack, and why it is shaped this way

- **Date:** 2026-08-28
- **Subject:** architecture §6 step 8. The decision record is `ADR-0003`.

---

## The stack

**Bun · TanStack Start · Elysia · Tailwind · shadcn-idiom components.**

⚠ **`CLAUDE.md` has named that stack since the project began, and until this milestone none of it existed.** There was no `apps/`, no `web/`, no React, no Elysia and no TanStack in the tree; `package.json` carried six runtime dependencies and no framework. **It became true on 2026-08-28** and the line should say so — a stack note that describes an intention reads exactly like one that describes a tree.

---

## Why the signer is a separate binary

Because a browser page must not be able to reach a spending operation, and the cheapest way to guarantee that is to make it **impossible** rather than **forbidden**.

`signer/src/ipc.rs` is a **Unix domain socket**. No web API opens one. So the XSS-to-spend-oracle path is closed by the transport, not by a header check or a token.

⚠ **The alternative was designed and killed.** ADR-0001 rev 2 proposed localhost HTTP with an origin allowlist and a pasted session token. `REVIEW-003b` found the flaw and architecture §3 rule 3 records it as **withdrawn**: **an origin allowlist constrains pages, not processes.** Any local process can forge an `Origin` header, and the project's threat model puts a hostile same-host process **in scope**. A value-shaped interface plus a leaked token is a spend oracle.

⚠ **What the socket does not buy, stated because it is the half people drop:** it does not stop a hostile process running as the same user. That process passes the kernel's peer-UID check because it genuinely is the holder's user. **The per-transaction confirmation is the boundary**, not the transport.

---

## Why the web tier is read-only

⚠⚠ **THIS SECTION SAID *"Because it is the only version that needed no adversarial review"* AND THE REVIEW HAS SINCE RUN AND DISAGREED. RETRACTED 2026-09-02 — `CLAIMS.md` E-230, `REVIEW-036`.**

~~*"A tier that reads public state and holds no credential grants no authority that did not already exist — so nothing moves, so the gate does not fire."*~~ **STRUCK.** All four legs of `REVIEW-036` ruled the claim **unsound as stated**:

- ⚠ **"reads public state" is false.** `Request::Status` returns the randomness ledger's entry count, and `signer/src/store.rs:753-756` commits a record *"on success **and** on any local failure before emission — a cancelled confirmation, a failed proof, an aborted attempt."* **Public ledger history cannot reveal a declined confirmation.**
- ⚠ **"holds no credential" is true and is not the property the argument needs.** It is not the same as *conveys nothing a credential produces*: the tier served `decrypted` confidential balances out of a file written `mode 0600`, unauthenticated, over a loopback listener **that is not uid-scoped** (E-228). ⚠ It stopped on 2026-09-05, when E-241 removed the figure, the record count and the socket path; this line said *"serves"* until 2026-10-18.
- ⚠ **The inference is invalid.** A trust boundary also governs confidentiality, transport exposure and **presentation integrity** — and E-209 is this project's own proof of the last, where the tier rendered a Docker-hosted Gitea's `303` as its own API response.

**What is true, and it is what the milestone actually needed:** ⚠ **the tier adds no SIGNING authority.** It cannot construct `Pair` or `Prepare`, holds no key, and cannot reach the holder's confirmation — verified by both repo-access legs and by `check-web-readonly` parts 1-3. **`ADR-0003` proved that, and then wrote it as a universal about *authority*, which its evidence does not carry.**

**The rotation triggers are now FIVE.** The four that were listed — a browser path to signing; keys or proving in the page; a native shell that opens the socket; **a tier that accepts an issuer key over HTTP** — plus the one the list was missing and which had **already fired**:

> ⚠⚠ **EGRESS. If this tier makes any datum reachable by a party who could not obtain that datum before the tier existed, the boundary has MOVED — regardless of whether the tier signs, holds a key, or performs any computation.**

---

## Why TanStack Start, and why that makes the gate matter more

The capital-markets case is **multi-role** — issuer, auditor, supplier, facility operator, holder. File-based routing with loaders is what lets those grow without a rewrite, and SSR crosses no *new* boundary here because the API is already a local process reading holder data.

⚠⚠ **And its server functions are exactly the one-line mechanism by which someone later adds a signing call.** *"Call server code from a component"* is the feature. One line is the entire distance between this design and the one `REVIEW-003b` killed.

**So the framework choice is paid for with a gate**, `tools/check-web-readonly.ts`, built **before** the UI: nothing under the application may name the socket or import a socket client, the API process may construct only the one request that carries no authority, and no route or loader may reach a signing operation. ⚠ It refuses to run over an empty application directory, because **deleting the UI must not be a way to pass**.

---

## Why browser WASM was rejected — and not for the reason people assume

ADR-0001 Option 2 puts keys and proving in the page. It was rejected on **risk**, and re-confirmed on risk alone by two independent reviewers handed the strongest arguments in its favour.

⚠ **Do not repeat "Option 2 is expensive."** The build-cost table was **inverted**: Option 2 is the *cheapest* option — three published npm packages, no patching, no vendoring, no build step — and the chosen option is the most expensive: a vendored C fork, an FFI binding, a Rust binary, OS-mediated IPC and a separate confirmation UI. **The expensive option was chosen anyway.**

⚠ **And the key-generation ruling made Option 2 worse after the fact.** It removes the escape hatch: the page can no longer delegate signing and hold only a viewing key, because the derivation input is the master seed. The design now **welds a rotatable exposure to an unrotatable one.**

---

## The philosophy, in three habits this tier inherits

**1. A named gap is a correct output; a substituted source is a corrupted one.** When the ledger endpoint is unreachable, the API returns the gap and names it. It does not fall back to another node. When no primary source exists for a wallet's bundled codec, the interface says the question is undetermined rather than guessing — and **removes that point from its reasoning entirely**, because an argument resting on a version fact is falsified by a release note.

**2. Every capability claim needs a test that fails if the claim is false.** A user interface is the largest disclosure surface this project has built, and **the surface without a wording test is where the false sentence always lives** — this project has already shipped a false disclosure sentence that its own claims gate passed. So `web/api/disclosure.test.ts` fails if any rendered sentence claims privacy from the issuer, claims identities are hidden, presents a zero balance as hidden, drops the ruled seed disclosure, calls the custody simulation an integration, or leaks internal vocabulary. **Every one of those tests was verified by writing the violating sentence and watching it fail.**

**3. Verify a gate by breaking it.** Gates in this repository have been built to catch false passes and have false-passed. This tier's gate was broken seven ways against the real tree — each with the unmodified tree proved green first — and three defects were found that way, including one where **deleting the application directory made it pass**.
