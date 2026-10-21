# Getting started with Claude Code on W-CONF

Written 2026-08-13, after TASK ZERO rev 2 and the review rotation.

---

## ⚠ THIS DOCUMENT IS A HISTORICAL RECORD. Re-checked 2026-09-01.

**It plans the first three sessions, all three of which ran, and it was written before anything was built.** Its session bodies are kept because they record what was asked and why — **do not follow them as instructions.**

**If you are starting a session now, go here instead:**

| you want | read |
|---|---|
| what is open, and each step's gate | [`docs/architecture/ARCHITECTURE-2026-08-18.md`](docs/architecture/ARCHITECTURE-2026-08-18.md) §5 and §6 — **revision 12, the authority** |
| what the project is and what runs | [`README.md`](README.md) |
| how to work in this repository | [`CLAUDE.md`](CLAUDE.md) |
| what may be claimed | [`CLAIMS.md`](CLAIMS.md) |
| the next piece of work | [`docs/NEXT-SESSION-PROMPT.md`](docs/NEXT-SESSION-PROMPT.md) |

**What has changed since this was written**, so that no sentence below is read as current:

- ~~*"Application logic cannot start: the architecture has not been designed, and ADR-0001 has not cleared review."*~~ **Both halves are false as of 2026-08-18.** `ADR-0001` is **`Accepted`** (`REVIEW-013c`) and the architecture document is at **revision 9**.
- **All eight of architecture §6's steps are done.** Step 5 was a gate and it **passed** on 2026-08-18; the other seven are built, and every one of them has been exercised against Devnet. There is a Rust signer, a receivables facility and a read-only web tier. Sessions 1–3's gap-closure work is finished.
- ~~*"Three of four cryptographic rulings are ruled and have never run."*~~ **All four have run.** The sigma nonces, `r`/`ρ`, keygen and the ed25519 signing nonce (B-16) are all implemented and exercised against Devnet.
- ⚠ **What remains open is NOT in this document.** `ADR-0003` has had its adversarial review (`REVIEW-036`, 2026-09-02) and its central claim was **ruled unsound and rewritten**; what is still open there is the **issuer route's disclosure boundary**, which is a ruling handed to the project owner (E-228, E-230), issue #10 is undischarged, `ADR-0002` is still `Proposed`, and nothing has ever run under loopback. The README's *What is open* section and architecture §5 are where those live.

⚠ **This correction exists because the same defect has now been recorded three times in this repository** — a status sentence at the top of the document a reader opens first, true when written and never re-checked — **E-204** and **E-222**, which is **two**. ⚠ **E-159 was cited here and is a different failure**: an onboarding disclosure that was false *when written*, not one that went stale. `REVIEW-034c` had already upheld *"E-159 cited for a claim it is not about"*, and the 2026-09-02 pass that corrected the COUNT re-added the wrong row rather than checking it. **Fixing a count is not checking a citation.** `CLAUDE.md` directs a new session here, so this file is precisely where that defect is most expensive.

---

**The original document follows below** — ⚠ **not unaltered, and it said so until 2026-09-02:** its stale application-logic sentence is struck in place and annotated, two lines down.

The purpose of the first three sessions is to close gaps, not to build the application. Every one of them is measurement, research or a throwaway spike — categories that carry **no review gate** and can start immediately. ~~Application logic cannot start: the architecture has not been designed, and ADR-0001 has not cleared review.~~ **(Struck 2026-09-01 — see the header above.)**

---

## Session 0 — setup, no Claude, ~45 minutes

**Do this yourself. Do not delegate it.**

1. **Create the repository private**, under `nandanito/`, with a working directory name. Do not choose the public name yet — Session 2 may change the domain.
2. **Drop in this scaffold**, then `make sync-personas` to populate `.claude/agents/`.
3. **Read `docs/task-zero/ADDENDUM-2026-08-16.md`** and download the Trail of Bits report into `docs/references/`. Fund an account *after* Session 1 identifies which network carries the amendment — the prerelease confidential faucet is dead.
4. **Run the `feature` RPC once by hand** — a raw websocket call from your terminal, not the script. Read the output. You need to know what an unmodified response looks like so you can recognise a wrong automated answer later. This is the single most valuable 10 minutes in the whole setup.
5. **Download by hand**, since both block automated fetching: IACR ePrint 2026/602, and `paper/cmpt-compact-sigma.pdf` from the mpt-crypto repository. Put them in `docs/references/`. GAP-2 and GAP-3 close here and nowhere else.

