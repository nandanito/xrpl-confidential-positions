The component arithmetic and core wire-format claim survive verification, and the historical Devnet measurement is honestly dated and disclosed. However, the draft is over the word limit, contains a misleading Trail of Bits revision claim, lacks current verification-path references, and omits the current XLS-0096 confirmation; it is not ready to file. The Zellic PR found by the owner-wide search concerns unrelated API hardening and need not be named in the issue.

Full review comments:

- [P1] Correct the Trail of Bits audit note before filing — $USER_TMP/T/f13r1.v6b2o3/draft.md:50-53
  The linked PDF is a “Comprehensive Report with Fix Review,” and pp. 66–67 mark TOB-RIPCTX-16 resolved. That finding is directly related: it discusses the specification’s shared C1 requirement, although its focus is proof serialization rather than ciphertext-field serialization. Saying it is unrelated and that no later revision was obtained is misleading; replace it with the precise distinction and current fix status. This follows `REVIEW-INSTRUCTIONS.md:78-83`.

- [P2] Scope the totals to the cryptographic payload — $USER_TMP/T/f13r1.v6b2o3/draft.md:6-6
  The arithmetic is correct for encrypted amounts, two commitments, and the 946-byte proof, but calling 1276/1210 the “real sizes” and “wire format” can imply complete serialized transaction sizes. Account, destination, issuance, signatures, field framing, and other transaction metadata are excluded. Current XLS-0096 §17.1 explicitly makes this exclusion. State that these are cryptographic-payload totals to avoid overstating the defect.

- [P2] Add current refs and the rippled verification path — $USER_TMP/T/f13r1.v6b2o3/draft.md:23-23
  The shared-C1 check is on rippled’s Send path: current `develop` calls `verifySendProofs`, which calls `mpt_verify_send_proof`, and `conanfile.py` still requires `mpt-crypto/1.0.2`. The draft only links an older preflight commit and does not record current-HEAD permalinks or hashes, so “unchanged ... today” is not reproducible from the filing. Add the current `develop` path and refs, as required by `PROTOCOL.md:126-133`.

- [P1] Cut the body below the filing word limit — $USER_TMP/T/f13r1.v6b2o3/draft.md:31-33
  Counting the issue body while excluding the fenced table, `<details>` block, block quotes, and disclosure footer gives 334 words, so the draft exceeds the filing gate. Remove the repeated source list and make the historical measurement a brief non-load-bearing note or omit it; the code and specification determine the totals. `PROTOCOL.md:60-74` requires the word limit and one concrete ask.

- [P2] Cite XLS-0096 and narrow the documentation ask — $USER_TMP/T/f13r1.v6b2o3/draft.md:8-8
  The repository and XLS-0096 searches found no indication that shared-C1 serialization is a planned wire change, while current XLS-0096 §17.1 already documents 66-byte ciphertexts and the corrected 1276/1210 payload totals. The actionable defect is therefore paper/spec consistency, not a missing rippled implementation. Cite that section and state that line 8 is one documentation ask with two acceptable resolutions, consistent with `PROTOCOL.md:70-74`.
