/**
 * The hosted application's ONLY data source: the build's one pinned snapshot,
 * compiled into the bundle by `vite.hosted.config.ts`.
 *
 * ⚠ **There is no fetch here, and none may be added for ledger data.** A page
 * that read the ledger at view time would send each visitor's requests to a
 * second party, which `ADR-0004` rules out under H3. `REVIEW-058` R2-9: the
 * local application reaches its API from every route, and this module is what
 * replaces that dependency rather than pointing it somewhere else.
 */
import snapshot from "virtual:wconf-snapshot";
import { DEVNET_NETWORK_ID } from "./wording";

if (snapshot.source.networkId !== DEVNET_NETWORK_ID) {
  // The build's reader refuses anything else; this is the page's own check.
  throw new Error(`the snapshot was read from network ${snapshot.source.networkId}, not Devnet`);
}

export const SNAPSHOT = snapshot;
