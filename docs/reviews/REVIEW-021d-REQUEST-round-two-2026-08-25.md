# Review packet — ROUND TWO. The fixes, not the feature.

- **Date:** 2026-08-25
- **Under review:** commit `4cc3ae1`, which is **round one's seven fixes**. The feature itself was round one (`aa1f349`, `e685cab`) and is **not** what you are reading.
- **Round one:** `REVIEW-021a` (Gemini), `REVIEW-021b` (Codex), `REVIEW-021s` (self), adjudicated in `REVIEW-021c`.

> ## Why a second round exists here, stated so it is not treated as ceremony
>
> `CLAUDE.md`: *"Two rounds is the right number, and the second round reviews the
> FIXES. Fixing something and describing the fix are separate acts with separate
> failure modes, and only a fresh reviewer catches the second kind."*
>
> **Every time this project has run a second round it has found something, and
> always one of exactly three kinds:**
>
> 1. **A defect introduced BY a fix.** `REVIEW-016` round two: a round-one fix
>    routed a retryable condition through a permanent-failure code, so *the one
>    condition most likely to clear itself told the client to give up.*
> 2. **A test written for a round-one finding that passes for the WRONG reason.**
>    `REVIEW-016` round two produced two, caught only by spot-checking reverts.
> 3. **A false sentence written ABOUT a fix.** `REVIEW-020` round two: the fix
>    was correct and the paragraph explaining it mis-described the function.
>
> **Look for those three first.** They are not hypotheticals here; each has
> happened, and round one of *this* review already produced a fourth instance of
> kind 3 on its own (`CLAIMS.md` E-139).

---

## 0. ⚠ What changed about how this review is run

**Round one's adjudication found a defect in its own setup, and this packet
fixes it.**

> *"Codex had the repository; Gemini had the packet. Every one of Codex's four
> novel findings required reading a file the packet did not contain… A
> self-contained packet bounds what a leg can find to what the packet chose to
> show, and **the packet's choices are the adjudicator's blind spots**."*

So: **both legs get the files this time.** Every file touched by the fixes is
reproduced in full in §6 — not as a diff — and a copy of the relevant tree sits
in the working directory. **Read the files. Do not trust this packet's summary of
them.**

⚠ **Gemini's round-one leg cited file paths with line ranges it could not have
read** (it had no filesystem access; the numbers are derivable from diff hunks).
If you cite a line, have opened it.

---

## 1. What round one found, and what was done about it

**Eight findings, all upheld. Seven fixed, one recorded as a gap.** This is the
list you are checking the fixes for.

| # | Finding | Fix |
|---|---|---|
| **Q1-1** MEDIUM | `parse` enforced §10.3's **allowlist** but not its **requirements**: a ConvertBack with no `MPTAmount`, no `BlindingFactor`, no `BalanceCommitment`, or a `ZKProof` of **any length** parsed cleanly | A required-field-and-size block in `ParsedTransaction::parse`, plus two tests |
| **Q6-1** MEDIUM | The E-76 migration sweep was **name-based** and missed four routes to the same generator, one of which **submits to Devnet** | `tools/check-blinding-sources.ts` — a new repo-wide gate. One harness migrated. Count corrected 4 → 9 |
| **Q6-2** LOW | Three exemption **reasons** were false — *"migrating would delete the finding"* | Reasons rewritten, narrower and true |
| **Q7-1** LOW | Convert's disclosure listed the blinding factor as public and **omitted the amount** | Disclosure reworded; a new test pins all three types **including a negative** |
| **Q7-2** LOW | `rebuild_inner` silently dropped every field outside a hard-coded list | List completed **and** a completeness assertion added |
| **Q7-3** LOW | `rebuild-env.sh`'s **header** said `state.json` was *"gone for good"* four lines above the restore branch | Header rewritten |
| **Q1-2** LOW | Frozen state not preflighted (§10.4.2 item 9) | ⚠ **NOT FIXED — recorded as `CLAIMS.md` B-17.** See Q5 below |
| — | Two ConvertBack **drift** tests added by the self-leg (the re-read path had no ConvertBack coverage at all) | New tests |

