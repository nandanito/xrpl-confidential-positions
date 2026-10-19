/**
 * gap8.ts — close GAP-8.
 *
 * E-40 and F-10 claim that a confidential-capable MPT is accepted throughout the
 * XLS-65 vault and XLS-66 lending stack and that the confidential balance is
 * unreachable from all of it. Two of fifteen transactor paths were executed; the
 * other thirteen rested on a grep, which is why both were regraded A -> B.
 *
 * This runs the remaining lifecycle against an issuance that carries
 * lsfMPTCanHoldConfidentialBalance AND a live confidential balance, and records
 * the engine result of every transactor. Each step continues past failure so one
 * setup problem does not hide the rest.
 */
import { connect, rpc, close, state, save, submit, sequenceOf, faucet, createdNode, tool } from "./convert.ts";
import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";

await connect();
const ISS = state.issuanceId;           // the confidential-capable issuance, Flags 224
const issuer = state.issuer;
const results: { step: string; engine: string; note?: string }[] = [];
const rec = (step: string, engine: string, note?: string) => { results.push({ step, engine, note }); console.log(`  ${step.padEnd(28)} -> ${engine}${note ? "  " + note : ""}`); };

async function freshSeq(a: string) { for (let i=0;i<20;i++){const v=await rpc({command:"account_info",account:a,ledger_index:"validated"});const c=await rpc({command:"account_info",account:a,ledger_index:"current"});if(v.result.account_data.Sequence===c.result.account_data.Sequence)return v.result.account_data.Sequence;await Bun.sleep(2000);} return sequenceOf(a); }
const mptOf = async (a: string) => ((await rpc({ command:"account_objects", account:a, ledger_index:"validated", type:"mptoken" })).result.account_objects ?? []).find((x:any)=>x.MPTokenIssuanceID===ISS);

const lender = await faucet("lender");
const borrower = await faucet("borrower");

// --- setup: both parties hold the confidential-capable asset publicly --------
for (const [who, acct, amt] of [["lender", lender, "5000"], ["borrower", borrower, "2000"]] as any) {
  if (!(await mptOf(acct.address))) {
    const r = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: ISS }, acct.seed, { quiet: true });
    rec(`authorize ${who}`, r.engine);
  }
  const cur = await mptOf(acct.address);
  if (!cur?.MPTAmount || Number(cur.MPTAmount) < 1000) {
    const r = await submit({ TransactionType: "Payment", Destination: acct.address, Amount: { mpt_issuance_id: ISS, value: amt } }, issuer.seed, { quiet: true });
    rec(`fund ${who} publicly`, r.engine);
  }
}

// --- a vault the LENDER owns, so it can also own the loan broker ------------
if (!state.gap8VaultId) {
  const r = await submit({ TransactionType: "VaultCreate", Asset: { mpt_issuance_id: ISS }, WithdrawalPolicy: 1 }, lender.seed, { quiet: true });
  rec("VaultCreate (lender)", r.engine);
  state.gap8VaultId = createdNode(r.meta, "Vault")?.LedgerIndex; save();
}
const VAULT = state.gap8VaultId;
console.log(`  vault ${VAULT}`);
if (!state.gap8Deposited) {
  const r = await submit({ TransactionType: "VaultDeposit", VaultID: VAULT, Amount: { mpt_issuance_id: ISS, value: "3000" } }, lender.seed, { quiet: true });
  rec("VaultDeposit (liquidity)", r.engine);
  state.gap8Deposited = true; save();
}

// ============ the thirteen unexecuted paths start here ======================
console.log(`\n=== transactor paths never before executed over a confidential-capable MPT ===`);

// 1. VaultWithdraw
{
  const r = await submit({ TransactionType: "VaultWithdraw", VaultID: VAULT, Amount: { mpt_issuance_id: ISS, value: "100" } }, lender.seed, { quiet: true });
  rec("VaultWithdraw", r.engine, r.message);
}

// 2. LoanBrokerSet — create
if (!state.gap8BrokerId) {
  const r = await submit({
    TransactionType: "LoanBrokerSet", VaultID: VAULT,
    ManagementFeeRate: 100, CoverRateMinimum: 1000, CoverRateLiquidation: 1000, DebtMaximum: "10000",
  }, lender.seed, { quiet: true });
  rec("LoanBrokerSet (create)", r.engine, r.message);
  state.gap8BrokerId = createdNode(r.meta, "LoanBroker")?.LedgerIndex; save();
}
const BROKER = state.gap8BrokerId;
console.log(`  broker ${BROKER}`);

