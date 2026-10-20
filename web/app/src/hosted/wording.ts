/**
 * The hosted page's ledger-source risk wording, as the project owner accepted
 * it on 2026-10-19 (`ADR-0004` D-H2, `CLAIMS.md` E-331).
 *
 * ⚠ **Ruled text, rendered beside every ledger value.** `web/hosted/wording.test.ts`
 * compares it with the ADR's blockquote, so the page cannot drift from what was
 * accepted, and the hosted gate checks that every page showing a ledger value
 * carries it.
 */
export const DH2_WORDING: readonly string[] = [
  "This page shows the XRPL Devnet, a test network. Its tokens have no value, and " +
    "it is reset from time to time. Each value was read from Ripple's public Devnet " +
    "endpoint, at the ledger and date shown, and a lying or lagging server behind it " +
    "would have made it wrong. The page does not update: it shows Devnet as it was at " +
    "that ledger, not as it is now. Nothing on this page signs or submits. Do not use a " +
    "value shown here to build a transaction.",
  "Vercel, which hosts this page, sees your IP address and the pages you open.",
];

/** The network every hosted reading must come from. */
export const DEVNET_NETWORK_ID = 2;
