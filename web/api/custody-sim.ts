/**
 * The custody demo mode — architecture §6 step 8, decision D4.
 *
 * ⚠⚠ **THIS IS A SIMULATION AND EVERY VALUE IT RETURNS SAYS SO.** There is no
 * custody-platform integration behind it, no MPC and no HSM. It models a
 * **key-source shape** — a standalone ElGamal key plus an external signer — and
 * walks each flow to report which survive and which break, and why.
 *
 * ⚠ `CLAIMS.md` **P-5** forbids claiming more than is delivered, and
 * *"custody-compatible"* over a stub is exactly that kind of claim.
 * `disclosure.test.ts` fails if any surface stops saying this, and that test is
 * verified by breaking it.
 *
 * **What makes it more than a mock:** the verdicts are not hand-written per
 * flow. Each flow declares which *capabilities* it needs, and the verdict is
 * computed from what a custody-shaped key source actually has — so a flow added
 * later cannot be quietly marked "works".
 */

/** What a step of a flow requires. The only inputs a verdict is computed from. */
export type Requirement =
  | "xrpl-signature"        // the account key signs. A custody platform does this.
  | "elgamal-decrypt"       // read own confidential balance.
  | "elgamal-prove"         // produce the ZK proof over hidden values.
  | "policy-over-amount"    // an approval rule that reads the transferred value.
  | "policy-over-identity"  // an approval rule over destination, issuance or time.
  | "seed-material";        // the raw master seed must be available.

/**
 * What a **custody-shaped** key source has, and what it structurally cannot.
 *
 * ⚠ Derived from the two findings in `docs/research/CUSTODY-2026-08-28.md`, not
 * from a wish-list: seed material never leaves the platform (that is the
 * product), and an approval engine sees a proof rather than a value.
 */
export const CUSTODY_SHAPE: Record<Requirement, { available: boolean; because: string; caveat?: string }> = {
  "xrpl-signature": {
    available: true,
    because: "Signing is what a custody platform is for. The account key never leaves its boundary.",
  },
  "elgamal-decrypt": {
    available: true,
    because:
      "Only with a standalone ElGamal key, which moves the problem rather than solving it: something " +
      "outside the custody platform then holds a permanent decryption key for every balance this " +
      "account has held. Who that should be has had no review (CLAIMS.md E-117).",
    // ⚠ A flow that needs this survives only on that condition, so the walk
    // reports it on each flow. It was keyed on a "⚠" inside `because` until
    // 2026-10-20; the wording pass removed the marks, and a field cannot be
    // dropped by rewording a sentence.
    caveat: "Only with a standalone ElGamal key, held outside the custody platform (E-117).",
  },
  "elgamal-prove": {
    available: true,
    because: "The same standalone key. Proving needs the same secret decrypting does.",
  },
  "policy-over-amount": {
    available: false,
    because:
      "Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above " +
      "$1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds " +
      "only public data.",
  },
  "policy-over-identity": {
    available: true,
    because:
      "Destination, issuance and timing are public (CLAIMS.md P-4, P-11). Every policy over an " +
      "identity, a time or a count survives; every policy over a value does not.",
  },
  "seed-material": {
    available: false,
    because:
      "Structural in this simulation: a custody platform never releases seed material, so the account " +
      "cannot derive its own ElGamal key outside the platform. A platform that ran the derivation " +
      "inside its own boundary would change this, and that needs the derivation published (issue #10).",
  },
};

export interface Flow {
  id: string;
  label: string;
  requires: Requirement[];
}

export const FLOWS: Flow[] = [
  { id: "public-payment", label: "Send a public XRPL payment", requires: ["xrpl-signature"] },
  { id: "onboard-derived", label: "Onboard with the ruled derived key", requires: ["seed-material", "xrpl-signature"] },
  { id: "onboard-standalone", label: "Onboard with a standalone ElGamal key", requires: ["xrpl-signature", "elgamal-decrypt"] },
  { id: "read-own-balance", label: "Read own confidential balance", requires: ["elgamal-decrypt"] },
  { id: "confidential-send", label: "Send a confidential amount", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature"] },
  { id: "confidential-send-capped", label: "Send confidentially, under an amount-capped approval policy", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature", "policy-over-amount"] },
  { id: "confidential-send-allowlist", label: "Send confidentially, under a destination-allowlist policy", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature", "policy-over-identity"] },
  { id: "retire-tranches", label: "Retire a position in tranches", requires: ["elgamal-decrypt", "elgamal-prove", "xrpl-signature"] },
];

export interface FlowVerdict {
  id: string;
  label: string;
  survives: boolean;
  blockedBy: { requirement: Requirement; because: string }[];
  caveats: string[];
}

/** ⚠ Computed, never hand-written per flow. */
export function walkFlows(): { simulation: true; disclaimer: string; flows: FlowVerdict[] } {
  const flows = FLOWS.map((f) => {
    const blockedBy = f.requires
      .filter((r) => !CUSTODY_SHAPE[r].available)
      .map((r) => ({ requirement: r, because: CUSTODY_SHAPE[r].because }));
    const caveats = f.requires
      .filter((r) => CUSTODY_SHAPE[r].available && CUSTODY_SHAPE[r].caveat)
      .map((r) => CUSTODY_SHAPE[r].caveat!);
    if (f.id === "retire-tranches") {
      caveats.push(
        "Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).",
      );
    }
    return { id: f.id, label: f.label, survives: blockedBy.length === 0, blockedBy, caveats };
  });

  return {
    simulation: true,
    disclaimer:
      "SIMULATION. No custody platform is integrated behind this: no MPC and no HSM. It models a " +
      "standalone ElGamal key plus an external signer, to show which flows survive and which break. " +
      "See docs/research/CUSTODY-2026-08-28.md.",
    flows,
  };
}
