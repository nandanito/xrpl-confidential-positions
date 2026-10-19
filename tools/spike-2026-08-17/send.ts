/**
 * send.ts — objectives 2 and 3.
 *
 *   2. Measure a real ConfidentialMPTSend on the wire (E-4: 1276 vs 1177).
 *   3. Try to FALSIFY E-22: zero-amount sends valid and indistinguishable.
 *
 * Deliberately linear and repetitive. Not library code.
 */
import { connect, rpc, close, state, save, tool, submit, sequenceOf, accountIdHex, faucet, createdNode } from "./convert.ts";
import { decode } from "ripple-binary-codec";
import { deriveR, deriveRandomness } from "../wconf-randomness.ts";

await connect();

const issuer = state.issuer, holder = state.holder;

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

// --- A: merge inbox so the spending balance is non-zero -------------------
let a = await mptOf(holder.address);
if (a.ConfidentialBalanceSpending && (await tool("enczero", a.HolderEncryptionKey, accountIdHex(holder.address), state.issuanceId))[0] === a.ConfidentialBalanceSpending) {
  console.log("merging A's inbox into spending balance...");
  const r = await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, holder.seed);
  if (!r.engine.startsWith("tes")) throw new Error(`merge failed ${r.engine}`);
  a = await mptOf(holder.address);
}
console.log(`A spending balance decrypts to: ${(await tool("decrypt", a.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "2000"))[0]}`);
console.log(`A version = ${a.ConfidentialBalanceVersion ?? 0}`);

// --- B: second holder, opted in and key-registered ------------------------
const holderB = await faucet("holderB");
let b = await mptOf(holderB.address);
if (!b) {
  await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: state.issuanceId }, holderB.seed);
  b = await mptOf(holderB.address);
}
if (!b.HolderEncryptionKey) {
  const [bsk, bpk] = await tool("keygen");
  state.holderBElGamal = { sk: bsk, pk: bpk }; save();
  const seq = await sequenceOf(holderB.address);
  const [ctxh] = await tool("convert-ctx", accountIdHex(holderB.address), state.issuanceId, String(seq));
  const [proof] = await tool("convert-proof", bpk, bsk, ctxh);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. A
  // Convert has no BalanceCommitment, so there is no rho to derive.
  const r32 = deriveR({ txKind: "ConfidentialMPTConvert", accountIdHex: accountIdHex(holderB.address),
                        issuanceIdHex: state.issuanceId, contextHashHex: ctxh });
  const [hct] = await tool("encrypt", "0", bpk, r32);
  const [ict] = await tool("encrypt", "0", state.issuerElGamal.pk, r32);
  const r = await submit({
    TransactionType: "ConfidentialMPTConvert", MPTokenIssuanceID: state.issuanceId,
    MPTAmount: "0", HolderEncryptionKey: bpk, HolderEncryptedAmount: hct,
    IssuerEncryptedAmount: ict, BlindingFactor: r32, ZKProof: proof, Sequence: seq,
  }, holderB.seed);
  console.log(`B zero-amount opt-in Convert -> ${r.engine}`);
  if (!r.engine.startsWith("tes")) throw new Error("B opt-in failed");
  b = await mptOf(holderB.address);
}
console.log(`B key = ${b.HolderEncryptionKey}`);

// --- the send builder ----------------------------------------------------
const ISS = state.issuanceId;
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk;
const PK_I = state.issuerElGamal.pk;

async function buildSend(amount: number, fee: string) {
  const cur = await mptOf(holder.address);
  const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]);
  const version = cur.ConfidentialBalanceVersion ?? 0;
  const seq = await sequenceOf(holder.address);

  // ⚠ **The context hash is now computed FIRST**, because the ruled derivation
  // binds to it. `CLAIMS.md` E-76.
  const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), ISS, String(seq), accountIdHex(holderB.address), String(version));
  const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(holder.address),
                                             issuanceIdHex: ISS, contextHashHex: ctxh });
  const [ctA] = await tool("encrypt", String(amount), PK_A, r32);
  const [ctB] = await tool("encrypt", String(amount), PK_B, r32);
  const [ctI] = await tool("encrypt", String(amount), PK_I, r32);
  const [pcM] = await tool("pedersen", String(amount), r32);
  const [pcB] = await tool("pedersen", String(balance), rho);
  const [proof] = await tool("send-proof", SK_A, PK_A, String(amount), r32, ctxh, pcM,
    pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3",
    PK_A, ctA, PK_B, ctB, PK_I, ctI);

  const verify = (await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI))[0];

  return {
    amount, balance, version, seq, r32, rho, ctA, ctB, ctI, pcM, pcB, ctxh, proof, verify,
    tx: {
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
      Fee: fee,
    },
  };
}

