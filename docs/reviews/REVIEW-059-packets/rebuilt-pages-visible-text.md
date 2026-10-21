
### Page /

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
What this is
A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.
Start here
Capability matrix: what each kind of key can and cannot do.
Observer view: what anyone can read on the ledger, including which balances are visibly zero.
Issuer view: the issuer’s copy of each balance, without the figure.
Wallet: why the browser wallets examined cannot hold a confidential position.
Custody: where confidentiality and custody approval policies conflict.
To transact, run it yourself
Signing happens only in wconf-signer, a separate program on the holder’s own machine, never in a web page. The README explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.
README, “Run it”
What it never claims
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Each label is a row in the repository’s CLAIMS.md.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /observer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6270649 at 2026-10-20T11:45:28.415Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
Public
The account's address, and every account it has transacted with (P-4).
When each transaction happened, and how often (P-11).
The public MPT balance.
The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.
The holder's encryption key, once registered.
The ConfidentialBalanceVersion, which counts changes to the balance.
Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).
Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).
Hidden
The value of a confidential balance that is not the canonical encryption of zero, even when that value is zero (E-211).
The amount of each ConfidentialMPTSend.
Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.
Observer view: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 750
registered true
ConfidentialBalanceVersion 11
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
021D3288E7E5BF982641DF0ADCDB067DCFDBA95E312F0159A85E2A81B5496999B4029652CF4E578E5E03E539CBBBF04D57F5244A56D7FC1FDF4E8672E76418FDF947Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03B67732AAE2EDB348088A27B147EE3D01387631CDDD357B12C24659F6EB26A04F02EE0D0A18BEED84DA931C481F57A712C8CC0731F822B5013ADE72739A0C3217C4Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 586
registered true
ConfidentialBalanceVersion 5
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
02C8F5B45590A1CF7F9006F974DAA91FFD7C64FAA85FC2964F18F6495E23577313028556C7AA02F610759762A7449B7AF4A4A4EDFA73F8BF96BF93A09DFB09B87EBCNot the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
03C9FC4098EDC4B287A3873E21ABCA828FFE9CF50150DEE079221267F21AD8535D0289A21820DDA63C5FB4BC107A710898DBB7F10E5EEE4B8DBA205D7D8967CD8214Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 30
registered true
ConfidentialBalanceVersion 0
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
031AE5A70B242D81691C1FC43D684FCD908BC7DCCC07CE3ED7DD1096A9575F5D1C03CE6F696A2AACEBEB02E4728249B72E362D2DD76754F084B819A289628691F31CPublicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
inbox
022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F980348759FC36C71AE3F6FE16A6904C23312D36DEFAAE95A9A2C9EE7DA7E6F84D9F2Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
Observer view: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6270649
What a full-ledger observer sees
public MPT balance 0
registered true
ConfidentialBalanceVersion 4
ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)
spending
0382CD36EC99297C61FE6D878C8ED59CFE0C38EEB36A316EB0FE0AC8379FC66A9603A2AA18361F6ACFBE85FDC97EEAC7F6822C5767CB74256564FDA95009C6E11A17Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
inbox
0266912F17A098DC7E54BFEC56277DEA0422888A0212874D411A841E385A1D1D4D0240B6B9DB0AF95113717F95B056815D5B3A1C69FE596518ACB564F0A5E92FECE5Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /issuer

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A holder is never private from the issuer
The protocol keeps a second copy of every confidential balance, the IssuerEncryptedBalance, encrypted to the issuer’s key. The issuer can always decrypt it, and no setting turns this off (CLAIMS.md P-9).
This page shows that each copy is on the ledger. It does not show the decrypted figures: a visitor could not check them, so this project does not publish them (ADR-0004 D-H3).
Where these values come from
read from https://s.devnet.rippletest.net:51234
validated ledger 6270649 at 2026-10-20T11:45:28.415Z
network_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
The issuance
MPTokenIssuanceID 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8
issuer rP9wBAcBUXNDSiUNPgLRv2WWjMn1L8xzRa
IssuerEncryptionKey 029DDE4953B75D741FC54DB86B44DF7E486E5B1BDFBCECD5F671B68E7E1CFD6CB9
Issuer's copy: Holder A — an active position
rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649
IssuerEncryptedBalance 0227B2F019BB9F3887355B85C959B2011DBEF7AC80439E42514390BBB236CF43A80237189EBACB6E36B5C7AE7B8F251B8E97D55D37C3AC01B281F93C84C7395A75D3
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder B — a derived-key account
rDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649
IssuerEncryptedBalance 034958E9C943B437E117E9021E017799168DF9EE45270FE310212BF8F5BA957C10035E00F894315900DBBE99B2BC859F4FB45ECDA17381C0768E4F5C2D435412302D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder C — the ed25519 signing account
rsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbYThe account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649
IssuerEncryptedBalance 022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F9802EDC9E003481C3DB14F60A83767C9B88C53525104C1A408DA61677EFAE4887CD0
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder D — an early spike account
rEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWHAn early test account, kept as a second position to compare against.
read at validated ledger 6270649
IssuerEncryptedBalance 03578671D93AB129EA4196A34214E45B4EA639DB43758C63D2516A457F7735CF5702C2587A7AAD3AFFD05A691C26390E5623C44DAE1E4FCFF5DC3952D5342563C93D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /custody

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
This is a simulation
No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break.
Two findings
1. The derived key does not work with custodial key management
The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published as a standard, and it is not (issue #10).
A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117).
2. Approval policies cannot read a confidential amount
An approval workflow that holds only public data sees a proof, not a value, so a rule like “two approvers above $1M” has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder’s statement of the amount, and the policy rests on the holder’s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed.
Which flows survive, and which break
Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has.
Note 1: Only with a standalone ElGamal key, held outside the custody platform (E-117).
survives: Send a public XRPL payment
breaks: Onboard with the ruled derived key
Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).
survives: Onboard with a standalone ElGamal key (note 1)
survives: Read own confidential balance (note 1)
survives: Send a confidential amount (note 1)
breaks: Send confidentially, under an amount-capped approval policy (note 1)
Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds only public data.
survives: Send confidentially, under a destination-allowlist policy (note 1)
survives: Retire a position in tranches (note 1)
Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /capabilities

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
Capability matrix
What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential balances; the XRPL account key signs. The rows follow the signer’s ownKeySource type, which has two variants, and rows that are not built say so.
key sourcedecrypt own balanceprove + sign confidentialpublic transactionsexists today
| Generated demo seed, faucet-fundedderived-from-master-seed
| yesThe ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.
docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rs
| yesOne seed gives both the ElGamal secret and the XRPL account key.
signer/src/keygen.rs; signer/src/onboarding.rs
| yesAn ordinary XRPL account. Public transactions are unaffected.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Existing Devnet seed, pastedderived-from-master-seed
| yesSame as a generated seed: the derivation does not depend on where the seed came from.
signer/src/keygen.rs
| conditionalOnly if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.
signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2
| yesAn ordinary XRPL account.
signer/src/xrpl.rs
| builtsigner/src/onboarding.rs
| Standalone ElGamal keystandalone
| yesA separate ElGamal secret kept in the profile: two secrets to keep instead of one.
signer/src/onboarding.rs:279; signer/src/holder.rs:48
| conditionalThe ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).
CLAIMS.md E-117; signer/src/holder.rs
| yesUnaffected: the ElGamal key plays no part in public transactions.
signer/src/xrpl.rs
| builtsigner/src/holder.rs — KeySource::Standalone
| Browser wallet extension | noDecrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).
REVIEW-012 (derivation from master seed); ADR-0003 D2
| noA confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).
ADR-0003 D2; signer/src/keygen.rs
| yesOrdinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
| not builtnot built, for the reasons in this row
| Custody platform (simulated)standalone
| conditionalOnly with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.
REVIEW-012; CLAIMS.md E-117
| conditionalThe external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.
docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4
| yesPublic transactions carry plain amounts, so approval policies work as usual.
docs/research/CUSTODY-2026-08-28.md
| not builtSimulation: an external-signer stub. No MPC, no HSM, no integration.
Shown before the seed is asked for
The master seed becomes a permanent decryption credential. Anyone who ever holds it can decrypt every confidential balance this account has held, past and future. XLS-96 has no key rotation and no key recovery (P-10), so this cannot be undone.
The derivation is specified only in this repository and is not a published standard. A holder with their seed but without this repository cannot reconstruct their key. Issue #10 tracks this.
Required by the key-derivation ruling, REVIEW-012 condition 2.
What no key source changes
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt

### Page /wallet

W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.
OverviewCapability matrixObserver viewIssuer viewWalletCustody
A browser wallet cannot hold a confidential position
The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the reasons are structural, not missing features. A wallet that kept the ElGamal key inside the extension and offered a prove-and-sign operation could; none of those examined does.
A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
Under the ruled key generation, the ElGamal secret is derived from the master seed. A derived-key account has no other way to get it.
A wallet extension exists in order not to release seed material. That is the product, not a gap in its API.
So a page cannot assemble the transaction through these wallets. They are not refusing a permission; they hold nothing they are built to give a page.
What a wallet can do
yesOrdinary XRPL transactions
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)
yesProve control of an account
Enough to show that account’s observer view, which anyone with the address can read anyway.
What this page does not claim
Not determined: whether a given wallet build can serialise XLS-0096 transactions. The page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md E-206). This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.
CLAIMS.md E-206.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt
