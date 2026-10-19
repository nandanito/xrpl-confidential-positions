One correction to my own report, from a review after filing.

I wrote that `encryptCanonicalZeroAmount` is *"called on three paths, each with a source comment saying the ciphertext must be deterministic so ledger state is reproducible."* That is true of two of them, not three:

- `ConfidentialMPTConvert.cpp:305-306` — *"Must use canonical zero encryption (deterministic ciphertext) so the ledger state is reproducible."* ✅
- `ConfidentialMPTMergeInbox.cpp:111-112` — same comment. ✅
- `ConfidentialMPTClawback.cpp:138-166` — **no such comment.** The only comments in that range are *"After clawback, the balance should be encrypted zero."* (`:137`) and *"Set holder's confidential balances to encrypted zero"* (`:146`).

The three `encryptCanonicalZeroAmount` calls are there — holder, issuer and auditor — so the clawback citation supports the *behaviour* I described. It does not support the claim about the comment, and I should not have generalised across the three sites.

Nothing else in the report depends on it: the argument rests on the function's inputs being public ledger data, which `ConfidentialTransfer.cpp:266-288` shows regardless of what any call site comments.

Also, minor: my blockquote of §9.4 normalised the apostrophe in *"holder's private key"* to ASCII. The spec uses U+2019. The wording is otherwise verbatim, but a literal grep of my quotation will miss it.
