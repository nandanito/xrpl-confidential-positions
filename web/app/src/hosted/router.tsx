import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * The hosted build's router (`ADR-0004`). ⚠ Named `getRouter` because
 * `@tanstack/react-start` imports that symbol from this module by convention.
 */
export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: "intent" });
}

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter> }
}
