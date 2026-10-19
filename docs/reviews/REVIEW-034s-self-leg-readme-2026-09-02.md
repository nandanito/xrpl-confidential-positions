# REVIEW-034s — self leg, round three, the README

⚠ Written to a scratchpad and NOT committed while the Codex leg reads the tree
(`CLAUDE.md`: do not let your own answers appear in a tree a leg is reading).

## S-1 — P2. The three-amendment sentence contradicts the opening I wrote this session.

`README.md`: *"**Three amendments must be enabled on the same network, not one**"*
— but the opening now says the project does **not** exercise XLS-70 or XLS-80 and
the issuance carries no `sfDomainID`. So `PermissionedDomains` and
`SingleAssetVault` are required for the project's **full scope**, not for what is
built. **I introduced this contradiction** by striking XLS-80 from the opening and
not re-reading the amendment section against it.

⚠ **The Gemini leg found the contradiction and got the protocol half WRONG.** It
said `sfDomainID` belongs to `PermissionedDomains`, not `SingleAssetVault`.
`CLAIMS.md` **E-19**, grade A, read at `MPTokenIssuanceCreate.cpp:31–36`: writing
`sfDomainID` requires **both**. The coupling is real and counterintuitive, and it
has no citation in the README — which is why a reader guessed. **Fix: cite E-19
and scope the requirement.**

## S-2 — P1. The document mandates a disclosure and does not make it, and the answer is the unfavourable one.

`README.md`: *"Whether this project sets that clawback flag is a choice it must
disclose either way."* It never discloses. **It sets it.**
`facility/run-facility.ts:323` — `Flags: 0x20 | 0x40, // tfMPTCanTransfer |
tfMPTCanClawback`, and `tfMPTCanClawback` is 64 in `ripple-binary-codec`.

⚠ **Verified on the validated ledger 2026-09-02, both issuances**: the facility's
`0048BEC2…537E` and the web tier's demo `004625C9…25E8` both read `Flags=224`,
which carries `lsfMPTCanClawback`. **So the issuer in every demonstration this
project has run can destroy any holder's entire confidential balance.**
Found by the Gemini leg. **This is the finding of the round.**

## S-3 — P2. E-168's shape, in the session whose register row is about E-168.

Round two changed *"`vendor-verify` **proves** the restoration"* to *"checks"* in
`README.md`. **The phrase survives at `tools/rebuild-env.sh:12` and
`signer/README.md:1143`.**

⚠ **ADJUDICATED SOUND, and the reason is the point.** Those two sites claim
*restoration fidelity* — the vendored tree matches the pin byte for byte — and
`vendor-verify.sh` does establish that. The README's *"proves"* was retracted for
a **different** overclaim: that it bounds build-time tampering, which it cannot,
because `signer/build.rs` compiles from `/tmp/wconf` and only *recommends* the
check in an error string (`build.rs:79`, `:130`). ⚠ **Same words, different claim.
A future session grepping the phrase cannot tell these apart**, which is the cost
of the fix being lexical.

## S-4 — P2. Round two's own fix reached one site and not the other. Mine.

The confirmation-vs-memory contradiction was fixed in the architecture section
(*"Against the same-host adversary … the screen is irrelevant"*) and **left
standing in the Trust model**: *"the per-transaction confirmation, not the
transport, is what stands against it."* Both external rounds flagged the pair.
⚠ **This is the fix-the-instance-not-the-phrase defect, committed by the session
that wrote a register row about it.**

## S-5 — P3. Two round-two findings I did not fix and did not record as declined.

1. **The XLS-96 draft is unversioned in the README.** Every research finding is a
   finding about one draft. It is pinnable: E-1 gives *Draft, created 2026-01-15*
   and E-216 establishes *not touched since 2026-08-10* as of the 2026-09-01 audit.
   **Fixable, so fix it.**
2. **The `MPToken` reserve amount** is asked for in "Before opting in" and not
   given. ⚠ **This project has not recorded the figure** — `grep` over `CLAIMS.md`
   returns no reserve amount. **A named gap is a correct output**; say it is not
   recorded rather than invent one.

## Rejected, with reasons, so no later session relitigates

- **Gemini 1.4 — `underB15Conditions: false` is "inverted".** REJECTED.
  `facility/src/loopback.ts:380` — it is a getter returning
  `identity.isLoopback && unflagged === 0`. It means *were B-15's conditions in
  force*, and they were not. The leg read it as *was this under the risk
  acceptance*. ⚠ **The confusion is evidence the README never says what the flag
  means** — worth one clause, which is the right response to a rejected finding
  that exposes a real ambiguity.
- **Gemini 5.1 — `fail_hard` gives "zero protection against consensus-stage
  `tec`".** REJECTED on the claim. `CLAIMS.md` **E-149**: read at rippled 3.3.0
  `Transactor.cpp:1645-1651` / `NetworkOPs.cpp:1833` **and EXECUTED 2026-08-25** —
  the same signed bytes gave `applied=false`, absent from the validated ledger, no
  `Sequence` consumed with the flag, and `applied=true` without it.
  ⚠ **The leg's point beneath the false premise is UPHELD**: my sentence puts
  *"tells a node to discard"* next to *"still lands on the ledger"*, and a reader
  takes the *"still"* as *despite the flag*. Ordering defect, real. (E-170's
  pattern: the point under a wrong diagnosis was still worth taking.)
- **Gemini 4.1 — `# ~3 min` violates P-8.** REJECTED. P-8 governs **benchmark
  numbers** offered as evidence about the protocol. An operational hint about how
  long a make target takes is not a claim about XLS-96 and carries no comparison.
  ⚠ Applying P-8 here would ban the useful half of an operator note; the project
  has already deleted a wording test for firing on its own disclaimer.
- **Gemini 6.1 — supply `facility/.env` and `signer/config.json`.** REJECTED as
  **fabricated**: neither path exists. `facility/src/signer.ts:115` writes a
  profile to a path the driver chooses. ⚠ **A leg's diagnosis can be right while
  its remedy is invented**; the gap is real and the README already routes it to
  the demo script.

## Coverage — what this leg checked and found sound

Every register id cited in `README.md` re-verified to exist (41). All internal
links resolve. Markdown fences balanced, tables well-formed. Four Devnet hashes
re-queried validated with the claimed `MPTAmount` values. `make web-api` run,
answering on `127.0.0.1:3011`, bound to loopback only. Eight repository gates plus
`check-filing`'s positive control plus `vendor-verify` green. 279 signer and 207
TypeScript tests, three runs.
