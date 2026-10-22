# Visible text of the seven pages of the review build (commit a87ae55), as a browser renders them

Extracted from the built HTML by stripping tags. Diagram boxes appear as short lines; `[caption]` is a diagram's caption, `[nav]` the navigation, and ` | ` separates table cells. The screenshots in `screens/` show the layout.


---

# PAGE: Overview, /

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## What this site shows
XLS-96, Confidential Transfers, lets a holder of a Multi-Purpose Token (MPT) keep their balance encrypted on the public XRP Ledger: hidden from the public, not from the token’s issuer. This site shows what that hides and what it does not, from one snapshot of the Devnet test network.

A public balance
an ordinary MPT holding
→ ↓ Convert: amount public

Confidential balances

- each holder’s balance, unless it is a recognisable zero: a new balance, an inbox just merged, or a position clawed back
- the amount of each Send between holders
→ ↓ ConvertBack: amount public

A public balance
an ordinary MPT holding

Public everywhere
Who sends to whom, when and how often; the total held in confidential form.

The issuer reads every confidential balance
So does an auditor, if the token names one. No setting turns this off.
public hidden from the public the issuer can read it
[caption] Amounts are public where they cross into or out of confidential form, and hidden inside it. Who transacts with whom is public everywhere, and the issuer reads every balance.
New to this? Read how it works

## Where to go
- How it works: confidential transfers in plain words, and the example this project built.
- What anyone sees: what a ledger observer reads of four test accounts, including which balances are visibly zero.
- What the issuer sees: the encrypted copy of each balance that the issuer can always read. This site does not publish the figures.
- Who can do what: what each kind of key can and cannot do.
- Wallets: why the browser wallets examined cannot hold a confidential position.
- Custody: where confidentiality and custody approval policies conflict.

## About this site
Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.

Devnet, a public node
read once, when the site is built
→ ↓ one snapshot

The build
pages built offline, checked by the release gate
→ ↓ static files

Vercel
serves the files; runs none of this project's code
→ ↓ your page load

Your browser
requests only this site's own files

Not part of this site: wconf-signer, on the holder's own machine
Holds the keys, builds the proofs and signs. A web page cannot reach it.
[caption] This site is files built once from a Devnet snapshot. Nothing on it can sign; signing happens only in a separate program on a holder's own machine.
To transact, run it yourself. Signing happens only in wconf-signer , a separate program on the holder’s own machine, never in a web page. The README’s “Run it” explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.

## What it never claims
- No key source hides identities. The sender and receiver of every confidential transaction are public. (P-4)
- A holder is never private from the issuer. The issuer can always decrypt. (P-9)
- No key source supports rotation or recovery. XLS-96 supports neither. (P-10)
- No key source hides who transacts, when, or how often. Only amounts are hidden. (P-11)
- A newly created confidential balance is publicly identifiable as exactly zero. (F-1)
- Retiring a position in tranches publishes each tranche size. (F-24)
- None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation. (P-5)
Each code in brackets names a row in the project’s claims register, CLAIMS.md.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: How it works, /how-it-works

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## Confidential balances, in brief

The XRP Ledger is public: anyone can read every account and every transaction on it. Multi-Purpose Tokens (MPTs, XLS-33) are one of its kinds of token. Confidential Transfers (XLS-96) let an MPT holder keep their balance encrypted on that public ledger: hidden from the public, not from the token’s issuer.
Each confidential balance is stored as an ElGamal ciphertext: a number only the right key can read. A holder registers their own encryption key when they opt in.
The ledger must still check that nobody spends more than they hold. So every transaction that spends from a confidential balance carries zero-knowledge proofs, which every validator checks without learning any hidden amount.
XLS-96 is a final standard. When this page was written, on 2026-10-21, its amendment, ConfidentialTransfer, was enabled on Devnet and not on Mainnet or Testnet.
Sources: E-1, E-349; the README’s terms; TASK ZERO §3

## The life of a confidential position

Holder A

Public balance
↓ Convert: amount public

InboxConfidentialBalanceInbox
↓ MergeInbox

Spending balanceConfidentialBalanceSpending

→ ↓ Send: amount hidden; A and B public

The Send carries
the amount encrypted for the sender, the receiver, the issuer and any auditor, and proofs every validator checks

Holder B

InboxConfidentialBalanceInbox
↓ MergeInbox

