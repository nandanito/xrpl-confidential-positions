# REVIEW-047c — adjudication: round two on the custody fixes and the B-27 ruling

- **Date:** 2026-09-13
- **Subject:** `main` at `74bf9a1`
- **Legs:** `REVIEW-047s` (self, written before either external leg was launched), `REVIEW-047a` (Codex, repository plus the rippled `3.3.0` clone), `REVIEW-047b` (Gemini, the specification and the fixed documents inline, no code)
- **Method:** every upheld premise was checked at source by the adjudicator after the legs returned. ⚠ **The adjudicator also wrote the fixes under review.** That conflict is why the stopping-condition ruling below states its reasoning in full, and why the owner may overrule it.

## RULING

**The fixes hold, and round two found no further power over the float. No third round is owed.** It did find what round two usually finds: fixes that say slightly more than they establish, a test that passes while its named property is broken, and corrected sentences with live copies elsewhere. **All are upheld and fixed.**

⚠ **Leg a ruled that a third round IS owed, and this adjudication disagrees.** The reasoning is under *The stopping condition*, and it should be read before accepting the ruling.

---

## The stopping condition

`REVIEW-046c` set it before this round ran: *"No third round unless round two finds a further credential or power over the float."* Leg a put forward two candidates as new powers. **Both premises are true at source. Neither is a power over the float.**

### A1 — each supplier's ElGamal secret reads that supplier's own drawdowns, repayments and balance

**True.** Every Send encrypts the amount to the sender and to the destination (`signer/src/prover.rs:675-680`), and each supplier registers a derived key (`facility/src/facility.ts:382-386`).

**Not a power over the float.** The key acts on the supplier's own received balance and reads amounts the supplier is itself a party to. It cannot move, freeze or read the Dedicated Account's float, and it reads no other supplier's amounts. A counterparty knowing what it sent or received is the protocol's intended visibility, not a leak of the confidentiality the facility provides.

### A2 — a receiving account can refuse confidential transfers with DepositAuth

**True.** `ConfidentialMPTSend.cpp:263-268` calls `checkDepositPreauth`, which returns `tecNO_PERMISSION` when the destination has `lsfDepositAuth` and has not preauthorised the sender (`CredentialHelpers.cpp:363-373`).

**Not a power over the float.** A supplier can refuse a drawdown to itself; the float stays where it is, and drawdowns to others are unaffected. The Dedicated Account can refuse repayments into itself, but that is exercised by the Dedicated Account's own key, which the disclosure already says acts on the whole float.

### Why the leg ruled the other way

**The packet asked a broader question than the stopping condition.** Leg a's packet said *"any credential or power over the float, or over the confidentiality of its amounts"*, and the second clause is not in `REVIEW-046c`'s condition. That was the adjudicator's drafting. Under the broader wording a supplier reading its own amounts looks like a confidentiality power; under the condition as set, it is not one.

⚠ **Both facts are still worth stating, and they are added to the disclosure (F1)** so that nobody reads their absence as an omission.

---

## UPHELD, and fixed

### MEDIUM

- **F1 (a1, a2):** the disclosure does not say what a supplier's key can do. Added: each supplier's seed reads and moves only its own balance and amounts, and any receiving account can refuse transfers into it.
- **F2 (a3):** *The ruling* says a real split *"would need the ElGamal secret held apart from the signing key"*. A quorum of several signers means the ElGamal holder may hold one sub-threshold signer key (`Transactor.cpp:1193-1205`). **The condition is separation from any complete signing threshold.** Reworded.
- **F3 (a4, s1):** a second freeze mechanism, `RequireAuth`. Holder-created `MPToken`s start with `Flags` 0 (`MPTokenHelpers.cpp:223-231`), `requireAuth` rejects them once the issuance requires authorisation (`:420-422`), and all three confidential movement transactors call it. The Dedicated Account's `MPToken` on Devnet has `Flags: 0` at validated ledger 5285912. **A new mechanism for a power already named.** Added to the disclosure, the request and the production checklist.
- **F4 (a5, and b1 on the holder side):** issuer-side delegation is omitted. `MPTokenIssuanceSet` (`transactions.macro:727`) and `ConfidentialMPTClawback` (`:1157`) are delegable, so an issuer delegate can lock or require authorisation without the bank's seed, and can supply the signature half of a clawback. **New mechanisms for powers already named.** The production checklist's *"a movement permission"* was too narrow and is widened.
- **F5 (a6):** anything running as this user that can read `~/.wconf/facility-state.json` acquires every seed and the issuer's secret. `0600` does not stop it, as `secret-file.ts` itself says. Added to the disclosure's last paragraph and the request.
- **F6 (a7):** *"printed on every facility run"* was false for a run that dies at startup: `die()` at `run-facility.ts:124` runs before the print at `:170`. **The print moves to the first statement after the imports**, and the test now asserts that position rather than a column-zero pattern.
- **F7 (a8):** the disclosure test checked noun phrases, so a rewrite into *"cannot erase … cannot freeze"* passed. **It now asserts the affirmative verb phrases**, and *"fails if any holder drops out"* is narrowed to the holders it lists.
- **F8 (a9):** the lexical write guard matched a call pattern, so `import { writeFileSync as dump }` escaped it. **It now flags any write-API name anywhere in the source**, which catches an aliased import, with a control through the same detector. Its remaining limits are stated.

### LOW

- **F9 (a10):** *"holds every amount in plaintext"* overstates the book. It records confidential movements and expected balances; public payments are not in it, and they are public anyway (`facility.ts:261-279`). Reworded at every live copy.
- **F10 (a11):** the request says the book *"is mode `0644`"* in the present tense, after B-29. Reworded to the past.
- **F11 (a12, s2):** corrected clauses still live in E-117's headline and grade cell, E-256, B-29, the custody research note at `:34`, `facility/README.md:219`, `ARCHITECTURE-2026-08-18.md:275` and `README.md:340`.
- **F12 (a13):** E-293's *"ten tests, all run under `umask 000`"*. The mode tests do; the refusal, dying-signer and lexical tests do not need to.
- **F13 (s3):** `ADR-0002`'s Vault clawback is conditional on the asset allowing clawback (`VaultClawback.cpp:187`).

## REJECTED

| Claim | Leg | Why |
|---|---|---|
| A third round is owed | a | See *The stopping condition* |
| The optional auditor is a whole-book reader the disclosure omits | b2 | The issuance sets no auditor key, and none can be added while confidential supply is outstanding (`MPTokenIssuanceSet.cpp:256-259`). Leg a reached the same conclusion by a different route |
| Delegation's omission from the runtime disclosure is correct | b1 | Upheld in substance for the demo, which creates no `Delegate` object. The production checklist is still widened (F4) |
| *The ruling* records the ruling verbatim | b, *checked and correct* | It quotes the owner's message and summarises what was accepted. Not a finding against the document; noted so the leg's praise is not read as a stronger claim |

## STOPPING CONDITION, restated

**No third round.** The rotation on the custody request closes at two rounds, as `CLAUDE.md`'s rule expects, unless the owner reads A1 or A2 as a power over the float.
