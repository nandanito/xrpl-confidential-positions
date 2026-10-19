# REVIEW-033s — SELF LEG — B-25

Frozen `dee8570c8996deae3976d043d1566b65870c7adf`. Round three.

⚠ **Written to a scratchpad and committed only after both external legs
returned** — `REVIEW-022`'s lesson and its neighbour: do not let your own answers
appear in the tree a repo-access leg is reading. The Codex leg was reading the
checkout for the whole time this was being written.

⚠ **This leg has repo access, a compiler and the ability to run the gate's own
functions, so unlike the other two nothing here is PREDICTED.** Every empirical
claim below was measured at the frozen commit, and each says how.

⚠ **Findings 1 and 2 were found BEFORE the legs launched and are in the request**
— finding 1 as attack point 3, with its measurement, because a leg asked to
confirm-or-refute a measurement is worth more than three legs re-deriving the
question. **Finding 2 is new here.** Everything else in this file is verification
of someone else's finding, and it is labelled as such.

---

# Findings

## 1. MEDIUM — the `U256` residual's stated reason is a false dichotomy

**FILE:** `signer/src/scalar.rs`, `reduce_wide_mod`'s docstring (the `NAMED
RESIDUAL` block, immediately above `fn reduce_wide_mod`).

The docstring says the residual is *"NOT fixed here deliberately"* because
`U256` *"is the constant-time arithmetic type — `select`, `shl1`, `sub` and the
mask discipline above all depend on it being a plain `Copy` value — and removing
`Copy` to add a destructor would rewrite the routine whose constant-time argument
is the reason it is written this way."*

⚠ **Every clause of that is true and the conclusion does not follow.** Wiping a
value does not require a destructor, and a destructor is the only thing that
requires removing `Copy`. `[u64; 4]` implements `zeroize::Zeroize` already.

**MEASURED** at the frozen commit, `let (diff, borrow) = acc.sub(m);` →

```rust
let (mut diff, borrow) = acc.sub(m);
zeroize::Zeroize::zeroize(&mut diff.0);
```

* `cargo build`: **zero errors** (`cargo build 2>&1 | grep -E "^error" | grep -v
  "could not compile" | wc -l` → `0`; the second filter is E-179's trap).
* `cargo test --lib`: **18 passed, 0 failed** — identical to the baseline, which
  is also 18 passed.
* The wipe is **unconditional and per-iteration**, so it is data-independent and
  costs the constant-time argument nothing. `Copy` is untouched, `select`,
  `shl1`, `sub` and the mask discipline are untouched, and the routine is not
  rewritten.

⚠ **This is E-181's and E-200's shape exactly** — *"the crate's boundary, not an
omission"*, *"a `k256` type this crate does not own"* — a plausible sentence
standing in for a measurement, written into the file that documents the fix for
those two. **The residual may still be accepted; it may not rest on this reason.**

**Falsified by:** a compile error on the probe, a `cargo test` regression, or an
argument that a fixed extra 4-word store per iteration is data-dependent.
⚠ **Not falsified by** the `acc` half being harder — `acc` is returned by value
and wiping it needs the modulus-specific tail moved inside, which is a real
restructure. **The `diff` half is the one the docstring names ("its 512
per-iteration `diff` values") and it is one line.**

## 2. LOW — part 6 has TWELVE controls, not ten. Thirteenth instance.

**FILE:** `CLAUDE.md` (B-25 status block), `CLAIMS.md` row B-25,
`docs/NEXT-SESSION-PROMPT.md:9` and `:157`.

All four say *"part 6 is THIRTEEN checks with **ten controls**"*. The thirteen is
right and is derived from `len(B23_SITES) + 1`. **The ten is hand-written.**

**MEASURED** — `make check-zeroize-bounds` from the repository root, then
`sed -n '/^Part 6/,/^----/p' | grep -c CONTROL` → **12**. They are: the two
arm-reverts, the four `_MUTS` (one `print` inside a loop over four entries — which
is how a static read of the source undercounts), the unmodified-tree control, the
absent-site and present-site controls, and the nested / block / line comment
controls.

⚠ **The miscount is the loop.** Reading the file counts nine `print("  CONTROL`
sites; running it prints twelve. **A number derived from source structure is not
derived from behaviour**, and this is the part of the file whose header was
already rewritten twice for miscounting (E-189, E-199).

**Falsified by:** a `grep -c` of the part 6 region of the gate's real output
returning 10.

## 3. LOW — a residual is cited to a block that does not exist

**FILE:** `tools/check-zeroize-bounds.py:543`, in `strip_line_comments`'s
docstring.

*"the string-literal cases are NOT [fixed], and are named in part 6's own 'what
this does not say' block rather than argued away."*

**MEASURED:** `grep -n "does not say" tools/check-zeroize-bounds.py` returns
**three** lines — this citation at `:543`, an unrelated banner at `:985`, and
nothing else. There is no *"what this does not say"* block in part 6. `awk 'NR>600'
… | grep "string literal\|raw string"` returns **nothing**: the string-literal
residual is named in **no** part of the gate.

⚠ **So the residual B-25 says it disclosed elsewhere is disclosed nowhere**, and
the sentence claiming otherwise is what a later reader would rely on. **Discovered
while verifying `REVIEW-033a` finding 5, not independently** — see *What this leg
missed*.

**Falsified by:** the block existing under another name that a reader would find.


## 4. HIGH (verification, not discovery) — the byte-level `Scalar` test is UB, MEASURED

**FILE:** `signer/src/scalar.rs:389` (the read), invalidated at `:385`, tag
created at `:380`.

⚠ **BOTH external legs asserted this and NEITHER could run Miri.** This leg
could, and did. `rustup +nightly component add miri`, then
`CARGO_TARGET_DIR=/tmp/wconf/miri-target cargo +nightly miri test --lib
scalar::wiping_tests` — an isolated target directory, so the Codex leg's
read-only checkout was never contended.

**MEASURED, both borrow models, at the frozen commit:**

* **Stacked Borrows:** `error: Undefined Behavior: attempting a read access using
  <525589> … but that tag does not exist in the borrow stack for this location`,
  `--> src/scalar.rs:389:30`. Miri names the whole chain: *"`<525589>` was created
  by a SharedReadOnly retag"* at `:380`, *"was later invalidated … by a Unique
  retag"* at `:385`.
* **Tree Borrows** (`-Zmiri-tree-borrows`): `error: Undefined Behavior: read
  access through <518924> … is forbidden`.
* `a_scalar_wipes_on_drop` — the marker-trait test beside it — **passes under
  both.** It is sound and it is not a falsifier.

⚠ **The docstring on this very test says *"a test that is undefined behaviour
proves nothing"*, about the version it rejected.** It is describing itself.

**AND THE REMEDY IS MEASURED TOO** (memory: a leg's diagnosis can be right while
its fix is backwards). Three candidates, in a scratch crate holding `scalar.rs`
verbatim from `dee8570` so the repository stayed pristine while the Codex leg
read it:

| candidate | Miri SB | Miri TB | fails when `Drop::drop` is emptied? |
|---|---|---|---|
| **current** `dropping_a_scalar_overwrites_its_bytes` | ⚠ **UB** | ⚠ **UB** | undecidable — it is UB |
| `a_scalar_wipes_on_drop` (the marker) | ok | ok | ⚠ **NO — passes** |
| **A:** `let ptr: *mut Scalar = &mut *held;` then `ptr::drop_in_place(ptr)`, read through `ptr` | **ok** | **ok** | ⚠ **YES — FAILED** |
| **B:** re-read `held.as_bytes()` after `ManuallyDrop::drop(&mut held)` | **ok** | **ok** | ⚠ **YES — FAILED** |
| **C:** call `Zeroize::zeroize` and read back | ok | ok | ⚠ **NO — passes** |

⚠ **Candidate C is the trap.** It is sound, it looks like the same test, and it
**passes with the destructor emptied** — because it exercises `Zeroize` and the
property at issue is `Drop`. **A sound replacement is not automatically a
falsifier**, and only breaking it says which is which.

⚠ **Candidate B needs no raw pointer at all** — `ManuallyDrop` keeps the storage
owned, so the ordinary `&self` read after the destructor is both sound and
sufficient. The unsafe block that made the test UB was never load-bearing.

## 5. MEDIUM (verification) — `single_decode_findings` counts CALL SITES, not EXECUTIONS

**FILE:** `tools/check-zeroize-bounds.py:754`, `total = sum(body.count(d) for d in DECODERS)`.

`REVIEW-033b` finding 2, **reproduced and extended here.** Driving the gate's own
function on a mutated `keygen.rs`:

| mutation | `single_decode_findings` |
|---|---|
| `pub fn duplicate_decode(` helper called by `derive_raw` | ⚠ `[]` — **FALSE PASS** |
| `fn duplicate_decode (` — one space before the paren | ⚠ `[]` — **FALSE PASS** |
| a closure bound once and **called twice** (`033b`'s) | ⚠ `[]` — **FALSE PASS** |
| the same decode inside a `for _ in 0..2` loop (**this leg's**) | ⚠ `[]` — **FALSE PASS** |
| the same second decode with no disguise (control) | caught |

⚠ **Four uncaught mutations, in the check whose LAST round's finding was "your
controls replay the last round's attack".** The fix added four controls; all four
are the previous round's mutations, and the sweep that feeds the helper arm
matches `\nfn ` only while `_fn_body` beside it handles both spellings.
**The fix was written against the list, not against the property** — E-168's
sentence, one layer out.

---

# Verification of the external legs' findings

⚠ **These are not this leg's findings.** They are recorded here because this leg
is the only one that could run the code, and a measurement belongs next to the
claim it settles.

| leg + finding | verdict | how |
|---|---|---|
| **033a-5** — a second decode hidden between `"/*"` and `"*/"` string literals false-passes `single_decode_findings` | ⚠ **CONFIRMED, MEASURED** | drove the gate's own `single_decode_findings` on a mutated `keygen.rs`: with the two decoy string literals → `[]`; the identical mutation without them → caught. |
| **033a-6** — the helper sweep's regex misses `pub fn` | ⚠ **CONFIRMED, MEASURED** | same harness: a `pub fn duplicate_decode(` helper that `derive_raw` calls → `[]`. The `fn name (` space variant → `[]` too. |
| **033a-7** — *"`B23_SITES` is 11, not 12"* | ⚠ **REJECTED, MEASURED** | `len(B23_SITES)` is **12**, and the gate prints twelve `present` lines under part 6 before the scoped check. `REVIEW-033b` reached **12** independently by AST-executing the assignment. The leg was counting a pasted list by eye — the failure mode this project has a rule about. |
| **033a-1** — moves leave unwiped source slots, *"an unnamed residual"* | ⚠ **REJECTED as new; point taken narrowly** | `CLAIMS.md` B-22 already names *"the source of every move"*, and the request conceded it in writing. `REVIEW-033b` independently refutes the framing: *"no explicit scalar clone, owning container, `take`, `swap`, or partial move in production."* ⚠ **What survives is one sentence: the caveat is stated in `CLAIMS.md` and NOT at `scalar.rs`, which is where B-25 made a reader form the belief.** |
| **033a-2** — the new `Drop` adds data-dependent timing in `derive_pair` | ⚠ **REJECTED; diagnosis correct, consequence overstated** | The mechanism is real — `r` is dropped on `rho`'s error path and was not before. But that branch is **already ruled** and its outcome is **externally visible**: the signer refuses to sign and reports `EntropyUnavailable`, so the timing reveals nothing the refusal does not. `REVIEW-033b` reached the opposite conclusion independently and called the drop *correct*. E-170: the point beneath is worth one sentence at the site, not a finding. |

⚠ **033a-5 falsifies a sentence B-25 wrote while fixing the sentence above it.**
The old docstring claimed the stripper's imprecision *"can only make a needle
harder to satisfy, never easier"*; B-25 retracted that and replaced it with
*"a `//` or `/*` INSIDE a string literal strips more than it should, and THAT
direction is safe."* **For a needle, yes. For `single_decode_findings` it is
exactly backwards** — that check enforces a **maximum** (`total != 1`), so
stripping *more* makes it *easier* to satisfy. **The narrowed claim is false in
the same docstring, in the fix for the general claim being false.**

---

# ⚠ What this leg MISSED, which is the point of recording it

⚠ **It missed BOTH of the round's substantive findings, and it had every
instrument needed to find them.**

1. ⚠⚠ **The `pub fn` helper false pass.** The request I wrote says, in bold,
   *"A CONTROL THAT REPLAYS THE LAST ROUND'S ATTACK PROVES YOU CATCH THE LAST
   ATTACK … Ask what they do NOT run."* **I wrote that sentence and then did not
   run the experiment.** I read `re.finditer(r"\nfn ([a-z_0-9]+)\(")`, noted that
   `_fn_body` handles both `fn` and `pub fn`, and moved on **without noticing
   that the sweep that feeds it handles only one.** The measurement took ninety
   seconds once someone else named it.
2. ⚠⚠ **The string-literal `"/*"` attack.** I read the retracted *"never easier"*
   claim and its replacement in the same sitting, quoted the replacement in my
   notes, and **accepted the narrowed version because it was narrower.** A claim
   that has just been proved false in its general form is the last claim that
   deserves the benefit of the doubt in its specific form.
3. ⚠⚠ **The Miri question I RAISED and did not settle before launching.** I put
   the soundness of `dropping_a_scalar_overwrites_its_bytes` into the request as
   attack point 5, correctly, **and then launched both legs without running
   Miri** — which was one `rustup component add` away and which this leg alone
   could do. Both external legs then spent effort asserting as PREDICTED a thing
   I could have handed them as MEASURED. ⚠ **Neither could run it; I could, and
   I asked instead of measuring.** The rule this breaks is the project's own and
   it is in the request I wrote: *assume every claim is unmeasured until you
   measure it.*
4. **The closure — one call site, two executions.** `REVIEW-033b` alone found it.
   I had already written the harness that reproduces it in ninety seconds, and I
   used the harness only on mutations someone else had named.

⚠ **The pattern is the one `CLAUDE.md` already names and it is getting sharper
each round: this leg finds MECHANISMS and misses INSTANCES.** Finding 1 is a
mechanism (a reason that is not a reason). Findings 2 and 3 are bookkeeping.
**Both real gate defects came from outside.** `REVIEW-032s` recorded the same
shape — it made two passes over `finish()` and trusted the comment — and that
record is the strongest argument in this repository for external legs. **This is
the second consecutive round in which the self leg found nothing an external leg
did not.**
