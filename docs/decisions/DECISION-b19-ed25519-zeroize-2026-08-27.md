# DECISION — `CLAIMS.md` B-19: `ed25519-dalek`'s `zeroize` feature

**Date:** 2026-08-27. **Decided by:** the coding session, as adjudicator.
**Status:** DECIDED — **enable it.** Applied in the same session.

⚠⚠ **CORRECTED AGAIN 2026-08-27, AND THIS ONE IS THE PREMISE, NOT THE WORDING —
`CLAIMS.md` E-171. THE FEATURE WAS NEVER OFF.**

`ed25519-dalek`'s `std` feature implies `alloc`, and `alloc` lists
`"zeroize/alloc"` **without the `?` sigil** that the `serde?/alloc` entry two
lines above it carries. The historical line at `16e2e58` —
`default-features = false, features = ["std"]` — therefore resolved to
**`alloc,std,zeroize`**. `ExpandedSecretKey` and `SigningKey` were wiped on drop
for the whole of the nine days §2 is about, and **removing the word `zeroize`
from this manifest still builds today**, which §5 says is impossible.

**What survives:** enabling it explicitly is worth doing. An implied feature is
one upstream refactor away from vanishing, and it is now pinned by a probe
instead of by a sentence. **What does not survive:** §1's and §2's account of a
consequence, and §5's falsifier.

⚠ **This was accepted by three `REVIEW-025` legs and a `REVIEW-026` round.** None
of them ran it, and neither did the session that wrote it — **reading a manifest
is not running one**, and a feature-resolution claim has no falsifier that
reading can supply. `tools/check-zeroize-bounds.py` is that falsifier now; it
exists because **B-21** needed one and the B-19 arm was included on the strength
of the sentence in §5. It reported `STILL BUILDS FALSE` on its first run.

⚠ **Corrected 2026-08-27 after `REVIEW-025` round one.** Both external legs
accepted B-19 and both corrected its wording; the corrections are marked ⚠ below.
It is no longer true that this decision has had no leg — it has had two, on the
narrow question, inside the B-16 packet. ⚠ **Two legs and a round accepted a
false premise, which is what E-171 is about**: a leg checks what the packet
makes checkable.

It is a dependency hygiene change, not a cryptographic design change: it alters
no construction, no byte on the wire, no test vector, and ⚠ **no `wconf-signer`
callable API or wire format** — it does newly expose two `ZeroizeOnDrop` trait
implementations from the dependency, which is what §5's check depends on, so
"no API" full stop was wrong (`REVIEW-025`, Codex leg). It rides into `REVIEW-025`'s two
build rounds alongside B-16 and is called out there explicitly so a reviewer can
reject it separately. `CLAUDE.md`'s "full adversarial rotation before
implementation" gate is for architecture, trust boundaries and cryptographic
design; a `Drop` impl on a struct this crate already owns is none of those.

⚠ **Its justification is NOT the nonce ruling's, deliberately.** `REVIEW-024` §9
finding 3 filed this as B-19 and said so: *"a fix to it should not inherit a
nonce ruling's justification."* Nothing below argues from the threat model that
`REVIEW-018` and `REVIEW-024` argue from.

---

## 1. The finding, restated and verified at source today

`signer/Cargo.toml:16`

```toml
ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
```

`ed25519-dalek-2.2.0/Cargo.toml`

```toml
default  = ["fast", "std", "zeroize"]
zeroize  = ["dep:zeroize", "curve25519-dalek/zeroize"]
```

So `zeroize` is **off**, and with it:

| Site | Source | Effect with the feature off |
|---|---|---|
| `ExpandedSecretKey` | `hazmat.rs:67-73` — `#[cfg(feature = "zeroize")] impl Drop` | scalar and `hash_prefix` are **not** wiped on drop |
| `SigningKey` | `signing.rs:658-666` — `#[cfg(feature = "zeroize")] impl Drop` / `ZeroizeOnDrop` | the 32-byte secret key is **not** wiped on drop |
| `curve25519_dalek::Scalar` | `zeroize = [… "curve25519-dalek/zeroize"]` | no `Zeroize` impl to call |

And `hazmat.rs:39`, the doc comment on `ExpandedSecretKey`, states
unconditionally:

> *Instances of this secret are automatically overwritten with zeroes when they
> fall out of scope.*

**That sentence is false in this build**, and it is false in the one place a
reader would go to check.

## 2. Was the omission intentional? — **No.**

`git log -S'ed25519-dalek = ' -- signer/Cargo.toml` returns exactly one commit:
`16e2e58`, *"Wire the vendored prover into the signer — architecture §6 step 3"*
(2026-08-18). The hunk is three added lines:

