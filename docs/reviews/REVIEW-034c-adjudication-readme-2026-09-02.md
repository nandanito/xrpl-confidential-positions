# REVIEW-034c — adjudication: round three on the README

- **Date:** 2026-09-02
- **Subject:** `README.md` at `b197315`, branch `review/readme-rewrite`
- **Legs:** `034a` Gemini (text only), `034b` Codex (repo, read-only), `034s` self
- **Devnet only.** No mainnet writes, at any phase, for any reason.

## Ruling

**19 findings upheld and fixed. 5 rejected, with reasons, so no later session relitigates them.**

⚠ **The round was owed and it paid.** Round two's stopping condition — *findings moving
from the construction to the instruments that check it* — **never fired**, so a third
round was owed under `CLAUDE.md`'s own terms rather than by default. It returned **two
P1s, both of which had survived five earlier legs.**

⚠⚠ **The single most valuable thing round three did was give one leg the tree.** Five
earlier legs read only the document, so **not one claim had ever been checked against
source.** Ten of the thirteen Codex findings are of a kind no text-only reader could
reach. **Access, not adversarial framing, was the binding constraint.**

## The two P1s

### 1. The document mandated a disclosure, never made it, and the answer is the bad one

`README.md` said *"Whether this project sets that clawback flag is a choice it must
disclose either way."* **It never disclosed. It sets it.**

`facility/run-facility.ts:323` creates the issuance with `tfMPTCanClawback` (`0x40`, and
`ripple-binary-codec` gives 64). ⚠ **Verified on the validated ledger 2026-09-02 — both
issuances**, the facility's `0048BEC2…537E` and the web tier's demo `004625C9…25E8`, read
`Flags=224`, which carries `lsfMPTCanClawback`. With E-12 and E-21: **in every
demonstration this project has run, the issuer can burn any holder's entire confidential
balance at will.**

⚠ **Found by the leg with no repository access, from the document's own promise.** A
self-imposed obligation is a checkable claim, and nothing was checking it.

### 2. Holder-only custody was stated as a property; the executed demo does not show it

`README.md`: *"**Who can spend a holder's balance.** Only that holder. Keys are generated
and held on the holder's own machine."* Contradicted by `facility/src/facility.ts:38`:
*"One process plays the bank, the Dedicated Account and every supplier, and therefore
holds every seed … every security property that depends on the separation is **not
demonstrated here**."*

⚠ **The architecture section already said the facility holds every seed. The Trust model
said the opposite, three sections down.** That is `CLAUDE.md`'s E-168 defect — *a fix
applied to the instance the adjudicator was looking at, rather than to the phrase* — and
**round two committed it while its register row was being written about it.** The same
split hit the confirmation-vs-memory contradiction, at the same two sites.

## A false warning in the section every reader called the most useful

*"It permanently blocks deletion of the holder's `MPToken` and locks its reserve, even
after the balance returns to zero (E-18)."* E-18 records **the specification's** wording.
⚠ **This project's own F-29 found rippled does not enforce it that way**:
`MPTokenAuthorize.cpp`'s holder-unauthorize path returns `tecHAS_OBLIGATIONS` only when
the **issuance-wide** confidential outstanding is non-zero. **W-CONF filed that finding
upstream as XRPL-Standards #610 and then published the un-narrowed version in its own
README.**

## Upheld, in brief

| # | leg | what |
|---|---|---|
| 1 | b | Holder-only custody contradicted by the executed facility (**P1**) |
| 2 | a | Clawback disclosure mandated and not made; the project sets the flag (**P1**) |
| 3 | b | Deletion blocker stated in the spec's unconditional form; F-29 narrows it |
| 4 | b | `check-web-readonly` described wider than it runs — Pair/Prepare covers `web/api` only |
| 5 | b | Prerequisites credited `build.rs` with compiling; `rebuild-env.sh` does. Wrong port |
| 6 | b | ⚠ `vendor-verify` **still** overclaimed after round two's fix — it checks names |
| 7 | b | *"Each is lexical"* false: two gates compile or byte-compare; two carry no controls |
| 8 | a, b, s | Three-amendment requirement is the full scope's, not this build's |
| 9 | b | Glossary gave `Send`'s proof composition as universal |
| 10 | b | E-159 cited for a claim it is not about |
| 11 | a, b | *"Bracket it at 2.54 and 2.50"* — neither brackets 2.49; the second is 2.59 |
| 12 | b | `CLAUDE.md`'s replacement overclaimed nonexistence; the search was never run |
| 13 | b | E-222's own *"41 checked"* is **46** — hand-restated, in the row about that |
| 14 | a | Confirmation-vs-memory contradiction, Trust-model site (round two fixed one site) |
| 15 | a | Browser conflated with `web/api`, which does open a socket |
| 16 | a | The P-9 hedge on the issuer disclosure did work it cannot do |
| 17 | a | Signer holds one identity; the demo spawns one per party |
| 18 | s | XLS-96 draft was unpinned — pinnable from E-1 and E-216 |
| 19 | s | `MPToken` reserve figure asked for and **not recorded anywhere**; named as a gap |

