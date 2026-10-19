# REVIEW-056c — adjudication of round one on `make check-no-secrets`

**Subject:** `tools/check-no-secrets.ts`, `tools/break-no-secrets-gate.ts` and
`tools/scrub-personal-data.ts` at `b1dba96`, and the record of the gate's first run.
**Leg:** one Codex leg (`gpt-5.6-sol`, high effort), run from a fresh clone under
`$TMPDIR` with network, prompt and output in `REVIEW-056-packets/`. It reproduced
the baseline before attacking it: 51 of 51 controls, 40 of 40 probes, and a
correct self-test.

**Outcome: 13 findings. 12 upheld, 1 upheld in part. No seam was clean.** Each
code fix is pinned in one of two ways. Most have a control that fails without
them and a harness mutation that reverts them. The strict command line is pinned
instead by seven probes the harness runs against the real gate. The docstring
correction, S3-4, has no falsifier. The harness was run against the fixed gate:
74 of 74 probes.

⚠ **Three of the HIGH findings are latent in this repository, not live.** On
2026-10-18 it had no `.gitattributes`, no `refs/replace/`, no grafts file, no
submodule and no shallow history. They were fixed because each fix is a few
lines, and because a publication gate should not depend on the repository staying
that way.

## The findings

| id | leg's grade | verdict | fix | pinned by |
|---|---|---|---|---|
| S1-1 | HIGH | **Upheld.** Eight of ten credential patterns had no control, and deleting one passed everything | Every pattern carries a runtime-built sample; every sample is planted | `credential: <name>` controls; one mutation per pattern |
| S2-1 | HIGH | **Upheld, latent.** A clean filter means `git add` stores bytes the gate never read | The tree and `--rev` modes refuse any `filter` or `working-tree-encoding` attribute, including Git LFS, whose content is published outside the blob | two refusal controls; two mutations |
| S2-2 | HIGH | **Upheld, latent.** `cat-file` and `rev-list` honour `refs/replace/` by default | Every git call runs with `GIT_NO_REPLACE_OBJECTS=1` | `--rev` and history controls over a real replace ref; one mutation |
| S2-3 | MEDIUM | **Upheld.** `--rev` split a path at every tab, and history read paths newline-separated, where Git C-quotes a tab | Split at the first tab; history paths read with `-z` | `--rev` and history controls on `a<TAB>b/state.json`; two mutations |
| S2-4 | LOW | **Upheld.** A gitlink made `--rev` crash with "object missing" | Tree and `--rev` refuse a submodule; tree mode also refuses an untracked nested repository, which it had skipped silently | three refusal controls; two mutations |
| S3-1 | HIGH | **Upheld.** Labels were searched only before the value on its own line, and only exactly 64 or 66 hex digits counted | 58 to 66 digits; the previous line when it ends in `key:` or `key =`; after the value on a Markdown table row | four controls; four mutations, one of them in the false-positive direction |
| S3-2 | HIGH | **Upheld.** No AWS secret access key pattern | Added, labelled, with a sample | `credential: AWS secret access key` |
| S3-3 | HIGH | **Upheld.** A malformed store file fell back to scanning for seeds and silently dropped its 64-hex scalars | A malformed store file refuses | control; mutation |
| S3-4 | LOW | **Upheld.** The scrubber's docstring said everything left is printed; a generic-name home is not, and this machine's paths are replaced even where the gate would not flag them | Docstring corrected; the over-reach is kept and stated, because it only ever removes this machine's paths | — |
| S4-1 | HIGH | **Upheld in part.** See below | Toy bound lowered from 2^64 to 2^32 | control just above the bound; mutation |
| S5-1 | MEDIUM | **Upheld.** Contradictory or unknown flags scanned nothing and passed | Strict argument parsing; refuse contradictions; refuse scanning nothing | seven CLI probes in the harness; one mutation |
| S5-2 | LOW | **Upheld.** An early failure exited without the verdict line | The whole main body is inside one `try` | the `--repo /nonexistent` CLI probe |
| S5-3 | MEDIUM | **Upheld.** `--rev` counted unique blobs as files, and the record called a run "the final tree" when three files were added after it | Files counted by path; the record re-run and corrected | control with two paths and one blob; mutation |

## S4-1, the part not upheld

The leg's argument is that the toy-scalar and repeated-byte allowances are
context-free, so `production_private_key: 0x…fffffffffffffff1` and a repeated-byte
seed labelled `production_seed` both pass.

**Context does not change arithmetic.** Each rule admits only values anyone can
recover from public information: a repeated-byte seed is one of 256, and its
account can be swept by anyone who tries them. Publishing such a value adds
nothing that was not already public, whatever the label says. That half is
rejected, and the reason is now in the code.

**The bound is upheld.** 2^64 was looser than the argument needs. A key in a 2^64
interval falls to a kangaroo walk of about 2^32 steps, which is cheap but not
free. At 2^32 "already public" holds without qualification, and the only labelled
toy scalars in the tree are 7, 11, 13 and 17.

## What the adjudication found that the leg did not

- ⚠ **A flaky control was a real detector defect.** After the S1-1 fix, one run
  in thirty failed `credential: Google API key`. The pattern ended in `\b`, and a
  key may end in `-`, which leaves no word boundary before a newline. So about one
  real key in 32 was invisible to the gate. The sample was right and the pattern
  was wrong. Fixed with a negative lookahead; then 60 of 60 runs passed.
- ⚠ **The S3-1 fix as first written produced false positives.** Taking any text
  on the previous line as a label flagged four nonce test vectors in
  `tools/spike-2026-08-18/t1-vectors.json`, listed in arrays named like
  `"pok_sk, single nonce": [`. Narrowed: the previous line counts only when it
  ends in `key:` or `key =`. An array of values under a label is now a printed
  limit with an asserted-uncaught control, not a silent gap.
- **The leg's own transcript failed the strengthened gate.** It planted
  `[synthetic personal-path redacted]`, `aws_secret_access_key=AAAA…` and a toy key above 2^32. The
  first two are now allowed by rule: `alice` and `bob` are the conventional
  placeholder names, and a credential ending in sixteen copies of one character
  is a placeholder. The toy key is a cited vector naming this round. All three
  rules are printed in the gate's allowed list on every run.
- **One scalar is now allowed by a rule rather than a citation.** `REVIEW-010a`
  uses `sk_A = 0x0101…01` as a test input. A scalar of one repeated byte is
  public for the same reason as the seed rule.

## Round two

Owed under `CLAUDE.md`'s two-round rule, because round one found defects and
the fixes themselves have been seen by nobody. **Its stopping condition, set
before it runs: no third round unless round two finds a fix that did not
discharge its finding.**
