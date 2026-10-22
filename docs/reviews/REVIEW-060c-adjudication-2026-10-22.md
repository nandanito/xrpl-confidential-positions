# REVIEW-060c — adjudication of the explainer's two reads

- **Date:** 2026-10-22. The legs ran on 2026-10-21 from 14:54Z to 15:07Z.
- **Subject:** the hosted demo's new `/how-it-works` page, the rewritten overview
  and navigation, R-7's correction to `WHAT-CONFIDENTIAL-MEANS`, and the release
  gate's admission of two repository files. `3659a87..aabb31e` in the archive.
- **Ruled by the owner on 2026-10-21:** *"Two reads, then deploy"*: `claims-check`,
  one read against `CLAIMS.md` by a leg with the repository, and one newcomer read
  by a leg with no repository access. Then the fixes, the public update, a rebuild
  and the owner's deploy. **No later round was planned**, so the fixes below are
  checked by their own tests and controls, each broken before it was believed.
- **Register:** `CLAIMS.md` E-350.

## The legs

| leg | model and access | packet |
|---|---|---|
| A | Codex native review pass, default effort, a repository of two commits, the archive trees at `3659a87` and `aabb31e` (tree hashes equal), plus the gated output; `workspace-write` with network | every factual sentence against its row; consistency with the other pages and the README; R-7; the gate change. `leg-a-prompt-codex.md` |
| B | Gemini through `agy`, effort high, no tools, from an empty directory | the two pages' visible text only, read as a stranger arriving from a post. `leg-b-prompt-gemini.md` |
| self | the adjudicator | `claims-check` over the same text, written to the scratchpad while the legs ran and committed after both returned. `self-notes.md` |

Leg A ran 12 minutes. The native pass printed only its findings to stdout; its
full report, with a *"no findings"* statement per section and what it did not
check, was in its working directory and is kept as `leg-a-codex-report.md`, with
its gate probes and results. It read nothing outside its directory. Leg B ran 77
seconds. 80 per-user temporary paths were replaced with `$USER_TMP` across leg A's
four files before the secret sweep would pass.

## Rulings

### Leg A

| id | claimed | ruling | why, and the fix |
|---|---|---|---|
| A-1 | HIGH | **Upheld**, and the self pass found it too (S1) | *"each confidential transaction carries zero-knowledge proofs"*: MergeInbox carries none. Now *every transaction that spends from a confidential balance* |
| A-2 | MEDIUM | **Upheld** | `web/api/disclosure.test.ts` failed on *"not production-ready"*, a correct denial on a line that does not cite P-5. ⚠ The adjudicator had run `bun test web/hosted` only and committed; `make ci` would have failed. The line now carries *(P-5)*, as the banner does; the disclaimer stays |
| A-3 | MEDIUM | **Upheld** | Key loss dropped E-119's exception: a key derived from the master seed can be re-derived from it. Now *"loses it, and any seed it can be re-derived from"*, with the derivation named as unpublished |
| A-4 | MEDIUM | **Upheld**, and S4 | The clawback condition did not say this project's tokens meet it. Now says so and cites E-223 |
| A-5 | MEDIUM | **Upheld** | The commit check passed a wrong-commit link in an entity-encoded `href`, a literal in a script, and one a script assembles. Fixed in two places: the gate parses every link in every file, a page after decoding its entities; the browser check reads the build's commit from `build-manifest.json` and refuses any rendered repository link at another. Two gate controls and one browser control; with the checks removed, exactly those controls fail. The gate's item 10 names what neither sees |
| A-6 | MEDIUM | **Upheld** | The facility run's qualification did not travel with it, as its walkthrough requires. Now says the run read a public node, not a local one, and shows acceptance only (E-151, B-18) |
| A-7 | MEDIUM | **Upheld** | Convert lands in the inbox, so a holder must merge before a first Send (F-27). Now its own paragraph |
| A-8 | LOW | **Upheld** | *"28 validated transactions"* while step 1 includes creating the token. Now *"28 validated facility transactions besides setting up the token"*, B-18's count |
| A-9 | LOW | **Upheld** | Several *Sources* lines did not name the rows that establish their panel. Each now does, including the four accounts' rows: E-208, E-118, E-176, E-101 |

