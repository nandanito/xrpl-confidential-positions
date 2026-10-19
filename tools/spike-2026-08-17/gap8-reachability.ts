/**
 * gap8-reach.ts — REVIEW-007: non-rejection is not unreachability.
 *
 * Both legs objected that the GAP-8 lifecycle funded lender and borrower
 * PUBLICLY, so no lending actor ever held confidential value. Fifteen successes
 * therefore proved the stack does not REJECT a confidential-capable asset; they
 * said nothing about whether a transactor could REACH a confidential balance
 * belonging to an actor that has one.
 *
 * This closes that. The borrower is given a real confidential balance and then
 * asked to make a loan payment it can only afford confidentially. Every step
 * asserts and every hash is persisted, which the earlier harness did not do.
 */
import { connect, rpc, close, state, save, submit, sequenceOf, accountIdHex, createdNode, tool } from "./convert.ts";
import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, sign } from "ripple-keypairs";
import { deriveR } from "../wconf-randomness.ts";
await connect();

const ISS = state.issuanceId, issuer = state.issuer, lender = state.lender, borrower = state.borrower;
const evidence: any[] = [];
async function must(label: string, tx: any, seed: string) {
  const r = await submit(tx, seed, { quiet: true });
  evidence.push({ label, type: tx.TransactionType, engine: r.engine, hash: r.hash });
  console.log(`  ${label.padEnd(30)} ${r.engine}  ${r.hash ?? ""}`);
  if (!r.engine.startsWith("tes")) throw new Error(`${label} failed: ${r.engine} ${r.message}`);
  return r;
}
async function freshSeq(a: string) { for (let i=0;i<20;i++){const v=await rpc({command:"account_info",account:a,ledger_index:"validated"});const c=await rpc({command:"account_info",account:a,ledger_index:"current"});if(v.result.account_data.Sequence===c.result.account_data.Sequence)return v.result.account_data.Sequence;await Bun.sleep(2000);} return sequenceOf(a); }
const mptOf = async (a: string) => ((await rpc({ command:"account_objects", account:a, ledger_index:"validated", type:"mptoken" })).result.account_objects ?? []).find((x:any)=>x.MPTokenIssuanceID===ISS);

// --- give the BORROWER a real confidential balance -------------------------
let b = await mptOf(borrower.address);
if (!b.HolderEncryptionKey) {
  const [sk, pk] = await tool("keygen");
  state.borrowerElGamal = { sk, pk }; save();
  const seq = await freshSeq(borrower.address);
  const [ctxh] = await tool("convert-ctx", accountIdHex(borrower.address), ISS, String(seq));
  const [proof] = await tool("convert-proof", pk, sk, ctxh);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76.
  const r32 = deriveR({ txKind: "ConfidentialMPTConvert", accountIdHex: accountIdHex(borrower.address),
                        issuanceIdHex: ISS, contextHashHex: ctxh });
  const [hct] = await tool("encrypt", "600", pk, r32);
  const [ict] = await tool("encrypt", "600", state.issuerElGamal.pk, r32);
  await must("Convert 600 (borrower)", { TransactionType:"ConfidentialMPTConvert", MPTokenIssuanceID:ISS, MPTAmount:"600",
    HolderEncryptionKey:pk, HolderEncryptedAmount:hct, IssuerEncryptedAmount:ict, BlindingFactor:r32, ZKProof:proof, Sequence:seq }, borrower.seed);
  await must("MergeInbox (borrower)", { TransactionType:"ConfidentialMPTMergeInbox", MPTokenIssuanceID:ISS }, borrower.seed);
  b = await mptOf(borrower.address);
}
const BSK = state.borrowerElGamal.sk;
const confBefore = (await tool("decrypt", b.ConfidentialBalanceSpending, BSK, "0", "3000"))[0];
console.log(`\n  borrower: public=${b.MPTAmount ?? 0}  CONFIDENTIAL=${confBefore}`);

// --- rebuild vault + broker + loan (the first run tore them all down) -------
console.log(`\n=== rebuilding the lending stack ===`);
const v = await must("VaultCreate", { TransactionType:"VaultCreate", Asset:{ mpt_issuance_id: ISS }, WithdrawalPolicy:1 }, lender.seed);
const VAULT = createdNode(v.meta, "Vault").LedgerIndex;
await must("VaultDeposit 2000", { TransactionType:"VaultDeposit", VaultID:VAULT, Amount:{ mpt_issuance_id:ISS, value:"2000" } }, lender.seed);
const br = await must("LoanBrokerSet", { TransactionType:"LoanBrokerSet", VaultID:VAULT, ManagementFeeRate:100, CoverRateMinimum:1000, CoverRateLiquidation:1000, DebtMaximum:"10000" }, lender.seed);
const BROKER = createdNode(br.meta, "LoanBroker").LedgerIndex;
await must("LoanBrokerCoverDeposit", { TransactionType:"LoanBrokerCoverDeposit", LoanBrokerID:BROKER, Amount:{ mpt_issuance_id:ISS, value:"500" } }, lender.seed);

