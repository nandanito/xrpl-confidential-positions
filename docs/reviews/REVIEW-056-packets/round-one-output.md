STEP 0

- `https://github.com` → `200`
- `https://registry.npmjs.org` → `200`
- Network available.
- `pwd` → `$USER_TMP/T/x.WSd2dt/repo`
- `git log --oneline -1` → `b1dba96 Regenerate the revision log after E-317`
- The worktree remained clean; no files were committed.

Baseline: the real gate passed with 51/51 controls, the harness passed 40/40 probes, and its self-test correctly classified the no-op, crash, wrong-control, and valid mutations.

## Seam 1 — Controls and mutation harness

### S1-1 — HIGH — An existing credential detector can be deleted while every control and all 40 harness probes pass

At [check-no-secrets.ts:312]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:312), ten credential patterns exist, but controls exercise only GitHub and PEM. The 33 mutations at [break-no-secrets-gate.ts:88]($USER_TMP/T/x.WSd2dt/repo/tools/break-no-secrets-gate.ts:88) likewise mutate only those two patterns.

Mutation: delete the OpenAI-key entry at line 317. Plant: `sk-` followed by 40 `A` characters.

Wrong output:

```text
deleted OpenAI detector controls: check-no-secrets: verdict=CONTROLS-PASS exit=0
deleted OpenAI detector harness: break-no-secrets-gate: verdict=PASS probes=40 failed=0
deleted OpenAI detector planted token: check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

Command run:

```sh
bun run tools/.review056-mutation.ts
```

That was a temporary untracked mutation driver and was removed afterward.

The existing 33 mutations are mostly credible one-edit regressions; several regex removals are mechanically artificial but exercise the intended failure. The principal problem is coverage: most credential patterns and the entire `--rev` enumerator have no mutation probe.

## Seam 2 — Enumeration

### S2-1 — HIGH — `.gitattributes` clean filters can inject a secret after tree scanning

[treeUnits()]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:551) reads working-tree bytes directly, but `git add -A` applies clean filters before creating blobs.

Synthetic input:

```gitattributes
payload.txt filter=inject
```

`payload.txt` contained `SAFE`; the configured clean filter replaced it with a generated XRPL seed.

Wrong output:

```text
clean filter before git add: check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
clean filter committed secret=true; after commit: check-no-secrets: verdict=FAIL exit=1
```

Thus the gate passed the tree immediately before `git add -A`, although `git add -A` committed a seed.

Command run:

```sh
bun run tools/.review056-probes.ts
```

The temporary probe driver was removed.

### S2-2 — HIGH — Git replacement objects hide secrets from both revision and history scans

Git commands at [check-no-secrets.ts:524]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:524) do not set `GIT_NO_REPLACE_OBJECTS`. Consequently, `git cat-file --batch` at lines 536–546 transparently substitutes objects named by `refs/replace`.

Fixture: commit a random XRPL seed, replace its blob locally with `SAFE`, and overwrite the worktree with `SAFE`. The original commit still references the secret-bearing object and that is what would normally be pushed.

Wrong output:

```text
replace ref original secret=true
rev: check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
history: check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

Command run:

```sh
bun run tools/.review056-probes.ts
```

### S2-3 — MEDIUM — A tab in a committed filename hides its suffix in `--rev`

[revUnits()]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:570) parses `ls-tree -z` records with `l.split("\t")`. A path containing another tab is truncated.

Concrete committed path:

```text
safe<TAB>[synthetic personal-path redacted]/state.json
```

Git retained the whole filename, including both a personal path and `state.json`; the gate scanned only `safe`.

Wrong output:

```text
tab filename contains secret path=true
rev: check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
```

Command run:

```sh
bun run tools/.review056-probes.ts
```

### S2-4 — LOW — Ordinary submodules make `--rev` refuse

`revUnits()` sends gitlink object IDs to `cat-file`; a normal superproject does not contain the submodule’s commit object. [batchObjects()]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:536) therefore throws “object … missing”.

Wrong output:

```text
ordinary submodule rev: check-no-secrets: verdict=REFUSED exit=2
```

Command run:

```sh
bun run tools/.review056-probes.ts
```

This is a false fail, not a secret-publishing pass.

