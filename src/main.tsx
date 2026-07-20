import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import axios from "axios";

import App from "./App";
import { TooltipProvider } from "./components/ui/Tooltip";
import "./index.css";

// ---------------------------------------------------------------------------
// Query client — one for the whole app. Sensible admin defaults:
// - 30s staleTime so nav-back is instant while a background revalidate runs
// - no refetch-on-window-focus (annoying when ops tab away for a call)
// - two retries on transient 5xx, none on 4xx or aborts
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        if (axios.isCancel(error)) return false;
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500) return false;
        }
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={400} skipDelayDuration={300}>
          <App />
        </TooltipProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-card !text-foreground !border !border-border !shadow-elevated",
              description: "!text-muted-foreground",
            },
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>
);
