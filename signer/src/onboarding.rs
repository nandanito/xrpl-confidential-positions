//! Onboarding. **Architecture §6 step 6, and the larger half of it.**
//!
//! The cryptography is [`crate::keygen`] — HKDF, one reduction, one scalar
//! multiplication. This module is issue #11: the part that **branches on
//! ledger state**, which is why step 2 had to precede step 6 rather than
//! follow it.
//!
//! # What the ruling requires here, and where each piece is
//!
//! `REVIEW-012-RULING-keygen-2026-08-18.md` §7 condition 2, in its own order:
//!
//! 1. *"State that the master seed becomes a permanent decryption credential
//!    for all confidential history, and that this cannot be undone or
//!    rotated."* — [`PERMANENT_DECRYPTION_CREDENTIAL`], emitted on every
//!    enrolment, before the seed is asked for.
//! 2. *"Detect and warn when the target account has `lsfDisableMaster` set or a
//!    regular key or signer list configured."* — [`Assessment::of`], from
//!    [`crate::ledger::AccountSecurity`], which step 2 reads.
//! 3. *"Offer, for those accounts, an explicitly configured standalone ElGamal
//!    seed with its own backup, and say plainly that it is a second thing to
//!    lose."* — [`KeySource::Standalone`], which becomes the **recommended**
//!    source for exactly those accounts.
//!
//! And §7 condition 1's coding-session half — the derivation is only
//! *recoverable* if a holder who has the seed and not this binary can
//! reproduce it — is [`THIRD_PARTY_WALLET_NOTICE`] plus [`Outcome::Recovered`],
//! which is the benefit executed rather than described: derive from the seed,
//! compare against the key already registered on the ledger, and say whether
//! they match.
//!
//! # ⚠ Why the warning is not cosmetic
//!
//! §(e)'s central defence is *"seed compromise already means total loss of
//! spending authority, so the marginal harm is retroactive confidentiality."*
//! **That premise is false for an account whose master key has been retired.**
//! For those holders the master seed may be a decommissioned credential kept
//! only in cold backup — and this construction makes it decrypt everything,
//! permanently. The marginal-harm argument fails **exactly for the holders who
//! took the most care**, and a holder never learns that a seed backup has been
//! copied.
//!
//! # What this module does not do
//!
//! It does not submit anything, and it does not write a file. The registering
//! transaction is a `ConfidentialMPTConvert` built by [`crate::session`] and
//! submitted by whoever receives the blob. Nor does it persist a secret:
//! printing what to put in a profile, and having an operator put it there, is
//! visibly an operator's act. The ruling's §4 forbids writing a plaintext seed
//! or `sk_A` to non-volatile storage, and a tool that did it silently would be
//! the worst of both.

use crate::keygen::{self, DerivedKey};
use crate::ledger::{AccountSecurity, MpTokenState};
use crate::prover;
use zeroize::Zeroizing;

// ---------------------------------------------------------------------------
// The disclosures. Their wording is asserted by tests
// ---------------------------------------------------------------------------
//
// ⚠ These are `const` and their text is pinned in `tests/onboarding.rs`, the
// same way `ledger::REMOTE_SOURCE_DISCLOSURE`'s is. A disclosure that a later
// edit can quietly soften is not a disclosure. `CLAIMS.md` P-4, P-9, P-10 and
// P-11 govern every sentence below and win if any of them drifts.

/// Condition 2's first bullet. **Emitted before the seed is asked for**, on
/// every enrolment, whichever key source is chosen — because a holder choosing
/// the standalone source is choosing it *against* this.
pub const PERMANENT_DECRYPTION_CREDENTIAL: &str = "\
⚠ WHAT DERIVING FROM YOUR MASTER SEED COSTS

  If you choose the derived key source, your XRPL master seed becomes a
  PERMANENT DECRYPTION CREDENTIAL for every confidential amount this account
  ever holds, sends or receives.

  - Anyone who obtains that seed can decrypt your ENTIRE confidential history,
    retroactively, for as long as the account exists.
  - This CANNOT BE UNDONE and the key CANNOT BE ROTATED. The protocol has no
    rotation and no recovery. There is no second chance.
  - You will not know when a seed backup has been copied. You do know when a
    key is lost. Those two risks are not observed the same way.

  What you get in exchange, and it is the only thing you get: the ElGamal key
  is recoverable from a backup you already keep.";

