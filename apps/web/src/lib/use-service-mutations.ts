import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { CreateServiceRequest, Service, UpdateServiceRequest } from "@cleandrop/shared";
import { api } from "./api";

/** Invalidates both the catalog list and the summary cards after any write. */
function useInvalidateCatalog(): () => Promise<void> {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["services"] }),
      qc.invalidateQueries({ queryKey: ["services", "summary"] }),
    ]);
  };
}

export function useCreateService(): UseMutationResult<Service, Error, CreateServiceRequest> {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (body: CreateServiceRequest) => {
      const res = await api.post<Service>("/services", body);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateService(): UseMutationResult<
  Service,
  Error,
  { id: string; body: UpdateServiceRequest }
> {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const res = await api.patch<Service>(`/services/${id}`, body);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteService(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: invalidate,
  });
}
