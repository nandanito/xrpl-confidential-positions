# REVIEW-059e — adjudication of round three, and the rotation closes

- **Date:** 2026-10-21
- **Subject:** round two's fixes only, `bbe5557..3934ae1` (E-346), and the output
  rebuilt from `3934ae1`.
- **Ruled by the owner on 2026-10-21:** *"run the third round as recommended"*.
- **Stopping condition, set before the round, word for word:** *"Round three
  reviews round two's fixes only, with one repository leg; the rotation closes
  after it, whatever it finds."* **The rotation is closed.** The fixes below are
  checked by their own tests and controls, each broken before it was believed, and
  by no further outside reader, which is how `REVIEW-058` closed.
- **Register:** `CLAIMS.md` E-347, and E-348 for the fixes.

## The leg

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a repository of two commits, the trees at `bbe5557` and `3934ae1` (verified blob for blob), plus the rebuilt and the deployed output roots; `workspace-write` with network | five seams; each round-two finding judged by its own words and run by its own examples. `round-three-prompt-codex.md` |
| self | the adjudicator | written from 01:35Z, before the leg launched. `round-three-self-notes.md` |

It ran for nine minutes and its sandbox's Chrome would not start, so it prepared
eight browser cases for the adjudicator. Scrubbed: 122 temp paths and one home
path. ⚠ **Its transcript failed the secret sweep on its own quotation of
R3-12's false positive** — a public SHA-256 beside an asset name containing `Sk`.
Redacted with `tools/redact-review-fixtures.ts`, two spans, rather than weakening
the sweep.

## Rulings

Every finding was checked at source. The browser cases were run by the
adjudicator on 2026-10-21: `second-home-inspect-gap`, `clipped` and
`ancestor-clipped` PASS (each confirming a finding), `display-contents` FAILS on
visible text (confirming the false rejection), and `second-home-error-late` and
`nav-opacity` FAIL as they should.

| id | claimed | ruling | why, and the fix |
|---|---|---|---|
| R3-1 | HIGH | **Upheld, MEDIUM** | The address and issuance checks read the source spelling: `&#114;Hb9…` and an address split by a `<span>` both passed. Regraded as R2-1 was: the output complies. Fix: the checks read the raw page, the decoded page, and its text with tags removed and nothing inserted |
| S3-2, S3-3 | self | **Upheld, LOW** | An X-address and a 64-hex hash outside the ledger pages passed. Both are now refused there; the real pages carry neither |
| R3-2 + S3-1 | HIGH, LOW | **Upheld, MEDIUM, and a control was misnamed** | *"Decrypted issuer balance is 42"*, *"42 (decrypted issuer balance)"*, *"decrypted view … : 42"* and *"decrypts … to 42"* passed, and the control named *"a figure labelled after its value"* planted a label before its value. Fix: any number within the same sentence after *decrypt* or *plaintext*, numbers that are part of a claim reference excepted; a number followed by a parenthetical label; the control renamed and a real value-first control added. The printed limit says the check is a word list |
| R3-3 | LOW | **Upheld** | `&sol;`, a numeric reference with no semicolon, a tab between slashes and a backslash passed. Fix: the gate resolves each attribute URL against an origin and refuses any other origin not admitted, and the browser check reads every URL attribute from the DOM the browser built, which decodes as the browser does |
| R3-4 | LOW | **Upheld** | The decoder threw on `&#1114112;` and decoded `&#x26;#47;` twice. Fix: one pass, out-of-range code points become U+FFFD |
| R3-5 | HIGH | **Upheld, MEDIUM** | The provenance sentence was matched anywhere on the page and the endpoint anywhere too, so a wrong footer beside a correct sentence elsewhere passed, and a footer split by an inline element failed. Fix: the sentence is read from the `<footer>` element and the endpoint from the ledger-source element, with inline markup removed and block markup spaced |
| R3-6 | HIGH | **Upheld, MEDIUM** | `2026-99-99T99:99:99.999Z` passed, and *"every field the build writes is required"* was false. Fix: timestamps must round-trip through `Date`, and every field the build writes is required |
| R3-7 | LOW | **Upheld** | A quoted parameter hid the real charset, and the UTF-8 aliases `utf8` and `unicode-1-1-utf-8` failed. Fix: Node's `MIMEType` parses the header and `TextDecoder` resolves the label |
| R3-8 | HIGH | **Upheld, MEDIUM, measured** | An error emitted while an interval was being inspected fell between two intervals. Fix: one cursor over the event stream, so every event belongs to an interval, and a final inspection after the last check |
| R3-9 | HIGH | **Upheld, MEDIUM, measured, both ways** | Clipped wording passed and `display:contents` wording failed. Fix: the test measures the wording's own text, not element boxes, and hit-tests the centre of a text rectangle after scrolling it into view, which a clip, an ancestor's overflow or a covering element defeats. Colour equal to its background is still not detected, and the docstring says so |
| R3-10 | LOW | **Upheld** | E-206 still said reasons 1–3 *"cannot be"* falsified by a wallet update; `ADR-0003` had retracted the same absolute (E-328). Fix: struck and scoped in E-206 |
| R3-11 | LOW | **Upheld** | Removing the simulation's inside-the-platform exception, or the page's first two policy alternatives, left every test passing. Fix: each asserted |
| R3-12 | LOW | **Upheld, MEDIUM, measured** | Re-running the gate on its own gated output fails when the verdict names an asset whose hash contains `Sk`, because the secret sweep reads the digest beside that name as a labelled scalar. Whether it fails depends on Vite's hash. Fix: the gate's sweep reads a copy without the verdict file, which the gate itself writes after the sweep. A standalone `check-no-secrets --dir` over a gated output still reports it, and the README says so |

## What the three rounds established

Round one upheld 24 findings, round two found five fixes not discharged, round
three found three of round two's fixes still partial and two new browser gaps.
**Each round found less, and each round's HIGHs were in a narrower place**: round
one's in what the gate checked at all, round two's in fixes that answered a
summary, round three's in the second member of a class whose first member had
been fixed. Every finding in rounds two and three was found by running an example,
and the one leg that only read ruled everything discharged.

## Residuals, named and not closed

The ledger hash is not pinned (R1-9). Install and the snapshot have the network
and the build machine's loopback (S-2). Dependency code can write the tree after
the tree check (R1-10's second half). The figure check is a word list. The
visibility test does not see colour equal to the background. The fixes in E-348
were reviewed by no outside reader.
