STEP 0

- GitHub: `200`
- npm registry: `200`
- Network available.
- Clone: `$USER_TMP/T/x.ROpM8B/repo`
- HEAD: `cef0b4f Regenerate the revision log after E-318`
- Worktree finished clean; no commits were made. Synthetic fixtures under `$TMPDIR` were removed.

I found 11 issues: 7 MEDIUM and 4 LOW. Three round-one findings are not discharged, so REVIEW-056c’s stated condition for a third round is met.

## Seam 1 — Do the thirteen fixes discharge their findings?

### R2-1 — MEDIUM — S3-1 is not discharged for valid multiline JSON and shorter unpadded scalars

File: [tools/check-no-secrets.ts:310]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:310), [tools/check-no-secrets.ts:324]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:324)

The original one-line-to-next-line example is fixed, but the class is not:

```json
{"private_key":

 "[synthetic labelled-scalar redacted]"}
```

This is valid JSON. The blank line prevents the label lookup. A valid 57-digit unpadded scalar also falls below the hard-coded `{58,66}` range:

```text
private_key: [synthetic labelled-scalar redacted]
```

Wrong output:

```text
blank-line pretty-json: findings=0 allowed=none
unpadded-57: findings=0 allowed=none
check-no-secrets: verdict=PASS exit=0
```

Command run:

```sh
bun run "$TMPDIR/review056-round2.o40dCR/detector-probes.ts" \
  "$TMPDIR/review056-round2.o40dCR/store2"

bun run tools/check-no-secrets.ts \
  --repo "$TMPDIR/review056-round2.o40dCR/false-pass" \
  --rev HEAD \
  --store "$TMPDIR/review056-round2.o40dCR/phase-store"
```

The exact round-one 63-digit, immediate-previous-line and Markdown-table cases were caught. The broader finding was not.

### R2-2 — MEDIUM — S3-2’s AWS detector recognizes the example label, not the class

File: [tools/check-no-secrets.ts:363]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:363)

The new regex requires the label to start with `aws`. A standard AWS-style JSON field passes:

```json
{"[synthetic credential redacted]"}
```

Wrong output:

```text
round1 aws-secret: findings=1 allowed=none
AWS JSON SecretAccessKey: findings=0 allowed=none
AWS hyphenated label: findings=0 allowed=none
check-no-secrets: verdict=PASS exit=0
```

Command run:

```sh
bun run "$TMPDIR/review056-round2.o40dCR/detector-probes.ts" \
  "$TMPDIR/review056-round2.o40dCR/store2"
```

The exact round-one `aws_secret_access_key=...` input is caught, but the AWS secret-access-key class is not discharged.

### R2-3 — LOW — S2-4 still refuses an ordinary submodule

File: [tools/check-no-secrets.ts:628]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:628), [tools/check-no-secrets.ts:669]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:669)

An actual superproject created with `git submodule add` still gives the original outcome:

```text
ordinary submodule tree: ... verdict=REFUSED exit=2
ordinary submodule rev: ... verdict=REFUSED exit=2
```

Command run:

```sh
bun run tools/check-no-secrets.ts \
  --repo "$TMPDIR/review056-round2.o40dCR/repos/ordinary-submodule" \
  --rev HEAD --no-local-store
```

The error is clearer than the former “object missing”, but round one’s finding was that an ordinary submodule makes `--rev` refuse. That behavior remains.

### Status of all thirteen round-one findings

| Round-one ID | Status | Replay result |
|---|---|---|
| S1-1 | **discharged** | Original deletion false pass not reproduced; every credential-pattern deletion was caught by the 74-probe harness. |
| S2-1 | **discharged** | Original filter fixture now returns `REFUSED` in tree and `--rev`. |
| S2-2 | **discharged** | Original replacement-ref fixture now returns `FAIL` in both `--rev` and history. |
| S2-3 | **discharged** | Tabbed `state.json` path returns `FAIL` in both modes. |
| S2-4 | **not discharged** | Ordinary submodule still returns `REFUSED`. |
| S3-1 | **not discharged** | Original examples are caught, but valid blank-line JSON and 57-digit unpadded scalars pass. |
| S3-2 | **not discharged** | Exact example is caught; `SecretAccessKey` and hyphenated labels pass. |
| S3-3 | **discharged** | Malformed synthetic store returns `REFUSED=true`. |
| S3-4 | **discharged** | Could not reproduce a documentation mismatch: the docstring now accurately states both retained behaviors. |
| S4-1 | **discharged** | The upheld part is fixed: a scalar above \(2^{32}\) fails and the bound-revert mutation is caught. |
| S5-1 | **discharged** | Contradictory, unknown and missing-value arguments all return `REFUSED exit=2`. |
| S5-2 | **discharged** | Nonexistent `--repo` returns a verdict line and exit 2; no stack-only crash reproduced. |
| S5-3 | **discharged** | `04aa4f3` reports 620 files, matching `git ls-tree`; duplicate blobs count as two paths. |

