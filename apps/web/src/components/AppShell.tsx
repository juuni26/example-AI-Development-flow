import type { JSX, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/use-auth";
import { readAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useSidebarCollapsed } from "@/lib/use-sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: JSX.Element;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Services",
    icon: <Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />,
    active: true,
  },
];

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { auth, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  // The mobile sheet is a separate concern from the desktop collapse state.
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const roleLabel = auth?.user.role === "admin" ? "Administrator" : "Read-only";
  // Display name in the sidebar footer: the email local-part (e.g. `admin`
  // from `admin@cleandrop.test`). Matches the contract in CONTEXT.md.
  const displayName = auth?.user.email.split("@")[0] ?? "";

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile top bar — visible below md breakpoint */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-background/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">platform</span>
        <span className="h-9 w-9" aria-hidden="true" />
      </div>

      {/* Mobile off-canvas */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-64 transform border-r bg-background shadow-popover transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody
            collapsed={false}
            onToggle={undefined}
            navItems={NAV_ITEMS}
            displayName={displayName}
            roleLabel={roleLabel}
            signingOut={signingOut}
            onSignOut={onSignOut}
            onClose={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0  transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-[68px]" : "w-60",
        )}
        aria-label="Primary navigation"
      >
        <SidebarBody
          collapsed={collapsed}
          onToggle={toggle}
          navItems={NAV_ITEMS}
          displayName={displayName}
          roleLabel={roleLabel}
          signingOut={signingOut}
          onSignOut={onSignOut}
        />
      </aside>

      <main className="flex flex-1 flex-col px-4 pt-20 md:px-8 md:py-6">{children}</main>
    </div>
  );
}

interface SidebarBodyProps {
  collapsed: boolean;
  onToggle?: () => void;
  navItems: NavItem[];
  displayName: string;
  roleLabel: string;
  signingOut: boolean;
  onSignOut: () => void;
  onClose?: () => void;
}

function SidebarBody({
  collapsed,
  onToggle,
  navItems,
  displayName,
  roleLabel,
  signingOut,
  onSignOut,
  onClose,
}: SidebarBodyProps): JSX.Element {
  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <>
            <span className="text-sm font-semibold tracking-tight pl-8">platform</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Settings"
                title="Settings"
              >
                
              </button>
              {onToggle ? (
                <button
                  type="button"
                  onClick={onToggle}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label="Collapse sidebar"
                  aria-expanded={!collapsed}
                  title="Collapse sidebar"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              ) : null}
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:hidden"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Expand sidebar"
            aria-expanded={false}
            title="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Sections">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              collapsed && "justify-center px-0",
              item.active
                ? "bg-accent font-medium text-foreground shadow-soft-1"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {item.icon}
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </button>
        ))}
      </nav>

      <div className={cn("p-3", collapsed && "p-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${displayName} — open account menu`}
              className={cn(
                "flex w-full items-center rounded-md text-left transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                collapsed ? "justify-center p-2" : "gap-3 p-2",
              )}
            >
              <UserRound
                className="h-6 w-6 shrink-0 fill-foreground text-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {!collapsed ? (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                  <span className="truncate text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                    {roleLabel}
                  </span>
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={collapsed ? "right" : "top"}
            align={collapsed ? "start" : "end"}
            className="min-w-[200px]"
          >
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              <span className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                // Defer to next tick so the menu can finish closing before the
                // navigation away from the page happens.
                if (!signingOut) void Promise.resolve().then(onSignOut);
              }}
              disabled={signingOut}
              className="text-destructive focus:text-destructive data-[highlighted]:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
