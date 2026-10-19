# REVIEW-058e — adjudication of round three, and the rotation closed

- **Date:** 2026-10-19
- **Subject:** round two's fixes, from `629f216` to the frozen
  `29fc4ebacd24918e245e38f678dc3f621c054a69`, against the rulings in `REVIEW-058d`.
- **Register:** `CLAIMS.md` E-330. **Result:** `ADR-0004` revision 4; fixes in
  `web/api/capability.ts`, `web/api/signer-status.ts`, `web/api/server.ts`,
  `web/app/src/routes/wallet.tsx`, the web walkthrough and
  `tools/check-disclosure-phrases.ts`.
- **The rotation is closed.** Round three was the third plan round under the
  owner's Codex review policy, which allows no fourth, and `REVIEW-058d` said
  before it ran that the rotation would close after it whatever it found. Every
  finding below is fixed or documented, and **none of those fixes has been
  reviewed by another round.** They are checked by their tests and controls, each
  verified by breaking it.

## The leg

One Codex leg, `gpt-6.1-sol` at effort `high`, in a fresh clone of `29fc4eb` under
`$TMPDIR` with no remote, `workspace-write` with network. It was asked only whether
each of round two's fixes discharged its finding at every site, to break the two
code fixes, and to check the new sentences. `round-three-prompt-codex.md`. It
reported one excerpt showing a public test-vector key from a test file, against
the prompt's instruction; both secret sweeps pass on its scrubbed transcript. The
self leg, written before launch, is `round-three-self-notes.md`.

## Rulings

| id | claimed | ruling | why, and the fix |
|---|---|---|---|
| R3-1 | HIGH | **Upheld, HIGH, and wider** | The wallet permanence claim stood in `web/api/capability.ts:75-77` and the walkthrough, as the leg found, **and** in the wallet page's own conclusion at `wallet.tsx:44-46`, which the leg's list missed and a re-sweep found. All three are scoped to the wallets examined, with the internally-proving wallet named. Two new gate phrases carry the copies, keyed to E-330 |
| R3-2 | HIGH | **Upheld, HIGH** | Revision 3 let an accepted build-machine trust waive the deployment token's isolation. Revision 4 makes the token's absence from install and build unconditional, and `REVIEW-058d`'s summary is struck |
| R3-3 | HIGH | **Upheld, regraded MEDIUM, and documented rather than closed** | A JSON `4800000.0` parses to the integer `4800000` before the TypeScript check sees it, so the check cannot tell; the Rust reader refuses it at the parser. rippled sends integers, and the leg's Devnet probes found no honest answer refused or differing. Closing it means reading the raw response text, a parser change no finding has priced. The round-two finding allowed either remedy, and the parity claims in the ADR, E-329 and `REVIEW-058d` now state the difference |
| R3-4 | HIGH | **Upheld, regraded MEDIUM** | `"are **structural** and cannot be closed by any wallet update"` had lost its subject, and the true-sentence control lacked the pattern's predicate, so it could not see that. Scoped to `"reasons 1–3 are …"`, with a control that keeps each wallet phrase's whole predicate and changes only the subject. Regraded because the defect was a loud false-fail, not a missed copy, and E-329's sentence describing it is struck |
| R3-5 | MEDIUM | **Upheld, and the self leg's U-1** | A copy wrapped inside a blockquote, a line comment or after JSX's `{" "}` passed. The scan drops a leading blockquote, comment or bullet marker and JSX's `{" "}` before joining lines, with three controls, each failing when its normalisation is removed, and the gate's header names what markup still hides a copy. ⚠ **Its first run found a live copy of the sentence E-224 retracted on 2026-09-02**, *"neither is constructible from anywhere under `web/`"*, standing in `web/api/signer-status.ts` since then because it wrapped across two comment lines. Corrected. It also found a recorded retraction in `web/api/server.ts` quoting its phrase without a strike, now struck |
| R3-6 | LOW | **Upheld** | *"The split is not a disagreement about the same evidence"* was true of R2-2 and R2-3 and not of R2-1, which both legs could see. Struck in part in `REVIEW-058d` |
| U-1 | — | **Upheld, as R3-5** | |

**Rejected:** none. Two regraded down, R3-3 and R3-4, for the reasons given.

## What the rotation established, across three rounds

- **Every round found surviving copies, and only the leg that swept the tree found
  them.** Round two's inline leg ruled every fix discharged; round two's and round
  three's repository legs each found corrected sentences still standing at a second
  site, and round three's fix to the gate found one more, standing since September.
- **The reader had drifted from the Rust reader on three checks, and was fixed one
  check per round.** The index of a negative answer and the entry type in round
  one, `validated` and the index's type in round two, and a decimal-form difference
  documented in round three. The Rust reader was the reference all along; diffing
  against it in round one would have found all three.
- **Two of the author's own fixes narrowed the author's own findings**: S-8 lost its
  gate verdict in round one, and R2-10 lost its unconditional token isolation in
  round two.

## What is left, and whose it is

- **The owner's four rulings**, D-H1 to D-H4, each with a recommendation in
  `ADR-0004` revision 4: H3 prerendered pages; accept the hosted risk with the
  revised wording; A, no issuer figure; a prebuilt CLI deploy. H3 adds two
  sub-choices: a rebuild cadence, and whether to isolate the build machine or
  accept its trust.
- **The reader's decimal-form difference**, documented and not closed.
- **The code fixes reach the public repository only through a public update**,
  which publishes, and so waits on the owner.
