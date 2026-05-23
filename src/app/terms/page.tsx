import { LegalShell } from "@/components/legal/legal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Paxawa",
  description: "The terms that govern your use of Paxawa.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="May 13, 2026">
      <p>
        These terms govern your use of Paxawa (paxawa.com) — a group travel
        planning service operated by the Paxawa team. By creating an account or
        joining a trip as a guest, you agree to these terms. If you don't
        agree, please don't use Paxawa.
      </p>

      <h2>Who can use Paxawa</h2>
      <p>
        You must be at least 13 years old. If you live in a country where the
        digital-consent age is higher, you must meet that age. You're
        responsible for keeping your account credentials secure.
      </p>

      <h2>Your content</h2>
      <p>
        Anything you add to Paxawa — trip names, itinerary items, expenses,
        chat messages, documents, photos — belongs to you. By uploading it,
        you grant us a limited license to store and display it for the purpose
        of running the service for you and the trip members you've invited.
      </p>
      <p>
        Don't upload content you don't have the right to share, content that's
        illegal, or content that infringes someone else's rights. We can
        remove content that violates these terms.
      </p>

      <h2>Group trips and shared visibility</h2>
      <p>
        Paxawa is collaborative. When you join a trip, other members of that
        trip can see what you contribute — your name, the expenses you log,
        the messages you send, the items you add. When the trip owner enables
        a public share link, the itinerary becomes visible to anyone with the
        link. Don't share sensitive information through public share links.
      </p>

      <h2>Payments</h2>
      <p>
        Paxawa is currently free. If we introduce paid features, we'll notify
        you and give you a chance to decline before any charge.
      </p>
      <p>
        Paxawa does <strong>not</strong> process actual money transfers
        between trip members. Expense balances are informational only. If you
        owe a friend, you settle it outside Paxawa (Venmo, bank transfer,
        cash). Marking a split as &ldquo;settled&rdquo; in the app reflects
        what already happened in the real world.
      </p>

      <h2>AI features</h2>
      <p>
        Paxawa uses Anthropic's Claude API for AI itinerary suggestions, smart
        action chips, and budget nudges. When you use these features, the
        prompt — which may include trip context, message text, or expense
        details — is sent to Anthropic, processed, and returned. Anthropic
        does not train on your inputs by default. See{" "}
        <a
          href="https://www.anthropic.com/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anthropic's privacy policy
        </a>{" "}
        for their handling.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don't try to break into other users' trips or accounts.</li>
        <li>Don't scrape Paxawa or use it to send spam.</li>
        <li>Don't reverse-engineer or attempt to bypass our security measures.</li>
        <li>Don't impersonate someone else.</li>
      </ul>

      <h2>Account termination</h2>
      <p>
        You can delete your account at any time. We can suspend or terminate
        accounts that violate these terms or that have been inactive for an
        extended period. When you delete your account we delete your trips
        and content; trips you co-owned with others may continue to exist if
        another member is still active.
      </p>

      <h2>Service availability</h2>
      <p>
        Paxawa is provided &ldquo;as is&rdquo; — we work hard to keep it
        running but we don't guarantee uptime. We aren't liable for indirect
        or consequential damages, including missed flights, ruined trips, or
        lost data, beyond what local law requires.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. Material changes will be announced via
        in-app notice or email. Continuing to use Paxawa after a change means
        you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:hello@paxawa.com">hello@paxawa.com</a>.
      </p>
    </LegalShell>
  );
}
