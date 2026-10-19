# Limitations and constraints — the read-only web tier

- **Date:** 2026-08-28
- **Subject:** architecture §6 step 8

⚠ **These are `CLAIMS.md` rows CITED, not restated.** A second copy of a claim is a second thing to go stale, and this project has thirteen recorded instances of exactly that. Where a row's text matters, read the row.

---

## What this artifact is

A **research artifact on the XRPL Devnet** (standard Devnet, network_id 2 — ⚠ there is no dedicated "Confidential Devnet" in use; `CLAUDE.md`'s hard rule, and this line named one until 2026-09-02). Not a product, not a pilot, not a reference implementation.

| constraint | row |
|---|---|
| Nothing here is trustless, non-custodial, decentralised, audited, production-ready or secure | **P-5** |
| Devnet only. No mainnet writes, at any phase, for any reason | `CLAUDE.md` hard rule |
| Amendment state is a reading, not knowledge — every claim resting on it carries a date | **P-3** |
| Not a compliance analysis in any jurisdiction | **P-6** |

**Amendment status as read on 2026-08-28T04:45:40.875Z:** `ConfidentialTransfer` **ENABLED** on Devnet. ⚠ That is a dated reading and nothing more; re-run `tools/check-amendments.ts` before relying on it.

---

## What the protocol does not hide

| claim you must not draw | row |
|---|---|
| That it hides identities. Sender and receiver are public | **P-4** |
| That it hides *who* transacts, *when*, or *how often* | **P-11** |
| That a holder is private from the issuer. The decryption mirror is mandatory | **P-9** |
| That keys can be rotated or recovered. XLS-96 supports neither, at any level | **P-10** |
| That a freshly-initialised balance is hidden — it is publicly identifiable as exactly zero | **F-1** |
| That retiring in tranches hides tranche sizes — each amount is plaintext | **F-24** |

---

## What the web tier itself does not establish

- **It signs nothing, so it demonstrates nothing about signing.** The confirmation flow, the hedged nonces, the key wiping and the proof generation are all in `wconf-signer` and are evidenced by that crate's tests and by validated Devnet transactions — not by anything on a screen here.
- **A demonstration of the happy path is not evidence of confidentiality.** That is what the observer harness is for, and the observer view here reports its result rather than replacing it.
- **The gate that keeps this tier read-only is LEXICAL and over a NAMED SET.** `tools/check-web-readonly.ts` prints its own limits: it cannot see a socket path assembled at runtime, it does not read dependencies, its needle sets are named, and it checks source rather than behaviour.
- ⚠ ~~**The trust-boundary decision has had no adversarial review.**~~ **IT HAS, 2026-09-02 — `REVIEW-036`, four legs, and the claim was RULED UNSOUND** (E-230). **What replaced it: the tier adds no SIGNING authority. A DISCLOSURE boundary moved and is open** (E-228). The original note read: `ADR-0003` is `Proposed`, and the session that wrote it is the session that built against it. Its central claim — that a read-only tier moves no boundary — is stated for attack, not settled.

---

## Named gaps, carried rather than closed

| gap | where |
|---|---|
| Whether any wallet build's bundled codec can serialise XLS-0096 types — **not determinable from published sources**, and deliberately **not** part of why a wallet cannot hold a position | **E-206** |
| The keygen derivation is not a published standard, so a holder with their seed and not this repository cannot reconstruct their key | issue **#10**, open |
| Who holds a standalone viewing key — the question a custody model forces, unreviewed | **E-117** |
| No Metaco Harmonize primary sources exist in this repository; every Harmonize specific is a dated gap | `docs/research/CUSTODY-2026-08-28.md` |
| The custody demo mode is a **simulation** — no integration, no MPC, no HSM | **P-5** |

---

## The ledger-source condition, and why it is disclosed on every page

A wrong ledger read is a **confidentiality break, not a rejected transaction** (**F-23**, executed on Devnet 2026-08-19). A substituted destination key makes the amount encrypt to the substituter and land on the ledger permanently.

So the project's own condition is a loopback node. ⚠ **When this tier reads a remote endpoint it does so under a named risk acceptance** (**E-151**), it prints the disclosure, and it stamps the view as **not** meeting that condition. **A view that says `underB15Conditions: false` is not evidence about the condition it fails.**

---

## One piece of vocabulary that must not leave this repository

**`tapFailHard` is this project's shorthand and is not a real name.** The string appears **zero** times in rippled. The submission parameter is `fail_hard`; the internal apply flag is `TapFailHard`. It escaped into a public upstream filing once (**E-156**), and a user interface is the most likely thing yet to leak project vocabulary outward — which is why `web/api/disclosure.test.ts` fails if it appears in rendered copy.
