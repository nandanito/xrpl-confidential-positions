# The facility — architecture §6 step 7

⚠ **This document said `tapFailHard` until 2026-10-18, which is THIS PROJECT'S SHORTHAND and appears zero times in rippled.** It now uses the real names: `fail_hard`, the submission parameter a client sets, and `TapFailHard`, rippled's internal apply flag. See [`docs/VOCABULARY.md`](../docs/VOCABULARY.md). The code always used the real one.

**The receivables financing facility, as application logic on XLS-0096
Confidential MPTs.** ADR-0002. TASK ZERO §9.
`docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md` is the end-to-end account of
what it does and does not hide, and it is the document to read first.

> ## ⚠ EXECUTED — but NOT under B-15's step-7 conditions
>
> **28 validated facility transactions on Devnet, 2026-08-25.** ⚠ **That number
> counts the facility's own movements** — authorize, Payment, Convert, Send,
> MergeInbox, ConvertBack. **31** counts everything this program submitted and
> the ledger applied, adding the two issuance-setup transactions and the
> fail-hard control's unflagged arm. Issuance
> `0048BEC27991E04E26DA60230B894B7C12E51E7FBC0A537E`. Every party's decrypted
> `ConfidentialBalanceSpending` equals the book's prediction, and the issuance's
> **plaintext** `ConfidentialOutstandingAmount` of 2030 is exactly the sum of the
> three hidden positions. `fail_hard` executed in both arms.
>
> ⚠ **The ledger source was REMOTE.** The project owner amended B-15's step-7
> answer on 2026-08-25 (`CLAIMS.md` **E-151**) after Option A turned out not to
> be payable on this hardware (**E-148**). So `fail_hard` — the half that
> removes the *consequence* of a wrong read **at the ledger**, and ⚠ **not at the
> node the blob was submitted to** (**F-28**) — was set on every facility
> movement; **loopback, the half that removes the *risk*, was not.** Every run record carries
> `underB15Conditions`, and this run's says `false`.
>
> **Nothing here is evidence about the loopback obligation**, and `CLAIMS.md`
> F-23 is unchanged and executed.
>
> **Devnet only.** Never mainnet, at any phase, for any reason. Nothing here is
> secure, audited, non-custodial or production-ready (`CLAIMS.md` P-5), and
> nothing should ever hold value.

⚠ **"Dedicated Account", never "vault".** An XLS-65 `Vault` is a different
ledger object, its share token *cannot* be confidential, its pseudo-account
*cannot* sign a `ConfidentialMPTConvert`, and the word has already nearly
derailed one reading of this design.

```
tools/rebuild-env.sh                   # the vendored prover
cd signer && cargo build && cd ..      # the signer binary
tools/loopback-node/node.sh start      # OUR OWN rippled 3.3.0, syncing Devnet
tools/loopback-node/node.sh wait       # until it reports `full` — not before

bun test facility tools                # the unit tests
bun tools/check-loopback.ts            # the gate on B-15's obligation
bun tools/check-blinding-sources.ts    # the gate on the ruled r/rho derivation
bun tools/check-personas.ts            # .claude/agents/ is GENERATED — this says so
bunx tsc --noEmit                      # a REAL type-check (E-145: `bun build` is not one)
bun facility/run-facility.ts --auto-confirm
```

## What B-15's step-7 ruling obliges, and how each half is kept

Ruled 2026-08-25 by the project owner: **loopback for the facility's ledger
reads, and `fail_hard` set by whatever submits — which is not the signer.**
Neither is enforced by the signer, so both are obligations on this code.

| Obligation | How it is kept | What that is worth |
|---|---|---|
| Every ledger read goes to loopback | `LoopbackLedger.open()` refuses a non-loopback endpoint at runtime — ⚠ **unless `WCONF_ACCEPT_REMOTE_LEDGER_RISK` holds the acceptance sentence**, which is E-151's amendment and is how the executed run happened; `tools/check-loopback.ts` refuses one in the source, and does not see the hatch because the hatch is an environment variable | **This is the half that removes the risk.** F-23 is executed: a substituted destination key makes the signer publish the amount encrypted under the substituter's key, permanently |
| Whatever submits sets `fail_hard` | `FailHardSubmitter` has no method that can omit it, and its method set is pinned by a test so a new method cannot appear unnoticed. ⚠ **The pin does not see a `ledger.call("submit", …)` made outside the class**, and `run-facility.ts`'s control arm makes exactly one, deliberately | **A seatbelt that only helps if someone buckles it.** Nothing forces a *different* submitter to set the flag; the decision request says so in terms — and `CLAIMS.md` **F-25** is why nothing *can*: `fail_hard` is not a field of the signed transaction, so a signer cannot express the wish |

⚠ **The ruling had no adversarial review**, and it is not one of `REVIEW-019`'s
three options as stated — it is A, plus a reading of C that puts the flag
outside the signer. If the facility comes to rest on it heavily, that is worth a
rotation.

