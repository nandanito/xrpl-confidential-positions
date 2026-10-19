# spike-step7-2026-08-24 — opening architecture §6 step 7

**Throwaway Devnet drivers. Not library code.**

Architecture §6 step 7 is *the facility as application logic*, and three things
stood in front of it. Two were code and are here; the third was a decision and
was **handed over rather than taken** —
`docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md`.

⚠ **Nothing in this directory is the facility.** The Dedicated Account, the
drawdowns, the repayments and the balance tracking do not exist, and B-15's gate
is why. See `CLAIMS.md` B-15.

## `devnet-convert-back.ts`

The walkthrough's **step 9**, which the signer refused by name until 2026-08-24.
A facility whose exit does not exist is not the facility.

Two ConvertBacks against the step 6 holder — the account whose
`HolderEncryptionKey` came from the **ruled derivation**, so the profile carries
no ElGamal secret at all and this script derives the secret independently to read
the balance:

1. a **partial** one, leaving a non-zero confidential remainder;
2. one of the **entire remaining spending balance** — the facility-retirement
   shape, whose range proof is over a remainder of exactly zero.

⚠ **`tesSUCCESS` is not the evidence and is not accepted as it.** All four of
XLS-0096 §10.5's state changes are checked against ledger state before and
after: public `sfMPTAmount` **+exactly** the amount, the issuance's
`sfConfidentialOutstandingAmount` **−exactly** the same, `sfConfidentialBalanceVersion`
+1, and the remaining `sfConfidentialBalanceSpending` **decrypted** to the
expected remainder. A `tesSUCCESS` alone would not distinguish a correct
homomorphic subtraction from a lucky one.

`CLAIMS.md` E-131. Hashes `34117EFE…7ABD7FB0` and `C3436395…F00C209BC`.

## `devnet-ruled-randomness-harness.ts`

**`CLAIMS.md` E-76's other half, executed.** Eight transaction-building
harnesses moved from `mptool blinding` to the ruled derivation in
`tools/wconf-randomness.ts` on the same day.

⚠ **Type-checking does not establish that the migration works**, and it does not
catch the failure the migration most risked: every migrated site had to compute
the transaction **context hash first**, because the derivation binds to it, and a
mis-ordered `const` is a run-time error a transpile waves through. So this builds
one real `ConfidentialMPTSend` **the way a migrated harness now does** and
submits it.

`CLAIMS.md` E-132. Hash `6943D8F0…BC9AA55E`.

⚠ **What it establishes stops there.** It shows a scalar from the ruled
derivation produces a proof rippled accepts. Whether the derivation is *correct*
is what the nine published vectors are for, and `tools/wconf-randomness.ts`
refuses to derive anything until it has reproduced all nine.

## Running them

```
tools/rebuild-env.sh                                   # first, always
cargo build --manifest-path signer/Cargo.toml
bun tools/spike-step7-2026-08-24/devnet-convert-back.ts --auto-confirm
bun tools/spike-step7-2026-08-24/devnet-ruled-randomness-harness.ts
```

⚠ **Both need `/tmp/wconf/state.json`**, which is not reproducible from anything
committed and which the platform has now deleted **twice** (`CLAIMS.md` E-97,
E-133 — the second time mid-session, five days after it was last written).
`rebuild-env.sh` keeps a copy at `~/.wconf/state.json` and restores from it.

⚠ **`devnet-convert-back.ts` spends the balance it finds.** Re-running it against
an emptied account fails at the balance check, which is correct and is not a
build failure.
