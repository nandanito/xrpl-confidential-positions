# REVIEW-037b-codex-fixes-2026-09-02.md

- **Rotation:** `REVIEW-037` — ROUND TWO, reviewing `REVIEW-036`'s FIXES
- **Date:** 2026-09-02
- **Subject:** commit `f7e7b43` — `ADR-0003` rev 2, `check-web-readonly` part 6, `check-disclosure-phrases`
- **Access:** FULL REPOSITORY, read-only, pinned to commit `f7e7b43`.

⚠ **Verbatim leg output. Adjudicated in `REVIEW-037c`.** Some findings were
already fixed in the worktree when the leg read the commit; the adjudication
says which.

---

## VERDICT ON THE FIXES

**REJECT — three P1s.** Commit `f7e7b43` does not complete the phrase correction, and both load-bearing gate fixes still false-pass. The rewritten signing claim is true of the committed implementation, but the claimed automated verification is not sound.

All citations below refer to `f7e7b43`, not later uncommitted worktree changes.

## F1 — P1 — the retracted claim survives in authority documents and rendered UI

> “It renders what is already readable, and it adds no authority.”

`docs/architecture/ARCHITECTURE-2026-08-18.md:233`

The substantive claim remains live at every following site I found:

- `docs/architecture/ARCHITECTURE-2026-08-18.md:233-235` — “adds no authority” and “moves no trust boundary.”
- `docs/architecture/ARCHITECTURE-2026-08-18.md:237` — “SSR crosses no new boundary.”
- `docs/architecture/ARCHITECTURE-2026-08-18.md:244` — signer-local information “exceeds [nothing] the protocol already publishes.”
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md:25` — “a boundary that will not move.”
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md:48` — “already readable” and “No authority was added.”
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md:52` — “What the tier discloses that the protocol does not already publish: nothing.”
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md:76` — “SSR crosses no new boundary.”
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md:253` — “It grants no authority … the true one.”
- `docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md:48` — “SSR crosses no new boundary.”
- `web/app/src/routes/index.tsx:28-35` — rendered UI: “already readable and adds no authority” and “on the readable side” of the boundary.
- `web/api/server.ts:15-17` — an XSS allegedly reaches “exactly what a `curl` against a public node reaches,” despite signer-local status and decrypted snapshot routes.

The new lexical gate false-passes even one exact spelling. The still-live sentence at ADR line 52 contains `activity metadata of exactly the kind the protocol leaves public`, but `REVIEW-036b` at line 48 is within its six-line window. Because `REVIEW-036` itself is accepted as a generic retraction marker, the assertion is forgiven: `tools/check-disclosure-phrases.ts:109-111,149-160`.

The same gate cannot inspect the rendered survivor because `.tsx` is absent from `LIVE_EXT`: `tools/check-disclosure-phrases.ts:115-118`. Its controls inject text directly into `scan(extra)` and therefore never test file discovery or an unrelated marker contaminating the window: `tools/check-disclosure-phrases.ts:200-225`.

**Consequence:** the authority document, ADR, explainer, source comment, and public UI still teach the retracted proposition while the new gate reports success.

## F2 — P1 — part 6 can certify non-loopback listeners as loopback

> “the API binds to loopback only”

`tools/check-web-readonly.ts:775-777`

`bindVerdict` only verifies that each `.listen(...)` text contains the word `hostname`, rejects three textual forms, and separately verifies that *some* `BIND_HOSTNAME` declaration is loopback: `tools/check-web-readonly.ts:656-680`. It never connects the hostname argument to that declaration.

Using the real committed `web/api` sources in memory, these all returned `ok: true`:

- `.listen({ hostname: "10.13.156.66" })` while leaving the unused loopback constant present.
- `hostname: process.env.BIND_HOSTNAME`.
- A ternary selecting a LAN address.
- A hostname assembled by concatenation.
- A second LAN `.listen(...)`.
- `Bun.serve({ hostname: "0.0.0.0" })`, which is ignored because the detector only recognizes `.listen(`.
- `"0"` and `"[::]"`.

Part 6 is also passed only `apiSrc`: `tools/check-web-readonly.ts:441-442,683`. It therefore misses the Vite listener at `web/app/vite.config.ts:13-19`. That listener proxies `/api`: `web/app/vite.config.ts:24-25`. Changing its `host` to `0.0.0.0` would publish the issuer route to the LAN while part 6 remained green.

The controls replay only the original mutation shapes—changing `BIND_HOSTNAME` itself, using bare `listen(port)`, or replacing that constant with a LAN literal: `tools/check-web-readonly.ts:686-704`.

**Consequence:** E-227 and ADR revision 2 call the bind defect fixed (`CLAIMS.md:304`, `docs/decisions/ADR-0003-web-tier-trust-boundary.md:276`), but the gate can still certify the same security property while it is false.

## F3 — P1 — the replacement signing claim has the same false-pass shape one level down

> “This tier adds no SIGNING authority … verified by `tools/check-web-readonly.ts` parts 1-3.”

`docs/decisions/ADR-0003-web-tier-trust-boundary.md:116`

The `SOCKET_OPENERS` fix adds only `node:net` and `createConnection`: `tools/check-web-readonly.ts:397-410`. Its new control merely imports those two spellings; it does not call a socket API: `tools/check-web-readonly.ts:623-632`.

A valid Node-compatible client written as:

```ts
import net from "net";
const s = net.connect({ path });
s.write(JSON.stringify({
  type: ["pa", "ir"].join(""),
  operations: ["send"],
}) + "\n");
```

produced zero hits in `SOCKET_NEEDLES`, `SOCKET_OPENERS`, `AUTHORITY_NEEDLES`, `SIGNING_NEEDLES`, `SECRET_NEEDLES`, and `secretEnvReads`. When appended in memory to the real tree, part 5 still counted only `web/api/signer-status.ts`.

That client can take the socket path from HTTP input—the existing `/api/signer` response already discloses it—and can assemble `pair`/`prepare` dynamically. Parts 1–5 would all remain green. A helper under `web/bridge/` is even simpler because the loader never reads it, a limitation the gate itself admits at `tools/check-web-readonly.ts:748-759`.

**Consequence:** the signing claim is true of the committed source after manual inspection, but it is not verified as a maintained property by the named gate. The gate can pass after signing authority is added.

## F4 — P2 — descriptions of the review were not updated across the tree

> “`ADR-0003` … not adversarially reviewed”

`web/api/server.ts:68`

The fix records that the rotation happened, yet live documentation and rendered API metadata still say it did not:

- `CLAIMS.md:271` — E-208 says ADR-0003 had no adversarial review.
- `GETTING-STARTED-CLAUDE-CODE.md:26`.
- `README.md:322-333` — “zero adversarial rotations” and “web tier is unreviewed.”
- `web/README.md:3,72`.
- `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md:43`.
- `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:259`.
- `web/api/server.ts:68` — exposed through `/api/meta`.

**Consequence:** both the claims register and the running interface misdescribe the fix’s review state.

## F5 — P2 — the corrected Harmonize count is already false in the fix commit

> “2026-09-02 … FIVE”

`docs/decisions/ADR-0003-web-tier-trust-boundary.md:92-97`

The stated search over every `.md`, `.ts`, `.rs`, and `.json` outside `node_modules` returns **10 tracked files** at `f7e7b43`, not five. Even excluding `docs/reviews/**`, it returns **six**, because the new E-229 row itself adds another matching `.md` file.

The same false count is entered as measured evidence at `CLAIMS.md:306`.

**Consequence:** the correction to a non-reproducible P-12 count is itself non-reproducible in the committed tree; “carried per date” did not survive another change made on that same date.

## F6 — P3 — part 6 was added without updating the gate’s own descriptions

The gate header says it asserts “five things” but lists four and does not mention binding: `tools/check-web-readonly.ts:7-18`. The new implementation begins part 6 at `tools/check-web-readonly.ts:634`.

The stale count and scope also remain in:

- `Makefile:192-195` — “Five parts,” while omitting both the secret and bind parts.
- `web/README.md:21` — “Five parts,” omitting the new bind check.

**Consequence:** the fix’s implementation and its canonical descriptions disagree immediately.

## ATTACKS I TRIED THAT FAILED

- The three advertised bind attacks do fail the committed detector when applied in memory to the real sources: `BIND_HOSTNAME = "0.0.0.0"`, bare `.listen(port)`, and replacing the constant with a LAN literal.
- A source set with no `.listen` fails instead of passing vacuously.
- The exact new `node:net` / `createConnection` spelling is counted as a second socket client.
- At `f7e7b43`, both actual listeners are explicitly loopback: `web/api/server.ts:177-180` and `web/app/vite.config.ts:13-25`.
- Manual inspection found no actual `Pair`/`Prepare` or signing path in the committed web tier. `signer-status.ts` accepts a typed `status` request and writes that fixed object: `web/api/signer-status.ts:157,176-192`.
- The `0700`/`0600` citations are accurate: `signer/src/ipc.rs:100-128` and `tools/issuer-view-snapshot.ts:261-272`.
- The quoted store statement is exact: `signer/src/store.rs:753-756`.
- E-228’s route citations hold: the issuer response returns `decrypted` at `web/api/issuer.ts:162-170`, and the signer route spreads the probe at `web/api/server.ts:73-78`.
- The Harmonize conclusion survived even though the count did not: every match inspected was project-authored, not a Harmonize primary source.
- `bun test web/api` reached 122 passes; four tests failed only because the read-only sandbox refused their temporary snapshot writes at `web/api/disclosure.test.ts:356`. I do not count those as repository defects.

## WHAT I RAN

```sh
git show f7e7b43 --stat
git show f7e7b43

git status --short --branch
git rev-parse HEAD
git diff f7e7b43^ f7e7b43 --name-status
git diff -- tools/check-web-readonly.ts
git status --short

git grep -n -I -i -E 'adds? no authority|grants? no authority|no new authority|authority that did not|moves? no trust boundary|boundary (that )?will not move|already readable|readable side|crosses no .new. boundary' f7e7b43 -- ':!docs/reviews/**'
git grep -n -I -i -E 'no adversarial review|not adversarially reviewed|zero adversarial|ADR-0003.*unreviewed' f7e7b43 -- ':!docs/reviews/**'
git grep -n -I -i -E 'trust boundary|signing authority|carry authority|never signs|holds no key' f7e7b43 -- ':!docs/reviews/**'
git grep -l -i -E 'harmonize|metaco' f7e7b43 -- '*.md' '*.ts' '*.rs' '*.json' ':(exclude)**/node_modules/**'
git grep -l -i -E 'harmonize|metaco' f7e7b43 -- '*.md' '*.ts' '*.rs' '*.json' ':(exclude)**/node_modules/**' ':(exclude)docs/reviews/**'

rg -n --glob '*.ts' --glob '*.tsx' '\.listen\s*\(|Bun\.serve\s*\(' web tools facility signer
rg -n --glob '*.ts' --glob '*.tsx' 'node:net|createConnection|Bun\.connect|net\.connect|Deno\.connect|unix:' web
rg -n -i 'break test|BIND_HOSTNAME|bare.*listen|node:net|createConnection|part 6|exit 1' docs/reviews/REVIEW-036*

nl -ba tools/check-web-readonly.ts
nl -ba tools/check-disclosure-phrases.ts
nl -ba docs/decisions/ADR-0003-web-tier-trust-boundary.md
nl -ba docs/architecture/ARCHITECTURE-2026-08-18.md
nl -ba web/app/src/routes/index.tsx
nl -ba web/app/vite.config.ts
nl -ba web/api/server.ts
nl -ba web/api/signer-status.ts
nl -ba signer/src/ipc.rs
nl -ba signer/src/store.rs
nl -ba tools/issuer-view-snapshot.ts
nl -ba web/api/issuer.ts
sed -n '302,311p' CLAIMS.md

bun run tools/check-web-readonly.ts
bun test web/api
```

I also ran three `bun -e` in-memory detector harnesses: one over synthetic bind/socket variants, one applying bind variants to the real `web/api` source set without writing fixtures, and one passing the assembled `net.connect`/`pair` client through every exported detector.

The worktree was clean at the start but acquired uncommitted edits to the ADR and two gates during the review. I did not overwrite them; all findings above were pinned with `git show`/`git grep` to `f7e7b43`.
