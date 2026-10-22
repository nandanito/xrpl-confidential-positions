# REVIEW-060 leg B — a newcomer reads two pages of a demonstration site

DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to open
files, run commands or fetch URLs.

You are reading a small public website for the first time. You arrived from a
LinkedIn post. You know roughly what a blockchain is and that the XRP Ledger is
one, and you may work in finance, product or software. You have never read
XLS-96 or this project's repository, and you will not.

The site is a read-only demonstration from a research project. Its owner found
the old front page "verbose and confusing" for orienting a reader, and asked
for an explainer. Below is the visible text of the new front page and the new
explainer page, as a browser shows it. The project's priority is that every
sentence is true and claims no more than the evidence; its second priority,
which is your job, is that a stranger can understand it.

Answer in this order.

1. **After the front page only.** In three or four sentences of your own: what
   is this site, what does XLS-96 do, and what would you click next? If you
   could not say, say where it lost you.
2. **After the explainer.** In your own words, and briefly: what a confidential
   transfer is; how tokens go in, move, and come out, and which amounts anyone
   can see; who can read a balance; what the example (the receivables facility)
   shows; and what the four test accounts on the site are. Where your account
   is wrong or vague, the page failed you there, so be honest about it.
3. **Where you got lost.** Each term used before it was explained or never
   explained; each sentence you had to read twice; anything in the wrong order.
   Quote the text exactly.
4. **Misreadings.** Sentences a reader like you could take as a STRONGER claim
   than they likely mean (about privacy, safety, security, what is hidden, who
   can see what, whether it is ready to use), and any that read WEAKER. Quote
   each and say how you first read it.
5. **What is missing** that you needed in order to orient yourself, and what
   could be cut without loss.
6. **The front page.** Is it short enough? Does it point you to the explainer
   clearly? Is the list labelled "What it never claims", with codes like P-4,
   helpful or noise to you?

For each point in 3 to 6, give the smallest change that would fix it. No praise
is needed; the project uses only the problems. End with the line
`END OF LEG B REPORT`.

---

# Visible text of two pages of the rebuilt site (commit aabb31e), as a browser renders them

Extracted from the built HTML by stripping tags; links are shown as their text only, and `[nav]` is the navigation bar.


---

# PAGE: The overview, /

Devnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## What this site shows
XLS-96, Confidential Transfers, lets a token holder keep their balance encrypted on the public XRP Ledger. This site shows what that hides and what it does not, from one snapshot of the Devnet test network.
Hidden: Each holder’s balance, though some zero balances are recognisable, and the amount of each confidential send.
Public: Who sends to whom, when and how often, and every amount moved into or out of confidential form.
The issuer: Can always read every balance. No setting turns this off.
New to this? Read how it works

## Where to go
- How it works: confidential transfers in plain words, and the example this project built.
- What anyone sees: what a ledger observer reads of four test accounts, including which balances are visibly zero.
- What the issuer sees: the issuer’s encrypted copy of each balance, without the figure.
- Who can do what: what each kind of key can and cannot do.
- Wallets: why the browser wallets examined cannot hold a confidential position.
- Custody: where confidentiality and custody approval policies conflict.

## About this site
Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.
To transact, run it yourself. Signing happens only in wconf-signer , a separate program on the holder’s own machine, never in a web page. The README’s “Run it” explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.

## What it never claims
- P-4 No key source hides identities. The sender and receiver of every confidential transaction are public.
- P-9 A holder is never private from the issuer. The issuer can always decrypt.
- P-10 No key source supports rotation or recovery. XLS-96 supports neither.
- P-11 No key source hides who transacts, when, or how often. Only amounts are hidden.
- F-1 A newly created confidential balance is publicly identifiable as exactly zero.
- F-24 Retiring a position in tranches publishes each tranche size.
- P-5 None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Each label is a row in the repository’s CLAIMS.md.

Built from commit aabb31e6f239 of the public repository. Ledger values were read at validated ledger 6300109 on 2026-10-21T14:50:47.234Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

---

# PAGE: How it works, /how-it-works

Devnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)

# W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
[nav] Overview | How it works | What anyone sees | What the issuer sees | Who can do what | Wallets | Custody

## Confidential balances, in brief

The XRP Ledger is public: anyone can read every account and every transaction on it. Multi-Purpose Tokens (MPTs, XLS-33) are one of its kinds of token. Confidential Transfers (XLS-96) let an MPT holder keep their balance encrypted on that public ledger.
Each confidential balance is stored as an ElGamal ciphertext: a number only the right key can read. A holder registers their own encryption key when they opt in.
The ledger must still check that nobody spends more than they hold. So each confidential transaction carries zero-knowledge proofs, which every validator checks without learning the amount.
When this page was written, on 2026-10-21, XLS-96’s amendment, ConfidentialTransfer, was enabled on Devnet and not on Mainnet or Testnet.
Sources: E-1; tools/check-amendments.ts, run 2026-10-21

