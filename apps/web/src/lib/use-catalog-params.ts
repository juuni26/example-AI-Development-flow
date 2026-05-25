import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  categorySchema,
  listServicesQuerySchema,
  sortableColumnSchema,
  sortDirSchema,
  statusSchema,
  type Category,
  type ListServicesQuery,
  type SortableColumn,
  type SortDir,
  type Status,
} from "@cleandrop/shared";

/**
 * Maps the URL search params onto the shared ListServicesQuery shape. Invalid
 * values are silently coerced to undefined (or defaults) so a hand-edited URL
 * does not crash the page.
 */
export function useCatalogParams(): {
  query: ListServicesQuery;
  searchInput: string;
  status: Status | "all";
  category: Category | "all";
  sortBy: SortableColumn | undefined;
  sortDir: SortDir | undefined;
  page: number;
  pageSize: number;
  setSearch: (value: string) => void;
  setStatus: (value: Status | "all") => void;
  setCategory: (value: Category | "all") => void;
  setSort: (column: SortableColumn) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
} {
  const [params, setParams] = useSearchParams();

  const searchInput = params.get("search") ?? "";
  const status = parseEnum(statusSchema, params.get("status")) ?? "all";
  const category = parseEnum(categorySchema, params.get("category")) ?? "all";
  const sortBy = parseEnum(sortableColumnSchema, params.get("sortBy"));
  const sortDir = parseEnum(sortDirSchema, params.get("sortDir"));
  const page = clampInt(params.get("page"), 1, 1, 10_000);
  const pageSize = clampInt(params.get("pageSize"), 6, 1, 100);

  const query = useMemo<ListServicesQuery>(
    () =>
      listServicesQuerySchema.parse({
        search: searchInput.trim() || undefined,
        status: status === "all" ? undefined : status,
        category: category === "all" ? undefined : category,
        sortBy,
        sortDir,
        page,
        pageSize,
      }),
    [searchInput, status, category, sortBy, sortDir, page, pageSize],
  );

  const patch = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setSearch = useCallback(
    (value: string) => patch({ search: value, page: "1" }),
    [patch],
  );
  const setStatus = useCallback(
    (value: Status | "all") => patch({ status: value === "all" ? null : value, page: "1" }),
    [patch],
  );
  const setCategory = useCallback(
    (value: Category | "all") => patch({ category: value === "all" ? null : value, page: "1" }),
    [patch],
  );
  const setSort = useCallback(
    (column: SortableColumn) => {
      // Tri-state: asc → desc → none (clears sort, server default kicks in).
      if (sortBy !== column) {
        patch({ sortBy: column, sortDir: "asc", page: "1" });
      } else if (sortDir === "asc") {
        patch({ sortBy: column, sortDir: "desc", page: "1" });
      } else {
        patch({ sortBy: null, sortDir: null, page: "1" });
      }
    },
    [patch, sortBy, sortDir],
  );
  const setPage = useCallback((p: number) => patch({ page: String(p) }), [patch]);
  const setPageSize = useCallback(
    (size: number) => patch({ pageSize: String(size), page: "1" }),
    [patch],
  );

  return {
    query,
    searchInput,
    status,
    category,
    sortBy,
    sortDir,
    page,
    pageSize,
    setSearch,
    setStatus,
    setCategory,
    setSort,
    setPage,
    setPageSize,
  };
}

function parseEnum<T extends { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>(
  schema: T,
  raw: string | null,
): (T extends { _output: infer U } ? U : never) | undefined {
  if (!raw) return undefined;
  const parsed = schema.safeParse(raw);
  return parsed.success ? (parsed.data as never) : undefined;
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw === null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
