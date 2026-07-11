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
import { getDictionary, tFromDict, type Locale } from "@/lib/i18n";

// B15-f: locale-aware HTML/text rendering. Callers pass each recipient's
// preferred language (`profiles.locale`) and the templates pick copy
// from the in-memory message catalogs. We don't try to render a
// per-locale subject line — that's threaded as well so the email
// inbox preview reads correctly.
function tFor(locale: Locale) {
  const dict = getDictionary(locale);
  return (k: string, p?: Record<string, string | number>) =>
    tFromDict(dict, k, p, locale);
}

function isRtl(locale: Locale) {
  return locale === "ar";
}

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
  locale = "en",
  children,
}: {
  preview: string;
  locale?: Locale;
  children: React.ReactNode;
}) {
  // B15-f: <html dir="rtl"> + lang for Arabic recipients. Most clients
  // (Gmail, Apple Mail, Outlook web) honor dir on the body — the rest
  // fall back to LTR which is acceptable.
  const dir = isRtl(locale) ? "rtl" : "ltr";
  return (
    <Html lang={locale} dir={dir}>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans my-0" dir={dir}>
          <Container className="bg-white max-w-[520px] my-8 mx-auto rounded-2xl overflow-hidden border border-slate-200">
            {/* Brand bar. Email clients are unfriendly to inline SVG +
                currentColor, so we serve the wordmark as a hosted asset
                with explicit width/height for the Outlook fallback path. */}
            <Section className="bg-gradient-to-br from-[#5B4BD9] to-[#8B7CFF] px-6 py-5">
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
  /** B15-f: BCP-47 tag from profiles.locale. Defaults to "en". */
  locale?: Locale;
}

function VoteOpenedEmail(p: VoteOpenedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  return (
    <EmailShell
      preview={t("email.voteOpenedSubject", { actor: p.authorName, trip: p.tripName })}
      locale={locale}
    >
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        {t("email.voteOpenedHeading", { actor: p.authorName })}
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        {t("email.voteOpenedBody", { name: p.recipientName, trip: p.tripName })}
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
        label={t("email.voteOpenedCta")}
      />
    </EmailShell>
  );
}

export async function renderVoteOpened(p: VoteOpenedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  const html = await render(<VoteOpenedEmail {...p} />);
  const text = [
    t("email.voteOpenedBody", { name: p.recipientName, trip: p.tripName }),
    "",
    p.question,
    "",
    ...p.options.slice(0, 5).map((o) => `  · ${o}`),
    "",
    `${t("email.voteOpenedCta")}: ${APP_URL}/trips/${p.tripId}/votes`,
  ].join("\n");
  return {
    subject: t("email.voteOpenedSubject", { actor: p.authorName, trip: p.tripName }),
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
  locale?: Locale;
}

function ExpenseLoggedEmail(p: ExpenseLoggedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  return (
    <EmailShell
      preview={t("email.expenseLoggedSubject", { actor: p.payerName, title: p.title })}
      locale={locale}
    >
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        {t("email.expenseLoggedHeading", { actor: p.payerName, currency: p.currency, amount: p.amount.toFixed(2) })}
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        {t("email.expenseLoggedBody", { title: p.title, trip: p.tripName })}
      </Text>
      <Section className="bg-orange-50 rounded-xl p-4 mb-5 border border-orange-100">
        <Text className="text-orange-700 text-xs font-bold m-0 mb-1 uppercase tracking-wider">
          {t("email.expenseLoggedYourShare")}
        </Text>
        <Text className="text-orange-900 text-2xl font-bold m-0 tabular-nums">
          {p.currency} {p.yourShare.toFixed(2)}
        </Text>
      </Section>
      <PrimaryButton
        href={`${APP_URL}/trips/${p.tripId}/expenses`}
        label={t("email.expenseLoggedCta")}
      />
    </EmailShell>
  );
}

export async function renderExpenseLogged(p: ExpenseLoggedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  const html = await render(<ExpenseLoggedEmail {...p} />);
  const text = [
    t("email.expenseLoggedHeading", { actor: p.payerName, currency: p.currency, amount: p.amount.toFixed(2) }),
    t("email.expenseLoggedBody", { title: p.title, trip: p.tripName }),
    `${t("email.expenseLoggedYourShare")}: ${p.currency} ${p.yourShare.toFixed(2)}`,
    "",
    `${t("email.expenseLoggedCta")}: ${APP_URL}/trips/${p.tripId}/expenses`,
  ].join("\n");
  return {
    subject: t("email.expenseLoggedSubject", { actor: p.payerName, title: p.title }),
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
  locale?: Locale;
}

function InviteAcceptedEmail(p: InviteAcceptedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  return (
    <EmailShell
      preview={t("email.inviteAcceptedSubject", { actor: p.joinerName, trip: p.tripName })}
      locale={locale}
    >
      <Heading className="text-slate-900 text-xl font-bold m-0 mb-2">
        {t("email.inviteAcceptedHeading", { actor: p.joinerName })}
      </Heading>
      <Text className="text-slate-600 text-sm m-0 mb-5 leading-relaxed">
        {t("email.inviteAcceptedBody", { name: p.recipientName, actor: p.joinerName, destination: p.destination })}
      </Text>
      <PrimaryButton
        href={`${APP_URL}/trips/${p.tripId}`}
        label={t("email.inviteAcceptedCta")}
      />
    </EmailShell>
  );
}

export async function renderInviteAccepted(p: InviteAcceptedProps) {
  const locale = p.locale ?? "en";
  const t = tFor(locale);
  const html = await render(<InviteAcceptedEmail {...p} />);
  const text = [
    t("email.inviteAcceptedBody", { name: p.recipientName, actor: p.joinerName, destination: p.destination }),
    "",
    `${t("email.inviteAcceptedCta")}: ${APP_URL}/trips/${p.tripId}`,
  ].join("\n");
  return {
    subject: t("email.inviteAcceptedSubject", { actor: p.joinerName, trip: p.tripName }),
    html,
    text,
    idempotencyKey: `invite_accepted:${p.memberId}`,
  };
}
