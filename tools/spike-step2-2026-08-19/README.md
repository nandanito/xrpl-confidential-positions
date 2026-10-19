# Step 2 spike — executing `CLAIMS.md` F-23

**Architecture §6 step 2.** Devnet only. Never mainnet, at any phase.

**Throwaway harness code. Not library code. Do not build on it.**

## What is here

| File | Purpose |
|---|---|
| `f23-substituted-key.ts` | **Executes F-23.** Builds a `ConfidentialMPTSend` whose amount is encrypted to an **adversary's** key rather than the destination's registered one, submits it, and then recovers the amount from the **public ledger** using only the adversary's secret |

## Why it exists

F-23 was read at source and asserted a chain nobody had run:

> a Send encrypts the amount to the destination's `HolderEncryptionKey` **read
> from the ledger** → rippled verifies against the key **it** holds → a mismatch
> is `tecBAD_PROOF` → a `tec` is **applied to the ledger** → the ciphertext under
> the adversary's key is published permanently.

`CLAUDE.md`'s rule is that a claim read at source is *"the source says"*, never
*"we saw"*. This makes it *we saw*.

## What it found

**F-23 holds.** Executed 2026-08-19:

```
submit -> tecBAD_PROOF
validated: yes   ledger 4603815
hash 7A283EE5920EBB97AB90F4BC92B4E4E293C6DCE541A9607277D45DA4145AF160

DestinationEncryptedAmount, read back off the validated ledger:
  (byte-identical to what was submitted: true)

  the adversary, holding only the key they supplied: 42
  the intended destination, holding their real key:  could not decrypt
```

The transaction **failed** and is on the ledger anyway, with its ciphertexts.

## ⚠ What this is NOT

**It is not a network attack.** Nothing here compromised a node, a TLS
connection or a ledger. It demonstrates the *consequence* if the value a signer
reads for a destination's encryption key is not the value on the ledger — which
is why `signer/src/ledger.rs` requires TLS for any non-loopback endpoint, why it
re-reads the destination's key before signing, and why `CLAIMS.md` **B-15** asks
whether one endpoint is an acceptable source at all.

**It also is not a confidentiality claim about the scheme.** Amounts are hidden;
identities, counterparties, timing and frequency are not, and the issuer
decrypts every balance (`CLAIMS.md` P-4, P-9, P-11).

## ⚠ The signer cannot produce this transaction

`signer/` reads the destination's key from the ledger and re-reads it before
signing, so it has no path to the transaction this script builds. That is the
point: the script uses `mptool` directly and never touches the signer. If it
ever *can* be produced through the signer, step 2 has regressed.

## Cost

One transaction fee and one sequence number, on a throwaway Devnet account.

```bash
bun tools/spike-step2-2026-08-19/f23-substituted-key.ts [--amount=N]
```

Exit 0 if F-23 reproduced, 1 if it did not — and if it does not, **correct the
finding, not the code.**
