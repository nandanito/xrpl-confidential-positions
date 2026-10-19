# REVIEW-019 — RULING on `CLAIMS.md` B-15: is one ledger endpoint acceptable?

**Date:** 2026-08-20. **Two independent legs:** `REVIEW-019a` (Gemini, effort
high), `REVIEW-019b` (Codex, read-only sandbox).

**Status: RULED for the research artifact. A GATE for step 7.**

---

## 1. The ruling

> **One endpoint stands for this Devnet research artifact — as a named risk
> acceptance, not because it is safe.** The trust statement must appear where an
> operator sees it, and it does.
>
> **Loopback is the clean answer** and is the only configuration in which the
> question dissolves.
>
> **Corroboration across two hostnames of the same operator is NOT built**, and
> both legs called it close to theatre on Devnet.
>
> **For architecture §6 step 7 — the facility, the first thing a user would rely
> on — one remote endpoint is NOT sufficient.** That is a gate on step 7, not on
> now.

## 2. The legs disagreed in headline and converged in substance

**Gemini:** *"ONE endpoint is ACCEPTABLE for the Devnet research artifact.
Multi-endpoint corroboration on Devnet is REJECTED as security theatre."*

**Codex:** *"Corroboration is required for any signer/facility a user is meant
to rely on… for the current Devnet research artifact, one endpoint can be
allowed only as a named gap/risk acceptance."*

Read past the headlines and **they agree on every operative point**:

| | Gemini | Codex |
|---|---|---|
| Loopback self-run node | the clean answer; mandatory in production | acceptable as a single source — "trust your own machine" |
| Two hostnames, one operator | "queries different frontend processes in the *same* trust domain" | "does not materially answer the hostile-node case" |
| Current Devnet artifact | single endpoint, documented | one endpoint **as a named risk acceptance** |
| Anything user-facing | loopback mandatory | corroboration **or** loopback-only |
| Saying it out loud | required, with supplied wording | required, with supplied wording |

**So the ruling is not a split decision.** They differ only on what the *future*
requirement is — Gemini says loopback, Codex says loopback-or-corroboration —
and that difference is a step 7 question, recorded below rather than settled.

## 3. Why corroboration is not built

Four reasons, and the first is the one that decides it:

1. **No independent trust roots on Devnet.** The default endpoint is a Ripple-
   operated cluster; two calls already reach different hosts (observed live,
   `FUSS` then `JUTE`). Compromise the operator and you compromise every
   endpoint at once.
2. **The adversary in scope can reconfigure.** Issue #1 puts a hostile
   same-host process in the threat model. Something that can set
   `WCONF_LEDGER_ENDPOINT` can set a second one just as easily.
3. **No cryptographic grounding.** Two nodes agreeing proves they agree, not
   that they are right.
4. **False stops.** Devnet nodes lag and close ledgers at different moments;
   corroboration would abort on ordinary desync — the exact condition
   `REVIEW-016` round two had to reclassify as retryable.

⚠ **The packet asked both legs to attack this mitigation and both did.** It was
proposed in the step-2 report as "cheap under the existing `LedgerSource`
trait", which is true and beside the point.

## 4. The cryptographic option is closed, and that is why this is a ruling

A light-client check — *prove this entry is in the state tree under a ledger
hash signed by a validator quorum* — would remove the trust entirely.

**It cannot be built on this RPC.** `ledger_entry` returns no Merkle proof:
`src/xrpld/rpc/handlers/ledger/LedgerEntry.cpp` at rippled tag `3.3.0` contains
no `proof` field, and a `binary: true` request returns `node_binary`,
`ledger_hash`, `ledger_index`, `validated` and nothing tying the entry to the
state tree. Verified live.

Both legs took the packet's statement of this and neither found a path it
missed. **If one exists, this ruling is the thing to revisit.**

## 5. What must be said, and where — a condition of the ruling

`ledger::REMOTE_SOURCE_DISCLOSURE`, printed by the daemon whenever the endpoint
is not loopback. It names four things, and
`the_remote_disclosure_says_what_the_ruling_requires` fails if any of them
stops being said:

1. the node is **trusted for amount confidentiality**, in those words;
2. TLS authenticates the channel and **not the ledger**, and there is no Merkle
   proof to fall back on;
3. the consequence is `tecBAD_PROOF` **permanently publishing** the amount —
   citing F-23, which is executed rather than hypothetical;
4. running your own rippled on localhost removes the trust.

⚠ **The test asserts the wording, not the presence.** A disclosure that survives
as an empty string, or softened to "note: remote endpoint", satisfies "it is
printed" and satisfies nothing else.

⚠ **`is_loopback` defaults to `false` on the trait.** A source that does not
know is treated as remote, because the failure that matters is a remote source
being reported as local and suppressing the disclosure.

## 6. Third options, considered and not adopted

| Option | Verdict |
|---|---|
| **TOFU / local key pinning** for destination and issuer keys | **Not adopted, and worth revisiting.** Codex: cheap, catches later substitution. Both legs agree it does **nothing for first use**, which is when substitution pays. Gemini: rotation makes it a UX trap. Genuinely useful for *recurring* counterparties, which the facility will have — so this belongs to step 7, not here |
| **Human key-fingerprint confirmation** on the confirmation screen | **Rejected as a gate**, and ⚠ it would violate the confirmation's own rule: only fields parsed from the transaction's own bytes may appear there, and a fingerprint of a key read from a node is not one of them (`CLAIMS.md` F-21 is the same rule for `NetworkID`). Gemini offered it as informational; even that is a hole in a rule this project enforces by type |
| **Loopback-only, remote behind a flag** | **Rejected for the artifact** — it would make every Devnet spike require a local rippled — and **adopted as the step 7 direction** |
| **`tapFailHard` at submission** | ⚠ **Not a B-15 answer, but a real F-23 mitigation nobody had named.** With `tapFailHard`, a `tec` is discarded rather than applied — so the ciphertext is never published. **This signer cannot use it: it does not submit.** Whoever submits should. Recorded as guidance and as a step 7 requirement |

## 7. Scope, stated because it is the part that will be misread

**This ruling covers the signer as a Devnet research artifact with throwaway
keys.** Both legs scoped their answer the same way and both said the answer
changes for anything a user relies on.

**Step 7's gate, from the union of the two legs:** the facility requires
loopback, or corroboration across **independently operated** nodes, or a
submission path that sets `tapFailHard`. Which of the three is a step 7
decision. It is not open now because step 7 is not open now.

## 8. What this ruling does NOT claim

- **Not** that one endpoint is safe. It is accepted, named, and disclosed.
- **Not** that TLS protects the ledger data. It protects the channel.
- **Not** that the local anchor helps with the fields that matter. The signer
  checks its **own** registered key against the key it holds; there is **no
  anchor at all** on the destination's or the issuer's.
- **Not** that B-15 is closed for all time. §4's premise — no Merkle proof — is
  the thing to re-check.

## 9. Confidence

Gemini 9.8/10, naming the judgement *"the corroboration fallacy on centralised
testbeds"*. Codex high, naming it a security design risk ruling. **The
adjudicator notes the two headline verdicts read as opposite and are not**, and
that anyone citing one leg alone will misreport this.
