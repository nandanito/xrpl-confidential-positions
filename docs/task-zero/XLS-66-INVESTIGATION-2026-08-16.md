# XLS-66 investigation — does XRPL already model the receivables facility natively?

**Research conducted 2026-08-16.** Settles the open question in `TASK-ZERO-2026-08-13.md` §9, "The alternative that may make this moot".

Persona: Protocol Researcher. Sources in priority order — XLS-0065 and XLS-0066 specification text from `XRPLF/XRPL-Standards`, the rippled 3.3.0 source at tag `3.3.0` (commit `00a178fb92ca49521b937ae1a99d863765ea8a90`, dated 2026-08-06), and **19 transactions submitted to standard Devnet on 2026-08-16** across the two scenarios in §2 — 18 applied to a ledger, one rejected at the signature check. Where a question was cheaply testable it was tested; the transactors were read either way.

*Correction, same day:* an earlier revision of this line said "eleven". The count was written from memory of the scenario scripts rather than from the ledger. Re-counted by `account_tx` over the five scenario accounts: 18 distinct applied transactions (15 `tesSUCCESS`, 1 `tecNO_PERMISSION`, 2 `tecNO_AUTH`), plus the `tefBAD_AUTH` pseudo-account submission, which correctly appears in **no** ledger — that absence is itself the evidence in §4.3. Two further pilot submissions under throwaway accounts are not cited anywhere and are excluded.

## Answer in one paragraph

XLS-66 models a pooled-fund, uncollateralised, fixed-term **amortising loan** in full — origination, interest, amortisation schedule, late payment, early full payment, overpayment, impairment, default and first-loss capital — and models it well. It does not model a revolving drawdown facility at all. **No asset inside the lending protocol can carry a confidential balance**, and this is closed twice over by independent mechanisms: the vault share token cannot be created with `lsfMPTCanHoldConfidentialBalance` and there is no path to add it afterwards, and the vault and broker pseudo-accounts can neither convert into nor receive a confidential balance because they cannot sign transactions. Separately, every value in the protocol — vault totals, broker debt, loan principal, outstanding balance, periodic payment, every `LoanSet` and `LoanPay` amount — is a plaintext ledger field. Nothing rejects a confidential-capable MPT as a vault asset; it is accepted with `tesSUCCESS` and simply does nothing, which is itself the most reportable finding here. **Recommendation: build the facility as application logic on Confidential MPTs. Do not build on XLS-66.** Defended in §6.

## Grading scale

Same scale as TASK ZERO.

| Grade | Meaning |
|---|---|
| **A** | Read from primary source and cross-checked against a second primary source, or executed directly |
| **B** | Read from a single primary source |
| **C** | Inferred from primary sources; the inference is stated |
| **GAP** | Could not be reached. Recorded, not backfilled. |

---

## 1. Amendment reading — dated, per P-3

`tools/check-amendments.ts` re-run **2026-08-16T13:36:50Z**. Agrees with `amendments-2026-08-16.json` (13:33Z) in every position. Standard Devnet, network_id 2, rippled 3.3.0:

```
ConfidentialTransfer ENABLED · PermissionedDomains ENABLED · SingleAssetVault ENABLED
LendingProtocol ENABLED · Credentials ENABLED · DynamicMPT ENABLED · MPTokensV2 not known to this server
```

A second, narrower reading was needed because the pseudo-account authorisation behaviour in §4 is amendment-gated. Direct `feature` RPC against `wss://s.devnet.rippletest.net:51233`, **observed 2026-08-16T13:41:00Z**:

| Amendment | Devnet | ID |
|---|---|---|
| `fixCleanup3_1_3` | **ENABLED** | `303ACB16CF8DBD3B5C34F131A9D19A7DE01AE05F480A8A682B869D1B4AAC8CFC` |
| `fixCleanup3_2_0` | **ENABLED** | `21B8D2F76F68E11E9C077A43BBBC394136E9987E99DDB73966DD68419467E431` |
| `fixCleanup3_3_0` | **ENABLED** | `3298D47E1F3A8A24FECAA30F699B8FE1DD234E072834BA099AD8180FFCE0FEC4` |

**This matters.** `fixCleanup3_3_0` reorders the pseudo-account authorisation exemption relative to the XLS-80 domain check (§4). Every behavioural statement below is a statement about a network with all three fixes live. `MPTokensV2` is unknown to Devnet, so the `featureMPTokensV2` branch of the exemption is inert there and only the `featureSingleAssetVault` branch is active. **Grade A, executed.**

## 2. Method — what was submitted to Devnet

Two independent scenarios, from freshly-funded faucet accounts. All accounts and objects below are permanent Devnet state and can be re-queried with `account_objects` / `account_tx`.

**Scenario A — ungated confidential-capable MPT in a public vault**

| Role | Account / object |
|---|---|
| Issuer | `r3KwWxi8S4uW8wYEw2NYpfF62XtVkyEwcN` |
| Vault owner | `raVHfP7PJmKiarJWap7wHp6iQWajhsejYB` |
| MPT (`CanTransfer` \| `CanHoldConfidentialBalance`, Flags 160) | `004503DF50384FD6125864DA7A6E449F791D25238402EAE4` |
| Vault | `8E8692CD267A0D91C3BEA13239A7EA850292AC7DAC647AE023E44CC2A88C958C` |
| Vault pseudo-account | `rLa7bb8kydTQAfSmv6kevTr14a9rEEveb6` |
| Share MPT | `00000001D1738192577B95C32AB4A6D6441D656094069E3F` |

**Scenario B — domain-gated confidential-capable MPT in a public vault**

| Role | Account / object |
|---|---|
| Issuer / domain owner / credential issuer | `r9WkfmZ3MePvrP18f6a6k6DBgHQPsgCV4f` |
| Vault owner, credentialed | `r3KDa3DYZKNXaLsyR1g64UBFEL1HWKKC8R` |
| Outsider, no credential | `r3Vym5FSrvrp26ZhQgMBm1bFANxbraTuz4` |
| PermissionedDomain | `26E49D713A43A355B5FB414B3770A00627769CD75611FB7EB198BAD25472BE4F` |
| MPT (`RequireAuth` \| `CanTransfer` \| `CanHoldConfidentialBalance`, Flags 164, `DomainID` set) | `0045040A5D610FA87AD8CC9C62C7D04082F80DFD10B64B80` |
| Vault | `79071E57DFB61E5BFB0478A18FCB46E69A493A3451EC2794076913D3479820A9` |
| Vault pseudo-account | `rBHJWCVjNTBeoZxihQZmH7xeJYZ6bcogmr` |

