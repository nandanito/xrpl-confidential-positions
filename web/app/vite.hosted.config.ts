/**
 * The hosted demo's build: `ADR-0004`, architecture §6 step 9.
 *
 * ⚠ **A second build target, not a replacement.** `vite.config.ts` is the local
 * tier and is untouched. This one builds `src/hosted/`, prerenders every page
 * from the build's one snapshot, and emits static files only.
 *
 * ⚠ **Nothing from the build machine's environment reaches the bundle.**
 * `REVIEW-058` M11: a `VITE_` variable set on the build machine was inlined into
 * the client bundle without appearing in the source. `envPrefix` names a prefix
 * nothing sets, and `web/hosted/build.ts` sets canary variables under both
 * prefixes and fails if either value appears in the output.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { HOSTED_PAGES } from "../hosted/pages.ts";
import { EMAIL_MARKER, shippedNotice } from "../hosted/licence-notices.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_PATH = resolve(HERE, "../hosted/.build/snapshot.json");
const VIRTUAL = "virtual:wconf-snapshot";

/** The build's one snapshot, as a module. A missing snapshot fails the build. */
function hostedSnapshot(): Plugin {
  return {
    name: "wconf-hosted-snapshot",
    resolveId(id) {
      return id === VIRTUAL ? `\0${VIRTUAL}` : null;
    },
    load(id) {
      if (id !== `\0${VIRTUAL}`) return null;
      if (!existsSync(SNAPSHOT_PATH)) {
        throw new Error(`no snapshot at ${SNAPSHOT_PATH}; run web/hosted/build.ts, which takes one first`);
      }
      const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
      if (snap.schema !== "wconf-hosted-snapshot/1") throw new Error(`unexpected snapshot schema ${JSON.stringify(snap.schema)}`);
      return `export default ${JSON.stringify(snap)};`;
    },
  };
}

/**
 * The licence notices the client bundle's dependencies require, shipped with
 * it (`REVIEW-058` S-2). Collected from the modules actually in the client
 * bundle, so a package that is bundled cannot be missed and one that is not is
 * not listed. A bundled package without a licence file fails the build.
 */
function licenceNotices(): Plugin {
  return {
    name: "wconf-licence-notices",
    generateBundle(_options, bundle) {
      if ((this as any).environment?.name && (this as any).environment.name !== "client") return;
      const roots = new Map<string, string>();
      for (const out of Object.values(bundle)) {
        // ⚠ Tailwind's generated stylesheet is not a JS module, so the module
        // walk below cannot see it; its banner is how it is found.
        if (out.type === "asset" && out.fileName.endsWith(".css") && String(out.source).includes("tailwindcss")) {
          const root = resolve(HERE, "../../node_modules/tailwindcss");
          roots.set(root, "tailwindcss");
        }
        if (out.type !== "chunk") continue;
        for (const id of Object.keys(out.modules)) {
          const clean = id.replace(/^\0/, "").split("?")[0];
          const m = clean.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//);
          if (m) roots.set(m[1], m[1].slice(m[1].lastIndexOf("node_modules/") + "node_modules/".length));
        }
      }
      const parts: string[] = [
        "Third-party software in the W-CONF hosted demo's client bundle, with the licence",
        "each package ships. Collected at build time from the modules actually bundled.",
        `Email addresses in these notices are replaced with "${EMAIL_MARKER}".`,
        "",
      ];
      for (const [root, name] of [...roots].sort((a, b) => a[1].localeCompare(b[1]))) {
        const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        const notice = shippedNotice(root);
        if (!notice) throw new Error(`${name}@${pkg.version} is in the client bundle and ships no licence file`);
        parts.push("=".repeat(78), `${name}@${pkg.version} (${pkg.license ?? "licence field absent"})`, "=".repeat(78), notice, "");
      }
      this.emitFile({ type: "asset", fileName: "third-party-licenses.txt", source: parts.join("\n") + "\n" });
    },
  };
}

export default defineConfig({
  envPrefix: "WCONF_HOSTED_BUNDLE_NEVER_",
  build: { sourcemap: false },
  // ⚠ The prerender step serves the build to itself through Vite's preview
  // server. `localhost` resolved to ::1 inside the build container while the
  // request went to 127.0.0.1, and every page was refused; a literal fixes
  // both, and keeps the server on loopback.
  preview: { host: "127.0.0.1" },
  plugins: [
    hostedSnapshot(),
    licenceNotices(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src/hosted",
      // ⚠ Not crawled: the six pages are named, and the crawler followed the
      // footer's links to files the gate writes after the build, and failed.
      prerender: { enabled: true, crawlLinks: false, failOnError: true },
      pages: HOSTED_PAGES.map((p) => ({ path: `/${p}` })),
    }),
    react(),
  ],
});
