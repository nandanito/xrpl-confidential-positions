import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { CapabilitiesView } from "../../views/CapabilitiesView";
import { TwoKeysDiagram } from "../Diagrams";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/capabilities")({
  component: () => (
    <>
      <Panel title="The two keys">
        <TwoKeysDiagram />
      </Panel>
      <CapabilitiesView {...SNAPSHOT.repositoryText.capabilities} />
    </>
  ),
});
