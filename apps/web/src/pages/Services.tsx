import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@cleandrop/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ServicesPage(): JSX.Element {
  const { auth, signOut } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calls /me on mount to prove the token is valid against the API and to
  // pick up any drift between the cached user and the server's view.
  useEffect(() => {
    let cancelled = false;
    api
      .get<User>("/me")
      .then((r) => {
        if (!cancelled) setMe(r.data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSignOut = (): void => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">Manage your service catalog</p>
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut}>
          Sign out
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="Email" value={me?.email ?? auth?.user.email ?? "—"} />
          <Row label="Role" value={me?.role ?? auth?.user.role ?? "—"} />
          <Row label="User id" value={(me?.id ?? auth?.user.id ?? "—") as string} mono />
          {error ? <Row label="/me error" value={error} /> : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Catalog table, filters, sorting, and admin actions land in subsequent slices. This page
        currently proves the protected route and the /me round-trip.
      </p>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value}</dd>
    </div>
  );
}
