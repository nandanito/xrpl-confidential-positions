# REVIEW-029s — self leg, B-22

⚠ **This file was committed with the heading `REVIEW-029c`, which is the ADJUDICATION's id.** Corrected; the filename was always `029s`.

**Written to scratchpad while `REVIEW-029a` (Gemini, inline packet) and `REVIEW-029b`
(Codex, read-only repo access) were reading. Not committed until both returned —
`CLAUDE.md`: do not let your own answers appear in the tree a leg is reading.**

Adversarial against my own decision request at `694e01e`.

---

## 1. Is §0's re-framing right, or scope creep?

**Partly scope creep, and I now think the request overreached in one specific,
identifiable place.**

What survives: the six facts were worth surfacing. F2, F3 and F4 are all true, all
outside `xrpl.rs`, and none of them was in front of `REVIEW-027`'s legs.

What does not survive: **the conclusion I drew from F2.** I wrote that wiping
`xrpl.rs` alone *"does not answer the objection — it relocates the seam."* That
conflates two different inconsistencies:

- **INTRA-module** — `xrpl.rs` wipes per-signature nonce entropy and leaves the
  long-term private key raw, in the same file, often in adjacent functions. **This
  is what both `REVIEW-027` legs actually complained about**, and their words say
  so: *"in the same module"*.
- **INTER-module** — `xrpl.rs` wipes and `holder.rs` does not.

⚠ **Only the first is the legs' objection, and Option B closes it completely.** A
module boundary that coincides with a layer boundary — cryptographic primitives
vs. profile loading — is a normal engineering seam. *"These lines but not those,
in the same function"* is not. **I treated the two as the same kind of thing and
they are not.**

**So F2 does not defeat Option B.** It raises a *separate*, real, and so-far
unregistered question about `holder.rs`.

## 2. Four errors of fact in my own request, and the pattern they make

1. **F6, first draft: "two sites, `:461` and `:469`."** One site; `:471` copies the
   *public* key. Line counted from a `sed` window instead of grepped. Caught by
   `claims-check`, corrected in place.
2. **F2's list of three is incomplete.** `holder.rs:287-288` parses the **entire
   profile into a `serde_json::Value`** — a heap AST containing `account_seed` —
   *before* `:297-298` parses it again into `RawProfile`. **The JSON is parsed
   twice.** Verified at source. Found by the Gemini leg, not by me.
3. **F4 is overstated, and the correction cuts the opposite way.** I wrote that
   `keygen.rs` *"already answered this question in the affirmative."* It did not,
   cleanly. `keygen.rs:221` is `let seed = Zeroizing(entropy);` where `entropy` is
   `[u8; 16]` — **which is `Copy`**. So that is a **copy, not a move**, and the
   original `entropy` binding stays live and unwiped for the rest of `derive_raw`.
   ⚠ **The generalisation matters more than the site: wrapping a `Copy` type in a
   zeroizing wrapper does not wipe the source.** That is a design constraint on any
   option, and I asserted the opposite shape.
4. **§5's gate claim is a category error.** I wrote that a gate answers the
   hand-enumeration problem. A gate pins **designated** sites and catches
   regressions on them; **it cannot prove no unlisted secret-bearing site exists.**
   `check-zeroize-bounds` part 4 is close to exhaustive for *prose*, because it
   scans every live file for fixed phrases. **There is no equivalent for sites**,
   and I wrote as though there were.

⚠⚠ **THE PATTERN: my request argues that a hand-enumerated site list is a claim
with no falsifier, and it contains FOUR hand-enumeration errors.** Two were caught
by an external leg, one by a gate, one by me. **I am deliberately not writing "four"
into the ruling as a settled count** — `CLAIMS.md` E-137, E-141, E-165, E-168,
E-172 and E-175 are six instances of a count in a fix report being wrong, and this
paragraph is the seventh candidate.

## 3. Is F3's regime split real?

**Real as a fact, wrong as a basis for a decision.**

The two regimes exist (`holder.rs:70`, `:306`). But conditioning *cryptographic
memory hygiene* on an *application configuration mode* means `xrpl.rs` would need to
know where its `&str` came from, which it deliberately does not. It also produces a
security property that has to be stated conditionally, and this project's own
history — `CLAIMS.md` E-125 — is that the conditional disclosure surface is exactly
where the false sentence lands.

⚠ **And the defense-in-depth counter is correct:** file permissions, privilege
drop, sandboxing and core-dump exposure are different controls. *"It was already on
disk"* does not make heap residue free.

## 4. Which option

**B, described honestly, with `holder.rs` registered as a separate open item.**

Not A: the intra-module inconsistency is real, both external legs named it, the
machinery already exists, and the asymmetry in §1 is genuine — a master seed is
long-lived where a nonce is not.

Not C: F2's sites include a `serde_json::Value` AST and a `RawProfile` built by a
third-party deserialiser. **Wiping inside `serde_json` is not something this project
can claim**, and an option whose completeness cannot be stated is one that will
produce a false sentence.

Not D: §3 above.

⚠ **What B must NOT say:** that it answered the consistency objection in general,
that the seed is wiped, or that `holder.rs` is covered. **P-5's sentence is the
ceiling and it has not moved.**

## 5. What is wrong with this self leg

It agrees with the external leg on every substantive point, which is weak evidence.
I read `REVIEW-029a` **before** writing this. ⚠ **That ordering is a defect and I
am recording it rather than presenting this as independent corroboration** — this
is one reading confirmed, not two readings agreeing. `CLAIMS.md` E-160's lesson,
applied to myself.
