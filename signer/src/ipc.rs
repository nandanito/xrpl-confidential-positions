//! Transport: a Unix domain socket, not localhost HTTP.
//!
//! `ARCHITECTURE-2026-08-18.md` §3 item 4 prefers *"OS-mediated IPC or native
//! messaging"* to generic localhost HTTP, and REVIEW-003b says why: an origin
//! allowlist constrains **pages**, not **processes**, and any local process can
//! forge an `Origin` header.
//!
//! # What a UDS buys, exactly
//!
//! * **A browser page cannot connect at all.** No web API opens a Unix socket.
//!   The XSS-to-spend-oracle path that localhost HTTP leaves open is closed by
//!   construction rather than by a header check.
//! * **The kernel supplies the peer's identity**, via `getpeereid(2)`. It is not
//!   a claim in a request, so it cannot be forged.
//! * **Filesystem permissions gate the socket.** `0700` on the directory means
//!   another *user* on the machine cannot reach it.
//!
//! # What it does not buy, which is the part that matters
//!
//! **It does not stop a hostile process running as the same user.** That
//! process passes the peer-UID check because it genuinely is the holder's user.
//! The issue #1 ruling put that adversary *in scope* and the boundary was
//! designed knowing it survives here — which is why the confirmation in the
//! signer's own UI, not this file, is the actual boundary. `CLAIMS.md` P-5.

use crate::grant::ConnectionId;
use std::io;
use std::os::unix::io::AsRawFd;
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};

pub struct PeerCred {
    pub uid: u32,
    pub gid: u32,
}

/// Ask the kernel who is on the other end.
pub fn peer_credentials(stream: &UnixStream) -> io::Result<PeerCred> {
    let mut uid: libc::uid_t = 0;
    let mut gid: libc::gid_t = 0;
    // `getpeereid` is present on macOS and the BSDs. On Linux the equivalent is
    // `SO_PEERCRED`; both are compiled below so the daemon is not silently
    // macOS-only.
    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "freebsd", target_os = "openbsd"))]
    let rc = unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) };

    #[cfg(target_os = "linux")]
    let rc = {
        let mut ucred = libc::ucred { pid: 0, uid: 0, gid: 0 };
        let mut len = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
        let rc = unsafe {
            libc::getsockopt(
                stream.as_raw_fd(),
                libc::SOL_SOCKET,
                libc::SO_PEERCRED,
                &mut ucred as *mut _ as *mut libc::c_void,
                &mut len,
            )
        };
        uid = ucred.uid;
        gid = ucred.gid;
        rc
    };

    if rc != 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(PeerCred { uid, gid })
}

pub struct Listener {
    inner: UnixListener,
    path: PathBuf,
    next_conn: u64,
}

impl Listener {
    /// Bind the socket inside a `0700` directory owned by this user.
    ///
    /// A stale socket from a crashed run is removed first; a *live* one is not,
    /// so two daemons cannot silently race for the same path.
    pub fn bind(path: &Path) -> io::Result<Listener> {
        // `sun_path` is 104 bytes on macOS and 108 on Linux. Without this the
        // failure is a bare `InvalidInput: path must be shorter than SUN_LEN`,
        // which does not tell an operator what to change.
        const SUN_MAX: usize = 100;
        let shown = path.display().to_string();
        if shown.len() > SUN_MAX {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "socket path is {} bytes; the OS limit is about {SUN_MAX}. \
                     Set WCONF_SIGNER_SOCKET to something shorter: {shown}",
                    shown.len()
                ),
            ));
        }
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
            // The 0700 is what stops another *user* reaching the socket, so a
            // failure here is not cosmetic and must not be ignored. It fires
            // when the socket is placed directly in a directory this user does
            // not own — `/tmp` being the obvious one — and the bare
            // `PermissionDenied` says nothing about which path or why.
            set_mode(dir, 0o700).map_err(|e| {
                io::Error::new(
                    e.kind(),
                    format!(
                        "cannot set mode 0700 on {} ({e}). The socket's directory must be one \
                         this user owns, because that mode is what keeps other users off the \
                         socket. Put the socket in its own directory — WCONF_SIGNER_SOCKET=\
                         /tmp/yourdir/signer.sock — rather than directly in a shared one.",
                        dir.display()
                    ),
                )
            })?;
        }
        if path.exists() {
            if UnixStream::connect(path).is_ok() {
                return Err(io::Error::new(
                    io::ErrorKind::AddrInUse,
                    format!("a signer is already listening on {}", path.display()),
                ));
            }
            std::fs::remove_file(path)?;
        }
        let inner = UnixListener::bind(path)?;
        set_mode(path, 0o600)?;
        Ok(Listener { inner, path: path.to_path_buf(), next_conn: 1 })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Accept a connection, refusing any peer that is not this user.
    pub fn accept(&mut self) -> io::Result<(UnixStream, ConnectionId, PeerCred)> {
        loop {
            let (stream, _) = self.inner.accept()?;
            let cred = peer_credentials(&stream)?;
            let me = unsafe { libc::getuid() };
            if cred.uid != me {
                // Should be unreachable given the directory mode; checked
                // anyway, because a permissions bug should fail closed.
                eprintln!("[signer] refused a connection from uid {} (this user is {me})", cred.uid);
                continue;
            }
            let id = ConnectionId(self.next_conn);
            self.next_conn += 1;
            return Ok((stream, id, cred));
        }
    }
}

impl Drop for Listener {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

fn set_mode(p: &Path, mode: u32) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(p, std::fs::Permissions::from_mode(mode))
}

/// Default socket path: under the user's own runtime directory.
pub fn default_socket_path() -> PathBuf {
    let base = std::env::var_os("XDG_RUNTIME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir());
    base.join(format!("wconf-signer-{}", unsafe { libc::getuid() })).join("signer.sock")
}
