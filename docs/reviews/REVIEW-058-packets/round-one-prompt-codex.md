# REVIEW-058 round one, leg A — the hosted demo's trust boundary, before any code

You are an adversarial reviewer. The subject is a proposed design for putting a
read-only demonstration of a confidential-token research project on a public
URL. It is `Proposed`, nothing is built, and the project's rule is that a
trust-boundary change gets an adversarial review **before** implementation. The
author is the session that would build it. Your job is to find what in the
design is false, what it would leak or publish, what would fail, and what it has
not priced. Agreement is not useful. A finding that the design survives is
useful only if you tried to break it and say how.

## STEP 0 — do this before anything else, and report the results first

1. Run `curl -s -o /dev/null -w '%{http_code}\n' https://github.com` and
   `curl -s -o /dev/null -w '%{http_code}\n' https://s.devnet.rippletest.net:51234/`.
   Print both codes. If network fails, print `NO NETWORK` and continue without it.
2. Run `pwd` and `git log --oneline -1`. The working copy is a clone at commit
   `d764bcaa75add41613a67d9cbb48c48038475cb4`. Work only inside this clone.
3. **Do not read** any directory outside this clone, and in particular: any path
   under `~/.claude`, `~/.codex`, `~/.wconf`, `/tmp/wconf`, any `scratchpad`
   directory, and the repository this clone was made from. `~/.wconf` and
   `/tmp/wconf` hold real (Devnet, no-value) secrets. **Never print, cat or copy
   them.** You do not need them. Do not run `cargo`, `make check-zeroize-bounds`,
   `tools/rebuild-env.sh`, or `make check-no-secrets` without `--no-local-store`.
4. You may write scratch files under `$TMPDIR` and run `bun install
   --frozen-lockfile` in this clone. Do not commit, push, or create, rename or
   edit anything on GitHub or anywhere else. Read-only network calls only. Devnet
   only: never send anything to Mainnet or Testnet.
5. ⚠ **Your transcript is committed to this repository.** Never print a secret,
   a seed, or any value from a file you were told not to read. Your clone's
   history holds rows that were later withheld from `UPSTREAM-FEEDBACK.md`: do
   not run `git log -p`, `git show`, `git blame` or `git diff` on
   `UPSTREAM-FEEDBACK.md` at any commit other than `d764bcaa75add41613a67d9cbb48c48038475cb4`.
6. At the end, list every file you opened.

## What you are reviewing

Read each of these **whole**, not as a diff:

- `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md` — the subject.
- `docs/architecture/ARCHITECTURE-2026-08-18.md` §6 steps 8 and 9, §3 and §7.
- `docs/decisions/ADR-0003-web-tier-trust-boundary.md` — the local tier's
  decision record, whose central claim an earlier rotation retracted.
- `docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md`, phase 2.
- `CLAIMS.md` rows `P-1` to `P-12`, `B-15`, `E-151`, `E-212`, `E-228`, `E-230`,
  `E-241`, `E-309`, `E-319`, `E-327`. Find them with `grep -n '^| E-327' CLAIMS.md`
  and so on.
- The code the design reuses: `web/api/*.ts`, `web/app/src/**`,
  `web/app/vite.config.ts`, `facility/src/loopback.ts`, `tools/observer-harness.ts`,
  `tools/issuer-view-snapshot.ts`, `tools/check-web-readonly.ts`.

## The five seams. Answer every one, each with an explicit verdict

For each seam list findings as `R1-n | HIGH/MEDIUM/LOW | claim | evidence you
ran or read, with paths and line numbers | the smallest fix`. **If a seam has no
finding, write `Seam N: no findings` and say what you tried.** Grade HIGH only
for something that would publish a false statement of fact, expose a secret or
private datum, give the hosted page a signing or decryption path, or make the
design fail as written.

### Seam 1 — the measurements M1 to M9

Re-run every measurement in the ADR's table that your sandbox can reach, and say
for each whether it holds: M1 and M2 (you have no browser, so say what your
client can and cannot show), M3, M4, M7, M8 and M9. Then say whether any
conclusion the ADR draws goes further than its measurement.

### Seam 2 — "what does the hosted tier serve that a public node does not?"

The ADR's answer, under its recommended option H1, is: the static output of the
public repository's own source, plus whatever D-H3 deliberately adds. Attack it.
Work out what a static build of `web/app` would actually ship if it were made
from today's modules: what `facility/src/loopback.ts`, `tools/observer-harness.ts`
and `web/api/*.ts` would pull into a browser bundle, including environment
variable reads, embedded strings, paths, source maps, and anything the bundler
inlines. Is there any datum in that output that is not public ledger state or
this repository's own text? Is "this repository's own text" itself safe to serve
on a public page in every case?

### Seam 3 — D-H3, the issuer view

The ADR recommends option B: a published snapshot of the issuer's decrypted
figures for four throwaway Devnet accounts, with a check the visitor's browser
runs (re-read each mirror ciphertext live, and compare the sum with the public
`ConfidentialOutstandingAmount`). Does the check prove what the ADR says and no
more? Is anything published that `CLAIMS.md` E-241's reasoning still forbids? Is
option C, a clawback-shaped proof of correct decryption published for a
transaction nobody submits, safe? Read the clawback proof's context binding as
far as this clone lets you (`node_modules/@xrplf/mpt-crypto`, the vendored
patch under `tools/spike-2026-08-18/`) and say what the proof is bound to and
whether anyone but the issuer could use a published one.

### Seam 4 — a browser reading Devnet directly

Under H1 the visitor's browser connects to Ripple's public Devnet WebSocket and
renders what it returns. Attack the presentation integrity: which ledger fields
would the page render, which of them can an arbitrary Devnet account set, and
can any of them inject markup, script or misleading text? Is the Content
Security Policy the ADR proposes enough, and where would it be set for a
prebuilt static deployment? Can `facility/src/loopback.ts`'s `Snapshot` take a
second transport without weakening its checks: read how it pins the validated
index, checks that each answer came from it, and checks `network_id`, and say
what a WebSocket transport would have to preserve.

### Seam 5 — the deployment, D-H4, and the falsifier

Option A deploys a locally built, gated output with `vercel deploy --prebuilt`.
Does the claim *"no third party gains any access to the public repository"*
hold, and what does Vercel gain instead? Is architecture §6 step 9's *Falsified
if* clause checkable as written, clause by clause, before and after deployment?
Name any clause that cannot be checked and any condition that should be a
falsifier and is missing.

## Last

Name the single sentence in the ADR you think is most likely to be false, and
say how you would falsify it.
