# REVIEW-016c — adjudication, architecture §6 step 2 (the ledger read path)

**Date:** 2026-08-19. **Two rounds, four legs.** Round one reviewed the
implementation (`016a` Gemini, `016b` Codex); **round two reviewed the fixes**
(`016d` Gemini, `016e` Codex), which is `CLAUDE.md`'s rule and which earned its
place again.

**Verdict: the change stands, with eleven corrections.** One of them was a
defect a round-one *fix* introduced.

---

## 1. What round one found, and the disposition of each

### 1.1 UPHELD — found by **both legs independently**

> `LastLedgerSequence` was read-index + **20**.

Borrowed from `xrpl.js`'s `autofill`, which runs at **submit** time with nothing
between building and submitting. This signer puts a **120-second human
confirmation** in that gap (`store::CONFIRMATION_TIMEOUT_SECS`), and 20 ledgers
is ~60–80 seconds on Devnet. **The window was shorter than the timeout it was
waiting on.** A holder who took ninety seconds got a transaction that had
already expired, and the signer signed it: `tefMAX_LEDGER`, no fee, nothing
recorded, and a client holding a blob that can never be submitted with no reason
given.

**Two changes, and only one of them is the fix.** The window is now 60 ledgers,
*and* `Session::recheck` refuses an expired transaction outright. Widening alone
would make the failure rare rather than detected, which is the distinction this
whole step is built on.

⚠ **The bound is read out of `parsed`** — the bytes that will carry the
signature — not out of a variable the function is holding. That is
`tests/signing_path.rs::the_signature_verifies_over_the_blob_that_carries_it`'s
lesson applied a second time.

*Both legs independently* is the strongest signal available in this project.
`REVIEW-015` recorded the same shape and it was right then too.

### 1.2 UPHELD — one leg each

| Finding | Why it mattered | Fix |
|---|---|---|
| `is_loopback_host` used `starts_with("127.")` | `http://127.attacker.example/` and `http://127.0.0.1@attacker.example/` were accepted as plaintext-loopback. **The plaintext rule exists because of F-23**, so this was a bypass of the mitigation for a confidentiality finding | Strip userinfo (the host is what follows the **last** `@`), strip port, then require `localhost` or a parsed `IpAddr` that `is_loopback()` |
| `network_id` read as `u64`, cast `as u32` | `4294967298` truncates to `2` and walks through a guard this project describes as *"refuses every network but Devnet, at any phase, for any reason"*. Same truncation on ledger index, `Sequence` and `ConfidentialBalanceVersion` — **a truncated `Sequence` is a transaction built for the wrong sequence number** | `u32_field` using `u32::try_from`, refusing rather than truncating |
| *"One pinned numeric ledger index"* was **asked for and never checked** | A node could answer `account_info` from one ledger and `ledger_entry` from another, and the torn read this module exists to prevent would be assembled and labelled with the first index. Entry type, account and issuance identity were unchecked too | `came_from` on every pinned read; `mptoken_is_the_one_asked_for`; `LedgerEntryType` checked against what was requested |
| `signer_lists` read only from `account_data` | rippled `AccountInfo.cpp:230-237` moves it to the **top level** from `apiVersion` 2. Issue #11's third condition would read as **zero, silently**, and the keygen ruling's condition 2 is not cosmetic | Read from both. **And sharper than the leg had it:** rippled assigns the array whether or not a list exists once `signer_lists` was requested, so absent from *both* places is a malformed answer and is now **refused rather than read as zero** |
| Every failure became `REFUSED_LEDGER_UNAVAILABLE`, whose text ends *"Retryable"* | A wrong `network_id` and a plaintext endpoint will never resolve on a retry. `REVIEW-013c` §3a B-VII's finding one level down: a loud refusal rendered as "please try again" | `REFUSED_LEDGER_NOT_USABLE` for permanent conditions, via a `refusal_for` classifier |

### 1.3 REJECTED — and pinned by tests, not by this note

**`CLAIMS.md` E-93's precedent:** a rejected review claim belongs in a test that
fails if someone acts on it later, because a disposition note is a document
nobody re-reads.

**Claim: `RawProfile` lacks `#[serde(deny_unknown_fields)]`.** The Gemini leg
called the module doc that says otherwise *"False"* and built two overclaim
findings on top of it. **The attribute is present, one line above the struct.**
The leg read the struct line and not the one above it.
Pinned by `a_profile_carrying_an_unknown_field_is_refused`.

**This is the fourth time in this project that a leg's diagnosis has been wrong
in a way that would have been expensive to act on.** *A review finding is
evidence, not an instruction.*

**Claim: compare the whole of `AccountSecurity` before signing.** Right in
direction, **too broad in remedy**, and the difference is load-bearing. rippled
`Transactor.cpp:1039-1045`:

```
// Signed with enabled master key.
if (!isMasterDisabled && idAccount == idSigner)  return tesSUCCESS;
// Signed with disabled master key.
if (isMasterDisabled && idAccount == idSigner)   return tefMASTER_DISABLED;
```

A regular key or a signer list does **not** invalidate a master-key signature.
Refusing on them would refuse transactions the ledger applies, for a reason
belonging to **issue #11's keygen question** — a different question about a
different key. Narrowed to `disable_master`. Pinned by
`a_regular_key_or_signer_list_arriving_mid_confirmation_does_not_refuse`.

