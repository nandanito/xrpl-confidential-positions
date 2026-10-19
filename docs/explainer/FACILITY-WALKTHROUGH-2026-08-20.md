# A confidential receivables facility on the XRPL — how it actually works

**Date:** 2026-08-20, **revised twice on 2026-08-25 and once on 2026-08-28**
(§5's zero-balance nuance for `CLAIMS.md` **E-211**, §6's build table for the
web tier, and the amendment reading re-dated) — §3 step 4 and §4's table
for `CLAIMS.md` **F-26** (a second false disclosure sentence in this document),
§3 step 9 and §4's table for **F-24**, and §6's build table after architecture
§6 step 7 was **built and executed**. **Devnet only.** Written as the reference
an app, an explainer or a post would be built *from* — not as any of those.

⚠ **The facility now runs, and the row in §6 carries a qualification that must
travel with it**: the run was **not** under `CLAIMS.md` B-15's step-7
conditions, because the ledger source was remote under an amended ruling
(E-151). It is evidence that the transactions are well-formed and that rippled
accepts them. It is **not** evidence about the loopback obligation.

> ## ⚠ Read this box before reusing anything below
>
> **This has not been through the project's publishing protocol.** That protocol
> is deliberately not part of a coding session, and nothing here is cleared for
> external use. Every capability sentence below is written against
> `CLAIMS.md`'s standing prohibitions, and the register is the authority if the
> two ever disagree.
>
> **The one sentence that must survive any rewrite:** this design hides
> **amounts**. It does not hide **who** transacts, **with whom**, **when**, or
> **how often**, and the issuer can decrypt every balance by construction. An
> explainer that leaves that out is not a simplification of this document; it is
> a different and false claim.

---

## 1. The commercial problem, in one paragraph

A large buyer's suppliers want to be paid early; a bank will advance against the
buyer's payables. That is receivables financing, and the numbers in it are
commercially sensitive in a specific way: **a supplier's drawdown level tells you
their cash position.** Put that on a public ledger in plaintext and you have
published every supplier's working-capital stress to their competitors and to
the buyer's other counterparties. Put it on a private ledger and you have given
up most of what a shared ledger was for.

**XLS-0096 Confidential MPTs are an attempt at the middle**: amounts encrypted
on a public chain, with a decryption path reserved for the parties who are
accountable for the book.

## 2. The shape

Three roles, **one issuance**, and every participant holds a confidential
balance in it.

```
      ┌────────────────────────┐
      │  Funding bank          │  issuer of the MPT
      │  · IssuerEncryptionKey │  ── can decrypt EVERY balance, always
      │  · AuditorEncryptionKey│  ── optional second party, same power
      └───────────┬────────────┘
                  │ funds publicly, once
                  ▼
      ┌────────────────────────┐
      │  Dedicated Account     │  an ORDINARY XRPL account
      │  holds the float,      │  (not an XLS-65 Vault — see §7)
      │  confidentially        │
      └───────────┬────────────┘
                  │  ConfidentialMPTSend — amounts hidden
        ┌─────────┼─────────┬─────────┐
        ▼         ▼         ▼         ▼
     supplier  supplier  supplier   ...        each with its own
        A         B         C                  HolderEncryptionKey
```

⚠ **"Dedicated Account", never "vault".** An XLS-65 `Vault` is a different
ledger object, it *cannot* convert to a confidential balance, and the word has
already nearly derailed one reading of the design.

## 3. The walkthrough

A worked example: a bank runs a **£50m** facility for **30 suppliers** of one
large buyer.

### Setup — public, and deliberately so

**Step 1 — the bank creates the issuance.** A Multi-Purpose Token flagged to
hold confidential balances. It sets:

- **`IssuerEncryptionKey`** — mandatory. The bank can decrypt every holder's
  balance. **No configuration removes this**, and any design that assumes
  otherwise is wrong about the protocol.
- **`AuditorEncryptionKey`** — optional. A trustee or supervisor with the same
  visibility.
- **`sfDomainID`** — gates the issuance to a permissioned domain, so only
  credentialled accounts can hold it.

⚠ **`TransferFee` must be zero on a confidential issuance.** Fees and interest
settle off-ledger or as separate confidential transfers. That is a protocol
constraint, not a design choice, and it shapes everything downstream.

