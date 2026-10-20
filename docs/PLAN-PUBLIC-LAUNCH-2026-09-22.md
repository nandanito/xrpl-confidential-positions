# PLAN — public repository, hosted demo, and the two posts

**Status:** the shape is ruled (`CLAIMS.md` E-309, 2026-09-22). Nothing in phases 1
to 3 starts before phase 0's exit criterion is met. **This is a plan, not an
authorisation:** each phase names the gate it must pass, and two of them require an
adversarial rotation before any code is written.

**The four goals, in the owner's words:** make the repository public and
contributable; deploy a frontend to Vercel so people can try it; a LinkedIn post
answering *"is confidential transfer possible on XRPL?"*; a blog post on
`nandan.me/writing` covering the project.

**What was ruled on 2026-09-22**, four decisions, each taken on the recommendation:

| Decision | Ruling |
|---|---|
| Demo scope | **Read-only.** No hosted signer, no keys in the page |
| History | **Squashed at publication.** This repository stays the archive of record |
| Filing gate | **The four findings are filed first.** B-28's own condition |
| Repo scope | **Everything but `docs/upstream-observed-WITHHELD.md`**, `docs/reviews/` included |

---

## Phase 0 — close the upstream loop

**Why it is first:** B-28 says the repository stays private until the unfiled
findings are filed or recorded as not-to-file. Eight are recorded (E-298, E-302,
E-308). Four are ruled to file and none is drafted. Publishing a register that names
defects in another team's code, by file and line, before that team has been told is
the thing `docs/UPSTREAM-FILING-PROTOCOL.md` exists to prevent.

1. ~~**The external review of `CLAIMS.md` E-296 to E-307**, ruled in E-308.~~
   **DONE 2026-09-22 — `REVIEW-048`, `CLAIMS.md` E-310.** Three differed legs,
   seventeen findings upheld, all fixed in the rows. Two of them change what gets
   filed (below), and one added **B-30**: the register had settled *"has upstream
   already raised this?"* against Trail of Bits alone, and a second audit of the same
   code exists and is not publicly obtainable.
2. **Round two on `REVIEW-048`'s fixes.** Added 2026-09-22. `CLAUDE.md`'s two-round
   rule — the second round reviews the fixes — and it is owed because round one
   found defects in the rows. **Its stopping condition, set before it runs: no
   third round unless round two finds a fix that did not discharge its finding.**
   **DONE 2026-09-22 — `REVIEW-049`, `CLAIMS.md` E-311, and THE CONDITION FIRED.**
   Three of its eight findings were undischarged, all of them surviving copies or
   short lists, the worst being that B-30's list missed the two filings already sent.
   All eight are fixed. **A third round is owed and running it is the owner's call:**
   recommended as one corpus leg on the native light pass, asking only whether any
   corrected sentence has a surviving copy, **with the rotation closing after it
   whatever it finds.**
   **Ruled and DONE 2026-09-22 — `REVIEW-050`, `CLAIMS.md` E-312. The rotation is
   closed.** Five more surviving copies, all fixed, the worst being the README's
   front door naming one audit.
3. **Draft F-9, F-12, F-13 and F-17.** `/upstream-issue`, then `/issue-review`, then
   the owner's sign-off on each final text. All four go to `XRPLF/mpt-crypto`.
   Each draft states how its finding was established — F-9 run, F-12 run at
   `85dbac7` and read at `1.0.5`, F-13 and F-17 read at `1.0.5`. Four instructions
   from `REVIEW-048`:
   - **F-9** leads with the substitution: rippled's `init.sh` was not run, only its
     remote-add was reproduced by hand.
   - **F-12** says in its first paragraph that upstream's WASM job is green on `main`
     at the pinned emsdk, and **its remedy is three link lines, not the two its
     register row names** (`build-wasm.sh:363`, `:365`, `:374`).
   - **F-13** shows the component table, not the totals. Of two reviewers who re-derived
     1276 B and 1210 B from the row, one got the composition wrong.
   - **F-17 changed shape.** It may not claim the paper's nonce input omits
     `TransactionContextID`: Remark 6.1 never defines `statement`, §6.2 uses the
     word to include the context, and upstream's prover calls its variable
     `stmt_hash`. It files the ambiguity and its consequence.
4. **Search B-30's corpus before sending**, and record the search in each draft.
   `docs/UPSTREAM-FILING-PROTOCOL.md` rule 4. The reachable Sherlock-citing issues
   touch none of these four subjects, so this is unlikely to move them; it still has
   to be recorded rather than assumed.
   **DONE 2026-09-22 — `CLAIMS.md` E-313, `REVIEW-051`.** *Attackathon* widened the corpus to 104
   items, plus the 16 PRs against the contest's public code branch. None touches the four subjects.
5. **File them, and close issue #6** when F-12 is filed. **F-9 FILED 2026-09-28 as `mpt-crypto#148`** (E-314). **F-17, F-12 and F-13 FILED 2026-10-18 as `mpt-crypto#153`, `#154` and `#155`** (E-315). All four are filed.

**Exit:** four filings live at upstream, or a recorded ruling deferring one by name. **Met 2026-10-18.**

---

## Phase 1 — the public repository

**Gate:** phase 0's exit, plus the secret sweep in 1.1 passing on the exact tree that
will be published.

1. **Secret sweep, over the publication tree and over history.** `/tmp/wconf/state.json`
   was never tracked, and that is the claim to verify rather than assume: account
   seeds, ElGamal secrets, `WCONF_ELGAMAL_SK` values, personal addresses and any
   `~/.wconf` path. Write it as a gate (`make check-no-secrets`) with a control that
   must fail, because a sweep recorded in prose is a claim with no falsifier.
2. **Vocabulary.** `tapFailHard` is this project's invention and appears across the
   tree; `docs/VOCABULARY.md` carries the translation. Translate every
   **reader-facing** surface — `README.md`, `GETTING-STARTED-CLAUDE-CODE.md`, the
   architecture document, the web copy, both posts. `docs/reviews/` is a historical
   record and keeps its wording under a banner that points at the translation.
   ⚠ This shorthand escaped into a public upstream filing once already (E-156).
3. **The front door for a stranger.** `README.md` rewritten around what the artifact
   proves, what it refuses to claim (`CLAIMS.md` P-1 to P-12, P-4 and P-9 especially),
   and a five-minute path to running it. Add `CONTRIBUTING.md` (what contributions are
   wanted, the gates a PR must pass, the Devnet-only rule), `CODE_OF_CONDUCT.md`,
   `SECURITY.md` saying plainly that this is a research artifact and not production
   software, and issue and PR templates. ⚠ Added 2026-10-18: the README's *Upstream*
   section describes the filings by outcome and was five weeks stale when E-316 was
   found; run phase 3's survey again on the day the README is finalised. Its *Before
   opting in* item 2 and `docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md` §6 still
   describe #610 as filed, and XLS-0096 PR #604 fixed it: read §7.2 and §7.4 at
   `58ccd30` before rewriting either.
4. **CI.** GitHub Actions running what does not need the vendored build environment:
   the register gates, `check-emphasis`, `check-tables`, `check-web-readonly`,
   `check-filing`, `bun test facility tools`, `tsc --noEmit`. The signer's `cargo test`
   needs `tools/rebuild-env.sh`, which needs network and Conan; either give CI that
   step or document the suite as local-only. **Do not let CI claim coverage it does
   not run.**
5. **Publish.** A squashed publication in the public repository, as two commits since
   `REVIEW-057` (the tree, then its derived revision log); this one keeps
   the full history. The README must say that public history starts at publication and
   that the register's commit citations resolve only in the private archive.
6. **Attribution.** Apache-2.0 is already in `LICENSE`. Check that the vendored
   `mpt-crypto` patch and every third-party citation name their upstream, and that
   `CLAIMS.md` P-7's credits are correct on every public surface.

**Exit:** the repository is public, a stranger can run the test suite from the README,
and `CONTRIBUTING.md` tells them what a good PR looks like.

---

## Phase 2 — the hosted demo

⚠⚠ **This is not a deployment task with a gate attached. It is a trust-boundary
change, and the project's rule is a full adversarial rotation BEFORE implementation.**
Architecture §6 step 8 is *falsified if* *"the API binds to anything but loopback"*
(`ARCHITECTURE-2026-08-18.md:254`), and `ADR-0003`'s trigger 5 fires when any datum
becomes reachable by a party who could not obtain it before. A public deployment is
both. The same tier shipped a decryption oracle once, written by the session that had
just written the trigger (E-212).

1. **Scope it as its own architecture step** with its own falsifier, and write the ADR
   for the hosted surface. The questions it has to answer:
   - **What does the hosted tier serve that a public node does not?** Two things are
     known: `/api/signer` (signer-local status, including a record count covering
     attempts that never reached the ledger) and the decrypted issuer snapshot
     (E-228, E-239). ⚠ **Both had already been withdrawn from the local tier on
     2026-09-05 (E-241)**, before this plan was written: no route serves the figure,
     the record count or the socket path. The hosted design starts from that, and
     this note was added on 2026-10-18 (`REVIEW-057` R1-11). The first is removed
     from the hosted build. ~~The second is the point of the demo and becomes a deliberately published static artifact over
     throwaway Devnet accounts, with the disclosure beside it.~~ ⚠ Superseded 2026-10-19: the owner ruled
     `ADR-0004` D-H3 option A, so the hosted page publishes no issuer figure (`CLAIMS.md` E-331).
   - **The ledger endpoint.** B-15's named risk acceptance was written for a local
     operator. A hosted page needs its own wording: a lying source makes the page show
     wrong numbers, and nothing signs, so no amount can be published by it.
   - **Devnet resets.** The demo accounts are throwaway. When they vanish the page must
     say so rather than fall back to another source, which is the substitution
     `CLAUDE.md` forbids.
   - Abuse, rate limiting and caching, since the endpoint is no longer one operator's.
   **Drafted 2026-10-19: `ADR-0004`, `Proposed`, and architecture §6 step 9** (`CLAIMS.md` E-327).
   It answers each question above and puts four decisions to the owner, D-H1 to D-H4. The
   snapshot sentence in the first question is D-H3 and ~~is not ruled~~ was ruled A. Under the recommended
   hosting shape there is no server, so step 3's CORS item and step 4's request-time checks
   change; the ADR says how. Step 2's round one ran the same day (`REVIEW-058`, E-328) and moved
   D-H1's recommendation to prerendered pages. Round two ran too and its stopping condition
   fired (E-329), and round three closed the rotation (E-330). **The owner ruled all four on
   2026-10-19, each as recommended, and `ADR-0004` is `Accepted`** (E-331): prerendered pages from
   one pinned snapshot, rebuilt by hand on an isolated build machine; the hosted risk wording;
   no issuer figure; and the prebuilt CLI deploy.
2. **The rotation.** Three legs, differed packets, before implementation.
3. **Build.** A hosted build target that excludes the socket client entirely; CORS for
   the deployed origin, which today is a localhost regex; ~~the static issuer snapshot~~ (dropped
   by D-H3, E-331); a page that tells a visitor how to run the signer locally to transact.
4. **Extend the gate.** `tools/check-web-readonly.ts` asserts the local shape. The
   hosted surface needs its own part: zero socket clients in the deployed bundle,
   no decryption at request time, and the deployed origin checked against what the
   ADR allows. Verify it by breaking it.
   **Steps 3 and 4 built 2026-10-20** (`CLAIMS.md` E-334): the hosted build, its
   gate and a headless-browser check, with `web/hosted/README.md` as the procedure.
   ~~Step 5 waits on the owner's Vercel setup and on one ruling: the email address in
   a bundled package's licence notice, which the secret sweep refuses.~~ The owner ruled
   the email redacted (E-335). **Step 5 deployed 2026-10-20** (E-336): the served bytes
   and headers matched the gated ones when compared. The check from a machine that has never run the
   project is not yet reported.
5. **Deploy to Vercel and check the live surface** against the ADR's list, from a
   machine that has never run the project.

**Exit:** a live URL that serves public ledger data ~~and one published snapshot~~ (dropped by
D-H3, E-331), carries its disclosures on the page, and cannot sign.

---

## Phase 3 — the two posts

**Gate:** the repository is public and the demo is live, so both posts link to
something a reader can check. Each draft runs `claims-check` and one adversarial read
before it is published, and the owner signs off the final text.

⚠ **Gate amended 2026-10-18, on E-316: every filing is re-surveyed at source before
a word of either post is drafted.** The survey is the one E-316 records: the comments
on each issue this project filed, by anyone but this project; `gh pr view` on every
PR a closing comment names; the fix grepped in the merged text rather than taken from
the comment. Each filing is then described by its outcome on the survey date, not by
its register row. On 2026-10-18 the register carried four filings as open that
upstream had fixed and closed in September; a post written from it would have called
four fixed defects open. Phase 1's README states the same outcomes in its *Upstream*
section and runs the same survey before publication.

1. **The blog post** (`nandan.me/writing`). The honest spine: what XLS-96 hides
   (amounts and balances), what it does not (who, when, how often — P-4, P-11), that
   the issuer can always decrypt (P-9), that there is no rotation or recovery (P-10),
   Devnet only with a dated amendment reading (P-3). Then the part that is genuinely
   this project's own: execution over reading, the adversarial rotations and what they
   caught, the gates that catch a false sentence, and the findings filed upstream.
   Credit Cenk, Malhotra, Akinyele, Chen, Xie, Qian and Dore where the work is theirs
   (P-7). **Do not describe the Trail of Bits report as *the* audit of this code**,
   and do not call a finding *unreported* or *new*: B-30 records a second audit,
   the Sherlock XRP Ledger Attackathon, whose findings this project cannot read,
   and B-31 a third, Zellic's scan of mpt-crypto, known only through the three
   identifiers mpt-crypto#147 cites (added 2026-10-18). Name all three, and say
   which one could be checked.
2. **The LinkedIn post.** Short, answers the question in the first line, links the
   demo, the repository and the post. Same prohibitions. No benchmark number without
   hardware and method (P-8). Nothing that reads as *audited*, *production-ready* or
   *secure* (P-5).

**Exit:** both published, both pointing at a live demo and a public repository.

---

## What this plan does not cover

- **The license terms, the public repository's name and owner**, and whether the
  vocabulary translation extends into `docs/reviews/`.
- **Whether CI can run the signer's tests**, which need the vendored build environment.
- **Issue #10**, the unpublished keygen derivation. Publishing it is a new public
  cryptographic artifact and needs its own rotation. It is not a launch blocker, and
  the README should say the derivation is repository-specific and unpublished.
- **The `Observed` rows.** They stay withheld and out of the public tree, by
  `REVIEW-039b` and `REVIEW-039c`.
