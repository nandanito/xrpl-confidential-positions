# REVIEW-047a — Codex leg: round two on the custody fixes, against source

- **Date:** 2026-09-13
- **Leg:** Codex (`codex exec --sandbox read-only`), repository at `74bf9a1`, the rippled `3.3.0` clone from round one (`00a178f`) and the vendored mpt-crypto. No network. Ran 20:41:55 to 21:01:09.
- **Packet:** `docs/reviews/REVIEW-047-packets/packet-a-fixes-against-source.md`

> **RECORDED VERBATIM. Adjudicated in `REVIEW-047c`**, which disagrees with this leg's stopping-condition conclusion and says why.

---

## FINDINGS, most severe first

1. [HIGH] [new power] `"Who can act on this facility's float"` — `facility/src/custody.ts:23`; the *Who else* list likewise claims to enumerate other holders at `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:47-57` — every enrolled supplier has a derived `HolderEncryptionKey` (`facility/src/facility.ts:382-386`, `:425-435`), and each Send encrypts the amount to both sender and destination: `"Participant { pubkey: inputs.destination_pk, ciphertext: self.destination_ciphertext }"` at `signer/src/prover.rs:675-680`. Because drawdowns are `"Dedicated Account → supplier"` and repayments `"Supplier → Dedicated Account"` (`facility/src/facility.ts:439-446`), each supplier’s ElGamal secret reads every drawdown, repayment and balance involving that supplier and participates in spending its received balance. The disclosure says only that the demo process holds `"every seed"` at `facility/src/custody.ts:41`; it never names this supplier-local authority. This is a NEW, scope-limited confidentiality/spending power—not a new mechanism for a listed whole-book reader. It does not expose other suppliers or change the ruling’s issuer argument, but under the question’s stated criterion it warrants a third round.

2. [HIGH] [new power] `"Who can act on this facility's float"` — `facility/src/custody.ts:23` — a destination account’s signing authority can enable DepositAuth and veto incoming confidential transfers. `AccountSet` sets `"lsfDepositAuth"` at `rippled-3.3.0/src/libxrpl/tx/transactors/account/AccountSet.cpp:393-403`; every confidential Send calls `checkDepositPreauth` at `rippled-3.3.0/src/libxrpl/tx/transactors/token/ConfidentialMPTSend.cpp:263-268`, which returns `tecNO_PERMISSION` absent preauthorization at `rippled-3.3.0/src/libxrpl/ledger/helpers/CredentialHelpers.cpp:357-375`. Consequently a supplier credential can reject a drawdown and the Dedicated Account credential can reject a repayment, given the routing at `facility/src/facility.ts:439-446`. This is a NEW receiver-side veto power, not merely another way to exercise the already-listed sender-proof veto. It neither reads nor steals funds, but it is omitted from both enumerations and independently meets the stated third-round criterion.

3. [MEDIUM] [overstated] `"a real split of movement would need the ElGamal secret held apart from the signing key"` — `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:16` — the ElGamal secret is indeed required by the Send proof (`mpt-crypto/include/utility/mpt_utility.h:242-269`), but rippled accepts a set of signers whose weights collectively meet quorum (`rippled-3.3.0/src/libxrpl/tx/Transactor.cpp:1193-1205`). The ElGamal holder may also hold one sub-quorum signer key while movement still requires another custody domain. The necessary condition is separation from any party holding a complete signing threshold, not separation from every signing key. This narrows one cost premise; it does not defeat the remaining reasoning that issuer powers remain independent and the present signer co-locates both key types.

