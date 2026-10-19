# REVIEW-037c — adjudication: ROUND TWO found the fixes incomplete and BOTH new gates false-passing

- **Date:** 2026-09-02
- **Subject:** commit `f7e7b43` — `REVIEW-036`'s fixes
- **Legs:** `REVIEW-037a` (Gemini, documents only, attacking the rewrite as an argument), `REVIEW-037b` (Codex, full repo, pinned to `f7e7b43`)
- **Round one:** `REVIEW-036c`

## RULING

⚠⚠ **BOTH LEGS RULED THE FIXES INCOMPLETE, AND THEY ARE RIGHT.** Round two found
exactly the three classes `CLAUDE.md` says round two exists to find — **a defect
introduced BY a fix, a fix that reached the cited instance and not the PHRASE,
and sentences overstating what the fixes established** — and it found all three
in quantity.

**The single worst result: the two gates round one built or extended BOTH
FALSE-PASSED, and one of them false-passed on the very assertion it was written
to catch.**

**11 findings upheld, 0 rejected, 1 partly upheld.** ⚠ **Nothing was rejected**,
which has not happened in this project before and is itself the finding: round
one's fix pass was not careful.

---

## U1 — [P1] THE DISCLOSURE GATE FALSE-PASSED ON THE EXACT SENTENCE IT WAS EXTENDED TO CATCH

**Both legs. `REVIEW-037b` F1, `REVIEW-037a` 3A.**

`ADR-0003:52` — inside **D1, the operative Decision** — still read:

> *"What the tier discloses that the protocol does not already publish: nothing …
> The `Status` note's entry count is activity metadata of exactly the kind the
> protocol leaves public."*

⚠ **Round one retracted that sentence three sections below and left this instance
standing**, so the document asserted in its Decision what it retracted in its
analysis. **`E-168` in its purest form.**

⚠⚠ **AND THE GATE ADDED TO CATCH IT FORGAVE IT.** The phrase was in
`check-disclosure-phrases`'s list. It passed because the marker **`REVIEW-036`**
sat twice in the six-line window — **in neighbouring citations added by the same
fix pass.**

> ⚠⚠ **A MARKER NAMING THE REVIEW THAT PRODUCED A RETRACTION IS WORTHLESS,
> BECAUSE THAT REVIEW IS CITED THROUGHOUT THE DOCUMENT IT CORRECTS.** The fix
> pass manufactured its own suppression.

**Measured**: removing `REVIEW-036` from the three markers makes the gate fail
immediately on `ADR-0003:52`, exit 2. Fixed at both ends — markers tightened,
D1 corrected.

### U1b — [P1] the gate could not see the rendered UI at all

`REVIEW-037b` F1. **`.tsx` was absent from `LIVE_EXT`**, so every page in
`web/app/src/routes/` was invisible to the gate that exists to stop a retracted
claim being asserted. ⚠ **A page is the largest disclosure surface this project
has** — the one place a claim reaches a human who cannot read source. Fixed;
the scan went from **215 to 226 files**.

⚠⚠ **AND WIDENING IT IMMEDIATELY FOUND A SECOND DEFECT NO LEG HAD NAMED: the
rendered UI told every viewer the tier reads *"the XRPL **Confidential
Devnet**"*** — a network `CLAUDE.md`'s own hard rule says **is not needed, not
used, and whose existence was never searched** (P-12, E-26). Corrected to *XRPL
Devnet* in `web/app/src/routes/index.tsx` and in
`WEB-TIER-LIMITATIONS-2026-08-28.md`. ⚠ **Both `build-lead` persona copies still
carried the struck rule verbatim** — *"The target is the Confidential Devnet,
not the general devnet"* — and were corrected together, `check-personas` green.

---

## U2 — [P1] PART 6 CERTIFIED NON-LOOPBACK BINDS AS LOOPBACK — THE SEVENTH FALSE-PASSING GATE, WRITTEN IN THE ROUND THAT FIXED THE SIXTH

**`REVIEW-037b` F2.** `bindVerdict` checked that each call's text contained the
**word** `hostname`, and **separately** that *some* `BIND_HOSTNAME` declaration
was loopback. ⚠ **It never connected the argument to the declaration.**

**Measured by the adjudicator against the real `web/api` sources — three of four
false-passed:**

```
FALSE-PASS  LAN hostname arg, loopback const still present
FALSE-PASS  hostname from env
FALSE-PASS  hostname "[::]"
caught      Bun.serve with 0.0.0.0     ← and only via the vacuous-pass guard
```

⚠ **The fourth was caught for the wrong reason**: `Bun.serve(` is not `.listen(`,
so with no `.listen(` present the call set was empty and the vacuous guard fired.
Beside a correct `.listen(`, a `Bun.serve({hostname:"0.0.0.0"})` was invisible.

**Rewritten to FAIL CLOSED**: a quoted literal is checked directly; a bare
identifier is resolved **one level** to its declaration; **anything else — env
read, ternary, concatenation, call — is REFUSED rather than assumed loopback.**
`Bun.serve(` is now matched. **All four cases now caught.**

