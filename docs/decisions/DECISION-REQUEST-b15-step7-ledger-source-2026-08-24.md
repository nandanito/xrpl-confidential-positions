# Decision request — B-15's step-7 gate: which of the three ways out

- **Date:** 2026-08-24. ~~**Status: OPEN, and deliberately not decided here.**~~
- ⚠ **AMENDED 2026-08-25, LATER THE SAME DAY, BY THE PROJECT OWNER: the named risk acceptance `REVIEW-019` allows for the artifact is EXTENDED to the facility's Devnet demo.** The facility may run against a remote endpoint. **Part C is unchanged and still in force** — whatever submits sets `tapFailHard`.
- **Why:** Option A was taken and then costed, and the cost is not payable on this hardware. `CLAIMS.md` **E-148**: two runs, ~2.5 hours, 6.9 GB of node store, `complete_ledgers: empty` throughout; run one was OOM-killed, run two survived a memory increase and stayed pegged at 1663% CPU without acquiring a single ledger. **There is no rehearsal network either**, because the signer refuses every network but Devnet by construction. What was left — a native arm64 build, other hardware, a node elsewhere — is not a coding-session decision, so it came here.
- **What the amendment rests on:** every previous milestone — steps 2, 3, 4, 6 and `ConfidentialMPTConvertBack` — ran against `s.devnet.rippletest.net` under exactly this acceptance. `REVIEW-019` withheld it from step 7 on the grounds that the facility is *"anything a user would rely on"*. **The owner's judgement is that a Devnet demo with throwaway keys that will never hold value is not that**, and that is a judgement rather than a fact.
- ⚠ **What it does NOT do.** It does not make a remote endpoint safe, and it does not retire the loopback requirement for anything beyond this demo. `CLAIMS.md` F-23 is **executed**: on 2026-08-19 an amount was recovered from public ledger data by the party who supplied a wrong key. **This amendment has had no adversarial review either**, which is now true of the ruling and of both its amendments.
- **How it is kept honest, rather than kept quiet.** `WCONF_ACCEPT_REMOTE_LEDGER_RISK` must hold a full sentence naming F-23 before `facility/` will read a non-loopback endpoint; a near miss is refused *differently* from an unset variable; the disclosure prints in full on stderr; and **every run record carries `underB15Conditions`**, so no later reader has to infer it from a hostname. `facility/tests/risk-acceptance.test.ts` drives all four states and asserts the disclosure's wording.
- ⚠ **RULED 2026-08-25 BY THE PROJECT OWNER: option A plus the narrow form of C.** Loopback for the facility, and `tapFailHard` set by whatever submits — **which is not the signer**. The gate is answered and architecture §6 step 7 is open.
- ⚠ **This was decided by the owner on the coding session's recommendation, and that recommendation had NO adversarial review.** It is also **not one of the three options as `REVIEW-019` stated them** — it is A, plus a reading of C that puts the flag outside the signer. The residual is named in §3 and is unchanged by the decision: **nothing forces a separate submitter to set the flag**, so Part C is a convention rather than a property. **Part A is the protection; Part C is a seatbelt that only helps if someone buckles it.**
- **What it obliges, concretely:** the facility's ledger reads go to a loopback endpoint — drivers and any demo included, not just one run — and whatever submits sets `tapFailHard`. Neither is enforced by the signer, so both belong in the build's own checks.
- **Raised by:** the coding session that opened architecture §6 step 7.
- **Decides:** whether the facility may be built against a remote ledger
  endpoint, and if not, which of `REVIEW-019`'s three alternatives is taken.
- **Blocks:** architecture §6 step 7 — the facility as application logic.
  **Does not block** `ConfidentialMPTConvertBack`, which was built and executed
  on 2026-08-24 and is not "anything a user relies on".

