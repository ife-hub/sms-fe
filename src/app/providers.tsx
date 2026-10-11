"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { bootstrapSession, getStatus } from "@/lib/api";
import { Spinner } from "@/components/ui/feedback";

let bootPromise: Promise<void> | null = null;

/** Start the mock API (when enabled), then try to restore the session from the refresh cookie. */
function boot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
        const { worker } = await import("@/mocks/browser");
        await worker.start({ onUnhandledRequest: "bypass", quiet: true });
      }
      await bootstrapSession();
    })();
  }
  return bootPromise;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => {
              const status = getStatus(error);
              if (status && status >= 400 && status < 500) return false;
              return count < 2;
            },
          },
        },
      }),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    boot().finally(() => setReady(true));
  }, []);

  return (
    <QueryClientProvider client={client}>
      {ready ? (
        children
      ) : (
        <div className="grid min-h-screen place-items-center">
          <Spinner label="Starting up" />
        </div>
      )}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
