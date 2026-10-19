# REVIEW-015c — adjudication: architecture §6 step 3

**Date:** 2026-08-18. **Adjudicator:** the session that wrote the code, which is
why the legs exist.

**Target:** `16e2e58`, wiring the vendored prover into the signer, plus its
fixes in `9d42545`.

**Rounds:** two, per `CLAUDE.md`. Round one reviewed the implementation
(`REVIEW-015a` Gemini, `REVIEW-015b` Codex). **Round two reviewed the fixes**
(`REVIEW-015d`, `REVIEW-015e`), and it earned its place: it found a defect
introduced *by* a fix, a new test that passed for the wrong reason, and four
sentences that overstated what the fixes established. A third round would review
the fixes to the fixes; that is where it stops paying.

---

## 1. The finding both round-one legs found independently

**`AuditorEncryptedAmount` was generated and never serialised.**
`prover::prepare_send` encrypts to the auditor and includes that participant in
the proof whenever the issuance carries an `AuditorEncryptionKey`; the wire
struct had no such field. **Every `ConfidentialMPTSend` on an auditor-enabled
issuance carried a four-participant proof against three ciphertexts.**

Two independent legs finding the same defect is the strongest signal this
process produces. It is also the finding that says the most about *how* the
defect survived: **the Devnet issuance used for every execution in this project
has no auditor key, and no test fixture had one either.** A whole configuration
branch of the protocol had zero coverage while the milestone looked fully
exercised. `CLAIMS.md` **F-22**.

⚠ **One leg proposed field code 42.** That is `AuditorEncryptedBalance`, a
different field on a different ledger object. Taking the number would have
produced a transaction that encodes cleanly and means something else. The code
used is **43**, read from `ripple-binary-codec`'s definitions. *A review finding
is evidence, not an instruction.*

---

## 2. Upheld, and what each cost

| # | Finding | Leg | Disposition |
|---|---|---|---|
| 1 | Auditor ciphertext dropped | **both** | **FIXED.** `nth=43`, serialised on Send *and* Convert, included in the shared-`C₁` check, `fixture_with_auditor`, and a test that decrypts it under the auditor's own key |
| 2 | `Convert` skipped the issuance check `Send` made | **both** | **FIXED** in `preflight`, which now runs the check once for both types |
| 3 | Validation ran **after** the randomness reservation | B | **FIXED.** `session::preflight` runs before any entropy is drawn. ⚠ **A test had asserted the defect** — `a_refusal_after_reserving_still_burns_the_reservation` used an over-spend, which is refusable before randomness exists, making the wrong order look deliberate. Replaced |
| 4 | `parse` ignored unrecognised fields while claiming to refuse them | both | **FIXED** with a per-type allowlist. The sharpest instance: `MPTAmount` on a Send set `AmountView::Public`, so the confirmation would have rendered a **plaintext amount** for a ciphertext encrypting something else |
| 5 | The step's own falsifier could be aimed at the patched binary | B | **FIXED**, and **narrowed** — see §4 |
| 6 | `the_destination_receives…` never decrypted anything | B | **FIXED.** It now decrypts under the destination's **and** the issuer's keys |
| 7 | `drops()` unbounded | B | **FIXED**, and the check moved into `preflight` in round two |
| 8 | Corrupt `k_local.bin` exited generically | A | **FIXED**, and it explicitly **refuses to generate a replacement**: a new key computes different identifiers, so every record already written would stop matching and the reuse check would be dead while looking healthy |
| 9 | `promote_expired_pending`'s error discarded | B | **FIXED** — a ledger that cannot be maintained is a ledger that is not providing the check it exists for |
| 10 | Missing `rerun-if-env-changed`; misleading refusal message | A | **FIXED** |

---

## 3. ⚠ Round two proposed a fix that was WRONG, and the spec is why

Round two found that the round-one fix had added `AuditorEncryptedAmount` to
`Convert`'s allowlist while the signer never emitted it there, and recommended
**removing it from Convert**.

**Do not.** XLS-0096 §7.2 lists `AuditorEncryptedAmount` on
`ConfidentialMPTConvert` as *"**Required** if `sfAuditorEncryptionKey` is present
on the issuance"*, and §7.3.2 item 1 makes its absence `tecNO_PERMISSION`.

So the permissiveness the leg spotted was real, and its cause was the opposite
of what it concluded: **the signer was missing the field on Convert too.** The
same defect as §1, one transaction type over, and the leg walked right past it
while looking straight at it. Fixed by *emitting* the field, not by forbidding
it.

**This is the second time in this project that a leg's diagnosis was right and
its remedy was backwards.** `REVIEW-014c` records the first. The rule that
falls out is worth keeping: **check a recommendation against the primary source
before applying it**, especially when applying it is cheaper than checking.

### And the spec check found something no leg did

