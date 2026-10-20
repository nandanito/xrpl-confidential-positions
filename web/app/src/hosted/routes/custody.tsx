import { createFileRoute } from "@tanstack/react-router";
import { CustodyView } from "../../views/CustodyView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/custody")({
  component: () => <CustodyView caps={SNAPSHOT.repositoryText.capabilities} sim={SNAPSHOT.repositoryText.custody} />,
});
