//! Short-lived, scoped authority.
//!
//! `ARCHITECTURE-2026-08-18.md` §3 items 2 and 3, which withdrew ADR-0001
//! rev 2's pasted long-lived token:
//!
//! * §3.2 — *"A token authorises a bounded set of operations for a bounded
//!   time, not 'any signature, forever'."*
//! * §3.3 — *"No browser-persisted bearer secret at all."*
//!
//! A grant here is bound to **the connection that requested it**. It is not a
//! bearer credential: presenting the handle on a different connection fails,
//! so a handle that leaks into a log, a crash dump or `localStorage` is not
//! usable by whoever finds it.
//!
//! **What this does not do, stated because the gap is the interesting part.**
//! It does not stop a hostile process on the same machine under the same user.
//! That process can open its own connection and ask for its own grant — and
//! then a human is asked to confirm, in the signer's own UI, a transaction that
//! process did not describe. The confirmation is the boundary; the grant only
//! bounds blast radius. `CLAIMS.md` P-5 forbids calling any of this secure.

use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Upper bound on a grant's life, regardless of what the client asks for.
pub const MAX_TTL: Duration = Duration::from_secs(15 * 60);

/// Identifies the connection a grant is bound to. Not derived from anything the
/// client sends.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ConnectionId(pub u64);

#[derive(Debug, Clone)]
pub struct Grant {
    pub handle: String,
    pub bound_to: ConnectionId,
    pub operations: Vec<String>,
    pub expires_unix: u64,
}

#[derive(Default)]
pub struct GrantStore {
    grants: HashMap<String, Grant>,
}

impl GrantStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn issue(
        &mut self,
        conn: ConnectionId,
        operations: Vec<String>,
        requested_ttl: Duration,
        handle: String,
    ) -> Grant {
        let ttl = requested_ttl.min(MAX_TTL);
        let expires_unix = now_unix() + ttl.as_secs();
        let g = Grant { handle: handle.clone(), bound_to: conn, operations, expires_unix };
        self.grants.insert(handle, g.clone());
        g
    }

    /// Check a handle against the connection presenting it, the operation it is
    /// being used for, and the clock. All three, every time.
    pub fn authorize(
        &mut self,
        handle: &str,
        conn: ConnectionId,
        operation: &str,
    ) -> Result<(), String> {
        self.expire_stale();
        let g = self.grants.get(handle).ok_or("no such grant, or it has expired")?;
        if g.bound_to != conn {
            // Deliberately the same wording as an unknown handle. A caller
            // learning "that handle exists but is not yours" learns something.
            return Err("no such grant, or it has expired".into());
        }
        if now_unix() >= g.expires_unix {
            return Err("no such grant, or it has expired".into());
        }
        if !g.operations.iter().any(|o| o == operation) {
            return Err(format!("this grant does not cover `{operation}`"));
        }
        Ok(())
    }

    /// Drop every grant belonging to a closed connection.
    ///
    /// Authority does not outlive the connection that asked for it, so a
    /// disconnect is a revocation and no client action is needed to get one.
    pub fn drop_connection(&mut self, conn: ConnectionId) {
        self.grants.retain(|_, g| g.bound_to != conn);
    }

    pub fn expire_stale(&mut self) {
        let now = now_unix();
        self.grants.retain(|_, g| now < g.expires_unix);
    }

    pub fn len(&self) -> usize {
        self.grants.len()
    }

    pub fn is_empty(&self) -> bool {
        self.grants.is_empty()
    }
}

pub fn now_unix() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}
