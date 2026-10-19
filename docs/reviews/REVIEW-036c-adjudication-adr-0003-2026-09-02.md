# REVIEW-036c — adjudication: `ADR-0003`'s central claim is UNSOUND AS STATED

- **Date:** 2026-09-02
- **Subject:** `docs/decisions/ADR-0003-web-tier-trust-boundary.md`, revision 1
- **Legs:** `REVIEW-036a` (Gemini, document only), `REVIEW-036b` (Codex, repo),
  `REVIEW-036d` (Codex, repo, promises), `REVIEW-036s` (self)
- **Frozen at:** `5f8cf42`

## RULING

**All four legs returned the same verdict independently: the central claim is
UNSOUND AS STATED.** Not overstated — unsound: **both of its factual premises are
false against source**, and its inference drops properties a trust boundary
governs.

> *A tier that reads public state and holds no credential grants no authority
> that did not already exist, so no trust boundary moves.*

⚠⚠ **What the claim proves, it proves about SIGNING — and it was written as a
universal about AUTHORITY.** Every leg agreed the signing half is sound: the
transport property holds, `Pair` and `Prepare` are unreachable, and the holder's
confirmation is untouched. **The tier adds no signing authority.** The ADR
established that, and then stated it as a general claim its own evidence does not
carry.

**13 findings upheld, 2 rejected, 1 partly upheld.** The rotation did **not**
find that step 8 should be torn out. It found that the *waiver* was granted on a
claim that does not survive contact, and that **the boundary which actually moved
is a DISCLOSURE boundary that nothing in the ADR, and nothing in the gate,
looks at.**

---

## THE HEADLINE — U1

### U1 — [P1] THE TIER DISSOLVES A uid BARRIER THE PROJECT SETS DELIBERATELY, IN TWO PLACES, EACH WITH A COMMENT SAYING WHY

**Found independently by leg s and leg b.** Leg b drew it as a pipeline; leg s
found it from the mode bits. **Leg a could not see it** — it had no tree — which
is the differed-packet design working exactly as intended.

The project enforces a **per-user** barrier at both sensitive resources this
tier touches, and says so at each site:

| resource | barrier | the project's own words |
|---|---|---|
| the signer's Unix socket | `signer/src/ipc.rs:105` `set_mode(dir, 0o700)`; `:128` `set_mode(path, 0o600)` | *"The 0700 is what stops another **user** reaching the socket, so a failure here is not cosmetic and must not be ignored"* (`:100-104`) |
| the decrypted-balance snapshot | `tools/issuer-view-snapshot.ts:272` `writeFileSync(OUT, …, { mode: 0o600 })` | owner-only, written by the tool that holds the issuer key |

**The web API re-serves the product of both over an unauthenticated loopback TCP
listener that every local uid can reach:**

| link | evidence |
|---|---|
| `GET /api/signer` returns the socket's answer **and the socket path** | `web/api/server.ts:74-78` spreads `...probe`; `web/api/signer-status.ts:43-45` |
| `GET /api/issuer/:account/:issuanceId` returns `decrypted` balances | `web/api/issuer.ts:162-170` |
| **No authentication of any kind** | zero auth constructs in `web/api/*.ts`; leg b: CORS *"does not reject a disallowed or origin-less request"* |
| Reachable by any local uid | `web/api/server.ts:177,180` — `BIND_HOSTNAME = "127.0.0.1"`; **loopback is not uid-scoped** |

Leg b's pipeline, which is the clearest statement of it:

```
issuer key
   │
   ▼
CLI decrypts ──► mode-0600 plaintext file ──► API process ──► unauthenticated loopback TCP
```

⚠⚠ **A second local user who cannot `connect()` the `0600` socket and cannot
`cat` the `0600` snapshot can `curl` both through this tier.**

### Why the obvious rebuttal fails

Architecture §3: *"It does not defeat an adversary who has code execution — that
adversary reads `sk_A` from process memory."*

