# W-CONF holder signer

**Architecture §6 steps 1, 2, 3, 4 and 6, and step 7's `ConfidentialMPTConvertBack`.**
Devnet only. Never mainnet, at any phase.

> **This binary holds Devnet keys, generates real proofs, and signs real
> transactions.** `CLAIMS.md` P-5 forbids calling any of it secure,
> non-custodial, audited or production-ready, and nothing here changes that.
> ~~The ElGamal key comes from the library's own generator — **not** the ruled
> derivation, which is step 6~~ — **struck 2026-08-20: step 6 is built.** The
> ElGamal key now comes from one of **two named sources**, and the ruled
> derivation is one of them. Every account here is still a Devnet throwaway and
> nothing here should ever hold value.

```
tools/rebuild-env.sh          # clone at the pin, patch, verify, build. ~60s, idempotent

cargo build        # from signer/
cargo test         # 250 tests, no flags needed. Run it more than once — see below
cargo test --test ledger_devnet -- --ignored   # 4 more, against a LIVE Devnet node
cargo build --release

cargo run --bin onboard -- <account> <MPTokenIssuanceID> [endpoint]
```

⚠ **Run the suite more than once before believing it.** On 2026-08-19 the
entropy-failure hook was found to be a **process-global** flag while `cargo test`
runs a binary's tests on parallel threads, so the induced failure landed in
whichever test drew entropy next: **2 failing runs in 12**. Fixed with a
`thread_local!`, now 0 in 12. Every earlier "all passing" line in this project
was a true report of a lucky run (`CLAIMS.md` E-98).

**The signer does not build without the vendored prover.** `build.rs` says so,
with the two commands above in the error. That is deliberate: step 3 put proof
generation in this binary, so a build that quietly succeeded without it would be
a build of something else.

## ~~What is deliberately absent~~ — what changed on 2026-08-18

The skeleton *"held no keys, generated no proofs and signed nothing."* All three
are now false, which is the milestone. The table that used to list them:

| Was absent | Now |
|---|---|
| Key material | **Loaded from a holder profile** — an XRPL family seed, and an ElGamal key from ~~a throwaway keypair. Still not step 6's ruled keygen~~ **one of two named sources, one of which IS step 6's ruled keygen** (2026-08-20). ⚠ With the derived source and `"account_seed": "prompt"` the profile carries **no secret at all** |
| Proof generation, the vendored prover | **Wired.** `src/mpt.rs`, `src/prover.rs`, `build.rs` |
| Real XRPL serialisation and signing | **Built.** `src/xrpl.rs`, pinned against `ripple-binary-codec@2.9.0` and `ripple-keypairs@2.0.0` |
| The Bulletproof's internal randomness | **Still absent from any ruling.** Issue #8, open. The library draws it and we do not touch it |
| The ruled ElGamal keygen | **Built 2026-08-20** — `src/keygen.rs`, `src/onboarding.rs`, and executed on Devnet. ⚠ Issue #10 is **not** discharged and no code discharges it |

## Why it is a separate binary

ADR-0001 §(a), `Accepted` 2026-08-18: proof generation runs **on the holder's
machine**, with the browser as a thin client. A browser page cannot invoke a
local process, so the signer and the web application live side by side. It is
not part of the TanStack/Elysia tree and never will be.

## The boundary, and exactly what it buys

The issue #1 ruling put **a hostile process on the holder's own machine, under
the holder's own user, in scope**. Everything below is shaped by that, and the
claim stops precisely where the ruling says it does.

### Transport — a Unix domain socket, not localhost HTTP

Architecture §3 item 4 prefers OS-mediated IPC. REVIEW-003b's finding is why: an
origin allowlist constrains **pages**, not **processes**, and any local process
can forge an `Origin` header.

**What it buys.** A browser page cannot open a Unix socket by any web API, so
the XSS-to-spend-oracle path is closed by construction rather than by a header
check. The peer's UID comes from the kernel via `getpeereid(2)` and cannot be
forged. The socket sits in a `0700` directory, so no other *user* reaches it.

**What it does not buy, which is the part that matters.** A hostile process
running as **the same user** passes every check above, because it genuinely is
the holder's user. It is not stopped here and was never going to be.

⚠ Put the socket in **its own** directory. The daemon sets that directory to
`0700`, which fails — correctly — if you point it straight at `/tmp`.

### The actual boundary — confirmation in this process's own window

Every transaction is confirmed in the signer's own terminal, and **the
confirmation is rendered from fields parsed back out of the transaction this
process built** — never from what the client asked for.

That is enforced by types, not by discipline (`src/txn.rs`):

* `BuiltTransaction` has private fields and one constructor, `build`.
* `ParsedTransaction` has exactly one constructor, `parse(&[u8])`.
* `confirm::render` takes `&ParsedTransaction` and nothing else; `Intent` is not
  imported into that module.

**The falsifier** is
`tests/falsifier.rs::confirmation_never_renders_what_the_client_claimed`. It
sends the attack REVIEW-003b describes: an intent whose `claimed` block says
*"Send 1 unit to Alice"* while the real fields say 9999 units elsewhere, and
asserts none of the client's strings reach the rendered screen.

### The amount is not on the wire, so the confirmation decrypts it

A `ConfidentialMPTSend` carries **no plaintext amount** — that is the scheme.
So there is no amount field to parse, and echoing the client's integer is
exactly what REVIEW-003b forbids.

`ParsedTransaction::recover_amount` resolves it the only honest way: it
**decrypts `SenderEncryptedAmount` out of the transaction itself**, with the
holder's own ElGamal key. The holder confirms the number the ciphertext
actually encrypts. `tests/falsifier.rs::the_confirmed_amount_is_decrypted_from_the_transaction_not_echoed`
takes the returned blob apart independently and checks that what it encrypts is
what was shown.

If the amount does not decrypt within the bounded search range the confirmation
says **`*** COULD NOT BE READ ***`** and tells the holder not to confirm. It
never guesses.

⚠ The search is a linear discrete log with a **fixed** iteration count over
`[0, amount_search_to]` — upstream's mitigation for the `RIPCTXR-1` timing
channel — so the bound is a latency budget, not a best case. Set it to the
smallest value that covers the amounts you expect.

⚠ **Upstream's header carries a cost estimate for that search. It is not
repeated here and must not be**: `CLAIMS.md` **P-8** forbids any benchmark
number without hardware, parameter set and methodology, and that estimate has
none of the three. It is also not a number this project measured. If a figure is
ever needed, measure it — `tools/mpt-crypto-bench/` is where that belongs.

### One more thing the confirmation will not do

On Devnet a transaction **must not carry `NetworkID`** (`CLAIMS.md` F-21), so
there is no network field in the bytes. The confirmation says *"not in this
transaction"* rather than printing the signer's own configured network. A number
that did not come out of these bytes has no business on that screen, and the
rule does not get an exception for a field that seems harmless.

### Authority — scoped, short-lived, and not a bearer token

Architecture §3 items 2 and 3 withdrew ADR-0001 rev 2's pasted long-lived token.

* A grant names the operations it covers. Anything else is refused.
* TTL is capped at 15 minutes regardless of what the client asks for.
* **A grant is bound to the connection that requested it.** Presenting the
  handle on another connection fails, so a handle found in a log, a crash dump
  or `localStorage` is not usable by whoever finds it.
* Closing the connection revokes its grants. A disconnect *is* a revocation.
* Wrong-connection and unknown-handle return byte-identical errors, so a caller
  cannot probe for which handles exist.

### Caller-supplied randomness — refused by name

Architecture §3 item 5 and REVIEW-010c §1. The scan runs on the raw JSON tree
**before** the request is interpreted, recurses into nested objects, and matches
case-insensitively after stripping separators. The refusal **names the field**,
because `REVIEW-013c` §3a B-VII found that a generic error is what a web client
renders as "transaction failed, please retry".

E-63 is the reason this is not a formality: a passive full-ledger observer
holding no keys recovered the difference between two confidential amounts when
`r` was reused across two Sends, and the ledger accepted both.

## The prover — architecture §6 step 3

### Why the FFI is hand-written

`mpt-crypto-sys@0.1.0-beta.1` pins `MPT_CRYPTO_VERSION = "0.3.0-rc2"`, four
tag-generations behind the `0.4.0-rc4` in rippled 3.3.0, and its vendored header
declares **seven functions that no longer exist** at `1.0.4` (`CLAIMS.md` F-18).
Left alone it links an old prover silently; redirected at a current library it
fails loudly. Neither is acceptable in a signer, so `src/mpt.rs` declares its own
`extern "C"` surface against the header of the commit it actually links.

