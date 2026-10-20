import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { CustodyView } from "../views/CustodyView";

export const Route = createFileRoute("/custody")({
  loader: async () => ({ sim: await api.custody() }),
  component: () => <CustodyView {...Route.useLoaderData()} />,
});
