# The hosted demo's build image (ADR-0004, the isolated build machine).
#
# Node for Vite, Bun for everything else: the toolchain the hosted build is
# developed and tested with on the host. `bunx vite` runs Vite under Node, by
# its shebang; under Bun alone the prerender step could not reach its own
# preview server. Both bases are pinned by digest, and Bun is copied out of its
# own image rather than installed from a registry at build time.
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS bun
FROM node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
USER node
