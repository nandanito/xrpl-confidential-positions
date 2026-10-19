/**
 * hostile-endpoints.ts — every endpoint the facility must REFUSE, in one place.
 *
 * ⚠ **This file exists so that `tools/check-loopback.ts` needs exactly one
 * whole-file exemption instead of thirteen near-identical ones.** A list of thirteen
 * almost-identical exemptions is a list nobody reads, and an
 * exemption nobody reads is `CLAIMS.md` E-140's false reason waiting to
 * happen. One entry, one reason, one file whose entire purpose is stated in
 * its first line.
 *
 * ⚠ **Nothing here is ever connected to.** These are inputs to
 * `isLoopbackEndpoint`, and `facility/tests/loopback.test.ts` asserts every one
 * of them is refused. If a string in this file were ever *used* as an endpoint,
 * `LoopbackLedger.open` would refuse it at runtime as well — which is the
 * second half of the property and the reason the whole-file exemption is not a
 * hole.
 */

/** Refused, with the reason each one is here. */
export const HOSTILE_ENDPOINTS: { endpoint: string; why: string }[] = [
  {
    endpoint: "http://127.attacker.example/",
    why: "REVIEW-016: the Rust `is_loopback_host` accepted it — a host NAMED to look numeric",
  },
  {
    endpoint: "http://127.0.0.1@attacker.example/",
    why: "REVIEW-016: userinfo before the real host. `URL.hostname` is what strips it",
  },
  {
    endpoint: "http://[::1",
    why: "REVIEW-016 round two: an unterminated IPv6 literal, accepted by a parser that split on `]`",
  },
  {
    endpoint: "http://localhost:5005",
    why: "a NAME. Resolved by something this process does not control. The signer accepts it; this does not",
  },
  {
    endpoint: "http://localhost.attacker.example/",
    why: "a name that merely starts with `localhost`",
  },
  {
    endpoint: "https://s.devnet.rippletest.net:51234/",
    why: "the endpoint every other harness in this repository uses. For the facility it is the defect",
  },
  {
    endpoint: "wss://s.devnet.rippletest.net:51233",
    why: "the same operator over WebSocket. B-15 is about the node, not the transport",
  },
  { endpoint: "http://10.0.0.1:5005", why: "private, but not loopback. Someone else's machine" },
  { endpoint: "http://0.0.0.0:5005", why: "not 127.0.0.0/8" },
  { endpoint: "http://128.0.0.1:5005", why: "one bit away from loopback in the first octet" },
  { endpoint: "http://[::2]:5005", why: "not ::1" },
  { endpoint: "http://127.0.0.256:5005", why: "octet overflow — a check that parsed loosely would take it" },
  {
    endpoint: "http://192.0.2.1:1/",
    why:
      "RFC 5737 TEST-NET-1, used as the TARGET of the redirect test. `fetch` follows redirects " +
      "by default, so a loopback endpoint answering 307 could forward the POST — and every call " +
      "after it — off-host, with the loopback check having passed on the original URL. Nothing " +
      "connects here: the point of the test is that the request never leaves",
  },
];

/** Accepted. Loopback addresses only, so no exemption is needed for these. */
export const LOOPBACK_ENDPOINTS = [
  "http://127.0.0.1:5005",
  "http://127.0.0.1:5005/",
  "https://127.0.0.1",
  "ws://127.0.0.1:6006",
  "wss://127.0.0.1:6006",
  "http://127.5.5.5:5005",
  "http://[::1]:5005",
];

/**
 * Also accepted — and pinned here because it surprised the session that wrote
 * the check.
 *
 * ⚠ WHATWG `URL` canonicalises every one of these to `127.0.0.1` **before**
 * `isLoopbackEndpoint` sees the host, so they pass. That is **correct**: each
 * one genuinely is loopback. The session's own review leg asserted they were
 * *refused* — from reasoning, without running them — and `REVIEW-022`'s Codex
 * leg ran them. They are pinned as ACCEPTED so that a later session reading the
 * word "literal" does not tighten the check into rejecting real loopback
 * addresses.
 */
export const CANONICALISED_LOOPBACK = [
  "http://2130706433:5005",
  "http://0177.0.0.1:5005",
  "http://0x7f.1:5005",
  "http://127.1:5005",
  "http://127.0.0.1.:5005",
  "HTTP://127.0.0.1:5005",
];

/** Not endpoints at all. Refused for shape rather than for host. */
export const NOT_ENDPOINTS = ["127.0.0.1:5005", "", "file:///etc/passwd"];
