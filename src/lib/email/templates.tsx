import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
  Preview,
  Tailwind,
} from "@react-email/components";
import { render } from "@react-email/render";

/**
 * Transactional email templates. All variants share `<EmailShell>` so the
 * brand bar / footer stay consistent. Each variant exports a `renderXxx`
 * helper that returns `{ subject, html, text, idempotencyKey }` ready to
 * hand off to `sendEmail()`.
 *
 * Plain-text bodies are written by hand (not stripped HTML) because Gmail
 * scores them against the HTML version for spam — auto-stripping produces
 * weird artifacts that bump score.
 */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://paxawa.com";

function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans my-0">
          <Container className="bg-white max-w-[520px] my-8 mx-auto rounded-2xl overflow-hidden border border-slate-200">
            {/* Brand bar. Email clients are unfriendly to inline SVG +
                currentColor, so we serve the wordmark as a hosted asset
                with explicit width/height for the Outlook fallback path. */}
            <Section className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-5">
              <table>
                <tr>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${APP_URL}/logo/wordmark.svg`}
                      alt="Paxawa"
                      width="96"
                      height="20"
                      style={{
                        display: "block",
                        height: "20px",
                        width: "auto",
                        // Wordmark renders in currentColor — for hosted-SVG
                        // delivery in email, we ship a white-tinted variant
                        // via filter. Most modern clients honor this; Outlook
                        // falls back to the dark wordmark on the gradient
                        // (still readable).
                        filter: "brightness(0) invert(1)",
                      }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            {/* Body */}
            <Section className="px-8 py-8">{children}</Section>

            {/* Footer */}
            <Hr className="border-slate-200 my-0" />
            <Section className="px-8 py-5 text-center">
              <Text className="text-xs text-slate-400 m-0 leading-relaxed">
                You're receiving this because you're on a trip in Paxawa.{" "}
                <Link
                  href={`${APP_URL}/dashboard`}
                  className="text-indigo-500 underline"
                >
                  Manage notifications
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

function PrimaryButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      href={href}
      className="bg-indigo-600 text-white px-5 py-3 rounded-lg font-bold text-sm no-underline inline-block"
    >
      {label}
    </Button>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Vote opened                                                            */
/* ────────────────────────────────────────────────────────────────────── */

interface VoteOpenedProps {
  recipientName: string;
  authorName: string;
  tripName: string;
  question: string;
  options: string[];
  tripId: string;
  voteId: string;
}

function VoteOpenedEmail(p: VoteOpenedProps) {
  return (
    <EmailShell preview={`${p.authorName} opened a vote on ${p.tripName}`}>
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        {p.authorName} wants the crew's input
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        Hey {p.recipientName} — a new vote just opened on{" "}
        <strong className="text-slate-900">{p.tripName}</strong>.
      </Text>
      <Section className="bg-slate-50 rounded-xl p-4 mb-5">
        <Text className="text-slate-900 text-base font-semibold m-0 mb-3 leading-snug">
          {p.question}
        </Text>
        <table className="w-full">
          {p.options.slice(0, 5).map((o, i) => (
            <tr key={i}>
              <td>
                <Text className="text-slate-700 text-sm m-0 py-1">
                  · {o}
                </Text>
              </td>
            </tr>
          ))}
        </table>
      </Section>
      <PrimaryButton
        href={`${APP_URL}/trips/${p.tripId}/votes`}
        label="Cast your vote"
      />
    </EmailShell>
  );
}

export async function renderVoteOpened(p: VoteOpenedProps) {
  const html = await render(<VoteOpenedEmail {...p} />);
  const text = [
    `Hey ${p.recipientName},`,
    "",
    `${p.authorName} opened a vote on ${p.tripName}:`,
    "",
    p.question,
    "",
    ...p.options.slice(0, 5).map((o) => `  · ${o}`),
    "",
    `Cast your vote: ${APP_URL}/trips/${p.tripId}/votes`,
  ].join("\n");
  return {
    subject: `🗳️  ${p.authorName} opened a vote on ${p.tripName}`,
    html,
    text,
    idempotencyKey: `vote_opened:${p.voteId}`,
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Expense logged that affects you                                        */
/* ────────────────────────────────────────────────────────────────────── */

interface ExpenseLoggedProps {
  recipientName: string;
  payerName: string;
  tripName: string;
  title: string;
  amount: number;
  currency: string;
  yourShare: number;
  tripId: string;
  expenseId: string;
}

function ExpenseLoggedEmail(p: ExpenseLoggedProps) {
  return (
    <EmailShell
      preview={`${p.payerName} paid for ${p.title} — you owe ${p.currency} ${p.yourShare.toFixed(2)}`}
    >
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        {p.payerName} paid {p.currency} {p.amount.toFixed(2)}
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        for <strong className="text-slate-900">{p.title}</strong> on{" "}
        {p.tripName}.
      </Text>
      <Section className="bg-orange-50 rounded-xl p-4 mb-5 border border-orange-100">
        <Text className="text-orange-700 text-xs font-bold m-0 mb-1 uppercase tracking-wider">
          Your share
        </Text>
        <Text className="text-orange-900 text-2xl font-bold m-0 tabular-nums">
          {p.currency} {p.yourShare.toFixed(2)}
        </Text>
      </Section>
      <PrimaryButton
        href={`${APP_URL}/trips/${p.tripId}/expenses`}
        label="See breakdown"
      />
    </EmailShell>
  );
}

export async function renderExpenseLogged(p: ExpenseLoggedProps) {
  const html = await render(<ExpenseLoggedEmail {...p} />);
  const text = [
    `Hey ${p.recipientName},`,
    "",
    `${p.payerName} paid ${p.currency} ${p.amount.toFixed(2)} for ${p.title} on ${p.tripName}.`,
    `Your share: ${p.currency} ${p.yourShare.toFixed(2)}`,
    "",
    `See the full breakdown: ${APP_URL}/trips/${p.tripId}/expenses`,
  ].join("\n");
  return {
    subject: `💸 ${p.payerName} paid for ${p.title}`,
    html,
    text,
    idempotencyKey: `expense_logged:${p.expenseId}:${p.recipientName}`,
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  New member joined the trip                                             */
/* ────────────────────────────────────────────────────────────────────── */

interface InviteAcceptedProps {
  recipientName: string;
  joinerName: string;
  tripName: string;
  destination: string;
  tripId: string;
  memberId: string;
}

function InviteAcceptedEmail(p: InviteAcceptedProps) {
  return (
    <EmailShell preview={`${p.joinerName} just joined ${p.tripName}`}>
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        🎉 {p.joinerName} joined the trip
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        Hey {p.recipientName} — <strong>{p.joinerName}</strong> just signed up
        for the trip to{" "}
        <strong className="text-slate-900">{p.destination}</strong>. The crew
        is coming together.
      </Text>
      <PrimaryButton
        href={`${APP_URL}/trips/${p.tripId}`}
        label="Open the trip"
      />
    </EmailShell>
  );
}

export async function renderInviteAccepted(p: InviteAcceptedProps) {
  const html = await render(<InviteAcceptedEmail {...p} />);
  const text = [
    `Hey ${p.recipientName},`,
    "",
    `${p.joinerName} just joined the trip to ${p.destination} (${p.tripName}).`,
    "",
    `Open the trip: ${APP_URL}/trips/${p.tripId}`,
  ].join("\n");
  return {
    subject: `🎉 ${p.joinerName} joined ${p.tripName}`,
    html,
    text,
    idempotencyKey: `invite_accepted:${p.memberId}`,
  };
}
