import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { decode } from "ripple-binary-codec";
import { deriveRandomness } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);

// --- why 1219 vs 1225? compare the destination MPToken fields in metadata ---
const txs = await rpc({ command: "account_tx", account: holder.address, limit: 40, ledger_index_min: -1, ledger_index_max: -1 });
const sends = (txs.result.transactions ?? []).filter((t: any) => (t.tx_json ?? t.tx)?.TransactionType === "ConfidentialMPTSend");
const seen = new Map<number, any>();
for (const t of sends) {
  const meta = t.meta ?? t.metaData;
  const bin = await rpc({ command: "tx", transaction: (t.tx_json ?? t.tx).hash ?? t.hash, binary: true });
  const len = (bin.result?.meta ?? bin.result?.meta_blob ?? "").length / 2;
  if (!seen.has(len)) seen.set(len, { meta, len });
}
console.log(`distinct metadata lengths observed on A's sends: ${[...seen.keys()].sort().join(", ")}`);
for (const [len, v] of [...seen.entries()].sort((a, b) => a[0] - b[0])) {
  const destNode = (v.meta.AffectedNodes ?? []).map((n: any) => n.ModifiedNode).find((n: any) => n?.LedgerEntryType === "MPToken" && n.FinalFields?.Account === holderB.address);
  console.log(`  ${len} B: destination MPToken FinalFields = [${Object.keys(destNode?.FinalFields ?? {}).sort().join(", ")}]`);
}

// --- fee: measure the confidential multiplier instead of assuming it ---
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk, PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk;
async function freshSeq(a: string) { for (let i=0;i<20;i++){const v=await rpc({command:"account_info",account:a,ledger_index:"validated"});const c=await rpc({command:"account_info",account:a,ledger_index:"current"});if(v.result.account_data.Sequence===c.result.account_data.Sequence)return v.result.account_data.Sequence;await Bun.sleep(2000);} return sequenceOf(a); }
async function trySend(fee: string) {
  const cur = await mptOf(holder.address);
  const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "3000"))[0]);
  const seq = await freshSeq(holder.address);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. The
  // context hash is computed FIRST because the derivation binds to it.
  const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), state.issuanceId, String(seq), accountIdHex(holderB.address), String(cur.ConfidentialBalanceVersion ?? 0));
  const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(holder.address), issuanceIdHex: state.issuanceId, contextHashHex: ctxh });
  const [ctA] = await tool("encrypt","0",PK_A,r32); const [ctB] = await tool("encrypt","0",PK_B,r32); const [ctI] = await tool("encrypt","0",PK_I,r32);
  const [pcM] = await tool("pedersen","0",r32); const [pcB] = await tool("pedersen",String(balance),rho);
  const [proof] = await tool("send-proof", SK_A, PK_A, "0", r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI);
  const r = await submit({ TransactionType:"ConfidentialMPTSend", Destination:holderB.address, MPTokenIssuanceID:state.issuanceId,
    SenderEncryptedAmount:ctA, DestinationEncryptedAmount:ctB, IssuerEncryptedAmount:ctI, AmountCommitment:pcM, BalanceCommitment:pcB,
    ZKProof:proof, Sequence:seq, Fee:fee }, holder.seed, { quiet:true });
  return r.engine;
}
const f = await rpc({ command:"fee" });
console.log(`\nfee RPC: base_fee=${f.result.drops.base_fee} open_ledger_fee=${f.result.drops.open_ledger_fee}`);
for (const fee of ["1","5","9","10"]) console.log(`  ConfidentialMPTSend @ ${fee.padStart(3)} drops -> ${await trySend(fee)}`);
const acct = await submit({ TransactionType:"AccountSet", Fee:"1" }, holder.seed, { quiet:true });
console.log(`  AccountSet (standard) @   1 drop  -> ${acct.engine}`);
close();
