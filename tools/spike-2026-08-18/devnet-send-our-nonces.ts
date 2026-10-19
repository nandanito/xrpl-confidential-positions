#!/usr/bin/env bun
/**
 * THE OBJECTIVE. A ConfidentialMPTSend accepted by Devnet whose sigma nonces
 * this project derived, not mpt-crypto.
 *
 * Every byte of proof material below comes from ./mptool-patched, built against
 * the vendored mpt-crypto at 85dbac7 with generate_deterministic_nonces()
 * replaced by wconf_generate_nonces(). See WCONF-PATCH.md.
 *
 * Ledger plumbing is reused verbatim from the previous session's spike —
 * connect(), submit(), faucet() and the network_id==2 refusal all come from
 * tools/spike-2026-08-17/convert.ts. Nothing about submission is new here, and
 * per the session brief, if this script is debugging serialisation or signing
 * then it is off the path.
 *
 * DEVNET ONLY. convert.ts refuses any network_id but 2.
 */
import {
  connect, rpc, close, state, save, submit, sequenceOf, accountIdHex,
} from "../spike-2026-08-17/convert.ts";
import { writeFileSync } from "fs";
import { deriveRandomness } from "../wconf-randomness.ts";

const PATCHED = "/tmp/wconf/mptool-patched";
const PRISTINE = "/tmp/wconf/mptool-pristine";

function runTool(bin: string, args: string[]): string[] {
  const p = Bun.spawnSync([bin, ...args]);
  if (p.exitCode !== 0)
    throw new Error(`${bin} ${args[0]} failed: ${p.stderr.toString()}`);
  return p.stdout.toString().trim().split("\n");
}
const ours = (...a: string[]) => runTool(PATCHED, a);
const upstream = (...a: string[]) => runTool(PRISTINE, a);

await connect();

const holder = state.holder;
const holderB = state.holderB;
const ISS = state.issuanceId;
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk;
const PK_I = state.issuerElGamal.pk;

if (!holderB) throw new Error("no holderB in state — run the 2026-08-17 spike first");

async function mptOf(addr: string) {
  const objs = await rpc({
    command: "account_objects", account: addr,
    ledger_index: "validated", type: "mptoken",
  });
  return (objs.result.account_objects ?? []).find(
    (o: any) => o.MPTokenIssuanceID === ISS,
  );
}

// --- make sure the sender has a spendable confidential balance -------------
let cur = await mptOf(holder.address);
const encZero = ours("enczero", cur.HolderEncryptionKey, accountIdHex(holder.address), ISS)[0];
if (!cur.ConfidentialBalanceSpending || cur.ConfidentialBalanceSpending === encZero) {
  console.log("spending balance is canonical zero — merging inbox first...");
  const m = await submit(
    { TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: ISS },
    holder.seed,
  );
  console.log(`  MergeInbox -> ${m.engine}`);
  if (!m.engine.startsWith("tes")) throw new Error(`merge failed: ${m.engine}`);
  cur = await mptOf(holder.address);
}