Spending balanceConfidentialBalanceSpending
↓ ConvertBack: amount public

Public balance
public hidden from the public
[caption] Holder A converts, merges and sends to holder B, who merges and converts back. Only the Send hides its amount.

Convert (ConfidentialMPTConvert ) moves tokens from the holder’s public balance into their confidential inbox, and the amount is published. The first Convert also registers the holder’s key, which can never be changed. Send (ConfidentialMPTSend ) moves an amount from one confidential balance to another; the amount is hidden, the sender and receiver are not, and it too arrives in the receiver’s inbox. ConvertBack (ConfidentialMPTConvertBack ) moves tokens back to a public balance, and the amount is published, on every ConvertBack separately.
Tokens in the inbox cannot be sent yet. A separate transaction, MergeInbox, moves the inbox into the spending balance, so a holder who converts must merge before their first Send.
Only Send hides an amount. The amount is encrypted separately for the sender, the receiver, the issuer and any auditor. Send’s proofs show that every copy is the same number, that the sender holds the key to their balance, and that neither the amount nor the sender’s remaining balance is negative.
Why are both ends public? The ledger shows that no tokens are created inside the confidential pool by keeping its total in plain view. The token records the total held in confidential form, and every Convert and ConvertBack changes it by a published amount.
Sources: E-9, E-33, F-24, F-27, P-4, P-11; TASK ZERO §3; WHAT-CONFIDENTIAL-MEANS

## What is hidden, and what is public

### Hidden from the public
- Each holder’s balance, except in the zero cases under “Public, always”.
- The amount of each Send.
Both are hidden from the public, not from the issuer.

### Public, always
- Who sends to whom, and when, so how often anyone transacts.
- Every amount converted in or out, each one separately.
- The token’s total supply, and the total held in confidential form.
- That a balance is exactly zero, in three cases: when it is first set up, when a MergeInbox empties the inbox, and after an issuer clawback, which destroys the balance. A balance spent down to zero looks like any other.
The public numbers also bound the hidden ones. If a holder converts in 500, receives nothing and converts back 400, anyone can work out that the other 100 is either still held or has left by confidential sends. No key is needed.
Sources: P-4, P-9, P-11, F-24, F-1, E-211, R-1, R-7

## Who can read a balance, and who can spend it

| who | Who sends to whom, and when | Amounts converted in or out | Total held in confidential form | A holder's balance | A Send's amount
| Anyone | yes | yes | yes | no, unless it is a recognisable zero | no
| A holder | yes | yes | yes | their own, and any recognisable zero | their own only
| The issuer | yes | yes | yes | every one | every one
| An auditor, if the token names one | yes | yes | yes | every one | every one
[caption] Who can read what. A dashed cell is a partial yes. A recognisable zero is a new balance, an inbox just merged, or a position clawed back.
- The holder can read their own balance, with their key.
- The issuer can always read every balance. The protocol keeps a second copy of each balance, encrypted to the issuer’s key, and no setting turns it off.
- An auditor can too, if the issuer names one. Only one auditor is supported.
- This was run, not inferred: the holder, the issuer and the auditor each read the same balance, and again after it changed.
- Spending needs the holder’s key: a Send’s proof cannot be made without it. So the issuer cannot spend a holder’s balance, though it can destroy it and may be able to freeze it (see Limits). Where the key is derived from the account’s master seed, whoever holds the seed holds the key too.
Sources: P-9, E-58, E-11, E-33, E-118, E-119

## The example: a confidential receivables facility

The other pages do not show this facility. They read four Devnet test accounts that hold one demo token, made by this project while it was being built: Holder A, an active position; Holder B, whose key is derived from its master seed; Holder C, the account the project’s ed25519 signing ran on; and Holder D, an early test account. “What anyone sees” and “What the issuer sees” show how those accounts look to an observer and to the issuer. The facility below ran separately, and its record is in the repository: the facility walkthrough.

A bank pays a large buyer’s suppliers early, against their invoices. How much a supplier draws says a lot about its cash position, so these numbers are commercially sensitive.
This project built the core of that facility on XLS-96 and ran it on Devnet on 2026-08-25, in 28 validated facility transactions besides setting up the token:

The bank
issues the token; reads every balance
↓ funds it: amount public

The Dedicated Account
an ordinary XRPL account that holds the float