The harness lives in the session scratchpad, not the repository — it signs with `ripple-binary-codec@2.9.0` (E-30) plus `ripple-keypairs`, because `xrpl.js@5.0.0` still bundles a codec without these types. Nothing in it is worth committing yet; Session 3's spike needs a real one.

---

## 3. Q1 — what the Loan / LoanBroker / Vault triple actually models

**Grade A.** Read from `XLS-0066-lending-protocol/README.md` (Draft, updated 2026-01-14, authors Vytautas Vito Tumas and Aanchal Malhotra, `requires: XLS-65, XLS-64`) and from the nine transactors in `src/libxrpl/tx/transactors/lending/` plus the six in `.../vault/`.

### The three objects

**`Vault` (XLS-65)** — a single-asset pool. `sfAsset`, `sfAssetsTotal`, `sfAssetsAvailable`, `sfAssetsMaximum`, `sfLossUnrealized`, `sfShareMPTID`, `sfWithdrawalPolicy`. Custody sits in a pseudo-account (`sfAccount`); ownership is an MPT issued *by* that pseudo-account. `ledger_entries.macro:492`.

**`LoanBroker`** — the intermediary between pool and borrower, with its own pseudo-account holding first-loss capital. `sfDebtTotal`, `sfDebtMaximum`, `sfCoverAvailable`, `sfCoverRateMinimum`, `sfCoverRateLiquidation`, `sfManagementFeeRate`. `ledger_entries.macro:518`. XLS-66 §4.3 gives the reason for the separation: one vault can serve several lending protocols with different terms.

**`Loan`** — one borrower agreement. `sfBorrower`, `sfPrincipalOutstanding`, `sfTotalValueOutstanding`, `sfManagementFeeOutstanding`, `sfPeriodicPayment`, `sfPaymentInterval`, `sfPaymentRemaining`, `sfInterestRate`, `sfLateInterestRate`, `sfCloseInterestRate`, `sfOverpaymentInterestRate`, five separate fee fields, `sfGracePeriod`, `sfStartDate`, `sfNextPaymentDueDate`. `ledger_entries.macro:542`.

### What it does model

| Question asked | Answer | Evidence |
|---|---|---|
| **Drawdowns** | **No — one disbursement, at origination.** `LoanSet::doApply` transfers `principalRequested − originationFee` from the vault pseudo-account to the borrower and the fee to the broker owner, in a single `accountSendMulti`, in the same transaction that creates the `Loan` object | `LoanSet.cpp:582–589`, `:596–633`. XLS-66 §3.8. The strings `revolv` and `drawdown` appear **zero times** in the 2,670-line specification |
| **Repayments** | **Yes, fully.** Borrower-only (`LoanPay.cpp:194–198`), amount split between the vault pseudo-account and the broker payee. Three mutually exclusive modes: `tfLoanLatePayment`, `tfLoanFullPayment` (early payoff), `tfLoanOverpayment` (only if the loan was created with `lsfLoanOverpayment`) | `LoanPay.cpp:56–71`, `:200–204`, `:644–651` |
| **Interest** | **Yes, computed on-ledger.** Standard amortisation; `computeLoanProperties` derives the periodic payment, and the management fee is a percentage *of interest earned*, not of principal (XLS-66 §4.9) | `LoanSet.cpp:427–440`; XLS-66 Appendix A-2 §2, §3 |
| **Default** | **Yes, three states.** `LoanManage` with `tfLoanImpair` (paper loss on the vault, `sfLossUnrealized`), `tfLoanUnimpair` (reverse it), `tfLoanDefault` (realise it). Default applies first-loss capital first — `min(minimumCover × CoverRateLiquidation, totalDefaultAmount)` capped at `CoverAvailable` — moves that from the broker pseudo-account to the vault pseudo-account, and writes the remainder off `Vault.AssetsTotal`. The loan is zeroed and permanently flagged `lsfLoanDefault` | `LoanManage.cpp:147–297`. Broker-owner only (`:120–125`); cannot be defaulted before the due date plus grace (`:106–111`) |

Two further mechanisms worth naming because they are not obvious from the object list:

- **Dual-signature origination.** `LoanSet` carries `sfCounterpartySignature`; both borrower and broker owner sign the same transaction, and the counterparty defaults to `LoanBroker.Owner` if unspecified. `LoanSet::checkSign` at `LoanSet.cpp:147–173`; rationale at XLS-66 §4.5 — a two-step propose/accept flow was rejected to avoid a pending-offer ledger object.
- **Residual debt forgiveness.** When the last loan under a broker is deleted, any remaining `DebtTotal` is forgiven, because nothing is left to pay it back through. `LoanDelete.cpp:112–120`.

**Assessment.** For a term-loan product this is a complete and carefully-built primitive; XLS-66 §5 is honest that it offers no on-chain protection against default and expects off-chain underwriting. For a **receivables financing facility**, where a supplier draws repeatedly against a revolving limit, it is the wrong shape: each draw is a separate `Loan` object with its own schedule, its own reserve, and a permanent directory link to the borrower.

### Numbering observation

Transaction types 72–73 are explicitly reserved for future Vault transactions (`transactions.macro:950`). **79 and 83 are unassigned with no reservation comment**, sitting inside the lending block (78 → 80, 82 → 84). Not load-bearing for anything here; noted because an unexplained gap in a contiguous block usually means something was removed late. Not investigated.

---

## 4. Q2 — can anything inside the lending protocol be a confidential MPT?

**No. Grade A, tested and read.** The answer has three separable parts and each is closed by a different mechanism.

### 4.1 The vault share token — structurally impossible

`VaultCreate::doApply` builds the share issuance's flags itself, from exactly two transaction flags:

```cpp
std::uint32_t mptFlags = 0;
if (!tx.isFlag(tfVaultShareNonTransferable))
    mptFlags |= (lsfMPTCanEscrow | lsfMPTCanTrade | lsfMPTCanTransfer);
if (tx.isFlag(tfVaultPrivate))
    mptFlags |= lsfMPTRequireAuth;
```
— `VaultCreate.cpp:179–183`, passed to `MPTokenIssuanceCreate::create` at `:200–213`.

