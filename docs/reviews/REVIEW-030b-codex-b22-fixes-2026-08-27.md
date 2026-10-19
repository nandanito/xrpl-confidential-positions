1. Defective. `derive_scalar` wipes `candidate`, but `to_nonzero_scalar()` copies the accepted scalar into non-dropping `root`/`intermediate`. `sum` also never wipes—only `sum_bytes` does. `AccountKey::from_family_seed` leaves returned entropy bare. Derived keys are unchanged: hash inputs/order and scalar arithmetic remain identical.

2. It can false-pass. Part 5 counts needles anywhere; comments, dead/test code, or decoys satisfy it after production wiping disappears. Its negative “control” only checks an unrelated string is absent; its positive control repeats the first count. Neither exercises the detector’s failure path or `bad` accounting.

3. Yes. “`derive_scalar` wipes” the intermediate output, “`sum` … Both wipe,” and “`SecretKey` owns the surviving copy” are false. The survivors are `root`, `intermediate`, and `sum`. “Controls in every direction” is also false.

4. It missed `root`, `intermediate`, `sum`; `from_family_seed`’s bare `[u8;16]`; `base58check_decode::raw`; `b58_decode::bytes`; reachable SHA-256 outputs; and keygen’s `sk` source left by `Zeroizing(*sk.as_bytes())`. None is named in part 5. SHA-512 block state, move sources, and serde scratch remain disclosed residuals.
