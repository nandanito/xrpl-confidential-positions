TITLE: XLS-0096 §7.4's MPToken deletion invariant is unconditional, but MPTokenAuthorize enforces it conditionally
REPO: XRPLF/XRPL-Standards

---

§7.4 states the deletion blocker without qualification. rippled 3.3.0 has two code paths that delete an `MPToken` and they enforce it differently: one matches the spec, the other permits deletion when the issuance's `sfConfidentialOutstandingAmount` is zero. I do not think this is a supply-accounting bug, but the spec and the implementation say different things and a client cannot rely on the spec's wording as written.

### What §7.4 says

> **Deletion Blocker:** A holder's `MPToken` cannot be deleted from the ledger once confidential fields have been initialized, even if `sfConfidentialBalanceSpending`, `sfConfidentialBalanceInbox`, and `sfIssuerEncryptedBalance` all contain the canonical encrypted zero (i.e., the holder's confidential balance is zero).

No condition. Once initialised, never deletable.

### The path that matches

`src/libxrpl/ledger/helpers/MPTokenHelpers.cpp:300-307`, in `removeEmptyHolding`, blocks unconditionally on the presence of any of the four confidential fields:

```cpp
// Don't delete if the token still has confidential balances
if (mptoken->isFieldPresent(sfConfidentialBalanceInbox) ||
    mptoken->isFieldPresent(sfConfidentialBalanceSpending) ||
    mptoken->isFieldPresent(sfIssuerEncryptedBalance) ||
    mptoken->isFieldPresent(sfAuditorEncryptedBalance))
{
    return tecHAS_OBLIGATIONS;
}
```

### The path that does not

`src/libxrpl/tx/transactors/token/MPTokenAuthorize.cpp:86-103`, on the holder's own `tfMPTUnauthorize` delete, gates on an issuance-level total first:

```cpp
if (ctx.view.rules().enabled(featureConfidentialTransfer))
{
    auto const sleMptIssuance =
        ctx.view.read(keylet::mptokenIssuance(ctx.tx[sfMPTokenIssuanceID]));

    // if there still existing encrypted balances of MPT in
    // circulation
    if (sleMptIssuance &&
        (*sleMptIssuance)[~sfConfidentialOutstandingAmount].value_or(0) != 0)
    {
        // this MPT still has encrypted balance, since we don't know
        // if it's non-zero or not, we won't allow deletion of
        // MPToken
        if (sleMpt->isFieldPresent(sfConfidentialBalanceInbox) ||
            sleMpt->isFieldPresent(sfConfidentialBalanceSpending))
            return tecHAS_OBLIGATIONS;
    }
}
```

When issuance-wide `sfConfidentialOutstandingAmount` is 0, the inner check is never reached and the `MPToken` is deletable even though its confidential fields are present. This path also examines only two of the four fields.

The reasoning behind it looks sound to me: if the issuance-wide confidential total is zero then every holder's confidential balance is provably zero, so deleting the holding cannot unbalance supply accounting. That is a *narrower* invariant than §7.4 states, and a deliberate-looking one.

### Why it matters to a client

Two things follow that a client author would get wrong from the spec alone.

**The reserve is not permanently locked.** §7.4's wording tells an integrator that opting into confidential balances costs a reserve that can never be reclaimed, which is a significant thing to put in front of a user at onboarding. On the `MPTokenAuthorize` path that is not true — the reserve becomes reclaimable once issuance-wide confidential outstanding reaches zero. Whether a given holder ever sees that condition is outside their control, which makes it awkward to describe either way, but "never" is the wrong word.

**Deleting the holding discards the registered `sfHolderEncryptionKey` along with it.** I want to be careful here: XLS-0096 provides no key rotation and no key recovery, and I am not claiming otherwise. But a subsequent `ConfidentialMPTConvert` against a fresh `MPToken` would register a key as a first-time registration, since §7.3.2's `tecDUPLICATE` condition tests for a key already registered on the object that no longer exists. Whether that sequence is intended, and whether it interacts with anything that assumes a holder's key is stable for the life of the issuance, is a question for the authors rather than a claim from me.

### Related, in the documentation

`docs/references/protocol/ledger-data/ledger-entry-types/mptoken.md:11` on xrpl.org currently says, with no exception noted:

> You can create or delete an empty `MPToken` entry by sending an [MPTokenAuthorize transaction][].

Under either reading of the invariant that is incomplete for a confidential `MPToken`. I am happy to raise that separately on `xrpl-dev-portal` once it is settled here which behaviour is the intended one — it seemed wrong to file a documentation fix before knowing what the documentation should say.

---

*Disclosure: this report was prepared with AI assistance. All citations were verified against rippled tag 3.3.0 and XRPL-Standards `master` on 2026-08-26. This one is a source reading — unlike some of my other reports I have **not** executed the deletion sequence on Devnet, and I would not want the §7.4 divergence treated as demonstrated until someone has. I could not find a stated policy on AI-assisted contributions, so I am disclosing it by default.*
