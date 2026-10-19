#!/usr/bin/env bun
/**
 * PROVER SIDE. Holds keys. Deliberately reuses the ElGamal encryption
 * randomness `r` across two ConfidentialMPTSends.
 *
 * This is the negative control for issue #3's central claim:
 *
 *   "Repeated r across two Sends: C1 = r*G repeats on chain, so any observer
 *    computes C2,i - C2',i = (m - m')*G and recovers amount DIFFERENCES by the
 *    same bounded DLP search the library already implements. No second proof,
 *    no adversarial effort, no cryptographic work."
 *
 * That claim is currently ASSERTED, not executed. This script and its
 * observer-side counterpart settle it either way — and a refutation would be
 * just as useful, because it would mean rippled or the prover has a defence
 * the issue does not credit.
 *
 * The attack half is a SEPARATE FILE on purpose (`reuse-r-attack.ts`). It takes
 * two transaction hashes and holds no keys. Keeping them apart is what makes
 * "a passive observer needs nothing" a structural property rather than a claim
 * in a comment.
 *
 * Uses the UNPATCHED mptool. This experiment has nothing to do with the sigma
 * nonce patch, and mixing them would muddy both.
 *
 * DEVNET ONLY. convert.ts refuses any network_id but 2.
 */
import {
  connect, rpc, close, state, save, submit, sequenceOf, accountIdHex,
} from "../spike-2026-08-17/convert.ts";
import { writeFileSync } from "fs";
import { deriveR } from "../wconf-randomness.ts";

const MPTOOL = "/tmp/wconf/mptool"; // unmodified, from the 2026-08-17 spike

function tool(...args: string[]): string[] {
  const p = Bun.spawnSync([MPTOOL, ...args]);
  if (p.exitCode !== 0)
    throw new Error(`mptool ${args[0]} failed: ${p.stderr.toString()}`);
  return p.stdout.toString().trim().split("\n");
}

await connect();

const holder = state.holder, holderB = state.holderB;
const ISS = state.issuanceId;
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk;
const PK_I = state.issuerElGamal.pk;

async function mptOf(addr: string) {
  const objs = await rpc({
    command: "account_objects", account: addr,
    ledger_index: "validated", type: "mptoken",
  });
  return (objs.result.account_objects ?? []).find(
    (o: any) => o.MPTokenIssuanceID === ISS,
  );
}

// --- ensure a spendable balance -------------------------------------------
let cur = await mptOf(holder.address);
const encZero = tool("enczero", cur.HolderEncryptionKey, accountIdHex(holder.address), ISS)[0];
if (!cur.ConfidentialBalanceSpending || cur.ConfidentialBalanceSpending === encZero) {
  const m = await submit(
    { TransactionType: "ConfidentialMPTMergeInbox", MPTokenIssuanceID: ISS },
    holder.seed,
  );
  console.log(`MergeInbox -> ${m.engine}`);
  if (!m.engine.startsWith("tes")) throw new Error(`merge failed: ${m.engine}`);
  cur = await mptOf(holder.address);
}

// --- THE REUSED BLINDING FACTOR -------------------------------------------
// One `r`, two transactions. Everything else is generated fresh per send, so
// `r` is the only thing held constant and therefore the only possible cause of
// whatever the observer can do.
// ⚠ **The reused `r` is now a RULED scalar, and the REUSE is the violation.**
// `CLAIMS.md` E-76, and E-143 for why this file stopped being exempt.
//
// ~~"Deriving these correctly would delete the finding this file exists to
// show."~~ **False, and struck 2026-08-25.** What E-63 demonstrates is **one
// `r` used in two transactions**. Where that `r` came from is irrelevant to the
// attack — the observer recovers the difference from the repeated `C1` whatever
// generated it. Deriving it once and reusing it preserves the experiment
// exactly, and it removes the last unruled source from a harness that
// **submits to Devnet twice**.
//
// ⚠ **And the reason offered for the exemption was itself false**: it said the
// harness preserved *"these exact scalars"*. `mpt_generate_blinding_factor`
// draws fresh entropy on every run, so a rerun never reproduced them anyway.
//
// The context of the FIRST send binds this scalar; reusing it in the second is
// precisely the rule violation being demonstrated.
const firstSeq = await sequenceOf(holder.address);
const firstCtx = tool(
  "send-ctx", accountIdHex(holder.address), ISS, String(firstSeq),
  accountIdHex(holderB.address), String(cur.ConfidentialBalanceVersion ?? 0),
)[0];
const R_REUSED = deriveR({
  txKind: "ConfidentialMPTSend",
  accountIdHex: accountIdHex(holder.address),
  issuanceIdHex: ISS,
  contextHashHex: firstCtx,
});
console.log(`\nreusing r across both sends (r is NOT published for Send; only C1 = r*G is)`);
console.log(`  r = ${R_REUSED}`);

