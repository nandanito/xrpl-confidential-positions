/**
 * devnet-submit.ts — sign and submit XRPL transactions to standard Devnet.
 *
 * **Spike scaffolding, not application code.** Extracted from the harness that
 * put 19 transactions on Devnet during the XLS-66 investigation (2026-08-16).
 * It exists so Session 3 starts at proof generation instead of rediscovering
 * how to sign these transaction types. Rewrite it freely; do not build on it.
 *
 *   bun run tools/devnet-submit.ts          # smoke test: fund an account, AccountSet
 *
 * ## Why not xrpl.js
 *
 * `xrpl.js@5.0.0` bundles a `ripple-binary-codec` that predates the Confidential
 * MPT types, so `Wallet.sign` cannot serialise them (CLAIMS.md E-13 → E-30).
 * `ripple-binary-codec@2.9.0` ships all five types (85–89) and all 18
 * confidential fields. So: build the tx JSON, `encodeForSigning` with 2.9.0,
 * sign with `ripple-keypairs`, `encode`, and submit the blob over raw
 * WebSocket. No xrpl.js in the path at all.
 *
 * Re-verify the codec against the node's `server_definitions` RPC before
 * trusting it for a new transaction type. It either matches or it does not.
 *
 * ## Two gotchas that cost real time, both recorded in UPSTREAM-FEEDBACK U-26
 *
 * 1. The devnet faucet returns the seed at the TOP level as `seed`, not at
 *    `account.secret`.
 * 2. A freshly funded faucet account is not immediately usable. `account_info`
 *    with `ledger_index: "current"` returns a `Sequence` that yields
 *    `tefPAST_SEQ` on the next submit. Poll `ledger_index: "validated"` until
 *    the account appears. `faucet()` below does this; do not remove it.
 *
 * ## Devnet only
 *
 * The endpoint is hard-coded and `assertDevnet()` refuses to proceed against a
 * server reporting any other `network_id`. This is a project hard rule, not a
 * convenience — see CLAUDE.md. Do not parameterise the endpoint.
 */

import { encode, encodeForSigning } from "ripple-binary-codec";
import { deriveKeypair, deriveAddress, sign } from "ripple-keypairs";

/** Standard Devnet. Not a parameter. See the header. */
const DEVNET_WS = "wss://s.devnet.rippletest.net:51233";
const DEVNET_FAUCET = "https://faucet.devnet.rippletest.net/accounts";
const DEVNET_NETWORK_ID = 2;

let ws: WebSocket | undefined;
let nextId = 0;
const pending = new Map<number, (v: any) => void>();

export async function connect(): Promise<void> {
  ws = new WebSocket(DEVNET_WS);
  await new Promise<void>((resolve, reject) => {
    ws!.onopen = () => resolve();
    ws!.onerror = () => reject(new Error(`could not connect to ${DEVNET_WS}`));
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string);
    const cb = pending.get(m.id);
    if (cb) {
      pending.delete(m.id);
      cb(m);
    }
  };
  await assertDevnet();
}

export function rpc(command: Record<string, unknown>): Promise<any> {
  if (!ws) throw new Error("call connect() first");
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws!.send(JSON.stringify({ id, ...command }));
  });
}

export function close(): void {
  ws?.close();
  ws = undefined;
}

/**
 * Refuse to run against anything but Devnet. An endpoint typo that silently
 * reached mainnet would violate the project's one hard rule, so fail loudly
 * rather than trusting the constant above.
 */
async function assertDevnet(): Promise<void> {
  const info = await rpc({ command: "server_info" });
  const id = info.result?.info?.network_id;
  if (id !== DEVNET_NETWORK_ID) {
    close();
    throw new Error(
      `refusing to proceed: expected network_id ${DEVNET_NETWORK_ID} (Devnet), got ${id}`,
    );
  }
}

