DO NOT USE ANY TOOLS. Everything you need is pasted below. You have no
repository, no internet, and no prior knowledge of this project.

# You are a reader, not a reviewer

You have just found this project. Read the documents below **once**, the way a
person actually reads a repository they are evaluating, and then answer six
questions **in your own words**.

⚠ **Do not review the writing. Do not look for defects. Do not be charitable
about what the authors probably meant.** Report what the text actually left you
believing. If a sentence is ambiguous, say which way you read it — **your wrong
reading is the finding, not your fault.**

## The six questions

1. **What has this project actually built?** What runs today?
2. **What does it claim is hidden, and from whom?** Be specific: hidden from the
   public? from the issuer? from the counterparty? Name what you think is
   concealed and what is visible.
3. **Would you describe this as secure?** Why or why not — and what in the text
   led you there?
4. **Who has to be trusted for this to work?** List every party.
5. **What is finished and what is not?** If you were asked to summarise its
   maturity in one sentence to a colleague, what would you say?
6. ⚠ **What did you find surprising, confusing, or contradictory?** Anything you
   had to read twice.

## Then, one more

**Quote the three sentences that most influenced your answers**, and for each,
say what you took it to mean.

⚠ **This is the whole job.** A previous round of this project found a false
disclosure sentence **not** because a reviewer flagged it, but because a reader
answering "what can an observer see?" wrote down an inference the text invited
and the inference was wrong. **You are that instrument.** Answer honestly and
plainly; do not perform expertise you do not have.

---

# THE DOCUMENTS


==============================================================
FILE: README.md
==============================================================

<div align="center">

# W-CONF

### A Confidential MPT reference application for the XRP Ledger.

*Built to find out what XLS-96 actually hides — by execution, not by reading.*

