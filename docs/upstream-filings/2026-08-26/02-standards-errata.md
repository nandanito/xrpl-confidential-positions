TITLE: XLS-0096 errata: a field name that does not exist, a contradicted clawback destination, a mechanism with no ledger field, and duplicated section numbers
REPO: XRPLF/XRPL-Standards

---

> ⚠ **SUPERSEDED IN PART — read `correction-608.md` alongside this.** A Codex adversarial review on 2026-08-26 found defects in this filing and a correction was posted to XRPL-Standards#608 the same day. What no longer stands: item 3 (overstated: the view-key mechanism DOES exist, only the "separate set" wording is wrong) and item 5's ambiguity claim (only §14 is ambiguous, not §13.1). **The text below is the original as submitted and is kept unaltered for provenance — do not cite it without the correction.**

Five defects in [XLS-0096-confidential-mpt/README.md](https://github.com/XRPLF/XRPL-Standards/blob/master/XLS-0096-confidential-mpt/README.md), found while implementing a client against it. All five are checkable against the current `master` text and rippled 3.3.0. In every case where the spec and the implementation disagree, I have said which one I believe is correct.

Line numbers are against `master` as of 2026-08-26.

---

**1. §11.1 instructs the issuer to set a `RevealedAmount` field. No such field exists.**

§11.1 names `RevealedAmount` five times (lines 594, 596, 599, 600, 601). There is no such field in rippled 3.3.0: `sfRevealed` matches nothing anywhere under `include/` or `src/`, and `include/xrpl/protocol/detail/sfields.macro` contains no occurrence of "Revealed".

The implemented field is `sfMPTAmount` (`sfields.macro:149`, `UINT64`, code 26), and §11.2's own field table (line 613) names `MPTAmount` correctly. So the spec is internally inconsistent, and §11.2 is the half that is right.

**2. §11.2's closing sentence contradicts §11.1, §11.4 and the transactor about where clawed-back funds go.**

Line 616:

> This single transaction securely and verifiably moves the funds directly from the holder's confidential balance to the issuer's public reserve, ensuring the integrity of the ledger's public accounting is perfectly maintained.

§11.1 line 601 says the opposite, and says it emphatically:

> The global `OutstandingAmount` is decreased by `RevealedAmount`, burning the clawed-back tokens. The funds are permanently removed from circulation and are **not** credited to any account.

§11.4 (lines 648-650) describes supply reduction only, and §3's definition of Clawback (line 62) also says the funds are removed from circulation.

`ConfidentialMPTClawback.cpp:170-179` decrements `sfConfidentialOutstandingAmount` and then `sfOutstandingAmount`, and credits no account. §11.2's closing sentence is the one that needs removing or rewriting.

**3. §13.2.2 describes a "separate set of view keys" that has no corresponding ledger field.**

§13.2.2 (lines 809-815) describes an issuer-mediated model in which "the issuer controls a separate set of 'view keys'" and "all confidential balances and transaction amounts are also encrypted under these keys".

`MPTokenIssuance` in `include/xrpl/protocol/detail/ledger_entries.macro` carries exactly two encryption-key fields: `sfIssuerEncryptionKey` and `sfAuditorEncryptionKey`. There is no third key set, and no field an issuer could populate with one.

If §13.2.2 is describing the issuer sharing `sfIssuerEncryptionKey`'s private half, that is worth saying plainly, because it has a consequence the section does not draw: that key cannot be rotated, so an issuer who shares it has granted access that can never be withdrawn.

**4. §14.2 publishes timings with no hardware, parameter set or methodology.**

§14.2 (line 901) reports aggregated Bulletproof proving and verification timings attributed to "a laptop-class CPU", with a five-run average for one of them. No CPU model, no clock, no compiler, no optimisation flags, no memory, and no statement of what was and was not included in the measured region beyond a prose list of stages.

Line 903 hedges them correctly as "implementation reference values rather than protocol guarantees", which is the right instinct — but as published the numbers cannot be reproduced, compared against, or cited by anyone. Either the measurement conditions belong next to them or the figures belong in a benchmark artifact the spec links to.

**5. Two sections are numbered 14, and the Security Considerations subsections are numbered 13.x.**

- line 745 — `## 13. Operational Considerations` (no subsections)
- line 749 — `## 14. Security Considerations`
- lines 753-885 — its subsections, numbered `### 13.1` through `### 13.8`
- line 886 — `## 14. Analysis of Transaction Cost and Performance`

So `## 14.` appears twice, and eight subsections sit under a parent whose number they do not share. Cross-references to "§13.1" and to "§14" are ambiguous as a result — this is why the four items above cite line numbers rather than section numbers.

---

I am happy to open a PR for any or all of these. Items 1, 2 and 5 are mechanical. Items 3 and 4 involve a judgement about intent that I would rather leave to the authors.

---

*Disclosure: this report was prepared with AI assistance. Every citation was checked against the primary sources — XRPL-Standards `master` and rippled tag 3.3.0 — on 2026-08-26. I could not find a stated policy on AI-assisted contributions, so I am disclosing it by default.*
