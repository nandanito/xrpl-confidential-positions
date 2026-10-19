# REVIEW-021s — the session's own leg, round one

- **Date:** 2026-08-25
- **What this is:** the adversarial pass the session that wrote the code ran on its own work, in parallel with the two external legs.
- **Result: three defects, and neither external leg reported any of them.**

> ## ⚠ Why a self-leg is recorded at all, given what this project knows about them
>
> `self-review-finds-mechanisms-misses-instances` is a standing lesson here: a
> session re-reading its own work finds the *shapes* of problems and misses the
> *instances*. That is still true and this leg does not contradict it.
>
> **What made this one productive was not re-reading.** All three findings came
> from *running something* — a new test that asserted a property nobody had
> asserted, a grep for an asymmetry, and a leg's own tool output. None came from
> reading the diff again, which is the activity that reliably finds nothing.

---

## S-1. HIGH — the test helper silently dropped every field it did not know about

**The defect.** `tests/convert_back.rs`'s `rebuild_inner` reconstructs a decoded
transaction so a test can add or remove one field. It iterated a **hard-coded
list** of `FieldDef`s and skipped anything absent from it, with no assertion that
the list was complete.

**Primary source.** The helper itself, and `xrpl::Decoded::keys()`, which
enumerates what was actually in the bytes.

**What breaks, concretely.** On a `ConfidentialMPTSend` the list omitted
`Destination`, `SenderEncryptedAmount`, `DestinationEncryptedAmount` and
`AmountCommitment`. A test that rebuilt a Send and asserted `parse` refused it
would have been asserting a refusal caused by **the missing fields**, not by the
field under test — and would have passed for entirely the wrong reason. That is
the `t-nbound.c` false-pass mode `REVIEW-009` §8 found: every assertion looks
fully exercised and none of them is.

⚠ **The tests that actually used it were unaffected**, because its list did cover
Convert's and ConvertBack's field sets. This is a trap that had not sprung yet,
which is the only reason it was cheap.

**Severity: HIGH.** Not because anything was wrong today, but because the failure
is silent and grows with every test added.

**How it was found.** By writing
`the_rebuild_helper_round_trips_and_is_not_quietly_dropping_fields` — a test
asserting the property the helper's doc comment implied and nothing checked. It
failed on the first run.

⚠ **The Gemini leg's Q7 affirmatively reported this helper correct**, saying it
*"correctly preserves all field types and values while dropping or injecting
specified fields."* It does not.

**Fixed** by completing the list **and** asserting that every decoded key is
rebuildable, so it can never drop silently again. `CLAIMS.md` E-135.

---

## S-2. MEDIUM — the Convert confirmation listed the blinding factor as public and not the amount

**The defect.** `confirm::disclosure(TxType::Convert)` read:

> *"PUBLIC: that you converted, when, and for which issuance — and the blinding
> factor. HIDDEN: the resulting balance."*

`MPTAmount` is a **plaintext field on a Convert** and is the single most
consequential thing the transaction publishes. It was not in the list.

**Primary source.** XLS-0096 §7.2's field table: `MPTAmount`, Required Yes,
`UINT64`, *"The public plaintext amount m to convert."*

**What breaks, concretely.** A holder reads the sentence that says *what this
transaction exposes* and is told about the blinding factor and not the amount.
The screen is not **false** — the amount line above it renders
`(PUBLIC — in the clear on the wire)` — but the summary omits the largest item,
which is the one thing a holder would act on.

⚠ **This is `CLAIMS.md` F-24's shape one layer down**: the same omission, in the
code rather than in the explainer, about the sibling transaction type. F-24 was
found on 2026-08-25 in the facility walkthrough; this was found hours later by
the same route — noticing that **two things which should read alike did not**.
ConvertBack's disclosure names its amount; Convert's did not, and both publish
one.

**Severity: MEDIUM.** A disclosure that is incomplete rather than false, on the
surface this project treats as load-bearing.

