/**
 * devnet-clean-account.ts — fire architecture §6 step 4's own falsifier.
 *
 * `observer-harness.ts --assert-no-r-reuse` is the falsifier step 4 names, and
 * `CLAIMS.md` E-76 records that it **had never been run against a transaction
 * this project's own code produced**. It could not be: nothing signed.
 *
 * It cannot be run against the 2026-08-17 holder either, because that account's
 * history contains the **deliberately broken** transactions of E-63 — two Sends
 * that reuse `r` on purpose, to demonstrate the attack. The assertion fires on
 * them, correctly, and would fire whatever this signer did.
 *
 * So this script builds a **clean** confidential holder whose every confidential
 * transaction is produced by `signer/`, and runs the assertion against that.
 * A pass there means something; a pass on a contaminated account would not, and
 * a *fail* on a contaminated account says nothing about our signer.
 *
 * ⚠ **Throwaway spike code. Devnet only.**
 *
 *   bun tools/spike-step3-2026-08-18/devnet-clean-account.ts [--auto-confirm]
 */
import { connect, rpc, close, state, save, tool, submit, sequenceOf, faucet } from "../spike-2026-08-17/convert.ts";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const AUTO = process.argv.includes("--auto-confirm");
const CONVERT_AMOUNT = 400;
const SEND_AMOUNT = 11;
const WORK = "/tmp/wconf/step3-clean";
const SOCKET = `${WORK}/signer.sock`;
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;
const LABEL = "step3Holder";

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

await connect();
const issuer = state.issuer, holderB = state.holderB;
if (!issuer || !holderB || !state.issuanceId) die("state.json is missing the 2026-08-17 setup");

const who = await faucet(LABEL);
console.log(`clean holder: ${who.address}`);

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

// --- setup, all NON-confidential and all done here, not by the signer -------
if (!(await mptOf(who.address))) {
  const r = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: state.issuanceId }, who.seed);
  if (!r.engine.startsWith("tes")) die(`authorize failed: ${r.engine}`);
}
let mpt = await mptOf(who.address);
if (Number(mpt.MPTAmount ?? 0) < CONVERT_AMOUNT) {
  const r = await submit({
    TransactionType: "Payment",
    Destination: who.address,
    Amount: { mpt_issuance_id: state.issuanceId, value: String(CONVERT_AMOUNT * 2) },
  }, issuer.seed);
  if (!r.engine.startsWith("tes")) die(`issuer payment failed: ${r.engine}`);
  mpt = await mptOf(who.address);
}
console.log(`public MPT balance: ${mpt.MPTAmount}`);

if (!state[`${LABEL}ElGamal`]) {
  const [sk, pk] = await tool("keygen");
  state[`${LABEL}ElGamal`] = { sk, pk }; save();
}
const eg = state[`${LABEL}ElGamal`];

const iss = (await rpc({ command: "ledger_entry", mpt_issuance: state.issuanceId, ledger_index: "validated" })).result?.node;
const bHolder = await mptOf(holderB.address);
if (!bHolder?.HolderEncryptionKey) die("holderB has no registered encryption key");

// ---------------------------------------------------------------------------
// The signer, driven twice: a Convert that registers the key, then a Send.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

let child: any = null;
let sock: any = null;
let buffer = "";
const inbox: string[] = [];

