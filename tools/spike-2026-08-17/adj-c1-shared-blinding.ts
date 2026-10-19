/**
 * Adjudicate REVIEW-004b HIGH-03 / packet Q3.
 *
 * Is C1-sharing a protocol property, or an artifact of this harness passing a
 * single tx_blinding_factor? Build a ConfidentialMPTSend whose destination
 * ciphertext uses a DIFFERENT blinding factor, so the three C1 values differ,
 * and see what rippled says. Report the exact engine code: a tem* means a
 * structural preflight check, a tec* means proof verification caught it.
 */
import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { deriveRandomness, deriveR } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command: "account_objects", account: a, ledger_index: "validated", type: "mptoken" })).result.account_objects ?? []).find((x: any) => x.MPTokenIssuanceID === state.issuanceId);

const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk;

async function attempt(label: string, mutate: (r: string, alt: string) => { ctB?: string; ctI?: string }) {
  const cur = await mptOf(holder.address);
  const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "2000"))[0]);
  const version = cur.ConfidentialBalanceVersion ?? 0;
  const seq = await sequenceOf(holder.address);
  const AMOUNT = 10;

  // ⚠ **`r`, `rho` AND `alt` all come from the RULED derivation** — `CLAIMS.md`
  // E-76, and E-143 for why this file stopped being exempt.
  //
  // ~~"Deliberately, and must keep doing so."~~ **Struck 2026-08-25.** This
  // harness needs `alt` to be **unequal** to the transaction's `r`, not
  // **unruled** — and the ruled derivation draws fresh entropy per call, so a
  // second call gives a second scalar and the mismatched `C1` is unchanged.
  //
  // ⚠ **This harness SUBMITS.** Its `r` is published in `C1 = r*G` forever, so
  // the project's own principle — *migrate what publishes* — always applied.
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
  const over = mutate(r32, alt);
  // Prove against the CONSISTENT ciphertexts, then swap at submit time. This is
  // what a client attempting independent randomness would have to do, because
  // mpt_get_confidential_send_proof refuses to prove inconsistent ones at all.
  const ctB = ctB0, ctI = ctI0;
  const subB = over.ctB === "alt" ? ctBalt : ctB0;
  const subI = over.ctI === "alt" ? ctIalt : ctI0;

  const [pcM] = await tool("pedersen", String(AMOUNT), r32);
  const [pcB] = await tool("pedersen", String(balance), rho);
  // proof generated with the ORIGINAL r32, matching ctA
  const [proof] = await tool("send-proof", SK_A, PK_A, String(AMOUNT), r32, ctxh, pcM, pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI);

  const c1 = (s: string) => s.slice(0, 66);
  console.log(`\n=== ${label} ===`);
  console.log(`  submitted C1: sender=${c1(ctA).slice(0,20)}... dest=${c1(subB).slice(0,20)}... issuer=${c1(subI).slice(0,20)}...`);
  console.log(`  all three C1 equal on the wire: ${c1(ctA) === c1(subB) && c1(subB) === c1(subI)}`);
  const localVerify = (await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI))[0];
  console.log(`  local mpt_verify_send_proof: ${localVerify}`);

  const r = await submit({
    TransactionType: "ConfidentialMPTSend", Destination: holderB.address,
    MPTokenIssuanceID: state.issuanceId, SenderEncryptedAmount: ctA,
    DestinationEncryptedAmount: subB, IssuerEncryptedAmount: subI,
    AmountCommitment: pcM, BalanceCommitment: pcB, ZKProof: proof, Sequence: seq, Fee: "5000",
  }, holder.seed, { quiet: true });
  console.log(`  >>> ledger: ${r.engine}  ${r.message}`);
  return r.engine;
}

const control = await attempt("CONTROL — all three share C1 (as every earlier Send did)", () => ({}));
const destAlt = await attempt("DEST ciphertext uses INDEPENDENT randomness", () => ({ ctB: "alt" }));
const bothAlt = await attempt("DEST and ISSUER both independent", () => ({ ctB: "alt", ctI: "alt" }));

console.log(`\n--- adjudication result ---`);
console.log(`  shared-C1 control : ${control}`);
console.log(`  independent dest  : ${destAlt}`);
console.log(`  independent both  : ${bothAlt}`);
close();
