# REVIEW-039b — the hostile outsider (worst thing in the repository)

- **Rotation:** `REVIEW-039` — the publication rotation
- **Date:** 2026-09-04
- **Subject:** the repository as a PUBLIC artifact, at `7d7149c`
- **Access:** FULL REPOSITORY, read-only.
- **Packet:** `docs/reviews/REVIEW-039-packets/packet-b-hostile-outsider.md`

⚠ **Verbatim leg output. Adjudicated in `REVIEW-039d`.**

---

## THE FIVE WORST THINGS, worst first

1. [OVERCLAIMING — worst sentence] “The tier signs nothing, so it holds no key, so an XSS in the browser application reaches exactly what a `curl` against a public node reaches.” — `web/api/server.ts:16` — False. The same process exposes decrypted issuer snapshots and signer-local status, including non-ledger attempt counts and filesystem/socket paths (`web/api/server.ts:80`, `web/api/server.ts:141`; the repository itself explains the contradiction at `docs/decisions/ADR-0003-web-tier-trust-boundary.md:128`). This confuses “cannot sign” with “cannot disclose non-public data.” It is an already-retracted trust-boundary argument surviving as a paraphrase in live source. The same stale premise survives at `web/api/signer-status.ts:25` and `docs/architecture/ARCHITECTURE-2026-08-18.md:246`. — Replace all three copies with the narrower signing-authority claim and add their exact formulations to the disclosure-phrase gate.

2. [MOST EMBARRASSING] “Nine run over the repository; a tenth, `check-filing`, takes a draft document as an argument…” — `README.md:241` — The Makefile now has a tenth repository-wide gate, `check-claims-index` (`Makefile:217`), followed by the per-filing gate (`Makefile:268`). `CLAIMS.md:305` also still calls the disclosure gate “the ninth” and says all nine passed. The project added a generated index because hand-maintained facts go stale, then immediately left its gate count hand-maintained and stale. An outsider disproves the headline discipline with one grep. Even `.PHONY` was not updated (`Makefile:1`). — Generate the gate list/count from the Makefile or test it; update README, CLAIMS, commands, and `.PHONY`.

3. [MOST LIKELY TO BE FALSIFIED] “A browser wallet cannot hold a confidential position… This is not a feature gap and no wallet API would close it.” — `web/app/src/routes/wallet.tsx:21` — Reasons 1–3 establish only that existing page APIs do not export the seed. They do not establish that an extension cannot derive or use the ElGamal key internally, hold a standalone ElGamal key, or expose a prove/decrypt operation without exporting seed material. The repository admits it built no connection to any wallet (`docs/decisions/ADR-0003-web-tier-trust-boundary.md:225`). A wallet implementer can refute this universal with an API design. The custody UI commits the same quantifier error by saying an amount policy “cannot” be enforced (`web/app/src/routes/custody.tsx:46`), while its own research lists secret-sharing and additional-ZK-proof constructions (`docs/research/CUSTODY-2026-08-28.md:62`). — Say “not supported by this implementation or by the wallet APIs examined,” not “cannot” or “no API would.”

4. [PUBLIC ACCUSATION] “`ripple-keypairs` disables hedged ECDSA on purpose, and the stated reason is test convenience.” — `UPSTREAM-FEEDBACK.md:164` — This reads as an indictment of a third-party product’s security priorities, not a neutral technical observation. The row admits it was inspected only in installed `node_modules`, is ungraded, and lacks an upstream issue, changelog, or design-note search. The adjacent row makes an even broader “no way” assertion while admitting P-12’s search was never run (`UPSTREAM-FEEDBACK.md:163`). “Observed — do not send” is meaningless once the repository itself is public and indexed. — Remove unverified third-party allegations from the public tree, or rewrite them as version-bounded observations without attributing intent.

5. [GATE OVERCLAIM] “`web/api/capability.test.ts` checks that each citation points at something that exists and says what the cell claims.” — `web/api/capability.ts:4` — The test checks only that a citation parses into a target and that named files, rows, ADRs, or rulings exist (`web/api/capability.test.ts:127`). It never checks semantic support. A citation to an irrelevant existing file passes. This is precisely the failure mode the project claims unusual discipline against: the gate asserts more than it checks. — Change the comment to “resolves and exists,” or add explicit per-cell semantic assertions.

## WHAT I CHECKED AND FOUND CLEAN

- Searched all 416 tracked paths, including source comments/docstrings, every `web/app/src/routes/` component, API response strings, `CLAIMS.md`, README files, architecture/decision documents, task-zero material, and upstream filings.
- Searched all 198 commit messages. No uncured claim there displaced the five above; the newest gate-count contradiction is already visible in the live tree.
- Read the archived upstream filings and corrections. The original defective submissions are clearly preserved as provenance and point readers to their corrections.
- The major protocol limitations are generally disclosed honestly: Devnet-only execution, amount-only privacy, plaintext conversion amounts, issuer visibility, simulated custody, non-loopback historical runs, and lack of a published derivation.
- The old task-zero “1,000,000 bound” error is visibly corrected through its later documents.
- `PREFLIGHT.md` is not clean, but it fell below the top five: it says to delete itself after Session 1 (`PREFLIGHT.md:3`) and still says there is no `package.json` (`PREFLIGHT.md:42`).
- I used no network and made no repository changes. I did not run compilers or tests because those toolchains can write caches; I inspected their source and assertions instead.

## THE ONE THING I WOULD FIX BEFORE PUBLISHING

Remove the false XSS/public-node equivalence and every surviving paraphrase of the retracted trust-boundary claim. It is the only finding here that actively understates a security boundary while the repository already contains the evidence proving it false.
