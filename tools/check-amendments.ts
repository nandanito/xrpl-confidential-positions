#!/usr/bin/env bun
/**
 * check-amendments.ts — query the live `feature` RPC across XRPL networks.
 *
 * Closes GAP-1 from TASK-ZERO-2026-08-13.md. Amendment state is a reading,
 * not knowledge: this prints a date-stamped table and writes a JSON snapshot
 * so a later claim can cite the exact observation it rests on.
 *
 *   bun run tools/check-amendments.ts
 *   bun run tools/check-amendments.ts --json > docs/task-zero/amendments-$(date +%F).json
 *
 * The open question this answers: is ConfidentialTransfer votable or enabled on
 * standard Devnet? It is plausible and it is NOT verified. Read, do not assume.
 *
 * Requires no dependencies beyond Bun's built-in WebSocket.
 *
 * Run this by hand the first time and read the raw output. You need to know
 * what an unmodified `feature` response looks like to recognise a wrong
 * automated answer later.
 */

const NETWORKS: Record<string, string> = {
  // Was wss://xrplcluster.com — that cluster's middleware rejects `feature`
  // with {"error":"noPermission","generator":"xrplcluster.com middleware"},
  // which the runner reported as UNREACHABLE and would read like a disabled
  // amendment. s1.ripple.com is Ripple's own canonical public server and
  // answers `feature` in full. Verified 2026-08-16.
  mainnet: "wss://s1.ripple.com:51233",
  testnet: "wss://s.altnet.rippletest.net:51233",
  devnet: "wss://s.devnet.rippletest.net:51233",
  // A dedicated "Confidential Devnet" appeared in the RippleX prerelease docs
  // and its faucet is now dead. The canonical xrpl.org page names no dedicated
  // network. Do NOT re-add a guessed endpoint here — an unreachable host
  // reported as a failure reads like a disabled amendment, which is worse than
  // no data. If a dedicated network is confirmed to exist, add it with a
  // verified endpoint and say where the endpoint came from.
};

/** Amendments W-CONF and W-PQ care about. Names must match rippled's. */
const WATCHED = [
  "MPTokensV1",
  "MPTokensV2", // XLS-82 MPT DEX integration
  "DynamicMPT", // XLS-94
  "ConfidentialTransfer", // XLS-96
  "Credentials", // XLS-70
  "PermissionedDomains", // XLS-80
  "PermissionedDEX", // XLS-81
  "LendingProtocol", // XLS-66
  "SingleAssetVault", // XLS-65
  "TokenEscrow",
  "BatchV1_1", // XLS-56
  "PermissionDelegationV1_1", // XLS-75
  "Sponsor", // XLS-68
  "PriceOracle", // XLS-47
  "SmartEscrow", // XLS-100 — expected absent from every network
];

type FeatureEntry = {
  enabled?: boolean;
  supported?: boolean;
  name?: string;
  vetoed?: boolean | string;
  majority?: number;
  count?: number;
  threshold?: number;
  validations?: number;
};

type Row = {
  amendment: string;
  id: string | null;
  enabled: boolean | null;
  supported: boolean | null;
  majority: number | null;
  note: string;
};

async function queryFeature(
  url: string,
  timeoutMs = 20_000,
): Promise<Record<string, FeatureEntry>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(url);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {}
      reject(new Error(`timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      fn();
    };

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id: 1, command: "feature" }));
    });

    ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String((ev as MessageEvent).data));
        if (msg.status === "error") {
          done(() => reject(new Error(msg.error_message ?? msg.error)));
          return;
        }
        const features = msg.result?.features;
        if (!features) {
          done(() => reject(new Error("no result.features in response")));
          return;
        }
        done(() => resolve(features));
      } catch (e) {
        done(() => reject(e as Error));
      }
    });

    ws.addEventListener("error", () => {
      done(() => reject(new Error("websocket error")));
    });
  });
}

/** rippled keys `features` by amendment ID; the human name is inside. */
function rowsFor(features: Record<string, FeatureEntry>): Row[] {
  const byName = new Map<string, { id: string; e: FeatureEntry }>();
  for (const [id, e] of Object.entries(features)) {
    if (e?.name) byName.set(e.name, { id, e });
  }

  return WATCHED.map((amendment) => {
    const hit = byName.get(amendment);
    if (!hit) {
      return {
        amendment,
        id: null,
        enabled: null,
        supported: null,
        majority: null,
        note: "not known to this server",
      };
    }
    const { id, e } = hit;
    const notes: string[] = [];
    if (e.enabled) notes.push("ENABLED");
    else if (e.majority) notes.push(`majority since ledger ${e.majority}`);
    else if (e.supported) notes.push("supported, not enabled");
    else notes.push("not supported by this server");
    if (e.vetoed) notes.push("vetoed");
    if (typeof e.count === "number" && typeof e.threshold === "number") {
      notes.push(`${e.count}/${e.threshold} of ${e.validations ?? "?"}`);
    }
    return {
      amendment,
      id,
      enabled: e.enabled ?? null,
      supported: e.supported ?? null,
      majority: e.majority ?? null,
      note: notes.join("; "),
    };
  });
}

const asJson = process.argv.includes("--json");
const observedAt = new Date().toISOString();
const snapshot: Record<string, unknown> = { observedAt, networks: {} };

for (const [name, url] of Object.entries(NETWORKS)) {
  if (!asJson) console.error(`\nquerying ${name} (${url}) ...`);
  try {
    const features = await queryFeature(url);
    const rows = rowsFor(features);
    (snapshot.networks as Record<string, unknown>)[name] = {
      url,
      ok: true,
      totalKnown: Object.keys(features).length,
      rows,
    };
    if (!asJson) {
      console.log(`\n=== ${name} — observed ${observedAt} ===`);
      console.log(`server knows ${Object.keys(features).length} amendments`);
      for (const r of rows) {
        const flag = r.enabled ? "ON " : r.supported ? "off" : "-- ";
        console.log(`  [${flag}] ${r.amendment.padEnd(26)} ${r.note}`);
      }
    }
  } catch (err) {
    (snapshot.networks as Record<string, unknown>)[name] = {
      url,
      ok: false,
      error: String((err as Error).message ?? err),
    };
    if (!asJson) {
      console.log(`\n=== ${name} — UNREACHABLE ===`);
      console.log(`  ${(err as Error).message}`);
      console.log(`  Record this as a named gap. Do not substitute a guess.`);
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(
    `\nObserved at ${observedAt}. Paste this date alongside any claim that rests on it.`,
  );
  console.log(
    `An unreachable network is a named gap, not an absent amendment.`,
  );
}
