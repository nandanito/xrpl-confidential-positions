/**
 * convert.ts — get ONE ConfidentialMPTConvert accepted by standard Devnet.
 *
 * Throwaway spike. State is cached in state.json so a rerun resumes instead of
 * re-funding. Proof material comes from ./mptool (native mpt-crypto).
 */
import { encode, encodeForSigning, decode } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";
import { decodeAccountID } from "ripple-address-codec";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { deriveR } from "../wconf-randomness.ts";

const WS = "wss://s.devnet.rippletest.net:51233";
const FAUCET = "https://faucet.devnet.rippletest.net/accounts";
const NETWORK_ID = 2;
const MPTOOL = "/tmp/wconf/mptool";
const STATE = "/tmp/wconf/state.json";

let ws: WebSocket;
let nextId = 0;
const pending = new Map<number, (v: any) => void>();

export const state: any = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
export const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));

export async function connect() {
  ws = new WebSocket(WS);
  await new Promise<void>((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = () => rej(new Error("connect failed"));
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string);
    const cb = pending.get(m.id);
    if (cb) { pending.delete(m.id); cb(m); }
  };
  const info = await rpc({ command: "server_info" });
  const id = info.result?.info?.network_id;
  if (id !== NETWORK_ID) { ws.close(); throw new Error(`refusing: network_id ${id}, expected ${NETWORK_ID}`); }
  console.log(`connected — network_id ${id}, rippled ${info.result.info.build_version}`);
}
export const close = () => ws?.close();

export function rpc(cmd: Record<string, unknown>): Promise<any> {
  const id = ++nextId;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, ...cmd })); });
}

export async function faucet(label: string) {
  if (state[label]) { console.log(`${label}: reusing ${state[label].address}`); return state[label]; }
  const r = await fetch(FAUCET, { method: "POST" });
  if (!r.ok) throw new Error(`faucet ${r.status}`);
  const b: any = await r.json();
  const address = b.account?.classicAddress ?? b.account?.address;
  const seed = b.seed ?? b.account?.secret;
  for (let i = 0; i < 20; i++) {
    await Bun.sleep(2000);
    const info = await rpc({ command: "account_info", account: address, ledger_index: "validated" });
    if (info.result?.account_data) {
      state[label] = { address, seed }; save();
      console.log(`${label}: funded ${address}`);
      return state[label];
    }
  }
  throw new Error(`${label} never validated`);
}

export async function sequenceOf(address: string): Promise<number> {
  const info = await rpc({ command: "account_info", account: address, ledger_index: "validated" });
  return info.result.account_data.Sequence;
}

export type Sub = { engine: string; message: string; hash?: string; blob?: string; validated?: any; meta?: any };

export async function submit(tx: Record<string, any>, seed: string, opts: { quiet?: boolean } = {}): Promise<Sub> {
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);
  const cur = await rpc({ command: "ledger_current" });
  const filled: any = {
    ...tx,
    Account: tx.Account ?? address,
    Sequence: tx.Sequence ?? (await sequenceOf(address)),
    Fee: tx.Fee ?? "5000",
    LastLedgerSequence: tx.LastLedgerSequence ?? cur.result.ledger_current_index + 20,
    NetworkID: tx.NetworkID,
    SigningPubKey: kp.publicKey,
  };
  if (filled.NetworkID === undefined) delete filled.NetworkID;
  const signed = { ...filled, TxnSignature: sign(encodeForSigning(filled), kp.privateKey) };
  const blob = encode(signed);
  const res = await rpc({ command: "submit", tx_blob: blob });
  const out: Sub = {
    engine: res.result?.engine_result ?? "(none)",
    message: res.result?.engine_result_message ?? "",
    hash: res.result?.tx_json?.hash,
    blob,
  };
  if (!opts.quiet) console.log(`  ${tx.TransactionType} -> ${out.engine} ${out.message}`);
  if (out.hash && out.engine.startsWith("tes")) {
    out.validated = await waitValidated(out.hash);
    out.meta = out.validated?.meta ?? out.validated?.metaData;
  }
  return out;
}

export async function waitValidated(hash: string, tries = 25) {
  for (let i = 0; i < tries; i++) {
    await Bun.sleep(1500);
    const r = await rpc({ command: "tx", transaction: hash });
    if (r.result?.validated) return r.result;
  }
  return null;
}

export async function tool(...args: string[]): Promise<string[]> {
  const p = Bun.spawnSync([MPTOOL, ...args]);
  if (p.exitCode !== 0) throw new Error(`mptool ${args[0]} failed: ${p.stderr.toString()}`);
  return p.stdout.toString().trim().split("\n");
}

export const accountIdHex = (addr: string) =>
  Buffer.from(decodeAccountID(addr)).toString("hex").toUpperCase();

