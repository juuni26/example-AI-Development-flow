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
