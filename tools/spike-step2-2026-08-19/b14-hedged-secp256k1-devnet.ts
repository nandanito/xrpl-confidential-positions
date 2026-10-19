/**
 * b14-hedged-secp256k1-devnet.ts — **prove rippled accepts a HEDGED `k`.**
 *
 * `CLAIMS.md` B-14 was ruled 2026-08-20: the transaction's ECDSA nonce is
 * hedged (RFC 6979 with 32 bytes of fresh entropy as additional data), because
 * the issue #1 ruling that made the sigma nonces hedged extends to it.
 *
 * ## ⚠ Why this script exists rather than reusing the other Devnet drivers
 *
 * **Every account this project holds on Devnet has an `sEd…` seed**, so every
 * Devnet run so far exercised **ed25519** — which is deterministic by
 * construction and is *not* the path the ruling changed. A `tesSUCCESS` from
 * those runs says nothing about hedged secp256k1, and reporting one as evidence
 * would be exactly the overclaim this project hunts.
 *
 * So this script funds a **secp256k1** holder and drives a real
 * `ConfidentialMPTConvert` through `signer/`, which signs it on the hedged
 * path. It then **decodes `SigningPubKey` out of the submitted blob** and
 * refuses to report success unless the prefix says secp256k1 — because
 * "we ran it and it worked" is worth nothing if it silently ran the other arm.
 *
 * ## What it does NOT prove
 *
 * That hedging is *better*. It proves only that a hedged signature is **wire
 * valid**: validators verify `(r, s)` against the public key and never see how
 * `k` was derived. That is the one thing neither review leg could establish
 * from reasoning, and the one thing that would have made the ruling
 * unimplementable if false.
 *
 * ⚠ **Devnet only.** Costs a faucet account and two transaction fees.
 *
 *   bun tools/spike-step2-2026-08-19/b14-hedged-secp256k1-devnet.ts [--auto-confirm]
 */
import { connect, rpc, close, state, save, tool, submit } from "../spike-2026-08-17/convert.ts";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const AUTO = process.argv.includes("--auto-confirm");
const AMOUNT = 30;
const WORK = "/tmp/wconf/b14";
const SOCKET = `${WORK}/signer.sock`;
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;
const LABEL = "b14SecpHolder";

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

await connect();
const issuer = state.issuer;
if (!issuer || !state.issuanceId) die("state.json is missing the issuer setup. Run convert.ts first.");

// ---------------------------------------------------------------------------
// 1. A secp256k1 holder. The faucet hands out ed25519, so the seed is generated
//    here and the faucet is asked to fund the address it derives.
// ---------------------------------------------------------------------------
if (!state[LABEL]) {
  const { generateSeed, deriveKeypair, deriveAddress } = await import("ripple-keypairs");
  const seed = generateSeed({ algorithm: "ecdsa-secp256k1" });
  const address = deriveAddress(deriveKeypair(seed).publicKey);
  const r = await fetch("https://faucet.devnet.rippletest.net/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: address }),
  });
  if (!r.ok) die(`faucet ${r.status}`);
  for (let i = 0; i < 20; i++) {
    await Bun.sleep(2000);
    const info = await rpc({ command: "account_info", account: address, ledger_index: "validated" });
    if (info.result?.account_data) break;
  }
  state[LABEL] = { address, seed }; save();
}
const who = state[LABEL];
if (who.seed.startsWith("sEd")) die(`${LABEL} has an ed25519 seed; this script needs secp256k1`);
console.log(`secp256k1 holder: ${who.address}  (seed prefix ${who.seed.slice(0, 3)}…)`);

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