const results: any[] = [];
async function doSend(label: string, amount: number, fee = "5000") {
  console.log(`\n=== ${label} (amount=${amount}, fee=${fee}) ===`);
  // ⚠ **An amount above the balance fails as `send proof generation failed`**,
  // which is upstream's only signal and says nothing about which of the six
  // things it checks was wrong. The amounts below are hard-coded and this
  // account's balance drifts down every time the harness is run, so the first
  // person to hit it reads a stale parameter as a broken build — as happened on
  // 2026-08-24. `UPSTREAM-FEEDBACK.md`.
  const avail = Number((await tool("decrypt", (await mptOf(holder.address)).ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]);
  if (amount > avail) {
    throw new Error(
      `${label} asks to send ${amount} and the confidential balance is ${avail}. ` +
      `The amounts in this harness are hard-coded and the balance drifts; lower them, ` +
      `or convert more in first. This is NOT a build failure.`);
  }
  const s = await buildSend(amount, fee);
  console.log(`  balance=${s.balance} version=${s.version} seq=${s.seq}`);
  console.log(`  local proof self-verify: ${s.verify}   proof len ${s.proof.length / 2} B`);
  const r = await submit(s.tx, holder.seed);
  const blobLen = r.blob!.length / 2;
  console.log(`  result ${r.engine}  blob ${blobLen} B`);
  const rec = { label, amount, fee, ...s, engine: r.engine, message: r.message, hash: r.hash, blobLen, blob: r.blob, meta: r.meta, validated: r.validated };
  results.push(rec);
  return rec;
}

// 1. baseline non-zero send
const nz = await doSend("NON-ZERO SEND", 100);

// 2. E-22 check 2 — the sharpest test: two zero sends, same account
const z1 = await doSend("ZERO SEND #1", 0);
const z2 = await doSend("ZERO SEND #2", 0);

state.sendResults = results.map((r) => ({
  label: r.label, amount: r.amount, engine: r.engine, hash: r.hash, blobLen: r.blobLen,
  ctA: r.ctA, ctB: r.ctB, ctI: r.ctI, pcM: r.pcM, pcB: r.pcB, proof: r.proof, blob: r.blob,
  balance: r.balance, version: r.version, verify: r.verify,
}));
save();

// ---------------------------------------------------------------------------
console.log("\n\n################  OBJECTIVE 2 — SIZE  ################");
for (const r of results) {
  if (!r.blob) continue;
  const d: any = decode(r.blob);
  console.log(`\n${r.label}: total signed blob = ${r.blobLen} B`);
  const sizes: Record<string, number> = {};
  for (const [k, v] of Object.entries(d)) if (typeof v === "string" && /^[0-9A-F]*$/i.test(v) && v.length > 8) sizes[k] = v.length / 2;
  for (const [k, v] of Object.entries(sizes)) console.log(`    ${k.padEnd(30)} ${v} B`);
}

console.log("\n\n################  OBJECTIVE 3 — E-22  ################");
console.log(`\n[1] VALIDITY of a zero-amount Send: ${z1.engine} / ${z2.engine}`);
console.log(`\n[2] RANDOMISATION — two zero sends from the same account:`);
for (const f of ["ctA", "ctB", "ctI", "pcM", "pcB", "proof"] as const) {
  const same = (z1 as any)[f] === (z2 as any)[f];
  console.log(`    ${f.padEnd(8)} ${same ? "*** BYTE-IDENTICAL ***" : "differs"}`);
}
console.log(`\n[3] F-1 DISTINGUISHER — canonical EncZero vs the zero-send ciphertexts:`);
const [ez_A] = await tool("enczero", PK_A, accountIdHex(holder.address), ISS);
const [ez_B] = await tool("enczero", PK_B, accountIdHex(holderB.address), ISS);
console.log(`    EncZero(A) = ${ez_A}`);
console.log(`    z1.ctA     = ${z1.ctA}   ${z1.ctA === ez_A ? "*** MATCHES EncZero ***" : "no match"}`);
console.log(`    z2.ctA     = ${z2.ctA}   ${z2.ctA === ez_A ? "*** MATCHES EncZero ***" : "no match"}`);
console.log(`    EncZero(B) = ${ez_B}`);
console.log(`    z1.ctB     = ${z1.ctB}   ${z1.ctB === ez_B ? "*** MATCHES EncZero ***" : "no match"}`);

console.log(`\n[4] SIDE-BY-SIDE against the non-zero send:`);
const row = (k: string, f: (r: any) => any) =>
  console.log(`    ${k.padEnd(26)} nonzero=${String(f(nz)).padEnd(26)} zero1=${String(f(z1)).padEnd(26)} zero2=${f(z2)}`);
row("engine result", (r) => r.engine);
row("signed blob bytes", (r) => r.blobLen);
row("ZKProof bytes", (r) => r.proof.length / 2);
row("Fee (drops)", (r) => r.fee);
row("fee charged (meta)", (r) => r.validated?.tx_json?.Fee ?? r.validated?.Fee ?? "?");
row("AffectedNodes count", (r) => r.meta?.AffectedNodes?.length ?? "?");
row("version before", (r) => r.version);
row("local self-verify", (r) => r.verify);

for (const r of results) {
  console.log(`\n    --- ${r.label} metadata shape ---`);
  for (const n of r.meta?.AffectedNodes ?? []) {
    const kind = Object.keys(n)[0];
    const nn = (n as any)[kind];
    const fields = Object.keys(nn.FinalFields ?? nn.NewFields ?? {});
    const prev = Object.keys(nn.PreviousFields ?? {});
    console.log(`      ${kind} ${nn.LedgerEntryType} changed=[${prev.join(",")}]`);
  }
}

close();
