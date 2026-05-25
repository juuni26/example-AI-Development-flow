import { useEffect, useState } from "react";
import { SHARED_PACKAGE_NAME } from "@cleandrop/shared";

type HealthResponse = { status: string; shared: string };

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/healthz`)
      .then((r) => {
        if (!r.ok) throw new Error(`api responded ${r.status}`);
        return r.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cleandrop scaffold</h1>
      <p className="text-sm text-neutral-600">
        Monorepo, Docker, and the cross-stack shared package are wired. Real domain
        slices land in subsequent issues.
      </p>
      <dl className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Shared package</dt>
          <dd className="font-mono">{SHARED_PACKAGE_NAME}</dd>
        </div>
        <div className="mt-2 flex justify-between">
          <dt className="text-neutral-500">API health</dt>
          <dd className="font-mono">
            {health ? `${health.status} (${health.shared})` : error ? `error: ${error}` : "checking…"}
          </dd>
        </div>
        <div className="mt-2 flex justify-between">
          <dt className="text-neutral-500">API URL</dt>
          <dd className="font-mono">{API_URL}</dd>
        </div>
      </dl>
    </main>
  );
}
