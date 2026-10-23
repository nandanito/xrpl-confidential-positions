<!--
LinkedIn post for "Amounts, not relationships: what confidential transfers on the XRP Ledger
hide" (nandan.me/writing/amounts-not-relationships/), the plan's phase 3 item 2.
Image: attach the blog's card, /images/posts/amounts-not-relationships/linkedin-card.png on the
site (1200×627, figure 1 rendered with `rsvg-convert -w 1200`; the source is
docs/posts/figures/ here). Alt text below.
Tagging: none. Ripple, RippleX and the XRPLF organisation are named in plain text; check a
company page exists before tagging any of them.
Dates: the owner asked for fewer. None is written out. The amendment status (CLAIMS.md P-3
forbids it undated) reads "as I write this", which the post's own timestamp dates; the reading
behind it is E-353's, `check-amendments` on 2026-10-22. Re-run it on the day of posting, and
change the sentence if it moved.
Hook (inside the ~210-character preview): yes, on Devnet, and narrower than the word suggests:
amounts, not relationships.
Audience (REVIEW-063 leg B): banking, payments and digital-asset readers may see issuer
visibility as a requirement rather than a flaw, so the post says both; and they will ask about
auditors, so it says one auditor can read too.
Every claim is from the blog post and its register rows: hidden = balances and Send amounts
(P-4, P-11); public = who, when, how often, conversion amounts, float and tranches, visible zeros
(F-1, F-24, E-146); the issuer and one auditor read every balance (P-9, E-11, E-58); no rotation
or recovery (P-10, E-353), XLS-99 a draft; eleven filings, five resolved, the rest open or closed
without comment (E-353); three outside reviews of upstream's code, one readable (B-13, B-30,
B-31). EVM: the post says only that the same study is running and results will follow.
P-5: not audited, not production-ready. P-7: the authors and Dore & Cenk are credited.
No speed, size or benchmark figures (P-8).

Alt text:
How a confidential token balance moves on the XRP Ledger. Holder A's public balance converts
into confidential form, and the amount is public. Inside, holder A sends to holder B: the amount
is hidden from the public, the sender and receiver are public, and each balance is hidden from
the public unless it is visibly zero. Converting back out to holder B's public balance publishes
the amount again. Public everywhere: who sends to whom, when and how often. The issuer reads
every confidential balance, and no setting turns this off.
-->

Can you move tokens confidentially on the XRP Ledger? Yes, on its Devnet test network. But what it hides is narrower than the word suggests: amounts, not relationships.

XLS-96, the XRP Ledger's standard for confidential transfers, is final. As I write this it is switched on only on Devnet, not on Mainnet or Testnet. I built the core of a receivables facility on it, a bank paying suppliers early against their invoices, and ran it to see exactly what an outside observer can read. That is the business case: how much a supplier draws, and how often, can signal its cash position, which a supplier has every reason to keep to itself. I am running the same study on EVM chains; this is the XRP Ledger half, and the EVM results will follow.

Hidden from the public: each holder's balance, and the amount of each transfer between confidential balances. In the facility, that is each supplier's limit, how much it draws and what it owes.

Public: who pays whom, when and how often. Every amount moved into or out of confidential form, including the size of the float and of each part of it converted back at the end. And some zero balances, which anyone can recognise. So a supplier that starts drawing weekly instead of monthly is visible to everyone, without one amount being known.

The token's issuer can read every balance, always, and so can one auditor if the token names one. No setting turns that off. For an issuer that must answer for its book, that may be the point. For a holder, it is where the privacy ends.

Keys cannot be rotated or recovered, in XLS-96 or, as I write this, on Mainnet, Testnet or Devnet, so key custody has to be right from the first transaction. A draft standard, XLS-99, proposes both.

Where it could, the project ran its claims on the ledger instead of reading the specification, and it says which ones it only read. It keeps a public register of what it may claim and what it got wrong. It filed eleven issues with the XRPLF repositories on GitHub: five are resolved upstream so far, and the rest are open or were closed without comment. None is claimed as new; upstream's code has had three outside reviews, and I could read only one of their reports.

It is a research project on a test network: not audited, not production-ready.

The write-up: https://nandan.me/writing/amounts-not-relationships/
A read-only demo: https://xrpl-confidential-positions.vercel.app
The code and the claims register: https://github.com/nandanito/xrpl-confidential-positions

XLS-96 is the work of Murat Cenk, Aanchal Malhotra, Ayo Akinyele, Peter Chen, Shawn Xie and Yinyi Qian; its send proof builds on Tess Dore and Murat Cenk's compact sigma protocol.

Independent work; not affiliated with Ripple.

#XRPL #DigitalAssets #Tokenization #Privacy