const balance = Number(ours("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "5000")[0]);
const version = cur.ConfidentialBalanceVersion ?? 0;
const seq = await sequenceOf(holder.address);
const amount = 5;

console.log(`\nsender balance ${balance}, version ${version}, sequence ${seq}`);
if (balance < amount) throw new Error(`balance ${balance} < amount ${amount}`);

// --- build every piece of proof material with OUR binary -------------------
//
// ⚠ **`r` and `ρ` come from the RULED derivation, not from `mptool blinding`.**
// This harness **submits to Devnet**, so its `r` is published in
// `BlindingFactor` permanently — which is the whole of `CLAIMS.md` E-76's
// concern. It was missed by the 2026-08-24 migration because the call went
// through a wrapper named `ours(...)` while the search looked for the literal
// `tool` helper by name (E-137). The context hash moves above the derivation
// because the derivation binds to it.
//
// ⚠ The old call string is deliberately NOT quoted above: this file is scanned
// by `tools/check-blinding-sources.ts`, and a gate that fires on prose about
// itself is a gate people learn to ignore.
//
// The **sigma nonces** — what this file exists to demonstrate — are internal to
// `send-proof` and are untouched by this.
const [ctxh] = ours(
  "send-ctx", accountIdHex(holder.address), ISS, String(seq),
  accountIdHex(holderB.address), String(version),
);
const { r: r32, rho } = deriveRandomness({
  txKind: "ConfidentialMPTSend",
  accountIdHex: accountIdHex(holder.address),
  issuanceIdHex: ISS,
  contextHashHex: ctxh,
});
const [ctA] = ours("encrypt", String(amount), PK_A, r32);
const [ctB] = ours("encrypt", String(amount), PK_B, r32);
const [ctI] = ours("encrypt", String(amount), PK_I, r32);
const [pcM] = ours("pedersen", String(amount), r32);
const [pcB] = ours("pedersen", String(balance), rho);

const proofArgs = [
  "send-proof", SK_A, PK_A, String(amount), r32, ctxh, pcM,
  pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3",
  PK_A, ctA, PK_B, ctB, PK_I, ctI,
];
const [proof] = ours(...proofArgs);

// --- gate before spending a transaction on it ------------------------------
// The sigma prefix must reproduce, and the PRISTINE upstream verifier must
// accept. That verifier is built from tag 1.0.4, whose src/ and include/ are
// byte-identical to the 0.4.0-rc4 rippled 3.3.0 ships — asserted by
// vendor-verify.sh, not assumed. If either check fails, do not submit.
const SIGMA = 192 * 2;
const [proofAgain] = ours(...proofArgs);

// Since the issue #1 ruling the DEFAULT build is hedged, so the proof
// deliberately does not reproduce. Reproducibility moved to the deterministic
// arm, which is what still shows the KDF is ours rather than upstream's.
const DETERMINISTIC = "/tmp/wconf/mptool-deterministic";
const det = (...a: string[]) => runTool(DETERMINISTIC, a);
const hedgedVaries = proof.slice(0, SIGMA) !== proofAgain.slice(0, SIGMA);
const [d1] = det(...proofArgs);
const [d2] = det(...proofArgs);
const detReproduces = d1.slice(0, SIGMA) === d2.slice(0, SIGMA);
const deterministic = hedgedVaries && detReproduces;

const verifyArgs = [
  "verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3",
  PK_A, ctA, PK_B, ctB, PK_I, ctI,
];
const localUpstream = upstream(...verifyArgs)[0];
const localOurs = ours(...verifyArgs)[0];

console.log(`\npre-submit gate`);
console.log(`  hedged default varies .......... ${hedgedVaries ? "yes" : "NO"}`);
console.log(`  deterministic arm reproduces ... ${detReproduces ? "yes" : "NO"}`);
console.log(`  pristine 85dbac7 verifier ...... ${localUpstream}`);
console.log(`  patched verifier ............... ${localOurs}`);
console.log(`  proof ${proof.length / 2} B, sigma ${SIGMA / 2} B, context ${ctxh}`);

if (!deterministic || localUpstream !== "OK")
  throw new Error("pre-submit gate failed — not submitting");

// --- submit ----------------------------------------------------------------
const tx = {
  TransactionType: "ConfidentialMPTSend",
  Destination: holderB.address,
  MPTokenIssuanceID: ISS,
  SenderEncryptedAmount: ctA,
  DestinationEncryptedAmount: ctB,
  IssuerEncryptedAmount: ctI,
  AmountCommitment: pcM,
  BalanceCommitment: pcB,
  ZKProof: proof,
  Sequence: seq,
};

console.log(`\nsubmitting ConfidentialMPTSend, ${amount} units, ${holder.address} -> ${holderB.address}`);
const r = await submit(tx, holder.seed);
console.log(`\n  engine  ${r.engine}`);
console.log(`  message ${r.message}`);
console.log(`  hash    ${r.hash ?? "(none)"}`);

let confirmed: any = null;
if (r.engine.startsWith("tes") && r.hash) {
  const v = await rpc({ command: "tx", transaction: r.hash });
  confirmed = {
    validated: v.result?.validated ?? false,
    result: v.result?.meta?.TransactionResult ?? v.result?.metaData?.TransactionResult,
  };
  console.log(`  validated ${confirmed.validated}, meta result ${confirmed.result}`);

  const after = await mptOf(holder.address);
  const balAfter = Number(ours("decrypt", after.ConfidentialBalanceSpending, SK_A, "0", "5000")[0]);
  console.log(`  sender balance ${balance} -> ${balAfter} (expected ${balance - amount})`);
  confirmed.balanceBefore = balance;
  confirmed.balanceAfter = balAfter;
  confirmed.moved = balAfter === balance - amount;
}

const record = {
  objective: "ConfidentialMPTSend with W-CONF-derived sigma nonces",
  mptCryptoCommit: "85dbac7",
  hedge: "ON (issue #1 ruled 2026-08-18; WCONF_HEDGE=1 default)",
  engine: r.engine, hash: r.hash ?? null, message: r.message,
  amount, balanceBefore: balance, version, sequence: seq,
  contextHash: ctxh, proofBytes: proof.length / 2,
  sigmaDeterministic: deterministic,
  pristineUpstreamVerifierVerdict: localUpstream,
  confirmed,
};
writeFileSync("/tmp/wconf/wconf-send-result.json", JSON.stringify(record, null, 2));
state.wconfNonceSend = record;
save();

close();
console.log("\nrecorded to /tmp/wconf/wconf-send-result.json");
if (!r.engine.startsWith("tes")) process.exit(1);
