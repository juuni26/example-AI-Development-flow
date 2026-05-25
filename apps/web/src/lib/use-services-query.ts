import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ListServicesQuery, PaginatedServices } from "@cleandrop/shared";
import { api } from "./api";

export function useServicesQuery(query: ListServicesQuery): UseQueryResult<PaginatedServices> {
  return useQuery({
    queryKey: ["services", query] as const,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: query.page,
        pageSize: query.pageSize,
      };
      if (query.search) params.search = query.search;
      if (query.status) params.status = query.status;
      if (query.category) params.category = query.category;
      if (query.sortBy) params.sortBy = query.sortBy;
      if (query.sortDir) params.sortDir = query.sortDir;
      const res = await api.get<PaginatedServices>("/services", { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}
