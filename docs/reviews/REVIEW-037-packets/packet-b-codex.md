You are an adversarial reviewer with READ-ONLY access to this repository. Do not
modify anything. Report to stdout.

# ROUND TWO — you are reviewing THE FIXES, not the original subject

Round one (`docs/reviews/REVIEW-036c-adjudication-adr-0003-2026-09-02.md`) ruled
that `ADR-0003`'s central claim was unsound, and the fixes were applied in commit
`f7e7b43` (the tip of branch `review/adr-0003-rotation`).

⚠ **This project's rule is that round two exists because FIXING something and
DESCRIBING the fix are separate acts with separate failure modes.** Its recorded
history is that round two most often finds (a) a defect introduced BY a fix,
(b) a fix that reached the instance someone was looking at but not the PHRASE,
and (c) sentences that overstate what the fixes established.

**Start with `git show f7e7b43 --stat` and `git show f7e7b43`.**

## What to attack, in priority order

### 1. Did the fixes reach the PHRASE, not just the cited line?

Round one retracted a claim with several spellings. `tools/check-disclosure-phrases.ts`
gained three of them and found a third site. ⚠ **Search the whole tree for the
retracted claim in EVERY form you can think of** — reworded, split across lines,
paraphrased, in a code comment, in a test fixture, in `web/`'s rendered UI copy.
**A paraphrase the lexical gate cannot see is exactly what this project's rule
predicts will survive.** Report every live site that still asserts, in substance:
*the web tier moves no trust boundary* or *it grants no new authority*.

### 2. Do the NEW gate parts false-pass?

`tools/check-web-readonly.ts` gained **part 6** (loopback bind) and a widened
`SOCKET_OPENERS`. ⚠ **Five gates in this repository built to catch false passes
have false-passed.** Attack these:

- Can you construct a NON-loopback bind that part 6 passes? Consider: a hostname
  from `process.env`, a ternary, a second `.listen(` in a file part 6 does not
  load, `Bun.serve({...})` called directly rather than `.listen(`, a hostname
  built by concatenation, `"::1"`, `"0"`, `"[::]"`.
- ⚠ **Does part 6 even look at the right files?** It is handed `apiSrc`. What
  loads that, and what does it miss?
- Can you add a second socket client that `SOCKET_OPENERS` still misses?
- Are the controls genuine, or do they replay round one's attack? **Ask what each
  control does NOT run.**

### 3. Does `ADR-0003` revision 2 overstate its own fixes?

Read the ADR. ⚠ **Check every claim revision 2 makes about what was fixed,
measured, or verified, against the tree.** Round one's own finding was that this
document asserted things about the repository that were false. **Revision 2 was
written by the same session that fixed them.**

Specifically verify: that part 6 exists and does what the ADR says; that the
break tests described actually fail the gate; that the `0700`/`0600` citations
are accurate; that `store.rs:753-756` says what is quoted; that the Harmonize
count is now correct.

### 4. Is the REWRITTEN claim sound?

Revision 2 replaces the retracted claim with a narrower one about **signing
authority**. ⚠ **Attack the replacement.** Is it true? Is it complete? Does it
have the same shape of defect one level down? Is "adds no SIGNING authority"
itself verifiable, and by what?

### 5. Did any fix INTRODUCE a defect?

The gate was edited, the ADR was rewritten, an explainer was rewritten, five
`CLAIMS.md` rows were added and `CLAUDE.md` was edited. ⚠ **Check the new
`CLAIMS.md` rows against the tree** — a row asserting something false is the
worst outcome here, because the register is what later sessions trust.

# Rules

- **Grade P1 / P2 / P3.** Cite `path:line`. No citation, no finding.
- **Say what you actually ran.** Paste the commands.
- **Report what is SOUND.** If the fixes hold, say which and why your attack failed.
- ⚠ **Do not re-litigate round one.** Its findings are settled. Attack the FIXES.
- Read and grep. Do not write files or run network commands. You MAY run
  `bun run tools/check-web-readonly.ts` and `bun test web/api`.

# Return format

```
## VERDICT ON THE FIXES
## F1..Fn  (grade — quote — path:line — defect — consequence)
## ATTACKS I TRIED THAT FAILED   (this section is required)
## WHAT I RAN
```
