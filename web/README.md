# `web/` — architecture §6 step 8, the read-only web tier

**Scoped, ruled and built 2026-08-28.** The step is `ARCHITECTURE-2026-08-18.md` §6 step 8 (revision 9); the decision record is `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, `Accepted` at revision 3 — ⚠ **and what was accepted is the REWRITTEN claim.** Four rounds ran (`REVIEW-036` to `REVIEW-039`, eleven legs); the original claim that a read-only tier moves no trust boundary was **retracted**. What stands: the tier adds no **signing** authority (`CLAIMS.md` E-230, E-241).

```
web/app   TanStack Start · React · Tailwind    →  HTTP  →  web/api
web/api   Elysia, read-only                    →  JSON-RPC  →  rippled (Devnet)
                                               →  UDS: Request::Status ONLY  →  wconf-signer
```

## The property this tier exists to keep

**It never signs and it holds no key.** `Pair` and `Prepare` are the signer requests that carry authority, and `tools/check-web-readonly.ts` asserts that `web/api` constructs neither. ⚠ **That scan covers `web/api`, not the whole tier** — `web/app` is covered by the separate assertion that nothing under it reaches the socket at all. Stated narrowly because the wider version of this sentence stood here while `README.md` had already been corrected (`CLAIMS.md` E-168's shape).

⚠ **`tools/check-web-readonly.ts` is what makes that a property rather than an intention**, and it is wired into the `Makefile` alongside the repository's other gates — ⚠ **this said *"the other six"* until 2026-09-01, when `check-filing` had already made it wrong. The `Makefile` is the list; a count restated here is a claim with no falsifier and this one went stale** (`CLAIMS.md` E-141):

```
make check-web-readonly
```

**Six parts** (this said *"Five"* until 2026-09-02 — E-234): nothing under `web/app` reaches the socket; `web/api` builds `Status` and never `Pair` or `Prepare`; no route, loader or server function reaches a signing operation; ⚠ **the tier holds no secret, decrypts nothing and spawns nothing**; exactly **one** socket client exists; and ⚠ **every bind resolves to a loopback literal** — the API's and the dev server's, which proxies `/api` (E-227).

⚠ **Part 4 was added after the tier shipped a decryption oracle** — parts 1-3 ask what the tier can **reach**, and an issuer key held *inside* the API process is a different property (`CLAIMS.md` E-212).

⚠ **It refuses to run over an empty `web/app`** — deleting the UI must not be a way to pass. That hole was in its first version.

## Running it

```bash
# Optional — the issuer view. The CLI holds the key; the API never does.
WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts

# Terminal 1 — the API. Loopback ledger by default. Binds 127.0.0.1 explicitly.
make web-api

# A remote endpoint needs the risk acceptance BY NAME, and says so in its output:
WCONF_LEDGER_ENDPOINT=https://s.devnet.rippletest.net:51234 \
WCONF_ACCEPT_REMOTE_LEDGER_RISK="I accept CLAIMS.md F-23: a lying ledger source publishes the amount" \
  make web-api

# Terminal 2 — the browser application.
make web-app          # http://127.0.0.1:3000
```

## Tests

```bash
bun test web/api      # 89 tests: wording tests over every rendered sentence, plus citation checks
```

⚠ **`web/api/disclosure.test.ts` is the load-bearing one.** `claims-check` is necessary and **not sufficient** — a false disclosure sentence has already survived that gate in this project (F-24). These fail if any surface claims privacy from the issuer, claims identities are hidden, presents a zero balance as hidden, drops the ruled master-seed disclosure, calls the custody simulation an integration, or leaks this project's `tapFailHard` shorthand, which is not a real name, into rendered copy. **Every one was verified by writing the violating sentence and watching it fail.**

`web/api/capability.test.ts` checks that **every citation in the capability matrix resolves** — each file exists, each register row exists in `CLAIMS.md`. It caught two dangling citations on its first run, which is `CLAIMS.md` E-203's shape.

## What is here

| file | what it is |
|---|---|
| `api/signer-status.ts` | ⚠ **The only UDS client in the tier.** Builds `Status` and nothing else. |
| `api/server.ts` | The Elysia routes. Every one is a `GET`; there is no write path, not a disabled one. |
| `api/ledger-view.ts` | Composes `facility/src/loopback.ts` rather than reimplementing B-15's obligation. |
| `api/observer.ts` | What a full-ledger observer sees, including F-1's publicly-known zero. |
| `api/issuer.ts` | What the issuer sees. ⚠ **Holds no key and decrypts nothing** — it reads `tools/issuer-view-snapshot.ts`'s output. An earlier version decrypted per request, which was a decryption oracle (`CLAIMS.md` E-212). |
| `api/capability.ts` | The capability matrix, derived from the signer's own `KeySource` variants. |
| `api/custody-sim.ts` | ⚠ **A SIMULATION.** Verdicts computed from a declared key-source shape, not written per flow. |
| `app/src/routes/` | Overview, capability matrix, observer, issuer, wallet, custody, API doc. |

## What it does not establish

- It signs nothing, so it demonstrates nothing about signing. That evidence is `signer/`'s tests and validated Devnet transactions.
- The gate is **lexical, over a named set**, and prints its own limits.
- ⚠ ~~`ADR-0003`'s central claim — that a read-only tier moves no trust boundary — **has had no adversarial review**.~~ **REVIEWED 2026-09-02, `REVIEW-036`, four legs — and RULED UNSOUND** (`CLAIMS.md` E-230). The tier adds no **signing** authority, which is sound; it does **not** follow that no boundary moved. ⚠ **A disclosure boundary did: the tier served a decrypted issuer view and signer-local status, unauthenticated, to any local uid, out from behind `0600`/`0700` mode bits** (E-228). ~~**Unruled and open.**~~ **Ruled 2026-09-05 and closed by removal** (E-241): the issuer route reports whether a balance decrypted and never the figure, and the signer route no longer carries the socket path or the signer's note. ⚠ This line said *"unruled and open"* until 2026-10-18.

See `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md`.
