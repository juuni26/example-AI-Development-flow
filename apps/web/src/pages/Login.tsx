import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { loginRequestSchema, type LoginRequest, type LoginResponse } from "@cleandrop/shared";
import { api } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";
import { useAuth } from "@/lib/use-auth";
import { DemoCredentials } from "@/components/DemoCredentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginPage(): JSX.Element {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // A logged-in user landing on /login bounces straight to their target.
  useEffect(() => {
    if (auth) navigate(next, { replace: true });
  }, [auth, navigate, next]);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async (values: LoginRequest): Promise<void> => {
    setFormError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", values);
      setAuth({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });
      navigate(next, { replace: true });
    } catch {
      // The README is explicit: never reveal which field was wrong.
      setFormError("Invalid email or password");
    }
  };

  const onSubmit = form.handleSubmit(submit);

  const onUseDemo = (account: { email: string; password: string }): void => {
    form.setValue("email", account.email, { shouldDirty: true });
    form.setValue("password", account.password, { shouldDirty: true });
    setFormError(null);
    void form.handleSubmit(submit)();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      {/* Subtle radial backdrop so the card has somewhere to sit. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--accent))_0%,transparent_60%)] opacity-60"
      />
      <Card className="relative w-full max-w-sm shadow-soft-2">
        <CardHeader className="space-y-1.5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Sign in to Cleandrop</CardTitle>
          <CardDescription>Use your Cleandrop credentials to continue.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Show
                    </>
                  )}
                </button>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {formError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </div>
            ) : null}
            <DemoCredentials onUse={onUseDemo} />
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                "Signing in…"
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Sign in
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