⚠ **That concession is to an adversary with code execution AS THE HOLDER.** The
party this tier newly serves is **strictly weaker** — a different local uid, no
code execution as the holder, who could not open a `0700` directory and now does
not need to. **§3's concession does not cover them, and `ipc.rs`'s own comment is
the project's evidence that it draws the line exactly there.** Both repo legs
reached this independently; leg b states it as *"a different UID gains access to
data formerly protected by mode `0600`; a hostile same-UID process already
could."*

⚠⚠ **This is E-212's lesson applied to the KEY and not to the RESULT.** E-212's
correction reads *"the trigger was written about the key ARRIVING; the oracle is
the RESULT LEAVING."* The remedy moved the key out and left the **result** leaving,
over the same unauthenticated GET, to the same callers. **The ADR's restated
trigger — *"if any request to this tier can cause a decryption, the tier is an
oracle"* — is satisfied to the letter, because the decryption now happens ahead
of time. The property it was protecting is not.**

---

## UPHELD — the claim's own premises

### U2 — [P1] PREMISE 1 IS FALSE: THE TIER EMITS STATE THAT IS NOT PUBLIC

**All four legs.** Leg b enumerated every endpoint and classified every field;
its table is the evidence and is reproduced in `REVIEW-036b`.

The decisive instance, which leg b found and leg s had only hypothesised:

⚠⚠ **`Store::len()` counts attempts that NEVER REACHED THE LEDGER.**
`signer/src/store.rs:753-756` — `commit` is *"called on success **and** on any
local failure before emission — a cancelled confirmation, a failed proof, an
aborted attempt."* `Store::len()` returns `self.records.len()` (`:703-707`) and
that count leaves over HTTP via `Request::Status` (`signer/src/session.rs:248-257`).

⚠ **Public ledger history cannot reveal a declined confirmation or a failed
proof.** So the ADR's defence — *"the entry count is activity metadata of exactly
the kind the protocol leaves public"* (P-4, P-11 leave *how often* public) — **is
specifically wrong**, not merely loose. It is an argument about SENSITIVITY
answering a premise about PUBLICNESS, and the two come apart at a measurable
point.

Also emitted and not public: the **local socket path** (`signer-status.ts:43-45`,
on macOS the per-user `/var/folders/<hash>/T/…`), the failure `reason` carrying
every candidate filesystem path probed, and the configured ledger endpoint.

**The honest premise is narrower:** *"reads public state, plus a bounded quantity
of signer-local metadata."* That premise may still carry the argument — but it is
a different sentence and it is the one that should have to survive review.

### U3 — [P1] PREMISE 2 EQUIVOCATES: "HOLDS NO CREDENTIAL" IS NOT "CONVEYS NOTHING A CREDENTIAL PRODUCES"

**Legs b, s; leg a reached the same place from the document alone.** Leg b puts
it exactly: *"The credential stayed left of the API, but credential-produced
confidential data crossed the filesystem permission boundary."*

Removing the key removed **live chosen-input decryption**. It did not remove
**privileged disclosure**. The recipient of `decrypted` could not have computed it
from public ledger state — leg b verified the producer calls
`decryptAmount(mirror, key, max)` with the issuer secret
(`tools/issuer-view-snapshot.ts:179-189, 230-245`).

### U4 — [P1] THE INFERENCE DROPS EVERY NON-AUTHORITY PROPERTY A TRUST BOUNDARY GOVERNS

**Legs a, b, s.** *"…grants no authority, **so** no trust boundary moves"* treats
*authority* as exhaustive. A trust boundary also governs **confidentiality**
(U1, U2), **transport exposure** (U6), and **presentation integrity** (U5).

⚠ **Leg a's consequence is the one to keep:** if this inference stands, any
session may build an unauthenticated network listener adjacent to private keys
and bypass review by calling it read-only.

