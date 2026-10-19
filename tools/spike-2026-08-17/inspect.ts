/** Read back what a full-ledger observer sees on the holder's MPToken. */
import { connect, rpc, close, state, tool, accountIdHex } from "./convert.ts";

await connect();
const who = process.argv[2] ?? "holder";
const acct = state[who].address;
const objs = await rpc({ command: "account_objects", account: acct, ledger_index: "validated" });
for (const o of objs.result.account_objects) {
  console.log(`--- ${o.LedgerEntryType} ---`);
  for (const [k, v] of Object.entries(o)) {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`  ${k.padEnd(30)} ${s}${typeof v === "string" && /^[0-9A-F]+$/.test(v) ? `  (${v.length / 2} B)` : ""}`);
  }
}
const iss = await rpc({ command: "ledger_entry", mpt_issuance: state.issuanceId, ledger_index: "validated" });
console.log(`--- MPTokenIssuance ---`);
for (const [k, v] of Object.entries(iss.result.node ?? {})) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  console.log(`  ${k.padEnd(30)} ${s}`);
}

// F-1: recompute canonical EncZero from public inputs and compare
const mpt = objs.result.account_objects.find((o: any) => o.LedgerEntryType === "MPToken");
if (mpt?.HolderEncryptionKey) {
  const [enc0] = await tool("enczero", mpt.HolderEncryptionKey, accountIdHex(acct), state.issuanceId);
  console.log(`\nF-1 canonical EncZero (recomputed by an observer):`);
  console.log(`  ${enc0}`);
  for (const f of ["ConfidentialBalanceSpending", "ConfidentialBalanceInbox"]) {
    if (mpt[f]) console.log(`  ${f.padEnd(28)} ${mpt[f] === enc0 ? "== EncZero  (publicly known to be ZERO)" : "!= EncZero"}`);
  }
}
close();
