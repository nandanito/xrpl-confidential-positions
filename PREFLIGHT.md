# Preflight — before Session 0 and Session 1

Written 2026-08-13. ⚠⚠ **HISTORICAL. Session 1 reported three weeks ago and this file was never deleted** — it is kept as the record of what the project believed before it measured anything, and **several of its statements are now false.** ⚠ **Do not follow it.** `README.md` and `GETTING-STARTED-CLAUDE-CODE.md` are current; this is not (`REVIEW-039b`, `CLAIMS.md` E-239).

---

## 1. Files that must exist

Run this from the repository root. `tree` hides dotfiles unless you pass `-a`, so check with `find`:

```sh
find . -path ./.git -prune -o -type f -print | sort
```

You should see 24 files. The ones most easily missed, because they are hidden or empty-looking:

| Path | Why it matters if absent |
|---|---|
| `.claude/agents/*.md` (3) | **Claude Code has no personas.** Sessions run without the research discipline, the grading rules, or the Build Lead's stop condition. This is the single most consequential omission possible |
| `.claude/commands/*.md` (3) | No `/claims-check`, `/task-zero` or `/feedback-capture` |
| `.gitignore` | Seed and signer-state patterns are not excluded. Fix before the first commit that touches key material |
| `Makefile` | `make sync-personas` and `make check-amendments` unavailable |
| `docs/reviews/REVIEW-001`, `REVIEW-002` | `CLAIMS.md` and `ADR-0001` both cite findings by number — "REVIEW-002 (Gemini B4)", the retracted rows, the rejected-claims register. Without them those citations dangle, and the rejected claims will be relitigated by the next reviewer |
| `docs/personas/README.md` | The generated-from relationship between `docs/personas/` and `.claude/agents/` is undocumented, so they drift silently |
| `LICENSE` | Full Apache 2.0 text, required before the repository is public |

After copying anything into `docs/personas/`, run `make sync-personas`. The two directories drifting apart is the failure that target exists to prevent.

---

## 2. Toolchain

| Need | For | Check |
|---|---|---|
| Bun | `tools/check-amendments.ts` | `bun --version` |
| Git | cloning mpt-crypto | `git --version` |
| CMake | Session 1 Task 3 | `cmake --version` |
| Conan | mpt-crypto dependencies | `conan --version` |
| C/C++ toolchain | building mpt-crypto | macOS: `xcode-select --install` |
| `wscat` or `websocat` | the manual RPC call below | `npx wscat --help` |

⚠ ~~There is deliberately **no `package.json`**.~~ **STRUCK — there is one, with four pinned dependencies.** Bun runs `tools/check-amendments.ts` standalone, and adding one now would mean guessing dependencies before Session 3 chooses the serialisation approach.

CMake and Conan are only needed for Session 1's third task, but install them at Session 0 — discovering a broken toolchain halfway through a measurement session wastes the session.

---

## 3. Gap status

| Gap | State | Closed by |
|---|---|---|
| GAP-1 — live amendment readings | **Open** | Session 1 Task 1 |
| GAP-2 — IACR ePrint 2026/602 | **Open** | Manual download. Not yet in `docs/references/` |
| GAP-3 — `cmpt-compact-sigma.pdf` | **Closed** — file present | Already done |
| GAP-6 — mpt-crypto size constants | **Open** | Session 1 Task 2 |

**GAP-3 closing is more significant than it looks.** ADR-0001 §(a) assumes the balance-linkage statement in the compact sigma proof requires the sender's secret key, and grades that premise C because the paper was unread. The entire custody decision rests on it. That paper is now on disk, so this can be settled by reading rather than by another session — and it is worth doing before Session 1, because if the assumption is wrong, ADR-0001 needs redoing and Session 3's spike changes shape.

GAP-2 remains open. `eprint.iacr.org` blocks automated fetching; download 2026/602 by hand into `docs/references/`. It is load-bearing for W-PQ rather than W-CONF, so it does not block Session 1 — but it does block accepting anything about which XLS-96 security properties are computationally versus unconditionally hiding.

---

## 4. The manual `feature` call

Do this once, by hand, before running the script. You need to know what an unmodified response looks like in order to recognise a wrong automated answer later.

WebSocket:

```sh
npx wscat -c wss://s.altnet.rippletest.net:51233
> {"id":1,"command":"feature"}
```

Or JSON-RPC:

```sh
curl -s -X POST https://s.altnet.rippletest.net:51234/ \
  -H 'Content-Type: application/json' \
  -d '{"method":"feature","params":[{}]}' | head -c 2000
```

Note what the shape actually is: results are keyed by **amendment ID**, not by name, with the human-readable name nested inside each entry, and `enabled`, `supported` and sometimes `vetoed` or `majority` alongside. `tools/check-amendments.ts` inverts that mapping — if it ever returns something surprising, this is the output to compare against.

The open question is whether `ConfidentialTransfer` is votable or enabled on **standard Devnet**. The canonical xrpl.org page names no dedicated network and renders a live status widget instead; the prerelease Confidential Devnet faucet is dead. Plausible, unverified — read it, do not assume it. That is Session 1 Task 1.

---

## 5. Account

**The confidential faucet URL from the prerelease docs is dead.** Run Session 1 Task 1 first: it tells you which network carries `ConfidentialTransfer`, and you fund an account on that network from its standard faucet. Do not fund anything before you know where you are building.

---

## 6. Before Session 1 begins

- [ ] All 24 files present, `.claude/` included
- [ ] `make sync-personas` run, agents and personas identical
- [ ] Bun, Git, CMake, Conan, C toolchain installed
- [ ] Manual `feature` call made against at least one network, output read
- [ ] `ADDENDUM-2026-08-16.md` read — it retires two findings and adds the 1,000,000 decryption bound
- [ ] Trail of Bits report downloaded into `docs/references/` and the fix-review appendix read, plus Appendices B to D, which the fix review does not cover (`CLAIMS.md` E-296)
- [ ] ePrint 2026/602 downloaded into `docs/references/`
- [ ] `cmpt-compact-sigma.pdf` read far enough to confirm or refute ADR-0001 §(a)'s premise
- [ ] Devnet account funded, on whichever network Session 1 identifies

The last two are the ones worth not skipping. Everything else is recoverable mid-session; those two change what the sessions are for.