### U5 — [P2] PRESENTATION INTEGRITY IS DROPPED, AND E-209 IS THE PROOF IT IS REAL

**Leg a, upheld on the project's own record.** The ADR: *"the holder confirms
against parsed transaction fields in the signer's own UI … nothing in this
decision touches it."* True of the signing step — and the tier is nonetheless a
surface a holder reads addresses and issuance ids from before typing them into
the signer.

⚠ **E-209 already demonstrated this tier rendering another process's content as
its own**: port 3001 was occupied by a Docker-hosted Gitea, the proxy forwarded
to it, and Gitea's `303` answered for the API. **No authority moved; the display
still lied.** The remedy — `assertOurApi()` — is an *integrity* control, and its
existence concedes the point the inference denies.

### U6 — [P2] "NO WEB API OPENS A UNIX SOCKET" IS CONTRADICTED BY THE TIER, AND BY THE ADR'S OWN DIAGRAM

**Legs b and d, independently.** The *finding that drives everything* quotes
`ipc.rs`: *"A browser page cannot connect at all. **No web API opens a Unix
socket.**"* But the browser calls `/api/signer`
(`web/app/src/routes/index.tsx:12-15`), Elysia exposes it
(`web/api/server.ts:73-76`), and that handler opens the UDS
(`web/api/signer-status.ts:176-192`).

⚠ **The ADR's own D1 diagram shows this arrow**, so the document contradicts
itself between its premise section and its decision section. **Graded P2, not P1**:
the substantive property — a browser cannot open a UDS *itself*, cannot select an
arbitrary request, and cannot reach `Pair` or `Prepare` — is **true and verified
by both repo legs**. The sentence is false; the protection is real. **It is a
fixed, non-selectable, non-signing bridge — but it is a bridge, and the ADR says
none was built.**

### U7 — [P2] THE EXEMPTION IS SELF-CERTIFIED AT THREE LAYERS AND THE ADR DISCLOSES ONE

**Legs a and s.** The gate fires on *movement*; the **author** decides whether
movement occurred, the **same document** defines what counts as movement (its
three triggers), and the **same session** implements against the ruling. ⚠ **The
ADR discloses only the third.**

**The non-circular test is external**, and it is the one this rotation ran:
enumerate what the tier EMITS and to WHOM, and compare against what was
obtainable before it existed. U1 and U2 are what that test returns.

### U8 — [P1] THE FALSIFIER LIST IS INCOMPLETE, AND THE MISSING ENTRY IS THE ONE THAT FIRED

**Legs a and s.** Triggers 1–3 are about reaching a **signing** operation;
trigger 4 is about causing a **decryption**. All four are about *what the tier can
do*. ⚠ **None is about what the tier PUBLISHES, or to whom.**

**The missing trigger, stated so it cannot be read narrowly a second time:**

> ⚠⚠ **If this tier makes any datum reachable by a party who could not obtain
> that datum before the tier existed, the boundary has MOVED — regardless of
> whether the tier signs, holds a key, or performs any computation. Egress is a
> boundary property. Reachability and holding are not the whole of it.**

That is the general form of U1, of E-212, and of E-213's `0.0.0.0` binding —
**three instances of one shape, and the list still had no entry for it.**

---

## UPHELD — the gate, which is the ADR's NAMED FALSIFIER

### U9 — [P1] A FALSIFIER CONDITION NAMED IN ARCHITECTURE §6 STEP 8 HAS NO FALSIFIER

**Leg b, verified by the adjudicator.** Step 8's *Falsified if:* clause reads
*"**Also falsified if:** … or **the API binds to anything but loopback**."*

⚠⚠ **`tools/check-web-readonly.ts` contains ZERO references to `hostname`,
`127.0.0.1`, `0.0.0.0`, `BIND_HOSTNAME`, `.post`, `.put` or `.delete`** — measured
by grep over the whole file. **The binding is correct today
(`server.ts:177`) and nothing gates it.** E-213 established the `0.0.0.0` defect
by measurement on the LAN; the fix went into the code and **the gate was never
extended to the condition the architecture document names.**