> ## Why this is a request and not a decision
>
> `REVIEW-019` ruled that one remote endpoint stands for this Devnet research
> artifact **as a named risk acceptance**, and ruled explicitly that for step 7
> it is **not sufficient**. It named three ways out and said which of the three
> is *"a step 7 decision"*.
>
> **One of the three adds a submitter to the signer, and the signer not
> submitting is half of what the trust boundary buys.** *"The signer reads the
> ledger and still does not write to it… it signs and hands back a blob"* is in
> architecture §1, in `signer/src/lib.rs` and in `signer/README.md`, and
> architecture §1 says in terms that **both halves of that sentence are
> load-bearing and neither should be trimmed**. A coding session that reasoned
> its way past that has skipped the review this project applies to everything
> else.

---

## 1. What is being defended against, in one paragraph

`CLAIMS.md` **F-23**, and it is **executed, not reasoned**. A
`ConfidentialMPTSend` encrypts the amount to the destination's
`HolderEncryptionKey` and the issuer's `IssuerEncryptionKey`, **both read from
the ledger**. rippled verifies against the keys *it* holds, so a substituted key
fails the proof with `tecBAD_PROOF` — and a `tec` is **applied to the ledger**,
with every ciphertext in it, unless the submitter set `tapFailHard`. On
2026-08-19 this was run: `tecBAD_PROOF` on validated ledger 4603815, and the
amount **42 was recovered from public ledger data by the party who supplied the
wrong key**, while the intended destination could not decrypt it at all.

So a lying ledger source does not cost a transaction. It costs the
confidentiality of the amount, permanently, in public.

⚠ **TLS does not address this.** It authenticates the channel to a node the
operator chose. A hostile node lies just as well over TLS.

⚠ **There is exactly one local anchor and it covers the wrong field.** The
signer compares the ledger's `HolderEncryptionKey` for **its own** account
against the key it holds. There is **no anchor at all** on the destination's key
or the issuer's — which are the two that leak.

---

## 2. The three options, with what each costs

### Option A — loopback: run our own rippled

**What it is.** `ledger_endpoint` points at `127.0.0.1`. The signer already
supports this and prints no remote disclosure when it is used, because there is
nothing to disclose. `is_loopback` defaults to `false` on the trait, so a source
that does not know is treated as remote.

| | |
|---|---|
| **Code** | **None.** Not one line. This is what `REVIEW-019` calls the clean answer |
| **Cost** | A rippled node syncing Devnet, kept running, kept at a build with `ConfidentialTransfer`. Devnet is small, but it is an operational dependency this project has never had, and every Devnet driver would need it — which is why the ruling **rejected** loopback-only for the *artifact* |
| **What it buys** | The whole of F-23's read-substitution risk, removed. The operator's own node is the operator's own trust |
| **What it does not buy** | Nothing about the same-host adversary of issue #1, who can point the signer somewhere else, or edit the local node's answers. The boundary is unchanged |
| **⚠ Watch for** | *"We ran a local node once"* is not the property. The property is that **the facility's** reads go to loopback, which means the drivers and any demo do too |

### Option B — corroboration across independently operated nodes

**What it is.** Read the same fields from two or more endpoints and refuse on
disagreement.

| | |
|---|---|
| **Code** | Small under the existing `LedgerSource` trait — and **`REVIEW-019` says the cost is not the problem** |
| **Cost** | **Both legs called it near-theatre on Devnet**, for four reasons: the default endpoint is one operator's cluster, so compromising the operator compromises every endpoint at once; the in-scope adversary can set a second endpoint as easily as the first; two nodes agreeing proves they agree, not that they are right; and Devnet nodes lag, so corroboration aborts on ordinary desync — the exact condition `REVIEW-016` round two had to reclassify as retryable |
| **What it buys** | On Devnet, close to nothing. The gate says *"independently operated"*, and **this project has not identified a second independent Devnet operator.** ⚠ **Checked rather than assumed, 2026-08-25:** every Devnet or faucet endpoint anywhere in this repository — `s.devnet.rippletest.net`, `faucet.devnet.rippletest.net`, `confidential.devnet.rippletest.net`, `confidential-faucet.devnet.rippletest.net` — is under `rippletest.net`, one operator. **Naming a second independent operator is the first thing this option needs, and until somebody does, it cannot be costed at all** |
| **⚠ Watch for** | Building it and *describing* it as corroboration. Two hostnames of one operator satisfies the word and not the property |