That describes `0.1.0-beta.1`. `mpt-crypto-sys@0.1.0`, published 2026-08-18,
pins `1.0.4` with a byte-identical header (`CLAIMS.md` E-299), and this reason
has not been re-weighed against it.

### Two things the build enforces, both spot-checked in both directions

* **It links the PATCHED library or it does not link.**
  `secp256k1_mpt_scalar_reduce64` is the wide reduction the W-CONF patch adds
  and does not exist upstream. Pointing `WCONF_MPT_LIB` at the pristine control
  library produces `Undefined symbols … _secp256k1_mpt_scalar_reduce64` rather
  than a silent downgrade to upstream's biased 32-byte reduction.
* **It binds to the pinned headers or it does not build.** `build.rs` pins the
  SHA-256 of the three public headers at `85dbac7`. Appending one comment line
  to a header stops the build with both digests printed. That is F-18's failure
  mode caught at build time instead of at runtime.

`tests/prover_ffi.rs` adds what a build cannot check: struct layouts compared
against a **C probe compiled from the vendored header** rather than against
hand-written numbers, and context hashes compared against `mptool`'s for
identical inputs — because `account_id` is passed **by value**, and an ABI
disagreement there would be invisible end-to-end.

### The step's named falsifier

> *Falsified if: `vendor-verify.sh` fails or the pristine upstream verifier
> rejects a proof.*

`tests/prover_pristine.rs`. Proofs are generated by this signer from scalars
produced by the ruled `r`/`ρ` derivation, then handed to
`/tmp/wconf/mptool-pristine` — a **separate binary linked against the pristine
`85dbac7` library**, communicating only in hex on argv. n=3, n=4, and a
zero-amount Send. All accepted.

**The falsifier can fail**, and that is asserted: corrupting one nibble makes
the same verifier answer `FAIL`. A verifier that answered `OK` to everything
would make every other assertion vacuous, which is what `REVIEW-009` §8 found in
`t-nbound.c`.

**What this establishes, and where it stops.** `vendor-verify.sh` checks that
`src/` and `include/` are byte-identical between tag `0.4.0-rc4` — the version
in rippled 3.3.0 — and tag `1.0.4`, which is what makes a `1.0.4` verifier the
ledger's verifier. It is a **test at two participant counts, not a proof for
every input**. The ledger's own acceptance is separate evidence and it is
recorded below.

### What is deliberately NOT bound

* **`mpt_generate_blinding_factor`** — upstream's source of `r` and `ρ`,
  superseded by the ruled derivation. Binding it would put the superseded source
  one keystroke away. ~~⚠ `tools/` **still calls it**; the ruling is implemented
  in the signer, not everywhere.~~ **Struck 2026-08-24 — `CLAIMS.md` E-132.**
  Every transaction-building harness now derives through
  `tools/wconf-randomness.ts`. ⚠ **FIVE call sites still reach it deliberately** —
  `reuse-r-setup.ts` reuses one `r` on purpose (that *is* E-63); `adj-c1-verify.ts`
  and `adj-c1-shared-blinding.ts` need a scalar deliberately unequal to the
  transaction's `r`; `wasm-test.ts`, `npm-e2e-convert.ts` and `npm-package-test.ts`
  test package and export surfaces of which it is part; `nonce-crosscheck.ts`
  never touches a network; and `mptool.c` is what exposes the subcommand. Each
  says so at its own call site.

  ⚠ **That count has been wrong three times in two days, in both directions.**
  **Four** — a sweep for one call-site *name* that missed four more routes,
  including a harness that **submits to Devnet** (`CLAIMS.md` E-137). **Nine** —
  files the new gate *flagged*, two of which were not call sites: the gate
  itself, and a **dead entry the gate's own stale check was hardcoded to skip**
  (E-141). **Eight** — correct at the time. It is now **five**, because
  `REVIEW-021` round two found that the three remaining `submit`-ing harnesses
  had been exempted on two successive **false** reasons and migrated them
  (E-143).
  `tools/check-blinding-sources.ts` searches **by pattern rather than by name**,
  now walks `signer/` as well, excludes itself, and fails on an unrecorded use
  *or* a stale exemption — with no exceptions, because the exception is what
  grew into the mask.
* **Everything issuer-side** — clawback proof and context. The holder's signer
  has no use for them.
* **`secp256k1_mpt_pok_sk_prove`** is declared but not exposed by `prover`,
  because it accepts a NULL `context_id` and then emits an account-unbound,
  replayable proof (`CLAIMS.md` F-19). rippled cannot reach that path; this
  signer could.

## Reading the ledger — architecture §6 step 2

`src/ledger.rs`. Until 2026-08-19 the signer took its sequence number, its
confidential balance and that balance's ciphertext, `ConfidentialBalanceVersion`,
whether its own key was registered, the issuer and auditor keys and every other
holder's `HolderEncryptionKey` from a **profile file an operator pointed it at**.
Nine fields, all trusted input, and everything downstream inherited the trust.

Now: **one snapshot, at one pinned validated ledger index.**

| Read | Gives |
|---|---|
| `server_info` | `network_id` — **checked before anything else is read** — the validated index everything else pins to, its age, and the node's sync state |
| `account_info` (pinned) | `Sequence`, and issue #11's three conditions: `account_flags.disableMasterKey`, `RegularKey`, `signer_lists` |
| `ledger_entry mptoken` (pinned) | `ConfidentialBalanceSpending`, `ConfidentialBalanceVersion`, `HolderEncryptionKey` |
| `ledger_entry mpt_issuance` (pinned) | `IssuerEncryptionKey`, `AuditorEncryptionKey` |
| `ledger_entry mptoken`, the destination's (pinned) | the destination's `HolderEncryptionKey` |

The **balance is decrypted** from the ledger's own ciphertext with `sk_A`. It is
not a number anyone declares.

### ⚠ A wrong read is a confidentiality break, not a rejected transaction

This is the part that is not obvious, and it is why the transport rules below
are what they are.

A Send encrypts the amount to the **destination's** key and the **issuer's**,
both read from the ledger. rippled verifies against the keys *it* holds —
`ConfidentialMPTSend.cpp:132` takes `(*sleDestinationMPToken)[sfHolderEncryptionKey]`
— so a substituted key fails the proof. It fails with **`tecBAD_PROOF`**, and a
`tec` is **applied to the ledger**: the transaction and every ciphertext in it
are recorded permanently, unless the submitter set `fail_hard`. **This signer
does not submit, so it does not get to set that flag.**

So an adversary who controls what the signer reads gets the holder to publish
the amount encrypted under a key the adversary holds. `CLAIMS.md` **F-23**, read
at rippled `3.3.0` / `00a178f`.

~~⚠ **Not executed** — say *"the source says"*, not *"we saw"*.~~ **Executed on
Devnet 2026-08-19, and it held.** `tools/spike-step2-2026-08-19/f23-substituted-key.ts`
builds a Send encrypting the amount to an adversary's key instead of the
destination's registered one. `tecBAD_PROOF`, **recorded on validated ledger
4603815**, hash `7A283EE5…145AF160`. `DestinationEncryptedAmount` came back off
the chain byte-identical, and the amount **42 was recovered from it by the
adversary** holding only the key they supplied — while the intended destination
could not decrypt it at all.

⚠ **That is what a wrong READ costs, and it is not a network attack.** Nothing
was compromised to run it. It is the consequence, executed, of the value a
signer reads for a destination's key not being the value on the ledger.

Two consequences:

* **TLS is required for any non-loopback endpoint.** `http://` is accepted only
  for `localhost`, `127.*` and `::1`, where the operator is running their own
  node. There is no override flag.
* **TLS is not enough, and this does not pretend it is.** It authenticates the
  **channel to a node the operator chose**, not the ledger. A hostile node lies
  just as well over TLS. ~~Whether one endpoint is acceptable at all is
  `CLAIMS.md` **B-15** and it is **open**.~~ **RULED 2026-08-20 —
  `REVIEW-019`.** One endpoint stands for this Devnet research artifact **as a
  named risk acceptance**, and the daemon prints
  `ledger::REMOTE_SOURCE_DISCLOSURE` whenever the endpoint is not loopback —
  which is a condition of the ruling, not a courtesy. **Loopback is the clean
  answer.** Corroboration across one operator's hosts is **not built**: both
  legs called it near-theatre on Devnet, because the default endpoint is one
  operator's cluster and the in-scope adversary can reconfigure both. ⚠ **For
  step 7 — the facility — one remote endpoint is NOT sufficient**, and that is
  a gate on step 7.

