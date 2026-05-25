import type { JSX } from "react";
import type { Status } from "@cleandrop/shared";
import { Badge } from "@/components/ui/badge";

// Matches the design preview: a rounded pill with a tinted background and
// foreground tuned for AA contrast. No leading dot — the preview shows a
// plain text label inside the pill.
const VARIANT: Record<Status, "active" | "draft" | "inactive"> = {
  Active: "active",
  Draft: "draft",
  Inactive: "inactive",
};

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return (
    <Badge variant={VARIANT[status]} className="px-2.5 py-0.5 text-xs font-medium">
      {status}
    </Badge>
  );
}
