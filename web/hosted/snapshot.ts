/**
 * The hosted demo's one pinned snapshot: `ADR-0004`, architecture §6 step 9.
 *
 * Runs at BUILD time, inside the isolated build, and never in a visitor's
 * browser. It opens the reader the local tier already uses
 * (`facility/src/loopback.ts`) against ONE named endpoint under the named risk
 * acceptance, pins one validated ledger, and reads every value the hosted pages
 * render from it. It writes public ledger data only.
 *
 * ⚠ **A failed read stops the build.** A negative read the pinned ledger
 * answered (`entryNotFound`, carrying that ledger's index) is recorded as what it
 * is: a missing account, a missing position or a missing issuance. Nothing is
 * substituted (`CLAUDE.md`: a substituted source is a corrupted one), and no
 * failed read is rendered as an empty account (architecture §6 step 9's
 * falsifier).
 *
 * ⚠ **No issuer figure.** D-H3 was ruled A (`CLAIMS.md` E-331). The snapshot
 * records whether `IssuerEncryptedBalance` is present and the key it is under,
 * both ledger readings, and holds no key and decrypts nothing.
 *
 *   WCONF_ACCEPT_REMOTE_LEDGER_RISK="<the sentence>" WCONF_HOSTED_COMMIT=<sha> \
 *   WCONF_HOSTED_CANONICAL_URL=https://<name>.vercel.app bun run web/hosted/snapshot.ts <out.json>
 */

import { writeFileSync } from "node:fs";
import { LoopbackLedger, LedgerRefusal } from "../../facility/src/loopback.ts";
import { observerView } from "../api/observer.ts";
import { DEMO_ACCOUNTS, DEMO_ISSUANCE, validDemoAccounts } from "../api/demo-accounts.ts";
import { CAPABILITY_MATRIX, INVARIANTS, MASTER_SEED_DISCLOSURE, DERIVATION_NOT_PUBLISHED, WALLET_CODEC_GAP } from "../api/capability.ts";
import { walkFlows } from "../api/custody-sim.ts";
import { SNAPSHOT_SCHEMA, type HostedAccount, type HostedSnapshot } from "./snapshot-types.ts";

export { SNAPSHOT_SCHEMA };
export type { HostedAccount, HostedSnapshot };

/**
 * The one ledger endpoint the hosted build may read. ⚠ A constant, not an
 * input: a second endpoint, as a fallback or otherwise, is a rotation trigger
 * (`ADR-0004` trigger 3), so no variable can name one.
 */
export const HOSTED_ENDPOINT = "https://s.devnet.rippletest.net:51234";

/** One account at the pinned ledger. Exported for tests. */
export async function readAccount(
  snap: { accountExists(a: string): Promise<boolean>; mptoken: (a: string, i: string) => Promise<any>; issuance: (i: string) => Promise<any>; index: number },
  account: { address: string; issuanceId: string; label: string; note: string },
  issuanceExists: boolean,
): Promise<HostedAccount> {
  const base = { address: account.address, label: account.label, note: account.note };
  if (!(await snap.accountExists(account.address))) {
    return { ...base, state: "account-missing", observer: null, issuerMirror: null };
  }
  if (!issuanceExists) return { ...base, state: "issuance-missing", observer: null, issuerMirror: null };
  const mpt = await snap.mptoken(account.address, account.issuanceId);
  if (!mpt) return { ...base, state: "no-position", observer: null, issuerMirror: null };
  const observer = await observerView(snap as any, account.address, account.issuanceId);
  return {
    ...base,
    state: "present",
    observer,
    issuerMirror: mpt.issuerEncryptedBalance
      ? { present: true, ciphertext: mpt.issuerEncryptedBalance }
      : { present: false },
  };
}

export async function takeSnapshot(commit: string, canonicalUrl: string, endpoint = HOSTED_ENDPOINT): Promise<HostedSnapshot> {
  if (endpoint !== HOSTED_ENDPOINT) throw new Error(`the hosted build reads ${HOSTED_ENDPOINT} and nothing else (ADR-0004 trigger 3)`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`WCONF_HOSTED_COMMIT must be a full 40-hex commit id, not ${JSON.stringify(commit)}`);
  if (!/^https:\/\/[a-z0-9.-]+\/?$/.test(canonicalUrl)) throw new Error(`WCONF_HOSTED_CANONICAL_URL must be an https origin, not ${JSON.stringify(canonicalUrl)}`);
  const accounts = validDemoAccounts();
  if (accounts.length !== DEMO_ACCOUNTS.length) throw new Error("a demo account failed its own format check; fix web/api/demo-accounts.ts");

  const ledger = await LoopbackLedger.open(endpoint);
  const snap = await ledger.snapshot();
  const readAt = new Date().toISOString();

  let issuanceExists = true;
  let iss: any = null;
  try {
    iss = await snap.issuance(DEMO_ISSUANCE);
  } catch (e) {
    if (!(e instanceof LedgerRefusal && e.code === "REFUSED_LEDGER_ENTRY_MISSING")) throw e;
    issuanceExists = false;
  }

  const out: HostedAccount[] = [];
  for (const a of accounts) out.push(await readAccount(snap, a, issuanceExists));

  return {
    schema: SNAPSHOT_SCHEMA,
    readAt,
    commit,
    canonicalUrl: canonicalUrl.replace(/\/$/, ""),
    source: {
      endpoint: ledger.endpoint,
      networkId: ledger.identity.networkId,
      buildVersion: ledger.identity.buildVersion,
      ledgerIndex: snap.index,
    },
    issuance: issuanceExists
      ? {
          id: DEMO_ISSUANCE,
          exists: true,
          issuer: iss.issuer,
          confidentialOutstandingAmount: iss.confidentialOutstandingAmountRaw,
          issuerEncryptionKey: iss.issuerEncryptionKey,
          hasAuditorKey: Boolean(iss.auditorEncryptionKey),
        }
      : { id: DEMO_ISSUANCE, exists: false },
    accounts: out,
    repositoryText: {
      capabilities: {
        rows: CAPABILITY_MATRIX,
        invariants: INVARIANTS,
        disclosures: { masterSeed: MASTER_SEED_DISCLOSURE, derivationNotPublished: DERIVATION_NOT_PUBLISHED },
        namedGaps: { walletCodec: WALLET_CODEC_GAP },
      },
      custody: walkFlows(),
    },
  };
}

if (import.meta.main) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: bun run web/hosted/snapshot.ts <out.json>");
  const snapshot = await takeSnapshot(process.env.WCONF_HOSTED_COMMIT ?? "", process.env.WCONF_HOSTED_CANONICAL_URL ?? "");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
  const states = snapshot.accounts.map((a) => `${a.label.split(" —")[0]}: ${a.state}`).join(", ");
  console.log(`snapshot: ledger ${snapshot.source.ledgerIndex} on ${snapshot.source.endpoint}, rippled ${snapshot.source.buildVersion}; ${states}`);
}
