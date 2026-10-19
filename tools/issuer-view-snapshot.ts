/**
 * `issuer-view-snapshot` — decrypt the demo set ONCE, to a file the web tier reads.
 *
 * ⚠⚠ **THIS EXISTS BECAUSE THE WEB TIER HELD THE ISSUER KEY AND THAT VIOLATED
 * ITS OWN SCOPE.** Architecture §6 step 8, written by the session that then
 * broke it, says the tier **may touch** *"the issuer-view decryption tool's
 * **output**, given a demo issuer key handled as the secret it is"* and **may
 * never touch** *"any private key"*. `CLAUDE.md` is equally plain: the
 * issuer-view tool is *"a single CLI command … **Not a standalone
 * application**."*
 *
 * The first implementation put `WCONF_ELGAMAL_SK` in the API process and
 * decrypted per request. ⚠ **That is a decryption oracle**: an unauthenticated
 * `GET` where the caller chooses the account and receives a decrypted balance —
 * **the exact thing `ADR-0003` names as its fourth rotation trigger, written by
 * the same session, one file over** (`CLAIMS.md` E-212).
 *
 * # What this is instead
 *
 * A CLI. It holds the key, decrypts the **curated demo set**, and writes a JSON
 * file of *results*. The web tier reads that file and **never sees a key**.
 *
 * ⚠ **The attacker-chosen input is gone, not merely guarded.** There is no
 * request that reaches a decryption, so there is nothing to authenticate.
 *
 * # Why `decryptAmount` and not `mptool`
 *
 * ⚠ **`facility/src/mptool.ts::decryptInRange` passes the secret as a
 * COMMAND-LINE ARGUMENT** — `Bun.spawnSync([tool, "decrypt", ct, sk, …])` — and
 * argv is world-readable via `ps`. **That is the precise exposure the issuer
 * tool refuses a `--key` flag to avoid**, reintroduced by the helper chosen to
 * avoid a different problem. `@xrplf/mpt-crypto`'s `decryptAmount` is
 * **in-process**: no subprocess, no argv, and it is what
 * `tools/issuer-decrypt-balance.ts` already uses.
 *
 * # Usage
 *
 *   WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts [--max N] [--out PATH]
 *
 * ⚠ **No `--key` flag, on purpose**, matching the tool this one stands beside.
 */

import { decryptAmount } from "@xrplf/mpt-crypto";
import { writeFileSync } from "node:fs";
import { DEMO_ACCOUNTS, DEMO_ISSUANCE } from "../web/api/demo-accounts.ts";

const DEVNET_RPC = process.env.WCONF_LEDGER_ENDPOINT ?? "https://s.devnet.rippletest.net:51234";
const DEVNET_NETWORK_ID = 2;
/**
 * Strict argument parsing.
 *
 * ⚠ **A mistyped `--out` silently used the default and wrote decrypted results
 * somewhere the operator did not choose**; `--out` with no value did the same.
 * For a tool that decrypts confidential balances, a typo must stop it rather
 * than redirect its output (`CLAIMS.md` E-220).
 */
const KNOWN_FLAGS = new Set(["--out", "--max"]);