Session 1 cannot verify its own results without step 4, and ADR-0001 cannot be accepted without step 5.

---

## Session 1 — close the measurable gaps

**Persona: Protocol Researcher. No review gate — this is measurement code.**
**Stop condition: report and stop. Do not write application code.**

```
Read CLAUDE.md, CLAIMS.md, docs/task-zero/TASK-ZERO-2026-08-13.md and then
docs/task-zero/ADDENDUM-2026-08-16.md before starting. The addendum corrects the
main report in three places and you will get wrong answers without it.
Adopt docs/personas/protocol-researcher.md.

This session closes GAP-1 and GAP-6 and replaces two unusable numbers. It is
measurement work. Do not write application logic, do not design anything, and
do not touch docs/decisions/.

TASK 1 — GAP-1. Amendment state, and which network we build on.
Run tools/check-amendments.ts against mainnet, testnet and devnet.

The dedicated "Confidential Devnet" from the RippleX prerelease docs has a dead
faucet, and the canonical xrpl.org page names no dedicated network. The endpoint
has been deliberately removed from the script — do not re-add a guessed one, since
an unreachable host reported as a failure reads like a disabled amendment.

Answer, date-stamped: which network, if any, carries ConfidentialTransfer as
enabled or votable? If none of the three does, search for whether a dedicated
network still exists and report what you find rather than assuming one does.

Then report whether ConfidentialTransfer, PermissionedDomains AND SingleAssetVault
are all enabled on whichever network wins. All three are required — writing
sfDomainID to an MPTokenIssuance needs the latter two (TASK ZERO section 7, E-19).
If SingleAssetVault is missing, say so loudly: that removes the XLS-80 compliance
third of the project and changes the domain argument.

Write the JSON snapshot to docs/task-zero/amendments-<date>.json. Update
CLAIMS.md rows B-2 and B-3 with the reading and its date.

TASK 2 — GAP-6. Real proof sizes.
Clone XRPLF/mpt-crypto. Read include/ and find the actual values of
SECP256K1_COMPACT_STANDARD_PROOF_SIZE, SECP256K1_COMPACT_CONVERTBACK_PROOF_SIZE,
SECP256K1_COMPACT_CLAWBACK_PROOF_SIZE, kMPT_SINGLE_BULLETPROOF_SIZE,
kMPT_DOUBLE_BULLETPROOF_SIZE, kMPT_ELGAMAL_TOTAL_SIZE, kMPT_PUBKEY_SIZE.

Compare each against the specification's stated 192 / 754 / 688 / 64 / 66 / 33.
If they match, regrade E-3a and E-4 in CLAIMS.md from B to A and close GAP-6.
If any differs, that is a finding — record it in CLAIMS.md under F and tell me,
because every size in TASK ZERO section 3 and section 6 derives from it.

While you are in that source tree, settle the decryption bound. Trail of Bits
TOB-RIPCTX-1 reported that decryption brute-forces the discrete log up to
1,000,000 and that values above it are permanently unrecoverable. The fix
parameterised it as secp256k1_solve_dlp_small_range_ct(max_range), but the audit
notes the caller still passes a magic 1000000. Report the actual value passed at
the version rippled 3.3.0 pins, and confirm E-23 in CLAIMS.md.

Then answer the open question from the addendum: does MPT AssetScale move this
ceiling, or does the bound apply to the raw integer the ciphertext encodes
regardless of scale? This decides whether a facility can exceed 1,000,000 in
displayed denomination, and the domain design in TASK ZERO section 9 depends on
the answer.

TASK 3 — replace the unusable timings.
Build mpt-crypto per its README (CMake + Conan). Run the full test suite. Then
time test_bulletproof_agg and the three compact sigma tests, and record:
CPU model, clock, core count, OS, compiler and version, build flags, number of
runs, and the spread — not just the mean.

Write this to docs/task-zero/benchmarks-<date>.md and update CLAIMS.md B-1.
Standing prohibition P-8 applies to your own numbers exactly as it applies to
the specification's: no hardware and parameters, no publishable number.

If the build fails, that is a finding, not a failure. Record what broke and
where. mpt-crypto is at 0.4.0-rc4 with 33 open issues; a broken build on a
common platform is material to the whole project.

REPORT AT THE END
What runs, what does not, what you learned that was not in the documents, and
what should change in the plan as a result. That last item is the Compound step
and it is not optional. Then stop.
```