async function startSigner(profile: Record<string, unknown>) {
  writeFileSync(`${WORK}/profile.json`, JSON.stringify(profile, null, 2));
  child = spawn(SIGNER, [], {
    env: { ...process.env, WCONF_SIGNER_PROFILE: `${WORK}/profile.json`, WCONF_SIGNER_SOCKET: SOCKET, WCONF_SIGNER_STORE: `${WORK}/randomness` },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdout.on("data", (d: any) => process.stdout.write(`  [signer] ${d}`));
  child.stderr.on("data", (d: any) => process.stderr.write(`  [signer] ${d}`));
  for (let i = 0; i < 50 && !existsSync(SOCKET); i++) await Bun.sleep(100);
  if (!existsSync(SOCKET)) die("the signer never created its socket");
  await Bun.sleep(300);
  buffer = ""; inbox.length = 0;
  sock = await Bun.connect({
    unix: SOCKET,
    socket: { data(_s: any, data: any) {
      buffer += data.toString();
      let i; while ((i = buffer.indexOf("\n")) >= 0) { inbox.push(buffer.slice(0, i)); buffer = buffer.slice(i + 1); }
    } },
  });
}

async function ask(req: unknown, confirm = false): Promise<any> {
  sock.write(JSON.stringify(req) + "\n");
  if (confirm && AUTO) { await Bun.sleep(1500); child.stdin.write("CONFIRM\n"); }
  for (let i = 0; i < 1200; i++) { if (inbox.length) return JSON.parse(inbox.shift()!); await Bun.sleep(100); }
  die("the signer did not answer");
}

function stopSigner() { try { sock?.end(); } catch {} child?.kill(); rmSync(SOCKET, { force: true }); }

async function ledgerNow() {
  return (await rpc({ command: "ledger_current" })).result.ledger_current_index + 20;
}

async function driveOne(op: string, amount: number, extra: Record<string, unknown>, profileOverrides: Record<string, unknown>) {
  // ⚠ **Secrets and policy only, as of 2026-08-19.** Architecture §6 step 2:
  // the balance ciphertext, the balance version, the registration state, the
  // issuer and auditor keys, the sequence, the last-ledger bound and the
  // destination's HolderEncryptionKey are all read **by the signer**, from a
  // node, at one pinned validated index. This function used to compute every
  // one of them — including a canonical-EncZero fallback for a holder with no
  // spending balance yet, which the signer now simply reads as absent.
  const profile = {
    account_seed: who.seed,
    elgamal_sk: eg.sk,
    elgamal_pk: eg.pk,
    issuance_id: state.issuanceId,
    fee_drops: 5000,
    network_id: 2,
    ledger_endpoint: "https://s.devnet.rippletest.net:51234/",
    amount_search_to: 5000,
    ...profileOverrides,
  };
  await startSigner(profile);
  const paired = await ask({ type: "pair", operations: [op], ttl_secs: 300 });
  if (paired.status !== "paired") die(`pairing failed: ${JSON.stringify(paired)}`);
  if (!AUTO) { console.log(`\n>>> Type CONFIRM in this terminal when the signer asks.\n`); process.stdin.pipe(child.stdin); }
  const out = await ask({ type: "prepare", grant: paired.grant, operation: op, issuance_id: state.issuanceId, amount: String(amount), ...extra }, true);
  stopSigner();
  if (out.status !== "signed") die(`the signer refused ${op}: ${out.code} — ${out.detail}`);
  const res = await rpc({ command: "submit", tx_blob: out.tx_blob });
  const engine = res.result?.engine_result ?? "(none)";
  console.log(`\n${op} -> ${engine} ${res.result?.engine_result_message ?? ""}`);
  const hash = res.result?.tx_json?.hash;
  if (!engine.startsWith("tes")) die(`${op} was not applied`);
  for (let i = 0; i < 25; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) return { engine, hash };
  }
  return { engine, hash };
}

// 1. Convert — registers HolderEncryptionKey and moves public MPT into the
//    confidential inbox. The signer's first transaction for this account.
const convert = await driveOne("ConfidentialMPTConvert", CONVERT_AMOUNT, {}, {});

// 2. MergeInbox — not a signer operation; it carries no proof and no randomness.
const merged = await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, who.seed);
if (!merged.engine.startsWith("tes")) die(`merge failed: ${merged.engine}`);
console.log(`ConfidentialMPTMergeInbox -> ${merged.engine}`);

// 3 & 4. Two Sends, so the assertion has two of our own transactions to
//        compare. One would make "no reuse" vacuous.
//
// ⚠ Each of these used to pass `balance`, `balance_ciphertext` and
// `balance_version` as profile overrides, re-read here after every step —
// **and the second Send's values had to be re-read again**, because the first
// Send moved them. That whole dance is what architecture §6 step 2 deleted:
// the signer reads its own balance and its own version, twice per signing, and
// the second Send needs no more help than the first. The read below is only so
// this script can print a number and fail early.
const after = await mptOf(who.address);
const balance = Number((await tool("decrypt", after.ConfidentialBalanceSpending, eg.sk, "0", "5000"))[0]);
console.log(`confidential spending balance after merge: ${balance}  (the signer reads its own)`);

const send1 = await driveOne("ConfidentialMPTSend", SEND_AMOUNT, { destination: holderB.address }, {});
const send2 = await driveOne("ConfidentialMPTSend", SEND_AMOUNT, { destination: holderB.address }, {});

state.step3CleanAccount = {
  objective: "every confidential transaction on this account was built, proved and signed by signer/",
  account: who.address,
  issuanceId: state.issuanceId,
  convert: convert.hash,
  merge: merged.hash,
  sends: [send1.hash, send2.hash],
  at: new Date().toISOString(),
};
save();

console.log(`\n✓ ${who.address} now holds three confidential transactions, all from signer/`);
console.log(`\nNow fire architecture §6 step 4's own falsifier — E-76's open item:\n`);
console.log(`  bun run tools/observer-harness.ts ${who.address} ${state.issuanceId} --assert-no-r-reuse\n`);
close();
