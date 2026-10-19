/**
 * verify.ts — did the non-zero send actually move value, and what else differs?
 * Also settles the C1-sharing question behind E-4.
 */
import { connect, rpc, close, state, tool, accountIdHex, submit, sequenceOf } from "./convert.ts";
import { encode } from "ripple-binary-codec";

await connect();
const { issuer, holder, holderB } = state;

async function mptOf(addr: string) {
  const o = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (o.result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);
}

const a = await mptOf(holder.address);
const b = await mptOf(holderB.address);

console.log("=== did value actually move? ===");
console.log(`A spending  -> ${(await tool("decrypt", a.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "2000"))[0]}  (expect 150 = 250 - 100)`);
console.log(`A inbox     -> ${(await tool("decrypt", a.ConfidentialBalanceInbox, state.holderElGamal.sk, "0", "2000"))[0]}`);
console.log(`B inbox     -> ${(await tool("decrypt", b.ConfidentialBalanceInbox, state.holderBElGamal.sk, "0", "2000"))[0]}  (expect 100)`);
console.log(`B spending  -> ${(await tool("decrypt", b.ConfidentialBalanceSpending, state.holderBElGamal.sk, "0", "2000"))[0]}`);
console.log(`\nissuer mirror of A -> ${(await tool("decrypt", a.IssuerEncryptedBalance, state.issuerElGamal.sk, "0", "2000"))[0]}  (issuer-view tool: what the issuer sees)`);
console.log(`issuer mirror of B -> ${(await tool("decrypt", b.IssuerEncryptedBalance, state.issuerElGamal.sk, "0", "2000"))[0]}`);
console.log(`A version = ${a.ConfidentialBalanceVersion}, B version = ${b.ConfidentialBalanceVersion ?? 0}`);

console.log("\n=== E-4: is C1 shared across the three ciphertexts on the wire? ===");
for (const r of state.sendResults) {
  const c1 = (s: string) => s.slice(0, 66);
  const shared = c1(r.ctA) === c1(r.ctB) && c1(r.ctB) === c1(r.ctI);
  console.log(`  ${r.label.padEnd(16)} C1 identical across Sender/Dest/Issuer: ${shared}`);
  console.log(`      C1 = ${c1(r.ctA)}`);
  console.log(`      C2 sender/dest/issuer differ: ${new Set([r.ctA.slice(66), r.ctB.slice(66), r.ctI.slice(66)]).size === 3}`);
}
const payload = 3 * 66 + 33 + 33 + 946;
console.log(`\n  on-wire confidential payload, no auditor = 3x66 + 33 + 33 + 946 = ${payload} B`);
console.log(`  with an auditor (+1 ciphertext)          = ${payload + 66} B`);
console.log(`  if C1 were transmitted once (paper Tbl 2)= ${payload - 2 * 33} B  / with auditor ${payload + 66 - 3 * 33} B`);

console.log("\n=== metadata size, zero vs non-zero ===");
for (const r of state.sendResults) {
  const tx = await rpc({ command: "tx", transaction: r.hash, binary: true });
  const metaHex = tx.result?.meta ?? tx.result?.meta_blob;
  console.log(`  ${r.label.padEnd(16)} tx blob ${(tx.result.tx_blob ?? tx.result.tx).length / 2} B   metadata ${metaHex ? metaHex.length / 2 : "?"} B`);
}

close();