export function createdNode(meta: any, type: string) {
  return (meta?.AffectedNodes ?? []).map((n: any) => n.CreatedNode).find((c: any) => c?.LedgerEntryType === type);
}
export function modifiedNode(meta: any, type: string) {
  return (meta?.AffectedNodes ?? []).map((n: any) => n.ModifiedNode).find((c: any) => c?.LedgerEntryType === type);
}

// ---------------------------------------------------------------------------

if (import.meta.main) {
  await connect();

  const issuer = await faucet("issuer");
  const holder = await faucet("holder");

  // --- 1. issuance (no confidential flag yet; TransferFee omitted = 0) ---
  if (!state.issuanceId) {
    const r = await submit({
      TransactionType: "MPTokenIssuanceCreate",
      AssetScale: 0,
      MaximumAmount: "1000000000",
      Flags: 0x00000020 | 0x00000040, // tfMPTCanTransfer | tfMPTCanClawback
    }, issuer.seed);
    if (!r.engine.startsWith("tes")) throw new Error("issuance create failed");
    const node = createdNode(r.meta, "MPTokenIssuance");
    state.issuanceId = r.meta?.mpt_issuance_id ?? node?.LedgerIndex;
    save();
    console.log(`  MPTokenIssuanceID = ${state.issuanceId}`);
  } else console.log(`issuance: reusing ${state.issuanceId}`);

  // --- 2. issuer ElGamal key + enable confidential, atomically (spec 12.6.1) ---
  if (!state.issuerElGamal) {
    const [sk, pk] = await tool("keygen");
    state.issuerElGamal = { sk, pk }; save();
  }
  if (!state.confEnabled) {
    const r = await submit({
      TransactionType: "MPTokenIssuanceSet",
      MPTokenIssuanceID: state.issuanceId,
      Flags: 256, // tfMPTSetCanHoldConfidentialBalance
      IssuerEncryptionKey: state.issuerElGamal.pk,
    }, issuer.seed);
    if (!r.engine.startsWith("tes")) throw new Error(`issuance set failed: ${r.engine}`);
    state.confEnabled = true; save();
  }

  // --- 3. holder opts in to the MPT ---
  if (!state.authorized) {
    const r = await submit({
      TransactionType: "MPTokenAuthorize",
      MPTokenIssuanceID: state.issuanceId,
    }, holder.seed);
    if (!r.engine.startsWith("tes")) throw new Error(`authorize failed: ${r.engine}`);
    state.authorized = true; save();
  }

  // --- 4. issuer pays the holder a public balance ---
  if (!state.funded) {
    const r = await submit({
      TransactionType: "Payment",
      Destination: holder.address,
      Amount: { mpt_issuance_id: state.issuanceId, value: "1000" },
    }, issuer.seed);
    if (!r.engine.startsWith("tes")) throw new Error(`payment failed: ${r.engine}`);
    state.funded = true; save();
  }

  // --- 5. the actual objective: ConfidentialMPTConvert ---
  const [hsk, hpk] = await tool("keygen");
  state.holderElGamal = { sk: hsk, pk: hpk }; save();

  const seq = await sequenceOf(holder.address);
  const accHex = accountIdHex(holder.address);
  const [ctxHash] = await tool("convert-ctx", accHex, state.issuanceId, String(seq));
  const [proof] = await tool("convert-proof", hpk, hsk, ctxHash);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76.
  const r32 = deriveR({ txKind: "ConfidentialMPTConvert", accountIdHex: accHex,
                        issuanceIdHex: state.issuanceId, contextHashHex: ctxHash });
  const AMOUNT = 250;
  const [holderCt] = await tool("encrypt", String(AMOUNT), hpk, r32);
  const [issuerCt] = await tool("encrypt", String(AMOUNT), state.issuerElGamal.pk, r32);

  console.log(`\nConvert: seq=${seq} account=${accHex}`);
  console.log(`  ctxHash = ${ctxHash}`);
  console.log(`  ZKProof = ${proof}`);

  const convert = {
    TransactionType: "ConfidentialMPTConvert",
    MPTokenIssuanceID: state.issuanceId,
    MPTAmount: String(AMOUNT),
    HolderEncryptionKey: hpk,
    HolderEncryptedAmount: holderCt,
    IssuerEncryptedAmount: issuerCt,
    BlindingFactor: r32,
    ZKProof: proof,
    Sequence: seq,
  };
  const r = await submit(convert, holder.seed);
  console.log(`\n>>> ConfidentialMPTConvert: ${r.engine} ${r.message}`);
  console.log(`    hash = ${r.hash}`);
  console.log(`    blob = ${r.blob!.length / 2} bytes`);
  if (r.validated) {
    console.log(`    validated: ${r.meta.TransactionResult}`);
    state.convertHash = r.hash; save();
  }
  close();
}
