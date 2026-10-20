import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { CustodyView } from "../views/CustodyView";

export const Route = createFileRoute("/custody")({
  loader: async () => ({ caps: await api.capabilities(), sim: await api.custody() }),
  component: () => <CustodyView {...Route.useLoaderData()} />,
});
