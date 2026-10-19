TITLE: [Docs] Paper §2.1 says C₁ is sent once, but XLS-0096 and rippled carry it in every ciphertext, so the paper's Send size is 99 bytes below the protocol's
REPO: XRPLF/mpt-crypto

---

`paper/cmpt-compact-sigma.tex` §2.1 says *"The shared first component C₁ is transmitted once on-chain"*. On that basis it totals a Send's cryptographic payload at 1177 bytes for n = 4 and 1144 for n = 3. XLS-0096 §17.1 gives 1276 and 1210 bytes for the same payload, because each ciphertext is a full 66 bytes, `C₁` included, and rippled enforces that layout. The paper's total does not match the adopted protocol: it is 99 bytes below it for n = 4, and 66 for n = 3.

**Suggested fix:** correct §2.1 and the totals to match XLS-0096 §17.1, or mark the shared-C₁ layout as a proposal that the protocol did not adopt.

**The component sums** (cryptographic payload only, as both documents count it)

```text
Component           Paper, lines 1002-1017            XLS-0096 §17.1 and rippled
C1                  1 x 33 = 33                        inside each ciphertext below
Ciphertexts         n x 33 (C2) = 132 / 99             n x 66 (C1 || C2) = 264 / 198
Two commitments     66                                 66
ZKProof             192 + 754 = 946                    946
Total, n = 4 / 3    1177 / 1144                        1276 / 1210
Difference                                             (n - 1) x 33 = 99 / 66
```

**Evidence**

- [XLS-0096 §17.1](https://github.com/XRPLF/XRPL-Standards/blob/58ccd304724d328acd923a3adf11f7fccd707c81/XLS-0096-confidential-mpt/README.md#L1010-L1015):

  > Total crypto size = 264 bytes (ciphertexts) + 66 bytes (Pedersen commitments) + 946 bytes (ZKProof: 192-byte compact sigma proof + 754 aggregated Bulletproof)
  > = 1276 bytes (with auditor). Without auditor (Nciphers = 3): 198 + 66 + 946 = 1210 bytes.

- rippled's Send preflight requires each encrypted amount to be 66 bytes ([`ConfidentialMPTSend.cpp` lines 51-61](https://github.com/XRPLF/rippled/blob/7939339a65e97d9dc8d3496391d01932e3a0b9fd/src/libxrpl/tx/transactors/token/ConfidentialMPTSend.cpp#L51-L61)).
- The extra copies carry no information. rippled verifies a Send through [`verifySendProofs`](https://github.com/XRPLF/rippled/blob/7939339a65e97d9dc8d3496391d01932e3a0b9fd/src/libxrpl/tx/transactors/token/ConfidentialMPTSend.cpp#L299) and [`mpt_verify_send_proof`](https://github.com/XRPLF/rippled/blob/7939339a65e97d9dc8d3496391d01932e3a0b9fd/src/libxrpl/protocol/ConfidentialTransfer.cpp#L585). In mpt-crypto 1.0.2, the version rippled requires, that function rejects a Send unless every participant's first 33 bytes match: *"All participants must share the same c1 bytes"* ([`mpt_utility.cpp` lines 1140-1145](https://github.com/XRPLF/mpt-crypto/blob/376691c5fca7898bd1161b0ac6646109d069ceb9/src/utility/mpt_utility.cpp#L1140-L1145)).
- In the paper: the sentence at [line 220](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L220). The 1177 total is at [lines 98-100](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L98-L100), [176-179](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L176-L179), [1017](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L1017), [1049](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L1049) and [1633](https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/paper/cmpt-compact-sigma.tex#L1633).

My Devnet measurements of three Sends on 2026-08-17 matched these totals.

<details>
<summary>Searches for an existing report</summary>

```text
# 2026-10-18. Open and closed, issues and PRs.
gh search issues "transmitted once"   --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "shared C1"          --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "1177"               --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "size breakdown"     --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "cmpt-compact-sigma" --repo XRPLF/mpt-crypto --include-prs   # 10; none discusses
                                        the ciphertext layout or the size totals
gh search issues "transmitted once"   --owner XRPLF --include-prs             # 0
gh search issues "shared C1"          --owner XRPLF --include-prs             # 0

# Audits
Trail of Bits, April 2026 report: this paper is not among its reference papers.
  TOB-RIPCTX-16 (Resolved) moved the code to the shared-r proof. It does not address
  the ciphertext field layout or the paper's totals. I could not obtain the June 2026
  revision.
  https://github.com/trailofbits/publications/blob/master/reviews/2026-04-ripple-labs-xrp-ledger-confidential-transfer-securityreview.pdf
Sherlock XRP Ledger Attackathon: full findings report not found. Its public trail:
  gh search issues Attackathon --owner XRPLF --include-prs --limit 500    # 88
  gh search issues Sherlock    --owner XRPLF --include-prs --limit 500    # 19
  gh pr list -R XRPLF/rippled --state all --base ripple/attackathon-april-2026   # 16
  106 unique items; bodies, comments and PR review comments read. None concerns the
  ciphertext layout or the Send size.
Zellic scan of mpt-crypto@3baaaac: report not found.
  gh search issues Zellic --owner XRPLF --include-prs   # 1: mpt-crypto#147
  #147 cites DEFI-1108, -1109 and -1110. None concerns the ciphertext layout.
```

</details>

---

*Disclosure: prepared with AI assistance. Every quotation and link above was checked on 2026-10-18 at mpt-crypto `3baaaac` and `1.0.2` (`376691c`; the cited files are unchanged at `main`, `c60a60c`), rippled `develop` `7939339` and XLS-0096 `58ccd30`.*
