/**
 * b16-hedged-ed25519-devnet.ts — **prove rippled accepts a HEDGED ed25519
 * nonce**, on the default path, from an `sEd…` account.
 *
 * `CLAIMS.md` B-16, ruled 2026-08-27 (`REVIEW-024`, three independent legs): the
 * RFC 8032 nonce prefix `p = SHA512(sk)[32..64]` is replaced by
 * `q = p XOR SHA512(DST ‖ aux)[0..32]`. This is the ruling's §6 **item 7**, the
 * one no unit test can stand in for.
 *
 * ## ⚠ Why this script is careful about a run that looks obvious
 *
 * B-14's trap ran one way: **every** account this project holds has an `sEd…`
 * seed, so the obvious Devnet run exercised ed25519 while the ruling had changed
 * secp256k1, and a `tesSUCCESS` would have been reported as evidence for
 * something it never touched. **Here the trap runs backwards.** The obvious run
 * IS the right one — which is exactly the circumstance in which nobody checks
 * what was actually exercised. So the blob is decoded anyway.
 *
 * ## ⚠ And `SigningPubKey` starting `0xED` is NOT sufficient
 *
 * It says the *algorithm* was ed25519. It says nothing about the *nonce*, and a
 * conforming verifier cannot tell a hedged signature from a deterministic one —
 * which is the whole reason hedging is free on the wire, and the reason
 * reasoning gets no further than *"a verifier cannot see how `r` was derived"*.
 * `REVIEW-018` §6 declined to rely on that once already.
 *
 * So this script does the one check that distinguishes them. `ripple-keypairs`
 * is a **deterministic** ed25519 signer, so for a given seed and a given signing
 * serialisation there is exactly one RFC 8032 signature. The script:
 *
 *   1. re-derives the signing serialisation from the SUBMITTED blob,
 *   2. computes what pure RFC 8032 would have produced over those same bytes,
 *   3. asserts the blob's `TxnSignature` **differs** from it — the hedge, visible,
 *   4. asserts **both** verify under the account's public key — so the
 *      difference is the nonce and not a broken signature,
 *   5. and only then submits.
 *
 * ⚠ Step 3 is the assertion that would have failed on 2026-08-26, and step 4 is
 * what stops step 3 passing because the signer emitted garbage.
 *
 * ## What this does NOT prove
 *
 * That hedging is *better* — that is the ruling's argument, not this script's.
 * It proves a hedged ed25519 signature is **wire valid**: it reaches a validated
 * ledger. ⚠ **The rippled source is not in this checkout**, so its verification
 * path could not be read at source (`REVIEW-024` §6, a named gap). This run is
 * the substitute for that reading, which is why it is a gate.
 *
 * ⚠ **Devnet only.** Costs a faucet account and a few transaction fees.
 *
 *   bun run tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts [--auto-confirm]
 */
import { connect, rpc, close, state, save, tool, submit } from "../spike-2026-08-17/convert.ts";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const AUTO = process.argv.includes("--auto-confirm");

// ⚠ **A RECEIPT PER RUN, NOT A RECEIPT PER SCRIPT — `CLAIMS.md` E-169.**
//
// This path was a fixed string, so re-running the script OVERWROTE the previous
// receipt. That is exactly how E-169 happened: the run was repeated from a clean
// tree after the prose was written, the receipt was replaced, and four documents
// were left citing a transaction hash no committed receipt recorded.
//
// The B-16 receipt at the default name is cited by `CLAIMS.md`,
// `signer/README.md` and `UPSTREAM-FEEDBACK.md`. A later re-execution — B-21's,
// for instance — must not silently replace the evidence those three rest on.
// `WCONF_RECEIPT_NAME` gives that run its own file; unset, behaviour is
// unchanged.
const RECEIPT_NAME = process.env.WCONF_RECEIPT_NAME
  ?? "b16-hedged-ed25519-devnet-2026-08-27.json";
// Free text recorded in the receipt: which gate this particular RE-run answers.
const RERUN_FOR = process.env.WCONF_RERUN_FOR ?? null;
const AMOUNT = 30;
const WORK = "/tmp/wconf/b16";
const SOCKET = `${WORK}/signer.sock`;
const SIGNER = new URL("../../signer/target/debug/wconf-signer", import.meta.url).pathname;
const LABEL = "b16EdHolder";

const die = (m: string) => { console.error(`\n✗ ${m}`); process.exit(1); };

