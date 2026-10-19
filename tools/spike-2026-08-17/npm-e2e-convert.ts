/**
 * e2e.ts — close the gap in E-53.
 *
 * E-53 said the published npm package "reproduces the context hash byte for
 * byte" and that the JS client path is three published packages. That is
 * component agreement, NOT an end-to-end execution. This submits a real
 * ConfidentialMPTConvert whose every piece of proof material comes from
 * @xrplf/mpt-crypto@0.1.0 off npm.
 *
 * ElGamal keys still come from mpt-crypto's own mpt_generate_keypair via the
 * native tool: the package deliberately does not export keygen, and deriving
 * an ElGamal key from an XRPL seed is precisely what ADR-0001 §(e) is under
 * review for. That prohibition is not worked around here.
 */
import * as mpt from "@xrplf/mpt-crypto";
import { connect, rpc, close, state, save, submit, sequenceOf, accountIdHex, faucet, tool } from "/tmp/wconf/convert.ts";

await connect();

const holderC = await faucet("holderC");

// opt in
const objs0 = await rpc({ command: "account_objects", account: holderC.address, ledger_index: "validated", type: "mptoken" });
if (!(objs0.result.account_objects ?? []).some((o: any) => o.MPTokenIssuanceID === state.issuanceId)) {
  const a = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: state.issuanceId }, holderC.seed);
  if (!a.engine.startsWith("tes")) throw new Error(`authorize ${a.engine}`);
}
// give it a public balance
const p = await submit({
  TransactionType: "Payment",
  Destination: holderC.address,
  Amount: { mpt_issuance_id: state.issuanceId, value: "500" },
}, state.issuer.seed);
if (!p.engine.startsWith("tes")) throw new Error(`payment ${p.engine}`);

// --- everything below is @xrplf/mpt-crypto off npm, except the keypair ---
const [sk, pk] = await tool("keygen");   // package does not export keygen, by design
const seq = await sequenceOf(holderC.address);
const acc = accountIdHex(holderC.address);

const ctxHash = await mpt.getConvertContextHash(acc, state.issuanceId, seq);
const zkProof = await mpt.getConvertProof(pk, sk, ctxHash);
const r       = await mpt.generateBlindingFactor();
const AMOUNT  = 321n;
const holderCt = await mpt.encryptAmount(AMOUNT, pk, r);
const issuerCt = await mpt.encryptAmount(AMOUNT, state.issuerElGamal.pk, r);

console.log(`\nall proof material from @xrplf/mpt-crypto@0.1.0:`);
console.log(`  ctxHash  ${ctxHash}`);
console.log(`  ZKProof  ${zkProof.slice(0, 40)}... (${zkProof.length / 2} B)`);

const res = await submit({
  TransactionType: "ConfidentialMPTConvert",
  MPTokenIssuanceID: state.issuanceId,
  MPTAmount: String(AMOUNT),
  HolderEncryptionKey: pk,
  HolderEncryptedAmount: holderCt,
  IssuerEncryptedAmount: issuerCt,
  BlindingFactor: r,
  ZKProof: zkProof,
  Sequence: seq,
}, holderC.seed);

console.log(`\n>>> ConfidentialMPTConvert (npm-only proof material): ${res.engine} ${res.message}`);
console.log(`    hash ${res.hash}`);
if (res.validated) console.log(`    validated: ${res.meta.TransactionResult}`);

// read it back and decrypt with the npm package's own decryptAmount
const objs = await rpc({ command: "account_objects", account: holderC.address, ledger_index: "validated", type: "mptoken" });
const m = (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
// REVIEW-004b HIGH-02: this line originally passed FOUR arguments to a THREE
// argument signature — decryptAmount(ciphertext, privateKey, rangeHigh) — so
// rangeHigh received 0n, the search window was [0,0], and the call threw. The
// throw is how F-15's fixed range_low was found, but the line was still wrong.
const got = await mpt.decryptAmount(m.ConfidentialBalanceInbox, sk, 1000n);
console.log(`    inbox decrypts (npm decryptAmount) -> ${got}`);
if (got !== BigInt(AMOUNT)) throw new Error(`expected ${AMOUNT}, got ${got}`);
state.npmConvertHash = res.hash; save();
close();
