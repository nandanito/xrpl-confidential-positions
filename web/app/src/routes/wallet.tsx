import { createFileRoute } from "@tanstack/react-router";
import { api } from "../api";
import { WalletView } from "../views/WalletView";

export const Route = createFileRoute("/wallet")({
  loader: () => api.capabilities(),
  component: () => <WalletView {...Route.useLoaderData()} />,
});