4. [MEDIUM] [new mechanism] `"The issuer can immobilise the float ... set CanLock and then lock"` — `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:53`; the disclosure names only locking at `facility/src/custody.ts:30-33` — the bank can also enable `RequireAuth`. The issuance is created without `ImmutableFlags` (`facility/run-facility.ts:325-329`); `tfMPTSetRequireAuth` maps to `lsfMPTRequireAuth` at `rippled-3.3.0/include/xrpl/tx/transactors/token/MPTokenIssuanceSet.h:38-54`, and unset immutability permits it at `rippled-3.3.0/src/libxrpl/tx/transactors/token/MPTokenIssuanceSet.cpp:184-197`. Holder-created MPTokens start with `"sfFlags = 0"` (`rippled-3.3.0/src/libxrpl/ledger/helpers/MPTokenHelpers.cpp:223-231`), while `requireAuth` rejects an unauthorized token at `:419-422`; Send, ConvertBack and Merge invoke that check at `ConfidentialMPTSend.cpp:252-257`, `ConfidentialMPTConvertBack.cpp:201-203`, and `ConfidentialMPTMergeInbox.cpp:72-74`. This is a NEW MECHANISM for the already-named issuer immobilization power, not a new power. It expands the production immutability checklist but does not independently require another round.

5. [MEDIUM] [new mechanism] `"A delegate can sign movements ... Send, ConvertBack and MergeInbox"` — `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:56` — issuer-side delegation is omitted. `MPTokenIssuanceSet` is `"Delegation::Delegable"` at `rippled-3.3.0/include/xrpl/protocol/detail/transactions.macro:723-740`, as is `ConfidentialMPTClawback` at `:1154-1165`; `checkSign` validates the Delegate account rather than the transaction Account at `rippled-3.3.0/src/libxrpl/tx/Transactor.cpp:1008-1013`. An issuer Delegate with `MPTokenIssuanceSet` permission can exercise lock or RequireAuth without the bank’s master seed. A clawback Delegate supplies the signature half but still needs the issuer ElGamal proof—the proof API requires `"The issuer's 32-byte private key"` at `mpt-crypto/include/utility/mpt_utility.h:298-315`. These are NEW MECHANISMS for already-named issuer powers. The ruling’s production check for only `"a movement permission"` at decision request `:17` is therefore too narrow.

6. [MEDIUM] [new mechanism] `"This demo process holds every seed, the issuer's secret and the book"` — `facility/src/custody.ts:41-43` — neither enumeration names `facility-state.json` or the transient signer profiles as acquisition paths. The state schema contains the issuer secret, bank, Dedicated Account and suppliers at `facility/run-facility.ts:97-110`; each profile temporarily contains `"account_seed: profile.accountSeed"` at `facility/src/signer.ts:146-164`. The file-mode fix itself concedes that `"A process running as the same user reads a 0600 file exactly as easily as a 0644 one"` at `facility/src/secret-file.ts:11-14`. These are NEW MECHANISMS for obtaining powers already listed, not new protocol powers. The request discusses the state elsewhere at decision request `:73`, but not in *Who else*, and the runtime disclosure does not identify the same-user reader.

7. [MEDIUM] [false pass] `"It is printed on every facility run"` — `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:14` — is false for failed startup runs. `run-facility.ts` attempts `LoopbackLedger.open` and calls `die(...)` at `facility/run-facility.ts:121-131`; `die` executes `"process.exit(1)"` at `:112-115`. The disclosure is not printed until `:168-170`. The test explicitly concedes: `"an early exit above it would skip it, and nothing here checks that"` at `facility/tests/custody-disclosure.test.ts:51-55`. Its column-zero regex would also accept a print inside an unindented block. The test therefore passes while the named every-run property is already broken.

8. [MEDIUM] [false pass] `"the test that matters is that EVERY holder stays named"` — `facility/tests/custody-disclosure.test.ts:4-7` — the test knows only the six hard-coded entries at `:20-39`; it has no source-derived enumeration. It consequently cannot see findings 1–2. It also `"asserts presence, never absence"` at `:9-11`: changing the text to “the bank cannot erase with a confidential clawback and cannot freeze it” retains the required substrings `"confidential clawback"` and `"freeze it"` and passes. Thus the claim that it `"fails if any holder drops out"` at `facility/src/custody.ts:16-18` and `CLAIMS.md:354` exceeds what the test establishes.

