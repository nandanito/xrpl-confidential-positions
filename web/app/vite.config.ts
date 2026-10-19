/**
 * Architecture §6 step 8's browser application.
 *
 * ⚠ **Nothing in this application may reach the signer's Unix socket.** It
 * talks to the read-only Elysia API over HTTP and to nothing else. The
 * property is asserted by `tools/check-web-readonly.ts`, not by this comment.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  server: {
    port: 3000,
    // ⚠ Loopback only. This is a demonstration of a confidential system on a
    // holder's own machine; binding it to a routable interface would publish a
    // holder's ledger view to the network (CLAIMS.md P-5, and F-23's shape).
    host: "127.0.0.1",
    // ⚠ Must match `DEFAULT_PORT` in `web/api/server.ts`. It is read from the
    // same environment variable so the two cannot drift silently — and the
    // client additionally checks WHAT answered, because a proxy to a free port
    // is a proxy to whatever happens to be listening (a Docker Gitea, once).
    proxy: {
      "/api": { target: `http://127.0.0.1:${process.env.WCONF_WEB_PORT ?? 3011}`, changeOrigin: false },
    },
  },
  // ⚠ `customViteReactPlugin: true` was passed here and **is not an option in
  // @tanstack/react-start 1.168** — `vite build` accepted it silently and only
  // `tsc` said so. Removed 2026-08-28. The React plugin is listed explicitly
  // after the Start plugin, which is the documented order.
  plugins: [tailwindcss(), tanstackStart(), react()],
});
