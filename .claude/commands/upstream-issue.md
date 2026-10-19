# Upstream issue writer

⚠ **A slash command, not an auto-invoked skill, and that is deliberate.** These
lived in `.claude/skills/` for one commit. They were moved to `.claude/commands/`
to match `claims-check`, `feedback-capture` and `task-zero` — **and the move
also removes model auto-invocation, which is the right property here**: filing
needs the project owner's authorisation every time, so a drafter that a model can
reach for on its own initiative is a hazard rather than a convenience.

Turn a verified finding into an issue a busy maintainer can act on in under two
minutes.

⚠ **The protocol is `docs/UPSTREAM-FILING-PROTOCOL.md` and it outranks this
file.** This skill is how to draft; that document is what is allowed. Where they
disagree, it wins and this file is the defect.

⚠ **Do not create, submit, edit or close anything on a GitHub repository.**
Output a draft. Filing needs the project owner's authorisation for that specific
filing, every time.

## 1. Read the target repository first — this is the highest-value step

Before writing a word, check:

- `.github/ISSUE_TEMPLATE/` — forms or Markdown templates
- `.github/ISSUE_TEMPLATE/config.yml` — ⚠ **`blank_issues_enabled: false` means
  the repository accepts only the shapes it lists**
- `CONTRIBUTING.md`
- two or three recent issues, to see what maintainers actually engage with

**Fill the upstream template. Its structure beats this skill's.**

⚠ **Two commands, because listing filenames does not establish a policy.**
`config.yml` being *present* says nothing about what is *in* it, so fetch and
decode it:

```sh
gh api repos/<owner>/<repo>/contents/.github/ISSUE_TEMPLATE --jq '.[].name'
gh api repos/<owner>/<repo>/contents/.github/ISSUE_TEMPLATE/config.yml \
  --jq '.content' | base64 -d
```

⚠ **The first version of this section recorded only the listing command and
asserted `blank_issues_enabled: false` underneath it** — a claim its own recorded
check could not produce, so a re-run would inherit a stale policy without
noticing.

**What one run found, 2026-09-01:**

- `XRPLF/rippled` — `bug_report.md`, `feature_request.md`, and a `config.yml`
  setting **`blank_issues_enabled: false`**. ⚠ **`rippled#8118` fit neither
  template, was filed anyway, and was closed without comment.**
- `XRPL-Standards`, `xrpl-dev-portal`, `mpt-crypto` — the API returns **404**,
  so no templates; this skill's default shape applies.

⚠ **Re-run it. Do not trust this paragraph** — it is a dated reading, and rule 4
says a negative claim carries the search that settles it.

## 1b. Check the venue exists and is the right owner

⚠ **Found by testing this skill on U-54, 2026-09-01, and it was the blocker.**
The obvious destination for a wallet-standard item looked like
`XRPLF/XRPL-Standards` — but there is **no `XLS-0072` directory there**; the
numbering runs 0070, 0071, 0073, and the wallet standard lives in a
**third-party** repository. **A correct finding sent to the wrong repository is
still a wasted filing**, and it is a mistake the evidence checks will not catch.

Confirm the destination repository exists, is owned by the org you think, and is
where that subject is actually maintained.

## 2. Decide whether it should be filed at all

- **One independently actionable problem per issue.** If two findings can be
  fixed or rejected separately, that is two issues.
- ⚠ **No positives-only filing.** An issue tracker is for things that need
  doing. Appreciation goes in `UPSTREAM-FEEDBACK.md` and reaches a team another
  way. Protocol rule 3.
- **The finding must be reproducible and actionable.** Interesting is not
  enough.

## 3. Write it

Start from `docs/upstream-filings/TEMPLATE.md` — ⚠ **that file is also
`make check-filing`'s positive control, so it is the shape known to pass.** Do
not copy it into this skill; one template, one place.

Order, always: **what is wrong → why it matters → how to verify → what would fix
it.** Conclusion before evidence.

**Title:** specific and neutral. `foo() rejects valid empty input`, not
`Thoughts on parser behaviour`.

**Body:** summary in two to four sentences; current behaviour; expected
behaviour; the smallest decisive reproducer; suggested fix. Link exact source
lines rather than pasting paragraphs.

## 4. The four rules that killed the last round

⚠ Each of these has a recorded instance. They are not stylistic.

- **Every negative claim carries its search, inline.** *"There is no such
  field"*, *"not documented anywhere"* — one search settles it, and the command
  and result go next to the claim. `CLAIMS.md` P-12; `UPSTREAM-FEEDBACK.md` U-15; `rippled#8118` item 1.
- **No project shorthand.** Say `fail_hard`, never `tapFailHard` — the string
  appears zero times in rippled and escaped into a public filing once (E-156).
- **No internal register references.** `CLAIMS.md`, `E-nnn`, `REVIEW-nnn` mean
  nothing outside this repository.
- **No internal emphasis style.** The ⚠ marks and bold blocks are instruments
  here; in a filing they read as shouting.

## 5. Length

`make check-filing FILE=<draft>` is authoritative and **prints the limit it
enforces** — do not restate the number here or in a draft. It counts prose only:
code blocks, block quotes and the disclosure footer are excluded — so quoting evidence is free and paraphrasing it is not.

If over: cut history, cut repeated rationale, collapse prose into bullets or a
table, move supporting investigation into `<details>`. **Keep the reproducer.**

## 6. Describe the problem more strongly than the fix

Separate what you demonstrated, what you infer, and what you propose. Offer a
fix as *"one possible approach"* unless the specification forces it.

## 7. Before returning

1. Run `make check-filing FILE=<draft>` and fix what it reports.
2. ⚠⚠ **HAND THE DRAFT OFF. DO NOT REVIEW IT YOURSELF.** Write it to a file and
   say plainly that rule 1's adversarial pass is **still owed**.

⚠ **Reviewing your own draft in the session that wrote it does not satisfy rule
1, and reporting it as done is worse than skipping it** — it makes the gate look
closed. The reviewer must be a **fresh session, a different model, or a person**.

⚠ **This project has measured the difference.** A self-review of these two
commands found four defects and reported them fixed; an independent pass then
found **six more, including one the self-review had introduced and one it had
"fixed" in a single place while leaving a second copy standing**. Whoever holds
the draft is the worst available judge of it.

**Return the draft and the sentence: *"rule 1's review has not run."*** The owner
decides who runs it.

## Output

Return the proposed title, the body, and a short list of anything still to
verify. **Nothing is filed without the owner's authorisation for that filing.**
