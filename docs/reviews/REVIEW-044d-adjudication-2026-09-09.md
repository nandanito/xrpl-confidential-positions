# REVIEW-044d — adjudication, ROUND TWO on the emphasis gate's fixes

- **Rotation:** `REVIEW-044` — round two, reviewing `REVIEW-043`'s fixes
- **Date:** 2026-09-09
- **Subject:** `ec2e4c5`, frozen at `25d3dc3`
- **Legs, with deliberately differed packets:**
  - `REVIEW-044a` — Codex, **read-only repo** at the frozen commit, told what
    round one found and asked to attack the fixes and run a differential fuzz
  - `REVIEW-044b` — Gemini via `agy`, **no repository and no history**: the two
    tool files and the specification, nothing about what the fixes claim
  - `REVIEW-044s` — self leg, written to a scratchpad and committed after the
    others returned, reading the **fix report against the code**

⚠ The packets differ on purpose. `CLAIMS.md` E-160: identical packets give
unanimity that is one reading distributed. **They found three near-disjoint sets** —
leg A the two construction defects, leg B nine detector holes, leg S the
evidence and the counts. ⚠ ~~*No finding was reported by two legs.*~~ **STRUCK
by `REVIEW-045`: row 11 below is credited to S and A, so the sentence
contradicts this document's own table.** One finding of twelve overlapped.

---

## Round two's stopping condition: NOT met

`CLAUDE.md` asks whether the findings have moved from the construction to the
instruments that check it. **They have not.** Leg A found a live false-pass in
the construction and a defect a round-one fix **introduced**. That is category
(a) and category (b) in one round, which is what a second round is for.

---

## Upheld

| # | Leg | Finding | Measured | Fix |
|---|---|---|---|---|
| 1 | A | **The masker paired backticks ACROSS a table-cell boundary.** GFM splits cells before parsing inline code, so a lone backtick in the claim cell and another in the evidence cell are two literal backticks | A governed row showing a reader four `⚠⚠` and 49 bold characters reported `doubles=0, warns=0, bold=0.0%` and passed rules 1, 3 and 5. **Latent, not live: one register row has an odd-backtick cell and zero marks were hidden** | Masking runs per cell, on the same unescaped-pipe split `splitCells` uses |
| 2 | A | **The `1)` fix accepted unlimited digits**; GFM allows nine | `1234567890) …` renders `<p>` and was discarded as a list, so a 912-character wall passed rule 6. **Introduced by a round-one fix** | `\d{1,9}[.)]`, with controls on both sides of the boundary |
| 3 | A | *"A crash cannot print this line"* is **false** | A process printing the verdict then throwing was classified `FAIL` | The verdict must be the **last** line |
| 4 | B | `/\([0-9a-z]{1,3}\)$/` matched any short parenthetical word | `(due) ⚠ …` passed rule 4 | Digits, or a **single** letter — which also fixed `(A)` false-failing |
| 5 | B | `__bold__`, `<b>`, `<strong>` invisible to rule 5 | A 100%-bold row reported `0.0%` | All three counted, deliberately over-counting |
| 6 | B | `⚠️` (variation selector) invisible to rule 1; `&#9888;` invisible to rule 3 | `doubles=0` on `⚠️⚠️`; `warns=0` on four entities | Normalised before counting |
| 7 | B | An HTML comment dilutes rule 5's denominator | 60 bold characters read as 15.6% | Comments removed from the denominator |
| 8 | B | ⚠ **FIVE** false FAILS — this said *"Four"* and listed five (`REVIEW-045`): `1)` opening a cell, `(A)`, `**~~x~~**`, indented code, lazy continuation | Each reproduced | Fixed; pipe-less tables and HTML blocks are **disclosed** instead, with asserted-uncaught controls |
| 9 | B | `probe()` asserted only that *something* failed | The rule-1 mutation trips rules **1 and 3** | Each probe names a needle that must appear |
| 10 | S | *"Agrees with `cmark-gfm` on nine shapes"* was **a shell command run once and discarded** — four comments cite it, nothing executed it | `grep -c cmark` finds four mentions, no `spawnSync` | **The differential is now a control**, thirteen shapes, shelling out to `cmark-gfm`, and it says so loudly when the binary is absent |
| 11 | S, A | *"795 marks"* is stale **and** the wrong unit | 795 is contiguous runs on the parent tree; 797 at HEAD; 957 mark characters | Corrected in E-258, with the reason |
| 12 | A | A mutation whose needle goes stale no-ops silently | `str.replace(…, 1)` exits 0 on zero matches | The harness hashes the tree before and after |

---

## Rejected, with the measurement, so they are not relitigated

**B2.5 — *"`\|` needs two characters of lookback"*.** Leg B argued that `\\|`
is an escaped backslash followed by a real cell boundary. ⚠ **Measured against
`cmark-gfm`: `| trailing backslash \\| next cell |` renders as ONE cell**
containing a literal `|`. One character of lookback is correct for GFM tables,
which is also what `REVIEW-042` measured for `splitCells`. Treating `\\|` as a
boundary would be the defect.

**B5.2 — *"the vacuity probe is masked by other cohorts"*.** It would be, if any
row outside `E-` sat at or above its cutoff. ⚠ **None does** — the maxima are
P-12, B-26, F-29, R-6 against cutoffs of 13, 27, 30 and 7 — and the probe was
measured firing the vacuity branch. **Real as a latent fragility, and fixed
anyway**: the probe now raises every cutoff, not just `E`.

---

## The fix round's own defect, found by testing the fix

⚠⚠ **The needle check added by finding 9 FALSE-PASSED, and only running it
showed that.** It required a probe's expected rule to appear in the gate's
output, searched over the **whole run** — and the gate prints its controls, one
of which reads `CONTROL ✓ rule 1: a row with TWO ⚠⚠ fails`. So `rule 1` is
present in every passing run, and a probe producing a genuine **rule 3** failure
while claiming rule 1 was accepted.

**Scoped to the `FAIL` lines, and the three broken probes are committed** as
`tools/break-emphasis-gate.sh --self-test`, with a fourth correct probe as the
positive control — without it a harness that rejected everything would score
full marks. `CLAIMS.md` E-260.

⚠ **Four layers of one shape in one branch**: the gate, the probes that check
it, the exit codes that classify the probes, and the needle that scopes the
classification. Each was added to stop a false pass and each false-passed until
it was broken on purpose.

---

## What this round did not do

⚠ **One leg had a repository and two did not**, so leg A's differential fuzz —
167,481 ordinary-inline strings, zero mismatches — is the only exhaustive
evidence here, and it covers plain inline text only. **Its own conclusion is the
useful one: the remaining disagreements live where GFM's block and inline
contexts constrain where a code span may exist**, which a flat string search
cannot reach. Autolinks are the known open case and are disclosed.

⚠ **Round three is not owed by default.** Round two's stopping condition is the
test: if the next round's findings are about the instruments rather than the
construction, it stops there.
