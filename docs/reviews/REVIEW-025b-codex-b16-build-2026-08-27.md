Packet-only review; I used no tools.

## 1. Verdict on the construction

**Yes.** The source implements §3 exactly.

- `sk = SHA512Half(entropy)` is established at `xrpl.rs:363-374`.
- `h = SHA512(sk)` is `xrpl.rs:512`.
- `ExpandedSecretKey::from_slice(&h)` at `513-514` clamps `h[0..32]` into the scalar and copies `h[32..64]` into `hash_prefix`, per `hazmat.rs:81-98`.
- The 29-byte DST, including its trailing zero, is correct at `xrpl.rs:556`.
- `SHA512(DST ‖ aux)` is constructed in that order at `522-525`.
- `esk.hash_prefix.iter_mut().zip(mask.iter())` at `526-528` XORs exactly the first 32 digest bytes over the nonce prefix. The scalar is untouched.
- `fresh_aux` maps successful draws—including all-zero draws—to `Some` and reported failures to `None` at `577-582`.
- The verifying key is derived from the same expanded scalar at `539`, not supplied by a caller.
- `raw_sign::<Sha512>(&esk, message, &vk)` at `544` preserves pure Ed25519, the message bytes, challenge transcript, arithmetic, and encoding.

I find no byte-order, half-selection, concatenation-order, or wrong-field defect in the construction.

## 2. §6 gates and §7 conditions

### §6

1. **PARTIAL** — The crate-self comparison at `hedged_signing.rs:307-320` is present, but the required `ripple-keypairs` test source (`tests/xrpl_vectors.rs`) is absent from the packet. Its behavior cannot be verified from a comment plus aggregate “265 passed” output.
2. **ESTABLISHED** — `Hedge::FixedAux` is test-only, and `two_fixed_aux_values_give_two_nonces` checks distinct `R` values plus strict verification under one key/message.
3. **ESTABLISHED** — The production-site successful-draw hook reaches `store::getrandom → fresh_aux → sign_message`; `a_successful_all_zero_draw_still_hedges` distinguishes it from `None`.
4. **ESTABLISHED** — The injected failure reaches the default path and `ed25519_entropy_failure_degrades_to_rfc_8032` checks successful signing and exact deterministic equality.
5. **ESTABLISHED** — `one_aux_over_two_messages_does_not_reuse_the_nonce` checks different `R` for different messages and exact reproduction for the same message.
6. **ESTABLISHED** — Source and tests establish 64-byte canonical signatures, strict verification, unchanged published key, and internal derivation of `vk`.
7. **PARTIAL** — The recorded run decoded an `0xED` key, distinguished the signature from deterministic RFC 8032, and reached a validated ledger. However, the script executes an existing `signer/target/debug/wconf-signer` without rebuilding it or recording that the binary came from frozen commit `200aae63`. Given the stated moving-worktree history, source-to-binary provenance is missing.
8. **PARTIAL** — Eleven mutations reportedly produced nonzero test exits, but the sweep accepts nearly any non-compilation nonzero exit as “test failed,” does not require an expected named test to appear in `failed`, and the supplied output omits the script’s own `-> failing:` lines. It therefore does not establish that each mutation caused its intended test to fail.

### §7

1. **ESTABLISHED** — Private `sign_with_aux(Option<[u8; 32]>, message)` is at `xrpl.rs:477`; both public/default and test-only entry points call it at `441-456`, for both algorithms.
2. **ESTABLISHED** — `vk` is derived inside that helper from `esk` at `539`; it is not a parameter.
3. **ESTABLISHED by source** — `sign_message_with`, `Hedge`, and `FixedAux` are all gated by `test-support`. The dedicated probe has a false-pass weakness described below, but the complete source directly establishes the condition.
4. **ABSENT** — This packet is round one. There is no completed round-one adjudication followed by a second adversarial review of its fixes.

## 3. Tests that do not establish what they are named for

- `the_dst_is_the_ruled_bytes` is tautological. `RULED_DST` is defined from the literal and compared to the same literal; it never references `ED25519_NONCE_HEDGE_DST`. Its comment claiming an edit to `xrpl.rs` would be noticed by this test is false. The construction KAT happens to catch such an edit, but this test does not.

  Remedy: move a literal comparison into an `xrpl.rs` unit test that can access the production constant, or remove/rename this tautological test. Confidence: 10/10.

- `the_verifying_key_is_the_published_one_and_no_caller_can_choose_it` establishes the first clause, not the second. “No caller can choose it” is established structurally by the private helper signature, exactly as its own comment admits.

  Remedy: rename it to the observable property and leave the caller-boundary claim to source inspection. Confidence: 10/10.

- `ed25519_secret_material_is_zeroized_on_drop` proves that the two types implement the marker trait. It does not itself test the memory effect named. The complete dependency source supplies the missing evidence through the actual `Drop` implementations, so B-19 remains supportable, but the test name overstates what the test alone proves.

  Remedy: rename it to `ed25519_secret_types_implement_zeroize_on_drop`. A freed-memory runtime test would indeed be the wrong remedy. Confidence: 9/10.

- `the_construction_matches_an_independent_implementation` compares against a second, Noble-based model, but that model and its vectors were added by this project in the same change. This is useful cross-implementation consistency, not independent authorship or an independent review.

  Remedy: call it a secondary Noble-based model unless another party independently produces the vectors. Confidence: 9/10.

- `check-test-support-gate.ts` can falsely report individual symbols as gated. All probes share one source file, and it checks `without.out.includes(symbol)`. If `Hedge` or `FixedAux` becomes public while `sign_message_with` remains unavailable, a compiler diagnostic can echo those names in the failing source line and the script will mark them “gated.”

  Remedy: compile one isolated probe per symbol in both directions, preferably checking structured diagnostics and the exact failing span. Confidence: 10/10.

- `revert-sweep.py` does not prove its named “watch its test fail” property. Any runtime, harness-argument, missing-fixture, or infrastructure failure becomes `FAILED`; parsed failing test names are printed but never validated. Multiple positional filters make the omitted raw output particularly important.

  Remedy: run each expected test separately or the complete suite, require at least one expected test name in the failure record, and reject harness/infrastructure failures. Confidence: 9/10.

## 4. Overclaims

- `xrpl.rs:46-51`, `hedged_signing.rs:26-32`, and `238-245` say B-16 is “BUILT” and B-14 is “CLOSED.” §7 condition 4 is still absent, and gates 1, 7, and 8 are not fully evidenced by this packet. Closure is premature.
- `xrpl.rs:71-74` says `zero_aux_is_hedged_not_a_fallback` holds the successful-draw property. That is the test already shown not to reach `fresh_aux`; the correct evidence is `a_successful_all_zero_draw_still_hedges`.
- `hedged_signing.rs:20-24` still says the now-removed `one_implementation_not_two` test “is what holds” the structural property.
- `hedged_signing.rs:250-255` falsely says the tautological DST test notices edits to the production constant.
- `hedged_signing.rs:525-526` calls the non-repetition test “the whole ruling in one assertion.” Alternate or accidental nondeterminism also passes it.
- The comment around `hedged_signing.rs:605-635` says the comparison is against an implementation “this project did not write.” The curve library is external; the signing model is project-authored.
- The Devnet script’s “the nonce prefix was hedged” conclusion is stronger than that run alone establishes, particularly without frozen-binary provenance. The run establishes a valid, non-deterministic-looking Ed25519 signature; attribution to this exact combiner depends on commit-pinned source and KAT evidence.
- B-19’s record says the change alters “no API,” but its test depends on newly available public trait implementations. “No `wconf-signer` callable API or wire-format change” would be accurate.
- B-19’s “nothing measurable” and “cost of zero” wording is unsupported. Zeroization executes additional writes and may add code. “No new dependency download; expected negligible cost, not measured” is supportable.
- The commit message and `CLAIMS.md` contents are not in the packet, so their claims cannot be reviewed.

## 5. B-19

**Accept**, separately from B-16.

The packet establishes that enabling `zeroize` activates real `Drop` implementations for `ExpandedSecretKey` and `SigningKey`, including scalar zeroization through `curve25519-dalek/zeroize`. It restores sensible secret-lifetime hygiene without changing signatures or wire bytes.

The record correctly disclaims live-process compromise, compiler/move copies, the helper’s SHA-512 locals, and broader memory protection. I would accept the implementation while correcting the “no API” and “zero cost” language noted above.

## 6. Findings outside the question

- `revert-sweep.py` mutates `signer/src/xrpl.rs` in the live working tree, uses a shared fixed backup `/tmp/xrpl-reverts.bak`, and has no `try/finally` or signal-safe restoration. An exception, interruption, or concurrent run can leave the reviewed tree mutated or restore another run’s backup. Run mutations in an isolated temporary checkout/copy. Confidence: 10/10.
- `next_entropy_draw_returns_for_test` promises the next draw will succeed, but a wrong-sized input returns `Err`; `fresh_aux` then silently converts that test-setup error into the deterministic fallback. A malformed test can therefore exercise the wrong arm. Make the signing hook accept `[u8; 32]`, or panic loudly on a test-hook length mismatch. Confidence: 9/10.
- `Cargo.toml:6` still describes the package as “No keys, no proofs, no signing,” which is plainly false.
- `xrpl.rs:651-654` says the default entropy draw happens in `Hedge::aux`; the default path now draws through `sign_message → fresh_aux`. The comment is stale.

## 7. Confidence and what would move it

**Confidence: 9/10 on the construction; 8/10 on the overall build evidence.**

It would increase with:

- the complete `xrpl_vectors.rs` source and its specific test output;
- a clean rebuild and Devnet run explicitly pinned to `200aae63`;
- raw revert-sweep output proving the expected named tests failed for the expected reason;
- isolated per-symbol feature-gate probes;
- the commit message and `CLAIMS.md` closure entry;
- completion of round two after these findings are addressed.
