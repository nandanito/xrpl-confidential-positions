import * as mpt from "@xrplf/mpt-crypto";
import { connect, rpc, close, state, tool } from "/tmp/wconf/convert.ts";
await connect();

// 1. confirm the npm-only Convert is on the ledger
const H = "CA37BC1B95E861F13C374F43B702F7B2C4C5A0DEDD633CB8D253A8A985C916E7";
const tx = await rpc({ command: "tx", transaction: H });
console.log(`npm-only Convert ${H.slice(0,12)}...`);
console.log(`  validated=${tx.result?.validated} result=${(tx.result?.meta ?? tx.result?.metaData)?.TransactionResult} type=${tx.result?.tx_json?.TransactionType ?? tx.result?.TransactionType}`);
console.log(`  account=${tx.result?.tx_json?.Account ?? tx.result?.Account} MPTAmount=${tx.result?.tx_json?.MPTAmount ?? tx.result?.MPTAmount}`);

// 2. decrypt semantics: wrapper fixes range_low = 0, C API does not
const objs = await rpc({ command: "account_objects", account: state.holder.address, ledger_index: "validated", type: "mptoken" });
const m = (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
const sk = state.holderElGamal.sk;
console.log(`\nholder A spending balance ciphertext, true value 150`);
for (const hi of [1000n, 100000n, 1000000n]) {
  const t = performance.now();
  const v = await mpt.decryptAmount(m.ConfidentialBalanceSpending, sk, hi);
  console.log(`  npm decryptAmount(rangeHigh=${hi}) -> ${v}   ${(performance.now()-t).toFixed(1)} ms`);
}
const t = performance.now();
const nativeTight = await tool("decrypt", m.ConfidentialBalanceSpending, sk, "149", "151");
console.log(`  native, tight window [149,151]        -> ${nativeTight[0]}   ${(performance.now()-t).toFixed(1)} ms (incl. process spawn)`);
console.log(`\n  the wrapper's signature is decryptAmount(ct, priv, rangeHigh); range_low is fixed at 0 internally.`);
close();
