import { z } from "zod";

export const roleSchema = z.enum(["admin", "user"]);
export type Role = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
});
export type User = z.infer<typeof userSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// The token-bearing portion of any auth response.
export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const loginResponseSchema = authTokensSchema.extend({
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const refreshResponseSchema = authTokensSchema;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

// JWT access-token payload. `sub` is the user id, kept as a string for
// portability across signing libraries.
export const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
});
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
