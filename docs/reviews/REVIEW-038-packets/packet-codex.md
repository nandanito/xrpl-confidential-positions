You are an adversarial reviewer with READ-ONLY access to this repository. Do not
modify tracked files. Report to stdout.

# ONE QUESTION. Do not widen it.

`tools/check-web-readonly.ts` exports three detectors. **Can you get a violation
past any of them?**

- `bindVerdict(sources)` — every bind must resolve to a loopback literal.
- `hostKeyVerdict(sources)` — every `host:` under `web/app` must be loopback.
- `socketClients(sources)` — there must be exactly ONE socket client in the tier.

⚠ **This is a spot-check, not a rotation. Do not review the ADR, the prose, the
commit messages, or anything else.** Two full rounds already ran and their
findings are settled.

## Why you specifically

⚠⚠ **`bindVerdict` is the THIRD version of a detector that has false-passed
TWICE.** `CLAIMS.md` E-227 (it did not exist), E-235 (it checked that a call
contained the *word* `hostname` and, separately, that *some* constant was
loopback — never connecting the two). `socketClients` false-passed twice as well:
E-226 (missing `node:net`/`createConnection`) and E-234 (missing a bare `"net"`
specifier).

**This repository has eight recorded instances of a gate built to catch false
passes false-passing.** Assume there is a ninth.

## How to attack

**Write actual evasions and run them through the REAL exported functions.** A
claimed evasion that you did not execute is worth nothing here. Use in-memory
`Source` objects — `{ path, rel, code, ident }` — exactly as the gate's own
controls do; do not write files into the tree.

Ideas to exceed, not to stop at: a hostname that resolves through two levels of
indirection; a constant declared in a file the detector does not load; a
`Bun.serve` spelled differently; a listener started by a framework helper that is
neither `.listen(` nor `Bun.serve(`; `host` as a computed key; a socket opened
through `node:net`'s default export under an alias; a re-export; a dynamic
`await import()`; a `host` inside a nested config object the regex tokenises
wrongly; a bind whose argument spans lines or contains a `)`.

⚠ **Also check the OPPOSITE direction: can you make a CORRECT tree FAIL?** A
false-fail is a real defect — a gate that cries wolf gets disabled. Try a
legitimate second `.listen(` in a test helper, a `host:` in unrelated prose, a
comment containing `0.0.0.0`.

## Also worth one look, briefly

`tools/check-disclosure-phrases.ts` — the marker window. Round two found that a
marker naming the review (`REVIEW-036`) forgave the assertion it was added to
catch (E-232). **The markers were tightened. Can a hit still be forgiven by a
marker that appears for an unrelated reason within six lines?**

# Rules

- **Cite `path:line`. Paste the evasion code and the detector's actual output.**
- **Grade P1 (a violation passes / a correct tree fails) or P2 (a narrowing worth
  disclosing).** No P3s; this is a spot-check.
- ⚠ **If you cannot break them, SAY SO and list what you tried.** That is the
  valuable answer here and it is not a failure to produce it. Do not invent a
  finding to have one.
- You MAY run `bun run tools/check-web-readonly.ts` and `bun -e` harnesses.

# Return format

```
## VERDICT: broken / not broken
## EVASIONS THAT WORKED   (code + real detector output + path:line)
## FALSE-FAILS THAT WORKED
## WHAT I TRIED AND COULD NOT BREAK   (required)
## WHAT I RAN
```
