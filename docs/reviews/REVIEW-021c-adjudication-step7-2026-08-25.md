# REVIEW-021c — adjudication, round one

- **Date:** 2026-08-25
- **Under review:** commits `aa1f349` and `e685cab` — `ConfidentialMPTConvertBack`, and E-76's `tools/` migration.
- **Legs:** `REVIEW-021a` (Gemini, no tools, self-contained packet), `REVIEW-021b` (Codex, read access to the repository and the vendored prover), `REVIEW-021s` (the session's own pass).
- **Outcome: eight findings upheld, none rejected.** Seven fixed; one recorded as a named gap.

---

## 1. The headline is the disagreement between the legs

| | Findings | Self-assessed |
|---|---|---|
| **Gemini** | **none, on any of seven questions** | 10 / 10 |
| **Codex** | **two MEDIUM, five LOW** | — |
| **Session's own leg** | **three** | — |

**Three of Codex's findings match three of the session's, independently and
exactly**: the migration inventory (Q6-1 ↔ S-3), the Convert disclosure
(Q7-1 ↔ S-2), and the `rebuild_inner` helper (Q7-2 ↔ S-1). That is the strongest
signal this project gets, and every previous round that produced it — `REVIEW-015`,
`REVIEW-016` — was right.

⚠ **A leg that reports nothing is a result. It is not corroboration, and it must
not be read as one.** Gemini's Q7 affirmatively stated that `rebuild_inner`
*"correctly preserves all field types and values"*. It does not, and two other
readers found so. This is the first round in this project where a leg returned
clean on every question, and the correct reading of that is **a shallow pass**,
not a clean bill.

⚠ **Two structural differences explain most of it, and neither is Gemini's
fault** — both were the adjudicator's setup:

- **Codex had the repository; Gemini had the packet.** Every one of Codex's four
  novel findings required reading a file the packet did not contain — the whole
  of `txn.rs`'s parse path, `rebuild-env.sh`'s header, four harnesses outside the
  diff. A self-contained packet bounds what a leg can find to what the packet
  chose to show, and **the packet's choices are the adjudicator's blind spots**.
- **Gemini cited file paths with line ranges it could not have read.** Those are
  derivable from diff hunks and are not evidence of having opened anything.
  Nothing in that leg should be treated as a source citation.

**Change for the next round:** give both legs repository access, or stop treating
a no-tools leg's silence as evidence about anything outside the packet.

---

## 2. Dispositions

### UPHELD and FIXED

| # | Finding | Severity | Disposition |
|---|---|---|---|
| **Q1-1** (Codex) | `parse` enforced §10.3's **allowlist** but not its **requirements**: a ConvertBack with no `MPTAmount`, no `BlindingFactor`, no `BalanceCommitment`, or a `ZKProof` of any length reached the confirmation | MEDIUM | **Upheld.** An allowlist says what a transaction *may* carry, not what it *must*, and never how long. The typed builder cannot produce one today — and that is precisely why it is a defect: the parse-back boundary exists so the confirmation trusts the **bytes** rather than the construction. Two tests, both spot-checked by reverting. `CLAIMS.md` **E-138** |
| **Q6-1** (Codex) ↔ **S-3** | The migration inventory was name-based and missed four routes to the same generator, one of which **submits to Devnet** | MEDIUM | **Upheld, found twice.** Fixed by `tools/check-blinding-sources.ts`, which searches **by pattern rather than by call-site name** and fails on an unrecorded use *or* a stale exemption. One harness migrated; the count corrected from four to nine. **E-132 now carries the correction at its own head.** `CLAIMS.md` **E-137** |
| **Q6-2** (Codex) | Three exemption **reasons** were overbroad — *"migrating would delete the finding"* is false | LOW | **Upheld.** Each harness needs exactly **one** scalar to violate the rule; the rest have no reason to be unruled. The exemptions stand on a narrower and true reason. ⚠ **This is a finding against a JUSTIFICATION, not against code** — the category this project is worst at auditing, because a reason that sounds right is not read the way a line is. `CLAIMS.md` **E-140** |
| **Q7-1** (Codex) ↔ **S-2** | Convert's disclosure listed the blinding factor as public and **omitted the amount** | LOW | **Upheld, found twice.** `MPTAmount` is plaintext on a Convert (§7.2). ⚠ **F-24's shape one layer down**, and it survived because the honesty test asserted only that `PUBLIC:` appeared, not what it listed — and never drove ConvertBack. Now pinned for all three types **including the negative**: a Send's amount is not on the wire and its disclosure must never say it is. `CLAIMS.md` **E-136** |
| **Q7-2** (Codex) ↔ **S-1** | `rebuild_inner` silently dropped every field outside a hard-coded list | LOW | **Upheld, found twice.** On a Send it dropped four required fields, so a future mutation test would have passed for the wrong reason — the `t-nbound.c` false-pass mode. Fixed by completing the list **and** asserting every decoded key is rebuildable. `CLAIMS.md` **E-135** |
| **Q7-3** (Codex) | `rebuild-env.sh`'s header still said `state.json` was *"gone for good"* while the same script now restores it | LOW | **Upheld.** ⚠ **A fix contradicting its own file four lines away.** The *closing message* was caught the same day by running the script; the **header** was not, and shipped. Reconstruct and restore are different verbs. `CLAIMS.md` **E-139** |

### UPHELD as a NAMED GAP, not a fix

| # | Finding | Disposition |
|---|---|---|
| **Q1-2** (Codex) | Frozen state is not preflighted — §10.4.2 item 9, `terFROZEN` | **Upheld as `CLAIMS.md` B-17, and deliberately not implemented.** The leg itself declined to prescribe a remedy *"without pinning the exact rippled 3.3.0 flag and precedence rules"*, and **this repository holds no rippled source**. `CLAUDE.md`: *a named gap is a correct output; a substituted source is a corrupted one.* Implementing a freeze check from recall is exactly the corrupted source. ⚠ **`terFROZEN` is a `ter`, not a `tec`** — nothing is applied to the ledger and **no ciphertext is published** — so this is liveness, not F-23 |

### NOT a finding, recorded so it is not re-raised

- **Codex, Q5:** a comment said the KAT fires *"at import"* when it fires lazily
  before the first derivation. Corrected in passing; **no behavioural
  consequence**, and it is noted here only so a later reader does not re-report
  it as one.

---

## 3. What both legs agreed was correct, and it is worth naming

Neither leg found anything against the two things this round existed to check
hardest, and Codex verified both against primary sources rather than the packet:

- **The §10.3 field set the builder emits.** Exact, including the absence of
  `HolderEncryptionKey` and the presence of a required `BalanceCommitment`. The
  two **validated** Devnet transactions read back off the chain agree.
- **The proof statement.** Witness `(b, ρ, sk_A)`; `params->amount` is the
  balance and the bare `amount` is the public withdrawal; `ρ` correctly serves
  twice, because `pc_rem = pc_b − m·G` leaves the `H` coefficient unchanged;
  `ConfidentialBalanceVersion` bound into ConvertBack's context and not
  Convert's, and re-checked after the human confirms.

Codex also confirmed `confidential_outstanding`'s placement is right and its
control test non-vacuous, that removing `Refusal::NotImplemented` deleted no
client distinction, and that `wconf-randomness.ts` is byte-exact against the
REVIEW-010 ruling's prose — it ran the vectors itself.

---

## 4. What this round did NOT cover

- **The Bulletproof internals.** Out of scope for every leg; issue #8.
- **Whether the B-15 recommendation is right.** Handed over by design, issue #13.
- **`store.rs`, `keygen.rs`, `onboarding.rs`** — untouched by these commits.
- ⚠ **The freeze semantics of rippled 3.3.0**, which is now B-17.

---

## 5. Round two

**Required, and this round earned it more than most.** `CLAUDE.md`: *two rounds
is the right number, and the second round reviews the FIXES.* Seven fixes landed
here, and three of them are **new test infrastructure** — a parse-time schema
check, a completeness assertion in a test helper, and a repository-wide gate
script — which is the category that has produced a defect-introduced-by-a-fix
every time this project has looked.

Specifically for round two:

1. **`tools/check-blinding-sources.ts` is a new gate that nothing reviews.** Its
   patterns decide what counts as a violation. A route it does not know about is
   invisible, and it now *looks* authoritative.
2. **The parse-time §10.3 checks** are new protocol-facing behaviour written on
   one reading, which is the exact condition that forced `REVIEW-015` round three.
3. **Every exemption reason was rewritten** after Q6-2. Reasons are what this
   round proved nobody audits.
