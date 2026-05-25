import type { JSX, ReactNode } from "react";
import { Sparkles, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { readAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface NavItem {
  label: string;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [{ label: "Services", active: true }];

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { auth, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async (): Promise<void> => {
    if (signingOut) return;
    setSigningOut(true);
    const snapshot = readAuth();
    try {
      if (snapshot) await api.post("/auth/logout", { refreshToken: snapshot.refreshToken });
    } catch {
      // Best-effort revocation; we still clear local state on network failure.
    } finally {
      signOut();
      navigate("/login", { replace: true });
    }
  };

  const emailLocal = auth?.user.email.split("@")[0] ?? "";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight">platform</span>
          <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={[
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                item.active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              ].join(" ")}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold uppercase text-background">
              {emailLocal.slice(0, 1) || "·"}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium leading-tight">{emailLocal || "—"}</span>
              <span className="text-xs capitalize text-muted-foreground">
                {auth?.user.role ?? ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-8 py-6">{children}</main>
    </div>
  );
}
