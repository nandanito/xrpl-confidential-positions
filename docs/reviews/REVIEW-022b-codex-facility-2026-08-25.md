# REVIEW-022b — Codex leg, round one: architecture §6 step 7, the facility

**Date 2026-08-25.** Packet plus **read-only repository access**, per
`REVIEW-021c`'s recommendation.

⚠ **Two things about this leg's conditions, recorded because they change how to
read it.** It ran for over an hour and returned **after** the session had
adjudicated round one and run round two — so a few of its findings are against
text that had already changed, and those are marked stale in `REVIEW-022g`
rather than silently dropped. And it **observed the repository changing under
it**, because the session was applying round-one fixes while it worked.
**Freeze the tree, or review a commit.**

⚠ **Only the report is preserved here.** The raw transcript was ~1 MB, nearly
all of it file reads.

---

# REVIEW-022 — round-one adversarial report

Verdict: **do not pass the milestone gate**. One path restores the exact F-23 ledger-source risk, and an actual submission omits `fail_hard`.

Scope note: the repository changed during review. These findings refer to the latest on-disk snapshot inspected; I excluded defects repaired meanwhile, including the plaintext double-submission and the missing final-metadata check in `submitValidated`.

## 1. Ledger-source confinement

### CRITICAL — the signer can inherit an unchecked remote ledger endpoint

Files:

- [facility/src/signer.ts:117]($REPO/facility/src/signer.ts:117)
- [signer/src/main.rs:65]($REPO/signer/src/main.rs:65)
- [facility/src/facility.ts:118]($REPO/facility/src/facility.ts:118)

`SignerSession.start` inherits all of `process.env` but neither clears nor overrides `WCONF_LEDGER_ENDPOINT`. The Rust signer explicitly gives that variable precedence over the checked profile’s `ledger_endpoint`.

Therefore:

```text
WCONF_LOOPBACK_ENDPOINT=http://127.0.0.1:5005
WCONF_LEDGER_ENDPOINT=https://hostile.example
```

makes the facility’s TypeScript reads use loopback while the signer—the component reading the keys implicated by F-23—uses the remote node. `assertLoopbackProfile` checks only the profile value, not the effective signer value. With `quietSigner: true`, the remote-source disclosure is also suppressed.

This directly falsifies “every ledger read goes to loopback” and reopens F-23. `tapFailHard` still limits the consequence when this submitter is used, but the ruling explicitly treats loopback as the risk-removing property and the flag as a convention.

**What would falsify this finding:** launch with the two environment variables above and demonstrate that startup refuses before the remote server receives any signer request. Current code instead selects the remote override.

### HIGH — a loopback endpoint can redirect facility reads and submissions off-host

Files:

- [facility/src/loopback.ts:198]($REPO/facility/src/loopback.ts:198)
- [facility/src/loopback.ts:259]($REPO/facility/src/loopback.ts:259)

`LoopbackLedger.open` checks the original URL, but `rawCall` uses `fetch` without disabling redirects and never validates `response.url`. Fetch follows redirects by default. A loopback endpoint returning HTTP 307/308 can therefore forward the POST to a remote host; all subsequent calls repeat the escape.

The Rust signer correctly sets `max_redirects(0)`, but the facility path does not.

**What would falsify this finding:** a loopback responder issues a 307 to a non-loopback capture server; `LoopbackLedger.open` refuses and the capture server receives zero requests.

The faucet itself produced no finding: it is not a ledger read, its claimed address is re-derived from the returned seed, and its confirmation retry uses `LoopbackLedger`.

## 2. `tapFailHard`

### HIGH — there is an actual submission without `fail_hard`

File: [facility/run-facility.ts:149]($REPO/facility/run-facility.ts:149)

Exact call:

```ts
await ledger.call("submit", { tx_blob: blob });
```

It is deliberate negative-control code and its payload is plaintext, so this particular call does not expose a confidential amount. Nevertheless, it is a submission under `facility/` without the flag. That contradicts the driver header, README’s “only submission path” claim, and the stated ruling’s “any path at all” requirement.

The method-set test only pins methods on `FailHardSubmitter`; it cannot detect direct `ledger.call("submit", ...)`, despite claiming a new path cannot appear unnoticed.

**What would falsify this finding:** record every `submit` RPC initiated by `facility/` and show `fail_hard === true` on all of them, including the control.

## 3. `isLoopbackEndpoint`

No non-loopback-host bypass was found in the requested cases.

