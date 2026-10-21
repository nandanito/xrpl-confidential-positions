# REVIEW-059 round one — self leg

- **Subject:** architecture §6 step 9 as BUILT and DEPLOYED: the public commit
  `ccf76e73bf6629b29dece98cc15a050e3f60cad4`, which is the commit Vercel serves,
  and the deployed output built from it (`wconf-hosted-builds/ccf76e73bf66`,
  outside every repository).
- **Author of the subject:** this project's earlier sessions. The self leg is the
  session that will adjudicate, so it reads as the leg with the most context and
  the least distance.
- **Written:** from 2026-10-20T10:40Z, **before either external leg was launched**,
  and committed only after both returned (`CLAUDE.md`, *do not commit your own
  self leg while a repo-access leg is reading the tree*).

## Measurements taken before launching, which the legs cannot take

Each was run by the adjudicator on this machine on 2026-10-20.

1. **The live site still serves the gated bytes.** `compare-deployed` against
   `https://xrpl-confidential-positions.vercel.app`: PASS at 10:39:42Z.
2. **The gate passes the deployed output again.** On a COPY (the gate writes its
   verdict into the directory it checks): 30/30 controls, the full sweep with the
   local store, PASS, output digest `1332ea0a95772b12…`, which is E-339's. The new
   verdict differs from the deployed one only in `checkedAt`.
3. **The browser check passes the copy.** 6 pages, 39 requests, all same-origin,
   footer `PASS, 18 files`.
4. **An OrbStack build container sees no host path.** Running the build image with
   no mount: `/Users`, `/mnt/mac`, `/Volumes`, `/private`, `/host`, `/run/host`
   all absent; the user is `node`, whose home directory is inside the image.
5. **An OrbStack build container DOES reach the Mac's loopback.** A throwaway
   listener bound to `127.0.0.1` only, on the Mac, answered `200 probe-ok` to
   `fetch` from inside the build image via both `host.docker.internal` and
   `host.orb.internal`. `127.0.0.1` inside the container did not reach it. No
   other service was contacted.

## Findings

### S-1 — MEDIUM, measured. Every check that models the policy reads `routes[0]` only, and the gate admits headers on any route

`tools/check-web-hosted.ts` check 3 allows the keys `src`, `dest`, `headers`,
`continue` and `handle` on every route. Check 6 reads the Content-Security-Policy,
`X-Content-Type-Options` and `Referrer-Policy` from `config.routes[0]` only.
`browser-check.ts:42` serves every response with `config.routes[0].headers`, and
`compare-deployed.ts:24` takes its expected headers from the same place.

Measured with `runChecks` on the deployed `config.json` plus one route
`{ src, headers: { CSP: "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *", X-Content-Type-Options: "", Referrer-Policy: "unsafe-url" }, continue: true }`:
**0 findings** when it is inserted second as a catch-all, **0** when it is scoped to
`/issuer(/.*)?`, **0** when appended last.

So the two pre-upload checks both pass an output whose routing replaces the
policy, and the browser check would load the pages under the policy the output
does NOT deliver. Only `compare-deployed`, after the upload, would see a served
header that differs from `routes[0]`'s, and only if the host applies the later
route's header. That last point is not measured: whether Build Output API v3
lets a later `continue` route override a header an earlier one set.

The gate's own comment for check 6 says *"The Content Security Policy, as
config.json delivers it"*. As written it is the policy `routes[0]` declares.

**Fix:** check 3 refuses `headers` on any route but the first, with a control
for each of the three placements above. Then all three readers agree by
construction rather than by convention.

### S-2 — MEDIUM, measured. The build is isolated from the private stores' FILES, not from the build machine's loopback

Measurement 5. Third-party code runs in the container during `bun install`, the
snapshot (which imports the ledger codecs) and `vite build`. It can open
connections to any service listening on the Mac's `127.0.0.1`. On the build
machine at the time of writing, `lsof` lists a password manager's local port, IDE
agents, a local model server, the Claude Code process and OrbStack's own ports
among them. The local web tier, if running, is reachable too; since E-241 it
serves only signer-local status, so this project's own exposure is small.