/// Condition 2's second bullet, for an account where the master key is not the
/// spending authority.
pub const RETIRED_MASTER_KEY_WARNING: &str = "\
⛔ THIS ACCOUNT'S MASTER KEY HAS BEEN RETIRED, AND THE ARGUMENT FOR DERIVING
   FROM IT DOES NOT HOLD HERE

  The ledger says this account is configured so that the master seed is NOT its
  spending authority. You were given every reason to believe that seed was
  decommissioned.

  Deriving the ElGamal key from it would make the retired credential decrypt
  everything, permanently. The usual defence — \"the seed already spends, so
  confidentiality is the only marginal loss\" — is FALSE for this account. Here
  the confidentiality loss is the WHOLE loss.

  The recommended source for this account is a standalone ElGamal secret.";

/// Condition 2's third bullet, stated with the cost the ruling insists on.
pub const STANDALONE_SEED_OFFER: &str = "\
THE OTHER KEY SOURCE: A STANDALONE ELGAMAL SECRET

  An independent secret, unrelated to your XRPL seed, generated here and backed
  up by you.

  ⚠ Say the cost out loud: IT IS A SECOND THING TO LOSE. It is not derived from
  anything you already keep, so if you lose it, the confidential balance is
  gone — permanently, with no rotation and no recovery — even though the XRPL
  account itself is fine.

  Choose it when your master seed is retired, or when you would rather hold two
  secrets than make one secret decrypt everything.";

/// Condition 1's coding-session half. The sentence a holder must see, because
/// a derivation that lives only in one binary is not a recovery mechanism.
///
/// ⚠ **Conditional, and it was not.** This is shown by [`Assessment::required_disclosures`]
/// **before** the key source is chosen, so a holder on their way to the standalone
/// source read *"your confidential balance access **is** deterministically derived
/// from your XRPL seed"* — a sentence that is false for the choice they were about
/// to make, on the one screen where they were forming the belief. [`PERMANENT_DECRYPTION_CREDENTIAL`]
/// was written conditionally for exactly this reason and this constant was not;
/// the two sit eight lines apart. `CLAIMS.md` E-159.
pub const THIRD_PARTY_WALLET_NOTICE: &str = "\
⚠ THIRD-PARTY WALLETS WILL NOT RECOVER THIS

  If you choose the derived key source, your confidential balance access is
  deterministically derived from your XRPL seed under the W-CONF derivation.
  Restoring that seed in third-party wallets that do not implement it will
  restore your public account but NOT your confidential balance.

  The derivation is specified in full in
  docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md section 2, in enough
  detail to reimplement from the prose alone. It is NOT a published standard.
  If you cannot reach that document, you cannot recover the key from the seed.

  If you choose the standalone key source instead, no wallet recovers it,
  including this one: nothing derives that secret and nothing reconstructs it.";

/// The other irreversibility, which issue #11 raises and which is not part of
/// the keygen ruling: the registering transaction itself.
pub const REGISTRATION_IS_IRREVERSIBLE: &str = "\
⚠ REGISTRATION HAPPENS ONCE AND CANNOT BE REPEATED

  The key you choose here is registered by your first ConfidentialMPTConvert,
  and that transaction is irreversible in three ways at once:

  - It registers an encryption key that can never be changed. A second attempt
    is answered tecDUPLICATE.
  - It blocks deletion of the MPToken object and locks its reserve while the
    issuance's confidential outstanding total is non-zero. XLS-0096 says this
    is permanent; rippled permits deletion once that total reaches zero.
  - It publishes the converted amount IN PLAINTEXT. That one moment is public
    by design.

  There is no second pass. The choice below has to be right the first time.";