One Convert: the whole float, amount public
↓ drawdowns and repayments are Sends: amounts hidden; who and when public

Supplier A
limit, draws and what it owes are hidden

Supplier B
limit, draws and what it owes are hidden

Supplier C
limit, draws and what it owes are hidden
Each supplier enrols with a small public payment and its own Convert: both amounts public.
↓ retired in tranches: each ConvertBack's amount public

Back to public balances
public hidden from the public the issuer can read it
[caption] The facility as it ran on Devnet. The bank issues the token and so reads every balance; the amounts that move between the Dedicated Account and the suppliers are hidden, and the amounts at the edges are not.
The run shows that these transactions are well formed and that rippled accepts them. It read the ledger through a public Devnet node, not one on the same machine as the design requires, so it says nothing about that requirement.

### Anyone can see
- The size of the float.
- Which suppliers are enrolled, and both public amounts of each enrolment.
- Who drew and repaid, on which days, and how often.
- The size of every retirement tranche.

### Hidden from the public
- Each supplier’s limit.
- The size of each drawdown and repayment.
- What each supplier still owes.
The bank, as issuer, sees all of it.
In short, it hides the shape of the book, not its size.
Sources: E-146, B-18, E-151, F-24, F-26, R-1; the four accounts: E-208, E-118, E-176, E-101

## How the project runs on a holder's machine
This site only shows. The project itself runs on one machine: a Rust program, wconf-signer , holds the keys and signs, and everything else talks to it over a local socket that no web page can open.

Viewing

The local web page
web/app, in the browser
→ ↓ HTTP

The read-only API
web/api, on loopback only
→ ↓ socket: Status only

wconf-signer
answers Status, which carries no authority

Transacting

The facility driver
facility/, plays the bank and every supplier
→ ↓ socket: Pair, then Prepare

wconf-signer, one per party
holds the ElGamal key and the account key
builds the proofs, shows the transaction in its own window, signs, and returns the signed bytes
→ ↓ the driver submits

Devnet
the facility sets fail_hard on its movements
The API and the signer read the ledger; the signer never submits. A web page cannot open the signer’s socket, so a script injected into one can reach Status at most.
[caption] The project as it runs on one machine. In the demonstration one driver plays every party and holds every seed; that is a property of the demonstration, not of the design.
Sources: the README’s “How it fits together”; E-146, B-15

## Limits
- No key rotation or recovery in XLS-96. A registered key can never be changed. If a holder loses it, and any seed it can be re-derived from, the balance cannot be spent, and the only remedy is an issuer clawback, which destroys the balance. A key this project derives from the master seed can be re-derived from that seed, but the derivation is not a published standard. A draft standard, XLS-99, proposes rotation and recovery; on 2026-10-20 Mainnet, Testnet and Devnet did not know its amendment.
- The issuer can act without the holder’s consent. If the token allows clawback, the issuer can destroy a holder’s whole confidential balance; this project’s tokens allow it. Unless the token’s flags were made unchangeable when it was created, and this project’s were not, the issuer can also turn on locking later and freeze balances. That second power was read in rippled’s source, not run.
- Not audited. This is a research project on a test network. It is not audited, not production-ready (P-5) and not safe to put value behind.
Sources: P-10, E-9, E-119, E-341, E-12, E-21, E-223, E-290, E-292, P-5
Each id under a panel, such as E-58, is a row in the project’s claims register, CLAIMS.md. Where this page and a row disagree, the row wins.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: What anyone sees, /observer

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## Where these values come from

read from https://s.devnet.rippletest.net:51234
validated ledger 6311728 at 2026-10-22T01:15:35.474Z
network_id 2 (Devnet) rippled 3.4.1

This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.

## One position, field by field

Public balanceMPTAmount
an ordinary amount anyone can read

The holder's encryption keyHolderEncryptionKey
public once registered, and never changeable

Spending balance, encrypted to the holderConfidentialBalanceSpending
value hidden, unless it is the recognisable zero

Inbox, encrypted to the holderConfidentialBalanceInbox
value hidden, unless it is the recognisable zero

The issuer's copy, encrypted to the issuerIssuerEncryptedBalance
kept beside every confidential balance; the issuer can read it

The auditor's copy, if the token names an auditorAuditorEncryptedBalance
the auditor can read it

