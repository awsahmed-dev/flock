import { LegalShell } from "@/components/legal/legal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Paxawa",
  description:
    "What data Paxawa collects, how we use it, and your rights over it.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="May 13, 2026">
      <p>
        This policy describes what data Paxawa collects, why, and what control
        you have. We try to keep it short and in plain language.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Account data.</strong> When you sign up (email or Google
        OAuth) we store your email, a display name you choose, and a unique
        user ID. Guest joiners may provide only a display name.
      </p>
      <p>
        <strong>Trip data.</strong> Trip names, destinations, dates, itinerary
        items, votes, expenses, packing items, chat messages, and uploaded
        documents — all the stuff that makes up the planning. Stored in our
        Supabase Postgres database in Tokyo (hnd1).
      </p>
      <p>
        <strong>Device data for push notifications.</strong> When you opt in
        to web push, we store the browser-provided push endpoint and
        encryption keys so we can deliver notifications. We don't read or
        analyze them — they're just routing data.
      </p>
      <p>
        <strong>Operational data.</strong> Anonymous error reports (via{" "}
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sentry
        </a>
        ), uptime / latency metrics (via Vercel), and — once you accept the
        cookie banner — product-analytics events (via{" "}
        <a
          href="https://posthog.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          PostHog
        </a>
        ). Analytics tracks aggregate actions (signed up, created a trip,
        opened a vote) — not what you wrote inside them.
      </p>

      <h2>What we don't collect</h2>
      <ul>
        <li>We don't sell your data.</li>
        <li>We don't train AI models on your trip content.</li>
        <li>We don't track you across other websites or use advertising cookies.</li>
        <li>
          We don't collect payment information — Paxawa doesn't process
          payments between members.
        </li>
      </ul>

      <h2>Who we share data with</h2>
      <p>
        We use a small set of trusted infrastructure providers, each of whom
        receives only the data they need to do their job:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file
          storage. Our primary data store.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting and edge network.
        </li>
        <li>
          <strong>Anthropic (Claude API)</strong> — AI itinerary planner,
          smart action chips, and budget nudges. Only the relevant prompt is
          sent; Anthropic does not train on your inputs by default.
        </li>
        <li>
          <strong>Resend</strong> — transactional email delivery (invites,
          vote alerts, expense alerts).
        </li>
        <li>
          <strong>Sentry</strong> — error monitoring. We send error details
          including your user ID (no email, no content), so we can debug
          what broke for you specifically.
        </li>
        <li>
          <strong>PostHog</strong> — product analytics. Only after you accept
          the cookie banner.
        </li>
        <li>
          <strong>Google (Places API)</strong> — geocoding location names you
          add to itinerary items.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a few cookies:
      </p>
      <ul>
        <li>
          <strong>Session cookies</strong> from Supabase to keep you signed
          in. Required for the app to work.
        </li>
        <li>
          <strong>Theme preference</strong> (light / dark / system) stored
          locally. Required for the app to work.
        </li>
        <li>
          <strong>Analytics cookies</strong> from PostHog. Optional — you
          control these via the cookie banner.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can:
      </p>
      <ul>
        <li>
          <strong>View and edit</strong> everything we hold about you through
          the app itself.
        </li>
        <li>
          <strong>Export</strong> your data — email{" "}
          <a href="mailto:hello@paxawa.com">hello@paxawa.com</a> and we'll
          send you a JSON dump.
        </li>
        <li>
          <strong>Delete your account</strong> at any time from Settings.
          Deletion removes your profile and all trips you solely own.
        </li>
        <li>
          <strong>Object to processing</strong> or ask for correction by
          emailing us.
        </li>
      </ul>
      <p>
        If you're in the EU/UK, you have GDPR rights including the right to
        lodge a complaint with your local data-protection authority.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your data as long as your account is active. Deleted accounts
        and their content are permanently removed within 30 days. Error logs
        and operational metrics are retained for up to 90 days.
      </p>

      <h2>Security</h2>
      <p>
        We use Row Level Security on every database table so users can only
        read and write data they're authorized to access. All connections
        are TLS-encrypted, and access tokens are encrypted at rest.
        Webhook secrets, API keys, and OAuth state are stored as encrypted
        environment variables.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We'll update this page when we change how we handle data. Material
        changes get announced in-app or by email.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions, data requests, or concerns:{" "}
        <a href="mailto:hello@paxawa.com">hello@paxawa.com</a>.
      </p>
    </LegalShell>
  );
}