Reading §7.2 for the auditor question surfaced a defect neither round found:
`HolderEncryptionKey` is **required when initialising and forbidden once
registered** (`tecDUPLICATE`, §7.3.2 item 3), and `ZKProof` is required exactly
when it is present and *"MUST be absent"* when it is not. **The signer always
emitted both.** It could register a holder once and would have failed every
Convert after that. Fixed; `holder_key_registered` is now part of the profile,
and both paths are executed on Devnet.

---

## 4. Overclaims, all four accepted

Round two's most useful category, and the one self-review never produces.

| Sentence | Why it was wrong | Now |
|---|---|---|
| *"Check that the binary **really is the pristine one**"* | It inspects a symbol table. A stripped patched build, or one reaching the patch through a dynamic library, would pass | Narrowed to *"check that the binary is **not the patched one**"*, with the residual gap stated. The check also now refuses to conclude anything from a symbol table too small to be real |
| *"Everything checkable, checked **before any entropy is drawn**"* | `drops()` overflow was still detected at serialisation, after the reservation | The fee bound moved into `preflight`. The sentence is now true |
| *"burns them on **any** refusal"* (`lib.rs`) | Preflight refusals deliberately burn nothing | Split into the two halves, both stated |
| The auditor test's *"the confirmation must say so"* | The test asserted that the blob **re-parsed**. Nothing rendered the auditor at all — `ParsedTransaction` had no such field | `has_auditor` is parsed and rendered, the test asserts the rendered text, **and** a second test asserts the line is absent when there is no auditor — because a line that always appears carries no information |

---

## 5. Refuted, and pinned by tests rather than by this document

Both round-two legs independently confirmed both refutations.

- **"A zero XRP drops Amount must serialise as eight zero bytes."** It must not.
  `ripple-binary-codec` encodes `Fee: "0"` as `4000000000000000`, positive bit
  set. Pinned by `a_zero_drops_amount_keeps_the_positive_bit`.
- **"`b58_encode` strips payload digits equal to the zero character."** It
  cannot: a non-zero most-significant base-58 digit forces a carry of at least 4
  on every subsequent byte, so a non-zero value never has a zero top digit and
  the cleanup can only fire on an all-zero payload, where it is correct. The
  argument is a proof sketch, and a proof sketch is the kind of thing that is
  wrong one time in twenty, so it is backed by a brute-force round trip over
  2023 payloads including every count of leading zero bytes — plus a comparison
  against `ripple-address-codec`'s own output.

**A refutation that lives only in a disposition note is a finding somebody
re-raises next round**, and the second time nobody re-derives the argument.

---

## 6. What neither round found

Neither leg found a defect in the FFI call sites, the `r`/`ρ` derivation, the
randomness ledger's chaining, or the Fiat–Shamir transcript — the four places
most likely to be catastrophically wrong. That is consistent with `REVIEW-009`,
where neither leg found a defect in the wide reduction or the transcript either.

**It is not evidence that those are correct.** It is evidence that this review
shape is better at finding wiring, ordering and claim defects than cryptographic
ones, which is worth knowing when deciding what the next packet should be.

---

## 8. Round three, 2026-08-19 — run against this project's own rule, and it paid

`CLAUDE.md` says two rounds, and *"a third round would review the fixes to the
fixes; that is where it stops paying."* A third round was run anyway, on one
argument: **round two's fixes changed `Convert`'s wire format on the strength of
the adjudicator's own reading of XLS-0096 §7.2, and no second reader had seen
them.** A fix that introduces new protocol-facing behaviour is a new thing to
review, not a smaller version of the old thing.

It was scoped to that delta only — 37 KB, not the whole milestone.

**It found a defect neither earlier round could have**, because the code did not
exist until round two:

> `ParsedTransaction::parse` applied `Convert`'s `HolderEncryptionKey`/`ZKProof`
> pairing rule to **`ConvertBack`** through a `_` wildcard.

Reading XLS-0096 §10.3 to settle it showed the problem was **three-fold**, not
one: ConvertBack has a **required** 816-byte `ZKProof`, **no
`HolderEncryptionKey` field at all**, and a **required** `BalanceCommitment`
that the shared allowlist omitted. **A valid ConvertBack would have been
rejected twice over, and an invalid one accepted.**

The fix is not to implement ConvertBack's field set — nothing has ever exercised
one — but to **refuse the type by name** in `parse`, and to strike the doc
comment that claimed the allowlist covered it. A named gap is a correct output.

