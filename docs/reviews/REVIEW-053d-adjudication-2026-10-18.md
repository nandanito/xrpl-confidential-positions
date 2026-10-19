# REVIEW-053d — adjudication: F-17, three rounds, filed as mpt-crypto#153

- **Subject:** the F-17 draft, a paper erratum for `paper/cmpt-compact-sigma.tex` Remark 6.1.
- **Rounds:** `REVIEW-053a`, `-053b`, `-053c`, all on 2026-09-28, each an isolated Codex leg under `$TMPDIR` with network. Round two received round one's findings and the author's rulings; round three received round two's. All three outputs are transcribed from the session, because the scratchpad was cleared before 2026-10-18.
- **Filed:** 2026-10-18 as [mpt-crypto#153](https://github.com/XRPLF/mpt-crypto/issues/153), after a same-day re-check at upstream HEAD and a cold read by a second model. Archived at `docs/upstream-filings/2026-10-18/01-mptcrypto-remark-6-1.md`.

## Decisions taken before drafting

- **The NULL `context_id` half was dropped.** F-17's row planned to file "a caller-error surface". That is F-19's subject, which E-296 ruled not-to-file because Trail of Bits' Appendix B raises it. The filing is one paper correction with one ask.
- **"Version-bumped" resubmission was left out.** A balance-version change alters the balance ciphertext in x, so the clean case is a sequence-only retry.

## Round one: four findings, all upheld; two proposals rejected

| Finding | Ruling |
|---|---|
| State the attack's conditions | Upheld. The opening names the x reading, entropy omitted, and the same `r` and `ρ` |
| Show the extraction | Upheld. `sk_A = (z_sk − z'_sk)/(e − e')`, linked to the response equations |
| Record the contest searches as commands; the count moved | Upheld. All 106 items were re-fetched and read |
| Link both utility ranges | Upheld |
| A second ask (mandatory entropy) | **Rejected.** One ask, and §6.1 already requires independent nonces |
| Drop the audit block and the ConvertBack sentence | **Rejected.** Rule 4 requires the searches; the sentence states the fix's scope |

**Found while ruling, and it corrects the register:** `generate_deterministic_nonces` mixes a fresh `RAND_bytes` salt into every call, since #18 in April 2026. F-17's row said a NULL `context_id` *"reintroduces the full bug"*; that has never been true of nonce reuse. The draft says the prover is not affected, and cites the salt.

## Round two: three findings, all upheld

The conditions were still incomplete (`m`, `b`, `sk_A` and the non-context inputs must repeat too); *"the paper never says what statement contains"* was false, since the paper defines x; the union counts needed both figures and no stale note. The *"does not say which it means"* wording was changed because the repository's lexical gate reads it as a corpus negative.

## Round three: two findings, both upheld

The keys and balance ciphertext were added to the conditions, and the §6.2 characterisation was narrowed to what the section says. Both the opening and the second-reading bullet carried the phrase, and both were fixed.

## Stopping

Three rounds. Round three's findings were confined to one paragraph's wording, each fix was checked against the paper, and the owner's sign-off read was the final check. On 2026-10-18 a second model read the draft cold, re-checked every claim, and added one citation: line 487, where the paper itself calls x *"a statement"*.
