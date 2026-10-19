# REVIEW-020f — adjudication, round two (the fixes)

- **Date:** 2026-08-20
- **Subject:** commit `6e66e05` — the round-one fixes, and the sentences written
  about them
- **Legs:** `REVIEW-020d` (Gemini), `REVIEW-020e` (Codex — **no new findings**)
- **Outcome:** **two findings, both upheld, both in prose rather than in code.**
  And they are the reason this round exists.

---

## 1. What round two is for, and what it found this time

`CLAUDE.md`: *"fixing something and describing the fix are separate acts with
separate failure modes, and only a fresh reviewer catches the second kind."*
Round two here found **no defect in any fix**. It found **two false sentences
written about the fixes**, one of them in the code and one of them in
`REVIEW-020c` itself.

That is category four of the four this project has learned to look for, and it is
the only category that fired. The other three — a defect introduced by a fix, a
hole in something a fix rewrote, a test written for a round-one finding that
passes for the wrong reason — were looked for by both legs and found by neither.
Codex's contribution was a **test-by-test audit** asking *"what would this test do
if the property it names were false?"* of all five tests round one touched, and
it answered the question for each rather than asserting a verdict.

## 2. Upheld

### U-4 — the explanation of why `try_from_parts` cannot catch an aliasing bug was wrong (Gemini, LOW)

Round one's `into_keypair` docstring, the matching test comment, and
`REVIEW-020c` §3 R-1 all said the same thing:

> *"…the keypair would leave that function holding thirty-two zero bytes — and
> `try_from_parts` would not save it, **because it validates whatever it is
> given**."*

**That clause is false, and it describes `try_from_parts` as the opposite of what
it is.** It validates: it recomputes `sk·G` and refuses a mismatch. Thirty-two
zero bytes against a real `pk` would be rejected outright.

**The real reason is temporal, not about what it checks.** `try_from_parts` runs
*while `self` is still alive*, so an aliased buffer would validate correctly and
then be wiped by the destructor on the way out. The check is synchronous; the
zeroization is not.

⚠ **The irony is worth recording rather than smoothing over.** The sentence was
written to explain why a *rejected* finding still deserved a test — and it
mis-stated the very function whose validation was the subject of a different
finding upheld an hour earlier (E-120). Corrected in all three places, with the
old wording struck rather than deleted.

**The test itself was not affected**, and Codex's independent audit confirmed it:
`the_derived_secret_survives_its_source_being_zeroized` fails if the returned
secret is zeroed or does not match the returned public key.

### U-5 — the banner attributed two layers' rules to one protocol (Gemini, LOW)

The daemon's derived-source banner said:

> *"Neither key can be ROTATED: XLS-0096 has no rotation and no recovery, at any
> level."*

**"Neither key" covers the XRPL account key, and XLS-0096 does not govern XRPL
account keys.** More sharply: an XRPL account's spending authority *can* be
moved — `SetRegularKey` and `lsfDisableMaster` are the mechanism — and
**detecting exactly that is what this milestone built.** The banner contradicted
the warning printed a few lines below it, in the same window, on the same run.

Corrected to attribute each rule to its own layer: the **ElGamal** key cannot be
rotated because XLS-0096 has no rotation and no recovery; the **master seed** is
fixed because the AccountID derives from it; and what an account *can* move is
its spending authority, which is the case this signer warns about.

⚠ **The more useful half of this finding is where the sentence was living.** It
was six inline `eprintln!` lines in `main.rs` — the one disclosure surface in this
project that was **not** a constant with an asserted wording. `CLAIMS.md` B-15's
`REMOTE_SOURCE_DISCLOSURE` is a constant with a test; every disclosure in
`onboarding.rs` is a constant with a test; the daemon banner was neither, and a
false sentence lived in it through a full round of review.

The banner text is now in `onboarding.rs` as six constants, and
`the_daemon_banner_attributes_each_rule_to_the_layer_that_makes_it` asserts each
attribution **and** carries the negative — *no banner may say "neither key can be
rotated"* — because only a negative catches a sentence coming back. Three reverts
were spot-checked and all three fail the test.

## 3. Rejected

None. Both findings were checked against the source and both held.

## 4. Where this stops

`CLAUDE.md`: *"A third round would review the fixes to the fixes; that is where it
stops paying."* Round two's fixes are two corrected prose passages and one
refactor that moved existing text behind a test. The next artifact is not another
packet.

⚠ **One thing neither round covered, and it is the largest item in the
milestone.** Neither leg questioned that the derivation is unpublished — issue
#10 — because it is not a code defect and no review round changes it. It is
recorded in architecture §5, §8, and in `onboarding::THIRD_PARTY_WALLET_NOTICE`,
which tells a holder to their face that a third-party wallet will restore their
public account and not their confidential balance.