The same grep establishes the gate checks no mutating route, so a `.post` that
writes would leave it green.

### U10 — [P1] THE GATE'S TWO SOCKET DETECTORS DISAGREE, AND THE NARROWER ONE IS THE GATE

**Leg b, verified by the adjudicator. This is the SIXTH instance in this
repository of a gate built to catch false passes false-passing** (E-165, E-168,
E-182, E-198, E-203).

- `SOCKET_NEEDLES` (`:274-283`) — **eight** needles, including `node:net` and
  `createConnection`. Applied by Part 1 **to `web/app` only**.
- `socketClients()` (`:377-379`) — the whole-tier *"exactly ONE socket client"*
  check — uses **four**: `["signer.sock", "WCONF_SIGNER_SOCKET", "Bun.connect",
  "unix:"]`. **`node:net` and `createConnection` are absent.**

⚠ **A second UDS client in `web/api` written with `node:net`'s
`createConnection` is invisible to the count, and Part 1 never looks at
`web/api`.** The gate would print *"exactly one socket client"* while there were
two. **This is E-203's exact shape** — two detectors, one loose and one strict,
disagreeing, with only the looser one wired to the property.

⚠ **Neither limitation appears in the gate's printed *"What this gate does NOT
say"* list**, which is what makes it P1: the ADR leans on that list as the
statement of the gate's reach.

### ⚠⚠ MEASURED, NOT ASSERTED — the pre-fix gate EXITS 0 on a real second client

The adjudicator ran the gate **exactly as it stood at `5f8cf42`**
(`git show 5f8cf42:tools/check-web-readonly.ts`) against a tree carrying a
genuine second UDS client:

```ts
// web/api/second-client.ts
import { createConnection } from "node:net";
export function talk(p: string) { return createConnection(p); }
```

```
PRE-FIX GATE EXIT=0
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
```

⚠ **A complete false pass**: exit 0, and Part 5 printed ✓ while naming only one
of the two clients.

⚠⚠ **The first attempt at this measurement was CONFOUNDED and is recorded
because the confound is the lesson.** It reverted only the needle list and left
the *newly added control* in place; the run exited 1, and the sole failure was
**that new control firing**. **A revert that leaves the new detector in place
measures the detector, not the hole** — `CLAIMS.md` E-188's shape, one layer
over. The clean measurement restores the whole pre-fix file from git.

### U11 — [P2] THE SNAPSHOT'S "ANYTHING KEY-SHAPED IS REFUSED" COVERS FIVE SPELLINGS

**Leg b.** `web/api/issuer.ts:107-120` rejects `sk`, `secret`, `privateKey`,
`elgamal_sk`, `seed` and one env-var name. ⚠ **`private_key`, `account_seed`,
`issuer_key` and `passphrase` all parse.** True of the intended producer's
output; not the invariant the comment claims.

---

## UPHELD — the document's factual assertions

### U12 — [P2] "THE TIER RENDERS … THE FACILITY'S RUN RECORDS" — THERE IS NO SUCH ROUTE

**Legs b and d; verified by the adjudicator.** `web/app/src/routeTree.gen.ts:56-64`
lists exactly `/`, `/api-doc`, `/capabilities`, `/custody`, `/issuer`,
`/observer`, `/wallet`. `web/api/server.ts` ends at `/capabilities`. **The ADR
describes shipped scope that does not exist.** No authority is added; the defect
is that a decision record misdescribes the artifact it licensed.

### U13 — [P3] "THE SIGNER … GAINS NO CLIENT" — IT GAINS EXACTLY ONE

**Leg d.** `web/api/signer-status.ts:2-7` calls itself the tier's UDS client and
the gate counts exactly one (`:568-573`). ⚠ **Graded P3: the sentence's substance
— that the signer's AUTHORITY gains no client — is true**, and the following
sentence says so. The wording is loose, not false in intent.