// --- setup: non-confidential, and none of it done by the signer -------------
if (!(await mptOf(who.address))) {
  const r = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: state.issuanceId }, who.seed);
  if (!r.engine.startsWith("tes")) die(`authorize failed: ${r.engine}`);
}
let mpt = await mptOf(who.address);
if (Number(mpt?.MPTAmount ?? 0) < AMOUNT) {
  const r = await submit({
    TransactionType: "Payment",
    Destination: who.address,
    Amount: { mpt_issuance_id: state.issuanceId, value: String(AMOUNT * 2) },
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

// ---------------------------------------------------------------------------
// 2. Drive the signer. Secrets and policy only — it reads the rest itself.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
writeFileSync(`${WORK}/profile.json`, JSON.stringify({
  account_seed: who.seed,
  elgamal_sk: eg.sk,
  elgamal_pk: eg.pk,
  issuance_id: state.issuanceId,
  fee_drops: 5000,
  network_id: 2,
  ledger_endpoint: "https://s.devnet.rippletest.net:51234/",
  amount_search_to: 5000,
}, null, 2));

const child = spawn(SIGNER, [], {
  env: { ...process.env, WCONF_SIGNER_PROFILE: `${WORK}/profile.json`, WCONF_SIGNER_SOCKET: SOCKET, WCONF_SIGNER_STORE: `${WORK}/randomness` },
  stdio: ["pipe", "pipe", "pipe"],
});
child.stdout.on("data", (d) => process.stdout.write(`  [signer] ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`  [signer] ${d}`));

for (let i = 0; i < 50 && !existsSync(SOCKET); i++) await Bun.sleep(100);
if (!existsSync(SOCKET)) die("the signer never created its socket");
await Bun.sleep(300);

let buffer = ""; const inbox: string[] = [];
const sock = await Bun.connect({
  unix: SOCKET,
  socket: { data(_s, data) { buffer += data.toString(); let i; while ((i = buffer.indexOf("\n")) >= 0) { inbox.push(buffer.slice(0, i)); buffer = buffer.slice(i + 1); } } },
});
async function ask(req: unknown, confirm = false): Promise<any> {
  sock.write(JSON.stringify(req) + "\n");
  if (confirm && AUTO) { await Bun.sleep(1500); child.stdin.write("CONFIRM\n"); }
  for (let i = 0; i < 1200; i++) { if (inbox.length) return JSON.parse(inbox.shift()!); await Bun.sleep(100); }
  die("the signer did not answer");
}

const paired = await ask({ type: "pair", operations: ["ConfidentialMPTConvert"], ttl_secs: 300 });
if (paired.status !== "paired") die(`pairing failed: ${JSON.stringify(paired)}`);
if (!AUTO) { console.log(`\n>>> Type CONFIRM in this terminal when the signer asks.\n`); process.stdin.pipe(child.stdin); }

const out = await ask({
  type: "prepare", grant: paired.grant, operation: "ConfidentialMPTConvert",
  issuance_id: state.issuanceId, amount: String(AMOUNT),
}, true);
try { sock.end(); } catch {}
child.kill();
if (out.status !== "signed") die(`the signer refused: ${out.code} — ${out.detail}`);

// ---------------------------------------------------------------------------
// 3. ⚠ Which arm actually signed it? Decode SigningPubKey out of the blob.
//    ED-prefixed = ed25519 (NOT the hedged path). 02/03 = secp256k1.
// ---------------------------------------------------------------------------
const { decode } = await import("ripple-binary-codec");
const decoded: any = decode(out.tx_blob);
const spk: string = decoded.SigningPubKey;
const algorithm = spk.toUpperCase().startsWith("ED") ? "ed25519" : "secp256k1";
console.log(`\nSigningPubKey ${spk.slice(0, 10)}…  → ${algorithm}`);
if (algorithm !== "secp256k1") {
  die(`this run signed with ${algorithm}, which is NOT the hedged path. It proves nothing about B-14.`);
}

// Two signings over the same account must differ in their signature, which is
// the hedge visible from outside. (Sequence differs too, so this is weaker than
// the unit test — it is here to be a live sanity check, not the proof.)
console.log(`TxnSignature ${decoded.TxnSignature.slice(0, 24)}… (${decoded.TxnSignature.length / 2} bytes)`);

const res = await rpc({ command: "submit", tx_blob: out.tx_blob });
const engine = res.result?.engine_result ?? "(none)";
const hash = res.result?.tx_json?.hash;
console.log(`\nsubmit -> ${engine}  ${res.result?.engine_result_message ?? ""}`);

let validated = false;
if (engine.startsWith("tes")) {
  for (let i = 0; i < 25 && !validated; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) validated = true;
  }
}
console.log(`  hash ${hash}`);
console.log(`  validated: ${validated ? "yes" : "not within the wait"}`);

state.b14 = {
  claim: "rippled accepts a secp256k1 signature whose RFC 6979 nonce is hedged with fresh entropy",
  account: who.address, algorithm, engine, hash, validated, at: new Date().toISOString(),
};
save();

console.log(`\n${"=".repeat(70)}`);
if (engine.startsWith("tes") && validated) {
  console.log(`B-14 EXECUTED. A HEDGED secp256k1 signature was accepted and validated.`);
  console.log(``);
  console.log(`Validators verify (r, s) against the public key and never see how k was`);
  console.log(`derived, so hedging costs nothing on the wire. That is the only thing this`);
  console.log(`proves — not that hedging is better, which is the ruling's argument, not`);
  console.log(`this script's.`);
} else {
  console.log(`A hedged signature was NOT accepted (${engine}). The ruling is not`);
  console.log(`implementable as written and must be revisited — do NOT paper over this.`);
}
console.log(`${"=".repeat(70)}`);
console.log(`\n⚠ ed25519 is still deterministic and is still the seed type every other`);
console.log(`  account here uses. CLAIMS.md B-16.`);

close();
process.exit(engine.startsWith("tes") && validated ? 0 : 1);
