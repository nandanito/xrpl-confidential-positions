/**
 * devnet-signer-send.ts — **the objective of architecture §6 step 3.**
 *
 * Everything cryptographic is done by the Rust signer: the ruled `r`/`ρ`
 * derivation, the randomness ledger, the vendored prover, canonical XRPL
 * serialisation and the transaction signature. This file hands the signer its
 * **secrets**, asks it over a Unix socket, and submits the blob it gets back.
 * **It signs nothing and it holds no proof.**
 *
 * ## ⚠ ~~This file reads public ledger state~~ — it does not, as of 2026-08-19
 *
 * Architecture §6 **step 2** is built. The signer reads its own sequence
 * number, confidential balance, `ConfidentialBalanceVersion`, registration
 * state, the issuer and auditor keys and the destination's
 * `HolderEncryptionKey` from a node, at one pinned validated index, and
 * **re-reads before signing**. None of it is in the profile any more, and a
 * profile that still carries any of it fails to load by name.
 *
 * What this file still reads is what it needs for **its own** decisions: does
 * the inbox need merging before there is anything to send, and did the
 * submitted transaction validate. Those are the harness's questions, not the
 * signer's.
 *
 * ⚠ **Throwaway spike code. Devnet only** — it refuses any `network_id` but 2.
 *
 * ## What this does NOT establish
 *
 * A `tesSUCCESS` says the ledger accepted the transaction. It says nothing
 * about confidentiality: amounts are hidden, identities, counterparties,
 * timing and frequency are not, and the issuer can decrypt every amount
 * (`CLAIMS.md` P-4, P-9, P-11). `observer-harness.ts` is what shows that, and
 * this script prints the command rather than implying it ran.
 *
 * ## Two honest limitations, stated because they are easy to miss
 *
 * 1. **This script knows the holder's seed.** It writes it into the profile the
 *    signer reads. A real deployment would have the key reach the signer some
 *    other way; a throwaway-key spike cannot demonstrate that and does not
 *    pretend to.
 * 2. **`--auto-confirm` types CONFIRM into the signer's stdin.** That is the
 *    operator's own script driving the operator's own terminal, and it is
 *    still not a human reading the confirmation. Run without the flag to
 *    confirm by hand, which is what the boundary is actually for.
 *
 *   bun tools/spike-step3-2026-08-18/devnet-signer-send.ts [--auto-confirm] [--amount N]
 */
import { connect, rpc, close, state, save, tool, submit, sequenceOf, accountIdHex } from "../spike-2026-08-17/convert.ts";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const AUTO = process.argv.includes("--auto-confirm");
const AMOUNT = Number(process.argv.find((a) => a.startsWith("--amount="))?.split("=")[1] ?? 25);
const WORK = "/tmp/wconf/step3";
const SOCKET = "/tmp/wconf/step3/signer.sock";  // its own directory: the signer sets it 0700
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

await connect();

const holder = state.holder, holderB = state.holderB;
if (!holder || !holderB || !state.issuanceId) die("state.json has no holder/holderB/issuance. Run the 2026-08-17 spike first.");

// ---------------------------------------------------------------------------
// 1. ~~Public ledger state. The signer does not read the ledger — architecture
//    §6 step 2 is not built — so this is where that gap is filled, visibly.~~
//
//    **Step 2 is built.** What is left here is the harness's own setup: a
//    freshly-merged balance is the canonical EncZero and there is nothing to
//    send, so the inbox is merged first. The signer does not implement
//    MergeInbox and this is not it filling a gap on the signer's behalf.
// ---------------------------------------------------------------------------
async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

let a = await mptOf(holder.address);
if (!a) die(`${holder.address} holds no MPToken for ${state.issuanceId}`);

// A freshly-merged or reset balance is the canonical EncZero, which CLAIMS.md
// F-1 records as PUBLICLY known to be zero. Merge the inbox if that is where we
// are, so there is something to send.
const [encZero] = await tool("enczero", state.holderElGamal.pk, accountIdHex(holder.address), state.issuanceId);
if (!a.ConfidentialBalanceSpending || a.ConfidentialBalanceSpending === encZero) {
  console.log("spending balance is the canonical EncZero — merging the inbox first");
  const r = await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, holder.seed);
  if (!r.engine.startsWith("tes")) die(`merge failed: ${r.engine}`);
  a = await mptOf(holder.address);
}

// Read for THIS SCRIPT's own preconditions only — so it can fail early with a
// sentence instead of watching the signer refuse. The signer re-reads every one
// of these itself and builds against its own read, not against these values.
const balance = Number((await tool("decrypt", a.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "5000"))[0]);
const b = await mptOf(holderB.address);
if (!b?.HolderEncryptionKey) die(`${holderB.address} has no registered HolderEncryptionKey`);
if (balance < AMOUNT) die(`balance ${balance} is below the amount ${AMOUNT}`);

console.log(`\nthis script's preconditions (the signer reads its own copy of all of it):`);
console.log(`  holder        ${holder.address}`);
console.log(`  balance       ${balance}`);
console.log(`  destination   ${holderB.address}`);

