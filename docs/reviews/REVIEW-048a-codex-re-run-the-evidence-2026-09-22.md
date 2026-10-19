## FINDINGS, most serious first

1. [HIGH] [E-306]($REPO/CLAIMS.md:366) — unsupported — “The Send statement the paper defines, x, still omits `TransactionContextID`.”

   The formal relation `x` omits it, but the paper never equates Remark 6.1’s unqualified word `statement` with exactly `x`. Immediately afterward, it calls `TransactionContextID` a statement element:

   ```text
   $ git ... show 3baaaac:paper/cmpt-compact-sigma.tex | nl -ba | sed -n '844,876p'

   851  \sk_A \| r \| m \| b \| \rho \| \text{statement}
   855  Including the full witness ensures nonces are unique per transaction.
   873  \item The \TransCtx{} for replay protection.
   875  Omitting any statement element from the hash would allow
   876  cross-protocol attacks.
   ```

   What follows: the quoted justification about the witness is false, but the evidence does not establish that the paper’s nonce input necessarily excludes `TransactionContextID`. F-17’s stronger conclusion—“Deriving nonces over the paper’s `statement` omits it”—is at best an ambiguity, not a demonstrated reading. Before filing, narrow this to an ambiguous/incorrect justification unless upstream confirms that `statement` means only formal `x`.

2. [HIGH] [E-299]($REPO/CLAIMS.md:359) — unsupported — “F-12 still hold[s] at upstream HEAD.”

   The source precondition reproduced, but the claimed build failure did not. The row itself admits it was not re-run:

   ```text
   $ git ... show 3baaaac:.github/scripts/build-wasm.sh | nl -ba
   363  emcc "${LINK_FLAGS[@]}" -o "${OUT_DIR}/mpt_crypto.js"
   365  emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -o "${OUT_DIR}/mpt_crypto.mjs"
   374  emcc "${LINK_FLAGS[@]}" -sEXPORT_ES6=1 -sENVIRONMENT=web,worker ...

   $ git ... grep -n -i DEFAULT_TO_CXX 3baaaac
   [no output; exit 1]

   $ command -v emcc
   [no output; exit 1]
   ```

   What follows: E-299 establishes that HEAD retains three plain-`emcc` link commands, no `-sDEFAULT_TO_CXX`, and the 6.0.2 CI pin. It does not establish that HEAD still fails under 6.0.6. E-302 correctly narrows this to “run at `85dbac7` and only read at `1.0.5`”; E-299’s headline should do the same.

3. [HIGH] [E-296]($REPO/CLAIMS.md:356) — overbroad — “F-19 is not new. Trail of Bits’ April 2026 report already raises it.”

   Trail of Bits raises the general optional-context defect, naming different proof implementations:

   ```text
   $ pdftotext -layout -f 56 -l 57 ...securityreview.pdf - | rg -n \
       'Undocumented optional|proof_link|proof_same_plaintext|replay|account|proof_pok'

   Undocumented optional context ID in challenge computation.
   ... build_link_challenge_hash in proof_link.c and
   build_same_plaintext_hash_input in proof_same_plaintext.c ...
   ... should probably not be considered optional.
   ```

   There are no `proof_pok`, registration, account-binding, or replay matches in that item. The row itself concedes: “What F-19 adds to the report is the consequence for this one proof: a registration proof that replays on any account.”

   What follows: the audit is prior art for the defect class, but the cited evidence does not establish identity with F-19’s specific PoK instance and account-replay consequence. “Not new” is broader than the evidence; “an untracked instance/consequence of an audit-observed class” is supported.

4. [MEDIUM] E-296 — wrong — “`git grep -c "if (context_id)"` at `f196bdb` lists `src/proof_pok_sk.c` with 1.”

   The named command produces four files, not that single result:

   ```text
   $ git -C /tmp/wconf/mpt-crypto grep -c 'if (context_id)' f196bdb

   f196bdb:src/bulletproof_aggregated.c:8
   f196bdb:src/proof_link.c:1
   f196bdb:src/proof_pok_sk.c:1
   f196bdb:src/proof_same_plaintext_multi_shared_r.c:1
   ```

   A spelling-expanded search finds still more relevant code that the command misses:

   ```text
   f196bdb:src/proof_same_plaintext.c:107:    if (tx_context_id) {
   ```

   What follows: the PoK count of one is correct, but the recorded output is not. The actual result reinforces that optional contexts were widespread; it does not justify describing this as a one-line command result.