There is no `VaultCreate` field through which a caller could request `lsfMPTCanHoldConfidentialBalance`, and the value is never ORed in. XLS-65 §3.1.2.1 states the same two flag sets in a table.

There is no later path either. The share issuance's `sfIssuer` is the vault pseudo-account, and only the issuer may submit `MPTokenIssuanceSet` — **rippled says this itself**, in a comment reasoning about why a share-level freeze check is unnecessary: *"vault shares are issued by the vault pseudo-account, which cannot submit MPTokenIssuanceSet to individually lock a holder's MPToken"* (`VaultWithdraw.cpp:169–174`).

**Observed.** The share issuance created in Scenario A carries `Flags: 56` = `lsfMPTCanEscrow | lsfMPTCanTrade | lsfMPTCanTransfer` (0x08|0x10|0x20). No 0x80. A `MPTokenIssuanceSet` with `tfMPTSetCanHoldConfidentialBalance` (0x100) submitted by the vault owner against that issuance returned **`tecNO_PERMISSION`**.

Specification, implementation and live ledger agree. **"Confidential fund shares in a native vault" is closed outright.**

### 4.2 The vault asset — the issuance may be confidential-capable; the balance may not be confidential

Nothing rejects it. `VaultCreate::preclaim` requires only that the asset can be held (`canAddHolding`, which for an MPT checks nothing but `lsfMPTCanTransfer` — `MPTokenHelpers.cpp:107–120`), that its issuer is not itself a pseudo-account (`VaultCreate.cpp:116–120`), and that it is not frozen for the vault owner. `lsfMPTCanHoldConfidentialBalance` is not consulted anywhere.

**Observed.** `VaultCreate` over MPT `004503DF…EAE4` (Flags 160 = `CanTransfer | CanHoldConfidentialBalance`) returned **`tesSUCCESS`**. A subsequent `VaultDeposit` of 600 units returned `tesSUCCESS` and produced:

```
Vault.AssetsTotal      "600"      Vault.AssetsAvailable  "600"
pseudo-account MPToken  MPTAmount "600"
```

Both in cleartext, as ordinary `STAmount`/`STNumber` fields.

That is the whole of the interaction. **The vault operates on the public `sfMPTAmount` balance and nothing else.** Confidential value lives in four separate `MPToken` fields — `sfConfidentialBalanceInbox`, `sfConfidentialBalanceSpending`, `sfIssuerEncryptedBalance`, `sfAuditorEncryptedBalance` — written only by transaction types 85–89. **The string `confidential` appears zero times in `src/libxrpl/tx/transactors/vault/` and zero times in `src/libxrpl/tx/transactors/lending/`.** Fifteen transactors, no awareness of the feature.

So a holder of a confidential-capable MPT can put their *public* balance into a vault, and their confidential balance is simply not reachable from any vault or lending transaction. To move confidential value in, they must `ConfidentialMPTConvertBack` first — which writes the amount in plaintext into the transaction.

### 4.3 The pseudo-accounts can never hold a confidential balance

This is the load-bearing part, and it is closed twice independently.

**They cannot convert.** `ConfidentialMPTConvert` initialises the confidential fields on `keylet::mptoken(issuanceID, ctx.tx[sfAccount])` — the *signer's own* MPToken (`ConfidentialMPTConvert.cpp:102`, `:208`, `:298–313`). There is no delegate, no `Holder` field, no third-party path. And pseudo-accounts cannot sign:

```cpp
if ((view.rules().enabled(featureLendingProtocol) ||
     view.rules().enabled(featureBatchV1_1) || view.rules().enabled(fixCleanup3_3_0)) &&
    isPseudoAccount(sle))
{
    // Pseudo-accounts can't sign transactions. …
    return tefBAD_AUTH;
}
```
— `Transactor.cpp:925–936`. All three gating amendments are enabled on Devnet (§1). `createPseudoAccount` reinforces it at creation: sequence number pinned to 0 *"Pseudo-accounts can't submit transactions, so set the sequence number to 0 to make them easier to spot"*, plus `lsfDisableMaster | lsfDefaultRipple | lsfDepositAuth` (`AccountRootHelpers.cpp:565–603`).

**Observed.** An `AccountSet` with `Account` = `rLa7bb8kydTQAfSmv6kevTr14a9rEEveb6` (the Scenario A vault pseudo-account) returned **`tefBAD_AUTH` — "Transaction's public key is not authorized."** The pseudo-account's on-ledger `Flags` is `26214400` = `0x1900000` = exactly those three flags.

**They cannot receive either.** `ConfidentialMPTSend` requires the *destination's* MPToken to already carry `sfHolderEncryptionKey`, `sfConfidentialBalanceInbox` and `sfIssuerEncryptedBalance`, or it returns `tecNO_PERMISSION` (`ConfidentialMPTSend.cpp:227–233`). Those three fields exist only if that account previously signed its own `Convert`. So no confidential value can be sent *to* a vault or broker pseudo-account, ever.

### 4.4 What `requireAuth`'s vault recursion actually shows

The prompt's premise is correct and its conclusion does not follow. `requireAuth` does recurse into vault pseudo-accounts — when the MPT being authorised is a vault share, it reads the vault, takes the underlying asset, and re-runs the authorisation check against that asset (`MPTokenHelpers.cpp:364–385`). XLS-65/66 and MPT authorisation were unmistakably built aware of each other.

But that awareness is about **authorisation**, not about confidentiality. The only confidential-aware line in the whole of `MPTokenHelpers.cpp` is a deletion guard: `removeEmptyHolding` refuses to delete an `MPToken` that still carries any confidential field, returning `tecHAS_OBLIGATIONS` (`MPTokenHelpers.cpp:300–307`). That is a safety interlock on the MPT lifecycle, not vault/confidential integration. `MPTInvariant.cpp:698–710` is the same shape: an invariant that fires if confidential fields change on an issuance lacking the flag.

The features were built aware of each other's **authorisation model**. Nothing extends that to balances.

### 4.5 Does anything reject the combination?

**No, and that is the finding.** There is no diagnostic anywhere. `VaultCreate` over a confidential-capable MPT succeeds. `VaultDeposit` succeeds. `LoanSet` and `LoanPay` would succeed. An integrator gets `tesSUCCESS` at every step and discovers only much later that the confidentiality they enabled is inert inside the pool. Compare `ConfidentialMPTConvert.cpp:83–87`, which returns `tecNO_PERMISSION` when confidentiality is *not* enabled — the reverse direction is checked; this one is not.

