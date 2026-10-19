import { connect, rpc, close, state, submit, save } from "./convert.ts";
await connect();
const ISS = state.issuanceId, LOAN = state.gap8LoanId, BROKER = state.gap8BrokerId, VAULT = state.gap8VaultId;
const rec: any[] = [];
const go = async (label: string, tx: any, seed: string) => {
  const r = await submit(tx, seed, { quiet: true });
  console.log(`  ${label.padEnd(26)} -> ${r.engine}  ${r.message}`);
  rec.push({ label, engine: r.engine, message: r.message });
  return r;
};

// VaultSet — the one config path not yet run
await go("VaultSet", { TransactionType: "VaultSet", VaultID: VAULT, AssetsMaximum: "999999" }, state.lender.seed);

// teardown, in dependency order: repay -> LoanDelete -> cover out -> LoanBrokerDelete -> assets out -> VaultDelete
const loan = (await rpc({ command: "ledger_entry", index: LOAN, ledger_index: "validated" })).result?.node;
if (loan) {
  console.log(`  loan outstanding: principal=${loan.PrincipalOutstanding} total=${loan.TotalValueOutstanding} paymentsLeft=${loan.PaymentRemaining}`);
  await go("LoanPay (full payoff)", { TransactionType: "LoanPay", LoanID: LOAN, Amount: { mpt_issuance_id: ISS, value: "2000" } }, state.borrower.seed);
}
await go("LoanDelete", { TransactionType: "LoanDelete", LoanID: LOAN }, state.borrower.seed);

const br = (await rpc({ command: "ledger_entry", index: BROKER, ledger_index: "validated" })).result?.node;
if (br) {
  console.log(`  broker: CoverAvailable=${br.CoverAvailable} DebtTotal=${br.DebtTotal}`);
  if (br.CoverAvailable && Number(br.CoverAvailable) > 0)
    await go("LoanBrokerCoverWithdraw all", { TransactionType: "LoanBrokerCoverWithdraw", LoanBrokerID: BROKER, Amount: { mpt_issuance_id: ISS, value: String(br.CoverAvailable) } }, state.lender.seed);
}
await go("LoanBrokerDelete", { TransactionType: "LoanBrokerDelete", LoanBrokerID: BROKER }, state.lender.seed);

const v = (await rpc({ command: "ledger_entry", index: VAULT, ledger_index: "validated" })).result?.node;
if (v) {
  console.log(`  vault: AssetsTotal=${v.AssetsTotal} AssetsAvailable=${v.AssetsAvailable}`);
  if (v.AssetsAvailable && Number(v.AssetsAvailable) > 0)
    await go("VaultWithdraw all", { TransactionType: "VaultWithdraw", VaultID: VAULT, Amount: { mpt_issuance_id: ISS, value: String(v.AssetsAvailable) } }, state.lender.seed);
}
await go("VaultDelete", { TransactionType: "VaultDelete", VaultID: VAULT }, state.lender.seed);

state.gap8Teardown = rec; save();
close();