5. [MEDIUM] E-306 — cross-row — “so does its note that the implementation is not affected.”

   E-296 and F-17 themselves record that a NULL caller reintroduces the bug. The exported low-level prover accepts NULL:

   ```text
   $ git ... show 3baaaac:src/proof_compact_standard.c | nl -ba

   126  int secp256k1_compact_standard_prove(
   ...
   133      const unsigned char *context_id)
   135  {
   137    MPT_ARG_CHECK(n > 0);
   ...
   150    MPT_ARG_CHECK(B2 != NULL);
        [no context_id check]

   240      if (context_id)
   242        EVP_DigestUpdate(sh, context_id, ...)
   ```

   The higher-level utility path does reject it:

   ```text
   654  if (!priv || ... || !context_hash ||
   655      !amount_commitment || ...)
   656      return -1;
   ```

   What follows: “the ledger/utility path is not affected” is supported. “The implementation is not affected” is not: the exported low-level implementation retains the vulnerable NULL path.

6. [LOW] E-299 — overbroad — “the only `1000000` in `src` and `include` is still the doc comment that recommends it.”

   The exact-token command reproduces, but the negative falls to punctuation:

   ```text
   $ git ... grep -n 1000000 3baaaac -- src include
   include/secp256k1_mpt.h:74: ... range_high=1000000.

   $ git ... grep -n -i \
       '1[_ ,]?000[_ ,]?000|million|default.*range|range.*default' \
       3baaaac -- src include

   include/bsgs_dlp.h:149: * secp256k1_elgamal_decrypt, which is capped at 1,000,000.
   include/secp256k1_mpt.h:40: ... recommended default range is [0, 1,000,000].
   include/utility/mpt_utility.h:183: ... [0, 1,000,000] ...
   src/elgamal.c:29: ... 0 to 1,000,000.
   ```

   What follows: no caller hard-codes the value, so F-7’s code claim survives. But the new BSGS header now falsely calls it a cap, directly contradicting F-7. The exact-spelling search hid the most relevant occurrence.

## NEGATIVES I TRIED TO FALSIFY, and how

- **E-296, fix review “mentions neither item”:** searched Appendix F for `NULL`, `Appendix D`, `optional`, `pointer`, `header`, `parameter`, and `challenge`. `NULL`, `Appendix D`, and the optional-context issue had zero matches. `documentation` occurred only under TOB-RIPCTX-5; `context` occurred under TOB-RIPCTX-15 and that unrelated documentation quotation. This negative survived.

- **E-296, “only” one context-NULL header sentence:** searched all headers for `NULL`, `optional`, `nullable`, and every `context_id` declaration. `secp256k1_mpt.h:319` was the only header sentence documenting a nullable `context_id`; `bsgs_dlp.h` has unrelated NULL documentation. This negative survived.

- **E-296, unchanged on other branches:** searched every locally available branch tip. All retained the PoK `if (context_id)` path and none added a required/non-NULL check. Main and recent compact-proof branches had two PoK occurrences; older branches had one.

- **E-296, “does NOT affect the ledger”:** searched all PoK and compact-proof callers. The utility wrappers reject NULL before forwarding. That portion survived for the reachable mpt-crypto layer; rippled itself was unavailable.

- **E-297, missing BSGS function at old tags:** searched `bsgs`, `baby-step`, `giant-step`, `decrypt_bsgs`, `discrete log`, and `solve_dlp` at `0.4.0-rc4` and `1.0.4`. The expanded search found the generic recommendation “baby-step giant-step” and the linear solver, but no BSGS declaration, definition, or header. The absence survived.

- **E-297, no BSGS path in this project:** searched `signer/` and `tools/` for the same variants. Results described or called only bounded linear discrete-log code; no BSGS symbol or sublinear implementation appeared. This negative survived.

