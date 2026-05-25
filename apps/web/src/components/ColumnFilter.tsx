import type { JSX } from "react";
import { Check, Filter as FilterIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ColumnFilterOption<T extends string> {
  value: T;
  label: string;
}

interface ColumnFilterProps<T extends string> {
  /** Human-readable name shown at the top of the popover, e.g. "Status". */
  label: string;
  /** Currently selected value; "all" means no filter is applied. */
  value: T | "all";
  options: ColumnFilterOption<T>[];
  onChange: (next: T | "all") => void;
}

/**
 * A small dropdown surface next to a column header that lets the user filter
 * that column to a single value (or clear back to "All"). Used on Status,
 * Category, and Company columns. The funnel icon turns solid when a filter
 * is active so the user can spot which columns are constrained at a glance.
 */
export function ColumnFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: ColumnFilterProps<T>): JSX.Element {
  const active = value !== "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            active && "text-foreground",
          )}
        >
          <FilterIcon className={cn("h-3.5 w-3.5", active && "fill-current")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange("all" as T | "all")} className="justify-between">
          <span>All</span>
          {value === "all" ? <Check className="h-3.5 w-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className="justify-between"
          >
            <span className="truncate">{opt.label}</span>
            {value === opt.value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