---

## Session 2 — the domain question

**Persona: Protocol Researcher. Research only.**
**Run this before the naming sweep. Its answer may change the domain, the name, and the roadmap.**

```
Adopt docs/personas/protocol-researcher.md. Read TASK ZERO section 9 first —
the domain argument, including the revision made after review.

QUESTION
LendingProtocol (XLS-66) is not merely Supported::Yes in rippled 3.3.0 — as of
2026-08-16 it is ENABLED on standard Devnet, alongside ConfidentialTransfer,
PermissionedDomains and SingleAssetVault (CLAIMS.md E-26). It has native Vault,
LoanBroker and Loan ledger objects. Before we build a receivables financing
facility as application logic on top of MPTs, establish whether XRPL already
models the facility natively.

Because all four amendments are live on the same network, question 2 below is
empirically testable and not only a source reading. Prefer the experiment where
one is cheap, but read the transactors either way.

Answer these, graded A-F, from XLS-0066 and the rippled 3.3.0 source:

1. What does the Loan / LoanBroker / Vault triple actually model? Drawdowns,
   repayments, interest, default? Read the transactors, not just the spec.
2. Can a vault share token, or any asset inside the lending protocol, be a
   confidential MPT? Look for whether the vault and loan transactors handle
   MPTs with lsfMPTCanHoldConfidentialBalance set, and whether anything rejects
   them. Note that MPTokenHelpers.cpp requireAuth already recurses into vault
   pseudo-accounts, which suggests the two features were built aware of each
   other — establish whether that extends to confidential balances.
3. Vault pseudo-accounts are exempted from some authorization checks. What does
   that do to the XLS-80 domain gating we depend on?
4. If the answer to 2 is yes, sketch what changes: the domain becomes
   "confidential positions in a native lending vault" rather than an
   application-layer facility. If no, that incompatibility is itself a finding
   worth writing up — say precisely what blocks it.

CONSTRAINT
Do not design the application. Answer the question, grade the findings, and
give me one direct recommendation with defense: build the facility as
application logic, or build on XLS-66. Say which and why.

5. If and only if you recommend XLS-66, address the two carry-forward items in
   section 9 under "Two things above must not be inherited silently if the
   domain moves" — the unreviewed cover-traffic argument (which rests on E-22,
   Grade C) and the balance-tracking requirement that replaced R-5's float cap.
   Do not port either conclusion across. Say what each becomes under a native
   vault, or say plainly that you could not determine it. In particular:
   if a vault pseudo-account holds the confidential balance, who tracks its
   expected value off-ledger so it can be decrypted, and can a pseudo-account
   do that at all? That question is open and is not obviously favourable.

   These do not block your investigation. They block acceptance of its
   recommendation, so an answer that ignores them is incomplete.

Write to docs/task-zero/XLS-66-INVESTIGATION-<date>.md and stop.
```

---

## Session 3 — the spike

⚠⚠ **HISTORICAL — a session brief written 2026-08-16, not a description of what was built.** It proposes paths the project then rejected or superseded: the WASM route (ADR-0001 ruled **Option 3**, a vendored C fork) and an unpublished `@xrplf/mpt-crypto` (it **is** published, E-53). **`README.md` is the current description; this section is the record of what was believed at the time** (`CLAIMS.md` E-239).

**Persona: Build Lead. Throwaway spike, no review gate.**
**Rewritten 2026-08-16 after Session 1.** The original prompt told you to patch `definitions.json` and framed proof generation as possibly the whole project. **Both are now dead work** — `ripple-binary-codec@2.9.0` ships the serialisation and mpt-crypto has a WASM build. The spike is much cheaper than planned, so it has been given a second objective worth 99 bytes.

Precondition met: `ConfidentialTransfer` is enabled on **standard Devnet** (E-26).

