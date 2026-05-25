import type { JSX } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-soft-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist, has moved, or you don't have access to it.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="default">
            <Link to="/services">
              <ArrowLeft className="h-4 w-4" />
              Back to catalog
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
