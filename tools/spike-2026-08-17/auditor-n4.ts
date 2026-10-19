/**
 * auditor.ts — close the n=3 limitation.
 *
 * Every size and metadata figure to date was measured on a three-participant
 * issuance. E-4's 1276 B "with auditor" is arithmetic on a measured 1210, and
 * E-51's metadata figure is n=3. Build an issuance that carries
 * sfAuditorEncryptionKey and measure the four-participant case directly.
 */
import { connect, rpc, close, state, save, tool, submit, sequenceOf, accountIdHex, faucet, createdNode } from "./convert.ts";
import { decode } from "ripple-binary-codec";
import { deriveR, deriveRandomness } from "../wconf-randomness.ts";
await connect();

const issuer = state.issuer, A = state.holder, B = state.holderB;
const ISS = () => state.issuanceId2;
const mptOf = async (a: string, iss = ISS()) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === iss);
async function freshSeq(a: string) { for (let i=0;i<20;i++){const v=await rpc({command:"account_info",account:a,ledger_index:"validated"});const c=await rpc({command:"account_info",account:a,ledger_index:"current"});if(v.result.account_data.Sequence===c.result.account_data.Sequence)return v.result.account_data.Sequence;await Bun.sleep(2000);} return sequenceOf(a); }

// --- 1. issuance with BOTH issuer and auditor keys ---
if (!state.issuanceId2) {
  const r = await submit({ TransactionType: "MPTokenIssuanceCreate", AssetScale: 0, MaximumAmount: "1000000000", Flags: 0x20 | 0x40 }, issuer.seed);
  if (!r.engine.startsWith("tes")) throw new Error(`create ${r.engine}`);
  state.issuanceId2 = r.meta?.mpt_issuance_id ?? createdNode(r.meta, "MPTokenIssuance")?.LedgerIndex;
  const [ask, apk] = await tool("keygen");
  state.auditorElGamal = { sk: ask, pk: apk };
  save();
  console.log(`  issuance2 = ${state.issuanceId2}`);
  const r2 = await submit({
    TransactionType: "MPTokenIssuanceSet", MPTokenIssuanceID: state.issuanceId2, Flags: 256,
    IssuerEncryptionKey: state.issuerElGamal.pk, AuditorEncryptionKey: apk,
  }, issuer.seed);
  console.log(`  set issuer+auditor keys -> ${r2.engine} ${r2.message}`);
  if (!r2.engine.startsWith("tes")) throw new Error("auditor key registration failed");
}
const issNode = (await rpc({ command: "ledger_entry", mpt_issuance: ISS(), ledger_index: "validated" })).result.node;
console.log(`  issuance flags=${issNode.Flags} IssuerEncryptionKey=${!!issNode.IssuerEncryptionKey} AuditorEncryptionKey=${!!issNode.AuditorEncryptionKey}`);

// --- 2. both holders opt in ---
for (const h of [A, B]) if (!(await mptOf(h.address))) {
  const r = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: ISS() }, h.seed, { quiet: true });
  console.log(`  authorize ${h.address.slice(0,8)} -> ${r.engine}`);
}
// --- 3. fund A publicly ---
if (!state.aud_funded) {
  const r = await submit({ TransactionType: "Payment", Destination: A.address, Amount: { mpt_issuance_id: ISS(), value: "1000" } }, issuer.seed, { quiet: true });
  console.log(`  payment -> ${r.engine}`); state.aud_funded = true; save();
}

const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk, PK_AUD = state.auditorElGamal.pk;

// --- 4. Convert WITH an auditor ciphertext ---
async function convert(h: any, pk: string, sk: string, amount: number) {
  const seq = await freshSeq(h.address);
  const [ctxh] = await tool("convert-ctx", accountIdHex(h.address), ISS(), String(seq));
  const [proof] = await tool("convert-proof", pk, sk, ctxh);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76.
  const r32 = deriveR({ txKind: "ConfidentialMPTConvert", accountIdHex: accountIdHex(h.address),
                        issuanceIdHex: ISS(), contextHashHex: ctxh });
  const [hct] = await tool("encrypt", String(amount), pk, r32);
  const [ict] = await tool("encrypt", String(amount), PK_I, r32);
  const [act] = await tool("encrypt", String(amount), PK_AUD, r32);
  const r = await submit({
    TransactionType: "ConfidentialMPTConvert", MPTokenIssuanceID: ISS(), MPTAmount: String(amount),
    HolderEncryptionKey: pk, HolderEncryptedAmount: hct, IssuerEncryptedAmount: ict,
    AuditorEncryptedAmount: act, BlindingFactor: r32, ZKProof: proof, Sequence: seq,
  }, h.seed, { quiet: true });
  console.log(`  Convert(${amount}) auditor-issuance -> ${r.engine} ${r.message}  blob=${r.blob!.length/2} B`);
  return r;
}
let a = await mptOf(A.address);
if (!a?.HolderEncryptionKey) { await convert(A, PK_A, SK_A, 500); a = await mptOf(A.address); }
let b = await mptOf(B.address);
if (!b?.HolderEncryptionKey) { await convert(B, PK_B, state.holderBElGamal.sk, 0); b = await mptOf(B.address); }
console.log(`  A MPToken fields: [${Object.keys(a).sort().join(", ")}]`);