- **E-299, no C++ link accommodation:** searched the whole build script for `em++`, `CXX`, `libc++`, `libstdc++`, `stdc`, and `DEFAULT_TO_CXX`. `em++` is used only to compile `mpt_utility.cpp`; all three final links remain plain `emcc` with no runtime/default-to-C++ flag. The source-shape negative survived.

- **E-299, only the million default:** falsified semantically by `include/bsgs_dlp.h:149`, quoted above. All extra matches were comments, not callers.

- **E-304, no later paper change:** ran both `git log --all -- paper` and `git log 3baaaac --follow -- paper/cmpt-compact-sigma.tex`. Both end at `9107113` on 2026-05-29. This negative survived.

- **E-304, Trail of Bits never raises the ciphertext-layout discrepancy:** searched the full report for `transmitted once`, `shared C1`, `1177`, `1,177`, `deduplic`, `duplicate`, `redundan`, and ciphertext/pair/66-byte variants. The only related hit says an ElGamal ciphertext is a pair of points in the constant-naming item; no once-on-chain or 1177-byte discrepancy appeared. This negative survived.

- **E-306, April report never covers the nonce-construction issue:** searched `synthetic`, `RFC 6979`, `fresh entropy`, `full witness`, `deterministic`, `HKDF`, `resubmission`, `resequence`, and version-bump variants. All were zero. The nine case-insensitive `nonce` matching lines all belonged to TOB-RIPCTX-16. This negative survived.

- **E-306, paper’s meaning of `statement`:** the falsification search found the HIGH issue above: §6.2 calls `TransactionContextID` a “statement element,” so E-306’s categorical interpretation is not established.

## RE-RAN AND REPRODUCED

- **E-296:** PDF SHA-256 is exactly `ea38f093f477225884f91707ec44a1f74bcc72ef80e795f44cb6d58b4856c70f`. Printed pp. 55–56 contain the optional-context item and Figure B.6; printed p. 60 contains “Incomplete Parameter Documentation” and “whether pointers can be NULL.” Visual rendering agreed with extracted text.

- **E-296:** the report names reviewed version `f196bdb25b39330f905b57e7b69449b2f38b7932`; Git dates it 2026-02-03. Appendix F says March 31–April 2 and “17 issues”; its sole `Appendix B` match is the magic-number sentence.

- **E-296:** `3baaaac` equals both `origin/main` and tag `1.0.5`, dated 2026-08-20. At `3baaaac`, exact grep returns the three compact files plus PoK, all with count 2.

- **E-296:** `git diff --stat 85dbac7 3baaaac -- src/proof_pok_sk.c include/secp256k1_mpt.h src/utility/mpt_utility.cpp` printed nothing, exit 0. The three F-19 files are byte-identical.

- **E-296:** header line 319 is exactly “context_id is an optional 32-byte transaction context (may be NULL).” No matching documentation exists at `f196bdb`. On the main lineage, both `git log -S` searches resolve to `12186cc`, 2026-04-08, PR #18.

- **E-296:** lines 206–208 are the PoK size/domain block; declarations are at 211–224. `mpt_utility.cpp:864–865` rejects a NULL `context_hash`. `REVIEW-005b:305`, `REVIEW-039c:41`, and E-288 contain the quoted references.

- **E-297 — survives:** `fa7647e`, dated 2026-08-17, is the BSGS introduction commit. `git tag --contains fa7647e` prints only `1.0.5`; `merge-base --is-ancestor fa7647e 85dbac7` exits 1. Tags through `1.0.4` lack `include/bsgs_dlp.h`; `1.0.5` contains it.

- **E-297:** declaration is at `bsgs_dlp.h:169–177`, definition at `bsgs_dlp.c:943`, and source inclusion at `CMakeLists.txt:29`. Lines 54, 59–64, and 79–82 reproduce the range defaults, memory figures, and non-constant-time warning.

- **E-297:** case-insensitive `bsgs` at both old tags produces exactly the two documented comments plus `tests/test_mpt_utility.cpp:165`. The two production comments are byte-identical at HEAD. This repository’s scoped search produces only the two F-8 citations in `facility/`.