9. [MEDIUM] [false pass] `"every file write in facility/ goes through secret-file.ts"` — `facility/tests/secret-file.test.ts:235` — is guarded by a regex that expressly misses aliases and APIs outside its list (`:208-219`). A committed direct child such as `facility/src/leak.ts` containing `import { writeFileSync as dump } from "node:fs"; dump(path, secret)` is included in `files` but produces no regex match and need not be behaviorally imported. With the original eleven mutation needles untouched, `tools/break-secret-file-modes.py:74-92` can still report `"PASS: all ... mutations applied and caught"` while that unsafe write exists. This invalidates the general maintenance invariant, though the current source scan found no present offender.

10. [MEDIUM] [overstated] `"facility-book.json holds every amount in plaintext"` — `facility/src/custody.ts:36`; also `"holds every amount"` at decision request `:55` — the book’s only movement kinds are convert, send-out, send-in, merge and convert-back (`facility/src/book.ts:54-61`). `payPublicly` returns an amount without recording it (`facility/src/facility.ts:261-279`), and the runner invokes that path at `facility/run-facility.ts:428-429`. The book contains the confidential movement ledger and expected balances, not literally every amount processed by the facility. This overstates rather than understates disclosure risk, so it does not alter the ruling.

11. [MEDIUM] [overstated] ``"`~/.wconf/facility-book.json` is mode `0644`"`` — `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md:55` — survived as an unqualified present-tense assertion after B-29. Current source saves the book through `writeSecretFile` (`facility/src/book.ts:143-148`), which creates a fresh file with `"mode: SECRET_FILE_MODE"` and renames it over the target (`facility/src/secret-file.ts:50-55`), where the mode is `0600` at `:19`. Source supports `0600` after a current-code save; it does not support the request’s current `0644` assertion. I could not inspect the actual home-directory file under the source restrictions.

12. [LOW] [surviving copy] Multiple corrected statements remain live:

   - `"ADR-0002 does not say so"`, followed later by `"this clause is still live"` and `"the custody axis itself remains unreviewed"` — `CLAIMS.md:168` — contradicts the same row’s new `"Discharged 2026-09-13"` clause.
   - `"no review has weighed who holds it"` — `CLAIMS.md:316`.
   - `"Three write sites take the process umask"` — `CLAIMS.md:370` — contradicted by the explicit `0600` write at `facility/src/secret-file.ts:54`.
   - `"the comparison table ... has no row for custody at all"` — `docs/research/CUSTODY-2026-08-28.md:34` — while the row exists at `docs/decisions/ADR-0002-facility-as-application-logic.md:96`; the duplicate at research note `:86` was struck, but this copy was not.
   - `"No answer to who holds the Dedicated Account's key"` — `facility/README.md:219`.
   - `"no review has asked who holds it"` — `docs/architecture/ARCHITECTURE-2026-08-18.md:275`.
   - `"Custody | Live and unreviewed"` — `README.md:340`.

   The ruling is recorded as `"RULED 2026-09-13"` at decision request `:4`. These are record-consistency defects; they do not change protocol behavior.

13. [LOW] [overstated] `"ten tests, all run under umask 000"` — `CLAIMS.md:353` — is not literally true. The refused-start test at `facility/tests/secret-file.test.ts:143-160`, dying-signer test at `:162-180`, and two lexical tests at `:230-240` are not wrapped in either `underUmask` helper. The relevant positive mode tests are wrapped, so this is a record overstatement rather than a demonstrated mode failure.

