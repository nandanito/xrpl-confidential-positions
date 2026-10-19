/**
 * audit.ts — independent re-verification of every executed claim.
 *
 * This session repeatedly stated claims that outran their evidence. So: pull
 * every transaction hash and ledger object cited in CLAIMS.md and the session
 * document, query Devnet, and check each one says what we claim it says.
 * Anything that does not match is a defect in the register.
 */
import { connect, rpc, close, state, tool, accountIdHex } from "./convert.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
await connect();
// The repository root, two levels up. This was a hardcoded absolute path under
// one person's home directory until 2026-10-18; `make check-no-secrets` found it.
const ROOT = join(import.meta.dir, "..", "..");
const corpus = ["CLAIMS.md", "docs/task-zero/DEVNET-CONVERT-2026-08-17.md", "docs/reviews/REVIEW-004-REQUEST-2026-08-17.md", "docs/reviews/REVIEW-004c-adjudication-2026-08-17.md"]
  .map((f) => readFileSync(`${ROOT}/${f}`, "utf8")).join("\n");

const hashes = [...new Set(corpus.match(/\b[0-9A-F]{64}\b/g) ?? [])];
console.log(`=== transaction hashes cited in the register and docs: ${hashes.length} ===`);
let okTx = 0, notTx = 0;
for (const h of hashes) {
  const r = await rpc({ command: "tx", transaction: h });
  if (r.result?.validated) {
    const t = r.result.tx_json ?? r.result;
    const res = (r.result.meta ?? r.result.metaData)?.TransactionResult;
    console.log(`  ${h.slice(0,16)}…  ${String(t.TransactionType).padEnd(26)} ${res}`);
    okTx++;
  } else { console.log(`  ${h.slice(0,16)}…  NOT A VALIDATED TRANSACTION (may be a ledger index or ciphertext)`); notTx++; }
}

console.log(`\n=== ledger objects ===`);
for (const [label, id] of [["issuance (n=3)", state.issuanceId], ["issuance (n=4, auditor)", state.issuanceId2], ["vault", state.vaultId]] as any) {
  const q = label.startsWith("vault") ? { command: "ledger_entry", index: id, ledger_index: "validated" } : { command: "ledger_entry", mpt_issuance: id, ledger_index: "validated" };
  const r = await rpc(q);
  const n = r.result?.node;
  console.log(`  ${String(label).padEnd(24)} ${n ? "EXISTS" : "MISSING"}  ${n?.LedgerEntryType ?? ""} ${n?.Flags !== undefined ? `Flags=${n.Flags}` : ""} ${n?.AuditorEncryptionKey ? "hasAuditorKey" : ""} ${n?.AssetsTotal ? `AssetsTotal=${n.AssetsTotal}` : ""}`);
}

console.log(`\n=== re-derive the load-bearing numbers from the ledger, not from notes ===`);
const mptOf = async (a: string, iss: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === iss);

// F-1 / E-49: does a freshly-initialised spending balance still equal canonical EncZero?
const bTok = await mptOf(state.holderB.address, state.issuanceId2);
const [ez] = await tool("enczero", bTok.HolderEncryptionKey, accountIdHex(state.holderB.address), state.issuanceId2);
console.log(`  E-49 F-1: B's spending balance on the auditor issuance == recomputed EncZero: ${bTok.ConfidentialBalanceSpending === ez}`);

// E-52 / E-58: three parties decrypt the same plaintext
const aTok = await mptOf(state.holder.address, state.issuanceId2);
const holderView = (await tool("decrypt", aTok.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "2000"))[0];
const issuerView = (await tool("decrypt", aTok.IssuerEncryptedBalance, state.issuerElGamal.sk, "0", "2000"))[0];
const auditorView = (await tool("decrypt", aTok.AuditorEncryptedBalance, state.auditorElGamal.sk, "0", "2000"))[0];
console.log(`  E-52/E-58: holder=${holderView} issuer=${issuerView} auditor=${auditorView}  all equal: ${holderView === issuerView && issuerView === auditorView}`);

// E-50: is the confidential balance on the vaulted issuance still spendable-looking?
const vTok = await mptOf(state.holder.address, state.issuanceId);
console.log(`  E-50: on the vaulted issuance A holds public=${vTok.MPTAmount ?? 0} confidential=${(await tool("decrypt", vTok.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "3000"))[0]}`);

console.log(`\n${okTx} validated transactions confirmed, ${notTx} identifiers were not transactions.`);
close();