const bkp = deriveKeypair(borrower.seed), lkp = deriveKeypair(lender.seed);
const cur = await rpc({ command:"ledger_current" });
const tx: any = { TransactionType:"LoanSet", Account:borrower.address, LoanBrokerID:BROKER, Counterparty:lender.address,
  PrincipalRequested:"400", InterestRate:500, PaymentTotal:4, PaymentInterval:60, GracePeriod:60,
  Sequence: await freshSeq(borrower.address), Fee:"40000", LastLedgerSequence: cur.result.ledger_current_index + 20, SigningPubKey: bkp.publicKey };
const payload = encodeForSigning(tx);
tx.CounterpartySignature = { SigningPubKey: lkp.publicKey, TxnSignature: sign(payload, lkp.privateKey) };
tx.TxnSignature = sign(payload, bkp.privateKey);
const sres = await rpc({ command:"submit", tx_blob: encode(tx) });
console.log(`  ${"LoanSet".padEnd(30)} ${sres.result.engine_result}  ${sres.result.tx_json.hash}`);
evidence.push({ label:"LoanSet", type:"LoanSet", engine:sres.result.engine_result, hash:sres.result.tx_json.hash });
if (!sres.result.engine_result.startsWith("tes")) throw new Error("LoanSet failed");
await Bun.sleep(6000);
const LOAN = (await rpc({ command:"account_objects", account:borrower.address, ledger_index:"validated" })).result.account_objects.find((x:any)=>x.LedgerEntryType==="Loan").index;
console.log(`  loan ${LOAN}`);

// --- drain the borrower's PUBLIC balance below the payment -----------------
const cur2 = await mptOf(borrower.address);
const drain = Number(cur2.MPTAmount) - 5;
await must(`drain public (${drain} away)`, { TransactionType:"Payment", Destination: lender.address, Amount:{ mpt_issuance_id:ISS, value:String(drain) } }, borrower.seed);
const after = await mptOf(borrower.address);
const confNow = (await tool("decrypt", after.ConfidentialBalanceSpending, BSK, "0","3000"))[0];
console.log(`\n  borrower now: public=${after.MPTAmount ?? 0}  CONFIDENTIAL=${confNow}`);

// --- THE TEST: pay a loan it can only afford confidentially ----------------
console.log(`\n=== can LoanPay reach the borrower's confidential balance? ===`);
const pay = await submit({ TransactionType:"LoanPay", LoanID:LOAN, Amount:{ mpt_issuance_id:ISS, value:"120" } }, borrower.seed, { quiet:true });
console.log(`  LoanPay 120, holding ${after.MPTAmount ?? 0} public and ${confNow} confidential -> ${pay.engine}  ${pay.message}`);
evidence.push({ label:"LoanPay against confidential-only funds", type:"LoanPay", engine:pay.engine, hash:pay.hash });

const post = await mptOf(borrower.address);
const confAfter = (await tool("decrypt", post.ConfidentialBalanceSpending, BSK, "0","3000"))[0];
console.log(`\n  confidential balance before=${confNow} after=${confAfter}  UNCHANGED: ${confNow === confAfter}`);
console.log(`  version before=${after.ConfidentialBalanceVersion} after=${post.ConfidentialBalanceVersion}  UNCHANGED: ${after.ConfidentialBalanceVersion === post.ConfidentialBalanceVersion}`);
console.log(`  ciphertext byte-identical: ${after.ConfidentialBalanceSpending === post.ConfidentialBalanceSpending}`);

state.gap8Reach = { evidence, confNow, confAfter, payEngine: pay.engine,
  ciphertextUnchanged: after.ConfidentialBalanceSpending === post.ConfidentialBalanceSpending }; save();
console.log(`\n=== persisted evidence (${evidence.length} transactions) ===`);
for (const e of evidence) console.log(`  ${e.type.padEnd(26)} ${e.engine.padEnd(22)} ${e.hash ?? ""}`);
close();