/** An argument reduced to its option name. ⚠ Anything after `=` is dropped. */
export function redact(arg: string): string {
  const eq = arg.indexOf("=");
  if (eq >= 0) return `${arg.slice(0, eq)}=<redacted>`;
  // A bare value that looks like key material must not be echoed either.
  if (/^[0-9A-Fa-f]{32,}$/.test(arg)) return "<redacted>";
  return arg;
}
const FLAGS: Record<string, string> = (() => {
  const argv = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    // ⚠⚠ **NEVER ECHO THE VALUE.** The obvious misuse of a tool that
    // deliberately has no key flag is `--key=<64 hex>`, and the first version
    // wrote the whole argument to stderr — turning transient argv exposure into
    // a persistent CI or service log (`CLAIMS.md` E-221). Only the option NAME
    // is ever printed, and anything after `=` is dropped.
    const shown = redact(a);
    if (!a.startsWith("--")) {
      console.error(`unexpected argument: ${shown}`);
      process.exit(2);
    }
    if (!KNOWN_FLAGS.has(a.split("=")[0])) {
      console.error(`unknown flag: ${shown}. Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
      process.exit(2);
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) {
      console.error(`${a.split("=")[0]} requires a value`);
      process.exit(2);
    }
    if (a in out) { console.error(`${a.split("=")[0]} given twice`); process.exit(2); }
    out[a] = v;
    i++;
  }
  return out;
})();

function flag(name: string): string | undefined {
  return FLAGS[name];
}

const OUT = flag("--out") ?? "/tmp/wconf/issuer-view-snapshot.json";



/**
 * A UINT64 as a **decimal string**, never a JS `Number`.
 *
 * ⚠⚠ **`Number.MAX_SAFE_INTEGER` is 9007199254740991; a UINT64 reaches
 * 18446744073709551615.** `MPTAmount`, `ConfidentialOutstandingAmount` and a
 * decrypted balance are all UINT64, and rippled serialises them as JSON
 * **strings** for exactly this reason — so converting them to `Number` on the
 * way into the snapshot silently rounds any value above 2^53 and the issuer
 * page then displays a wrong balance with no indication anything happened
 * (`CLAIMS.md` E-215).
 *
 * ⚠ **The demo's values are small, which is precisely why this would not have
 * been noticed.** Kept lossless end to end — snapshot, API and UI all carry the
 * string.
 */
function dec(v: unknown): string {
  if (v === undefined || v === null) return "0";
  if (typeof v === "bigint") return v.toString();
  return String(v);
}

async function rpc(method: string, params: Record<string, unknown>): Promise<any> {
  // ⚠⚠ **`redirect: "error"`, because a followed redirect is a SUBSTITUTED
  // SOURCE that the snapshot would then record as the configured endpoint.**
  // `fetch` follows 307/308 by default, so a redirecting endpoint could serve
  // ledger data from another origin while the file said otherwise — exactly the
  // substitution `CLAUDE.md` forbids, in the tool whose whole output is a claim
  // about what a ledger said (`CLAIMS.md` E-220).
  const r = await fetch(DEVNET_RPC, {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params: [params] }),
  });
  // ⚠ Belt and braces: even with redirects refused, assert the origin answered.
  if (new URL(r.url).origin !== new URL(DEVNET_RPC).origin) {
    throw new Error(
      `${method} was answered by ${new URL(r.url).origin}, not the configured ` +
      `${new URL(DEVNET_RPC).origin}. A substituted source is a corrupted one.`,
    );
  }
  if (!r.ok) throw new Error(`${method} answered ${r.status}`);
  const j = await r.json();
  if (j.result?.error) throw new Error(`${method}: ${j.result.error_message ?? j.result.error}`);
  return j.result;
}

/**
 * A read PINNED to one validated index, and CHECKED to have come from it.
 *
 * ⚠⚠ **`CLAIMS.md` E-103, observed live: two `"validated"` reads seconds apart
 * land in DIFFERENT ledgers**, because the public endpoint is a cluster —
 * `account_objects` at 4596692 and `account_info` at 4596693, back to back. **A
 * snapshot assembled from both is a state that never existed.**
 *
 * ⚠ The first version of this tool resolved `"validated"` **per account, in a
 * loop, with an ElGamal discrete-log search between each one** — so the window
 * was seconds wide and the output was labelled as one snapshot. `Snapshot` in
 * `facility/src/loopback.ts` has done this correctly since step 7; this tool
 * did not compose it and re-made the mistake the project had already paid for.
 */
async function pinned(index: number, method: string, params: Record<string, unknown>): Promise<any> {
  const result = await rpc(method, { ...params, ledger_index: index });
  const answered = Number(result.ledger_index ?? result.ledger_current_index ?? NaN);
  if (answered !== index) {
    throw new Error(
      `${method} answered from ledger ${answered}, not the pinned ${index}. ` +
      `A snapshot assembled from two ledgers is a state that never existed (CLAIMS.md E-103).`,
    );
  }
  return result;
}

const key = process.env.WCONF_ELGAMAL_SK;
if (!key) {
  console.error("WCONF_ELGAMAL_SK is not set.\n");
  console.error("There is no --key flag on purpose: argv is world-readable via `ps` and is logged");
  console.error("to shell history. Export it, or run this from a shell that does not persist history.");
  process.exit(2);
}
if (!/^[0-9A-Fa-f]{64}$/.test(key)) {
  console.error(`WCONF_ELGAMAL_SK must be 64 hex characters, got ${key.length}`);
  process.exit(2);
}

const srv = await rpc("server_info", {});
const netId = Number(srv?.info?.network_id ?? NaN);
if (netId !== DEVNET_NETWORK_ID) {
  console.error(`refusing to proceed: network_id ${netId}, expected ${DEVNET_NETWORK_ID} (Devnet).`);
  process.exit(1);
}

// ⚠ **One index, taken once, and every later call carries it.** See `pinned`.
const LEDGER_INDEX = Number(
  (await rpc("ledger", { ledger_index: "validated" }))?.ledger_index ??
  (await rpc("server_info", {}))?.info?.validated_ledger?.seq,
);
if (!Number.isFinite(LEDGER_INDEX)) {
  console.error("could not resolve a validated ledger index to pin to");
  process.exit(1);
}

const iss = (await pinned(LEDGER_INDEX, "ledger_entry", { mpt_issuance: DEMO_ISSUANCE }))?.node;
// ⚠ The issuance's own outstanding amount is a SOUND upper bound and the cost is
// linear in it from zero (CLAIMS.md F-15) — so this is a bound, not a guess.
const max = BigInt(flag("--max") ?? iss?.ConfidentialOutstandingAmount ?? "100000");

console.log(`issuer-view snapshot — ${DEMO_ACCOUNTS.length} account(s), searching [0, ${max}]`);
console.log(`pinned to validated ledger ${LEDGER_INDEX}`);
console.log(`⚠ Devnet only. The holders did not consent to this read and cannot prevent it.\n`);

const entries: Record<string, unknown> = {};
let ok = 0;

for (const a of DEMO_ACCOUNTS) {
  const objs = await pinned(LEDGER_INDEX, "account_objects", { account: a.address, type: "mptoken" });
  const mpt = (objs?.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === a.issuanceId);
  const id = `${a.address}/${a.issuanceId}`;

  if (!mpt) {
    entries[id] = { available: false, reason: `${a.address} holds no MPToken for this issuance.` };
    console.log(`  ${a.address}  no MPToken`);
    continue;
  }
  const mirror = mpt.IssuerEncryptedBalance;
  if (!mirror) {
    entries[id] = { available: false, publicAmount: dec(mpt.MPTAmount), reason: `no ${"IssuerEncryptedBalance"} — confidential state was probably never initialised.` };
    console.log(`  ${a.address}  no mirror`);
    continue;
  }

  try {
    const amount = await decryptAmount(mirror, key, max);
    entries[id] = {
      available: true,
      decrypted: dec(amount),
      publicAmount: dec(mpt.MPTAmount),
      mirrorField: "IssuerEncryptedBalance",
      searchedTo: dec(max),
    };
    console.log(`  ${a.address}  ${String(amount).padStart(8)}   (public MPTAmount ${mpt.MPTAmount ?? 0})`);
    ok++;
  } catch {
    entries[id] = {
      available: false,
      publicAmount: dec(mpt.MPTAmount),
      // ⚠ A miss is AN ANSWER, and it has two readings this file will not collapse.
      reason: `did not decrypt in [0, ${max}] — either the balance exceeds the window (raise --max; ` +
        `cost is linear from zero, F-15) or WCONF_ELGAMAL_SK is not this issuance's issuer key. ` +
        `⚠ It is NOT evidence that the issuer cannot decrypt (CLAIMS.md P-9).`,
    };
    console.log(`  ${a.address}  no decrypt in [0, ${max}]`);
  }
}

// ⚠ Results only. **No key material of any kind reaches this file** — that is
// the whole point of the tool, and `web/api/issuer.ts` asserts the shape.
const snapshot = {
  producedBy: "tools/issuer-view-snapshot.ts",
  producedAtUnix: Math.floor(Number(process.env.WCONF_SNAPSHOT_UNIX ?? Date.now()) / 1000),
  issuance: DEMO_ISSUANCE,
  endpoint: DEVNET_RPC,
  searchedTo: dec(max),
  ledgerIndex: LEDGER_INDEX,
  entries,
};
writeFileSync(OUT, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

console.log(`\n${ok}/${DEMO_ACCOUNTS.length} decrypted -> ${OUT}`);
console.log(`⚠ This file contains RESULTS, never a key. The web tier reads it and holds no secret.`);
console.log(`⚠ It is a SNAPSHOT: balances move, and the web tier prints when it was taken.`);
