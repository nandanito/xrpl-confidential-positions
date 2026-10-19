/**
 * observer-harness.ts — exactly what a full-ledger observer can see.
 *
 * CLAUDE.md requires this: *"a demo of the happy path is not evidence of
 * confidentiality"*. This is the counterpart to `issuer-decrypt-balance.ts` —
 * that one shows what the issuer sees, this one shows what everybody sees.
 *
 *   bun run tools/observer-harness.ts <account> <MPTokenIssuanceID>
 *   bun run tools/observer-harness.ts <account> <id> --assert-encrypted-zero
 *
 * ## It holds no keys, and it links no XLS-96 cryptography
 *
 * That is the point. An observer has neither. It uses general-purpose primitives
 * — `@noble/hashes` for SHA-256 and `@noble/curves` for secp256k1 — and nothing
 * from mpt-crypto: no vendored C library, no WASM module, no secret. The
 * canonical `EncZero` is recomputed from three PUBLIC inputs: the holder's
 * registered encryption key, the AccountID and the MPTokenIssuanceID.
 *
 * *(An earlier version of this comment said "links no cryptography library",
 * which was false — it links two. REVIEW-006 caught it.)*
 *
 * ## Its second test is randomness reuse
 *
 * `--assert-no-r-reuse` scans the account's confidential transactions and fails
 * if the ElGamal encryption randomness `r` was ever reused. It needs no key:
 * `C1 = r*G` is on the wire, so reuse is visible to anyone, and when it happens
 * the DIFFERENCE between two hidden amounts falls out by subtraction and a
 * bounded discrete log. Executed against deliberately-broken transactions on
 * Devnet — see `CLAIMS.md` E-63 and `tools/spike-randomness-2026-08-18/`.
 *
 * This is a self-check as much as an audit: our own signer could regress into
 * it, and nothing on the ledger would complain. rippled accepts reused `r`.
 *
 * ## Its first test is F-1
 *
 * `CLAIMS.md` F-1 says the reset/initialised balance value is the canonical
 * `EncZero`, recomputable by anyone, so such a balance is **publicly known to be
 * exactly zero** — contradicting documentation that called it indistinguishable.
 * `--assert-encrypted-zero` exits non-zero unless that is demonstrated on live
 * ledger state, which is what "a test that fails if the claim is false" means
 * here.
 *
 * ## What this tool is NOT allowed to imply
 *
 * Read `CLAIMS.md` P-4, P-9 and P-11 before changing any output string. Amounts
 * are hidden. Identities, timing, counterparties and transaction frequency are
 * not, and the issuer can always decrypt. The report says so out loud on every
 * run because a confidentiality demo that omits it is the failure mode this
 * repository exists to avoid.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { decodeAccountID, encodeAccountID } from "ripple-address-codec";

const DEVNET_WS = "wss://s.devnet.rippletest.net:51233";
const DEVNET_NETWORK_ID = 2;

/**
 * Which node to observe from.
 *
 * ⚠ **The default is the PUBLIC endpoint and that is correct for an observer.**
 * This tool models what anybody with a block explorer can see, and anybody is
 * not running our node. `--endpoint` exists for the other case: `CLAIMS.md`
 * B-15's step-7 ruling puts the FACILITY's reads on loopback, and a report about
 * the facility that came from a different node than the facility used is a
 * report about a different view of the ledger.
 *
 * ⚠ It also changes what the report is evidence OF. Against the public endpoint
 * this says *"here is what the world sees"*. Against loopback it says *"here is
 * what our own node holds"* — which is the honest thing to compare the
 * facility's own reads against, and is **weaker** as a confidentiality claim
 * because a node the operator controls is not an adversary.
 */
function endpointFrom(args: string[]): string {
  const i = args.indexOf("--endpoint");
  if (i < 0) return DEVNET_WS;
  const e = args[i + 1];
  if (!e) { console.error("--endpoint needs a WebSocket URL"); process.exit(2); }
  return e;
}

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex").toUpperCase();
const unhex = (s: string) => Uint8Array.from(Buffer.from(s, "hex"));

