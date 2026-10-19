# REVIEW-046c — adjudication: the custody decision request

- **Date:** 2026-09-13
- **Subject:** `docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md`, reviewed at `b801c7e`
- **Legs:** `REVIEW-046s` (self, written before either external leg was launched), `REVIEW-046a` (Codex, repository plus a complete rippled `3.3.0` clone and the vendored mpt-crypto), `REVIEW-046b` (Gemini, the specification and design documents inline, no code)
- **Method:** every upheld finding was re-verified at source by the adjudicator after the legs returned, including the ones the self leg had already made. Rejections carry the measurement that rejects them.

## RULING

**The request prices the wrong set of credentials.** It treats custody of the float as a question about one key, the Dedicated Account's, holding two separable powers. At source there are more holders of power over the float, and the two powers are not separable, because the key that decrypts is also a required input to every confidential spend.

**All three legs found both halves independently.** The self leg found them by reading code, leg a from code and rippled, and leg b from the specification alone, with no code at all. That is agreement across differed packets, not one reading distributed.

⚠ **The request's recommendation is withdrawn by this round, not replaced.** Three of the premises it argues from are false or incomplete (H1, H2, H3), and a fourth makes the option it defers cheaper than it says (H4). A replacement recommendation written here would be one more unreviewed input. The owner's ruling (B-27) is still the owner's.

**Seven findings do not change the decision's shape but change a sentence or an option's price** (M1–M7). Two are LOW: a search record that does not reproduce and a missing cross-reference (L1, L2).

---

## HIGH — would change the decision or its disclosure

### H1. The issuer can erase the float, and can immobilise it. No option touches either.

**Legs:** s1, a1, b1 (all three).

- **Erase.** `facility/run-facility.ts:323` creates the issuance with `tfMPTCanClawback`. rippled `3.3.0` `ConfidentialMPTClawback.cpp:72` requires the issuer as sender, `:80` requires `lsfMPTCanClawback`, and `:146-179` sets the holder's inbox and spending balances to the canonical encrypted zero and reduces both outstanding totals. The proof uses the issuer's ElGamal secret (`mpt_utility.h:299-305`). The specification says the tokens are *"not credited to any account"* (XLS-0096 at `58ccd30`, line 694).
- **Immobilise.** `ImmutableFlags` defaults to 0 (`MPTokenIssuanceSet.cpp:184-197`), and the facility creates its issuance without any. With `DynamicMPT` enabled on Devnet (checked 2026-09-13), the issuer can set `CanLock` in one transaction and lock in a second (`:142-158`). Nothing restricts enabling `CanLock` while confidential balances exist; `:256-259` restricts only encryption keys. Send and ConvertBack refuse a frozen party (`ConfidentialMPTSend.cpp:246`, `:249`; `ConfidentialMPTConvertBack.cpp:198`). **Read at source, not executed.**

So the bank's signing credential alone can freeze the Dedicated Account's float, and the bank's signing credential plus the issuer's ElGamal secret can destroy it. **Neither needs the Dedicated Account's key or any quorum on it.** Option 2's *"makes 'whoever holds that key can move the whole float' false"* is true of the Dedicated Account's key and silent about the issuer's.

Whether issuer control is a defect is a design question: the bank is issuer and funder, and clawback may be intended. A custody decision that does not name it cannot be ruled correctly.

### H2. The decrypting key is spending authority. Movement is signature AND proof.

**Legs:** s3, a3, b5 (all three). b3 adds the loss consequence.

`mpt_get_confidential_send_proof` takes *"the sender's 32-byte private key"* and proves *"balance ownership"* (`mpt_utility.h:233-269`). The ConvertBack proof's witness is *"(b, rho, priv)"* (`:272-291`). The signer passes `inputs.sk` into `send_proof` (`signer/src/prover.rs:724-733`) and signs the transaction separately afterwards. The specification states it in words: the holder key *"carries exclusive spending authority over the account's confidential balance"* (§5.5, line 130) and *"Possession of the matching secret key is what grants authority to spend the balance"* (§7.1, line 241).

**What is false in the request as a result:**

- *"Movement moves to the quorum; the (now disabled) master seed stays the decryption credential"* (Option 2a), and *"Movement sits with the quorum and decryption with a separate secret"* (2b). Under either, a quorum cannot move the confidential float without whoever holds the ElGamal secret.
- *"power 1 and power 2 are split without giving up the derived key"*. The seed's signing role is removed, and its proof role is not. The seed holder keeps a veto over every movement and full read access.

**What the request does not price:**

- **Availability.** The ElGamal secret must be on hand for every drawdown and retirement. Under 2a that is the disabled master seed itself, so disabling the master does not let the seed go offline.
- **Loss.** A lost ElGamal secret leaves the balance *"effectively locked and irrecoverable"* (§A.6, line 1051). The only protocol action left on it is H1's clawback, which destroys it.
- **What Option 2 buys is stronger than stated.** Movement needs quorum signatures and a proof from the ElGamal holder. If those are held by independent custody domains, a thief needs both.

