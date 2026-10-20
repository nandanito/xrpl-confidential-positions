import { createFileRoute } from "@tanstack/react-router";
import { CustodyView } from "../../views/CustodyView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/custody")({
  component: () => <CustodyView sim={SNAPSHOT.repositoryText.custody} />,
});
