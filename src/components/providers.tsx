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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
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
