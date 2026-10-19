# REVIEW-017c — adjudication, ADR-0002 round two

**Date:** 2026-08-20. Two independent legs — `REVIEW-017a` (Gemini),
`REVIEW-017b` (Codex) — against **revision 2**, which is what rev 2's own
acceptance item 1 required and which nobody had done.

**Verdict: revise, do not accept. Rev 3 is the result.** Both legs said revise;
neither said reject; both affirmed the core decision.

**⚠ ADR-0002 is still `Proposed`, and this round could not change that.** Item 2
is a scope question the ADR itself says is not a coding session's call, and item
4 is unresolved. What changed is that the ADR now says what it actually knows.

---

## 1. The finding that mattered most, and neither round-one leg saw it

**The Decision sentence asserted something the ADR reopened two sections later.**

Rev 2 decided *"the project does not build on XLS-66, **and does not use an
XLS-65 `Vault` object**"* — and then, under *Alternatives*, downgraded the
hybrid's rejection to *"a weighable tradeoff"* and called it *"an open question
for the rotation, not a settled rejection."*

Codex: *"the ADR can be accepted for rejecting native XLS-66, but not for
rejecting the hybrid until scope decides… it currently contains a settled
conclusion and an unsettled conclusion in one sentence."*

**Upheld.** Rev 3 splits it: **Decision A** (native XLS-66 rejected) is settled
and is what building proceeds on; **Decision B** (a `Vault` on the funding side)
is open and gates the funding side only.

That split has a practical consequence worth stating: **the supplier-facing work
is not blocked.** §9's drawdown and repayment side uses `ConfidentialMPTSend`
under either resolution of Decision B.

## 2. Upheld without qualification

| Finding | Both legs? | Disposition |
|---|---|---|
| **Acceptance item 3 is stale** — says *"two of fifteen transactor paths"* when GAP-8 closed 2026-08-17 with all fifteen | **Yes, independently** | Corrected. ⚠ The ADR had been understating its own evidence for three days, in the list of what stops it being accepted |
| **The hybrid table is incomplete** | **Yes**, with different missing rows each | **Both sets added.** Gemini's cost the hybrid (boundary crossings, yield realisation); Codex's favour it (protocol-native accounting, withdrawal enforcement) and count against it (compliance surface). A table doing the weighing cannot leave them in prose |
| **Corrected blocker 3 is stated too narrowly** | Both, differently | Codex's version taken — see §4 |
| **U-24 asserted in Consequences while item 4 is open** | Gemini | Qualified |

## 3. ⚠ REJECTED — Gemini: *"the hybrid is structurally disqualified, so item 2
## dissolves"*

The most consequential claim in the round, and the one that would have let a
coding session close a question the ADR reserves for whoever owns scope. **It
does not hold.**

**The argument:** in the hybrid, capital must cross the plaintext boundary for
every drawdown (`VaultWithdraw`) and every repayment (`VaultDeposit`, so share
value can move), so per-supplier drawdown and repayment amounts are *"public"*,
not hidden — and the ADR's table rows 6–7 are therefore false.

**Why it is rejected.** The leg's own text supplies the refutation: it writes
*"public **or tranche-leaked**"*. Those are different outcomes, and only the
second is what a real design does. Under aggregate tranching, per-supplier
amounts stay hidden and what leaks is the *frequency and size of aggregate
crossings*.

**And §9 does exactly the same thing.** The ADR says so in the sentence that
demolished rev 1's ground 1: *"§9's own design already funds a Dedicated Account
publicly in aggregate and converts once in plaintext."* The hybrid crosses more
often; it does not cross differently.

**So the difference is degree and frequency, not kind.** That is a real cost and
rev 3 puts it in the table as rows 9 and 10. It is not a structural
impossibility and it does not dissolve item 2.