---

## 2. THE QUESTIONS

### Q1 (highest value). Did any fix introduce a defect?

The three highest-risk fixes, in order:

**(a) `tools/check-blinding-sources.ts` is a NEW GATE THAT NOTHING HAS
REVIEWED, and it now looks authoritative.** Its `ROUTES` patterns *define* what
counts as a violation. A route it does not know is invisible to it — and the
whole reason it exists is that a previous search missed routes. Ask:

- Are the four patterns sufficient? What reaches `mpt_generate_blinding_factor`
  that none of them match? Consider: a helper that builds the argv array
  dynamically, a re-export, a `.mjs`/`.cjs` file, a shell script, `Bun.spawn`
  with a variable subcommand, Rust in `signer/`.
- ⚠ **It only walks `tools/`.** Is that right? `signer/` deliberately does not
  bind the symbol — but is "deliberately" checked anywhere, or assumed?
- The `\s*\(` requirement was added so the gate fires on **calls** and not on
  **prose**. Does that let a real call through — e.g. a function reference
  passed without calling it, `const f = mpt.generateBlindingFactor;`?
- The **stale-exemption** check skips two files by name. Is that hole load-bearing
  or lazy?

**(b) The parse-time §10.3 checks are new PROTOCOL-FACING behaviour written on
one reading.** That is the exact condition that forced `REVIEW-015` to run an
unprecedented **third** round. Check them against §10.3 (§7 below), not against
the code's own comments. Specifically: are the sizes right, is requiring
`MPTAmount` **present** correct given §10.4.1 item 5 says zero is `temBAD_AMOUNT`,
and can the new block **reject a transaction rippled would accept**?

**(c) The disclosure change.** `confirm::disclosure(TxType::Convert)` now names
the amount. Is the new sentence **true**, and does it now say anything the
transaction does not do?

### Q2. Did any test written for a round-one finding pass for the WRONG reason?

`REVIEW-016` round two found two of these, and they were caught only by
spot-checking reverts — reading them was not enough.

The tests written for round-one findings:

- `parse_refuses_a_convert_back_missing_any_field_section_10_3_requires`
- `parse_refuses_a_convert_back_whose_fixed_size_fields_are_the_wrong_length`
- `the_rebuild_helper_round_trips_and_is_not_quietly_dropping_fields`
- `every_type_that_publishes_an_amount_says_so_and_the_one_that_does_not_never_does`
- `a_balance_version_that_moves_during_a_convert_back_confirmation_is_detected`
- `a_balance_ciphertext_that_moves_during_a_convert_back_confirmation_is_detected`

⚠ **Each was spot-checked by reverting its fix and confirming it fails.** That
rules out one failure mode and not the others. Ask instead: **does the test fail
for the reason its name claims?** A test that removes a field and asserts a
refusal can pass because a *different* required field was already missing — which
is precisely the `rebuild_inner` defect one layer up, and `rebuild_inner` is what
several of these tests use.

⚠ **The `rebuild_inner` fix and the tests that depend on it are the same
blast radius.** If the completeness assertion is wrong, the tests built on it are
back to being vacuous.

### Q3. Is any sentence written ABOUT a fix false?

This project has produced **four** of these, one of them in round one of this
very review.

Every fix carries prose. Check it:

- `txn.rs`'s new block claims *"the typed builder cannot currently produce one"*.
  **Is that true?** If a `WireFields::ConvertBack` can be constructed with a
  short proof, the comment is false and the severity was mis-rated.
- `check-blinding-sources.ts`'s header narrates what happened and what the gate
  guarantees. Does it overclaim?
