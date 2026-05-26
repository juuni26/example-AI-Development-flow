import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { categorySchema, statusSchema, type Service, type SortableColumn } from "@cleandrop/shared";
import { AppShell } from "@/components/AppShell";
import { ColumnFilter, type ColumnFilterOption } from "@/components/ColumnFilter";
import { DeleteServiceDialog } from "@/components/DeleteServiceDialog";
import { ServiceFormSheet } from "@/components/ServiceFormSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryCards } from "@/components/SummaryCards";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/use-auth";
import { useCatalogParams } from "@/lib/use-catalog-params";
import { useCompaniesQuery } from "@/lib/use-companies-query";
import { useDebounce } from "@/lib/use-debounce";
import { useServicesQuery } from "@/lib/use-services-query";
import { useSummaryQuery } from "@/lib/use-summary-query";

const PAGE_SIZE_OPTIONS = [6, 10, 25];

// Filter options for the column funnels. Status + Category are static enums
// from the shared schema; Company is hydrated at runtime from /companies.
const STATUS_OPTIONS: ColumnFilterOption<typeof statusSchema._type>[] = statusSchema.options.map(
  (s) => ({ value: s, label: s }),
);
const CATEGORY_OPTIONS: ColumnFilterOption<typeof categorySchema._type>[] =
  categorySchema.options.map((c) => ({ value: c, label: c }));

