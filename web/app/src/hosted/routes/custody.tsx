import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "../../components/Verdict";
import { CustodyView } from "../../views/CustodyView";
import { CustodyDiagram } from "../Diagrams";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/custody")({
  component: () => (
    <>
      <CustodyView sim={SNAPSHOT.repositoryText.custody} />
      <Panel title="The two findings, drawn">
        <CustodyDiagram />
      </Panel>
    </>
  ),
});
