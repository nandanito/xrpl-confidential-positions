# REVIEW-028c — ADJUDICATION: round TWO, the fixes to REVIEW-027

**Date:** 2026-08-27. **Frozen commit reviewed:** `d535589`.
**Leg:** Codex, three targeted passes. **Round two of two.**

---

## 1. What round two found, and it is exactly what round two exists to find

**Not one finding against the construction. Three against the fixes and the
prose describing them.** Eight independent leg-readings across three rounds have
now found no defect in B-21's construction; every single finding this session has
been evidence, a gate, or a sentence.

| # | Finding | Ruling |
|---|---|---|
| 1 | **Round one's fix for E-172 reproduced E-172.** *"Fixed at all four live sites"* — there were six. The two survivors: `signer/Cargo.toml:77-85`, **inside the comment the same session wrote about removing the dev-dependency**, and `hedged_signing.rs:808-812`, **a paragraph sitting directly beneath the ⚠⚠ banner that corrects it**. | **UPHELD → E-175.** ⚠ **And the corrected count was wrong too — the sweep after this round found NINE**, three more in `DECISION-b19…` §3. **Four counts, four wrong.** |
| 2 | **Part 3's prose claimed more than part 3 delivers** — *"hashes only through"*, *"checks the call sites"*, and a `PASS` line labelled *"call-site check"*. It rejects two literal spellings; `type H = Sha512; H::digest(sk)`, `<Sha512 as Digest>::digest`, a `default()`+`finalize()` construction, or a **decoy** helper call all evade it. | **UPHELD → E-175.** All four descriptions narrowed to *a known-spelling regression check*, with the four evasions named in the script. |
| 3 | **Part 3's control mutated only the key-expansion call**, leaving the mask's call site untested — a check blind to the mask would have passed its own control. | **UPHELD.** The control now mutates both call sites and each is verified to fire. |
| 4 | The round-one packet contains copies of the false claim. | **REJECTED as a defect, ACCEPTED as a note.** A packet is the record of what a leg was shown; editing it makes the round unreviewable. A banner marks it instead. |

---

## 2. ⚠ The thing this session could not fix by fixing it

**Four times, an adjudication asserted how many sites it had corrected, and four
times the number was wrong** — four, six, nine, each discovered by the next
sweep. `CLAUDE.md` already carries two clauses about this:

* *tick the leg's list, not your recollection of it* (E-141);
* *a leg's list is line numbers; a corrected sentence is a string* (E-168);
* and this session added *grep the diff you just wrote for the claim you just
  falsified* (E-172).

**All three are advice, and advice is what kept failing.** This project's own
sentence — *a sweep recorded in prose is a claim with no falsifier, and a gate
that reports a number is making a claim about what the number counts* — applies
to **adjudications**, not only to gates.

**So the count is no longer written down.** `check-zeroize-bounds` **part 4**
scans every live file for five retracted phrases and fails on any occurrence
lacking a correction marker within six lines, with `docs/reviews/` exempt and a
control that must detect an injected assertion. E-137 and E-141 were counts
corrected by counts and both recurred; **a gate is the only thing that has ever
ended one of these loops here.**

---

## 3. Carried forward, NOT closed

1. ~~**No Devnet run on the default signing path since B-21** (`REVIEW-027`
   finding 8).~~ — **CLOSED the same day → E-176.** `REVIEW-024` §6 item 7 made
   this a gate on the argument that no test substitutes for it, and B-21 changed
   `fresh_aux`'s type on that same path. Re-executed at `af1cc3e41acf` — HEAD, with
   `git status --short signer/` **empty** — giving validated transaction
   `EF2018FA13AF7DCECD1D7562DE0BDF9A870688FAD6E4E564323B2AA1386FD336`.
   ⚠ **Written to a NEW receipt file.** The script's receipt path was a fixed
   string, so this run would have destroyed the B-16 receipt that `CLAIMS.md`,
   `signer/README.md` and `UPSTREAM-FEEDBACK.md` all cite — **E-169's exact
   mechanism, about to happen a second time.** It now refuses, *before
   submitting*, and that refusal was verified by breaking it in both directions.
2. **B-22** — the key-derivation residue. Both round-one legs called the scope
   boundary arbitrary; filed with the dissent recorded, not settled.
3. **Part 3 is a known-spelling check.** Narrowed honestly rather than
   strengthened, because reachability is not decidable by grep.

---

## 4. Stopping here, deliberately

`CLAUDE.md`: *two rounds is the right number, and the second reviews the fixes. A
third would review the fixes to the fixes; that is where it stops paying.* Round
two's fixes are **structural** — a gate that fails, and narrowed wording — rather
than a fresh set of prose claims, which is the condition under which stopping is
honest. **Part 4 is what a third round would otherwise have been.**
