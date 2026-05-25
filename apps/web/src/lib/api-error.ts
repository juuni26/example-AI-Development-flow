import { AxiosError } from "axios";

interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export interface ParsedApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Reads either a NestJS HttpException response shape
 *   { statusCode, message, error }
 * or a nestjs-zod ZodValidationException
 *   { statusCode: 400, errors: ZodIssue[], message }
 * and flattens it into something the UI can use directly.
 */
export function parseApiError(error: unknown): ParsedApiError {
  if (!(error instanceof AxiosError) || !error.response) {
    return { message: error instanceof Error ? error.message : "Unknown error" };
  }
  const body = error.response.data as Record<string, unknown> | string | undefined;
  if (typeof body === "string") return { message: body };
  if (!body) return { message: error.message };

  const message =
    typeof body.message === "string" ? body.message : `Request failed (${error.response.status})`;

  const rawErrors = body.errors ?? (body as { issues?: unknown }).issues;
  if (Array.isArray(rawErrors)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of rawErrors as ZodIssue[]) {
      const key = (issue.path ?? []).map(String).join(".");
      if (key) fieldErrors[key] = issue.message;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { message, fieldErrors };
    }
  }
  return { message };
}