/// What the **daemon** says at start about a derived key source.
///
/// ⚠ **These live here, as constants with an asserted wording, for a reason.**
/// They were inline `eprintln!` lines in `main.rs`, which nothing checked — and
/// `REVIEW-020` round two found a category error in them: *"neither key can be
/// ROTATED: XLS-0096 has no rotation and no recovery"*. XLS-0096 governs the
/// ElGamal key and says nothing about XRPL account keys, and an account's
/// spending authority very much can be moved — with `SetRegularKey` or a signer
/// list, which is the exact case [`RETIRED_MASTER_KEY_WARNING`] exists for. The
/// banner contradicted this signer's own condition-2 handling one screen away.
///
/// Every other disclosure in this project is a constant with a wording test.
/// These are now too.
pub const DERIVED_SOURCE_BANNER: &str = "\
⚠ The ElGamal key is DERIVED FROM THE MASTER SEED, per REVIEW-012c.

  That seed decrypts this account's entire confidential history, permanently.

  The ELGAMAL key cannot be rotated: XLS-0096 has no rotation and no recovery,
  at any level. It can be RECONSTRUCTED from this seed under the W-CONF
  derivation — the only thing deriving buys — and only where that derivation is
  reachable (issue #10).

  The MASTER SEED is fixed: this AccountID is derived from it. What an XRPL
  account CAN move is its spending authority, with a regular key or a signer
  list — and that is exactly the case this signer warns about below, because the
  seed still derives the decryption key.";

/// The derived source's extra line when the seed is sitting in the profile file.
pub const DERIVED_SEED_ON_DISK: &str = "\
⚠ And the seed is in the profile file, in plaintext. The keygen ruling's
  section 4 forbids that for anything real. Set \"account_seed\": \"prompt\" and
  this daemon asks for it here instead, holding no secret on disk.";

/// The derived source's extra line when it does not.
/// ⚠ **It says the PROFILE carries no secret, not that no secret is on disk.**
/// The stronger sentence was the first draft and `claims-check` caught it: this
/// program writes none, and nothing here pins the pages against swap — `mlock`
/// is not implemented and is a named gap. `CLAIMS.md` P-5.
pub const DERIVED_SEED_PROMPTED: &str = "\
✓ The seed was typed into this window, and the profile carries no secret: it
  holds none and the key is derived from what you typed.
  ⚠ This program writes no secret to disk. It does not pin memory against swap —
    mlock is not implemented — so the OS may still page it out.";

/// What the daemon says at start about a standalone key source.
pub const STANDALONE_SOURCE_BANNER: &str = "\
⚠ The ElGamal key is STANDALONE — an independent secret with its own backup,
  and a second thing to lose.

  NOTHING reconstructs it. It is not derived from anything, so a lost copy is a
  lost balance. It is in the profile file in plaintext, which the keygen
  ruling's section 4 forbids for anything real.";

/// What the daemon says when a **derived** key is in use on an account whose
/// master key has been retired — condition 2's case, live rather than
/// hypothetical.
pub const DERIVED_ON_RETIRED_MASTER: &str = "\
⛔ AND THIS SIGNER DERIVED ITS ELGAMAL KEY FROM THAT SEED.

  A credential the holder was told they could retire is now a permanent
  decryption key for every confidential amount this account holds —
  retroactively, with no rotation and no recovery. The keygen ruling's
  condition 2 recommends a standalone ElGamal secret for exactly this account.
  `cargo run --bin onboard` is where that choice is made.";

/// And when a standalone key is in use on such an account, which is the
/// recommended arrangement.
pub const STANDALONE_ON_RETIRED_MASTER: &str = "\
This signer's ElGamal key is STANDALONE, so the retired seed does not decrypt
anything. That is the recommended source for this account — and it is a second
thing to lose.";

/// What the system does not hide, restated here because an onboarding screen
/// is exactly where a holder forms the belief that it does.
pub const WHAT_IS_NOT_HIDDEN: &str = "\
⚠ WHAT THIS SYSTEM DOES NOT HIDE

  It hides the amount of a confidential TRANSFER, and your balance.
  It hides nothing else — and that is narrower than it sounds:

  - CONVERTING IN OR OUT PUBLISHES THE AMOUNT, in plaintext, every time.
    A Send or a MergeInbox publishes no amount. So the figure you move into
    confidential form and every figure you take back out are public forever.
  - A balance that has never been used is publicly recognisable as EXACTLY
    ZERO. A balance you have spent down to zero is not.
  - Who you are, who you transact with, when, and how often are all public.
  - The issuer can decrypt every one of your balances, always, by construction.
    No configuration removes that. An auditor key, if the issuance carries one,
    is a second party with the same power.
  - Devnet only. Throwaway keys. Nothing here is secure, audited, non-custodial
    or production-ready, and nothing should ever hold value.";

/// Does this command-line argument decode as an XRPL family seed?
///
/// ⚠ **A seed must never reach this process through argv.** Command lines are
/// visible to every process on the machine — which the issue #1 threat model
/// puts in scope — and a pasted seed lands in the shell's history file, where it
/// outlives the session. Under the ruled derivation that seed is a **permanent
/// decryption credential** for every confidential amount the account will ever
/// hold, so the exposure does not expire either.
///
/// Decoded rather than guessed at by shape: this calls the same decoder the
/// derivation calls, so it catches exactly what would have worked and nothing
/// else. A heuristic on the leading `s` and a length would refuse an endpoint
/// like `s3.example.com/rpc` and accept a malformed seed.
///
/// Lives here rather than in `bin/onboard.rs` so that it is testable — a
/// refusal in a binary's `main` is a claim with no falsifier.
pub fn looks_like_a_family_seed(arg: &str) -> bool {
    crate::xrpl::decode_family_seed(arg).is_ok()
}

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

/// Where the holder's ElGamal secret comes from. **Two paths, two backup
/// stories, two onboarding flows** — issue #11's correction to a one-line step.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeySource {
    /// The ruled derivation: `sk_A` from this account's master family seed.
    /// One secret to keep. Recoverable from a backup the holder already has,
    /// **provided** the derivation is reachable (condition 1).
    DerivedFromMasterSeed,
    /// An independent ElGamal secret with its own backup. Two secrets to keep.
    /// The honest option when the master seed has been retired.
    Standalone,
}

