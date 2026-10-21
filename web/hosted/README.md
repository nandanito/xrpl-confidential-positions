# `web/hosted/` — architecture §6 step 9, the hosted demo's build

The hosted demo is static pages, prerendered from one pinned snapshot of public Devnet state. No code of this project runs on a server when a visitor loads them: the gate fails an output that holds a function, middleware or a rewrite to another host. The decision record is `docs/decisions/ADR-0004-hosted-demo-trust-boundary.md`, `Accepted` at revision 5. The owner ruled its four decisions on 2026-10-19 (`CLAIMS.md` E-331):

- **D-H1, H3.** Prerendered pages. The snapshot is kept indefinitely and rebuilt by hand. The build is isolated from the private stores' files: it runs in containers that mount neither. It is not isolated from the network while it installs and takes the snapshot (below).
- **D-H2.** The risk wording is accepted as written and shown beside every ledger value.
- **D-H3, A.** No issuer figure.
- **D-H4, A.** The output is built and gated locally, then deployed prebuilt from the CLI.

The pages are `web/app/src/hosted/`, a second build target beside the local tier. Four page bodies moved out of the local routes into `web/app/src/views/`, which both tiers render, so those four pages' text exists once. The overview, the issuer page and the banner have hosted texts of their own.

## The release procedure

Each step this repository owns refuses or fails loudly. Step 6 is Vercel's command.

1. **Publish the commit first.** The footer names the commit and links to it in the public repository, and step 5 refuses a commit that is not on the public `main`. Make the public update as `docs/NEXT-SESSION-PROMPT.md` describes, then build from the public clone at that commit.
2. **Build, isolated.** `make hosted-build REPO=<public clone> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<new or empty dir outside the repository>`. The build refuses a directory that is not empty, exports a `git archive` of the commit and refuses it unless its files are exactly the commit's, then runs two containers that see only that tree and each check that neither private store exists: the first installs and takes the snapshot, with network; the second builds and assembles `.vercel/output` with `--network none`. Two canary values must not appear verbatim in the output. `build-manifest.json` is written beside the output, not in it.
3. **Gate the output.** `make check-web-hosted OUT=<dir> COMMIT=<sha>`. This needs the local secret store. Its controls run first, each breaking a copy of the real output, and the gate prints how many passed. On a pass the gate writes `static/gate-verdict.json`, a digest of every other file, which the page's footer shows.
4. **Load it in a browser.** `make hosted-browser-check OUT=<dir>`. A headless Chrome with a fresh profile loads every page under the output's own headers. It fails on a policy violation, a request to anything but the page's origin, an exception or a console error, on any page or after the client-side navigation, a page whose script never ran, a ledger page whose D-H2 wording is missing or not visible (transparent, too small, clipped, or not the element found at the centre of its own text, checked again after the client-side navigation), a URL attribute that the browser resolves to another origin the gate does not admit, or a client-side navigation that loads a new document. Every event belongs to an inspected interval.
5. **Preflight.** `bun run web/hosted/deploy-preflight.ts <dir>` refuses a manifest that does not match the build's schema, including `trial: false` and the hosted endpoint, a page whose `<footer>` element does not state the manifest's provenance sentence, a ledger page whose source panel does not name the manifest's endpoint, ledger and read time, a commit that is not on the public `main`, a missing or failed verdict, a commit mismatch, any file changed since the gate passed, a ledger page naming another ledger than the manifest, and any failure of the gate's checks run again on the bytes about to be uploaded. It prints the deploy command.
6. **Deploy.** The owner runs the printed `vercel deploy --prebuilt --prod` with the project-scoped token present for that command only. Nothing in this repository runs it.
7. **Compare what is served.** `bun run web/hosted/compare-deployed.ts <dir> https://<name>.vercel.app` fetches every file, and every page at both spellings of its route, and compares status, bytes, content type, the charset as the Encoding Standard resolves it, and security headers with what the gate passed. It also requires a 404 for an unknown path under the same headers, and no cookie.

## The owner's one-time setup, before step 6

From `ADR-0004` D-H4 and "Abuse, availability and cost":

- A Vercel project with **no Git integration**. The Vercel GitHub app would hold write access to the public repository.
- The **Vercel toolbar off** for production and preview. The policy's `script-src` would refuse a script from another origin, and step 7 sees any change to a page's bytes; neither has been tried against the real toolbar.
- A **token scoped to the one project, with an expiry**, kept beside the publication export folder and absent from every build.
- The project's own `vercel.app` name, or a domain used for nothing else. That name is the `URL` the build takes, because the footer names it.
- The **plan, its limits, a spend cap** if the plan offers one, and **who acts when the page goes down**. The ADR asks for these to be named. For the 2026-10-20 deployment the plan is Vercel Hobby, which has no billing and so no spend to cap; the owner acts when it goes down (`CLAIMS.md` E-336, E-337).

## What these checks do not establish

The gate prints its own list. The short form:

- It reads files, so it cannot check egress. The browser check observes one browser on one run.
- The build's first container has network while it installs and takes the snapshot, and on OrbStack it can reach services on the build machine's own loopback through `host.docker.internal` (measured 2026-10-20, `REVIEW-059` S-2). Third-party code that runs during install or the snapshot has that access. The second container, which runs Vite and the assembler, has no network.
- The tree check runs before the containers. It does not see dependency code changing the tree during the build.
- The browser check's visibility test does not see text coloured like its background.
- The gate's secret sweep reads the output without `gate-verdict.json`, the file the gate writes after it. Run on its own over a gated output, `check-no-secrets --dir` can report a verdict digest as a labelled scalar when an asset's hashed name contains `Sk` (`REVIEW-059` R3-12).
- The comparison in step 7 detects a change at the moment it runs, nothing later.
- Every value is a dated reading from Ripple's public Devnet endpoint, which is a pool of servers (`CLAIMS.md` E-327), under the accepted D-H2 risk. Every answer must name the one pinned, validated ledger. The reads are separate requests and are not held to one connection, so a server without that ledger fails the build rather than answering for another.

## Files

| file | what it is |
|---|---|
| `snapshot.ts` | Reads the pinned ledger at build time. It records a missing account, issuance or position as what it is, and fails on any other failed read. |
| `snapshot-types.ts` | The snapshot's shape, with no imports, so the pages can import the types without the reader. |
| `build.ts`, `Dockerfile` | The isolated build. The image is composed from two bases pinned by digest. |
| `vercel-output.ts` | Assembles Build Output API v3: static files, headers and page routes, and no functions. |
| `csp.ts` | Inline-script hashes as a browser computes them, shared by the assembler and the gate. |
| `browser-check.ts` | The headless-browser check, over the DevTools protocol. |
| `deploy-preflight.ts`, `compare-deployed.ts` | Before and after the owner's upload. |
| `pages.ts` | The six pages, one list. |
| `../../tools/check-web-hosted.ts` | The gate, run as `check-web-readonly --hosted`. |
