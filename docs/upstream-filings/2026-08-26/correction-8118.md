I had this reviewed after filing it, and it does not hold up. Correcting it here rather than leaving it to stand.

**Item 1 is wrong in its central claim.** I wrote that the auditor-ciphertext property is *"not called out as a selling point anywhere I found"*. XLS-0096 states it twice, and I missed both:

- §13.3, line 849: *"Optional auditor keys: The auditor ciphertext is covered by the same compact sigma proof; no separate proof is required."*
- §13.7, lines 874–875: auditor ciphertexts are *"validated by the compact sigma proof alongside holder, issuer, and other recipient ciphertexts"* — and, in the next bullet, *"Prevents issuers from selectively encrypting incorrect balances for auditors."*

That second bullet is the exact benefit I presented as something I had worked out from the source. It is your own sentence. I read §13.1.1–§13.1.3 closely for item 4 and never read down the same section to §13.3 and §13.7.

For completeness: the multi-recipient proof construction was also the subject of TOB-RIPCTX-16 (per-recipient nonces instead of shared `r`), resolved. The property is real and the code does what I said, but "nobody has advertised this" was false and I should have checked before saying it.

**Item 2 needs a correction of attribution.** The cost-ordering claim stands — `checkDepositPreauth` before proof verification with the explicit comment at `:263`, and the preflight instance at `:73-74`. But I listed `credentials::valid` at `:259` as part of a deliberate design. It is an audit remediation: TOB-RIPCTX-14 found that `ConfidentialSend::preclaim` did not call `credentials::valid()`, and the fix review records *"Credential checks have been integrated into the confidential send operation."* Presenting it as an independently discovered virtue was wrong.

**The introduction contradicts item 3.** I opened with *"none of them is advertised anywhere I looked"* and then item 3 says the xrpl.org page does state the zero-amount registration path. Both sentences are mine, in the same issue.

**Item 4 should be withdrawn.** I called §13.1 *"precise enough"*. It is not, in two ways that matter:

- §13.1.1 lists *"Currency code (e.g., 'USD')"* as publicly visible. Confidential MPT transactions have no currency field — all five schemas carry `sfMPTokenIssuanceID` and no `sfCurrency` (`transactions.macro:1087-1166`). I repeated an error while praising the section for precision.
- §13.1.2 lists *"Holder balances"* as hidden without qualification, but §9.4 says a ciphertext matching the canonical `EncZero` is *"publicly known to be exactly 0"*. That is the same contradiction I filed against the xrpl.org docs in XRPLF/xrpl-dev-portal#3879.

And I have separately asked in XRPLF/XRPL-Standards#609 for §13.1 to gain a statement it currently lacks. Saying "precise enough" and "none of this needs action" about a section I was simultaneously asking you to revise was not a defensible position.

**What I still think stands:** the cost-ordering discipline in item 2, with its two source comments; item 3; and one detail from item 1 that the spec does not state — the auditor's public key is read from the issuance object (`ConfidentialMPTSend.cpp:117`) rather than from the transaction, so a sender cannot substitute one.

Apologies for the noise. A positive report resting on "nobody has said this" needed a search before it was sent, and it did not get one.
