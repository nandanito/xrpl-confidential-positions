import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { CapabilitiesView } from "../views/CapabilitiesView";

export const Route = createFileRoute("/capabilities")({
  loader: () => api.capabilities(),
  component: () => <CapabilitiesView {...Route.useLoaderData()} />,
});
