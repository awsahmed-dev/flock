import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RouteToastReset } from "@/components/ui/route-toast-reset";
import { Providers } from "@/components/providers";
import { NavigationTracker } from "@/components/navigation/navigation-tracker";
import { PushNotificationInit } from "@/components/pwa/push-notification-init";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { RegisterSW } from "@/components/pwa/register-sw";
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

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://paxawa.com";

export const metadata: Metadata = {
  // Required so OG image / canonical / alternates URLs resolve absolutely.
  // Without it, Next emits relative URLs in <head> which Twitter/Facebook
  // crawlers won't follow.
  metadataBase: new URL(SITE_URL),
  // Title template: every sub-page can set its own title and it'll
  // automatically suffix " · Paxawa". Pages can opt out with title.absolute.
  title: {
    default: "Paxawa — Plan group trips, vote together, split expenses",
    template: "%s · Paxawa",
  },
  description:
    "Paxawa is where group travel decisions get made and remembered. Plan a shared itinerary, vote on options, split multi-currency expenses, and pack as a crew — without the WhatsApp chaos.",
  applicationName: "Paxawa",
  keywords: [
    "group travel planning",
    "split expenses with friends",
    "trip itinerary app",
    "group trip planner",
    "vacation expense splitter",
    "multi-currency expense tracker",
    "travel voting app",
    "group packing list",
    "AI trip planner",
  ],
  authors: [{ name: "Paxawa" }],
  creator: "Paxawa",
  publisher: "Paxawa",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paxawa",
  },
  formatDetection: { telephone: false },
  alternates: {
    canonical: "/",
    // B26-r2: hreflang for the two locales we support. Tells Google
    // which version to surface in EN vs AR SERPs. x-default points to
    // the canonical / so locale-agnostic crawlers don't 404 on a
    // missing /en. We keep one URL per locale and switch content
    // server-side via the cookie + Accept-Language sniff in lib/i18n.
    languages: {
      en: "/",
      ar: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Paxawa — Plan group trips, vote together, split expenses",
    description:
      "Group travel planning that doesn't end in three split conversations and a spreadsheet. Itinerary, votes, multi-currency expenses, packing — all in one place.",
    siteName: "Paxawa",
    locale: "en_US",
    // og:image is injected automatically by src/app/opengraph-image.tsx
    // — Next discovers the file convention and renders the meta tag at
    // build time. Listing a static /og-default.png here on top would
    // produce duplicate <meta> tags and Facebook/Twitter would pick
    // arbitrarily between them.
  },
  twitter: {
    card: "summary_large_image",
    title: "Paxawa — Plan group trips, vote together, split expenses",
    description:
      "Itinerary, votes, multi-currency expenses, packing — all in one place. Free to start.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // B26-r2: search-engine ownership verification. Codes come from env
  // so we can ship them per-deploy without committing the values.
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION + NEXT_PUBLIC_BING_SITE_VERIFICATION
  // in Vercel project settings; both are public anyway (they end up
  // verbatim in <head>).
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "",
    },
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
            <NavigationTracker />
            <PushNotificationInit />
            <OfflineBanner />
            <RegisterSW />
          </Providers>
          {/* §11-F: one toast queue, bottom-centered above the nav pill. */}
          <RouteToastReset />
          <Toaster
            richColors
            duration={4000}
            position="bottom-center"
            offset={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
            mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
