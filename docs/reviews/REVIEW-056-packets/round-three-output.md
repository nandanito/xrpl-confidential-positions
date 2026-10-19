Step 0 completed first: both network checks returned `200`; HEAD is `88fa7077fab0b448128d5b6f31e5c3708887bfe0`. The worktree remains clean and no commit was made.

## Seam 1 — class discharge

### R3-1 — MEDIUM — R2-1 still misses valid unpadded scalars below 48 digits

File: [tools/check-no-secrets.ts:325]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:325)

Concrete input: a runtime-generated, nonzero 47-hex-digit scalar greater than \(2^{32}\), under `private_key:`. It is a valid private-scalar magnitude with roughly 188 bits.

Wrong output: the detector returned zero findings; an exact-tree gate containing this fixture, the R3-2 fixture, and the R3-3 fixture returned:

```text
scanned: 3 file(s) in the tree
check-no-secrets: verdict=PASS exit=0
```

Commands run:

```sh
bun -e 'import {randomBytes} from "node:crypto"; import {labelledHits} from "./tools/check-no-secrets.ts"; const h="b"+randomBytes(24).toString("hex").slice(1,47); console.log(labelledHits(`private_key: ${h}`).filter(x=>!x.allowedBy).length)'
bun run tools/check-no-secrets.ts --repo "$REVIEW_REPO" --rev HEAD --store "$REVIEW_STORE"
```

The first command printed `0`. R2-1 is **not discharged**.

### R3-2 — MEDIUM — R2-2 misses a space-separated AWS label

File: [tools/check-no-secrets.ts:370]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:370)

Concrete input: `AWS Secret Access Key =` followed by a runtime-generated 40-character AWS-shaped value. The fix allows no separator, `_`, or `-`, but not spaces between the label’s words.

Wrong output: `credentialHits()` returned zero findings and the three-file exact-tree run above returned `PASS exit=0`.

Command run:

```sh
bun run tools/check-no-secrets.ts --repo "$REVIEW_REPO" --rev HEAD --store "$REVIEW_STORE"
```

R2-2 is **not discharged**.

### R3-3 — MEDIUM — R2-5’s cited name allows every path for that person

Files: [tools/check-no-secrets.ts:417]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:417), [tools/check-no-secrets.ts:424]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:424)

Concrete input: a macOS home path using the exact cited-case name, followed by `private-client/plan.md`. The citation is attached only to the username, not the cited file, path, or fixture occurrence.

Wrong output:

```text
allowed:
  1  personal-path: REVIEW-056 round one, the leg's synthetic fixture path
check-no-secrets: verdict=PASS exit=0
```

Command run:

```sh
bun run tools/check-no-secrets.ts --repo "$REVIEW_REPO" --rev HEAD --store "$REVIEW_STORE"
```

Lower-case `alice` and `Bob` correctly failed, but arbitrary paths under exact-case `Alice` passed. R2-5 is **not discharged**.

### R3-4 — MEDIUM — R2-10’s replacement sentence is still false

Files: [tools/check-no-secrets.ts:27]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:27), [tools/check-no-secrets.ts:383]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:383), [REVIEW-056d:29]($USER_TMP/T/x.0qeFLR/repo/docs/reviews/REVIEW-056d-adjudication-round-two-2026-10-18.md:29)

The table says a credential is allowed when “its whole value is one character repeated.” The implementation checks only the captured variable body. Structured prefixes therefore make the whole value non-repeated.

Concrete input: the placeholder prefix `ghp_` followed by 36 `A` characters.

Wrong output:

```text
whole-value-repeated=false allowed=1 failing=0
```

Command run:

```sh
bun -e 'import {credentialHits} from "./tools/check-no-secrets.ts"; const token="ghp_"+"A".repeat(36); const h=credentialHits(token); console.log(`whole-value-repeated=${[...token].every(c=>c===token[0])} allowed=${h.filter(x=>x.allowedBy).length} failing=${h.filter(x=>!x.allowedBy).length}`);'
```

The implementation matches REVIEW-056d’s “whole variable part” explanation, but not the corrected gate table. R2-10 is **not discharged**.

R2-4, R2-6, R2-7, R2-8, R2-9, and R2-11: no class-discharge findings.

I agree with R2-3’s rejection: a named refusal for content owned by another repository is materially different from the former missing-object crash and is the intended publication decision.

## Seam 2 — new false passes

**No findings.**

The round-two changes mostly narrow previous allowances or add detection. The surviving false passes are the undischarged classes reported as R3-1 through R3-3, rather than new false passes introduced by those changes.

## Seam 3 — `redact-review-fixtures.ts`

### R3-5 — LOW — lexical path validation permits writing outside `docs/reviews/`

File: [tools/redact-review-fixtures.ts:36]($USER_TMP/T/x.0qeFLR/repo/tools/redact-review-fixtures.ts:36)

Concrete input: a runtime-generated Slack-shaped credential in `tools/.review056r3-outside.txt`, addressed as `docs/reviews/../../tools/.review056r3-outside.txt`.

Wrong output:

```text
credential 1; 0 left
redacted 1 span(s)
exit=0
outside-marker=true failing-after=0
```

Command run:

```sh
bun run tools/redact-review-fixtures.ts --write "docs/reviews/../../$REVIEW_OUT_FILE"
```

Thus it can hide a credential in a location its own policy presumes real. A real non-store credential is indistinguishable from the generated probe.

### R3-6 — LOW — path-only gate failures are reported as “0 left”

