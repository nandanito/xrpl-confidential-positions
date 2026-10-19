# REVIEW-022 — adversarial review packet: architecture §6 step 7, the facility

**Round one. Date 2026-08-25. Devnet-only research artifact.**

You are an adversarial reviewer. **Do not use tools; you have no shell and will
abort if you try.** Everything you need is pasted below, in full — not as a
diff, because a diff bounds you to what the author chose to show you and the
author's choices are the author's blind spots.

## What was built

Architecture §6 **step 7**: a receivables financing facility as application
logic on XLS-0096 Confidential MPTs, plus the loopback rippled node it reads
from and the gate that keeps it honest. The signer (a separate Rust binary,
already built and reviewed over five milestones) generates every proof and signs
every confidential transaction; the facility builds intents and submits blobs.

## The ruling this milestone is built under, and its residual

`CLAIMS.md` **B-15**'s step-7 gate was answered by the project owner on
2026-08-25: **loopback for the facility's ledger reads, plus `tapFailHard` set
by whatever submits — which is NOT the signer.** Neither is enforced by the
signer, so both are obligations on this code. ⚠ **The ruling had no adversarial
review and is not one of REVIEW-019's three options as stated** — it is option A
plus a reading of option C that puts the flag outside the signer. **Nothing
forces a separate submitter to set the flag**, so that half is a convention, not
a property.

## The facts this code is written against (all established, all citable)

* **F-23 — EXECUTED, not reasoned.** A `ConfidentialMPTSend` encrypts the amount
  to the destination's `HolderEncryptionKey` and the issuer's
  `IssuerEncryptionKey`, **both read from the ledger**. A substituted key fails
  the proof with `tecBAD_PROOF`; a `tec` is **applied to the ledger** with every
  ciphertext in it unless the submitter set `tapFailHard`. On 2026-08-19 this was
  run on Devnet and the amount 42 was recovered from public ledger data by the
  party who supplied the wrong key. **TLS does not address it** — a hostile node
  lies just as well over TLS.
* **F-24.** `MPTAmount` is a plaintext field on **every individual**
  `ConfidentialMPTConvert` and `ConfidentialMPTConvertBack`, so retiring a
  facility in tranches publishes **every tranche size**, not just the net
  movement in `sfConfidentialOutstandingAmount`.
* **F-8.** A confidential balance is recovered by a **linear** search over a
  caller-supplied range, with a fixed iteration count (upstream's RIPCTXR-1
  timing mitigation). Tracking the expected balance off-ledger is therefore a
  requirement, not an optimisation.
* **F-1.** The canonical `EncZero` is computable by anyone from public data, so a
  balance equal to it is publicly known to be zero.
* **F-21.** A Devnet transaction must not carry `NetworkID`.
* **P-4, P-9, P-11.** This hides amounts. It does not hide who transacts, with
  whom, when or how often, and the issuer decrypts every balance by
  construction. **P-5**: nothing may be called secure, audited, non-custodial or
  production-ready. **P-8**: no benchmark number without hardware, parameter set
  and methodology. **P-10**: keys cannot be rotated or recovered.
* **REVIEW-016** found two host-parsing bypasses in the SIGNER's loopback check —
  `http://127.attacker.example/` and `http://127.0.0.1@attacker.example/` — and
  round two found a third, `http://[::1` (split on `]`, took what came before).
* **E-103.** Two `"validated"` reads seconds apart landed in different ledgers.
* **E-141.** A sibling gate reported a number that counted the wrong things: it
  counted **files it flagged** rather than call sites, and two of them were not
  call sites at all — the gate itself, and a dead exemption a hardcoded skip was
  masking. **A gate that reports a number is making a claim about what the number
  counts, and nobody checks that claim.**
* **E-145.** `bun build` is **not** a type-check: two files with no import at all
  for a function they called passed it.
