TITLE: Feedback from an outside XLS-0096 integrator: four design decisions that were better than they looked
REPO: XRPLF/rippled

---

> ⚠ **SUPERSEDED IN PART — read `correction-8118.md` alongside this.** A Codex adversarial review on 2026-08-26 found defects in this filing and a correction was posted to rippled#8118 the same day. What no longer stands: item 1's central claim (the spec advertises that property TWICE, §13.3:849 and §13.7:874-875), item 2's attribution (`credentials::valid` is TOB-RIPCTX-14's remediation), the introduction (contradicts its own item 3), and item 4 (WITHDRAWN — §13.1 is not "precise"). **The text below is the original as submitted and is kept unaltered for provenance — do not cite it without the correction.**

I have spent several weeks building a client against XLS-0096 on Devnet — proof generation, transaction construction, and a harness that reads back what a full-ledger observer can see. I have some defect reports open elsewhere. This is the other half, and it is not padding: each of these is something I only understood by reading the source or the spec closely, each one changed what I built, and none of them is advertised anywhere I looked.

Three are about this repository. The fourth is about the XLS text, and I have flagged it as such.

Verified against rippled tag 3.3.0 on 2026-08-26.

---

**1. The auditor ciphertext is covered by the same compact sigma proof as every other ciphertext.**

`ConfidentialMPTSend.cpp:110-147` builds one participant list — sender, destination, issuer, and the auditor when present — and hands it to a single `verifySendProof` call with one proof blob and one context hash. `ConfidentialTransfer.cpp:426-450` pushes the auditor into the same `participants` vector and makes one `mpt_verify_send_proof` call. The preflight comment at `ConfidentialMPTSend.cpp:62-63` notes the proof is a fixed size regardless of recipient count.

So the auditor's copy is AND-composed under the same Fiat–Shamir challenge as the holder's. An issuer cannot hand an auditor a ciphertext encoding a different value from the one the holder actually holds. The auditor's public key is also read from the issuance object (`ConfidentialMPTSend.cpp:117`) rather than from the transaction, so the sender cannot substitute one either.

That is a real integrity property, and it is the thing that makes the on-chain auditor model meaningfully different from just handing someone a decryption key. I did not find it called out as a selling point anywhere, and it was the deciding factor in a design choice on my side.

**2. `ConfidentialMPTSend` runs the cheap authorisation checks before the expensive cryptography, and says so.**

In `ConfidentialMPTSend::preclaim`, `requireAuth` for both sender and destination (lines 253, 256), `credentials::valid` (line 259) and `checkDepositPreauth` (line 266) all run before `verifySendProofs` (line 270). The comment at line 263 states the reason:

```cpp
// Check deposit preauth before the expensive ZK proof verification.
// Uses read-only view.
```

The same discipline shows up one stage earlier, in preflight at lines 73-74:

```cpp
// Check the encrypted amount formats, this is more expensive so put it at
// the end
```

Cost-ordered validation is the right shape for a transactor that has to verify Bulletproofs, and the comments show it was deliberate rather than incidental. Two independent instances in one file is a pattern, not an accident.

**3. A zero-amount `ConfidentialMPTConvert` is a valid key-registration path.**

`ConfidentialMPTConvert.cpp:32-33` rejects only amounts above `kMaxMpTokenAmount`. `ConfidentialMPTConvertBack.cpp:31` — the same position in the sibling transactor — rejects `== 0` explicitly. The asymmetry is the tell, and it is load-bearing: a holder can register an ElGamal public key and opt into confidential balances without moving or revealing any value.

That is genuinely useful and not at all obvious from a transaction named "Convert". It let me separate onboarding from the first funding movement entirely, which meant the amount of a holder's first real conversion was not forced to double as their registration event.

The xrpl.org concept page does now state this (`confidential-transfers.md:60`), which I only found afterwards — worth saying that the docs got there.

**4. On the XLS text, not this repository: §13.1.1 lists what is publicly visible, explicitly and first.**

XLS-0096 §13.1.1 "Publicly Visible Information" names the transaction type, the involved accounts — `Account`, `Issuer`, `Destination` — the currency code, the ciphertexts and the proofs. §13.1.2 then lists what is hidden. §13.1.3 goes further and breaks the public/hidden split down per transaction type, including that Convert and ConvertBack reveal their amounts.

Being explicit that account identities remain public is the single most useful thing a confidentiality specification can do for the people building on it, and a lot of privacy specs are coy about exactly this. I have leaned on those three subsections repeatedly to keep my own project's claims about what is and is not hidden honest, and they are precise enough to do that with.

If there is a revision of §13.1 in progress, keeping that structure — public first, hidden second, per-transaction third — would be worth preserving.

---

None of this needs action. I am filing it because a team that only ever hears about defects learns to discount the source, and because each of these four cost me nothing to discover once I knew where to look, which is usually a sign the design is doing its job.

---

*Disclosure: this report was prepared with AI assistance. Every line citation was checked against rippled tag 3.3.0 and XRPL-Standards `master` on 2026-08-26. I could not find a stated policy on AI-assisted contributions in `CONTRIBUTING.md`, so I am disclosing it by default.*