### U14 — [P3] A RECORDED P-12 SEARCH NO LONGER REPRODUCES: FIVE FILES, NOT THREE

**Leg d; re-run by the adjudicator 2026-09-02.** The Harmonize/Metaco search
returns **five** — architecture, the ADR, `WEB-TIER-LIMITATIONS-2026-08-28.md`,
`CUSTODY-2026-08-28.md`, `web/api/disclosure.test.ts`.

⚠ **The conclusion SURVIVES** — all five are project-authored and none is a
Harmonize primary source, so D4 stands. **What failed is the count**, which is the
**fifteenth** recorded instance of a restated number going stale, and it is inside
a P-12 search whose whole purpose is to be re-runnable. ⚠ **A recorded search
needs its date read as a re-check date, exactly as an amendment claim does.**

### U15 — [P3] "BUILT BEFORE THE UI" IS NOT VERIFIABLE FROM THE ARTIFACT

**Leg d.** Gate and UI both first appear in commit `4764577`. The claim may
describe true working order; **the tree cannot establish it**, and a decision
record should not assert what its own evidence cannot show.

---

## REJECTED, with reasons, so a later session does not relitigate

### R1 — REJECTED: "IPC protocol confusion / deserialisation injection via the UDS bridge"

**Leg a, falsifier 7.** ⚠ **No HTTP input reaches the socket bytes.**
`readSignerStatus` writes a hardcoded object literal — `web/api/signer-status.ts:192`
`sock.write(JSON.stringify(request) + "\n")` where `request` is the fixed
`{ type: "status" }` — and the route passes no parameter
(`web/api/server.ts:74-76`). **Leg b independently confirms**: *"the traced web
path constructs exactly `{ type: "status" }`."*

⚠ **This is a leg without repository access speculating about implementation**,
which the packet explicitly invited it to flag rather than assert. It flagged it
correctly as `NEEDS SOURCE CHECK`. **The finding is rejected; the leg's conduct
was right.**

### R2 — REJECTED AS A ROTATION TRIGGER: "connection starvation of the signer daemon"

**Leg a, falsifier 9.** ⚠ **Already fixed, by E-213.** The deadline lives *inside*
`ask` and `finally` clears the timer and ends the socket **on every path
including the timeout** (`web/api/signer-status.ts:162, 196-201`). The measured
failure — a 12-probe script that had to be killed after five minutes — does not
reproduce.

⚠ **A residual survives and is NOT the finding as stated:** there is no rate
limit, so a local caller can drive repeated UDS connections and ledger RPCs
through the tier. **Recorded as a named residual at P3**, not a trigger. Leg b
names the same thing as *"request-driven resource use"*.

### R3 — PARTLY UPHELD: "DNS rebinding / cross-origin localhost exposure"

**Leg a, falsifier 5.** ⚠ **There is no `Host`-header check, and that half is
real.** But the exfiltration path is closed by two independent facts: the CORS
origin regex (`server.ts:54`) does not match a rebound attacker origin, so the
browser withholds the response from the attacker's script; and **the tier is
read-only, so a request that executes has no side effect**. ⚠ **Note the
mechanism precisely — leg b established CORS *"does not reject"* the request, it
only withholds headers.** So the request runs and the answer is unreadable.
**Graded P3 and recorded as a named gap**, not a rotation trigger.

---

## WHAT SURVIVES, AND IT IS THE HALF THE MILESTONE ACTUALLY NEEDED

⚠ **Every leg affirmed the signing argument, and the adjudicator could not break
it either.**

- **The transport property is real and is not created by this decision.**
  `ipc.rs` is a Unix domain socket; no browser API — `fetch`, `WebSocket`,
  `WebTransport`, WebRTC — can address `AF_UNIX`. Leg a affirmed this positively
  after being asked to attack it.
