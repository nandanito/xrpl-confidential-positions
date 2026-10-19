# REVIEW-025 — REQUEST: adversarial review of the B-16 BUILD, round one

**Date:** 2026-08-27. **Frozen commit:** `200aae636d73e3112f5e7415e6dbddd9de1a2bb5`,
branch `build/b16-hedged-ed25519-nonce`. **Parent:** `17f9c0b`.

You are one of three independent legs. **Answer from this packet alone.** Do not
use tools, do not read the filesystem, do not search the web. If a leg has
repository access it must read the frozen commit through
`git show 200aae63:<path>` and nothing else — a working tree can move under you,
and `REVIEW-022` is the record of that happening.

---

## What you are reviewing, and what you are NOT

**You are reviewing an IMPLEMENTATION against a ruling that is already made.**

`REVIEW-024` (2026-08-27, three independent legs, complete text below) ruled that
the ed25519 signing nonce is hedged. **That decision is not open.** Arguments
that hedging is unnecessary, that RFC 8032 is fine, or that `hazmat` should not
be enabled are **out of scope for this round** — they were made, weighed and
answered, and §10 of the ruling names the judgement call explicitly.

**What IS in scope:**

1. **Does the code implement §3's construction, exactly?** Byte order,
   concatenation order, which half of the SHA-512 output, which field is masked,
   what is left alone.
2. **Does it satisfy §6's eight execution gates and §7's four conditions?** Each
   is quoted in the ruling below. For each, say whether the artifact establishes
   it, and if not, what is missing.
3. **Do the tests establish what they are named for?** ⚠ This is the review's
   sharpest question, because `REVIEW-024` §4d found the previous round's test
   did not, and **this session found the same failure again in its own new
   test** — see "What this session already found" below. Assume there is a third.
4. **Is anything claimed that is not delivered?** Comments, commit message, doc
   strings, the decision record. `CLAIMS.md` P-5: never claim more security than
   is delivered.
5. **B-19 (`zeroize`) rides in this diff and is a SEPARATE decision** with no
   independent leg. Reject it separately if you think it is wrong. Its record is
   below in full.
6. **Anything else you find**, in or out of the question. The last three rounds
   each found a real defect outside the question they were asked.

---

## ⚠ What this session already found, so you do not spend the round re-finding it

**A revert PASSED.** `REVIEW-024` §6 item 8 requires reverting each fix and
watching its test fail. Revert 8 — *a successful all-zero entropy draw treated as
an omission*, which is precisely what §6 item 3 exists to prevent — **left the
entire suite green**. The test written for item 3 drove
`Hedge::FixedAux([0u8; 32])`, which never reaches `xrpl::fresh_aux`, the function
that decides `Some` vs `None`. A test named for a property, sitting one layer
away from where the property can break.

Fixed by adding `store::next_entropy_draw_returns_for_test` and two tests that
use it. **Assume this pattern recurs elsewhere in the diff and look for it.**

---

## ⚠ House rules this packet is bound by, and how they apply to you

- **A review finding is evidence, not an instruction.** Eight times now a leg's
  diagnosis has been right while its proposed fix was backwards. State the
  defect and the failure it enables; propose a remedy separately and say how
  confident you are in it.
- **An excerpt is a diff by another name** (`CLAIMS.md` E-160). `REVIEW-024`'s
  own packet quoted `ed25519-dalek`'s `hazmat.rs` in excerpts and a leg
  consequently reported `raw_sign_byupdate` as `pub(crate)` and unavailable when
  it is `pub` at line 210 — **on a line the excerpt omitted.** This packet
  therefore carries the **complete text** of `hazmat.rs`, `signing.rs` and
  `verifying.rs`, not the parts the adjudicator thought were relevant. If you
  need something that is not here, **say it is missing** rather than inferring
  it. A named gap is a correct output.
- **Unanimity can be manufactured by a packet.** If you agree with something
  stated here, say what you checked rather than that you agree.
- **Confidence, 0-10, and say what would change it.**

---

## Output

Sections in this order:

1. **Verdict on the construction** — does the code implement §3? Yes/no, with
   the specific lines.
2. **§6 gate by gate** (1-8), **§7 condition by condition** (1-4). One line each:
   ESTABLISHED / PARTIAL / ABSENT, plus what is missing.
3. **Tests that do not establish what they are named for.** Name them.
4. **Overclaims** — any sentence in the code, comments, commit message or
   decision record that says more than the artifact delivers.
5. **B-19** — accept or reject, separately, with reasons.
6. **Findings outside the question.**
7. **Confidence and what would move it.**

---

# ============ WHAT THE PACKET CARRIED, and it is NOT reproduced here ============

⚠ **The packet the legs answered was 452 KB and 9,123 lines.** It is not stored
in full because every byte of it is reproducible from this repository and from
one pinned crate, and a stored copy would rot:

| Section | Source, verbatim and complete |
|---|---|
| The ruling | `docs/reviews/REVIEW-024-RULING-ed25519-nonce-2026-08-27.md` |
| The B-19 decision | `docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md` |
| The diff | `git diff 17f9c0b 200aae63 -- signer/ tools/ Makefile` |
| The post-change files, complete | `git show 200aae63:signer/src/xrpl.rs` and the eight others named in the diff |
| **Third-party source, complete** | `ed25519-dalek` **2.2.0**: `src/hazmat.rs` (359 lines), `src/signing.rs` (955), `src/verifying.rs` (741), and the `[features]` section of its `Cargo.toml` |
| Run output | `cargo test` x3, `check-test-support-gate.ts`, the KAT generator, the Devnet tail, the revert sweep |

⚠ **The third-party source was carried COMPLETE, and that was the point.**
`CLAIMS.md` E-160: `REVIEW-024`'s packet quoted `hazmat.rs` in excerpts, cut line
210, and its Codex leg consequently reported a `pub` function as `pub(crate)` and
unavailable. **An excerpt is a diff by another name.** Both legs this round cited
`hazmat.rs:81-98` and `signing.rs:566-569` correctly.

⚠ **One thing the packet left out, and a leg caught it:** `tests/xrpl_vectors.rs`
was not included, so Codex graded §6 gate 1 **PARTIAL** — *"its behaviour cannot
be verified from a comment plus aggregate 265 passed output."* Correct. The file
is unchanged by this build and passing, but **"unchanged" is a claim a leg cannot
check without the file.** It is in round two's packet.

