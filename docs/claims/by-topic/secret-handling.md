# Secret handling

⚠⚠ **GENERATED. DO NOT HAND-EDIT.** Rebuild with `bun run tools/build-claims-topics.ts`;
`make check-claims-topics` fails if this file drifts from `CLAIMS.md`.

Keys, seeds and scalars — what wipes, what does not, and the residuals named rather than closed.

⚠ **A row may appear under several topics, and that is deliberate** — filing each
row under exactly one would hide it from readers of the others. **The row in
[`CLAIMS.md`](../../../CLAIMS.md) is the authority; never cite this file.**

⚠⚠ **THIS INDEXES HEADLINES, NOT ROW BODIES.** A topic is assigned by matching the
row's opening headline. **A point discussed only inside a row's evidence prose is
invisible here** — a reader in `REVIEW-040` put their confidence at ~60% for *"everything
about secrets"* and said they would fall back to grep. **They were right to.** For an
exhaustive sweep, search `CLAIMS.md` directly.

**51 rows.**

| id | section | headline | grade |
|---|---|---|---|
| [E-33](../../../CLAIMS.md#L74) | Established | Generating a ConfidentialMPTSend proof requires the sender's ElGamal secret key sk_A as a witness. | A |
| [E-35](../../../CLAIMS.md#L76) | Established | Compact-form proofs cannot be batch-verified — commitments are reconstructed per-proof from each proof's own challenge, leaving no cross-proof linear… | A |
| [E-36](../../../CLAIMS.md#L77) | Established | XLS-96 deliberately rejected twisted ElGamal. Under compact form its size advantage shrinks from 292 B to an irreducible 64 B — structural, arising… | A |
| [E-41](../../../CLAIMS.md#L87) | Established | Vault, loan-broker and AMM pseudo-accounts are exempt from XLS-80 domain validation for MPTs they hold. Observed custodying 600 units of a… | A |
| [E-42](../../../CLAIMS.md#L88) | Established | Revoking a domain credential traps a vault position rather than recovering it: VaultWithdraw → tecNO_AUTH while the pseudo-account keeps custody.… | A |
| [E-62](../../../CLAIMS.md#L113) | Established | The nonce construction reproduces from its own prose, and draws no entropy through the tree's only entropy route. | A, executed, scoped… |
| [E-69](../../../CLAIMS.md#L120) | Established | An XRPL account's master seed need not be its spending authority, which is the fact that falsifies ADR-0001 §(e)'s central defence. | A, read |
| [E-71](../../../CLAIMS.md#L122) | Established | ripple-keypairs.deriveKeypair(seed) recovers the algorithm from the seed's own encoding — no algorithm option is needed. | A, executed |
| [E-117](../../../CLAIMS.md#L168) | Established | Rejecting the XLS-65 Vault traded away a custody property, and ~~ADR-0002 does not say so~~ ADR-0002 has said so since c34dcec (E-256, E-295). | A, source on both… |
| [E-118](../../../CLAIMS.md#L169) | Established | Architecture §6 step 6 is built: the ElGamal key is DERIVED from the master seed under the ruled construction, and the ledger holds the result. | A, executed |
| [E-119](../../../CLAIMS.md#L170) | Established | ADR-0001 §(e)'s only benefit is now EXECUTED rather than described: the seed alone reproduced the key the ledger holds. | A, executed |
| [E-123](../../../CLAIMS.md#L174) | Established | A profile can now hold NO secret at all, and with the derived key source that is the complete configuration. | A, reasoned |
| [E-167](../../../CLAIMS.md#L227) | Established | THIS ROW'S HEADLINE IS FALSE AND E-171 IS WHY. zeroize WAS NEVER OFF. | A, executed |
| [E-178](../../../CLAIMS.md#L238) | Established | WRAPPING A Copy TYPE IN A ZEROIZING WRAPPER DOES NOT WIPE THE SOURCE, AND ONE LINE OF THIS PROJECT READ AS THOUGH IT DID FOR SEVEN DAYS. | A, executed |
| [E-179](../../../CLAIMS.md#L239) | Established | FOR A Zeroizing WRAPPED AROUND AN EXISTING BINDING, NO COMPILE-TIME FALSIFIER EXISTS — MEASURED, NOT ASSUMED. | A, executed |
| [E-183](../../../CLAIMS.md#L243) | Established | A COPY WAS DELETED RATHER THAN WIPED, AND THAT IS THE STRONGER FIX — B-23's one genuinely new idea. | A, executed |
| [E-186](../../../CLAIMS.md#L246) | Established | String::new() FOLLOWED BY read_line COPIED THE MASTER SEED THROUGH A CHAIN OF EVER-LARGER HEAP BUFFERS AND FREED EVERY EARLIER ONE UNWIPED. | A, executed |
| [E-195](../../../CLAIMS.md#L255) | Established | B-23 REMOVED A DUPLICATE SEED DECODE FROM ONE FILE AND LEFT THE IDENTICAL ONE IN THE FILE ABOVE IT. | A, executed |
| [E-200](../../../CLAIMS.md#L260) | Established | A COMMENT NAMED THE WRONG CRATE, AND A SECRET WENT UNWIPED BECAUSE OF IT. | A, executed |
| [E-218](../../../CLAIMS.md#L278) | Established | A SELF-REVIEW OF THE TWO FILING COMMANDS FOUND FOUR DEFECTS AND REPORTED THEM FIXED; AN INDEPENDENT PASS THEN FOUND SIX MORE — INCLUDING ONE THE… | A, measured |
| [E-257](../../../CLAIMS.md#L317) | Established | make check-zeroize-bounds mutates tracked signer sources for the \~2 minutes it runs, and a git status taken during that window reported M… | A, source |
| [E-266](../../../CLAIMS.md#L326) | Established | The Dedicated Account's seed confers two powers and E-117 names only one. | A, source |
| [E-269](../../../CLAIMS.md#L329) | Established | Two concurrent runs of check-zeroize-bounds corrupt source, and the second is now refused. | A, measured |
| [E-270](../../../CLAIMS.md#L330) | Established | check-zeroize-bounds takes \~2 minutes or \~28 depending only on what ran before it, and nothing said so. | A, measured |
| [E-278](../../../CLAIMS.md#L338) | Established | The custody request overpriced its own recommendation by turning a recommendation into a refusal. | A, source |
| [E-280](../../../CLAIMS.md#L340) | Established | GIT_DIR BEATS cwd, so the revision tool's synthetic probe wrote its configuration into a FOREIGN repository — measured, not theorised. | A, measured |
| [E-281](../../../CLAIMS.md#L341) | Established | The custody request's summary paragraph contradicted the option it had just corrected, two sentences later. | A, source |
| [E-283](../../../CLAIMS.md#L343) | Established | A quorum is not a second holder, and the custody request called it one. | A, source |
| [E-287](../../../CLAIMS.md#L347) | Established | check-zeroize-bounds leaked a temporary directory per run, and 110 of them had accumulated before anyone counted. | A, measured |
| [E-289](../../../CLAIMS.md#L349) | Established | The repository's history carries none of the 19 live Devnet secret values held outside the tree, and it does carry every row the 2026-09-05 ruling… | A on the named… |
| [E-290](../../../CLAIMS.md#L350) | Established | The custody decision request priced the wrong set of credentials, and its first review round of its own withdrew its recommendation. | A, source; the lock… |
| [E-291](../../../CLAIMS.md#L351) | Established | The custody request's reassurance about its own seed was false: the Dedicated Account's seed is in a 0644 file, and the request named a different one. | A, measured |
| [E-292](../../../CLAIMS.md#L352) | Established | Two records in the custody material did not reproduce, and the round's own self leg made the kind of error the round existed to catch. | A, measured |
| [E-293](../../../CLAIMS.md#L353) | Established | The facility now writes its seeds, the issuer's secret and its book as 0600 files, and deletes each signer profile once the signer has read it — and… | A, measured |
| [E-294](../../../CLAIMS.md#L354) | Established | The project owner ruled B-27 and part of B-28 on 2026-09-13, and the custody ruling is built as a disclosure printed on every facility run. | A, recorded and tested |
| [E-295](../../../CLAIMS.md#L355) | Established | Round two on the custody fixes found no further power over the float, and its Codex leg disagreed. | A, source and measured… |
| [E-317](../../../CLAIMS.md#L377) | Established | The phase 1 secret sweep is a gate, make check-no-secrets, and its first run found no stored secret, no credential and no non-public seed in the tree… | A, executed |
| [E-318](../../../CLAIMS.md#L378) | Established | REVIEW-056 round one found 13 defects in make check-no-secrets, and the gate's own controls had caught none of them. | A, executed |
| [E-333](../../../CLAIMS.md#L393) | Established | vite's only root licence file aggregates the licences of everything it bundles and carries 35 personal email addresses, so a verbatim copy cannot… | A, measured |
| [E-341](../../../CLAIMS.md#L401) | Established | The filings were re-surveyed at source on 2026-10-20 before either post is drafted, and two things E-316 did not record were found: the Japanese copy… | A, read at source |
| [B-21](../../../CLAIMS.md#L423) | Pending | ~~Secret material on the stack is not wiped: the SHA-512 expansion, the nonce mask, and fresh_aux's 32-byte buffer.~~ BUILT 2026-08-27. zeroize is a… | CLOSED as a build.… |
| [B-22](../../../CLAIMS.md#L424) | Pending | ~~The KEY-DERIVATION path leaves secret material unwiped, and B-21 deliberately did not cover it. sha512half is used for public transaction digests…~~ | 268 tests at B-22;… |
| [B-23](../../../CLAIMS.md#L425) | Pending | The seed's residue in holder.rs — the second half of B-22's ruled unit, IN SCOPE and NOT deferred. | BUILT AND EXECUTED… |
| [B-24](../../../CLAIMS.md#L426) | Pending | REVIEW-031's fixes — the seed residue B-23 left, and the gate that could not see it. | BUILT 2026-08-28. The… |
| [B-25](../../../CLAIMS.md#L427) | Pending | REVIEW-032's fixes — the derived ElGamal secret, and the pin that did not pin. | BUILT 2026-08-28. The… |
| [B-27](../../../CLAIMS.md#L429) | Pending | RULED 2026-09-13 by the project owner (E-294). | A ruling by the… |
| [B-29](../../../CLAIMS.md#L431) | Pending | BUILT 2026-09-13 (E-293). ~~The facility writes its seeds, the issuer's ElGamal secret and its plaintext book with no file mode, and leaves each…~~ | An explicit 0600 on… |
| [B-20](../../../CLAIMS.md#L434) | Pending | ~~The deterministic signing arm is pub in an ordinary release build, and only a doc comment says it is for vectors.~~ CLOSED 2026-08-27, with the… | CLOSED, with a REAL… |
| [B-19](../../../CLAIMS.md#L435) | Pending | ~~ed25519-dalek is configured default-features = false, features = ["std"], so zeroize is OFF.~~ THAT PREMISE IS FALSE — E-171, 2026-08-27. ["std"]… | CLOSED → docs/decision… |
| [B-7](../../../CLAIMS.md#L449) | Pending | ~~Any statement about what the 192-byte sigma proof proves — including ADR-0001's premise that balance linkage requires the sender's secret key~~ | RESOLVED 2026-08-16 →… |
| [R-8](../../../CLAIMS.md#L517) | Retracted | web/api/capability.ts's wallet row and the wallet page: *"A confidential transaction needs the ElGamal secret and the account key"*, and *"needs two… | Found by REVIEW-061… |