Files: [tools/redact-review-fixtures.ts:43]($USER_TMP/T/x.0qeFLR/repo/tools/redact-review-fixtures.ts:43), [tools/redact-review-fixtures.ts:55]($USER_TMP/T/x.0qeFLR/repo/tools/redact-review-fixtures.ts:55)

Concrete input: a safe, empty `docs/reviews/state.json`. The gate fails this filename as `secret-file`, but the redactor only calls `scanText()` on its content.

Wrong output:

```text
docs/reviews/state.json: nothing; 0 left
would redact 0 span(s)
secret-file-hit=true
```

Commands run:

```sh
bun run tools/redact-review-fixtures.ts docs/reviews/state.json
bun -e 'import {secretFileHit} from "./tools/check-no-secrets.ts"; console.log(`secret-file-hit=${secretFileHit("docs/reviews/state.json")!==null}`);'
```

The stored-value refusal itself worked: with a runtime-generated synthetic store injected through `WCONF_STATE_BACKUP`, the redactor exited 2 and left the fixture unchanged. The gate’s known-value path was separately exercised with `--store "$REVIEW_STORE"`. No additional wrong in-text replacement span was reproduced.

## Seam 4 — controls and mutations

### R3-7 — LOW — the cited-path stale pin can be reverted while everything passes

Files: [tools/check-no-secrets.ts:1215]($USER_TMP/T/x.0qeFLR/repo/tools/check-no-secrets.ts:1215), [tools/break-no-secrets-gate.ts:149]($USER_TMP/T/x.0qeFLR/repo/tools/break-no-secrets-gate.ts:149)

I temporarily removed `...CITED_PATH_NAMES.values()` from the stale-source list. The harness’s stale mutation plants only a `CITED_VECTOR`, so it does not test the cited-path source.

Wrong output:

```text
controls: 93/93 passed
check-no-secrets: verdict=CONTROLS-PASS exit=0
break-no-secrets-gate: verdict=PASS probes=81 failed=0
```

Commands run:

```sh
bun run tools/check-no-secrets.ts --controls-only
bun run tools/break-no-secrets-gate.ts
```

The line was restored immediately. `git diff --exit-code` is clean.

## Seam 5 — record

### R3-8 — MEDIUM — the record overstates that the three classes were discharged

Files: [REVIEW-056d:67]($USER_TMP/T/x.0qeFLR/repo/docs/reviews/REVIEW-056d-adjudication-round-two-2026-10-18.md:67), [CLAIMS.md:380]($USER_TMP/T/x.0qeFLR/repo/CLAIMS.md:380)

REVIEW-056d says three fixes “needed round two to discharge their class,” and E-320 says they were fixed in `f0d86f1`. R3-1, R3-2, and R3-3 show narrower surviving members of each class; R3-4 also leaves R2-10’s code/table inconsistency standing.

Command showing the false claim:

```sh
bun run tools/check-no-secrets.ts --repo "$REVIEW_REPO" --rev HEAD --store "$REVIEW_STORE"
```

It returned `PASS exit=0` over all three undetected inputs.

### R3-9 — MEDIUM — both records falsely say the redactor refuses outside files

Files: [REVIEW-056d:57]($USER_TMP/T/x.0qeFLR/repo/docs/reviews/REVIEW-056d-adjudication-round-two-2026-10-18.md:57), [CLAIMS.md:380]($USER_TMP/T/x.0qeFLR/repo/CLAIMS.md:380)

Both say the redactor refuses files outside `docs/reviews/`. R3-5’s traversal returned exit 0 and modified a file under `tools/`.

Command run:

```sh
bun run tools/redact-review-fixtures.ts --write "docs/reviews/../../$REVIEW_OUT_FILE"
```

The counts themselves have no finding:

```text
37 seed + 225 personal-path + 49 labelled-scalar + 47 credential = 358
93/93 controls
81/81 harness probes
30/30 repeated control runs
```

The default gate also reproduced `19` secrets, `5` store files, `67` encodings, and `PASS exit=0`.

# FINAL REPORT

- Seam 1 — MEDIUM R3-1: R2-1 misses valid labelled unpadded scalars shorter than 48 digits.
- Seam 1 — MEDIUM R3-2: R2-2 misses an AWS secret under a space-separated label.
- Seam 1 — MEDIUM R3-3: R2-5 allows every path under the exact cited-case username.
- Seam 1 — MEDIUM R3-4: R2-10 says the whole credential repeats while only its captured body is tested.
- Seam 2 — **no findings**.
- Seam 3 — LOW R3-5: `../` traversal lets the redactor write outside `docs/reviews/` and hide an outside credential.
- Seam 3 — LOW R3-6: a path-only `secret-file` failure is reported as “nothing; 0 left.”
- Seam 4 — LOW R3-7: reverting the cited-path stale pin passes all 93 controls and all 81 probes.
- Seam 5 — MEDIUM R3-8: REVIEW-056d and E-320 overstate that the affected classes were discharged/fixed.
- Seam 5 — MEDIUM R3-9: REVIEW-056d and E-320 falsely claim outside files are refused.

- R2-1 — **not discharged**
- R2-2 — **not discharged**
- R2-4 — **discharged**
- R2-5 — **not discharged**
- R2-6 — **discharged**
- R2-7 — **discharged**
- R2-8 — **discharged**
- R2-9 — **discharged**
- R2-10 — **not discharged**
- R2-11 — **discharged**
