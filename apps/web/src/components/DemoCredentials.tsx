import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Account {
  role: "admin" | "user";
  label: string;
  email: string;
  password: string;
  description: string;
}

const ACCOUNTS: Account[] = [
  {
    role: "admin",
    label: "Administrator",
    email: "admin@cleandrop.test",
    password: "Cleandrop!Admin-2026",
    description: "Full CRUD on the catalog",
  },
  {
    role: "user",
    label: "Read-only user",
    email: "user@cleandrop.test",
    password: "Cleandrop!User-2026",
    description: "Browse-only access",
  },
];

interface DemoCredentialsProps {
  onUse?: (account: { email: string; password: string }) => void;
}

export function DemoCredentials({ onUse }: DemoCredentialsProps): JSX.Element {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Demo accounts
        </span>
        <Badge variant="muted" className="text-[10px] uppercase tracking-wide">
          Test
        </Badge>
      </div>
      <div className="grid gap-2">
        {ACCOUNTS.map((acc) => (
          <AccountRow key={acc.role} account={acc} onUse={onUse} />
        ))}
      </div>
    </div>
  );
}

function AccountRow({
  account,
  onUse,
}: {
  account: Account;
  onUse?: (account: { email: string; password: string }) => void;
}): JSX.Element {
  return (
    <div className="group rounded-md border border-border/60 bg-background p-2.5 transition-shadow hover:shadow-soft-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {account.role === "admin" ? (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-foreground/70" aria-hidden="true" />
          ) : (
            <User className="h-3.5 w-3.5 shrink-0 text-foreground/70" aria-hidden="true" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/80">
              {account.label}
            </span>
            <span className="truncate text-[10.5px] text-muted-foreground">
              {account.description}
            </span>
          </div>
        </div>
        {onUse ? (
          <button
            type="button"
            onClick={() => onUse({ email: account.email, password: account.password })}
            className="rounded text-[11px] font-medium text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Use
          </button>
        ) : null}
      </div>
      <div className="mt-1.5 grid gap-1">
        <CopyableField label="Email" value={account.email} />
        <CopyableField label="Password" value={account.password} mono />
      </div>
    </div>
  );
}

function CopyableField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`, { duration: 1500 });
    } catch {
      toast.error("Copy failed — your browser blocked clipboard access");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <code
        className={cn(
          "flex-1 truncate rounded bg-muted/70 px-1.5 py-0.5 text-xs text-foreground/90",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
        aria-pressed={copied}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded transition-all",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="sr-only" aria-live="polite">
          {copied ? `${label} copied` : ""}
        </span>
      </button>
    </div>
  );
}
