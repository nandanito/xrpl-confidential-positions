/**
 * The shape of the hosted build's snapshot, with no imports.
 *
 * ⚠ It is a separate file so the browser application can import the TYPES
 * without importing the node-side reader. `snapshot.ts` assigns its real values
 * to these types, so a change on either side that breaks the shape fails the
 * type-check rather than drifting (`CLAIMS.md` E-141's shape).
 */

export const SNAPSHOT_SCHEMA = "wconf-hosted-snapshot/1";

/** What the pinned ledger said about one demo account. */
export type AccountState = "present" | "account-missing" | "no-position" | "issuance-missing";

export interface HostedCiphertext {
  ciphertext: string;
  publiclyKnownZero: boolean;
  note: string;
}

/** `web/api/observer.ts`'s `ObserverView`, as the build serialises it. */
export interface HostedObserverView {
  account: string;
  issuanceId: string;
  publicAmount: string;
  registered: boolean;
  holderEncryptionKey?: string;
  confidentialBalanceVersion: number;
  spending: HostedCiphertext | null;
  inbox: HostedCiphertext | null;
  issuance: { issuer: string; confidentialOutstandingAmount: string; hasIssuerKey: boolean; hasAuditorKey: boolean };
  whatIsPublic: string[];
  whatIsHidden: string[];
}

export interface HostedAccount {
  address: string;
  label: string;
  note: string;
  state: AccountState;
  /** Present only when `state` is `present`. */
  observer: HostedObserverView | null;
  /** D-H3 option A: whether the mirror is on the ledger, never a figure. */
  issuerMirror: { present: boolean; ciphertext?: string } | null;
}

export interface HostedSnapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  /** When the build read the ledger, ISO 8601. */
  readAt: string;
  /** The public repository commit the build ran from. */
  commit: string;
  /**
   * The address this page is published at, which the page names so a copy
   * hosted elsewhere can be told from it (`ADR-0004`, "Copies").
   */
  canonicalUrl: string;
  source: { endpoint: string; networkId: number; buildVersion: string; ledgerIndex: number };
  issuance: {
    id: string;
    exists: boolean;
    issuer?: string;
    confidentialOutstandingAmount?: string;
    issuerEncryptionKey?: string;
    hasAuditorKey?: boolean;
  };
  accounts: HostedAccount[];
  /**
   * What the local tier's API serves from this repository's own text, baked at
   * build time so no page calls an API (`REVIEW-058` R2-9). Not ledger data.
   */
  repositoryText: {
    capabilities: { rows: any[]; invariants: any[]; disclosures: { masterSeed: string; derivationNotPublished: string }; namedGaps: { walletCodec: string } };
    custody: { flows: any[] };
  };
}
