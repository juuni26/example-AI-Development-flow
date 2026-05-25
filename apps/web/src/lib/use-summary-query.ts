import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ServicesSummary } from "@cleandrop/shared";
import { api } from "./api";

export function useSummaryQuery(): UseQueryResult<ServicesSummary> {
  return useQuery({
    queryKey: ["services", "summary"] as const,
    queryFn: async () => {
      const res = await api.get<ServicesSummary>("/services/summary");
      return res.data;
    },
  });
}