## Seam 2 — Added allow rules

### R2-4 — MEDIUM — Repeated-tail allowance can hide a real credential prefix

File: [tools/check-no-secrets.ts:375]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:375)

For variable-length credential patterns, appending sixteen allowed repeated characters changes a failing credential into an allowed placeholder. The original credential remains recoverable by stripping the suffix.

Wrong output:

```text
token: failing=1 allowed=none
token-plus-tail: failing=0 allowed=a placeholder (its last 16 characters are one character)
```

Command run:

```sh
bun -e 'import {credentialHits} from "./tools/check-no-secrets.ts";
const token="xoxb-"+"Ab3-".repeat(6);
for (const [n,v] of [["token",token],["token-plus-tail",token+"-".repeat(16)]]) {
  const h=credentialHits(v);
  console.log(`${n}: failing=${h.filter(x=>!x.allowedBy).length} allowed=${h.map(x=>x.allowedBy).filter(Boolean).join("|")||"none"}`);
}'
```

### R2-5 — MEDIUM — A real person named Alice or Bob passes the path gate

File: [tools/check-no-secrets.ts:402]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:402)

Concrete input:

```text
[synthetic personal-path redacted]/private-client/plan.md
```

Wrong output:

```text
alice path: findings=0 allowed=generic user name
check-no-secrets: verdict=PASS exit=0
```

Command run:

```sh
bun run tools/check-no-secrets.ts \
  --repo "$TMPDIR/review056-round2.o40dCR/false-pass" \
  --rev HEAD \
  --store "$TMPDIR/review056-round2.o40dCR/phase-store"
```

The gate cannot distinguish the conventional placeholder from an actual user whose account name is `alice` or `bob`.

No additional finding for the one-repeated-byte scalar, cited fixture, or \(2^{32}\) toy bound: the tested values passed under their stated public-by-construction policy. The previous-line narrowing is covered by R2-1.

## Seam 3 — Git environment and refusals

### R2-6 — LOW — A comment in `.gitattributes` makes `--rev` refuse

File: [tools/check-no-secrets.ts:678]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:678)

The tree path correctly uses parsed `git check-attr -z`; the revision path searches raw text.

Concrete input:

```gitattributes
# Documentation example: *.txt filter=inject
```

Git reports:

```text
payload.txt: filter: unspecified
```

Wrong output:

```text
REFUSED: Error: content-transforming attributes in .gitattributes at HEAD
check-no-secrets: verdict=REFUSED exit=2
```

Command run:

```sh
git -C "$TMPDIR/review056-round2.o40dCR/repos/attr-comment" \
  check-attr filter -- payload.txt

bun run tools/check-no-secrets.ts \
  --repo "$TMPDIR/review056-round2.o40dCR/repos/attr-comment" \
  --rev HEAD --no-local-store
```

`GIT_NO_REPLACE_OBJECTS`, shallow-history and graft refusals worked in the real gate. No crash without a final verdict line was reproduced.

## Seam 4 — Controls and mutations

### R2-7 — LOW — The graft refusal can be reverted while every control and probe passes

File: [tools/check-no-secrets.ts:703]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:703), [tools/break-no-secrets-gate.ts:123]($USER_TMP/T/x.ROpM8B/repo/tools/break-no-secrets-gate.ts:123)

I changed only the graft check to `if (false && ...)`.

Wrong output:

```text
controls: 84/84 passed
break-no-secrets-gate: verdict=PASS probes=74 failed=0
scanned: 0 file(s) in the tree, 1 history object(s)
check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

The hidden parent contained a synthetic seed.

Commands run:

```sh
bun run tools/check-no-secrets.ts --controls-only
bun run tools/break-no-secrets-gate.ts
bun run tools/check-no-secrets.ts \
  --repo "$TMPDIR/review056-round2.o40dCR/repos/history" \
  --history-only --no-local-store
```

The real check was restored afterward.

### R2-8 — LOW — The Google boundary fix can also be reverted while all 74 probes pass

File: [tools/check-no-secrets.ts:367]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:367), [tools/break-no-secrets-gate.ts:155]($USER_TMP/T/x.ROpM8B/repo/tools/break-no-secrets-gate.ts:155)

I restored the old trailing `\b`. A deterministic key ending in `-` then produced:

```text
google-ending-hyphen findings=0
controls: 84/84 passed
break-no-secrets-gate: verdict=PASS probes=74 failed=0
```

Commands run:

```sh
bun -e 'import {credentialHits} from "./tools/check-no-secrets.ts";
const k="AIza"+"A".repeat(34)+"-";
console.log(`google-ending-hyphen findings=${credentialHits(k).filter(h=>!h.allowedBy).length}`);'