- **E-299:** both public decrypt APIs still accept caller-supplied `range_low` and `range_high`; the utility forwards them unchanged. No non-test caller inside mpt-crypto hard-codes the default.

- **E-299:** exact `git grep -n 1000000 3baaaac -- src include` produces only `include/secp256k1_mpt.h:74`. The spelling-expanded caveat is Finding 6.

- **E-299:** the cited build-script and CI lines are exact: C++ compilation at 269–272, three plain-`emcc` links at 363/365/374, and the `version: 6.0.2` explanation at workflow lines 40–43.

- **E-304 — reachable mpt-crypto/PDF portion survives:** both PDFs hash to `b672bdf962170b8833a994504905371817f2e61d9624a42a54f5a3e070008993`. Paper history ends at `9107113`, 2026-05-29.

- **E-304:** every cited TeX line reproduced: abstract 98–100, introduction 176–179, “transmitted once on-chain” at 220, and totals at 1017, 1049, and 1633.

- **E-304:** at `1.0.2`, protocol constants are 33/66/33/754 at lines 28–35; compact proof size is 192 at line 313; the identical-C₁ comparison is at 1140–1145. The utility-file diff from `1.0.2` to `1.0.5` is empty.

- **E-304:** replacing the paper’s `33 + n×33` layout with `n×66` adds 99 bytes for `n=4` and 66 for `n=3`, giving 1276 and 1210 exactly. `f196bdb:paper` does not exist. The report’s printed p. 9 names only `ConfidentialMPT_20260201.pdf` and `ConfidentialMPT_20260106.pdf`.

- **E-306:** Remark 6.1 is at lines 844–857 and contains the quoted sentence exactly. Formal `x` at 265–284 omits the context; the challenge at 419–430 includes it; lines 1393–1395 extend the nonce guidance to ConvertBack and Clawback.

- **E-306:** `git diff --stat 85dbac7 3baaaac -- src include` lists only:

   ```text
   include/bsgs_dlp.h | 183 ++++++++++
   src/bsgs_dlp.c     | 1020 ++++++++++++++++++++++++++++++++++++++++++++++++++++
   2 files changed, 1203 insertions(+)
   ```

- **E-306:** nonce derivation is at `proof_compact_standard.c:182–261`; the conditional context update is exactly at line 240. The report has zero matches for `synthetic`, `6979`, or `deterministic nonce`, and exactly nine `nonce` matching lines, all TOB-RIPCTX-16.

- **Other seven rows, claim/evidence comparison:** E-300, E-301, E-302, E-303, E-305, and E-307 contain no additional internal claim/evidence contradiction visible without their external sources. E-298’s three local status rows reproduce at `UPSTREAM-FEEDBACK.md:211–213`, but the owner-message and GitHub-state evidence was unavailable.

## COULD NOT CHECK (no network)

- **E-296:** the May Trail of Bits revision and current remote state beyond the clone’s existing refs.
- **E-297:** npm/Rust exposure of BSGS. Main’s CMake file contains no installation rules, but package/install behavior could not be tested.
- **E-298:** owner-session messages, issue #7’s live state, and `XRPL-Standards#611`.
- **E-299:** crates.io versions, crate hash `2b06f550…d1e78d`, `2f2deb9`, xrpl-rust branch topology, vendored-header comparison, and natives bundle.
- **E-300:** both Conan remotes, conancenter, the actual Conan graph runs, and rippled’s README/init/lockfile.
- **E-301:** npm packages, `f15-raw-window.ts`, package hash, execution results, and xrpl.js `main`.
- **E-302:** owner-session rulings.
- **E-303:** rippled `develop`, public tags, and Devnet; only its Trail of Bits PDF assertions were locally reachable.
- **E-304:** rippled, XLS-0096, `sfields.macro`, GitHub issue searches, the PR opening date, and the May revision.
- **E-305:** Devnet, rippled, npm packages, and the uncommitted reproduction script.
- **E-306:** GitHub issues #36/#45/#92, the RIPCTXR tracker search, Trail of Bits’ live publication listing, and the May revision.
- **E-307:** Devnet, rippled, xrpl-dev-portal, npm packages, and the uncommitted script.
