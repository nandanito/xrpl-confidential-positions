# spike-step6-2026-08-20 — real key generation and onboarding, executed

Architecture §6 step 6. **Devnet only. Never mainnet, at any phase.**

```
bun tools/spike-step6-2026-08-20/devnet-derived-key.ts --auto-confirm
```

## What it establishes that `cargo test` cannot

1. **rippled accepts a derived key.** The registering `ConfidentialMPTConvert`
   carries `HolderEncryptionKey` and its proof of knowledge, and the ledger
   validates it. A key well-formed only to our own library would fail here.
2. **The key on the ledger is the one an *independent* implementation derives.**
   The signer's key comes from Rust written against
   `REVIEW-012-RULING-keygen-2026-08-18.md` §2. The comparison is made against a
   **TypeScript implementation written from the same prose**, inside this
   script. Agreement between our own two halves would be worth less; agreement
   mediated by a validated ledger entry is the strongest form available here.
3. **ADR-0001 §(e)'s only benefit, executed.** `onboard` is run in recovery
   mode with nothing but the seed, and reproduces the registered key.

⚠ **The profile carries no ElGamal secret.** `elgamal_key_source` is
`derived-from-master-seed`, so this holder has exactly one secret and it is the
seed they already keep. That is the milestone.

## Recorded run — 2026-08-20

| | |
|---|---|
| holder | `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8` (seed type `ed25519`, the live path) |
| issuance | `004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8` |
| registered key | `02B0BD9CB1340B42F14312F7195BCD33A0D976A673F54D6B4F52B9083F3487097C` |
| Convert | `39C7834DD71742B4FEE27D521B4953799B70866443478DF6B7C98901EC8A31D9` |
| MergeInbox | `E9CFB01B1C824DD185A71B628A2F08275BF40B5F26E206981719A970DD1B31F7` |
| Sends | `4CC12BC02494F4C1C47E5C84A382E840554B52CEFCEC75ED39B5F6B5CBF87713`, `65BE2F562ECCC48791306E48A25EA0AAEAD723F65E41E5C69518F56A0E37E461` |
| falsifier | `observer-harness.ts --assert-no-r-reuse` PASSED, 7 transactions, exit 0 |
| amendments | `ConfidentialTransfer`, `PermissionedDomains`, `SingleAssetVault` `ENABLED`, read `2026-08-20T06:17:35Z`. **That reading expires** |

`CLAIMS.md` E-118, E-119.

## ⚠ What it does not establish

* **Not issue #10.** Recovery works *given the derivation*. Whether a holder who
  has their seed and not this repository can reach the derivation is condition 1
  of the keygen ruling, and no script discharges it.
* **Not confidentiality.** `tesSUCCESS` says the ledger accepted a transaction.
  Amounts are hidden; identities, counterparties, timing and frequency are not,
  and the issuer decrypts everything (`CLAIMS.md` P-4, P-9, P-11).
* **Nothing here is secure**, audited, non-custodial or production-ready (P-5).
  Throwaway Devnet accounts. Nothing should ever hold value.

## Rebuilding

`/tmp/wconf/state.json` is not recoverable — it holds throwaway account seeds
that cannot be regenerated. A fresh chain is `bun tools/spike-2026-08-17/convert.ts`
then `send.ts`, after `tools/rebuild-env.sh`.
