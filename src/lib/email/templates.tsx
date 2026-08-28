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
import { emailIdempotencyKey } from "@/lib/email/idempotency";

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
        <Body className="bg-[#0D0D0D] font-sans my-0" dir={dir} style={{ backgroundColor: "#0D0D0D" }}>
          <Container
            className="max-w-[520px] my-9 mx-auto rounded-[20px] overflow-hidden border border-[#2A2833]"
            style={{
              backgroundColor: "#141318",
              // The landing's aurora, as a safe fallback-friendly gradient.
              backgroundImage:
                "radial-gradient(120% 70% at 20% 0%, rgba(139,124,255,0.18) 0%, rgba(20,19,24,0) 55%)",
            }}
          >
            {/* Brand bar. Email clients are unfriendly to inline SVG +
                currentColor, so we serve the wordmark as a hosted asset
                with explicit width/height for the Outlook fallback path. */}
            <Section className="px-8 pt-7">
              <table>
                <tr>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${APP_URL}/logo/wordmark-email.png`}
                      alt="Paxawa"
                      width="96"
                      height="29"
                      style={{ display: "block", height: "29px", width: "auto" }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            {/* Body */}
            <Section className="px-8 py-8">{children}</Section>

            {/* Footer */}
            <Hr className="border-[#2A2833] my-0" />
            <Section className="px-8 py-5 text-center">
              <Text className="text-xs text-[#787580] m-0 leading-relaxed">
                You're receiving this because you're on a trip in Paxawa.{" "}
                <Link
                  href={`${APP_URL}/dashboard`}
                  className="text-[#8B7CFF] underline"
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
      className="bg-[#8B7CFF] text-[#0D0D0D] px-6 py-3.5 rounded-full font-bold text-sm no-underline inline-block"
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
  /**
   * fix/tz (T-2): the RECIPIENT's user id, and the reason this field exists.
   *
   * Resend's contract is: same idempotencyKey within 24h -> the second send is
   * silently dropped and the call still returns ok. These keys were built from
   * the SUBJECT of the notification (the vote, the expense, the joining member)
   * while the caller loops over every crew member, so the key was constant
   * across the loop and only the FIRST recipient was ever emailed. Everyone
   * else got nothing, and `sendEmail` reported success.
   *
   * The key must therefore identify (event, recipient). trips.ts:147 already
   * got this right -- `trip-invite:${trip.id}:${email}` -- and is the pattern
   * these now follow.
   */
  recipientUserId: string;
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
      <Heading className="text-white text-xl font-bold m-0 mb-2">
        {t("email.voteOpenedHeading", { actor: p.authorName })}
      </Heading>
      <Text className="text-[#B7B4C0] text-sm m-0 mb-5 leading-relaxed">
        {t("email.voteOpenedBody", { name: p.recipientName, trip: p.tripName })}
      </Text>
      <Section className="bg-[#1D1B24] rounded-xl p-4 mb-5">
        <Text className="text-white text-base font-semibold m-0 mb-3 leading-snug">
          {p.question}
        </Text>
        <table className="w-full">
          {p.options.slice(0, 5).map((o, i) => (
            <tr key={i}>
              <td>
                <Text className="text-[#B7B4C0] text-sm m-0 py-1">
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
    idempotencyKey: emailIdempotencyKey({ kind: "vote_opened", voteId: p.voteId }, p.recipientUserId),
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Expense logged that affects you                                        */
/* ────────────────────────────────────────────────────────────────────── */

interface ExpenseLoggedProps {
  recipientName: string;
  /** fix/tz (T-2): see VoteOpenedProps.recipientUserId. */
  recipientUserId: string;
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
      <Heading className="text-white text-xl font-bold m-0 mb-2">
        {t("email.expenseLoggedHeading", { actor: p.payerName, currency: p.currency, amount: p.amount.toFixed(2) })}
      </Heading>
      <Text className="text-[#B7B4C0] text-sm m-0 mb-5 leading-relaxed">
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
    // Was keyed on recipientName -- a DISPLAY NAME. Two debtors both called
    // "Mom" collided, and any two members missing both tripMembers.displayName
    // and profiles.displayName both fell back to "there" and collided too.
    idempotencyKey: emailIdempotencyKey({ kind: "expense_logged", expenseId: p.expenseId }, p.recipientUserId),
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  New member joined the trip                                             */
/* ────────────────────────────────────────────────────────────────────── */

interface InviteAcceptedProps {
  recipientName: string;
  /** fix/tz (T-2): see VoteOpenedProps.recipientUserId. */
  recipientUserId: string;
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
      <Heading className="text-white text-xl font-bold m-0 mb-2">
        {t("email.inviteAcceptedHeading", { actor: p.joinerName })}
      </Heading>
      <Text className="text-[#B7B4C0] text-sm m-0 mb-5 leading-relaxed">
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
    // memberId is the JOINER, so this was constant across the recipient loop.
    idempotencyKey: emailIdempotencyKey({ kind: "invite_accepted", memberId: p.memberId }, p.recipientUserId),
  };
}
