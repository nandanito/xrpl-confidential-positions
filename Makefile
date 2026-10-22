.PHONY: ci check-vocabulary install-push-guard check-push-guard inventory-third-party check-inventory-fresh check-no-secrets check-no-secrets-shapes break-no-secrets-gate break-no-secrets-gate-self-test check-emphasis break-emphasis-gate break-emphasis-gate-self-test sync-personas check-amendments check-tables rebuild-env vendor-verify vendor-build signer signer-test check-test-support check-zeroize-bounds signer-test-devnet ledger-read signer-run signer-release xrpl-vectors step3 step3-clean facility-test typecheck check-loopback check-blinding check-personas check-web-readonly check-filing node-start node-wait node-status facility web-api web-app check-negative-claims check-claims-index check-claims-topics check-disclosure-phrases check-claims-revisions break-zeroize-lock hosted-build check-web-hosted hosted-browser-check

# Part C delta: .claude/agents/ is generated from docs/personas/.
# Regenerate whenever a persona changes or the two will drift.
# ⚠ `make check-personas` is what tells you that you forgot — the convention had
# this target and no check until REVIEW-023 round two, and the 27→28 correction
# of 2026-08-25 drifted straight through the gap.
sync-personas:
	@cp docs/personas/build-lead.md .claude/agents/build-lead.md
	@cp docs/personas/protocol-researcher.md .claude/agents/protocol-researcher.md
	@cp docs/personas/crypto-reviewer.md .claude/agents/crypto-reviewer.md
	@echo "synced 3 personas to .claude/agents/"

check-amendments:
	@bun run tools/check-amendments.ts

# --- the vendored prover ----------------------------------------------------
# The signer links a PATCHED mpt-crypto at 85dbac7 (tag 1.0.4) — issue #2's
# path A. It does not build without it, deliberately: architecture §6 step 3
# put proof generation in this binary.

# /tmp/wconf does not survive a /tmp clean, and the signer does not build
# without it. One command, idempotent, ~60s. CLAIMS.md E-97.
rebuild-env:
	@tools/rebuild-env.sh

vendor-verify:
	@tools/spike-2026-08-18/vendor-verify.sh /tmp/wconf/mpt-crypto

vendor-build:
	@tools/spike-2026-08-18/build.sh

# The holder signer is a separate Rust binary, not part of the web tree.
# ADR-0001 §(a): a browser page cannot invoke a local process.
signer:
	@cd signer && cargo build

# Includes:
#   - architecture §6 step 1's falsifier — the confirmation must render fields
#     parsed from the transaction the signer built, never client strings;
#   - architecture §6 step 2's falsifiers — the transaction carries what the
#     ledger said, and a stale read is DETECTED rather than merely bounded;
#   - architecture §6 step 3's falsifier — the PRISTINE upstream verifier must
#     accept a proof this signer produced;
#   - the wiring tests: store and randomness on the signing path.
#
# ⚠ Run it more than once before believing it. CLAIMS.md E-98.
signer-test:
	@cd signer && cargo test

# The live half of step 2. `#[ignore]`d rather than skipped, so it is counted
# and printed on every ordinary run instead of reporting `ok` for nothing.
# tests/ledger_read.rs drives a fake whose JSON was transcribed from a live
# node; this is what says the transcription is honest. Devnet only.
signer-test-devnet:
	@cd signer && cargo test --test ledger_devnet -- --ignored --nocapture

# Print the snapshot the signer would build against. Takes no secret, so it
# cannot decrypt the balance — it shows what a full-ledger observer sees.
#   make ledger-read ACCOUNT=r... ISSUANCE=<48 hex>
ledger-read:
	@cd signer && cargo run --quiet --bin ledger-read -- $(ACCOUNT) $(ISSUANCE)

signer-run:
	@cd signer && cargo run

