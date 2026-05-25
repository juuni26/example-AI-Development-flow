import type { JSX } from "react";
import type { Status } from "@cleandrop/shared";
import { Badge } from "@/components/ui/badge";

// Matches the design preview: rounded-full pills with three distinct
// treatments — Active = solid black, Draft = light neutral, Inactive = outline.
const VARIANT: Record<Status, "active" | "draft" | "inactive"> = {
  Active: "active",
  Draft: "draft",
  Inactive: "inactive",
};

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return (
    <Badge variant={VARIANT[status]} className="px-3 py-1 text-xs font-medium">
      {status}
    </Badge>
  );
}
