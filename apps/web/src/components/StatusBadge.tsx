import type { JSX } from "react";
import type { Status } from "@cleandrop/shared";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: Status }): JSX.Element {
  switch (status) {
    case "Active":
      return <Badge variant="success">{status}</Badge>;
    case "Draft":
      return <Badge variant="warning">{status}</Badge>;
    case "Inactive":
      return <Badge variant="muted">{status}</Badge>;
  }
}
