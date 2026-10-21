# Running the demonstration — what it shows, in what order, and what is missing

- **Date:** 2026-08-28
- **Subject:** architecture §6 step 8, the read-only web tier
- **Devnet only.** No mainnet writes, at any phase, for any reason.

⚠ **Read `WEB-TIER-LIMITATIONS-2026-08-28.md` beside this.** This document is
how to run it and what to point at. That one is what it does not establish.

---

## 0. The one thing to keep in view

**It hides the amount of a confidential *transfer*, and balances. It hides nothing else** — and ⚠ **converting in or out publishes the amount in plaintext, every time.** Only a `Send` hides one.

Every screen below exists to make one half of that sentence concrete. If a
viewer leaves believing the ledger hides *who*, *when* or *how often* — or that
a holder is private from the issuer — the demonstration has failed, however
well it ran.

---

## 1. Start it

**Three processes, and only the first is optional.**

```bash
# 0. Once per machine, if /tmp has been cleaned:
tools/rebuild-env.sh

# 1. OPTIONAL — the signer. Only needed for the "Signer" panel on the overview.
#    ⚠ It signs nothing on behalf of the web tier; the tier can only ask its status.
WCONF_SIGNER_SOCKET=/tmp/wconf/websock/signer.sock \
WCONF_SIGNER_PROFILE=/tmp/wconf/b16/profile.json \
WCONF_SIGNER_STORE=/tmp/wconf/websock-store \
  ./signer/target/debug/wconf-signer

# 2. The issuer view — decrypt ONCE, with the CLI, to a file.
#    ⚠ The API never sees this key. Skip this and the issuer page says so.
WCONF_ELGAMAL_SK=<the issuance's ISSUER ElGamal secret, 64 hex> \
  bun run tools/issuer-view-snapshot.ts

# 3. The read-only API. ⚠ NO KEY. It reads the file step 2 wrote.
WCONF_SIGNER_SOCKET=/tmp/wconf/websock/signer.sock \
WCONF_LEDGER_ENDPOINT=https://s.devnet.rippletest.net:51234 \
WCONF_ACCEPT_REMOTE_LEDGER_RISK="I accept CLAIMS.md F-23: a lying ledger source publishes the amount" \
  make web-api

# 4. The browser application.
make web-app        # http://127.0.0.1:3000
```

⚠⚠ **The API holds NO key, and an earlier version did — which was a defect, not
a convenience.** It read `WCONF_ELGAMAL_SK` and decrypted per request behind an
unauthenticated `GET`: **the caller chose the account and received a decrypted
balance.** That is a decryption oracle and it is `ADR-0003`'s own fourth
rotation trigger, missed by the session that wrote it (`CLAIMS.md` **E-212**).

⚠ **The remedy was to remove the capability, not to guard it.** The key lives in
the CLI tool, which decrypts a **curated set** and writes results. **There is no
request that reaches a decryption, so there is nothing to authenticate.**
`argv` is world-readable via `ps`, so there is no `--key` flag on that tool
either.

⚠ **The snapshot is pinned to one validated ledger index and prints it.** Two
`"validated"` reads seconds apart land in different ledgers on a clustered
endpoint, and a discrete-log search runs between each account — so a file
labelled as one snapshot could otherwise combine states that never coexisted
(`CLAIMS.md` E-103, E-215).

⚠ **The API binds to `127.0.0.1` explicitly.** A bare port number forwards no
hostname to `Bun.serve`, whose default is `0.0.0.0` — **measured, and the API
was answering on the LAN** (E-213).

⚠ **The remote endpoint needs the acceptance sentence by name.** Without it the
API refuses **before it connects**, so a misconfigured run cannot tell a remote
host the shape of its reads on the way to failing. With it, the disclosure
prints to stderr and every response carries `underB15Conditions: false`.

**If the API will not start:** check nothing else holds port 3011. The first
default was 3001 and a Docker-hosted Gitea had it — the API died, the dev proxy
forwarded to Gitea, and Gitea answered a login redirect that nothing questioned.
`/api/meta` now carries an identity the browser checks before it renders
anything.

---

## 2. The running order, and why it is this order

### Screen 1 — **Overview**. Set the frame before showing anything.

Point at **What it never claims**. Seven rows, each a citation rather than a
restatement. ⚠ **Read at least P-9 and P-11 aloud.** Everything after this is
easier to misread if the audience has not heard them.

The **Signer** panel says what the tier can and cannot ask. *"`Status` needs no
grant and touches no secret; `Pair` and `Prepare` carry authority and this tier
cannot construct either."*

### Screen 2 — **Capability matrix**. The spine.

Five key sources, three capabilities, every cell with its citation.

**The line worth landing:** the two `derived-from-master-seed` rows carry a
disclosure that is **ruled, not advisory** — the master seed becomes a
**permanent decryption credential**, and the protocol has no rotation and no
recovery, so it cannot be undone. **It reaches the user before the seed is
asked for**, because that is the order the ruling requires.

⚠ **Do not skip the issue #10 note.** The derivation is specified in one
document in this repository and is not a published standard. A holder with their
seed and not this repository **cannot reconstruct their key** — which is the
entire benefit the ruling trades a permanent credential for.

### Screen 3 — **Observer view**. What anyone can read.

Pick **Holder A** from the account list. Then:

1. **The public column first.** Address, counterparties, timing, frequency, the
   plaintext MPT balance, and the issuance's `ConfidentialOutstandingAmount` —
   plaintext, and **the sum of every hidden position**.
2. **`inbox` — publicly known to be exactly zero.** This is the moment worth
   slowing down for. `EncZero` is canonical: anyone recomputes it from the
   holder's public key, the account id and the issuance id, **with no secret at
   all**. The page recomputes it and compares.
