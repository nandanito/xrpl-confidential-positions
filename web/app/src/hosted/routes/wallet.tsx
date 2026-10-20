import { createFileRoute } from "@tanstack/react-router";
import { WalletView } from "../../views/WalletView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/wallet")({
  component: () => <WalletView {...SNAPSHOT.repositoryText.capabilities} />,
});
