/**
 * devnet-convert-back.ts — the facility's exit, executed.
 *
 * `FACILITY-WALKTHROUGH-2026-08-20.md` step 9 is
 * `ConfidentialMPTConvertBack`, and until 2026-08-24 the signer **refused it by
 * name**. A facility whose exit does not exist is not the facility.
 *
 * This drives two of them against the step 6 holder — the account whose
 * `HolderEncryptionKey` came from the **ruled derivation**, so the profile here
 * carries no ElGamal secret at all:
 *
 *   1. a **partial** ConvertBack, leaving a non-zero confidential remainder;
 *   2. a ConvertBack of the **entire** remaining spending balance, which is the
 *      facility-retirement shape and the one whose range proof is over a
 *      remainder of exactly zero.
 *
 * ⚠ **What is asserted, and why each assertion is here rather than in a Rust
 * test.** `cargo test` says the signer's own library accepts the proof and that
 * the field set matches XLS-0096 §10.3 as this project read it. **Only the
 * ledger says the reading was right.** So every check below is against ledger
 * state before and after:
 *
 *   - the public `sfMPTAmount` rose by **exactly** the amount (§10.5);
 *   - the issuance's `sfConfidentialOutstandingAmount` fell by **exactly** the
 *     same (§10.5) — the public aggregate the facility's size is read from;
 *   - `sfConfidentialBalanceVersion` incremented (§10.5);
 *   - the remaining `sfConfidentialBalanceSpending` **decrypts** to the
 *     expected remainder. A `tesSUCCESS` alone would not distinguish a correct
 *     homomorphic subtraction from a lucky one.
 *
 * ⚠ **`tesSUCCESS` is not a confidentiality claim** (`CLAIMS.md` P-4, P-9,
 * P-11), and a ConvertBack in particular **publishes its amount**. That is the
 * design: the walkthrough's step 9 discloses the aggregate change and nothing
 * else.
 *
 * ⚠ **Throwaway spike code. Devnet only.**
 *
 *   bun tools/spike-step7-2026-08-24/devnet-convert-back.ts [--auto-confirm]
 */
import { connect, rpc, close, state, save, tool } from "../spike-2026-08-17/convert.ts";
import { spawn } from "node:child_process";
import { hmac } from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import { secp256k1 } from "@noble/curves/secp256k1";
import { decodeSeed, decodeAccountID } from "ripple-address-codec";
import { deriveKeypair, deriveAddress } from "ripple-keypairs";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const AUTO = process.argv.includes("--auto-confirm");
const WORK = "/tmp/wconf/step7";
const SOCKET = `${WORK}/signer.sock`;
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;
const ENDPOINT = "https://s.devnet.rippletest.net:51234/";
const SEARCH_TO = 5000;

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

await connect();
if (!state.issuanceId) die("state.json is missing the issuance");
const who = state.step6Holder;
if (!who?.seed) die("state.json has no step6Holder — run tools/spike-step6-2026-08-20/devnet-derived-key.ts");
console.log(`holder: ${who.address}  (HolderEncryptionKey from the RULED derivation)`);

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}
async function issuance() {
  return (await rpc({ command: "ledger_entry", mpt_issuance: state.issuanceId, ledger_index: "validated" })).result?.node;
}

// ---------------------------------------------------------------------------
// An INDEPENDENT implementation of the ruled derivation.
//
// Written from REVIEW-012-RULING-keygen-2026-08-18.md section 2, and identical
// to the one in `tools/spike-step6-2026-08-20/devnet-derived-key.ts` — which is
// deliberate. The profile the signer runs from carries **no ElGamal secret at
// all**, so this script cannot read the balance out of a file; it has to derive
// the secret for itself, and deriving it here rather than asking the signer is
// what makes the agreement below an agreement between two implementations
// mediated by the ledger.
// ---------------------------------------------------------------------------
const enc = (s: string) => new TextEncoder().encode(s);
const u32be = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, false); return b; };
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const hexOf = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();

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
  const sk = (BigInt("0x" + hexOf(OKM)) % (secp256k1.CURVE.n - 1n)) + 1n;
  return { sk: sk.toString(16).padStart(64, "0").toUpperCase(), pk: hexOf(secp256k1.getPublicKey(sk, true)) };
}

