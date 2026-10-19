# Session 3 — proof generation and the first Confidential MPT transactions

**Executed 2026-08-17.** Standard Devnet (`wss://s.devnet.rippletest.net:51233`, `network_id` 2, rippled 3.3.0). Ten confidential transactions plus supporting setup, and a further seventeen during the REVIEW-004 adjudication. This is the first session in the project to generate a zero-knowledge proof and the first to move confidential value.

Everything below marked *executed* is re-queryable on Devnet. Claims land in `CLAIMS.md` E-45 to E-56, F-12 to F-15; friction lands in `UPSTREAM-FEEDBACK.md` U-28 to U-33. **This document was corrected the same day it was written** — see §7; one clause of the GAP-9 result was reported wrongly and is fixed there.

---

## 0. Result in one paragraph

**The objective was met and the two measurements behind it both returned decisive answers.** A `ConfidentialMPTConvert` was accepted on the first submission. The `ConfidentialMPTSend` size conflict (E-4) is settled against the wire: **1210 B at three participants and 1276 B at four, both measured** — our arithmetic was right, and the paper's 1177 describes a wire format rippled does not implement. E-22 was attacked four ways and **survived all four**, which is not the same as being true. GAP-9 closed — and the recorded prediction turned out to hold on one clause of three, which was only established by going back and testing a clause this document had first reported as holding without testing it (§7). The largest surprise was not in any objective: **`@xrplf/mpt-crypto` was published to npm the previous afternoon**, so the binding work this project has been scoping for three sessions no longer exists.

---

## 1. What ran, and how long each part took

| Step | Outcome | Wall clock |
|---|---|---|
| Read context, confirm submit path | `tools/devnet-submit.ts` smoke test green, unchanged | ~10 min |
| Build mpt-crypto natively **without Conan** | `libmpt-crypto.a`, clang, homebrew OpenSSL 3, locally built secp256k1 `v0.7.1` | ~15 min |
| `mptool` — throwaway C CLI over the library | Self-verified: round-trip, two negative controls | ~20 min |
| Build upstream WASM module | **Failed at pinned-version drift**, then built (§5) | ~35 min, mostly unattended |
| Get the Convert accepted | **`tesSUCCESS` on first submission** | ~25 min |
| Send ×3, size + E-22 | Both objectives from one run | ~20 min |
| GAP-9 vault experiment | Closed | ~10 min |
| Nonce reading, npm discovery, write-up | — | ~40 min |

**The blocking step was not proof generation.** It was assembling a build of mpt-crypto at all: no Conan on this machine, and upstream's `conan.lock` is unresolvable from public remotes anyway (F-9, already known). Bypassing Conan entirely — compile the nine sources with clang, link against a locally built secp256k1 and homebrew OpenSSL — took about fifteen minutes and sidesteps F-9 completely. **That is worth knowing: F-9 is a real defect but it is not a blocker, because the library has no build-system-dependent code.**

Once the library existed, the proof API was unambiguous and nothing about it fought back. `mpt_get_convert_proof` worked first time.

## 2. Objective 1 — the Convert. Executed.

Sequence, all `tesSUCCESS`:

1. `MPTokenIssuanceCreate` — `Flags: 0x60` (`CanTransfer | CanClawback`), `TransferFee` omitted so it is zero
2. `MPTokenIssuanceSet` — `Flags: 256` (`tfMPTSetCanHoldConfidentialBalance`) **and** `IssuerEncryptionKey` in the same transaction. Spec §12.6.1 permits this and it works; the briefing's "the issuer needs a second transaction after creation" is right, but it is one transaction, not two
3. `MPTokenAuthorize` — holder opts in
4. `Payment` — issuer gives the holder 1000 public units
5. **`ConfidentialMPTConvert`** — 250 units, with `HolderEncryptionKey`, `HolderEncryptedAmount`, `IssuerEncryptedAmount`, `BlindingFactor` and a 64-byte `ZKProof`

Convert hash `5019EF9754F678CA3F4B564AC1E07144A171D6016D229D5F5BCFBDEB6FAC05BB`, validated. Issuance `00453A78D67EB7E60002C33AAD59E7F544C136A8D30F5D52`.

