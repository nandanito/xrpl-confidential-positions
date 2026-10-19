/**
 * issuer-decrypt-balance.ts — what the ISSUER sees.
 *
 * CLAUDE.md: *"a single CLI command that reads one account's
 * sfIssuerEncryptedBalance and decrypts it given the issuer key. Not a
 * standalone application."* This is that command and nothing more.
 *
 *   WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-decrypt-balance.ts <account> <MPTokenIssuanceID>
 *   bun run tools/issuer-decrypt-balance.ts <account> <id> --key-file ./issuer.sk --max 100000
 *   bun run tools/issuer-decrypt-balance.ts <account> <id> --field AuditorEncryptedBalance
 *
 * ## Why this exists
 *
 * *"Showing what the issuer sees is the honest counterpart to showing what the
 * public sees."* `observer-harness.ts` demonstrates that amounts are hidden from
 * everyone. This demonstrates that "everyone" never includes the issuer. Both
 * are needed, or the confidentiality story is only half told — see CLAIMS.md
 * P-9, which forbids ever claiming a holder is private from the issuer.
 *
 * ## The key never goes on the command line
 *
 * argv is visible to every process on the machine via `ps`, and lands in shell
 * history. The key comes from `WCONF_ELGAMAL_SK` or from `--key-file`. There is
 * deliberately no `--key` flag.
 *
 * ## Decryption cost, and a sharp edge in the upstream API
 *
 * ElGamal decryption here is a linear discrete-log search. `@xrplf/mpt-crypto`
 * exposes `decryptAmount(ciphertext, privateKey, rangeHigh)` and **fixes the low
 * bound at 0**, so cost is always O(rangeHigh) from zero — the C library's
 * `range_low` parameter, and with it the ability to search a narrow window
 * around a known balance, is not reachable from the published package
 * (CLAIMS.md F-15, UPSTREAM-FEEDBACK U-33). Pass the tightest `--max` you can
 * justify; the issuance's own `ConfidentialOutstandingAmount` is a sound upper
 * bound and is used as the default.
 */
import { decryptAmount } from "@xrplf/mpt-crypto";
import { readFileSync } from "node:fs";

const DEVNET_WS = "wss://s.devnet.rippletest.net:51233";
const DEVNET_NETWORK_ID = 2;
const MIRROR_FIELDS = ["IssuerEncryptedBalance", "AuditorEncryptedBalance", "ConfidentialBalanceSpending", "ConfidentialBalanceInbox"];

let ws: WebSocket, nextId = 0;
const pending = new Map<number, (v: any) => void>();
const rpc = (cmd: Record<string, unknown>): Promise<any> => {
  const id = ++nextId;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, ...cmd })); });
};

/**
 * Strict parser. REVIEW-006 found that a filter-based approach silently
 * reinterprets arguments: an unknown or mistyped flag makes its value become the
 * account, and the real account becomes the issuance ID — so the tool queries
 * the wrong holder and reports confidently. For an evidence command that is
 * worse than a crash, so unknown flags are now a hard error.
 */
function parseArgs(args: string[]) {
  const VALUED = new Set(["--key-file", "--max", "--field"]);
  const opts: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [flag, inline] = a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, undefined];
      if (!VALUED.has(flag)) { console.error(`unknown flag: ${flag}`); process.exit(2); }
      const value = inline ?? args[++i];
      if (value === undefined || value.startsWith("--")) { console.error(`${flag} requires a value`); process.exit(2); }
      opts[flag] = value;
    } else positional.push(a);
  }
  if (positional.length !== 2) { console.error(`expected exactly 2 positional arguments, got ${positional.length}`); process.exit(2); }
  return { opts, positional };
}

