/**
 * Adjudicate REVIEW-004b HIGH-01 / REVIEW-004a finding 1 / packet Q1.
 *
 * The original E-22 run compared a non-zero send proved at balance 250 against
 * zero sends proved at 150, with n=1 on the control and the fee dimension
 * argued rather than measured. This rerun fixes all three:
 *
 *   - ZERO SENDS GO FIRST. A zero send does not move the balance, so ordering
 *     the non-zero sends last makes every sample prove against the SAME balance.
 *   - n=2 on each arm, with the balance restored between the two non-zero sends.
 *   - the fee threshold is probed rather than assumed.
 *
 * Version still differs between any two consecutive transactions and cannot be
 * controlled away. It is public anyway.
 */
import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { deriveRandomness } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, SK_B = state.holderBElGamal.sk, PK_I = state.issuerElGamal.pk;

async function freshSeq(addr: string) {
  for (let i = 0; i < 20; i++) {
    const v = await rpc({ command: "account_info", account: addr, ledger_index: "validated" });
    const c = await rpc({ command: "account_info", account: addr, ledger_index: "current" });
    if (v.result.account_data.Sequence === c.result.account_data.Sequence) return v.result.account_data.Sequence;
    await Bun.sleep(2000);
  }
  return sequenceOf(addr);
}

async function send(from: any, fromSk: string, fromPk: string, to: any, toPk: string, amount: number, fee: string, label: string) {
  const cur = await mptOf(from.address);
  const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, fromSk, "0", "3000"))[0]);
  const version = cur.ConfidentialBalanceVersion ?? 0;
  const seq = await freshSeq(from.address);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. The
  // context hash is computed FIRST because the derivation binds to it.
  const [ctxh] = await tool("send-ctx", accountIdHex(from.address), state.issuanceId, String(seq), accountIdHex(to.address), String(version));
  const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(from.address), issuanceIdHex: state.issuanceId, contextHashHex: ctxh });
  const [ctA] = await tool("encrypt", String(amount), fromPk, r32);
  const [ctB] = await tool("encrypt", String(amount), toPk, r32);
  const [ctI] = await tool("encrypt", String(amount), PK_I, r32);
  const [pcM] = await tool("pedersen", String(amount), r32);
  const [pcB] = await tool("pedersen", String(balance), rho);
  const [proof] = await tool("send-proof", fromSk, fromPk, String(amount), r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", fromPk, ctA, toPk, ctB, PK_I, ctI);
  const r = await submit({
    TransactionType: "ConfidentialMPTSend", Destination: to.address,
    MPTokenIssuanceID: state.issuanceId, SenderEncryptedAmount: ctA,
    DestinationEncryptedAmount: ctB, IssuerEncryptedAmount: ctI,
    AmountCommitment: pcM, BalanceCommitment: pcB, ZKProof: proof, Sequence: seq, Fee: fee,
  }, from.seed, { quiet: true });
  let metaLen = "-";
  if (r.hash && r.engine.startsWith("tes")) {
    const t = await rpc({ command: "tx", transaction: r.hash, binary: true });
    metaLen = String((t.result?.meta ?? t.result?.meta_blob ?? "").length / 2);
  }
  const after = await mptOf(from.address);
  const rec = {
    label, amount, fee, balanceAtProving: balance, versionBefore: version,
    engine: r.engine, blobLen: r.blob!.length / 2, proofLen: proof.length / 2,
    metaLen, nodes: r.meta?.AffectedNodes?.length ?? "-",
    versionAfter: after.ConfidentialBalanceVersion ?? 0,
    changed: (r.meta?.AffectedNodes ?? []).map((n: any) => { const k = Object.keys(n)[0]; return `${k}:${n[k].LedgerEntryType}[${Object.keys(n[k].PreviousFields ?? {}).sort().join("|")}]`; }).sort().join("  "),
  };
  console.log(`  ${label.padEnd(22)} amt=${String(amount).padEnd(3)} bal=${balance} ver=${version} fee=${fee} -> ${rec.engine} blob=${rec.blobLen} meta=${metaLen} nodes=${rec.nodes}`);
  return rec;
}

console.log("=== CONTROLLED RERUN: zeros first, so every sample proves at the same balance ===");
const results: any[] = [];
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 0, "5000", "ZERO #1"));
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 0, "5000", "ZERO #2"));
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 10, "5000", "NON-ZERO #1"));

console.log("\n--- restoring A to the same balance so the second control matches ---");
await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, holderB.seed, { quiet: true });
await send(holderB, SK_B, PK_B, holder, PK_A, 10, "5000", "B->A restore");
await submit({ TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: state.issuanceId }, holder.seed, { quiet: true });

results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 10, "5000", "NON-ZERO #2"));

console.log("\n=== FEE PROBE — was check 4's fee dimension a real distinguisher? ===");
const feeInfo = await rpc({ command: "fee" });
console.log(`  open ledger base_fee=${feeInfo.result?.drops?.base_fee} open_ledger_fee=${feeInfo.result?.drops?.open_ledger_fee} minimum=${feeInfo.result?.drops?.minimum_fee}`);
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 0, "100", "ZERO @100 drops"));
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 10, "100", "NON-ZERO @100 drops"));
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 0, "10", "ZERO @10 drops"));
results.push(await send(holder, SK_A, PK_A, holderB, PK_B, 10, "10", "NON-ZERO @10 drops"));

console.log("\n\n=== CONTROLLED COMPARISON ===");
const arms = results.filter((r) => r.label.startsWith("ZERO #") || r.label.startsWith("NON-ZERO #"));
console.log("label                  amt  bal  verBefore verAfter engine       blob  proof meta  nodes");
for (const r of arms) console.log(`${r.label.padEnd(22)} ${String(r.amount).padEnd(4)} ${String(r.balanceAtProving).padEnd(4)} ${String(r.versionBefore).padEnd(9)} ${String(r.versionAfter).padEnd(8)} ${r.engine.padEnd(12)} ${String(r.blobLen).padEnd(5)} ${String(r.proofLen).padEnd(5)} ${String(r.metaLen).padEnd(5)} ${r.nodes}`);
console.log("\nbalance identical across all four arms:", new Set(arms.map((r) => r.balanceAtProving)).size === 1);
console.log("metadata shape identical across all four arms:", new Set(arms.map((r) => r.changed)).size === 1);
console.log("  shape:", arms[0].changed);
console.log("\nfee probe:");
for (const r of results.filter((r) => r.label.includes("@"))) console.log(`  ${r.label.padEnd(22)} -> ${r.engine}`);
state.adjE22 = results; 
close();