**Two things were verified rather than assumed.** The codec was checked against the node's `server_definitions` before anything was signed: all five ConfidentialMPT types, all 18 confidential fields, and a full sweep of **all 381 fields** the codec knows — zero mismatches (E-46). And the resulting ledger state was read back and decrypted.

**F-1, executed.** After the Convert, the holder's `sfConfidentialBalanceSpending` is **byte-identical** to the canonical `EncZero` recomputed independently from the holder key, AccountID and MPTokenIssuanceID — all public. F-1 was a source reading; it is now an on-chain measurement (E-49).

**The issuer view, executed.** Given only `sfIssuerEncryptedBalance` and the issuer's ElGamal key, both holders' balances decrypt exactly, matching what each holder reads with their own key (E-52).

## 3. Objective 2 — E-4 settled against the wire

Measured on three accepted `ConfidentialMPTSend` transactions:

| Field | Bytes |
|---|---|
| `SenderEncryptedAmount` | 66 |
| `DestinationEncryptedAmount` | 66 |
| `IssuerEncryptedAmount` | 66 |
| `AmountCommitment` | 33 |
| `BalanceCommitment` | 33 |
| `ZKProof` | 946 |
| **confidential payload, no auditor — measured** | **1210** |
| **confidential payload, with an auditor — measured** | **1276** |
| whole signed transaction blob | 1423 (n=3) · **1492 (n=4)** |
| transaction metadata | 1219 / 1225 (n=3) · **1495 (n=4)** — cap 5200, closes B-9 |

**Every encrypted-amount field carries a full 66-byte ElGamal pair, not a bare 33-byte `C₂`.**

**Both documents were partly right, and the reason is the interesting part.** `C₁` *is* shared: byte-identical across `Sender`, `Destination` and `Issuer` in all three transactions, because one blinding factor `r` encrypts all of them. The paper is describing the cryptography correctly. But §2.1's claim that `C₁` "is transmitted once on-chain" is **not true of rippled 3.3.0** — it is transmitted once per participant. The 99-byte gap is exactly the three redundant 33-byte `C₁` copies at n=4.

**The n=4 case was measured too**, on a second issuance carrying `sfAuditorEncryptionKey`: payload exactly **1276 B**, signed blob 1492 B, metadata 1495 B, `ZKProof` still **946 B** — the proof is invariant in the participant count, as its structure implies. So the paper's 1177 for n=4 is refuted against a direct n=4 reading rather than against a hypothetical, and the 99-byte gap is confirmed as the three redundant `C₁` copies.

E-4 goes B → **A, executed, at both n=3 and n=4**. The discrepancy becomes F-13, and it is deliberately *not* filed yet: it could be an unimplemented optimisation or loose prose, and this session cannot tell which.

**Three parties decrypt the same balance.** On the auditor issuance, holder, issuer and auditor keys each recover the identical plaintext (500). Worth stating alongside P-9 and P-4: this is a confidentiality model with mandatory issuer visibility and optional third-party visibility, and a holder can hide from neither.

## 3a. Two corrections from the review round — metadata and fee

*Added 2026-08-17. Both came out of the REVIEW-004 adjudication experiments, and neither review leg raised either one.*

**Metadata is not a constant, and §3's table was wrong to imply it was.** A structurally identical `ConfidentialMPTSend` writes **1219 B or 1225 B**. The delta is exactly `sfConfidentialBalanceVersion` in the **destination's** `MPToken`: a `UInt32` at field code 69, so a 2-byte header plus 4 bytes = 6 bytes. A destination that has never run `MergeInbox` has version 0 — the default, which is not serialised; after its first merge the field exists and every later transaction's metadata carries it. **Size tracks participant state, not amount.** Still far under `kOversizeMetaDataCap = 5200`. CLAIMS.md E-51 corrected.

**The confidential fee multiplier is 10×, measured.** E-5 had carried "*arithmetic relating constant to result not verified*" since 2026-08-13. Settled by ladder rather than by reading `calculateBaseFee`: on Devnet, where `fee` reports `base_fee = 1`, a `ConfidentialMPTSend` returns `telINSUF_FEE_P` at 1, 5 and 9 drops and `tesSUCCESS` at **10**, on both zero and non-zero arms; a standard `AccountSet` from the same account is accepted at **1 drop**. **The ratio is the durable fact. The "100 drops" everyone quotes is that ratio against a base fee of 10 and must not be published as an absolute.**

