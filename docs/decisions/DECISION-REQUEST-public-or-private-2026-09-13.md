# DECISION REQUEST — should this repository be public, and in what form

**Raised:** 2026-09-13, by a coding session, at the owner's request to assemble the inputs.
**Status:** **RULED IN PART 2026-09-13 by the project owner:** the repository **stays private for now**, and read access is granted per person where someone needs it. It is not made public until the 12 findings in §2 are filed or recorded as not-to-file, and the owner has decided what happens to history (§4). **What publishing is for (§1) is still open.** A coding session may not rule the rest and may not publish; `CLAUDE.md` puts the publishing protocol outside this repository.
**Measured at:** `ce65e12`, the tip of `main` and of `origin/main` at the start of the session. Every count below is as of that commit unless it says otherwise.
**Register:** `CLAIMS.md` E-288 (the findings precondition), E-289 (the history audit), B-28 (this ruling).

---

## What is settled, and not reopened here

- **The publication rotation ran.** `REVIEW-039`, 2026-09-04, three differed legs. A reader with no repository and no context read the four README-class documents and got every disclosure right (E-239). It found the entry points honest and the interior not.
- **The `Observed` section is withheld** by the owner's ruling of 2026-09-05 (E-240). `docs/upstream-observed-WITHHELD.md` is untracked and ignored at `.gitignore:43`.

§4 below does not reopen that ruling. It measures a consequence the ruling already named and left open.

---

## 1. What publishing is for — the question the rest depends on

**Nothing in the repository says.** A search on 2026-09-13 over every tracked file outside `docs/reviews/` found no statement of what making the repository public should achieve. What exists instead:

- `GETTING-STARTED-CLAUDE-CODE.md:42` — *"Create the repository private … Do not choose the public name yet."* So going public was planned from day one. The reason for it was never written down.
- `LICENSE` is Apache-2.0, and the README badges it.
- `README.md:5` calls the project *"A Confidential MPT reference application"*, and its status badge says *"research artifact"*.
- `CLAUDE.md` names a *"second output"*: observations for the RippleX teams.

These point at different audiences, and the audience decides how much §2 to §5 matter:

| If the purpose is… | Who reads it | What matters most |
|---|---|---|
| **1. Evidence for the upstream teams** | RippleX engineers, the XLS-0096 authors | §2 is the whole question: they would learn about unfiled findings from a public repository. §3's vocabulary matters because they grep rippled. |
| **2. A reference application** | Integrators building on XLS-96 | The code, the README and `CLAIMS.md`. §3 matters in code and console output. The review archive (§4) mostly doesn't. |
| **3. The method itself** | Anyone judging how this work was done | The register and the reviews *are* the product. §4 is the whole question, and history is part of the evidence. |
| **4. Citable backing for filings already sent** | Readers of the seven upstream issues | Only the evidence those issues cite needs to be reachable. Nothing requires the whole repository. |

**Recommendation on order, not on outcome:** rule on purpose first. Without it, there's no standard to judge §2 to §5 against.

---

## 2. The Findings section promises upstream goes first, and 12 rows have not

`CLAIMS.md` heads its Findings section *"Findings — verified, **file upstream before publishing**"*. Publishing the repository publishes every row under that heading.

**Re-derived 2026-09-13, row by row** (E-288). Each row was checked against `UPSTREAM-FEEDBACK.md`'s Filed and Not-filed sections, the seven filing texts in `docs/upstream-filings/2026-08-26/`, this repository's issue tracker, and the withheld `Observed` file.

| Class | Rows | Count |
|---|---|---|
| Carried by a filed upstream issue | F-1 (dev-portal #3879) · F-2, F-5, F-6 (XRPL-Standards #608) · F-10, F-14 (#611) · F-23, F-28 (#609) · F-29 (#610) | 9 |
| Retired | F-3, F-4 | 2 |
| About this project's own documents or code | F-20, F-22, F-24, F-26 | 4 |
| Not fileable, by the row's own record | F-25 (*"Not a defect in rippled"*) · F-27 (closed upstream) | 2 |
| **Upstream-directed, not filed, and no recorded decision not to file** | **F-7, F-8, F-9, F-11, F-12, F-13, F-15, F-16, F-17, F-18, F-19, F-21** | **12** |

Where the 12 point:

- **mpt-crypto and its published packages — 7:** F-7, F-8, F-9, F-12, F-15, F-18, F-19.
- **The compact-sigma paper — 2:** F-13, F-17. Its authors are named RippleX researchers (P-7). F-17 is the graded form of the finding E-242 is about.
- **rippled and the lending transactors — 2:** F-11, F-16. Both read more as observations than defects, and each could reasonably be recorded as not-to-file.
- **Devnet behaviour — 1:** F-21.

**The 2026-09-05 withholding does not reach these.** 11 of the 12 have an ungraded `U-` counterpart in the withheld file (F-16 has none), and the graded form of every one stays in the tracked register.

**The handover's *"2 mention a filing"* points the wrong way.** A case-sensitive `grep filed` over the `F-` rows at `ce65e12` reproduces that 2 exactly: F-19 and F-21, and both rows say ***"Not filed"***. F-29, the one row that does cite a filing (#610), says *"Filed"* and is not matched. A case-insensitive grep for *filed* or *filing* matches six rows instead, and the table above is what reading them gives.

Two things about the 12 bear on the ruling:

- **One of the 12 may not be new, and this project already recorded why.** F-19's row says it is *"Not filed — nothing is filed without first checking the April Trail of Bits report"*. But `REVIEW-005b:305` already says *"Contrast TOB Appendix B, where `context_id == NULL` is silently accepted and omitted from the hash"*. `REVIEW-039c:41` found that and said F-19 should be *"an audit-remediation status check with Trail of Bits credited"*, not new feedback. `REVIEW-039d` did not adjudicate it. The leg cited `:283`, which was right before E-242's 22-line head note moved the line. **Checked 2026-09-14: it is not new.** The April report raises it in Appendix B and again in Appendix D, its fix review tracks neither, and upstream HEAD documents the field as optional on one function without making it required (`CLAIMS.md` E-296, as corrected by `REVIEW-048`). The owner ruled it not-to-file the same day (E-298).
- **12 is an upper bound on what would actually be sent.** They were verified in August against pinned versions such as mpt-crypto `0.4.0-rc4`. `UPSTREAM-FEEDBACK.md` records four withdrawals where upstream had already closed the gap, and F-27 is a fifth. Each of the 12 needs re-checking at upstream HEAD first.
- **Seven were re-checked on 2026-09-14** (`CLAIMS.md` E-296, E-297, E-299 to E-301). F-19 is Trail of Bits' observation and was ruled not-to-file. F-8 and F-18 are closed upstream and recorded not-to-file (E-298). F-7 and F-12 still hold on reading. F-9 still fails when run, in a narrower shape. F-15 is narrower than written, because the capability is reachable through a raw export. ~~**Nine have neither a filing nor a recorded decision:** F-7, F-9, F-11, F-12, F-13, F-15, F-16, F-17 and F-21.~~ **Later the same day the owner ruled F-7 and F-15 not-to-file and F-9 and F-12 to file** (`CLAIMS.md` E-302). Two are ruled to file and not yet filed, and ~~**five have neither a filing nor a ruling:** F-11, F-13, F-16, F-17 and F-21, none of them re-checked.~~ **the last five were re-checked and ruled later the same day** (`CLAIMS.md` E-303 to E-308): F-11, F-16 and F-21 not-to-file, F-13 and F-17 to file. Every one of the 12 now has a recorded decision, four are ruled to file, and none is filed.
- **Filing is not quick.** `docs/UPSTREAM-FILING-PROTOCOL.md` puts an adversarial review before every filing and requires the owner's authorisation. The 2026-08-26 filings drew 13 defects in a review run *after* they were sent.

**Issue #7 is stale in a way a public reader would see.** It is open and still says *"What blocks filing is now a judgement"* about F-10/U-24. That finding was filed as XRPL-Standards #611 on 2026-08-26, and #7 has not been updated since 2026-08-17. Issue #6 says F-12 is *"fileable today"*. It was opened 2026-08-17, and F-12 is still unfiled.

---

## 3. The vocabulary

`tapFailHard` is this project's shorthand. rippled's names are `fail_hard` (the submission parameter) and `TapFailHard` (the internal flag). `CLAUDE.md` says both *"Do not mass-rename"*, because the reviews are a historical record, and *"Do translate it before anything leaves this repository"*. Publishing everything at once puts those two rules in conflict.

At `ce65e12`: **208 occurrences on 192 lines in 59 files**. The handover measured 206 in 58 before its own commit added two more in one file. Every document that discusses it adds to the count, and this one does.

What already exists: a banner at `CLAIMS.md:3`, a translation row at `README.md:47`, and `docs/VOCABULARY.md`. The code always sends the real `fail_hard`.

**What a banner does not reach:** 11 lines of `facility/run-facility.ts` use the shorthand, and 8 of them are printed output or run labels (lines 155, 159, 188, 227, 232, 247, 272, 283). The other 3 are comments. A reader running the demo sees the non-name on screen. That part is mechanical and small whatever form publication takes.

---

## 4. History, and the review archive inside it

### Secrets — none of the known live values, anywhere in history

**Audited 2026-09-13** (E-289): all 46 refs at `ce65e12`, 266 commits, 1,761 text blobs.

- **None of the 19 live Devnet secret values** held outside the tree appears in any blob, at any commit. They are 12 account seeds and 7 ElGamal secrets, read from `/tmp/wconf/state.json`, its backup in `~/.wconf/`, and `~/.wconf/facility-state.json` and `facility-book.json`.
- Two unit-test profiles under `/tmp` hold one further seed. **It is the published keygen KAT fixture**, written there by `facility/tests/boundary.test.ts` and `facility.test.ts` against a loopback fake node, and it is in the tree by design.
- **11 distinct seeds with valid checksums** appear, and all of them are also at the tip. One is the public genesis-account seed. The rest are test and KAT fixtures. **None controls any of the 12 Devnet accounts recorded in the local state files.**
- No PEM private-key blocks, none of the GitHub, Anthropic, OpenAI, AWS or Slack token shapes, and no `op://` references. The only commit identities are the owner's GitHub noreply address and Claude Code's noreply address. The one third-party email is an author line quoted from `ed25519-dalek`'s published manifest.
- **The limit:** a 32-byte ElGamal secret written as bare hex looks exactly like a transaction hash. Hex was compared only against the 19 known values, so an unknown secret in that form would not be detected.

⚠ **`REVIEW-039`'s packet told its hostile-outsider leg *"the secrets audit is done"*** (`packet-b-hostile-outsider.md:12-13`). No record of that audit exists anywhere in the tree or the commit log, and none of the three legs looked at history. This audit is the first one recorded.

### The withheld rows are in history

E-240 already says this, and it is confirmed. **36 historical versions of `UPSTREAM-FEEDBACK.md` carry at least one of the 33 withheld rows**, from `b71638c` (2026-08-16) to `b7d81fb` (2026-09-05). `git log -p UPSTREAM-FEEDBACK.md` reads all of them.

**So making this repository public with its history publishes what the 2026-09-05 ruling withheld.** Keeping them withheld means publishing without this history, by rewriting it or by starting a new repository. Either breaks the citation trail:

- **A rewrite** changes **264 of 265** commit hashes on `main`, because the file arrived in the second commit.
- The tree cites **173 distinct commits of its own, in 136 files**, all at or after that commit. Under either route every one becomes uncheckable to an outside reader. That includes the `builtFromCommit` bindings that tie Devnet receipts in `docs/runs/` to source, and `docs/CLAIMS-REVISIONS.md`, which is derived from git history.

### The review archive

`docs/reviews/` holds **204 tracked files**: 179 top-level and 25 in packet directories. `REVIEW-039c` read the archive as the criticised party and found one item unfair to a third party. That was E-242, a leg calling the compact-sigma paper *"broken"*, and it is fixed with a head note that leaves the leg's words intact. `REVIEW-039d`'s open item 2 is still open: *whether "a packet is not edited" survives publication is a decision.*

**What is not established:** whether the 204 were read for tone. `REVIEW-039b` says it *"searched all 416 tracked paths"* and *"all 198 commit messages"* (`REVIEW-039b:27-28`). Searching for an overclaim is not reading adversarial documents as their subject would, and commit messages are not the content of earlier versions. `REVIEW-039c` did read as the subject and cites specific review files, but its packet did not ask for full coverage and it does not claim it.

### Other surfaces a visibility change exposes

All **11 remote branches** are already merged into `main`, so they add nothing beyond `main`'s history. There are **13 GitHub issues** (5 open, #7 stale as described above), no pull requests, no releases, no wiki, and Projects is enabled.

---

## 5. The forms publication could take

| Form | Keeps the 2026-09-05 withholding true | Keeps the 173 commit citations checkable | Reversible | Notes |
|---|---|---|---|---|
| **A. Make this repository public** | **No.** 36 versions in history | Yes | No. Forks, clones and caches persist | Issues and Projects go public too |
| **B. New public repository from a curated snapshot** | Yes | **No.** They refer to a history outsiders can't see | No, once pushed | Must say it is a snapshot of a private working repository. `check-claims-revisions` cannot pass without the history |
| **C. Rewrite this repository's history, then publish** | Yes | **No.** 264 of 265 hashes change | No | B's cost, plus editing the record this project refuses to edit. Probably dominated by B |
| **D. Stay private; grant read access per person** | Yes | Yes | **Mostly.** Access can be revoked; a clone already made persists | Serves purpose 1 or 4 today, with nothing indexed |
| **E. Stay private; publish selected documents elsewhere** | Yes | Partly | Per document | The seven upstream filings already do this for what they carry |

**What every form except D and E still needs first:** the 12 rows in §2, filed or recorded as not-to-file, because the heading promises it. Two of them concern a paper by named researchers.

---

## What this session would bring to the discussion, for the record

**Not a ruling. It has had no adversarial review.**

- **Rule on purpose first (§1).** For purpose 1 or 4, form D serves it today at no irreversible cost, and nothing else needs doing before access is granted. For purpose 2, form B is the only public form that keeps the 2026-09-05 ruling true, and its price is that commit citations stop being checkable. For purpose 3, form A is the only form that keeps the evidence intact, and it means **explicitly narrowing the 2026-09-05 ruling to the tree**, not letting a visibility toggle do it as a side effect.
- **§2 applies to every public form.** Twelve graded findings about other teams' work, unsent, would reach those teams through a search engine instead of an issue. That is the outcome the heading exists to prevent.
- **§3's code and console strings, and issue #7's staleness, are closable in a coding session whatever is ruled**, and neither needs the ruling first.

## What must not happen either way

- **Do not change the repository's visibility from a coding session.** It is one irreversible act that publishes everything at once.
- **Do not publish history on the strength of "the tree is clean."** The tree is clean because of the 2026-09-05 ruling, and history predates it.
- **Do not count this audit as proof that no secret exists.** It proves the 19 known live values are absent and the seeds present are fixtures. §4 names what it cannot see.
