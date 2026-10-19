# Session 5 spike — wiring the prover into the signer

**Architecture §6 step 3.** Everything cryptographic here is done by
`signer/`; these files read public ledger state, hand the signer a profile,
drive it over a Unix socket, and submit what it returns. **Nothing in this
directory signs, proves, or holds a proof.**

**Throwaway harness code. Not library code. Do not build on it.** Committed for
the reason `tools/spike-2026-08-17/` and `tools/spike-2026-08-18/` are: under
standing prohibition **P-8**, a value whose generator is unavailable is not
checkable. `xrpl-vectors.json` is the clearest case — it is the evidence
`signer/tests/xrpl_vectors.rs` checks against, and it would be worthless without
the script beside it.

**Devnet only.** Both drivers route through the 2026-08-17 spike's `convert.ts`,
which refuses any `network_id` but 2. **The signer refuses it independently**,
in its own reader, before it reads anything else.

## ⚠ Updated 2026-08-19 — the profile these drivers write is much smaller

Architecture §6 step 2 is built. The drivers no longer read the sequence number,
the balance, the balance ciphertext, `ConfidentialBalanceVersion`, the
registration state, the issuer key, the auditor key, the last-ledger bound or
the destination's `HolderEncryptionKey` and write them into a profile. **The
signer reads every one of them itself**, and a profile that still carries one
**fails to load, by name** — which is how the half-updated version of these
files was caught.

`devnet-clean-account.ts` shows the change most clearly: its two Sends used to
need the balance and version re-read and re-injected between them, because the
first Send moved both. They now take `{}`.

## What each file is

| File | Purpose |
|---|---|
| `xrpl-vectors.ts` | **The generator.** Produces `xrpl-vectors.json` from `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0` and `ripple-address-codec@5.0.1` — three implementations this project did not write. Run bare to **check for drift**; `--write` regenerates |
| `xrpl-vectors.json` | 8 keys (secp256k1 **and** ed25519), 21 field definitions, 4 signed transactions, 7 VL-prefix boundaries. `signer/tests/xrpl_vectors.rs` fails if the Rust encoder disagrees with any of it |
| `devnet-signer-send.ts` | **The objective.** A `ConfidentialMPTSend` built, proved and signed by `signer/`, then submitted. Sends a deliberately false `claimed` block, so the confirmation's honesty is exercised on the real path |
| `devnet-clean-account.ts` | Builds a holder whose **every** confidential transaction comes from `signer/`, so architecture §6 step 4's falsifier can be fired against our own work rather than against a contaminated history |

## The order things run in

```bash
tools/spike-2026-08-18/vendor-verify.sh /tmp/wconf/mpt-crypto
tools/spike-2026-08-18/build.sh
cd signer && cargo test && cd ..          # 181 tests, including every falsifier
cd signer && cargo test --test ledger_devnet -- --ignored && cd ..   # 4, live node

bun tools/spike-step3-2026-08-18/xrpl-vectors.ts        # drift check, no network
bun tools/spike-step3-2026-08-18/devnet-signer-send.ts  # Devnet
bun tools/spike-step3-2026-08-18/devnet-clean-account.ts
bun run tools/observer-harness.ts <clean account> <issuance> --assert-no-r-reuse
```

## ⚠ `--write` is how a wrong encoder gets blessed

Regenerating the vectors makes them agree with whatever the encoder currently
does — which is the opposite of what a vector is for. Regenerate only when the
codec version changes, and say so in the commit.

## ⚠ Two honest limitations of the Devnet drivers

1. **They know the holder's seed** and write it into the profile the signer
   reads. A real deployment would get the key to the signer some other way; a
   throwaway-key spike cannot demonstrate that and does not pretend to.
2. **`--auto-confirm` types `CONFIRM` into the signer's stdin.** That is the
   operator's own script driving the operator's own terminal, and it is still
   not a human reading a confirmation. Run without the flag to confirm by hand,
   which is what the boundary is actually for.

## Why `devnet-clean-account.ts` exists

`observer-harness.ts --assert-no-r-reuse` is architecture §6 step 4's named
falsifier, and `CLAIMS.md` E-76 recorded that it had never been run against
anything this project produced. It could not be — nothing signed.

It also cannot be run usefully against the 2026-08-17 holder, because **that
account's history contains E-63's deliberately broken Sends** — two transactions
that reuse `r` on purpose, to demonstrate the attack. The assertion fires on
them, correctly, and would fire whatever this signer did. A *fail* there says
nothing about our signer, and a *pass* would have been impossible.

So this script builds a clean holder. Setup that is not confidential —
`MPTokenAuthorize`, the issuer's MPT payment, `ConfidentialMPTMergeInbox` — is
done here; every transaction carrying a proof or a blinding factor comes from
`signer/`. Two Sends rather than one, because "no reuse" across a single
transaction is vacuous.

**Result:** `rnU7af8QRAgE2Qp7qeAYJLgeMmmTcbvX81`, ASSERTION PASSED, exit 0
(`CLAIMS.md` E-85).

## What was found by running this

- **F-21 / U-39.** Devnet rejects a transaction carrying `NetworkID` —
  `telNETWORK_ID_MAKES_TX_NON_CANONICAL`. Networks at or below 1024 must omit
  the field. That is not visible from `definitions.json`, which is where a
  signer author building an encoder is looking.
- **E-87.** `SigningPubKey` is a signing field, and adding it after computing
  the digest produces a signature over a serialisation the blob does not
  contain. Found by a test, not by review, and only because that test verifies
  against the **returned blob** rather than the bytes the signer held.

## What this is not

It is not the facility. `ADR-0002` is still `Proposed` and reviewed by nobody,
and architecture §6 step 7 is the Dedicated Account — **never "vault"**. It is
not real key generation either: that is step 6 and still owes issues #10
and #11.

`tesSUCCESS` is not a confidentiality claim. Amounts are hidden; identities,
counterparties, timing and frequency are not, and the issuer decrypts
everything (`CLAIMS.md` P-4, P-9, P-11).
