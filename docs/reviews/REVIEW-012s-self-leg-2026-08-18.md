# REVIEW-012s — self leg on the keygen packet

- **Date:** 2026-08-18
- **Written BEFORE either external leg was read.** This is deliberate and it is the method REVIEW-011c credited: a self leg written after reading the externals is worthless, and a self leg written before them found the one thing both externals missed last round.
- **Written by the session that wrote the packet.** That is the conflict the packet discloses in its §9, and it is why this leg is one of three inputs rather than the ruling.
- **Standing weakness, from the record:** self-review here finds *mechanisms* and misses *instances*. Expect this leg to be better at "here is a class of problem" than at "here is a specific false sentence."

---

## 1. On the packet's own §2 — does the `r`/`ρ` reasoning transfer?

**It does not transfer, and the packet is right to say the analogy may invert. But the packet's framing is loose in a way that could license a wrong ruling, and this is a finding against my own packet.**

REVIEW-010c rejected `sk_A`-derived `r` because *"public disclosure of one `r` must not create a public oracle keyed by holder secret material."* That ground genuinely vanishes here: `sk_ElGamal` is never disclosed.

**But "an ElGamal private key is never published" is not the same statement as "nothing derived from the seed is published," and the packet's §2 invites the second reading.**

`pk_A = sk_A·G` **is** published — permanently, on the first `ConfidentialMPTConvert`, and welded to the account by the registration PoK (E-66). Under §(e), `pk_A` is therefore a **published, permanent, deterministic function of the master seed**.

Is that an oracle? **No**, and the distinction matters:

- An oracle is *queryable*: the adversary chooses inputs and observes outputs. Publishing `r` on every Convert and ConvertBack gives an adversary a growing family of PRF outputs under one key, at inputs the adversary partly influences by choosing when to transact.
- `pk_A` is **one** output, at **one** label, per account, and it is a group element rather than the scalar. Recovering the seed from `pk_A` requires solving a discrete log and then inverting the KDF.

**So the conclusion holds — the analogy does not transfer — but the reason must be stated as "one published point is not an oracle," not as "nothing is published."** A ruling that rests on the second is resting on a false premise, and a later reader will find it.

**A residue that does transfer, and should not be lost.** REVIEW-010c's other ground was economic: *"taking a dependency on an assumption to buy nothing is the wrong trade."* That reasoning transfers intact; only its answer changes, because here the dependency **buys something** — recoverability. The ruling should say what it is buying, in those terms.

---

## 2. The strongest argument against §(e), and §(e) does not address it

**§(e)'s central defence rests on a premise that is false in a configuration XRPL explicitly supports.**

The premise:

> *"seed compromise already means total loss of spending authority, so the marginal harm is retroactive confidentiality"*

XRPL lets an account **set a regular key** (`SetRegularKey`) and **disable the master key** (`AccountSet` with `asfDisableMaster`). It also supports **multi-signing** via a `SignerList`. In any of those configurations the master seed is **not** spending authority. It may be a decommissioned credential sitting in cold storage precisely because the holder followed standard XRPL key hygiene.

Under §(e), that decommissioned seed still derives the ElGamal key, and therefore still yields **full retroactive decryption of the entire confidential history, permanently, with no rotation available.**

Three consequences, and the third is the one that makes this more than a footnote:

1. **§(e)'s marginal-harm argument fails exactly for the holders who took the most care.** For them the harm is not marginal — it is the whole of the loss, because spending authority was never at risk.

2. **The two arms are not symmetric in observability, which §(e) treats them as being.** A holder *knows* when they have lost a key. A holder does *not* know when someone has copied a seed backup. Weighing "recovery gain" against "confidentiality loss" as commensurable quantities ignores that one failure announces itself and the other never does.

3. **§(e) anchors the one key that cannot be rotated to the one credential XRPL says you may retire.** XRPL permits rotating signing authority; XLS-96 forbids rotating the ElGamal key (E-9, P-10). Deriving the second from the first means a holder who exercises a right the ledger grants them discovers that the retired credential was never retired. **That is a design that contradicts a guarantee the surrounding platform makes**, and it is the sharpest form of the objection.

**This does not by itself defeat §(e).** It is answerable — by disclosure, by a signer warning, or by declining derivation for accounts in that configuration. But §(e) as written does not answer it, and a ruling that approves §(e) without addressing it approves an argument with a hole in it.

---

## 3. The recovery gain is conditional, and the condition is not in §(e)

§(e)'s **only** benefit is that *"an otherwise unrecoverable key becomes recoverable from a backup the holder already keeps."*

That is true only if the derivation can be reproduced **by some tool other than ours**. In the scenario that matters — the holder still has their seed and no longer has our signer — a repo-local, undocumented derivation is **not** recoverable. The seed is necessary but not sufficient; you also need the algorithm.

