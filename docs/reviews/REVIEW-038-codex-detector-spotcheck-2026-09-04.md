# REVIEW-038 — detector spot-check: Codex leg (verbatim)

- **Date:** 2026-09-04
- **Scope:** ⚠ **A NARROW SPOT-CHECK, NOT A ROTATION.** One question: can a
  violation get past `bindVerdict`, `hostKeyVerdict` or `socketClients`?
- **Access:** full repository, read-only sandbox.
- **Why:** `bindVerdict` was the THIRD version of a detector that had
  false-passed twice (E-227, E-235) and `socketClients` the third of one that
  had false-passed twice (E-226, E-234). The adjudicator asked for it against
  their own work.

⚠⚠ **PROCESS FAILURE, RECORDED: the adjudicator EDITED THE DETECTORS WHILE THIS
LEG WAS READING THEM**, which is exactly what `CLAUDE.md`'s `REVIEW-022` rule
forbids — *do not let files move under a leg*. **The leg detected the change,
pinned the file by hash and re-ran every result against the final version**, so
the findings stand. **That it survived is luck plus a careful leg, not process.**

⚠ **Verbatim leg output.** Adjudicated inline below by the fixes recorded in
`CLAIMS.md` E-237 and E-238.

---

## VERDICT: broken

All three detectors can false-pass. The disclosure marker window can also forgive an unrelated assertion. Correct trees can false-fail as well.

Results refer to the final observed `check-web-readonly.ts` content hash `c10aeea621d1b284f67f7a8f7e2ed06ae537dd1f`. The file changed externally during review; I reran everything against this final version. I made no filesystem changes.

## EVASIONS THAT WORKED

### P1 — `bindVerdict`: shadowed identifier resolves to the wrong declaration

The resolver searches every source for any matching literal assignment without resolving lexical scope ([tools/check-web-readonly.ts:726]($REPO/tools/check-web-readonly.ts:726)).

```ts
const HOST = "127.0.0.1";

function start(HOST: string) {
  app.listen({ port: 3011, hostname: HOST });
}

start("0.0.0.0");
```

Actual output:

```text
{"ok":true,"why":"1 bind call(s), every hostname resolved to a loopback literal"}
```

The runtime `HOST` is the parameter containing `0.0.0.0`; the detector resolves it to the unrelated outer constant.

Two independent bind bypasses also worked:

```ts
app.listen({
  port: 3011,
  hostname: "127.0.0.1",
  hostname: "0.0.0.0",
});
```

```text
{"ok":true,"why":"1 bind call(s), every hostname resolved to a loopback literal"}
```

Only the first `hostname` match is inspected at [tools/check-web-readonly.ts:711]($REPO/tools/check-web-readonly.ts:711).

```ts
app.listen({ port: 3011, hostname: "127.0.0.1" });

(Bun.serve)({
  port: 3012,
  hostname: "0.0.0.0",
  fetch: () => new Response("ok"),
});
```

```text
{"ok":true,"why":"1 bind call(s), every hostname resolved to a loopback literal"}
```

The parenthesized `Bun.serve` spelling is invisible to the exact matcher at [tools/check-web-readonly.ts:699]($REPO/tools/check-web-readonly.ts:699).

### P1 — `hostKeyVerdict`: computed key bypasses collection

```ts
export default {
  server: { ["host"]: "0.0.0.0" },
  preview: { host: "127.0.0.1" },
};
```

Actual output:

```text
{"ok":true,"why":"1 host: key(s), all loopback"}
```

The computed server key is missed; the harmless preview key satisfies the nonempty guard. The collector only recognizes bare `host:` at [tools/check-web-readonly.ts:773]($REPO/tools/check-web-readonly.ts:773).

### P1 — `socketClients`: dynamic bare-`net` client is invisible

```ts
// web/api/real.ts
Bun.connect({ unix: "/run/wconf/signer.sock" });

// web/api/second.ts
const transport = await import("net");
const p = ["/run/wconf/signer", "sock"].join(".");
transport.connect({ path: p });
```

Actual output:

```text
["web/api/real.ts"]
```

There are two source files opening the signer socket, but only one is returned. The substring list and counting logic are at [tools/check-web-readonly.ts:408]($REPO/tools/check-web-readonly.ts:408) and [tools/check-web-readonly.ts:428]($REPO/tools/check-web-readonly.ts:428).