⚠⚠ **AND THE FIX TRIPPED THE GATE'S OWN ASSERTED-UNCAUGHT CONTROL, CORRECTLY.**
Item 10 declared a run-time hostname *invisible*; the rewrite catches it, so the
control failed with *"this is now CAUGHT — item 10 is STALE."* **That is E-203's
mechanism working exactly as designed, and it is the first time in this
repository it has caught a disclosure going stale rather than a detector going
wrong.** Control flipped to a positive; item 10 rewritten.

### U2b — [P1] part 6 checked the API and not the dev server

⚠ **Found by the adjudicator's own self-attack before either leg reported it**,
and independently confirmed by `REVIEW-037b` F2. `web/app/vite.config.ts` sets a
`host` **and proxies `/api`** to the API process — so a dev server on `0.0.0.0`
**publishes the whole API, issuer route included, to the LAN, bypassing the
API's own loopback bind.** ⚠ **E-213's shape exactly inverted**: there the
`127.0.0.1` reasoning lived in `vite.config.ts` and the API got a bare port;
part 6 was written to gate the API and left `vite.config.ts` ungated. **A gate
written against the last defect gates the last defect.** Fixed, four controls,
real-tree break test exits 1.

---

## U3 — [P1] THE SOCKET FIX WAS WRITTEN AGAINST THE FINDING'S LIST, NOT THE PROPERTY

**`REVIEW-037b` F3.** E-226's fix added the two spellings the finding named —
`node:net`, `createConnection` — **and stopped there.** The leg demonstrated a
working client the widened set still missed:

```ts
import net from "net";
const s = net.connect({ path });
s.write(JSON.stringify({ type: ["pa", "ir"].join("") }) + "\n");
```

**Zero hits across every exported detector**, and part 5 still counted one client
when it was appended to the real source set. ⚠⚠ **`E-168`'s rule landing on the
fix for E-226 one round later — *a leg's list is line numbers; the property is
the property*.** `SOCKET_OPENERS` now carries `net.connect`, `from "net"`,
`from 'net'`, `require("net")`, `require('net')`, with the leg's exact evasion as
a control. **Verified: the evasion now counts 2.**

⚠ **The `["pa","ir"].join("")` half is NOT fixed and cannot be** — it is the
runtime-assembly shape the gate declares uncaught in its own disclosure. **Named,
not closed.**

---

## U4 — [P1] THE REWRITE DROPPED HALF OF ROUND ONE'S HEADLINE FINDING

**`REVIEW-037a` F4/5A.** Round one's U1 named **two** sites — the issuer snapshot
**and** `GET /api/signer`, which returns the socket path and every candidate path
probed, out from behind a `0700` directory. ⚠ **Revision 2's handover section
carried only the issuer route.**

⚠⚠ **That is E-212's own narrowing — *"the author read their own warning as
narrower than it was"* — committed against a finding written four hours
earlier, by the session that wrote it.** Both sites are now in the handover.

---

## U5 — [P1] "FIVE THINGS FALSIFY THE REWRITTEN CLAIM" CREATED A SELF-FALSIFICATION PARADOX

**`REVIEW-037a` F2.** Revision 2 introduced the trigger list as *"Five things
falsify the rewritten claim"* and then said trigger 5 **had already fired** — so
by its own wording the rewritten claim was already false while the document
asserted it stood.

**The defect is the drafting, and the distinction now stated explicitly:**

- **Triggers 1-3 falsify the rewritten claim** — it is a claim about *signing*
  authority and each puts a signing path in the tier.
- ⚠ **Triggers 4-5 fire a ROTATION and do NOT falsify it.** **Trigger 5 has
  fired, the rewritten claim still stands, and both are true at once.**
- ⚠⚠ **A trigger is a condition requiring a rotation; a falsifier is a condition
  making a claim false. Revision 1 collapsed those two — that is how the
  exemption was granted — and revision 2 did it again in one sentence.**

---

## U6 — [P2] "RESTS ON THE TRANSPORT" AND "VERIFIED BY PARTS 1-3" BOTH OVERSTATED

**`REVIEW-037a` F1.** The transport carries only that a *browser page* cannot open
a UDS. ⚠ **The UDS accepts `Pair` and `Prepare` from whatever process holds the
descriptor, and Elysia holds one** — so *"the tier sends only `Status`"* is
**application discipline**, not a transport property. And the ADR said the
property was *"verified by `check-web-readonly` parts 1-3"* while conceding four
sections later that the gate **cannot prove a signing path does not exist**.
⚠ **A gate FALSIFIES; it does not verify.** Both corrected; the claim now names
its three separate supports.

---

## U7 — [P2] SHIPPING WITHOUT A RULING *IS* A RULING, AND IT IS OPTION 3

**`REVIEW-037a` F3, and it is the sharpest procedural finding of either round.**
A document cannot simultaneously say *"a coding session may not rule on this"*,
*"the tier ships with the boundary open"* and *"step 8 is buildable now"* —
**because shipping open selects option 3 while keeping the appearance of having
deferred.**