## POWERS OVER THE FLOAT, from source

   Dedicated Account master family seed — signs transactions moving or retiring the whole float and derives the holder ElGamal secret — drawdown/repayment routing is `"Dedicated Account → supplier"` / `"Supplier → Dedicated Account"` at `facility/src/facility.ts:439-446`; the derived path returns account and ElGamal keypair at `signer/src/holder.rs:499-518` — named in the disclosure? yes

   Dedicated Account ElGamal secret — decrypts every movement for which it is an endpoint and is a required Send/ConvertBack proof witness, hence a veto/loss lock — Send takes `"The sender's 32-byte private key"` at `mpt-crypto/include/utility/mpt_utility.h:231-269`; ConvertBack takes `"The holder's 32-byte private key"` at `:271-296` — named? yes

   Dedicated Account RegularKey, signer-list keys or Delegate key, if configured — supplies the XRPL-signature half; none alone replaces the ElGamal proof — regular/master paths are accepted at `rippled-3.3.0/src/libxrpl/tx/Transactor.cpp:1024-1045`, multisign quorum at `:1048-1205`, Delegate signing at `:1008-1013` — named? no

   Each supplier’s account seed and derived ElGamal secret — reads that supplier’s own encrypted drawdown, repayment and balance; signs/proves movements from its balance — supplier key registration is required at `facility/src/facility.ts:379-386`, and sender/destination are both ciphertext participants at `signer/src/prover.rs:675-680` — named? partly; `"every seed"` is generic at `facility/src/custody.ts:41`, but the supplier and its powers are not stated

   Destination account signing authority — can enable DepositAuth and veto incoming drawdowns or repayments — `"Set lsfDepositAuth"` at `rippled-3.3.0/src/libxrpl/tx/transactors/account/AccountSet.cpp:393-403`; rejection at `CredentialHelpers.cpp:363-373` — named? partly; the Dedicated seed is named, but this receiver-side power and supplier credentials are not

   Issuer account signing authority, including any RegularKey, signer-list threshold or Delegate — enables lock or RequireAuth, locks globally or per holder, supplies the signature half of clawback — flag application at `rippled-3.3.0/src/libxrpl/tx/transactors/token/MPTokenIssuanceSet.cpp:287-308`; delegated IssuanceSet at `include/xrpl/protocol/detail/transactions.macro:723-740` — named? partly; master issuer lock/clawback is named, alternate authorization and RequireAuth are not

   Issuer ElGamal secret — decrypts every issuer mirror and proves confidential clawback — clawback language requires knowledge of `sk_iss` at `mpt-crypto/src/proof_compact_clawback.c:5-14`; rippled verifies the proof against `IssuerEncryptionKey` at `rippled-3.3.0/src/libxrpl/tx/transactors/token/ConfidentialMPTClawback.cpp:107-117` — named? partly; whole-issuance reading is named, clawback proof/veto is not stated in the runtime disclosure

   Facility-book reader — reads recorded confidential movements and expected balances — `"It holds every amount in plaintext, on disk, unencrypted"` is the code’s own overbroad warning at `facility/src/book.ts:47-49`; actual movement kinds are bounded at `:54-61` — named? yes, but overstated

   Facility-state or transient profile reader running as the same OS user — obtains bank, Dedicated and supplier seeds plus issuer ElGamal secret, thereby acquiring their existing powers — state fields at `facility/run-facility.ts:97-110`; profile seed at `facility/src/signer.ts:146-164`; same-user limitation at `facility/src/secret-file.ts:11-14` — named? partly; the process is named, the file-reader mechanism is not

   Signer process or same-process memory observer — sees the plaintext requested amount, account key, ElGamal secret, and ephemeral `r`/`rho` — `HolderProfile` contains both `"account: AccountKey"` and `"elgamal: ElGamalKeypair"` at `signer/src/holder.rs:262-265`; Send material receives `"amount: built.amount()"` and the secret at `signer/src/session.rs:813-824` — named? partly; only the aggregate demo-process statement names it

   Ledger-source controller — supplies destination, issuer and optional auditor keys used to construct ciphertexts — `signer/src/session.rs:819-824` copies snapshot keys directly into Send proof material — named? yes

   Auditor ElGamal secret — would read every amount if configured — source describes it as `"A third party who can also decrypt every amount"` at `signer/src/prover.rs:657-659` — named? no, correctly for the current issuance: `run-facility.ts:355-359` sets only the issuer key. Moreover, a later auditor addition would need an issuer key in the same transaction (`rippled-3.3.0/.../MPTokenIssuanceSet.cpp:119-129`), while resubmitting an already-present issuer key is refused at `:222-233`; I found no current auditor power.

   Any public ledger reader — reads public Payment, Convert and ConvertBack amounts; this is a confidentiality boundary, not a credential or custody power — `"Each ConvertBack publishes its OWN amount in the clear"` at `facility/src/facility.ts:507-514` — named? no; correctly outside the custody-holder list