The one local anchor: the ledger's `HolderEncryptionKey` for **this** account is
compared against the key this signer holds, and a mismatch refuses. **There is
no such anchor for the destination's key or the issuer's.** Named, not designed
around.

### Torn reads

Two `"validated"` reads seconds apart land in **different ledgers** — observed
live on 2026-08-19, `account_objects` at 4596692 and `account_info` at 4596693,
issued back to back, because the public endpoint is a cluster and consecutive
requests reached different hosts (E-103). A snapshot assembled from both is a
state that never existed. So the validated index is taken **once** and every
subsequent call pins that number.

### Reviewed — `REVIEW-016`, two independent legs

**Both legs independently found the same defect**, which is the strongest
signal this project has: `LastLedgerSequence` was set to read-index + **20**,
borrowed from `xrpl.js`'s `autofill` — which runs at *submit* time, with no
human in the middle. This signer puts a **120-second confirmation** between
building and signing, and 20 ledgers is ~60–80 seconds on Devnet. A holder who
took ninety seconds got a transaction that had already expired, and the signer
signed it. The window is now 60 ledgers **and** an expired transaction is
refused outright — widening alone would make it rare, not detected.

Four more, one leg each, all real:

* `is_loopback_host` accepted `http://127.attacker.example/` and
  `http://127.0.0.1@attacker.example/` as loopback — so the plaintext rule that
  exists *because of F-23* was bypassable by naming a host carefully.
* `network_id` was read as `u64` and cast `as u32`, so **4294967298 truncates
  to 2** and walks through a guard this README calls absolute.
* *"One pinned numeric ledger index"* was **asked for and never checked**. A
  node could answer `account_info` from one ledger and `ledger_entry` from
  another, and the torn read this module exists to prevent would be assembled
  and labelled with the first index.
* `signer_lists` was read only from `account_data`. rippled
  `AccountInfo.cpp:230-237` moves it to the **top level** from `apiVersion` 2 —
  so issue #11's third condition would read as **zero, silently**, against a
  version-2 endpoint. Reading the source made it sharper than the leg had it:
  rippled assigns the array whether or not a list exists, so absent from
  **both** places is a malformed answer and is now refused rather than read as
  zero.

⚠ **Two leg claims were wrong and are pinned by tests, not by notes.** One
reported `#[serde(deny_unknown_fields)]` missing from `RawProfile` — it is
present, one line above the struct — and built two overclaim findings on it.
One proposed comparing the whole of `AccountSecurity` before signing; rippled
`Transactor.cpp:1039-1045` answers `tefMASTER_DISABLED` **only** for a disabled
master key, so a regular key or a signer list does not invalidate a master-key
signature and refusing on them would refuse valid transactions. Narrowed to
`disable_master`. *A review finding is evidence, not an instruction* — this is
the fourth time.

⚠ **And the leg that found the drift case missed the worse one beside it.**
`lsfDisableMaster` *already set* means every blob this signer produces is dead,
persistently — and the daemon printed a warning and signed anyway. Now
`REFUSED_MASTER_KEY_DISABLED`, before any entropy is drawn.

**All seven fixes were spot-checked by reverting them.** Every test fails; the
controls do not.

### Round two, which reviewed the fixes and earned its place

`CLAUDE.md`: *"the second round reviews the FIXES"*, because fixing something
and describing the fix are separate acts with separate failure modes. It found
all three kinds it is supposed to.

**A defect introduced by a fix.** `came_from` reported a lagging cluster host
as a permanent misconfiguration — see the refusal codes above.

**A hole in a new parser.** The rewritten `host_of` accepted `http://[::1` —
no closing bracket, not a URL — as loopback, because it split on `]` and took
what came before. A parser whose job is deciding whether plaintext is safe does
not get to assume a later parser rejects what it waved through.

**Two coverage gaps and a loose assertion.** The truncation test drove only
`network_id`, so the other three conversions could have regressed silently; the
`MPToken` identity test never drove a wrong **issuance**; and asserting
`contains("MPToken")` on a type-mismatch message passes on `MPTokenIssuance`
too, since one is a substring of the other.

⚠ **And then two of the tests written for round two's own findings turned out to
be false passes** — caught only by spot-checking the reverts, not by reading
them. One asserted an error that a different read was producing; the other made
every field oversized at once, so the case it named was never the reason it
failed. Both repaired and re-verified. The lesson is the one this project keeps
paying for: **a test written to make a claim falsifiable is not exempt from the
scrutiny the claim gets.**

### Staleness is detected, not bounded

> *Falsified if: … a stale read is indistinguishable from a fresh one.*

Bounding the age of a read does not answer that; it makes staleness *unlikely*.
The window is the **confirmation**, which a human holds open for as long as they
like while `Sequence` and `ConfidentialBalanceVersion` move.

So the ledger is **read again after the human confirms**, and the signature is
refused if any field the transaction binds to changed —
`LedgerSnapshot::binding_differs`, plus the destination's key, which is not in
our own snapshot and is the one whose substitution leaks rather than fails.

`REFUSED_LEDGER_MOVED`. `tests/ledger_read.rs` drives it four ways, and the
**control** is what stops those four being vacuous: a ledger that merely
advances seven ledgers during the confirmation still signs. All five were
spot-checked by deleting the re-read — the four fail, the control does not.

⚠ **Where the check stops, stated because "staleness is detected" invites a
larger reading.** The re-read establishes the state at the moment of the
re-read. **This signer does not submit**, so the window between the signature
and whatever submits it is not one it can close at all, and the state can move
inside it.

What that costs is bounded, and the three cases are not the same:

* **`Sequence` moved** → `tefPAST_SEQ`. Not applied, nothing recorded.
* **`ConfidentialBalanceVersion` moved** → `tecBAD_PROOF`, and per F-23 the
  transaction *is* recorded with its ciphertexts. But those ciphertexts are
  under the **correct** keys — the destination's and the issuer's — and both
  parties could already decrypt the amount. A wasted fee and a public failed
  transaction; **not** a confidentiality loss.
* **A key was substituted** → `tecBAD_PROOF`, recorded, and the ciphertext is
  readable by whoever supplied the key. **This** is the case that leaks, it is
  the one the re-read is aimed at, and it is the one that has been **executed**
  on Devnet.

### What the profile still holds, and what it now refuses

Secrets (`account_seed`, `elgamal_sk`, `elgamal_pk`), which position
(`issuance_id`), policy (`fee_drops`, `amount_search_to`), and where to read
(`ledger_endpoint`, `network_id`).

⚠ **A profile carrying any of the nine fields that moved fails to load, by
name.** Not ignored: a signer that silently preferred a stale local number to
the ledger would be the gap step 2 closed, reopened by a config file. It fired
in real use the first time a Devnet driver was run against it half-updated.

⚠ **The fee is deliberately NOT read from the node.** It is policy. A fee read
from a hostile node is a way to drain XRP, and `amount_search_to` read from one
is a way to make the confirmation unreadable.

### The read does not reach the confirmation screen

The ledger index a transaction was built against is printed to the daemon's own
stderr and **not** to the confirmation. A number that did not come out of the
transaction's own bytes has no business there — the same rule `CLAIMS.md` F-21
imposes on `NetworkID`.

### Seeing what it reads

```
cargo run --bin ledger-read -- <account> <MPTokenIssuanceID> [endpoint]
```

The counterpart to `store-check`. It takes **no secret on argv** and therefore
cannot decrypt the balance — it prints what a full-ledger observer sees, plus
the issue #11 warning when the account carries `lsfDisableMaster`, a regular key
or a signer list.

### Executed against a real node

`tests/ledger_devnet.rs`, four tests, `#[ignore]`d rather than made to skip:
an ignored test is counted and printed on every run, and a skip that reports
`ok` is the false-pass mode `REVIEW-009` §8 found in `t-nbound.c`.

⚠ **`tests/ledger_read.rs` drives a fake source whose JSON was transcribed from
a live 3.3.0 node. A transcription can be wrong**, and a suite that only ever
reads its own transcription would never find out. That is what the live tests
are for, and it is why they are not optional in spirit even though they are
excluded from `cargo test`.

## XRPL serialisation and signing

`src/xrpl.rs`. Canonical field ordering by `(type code, field code)`, VL
prefixes, the `STX\0` signing serialisation, `SHA512Half`, base58check,
family-seed derivation, and the transaction hash.

