import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { WalletView } from "../../views/WalletView";
import { TwoKeysDiagram } from "../Diagrams";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <>
      <Panel title="The two keys, and which one a wallet holds">
        <TwoKeysDiagram wallet />
      </Panel>
      <WalletView {...SNAPSHOT.repositoryText.capabilities} />
    </>
  ),
});
