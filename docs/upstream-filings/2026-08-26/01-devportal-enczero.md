TITLE: Confidential Transfers: two statements say encrypted zero is indistinguishable, but the canonical EncZero is recomputable from public data
REPO: XRPLF/xrpl-dev-portal

---

> ⚠ **SUPERSEDED IN PART — read `correction-3879.md` alongside this.** A Codex adversarial review on 2026-08-26 found defects in this filing and a correction was posted to xrpl-dev-portal#3879 the same day. What no longer stands: the claim that all THREE canonical-zero call sites carry a determinism comment — `ConfidentialMPTClawback.cpp` has none. **The text below is the original as submitted and is kept unaltered for provenance — do not cite it without the correction.**

Two sentences on [Confidential Transfers](https://github.com/XRPLF/xrpl-dev-portal/blob/master/docs/concepts/tokens/fungible-tokens/confidential-transfers.md) tell the reader that an encrypted zero balance cannot be distinguished from any other ciphertext. XLS-0096 §9.4 says the opposite, deliberately, and rippled implements the spec. An integrator reading this page will believe balances are less observable than they are.

I hit this while building an observer harness against Devnet, so the recomputation below is something I ran rather than something I inferred.

### The two statements

**`docs/concepts/tokens/fungible-tokens/confidential-transfers.md` line 95:**

> After a merge, the inbox is reset to a deterministic "encrypted zero" value. This zero value is a valid ElGamal ciphertext that represents zero, but is indistinguishable from other ciphertexts to observers without the private key.

The sentence contradicts itself: a value that is *deterministic* from public inputs is by construction distinguishable by anyone who can recompute it.

**Line 126:**

> However, they cannot determine whether those tokens were transferred to other accounts or are still held by the original account, because encrypted balances for zero are indistinguishable from non-zero balances.

This one is load-bearing — it is the reassurance offered to a reader who has just been shown a low-volume traffic-analysis example.

### What the spec says

XLS-0096 §9.4, "Canonical Encrypted Zero", presents the determinism as a feature and states the visibility consequence in terms:

> **Public zero visibility:** Because the canonical encrypted zero is fully deterministic, validators can compare any stored ciphertext against the known `EncZero` value for that account. If they match, the balance is publicly known to be exactly 0. This allows validators to verify that a newly initialized spending balance or a reset inbox contains no hidden value, without requiring the holder's private key. Non-zero ciphertexts remain opaque.

Nothing in that mechanism is available only to validators. The inputs are public ledger data.

### What rippled 3.3.0 does

`encryptCanonicalZeroAmount` takes the holder's ElGamal public key, the account ID and the MPT issuance ID, and nothing else — all three readable from the ledger:

- `src/libxrpl/protocol/ConfidentialTransfer.cpp:266-288` — the definition, delegating to `generate_canonical_encrypted_zero(ctx, &c1, &c2, &pubKey, account.data(), mptId.data())`
- `include/xrpl/protocol/ConfidentialTransfer.h:274` — the declaration

It is called on three paths, each with a source comment saying the ciphertext must be deterministic so ledger state is reproducible:

- `src/libxrpl/tx/transactors/token/ConfidentialMPTConvert.cpp:305-313` — first-time spending balance initialisation
- `src/libxrpl/tx/transactors/token/ConfidentialMPTMergeInbox.cpp:111-114` — the inbox reset that line 95 is about
- `src/libxrpl/tx/transactors/token/ConfidentialMPTClawback.cpp:138-166` — holder, issuer and auditor fields after clawback

### Reproduced against Devnet

On 2026-08-17 I recomputed the canonical `EncZero` independently, from public inputs only, and byte-compared it against a live `sfConfidentialBalanceSpending` read from Devnet. It matched. No private key was involved.

`ConfidentialTransfer` was enabled on Devnet when I checked it again on 2026-08-26T01:49:48Z via the `feature` RPC.

### Scope of the correction

Line 126's reassurance is not wrong in every case, and I think that is worth separating out. A balance that reached zero through `ConfidentialMPTConvertBack` is a randomised ciphertext and is genuinely opaque. A balance that is *canonically* zero — a freshly initialised spending balance, a reset inbox, all fields after a clawback — is publicly identifiable as exactly zero. So the general claim is false in precisely the cases the page introduces it for.

There is a wrinkle even inside line 126's own example. I ran that scenario on Devnet — convert in, convert the whole spending balance back out — and had the observer harness recompute the canonical `EncZero` from public inputs. `ConfidentialBalanceSpending` came back as *not* the canonical zero, exactly as the page implies. `ConfidentialBalanceInbox`, on the same `MPToken` object, came back as **exactly zero, publicly**. So an observer looking at that account does learn something definite about one of its two confidential fields, which is a smaller claim than "they cannot determine whether those tokens were transferred" but not nothing.

Suggested shape for the fix, rather than a specific wording: say that the canonical encrypted zero is publicly recomputable and therefore publicly identifiable, note that this is intentional per §9.4, and keep the traffic-analysis discussion on line 126 by scoping it to balances zeroed by conversion rather than to zero balances in general.

Happy to open a PR if that is useful.

---

*Disclosure: this report was prepared with AI assistance. The source citations, the Devnet recomputation and the spec quotations were each checked against the primary sources at rippled tag 3.3.0 and XRPL-Standards `master` on 2026-08-26. I could not find a stated policy on AI-assisted contributions in `CONTRIBUTING.md`, so I am disclosing it by default.*
