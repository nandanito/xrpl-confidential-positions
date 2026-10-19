TITLE: XLS-0065/0066 and XLS-0096 are silently non-composable, and "Confidential Vault" in XLS-0096 means something else entirely
REPO: XRPLF/XRPL-Standards

---

A confidential-capable MPT is accepted as a vault asset with `tesSUCCESS`. Deposits succeed. The confidential portion of a holder's balance is simply invisible to vault and lending accounting, and when that matters the holder is refused with an error naming the wrong cause. Nothing in XLS-0065, XLS-0066 or XLS-0096 says the two features do not compose.

I found this by running it, not by reading it, so the specifics below are from Devnet rather than from inference.

`LendingProtocol`, `SingleAssetVault` and `ConfidentialTransfer` were all **enabled** on Devnet when I re-checked via the `feature` RPC on 2026-08-26T01:49:48Z.

### What happens

A holder carrying **750 public + 150 confidential** units of one issuance deposited 700 public into a vault over that same issuance. `tesSUCCESS`; `AssetsTotal` `"700"` in cleartext; public balance 750 → 50; **confidential balance untouched at 150, version unchanged**. The vault pseudo-account's `MPToken` has no `HolderEncryptionKey` and no `ConfidentialBalanceSpending`.

A follow-up deposit of 100 — which the holder demonstrably owns, in confidential form — returned **`tecINSUFFICIENT_FUNDS`**, *"Not enough funds available to complete requested transaction."*

**This is not one handler's quirk.** A borrower holding 5 public and 600 confidential units was refused a 120-unit `LoanPay` with the identical code and message. Two independent transactors, same behaviour. In total I executed all fifteen vault and lending transactor paths against an issuance carrying a live confidential balance — a full loan originated, serviced, repaid and deleted, and the broker and vault torn down. Every one returned `tesSUCCESS`, and neither lending participant ever acquired a confidential field.

**One correction to my own first reading, because it matters:** the confidential balance is **not** stranded. After the vault deposit the holder sent 50 confidential units to a second holder — `tesSUCCESS`, sender 150 → 100, destination inbox 100 → 150, public balance untouched. The accurate statement is narrower: the confidential balance is invisible to vault and lending accounting and cannot enter a vault. It remains fully usable through confidential transactions.

### The asymmetry

The reverse direction **is** diagnosed. `ConfidentialMPTConvert.cpp:83-87` returns `tecNO_PERMISSION` when an issuance is not confidential-capable. So one direction refuses clearly and the other accepts silently.

`VaultCreate.cpp` and `VaultDeposit.cpp` contain no reference to confidentiality at all — `grep -n "Confidential"` over both returns nothing at rippled 3.3.0. That is consistent and may well be deliberate; the point is only that nothing tells the integrator.

### Nothing documents it — and here is the search

- `grep -ci confidential` against `XLS-0065-single-asset-vault/README.md` at `master`: **0** matches in 1141 lines.
- Same against `XLS-0066-lending-protocol/README.md`: **0** matches in 2670 lines.
- xrpl.org: `multi-purpose-tokens.md`, `vaultcreate.md`, `vaultdeposit.md` — **0** matches each.
- The Trail of Bits April 2026 review: **0** matches for vault, lending or composability.

### The part that makes it harder to notice

**XLS-0096 uses the word "Vault" for something that is not an XLS-0065 `Vault`.** Its *"Confidential Vault"* — §3 line 50, §5 line 82, §13.5 line 861 — is the issuer's optional **dedicated holder account**, a normal non-issuer holder of the issuer's own token. It has no relationship to a `Vault` ledger entry.

An integrator who reads *"This account is sometimes called the 'Confidential Vault'"* in the confidentiality spec has every reason to assume XLS-0065 vaults accommodate confidential balances. The collision points them at precisely the wrong conclusion, and it is why I spent a session establishing by execution something a sentence could have told me.

### What would help

Either would resolve it, and the first is much cheaper:

1. **A compatibility note in XLS-0065, XLS-0066 and XLS-0096** stating that vault and lending accounting operates on public balances only, and that a confidential balance is neither visible to nor spendable by those transactors. Plus, in XLS-0096, a note that "Confidential Vault" is unrelated to XLS-0065's `Vault` — or a different term.
2. **A distinct rejection at `VaultCreate::preclaim`** if a confidential-capable asset in a public vault is not intended composability at all.

I genuinely do not know which of those you want, and that is the open question rather than the finding. If it *is* intended composability, then only the documentation needs to change — and separately, `tecINSUFFICIENT_FUNDS` is a misleading answer for a holder who owns the units in a form the transactor cannot see.

---

*Disclosure: this report was prepared with AI assistance. The Devnet executions are my own; the source and specification citations were verified against rippled tag 3.3.0 and XRPL-Standards `master` on 2026-08-26, and the Trail of Bits review was checked before filing. XRPLF states no policy on AI-assisted contributions, so I am disclosing it by default.*
