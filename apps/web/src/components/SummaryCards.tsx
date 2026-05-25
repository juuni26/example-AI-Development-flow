import type { JSX, ReactNode } from "react";
import { Briefcase, Clock, DollarSign, FileEdit, Layers, SquarePen } from "lucide-react";
import { formatMoneyCompact, type ServicesSummary } from "@cleandrop/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tint = "green" | "amber" | undefined;

interface CardSpec {
  label: string;
  value: string;
  subline: string;
  icon: JSX.Element;
  tint?: Tint;
}

// Color class applied to the card's big number only. Label, icon, and subline
// stay neutral so the colored value pops without recoloring the whole card.
const TINT_CLASSES: Record<Exclude<Tint, undefined>, string> = {
  green: "text-emerald-700 dark:text-emerald-400",
  amber: "text-amber-700 dark:text-amber-400",
};

export function SummaryCards({
  data,
  isLoading,
}: {
  data: ServicesSummary | undefined;
  isLoading: boolean;
}): JSX.Element {
  const cards = data ? buildCards(data) : null;
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards
        ? cards.map((c) => <SummaryCard key={c.label} {...c} />)
        : Array.from({ length: 4 }).map((_, i) => <SummaryCardSkeleton key={i} loading={isLoading} />)}
    </section>
  );
}

function SummaryCard({ label, value, subline, icon, tint }: CardSpec): JSX.Element {
  // Only the number takes the tint. Label, icon, and subline stay neutral so
  // the colored value pops without making the whole card feel "stateful".
  const valueColor = tint ? TINT_CLASSES[tint] : undefined;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium ">{label}</span>
          <span className="text-muted-foreground/70" aria-hidden="true">
            {icon}
          </span>
        </div>
        <div
          className={cn(
            "text-[28px] font-bold leading-none tracking-tight tabular-nums",
            valueColor,
          )}
        >
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{subline}</div>
      </CardContent>
    </Card>
  );
}

function SummaryCardSkeleton({ loading }: { loading: boolean }): JSX.Element {
  // When `loading` is false we still render the four reserved cards (avoids
  // layout shift while the query is starting) but with neutral content.
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between">
          <Skeleton className={loading ? "h-4 w-24" : "h-4 w-24 opacity-30"} />
          <Skeleton className={loading ? "h-4 w-4" : "h-4 w-4 opacity-30"} />
        </div>
        <Skeleton className={loading ? "h-8 w-16" : "h-8 w-16 opacity-30"} />
        <Skeleton className={loading ? "h-3 w-32" : "h-3 w-32 opacity-30"} />
      </CardContent>
    </Card>
  );
}

function buildCards(s: ServicesSummary): CardSpec[] {
  return [
    {
      label: "Total Services",
      value: String(s.total),
      subline: "Across all companies",
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      label: "Active",
      value: String(s.active),
      subline: "Currently available",
      icon: <Clock className="h-4 w-4" />,
      tint: "green",
    },
    {
      label: "Drafts",
      value: String(s.drafts),
      subline: "Not published yet",
      icon: <SquarePen className="h-4 w-4" />,
      tint: "amber",
    },
    {
      label: "Avg. Base Price",
      value: formatMoneyCompact(s.avgBasePriceCents),
      subline: "Across all services",
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];
}
