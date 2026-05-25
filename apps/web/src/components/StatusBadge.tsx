import type { JSX } from "react";
import type { Status } from "@cleandrop/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<Status, string> = {
  Active: "bg-status-active-fg",
  Draft: "bg-status-draft-fg",
  Inactive: "bg-status-inactive-fg",
};

const VARIANT: Record<Status, "active" | "draft" | "inactive"> = {
  Active: "active",
  Draft: "draft",
  Inactive: "inactive",
};

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  return (
    <Badge variant={VARIANT[status]} className="gap-1.5 px-2 py-0.5">
      <span
        className={cn("inline-block h-1.5 w-1.5 rounded-full", DOT_COLORS[status])}
        aria-hidden="true"
      />
      {status}
    </Badge>
  );
}