* **E-97, E-133.** `/tmp/wconf/state.json` has been lost twice.
* A protocol constraint set the code relies on: an **issuer cannot convert its
  own issuance** into a confidential balance; **registration happens exactly
  once** and is forbidden afterwards; **`TransferFee` must be 0** on a
  confidential issuance; a destination with **no registered key cannot receive**
  (there is no key to encrypt to, so the transaction cannot be *built*).

## What to look for, hardest first

1. **Does anything in `facility/` read the ledger from somewhere that is not a
   loopback literal, on any path — including error paths, retries and the
   faucet?** A single one silently reopens F-23.
2. **Can a transaction be submitted without `fail_hard`?** Any path at all.
3. **Is `isLoopbackEndpoint` correct?** Try to get a non-loopback host past it.
   It uses `URL`. Consider IPv4-mapped IPv6, decimal/octal/hex IPv4 forms,
   trailing dots, unicode, `0x7f.1`, `2130706433`, uppercase, `[::ffff:127.0.0.1]`.
4. **Is the claim `tools/check-loopback.ts` prints TRUE of what it counts?**
   E-141's exact failure mode. Read its output sentence against its code.
5. **Is the balance book's arithmetic right**, and can a movement be recorded for
   a transaction that did not validate?
6. **Are any sentences in the comments, the README or the driver's output
   FALSE** — overclaiming, describing behaviour the code does not have, or
   restating a design rule as a protocol rule (or the reverse)?
7. **Do the tests actually falsify?** Look for tests that would pass against
   broken code, empty `test.each` arrays, assertions that hold in both states.
8. **Anything that would make a confidential amount public.**

## What is deliberately NOT built (do not report as missing)

* No permissioned domain / `sfDomainID`.
* One process plays every role and holds every seed (Devnet throwaways).
* `--auto-confirm` answers the signer's own human confirmation prompt.
* No cover traffic.
* The facility does not generate proofs or draw blinding factors — the signer
  does, under a ruled derivation, and a separate gate
  (`tools/check-blinding-sources.ts`) proves the facility draws none.

## Report format

For each finding: severity (CRITICAL / HIGH / MEDIUM / LOW), the file and the
exact line or sentence, why it is wrong, and what would falsify your claim. **If
you find nothing in a section, say so explicitly.** A clean report is a real
outcome; a padded one is not. Do not propose refactors for taste.

---

# THE FILES, IN FULL

⚠ **The packet sent to both legs contained the COMPLETE TEXT of every file
below — not a diff.** That is `REVIEW-021` round two's structural correction and
it is the reason its Gemini leg produced round two's most valuable finding after
the same leg reported nothing at all on seven questions when it had only a diff.
**Carry the mechanism, not the wording.**

The text is not duplicated here, because it is in the tree at these paths and a
second copy is a second thing to leave stale. What was sent was exactly these
files, at the commit this review was run against:

* `facility/README.md`
* `facility/src/loopback.ts`
* `facility/src/submit.ts`
* `facility/src/book.ts`
* `facility/src/signer.ts`
* `facility/src/facility.ts`
* `facility/src/mptool.ts`
* `facility/src/devnet-accounts.ts`
* `facility/run-facility.ts`
* `facility/tests/hostile-endpoints.ts`
* `facility/tests/loopback.test.ts`
* `facility/tests/submit.test.ts`
* `facility/tests/book.test.ts`
* `facility/tests/facility.test.ts`
* `tools/check-loopback.ts`
* `tools/wconf-keygen.ts`
* `tools/wconf-keygen.test.ts`
* `tools/loopback-node/node.sh`
* `tools/loopback-node/rippled.cfg`
* `tools/loopback-node/validators.txt`
* `tsconfig.json`

Reconstruct with:

```
python3 - <<'EOF'
files = [...]   # the list above
print(open("docs/reviews/REVIEW-022-REQUEST-step7-facility-2026-08-25.md").read().split("# THE FILES, IN FULL")[0])
for f in files:
    print(f"\n## `{f}`\n\n```\n" + open(f).read() + "\n```\n")
EOF
```