## 4. Objective 3 — E-22 survived three falsification attempts

> **REVISED 2026-08-17 after REVIEW-004.** This section originally claimed "four checks" and reported a comparison that was not controlled. Both review legs found it; the corrected version is below and the full adjudication is in `../reviews/REVIEW-004c-adjudication-2026-08-17.md` §2. **Two things were wrong.** The count included validity, which is limb (a) — so it used one claim as evidence for a different one. And the side-by-side compared a non-zero send proved at balance 250 against zero sends proved at 150, with a single control and the fee dimension argued rather than measured.

**Stated as the brief requires: survived, never confirmed.** Three passing checks are not a proof of indistinguishability.

**Limb (a), validity — settled, Grade A, executed.** Zero-amount Sends are accepted and validated. This is *not* one of the indistinguishability checks; it is the separate claim that would have killed §9's recommendation outright had it failed.

**Limb (b), indistinguishability — three checks, all survived, none conclusive.**

| # | Check | Result |
|---|---|---|
| 1 | Two zero Sends, same account, same balance — byte-identical? | **No.** All six observables differ: three ciphertexts, both commitments, the proof |
| 2 | Do the ciphertexts match canonical `EncZero`? | **No**, for either participant |
| 3 | Side-by-side against non-zero Sends, **controlled** | **No asymmetry attributable to the amount** |

Check 3, re-run under control. A zero send does not move the balance, so ordering the zero sends **first** puts every sample at the same balance:

| arm | amount | balance at proving | result | blob | proof | metadata |
|---|---|---|---|---|---|---|
| ZERO #1 | 0 | **80** | `tesSUCCESS` | 1423 | 946 | 1219 |
| ZERO #2 | 0 | **80** | `tesSUCCESS` | 1423 | 946 | 1219 |
| NON-ZERO #1 | 10 | **80** | `tesSUCCESS` | 1423 | 946 | 1219 |
| NON-ZERO #2 | 10 | **80** | `tesSUCCESS` | 1423 | 946 | 1225 |

n=2 per arm, `AffectedNodes` 3 throughout, version +1 throughout, and the *same fields mutated on the same node types*: `ConfidentialBalanceInbox` + `IssuerEncryptedBalance` on the destination, `ConfidentialBalanceSpending` + `ConfidentialBalanceVersion` + `IssuerEncryptedBalance` on the sender.

**The fee threshold is now measured on both arms rather than reasoned about.** A ladder gives `telINSUF_FEE_P` at 1 and 9 drops and `tesSUCCESS` at 10 — **identical for zero and non-zero**. That also measured the confidential fee multiplier at exactly 10× the standard base fee (§3a below).

**The 1219/1225 split is real and is not about the amount.** It is exactly `sfConfidentialBalanceVersion` appearing in the *destination's* `MPToken` once that account has run `MergeInbox` — a `UInt32` at code 69, so a 2-byte header plus 4 bytes of payload. **At matched destination state the two arms are byte-identical.** This corrects E-51, which had claimed a flat 1219 B; see §3a.

**One point that could have gone the other way and did not.** A zero send still mutates the sender's spending ciphertext, because subtracting `Enc(0, r)` changes `C₁`. Had the ledger short-circuited a no-op, "nothing changed" would have been a free distinguisher. It does not.

**What this does and does not do for B-10.** B-10 is not blocked — the outcome that would have killed it, E-22(a) failing, did not happen. But B-10 needs E-22(b), and **E-22(b) cannot be established by this method**. The three checks compare one transaction against another in isolation, and still do after the controlled rerun. They say nothing about traffic analysis over a *sequence*: timing, counterparty graph, `DestinationTag`, or correlation against the issuer's plaintext `ConfidentialOutstandingAmount`. **B-10 stays `PENDING` and must not be upgraded on the strength of E-22 alone.** TASK ZERO §9's cover-traffic recommendation does not fall, and it also does not gain support it has not earned.

## 5. The upstream WASM path — the least-confident claim from Session 1

**It works, and it did not build.** Both halves matter.