Leg A affirmed, with what it checked: every other sentence; the observer, issuer,
capability, wallet and custody pages and the README section for consistency;
R-7's correction and the absence of a live copy of the old sentence; the admitted
file set, exactly two files; and the first two controls' isolation. `bun test
web/api web/hosted` 191 pass, 1 fail (A-2). It did not run the store-dependent
gate, a browser, or any Devnet read.

### Leg B

| id | ruling | why, and the fix |
|---|---|---|
| B-1 | **Upheld** | *MPT* in the site header before any definition. The header now says *Multi-Purpose Tokens (MPTs)* |
| B-2 | **Upheld in part** | Inbox and MergeInbox were named without saying what they mean for the holder; now stated (A-7's paragraph). Why the protocol has an inbox is not stated, because no row records the reason |
| B-3 | **Upheld** | *Clawback* in the public list before the Limits panel explains it. Now *"an issuer clawback, which destroys the balance"* |
| B-4 | **Rejected** | Replacing `wconf-signer` with a description: the name is what a reader looks for in the README. The space before its comma was the text extraction's, not the page's |
| B-5 | **Upheld** | *"The copies are for…"* referred back across a long sentence. The copies are now named first |
| B-6 | **Upheld** | The note that the other pages do not show the facility came after the whole example. It now opens the panel |
| B-7 | **Upheld** | *"keep their balance encrypted on the public XRP Ledger"* read as full privacy. Both pages now add *"hidden from the public, not from the token's issuer"* |
| B-8 | **Upheld** | *"without the figure"* read as contradicting *"can always read every balance"*. Now *"the encrypted copy of each balance that the issuer can always read. This site does not publish the figures."* |
| B-9 | **Upheld**, and S3 | *"Only the holder can spend"* read as sole control beside clawback and freezing. Now *"Spending needs the holder's key"*, and the issuer's powers are named with it |
| B-10 | **Upheld** | *"some zero balances are recognisable"* undersold a deterministic leak; leg A found it true, and both are right. The overview now names the three cases. ⚠ The leg's own wording, *"emptied"* balances, was wrong (a balance spent to zero is not recognisable, E-211) and was not used |
| B-11 | **Upheld** | The banner's *"not secure"* could be read as about XLS-96. Now *"this project is not secure, …"* |
| B-12 | **Rejected** | A commercial rationale on the front page: the overview is orientation, and the example panel opens with it |
| B-13 | **Upheld** | *Dedicated Account* read as a ledger type. Now explained in place |
| B-14 | **Upheld** | Nothing said what the four accounts are for. The note names the two pages that show them |
| B-15 | **Rejected** | Removing the footer's gate verdict: a provenance disclosure ruled in `REVIEW-058` S-8 and R2-3, checked on every page |
| B-16 | **Rejected** | Removing the *Sources* lines: the register's rule is traceability. They stay small and are explained once |
| B-17 | **Rejected** | Cutting the README caveat: it stops the page implying the README explains transacting |
| B-18 | **Rejected** | The second link to the explainer: one is the call to action, one is the list |
| B-19 | **Upheld in part** | Codes like *P-4* read as tickets. Each now follows its sentence in brackets, and the register is linked at the build's commit; the codes stay, because each is a row a reader can check |
| B-20 | **Upheld** | Leg B called XLS-96 *"a proposed protocol extension"*; the page never said otherwise. It now says XLS-96 is a final standard, enabled only on Devnet when written |

### The self pass

S1 is A-1, S3 is B-9 and S4 is A-4. S2 (the amendment reading cites E-349), S5
(this project's tokens were not made immutable), S6 (*"built the core of that
facility"*), S7 (the bank funds the Dedicated Account publicly) and S8
(`WHAT-CONFIDENTIAL-MEANS` named as a source) are fixed. S9 and S10 needed nothing.

## After the fixes

At `c4bc2fe`: `make ci` every step passed; `bun test web/api web/hosted` 192
pass, 0 fail; built in two containers, the second without network; the gate 70
of 70 controls on 20 files; the browser check 7 pages and 53 requests; the
browser self-test passed. With the gate's commit check removed, the three
commit controls fail and the two others still pass. With the browser's check
removed, its new control fails.

## What this round shows

- **The newcomer leg found what neither reader of the register could.** Leg A
  and the self pass judged *"without the figure"* and *"some zero balances are
  recognisable"* true, and they are. Leg B read each as saying something else.
  A true sentence that a stranger misreads is this page's characteristic defect,
  and only a reader without the register finds it.
- **A gate check written for one spelling passed the next two.** The first
  version matched the raw HTML; the browser decodes entities and runs scripts.
  This is `REVIEW-059`'s lesson about reading what the browser reads, recurring
  in the first check written after it.
- ⚠ **The adjudicator committed after running one of two test directories.**
  `make ci` before the first commit of a change is the rule this project already
  follows; it was skipped because the change looked like text.