For completeness: `ConfidentialMPTClawback` carries **no** pseudo-account guard, unlike ordinary `Clawback`, which returns `tecPSEUDO_ACCOUNT` when the holder is a pseudo-account (`Clawback.cpp:196–199`). This is not a bug — it is unreachable by construction, since a pseudo-account can never acquire `sfHolderEncryptionKey`, which `ConfidentialMPTClawback.cpp:96–98` requires. Recorded because "unreachable by construction" and "explicitly rejected" are different assurances, and only the second survives a refactor.

---

## 5. Q3 — the pseudo-account exemption and our XLS-80 domain gating

**Grade A, tested and read.**

### The mechanism

```cpp
// Pseudo-accounts (Vault, LoanBroker, AMM) hold assets on behalf of their participants.
// They are implicitly authorized for any MPT they hold, including vault shares whose
// underlying asset would otherwise require auth.
auto const isPseudoAccountExempt = [&] {
    return (featureSAVEnabled || featureMPTV2Enabled) &&
        isPseudoAccount(view, account, {&sfVaultID, &sfLoanBrokerID, &sfAMMID});
};
```
— `MPTokenHelpers.cpp:331–337`.

The **ordering** is amendment-gated and it is the part that matters:

- **Post-`fixCleanup3_3_0`** (enabled on Devnet, §1): the exemption returns `tesSUCCESS` at `MPTokenHelpers.cpp:350–351`, *before* the `sfDomainID` / `credentials::validDomain` block at `:395–413`.
- **Pre-fix**: the exemption sat at `:415–417`, *after* that block.

So on the network we are building against, **a vault, loan-broker or AMM pseudo-account bypasses XLS-80 domain validation entirely** for any MPT it holds.

### What it does to our gating — three consequences

**1. The gate still binds every real account.** This is the good news and it is tested. In Scenario B the uncredentialed outsider opted in with `MPTokenAuthorize` (`tesSUCCESS` — creating the empty `MPToken` is not gated) and was then refused the asset: `Payment` from the issuer returned **`tecNO_AUTH`**. The credentialed owner received the same payment with `tesSUCCESS`. Every human-facing path re-checks: `VaultDeposit` checks `requireAuth(vaultAsset, depositor)` (`VaultDeposit.cpp:153`), `VaultWithdraw` checks the destination (`VaultWithdraw.cpp:163`), `LoanSet` checks borrower and broker owner with `StrongAuth` (`LoanSet.cpp:551`, `:579`), `LoanPay` checks the borrower (`LoanPay.cpp:254`).

**2. The gate does not bind the pool.** Also tested, and visible on Devnet right now:

```
account_objects rBHJWCVjNTBeoZxihQZmH7xeJYZ6bcogmr, type=credential  → []
account_objects rBHJWCVjNTBeoZxihQZmH7xeJYZ6bcogmr, type=mptoken
    → MPTokenIssuanceID 0045040A…4B80, MPTAmount "600", Flags 0
```

The vault pseudo-account holds 600 units of a domain-gated, `RequireAuth` MPT while holding **zero credentials** and without `lsfMPTAuthorized` set on its own `MPToken`. The exemption is not theoretical; it is a field you can read.

Whether this is a hole depends on what the domain is for. If the domain answers *"who may hold this asset"*, it has been bypassed by a ledger-controlled account with no key, which is defensible. If it answers *"every unit of this asset is at all times attributable to a credentialed party"*, it has been broken: the units in the pool are attributable to a pseudo-account and to share balances that are gated by a **different policy** — the share issuance's own `sfDomainID`, which `VaultCreate` sets only for private vaults (`VaultCreate.cpp:211`, and `preflight:73–76` rejects `DomainID` without `tfVaultPrivate`). For a *public* vault over a gated asset — exactly what Scenario B built, with `tesSUCCESS` — the shares carry no gate at all and are freely transferable.

**3. Revocation traps a position rather than recovering it.** The sharpest result of the session. After deleting the owner's credential, `VaultWithdraw` returned **`tecNO_AUTH`**. The assets stay in the pseudo-account, which remains implicitly authorised; the human who owns the shares cannot get them out and no one else can either. The domain gate can prevent entry and can freeze a position in place. **It cannot claw a position out of a vault.** Anyone designing a compliance story on XLS-80 plus vaults needs to know that the recovery path is `VaultClawback` by the asset issuer, not domain revocation.

Combined with **E-20** — the issuer can unilaterally clear `sfDomainID` without holder consent — the honest summary of XLS-80 gating over a vault is: *entry-time enforcement, issuer-revocable, and unable to unwind a position it later disapproves of*.

---

## 6. Q4 — what precisely blocks it

The answer to Q2 is no, so the incompatibility is the finding. Stated in order of finality — each item below independently closes the design, so fixing any one of them changes nothing.

**B-1. The share token cannot be confidential.** No transaction field sets the flag, and the pseudo-issuer cannot sign an `MPTokenIssuanceSet` to add it later. Closed by `VaultCreate.cpp:179–183` and by `tecNO_PERMISSION`, observed. **Grade A.**

**B-2. The pseudo-accounts cannot hold a confidential balance.** They cannot sign a `Convert` (`tefBAD_AUTH`, observed) and cannot be the destination of a `Send` (`ConfidentialMPTSend.cpp:227–233`). So "confidential positions custodied in a native vault" is not a thing that can exist. **Grade A.**

**B-3. Every value in the protocol is a plaintext ledger field.** `Vault.AssetsTotal`, `AssetsAvailable`, `LossUnrealized`; `LoanBroker.DebtTotal`, `CoverAvailable`; `Loan.PrincipalOutstanding`, `TotalValueOutstanding`, `PeriodicPayment`, `ManagementFeeOutstanding`, `InterestRate` and the fee schedule; and the `Amount` on every `LoanSet` and `LoanPay`. Even if B-1 and B-2 were both solved tomorrow, **the loan terms and outstanding balance of every supplier would still be public** — which is precisely what the domain exists to hide. **Grade A**; confirmed against XLS-66 §3.2.2 and §4.8, which makes the stored ledger values authoritative by design.