# ⚠ **This comment used to claim a verification this recipe does not perform.**
# It said the exclusion was *"verified by compiling a release binary that
# references them and watching it fail to resolve"*, above a bare
# `cargo build --release` that references nothing. That is REVIEW-014's own shape
# — a claim about what a build excludes, with no build that tries to include it —
# surviving in the target named after the fix. Corrected 2026-08-27.
#
# What this target establishes: the signer compiles in release. Nothing more.
# **`make check-test-support` is what establishes the exclusion**, by compiling a
# throwaway crate PER PROBE, both with the feature and without it, plus a
# negative control that must compile either way.
#
# ⚠ Over a NAMED SET of probes, not over the crate's whole public surface — a
# test-only entry point added later and not listed there is invisible to it. This
# comment said "every gated symbol" for one commit, which is the same shape as
# the sentence above it. REVIEW-025, Gemini leg.
signer-release:
	@cd signer && cargo build --release

# CLAIMS.md B-20 / REVIEW-024 section 7 item 3: the test-only signing arm, the
# hedge selector and the caller-supplied auxiliary entropy must be unreachable
# from an ordinary build. Runs each probe BOTH ways in its own crate, so a
# malformed probe reports VOID rather than passing.
#
# ⚠ Its first form put every probe in ONE file and matched the compiler's output
# against each symbol name — which matches the ECHOED SOURCE LINE, so any symbol
# sharing a line with a failing one was reported "gated". A control entry naming
# `0u8` passed. Both REVIEW-025 external legs found it; the control demonstrated
# it. CLAIMS.md E-141: a gate that reports a number is making a claim about what
# the number counts.
check-test-support:
	@bun run tools/check-test-support-gate.ts

# ⚠ **This gate found that B-19's own claim was FALSE (CLAIMS.md E-171).**
# E-167 said `ed25519-dalek`'s `zeroize` feature *"was OFF, by accident, for nine
# days"* and the decision said reverting the manifest line *"fails to COMPILE"*.
# Neither is true: `std` implies `alloc`, and `alloc` lists `"zeroize/alloc"`
# without the `?` sigil, so the historical line already resolved to
# `alloc,std,zeroize`. Three REVIEW-025 legs and a REVIEW-026 round accepted the
# claim, because reading a manifest is not running one.
#
# Part 1 probes the feature in a scratch crate; part 2 reverts each of the
# signer's secret locals to a bare array and requires the build to break. Both
# parts carry a control in the OPPOSITE direction — an empty feature set that
# must fail, a comment edit that must still build — because a gate without one
# is the false pass it exists to catch (E-165, E-168).
#
# ⚠ **Part 3 and part 4 were added by REVIEW-027/028** — part 3 because both
# external legs found parts 1-2 blind to whether `sign_with_aux` still CALLS
# the wiping helper (E-173), part 4 because the count of corrected false-claim
# sites was asserted and wrong FOUR TIMES (E-172, E-175). A count in prose is a
# claim with no falsifier; part 4 is the falsifier.
#
# ⚠ It says these types wipe on drop. It does NOT say the secret is
# unrecoverable; see `signer/src/xrpl.rs::sha512_zeroizing` and P-5.
#
# ⚠⚠ **IT REWRITES TRACKED FILES IN signer/ WHILE IT RUNS.** Part 2 reverts a
# secret-wiping local and requires the build to break, so the mutation is the
# mechanism. Do NOT stage, commit, or trust `git status` until it ends - E-257
# records an `M signer/src/xrpl.rs` seen one command before a commit. The tree is
# restored from file copies taken at start-up, not by `git checkout`, so
# uncommitted edits survive. ⚠ A concurrent second run is REFUSED: its backup
# would capture this run's mutations and restore them permanently (E-269).
#
# ⚠ Budget ≥20 minutes if a default-feature `cargo test` ran first - this builds
# `--all-features` and the two evict each other from signer/target. Measured
# 2026-09-11: ~2 minutes warm, 28 minutes cold.
check-zeroize-bounds:
	@python3 tools/check-zeroize-bounds.py

# ⚠ The FALSIFIER for that gate's concurrency lock. Ordinary runs never contend,
# so without this, deleting the flock leaves every check green while reopening
# the source-corruption race. Asserts the second run refuses BEFORE taking its
# backups — the exit code alone would not show that.
break-zeroize-lock:
	@bash tools/break-zeroize-lock.sh