**Step 2 — the bank creates a Dedicated Account.** An ordinary XRPL account.
It cannot be the issuer account: **an issuer cannot convert its own issuance
into a confidential balance.** The ledger refuses it outright — this is the
reason the design needs a separate account to hold the float, not a stylistic
preference.

**Step 3 — the bank funds it publicly** with the whole £50m float, as plaintext
MPT.

### The one plaintext moment

**Step 4 — one `ConfidentialMPTConvert`.** This does two things at once: it
registers the Dedicated Account's `HolderEncryptionKey`, and it moves the entire
float into confidentiality.

**The amount is public at this step, and that is the intent.** Facility size is
what the market and the funders are entitled to see.

⚠ **~~After this, no plaintext amount appears again until the facility is
retired or resized.~~ That sentence was FALSE and is struck (2026-08-25,
`CLAIMS.md` F-26).** Step 5 publishes two plaintext amounts **per supplier** —
the bank's `Payment` of the enrolment token, and the supplier's own
`ConfidentialMPTConvert`, whose `MPTAmount` is a plaintext field exactly as step
4's and step 9's are. On a thirty-supplier facility that is sixty plaintext
amounts between the float conversion and the first drawdown.

**What is true, and it is what the design actually buys:** no **drawdown** and
no **repayment** publishes an amount, and those are the numbers that carry the
commercial signal. The plaintext amounts are the enrolment tokens, which are
deliberately nominal and identical, and the facility-level ones — its size, and
each tranche of its retirement.

⚠ This is the **second** false disclosure sentence found in this document
(F-24 was the first), and like F-24 it survived the document's own
`claims-check`. Both were about *which* amounts are plaintext. A sentence of the
form *"no plaintext amount appears after X"* should be assumed wrong until every
transaction type between X and the end has been listed.

### Enrolling a supplier

**Step 5.** The bank pays the supplier a token amount of the MPT publicly, and
the supplier runs its own `ConfidentialMPTConvert` — which is what registers
their `HolderEncryptionKey`.

⚠ **Registration happens exactly once and cannot be repeated.** The protocol
requires the key when initialising and forbids it afterwards. A supplier with no
registered key **cannot receive a confidential amount at all** — there is no key
to encrypt to, so the transaction cannot be built, let alone rejected.

### Running the facility

**Step 6 — drawdown.** Dedicated Account → supplier, one `ConfidentialMPTSend`.
The amount is hidden. Received value lands in the supplier's **inbox**; a
`ConfidentialMPTMergeInbox` moves it into their spendable balance.

**Step 7 — repayment.** Supplier → Dedicated Account, the same transaction type,
amount hidden.

**Step 8 — several funders?** They are confidential holders in the same
issuance. The bank sends each their position confidentially, and yield as
further confidential transfers. **No shares and no share price** — positions are
denominated directly, which is a large part of why a `Vault` buys nothing here
(§7).

### Wind-down

**Step 9 — `ConfidentialMPTConvertBack`** when the facility retires or resizes.

⚠ **Public: each ConvertBack's OWN amount, in the clear — not merely the
aggregate change.** ~~Public: the aggregate change.~~ **Corrected 2026-08-25
(`CLAIMS.md` F-24), and the earlier sentence would have misled a reader in a way
that matters:** `MPTAmount` is a plaintext field on every individual
`ConfidentialMPTConvertBack` (XLS-0096 §10.3), so retiring a facility in tranches
publishes **every tranche size**, not just the net movement in
`sfConfidentialOutstandingAmount`. Two ConvertBacks executed on 2026-08-24 read
95 and 191 straight off their validated transactions.

This is symmetric with step 4: **`Convert` and `ConvertBack` are the two
transaction types in this design that publish an amount, and both publish it per
transaction.** It is the specification's own intent — §10.7's worked example
turns on it — and not a defect.

---

## 4. Who sees what

