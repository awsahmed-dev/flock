"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { SentryUserContext } from "./sentry-user-context";
import { PostHogProvider } from "@/lib/analytics/posthog-client";
import { CookieBanner } from "./legal/cookie-banner";
import { SessionKeeper } from "./session-keeper";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    // Theme Schism fix (§10.1): Paxawa is dark-first. `class` attribute puts
    // `dark` on <html>; storageKey persists the user's toggle under
    // `paxawa-theme` (the key the design brief mandates). No `system` —
    // default is dark everywhere, light is an explicit opt-in, zero
    // per-page forcing. next-themes injects a blocking pre-paint script
    // that reads localStorage so there's no flash of wrong theme.
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="paxawa-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <PostHogProvider>
          <SentryUserContext />
          <SessionKeeper />
          {children}
          <CookieBanner />
          <ReactQueryDevtools initialIsOpen={false} />
        </PostHogProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
