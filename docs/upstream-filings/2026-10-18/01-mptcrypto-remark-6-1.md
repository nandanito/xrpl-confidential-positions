TITLE: [Docs] Paper Remark 6.1 does not define the "statement" in its nonce input, and one reading repeats nonces on a retry
REPO: XRPLF/mpt-crypto

---

Remark 6.1 of `paper/cmpt-compact-sigma.tex` derives the Send proof's nonces from the witness and a `statement`, and the word is ambiguous. The paper's formal statement **x** omits `TransactionContextID`. §6.2 lists the context ID among the challenge-hash inputs and warns against "omitting any statement element" from the hash. Suppose a client takes the x reading and leaves out the optional entropy. Then a retry of the same transfer against unchanged ledger state (the same keys and balance ciphertext), with the same `r` and `ρ`, repeats its nonces under a new challenge. That reveals `sk_A`. This library's prover is not affected.

**Suggested fix:** define `statement` in Remark 6.1 to include `TransactionContextID`, and give that, rather than the witness, as the reason the nonces differ between transactions.

**What the paper says** (at `3baaaac`)

[Remark 6.1, lines 844-857](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L844-L857):

> (α_m, …, α_sk) ← HKDF(sk_A ‖ r ‖ m ‖ b ‖ ρ ‖ statement ‖ fresh entropy).
> Including the full witness ensures nonces are unique per transaction.
> The optional fresh entropy provides defense-in-depth.

The two readings of `statement`:

- **x**, defined at [lines 283-284](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L283-L284). It lists points and keys, and no context ID, and [line 487](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L487) calls x *"a statement"*.
- **Every challenge-hash input.** [§6.2, lines 862-876](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L862-L876) lists `TransactionContextID` as item 4 of the challenge-hash inputs, then says *"Omitting any statement element from the hash would allow cross-protocol attacks."*

**Why the x reading fails**

A retry with a new `Sequence` gets a new context hash, because the hash includes `Sequence` ([`mpt_utility.cpp` lines 286-297](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/src/utility/mpt_utility.cpp#L286-L297) and [396-418](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/src/utility/mpt_utility.cpp#L396-L418)). So the challenge changes, but under the x reading every HKDF input stays the same. From the [responses, lines 342-352](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L342-L352), `z_sk = α_sk + e·sk_A`. Two proofs with the same `α_sk` give `sk_A = (z_sk − z'_sk) / (e − e')`. [Lines 1392-1395](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L1392-L1395) apply the same guidance to ConvertBack and Clawback.

**Why the prover is not affected**

It adds a fresh random salt on every call ([`mpt_internal.h` line 262](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/src/mpt_internal.h#L243-L262)), and it hashes the context ID into the statement when given one ([`proof_compact_standard.c` line 240](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/src/proof_compact_standard.c#L236-L248)).

<details>
<summary>Searches for an existing report</summary>

```text
# 2026-10-18. Open and closed, issues and PRs.
gh search issues "Remark 6.1"             --repo XRPLF/mpt-crypto --include-prs   # 1: #18, the paper's PR
gh search issues "synthetic nonce"        --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "full witness"           --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "unique per transaction" --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "erratum"                --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "Remark 6.1"             --owner XRPLF --include-prs             # 1: mpt-crypto#18
# Read in full: #18 (a review comment asks the prover to follow Remark 6.1 and does
# not question its reason), #36 (the salt's role), #45 (two nonce strategies), #92
# (encoding of the nonce input). None says the remark's reason is wrong.

# Audits
Trail of Bits, April 2026 report: this paper is not among its reference papers, and
  its nonce findings (TOB-RIPCTX-16) concern per-recipient nonces. I could not obtain
  its later revision.
  https://github.com/trailofbits/publications/blob/master/reviews/2026-04-ripple-labs-xrp-ledger-confidential-transfer-securityreview.pdf
Sherlock XRP Ledger Attackathon: full findings report not found. Its public trail:
  gh search issues Attackathon --owner XRPLF --include-prs --limit 500    # 88
  gh search issues Sherlock    --owner XRPLF --include-prs --limit 500    # 19
  gh pr list -R XRPLF/rippled --state all --base ripple/attackathon-april-2026   # 16
  106 unique items across the three (104 across the two searches); bodies, comments
  and PR review comments read. None concerns Remark 6.1 or how nonces are derived.
  Both searches include this project's own filing, mpt-crypto#148.
Zellic scan of mpt-crypto@3baaaac: report not found.
  gh search issues Zellic --owner XRPLF --include-prs   # 1: mpt-crypto#147
  #147 cites DEFI-1108, -1109 and -1110 (NULL checks, a Bulletproof output
  buffer, the ElGamal identity point). None concerns Remark 6.1.
```

</details>

---

*Disclosure: prepared with AI assistance. Every quotation and link above was checked on 2026-10-18 at mpt-crypto `3baaaac`. The cited files are unchanged at today's `main` (`c60a60c`).*
