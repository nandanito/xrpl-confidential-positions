/**
 * f23-substituted-key.ts — **execute `CLAIMS.md` F-23.**
 *
 * F-23 was read at source and never run. The chain it asserts:
 *
 *   a Send encrypts the amount to the destination's `HolderEncryptionKey`
 *   READ FROM THE LEDGER  →  rippled verifies against the key IT holds
 *   (`ConfidentialMPTSend.cpp:132`)  →  a mismatch returns `tecBAD_PROOF`
 *   (`ConfidentialTransfer.cpp:451`)  →  `tecBAD_PROOF = 199` is a `tec`
 *   (`TER.h:371`)  →  a `tec` is APPLIED to the ledger
 *   (`Transactor.cpp:1653-1656`)  →  the ciphertext under the substituted key
 *   is published permanently.
 *
 * This script runs it. It builds a Send whose `DestinationEncryptedAmount` is
 * encrypted to an **adversary's** key rather than the destination's, submits
 * it, and then reads the amount back **off the public ledger** using only the
 * adversary's secret and data anyone can fetch.
 *
 * ## What this demonstrates, exactly
 *
 * That **a wrong ledger read costs the amount, not just the transaction.** It
 * does NOT demonstrate a network attack: nothing here compromises a node or a
 * TLS connection. It demonstrates the *consequence* if the value a signer reads
 * for a destination's encryption key is not the value on the ledger — which is
 * why `signer/src/ledger.rs` requires TLS for non-loopback endpoints and why
 * `CLAIMS.md` B-15 asks whether one endpoint is enough.
 *
 * ## ⚠ It deliberately builds a transaction the signer would refuse
 *
 * `signer/` reads the destination's key from the ledger and re-reads it before
 * signing. It cannot produce this transaction. That is the point: this is the
 * harness showing what the signer's check is *for*, so it uses `mptool`
 * directly and never touches the signer.
 *
 * ## ⚠ Devnet only. It costs one transaction fee and one sequence number.
 *
 *   bun tools/spike-step2-2026-08-19/f23-substituted-key.ts [--amount N]
 */
import { connect, rpc, close, state, save, tool, submit, sequenceOf, accountIdHex } from "../spike-2026-08-17/convert.ts";
import { deriveRandomness } from "../wconf-randomness.ts";

const AMOUNT = Number(process.argv.find((a) => a.startsWith("--amount="))?.split("=")[1] ?? 137);
const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

await connect();

const holder = state.holder, holderB = state.holderB;
if (!holder || !holderB || !state.issuanceId) die("state.json has no holder/holderB/issuance. Run convert.ts and send.ts first.");

const ISS = state.issuanceId;
const PK_A = state.holderElGamal.pk, SK_A = state.holderElGamal.sk;
const PK_B = state.holderBElGamal.pk, SK_B = state.holderBElGamal.sk;
const PK_I = state.issuerElGamal.pk;

async function mptOf(addr: string) {
  const r = await rpc({
    command: "ledger_entry",
    mptoken: { mpt_issuance_id: ISS, account: addr },
    ledger_index: "validated",
  });
  return r.result?.node;
}

// ---------------------------------------------------------------------------
// 1. The adversary. A key nobody on this ledger has ever registered.
// ---------------------------------------------------------------------------
const [SK_ADV, PK_ADV] = await tool("keygen");
console.log(`\nadversary keypair (generated here, registered nowhere)`);
console.log(`  pk  ${PK_ADV}`);

const onLedger = await mptOf(holderB.address);
if (!onLedger?.HolderEncryptionKey) die(`${holderB.address} has no registered HolderEncryptionKey`);
console.log(`\nthe destination's REAL registered key, from the ledger:`);
console.log(`  ${onLedger.HolderEncryptionKey}`);
if (onLedger.HolderEncryptionKey.toUpperCase() !== PK_B.toUpperCase()) {
  die(`state.json's holderBElGamal.pk does not match the ledger. Refusing to guess which is right.`);
}
console.log(`\nthis script will now encrypt the amount to the ADVERSARY's key instead,`);
console.log(`which is exactly what a signer does when its ledger read is wrong.`);

// ---------------------------------------------------------------------------
// 2. Build a Send that is correct in every respect EXCEPT the destination key.
// ---------------------------------------------------------------------------
const cur = await mptOf(holder.address);
if (!cur?.ConfidentialBalanceSpending) die(`${holder.address} has no ConfidentialBalanceSpending`);
const balance = Number((await tool("decrypt", cur.ConfidentialBalanceSpending, SK_A, "0", "5000"))[0]);
const version = cur.ConfidentialBalanceVersion ?? 0;
const seq = await sequenceOf(holder.address);
if (balance < AMOUNT) die(`balance ${balance} is below the amount ${AMOUNT}`);

// ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76.
// What this harness demonstrates is a **substituted destination key**; the
// randomness is not the defect being shown, so it should be the ruled one.
// The context hash therefore has to be computed before it.
const [ctxh] = await tool("send-ctx", accountIdHex(holder.address), ISS, String(seq), accountIdHex(holderB.address), String(version));
const { r: r32, rho } = deriveRandomness({ txKind: "ConfidentialMPTSend", accountIdHex: accountIdHex(holder.address), issuanceIdHex: ISS, contextHashHex: ctxh });
const [ctA] = await tool("encrypt", String(AMOUNT), PK_A, r32);
const [ctADV] = await tool("encrypt", String(AMOUNT), PK_ADV, r32);   // <- the substitution
const [ctI] = await tool("encrypt", String(AMOUNT), PK_I, r32);
const [pcM] = await tool("pedersen", String(AMOUNT), r32);
const [pcB] = await tool("pedersen", String(balance), rho);
const [proof] = await tool("send-proof", SK_A, PK_A, String(AMOUNT), r32, ctxh, pcM,
  pcB, String(balance), cur.ConfidentialBalanceSpending, rho, "3",
  PK_A, ctA, PK_ADV, ctADV, PK_I, ctI);

