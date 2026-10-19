/**
 * Verify ripple-binary-codec@2.9.0's definitions.json against the live node's
 * server_definitions RPC. Cheap, real test: it either matches or it does not.
 */
import defs from "ripple-binary-codec/dist/enums/definitions.json" with { type: "json" };

const WS = "wss://s.devnet.rippletest.net:51233";

const ws = new WebSocket(WS);
await new Promise<void>((r, j) => {
  ws.onopen = () => r();
  ws.onerror = () => j(new Error("connect failed"));
});
const node: any = await new Promise((r) => {
  ws.onmessage = (e) => r(JSON.parse(e.data as string));
  ws.send(JSON.stringify({ id: 1, command: "server_definitions" }));
});
const nd = node.result;

const local: any = defs;

// --- transaction types ---
const confTx = Object.entries(local.TRANSACTION_TYPES as Record<string, number>)
  .filter(([k]) => k.startsWith("ConfidentialMPT"));
console.log("== ConfidentialMPT transaction types (local codec) ==");
for (const [k, v] of confTx) {
  const remote = nd.TRANSACTION_TYPES?.[k];
  console.log(`  ${k.padEnd(32)} local=${v} node=${remote ?? "ABSENT"} ${remote === v ? "MATCH" : "*** MISMATCH ***"}`);
}

// --- fields ---
const localFields = new Map<string, any>(local.FIELDS.map(([n, d]: any) => [n, d]));
const remoteFields = new Map<string, any>((nd.FIELDS ?? []).map(([n, d]: any) => [n, d]));

const confFieldNames = [...localFields.keys()].filter((n) =>
  /Confidential|Encrypt|ZKProof|Auditor|InboxCount|BlindingFactor|PedersenCommitment|Version/i.test(n),
);

console.log("\n== Confidential-related fields ==");
let mismatch = 0, absent = 0;
for (const n of confFieldNames.sort()) {
  const l = localFields.get(n), r = remoteFields.get(n);
  if (!r) { console.log(`  ${n.padEnd(34)} local=${l.nth}/${l.type} node=ABSENT`); absent++; continue; }
  const ok = l.nth === r.nth && l.type === r.type;
  if (!ok) mismatch++;
  console.log(`  ${n.padEnd(34)} local=${l.nth}/${l.type} node=${r.nth}/${r.type} ${ok ? "MATCH" : "*** MISMATCH ***"}`);
}
console.log(`\n${confFieldNames.length} fields checked: ${mismatch} mismatches, ${absent} absent from node`);

// --- full sweep: every field the codec knows vs the node ---
let allMismatch = 0;
for (const [n, l] of localFields) {
  const r = remoteFields.get(n);
  if (r && (l.nth !== r.nth || l.type !== r.type)) { allMismatch++; console.log(`FULL-SWEEP MISMATCH ${n}: ${l.nth}/${l.type} vs ${r.nth}/${r.type}`); }
}
console.log(`full sweep over ${localFields.size} codec fields: ${allMismatch} mismatches`);

// --- what the node says a ConfidentialMPTConvert looks like: dump ledger entry types too
console.log("\n== node TRANSACTION_TYPES containing 'Confidential' ==");
for (const [k, v] of Object.entries(nd.TRANSACTION_TYPES ?? {})) {
  if (k.includes("Confidential")) console.log(`  ${k} = ${v}`);
}
console.log("\n== node LEDGER_ENTRY_TYPES containing 'MPT' ==");
for (const [k, v] of Object.entries(nd.LEDGER_ENTRY_TYPES ?? {})) {
  if (k.includes("MPT")) console.log(`  ${k} = ${v}`);
}
ws.close();
