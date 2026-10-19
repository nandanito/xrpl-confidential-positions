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

[**Trust model**](#trust-model) · [**Run it**](#running-it) · [**Protocol findings**](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md) · [**What is open**](#what-is-open) · [**Claims register**](CLAIMS.md)

</div>

---

> **Public history starts at publication.** This repository was developed privately from 2026-08-16 and published on 2026-10-19 as two commits: the tree, and its revision log regenerated from this history. The commit hashes cited in `CLAIMS.md` and `docs/reviews/` refer to that private archive and do not resolve here. Issues #1 to #13 were copied from the archive in order, so the issue numbers cited here resolve; the ten closed ones are stubs.

**A confidential receivables facility on the XRP Ledger.** A bank opens a facility. Suppliers enrol, draw down against invoices, and repay. Every position is an encrypted balance on a public ledger, and the facility retires in tranches. It has executed on Devnet, and the point of building it was to establish exactly what an outside observer sees while it happens.

**The answer: it hides the amount of a confidential *transfer*, and balances — and nothing else.** ⚠ **Converting in or out publishes the amount in plaintext, every time**; only a `Send` hides one, so the figure entering confidential form and every figure leaving it are public forever. Who paid whom, when, and how often are public forever; the issuer can decrypt every balance; and one asymmetry matters — a *freshly initialised* balance is publicly recognisable as zero while a *spent-down* one is not. That is the protocol, not a limitation of this build. [**Trust model**](#trust-model) sets it out in full, and it is the section to read before any other.

> ⚠ **Devnet only. No mainnet writes, at any phase, for any reason.**
> Nothing here is audited, production-ready, or safe to put value behind.

**What it exercises:** Multi-Purpose Tokens (XLS-33) and Confidential Transfers (XLS-96), together. ⚠ **Not Credentials (XLS-70) or Permissioned Domains (XLS-80)** — gating an issuance to credentialled accounts needs a `PermissionedDomainSet` and a credential per supplier, which is a separate milestone that has not been built. The issuance carries no `sfDomainID` and the facility says so when it runs.

**It has a second output.** Building carefully against a young specification surfaces things its authors would want to know. XLS-0096 was created on 2026-01-15 and was still a Draft when this project began on 2026-08-16. Upstream marked it `Final` on 2026-09-03, in PR #604, and last changed it on 2026-09-10, when it took in errata this project filed. Both dates were read on 2026-10-18 (E-1, E-316). ⚠ **This paragraph and the badge above called it a Draft until 2026-10-18.** Those accumulate in [`UPSTREAM-FEEDBACK.md`](UPSTREAM-FEEDBACK.md) and are filed under [`docs/UPSTREAM-FILING-PROTOCOL.md`](docs/UPSTREAM-FILING-PROTOCOL.md), held to a higher evidence bar than anything published here.

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

## Status — measured 2026-10-18

| | how it was counted |
|---|---|
| Signer test suite | **279 pass, 0 fail** — `cargo test`, every `test result:` line summed (21 of them), run twice on 2026-10-18 with the same result. A further **4 are `#[ignore]`d by default**, and they are the four that touch live Devnet, so the headline number excludes exactly the tests that exercise the network |
| TypeScript test suites | **232 pass, 0 fail** — `bun test facility web/api tools`, run twice with the signer built. ⚠ One earlier run that day had **1 fail**: a facility test hit Bun's 5-second timeout while `cargo test` was competing for the CPU, and the next two runs passed. From a fresh clone with no signer built, `make ci` gives 227 pass, 0 fail and 5 skipped |
| Type check | clean — `bunx tsc --noEmit` |
| Gates | **every repository-wide gate green** on 2026-10-18, including the full secret sweep (`make check-no-secrets`), which needs the local secret store. No count is given; [The gates](#the-gates) says why |
| Amendments | `ConfidentialTransfer`, `PermissionedDomains`, `SingleAssetVault` all **ENABLED** on Devnet, read `2026-10-18T05:29:58.961Z` — [snapshot committed](docs/task-zero/amendments-2026-10-18.json) |
| Devnet, inherited | **28 validated facility transactions**, 2026-08-25 — issuance and per-party reconciliation in [`facility/README.md`](facility/README.md). **6 signer run receipts**, one per milestone, in [`docs/runs/`](docs/runs/). ⚠ The public Devnet endpoint no longer serves ledgers that old (see below) |

**The first five rows were produced on 2026-10-18**, by the command or the tool named in each. **The last row was not** — those are dated artifacts from earlier sessions, quoted rather than re-counted.

### Evidence a stranger can check without cloning anything

Devnet is a public ledger, and these four were re-queried and confirmed validated on 2026-09-01. The `MPTAmount` column is the disclosure argument in one place.

⚠ **On 2026-10-18 the public Devnet endpoint no longer served them.** `tx` returned `txnNotFound` for all four, because `https://s.devnet.rippletest.net:51234/` now keeps only ledgers from 5,171,980 onward. Devnet was not reset: the facility's accounts still exist (E-319). A full-history node or an explorer may still have these transactions, and this project has not checked one.

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
          XRPL Devnet — network_id 2, rippled 3.4.1 when read on 2026-10-18
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

  This is the one place where *holding no key* is checked rather than intended. [`tools/check-web-readonly.ts`](tools/check-web-readonly.ts) asserts that **`web/api`** constructs `Status` and never `Pair` or `Prepare`; that **nothing anywhere under `web/`** reaches a signing call, reads a secret environment variable, decrypts, or spawns a process; and that **exactly one file under `web/api/` touches the socket** — discovered, not pinned by name. ⚠ **The Pair/Prepare scan covers `web/api` only, not the whole tier.** It also cannot prove what that one client sends at runtime, and says so itself. ⚠ **Nor does it check what the tier *emits*, or to whom**, and its own output says that too. What keeps a decrypted figure off the wire is a test, `web/api/disclosure.test.ts`, not this gate (E-241).

  **The first build violated it.** An unauthenticated `GET` decrypted on every request — the caller chose the account and got a plaintext balance back, which is a decryption oracle (E-212). The issuer key now lives in a CLI, [`tools/issuer-view-snapshot.ts`](tools/issuer-view-snapshot.ts), which decrypts a curated set once and writes a file; the tier renders that file, which is why the issuer view is a snapshot and not a live read. That closed the chosen-input decryption, but every response still carried the decrypted figure. **Since 2026-09-05 it does not**: the route reports only *whether* the issuer could decrypt the balance, and the figure is read with the CLI, [`tools/issuer-decrypt-balance.ts`](tools/issuer-decrypt-balance.ts) (E-241).

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
2. It blocks deletion of the holder's `MPToken`, and so locks its reserve, **for as long as any holder of the issuance has a confidential balance**, including after this holder's own balance returns to zero. XLS-0096 §7.2 states the rule, read at `58ccd30` on 2026-10-18: a holder's own deletion fails with `tecHAS_OBLIGATIONS` while the issuance's `ConfidentialOutstandingAmount` is non-zero, and succeeds once it is zero, with the confidential fields still present. Deletion by the vault and loan-broker transactions is blocked whenever any confidential field is present. **So the reserve comes back only when every holder has left confidential form, which no single holder controls.** ⚠ **This item called the block unconditional until 2026-10-18.** That was XLS-0096's earlier wording, which rippled never enforced (**F-29**, read at rippled 3.3.0 source and not executed). This project filed the difference as [XRPL-Standards #610](https://github.com/XRPLF/XRPL-Standards/issues/610); PR #604 rewrote the section to match, and #610 was closed (E-316).
3. It publishes the converted amount **in plaintext**.

---

## What the research established

Seven findings about **XLS-96 itself**, one per numbered section of the explainer below —
proof sizes and composition, why a large balance can decrypt faster than a small one, and
where a confidential balance silently fails to compose with the ledger's vault and lending
primitives. Three of them, §2, §4 and §5, correct a reading this project published first. Two
were filed upstream, as XRPL-Standards #611 (§5) and #610 (§6). By the survey of 2026-10-18,
#610 had been fixed and closed and #611 had no reply (E-316).

⚠ **None of it is a security claim about this project.** Each finding has a graded row in
[`CLAIMS.md`](CLAIMS.md).

**→ [`docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md`](docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md)**

---

## Running it

### Five minutes: the checks, with no Rust and no vendored build

You need [Bun](https://bun.sh) 1.3.14, `git` and `make`. From a fresh clone:

```bash
bun install --frozen-lockfile
make ci
```

`make ci` runs exactly what GitHub Actions runs: the type check, the TypeScript suites, every repository gate that takes no argument, the secret sweep's shape classes, and `check-filing` on the template. Measured from a fresh clone with no signer built, on 2026-10-18: 227 tests pass, 0 fail and 5 are skipped.

⚠ **It does not run the signer.** The Rust suite and the two gates that compile it need the vendored build below. Five facility tests start a real signer, and `make ci` reports them as skipped by name rather than as passes. The script prints that list at the end of every run.

### The full build: the signer, the facility and the viewer

**Read [`docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md`](docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md) first.** It is what to show, in what order, and what not to say. The [limitations note](docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md) beside it is what the demonstration does **not** establish.

**You need:** a Rust toolchain (edition 2021), [Bun](https://bun.sh), `make`, `git`, `cmake`, `clang`/`clang++`, and Homebrew `openssl@3`. ⚠ **`tools/rebuild-env.sh` is what compiles** the vendored, patched fork of `mpt-crypto`; `signer/build.rs` only locates, validates and links the result. Network access for the pinned GitHub clones, and to Devnet: the signer and facility read `https://s.devnet.rippletest.net:51234/`, while `check-amendments` uses the WebSocket on `:51233`.

```bash
tools/rebuild-env.sh    # builds the vendored C library into /tmp/wconf; re-run after any /tmp clean
make signer             # cargo build
```

`rebuild-env.sh` exists because the signer links against a patched `mpt-crypto` that lives in `/tmp/wconf` and does not survive a `/tmp` clean. ⚠ **That path is writable by any process running as the same user — the adversary this project puts in scope** — so a build tree in `/tmp` is a development convenience the threat model does not cover. The patch is committed, so the tree is reproducible from a clone; `make vendor-verify` checks the pin, confines tracked differences to an allowlist, and checks the nonce and witness-offset patterns; when both upstream tags are available it also byte-compares their `src/` and `include/`. ⚠ **It is weaker than it sounds.** It uses `git diff --name-only`, so it allows arbitrary *content* changes inside allowlisted files and **cannot see untracked files at all** — while the build compiles every `src/*.c`. The tag comparison prints `SKIP` and still succeeds if a tag is missing. It is not in the gate list below because it checks a build tree rather than this repository's sources. It passed on 2026-10-18, with both tags present and compared.

**The read-only viewer** — two processes, and it renders state that something else created:

```bash
make web-api            # http://127.0.0.1:3011
make web-app            # http://127.0.0.1:3000
```

**The signer and the facility** are separate processes, and starting them needs a holder profile and funded Devnet accounts that this document does not tell you how to create. `make signer-run` and `make facility` are the targets; **the demo script is what tells you what has to exist first.** Devnet account seeds are not reproducible from anything committed — if you have no prior run, you are creating a fresh chain of accounts, not resuming one.

The walkthroughs are in [`docs/explainer/`](docs/explainer/): the [facility](docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md), the [web tier](docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md), and the [stack and the reasoning behind it](docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md).

### The gates

Most run over the whole repository; `check-filing` takes a draft document as an argument and so is run per draft, and `check-amendments` is a dated reading against a live node rather than a pass/fail gate. ⚠ **No count is given here.** This sentence said *"Nine"* until 2026-09-04 and was stale within a day of a tenth landing — the project generated an index because hand-maintained facts rot, then left its own gate count hand-maintained (`CLAIMS.md` E-236, E-239). **Run `grep -oE '^check-[a-z-]+:' Makefile` instead.** They exist because this project's recurring defect is a claim outrunning its evidence, and a gate is the only form of such a claim that has a falsifier.

```bash
make ci                                        # every gate that needs no vendored build
make check-test-support check-zeroize-bounds   # need tools/rebuild-env.sh first; ~3 min
make check-no-secrets                          # the full secret sweep; needs the local secret store
make check-filing FILE=path/to/draft.md        # per-document
```

**Most are lexical and over a named set**, and each prints what it does *not* check in its own output. Read that part. ⚠ **Two are not lexical**: `check-test-support` compiles probe crates, and `check-personas` byte-compares canonical files against generated ones. **Nor do all of them carry injected-detector controls** — `check-personas` and `check-blinding` have none. Gates built to catch false passes have themselves false-passed, many times. The register numbers the instances up to a ninth (E-226, E-235, E-237) and has recorded more since (E-259 to E-261). ⚠ **This sentence said *"five separate times"* until 2026-10-18, a count that went stale with the sixth.** That is why the ones that do carry controls run them through the same detector the real check calls — and **a gate is verified by breaking it, never by reading it.**

⚠ **`check-loopback` is about URL literals in source, not about how anything was run.** It asserts that every non-loopback endpoint in the facility's code is recorded with a reason. It does **not** assert that a loopback node was used, and none was — see [What is open](#what-is-open).

`make check-amendments` is a live `feature` RPC reader, not a gate; its output is meant to be pasted with a date.

---

## Layout

```
CLAIMS.md                      claims register — read before writing anything public
UPSTREAM-FEEDBACK.md           observations destined for the XLS-96 authors
CLAUDE.md                      working instructions for coding sessions
Makefile                       the gates, the builds and the demo targets
CONTRIBUTING.md                what a good pull request looks like
SECURITY.md                    how to report a vulnerability
LICENSE                        Apache 2.0
NOTICE                         third-party material, which the Apache licence does not cover
LICENSES/                      the notices that material requires
.github/                       the CI workflow, which runs tools/ci.sh
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

Read `2026-10-18T05:29:58.961Z`, snapshot committed at [`amendments-2026-10-18.json`](docs/task-zero/amendments-2026-10-18.json); the previous reading, `2026-09-01T14:24:51.393Z`, gave the same table. Mainnet and Testnet are read for contrast only; **nothing is ever submitted to either.**

| network | `ConfidentialTransfer` | `PermissionedDomains` | `SingleAssetVault` |
|---|---|---|---|
| **Devnet** — `wss://s.devnet.rippletest.net:51233`, network_id 2 | **ENABLED** | **ENABLED** | **ENABLED** |
| Testnet | supported, not enabled | ENABLED | supported, not enabled |
| Mainnet | supported, not enabled | ENABLED | supported, not enabled |

`LendingProtocol` was enabled on Devnet in the same 2026-10-18 reading, and that is what makes the open XLS-66 question testable rather than theoretical.

**Devnet is the only network where this can run at all.** On Mainnet and Testnet the server reports `ConfidentialTransfer` by name as `supported, not enabled` — a positive answer from the node, not an inference from a missing entry. This project takes no position on whether or when that changes.

**No dedicated "Confidential Devnet" is needed.** A prerelease-documented one had a dead faucet and the canonical xrpl.org page names no dedicated network; the amendment is live on the general Devnet. Whether such a network still exists somewhere was **not** searched — the question became moot once Devnet answered, and this is a statement about what this project needs, not about what exists.

⚠ **Amendment state is a reading, not knowledge** (P-3). Run `make check-amendments` and paste fresh dated output beside any status claim. The table above is true on its date and carries no guarantee past it. Method and the original 2026-08-16 reading: [`amendments-2026-08-16.md`](docs/task-zero/amendments-2026-08-16.md).

---

## What is open

**The item that used to head this list is closed, and it closed by removal.**
`ADR-0003`'s central claim — ~~*that a tier which reads public state and holds no credential
moves no trust boundary*~~ — went through a four-leg adversarial rotation on 2026-09-02
(`REVIEW-036`) and was **ruled unsound**: both of its factual premises are false against
source. What is true is narrower, and it is what the tier needs: it adds no *signing*
authority. The claim had hidden a disclosure boundary that did move. The tier served a
decrypted issuer view and the signer's local status, unauthenticated, to any local user, out
from behind `0600`/`0700` permissions the project sets deliberately (E-228, E-230).

**The owner ruled on 2026-09-05 to remove that disclosure rather than guard it** (E-241). The
issuer route now reports *whether* a balance decrypted and never the figure. The signer route
no longer carries the socket path or the signer's note, whose record count included attempts
that never reached the ledger. `ADR-0003` is `Accepted` at revision 3. ⚠ **This section said
until 2026-10-18 that the ruling was still owed**, six weeks after it was made.

Everything still open, with where it is actually tracked:

| open | what it means | tracked in |
|---|---|---|
| **The key derivation is not published** | A holder with their master seed and **not this repository** cannot reconstruct their key — the entire benefit deriving buys. No code discharges it. ⚠ Treat the derivation as lock-in until it is published | issue #10 |
| **Nothing has run under loopback** | Every Devnet read goes to the public cluster under a named risk acceptance, because a local node could not acquire the state tree on this hardware. Every run record says `underB15Conditions: false` | B-15, E-148, E-151 |
| **The issuer snapshot is plaintext on disk** | `tools/issuer-view-snapshot.ts` writes a curated set of decrypted demo balances to a file with mode `0600`. The web tier reads that file and no longer serves the figure (E-241), but any process running as the same user can read the file, and that is the adversary this project puts in scope. The removal has a falsifier test, verified by reverting it. `REVIEW-057`'s first round probed the running route with a synthetic snapshot on 2026-10-18 and found no figure served, which is a check of the code, not an adversarial review of the ruling. ⚠ **This row said until 2026-10-18 that the figure was also served on the wire**, which stopped on 2026-09-05 | E-212, E-241 |
| **Custody** | **Accepted by name, not solved.** Two review rounds found more holders of power over the facility's float than one key — the issuer can erase or freeze it, and the key that decrypts is also required to spend — and the risk is ruled accepted, printed on every facility run. The custody demo mode is **simulated and is never an integration**; this repository holds no primary sources for any custody platform | B-27, E-290, E-294, `docs/research/CUSTODY-2026-08-28.md` |
| **`ADR-0002`** | `Proposed` on a research item | `docs/decisions/` |
| **Bulletproof blinding** | Whether determinism is acceptable when the scalars carry the zero-knowledge property. Off the critical path | issue #8 |
| **`terFROZEN` preflight** | Needs rippled source this repository does not hold | B-17 |
| **`MPToken` reserve amount** | Asked for in *Before opting in* and **not recorded anywhere in this project** — named rather than invented | — |

### Upstream

**Eleven filings have gone out: seven on 2026-08-26, one on 2026-09-28 and three on 2026-10-18.** Every outcome below was re-surveyed at source on 2026-10-18, for this README ([`docs/evidence/upstream-survey-2026-10-18/`](docs/evidence/upstream-survey-2026-10-18/README.md)). Four of the first seven were fixed upstream in September and closed when the fix merged — the xrpl.org page by dev-portal PR #3916, XLS-0096 by PRs #604 and #628 — and this project did not notice for five weeks (E-316). [`rippled#8118`](https://github.com/XRPLF/rippled/issues/8118) was closed without comment the day it was filed (E-216), [`XRPL-Standards#611`](https://github.com/XRPLF/XRPL-Standards/issues/611) has had no reply, and the five `XRPLF/mpt-crypto` filings are open: one answered with a PR, one with a fix in review, three filed on 2026-10-18.

The six then open were re-audited against upstream HEAD on 2026-09-01 and every claim still stood (E-216) — so on that evidence the defect was the **order of operations**, not the research: the adversarial review ran *after* submission, where it can only produce a public correction. One audit of six filings does not establish the process was sound in general, and ⚠ a register that does not re-survey its filings goes stale in the direction that flatters it (E-316).

That order is now inverted: [`docs/UPSTREAM-FILING-PROTOCOL.md`](docs/UPSTREAM-FILING-PROTOCOL.md) rule 1 gates filing on a review by a **different session**. Filing is authorised per filing, per session, and on 2026-10-18 no authorisation was outstanding.

**The register's ungraded section was withdrawn before publication.** [`UPSTREAM-FEEDBACK.md`](UPSTREAM-FEEDBACK.md) used to carry an *Observed — not yet verified, do not send* section: 33 rows of unverified observations about other people's work, captured under this project's rule that capture and verification are separate acts. **An adversarial rotation on publication found the heading insufficient** — it constrains a reader who reads it, not a search engine or a screenshot, and it risked the reputational effect of an accusation with a disclaimer of having verified it. The rows are withheld, not retracted, and rejoin the register the normal way: verified, graded, cited (`CLAIMS.md` E-240).

**Nor are they in the public repository's history.** The public repository starts at publication, squashed into two commits: the tree, and its revision log regenerated from that history. The owner ruled the squash on 2026-09-22 (E-309). The private repository it was developed in is the archive of record, and it keeps the withheld rows along with the record of what this project believed and when it corrected itself. ⚠ **This paragraph said until 2026-10-18 that the rows would stay in public git history.** That was the owner's ruling of 2026-09-05 (E-240), and the squash ruling replaced it.

**Found a defect here?** Open an issue on this repository. The filing protocol governs what this project sends *upstream* to XRPLF; it does not govern what you send us.

---

## Contributing, security and conduct

[`CONTRIBUTING.md`](CONTRIBUTING.md) says what contributions are wanted and what a pull request must pass. [`SECURITY.md`](SECURITY.md) says how to report a vulnerability, and that this is a research artifact rather than production software. [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) is the Contributor Covenant.

## Licence

[Apache 2.0](LICENSE), for this project's own work. Material reproduced from third parties is not covered by it: a patch against `XRPLF/mpt-crypto`, which carries no licence, and quotations of other projects' source and specifications in the records. [`NOTICE`](NOTICE) lists that material, [`LICENSES/`](LICENSES/) carries the notices it requires, and [`docs/third-party/INVENTORY.md`](docs/third-party/INVENTORY.md) is the measured list it was written from.

## Credit

XLS-0096 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, with the reference cryptography in [`XRPLF/mpt-crypto`](https://github.com/XRPLF/mpt-crypto).

The compact sigma protocol that gives the send proof its 192 bytes — with the twisted-ElGamal and Bulletproofs++ analyses behind several of the size decisions — is the work of **Tess Dore and Murat Cenk** at RippleX Research, published separately from XLS-0096. Cite them for it; copying the XLS-0096 author list alone leaves Dore out.

The Confidential Transfer implementation was reviewed by **Trail of Bits** in April 2026. Several things this repository first recorded as findings turned out to be issues that review had already found and Ripple had already fixed, so check it before believing anything here is novel. ⚠ **A later revision of that report is recorded as an unobtainable source** (B-13) — this project has not read it. It was also not the only review: the Sherlock XRP Ledger Attackathon (contest 1260, April 2026) produced findings against the Confidential Transfer code that upstream issues cite by number — [`mpt-crypto#102`](https://github.com/XRPLF/mpt-crypto/issues/102) cites Sherlock #2759, a MergeInbox finding — and this project could not obtain its findings by the routes it tried, so nothing here was checked against them (`CLAIMS.md` B-30). A third, a Zellic scan of `mpt-crypto` at `3baaaac`, is known only through the three findings [`mpt-crypto#147`](https://github.com/XRPLF/mpt-crypto/issues/147) cites by identifier (`CLAIMS.md` B-31). **Of the three, only Trail of Bits' April report could be checked.**

This repository analyses and builds on all of the above; it claims none of it.

---

*The repository is named `xrpl-confidential-positions`, held since 2026-08-16 and adopted as the project name on 2026-09-01. `xrpl-confidential-facility` was the alternative. Both were free on npm when checked on 2026-08-16 — re-check before publishing any package, and note that GitHub redirects on rename while npm does not.*
