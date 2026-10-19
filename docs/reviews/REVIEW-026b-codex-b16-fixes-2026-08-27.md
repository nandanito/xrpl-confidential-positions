The cryptographic construction remains sound, and the two new panics plus deletion of `Hedge::Fresh` are appropriate. The fixes are not ready to be described as fully reviewed, however: the rebuilt revert sweep retains a false-pass mode, the feature gate still cannot support all of its per-symbol labels, and several cited sentences were missed.

## 1. Round-one findings, checked against the leg reports

I consolidated duplicate findings but preserved the leg-specific sites.

| Round-one finding | Status | Post-fix evidence |
|---|---|---|
| §6 gate 1 could not be checked because `xrpl_vectors.rs` was missing | **FIXED** | `xrpl_vectors.rs:43-65` requires an ed25519 key in the vectors; `:87-99` sends every key through `Hedge::DeterministicForVectors` and compares against the `ripple-keypairs` signature. |
| Devnet run lacked source-to-binary provenance and a committed receipt | **PARTIAL** | The script rebuilds and records provenance at `b16-hedged-ed25519-devnet.ts:75-85`; the receipt records commit/dirty state at `docs/runs/…json:4-5`. But the receipt is for `26152154…`, not frozen commit `e9a3d26…`, and the prose cites a different transaction—see below. |
| `check-test-support-gate.ts` could false-pass through echoed source text | **PARTIAL** | Per-expression compilation and positive/negative directions at `check-test-support-gate.ts:145-197` fix the original echo problem. But the `sign_message_with` probe at `:70-73` also requires `Hedge`, and the `FixedAux` probe at `:84-87` requires all three of `Hedge`, `FixedAux`, and `sign_message_with`. Those rows still cannot independently establish the named symbol. |
| `revert-sweep.py` treated any nonzero exit as an intended test failure | **PARTIAL** | It now extracts failed names and requires an expected name at `revert-sweep.py:78-92`. It has no clean baseline inside the script, so an expected test already failing before mutation makes that mutation pass. |
| Wrong-sized successful-draw injection silently became entropy failure | **FIXED** | `store.rs:139-155` consumes the injected value and panics on a length mismatch. This is test-only and correctly treats malformed setup differently from runtime entropy failure. |
| DST test was a literal-to-itself tautology | **FIXED** | Production constant is public at `xrpl.rs:594-610`; the test compares it with the ruled literal at `hedged_signing.rs:643-651`. |
| Verifying-key test name claimed “no caller can choose it” | **PARTIAL** | The observable test has been correctly renamed at `hedged_signing.rs:621`. But `:617-619` still says any caller-supplied key being threaded in “is what would move”; a correctly supplied seed-derived key would remain invisible to this test, exactly as `:607-615` admits. |
| Verifying-key drift guard was compiled out in release | **FIXED** | Hard `assert_eq!` at `xrpl.rs:577-584`; release uses abort. The invariant is currently unreachable through safe constructors, and aborting on future key drift is appropriate. |
| `k.to_bytes()` made a gratuitous secret copy | **FIXED** | `Sha512::digest(k.as_bytes())` at `xrpl.rs:529-535`. |
| `Hedge::Fresh` was an unused second path | **FIXED** | Removed at `xrpl.rs:656-705`. Default fresh entropy remains exercised through `sign_message → fresh_aux` at `:458-460`; no executed coverage was lost. |
| KAT name/framing overstated independence; masked arm lacked an outside implementation | **PARTIAL** | Function renamed at `hedged_signing.rs:695` and asymmetry discussed at `:674-691`. Missed sites remain: the section heading at `:634-636`, assertion text at `:708-712`, and `xrpl.rs:680-684` still say “independent implementation.” |
| “BUILT” / “B-14 CLOSED” failed to distinguish review status | **FIXED at the cited headers** | `xrpl.rs:46-60` and `hedged_signing.rs:33-55` now distinguish built/executed from reviewed. Separate register claims remain overstated below. |
| Wrong test credited for the successful-zero-draw decision | **FIXED** | Correct attribution and the earlier false pass are stated at `xrpl.rs:80-91`; the production-path test is `hedged_signing.rs:407-444`. |
| Deleted `one_implementation_not_two` was still credited | **FIXED** | `hedged_signing.rs:26-31` now assigns the property to private helper structure. |
| Ed25519 nondeterminism test called itself “the whole ruling” | **FIXED at the cited site** | Corrected at `hedged_signing.rs:541-548`. The same overclaim still exists for secp256k1 at `:66-71`. |
| Makefile claimed coverage of “every gated symbol” | **FIXED** | The target now says it covers a named probe set and not the whole public surface. |
| Zeroize test name claimed an observed memory effect | **PARTIAL** | Function renamed at `hedged_signing.rs:776-790`. Stale old names remain in `Cargo.toml:53-55` and the B-19 decision at `:164-171`. |
| B-19 said “no API” | **FIXED** | Narrowed to no `wconf-signer` callable API or wire-format change at `DECISION-b19…:11-15`. |
| B-19 said “nothing measurable” / “cost of zero” | **PARTIAL** | Main rationale is corrected at `DECISION-b19…:127-135`, but the rejected-alternatives table still says “at a cost of zero” at `:183`. |
| `Cargo.toml` said “No keys, no proofs, no signing” | **FIXED** | Corrected at `Cargo.toml:6`. |
| Revert sweep mutated the live tree with unsafe shared restoration | **PARTIAL** | Unique backup and `atexit`/SIGINT/SIGTERM restoration were added at `revert-sweep.py:38-57`. It still mutates the shared files at `:61-67`; concurrent sweeps or an editor can race and one restoration can overwrite the other’s work. The leg explicitly requested an isolated copy/checkout. |
| `xrpl.rs` said the default draw happens in `Hedge::aux` | **NOT FIXED** | The false sentence remains at `xrpl.rs:708-713`, even though a correction saying it used to exist was added at `:639-647`. |
| Remaining SHA-512/mask/entropy stack locals are unwiped | **NOT FIXED — deliberately deferred** | Accurately retained as B-21 at `xrpl.rs:529-534` and `DECISION-b19…:146-160`. |
| `make signer-release` claimed an exclusion check it did not perform | **FIXED** | The Makefile now limits that target to establishing release compilation. Ironically, `check-test-support-gate.ts:11-17` still says the Makefile “still carries” the removed sentence. |