⚠ **The yield-realisation half of the leg's argument is the strong half and is
adopted:** share value moves only when `sfTotalAssets` moves, which needs
plaintext deposits, so financing margin becomes inferable over time. That is a
genuine cost rev 2 did not count. It makes the hybrid *more expensive*.

**This is the fifth time a leg's diagnosis has been right while its conclusion
overshot.** *A review finding is evidence, not an instruction.*

## 4. ⚠ PARTLY REJECTED — Gemini's field-wraparound objection to blocker 3

The leg argued rev 2's corrected blocker 3 is *"still cryptographically
flawed"* because a fractional rate needs division by 10⁴ and multiplying by
`10000⁻¹ mod q` wraps the field for any value not an exact multiple.

**That is arithmetically correct and it is not a refutation.** It is a precise
instance of the thing rev 2 already named — *"a new proof relation for the
non-linear part (rounding, fixed-point truncation)"*. Fixed-point truncation is
exactly where the wraparound is handled. The leg restated rev 2's own caveat as
though it contradicted it.

**Codex's objection is the one that stands, and it is new:** XLS-66 accrues loan
state **autonomously on ledger closes**, and a ZK relation needs a prover
holding the witness. Client-submitted proofs for every accrual would turn XLS-66
from an autonomous state machine into a client-driven settlement layer — a
different protocol, not a feature. Plus the breadth point: rounding and
truncation are *examples* of what would need proving, alongside payment/state
linkage, range and non-negativity, fees, overpayment, and boundary rules.

Rev 3 takes Codex's version and adds the autonomy argument, which neither
revision had.

## 5. What both rounds agree on, and it is the load-bearing part

**The five blockers stand.** Round one did not dispute them; round two was told
not to re-litigate them and both legs independently affirmed the decision
anyway. Gemini: *"the decision does not rest on a thin base; it rests on the
concrete protocol mechanics of XRPL Devnet."* Codex: *"Rejecting native XLS-66
still follows from blockers 1, 2, 3, 4, and 5."*

**Two arguments fell in round one and neither was load-bearing.** That is the
useful pattern: rev 1 made a correct decision with two bad arguments among five
good ones, and two rounds of review removed the bad ones without moving the
conclusion.

## 6. What this round did NOT settle, and why

- **Item 2 — is investor-side confidentiality in scope?** Narrowed, not
  answered. **Nandan's call.** §7 states it.
- **Item 4 — the competing reading of F-10.** Untouched by this round; neither
  leg addressed it and neither was asked to.
- **Whether Decision B's answer changes with F-23.** Codex raised that the local
  signer's failed-proof exposure belongs in the weighing and that the hybrid
  does not remove it. Recorded in the table; not decisive either way.

## 7. ⚠ The question for whoever owns scope, in the sharpest form this round produced

Rev 2 asked: *is investor-side confidentiality in scope?* Rev 3 asks something
narrower and more answerable:

> **Is it acceptable for each investor's contribution, position and redemption
> to be public on the ledger, and for the facility's aggregate yield to become
> inferable over time from recurring plaintext deposits — in exchange for
> protocol-native share accounting and withdrawal enforcement that the
> application layer would otherwise reimplement worse?**
>
> **Per-supplier amounts are hidden either way.** That was never the question,
> and rev 2's table made it look like it might be.

If **yes**, the hybrid is likely the better design and Decision B should adopt an
XLS-65 `Vault` for the funding side.
If **no**, Decision B rejects it and rev 3's Decision A and B merge back into
one sentence — the one rev 2 asserted before it had earned it.

## 8. Verification

- GAP-8's closure checked at source (`XLS-66-INVESTIGATION-2026-08-16.md`), not
  taken from the leg.
- The `VaultWithdraw`/`VaultDeposit` mechanics in §3's rejection are reasoned
  from the ADR's own blocker 2 and from §9's design, both already evidenced.
- ⚠ **Nothing in this round was executed on Devnet.** It is a document review.
  The blockers it rests on were executed in earlier sessions and are cited, not
  re-run.
