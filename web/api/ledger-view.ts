/**
 * The web tier's ledger reads — **the facility's path, not a second one.**
 *
 * `facility/src/loopback.ts` already carries B-15's obligation: it refuses a
 * non-loopback endpoint *before it connects*, it demands the risk-acceptance
 * sentence by name when the owner's amendment is in force, it refuses any
 * network but Devnet, and its `Snapshot` pins one validated index and checks
 * every answer came from it (E-103). ⚠ **Reimplementing any of that here would
 * produce a second reading of one obligation and the two would drift** — which
 * is `CLAIMS.md` E-141's shape. This module composes it instead.
 *
 * ⚠ **What a wrong read costs is a CONFIDENTIALITY break, not a rejected
 * transaction** (`CLAIMS.md` F-23, executed on 2026-08-19). That is why the
 * endpoint discipline is inherited rather than relaxed for a read-only tier:
 * the tier does not sign, but the values it *renders* are what a reader
 * believes, and a substituted key renders a lie.
 */

import { LoopbackLedger, Snapshot, LedgerRefusal, type MPTokenState, type IssuanceState, type NodeIdentity } from "../../facility/src/loopback.ts";

export { LedgerRefusal };
export type { MPTokenState, IssuanceState, NodeIdentity };

/** What the tier shows about its own ledger source. Rendered, never hidden. */
export interface SourceDisclosure {
  endpoint: string;
  isLoopback: boolean;
  networkId: number;
  buildVersion: string;
  /** ⚠ False means B-15's step-7 conditions are NOT met and the UI must say so. */
  underB15Conditions: boolean;
  note: string;
}

export class LedgerView {
  private constructor(
    private readonly ledger: LoopbackLedger,
    readonly disclosure: SourceDisclosure,
  ) {}

  static async open(endpoint = process.env.WCONF_LEDGER_ENDPOINT ?? "http://127.0.0.1:5005"): Promise<LedgerView> {
    const ledger = await LoopbackLedger.open(endpoint);
    const id = ledger.identity;
    return new LedgerView(ledger, {
      endpoint: ledger.endpoint,
      isLoopback: id.isLoopback,
      networkId: id.networkId,
      buildVersion: id.buildVersion,
      underB15Conditions: id.isLoopback,
      note: id.isLoopback
        ? "Loopback ledger source. B-15's step-7 condition is met for reads."
        : "⚠ REMOTE ledger source, under the project owner's named risk acceptance (CLAIMS.md E-151). " +
          "B-15's step-7 condition is NOT met and this view is not evidence about it. A hostile node " +
          "substitutes a key just as well over TLS (CLAIMS.md F-23).",
    });
  }

  /** One pinned validated index for everything a page renders together. */
  async snapshot(): Promise<Snapshot> {
    return this.ledger.snapshot();
  }
}
