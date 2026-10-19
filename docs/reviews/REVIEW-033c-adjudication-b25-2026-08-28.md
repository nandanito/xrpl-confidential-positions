# REVIEW-033c — ADJUDICATION — B-25, round three

Frozen `dee8570c8996deae3976d043d1566b65870c7adf`. Legs: **033a** Gemini 3.1 Pro
(High), inline packet, no tools; **033b** Codex, read-only repo access;
**033s** self leg, repo + compiler + Miri.

⚠ **DIRECTION IS RECORDED ON EVERY CONTESTED RULING, because the adjudicator is
the interested party** — this round's outcome is *whether the rotation stops*,
and the adjudicator is the one who would otherwise run round four.

⚠ **Nine findings. Six upheld, three rejected.** Every rejection is recorded with
its reason so a later session does not relitigate it.

⚠ **The two legs DISAGREED, on the record, and that is what differed packets
bought (E-180).** `033a` declared a **construction defect**; `033b` declared
**none**. They disagreed on the two specific findings that carried that verdict,
and `033b` refuted both of `033a`'s HIGHs by name.

---

## The ruling table

| # | raised by | claim | ruling | grade |
|---|---|---|---|---|
| 1 | **033a-4 AND 033b-1**, independently | `dropping_a_scalar_overwrites_its_bytes` reads through invalidated provenance | ⚠ **UPHELD — MEASURED by the adjudicator under Miri, both borrow models** | **HIGH** |
| 2 | **033b-2**, with **033a-6** | `single_decode_findings` counts lexical call sites, and its helper sweep matches `\nfn ` only | ⚠ **UPHELD — four uncaught mutations MEASURED** | **MEDIUM** |
| 3 | **033a-5** | a second decode hidden between `"/*"` and `"*/"` string literals false-passes the same check | ⚠ **UPHELD — MEASURED** | **MEDIUM** |
| 4 | **033s-3** | the string-literal residual is cited to a part-6 block that does not exist | **UPHELD — MEASURED** | LOW |
| 5 | **033s-1, 033a-3, 033b-3** — all three | the `U256` residual's stated reason is a false dichotomy | **UPHELD — MEASURED** | **MEDIUM** ⚠ *grade contested* |
| 6 | **033s-2 AND 033b-4**, independently | part 6 has twelve controls, not ten | **UPHELD — MEASURED** | LOW |
| 7 | 033a-1 | moved-from source slots are an *unnamed* residual | ⚠ **REJECTED as new; narrow point taken** | LOW |
| 8 | 033a-2 | the new `Drop` adds a data-dependent timing difference in `derive_pair` | ⚠ **REJECTED; diagnosis correct, consequence overstated** | — |
| 9 | 033a-7 | `B23_SITES` has 11 entries, not 12 | **REJECTED — MEASURED, twice, independently** | — |

---

## 1. HIGH — the falsifier for the round's own subject is Undefined Behaviour

⚠⚠ **Both external legs found this and neither could run Miri. The adjudicator
could, and the answer is unambiguous.**

`signer/src/scalar.rs`: the tag is created by a `SharedReadOnly` retag at `:380`
(`held.as_bytes().as_ptr()`), invalidated by a `Unique` retag at `:385`
(`ManuallyDrop::drop(&mut held)`), and read at `:389`.

* **Stacked Borrows:** `Undefined Behavior: attempting a read access using
  <525589> … but that tag does not exist in the borrow stack for this location`.
* **Tree Borrows:** `Undefined Behavior: read access through <518924> … is
  forbidden`.

⚠ **This test is the ONLY real falsifier B-25 has for its own headline claim.**
Its neighbour `a_scalar_wipes_on_drop` asserts a marker trait, and B-25 itself
measured that the marker **still passes with `Drop::drop` emptied**. So the
byte-level test carries the whole warrant — and it is UB.

⚠ **Its own docstring says *"a test that is undefined behaviour proves
nothing"*,** about the naive version it rejected. **It is describing itself.**
The `ManuallyDrop` was adopted to avoid a use-after-free and it did avoid that
one; it introduced an aliasing violation instead, which the same sentence
condemns and which nothing in the suite could see.

**The remedy is measured, not proposed.** Both legs offered a fix, they differ,
and per this project's standing rule a leg's diagnosis can be right while its fix
is wrong — so all candidates were run in a scratch crate holding `scalar.rs`
verbatim from the frozen commit:

| candidate | Miri SB | Miri TB | fails when `Drop::drop` is emptied? |
|---|---|---|---|
| current | ⚠ **UB** | ⚠ **UB** | undecidable |
| `a_scalar_wipes_on_drop` (marker) | ok | ok | ⚠ **NO** |
| **A** — `033a`'s: `&mut *held` → `*mut Scalar`, `ptr::drop_in_place`, read through it | ok | ok | ⚠ **YES** |
| **B** — re-read `held.as_bytes()` after the destructor | ok | ok | ⚠ **YES** |
| **C** — call `Zeroize::zeroize`, read back | ok | ok | ⚠ **NO** |

⚠⚠ **Candidate C is the trap and it is why the remedies were measured rather
than reasoned.** It is sound, it reads like the same test, and it **passes with
the destructor emptied** — it exercises `Zeroize`, and the property at issue is
`Drop`. **A sound replacement is not automatically a falsifier.**

⚠ **`033b` proposed a third construction (`MaybeUninit<Scalar>`).** Not adopted:
**B is adopted**, because it needs **no raw pointer and no `unsafe` for the
read** — `ManuallyDrop` already keeps the storage owned, so an ordinary `&self`
read after the destructor is both sound and sufficient. ⚠ **The unsafe block that
made this test UB was never load-bearing.** A is kept alongside as the
raw-pointer form, because two constructions that must agree is the discipline
this file already uses.

**Direction:** upheld against the adjudicator's interest — this is the round's
HIGH and it is in a test the adjudicator's own request had already singled out
as attack point 5 **and then did not measure before launching**.

## 2. MEDIUM — the single-decode check counts call sites, not executions

`tools/check-zeroize-bounds.py:754`, `total = sum(body.count(d) for d in DECODERS)`.

**Four mutations MEASURED against the gate's own function, all returning `[]`:**

| mutation | raised by |
|---|---|
| a `pub fn duplicate_decode(` helper `derive_raw` calls | 033a-6 / 033b-2 |
| `fn duplicate_decode (` — one space before the paren | 033s |
| a closure bound once and **called twice** | ⚠ **033b, alone** |
| the same decode inside `for _ in 0..2` | ⚠ **033s, extending 033b** |

The undisguised second decode **is** caught, so the check is not inert — it is
scoped to one spelling of one shape.

⚠⚠ **This is the fourth consecutive round in which a gate built to catch false
passes false-passed, and the THIRD in which the reason is that its controls
replay the previous round's attack.** B-25 added exactly four controls and all
four are `REVIEW-032`'s four mutations, verbatim. ⚠ **The helper sweep matches
`\nfn ` while `_fn_body`, ten lines above it, handles both `fn` and `pub fn` —
the fix was written against the finding's list rather than against the
property.** E-168's sentence, one layer out from where it was learned.

## 3. MEDIUM — the narrowed "safe direction" claim is false, in the fix for the general one

`tools/check-zeroize-bounds.py`, `strip_line_comments`.

B-25 correctly retracted *"it can only make a needle harder to satisfy, never
easier"* and replaced it with: *"a `//` or `/*` INSIDE a string literal strips
more than it should, and THAT direction is safe. **The general claim was the
false one.**"*

⚠ **The replacement is also false, and for a reason visible in the same file.**
The stripper feeds two consumers with opposite polarity. For a **needle**
(`find_missing`), stripping more is safe — it can only report a site missing.
For `single_decode_findings`, the rule is `total != 1`, a **maximum**, so
stripping more makes it **easier** to satisfy.

**MEASURED:**

```rust
let _decoy  = "/*";
let _again  = xrpl::decode_ed25519_seed(family_seed);   // a real second decode
let _decoy2 = "*/";
```

→ `single_decode_findings` returns `[]`. **The identical mutation without the two
decoy literals is caught.**

⚠ **Second retraction of the same sentence in two rounds, and the replacement was
narrowed rather than measured.** A claim just proved false in its general form is
the last one that should be granted its specific form on inspection.

## 4. LOW — a residual disclosed nowhere, cited as disclosed elsewhere

Same docstring: the string-literal cases *"are named in part 6's own 'what this
does not say' block rather than argued away."*

**MEASURED:** `grep -n "does not say"` returns that citation and one unrelated
banner. There is no such block. Grepping part 6 for `string literal` or `raw
string` returns nothing. ⚠ **The residual is named in no part of the gate**, and
the sentence asserting otherwise is what a later reader relies on.

## 5. MEDIUM — the `U256` residual's reason is a false dichotomy ⚠ *grade contested*

