# REVIEW-023 — adversarial review: the accepted-risk hatch, the post-execution fixes, and the executed claims

**Round one. Date 2026-08-25. Devnet-only research artifact.**

You are an adversarial reviewer with **read-only shell access** to the
repository at the path given below. **The tree is frozen at commit `d17b8ee` on
branch `build/step-7-the-facility` and nothing will change under you** — that is
deliberate: `REVIEW-022`'s Codex leg watched file mtimes move while it worked
and produced a stale finding as a result.

Read whatever you need. `git log`, `git diff 11e568e..HEAD`, `CLAIMS.md`,
`docs/reviews/REVIEW-022*`, `signer/src/`, and the live run record at
`~/.wconf/facility-state.json`. You may query Devnet read-only if you want to
check a claim against the chain: `https://s.devnet.rippletest.net:51234/`,
JSON-RPC, e.g. `{"method":"ledger_entry","params":[{"mpt_issuance":"<id>","ledger_index":"validated"}]}`.

## What has already been reviewed, and what has not

`REVIEW-022` ran **two rounds, three legs, nineteen findings** over the facility
as it stood at commit `11e568e`. **Do not re-derive those**; read
`docs/reviews/REVIEW-022c` and `REVIEW-022g` for what was found and fixed.

**Everything after `11e568e` is UNREVIEWED**, and that is your subject:

1. **The accepted-risk hatch** — `RISK_ACCEPTANCE_PHRASE`,
   `REMOTE_LEDGER_DISCLOSURE`, `assertRemoteRiskAccepted`, the
   `underB15Conditions` stamp, and its counterpart in
   `facility/src/signer.ts::assertLoopbackProfile`.
2. **Two fixes that replaced fixes from `REVIEW-022`** — `sameEndpoint`
   (the redirect check compared against loopback-ness rather than against the
   endpoint asked for) and `--fresh` clearing the book.
3. **The convert-to-inbox correction** — `CLAIMS.md` **F-27**.
4. **Every claim about what the run established**, in `CLAIMS.md` E-146, E-149,
   E-151, F-27 and B-18, in `facility/README.md`, in
   `docs/architecture/ARCHITECTURE-2026-08-18.md` §6 step 7, in the facility
   walkthrough §6, in `CLAUDE.md`, and in the commit messages themselves.

## The context you need

**B-15's step-7 ruling** required loopback ledger reads plus `tapFailHard` on
whatever submits. Loopback was ruled, taken, and then costed: a rippled node
could not acquire Devnet's account state tree on the available hardware
(`CLAIMS.md` E-148 — two runs, ~2.5 hours, 6.9 GB, `complete_ledgers: empty`,
one OOM kill and one hour pegged at 1663% CPU). **The project owner amended the
ruling** (E-151) to extend `REVIEW-019`'s named risk acceptance to the demo. The
facility then ran against the **public** endpoint: 27 validated transactions.

**`CLAIMS.md` F-23 is unchanged and executed**: a ledger source that lies about
a destination's `HolderEncryptionKey` makes the signer publish the amount under
the liar's key, permanently. TLS does not address it.

**Standing prohibitions** (`CLAIMS.md` P-1..P-11): never claim identities are
hidden (P-4), never claim a holder is private from the issuer (P-9), never claim
who/when/how-often is hidden (P-11), never call anything secure/audited/
non-custodial/production-ready (P-5), no benchmark number without hardware,
parameter set and methodology (P-8), no undated amendment claim (P-3).

## What to look for, hardest first

1. **Does ANY document, comment, test name or commit message overstate what this
   run established?** The run was **not** under B-15's conditions. Anything
   reading it as evidence about the loopback obligation, or about F-23, is the
   defect this review exists to find. Check the commit messages too — they are
   permanent and unreviewed.
2. **Is the hatch actually closed?** Find a path that reaches a non-loopback
   endpoint without the exact phrase — including the **signer's** own reads,
   which are the ones F-23 is about. Consider `WCONF_LEDGER_ENDPOINT`,
   `WCONF_FACILITY_ENDPOINT`, the profile, redirects, and anything that
   constructs a `LoopbackLedger` other than `open`.
3. **Can `underB15Conditions` ever be recorded `true` for a run that was not?**
   Trace every write of it.
4. **Is the convert-to-inbox correction complete?** Is there anywhere else that
   still models a `ConfidentialMPTConvert` as crediting the spendable balance —
   code, test, comment or document?
5. **Do the NUMBERS match the chain?** The run record is at
   `~/.wconf/facility-state.json`. `CLAIMS.md`, the README and the commit
   messages quote balances (0 / 610 / 10 / 1410), an outstanding amount (2030),
   a transaction count (27), a `Sequence` pair (4767433 → 4767434) and an
   observer count (14). Check them.
6. **A false sentence written to explain a fix.** `REVIEW-022` found eight,
   including one inside a review leg.
7. **Do the new tests falsify?** `facility/tests/risk-acceptance.test.ts` in
   particular — a disclosure-wording test that pins the wrong sentences is worse
   than none, because it looks like coverage.

## What is deliberately NOT built (do not report as missing)

No permissioned domain. One process plays every role and holds every seed.
`--auto-confirm` answers the signer's own human confirmation. No cover traffic.
`run-facility.ts` does not assert all four of XLS-0096 §10.5's state changes per
movement — that gap is **stated** in the file and in B-18, so report it only if
the statement of it is wrong.

## Report format

For each finding: severity (CRITICAL / HIGH / MEDIUM / LOW), the file and the
exact line or sentence, why it is wrong, and what would falsify your claim.
**If you find nothing in a section, say so explicitly.** A clean report is a
real outcome; a padded one is not. Do not propose refactors for taste.
