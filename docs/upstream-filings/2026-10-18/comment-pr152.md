COMMENT on PR: XRPLF/mpt-crypto#152
URL: https://github.com/XRPLF/mpt-crypto/pull/152#issuecomment-6244735263
Posted: 2026-10-18

---

Independent check of the lockfile half at 5bec336: from a fresh `CONAN_HOME` with only `conan.xrplf.org` and conancenter, `conan graph info . --lockfile=conan.lock` resolves all three recipes from `xrplf` (openssl/3.6.5#57e26a79, secp256k1/0.7.1#b1f450b7, zlib/1.3.2#1cb806da). `conan.ripplex.io` no longer answers from here at all. This covers what #148 asked for; the CI image question is separate.