**Every claim it makes is pinned against three implementations this project did
not write** — `ripple-binary-codec@2.9.0`, `ripple-keypairs@2.0.0`,
`ripple-address-codec@5.0.1` — by `tests/xrpl_vectors.rs`, with the generator
committed at `tools/spike-step3-2026-08-18/xrpl-vectors.ts` under **P-8**. If
the vectors file is missing the test **fails**; it does not skip.

⚠ **Two algorithms, and they sign different things.** secp256k1 signs
`SHA512Half(message)`; ed25519 signs the message, because Ed25519 hashes
internally. Both are pinned by vectors rather than reasoned about. ed25519 is
not optional — every account in this project's Devnet state has an `sEd…` seed.

⚠ ~~**The ECDSA nonce `k` is a fifth randomness site and it is unruled.**~~
**RULED 2026-08-20 — `CLAIMS.md` B-14, `REVIEW-018`.** Two independent legs, both
ruling that the **issue #1 ruling extends here**: the same ruling that made the
sigma nonces hedged, and neither leg found a principled distinction.

**secp256k1 signing is hedged** — RFC 6979 with 32 bytes of fresh entropy as
additional data. `k` protects the **account key**, and under the ruled keygen
construction that key is the input the ElGamal decryption key is derived from,
so a `k` failure is a confidentiality failure as well as a spending one.

**The cost, paid deliberately:** `ripple-keypairs` is deterministic, so the
default path can no longer be pinned byte-for-byte against it.
`tests/xrpl_vectors.rs` now pins a **deterministic arm** — one implementation
with one input varied, never a second signer, which both legs made the condition
of its soundness. `tests/hedged_signing.rs` covers the default path with eight
tests that did not exist before.

⚠ **Entropy failure DEGRADES to pure RFC 6979. It does not refuse.** That is the
sigma-nonce rule, not the `r`/`ρ` rule, and the difference is that entropy here
is a **hedge over a deterministic core that is safe alone**. One leg recommended
refusing; that would import the wrong one of architecture §4's three rules and
was rejected.

~~⚠ **B-14 is NOT closed. ed25519 is `CLAIMS.md` B-16**, and it is the live path —
every account this project holds on Devnet has an `sEd…` seed. Both legs said so
and neither recommended hand-rolling randomised ed25519 for symmetry.~~

**RULED 2026-08-27 — `REVIEW-024`, three independent legs, all ruling that the
ed25519 nonce is hedged too — and BUILT AND EXECUTED the same day**
(`CLAIMS.md` E-163). ~~⚠ **RULED AND NOT BUILT.** The code below still signs
ed25519 with pure RFC 8032 and
`hedged_signing.rs::ed25519_is_still_deterministic_and_that_is_a_tracked_gap`
still passes.~~ **Struck.** That test was **replaced**, not deleted, as its own
panic message instructed; what stands in its place is `REVIEW-024` §6's list.

The construction: `q := p XOR SHA512(DST ‖ aux)[0..32]` over the RFC 8032 nonce
prefix, with `DST` the fixed 29 bytes `WCONF/ed25519-nonce-hedge/v1\0` and
everything a verifier checks left exactly as RFC 8032 defines it. A validated
Devnet transaction on the **default** path closed §6's last gate:
`5A8CF0B403529267AECB5D431EAC4422AF95129B56B467CF3384389726C1650A`, receipt at
`docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json`.

⚠ **Built and executed is not REVIEWED, and those are different things** — the
same distinction `REVIEW-024` §6 drew between *ruled* and *built*, one step
along. §7 item 4 requires two adversarial rounds and the second reviews the
fixes. `REVIEW-025c` is round one: **eleven findings, none of them the
construction**, all fixed.

⚠ **A successful draw of thirty-two ZERO bytes stays hedged.** Only a *reported*
entropy failure omits the mask. `a_successful_all_zero_draw_still_hedges` is what
holds that — and **not** `zero_aux_is_hedged_not_a_fallback`, which enters one
function after the decision is made and left the suite green when the decision
was reverted (E-164).

⚠ **B-14's stated reason for leaving it open was checked and was FALSE.** Hedging
ed25519 is not hand-rolling a signature scheme: `SigningKey::try_sign` already
*is* `ExpandedSecretKey::raw_sign::<Sha512>`, and the nonce prefix enters that
computation at one line. One B-14 leg asserted a `SigningKey::sign_with_rng` that
`ed25519-dalek` 2.2.0 does not have, and a wrong API surface produced a wrong
price. The construction, the eight execution gates and the four build conditions
are in `docs/reviews/REVIEW-024-RULING-ed25519-nonce-2026-08-27.md`; do not
paraphrase them here.

**Executed:** a hedged secp256k1 signature was accepted on Devnet —
`SigningPubKey 03A7180BF0…`, `tesSUCCESS`, validated,
`363EF721…FFC4A59F`. ⚠ The obvious Devnet run proved nothing and nearly got
reported as though it had: every existing account is `sEd…`, so it exercised
ed25519. `tools/spike-step2-2026-08-19/b14-hedged-secp256k1-devnet.ts` decodes
`SigningPubKey` out of the blob and refuses to claim success unless the prefix
says secp256k1.

## `r` and `ρ` — the ruled construction, its ledger, and the wiring

`src/randomness.rs` implements REVIEW-010 Deliverable A. **Written from the
ruling's prose, not from the TypeScript reference**, then checked against that
reference's nine published vectors — which is the point of having vectors.
`tests/r_and_rho_kat.rs`.

Two implementations agreeing on nine vectors is evidence. One agreeing with
itself is not, and a REVIEW-010 leg shipped **fabricated** vectors that were
structurally self-consistent enough to be dangerous.

`src/scalar.rs` does the 64-byte wide reduction. It is hand-written rather than
a bigint dependency because the input is secret in every caller: the loop runs
the same 512 iterations regardless of input and its one conditional subtraction
is a mask, not a branch. ⚠ **That is a claim about this function's control flow
and nothing else** — not about compiler output, not about the caller, and P-5
still applies. It is cross-checked against the patched C `reduce64` in
`tests/prover_ffi.rs`.

**Entropy failure aborts; it does not degrade.** For `r` and `ρ`, entropy *is*
the source rather than a hedge, and `r` is published on chain in
`BlindingFactor`. That is the opposite of the sigma-nonce rule and both are
correct — architecture §4 has all three side by side.
`REFUSED_ENTROPY_UNAVAILABLE`, and `tests/signing_path.rs` fires it.

### The signing path, in the order the rulings require

`session::prepare`. ~~`session.rs` does not call `store` or `randomness` on any
path.~~ **It does now** — both `REVIEW-014` legs recorded the gap, and the
architecture already said the wiring *is* step 3.

1. Authorise the grant — scoped, short-lived, connection-bound.
2. Build and validate the plan from the intent plus signer state.
3. **64 bytes of fresh entropy**, once per signing *attempt*. Failure refuses.
4. Derive `r` and `ρ`, bound to the transaction context. A zero scalar aborts
   the attempt and is never retried.
5. **Reserve both identifiers before proof generation** (§7 steps 4–6).
6. Generate the proof, which re-checks §7's shared-`C₁` rule.
7. Serialise, **parse back**, decrypt the amount out of those bytes, confirm.
8. Sign on confirmation, **burn** on refusal.

⚠ **Step 8's ordering bit a first draft.** `SigningPubKey` is a signing field,
and adding it after computing the digest produces a signature over a
serialisation the blob does not contain — every validator would reject it. Found
by `tests/signing_path.rs::the_signature_verifies_over_the_blob_that_carries_it`,
which verifies against the bytes **in the returned blob** rather than the bytes
the function held. A weaker version of that test would have passed.

### The ledger is built against A4–A9, not A1–A3

`REVIEW-013c` §3: both legs ruled the signer may **not** be built against
A1–A3. `src/store.rs` implements the corrections.

