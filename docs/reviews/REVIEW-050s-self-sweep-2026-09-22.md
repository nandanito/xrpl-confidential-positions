# REVIEW-050s — self sweep, written before the Codex leg's output was read

⚠ Same session as the fixes, so not independent. Recorded as a sweep, not a review.

## Surviving sites B-30 does not name

1. **HIGH — `README.md:371`, the public front door.** *"The Confidential Transfer implementation was reviewed by **Trail of Bits** in April 2026. … so check it before believing anything here is novel."* It names one reviewer and sends the reader to one corpus to settle novelty, which is exactly the check B-30 says is incomplete. **This is the sentence a stranger reads at publication**, and the launch plan's own rule now forbids the blog post from doing the same thing. It already names B-13, so the fix is to name B-30 beside it.
2. **LOW — `docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md:265`**, *"a finding with a named audience, a reproducible test, and no existing coverage"*, which is the F-10/`#611` coverage claim. It is a dated record, 2026-08-16, and it describes what was checked then, so under this round's exemption it is reported and **not** edited. B-30 already names the F-10 headline paragraph that carries the same claim in the register.

## False matches

- `tools/check-negative-claims.ts:12` and `CLAIMS.md` P-12 quote *"nobody has called it out"* as the banned shape. Rule text, not a claim.
- `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md:170` is the new rule forbidding *"unreported"*.
- `docs/task-zero/SOURCES-2026-08-18.md:164`, *"the revision audit does not bear on keygen"*, is about the relevance of B-13's revision, not upstream coverage.
- `docs/task-zero/ADDENDUM-2026-08-16.md:41` matched on a phrase outside the coverage question.

## The search

`rg -n -i` over the whole tree, excluding `docs/reviews/`, `node_modules`, `target` and the three generated register views, for `no existing coverage|not previously reported|unreported|nobody (has )?(raised|called)|not in the (ToB|Trail)|ToB (does|has|never)|audit(ed)? (does not|never|did not)|neither is in the|report does not (touch|raise|mention)`, then `rg -n -i 'trail of bits|sherlock|audit' README.md web/ facility/src`.
