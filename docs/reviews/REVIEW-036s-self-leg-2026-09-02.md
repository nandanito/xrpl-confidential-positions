# REVIEW-036s — self leg: ADR-0003's central claim

- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, rev 1, `Proposed`
- **Access:** full repo + session history + `CLAIMS.md` corpus
- **Written BEFORE reading legs a, b or c.** Held in scratchpad while the two
  repo-access legs read the tree (`CLAUDE.md`'s `REVIEW-022` rule).

## VERDICT: UNSOUND AS STATED — both premises fail, and one fails hard

The claim under review:

> *A tier that reads public state and holds no credential grants no authority
> that did not already exist, so no trust boundary moves.*

---

## S1 — [P1] THE TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY, IN TWO PLACES, EACH WITH A COMMENT SAYING WHY

**This is the finding. It falsifies the claim directly, and six code-review
rounds never connected it to the claim.**

The project enforces a **per-user** access barrier at both of the sensitive
resources this tier touches — deliberately, and it says so at each site:

| resource | barrier | the project's own words |
|---|---|---|
| the signer's Unix socket | `signer/src/ipc.rs:105` `set_mode(dir, 0o700)`, `:128` `set_mode(path, 0o600)` | *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic and must not be ignored"* (`:100-104`) |
| the decrypted-balance snapshot | `tools/issuer-view-snapshot.ts:272` `writeFileSync(OUT, …, { mode: 0o600 })` | owner-only, in the tool that holds the issuer key |

**The web API re-serves the product of BOTH over an unauthenticated loopback TCP
listener that every local uid can reach:**

| link | evidence |
|---|---|
| `GET /api/signer` returns the socket's answer | `web/api/server.ts:74-92` → `readSignerStatus()` |
| `GET /api/issuer/:account/:issuanceId` returns `decrypted` balances from the snapshot | `web/api/issuer.ts:150-159` |
| **No authentication of any kind** | `grep -rn "authoriz\|bearer\|token\|apiKey" web/api/*.ts` (non-test) returns **zero** auth constructs |
| Reachable by any local uid | `web/api/server.ts:177,180` — `BIND_HOSTNAME = "127.0.0.1"`; **loopback is not uid-scoped** |
| CORS does not help | `server.ts:54` constrains **browsers**; `curl` is not a browser — the ADR says this itself |

⚠⚠ **A second local user who cannot `connect()` the `0600` socket and cannot
`cat` the `0600` snapshot can `curl` both through this tier.** The mode bits are
the project's own statement of who those bytes are for. **The tier converts two
uid-scoped resources into uid-unscoped ones, and neither conversion is mentioned
anywhere in the ADR.**

### Why the obvious rebuttal fails

The rebuttal is architecture §3: *"It does not defeat an adversary who has code
execution — that adversary reads `sk_A` from process memory."*

⚠ **That concession is to an adversary with code execution AS THE HOLDER.** The
attacker this tier newly serves is **strictly weaker**: a different local uid,
with no code execution as the holder, who could not open a `0700` directory and
now does not need to. **§3's concession does not cover them — and `ipc.rs`'s own
comment proves the project draws the line exactly there.**

⚠⚠ **This is E-212's lesson applied to the key and not to the RESULT.** E-212's
correction was *"the trigger was written about the key ARRIVING; the oracle is
the RESULT LEAVING."* The remedy moved the key out and left the **result**
leaving, over the same unauthenticated GET, to the same callers. **The ADR's
restated trigger — *"if any request to this tier can cause a decryption, the tier
is an oracle"* — is satisfied to the letter, because the decryption now happens
ahead of time. The property it was protecting is not.**

**The gate cannot see this.** `tools/check-web-readonly.ts` part 4 asks whether
the tier *holds* a secret, *decrypts*, or *spawns* (`:533`, needles `:352`). It
never asks **what the tier emits, or to whom**. Holding and reachability are both
covered; **egress is a third property and nothing checks it** — the second time
part 4's own lesson (E-213: *"reachability and exposure are different"*) has
needed extending, and this time in the direction it already pointed.

---

## S2 — [P1] "READS PUBLIC STATE" WAS FALSIFIED BY THE ADR'S OWN E-205 CORRECTION, AND THE CLAIM WAS NOT UPDATED

`Request::Status` — the ADR's *one* permitted signer call — returns, at
`signer/src/session.rs:248-258`:

- `self.store.generation_id()` — the randomness ledger's generation id
- `self.store.len()` — its **entry count**
- `self.holder.address()`

⚠ **None of the first two is public ledger state.** E-205 established that the
handler *reads no ledger at all*; the ADR quotes E-205 approvingly at D1 — **and
then leaves the word "public" standing in the central claim.**

The ADR's defence is that the disclosure *"does not exceed what the protocol
already publishes"* (P-4, P-11 leave *how often* public). ⚠ **That is an argument
about SENSITIVITY, not about PUBLICNESS, and the claim was written about
publicness.** The two come apart concretely: `store.len()` counts identifiers
**reserved**, which includes operations prepared and never submitted. The public
ledger cannot show those. **So the count is an upper bound the ledger does not
publish, and it is signer-local by construction.**

**The honest premise is narrower:** *"reads public state and a bounded quantity
of signer-local metadata judged non-sensitive."* That premise may well carry the
argument — but it is a different sentence, and it is the one that should have to
survive review.

---

## S3 — [P2] THE INFERENCE DROPS INTEGRITY, AND THE PROJECT HAS ALREADY BEEN BITTEN BY EXACTLY THAT

*"…grants no authority that did not already exist, **so** no trust boundary
moves."* ⚠ **A trust boundary governs confidentiality and INTEGRITY, not
authority alone.**

This tier's product is **assertions to a human** about what a confidential ledger
does and does not hide. Its disclosures are load-bearing — the project's own
`REVIEW-035` found the signer telling holders *"It hides AMOUNTS. It hides
nothing else"*, which is false for `Convert` and `ConvertBack` (E-224).

⚠ **E-209 is the proof that the integrity of this tier's display is attackable
without any authority moving**: port 3001 was occupied by a Docker-hosted Gitea,
the proxy forwarded to it, and **Gitea's `303` answered for the API**. No
authority moved. The tier still rendered another process's content as its own.
The remedy — `assertOurApi()` — is an *integrity* control, and its existence
concedes the point the inference denies.

---

## S4 — [P2] THE EXEMPTION IS SELF-CERTIFIED AT THREE LAYERS, AND THE ADR ADMITS ONLY ONE

The gate fires on *movement* of a trust boundary. But:

1. The **author** decides whether movement occurred.
2. The **same document** defines what counts as movement (the three triggers).
3. The **same session** implements against the ruling.

⚠ **The ADR discloses (3) prominently and never discloses (1) or (2).** A
falsifier list written by the party who benefits from it being short is not a
falsifier list; it is a scope statement. **The non-circular test is external:
enumerate what the tier EMITS and to WHOM, and compare against what was
emitted before it existed** — a property no party to the decision gets to
define. S1 is what that test returns.

---

## S5 — [P2] THE FALSIFIER LIST IS INCOMPLETE, AND THE MISSING ENTRY IS THE ONE THAT FIRED

Triggers 1–3 are all about **reaching a signing operation**; trigger 4 is about
**a decryption**. All four are about *what the tier can do*.

⚠ **None is about what the tier PUBLISHES, or about who can ask.** The missing
trigger, stated so it cannot be read narrowly:

> **If this tier makes any datum reachable by a caller who could not obtain that
> datum before the tier existed, the boundary has moved — regardless of whether
> the tier signs, holds a key, or performs a computation.**

That is the general form of S1, and of E-212, and of E-213's `0.0.0.0` binding.
**Three instances of one shape, and the list still has no entry for it.**

---

## WHAT IS SOUND, AND IT IS THE LOAD-BEARING HALF

⚠ **The transport argument is correct and I could not break it.** `ipc.rs`'s
Unix domain socket means a browser page cannot reach the signer — a property of
the transport, not a policy, and not created by this decision. The ADR is
scrupulous about saying it *declines to build a bridge around* that property
rather than creating it. **`Pair` and `Prepare` genuinely remain unreachable from
this tier**, and `check-web-readonly` parts 1–3 do check that, with controls
through the real detector.

**So the claim's conclusion — that this tier adds no SIGNING authority — holds.**
What fails is the general claim it was stated as. **The ADR proved the thing it
needed about signing and then wrote it as a universal about authority.**

## Recommendation

`ADR-0003` should not go to `Accepted` on rev 1. It needs a rev 2 that
(a) narrows premise 1 to what `Status` actually returns, (b) adds the egress
trigger, and (c) **either authenticates the issuer route or stops serving
`decrypted` from it** — the `0600` mode is the project's own view of what those
bytes are worth.