Even a static bare import evades through legal whitespace:

```ts
import transport from
  "net";

transport.connect({ path: "/tmp/other.sock" });
```

With the real client beside it:

```text
["web/api/real.ts"]
```

### P1 — disclosure marker remains context-free within six lines

The marker check at [tools/check-disclosure-phrases.ts:166]($REPO/tools/check-disclosure-phrases.ts:166) only tests substring proximity.

```text
E-224: unrelated migration-note reference.
filler one
filler two
filler three
filler four
filler five
It hides AMOUNTS. It hides nothing else
```

Actual output filtered to the injected source:

```text
unrelated_marker_at_six_lines: []
```

Moving that same unrelated marker outside the window proves the phrase itself was otherwise detectable:

```text
same_marker_outside_window: [{"file":"<far>","line":9,"phrase":"It hides AMOUNTS. It hides nothing else","why":"Convert and ConvertBack publish MPTAmount in plaintext; only a Send hides one (E-224, F-24)"}]
```

## FALSE-FAILS THAT WORKED

### P1 — correct two-level loopback constant fails

```ts
const LOOPBACK = "127.0.0.1";
const HOST = LOOPBACK;
app.listen({ port: 3011, hostname: HOST });
```

Actual output:

```text
{"ok":false,"why":"web/api/server.ts: hostname `HOST` resolves to no string literal in this source set"}
```

### P1 — unrelated test-helper `.listen()` fails the bind gate

```ts
// web/api/server.ts
app.listen({ port: 3011, hostname: "127.0.0.1" });

// web/api/server.test.ts
const probe = { listen() {} };
probe.listen();
```

Actual output:

```text
{"ok":false,"why":"web/api/server.test.ts: .listen() passes NO hostname — Bun.serve then defaults to 0.0.0.0 (E-213)"}
```

Every `.listen()` method is treated as a network bind by [tools/check-web-readonly.ts:699]($REPO/tools/check-web-readonly.ts:699).

### P1 — correct quoted `host` key fails

```ts
export default {
  server: { "host": "127.0.0.1" },
};
```

Actual output:

```text
{"ok":false,"why":"no `host:` key found under web/app — this check would pass vacuously"}
```

### P1 — unrelated prose containing `host:` fails

```ts
export default { server: { host: "127.0.0.1" } };
const docs = "Example only: host: '0.0.0.0'";
```

Actual output:

```text
{"ok":false,"why":"web/app/vite.config.ts: host: '0.0.0.0'\"; is not a loopback literal"}
```

### P1 — type-only socket import is counted as a second client

```ts
// web/api/real.ts
Bun.connect({ unix: "/run/wconf/signer.sock" });

// web/api/types.ts
import type { Socket } from "node:net";
export type Connection = Socket;
```

Actual output:

```text
["web/api/real.ts","web/api/types.ts"]
```

No socket is opened by the second file.

## WHAT I TRIED AND COULD NOT BREAK

- Balanced bind arguments now work. This correct call returned `ok:true`:

  ```ts
  Bun.serve({
    fetch() { return new Response("ok"); },
    hostname: "127.0.0.1",
  });
  ```

- Direct non-loopback literals, bare `.listen(port)`, environment expressions, and direct `Bun.serve({hostname:"0.0.0.0"})` were rejected.
- `host: process.env.H` and direct non-loopback `host:` values were rejected by the widened collector.
- This computed host value was rejected:

  ```ts
  host: "127.0.0.1".replace("127.0.0.1", "0.0.0.0")
  ```

- A comment containing `host: "0.0.0.0"` was stripped correctly; the legitimate host returned:

  ```text
  {"ok":true,"why":"1 host: key(s), all loopback"}
  ```

- Direct `node:net`, `createConnection`, same-line `from "net"`, and `net.connect` spellings were counted.
- A constant absent from the supplied source set failed closed rather than bypassing the bind detector.

## WHAT I RAN

- `bun run tools/check-web-readonly.ts` — exit 0, all 48 built-in controls passed.
- `bun run tools/check-disclosure-phrases.ts` — exit 0, all 5 built-in controls passed.
- `bun -e` harnesses importing the real exported functions.
- Each in-memory source was constructed as:

  ```ts
  const code = stripComments(raw);
  { path: rel, rel, code, ident: stripStringLiterals(code) }
  ```

- `nl -ba` for cited detector lines and `shasum` to pin the tested version.

