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
  "and future. XLS-96 has no key rotation and no key recovery (CLAIMS.md P-10), " +
  "so this cannot be undone by rotating anything.";

/**
 * ⚠ **Issue #10 is OPEN and no code discharges it.** The derivation is
 * specified in one repository document and is not a published standard.
 */
/**
 * ⚠ **A NAMED GAP, and it is deliberately NOT one of the reasons the wallet row
 * says no.** `CLAIMS.md` E-206: whether a given wallet build's bundled codec can
 * serialise the XLS-0096 types is **not determinable from any published
 * source** — the page-side SDKs (`@crossmarkio/sdk@0.4.0`, `@gemwallet/api@3.8.0`,
 * `xumm@1.8.0`) carry no codec dependency at all, so serialisation happens
 * inside a closed extension bundle whose version nobody publishes.
 *
 * ⚠ **It is excluded from the reasoning on purpose.** It is a version fact an
 * upstream release can close at any time; the three reasons the row DOES give
 * are structural, so no codec release closes them, and only a wallet that held
 * the viewing key and produced the proofs itself would (`CLAIMS.md` E-330).
 * A demonstration resting
 * on this one would be falsified by a release note.
 */
export const WALLET_CODEC_GAP =
  "Not determined: whether any given wallet build can serialise XLS-0096 transaction types. " +
  "The page-side SDKs carry no codec dependency, so serialisation happens inside the extension " +
  "and no vendor publishes that version. ⚠ This is NOT why a wallet cannot hold a confidential " +
  "position — the reasons above are structural, and this one is a version fact that could change " +
  "with any release. Determining it would need testing against a live extension build.";

export const DERIVATION_NOT_PUBLISHED =
  "The derivation is specified in one document in this repository and is not a " +
  "published standard. A holder who has their seed but not this repository " +
  "cannot reconstruct their key. Issue #10 is open and no code closes it.";

export const CAPABILITY_MATRIX: KeySourceRow[] = [
  {
    id: "derived-generated",
    label: "Generated demo seed, faucet-funded",
    profileToken: "derived-from-master-seed",
    existsToday: { built: true, where: "signer/src/onboarding.rs" },
    decryptOwnBalance: {
      verdict: "yes",
      detail: "The ElGamal secret is derived from the master seed, so the signer reconstructs it from the seed alone.",
      citation: "docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "yes",
      detail: "One seed yields both the ElGamal secret and the XRPL account key, which is the whole benefit the ruling trades for.",
      citation: "signer/src/keygen.rs; signer/src/onboarding.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "An ordinary XRPL account. Public MPT and Payment transactions are unaffected by any of this.",
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
      detail: "Identical to the generated case — the derivation does not care where the seed came from.",
      citation: "signer/src/keygen.rs",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "⚠ Conditional on the account's own key state. If it carries lsfDisableMaster, a regular key or a signer list, the master seed is NOT spending authority and the ruling's argument for deriving from it does not hold — the signer must warn, and refuses outright on lsfDisableMaster.",
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
      detail: "An independent ElGamal secret held in the profile. Two secrets to keep instead of one.",
      citation: "signer/src/onboarding.rs:279; signer/src/holder.rs:48",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "⚠ The ElGamal key decrypts and proves; it does not sign. The XRPL account key is still required and is a separate secret. This is the row a custody platform lands on, and who holds the ElGamal key then is CLAIMS.md E-117 — open and unreviewed.",
      citation: "CLAIMS.md E-117; signer/src/holder.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Unaffected — the ElGamal key has no role in a public transaction.",
      citation: "signer/src/xrpl.rs",
    },
    ruledDisclosure: null,
  },
  {
    id: "browser-wallet",
    label: "Browser wallet extension",
    profileToken: null,
    existsToday: { built: false, where: "not built — and the reasons are the demonstration" },
    decryptOwnBalance: {
      verdict: "no",
      detail:
        "Decryption needs the ElGamal secret. Under the ruled keygen that secret is derived from the master seed, and a wallet extension exists in order not to release seed material. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) gives a page a viewing key or decrypts for it. A wallet that derived the key and decrypted internally would; none observed does (CLAIMS.md E-329).",
      citation: "REVIEW-012 (derivation from master seed); ADR-0003 D2",
    },
    proveAndSign: {
      verdict: "no",
      detail:
        "A confidential operation needs the ElGamal secret AND the account key. The wallets examined can supply the second and not the first, so a page cannot assemble the operation through them. A wallet that held the viewing key and produced the proofs itself would close this; none observed does (CLAIMS.md E-329).",
      citation: "ADR-0003 D2; signer/src/keygen.rs",
    },
    publicTransactions: {
      verdict: "yes",
      detail:
        "Ordinary XRPL transactions are exactly what a wallet is for. Checked at the vendors' own docs 2026-08-28: GemWallet publishes signTransaction/submitTransaction, Crossmark publishes sign/submit/signAndSubmit, and Xaman accepts txjson and a pre-serialised txblob — all over arbitrary TransactionTypes.",
      citation: "gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)",
    },
    ruledDisclosure: null,
  },
  {
    id: "custody-simulated",
    label: "Custody platform (SIMULATED)",
    profileToken: "standalone",
    existsToday: { built: false, where: "⚠ SIMULATION — an external-signer stub. No MPC, no HSM, no integration." },
    decryptOwnBalance: {
      verdict: "conditional",
      detail:
        "⚠ Only via KeySource::Standalone, and that moves the question rather than answering it: the custody platform is not holding the ElGamal key, something else is. A custodied account CANNOT derive its own viewing key, because derivation needs the seed and never releasing the seed is what a custody platform is for.",
      citation: "REVIEW-012; CLAIMS.md E-117",
    },
    proveAndSign: {
      verdict: "conditional",
      detail:
        "⚠ Splits in two. The external signer can sign. It cannot evaluate a policy on the amount, because the amount is a proof rather than a value — 'require two approvers above $1M' is unevaluable on a ConfidentialMPTSend.",
      citation: "docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4",
    },
    publicTransactions: {
      verdict: "yes",
      detail: "Public transactions carry plaintext amounts, so a policy engine evaluates them normally. The tension is specific to confidential ones.",
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
  { rule: "P-4", text: "No key source hides identities. Sender and receiver are public on every confidential transaction." },
  { rule: "P-9", text: "No key source makes a holder private from the issuer. The issuer's decryption mirror is mandatory." },
  { rule: "P-10", text: "No key source supports rotation or recovery. XLS-96 supports neither, at any level." },
  { rule: "P-11", text: "No key source hides who transacts, when, or how often. Only amounts are hidden." },
  { rule: "F-1", text: "A freshly-initialised balance is publicly identifiable as exactly zero, whatever the key source." },
  { rule: "F-24", text: "Retiring a position in tranches publishes every tranche size — MPTAmount is plaintext on each ConvertBack." },
  { rule: "P-5", text: "None of this is secure, audited, non-custodial or production-ready, and the demo mode is a simulation." },
];
