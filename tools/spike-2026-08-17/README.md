# Session 3 spike — proof generation and the first Confidential MPT transactions

**Throwaway harness code. Not library code. Do not build on it.** It is committed for the
same reason as `tools/mpt-crypto-bench/`: under standing prohibition **P-8**, a measurement
whose code is unavailable is not a publishable number. The numbers in
`docs/task-zero/DEVNET-CONVERT-2026-08-17.md` and in `CLAIMS.md` E-4, E-5, E-45 to E-56 and F-12 to F-15 come from
these files.

**Caveat found by REVIEW-007 and left standing for the earlier scripts:** `gap8-lending-lifecycle.ts` and `gap8-loan-ops.ts` record engine strings and continue past failure rather than asserting, and they guard `LoanPay`/`LoanManage` behind `if (LOAN)` so those steps silently skip when the loan id is not recovered — which is what happened on the first run. `gap8-reachability.ts` was written with assertions and hash persistence; the earlier ones were not retrofitted, so treat their console output as the evidence it is.

It is deliberately ugly, positional and repetitive. It hardcodes paths under `/tmp/wconf`.
It was written to answer four questions once, and it did. Two files were added afterwards, when writing `docs/reviews/REVIEW-004-REQUEST-2026-08-17.md` exposed claims that had not actually been executed — `npm-e2e-convert.ts` and `post-vault-send.ts`. The second falsified a clause of the session's own reported result.

**Devnet only.** Every script routes through `convert.ts`, which refuses to proceed against
any `network_id` but 2.

## What each file is

| File | Purpose |
|---|---|
| `build-native.sh` | Builds `libmpt-crypto.a` with clang, **bypassing Conan entirely** — which sidesteps F-9. Needs a locally built secp256k1 `v0.7.1` and homebrew `openssl@3` |
| `mptool.c` | Hex-in/hex-out CLI over mpt-crypto: keygen, blinding, encrypt/decrypt, context hashes, convert and send proofs, canonical `EncZero`, Pedersen commitments, homomorphic add/subtract |
| `defs-check.ts` | Verifies `ripple-binary-codec@2.9.0` against a live node's `server_definitions` (E-46) |
| `convert.ts` | Devnet plumbing plus the full setup chain ending in the accepted `ConfidentialMPTConvert` (E-45). Caches state so reruns resume |
| `inspect.ts` | Reads back the holder's `MPToken` and recomputes canonical `EncZero` for the F-1 comparison (E-49) |
| `send.ts` | The Send size measurement (E-4) and the four E-22 falsification checks, in one pass |
| `verify.ts` | Confirms value actually moved, decrypts the issuer mirror (E-52), and settles the `C₁`-sharing question behind E-4 / F-13 |
| `vault.ts` | The GAP-9 experiment (E-50, F-14) |
| `wasm-test.ts` | Cross-validates the locally built WASM module against the native library (E-47) |
| `npm-package-test.ts` | Cross-validates the published `@xrplf/mpt-crypto@0.1.0` against both (E-53) |
| `npm-e2e-convert.ts` | Submits a `ConfidentialMPTConvert` whose every piece of proof material comes from the npm package — the execution that upgraded E-53 from component agreement to end-to-end |
| `npm-decrypt-window.ts` | Confirms the npm-only Convert on-ledger, and measures the wrapper's fixed `range_low` (F-15, U-33) |
| `adj-c1-shared-blinding.ts` | REVIEW-004c §3 — builds Sends with independent per-participant randomness. Shows the prover refuses outright, then swaps ciphertexts after proving to reach the ledger |
| `adj-c1-verify.ts` | The same, with a fresh sequence and local verification against the ciphertexts actually submitted. Produced the `tecBAD_PROOF` result that settled E-4 / F-13 |
| `adj-e22-controlled.ts` | REVIEW-004c §2 — the controlled E-22 rerun: zeros first so every arm proves at the same balance, n=2 per arm, plus the fee probe |
| `adj-metadata-and-fee.ts` | REVIEW-004c §5 — pins the 1219 vs 1225 metadata delta to the destination's `ConfidentialBalanceVersion`, and ladders the confidential fee floor against a standard `AccountSet` |
| `adj-fee-ladder-nonzero.ts` | Completes the fee ladder on the non-zero arm, so check 3's fee dimension is executed both ways |
| `auditor-n4.ts` | Builds an issuance carrying `sfAuditorEncryptionKey` and measures the four-participant case — the measurement that removed the n=3 caveat from E-4 and E-51, and executed the auditor view (E-58) |
| `gap8-lending-lifecycle.ts` | GAP-8 — sets up a lender-owned vault over the confidential-capable issuance and runs VaultWithdraw, LoanBrokerSet, cover deposit/withdraw, the dual-signed LoanSet and VaultClawback |
| `gap8-loan-ops.ts` | Locates the created `Loan` object and runs `LoanPay`, `LoanManage`, `LoanBrokerCoverClawback` |
| `gap8-teardown.ts` | `VaultSet` plus the dependency-ordered teardown — full payoff, `LoanDelete`, `LoanBrokerDelete`, `VaultDelete` — which is what takes coverage from 11/15 to 15/15 |
| `gap8-reachability.ts` | REVIEW-007's objection, closed by experiment — gives the BORROWER a real confidential balance, drains its public balance, and asks whether `LoanPay` can reach the confidential funds. **Asserts on every step and persists transaction hashes**, which the earlier gap8 scripts do not |
| `gap8-final-state.ts` | Confirms no lending participant acquired confidential state and the unrelated holder's balance is untouched |
| `audit-evidence.ts` | Pulls every 64-hex identifier out of `CLAIMS.md` and the session document, queries Devnet for each, and re-derives the load-bearing numbers from ledger state rather than from run logs |
| `post-vault-send.ts` | Settles REVIEW-004 Q2 — spends the confidential balance *after* the vault deposit, which falsified the "stranded" clause of the GAP-9 result (E-50) |

## Prerequisites this cost real time to work out

- **No Conan needed.** `build-native.sh` compiles the nine sources directly. mpt-crypto has no
  build-system-dependent code, so F-9 is a defect but not a blocker.
- **secp256k1 must be `v0.7.1` at commit `1a53f4961f337b4d166c25fce72ef0dc88806618`** — the pin
  in upstream's own `build-wasm.sh`.
- **`mpt_scalar.c` includes secp256k1 internals as `<private/...>`.** `build-native.sh` symlinks
  secp256k1's `src/` under `obj/private/`, exactly as upstream's WASM script does.
- **Building the WASM module needs emsdk 6.0.2, not `latest`** — see `CLAIMS.md` F-12. At 6.0.6
  the upstream script fails at the link; `-sDEFAULT_TO_CXX` on the two `emcc` link lines fixes it.

## What this is not

It is not the observer harness CLAUDE.md requires, and it is not the issuer-view tool
(`tools/issuer-decrypt-balance.ts`). `verify.ts` demonstrates the issuer-view decryption but is
not that tool. Both remain to be written.
