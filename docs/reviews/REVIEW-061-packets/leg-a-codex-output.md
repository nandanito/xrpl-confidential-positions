The diagrams introduce overbroad key claims and misleading transaction paths and colours. The full report, evidence, test results and browser-execution limitations were written to review-work/report.md and printed to stdout.

Full review comments:

- [P1] Scope the two-key requirement to proof-bearing holder operations — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:293-294
  `ConfidentialMPTMergeInbox` needs no ElGamal secret or proof: `facility/src/facility.ts:283–302` builds and signs it directly with the account seed. TASK ZERO §3 likewise identifies it as proof-free, while E-33 establishes the holder-secret requirement specifically for Send and ConvertBack. Both new captions therefore overstate the requirement. Scope them to a holder's Send or ConvertBack rather than every confidential transaction.

- [P1] Preserve the master-key authorisation condition — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:302-302
  When `lsfDisableMaster` is set, the master-derived account key shown by this branch cannot authorise transactions, although the seed still derives the viewing key. E-69 and the capabilities page's existing-seed row explicitly retain this distinction; [CLAUDE.md:204](CLAUDE.md#L204) also requires it. Qualify this label with the condition that the master key still authorises the account.

- [P2] Draw submission from the driver rather than the signer — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:253-254
  At both screenshot widths, this arrow leaves `wconf-signer` and enters Devnet, despite saying “the driver submits”. README's “How it fits together” and B-15 deliberately separate the signer, which returns signed bytes and never submits, from the submitting driver. Show the signed-byte return to the driver and connect the submission edge from the driver to Devnet.

- [P2] Give repayments their return direction — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:214-214
  This down arrow represents both operations as Dedicated Account → supplier. The walkthrough's steps 6–7 explicitly distinguish drawdowns in that direction from repayments running supplier → Dedicated Account. Make the connection bidirectional or draw separately labelled outward and return edges.

- [P2] Connect retirement to the Dedicated Account — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:221-222
  Placed after the supplier group, this arrow depicts suppliers converting their positions back as the facility's retirement. In the executed facility, `retire()` explicitly performs ConvertBack for `this.cfg.dedicated` (`facility/src/facility.ts:509–540`), matching E-146/B-18. Keep the accurate public-per-tranche label, but originate its edge at the Dedicated Account.

- [P2] Colour the proof as public rather than hidden — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:335-335
  The green legend means “hidden from the public”, but this box names the proof, which the public-only approval workflow can read and validators check. `CustodyView.tsx` distinguishes that public proof from the unreadable amount; the diagram's colour reverses that distinction. Make the proof box public or neutral and reserve green for the hidden amount.

- [P2] Distinguish auditor-readable and issuer-readable ciphertexts — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:280-280
  On both position pages, violet means “the issuer can read it”, but this box specifically identifies `AuditorEncryptedBalance`. E-58 uses the auditor key for that ciphertext and the issuer key for the separate issuer mirror. Knowing the same balance through its own mirror does not let the issuer read the auditor ciphertext. Use a distinct auditor-labelled tone or a neutral box.

- [P2] Align the desktop Send edge with the spending balance — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:145-149
  In `desk_how-it-works-00.jpg`, the independently centred Send arrow sits beside A's public balance and B's inbox, well above A's spending balance. It consequently reads as public-balance → inbox, contrary to F-27 and the page's spending-to-inbox explanation. Use explicit grid areas for the connected fields and edge; the phone's linear ordering already preserves the intended source.

- [P2] Select an executed script instead of any common JS reference — $USER_TMP/T/r061a.NchKmT/repo/web/hosted/browser-check.ts:341-344
  A common `modulepreload` also matches this regex, although preloading does not evaluate its code. On a supplied-build copy, adding an unused `/assets/A-unused.js` preload to every page makes this helper select it while exported `runChecks()` still passes. All six injected controls would then remain unexecuted and falsely fail. Select the common module entry script or verify candidate execution. Identical output selection is deterministic; this is not a demonstrated silent-pass defect.

- [P3] Make the off-screen disclosure column discoverable — $USER_TMP/T/r061a.NchKmT/repo/web/app/src/hosted/Diagrams.tsx:182-183
  At 390px, `phone_how-it-works-04.jpg` hides the entire “A Send's amount” column beyond the right edge, without a visible scrolling cue. The diagram appears to end at holder balances, concealing a central disclosure comparison. Add an explicit horizontal-scroll hint or a stacked phone presentation.
