# What the research established about XLS-96

- **Date:** 2026-09-02
- **Subject:** readings of the protocol, its reference implementation and its ecosystem
- **Devnet only.** No mainnet writes, at any phase, for any reason.

⚠ **None of this is a security claim about this project.** These are findings about
**XLS-0096** — status Draft, created 2026-01-15, and untouched upstream since 2026-08-10
as of the 2026-09-01 audit (E-1, E-216). It has changed since: PRs #604 and #628, merged
on 2026-09-03 and 2026-09-10, took in errata this project filed (E-316), and §6 below
records the one that touched a finding here. #604 also set its status to `Final`, read at
`58ccd3047` on 2026-10-18, and this paragraph did not say so until that day. Every finding below has a graded row in
[`CLAIMS.md`](../../CLAIMS.md), which is the authority if the two ever disagree.

⚠ **Several of these correct a reading this project published first.** Where that is so,
it is said at the finding rather than quietly fixed.

---

## 1. The proof sizes in XLS-0096 match the implementation

All seven constants agree between the specification and the library: pubkey 33, ElGamal
total 66, single Bulletproof 688, double Bulletproof 754, sigma standard 192, sigma
clawback 64, sigma ConvertBack 128.

**The two Bulletproof sizes were confirmed by execution, not by reading a header.** They
are identical at the revision rippled 3.3.0 pins (`0.4.0-rc4`) and at `1.0.4`.

⚠ **Two points are not a proof of no drift in between.** The claim is that the two
revisions agree, not that the format never moved. (**E-29**.)

## 2. The composition differs per transaction type

A common mistake — this project made it in its own README — is to describe `Send`'s
proof composition as though it were universal.

| transaction | proofs it carries |
|---|---|
| `ConfidentialMPTSend` | 192-byte compact sigma **+** 754-byte aggregated Bulletproof |
| `ConfidentialMPTConvertBack` | 128-byte compact sigma **+** 688-byte Bulletproof |
| `ConfidentialMPTConvert` | 64-byte Schnorr **key-possession** proof |
| `ConfidentialMPTClawback` | 64-byte compact **sigma** — issuer-side; the holder's signer has no use for it |
| `ConfidentialMPTMergeInbox` | **none** |

⚠ **Two different 64-byte proofs, and they are easy to conflate.** `Convert` carries a
Schnorr proof that the holder possesses their key; `Clawback` carries the *sigma clawback*
constant from §1. Same size, different construct, different party. **All five transaction
types are accounted for here** — an earlier version of this table listed four and left §1's
`sigma clawback 64` mapping to nothing.

## 3. Proving is dominated by the Bulletproof — about 99% of it

**Apple M3 Pro, macOS 26.6.1, Apple clang 21 at `-O3`, n=50:**

| operation | median |
|---|---|
| aggregated Bulletproof, proving | 34.6 ms |
| aggregated Bulletproof, verification | 16.1 ms |
| 192-byte compact sigma, proving | +0.2 ms |
| 192-byte compact sigma, verification | +0.3 ms |

⚠ **Quote the hardware with the number or do not quote the number** (**P-8**). Full
hardware, flags and spread: [`benchmarks-2026-08-16.md`](../task-zero/benchmarks-2026-08-16.md).

## 4. The 1,000,000 decryption limit is a search window, not a ceiling

**And a large balance can decrypt faster than a small one** — which sounds impossible
until you see why.

Decryption brute-forces a discrete log across a **caller-supplied range**. Cost therefore
tracks *uncertainty*, not magnitude.

**Apple M3 Pro, macOS 26.6.1, Apple clang 21 at `-O3`** — ⚠ restated rather than back-referenced, because a table is what gets quoted out of context and **P-8 says quote the hardware *with* the number**:

| plaintext | window | width | time |
|---|---|---|---|
| 10¹⁶ | ±1000 around the expected value | 2 001 | **5.09 ms** |
| 42 | `[0, 1000000]`, the library header's suggested default | 1 000 001 | **2 589.6 ms** |

The large balance is fast because the caller **already knew it to within ±1000**. Nothing
about magnitude makes it faster.

