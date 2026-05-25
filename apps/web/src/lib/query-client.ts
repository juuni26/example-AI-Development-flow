import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // 30s — catalogue rows do not churn during a session; refetching on
      // every focus event is unnecessary chatter.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
