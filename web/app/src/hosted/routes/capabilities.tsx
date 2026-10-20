import { createFileRoute } from "@tanstack/react-router";
import { CapabilitiesView } from "../../views/CapabilitiesView";
import { SNAPSHOT } from "../data";

export const Route = createFileRoute("/capabilities")({
  component: () => <CapabilitiesView {...SNAPSHOT.repositoryText.capabilities} />,
});