```diff
-k256 = { version = "0.13", default-features = false, features = ["arithmetic"] }
+k256 = { version = "0.13", default-features = false, features = ["arithmetic", "ecdsa"] }
+ripemd = "0.1"
+ed25519-dalek = { version = "2", default-features = false, features = ["std"] }
```

The new line copies the `default-features = false` idiom from the `k256` line
directly above it.

⚠ **CORRECTED 2026-08-27, before this document was committed.** It said: *"No
commit message, review, ADR or ruling in this repository mentions `zeroize`
before `REVIEW-024` §9 finding 3."* **That is false, and P-12's falsifier is what
caught it** — `git log -S'zeroize' --all` returns **eleven** commits and eleven
tracked documents mention it. **A negative claim written without running the
search, in a document arguing that an unchecked assumption cost nine days.**

**And what the search found is a worse finding than the one it replaced.** This
project had already decided that key material is zeroized on drop, twice, in
writing, *before* the manifest line was written:

| Where | When | What it says |
|---|---|---|
| `REVIEW-005a` line 251 | **2026-08-17** | *"Witness and key types: `#[derive(Zeroize, ZeroizeOnDrop)]`"* |
| `REVIEW-012-RULING` §4 | **2026-08-18** | *"Seed, `PRK`, `OKM64` and `sk_A` buffers are … **zeroized on drop** and on `SIGINT`/`SIGTERM`/panic"* — a **condition of the keygen ruling** |

**Both conditions were honoured where a session wrote the code by hand.**
`signer/src/keygen.rs:118-129` implements `zeroize()` with a destructor that
calls it, and `zeroize_overwrites_every_byte` and
`the_derived_secret_survives_its_source_being_zeroized` are the tests. `mlock` is
named as a gap rather than claimed.

⚠ **So the accurate statement is narrower and sharper: the ElGamal key got
hand-rolled zeroization and a test; the XRPL ACCOUNT KEY — from which, under the
ruled keygen construction, that ElGamal key is derived — silently did not,
because a dependency default was switched off in a manifest and no review read
the manifest for nine days.** Nothing before `REVIEW-024` §9 finding 3 mentions
`ed25519-dalek`'s `zeroize` **feature**, which is the claim §2 should have made.

⚠ **And the idiom was harmless on the line it was copied from, which is why
nobody noticed.** `k256`'s `default-features = false` does **not** disable
zeroization: `elliptic-curve-0.13.8/Cargo.toml` declares `zeroize` as a
**mandatory** dependency — no `optional = true`, no feature gate — and
`secret_key.rs:318` is a bare `impl<C> ZeroizeOnDrop for SecretKey<C>`. The same
two words have opposite consequences on two adjacent lines, and the difference is
invisible from the manifest. **B-19 is confined to `ed25519-dalek`**, and this
paragraph is what says so rather than an assumption that it is.

## 3. The decision

> **Enable `zeroize`.** `signer/Cargo.toml`'s `ed25519-dalek` line gains
> `"zeroize"`.

⚠ The resulting feature list is `["std", "hazmat", "zeroize"]`, **not**
`["std", "zeroize"]` as this said — `hazmat` is B-16's, on the same line for a
different reason, and eliding it made the manifest look like something it is not
(`REVIEW-026`, Codex leg).

**Why, and the whole argument is hygiene:**

1. ~~It **restores a crate default this project turned off by accident**, on
   evidence rather than inference (§2).~~ ⚠⚠ **FALSE — E-171. Nothing was turned
   off.** What it does is make an **implied** feature explicit, so an upstream
   refactor of `alloc`'s feature list cannot silently remove it.
2. ~~It makes the crate's own documentation true in this build. A reader who
   checks `ExpandedSecretKey` today reads a promise the manifest revokes four
   files away~~ ⚠⚠ **FALSE — E-171. The manifest revoked nothing**; the promise
   was true throughout. `CLAUDE.md`'s standing rule — that a false sentence about
   what the system does is a defect whoever wrote it — **applies to this document
   rather than being satisfied by it.**
3. ⚠ **No new dependency download, and an expected cost that has NOT been
   measured** — which is what this said until `REVIEW-025`'s Codex leg pointed
   out that *"nothing measurable"* and *"a cost of zero"* are unsupported
   claims, not modest ones. `zeroize 1.9.0` is already in `Cargo.lock` (pulled
   in by `elliptic-curve`), so nothing new is fetched. The change adds two
   `Drop` impls; zeroization performs real writes on every drop of a
   `SigningKey` or `ExpandedSecretKey` and may add code. **Expected negligible,
   not benchmarked**, and this project's own rule is that an unmeasured number
   is not a number.
4. ⚠ **`fast` stays off.** `fast = ["curve25519-dalek/precomputed-tables"]` is a
   speed/binary-size trade with no security content, and re-enabling it is not
   this decision. Only `zeroize` is added.