The round-one §7 condition requiring a second review is being performed by this review. Its occurrence does not make the branch clean: the findings above must still be adjudicated and repaired.

## 2. New or surviving false-pass modes

### Revert sweep: expected failure without a clean baseline

This is the main new false-pass.

`revert-sweep.py:83-92` accepts a mutation whenever one expected test appears in the failure set, but the script never first proves the unmodified target passes. If a KAT or other expected test is already failing because of a stale fixture, environment problem, or concurrent edit, every mutation listing that test can be certified.

The external `cargo test x3` reduces the likelihood for this recorded run, but it is not part of the sweep’s causal check. The sweep should:

1. Restore and run the exact target once, requiring zero failures.
2. Then apply each mutation and require a newly failing expected test.
3. Prefer an isolated copy/worktree so the baseline and mutations share controlled inputs.

It also claims to run the “WHOLE suite” at `:70-76`, but actually runs only `cargo test --test hedged_signing` at `:78-79`.

### Test-support gate: expression isolation is not symbol isolation

The original echoed-line flaw is gone, but the output labels still over-attribute:

- `sign_message_with` at `:72` also names `Hedge::DeterministicForVectors`.
- `FixedAux` at `:86` also names `Hedge` and `sign_message_with`.

Thus the gate establishes that each complete probe expression is unreachable, not that every named symbol is independently gated. The caveat at `:47-50` acknowledges only the enum/variant coupling, not the method coupling.

Additionally, the comments and register say “one crate per probe,” but the implementation creates one temp crate at `:137-139` and repeatedly rewrites it at `:163-170`. This is mostly descriptive rather than functional, but it is false.

### Devnet receipt generation

Two robustness problems remain:

- `b16-hedged-ed25519-devnet.ts:75-77` ignores git command exit status. A failed `git rev-parse`/`status` can yield an empty commit and false `dirty=false` rather than voiding the provenance check.
- The categorical success claim and repository receipt are written at `:273-305` before `ok` is computed at `:307`. A failed later run can overwrite a good receipt with an artifact whose `claim` still says rippled accepts the construction.

## 3. Descriptions that overstate or contradict the evidence

The material ones are:

- `CLAIMS.md` E-163 says the signer “no longer signs pure RFC 8032.” False: reported entropy failure deliberately takes the pure RFC 8032 arm at `xrpl.rs:631-636`, and the test-only deterministic arm also remains.
- E-163, `CLAUDE.md`, the README, and the architecture document cite transaction `9356A524…`; the committed receipt records `5A8CF0B…` at `docs/runs/…json:16`. The packet contains no committed evidence for `9356A524…`.
- The receipt was built from `26152154…`, not the frozen commit. Descriptions should either name that exact commit and explain why subsequent changes are behavior-preserving or rerun from `e9a3d26…`.
- `hedged_signing.rs:682-686` says no third party computes the construction and calls that a “deduction.” The construction originating here does not prove nobody outside the repository has implemented it. Under P-12, narrow this to “no third-party implementation is present in the evidence checked.”
- KAT independence language survives at `hedged_signing.rs:634-636`, `:708-712`, and `xrpl.rs:680-684`.
- The hard-assert message at `xrpl.rs:580-583` compresses “mismatched `A`” directly into “two equations … recover the scalar.” Recovery requires multiple equations with nonce reuse and differing challenges/keys; a single fixed mismatch merely produces an invalid or inconsistent signer. The assert is still correct.
- `store.rs:217-220` says `r`/`ρ` “are not affected by a successful draw,” immediately before admitting the hook gives a test chosen `r`. The successful injected draw does affect them.
- `revert-sweep.py:31` says eleven mutations; the list and output contain twelve.
- `check-test-support-gate.ts:11-17` says the Makefile still contains wording that this diff removed.
- `DECISION-b19…:116-117` gives the resulting feature list as `["std", "zeroize"]`; the actual manifest includes `hazmat` too.
- `DECISION-b19…:183` retains “cost of zero.”
- `Cargo.toml:53-55` and `DECISION-b19…:167` retain the deleted zeroize test name.
- `xrpl_vectors.rs:75-85` describes the default path generically as hedged RFC 6979 and discusses low-S/DER. That describes secp256k1, not the ed25519 half exercised by the same test.
- `CLAIMS.md` E-166 and the round-one adjudication say all findings are fixed. The leg-by-leg citations above make that claim false.

## 4. §6 gate 1

**ESTABLISHED.**

The packet now shows all necessary test structure:

- `xrpl_vectors.rs:43-65` proves the vector set includes at least one ed25519 key.
- `:87-99` signs every vector key through the new deterministic arm and compares byte-for-byte with its `ripple-keypairs` signature.
- `hedged_signing.rs:323-336` independently compares the same arm with `ed25519-dalek`’s ordinary `SigningKey::sign`.
- The supplied execution record says the tests passed repeatedly.

Round one’s PARTIAL grade was correctly a packet defect, not a code defect.

## 5. Panic and deletion review

- Hard verifying-key assert: **appropriate**. It is unreachable under the current private-field constructors, but intentionally reachable if a future edit breaks the `SigningKey`/published-key invariant. Aborting is safer than emitting a signature under an inconsistent key.
- `store::getrandom` mismatch panic: **appropriate**. It exists only under `test-support` and is reached only by malformed injected test data. Returning `Err` would falsely exercise the entropy-failure fallback.
- `Hedge::Fresh` deletion: **appropriate, with no coverage loss**. It had no caller; the real fresh path is `sign_message → fresh_aux`, which the default-path tests exercise.

## 6. Confidence and a third round

Confidence:

- Construction: **9/10**
- Fix implementation: **7/10**
- Evidence and descriptions: **6.5/10**

I agree with `CLAUDE.md` that a full third adversarial round would stop paying. The right next step is a bounded fix-and-verify pass: add the sweep baseline and isolation, narrow the gate’s labels/probes, reconcile the receipt commit/hash, and mechanically search for the stale sentences listed above. After that targeted verification, stop; do not initiate another broad review rotation.