| | Facility size | Who is enrolled | Who drew, when, how often | **Amounts** |
|---|---|---|---|---|
| Anyone with a block explorer | ✅ | ✅ | ✅ | ❌ for drawdowns and repayments — **but every `Convert` amount, every `ConvertBack` amount and every plaintext `Payment` is public** (F-24, F-26). That is the facility's size, each retirement tranche, **and both plaintext amounts of every enrolment** |
| A supplier | ✅ | ✅ | ✅ | only their own |
| **The bank (issuer)** | ✅ | ✅ | ✅ | **✅ everyone's** |
| **An auditor, if configured** | ✅ | ✅ | ✅ | **✅ everyone's** |

**Three tiers of disclosure, and none of them requires publishing a position:**

1. **Public** — `sfConfidentialOutstandingAmount` on the issuance keeps the
   aggregate visible, alongside the transaction graph.
2. **The arranger** — the mandatory issuer mirror.
3. **A supervisor or trustee** — the optional auditor key.

⚠ **This is a statement about who can decrypt what. It is not a compliance
claim.** Nothing here asserts that the structure satisfies any named
jurisdiction's requirements.

## 5. ⚠ What this does NOT hide

The most important section in this document, and the one most likely to be cut
from a shorter version.

**It hides the amount of a confidential *transfer*, and balances. It hides nothing else** — and ⚠ **converting in or out publishes the amount in plaintext, every time.** Only a `Send` hides one.

- **The counterparty set is public.** Every supplier on the facility is
  identifiable.
- **Timing and frequency are public.** Every drawdown and repayment is a visible
  event with a timestamp.
- **Therefore drawdown *frequency* leaks.** A supplier moving from monthly to
  weekly draws is **legible as distress without a single amount being known** —
  which is a substantial part of the commercial signal the design set out to
  protect.
- **No holder is private from the issuer.** By construction, permanently.

**The proposed mitigation for the frequency leak — scheduled cover traffic, so
the Dedicated Account sends to every supplier on a fixed cadence whether or not
value moves — is `Proposed` and has been reviewed by nobody.** It rests on
zero-amount sends being indistinguishable from real ones, which this project has
tested three ways and **has not established**. Surviving three attempts to break
a claim is not a proof of it. Do not present cover traffic as a feature.

⚠ **One thing this section did NOT say, added 2026-08-28 (`CLAIMS.md` E-211):**
**a balance can be exactly zero and not publicly identifiable as zero.** F-1's
canonical `EncZero` is used on first-time init, merge reset and clawback — so a
freshly-enrolled supplier's balance **is** publicly known to be zero, while a
supplier who has drawn and fully repaid holds a *randomised* encryption of zero
that matches nothing. **The two look completely different to an observer and
are the same number.** ⚠ The converse is the trap: **a ciphertext that does not
match the canonical zero is NOT evidence of a non-zero balance**, and the web
tier shipped a sentence saying it was.

**And two protocol constraints that shape any product built on this:**

- **Keys cannot be rotated or recovered.** A lost key is a permanently lost
  balance; a compromised key is permanently compromised.
- **Clawback, where the issuance enables it, burns the holder's *entire*
  balance.** It cannot model partial recovery. It is a sanctions instrument,
  not a repayment mechanism. (It is available only if the issuance carries
  `lsfMPTCanClawback`; without that flag the attempt is refused — a
  qualification `claims-check` caught missing here.)

## 6. What is actually built, as of 2026-08-25

Honest status, because an explainer that blurs *demonstrated* into *designed* is
the failure this project exists to avoid.