- The rewritten exemption **reasons**. Round one found the previous ones false;
  are the replacements true? ⚠ **This is a finding class this project is
  demonstrably bad at**: a reason that sounds right is not read the way a line is.
- `rebuild-env.sh`'s new header. It now distinguishes **reconstruct** from
  **restore**. Is the distinction accurate against what the script does?
- `CLAIMS.md` **E-135 to E-140** and **B-17**. Does each row's *evidence* column
  actually support its *claim* column?

### Q4. Is the count of nine exemptions right, and is each reason true?

Round one corrected four → nine. **Verify the number independently.** Then check
each reason against the harness it describes. Two specific traps:

- ⚠ **`npm-e2e-convert.ts` submits to Devnet**, so its `r` is published — the
  exact condition that made `devnet-send-our-nonces.ts` a violation. Its
  exemption says its stated claim is that *every* piece of proof material comes
  from the npm package. **Is that a good enough reason for a harness that
  publishes?** Round one accepted it. Attack that.
- **`mptool.c`** is exempt as *"the tool that exposes the subcommand"*. Is that
  a category error — it is not a caller, so should it be in the list at all?

### Q5. Was recording B-17 rather than fixing it the right call?

The frozen-state preflight (§10.4.2 item 9) was **not implemented**. The stated
reason: the leg declined to prescribe a remedy without pinning rippled's flag and
precedence rules, this repository holds no rippled source, and `CLAUDE.md` says
*a named gap is a correct output; a substituted source is a corrupted one.*

**Argue it either way.** Is `terFROZEN` being a `ter` rather than a `tec`
sufficient to make this liveness rather than confidentiality? Is B-17's *"what
would settle it"* the right next step?

### Q6. Free hunt, on the fixes only.

Anything else in `4cc3ae1`. **Not** the feature — that was round one.

---

## 3. ⚠ SETTLED — do not reopen

Everything in `REVIEW-021`'s §3 still stands (the four randomness rules,
`reduce_wide_total`'s missing error type, the signer not submitting,
`lsfDisableMaster`'s three branch points, `Scalar` having no byte constructor,
`NetworkID` omitted on Devnet). **Plus, newly settled by round one:**

| | Why |
|---|---|
| **The §10.3 field set the builder emits** | Both legs verified it independently; two validated Devnet transactions agree |
| **The `(b, ρ, sk_A)` witness and `ρ`'s double use** | Codex verified against the vendored C; `vendor-verify.sh` asserts `sk_offset=64` independently |
| **Removing `Refusal::NotImplemented`** | Both legs agreed; no client distinction was deleted |
| **`confidential_outstanding` on `LedgerSnapshot`, not `IssuanceState`** | Codex verified the reasoning and the control test |
| **`wconf-randomness.ts`'s derivation** | Codex ran the nine vectors itself and confirmed byte-exactness against the ruling's prose |

---

## 4. What a finding must look like

Unchanged from round one, and it matters more here because the surface is
smaller: **the defect in one sentence; the primary source; what concretely
breaks; severity; a remedy only if you are certain.**

⚠ **Round one's Gemini leg reported nothing on seven questions and self-scored
10/10, while two other readers found eight defects between them.** A clean report
is a legitimate result and this packet wants honest ones — but *"no finding"* on
a question you did not open a file for is not the same statement. **Say which
files you read.**

---

## 5. What was executed after the fixes

- **250 tests, four consecutive clean runs**, plus 4 live Devnet tests.
- `bun tools/check-blinding-sources.ts` — PASS, 9 exemptions, 0 unrecorded uses.
  Spot-checked in **both** directions: a reintroduced call fails it, and a stale
  exemption fails it.
- `bun tools/wconf-randomness.ts` — all nine published vectors, abort path fires.
- **No new Devnet transactions.** The fixes are parser, test and tooling changes;
  nothing about the wire format moved, so nothing was re-executed on chain.
  ⚠ **If you think a fix DID change the wire format, say so — that would need a
  Devnet run and it has not had one.**
