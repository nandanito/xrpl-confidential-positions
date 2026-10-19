/**
 * Q2 from REVIEW-004: is the confidential balance actually "stranded" after the
 * public portion goes into a vault, or merely outside the vault and still
 * spendable? One Send settles it.
 */
import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { deriveRandomness } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);

const cur = await mptOf(holder.address);
const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, state.holderElGamal.sk, "0", "2000"))[0]);
console.log(`A after vault deposit: public MPTAmount=${cur.MPTAmount}, confidential=${balance}, version=${cur.ConfidentialBalanceVersion}`);

const AMOUNT = 50, PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk;
const seq = await sequenceOf(holder.address);
// ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. The
// context hash is computed FIRST because the derivation binds to it.
const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), state.issuanceId, String(seq), accountIdHex(holderB.address), String(cur.ConfidentialBalanceVersion ?? 0));
const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(holder.address), issuanceIdHex: state.issuanceId, contextHashHex: ctxh });
const [ctA] = await tool("encrypt", String(AMOUNT), PK_A, r32);
const [ctB] = await tool("encrypt", String(AMOUNT), PK_B, r32);
const [ctI] = await tool("encrypt", String(AMOUNT), PK_I, r32);
const [pcM] = await tool("pedersen", String(AMOUNT), r32);
const [pcB] = await tool("pedersen", String(balance), rho);
const [proof] = await tool("send-proof", SK_A, PK_A, String(AMOUNT), r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI);

const r = await submit({
  TransactionType: "ConfidentialMPTSend", Destination: holderB.address,
  MPTokenIssuanceID: state.issuanceId, SenderEncryptedAmount: ctA,
  DestinationEncryptedAmount: ctB, IssuerEncryptedAmount: ctI,
  AmountCommitment: pcM, BalanceCommitment: pcB, ZKProof: proof, Sequence: seq,
}, holder.seed);
console.log(`\n>>> post-vault ConfidentialMPTSend of ${AMOUNT}: ${r.engine} ${r.message}`);

const after = await mptOf(holder.address);
const bafter = await mptOf(holderB.address);
console.log(`A confidential now: ${(await tool("decrypt", after.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]} (was ${balance})`);
console.log(`B inbox now:        ${(await tool("decrypt", bafter.ConfidentialBalanceInbox, state.holderBElGamal.sk, "0", "2000"))[0]}`);
console.log(`A public MPTAmount: ${after.MPTAmount} (unchanged by a confidential send)`);
close();
