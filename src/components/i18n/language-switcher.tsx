"use client";

import { useTransition } from "react";
import { GlobeHemisphereWest as Globe2 } from "@phosphor-icons/react/dist/ssr";
import { setLocale } from "@/lib/actions/set-locale";
import { useLocale, useT } from "./locale-provider";

/**
 * B15: dropdown-friendly language toggle. Designed to render *inside*
 * a Radix DropdownMenuItem — the parent menu item closes itself on
 * click so we don't fight that here; we just flip the cookie via the
 * server action and let the layout-level revalidate redraw the tree.
 *
 * Shows the *other* language's name so the affordance reads as
 * "switch to" rather than "current is" — matches the pattern most
 * polished SaaS uses.
 */
export function LanguageSwitcher() {
  const { locale } = useLocale();
  const t = useT();
  const [pending, startTransition] = useTransition();

  const next = locale === "ar" ? "en" : "ar";
  const nextLabel =
    next === "ar" ? t("language.arabic") : t("language.english");

  return (
    <button
      type="button"
      onClick={() => startTransition(() => setLocale(next))}
      disabled={pending}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted disabled:opacity-50"
    >
      <Globe2 className="w-4 h-4" />
      {t("language.label")}: {nextLabel}
    </button>
  );
}