[![License](https://img.shields.io/badge/license-Apache--2.0-3b82f6)](LICENSE)
[![Network](https://img.shields.io/badge/network-Devnet%20only-e11d48)](#amendment-status)
[![Spec](https://img.shields.io/badge/XLS--0096-Draft-f59e0b)](https://github.com/XRPLF/XRPL-Standards)
[![Signer](https://img.shields.io/badge/signer-Rust-000000?logo=rust&logoColor=white)](signer/)
[![Runtime](https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Status](https://img.shields.io/badge/status-research%20artifact-6366f1)](#what-is-open)

[**Trust model**](#trust-model) · [**Run it**](#running-it) · [**Protocol findings**](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md) · [**What is open**](#what-is-open) · [**Claims register**](CLAIMS.md)

</div>

---

**A confidential receivables facility on the XRP Ledger.** A bank opens a facility. Suppliers enrol, draw down against invoices, and repay. Every position is an encrypted balance on a public ledger, and the facility retires in tranches. It has executed on Devnet, and the point of building it was to establish exactly what an outside observer sees while it happens.

**The answer: it hides the amount of a confidential *transfer*, and balances — and nothing else.** ⚠ **Converting in or out publishes the amount in plaintext, every time**; only a `Send` hides one, so the figure entering confidential form and every figure leaving it are public forever. Who paid whom, when, and how often are public forever; the issuer can decrypt every balance; and one asymmetry matters — a *freshly initialised* balance is publicly recognisable as zero while a *spent-down* one is not. That is the protocol, not a limitation of this build. [**Trust model**](#trust-model) sets it out in full, and it is the section to read before any other.

> ⚠ **Devnet only. No mainnet writes, at any phase, for any reason.**
> Nothing here is audited, production-ready, or safe to put value behind.

**What it exercises:** Multi-Purpose Tokens (XLS-33) and Confidential Transfers (XLS-96), together. ⚠ **Not Credentials (XLS-70) or Permissioned Domains (XLS-80)** — gating an issuance to credentialled accounts needs a `PermissionedDomainSet` and a credential per supplier, which is a separate milestone that has not been built. The issuance carries no `sfDomainID` and the facility says so when it runs.

**It has a second output.** Building carefully against a **Draft** specification — XLS-0096, created 2026-01-15, untouched upstream since 2026-08-10 as of the 2026-09-01 audit (E-1, E-216) — surfaces things its authors would want to know. Those accumulate in [`UPSTREAM-FEEDBACK.md`](UPSTREAM-FEEDBACK.md) and are filed under [`docs/UPSTREAM-FILING-PROTOCOL.md`](docs/UPSTREAM-FILING-PROTOCOL.md), held to a higher evidence bar than anything published here.

> **Reading the citations.** Claims here carry a row id from [`CLAIMS.md`](CLAIMS.md), the register that governs what this project may say. **`E-`** is established evidence, **`F-`** a finding about the protocol or its implementation, **`P-`** a standing prohibition — something this project may never claim — and **`B-`** an open blocker. `ADR-nnnn` is a decision record and `REVIEW-nnn` a review round, both under [`docs/decisions/`](docs/decisions/) and [`docs/reviews/`](docs/reviews/); bare issue numbers are issues on **this** repository. Where a sentence here disagrees with its register row, the row wins.

<details>
<summary><b>Terms used below, if you are new to XLS-96 or the XRPL</b> — click to expand</summary>

| term | what it means here |
|---|---|
| **MPT** | Multi-Purpose Token (XLS-33). `MPTokenIssuance` is the issuer's object defining one token; an `MPToken` is one holder's position in it. |
| **Confidential balance** | A holder's balance held as an ElGamal ciphertext on the public ledger rather than as a plaintext integer. Two of them per holder: a *spending* balance and an *inbox* that receives transfers. |
| **`sk_A`** | The holder's own ElGamal secret key — the `A` is for the account. It decrypts that holder's balance and is a required input to the proof for a `ConfidentialMPTSend`. |
| **Encrypted zero (`EncZero`)** | The *canonical* ciphertext of zero — fixed and recomputable by anyone from public inputs. ⚠ It is written on first-time initialisation, merge reset and clawback only. A balance spent down to zero is a randomised encryption of zero and is **not** recognisable, so `EncZero` identifies how a balance became zero, not whether it is. |
| **Convert / Send / ConvertBack** | `ConfidentialMPTConvert` moves plaintext into confidential form; `ConfidentialMPTSend` moves a hidden amount between holders; `ConfidentialMPTConvertBack` moves it back out. **Convert and ConvertBack publish their amounts in plaintext**; only Send hides one. |
| **Bulletproof / compact sigma** | The proofs a confidential transaction carries. **The composition differs per transaction type.** `Send`: a 192-byte compact sigma plus a 754-byte aggregated Bulletproof. `ConvertBack`: a 128-byte sigma plus a 688-byte Bulletproof. `Convert`: a 64-byte Schnorr key-possession proof. `Clawback`: a 64-byte issuer-side compact sigma — ⚠ **same size as `Convert`'s, different construct, different party**. `MergeInbox`: **no proof**. The Bulletproof dominates wherever there is one. |
| **`tec` / `ter` codes** | XRPL transaction results. ⚠ **A `tec` is *applied to the ledger*** — it consumes a sequence number and its fields persist — which is why a failed confidential transaction still publishes its ciphertexts, and why `fail_hard` matters. |
| **`fail_hard`** | The JSON submission parameter asking the node to discard a failing transaction rather than apply it. `TapFailHard` is the corresponding internal apply flag in rippled. ⚠ **Internal documents in this repository call this `tapFailHard`, which is this project's shorthand and appears zero times in rippled** — see [`docs/VOCABULARY.md`](docs/VOCABULARY.md). |
| **Family seed / master seed** | The base-58 secret an XRPL account is derived from. This project also derives the holder's ElGamal key from it, which is what makes the seed a permanent decryption credential. |
| **Dedicated Account** | The facility's own holding account. ⚠ **Never call it a vault**: an XLS-65 `Vault` cannot convert to confidential form, and XLS-0096's own unrelated use of *"Confidential Vault"* for this account has already pointed one reading at the wrong conclusion. |
| **UDS** | Unix domain socket. A local IPC channel that no browser API can open, which is the whole reason the signer uses one. |
| **XLS-65 / XLS-66** | The ledger's single-asset vault standard and its lending protocol. Both come up because a confidential balance does not compose with either. |
| **Amendment** | An XRPL protocol feature that must be voted on and enabled per network. Whether one is live is a *reading*, never knowledge. |

</details>

---

## Status — measured 2026-09-01

| | how it was counted |
|---|---|
| Signer test suite | **279 pass, 0 fail** — `cargo test`, run twice this session. A further **4 are `#[ignore]`d by default**, and they are the four that touch live Devnet, so the headline number excludes exactly the tests that exercise the network |
| TypeScript test suites | **207 pass, 0 fail** — `bun test facility web/api tools`, run twice this session |
| Type check | clean — `bunx tsc --noEmit` |
| Gates | **9 repository-wide gates, all green** this session. A tenth, `check-filing`, takes a document as an argument and so is run per draft, not per repository |
| Amendments | `ConfidentialTransfer`, `PermissionedDomains`, `SingleAssetVault` all **ENABLED** on Devnet, read `2026-09-01T14:24:51.393Z` — [snapshot committed](docs/task-zero/amendments-2026-09-01.json) |
| Devnet, inherited | **28 validated facility transactions**, 2026-08-25 — issuance and per-party reconciliation in [`facility/README.md`](facility/README.md). **6 signer run receipts**, one per milestone, in [`docs/runs/`](docs/runs/) |

**The first five rows were produced this session**, by the command or the tool named in each. **The last row was not** — those are dated artifacts from earlier sessions, quoted rather than re-counted. The gate list is in [The gates](#the-gates).

### Evidence a stranger can check without cloning anything

Devnet is a public ledger. Paste any hash below into an XRPL Devnet explorer. **All four re-queried and confirmed validated on 2026-09-01**, and the `MPTAmount` column is the disclosure argument in one place.

| what | `MPTAmount`, as the ledger stores it | hash |
|---|---|---|
| `ConfidentialMPTSend` — built, proved and signed by `signer/` | **absent; the amount is encrypted** | `9170912934A842CE90494E66485ADC82739B2276ECD48E2900A1F62A164F9DB0` |
| `ConfidentialMPTConvert` — entering confidential form | **`30`, in plaintext** | `79F16C9A160E920F6D60BE3B1B8ACE50F85D2FA39D26C173378EA34B6558A59A` |
| `ConfidentialMPTConvertBack` — one facility tranche | **`95`, in plaintext** | `34117EFEFE2EFE5446B5C3C66F8089C99298637D4E315B16780F82D77ABD7FB0` |
| `ConfidentialMPTConvertBack` — the next tranche | **`191`, in plaintext** | `C34363951C527E357E248B8D78712BF1740B895CFCB09FC4BC62A62F00C209BC` |

⚠ **Read rows two to four before believing anything is hidden.** Only the Send conceals its amount. Every entry into and exit from confidential form publishes its own figure, so retiring a facility in tranches publishes **every tranche size** — which this project first got wrong in its own walkthrough, where it was called *"the aggregate change"* (F-24).

**Re-run the commands rather than quoting the table.** A restated count going stale is this project's most-repeated defect, and every instance was written by an author who had the previous one in front of them (E-141, E-199, E-201, E-203, E-222, E-223). ⚠ **This sentence used to carry the running total and it went stale within one session** — the number lives in the register, which is the only place it can be kept true. The same applies to this document's prose: its status block asserted that no implementation existed while the signer was already running (E-222, with E-204 the analogous stale-scope incident).

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
                XRPL Devnet — network_id 2, rippled 3.3.0
```

`Pair` opens a grant — a named set of operations, with a time limit, valid only on that socket connection. `Prepare` asks for one transaction under an open grant: the signer builds it, shows it to the holder, and returns the signed bytes. `Status` asks the signer how it is, and carries no authority at all.

**The trust boundary is the signer process — and it is a real boundary for the browser application only.** Against `web/app` it holds by construction: no API available to a page can open a Unix socket. ⚠ **`web/api` is a server process and it does open one** — the gate is what keeps it to `Status`. **For the facility driver it does not hold in this demonstration, because that driver holds every party's seed**, and a boundary you are on both sides of is not protecting anything. That is a property of running every role on one machine, and it is why the facility is a test driver rather than a deployment.

- **[`signer/`](signer/)** — a Rust binary on the holder's machine. It holds **one** participant's ElGamal secret `sk_A` and XRPL account key, generates the proofs, and signs. ⚠ **In the single-host demonstration the facility driver spawns a signer per party**, writing that party's profile first — one process, one identity, several times over, not one daemon serving everyone.

  It **renders what it is about to sign in its own window**, parsed from the transaction it built rather than echoed from what the caller asked for. So a caller that lies *in its request* cannot get the wrong thing confirmed. Against the same-host adversary that is in scope, this is the last line rather than a guarantee — that adversary reads `sk_A` from memory and the screen is irrelevant.

  Grants are scoped by operation, by time and by the connection; closing the connection revokes them. It refuses every network but Devnet, at any phase, for any reason — `signer/src/ledger.rs` hardcodes `DEVNET_NETWORK_ID = 2` and errors on anything else.

  It reads the ledger and **never submits**: it returns a signed blob. Both halves matter. Reading its own state is what lets it confirm against the ledger rather than against the caller's claims; not submitting is why it cannot set `fail_hard`.

  Here is why that matters. A confidential transaction that fails with an **applied `tec`** — `tecBAD_PROOF` is the case this project executed — **lands on the ledger carrying its ciphertexts**, so one built against a substituted destination key publishes the amount encrypted to the substituter, permanently (F-23). ⚠ **Do not generalise that to every failure**: a `tem`, `ter` or `tel` is not applied, and B-17 records `terFROZEN` as one that is not. **`fail_hard` prevents the applied case** — read at rippled source and executed on Devnet, where the same signed bytes gave `applied=false` with the flag and `applied=true` without (E-149) — but it stops the `tec` at the **ledger**, not at the node you handed the blob to (F-28). **Whatever submits has to set the flag, and nothing forces it to.**

- **[`facility/`](facility/)** — the application logic: a Dedicated Account, supplier enrolment, drawdowns, repayments, an off-ledger balance book, and retirement in tranches. It builds intents, asks the signer over the socket, and submits what comes back.

  **It holds every party's XRPL family seed and derives every party's ElGamal secret**, because it plays the bank, the Dedicated Account and every supplier at once. A real facility is three parties on three machines; this is a single-machine test driver and should be read as one. What crosses the socket is narrower, and it is the claim that matters: an operation, an issuance, a destination and an amount go out. **No randomness, no key material and no seed** — the signer refuses those field *names* on the raw JSON before it parses the request. ⚠ **That is a lexical check over a named set**, the same species of instrument as the gates below, and it is the narrow claim: it says what the interface will not accept, not that the driver is trustworthy. A signed blob and a hash come back. The earlier version of this description claimed the driver held no secret; `REVIEW-022` called that *"a load-bearing boundary misstated"*.

- **[`web/`](web/)** — a **read-only** demonstration tier. `web/api` is Elysia bound to loopback; `web/app` is TanStack Start with React 19. It renders public ledger state and the observer view, and asks the signer `Status` and nothing else.

  This is the one place where *holding no key* is checked rather than intended. [`tools/check-web-readonly.ts`](tools/check-web-readonly.ts) asserts that **`web/api`** constructs `Status` and never `Pair` or `Prepare`; that **nothing anywhere under `web/`** reaches a signing call, reads a secret environment variable, decrypts, or spawns a process; and that **exactly one file under `web/api/` touches the socket** — discovered, not pinned by name. ⚠ **The Pair/Prepare scan covers `web/api` only, not the whole tier.** It also cannot prove what that one client sends at runtime, and says so itself. ⚠ **See the [open item](#what-is-open) for what that check does not reach.**

  **The first build violated it.** An unauthenticated `GET` decrypted on every request — the caller chose the account and got a plaintext balance back, which is a decryption oracle (E-212). The issuer key now lives in a CLI, [`tools/issuer-view-snapshot.ts`](tools/issuer-view-snapshot.ts), which decrypts a curated set once and writes a file; the tier renders that file, which is why the issuer view is a snapshot and not a live read. ⚠ **That closed the chosen-input decryption and not the disclosure** — see the [open item](#what-is-open).

- **[`tools/`](tools/)** — the observer harness, the issuer-view CLI (which does hold the issuer key; that is its job), the live amendment reader, and the gates.

**A browser page cannot reach the signer at all, because no API available to a page opens a Unix domain socket.** (`web/api` — a server process, despite the name — is the one thing in the tier that opens one.) That closes the XSS-to-spend-oracle path by construction rather than by an origin check — an allowlist constrains pages, not processes, and any local process can forge an `Origin` header. A hostile same-host process is inside this project's threat model by ruling (`REVIEW-003b`).

⚠ **The claim stops there.** This raises the bar from a leaked token to code execution on the holder's machine. It does **not** defeat an adversary who already has code execution — that adversary reads `sk_A` out of process memory. P-5 forbids calling any of this secure.

The authority on what is open, and on what each step may and may never touch, is [`docs/architecture/ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md) — revision 9.

---

## Trust model

Every sentence in this section is about the **protocol**. None of it is softened by anything being built, and each claim has a row in [`CLAIMS.md`](CLAIMS.md).

**What is hidden.** Individual holder balances. The amounts moved in confidential transfers.

**What is public. This is protocol, not design, and it is not conditional.** The sender and receiver of every transfer, always, with no option to hide them. The transaction type. The token. Total supply and total confidential supply. The amount of every conversion into or out of confidential form, in plaintext. **The fact and timing of every transfer — and therefore how often any participant transacts.**

**Who can decrypt every holder's balance.** The issuer, always: an encrypted mirror under the issuer's key is mandatory on every confidential balance, and no setting disables it. The auditor too, if one is named. This is executed rather than inferred — holder, issuer and auditor were each made to decrypt the same balance, twice, at two different balances (E-58). Registered encryption keys cannot be rotated once set, for any of the three (E-9), and only one auditor is supported (E-11). Whether *naming* an auditor can later be undone is a **named gap**: this project has not searched for the answer, and P-12 forbids asserting one without the search.

**What the issuer can do without holder consent.** If `lsfMPTCanClawback` is set on the issuance, destroy any holder's entire confidential balance at any time — burned, not transferred, crediting no account (E-12, E-21). The issuer can also clear the Permissioned Domain gate unilaterally (E-20). ⚠ **This project sets it, and that is the disclosure this sentence used to promise and not make.** `facility/run-facility.ts:323` creates the issuance with `tfMPTCanClawback`, and **both live issuances read `Flags=224` on the validated ledger** — the facility's `0048BEC2…537E` and the web tier's demo `004625C9…25E8`, checked 2026-09-02. **So in every demonstration this project has run, the issuer can burn any holder's entire confidential balance at will.**

**Who can spend a holder's balance.** At the protocol level, only that holder: the proof for a `ConfidentialMPTSend` cannot be produced without the sender's secret key (E-33), and that is the premise the whole custody argument rests on. The architecture puts that secret in a local signer on the holder's own machine.

⚠ **The executed demonstration does not show holder-only custody, and saying it does would be false.** `facility/src/facility.ts:38` — *"One process plays the bank, the Dedicated Account and every supplier, and therefore holds every seed … every security property that depends on the separation is **not demonstrated here**."* The property is a protocol fact and a design intention; it is not a thing this repository has demonstrated.

⚠ **Nor does the boundary stop a hostile process running as the same user.** That adversary is in scope, and it reads `sk_A` out of process memory — at which point the confirmation screen is irrelevant. What the per-transaction confirmation defends against is narrower and worth having: a **caller that lies over the socket**, which cannot get the wrong transaction confirmed because the signer renders the one it built.

⚠ **If a holder loses their key, the balance is permanently unspendable. XLS-96 has no key rotation and no key recovery, at any level** (P-10). The only remedy the protocol offers is issuer clawback, which destroys the balance rather than returning it. A separate and narrower sentence: where a holder's ElGamal key was *derived* from their XRPL master seed under this project's own construction, it is reconstructible from that seed — an application-level property of one derivation, not protocol recovery. Merging the two is a defect this project has shipped once (E-125), and the derivation is not a published standard, which is [an open item below](#what-is-open).

**A freshly-initialised confidential balance is publicly identifiable as exactly zero.** Encrypted zero has a fixed, canonical form that anyone can recompute from public inputs, so it can be recognised on sight. Demonstrated against live Devnet state on 2026-08-28, on two accounts at once, rather than asserted (F-1).

⚠ **The exact scope matters, and getting it wrong in either direction is a defect this project has shipped.** The canonical form appears on **first-time initialisation, merge reset and clawback** — so *enrolment* is publicly visible. It does **not** appear on a balance that reached zero by being spent or converted back: that is a homomorphic result, a randomised encryption of zero that looks like any other ciphertext. **So a balance can be exactly zero and not publicly identifiable as zero** (E-211), and the inverse reading — that a non-canonical ciphertext means a non-zero balance — is false and shipped on this project's own observer page for one commit.

**This is what the observer harness is for: a demo of the happy path is not evidence of confidentiality.**

### So what is confidential about it?

A fair challenge, and it deserves a direct answer. **It hides the shape of the book, not the size of the book.**

Picture a shared vault with a public scale at the door. Everything carried in or out is **weighed publicly**, a display shows the **total** inside, and cameras record **who** comes and goes and **when**. What nobody can see is **how much is in any individual bag**, or how much moves when one bag-holder hands value to another.

**The door is public for a reason.** A public ledger has to prove nobody minted value inside the vault, and it does that by keeping the running total in the clear — `sfConfidentialOutstandingAmount` — and checking every crossing against it. `Convert` and `ConvertBack` are the mint-and-burn boundary, and boundaries are where the accounting has to be legible.

So in this facility: the float is public, every retirement tranche is public, and every bank↔supplier relationship and its timing is public. **A supplier's limit, drawdown and outstanding balance are not — and one supplier cannot see another's terms.** In receivables finance that is the commercially sensitive part, and it is genuinely hidden.

⚠ **Three limits, because the name promises more than the protocol delivers.** The public perimeter **constrains the hidden interior by arithmetic** — convert in 500, receive nothing, convert back 400, and anyone can derive that 100 left by transfer. The exit is **granular, not aggregate**. And the issuer reads everything regardless.

**→ [`docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md`](docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md)** — the same thing at length, with the analogy mapped line by line onto the protocol.

**What this is not.** Not non-custodial. Not trustless. Not private from the issuer. Not anonymous — it hides amounts, not identities, and not timing. **This repository has not been audited**, is not production-ready, and is not compliant with regulation anywhere. Devnet only.

---

## Before opting in

A holder's first `ConfidentialMPTConvert` commits them in three ways — ⚠ **two irreversible, one conditional, and this line said "irreversible in three separate ways" until its own item 2 was corrected out from under it:**

1. It registers an encryption key that **can never be changed**.
2. It blocks deletion of the holder's `MPToken` and locks its reserve, **even after the balance returns to zero** — XLS-0096 §7.4 states this unconditionally (E-18). ⚠ **rippled does not enforce it that way on every path, and this project is the one that found the gap.** `MPTokenAuthorize.cpp`'s holder-unauthorize path returns `tecHAS_OBLIGATIONS` only when the **issuance-wide** confidential outstanding is non-zero, so with that total at zero the holding is deletable with confidential fields present (**F-29**, filed upstream as [XRPL-Standards #610](https://github.com/XRPLF/XRPL-Standards/issues/610)). **Treat the block as real but not the unconditional one the spec describes**, and do not plan a reserve around either reading.
3. It publishes the converted amount **in plaintext**.

---

## What the research established

Seven findings about **XLS-96 itself** — proof sizes and composition, why a large balance
can decrypt faster than a small one, and where a confidential balance silently fails to
compose with the ledger's vault and lending primitives. Three of them correct a reading this
project published first; two are filed upstream.

⚠ **None of it is a security claim about this project.** Each finding has a graded row in
[`CLAIMS.md`](CLAIMS.md).

**→ [`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md`](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md)**

---

## Running it

**Read [`docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md`](docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md) first.** It is what to show, in what order, and what not to say. The [limitations note](docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md) beside it is what the demonstration does **not** establish.

**You need:** a Rust toolchain (edition 2021), [Bun](https://bun.sh), `make`, `git`, `cmake`, `clang`/`clang++`, and Homebrew `openssl@3`. ⚠ **`tools/rebuild-env.sh` is what compiles** the vendored, patched fork of `mpt-crypto`; `signer/build.rs` only locates, validates and links the result. Network access for the pinned GitHub clones, and to Devnet: the signer and facility read `https://s.devnet.rippletest.net:51234/`, while `check-amendments` uses the WebSocket on `:51233`.

```bash
tools/rebuild-env.sh    # builds the vendored C library into /tmp/wconf; re-run after any /tmp clean
make signer             # cargo build
```

`rebuild-env.sh` exists because the signer links against a patched `mpt-crypto` that lives in `/tmp/wconf` and does not survive a `/tmp` clean. ⚠ **That path is writable by any process running as the same user — the adversary this project puts in scope** — so a build tree in `/tmp` is a development convenience the threat model does not cover. The patch is committed, so the tree is reproducible from a clone; `make vendor-verify` checks the pin, confines tracked differences to an allowlist, and checks the nonce and witness-offset patterns; when both upstream tags are available it also byte-compares their `src/` and `include/`. ⚠ **It is weaker than it sounds.** It uses `git diff --name-only`, so it allows arbitrary *content* changes inside allowlisted files and **cannot see untracked files at all** — while the build compiles every `src/*.c`. The tag comparison prints `SKIP` and still succeeds if a tag is missing. It is not in the gate list below because it checks a build tree rather than this repository's sources; it passed this session.

**The read-only viewer** — two processes, and it renders state that something else created:

```bash
make web-api            # http://127.0.0.1:3011
make web-app            # http://127.0.0.1:3000
```

**The signer and the facility** are separate processes, and starting them needs a holder profile and funded Devnet accounts that this document does not tell you how to create. `make signer-run` and `make facility` are the targets; **the demo script is what tells you what has to exist first.** Devnet account seeds are not reproducible from anything committed — if you have no prior run, you are creating a fresh chain of accounts, not resuming one.

The walkthroughs are in [`docs/explainer/`](docs/explainer/): the [facility](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md), the [web tier](docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md), and the [stack and the reasoning behind it](docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md).

### The gates

Nine run over the repository; a tenth, `check-filing`, takes a draft document as an argument and so is run per draft. They exist because this project's recurring defect is a claim outrunning its evidence, and a gate is the only form of such a claim that has a falsifier.

```bash
make check-tables check-negative-claims check-personas check-blinding \
     check-test-support check-loopback check-web-readonly check-disclosure-phrases
make check-zeroize-bounds                     # ~3 min
make check-filing FILE=path/to/draft.md        # per-document
```

**Most are lexical and over a named set**, and each prints what it does *not* check in its own output. Read that part. ⚠ **Two are not lexical**: `check-test-support` compiles probe crates, and `check-personas` byte-compares canonical files against generated ones. **Nor do all eight carry injected-detector controls** — `check-personas` and `check-blinding` have none. Gates built to catch false passes have themselves false-passed five separate times (E-165, E-168, E-182, E-198, E-203), which is why the ones that do carry controls run them through the same detector the real check calls — and **a gate is verified by breaking it, never by reading it.**

⚠ **`check-loopback` is about URL literals in source, not about how anything was run.** It asserts that every non-loopback endpoint in the facility's code is recorded with a reason. It does **not** assert that a loopback node was used, and none was — see [What is open](#what-is-open).

`make check-amendments` is a live `feature` RPC reader, not a gate; its output is meant to be pasted with a date.

---

## Layout

```
CLAIMS.md                      claims register — read before writing anything public
UPSTREAM-FEEDBACK.md           observations destined for the XLS-96 authors
CLAUDE.md                      working instructions for coding sessions
Makefile                       the gates, the builds and the demo targets
LICENSE                        Apache 2.0
signer/                        the holder signer (Rust) — proofs, signing, key derivation
facility/                      the confidential receivables facility (TypeScript)
web/
  api/                         the READ-ONLY Elysia API
  app/                         the TanStack Start browser application
docs/
  architecture/                ARCHITECTURE-2026-08-18.md — revision 9, the authority
  decisions/                   ADRs and rulings
  explainer/                   reader-facing walkthroughs, demo script, limitations
  research/                    custody and other derived research
  reviews/                     review rounds and adjudications
  runs/                        committed Devnet receipts, one per signer milestone
  task-zero/                   verification research, graded, with named gaps
  personas/                    canonical personas; .claude/agents/ is generated
  references/                  third-party papers — NOT in version control, see below
  UPSTREAM-FILING-PROTOCOL.md  the five filing rules
tools/
  check-amendments.ts          live `feature` RPC reader
  observer-harness.ts          what a full-ledger observer sees
  issuer-decrypt-balance.ts    what the issuer sees — the CLI, holds the issuer key
  issuer-view-snapshot.ts      writes that view to a file for the web tier to render
  check-*.ts / *.py            the gates
```

`docs/references/` is empty in a fresh clone: the papers are deliberately excluded from version control pending a redistribution check, and [`docs/references/README.md`](docs/references/README.md) records what they are and where to get them.

---

## Amendment status

⚠ **A reading with a date on it, and nothing more.**

**What this build actually requires is `ConfidentialTransfer`.** It writes no `sfDomainID` and exercises neither XLS-70 nor XLS-80.

**The project's full scope needs three on the same network** — `ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` — because writing `sfDomainID` to an `MPTokenIssuance` requires **both** of the latter two. ⚠ **That coupling is counterintuitive and it is read at source**: `MPTokenIssuanceCreate.cpp:31–36`, `CLAIMS.md` **E-19**, grade A.

Read `2026-09-01T14:24:51.393Z`, snapshot committed at [`amendments-2026-09-01.json`](docs/task-zero/amendments-2026-09-01.json). Mainnet and Testnet are read for contrast only; **nothing is ever submitted to either.**

| network | `ConfidentialTransfer` | `PermissionedDomains` | `SingleAssetVault` |
|---|---|---|---|
| **Devnet** — `wss://s.devnet.rippletest.net:51233`, network_id 2 | **ENABLED** | **ENABLED** | **ENABLED** |
| Testnet | supported, not enabled | ENABLED | supported, not enabled |
| Mainnet | supported, not enabled | ENABLED | supported, not enabled |

`LendingProtocol` is enabled on Devnet too, which is what makes the open XLS-66 question testable rather than theoretical.

**Devnet is the only network where this can run at all.** On Mainnet and Testnet the server reports `ConfidentialTransfer` by name as `supported, not enabled` — a positive answer from the node, not an inference from a missing entry. This project takes no position on whether or when that changes.

**No dedicated "Confidential Devnet" is needed.** A prerelease-documented one had a dead faucet and the canonical xrpl.org page names no dedicated network; the amendment is live on the general Devnet. Whether such a network still exists somewhere was **not** searched — the question became moot once Devnet answered, and this is a statement about what this project needs, not about what exists.

⚠ **Amendment state is a reading, not knowledge** (P-3). Run `make check-amendments` and paste fresh dated output beside any status claim. The table above is true on its date and carries no guarantee past it. Method and the original 2026-08-16 reading: [`amendments-2026-08-16.md`](docs/task-zero/amendments-2026-08-16.md).

---

## What is open

⚠⚠ **The one that used to head this list has now been reviewed, and it did not survive.**
`ADR-0003`'s central claim — ~~*that a tier which reads public state and holds no credential
moves no trust boundary*~~ — went through a four-leg adversarial rotation on 2026-09-02
(`REVIEW-036`) and was **ruled unsound**: both of its factual premises are false against
source. **What is true is narrower and is what the tier needs — it adds no *signing*
authority.** ⚠ **What the claim was hiding is a disclosure boundary that did move:** the tier
serves a decrypted issuer view and the signer's local status, unauthenticated, to **any local
user**, out from behind `0600`/`0700` permissions the project sets deliberately. **That is
open, it is named, and ruling on it belongs to the project owner** (`CLAIMS.md` E-228, E-230).

Everything else, with where it is actually tracked:

| open | what it means | tracked in |
|---|---|---|
| **The web tier is unreviewed** | `ADR-0003` is `Proposed`; its central claim is stated for attack, not settled | `docs/decisions/ADR-0003-web-tier-trust-boundary.md` |
| **The key derivation is not published** | A holder with their master seed and **not this repository** cannot reconstruct their key — the entire benefit deriving buys. No code discharges it. ⚠ Treat the derivation as lock-in until it is published | issue #10 |
| **Nothing has run under loopback** | Every Devnet read goes to the public cluster under a named risk acceptance, because a local node could not acquire the state tree on this hardware. Every run record says `underB15Conditions: false` | B-15, E-148, E-151 |
| **The issuer snapshot is plaintext on disk and on the wire** | Moving the key to a CLI closed the *chosen-input* decryption, not the *disclosure*: `GET /api/issuer/…` returns a decrypted balance unauthenticated on loopback. Demo Devnet balances in a curated set — but nothing has reviewed it | E-212, and measured 2026-09-01 |
| **Custody** | Live and unreviewed. The custody demo mode is **simulated and is never an integration**; this repository holds no primary sources for any custody platform | E-117, `docs/research/CUSTODY-2026-08-28.md` |
| **`ADR-0002`** | `Proposed` on a research item | `docs/decisions/` |
| **Bulletproof blinding** | Whether determinism is acceptable when the scalars carry the zero-knowledge property. Off the critical path | issue #8 |
| **`terFROZEN` preflight** | Needs rippled source this repository does not hold | B-17 |
| **`MPToken` reserve amount** | Asked for in *Before opting in* and **not recorded anywhere in this project** — named rather than invented | — |

### Upstream

**Seven filings went out on 2026-08-26. Six are open; [`rippled#8118`](https://github.com/XRPLF/rippled/issues/8118) was closed without comment.** The six open ones were re-audited against upstream HEAD on 2026-09-01 and every claim still stands (E-216) — so on this evidence the defect was the **order of operations**, not the research: the adversarial review ran *after* submission, where it can only produce a public correction. One audit of six filings does not establish the process was sound in general.

That is now inverted — [`docs/UPSTREAM-FILING-PROTOCOL.md`](docs/UPSTREAM-FILING-PROTOCOL.md) rule 1 gates filing on a review by a **different session**. ⚠ **Filing is authorised per filing, per session, and none is live.**

**Found a defect here?** Open an issue on this repository. The filing protocol governs what this project sends *upstream* to XRPLF; it does not govern what you send us.

---

## Licence

[Apache 2.0](LICENSE).

## Credit

XLS-0096 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, with the reference cryptography in [`XRPLF/mpt-crypto`](https://github.com/XRPLF/mpt-crypto).

The compact sigma protocol that gives the send proof its 192 bytes — with the twisted-ElGamal and Bulletproofs++ analyses behind several of the size decisions — is the work of **Tess Dore and Murat Cenk** at RippleX Research, published separately from XLS-0096. Cite them for it; copying the XLS-0096 author list alone leaves Dore out.

The Confidential Transfer implementation was reviewed by **Trail of Bits** in April 2026. Several things this repository first recorded as findings turned out to be issues that review had already found and Ripple had already fixed, so check it before believing anything here is novel. ⚠ **A later revision of that report is recorded as an unobtainable source** (B-13) — this project has not read it.

This repository analyses and builds on all of the above; it claims none of it.

---

*The repository is named `xrpl-confidential-positions`, held since 2026-08-16 and adopted as the project name on 2026-09-01. `xrpl-confidential-facility` was the alternative. Both were free on npm when checked on 2026-08-16 — re-check before publishing any package, and note that GitHub redirects on rename while npm does not.*

==============================================================
FILE: GETTING-STARTED-CLAUDE-CODE.md
==============================================================

# Getting started with Claude Code on W-CONF

Written 2026-08-13, after TASK ZERO rev 2 and the review rotation.

---

## ⚠ THIS DOCUMENT IS A HISTORICAL RECORD. Re-checked 2026-09-01.

**It plans the first three sessions, all three of which ran, and it was written before anything was built.** Its session bodies are kept because they record what was asked and why — **do not follow them as instructions.**

**If you are starting a session now, go here instead:**

| you want | read |
|---|---|
| what is open, and each step's gate | [`docs/architecture/ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md) §5 and §6 — **revision 9, the authority** |
| what the project is and what runs | [`README.md`](README.md) |
| how to work in this repository | [`CLAUDE.md`](CLAUDE.md) |
| what may be claimed | [`CLAIMS.md`](CLAIMS.md) |
| the next piece of work | [`docs/NEXT-SESSION-PROMPT.md`](docs/NEXT-SESSION-PROMPT.md) |

**What has changed since this was written**, so that no sentence below is read as current:

- ~~*"Application logic cannot start: the architecture has not been designed, and ADR-0001 has not cleared review."*~~ **Both halves are false as of 2026-08-18.** `ADR-0001` is **`Accepted`** (`REVIEW-013c`) and the architecture document is at **revision 9**.
- **All eight of architecture §6's steps are done.** Step 5 was a gate and it **passed** on 2026-08-18; the other seven are built, and every one of them has been exercised against Devnet. There is a Rust signer, a receivables facility and a read-only web tier. Sessions 1–3's gap-closure work is finished.
- ~~*"Three of four cryptographic rulings are ruled and have never run."*~~ **All four have run.** The sigma nonces, `r`/`ρ`, keygen and the ed25519 signing nonce (B-16) are all implemented and exercised against Devnet.
- ⚠ **What remains open is NOT in this document.** `ADR-0003` has had its adversarial review (`REVIEW-036`, 2026-09-02) and its central claim was **ruled unsound and rewritten**; what is still open there is the **issuer route's disclosure boundary**, which is a ruling handed to the project owner (E-228, E-230), issue #10 is undischarged, `ADR-0002` is still `Proposed`, and nothing has ever run under loopback. The README's *What is open* section and architecture §5 are where those live.

⚠ **This correction exists because the same defect has now been recorded three times in this repository** — a status sentence at the top of the document a reader opens first, true when written and never re-checked — **E-204** and **E-222**, which is **two**. ⚠ **E-159 was cited here and is a different failure**: an onboarding disclosure that was false *when written*, not one that went stale. `REVIEW-034c` had already upheld *"E-159 cited for a claim it is not about"*, and the 2026-09-02 pass that corrected the COUNT re-added the wrong row rather than checking it. **Fixing a count is not checking a citation.** `CLAUDE.md` directs a new session here, so this file is precisely where that defect is most expensive.

---

**The original document follows below** — ⚠ **not unaltered, and it said so until 2026-09-02:** its stale application-logic sentence is struck in place and annotated, two lines down.

The purpose of the first three sessions is to close gaps, not to build the application. Every one of them is measurement, research or a throwaway spike — categories that carry **no review gate** and can start immediately. ~~Application logic cannot start: the architecture has not been designed, and ADR-0001 has not cleared review.~~ **(Struck 2026-09-01 — see the header above.)**

---

## Session 0 — setup, no Claude, ~45 minutes

**Do this yourself. Do not delegate it.**

1. **Create the repository private**, under `nandanito/`, with a working directory name. Do not choose the public name yet — Session 2 may change the domain.
2. **Drop in this scaffold**, then `make sync-personas` to populate `.claude/agents/`.
3. **Read `docs/task-zero/ADDENDUM-2026-08-16.md`** and download the Trail of Bits report into `docs/references/`. Fund an account *after* Session 1 identifies which network carries the amendment — the prerelease confidential faucet is dead.
4. **Run the `feature` RPC once by hand** — a raw websocket call from your terminal, not the script. Read the output. You need to know what an unmodified response looks like so you can recognise a wrong automated answer later. This is the single most valuable 10 minutes in the whole setup.
5. **Download by hand**, since both block automated fetching: IACR ePrint 2026/602, and `paper/cmpt-compact-sigma.pdf` from the mpt-crypto repository. Put them in `docs/references/`. GAP-2 and GAP-3 close here and nowhere else.

Session 1 cannot verify its own results without step 4, and ADR-0001 cannot be accepted without step 5.

---

## Session 1 — close the measurable gaps

**Persona: Protocol Researcher. No review gate — this is measurement code.**
**Stop condition: report and stop. Do not write application code.**

```
Read CLAUDE.md, CLAIMS.md, docs/task-zero/TASK-ZERO-2026-08-13.md and then
docs/task-zero/ADDENDUM-2026-08-16.md before starting. The addendum corrects the
main report in three places and you will get wrong answers without it.
Adopt docs/personas/protocol-researcher.md.

This session closes GAP-1 and GAP-6 and replaces two unusable numbers. It is
measurement work. Do not write application logic, do not design anything, and
do not touch docs/decisions/.

TASK 1 — GAP-1. Amendment state, and which network we build on.
Run tools/check-amendments.ts against mainnet, testnet and devnet.

The dedicated "Confidential Devnet" from the RippleX prerelease docs has a dead
faucet, and the canonical xrpl.org page names no dedicated network. The endpoint
has been deliberately removed from the script — do not re-add a guessed one, since
an unreachable host reported as a failure reads like a disabled amendment.

Answer, date-stamped: which network, if any, carries ConfidentialTransfer as
enabled or votable? If none of the three does, search for whether a dedicated
network still exists and report what you find rather than assuming one does.

Then report whether ConfidentialTransfer, PermissionedDomains AND SingleAssetVault
are all enabled on whichever network wins. All three are required — writing
sfDomainID to an MPTokenIssuance needs the latter two (TASK ZERO section 7, E-19).
If SingleAssetVault is missing, say so loudly: that removes the XLS-80 compliance
third of the project and changes the domain argument.

Write the JSON snapshot to docs/task-zero/amendments-<date>.json. Update
CLAIMS.md rows B-2 and B-3 with the reading and its date.

TASK 2 — GAP-6. Real proof sizes.
Clone XRPLF/mpt-crypto. Read include/ and find the actual values of
SECP256K1_COMPACT_STANDARD_PROOF_SIZE, SECP256K1_COMPACT_CONVERTBACK_PROOF_SIZE,
SECP256K1_COMPACT_CLAWBACK_PROOF_SIZE, kMPT_SINGLE_BULLETPROOF_SIZE,
kMPT_DOUBLE_BULLETPROOF_SIZE, kMPT_ELGAMAL_TOTAL_SIZE, kMPT_PUBKEY_SIZE.

Compare each against the specification's stated 192 / 754 / 688 / 64 / 66 / 33.
If they match, regrade E-3a and E-4 in CLAIMS.md from B to A and close GAP-6.
If any differs, that is a finding — record it in CLAIMS.md under F and tell me,
because every size in TASK ZERO section 3 and section 6 derives from it.

While you are in that source tree, settle the decryption bound. Trail of Bits
TOB-RIPCTX-1 reported that decryption brute-forces the discrete log up to
1,000,000 and that values above it are permanently unrecoverable. The fix
parameterised it as secp256k1_solve_dlp_small_range_ct(max_range), but the audit
notes the caller still passes a magic 1000000. Report the actual value passed at
the version rippled 3.3.0 pins, and confirm E-23 in CLAIMS.md.

Then answer the open question from the addendum: does MPT AssetScale move this
ceiling, or does the bound apply to the raw integer the ciphertext encodes
regardless of scale? This decides whether a facility can exceed 1,000,000 in
displayed denomination, and the domain design in TASK ZERO section 9 depends on
the answer.

TASK 3 — replace the unusable timings.
Build mpt-crypto per its README (CMake + Conan). Run the full test suite. Then
time test_bulletproof_agg and the three compact sigma tests, and record:
CPU model, clock, core count, OS, compiler and version, build flags, number of
runs, and the spread — not just the mean.

Write this to docs/task-zero/benchmarks-<date>.md and update CLAIMS.md B-1.
Standing prohibition P-8 applies to your own numbers exactly as it applies to
the specification's: no hardware and parameters, no publishable number.

If the build fails, that is a finding, not a failure. Record what broke and
where. mpt-crypto is at 0.4.0-rc4 with 33 open issues; a broken build on a
common platform is material to the whole project.

REPORT AT THE END
What runs, what does not, what you learned that was not in the documents, and
what should change in the plan as a result. That last item is the Compound step
and it is not optional. Then stop.
```

---

## Session 2 — the domain question

**Persona: Protocol Researcher. Research only.**
**Run this before the naming sweep. Its answer may change the domain, the name, and the roadmap.**

```
Adopt docs/personas/protocol-researcher.md. Read TASK ZERO section 9 first —
the domain argument, including the revision made after review.

QUESTION
LendingProtocol (XLS-66) is not merely Supported::Yes in rippled 3.3.0 — as of
2026-08-16 it is ENABLED on standard Devnet, alongside ConfidentialTransfer,
PermissionedDomains and SingleAssetVault (CLAIMS.md E-26). It has native Vault,
LoanBroker and Loan ledger objects. Before we build a receivables financing
facility as application logic on top of MPTs, establish whether XRPL already
models the facility natively.

Because all four amendments are live on the same network, question 2 below is
empirically testable and not only a source reading. Prefer the experiment where
one is cheap, but read the transactors either way.

Answer these, graded A-F, from XLS-0066 and the rippled 3.3.0 source:

1. What does the Loan / LoanBroker / Vault triple actually model? Drawdowns,
   repayments, interest, default? Read the transactors, not just the spec.
2. Can a vault share token, or any asset inside the lending protocol, be a
   confidential MPT? Look for whether the vault and loan transactors handle
   MPTs with lsfMPTCanHoldConfidentialBalance set, and whether anything rejects
   them. Note that MPTokenHelpers.cpp requireAuth already recurses into vault
   pseudo-accounts, which suggests the two features were built aware of each
   other — establish whether that extends to confidential balances.
3. Vault pseudo-accounts are exempted from some authorization checks. What does
   that do to the XLS-80 domain gating we depend on?
4. If the answer to 2 is yes, sketch what changes: the domain becomes
   "confidential positions in a native lending vault" rather than an
   application-layer facility. If no, that incompatibility is itself a finding
   worth writing up — say precisely what blocks it.

CONSTRAINT
Do not design the application. Answer the question, grade the findings, and
give me one direct recommendation with defense: build the facility as
application logic, or build on XLS-66. Say which and why.

5. If and only if you recommend XLS-66, address the two carry-forward items in
   section 9 under "Two things above must not be inherited silently if the
   domain moves" — the unreviewed cover-traffic argument (which rests on E-22,
   Grade C) and the balance-tracking requirement that replaced R-5's float cap.
   Do not port either conclusion across. Say what each becomes under a native
   vault, or say plainly that you could not determine it. In particular:
   if a vault pseudo-account holds the confidential balance, who tracks its
   expected value off-ledger so it can be decrypted, and can a pseudo-account
   do that at all? That question is open and is not obviously favourable.

   These do not block your investigation. They block acceptance of its
   recommendation, so an answer that ignores them is incomplete.

Write to docs/task-zero/XLS-66-INVESTIGATION-<date>.md and stop.
```

---

## Session 3 — the spike

**Persona: Build Lead. Throwaway spike, no review gate.**
**Rewritten 2026-08-16 after Session 1.** The original prompt told you to patch `definitions.json` and framed proof generation as possibly the whole project. **Both are now dead work** — `ripple-binary-codec@2.9.0` ships the serialisation and mpt-crypto has a WASM build. The spike is much cheaper than planned, so it has been given a second objective worth 99 bytes.

Precondition met: `ConfidentialTransfer` is enabled on **standard Devnet** (E-26).

```
Adopt docs/personas/build-lead.md. Read TASK ZERO section 5 — including the
2026-08-16 correction at the top of it — and CLAIMS.md E-30, E-31, E-32 first.

GOAL
Get exactly one ConfidentialMPTConvert accepted by standard Devnet
(wss://s.devnet.rippletest.net:51233, network_id 2), by any means available.
That is the objective. Two measurements follow it, in priority order, and both
are gated on it working.

Ugly is fine. A C harness is fine. Shell scripts are fine. Do not build
anything you intend to keep.

Priority if time runs short: Convert accepted > E-22 falsification > Send size.
E-22 outranks the size question because section 9's recommendation and B-10
both rest on it, whereas the size conflict is 99 bytes and costs us only a
Grade B row until it is settled.

WHAT CHANGED — do not repeat the old plan
0. THE SUBMIT PATH IS PROVEN. Added 2026-08-16 by the XLS-66 investigation,
   which put 19 transactions on standard Devnet. Do not rediscover this:
     - Fund from POST https://faucet.devnet.rippletest.net/accounts. The seed
       comes back at the TOP level as `seed`, not at `account.secret`.
     - THEN POLL. account_info with ledger_index:"current" on a fresh faucet
       account returns a Sequence that yields tefPAST_SEQ on submit. Poll
       ledger_index:"validated" until account_data appears. This cost two
       failed submissions to work out (UPSTREAM-FEEDBACK U-26).
     - Sign WITHOUT xrpl.js: build the tx JSON, encodeForSigning() with
       ripple-binary-codec@2.9.0, sign with ripple-keypairs, encode(), then
       submit the tx_blob over a raw WebSocket. xrpl.js@5.0.0 bundles an older
       codec and will not serialise these types.
   ALL OF THAT IS ALREADY WRITTEN: tools/devnet-submit.ts. `bun install`, then
   `bun run tools/devnet-submit.ts` for a 15-second smoke test that funds an
   account and lands an AccountSet. It exports connect/rpc/faucet/submit/
   waitValidated/createdNode and refuses to run against any network_id but 2.
   It is spike scaffolding — rewrite it freely, but do not rediscover it.
   The remaining unknown in this spike is proof generation ALONE. If you are
   debugging serialisation or signing, you are off the path.
1. Serialisation is DONE UPSTREAM. Use ripple-binary-codec@2.9.0, which ships
   all five ConfidentialMPT types (85-89) and all 18 confidential fields; all
   18 codes were verified against our own table on 2026-08-16, 18/18. Do NOT
   patch definitions.json. Do still verify the codec against the node's
   server_definitions RPC — that is a cheap, real test and it either matches
   or it does not. Note xrpl.js latest is 5.0.0 and does not bundle 2.9.0 yet,
   so take the codec directly.
2. Proof generation is LARGELY DONE UPSTREAM. mpt-crypto has a WASM build at
   .github/scripts/build-wasm.sh exporting _mpt_get_convert_proof and the other
   three generators. The npm package @xrplf/mpt-crypto is NOT published, so
   build from the repo's script. If the WASM path fights you for more than an
   hour, fall back to calling the C library directly — test_pok_sk is the
   closest example for the 64-byte registration PoK. Report which path worked.
3. Everything else the ledger checks is unchanged: the issuance needs
   lsfMPTCanHoldConfidentialBalance, an IssuerEncryptionKey and a zero
   TransferFee, and keys can only be registered via MPTokenIssuanceSet — so the
   issuer needs a second transaction after creation. Create the issuance first.

SECOND OBJECTIVE — settle the transaction size, it is a live conflict
Our arithmetic says a ConfidentialMPTSend is 1276 bytes; cmpt-compact-sigma.pdf
Table 2 says 1177, because it treats C1 as shared across all four ciphertexts
and transmitted once on-chain. The difference is exactly 99 bytes. CLAIMS.md
E-4 is Grade B and blocked on this.

Measure it. Serialise a real Send (or read one back off the ledger) and report
the actual byte length and whether each encrypted-amount field carries a full
66-byte ElGamal pair or a bare 33-byte C2. Resolve E-4 against the wire, not
against either document.

THIRD OBJECTIVE — try to FALSIFY E-22. Gated; read the cost note first.
E-22 claims a zero-amount ConfidentialMPTSend is (a) valid and (b)
indistinguishable from a non-zero send. It is Grade C, inferred, never tested.
It is load-bearing: it is the whole basis of section 9's cover-traffic
recommendation, and B-10 depends on it explicitly.

You cannot prove indistinguishability. You CAN falsify it, and that is the job.
Any single observable difference kills it. Check at least:

1. Validity. Does a zero-amount Send get accepted at all? If it fails, E-22(a)
   is dead and section 9's recommendation collapses immediately — stop and
   report that, it is the most valuable outcome available here.
2. Randomisation. Submit TWO zero-amount Sends from the same account. If the
   ciphertexts are byte-identical, they are canonical rather than randomised
   and E-22(b) is dead. This is the sharpest single test; do it first.
3. The F-1 distinguisher. Recompute canonical EncZero for each participant
   from the public inputs and byte-compare against the zero-Send ciphertexts.
   They must NOT match. If they do, zero sends are publicly identifiable.
4. Side-by-side against a NON-zero Send. Compare: serialised blob length, fee
   charged, result code, metadata shape (how many AffectedNodes, which fields
   changed), and whether the version counter moves identically. Any asymmetry
   is a distinguisher.

Report every difference you find, including ones you think are benign. A
difference you cannot explain is a finding, not a rounding error.

FOURTH OBJECTIVE — closes GAP-9. Only if the first three are done.
Added 2026-08-16. Two transactions on top of a working Convert, and it is the
one experiment that turns the XLS-66 finding from A-by-reading into
A-by-execution on the point that matters. Take an MPToken that carries a REAL
confidential balance, deposit its holder's PUBLIC balance into an XLS-65 vault
over the same issuance, and report what happens to each. Prediction on record:
the public portion deposits normally, the confidential portion is stranded, and
no error is raised at any point. Any deviation is a finding — report it and do
NOT reconcile it against the prediction.

COST NOTE, so this is not mistaken for free
This objective needs strictly more than the Convert goal: two accounts opted in
and key-registered, a funded confidential balance on the sender, and Send proof
generation (192 B sigma + 754 B aggregated Bulletproof) rather than the 64 B
registration PoK. Attempt it only once the Convert path works. If you run out
of road, say so and report how far you got — a named gap is a correct output
here and inventing a partial answer is not.

On keys: use mpt-crypto's own mpt_generate_keypair for throwaway devnet keys.
Note that the WASM build deliberately does NOT export it, since upstream's TS
wrapper sources ElGamal keys from ripple-keypairs — so this may push you to the
C path for this objective. Do NOT implement ADR-0001 section (e)'s master-seed
derivation scheme; it is unreviewed and that prohibition stands.

OBSERVATION TASK — how does mpt-crypto generate its sigma-proof nonces?
Added 2026-08-17 after REVIEW-003. Cheap, and nobody has looked.

You will be calling mpt-crypto's proof generators, so you are the first person
on this project positioned to read what they actually do about nonces. Read it
and report. Do not design anything.

Why it matters: ADR-0001 rev 4 now carries an UNANSWERED CRITICAL finding —
section (e)'s nonce construction is a one-line HKDF sketch that is not
implementable as written, with no salt/info, no domain label, no canonical
encodings, no length framing, no expansion into the five scalars, no scalar
mapping. Nonce reuse leaks sk_A and the compact form makes it invisible (E-34).
The Cryptography Reviewer's task grew from "approve a sketch" to "produce a
byte-exact construction", and upstream's own choices are the best available
input to that.

Report, as observation only:
1. Deterministic or RNG-sourced? If deterministic, over what inputs?
2. Can a caller influence the nonce through any exported entry point — an
   argument, a global seed, an RNG hook?
3. What does the WASM build do differently, if anything? A browser RNG is a
   different trust story from a native one.
4. Is there any test asserting distinct nonces across distinct statements?

This is READING, not writing. Do not implement a nonce scheme, do not "fix"
anything you find, and do not write signer code — that is blocked until the
Cryptography Reviewer produces the byte-exact construction. If what you find
looks wrong, that is a finding for UPSTREAM-FEEDBACK under Observed, and it
does not move out of Observed in this session.

REPORT
What worked, what the actual blocking step was, and how long each part took.
Whether the upstream WASM path works end-to-end — that is the least-confident
claim from Session 1 and this is what tests it. The measured Send size and what
it does to E-4. What you found on E-22, stated as either "falsified, here is
the distinguisher" or "survived these four checks" — never as "confirmed",
since four passing checks are not a proof of indistinguishability. Then an
honest estimate of the effort remaining to a real client path, and whether the
eight-week budget survives it.

Update CLAIMS.md in the same commit: E-4 on the size, E-22 and B-10 on the
zero-send result. If E-22 is falsified, section 9's cover-traffic
recommendation falls with it — say so plainly and do NOT attempt to repair the
argument. Repairing it is a design act and this session has no mandate for one.

Do not generalise the spike into a library. Do not start the application.
Do not write ElGamal keygen — ADR-0001 section (e) is unreviewed.
Report and stop.
```

---

## What comes after

Nothing until the three sessions above are done and reported. Specifically, **do not start the architecture document** until:

- ~~GAP-1 is closed and all three required amendments are confirmed (Session 1)~~ **DONE 2026-08-16.** All three enabled on standard Devnet
- ~~GAP-3 is closed and ADR-0001's central premise is confirmed (Session 0 step 5)~~ **DONE 2026-08-16.** Premise confirmed, with a qualification now recorded in ADR-0001 §(a)
- ~~**The domain question is settled (Session 2)**~~ **DONE 2026-08-16.** XLS-66 cannot carry confidential balances and publishes every loan value; the domain does not move. `XLS-66-INVESTIGATION-2026-08-16.md`, recorded as **ADR-0002** (`Proposed`, reviewed by nobody)
- ~~**ADR-0001 §(d), §(e) and its process boundary — and now ADR-0002 — have cleared a second review rotation, and the Cryptography Reviewer has ruled** — outstanding.~~ **DONE 2026-08-18 for ADR-0001. `ADR-0001 IS ACCEPTED`** (`REVIEW-013c`). Five rotations: REVIEW-003 (§(d), §(e), the boundary), REVIEW-005 (sigma nonces), REVIEW-010 (`r`/`ρ`), REVIEW-012 (keygen), REVIEW-013 (the Option 2 re-weigh, and the `r`/`ρ` store amendments). **ADR-0002 is still `Proposed` and still reviewed by nobody** — do not read ADR-0001's acceptance as covering it

**All four cleared.** *(Updated 2026-08-18: the last one was the review rotation, and it ran. `ADR-0001` is `Accepted`; the architecture document exists and is at revision 2.)* GAP-2 remains open but is W-PQ's dependency, not W-CONF's.

~~The six blocking items from REVIEW-002 are addressed in these documents, but four of the fixes are arguments no reviewer has seen. They enter as `Proposed`.~~ **No argument in ADR-0001 is unreviewed as of 2026-08-18.** ADR-0002 is the one that still is.

> **What `Accepted` does and does not open.** It unblocks architecture §6 step 7 — the facility as application logic. It does **not** open step 4 (`r`/`ρ`: build against amendments **A4–A9**, not A1–A3, which a rotation ruled not buildable) or step 6 (keygen: issues #10 and #11 are open). **Three of four cryptographic rulings are ruled and have never run.** `docs/architecture/ARCHITECTURE-2026-08-18.md` §5 is the authority.

## Session hygiene

- **Checkpoint model.** Orient → do the scoped work → stop and report. Autonomy expands with demonstrated reliability, not elapsed sessions.
- **`make sync-personas`** whenever `docs/personas/` changes, or `.claude/agents/` drifts.
- **Every session that produces a claim updates `CLAIMS.md`** in the same commit. A claim without a register row is a claim that will end up in a README unchecked.
- **`/claims-check`** before anything leaves the repository.
- **`/feedback-capture`** the moment something upstream surprises you — a wrong doc, a missing binding, an unhelpful error code. It lands in `Observed` ungraded. Nothing is promoted or filed from a coding session.
- **Devnet only**, in every session, without exception.
==============================================================
FILE: web/README.md
==============================================================

# `web/` — architecture §6 step 8, the read-only web tier

**Scoped, ruled and built 2026-08-28.** The step is `ARCHITECTURE-2026-08-18.md` §6 step 8 (revision 9); the decision record is `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, `Proposed` and **not adversarially reviewed**.

```
web/app   TanStack Start · React · Tailwind    →  HTTP  →  web/api
web/api   Elysia, read-only                    →  JSON-RPC  →  rippled (Devnet)
                                               →  UDS: Request::Status ONLY  →  wconf-signer
```

## The property this tier exists to keep

**It never signs and it holds no key.** `Pair` and `Prepare` are the signer requests that carry authority, and `tools/check-web-readonly.ts` asserts that `web/api` constructs neither. ⚠ **That scan covers `web/api`, not the whole tier** — `web/app` is covered by the separate assertion that nothing under it reaches the socket at all. Stated narrowly because the wider version of this sentence stood here while `README.md` had already been corrected (`CLAIMS.md` E-168's shape).

⚠ **`tools/check-web-readonly.ts` is what makes that a property rather than an intention**, and it is wired into the `Makefile` alongside the repository's other gates — ⚠ **this said *"the other six"* until 2026-09-01, when `check-filing` had already made it wrong. The `Makefile` is the list; a count restated here is a claim with no falsifier and this one went stale** (`CLAIMS.md` E-141):

```
make check-web-readonly
```

**Six parts** (this said *"Five"* until 2026-09-02 — E-234): nothing under `web/app` reaches the socket; `web/api` builds `Status` and never `Pair` or `Prepare`; no route, loader or server function reaches a signing operation; ⚠ **the tier holds no secret, decrypts nothing and spawns nothing**; exactly **one** socket client exists; and ⚠ **every bind resolves to a loopback literal** — the API's and the dev server's, which proxies `/api` (E-227).

⚠ **Part 4 was added after the tier shipped a decryption oracle** — parts 1-3 ask what the tier can **reach**, and an issuer key held *inside* the API process is a different property (`CLAIMS.md` E-212).

⚠ **It refuses to run over an empty `web/app`** — deleting the UI must not be a way to pass. That hole was in its first version.

## Running it

```bash
# Optional — the issuer view. The CLI holds the key; the API never does.
WCONF_ELGAMAL_SK=<64 hex> bun run tools/issuer-view-snapshot.ts

# Terminal 1 — the API. Loopback ledger by default. Binds 127.0.0.1 explicitly.
make web-api

# A remote endpoint needs the risk acceptance BY NAME, and says so in its output:
WCONF_LEDGER_ENDPOINT=https://s.devnet.rippletest.net:51234 \
WCONF_ACCEPT_REMOTE_LEDGER_RISK="I accept CLAIMS.md F-23: a lying ledger source publishes the amount" \
  make web-api

# Terminal 2 — the browser application.
make web-app          # http://127.0.0.1:3000
```

## Tests

```bash
bun test web/api      # 89 tests: wording tests over every rendered sentence, plus citation checks
```

⚠ **`web/api/disclosure.test.ts` is the load-bearing one.** `claims-check` is necessary and **not sufficient** — a false disclosure sentence has already survived that gate in this project (F-24). These fail if any surface claims privacy from the issuer, claims identities are hidden, presents a zero balance as hidden, drops the ruled master-seed disclosure, calls the custody simulation an integration, or leaks `tapFailHard` into rendered copy. **Every one was verified by writing the violating sentence and watching it fail.**

`web/api/capability.test.ts` checks that **every citation in the capability matrix resolves** — each file exists, each register row exists in `CLAIMS.md`. It caught two dangling citations on its first run, which is `CLAIMS.md` E-203's shape.

## What is here

| file | what it is |
|---|---|
| `api/signer-status.ts` | ⚠ **The only UDS client in the tier.** Builds `Status` and nothing else. |
| `api/server.ts` | The Elysia routes. Every one is a `GET`; there is no write path, not a disabled one. |
| `api/ledger-view.ts` | Composes `facility/src/loopback.ts` rather than reimplementing B-15's obligation. |
| `api/observer.ts` | What a full-ledger observer sees, including F-1's publicly-known zero. |
| `api/issuer.ts` | What the issuer sees. ⚠ **Holds no key and decrypts nothing** — it reads `tools/issuer-view-snapshot.ts`'s output. An earlier version decrypted per request, which was a decryption oracle (`CLAIMS.md` E-212). |
| `api/capability.ts` | The capability matrix, derived from the signer's own `KeySource` variants. |
| `api/custody-sim.ts` | ⚠ **A SIMULATION.** Verdicts computed from a declared key-source shape, not written per flow. |
| `app/src/routes/` | Overview, capability matrix, observer, issuer, wallet, custody, API doc. |

## What it does not establish

- It signs nothing, so it demonstrates nothing about signing. That evidence is `signer/`'s tests and validated Devnet transactions.
- The gate is **lexical, over a named set**, and prints its own limits.
- ⚠ ~~`ADR-0003`'s central claim — that a read-only tier moves no trust boundary — **has had no adversarial review**.~~ **REVIEWED 2026-09-02, `REVIEW-036`, four legs — and RULED UNSOUND** (`CLAIMS.md` E-230). The tier adds no **signing** authority, which is sound; it does **not** follow that no boundary moved. ⚠ **A disclosure boundary did: the tier serves a decrypted issuer view and signer-local status, unauthenticated, to any local uid, out from behind `0600`/`0700` mode bits** (E-228). **Unruled and open.**

See `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md`.

==============================================================
FILE: facility/README.md
==============================================================

# The facility — architecture §6 step 7

⚠ **`tapFailHard` in this document is THIS PROJECT'S SHORTHAND and appears zero times in rippled** — the real names are `fail_hard` (the RPC parameter) and `TapFailHard` (the internal apply flag). See [`docs/VOCABULARY.md`](../docs/VOCABULARY.md). The code always used the real one.

**The receivables financing facility, as application logic on XLS-0096
Confidential MPTs.** ADR-0002. TASK ZERO §9.
`docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md` is the end-to-end account of
what it does and does not hide, and it is the document to read first.

> ## ⚠ EXECUTED — but NOT under B-15's step-7 conditions
>
> **28 validated facility transactions on Devnet, 2026-08-25.** ⚠ **That number
> counts the facility's own movements** — authorize, Payment, Convert, Send,
> MergeInbox, ConvertBack. **31** counts everything this program submitted and
> the ledger applied, adding the two issuance-setup transactions and the
> fail-hard control's unflagged arm. Issuance
> `0048BEC27991E04E26DA60230B894B7C12E51E7FBC0A537E`. Every party's decrypted
> `ConfidentialBalanceSpending` equals the book's prediction, and the issuance's
> **plaintext** `ConfidentialOutstandingAmount` of 2030 is exactly the sum of the
> three hidden positions. `tapFailHard` executed in both arms.
>
> ⚠ **The ledger source was REMOTE.** The project owner amended B-15's step-7
> answer on 2026-08-25 (`CLAIMS.md` **E-151**) after Option A turned out not to
> be payable on this hardware (**E-148**). So `tapFailHard` — the half that
> removes the *consequence* of a wrong read **at the ledger**, and ⚠ **not at the
> node the blob was submitted to** (**F-28**) — was set on every facility
> movement; **loopback, the half that removes the *risk*, was not.** Every run record carries
> `underB15Conditions`, and this run's says `false`.
>
> **Nothing here is evidence about the loopback obligation**, and `CLAIMS.md`
> F-23 is unchanged and executed.
>
> **Devnet only.** Never mainnet, at any phase, for any reason. Nothing here is
> secure, audited, non-custodial or production-ready (`CLAIMS.md` P-5), and
> nothing should ever hold value.

⚠ **"Dedicated Account", never "vault".** An XLS-65 `Vault` is a different
ledger object, its share token *cannot* be confidential, its pseudo-account
*cannot* sign a `ConfidentialMPTConvert`, and the word has already nearly
derailed one reading of this design.

```
tools/rebuild-env.sh                   # the vendored prover
cd signer && cargo build && cd ..      # the signer binary
tools/loopback-node/node.sh start      # OUR OWN rippled 3.3.0, syncing Devnet
tools/loopback-node/node.sh wait       # until it reports `full` — not before

bun test facility tools                # the unit tests
bun tools/check-loopback.ts            # the gate on B-15's obligation
bun tools/check-blinding-sources.ts    # the gate on the ruled r/rho derivation
bun tools/check-personas.ts            # .claude/agents/ is GENERATED — this says so
bunx tsc --noEmit                      # a REAL type-check (E-145: `bun build` is not one)
bun facility/run-facility.ts --auto-confirm
```

## What B-15's step-7 ruling obliges, and how each half is kept

Ruled 2026-08-25 by the project owner: **loopback for the facility's ledger
reads, and `tapFailHard` set by whatever submits — which is not the signer.**
Neither is enforced by the signer, so both are obligations on this code.

| Obligation | How it is kept | What that is worth |
|---|---|---|
| Every ledger read goes to loopback | `LoopbackLedger.open()` refuses a non-loopback endpoint at runtime — ⚠ **unless `WCONF_ACCEPT_REMOTE_LEDGER_RISK` holds the acceptance sentence**, which is E-151's amendment and is how the executed run happened; `tools/check-loopback.ts` refuses one in the source, and does not see the hatch because the hatch is an environment variable | **This is the half that removes the risk.** F-23 is executed: a substituted destination key makes the signer publish the amount encrypted under the substituter's key, permanently |
| Whatever submits sets `tapFailHard` | `FailHardSubmitter` has no method that can omit it, and its method set is pinned by a test so a new method cannot appear unnoticed. ⚠ **The pin does not see a `ledger.call("submit", …)` made outside the class**, and `run-facility.ts`'s control arm makes exactly one, deliberately | **A seatbelt that only helps if someone buckles it.** Nothing forces a *different* submitter to set the flag; the decision request says so in terms — and `CLAIMS.md` **F-25** is why nothing *can*: `tapFailHard` is not a field of the signed transaction, so a signer cannot express the wish |

⚠ **The ruling had no adversarial review**, and it is not one of `REVIEW-019`'s
three options as stated — it is A, plus a reading of C that puts the flag
outside the signer. If the facility comes to rest on it heavily, that is worth a
rotation.

### `tapFailHard`, read at source

rippled 3.3.0 (`00a178f` — the same commit `CLAIMS.md` F-23 was read at, and the
same build the loopback node runs):

* `src/xrpld/rpc/handlers/transaction/Submit.cpp:32-37` — the `submit` RPC's
  `fail_hard` parameter becomes `NetworkOPs::FailHard`.
* `src/xrpld/app/misc/NetworkOPs.cpp:1683-1684` — `FailHard::Yes` sets
  `TapFailHard` in the apply flags.
* `src/libxrpl/tx/Transactor.cpp:1645-1651` —
  `if (isTecClaim(result) && (view().flags() & TapFailHard)) { ctx_.discard(); applied = false; }`,
  under the comment *"If the TapFailHard flag is set, a tec result must not do
  anything"*.
* `NetworkOPs.cpp:1833` — `enforceFailHard` also stops the transaction being
  kept locally **or relayed**, so a `tec` never reaches the network.

`run-facility.ts` §1 executes that claim in both directions, and **it has run**:
the same signed bytes **with** the flag gave `tecNO_AUTH`, `applied=false`,
absent from the validated ledger and no `Sequence` consumed; **without** it, the
identical bytes were applied and the `Sequence` advanced. ⚠ **The two arms are
separated by three ledger closes**, because submitting them back to back cannot
distinguish *"A was discarded and B applied"* from *"A was applied and B was a
duplicate"* — `REVIEW-022` round two found the first version printing a tick on
exactly the failure it exists to detect.

## The operational cost nobody had priced

⚠ **This project had never run a rippled node**, and the ruling's Option A costs
one. What it actually cost, recorded because the decision request could not:

* **The image.** `xrpllabsofficial/xrpld:3.3.0`, which reports
  `git commit 00a178fb92ca49521b937ae1a99d863765ea8a90` — the exact commit this
  project has been reading rippled source at. **amd64 only**, so on Apple
  Silicon it runs emulated.
* **The documented peer hub did not answer.** `r.devnet.rippletest.net:51235`
  refused TCP from both the host and the container on 2026-08-25;
  `s.devnet.rippletest.net:51235` accepted. A node with an unreachable `[ips]`
  list says only *"Node count (0)"* about it.
* **The validator list key was fetched from the list site itself**, not
  transcribed from documentation — `curl https://vl.devnet.rippletest.net`.
* **A macOS bind mount for the ledger database does not work.** NuDB writes many
  small records and a bind mount goes through VirtioFS; the first attempt could
  not keep up with Devnet's ledger close at all. `node.sh` uses a **named docker
  volume** and says why.
* ⚠ **Initial sync is the real cost, and on 2026-08-25 it did not finish — in
  two runs, two ways.** The node must acquire a whole account state tree while
  the network keeps closing ledgers, and under emulation each attempt aborts
  before completing (`InboundLedger: … abort good:29130 dupe:822`).
  **Run 1**: `OOMKilled=true` after 1h31m, ~3.9 GiB RSS in a 7.75 GiB Docker VM.
  **Run 2**, with the VM raised to 11.67 GiB and the node resuming from its own
  6.3 GB store: **it survived and still did not converge** — memory plateaued at
  6.3 GiB, the store grew to 6.9 GB, `complete_ledgers` stayed `empty` for a
  solid hour, and the RPC began timing out while CPU sat at 1663% of 1200%.
  ⚠ **Memory was a ceiling, not the constraint.** What is left is a native arm64
  build, different hardware, or a node the operator controls elsewhere — and
  none of those is a coding-session decision. **Swap is not a lever**: a node
  already saturating twelve cores will not be rescued by paging.
* ⚠ **There is NO rehearsal network.** A standalone rippled looks like the
  obvious fallback and is not one: `signer/src/ledger.rs` hardcodes
  `DEVNET_NETWORK_ID = 2` and *"refuses every network but Devnet, at any phase,
  for any reason"*, so a local ledger would have to **claim to be Devnet** to
  drive the signer — the substitution this project forbids. Option A costs a
  full Devnet sync or nothing.

## The modules

| File | What it is |
|---|---|
| `src/loopback.ts` | The **only** ledger read path. Refuses a non-loopback literal — ⚠ **unless the risk is accepted by name** (E-151's hatch; this row omitted it until `REVIEW-023` round two, two sections below the table that was corrected for exactly that) — refuses a non-Devnet node, refuses a node that is not `full`, pins one validated index and refuses an answer from any other |
| `src/submit.ts` | The submission path for everything the facility does. Always `fail_hard: true`, with no method that can omit it. ⚠ **One deliberate exception exists and it is not in this file**: `run-facility.ts`'s control arm submits once *without* the flag, because demonstrating that the flag makes a difference requires an arm that does not set it |
| `src/book.ts` | The off-ledger balance record TASK ZERO §9 requires (R-5, F-8) |
| `src/signer.ts` | How the facility reaches `signer/`. One process per account |
| `src/facility.ts` | The domain operations — enrol, drawdown, repay, retire |
| `src/mptool.ts` | Decryption only. The facility generates no proofs and draws no blinding factors |
| `src/devnet-accounts.ts` | The faucet. The one file naming a remote host, and the gate records why |
| `run-facility.ts` | The whole walkthrough, executed on Devnet 2026-08-25 — ⚠ under E-151's amendment, not under B-15's conditions |

### Where the confidential transactions come from

**`signer/`, and nothing here changes that.** The facility builds *intents*; the
signer reads the ledger for itself, derives its ElGamal key from the master seed
under the ruled construction, draws `r` and `ρ` under the ruled derivation,
generates the proof, renders a confirmation from fields parsed out of the
transaction **it** built, signs, and hands back a blob. The facility submits it.

⚠ **`ConfidentialMPTMergeInbox` is signed here, not by the signer** — it carries
no proof and no blinding factor, so there is nothing for the signer to generate.
So are the plaintext transactions: `MPTokenIssuanceCreate`,
`MPTokenIssuanceSet`, `MPTokenAuthorize`, `Payment`.

## Stricter than the signer in one place, deliberately

`signer/src/ledger.rs` accepts the **name** `localhost` as loopback. This
accepts only a numeric literal — `127.0.0.0/8` or `::1` — because a name is
resolved by something the process does not control. `REVIEW-016` found
`127.attacker.example` and `127.0.0.1@attacker.example` walking through the Rust
check that exists *because of* F-23; round two found an unterminated `[::1`
doing the same. All three are negative test inputs in
`tests/hostile-endpoints.ts`.

## The balance book, and why it is a requirement

TASK ZERO §9 originally capped the float. The cap was un-retracted when the
1,000,000 decryption bound turned out to be a caller-supplied search window
rather than a ceiling (F-7), and what replaced it is a **balance-tracking
requirement**: a confidential balance is recovered by a **linear** search, so a
holder who knows what their balance should be searches a handful of candidates
and a holder who does not searches the whole facility — and **no sublinear
fallback is shipped** (F-8: the library's own header points at a `bsgs` symbol
that does not exist).

⚠ **The book is not authoritative.** The ledger is. Every entry is a prediction
and `reconcile` is what turns a prediction into a confirmed reading — cheaply if
the book is right, and **loudly** if it is not. `resync` is what a lost book
costs, and `run-facility.ts` §6 prints both widths side by side.

⚠ **Widths, not times.** `CLAIMS.md` P-8 forbids a benchmark number without
hardware, parameter set and methodology, so no per-iteration figure appears
anywhere under `facility/` — the one this project has measured lives in
`docs/task-zero/benchmarks-2026-08-16.md` §4 with all three, under **E-23** and
**F-7**. ⚠ It is **not** F-8's row, and TASK ZERO §9's sentence — which states
the cost and the missing fallback together under one citation — is how the wrong
row gets attached to the number. The width is a parameter and the search has a
fixed iteration count (upstream's `RIPCTXR-1` mitigation), so the width *is* the
cost.

## What this does not hide, and what it is not

**It hides amounts.** Not who transacts, not with whom, not when, not how often,
and the issuer decrypts every balance by construction (P-4, P-9, P-11).
`Convert` and `ConvertBack` publish their amounts **per transaction**, so
retiring in tranches publishes every tranche size (`CLAIMS.md` F-24).

And what is **not built**, named rather than glossed:

* **No permissioned domain.** The walkthrough's step 1 offers `sfDomainID` to
  gate the issuance to credentialled accounts. It needs `PermissionedDomainSet`
  and a credential per supplier, and it is its own milestone.
* **No separation of parties.** One process plays the bank, the Dedicated
  Account and every supplier, so it holds every seed. Every property that
  depends on three parties on three machines is **not demonstrated here**.
* **No human confirmation under `--auto-confirm`.** The run answers the signer's
  prompt itself and prints a notice saying so. `signer/tests/falsifier.rs` is
  what demonstrates the confirmation boundary.
* **No cover traffic.** TASK ZERO §9's mitigation for the drawdown-frequency
  leak is `Proposed`, rests on an indistinguishability claim this project has
  tested three ways and **not established**, and is reviewed by nobody.
* **No answer to who holds the Dedicated Account's key.** `CLAIMS.md` E-117:
  rejecting the XLS-65 `Vault` traded away a pseudo-account with **no key**, and
  the Dedicated Account replacing it has one. The float sits under it.