Version counterConfidentialBalanceVersion
counts changes to the balance, publicly

On the token: the total held in confidential formConfidentialOutstandingAmount
public
public hidden from the public the issuer can read it
[caption] One confidential position on the ledger, and what an observer can tell from each field. The panels below read these fields for four test accounts.

## Public
- The account's address, and every account it has transacted with (P-4).
- When each transaction happened, and how often (P-11).
- The public MPT balance.
- The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.
- The holder's encryption key, once registered.
- The ConfidentialBalanceVersion, which counts changes to the balance.
- Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).
- Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).

## Hidden
- The value of a confidential balance that is not the canonical encryption of zero, even when that value is zero (E-211).
- The amount of each ConfidentialMPTSend.
- Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.

## Observer view: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8
One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6311728

## What a full-ledger observer sees

public MPT balance 750
registered true
ConfidentialBalanceVersion 11
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)

spending021D3288E7E5BF982641DF0ADCDB067DCFDBA95E312F0159A85E2A81B5496999B4029652CF4E578E5E03E539CBBBF04D57F5244A56D7FC1FDF4E8672E76418FDF947
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).

inbox03B67732AAE2EDB348088A27B147EE3D01387631CDDD357B12C24659F6EB26A04F02EE0D0A18BEED84DA931C481F57A712C8CC0731F822B5013ADE72739A0C3217C4
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).

## Observer view: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8
Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6311728

## What a full-ledger observer sees

public MPT balance 586
registered true
ConfidentialBalanceVersion 5
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)

spending02C8F5B45590A1CF7F9006F974DAA91FFD7C64FAA85FC2964F18F6495E23577313028556C7AA02F610759762A7449B7AF4A4A4EDFA73F8BF96BF93A09DFB09B87EBC
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).

inbox03C9FC4098EDC4B287A3873E21ABCA828FFE9CF50150DEE079221267F21AD8535D0289A21820DDA63C5FB4BC107A710898DBB7F10E5EEE4B8DBA205D7D8967CD8214
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).

## Observer view: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY
The account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6311728

## What a full-ledger observer sees

public MPT balance 30
registered true
ConfidentialBalanceVersion 0
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)

spending031AE5A70B242D81691C1FC43D684FCD908BC7DCCC07CE3ED7DD1096A9575F5D1C03CE6F696A2AACEBEB02E4728249B72E362D2DD76754F084B819A289628691F31C
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).

inbox022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F980348759FC36C71AE3F6FE16A6904C23312D36DEFAAE95A9A2C9EE7DA7E6F84D9F2
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).

## Observer view: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH
An early test account, kept as a second position to compare against.
read at validated ledger 6311728

## What a full-ledger observer sees

public MPT balance 0
registered true
ConfidentialBalanceVersion 4
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)

spending0382CD36EC99297C61FE6D878C8ED59CFE0C38EEB36A316EB0FE0AC8379FC66A9603A2AA18361F6ACFBE85FDC97EEAC7F6822C5767CB74256564FDA95009C6E11A17
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).

inbox0266912F17A098DC7E54BFEC56277DEA0422888A0212874D411A841E385A1D1D4D0240B6B9DB0AF95113717F95B056815D5B3A1C69FE596518ACB564F0A5E92FECE5
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: What the issuer sees, /issuer

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## A holder is never private from the issuer
The protocol keeps a second copy of every confidential balance, the IssuerEncryptedBalance , encrypted to the issuer’s key. The issuer can always decrypt it, and no setting turns this off (CLAIMS.md P-9).
This page shows that each copy is on the ledger. It does not show the decrypted figures: a visitor could not check them, so this project does not publish them (ADR-0004 D-H3).

Public balanceMPTAmount
an ordinary amount anyone can read

The holder's encryption keyHolderEncryptionKey
public once registered, and never changeable

Spending balance, encrypted to the holderConfidentialBalanceSpending
value hidden, unless it is the recognisable zero

Inbox, encrypted to the holderConfidentialBalanceInbox
value hidden, unless it is the recognisable zero

The issuer's copy, encrypted to the issuerIssuerEncryptedBalance
kept beside every confidential balance; the issuer can read it

The auditor's copy, if the token names an auditorAuditorEncryptedBalance
the auditor can read it

Version counterConfidentialBalanceVersion
counts changes to the balance, publicly