/** Fund a throwaway account and wait until it exists in a validated ledger. */
export async function faucet(): Promise<{ address: string; seed: string }> {
  const res = await fetch(DEVNET_FAUCET, { method: "POST" });
  if (!res.ok) throw new Error(`faucet returned ${res.status}`);
  const body = (await res.json()) as any;

  const address: string = body.account?.classicAddress ?? body.account?.address;
  // Gotcha 1: top-level `seed`, not `account.secret`.
  const seed: string = body.seed ?? body.account?.secret;
  if (!address || !seed) throw new Error(`unexpected faucet response: ${JSON.stringify(body)}`);

  // Gotcha 2: poll the *validated* ledger. Without this the first submit
  // fails tefPAST_SEQ and the cause is not obvious from the error.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const info = await rpc({ command: "account_info", account: address, ledger_index: "validated" });
    if (info.result?.account_data) return { address, seed };
  }
  throw new Error(`faucet account ${address} never appeared in a validated ledger`);
}

export type SubmitResult = { engine: string; message: string; hash?: string; raw: any };

/**
 * Autofill, sign and submit. `tx` may override any field — pass `Account` and
 * `Sequence` explicitly to submit as an account whose key you do not hold
 * (which is how the pseudo-account `tefBAD_AUTH` result in E-39 was produced).
 *
 * Fee defaults to 5000 drops, comfortably above the 100-drop confidential
 * minimum (E-5) plus load scaling. Raise it for LoanSet, which charges per
 * counterparty signature.
 */
export async function submit(tx: Record<string, any>, seed: string): Promise<SubmitResult> {
  const kp = deriveKeypair(seed);
  const address = deriveAddress(kp.publicKey);

  const [info, current] = await Promise.all([
    rpc({ command: "account_info", account: address, ledger_index: "validated" }),
    rpc({ command: "ledger_current" }),
  ]);

  const filled = {
    ...tx,
    Account: tx.Account ?? address,
    Sequence: tx.Sequence ?? info.result?.account_data?.Sequence,
    Fee: tx.Fee ?? "5000",
    LastLedgerSequence: tx.LastLedgerSequence ?? current.result.ledger_current_index + 20,
    SigningPubKey: kp.publicKey,
  };
  if (filled.Sequence === undefined) {
    throw new Error(`no Sequence for ${filled.Account} — is it funded and validated?`);
  }

  const signed = { ...filled, TxnSignature: sign(encodeForSigning(filled), kp.privateKey) };
  const res = await rpc({ command: "submit", tx_blob: encode(signed) });

  return {
    engine: res.result?.engine_result ?? "(none)",
    message: res.result?.engine_result_message ?? "",
    hash: res.result?.tx_json?.hash,
    raw: res.result,
  };
}

/**
 * Poll until the transaction is in a validated ledger. Returns null on timeout.
 *
 * Note a `tef*` result never reaches a ledger and will always time out here —
 * that absence is itself evidence, not a failure of this function.
 */
export async function waitValidated(hash: string, tries = 25): Promise<any | null> {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await rpc({ command: "tx", transaction: hash });
    if (res.result?.validated) return res.result;
  }
  return null;
}

/** Pull the created ledger entry of a given type out of transaction metadata. */
export function createdNode(meta: any, ledgerEntryType: string): any | undefined {
  return (meta?.AffectedNodes ?? [])
    .map((n: any) => n.CreatedNode)
    .find((c: any) => c?.LedgerEntryType === ledgerEntryType);
}

// Smoke test — proves the whole path end to end in about 15 seconds.
if (import.meta.main) {
  await connect();
  console.log(`connected to ${DEVNET_WS}, network_id ${DEVNET_NETWORK_ID} confirmed`);
  const account = await faucet();
  console.log(`funded ${account.address}`);
  const res = await submit({ TransactionType: "AccountSet" }, account.seed);
  console.log(`AccountSet => ${res.engine} ${res.message}`);
  if (res.hash) {
    const validated = await waitValidated(res.hash);
    console.log(`validated => ${(validated?.meta ?? validated?.metaData)?.TransactionResult}`);
  }
  close();
}