export function ServicesPage(): JSX.Element {
  const {
    query,
    searchInput,
    status,
    category,
    companyId,
    sortBy,
    sortDir,
    page,
    pageSize,
    setSearch,
    setStatus,
    setCategory,
    setCompanyId,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  } = useCatalogParams();

  // Companies are fetched once for both the company column filter and the
  // form's company dropdown — useCompaniesQuery is cached at the React Query
  // layer so adding this here costs nothing extra.
  const companies = useCompaniesQuery();

  // Local input state mirrors the URL `search` param but is debounced before
  // pushing back, so typing does not refire the query on every keystroke.
  // userTypedRef gates the debounced push so an external URL change (e.g.
  // Clear filters resetting the input to "") cannot race a stale
  // `debouncedDraft` and repopulate ?search= with the old typed value.
  const [draft, setDraft] = useState(searchInput);
  const userTypedRef = useRef(false);
  useEffect(() => {
    setDraft(searchInput);
    userTypedRef.current = false;
  }, [searchInput]);
  const debouncedDraft = useDebounce(draft, 250);
  useEffect(() => {
    if (!userTypedRef.current) return;
    if (debouncedDraft !== draft) return;
    if (debouncedDraft !== searchInput) setSearch(debouncedDraft);
  }, [debouncedDraft, draft, searchInput, setSearch]);

  // The query uses the URL-bound query directly so the debounced search has
  // already been written to the URL before the request fires.
  const { data, isLoading, isError, error, isFetching, refetch } = useServicesQuery(query);
  const summary = useSummaryQuery();
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";

  // Admin UI state: sheet for add/edit, dialog for delete.
  const [sheet, setSheet] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);

  const openCreate = (): void => setSheet({ open: true, service: null });
  const openEdit = (service: Service): void => setSheet({ open: true, service });
  const closeSheet = (open: boolean): void =>
    setSheet((prev) => (open ? prev : { ...prev, open: false }));

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Services</h1>
            <Badge variant="outline" className="gap-1.5 text-[11px] font-bold">
              <Briefcase className="h-3 w-3" />
              Platform-wide
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage your service catalog</p>
        </div>
      </header>

      <div className="mb-6">
        <SummaryCards data={summary.data} isLoading={summary.isLoading} />
      </div>

      <Card className="shadow-soft-1">
        <CardHeader className="flex flex-row items-center justify-between gap-4 px-8 ">
          <div className="flex flex-col">
            <CardTitle className="text-lg">Catalog</CardTitle>
          </div>
          {isAdmin ? (
            <Button size="sm" variant="outline" onClick={openCreate} className="shrink-0">
              <Plus className="h-4 w-4" /> Add
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(e) => {
                  userTypedRef.current = true;
                  setDraft(e.target.value);
                }}
                placeholder="Search services…"
                className="h-11 rounded-lg pl-10 text-sm"
                aria-label="Search services"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={status} onValueChange={(v) => setStatus(v as never)}>
                <SelectTrigger
                  aria-label="Filter by status"
                  className="h-11 rounded-lg px-3.5 text-sm"
                >
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={(v) => setCategory(v as never)}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="h-11 rounded-lg px-3.5 text-sm"
                >
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Specialty">Specialty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="name" current={sortBy} dir={sortDir} onSort={setSort}>
                    Name
                  </SortableHead>
                  <SortableHead
                    column="category"
                    current={sortBy}
                    dir={sortDir}
                    onSort={setSort}
                    filter={
                      <ColumnFilter
                        label="Category"
                        value={category}
                        options={CATEGORY_OPTIONS}
                        onChange={(v) => setCategory(v as never)}
                      />
                    }
                  >
                    Category
                  </SortableHead>
                  <SortableHead
                    column="company"
                    current={sortBy}
                    dir={sortDir}
                    onSort={setSort}
                    filter={
                      <ColumnFilter
                        label="Company"
                        value={companyId}
                        options={(companies.data ?? []).map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        onChange={(v) => setCompanyId(v)}
                      />
                    }
                  >
                    Company
                  </SortableHead>
                  <SortableHead
                    column="status"
                    current={sortBy}
                    dir={sortDir}
                    onSort={setSort}
                    filter={
                      <ColumnFilter
                        label="Status"
                        value={status}
                        options={STATUS_OPTIONS}
                        onChange={(v) => setStatus(v as never)}
                      />
                    }
                  >
                    Status
                  </SortableHead>
                  <SortableHead column="duration" current={sortBy} dir={sortDir} onSort={setSort}>
                    Duration
                  </SortableHead>
                  {isAdmin ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-3/4" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5}>
                      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
                        <span>
                          Could not load services. {error instanceof Error ? error.message : ""}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => void refetch()}>
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data && data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5}>
                      <div className="flex flex-col items-center gap-2 py-10 text-sm">
                        <span>No services match these filters.</span>
                        <button
                          type="button"
                          className="text-xs text-primary underline-offset-4 hover:underline"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {s.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1.5 font-bold">
                          <Building2 className="h-3 w-3" />
                          {s.company.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {s.durationMinutes} minutes
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="w-12">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${s.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(s)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setPendingDelete(s)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Small "Showing X–Y of Z" line above the controls — matches the
              two-row pagination footer in the design preview. */}
          {total > 0 ? (
            <p className="text-xs text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
          ) : null}
          <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
            <span className="text-muted-foreground">
              {total === 0
                ? "0 services"
                : `Showing ${rangeStart} to ${rangeEnd} of ${total} services`}
              {isFetching && !isLoading ? " · refreshing…" : ""}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span id="rows-per-page-label" className="text-muted-foreground">
                  Rows per page
                </span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger aria-labelledby="rows-per-page-label" className="h-8 w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ServiceFormSheet open={sheet.open} service={sheet.service} onOpenChange={closeSheet} />
      <DeleteServiceDialog
        service={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      />
    </AppShell>
  );
}

interface SortableHeadProps {
  column: SortableColumn;
  current: SortableColumn | undefined;
  dir: "asc" | "desc" | undefined;
  onSort: (column: SortableColumn) => void;
  /** Optional filter affordance rendered next to the sort button (e.g. <ColumnFilter />). */
  filter?: React.ReactNode;
  children: React.ReactNode;
}

function SortableHead({
  column,
  current,
  dir,
  onSort,
  filter,
  children,
}: SortableHeadProps): JSX.Element {
  const active = current === column;
  return (
    <TableHead className="h-12 py-3">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSort(column)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
            active && "text-foreground",
          )}
        >
          {children}
          {active && dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : active && dir === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          )}
        </button>
        {filter}
      </div>
    </TableHead>
  );
}