So §(e)'s open question *"whether the derivation should be proposed as a standard or kept repository-local"* is **not** an open question at the same level as the others. **It is a precondition on the benefit.** If the derivation is not published in reproducible detail, the recovery gain that justifies the whole proposal does not exist, and §(e) reduces to pure downside.

Minimum form: the derivation must be specified precisely enough in this repository that a third party can reimplement it from the prose alone — which is the standard the nonce ruling was held to, and the method (independent reimplementation from the specification text, not from the reference control flow) that REVIEW-005c and E-62 both credit.

---

## 4. Which seed input — the question is load-bearing, not a detail

"The XRPL master seed" is underspecified in a way that changes the answer.

- The **family seed** is 16 bytes of entropy, base58-encoded with an `s` prefix.
- For **secp256k1** accounts the account key comes from the XRPL family-seed procedure; for **ed25519** it is derived differently. The two produce different account keys from the same seed.
- Keying the ElGamal derivation off the **derived account private key** would make the ElGamal key depend on the XRPL signature algorithm — the "same" seed yields different confidential identities depending on a choice that has nothing to do with confidentiality.
- Keying it off the **raw 16-byte seed** is algorithm-independent and is almost certainly right.

**But note what that costs**, because it is the same hole as §2: keying off the raw seed means the derivation is well-defined *even for an account whose master key has been disabled*. The algorithm-independence and the vulnerability are the same property.

**Also worth folding in:** the AccountID, as defence in depth. It is free, it costs one framed field, and it covers any scheme in which one seed serves more than one account. It does **not** fix §2 — the AccountID is public, so an attacker with the seed still derives everything.

---

## 5. Bias, reduction, and where the other two rulings should NOT be followed

Both prior rulings chose **wide 64-byte reduction, no rejection sampling**, and both did so for reasons about the *signing hot path*: a secret-dependent retry branch is a timing signal an adversary can sample repeatedly across many transactions.

**Keygen is not a hot path.** It happens **once, offline, per holder, for all time.** An adversary who can time a single offline keygen is an adversary with code execution on the holder's machine, and that adversary has the seed directly. **The argument that selected wide reduction does not apply here**, and a ruling that carries it over by symmetry is doing the thing the packet's §2 warns against, one layer down.

My position: **wide reduction anyway**, but for a different and weaker reason — consistency of style across the three constructions, and the fact that it is simply the easier thing to get right. A rejection-sampling loop would also be correct here, and a ruling that says "rejection sampling is forbidden because the other rulings forbade it" is wrong.

Whatever is chosen must guarantee `1 ≤ sk ≤ n−1`. The clean form is `sk = (OKM₆₄ mod (n−1)) + 1`, which cannot produce zero and needs no retry.

---

## 6. What mpt-crypto's test vectors do and do not establish

`CLAUDE.md` requires validating keygen against `test_pok_sk`, `test_elgamal`, `test_elgamal_verify`.

**Those tests establish that a keypair is well-formed and interoperates.** They prove `pk = sk·G` is a valid curve point, that encryption under `pk` decrypts under `sk`, and that a PoK over the pair verifies.

**They establish nothing whatsoever about whether the key was derived correctly from a seed.** A keypair from `/dev/urandom` passes all three. The derivation needs its own known-answer test — fixed seed in, expected `sk` and `pk` out — and that KAT is **self-referential** unless it is produced by an implementation written independently from the specification prose. That is exactly the method E-62 records for the nonce vectors, and it is the only form of the test that is worth anything.

---

## 7. Provisional position

**Derivation is defensible and §(e) as written is not.** I would rule for master-seed derivation **subject to conditions that §(e) does not currently contain**:

1. The derivation is **published in reproducible detail**, because the recovery benefit does not exist otherwise (§3).
2. The **onboarding flow discloses that the master seed becomes a permanent decryption credential that can never be retired**, before the first Convert — and the signer **warns** when the account has a regular key or `asfDisableMaster` set, because that holder has been given every reason to believe the seed is decommissioned (§2).
3. Input is the **raw 16-byte family seed**, with AccountID framed in as defence in depth (§4).
4. `1 ≤ sk ≤ n−1` guaranteed without a secret-dependent retry; wide reduction preferred but **not** because the other rulings chose it (§5).
5. A **derivation KAT** written from the prose by an independent implementation, distinct from the upstream interop vectors (§6).

**Held loosely.** Condition 2 may not be enough — an argument that the `asfDisableMaster` case should *forbid* derivation rather than warn about it is available and I have not been able to dismiss it. If an external leg makes it well, it should probably win.

**What I expect to have missed.** Instances, per the standing record. Specifically: I have not checked whether any document in this repository already states something about seed derivation that this session's work makes false, and I have not verified my own §4 claims about XRPL seed encoding against a primary source — they are recalled, not read, and they should be checked before they enter a ruling.
