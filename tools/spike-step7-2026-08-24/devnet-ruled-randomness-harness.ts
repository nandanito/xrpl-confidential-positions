/**
 * devnet-ruled-randomness-harness.ts — `CLAIMS.md` E-76, executed.
 *
 * The transaction-building harnesses under `tools/spike-2026-08-17/` were
 * migrated on 2026-08-24 from `mptool blinding` — upstream's
 * `mpt_generate_blinding_factor` — to the **ruled** derivation in
 * `tools/wconf-randomness.ts`. ⚠ **`bun build` says the code BUNDLES, which is
 * weaker than it sounds and weaker than this comment used to claim.** It does
 * not say the scalars are usable; it does not catch a mis-ordered `const`,
 * which is a temporal-dead-zone error appearing only at run time; and it does
 * not even catch a **missing import**, because an undefined identifier bundles
 * as a runtime global. Two round-two migrations had no import at all and
 * `bun build` reported success on both (`CLAIMS.md` E-145).
 *
 * So this builds one real `ConfidentialMPTSend` **exactly the way a migrated
 * harness now does** — context hash, then `deriveRandomness`, then encrypt,
 * commit, prove — and submits it.
 *
 * ⚠ **What this establishes, and where it stops.** It shows that a scalar from
 * the ruled derivation produces a proof rippled accepts. It says nothing about
 * whether the derivation is *correct* — that is what the nine published vectors
 * are for, and `tools/wconf-randomness.ts` refuses to derive anything until it
 * has reproduced all nine.
 *
 * ⚠ **Throwaway spike code. Devnet only.**
 *
 *   bun tools/spike-step7-2026-08-24/devnet-ruled-randomness-harness.ts
 */
import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "../spike-2026-08-17/convert.ts";
import { deriveRandomness, assertConstruction } from "../wconf-randomness.ts";

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

// Fail here rather than three RPC calls later if the construction has drifted.
assertConstruction();
console.log("wconf-randomness: nine published vectors reproduced before anything was derived");

await connect();
const holder = state.holder, holderB = state.holderB, ISS = state.issuanceId;
if (!holder || !holderB || !ISS) die("state.json is missing the 2026-08-17 setup");

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === ISS);
}

const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, PK_I = state.issuerElGamal.pk;

const cur = await mptOf(holder.address);
if (!cur?.ConfidentialBalanceSpending) die(`${holder.address} has no ConfidentialBalanceSpending`);
const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "3000"))[0]);
const version = cur.ConfidentialBalanceVersion ?? 0;
const seq = await sequenceOf(holder.address);
console.log(`sender ${holder.address}: confidential balance ${balance}, version ${version}, sequence ${seq}`);

// ⚠ Read from the ledger rather than assumed, because a hard-coded amount that
// has drifted above the balance fails as "send proof generation failed" — which
// is what `send.ts` does today, and it reads as a migration defect when it is
// not one.
const AMOUNT = Math.min(3, balance);
if (AMOUNT < 1) die(`balance ${balance} leaves nothing to send`);

// --- the migrated shape, in order ------------------------------------------
const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), ISS, String(seq), accountIdHex(holderB.address), String(version));
const { r: r32, rho } = deriveRandomness({
  txKind: "ConfidentialMPTSend",
  accountIdHex: accountIdHex(holder.address),
  issuanceIdHex: ISS,
  contextHashHex: ctxh,
});
console.log(`r   = ${r32}`);
console.log(`rho = ${rho}`);
if (r32 === rho) die("r and rho are equal — the role separation is not working");

const [ctA] = await tool("encrypt", String(AMOUNT), PK_A, r32);
const [ctB] = await tool("encrypt", String(AMOUNT), PK_B, r32);
const [ctI] = await tool("encrypt", String(AMOUNT), PK_I, r32);
const [pcM] = await tool("pedersen", String(AMOUNT), r32);
const [pcB] = await tool("pedersen", String(balance), rho);
const [proof] = await tool("send-proof", SK_A, PK_A, String(AMOUNT), r32, ctxh, pcM,
  pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3", PK_A, ctA, PK_B, ctB, PK_I, ctI);

// `C1 = r*G` is the first 33 bytes of every ciphertext, and all three must
// share it — REVIEW-010 section 7, and the reason E-63 was recoverable.
const c1 = ctA.slice(0, 66);
if (ctB.slice(0, 66) !== c1 || ctI.slice(0, 66) !== c1) die("the three ciphertexts do not share one C1");
console.log(`C1 (= r*G, public on chain) = ${c1.slice(0, 32)}…  shared by all three ciphertexts`);

const r = await submit({
  TransactionType: "ConfidentialMPTSend",
  Destination: holderB.address,
  MPTokenIssuanceID: ISS,
  SenderEncryptedAmount: ctA,
  DestinationEncryptedAmount: ctB,
  IssuerEncryptedAmount: ctI,
  AmountCommitment: pcM,
  BalanceCommitment: pcB,
  ZKProof: proof,
  Sequence: seq,
  Fee: "5000",
}, holder.seed);

console.log(`\nConfidentialMPTSend of ${AMOUNT} -> ${r.engine}`);
if (!r.engine.startsWith("tes")) die(`rippled rejected a proof over a RULED scalar: ${r.engine}`);

const after = await mptOf(holder.address);
const balanceAfter = Number((await tool("decrypt", after.ConfidentialBalanceSpending, SK_A, "0", "3000"))[0]);
console.log(`balance ${balance} -> ${balanceAfter}  (expected ${balance - AMOUNT})`);
if (balanceAfter !== balance - AMOUNT) die("the balance did not move by the amount sent");

console.log(`\n✓ a scalar from the RULED derivation, drawn the way the migrated harnesses draw it,`);
console.log(`  produced a proof rippled accepted. hash ${r.hash}`);
console.log(`\n⚠ tesSUCCESS is not a confidentiality claim (CLAIMS.md P-4, P-9, P-11).`);
close();