# Regenerating these BLESSES whatever the encoder currently does. Run without
# --write to check for drift; that is what CI-shaped use wants.
xrpl-vectors:
	@bun tools/spike-step3-2026-08-18/xrpl-vectors.ts

# --- Devnet. Never mainnet, at any phase. -----------------------------------
step3:
	@bun tools/spike-step3-2026-08-18/devnet-signer-send.ts

step3-clean:
	@bun tools/spike-step3-2026-08-18/devnet-clean-account.ts

# --- the facility — architecture §6 step 7 ------------------------------------
# ⚠ BUILT AND EXECUTED 2026-08-25 — 28 validated facility transactions — but
# NOT under B-15's step-7 conditions: the ledger source was remote under the
# owner's amendment (CLAIMS.md E-151), because loopback proved unpayable on the
# available hardware (E-148). tapFailHard was in force; loopback was not.
# `facility/README.md` says what that does and does not establish, and B-18 is
# what remains open.
#
# ⚠ A loopback run is still what the ruling asks for. `make node-start node-wait`
# then `make facility`; a remote run additionally needs the acceptance sentence
# in WCONF_ACCEPT_REMOTE_LEDGER_RISK and says so in its own output.

facility-test:
	@bun test facility tools

# ⚠ `bun build` is NOT a type-check — CLAIMS.md E-145. This is.
typecheck:
	@bunx tsc --noEmit

check-loopback:
	@bun run tools/check-loopback.ts

check-blinding:
	@bun run tools/check-blinding-sources.ts

# ⚠ UPSTREAM-FEEDBACK.md is built almost entirely out of "the source does not
# say X". Three graded rows failed exactly that way on 2026-08-26 (E-155,
# E-156), one of them a POSITIVE quoting a sentence the spec has never
# contained. This fails if a graded or filed row asserts a negative without
# carrying the search that would falsify it. Observed rows are advisory —
# CLAUDE.md requires those to be ungraded captures.
check-negative-claims:
	@bun run tools/check-negative-claims.ts

# ⚠ A row that loses a cell renders as a SHORT ROW, not as an error. It has
# happened twice: E-148 truncated a row mid-cell during a correction and it
# survived five commits, and seven Findings rows carried no Grade cell at all
# (E-162). Both were found by a one-off sweep; this is that sweep, committed,
# because a sweep recorded in prose is a claim with no falsifier.
check-tables:
	@bun run tools/check-table-integrity.ts

# ⚠ .claude/agents/ is GENERATED. This fails if it has drifted from
# docs/personas/, which is what the 27→28 correction did. `make sync-personas`
# is the fix.
check-personas:
	@bun run tools/check-personas.ts

# --- architecture §6 step 8, the web tier ------------------------------------
# ⚠ **THE LOAD-BEARING ARTIFACT OF STEP 8.** ADR-0003 D1 makes the web tier
# read-only, and D3 records why that needs a gate rather than a convention:
# TanStack Start's server functions make "call server code from a component" one
# line, and one line is the whole distance between this design and the one
# REVIEW-003b killed.
#
# Six parts: nothing under web/app reaches the signer socket; the Elysia
# process builds `Status` and never `Pair` or `Prepare`; no route, loader or
# server function reaches a signing operation; the tier holds no secret and
# decrypts nothing (E-212); exactly ONE socket client exists in the tier; and
# every bind resolves to a loopback literal (E-227). This comment said "Five"
# and listed four until 2026-09-02 (E-234).
#
# ⚠ It refuses to run over an EMPTY web/app — deleting the UI must not be a way
# to pass. That hole was in its first version and was found by reading its own
# output (CLAIMS.md E-142's narrowing, E-190's precedent).
#
# ⚠ **Two passes, because the needle classes have opposite polarity** (E-207):
# socket paths ARE string literals, so that pass preserves them; signing helpers
# are identifiers, so that pass blanks literals and prose naming another
# project's API is not a violation of ours. Every control runs through the same
# detector the real check calls, and the count is incremented by the helper that
# runs them (E-203).
#
# ⚠ It is LEXICAL, over a NAMED SET, and it prints what it does not check.
check-web-readonly:
	@bun run tools/check-web-readonly.ts

