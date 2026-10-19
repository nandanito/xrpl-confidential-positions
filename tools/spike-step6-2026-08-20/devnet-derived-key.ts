/**
 * devnet-derived-key.ts — architecture §6 step 6, executed.
 *
 * Everything before this ran on a **throwaway** ElGamal key from
 * `mpt_generate_keypair`. This script registers a key produced by the **ruled
 * derivation** — REVIEW-012c, `signer/src/keygen.rs` — on a live Devnet
 * account, and then recovers it from nothing but the seed.
 *
 * What it establishes that a unit test cannot:
 *
 * 1. **rippled accepts a derived key.** The registering `ConfidentialMPTConvert`
 *    carries `HolderEncryptionKey` and its proof of knowledge, and the ledger
 *    validates it. A key that was well-formed only to our own library would
 *    fail here.
 * 2. **The key on the ledger is the one an INDEPENDENT implementation derives.**
 *    The signer's key comes from Rust written against the ruling's prose; the
 *    check below is TypeScript written against the same prose, and it compares
 *    against what the ledger actually holds. Agreement between our own two
 *    halves would be worth less; agreement mediated by a validated ledger entry
 *    is the strongest form available here.
 * 3. **ADR-0001 §(e)'s only benefit, executed.** `onboard` is run in recovery
 *    mode with nothing but the seed, and it reproduces the registered key.
 *
 * ⚠ **The profile carries NO ElGamal secret.** That is the point: with the
 * derived source there is exactly one secret for this holder, not two.
 *
 * ⚠ **Throwaway spike code. Devnet only. Never mainnet, at any phase.**
 *
 *   bun tools/spike-step6-2026-08-20/devnet-derived-key.ts [--auto-confirm]
 */
import { connect, rpc, close, state, save, tool, submit, faucet } from "../spike-2026-08-17/convert.ts";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { secp256k1 } from "@noble/curves/secp256k1";
import { decodeSeed, decodeAccountID } from "ripple-address-codec";
import { deriveKeypair, deriveAddress } from "ripple-keypairs";

const AUTO = process.argv.includes("--auto-confirm");
const CONVERT_AMOUNT = 300;
const SEND_AMOUNT = 7;
const WORK = "/tmp/wconf/step6";
const SOCKET = `${WORK}/signer.sock`;
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;
const ONBOARD = new URL("../../signer/target/debug/onboard", import.meta.url).pathname;
const ENDPOINT = "https://s.devnet.rippletest.net:51234/";
const LABEL = "step6Holder";

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

// ---------------------------------------------------------------------------
// An INDEPENDENT implementation of the ruled derivation.
//
// Written from REVIEW-012-RULING-keygen-2026-08-18.md section 2, in TypeScript,
// so that the value compared against the ledger below did not come out of the
// same code that put it there. It reproduces the ruling's published vectors —
// `tools/spike-keygen-2026-08-18/t-keygen-construction.ts` is where that is
// asserted.
// ---------------------------------------------------------------------------
const enc = (s: string) => new TextEncoder().encode(s);
const u32be = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, false); return b; };
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();

function deriveElGamal(familySeed: string) {
  const d = decodeSeed(familySeed);
  const seed = Uint8Array.from(d.bytes);
  const type = String(d.type);
  if (seed.length !== 16) throw new Error(`seed entropy is ${seed.length} bytes`);
  if (type !== "secp256k1" && type !== "ed25519") throw new Error(`unknown seed type ${type}`);
  const acct = Uint8Array.from(decodeAccountID(deriveAddress(deriveKeypair(familySeed).publicKey)));

  const IKM = cat(enc("WCONF-ELGAMAL-KEYGEN-v1"), u32be(type.length), enc(type), u32be(16), seed, u32be(20), acct);
  const PRK = hmac(sha512, enc("WCONF-ELGAMAL-KEYGEN-v1/HKDF-Extract-salt"), IKM);
  const INFO = cat(enc("WCONF-ELGAMAL-KEYGEN-v1/HKDF-Expand"), u32be(16), enc("secp256k1-scalar"));
  const OKM = hmac(sha512, PRK, cat(INFO, new Uint8Array([0x01])));
  // TOTAL: (X mod (n − 1)) + 1. No abort path — see the ruling's section 2.3.
  const sk = (BigInt("0x" + hex(OKM)) % (secp256k1.CURVE.n - 1n)) + 1n;
  return { sk: sk.toString(16).padStart(64, "0").toUpperCase(), pk: hex(secp256k1.getPublicKey(sk, true)) };
}

// ---------------------------------------------------------------------------

await connect();
const issuer = state.issuer, holderB = state.holderB;
if (!issuer || !holderB || !state.issuanceId) die("state.json is missing the 2026-08-17 setup");

const who = await faucet(LABEL);
console.log(`step 6 holder: ${who.address}`);

