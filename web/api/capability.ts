/**
 * The capability matrix — architecture §6 step 8's spine.
 *
 * **What each key source can and cannot do, and why.** Every cell carries a
 * citation, and `web/api/capability.test.ts` checks that each citation
 * RESOLVES AND EXISTS — that the named file, register row, ADR or ruling is
 * there.
 *
 * ⚠⚠ **IT DOES NOT CHECK SEMANTIC SUPPORT, AND THIS COMMENT SAID IT DID UNTIL
 * 2026-09-04** (*"says what the cell claims"*, `CLAIMS.md` E-239). **A citation
 * to an existing but irrelevant file passes.** That is the exact shape this
 * project claims discipline against — a gate asserting more than it checks —
 * and it was found by an adversarial leg asked for the worst overclaim in the
 * repository.
 *
 * ⚠ **This is DERIVED from the signer's own types, not restated from a
 * handover table.** `KeySource` in `signer/src/onboarding.rs:274` has exactly
 * two variants — `DerivedFromMasterSeed` and `Standalone` — and an absent
 * `elgamal_key_source` reads as `standalone` rather than being upgraded
 * (`holder.rs:53`). The browser-wallet row is the one that does **not** exist
 * in the code, and saying so is the point of the row.
 *
 * ⚠ **`CLAIMS.md` P-4, P-9 and P-11 govern every sentence here.** This system
 * hides amounts. It does not hide who transacts, with whom, when or how often,
 * and no configuration makes a holder private from the issuer.
 */

export type Verdict = "yes" | "no" | "conditional" | "unverified";

export interface Capability {
  verdict: Verdict;
  /** One sentence. Rendered as-is; it is a disclosure surface. */
  detail: string;
  /** Where the claim comes from. A file, a ruling, or a `CLAIMS.md` row. */
  citation: string;
}

export interface KeySourceRow {
  id: string;
  label: string;
  /** The token an operator writes into a holder profile, or null if none exists. */
  profileToken: string | null;
  existsToday: { built: boolean; where: string };
  decryptOwnBalance: Capability;
  proveAndSign: Capability;
  publicTransactions: Capability;
  /** The ruled disclosure this source obliges, if any. */
  ruledDisclosure: string | null;
}

/**
 * ⚠ **`REVIEW-012` condition 2 is RULED, not optional**, and it is the reason
 * the derived rows carry a disclosure the standalone row does not. It must
 * reach the holder **before the seed is asked for**.
 */
export const MASTER_SEED_DISCLOSURE =
  "The master seed becomes a permanent decryption credential. Anyone who ever " +
  "holds it can decrypt every confidential balance this account has held, past " +
  "and future. XLS-96 has no key rotation and no key recovery (P-10), so this " +
  "cannot be undone.";

/**
 * ⚠ **Issue #10 is OPEN and no code discharges it.** The derivation is
 * specified in one repository document and is not a published standard.
 */
/**
 * ⚠ **A NAMED GAP, and it is deliberately NOT one of the reasons the wallet row
 * says no.** `CLAIMS.md` E-206: whether a given wallet build's bundled codec can
 * serialise the XLS-0096 types was **not determined** by the checks of 2026-08-28
 * — the page-side SDKs (`@crossmarkio/sdk@0.4.0`, `@gemwallet/api@3.8.0`,
 * `xumm@1.8.0`) carry no codec dependency at all, so serialisation happens
 * inside the extension, or for Xaman in its backend, and none of the three
 * page-side packages names the codec version (checked 2026-08-28, E-206).
 *
 * ⚠ **It is excluded from the reasoning on purpose.** It is a version fact an
 * upstream release can close at any time; the three reasons the row DOES give
 * are structural, so no codec release closes them, and only a wallet that held
 * the viewing key and produced the proofs itself would (`CLAIMS.md` E-330).
 * A demonstration resting
 * on this one would be falsified by a release note.
 */
export const WALLET_CODEC_GAP =
  "Not determined: whether a given wallet build can serialise XLS-0096 transactions. The " +
  "page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the " +
  "extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md " +
  "E-206). This is not why a wallet cannot hold a confidential position: the reasons above are " +
  "structural, and this one could change with any release.";