All three legs upheld the substance. **They graded it HIGH (033a) / MEDIUM
(033s) / LOW (033b).**

The docstring: *"`U256` is the constant-time arithmetic type … and removing
`Copy` to add a destructor would rewrite the routine."* ⚠ **Every clause true,
conclusion false — wiping does not require a destructor, and only a destructor
requires removing `Copy`.**

**MEASURED** at the frozen commit: `let (mut diff, borrow) = acc.sub(m);` plus
`zeroize::Zeroize::zeroize(&mut diff.0);` gives **zero compile errors** and
`cargo test --lib` **18 passed / 0 failed**, identical to baseline. Unconditional
and per-iteration, so data-independent; `Copy`, `select`, `shl1`, `sub` and the
mask discipline are all untouched.

⚠ **RULED MEDIUM.** `033a`'s HIGH overstates it: the residual is real, P-5
governs, and **the ledger of what is unwiped does not change** — only the reason
given for it does. `033b`'s LOW understates it: **this is E-181's and E-200's
exact shape** — a plausible sentence standing in for a measurement — and both of
those were HIGHs that hid live secrets for two milestones. ⚠ **It is written into
the file that documents the fix for those two.**

⚠ **Direction: MEDIUM sits between the two external legs and above the
adjudicator's own leg would have needed to go to matter.** The adjudicator raised
this finding in the request before the legs launched, so the risk was
*inflation*, not suppression; the ruling declines the higher of the two external
grades.

**The `acc` half is NOT the same one-liner** and all three legs agree: `acc` is
returned by value, so wiping it needs the modulus-specific tail moved inside the
function. `033b` puts it precisely — reachable without removing `Copy`, but a
change of ownership rather than one line.

## 6. LOW — twelve controls, not ten. **THIRTEENTH instance.**

`CLAUDE.md` B-25, `CLAIMS.md` row B-25, and the handover twice. The **thirteen
checks** is correct and derived from `len(B23_SITES) + 1`; **the ten is
hand-written**, and the gate prints twelve.

⚠ **The miscount is a loop.** Reading the source counts nine `print("  CONTROL`
sites; four of them are one `print` inside a loop over four `_MUTS`, so running
it prints twelve. ⚠ **A number derived from source structure is not derived from
behaviour** — and this is the part whose header was already rewritten twice for
miscounting (E-189, E-199).

Found by `033s` and `033b` independently. `033b` also confirmed the test count:
282 `#[test]` attributes minus four ignored Devnet tests = **278**, which matches
`cargo test`.

---

## The three rejections

### 7. REJECTED as new — moved-from source slots (033a-1, graded HIGH)

Rust moves are `memcpy` and the source is not dropped: true, and **already a
named residual.** `CLAIMS.md` B-22 names *"the `Sha512` block buffer, **the source
of every move**, and `serde_json`'s parse scratch"*, and the request conceded it
in writing before the leg saw it.

⚠ **`033b` independently refutes the framing** — *"no explicit scalar clone,
owning container, `take`, `swap`, or partial move in production. Every
cryptographic consumer borrows it."* Verified: every consumer in `prover.rs`,
`store.rs` and `session.rs` takes `&Scalar`.

⚠ **What survives is one sentence, and it is a real gap:** the caveat lives in
`CLAIMS.md` and **not at `scalar.rs`**, which is where B-25 gives a reader the
belief that these values wipe. **Taken as LOW**, fixed by naming it at the site.

### 8. REJECTED — drop-on-the-error-path timing (033a-2, graded HIGH)

The mechanism is real and correctly diagnosed: in `randomness::derive_pair`, if
`rho`'s reduction returns `ZeroScalar`, the already-bound `r` is now dropped on
the way out, and before B-25 it was not.

⚠ **The consequence does not follow.** That branch is `reduce_wide`'s zero case,
which architecture §4 **already rules** as a permitted secret-dependent branch,
and its outcome is **externally visible**: the signer refuses to sign and reports
`EntropyUnavailable`. **A timing difference on a path that announces itself is
not a channel.** The probability is ≈2⁻²⁵⁶, and the constant-time claim in
`scalar.rs` is scoped to `reduce_wide_mod`'s control flow, where no `Scalar`
exists and nothing was added.

⚠ **`033b` reached the opposite conclusion independently and called the drop
*correct*** — *"the already-derived `r` is now correctly dropped and wiped during
`?` propagation. There is no new data-dependent branch inside the reduction
loop."*

