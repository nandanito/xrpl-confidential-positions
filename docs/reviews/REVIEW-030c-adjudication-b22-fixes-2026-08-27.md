# REVIEW-030c — adjudication: round two, the B-22 fixes

**Date:** 2026-08-27. **Subject:** the build at `cbfda07`, which nobody had reviewed.
**Legs:** `REVIEW-030a` (Gemini, inline diff), `REVIEW-030b` (Codex, read-only repo access).

⚠ **TWO EXTERNAL LEGS, WHICH IS WHAT B-21's ROUND TWO LACKED.** The handover named
that as the one honest weakness in the previous session's record — `REVIEW-028` was
Codex only, *"mechanical rather than considered"*. **Fixed here rather than repeated.**

---

## 0. The result, stated first

⚠⚠ **ROUND TWO FOUND THAT THE BUILD DID NOT IMPLEMENT ITS OWN RULING, AND THAT A
COMMENT WAS COVERING THE GAP.** `REVIEW-029c` condition 2 put `root`, `intermediate`
and `sum` **in scope**. The build wiped none of them, and the comment beside them
said *"that is the crate's boundary, not an omission"*.

**Both legs found it independently.** A compile probe then showed both `k256`
scalar types implement `Zeroize`, so nothing had prevented it.

⚠ **This is exactly what `CLAUDE.md` says round two is for** — *"fixing something
and describing the fix are separate acts with separate failure modes, and only a
fresh reviewer catches the second kind."* **The construction was sound; the
description was not, and the description was hiding a real omission.**

---

## 1. Findings, all verified at source before being accepted

| # | Leg(s) | Finding | Verified | Fixed |
|---|---|---|---|---|
| 1 | **both** | `root`, `intermediate`, `sum` unwiped despite ruling condition 2, with prose calling it a boundary | ✔ compile probe: both `k256` types impl `Zeroize` | ✔ all three wipe explicitly |
| 2 | Gemini | ⚠⚠ **`Zeroizing::new(sha512half(&m))` COPIES** — `[u8; 32]` is `Copy`, so the bare temporary survives. **E-178's defect reproduced in the commit that fixed E-178** | ✔ | ✔ the closure now hashes through `sha512half_zeroizing`, so no bare temporary exists |
| 3 | **both** | Part 5 **counted needles anywhere**, so a commented-out production line still satisfied its needle | ✔ | ✔ source is comment-stripped; a third control feeds a commented-out site |
| 4 | **both** | Part 5's two controls **tested nothing** — the positive re-ran the same count on the same string, the negative checked an unrelated absence | ✔ | ✔ all three controls run through `find_missing`, the real detector |
| 5 | Codex | `b58_decode`'s accumulator and `base58check_decode`'s `raw` hold the decoded seed | ✔ | ✔ both wipe; ⚠ **`bytes` GROWS, and reallocation residue is named at the site rather than fixed** |
| 6 | Codex | `keygen.rs:317` `Zeroizing(*sk.as_bytes())` — the same `Copy` source defect | ✔ | ✔ bound and wiped |
| 7 | Gemini | *"`k256::SecretKey` owns the surviving copy"* is false — `to_nonzero_scalar` copies out to a type with no `Drop` | ✔ | ✔ corrected in place |
| 8 | Gemini | *"`out` IS RETURNED, so it is a MOVE"* — `[u8; 16]` is `Copy` | ✔ **right conclusion, wrong mechanism** | ✔ corrected, conclusion kept |
| 9 | Gemini | The revert's description claimed it falsifies the **ed25519** site; it only breaks at `derive_scalar` | ✔ | ✔ description narrowed |
| 10 | Gemini | *"2 compile errors"* overstated | ✔✔ **AND MORE THAN THE LEG KNEW: IT IS ONE.** `grep -c '^error'` counted rustc's *"could not compile … due to 1 previous error"* **summary line** | ✔ corrected in the gate and in `CLAIMS.md` E-179 |
| 11 | Gemini | Calling `root_pub` simply *"public"* overstates its exposure | ✔ **accepted as wording** | ✔ now *"not secret key material — leaking it reveals no private scalar — but neither is it published"* |

⚠ **ONE LEG CLAIM REJECTED, with the reason, so it is not relitigated.** Gemini's
4.2: *"if `root_pub` leaks alongside `sum`, an attacker can compute `intermediate`
and recover `root = sum − intermediate`."* **An adversary holding `sum` already
holds the account private key**, so the scenario describes a compromise that is
total before `root_pub` is considered. `root_pub` alone reveals no private scalar —
that is the discrete log. **The wording criticism (finding 11) is accepted; the
threat scenario is not.**

---

## 2. ⚠ What this round says about the previous one

**Round one's ruling was right and round one's build was not.** The split between
Gemini and Codex in `REVIEW-029` was about scope; **neither leg was looking at code,
because there was none.** The first thing an external reader of the code found was
that the code did not do what the ruling said.

⚠ **The count that was wrong is the sharpest instance.** `CLAIMS.md` E-179's own
subject is *a measured result, not an assumption* — and the measurement in it was
wrong, because a `grep -c` counted a summary line. **A row about measuring
carefully, containing a careless measurement.** That is the seventh time this
project has put a wrong count in a fix report.

---

## 3. What may be claimed now

**P-5, unchanged and it is the ceiling:** the derivation path's wiping **narrows a
window and removes no channel.**

⚠ **Named residuals, none of them fixed and all of them stated at their site:** the
`Sha512` and `Sha256` block buffers; the source of every Rust move; **every heap
buffer a `Vec` reallocation released before the `Zeroizing` wrapper dropped**; the
`SecretKey` temporary inside `derive_scalar`; and `serde_json`'s parse scratch,
which is **B-23** and is not covered.

**Not executed on Devnet, and no run was needed:** the derivation is pinned by
`family_seed_derivation_matches_ripple_keypairs` against an independently written
implementation, and every one of these changes had to leave the derived keys
byte-identical. **268 tests, three green runs.**

⚠ **Round three is not run.** `CLAUDE.md`: *"a third round would review the fixes to
the fixes; that is where it stops paying."*
