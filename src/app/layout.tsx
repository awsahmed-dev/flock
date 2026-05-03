import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { PushNotificationInit } from "@/components/pwa/push-notification-init";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#5b3eec",
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
  title: "Flock — Plan trips together",
  description:
    "The place where group travel decisions get made and remembered. Plan itineraries, vote on options, and split expenses with your crew.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flock",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "Flock — Plan trips together",
    description: "Group travel planning. Itinerary, votes, expenses — all in one place.",
    siteName: "Flock",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Flock" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>
          {children}
          <PushNotificationInit />
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
