# REVIEW-063 leg B — each post, read by the people who will actually see it

DO NOT USE ANY TOOLS. Everything you need is inline below. Do not open files, run
commands or fetch URLs.

An independent researcher is about to publish a blog post and five social posts about a
project that tested confidential token transfers (a standard called XLS-96) on the XRP
Ledger's test network. The posts must be true and claim no more than the evidence; that
is checked elsewhere. Your job is different: read each post AS the typical audience of
its platform, and say how it lands with them.

For each platform, take on the persona described, read only that platform's post, and
answer:

1. **First reaction**, in the persona's own voice, two or three sentences. Would you
   stop scrolling? Would you click the link?
2. **What you understood.** In one or two sentences, what is being claimed?
   If your reading is wrong or vague, the post failed you; say where.
3. **What reads wrong for this audience**: hype, marketing, jargon, condescension,
   anything that reads as promoting a coin or a company, anything that invites a
   hostile reply. Quote the words.
4. **The reply you expect**, the likeliest top reply or quote-post from this
   audience, and whether the post already answers it.
5. **Specific edits**: words to cut, a better first line, hashtags, length, tone.

The personas:

- **LinkedIn**: professionals in banking, payments, treasury and digital-asset
  infrastructure, product managers, and hiring managers at quantum, AI and digital-asset
  companies. Busy, skim the first two lines, wary of crypto hype, value a clear
  takeaway and evidence of rigour.
- **X**: a mixed crowd. Members of the XRP community, many enthusiastic about XRP and
  quick to defend or amplify anything Ripple-related; crypto developers; and
  crypto-skeptical engineers. Reads the first 280 characters before "Show more".
- **Bluesky**: technologists, researchers and journalists, many skeptical of crypto,
  interested in privacy and in honest negative results.
- **Mastodon**: free-software and information-security people, privacy-minded, often
  hostile to blockchain marketing, who value plain statements and open source.
- **Nostr**: bitcoiners and privacy advocates, skeptical of Ripple and of issuer-controlled
  tokens, alert to surveillance and to anything that calls a controlled system private.

Then, last, read the blog post as a **reader who clicked through from any of those
posts**: does it deliver what the post promised? Where does it lose you? What would you
cut? Is anything in it missing that the social post led you to expect?

End with the line `END OF LEG B REPORT`.

---

## LinkedIn post

Can you move tokens confidentially on the XRP Ledger? Yes, on its Devnet test network. But what it hides is narrower than the word suggests: amounts, not relationships.

XLS-96, the XRP Ledger's standard for confidential transfers, is final. As I write this it is switched on only on Devnet, not on Mainnet or Testnet. I built the core of a receivables facility on it, a bank paying suppliers early against their invoices, and ran it to see exactly what an outside observer can read.

Hidden from the public: each holder's balance, and the amount of each transfer between confidential balances. In the facility, that is each supplier's limit, how much it draws and what it owes.

Public: who pays whom, when and how often. Every amount moved into or out of confidential form, including the size of the float and of each part of it converted back at the end. And some zero balances, which anyone can recognise.

The token's issuer can read every balance, always. No setting turns that off. For a holder, that is where the privacy ends.

Keys cannot be rotated or recovered, in XLS-96 or on Mainnet, Testnet or Devnet. A draft standard, XLS-99, proposes both.

I started the same study on EVM chains at the same time. Those results will follow.

Where it could, the project ran its claims on the ledger instead of reading the specification, and it says which ones it only read. It keeps a public register of what it may claim and what it got wrong, and it filed eleven issues with the XRPLF repositories on GitHub. Five are resolved upstream so far.

It is a research project on a test network: not audited, not production-ready.

The write-up: https://nandan.me/writing/amounts-not-relationships/
A read-only demo: https://xrpl-confidential-positions.vercel.app
The code and the claims register: https://github.com/nandanito/xrpl-confidential-positions

XLS-96 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, and its send proof builds on Tess Dore and Murat Cenk's compact sigma protocol.

Independent work; not affiliated with Ripple.

#XRPL #DigitalAssets #Privacy #ZeroKnowledge #Tokenization