| | What it does | Falsified by |
|---|---|---|
| **A4** | Records are hash-chained under `k_local`; the tail is committed by an authenticated header; records carry their generation. **Truncation, reordering, alteration and partial rollback are detected** — under A1's per-entry MACs a truncated store verified perfectly. Illegal duplicate transitions are rejected even when the chain verifies | `truncating_the_log_is_detected`, `reordering_records_breaks_the_chain`, `an_illegal_duplicate_transition_is_rejected_even_with_a_valid_chain`, `records_carry_their_generation` |
| **A5** | Identifiers are append-only for the installation lifetime; only metadata may be pruned. A1's *"pruning bounds the window"* is **struck** — pruning an identifier reopens the window the store exists to close. Lookups are indexed, not scanned | `an_identifier_survives_reopening_and_still_blocks_reuse`, `the_store_exposes_no_way_to_delete_an_identifier` |
| **A6** | A reset is acknowledged **only in the signer's own window**, with a typed phrase. **The gap record goes to a separate append-only audit log with its own authenticated header**, so deleting or truncating it is detected, and the audit log is verified on every `open`. The generation can never move backwards, because the audit log is its floor. A crash between the record write and the header write is **recovered, not reset** | `deleting_the_last_audit_entry_is_detected`, `open_refuses_when_the_audit_log_does_not_verify`, `the_generation_never_moves_backwards_when_the_header_is_destroyed`, `the_crash_window_is_recovered_rather_than_reset` |
| **A7** | §7 step 7's *"clear `pending`"* is struck. A cancelled confirmation or failed proof **burns** the reservation | `a_cancelled_confirmation_burns_the_reservation_rather_than_clearing_it`, and on the wired path `a_declined_confirmation_burns_the_reservation_rather_than_clearing_it` and `a_refusal_after_reserving_still_burns_the_reservation` |
| **A8** | A live reservation is leased in memory, so a startup sweep cannot promote it out from under a human still reading the confirmation. Promotion is idempotent | `a_live_reservation_is_not_promoted_under_a_waiting_human`, `commit_is_idempotent_after_a_sweep_promoted_the_same_entry` |
| **A9** | What the store is actually for, at corrected strength — see below | `an_identical_context_still_produces_different_randomness` |

**A6's acknowledgement is enforced by a type.** `HumanAcknowledgement` has one
constructor, `confirm::acknowledge_store_fault`, which reads this process's own
stdin. Nothing in `protocol` deserialises into it and `session` never calls it,
so **a request cannot produce one whatever it contains**.

The test-only constructors — that one and `store::fail_next_entropy_draw_for_test`
— are behind the `test-support` feature, which is **not a default**; it is
enabled for test targets by a dev-dependency on this crate. So `cargo test`
needs no flags *and* a release binary cannot reach either. **Verified 2026-08-18**
by compiling a release binary that references both and watching them fail to
resolve.

### The ledger is checkable against the public ledger

`r_entry` commits to `compressed(r·G)`, and `C₁ = r·G` is **on the wire**. So
anyone holding `k_local` can take transactions off the chain and confirm that
the randomness they published is the randomness this signer recorded.

```
cargo run --bin store-check -- <store-dir> <C1-hex> ...
```

It verifies the whole chain, header MAC and audit log on `open` before answering
anything. Run against the three `C₁` values from Devnet: all three **RECORDED,
committed**. Run against E-63's reused `C₁` from a different account: **NOT IN
THE LEDGER**, exit 1.

### ⚠ What rollback detection does and does not cover

**Detected:** the log rolled back under a current header; the store rolled back
while the audit log is not.

**NOT detected:** an adversary who restores **every file in this directory
together** — `records.log`, `header.bin`, `audit.log` and `audit.hdr`. That set
is internally consistent in every respect, and **no purely local check can see
it.** Detecting it needs an anchor outside the rollback domain, which this
project does not have and is not pretending to.

### What the ledger is for, and what it is not — A9

**The primary defence against reuse is 64 bytes of fresh entropy per signing
attempt. This store is not that.** Because the ruled KDF binds `entropy64`
*together with* `TransactionContextID`, repeated entropy across *different*
contexts does not produce a repeated scalar. What the store catches is
**exact-context repeats**, **rollback**, and **implementation bugs**.

Calling it "defence-in-depth against a CSPRNG that silently repeats" overstates
it. A9 exists because a review packet did exactly that.

### What the ledger does not protect against

* **Full-directory snapshot rollback**, as above.
* **`k_local` lives beside the signer's other key material.** The hostile
  same-host process that motivated keying the entries can read `k_local` too.
  Keyed storage is an **offline file-copy and backup-hygiene defence**, and that
  is the whole claim (`REVIEW-013c` §3a B-IV).
* **The store still reveals, to a local reader, how many signing attempts
  occurred and when.** Amount, counterparty and issuance are not in it. It is
  not opaque.
* Nothing here creates a ledger-side defence. Both bad Sends in E-63 were
  accepted by rippled.

## Real key generation and onboarding — architecture §6 step 6

`src/keygen.rs` and `src/onboarding.rs`. **Built and executed 2026-08-20.**

### The derivation, and the one place it is specified

`docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md` §2 is the **only** copy of
the construction. `src/keygen.rs` is an implementation of that prose — written
from the prose, not from `tools/spike-keygen-2026-08-18/t-keygen-construction.ts`
— and then checked against that spike's published vectors, which is the point of
having vectors. `tests/keygen_kat.rs`.

⚠ **The reduction is TOTAL and has no error type at all.** `scalar::reduce_wide`
returns `Result<_, ZeroScalar>` and its callers must abort; keygen's
`reduce_wide_total` returns a `Scalar` and cannot fail. That asymmetry is ruled,
not incidental: the other rulings take **fresh entropy**, so aborting costs one
transaction, while keygen's input is a **fixed seed**, so an abort would be
permanent and that holder could never participate. Architecture §4 has all four
randomness rules side by side. **Do not "correct" this back to `mod n` with an
abort.**

### Two key sources, because condition 2 requires it

| `elgamal_key_source` | Where `sk_A` comes from | What the holder keeps |
|---|---|---|
| `derived-from-master-seed` | the ruled derivation, from `account_seed` | **one** secret — the seed they already have |
| `standalone` | the library's CSPRNG, in `elgamal_sk` / `elgamal_pk` | **two** secrets. It is a second thing to lose |

An **absent** `elgamal_key_source` is read as `standalone`, because that is what
every profile written before this milestone already was. It is not silently
upgraded, and `a_profile_with_no_declared_source_is_standalone_not_derived` is
what fails if it ever is.

⚠ **`ElGamalKeypair::try_from_parts` recomputes `sk·G` and refuses a pair that
does not correspond.** `from_parts` checked nothing, and the failure it allowed
is the worst one available here: a profile whose `elgamal_pk` is not
`elgamal_sk·G` registers a key **nobody holds the secret for**, and then encrypts
every balance to it. Every step succeeds — rippled verifies against the key on
the ledger and the ledger's key is the wrong one — and with no rotation and no
recovery the balance is gone permanently (`CLAIMS.md` E-120).

### A profile that holds no secret at all

`"account_seed": "prompt"` makes the daemon read the seed **from its own
terminal** at start, echo suppressed where the OS provides it. With the derived
source **the profile carries no secret**, which is the only arrangement here that
satisfies the ruling's §4 clause *plaintext seed and `sk_A` are never written to
non-volatile storage* — as a statement about **what this program writes**.

⚠ **It is not a statement about what the operating system writes.** Nothing here
pins the pages against swap: `mlock` is **not implemented** and is a named gap,
so a seed typed into this window can still reach the disk by a route this program
does not control. "No secret is on disk" would be a stronger sentence than the
evidence supports, and `CLAIMS.md` P-5 is why it is not the sentence used.

⚠ **Opt-in**, because the Devnet drivers run the daemon without a terminal. When
stdin is not a terminal the holder is **told** the input will be echoed, rather
than left to assume a protection that is not being provided.

⚠ **None of this defeats an adversary with code execution**, who reads `sk_A`
out of process memory while it is live (ruling §8 item 2). `Zeroizing` overwrites
the buffers it owns and claims exactly that. **`mlock` is not implemented and is
named as a gap, not claimed.**

### Onboarding — `cargo run --bin onboard`

Issue #11, which is the larger half of the step. It reads the ledger **first**,
because the branch it makes is a ledger read:

* `lsfDisableMaster`, a regular key, or a signer list — **each one on its own** —
  means the master seed is not this account's spending authority. The
  recommended source flips to `standalone` and the ruling's condition-2 warning
  becomes mandatory.
* ⚠ **The two that used to branch nowhere now do.** `lsfDisableMaster` already
  refused in `preflight` and `binding_differs`; a regular key and a signer list
  were read and used for nothing, which is what `REVIEW-016` recorded. They are
  step 6's question, not signing's, and they are answered here.
* The disclosures are shown **before the seed is asked for**. A warning shown
  after a holder has typed their master seed into a process is not a warning,
  it is a receipt — `every_required_disclosure_is_shown_before_the_seed_is_asked_for`
  is what fails if that ordering is lost.
* Deriving on a retired-master account is **possible**, and costs a **second**
  typed sentence. ⚠ The ruling says *warn and offer*, not refuse. Inventing a
  refusal would be inventing a rule.