No additional enumeration findings: the synthetic history fixture successfully detected an old renamed `state.json` path, a seed in an annotated-tag message, and a seed in a merge-commit message. Existing controls correctly cover ordinary disk/index deletion differences and symlinks.

## Seam 3 — Detector holes and scrubber

### S3-1 — HIGH — Pretty JSON, output-first tables, and unpadded private scalars pass

[labelBefore()]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:283) searches only backward, on the same line, within 40 characters. `HEX_64_66` at line 290 recognizes only exactly 64 or 66 digits.

All these returned zero findings:

```text
{"private_key":
 "aaaaaaaa…(64 digits)"}

| aaaaaaaa…(64 digits) | private key |

private_key: aaaaaaaa…(63 digits)
```

The 63-digit value is a valid unpadded scalar shape; approximately 1/16 of uniformly generated scalars begin with a zero nibble when rendered without padding.

Command and output:

```sh
bun -e 'import {scanText} from "./tools/check-no-secrets.ts"; /* five cases */'
```

```text
63-digit 0
pretty-json 0
markdown-reversed 0
pretty-entropy 0
aws-secret 0
```

### S3-2 — HIGH — AWS secret access keys are not detected

The credential list detects AWS access-key IDs at [line 318]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:318), but not the corresponding 40-character secret access key.

Concrete input:

```text
aws_secret_access_key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

Wrong output: `scanText` returned zero findings.

Command: the same `bun -e` detector command above, producing `aws-secret 0`.

### S3-3 — HIGH — A malformed store silently omits its unlabelled scalar

At [check-no-secrets.ts:468]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:468), malformed JSON falls back to scanning only base58 seeds. A 64-hex scalar in that store is silently lost. If another valid store entry exists, the non-empty-store refusal does not activate.

Fixture:

- `good.json`: one random valid seed.
- `broken.json`: truncated `{"sk":"<64 hex>"`.
- Scan the same scalar bare in publication text.

Output:

```text
files=2 secrets=1 bareScalarFindings=0
```

Command run:

```sh
bun -e 'import {loadStore,scanText} from "./tools/check-no-secrets.ts"; /* creates and removes synthetic store */'
```

This defeats the only class capable of recognizing an unlabelled local scalar.

### S3-4 — LOW — The scrubber both over-replaces and can leave an “other user” path unreported

The substitutions at [scrub-personal-data.ts:82]($USER_TMP/T/x.WSd2dt/repo/tools/scrub-personal-data.ts:82) use unrestricted `replaceAll`.

- `X + homedir() + /file` had zero `pathHits`, but `scrub()` changed it anyway.
- `/home/user/private-client/work` remained unchanged and had zero failing hits because `user` is generic, contrary to the scrubber’s statement that another user’s remaining home is printed.

Command and output:

```sh
bun -e 'import {scrub} from "./tools/scrub-personal-data.ts"; import {pathHits} from "./tools/check-no-secrets.ts"; /* /home/user fixture */'
```

```text
changed=false pathHits=1 failing=0 allowed=generic user name
```

Plain macOS/Linux/Windows paths, escaped paths, temp paths, and ordinary personal emails were detected correctly.

## Seam 4 — Allow rules

### S4-1 — HIGH — “Toy” and public-entropy allowances are context-free and can admit operational private keys

[TOY_SCALAR_BOUND]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:183) treats every scalar below \(2^{64}\) as harmless, regardless of filename or label.

Concrete valid private scalar:

```text
production_private_key: 000000000000000000000000000000000000000000000000fffffffffffffff1
```

Wrong output:

```text
findings=0 allowed=a toy scalar below 2^64
```

Similarly, [PUBLIC_ENTROPY]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:145) permits all 256 repeated-byte family seeds everywhere. `loadStore()` even skips such a seed at line 451. A fixture labelled `production_seed` passed as:

```text
repeated failing=0 allowed=public entropy: one byte repeated sixteen times
```

Command run:

```sh
bun -e 'import {scanText} from "./tools/check-no-secrets.ts"; import {encodeSeed} from "ripple-address-codec"; /* toy and repeated-byte cases */'
```

The cited-vector provenance itself had no finding:

- REVIEW-005a’s five values were independently reproduced: `5 vectors reproduced, 0 failed`.
- Both REVIEW-012b values equal the named `OKM64 mod n`.
- Reserved domains and the three role addresses are accurate.
- `GENERIC_USERS` can pass a real path such as `/home/user`, but this is explicitly printed as a limit.

## Seam 5 — Decision layer and record

### S5-1 — MEDIUM — Contradictory mode flags scan zero files and return PASS

Argument selection at [check-no-secrets.ts:899]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:899) can set both `doTree` and `doHistory` false. The zero-scan refusal at line 862 checks only enabled scopes, so neither side fires.

Command and wrong output:

```sh
bun run tools/check-no-secrets.ts --tree-only --history-only |
  rg '^(known-value:|scanned:|check-no-secrets:)'
```

```text
known-value: 19 secret(s) from 5 file(s) in the local store, 67 encodings searched; 0 stored seed(s) skipped as public by construction
scanned: 0 file(s) in the tree, 0 history object(s)
check-no-secrets: verdict=PASS exit=0
```

`--history-only --rev HEAD` has the same zero-scan pass. Unknown flags are also silently accepted; a misspelled `--strict-histroy` returned `PASS-SHAPES-ONLY` while reporting the 1,075 historical personal-data hits.

### S5-2 — LOW — Early CLI failures violate the guaranteed verdict-line protocol

`realpathSync()` at [line 896]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:896) is outside the refusal `try/catch`.

Command:

```sh
bun run tools/check-no-secrets.ts --repo "$TMPDIR/review056-does-not-exist" --no-local-store
```

Wrong output: exit `1`, a Bun stack trace, and no final `check-no-secrets: verdict=...` line, contradicting the documented “always” invariant.

### S5-3 — MEDIUM — The file count and “final tree” record are false

`revUnits()` deduplicates entries by object ID at [lines 576–578]($USER_TMP/T/x.WSd2dt/repo/tools/check-no-secrets.ts:576), and `scanRepo()` labels the resulting number as files. Current `HEAD` has 616 blob paths but `--rev HEAD` reports 613 files.

Commands:

```sh
git ls-tree -r --full-tree HEAD | wc -l
bun run tools/check-no-secrets.ts --repo . --rev HEAD --no-local-store
```

Outputs: `616` versus `scanned: 613 file(s)`.

The evidence block at [secret-sweep README:18]($USER_TMP/T/x.WSd2dt/repo/docs/evidence/secret-sweep-2026-10-18/README.md:18) calls its 613-file measurement the “final tree”, but commit `aaa95f2` contains 616 blob paths. At least three final-tree paths were added after that run.

Other record checks had no finding:

- 51 controls and 33 mutations are correct.
- The eleven checksum-valid seeds count is correct.
- The 42 path files, four email files, and 43-file union reconcile once the separately fixed code file is included.
- Default history reports 1,045 path and 30 email hits; strict history exits 1.
- The F-12 statement is exact: `install-emsdk.sh` and `run-group.sh` hashes match, while the other three differ.
- `PASS-SHAPES-ONLY`, ordinary refusal, normal finding exit codes, and the documented personal-history policy behave as stated.

# FINAL REPORT

- HIGH S1-1 — Deleting the OpenAI credential detector passes all 51 controls and all 40 harness probes, then passes a planted token.
- HIGH S2-1 — A `.gitattributes` clean filter can inject a seed after the tree gate passes.
- HIGH S2-2 — `refs/replace` hides a secret-bearing committed blob from both `--rev` and history.
- MEDIUM S2-3 — A tab in a committed filename hides its personal/secret-file suffix in `--rev`.
- LOW S2-4 — A normal submodule makes `--rev` refuse because its gitlink commit object is absent.
- HIGH S3-1 — Pretty multiline labels, output-first Markdown tables, and unpadded scalars pass.
- HIGH S3-2 — An AWS secret access key passes despite the adjacent AWS credential rule.
- HIGH S3-3 — Malformed store JSON silently drops an unlabelled scalar while another entry satisfies the store requirement.
- LOW S3-4 — The scrubber can alter non-detected substrings and leave a generic-named other-user path.
- HIGH S4-1 — Context-free toy-scalar and public-entropy rules can permit operational private keys.
- MEDIUM S5-1 — Conflicting mode flags produce a zero-file `PASS`.
- LOW S5-2 — Early CLI failures exit without the promised verdict line.
- MEDIUM S5-3 — `--rev` miscounts unique blobs as files, and the recorded 613-file “final tree” actually has 616 paths.

No seam is finding-free.
