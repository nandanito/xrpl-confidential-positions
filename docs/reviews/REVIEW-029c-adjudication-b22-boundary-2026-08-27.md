# REVIEW-029c — adjudication: B-22, where the secret-residue boundary falls

**Date:** 2026-08-27. **Subject:** `docs/decisions/DECISION-REQUEST-b22-derivation-residue-2026-08-27.md` at `694e01e`.
**Legs:** `REVIEW-029a` (Gemini, inline packet), `REVIEW-029b` (Codex, read-only repo access), `REVIEW-029s` (self).

---

## 0. ⚠ THE LEGS SPLIT, AND THE SPLIT IS THE MOST USEFUL THING THIS ROUND PRODUCED

| Leg | §0 re-framing | Does F2 defeat B? | Option |
|---|---|---|---|
| **Gemini** (`029a`) | **SCOPE CREEP** | **No** — Nirvana fallacy; module boundary is a layer boundary | **B** |
| **Codex** (`029b`) | **Sound** | **Yes**, as a response to the consistency objection | **C** |
| **Self** (`029s`) | Partly scope creep | No | B |

⚠ **`CLAUDE.md` records that `REVIEW-024`'s three-leg unanimity was CHEAP, because both external legs ruled from source the adjudicator had selected. This round is the opposite and deliberately so:** Gemini got an inline packet of my excerpts; **Codex had read-only access to the whole tree** and read it for roughly twelve minutes. **They disagree on the central question.** That is two readings, not one distributed.

⚠ **The self leg is NOT a third vote and is marked so in its own §5: it was written AFTER reading `029a`.** Discounting it, the external split is **1–1**.

---

## 1. What both legs agree on — and this is the firmest result of the round

- **Option A is rejected.** Gemini: leaving root master key material raw while wiping ephemeral nonces *"in the very same file"* is indefensible. Codex rules C, so a fortiori. **The deferral's reason does not survive contact with two independent readings.**
- **Option D is rejected, by both, on the same ground.** Gemini: conditioning cryptographic hygiene on an application config mode *"breaks cryptographic layering"* and file permissions vs. memory scraping are **distinct controls**. Codex: *"plaintext on disk is a disclosed residual, not a reason to retain avoidable memory residue."* ⚠ **F3 is a real fact and a bad basis for a decision, and I accept that.**

**So the live question is B or C, and nothing else.**

---

## 2. Errors in the request, all verified at source before being accepted

⚠ **A review finding is evidence, not an instruction** — `CLAIMS.md`, six recorded instances. Each was checked.

| # | Leg | Finding | Verified? |
|---|---|---|---|
| 1 | Gemini | **`sha512_zeroizing` is not a drop-in for `sha512half`.** It returns `Zeroizing<[u8; 64]>`; the callers need `[u8; 32]`, and slicing back recreates the bare temporary. A `Zeroizing<[u8; 32]>` helper is required | ✔ **CONFIRMED.** F1's *"routing the three secret callers through it"* was too glib |
| 2 | Gemini | **`holder.rs` parses the profile JSON TWICE.** `:287-288` builds a whole `serde_json::Value` AST — heap `Map` and `String`s including `account_seed` — before `:297-298` deserialises `RawProfile` | ✔ **CONFIRMED at source.** F2's list of three was incomplete |
| 3 | Gemini | **`keygen.rs:225` calls `from_family_seed`, which decodes the seed a SECOND time**, duplicating every unwiped decode and derivation buffer | ✔ **CONFIRMED.** `from_family_seed`'s first line is `decode_family_seed(seed)?` |
| 4 | Gemini | **§5's gate claim is a category error.** A gate pins designated sites; it cannot prove no unlisted secret-bearing site exists | ✔ **CONFIRMED as reasoning.** Part 4 is near-exhaustive for *prose* because it scans fixed phrases across every live file. **There is no equivalent for sites.** §5 overclaimed |
| 5 | Gemini | Decoders double-`Sha256` over secret seed bytes, digests unwiped (`:273`, `:899`) | ✔ **CONFIRMED** |
| 6 | **Codex** | **F1 MISCLASSIFIES `xrpl.rs:474` as secret input.** Its preimage is `root_pub ‖ 0 ‖ i` — a curve point and two counters. **Two secret callers, not three** | ✔ **CONFIRMED at source** (`:471` is `root_pub.clone()`) |
| 7 | Self | **`keygen.rs:221`'s `Zeroizing(entropy)` is a COPY, not a move** — `[u8; 16]` is `Copy`, so the original `entropy` binding stays live and unwiped. ⚠ **Wrapping a `Copy` type in a zeroizing wrapper does not wipe the source** | ✔ **CONFIRMED.** F4's *"keygen already answered this in the affirmative"* was overstated |