`build-wasm.sh` at HEAD (`85dbac7`) **fails at the final link** on emsdk 6.0.6 with seven undefined C++ symbols — `operator new`, `__cxa_throw`, `vtable for std::length_error` and four more. Cause: the link uses `emcc`, but `src/utility/mpt_utility.cpp` is C++. Emscripten's own warning names the fix. At the **CI-pinned emsdk 6.0.2 the same tree builds cleanly**; adding `-sDEFAULT_TO_CXX` to the two link lines makes 6.0.6 work, and nothing else needed changing. Verified on both versions from one source tree → **F-12, U-28**.

Once built, the module is correct and agrees with an independently built native library **bit for bit**: context hashes byte-identical, a WASM-generated proof verifies natively and vice versa, and ElGamal encryption under a fixed blinding factor produces identical bytes (E-47). `_mpt_generate_keypair` is confirmed **not exported**, deliberately and with the reason stated inline (U-32).

## 6. The discovery that changes the plan

**`@xrplf/mpt-crypto@0.1.0` was published to npm at 2026-08-16T15:26:21Z** — hours after Session 2 queried the registry and recorded `Not found` as E-32.

It is a hex-in/hex-out TypeScript API over a vendored WASM build, **zero runtime dependencies**. Installed from npm, it reproduces the context hash of the Convert accepted in §2 **byte for byte**, and a proof it generates verifies under the native library (E-53).

**The JS client path is now three published packages with no patching, no vendoring and no build step:**

```
@xrplf/mpt-crypto@0.1.0  +  ripple-binary-codec@2.9.0  +  ripple-keypairs
```

The only thing missing is ElGamal keypair generation, which is deliberately absent because upstream sources those keys from `ripple-keypairs`.

**This is the third consecutive session in which an ecosystem-gap claim expired inside 24 hours** — U-8, U-9, now E-32. The register's rule about re-checking registries immediately before filing is now evidenced three times and should be treated as binding rather than advisory.

## 7. Objective 4 — GAP-9 closed

Holder A carried **750 public and 150 confidential** units of one issuance. A vault was created over that same issuance and A deposited 700 public units.

- `VaultCreate` → `tesSUCCESS`. Share issuance `Flags: 56` — **E-38 re-confirmed by execution** on a second, independent issuance
- `VaultDeposit` 700 → `tesSUCCESS`, `AssetsTotal "700"` in cleartext, public balance 750 → 50
- **Confidential balance untouched at 150; version unchanged**
- The vault pseudo-account's `MPToken` has **no** `HolderEncryptionKey` and **no** `ConfidentialBalanceSpending`

**The prediction on record held on its first clause, is WRONG on its second, and deviates on the third.** Public deposits normally: yes. **Confidential is stranded: no — this was reported as holding and that was an error, corrected the same day (see below).** *"No error is raised at any point"*: **not quite.** The stranding itself is silent, as predicted — but a follow-up `VaultDeposit` of 100 units, which the holder demonstrably owns in confidential form, returns **`tecINSUFFICIENT_FUNDS` — "Not enough funds available to complete requested transaction."**

**Correction, made while assembling REVIEW-004.** The first version of this section reported "confidential is stranded" as holding. It does not. The measurement supporting it — balance unchanged at 150, version unchanged — shows only that the vault did not *touch* it. Whether it was still *spendable* was never tested, and the prediction's vocabulary was repeated instead. One transaction settles it: after the deposit, the holder sent **50 confidential units** to a second holder, `tesSUCCESS`, sender 150 → 100, destination inbox 100 → 150, public balance untouched. **The confidential balance is outside the vault and invisible to its accounting; it is not stuck.** The narrower claim is the true one, and it makes `tecINSUFFICIENT_FUNDS` the whole of the finding rather than half of it.

**This is reported as a deviation and is not reconciled against the prediction.** It is arguably a sharper result than the prediction: a silent gap is a missing warning, whereas this is a *wrong answer*. The holder owns the units; they are in a form the vault cannot see, and the error names the wrong cause (F-14, U-31). It is the concrete integrator-visible face of F-10 — and it inherits F-10's filing constraint, because F-10's competing reading is still unresolved and GAP-8 is still open.

## 8. Observation task — how mpt-crypto generates sigma-proof nonces

**Reading and measurement only. Nothing was designed, implemented or fixed.**

All four proof modules — `proof_pok_sk.c`, `proof_compact_standard.c`, `proof_compact_clawback.c`, `proof_compact_convertback.c` — call one helper, `generate_deterministic_nonces` (`src/mpt_internal.h:218`).