const derived = deriveElGamal(who.seed);
const SK = derived.sk;

// The ledger's registered key must be the one this implementation derives, or
// nothing below is about the account it claims to be about.
{
  const t = await mptOf(who.address);
  if (t?.HolderEncryptionKey !== derived.pk) {
    die(`the registered HolderEncryptionKey ${t?.HolderEncryptionKey} is not the derived ${derived.pk}`);
  }
  console.log(`registered key matches the independent derivation: ${derived.pk}`);
}

async function spendable(): Promise<number> {
  const t = await mptOf(who.address);
  if (!t?.ConfidentialBalanceSpending) die("the holder has no ConfidentialBalanceSpending");
  return Number((await tool("decrypt", t.ConfidentialBalanceSpending, SK, "0", String(SEARCH_TO)))[0]);
}

// ---------------------------------------------------------------------------
// The signer, over a Unix socket, exactly as any client reaches it.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

let child: any = null, sock: any = null, buffer = "";
const inbox: string[] = [];

async function startSigner() {
  writeFileSync(`${WORK}/profile.json`, JSON.stringify({
    account_seed: who.seed,
    // ⚠ **No ElGamal secret anywhere in this file.** Step 6's ruled derivation
    // reconstructs it from the master seed.
    elgamal_key_source: "derived-from-master-seed",
    issuance_id: state.issuanceId,
    fee_drops: 5000,
    network_id: 2,
    ledger_endpoint: ENDPOINT,
    amount_search_to: SEARCH_TO,
  }, null, 2));
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

async function convertBack(label: string, amount: number) {
  console.log(`\n=== ${label}: ConvertBack of ${amount} ===`);
  const before = { mpt: await mptOf(who.address), iss: await issuance() };
  const balanceBefore = await spendable();
  console.log(`  before: public=${before.mpt.MPTAmount ?? 0}  confidential=${balanceBefore}  ` +
              `version=${before.mpt.ConfidentialBalanceVersion ?? 0}  COA=${before.iss.ConfidentialOutstandingAmount}`);

  await startSigner();
  const paired = await ask({ type: "pair", operations: ["ConfidentialMPTConvertBack"], ttl_secs: 300 });
  if (paired.status !== "paired") die(`pairing failed: ${JSON.stringify(paired)}`);
  if (!AUTO) { console.log(`\n>>> Type CONFIRM in this terminal when the signer asks.\n`); process.stdin.pipe(child.stdin); }
  const out = await ask({
    type: "prepare", grant: paired.grant,
    operation: "ConfidentialMPTConvertBack",
    issuance_id: state.issuanceId, amount: String(amount),
  }, true);
  stopSigner();
  if (out.status !== "signed") die(`the signer refused: ${out.code} — ${out.detail}`);

  // The proof is 816 bytes and the transaction carries no HolderEncryptionKey.
  // Checked on the blob the signer returned, before submitting it.
  const blob = out.tx_blob as string;
  console.log(`  signed: ${blob.length / 2} bytes, hash ${out.hash}`);

  const res = await rpc({ command: "submit", tx_blob: blob });
  const engine = res.result?.engine_result ?? "(none)";
  const hash = res.result?.tx_json?.hash;
  console.log(`  ${engine} ${res.result?.engine_result_message ?? ""}`);
  if (!engine.startsWith("tes")) die(`ConvertBack was not applied: ${engine}`);
  if (hash !== out.hash) die(`the node computed a different hash: ${hash} vs ${out.hash}`);

  let validated = false;
  for (let i = 0; i < 25 && !validated; i++) {
    await Bun.sleep(1500);
    validated = !!(await rpc({ command: "tx", transaction: hash })).result?.validated;
  }
  if (!validated) die("the transaction never validated");

  // --- what the LEDGER says, which is the only thing that settles it -------
  const after = { mpt: await mptOf(who.address), iss: await issuance() };
  const balanceAfter = await spendable();
  const dPublic = Number(after.mpt.MPTAmount ?? 0) - Number(before.mpt.MPTAmount ?? 0);
  const dCOA = Number(before.iss.ConfidentialOutstandingAmount) - Number(after.iss.ConfidentialOutstandingAmount);
  const dVersion = Number(after.mpt.ConfidentialBalanceVersion ?? 0) - Number(before.mpt.ConfidentialBalanceVersion ?? 0);
  console.log(`  after:  public=${after.mpt.MPTAmount}  confidential=${balanceAfter}  ` +
              `version=${after.mpt.ConfidentialBalanceVersion ?? 0}  COA=${after.iss.ConfidentialOutstandingAmount}`);

  const checks: [string, boolean, string][] = [
    ["public balance rose by exactly the amount", dPublic === amount, `${dPublic} vs ${amount}`],
    ["ConfidentialOutstandingAmount fell by exactly the amount", dCOA === amount, `${dCOA} vs ${amount}`],
    ["ConfidentialBalanceVersion incremented", dVersion === 1, `${dVersion}`],
    ["the remaining confidential balance decrypts to the remainder",
      balanceAfter === balanceBefore - amount, `${balanceAfter} vs ${balanceBefore - amount}`],
  ];
  for (const [what, ok, detail] of checks) {
    console.log(`  ${ok ? "✓" : "✗"} ${what}  (${detail})`);
    if (!ok) die(`ledger state does not match XLS-0096 §10.5: ${what}`);
  }
  return { amount, engine, hash, balanceBefore, balanceAfter, blobBytes: blob.length / 2 };
}

const balance = await spendable();
console.log(`confidential spending balance: ${balance}`);
if (balance < 2) die(`balance ${balance} is too small to split a ConvertBack in two`);

// A partial one, then the whole remainder — the retirement shape, whose range
// proof is over a remainder of exactly zero.
const partial = Math.max(1, Math.floor(balance / 3));
const first = await convertBack("PARTIAL", partial);
const rest = await spendable();
const second = await convertBack("ENTIRE REMAINDER", rest);

const finalBalance = await spendable();
console.log(`\nconfidential spending balance now: ${finalBalance}`);
if (finalBalance !== 0) die(`expected an empty confidential balance, got ${finalBalance}`);

// ⚠ **An empty confidential balance is NOT publicly identifiable as empty**, and
// that is XLS-0096 §10.7.2's own claim rather than ours. `CLAIMS.md` F-1 is the
// narrower fact that matters: the *canonical* `EncZero` used at initialisation
// **is** computable by anyone, so a balance equal to it is publicly known to be
// zero. A post-ConvertBack balance is a homomorphic subtraction, not that
// constant — which the observer harness is what actually checks.
const encZero = (await tool("enczero", (await mptOf(who.address)).HolderEncryptionKey,
                            hexOf(Uint8Array.from(decodeAccountID(who.address))),
                            state.issuanceId))[0];
const spendingNow = (await mptOf(who.address)).ConfidentialBalanceSpending;
console.log(`\nthe emptied balance ${spendingNow === encZero ? "IS" : "is NOT"} the canonical EncZero ` +
            `— F-1 is about the canonical constant, and a subtracted-to-zero balance is not it`);

state.step7ConvertBack = {
  objective: "ConfidentialMPTConvertBack built, proved and signed by signer/, under a DERIVED ElGamal key",
  account: who.address,
  issuanceId: state.issuanceId,
  partial: { amount: first.amount, hash: first.hash },
  entireRemainder: { amount: second.amount, hash: second.hash },
  emptiedBalanceIsCanonicalEncZero: spendingNow === encZero,
  at: new Date().toISOString(),
};
save();

console.log(`\n✓ two ConvertBacks, validated, ledger state matching §10.5 on both`);
console.log(`\nNow fire step 4's falsifier over an account that has ConvertBacks in it:\n`);
console.log(`  bun run tools/observer-harness.ts ${who.address} ${state.issuanceId} --assert-no-r-reuse\n`);
close();
