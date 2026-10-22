# What "confidential" actually means here

- **Date:** 2026-09-02
- **Audience:** anyone deciding whether XLS-96 does what they need
- **Devnet only.** No mainnet writes, at any phase, for any reason.

This document answers one question, in plain English: **if the amount is
published every time value enters and leaves confidential form, what is
confidential about a confidential position?**

It is a fair challenge, and the honest answer is that the name promises more
than the protocol delivers. Nothing here is a complaint about the design — the
boundary is public for a good reason, given below.

---

## The short answer

**Your balance while you hold it, and the amount of each transfer between
holders. Nothing else.**

Confidential **while it circulates** — not confidential end to end.

---

## The analogy

Picture a **shared vault with a public scale at the door.**

| what happens | who can see it |
|---|---|
| You carry money **in** and it is weighed at the door | ⚠ **Everyone.** The weight is called out and written down |
| You carry money **out**, weighed again | ⚠ **Everyone**, and **each trip separately** — not just your total for the day |
| A public display shows the **total** currently inside the vault | ⚠ **Everyone** |
| Inside, your money sits in an **opaque bag** | Hidden. Nobody can see how much is in your bag |
| You hand some to another bag-holder, inside the vault | Hidden. The **amount** is not visible |
| **Who** walked up to the vault, **when**, and **how often** | ⚠ **Everyone.** Cameras at the door, always on |
| The **vault operator** holds a master key to every bag | ⚠ **Reads everything, always. No setting turns this off** |
| A bag that has **never been used** | ⚠ **Visibly empty.** It has a distinctive look nobody can fake |
| A bag you have **spent down** to empty | Looks like any other bag |

**What is hidden is the distribution inside the vault. What is public is the
perimeter, the total, and the traffic.**

---

## The same thing in the real system

| the analogy | the protocol |
|---|---|
| weighed at the door, going in | `ConfidentialMPTConvert` — publishes `MPTAmount` in plaintext |
| weighed at the door, going out | `ConfidentialMPTConvertBack` — publishes `MPTAmount`, **on every individual transaction** |
| public display of the total inside | `sfConfidentialOutstandingAmount`, a plaintext field on the issuance |
| the opaque bag | your confidential balance, an ElGamal ciphertext |
| handing money to another bag-holder | `ConfidentialMPTSend` — **the only operation that hides an amount** |
| cameras at the door | sender, receiver and timestamp of every transaction, public forever |
| the vault operator's master key | the issuer's mandatory decryption mirror (`CLAIMS.md` **P-9**) |
| the visibly empty bag | the canonical encrypted zero (**F-1**) |

---

## Why the door has to be public

This is not an oversight, and it is worth understanding before judging the design.

A public ledger has to prove that **nobody minted value inside the vault**. It
does that by keeping the running total in the clear and checking that every
crossing changes that total by exactly the declared amount. **Hiding the
crossings too would mean proving supply conservation without being able to read
any of the numbers** — far heavier machinery than this protocol uses.

`Convert` and `ConvertBack` are the mint-and-burn boundary. **Boundaries are
where the accounting has to be legible.**

---

## What it actually buys you

Take the receivables facility this repository builds.

A bank converts a float into confidential form, then draws down to suppliers
**A**, **B** and **C**. Later they repay, and the facility retires in tranches.

**An outside observer learns:**

- the size of the float, exactly
- that A, B and C each deal with the bank, and on which days
- how often each of them transacts
- the size of every retirement tranche
- the total outstanding at any moment

**They do not learn:**

- A's credit limit
- what B drew down last Tuesday
- what C still owes

⚠ **And crucially, A cannot see B's terms.** In receivables finance the
commercially sensitive facts are per-counterparty pricing and exposure, and
those are genuinely hidden. **That is the real product.**

---

## The three limits, stated plainly

**1. The public perimeter constrains the hidden interior — by arithmetic, not by
decryption.**

If a holder converts in 500, receives nothing, and converts back 400, ~~then 100
left by transfer~~ the other 100 is either still held or has left by confidential
transfer (corrected 2026-10-21, `CLAIMS.md` R-7). Anyone can do that subtraction. No key required. The public
edges and totals **bound** the hidden values, and in a small enough system they
pin them exactly.

**2. The exit is granular, not aggregate.**

⚠ **This project got this wrong in its own walkthrough and had to correct it.**
Retiring in tranches publishes **every tranche size**, because the amount is a
plaintext field on each individual `ConvertBack` — not a single netted figure at
the end. Two tranches on our own Devnet ledger read **95** and **191**, legible
to anyone (`CLAIMS.md` **F-24**).

**3. The issuer reads everything, always.**

The decryption mirror is mandatory and no configuration removes it. ⚠ **So this
is confidentiality from the public, never from the counterparty with the most
reason to look** (**P-9**).

---

## The sentence to use

> **It hides the shape of the book, not the size of the book.**

That is real, and it is a good deal less than "confidential positions" sounds
like — which is why [`README.md`](../../README.md) states what is **public** as
plainly as what is hidden.

⚠ **If you need the amounts entering and leaving to be private too, this
protocol does not do that**, and no configuration of it will.
