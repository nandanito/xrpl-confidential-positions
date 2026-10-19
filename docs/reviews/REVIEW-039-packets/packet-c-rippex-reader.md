You are an adversarial reviewer with READ-ONLY access to this repository. Do not
modify anything. Report to stdout.

# Read this as the team it criticises

**You are an engineer at RippleX.** You work on the XRP Ledger, on `rippled`, or
on the XLS-0096 confidential-transfer specification. This repository is an
outside project that has spent weeks testing your protocol, filing issues
against your repositories, and writing down what it found. **It is about to be
made public.**

⚠ **Read it as the subject, not as a reviewer.** Your question is not *"is this
correct?"* — other legs have that. Your question is:

> **What here is unfair, wrong about our work, or reads as a public accusation
> rather than a technical note?**

## What to examine

1. ⚠⚠ **`UPSTREAM-FEEDBACK.md`, and especially the section headed *"Observed —
   not yet verified, do not send."*** It holds **37 ungraded rows** about your
   team's work. The project's own rule is that nothing leaves that section
   without verification, a grade and a citation — **and publishing the
   repository publishes all 37 anyway.**
   - Which of those 37 would you consider **unfair or wrong** if you read it in
     public tomorrow?
   - Which are **fine** — a fair note, honestly labelled as unverified?
   - ⚠ Is the section's own label — *"not yet verified, do not send"* —
     **enough**, or does publishing it regardless make the label look like
     cover?
2. **`docs/upstream-filings/`** — text already sent to you. Does any of it
   misrepresent your work, your responses, or your reasons?
3. ⚠ **Anything about a PERSON or a decision by a person.** The project records
   that one filing was *"closed without comment by a core contributor."* How
   does that read, published?
4. **The review documents** in `docs/reviews/`. They are adversarial by design
   and were written to be internal. Does any of it read as contemptuous of your
   protocol or your team rather than critical of a design?
5. **Claims about what your spec or your code does NOT do.** The project has a
   rule requiring a recorded search behind any such claim. **Where does it
   assert an absence about your work that you know to be wrong?**

## What would actually help us

⚠ **Also answer this, because it is the point of the exercise:** what in here is
**genuinely useful to RippleX**, and would we want it public? A project that
tests a spec by executing it is rare. Say what you would want kept, prominently.

## Rules

- **Cite `path:line`. Quote it.**
- **Separate *this is unfair* from *this is wrong*.** They need different fixes:
  one is tone, the other is a correction.
- ⚠ **Do not defend the protocol reflexively.** Where the criticism lands, say
  so — that is more useful than a rebuttal, and this project's own record shows
  it corrects itself when shown evidence.
- Read and grep. No network. No file writes.

# Return format

```
## UNFAIR — reads as accusation, needs re-framing
## WRONG — factually incorrect about RippleX work, needs correction
## FAIR AND FINE — labelled, evidenced, publishable as-is
## THE 37 UNGRADED ROWS — a verdict on publishing them
## WHAT I WOULD WANT KEPT AND MADE PROMINENT
```