3. **`spending` — does not match.** So an observer cannot determine its value.

⚠⚠ **Do not say "so spending is non-zero". It does not follow, and the page
used to say it.** A balance that reached zero **by spending** is a randomised
encryption of zero: it matches nothing and looks exactly like any hidden value.
Only a freshly-initialised, post-merge or post-clawback balance carries the
canonical form. **`CLAIMS.md` E-211 — and Holder B is a live example**, decrypting
to **0** through the issuer mirror while matching nothing publicly.

### Screen 4 — **Issuer view**. The same holder, read.

Same account. The page says the issuer's decryption **succeeded**, and it does
not show the figure.

⚠ **The figure is off the page deliberately, and this screen said *"The number
appears"* until 2026-10-18.** Since 2026-09-05 the tier reports only *whether*
the issuer could decrypt, because an unauthenticated response on loopback hands
the figure to every local process (`CLAIMS.md` E-241). **Show the number from a
terminal beside the browser**, with the issuer key in the environment:

```bash
WCONF_ELGAMAL_SK=<the issuer's ElGamal secret, 64 hex> \
  bun run tools/issuer-decrypt-balance.ts <holder account> <MPTokenIssuanceID>
```

⚠ **Say where the decryption happened: not on this site.** A command-line tool
holds the key and wrote a file; the page reads it. **If a viewer asks whether
the website could decrypt any account they name — it cannot, and that is a
design decision rather than a missing feature.** The page says so.

**That is the whole demonstration of P-9.** The observer page showed an opaque
ciphertext; this page read it with one key the protocol **requires** to exist.
No configuration removes the issuer's mirror.

⚠ **Point at both numbers.** The decrypted confidential balance, from the
terminal, and the public plaintext `MPTAmount`, on the page, are **different
things** — 75 and 750 for Holder A — and a viewer will conflate them if nobody
says so.

⚠ Then run the command for **Holder B**: it decrypts to **0**. Go back to its observer view and
show that the same balance matches nothing publicly. **That contrast is the
sharpest thing in the demonstration** and it is live, not a diagram.

### Screen 5 — **Wallet**. The structural "no".

Three reasons, none of which a wallet API could fix: the operation needs the
viewing key **and** the signing key; the viewing key is derived from the master
seed; a wallet exists **in order not to release seed material**.

⚠ **Do not claim a wallet's codec cannot serialise these transactions.** It was
checked at source and **withdrawn as a premise** (E-206): all three wallets
accept arbitrary transaction types, and none of the three page-side packages
checked on 2026-08-28 names the codec version. **A demonstration resting on it would be falsified by a
release note.** The page says so.

### Screen 6 — **Custody**. Where it lands commercially.

Two findings: a custodied account **cannot derive its own viewing key outside the
platform**, unless the platform runs the derivation inside its own boundary, which
needs the derivation published (issue #10, `REVIEW-059` R1-12); and a policy
engine **holding only public data cannot enforce an amount limit** on an amount
that is a proof. Giving it the ElGamal secret, or trusting the holder's statement
of the amount, each has its cost (`docs/research/CUSTODY-2026-08-28.md`).

⚠ **The generalisation is the useful sentence:** for an engine that holds only
public data, every policy over an **identity**, a **time** or a **count**
survives; every policy over a **value** does not.

Then the flow table — which flows survive, which break, computed rather than
written. And **F-24**: retiring a position in tranches publishes **every tranche
size**, because the amount on each exit transaction is plaintext.

⚠ **Every surface says this mode is a SIMULATION.** No integration, no MPC, no
HSM.

---

## 3. What is missing, stated plainly

Say these when they come up rather than being caught by them.

| missing | why, and where it is recorded |
|---|---|
| **Wallet connect** — the page argues, it does not connect | Deferred on purpose. The three reasons are structural and a connection would only demonstrate the *observer* half. `ADR-0003`, *Deferred deliberately* |
| **A custody signer stub** — flows are computed, nothing signs | Deferred on purpose. A stub that signs is a signing path, and this tier has none. `ADR-0003`, *Deferred deliberately* |
| **A loopback ledger node** | Everything runs against the public Devnet cluster under a **named risk acceptance**. ⚠ Every response carries `underB15Conditions: false`. A previous attempt cost ~2.5 h, 6.9 GB and never synced (E-148) |
| **A live issuer view** — what the page shows is a **snapshot**, not a live read, and it shows no figure (E-241) | Deliberate. A live read means a request that reaches a decryption, which is an oracle (**E-212**). Re-run the tool to refresh; the page prints when it was taken |
| **Any adversarial review of this tier** | ⚠ ~~**Zero rounds have run.**~~ **FOUR ROUNDS HAVE RUN — `REVIEW-036` to `REVIEW-039`, eleven legs, 2026-09-02 to 09-05.** The central claim was **ruled unsound and rewritten**; `ADR-0003` is now `Accepted` at revision 3 (E-230, E-241) |
| **A published keygen derivation** | Issue **#10**, open, and no code closes it. The capability page states the gap |
| **Wallet codec support** | Not determined: none of the three page-side packages checked on 2026-08-28 names the codec version (**E-206**). Deliberately **not** part of the argument |

---

## 4. Two things not to say

⚠ **Do not say the ledger hides identities, timing or frequency.** It does not,
under any configuration, and this is the single most likely thing for a viewer
to walk away believing.

⚠ **Do not say `tapFailHard`.** It is this project's shorthand and **the string
appears zero times in rippled**. The submission parameter is `fail_hard`; the
internal apply flag is `TapFailHard`. It escaped into a public upstream filing
once (E-156). The web tier has a test that fails if it reaches rendered copy —
**a person speaking has no such test.**
