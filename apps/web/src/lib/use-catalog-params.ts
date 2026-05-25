import { useCallback, useEffect, useMemo } from "react";
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
  companyId: string | "all";
  sortBy: SortableColumn | undefined;
  sortDir: SortDir | undefined;
  page: number;
  pageSize: number;
  setSearch: (value: string) => void;
  setStatus: (value: Status | "all") => void;
  setCategory: (value: Category | "all") => void;
  setCompanyId: (value: string | "all") => void;
  setSort: (column: SortableColumn) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
} {
  const [params, setParams] = useSearchParams();

  const searchInput = params.get("search") ?? "";
  const status = parseEnum(statusSchema, params.get("status")) ?? "all";
  const category = parseEnum(categorySchema, params.get("category")) ?? "all";
  const rawCompanyId = params.get("companyId");
  // Cheap UUID-ish gate (not exhaustive) — invalid values silently fall back.
  const companyId: string | "all" =
    rawCompanyId && /^[0-9a-f-]{36}$/i.test(rawCompanyId) ? rawCompanyId : "all";
  const sortBy = parseEnum(sortableColumnSchema, params.get("sortBy"));
  const sortDir = parseEnum(sortDirSchema, params.get("sortDir"));
  const rawPage = params.get("page");
  const rawPageSize = params.get("pageSize");
  const page = clampInt(rawPage, 1, 1, 10_000);
  const pageSize = clampInt(rawPageSize, 6, 1, 100);

  // If a clamp fired, normalise the URL back so a refresh or copy-paste of
  // the address bar reflects the actual rendered state.
  useEffect(() => {
    if (rawPage !== null && rawPage !== String(page)) {
      const next = new URLSearchParams(params);
      next.set("page", String(page));
      setParams(next, { replace: true });
    } else if (rawPageSize !== null && rawPageSize !== String(pageSize)) {
      const next = new URLSearchParams(params);
      next.set("pageSize", String(pageSize));
      setParams(next, { replace: true });
    }
  }, [rawPage, rawPageSize, page, pageSize, params, setParams]);

  const query = useMemo<ListServicesQuery>(
    () =>
      listServicesQuerySchema.parse({
        search: searchInput.trim() || undefined,
        status: status === "all" ? undefined : status,
        category: category === "all" ? undefined : category,
        companyId: companyId === "all" ? undefined : companyId,
        sortBy,
        sortDir,
        page,
        pageSize,
      }),
    [searchInput, status, category, companyId, sortBy, sortDir, page, pageSize],
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
  const setCompanyId = useCallback(
    (value: string | "all") => patch({ companyId: value === "all" ? null : value, page: "1" }),
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
