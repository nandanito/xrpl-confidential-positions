/**
 * run-facility.ts — architecture §6 step 7, the facility end to end.
 *
 * ⚠ **This header said "executed on Devnet" before this script had ever been
 * run, and then said "it has still never been run" after it had.** Both were
 * false when read. It HAS run — 28 validated facility transactions on Devnet,
 * 2026-08-25 — **and not under B-15's step-7 conditions**: the ledger source
 * was remote under the owner's amendment (`CLAIMS.md` E-151), so `tapFailHard`
 * was in force and loopback was not. A file that describes what it is *for* as
 * though it were what it *did* is the failure this project keeps paying for,
 * and a file that keeps a stale denial is the same failure with the sign
 * flipped.
 *
 * The whole of `docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md` §3, driven
 * end to end: the issuance, the Dedicated Account, the one plaintext
 * conversion, supplier enrolment, drawdowns, repayments, and retirement in
 * tranches — with **every ledger read against a loopback node** and **every
 * FACILITY MOVEMENT carrying `tapFailHard`**, which is what `CLAIMS.md` B-15's
 * step-7 ruling obliges.
 *
 * ⚠ **Not "every submission", and that sentence said so until `REVIEW-023`
 * round two.** §1's fail-hard control submits once **without** the flag,
 * deliberately, because an arm that always sets it proves nothing about it.
 * B-15's Part C says *"whatever submits"* and names no control-arm exception,
 * so this run is **not** one in which both halves were in force for its whole
 * life — and `underB15Conditions` in the run record says exactly that.
 *
 * ⚠ **Prerequisites, and the run refuses without them:**
 *
 *   tools/rebuild-env.sh                    # the vendored prover
 *   (cd signer && cargo build)              # the signer binary
 *   tools/loopback-node/node.sh start       # OUR OWN rippled, syncing Devnet
 *   tools/loopback-node/node.sh wait        # until it reports `full`
 *
 *   bun facility/run-facility.ts --auto-confirm [--fresh]
 *
 * ⚠ **`--auto-confirm` is REQUIRED, not optional**, and the run refuses without
 * it. This driver forwards neither the signer's confirmation prompt nor an
 * operator's reply, so without the flag nothing could ever answer. Refusing is
 * better than hanging and much better than auto-confirming quietly: the flag is
 * how a run says out loud that it answered a human's question itself.
 *
 * ⚠ **`tesSUCCESS` is not the evidence, and this script does NOT yet keep
 * E-131's full standard.** ConvertBack's Devnet run checked all four of
 * XLS-0096 §10.5's state changes — public `MPTAmount`, the issuance's
 * `ConfidentialOutstandingAmount`, `ConfidentialBalanceVersion`, and the
 * **decrypted** remainder — against ledger state before and after. What this
 * script does is narrower: it checks the `ConfidentialOutstandingAmount` delta
 * on the float conversion, and it **reconciles the decrypted balance** after
 * every confidential movement, which is the check the balance book makes
 * anyway. **There are no per-movement assertions over the public amount or the
 * balance version.**
 *
 * ⚠ An earlier version of this header claimed all four, on every movement.
 * `REVIEW-022`'s Codex leg found it. **Closing that gap is the first thing to do
 * when the loopback node finishes syncing** — it is `CLAIMS.md` B-18's list.
 *
 * ⚠ **Devnet throwaways.** Nothing here is secure, audited, non-custodial or
 * production-ready (`CLAIMS.md` P-5), and nothing should ever hold value.
 */