**B-4. There are no revolving drawdowns.** Each draw is a fresh `Loan` object with public principal and schedule, permanently linked to the borrower's owner directory. TASK ZERO §9 identified drawdown *frequency* as the residual leak; under XLS-66 each drawdown mints a durable, publicly-readable object carrying its own terms, so frequency becomes **more** legible, not less. **Grade A.**

**B-5. §9's design rule is unsatisfiable inside XLS-66.** The rule is: value enters confidentiality **once, in aggregate**, and every per-participant event is a `ConfidentialMPTSend`. Inside XLS-66 every per-participant event is a public-amount transaction, and value must leave confidentiality (`ConvertBack`, plaintext `sfMPTAmount`) before it can enter a vault at all. **Grade A.**

---

## 7. Recommendation

**Build the receivables facility as application logic on Confidential MPTs. Do not build on XLS-66.**

### Defence

**The project makes exactly one capability claim and XLS-66 destroys it.** Per-participant amounts are hidden — that is the claim, and P-4 and P-11 already constrain it to amounts only. XLS-66 publishes those amounts in ledger fields that no amendment can encrypt. Building on it leaves two choices: withdraw the claim, or reduce XLS-66 to decoration by keeping the actual value flow outside the vault, at which point we have paid for a dependency we do not use.

**The incompatibility is structural, not a missing feature.** Two independent mechanisms close it (B-1, B-2), and a third makes it moot even if both were removed (B-3). This is not "XLS-66 does not support confidential balances yet". Confidential balances are per-`MPToken` state initialised only by a holder-signed transaction; pseudo-accounts exist precisely because they have no holder and no key. The two designs are load-bearing in opposite directions.

**The thing XLS-66 would have bought is not available for our shape anyway.** The argument for moving was that native modelling means less application logic to write and defend. But XLS-66 models a fixed-term amortising term loan, and a receivables facility is revolving. We would have been fitting the domain to the primitive.

**Stated against the argument, honestly.** Two real things are given up. First, XLS-66's interest, amortisation and default mechanics are specified in detail, implemented once, and reviewed by people who do this for a living, in a way our application layer will not be; whatever we build to represent financing terms will be weaker, and the README must not imply otherwise. (Not *battle-tested* — XLS-66 is `Draft`, is enabled on Devnet only, and has no production history. That claim was in an earlier draft of this paragraph and is unsupportable.) Second, "resting on two amendments instead of one" was a genuine strength of the alternative — a reference application exercising `ConfidentialTransfer` **and** `LendingProtocol` would have been more interesting to RippleX than one exercising the first alone. Both losses are real. They are outweighed because what is lost is *modelling fidelity*, which the README can scope honestly, and what is preserved is *the only confidentiality property the project claims*, which the README cannot.

**The negative result is worth more than the positive one would have been.** "XRPL's two newest financial primitives are both live on the same network, cannot be composed, and nothing anywhere tells you so — the combination is accepted with `tesSUCCESS` at every step" is a finding with a named audience, a reproducible test, and no existing coverage. It is a stronger contribution than another vault demo. Filed as an observation in `UPSTREAM-FEEDBACK.md`, not published, per the standing rules.

### What does not change

TASK ZERO §9's facility design stands as written, including R-5's single-conversion structure and the balance-tracking requirement that replaced the float cap. The domain does not move. §9's constraints — `TransferFee` must be 0, clawback burns the entire balance — are unaffected.

---

## 8. Q5 — the two carry-forward items

The prompt scopes this section to a recommendation *for* XLS-66. The recommendation is against, so nothing is inherited. But one of the two questions is now settled by this investigation and leaving it open would be wrong.

### 8.1 The cover-traffic argument — unchanged, and still unreviewed

**No change. Do not read this document as review.** The domain does not move, so §9's leak analysis applies unmodified: sender, receiver and timing remain public (P-11), drawdown frequency remains the residual leak, and scheduled zero-value `ConfidentialMPTSend` cover traffic remains the sole reason §9 concludes the domain survives.

That argument is still `Proposed`, still reviewed by nobody, and still rests on **E-22 (Grade C — inferred, not tested)**. `B-10` stays `PENDING` and Session 3's four-check falsification remains the gate. If E-22 falls, B-10 becomes `BLOCKED` and §9's conclusion falls with it. This investigation did not touch that argument and provides no support for it.

One incidental observation that is *not* review: had the domain moved to XLS-66, cover traffic would have become impossible rather than merely unreviewed. A zero-value `LoanSet` is rejected at `LoanSet.cpp:104–105` (`PrincipalRequested <= 0 → temINVALID`) and a zero-value `LoanPay` at `LoanPay.cpp:54–55` (`Amount <= 0 → temBAD_AMOUNT`). The protocol has no null-event primitive to hide behind. That is a fourth structural reason the move was wrong, and it is worth recording where the cover-traffic argument is stored.

### 8.2 Who tracks the confidential balance in a pseudo-account — the question dissolves

**The question has an answer and it is not the one it was posed as. Grade A.**

A vault pseudo-account **cannot hold a confidential balance at all** (§4.3, B-2). It cannot sign the `ConfidentialMPTConvert` that would initialise the fields (`tefBAD_AUTH`, observed), and it cannot be the destination of a `ConfidentialMPTSend` because the required destination fields can only be created by a self-signed `Convert`. So there is nothing to track, nobody to track it, and no version of the question in which a pseudo-account performs the tracking.

The balance-tracking requirement that replaced R-5's float cap therefore lands exactly where it already was, unchanged: on the **ordinary account** holding the facility float — the Dedicated Account in §9 step 1, whose operator tracks its own expected balance off-ledger and pays a resynchronisation cost linear in the width of the uncertainty window, with no early exit and no sublinear fallback shipped (F-7, F-8; true at mpt-crypto `1.0.4`, and upstream added one in `1.0.5`, E-297). The measured per-iteration figure and the hardware, compiler, flags and spread it was taken on are in `benchmarks-2026-08-16.md` §4 and are not restated here (P-8). No new party, no new mechanism, no change to the cost budget.

The prompt was right that the question was open and right that it was not obviously favourable. It resolves favourably, but for an unfavourable reason: the design it would have applied to cannot be built.

---

## 9. Proposed register rows

Not applied — a coding session does not edit `CLAIMS.md` on its own initiative for findings this load-bearing. Proposed for the next session to fold in.