impl KeySource {
    /// The token an operator writes into the holder profile.
    pub fn as_str(&self) -> &'static str {
        match self {
            KeySource::DerivedFromMasterSeed => "derived-from-master-seed",
            KeySource::Standalone => "standalone",
        }
    }

    pub fn parse(s: &str) -> Option<KeySource> {
        match s {
            "derived-from-master-seed" => Some(KeySource::DerivedFromMasterSeed),
            "standalone" => Some(KeySource::Standalone),
            _ => None,
        }
    }
}

/// What the ledger says about this account, turned into what onboarding owes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Assessment {
    /// Every condition of issue #11's three that holds, named individually.
    pub retired_master_conditions: Vec<&'static str>,
    /// True when a `HolderEncryptionKey` is already on the ledger. Enrolment is
    /// over for this account; what remains is recovery.
    pub already_registered: bool,
    /// The key already registered, when there is one.
    pub registered_key: Option<[u8; 33]>,
}

impl Assessment {
    pub fn of(security: &AccountSecurity, mptoken: &MpTokenState) -> Assessment {
        Assessment {
            retired_master_conditions: security.conditions(),
            already_registered: mptoken.holder_encryption_key.is_some(),
            registered_key: mptoken.holder_encryption_key,
        }
    }

    /// Condition 2's trigger. True when the master seed is **not** this
    /// account's spending authority.
    pub fn master_seed_is_retired(&self) -> bool {
        !self.retired_master_conditions.is_empty()
    }

    /// Which source this account should use.
    ///
    /// ⚠ **A recommendation, not a refusal.** The ruling says *warn* and
    /// *offer*; it does not say refuse, and inventing a refusal would be
    /// inventing a rule. [`run`] makes the derived path cost a second typed
    /// acknowledgement for these accounts instead.
    pub fn recommended_source(&self) -> KeySource {
        if self.master_seed_is_retired() {
            KeySource::Standalone
        } else {
            KeySource::DerivedFromMasterSeed
        }
    }

    /// Every disclosure this account's enrolment must show, in the order it
    /// must show them.
    ///
    /// The list is a value rather than a sequence of `print` calls so a test
    /// can assert **the set**, not just that some text appeared.
    pub fn required_disclosures(&self) -> Vec<&'static str> {
        let mut v = vec![WHAT_IS_NOT_HIDDEN, REGISTRATION_IS_IRREVERSIBLE];
        v.push(PERMANENT_DECRYPTION_CREDENTIAL);
        v.push(THIRD_PARTY_WALLET_NOTICE);
        v.push(STANDALONE_SEED_OFFER);
        if self.master_seed_is_retired() {
            v.push(RETIRED_MASTER_KEY_WARNING);
        }
        v
    }
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

/// Where onboarding asks and answers.
///
/// A trait so a test can drive it, **not** so it can be delegated over IPC —
/// the same rule [`crate::confirm::Confirmer`] carries, and for the same
/// reason. Ruling §5 item 3: *"Seed entry happens only in the signer's own
/// local UI, never through the browser client and never over IPC."* The only
/// implementation wired into a binary is [`TerminalIo`], which reads this
/// process's own stdin.
pub trait OnboardingIo {
    /// Show text to the holder.
    fn tell(&mut self, text: &str);
    /// Ask a non-secret question. `None` means the input ended.
    fn ask(&mut self, prompt: &str) -> Option<String>;
    /// Ask for a family seed. Separated from [`Self::ask`] so that an
    /// implementation can suppress echo, and so a transcript test can prove the
    /// answer never comes back out through [`Self::tell`].
    ///
    /// ⚠ **`Zeroizing<String>`, and the return TYPE is the point — `CLAIMS.md`
    /// B-23.** This is where a prompted master seed enters the process, so an
    /// implementation that hands back a bare `String` leaves the holder's typed
    /// seed in a heap buffer nothing wipes. Putting it in the signature makes
    /// every implementor, including the test doubles, produce a wiping buffer.
    ///
    /// ⚠ **Unlike a `Zeroizing` wrapped around a local, this one HAS a
    /// compile-time falsifier**: reverting it to `Option<String>` breaks every
    /// implementation and every call site. That difference is E-179's, and it is
    /// why the gate treats the two kinds of site differently.
    fn ask_secret(&mut self, prompt: &str) -> Option<Zeroizing<String>>;
}

