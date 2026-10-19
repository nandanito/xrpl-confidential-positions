import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * ⚠ Named `getRouter` because `@tanstack/react-start` imports that symbol from
 * this module by convention. Renaming it breaks hydration at build time, not at
 * run time — which is the good failure mode.
 */
export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: "intent" });
}

declare module "@tanstack/react-router" {
  interface Register { router: ReturnType<typeof getRouter> }
}
