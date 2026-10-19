# Upstream filing protocol

**Ruled by the project owner 2026-09-01, after auditing the 2026-08-26 round.**

This binds every filing to an XRPLF repository. `make check-filing` enforces the
mechanical parts; the rest is judgement and is listed so it can be checked by a
person.

---

## Why this exists

Seven items were filed on 2026-08-26. An adversarial review run **after
submission** found **13 defects**, six graded *would embarrass*. Four of five
first-round issues needed same-day corrections in public.

The 2026-09-01 audit re-verified all six open filings at upstream HEAD: **every
claim still stands and none is stale.** So the content was recoverable. What was
not recoverable is the impression left by correcting four public issues within
hours of opening them.

⚠ **The defect was the order of operations, not the research.** Everything below
follows from that.

---

## The two commands

- **`/upstream-issue`** — drafts a filing from a verified finding.
- **`/issue-review`** — attacks the draft before it is sent. **Rule 1 gates on it.**

⚠ Both are slash commands in `.claude/commands/`, matching this project's three
existing ones — **user-invoked, never model-invoked**, because filing needs
authorisation every time.

⚠ **Both read the target repository's issue template first**, and that outranks
anything here. **Measured 2026-09-01:** `XRPLF/rippled` sets
`blank_issues_enabled: false` and offers only `bug_report.md` and
`feature_request.md`; `XRPL-Standards`, `xrpl-dev-portal` and `mpt-crypto` have
none. ⚠⚠ **`rippled#8118` fit neither rippled template, was filed anyway, and
was closed without comment.** Reading the template first would have stopped that
filing before it was written — which makes it the cheapest rule here and the one
that was missing.

---

## The five rules

### 1. Adversarial review runs BEFORE filing, and it gates

No filing is sent until an independent adversarial pass has run against the
**draft text and the frozen primary sources**, and every finding is resolved.

⚠ **A review that runs after submission cannot prevent anything.** It can only
produce a correction, and a correction is a public record that the filing was
not ready.

**The reviewer is given the draft and the sources, not the conclusion.**

### 2. A filing is at most 300 words, with one concrete ask

Counted over the issue body, excluding code blocks, quoted source and the
disclosure footer.

⚠ **`WORD_LIMIT` in `tools/check-filing.ts` is what enforces this, and the gate
prints the number it used.** This heading states the rule; that constant is the
instrument. If the two ever disagree, the gate is right and this line is the
defect — and neither the skills nor a draft may restate the number at all.

- **One ask per issue.** If there are five asks, that is five issues or one
  errata list with five clearly numbered items and no argument between them.
- **Evidence is linked, not inlined.** A permalink to a line range beats a
  quotation; a quotation beats a paragraph explaining the quotation.
- **State the defect, the evidence, and the fix.** Nothing else.

⚠ The 2026-08-26 filings averaged **~750 words**. The dev-portal one was a
two-sentence documentation fix in six sections. A maintainer who cannot find the
ask in fifteen seconds will not look for it.

### 3. No "positives" filings to a bug tracker

An issue tracker is for things that need doing. Appreciation is not.

⚠ **And on `rippled` it is not even accepted**: `blank_issues_enabled: false`,
with only a bug report and a feature request offered.

⚠ `rippled#8118` was *"four design decisions that were better than they
looked"*. It needed a same-day correction because its central claim was false —
the spec advertises the property **twice**, in wording close to what the filing
presented as its own reading — and a core contributor **closed it without
comment**.

**Positive observations still get captured** in `UPSTREAM-FEEDBACK.md`, and they
still hold the higher bar in `CLAUDE.md`. They reach a team through a channel
meant for them, or not at all.

### 4. No negative claim without its recorded search

*"There is no field"*, *"nothing documents this"*, *"not exported"*, *"nobody
has called this out"* — each is a claim about a whole corpus, and one search
settles it.

The search command and its result go **in the draft**, next to the claim.

⚠ Two rows died this way. **U-15** quoted a sentence XLS-0096 has never
contained. **`rippled#8118` item 1** said a property was not advertised anywhere,
and the spec states it twice. `CLAIMS.md` **P-12** and
`tools/check-negative-claims.ts` came out of the first; this rule extends the
gate to drafts.

### 5. Plain English, short sentences

The reader is a maintainer skimming a queue, and English may not be their first
language.

- Short sentences. One idea each.
- Say **`fail_hard`**, not `tapFailHard`. ⚠ Project shorthand is not an API name
  and it has escaped into a public filing once already (`CLAIMS.md` E-156).
- No rhetorical build-up, no *"interestingly"*, no *"it is worth noting"*.
- Define an abbreviation on first use or drop it.
- ⚠ **Do not carry this repository's emphasis style outward.** The warning signs
  and bold blocks are internal instruments; in a filing they read as shouting.

---

## Before sending — the checklist

1. `make check-filing FILE=<draft>` passes.
2. An adversarial review has run on the draft and every finding is resolved.
3. Every citation re-fetched at source **today**, with the ref recorded.
4. Every negative claim carries its search.
5. The Trail of Bits April 2026 review has been checked — ⚠ several things this
   project first recorded as findings were already found and fixed there.
6. The ask is one sentence and appears in the first paragraph.
7. Authorisation from the project owner **for this filing**. ⚠ Authorisation is
   never standing; it is per filing, per session.

---

## After sending

- Archive the exact submitted text under `docs/upstream-filings/<date>/`. A
  GitHub issue can be edited; the archive is what the register points at.
- Record the issue URL in `UPSTREAM-FEEDBACK.md` and move the row to `Filed`.
- ⚠ **If a correction becomes necessary, post it as a comment and leave the
  original body alone.** Editing the body makes the thread incoherent — the
  correction then refers to text that no longer exists — and GitHub shows the
  edit history publicly anyway.

---

## What this protocol does not fix

- ⚠ **It does not make a filing welcome.** Six of seven from 2026-08-26 have had
  no response after six days. That is normal for these repositories and is not
  evidence of anything, in either direction.
- ⚠ **`check-filing` is lexical.** It counts words, finds unsearched negatives by
  their common spellings, and flags long sentences. **It cannot tell whether a
  claim is true**, and a claim phrased in a way it does not recognise is
  invisible to it. The review in rule 1 is the instrument for that; this gate
  only stops the shapes that have already gone wrong twice.
