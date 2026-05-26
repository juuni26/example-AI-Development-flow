import { z } from "zod";

// Known-default substrings. If any of these are present in JWT_SECRET while
// NODE_ENV=production, we refuse to boot. Production callers must supply a
// fresh secret. The dev defaults exist in .env.example for local convenience.
const KNOWN_DEFAULT_SECRET_MARKERS = ["change-me", "dev-secret", "for-real-use", "example"];

/**
 * Validated at app bootstrap. Any missing or malformed env var crashes the
 * process immediately with a readable Zod report — better than discovering
 * a missing JWT_SECRET on the first login attempt.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    ACCESS_TOKEN_TTL: z.string().default("15m"),

    // Parsed to milliseconds at boot. Accepted suffixes: s, m, h, d.
    // Default "7d" matches the original hardcoded constant.
    REFRESH_TOKEN_TTL: z
      .string()
      .default("7d")
      .transform((raw, ctx) => {
        const ms = parseDurationMs(raw);
        if (ms === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid duration "${raw}". Expected e.g. "7d", "12h", "30m", "60s".`,
          });
          return z.NEVER;
        }
        return ms;
      }),

    // Comma-separated CORS allowlist. Empty/unset means "deny cross-origin"
    // — same-origin Postman/curl still works since CORS only applies to
    // browser fetches with a non-null Origin header.
    WEB_ORIGINS: z
      .string()
      .default("http://localhost:8080,http://localhost:5173")
      .transform((s) =>
        s
          .split(",")
          .map((o) => o.trim())
          .filter((o) => o.length > 0),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    const lower = env.JWT_SECRET.toLowerCase();
    for (const marker of KNOWN_DEFAULT_SECRET_MARKERS) {
      if (lower.includes(marker)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: `JWT_SECRET appears to be a development default (contains "${marker}"); refusing to boot with NODE_ENV=production`,
        });
        return;
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[config] invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}

/** Forces the next loadEnv() to re-read process.env. Tests only. */
export function __resetEnvCacheForTesting(): void {
  cached = null;
}

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses durations like "7d", "12h", "30m", "60s" to milliseconds. */
function parseDurationMs(raw: string): number | null {
  const match = /^(\d+)\s*([smhd])$/.exec(raw.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * UNIT_MS[match[2]];
}
