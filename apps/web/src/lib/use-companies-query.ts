import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CompanySummary } from "@cleandrop/shared";
import { api } from "./api";

export function useCompaniesQuery(enabled = true): UseQueryResult<CompanySummary[]> {
  return useQuery({
    queryKey: ["companies"] as const,
    queryFn: async () => {
      const res = await api.get<CompanySummary[]>("/companies");
      return res.data;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