**Direction: this rejection favours the artifact, so it is the one to distrust.**
It is recorded with its full mechanism, and E-170's rule applies — **the point
beneath is worth a sentence at the site**, because B-25 added drop glue to a type
on the constant-time path and no document says anyone considered it. That
sentence is in the fix set.

### 9. REJECTED — `B23_SITES` has 11 entries (033a-7)

**MEASURED twice, independently:** `len(B23_SITES)` is **12**, and the gate
prints twelve `present` lines. `033b` reached 12 by AST-executing the assignment
itself. The leg counted a pasted list by eye — ⚠ **the exact failure mode this
project has thirteen recorded instances of, committed by a leg reporting a
count finding.**

---

## ⚠ CONVERGENCE — the ruling that ends the rotation

**The legs disagreed and the disagreement is the whole question.** `033a`: *"There
IS A CONSTRUCTION DEFECT … the rotation must continue."* `033b`: *"the findings
are only gates, sentences, and a count. The `Scalar` producer construction is
correct; there is no CONSTRUCTION defect."*

⚠⚠ **RULED: CONVERGENCE IS REACHED. There is no round four.**

The reasoning, stated so it can be attacked:

1. ⚠ **`033a`'s construction-defect verdict rests on exactly two findings — its
   own 1 and 2 — and both are REJECTED**, one as already-named conceded ground
   and one because `033b` independently refuted it. **No finding that survived
   adjudication is a defect in the construction.**
2. **Everything upheld is a test, a gate, a sentence or a count.** Finding 1 is a
   *falsifier* — the strongest thing found, and still not the construction.
   Findings 2, 3 and 4 are the gate. Finding 5 is a reason. Finding 6 is a number.
3. **All three legs affirm the construction positively**, not by silence. `033b`
   checked for clones, containers, `take`, `swap` and partial moves and found
   none. `033s` checked where the long-lived ElGamal secret actually lives and
   found `ElGamalKeypair` already carries a wiping `Drop`, and that
   `DerivedKey::into_keypair` consumes `self` so the `Zeroizing` source is wiped
   — **a hypothesis raised and cleared, recorded because an absence is a result.**

⚠ **Direction, and it is the one that matters in this document: convergence is
the outcome that ENDS THE ADJUDICATOR'S WORK, and the adjudicator ruled for it.**
The strongest case against this ruling is stated rather than omitted: **round
three found a HIGH, and rounds two and three have now both found a HIGH after
the previous round declared itself done.** A reader who weighs that above the
substance of the findings should order round four.

**It is not ordered, for one reason that is about kind rather than count:** the
HIGH is in the **falsifier**, not the thing falsified, and it was found by *two
independent legs plus a tool neither leg could run*. ⚠ **Round two's HIGH was a
live secret sitting unwiped behind a false comment; round three's is a test with
an aliasing violation.** That is convergence — the findings moved from the
construction to the instruments that check it. **A fourth round would review the
fixes to the fixes to the fixes.**

⚠ **`CLAUDE.md`'s two-round rule is therefore NOT amended.** The handover made
the amendment conditional on a construction defect and there is none. ⚠ **What
IS added is the condition under which round three was right to run**, because
that is the thing this session learned and the rule does not currently say it.

---

## The fix set — B-26

1. **Replace `dropping_a_scalar_overwrites_its_bytes` with candidate B**, keep A
   beside it as the raw-pointer form, and record the Miri evidence — **including
   that candidate C is sound and not a falsifier.**
2. **`single_decode_findings`:** match `pub fn` and tolerate whitespace; add all
   four measured mutations as controls; and ⚠ **NAME the limit a lexical check
   cannot pass — one call site executed twice.**
3. **`strip_line_comments`:** make it string-literal aware, closing both the
   `"/*"` hiding attack and the raw-string synthesis; controls for both.
   ⚠ **If any residual survives, name it truthfully — the polarity argument, not
   "that direction is safe".**
4. **Write the "what this does not say" block** the docstring cites, or delete
   the citation. Not both halves of a sentence pointing at nothing.
5. **`scalar.rs`:** apply the one-line `diff` wipe — it is free and measured —
   and rewrite the residual to name only what remains (`acc`), with the true
   reason. ⚠ **Devnet re-run required: this touches `reduce_wide_mod`, which is
   on the `r`/`ρ` signing path and the keygen path.**
6. **Correct "ten controls" to twelve, derived, in all four places.**
7. **Two sentences at the site:** the move caveat beside `impl ZeroizeOnDrop for
   Scalar`, and the drop-on-the-error-path argument in `randomness::derive_pair`.