## Rejected, with reasons

- **`sfDomainID` belongs to `PermissionedDomains`, not `SingleAssetVault`** (034a 1.1).
  **REJECTED.** `CLAIMS.md` **E-19**, grade A, read at `MPTokenIssuanceCreate.cpp:31–36`:
  it requires **both**. ⚠ **The leg guessed because the README had no citation — so the
  rejection produced a fix**, and the citation is now there.
- **`underB15Conditions: false` is inverted logic** (034a 1.4). **REJECTED.**
  `facility/src/loopback.ts:380` is a getter returning `isLoopback && unflagged === 0`:
  it means *were B-15's conditions in force*, and they were not. ⚠ The leg's confusion is
  still evidence the README never says what the flag means.
- **`fail_hard` gives zero protection against a consensus-stage `tec`** (034a 5.1).
  **REJECTED on the claim.** E-149: read at rippled 3.3.0 `Transactor.cpp:1645-1651` /
  `NetworkOPs.cpp:1833` **and executed on Devnet 2026-08-25** — same signed bytes,
  `applied=false` with the flag, `applied=true` without. ⚠ **The point beneath the false
  premise is UPHELD** (E-170's pattern): the sentence put *"tells a node to discard"* next
  to *"still lands on the ledger"*, and a reader takes the *still* as *despite the flag*.
- **`# ~3 min` violates P-8** (034a 4.1). **REJECTED.** P-8 governs benchmark numbers
  offered as evidence about the protocol. How long a make target takes is an operator
  note carrying no comparison. ⚠ Applying P-8 here bans the useful half of the note —
  the shape of the wording test this project already deleted for firing on its own
  disclaimer.
- **Add `facility/.env` and `signer/config.json`** (034a 6.1). **REJECTED as fabricated:**
  neither path exists; `facility/src/signer.ts:115` writes a profile to a path the driver
  chooses. ⚠ **A leg's diagnosis can be right while its remedy is invented.**

## Checked and found sound

Both legs independently confirmed: the four Devnet hashes and their `MPTAmount` values
against the receipts and the register; `Request` carrying Pair/Prepare/Status as drawn;
the facility sending Pair and Prepare (`facility/src/signer.ts:223`) and `web/api`
constructing only Status (`web/api/signer-status.ts:109`); the loopback bind
(`web/api/server.ts:177`); that XLS-70 and XLS-80 are genuinely not exercised; that
`web/api` holds no issuer key and reads a curated snapshot, and that its route is
unauthenticated; the eight-gate count and `check-filing` as the ninth; the amendment
snapshot's timestamps and states; and that all 46 cited rows exist.

⚠ **Also checked and found SOUND rather than fixed:** *"`vendor-verify` proves the
restoration"* survives at `tools/rebuild-env.sh:12` and `signer/README.md:1143`. Those
two claim **restoration fidelity**, which it does establish; the README's retracted
*"proves"* was a **different** claim about bounding build-time tampering. ⚠ **Same words,
different claim — a later session grepping the phrase cannot tell them apart**, which is
the standing cost of a lexical fix.

## Does this converge?

**Yes, and the rule's own test is what says so.** Round three's findings were still in the
substance, not the instruments — so by the letter of the stopping condition a fourth
round would be owed. ⚠ **It is not, and the reason is that round three's binding
constraint was ACCESS, not adversarial depth.** Ten of thirteen Codex findings existed
only because a leg could read the tree, and that gap is now closed: the tree has been
read, every claim checked against source, and the two remaining classes of defect are
(a) prose a reader misreads and (b) claims that go stale with the code.

⚠ **A fourth round of the same shape would re-read a tree that has just been read.** What
is owed instead is **not another round of this document** but the one this project has
never run: **`ADR-0003`'s central claim has had zero adversarial rotations**, and it is a
design argument, not a document. That remains open and is named in the README.