// --- 5. merge so A can spend ---
if (a.ConfidentialBalanceInbox && (await tool("enczero", PK_A, accountIdHex(A.address), ISS()))[0] !== a.ConfidentialBalanceInbox) {
  await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: ISS() }, A.seed, { quiet: true });
  a = await mptOf(A.address);
}
console.log(`  A spending decrypts to ${(await tool("decrypt", a.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]}`);
console.log(`  auditor can read A's balance: ${(await tool("decrypt", a.AuditorEncryptedBalance, state.auditorElGamal.sk, "0", "2000"))[0]}`);

// --- 6. the measurement: a FOUR-participant Send ---
const cur = await mptOf(A.address);
const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]);
const seq = await freshSeq(A.address);
const [ctxhPre] = await tool("send-ctx", accountIdHex(A.address), ISS(), String(seq), accountIdHex(B.address), String(cur.ConfidentialBalanceVersion ?? 0));
// ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. The
// context hash has to exist first, because the derivation binds to it.
const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(A.address),
                                           issuanceIdHex: ISS(), contextHashHex: ctxhPre });
const AMT = 25;
const [ctA] = await tool("encrypt", String(AMT), PK_A, r32);
const [ctB] = await tool("encrypt", String(AMT), PK_B, r32);
const [ctI] = await tool("encrypt", String(AMT), PK_I, r32);
const [ctAud] = await tool("encrypt", String(AMT), PK_AUD, r32);
const [pcM] = await tool("pedersen", String(AMT), r32);
const [pcB] = await tool("pedersen", String(balance), rho);
const ctxh = ctxhPre;
const [proof] = await tool("send-proof", SK_A, PK_A, String(AMT), r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho,
  "4", PK_A, ctA, PK_B, ctB, PK_I, ctI, PK_AUD, ctAud);
console.log(`\n  n=4 send proof length: ${proof.length/2} B`);
const r = await submit({
  TransactionType: "ConfidentialMPTSend", Destination: B.address, MPTokenIssuanceID: ISS(),
  SenderEncryptedAmount: ctA, DestinationEncryptedAmount: ctB, IssuerEncryptedAmount: ctI,
  AuditorEncryptedAmount: ctAud, AmountCommitment: pcM, BalanceCommitment: pcB, ZKProof: proof, Sequence: seq,
}, A.seed, { quiet: true });
console.log(`  >>> FOUR-PARTICIPANT SEND: ${r.engine} ${r.message}`);
if (r.engine.startsWith("tes")) {
  const d: any = decode(r.blob!);
  const bin = await rpc({ command: "tx", transaction: r.hash, binary: true });
  const metaLen = (bin.result?.meta ?? bin.result?.meta_blob ?? "").length / 2;
  let payload = 0;
  console.log(`\n  === n=4 MEASURED ===`);
  for (const k of ["SenderEncryptedAmount","DestinationEncryptedAmount","IssuerEncryptedAmount","AuditorEncryptedAmount","AmountCommitment","BalanceCommitment","ZKProof"]) {
    const n = (d[k] as string).length / 2; payload += n;
    console.log(`    ${k.padEnd(30)} ${n} B`);
  }
  console.log(`    ${"confidential payload".padEnd(30)} ${payload} B   (n=3 measured 1210; arithmetic predicted 1276)`);
  console.log(`    ${"signed blob".padEnd(30)} ${r.blob!.length/2} B   (n=3 was 1423)`);
  console.log(`    ${"metadata".padEnd(30)} ${metaLen} B   (n=3 was 1219/1225, cap 5200)`);
  const c1 = (s: string) => s.slice(0,66);
  console.log(`    C1 shared across all FOUR: ${new Set([ctA,ctB,ctI,ctAud].map(c1)).size === 1}`);
  const nodes = (r.meta?.AffectedNodes ?? []).map((n: any) => { const k = Object.keys(n)[0]; return `${k}:${n[k].LedgerEntryType}[${Object.keys(n[k].PreviousFields ?? {}).sort().join("|")}]`; }).sort();
  console.log(`    AffectedNodes ${nodes.length}:`); nodes.forEach((n:string)=>console.log(`      ${n}`));
}
close();