### `fail_hard` and `TapFailHard`, read at source

rippled 3.3.0 (`00a178f` — the same commit `CLAIMS.md` F-23 was read at, and the
same build the loopback node runs):

* `src/xrpld/rpc/handlers/transaction/Submit.cpp:32-37` — the `submit` RPC's
  `fail_hard` parameter becomes `NetworkOPs::FailHard`.
* `src/xrpld/app/misc/NetworkOPs.cpp:1683-1684` — `FailHard::Yes` sets
  `TapFailHard` in the apply flags.
* `src/libxrpl/tx/Transactor.cpp:1645-1651` —
  `if (isTecClaim(result) && (view().flags() & TapFailHard)) { ctx_.discard(); applied = false; }`,
  under the comment *"If the TapFailHard flag is set, a tec result must not do
  anything"*.
* `NetworkOPs.cpp:1833` — `enforceFailHard` also stops the transaction being
  kept locally **or relayed**, so a `tec` never reaches the network.

`run-facility.ts` §1 executes that claim in both directions, and **it has run**:
the same signed bytes **with** the flag gave `tecNO_AUTH`, `applied=false`,
absent from the validated ledger and no `Sequence` consumed; **without** it, the
identical bytes were applied and the `Sequence` advanced. ⚠ **The two arms are
separated by three ledger closes**, because submitting them back to back cannot
distinguish *"A was discarded and B applied"* from *"A was applied and B was a
duplicate"* — `REVIEW-022` round two found the first version printing a tick on
exactly the failure it exists to detect.

## The operational cost nobody had priced

⚠ **This project had never run a rippled node**, and the ruling's Option A costs
one. What it actually cost, recorded because the decision request could not:

* **The image.** `xrpllabsofficial/xrpld:3.3.0`, which reports
  `git commit 00a178fb92ca49521b937ae1a99d863765ea8a90` — the exact commit this
  project has been reading rippled source at. **amd64 only**, so on Apple
  Silicon it runs emulated.
* **The documented peer hub did not answer.** `r.devnet.rippletest.net:51235`
  refused TCP from both the host and the container on 2026-08-25;
  `s.devnet.rippletest.net:51235` accepted. A node with an unreachable `[ips]`
  list says only *"Node count (0)"* about it.
* **The validator list key was fetched from the list site itself**, not
  transcribed from documentation — `curl https://vl.devnet.rippletest.net`.
* **A macOS bind mount for the ledger database does not work.** NuDB writes many
  small records and a bind mount goes through VirtioFS; the first attempt could
  not keep up with Devnet's ledger close at all. `node.sh` uses a **named docker
  volume** and says why.
* ⚠ **Initial sync is the real cost, and on 2026-08-25 it did not finish — in
  two runs, two ways.** The node must acquire a whole account state tree while
  the network keeps closing ledgers, and under emulation each attempt aborts
  before completing (`InboundLedger: … abort good:29130 dupe:822`).
  **Run 1**: `OOMKilled=true` after 1h31m, ~3.9 GiB RSS in a 7.75 GiB Docker VM.
  **Run 2**, with the VM raised to 11.67 GiB and the node resuming from its own
  6.3 GB store: **it survived and still did not converge** — memory plateaued at
  6.3 GiB, the store grew to 6.9 GB, `complete_ledgers` stayed `empty` for a
  solid hour, and the RPC began timing out while CPU sat at 1663% of 1200%.
  ⚠ **Memory was a ceiling, not the constraint.** What is left is a native arm64
  build, different hardware, or a node the operator controls elsewhere — and
  none of those is a coding-session decision. **Swap is not a lever**: a node
  already saturating twelve cores will not be rescued by paging.
* ⚠ **There is NO rehearsal network.** A standalone rippled looks like the
  obvious fallback and is not one: `signer/src/ledger.rs` hardcodes
  `DEVNET_NETWORK_ID = 2` and *"refuses every network but Devnet, at any phase,
  for any reason"*, so a local ledger would have to **claim to be Devnet** to
  drive the signer — the substitution this project forbids. Option A costs a
  full Devnet sync or nothing.

## The modules

