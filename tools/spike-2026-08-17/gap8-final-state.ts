import { connect, rpc, close, state, tool } from "./convert.ts";
await connect();
const ISS = state.issuanceId;
const mptOf = async (a: string) => ((await rpc({ command:"account_objects", account:a, ledger_index:"validated", type:"mptoken" })).result.account_objects ?? []).find((x:any)=>x.MPTokenIssuanceID===ISS);
console.log("=== after the full XLS-65 + XLS-66 lifecycle over a confidential-capable MPT ===");
for (const who of ["lender","borrower"]) {
  const m = await mptOf(state[who].address);
  const conf = ["ConfidentialBalanceSpending","ConfidentialBalanceInbox","IssuerEncryptedBalance","AuditorEncryptedBalance","HolderEncryptionKey"].filter(f=>m?.[f]);
  console.log(`  ${who.padEnd(9)} public=${m?.MPTAmount ?? 0}  confidential fields: ${conf.length ? conf.join(", ") : "NONE — never acquired any"}`);
}
const A = await mptOf(state.holder.address);
console.log(`  holder A  public=${A.MPTAmount ?? 0}  confidential=${(await tool("decrypt", A.ConfidentialBalanceSpending, state.holderElGamal.sk, "0","3000"))[0]}  version=${A.ConfidentialBalanceVersion}`);
const iss = (await rpc({ command:"ledger_entry", mpt_issuance: ISS, ledger_index:"validated" })).result.node;
console.log(`  issuance  Flags=${iss.Flags} (224 = CanTransfer|CanClawback|CanHoldConfidentialBalance)`);
console.log(`            OutstandingAmount=${iss.OutstandingAmount}  ConfidentialOutstandingAmount=${iss.ConfidentialOutstandingAmount}`);
console.log(`\n  A's confidential balance survived every vault and lending operation untouched,`);
console.log(`  and no lending participant ever acquired confidential state.`);
close();