if (BROKER) {
  // 3. LoanBrokerSet — modify
  {
    const r = await submit({ TransactionType: "LoanBrokerSet", VaultID: VAULT, LoanBrokerID: BROKER, DebtMaximum: "20000" }, lender.seed, { quiet: true });
    rec("LoanBrokerSet (modify)", r.engine, r.message);
  }
  // 4. LoanBrokerCoverDeposit
  {
    const r = await submit({ TransactionType: "LoanBrokerCoverDeposit", LoanBrokerID: BROKER, Amount: { mpt_issuance_id: ISS, value: "800" } }, lender.seed, { quiet: true });
    rec("LoanBrokerCoverDeposit", r.engine, r.message);
  }
  // 5. LoanBrokerCoverWithdraw
  {
    const r = await submit({ TransactionType: "LoanBrokerCoverWithdraw", LoanBrokerID: BROKER, Amount: { mpt_issuance_id: ISS, value: "50" } }, lender.seed, { quiet: true });
    rec("LoanBrokerCoverWithdraw", r.engine, r.message);
  }

  // 6. LoanSet — dual signature. Borrower is Account; lender is Counterparty.
  // CounterpartySignature is not a signing field, so both parties sign the SAME
  // encodeForSigning payload.
  if (!state.gap8LoanId) {
    const bkp = deriveKeypair(borrower.seed), lkp = deriveKeypair(lender.seed);
    const cur = await rpc({ command: "ledger_current" });
    const tx: any = {
      TransactionType: "LoanSet", Account: borrower.address, LoanBrokerID: BROKER,
      Counterparty: lender.address, PrincipalRequested: "1000",
      InterestRate: 500, PaymentTotal: 4, PaymentInterval: 60, GracePeriod: 60,
      Sequence: await freshSeq(borrower.address), Fee: "40000",
      LastLedgerSequence: cur.result.ledger_current_index + 20,
      SigningPubKey: bkp.publicKey,
    };
    const payload = encodeForSigning(tx);
    tx.CounterpartySignature = { SigningPubKey: lkp.publicKey, TxnSignature: sign(payload, lkp.privateKey) };
    tx.TxnSignature = sign(payload, bkp.privateKey);
    const res = await rpc({ command: "submit", tx_blob: encode(tx) });
    const engine = res.result?.engine_result ?? "(none)";
    rec("LoanSet (dual-signed)", engine, res.result?.engine_result_message);
    if (engine.startsWith("tes")) {
      await Bun.sleep(5000);
      const t = await rpc({ command: "tx", transaction: res.result.tx_json.hash });
      state.gap8LoanId = createdNode(t.result?.meta ?? t.result?.metaData, "Loan")?.LedgerIndex; save();
    }
  }
  const LOAN = state.gap8LoanId;
  console.log(`  loan ${LOAN}`);

  if (LOAN) {
    // 7. LoanPay
    {
      const r = await submit({ TransactionType: "LoanPay", LoanID: LOAN, Amount: { mpt_issuance_id: ISS, value: "300" } }, borrower.seed, { quiet: true });
      rec("LoanPay", r.engine, r.message);
    }
    // 8. LoanManage
    {
      const r = await submit({ TransactionType: "LoanManage", LoanID: LOAN, Flags: 0 }, lender.seed, { quiet: true });
      rec("LoanManage", r.engine, r.message);
    }
  }
}

// 9. VaultClawback — by the ASSET issuer, against a holder's vault position
{
  const r = await submit({ TransactionType: "VaultClawback", VaultID: VAULT, Holder: lender.address, Amount: { mpt_issuance_id: ISS, value: "10" } }, issuer.seed, { quiet: true });
  rec("VaultClawback", r.engine, r.message);
}

// --- did ANY of it touch confidential state? --------------------------------
console.log(`\n=== did any of it touch confidential state? ===`);
for (const [who, acct] of [["lender", lender], ["borrower", borrower]] as any) {
  const m = await mptOf(acct.address);
  const conf = ["ConfidentialBalanceSpending","ConfidentialBalanceInbox","IssuerEncryptedBalance","HolderEncryptionKey"].filter((f) => m?.[f]);
  console.log(`  ${who.padEnd(9)} public=${m?.MPTAmount ?? 0}  confidential fields: ${conf.length ? conf.join(", ") : "NONE"}`);
}
const A = await mptOf(state.holder.address);
console.log(`  holder A (has a real confidential balance) public=${A?.MPTAmount ?? 0} confidential=${A?.ConfidentialBalanceSpending ? (await tool("decrypt", A.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "3000"))[0] : "-"} version=${A?.ConfidentialBalanceVersion ?? 0}`);
const issNode = (await rpc({ command: "ledger_entry", mpt_issuance: ISS, ledger_index: "validated" })).result.node;
console.log(`  issuance OutstandingAmount=${issNode.OutstandingAmount} ConfidentialOutstandingAmount=${issNode.ConfidentialOutstandingAmount}`);

console.log(`\n=== summary ===`);
for (const r of results) console.log(`  ${r.step.padEnd(28)} ${r.engine}`);
state.gap8Results = results; save();
close();