/// How onboarding ended.
#[derive(Debug)]
pub enum Outcome {
    /// A key source was chosen, the disclosures were acknowledged, and this is
    /// the public key to register.
    Chosen {
        source: KeySource,
        public_key: [u8; 33],
        /// The standalone secret, present **only** for
        /// [`KeySource::Standalone`], because there is nothing to derive it
        /// from and the holder must back it up.
        standalone_secret: Option<[u8; 32]>,
    },
    /// This account already has a registered key, and the seed the holder
    /// supplied derives it. **§(e)'s promised benefit, executed.**
    Recovered { public_key: [u8; 33] },
    /// A key is registered and the supplied seed does **not** derive it. Either
    /// the wrong seed, or this holder's key was never the derived one.
    RecoveryMismatch { registered: [u8; 33], derived: [u8; 33] },
    /// The holder declined, or input ended, at a named point.
    Declined(String),
    /// Onboarding refused to continue.
    Refused(String),
}

/// Capacity reserved for a prompted seed line, so `read_line` does not grow —
/// and therefore does not free an unwiped buffer — for any realistic input.
///
/// An XRPL family seed is 29–31 characters. This is two orders of magnitude
/// above that, which makes reallocation reachable only by a deliberately long
/// paste. ⚠ **A bound, not a guarantee.** `CLAIMS.md` B-23, P-5.
const SEED_LINE_RESERVE: usize = 4096;

/// The acknowledgement phrase for the derived source.
pub fn derived_phrase(address: &str) -> String {
    format!("{address} MASTER SEED DECRYPTS FOREVER")
}

/// The acknowledgement phrase for the standalone source.
pub fn standalone_phrase(address: &str) -> String {
    format!("{address} A SECOND SECRET TO LOSE")
}

/// The **extra** phrase required to derive from a retired master seed.
///
/// Condition 2 says warn and offer, not refuse. This is what "warn" means when
/// the recommendation is being overridden: a second typed sentence that states
/// the specific thing being overridden, rather than a second Y/N.
pub fn retired_override_phrase(address: &str) -> String {
    format!("{address} RETIRED SEED STILL DECRYPTS")
}

/// Run onboarding for one account.
///
/// `address` and `account_id` are the account being enrolled, read from the
/// ledger by the caller. `assessment` is what that read said.
pub fn run(
    io: &mut dyn OnboardingIo,
    address: &str,
    account_id: &[u8; 20],
    assessment: &Assessment,
) -> Outcome {
    io.tell(&banner(address, assessment));

    if assessment.already_registered {
        return recover(io, address, account_id, assessment);
    }

    for d in assessment.required_disclosures() {
        io.tell(d);
    }

    io.tell(&format!(
        "\nRECOMMENDED FOR THIS ACCOUNT: {}\n{}",
        assessment.recommended_source().as_str(),
        if assessment.master_seed_is_retired() {
            "  Because the ledger says this account's master key has been retired."
        } else {
            "  Because it is one secret rather than two, and it is recoverable from a\n  \
             backup you already keep."
        }
    ));

    let answer = match io.ask(
        "\nWhich key source? Type `derived-from-master-seed` or `standalone`\n> ",
    ) {
        Some(a) => a.trim().to_string(),
        None => return Outcome::Declined("input ended at the key-source question".into()),
    };
    let source = match KeySource::parse(&answer) {
        Some(s) => s,
        None => {
            return Outcome::Declined(format!(
                "`{answer}` is not a key source. Nothing was derived and nothing was chosen"
            ))
        }
    };

    match source {
        KeySource::DerivedFromMasterSeed => derived(io, address, account_id, assessment),
        KeySource::Standalone => standalone(io, address),
    }
}

fn banner(address: &str, a: &Assessment) -> String {
    let mut s = String::new();
    s.push_str("\n  ┌────────────────────────────────────────────────────────────┐\n");
    s.push_str("  │  W-CONF ONBOARDING — choose an ElGamal key source          │\n");
    s.push_str("  │  Devnet only. This is a research artifact, not a wallet.   │\n");
    s.push_str("  └────────────────────────────────────────────────────────────┘\n\n");
    s.push_str(&format!("    account            {address}\n"));
    s.push_str(&format!(
        "    encryption key     {}\n",
        if a.already_registered {
            "ALREADY REGISTERED on the ledger — it can never be changed"
        } else {
            "not registered — the next Convert registers whatever is chosen here"
        }
    ));
    s.push_str(&format!(
        "    master key         {}\n",
        if a.master_seed_is_retired() {
            format!("RETIRED — {}", a.retired_master_conditions.join(", "))
        } else {
            "this account's spending authority".to_string()
        }
    ));
    s.push_str(
        "\n  Everything above was read from the ledger by this process. It was not\n  \
         supplied by a client.\n",
    );
    s
}