| File | What it is |
|---|---|
| `src/loopback.ts` | The **only** ledger read path. Refuses a non-loopback literal — ⚠ **unless the risk is accepted by name** (E-151's hatch; this row omitted it until `REVIEW-023` round two, two sections below the table that was corrected for exactly that) — refuses a non-Devnet node, refuses a node that is not `full`, pins one validated index and refuses an answer from any other |
| `src/submit.ts` | The submission path for everything the facility does. Always `fail_hard: true`, with no method that can omit it. ⚠ **One deliberate exception exists and it is not in this file**: `run-facility.ts`'s control arm submits once *without* the flag, because demonstrating that the flag makes a difference requires an arm that does not set it |
| `src/book.ts` | The off-ledger balance record TASK ZERO §9 requires (R-5, F-8) |
| `src/signer.ts` | How the facility reaches `signer/`. One process per account |
| `src/facility.ts` | The domain operations — enrol, drawdown, repay, retire |
| `src/mptool.ts` | Decryption only. The facility generates no proofs and draws no blinding factors |
| `src/devnet-accounts.ts` | The faucet. The one file naming a remote host, and the gate records why |
| `run-facility.ts` | The whole walkthrough, executed on Devnet 2026-08-25 — ⚠ under E-151's amendment, not under B-15's conditions |

### Where the confidential transactions come from

**`signer/`, and nothing here changes that.** The facility builds *intents*; the
signer reads the ledger for itself, derives its ElGamal key from the master seed
under the ruled construction, draws `r` and `ρ` under the ruled derivation,
generates the proof, renders a confirmation from fields parsed out of the
transaction **it** built, signs, and hands back a blob. The facility submits it.

⚠ **`ConfidentialMPTMergeInbox` is signed here, not by the signer** — it carries
no proof and no blinding factor, so there is nothing for the signer to generate.
So are the plaintext transactions: `MPTokenIssuanceCreate`,
`MPTokenIssuanceSet`, `MPTokenAuthorize`, `Payment`.

## Stricter than the signer in one place, deliberately

`signer/src/ledger.rs` accepts the **name** `localhost` as loopback. This
accepts only a numeric literal — `127.0.0.0/8` or `::1` — because a name is
resolved by something the process does not control. `REVIEW-016` found
`127.attacker.example` and `127.0.0.1@attacker.example` walking through the Rust
check that exists *because of* F-23; round two found an unterminated `[::1`
doing the same. All three are negative test inputs in
`tests/hostile-endpoints.ts`.

## The balance book, and why it is a requirement

TASK ZERO §9 originally capped the float. The cap was un-retracted when the
1,000,000 decryption bound turned out to be a caller-supplied search window
rather than a ceiling (F-7), and what replaced it is a **balance-tracking
requirement**: a confidential balance is recovered by a **linear** search, so a
holder who knows what their balance should be searches a handful of candidates
and a holder who does not searches the whole facility — and **no sublinear
fallback is shipped** (F-8: at the pinned mpt-crypto `1.0.4`, the library's own
header points at a `bsgs` symbol that does not exist; upstream added it in
`1.0.5`, E-297).

⚠ **The book is not authoritative.** The ledger is. Every entry is a prediction
and `reconcile` is what turns a prediction into a confirmed reading — cheaply if
the book is right, and **loudly** if it is not. `resync` is what a lost book
costs, and `run-facility.ts` §6 prints both widths side by side.

⚠ **Widths, not times.** `CLAIMS.md` P-8 forbids a benchmark number without
hardware, parameter set and methodology, so no per-iteration figure appears
anywhere under `facility/` — the one this project has measured lives in
`docs/task-zero/benchmarks-2026-08-16.md` §4 with all three, under **E-23** and
**F-7**. ⚠ It is **not** F-8's row, and TASK ZERO §9's sentence — which states
the cost and the missing fallback together under one citation — is how the wrong
row gets attached to the number. The width is a parameter and the search has a
fixed iteration count (upstream's `RIPCTXR-1` mitigation), so the width *is* the
cost.

## What this does not hide, and what it is not

**It hides amounts.** Not who transacts, not with whom, not when, not how often,
and the issuer decrypts every balance by construction (P-4, P-9, P-11).
`Convert` and `ConvertBack` publish their amounts **per transaction**, so
retiring in tranches publishes every tranche size (`CLAIMS.md` F-24).

And what is **not built**, named rather than glossed:

* **No permissioned domain.** The walkthrough's step 1 offers `sfDomainID` to
  gate the issuance to credentialled accounts. It needs `PermissionedDomainSet`
  and a credential per supplier, and it is its own milestone.
* **No separation of parties.** One process plays the bank, the Dedicated
  Account and every supplier, so it holds every seed. Every property that
  depends on three parties on three machines is **not demonstrated here**.
* **No human confirmation under `--auto-confirm`.** The run answers the signer's
  prompt itself and prints a notice saying so. `signer/tests/falsifier.rs` is
  what demonstrates the confirmation boundary.
* **No cover traffic.** TASK ZERO §9's mitigation for the drawdown-frequency
  leak is `Proposed`, rests on an indistinguishability claim this project has
  tested three ways and **not established**, and is reviewed by nobody.
* **The float's custody risk is accepted by name, not solved.** ~~No answer to who
  holds the Dedicated Account's key.~~ Ruled 2026-09-13 (`CLAIMS.md` B-27, E-294)
  and printed as the first thing every run does (`src/custody.ts`). The Dedicated
  Account's key moves the float and is not its only holder: the issuer can erase
  or freeze it, and the key that decrypts is also required to spend (E-290).