---

## X post

Can you move tokens confidentially on the XRP Ledger? Yes, on Devnet, under XLS-96. I built the core of a receivables facility on it and ran it to see exactly what it hides. The short answer: amounts, not relationships.

Hidden from the public: each holder's balance, and the amount of each Send between confidential balances.

Public: who pays whom, when and how often. Every amount converted into or out of confidential form. And some zero balances: the ledger writes a fixed encryption of zero, which anyone can recompute from public inputs, for a new balance, an inbox just merged and a position clawed back. I matched it byte for byte against live Devnet state.

The issuer reads every balance, always. XLS-96 keeps a second copy encrypted to the issuer's key, and no setting turns it off. If the token allows clawback, the issuer can also destroy a confidential balance.

Keys are for life: no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet. A draft standard, XLS-99, proposes both.

In the facility, that means the float, which suppliers drew on which days, and every tranche retired at the end are public. Each supplier's limit, draws and what it owes are not, though the public totals still bound them.

Eleven issues went upstream to the XRPLF repositories; five are resolved so far. The write-up's claims cite rows of a public claims register, and the register keeps its own corrections.

I started the same study on EVM chains at the same time. Those results will follow.

A research project on Devnet: not audited, not production-ready.

Write-up: https://nandan.me/writing/amounts-not-relationships/
Demo: https://xrpl-confidential-positions.vercel.app
Code: https://github.com/nandanito/xrpl-confidential-positions

Independent work; not affiliated with Ripple.

#XRPL #ZeroKnowledge

---

## Bluesky post

Confidential transfers on the XRP Ledger (XLS-96), run on Devnet: they hide balances and transfer amounts. Not who pays whom, when, the amounts going in and out, or anything from the issuer. Same study on EVM next.

https://nandan.me/writing/amounts-not-relationships/

---

## Mastodon post

I ran XLS-96, the XRP Ledger's confidential transfers, on Devnet to see what it actually hides. Balances, and the amounts sent between confidential balances. Not who pays whom, when or how often, not the amounts going in and out, and not some zero balances. The token's issuer can read every balance, and no setting turns that off. Open source, with a public register of every claim and correction. The same study on EVM chains comes next.

https://nandan.me/writing/amounts-not-relationships/

#XRPL #privacy #cryptography

---

## Nostr note

Can you move tokens confidentially on the XRP Ledger? Yes, on its Devnet, under a standard called XLS-96. I built the core of a receivables facility on it and ran it to find out exactly what it hides. The short answer: amounts, not relationships.

Hidden from the public: each holder's balance, and the amount of each transfer between confidential balances.

Public: who pays whom, when and how often; every amount moved into or out of confidential form; and some zero balances, which anyone can recompute from public inputs. I matched that fixed encryption of zero byte for byte against live Devnet state.

It is confidentiality from the public, not from the issuer. The token's issuer reads every balance, always, and no setting turns that off. If the token allows clawback, the issuer can destroy a confidential balance, and unless the token's flags were fixed when it was created, it can turn on locking later and freeze one.

Keys are for life: no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet. A draft standard, XLS-99, proposes both.

I started the same study on EVM chains at the same time. Those results will follow.

A research project on Devnet, not audited and not production-ready. Eleven issues went upstream; five are resolved so far.

Write-up: https://nandan.me/writing/amounts-not-relationships/
Code: https://github.com/nandanito/xrpl-confidential-positions

#XRPL #privacy #zeroknowledge

---

## The blog post (figures are described by their alt text)

*Status, before anything else: a research project on the XRP Ledger's Devnet test
network. Not audited, not production-ready, and not safe to put value behind. Its
signer refuses every network but Devnet.*

> **Provenance.** Ids such as *E-58* below are rows in the project's claims register,
> [`CLAIMS.md`](https://github.com/nandanito/xrpl-confidential-positions/blob/main/CLAIMS.md).
> Each row says what supports it: a transaction run on Devnet, a line of source, or a
> document read on a stated date. If this post and a row ever disagree, trust the row.

---

Can a token move confidentially on the XRP Ledger? Yes, under a standard called
XLS-96, and today only on Devnet. A new feature reaches the XRP Ledger as an
amendment, which a network's validators switch on. When I checked on 22 October
2026, XLS-96's amendment, `ConfidentialTransfer`, was enabled on Devnet, and
supported but not enabled on Mainnet and Testnet. That reading goes stale; the
repository has a script that takes a fresh one.

What XLS-96 hides is narrower than the word *confidential* suggests. It hides
balances, and the amounts of transfers between confidential balances. It does not
hide who pays whom, when, or how often. It does not hide amounts entering or
leaving confidential form. And it hides nothing from the token's issuer.

I set out to find exactly where that line falls by running transactions rather
than by reading the specification, and I started the same study on two ledgers at
once: the XRP Ledger, and EVM chains. This post is the XRP Ledger half. The EVM
results will follow in a separate post.

The XRP Ledger project is called W-CONF. Its code and claims register are public at
[github.com/nandanito/xrpl-confidential-positions](https://github.com/nandanito/xrpl-confidential-positions),
and a read-only demo is at
[xrpl-confidential-positions.vercel.app](https://xrpl-confidential-positions.vercel.app).

---

## What XLS-96 is, briefly

The XRP Ledger is public: anyone can read every account and every transaction.
Multi-Purpose Tokens (MPTs, XLS-33) are one of its token types: an account issues a
token, and other accounts hold it. XLS-96, Confidential Transfers for MPTs, lets a
holder keep an MPT balance encrypted on that public ledger.

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
- **MergeInbox** moves the inbox into the balance the holder can spend. Arrivals
  wait in the inbox so that they cannot change a balance while a proof about it is
  being built, and they cannot be sent until they are merged.
- **ConvertBack** moves tokens back to a public balance. The amount is published.

Only Send hides an amount.

The specification, XLS-0096, is the work of Murat Cenk, Aanchal Malhotra, Ayo
Akinyele, Peter Chen, Shawn Xie and Yinyi Qian, and is a final standard (E-1). The
compact sigma protocol, one of the zero-knowledge proofs behind a Send, is the work
of Tess Dore and Murat Cenk at RippleX Research. The reference cryptography is
[`XRPLF/mpt-crypto`](https://github.com/XRPLF/mpt-crypto). This project builds on
their work and claims none of it.

Upstream's code has had three outside reviews. None of them reviewed this project,
which has had no outside audit. Trail of Bits reviewed upstream's Confidential
Transfer implementation in April 2026; that report is the one I could read and
check my findings against, and a later revision of it could not be obtained. The
Sherlock XRP Ledger Attackathon was a contest that covered Confidential Transfers,
and its findings are not public. A Zellic scan of mpt-crypto is known to me only
through three identifiers an upstream issue cites. Of the three reviews, only Trail
of Bits' April report could be checked.

---

## What it hides, and what it does not

<figure>
  <img src="/images/posts/amounts-not-relationships/figure-1-where-the-line-falls.svg" alt="A token balance moves left to right. A public balance; an arrow labelled Convert, amount public, into a panel of confidential balances where holder A sends to holder B: the amount is hidden, the sender and receiver are public, and each balance is hidden unless it is visibly zero; an arrow labelled ConvertBack, amount public, out to a public balance. Below: public everywhere, who sends to whom, when and how often, and the total held in confidential form. The issuer reads every confidential balance, as does an auditor if the token names one, and no setting turns this off. A balance is visibly zero when it is new, when its inbox was just merged, or after a clawback.">
  <figcaption>Figure 1. Amounts are hidden inside confidential form and public at its edges. Who pays whom is public everywhere, and the issuer reads every balance.</figcaption>
</figure>

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
the account's master seed, as this project derives it, whoever holds the seed holds
the secret too. The issuer cannot spend a holder's balance. If the token allows
clawback, a setting that lets an issuer take tokens back, the issuer can destroy a
confidential balance, crediting no one, and this project's tokens allow clawback
(E-12). Unless the token's flags were made unchangeable when it was created, the
issuer can also turn on locking later and freeze balances. That second power I read
in rippled's source and did not run (E-290).

<figure>
  <img src="/images/posts/amounts-not-relationships/figure-2-who-can-read-who-can-spend.svg" alt="A table of who can see what. Columns: who pays whom and when; amounts converted in or out; a holder's balance; a Send's amount; can spend a balance. Anyone: yes, yes, only whether it is visibly zero, no, no. A holder: yes, yes, their own, their own, their own with both their keys. The issuer, highlighted: yes, yes, every one, every one, and no, though it can destroy one by clawback and may freeze one. An auditor, if the token names one: yes, yes, every one, every one, no.">
  <figcaption>Figure 2. Who can read what, and who can spend. A dashed cell is a partial yes.</figcaption>
</figure>

**Zero is sometimes visible.** XLS-96 writes a fixed encryption of zero, which
anyone can recompute from public inputs, in three places: a new confidential
balance, an inbox that a MergeInbox has just emptied, and a position clawed back.
So enrolment is publicly visible. The English documentation said this value could
not be told apart from other ciphertexts. I recomputed it from public inputs and
matched it byte for byte against live Devnet state (F-1, E-59), reported it, and the
English page was corrected. A balance spent down to zero holds a randomised
encryption of zero, and is not recognisable (E-211).

**The public numbers bound the hidden ones.** If a holder converts in 500, receives
nothing, and converts back 400, anyone can work out that the other 100 is either
still held or has left by confidential Send. No key is needed. I first wrote that
the 100 *"left by transfer"*. That overstated what an observer learns, and it is
recorded as a correction (R-7).

---

## No rotation, no recovery

A registered key can never be changed (E-9). XLS-96 has no key rotation and no key
recovery (P-10). If a holder loses their key, and any seed it could be re-derived
from, the balance cannot be spent. The only remedy is an issuer clawback, which
destroys the balance.

A draft standard, XLS-99, by Aanchal Malhotra and Yinyi Qian, proposes rotation for
holder, issuer and auditor keys, and recovery from key loss. When I checked, rippled
declared its amendment as not supported, in its development branch and in its
latest release candidate, and Mainnet, Testnet and Devnet did not know it (E-353).
So there is no rotation or recovery in XLS-96, or on Mainnet, Testnet or Devnet,
today.

---

## The example: a confidential receivables facility

To test the standard against something with stakes, I built the core of a
receivables facility. A bank pays a large buyer's suppliers early, against their
invoices. How much a supplier draws says a lot about its cash position, so these
amounts are commercially sensitive.

The bank issues a token. An ordinary XRPL account, which this project calls the
Dedicated Account, holds the float, the money the facility advances, and converts it
into confidential form once. Suppliers enrol, draw down by confidential Send, and
repay the same way. At the end, what is left of the float is retired in several
parts, called tranches, by ConvertBack. It ran on Devnet in 28 validated facility
transactions, besides setting up the token (E-146).

<figure>
  <img src="/images/posts/amounts-not-relationships/figure-3-the-facility.svg" alt="The facility's flow. The bank, which issues the token and reads every balance, funds the Dedicated Account with a public payment. The Dedicated Account makes one Convert of the whole float, amount public, so the float is confidential. Drawdowns and repayments are Sends between the float and suppliers A, B and C: amounts hidden, who and when public; each supplier's limit, draws and what it owes are hidden. Each supplier enrols with a small public payment and its own Convert, both amounts public. At the end, what is left of the float is retired in tranches, and each ConvertBack's amount is public. The public totals still bound the hidden amounts.">
  <figcaption>Figure 3. The facility as it ran on Devnet. The amounts that move between the float and the suppliers are hidden; the amounts at the edges are not.</figcaption>
</figure>

**Anyone can see** the size of the float, because converting it publishes the
amount. They can see which suppliers enrolled, who drew and repaid, on which days,
and how often. And they can see the size of every retirement tranche, because each
ConvertBack publishes its own amount (F-24). My own walkthrough first said a
ConvertBack published only *"the aggregate change"*. The validated transactions
showed each tranche in plaintext.

**Hidden from the public:** each supplier's limit, the size of each drawdown and
repayment, and what each supplier still owes. The bank, as issuer, sees all of it.
The public totals still bound these amounts, and in a small enough book they can pin
them exactly.

So it hides how much each supplier draws and owes. It does not hide who borrows,
when, how often, or the size of the whole. An early version of the design claimed
the facility *"shows nothing about which supplier drew how much"* (R-1). Which
supplier drew, and when, is public.

Two limits of that run. First, it read the ledger through a public Devnet node. The
design requires a node on the same machine, and a local Devnet node never finished
syncing on the hardware I had, so I accepted that as a named risk (E-148, E-151).
The run says nothing about that requirement. Second, one test driver played the
bank and every supplier and held every seed. The run shows that these transactions
are well formed and that rippled accepts them. It does not show how custody would
work.

---

## Reading the specification, and running it

Several of the things above I learned only by running them:

- That three different keys decrypt the same balance, through a change (E-58).
- That the encryption of zero matches a value anyone can recompute (F-1).
- That a balance spent to zero is not recognisable. My own observer page had
  labelled every ciphertext that was not the fixed zero as *"Non-zero"*, and a
  holder whose balance decrypted to 0 disproved it (E-211).
- That a failing transaction is not simply rejected. A `tec` result, one class of
  XRPL failure code, is still applied to the ledger: the fee is charged and the
  account's sequence number is used, though what the transaction asked for does not
  happen. The submission parameter `fail_hard` asks the node to discard it instead.
  I ran both on Devnet with a plain Payment that fails with `tecNO_AUTH`: the same
  signed bytes were applied without the flag, and discarded with it (E-149).

That last one matters more for confidential transactions than for plain ones,
because a `tec` keeps the transaction's fields, ciphertexts included. If a signer
reads a wrong destination key from a dishonest node, the amount is published
encrypted to that key for good, even though the transaction fails. That case I read
in rippled's source and did not run (F-23).

Running is not a substitute for reading what others have already found. Several
things I first recorded as findings turned out to be issues that Trail of Bits'
review had already found and Ripple had fixed.

---

## What the reviews caught

Design decisions and fixes went through rounds of adversarial review. These were
the project's own reviews: not outside audits, and not reviews by outside security
professionals. Each round gave its review passes deliberately different material,
so that their agreement would mean more than one reading copied three times. The
repository keeps more than sixty numbered review records, including the ones that
found me wrong. A few of the catches:

- **A secret not wiped from memory, behind a comment explaining why it could not
  be.** The comment said the secret's type belonged to an outside library. It was
  the project's own type, and one search of its file showed it had no wiping at all
  (E-200).
- **A design claim that four review passes independently ruled unsound.** I had
  written that the project's local read-only web viewer *"moves no trust
  boundary"*. It added no signing authority. But it re-served, to any local user,
  data the project protects with file permissions (E-230). That was the viewer that
  runs on the holder's machine, before the hosted demo existed; the demo serves only
  static files.
- **A release gate that passed a Content Security Policy every browser refused.**
  The gate hashed inline scripts over the file's bytes. Browsers hash the text they
  parse, which differs. Only loading the pages in a real browser showed it (E-334).
- **Fixes that did not fix.** In one review's second round, five of the first
  round's fixes had not discharged their findings. Only the review pass that ran
  each finding's own example against the fixed code found them (E-345).

The lesson I keep relearning: fixing something and describing the fix are two acts
that fail separately. A review that reads my summary of a finding will tick the
summary.

---

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
search that found it missing. One keeps the register's derived indexes in step with
it.

They do not catch everything. The register keeps nine correction records, R-1 to
R-9. Most withdraw or narrow something this project claimed; one records a
retraction that was itself reversed. R-8 said every confidential transaction needs
both of a holder's keys, when a MergeInbox needs only the account key; it was on the
public demo until a review pass found it repeated in a diagram caption. R-9 came
from reviewing this post. The README and the demo summarised the facility as hiding
*"the shape of the book, not its size"*, and a reader new to the project took
*shape* to mean who borrows and when, which is public. That sentence is replaced
everywhere, and a check now refuses it.

At one point the register still listed as open four filings that upstream had
already fixed (E-316). Nothing re-checked them until I surveyed every filing at
source. That survey now runs before anything I publish about them, this post
included.

---

## What went upstream

This project has filed eleven issues in four XRPLF repositories. Their state when I
checked, read at source (E-353):

- **Four resolved.** Three issues against the XLS-0096 text were resolved in the
  merged standard. The documentation's sentence calling the zero value
  indistinguishable was corrected on the English page. The Japanese translation was
  made from the text before the fix, and still carries it.
- **The mpt-crypto build.** Its lockfile pinned an OpenSSL revision that the
  documented package remote did not serve. Fixed on mpt-crypto's main branch, not
  yet in a release. I re-ran the check against the merged commit, and it resolves.
- **The fixed zero, from JavaScript.** mpt-crypto's WASM and npm packages did not
  expose the function that computes the fixed encryption of zero, which is the check
  an outside observer most needs. A maintainer agreed and a pull request is approved
  and not merged. I have offered to write the JavaScript wrapper once it is
  released.
- **Three filed most recently, against mpt-crypto, with no reply yet:** an
  ambiguity in what the compact sigma paper's nonce input covers; a WASM build
  script that fails outside its pinned toolchain; and a proof-size total in the
  paper that assumes a ciphertext component is sent once, where rippled and XLS-0096
  send it per recipient.
- **A question to XRPL-Standards**, whether a confidential balance is meant to stay
  invisible to the accounting of the ledger's vaults (XLS-65), which pool one asset
  and issue shares against it, has had no reply in nearly two months.
- **A filing to rippled that listed only things done well** was closed without
  comment the day it was filed, so its reason is not known. It also fit neither of
  that repository's two issue templates, and the project's filing rules now forbid a
  positives-only filing to a bug tracker.

I do not call any of these new, or unreported. Of the three outside reviews of
upstream's code, I could check my findings against one.

---

## What it does not show

- **No run against a local node.** Every Devnet read went to the public cluster
  (E-151).
- **Custody is accepted, not solved.** The issuer can erase or freeze the facility's
  float. The Dedicated Account's key both moves the float and decrypts every amount
  sent to or from it, so those two powers cannot be held apart (E-266).
- **The key derivation is unpublished.** It is specified in this repository only, so
  a holder with their master seed but not this repository cannot reconstruct their
  key. Treat it as lock-in until it is published.
- **A hostile process running as the same user** can read the encryption secret out
  of memory.

---

## Try it

The demo is static pages built from one snapshot of Devnet. It signs nothing and
holds no keys. It shows what an observer reads of four test accounts, including
which balances are visibly zero; which encrypted copies the issuer can read, without
publishing the figures; and what each kind of key can do. It does not show the
facility, whose record is in the repository.

To transact, you run the signer yourself, on your own machine. The README explains
how to build it and run the local version of the site. It does not yet walk through
creating a holder profile and funded Devnet accounts, which a transaction needs.

The repository has the Rust signer, the TypeScript facility, the read-only web
viewer, the claims register and the review records, under Apache-2.0.

---

## What to take from it

- **XLS-96 hides amounts, not relationships.** Balances and Send amounts are
  hidden from the public. Who pays whom, when and how often is not.
- **The edges are public.** Every Convert and ConvertBack publishes its amount, and
  the totals bound what is hidden.
- **The issuer sees everything.** It reads every balance, can destroy one by
  clawback, and may be able to freeze one.
- **Keys are for life.** No rotation and no recovery, in XLS-96 or on Mainnet,
  Testnet or Devnet today. XLS-99 is a draft that would add both.
- **Running it found things reading did not**, and reading what others had already
  found saved me from calling their findings mine.

**Next:** the same study on EVM chains.

If something in this is wrong, please tell me, by an issue on the repository. The
register has a section for corrections, and it has nine entries.

---

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
  [the latest filing survey](https://github.com/nandanito/xrpl-confidential-positions/blob/main/docs/evidence/upstream-survey-2026-10-22/README.md)

---

*Independent work. Not affiliated with or endorsed by Ripple. "XRP Ledger", "XRPL"
and "Ripple" are used nominatively.*

---
