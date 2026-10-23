# REVIEW-062 round two, leg B — a newcomer reads two posts and one page section

DO NOT USE ANY TOOLS. Everything you need is inline below. Do not try to open
files, run commands or fetch URLs.

You are reading two posts for the first time. You know roughly what a blockchain
is and that the XRP Ledger is one, and you may work in finance, product or
software. You have never read XLS-96 or this project's repository, and you will
not. You saw the LinkedIn post first, in your feed, clicked through to the blog
post, and then opened the project's demo site, where you read the section
reproduced at the end.

The project's first priority is that every sentence is true and claims no more
than its evidence. Its second priority, which is your job, is that a stranger
understands it and is not misled by it. These texts have been revised once
already after a reader like you; look for what is still wrong.

Answer in this order.

1. **After the LinkedIn post only.** In two or three sentences of your own: is
   confidential transfer possible on the XRP Ledger, and with what limits? What do
   you think the author is claiming to have done?
2. **After the blog post.** In your own words, and briefly: what is hidden and
   what is public; who can read a balance and who can spend it; what happens if a
   key is lost; what the receivables facility shows and does not show; what went
   upstream and what happened to it; what outside reviews exist and what they
   covered; and what the project's own reviews were. Where your account is wrong
   or vague, the post failed you there, so be honest about it.
3. **After the page section.** In one sentence: what does the facility hide, and
   what does it not? Does the section's last sentence match the lists above it?
4. **Where it reads stronger than it should.** Any sentence that made you think
   the project is audited, secure, production-ready, reviewed by outside experts,
   or more private than the text says elsewhere; any two sentences that seemed to
   contradict each other. Quote both.
5. **Where you got lost.** Each term used before it was explained, each sentence
   you had to read twice. Quote the text exactly.

End with the line `END OF ROUND TWO LEG B REPORT`.

---

## The LinkedIn post, as it would appear


Is confidential transfer possible on the XRP Ledger? Yes, on Devnet only. XLS-96 is a final standard, and when I checked on 2026-10-22 its amendment, ConfidentialTransfer, was enabled on Devnet and not on Mainnet or Testnet.

It hides less than the word suggests. I built the core of a receivables facility on it and ran it on Devnet to find out exactly what an outside observer sees.

Hidden from the public: each holder's balance, and the amount of each transfer between confidential balances.

Public: who pays whom, when, and how often. Every amount converted into or out of confidential form. Some zero balances, which anyone can recognise.

The issuer can read every balance, always. No setting turns that off.

There is no key rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet today. A draft standard, XLS-99, proposes both.

In the facility, that means the size of the float, which suppliers drew on which days, and every retirement tranche are public. Each supplier's limit, the size of each drawdown and what each supplier owes are not. It hides how much, not who or when.

Along the way I filed eleven issues with XRPLF repositories. Upstream resolved four in September and fixed a fifth on 2026-10-21, not yet in a release. The rest are open, waiting, or closed without comment. The write-up describes each one, and names the three outside reviews of upstream's code.

This is a research project on a test network. It is not audited, and not production-ready.

The write-up: <BLOG-URL>
A read-only demo: https://xrpl-confidential-positions.vercel.app
The code and the claims register: https://github.com/nandanito/xrpl-confidential-positions

XLS-96 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, with Tess Dore and Murat Cenk's compact sigma protocol.

---

## The blog post

# Amounts, not relationships: what confidential transfers on the XRP Ledger hide

*Status, before anything else: this is a research project on the XRP Ledger's
Devnet test network. It is not audited, not production-ready, and not safe to put
value behind. Its signer refuses every network but Devnet.*

Can a token move confidentially on the XRP Ledger? Yes, under a standard called
XLS-96, and today only on Devnet. When I checked on 2026-10-22 at 03:25 UTC, its
amendment, `ConfidentialTransfer`, was enabled on Devnet, and supported but not
enabled on Mainnet and Testnet. That reading goes stale. The repository has a
script that takes a fresh one.

What XLS-96 hides is narrower than the word *confidential* suggests. It hides
balances, and the amounts of transfers between confidential balances. It does not
hide who pays whom, when, or how often. It does not hide amounts entering or
leaving confidential form. And it hides nothing from the token's issuer.

