<div align="center">

# W-CONF

### A Confidential MPT reference application for the XRP Ledger.

*Built to find out what XLS-96 actually hides — by execution, not by reading.*

[![License](https://img.shields.io/badge/license-Apache--2.0-3b82f6)](LICENSE)
[![Network](https://img.shields.io/badge/network-Devnet%20only-e11d48)](#amendment-status)
[![Spec](https://img.shields.io/badge/XLS--0096-Final-22c55e)](https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0096-confidential-mpt)
[![Signer](https://img.shields.io/badge/signer-Rust-000000?logo=rust&logoColor=white)](signer/)
[![Runtime](https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Status](https://img.shields.io/badge/status-research%20artifact-6366f1)](#what-is-open)

[**What it hides**](#what-xls-96-hides-and-what-it-does-not) · [**Run it**](#run-it) · [**Findings**](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md) · [**What is open**](#what-is-open) · [**Claims register**](CLAIMS.md)

</div>

---

> **Public history starts at publication.** This repository was developed privately from 2026-08-16 and published on 2026-10-19 as two commits: the tree, and its revision log regenerated from this history. The commit hashes cited in `CLAIMS.md` and `docs/reviews/` refer to that private archive and do not resolve here. Issues #1 to #13 were copied from the archive in order, so the issue numbers cited here resolve; the ten closed ones are stubs.

**A confidential receivables facility on the XRP Ledger.** A bank opens a facility; suppliers enrol, draw down against invoices and repay; the facility retires in tranches. Every position is an encrypted balance on a public ledger. It has run on Devnet, and the point of building it was to establish exactly what an outside observer sees while it does.

**The short answer: XLS-96 hides balances and the amounts of confidential transfers, and nothing else, and even a balance is recognisable when it holds the canonical encrypted zero.** Converting into or out of confidential form publishes the amount in plaintext. Who pays whom, when and how often is public. The issuer can decrypt every balance. The details, with evidence, are [below](#what-xls-96-hides-and-what-it-does-not).

> ⚠ **Devnet only. No mainnet writes, at any phase.** This repository has not been audited, is not production-ready, and is not safe to put value behind.

It exercises Multi-Purpose Tokens (XLS-33) and Confidential Transfers (XLS-96, specified in the document XLS-0096, `Final` since 2026-09-03, read on 2026-10-18: E-1) together. It does not use Credentials (XLS-70) or Permissioned Domains (XLS-80).

> **Citations.** Ids such as *(E-58)* point to rows of [`CLAIMS.md`](CLAIMS.md), the register that governs what this project may claim: **E** is established evidence, **F** a finding, **P** a standing prohibition, **B** a blocker, open or ruled, and **R** a correction to something this project claimed earlier. Where this README and a row disagree, the row wins. Bare issue numbers are issues on this repository.

<details>
<summary><b>Terms, if you are new to XLS-96 or the XRPL</b></summary>

| term | meaning here |
|---|---|
| **MPT** | Multi-Purpose Token (XLS-33). `MPTokenIssuance` defines a token; an `MPToken` is one holder's position in it. |
| **Confidential balance** | A balance held as an ElGamal ciphertext on the ledger. Each holder has two: a *spending* balance and an *inbox* that receives transfers, folded in by `ConfidentialMPTMergeInbox`. |
| **`sk_A`** | A holder's ElGamal secret key. It decrypts that holder's balance and is needed to prove a `ConfidentialMPTSend`. |
| **Convert / Send / ConvertBack** | `ConfidentialMPTConvert` moves plaintext into confidential form, `ConfidentialMPTSend` moves a hidden amount between holders, `ConfidentialMPTConvertBack` moves it back out. Only Send hides its amount. |
| **Encrypted zero (`EncZero`)** | The canonical ciphertext of zero, which anyone can recompute. It is written on first initialisation, merge reset and clawback only. |
| **Proofs** | `Send` carries a 192-byte compact sigma proof and a 754-byte aggregated Bulletproof; `ConvertBack` a 128-byte sigma and a 688-byte Bulletproof; `Convert` and `Clawback` a 64-byte proof each; `MergeInbox` none. |
| **`tec` codes** | A `tec` result is *applied to the ledger*: it consumes a sequence number and its fields persist, ciphertexts included. |
| **`fail_hard`** | The submission parameter that asks a node to discard a failing transaction instead of applying it. Internal documents here use `tapFailHard` as shorthand for it; see [`docs/VOCABULARY.md`](docs/VOCABULARY.md). |
| **Dedicated Account** | The facility's own holding account. It is not an XLS-65 `Vault`, which cannot hold confidential balances. |
| **UDS** | Unix domain socket, a local channel no browser API can open. |
| **Loopback** | A node or service on the same machine, reached at `127.0.0.1`. |

</details>

---

## What XLS-96 hides, and what it does not

This section is about the **protocol**. Where it describes this project's own demonstration, it says so.

**Hidden.** Individual holder balances, and the amounts moved by confidential transfers.

**Public, always.** The sender and receiver of every transfer; the transaction type; the token; total supply and total confidential supply; the amount of every conversion into or out of confidential form; and the fact and timing of every transfer, so how often anyone transacts.

**Who can decrypt every balance.** The issuer, always: every confidential balance carries a mandatory encrypted mirror under the issuer's key. An auditor too, if one is named. This was executed, not inferred: holder, issuer and auditor each decrypted the same balance, at two different balances (E-58). Registered keys cannot be rotated (E-9), and only one auditor is supported (E-11). Whether naming an auditor can be undone is unknown; this project has not searched for it (P-12).

**What the issuer can do without consent.** If the issuance allows clawback, burn any holder's entire confidential balance; it is destroyed, not credited to anyone (E-12, E-21). This project's issuances allow it, so in every demonstration here the issuer can. And unless an issuance was created with its flags made immutable, which this project's were not, the issuer can also freeze balances by enabling `CanLock` and locking, which `DynamicMPT` allows after creation (E-290, E-292; read at source, not executed).

**Who can spend.** Only the holder of `sk_A`: a `ConfidentialMPTSend` proof cannot be made without it (E-33). Where `sk_A` is derived from the holder's XRPL master seed, whoever holds that seed holds it too. The demonstration does not show holder-only custody, because its facility driver plays every party and holds every seed. And a hostile process running as the same user can read `sk_A` out of memory.

**Lost keys.** If a holder loses `sk_A`, the balance cannot be spent, and XLS-96 has no rotation or recovery (P-10); the only remedy is issuer clawback, which destroys the balance. A draft standard, XLS-99, proposes holder key rotation and key-loss recovery; on 2026-10-20 its amendment was in rippled `develop` as not supported, and Mainnet, Testnet and Devnet did not know it (E-341). A key derived from the master seed under this project's own construction can be re-derived from that seed, but the derivation is not a published standard (issue #10).

**A zero balance can be visible.** Encrypted zero is written to a balance field in three cases: the spending balance on first initialisation, the inbox when `MergeInbox` empties it, and the whole position on clawback. Each is recognisable on sight, so enrolment is publicly visible (F-1). A balance spent down to zero holds a randomised encryption of zero and is not recognisable (E-211).

**In short, it hides how much each supplier draws and owes, not who borrows, when, or the size of the float.** The float, because converting it into confidential form publishes the amount, every retirement tranche, and every bank–supplier relationship with its timing, so how often each supplier draws, are public. Each supplier's limit and the sizes of its drawdowns and outstanding balance are not; this project once claimed more was hidden (R-1). The public perimeter still bounds the interior by arithmetic: convert in 500, receive nothing, convert back 400, and anyone knows the other 100 is either still held or has left by confidential transfer. [`WHAT-CONFIDENTIAL-MEANS`](docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md) sets this out at length.

**What this is not:** non-custodial, trustless, private from the issuer, or anonymous. It is not audited, not production-ready, and not compliant with any regulation.

### Before opting in

A holder's first `ConfidentialMPTConvert` commits them three ways. The first and third are irreversible; the second lasts while any holder of the issuance has a non-zero confidential balance:

1. It registers an encryption key that **can never be changed**.
2. It blocks deleting their `MPToken`, and so locks its reserve, **while any holder of the issuance has a non-zero confidential balance**. XLS-0096 §7.2 and rippled's source agree: a holder's own deletion fails with `tecHAS_OBLIGATIONS` until the issuance's `ConfidentialOutstandingAmount` is zero, which no single holder controls. Read at XLS-0096 `58ccd30` and rippled 3.3.0, not executed, and not re-read at the 3.4.1 Devnet now runs (F-29, E-316).
3. It publishes the converted amount **in plaintext**.

---

## How it fits together

```
  ONE machine. The demonstration runs every role locally; that is a property
  of the demo, not of the design.
 ┌────────────────────────────────────────────────────────────────────────┐
 │                                                                        │
 │   web/app          web/api             ┌────────────────────────────┐  │
 │   TanStack Start   Elysia              │  signer/  wconf-signer     │  │
 │   React 19  ──────▶ READ-ONLY   ──────▶│  Rust binary               │  │
 │   :3000      HTTP   :3011        UDS   │                            │  │
 │                        │    Status,    │   ElGamal secret  sk_A     │  │
 │                        │    and only   │   XRPL account key         │  │
 │   facility/            │    Status     │   proof generation         │  │
 │   TypeScript ──────────┼───────────────▶   transaction signing      │  │
 │   holds every          │          UDS  │   per-transaction          │  │
 │   party's seed         │    Pair,      │     confirmation UI        │  │
 │        │               │    Prepare    │   reads, never submits     │  │
 │        │               │               └─────────────┬──────────────┘  │
 └────────┼───────────────┼─────────────────────────────┼─────────────────┘
          │ submits       │ reads                       │ reads
          ▼               ▼                             ▼
          XRPL Devnet — network_id 2, rippled 3.4.1 when read on 2026-10-18
```

The signer answers three requests. `Pair` opens a grant: a named set of operations, valid for a limited time and only on that socket connection. `Prepare` asks for one transaction under a grant; the signer builds it, shows it to the holder and returns the signed bytes. `Status` carries no authority.

- **[`signer/`](signer/)** — a Rust binary on the holder's machine. Each instance holds one participant's `sk_A` and XRPL key; in the demonstration the facility writes each party's profile and starts one signer per party. It builds the proofs and signs, and shows what it is about to sign in its own window, parsed from the transaction it built, so a caller that lies in its request cannot get a different transaction confirmed. It refuses every network but Devnet. It reads the ledger and **never submits**, so whatever submits must set `fail_hard`: a failing confidential transaction applied as a `tec` lands on the ledger with its ciphertexts (F-23, E-149). The flag stops that at the ledger, not at the node the blob was handed to (F-28), and nothing forces a submitter to set it (B-15).
- **[`facility/`](facility/)** — the receivables facility: a Dedicated Account, supplier enrolment, drawdowns, repayments, an off-ledger balance book and retirement in tranches. It is a single-machine test driver that plays the bank, the Dedicated Account and every supplier, so it holds every seed and derives every party's `sk_A` from it. It sends the signer an operation, an issuance, a destination and an amount. The signer refuses a request that carries a seed, key or randomness field; that is a check over a named set of field names, not of what a value contains.
- **[`web/`](web/)** — a **read-only** viewer: `web/api` (Elysia, bound to loopback) and `web/app` (TanStack Start, React 19). It renders public ledger state, the observer's view, and an issuer page drawn from a snapshot that `tools/issuer-view-snapshot.ts` wrote; that page says whether the issuer's decryption succeeded, never the figure (E-241). It asks the signer for `Status` only, which [`tools/check-web-readonly.ts`](tools/check-web-readonly.ts) checks by reading `web/api`'s source; it cannot prove what is sent at run time.
- **[`tools/`](tools/)** — the observer harness; the issuer-view tools, which hold the issuer key (`issuer-view-snapshot.ts` writes the viewer's snapshot, `issuer-decrypt-balance.ts` prints a figure); the live amendment reader; and the repository's checks.

**The signer is a real boundary for the browser, and only for the browser.** No API available to a web page can open a Unix socket, so a script injected into the page cannot open the signer's socket; the most it can reach is `Status`, through `web/api`. That closes the path by construction rather than by an origin check, which any local process can forge. It does not stop an adversary with code execution on the holder's machine. The authority on the design is [`ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md).

---

## Run it

### The checks

You need [Bun](https://bun.sh) 1.3.14, `git` and `make`:

```bash
bun install --frozen-lockfile
make ci
```

`make ci` is what GitHub Actions runs: the type check, the TypeScript suites, and the repository checks that need neither the native build nor the local secret store. It checks for secrets by pattern only; the full sweep needs the maintainer's local secret store, and was run on the published commit. It skips the signer's tests and the checks that compile the signer, and reports as skipped the five facility tests that start one. On 2026-10-18 from a fresh clone, and on GitHub's first Linux run on 2026-10-19, it gave 227 pass, 0 fail and 5 skipped.

### The full build

Read the [demo script](docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md) first: it says what to show, in what order, and what not to claim. You need a Rust toolchain, `cmake`, `clang`, Homebrew `openssl@3` (the native build is macOS-only today) and network access to Devnet.

```bash
tools/rebuild-env.sh    # builds the patched mpt-crypto into /tmp/wconf
make signer             # cargo build
make web-api            # the read-only viewer: http://127.0.0.1:3011
make web-app            #                       http://127.0.0.1:3000
```

The signer links a patched fork of `mpt-crypto`, and the patch is committed. `make vendor-verify` checks the build tree's pin and which tracked files differ; it does not see untracked files or changes inside the files it allows, and `/tmp/wconf` is writable by any process running as you. Running the signer and the facility needs a holder profile and funded Devnet accounts, and this README does not walk through creating them: [`signer/README.md`](signer/README.md) documents the profile's fields and an onboarding command that prints its lines, and the demo script lists what has to exist first. Walkthroughs: [the facility](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md), [the web tier](docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md).

Measured on 2026-10-18: the signer's suite passes 279 tests with none failing; 4 more are ignored by default, three of which read live Devnet. The facility ran 28 validated transactions on Devnet on 2026-08-25, recorded in [`facility/README.md`](facility/README.md).

### Amendment status

This build needs `ConfidentialTransfer`. Read on 2026-10-18 ([snapshot](docs/task-zero/amendments-2026-10-18.json)):

| network | `ConfidentialTransfer` | `PermissionedDomains` | `SingleAssetVault` |
|---|---|---|---|
| **Devnet** | **enabled** | enabled | enabled |
| Testnet | supported, not enabled | enabled | supported, not enabled |
| Mainnet | supported, not enabled | enabled | supported, not enabled |

So Devnet is the only network where this can run. Amendment state changes; run `make check-amendments` for a current reading rather than trusting this table (P-3).

---

## What the research found

Seven findings about XLS-96, its reference implementation and its ecosystem: proof sizes and composition, why a large balance can decrypt faster than a small one, and where a confidential balance fails to compose with the ledger's vault and lending primitives. Three correct a reading this project first got wrong. None is a security claim about this project. **→ [`PROTOCOL-FINDINGS`](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md)**

Observations for the XLS-96 authors collect in [`UPSTREAM-FEEDBACK.md`](UPSTREAM-FEEDBACK.md). Eleven have been filed upstream since 2026-08-26; the four since 2026-09-28 were reviewed before filing, under [`docs/UPSTREAM-FILING-PROTOCOL.md`](docs/UPSTREAM-FILING-PROTOCOL.md). Their outcomes were re-surveyed on 2026-10-23 ([survey](docs/evidence/upstream-survey-2026-10-23/README.md)); one fix reached the English docs page and not its Japanese translation. Found a defect *here*? Open an issue on this repository.

---

## What is open

| open | what it means | tracked in |
|---|---|---|
| **The key derivation is unpublished** | A holder with their master seed but not this repository cannot reconstruct their key; treat it as lock-in until it is published | issue #10 |
| **No run against a local node** | Every Devnet read went to the public cluster, a risk the project owner accepted and recorded | B-15, E-151 |
| **The issuer snapshot is plaintext on disk** | The issuer-view CLI writes decrypted demo balances to a `0600` file, which any process running as the same user can read | E-212, E-241 |
| **Custody** | Accepted by the project owner, not solved: the issuer can erase or freeze the facility's float, and the Dedicated Account's seed both moves the float and decrypts it, so those two powers cannot be held apart (E-266) | B-27, [`CUSTODY`](docs/research/CUSTODY-2026-08-28.md) |
| **The `MPToken` reserve** | How much reserve the opt-in locks is not recorded here | — |
| **`ADR-0002`: the facility as application logic, not XLS-66** | Still `Proposed`, on one research question: whether upstream intends a confidential balance to stay invisible to vault accounting (XRPL-Standards #611) | [`ADR-0002`](docs/decisions/ADR-0002-facility-as-application-logic.md) |
| **Bulletproof blinding** | Whether the Bulletproof's blinding values may be derived deterministically, given that they carry its zero-knowledge property | issue #8 |
| **A frozen-token check before signing** | Whether the signer should detect `terFROZEN` before it signs | B-17 |

---

## Repository map

```
signer/            the holder signer (Rust): proofs, signing, key derivation
facility/          the confidential receivables facility (TypeScript)
web/api, web/app   the read-only viewer
tools/             the observer harness, the issuer-view CLI and the checks
docs/              architecture, decisions, explainers, research and review records
CLAIMS.md          the claims register: read it before quoting anything here
NOTICE             third-party material, which the Apache licence does not cover
```

`docs/reviews/` keeps this project's own review rounds as written, including the ones that found it wrong, with personal data and test secrets redacted where they appeared. They are not audits.

---

## Contributing, security and licence

[`CONTRIBUTING.md`](CONTRIBUTING.md) says what contributions are wanted and what a pull request must pass. [`SECURITY.md`](SECURITY.md) says how to report a vulnerability. [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) is the Contributor Covenant.

This project's own work is [Apache 2.0](LICENSE). Material reproduced from third parties is not: a patch against `XRPLF/mpt-crypto`, which carries no licence, and quotations of other projects' source and specifications in the records. [`NOTICE`](NOTICE) lists it, and [`LICENSES/`](LICENSES/) carries the notices it requires.

## Credit

XLS-0096 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, with the reference cryptography in [`XRPLF/mpt-crypto`](https://github.com/XRPLF/mpt-crypto). The compact sigma protocol behind the send proof's 192 bytes is the work of **Tess Dore and Murat Cenk** at RippleX Research, published separately from XLS-0096.

Upstream's Confidential Transfer implementation was reviewed by **Trail of Bits** in April 2026; several things this repository first recorded as findings turned out to be issues that review had already found and Ripple had fixed. A later revision of that report could not be obtained (B-13). Two further reviews exist whose full findings this project could not obtain: the Sherlock XRP Ledger Attackathon, a contest covering Confidential Transfers (contest 1260, B-30), and a Zellic scan of `mpt-crypto` (B-31); it has read only the findings that upstream issues cite by identifier. Of the three, only Trail of Bits' April report could be checked against this project's findings.

This repository analyses and builds on all of the above; it claims none of it.
