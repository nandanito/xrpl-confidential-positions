# What the demonstration shows — a reader's walkthrough

- **Date:** 2026-08-28
- **Subject:** architecture §6 step 8, the read-only web tier
- **Audience:** someone evaluating confidential positions on the XRPL who will not read Rust

⚠ **Read the limitations note beside this one before drawing conclusions**: `docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md`. This document says what the demonstration shows; that one says what it does not.

---

## The one-sentence version

**Confidential MPT hides the amount of a confidential *transfer*, and balances. It hides nothing else — and the demonstration is built to make that concrete rather than to be reassuring.** ⚠ **Converting in or out publishes the amount in plaintext, every time**; only a `Send` hides one.

---

## Why there are two programs, not one

Everything that touches a secret lives in a separate binary, `wconf-signer`, which the holder runs on their own machine and which shows them each transaction before it is signed. The web tier you are looking at **never signs and holds no key**.

That split is not a deployment choice. The two programs talk over a **Unix domain socket**, which no browser page can open by any web API — so the path from a compromised page to a spending operation is closed by the transport itself rather than by a permission check. The web tier may ask the signer for its status and nothing else.

⚠ **What this does not buy:** it does not stop a hostile program running as you, on your machine. That adversary is in scope and was never going to be stopped there; the confirmation screen in the signer is what stands in its way.

---

## The five key sources, and why the differences matter

The **capability matrix** is the spine of the demonstration. It answers one question per row: *what can this key source actually do?*

- **A seed-derived key** (generated or pasted) can decrypt its own balance and produce proofs, because the viewing key is **derived from the account's master seed**. One secret to keep.

  ⚠ **The disclosure attached to those rows is ruled, not advisory.** The master seed becomes a **permanent decryption credential**: anyone who ever holds it can decrypt every confidential balance the account has held, past and future. The protocol has **no key rotation and no key recovery**, so this cannot be undone. The demonstration shows that sentence *before* it asks for a seed, because that is the order the ruling requires.

  ⚠ **And the derivation is not a published standard.** It is specified in one document in this repository. A holder with their seed and not this repository **cannot reconstruct their key.** That is an open issue and no code closes it.

- **A standalone key** is an independent viewing key with its own backup. Two secrets to keep. It is the honest option when the master seed has been retired — and it is the row a custody platform lands on.

- **A browser wallet** can do neither, and this is the sharpest thing in the demonstration. A confidential operation needs the viewing key **and** the signing key; the viewing key is derived from the master seed; and a wallet extension exists **in order not to release seed material**. So a page cannot assemble the operation through the wallets examined (Xaman, GemWallet and Crossmark, 2026-08-28). It is not a permission being withheld: they hold nothing they are built to release. A wallet that held the viewing key and produced the proofs itself would close this, and none observed does (`CLAIMS.md` E-330).

- **A custody platform**, simulated, splits in two: it can sign, and it cannot evaluate a policy on an amount it cannot see.

---

## What an observer sees

Point the observer view at any account and issuance. What comes back is what **anyone** can read from public ledger data, with no secret at all:

- the account, and every counterparty it has transacted with;
- every transaction's timing and frequency;
- the public, plaintext token balance;
- the issuance's **`ConfidentialOutstandingAmount`** — plaintext, and the sum of every hidden position;
- the registered encryption key, and a version counter that increments on every state change;
- ⚠ **whether a confidential balance is exactly zero, whenever it is.**

That last one surprises people, so the demonstration computes it rather than asserting it. The encryption of zero is **canonical**: it is derived deterministically from the holder's public key, the account id and the issuance id, so anyone can recompute it and compare. **A zero confidential balance is not hidden.** Run it against a freshly-initialised account and the view says so in the same place it would otherwise say "hidden".

**What is hidden is the list of two items:** the value of a non-zero balance, and the amount moved by a confidential send. That is the whole list.

---

## What the issuer sees

**Everything.**

The issuer's decryption mirror is part of the protocol. No configuration removes it and no key source changes it. The demonstration shows the issuer view beside the observer view for exactly that reason — a walkthrough that shows only what the public cannot see teaches the wrong lesson.

⚠ **A holder is confidential from the public. A holder is never private from the issuer.** If your use case needs the second, this protocol is not it, and no amount of configuration changes that.

---

## Retiring a position

A position is retired by converting back to public tokens. **The amount on each of those transactions is plaintext.** So retiring in tranches publishes **every tranche size** and its timing, even though the balance itself was hidden while held.

This was found in this project's own walkthrough document *after* that document had passed its claims gate, which is why it is stated here in the flow rather than in a footnote.

---

## What the ledger source disclosure means

Every page that reads the ledger shows which node it read, whether that node is on your own machine, and whether the run met the project's own conditions.

⚠ **This matters more than it looks.** A node that lies about a destination's encryption key does not cause a rejected transaction — it causes the amount to be **encrypted to the wrong party and published permanently**. TLS authenticates the channel to a node someone chose; it does not make that node honest. When the demonstration reads a remote endpoint it says so, and says the run is not evidence about the condition it fails.

---

## What to do next

- **Compare the observer view and the issuer view for the same account.** That contrast is the protocol's actual privacy model in two screens.
- **Find a freshly-initialised account** and watch the zero balance be identified as zero.
- **Read the capability matrix's wallet row**, then the custody page. They are the same structural problem seen from two directions: the viewing key has to come from somewhere, and every place you can put it costs something.
