# Vocabulary — this project's shorthand, translated

**Read this before grepping rippled for a name you found in this repository.**

Some words in these documents are **this project's own shorthand**. They read
exactly like API names and they are not. One of them escaped into a public
upstream filing on 2026-08-26 (`XRPL-Standards#609`, corrected the same day,
`CLAIMS.md` **E-156**), which is why this file exists.

⚠ **`CLAUDE.md`'s rule is: *do translate it before anything leaves this
repository.* Publishing the repository is that.** This document is that
translation.

---

## `tapFailHard` — NOT a real name

**The string `tapFailHard` appears ZERO times in rippled.** It is used
throughout this repository instead — including in `CLAUDE.md` itself.

⚠ **No count is given here, deliberately.** A count over this project's own
corpus is **self-referential**: writing this page added occurrences, and so did
every pointer to it. `CLAIMS.md` **E-236** is the row where a corrected count was
already false in the commit that corrected it. **Re-run it instead:**

```sh
git grep -c tapFailHard | sort -t: -k2 -rn    # where the shorthand still appears
```

| what you'll read here | the real name | what it is |
|---|---|---|
| `tapFailHard` | **`fail_hard`** | The **JSON submission parameter**, which is what a client actually sets. rippled 3.3.0 `Submit.cpp:32-37` reads `jss::fail_hard`. |
| `tapFailHard` | **`TapFailHard`** | The **internal apply flag**. rippled 3.3.0 `ApplyView.h:32`, `TapFailHard = 0x10`, declared under the comment `// fail_hard flag set.` |

⚠ **The code was never wrong.** `facility/src/submit.ts` sends `fail_hard: true`
— the real parameter. **The defect is in the prose**, and only in the prose.

### Why those files were not renamed

`CLAUDE.md`: *"Do not mass-rename the 35 files — the reviews are a historical
record."* ⚠ **A review packet is the record of what a leg was shown**, and
editing it after the fact makes it a worse record, not a better one.

⚠ **That sentence's own numbers were stale when this page was written** —
measured at `41b0255`, before this document existed: **178 occurrences across 51
files**, not *"~130 times across 35 files"*. **This project's most-repeated
defect, landing on the rule about the defect.**

**So the shorthand stays, and this page is the translation.**

### Where it is already handled correctly

- **`README.md`** defines `fail_hard` and `TapFailHard` in its glossary and uses
  the real names throughout.
- **The other reader-facing documents**, translated on 2026-10-18: the
  architecture document, `facility/README.md`, `signer/README.md`,
  `web/README.md` and the explainers. Each sentence that used the shorthand as a
  name now says `fail_hard`; the sentences that define the shorthand stay.
  `make check-vocabulary` fails if it comes back on any of them as a name.
- **`docs/reviews/`** keeps its wording, as the rule below says, under a banner
  in [`docs/reviews/README.md`](reviews/README.md) that points here.
- **`docs/upstream-filings/2026-08-26/03-standards-tecbadproof.md`** — the filing
  that leaked it — carries a superseded banner naming the error and pointing to
  the correction, with the body kept unaltered for provenance. **That is the
  right handling and it is not changed here.**

---

## What this document does NOT say

⚠ **This is a translation of ONE term, not an audit of this project's
vocabulary.**

1. **It covers `tapFailHard` and nothing else.** Other shorthand may exist. The
   term audited here is the one with a *demonstrated* failure — it escaped into
   a public filing — and the one that is dangerous **because it is shaped like a
   rippled identifier**, so a reader greps for it and finds nothing.
2. ⚠ **`EncZero` was considered and is deliberately NOT listed.** It traces to a
   real mpt-crypto function, `generate_canonical_encrypted_zero`, and **whether
   XLS-0096 uses the term was not searched.** Under **P-12** this project may not
   assert that a source does or does not say something without the search that
   would falsify it. **Recorded as a named gap rather than guessed at.**
3. ~~**It is prose, with no falsifier.** Nothing gates project vocabulary at the
   repository boundary.~~ **Struck 2026-10-18.** `tools/check-vocabulary.ts` is
   the falsifier, for a named set of reader-facing files. It passes a line that
   uses the shorthand only if the same line names the real parameter, the real
   flag, or calls it shorthand. The records are outside its scope by ruling, and
   it prints so.