⚠ **Why it survived.** `the_confirmation_never_claims_more_than_is_delivered`
asserted only that the strings `PUBLIC:` and `HIDDEN:` **appeared** — not what
they listed — and **did not drive ConvertBack at all**. That is the third time an
untested disclosure wording has carried a wrong or incomplete sentence here.

**Fixed**, with a test that pins all three types **including the negative**: a
Send's amount is not on the wire, so its disclosure must never say an amount is
public — which is exactly the sentence a later edit trying to make the three
consistent would copy across. Both halves spot-checked by reverting.
`CLAIMS.md` E-136.

---

## S-3. HIGH — the E-76 migration sweep was name-based, and its own claim of completeness was wrong

**The defect.** `CLAIMS.md` E-132 recorded the `tools/` migration off
`mpt_generate_blinding_factor` as complete with **four** named exemptions. The
search had been `grep 'tool("blinding")'` — a search for **one call site's
name** — and missed every route reaching the same generator under another:

| Missed | Route |
|---|---|
| `spike-2026-08-18/devnet-send-our-nonces.ts` | a wrapper named `ours(...)` |
| `spike-2026-08-18/nonce-crosscheck.ts` | the same wrapper |
| `spike-2026-08-17/npm-e2e-convert.ts` | the npm package's `generateBlindingFactor()` |
| `spike-2026-08-17/npm-package-test.ts` | the same npm method |

**What breaks, concretely.** `devnet-send-our-nonces.ts` **submits to Devnet**,
so its `r` is published in `BlindingFactor` **permanently** — which is the entire
concern E-76 exists for. The other three publish nothing or would lose the
finding they demonstrate.

**Severity: HIGH**, and the severity is in the claim rather than the code: a
register row asserted a property of the whole tree on the strength of one grep.

**How it was found.** ⚠ **By the Codex leg's tool output, not by any finding it
wrote.** While working Q6 it grepped for `generateBlindingFactor|generate_blinding|mpt_generate_blinding`
and its progress stream listed files the session had never checked. The finding
is credited to that leg; the session confirmed and closed it.

⚠ **The lesson is not "grep harder".** `CLAUDE.md`'s own rule is that every
capability claim needs a test that fails if the claim is false, and **a sweep
recorded in prose has none**.

**Fixed** by `tools/check-blinding-sources.ts`, which enumerates the routes **by
pattern rather than by call-site name**, requires an open paren so it fires on
calls and not on prose about itself, and fails on an unrecorded use **or on a
stale exemption**. Both directions spot-checked. The corrected position is
**nine** exemptions, each with its reason at its own call site, and one harness
migrated on a stated principle:

> **Migrate what publishes an `r` to a ledger. Exempt what publishes nothing, or
> what would lose the finding it exists to demonstrate.**

`CLAIMS.md` E-137, and E-132 now carries the correction at its head.

---

## What this leg checked and found nothing on

Recorded because a leg that only reports findings is not saying where it looked.

- **The §10.3 field set** — checked against the fetched specification and against
  the two **validated** Devnet transactions read back off the chain. The field
  set is exactly §10.3's, including the absence of `HolderEncryptionKey`.
- **The witness order** — `(b, ρ, sk_A)`, corroborated independently by
  `vendor-verify.sh`'s `sk_offset=64` assertion, which predates this work.
- **`ρ` used twice** — confirmed against the vendored C: `pc_rem = pc_b − m·G`
  keeps `pc_b`'s blinding, so the remainder Bulletproof takes the same `ρ`.
  Also confirmed empirically: a revert that blinds `pc_b` with `r` instead makes
  the pristine verifier reject.
- **`confidential_outstanding`'s placement** — kept off `IssuanceState` so
  `binding_differs` cannot fire on other holders' converts. The string-vs-number
  control test fails when the reader is switched to a numeric helper.
- **Removing `Refusal::NotImplemented`** — no path in the crate constructs it.

## What this leg did NOT check

- The **Bulletproof internals**. Out of scope for every leg; issue #8.
- Whether the **B-15 recommendation** is right. It is handed over by design.
- Anything in `signer/src/store.rs`, `keygen.rs` or `onboarding.rs`, which this
  session did not touch.