**It takes no secret on argv**, and refuses to start if any argument **decodes**
as a family seed — argv is visible to every process on the machine, which the
issue #1 threat model puts in scope, and a pasted seed lands in a shell history
file where it outlives the session. Under the ruled derivation that seed is a
permanent decryption credential, so the exposure does not expire either. The seed
is typed into this process's own stdin.

⚠ **Decoded, not guessed at by shape**, and the check lives in `onboarding`
rather than in the binary's `main` **so that it can be tested** — a refusal
inside a `fn main` is a claim with no falsifier, which is what this paragraph
described until `claims-check` asked what would fail if it were false.
`a_family_seed_on_argv_is_recognised_and_ordinary_arguments_are_not` drives both
seed types and six ordinary arguments, including `s3.example.com/rpc-…`, which a
leading-`s`-plus-length heuristic would have refused.

**It writes no file and submits nothing.** It prints the profile lines for a
human to place, because writing a plaintext secret to disk is what §4 forbids and
a tool that did it silently would be the worst of both.

### The registering Convert now says so on the confirmation

A `ConfidentialMPTConvert` that carries `HolderEncryptionKey` is the most
irreversible transaction this signer builds, and until 2026-08-20 the
confirmation rendered it identically to one that does not. It now names the key
being registered and says that the registration can never be changed or rotated,
that a second attempt is `tecDUPLICATE`, and that if the matching secret ever
becomes unreachable so is every amount encrypted to it. **The control is that a
non-registering Convert does not carry the warning** — a screen that shouts on
every transaction is a screen nobody reads.

⚠ ~~*"…and says that it can never be changed, rotated or recovered"*~~ — **that
sentence described the code for exactly as long as it took `REVIEW-020` round one
to delete it from the code**, and it survived here for the length of one commit.
The confirmation must **not** say a registered key can never be recovered: under
the derived source it is reconstructible from the seed, which is the only thing
deriving buys (E-125). A negative assertion in
`a_registering_convert_says_on_the_confirmation_that_it_registers_a_key` is what
fails if it comes back; nothing was checking this paragraph.

### Validated against upstream's own tests, and against their caveat

`CLAUDE.md` requires validation against `test_pok_sk`, `test_elgamal` and
`test_elgamal_verify`. Those are C programs over **random** keys, so
`tests/keygen_interop.rs` drives their properties with a **derived** key: an
ElGamal round trip, the library's revealed-amount check, and a registration proof
of knowledge with its three upstream negatives.

⚠ **And it drives the caveat, which matters more.** *"A constant `sk_A = 1`
passes all three"* is a claim, so `a_constant_sk_of_one_passes_every_upstream_check`
runs `sk_A = 1` through every one of them and asserts they **pass**. That is what
makes `tests/keygen_kat.rs` load-bearing instead of decorative: interop says a key
is well-formed, and says nothing at all about whether it was derived correctly.

### `CLAIMS.md` F-19 — the registration proof is account-bound

The library accepts a NULL `context_id` and then emits an account-unbound,
replayable registration proof. rippled cannot reach that path; this signer links
the library directly and could. Ruling §5 item 4 says to assert non-NULL at the
call site, and here that assertion is a **type**: `prover::convert_proof` takes
`&[u8; 32]`, and `mpt::secp256k1_mpt_pok_sk_prove` is declared but never
re-exported.

What is testable is the consequence, and it is tested:
`the_registration_proof_does_not_transfer_to_another_account` shows a proof made
for one account's context failing under another's, and under the same account at
a different sequence.

### Executed on Devnet

A `ConfidentialMPTConvert` registering a **derived** `HolderEncryptionKey` was
accepted: `tesSUCCESS`, validated,
`39C7834DD71742B4FEE27D521B4953799B70866443478DF6B7C98901EC8A31D9`, holder
`rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8`. Then a `ConfidentialMPTMergeInbox` and
**two** Sends, and the balance decrypted under the derived secret by the driver
rather than by the signer.

⚠ **The check that makes it evidence:** the `HolderEncryptionKey` on the
validated ledger entry was compared against a **second, independent TypeScript
implementation** of the ruling's §2 — `02B0BD9C…87097C` — so the agreement is
between two implementations mediated by the ledger, not between one
implementation and itself. The account's seed is `sEd…`, so the **`ed25519`
preimage** is the arm that ran (`CLAIMS.md` E-118).

**And §(e)'s only benefit, executed:** `onboard` in recovery mode, given nothing
but the seed and the address, reproduced the registered key — `RECOVERED`
(E-119). ⚠ **That is not issue #10.** It shows the seed is sufficient *given the
derivation*. Whether the derivation is reachable by a holder who does not have
this repository is condition 1, and no code discharges it.

`tools/spike-step6-2026-08-20/devnet-derived-key.ts`.
`observer-harness.ts --assert-no-r-reuse` PASSED, 7 transactions, exit 0.

⚠ **`tesSUCCESS` is not a confidentiality claim, and neither is a derived key.**
Amounts are hidden; identities, counterparties, timing and frequency are not, and
the issuer decrypts every balance by construction (`CLAIMS.md` P-4, P-9, P-11).
⚠ **Amendment status is a reading, not knowledge** — `ConfidentialTransfer`,
`PermissionedDomains` and `SingleAssetVault` were observed `ENABLED` on Devnet at
**2026-08-20T06:17:35Z** for that milestone, and **re-observed `ENABLED` at
2026-08-24T14:42:31Z** for the ConvertBack run below. **Both readings expire**,
and the second one does not make the first a standing fact. Re-run
`tools/check-amendments.ts` and date-stamp the answer.

⚠ **`ConfidentialTransfer` is `supported, not enabled` on TESTNET** under the
same 2026-08-24 reading. Devnet and Testnet are not interchangeable here, and
that is worth not discovering by accident.

### Reviewed — `REVIEW-020`, two rounds, four legs

**Not one finding touched the derivation.** Both round-one legs independently
walked the ruling's §2 against `src/keygen.rs` — framing, field order, `u32be`
lengths, label bytes, the Extract/Expand split, the total reduction, SEC1
compression — and both reported it byte-exact. Neither recommended putting an
abort path back. **Everything that landed was in the onboarding half**, which is
what issue #11 said when it called the cryptography the small part.

**Round one, three upheld.**

* **The confirmation contradicted the one thing deriving buys.** It told a holder,
  at the approval step, that the key being registered *"can never be recovered"* —
  false for a derived key, and false about the benefit the ruling trades a
  permanent decryption credential for. ⚠ The fix is narrow because the sentence
  beside it is right: `CLAIMS.md` P-10 forbids claiming **XLS-96** supports
  rotation or recovery, and reconstruction under the W-CONF derivation is a
  different sentence. Both now appear, attributed. **Pinned by a negative
  assertion** — only those catch a sentence coming back.
* **`"THIS IS THE ONLY TIME THE SECRET IS SHOWN"` printed it twice**, and the test
  guarding it asserted a count of **two** while its name said "once". E-113's
  shape exactly. Now printed once, count asserted.
* **The ordering test drove only a clean account**, leaving
  `RETIRED_MASTER_KEY_WARNING` — the one disclosure condition 2 exists for —
  outside the assertion.

⚠ **Two round-one claims were wrong and are pinned by tests, not notes** — the
fifth time. One leg's only HIGH was that `into_keypair` *"cannot compile"*;
`[u8; 32]` is `Copy`, so it is a copy and not a move. The worry underneath is
real and now has a test: the secret must survive its source being zeroized. The
other read a disclosure as claiming `sk_A` decrypts counterparties' ciphertexts;
it does not say that, and every amount this account is party to genuinely does
carry a ciphertext under this account's key.

**Round two found no defect in any fix — and two false sentences written about
them**, which is the category a second round exists for.

* **The banner attributed two layers' rules to one protocol:** *"Neither key can
  be ROTATED: XLS-0096 has no rotation and no recovery."* XLS-0096 does not govern
  XRPL account keys, and an account's spending authority **can** be moved — which
  is the case this signer warns about a few lines below. ⚠ **The more useful half
  is where the sentence was living:** six inline `eprintln!` lines, the one
  disclosure surface in this project that was not a constant with an asserted
  wording. It is now, negative assertion included.
* **The explanation of why `try_from_parts` cannot catch an aliasing bug was
  wrong**, and mis-described the function a finding upheld an hour earlier had
  just made validating. The real reason is temporal, not about what it checks.

`REVIEW-020a` through `REVIEW-020f`.

## `ConfidentialMPTConvertBack` — the facility's exit, architecture §6 step 7

`src/prover.rs`, `src/txn.rs`, `src/session.rs`. **Built and executed 2026-08-24.**

