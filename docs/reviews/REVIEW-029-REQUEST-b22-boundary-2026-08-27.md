# REVIEW-029 PACKET — B-22: where the signer's secret-residue boundary falls

⚠ **THIS PACKET IS THE HISTORICAL RECORD OF WHAT THE LEGS WERE SHOWN AND IS NOT
CORRECTED.** `CLAIMS.md` E-175's precedent: rewriting a packet makes the round
unreviewable. **It contains four errors of fact** — the misclassified
`xrpl.rs:474` caller, the incomplete `holder.rs` list, the `sha512_zeroizing`
drop-in claim, and the `keygen.rs` copy-vs-move claim — **which is the point: two
of them are what the legs found.** They are corrected in the live document at
`docs/decisions/DECISION-REQUEST-b22-derivation-residue-2026-08-27.md` and
registered as `CLAIMS.md` E-177, E-178 and E-179. **Ruled in `REVIEW-029c`.**

---


Frozen commit: 694e01e. Branch: decision/b22-derivation-residue.

DO NOT USE ANY TOOLS — everything you need is inline below.

You are one leg of an adversarial review rotation. Your job is to find what is
WRONG with the decision request in Part 1. The request was written by the coding
session that will implement whatever is ruled, which is the interested party.

---

## Part 1 — THE SUBJECT UNDER REVIEW, in full

# Decision request — B-22: where the signer's secret-residue boundary actually falls

- **Date:** 2026-08-27. **Status: OPEN. Framed by the coding session, not yet ruled.**
- **Tree:** `40b747e`. ⚠ **`git diff cd7637b..40b747e -- signer/` is EMPTY**, so every line number in `B-22-EVIDENCE-derivation-residue-2026-08-27.md` holds unchanged on this tree, and so do the ones added below.
- **Raised by:** the coding session that inherited B-22, per `CLAIMS.md` B-22 and the handover.
- **Decides:** whether the key-derivation path's unwiped secret material is in scope for wiping, and — the part the inherited framing does not ask — **what unit that scope is drawn around.**
- **Blocks:** nothing. B-21 is built, reviewed twice and executed. This is a question about a boundary, not about a defect.
- **Review gate:** `CLAUDE.md` — *"cryptographic design … full adversarial rotation before implementation."* This touches key derivation, so it is above the throwaway-spike tier and the rotation precedes any code.

---

## 0. ⚠ I have re-framed the question, and the re-framing is the substance of this request

The handover asked me to frame B-22 myself and said that if the evidence file steered me, that was a finding. **It steered me, mildly and in one specific way, and the finding is in §3.**

The inherited question is: *should the unwiped sites in `signer/src/xrpl.rs`'s derivation path be wiped?*

**The question I am putting instead is: what is the unit whose secret residue this signer manages, and is there a defensible boundary anywhere short of the whole seed-to-key path?**

The reason is §2. Six facts, established on this tree, say the `xrpl.rs` scope is inherited rather than reasoned — and **one of them says the review legs' own consistency argument, applied honestly, does not stop where they stopped.**

---

## 1. What is being defended against, in one paragraph