### Option C — a submitter that sets `tapFailHard`

**What it is.** A component that submits the signed blob with `tapFailHard`, so
a `tec` is **discarded rather than applied** and the ciphertext is never
published.

| | |
|---|---|
| **Code** | A new component: a submission path, its own error handling, its own retry semantics, and its own threat surface |
| **What it buys** | ⚠ **This is the only one of the three that addresses F-23 at the point where the damage happens.** The other two make a wrong read *less likely*; this makes a wrong read *not publish anything*. `REVIEW-019` records it as *"a real F-23 mitigation nobody had named"* |
| **⚠ What it costs, and this is the whole reason this document exists** | *"The signer does not submit"* is a **trust-boundary claim**, stated in three places and load-bearing in architecture §1. A signer that submits has an outbound write path; a compromised or coerced one can put a transaction on the ledger without the holder's client ever seeing it. That is a different system from the one ADR-0001 accepted |
| **The narrower form worth considering** | The submitter need not be *the signer*. `REVIEW-019` says: *"This signer cannot use it: it does not submit. **Whoever submits should.**"* A **separate** submitter — the web application, or a small tool — that sets `tapFailHard` keeps the signer's claim intact and still gets the mitigation. ⚠ It also weakens it: nothing forces that submitter to set the flag, so the mitigation becomes a convention rather than a property |

---

## 3. What the coding session recommends, and why it is only a recommendation

**A + the narrow form of C**, in that order: loopback for the facility, and
`tapFailHard` set by whatever submits, which is not the signer.

The reasoning is that A costs no code and removes the risk at its source, C's
narrow form costs one flag and removes the *consequence* the risk has, and
together they leave the signer's trust boundary exactly as ADR-0001 accepted it.

> ⚠ **Annotated 2026-08-26, after `REVIEW-023`.** *"Removes the consequence"* is
> now known to be true only **at the ledger**. `tapFailHard` does not stop the
> ciphertext reaching the **node the blob was submitted to**, and under a remote
> source that is the same node the risk is about — `CLAIMS.md` **F-28**. So C's
> narrow form does **not** cover the residual A was carrying, and the two halves
> of this recommendation are not substitutes for one another in the way this
> paragraph reads. The document is annotated rather than rewritten because it is
> the request that was ruled on.
B is not costable until somebody names a second independent Devnet operator.

⚠ **That recommendation has been through no adversarial review**, and the
combination is not one of the three the ruling named — it is A, plus a reading
of C that puts the flag outside the signer. **Whether that reading satisfies the
gate is precisely the question being handed over**, because a mitigation nothing
enforces is the shape this project has been wrong about before.

---

## 4. What must NOT happen while this is open

- **Do not build the facility against the default remote endpoint** and record
  the disclosure as sufficient. The ruling says in terms that it is not, for
  step 7.
- **Do not add a submitter to the signer** on a coding session's own authority.
- **Do not describe two hostnames of one operator as corroboration.**
- ⚠ **Do not read `ConfidentialMPTConvertBack` being built as the gate being
  passed.** It is a transaction type, built and executed on 2026-08-24 with the
  gate open, under exactly the risk acceptance `REVIEW-019` allows for the
  artifact. The facility is what the gate covers.

---

## 5. The premise to re-check before deciding

`REVIEW-019` rests on one factual claim: **`ledger_entry` returns no Merkle
proof**, verified at rippled tag `3.3.0` and live. A light-client check would
remove the trust entirely and make all three options moot. **If that ever
changes, this whole document is void and B-15 should be re-argued**, not
patched.