/**
 * The canonical encrypted zero, recomputed from public inputs alone.
 *
 * Mirrors `generate_canonical_encrypted_zero` in mpt-crypto `src/elgamal.c:440`:
 *   r  = SHA-256("EncZero" || accountID[20] || mptIssuanceID[24])
 *        rejection-sampled by re-hashing until r is a valid secp256k1 scalar
 *   C1 = r*G
 *   C2 = r*Q          (the m*G term vanishes because m = 0)
 *
 * Reimplemented rather than linked because `generate_canonical_encrypted_zero`
 * is NOT exported by the WASM build or by `@xrplf/mpt-crypto` — see
 * UPSTREAM-FEEDBACK U-34. The reimplementation is checked byte-for-byte against
 * live ledger state on every run that finds a zero balance, so a divergence
 * shows up as a failing assertion rather than as a silently wrong report.
 */
export function canonicalEncZero(holderKeyHex: string, account: string, issuanceIdHex: string): string {
  if (!/^[0-9A-Fa-f]{48}$/.test(issuanceIdHex)) throw new Error("MPTokenIssuanceID must be 48 hex characters (24 bytes)");
  if (!/^[0-9A-Fa-f]{66}$/.test(holderKeyHex)) throw new Error("holder encryption key must be 66 hex characters (33 bytes)");
  const input = new Uint8Array(51);
  input.set(new TextEncoder().encode("EncZero"), 0);
  input.set(decodeAccountID(account), 7);
  input.set(unhex(issuanceIdHex), 27);

  // Retry path mirrors upstream exactly: it re-hashes the 32-byte digest, not
  // the 51-byte buffer — `EVP_Digest(deterministic_scalar, kMPT_HALF_SHA_SIZE, …)`
  // with kMPT_HALF_SHA_SIZE == 32, and its own comment reads "chain-hash the
  // 32-byte previous output". REVIEW-006's Codex leg claimed otherwise and was
  // wrong; the source citation is in that record. NOTE: this branch fires with
  // probability ~2^-128 and is therefore NOT covered by any test here.
  let r = sha256(input);
  while (!isValidScalar(r)) r = sha256(r);

  const G = secp256k1.Point.BASE;
  const Q = secp256k1.Point.fromHex(holderKeyHex);
  const scalar = BigInt("0x" + hex(r));
  const c1 = G.multiply(scalar).toRawBytes(true);
  const c2 = Q.multiply(scalar).toRawBytes(true);
  return (hex(c1) + hex(c2)).toUpperCase();
}

/** Flip one bit of an AccountID and re-encode it, for the negative control. */
function perturbedAccount(account: string): string {
  const raw = Uint8Array.from(decodeAccountID(account));
  raw[0] ^= 0x01;
  return encodeAccountID(raw);
}

function isValidScalar(b: Uint8Array): boolean {
  const n = BigInt("0x" + hex(b));
  return n > 0n && n < secp256k1.CURVE.n;
}

// --------------------------------------------------------------------------

// ⚠ Assigned by `connect()` before any `rpc()` call, which `tsc` cannot see.
// The definite-assignment assertion records that invariant rather than hiding
// it: calling `rpc` before `connect` throws, and always did. Added 2026-08-28
// when architecture §6 step 8 imported `canonicalEncZero` from this file and
// pulled it into the repository type-check for the first time.
let ws!: WebSocket;
let nextId = 0;
const pending = new Map<number, (v: any) => void>();
const rpc = (cmd: Record<string, unknown>): Promise<any> => {
  const id = ++nextId;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, ...cmd })); });
};

async function connect(endpoint: string = DEVNET_WS) {
  ws = new WebSocket(endpoint);
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error(`cannot reach ${endpoint}`)); });
  ws.onmessage = (e) => { const m = JSON.parse(e.data as string); const cb = pending.get(m.id); if (cb) { pending.delete(m.id); cb(m); } };
  const info = await rpc({ command: "server_info" });
  const id = info.result?.info?.network_id;
  if (id !== DEVNET_NETWORK_ID) { ws.close(); throw new Error(`refusing to proceed: network_id ${id}, expected ${DEVNET_NETWORK_ID}`); }
  return info.result.info;
}

const CIPHERTEXT_FIELDS = ["ConfidentialBalanceSpending", "ConfidentialBalanceInbox", "IssuerEncryptedBalance", "AuditorEncryptedBalance"] as const;

/** Transaction fields carrying a 66-byte ElGamal pair, C1(33) || C2(33). */
const TX_ELGAMAL_FIELDS = [
  "SenderEncryptedAmount", "DestinationEncryptedAmount",
  "IssuerEncryptedAmount", "AuditorEncryptedAmount", "HolderEncryptedAmount",
] as const;

