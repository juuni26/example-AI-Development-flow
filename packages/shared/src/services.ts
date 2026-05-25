import { z } from "zod";

export const categorySchema = z.enum(["Residential", "Commercial", "Specialty"]);
export type Category = z.infer<typeof categorySchema>;

export const statusSchema = z.enum(["Active", "Draft", "Inactive"]);
export type Status = z.infer<typeof statusSchema>;

export const companySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type CompanySummary = z.infer<typeof companySummarySchema>;

export const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: categorySchema,
  company: companySummarySchema,
  status: statusSchema,
  durationMinutes: z.number().int().nonnegative(),
  basePriceCents: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Service = z.infer<typeof serviceSchema>;

export const sortableColumnSchema = z.enum([
  "name",
  "category",
  "company",
  "status",
  "duration",
  "basePrice",
]);
export type SortableColumn = z.infer<typeof sortableColumnSchema>;

export const sortDirSchema = z.enum(["asc", "desc"]);
export type SortDir = z.infer<typeof sortDirSchema>;

// Write DTOs ----------------------------------------------------------------
// Reasonable upper bounds so a typo on the client doesn't accept multi-MB
// payloads; matched to the schema column widths where applicable.

/** Whole day in minutes — caps Service.durationMinutes at 24h. */
export const MAX_DURATION_MINUTES = 60 * 24;
/** Cent-units cap. 100M cents = €1M — far above any sane service price. */
export const MAX_BASE_PRICE_CENTS = 100_000_000;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  category: categorySchema,
  companyId: z.string().uuid(),
  status: statusSchema,
  durationMinutes: z.coerce.number().int().min(1).max(MAX_DURATION_MINUTES),
  basePriceCents: z.coerce.number().int().min(0).max(MAX_BASE_PRICE_CENTS),
});
export type CreateServiceRequest = z.infer<typeof createServiceSchema>;

// PATCH: every field is optional. At least one field must be present so the
// caller can't accidentally PATCH with an empty body (silent no-op).
export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });
export type UpdateServiceRequest = z.infer<typeof updateServiceSchema>;

export const listServicesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  sortBy: sortableColumnSchema.optional(),
  sortDir: sortDirSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

export const servicesSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  drafts: z.number().int().nonnegative(),
  avgBasePriceCents: z.number().int().nonnegative().nullable(),
});
export type ServicesSummary = z.infer<typeof servicesSummarySchema>;

export const paginatedServicesSchema = z.object({
  data: z.array(serviceSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type PaginatedServices = z.infer<typeof paginatedServicesSchema>;

// --- display helpers (used by both web and API for any future formatting) ---

/** Single hardcoded currency per ADR 0001. */
export const CURRENCY = "EUR" as const;

/** Formats an integer cents value as "EUR 159.00". `null` becomes "—". */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const major = cents / 100;
  return `${CURRENCY} ${major.toFixed(2)}`;
}

/** Compact variant for headline cards: "EUR 159" (no decimals). */
export function formatMoneyCompact(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `${CURRENCY} ${Math.round(cents / 100)}`;
}

/** "90 min" under 60; "3 h 30 min" or "3 h" otherwise. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} h` : `${hours} h ${rem} min`;
}