import { existsSync, readFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { FacilityBook } from "./src/book.ts";
import { CUSTODY_DISCLOSURE } from "./src/custody.ts";
import { faucetAccount } from "./src/devnet-accounts.ts";
import { Facility, type Movement, type Party } from "./src/facility.ts";
import { LoopbackLedger } from "./src/loopback.ts";
import { standaloneKeypair } from "./src/mptool.ts";
import { writeSecretFile } from "./src/secret-file.ts";
import { AUTO_CONFIRM_NOTICE } from "./src/signer.ts";
import { FailHardSubmitter } from "./src/submit.ts";

// ⚠ **The first statement of the run, before anything can `die()`.** B-27 was ruled as a
// named acceptance of the custody risk, and an acceptance nobody sees is not one. It
// printed further down until REVIEW-047 found a startup failure exited above it.
console.log(`\n${CUSTODY_DISCLOSURE}`);

const AUTO = process.argv.includes("--auto-confirm");
const FRESH = process.argv.includes("--fresh");
// ⚠ Named for what it IS, not for what it should be. It was
// `WCONF_LOOPBACK_ENDPOINT` until the hatch existed, at which point a variable
// called "loopback" holding a remote host would have been a lie in the one
// place a reader looks to find out which node was used.
const ENDPOINT = process.env.WCONF_FACILITY_ENDPOINT ?? "http://127.0.0.1:5005";

/**
 * ⚠ **State lives OUTSIDE `/tmp`.** `/tmp/wconf/state.json` has now been lost
 * twice — once to a `/tmp` clean five days after it was written, once mid-session
 * (`CLAIMS.md` E-97, E-133). These seeds cannot be regenerated and the accounts
 * cannot be driven without them.
 */
const STATE_DIR = `${homedir()}/.wconf`;
const STATE = `${STATE_DIR}/facility-state.json`;
const BOOK = `${STATE_DIR}/facility-book.json`;
const WORK = "/tmp/wconf/facility";

/** The facility's own numbers. Small, because a Devnet run pays for every unit. */
const FLOAT = 5_000;
const ENROLMENT_TOKEN = 10;
const FULL_RANGE = 20_000;

interface State {
  issuanceId?: string;
  issuerElGamal?: { sk: string; pk: string };
  bank?: Party;
  dedicated?: Party;
  suppliers?: Party[];
  runs?: unknown[];
}

const state: State = existsSync(STATE) && !FRESH ? JSON.parse(readFileSync(STATE, "utf8")) : {};
// ⚠ Every seed the facility drives and the issuer's ElGamal secret are in this
// file. It was written at the umask (`0644`) until B-29, beside a book that holds
// every amount, and the `0700` on the directory came from a different script.
const save = () => writeSecretFile(STATE, JSON.stringify(state, null, 2));

const die = (m: string): never => {
  console.error(`\n✗ ${m}`);
  process.exit(1);
};
const rule = (t: string) => console.log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

// ---------------------------------------------------------------------------
// 0. The node. B-15's step-7 ruling in one connection.
// ---------------------------------------------------------------------------
rule("0. The ledger source");

const ledger = await LoopbackLedger.open(ENDPOINT).catch((e) =>
  die(
    `${e}\n\n  B-15's step-7 ruling requires the facility's ledger reads to go to a node the\n` +
      `  operator runs. Start one:\n\n` +
      `    tools/loopback-node/node.sh start\n    tools/loopback-node/node.sh wait\n\n` +
      `  ⚠ Do NOT point this at a public endpoint. The whole ruling is that the public\n` +
      `  endpoint is not sufficient here — CLAIMS.md F-23 is executed, not theoretical.`,
  ),
);
// ⚠ **`loopback` is the half this variable is about, and it is NOT the stamp.**
// `underB15Conditions` is a getter that ANDs in "no unflagged submission", and
// §1's control makes exactly one on every run — so the stamp is `false` by the
// time anything is recorded, on every run, including a perfectly loopback one.
// `REVIEW-023` round two found §8 branching on a value cached HERE while
// writing the getter to disk in the same block: one terminal saying
// "conditions MET" and one record saying the opposite, about the same run.
//
// So this holds the LOOPBACK half by name, nothing pretends it is the stamp,
// and every later read of the stamp goes to the getter.
const loopbackHalf = ledger.identity.isLoopback;
console.log(`  endpoint      ${ENDPOINT}  ${loopbackHalf ? "(loopback — our own node)" : "⚠ REMOTE"}`);
console.log(`  rippled       ${ledger.identity.buildVersion} ${ledger.identity.gitHash ?? ""}`);
console.log(`  network_id    ${ledger.identity.networkId}  (Devnet)`);
console.log(`  server_state  ${ledger.identity.serverState}`);
console.log(`  validated     ${ledger.identity.validatedIndex}`);
console.log(
  `  B-15 step-7   loopback half ${loopbackHalf ? "IN FORCE" : "⚠ NOT in force — risk accepted by name"}`,
);
console.log(
  `                fail-hard half will be recorded BROKEN by §1's control, which submits\n` +
    `                once without the flag on purpose. B-15's Part C says "whatever submits".`,
);
console.log(
  loopbackHalf
    ? `\n  ⚠ Loopback removes the risk F-23 names. tapFailHard removes its consequence\n` +
        `    AT THE LEDGER — not at the node the blob was submitted to (CLAIMS.md F-28).\n` +
        `    Neither is enforced by the signer, and nothing forces a DIFFERENT submitter to\n` +
        `    set the flag — that half is a convention, not a property.`
    : `\n  ⚠ Only ONE half of B-15's answer is in force on this run. tapFailHard is set on\n` +
        `    every facility movement and removes the CONSEQUENCE of a wrong read AT THE\n` +
        `    LEDGER — it does NOT stop the ciphertext reaching the node it was submitted to,\n` +
        `    which under a remote source is the node F-23 is about (CLAIMS.md F-28). The\n` +
        `    loopback half, which removes the RISK at its source, is not in force. The\n` +
        `    disclosure above says what that means. Every result below is stamped.`,
);
if (AUTO) {
  console.log(`\n  ${AUTO_CONFIRM_NOTICE}`);
} else {
  // ⚠ **Without the flag this run cannot be confirmed by anybody.** The signer
  // child's stdio are pipes, this driver forwards neither its prompt nor the
  // operator's reply, and the only code that writes `CONFIRM` runs when
  // `--auto-confirm` is set. The CLI presented the flag as optional and it is
  // not; `REVIEW-022`'s Codex leg found that the un-flagged path simply hangs.
  // Refusing is better than hanging, and better than quietly auto-confirming.
  die(
    "this driver has no path for a human to answer the signer's confirmation: the daemon's\n" +
      "  stdio are pipes and nothing forwards them. Re-run with --auto-confirm and read what it\n" +
      "  prints about what that costs, or drive one transaction by hand with the signer in your\n" +
      "  own terminal (see signer/README.md).",
  );
}

const submitter = new FailHardSubmitter(ledger);

// ---------------------------------------------------------------------------
// 1. tapFailHard, executed. Both arms, or the claim is decoration.
// ---------------------------------------------------------------------------
rule("1. tapFailHard — executed, both arms");

console.log(
  `  rippled 3.3.0 Transactor.cpp:1645-1651 — "If the TapFailHard flag is set, a tec\n` +
    `  result must not do anything". That is READ AT SOURCE. What follows executes it in\n` +
    `  both directions, because an arm that only ever passes proves nothing about the flag.\n\n` +
    `  ⚠ What is executed is ONE tec: a tecNO_AUTH from a plaintext Payment. It is NOT an\n` +
    `    F-23 transaction — no substituted key, no ConfidentialMPTSend, no tecBAD_PROOF, no\n` +
    `    attacker-key ciphertext. The step from "this tec" to "any tec" is the source\n` +
    `    reading above, not this run. CLAIMS.md F-28.\n` +
    `  ⚠ And the flag stops a tec reaching the LEDGER, not the ciphertext reaching the NODE\n` +
    `    you submitted to — which under a remote source is the node F-23 is about.`,
);

async function failHardControl(bank: Party, issuanceId: string): Promise<void> {
  // A Payment of an MPT to an account that never opted in is a `tec`. It needs
  // no proof and no blinding factor, so it exercises the flag and nothing else.
  const stranger = await faucetAccount("stranger", ledger);
  const before = await (await ledger.snapshot()).sequenceOf(bank.address);

  const tx = {
    TransactionType: "Payment",
    Destination: stranger.address,
    Amount: { mpt_issuance_id: issuanceId, value: "1" },
  };

  // ⚠ **TWO PHASES, NOT TWO SUBMISSIONS.** The first version of this control
  // submitted the same blob with the flag and then without it, back to back,
  // and only looked at the ledger afterwards — so a run in which the FLAGGED
  // arm was wrongly applied and the unflagged one bounced as a duplicate was
  // indistinguishable from the intended result, and the script printed
  // `✓ The flag is the difference` on the exact failure it exists to detect.
  // Found by REVIEW-022 round two and, independently, by its Codex leg.
  //
  // So arm A is submitted, the ledger is allowed to close, and the transaction
  // must be ABSENT before arm B is submitted at all.
  const blob = await submitter.sign(tx, bank.seed);

  const withFlag = await submitter.submitBlob(blob);
  console.log(`\n  arm A, tapFailHard set:  ${withFlag.engineResult}  applied=${withFlag.applied}`);
  if (!withFlag.engineResult.startsWith("tec")) {
    die(`the control needs a tec from arm A and got ${withFlag.engineResult}`);
  }
  if (withFlag.applied) {
    die("arm A reported applied=true with tapFailHard set — the flag did not do what E-149 reads");
  }

  const onLedger = async () =>
    ledger
      .call("tx", { transaction: withFlag.hash })
      .then((r) => !!r.validated)
      .catch(() => false);

  await waitLedgers(3);
  const afterArmA = await onLedger();
  const seqAfterArmA = await (await ledger.snapshot()).sequenceOf(bank.address);
  console.log(`  after 3 ledger closes:   on the validated ledger? ${afterArmA ? "YES" : "no"}`);
  if (afterArmA) {
    die(
      "arm A's tec reached a validated ledger WITH tapFailHard set. That contradicts rippled " +
        "3.3.0 Transactor.cpp:1645-1651 as this project read it (CLAIMS.md E-149) and it is the " +
        "finding, not a failed run",
    );
  }

  // Arm B — the SAME bytes, WITHOUT the flag. ⚠ Deliberately bypasses
  // `FailHardSubmitter`, because the whole point of that class is that it
  // cannot do this. It is the one submission under `facility/` that omits the
  // flag, and `facility/README.md` says so.
  const rawResult = await ledger.call("submit", { tx_blob: blob });
  console.log(
    `  arm B, no flag:          ${rawResult.engine_result}  applied=${rawResult.applied === true}`,
  );
  await waitLedgers(3);
  const afterArmB = await onLedger();
  const seqAfterArmB = await (await ledger.snapshot()).sequenceOf(bank.address);

  console.log(`\n  the SAME transaction, ${withFlag.hash.slice(0, 16)}…`);
  console.log(`    after arm A: on ledger ${afterArmA ? "YES" : "no"}, Sequence ${before} → ${seqAfterArmA}`);
  console.log(`    after arm B: on ledger ${afterArmB ? "YES" : "no"}, Sequence ${seqAfterArmA} → ${seqAfterArmB}`);

  if (afterArmB) {
    console.log(
      `\n  ✓ The flag is the difference, and the two arms are DISTINGUISHABLE because they were\n` +
        `    separated by ledger closes. Arm A set tapFailHard and its tec never reached a\n` +
        `    validated ledger; arm B did not set it and the SAME bytes were applied. That is\n` +
        `    F-23's mechanism: a tec is written to the ledger WITH ITS CIPHERTEXTS unless the\n` +
        `    submitter set the flag. Here the payload is a plaintext Payment, so nothing\n` +
        `    confidential leaked; on a ConfidentialMPTSend it would be the amount, permanently.`,
    );
  } else {
    console.log(
      `\n  ⚠ INCONCLUSIVE — and that is a result, not a pass. Arm A was correctly absent, but\n` +
        `    arm B did not reach a validated ledger either, so nothing here distinguishes "the\n` +
        `    flag discarded it" from "these bytes were never going to land". Do not write this\n` +
        `    run down as evidence for tapFailHard.`,
    );
  }
}

/** Wait for `n` ledger closes on our own node, rather than for a wall-clock guess. */
async function waitLedgers(n: number): Promise<void> {
  const start = await ledger.currentIndex();
  for (let i = 0; i < 120; i++) {
    await Bun.sleep(1000);
    if ((await ledger.currentIndex()) >= start + n) return;
  }
  die(`the node did not close ${n} ledgers in two minutes`);
}

// ---------------------------------------------------------------------------
// 2. Setup — the accounts and the issuance. Walkthrough §3 steps 1 and 2.
// ---------------------------------------------------------------------------
rule("2. The bank, the issuance and the Dedicated Account");

state.bank ??= await faucetAccount("bank", ledger);
state.dedicated ??= await faucetAccount("dedicated", ledger);
save();
console.log(`  bank (issuer)      ${state.bank!.address}`);
console.log(`  Dedicated Account  ${state.dedicated!.address}`);
console.log(
  `  ⚠ Two accounts, and that is a PROTOCOL constraint: an issuer cannot convert its\n` +
    `    own issuance into a confidential balance. "Dedicated Account", never "vault".`,
);

if (!state.issuanceId) {
  // ⚠ `TransferFee` is absent, which is 0. A confidential issuance REQUIRES it
  // to be zero; fees and interest settle off-ledger or as separate confidential
  // transfers, and that is a protocol constraint rather than a design choice.
  const create = await submitter.submitBlob(
    await submitter.sign(
      {
        TransactionType: "MPTokenIssuanceCreate",
        AssetScale: 0,
        MaximumAmount: "1000000000",
        Flags: 0x20 | 0x40, // tfMPTCanTransfer | tfMPTCanClawback
      },
      state.bank!.seed,
    ),
  );
  if (!create.engineResult.startsWith("tes")) die(`issuance create: ${create.engineResult}`);
  const tx = await submitter.waitValidated(create.hash);
  const meta = tx?.meta ?? tx?.metaData;
  if (meta?.TransactionResult !== "tesSUCCESS") {
    die(`issuance create validated as ${meta?.TransactionResult ?? "(never)"}`);
  }
  state.issuanceId =
    meta?.mpt_issuance_id ??
    (meta?.AffectedNodes ?? [])
      .map((n: any) => n.CreatedNode)
      .find((c: any) => c?.LedgerEntryType === "MPTokenIssuance")?.LedgerIndex;
  if (!state.issuanceId) die("the issuance was created but its id could not be read from metadata");

  // The issuer's decryption mirror. ⚠ It is MANDATORY — no configuration
  // removes it, and any design that assumes otherwise is wrong about the
  // protocol (P-9). Its key comes from the library's CSPRNG: the ruled
  // derivation is about a HOLDER's key, and using it here would be this
  // project's choice rather than the ruling's, so it is not made silently.
  state.issuerElGamal = await standaloneKeypair();
  const set = await submitter.submitBlob(
    await submitter.sign(
      {
        TransactionType: "MPTokenIssuanceSet",
        MPTokenIssuanceID: state.issuanceId,
        Flags: 256, // tfMPTSetCanHoldConfidentialBalance
        IssuerEncryptionKey: state.issuerElGamal.pk,
      },
      state.bank!.seed,
    ),
  );
  if (!set.engineResult.startsWith("tes")) die(`issuance set: ${set.engineResult}`);
  // ⚠ The RESULT of the wait was ignored here, so a `null` (never validated) or
  // a validated `tec` let setup carry on and save an issuance id for an
  // issuance that may never have been made confidential. Found by REVIEW-022's
  // Codex leg. `submitValidated` is the method that checks both; the reason
  // this path did not use it is that it needed the hash before it had a blob,
  // which is no longer true.
  const setTx = await submitter.waitValidated(set.hash);
  const setResult = setTx?.meta?.TransactionResult ?? setTx?.metaData?.TransactionResult;
  if (setResult !== "tesSUCCESS") die(`issuance set validated as ${setResult ?? "(never)"}`);
  save();
}
console.log(`  MPTokenIssuanceID  ${state.issuanceId}`);
console.log(
  `  ⚠ No sfDomainID. The walkthrough offers one to gate the issuance to credentialled\n` +
    `    accounts; it is NOT built here and that is a named gap, not a decision.`,
);

// ⚠ `--fresh` has to clear the BOOK as well as the state, and it did not until
// the first Devnet run. A fresh run mints a new issuance, and `FacilityBook.open`
// refuses a book belonging to a different one — correctly — so the run died on a
// confusing error instead of starting. The refusal is right; forgetting to give
// it a fresh book was the defect.
if (FRESH && existsSync(BOOK)) {
  const retired = `${BOOK}.${Date.now()}.bak`;
  renameSync(BOOK, retired);
  console.log(`  previous book moved aside: ${retired}`);
}
const book = FacilityBook.open(BOOK, state.issuanceId!);
const facility = new Facility(ledger, submitter, book, {
  issuanceId: state.issuanceId!,
  bank: state.bank!,
  dedicated: state.dedicated!,
  fullRange: FULL_RANGE,
  ledgerEndpoint: ENDPOINT,
  workRoot: WORK,
  autoConfirm: AUTO,
  quietSigner: true,
});

const movements: Movement[] = [];
const note = (m: Movement | Movement[]) => {
  for (const x of [m].flat()) {
    movements.push(x);
    // ⚠ A confidential amount is printed here as `····`. It IS known to this
    // process — it is the number the facility asked the signer to send — but a
    // line reading `hidden  900` invites exactly the misreading this project
    // exists to avoid, and a reader skimming a terminal is the reader least
    // likely to check what the column means.
    console.log(
      `    ${x.amountIsPublic ? "PUBLIC  " + String(x.amount).padStart(6) : "hidden    ····"}  ` +
        `${x.what}  ${x.hash.slice(0, 12)}…`,
    );
  }
};

await failHardControl(state.bank!, state.issuanceId!);

// ---------------------------------------------------------------------------
// 3. Funding, and the one plaintext moment. Steps 3 and 4.
// ---------------------------------------------------------------------------
rule("3. Funding the Dedicated Account, and the ONE plaintext conversion");

const dedicatedBefore = await facility.positionOf(state.dedicated!.address);
if (!dedicatedBefore) note(await facility.authorize(state.dedicated!));
if ((dedicatedBefore?.publicAmount ?? 0) < FLOAT && !dedicatedBefore?.holderEncryptionKey) {
  note(await facility.payPublicly(state.dedicated!, FLOAT));
}

const issuanceBefore = await (await ledger.snapshot()).issuance(state.issuanceId!);
if (!dedicatedBefore?.holderEncryptionKey) {
  note(await facility.convertFloat(FLOAT)); // the Convert AND its merge
  const issuanceAfter = await (await ledger.snapshot()).issuance(state.issuanceId!);
  const delta =
    issuanceAfter.confidentialOutstandingAmount - issuanceBefore.confidentialOutstandingAmount;
  console.log(`\n  ConfidentialOutstandingAmount  ${issuanceBefore.confidentialOutstandingAmount}` +
              ` → ${issuanceAfter.confidentialOutstandingAmount}  (+${delta})`);
  if (delta !== FLOAT) die(`the aggregate moved by ${delta}, not ${FLOAT}`);
} else {
  console.log("  the Dedicated Account already holds a converted float — reusing it");
}
console.log(
  `\n  ⚠ The amount above is PUBLIC and that is the intent: facility size is what the\n` +
    `    market and the funders are entitled to see.\n` +
    `  ⚠ It is NOT the last plaintext amount, and saying so would be false. Every\n` +
    `    supplier enrolment publishes TWO: the bank's Payment and the supplier's own\n` +
    `    Convert. What is true is narrower — no DRAWDOWN and no REPAYMENT publishes an\n` +
    `    amount, and those are the numbers the facility exists to hide.`,
);
console.log(`  reconciled: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`);

// ---------------------------------------------------------------------------
// 4. Suppliers. Step 5.
// ---------------------------------------------------------------------------
rule("4. Enrolling suppliers");

state.suppliers ??= [];
const WANTED = 3;
for (let i = state.suppliers.length; i < WANTED; i++) {
  state.suppliers.push(await faucetAccount(`supplier-${"ABC"[i]}`, ledger));
  save();
}
for (const s of state.suppliers) {
  const already = await facility.positionOf(s.address);
  if (already?.holderEncryptionKey) {
    console.log(`  ${s.label}: already enrolled, key ${already.holderEncryptionKey.slice(0, 12)}…`);
    // ⚠ Adopting re-checks the seed, the derivation and the key ON THE LEDGER.
    // An earlier draft reached into the facility's private supplier map with a
    // cast and did none of that — so a resumed run would have tracked a
    // position it could not decrypt.
    await facility.adoptEnrolledSupplier(s);
    continue;
  }
  console.log(`  ${s.label} ${s.address}`);
  note(await facility.enrolSupplier(s, ENROLMENT_TOKEN));
}
console.log(
  `\n  ⚠ Registration happens exactly ONCE and the protocol forbids repeating it. A\n` +
    `    supplier with no registered key cannot receive a confidential amount at all —\n` +
    `    there is no key to encrypt to, so the transaction cannot be BUILT.`,
);

// ---------------------------------------------------------------------------
// 5. Running the facility. Steps 6 and 7.
// ---------------------------------------------------------------------------
rule("5. Drawdowns and repayments — amounts hidden");

const suppliers = facility.supplierList;
const plan: { supplier: Party; draw: number; repay: number }[] = [
  { supplier: suppliers[0], draw: 900, repay: 300 },
  { supplier: suppliers[1], draw: 250, repay: 250 },
  { supplier: suppliers[2], draw: 1_400, repay: 0 },
];

for (const { supplier, draw, repay } of plan) {
  console.log(`\n  ${supplier.label}`);
  note(await facility.drawdown(supplier, draw));
  console.log(`    reconciled ${supplier.label}: ${JSON.stringify(await facility.reconcile(supplier))}`);
  if (repay > 0) {
    note(await facility.repay(supplier, repay));
    console.log(
      `    reconciled ${supplier.label}: ${JSON.stringify(await facility.reconcile(supplier))}`,
    );
  }
}
console.log(
  `\n  reconciled Dedicated Account: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`,
);

// ---------------------------------------------------------------------------
// 6. What the book buys, measured rather than asserted.
// ---------------------------------------------------------------------------
rule("6. The balance book — what a lost book costs (F-8)");

const tracked = await facility.reconcile(state.dedicated!);
const lost = await facility.resync(state.dedicated!, "spending");
console.log(`  with the book:    ${tracked.searchWidth} candidate values searched`);
console.log(`  without the book: ${lost.searchWidth} candidate values searched`);
console.log(
  `  ⚠ Widths, not times. A wall-clock figure without hardware, parameter set and\n` +
    `    methodology is what CLAIMS.md P-8 forbids. The width is the parameter, and the\n` +
    `    search is LINEAR with a fixed iteration count (upstream's RIPCTXR-1 mitigation),\n` +
    `    so the width IS the cost.`,
);

// ---------------------------------------------------------------------------
// 7. Retirement, in tranches. Step 9, and F-24.
// ---------------------------------------------------------------------------
rule("7. Retirement — and every tranche size is public");

const remaining = book.expected(state.dedicated!.address).spending;
const firstTranche = Math.floor(remaining / 3);
if (firstTranche > 0) {
  note(await facility.retire(firstTranche));
  note(await facility.retire(remaining - firstTranche));
}
console.log(
  `\n  ⚠ CLAIMS.md F-24: MPTAmount is a plaintext field on EVERY individual\n` +
    `    ConfidentialMPTConvertBack, so retiring in tranches publishes EVERY tranche\n` +
    `    size — not just the net movement in ConfidentialOutstandingAmount. The two\n` +
    `    numbers above can be read straight off the validated transactions.`,
);
console.log(`  reconciled: ${JSON.stringify(await facility.reconcile(state.dedicated!))}`);

// ---------------------------------------------------------------------------
// 8. What happened, and what is public.
// ---------------------------------------------------------------------------
rule("8. The facility, as a full-ledger observer sees the amounts");

const publicMovements = movements.filter((m) => m.amountIsPublic && m.amount > 0);
const hiddenMovements = movements.filter((m) => !m.amountIsPublic && m.amount > 0);
console.log(`  transactions with a PUBLIC amount: ${publicMovements.length}`);
for (const m of publicMovements) console.log(`    ${String(m.amount).padStart(6)}  ${m.what}`);
console.log(`\n  transactions with a HIDDEN amount: ${hiddenMovements.length}`);
for (const m of hiddenMovements) console.log(`    ${"?".padStart(6)}  ${m.what}`);
console.log(
  `\n  ⚠ Every counterparty, every timestamp and every frequency above is PUBLIC. This\n` +
    `    hides amounts and nothing else, and the issuer decrypts every balance by\n` +
    `    construction (P-4, P-9, P-11).`,
);
// ⚠ **The getter, not a cached value.** This branched on a constant read before
// §1's control until `REVIEW-023` round two, so a loopback run printed nothing
// here while writing `underB15Conditions: false` three lines below.
if (!ledger.underB15Conditions) {
  console.log(
    `\n  ⚠ THIS RUN WAS NOT UNDER B-15's STEP-7 CONDITIONS, and the record says which half.\n` +
      `    ${ledger.b15Note}\n` +
      (loopbackHalf
        ? `    The ledger source WAS loopback; what is missing is the fail-hard half, and it is\n` +
          `    missing because §1's control deliberately submits one arm without the flag.`
        : `    The ledger source was REMOTE. Everything above is evidence that the transactions\n` +
          `    are well-formed and that rippled accepts them; NONE of it is evidence about the\n` +
          `    loopback obligation.`),
  );
}

state.runs ??= [];
(state.runs as unknown[]).push({
  at: new Date().toISOString(),
  endpoint: ENDPOINT,
  rippled: ledger.identity.buildVersion,
  // ⚠ **Stamped into the record, not left to be inferred from the endpoint.**
  // A later reader asking "was this run under B-15's conditions" must get the
  // answer from the record rather than by reasoning about a hostname, because
  // reasoning about a hostname is what REVIEW-016 found two ways past.
  underB15Conditions: ledger.underB15Conditions,
  // ⚠ **Both halves, separately, because the AND of them is now constant.**
  // `underB15Conditions` is `false` on every run of this driver — §1's control
  // guarantees it — so a later reader comparing two run records would see no
  // difference between a remote run and a loopback one. These say which half.
  loopbackHalf: ledger.identity.isLoopback,
  failHardHalfWholeRun: false, // §1's control arm B, on every run, by design
  b15Note: ledger.b15Note,
  movements,
});
save();

console.log(`\n  state: ${STATE}\n  book:  ${BOOK}`);
// ⚠ The observer is a THIRD PARTY and the public endpoint is the right place to
// stand for one — anybody with a block explorer is not running your node. This
// line named `ws://127.0.0.1:6006` unconditionally until the first run under
// the hatch, which would have sent the reader to a node that was not even
// running. Only a loopback RUN gets a loopback suggestion, and even then the
// public view is the one the harness is about.
console.log(`\n  Now run the observer harness — what a full-ledger observer sees:\n`);
console.log(
  `    bun tools/observer-harness.ts ${state.dedicated!.address} ${state.issuanceId} ` +
    `--assert-no-r-reuse\n`,
);
if (loopbackHalf) {
  console.log(
    `  (add --endpoint ws://127.0.0.1:6006 to read the same thing from your own node;\n` +
      `   the default is the PUBLIC endpoint, which is what an observer actually has)\n`,
  );
}