## The life of a confidential position

1. In: Convert [chip: amount public]
ConfidentialMPTConvert
Moves tokens from the holder’s public balance into confidential form. The amount is published. The first Convert also registers the holder’s key, which can never be changed.

2. Inside: Send [chip: amount hidden]
ConfidentialMPTSend
Moves an amount from one confidential balance to another. The amount is hidden; the sender and receiver are not. It arrives in the receiver’s inbox, and a MergeInbox moves it into their spending balance.

3. Out: ConvertBack [chip: amount public]
ConfidentialMPTConvertBack
Moves tokens back to a public balance. The amount is published, on every ConvertBack separately.

Only Send hides an amount. Its proofs show that the sender holds the key to their balance, that every encrypted copy of the amount is the same number, and that neither the amount nor the sender’s remaining balance is negative. The copies are for the sender, the receiver, the issuer and any auditor.
Why are both ends public? The ledger shows that no tokens are created inside the confidential pool by keeping its total in plain view. The token records the total held in confidential form, and every Convert and ConvertBack changes it by a published amount.
Sources: E-9, E-33, F-24; TASK ZERO §3

## What is hidden, and what is public

### Hidden from the public
- Each holder’s balance, except in the zero cases under “Public, always”.
- The amount of each Send.
Both are hidden from the public, not from the issuer.

### Public, always
- Who sends to whom, and when, so how often anyone transacts.
- Every amount converted in or out, each one separately.
- The token’s total supply, and the total held in confidential form.
- That a balance is exactly zero, in three cases: when it is first set up, when a MergeInbox empties the inbox, and after a clawback. A balance spent down to zero looks like any other.
The public numbers also bound the hidden ones. If a holder converts in 500, receives nothing and converts back 400, anyone can work out that the other 100 is either still held or has left by confidential sends. No key is needed.
Sources: P-4, P-11, F-24, F-1, E-211, R-1

## Who can read a balance, and who can spend it
- The holder can read their own balance, with their key.
- The issuer can always read every balance. The protocol keeps a second copy of each balance, encrypted to the issuer’s key, and no setting turns it off.
- An auditor can too, if the issuer names one. Only one auditor is supported.
- This was run, not inferred: the holder, the issuer and the auditor each read the same balance, and again after it changed.
- Only the holder can spend. A Send’s proof cannot be made without the holder’s key. Where that key is derived from the account’s master seed, whoever holds the seed holds the key too.
Sources: P-9, E-58, E-11, E-33

## The example: a confidential receivables facility

A bank pays a large buyer’s suppliers early, against their invoices. How much a supplier draws says a lot about its cash position, so these numbers are commercially sensitive.
This project built that facility on XLS-96 and ran it on Devnet, in 28 validated transactions:
- The bank creates the token. A Dedicated Account, an ordinary XRPL account, converts the whole float into confidential form in one Convert.
- Each supplier enrols: the bank sends it a small public payment, and the supplier runs its own Convert, which registers its key.
- Drawdowns and repayments are Sends between the Dedicated Account and the suppliers.
- The facility is retired in tranches, each one a ConvertBack.

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

These pages do not show the facility. They read four Devnet test accounts that hold one demo token, made by this project while it was being built: Holder A, an active position; Holder B, whose key is derived from its master seed; Holder C, the account the project’s ed25519 signing ran on; and Holder D, an early test account. The facility’s run is recorded in the repository.
The facility walkthrough
Sources: E-146, F-24, F-26, R-1

## Limits
- No key rotation or recovery. A registered key can never be changed. If a holder loses it, the balance cannot be spent, and the only remedy is an issuer clawback, which destroys the balance. A draft standard, XLS-99, proposes rotation and recovery; on 2026-10-20 Mainnet, Testnet and Devnet did not know its amendment.
- The issuer can act without the holder’s consent. If the token allows clawback, the issuer can destroy a holder’s whole confidential balance. Unless the token’s flags were made unchangeable when it was created, the issuer can also turn on locking later and freeze balances. That second power was read in rippled’s source, not run.
- Not audited. This is a research project on a test network. It is not audited, not production-ready and not safe to put value behind.
Sources: P-10, E-9, E-341, E-12, E-21, E-290, E-292, P-5
Each id under a panel, such as E-58, is a row in the project’s claims register, CLAIMS.md. Where this page and a row disagree, the row wins.

Built from commit aabb31e6f239 of the public repository. Ledger values were read at validated ledger 6300109 on 2026-10-21T14:50:47.234Z.
This page is published at https://xrpl-confidential-positions.vercel.app . A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt
