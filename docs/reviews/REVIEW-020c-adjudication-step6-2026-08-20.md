# REVIEW-020c — adjudication, architecture §6 step 6 (round one)

- **Date:** 2026-08-20
- **Subject:** commit `0e6b625` — real ElGamal key generation and onboarding
- **Legs:** `REVIEW-020a` (Gemini, `agy --effort high`), `REVIEW-020b` (Codex)
- **Outcome:** **three findings upheld and fixed, two rejected and pinned by
  tests.** No CRITICAL. No finding touched the derivation itself.

---

## 1. What the two legs agreed on, and it is not nothing

**Neither leg found a defect in the construction.** Both independently walked
`REVIEW-012-RULING-keygen-2026-08-18.md` §2 against `signer/src/keygen.rs` —
framing, field order, `u32be` lengths, label bytes, the HKDF-Extract/Expand
split, the total reduction, SEC1 compression — and both reported it byte-exact.
Both confirmed §2.1's refusals fire before anything is hashed, both confirmed the
reduction has no abort path, and neither recommended putting one back.

That is the outcome this project's rules were aiming at: the construction was
ruled first, implemented from the ruling's prose second, and pinned to published
vectors third. **The findings that did land are all in the onboarding half**,
which is exactly what issue #11 predicted when it said the cryptography was the
small part.

## 2. Upheld

### U-1 — the confirmation contradicted the one thing deriving buys (Gemini, MEDIUM)

`signer/src/confirm.rs::render` told a holder, at the approval step of the
irreversible transaction, that the key being registered *"can never be changed,
never be rotated and **never be recovered**"*. `signer/src/main.rs`'s banner said
*"neither key can be rotated or recovered"*.

**For a `derived-from-master-seed` holder, the second half is false**, and it is
false about the only benefit the ruling trades a permanent decryption credential
for: that key **is** reconstructible from a backup the holder already keeps.
That is not a nicety — E-119 executed it against a validated ledger entry four
hours earlier.

⚠ **And the correct fix is narrow, because the neighbouring sentence is right.**
`CLAIMS.md` **P-10** forbids claiming that *XLS-96* supports rotation or
recovery; it supports neither, at any level. Reconstruction under the W-CONF
derivation is an application-level property and is a different sentence. Both now
appear, attributed:

- the confirmation says the registration can never be changed or rotated, and
  that if the matching secret is ever unreachable so is every amount encrypted
  to it — **without** asserting that the secret is unreachable;
- the derived banner says the protocol has no rotation and no recovery **and**
  that the key can be reconstructed from this seed under the W-CONF derivation,
  *"only where the derivation itself is reachable (issue #10)"*;
- the standalone banner says **nothing reconstructs it**, which is the whole
  difference between the two sources.

**Pinned two ways.** `a_registering_convert_says_on_the_confirmation_that_it_registers_a_key`
now asserts the corrected phrases **and** asserts the screen does *not* contain
`"never be recovered"`. A negative assertion is the only kind that catches a
sentence coming back.

### U-2 — "the only time the secret is shown", printed twice (Codex, LOW)

The standalone path's banner said `THIS IS THE ONLY TIME THE SECRET IS SHOWN` and
then printed the secret **twice** — once on its own line and once in the profile
fragment. ⚠ **And the test written to guard it asserted a count of two while its
name said "once"**, which is E-113's shape exactly: a test whose name promises
one thing and whose body encodes the contradiction.

Fixed by printing it **once**, in the profile fragment, where it is the value the
operator actually needs. The test asserts `count == 1` and the banner points at
the line.

**Severity was LOW and the finding is worth more than that.** The exposure
reduction is marginal. What it caught is a sentence that was false about the
screen it was printed on, which is the cheapest overclaim to make and the hardest
to notice later.

### U-3 — the ordering test did not cover the case condition 2 is about (Gemini, LOW)

`every_required_disclosure_is_shown_before_the_seed_is_asked_for` drove only a
clean account, whose required set **excludes** `RETIRED_MASTER_KEY_WARNING`. The
one disclosure the ruling's condition 2 exists for was outside the ordering
assertion. Now parameterised over a clean **and** a retired-master account, with
a control asserting the two required sets differ.

⚠ **The revert check made this less flattering than it looked, and that is
recorded next to the test.** On the derived-retired path the warning reaches the
holder by **two** independent routes — `run`'s disclosure loop, and `derived`'s
override block, which reprints it immediately before demanding the second phrase.
Reverting either alone leaves the property standing; **only reverting both fails
the test**, which is what was verified. The duplication is deliberate — a holder
overriding a recommendation should see what they are overriding at the moment
they override it — but "two routes" means neither is individually pinned, and
saying so beside the test is more use than a claim that it is.

## 3. Rejected, and pinned by tests rather than by disposition notes

`CLAIMS.md` E-93 and E-106 are the precedent: a rejected claim that leaves only a
paragraph behind will be made again.

### R-1 — *"`into_keypair` cannot compile"* (Codex, its only HIGH)

The claim: `DerivedKey::into_keypair` reads `self.sk.0` out of a `Zeroizing<32>`,
Rust forbids moving a field out of a `Drop` type, therefore *"the new derived key
path cannot ship."*

**The premise is false.** `[u8; 32]` is `Copy`, so `self.sk.0` is a copy and the
restriction does not apply. Every build of this crate is the counterexample; the
219-test suite compiled and passed before, during and after the review.

⚠ **This is the fifth time** a leg's premise has been simply wrong in a way that
would have been expensive to act on — the fourth was reporting
`#[serde(deny_unknown_fields)]` missing when it sat one line above the struct.

**But the worry underneath it is real, and it gets a test.** `self` is dropped at
the end of `into_keypair` and its `Zeroizing` overwrites the original buffer, so
*if the handed-out value were an alias rather than a copy* the keypair would leave
that function holding thirty-two zero bytes — and `try_from_parts` would not
save it, because it validates whatever it is given.
`the_derived_secret_survives_its_source_being_zeroized` encrypts under the
returned public key and decrypts with the returned secret. **Revert-checked**:
calling `zeroize()` before the copy makes it fail.

### R-2 — *"`PERMANENT_DECRYPTION_CREDENTIAL` overstates the harm"* (Codex, MEDIUM)

The claim: saying the master seed decrypts *"every confidential amount this
account ever holds, sends or receives"* implies `sk_A` decrypts **counterparties'**
ciphertexts, which it does not.

**It does not say that, and the sentence as written is true.** Every confidential
amount this account is party to carries a ciphertext encrypted **to this
account's own key**: a Send it makes carries `SenderEncryptedAmount` under the
sender's key — which is precisely how the confirmation recovers the amount it
displays — and a Send it receives carries `DestinationEncryptedAmount` under the
destination's, which is how F-23's adversary read an amount off the chain. All
three verbs hold, for this account's amounts.

⚠ **Weakening it would have been a real loss.** The disclosure exists to make a
holder understand the size of what they are accepting, and the accepted cost in
ruling §8 item 1 is *"the holder's entire confidential history, retroactively and
permanently"*.

**The narrower thing the leg was reaching for is also true**, and both halves are
now asserted in
`the_derived_key_decrypts_this_accounts_amounts_and_only_this_accounts`: the
derived secret reads the ciphertext under its own key, does **not** read the
counterparty's ciphertext for the same amount under the same `r`, and the control
shows the counterparty's own secret does.

## 4. What neither leg looked at

Recorded because a review's silence is not coverage.

- **The Devnet execution.** Neither leg was given `tools/spike-step6-2026-08-20/`
  in a runnable form, and neither could have run it. The claim that the ledger
  holds the derived key rests on E-118's recorded transaction hashes and on the
  independent TypeScript comparison inside the driver, not on this review.
- **`mlock`.** Both accepted the zeroization claim as scoped. Neither remarked
  that memory pinning is absent; it is a named gap in E-123 and in the module
  header, and it stays one.
- **Issue #10.** Neither leg questioned that the derivation is unpublished. That
  is the largest open item in this milestone and no review round changes it.

## 5. Round two

`CLAUDE.md`: *"the second round reviews the FIXES"*, because fixing something and
describing the fix are separate acts with separate failure modes. Round two is
run against the post-fix branch and its packet is the fixes plus the sentences
written about them. `REVIEW-020d` and `REVIEW-020e`.
