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

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

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