- **`Pair` and `Prepare` are unreachable from the tier.** Both repo legs traced
  it; the gate checks it with controls through the real detector.
- **The web path constructs exactly one request type and validates the response.**
- **The issuer key is genuinely out of the API process**, and the CLI genuinely
  refuses a `--key` flag (leg d verified `tools/issuer-decrypt-balance.ts:20-24,
  58-69`).
- **The holder's confirmation in the signer's own UI is untouched.** The failure
  found by this rotation is a **disclosure boundary**, not a signing path — leg b
  states this explicitly and leg s agrees.
- **The two deliberate deferrals hold up.** Leg d verified the wallet page renders
  the three structural reasons verbatim, the codec question is a visible named
  gap, and `custody-sim.ts` genuinely **computes** verdicts from declared
  requirements rather than restating them.
- **Rejecting ADR-0001 Option 2 and the pasted-token bridge remains correct**, and
  leg a affirmed both on the merits after being handed the strongest arguments
  against them.

---

## RULING ON STATUS

**`ADR-0003` may NOT go to `Accepted` on revision 1.** Its own acceptance
precondition 1 is now discharged — **this rotation is it** — and the rotation's
answer is that the claim needs rewriting, not ratifying.

**Required for a revision 2:**

1. **Narrow premise 1** to what the tier actually emits, naming the signer-local
   metadata rather than calling it public.
2. **Split premise 2** into the two properties it conflates: *holds no
   credential* (true) and *conveys nothing a credential produces* (false).
3. **Add the egress trigger** (U8) to the falsifier list.
4. **Correct U6, U12, U13, U14, U15** at the source.
5. **Extend the gate** to the loopback bind (U9) and reconcile the two socket
   detectors (U10).
6. ⚠ **Decide the issuer route.** Either authenticate it or stop serving
   `decrypted` from it. **The `0600` mode is the project's own view of what those
   bytes are worth**, and this is a decision for the project owner, not for a
   coding session — it trades the demonstration's whole point (showing what the
   issuer sees) against a disclosure the ADR never priced.

⚠ **Items 1–5 are corrections a session may make. Item 6 is a RULING and is
handed over, not taken.**

## The stopping condition, under `CLAUDE.md`'s two-round rule

⚠ **Round two is OWED and it is not optional.** The rule's stopping condition —
*"when the findings move from the construction to the INSTRUMENTS THAT CHECK IT,
that is convergence and it stops"* — **did not fire**. Round one's findings are
in the substance: two false premises, an invalid inference, and an incomplete
falsifier list. **Round two reviews the FIXES**, and the fixes to a design
argument are prose, which is the class this project has most often got wrong
while believing it had fixed it (E-168, E-194).

---

## What the FIX pass found, recorded because it is E-168 again

⚠⚠ **The retracted claim lived in a THIRD place nobody had looked, and the
disclosure-phrase gate is what found it.** Adding the three retracted spellings
to `tools/check-disclosure-phrases.ts` failed the gate immediately on
**`docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md:32`**, which
asserted the claim flatly as the *reason* the tier is read-only:

> *"**Because it is the only version that needed no adversarial review.** …
> A tier that reads public state and holds no credential grants no authority
> that did not already exist — so nothing moves, so the gate does not fire."*

⚠ **A published explainer told a reader the review was unnecessary, in a
document the ADR does not reference and no leg was pointed at.** Corrected with
the retraction, the three reasons it fails, and the fifth trigger.

**This is exactly the rule `CLAUDE.md` carries and which keeps not being
self-executing:** *a leg's list is line numbers; a corrected sentence is a
STRING, and strings have copies.* The legs cited the ADR. **The gate found the
copy.** Two further hits were the handover's own quotations of the claim — records,
not assertions — and were marked as such, which is `E-225`'s precedent.

⚠ **The gate now scans 215 live files for 10 retracted phrases and passes.**