WHATWG `URL` canonicalizes `2130706433`, `0177.0.0.1`, `0x7f.1`, `127.1`, trailing-dot forms, uppercase schemes and Unicode digit forms to `127.0.0.1`; they therefore still reach loopback. IPv4-mapped IPv6 such as `[::ffff:127.0.0.1]` is refused. The prior userinfo, named-host and unterminated-IPv6 bypasses are refused.

The comment saying it accepts “only a dotted-quad literal” is technically false because canonicalization accepts the alternate IPv4 spellings, but I do not treat that as a security finding: the resulting host is still genuinely loopback.

## 4. Gate accuracy

### MEDIUM — the reported numbers are true, but the gate’s coverage claim is false

Files:

- [tools/check-loopback.ts:6]($REPO/tools/check-loopback.ts:6)
- [tools/check-loopback.ts:107]($REPO/tools/check-loopback.ts:107)
- [tools/check-loopback.ts:127]($REPO/tools/check-loopback.ts:127)
- [tools/check-loopback.ts:245]($REPO/tools/check-loopback.ts:245)

The numeric output is honest: it reported 13 `.ts` files, 26 matched literals, 13 non-loopback literals, two exemptions, and 12 literals under the hostile-fixture exemption. I found no E-141-style numerical miscount.

The broader claims are not true:

- “No file under `facility/`…” and the PASS sentence say `facility/`, but `walk` scans only `.ts`. README, JavaScript, JSON and other files are invisible.
- The header calls the exemptions “call sites”; the hostile fixture’s twelve strings are not call sites.
- Replacing every template interpolation with `1` lets partial-host interpolation pass. For example, ``http://127.${host}:5005`` normalizes to `http://127.1:5005`, which the gate accepts, although the runtime value could be `http://127.attacker.example:5005`.
- The self-test covers a wholly computed host, but not partial-host interpolation.

**What would falsify this finding:** a remote URL added to README or a non-TS source makes the gate fail, and the partial-host template above is classified as non-loopback.

## 5. Balance book and validation

### HIGH — the facility can attribute a validated transaction to the wrong party

File: [facility/src/facility.ts:415]($REPO/facility/src/facility.ts:415)

The comment at line 130 says a party’s address is derived from its seed and “never believed.” That invariant is enforced during construction and enrolment, but not in `drawdown` or `repay`.

`confidentialTransfer` uses the supplied address for ledger lookup and book updates, while `confidential()` supplies the seed to the signer. A mismatched `Party { address: Y, seed: X }` can consequently produce a validated transaction signed by X while debiting or crediting Y in the book. These methods also do not require that the supplied party be in `suppliers`.

The bundled driver currently passes checked parties, but the exported application API does not enforce its documented invariant.

**What would falsify this finding:** calling `repay` or `drawdown` with an unenrolled or seed/address-mismatched `Party` is refused before signer startup and before any book mutation.

### MEDIUM — a rejected negative movement corrupts the in-memory book

Files:

- [facility/src/book.ts:172]($REPO/facility/src/book.ts:172)
- [facility/tests/book.test.ts:106]($REPO/facility/tests/book.test.ts:106)

`record` mutates the stored `Position` first and checks for negativity afterward. Throwing does not roll the mutation back.

Starting from spending 10, a rejected `send-out` of 11 leaves the in-memory spending balance at −1, although the disk file still says 10. The test asserts only that an exception is thrown, so it passes against this corrupted state.

**What would falsify this finding:** after the rejected movement, `expected(account)` remains 10 and the movement count remains unchanged.

### MEDIUM — issuance configuration can continue without validated success

File: [facility/run-facility.ts:240]($REPO/facility/run-facility.ts:240)

`MPTokenIssuanceSet` is sent with `submitBlob`, checked only for provisional `tes`, and then:

```ts
await submitter.waitValidated(set.hash);
save();
```

The returned value is ignored. `null` or validated non-success metadata does not stop setup. This bypasses the stronger `submitValidated` method already used elsewhere.

No ordinary facility movement is currently recorded before validation: the latest `submitValidated` checks validated metadata and callers record only afterward. That narrower property is sound.

**What would falsify this finding:** a fake node returns provisional `tesSUCCESS` followed by `null` or final `tec`; the driver must refuse before saving or continuing.

## 6. Comments, README and driver output

### HIGH — the driver claims execution and state-transition evidence it does not possess

Files:

- [facility/run-facility.ts:2]($REPO/facility/run-facility.ts:2)
- [facility/run-facility.ts:20]($REPO/facility/run-facility.ts:20)
- [facility/README.md:126]($REPO/facility/README.md:126)

The driver calls itself “executed on Devnet” and says every confidential movement is checked before and after for public amount, outstanding amount, balance version and decrypted balance.