Until 2026-08-24 this signer refused ConvertBack by name, and **the refusal was
the right call for as long as it stood.** `REVIEW-015` round three found `parse`
handing ConvertBack *Convert's* field set, and rather than invent a field set
nothing had ever exercised, the type was refused. Architecture §6 step 7 needs
the facility's wind-down, so the field table was **fetched from
`XRPLF/XRPL-Standards` and read at source**.

### The three differences, which are the whole reason this needed its own work

| | Convert (§7.2) | ConvertBack (§10.3) |
|---|---|---|
| `ZKProof` | **optional**, 64 bytes, required only when registering a key | **required**, 816 bytes |
| `HolderEncryptionKey` | optional — this is how a key is registered | **not a field of this transaction at all** |
| `BalanceCommitment` | not a field | **required**, 33 bytes |

Under the shared allowlist a valid ConvertBack was rejected **twice over** — once
for a `BalanceCommitment` the list omitted, once for a `ZKProof` with no
`HolderEncryptionKey` beside it — and an invalid one, carrying a key this
transaction cannot register, was accepted. Every one of the three now has a
**negative** assertion in `tests/convert_back.rs`, because only a negative
assertion catches a field set coming back.

### The witness is the BALANCE, not the amount

`mpt_get_convert_back_proof` takes `(b, ρ, sk_A)` — 128 bytes of compact sigma
proof over the balance, then a **single** 688-byte Bulletproof over the
**remainder** `b − m`, because `pc_rem = pc_b − m·G` keeps `pc_b`'s own blinding.
`vendor-verify.sh` already asserted that ordering independently, by checking that
`proof_compact_convertback.c` passes `sk_offset = 64` where every other compact
proof passes `0`.

⚠ **The balance ciphertext's randomness is not ours and is not part of the
witness.** The proof links it to `pc_b` through `sk_A` — `b₂ − b·G = sk_A·b₁` —
which is the same fact ADR-0001 §(a) rests on and the reason a historical `ρ`
never has to be kept.

### Two scalars, two jobs, and `r` is published

`r` encrypts `m` to the holder, the issuer and any auditor, and goes on chain in
`BlindingFactor` so validators can recheck the ciphertexts against the plaintext
`MPTAmount` (§10.4.2 item 6). `ρ` blinds `pc_b` and stays secret. §7's **both**
pre-sign rules run before a proof exists — the shared-`C₁` check and the
published-blinding-factor check — where the Convert path only ever had the
second.

### Three preconditions, all checked before entropy is drawn

* **The amount must not exceed the balance.** The library refuses this itself
  with a bare `-1`; refusing here names both numbers (`UPSTREAM-FEEDBACK.md`
  U-45).
* **A `HolderEncryptionKey` must already be registered** (§10.4.2 item 3).
  ⚠ **This is the one condition a ConvertBack has that a Send never reaches:**
  `holder_key_is` answers `None` when nothing is registered, and `None` is a
  *pass* — correctly, because that is the initialising Convert's state.
* **The issuance's `ConfidentialOutstandingAmount` must cover it** (§10.4.2
  item 5). It is read as a **string**, as rippled serialises every `UINT64`;
  reading it as a number sees every value as absent, and
  `the_confidential_outstanding_check_is_not_reading_every_value_as_zero` is the
  control that catches a refusal firing for the wrong reason.

⚠ **`confidential_outstanding` is deliberately NOT a field of `IssuanceState`.**
`binding_differs` compares that struct whole, and this number moves whenever
*any* holder converts — none of which a transaction of ours binds to. Put there
it would turn every busy ledger into `REFUSED_LEDGER_MOVED`.

### The confirmation says the amount is PUBLIC

The opposite of a Send, and the difference is the disclosure. A Send's amount is
decrypted out of a ciphertext; a ConvertBack's is on the wire in the clear and
**becomes a public balance**. Rendering them identically would tell a holder that
a public withdrawal is confidential.

### Executed on Devnet

Two ConvertBacks on `rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8` — **under a key from
the ruled derivation, with no ElGamal secret in the profile at all**: a partial
one of 95 (`34117EFE…7ABD7FB0`) and one of the **entire remaining balance**, 191
(`C3436395…F00C209BC`), both validated.

⚠ **`tesSUCCESS` was not accepted as the evidence.** All four of §10.5's state
changes were checked against ledger state before and after: public `sfMPTAmount`
**+exactly** the amount, `sfConfidentialOutstandingAmount` **−exactly** the
amount, `sfConfidentialBalanceVersion` +1, and the remaining
`sfConfidentialBalanceSpending` **decrypted** to the expected remainder. A
`tesSUCCESS` alone would not distinguish a correct homomorphic subtraction from a
lucky one. `CLAIMS.md` E-131.

The **pristine upstream** `85dbac7` verifier accepts the 816-byte proof at both a
non-zero and a zero remainder — and rejects a corrupted one **and** one verified
against a wrong `MPTAmount`, which is the sharper control: `MPTAmount` is in the
clear, and a proof that did not bind it would let any amount be withdrawn against
any range proof.

`observer-harness.ts --assert-no-r-reuse` PASSED, 9 transactions, exit 0.

⚠ **This is a transaction type, not the facility.** ~~and B-15's step-7 gate is
still shut~~ — **struck 2026-08-25: the gate was ANSWERED by the project owner**
(`docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md`).
Loopback for the facility's ledger reads, and `fail_hard` set by whatever
submits — **which is not this signer, and that is deliberate.** Neither
obligation is enforced here: this binary will read a remote endpoint if it is
pointed at one (it prints `ledger::REMOTE_SOURCE_DISCLOSURE` when it does), and
it cannot set `fail_hard` because it does not submit. **Both are kept in
`facility/`** — `facility/src/loopback.ts` refuses a non-loopback endpoint (⚠ unless the risk is accepted by name — `CLAIMS.md` E-151),
`facility/src/submit.ts` has no path that omits the flag, and
`tools/check-loopback.ts` is the gate on the first.

## Reviewed

**`REVIEW-015`, three rounds, six legs.** Round one reviewed the implementation;
**round two reviewed the fixes**, which is this project's rule and which earned
its place — it found a defect introduced *by* a fix, a test that passed for the
wrong reason, and four sentences that overstated what the fixes established.

**Both round-one legs independently found the same defect:** the signer built a
**four-participant** proof when an auditor key was configured and serialised
**three** ciphertexts. Every Send on an auditor-enabled issuance would have been
unverifiable. It hid because the Devnet issuance has no auditor and no fixture
had one — a whole configuration branch with no coverage, looking fully
exercised.

**Round three was run against this project's own two-round rule** — because
round two's fixes changed `Convert`'s wire format on the adjudicator's own
reading of the spec, with no second reader. It found that `parse` had given
`ConvertBack` *Convert's* field set; XLS-0096 §10.3 contradicts that in three
places, and a valid ConvertBack would have been rejected twice over. ~~`parse`
now **refuses `ConvertBack` by name** rather than implementing a field set
nothing has ever exercised.~~ **Struck 2026-08-24 — it implements §10.3's field
set now, read at source, and each of the three differences has a negative
assertion.** The refusal was correct while nothing had exercised one; what made
it correct was that the field table had not been read, and that is what changed.

⚠ **Two leg recommendations were wrong and are recorded as wrong.** One proposed
field code 42 for `AuditorEncryptedAmount`; 42 is `AuditorEncryptedBalance`, a
different field on a different object. One proposed removing auditor support
from `Convert`; XLS-0096 §7.2 **requires** it there *when the issuance carries
an `AuditorEncryptionKey`* — conditional, not unconditional, and the compressed
form of that sentence was itself a round-three finding. *A review finding is
evidence, not an instruction.* Dispositions are in `REVIEW-015c`.

## Executed on Devnet

A `ConfidentialMPTSend` built, proved and signed **entirely by this binary** was
accepted: `tesSUCCESS`, validated,
`9170912934A842CE90494E66485ADC82739B2276ECD48E2900A1F62A164F9DB0` (E-84). The
hash this signer computed matched the node's exactly, which is what says the
serialisation is canonical rather than merely accepted.

Architecture §6 step 4's own falsifier —
`observer-harness.ts --assert-no-r-reuse` — **had never been run against
anything this project produced** (E-76). It has now, against a clean account
whose every confidential transaction came from this signer:
`rnU7af8QRAgE2Qp7qeAYJLgeMmmTcbvX81`. **ASSERTION PASSED**, exit 0 (E-85).

### Again on 2026-08-19, from state the signer read for itself

The step-3 run above was handed nine ledger values in a file. This one was not.