| | Status |
|---|---|
| Issuance, enrolment, Convert, Send, MergeInbox on Devnet | **Executed.** Real transactions, validated |
| A local signer that generates the proofs and signs | **Built.** Reads the ledger itself, holds throwaway keys |
| `ConfidentialMPTConvertBack` (step 9) | ~~**NOT built.** Refused by name rather than guessed at~~ — **BUILT AND EXECUTED 2026-08-24.** Two on Devnet under a **derived** ElGamal key, both validated, with all four of XLS-0096 §10.5's state changes checked against ledger state before and after rather than inferred from `tesSUCCESS` (`CLAIMS.md` E-131). The field set is §10.3's, read at source |
| Real key generation and onboarding | **Built and executed 2026-08-20.** The ElGamal key is derived from the master seed under the ruled construction, and a Devnet account holds a position under one (`CLAIMS.md` E-118). ⚠ **The derivation is not a published standard**, so a holder with their seed and not this repository cannot reconstruct their key — that is the benefit the ruling trades for, and it is open (issue #10) |
| The facility as application logic | **BUILT AND EXECUTED 2026-08-25** — 28 validated facility transactions on Devnet: the Dedicated Account, the single conversion, three supplier enrolments, three drawdowns, two repayments, the merges and retirement in two tranches. Every party's decrypted balance matches the off-ledger book, and the issuance's plaintext `ConfidentialOutstandingAmount` is exactly the sum of the hidden positions. ⚠ **NOT under `CLAIMS.md` B-15's step-7 conditions**: the ledger source was **remote**, under the owner's amendment (E-151), because a loopback node proved unaffordable on the available hardware (E-148). `fail_hard` was in force on every facility **movement**; loopback was not. ⚠ **Not "every submission"** — the run's fail-hard control submits one arm **without** the flag, deliberately, and B-15's Part C says *"whatever submits"* with no control-arm exception, so the run record's `underB15Conditions` is `false` for that reason as well as for the remote source (`REVIEW-023` round two). **Nothing in this run is evidence about the loopback obligation** |
| An observer harness showing what the public sees | **Built**, and it is what §5's claims are checked against |
| A read-only web tier rendering all of the above | **Built and exercised 2026-08-28** — architecture §6 step 8, `web/`. It renders the observer view, the issuer view and a capability matrix. ⚠ **It never signs and holds no key**; signing stays in the CLI signer. ⚠ **It has had NO adversarial review** — `ADR-0003` is `Proposed`. See `WEB-TIER-DEMO-SCRIPT-2026-08-28.md` |

⚠ **Amendment status is a reading, not knowledge.** `ConfidentialTransfer`,
`PermissionedDomains` and `SingleAssetVault` were observed `ENABLED` on Devnet
at ~~**2026-08-24T14:42:31Z**~~ **2026-08-28T04:45:40.875Z**, alongside
`MPTokensV1`, `DynamicMPT` and `LendingProtocol`. **That reading expires.**
Re-check before relying on it.
(`SingleAssetVault` is required to *write* `sfDomainID` even though no `Vault`
object is ever created.)

⚠ **Everything here runs on Devnet with throwaway keys.** Nothing in this
project is secure, audited, non-custodial or production-ready, and nothing
should ever hold value.

## 7. Two designs that were considered and rejected

**Building on XLS-66, the lending protocol.** Rejected. Five independent
blockers, any one sufficient: a vault share token cannot be made confidential;
vault and broker pseudo-accounts can neither convert into nor receive a
confidential balance, because they cannot sign; every loan and vault value is a
plaintext ledger field; there are no revolving drawdowns, only discrete public
`Loan` objects; and value must leave confidentiality before it can enter a vault
at all. Evidenced on Devnet, not read from a specification.

**A hybrid — an XLS-65 `Vault` for the funding side, confidential transfers for
drawdowns.** Rejected, and the reason is worth stating because it is not the
obvious one. **A `Vault`'s share token cannot be confidential**, so the hybrid
forces a hard choice: *native share accounting* **or** *confidential investor
positions*, never both. The accounting is arithmetic an application can do; the
confidential position is the thing that does not exist elsewhere. And since
`TransferFee` is forced to zero and interest settles off-ledger anyway, the
share-price arithmetic was never going on-chain to begin with.

**A consequence worth noticing:** because every participant is a confidential
holder in one issuance, **the number of funders stops mattering to the
architecture.** One bank or twenty investors — the design does not fork.

Both rejections are recorded, with their evidence and their reversal conditions,
in `docs/decisions/ADR-0002-facility-as-application-logic.md`.

## 8. Where the claims in this document come from

Every capability statement above traces to `CLAIMS.md`, which grades each claim
by whether it was **executed**, **read at source**, or **inferred** — and which
carries a list of things this project may never claim. If a sentence here reads
as stronger than the register, the register wins and the sentence is a defect.

**Reusing this material:** the §5 disclosures are not optional context. A
version of this that keeps the walkthrough and drops "identities and timing are
public, the issuer decrypts everything, and the frequency leak is real and
unmitigated" is not a shorter explainer. It is a claim this project has spent
its whole life refusing to make.