**1. Deterministic or RNG-sourced?** **Hedged — despite the name.** The structure is HKDF-like:

```
IKM  = "MPT1" ‖ k ‖ witness_len ‖ domain_len ‖ witness ‖ statement_hash ‖ domain
PRK  = HMAC-SHA256(salt, IKM)                      [Extract]
n_i  = HMAC-SHA256(PRK, prev ‖ i [‖ sub_counter])  [Expand]
```

with **`salt` = 32 bytes from `RAND_bytes`**. So the output is RNG-dependent. Each nonce is reduced mod the curve order and retried with an extra counter byte if it lands on zero. The witness is the concatenated secret scalars; `statement_hash` is a SHA-256 over the serialised public statement plus the transaction context; `domain` is a per-proof string (`CMPT_POK_SK_REGISTER`, `CMPT_SEND_SIGMA`, `CMPT_CLAWBACK_SIGMA`, `CMPT_CONVERTBACK_SIGMA`).

**Confirmed by execution, not just reading:** two proofs over an identical statement differ, natively and under WASM.

The 16-byte length-prefix preamble is a response to **TOB-RIPCTXR-10**, documented in place as a brittle-API concern rather than a live exploit, and the header states it is a wire-format-breaking change.

**2. Can a caller influence the nonce?** Only through the proof inputs themselves — witness, statement, domain. **No exported entry point takes a nonce, a seed or an RNG hook**, and there is no global. Randomness comes from OpenSSL's `RAND_bytes` and is not reachable from the API.

**3. What does the WASM build do differently?** The construction is identical — the same C compiles to both targets, and byte-for-byte agreement was verified. The *entropy source* differs: `RAND_bytes` bottoms out in `getentropy`, which Emscripten routes to **`crypto.getRandomValues` in a browser** and **`node:crypto.randomFillSync` under Node**. Both are CSPRNGs, but this is a different trust story from a native `/dev/urandom`, and it is a browser-supplied primitive in the browser case.

**4. Any test asserting distinct nonces across distinct statements?** **No.** `nonce` appears in the test tree only in `test_compact_convertback.c`, and no test compares two proofs generated from identical inputs. Given that nonce reuse in the compact form leaks the witness and is invisible in the proof, the untested property is the one with the worst failure mode (U-30).

**The downsides of a hedged construction, which an earlier draft of this section omitted entirely.** Added 2026-08-17 after REVIEW-004b MEDIUM-04 pointed out that the section described the approach without its costs, which is not what neutral observation looks like:

- **Proofs are not reproducible.** Two runs over an identical statement produce different proofs, so there are no fixed test vectors for the proof bytes themselves and any test must assert verification rather than equality.
- **It requires live entropy at signing time.** That interacts badly with an air-gapped or hardware signer, and with any deterministic-signing story where an auditor wants to re-derive a signature from the witness alone.
- **It moves trust onto the host RNG.** Under WASM that is `crypto.getRandomValues` or Node's CSPRNG (E-55). A degraded or backdoored host RNG weakens a hedged construction in a way it would not weaken a purely deterministic one — which is the mirror image of the argument *for* hedging, and both directions belong on the record.

**None of this is a recommendation either way.** The trade-off is exactly the Cryptography Reviewer's to make.

**Bearing on ADR-0001 §(e), stated as observation.** Upstream's answer to the question §(e) is stuck on is a *hedged* construction — deterministic derivation over witness and statement, plus fresh entropy in the Extract salt — not the pure-deterministic scheme E-34's mitigation line describes. It is length-framed, domain-separated and version-tagged. **This is input for the Cryptography Reviewer, not a design decision, and no signer code was written.** Note separately that upstream sources ElGamal keys from `ripple-keypairs` as a distinct secp256k1 seed — which is *not* ADR-0001 §(e)'s master-seed derivation. That prohibition was observed throughout: the only keys generated this session came from `mpt_generate_keypair`.

## 9. Compound — what should change in the plan

