import { LegalShell } from "@/components/legal/legal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy", // the layout template adds " · Sawia"
  description:
    "What data Sawia collects, how it's used, who it's shared with, and your rights over it.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="September 25, 2026">
      <p>
        This policy explains what data Sawia collects, why, and what control
        you have over it. Sawia (sawia.paxawa.com) is a group trip planning
        app operated by Paxawa. &ldquo;We&rdquo; and &ldquo;us&rdquo; mean
        Paxawa. We try to keep this short and in plain language.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Account data.</strong> When you sign up with email or Google,
        we store your email address, the display name you choose, and a
        unique user ID. If you join a trip as a guest without an email, we
        store only your display name and create a placeholder address so the
        account can exist.
      </p>
      <p>
        <strong>Trip data.</strong> Trip names, destinations, dates, the
        route between cities, itinerary stops, votes, expenses, packing
        lists, chat messages, uploaded documents and photos, receipt photos
        you scan, and booking confirmation emails you forward to your
        trip&rsquo;s address. This is what makes up the planning. It is stored
        in our database in Tokyo, Japan.
      </p>
      <p>
        <strong>Your location — only if you allow it.</strong> If you give
        the app permission, your device&rsquo;s location is used while the app
        is open to show where you are on the map and to find places near you.
        To do that, it is sent to Google for the nearby search. We don&rsquo;t
        store your location in our database or keep a history of where
        you&rsquo;ve been. You can turn this off at any time in your browser
        or phone settings.
      </p>
      <p>
        <strong>Push notification data.</strong> If you turn on
        notifications, we store the address your browser or phone gives us
        for delivering them. We don&rsquo;t read or analyse it — it is only
        routing data.
      </p>
      <p>
        <strong>Operational data.</strong> Error reports, uptime and speed
        metrics, and — only after you accept the cookie banner —
        product-analytics events. Analytics records actions (signed up,
        created a trip, opened a vote), not what you wrote inside them.
      </p>

      <h2>What we don&rsquo;t do</h2>
      <ul>
        <li>We don&rsquo;t sell your data.</li>
        <li>We don&rsquo;t train AI models on your trip content.</li>
        <li>We don&rsquo;t use advertising cookies or track you across other websites.</li>
        <li>
          We don&rsquo;t handle money between trip members. Expense balances
          in Sawia are a record, not a payment.
        </li>
      </ul>

      <h2>Who we share data with</h2>
      <p>
        We use a small set of service providers. Each receives only what it
        needs to do its job:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, sign-in, and file storage.
          Our main data store, hosted in Tokyo, Japan.
        </li>
        <li>
          <strong>Vercel</strong> — hosts the app.
        </li>
        <li>
          <strong>Anthropic (Claude)</strong> — powers the AI trip planner,
          reads receipt photos you scan, reads booking emails you forward,
          and writes budget and trip suggestions. Only the content needed for
          that task is sent. Anthropic does not train its models on this
          data.
        </li>
        <li>
          <strong>Google Maps Platform</strong> — place search, place
          details, ratings and photos, and nearby places. Receives what you
          search for, the places in your trip, and your location if you
          allowed it.
        </li>
        <li>
          <strong>Mapbox</strong> — draws the maps. Receives the area of the
          map being shown.
        </li>
        <li>
          <strong>OpenStreetMap (Nominatim)</strong> — turns a destination
          name into a point on the map. Receives the destination name.
        </li>
        <li>
          <strong>Open-Meteo</strong> — weather for your trip. Receives the
          destination&rsquo;s coordinates and dates.
        </li>
        <li>
          <strong>ExchangeRate-API</strong> — currency rates for expenses.
          Receives no personal data.
        </li>
        <li>
          <strong>Unsplash</strong> — cover photos for destinations. Receives
          the destination name.
        </li>
        <li>
          <strong>Resend</strong> — sends email (invites and alerts) and
          receives the booking emails you forward to your trip.
        </li>
        <li>
          <strong>Sentry</strong> — error monitoring. Receives error details
          with your user ID, but not your email or trip content, so we can
          fix what broke for you.
        </li>
        <li>
          <strong>PostHog</strong> — product analytics. Only after you accept
          the cookie banner.
        </li>
        <li>
          <strong>CJ Affiliate</strong> — tracks Booking.com affiliate links.
          Only when you tap one: it receives the click, the usual details any
          website gets from your browser, and a reference code, and it sets
          its own cookies. See below.
        </li>
      </ul>

      <h2>Links to Booking.com</h2>
      <p>
        Sawia may show links to Booking.com to help your group find a place
        to stay. Some of these are affiliate links: if you book through one,
        Booking.com may pay Paxawa a commission. This costs you nothing extra,
        and it never changes what Sawia recommends or the order it shows
        things in.
      </p>
      <p>
        These links are run through{" "}
        <strong>CJ Affiliate</strong> (Commission Junction), the network
        Booking.com uses for its affiliate programme. When you tap one, we
        record that it was used — which trip, which part of the app, and when
        — so we can match it against the reports we receive. Your browser
        then passes briefly through CJ, which records the click and may set
        cookies on your device so that, if you book, the booking can be
        credited to Sawia. Then you arrive at Booking.com.
      </p>
      <p>
        The link carries only the city, dates, number of people and rooms,
        your currency and language, and a reference code. It does not carry
        your name, email, or anything you wrote in Sawia. From that point,{" "}
        <a href="https://www.cj.com/legal/privacy" target="_blank" rel="noopener noreferrer">
          CJ&rsquo;s privacy policy
        </a>{" "}
        and{" "}
        <a
          href="https://www.booking.com/content/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Booking.com&rsquo;s privacy policy
        </a>{" "}
        apply, along with their own cookies.
      </p>

      <h2>Cookies and local storage</h2>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> keep you signed in. Required for
          the app to work.
        </li>
        <li>
          <strong>Preferences</strong> — theme, language, and small
          conveniences like a dismissed tip — are stored on your device.
          Required for the app to work as you set it.
        </li>
        <li>
          <strong>Offline copies</strong> of your current day are stored on
          your device when you use Pocket Day, so the plan still opens without
          signal.
        </li>
        <li>
          <strong>Analytics cookies</strong> from PostHog. Optional — you
          choose in the cookie banner.
        </li>
        <li>
          <strong>CJ Affiliate and Booking.com</strong> set their own cookies
          when you follow a Booking.com link from Sawia — CJ to credit the
          booking, Booking.com for its own site. Those are theirs, not ours,
          and Sawia can&rsquo;t read them.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>
          <strong>See and edit</strong> what we hold about you, through the
          app.
        </li>
        <li>
          <strong>Get a copy</strong> of your data — email{" "}
          <a href="mailto:hello@paxawa.com">hello@paxawa.com</a> and we&rsquo;ll
          send it to you.
        </li>
        <li>
          <strong>Delete your account.</strong> Email{" "}
          <a href="mailto:hello@paxawa.com">hello@paxawa.com</a> from the
          address on your account and we&rsquo;ll delete your account and every
          trip you solely own within 30 days. Trips you share with others stay
          available to the other members.
        </li>
        <li>
          <strong>Object or ask for a correction</strong> by emailing us.
        </li>
      </ul>
      <p>
        If you are in the EU or UK, you also have rights under the GDPR,
        including the right to complain to your local data-protection
        authority.
      </p>

      <h2>How long we keep data</h2>
      <p>
        We keep your data while your account is active. When an account is
        deleted, its data is permanently removed within 30 days. Error logs
        and operational metrics are kept for up to 90 days.
      </p>

      <h2>Security</h2>
      <p>
        Every table in our database is protected by row-level security, so
        people can only read and change the trips they belong to. All
        connections are encrypted, and our service keys and secrets are
        stored encrypted.
      </p>

      <h2>Children</h2>
      <p>
        Sawia is not meant for children under 13, and we don&rsquo;t knowingly
        collect their data. If you believe a child has made an account, email
        us and we will delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We&rsquo;ll update this page when we change how we handle data.
        Important changes will be announced in the app or by email.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions, data requests, or concerns:{" "}
        <a href="mailto:hello@paxawa.com">hello@paxawa.com</a>.
      </p>
    </LegalShell>
  );
}