```
Adopt docs/personas/build-lead.md. Read TASK ZERO section 5 — including the
2026-08-16 correction at the top of it — and CLAIMS.md E-30, E-31, E-32 first.

GOAL
Get exactly one ConfidentialMPTConvert accepted by standard Devnet
(wss://s.devnet.rippletest.net:51233, network_id 2), by any means available.
That is the objective. Two measurements follow it, in priority order, and both
are gated on it working.

Ugly is fine. A C harness is fine. Shell scripts are fine. Do not build
anything you intend to keep.

Priority if time runs short: Convert accepted > E-22 falsification > Send size.
E-22 outranks the size question because section 9's recommendation and B-10
both rest on it, whereas the size conflict is 99 bytes and costs us only a
Grade B row until it is settled.

WHAT CHANGED — do not repeat the old plan
0. THE SUBMIT PATH IS PROVEN. Added 2026-08-16 by the XLS-66 investigation,
   which put 19 transactions on standard Devnet. Do not rediscover this:
     - Fund from POST https://faucet.devnet.rippletest.net/accounts. The seed
       comes back at the TOP level as `seed`, not at `account.secret`.
     - THEN POLL. account_info with ledger_index:"current" on a fresh faucet
       account returns a Sequence that yields tefPAST_SEQ on submit. Poll
       ledger_index:"validated" until account_data appears. This cost two
       failed submissions to work out (UPSTREAM-FEEDBACK U-26).
     - Sign WITHOUT xrpl.js: build the tx JSON, encodeForSigning() with
       ripple-binary-codec@2.9.0, sign with ripple-keypairs, encode(), then
       submit the tx_blob over a raw WebSocket. xrpl.js@5.0.0 bundles an older
       codec and will not serialise these types.
   ALL OF THAT IS ALREADY WRITTEN: tools/devnet-submit.ts. `bun install`, then
   `bun run tools/devnet-submit.ts` for a 15-second smoke test that funds an
   account and lands an AccountSet. It exports connect/rpc/faucet/submit/
   waitValidated/createdNode and refuses to run against any network_id but 2.
   It is spike scaffolding — rewrite it freely, but do not rediscover it.
   The remaining unknown in this spike is proof generation ALONE. If you are
   debugging serialisation or signing, you are off the path.
1. Serialisation is DONE UPSTREAM. Use ripple-binary-codec@2.9.0, which ships
   all five ConfidentialMPT types (85-89) and all 18 confidential fields; all
   18 codes were verified against our own table on 2026-08-16, 18/18. Do NOT
   patch definitions.json. Do still verify the codec against the node's
   server_definitions RPC — that is a cheap, real test and it either matches
   or it does not. Note xrpl.js latest is 5.0.0 and does not bundle 2.9.0 yet,
   so take the codec directly.
2. Proof generation is LARGELY DONE UPSTREAM. mpt-crypto has a WASM build at
   .github/scripts/build-wasm.sh exporting _mpt_get_convert_proof and the other
   three generators. ~~The npm package @xrplf/mpt-crypto is NOT published, so
   build from the repo's script.~~

   ⚠⚠ STRUCK 2026-09-04, AND THE WHOLE ITEM IS HISTORICAL — CLAIMS.md E-239.
   @xrplf/mpt-crypto@0.1.0 IS published (E-53). And the project did NOT take
   the WASM path: ADR-0001 ruled Option 3 on risk, so the signer links a
   VENDORED C FORK through signer/build.rs. There is no WebAssembly in the
   built artifact.

   ⚠ This mattered: a fresh reader given only the entry-point documents
   reported the pipeline as "Rust, C, and WebAssembly" and traced it here
   (REVIEW-039a). A reader's wrong inference is evidence about the text —
   CLAIMS.md E-222, and this is E-204's shape in the onboarding file every
   session is told to read first. If the WASM path fights you for more than an
   hour, fall back to calling the C library directly — test_pok_sk is the
   closest example for the 64-byte registration PoK. Report which path worked.
3. Everything else the ledger checks is unchanged: the issuance needs
   lsfMPTCanHoldConfidentialBalance, an IssuerEncryptionKey and a zero
   TransferFee, and keys can only be registered via MPTokenIssuanceSet — so the
   issuer needs a second transaction after creation. Create the issuance first.

SECOND OBJECTIVE — settle the transaction size, it is a live conflict
Our arithmetic says a ConfidentialMPTSend is 1276 bytes; cmpt-compact-sigma.pdf
Table 2 says 1177, because it treats C1 as shared across all four ciphertexts
and transmitted once on-chain. The difference is exactly 99 bytes. CLAIMS.md
E-4 is Grade B and blocked on this.

Measure it. Serialise a real Send (or read one back off the ledger) and report
the actual byte length and whether each encrypted-amount field carries a full
66-byte ElGamal pair or a bare 33-byte C2. Resolve E-4 against the wire, not
against either document.

THIRD OBJECTIVE — try to FALSIFY E-22. Gated; read the cost note first.
E-22 claims a zero-amount ConfidentialMPTSend is (a) valid and (b)
indistinguishable from a non-zero send. It is Grade C, inferred, never tested.
It is load-bearing: it is the whole basis of section 9's cover-traffic
recommendation, and B-10 depends on it explicitly.

You cannot prove indistinguishability. You CAN falsify it, and that is the job.
Any single observable difference kills it. Check at least:

1. Validity. Does a zero-amount Send get accepted at all? If it fails, E-22(a)
   is dead and section 9's recommendation collapses immediately — stop and
   report that, it is the most valuable outcome available here.
2. Randomisation. Submit TWO zero-amount Sends from the same account. If the
   ciphertexts are byte-identical, they are canonical rather than randomised
   and E-22(b) is dead. This is the sharpest single test; do it first.
3. The F-1 distinguisher. Recompute canonical EncZero for each participant
   from the public inputs and byte-compare against the zero-Send ciphertexts.
   They must NOT match. If they do, zero sends are publicly identifiable.
4. Side-by-side against a NON-zero Send. Compare: serialised blob length, fee
   charged, result code, metadata shape (how many AffectedNodes, which fields
   changed), and whether the version counter moves identically. Any asymmetry
   is a distinguisher.

Report every difference you find, including ones you think are benign. A
difference you cannot explain is a finding, not a rounding error.

FOURTH OBJECTIVE — closes GAP-9. Only if the first three are done.
Added 2026-08-16. Two transactions on top of a working Convert, and it is the
one experiment that turns the XLS-66 finding from A-by-reading into
A-by-execution on the point that matters. Take an MPToken that carries a REAL
confidential balance, deposit its holder's PUBLIC balance into an XLS-65 vault
over the same issuance, and report what happens to each. Prediction on record:
the public portion deposits normally, the confidential portion is stranded, and
no error is raised at any point. Any deviation is a finding — report it and do
NOT reconcile it against the prediction.

COST NOTE, so this is not mistaken for free
This objective needs strictly more than the Convert goal: two accounts opted in
and key-registered, a funded confidential balance on the sender, and Send proof
generation (192 B sigma + 754 B aggregated Bulletproof) rather than the 64 B
registration PoK. Attempt it only once the Convert path works. If you run out
of road, say so and report how far you got — a named gap is a correct output
here and inventing a partial answer is not.

On keys: use mpt-crypto's own mpt_generate_keypair for throwaway devnet keys.
Note that the WASM build deliberately does NOT export it, since upstream's TS
wrapper sources ElGamal keys from ripple-keypairs — so this may push you to the
C path for this objective. Do NOT implement ADR-0001 section (e)'s master-seed
derivation scheme; it is unreviewed and that prohibition stands.

OBSERVATION TASK — how does mpt-crypto generate its sigma-proof nonces?
Added 2026-08-17 after REVIEW-003. Cheap, and nobody has looked.

You will be calling mpt-crypto's proof generators, so you are the first person
on this project positioned to read what they actually do about nonces. Read it
and report. Do not design anything.

Why it matters: ADR-0001 rev 4 now carries an UNANSWERED CRITICAL finding —
section (e)'s nonce construction is a one-line HKDF sketch that is not
implementable as written, with no salt/info, no domain label, no canonical
encodings, no length framing, no expansion into the five scalars, no scalar
mapping. Nonce reuse leaks sk_A and the compact form makes it invisible (E-34).
The Cryptography Reviewer's task grew from "approve a sketch" to "produce a
byte-exact construction", and upstream's own choices are the best available
input to that.

Report, as observation only:
1. Deterministic or RNG-sourced? If deterministic, over what inputs?
2. Can a caller influence the nonce through any exported entry point — an
   argument, a global seed, an RNG hook?
3. What does the WASM build do differently, if anything? A browser RNG is a
   different trust story from a native one.
4. Is there any test asserting distinct nonces across distinct statements?

This is READING, not writing. Do not implement a nonce scheme, do not "fix"
anything you find, and do not write signer code — that is blocked until the
Cryptography Reviewer produces the byte-exact construction. If what you find
looks wrong, that is a finding for UPSTREAM-FEEDBACK under Observed, and it
does not move out of Observed in this session.

REPORT
What worked, what the actual blocking step was, and how long each part took.
Whether the upstream WASM path works end-to-end — that is the least-confident
claim from Session 1 and this is what tests it. The measured Send size and what
it does to E-4. What you found on E-22, stated as either "falsified, here is
the distinguisher" or "survived these four checks" — never as "confirmed",
since four passing checks are not a proof of indistinguishability. Then an
honest estimate of the effort remaining to a real client path, and whether the
eight-week budget survives it.

Update CLAIMS.md in the same commit: E-4 on the size, E-22 and B-10 on the
zero-send result. If E-22 is falsified, section 9's cover-traffic
recommendation falls with it — say so plainly and do NOT attempt to repair the
argument. Repairing it is a design act and this session has no mandate for one.

Do not generalise the spike into a library. Do not start the application.
Do not write ElGamal keygen — ADR-0001 section (e) is unreviewed.
Report and stop.
```

---

## What comes after

Nothing until the three sessions above are done and reported. Specifically, **do not start the architecture document** until:

- ~~GAP-1 is closed and all three required amendments are confirmed (Session 1)~~ **DONE 2026-08-16.** All three enabled on standard Devnet
- ~~GAP-3 is closed and ADR-0001's central premise is confirmed (Session 0 step 5)~~ **DONE 2026-08-16.** Premise confirmed, with a qualification now recorded in ADR-0001 §(a)
- ~~**The domain question is settled (Session 2)**~~ **DONE 2026-08-16.** XLS-66 cannot carry confidential balances and publishes every loan value; the domain does not move. `XLS-66-INVESTIGATION-2026-08-16.md`, recorded as **ADR-0002** (`Proposed`, reviewed by nobody)
- ~~**ADR-0001 §(d), §(e) and its process boundary — and now ADR-0002 — have cleared a second review rotation, and the Cryptography Reviewer has ruled** — outstanding.~~ **DONE 2026-08-18 for ADR-0001. `ADR-0001 IS ACCEPTED`** (`REVIEW-013c`). Five rotations: REVIEW-003 (§(d), §(e), the boundary), REVIEW-005 (sigma nonces), REVIEW-010 (`r`/`ρ`), REVIEW-012 (keygen), REVIEW-013 (the Option 2 re-weigh, and the `r`/`ρ` store amendments). **ADR-0002 is still `Proposed` and still reviewed by nobody** — do not read ADR-0001's acceptance as covering it