| Finding | Leg | Disposition |
|---|---|---|
| `ConvertBack` given Convert's field set and pairing rule | B | **FIXED** by refusing the type in `parse`, with a test. The claim of coverage is struck |
| `holder_key_registered` defaulted to `false`, so an incomplete profile for a registered holder silently takes the initialising branch into `tecDUPLICATE` | B | **FIXED** — the field is now required. A profile that does not know must fail to load rather than guess |
| The auditor test proved decryptability but **not** the shared-`C₁` invariant it claimed | B | **FIXED** with a direct `aud[..33] == parsed.c1` assertion **and** a negative test that poisons the auditor `C₁` and asserts the refusal fires |
| README compressed a **conditional** spec requirement into an unconditional one | B | **FIXED** |
| A swallowed line continuation baked a run of spaces into an error string | A | **FIXED.** Caused by a Python heredoc eating the `\`; the tree was swept for others and there were none |
| An error message said "a Convert" on an arm that also caught `ConvertBack` | A | **FIXED** — named by the parsed type |

**Both legs independently confirmed** that claims 1 and 2 were implemented
correctly, that the rebuilt `NetworkID` test no longer passes for the wrong
reason, and that no prose from round two still overstates.

**121 tests**, up from 118.

⚠ **The Devnet end-to-end has NOT been re-run since round three**, because the
scratch environment holding the Devnet keys was destroyed (§9). What can be said
without it: the round-three changes touch a parse refusal for a type never
built, a serde attribute, tests, and prose — and `tests/xrpl_vectors.rs` pins the
emitted bytes byte-for-byte against `ripple-binary-codec`, so the bytes a Send or
Convert produces are unchanged. **That is an argument, not an execution**, and it
is recorded as one.

---

## 9. ⚠ The evidence base lived in `/tmp` and `/tmp` was cleaned

Mid-session on 2026-08-19, `/tmp/wconf` — a symlink into an earlier session's
scratch directory — was removed by the platform. It held the vendored patched
`mpt-crypto`, the built libraries, both `mptool` binaries, the XLS-0096 text, and
`state.json` with the Devnet account seeds, issuance ID and ElGamal secrets.

**The signer stopped building.** `build.rs` said exactly why and named the two
commands to run, which is the one part of this that worked as designed.

What reconstructed, and what did not:

| Asset | Recovered? | How |
|---|---|---|
| Vendored patched tree | **Yes** | `git clone` at the pin + the **committed** `wconf-nonces.patch`. `vendor-verify.sh` passes on the rebuild. **This is issue #2 path A's central argument paying off** — the patch is the artifact, so the tree is reproducible |
| secp256k1 v0.7.1 | **Yes** | Clone at the pinned commit, `cmake` build |
| Patched + pristine libraries, `mptool` binaries | **Yes** | `build.sh` |
| XLS-0096 text | **Yes** | Re-fetched from `XRPLF/XRPL-Standards` — the primary source, not a copy |
| **Devnet `state.json`** | **NO** | Account seeds, issuance ID and ElGamal secret keys. **Not reproducible.** The accounts and transactions remain on Devnet and every hash this project recorded is still verifiable by anyone; what is lost is the ability to *drive* those accounts |

**The evidence is intact; the ability to re-run it is not.** That distinction is
the whole point of recording transaction hashes rather than screenshots, and it
held. `E-70` was also independently re-confirmed on the fresh clone:
`git tag --points-at HEAD` on `85dbac7` returns `1.0.4`.

**What this says about the build:** every execution claim in this project rests
on an ephemeral directory that nothing warned about. The vendored half was
reproducible by design and the Devnet half was not by oversight — throwaway keys
are the right call, but a throwaway key that cannot be regenerated makes a
harness single-use.

---

## 10. ⚠ The suite was flaky, and nobody found it — a machine did

While re-verifying after round three, the full suite failed: **two tests in
`signing_path.rs`, nondeterministically.**

`store::fail_next_entropy_draw_for_test` — added in step 3 **specifically to
make the claim "entropy failure refuses to sign" falsifiable** — set a
process-global `AtomicBool`. `cargo test` runs a binary's tests on parallel
threads, so the induced failure landed in whichever test drew entropy next.

Measured, in both directions:

| Version | Result |
|---|---|
| Global `AtomicBool` (restored via `git stash`) | **2 failing runs in 12** |
| `thread_local!` | **0 failing runs in 12**, and 0 in 6 full-suite runs |

**This retroactively weakens every "N tests, all passing" statement in this
milestone.** Those were accurate reports of runs that happened to be green. They
were not evidence that the suite was sound, and no review round caught it —
three rounds and six legs all read the hook and none flagged the threading.

**The hook written to make a claim falsifiable was itself unsound.** That is the
sharpest instance yet of this project's recurring lesson, and it argues for one
concrete habit: **run a suite repeatedly before reporting it green**, because a
single green run distinguishes "correct" from "lucky" not at all.

The shared C `secp256k1` context was checked for the same class of defect and is
safe — a C++11 function-local static, thread-safe on first initialisation, with
`secp256k1_context_randomize` called exactly once inside it.

---

## 7. Standing

Every finding in both rounds is fixed, refuted with a test, or explicitly
narrowed. **118 tests**, up from 107 before round one. Two fixes were
spot-checked by reverting them and confirming the tests fail. The Devnet path
was re-run after each round: `tesSUCCESS`, validated, and the step 4 falsifier
still passes on the clean account (`ASSERTION PASSED`, 11 transactions).

**Not accepted: nothing.** Two findings were refuted on evidence and **two
recommendations were reversed on the spec**; everything else was applied.

**Updated after round three:** 121 tests. Section numbering here is out of order
because §8 and §9 were appended rather than renumbered — the project's convention
is to strike and append, not to rewrite history.
