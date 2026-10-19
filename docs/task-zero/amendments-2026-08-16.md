# Amendment reading — 2026-08-16

Closes **GAP-1**. Raw snapshot: `amendments-2026-08-16.json`.

Observed **2026-08-16T04:33:01.270Z** via the `feature` RPC — the timestamp inside the JSON,
which is the artifact of record. A separate console run 25 seconds earlier
(`04:32:36.766Z`) returned identical results on all three networks; the reading was taken
twice and agreed.

Amendment state is a reading, not knowledge — re-run `tools/check-amendments.ts` before
publishing anything that rests on this.

---

## The answer: build on standard Devnet

**`ConfidentialTransfer`, `PermissionedDomains` and `SingleAssetVault` are all ENABLED on
standard Devnet** (`wss://s.devnet.rippletest.net:51233`, network_id 2, rippled **3.3.0**).

All three are required together — `MPTokenIssuanceCreate.cpp:31–36` refuses `sfDomainID`
without the latter two (E-19). **The compliance third of the project is not blocked.**
`SingleAssetVault` is present. Nothing needs to be said loudly.

`LendingProtocol` (XLS-66) is also enabled on Devnet, which makes the §9 alternative in
TASK ZERO — native `Vault`/`LoanBroker`/`Loan` objects — testable on the same network.

## Per-network

| Amendment | XLS | Mainnet | Testnet | **Devnet** |
|---|---|---|---|---|
| `ConfidentialTransfer` | 96 | absent | supported, not enabled | **ENABLED** |
| `PermissionedDomains` | 80 | ENABLED | ENABLED | **ENABLED** |
| `SingleAssetVault` | 65 | supported, not enabled | supported, not enabled | **ENABLED** |
| `MPTokensV1` | 33 | ENABLED | ENABLED | ENABLED |
| `MPTokensV2` | 82 | supported, not enabled | absent | absent |
| `DynamicMPT` | 94 | supported, not enabled | supported, not enabled | ENABLED |
| `Credentials` | 70 | ENABLED | ENABLED | ENABLED |
| `PermissionedDEX` | 81 | ENABLED | ENABLED | ENABLED |
| `LendingProtocol` | 66 | supported, not enabled | supported, not enabled | ENABLED |
| `SmartEscrow` | 100 | absent | absent | absent |

Servers: mainnet `s1.ripple.com` (103 amendments known, 93 enabled), testnet and devnet
both rippled 3.3.0 (104 known).

## Mainnet — verified negative, not merely absent

`ConfidentialTransfer` is **not enabled on Mainnet**. This was checked two ways rather than
inferred from a missing name:

1. No entry under amendment ID `2110E4A19966E2EF517C0A8C56A5F35099D7665B0BB89D7B126B30D50B86AAD5`.
2. **Zero** amendments in the mainnet response lack a `name` field — so there is no
   unrecognised-but-enabled amendment that could be it.

The ID independently matches the one recorded in TASK ZERO §1 C-3 from `features.macro`.
Cross-check passed.

## The dedicated "Confidential Devnet" question

TASK ZERO O-1 recorded a dedicated network at `confidential.devnet.rippletest.net` with its
own faucet; `ADDENDUM-2026-08-16.md` §5 recorded the faucet as dead and the canonical
xrpl.org page as naming no dedicated network.

**No dedicated network is needed and none was searched for**, because the condition that
would have triggered the search — none of mainnet/testnet/devnet carrying the amendment —
did not occur. Standard Devnet carries it, enabled, with both companions. TASK ZERO §2's
"Not the general devnet, not testnet, not mainnet" is **superseded**: it is the general
devnet.

This is the simplification the addendum said was plausible and refused to assume. It is now
a reading.

## Tooling change

`tools/check-amendments.ts` had mainnet pointed at `wss://xrplcluster.com`, whose middleware
rejects `feature` with `{"error":"noPermission", "generator":"xrplcluster.com middleware"}`.
The runner reported that as `UNREACHABLE`, which is exactly the failure mode the addendum
warned about — an unreachable host reading like a disabled amendment. Repointed to
`wss://s1.ripple.com:51233`, Ripple's own canonical public server, which answers in full.

The guessed confidential-devnet endpoint remains removed, as instructed.