/// The already-registered path: **recovery**, which is the benefit condition 1
/// exists to protect.
fn recover(
    io: &mut dyn OnboardingIo,
    address: &str,
    account_id: &[u8; 20],
    assessment: &Assessment,
) -> Outcome {
    let registered = match assessment.registered_key {
        Some(k) => k,
        None => {
            return Outcome::Refused(
                "the assessment says a key is registered but carries none".into(),
            )
        }
    };

    io.tell(
        "\nThis account already has an encryption key on the ledger, so there is nothing\n\
         to choose: XLS-0096 §7.2 answers a second registration with tecDUPLICATE.\n\n\
         What can still be done is RECOVERY — derive the key from the master seed and\n\
         check whether it is the one the ledger holds. That is the only benefit the\n\
         derivation buys, so it is worth executing rather than describing.\n",
    );
    io.tell(THIRD_PARTY_WALLET_NOTICE);

    // ⚠ **Both buffers wipe: the line as typed AND the trimmed copy.**
    // `s.trim().to_string()` allocated a second buffer and dropped the first
    // unwiped — `CLAIMS.md` B-23, and the same shape as the site in
    // `holder.rs`. ⚠ **This site is NOT in `REVIEW-029c`'s list**: that list
    // named `holder.rs` by line, and the idiom has three copies. **E-168's rule,
    // landing again — a leg's list is line numbers, an idiom is a string, and
    // strings have copies.**
    //
    // ⚠ **What the wiping is: `ask_secret`'s RETURN TYPE.** The explicit
    // `drop` below is a WINDOW reduction and nothing else — unlike the block
    // in `holder.rs`, this binding is at FUNCTION scope, so without it the
    // seed as typed would stay live across the derivation and the `io.tell`
    // calls that follow. **It shortens a lifetime; it does not create the
    // wipe.** `CLAIMS.md` E-192.
    let typed = match io.ask_secret(
        "\nFamily seed for this account, or an empty line to skip recovery\n> ",
    ) {
        Some(s) if !s.trim().is_empty() => s,
        _ => return Outcome::Declined("recovery skipped; nothing was derived".into()),
    };
    let seed = Zeroizing::new(typed.trim().to_string());
    drop(typed);

    match keygen::derive_from_master_seed(&seed, Some(account_id)) {
        Ok(k) => {
            if k.public() == &registered {
                io.tell(&format!(
                    "\n  ✓ RECOVERED. The key derived from this seed is the key registered on\n    \
                     the ledger for {address}.\n\n    pk_A  {}\n\n  \
                     The seed alone is sufficient to reconstruct this holder's decryption\n  \
                     key — provided the derivation itself is reachable. That proviso is\n  \
                     issue #10 and it is not discharged by this tool.\n",
                    prover::hex(k.public())
                ));
                Outcome::Recovered { public_key: *k.public() }
            } else {
                io.tell(&format!(
                    "\n  ⛔ MISMATCH. This seed does not derive the key registered on the\n     \
                     ledger.\n\n     registered  {}\n     derived     {}\n\n  \
                     Either this is not the account's master seed, or this holder's key was\n  \
                     never the derived one — a standalone ElGamal secret produces exactly\n  \
                     this result, and it is not an error.\n",
                    prover::hex(&registered),
                    prover::hex(k.public())
                ));
                Outcome::RecoveryMismatch { registered, derived: *k.public() }
            }
        }
        Err(e) => Outcome::Refused(e.to_string()),
    }
}