**Established:**

| # | Claim | Evidence | Grade |
|---|---|---|---|
| E-37 | `fixCleanup3_1_3`, `fixCleanup3_2_0` and `fixCleanup3_3_0` are all **enabled on standard Devnet** as at 2026-08-16T13:41Z. `fixCleanup3_3_0` moves the pseudo-account authorisation exemption ahead of the XLS-80 domain check | Direct `feature` RPC, §1 above; `MPTokenHelpers.cpp:350–351` vs `:415` | A |
| E-38 | A vault share MPT **can never carry** `lsfMPTCanHoldConfidentialBalance`. `VaultCreate` builds the flags itself from two tx flags and there is no later path — the issuer is a pseudo-account, which cannot sign `MPTokenIssuanceSet` | `VaultCreate.cpp:179–183`, `:200–213`; `VaultWithdraw.cpp:169–174`; XLS-65 §3.1.2.1. Executed on Devnet: share `Flags: 56`; owner's `MPTokenIssuanceSet` with `tfMPTSetCanHoldConfidentialBalance` → `tecNO_PERMISSION` | A |
| E-39 | A **pseudo-account can never hold a confidential balance.** It cannot sign the `Convert` that initialises the fields, and cannot be the destination of a `Send` because the destination must already hold `sfHolderEncryptionKey` | `Transactor.cpp:925–936`; `AccountRootHelpers.cpp:565–603`; `ConfidentialMPTConvert.cpp:102`, `:208`; `ConfidentialMPTSend.cpp:227–233`. Executed: `AccountSet` from a vault pseudo-account → `tefBAD_AUTH` | A |
| E-40 | Nothing rejects a confidential-capable MPT as a **vault asset**; the vault operates on the public `sfMPTAmount` only. Zero occurrences of `confidential` across all fifteen vault and lending transactors | grep over `src/libxrpl/tx/transactors/{vault,lending}/`; `MPTokenHelpers.cpp:107–120`. Executed: `VaultCreate` + `VaultDeposit` over a Flags-160 MPT → `tesSUCCESS`, `AssetsTotal "600"` in cleartext | A |
| E-41 | Vault and loan-broker pseudo-accounts are **exempt from XLS-80 domain validation** for MPTs they hold. Observed holding 600 units of a domain-gated `RequireAuth` MPT with zero credentials and without `lsfMPTAuthorized` | `MPTokenHelpers.cpp:331–337`, `:350`. Executed, Scenario B; pseudo `rBHJWCVjNTBeoZxihQZmH7xeJYZ6bcogmr` | A |
| E-42 | Revoking a domain credential **traps** a vault position rather than recovering it: `VaultWithdraw` → `tecNO_AUTH` while the pseudo-account keeps custody. Domain revocation is not a recovery path; `VaultClawback` by the asset issuer is | Executed, Scenario B; `VaultWithdraw.cpp:163` | A |
| E-43 | XLS-66 models a fixed-term amortising loan with one disbursement at origination. **No revolving drawdowns.** `revolv` and `drawdown` appear zero times in the 2,670-line specification | XLS-0066 (updated 2026-01-14); `LoanSet.cpp:582–589` | A |
| E-44 | Neither XLS-0065 nor XLS-0066 mentions confidential balances, encryption or XLS-96 — zero occurrences of `confidential`, `encrypt`, `XLS-96`, `XLS-0096` in either specification | Both READMEs downloaded and grepped directly, 2026-08-16 | A |

**Findings, for upstream:**

| # | Finding | Evidence | Grade |
|---|---|---|---|
| F-10 | **`LendingProtocol` and `ConfidentialTransfer` are silently non-composable.** A confidential-capable MPT is accepted as a vault asset with `tesSUCCESS`, deposits succeed, and the confidential balance is simply unreachable from every vault and lending transaction. No error, no warning, nothing in either specification. The reverse direction *is* checked — `ConfidentialMPTConvert.cpp:83–87` returns `tecNO_PERMISSION` when confidentiality is not enabled | §4 above, executed on Devnet 2026-08-16 | A |
| F-11 | `ConfidentialMPTClawback` has **no** pseudo-account guard, where ordinary `Clawback` returns `tecPSEUDO_ACCOUNT`. Currently unreachable by construction rather than rejected | `Clawback.cpp:196–199` vs `ConfidentialMPTClawback.cpp:55–98` | A |

---

## 10. Named gaps

**GAP-8 — ~~a full loan lifecycle over a confidential-capable MPT was not run.~~ CLOSED 2026-08-17.**
**All fifteen transactor paths executed, every one `tesSUCCESS`**, over an issuance with `Flags: 224` carrying a live confidential balance. Vault: `VaultCreate`, `VaultSet`, `VaultDelete`, `VaultDeposit`, `VaultWithdraw`, `VaultClawback`. Lending: `LoanBrokerSet` (create and modify), `LoanBrokerDelete`, `LoanBrokerCoverDeposit`, `LoanBrokerCoverWithdraw`, `LoanBrokerCoverClawback`, `LoanSet`, `LoanDelete`, `LoanManage`, `LoanPay`. A loan of 1000 was originated at 500 bps over four periods, serviced, repaid in full and deleted; the broker and vault were then torn down. **Neither the lender nor the borrower ever acquired a single confidential field, and an unrelated holder's confidential balance on the same issuance was untouched — `ConfidentialOutstandingAmount` unchanged at 571 throughout.** E-40 and F-10 return to Grade A on coverage. Harness in `tools/spike-2026-08-17/gap8-*.ts`. Original text follows.

~~**GAP-8** Scenario A exercised `VaultCreate` and `VaultDeposit`. `VaultWithdraw`, `VaultClawback`, `LoanBrokerSet`, `LoanSet`, `LoanPay` and `LoanManage` over such an asset were read, not executed. The reading says they behave identically to any other MPT because none of them consults the flag; that is a reading. Closing it costs about a dozen more Devnet transactions.~~

**GAP-9 — ~~no `MPToken` carrying an actual confidential balance was ever deposited.~~ CLOSED 2026-08-17.** Executed: a holder carrying 750 public and 150 confidential units deposited 700 public into a vault over the same issuance. Public deposited normally (`AssetsTotal "700"` cleartext), confidential untouched at 150, version unchanged, pseudo-account `MPToken` carrying neither `HolderEncryptionKey` nor `ConfidentialBalanceSpending`. **The prediction below held on its first clause, was WRONG on its second, and deviated on the third.** *Not* stranded: a post-deposit `ConfidentialMPTSend` of 50 units succeeded (sender 150 → 100), so the confidential balance is invisible to vault accounting but fully spendable — CLAIMS.md E-50. The deviation on the third: a follow-up deposit of units the holder owns in confidential form returns `tecINSUFFICIENT_FUNDS`, an error naming the wrong cause — CLAIMS.md E-50, F-14. `VaultCreate` share `Flags: 56`, re-confirming E-38 on a second issuance. See `DEVNET-CONVERT-2026-08-17.md` §7. **This does not close GAP-8, and E-40/F-10 stay Grade B.** Original text follows.

~~**GAP-9** Doing so requires a real `ConfidentialMPTConvert`, which requires proof generation — the mpt-crypto binding work in TASK ZERO §11 #1, materially de-risked on 2026-08-16 but not yet done: a WASM build exists in mpt-crypto's CI and exports all four proof generators (E-31), while `@xrplf/mpt-crypto` is still unpublished on npm (E-32). The prediction is that the public portion deposits normally while the confidential portion is stranded, with no error. **Untested.** This is the single experiment that would move §4.2 from A-by-reading to A-by-execution on the point that matters most.~~

**GAP-10 — share transferability under a gated asset was not tested.** §5 consequence 2 reasons that a public vault over a domain-gated asset yields ungated shares — economic exposure transferable to parties the asset's domain excludes, who then cannot redeem. Reasoned from `VaultCreate.cpp:73–76` and `VaultWithdraw.cpp:163`, not executed. Two transactions would settle it.

---

## 11. The three claims I am least confident about

**1. That *nothing anywhere* in the tree rejects a confidential-capable MPT inside the lending protocol.** I grepped fifteen transactors for `confidential` and got zero hits, and I executed two of the fifteen paths. A rejection could still live in a shared helper reached only from a path I did not run — `VaultClawback` and `LoanBrokerCoverClawback` are the two I would suspect, since both involve issuers and both have unusual authorisation logic. **Settles it:** GAP-8, a full lifecycle over a Flags-160 asset.

**2. That the pseudo-account domain exemption is a real weakening of our gating rather than a correct design choice I have mis-framed.** The mechanism is certain and tested; the *characterisation* in §5 is mine. A RippleX engineer might reasonably say the pool is not a party and never needed a credential, and that everything that matters is enforced at the edges — which my own Scenario B partly supports. I have tried to state both readings rather than pick one. **Settles it:** the XLS-80 specification's own statement of what a domain is meant to guarantee, which I did not read. That is a gap I created by scoping to XLS-65/66.

**3. That "there is no later path to add the confidential flag to a share issuance" holds beyond 3.3.0.** True at this tag, and structurally true as long as pseudo-accounts cannot sign — but that is one `VaultSet` field away from being false, and `VaultSet` already exists as the mutation surface. The claim is dated, not permanent. **Settles it:** re-reading `VaultCreate.cpp` and `VaultSet.cpp` at the next rippled tag, which the project should do before publishing anything that rests on E-38.

---

## 12. What would reverse this decision

**Every finding above is a reading of rippled 3.3.0 and of standard Devnet as at 2026-08-16.** XLS-65, XLS-66 and XLS-96 are all `Draft`, all under active development, and two of the three were updated in 2026. The same discipline P-3 applies to amendment status applies to this decision: **it is a reading, not knowledge, and it has an expiry.** This section exists so a later session can re-decide cheaply instead of re-investigating.

The recommendation rests on five blockers (§6). They are not equally fragile. B-1 and B-2 are one upstream field away from falling; B-3 is not.

| # | Hypothetical upstream capability | What to watch | If it lands |
|---|---|---|---|
| W-1 | **A `VaultCreate` or `VaultSet` field that sets `lsfMPTCanHoldConfidentialBalance` on the share issuance** — the cheapest possible fix, and the one a RippleX engineer would reach for first | `VaultCreate.cpp:179–183` flag construction; the `VaultCreate` and `VaultSet` field lists in `transactions.macro:853` and `:871` | **B-1 falls. B-2 and B-3 stand.** Confidential *share* balances become possible; the pseudo-account still cannot hold one, and loan terms are still public. Does not reverse the decision on its own |
| W-2 | **Any path by which a pseudo-account acquires confidential state** — a `Holder` field on `ConfidentialMPTConvert`, a vault-initiated convert inside `VaultDeposit`, delegation via XLS-75, or relaxation of the `checkSign` pseudo guard | `Transactor.cpp:925–936`; the `ConfidentialMPTConvert` field list at `transactions.macro:1087`; `ConfidentialMPTSend.cpp:227–233` | **B-2 falls.** This is the one that reopens §8.2's balance-tracking question in its original, unfavourable form — *who tracks a pseudo-account's expected balance off-ledger so it can be decrypted?* That question is currently dissolved, not answered, and W-2 restores it |
| W-3 | **Encrypted accounting fields on `Vault`, `LoanBroker` or `Loan`** — e.g. a confidential `PrincipalOutstanding` | `ledger_entries.macro:492`, `:518`, `:542`; any new `sfConfidential*` in `sfields.macro` | **B-3 falls and the decision reverses.** But see below — this is the least likely of the five, for a cryptographic reason rather than a roadmap one |
| W-4 | **A revolving-credit primitive** — an XLS-66 successor, or transaction types 79 / 83 filling in (both unassigned inside the lending block, §3) | `transactions.macro` numbering; new directories and discussions in `XRPLF/XRPL-Standards` | **B-4 falls.** Changes Q1's answer, not Q2's. Would make XLS-66 the right *shape* for the facility while it remained the wrong *privacy* model |
| W-5 | **`MPTokensV2` activation.** Unknown to Devnet as at 2026-08-16 | Already watched by `tools/check-amendments.ts` | Enables the second branch of `isPseudoAccountExempt` (`featureMPTV2Enabled`, `MPTokenHelpers.cpp:335`), extending §5's exemption analysis to AMM pseudo-accounts, and supersedes E-15. Does not touch the decision |
| W-6 | **A further `fixCleanup` reordering the pseudo-account exemption** relative to the domain check. It has already moved once, in `fixCleanup3_3_0` | `MPTokenHelpers.cpp:350–351` vs `:415` at each tag | Changes §5's conclusions about XLS-80 gating, which the compliance third of the project depends on. **Re-read this specific ordering at every new tag** — it is the most volatile thing in this document |
| W-7 | `ConfidentialTransfer` activating on Testnet or Mainnet | `tools/check-amendments.ts` | Does not touch the decision. Changes the README, per TASK ZERO §10 |
| W-8 | ~~`@xrplf/mpt-crypto` published, or bundled into `xrpl.js`~~ **FIRED 2026-08-16T15:26:21Z, observed 2026-08-17** | npm registry; `XRPLF/mpt-crypto` PR #138. `@xrplf/mpt-crypto@0.1.0` published and verified working against an accepted on-chain transaction — CLAIMS.md E-53 | **As predicted, it does not touch the decision** — and it did remove the largest scoping risk in the project (E-31, E-32) and did unblock GAP-9, which closed the next day. `xrpl.js` bundling is still outstanding; the package stands alone with zero runtime dependencies |
| W-9 | **Atomic `Batch` (`featureBatchV1_1`, enabled on Devnet).** Raised by REVIEW-003a, which proposed it could bundle `VaultWithdraw` + `Convert` and remove the hybrid's plaintext exposure | `transactions.macro:941`; `Transactor.cpp:925–936` for the pseudo-account interaction | **Does not do what was proposed, and is on the list anyway.** Batching removes the *window* between withdrawal and conversion, not the *disclosure* — `ConfidentialMPTConvert` carries `sfMPTAmount` in plaintext whichever transaction it sits in — and `Batch` does not let a pseudo-account sign, so it does not touch B-2. It belongs here because it was not considered at all in rev 1, and because inner-transaction signing rules are exactly the kind of thing a later `fixCleanup` moves |