const expected = deriveElGamal(who.seed);
console.log(`derived pk_A (independent TypeScript implementation): ${expected.pk}`);

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

// --- setup: public, and done here rather than by the signer -----------------
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

const bHolder = await mptOf(holderB.address);
if (!bHolder?.HolderEncryptionKey) die("holderB has no registered encryption key");

// ---------------------------------------------------------------------------
// The signer, with a profile that holds NO ElGamal secret.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

let child: any = null, sock: any = null, buffer = "";
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

async function driveOne(op: string, amount: number, extra: Record<string, unknown> = {}) {
  // ⚠ **No `elgamal_sk` and no `elgamal_pk`.** The signer derives the key from
  // `account_seed` under REVIEW-012c. This is the whole milestone: one secret
  // for this holder rather than two, and it is the seed they already keep.
  const profile = {
    account_seed: who.seed,
    elgamal_key_source: "derived-from-master-seed",
    issuance_id: state.issuanceId,
    fee_drops: 5000,
    network_id: 2,
    ledger_endpoint: ENDPOINT,
    amount_search_to: 5000,
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
  const hash = res.result?.tx_json?.hash;
  console.log(`\n${op} -> ${engine} ${res.result?.engine_result_message ?? ""}`);
  if (!engine.startsWith("tes")) die(`${op} was not applied`);
  for (let i = 0; i < 25; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) return { engine, hash };
  }
  return { engine, hash };
}

// 1. The registering Convert — the first transaction in this project whose
//    HolderEncryptionKey came from the ruled derivation.
const convert = await driveOne("ConfidentialMPTConvert", CONVERT_AMOUNT);

// 2. THE CHECK THAT MATTERS. What the ledger holds, against what an
//    independent implementation derives from the seed.
const registered = (await mptOf(who.address))?.HolderEncryptionKey;
if (!registered) die("the Convert did not register a HolderEncryptionKey");
if (registered.toUpperCase() !== expected.pk) {
  die(`the ledger holds ${registered}, the independent derivation says ${expected.pk}`);
}
console.log(`\n✓ THE LEDGER HOLDS THE DERIVED KEY.`);
console.log(`  MPToken.HolderEncryptionKey  ${registered}`);
console.log(`  independent TypeScript       ${expected.pk}`);
console.log(`  Rust signer/src/keygen.rs and this file agree, through a validated ledger entry.`);

// 3. MergeInbox, then a Send — proving the derived key is usable for more than
//    registration. A key that registered and could not spend would be worse
//    than one that did neither.
const merged = await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, who.seed);
if (!merged.engine.startsWith("tes")) die(`merge failed: ${merged.engine}`);
console.log(`ConfidentialMPTMergeInbox -> ${merged.engine}`);

const send1 = await driveOne("ConfidentialMPTSend", SEND_AMOUNT, { destination: holderB.address });
const send2 = await driveOne("ConfidentialMPTSend", SEND_AMOUNT, { destination: holderB.address });

// 4. And the balance decrypts under the derived secret, read by a third party
//    (this script) rather than by the signer.
const after = await mptOf(who.address);
const balance = Number((await tool("decrypt", after.ConfidentialBalanceSpending, expected.sk, "0", "5000"))[0]);
console.log(`\nconfidential spending balance, decrypted with the DERIVED secret: ${balance}`);
if (balance !== CONVERT_AMOUNT - 2 * SEND_AMOUNT) {
  die(`expected ${CONVERT_AMOUNT - 2 * SEND_AMOUNT}, got ${balance}`);
}

// 5. ADR-0001 §(e)'s only benefit, executed: seed in, registered key out.
console.log(`\n--- recovery: onboard, given nothing but the seed ---`);
const rec = spawnSync(ONBOARD, [who.address, state.issuanceId, ENDPOINT], {
  input: `${who.seed}\n`,
  encoding: "utf8",
});
process.stdout.write(rec.stdout ?? "");
process.stderr.write(rec.stderr ?? "");
if (rec.status !== 0) die(`onboard recovery exited ${rec.status}`);
if (!(rec.stdout ?? "").includes("RECOVERED")) die("onboard did not report recovery");
console.log(`\n✓ RECOVERED. The seed alone reproduced the key the ledger holds.`);

state.step6DerivedKey = {
  objective: "the registered HolderEncryptionKey came from the ruled derivation, not from a generator",
  account: who.address,
  issuanceId: state.issuanceId,
  registeredKey: registered,
  convert: convert.hash,
  merge: merged.hash,
  sends: [send1.hash, send2.hash],
  at: new Date().toISOString(),
};
save();

console.log(`\n✓ ${who.address} holds a confidential position under a DERIVED key.`);
console.log(`\nNow fire architecture §6 step 4's falsifier against it:\n`);
console.log(`  bun run tools/observer-harness.ts ${who.address} ${state.issuanceId} --assert-no-r-reuse\n`);
close();