**The measured rate is ~2.49 µs per unit of range**, from a separate sweep across widths
1 000 / 5 000 / 20 000 / 50 000, sd < 1%. ⚠ **Do not derive that from the two rows above
and do not say they bracket it.** They imply ~2.54 and ~2.59 µs, and **both sit above
2.49**, not either side of it.

**No value is unrecoverable in principle.** But with no early exit and no sublinear
fallback shipped at the mpt-crypto `1.0.4` this project pins (upstream added one in
`1.0.5`, which its own header says is not constant-time; `CLAIMS.md` E-297), a cold search over a 10¹⁶ range is centuries — so in practice **the
window has to be known in advance**, which is a design constraint on any application that
must resynchronise a balance it has lost track of. (**F-7**, **F-8** — correcting this
project's own earlier reading, which had called 1,000,000 a hard bound.)

## 5. A confidential balance is invisible to XLS-65 vault accounting

**And the error code misattributes the cause**, which is the part that costs an
integrator time.

A holder with **750 public and 150 confidential** units deposited **700 public** into a
vault over the same issuance. The deposit succeeded; the confidential balance was
untouched. A follow-up deposit of **100** returned **`tecINSUFFICIENT_FUNDS`**.

⚠ **Invisible, not stranded** — and this project's first write-up said *stranded*, which
was false. The same holder then sent **50 confidential units** to another holder
successfully. The confidential balance cannot enter the vault; it remains fully spendable
by ordinary confidential operations. (**E-50**.)

**The misattribution:** the holder *does* own the units. The error says the funds are
insufficient and nothing in the response points at confidentiality, so an integrator has
no signal to follow. **Reproduced on a second, independent transactor** on the lending
side. (**F-14**.)

⚠ **For anyone composing XLS-96 with the ledger's vault or lending primitives, this is
the first-order finding here.** It is filed upstream as
[XRPL-Standards #611](https://github.com/XRPLF/XRPL-Standards/issues/611).

## 6. The `MPToken` deletion blocker is conditional, and the specification now says so

⚠ **This section said the specification was wrong until 2026-10-18.** It was, when
written, and upstream has since fixed it. What follows is the finding and its outcome.

XLS-0096 used to say, in §7.4, that a holder's `MPToken` *"cannot be deleted from the
ledger once confidential fields have been initialized"*, unconditionally, even at
zero balance. rippled never enforced it that way. `MPTokenHelpers.cpp`'s
`removeEmptyHolding`, used by the vault and loan-broker transactions, blocks deletion
whenever any confidential field is present. `MPTokenAuthorize.cpp`'s
holder-unauthorize path returns `tecHAS_OBLIGATIONS` only while the issuance-level
`sfConfidentialOutstandingAmount` is non-zero. Upstream tests pin both behaviours, so
both are intended (**F-29**, read at rippled 3.3.0 source and not executed).

This project filed the difference as
[XRPL-Standards #610](https://github.com/XRPLF/XRPL-Standards/issues/610). XLS-0096
PR #604, merged on 2026-09-03, rewrote the section, and #610 was closed on 2026-09-10
(**E-316**). At commit `58ccd30` the rule is in §7.2 and states both policies. A
holder's own deletion is blocked while the issuance's `ConfidentialOutstandingAmount`
is non-zero. Deletion by those vault and loan-broker transactions is blocked while any
confidential field is present.

**For a holder, the reserve is locked until every holder of the issuance has left
confidential form**, which no single holder controls.

## 7. The client-side tooling gap closed upstream during the research

`ripple-binary-codec@2.9.0` ships **all five** Confidential MPT transaction types and
**all 18** confidential fields, every code matching this project's independent reading of
the specification. **No patched `definitions.json` was ever needed** (**E-30**).

`@xrplf/mpt-crypto@0.1.0` is published and reproduces an accepted transaction's context
hash byte for byte (**E-53**).

⚠ **`xrpl.js` is the half NOT re-checked.** This project does not depend on it. **Check
it rather than inheriting this sentence** — a named gap is a correct output.

---

## What none of this establishes

⚠ **A demo of the happy path is not evidence of confidentiality.** That is what
`tools/observer-harness.ts` is for. The disclosure findings — what the ledger publishes,
who can decrypt, and the exact scope of the recognisable encrypted zero — are in the
README's **Trust model**, not here, because they bear on whether to use the protocol at
all rather than on how it performs.
