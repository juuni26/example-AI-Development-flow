import type { JSX, ReactNode } from "react";
import { Clock, DollarSign, FileEdit, Layers } from "lucide-react";
import { formatMoneyCompact, type ServicesSummary } from "@cleandrop/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSpec {
  label: string;
  value: string;
  subline: string;
  icon: JSX.Element;
}

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

function SummaryCard({ label, value, subline, icon }: CardSpec): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="text-muted-foreground/70" aria-hidden="true">
            {icon}
          </span>
        </div>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
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
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: "Active",
      value: String(s.active),
      subline: "Currently available",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Drafts",
      value: String(s.drafts),
      subline: "Not published yet",
      icon: <FileEdit className="h-4 w-4" />,
    },
    {
      label: "Avg. Base Price",
      value: formatMoneyCompact(s.avgBasePriceCents),
      subline: "Across all services",
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];
}