⚠ **ONE LEG CLAIM IS PARTLY REFUTED, recorded so it is not inherited.** Codex adds that the intermediate scalar and candidates are *"publicly computable"*. **Too strong.** `root_pub` is **not published** — `AccountKey.public` is `sum·G`, not `root_pub` (`xrpl.rs:480-483`) — so no outside observer can compute `intermediate`. **The accurate statement is narrower and is what B-22 should carry: the INPUT at `:474` is not secret; the OUTPUT still is.** The preimage buffer `m` at `:471` is low-value to wipe; the resulting `intermediate` scalar is not.

⚠⚠ **THE PATTERN, AND IT IS THE ROUND'S SHARPEST RESULT: the request argues that a hand-enumerated site list is a claim with no falsifier, and it contained FOUR enumeration errors of its own** (F6's phantom line, F2's missing `Value`, F1's misclassified caller, F4's copy-vs-move). **Two were caught by external legs, one by `claims-check`, one by me.** ⚠ **No count is being carried forward from that sentence** — `CLAIMS.md` E-137, E-141, E-165, E-168, E-172 and E-175 are six instances of a fix-report count being wrong, and this would be the seventh candidate. **§4 item 3 is the gate instead.**

---

## 3. The ruling, and why it is not the vote count

⚠ **A straight count of external legs is 1–1, and with the self leg it is 2–1 for B. I am not ruling by count**, because the self leg is contaminated (it read `029a` first) and because the two legs are arguing about **different things** and neither noticed.

- **Gemini is arguing about the INCREMENT.** Its case is risk: `xrpl.rs` is a module whose boundary coincides with a layer boundary; C reaches toward `serde_json`, whose internals this project cannot verify; an unbounded refactor is where a false claim gets made. **This is correct and I accept it.**
- **Codex is arguing about the UNIT.** Its case is principle: the security unit is the **owned lifetime of the seed**, from ingestion to derivation, and a boundary drawn mid-lifetime cannot honestly be called coherent. ⚠ **Its qualifier is the part Gemini's objection does not reach: "signer-owned".** `serde_json`'s parse scratch is not signer-owned; `raw`, `tree`, `p.account_seed` and `seed` **are**. **This is also correct.**

**These are compatible, and the disagreement is verbal.** So:

> ### RULING
>
> **1. The UNIT is the owned seed-to-key path — Codex's principle.** `xrpl.rs` is
> **not** ruled a sufficient security boundary for this secret. The seed enters at
> `holder.rs` and dies at derivation, and that lifetime is the thing whose residue
> the signer manages.
>
> **2. The FIRST INCREMENT is Option B — Gemini's risk case.** The intra-module
> inconsistency both `REVIEW-027` legs actually named — *"in the same module"* —
> is closed **completely** by B, and B is a strict subset of the unit in (1).
>
> **3. ⚠ The `holder.rs` half is IN SCOPE and REGISTERED, not deferred.** It becomes
> **B-23**, whose subject is fixed here rather than left to a later session's
> discretion: `holder.rs:272` `raw`, `:287-288` the `serde_json::Value`, `:162`
> `RawProfile::account_seed`, `:307-313` `seed` — **and the residual that
> `serde_json`'s own parse scratch is not signer-owned and cannot be wiped**,
> which is named in the same species as B-21's SHA-512 block buffer.
>
> ⚠ **The distinction from the deferral B-22 exists to re-examine is that THIS one
> names the sites, fixes the scope, and states the residual.** *"Needs its own
> decision"* is what produced B-22. **B-23 is a ruled-in-scope item with a subject.**
>
> **4. Option B may NOT be described as answering the consistency objection in
> general, as covering `holder.rs`, or as wiping the seed.** P-5's sentence is the
> ceiling: **it narrows a window and removes no channel.**

⚠ **I am the interested party — I wrote the re-framing Gemini calls scope creep — so the direction of this ruling matters.** It **concedes** the increment to the leg that ruled against me and **keeps** only the part both my facts and Codex's independent reading support. ⚠ **The failure this project warns about is an adjudicator overruling legs to widen scope** (the handover: *"two legs against one adjudicator, and the adjudicator was the interested party"*). **This ruling does not widen what gets built; it widens what gets WRITTEN DOWN.**

---

## 4. Conditions on the build, all mandatory

1. **A `Zeroizing<[u8; 32]>` helper**, not a slice of the 64-byte one — Gemini finding 1.
2. **`xrpl.rs:471`'s preimage buffer is NOT in scope** — its input is public. **`intermediate`, `root`, `sum`, `candidate` and the decoded seed arrays ARE.**
3. **`make check-zeroize-bounds` gains a part for these sites, verified by breaking it in BOTH directions** (E-165: both of B-21's gates false-passed first). ⚠ **The gate's guarantee must be stated as over a NAMED SET, not as completeness** — finding 4 is why.
4. **`tests/xrpl_vectors.rs` must stay green untouched.** `family_seed_derivation_matches_ripple_keypairs` is the falsifier that the derived key did not change; `the_transaction_hash_is_over_the_signed_blob_with_its_prefix` proves the public path was not disturbed.
5. **`keygen.rs:221`'s copy-not-move is fixed or explicitly registered** — finding 7.
6. **Round two reviews the FIXES**, per `CLAUDE.md`. This round is round one.