fn derived(
    io: &mut dyn OnboardingIo,
    address: &str,
    account_id: &[u8; 20],
    assessment: &Assessment,
) -> Outcome {
    // The override comes FIRST, before the seed is asked for. A holder who is
    // going to be talked out of this should be talked out of it before they
    // have typed a secret into anything.
    if assessment.master_seed_is_retired() {
        io.tell(RETIRED_MASTER_KEY_WARNING);
        let phrase = retired_override_phrase(address);
        let typed = io.ask(&format!(
            "\nYou are overriding the recommendation for this account. To continue, type\n\
             exactly:\n\n    {phrase}\n\n> "
        ));
        match typed {
            Some(t) if t.trim() == phrase => {}
            _ => {
                return Outcome::Declined(
                    "the retired-master-key override was not acknowledged; nothing was derived"
                        .into(),
                )
            }
        }
    }

    let phrase = derived_phrase(address);
    let typed = io.ask(&format!(
        "\nTo confirm you understand that this seed becomes a permanent decryption\n\
         credential that cannot be rotated, type exactly:\n\n    {phrase}\n\n> "
    ));
    match typed {
        Some(t) if t.trim() == phrase => {}
        _ => {
            return Outcome::Declined(
                "the permanence disclosure was not acknowledged; nothing was derived".into(),
            )
        }
    }

    // ⚠ Both buffers wipe — see the recovery path above, including what the
    // `drop` does and does not buy. `CLAIMS.md` B-23, E-192.
    // Named `typed_seed`, not `typed`: the acknowledgement above already binds
    // `typed`, and a shadow whose two meanings are "a public phrase" and "the
    // master seed" is the kind of thing a reviewer reads past.
    let typed_seed = match io.ask_secret(&format!(
        "\nMaster family seed for {address}. It is read by THIS process, from its own\n\
         terminal — never over the socket, never from a client, never from argv.\n> "
    )) {
        Some(s) if !s.trim().is_empty() => s,
        _ => return Outcome::Declined("no seed was entered".into()),
    };
    let seed = Zeroizing::new(typed_seed.trim().to_string());
    drop(typed_seed);

    let key: DerivedKey = match keygen::derive_from_master_seed(&seed, Some(account_id)) {
        Ok(k) => k,
        Err(e) => return Outcome::Refused(e.to_string()),
    };

    io.tell(&format!(
        "\n  ✓ DERIVED for {address}\n\n    pk_A  {}\n\n  \
         The secret is NOT printed and NOT written anywhere. It is reproducible from\n  \
         the seed you just typed and the derivation in\n  \
         docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md section 2.\n\n\
         Put this in the holder profile — it contains no secret:\n\n\
         \x20   \"elgamal_key_source\": \"{}\",\n\n  \
         The profile still needs `account_seed`. Set it to the literal string\n  \
         \"prompt\" and the daemon will ask for the seed in its own window at start,\n  \
         which is the only arrangement where no secret is on disk at all.\n",
        prover::hex(key.public()),
        KeySource::DerivedFromMasterSeed.as_str(),
    ));

    Outcome::Chosen {
        source: KeySource::DerivedFromMasterSeed,
        public_key: *key.public(),
        standalone_secret: None,
    }
}

fn standalone(io: &mut dyn OnboardingIo, address: &str) -> Outcome {
    io.tell(STANDALONE_SEED_OFFER);
    let phrase = standalone_phrase(address);
    let typed = io.ask(&format!(
        "\nTo confirm you understand this is a second secret with its own backup, and\n\
         that losing it loses the confidential balance permanently, type exactly:\n\n\
         \x20   {phrase}\n\n> "
    ));
    match typed {
        Some(t) if t.trim() == phrase => {}
        _ => {
            return Outcome::Declined(
                "the standalone-backup disclosure was not acknowledged; nothing was generated"
                    .into(),
            )
        }
    }

    // The library's own CSPRNG keypair — which is what this project has been
    // calling a "throwaway key". It is the same thing; what changes at step 6
    // is that it is now a **named** key source with a stated backup story
    // rather than an unlabelled default.
    let kp = match prover::ElGamalKeypair::generate() {
        Ok(k) => k,
        Err(e) => return Outcome::Refused(format!("generating a standalone key: {e}")),
    };
    let pk = *kp.public();
    let sk = *kp.secret();

    // ⚠ **The secret appears EXACTLY ONCE**, and only inside the profile
    // fragment. An earlier draft printed it twice — once on its own line and
    // once here — under a banner reading "this is the only time the secret is
    // shown", and a review leg caught the contradiction. A sentence that is
    // false about the screen it is printed on is the cheapest kind of overclaim
    // to make and the easiest to keep.
    io.tell(&format!(
        "\n  ✓ GENERATED a standalone ElGamal secret for {address}\n\n    \
         pk_A  {}\n\n  \
         ⚠ THIS IS THE ONLY TIME THE SECRET IS SHOWN, and it is shown once, on the\n    \
         `elgamal_sk` line below. Nothing derives it and nothing reconstructs it.\n    \
         Back it up now, separately from your XRPL seed, or the confidential\n    \
         balance is unreachable forever.\n\n\
         Put this in the holder profile:\n\n\
         \x20   \"elgamal_key_source\": \"{}\",\n\
         \x20   \"elgamal_sk\": \"{}\",\n\
         \x20   \"elgamal_pk\": \"{}\",\n\n  \
         ⚠ That writes a plaintext secret to disk, which the keygen ruling's section 4\n    \
         forbids for anything real. It is what this Devnet research artifact does and\n    \
         it is stated rather than hidden. The derived source has no such file.\n",
        prover::hex(&pk),
        KeySource::Standalone.as_str(),
        prover::hex(&sk),
        prover::hex(&pk),
    ));

    Outcome::Chosen {
        source: KeySource::Standalone,
        public_key: pk,
        standalone_secret: Some(sk),
    }
}

// ---------------------------------------------------------------------------
// The terminal implementation
// ---------------------------------------------------------------------------

