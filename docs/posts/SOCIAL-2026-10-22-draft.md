<!--
Social posts for "Amounts, not relationships: what confidential transfers on the XRP Ledger
hide" (nandan.me/writing/amounts-not-relationships/): X, Bluesky, Mastodon and Nostr, the
shape the array-thinking posts settled on. One post per network; the personal X account has
Premium (long posts), and Bluesky's 300-character cap is met by one short post.
Hook everywhere: it hides amounts, not relationships. The Bluesky and Nostr posts lead with the
result instead of a question, for audiences that skim past a rhetorical opening (REVIEW-063 leg B).
Dates: none written out, as the owner asked. Each status sentence (P-3) reads "as I write
this", which the post's own timestamp dates (REVIEW-064 A-3), and E-353's `check-amendments` reading is the
evidence. Re-run it on the day of posting.
Tagging: none. Ripple and the XRPLF organisation are named in plain text; check a handle exists
before tagging on any network.
EVM: each post says only that the same study is running on EVM chains and results will follow.
Mastodon: post with the content warning "blockchain, privacy analysis", the norm for crypto
topics on most instances. No #XRPL there, which many instances filter (REVIEW-063 leg B).
Hashtags: no #ZeroKnowledge anywhere; it invites an argument about whether the proofs make the
transfers private, which this post says they do not.
Images: attach the blog's card, /images/posts/amounts-not-relationships/linkedin-card.png on the
site (1200×627, figure 1 at 1200), to every post with the card alt text below. Figure 2 goes in an
optional self-reply on X and Mastodon, rendered at 2x (`rsvg-convert -w 1800`), with its alt text
below.
Claims: every one is from the blog post and its register rows (see the LinkedIn file's note);
the X and Nostr posts add the byte-for-byte match of the fixed zero (F-1, E-59) and clawback
(E-12); Nostr adds the freeze, with its condition (E-290). No speed, size or benchmark figures
(P-8). P-5: not audited, not production-ready.
Lengths, counted with Python's len(): X long post within Premium's limit, the hook inside the
first 280 characters; Bluesky within 300 counting the full URL; Mastodon within 500 with each
link counted as 23. Re-count after any edit.

Card alt text (all networks):
How a confidential token balance moves on the XRP Ledger. Holder A's public balance converts
into confidential form, and the amount is public. Inside, holder A sends to holder B: the amount
is hidden from the public, the sender and receiver are public, and each balance is hidden from
the public unless it is visibly zero. Converting back out to holder B's public balance publishes
the amount again. Public everywhere: who sends to whom, when and how often. The issuer reads
every confidential balance, and no setting turns this off.

Figure 2 alt text (the self-reply):
A table of who can see what on a confidential XRP Ledger token. Anyone sees who pays whom and
when, and every amount converted in or out, but no balance beyond whether it is visibly zero, and
no Send amount. A holder sees their own balance and Sends, and can spend their own with both
their keys. The issuer, highlighted, reads every balance and every Send amount and cannot spend,
but if the token's settings allow, it can destroy or freeze a balance: destroy only if
the token allows clawback, and freeze only if it allows locking. An issuer can switch
either on later unless it has made that setting unchangeable. An auditor, if the token
names one, reads every balance and Send amount and cannot spend.
-->

# X (single long post)

Can you move tokens confidentially on the XRP Ledger? Yes, under XLS-96, and as I write this only on Devnet. I built the core of a receivables facility on it and ran it to see exactly what it hides. The short answer: amounts, not relationships.

Hidden from the public: each holder's balance, and the amount of each Send between confidential balances.

Public: who pays whom, when and how often. Every amount converted into or out of confidential form. And some zero balances: the ledger writes a fixed encryption of zero, which anyone can recompute from public inputs, for a new balance, an inbox just merged and a position clawed back. I matched it byte for byte against live Devnet state.

The issuer reads every balance, always. XLS-96 keeps a second copy encrypted to the issuer's key, and no setting turns it off. That is by design, and it means "confidential" here is confidentiality from the public. If the token allows clawback, the issuer can also destroy a confidential balance.

Keys cannot be rotated or recovered, in XLS-96 or, as I write this, on Mainnet, Testnet or Devnet. A draft standard, XLS-99, proposes both.

In the facility, that means the float, which suppliers drew on which days, and every tranche retired at the end are public. Each supplier's limit, draws and what it owes are not, though the public totals still bound them.

Eleven issues went upstream to the XRPLF repositories; five are resolved so far. The write-up's claims cite rows of a public claims register, and the register keeps its own corrections.

I am running the same study on EVM chains. Those results will follow.

A research project on Devnet: not audited, not production-ready.

Write-up: https://nandan.me/writing/amounts-not-relationships/
Demo: https://xrpl-confidential-positions.vercel.app
Code: https://github.com/nandanito/xrpl-confidential-positions

Independent work; not affiliated with Ripple.

#XRPL

# Bluesky (single post)

I tested the XRP Ledger's confidential transfers on its test network. They hide balances and the amounts sent between confidential balances. Not who pays whom, when, the amounts in and out, or anything from the issuer. The EVM study is next.

https://nandan.me/writing/amounts-not-relationships/

# Mastodon (single post, content warning "blockchain, privacy analysis")

I tested XLS-96, confidential transfers on the XRP Ledger, on its test network to map what it actually hides. Balances, and the amounts sent between confidential balances. Not who pays whom, when or how often, not the amounts going in and out, and not zero balances in three cases, whose encryption anyone can recompute. The issuer reads every balance. Open source, with a public register of claims and corrections. Same study on EVM next.

https://nandan.me/writing/amounts-not-relationships/

#privacy #cryptography #infosec

# Nostr (single note)

Confidential transfers on the XRP Ledger, XLS-96, are confidentiality from the public, not from the issuer. I ran them on Devnet with a small invoice-finance example to find exactly what they hide: amounts, not relationships.

Hidden from the public: each holder's balance, and the amount of each transfer between confidential balances.

Public: who pays whom, when and how often; every amount moved into or out of confidential form; and some zero balances, which anyone can recompute from public inputs. I matched that fixed encryption of zero byte for byte against live Devnet state.

The token's issuer reads every balance, always, and no setting turns that off. If the token allows clawback, the issuer can destroy a confidential balance, and if it allows locking, freeze one. The issuer can switch either on later, unless it has made that setting unchangeable.

Keys cannot be rotated or recovered, in XLS-96 or, as I write this, on Mainnet, Testnet or Devnet. A draft standard, XLS-99, would add both; those three networks do not know it yet.

I am running the same study on EVM chains. Those results will follow.

A research project on Devnet, not audited and not production-ready. Eleven issues went upstream; five are resolved so far.

Write-up: https://nandan.me/writing/amounts-not-relationships/
Code: https://github.com/nandanito/xrpl-confidential-positions

#XRPL #privacy

# Self-reply with figure 2 (X and Mastodon, optional)

Who can read what, in one table. Anyone sees who pays whom and every amount going in or out. Only the holder's keys can spend a balance. The issuer reads every balance and every transfer amount.