**All four cleared.** *(Updated 2026-08-18: the last one was the review rotation, and it ran. `ADR-0001` is `Accepted`; the architecture document exists and is at revision 2.)* GAP-2 remains open but is W-PQ's dependency, not W-CONF's.

~~The six blocking items from REVIEW-002 are addressed in these documents, but four of the fixes are arguments no reviewer has seen. They enter as `Proposed`.~~ **No argument in ADR-0001 is unreviewed as of 2026-08-18.** ADR-0002 is the one that still is.

> **What `Accepted` does and does not open.** It unblocks architecture §6 step 7 — the facility as application logic. It does **not** open step 4 (`r`/`ρ`: build against amendments **A4–A9**, not A1–A3, which a rotation ruled not buildable) or step 6 (keygen: issues #10 and #11 are open). **Three of four cryptographic rulings are ruled and have never run.** `docs/architecture/ARCHITECTURE-2026-08-18.md` §5 is the authority.

## Session hygiene

- **Checkpoint model.** Orient → do the scoped work → stop and report. Autonomy expands with demonstrated reliability, not elapsed sessions.
- **`make sync-personas`** whenever `docs/personas/` changes, or `.claude/agents/` drifts.
- **Every session that produces a claim updates `CLAIMS.md`** in the same commit. A claim without a register row is a claim that will end up in a README unchecked.
- **`/claims-check`** before anything leaves the repository.
- **`/feedback-capture`** the moment something upstream surprises you — a wrong doc, a missing binding, an unhelpful error code. It lands in `Observed` ungraded. Nothing is promoted or filed from a coding session.
- **Devnet only**, in every session, without exception.