### How hard W-3 is — CORRECTED 2026-08-17, the original argument was wrong

> **The first version of this section claimed encrypted loan accounting was a cryptographic *mismatch* rather than a missing feature — "structural, not a roadmap gap". That is withdrawn. See CLAIMS.md R-6.** Both REVIEW-003 legs found the error independently and they are right.
>
> **The mistake:** I argued amortisation is not additive because it multiplies a balance by a rate. But scalar multiplication by a **public** scalar is native to an additively homomorphic scheme. For an ElGamal ciphertext `(C₁, C₂) = (rG, mG + rP)`, scaling both components by public `k` gives `(krG, kmG + krP)`, which decrypts to `k·m`. An interest rate is a public loan parameter, not a secret. Verified algebraically before accepting the correction.

What is actually true, stated at the strength the evidence supports:

XLS-96's ciphertexts are additively homomorphic, which is what the transactors exploit — `homomorphicAdd` combines an incoming amount with an existing balance (`ConfidentialMPTConvert.cpp:244`, `:259`). Scalar multiplication by a public rate is available. **What is genuinely non-linear is the rounding**: XLS-66 §4.8 rounds `TotalValueOutstanding` up and `PrincipalOutstanding`/`ManagementFeeOutstanding` to nearest-even, deliberately and asymmetrically, and fixed-point rate arithmetic brings truncation with it. Rounding a ciphertext is not something this scheme does.

The remedy is not FHE. It is a proof accompanying every `LoanPay` that the borrower computed the amortisation correctly on hidden values — **which is the pattern XLS-96 already uses for its own relations**. So W-3 needs a new proof relation, a specification, and validator-side changes: a large roadmap item with a real cost, and not a barrier.

**What this changes downstream.** W-1 or W-2 landing still would not make XLS-66 ready for confidential positions, because W-3 would remain — but "would remain" is now a statement about upstream priorities and effort, not about mathematics. **Weigh it as cost and timeline.** ADR-0002's decision survives on blockers 1, 2, 4, 5 and on blocker 3 being true *today*; what it can no longer claim is that blocker 3 is permanent.

Still unverified, and now the only part of the original claim left standing: **whether any multiplicative or comparison operation is exported by `secp256k1_mpt.h`** beyond what E-31 records, and **whether XLS-96's authors have said anything about arithmetic beyond addition.** Both checks remain undone. CLAIMS.md B-11 carries them.

### Re-check procedure

Cheap, and it is the whole point of listing the above. On each new rippled tag, and before publishing anything resting on §4 or §5:

1. `tools/check-amendments.ts` — dated, per P-3. Watch W-5, W-6, W-7.
2. `git diff 3.3.0..<new tag> -- include/xrpl/protocol/detail/{transactions,ledger_entries,sfields}.macro` — catches W-1, W-3, W-4 in one command.
3. `git diff 3.3.0..<new tag> -- src/libxrpl/ledger/helpers/MPTokenHelpers.cpp src/libxrpl/tx/Transactor.cpp src/libxrpl/tx/transactors/vault/VaultCreate.cpp` — catches W-2 and W-6.
4. `grep -rl confidential src/libxrpl/tx/transactors/{vault,lending}/` — currently returns nothing. **The day it returns a file, this document is out of date**, and that single command is the fastest possible detector for the whole class.

Step 4 is the one to automate if any of this gets automated.

---

## 13. Status of this decision in the project record

Recorded honestly, because it is not yet fully recorded.

*Rewritten 2026-08-17. The previous version said the ADR was "deliberately not written" — true when written, false within the hour, and left stale in the same commit that created the ADR. REVIEW-003a caught it. It is the smallest finding of the rotation and the most embarrassing, because it is a document contradicting its own commit.*

- **The investigation** is in this document. Complete as to its question; §12's W-3 was materially corrected on 2026-08-17.
- **The decision** is `ADR-0002`, `Proposed`, revision 2. It has now had one adversarial rotation, which changed two of its arguments and left the decision standing. **It needs a second round**, because nobody has read the replacements.
- **The register rows** are applied — E-37 to E-44, F-10, F-11, B-11, and R-6 recording the withdrawn inference. E-40 and F-10 were regraded A → B by that rotation.
- **TASK ZERO §9** carries a forward pointer, and its "vault converts once" wording has been annotated against the terminology hazard ADR-0002 names.
- **Still open and not this document's to close:** whether investor-side confidentiality is in scope. ADR-0002 rev 2 shows the hybrid design turns entirely on it.

The decision is one session's recommendation, once reviewed, with its evidence attached and two of its arguments repaired. It should not be cited as settled.