**Why it is being decided now rather than handed over:** ~~the B-16 build puts a
second copy of expanded secret material on the stack. With `zeroize` **off**, the
honest B-16 implementation would have to wipe that material by hand~~ ⚠⚠ **FALSE
PREMISE — E-171: it was never off, so this cost never existed.** The B-16 build
does put a second copy of expanded secret material on the stack, and **B-21 is
what wipes it** — through `Zeroizing`, in its own commit, which is the separation
`REVIEW-024` §9 asked for and got by a different route than this argued.

## 4. ⚠ What this does NOT buy, stated because `CLAIMS.md` P-5 governs

- **It is not a defence against the issue #1 adversary.** A hostile process
  running as the holder's user reads the scalar out of live process memory while
  the signature is being computed. Zeroization shortens a window; it removes no
  channel. `REVIEW-024` §8 makes the same disclaimer about hedging and it applies
  here unchanged.
- **It does not cover every copy.** `ed25519-dalek`'s own
  `impl From<&SecretKey> for ExpandedSecretKey` computes
  `Sha512::default().chain_update(secret_key).finalize()` into a `GenericArray`
  local that **no** feature wipes, and the curve arithmetic's temporaries are
  outside any `Drop` this feature adds. Rust may also leave copies behind a move.
  ⚠ **The B-16 helper has the same residue by construction** — the 64-byte
  SHA-512 output and the 32-byte mask are stack locals — and it is recorded in
  `xrpl.rs` at the site rather than argued away here.
- **It says nothing about swap.** The signer already discloses that it does not
  pin memory, and that disclosure is unchanged.

## 5. The check that it took effect

⚠⚠ **THIS SECTION IS WHERE E-171 LIVES. Its last clause is FALSE and was never
executed.**

`signer/tests/hedged_signing.rs::ed25519_secret_types_implement_zeroize_on_drop`
asserts `ExpandedSecretKey: ZeroizeOnDrop` and `SigningKey: ZeroizeOnDrop`. That
much is **true and worth having**: the bounds are real, the impls are real, and
the test passes.

~~**trait bounds that do not exist without the feature**, so the test fails to
*compile* if the manifest line is reverted, which is the strongest available
falsifier for a `cfg`-gated impl.~~ ⚠ **The bounds do not depend on the word this
decision added.** Reverting the manifest line **compiles**, because `std` already
implies the feature. So this test is a check that the types wipe — which is the
property anyone actually cares about — and **not** a check on the edit. A test
that cannot see the change it was written for is this repository's most frequent
defect (E-161, E-164); this is that shape at the manifest layer.

**What checks it now:** `tools/check-zeroize-bounds.py` part 1, which builds a
scratch crate at four feature sets and requires `[]` to **fail** — without that
control, "it compiles" establishes nothing.

A manifest edit is a claim about a build, so it gets a test that fails if the
claim is false. ⚠ **It got one that could not**, for a day.

⚠ **A runtime "is the buffer zero?" assertion was considered and rejected**: it
would read freed stack memory, which is undefined behaviour, and it would pass or
fail for reasons unrelated to the feature. `CLAIMS.md` E-108's rule — *a revert
that does not compile proves nothing* — inverts here: a **compile failure is**
the proof, because the bound is what the feature adds.

## 6. Rejected alternatives

| Option | Why not |
|---|---|
| **Leave it off, document the gap** | The gap is a false sentence in the dependency's own doc plus an unwiped secret, at a cost of no new dependency and writes on drop that were not measured. ⚠ This said *"at a cost of zero"*, which §3 item 3 had already been corrected for and this row had not (`REVIEW-026`). Documenting is what you do when a fix is expensive. |
| **Enable `default-features = true`** | Sweeps `fast` in with it. Two changes, one line, one of them undiscussed. |
| **Hand-roll wiping in the B-16 helper** | `zeroize`'s job done worse, and it welds B-19's justification to B-16's. `REVIEW-024` §9 finding 3 forbids exactly that. |
| **Add `zeroize` as a direct signer dependency and wipe the helper's locals too** | ⚠ **DONE 2026-08-27 — B-21 is built.** `sha512_zeroizing`, `fresh_aux` and `OneShotAux` all carry `Zeroizing`, checked by `make check-zeroize-bounds` part 2. **Building it is what found E-171.** Originally: ⚠ **Not rejected on merit — deferred as out of scope.** It is a real gap (§4) and it is more than "one manifest line". Filed as **B-21**, and `REVIEW-025`'s Gemini leg independently confirmed the residue is real: `Output<Sha512>` and raw byte arrays implement no `Drop`. ⚠ **One instance was NOT deferred** — `Sha512::digest(k.to_bytes())` copied the secret by value where `as_bytes()` returns a reference, which was gratuitous rather than structural, and is fixed. |