A `ConfidentialMPTSend` built, proved and signed entirely by this binary **from
a ledger it read itself** was accepted: `tesSUCCESS`, validated,
`C63CDCB41183DF55A1CBE9B955AD5EB5C7FE037037AC87EDE31DC4799C5C0EDE`, hash
matching the node's (E-101). The driver passed a seed, an issuance ID, a fee, a
search bound and an endpoint — **no sequence number, no balance, no balance
version, no issuer key, no destination key.**

Then `devnet-clean-account.ts` drove a Convert and **two** Sends on a fresh
holder, `rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH`, all `tesSUCCESS`. The second
Send's sequence and balance version were read by the signer with **no help from
the driver**, which is the property the step exists for — before step 2 the
driver had to re-read and re-inject them between the two.

`observer-harness.ts --assert-no-r-reuse` **PASSED**, exit 0, 9 transactions.
`store-check` reports the three signings that store saw as **RECORDED,
committed**; a fourth published `C₁` belongs to an aborted earlier run whose
store the driver wiped at start, and is correctly reported **NOT IN THE
LEDGER**.

⚠ **The Devnet chain is not the one E-84 and E-85 used.** Those accounts' seeds
went with `/tmp/wconf/state.json` (E-97). The old transactions stay verifiable;
this is a fresh chain.

⚠ **`tesSUCCESS` is not a confidentiality claim.** Amounts are hidden;
identities, counterparties, timing and frequency are not, and the issuer
decrypts everything (`CLAIMS.md` P-4, P-9, P-11).

## ⚠ The build depends on an ephemeral directory

`/tmp/wconf` holds the vendored tree, the built libraries and both `mptool`
binaries, and **it does not survive a `/tmp` clean**. When it goes, `cargo build`
stops with `build.rs` naming what to run — which is the intended behaviour, and
it works. **`tools/rebuild-env.sh` is that recovery**, tested from a genuinely
empty `/tmp/wconf` and idempotent against a complete one.

**The vendored half is reproducible by design**: the patch is committed, so
`git clone` at the pin plus `git apply` plus `build.sh` restores it exactly, and
`vendor-verify.sh` proves the restoration. That is issue #2 path A's central
argument, and on 2026-08-19 it was tested by accident and held (`CLAIMS.md`
E-97).

⚠ **It held for the signer and not for the harnesses, and that was invisible.**
`build.sh` produces `mptool-patched`, `mptool-pristine` and
`mptool-deterministic`; the plain `/tmp/wconf/mptool` that five older tools call
by name is produced by nothing. So a rebuilt environment passed
`vendor-verify.sh`, built the signer, ran every test — and could not rebuild a
Devnet chain. `rebuild-env.sh` now creates it, pointed at **`mptool-pristine`**,
which is what the 2026-08-17 tree actually was (`CLAIMS.md` E-99).

**The Devnet half is not.** `state.json` carries throwaway account seeds and
ElGamal secrets that cannot be regenerated. The accounts and every recorded
transaction hash stay verifiable on Devnet; the ability to *drive* them does not.
Rebuilding means a fresh chain from `tools/spike-2026-08-17/convert.ts`.

## What the signer does NOT do

* ~~**It does not read the ledger.** Architecture §6 step 2 is not built.
  Sequence numbers, balances, balance versions and other holders' encryption
  keys come from a **holder profile file** the operator points
  `WCONF_SIGNER_PROFILE` at. That file is trusted input.~~ **Struck 2026-08-19 —
  step 2 is built.** See below. The profile carries secrets and policy only, and
  **refuses a ledger field by name** rather than ignoring it.
* **It does not submit.** It signs and hands back a blob. Whoever receives it
  submits it.
* ~~**It does not do `ConfidentialMPTConvertBack`.** `REFUSED_NOT_IMPLEMENTED`,
  by name.~~ **Struck 2026-08-24 — it does, and it has been executed on Devnet.**
  See below. ⚠ **`REFUSED_NOT_IMPLEMENTED` is gone with it**: ConvertBack was
  that code's only producer, and a refusal code a client can never receive is
  not a distinction (`CLAIMS.md` E-130). An operation this signer does not build
  — `ConfidentialMPTMergeInbox`, `ConfidentialMPTClawback` — is refused as an
  unknown operation, **before a grant can be minted for it**.
* **It does not do `ConfidentialMPTMergeInbox` or `ConfidentialMPTClawback`.**
  Neither carries a proof this signer generates; MergeInbox carries none at all,
  and Clawback is issuer-side.
* ~~**It does not generate real keys.** Step 6, and it still owes issues #10
  and #11 — publication of the derivation, and onboarding that branches on
  ledger state.~~ **Struck 2026-08-20 — step 6 is built and executed.** What
  remains true is narrower and is **issue #10**: the derivation is specified in
  one repository document and is **not a published standard**, so a holder who
  has their seed and not this repository cannot reconstruct their key. That is
  the entire benefit the ruling trades a permanent decryption credential for,
  and **no code discharges it** — an XLS informational draft would, and filing
  one is a Desktop-project decision.

## Protocol

One JSON object per line, request and response.

```jsonc
{"type":"status"}
{"type":"pair","operations":["ConfidentialMPTSend"],"ttl_secs":300}
{"type":"prepare","grant":"grant-00000001","operation":"ConfidentialMPTSend",
 "issuance_id":"<48 hex>","destination":"r...","amount":"100",
 "claimed":{"label":"anything you like"}}   // `claimed` is carried and IGNORED
```

A successful `prepare` returns `{"status":"signed","tx_blob":"…","hash":"…"}`.

Refusal codes are distinct by design: `REFUSED_CALLER_RANDOMNESS`,
`REFUSED_UNAUTHORIZED`, `REFUSED_MALFORMED`, `REFUSED_DECLINED_BY_HOLDER`,
`REFUSED_RANDOMNESS_REUSE`,
`REFUSED_RANDOMNESS_LEDGER_FAULT`, `REFUSED_ENTROPY_UNAVAILABLE`,
`REFUSED_LEDGER_UNAVAILABLE`, `REFUSED_LEDGER_NOT_USABLE`,
`REFUSED_LEDGER_MOVED`, `REFUSED_MASTER_KEY_DISABLED`,
`REFUSED_BALANCE_UNREADABLE`. A client can only decline to collapse errors it
can tell apart.

⚠ **Three of those look alike and mean opposite things.**

* `REFUSED_RANDOMNESS_LEDGER_FAULT` — the **local** append-only randomness
  store. Needs a human in the signer's own window. **Must not be retried.**
* `REFUSED_LEDGER_UNAVAILABLE` — the **XRPL**, unreachable, behind, or
  answering a pinned read from a different ledger. **Retryable**, and a public
  endpoint is a cluster so the next call may reach a different host.
  ⚠ The last of those was `REFUSED_LEDGER_NOT_USABLE` for one commit: the
  round-one fix routed it through `Malformed`, so **the one condition most
  likely to clear itself told the client to give up**. Round two of
  `REVIEW-016` found it — a defect introduced *by* a fix, which is what a
  second round is for.
* `REFUSED_LEDGER_NOT_USABLE` — the XRPL endpoint is wrong: not Devnet,
  plaintext to a remote host, or answering something this signer will not
  interpret. **An operator must change something.** Split out after
  `REVIEW-016` found all three collapsed into the middle one, whose text ends
  *"Retryable"* — telling a client to retry a misconfiguration that will never
  resolve is `REVIEW-013c` §3a B-VII's finding one level down.

## Environment

| Variable | Default | What it is |
|---|---|---|
| `WCONF_SIGNER_PROFILE` | — **required** | The holder profile: **secrets and policy only** — and with `elgamal_key_source: derived-from-master-seed` plus `"account_seed": "prompt"`, **no secret at all**. The daemon exits 2 without it and will not invent one |
| `WCONF_LEDGER_ENDPOINT` | the profile's `ledger_endpoint` | Where to read the ledger. `https://` required unless the host is loopback |
| `WCONF_SIGNER_SOCKET` | `$XDG_RUNTIME_DIR/wconf-signer-<uid>/signer.sock` | Keep it under ~100 bytes; `sun_path` is 104 on macOS. Give it its own directory |
| `WCONF_SIGNER_STORE` | `<socket dir>/randomness` | The randomness ledger |
| `WCONF_MPT_SRC` | `/tmp/wconf/mpt-crypto` | The patched checkout. Build-time |
| `WCONF_MPT_LIB` | `/tmp/wconf/native` | The patched static library. Build-time |
| `WCONF_SECP256K1` | `/tmp/wconf/secp256k1` | Built secp256k1 v0.7.1. Build-time |