### H3. The book has more whole-book readers than the request counts.

**Legs:** s2, a2, a4.

- **The issuer's ElGamal secret.** Every Send carries `IssuerEncryptedAmount`, which is the request's own citation `xrpl.rs:1182`, and every `MPToken` carries `sfIssuerEncryptedBalance` (`ConfidentialMPTSend.cpp:318-331`, `:372-390`). The secret reads every amount and every balance in the issuance (P-9), and it cannot be rotated (F-2, P-10). In this facility it is a standalone keypair (`run-facility.ts:346`).
- **The facility book, with no key at all.** `facility/src/book.ts:47-49`: *"Not a confidentiality boundary. It holds every amount in plaintext, on disk, unencrypted. Anyone who can read it knows the whole facility."* `~/.wconf/facility-book.json` holds 25 movements with plaintext `amount`, at mode `0644`, measured 2026-09-13. Any operator keeps a book like it, because decryption needs a bounded search window (TASK ZERO §9, R-5).

**What is false in the request as a result:** *"one key reads the whole book and it cannot be rotated"* — at least two credentials and one file do. Option 5's *"A leak of one seed then reads that partition and no other"* is true of Dedicated Account seeds. It bounds nothing about the issuer's secret or a shared book, which read every partition.

### H4. The request's option set omits two ways to split movement, one of them without a quorum.

**Legs:** a6, b1 (delegation). Consequence of H2.

- **A regular key with `lsfDisableMaster`.** rippled accepts a regular-key signature before it considers a disabled master (`Transactor.cpp:1027-1030`, then `:1039-1042`). Given H2, a regular key and an ElGamal secret held by independent custody domains already require two parties for every confidential movement, with no signer list. *"Splitting power 1 costs signer work on the signing path and a quorum that exceeds every individual weight"* is therefore false as a necessity claim. The signer still refuses master-disabled accounts today (`protocol.rs:198`), so this path needs signer work too. **Its cost relative to multisigning is not established at source.**
- **Delegation, a fourth authorisation path.** `ConfidentialMPTSend`, `ConfidentialMPTConvertBack` and `ConfidentialMPTMergeInbox` are `Delegation::Delegable` (`transactions.macro:1106`, `:1118`, `:1136`); only Convert is not (`:1087`). A `Delegate` object authorises another account to sign in the account's name (`Transactor.cpp:381-408`, `:1011-1012`). `PermissionDelegationV1_1` is enabled on Devnet (2026-09-13). **Nothing in `signer/src` or `facility/src` reads a `Delegate` object.** Any split is incomplete unless it also requires that no delegation grants a movement permission.

---

## MEDIUM — a false or unsupported sentence, or an unpriced cost, that does not change the decision's shape

### M1. *"the seeds are in `/tmp/wconf/state.json` and `~/.wconf/state.json` under `0600`"* is false. (s4, a8)

The Dedicated Account's seed is `.dedicated.seed` in `~/.wconf/facility-state.json`, **mode `0644`**, beside the bank's seed, three supplier seeds and the issuer's ElGamal secret. `run-facility.ts:106-107` creates the directory and writes the file with no mode. The directory is `0700` only because `tools/rebuild-env.sh:159`, a different script, sets it. `facility/src/signer.ts:113-116` also writes the seed into a `profile.json` with no mode, and `stop()` at `:260-268` removes only the socket, so the profile outlives the session. The conclusion survives: Devnet MPT has no value. The sentence does not.

### M2. Option 4 *"by having no key at all"* is overstated. (a5)

The pseudo-account has no key. The pooled assets do have withdrawal authority: `VaultWithdraw.cpp:211-214` says a shareholder is *"indefinitely authorized to withdraw"*, and `:223-226` treats a sole shareholder as owning the whole value. Option 4's custody benefit depends on who holds the shares. It does not change the decision, because Option 4 is rejected on the confidentiality premise.

### M3. Option 3, as written, still accumulates a standing float. (a10)

Repayments route into the Dedicated Account (`facility.ts:445-446`) and are merged into its confidential balance (`:499-503`). To hold no standing float, every repayment must also be converted back, which publishes each repayment size in plaintext as well as each drawdown.

### M4. Option 2's signer work is understated. (a9)

Multisigning needs `sfSigners` (`Transactor.cpp:976-979`), a per-signer preimage, signature collection and ordering, and an owner reserve for the list (`SignerListSet.cpp:316-351`). The current signer emits one `SigningPubKey` and one `TxnSignature` (`session.rs:407-418`, `:456-469`). *"new code on the signing path"* is accurate and incomplete.

### M5. Option 5's machinery and migration are unpriced. (a11)