const AMOUNTS = [7, 3]; // difference is 4 — that is what the observer should recover
const results: any[] = [];

for (const amount of AMOUNTS) {
  const c = await mptOf(holder.address);
  const balance = Number(tool("decrypt", c.ConfidentialBalanceSpending, SK_A, "0", "5000")[0]);
  const version = c.ConfidentialBalanceVersion ?? 0;
  const seq = await sequenceOf(holder.address);

  // rho IS fresh per send. Only r is reused, so the experiment isolates r.
  // ⚠ Ruled, like everything else here except the deliberate reuse above.
  const rho = deriveR({
    txKind: "ConfidentialMPTSend",
    accountIdHex: accountIdHex(holder.address),
    issuanceIdHex: ISS,
    contextHashHex: tool(
      "send-ctx", accountIdHex(holder.address), ISS, String(seq),
      accountIdHex(holderB.address), String(version),
    )[0],
  });

  const [ctA] = tool("encrypt", String(amount), PK_A, R_REUSED);
  const [ctB] = tool("encrypt", String(amount), PK_B, R_REUSED);
  const [ctI] = tool("encrypt", String(amount), PK_I, R_REUSED);
  const [pcM] = tool("pedersen", String(amount), R_REUSED);
  const [pcB] = tool("pedersen", String(balance), rho);
  const [ctxh] = tool(
    "send-ctx", accountIdHex(holder.address), ISS, String(seq),
    accountIdHex(holderB.address), String(version),
  );
  const [proof] = tool(
    "send-proof", SK_A, PK_A, String(amount), R_REUSED, ctxh, pcM,
    pcB, String(balance), c.ConfidentialBalanceSpending, rho, "3",
    PK_A, ctA, PK_B, ctB, PK_I, ctI,
  );

  console.log(`\nsend ${amount} (balance ${balance}, seq ${seq})`);
  console.log(`  C1 of SenderEncryptedAmount = ${ctA.slice(0, 66)}`);

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
  }, holder.seed);

  console.log(`  engine ${r.engine}  hash ${r.hash ?? "(none)"}`);
  results.push({ amount, balance, engine: r.engine, hash: r.hash ?? null, ctA, ctB, ctI, pcM });

  if (!r.engine.startsWith("tes")) {
    console.log(`\n  >>> REFUTED AT THE PROVER/LEDGER LAYER: ${r.engine} — ${r.message}`);
    console.log(`  >>> That is a RESULT. It means reusing r is rejected before it can be observed.`);
    break;
  }
}

const accepted = results.filter(r => r.engine?.startsWith("tes"));
console.log(`\n${accepted.length}/${AMOUNTS.length} sends accepted with a reused r`);

if (accepted.length === 2) {
  const c1a = accepted[0].ctA.slice(0, 66);
  const c1b = accepted[1].ctA.slice(0, 66);
  console.log(`C1 identical across the two sends: ${c1a === c1b}`);
  console.log(`\nnow run, holding NO keys:`);
  console.log(`  bun tools/spike-randomness-2026-08-18/reuse-r-attack.ts ${accepted[0].hash} ${accepted[1].hash}`);
}

const record = {
  experiment: "issue #3 — repeated ElGamal r across two ConfidentialMPTSends",
  reusedR: R_REUSED,
  expectedDifference: AMOUNTS[0] - AMOUNTS[1],
  results,
};
writeFileSync("/tmp/wconf/reuse-r-result.json", JSON.stringify(record, null, 2));
state.reuseR = record; save();
close();
console.log("\nrecorded to /tmp/wconf/reuse-r-result.json");
