"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SignOut as LogOut, CircleNotch as Loader2, Check, Moon, Sun, Camera, Bell, CaretRight as ChevronRight, GlobeHemisphereWest as Globe, GearSix as Gear } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/animate-ui/components/radix/sheet";
import { Switch } from "@/components/animate-ui/components/radix/switch";
import { updateProfile } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { setLocale } from "@/lib/actions/set-locale";
import { getPocketDayStatus, pocketDayEnabled, type PocketDayStatus } from "@/components/pwa/pocket-day";

const ACCENT = "var(--clr-brand)";
const APP_VERSION = "0.1.0";

/**
 * §2 (Phase 4B): the Account bottom sheet, rebuilt to a strict top-to-bottom
 * order so "Sign out" is always LAST: avatar + name + email → editable display
 * name + Save → theme toggle → Sign out. Opened from the header avatar on every
 * page. Editing the name hits a server action that revalidates the dashboard
 * (drives the greeting).
 */
export function AccountSheet({
  open,
  onClose,
  displayName,
  avatarUrl,
  email,
  tripSettingsHref = null,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  /** Trip context (owner): adds a Trip settings row — the one entry the
   *  retired desktop dropdown had that the sheet didn't. */
  tripSettingsHref?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [name, setName] = useState(displayName);
  const [nameDirty, setNameDirty] = useState(false);
  // QA BUG-9: the sheet mounts before the async profile fetch resolves, so
  // useState(displayName) captured "" and the field stayed empty forever
  // (and the header fell back to the email local-part). Sync the loaded
  // profile name in until the user actually edits the field.
  useEffect(() => {
    if (!nameDirty) setName(displayName);
  }, [displayName, nameDirty]);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const username = email ? email.split("@")[0] : null;
  const showSaved = savedAt != null && Date.now() - savedAt < 3000;
  // §6-B: profile photo upload.
  const [photoUrl, setPhotoUrl] = useState<string | null>(avatarUrl);
  useEffect(() => {
    setPhotoUrl((cur) => cur ?? avatarUrl);
  }, [avatarUrl]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.avatarMustBeImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.avatarTooBig"));
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      // Path scheme: <userId>/avatar.<ext> — the storage RLS requires the first
      // folder to match auth.uid(). Overwrite in place so the bucket stays tidy.
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const fresh = `${data.publicUrl}?t=${Date.now()}`;
      setPhotoUrl(fresh);
      const fd = new FormData();
      fd.set("displayName", (name || username || "Traveler").trim());
      fd.set("avatarUrl", fresh);
      await updateProfile(fd);
      toast.success(t("profile.avatarUploaded"));
      router.refresh();
    } catch {
      toast.error(t("profile.avatarUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("displayName", trimmed);
    startTransition(async () => {
      try {
        await updateProfile(fd);
        setSavedAt(Date.now());
        toast.success(t("profile.saved"));
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : t("profile.saveFailed"));
      }
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    // Brief B: the Radix-managed animated Sheet replaces the custom bottom
    // sheet — spring entry/exit per the brief's config, library-owned state.
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        transition={{ type: "spring", stiffness: 150, damping: 22 }}
        className="z-[60] h-auto max-h-[88vh] overflow-y-auto gap-0 rounded-t-2xl border-t border-border bg-card sm:mx-auto sm:max-w-md sm:rounded-t-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Account</SheetTitle>
        </SheetHeader>
      <div
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        {/* 1. Avatar (§6-B: tap to change photo) + name + @username + email. */}
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t("profile.avatarHint")}
            className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
            style={{ border: `2px solid ${ACCENT}` }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={name || "Me"} className="w-full h-full object-cover" />
            ) : (
              <span style={{ background: ACCENT }} className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {(name || username || "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
              {uploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          <div className="min-w-0">
            {(name || username) && (
              <p className="text-lg font-bold text-foreground truncate">{name || username}</p>
            )}
            {username && <p className="text-[13px] text-muted-foreground truncate">@{username}</p>}
            {email && <p className="text-xs text-tertiary truncate mt-0.5">{email}</p>}
          </div>
        </div>

        {/* 2. Display name edit + Save. */}
        <div className="px-6 pb-4">
          <label className="text-xs font-semibold tracking-wider uppercase text-tertiary">
            {t("profile.nameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameDirty(true); }}
            maxLength={60}
            placeholder={t("profile.namePlaceholder")}
            className="w-full mt-2 px-4 rounded-xl outline-none bg-secondary border border-border text-foreground text-[15px]"
            style={{ height: 48 }}
          />
          <button
            type="button"
            onClick={save}
            disabled={isPending || !name.trim()}
            className="w-full mt-3 rounded-xl font-semibold text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
            style={{ height: 48, background: ACCENT, fontSize: 15 }}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : showSaved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {t("profile.save")}
          </button>
        </div>

        <div className="h-px bg-border mx-6" />

        {/* §6-B: Notifications — opens the full per-channel settings. */}
        <Link
          href="/account/notifications"
          onClick={onClose}
          className="flex items-center justify-between px-6 py-4 active:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-muted-foreground" />
            <span className="text-[15px] text-foreground">{t("nav.notificationSettings")}</span>
          </div>
          <ChevronRight size={18} className="text-tertiary rtl:rotate-180" />
        </Link>

        {tripSettingsHref && (
          <>
            <div className="h-px bg-border mx-6" />
            <Link
              href={tripSettingsHref}
              onClick={onClose}
              className="flex items-center justify-between px-6 py-4 active:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Gear size={20} className="text-muted-foreground" />
                <span className="text-[15px] text-foreground">{t("nav.tripSettings")}</span>
              </div>
              <ChevronRight size={18} className="text-tertiary rtl:rotate-180" />
            </Link>
          </>
        )}

        <div className="h-px bg-border mx-6" />

        {/* Arabic launch: the language switcher — sets the paxawa_locale
            cookie via the setLocale action, then hard-reloads so the whole
            tree re-renders with the new dictionary + <html dir>. */}
        <LanguageRow />

        <div className="h-px bg-border mx-6" />

        {/* 3. Theme toggle. */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon size={20} style={{ color: ACCENT }} />
            ) : (
              <Sun size={20} style={{ color: ACCENT }} />
            )}
            <span className="text-[15px] font-medium text-foreground">
              {isDark ? t("nav.darkMode") : t("nav.lightMode")}
            </span>
          </div>
          {/* Brief G: spring-thumb animated Switch. */}
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label={isDark ? t("nav.lightMode") : t("nav.darkMode")}
            className="h-7 w-12 px-1"
            thumbClassName="size-5"
            pressedWidth={24}
          />
        </div>

        <div className="h-px bg-border mx-6" />

        {/* Phase 6 §10-D: Pocket Day status row. */}
        <PocketDayRow />

        <div className="h-px bg-border mx-6" />

        {/* 4. Sign out — LAST. */}
        <div className="px-6 py-4">
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-medium active:scale-[0.98] transition-transform"
            style={{ height: 48, background: "rgba(255,59,48,0.10)", color: "#FF3B30", fontSize: 15 }}
          >
            <LogOut size={18} />
            {t("nav.signOut")}
          </button>
        </div>

        {/* §6-B: app version (passive). */}
        <p className="px-6 pb-2 text-center text-xs text-tertiary">Paxawa · v{APP_VERSION}</p>
      </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The service worker's pax-pages cache keys entries by URL only, but every
 * page's HTML/RSC is locale-dependent — anything cached before a locale
 * switch is in the OLD language, and network-first will serve it on the next
 * flaky fetch (observed: /trips/[id]/members in English+LTR with cookie=ar).
 * Ask the SW to purge before reloading. Time-boxed so a missing or wedged SW
 * can never block the switch; also drops the Pocket Day stamp so the warmer
 * re-caches tomorrow's pages in the new locale.
 */
async function purgeStalePageCaches(): Promise<void> {
  try {
    localStorage.removeItem("paxawa-pocket-day");
  } catch {
    /* private mode — nothing to re-warm anyway */
  }
  const sw =
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? navigator.serviceWorker.controller
      : null;
  if (!sw) return;
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 1500);
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      window.clearTimeout(timer);
      resolve();
    };
    sw.postMessage({ type: "paxawa:purge-pages" }, [channel.port2]);
  });
}

/**
 * Arabic launch — the Language row: English | العربية as a segmented pair,
 * the active locale carries a brand checkmark. Tapping the other option
 * flips the cookie (setLocale) and reloads the page in that language.
 */
function LanguageRow() {
  const t = useT();
  const { locale } = useLocale();
  const [switching, setSwitching] = useState<"en" | "ar" | null>(null);
  const [, startTransition] = useTransition();

  function choose(next: "en" | "ar") {
    if (next === locale || switching) return;
    setSwitching(next);
    startTransition(async () => {
      try {
        await setLocale(next);
        await purgeStalePageCaches();
        window.location.reload();
      } catch {
        setSwitching(null);
        toast.error(t("common.error"));
      }
    });
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Globe size={20} className="text-muted-foreground" />
        <span className="text-[15px] font-medium text-foreground">{t("language.label")}</span>
      </div>
      <div className="flex rounded-full bg-muted p-0.5">
        {(["en", "ar"] as const).map((l) => {
          const active = locale === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => choose(l)}
              disabled={switching != null}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-[13px] font-semibold transition-colors ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {switching === l ? (
                <Loader2 size={13} className="animate-spin" />
              ) : active ? (
                <Check size={13} weight="bold" style={{ color: ACCENT }} />
              ) : null}
              {l === "en" ? t("language.english") : t("language.arabic")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Phase 6 §10-D — the Pocket Day row + inline expansion: cache status,
 * nightly toggle, refresh, and clear. Hidden when nothing has ever cached
 * and the toggle is untouched (no active trips to serve).
 */
function PocketDayRow() {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<PocketDayStatus | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Read on mount (localStorage isn't available at SSR).
  useState(() => {
    if (typeof window !== "undefined") {
      setStatus(getPocketDayStatus());
      setEnabled(pocketDayEnabled());
    }
    return null;
  });

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem("paxawa-pocket-day-enabled", next ? "on" : "off");
    } catch {}
  }

  async function clearCache() {
    setClearing(true);
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("pax-")).map((n) => caches.delete(n)));
      localStorage.removeItem("paxawa-pocket-day");
      setStatus(null);
      toast.success(t("pocket.cleared"));
    } catch {
      toast.error(t("pocket.clearFailed"));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between">
        <span className="text-[15px] font-medium text-foreground">
          {t("pocket.title")} · {enabled ? t("pocket.on") : t("pocket.off")}
          {status && <span className="text-muted-foreground font-normal"> · {t("pocket.stopsCached", { count: status.stops })}</span>}
        </span>
        <ChevronRight size={18} className={`text-tertiary transition-transform ${expanded ? "rotate-90" : "rtl:rotate-180"}`} />
      </button>
      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground">{t("pocket.nightly")}</span>
            {/* Brief G: spring-thumb animated Switch. */}
            <Switch
              checked={enabled}
              onCheckedChange={toggle}
              aria-label="Toggle Pocket Day"
              className="h-7 w-12 px-1"
              thumbClassName="size-5"
              pressedWidth={24}
            />
          </div>
          <p className="text-[12px] text-tertiary">
            {status
              ? t("pocket.cachedLine", { date: status.date, stops: status.stops, time: new Date(status.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
              : t("pocket.nothingCached")}
          </p>
          <p className="text-[12px] text-tertiary">
            {t("pocket.includes")}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!navigator.onLine) return;
              window.dispatchEvent(new CustomEvent("paxawa:pocketRefresh"));
              toast.success(t("pocket.upToDate"));
              setStatus(getPocketDayStatus());
            }}
            disabled={typeof navigator !== "undefined" && !navigator.onLine}
            className="text-start text-[13px] font-semibold text-primary disabled:opacity-50"
          >
            {t("pocket.refreshNow")}
          </button>
          <button
            type="button"
            onClick={clearCache}
            disabled={clearing}
            className="text-start text-[13px] font-semibold disabled:opacity-50"
            style={{ color: "#FF3B30" }}
          >
            {clearing ? t("pocket.clearing") : t("pocket.clearData")}
          </button>
        </div>
      )}
    </div>
  );
}
