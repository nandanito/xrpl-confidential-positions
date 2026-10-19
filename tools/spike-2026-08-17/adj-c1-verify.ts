import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { deriveRandomness, deriveR } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk;

// wait for the validated ledger to catch up so Sequence is fresh
for (let i = 0; i < 15; i++) {
  const info = await rpc({ command: "account_info", account: holder.address, ledger_index: "validated" });
  const cur2 = await rpc({ command: "account_info", account: holder.address, ledger_index: "current" });
  if (info.result.account_data.Sequence === cur2.result.account_data.Sequence) break;
  await Bun.sleep(2000);
}

const cur = await mptOf(holder.address);
const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]);
const version = cur.ConfidentialBalanceVersion ?? 0;
const seq = await sequenceOf(holder.address);
const AMOUNT = 10;
// ⚠ **`r`, `rho` AND `alt` all come from the RULED derivation** — `CLAIMS.md`
// E-76, and E-143 for why this file stopped being exempt.
//
// ~~"Deriving these correctly would delete the finding this file exists to
// show."~~ **False, and struck 2026-08-25.** What this harness demonstrates is
// an `alt` scalar **unequal to the transaction's `r`**, so the `C1` values
// differ. It needs `alt` to be *different*, not *unruled* — and the ruled
// derivation draws fresh entropy per call, so two calls give two different
// scalars and the demonstration is untouched.
//
// ⚠ **This harness SUBMITS**, so its `r` is published in `C1 = r*G` forever.
// Under this project's own stated principle — *migrate what publishes an `r` to
// a ledger* — it should never have been exempt.
const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), state.issuanceId, String(seq), accountIdHex(holderB.address), String(version));
const CTX = { txKind: "ConfidentialMPTSend" as const, accountIdHex: accountIdHex(holder.address), issuanceIdHex: state.issuanceId, contextHashHex: ctxh };
const { r: r32, rho } = deriveRandomness(CTX);
const alt = deriveR(CTX);   // a SECOND derived scalar — different, and ruled
if (alt === r32) throw new Error("alt must differ from r or this harness demonstrates nothing");
const [ctA] = await tool("encrypt", String(AMOUNT), PK_A, r32);
const [ctB0] = await tool("encrypt", String(AMOUNT), PK_B, r32);
const [ctI0] = await tool("encrypt", String(AMOUNT), PK_I, r32);
const [ctBalt] = await tool("encrypt", String(AMOUNT), PK_B, alt);
const [ctIalt] = await tool("encrypt", String(AMOUNT), PK_I, alt);
const [pcM] = await tool("pedersen", String(AMOUNT), r32);
const [pcB] = await tool("pedersen", String(balance), rho);
const [proof] = await tool("send-proof", SK_A, PK_A, String(AMOUNT), r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", PK_A, ctA, PK_B, ctB0, PK_I, ctI0);

console.log("local mpt_verify_send_proof against what the WIRE would carry:");
console.log(`  consistent ciphertexts      -> ${(await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctB0, PK_I, ctI0))[0]}`);
console.log(`  dest independent            -> ${(await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctBalt, PK_I, ctI0))[0]}`);
console.log(`  dest AND issuer independent -> ${(await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctBalt, PK_I, ctIalt))[0]}`);

const r = await submit({
  TransactionType: "ConfidentialMPTSend", Destination: holderB.address,
  MPTokenIssuanceID: state.issuanceId, SenderEncryptedAmount: ctA,
  DestinationEncryptedAmount: ctBalt, IssuerEncryptedAmount: ctIalt,
  AmountCommitment: pcM, BalanceCommitment: pcB, ZKProof: proof, Sequence: seq, Fee: "5000",
}, holder.seed, { quiet: true });
console.log(`\nledger, dest AND issuer independent: ${r.engine}  ${r.message}`);
close();