const C1of = (ct: string) => ct.slice(0, 66);
const C2of = (ct: string) => ct.slice(66, 132);

/**
 * Recover d from d*G by bounded search, the same trick the library ships for
 * its own decryption. Returns null if |d| exceeds the range.
 */
function smallDlog(target: any, range: number): number | null {
  if (target.equals(secp256k1.ProjectivePoint.ZERO)) return 0;
  const G = secp256k1.ProjectivePoint.BASE;
  let acc = secp256k1.ProjectivePoint.ZERO;
  const neg = target.negate();
  for (let d = 1; d <= range; d++) {
    acc = acc.add(G);
    if (acc.equals(target)) return d;
    if (acc.equals(neg)) return -d;
  }
  return null;
}

/**
 * Find ElGamal encryption randomness reused ACROSS transactions.
 *
 * Within a single Send, C1 is shared across participants by design and that is
 * not reuse (CLAIMS.md E-4/F-13) — so a C1 only counts if it appears in more
 * than one distinct transaction.
 */
function findReusedR(txs: any[]) {
  const byC1 = new Map<string, { hash: string; field: string; ct: string }[]>();
  for (const t of txs) {
    const tx = t.tx_json ?? t.tx;
    const hash = t.hash ?? tx?.hash;
    if (!tx || !hash) continue;
    for (const f of TX_ELGAMAL_FIELDS) {
      const ct = tx[f];
      if (typeof ct !== "string" || ct.length !== 132) continue;
      const k = C1of(ct);
      if (!byC1.has(k)) byC1.set(k, []);
      byC1.get(k)!.push({ hash, field: f, ct });
    }
  }
  const reused: { c1: string; entries: { hash: string; field: string; ct: string }[] }[] = [];
  for (const [c1, entries] of byC1) {
    if (new Set(entries.map((e) => e.hash)).size > 1) reused.push({ c1, entries });
  }
  return reused;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const assertZero = args.includes("--assert-encrypted-zero");
  const assertNoReuse = args.includes("--assert-no-r-reuse");
  const endpoint = endpointFrom(args);
  const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--endpoint");
  const [account, issuanceIdRaw] = positional;
  const issuanceId = issuanceIdRaw?.toUpperCase();  // rippled returns uppercase hex; accept either
  if (!account || !issuanceId) {
    console.error("usage: bun run tools/observer-harness.ts <account> <MPTokenIssuanceID> [--endpoint wss://…] [--assert-encrypted-zero] [--assert-no-r-reuse]");
    process.exit(2);
  }

  const info = await connect(endpoint);
  console.log(`# Observer harness — everything below is public\n`);
  console.log(`observed from: ${endpoint}${endpoint === DEVNET_WS ? "  (the public endpoint — what anybody sees)" : "  (⚠ NOT the public endpoint: a node someone chose)"}\n`);
  console.log(`network_id ${info.network_id}, rippled ${info.build_version}, ledger ${info.validated_ledger?.seq}`);
  console.log(`observer holds: no private key, no encryption key, no library beyond SHA-256 and secp256k1\n`);

  const iss = (await rpc({ command: "ledger_entry", mpt_issuance: issuanceId, ledger_index: "validated" })).result?.node;
  if (!iss) { console.error(`no MPTokenIssuance ${issuanceId}`); process.exit(1); }
  console.log(`## The issuance, in clear`);
  for (const k of ["Issuer", "Flags", "MaximumAmount", "OutstandingAmount", "ConfidentialOutstandingAmount", "TransferFee", "DomainID"])
    if (iss[k] !== undefined) console.log(`  ${k.padEnd(32)} ${iss[k]}`);
  console.log(`  ${"IssuerEncryptionKey".padEnd(32)} ${iss.IssuerEncryptionKey ? "present — the issuer can decrypt every balance" : "absent"}`);
  console.log(`  ${"AuditorEncryptionKey".padEnd(32)} ${iss.AuditorEncryptionKey ? "present — a third party can decrypt every balance too" : "absent"}`);
  if (iss.ConfidentialOutstandingAmount !== undefined)
    console.log(`\n  Note: ConfidentialOutstandingAmount is PLAINTEXT. The total value held confidentially\n  across all holders is public, even though no individual balance is.`);

  const objs = await rpc({ command: "account_objects", account, ledger_index: "validated", type: "mptoken" });
  const mpt = (objs.result?.account_objects ?? []).find((o: any) => o.MPTokenIssuanceID === issuanceId);
  if (!mpt) { console.error(`\n${account} holds no MPToken for ${issuanceId}`); process.exit(1); }

  console.log(`\n## The holder's position, as an observer sees it`);
  console.log(`  ${"Account".padEnd(32)} ${mpt.Account}`);
  console.log(`  ${"public MPTAmount".padEnd(32)} ${mpt.MPTAmount ?? 0}   <- NOT hidden`);
  console.log(`  ${"HolderEncryptionKey".padEnd(32)} ${mpt.HolderEncryptionKey ?? "(not registered)"}`);
  console.log(`  ${"ConfidentialBalanceVersion".padEnd(32)} ${mpt.ConfidentialBalanceVersion ?? 0}   <- counts balance-changing transactions`);
  for (const f of CIPHERTEXT_FIELDS) if (mpt[f]) console.log(`  ${f.padEnd(32)} ${mpt[f].slice(0, 24)}…  (${mpt[f].length / 2} B, opaque without a key)`);

  // --- F-1 -----------------------------------------------------------------
  let provedZero = 0;
  let perturbationClean = true;
  console.log(`\n## F-1 — which of those "opaque" balances are publicly known to be zero?`);
  if (!mpt.HolderEncryptionKey) {
    console.log(`  no registered key, so no confidential state to test`);
  } else {
    const encZero = canonicalEncZero(mpt.HolderEncryptionKey, account, issuanceId);
    console.log(`  recomputed canonical EncZero from public inputs only:`);
    console.log(`    ${encZero.slice(0, 48)}…`);
    for (const f of CIPHERTEXT_FIELDS) {
      if (!mpt[f]) continue;
      // The issuer and auditor mirrors are encrypted to a DIFFERENT key, so the
      // holder-keyed EncZero cannot match them; only the holder-keyed balances
      // are testable this way.
      const holderKeyed = f === "ConfidentialBalanceSpending" || f === "ConfidentialBalanceInbox";
      if (!holderKeyed) { console.log(`    ${f.padEnd(30)} (encrypted to another party's key — not testable with this EncZero)`); continue; }
      const match = mpt[f] === encZero;
      if (match) provedZero++;
      console.log(`    ${f.padEnd(30)} ${match ? "*** EXACTLY ZERO, publicly ***" : "not the canonical zero (some non-zero value, or never reset)"}`);
    }

    // A match only means something if a WRONG input fails to match. Recompute
    // against a perturbed AccountID: it must collide with nothing. Without this
    // the assertion below could pass on a recomputation that returns a constant,
    // or on one that has silently drifted from upstream into some other fixed
    // value. This is the check that makes the positive result evidence.
    const wrong = perturbedAccount(account);
    const bogus = canonicalEncZero(mpt.HolderEncryptionKey, wrong, issuanceId);
    const collided = CIPHERTEXT_FIELDS.some((f) => mpt[f] === bogus);
    perturbationClean = !collided && bogus !== encZero;
    console.log(`  control: EncZero for a perturbed AccountID matches nothing on this object: ${perturbationClean}`);
  }

  // --- randomness reuse ----------------------------------------------------
  // No key needed. C1 = r*G is on the wire, so reuse is visible to anyone, and
  // when it happens the DIFFERENCE between two hidden amounts falls out.
  const allTx = (await rpc({ command: "account_tx", account, limit: 200, ledger_index_min: -1, ledger_index_max: -1 })).result?.transactions ?? [];
  const reused = findReusedR(allTx);
  let leaked = 0;

  console.log(`\n## Randomness reuse — was the same ElGamal r used twice?`);
  console.log(`  scanned ${allTx.length} transactions. C1 = r*G is public, so this needs no key.`);
  if (reused.length === 0) {
    console.log(`  no C1 appears in more than one transaction. Nothing recoverable this way.`);
    console.log(`  (C1 repeating WITHIN one Send is by design — see CLAIMS.md E-4/F-13 — and is not reuse.)`);
  } else {
    console.log(`  *** ${reused.length} reused C1 value(s) found. This is a signer defect. ***`);
    for (const { c1, entries } of reused) {
      const hashes = [...new Set(entries.map((e) => e.hash))];
      console.log(`\n  C1 ${c1.slice(0, 32)}…  in ${hashes.length} transactions:`);
      for (const h of hashes) console.log(`    ${h}`);
      // Subtract same-field ciphertexts from two different transactions: the
      // r*pk term cancels and (m - m')*G remains.
      for (const f of TX_ELGAMAL_FIELDS) {
        const inField = entries.filter((e) => e.field === f);
        if (inField.length < 2) continue;
        const [a1, b1] = inField;
        if (a1.hash === b1.hash) continue;
        try {
          const P = secp256k1.ProjectivePoint.fromHex(C2of(a1.ct));
          const Q = secp256k1.ProjectivePoint.fromHex(C2of(b1.ct));
          const d = smallDlog(P.subtract(Q), 100_000);
          if (d !== null) {
            leaked++;
            console.log(`    ${f}: the two hidden amounts differ by ${d} — recovered with no key`);
          } else {
            console.log(`    ${f}: difference exceeds the +/-100,000 search range`);
          }
        } catch { /* unparseable point; skip rather than guess */ }
      }
    }
    console.log(`\n  What this does and does not show: it recovers the DIFFERENCE between two`);
    console.log(`  amounts, not either amount, and it requires the signer to have reused r.`);
    console.log(`  It is not a break of XLS-96 as specified. rippled accepts reused r — there is`);
    console.log(`  no ledger-side defence — so this is entirely the signer's responsibility.`);
    console.log(`  See CLAIMS.md E-63 and issue #3.`);
  }

  // --- what confidentiality does not cover ---------------------------------
  const txs = await rpc({ command: "account_tx", account, limit: 200, ledger_index_min: -1, ledger_index_max: -1 });
  const conf = (txs.result?.transactions ?? []).filter((t: any) => String((t.tx_json ?? t.tx)?.TransactionType ?? "").startsWith("ConfidentialMPT"));
  console.log(`\n## What confidentiality does NOT cover — ${conf.length} confidential transactions visible`);
  console.log(`  ${"date".padEnd(22)} ${"type".padEnd(28)} ${"counterparty".padEnd(36)} tag`);
  for (const t of conf.slice(0, 12)) {
    const tx = t.tx_json ?? t.tx;
    const when = tx.date ? new Date((tx.date + 946684800) * 1000).toISOString().replace("T", " ").slice(0, 19) : "?";
    console.log(`  ${when.padEnd(22)} ${String(tx.TransactionType).padEnd(28)} ${String(tx.Destination ?? "—").padEnd(36)} ${tx.DestinationTag ?? ""}`);
  }
  console.log(`\n  Every row above is public: who transacted, with whom, when, how often, and any`);
  console.log(`  DestinationTag. Only the AMOUNTS are hidden. See CLAIMS.md P-4 and P-11.`);
  console.log(`  A holder is never private from the issuer — see P-9 and tools/issuer-decrypt-balance.ts.`);

  ws.close();

  if (assertNoReuse) {
    if (reused.length === 0) {
      console.log(`\nASSERTION PASSED: no ElGamal randomness reuse across ${allTx.length} transactions.`);
      if (!assertZero) process.exit(0);
    } else {
      console.error(`\nASSERTION FAILED: ${reused.length} reused C1 value(s); ${leaked} amount difference(s) recovered without a key.`);
      console.error(`The signer that produced these transactions reuses r. That is a defect in the`);
      console.error(`signer, not in the protocol, and no amount of ledger-side behaviour will fix it.`);
      process.exit(1);
    }
  }

  if (assertZero) {
    if (provedZero > 0 && perturbationClean) { console.log(`\nASSERTION PASSED: ${provedZero} balance(s) publicly identifiable as exactly zero, and the perturbed control matched nothing. F-1 holds.`); process.exit(0); }
    if (provedZero > 0 && !perturbationClean) {
      console.error(`\nASSERTION FAILED: a balance matched, but so did the perturbed control.`);
      console.error(`The match is therefore not evidence of anything. Suspect a broken recomputation.`);
      process.exit(1);
    }
    console.error(`\nASSERTION FAILED: no balance matched the recomputed canonical EncZero.`);
    console.error(`Either F-1 no longer holds, this recomputation has drifted from`);
    console.error(`mpt-crypto's generate_canonical_encrypted_zero, or this account simply has no`);
    console.error(`zero balance right now. Point it at a freshly-initialised or post-merge account.`);
    process.exit(1);
  }
}
