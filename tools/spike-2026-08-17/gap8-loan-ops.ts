import { connect, rpc, close, state, save, submit, tool } from "./convert.ts";
await connect();
const ISS = state.issuanceId;
for (const who of ["borrower","lender"]) {
  const o = await rpc({ command:"account_objects", account: state[who].address, ledger_index:"validated" });
  const types = (o.result.account_objects ?? []).map((x:any)=>x.LedgerEntryType);
  console.log(`${who}: ${types.join(", ")}`);
  const loan = (o.result.account_objects ?? []).find((x:any)=>x.LedgerEntryType==="Loan");
  if (loan) { state.gap8LoanId = loan.index; save(); console.log(`  Loan ${loan.index}`);
    for (const [k,v] of Object.entries(loan)) if (!["LedgerEntryType","index"].includes(k)) console.log(`    ${k.padEnd(26)} ${v}`); }
}
const LOAN = state.gap8LoanId;
if (LOAN) {
  const r1 = await submit({ TransactionType:"LoanPay", LoanID: LOAN, Amount:{ mpt_issuance_id: ISS, value:"300" } }, state.borrower.seed, { quiet:true });
  console.log(`\nLoanPay      -> ${r1.engine}  ${r1.message}`);
  const r2 = await submit({ TransactionType:"LoanManage", LoanID: LOAN, Flags: 0 }, state.lender.seed, { quiet:true });
  console.log(`LoanManage   -> ${r2.engine}  ${r2.message}`);
  const r3 = await submit({ TransactionType:"LoanBrokerCoverClawback", LoanBrokerID: state.gap8BrokerId, Amount:{ mpt_issuance_id: ISS, value:"10" } }, state.issuer.seed, { quiet:true });
  console.log(`LoanBrokerCoverClawback -> ${r3.engine}  ${r3.message}`);
} else console.log("no Loan object found");
close();