The facility has one Dedicated Account hard-routed at `facility.ts:439-446`, and the signer is one process per account (`signer.ts:79-85`). Each partition needs its own funding, key registration, signer profile and routing. By H2, moving a partition out needs that partition's signing and proof credentials. After a loss the partition cannot be evacuated; after a leak, evacuation races the thief.

### M6. *"a per-supplier partition would publish exactly the grouping the facility exists to hide"* gives the wrong reason. (a7, partly upheld)

The facility hides amounts and nothing else (`facility.ts:30-34`; P-11), so the grouping is already public. **The conclusion survives by a different mechanism:** a per-supplier partition's own Convert publishes that supplier's allocation in plaintext, which is an amount. Leg a's *"this overprices Option 5"* is rejected for that reason.

### M7. *"power 2, which is the larger of the two exposures"* is a judgement stated as a fact. (b2; a says it could not establish the ranking)

For a bank, loss of principal and disclosure of per-supplier amounts are different classes of harm, and which is larger depends on a threat model the request does not state. Leg b's rhetoric around it is not upheld. The finding is that the weighting belongs to the owner and must be presented as one.

---

## LOW — records

### L1. The recorded P-12 search does not reproduce. (s5, a13, a14)

*"357 files under `docs/reviews/`"* (request line 21, E-117, E-256): the directory holds 204 files, now and at `29f2cb9` (2026-09-09). `grep -rli custod docs/reviews` matches 39 files and 109 lines at both. *"inside two REQUEST documents"*: there are four files, three REQUESTs and one leg, `REVIEW-023b-codex:219`. **All four are P-5 boilerplate, so the conclusion that no review weighed custody holds.**

### L2. The power inventory omits the ledger-source controller. (a12)

A substituted destination or issuer key makes the signer encrypt the amount to the substituter (`signer/src/ledger.rs:212-225`; F-23, executed). The facility restricts reads to loopback, and a same-host adversary is in scope (`facility/src/loopback.ts:26-31`). No custody option changes this. **It needs a cross-reference to F-23, F-28 and B-15 rather than re-pricing.**

---

## REJECTED, with the measurement

| Claim | Leg | Why rejected |
|---|---|---|
| Multisig signing latency lets **incoming transfers** bump `ConfidentialBalanceVersion` and stale a pending proof | b4 | Only the account's own transactions bump its version (`ConfidentialMPTSend.cpp:416` bumps the sender; `ConvertBack.cpp:289`; `MergeInbox.cpp:121`), plus the issuer's clawback (`Clawback.cpp:150`). Incoming Sends change the inbox and bump nothing |
| The issuer has **no lock power** over this issuance, because `tfMPTCanLock` is not set at creation | **s** (the self leg) | ⚠ **Refuted by leg a.** A flag absent at creation is not absent for good: `ImmutableFlags` defaults to 0 and `DynamicMPT` lets the issuer set `CanLock` later (H1). The self leg checked the creation flags and not their mutability |
| Option 5's confidentiality cost is overpriced | a7 | The per-supplier partition's Convert publishes a per-supplier amount (M6) |
| The issuer freezes via `lsfMPTLocked` **today** | b1 | Upheld as a two-transaction power (H1), not as a present state. The lock flag is not set on this issuance now |
| HSM support for EC-ElGamal, permissioned-domain governance | b, *still need to know* | Useful questions for an owner and not defects in the request. The facility has no `sfDomainID` |
| The IPC grant and the human confirmer as custody credentials | a, inventory | Implementation gates, not ledger authority, which the leg itself says |

## CONSEQUENCES OUTSIDE THIS DOCUMENT — named, not fixed in this round

1. **The keygen onboarding's retired-master warning is incomplete under H2.** `signer/src/onboarding.rs:88-101` tells a holder whose master is retired that a derived key would make the seed *"decrypt everything, permanently"*. Under H2 it would also make the retired seed a required input to every confidential spend, so it could not be decommissioned. The warning is not false; it omits availability. The name `AccountSecurity::master_seed_is_not_spending_authority` (`ledger.rs:375`) is accurate for ledger authorisation and incomplete for confidential spending, for the same reason. **A keygen-ruling question, not a custody one.**
2. **Secret-at-rest file modes.** `run-facility.ts:106-107`, `facility/src/book.ts:143-149` and `facility/src/signer.ts:113-116` write seeds, the issuer secret and the plaintext book with no mode, and profiles are not removed on stop. Small code, clear falsifier (a test that `stat`s the files). **Recorded as B-29.**
3. **`ADR-0002`'s custody row (`:96`) is incomplete by H1.** Its left cell names only the Dedicated Account's key. The request's own rule applies: the ADR is updated when B-27 is ruled, not by paraphrase now.

## STOPPING CONDITION

**Round two is owed on the fixes**, under `CLAUDE.md`'s two-round rule, because HIGHs were upheld. It should be scoped to the changed sentences of the request and the register rows that changed with them. **No third round** unless round two finds a further credential or power, which is the class this round existed to find, and found four of.