# The CLAIMS index is GENERATED, never hand-maintained — a hand-written index of
# 300+ rows would be stale within a week (CLAIMS.md E-199, E-236). This fails if
# docs/CLAIMS-INDEX.md drifts from CLAIMS.md.
check-claims-index:
	@bun run tools/build-claims-index.ts --check

# The REVISION LOG is derived from git, because the hand-written Revision history
# in CLAIMS.md stopped being given content on 2026-08-25 and the register did not
# stop growing (E-249). This does NOT reconstruct the narrative — that judgement
# is not derivable and stays hand-written. It answers when each row entered the
# register, and it FAILS if a row ever disappears from an append-only file.
check-claims-revisions:
	@bun run tools/build-claims-revisions.ts --check

# The TOPIC VIEWS are generated too, and for a reason worth keeping in view: the
# register is chronological, so "what has this project learned about gates?" has
# no answer in it. These group the rows by subject WITHOUT moving them.
#
# ⚠ About HALF the rows carry more than one topic, so a physical split would file
# such a row under one subject and hide it from readers of the rest. A row here
# appears under every topic it carries.
#
# ⚠⚠ This comment said "only ~20% ... and 93 of 245" until REVIEW-041. That came
# from an exploratory instrument that was then replaced, and three different
# figures were published for the same measurement before anyone noticed the
# predicate was never stated. The generator PRINTS the distribution; do not
# restate it here.
#
# ⚠ It FAILS when a row matches no topic, when an override names a row the
# register no longer contains or a topic that no longer exists, and when a topic
# file is orphaned by a removed topic. Completeness is the property; byte
# comparison is only how staleness is detected.
check-claims-topics:
	@bun run tools/build-claims-topics.ts --check

# --- emphasis discipline -------------------------------------------------------
# ⚠ `docs/EMPHASIS-DISCIPLINE.md` was specified 2026-09-09 and enforced by
# nothing. Six rules in a document is the shape this project has recorded
# failing repeatedly — CLAIMS.md E-224: *advice is what kept failing*.
#
# ⚠⚠ **ENFORCED FORWARD, FROM A CUTOFF ROW ID THE GATE PRINTS.** History is left
# as written, because reformatting 955 historical marks would destroy the
# measurement the rule was argued from. The grandfathered violations are COUNTED
# and printed instead, so the drift stays visible without being edited.
#
# ⚠ It REFUSES to pass while zero id-bearing rows sit at or after the cutoff.
# Moving the cutoff forward cannot be a way to switch it off (E-142, E-190).
#
# ⚠ Rules 1, 3, 4 and 5 are enforced per row; rule 6 covers narrative paragraphs
# in CLAIMS.md (with one recorded exemption) and CLAUDE.md (as a ratchet).
# **Rule 2 — a `⚠` means a retraction, not "important" — is NOT machine-checkable
# and is NOT checked.** The gate prints that, and five other residuals, every run.
check-emphasis:
	@bun run tools/check-emphasis.ts

# ⚠ The mutations that VERIFY the gate above, committed rather than described.
# Fifteen probes: every rule must fail, history must still pass, and neutering
# the detector must be caught by the controls at exit 2 rather than exit 1.
# Refuses to run on a dirty tree. CLAIMS.md E-251, E-253.
break-emphasis-gate:
	@tools/break-emphasis-gate.sh

# ⚠ Verifies the HARNESS. Three deliberately broken probes that must be rejected
# and one correct probe that must tick — the last so that a harness failing
# everything cannot score full marks. Committed because running it is how the
# needle check's own false pass was found (CLAIMS.md E-260).
break-emphasis-gate-self-test:
	@tools/break-emphasis-gate.sh --self-test

