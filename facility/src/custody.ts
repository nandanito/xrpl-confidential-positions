/**
 * custody.ts — who can do what to the facility's float, printed on every run.
 *
 * `CLAIMS.md` B-27, ruled by the project owner on 2026-09-13: the custody risk
 * is **accepted by name** for this Devnet artifact, with a mandatory printed
 * disclosure, and no key split is built here. The inputs are
 * `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md` and
 * its review, `docs/reviews/REVIEW-046c-adjudication-custody-request-2026-09-13.md`.
 *
 * ⚠ **The disclosure names every holder REVIEW-046 and REVIEW-047 upheld, not only
 * the Dedicated Account's key.** The request it replaces described one key with two powers.
 * At source there are more holders, and the key that decrypts is also required
 * to spend. A disclosure that named one key would repeat the defect the review
 * existed to catch.
 *
 * ⚠ **Nothing here changes who holds anything.** It makes the holders visible.
 * `facility/tests/custody-disclosure.test.ts` fails if one of the powers it lists
 * drops out of the text or is negated, or if the print stops being the run's first
 * statement. ⚠ It knows only the powers it lists; a power nobody has found is not
 * in the list.
 */
export const CUSTODY_DISCLOSURE = [
  "⚠ CUSTODY OF THE FLOAT — ACCEPTED BY NAME, NOT SOLVED (CLAIMS.md B-27, ruled 2026-09-13)",
  "",
  "  Who can act on this facility's float. No power below is split between parties:",
  "",
  "  - The Dedicated Account's seed moves the whole float and reads every drawdown",
  "    and repayment amount. It signs each movement, and it derives the ElGamal",
  "    secret that the proof in every drawdown and every retirement requires.",
  "  - That ElGamal secret cannot be rotated, and losing it locks the confidential",
  "    balance for good (XLS-0096 §A.6).",
  "  - The bank, as issuer, can erase the Dedicated Account's confidential balance",
  "    with a confidential clawback. It can freeze it by enabling a lock and setting",
  "    it, or by requiring authorisation, which the Dedicated Account's token was",
  "    never given. Neither needs the Dedicated Account's seed. The freeze paths",
  "    are read in rippled 3.3.0 and have not been exercised here.",
  "  - The issuer's ElGamal secret reads every amount and every balance in the",
  "    issuance, and it cannot be rotated either.",
  "  - facility-book.json holds every confidential movement's amount and every",
  "    expected balance in plaintext. Anyone who can read it reads them all.",
  "  - Whoever controls the ledger source can make the signer encrypt an amount to",
  "    a key of their choosing (CLAIMS.md F-23).",
  "",
  "  Not powers over the float, stated so their absence is not read as an omission:",
  "  each supplier's seed reads and moves only that supplier's own balance and",
  "  amounts, and any receiving account, the Dedicated Account included, can refuse",
  "  transfers into itself.",
  "",
  "  This demo process holds every seed, the issuer's secret and the book, because",
  "  it plays every role, and so does anything running as this user that can read",
  "  ~/.wconf/facility-state.json. Devnet throwaways only. Nothing here is secure,",
  "  audited, non-custodial or production-ready (CLAIMS.md P-5).",
].join("\n");