/// Reads this process's own stdin and writes its own stdout.
///
/// Echo is suppressed for [`OnboardingIo::ask_secret`] when stdin is a
/// terminal. **When it is not** — a pipe, a driver, a test harness — the seed
/// is read plainly and the holder is told so, rather than the tool implying a
/// protection it is not providing.
pub struct TerminalIo;

impl OnboardingIo for TerminalIo {
    fn tell(&mut self, text: &str) {
        use std::io::Write;
        let mut out = std::io::stdout();
        let _ = writeln!(out, "{text}");
        let _ = out.flush();
    }

    fn ask(&mut self, prompt: &str) -> Option<String> {
        use std::io::{BufRead, Write};
        let mut out = std::io::stdout();
        let _ = write!(out, "{prompt}");
        let _ = out.flush();
        let mut line = String::new();
        match std::io::stdin().lock().read_line(&mut line) {
            Ok(0) | Err(_) => None,
            Ok(_) => Some(line),
        }
    }

    fn ask_secret(&mut self, prompt: &str) -> Option<Zeroizing<String>> {
        use std::io::{BufRead, Write};
        let mut out = std::io::stdout();
        let _ = write!(out, "{prompt}");
        let _ = out.flush();

        let guard = EchoOff::engage();
        if guard.is_none() {
            let _ = writeln!(
                out,
                "\n  ⚠ stdin is not a terminal, so what you type WILL be echoed and may be\n  \
                   recorded by whatever is driving this process."
            );
            let _ = write!(out, "> ");
            let _ = out.flush();
        }
        // ⚠⚠ **`String::new()` STARTS AT ZERO CAPACITY AND `read_line` GROWS
        // IT, so the seed was copied through a chain of ever-larger heap
        // buffers and every earlier one was freed UNWIPED.** Wrapping the final
        // buffer in `Zeroizing` would wipe the last link and leave the rest —
        // a `Copy`-shaped mistake (E-178) with a heap allocation in place of an
        // array. **The buffer is reserved up front so the growth never
        // happens**, which is B-22's *build it into the wiping buffer* applied
        // to a `String`. `CLAIMS.md` B-23.
        //
        // ⚠ **The reservation is a BOUND, not a guarantee.** A pasted line
        // longer than this still reallocates. An XRPL family seed is 29–31
        // characters, so the margin is two orders of magnitude — but P-5
        // governs the claim and the residual is named rather than hidden.
        //
        // ⚠⚠ **AND IT IS NOT THE FIRST COPY. `std::io::stdin()` IS A BUFFERED
        // READER, AND ITS INTERNAL BUFFER GETS THE SEED BEFORE THIS `String`
        // DOES.** `Stdin` wraps a `BufReader`; `read_line` goes through
        // `fill_buf`, so the bytes land in **that** heap buffer first and are
        // then copied out into `line`. It is process-global, it is not
        // `Zeroizing`, and it holds the seed until later stdin traffic
        // overwrites it. ⚠ **Nothing in this crate can reach it** — no accessor
        // exists — so it is a residual of the same species as `serde_json`'s
        // scratch and B-21's SHA-512 block buffer.
        //
        // ⚠ **Found by `REVIEW-031a`, and B-23 shipped without naming it while
        // claiming the prompted seed's buffers were covered.** `CLAIMS.md` B-24.
        let mut line = Zeroizing::new(String::with_capacity(SEED_LINE_RESERVE));
        let r = match std::io::stdin().lock().read_line(&mut line) {
            Ok(0) | Err(_) => None,
            Ok(_) => Some(line),
        };
        drop(guard);
        if r.is_some() {
            let _ = writeln!(out);
        }
        r
    }
}

/// Turns terminal echo off for as long as it is alive.
///
/// `None` when stdin is not a terminal, which is the honest answer rather than
/// a silent no-op.
struct EchoOff(libc::termios);

impl EchoOff {
    fn engage() -> Option<EchoOff> {
        // SAFETY: `isatty` takes a file descriptor and returns a flag.
        if unsafe { libc::isatty(libc::STDIN_FILENO) } != 1 {
            return None;
        }
        let mut term: libc::termios = unsafe { std::mem::zeroed() };
        // SAFETY: `term` is a valid, writable `termios`.
        if unsafe { libc::tcgetattr(libc::STDIN_FILENO, &mut term) } != 0 {
            return None;
        }
        let saved = term;
        term.c_lflag &= !libc::ECHO;
        // SAFETY: `term` is a valid `termios` derived from the current one.
        if unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSAFLUSH, &term) } != 0 {
            return None;
        }
        Some(EchoOff(saved))
    }
}

impl Drop for EchoOff {
    fn drop(&mut self) {
        // SAFETY: restoring the settings captured in `engage`.
        unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSAFLUSH, &self.0) };
    }
}