# The read-only API. ⚠ The only process in the tier that may open the signer
# socket, and `Request::Status` is the only request it may build.
web-api:
	@bun run web/api/server.ts

# The browser application. ⚠ Talks to web-api over HTTP and to nothing else.
# Run `make web-api` first.
web-app:
	@cd web/app && bunx vite dev

# --- upstream filing discipline -----------------------------------------------
# ⚠ `docs/UPSTREAM-FILING-PROTOCOL.md`, ruled 2026-09-01 after auditing the
# 2026-08-26 round: an adversarial review run AFTER submission found 13 defects,
# six graded "would embarrass", and four of five issues needed same-day public
# corrections. The 2026-09-01 audit found every claim still stands at upstream
# HEAD — so the research was sound and the ORDER OF OPERATIONS was the defect.
#
#   make check-filing FILE=docs/upstream-filings/<date>/NN-name.md
#
# Five checks: a prose word cap the gate prints, a defect stated in the opening, no
# unsearched negative claim, something that actually needs doing, and no project
# shorthand or internal register reference travelling outward.
#
# ⚠ It is LEXICAL and CANNOT tell whether a claim is true — every defect in the
# 2026-08-26 round was a false or overstated claim, and not one would have been
# caught by counting words. The protocol's rule 1 (adversarial review BEFORE
# filing) is the instrument for that; this gate only stops shapes that have
# already gone wrong twice.
#
# ⚠ `docs/upstream-filings/TEMPLATE.md` is the POSITIVE CONTROL: it must PASS.
# If it starts failing, the gate has drifted and the defect is in the gate.
# ⚠ No LIVE file may assert a retracted DISCLOSURE.
#
# ⚠⚠ Built 2026-09-02 because across FOUR review rounds the dominant defect was
# one shape: a correction reaching the instance someone was looking at, and not
# the PHRASE. "It hides AMOUNTS. It hides nothing else" survived at SIX sites
# after being fixed once — and CLAIMS.md E-136 had already corrected exactly
# that claim, at one site, weeks earlier. CLAUDE.md carries three clauses of
# advice about grepping the phrase; all three are advice, and advice is what
# kept failing (E-224).
#
# Sibling of check-zeroize-bounds part 4, for disclosures. Verified by breaking
# it three ways: reinstating a retracted sentence FAILS; emptying the phrase
# list REFUSES rather than passing; neutering the detector is caught by its own
# controls, which run through the same function the real check calls.
check-disclosure-phrases:
	@bun run tools/check-disclosure-phrases.ts

check-filing:
	@bun run tools/check-filing.ts $(FILE)

# Everything that runs WITHOUT the vendored build: the type check, the TypeScript
# suites (five signer-starting tests reported as skip), every repository gate that
# needs no argument, the secret sweep's shape classes, and check-filing on the
# template. GitHub Actions runs exactly this. ⚠ It prints what it does NOT run:
# cargo test and the three signer-compiling gates are local-only.
ci:
	@tools/ci.sh

# `tapFailHard` is this project's shorthand and appears zero times in rippled
# (docs/VOCABULARY.md, E-156). This fails if a READER-FACING document uses it as a
# name: a line passes only if it also names `fail_hard` or `TapFailHard`, or calls
# it shorthand. The records (CLAIMS.md, docs/reviews/, docs/decisions/, ...) keep
# their wording by ruling and are not read; it prints its scope every run.
check-vocabulary:
	@bun run tools/check-vocabulary.ts

# --- phase 1, the push guard (decision request D4) ------------------------------
# Installs tools/git-hooks/pre-push in THIS clone: a push carrying the private
# history may go only to the private archive, by GitHub repository id. Run it in
# every private clone. check-push-guard breaks the hook every way it knows.
install-push-guard:
	@bash tools/install-push-guard.sh

check-push-guard:
	@bash tools/check-push-guard.sh

# --- phase 1, the third-party inventory (decision request D3) ---------------------
# Rebuilds docs/third-party/INVENTORY.md and fails if NOTICE omits a project it
# finds. Needs network for the GitHub corpora; not in make ci.
inventory-third-party:
	@bun run tools/inventory-third-party.ts --check