On the token: the total held in confidential formConfidentialOutstandingAmount
public
public hidden from the public the issuer can read it
[caption] One confidential position on the ledger. The issuer's copy sits beside the holder's own, encrypted to the issuer's key; the next panels show that each copy is there, never the figure.

## Where these values come from

read from https://s.devnet.rippletest.net:51234
validated ledger 6311728 at 2026-10-22T01:15:35.474Z
network_id 2 (Devnet) rippled 3.4.1

This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.

## The issuance

MPTokenIssuanceID 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8
issuer rP9wBAcBUXNDSiUNPgLRv2WWjMn1L8xzRa
IssuerEncryptionKey 029DDE4953B75D741FC54DB86B44DF7E486E5B1BDFBCECD5F671B68E7E1CFD6CB9

## Issuer's copy: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8
One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6311728

IssuerEncryptedBalance 0227B2F019BB9F3887355B85C959B2011DBEF7AC80439E42514390BBB236CF43A80237189EBACB6E36B5C7AE7B8F251B8E97D55D37C3AC01B281F93C84C7395A75D3
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.

## Issuer's copy: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8
Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6311728

IssuerEncryptedBalance 034958E9C943B437E117E9021E017799168DF9EE45270FE310212BF8F5BA957C10035E00F894315900DBBE99B2BC859F4FB45ECDA17381C0768E4F5C2D435412302D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.

## Issuer's copy: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY
The account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6311728

IssuerEncryptedBalance 022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F9802EDC9E003481C3DB14F60A83767C9B88C53525104C1A408DA61677EFAE4887CD0
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.

## Issuer's copy: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH
An early test account, kept as a second position to compare against.
read at validated ledger 6311728

IssuerEncryptedBalance 03578671D93AB129EA4196A34214E45B4EA639DB43758C63D2516A457F7735CF5702C2587A7AAD3AFFD05A691C26390E5623C44DAE1E4FCFF5DC3952D5342563C93D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: Who can do what, /capabilities

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## The two keys

The master seed
what an XRPL wallet keeps

→ ↓ XRPL's own derivation gives the account key
→ ↓ this project's derivation, not a published standard, gives the ElGamal key

The account key
signs every transaction, public or confidential

The ElGamal key
reads the holder's balances; builds the proofs

Or a standalone ElGamal key, kept separately
Two secrets to keep instead of one.
[caption] A confidential transaction needs both keys: the proof comes from the ElGamal key and the signature from the account key.

## Capability matrix
What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential balances; the XRPL account key signs. The rows follow the signer’s ownKeySource type, which has two variants, and rows that are not built say so.

| key source | decrypt own balance | prove + sign confidential | public transactions | exists today
| Generated demo seed, faucet-funded
derived-from-master-seed | yes
The ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.
docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs | yes
One seed gives both the ElGamal secret and the XRPL account key.
signer/src/keygen.rs; signer/src/onboarding.rs | yes
An ordinary XRPL account. Public transactions are unaffected.
signer/src/xrpl.rs | built
signer/src/onboarding.rs
| Existing Devnet seed, pasted
derived-from-master-seed | yes
Same as a generated seed: the derivation does not depend on where the seed came from.
signer/src/keygen.rs | conditional
Only if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.
signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2 | yes
An ordinary XRPL account.
signer/src/xrpl.rs | built
signer/src/onboarding.rs
| Standalone ElGamal key
standalone | yes
A separate ElGamal secret kept in the profile: two secrets to keep instead of one.
signer/src/onboarding.rs:279; signer/src/holder.rs:48 | conditional
The ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).
CLAIMS.md E-117; signer/src/holder.rs | yes
Unaffected: the ElGamal key plays no part in public transactions.
signer/src/xrpl.rs | built
signer/src/holder.rs — KeySource::Standalone
| Browser wallet extension | no
Decrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).
REVIEW-012 (derivation from master seed); ADR-0003 D2 | no
A confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).
ADR-0003 D2; signer/src/keygen.rs | yes
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28) | not built
not built, for the reasons in this row
| Custody platform (simulated)
standalone | conditional
Only with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.
REVIEW-012; CLAIMS.md E-117 | conditional
The external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.
docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4 | yes
Public transactions carry plain amounts, so approval policies work as usual.
docs/research/CUSTODY-2026-08-28.md | not built
Simulation: an external-signer stub. No MPC, no HSM, no integration.

## Shown before the seed is asked for
The master seed becomes a permanent decryption credential. Anyone who ever holds it can decrypt every confidential balance this account has held, past and future. XLS-96 has no key rotation and no key recovery (P-10), so this cannot be undone.
The derivation is specified only in this repository and is not a published standard. A holder with their seed but without this repository cannot reconstruct their key. Issue #10 tracks this.
Required by the key-derivation ruling, REVIEW-012 condition 2.

## What no key source changes
- P-4 No key source hides identities. The sender and receiver of every confidential transaction are public.
- P-9 A holder is never private from the issuer. The issuer can always decrypt.
- P-10 No key source supports rotation or recovery. XLS-96 supports neither.
- P-11 No key source hides who transacts, when, or how often. Only amounts are hidden.
- F-1 A newly created confidential balance is publicly identifiable as exactly zero.
- F-24 Retiring a position in tranches publishes each tranche size.
- P-5 None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: Wallets, /wallet

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## The two keys, and which one a wallet holds

The master seed
what an XRPL wallet keeps

→ ↓ XRPL's own derivation gives the account key
→ ↓ this project's derivation, not a published standard, gives the ElGamal key

The account key
signs every transaction, public or confidential
A browser wallet holds this one.

The ElGamal key
reads the holder's balances; builds the proofs
None of the wallets examined on 2026-08-28 keeps it or gives it to a page.

Or a standalone ElGamal key, kept separately
Two secrets to keep instead of one.
[caption] A confidential transaction needs both keys. The wallets examined supply only the account key, so a page cannot assemble one through them.

## A browser wallet cannot hold a confidential position
The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the reasons are structural, not missing features. A wallet that kept the ElGamal key inside the extension and offered a prove-and-sign operation could; none of those examined does.
- A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
- Under the ruled key generation, the ElGamal secret is derived from the master seed. A derived-key account has no other way to get it.
- A wallet extension exists in order not to release seed material. That is the product, not a gap in its API.
So a page cannot assemble the transaction through these wallets. They are not refusing a permission; they hold nothing they are built to give a page.

## What a wallet can do

yes

Ordinary XRPL transactions
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
yes

Prove control of an account
Enough to show that account’s observer view, which anyone with the address can read anyway.

## What this page does not claim
Not determined: whether a given wallet build can serialise XLS-0096 transactions. The page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md E-206). This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.
CLAIMS.md E-206.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: Custody, /custody

Devnet snapshot · signs nothing, holds no keys · this project is not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential Multi-Purpose Tokens (MPTs) on the XRP Ledger hide, and what they do not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## This is a simulation
No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break.

## Two findings

### 1. The derived key does not work with custodial key management
The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published as a standard, and it is not (issue #10).
A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117).

### 2. Approval policies cannot read a confidential amount
An approval workflow that holds only public data sees a proof, not a value, so a rule like “two approvers above $1M” has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder’s statement of the amount, and the policy rests on the holder’s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed.

## Which flows survive, and which break
Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has.
Note 1: Only with a standalone ElGamal key, held outside the custody platform (E-117).

survives: Send a public XRPL payment

breaks: Onboard with the ruled derived key
Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).

survives: Onboard with a standalone ElGamal key (note 1)

survives: Read own confidential balance (note 1)

survives: Send a confidential amount (note 1)

breaks: Send confidentially, under an amount-capped approval policy (note 1)
Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds only public data.

survives: Send confidentially, under a destination-allowlist policy (note 1)

survives: Retire a position in tranches (note 1)
Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).

## The two findings, drawn

1. Where the ElGamal key can come from

The custody platform
holds the seed and signs; never releases the seed
↓ outside the platform

Derived key: breaks
deriving it needs the seed

Standalone key: survives
but something outside the platform then holds a permanent key to its balances

2. What an approval policy can read

An approval workflow
holds only public data
↓ reads the confidential transaction

A proof, not an amount
a rule like 'two approvers above $1M' has nothing to check
hidden from the public
[caption] The simulation's two findings. A platform that ran the derivation inside its own boundary would change the first; that needs the derivation published as a standard (issue #10), and it is not.

Built from commit a87ae55cb980 of the public repository. Ledger values were read at validated ledger 6311728 on 2026-10-22T01:15:35.474Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt
