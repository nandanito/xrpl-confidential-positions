# Upstream issue review

Review the draft as a skeptical maintainer **and** as a fact-checker. Produce an
edited version.

⚠ **Read-only against GitHub. Do not create, submit, edit or close anything.**

## ⚠⚠ STOP — did you write this draft?

**If this draft was produced in this session, or by you, REFUSE.**

Say plainly: *"I drafted this. Rule 1's review has not run and I cannot run
it."* Then stop. **Do not review it, do not rewrite it, do not report a word
count.** Producing an edited version here is worse than doing nothing, because
it makes rule 1 look satisfied when no independent pass has happened.

⚠ **The writer hands off for this reason; both halves of the handshake must
refuse, or the gate is closed by whichever half is invoked second.** The first
version of these two commands fixed only the writer, and an independent review
found that running them back to back in one session still produced a
"completed" review.

⚠ **This project has measured what the difference is worth.** A self-review of
these two commands found four defects and called them fixed. An independent pass
then found **six more** — one of them introduced by the self-review, and one it
had "fixed" in a single place while a second copy stood. **A further independent
pass found four more, two of them in those fixes.**

**A fresh session, a different model, or a person. Not you.**

---

## 0. First, the two cheap rejections — before any source is opened

⚠ **These cost one API call each and can end the review immediately.** Verifying
claims against primary sources and the Trail of Bits appendix is the expensive
part; do not spend it on a draft that cannot be filed anyway.

**Right venue?** Confirm the destination repository exists and is owned by the
org the draft assumes. ⚠ **Testing this on U-54 found exactly that defect** — the
wallet standard is not in `XRPLF/XRPL-Standards` at all. **A correct finding sent
to the wrong repository is still a wasted filing**, and no evidence check catches
it.

**Right shape?** Read the target's `.github/ISSUE_TEMPLATE/` **and decode its
`config.yml`** — listing filenames does not establish a policy.

```sh
gh api repos/<owner>/<repo>/contents/.github/ISSUE_TEMPLATE/config.yml \
  --jq '.content' | base64 -d
```

⚠ **`blank_issues_enabled: false` means only the listed shapes are accepted.**
`rippled` sets it, `rippled#8118` fit neither template, and it was closed without
comment. **If the draft fits no accepted template, stop here and say so.**

---

## ⚠ Then correctness, and this is the whole point

A concision pass would not have caught **a single one** of the thirteen defects
found in the 2026-08-26 round. Every one was a claim that was **false or
overstated**, and counting words finds none of those.

**So attack the claims before you touch the prose.**

### Verify every claim against the primary source, now

- Open the source the draft cites. **Do not trust the draft's quotation** — a
  filed row once quoted a sentence the specification has never contained
  (`UPSTREAM-FEEDBACK.md` U-15).
- Check line numbers and section numbers still resolve. Sources move.
- ⚠ **Every negative claim needs its search, and you run it.** *"There is no
  such field"*, *"not called out anywhere"*, *"not exported"* — one search
  settles it. **`rippled#8118` said a property was not advertised anywhere; the
  specification states it twice**, once in wording close to what the draft
  presented as its own reading.
- Check whether upstream already fixed it. **Four rows died as stale gaps** —
  `UPSTREAM-FEEDBACK.md` U-3, U-8, U-9, U-10 — each describing something already closed.
- Check the Trail of Bits April 2026 review. Several things this project first
  recorded as findings were already found and fixed there. Read Appendices B to D
  too: the fix review does not cover them, and F-19 was in Appendix B
  (`CLAIMS.md` E-296).

### Separate the three layers

**Demonstrated** — you ran it or read it at source.
**Inferred** — it follows, but nobody checked.
**Proposed** — what the draft wants done.

⚠ A draft that presents the second or third as the first is the defect that
needed four public corrections. Say which layer each claim is on.

⚠ **Do not let the draft's framing set yours.** Ask what would have to be true
for the claim to be *wrong*, and go and check that.

## Then the maintainer's read

**Actionable?** Can a maintainer tell what to investigate, decide or change?

**Scoped?** One independently actionable problem, or several disguised as one?

**Skimmable?** Headings, bullets, code blocks, tables. Conclusion before
evidence.

**Something to do?** ⚠ A positives-only filing does not belong on a bug tracker
at all — reject it rather than editing it.

## Delete

Essay introductions, throat-clearing, praise before the report, rhetorical
questions, speculative motivation about maintainer intent, repeated conclusions,
research narration, background a maintainer already has, and any restatement of
the same point in summary and conclusion.

**Also delete, specifically for this project:** project shorthand
(`tapFailHard`), internal register references (`CLAIMS.md`, `E-nnn`,
`REVIEW-nnn`), and this repository's ⚠-and-bold emphasis style.

## Rewrite

Produce the edited version. **Aim to cut at least 20% without losing
load-bearing evidence.** If the draft is already tight, say so and do not cut
mechanically.

Run `make check-filing FILE=<draft>` on the result.

## Report

1. **Claims that did not survive verification** — with what you ran.
2. **Claims that need a search that has not been run.**
3. **Layer corrections** — demonstrated / inferred / proposed.
4. **The edited version.**
5. **Word count before and after.**

⚠ **If any claim failed verification, say plainly that the draft is not ready to
file.** Rule 1 gates on this. It is better to lose a filing than to correct one
in public.