# Fails if the committed inventory is not what this tree produces. Only a public
# update regenerated it, so the archive's copy drifted unnoticed for one review
# (E-349). Run it in the archive after a register change and before a public
# update. It compares with HEAD, so a staged copy does not pass, and on a FAIL
# it leaves the regenerated file in the tree to commit.
check-inventory-fresh: inventory-third-party
	@git diff --quiet HEAD -- docs/third-party/INVENTORY.md || { git diff --stat HEAD -- docs/third-party/INVENTORY.md; echo "check-inventory-fresh: FAIL — the committed inventory is stale; review and commit the regenerated file"; exit 1; }
	@echo "check-inventory-fresh: PASS — the committed inventory is what this tree produces"

# --- phase 1, the secret sweep --------------------------------------------------
# ⚠⚠ **THE GATE ON PUBLICATION** (`docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md` phase 1):
# no seed, ElGamal secret, credential, secret-store file, home path, per-user temp
# path or personal email in what `git add -A` would commit, and no secret anywhere
# in history. Personal data in history is REPORTED, not failed, because history
# is squashed at publication (E-309).
#
# ⚠ **It REFUSES without the local secret store**, because an unlabelled ElGamal
# secret is a bare 64-hex string and only an exact-value search can find one.
# `check-no-secrets-shapes` runs without it for CI and says so in its verdict
# word; that run is NOT the phase 1 gate.
#
# Its controls build a throwaway repository with planted secrets and run the same
# scanRepo() over it every time. `break-no-secrets-gate` mutates the detector
# and requires the controls to catch each mutation. For one exact tree:
#   bun run tools/check-no-secrets.ts --repo <clone> --rev <commit>
check-no-secrets:
	@bun run tools/check-no-secrets.ts

check-no-secrets-shapes:
	@bun run tools/check-no-secrets.ts --no-local-store

break-no-secrets-gate:
	@bun run tools/break-no-secrets-gate.ts

# Verifies the HARNESS: three broken probes it must reject, one it must accept.
break-no-secrets-gate-self-test:
	@bun run tools/break-no-secrets-gate.ts --self-test

# Our own rippled 3.3.0, syncing Devnet. The facility refuses anything else.
node-start:
	@tools/loopback-node/node.sh start

node-wait:
	@tools/loopback-node/node.sh wait

node-status:
	@tools/loopback-node/node.sh status

# ⚠ Refuses to start unless the node above reports `full`.
facility:
	@bun run facility/run-facility.ts --auto-confirm

# --- architecture §6 step 9, the hosted demo (ADR-0004) -------------------------
# The release procedure, in order: build in the isolated container from a COMMIT,
# gate the output (needs the local secret store), then load it in a headless
# browser under its own policy. OUT must be outside the repository.
#   make hosted-build REPO=<git repo> COMMIT=<sha> URL=https://<name>.vercel.app OUT=<dir>
#   make check-web-hosted OUT=<dir> COMMIT=<sha>
#   make hosted-browser-check OUT=<dir>
hosted-build:
	@test -n "$(REPO)" -a -n "$(COMMIT)" -a -n "$(URL)" -a -n "$(OUT)" || { echo "usage: make hosted-build REPO=<git repo> COMMIT=<sha> URL=<https origin> OUT=<dir>"; exit 2; }
	@bun run web/hosted/build.ts --repo "$(REPO)" --commit "$(COMMIT)" --canonical-url "$(URL)" --out "$(OUT)"

check-web-hosted:
	@test -n "$(OUT)" -a -n "$(COMMIT)" || { echo "usage: make check-web-hosted OUT=<dir> COMMIT=<sha>"; exit 2; }
	@bun run tools/check-web-readonly.ts --hosted "$(OUT)" --commit "$(COMMIT)"

hosted-browser-check:
	@test -n "$(OUT)" || { echo "usage: make hosted-browser-check OUT=<dir>"; exit 2; }
	@bun run web/hosted/browser-check.ts "$(OUT)"
