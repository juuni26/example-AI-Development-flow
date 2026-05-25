import type { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/use-auth";

export function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
