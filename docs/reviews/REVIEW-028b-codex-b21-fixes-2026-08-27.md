# REVIEW-028b — CODEX leg, round TWO: the fixes to REVIEW-027

**Date:** 2026-08-27. **Frozen commit:** `d535589`. **Parent:** `d8eb7a3`. **Model:** `codex exec --sandbox read-only`, gpt-5.6-sol, read-only repository access.

⚠ **Three targeted passes, one question each, ≤200 words** — the only shape that returns output at all. See `REVIEW-027c` §4.

⚠ **This leg found the round's whole content.** Round two exists because *fixing something and describing the fix are separate acts with separate failure modes*, and every finding below is the second kind.

## Does part 3 close the hole, and can it false-pass?

**PARTIAL.** Part 3 closes the exact `Sha512::digest(k.as_bytes())` regression. `None` fails loudly (`tools/check-zeroize-bounds.py:267-284`), and an empty arm cannot pass the control because the required replacement would be unchanged (`:301-305`).

But it can false-pass:

- Only exact spellings `Sha512::digest` and `Sha512::new` are banned (`:286-288`). `<Sha512 as Digest>::digest(secret)`, a type alias, `Default::default()` plus `finalize()`, or another unwiping helper evades it while a decoy `sha512_zeroizing(...)` call remains.
- The locator is textual and unbounded: it searches for the Ed25519 arm anywhere after `fn sign_with_aux` and ends at a brittle brace substring (`:269-276`). A wrong/truncated span containing the first expected call passes the control while omitting a later secret hash. The control mutates only the key-expansion call, not the mask call (`:301-307`; real calls: `signer/src/xrpl.rs:612,629`).

Thus the built-in control is adequate only for nonempty-location and the exact historical inlining—not reachability or all secret hashes, despite the stronger diagnostic at `:291-292`.

Also confirmed: the newly committed review packet contains two fresh false B-19 copies at `docs/reviews/REVIEW-027-REQUEST-b21-and-e171-2026-08-27.md:785-787` and `:5514-5516`.

## Did the fixes introduce ANOTHER copy of the false claim?

**PARTIAL.** The newly rewritten explanations correctly say the feature was always enabled. But the fix missed two live offending sentences:

- **REFUTED** — `signer/Cargo.toml:77-85`: “the `ZeroizeOnDrop` bound so reverting B-19’s manifest line fails to COMPILE.” It still compiles.
- **REFUTED** — `signer/tests/hedged_signing.rs:808-815`: “`features = ["std"]` left `zeroize` off … [B-19] decided it on.” The feature was already on.

Consequently, these new completeness claims are also false:

- **REFUTED** — `CLAIMS.md:231`: “Fixed at all four live sites.”
- **REFUTED** — `docs/reviews/REVIEW-027c-adjudication-b21-e171-2026-08-27.md:26`: “All four live sites fixed.”

Strictly, the two substantive false sentences were inherited from `d8eb7a3`, not newly added—but the fixes failed to remove them while newly claiming complete removal. The rejected Gemini report is explicitly marked historical and wrong at its line 5, so I did not treat its body as live project assertions.

## Is anything in the NEW prose overstated under P-5?

**PARTIAL.** The intended P-5 claim is accurate: the comments expressly say wiping only narrows exposure and removes no channel ([signer/Cargo.toml:54]($REPO/signer/Cargo.toml:54), [signer/src/xrpl.rs:231]($REPO/signer/src/xrpl.rs:231)). The B-19 corrections and renamed return-type test are also properly bounded.

But the new prose says part 3 “closes” the hole by checking that the Ed25519 arm “hashes only through” the helper ([signer/src/xrpl.rs:1464]($REPO/signer/src/xrpl.rs:1464)) and elsewhere calls it a check of “the call sites” ([signer/tests/hedged_signing.rs:839]($REPO/signer/tests/hedged_signing.rs:839)).

That exceeds what the script delivers. It merely rejects two literal spellings and requires the helper’s name somewhere in the arm ([tools/check-zeroize-bounds.py:286]($REPO/tools/check-zeroize-bounds.py:286)). A dummy helper call plus `H::digest(k.as_bytes())`, where `type H = Sha512`, passes. Thus the PASS output’s “call-site check” label ([tools/check-zeroize-bounds.py:316]($REPO/tools/check-zeroize-bounds.py:316)) overstates a known-spelling regression check.