bun run tools/check-no-secrets.ts --controls-only
bun run tools/break-no-secrets-gate.ts
```

The current sample is random, so it exercises the `-` ending only probabilistically. The committed mutation removes the whole pattern; it does not revert this boundary fix. The real check was restored afterward.

## Seam 5 — Record

### R2-9 — MEDIUM — “Each code fix is pinned” and “Fixed in 04aa4f3” are false

Files: [REVIEW-056c:10]($USER_TMP/T/x.ROpM8B/repo/docs/reviews/REVIEW-056c-adjudication-check-no-secrets-2026-10-18.md:10), [CLAIMS.md:378]($USER_TMP/T/x.ROpM8B/repo/CLAIMS.md:378)

The graft and Google reverts both passed `84/84` controls and `74/74` probes. In addition, S2-4, S3-1 and S3-2 are not discharged. Those outputs are the commands under R2-1, R2-2, R2-3, R2-7 and R2-8.

### R2-10 — MEDIUM — The record says no credential shape appears, while the gate reports two

Files: [tools/check-no-secrets.ts:27]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:27), [evidence README:41]($USER_TMP/T/x.ROpM8B/repo/docs/evidence/secret-sweep-2026-10-18/README.md:41)

The detector table says credentials are allowed “never”, and the evidence says “No credential shape appears either.” The fixed gate reports:

```text
2  credential: a placeholder (its last 16 characters are one character)
```

Command run:

```sh
bun run tools/check-no-secrets.ts --tree-only --no-local-store
```

The accurate claim is that no *failing/non-placeholder* credential shape appears.

### R2-11 — MEDIUM — The Google-key miss rate is described as 1/32, but the implemented alphabet gives 1/64

Files: [tools/check-no-secrets.ts:365]($USER_TMP/T/x.ROpM8B/repo/tools/check-no-secrets.ts:365), [REVIEW-056c:60]($USER_TMP/T/x.ROpM8B/repo/docs/reviews/REVIEW-056c-adjudication-check-no-secrets-2026-10-18.md:60), [CLAIMS.md:378]($USER_TMP/T/x.ROpM8B/repo/CLAIMS.md:378)

Under JavaScript `\b`, `_` is a word character; only `-` among the 64 generated suffix characters is missed.

Output:

```text
end A: true
end _: true
end -: false
alphabet=64 missed-endings=1 probability=1/64
```

Command run:

```sh
bun -e 'const alpha="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const old=/\bAIza[0-9A-Za-z_-]{35}\b/g;
for (const c of ["A","_","-"]) {
  const k="AIza"+"A".repeat(34)+c;
  old.lastIndex=0;
  console.log(`end ${c}: ${old.test(k)}`);
}
console.log(`alphabet=${alpha.length} missed-endings=1 probability=1/${alpha.length}`);'
```

Other checked counts had no finding:

- `84/84` controls and `74/74` probes reproduced.
- Harness self-test: `4/4`.
- 60/60 additional control runs passed after restoration.
- `19` stored secrets, `5` files and `67` encodings reproduced without printing values.
- `620` paths at `04aa4f3` agrees with the gate.
- `11` distinct checksum-valid seeds reproduced.
- Scrub tables contain 42 tracked files and 46 changed F-12 logs; the four email-bearing review rows reconcile with the separately fixed code file.

# FINAL REPORT

- MEDIUM R2-1 — S3-1 remains bypassable by valid blank-line JSON and valid unpadded scalars shorter than 58 digits.
- MEDIUM R2-2 — S3-2 detects the cited `aws_secret_access_key` spelling but misses `SecretAccessKey` and hyphenated labels.
- LOW R2-3 — S2-4 is not discharged: ordinary submodules still make tree and `--rev` refuse.
- MEDIUM R2-4 — Appending sixteen repeated allowed characters converts a failing variable-length credential into an allowed placeholder while preserving the credential prefix.
- MEDIUM R2-5 — A real `[synthetic personal-path redacted]` or `[synthetic personal-path redacted]` path passes as generic.
- LOW R2-6 — `--rev` treats `filter=` in a `.gitattributes` comment as an active transform and refuses an ordinary repository.
- LOW R2-7 — Reverting graft refusal passes all 84 controls and all 74 probes, then hides a secret-bearing parent.
- LOW R2-8 — Reverting the Google negative-lookahead fix passes all 84 controls and all 74 probes.
- MEDIUM R2-9 — REVIEW-056c and E-318 overstate that every fix is pinned and all findings are fixed.
- MEDIUM R2-10 — The record says no credential shape appears and credentials are never allowed, while the gate reports two allowed credential shapes.
- MEDIUM R2-11 — The Google-key miss rate is 1/64 under the implemented alphabet, not the recorded 1/32.

Round-one disposition: **S1-1 discharged; S2-1 discharged; S2-2 discharged; S2-3 discharged; S2-4 not discharged; S3-1 not discharged; S3-2 not discharged; S3-3 discharged; S3-4 discharged; S4-1 discharged; S5-1 discharged; S5-2 discharged; S5-3 discharged.**

Every seam has at least one finding; there are no seams for which `no findings` applies.
