import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { PushNotificationInit } from "@/components/pwa/push-notification-init";
import { getLocale, getDictionary, isRtl } from "@/lib/i18n";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { setActiveLocale } from "@/lib/i18n/date-fns";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // interactive-widget=resizes-content makes the visual viewport (and 100dvh)
  // shrink when the soft keyboard opens. Without it, fixed-position chat
  // inputs render behind the keyboard on mobile browsers.
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Paxawa — Plan trips together",
  description:
    "The place where group travel decisions get made and remembered. Plan itineraries, vote on options, and split expenses with your crew.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paxawa",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Paxawa — Plan trips together",
    description: "Group travel planning. Itinerary, votes, expenses — all in one place.",
    siteName: "Paxawa",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // B15: locale + RTL handling. Cookie-driven; falls back to
  // Accept-Language sniff on first visit. The Provider hands the
  // already-loaded dictionary to every client component below.
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const dir = isRtl(locale) ? "rtl" : "ltr";
  // B15-d: prime the module-level date-fns locale so format() in
  // server components uses Arabic month/day names when ar is active.
  setActiveLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} h-full antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paxawa" />
        {/* B7c-fix: Mapbox CSS served from their CDN, server-rendered into
            the head so it's already applied when MapboxPlanMap's first
            paint runs. Async runtime injection ran too late — Mapbox's
            init detected missing CSS and rendered a styleless canvas
            that never recovered. 36KB, cached cross-trip. */}
        <link
          rel="stylesheet"
          href="https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans overflow-x-hidden max-w-full">
        <LocaleProvider locale={locale} dict={dict}>
          <Providers>
            {children}
            <PushNotificationInit />
          </Providers>
          <Toaster richColors position="top-right" />
        </LocaleProvider>
      </body>
    </html>
  );
}