// ---------------------------------------------------------------------------
// 2. The holder profile — **secrets and policy, nothing else.**
//    ⚠ It carries the seed; see the header.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
// ⚠ **Secrets and policy only.** Every ledger value that used to be here is
// read by the signer. Putting one back would not be ignored — the profile
// refuses it by name, because a signer that silently preferred a stale local
// value to the ledger is the gap step 2 closed, reopened by a config file.
const profile = {
  account_seed: holder.seed,
  elgamal_sk: state.holderElGamal.sk,
  elgamal_pk: state.holderElGamal.pk,
  issuance_id: state.issuanceId,
  fee_drops: 5000,
  network_id: 2,
  ledger_endpoint: "https://s.devnet.rippletest.net:51234/",
  amount_search_to: 5000,
};
writeFileSync(`${WORK}/profile.json`, JSON.stringify(profile, null, 2));

// ---------------------------------------------------------------------------
// 3. Start the signer and talk to it over the Unix socket.
// ---------------------------------------------------------------------------
const child = spawn(SIGNER, [], {
  env: {
    ...process.env,
    WCONF_SIGNER_PROFILE: `${WORK}/profile.json`,
    WCONF_SIGNER_SOCKET: SOCKET,
    WCONF_SIGNER_STORE: `${WORK}/randomness`,
  },
  stdio: ["pipe", "pipe", "pipe"],
});
child.stdout.on("data", (d) => process.stdout.write(`  [signer] ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`  [signer] ${d}`));
child.on("exit", (code) => { if (code !== null && code !== 0) console.error(`  [signer] exited ${code}`); });

// `Bun.file().exists()` is false for a socket — it is not a regular file.
for (let i = 0; i < 50 && !existsSync(SOCKET); i++) await Bun.sleep(100);
if (!existsSync(SOCKET)) die("the signer never created its socket");
await Bun.sleep(300);

let buffer = "";
const inbox: string[] = [];
const sock = await Bun.connect({
  unix: SOCKET,
  socket: {
    data(_s, data) {
      buffer += data.toString();
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) { inbox.push(buffer.slice(0, i)); buffer = buffer.slice(i + 1); }
    },
  },
});

async function ask(req: unknown, opts: { confirm?: boolean } = {}): Promise<any> {
  sock.write(JSON.stringify(req) + "\n");
  if (opts.confirm && AUTO) {
    await Bun.sleep(1500);          // let the confirmation render first
    child.stdin.write("CONFIRM\n");
  }
  for (let i = 0; i < 1200; i++) {
    if (inbox.length) return JSON.parse(inbox.shift()!);
    await Bun.sleep(100);
  }
  die("the signer did not answer");
}

const status = await ask({ type: "status" });
console.log(`\nsigner status: ${status.note}`);

const paired = await ask({ type: "pair", operations: ["ConfidentialMPTSend"], ttl_secs: 300 });
if (paired.status !== "paired") die(`pairing failed: ${JSON.stringify(paired)}`);

if (!AUTO) {
  console.log(`\n>>> The signer is about to ask YOU to confirm, in this terminal.`);
  console.log(`>>> Type CONFIRM and press return when it does.\n`);
  process.stdin.pipe(child.stdin);
}

const prepared = await ask({
  type: "prepare",
  grant: paired.grant,
  operation: "ConfidentialMPTSend",
  issuance_id: state.issuanceId,
  destination: holderB.address,
  amount: String(AMOUNT),
  // Deliberately a lie: the signer carries it, ignores it, and confirms from
  // the transaction it built. REVIEW-003b's finding, exercised on Devnet.
  claimed: { label: "Send 1 unit to somebody else entirely", amount: "1" },
}, { confirm: true });

if (prepared.status !== "signed") die(`the signer refused: ${prepared.code} — ${prepared.detail}`);
console.log(`\nsigner returned a signed blob: ${prepared.tx_blob.length / 2} bytes`);
console.log(`  hash it computed: ${prepared.hash}`);

sock.end();
child.kill();

// ---------------------------------------------------------------------------
// 4. Submit. The signer signed; **it did not submit.** ~~and does not talk to a
//    network at all~~ — false since step 2: it reads the ledger over JSON-RPC.
//    It still has no path that writes to one.
// ---------------------------------------------------------------------------
const res = await rpc({ command: "submit", tx_blob: prepared.tx_blob });
const engine = res.result?.engine_result ?? "(none)";
const hash = res.result?.tx_json?.hash;
console.log(`\nsubmit -> ${engine}  ${res.result?.engine_result_message ?? ""}`);
if (hash) console.log(`  ledger hash: ${hash}`);
if (hash && hash !== prepared.hash) {
  console.log(`  ⚠ the signer computed ${prepared.hash} and the node reports ${hash}`);
}

let validated: any = null;
if (engine.startsWith("tes")) {
  for (let i = 0; i < 25 && !validated; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) validated = r.result;
  }
  console.log(`  validated: ${validated ? "yes" : "not within the wait"}`);
}

state.step3SignerSend = {
  objective: "ConfidentialMPTSend built, proved and signed entirely by signer/ (architecture §6 step 3)",
  amount: AMOUNT,
  balanceBefore: balance,
  destination: holderB.address,
  engine,
  hash,
  signerHash: prepared.hash,
  blobBytes: prepared.tx_blob.length / 2,
  validated: !!validated,
  autoConfirmed: AUTO,
  at: new Date().toISOString(),
};
save();

console.log(`\n${engine.startsWith("tes") ? "✓" : "✗"} ${engine}`);
console.log(`\nThe confidentiality claim is NOT established by the line above. Run:`);
console.log(`  bun run tools/observer-harness.ts ${holder.address} ${state.issuanceId} --assert-no-r-reuse`);
close();
process.exit(engine.startsWith("tes") ? 0 : 1);
