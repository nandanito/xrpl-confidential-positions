# Environment and tooling

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

The build environment, the ephemeral `/tmp/wconf` tree, and the session mechanics that have cost real work.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**17 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [P-3](../../../CLAIMS.md#L24) | Prohibitions | That any amendment is live or enabled, without a dated feature RPC check | Amendment state is a… |
| [E-16](../../../CLAIMS.md#L57) | Established | SmartEscrow (XLS-100) is absent from features.macro in 3.3.0 | A |
| [E-97](../../../CLAIMS.md#L148) | Established | IT HAPPENED AGAIN on 2026-08-25, mid-session, and the window turned out to be DAYS → E-133. | A |
| [E-99](../../../CLAIMS.md#L150) | Established | tools/rebuild-env.sh restored an environment that could not rebuild a Devnet chain, and looked complete doing it. | A, executed |
| [E-129](../../../CLAIMS.md#L180) | Established | tools/rebuild-env.sh — the script whose entire job is recovering a cleaned /tmp — could not recover a PARTIALLY cleaned one, and died with fatal: not… | A, executed |
| [E-133](../../../CLAIMS.md#L184) | Established | /tmp/wconf/state.json was lost a SECOND time — during this session, eight minutes before it was needed — and the window is DAYS, not weeks. | A, executed |
| [E-145](../../../CLAIMS.md#L196) | Established | bun build IS NOT A TYPE-CHECK, and this session called it one at least fourteen times. | A, executed |
| [E-174](../../../CLAIMS.md#L234) | Established | A REVIEW LEG RULED THE SESSION'S CENTRAL FINDING FALSE, FROM A CORRECT-SOUNDING READING OF CARGO'S RULES, AND WAS REFUTED BY THE COMPILER'S OWN FLAGS. | A, source (E-244,… |
| [E-187](../../../CLAIMS.md#L247) | Established | B-23 RESTED ON A CARGO FEATURE NO MANIFEST IN THIS REPOSITORY ASKED FOR — E-167 RUNNING FORWARD INSTEAD OF BEING QUOTED. | A, executed |
| [E-209](../../../CLAIMS.md#L269) | Established | TWO DEFECTS THAT A CLEAN TYPE-CHECK, A CLEAN BUILD AND A PASSING GATE ALL MISSED, AND BOTH WERE FOUND BY LOADING THE PAGE. | A, measured |
| [E-262](../../../CLAIMS.md#L322) | Established | A handover edit was reported as applied and never reached the file. | A, source |
| [E-265](../../../CLAIMS.md#L325) | Established | The /tmp cleaner took /tmp/wconf overnight for the third time, and the backup paid for itself. | A, executed |
| [E-277](../../../CLAIMS.md#L337) | Established | The handover cited a commit that does not exist, one section below the paragraph where a fabricated sha had already been removed for the same reason. | A, measured |
| [E-279](../../../CLAIMS.md#L339) | Established | Two valid git settings crashed the revision tool, and the fix went to the producer rather than the four call sites. | A, measured |
| [E-280](../../../CLAIMS.md#L340) | Established | GIT_DIR BEATS cwd, so the revision tool's synthetic probe wrote its configuration into a FOREIGN repository — measured, not theorised. | A, measured |
| [E-282](../../../CLAIMS.md#L342) | Established | The DENYLIST written to fix GIT_DIR missed GIT_CONFIG one round later, so it is an ALLOWLIST now. | A, measured |
| [B-19](../../../CLAIMS.md#L406) | Pending | ed25519-dalek is configured default-features = false, features = ["std"], so zeroize is OFF. THAT PREMISE IS FALSE — E-171, 2026-08-27. ["std"]… | CLOSED → docs/decision… |