What the records say: `build.ts`'s header says the container *"sees ONE
directory"*, and the README says the build *"cannot reach the private stores"*.
Both are true of files. Neither names the network, and the container has outbound
network by default, so anything such code reads from a loopback service it can
also send out. `ADR-0004`'s build-machine paragraph priced *"the build user's file
access"*.

**Fix, for adjudication:** at least name it in the README, the manifest's
`isolation` string and `ADR-0004`. Better, measured before it is claimed: run
`vite build` and the assembler in a second container with `--network none`, since
neither needs the network, and check whether Bun's default of not running
dependency lifecycle scripts covers `bun install` (no `trustedDependencies` in any
`package.json` here).

### S-3 — LOW, measured. The gate does not check two of the five headers the assembler sets

`vercel-output.ts` sets `Cross-Origin-Opener-Policy` and `Permissions-Policy`.
Check 6 checks only the policy, `X-Content-Type-Options` and `Referrer-Policy`.
Deleting both from `routes[0]`: **0 findings**. `compare-deployed` does check
them, against whatever `config.json` holds, so it confirms only that the host
served what the output said.

### S-4 — LOW, measured. The licence file has two regions no check reads

Checks 4 and 5 skip `static/third-party-licenses.txt` entirely. Check 10 parses
`[preamble, header, body, header, body, …]` and verifies each header-and-body
pair, so the preamble and any unpaired trailing part are never compared to
anything. Prepending a third-party URL, the signer socket path and
`WebAssembly` to the preamble: **0 findings**. The file is served as text and
never executed, which is why this is LOW. The secret sweep still reads it.

### S-5 — LOW. The preflight trusts the verdict file instead of re-running the checks

`deploy-preflight.ts` compares every file with the digests in
`gate-verdict.json`. An output altered together with a rewritten verdict passes
it. A hostile same-user process is in scope (issue #1). `runChecks` needs no
secret store and takes under a second, so the preflight could re-run it on the
exact bytes about to be uploaded. The controls and the secret sweep would stay
the gate's.

### S-6 — LOW, a record. The architecture document's latest revision line says step 9 is not built

`ARCHITECTURE-2026-08-18.md:5`, revision 11: *"Step 9 is not built."* §6 step 9
itself says built, gated and deployed. The header is what a reader meets first.
This is phase 1's lesson (E-336's row records the same shape one sentence over):
a ruling that changes state leaves every sentence describing the old state, and
no gate finds them.

### S-7 — LOW, wording. The gate's printed limits name "step 5" for the comparison

`whatThisDoesNotCheck()` item 2 says *"step 5 compares the deployed site"*. The
README's procedure numbers that comparison **step 7**; step 5 there is the
preflight. "Step 5" is the launch plan's phase 2 numbering. The text ships to
visitors inside `gate-verdict.json`'s `doesNotCheck`. `browser-check.ts`'s header
says *"`ADR-0004` step 4"*, and the ADR has no numbered release steps.

### S-8 — note, not a finding yet. Check 8 applies to pages that opt in

The D-H2 wording, network check and ledger index are required only on pages
carrying `data-ledger-value`, a marker the renderer sets. Today only `/observer`
and `/issuer` carry it. The overview renders the ledger index in its footer
sentence (*"read at validated ledger 6263910"*) without the marker or the D-H2
wording. Whether a footer's provenance line is *"a ledger value"* in the
falsifier's sense is a question for the legs. A page that rendered a balance
outside `LedgerReading` would escape the check, and no control covers that.

## What I tried and could not break

- **Provenance of the deployed bytes.** The preflight's `compare/<sha>...main`
  check, the verdict digest and `compare-deployed` agree, and measurement 1 and 2
  reproduce E-339's digest.
- **Hash-as-parsed.** `csp.ts` normalises CR/LF and NUL as the HTML parser does,
  and the NUL control fails a raw hash. Not attacked further: other
  preprocessing (for example a lone surrogate or a BOM) is not in TanStack's
  output today.
- **No server code.** No `functions/`, top-level keys limited to `version` and
  `routes`, every `dest` a file in the output. The rewrite and middleware
  controls fire.
