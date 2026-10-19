# REVIEW-057 round three — self notes, written BEFORE the leg ran

Subject frozen at a36f165.

U1. Step 7 does not re-run the inventory on the export. Each review round adds a
    transcript that may print third-party source, as round two's did with
    @noble/curves, and `make inventory-third-party` is not in `make ci` because it
    needs network. A NOTICE that was complete at a36f165 can be incomplete on
    publication day with nothing failing.
U2. The NOTICE manifest check locates an entry with `notice.indexOf(name)`, the
    FIRST occurrence of the project's name anywhere in NOTICE. If one project's
    name appears inside another project's bullet earlier in the file, the check
    reads the wrong bullet for it, in either direction.
U3. The token pass skips windows that are less than half names, so a quotation
    dense with numbers — upstream test vectors, KAT tables, constants copied from
    a test file — is invisible to it, and the line pass needs 20-character lines
    with a letter. The inventory's blind-spot list does not say so.
U4. The guard trusts the URL. An SSH config `Host github.com` with a different
    HostName, `GIT_SSH_COMMAND`, or `core.sshCommand` sends a push whose URL parses
    as github.com/archive to another server. A guard against mistakes; the residual
    is not named.
U5. Step 5's README sentence carries a `DATE` placeholder, and nothing checks it
    was filled before step 7's gate runs on the exact commit that is pushed.
