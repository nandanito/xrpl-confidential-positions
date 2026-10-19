/**
 * The **only** Unix-domain-socket client in this repository's web tier.
 *
 * Architecture §6 step 8, decision D1 (`ADR-0003`): the web tier may send
 * `Request::Status` and nothing else. `Pair` and `Prepare` are the requests
 * that carry authority, and neither is constructible from anywhere under
 * `web/`. This file is what `tools/check-web-readonly.ts` pins.
 *
 * # Why this file exists in `web/api/` and not in `web/app/`
 *
 * `signer/src/ipc.rs` is a Unix domain socket precisely so that *"a browser
 * page cannot connect at all. No web API opens a Unix socket."* That property
 * closes the XSS-to-spend-oracle path by construction. ⚠ **A server function
 * in the browser application would reach around it in one line** — which is
 * exactly what TanStack Start's server functions are for — so the socket lives
 * on the far side of an HTTP hop that the browser cannot bypass, and the gate
 * asserts that nothing under `web/app/` imports this module or names the path.
 *
 * # What `Status` actually returns, which is not what its comment used to say
 *
 * ⚠ Until 2026-08-28 `protocol.rs` documented this variant as a *"Public
 * ledger read"*. **It reads no ledger.** `session.rs`'s handler returns the
 * crate version, a hardcoded `keys_loaded`, and a note carrying the holder's
 * address, the randomness ledger's generation id and its entry count
 * (`CLAIMS.md` E-205). None of that is a secret.
 *
 * ⚠⚠ **BUT IT DOES EXCEED WHAT THE PROTOCOL PUBLISHES, AND THIS COMMENT SAID
 * OTHERWISE UNTIL 2026-09-04 — `CLAIMS.md` E-239.** `signer/src/store.rs:753-756`
 * commits a record *"on success **and** on any local failure before emission — a
 * cancelled confirmation, a failed proof, an aborted attempt"*, so the **entry
 * count includes attempts that never reached the ledger and no observer can
 * reconstruct.** P-4 and P-11 leave *who transacts and how often* public; they
 * do not publish this count, nor the local socket path this module also returns.
 *
 * ⚠ The retracted claim (E-230) surviving as a paraphrase — the shape the
 * disclosure-phrase gate cannot catch.
 */

import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** What the signer answers. Mirrors `Response::Status` in `protocol.rs`. */
export interface SignerStatus {
  version: string;
  keysLoaded: boolean;
  note: string;
}

/** Why a status read did not happen. A missing signer is not an error here. */
export type SignerProbe =
  | { reachable: true; status: SignerStatus; socketPath: string }
  | { reachable: false; reason: string; socketPath: string };

/**
 * Where the signer puts its socket, mirroring `ipc.rs::default_socket_path`.
 *
 * ⚠ Mirrored, not shared — one is Rust and one is TypeScript, so this is two
 * readings of one convention and it can drift. `signerSocketPath` is exported
 * so a test can assert the shape rather than leaving the duplication silent.
 */
export const SIGNER_SOCKET_LEAF = "signer.sock";
export const SIGNER_SOCKET_DIR_PREFIX = "wconf-signer-";

/**
 * Every directory the signer might have put its socket under, in order.
 *
 * ⚠⚠ **MIRRORING RUST'S CHOICE WAS TRIED AND IS THE WRONG APPROACH.** Round one
 * replaced a hardcoded `/tmp` with `os.tmpdir()`, and round two showed that still
 * diverges: **measured with `TMPDIR` unset and `TMP` set, Rust bound at
 * `/var/folders/…/T` while Node's `tmpdir()` returned `TMP`.** Rust's Unix
 * `std::env::temp_dir()` reads `TMPDIR` and then the Darwin per-user directory;
 * Node's reads `TMPDIR`, `TMP`, `TEMP`, `/tmp`. **They are different algorithms
 * and no amount of care makes one file predict the other** — that is two
 * readings of one convention, which is this repository's most-recorded drift
 * source (`CLAIMS.md` E-221).
 *
 * ⚠ **So this DISCOVERS rather than PREDICTS**: it tries each candidate and
 * uses the first whose socket actually exists. When none does, it reports every
 * path it looked at, which turns an invisible mismatch into a legible message.
 */
export function signerSocketCandidates(): string[] {
  const dirs = [
    process.env.XDG_RUNTIME_DIR,
    process.env.TMPDIR,
    tmpdir(),
    "/tmp",
  ].filter((d): d is string => Boolean(d));
  const uid = process.getuid?.() ?? 0;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of dirs) {
    const p = join(d, `${SIGNER_SOCKET_DIR_PREFIX}${uid}`, SIGNER_SOCKET_LEAF);
    if (!seen.has(p)) { seen.add(p); out.push(p); }
  }
  return out;
}

