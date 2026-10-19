Two corrections to my own report, from a review after filing. Items 1, 2 and 5 are unaffected.

**Item 3 was overstated.** I said §13.2.2 describes a mechanism *"that has no corresponding ledger field"* and that *"there is no third key set"*. The second half is right; the framing around it is not.

The mechanism §13.2.2 describes does exist — it is the issuer sharing the private half of the key already recorded in `sfIssuerEncryptionKey`. §13.2's own text at line 794 describes the architecture as holder, issuer and optional auditor keys, and the current xrpl.org page states the mechanism plainly: *"issuers can provide auditing access by sharing their own ElGamal private key with auditors."*

So the defect is narrower than I filed it: **the wording "a separate set of view keys" is misleading**, because it implies a third key set that is neither specified nor implemented, when what is meant is the existing issuer key under a different name. §13.2.2 compounds it by saying balances are *"also encrypted under these keys"*, which reads as an additional ciphertext rather than the issuer ciphertext already described.

The consequence I drew still holds and is the reason I raised it: an issuer who shares that key has granted access that cannot be withdrawn, because the key cannot be rotated. §13.2.2 does not say so.

**Item 5's claim about ambiguity was half wrong.** I wrote that cross-references to *"§13.1"* and *"§14"* are both ambiguous. Only §14 is — lines 749 and 886 both begin `## 14.`. There is exactly one heading numbered `### 13.1`, so a reference to §13.1 resolves uniquely even though it is misnested under §14. The misnumbering is still worth fixing; the ambiguity claim applies to §14 alone.

Also minor: my nested quotation of line 813 changed the spec's double quotes around *"view keys"* to single quotes and moved the period inside. The wording is otherwise verbatim.