// The proof is internally consistent — it is a VALID proof of the wrong
// statement. Checking that here matters: if it were malformed, the rejection
// below would prove nothing about key substitution.
const selfVerify = (await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_ADV, ctADV, PK_I, ctI))[0];
console.log(`\nlocal self-verify against the ADVERSARY's key: ${selfVerify}`);
if (selfVerify !== "OK") die("the proof does not verify even locally; this would test nothing");

const againstReal = (await tool("verify-send", proof, cur.ConfidentialBalanceSpending, pcM, pcB, ctxh, "3", PK_A, ctA, PK_B, ctADV, PK_I, ctI))[0];
console.log(`local self-verify against the DESTINATION's real key: ${againstReal}   <- what rippled will do`);

const tx = {
  TransactionType: "ConfidentialMPTSend",
  Destination: holderB.address,
  MPTokenIssuanceID: ISS,
  SenderEncryptedAmount: ctA,
  DestinationEncryptedAmount: ctADV,
  IssuerEncryptedAmount: ctI,
  AmountCommitment: pcM,
  BalanceCommitment: pcB,
  ZKProof: proof,
  Sequence: seq,
  Fee: "5000",
};

// ---------------------------------------------------------------------------
// 3. Submit. F-23 predicts tecBAD_PROOF, and predicts it is RECORDED.
// ---------------------------------------------------------------------------
const res = await submit(tx, holder.seed);
const engine = res.engine;
console.log(`\nsubmit -> ${engine}`);
if (engine !== "tecBAD_PROOF") {
  console.log(`  ⚠ F-23 predicted tecBAD_PROOF and got ${engine}. The finding's chain does not`);
  console.log(`    hold as written, or this transaction is wrong in some other way.`);
}

const hash = res.hash;
let validated: any = null;
for (let i = 0; i < 25 && !validated; i++) {
  await Bun.sleep(1500);
  const r = await rpc({ command: "tx", transaction: hash });
  if (r.result?.validated) validated = r.result;
}
if (!validated) die(`the transaction did not validate within the wait. hash=${hash}`);

console.log(`\nvalidated: yes`);
console.log(`  hash   ${hash}`);
console.log(`  result ${validated.meta?.TransactionResult ?? "(none)"}`);
console.log(`  ledger ${validated.ledger_index}`);

// ---------------------------------------------------------------------------
// 4. **The finding.** Read the amount back off the public ledger, holding only
//    the adversary's secret. Nothing here uses SK_A or SK_B.
// ---------------------------------------------------------------------------
const recorded = validated.tx_json ?? validated;
const published = recorded.DestinationEncryptedAmount;
if (!published) {
  console.log(`\n✓ F-23 does NOT hold as written: the failed transaction carries no`);
  console.log(`  DestinationEncryptedAmount on the ledger. The finding must be corrected.`);
  close();
  process.exit(0);
}

console.log(`\nDestinationEncryptedAmount, read back off the validated ledger:`);
console.log(`  ${published}`);
console.log(`  (byte-identical to what was submitted: ${published.toUpperCase() === ctADV.toUpperCase()})`);

let recoveredByAdversary: string | null = null;
try {
  recoveredByAdversary = (await tool("decrypt", published, SK_ADV, "0", "5000"))[0];
} catch { /* falls through to the report below */ }

let recoveredByDestination: string | null = null;
try {
  recoveredByDestination = (await tool("decrypt", published, SK_B, "0", "5000"))[0];
} catch { /* expected to fail */ }

console.log(`\n--- what each party can read from the PUBLIC ledger ---`);
console.log(`  the adversary, holding only the key they supplied: ${recoveredByAdversary ?? "could not decrypt"}`);
console.log(`  the intended destination, holding their real key:  ${recoveredByDestination ?? "could not decrypt"}`);

const held = recoveredByAdversary === String(AMOUNT) && recoveredByDestination === null;

console.log(`\n${"=".repeat(72)}`);
if (held) {
  console.log(`F-23 EXECUTED AND HELD.`);
  console.log(``);
  console.log(`The transaction FAILED (${engine}) and is on the ledger anyway. The amount`);
  console.log(`${AMOUNT} was recovered from public data by whoever supplied the wrong key,`);
  console.log(`and the intended destination cannot read it at all.`);
  console.log(``);
  console.log(`A wrong ledger read costs the AMOUNT, not just the transaction.`);
} else {
  console.log(`F-23 DID NOT REPRODUCE AS WRITTEN. Do not correct the code to match the`);
  console.log(`finding; correct the FINDING. adversary=${recoveredByAdversary} destination=${recoveredByDestination}`);
}
console.log(`${"=".repeat(72)}`);
console.log(``);
console.log(`⚠ This is what a WRONG READ costs. It is not a network attack: nothing here`);
console.log(`  compromised a node or a TLS connection. CLAIMS.md B-15 asks whether one`);
console.log(`  endpoint is an acceptable source given this.`);

state.f23 = {
  claim: "a tec-failed confidential Send publishes its ciphertexts, so a substituted destination key leaks the amount",
  amount: AMOUNT,
  engine,
  hash,
  ledger: validated.ledger_index,
  adversaryRecovered: recoveredByAdversary,
  destinationRecovered: recoveredByDestination,
  held,
  at: new Date().toISOString(),
};
save();

close();
process.exit(held ? 0 : 1);
