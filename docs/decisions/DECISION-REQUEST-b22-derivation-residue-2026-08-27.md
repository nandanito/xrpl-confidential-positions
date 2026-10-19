# Decision request — B-22: where the signer's secret-residue boundary actually falls

- **Date:** 2026-08-27. ~~**Status: OPEN. Framed by the coding session, not yet ruled.**~~
- ⚠ **RULED 2026-08-27 — `REVIEW-029`, adjudicated `REVIEW-029c`. The legs SPLIT:** Gemini ruled the §0 re-framing **scope creep** and chose **Option B**; Codex ruled it **sound** and chose **Option C**; **both independently rejected A and D.** The ruling: **the UNIT is the owned seed-to-key path** (Codex), **the first increment is Option B** (Gemini), and `holder.rs` is registered as **B-23 with its sites named**, not deferred.
- ⚠⚠ **FOUR ERRORS OF FACT WERE FOUND IN THIS REQUEST AND ARE CORRECTED IN PLACE BELOW, NOT DELETED** — `CLAIMS.md` **E-177**. Two were found by external legs, one by `claims-check`, one by the self leg. **None by re-reading.** ⚠ **The section arguing that hand-enumerated lists are unfalsifiable is the section that contained most of them.**
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
| `xrpl.rs:463` | `m` — `entropy ‖ i`, carries the master seed | **yes** |
| ~~`xrpl.rs:474`~~ | ⚠⚠ **CORRECTED — `REVIEW-029b`, `CLAIMS.md` E-177.** This row read *"`:463`, `:474` — seed- and pubkey-derived preimages — **yes**"*. The preimage at `:474` is `root_pub ‖ 0 ‖ i`: a **public key and two counters**, carrying no secret. **Two secret callers, not three.** ⚠ **The leg's further claim that `intermediate` is therefore *publicly computable* is TOO STRONG and is not inherited** — `root_pub` is never published (`AccountKey::public` is `sum·G`, `xrpl.rs:480-483`). **Input public, output still a private scalar** | **no** |
| `xrpl.rs:566` | `message` — the prehash of a public transaction | no |
| `xrpl.rs:1202` | `self.signing_message()?` | no |
| `xrpl.rs:1245` | `m` — a public preimage | no |

⚠ **The evidence file's caution — *"`sha512half` has PUBLIC callers, so a change there is NOT type-local"* — overstates the coupling by assuming the change would be to `sha512half` itself.** It need not be. `sha512_zeroizing` **already exists**, was built by B-21, is in the same module and returns `Zeroizing<[u8; 64]>` (`xrpl.rs:233`). ⚠⚠ **CORRECTED — `REVIEW-029a` finding 1.** This said *"routing the three secret callers through it"*, and `sha512_zeroizing` is **NOT a drop-in**: it returns **64** bytes where the derivation callers need **32**, and slicing one back down **recreates the bare `[u8; 32]` temporary the change exists to remove.** A `Zeroizing<[u8; 32]>` helper was required and is what was built. **The conclusion — that `sha512half` itself need not change — survives; the mechanism named here did not.** `tests/xrpl_vectors.rs` pins the transaction-hash path through the *public* callers, which nothing would touch.

⚠ **The vectors are not a cost here; they are the falsifier.** `xrpl_vectors.rs:318` — `the_transaction_hash_is_over_the_signed_blob_with_its_prefix` — pins the public caller at `:1245`, which no option touches. `xrpl_vectors.rs:44` — `family_seed_derivation_matches_ripple_keypairs` — pins the **derivation itself against an independent implementation**: same seed, same key out. A wiping change that altered a derived key fails it. **That is the check we want, not a risk we accept.**

### F2 — the master seed is in at least three unwiped heap `String`s before `xrpl.rs` ever sees it

`signer/src/holder.rs`, for a file-based profile:

| Line | Value | Wiped? |
|---|---|---|
| `:272` | `raw` — `std::fs::read_to_string(path)`, the **whole profile JSON, seed included, in plaintext** | **no** |
| `:162` | `p.account_seed: String` — the deserialised field | **no** |
| `:313` | `p.account_seed.clone()` — a third copy | **no** |
| `:310` | `s.trim().to_string()` on the prompted path, plus whatever `ask_seed()` returned | **no** |

| `:287-288` | ⚠⚠ **MISSED BY THIS SECTION AND FOUND BY `REVIEW-029a`.** `let tree: serde_json::Value = serde_json::from_str(raw)` — **the profile JSON is parsed TWICE**, and this first parse builds a whole heap AST of `Map`s and `String`s including `account_seed`, before `:297-298` deserialises `RawProfile` | **no** |

`String`'s `Drop` deallocates; it does not zero.

⚠⚠ **THE TABLE ABOVE SAID "AT LEAST THREE" AND LISTED FOUR ROWS; IT MISSED A FIFTH** — `CLAIMS.md` **E-177**. **Written in the section criticising the evidence file for an incomplete site list.** The heading's *"at least"* is the only reason it was not simply false, and *"at least"* is not a substitute for a gate.

⚠ **This is the load-bearing fact of the whole request.** Both legs called the `xrpl.rs`-only boundary *"arbitrary and inconsistent"*. **Wiping `xrpl.rs`'s locals while these stand does not answer that objection — it relocates the seam from "`xrpl.rs` vs the rest" to "`xrpl.rs` vs `holder.rs`".** If the legs' reason is the reason to act, Option B below does not satisfy it.

### F3 — for a file-based profile the seed is at rest on disk in plaintext, so memory residue is not the binding constraint; for `"account_seed": "prompt"` it is the *only* exposure

`holder.rs:63` defines `PROMPT_FOR_SEED`, and the module header at `:43-44` says a prompted profile *"carries no secret of any kind"*. **These are two different exposure regimes and the legs saw neither**, because `holder.rs` was not in `REVIEW-027`'s packet.

- **File-based:** an adversary who can read this process's memory can also read the profile file. Wiping memory does not narrow a window that the filesystem holds open anyway.
- **Prompted:** the seed exists **only** in memory. Every copy in F2 and in the evidence file's table is the entire exposure, and P-5's *"narrows a window"* is at its strongest.

⚠ **A decision that does not distinguish these two regimes is deciding two different questions with one answer.**

### F4 — `keygen.rs` already answered this question in the affirmative for its own locals, and shares an unwiped decoder

`keygen.rs:221` — `let seed = Zeroizing(entropy);` — and `derive_raw` returns `Zeroizing<64>` for both `PRK` and `OKM64` (`:217, :254, :263`), with the ElGamal `sk` behind `Zeroizing<32>` (`:144, :287`).

⚠⚠ **CORRECTED — `CLAIMS.md` E-178.** This section's claim that `keygen.rs` *"already answered this question in the affirmative for its own locals"* is **half true, and the missing half inverts it.** `keygen.rs:221` is `let seed = Zeroizing(entropy);` where `entropy` is `[u8; 16]` — **which is `Copy`** — so it is a **copy, not a move**, and the original binding stayed live and unwiped for the rest of `derive_raw`. **The wrapper wiped one of two copies.** ⚠ **The general rule matters more than the site: WRAPPING A `Copy` TYPE IN A ZEROIZING WRAPPER DOES NOT WIPE THE SOURCE.** Found by the self leg; fixed under `REVIEW-029c` condition 5.

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

⚠⚠ **CORRECTED — `REVIEW-029a` finding 4, `CLAIMS.md` E-179.** What follows was written as though a gate answers the hand-enumeration problem. **It does not.** A gate pins the sites it **names** and catches regressions on them; **it cannot establish that no unlisted secret-bearing site exists.** Part 4 is near-exhaustive for *prose* only because it scans fixed phrases across every live file, and **there is no equivalent for sites.** The gate that was built states its guarantee over a **NAMED SET** for exactly this reason.

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