/**
 * The socket to talk to: an explicit override, else the first candidate that
 * exists, else the first candidate (so the error names something concrete).
 */
export function signerSocketPath(): string {
  const override = process.env.WCONF_SIGNER_SOCKET;
  if (override) return override;
  const candidates = signerSocketCandidates();
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

/**
 * Ask the signer for its status. **The only request this tier can build.**
 *
 * There is deliberately no `pair()` and no `prepare()` here, and adding one is
 * not a code-review question — it is the trust-boundary change `ADR-0003`
 * names as a rotation trigger.
 */
export async function readSignerStatus(timeoutMs = 2000): Promise<SignerProbe> {
  const socketPath = signerSocketPath();

  // The one and only request body this tier constructs. `type: "status"` is
  // `Request::Status` under `#[serde(tag = "type", rename_all = "snake_case")]`.
  const request = { type: "status" as const };

  try {
    const reply = await ask(socketPath, request, timeoutMs);
    if (reply.status !== "status") {
      return { reachable: false, socketPath, reason: `signer answered "${reply.status}", not "status"` };
    }
    return {
      reachable: true,
      socketPath,
      status: { version: reply.version, keysLoaded: reply.keys_loaded, note: reply.note },
    };
  } catch (e) {
    // ⚠ An unreachable signer is a NAMED GAP, not a failure. The web tier is
    // read-only, so every ledger view it renders is complete without one.
    const tried = process.env.WCONF_SIGNER_SOCKET ? [socketPath] : signerSocketCandidates();
    return {
      reachable: false,
      socketPath,
      // ⚠ Naming every path looked at is what makes a default-path mismatch
      // legible instead of silent — round one's bug was invisible for exactly
      // this reason (E-220, E-221).
      reason: `${e instanceof Error ? e.message : String(e)} (looked at: ${tried.join(", ")})`,
    };
  }
}

/**
 * ⚠ **The timeout must CLOSE THE SOCKET, not merely stop waiting.**
 *
 * The first version raced `ask()` against a timer and left `ask` running: its
 * `finally { sock.end() }` only fires when the inner promise settles, so a
 * signer that accepts the connection and never writes a newline leaves the
 * socket open **forever**. Repeated `/api/signer` polls then leak one file
 * descriptor each (`CLAIMS.md` E-213). The deadline now lives *inside* `ask`,
 * where it can reject the pending promise and let `finally` run.
 *
 * ⚠ **The falsifier is not a file-descriptor count, it is TERMINATION.**
 * Measured 2026-08-28 against a fake signer that accepts the connection and
 * never writes: the racing version leaves `answered` pending forever, so the
 * process **never exits** — a 12-probe script had to be killed after five
 * minutes. The same script against this version completes in under a second.
 */
async function ask(socketPath: string, request: { type: "status" }, timeoutMs: number): Promise<any> {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const answered = new Promise<any>((res, rej) => { resolve = res; reject = rej; });

  const deadline = setTimeout(() => reject(new Error(`no answer in ${timeoutMs}ms`)), timeoutMs);
  // ⚠⚠ **THE ORPHANED PROMISE MUST NOT BECOME AN UNHANDLED REJECTION.** When
  // `Bun.connect` rejects — the ordinary case, because the signer is OPTIONAL —
  // nothing ever awaits `answered`, and the still-armed deadline then rejects
  // it into the void. Bun reports that as an unhandled rejection and exits
  // non-zero. **Round one's fix moved the deadline inside `ask` and left the
  // CONNECT outside the cleanup scope, so it fixed the hang and created this**
  // (`CLAIMS.md` E-215). The no-op catch makes the promise handled from birth;
  // the `finally` below clears the timer on every path including that one.
  answered.catch(() => {});

  let buffered = "";
  let sock: Awaited<ReturnType<typeof Bun.connect>> | undefined;
  try {
    sock = await Bun.connect({
    unix: socketPath,
      socket: {
        data(_s, chunk) {
          buffered += chunk.toString();
          const line = buffered.indexOf("\n");
          if (line >= 0) {
            try { resolve(JSON.parse(buffered.slice(0, line))); }
            catch (e) { reject(new Error(`signer sent malformed JSON: ${e}`)); }
          }
        },
        error(_s, e) { reject(e); },
        close() { reject(new Error("the signer closed the connection without answering")); },
      },
    });

    sock.write(JSON.stringify(request) + "\n");
    // ⚠ `finally` runs on the timeout too, because the deadline rejects the
    // promise this `await` is on rather than racing a separate one.
    return await answered;
  } finally {
    // ⚠ **Connect is INSIDE this scope now.** Round one's version started the
    // try/finally after `await Bun.connect`, so a connect failure skipped the
    // cleanup entirely and left the timer armed.
    clearTimeout(deadline);
    sock?.end();
  }
}