export const DERIVATION_NOT_PUBLISHED =
  "The derivation is specified only in this repository and is not a published " +
  "standard. A holder with their seed but without this repository cannot " +
  "reconstruct their key. Issue #10 tracks this.";

export const CAPABILITY_MATRIX: KeySourceRow[] = [
  {
    id: "derived-generated",
    label: "Generated demo seed, faucet-funded",
    profileToken: "derived-from-master-seed",
    existsToday: { built: true, where: "signer/src/onboarding.rs" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "The ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.",
      citation: "docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "yes",
      detail: "One seed gives both the ElGamal secret and the XRPL account key.",
      citation: "signer/src/keygen.rs; signer/src/onboarding.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "An ordinary XRPL account. Public transactions are unaffected.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: MASTER_SEED_DISCLOSURE,
  },
  {
    id: "derived-pasted",
    label: "Existing Devnet seed, pasted",
    profileToken: "derived-from-master-seed",
    existsToday: { built: true, where: "signer/src/onboarding.rs" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "Same as a generated seed: the derivation does not depend on where the seed came from.",
      citation: "signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "Only if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.",
      citation: "signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "An ordinary XRPL account.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: MASTER_SEED_DISCLOSURE,
  },
  {
    id: "standalone",
    label: "Standalone ElGamal key",
    profileToken: "standalone",
    existsToday: { built: true, where: "signer/src/holder.rs — KeySource::Standalone" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "A separate ElGamal secret kept in the profile: two secrets to keep instead of one.",
      citation: "signer/src/onboarding.rs:279; signer/src/holder.rs:48",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "The ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).",
      citation: "CLAIMS.md E-117; signer/src/holder.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Unaffected: the ElGamal key plays no part in public transactions.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: null,
  },
  {
    id: "browser-wallet",
    label: "Browser wallet extension",
    profileToken: null,
    existsToday: { built: false, where: "not built, for the reasons in this row" },
    decryptOwnBalance: {
      verdict: "no",
      detail:
        "Decrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).",
      citation: "REVIEW-012 (derivation from master seed); ADR-0003 D2",
    },
    proveAndSign: {
      verdict: "no",
      detail:
        "A Send, a ConvertBack and the first Convert, which registers the key, need the ElGamal secret as well as the account key; a MergeInbox or a later Convert needs only the account key (TASK ZERO §3; R-8). These wallets supply only the account key, so a page cannot assemble the first three through them, and without the first Convert there is no position. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).",
      citation: "ADR-0003 D2; signer/src/keygen.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail:
        "Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.",
      citation: "gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)",
    },
    ruledDisclosure: null,
  },
  {
    id: "custody-simulated",
    label: "Custody platform (simulated)",
    profileToken: "standalone",
    existsToday: { built: false, where: "Simulation: an external-signer stub. No MPC, no HSM, no integration." },
    decryptOwnBalance: {
      verdict: "conditional",
      detail:
        "Only with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.",
      citation: "REVIEW-012; CLAIMS.md E-117",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "The external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.",
      citation: "docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Public transactions carry plain amounts, so approval policies work as usual.",
      citation: "docs/research/CUSTODY-2026-08-28.md",
    },
    ruledDisclosure: null,
  },
];

/**
 * What every row shares, and what no key source changes.
 *
 * ⚠ **These are `CLAIMS.md` rows CITED, not restated.** A second copy of a
 * claim is a second thing to go stale, and this project has thirteen recorded
 * instances of exactly that.
 */
export const INVARIANTS = [
  { rule: "P-4", text: "No key source hides identities. The sender and receiver of every confidential transaction are public." },
  { rule: "P-9", text: "A holder is never private from the issuer. The issuer can always decrypt." },
  { rule: "P-10", text: "No key source supports rotation or recovery. XLS-96 supports neither." },
  { rule: "P-11", text: "No key source hides who transacts, when, or how often. Only amounts are hidden." },
  { rule: "F-1", text: "A newly created confidential balance is publicly identifiable as exactly zero." },
  { rule: "F-24", text: "Retiring a position in tranches publishes each tranche size." },
  { rule: "P-5", text: "None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation." },
];