**Stated plainly, which is what was owed:** this project **currently accepts
local cross-uid disclosure** of a demo issuer's decrypted balances and the
signer's local metadata, on a Devnet demonstration, under P-5. **That is option
3, taken by default and now written down** — reversible, and the owner's to
reverse.

### U7b — [P2] option 4 was a phantom

⚠ *"Serve it only to a caller that can already read the file … the only option
that ADDS no credential"* — **loopback TCP carries no peer credential**
(`LOCAL_PEERCRED` is a Unix-socket facility), so on TCP the only proof a caller
could read the file is a token **from** the file, which **is** a credential.
**The sound version is a transport change** — move the API to a `0600` Unix
socket — **and it costs the browser**, which is the property the whole ADR rests
on. Corrected.

---

## U8 — [P2] THE RUNNING INTERFACE SAID THE REVIEW HAD NOT HAPPENED

**`REVIEW-037b` F4.** `/api/meta` served
*"ADR-0003 … (Proposed, not adversarially reviewed)"* **after the rotation**, as
did `README.md`, `web/README.md`, `GETTING-STARTED-CLAUDE-CODE.md` and
`WEB-TIER-LIMITATIONS-2026-08-28.md`. ⚠ **The register and the live UI
misdescribed the fix's own review state.** All corrected; 126 web tests green.

---

## U9 — [P2] THE CORRECTED COUNT WAS ALREADY FALSE IN THE COMMIT THAT CORRECTED IT

**`REVIEW-037b` F5. Sixteenth instance, inside the fix for the fifteenth.**

Round one corrected the Harmonize P-12 count from *three* to *five*. **Measured
at the tip: TEN tracked files, or SIX excluding `docs/reviews/`** — because the
packets, the adjudication and the `CLAIMS.md` row recording the correction *all
name Harmonize*.

> ⚠⚠ **THE SEARCH IS SELF-REFERENTIAL. DOCUMENTING IT ADDS A FILE TO IT.** A
> count over the project's own corpus is not a fact about the world; it is a
> fact about how much the project has written, **which the act of recording
> increases.**

**The ADR now states the PREDICATE and the command and no number.** The
conclusion — no Harmonize primary source — survived both rounds untouched.

---

## U10 — [P3] THE GATE'S OWN DESCRIPTIONS WENT STALE AT THE MOMENT IT WAS EXTENDED

**`REVIEW-037b` F6.** The gate header said *"five things"* and listed **four**
(part 4 was added after E-212 and never reached the list); `Makefile` said *"Five
parts"* and listed four; `web/README.md` said *"Five parts"* and listed five.
All three now say **six** and list six.

---

## PARTLY UPHELD

### U11 — [P2] "PART 6 IS SECURITY THEATRE"

**`REVIEW-037a` F6.** ⚠ **Upheld as a warning, rejected as a characterisation.**
The leg is right that part 6 checks binding to **loopback**, and that loopback is
the very channel U1 shows is not uid-scoped — **so part 6 does nothing for
E-228.** It is wrong that this makes part 6 theatre: **it closes a falsifier
architecture §6 step 8 names in writing and nothing checked** (E-227), which is a
different and real defect. **The remedy is the disclosure**: the ADR now says
explicitly that **part 6 does not address egress and must not be read as doing
so.**

---

## WHAT ROUND TWO CONFIRMED AS SOUND

⚠ **Both legs attacked the signing claim and neither could break it**, which
matters more than round one's affirmation because they were trying to break a
*fix*.

- **No `Pair`/`Prepare` or signing path exists in the committed tier.** Verified
  by manual inspection (`REVIEW-037b`), and `signer-status.ts:157,176-192`
  accepts a typed `status` request and writes that fixed object.
- **Round one's citations all hold**: `signer/src/ipc.rs:100-128`,
  `tools/issuer-view-snapshot.ts:261-272`, `signer/src/store.rs:753-756`,
  `web/api/issuer.ts:162-170`, `web/api/server.ts:73-78`.
- **The three advertised bind break-tests genuinely fail the detector.**
- **The removal of the live decryption oracle (E-212) is real** — the API
  performs no ElGamal decryption per request.
- **The `node:net`/`createConnection` spelling is genuinely counted.**
- ⚠ **The Harmonize conclusion survived both rounds** even as its count failed
  twice.

## The stopping condition — ROUND THREE IS NOT OWED

⚠ **`CLAUDE.md`'s rule: *"When the findings move from the construction to the
INSTRUMENTS THAT CHECK IT, that is convergence and it stops."*** **It fired.**

Round one's findings were in the **substance** — two false premises and an
invalid inference. ⚠ **Round two's are almost entirely in the INSTRUMENTS**: two
false-passing gates, a marker that suppressed its own check, a gate blind to
`.tsx`, three stale descriptions of a gate, and a self-referential count. **The
construction — that this tier adds no signing authority — was attacked by both
legs in both rounds and never moved.**

⚠ **What remains open is not a defect but a DECISION**, and it is not a coding
session's: the issuer route's disclosure boundary, priced at four options, handed
to the project owner.