The current README explicitly says the walkthrough was “written to be executed and never executed,” and records that the node never finished syncing. In the code, only the initial float checks the outstanding-amount delta. Later movements reconcile decrypted balances, but there are no before/after assertions over all four named fields and no balance-version assertions.

The fail-hard control also cannot distinguish its two arms: it submits the same hash first with and then without the flag, never asserts `withFlag.applied === false`, and attributes final ledger presence to the unflagged arm. If the flagged arm were incorrectly applied, the final lookup would still print “✓ The flag is the difference.”

**What would falsify this finding:** supply a completed run record and show per-confidential-transaction assertions over all four named fields; separately, make a node apply the flagged arm and show the control refuses rather than printing success.

### MEDIUM — “no plaintext amount appears again” is contradicted immediately by enrolment

Files:

- [facility/run-facility.ts:309]($REPO/facility/run-facility.ts:309)
- [facility/src/facility.ts:322]($REPO/facility/src/facility.ts:322)
- [FACILITY-WALKTHROUGH-2026-08-20.md:108]($REPO/docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md:108)

Each says that after the float conversion no plaintext amount appears until retirement or resize. The next stage pays every supplier publicly and performs a supplier `ConfidentialMPTConvert`, whose amount is also plaintext.

The driver additionally prints each “hidden” drawdown/repayment amount numerically at [run-facility.ts:274]($REPO/facility/run-facility.ts:274). That is a local stdout disclosure rather than an on-ledger leak, but the output label is still misleading.

**What would falsify this finding:** inspect every validated transaction between float conversion and retirement and find no plaintext amount; separately, hidden movements’ stdout contains no numeric amount.

### MEDIUM — the signer-boundary comment says the facility never sees a secret, but it holds and writes every seed

File: [facility/src/signer.ts:6]($REPO/facility/src/signer.ts:6)

Exact claims include “it never sees a secret” and outbound “No … seed.” But `SignerProfile` contains `accountSeed`, and the facility writes it as `account_seed` in `profile.json`. `Party` also carries each seed, and the facility derives ElGamal secret keys for reconciliation.

This is inconsistent with the code’s own later admission that one process holds every seed. It misstates a load-bearing boundary rather than merely choosing loose terminology.

**What would falsify this finding:** the TypeScript process neither receives nor writes seeds or derived secret keys, or the sentence is explicitly scoped only to the IPC `prepare` request.

### MEDIUM — the advertised non-auto-confirm path cannot perform human confirmation

Files:

- [facility/run-facility.ts:18]($REPO/facility/run-facility.ts:18)
- [facility/src/signer.ts:117]($REPO/facility/src/signer.ts:117)
- [facility/src/signer.ts:154]($REPO/facility/src/signer.ts:154)

The CLI presents `--auto-confirm` as optional. The signer child’s stdin/stdout/stderr are pipes, the driver sets `quietSigner: true`, and the only code that writes `CONFIRM` does so when `autoConfirm` is true. There is no forwarding from the operator’s terminal.

Without the flag, the prompt is hidden and no human input can reach the signer; the facility merely waits for timeout.

**What would falsify this finding:** running without `--auto-confirm` displays the signer’s confirmation in the operator’s terminal and forwards that terminal’s response to the child.

### MEDIUM — the README’s P-8 claim is false in the same directory

Files:

- [facility/README.md:167]($REPO/facility/README.md:167)
- [facility/src/book.ts:12]($REPO/facility/src/book.ts:12)
- [facility/tests/book.test.ts:173]($REPO/facility/tests/book.test.ts:173)

README says no per-iteration figure appears anywhere under `facility/`. Both `book.ts` and its test state “~2.49 µs per unit” without the hardware, parameter set and methodology required by P-8.

**What would falsify this finding:** no bare benchmark figure remains under `facility/`, or each occurrence supplies the required context and the README no longer claims absence.

## 7. Tests

The negative-book test and fail-hard driver control have the false-pass modes described above.

One additional false test claim exists: [facility/src/signer.ts:215]($REPO/facility/src/signer.ts:215) says `facility/tests/signer.test.ts` asserts the notice wording, but no such file exists.

The hostile `test.each` input is not empty and its explicit length assertion is meaningful. I found no empty parameterized tests.

## 8. Confidential amounts

No additional on-ledger amount leak was found beyond the already acknowledged plaintext `Payment`, every `Convert`, every `ConvertBack`, and canonical-zero observability. Confidential Sends remain amount-free at the transaction-field level, and no facility-built Devnet transaction adds `NetworkID`.

The local book, saved run history, and stdout do retain or print hidden amounts in plaintext. The book’s plaintext nature is disclosed; the stdout issue is covered above.
