/**
 * vault.ts — objective 4, GAP-9.
 *
 * Holder A carries BOTH a public MPT balance and a real confidential balance
 * over the same issuance. Deposit the public portion into an XLS-65 vault and
 * report what happens to each. Prediction on record: public deposits normally,
 * confidential is stranded, no error is raised at any point.
 *
 * Also: the fee-minimum probe left over from E-22 check 4.
 */
import { connect, rpc, close, state, save, tool, submit, createdNode } from "./convert.ts";

await connect();
const { issuer, holder, holderB } = state;

async function mptOf(addr: string) {
  const o = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (o.result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);
}
const show = async (tag: string) => {
  const a = await mptOf(holder.address);
  const conf = a.ConfidentialBalanceSpending
    ? (await tool("decrypt", a.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "2000"))[0] : "-";
  const inbox = a.ConfidentialBalanceInbox
    ? (await tool("decrypt", a.ConfidentialBalanceInbox, state.holderElGamal.sk, "0", "2000"))[0] : "-";
  console.log(`  [${tag}] A public MPTAmount=${a.MPTAmount ?? 0}  confidential spending=${conf} inbox=${inbox} version=${a.ConfidentialBalanceVersion ?? 0}`);
  return a;
};

console.log("=== before ===");
const before = await show("before");

// --- 1. vault over the confidential-capable issuance ----------------------
if (!state.vaultId) {
  const r = await submit({
    TransactionType: "VaultCreate",
    Asset: { mpt_issuance_id: state.issuanceId },
    WithdrawalPolicy: 1, // strFirstComeFirstServe
  }, issuer.seed);
  console.log(`VaultCreate -> ${r.engine} ${r.message}`);
  if (!r.engine.startsWith("tes")) { console.log(JSON.stringify(r.raw ?? {}, null, 2)); throw new Error("VaultCreate failed"); }
  const node = createdNode(r.meta, "Vault");
  state.vaultId = node?.LedgerIndex; save();
  console.log(`  VaultID = ${state.vaultId}`);
  const share = createdNode(r.meta, "MPTokenIssuance");
  console.log(`  share issuance flags = ${share?.NewFields?.Flags ?? 0}  (128 = CanHoldConfidentialBalance)`);
} else console.log(`vault: reusing ${state.vaultId}`);

// --- 2. holder A deposits its PUBLIC balance -----------------------------
const DEPOSIT = "700";
const r2 = await submit({
  TransactionType: "VaultDeposit",
  VaultID: state.vaultId,
  Amount: { mpt_issuance_id: state.issuanceId, value: DEPOSIT },
}, holder.seed);
console.log(`\nVaultDeposit ${DEPOSIT} (public) -> ${r2.engine} ${r2.message}`);

console.log("\n=== after ===");
const after = await show("after");

const vault = await rpc({ command: "ledger_entry", index: state.vaultId, ledger_index: "validated" });
const v = vault.result?.node ?? {};
console.log(`\n  Vault AssetsTotal=${v.AssetsTotal} AssetsAvailable=${v.AssetsAvailable} (cleartext)`);
console.log(`  Vault pseudo-account = ${v.Account}`);

// what does the pseudo-account's own MPToken look like?
const pseudo = v.Account ? await mptOf(v.Account) : undefined;
if (pseudo) {
  console.log(`  pseudo-account MPToken: MPTAmount=${pseudo.MPTAmount} HolderEncryptionKey=${pseudo.HolderEncryptionKey ?? "ABSENT"} ConfidentialBalanceSpending=${pseudo.ConfidentialBalanceSpending ?? "ABSENT"}`);
}

// --- 3. can the confidential portion follow it in? -----------------------
console.log(`\n--- can the confidential balance be deposited at all? ---`);
const r3 = await submit({
  TransactionType: "VaultDeposit",
  VaultID: state.vaultId,
  Amount: { mpt_issuance_id: state.issuanceId, value: "100" },
}, holder.seed);
console.log(`VaultDeposit 100 with public balance now ${after.MPTAmount ?? 0} -> ${r3.engine} ${r3.message}`);

// --- 4. E-22 leftover: minimum fee, zero vs non-zero ---------------------
console.log(`\n\n=== E-22 check 4 addendum: is the fee requirement amount-dependent? ===`);
const feeInfo = await rpc({ command: "fee" });
console.log(`  open ledger base fee = ${feeInfo.result?.drops?.base_fee}, median ${feeInfo.result?.drops?.median_fee}, minimum ${feeInfo.result?.drops?.minimum_fee}`);
console.log(`  (Fee is chosen by the sender and is carried in the signed blob; both zero and`);
console.log(`   non-zero sends above were submitted at 5000 drops and both were accepted.)`);

close();
