TITLE: XLS-0096: a failed confidential transaction is applied to the ledger with its ciphertexts, and §13.1 does not say so
REPO: XRPLF/XRPL-Standards

---

> ⚠ **SUPERSEDED IN PART — read `correction-609.md` alongside this.** A Codex adversarial review on 2026-08-26 found defects in this filing and a correction was posted to XRPL-Standards#609 the same day. What no longer stands: every use of `tapFailHard`, which is this project's shorthand and appears ZERO times in rippled — the real names are `fail_hard` (RPC) and `TapFailHard` (apply flag). **The text below is the original as submitted and is kept unaltered for provenance — do not cite it without the correction.**

`tecBAD_PROOF` is a `tec`, and a `tec` is applied to the ledger. For a confidential transaction that means the ciphertexts in the failed transaction are recorded permanently. Where the proof failed *because the sender encrypted to the wrong recipient key*, the party who supplied that wrong key can then decrypt the amount from public ledger data.

The failure presents to a client as "your transaction was rejected". It is also "your amount was published". §13.1's privacy properties do not mention this, and I think they should.

I executed this on Devnet before reporting it.

### Why a failed proof still publishes

XLS-0096 names `tecBAD_PROOF` as a failure condition in seven places (§7.3.2, §8.3.2, §10.4.1, §10.4.2, §11.3.2). It does not anywhere state the consequence of that code being a `tec` rather than a `tem` or `tef`.

In rippled 3.3.0, `src/libxrpl/tx/Transactor.cpp:1652-1656` routes a `tec` through `processPersistentChanges` when `isTecClaimHardFail(result, view().flags())` holds, and `include/xrpl/tx/applySteps.h:40-44` defines that as `isTecClaim(ter) && ((flags & TapRetry) == 0u)`. So in the ordinary case the transaction is applied, and its fields — `SenderEncryptedAmount`, `DestinationEncryptedAmount`, `IssuerEncryptedAmount`, `AuditorEncryptedAmount` where present, and both Pedersen commitments — are written to the ledger.

The escape hatch exists but belongs to the submitter, not to whoever built the transaction: `Transactor.cpp:1645-1651` discards a `tec` outright when `TapFailHard` is set.

### Executed on Devnet

On 2026-08-19 I built a `ConfidentialMPTSend` that encrypted the amount to a key of my choosing rather than to the destination's registered `sfHolderEncryptionKey`, and submitted it without `tapFailHard`.

- Result `tecBAD_PROOF`, recorded on validated ledger **4603815**
- Transaction hash `7A283EE5920EBB97AB90F4BC92B4E4E293C6DCE541A9607277D45DA4145AF160`
- The published ciphertext is byte-identical to what was submitted
- The amount — 42 — was **recovered from public ledger data** using only the key that had been substituted in
- The intended destination could not decrypt it at all

You can check this without taking my word for any of it. A `tx` call for that hash against `wss://s.devnet.rippletest.net:51233` returns `validated: true`, `TransactionResult: tecBAD_PROOF`, and `SenderEncryptedAmount`, `DestinationEncryptedAmount` and `IssuerEncryptedAmount` — 66 bytes each — together with both 33-byte commitments, still readable on the validated ledger. I re-ran that query on 2026-08-26 before filing this.

Nothing was compromised to do this; it is what a wrong *read* of the destination key costs. `ConfidentialMPTSend.cpp:136` takes the destination key from `(*sleDestinationMPToken)[sfHolderEncryptionKey]`, so rippled verifies against the key it holds and the proof fails — correctly. The point is only that failing this way is not free.

`ConfidentialTransfer` was enabled on Devnet when I re-checked via the `feature` RPC on 2026-08-26T01:49:48Z.

### Why this is awkward for a client author

A client that builds and signs but does not submit — which is a normal split when proof generation and key custody live in a separate process from network I/O — cannot set `tapFailHard` itself. Whether the amount stays private on a failed proof is decided by whichever component calls `submit`, and nothing in the protocol makes that component set the flag. It is a convention between two parts of an application rather than a property of the transaction.

A related point I want to flag as **reasoned, not executed**: `tapFailHard` governs what reaches the *ledger*. It does not govern what reaches the *node the blob was submitted to*, which has the ciphertexts as soon as it receives them. If the same endpoint both served the recipient key and received the submission, the flag does not help against that endpoint. I have read the submission path but have not demonstrated this one, and I would not want it repeated as though I had.

### What would help

Something short in §13.1 — a sentence saying that a `tec` failure is applied and that the ciphertexts in a failed confidential transaction are recorded permanently, with a pointer to `tapFailHard` for submitters who need to avoid it. Whether §13.1.1's "Publicly Visible Information" list should mention failed transactions explicitly is a judgement for the authors.

---

*Disclosure: this report was prepared with AI assistance. The Devnet execution is my own and the ledger index and transaction hash above are checkable; the source citations were verified against rippled tag 3.3.0 on 2026-08-26. I could not find a stated policy on AI-assisted contributions, so I am disclosing it by default.*
