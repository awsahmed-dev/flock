import { LegalShell } from "@/components/legal/legal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service", // the layout template adds " · Sawia"
  description: "The terms that govern your use of Sawia.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="September 25, 2026">
      <p>
        These terms govern your use of Sawia (sawia.paxawa.com), a group trip
        planning app operated by Paxawa. &ldquo;We&rdquo; and &ldquo;us&rdquo;
        mean Paxawa. By creating an account or joining a trip as a guest, you
        agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use
        Sawia.
      </p>

      <h2>Who can use Sawia</h2>
      <p>
        You must be at least 13 years old, or older if the age of digital
        consent where you live is higher. You&rsquo;re responsible for keeping
        your account secure.
      </p>

      <h2>Your content</h2>
      <p>
        Anything you add to Sawia — trip names, stops, expenses, messages,
        documents, photos — belongs to you. By adding it, you give us a
        limited permission to store and show it, only to run Sawia for you
        and the people in your trip.
      </p>
      <p>
        Don&rsquo;t upload content you don&rsquo;t have the right to share,
        content that&rsquo;s illegal, or content that infringes someone
        else&rsquo;s rights. We may remove content that breaks these terms.
      </p>

      <h2>Group trips and who sees what</h2>
      <p>
        Sawia is built for planning together. When you join a trip, the other
        members can see what you add to it — your name, your expenses, your
        messages, your stops. If the trip owner turns on a public share link,
        the itinerary can be seen by anyone with that link. Don&rsquo;t put
        sensitive information in a trip that has a public link.
      </p>

      <h2>Money and payments</h2>
      <p>
        Sawia is currently free. If we introduce paid features, we&rsquo;ll
        tell you what they cost before you&rsquo;re ever charged, and the free
        version will stay available.
      </p>
      <p>
        Sawia does <strong>not</strong> move money between trip members.
        Balances and splits are a record to help you keep track. If you owe a
        friend, you settle it outside Sawia — by bank transfer, a payment app,
        or cash. Marking a debt as settled in Sawia reflects something that
        already happened.
      </p>

      <h2>Bookings and links to other services</h2>
      <p>
        Sawia helps you plan; it doesn&rsquo;t sell travel. When Sawia links
        you to another service — for example Booking.com to find a place to
        stay — anything you book there is an agreement between you and that
        service. Its prices, availability, cancellation rules and support are
        its own, and Sawia is not a party to the booking.
      </p>
      <p>
        Some links to Booking.com are affiliate links: if you book through
        one, Booking.com may pay Paxawa a commission. This costs you nothing
        extra and never changes what Sawia recommends. We always label these
        links in the app.
      </p>

      <h2>AI features</h2>
      <p>
        Sawia uses Anthropic&rsquo;s Claude to draft trip plans, read receipt
        photos, read booking emails you forward, and make suggestions. When
        you use these features, the content needed for the task is sent to
        Anthropic and the result is sent back. See{" "}
        <a
          href="https://www.anthropic.com/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anthropic&rsquo;s privacy policy
        </a>{" "}
        for how they handle it.
      </p>
      <p>
        AI suggestions can be wrong. Opening hours, prices, travel times and
        entry requirements change — check anything important with the source
        before you rely on it, especially visas, flights and bookings.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&rsquo;t try to get into other people&rsquo;s trips or accounts.</li>
        <li>Don&rsquo;t scrape Sawia, automate it, or use it to send spam.</li>
        <li>Don&rsquo;t try to get around usage limits or our security.</li>
        <li>Don&rsquo;t pretend to be someone else.</li>
      </ul>

      <h2>Ending your account</h2>
      <p>
        You can have your account deleted at any time by emailing{" "}
        <a href="mailto:hello@paxawa.com">hello@paxawa.com</a> from the
        address on your account. We delete it, and every trip you solely own,
        within 30 days. Trips you share with others stay available to the
        other members. We may suspend or close accounts that break these
        terms.
      </p>

      <h2>No guarantees</h2>
      <p>
        Sawia is provided &ldquo;as is&rdquo;. We work hard to keep it running
        and accurate, but we can&rsquo;t guarantee it will always be available
        or error-free. As far as the law allows, we aren&rsquo;t responsible
        for indirect losses — such as a missed flight, a lost booking, or a
        trip that didn&rsquo;t go to plan.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. Important changes will be announced in the
        app or by email. If you keep using Sawia after a change, you accept
        the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:hello@paxawa.com">hello@paxawa.com</a>.
      </p>
    </LegalShell>
  );
}
