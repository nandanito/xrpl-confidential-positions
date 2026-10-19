# REVIEW-058c — adjudication of round one: the hosted demo's trust boundary

- **Date:** 2026-10-19
- **Subject:** `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` revision 1 and
  architecture §6 step 9, at the frozen commit `d764bcaa75add41613a67d9cbb48c48038475cb4`.
- **Why it ran:** the launch plan's phase 2 step 2 requires a full adversarial
  rotation before any code, because a hosted deployment is a trust-boundary change
  (`CLAIMS.md` E-309).
- **Register:** `CLAIMS.md` E-328. **Result:** `ADR-0004` revision 2.

## The legs, and how their packets differed

| leg | model and access | packet |
|---|---|---|
| A | Codex `gpt-6.1-sol`, effort `high`, a fresh clone of the frozen commit under `$TMPDIR` with no remote, `workspace-write` with network | five seams, with instructions to re-run the measurements and build probes. `REVIEW-058-packets/round-one-prompt-codex.md` |
| B | Gemini through `agy`, effort `high`, no tools, from an empty directory | six questions, with 13 whole files and 25 whole register rows inline. `round-one-prompt-gemini.md` |
| self | the author of the subject | written from 10:30Z, before either leg was launched, and committed only after both returned. `round-one-self-notes.md` |

Leg A ran 41 shell commands. None touched `~/.wconf`, `/tmp/wconf`, `~/.claude`,
`~/.codex` or the scratchpad, checked by listing every command in its transcript.
Its list of opened files is `round-one-codex-opened-files.txt`. The transcripts
were scrubbed with `tools/scrub-personal-data.ts` before commit: 48 temp paths in
leg A's, and six author emails in the copy of XLS-0096 inside leg B's packet.

## ⚠ A defect in both packets, recorded first

Both prompts told the legs that the ADR recommended D-H3's option B. Leg A's seam
3 said so outright, and leg B's question 3 and question 6 assumed it. The frozen
ADR recommends A. The prompts were drafted before the self leg found that B's sum
check passes for a forger, the draft moved to A, and nobody re-read the prompts
against the frozen commit before launching them. **Both legs read the subject,
noticed, and reviewed what it says.** Leg A: *"the checked-in ADR recommends **D-H3
A**, not B"*. Leg B: *"This is factually false against the text of `ADR-0004`"*.

This is E-160's shape with the adjudicator writing the packet, as in
`REVIEW-048`. It cost nothing this time
because both legs had the subject whole. **A prompt is part of the subject's
history, and it has to be re-read against the frozen commit, not against the
draft it was written beside.**

## Where the legs agreed, and whether they could have disagreed

Both external legs, asked separately for the single sentence most likely to be
false, named the same one: *"Trigger 5 fires only for what is put into the bundle on
purpose, and the gate can enumerate that."* Leg B argued it from `ADR-0003`'s own
text, which it had inline. Leg A demonstrated it with a probe leg B could not run: a
build-machine environment value inlined into the bundle. Different packets,
different evidence, one sentence. That agreement is not one reading distributed.

## Rulings

Grades are the leg's unless the ruling changes them. Every finding below was
checked at source before it was ruled.

