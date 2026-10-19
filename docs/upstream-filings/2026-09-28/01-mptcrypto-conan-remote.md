TITLE: [Build] conan.lock pins an openssl revision that the Conan remote in the README's setup does not serve
REPO: XRPLF/mpt-crypto

---

The README sends readers to rippled's `BUILD.md` to set up Conan. That setup runs `conan/init.sh`, which adds the `xrplf` remote at `https://conan.xrplf.org/repository/conan/` ([`init.sh#L21`](https://github.com/XRPLF/rippled/blob/8f4e9c25d892767727ca5af09599df2b47890f9a/conan/init.sh#L21)). This repository's `conan.lock` pins `openssl/3.6.2#4789bbf1…`, which that remote does not serve, so dependency resolution fails. The same command works with `https://conan.ripplex.io`, which is the remote this repository's own scripts and CI add.

**Ask:** move this repository to `conan.xrplf.org`, as XRPLF/clio#3118 did for clio.

**What I ran**

mpt-crypto `3baaaac` (tag `1.0.5`), Conan 2.32.0, a fresh `CONAN_HOME` for each run, 2026-09-23.

```sh
conan profile detect
bash rippled/conan/init.sh          # rippled 8f4e9c25: global.conf, profiles, xrplf remote
conan graph info . --lockfile=conan.lock
# exit 1
# ERROR: Package 'openssl/3.6.2' not resolved: Unable to find
#   'openssl/3.6.2#4789bbf131b77d0515d15e094c8f697f%1778071755.506' in remotes.

# Control, with the remote this repository's scripts use:
conan profile detect
conan remote add --index 0 xrplf https://conan.ripplex.io
conan graph info . --lockfile=conan.lock
# exit 0, all three recipes "Downloaded (xrplf)"
```

Checked directly against each remote:

```sh
curl https://conan.xrplf.org/repository/conan/v2/conans/openssl/3.6.2/_/_/revisions   # 404
curl https://conan.ripplex.io/v2/conans/openssl/3.6.2/_/_/revisions                   # 4789bbf1…
curl https://center2.conan.io/v2/conans/openssl/3.6.2/_/_/revisions                   # 36f92686… only

# Every other pinned recipe is on the new remote at the pinned revision:
#   zlib/1.3.2#1cb806da, secp256k1/0.7.1#b1f450b7,
#   strawberryperl/5.32.1.1#8d114504, nasm/2.16.01#31e26f2e
```

**Where `conan.ripplex.io` is added**

- https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/conan/lockfile/regenerate.sh#L17
- https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/scripts/build-native-libs.sh#L16
- https://github.com/XRPLF/mpt-crypto/blob/3baaaac33dadec3e649846e487f452c5b6b2d825/.github/workflows/build.yml#L71 (macOS jobs)
- The Linux jobs run in `ghcr.io/xrplf/clio-ci:14342e0…`, whose Dockerfile adds it: https://github.com/XRPLF/clio/blob/14342e087ceb8b593027198bf9ef06a43833c696/docker/ci/Dockerfile#L115

CI at `3baaaac` passed with that remote (https://github.com/XRPLF/mpt-crypto/actions/runs/32380884181).

**Suggested fix**

One possible approach, following clio#3118: point the three lines above at `conan.xrplf.org`, add that remote in the Linux jobs, and regenerate `conan.lock`. I tried the regeneration. `regenerate.sh`'s own `conan lock create` command, with only the remote URL changed, succeeds and picks `openssl/3.6.4`. The new lockfile then resolves. rippled `develop` pins `openssl/3.6.3`, if you prefer to match it.

<details>
<summary>Searches for an existing report</summary>

```text
# 2026-09-23. Open and closed, issues and PRs.
gh search issues "conan.xrplf.org" --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "not resolved"    --repo XRPLF/mpt-crypto --include-prs   # 0
gh search issues "openssl/3.6.2"   --repo XRPLF/mpt-crypto --include-prs   # 1: #135 (WASM build)
gh search issues "conan.lock"      --repo XRPLF/mpt-crypto --include-prs   # 3: #95 adds the lockfile; #130, #135
gh search issues "conan.xrplf.org" --owner XRPLF --include-prs             # 0

# Audits
Trail of Bits, April 2026 report: no mention of Conan.
  https://github.com/trailofbits/publications/blob/master/reviews/2026-04-ripple-labs-xrp-ledger-confidential-transfer-securityreview.pdf
  I could not obtain its later revision; XRPLF/mpt-crypto#122 cites it for a Conan command
  used to run CodeQL.
Sherlock XRP Ledger Attackathon: full findings report not found. Public XRPLF issues and PRs
  matching "Sherlock" or "Attackathon" (104 on 2026-09-22, 103 on 2026-09-28), with comments,
  and the 16 PRs against rippled's ripple/attackathon-april-2026 branch, with review comments:
  none concerns a Conan remote.
```

</details>

---

*Disclosure: prepared with AI assistance. Every command and link above was checked on 2026-09-23 at mpt-crypto `3baaaac`, rippled `develop` `8f4e9c25` and clio `14342e0`, and re-checked on 2026-09-28. I found no stated policy on AI-assisted contributions, so I am disclosing by default.*
