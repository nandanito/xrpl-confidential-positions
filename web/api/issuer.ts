/**
 * What the ISSUER sees — read from the CLI tool's OUTPUT, never decrypted here.
 *
 * ⚠ **`CLAIMS.md` P-9: a holder is never private from the issuer.** The
 * decryption mirror is mandatory and no configuration makes this false. Showing
 * the issuer's view beside the observer's is the honest counterpart to showing
 * what the public sees.
 *
 * # ⚠⚠ THIS MODULE HELD THE ISSUER KEY AND DECRYPTED PER REQUEST. THAT WAS A
 * DECRYPTION ORACLE, AND IT VIOLATED THIS MILESTONE'S OWN SCOPE.
 *
 * Architecture §6 step 8 — written by the session that then broke it — says the
 * tier **may touch** *"the issuer-view decryption tool's **output**, given a
 * demo issuer key handled as the secret it is"* and **may never touch** *"any
 * private key"*. `CLAUDE.md` says the issuer-view tool is *"a single CLI
 * command … **Not a standalone application**."*
 *
 * The first version read `WCONF_ELGAMAL_SK` from the environment and decrypted
 * on demand. ⚠ **An unauthenticated `GET` where the caller chooses the account
 * and receives a decrypted balance is an oracle** — CORS constrains browsers,
 * not `curl`, and `/meta`'s `holdsKeys: false` was false while it ran. It is
 * the **fourth rotation trigger `ADR-0003` names**, written by the same session
 * one file over (`CLAIMS.md` E-212).
 *
 * ⚠ **And the helper it used passed the secret through `argv`** —
 * `decryptInRange` spawns `mptool decrypt <ct> <sk> …`, and argv is
 * world-readable via `ps`: the precise exposure the issuer CLI refuses a
 * `--key` flag to avoid.
 *
 * # What it is now
 *
 * **A file reader.** `tools/issuer-view-snapshot.ts` holds the key, decrypts the
 * curated demo set in-process via `@xrplf/mpt-crypto`, and writes results. This
 * module reads those results. ⚠ **There is no key here, no decryption, no
 * subprocess and no attacker-chosen input** — the oracle is *removed*, not
 * guarded, so there is nothing to authenticate.
 */

import { readFileSync } from "node:fs";

/**
 * ⚠ **Named here so `check-web-readonly` can assert the web tier never READS
 * it.** The variable belongs to the CLI tool; this constant exists to be
 * checked against, not to be consulted.
 */
export const FORBIDDEN_SECRET_ENV = "WCONF_ELGAMAL_SK";

export const ISSUER_KEY_POLICY =
  "This process holds NO issuer key, performs NO decryption, and DOES NOT SERVE a decrypted " +
  "balance. The key lives only in tools/issuer-view-snapshot.ts, which reads it from the " +
  "environment — never a flag, because argv is world-readable via `ps` — decrypts a curated set " +
  "in-process, and writes results to a file it creates with mode 0600. ⚠ This tier reads that file " +
  "and forwards WHETHER a balance was decryptable, never the figure. " +
  "⚠⚠ Serving the figure was a disclosure boundary, not a signing one: loopback is not uid-scoped, " +
  "so an unauthenticated GET handed every local user a value the producing tool had just " +
  "restricted to one (CLAIMS.md E-228, ruled and removed E-241). There is no request that reaches " +
  "a decryption and none that returns one. The figure is in tools/issuer-decrypt-balance.ts, a CLI " +
  "command, which is where CLAUDE.md says the issuer view belongs.";

/** The ledger field the snapshot tool decrypts. Named once, asserted in tests. */
export const MIRROR_FIELD_LEDGER_NAME = "IssuerEncryptedBalance" as const;

/**
 * ⚠⚠ **READ LAZILY, AND THAT IS A CORRECTNESS FIX RATHER THAN A STYLE ONE.**
 *
 * As a module-level `const` this bound at import time — so a test that set
 * `WCONF_ISSUER_SNAPSHOT` afterwards was ignored, and a `await import()` handed
 * back the **cached** module rather than re-reading it. The refusal test
 * therefore pointed at the DEFAULT path, which is absent in a clean checkout,
 * so `issuerView` returned unavailable for that reason and the test passed
 * **whether or not the refusal existed**. ⚠ **Measured: deleting both refusal
 * lines left all 46 tests green** (`CLAIMS.md` E-215).
 *
 * ⚠ **Fifth instance in this repository of a check built to catch false passes
 * false-passing** (E-165, E-168, E-182, E-203, E-207) — and this one was
 * written in the round that fixed a false pass.
 */
function snapshotPath(): string {
  return process.env.WCONF_ISSUER_SNAPSHOT ?? "/tmp/wconf/issuer-view-snapshot.json";
}

export interface IssuerViewResult {
  available: boolean;
  reason?: string;
  keyPolicy: string;
  account: string;
  issuanceId: string;
  mirrorField?: string;
  /**
   * ⚠⚠ **`decrypted` IS NO LONGER SERVED — `CLAIMS.md` E-241, ruled 2026-09-05.**
   *
   * The snapshot still holds it; **this API does not forward it.** The tool that
   * produces the snapshot writes it `mode 0o600`, and serving its contents over
   * an unauthenticated loopback listener handed every local uid a value the
   * project had just restricted to one — `REVIEW-036` U1, `CLAIMS.md` E-228.
   *
   * ⚠ **The remedy is E-212's own: REMOVE the capability rather than guard it.**
   * There is no request that reaches a decryption **and none that returns one**,
   * so there is still nothing to authenticate.
   *
   * ⚠ **What the view keeps is the point it was making.** That the issuer CAN
   * read this balance is proved by `mirrorField` being present and populated on
   * the ledger — P-9, which no configuration removes. **The plaintext integer
   * demonstrated only that THIS PROJECT holds the demo issuer key**, which
   * nobody doubted. The integer lives where `CLAUDE.md` says it belongs: in
   * `tools/issuer-decrypt-balance.ts`, a CLI command, not a served field.
   */
  decryptedWithheld: true;
  /** ⚠ Whether the tool COULD decrypt it. The fact, not the figure. */
  decryptable?: boolean;
  searchedTo?: string;
  publicAmount?: string;
  /** ⚠ When the snapshot was taken. Balances move; a stale number is a lie by omission. */
  snapshotAtUnix?: number;
  snapshotAgeNote?: string;
  whatThisProves: string;
}

interface Snapshot {
  producedAtUnix?: number;
  entries?: Record<string, any>;
}

function loadSnapshot(): Snapshot | null {
  try {
    const parsed = JSON.parse(readFileSync(snapshotPath(), "utf8"));
    // ⚠ **A snapshot carrying anything key-shaped is REFUSED, not filtered.**
    // The tool writes results only; a file that does not look like that is not
    // a file this tier should be reading.
    const raw = JSON.stringify(parsed);
    // ⚠ Built from the constant, not inlined. A regex literal is not a string
    // literal, so an inlined spelling survives the gate's comment/literal
    // stripping and reads as a genuine secret reference — which is exactly what
    // it did on the first run of part 4.
    if (/"(sk|secret|privateKey|elgamal_sk|seed)"\s*:/i.test(raw)) return null;
    if (new RegExp(`\\b${FORBIDDEN_SECRET_ENV}\\b`).test(raw)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function issuerView(account: string, issuanceId: string): IssuerViewResult {
  const base = {
    decryptedWithheld: true as const,
    keyPolicy: ISSUER_KEY_POLICY,
    account,
    issuanceId,
    whatThisProves:
      "⚠ That the issuer can read this holder's balance, always. P-9 is not a limitation of this " +
      "demo — the decryption mirror is part of the protocol and no configuration removes it. A " +
      "holder is confidential from the PUBLIC, never from the ISSUER.",
  };

  const snap = loadSnapshot();
  if (!snap?.entries) {
    return {
      ...base,
      available: false,
      reason:
        `No issuer-view snapshot at ${snapshotPath()}. ⚠ This is a NAMED GAP in the view, not ` +
        `evidence that the issuer cannot decrypt — P-9 says it can. Produce one with: ` +
        `WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts`,
    };
  }

  const entry = snap.entries[`${account}/${issuanceId}`];
  if (!entry) {
    return {
      ...base,
      available: false,
      snapshotAtUnix: snap.producedAtUnix,
      reason:
        `This account is not in the snapshot. ⚠ The snapshot covers a CURATED demo set, not every ` +
        `account — that bound is what removes the attacker-chosen input, and it is deliberate. ` +
        `Add it to web/api/demo-accounts.ts and re-run the tool.`,
    };
  }

  return {
    ...base,
    available: Boolean(entry.available),
    reason: entry.reason,
    mirrorField: entry.mirrorField,
    // ⚠⚠ E-241: `entry.decrypted` is READ and deliberately NOT forwarded. Only
    // whether it exists crosses the boundary, never its value.
    decryptedWithheld: true,
    decryptable: entry.decrypted !== undefined,
    searchedTo: entry.searchedTo,
    publicAmount: entry.publicAmount,
    snapshotAtUnix: snap.producedAtUnix,
    snapshotAgeNote:
      "⚠ A SNAPSHOT, not a live read. Balances move; this is what the issuer saw when the tool ran.",
  };
}