## CHECKED AND CORRECT

- The Dedicated seed/ElGamal relationship, mandatory proof participation, non-rotation consequence, issuer whole-issuance mirror, confidential clawback, and DynamicMPT lock path all follow from repository, mpt-crypto and rippled source.

- The issuer clawback is correctly described in the request as joint issuer-signature/issuer-ElGamal authority. rippled checks issuer identity and capability at `ConfidentialMPTClawback.cpp:71-85` and verifies the proof at `:107-117`.

- No auditor key is configured, and tag 3.3.0 does not provide a viable later-add path after the issuer key is already installed.

- The current file-mode implementation is sound for its stated POSIX property: directories are chmodded `0700`, a fresh exclusive temporary file is created `0600`, and rename replaces the old inode (`facility/src/secret-file.ts:30-55`). Current facility source contains no file-writing call outside that helper.

- The signer profile is written only after refusal checks (`facility/src/signer.ts:100-146`), deleted after the signer’s socket appears (`:194-203`), and removed again on stop (`:271-280`). The signer loads the profile before binding the socket at `signer/src/main.rs:38-50`, `:81`.

- The file-mode disclosure correctly says `0600` does not protect against another process running as the same user (`facility/src/secret-file.ts:11-14`).

- The ADR’s corrected Vault mechanics are supported: pseudo-accounts have sequence zero, disabled master and DepositAuth (`rippled-3.3.0/src/libxrpl/ledger/helpers/AccountRootHelpers.cpp:585-603`); shareholders retain withdrawal authority (`VaultWithdraw.cpp:211-226`); the asset issuer may claw back a clawback-enabled MPT vault asset (`VaultClawback.cpp:157-194`).

- Except for finding 3’s threshold wording, the accepted recommendation’s stated reasoning follows source. Dedicated-side splitting does not remove the issuer’s independent clawback, lock or RequireAuth powers; the current signer holds both account and ElGamal keys in one `HolderProfile` (`signer/src/holder.rs:262-265`); and the artifact explicitly says `"Devnet throwaways only"` and `"nothing here should ever hold value"` (`facility/src/facility.ts:46-47`). The newly identified powers do not supply a source-based reason to reverse Option 1, though findings 1–2 make its disclosure incomplete.

## WHAT I COULD NOT ESTABLISH

- I did not inspect the prohibited `REVIEW-046*` records as fixes, so I did not independently audit claims phrased specifically as “every holder REVIEW-046 found.”

- I did not execute the tests or falsifier. The falsifier writes tracked source files and restores them with `git checkout`, which conflicts with the required read-only review. Its false-pass modes above follow directly from its control flow.

- I could not establish the current on-disk mode of `~/.wconf/facility-book.json` or `facility-state.json`; those paths are outside the permitted source trees.

- I could not establish current Devnet `Delegate`, RegularKey, SignerList, DepositAuth, or amendment state without network access. The repository creates none of those authorization objects and does not check for them. The DynamicMPT findings are therefore protocol capabilities under the same amendment-enabled premise used by the request’s lock finding.

- The repository remained clean; HEAD was `74bf9a17c570a820be489ea8832664aeb6b60bf9`.