| id | leg | claimed | ruling | why, and the fix |
|---|---|---|---|---|
| R1-1 | A | HIGH | **Upheld, HIGH** | `tools/observer-harness.ts:82-83` calls `Buffer`, and the leg's browser bundle threw. The design's reuse fails as written. M5 is corrected; H1's cost names a browser-safe replacement |
| R1-2 | A | MEDIUM | **Upheld** | One page on one origin was tested; the other two were Bun clients supplying a header. M2 and E-327 are corrected |
| R1-3 | A | MEDIUM | **Upheld** | Provenance was a description, not a rule. Revision 2 states the rule (clean checkout at a named commit, locked dependencies, named build variables only, no source maps) and the gate inventories the output |
| R1-4 | A | HIGH | **Upheld, HIGH, and wider than the leg said** | The two false sentences are live on the shipped local tier, not only on a future hosted page. `web/app/src/routes/index.tsx:51` promised the issuer view showed the holder *"decrypted"* six weeks after E-241, two lines below a paragraph saying the opposite; `wallet.tsx:78` contradicted `wallet.tsx:24-27`. Both corrected, with the same overclaim in `ADR-0003` D2. The signer is a panel and loader call, not a page; revision 2 says so |
| R1-5 | A | MEDIUM | **Upheld** | XLS-0096 lets delegates submit a clawback, so a proof built with a real clawback context is usable beyond the key holder. C's cost now requires a domain-separated context |
| R1-6 | A | MEDIUM | **Upheld** | The published WASM exports decryption beside the verifier. C's cost now requires a verifier-only artifact |
| R1-7 | A | HIGH | **Upheld, regraded MEDIUM, and fixed** | Confirmed at `facility/src/loopback.ts`: the error path threw before `Snapshot.pinned` checked the index. **Measured**: rippled 3.4.1 answers `entryNotFound` with `ledger_index` and `validated`, and a ledger it lacks with `lgrNotFound`, which already failed. No honest path is known to reach the gap and a lying node can lie at the right index, so the bypass gives an attacker nothing new: MEDIUM. It was still a false sentence about a check, under a class comment saying *"every answer is checked"*. ⚠ **The Rust reader closed the same gap in `REVIEW-016` round two and also checks every entry's type; the TypeScript reader, written later, had neither.** Both are fixed, with three tests that fail against the reverted reader |
| R1-8 | A | MEDIUM | **Upheld** | Revision 2 names the directives and where a prebuilt deployment delivers them, and the gate reads the delivered header |
| R1-9 | A | HIGH | **Upheld, HIGH** | `tools/check-no-secrets.ts:665-683` selects files with `git ls-files --exclude-standard`, so an ignored build directory is never read, and there is no directory option. The gate list promised a scan that does not exist. Revision 2 says so and names the directory mode as build work with controls |
| R1-10 | A | MEDIUM | **Upheld** | *"No third party gains any access"* becomes *"no additional repository credential or write permission"*. Vercel's toolbar default was **re-read at source** (`vercel.com/docs/vercel-toolbar/managing-toolbar`, updated 2026-08-11): it shows on previews and any enabled environment and loads script from `vercel.live` |
| R1-11 | A | MEDIUM | **Upheld** | Static hosting has quota and cost. Revision 2 asks for the plan, limits, a spend cap and an owner |
| falsifier table | A | — | **Upheld** | Step 9's falsifier now covers provenance, a secret-asking input, an unruled issuer figure, negative reads that cannot be placed in the pinned ledger, and served headers as well as bytes |
| B1-1 | B | HIGH | **Upheld, regraded MEDIUM** | Port 51233 can be blocked where only 443 is open. It degrades the page for some visitors and does not make the design fail. Moot under H3; named under H1 with an unsearched 443 endpoint as a gap |
| B1-2 | B | MEDIUM | **Upheld** | A lookup in a URL the host receives is now on the never-touch list and in the falsifier. Under H3 there is no visitor input |
| B1-3 | B | MEDIUM | **Upheld** | With R1-10 and S-3 |
| B1-4 | B | HIGH | **Upheld, HIGH** | The trigger-5 sentence. Retracted in revision 2's status line and rewritten: the gate can enumerate the uploaded files, and it cannot enumerate egress |
| B1-5 | B | HIGH | **Upheld, regraded MEDIUM** | *"Nothing to bind"* read as evasion. Revision 2 says the page is public by design and step 9's falsifiers replace step 8's loopback property. Wording, not a design failure |
| B1-6 | B | HIGH | **Upheld, HIGH** | The visitor-facing sentence named only Ripple as a party that sees visitors; Vercel sees every page load. Rewritten |
| B1-7 | B | MEDIUM | **Upheld in part** | Devnet, no value and resets are now in the wording, and *"lying or lagging"*. Dropped messages are a reader failure and render as a named failure, not as a disclosure |
| B1-8 | B | HIGH | **Upheld, regraded MEDIUM** | *"Ledger values are not cached"* was a requirement stated as a fact with no mechanism. ~~Under H3 it is true by construction~~; under H1 the build must disable loader caching, with a test. ⚠ STRUCK by `REVIEW-058d` (E-329): H3 serves cached, dated observations, the opposite |
| B1-9 | B | HIGH | **Upheld, regraded MEDIUM** | The single-reader sentence described a requirement as if the code already met it. Revision 2 says `loopback.ts` must first be refactored to separate its transport |
| B1-10 | B | LOW | **Upheld** | *"No server-side code of ours"* |
| Q6 | B | — | **Upheld: D-H1's recommendation moves from H1 to H3** | H1's reuse fails in a browser, needs a reader refactor, adds reconnection, a CSP exception and a cache rule, and sends visitors' lookups to a second party, to buy a lookup box for an audience with no Devnet accounts. H3 shows the same views as dated readings. The ADR keeps H1 as the option if the owner wants visitors to look up their own accounts |
| S-1 | self | MEDIUM | **Upheld** | Never ask for a secret: never-touch list, gate and falsifier |
| S-2 | self | MEDIUM | **Upheld** | The bundle's third-party licence notices are a gate item |
| S-3 | self | MEDIUM | **Upheld** | Corroborated by R1-10 and B1-3 |
| S-4 | self | LOW | **Upheld** | With B1-6: *"Do not use a value shown here to build a transaction."* |
| S-5 | self | LOW | **Upheld** | H3 still reads one node, at build time; *"Do not accept"* no longer offers it as an escape |
| S-6 | self | LOW | **Upheld** | Token scope, expiry and location |
| S-7 | self | LOW | **Subsumed by R1-8** | |
| S-8 | self | LOW | **Upheld** | The page renders the commit it was built from |

**Rejected:** none. ~~Six~~ Five findings were regraded down, each for the reason given. ⚠ STRUCK by `REVIEW-058d` (E-329): the table regrades five.
None was regraded up.

## What leg B's question 3 confirmed

Asked about B with a false premise, leg B still ruled on the substance: B *"routes
around"* E-241 and passes for a forger, C is unpriced, A is sound. Leg A built the
forgery: two incompatible allocations of the public total at ledger 6,244,148, both
passing B's checks. The self leg's pre-freeze finding is therefore confirmed twice,
once by argument and once by construction.

## What changed in the subject

- `ADR-0004` revision 2, ~~with every upheld finding cited at its site~~. ⚠ STRUCK by `REVIEW-058d` (E-329): B1-1, B1-2, B1-9 and S-1 were not cited in revision 2; revision 3 cites them.
- Architecture §6 step 9 rewritten for H3, with the wider falsifier; revision 10
  amended the same day.
- `facility/src/loopback.ts`: negative answers checked against the pinned ledger,
  and entry types checked. `facility/tests/loopback.test.ts` adds three tests, and
  both test files' fake nodes now answer as rippled 3.4.1 does.
- `web/app/src/routes/index.tsx`, `web/app/src/routes/wallet.tsx` and `ADR-0003`
  D2 corrected; `tools/check-disclosure-phrases.ts` carries the three phrases, keyed
  to E-328, and was broken by restoring the old copy.

## Round two

**Owed**, because round one found defects in the subject and in shipped code, and
the fixes have been seen by nobody. Its stopping condition was set before round one
ran and is unchanged: **no third round unless round two finds a fix that did not
discharge its finding.** The owner's Codex policy allows two more plan rounds for
this key.
