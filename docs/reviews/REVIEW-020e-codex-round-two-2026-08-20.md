# REVIEW-020e — Codex leg, round two (reviewing the fixes)

- **Date:** 2026-08-20
- **Subject:** commit `6e66e05` against `0e6b625`
- **Run:** `codex exec --sandbox read-only --skip-git-repo-check`
- **Result: no new findings.** Its test-by-test audit is below and is the useful part.

---

No new review findings.

**What I Checked And Found Correct**

The confirmation fix is narrow enough. [signer/src/confirm.rs] `render` no longer says the registered key can “never be recovered”; it now distinguishes protocol immutability from the separate question of whether the matching secret is reachable. The negative test would fail if that exact old overclaim returned.

The derived banner in [signer/src/main.rs] makes the right distinction: XLS-0096 has no protocol rotation or recovery, while the W-CONF derived key can be reconstructed from the master seed only while the derivation remains reachable. That does not violate P-10 because the recovery claim is explicitly application-level derivation, not XLS-0096 support.

The standalone onboarding fix in [signer/src/onboarding.rs] removes the duplicate standalone secret print. The updated test asks the right falsification question: if the secret appeared twice again, `shown.matches(&sk_hex).count() == 1` would fail.

The retired-master ordering test now covers the condition it names. It includes both clean and retired-master assessments, checks disclosures before `ask_secret`, and has a control that the “before seed” transcript slice is not the whole transcript. The adjacent comment is also honest about the remaining limitation: either of the two warning routes can be removed without this specific test failing.

The `into_keypair` rejected-claim test is not a false pass. If the returned keypair secret were zeroized or otherwise no longer matched the public key after consuming `DerivedKey`, the zero check or encrypt/decrypt round trip would fail.

The “this account’s amounts and only this account’s” test also exercises the property it names: this account decrypts its own ciphertext, fails on the counterparty ciphertext for the same amount and blinding, and the control proves the counterparty ciphertext is otherwise decryptable by the right secret.

I also do not see a fix-introduced defect analogous to the prior parser hole or bad error-routing case in the material provided.