function readKey(opts: Record<string, string>): string {
  let raw: string | undefined;
  if (opts["--key-file"]) {
    try { raw = readFileSync(opts["--key-file"], "utf8"); }
    catch {
      // Deliberately no path and no raw exception text: the key-file location is
      // secret-adjacent and an uncaught fs error prints it.
      console.error("could not read the key file");
      process.exit(2);
    }
  } else raw = process.env.WCONF_ELGAMAL_SK;
  if (!raw) {
    console.error("no key. Set WCONF_ELGAMAL_SK=<64 hex chars>, or pass --key-file <path>.");
    console.error("There is no --key flag on purpose: argv is world-readable via ps and is logged to shell history.");
    process.exit(2);
  }
  const key = raw.trim().toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(key)) { console.error(`key must be 64 hex characters, got ${key.length}`); process.exit(2); }
  return key;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("usage: bun run tools/issuer-decrypt-balance.ts <account> <MPTokenIssuanceID> [--field F] [--max N] [--key-file P]");
    process.exit(2);
  }
  const { opts, positional } = parseArgs(argv);
  const [account, issuanceIdRaw] = positional;
  const issuanceId = issuanceIdRaw.toUpperCase();   // rippled returns uppercase hex; accept either
  if (!/^[0-9A-F]{48}$/.test(issuanceId)) { console.error("MPTokenIssuanceID must be 48 hex characters (24 bytes)"); process.exit(2); }
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(account)) { console.error(`does not look like an account address: ${account}`); process.exit(2); }
  const flagValue = (name: string) => opts[name];
  const key = readKey(opts);
  const field = flagValue("--field") ?? "IssuerEncryptedBalance";
  if (!MIRROR_FIELDS.includes(field)) { console.error(`--field must be one of: ${MIRROR_FIELDS.join(", ")}`); process.exit(2); }

  ws = new WebSocket(DEVNET_WS);
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error(`cannot reach ${DEVNET_WS}`)); });
  ws.onmessage = (e) => { const m = JSON.parse(e.data as string); const cb = pending.get(m.id); if (cb) { pending.delete(m.id); cb(m); } };
  const srv = await rpc({ command: "server_info" });
  if (srv.result?.info?.network_id !== DEVNET_NETWORK_ID) {
    ws.close();
    console.error(`refusing to proceed: network_id ${srv.result?.info?.network_id}, expected ${DEVNET_NETWORK_ID} (Devnet)`);
    process.exit(1);
  }

  const iss = (await rpc({ command: "ledger_entry", mpt_issuance: issuanceId, ledger_index: "validated" })).result?.node;
  const objs = await rpc({ command: "account_objects", account, ledger_index: "validated", type: "mptoken" });
  const mpt = (objs.result?.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === issuanceId);
  if (!mpt) { ws.close(); console.error(`${account} holds no MPToken for ${issuanceId}`); process.exit(1); }
  const ciphertext = mpt[field];
  if (!ciphertext) { ws.close(); console.error(`${account} has no ${field} — confidential state may never have been initialised`); process.exit(1); }

  const max = BigInt(flagValue("--max") ?? iss?.ConfidentialOutstandingAmount ?? "1000000");
  ws.close();

  const started = performance.now();
  let amount: bigint;
  try {
    amount = await decryptAmount(ciphertext, key, max);
  } catch {
    console.error(`could not decrypt ${field} for ${account} within [0, ${max}].`);
    console.error(`Either the key does not match the party this field is encrypted to, or the`);
    console.error(`balance exceeds --max. Cost is linear in --max from zero (see F-15), so raise it`);
    console.error(`deliberately rather than by default.`);
    process.exit(1);
  }
  const ms = performance.now() - started;

  console.log(`${field} for ${account}`);
  console.log(`  issuance     ${issuanceId}`);
  console.log(`  decrypts to  ${amount}`);
  console.log(`  searched     [0, ${max}] in ${ms.toFixed(0)} ms`);
  console.log(`\n  The holder did not consent to this read and cannot prevent it. sfIssuerEncryptedBalance`);
  console.log(`  is mandatory on every confidential balance and the issuer key is required to use the`);
  console.log(`  feature at all. CLAIMS.md P-9: never claim a holder is private from the issuer.`);
}
