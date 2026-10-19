/**
 * Known Devnet accounts, so the demonstration does not open on an empty form.
 *
 * ⚠⚠ **PUBLIC LEDGER DATA ONLY, AND THE OMISSION IS DELIBERATE.** An account
 * address and an `MPTokenIssuanceID` are readable by anyone with a block
 * explorer — that is `CLAIMS.md` P-4 and P-11, and rendering them gives nothing
 * away that the protocol was hiding.
 *
 * ⚠ **`/tmp/wconf/state.json` IS NOT READ AND MUST NOT BE.** That file holds
 * throwaway account seeds and ElGamal secrets. The addresses below were
 * transcribed from it by hand, once, and **the secrets stayed there** — a
 * read-only rendering tier that opens a file full of seed material has become
 * something else, whatever it does with the contents. If this list needs to
 * grow, transcribe the public fields again rather than teaching this process to
 * read that file.
 *
 * ⚠ **It is a convenience, not a registry.** The observer and issuer views take
 * any account and issuance; this only saves pasting 34 and 48 characters.
 */

export interface DemoAccount {
  address: string;
  issuanceId: string;
  label: string;
  /** What this account is useful for showing. Rendered, so it is a claim. */
  note: string;
}

/** The issuance every account below holds. */
export const DEMO_ISSUANCE = "004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder A — an active position",
    note:
      "A non-zero spending balance the public cannot read, and an inbox that is publicly " +
      "identifiable as exactly zero. The clearest single view of what is and is not hidden.",
  },
  {
    address: "rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder B — a derived-key account",
    note:
      "Onboarded under the ruled derivation, so its viewing key comes from its master seed. " +
      "The capability matrix's first row, on the ledger.",
  },
  {
    address: "rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder C — the ed25519 signing account",
    note:
      "The account the hedged-ed25519 work was executed on. Its ledger view is ordinary — which " +
      "is the point: a signature change is invisible to an observer.",
  },
  {
    address: "rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH",
    issuanceId: DEMO_ISSUANCE,
    label: "Holder D — an early spike account",
    note: "Kept because a second non-zero position makes the contrast legible rather than anecdotal.",
  },
];

/**
 * ⚠ **Every entry is checked to be a plausible address and issuance id before
 * it is served**, because a typo here renders as "this account holds nothing"
 * — which reads exactly like a true statement about the ledger.
 */
export function validDemoAccounts(): DemoAccount[] {
  return DEMO_ACCOUNTS.filter(
    (a) => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a.address) && /^[0-9A-F]{48}$/.test(a.issuanceId),
  );
}