`CLAIMS.md` **P-5**, unchanged from B-21 and it must not drift: **wiping narrows a window and removes no channel.** An adversary with code execution reads a scalar while it is live; Rust leaves the source of every move unwiped; `sha2 0.10`'s block buffer holds the last partial block of input and offers no zeroizing drop (P-12 search **recorded in `CLAIMS.md` B-21 and dated 2026-08-27**, over `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6`, `block-buffer 0.10.4` — sources *and* manifests — **zero hits**. ⚠ **Cited, not re-run this session**, and said so rather than re-asserted as fresh). The threat that makes the window worth narrowing at all is `ADR-0001` §(a)'s ruled one: **a hostile same-host process is in scope** (issue #1).

⚠ **The asymmetry that makes B-22 different from B-21 is real and is a fact, not an argument:** B-21's subject was per-signature nonce entropy. B-22's subject is a **master seed**, from which — under the ruled keygen construction — both the account key and the ElGamal *decryption* key are reconstructible for the life of the account. A window on a nonce closes when the signature is made. A window on the seed does not.

---

## 2. Six facts the inherited framing does not carry

Each was established by reading this tree, not by reading `REVIEW-027`.

### F1 — `sha512half`'s callers split cleanly by input secrecy, so no change to `sha512half` is needed at all

| Caller | Input | Secret? |
|---|---|---|
| `xrpl.rs:445` | `entropy` — the master seed | **yes** |
| `xrpl.rs:463`, `:474` | `m` — seed- and pubkey-derived preimages | **yes** |
| `xrpl.rs:566` | `message` — the prehash of a public transaction | no |
| `xrpl.rs:1202` | `self.signing_message()?` | no |
| `xrpl.rs:1245` | `m` — a public preimage | no |

⚠ **The evidence file's caution — *"`sha512half` has PUBLIC callers, so a change there is NOT type-local"* — overstates the coupling by assuming the change would be to `sha512half` itself.** It need not be. `sha512_zeroizing` **already exists**, was built by B-21, is in the same module and returns `Zeroizing<[u8; 64]>` (`xrpl.rs:233`). Routing the three secret callers through it leaves `sha512half` and every public caller untouched. `tests/xrpl_vectors.rs` pins the transaction-hash path through the *public* callers, which nothing would touch.

⚠ **The vectors are not a cost here; they are the falsifier.** `xrpl_vectors.rs:318` — `the_transaction_hash_is_over_the_signed_blob_with_its_prefix` — pins the public caller at `:1245`, which no option touches. `xrpl_vectors.rs:44` — `family_seed_derivation_matches_ripple_keypairs` — pins the **derivation itself against an independent implementation**: same seed, same key out. A wiping change that altered a derived key fails it. **That is the check we want, not a risk we accept.**

### F2 — the master seed is in at least three unwiped heap `String`s before `xrpl.rs` ever sees it

`signer/src/holder.rs`, for a file-based profile:

| Line | Value | Wiped? |
|---|---|---|
| `:272` | `raw` — `std::fs::read_to_string(path)`, the **whole profile JSON, seed included, in plaintext** | **no** |
| `:162` | `p.account_seed: String` — the deserialised field | **no** |
| `:313` | `p.account_seed.clone()` — a third copy | **no** |
| `:310` | `s.trim().to_string()` on the prompted path, plus whatever `ask_seed()` returned | **no** |

`String`'s `Drop` deallocates; it does not zero.

⚠ **This is the load-bearing fact of the whole request.** Both legs called the `xrpl.rs`-only boundary *"arbitrary and inconsistent"*. **Wiping `xrpl.rs`'s locals while these stand does not answer that objection — it relocates the seam from "`xrpl.rs` vs the rest" to "`xrpl.rs` vs `holder.rs`".** If the legs' reason is the reason to act, Option B below does not satisfy it.

### F3 — for a file-based profile the seed is at rest on disk in plaintext, so memory residue is not the binding constraint; for `"account_seed": "prompt"` it is the *only* exposure

`holder.rs:63` defines `PROMPT_FOR_SEED`, and the module header at `:43-44` says a prompted profile *"carries no secret of any kind"*. **These are two different exposure regimes and the legs saw neither**, because `holder.rs` was not in `REVIEW-027`'s packet.

- **File-based:** an adversary who can read this process's memory can also read the profile file. Wiping memory does not narrow a window that the filesystem holds open anyway.
- **Prompted:** the seed exists **only** in memory. Every copy in F2 and in the evidence file's table is the entire exposure, and P-5's *"narrows a window"* is at its strongest.

⚠ **A decision that does not distinguish these two regimes is deciding two different questions with one answer.**

### F4 — `keygen.rs` already answered this question in the affirmative for its own locals, and shares an unwiped decoder

`keygen.rs:221` — `let seed = Zeroizing(entropy);` — and `derive_raw` returns `Zeroizing<64>` for both `PRK` and `OKM64` (`:217, :254, :263`), with the ElGamal `sk` behind `Zeroizing<32>` (`:144, :287`).

⚠ **So the inconsistency the legs named already exists one layer inside the project's own answered case**: the module that derives the ElGamal key wipes its copy of the seed, and calls `xrpl::decode_family_seed` (`:220`) — whose internals do not wipe theirs. **The careful wrapper sits directly downstream of an unwiped decode.**

### F5 — there are two parallel wiping abstractions in this crate

- `keygen::Zeroizing<const N: usize>` (`keygen.rs:112`) — hand-rolled, predates B-21, with its own `Drop` and a redacting `Debug`.
- `zeroize::Zeroizing` — the crate, made a direct dependency by B-21 and used in `xrpl.rs`.

**Any option that adds wiping to a third module should say which of the two it uses, or the next session inherits three.**

### F6 — a heap copy of the master seed per rejection-loop iteration is absent from the evidence file's table — and my first draft of this row got it wrong in the project's signature way

`xrpl.rs:461` — `let mut m = entropy.to_vec();`, inside the closure passed to `derive_scalar` at `:460`. **Heap, one allocation per iteration `i`, unwiped.** The evidence file's table lists `460, 470` as `root` / `intermediate` (the `NonZeroScalar` bindings) and does not list `m`.

⚠⚠ **THIS ROW FIRST SAID "TWO SITES, `:461` AND `:469`", AND BOTH HALVES WERE WRONG.** The second closure is at `:470-474` and its line is `:471` — `let mut m = root_pub.clone();`, which copies the **root public key**, not the seed. There is **one** secret heap copy here, not two, and the line I gave for the second did not exist. I produced it by counting lines in a `sed` window instead of grepping, which is `CLAIMS.md` **E-141 and E-168 exactly**.

⚠⚠ **It was caught by running `claims-check` on this request, not by re-reading it** — and it was written **inside the section arguing that hand-enumerated site lists are unfalsifiable.** That is **E-172's shape**: a correction commit is the most likely place to find a fresh copy of the thing being corrected. **Recorded here rather than silently fixed**, because a request that quietly repaired it would be claiming a cleanliness its own §5 says is unobtainable without a gate.

**So F6's real content is not the site. It is the demonstration**: a hand-enumerated list is a claim with no falsifier — `CLAIMS.md` E-137, E-141, E-165, E-168, E-172, E-175, and now this, inside the document naming them. **Any option chosen below inherits that problem unless it comes with a gate**, which is §5.

⚠ **A second, unenumerated instance, stated as a shape rather than a count:** the family-seed decode path allocates **more than one** heap `Vec<u8>` — `base58check_decode` (`:267`) returns one and calls `b58_decode` (`:315`), which returns another. **I am deliberately not asserting how many.** §5 is why.

---

## 3. ⚠ The steering finding the handover asked for

`B-22-EVIDENCE-derivation-residue-2026-08-27.md` is unusually careful. It carries no options table and no recommendation, it says so, it says why, and it re-derived its line numbers from the tree rather than copying them from the reports. **All of that is real and it should be said before the criticism.**

It steers in **one** way, and the mechanism is the one this project already has a name for.

**Its §1 table header reads *"`signer/src/xrpl.rs` unless noted"*, and nothing is ever noted.** The scope is honest about itself and is never examined. It came from `REVIEW-027`'s packet — the legs were asked about `xrpl.rs`, so they answered about `xrpl.rs` — and the evidence file inherits that boundary while being *about* whether a boundary was drawn correctly. §5 *"Not established here"* lists four open items; **"whether the site list is complete outside `xrpl.rs`" is not among them.**

⚠ **That is E-160's shape — *an excerpt is a diff by another name* — one level up: not an excerpt of a file, but an excerpt of the tree.** F2, F3 and F4 are all outside `xrpl.rs`, and F2 is the fact that decides the question.

Two smaller ones, recorded without inflation:

- §4's asymmetry paragraph is labelled *"a fact and not an argument"*. **It is a fact.** But choosing which fact to elevate to the closing paragraph is framing, and this one points one way. I have kept it — it is in §1 above — because it is true and load-bearing, not because the evidence file put it last.
- §3 leads its costs with B-21's measured diffstat, which is small. **Cost of the comparable change is not cost of this change**, and F2 makes this one larger than B-21's if Option C is taken.

**None of this makes the evidence file wrong.** Every fact in it that I re-checked held.

---

## 4. The options

**A — uphold the deferral. Wipe nothing further; record the sites and close B-22.**

- The deferral's stated reason stands on its own terms: *"widening a security change mid-commit on the strength of a review's advice is how a fix comes to claim more than it did."*
- P-5 already says wiping removes no channel. The block buffer (§1) is unreachable in any option, so **no option delivers "the seed is not in memory"** — only "fewer copies, for less time".
- ⚠ **Costs:** two external legs said the boundary is wrong and this overrules both. F4 stands: `keygen.rs` wipes, `xrpl.rs` does not, and the project has no stated reason for the difference.

**B — wipe `xrpl.rs`'s derivation locals only. What the legs asked for.**

- Cheapest; the machinery exists (`sha512_zeroizing`, F1); the vectors are the falsifier (F1).
- ⚠ **F2 is the objection: this does not answer the argument that motivates it.** It moves the seam rather than removing it, and leaves three plaintext heap copies of the same seed upstream. **A B that is described as answering the legs' consistency objection would be claiming more than it delivers** — which is precisely the failure the deferral was trying to avoid.

**C — wipe the whole seed-to-key path: `holder.rs`'s strings, the decoders, the derivation locals, `keygen.rs`'s remaining gap.**

- The only option that answers the consistency argument on its own terms.
- Threads a zeroizing string type from `read_to_string` to `from_family_seed`; picks one of F5's two abstractions; touches three modules.
- ⚠ **Costs:** larger than B-21's by an unmeasured amount; `serde_json` deserialisation into `RawProfile` produces `p.account_seed` as a plain `String` **inside the deserialiser**, so the copy at `:162` is not straightforwardly reachable — this is the part §5 of the evidence file would have called *not investigated*, and I have not investigated it either. **Whether C is fully achievable is an open technical question, not a settled one.**

**D — C's scope, but bounded by regime: treat `"account_seed": "prompt"` as the mode the wiping is for, and record the file-based profile's on-disk plaintext as a named, disclosed residual.**

- Follows F3. Puts the effort where residue is the *only* exposure and stops claiming benefit where the filesystem already holds the window open.
- ⚠ **Costs:** a regime-dependent security property is harder to state honestly than a flat one, and this project's own history is that the untested disclosure surface is where the false sentence lands.

---

## 5. ⚠ What is required of whichever option is chosen, and this is not negotiable

**A hand-enumerated list of sites is a claim with no falsifier.** `CLAIMS.md` E-137, E-141, E-172 and E-175 are four instances of exactly this defect, the last of them **four wrong counts in a row in the session that wrote the advice against it.** F6 above is a fifth, found in the evidence file, in the space of one morning.

So: **any option that touches code ships with an extension to `make check-zeroize-bounds`, and the gate is verified by breaking it in both directions** (E-165 — both of B-21's gates false-passed before they worked).

**Option A is not exempt.** A decision to wipe nothing still asserts a set of sites that were considered, and **that assertion is exactly as unfalsifiable as a fix count.** If A is chosen, the register row says which sites and the gate pins the phrase.

**And no option may claim more than P-5 permits.** The sentence is *"narrows a window, removes no channel"*. Not "the seed is wiped", not "the key is unrecoverable" — `CLAIMS.md` E-125 is the instance where the second of those shipped for one commit.

---

## 6. What the legs are asked

1. **Is §0's re-framing right, or is it scope creep?** A decision request that widens its own question is doing the thing this project warns about in the other direction. **Say so if that is what this is.**
2. **Does F2 defeat Option B?** Specifically: can B be honestly described in a way that does not claim to have answered the consistency objection?
3. **Is F3's regime split real, or is it a way of not deciding?**
4. **Which option, and why.** ⚠ **A leg that rules A is not failing to engage** — the deferral's reason is a real one and two legs disagreeing with it does not settle it.
5. **What is wrong with this request itself?** It was written by the session that will implement whatever is ruled, which is the interested party once removed.

---

## Part 2 — THE PRIOR EVIDENCE FILE, in full (facts only, written by the session that deferred B-22)

# B-22 — EVIDENCE ONLY: unwiped secret material in the key-derivation path

**Date:** 2026-08-27. **Tree:** `cd7637b`. **Status: NOT a decision, NOT a
decision request, and deliberately NOT a set of options.**

---

## ⚠ What this file is, and what it is not

It is the **facts** a B-22 decision will need, gathered while the tree and the
review legs' reports were in front of the session that deferred B-22.

**It contains no recommendation and no options table, on purpose.** The session
that wrote it is the session that drew the scope boundary B-22 exists to
re-examine, and **framing a choice is how a packet steers its readers** — this
project has the receipts: `REVIEW-024`'s three legs reached unanimity partly
because the adjudicator selected what they read (E-160), and a leg graded a
defect that does not exist from its own excerpt of a file supplied in full
(E-170). An options table written by the interested party is the same failure
one level up.

So: line numbers, verbatim quotations, and measured costs. **Whoever decides
B-22 should frame it themselves.**

⚠ **Line numbers are pinned to `cd7637b` and were re-derived from that tree, not
copied from the review reports.** The legs read `d535589`; every line has moved
since. `CLAIMS.md` E-141 and E-168 are what that caution costs when skipped.

---

## 1. The sites

`signer/src/xrpl.rs` unless noted. "Wiped" means some `Drop` reaches it.

| Line | Value | Why it is secret | Wiped? |
|---|---|---|---|
| **445** | `sha512half(entropy)` passed to `SigningKey::from_bytes` | ⚠ **This expression IS the ed25519 private key.** XRPL's derivation is `sk = SHA512Half(entropy)`. | **No** — a `[u8; 32]` temporary |
| 184 | `full` — the 64-byte `Output<Sha512>` inside `sha512half` | Its first half is the key at 445; the second half is discarded but derived from the same seed | **No** |
| 185 | `out` — the returned `[u8; 32]` | The key itself | **No**, and it is *returned*, so the move source stays too |
| 449 | `Inner::Ed25519(Box::new(sk))` | The `SigningKey` is moved into a `Box` | Box contents **yes** (`ZeroizeOnDrop`); the **move source is not** |
| 460, 470 | `root`, `intermediate` — `k256::NonZeroScalar` | secp256k1 private scalars | **No** `Drop`. ⚠ `NonZeroScalar` implements `Zeroize` but nothing calls it |
| 477 | `sum` — the account scalar | The secp256k1 private key | **No** |
| 478 | `sum.to_bytes()` temporary | Serialised private key | **No** |
| 483 | `AccountKey { inner: Inner::Secp256k1(signing), .. }` | Move of the signing key | Final storage **yes** via drop glue; **move source no** |
| 943 | `candidate` in `derive_scalar` | Rejection-loop candidate private scalars, one per iteration | **No** |
| 893, 926 | `decode_ed25519_seed`, `decode_family_seed` returning `[u8; 16]` | ⚠ **The master seed** — under the ruled keygen construction this is *also* the ElGamal decryption key's input | **No** |
| 315 | `b58_decode` returns `Vec<u8>` | The decoded seed passes through a **heap** buffer | **No**, and it is heap rather than stack |
| 844, 849 | `OneShotAux::next_u32` / `next_u64`, local `b` | 4- and 8-byte chunks of the ECDSA auxiliary entropy | **No** |

⚠ **One claim was REFUTED and is recorded so it is not re-raised.** The Gemini
leg said `AccountKey`/`Inner` are themselves unwiped. **Codex refuted it:**
recursive drop glue reaches the `k256::SigningKey` and the boxed
`ed25519_dalek::SigningKey`, whose destructors zeroize. *Final storage* is
covered; *move sources and temporaries* are not.

⚠ **`sha512half` has PUBLIC callers too** — 566 (message prehash), 1202
(`signing_digest`), 1245. Any change to it touches the transaction-hash path,
which is pinned byte-for-byte by `tests/xrpl_vectors.rs`.

---

## 2. What the review legs said, verbatim

**Gemini (`REVIEW-027a`), answering "what is still unwiped that B-21 should have
covered?":**

> **Verdict on scope:** Leaving `sha512half` out of scope was **the wrong call**.
> In `ed25519_from_entropy`, `sha512half(entropy)` computes
> `Sha512::digest(entropy)`. The 64-byte `full` digest and the returned
> `[u8; 32]` holding root private key material are left completely unwiped on the
> stack. Wiping ephemeral nonce entropy while leaving long-term root seed
> derivation buffers unwiped in the same module is an arbitrary and inconsistent
> boundary.

**Codex (`REVIEW-027b`), same question, independently:**

> **CONFIRMED.** Unwiped secret-bearing sites, most sensitive first: Master-seed
> entropy … secp256k1 private scalars … Ed25519 private key: `sha512half` result
> temporary … `sha512half`: `full` SHA-512 digest, `out`, and its return move;
> the SHA-512 internal block buffer is also not zeroized.

**The reason recorded for deferring**, from `CLAIMS.md` B-22, so the decision can
test it rather than inherit it:

> B-21's registered subject was the signing helper, and widening a security
> change mid-commit on the strength of a review's advice is how a fix comes to
> claim more than it did — `OneShotAux` was already one such widening this
> session.

---

## 3. Costs, measured rather than estimated

- **B-21's comparable change** was `zeroize` as a direct dependency plus three
  `Zeroizing` wrappers: `git diff --numstat d8eb7a3~1 d8eb7a3 -- signer/src/xrpl.rs`
  gives **193 insertions, 20 deletions**, most of the insertions comment, and
  **zero** change to any test vector. No new download — `zeroize 1.9.0` was
  already in `Cargo.lock` before that commit, via `elliptic-curve`
  (`git show d8eb7a3~1:signer/Cargo.lock`).
  ⚠ A first draft of this bullet said *"+213 lines"*, which is the diffstat's
  **changed-line** count and not an insertion count. Both numbers are now the
  command that produces them.
- **Runtime cost: not measured, in either case.** `CLAIMS.md`'s own rule is that
  an unmeasured number is not a number; B-19's *"nothing measurable"* was
  corrected to *"expected negligible, NOT MEASURED"* by two review legs.
- **A falsifier already exists in template form.** `make check-zeroize-bounds`
  part 2 reverts a wiping type to a bare array and requires the build to break;
  part 3 is a source check for call sites; part 4 scans live prose. Any of the
  three extends to these sites without new machinery.
- ⚠ **`sha512half`'s public callers mean a change there is NOT type-local.**
  `tests/xrpl_vectors.rs` pins the transaction-hash path byte-for-byte against
  three independently written JS implementations; that suite is the check.

---

## 4. What P-5 permits to be claimed, whatever is decided

Identical to B-21, and the wording has not moved: **it narrows a window and
removes no channel.** An adversary with code execution reads the scalar while it
is live. Rust leaves the source of every move unwiped. The `Sha512` hasher's own
block buffer holds the secret input and `sha2 0.10` offers no zeroizing drop —
**P-12 search recorded 2026-08-27: `grep -rn "zeroize\|Zeroize\|impl.*Drop"` over
the vendored sources *and* manifests of `sha2 0.10.9`, `digest 0.10.7`,
`crypto-common 0.1.6` and `block-buffer 0.10.4` returns ZERO hits.**

⚠ **One asymmetry is a fact and not an argument**, stated because it will
otherwise be discovered mid-decision: the values at 445, 477 and 893/926 are
**long-lived** — a master seed is reconstructible for the life of the account —
whereas B-21's nonce entropy is per-signature. Whether that difference should
move the boundary is the decision, not this file.

---

## 5. Not established here

- Whether the deferral was right. **That is the decision.**
- Whether these sites are reachable by any real adversary. Nothing here models
  one; P-5 governs.
- Whether wiping them changes any measurable behaviour. Not benchmarked.
- Whether `NonZeroScalar`'s existing `Zeroize` impl can be used directly, or
  whether the rejection loop at 941-948 needs restructuring. **Not investigated.**

---

## Part 3 — SOURCE, complete regions, with real line numbers

⚠ These are EXCERPTS of larger files. CLAIMS.md E-160: *an excerpt is a diff by
another name*, and a leg in this project has already been walked into a false
statement by one. **If your answer depends on something not shown, SAY SO rather
than infer it.** Whole function bodies are given, never fragments.

### 3a. signer/src/xrpl.rs:182-260 — sha512half, and B-21's sha512_zeroizing
```rust
  182  /// XRPL's `SHA512Half`: the first 32 bytes of SHA-512.
  183  pub fn sha512half(data: &[u8]) -> [u8; 32] {
  184      let full = Sha512::digest(data);
  185      let mut out = [0u8; 32];
  186      out.copy_from_slice(&full[..32]);
  187      out
  188  }
  189  
  190  /// SHA-512 into a buffer that wipes itself, and wipe the `Output` it came from.
  191  ///
  192  /// ⚠ **This headline read *"leaving no unwiped digest behind"* and note 2 below
  193  /// contradicted it twelve lines later** — returning the buffer is a move, and a
  194  /// move leaves its source unwiped. Both `REVIEW-027` external legs are why the
  195  /// headline now describes the two wipes it performs rather than an absence it
  196  /// cannot deliver.
  197  ///
  198  /// **`CLAIMS.md` B-21.** `Sha512::digest(..)` returns an `Output<Sha512>` — a
  199  /// `GenericArray` that implements no `Drop` — so over secret input it leaves 64
  200  /// bytes in a stack frame that the next call reuses. `SigningKey` and
  201  /// `ExpandedSecretKey` do have real `Drop` impls (`hazmat.rs:67-76`, read at
  202  /// source) — ⚠ **because `ed25519-dalek`'s `zeroize` feature was always on, not
  203  /// because B-19 turned it on (E-171)** — but that reaches the crate's *types*
  204  /// and nothing this signer hashes itself.
  205  ///
  206  /// The `Output` is copied out and then **explicitly zeroized**, through
  207  /// `zeroize`'s `impl Zeroize for [Z]` rather than `GenericArray`'s own. That is
  208  /// deliberate: `generic-array`'s `zeroize` feature is on in this graph, and
  209  /// `cargo tree -e features -i generic-array` (2026-08-27) attributes it to
  210  /// **`elliptic-curve v0.13.8`** — the `k256` branch, not ours. Resting a
  211  /// security property on a feature **no line of our manifest declares** is
  212  /// precisely E-171's mistake, where `std` silently implied `zeroize` and three
  213  /// documents described a consequence that never happened. Wiping through a
  214  /// slice needs no feature at all.
  215  ///
  216  /// ⚠ **What this does NOT wipe, stated because the alternative is a false
  217  /// guarantee:**
  218  ///
  219  /// 1. The `Sha512` **hasher's own block buffer**, which holds the last partial
  220  ///    block of input — for a 32-byte secret, all of it. ⚠ **P-12, so the search
  221  ///    is recorded rather than the absence asserted:** `grep -rn
  222  ///    "zeroize\|Zeroize\|impl.*Drop"` over the vendored sources of
  223  ///    `sha2 0.10.9`, `digest 0.10.7`, `crypto-common 0.1.6` and
  224  ///    `block-buffer 0.10.4` — sources **and** manifests — returns **zero hits**
  225  ///    (run 2026-08-27). There is no feature to enable and nothing here can reach
  226  ///    inside `CoreWrapper`.
  227  /// 2. The **source of a move**. Rust moves are bitwise copies and do not run
  228  ///    `Drop` on the source, so returning this buffer leaves a copy behind.
  229  /// 3. Anything the optimiser spills to a second stack slot or a register.
  230  ///
  231  /// So this narrows a window and **removes no channel** — P-5, and the same
  232  /// sentence `CLAIMS.md` B-21 carries.
  233  fn sha512_zeroizing(parts: &[&[u8]]) -> Zeroizing<[u8; 64]> {
  234      let mut hasher = Sha512::new();
  235      for part in parts {
  236          hasher.update(part);
  237      }
  238      let mut digest = hasher.finalize();
  239      let mut out = Zeroizing::new([0u8; 64]);
  240      out.copy_from_slice(digest.as_slice());
  241      digest.as_mut_slice().zeroize();
  242      out
  243  }
  244  
  245  /// `RIPEMD160(SHA256(x))` — the AccountID of a public key.
  246  pub fn account_id_of(pubkey: &[u8; 33]) -> [u8; 20] {
  247      let sha = Sha256::digest(pubkey);
  248      let rip = Ripemd160::digest(sha);
  249      let mut out = [0u8; 20];
  250      out.copy_from_slice(&rip);
  251      out
  252  }
  253  
  254  // ---------------------------------------------------------------------------
  255  // base58check
  256  // ---------------------------------------------------------------------------
  257  
  258  pub fn base58check_encode(version: u8, payload: &[u8]) -> String {
  259      let mut v = Vec::with_capacity(1 + payload.len() + 4);
  260      v.push(version);
```

### 3b. signer/src/xrpl.rs:438-492 — BOTH derivation functions, complete
```rust
  438      /// XRPL's ed25519 derivation: the private key is `SHA512Half(entropy)`, and
  439      /// the public key is that key's Ed25519 point with a leading `0xED` so the
  440      /// 33-byte field can carry either algorithm.
  441      pub fn ed25519_from_entropy(entropy: &[u8]) -> R<AccountKey> {
  442          if entropy.len() != 16 {
  443              return Err(XrplError::Length { what: "ed25519 seed", want: 16, got: entropy.len() });
  444          }
  445          let sk = ed25519_dalek::SigningKey::from_bytes(&sha512half(entropy));
  446          let mut public = [0u8; 33];
  447          public[0] = 0xED;
  448          public[1..].copy_from_slice(sk.verifying_key().as_bytes());
  449          Ok(AccountKey { inner: Inner::Ed25519(Box::new(sk)), public })
  450      }
  451  
  452      pub fn algorithm(&self) -> KeyAlgorithm {
  453          match self.inner {
  454              Inner::Secp256k1(_) => KeyAlgorithm::Secp256k1,
  455              Inner::Ed25519(_) => KeyAlgorithm::Ed25519,
  456          }
  457      }
  458  
  459      pub fn from_entropy(entropy: &[u8]) -> R<AccountKey> {
  460          let root = derive_scalar(|i| {
  461              let mut m = entropy.to_vec();
  462              m.extend_from_slice(&(i as u32).to_be_bytes());
  463              sha512half(&m)
  464          })?;
  465          let root_pub = {
  466              use k256::elliptic_curve::sec1::ToEncodedPoint;
  467              k256::PublicKey::from_secret_scalar(&root).to_encoded_point(true).as_bytes().to_vec()
  468          };
  469  
  470          let intermediate = derive_scalar(|i| {
  471              let mut m = root_pub.clone();
  472              m.extend_from_slice(&0u32.to_be_bytes());
  473              m.extend_from_slice(&(i as u32).to_be_bytes());
  474              sha512half(&m)
  475          })?;
  476  
  477          let sum: k256::Scalar = *root.as_ref() + *intermediate.as_ref();
  478          let signing = SigningKey::from_bytes(&sum.to_bytes())
  479              .map_err(|e| XrplError::Key(format!("account scalar is not a valid key: {e}")))?;
  480          let pubkey = signing.verifying_key().to_encoded_point(true);
  481          let mut public = [0u8; 33];
  482          public.copy_from_slice(pubkey.as_bytes());
  483          Ok(AccountKey { inner: Inner::Secp256k1(signing), public })
  484      }
  485  
  486      pub fn public(&self) -> &[u8; 33] {
  487          &self.public
  488      }
  489  
  490      pub fn account_id(&self) -> [u8; 20] {
  491          account_id_of(&self.public)
  492      }
```

### 3c. signer/src/xrpl.rs:265-330 — the two heap decoders, complete
```rust
  265  }
  266  
  267  pub fn base58check_decode(s: &str, want_version: u8) -> R<Vec<u8>> {
  268      let raw = b58_decode(s)?;
  269      if raw.len() < 5 {
  270          return Err(XrplError::Base58("too short".into()));
  271      }
  272      let (body, check) = raw.split_at(raw.len() - 4);
  273      let c = Sha256::digest(Sha256::digest(body));
  274      if check != &c[..4] {
  275          return Err(XrplError::Checksum);
  276      }
  277      if body[0] != want_version {
  278          return Err(XrplError::Version { want: want_version, got: body[0] });
  279      }
  280      Ok(body[1..].to_vec())
  281  }
  282  
  283  fn b58_encode(data: &[u8]) -> String {
  284      let mut digits: Vec<u8> = vec![0];
  285      for byte in data {
  286          let mut carry = *byte as u32;
  287          for d in digits.iter_mut() {
  288              carry += (*d as u32) << 8;
  289              *d = (carry % 58) as u8;
  290              carry /= 58;
  291          }
  292          while carry > 0 {
  293              digits.push((carry % 58) as u8);
  294              carry /= 58;
  295          }
  296      }
  297      let leading = data.iter().take_while(|b| **b == 0).count();
  298      let mut out = String::new();
  299      for _ in 0..leading {
  300          out.push(ALPHABET[0] as char);
  301      }
  302      for d in digits.iter().rev() {
  303          out.push(ALPHABET[*d as usize] as char);
  304      }
  305      // A leading zero byte already contributed a digit above; strip the extra.
  306      if leading > 0 && out.len() > leading {
  307          let extra = out.chars().skip(leading).take_while(|c| *c == ALPHABET[0] as char).count();
  308          if extra > 0 {
  309              out = out[..leading].to_string() + &out[leading + extra..];
  310          }
  311      }
  312      out
  313  }
  314  
  315  fn b58_decode(s: &str) -> R<Vec<u8>> {
  316      let mut bytes: Vec<u8> = vec![0];
  317      for ch in s.chars() {
  318          let idx = ALPHABET
  319              .iter()
  320              .position(|c| *c as char == ch)
  321              .ok_or_else(|| XrplError::Base58(format!("`{ch}` is not in the XRPL alphabet")))?;
  322          let mut carry = idx as u32;
  323          for b in bytes.iter_mut() {
  324              carry += (*b as u32) * 58;
  325              *b = (carry & 0xFF) as u8;
  326              carry >>= 8;
  327          }
  328          while carry > 0 {
  329              bytes.push((carry & 0xFF) as u8);
  330              carry >>= 8;
```

### 3d. signer/src/xrpl.rs:891-950 — seed decoders and derive_scalar, complete
```rust
  891  
  892  /// Decode an `sEd…` seed to its 16 bytes of entropy, checksum verified.
  893  pub fn decode_ed25519_seed(seed: &str) -> R<[u8; 16]> {
  894      let raw = b58_decode(seed)?;
  895      if raw.len() != 3 + 16 + 4 {
  896          return Err(XrplError::Length { what: "ed25519 seed", want: 23, got: raw.len() });
  897      }
  898      let (body, check) = raw.split_at(raw.len() - 4);
  899      let c = Sha256::digest(Sha256::digest(body));
  900      if check != &c[..4] {
  901          return Err(XrplError::Checksum);
  902      }
  903      if body[..3] != VER_ED25519_SEED {
  904          return Err(XrplError::VersionPrefix {
  905              what: "ed25519 seed",
  906              want: VER_ED25519_SEED.to_vec(),
  907              got: body[..3].to_vec(),
  908          });
  909      }
  910      let mut out = [0u8; 16];
  911      out.copy_from_slice(&body[3..]);
  912      Ok(out)
  913  }
  914  
  915  /// Decode a family seed to its **16 bytes of entropy and its type**.
  916  ///
  917  /// The keygen ruling's §2.1 needs both — `seed_type` and `seed_bytes` are
  918  /// separate framed fields of the derivation preimage, so the same 16 bytes
  919  /// under two seed types must produce two different keys. Splitting the decoder
  920  /// out of [`AccountKey::from_family_seed`] means there is one decoder rather
  921  /// than two that can disagree about what a seed is.
  922  ///
  923  /// **Exactly 16 bytes or an error.** `len(seed_bytes) != 16` is one of §2.1's
  924  /// refusals and it is enforced here, in the type the caller receives, rather
  925  /// than re-checked downstream.
  926  pub fn decode_family_seed(seed: &str) -> R<([u8; 16], KeyAlgorithm)> {
  927      if seed.starts_with("sEd") {
  928          return Ok((decode_ed25519_seed(seed)?, KeyAlgorithm::Ed25519));
  929      }
  930      let entropy = base58check_decode(seed, VER_FAMILY_SEED)?;
  931      if entropy.len() != 16 {
  932          return Err(XrplError::Length { what: "family seed", want: 16, got: entropy.len() });
  933      }
  934      let mut out = [0u8; 16];
  935      out.copy_from_slice(&entropy);
  936      Ok((out, KeyAlgorithm::Secp256k1))
  937  }
  938  
  939  /// The rejection loop both derivation stages share: increment until the
  940  /// candidate is a valid non-zero scalar below the group order.
  941  fn derive_scalar<F: Fn(u32) -> [u8; 32]>(f: F) -> R<k256::NonZeroScalar> {
  942      for i in 0u32..=u32::MAX {
  943          let candidate = f(i);
  944          if let Ok(sk) = k256::SecretKey::from_slice(&candidate) {
  945              return Ok(sk.to_nonzero_scalar());
  946          }
  947      }
  948      Err(XrplError::Key("no valid scalar in 2^32 candidates".into()))
  949  }
  950  
```

### 3e. signer/src/holder.rs:255-320 — the profile load path (F2/F3's subject), complete
```rust
  255      /// Errors with [`ProfileError::SeedPromptUnavailable`] if the profile asks
  256      /// to be prompted. Use [`Self::load_with`] from anything that can prompt.
  257      pub fn load(path: &Path) -> Result<HolderProfile, ProfileError> {
  258          Self::load_with(path, || None)
  259      }
  260  
  261      /// Load a profile, asking `ask_seed` for the family seed when the profile
  262      /// says [`PROMPT_FOR_SEED`].
  263      ///
  264      /// ⚠ `ask_seed` must read this process's own terminal. It is a closure so
  265      /// that tests can drive it — **not** so that it can be delegated over IPC,
  266      /// which ruling §5 item 3 forbids. Nothing in [`crate::protocol`] can
  267      /// produce one.
  268      pub fn load_with<F: FnOnce() -> Option<String>>(
  269          path: &Path,
  270          ask_seed: F,
  271      ) -> Result<HolderProfile, ProfileError> {
  272          let raw = std::fs::read_to_string(path).map_err(|e| ProfileError::Io(e.to_string()))?;
  273          Self::from_json_with(&raw, ask_seed)
  274      }
  275  
  276      pub fn from_json(raw: &str) -> Result<HolderProfile, ProfileError> {
  277          Self::from_json_with(raw, || None)
  278      }
  279  
  280      pub fn from_json_with<F: FnOnce() -> Option<String>>(
  281          raw: &str,
  282          ask_seed: F,
  283      ) -> Result<HolderProfile, ProfileError> {
  284          // Named before serde's generic "unknown field" so the operator is told
  285          // the value moved to the ledger rather than left to wonder whether it
  286          // was renamed or silently accepted.
  287          let tree: serde_json::Value =
  288              serde_json::from_str(raw).map_err(|e| ProfileError::Json(e.to_string()))?;
  289          if let Some(obj) = tree.as_object() {
  290              for (field, now) in MOVED_TO_THE_LEDGER {
  291                  if obj.contains_key(*field) {
  292                      return Err(ProfileError::Stale { field, now });
  293                  }
  294              }
  295          }
  296  
  297          let p: RawProfile =
  298              serde_json::from_str(raw).map_err(|e| ProfileError::Json(e.to_string()))?;
  299  
  300          // Before anything else is interpreted.
  301          if p.network_id != DEVNET_NETWORK_ID {
  302              return Err(ProfileError::NotDevnet(p.network_id));
  303          }
  304  
  305          // The seed: from the file, or from this process's own terminal.
  306          let seed_was_prompted = p.account_seed == PROMPT_FOR_SEED;
  307          let seed = if seed_was_prompted {
  308              match ask_seed() {
  309                  Some(s) if !s.trim().is_empty() => s.trim().to_string(),
  310                  _ => return Err(ProfileError::SeedPromptUnavailable),
  311              }
  312          } else {
  313              p.account_seed.clone()
  314          };
  315  
  316          let account = AccountKey::from_family_seed(&seed)
  317              .map_err(|e| ProfileError::Field(format!("account_seed: {e}")))?;
  318  
  319          let key_source = match p.elgamal_key_source.as_deref() {
  320              // Absent means what every profile written before step 6 already
```

### 3f. signer/src/holder.rs:40-70 and 155-170 — the prompted-seed mode and RawProfile
```rust
   40  //! # The two key sources, and what each one costs
   41  //!
   42  //! * **`derived-from-master-seed`** — REVIEW-012c's construction, applied to
   43  //!   `account_seed`. The profile carries **no ElGamal secret at all**, and with
   44  //!   `"account_seed": "prompt"` it carries no secret of any kind: the seed is
   45  //!   read by the daemon in its own window at start. That is the only
   46  //!   arrangement in this project where the ruling's §4 — *plaintext seed and
   47  //!   `sk_A` are never written to non-volatile storage* — actually holds.
   48  //! * **`standalone`** — an independent ElGamal secret in `elgamal_sk` /
   49  //!   `elgamal_pk`. This is what every profile before 2026-08-20 was, unnamed.
   50  //!   It is the honest source for a holder whose master key has been retired,
   51  //!   and it is **a second thing to lose**.
   52  //!
   53  //! An absent `elgamal_key_source` is read as `standalone`, because that is what
   54  //! those profiles already were. It is not silently upgraded.
   55  
   56  use crate::keygen;
   57  use crate::onboarding::KeySource;
   58  use crate::prover::ElGamalKeypair;
   59  use crate::xrpl::{self, AccountKey};
   60  use serde::Deserialize;
   61  use std::path::Path;
   62  
   63  /// The literal `account_seed` value that means *ask me at start*.
   64  ///
   65  /// Ruling §5 item 3: seed entry happens only in the signer's own local UI. A
   66  /// profile file is neither the browser nor IPC, so it does not violate that
   67  /// sentence — but it does put a plaintext seed on disk, which §4 forbids. This
   68  /// sentinel is the way out, and it is opt-in because the Devnet drivers run the
   69  /// daemon without a terminal.
   70  pub const PROMPT_FOR_SEED: &str = "prompt";
  ...
  155  }
  156  
  157  #[derive(Deserialize)]
  158  #[serde(deny_unknown_fields)]
  159  struct RawProfile {
  160      /// XRPL family seed, `s…`. Devnet faucet output — or the literal
  161      /// [`PROMPT_FOR_SEED`], which asks the daemon for it at start instead.
  162      account_seed: String,
  163      /// Which of the two key sources this holder uses. Absent is read as
  164      /// `standalone`, which is what every profile written before 2026-08-20 was.
  165      elgamal_key_source: Option<String>,
  166      /// 32-byte ElGamal secret, hex. **Standalone source only.**
  167      elgamal_sk: Option<String>,
  168      /// 33-byte ElGamal public key, hex. **Standalone source only.**
  169      elgamal_pk: Option<String>,
  170      /// Which confidential position this signer is for.
```

### 3g. signer/src/keygen.rs:108-150 and 212-230 — the existing Zeroizing type and derive_raw's opening (F4/F5)
```rust
  108  /// — `mlock` is named as a gap rather than claimed — and it does **nothing at
  109  /// all** against an adversary with code execution on this machine, who reads
  110  /// the value while it is still live (architecture §3, ruling §8 item 2).
  111  /// `CLAIMS.md` P-5 forbids calling any of it secure.
  112  pub struct Zeroizing<const N: usize>(pub [u8; N]);
  113  
  114  impl<const N: usize> Zeroizing<N> {
  115      /// Overwrite the bytes. Called by [`Drop`]; public so it can be tested on
  116      /// a **live** value rather than through a dangling pointer, which is what
  117      /// the obvious version of that test does.
  118      pub fn zeroize(&mut self) {
  119          for b in self.0.iter_mut() {
  120              // SAFETY: `b` is a live, aligned `u8` this value owns.
  121              unsafe { std::ptr::write_volatile(b, 0) };
  122          }
  123          std::sync::atomic::compiler_fence(std::sync::atomic::Ordering::SeqCst);
  124      }
  125  }
  126  
  127  impl<const N: usize> Drop for Zeroizing<N> {
  128      fn drop(&mut self) {
  129          self.zeroize();
  130      }
  131  }
  132  
  133  impl<const N: usize> std::fmt::Debug for Zeroizing<N> {
  134      fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
  135          write!(f, "Zeroizing<{N}>(<redacted>)")
  136      }
  137  }
  138  
  139  /// The output of the derivation: a keypair, and the facts that produced it.
  140  ///
  141  /// `sk` is behind [`Zeroizing`], so this value overwrites its own secret when
  142  /// it is dropped.
  143  pub struct DerivedKey {
  144      sk: Zeroizing<32>,
  145      pk: [u8; 33],
  146      account_id: [u8; 20],
  147      algo: KeyAlgorithm,
  148  }
  149  
  150  impl std::fmt::Debug for DerivedKey {
  ...
  212  /// §2.2, in full. The intermediates are returned so a known-answer test can
  213  /// check `PRK` and `OKM64`, which are the values the ruling publishes.
  214  fn derive_raw(
  215      family_seed: &str,
  216      expected_account_id: Option<&[u8; 20]>,
  217  ) -> Result<(KeyAlgorithm, [u8; 20], usize, Zeroizing<64>, Zeroizing<64>), KeygenError> {
  218      // ---- §2.1 Inputs, and what must be rejected before anything is hashed ---
  219      let (entropy, algo) =
  220          xrpl::decode_family_seed(family_seed).map_err(|e| KeygenError::Seed(e.to_string()))?;
  221      let seed = Zeroizing(entropy);
  222  
  223      // `decode_family_seed` returns exactly 16 bytes or an error, so
  224      // `len(seed_bytes) != 16` cannot reach here. The type is the check.
  225      let account = xrpl::AccountKey::from_family_seed(family_seed)
  226          .map_err(|e| KeygenError::Seed(e.to_string()))?;
  227      let account_id = account.account_id();
  228  
  229      if let Some(want) = expected_account_id {
  230          if &account_id != want {
```

---

## Part 4 — WHAT YOU ARE ASKED

Answer these five, in order, with a heading for each. Be adversarial: the request
is the artifact under review, not the code.

1. **Is the re-framing in §0 right, or is it SCOPE CREEP?** A decision request that
   widens its own question is doing this project's characteristic error in the
   other direction. Say so plainly if that is what this is.
2. **Does F2 defeat Option B?** Can Option B be honestly described in a way that
   does NOT claim to have answered the two legs' consistency objection?
3. **Is F3's regime split (file-based vs prompted profile) real, or is it a way of
   not deciding?**
4. **WHICH OPTION, and why.** ⚠ A leg that rules A is not failing to engage — the
   deferral's reason is real, and two legs disagreeing with it does not settle it.
5. **What is WRONG with this request itself?** Errors of fact, overstated claims,
   missing sites, or a conclusion its evidence does not carry.

Context you need and will not otherwise have:
- **P-5** is a standing prohibition: wiping *narrows a window and removes no
  channel*. No artifact here may ever claim more. Nothing can wipe the SHA-512
  block buffer or the source of a Rust move.
- **The ruled threat model** puts a hostile same-host process in scope.
- **B-21** is the completed predecessor: it wiped per-signature NONCE entropy.
  Eight independent leg-readings over three rounds found no defect in its
  construction. Do not re-open it.
- This project's most repeated defect is a **hand-enumerated list or count**
  presented as complete. It has recurred at least six times.
