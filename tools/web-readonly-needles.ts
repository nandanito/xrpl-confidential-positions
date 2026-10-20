/**
 * Needle lists shared by `check-web-readonly.ts` and its hosted part,
 * `check-web-hosted.ts`. No side effects: importing this runs nothing.
 */

/** Anything that reaches the signer's socket. */
export const SOCKET_NEEDLES = [
  "signer.sock",
  "WCONF_SIGNER_SOCKET",
  "signerSocketPath",
  "signer-status",
  "Bun.connect",
  "node:net",
  "createConnection",
  "unix:",
];

export const SECRET_NEEDLES = [
  // ⚠ Env names are handled by `secretEnvReads` (structural). Keeping them here
  // as well is harmless for the ident pass and catches a bare identifier use.
  "WCONF_ELGAMAL_SK",
  "WCONF_SIGNER_PROFILE",
  "decryptInRange",
  "decryptAmount",
  "elgamal_sk",
  "account_seed",
  "Bun.spawn",
  "child_process",
];