1. **Delete the binding work.** TASK ZERO §11 #1 and #2 are both gone: serialisation shipped on 2026-08-13, the WASM binding shipped on 2026-08-16. What was scoped as *"the largest single item in the project"* is now three `bun add` lines. Re-scope Milestone 1 again — it is no longer "get one transaction accepted", because that is done.
2. **The remaining cost is the Rust signer, and it is much smaller than it was. GAP-11 closed the same day it opened.** `mpt-crypto-sys` and `mpt-crypto` — FFI and safe wrappers — are both published on crates.io at `0.1.0-beta.1` from `XRPLF/xrpl-rust` (E-57). **The signer's FFI substrate is not work this project has to do.** The first refusal was a missing User-Agent on our side, not a policy block; the gap was right to be recorded and closed on a proper retry. **The residual risk is version drift**: both crates are `beta.1` and unrepublished since 2026-06-08 while the C library moved twice. Check the pin before scoping.
3. **The signer is blocked on review, not on engineering.** ADR-0001 §(e) carries an UNANSWERED CRITICAL finding, and §8 above is the best available input to it. **The right next action is a Cryptography Reviewer round, not more building.** Building the signer before that ruling would violate the standing prohibition and waste the work.
4. **Does the eight-week budget survive?** On this evidence, yes, and with more room than before. Two of the three items that made the schedule doubtful — serialisation and proof binding — have evaporated upstream, and the third (getting a transaction accepted) took a day. The budget's exposure is no longer implementation; it is the two review gates that precede implementation, plus GAP-8 and GAP-2, none of which this session touched. **Stated honestly: this session moved the schedule risk from "can we build it" to "can we get the design reviewed", and it did not reduce the second.**
5. **The register's registry rule is now binding.** Three sessions, three ecosystem-gap claims that expired inside a day. Any claim of the form "upstream does not ship X" needs re-verification at filing time, not research time.

## 9a. Evidence audit

*Added 2026-08-17, last act of the session.* This session stated claims that outran their evidence four separate times — three caught by the review legs, one by the adjudication experiments. So the register was audited against the ledger rather than against its own notes: every 64-hex identifier in `CLAIMS.md` and this document was pulled and queried, and the load-bearing numbers re-derived from `account_objects` rather than from the run logs.

- **Both cited transaction hashes are validated `ConfidentialMPTConvert` with `tesSUCCESS`.** The third 64-hex identifier is the vault's ledger index and was correctly identified as not a transaction.
- **All three ledger objects exist**, and the second issuance carries `sfAuditorEncryptionKey` as claimed.
- **F-1 replicated on independent data.** On the auditor issuance — a different issuance, a different holder — the freshly-initialised `sfConfidentialBalanceSpending` is again byte-identical to the independently recomputed canonical `EncZero`. E-49 is no longer a single observation.
- **The three-party decryption replicated at a second balance.** Holder, issuer and auditor keys each returned 475 after a 25-unit Send, having each returned 500 before it. The views track each other through a balance change, which is a stronger statement than agreeing once.
- **E-50 re-confirmed**: on the vaulted issuance the holder still shows a public balance of 50 alongside a live confidential balance, spent down through the adjudication Sends.

**Nothing in the register failed the audit.** That is worth exactly as much as an audit run by the party being audited is worth — which is why the transaction hashes are published: anyone with Devnet access can repeat it.

## 10. What did not run

- **GAP-8** — the remaining thirteen vault and lending transactor paths. Untouched. E-40 and F-10 stay Grade B.
- **GAP-11 (new)** — whether `mpt-crypto-sys` is published on crates.io. The API refused the query with a data-access policy error. **Recorded, not backfilled from a secondary source.**

- ~~**An auditor-configured issuance.**~~ **Done 2026-08-17** — a second issuance carrying `sfAuditorEncryptionKey`, a Convert and a four-participant Send. Payload 1276 B, blob 1492 B, metadata 1495 B, `ZKProof` unchanged at 946 B. This removes the n=3 caveat from E-4 and E-51.
- **`ConfidentialMPTClawback` still never submitted.** `ConvertBack` likewise. Both generators were built and are exported; neither transaction was exercised.
- **No observer harness was built.** §2 and §4 produce the evidence one would need, but the harness CLAUDE.md requires is not written. The spike is evidence, not the deliverable.

---

## Appendix — reproducing this

The spike code is committed at `tools/spike-2026-08-17/` under the same rule as `tools/mpt-crypto-bench/`: a measurement whose code is unavailable is not a publishable number (P-8). It is **throwaway harness code, not library code, and must not be built on.**