// ---------------------------------------------------------------------------
// 0. ⚠ PROVENANCE. `REVIEW-025` graded this gate PARTIAL, twice, and not because
//    the run was wrong: the script executed whatever binary happened to be at
//    `signer/target/debug/wconf-signer` and recorded nothing about where it came
//    from. **A ledger receipt with no source-to-binary link is a receipt for an
//    unknown program**, and this repository's own history is of trees moving
//    under a running process (`REVIEW-022`). So: rebuild, and record the commit
//    and whether the tree was dirty, in the receipt.
// ---------------------------------------------------------------------------
// ⚠ **The exit status is checked.** These were `.stdout.trim()` with the status
// ignored, so a failed `git rev-parse` produced an EMPTY commit and a failed
// `git status` produced a false `dirty=false` — a receipt asserting provenance
// it had not established. `REVIEW-026`, Codex leg.
const git = (...a: string[]) => {
  const r = spawnSync("git", a, { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8" });
  if (r.status !== 0) die(`git ${a.join(" ")} failed (${r.status}): ${r.stderr ?? ""}\n  Provenance cannot be established, so this run would write a receipt that lies about where its binary came from.`);
  return r.stdout;
};
const COMMIT = git("rev-parse", "HEAD").trim();
if (!/^[0-9a-f]{40}$/.test(COMMIT)) die(`git rev-parse returned ${JSON.stringify(COMMIT)}, not a commit`);
const DIRTY = git("status", "--porcelain", "--", "signer", "tools").trim().length > 0;
console.log(`building the signer from ${COMMIT.slice(0, 12)}${DIRTY ? "  ⚠ TREE IS DIRTY" : ""} ...`);
const build = spawnSync("cargo", ["build"], { cwd: new URL("../../signer", import.meta.url).pathname, encoding: "utf8" });
if (build.status !== 0) die(`cargo build failed:\n${build.stderr}`);
console.log(`  built. This receipt is for THAT binary and no other.`);

// ⚠ **REFUSE TO CLOBBER ANOTHER RUN'S RECEIPT — and refuse EARLY, before a
// transaction is spent. `CLAIMS.md` E-169.**
//
// This check sat after submission in its first form, which made it untestable
// without paying for a Devnet transaction — and *"a gate described is not a gate
// run"* is this project's most expensive recurring lesson (E-165, E-171). Here
// it is reachable with no network at all, so breaking it costs nothing:
//
//   WCONF_RECEIPT_NAME=b16-hedged-ed25519-devnet-2026-08-27.json bun run <this>
//
// must refuse, because that file records a different commit.
{
  const target = new URL(`../../docs/runs/${RECEIPT_NAME}`, import.meta.url).pathname;
  if (existsSync(target)) {
    let prior: any = null;
    try { prior = JSON.parse(readFileSync(target, "utf8")); }
    catch { die(`${RECEIPT_NAME} exists and is not readable JSON. Refusing to overwrite something this script cannot identify.`); }
    if (prior?.builtFromCommit && prior.builtFromCommit !== COMMIT) {
      die(`${RECEIPT_NAME} already records a run from commit ${prior.builtFromCommit}, and this run is from ${COMMIT}.\n`
        + `  Overwriting it would delete evidence other documents cite — CLAIMS.md E-169, which is\n`
        + `  FOUR documents left citing a transaction hash no committed receipt recorded.\n`
        + `  Set WCONF_RECEIPT_NAME to a new filename for this run.`);
    }
    console.log(`  ⚠ ${RECEIPT_NAME} exists and records this same commit; it will be replaced.`);
  }
}
if (DIRTY) {
  console.log(`  ⚠ signer/ or tools/ has uncommitted changes. The receipt records dirty=true;`);
  console.log(`    a dirty run is evidence about a tree nobody else can reconstruct.`);
}

await connect();
const issuer = state.issuer;
if (!issuer || !state.issuanceId) die("state.json is missing the issuer setup. Run convert.ts first.");

// ---------------------------------------------------------------------------
// 1. An ed25519 holder. The faucet hands these out by default, which is the
//    whole point: this is the arm every real account uses.
// ---------------------------------------------------------------------------
if (!state[LABEL]) {
  const r = await fetch("https://faucet.devnet.rippletest.net/accounts", { method: "POST" });
  if (!r.ok) die(`faucet ${r.status}`);
  const j: any = await r.json();
  const address = j.account?.address ?? j.account?.classicAddress;
  const seed = j.account?.secret ?? j.seed;
  if (!address || !seed) die(`faucet response had no account: ${JSON.stringify(j).slice(0, 200)}`);
  for (let i = 0; i < 20; i++) {
    await Bun.sleep(2000);
    const info = await rpc({ command: "account_info", account: address, ledger_index: "validated" });
    if (info.result?.account_data) break;
  }
  state[LABEL] = { address, seed }; save();
}
const who = state[LABEL];
if (!who.seed.startsWith("sEd")) {
  die(`${LABEL} has a ${who.seed.slice(0, 2)}… seed, which is secp256k1. This script needs ed25519 — it would prove nothing about B-16, which is the mistake B-14's first run made in the mirror direction.`);
}
console.log(`ed25519 holder: ${who.address}  (seed prefix ${who.seed.slice(0, 3)}…)`);

async function mptOf(addr: string) {
  const objs = await rpc({ command: "account_objects", account: addr, ledger_index: "validated", type: "mptoken" });
  return (objs.result.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === state.issuanceId);
}

// --- setup: non-confidential, and none of it done by the signer -------------
if (!(await mptOf(who.address))) {
  const r = await submit({ TransactionType: "MPTokenAuthorize", MPTokenIssuanceID: state.issuanceId }, who.seed);
  if (!r.engine.startsWith("tes")) die(`authorize failed: ${r.engine}`);
}
let mpt = await mptOf(who.address);
if (Number(mpt?.MPTAmount ?? 0) < AMOUNT) {
  const r = await submit({
    TransactionType: "Payment",
    Destination: who.address,
    Amount: { mpt_issuance_id: state.issuanceId, value: String(AMOUNT * 2) },
  }, issuer.seed);
  if (!r.engine.startsWith("tes")) die(`issuer payment failed: ${r.engine}`);
  mpt = await mptOf(who.address);
}
console.log(`public MPT balance: ${mpt.MPTAmount}`);

if (!state[`${LABEL}ElGamal`]) {
  const [sk, pk] = await tool("keygen");
  state[`${LABEL}ElGamal`] = { sk, pk }; save();
}
const eg = state[`${LABEL}ElGamal`];

// ---------------------------------------------------------------------------
// 2. Drive the signer on its DEFAULT path. No flag, no feature, no test hook:
//    `sign_message` is the only signing entry point a plain build has.
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
writeFileSync(`${WORK}/profile.json`, JSON.stringify({
  account_seed: who.seed,
  elgamal_sk: eg.sk,
  elgamal_pk: eg.pk,
  issuance_id: state.issuanceId,
  fee_drops: 5000,
  network_id: 2,
  ledger_endpoint: "https://s.devnet.rippletest.net:51234/",
  amount_search_to: 5000,
}, null, 2));

const child = spawn(SIGNER, [], {
  env: { ...process.env, WCONF_SIGNER_PROFILE: `${WORK}/profile.json`, WCONF_SIGNER_SOCKET: SOCKET, WCONF_SIGNER_STORE: `${WORK}/randomness` },
  stdio: ["pipe", "pipe", "pipe"],
});
child.stdout.on("data", (d) => process.stdout.write(`  [signer] ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`  [signer] ${d}`));

for (let i = 0; i < 50 && !existsSync(SOCKET); i++) await Bun.sleep(100);
if (!existsSync(SOCKET)) die("the signer never created its socket");
await Bun.sleep(300);

let buffer = ""; const inbox: string[] = [];
const sock = await Bun.connect({
  unix: SOCKET,
  socket: { data(_s, data) { buffer += data.toString(); let i; while ((i = buffer.indexOf("\n")) >= 0) { inbox.push(buffer.slice(0, i)); buffer = buffer.slice(i + 1); } } },
});
async function ask(req: unknown, confirm = false): Promise<any> {
  sock.write(JSON.stringify(req) + "\n");
  if (confirm && AUTO) { await Bun.sleep(1500); child.stdin.write("CONFIRM\n"); }
  for (let i = 0; i < 1200; i++) { if (inbox.length) return JSON.parse(inbox.shift()!); await Bun.sleep(100); }
  die("the signer did not answer");
}

const paired = await ask({ type: "pair", operations: ["ConfidentialMPTConvert"], ttl_secs: 300 });
if (paired.status !== "paired") die(`pairing failed: ${JSON.stringify(paired)}`);
if (!AUTO) { console.log(`\n>>> Type CONFIRM in this terminal when the signer asks.\n`); process.stdin.pipe(child.stdin); }

const out = await ask({
  type: "prepare", grant: paired.grant, operation: "ConfidentialMPTConvert",
  issuance_id: state.issuanceId, amount: String(AMOUNT),
}, true);
try { sock.end(); } catch {}
child.kill();
if (out.status !== "signed") die(`the signer refused: ${out.code} — ${out.detail}`);

// ---------------------------------------------------------------------------
// 3. ⚠ WHICH ARM SIGNED IT — decoded out of the blob that is about to be
//    submitted, not out of the profile that was handed in.
// ---------------------------------------------------------------------------
const { decode, encodeForSigning } = await import("ripple-binary-codec");
const kp = await import("ripple-keypairs");

const decoded: any = decode(out.tx_blob);
const spk: string = decoded.SigningPubKey;
const algorithm = spk.toUpperCase().startsWith("ED") ? "ed25519" : "secp256k1";
console.log(`\nSigningPubKey ${spk.slice(0, 10)}…  → ${algorithm}`);
if (algorithm !== "ed25519") {
  die(`this run signed with ${algorithm}, which is NOT the arm B-16 changed. It proves nothing.`);
}
if (spk.length !== 66) die(`an ed25519 SigningPubKey is 33 bytes; got ${spk.length / 2}`);

const pair = kp.deriveKeypair(who.seed);
const derivedPub = pair.publicKey.toUpperCase();
if (derivedPub !== spk.toUpperCase()) {
  die(`the blob's SigningPubKey is not the one this seed derives.\n  blob  ${spk}\n  seed  ${derivedPub}`);
}
console.log(`  and it is the key this seed derives. Good.`);

// --- ⚠ the check that 0xED does not make ------------------------------------
const sigInBlob: string = decoded.TxnSignature.toUpperCase();
const forSigning = { ...decoded };
delete forSigning.TxnSignature;
const signingHex = encodeForSigning(forSigning).toUpperCase();
// ⚠ `kp.sign` takes the PRIVATE KEY, not the seed. Passing the seed throws
// rather than signing something wrong, which is the good failure mode.
const rfc8032 = kp.sign(signingHex, pair.privateKey).toUpperCase();

console.log(`\nover the SAME signing serialisation (${signingHex.length / 2} bytes):`);
console.log(`  signer   ${sigInBlob.slice(0, 32)}…  (${sigInBlob.length / 2} bytes)`);
console.log(`  RFC 8032 ${rfc8032.slice(0, 32)}…  (${rfc8032.length / 2} bytes)  [ripple-keypairs, deterministic]`);

if (sigInBlob === rfc8032) {
  die(
    `the signature in the blob IS the deterministic RFC 8032 one.\n` +
    `  The nonce was NOT hedged on this path. B-16 is not built, whatever the tests say —\n` +
    `  and this is the assertion that would have passed silently on a 0xED-prefix check alone.`,
  );
}
console.log(`  → DIFFERENT. The nonce prefix was hedged on the default path.`);

// Control: the difference must be the nonce, not a broken signature.
if (!kp.verify(signingHex, sigInBlob, spk)) die(`the signer's signature does not verify under its own SigningPubKey`);
if (!kp.verify(signingHex, rfc8032, spk)) die(`ripple-keypairs' own signature does not verify — this harness is wrong, not the signer`);
console.log(`  → BOTH verify under the same public key. The difference is r, and nothing else.`);

// ---------------------------------------------------------------------------
// 4. Submit. A tesSUCCESS is not the end; a validated ledger is.
// ---------------------------------------------------------------------------
const res = await rpc({ command: "submit", tx_blob: out.tx_blob });
const engine = res.result?.engine_result ?? "(none)";
const hash = res.result?.tx_json?.hash;
console.log(`\nsubmit -> ${engine}  ${res.result?.engine_result_message ?? ""}`);

let validated = false;
let onLedgerSig = "";
if (engine.startsWith("tes")) {
  for (let i = 0; i < 25 && !validated; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) { validated = true; onLedgerSig = String(r.result.TxnSignature ?? r.result.tx_json?.TxnSignature ?? "").toUpperCase(); }
  }
}
console.log(`  hash ${hash}`);
console.log(`  validated: ${validated ? "yes" : "not within the wait"}`);

// ⚠ And the signature the LEDGER kept is the hedged one, not something a node
//   normalised on the way through. Cheap, and the alternative is assuming.
if (validated && onLedgerSig) {
  if (onLedgerSig !== sigInBlob) die(`the validated transaction carries a different TxnSignature than the blob submitted.\n  blob   ${sigInBlob}\n  ledger ${onLedgerSig}`);
  if (onLedgerSig === rfc8032) die(`the validated transaction carries the DETERMINISTIC signature`);
  console.log(`  the validated transaction carries the hedged signature, byte for byte.`);
}

const receipt = {
  gate: "REVIEW-024 section 6 item 7",
  claim: "rippled accepts an ed25519 signature whose RFC 8032 nonce prefix is hedged, on the default path",
  builtFromCommit: COMMIT,
  workingTreeDirty: DIRTY,
  account: who.address,
  algorithm,
  signingPubKey: spk,
  signingPubKeyDecodedFrom: "the submitted tx_blob, not the profile",
  signingSerialisationBytes: signingHex.length / 2,
  hedgedSignature: sigInBlob,
  deterministicWouldHaveBeen: rfc8032,
  differsFromRfc8032: sigInBlob !== rfc8032,
  bothVerifyUnderTheSameKey: true,
  engine, hash, validated,
  ledgerCarriesTheHedgedBytes: validated && onLedgerSig === sigInBlob,
  at: new Date().toISOString(),
  ...(RERUN_FOR ? { reExecutedFor: RERUN_FOR } : {}),
  doesNotEstablish: [
    "that hedging is better — that is REVIEW-024's argument, not this run's",
    "that rippled's verification path was read at source — it is not in this checkout, a named gap",
    "that this exact combiner produced it — that is the KAT and the commit pin, not the ledger",
  ],
};
state.b16 = receipt;
save();

// ⚠ **And a copy INSIDE THE REPOSITORY.** `state.json` lives in /tmp, has been
// lost twice, and is not something a reviewer can read. A gate whose only
// evidence is an untracked file is a gate nobody else can check.
const ok = engine.startsWith("tes") && validated && sigInBlob !== rfc8032;

// ⚠ **Written only when the run SUCCEEDED, and the verdict is in the file.**
// This wrote unconditionally, before `ok` was computed, so a failed run would
// overwrite a good receipt with an artifact whose `claim` still said rippled
// accepts the construction. `REVIEW-026`, Codex leg.
const RECEIPT = new URL(`../../docs/runs/${RECEIPT_NAME}`, import.meta.url).pathname;
if (ok) {
  mkdirSync(new URL("../../docs/runs/", import.meta.url).pathname, { recursive: true });
  writeFileSync(RECEIPT, JSON.stringify({ ...receipt, gateSatisfied: true }, null, 2) + "\n");
  console.log(`\nreceipt -> docs/runs/${RECEIPT_NAME}`);
} else {
  console.log(`\n⚠ receipt NOT written: this run did not satisfy the gate, and overwriting`);
  console.log(`  a good receipt with a failed one is how evidence goes backwards.`);
}

console.log(`\n${"=".repeat(72)}`);
if (ok) {
  console.log(`B-16 EXECUTED. A HEDGED ed25519 signature was accepted and validated.`);
  console.log(``);
  console.log(`SigningPubKey was decoded out of the submitted blob and is 0xED-prefixed,`);
  console.log(`and the signature it carries is NOT the deterministic RFC 8032 one that`);
  console.log(`ripple-keypairs produces over the identical signing serialisation — while`);
  console.log(`both verify under the same public key.`);
  console.log(``);
  console.log(`That is the only thing this proves. It does NOT prove hedging is better,`);
  console.log(`which is REVIEW-024's argument and not this script's, and it does NOT`);
  console.log(`replace reading rippled's verification path — that source is not in this`);
  console.log(`checkout and remains a named gap.`);
  console.log(``);
  console.log(`⚠ Nor does the LEDGER attribute the signature to this combiner. A ledger`);
  console.log(`  shows a valid signature that is not the deterministic one; that it came`);
  console.log(`  from q = p XOR SHA512(DST || aux) rests on the commit pin above and on`);
  console.log(`  the KAT, not on anything rippled checked. REVIEW-025, Codex leg.`);
} else {
  console.log(`NOT EXECUTED (${engine}, validated=${validated}, hedged=${sigInBlob !== rfc8032}).`);
  console.log(`Do NOT report B-16 as built. Do not paper over this.`);
}
console.log(`${"=".repeat(72)}`);

close();
process.exit(ok ? 0 : 1);
