"use client";

import { useState, useTransition, useRef } from "react";
import { Camera, Loader2, Check, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/profile";
import { useT } from "@/components/i18n/locale-provider";

/**
 * B19: profile editor — avatar upload + display name + bio.
 *
 * The avatar upload writes directly from the browser to Supabase Storage
 * (bucket `avatars`, RLS-scoped to the user's own folder). We compute a
 * stable public URL afterwards and persist it on the profiles row via
 * the server action. Old avatars are overwritten in place so the bucket
 * doesn't grow unbounded.
 */
interface Props {
  userId: string;
  initialName: string;
  initialBio: string;
  initialAvatarUrl: string | null;
  email: string | null;
}

export function ProfileForm({
  userId,
  initialName,
  initialBio,
  initialAvatarUrl,
  email,
}: Props) {
  const t = useT();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
      // Path scheme: <userId>/avatar.<ext> — the RLS policy requires the
      // first folder to match auth.uid(). We always overwrite the same
      // filename so old avatars get replaced (storage stays tidy).
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately even when the
      // public URL hasn't changed.
      const fresh = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(fresh);
      toast.success(t("profile.avatarUploaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("profile.avatarUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("displayName", name);
    fd.set("bio", bio);
    if (avatarUrl) fd.set("avatarUrl", avatarUrl);
    startTransition(async () => {
      try {
        await updateProfile(fd);
        setSavedAt(Date.now());
        toast.success(t("profile.saved"));
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : t("profile.saveFailed"),
        );
      }
    });
  }

  const showSavedTick = savedAt && Date.now() - savedAt < 3000;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative group"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/15 to-violet-500/15 border-2 border-border flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-muted-foreground/60" />
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarPick}
        />
        <p className="text-[11px] text-muted-foreground">
          {uploading ? t("profile.uploading") : t("profile.avatarHint")}
        </p>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
          {t("profile.nameLabel")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50"
          placeholder={t("profile.namePlaceholder")}
          required
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
          {t("profile.bioLabel")}
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
          placeholder={t("profile.bioPlaceholder")}
        />
        <p className="text-[10px] text-muted-foreground text-end">
          {bio.length}/160
        </p>
      </div>

      {/* Email (read-only) */}
      {email && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
            {t("profile.emailLabel")}
          </label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {showSavedTick && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            {t("profile.savedJustNow")}
          </span>
        )}
        <button
          type="submit"
          disabled={isPending || uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-violet-600 text-white text-sm font-bold px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("profile.saving")}
            </>
          ) : (
            t("profile.save")
          )}
        </button>
      </div>
    </form>
  );
}