### 1.4 The case the leg was standing next to and missed

`lsfDisableMaster` **already set** means every blob this signer produces is
answered `tefMASTER_DISABLED` — persistently, not as a race. The daemon printed
a warning about it on startup and signed anyway. That is worse than the drift
case the leg found, and it is now `REFUSED_MASTER_KEY_DISABLED` at preflight,
before any entropy is drawn or any identifier reserved.

### 1.5 A packet defect, not a code defect

The Codex leg could not verify E-101 because the packet supplied E-100, E-102,
E-103, B-15 and F-23 and **omitted the row for the Devnet execution it was being
asked to check**. Fair, and the adjudicator's fault. Recorded so the next packet
carries every row its prose cites.

---

## 2. Round two — which reviewed the fixes, and found a defect one of them made

### 2.1 A defect **introduced by** a round-one fix

`came_from` returned `LedgerError::Malformed`, and `Malformed` classified as a
**permanent misconfiguration**. So a cluster host answering one ledger behind —
which `CLAIMS.md` **E-103** records as the ordinary transient condition of a
public endpoint, observed live — told the client *"Not retryable, an operator
must change something"*, **contradicting `signer/README.md` one file over.**

`Desynchronised` is now its own variant and classifies as retryable.

**This is exactly what the two-round rule exists for.** A fix is a new thing,
and a new thing has been reviewed by nobody.

### 2.2 A hole in a parser the fix introduced

The rewritten `host_of` split on `]` and took what came before, so
`http://[::1` — no closing bracket, not a URL — yielded the host `::1` and was
accepted as loopback. A parser whose job is deciding whether plaintext is safe
does not get to assume a later parser rejects what it waved through.

### 2.3 Coverage gaps and a loose assertion

* The truncation test drove only `network_id`. The other three conversions could
  have regressed to `as u32` with every test still green.
* `mptoken_is_the_one_asked_for` checks account **and issuance**; nothing drove a
  wrong issuance.
* `contains("MPToken")` on a type-mismatch message **passes on
  `MPTokenIssuance`**, because one is a substring of the other. An assertion that
  cannot distinguish the two things it is between is not a check.
* *"Every answer must say it came from the ledger that was asked for"* had an
  unstated exception: the `entryNotFound` path returned without checking. The
  consequence was liveness, not a leak — but the sentence was wrong.

### 2.4 Prose that went false inside the same session

Architecture §6 step 2 said *"nothing branches on them yet"* about issue #11's
three conditions. `disable_master` branches in **two** places by the end of the
same session. Corrected — and the two conditions that genuinely do not branch
are now named as not branching, which is the more useful sentence.

---

## 3. ⚠ And then two of round two's own tests were false passes

Found **only by spot-checking the reverts**, not by reading them:

* `a_not_found_from_the_wrong_ledger_is_refused_too` set the lie globally, so
  the **holder's** read failed first and the assertion could not tell which read
  had objected. It passed with the fix removed.
* `every_u32_the_reader_takes_from_a_node_refuses_to_truncate` made **every**
  field oversized at once, so the `Sequence` case failed on the *version*
  instead. It passed with the Sequence conversion reverted.

Both now isolate exactly one dishonest answer, and both were re-verified against
three separate reverts. `CLAIMS.md` **E-108**.

**The lesson is the one this project keeps paying for**, in a new place: the code
written to make a claim falsifiable is not exempt from the scrutiny the claim
gets, and *"I wrote a test"* is not evidence until the test has been seen to
fail.

---

## 4. Verification

* **All twelve fixes spot-checked by reverting them.** Every test fails; every
  control passes. Three of the reverts had to be redone because the first
  attempt did not compile — a revert that does not build proves nothing, and
  reporting it as a check would have been the same false-pass mode one level up.
* **168 tests, green on five consecutive runs.** `CLAIMS.md` E-98: run it more
  than once.
* **Four live Devnet read tests pass**, including the `entryNotFound` path the
  round-two fix tightened — which is what confirms real rippled carries
  `ledger_index` and `validated` on an error response.
* **A `ConfidentialMPTSend` built from the signer's own read was accepted again**
  after both rounds: `tesSUCCESS`, validated.
* **F-23 was executed** between the rounds and **held** — `tecBAD_PROOF` recorded
  on validated ledger 4603815, the amount recovered from public data by the
  party who supplied the wrong key, the intended destination unable to decrypt.

---

## 5. What this review did NOT settle

* **`CLAIMS.md` B-15 — whether one endpoint is an acceptable ledger source.**
  Both rounds treated it as out of scope and neither leg argued it either way.
  F-23 is now executed, which strengthens the question rather than answering it.
  **It is a ruling, not a code change**, and corroboration across two endpoints
  is cheap under the existing `LedgerSource` trait.
* **`CLAIMS.md` B-14 — the transaction's ECDSA nonce.** Untouched.
* **Whether a third round is owed.** Under `CLAUDE.md`'s rule it is not: a third
  round reviews the fixes to the fixes, and that is where it stops paying. ⚠ The
  exception the rule names is *a fix that introduces new protocol-facing
  behaviour* — `REVIEW-015` was extended to three rounds on exactly that ground.
  **Nothing in round two's fixes changes what goes on the wire**; they change
  what is refused and how it is named. Stopping here is the rule applied, not
  the rule waived.
