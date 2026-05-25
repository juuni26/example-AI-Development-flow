import type { JSX } from "react";
import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { LoginPage } from "@/pages/Login";
import { ServicesPage } from "@/pages/Services";
import { RequireAuth } from "@/routes/RequireAuth";
import { onSessionExpired } from "@/lib/api";

export function App(): JSX.Element {
  const navigate = useNavigate();

  // When axios sees a 401, drop the user back at /login with a `next` hint
  // pointing at whatever they were trying to do.
  useEffect(() => {
    return onSessionExpired(() => {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?next=${next}`, { replace: true });
    });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/services" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/services"
        element={
          <RequireAuth>
            <ServicesPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/services" replace />} />
    </Routes>
  );
}
