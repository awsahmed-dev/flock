"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTrip, deleteTrip } from "@/lib/actions/trip-settings";
import { enableSharing, disableSharing, regenerateShareToken } from "@/lib/actions/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Globe, Copy, RefreshCw, EyeOff, Check, Link2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  tripId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetTotal: number | null;
  currency: string;
  shareToken: string | null;
}

export function TripSettingsForm({ tripId, name, destination, startDate, endDate, budgetTotal, currency, shareToken: initialShareToken }: Props) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [copied, setCopied] = useState(false);

  // Defensive: same logic as getBaseUrl but inline because this is a client
  // component (no fs/server access). NEXT_PUBLIC_APP_URL might be literally
  // "undefined" in env, so fall back to window.location.origin which is
  // always correct on the client.
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const validEnvUrl = envUrl && envUrl !== "undefined" && envUrl !== "null" ? envUrl : null;
  const appUrl = validEnvUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://paxawa.com");
  const shareUrl = shareToken ? `${appUrl}/share/${shareToken}` : null;

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tripId", tripId);
    startTransition(async () => {
      try {
        await updateTrip(fd);
        toast.success(t("trip.settingsUpdated"));
      } catch {
        toast.error(t("trip.settingsUpdateFailed"));
      }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    startTransition(async () => {
      try {
        await deleteTrip(fd);
        router.push("/dashboard");
      } catch {
        toast.error(t("trip.settingsDeleteFailed"));
      }
    });
  }

  function handleEnableShare() {
    startTransition(async () => {
      try {
        const token = await enableSharing(tripId);
        setShareToken(token);
        toast.success(t("trip.settingsShareEnabled"));
      } catch {
        toast.error(t("trip.settingsShareEnableFailed"));
      }
    });
  }

  function handleDisableShare() {
    startTransition(async () => {
      try {
        await disableSharing(tripId);
        setShareToken(null);
        toast.success(t("trip.settingsShareDisabled"));
      } catch {
        toast.error(t("trip.settingsShareDisableFailed"));
      }
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const token = await regenerateShareToken(tripId);
        setShareToken(token);
        toast.success(t("trip.settingsShareRegenerated"));
      } catch {
        toast.error(t("trip.settingsShareRegenerateFailed"));
      }
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    // B28: max-w-4xl on the form column on lg+ so the long horizontal
    // inputs don't stretch the full 1fr; the right rail keeps its 360px
    // width. Was: 1fr left rail = ~800-900px wide which made the date
    // inputs comically long.
    <div className="space-y-6 lg:max-w-none lg:grid lg:grid-cols-[minmax(0,640px)_360px] lg:gap-6 lg:items-start lg:space-y-0 lg:justify-center">
      <div className="space-y-6 min-w-0">
      <PageHeader title={t("trip.settingsTitle")} subtitle={t("trip.settingsSubtitle")} />

      {/* Edit form */}
      <form onSubmit={handleUpdate} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">{t("trip.tripName")}</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="destination">{t("trip.destination")}</Label>
            <Input id="destination" name="destination" defaultValue={destination} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">{t("trip.startDate")}</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={startDate} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">{t("trip.endDate")}</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={endDate} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budgetTotal">{t("trip.settingsBudget")}</Label>
            <Input
              id="budgetTotal"
              name="budgetTotal"
              type="number"
              min="0"
              step="0.01"
              defaultValue={budgetTotal ?? ""}
              placeholder="3000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("trip.currency")}</Label>
            <select
              id="currency"
              name="currency"
              defaultValue={currency}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm h-10"
            >
              {["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "SAR", "AED"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("trip.settingsSaving") : t("trip.settingsSaveChanges")}
          </Button>
        </div>
      </form>
      </div>
      <div className="space-y-6 lg:sticky lg:top-6">

      {/* Share section */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">{t("trip.settingsShareTitle")}</h2>
            <p className="text-xs text-muted-foreground">
              {shareToken ? t("trip.settingsShareSubOn") : t("trip.settingsShareSubOff")}
            </p>
          </div>
        </div>

        {!shareToken ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
            onClick={handleEnableShare}
            disabled={isPending}
          >
            <Link2 className="w-3.5 h-3.5" />
            {t("trip.settingsGenerateLink")}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                {shareUrl}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={handleRegenerate}
                disabled={isPending}
              >
                <RefreshCw className="w-3 h-3" />
                {t("trip.settingsNewLink")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={handleDisableShare}
                disabled={isPending}
              >
                <EyeOff className="w-3 h-3" />
                {t("trip.settingsDisableSharing")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="font-medium text-sm">{t("trip.settingsDangerZone")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("trip.settingsDangerWarning")}
        </p>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-destructive">{t("trip.settingsAreYouSure")}</span>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              {isPending ? t("trip.settingsDeleting") : t("trip.settingsConfirmDelete")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 me-1.5" />
            {t("trip.settingsDeleteTrip")}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