Since mid-August I have been building an application on it to find out exactly
where that line falls, by running transactions rather than by reading the
specification. This post is what I found, what the reviews of my own work caught,
and what went back upstream. The project is called W-CONF. The code and its claims
register are public at
[github.com/nandanito/xrpl-confidential-positions](https://github.com/nandanito/xrpl-confidential-positions),
and a read-only demo is at
[xrpl-confidential-positions.vercel.app](https://xrpl-confidential-positions.vercel.app).

Ids such as *E-58* in this post are rows in the project's claims register,
[`CLAIMS.md`](https://github.com/nandanito/xrpl-confidential-positions/blob/main/CLAIMS.md).
Each row says what supports it. Where this post and a row disagree, the row wins.

* * *

## What XLS-96 is, briefly

The XRP Ledger is public: anyone can read every account and every transaction.
Multi-Purpose Tokens (MPTs, XLS-33) are one of its token types: an account issues
a token, and other accounts hold it. XLS-96, Confidential Transfers for MPTs, lets
a holder keep an MPT balance encrypted on that public ledger.

Each confidential balance is an ElGamal ciphertext, a public-key encryption of the
amount. A holder registers their own encryption key when they opt in. The ledger
still has to stop anyone spending more than they hold, so every transaction that
spends from a confidential balance carries zero-knowledge proofs, which validators
check without learning the amount.

A position moves through four transactions:

- **Convert** moves tokens from a public balance into the holder's confidential
  inbox. The amount is published.
- **Send** moves an amount from one confidential balance into another holder's
  inbox. The amount is hidden. The sender and receiver are not.
- **MergeInbox** moves the inbox into the balance the holder can spend. Tokens in
  the inbox cannot be sent until they are merged.
- **ConvertBack** moves tokens back to a public balance. The amount is published.

Only Send hides an amount.

The specification, XLS-0096, is the work of Murat Cenk, Aanchal Malhotra, Ayo
Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, and has been `Final` since
2026-09-03 (E-1). The compact sigma protocol, the zero-knowledge proof behind a
Send, is the work of Tess Dore and Murat Cenk at RippleX Research. The reference
cryptography is [`XRPLF/mpt-crypto`](https://github.com/XRPLF/mpt-crypto). This
project builds on their work and claims none of it.

Upstream's code has had three outside reviews. None of them reviewed this
project, which has had no outside audit. Trail of Bits reviewed upstream's
Confidential Transfer implementation in April 2026; that report is the one I could
read and check my findings against, and a later revision of it could not be
obtained. The Sherlock XRP Ledger Attackathon was a contest that covered
Confidential Transfers, and its findings are not public. A Zellic scan of
mpt-crypto is known to me only through three identifiers an upstream issue cites.
Of the three, only Trail of Bits' April report could be checked.

* * *

## What it hides, and what it does not

**Hidden from the public:** each holder's balance, and the amount of each Send.

**Public, always:**

- The sender and receiver of every transfer, and when it happened, so how often
  anyone transacts (P-4, P-11).
- Every amount converted in or out, each one separately.
- The token's total supply, and the total held in confidential form.
- That a balance is exactly zero, in three cases, below.

**Who can read every balance:** the issuer, always. XLS-96 keeps a second copy of
each confidential balance, encrypted to the issuer's key, and no setting turns it
off (P-9). An auditor can read them too, if the token names one, and only one is
supported (E-11). I ran this rather than inferring it. The holder, the issuer and
the auditor each decrypted the same balance, 500, and each read 475 after a
25-unit Send (E-58).

**Who can spend:** only whoever holds the holder's encryption secret, because a
Send's proof cannot be made without it (E-33). Where that secret is derived from
the account's master seed, as this project derives it, whoever holds the seed
holds the secret too. The issuer cannot spend a holder's balance. If the token
allows clawback, a setting that lets an issuer take tokens back, the issuer can
destroy a confidential balance, crediting no one, and this project's tokens allow
clawback (E-12). Unless the token's flags were made unchangeable when it was
created, the issuer can also turn on locking later and freeze balances. That
second power I read in rippled's source and did not run (E-290).

**Zero is sometimes visible.** XLS-96 writes a fixed encryption of zero, which
anyone can recompute from public inputs, in three places: a new confidential
balance, an inbox that a MergeInbox has just emptied, and a position clawed back.
So enrolment is publicly visible. The English documentation said this value could
not be told apart from other ciphertexts. I recomputed it from public inputs and
matched it byte for byte against live Devnet state (F-1, E-59), reported it, and
the English page was corrected in September. A balance spent down to zero holds a
randomised encryption of zero, and is not recognisable (E-211).

**The public numbers bound the hidden ones.** If a holder converts in 500, receives
nothing, and converts back 400, anyone can work out that the other 100 is either
still held or has left by confidential Send. No key is needed. I first wrote that
the 100 *"left by transfer"*. That overstated what an observer learns, and it is
recorded as a correction (R-7).

* * *

## No rotation, no recovery

A registered key can never be changed (E-9). XLS-96 has no key rotation and no key
recovery (P-10). If a holder loses their key, and any seed it could be re-derived
from, the balance cannot be spent. The only remedy is an issuer clawback, which
destroys the balance.

A draft standard, XLS-99, by Aanchal Malhotra and Yinyi Qian, proposes rotation for
holder, issuer and auditor keys, and recovery from key loss. On 2026-10-22,
rippled's development branch and its release candidate `3.5.0-rc1` declared its
amendment as not supported, and Mainnet, Testnet and Devnet did not know it (E-353).
So there is no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet,
today.

* * *

## The example: a confidential receivables facility

To test the standard against something with stakes, I built the core of a
receivables facility. A bank pays a large buyer's suppliers early, against their
invoices. How much a supplier draws says a lot about its cash position, so these
amounts are commercially sensitive.

The bank issues a token. An ordinary XRPL account, which this project calls the
Dedicated Account, holds the float and converts it into confidential form once.
Suppliers enrol, draw down by confidential Send, and repay the same way. At the
end, what is left of the float is retired in tranches by ConvertBack. It ran on
Devnet on 2026-08-25, in 28 validated facility transactions besides setting up the
token (E-146).

**Anyone can see** the size of the float, because converting it publishes the
amount. They can see which suppliers enrolled, who drew and repaid, on which days,
and how often. And they can see the size of every retirement tranche, because
each ConvertBack publishes its own amount (F-24). My own walkthrough first said a
ConvertBack published only *"the aggregate change"*. The validated transactions
showed each tranche in plaintext.

**Hidden from the public:** each supplier's limit, the size of each drawdown and
repayment, and what each supplier still owes. The bank, as issuer, sees all of it.

So it hides how much each supplier draws and owes. It does not hide who borrows,
when, how often, or the size of the whole. An early version of the design claimed
the facility *"shows nothing about which supplier drew how much"* (R-1). Which
supplier drew, and when, is public.

Two limits of that run. First, it read the ledger through a public Devnet node.
The design requires a node on the same machine, and a local Devnet node never
finished syncing on the hardware I had, so I accepted that as a named risk (E-148,
E-151). Second, one test driver played the bank and every supplier and held every
seed. The run shows that these transactions are well formed and that rippled
accepts them. It does not show how custody would work.

* * *

## Reading the specification, and running it

Several of the things above I learned only by running them:

- That three different keys decrypt the same balance, through a change (E-58).
- That the encryption of zero matches a value anyone can recompute (F-1).
- That a balance spent to zero is not recognisable. My own observer page had
  labelled every ciphertext that was not the fixed zero as *"Non-zero"*, and a
  holder whose balance decrypted to 0 disproved it (E-211).
- That a failing transaction is not simply rejected. A `tec` result, one class of
  XRPL failure code, is still applied to the ledger and consumes the account's
  sequence number. The submission parameter `fail_hard` asks the node to discard
  it instead. I ran both on Devnet with a plain Payment that fails with `tecNO_AUTH`:
  the same signed bytes were applied without the flag, and discarded with it
  (E-149).

That last one matters more for confidential transactions than for plain ones,
because a `tec` keeps the transaction's fields, ciphertexts included. If a signer
reads a wrong destination key from a dishonest node, the amount is published
encrypted to that key for good, even though the transaction fails. That case I
read in rippled's source and did not run (F-23).

Running is not a substitute for reading what others have already found. Several
things I first recorded as findings turned out to be issues that Trail of Bits'
April 2026 review had already found and Ripple had fixed.

* * *

## What the reviews caught

Design decisions and fixes went through rounds of adversarial review. These were
the project's own review rounds, not outside audits. Each round gave its
reviewers deliberately different packets, so that their agreement would mean more
than one reading copied three times. The repository keeps 61 numbered review records,
including the ones that found me wrong. A few of the catches:

- **A secret not wiped from memory, behind a comment explaining why it could not
  be.** The comment said the secret's type belonged to an outside library. It was
  the project's own type, and one search of its file showed it had no wiping at
  all (E-200).
- **A design claim that four reviewers independently ruled unsound.** I had
  written that the project's local read-only web viewer *"moves no trust
  boundary"*. It added no signing authority. But it re-served, to any local user,
  data the project protects with file permissions (E-230). That was the viewer
  that runs on the holder's machine, before the hosted demo existed; the demo
  serves only static files.
- **A release gate that passed a Content Security Policy every browser refused.**
  The gate hashed inline scripts over the file's bytes. Browsers hash the text they
  parse, which differs. Only loading the pages in a real browser showed it (E-334).
- **Fixes that did not fix.** In one review's second round, five of the first
  round's fixes had not discharged their findings. Only the reviewer that ran each
  finding's own example against the fixed code found them (E-345).

The lesson I keep relearning: fixing something and describing the fix are two
acts that fail separately. A reviewer who reads my summary of a finding will tick
the summary.

* * *

## Checks that catch a false sentence

The working rule is that a claim needs its evidence before it is written. The
claims register holds each established claim with what supports it, and twelve
standing prohibitions, P-1 to P-12, on what may not be claimed at all: that XLS-96
hides identities, that holders are private from the issuer, that it supports key
rotation, any benchmark without its hardware and method, and any claim that a
source does *not* say something without the search that would show otherwise.

Prose drifts anyway, so some of it is enforced by checks that run in CI. One fails
when a retracted phrase reappears without its correction. One fails when a note
meant for upstream says something is missing from a source and does not record the
search that found it missing. One keeps the register's derived indexes in step
with it.

They do not catch everything. The register keeps eight correction records, R-1 to
R-8. Most withdraw or narrow something this project claimed; one records a
retraction that was itself reversed. The last one, R-8, said every confidential
transaction needs both of a holder's keys; a MergeInbox needs only the account
key. It was on the public demo until a reviewer found it repeated in a diagram
caption. And on 2026-10-18 the register still listed as open four filings that
upstream had fixed in September (E-316). Nothing re-checked them until
I surveyed every filing at source. That survey is now a gate on anything I publish
about them, including this post.

* * *

## What went upstream

Since 2026-08-26 this project has filed eleven issues in four XRPLF repositories.
Their state on 2026-10-22, read at source (E-353):

- **Four resolved in September.** Three issues against the XLS-0096 text were
  resolved in the merged standard. The documentation's sentence calling the zero
  value indistinguishable was corrected on the English page. The Japanese
  translation was made from the text before the fix, and still carries it.
- **The mpt-crypto build.** Its lockfile pinned an OpenSSL revision that the
  documented package remote did not serve. Fixed on mpt-crypto's main branch on
  2026-10-21, not yet in a release. I re-ran the check against the merged commit,
  and it resolves.
- **The fixed zero, from JavaScript.** mpt-crypto's WASM and npm packages did not
  expose the function that computes the fixed encryption of zero, which is the
  check an outside observer most needs. A maintainer agreed and a pull request is
  approved and not merged. I have offered to write the JavaScript wrapper once it
  is released.
- **Three filed on 2026-10-18, against mpt-crypto, with no reply yet:** an
  ambiguity in what the compact sigma paper's nonce input covers; a WASM build
  script that fails outside its pinned toolchain; and a proof-size total in the
  paper that assumes a ciphertext component is sent once, where rippled and
  XLS-0096 send it per recipient.
- **A question to XRPL-Standards**, whether a confidential balance is meant to stay
  invisible to the accounting of the ledger's vaults (XLS-65), has had no reply in
  57 days.
- **A filing to rippled that listed only things done well** was closed without
  comment the day it was filed, so its reason is not known. It also fit neither of
  that repository's two issue templates, and the project's filing rules now forbid
  a positives-only filing to a bug tracker.

I do not call any of these new, or unreported. Of the three outside reviews of
upstream's code, I could check my findings against one.

* * *

## What it does not show

- **No run against a local node.** Every Devnet read went to the public cluster
  (E-151).
- **Custody is accepted, not solved.** The issuer can erase or freeze the
  facility's float. The Dedicated Account's key both moves the float and decrypts
  every amount sent to or from it, so those two powers cannot be held apart
  (E-266).
- **The key derivation is unpublished.** It is specified in this repository only,
  so a holder with their master seed but not this repository cannot reconstruct
  their key. Treat it as lock-in until it is published.
- **A hostile process running as the same user** can read the encryption secret
  out of memory.

* * *

## Try it

The demo is static pages built from one snapshot of Devnet. It signs nothing and
holds no keys. It shows what an observer reads of four test accounts, including
which balances are visibly zero; which encrypted copies the issuer can read,
without publishing the figures; and what each kind of key can do. It does not show
the facility, whose record is in the repository.

To transact, you run the signer yourself, on your own machine. The README explains
how to build it and run the local version of the site. It does not yet walk
through creating a holder profile and funded Devnet accounts, which a transaction
needs.

The repository has the Rust signer, the TypeScript facility, the read-only web
viewer, the claims register and the review records, under Apache-2.0.

If something in this is wrong, please tell me, by an issue on the repository. The
register has a section for corrections, and it has eight entries.

* * *

## References

- XLS-0096, Confidential Transfers for MPTs:
  [XRPLF/XRPL-Standards](https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0096-confidential-mpt)
- XLS-0099, ElGamal Key Rotation for Confidential MPTs (draft):
  [XRPLF/XRPL-Standards](https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0099-confidential-mpt-key-rotation)
- The reference cryptography: [XRPLF/mpt-crypto](https://github.com/XRPLF/mpt-crypto)
- Confidential Transfers on xrpl.org:
  [English](https://xrpl.org/docs/concepts/tokens/fungible-tokens/confidential-transfers)
- This project:
  [repository](https://github.com/nandanito/xrpl-confidential-positions),
  [demo](https://xrpl-confidential-positions.vercel.app),
  [claims register](https://github.com/nandanito/xrpl-confidential-positions/blob/main/CLAIMS.md),
  [what confidential means, at length](https://github.com/nandanito/xrpl-confidential-positions/blob/main/docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md),
  [the facility walkthrough](https://github.com/nandanito/xrpl-confidential-positions/blob/main/docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md),
  [the filings and their outcomes](https://github.com/nandanito/xrpl-confidential-positions/blob/main/UPSTREAM-FEEDBACK.md),
  [the 2026-10-22 survey](https://github.com/nandanito/xrpl-confidential-positions/blob/main/docs/evidence/upstream-survey-2026-10-22/README.md)

---

## The page section, as a browser shows its text (the demo site, page "How it works")

## The example: a confidential receivables facility

The other pages do not show this facility. They read four Devnet test accounts that hold one demo token, made by this project while it was being built: Holder A, an active position; Holder B, whose key is derived from its master seed; Holder C, the account the project’s ed25519 signing ran on; and Holder D, an early test account. “What anyone sees” and “What the issuer sees” show how those accounts look to an observer and to the issuer. The facility below ran separately, and its record is in the repository: the facility walkthrough.

A bank pays a large buyer’s suppliers early, against their invoices. How much a supplier draws says a lot about its cash position, so these numbers are commercially sensitive.
This project built the core of that facility on XLS-96 and ran it on Devnet on 2026-08-25, in 28 validated facility transactions besides setting up the token:

The bank
issues the token; reads every balance
↓funds it: amount public

The Dedicated Account
an ordinary XRPL account that holds the float, the money the facility advances to suppliers
↓one Convert: the whole float, amount public

The float, now confidential, in the Dedicated Account

↓drawdowns: Sends to suppliers
↑repayments: Sends back
Amounts hidden; who and when public.

Supplier A
limit, draws and what it owes are hidden

Supplier B
limit, draws and what it owes are hidden

Supplier C
limit, draws and what it owes are hidden
Each supplier enrols with a small public payment and its own Convert: both amounts public.

At the end: the float left in the Dedicated Account
→↓retired in tranches: each ConvertBack's amount public

A public balance again
publichidden from the publicthe issuer can read it
The facility as it ran on Devnet. The bank issues the token and so reads every balance; the amounts that move between the Dedicated Account and the suppliers are hidden, and the amounts at the edges are not.
The run shows that these transactions are well formed and that rippled accepts them. It read the ledger through a public Devnet node, not one on the same machine as the design requires, so it says nothing about that requirement.

### Anyone can see
The size of the float.
Which suppliers are enrolled, and both public amounts of each enrolment.
Who drew and repaid, on which days, and how often.
The size of every retirement tranche.

### Hidden from the public
Each supplier’s limit.
The size of each drawdown and repayment.
What each supplier still owes.
The bank, as issuer, sees all of it.
In short, it hides how much each supplier draws and owes, not who borrows, when, or the size of the float.
Sources: E-146, B-18, E-151, F-24, F-26, R-1; the four accounts: E-208, E-118, E-176, E-101


---
