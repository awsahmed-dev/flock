"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDocument } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, UploadSimple as Upload, Link as LinkIcon, FileArrowUp as FileUp } from "@phosphor-icons/react/dist/ssr";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/document-kind";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  tripId: string;
  /** Sprint 4 FIX-5a: controlled mode for the + menu — when `open` is
   *  provided the internal trigger button is not rendered. */
  open?: boolean;
  onClose?: () => void;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — matches the bucket's hard cap
const ACCEPT =
  "application/pdf,image/png,image/jpeg,image/webp,image/gif";

/**
 * Add-document dialog with two modes:
 *
 * - **Upload** (default): pick a PDF or image and upload it to the
 *   `trip-documents` Supabase Storage bucket. The browser does the upload
 *   directly under that user's RLS-gated folder (`<userId>/<tripId>/…`),
 *   then we hit the createDocument server action with the resulting public
 *   URL.
 *
 * - **Link**: keep the original behavior — paste a Google Docs / Notion /
 *   booking-confirmation URL. No upload, just metadata.
 */
export function AddDocumentDialog({ tripId, open: controlledOpen, onClose }: Props) {
  const t = useT();
  const [selfOpen, setSelfOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : selfOpen;
  const setOpen = (v: boolean) => {
    if (controlled) {
      if (!v) onClose?.();
    } else {
      setSelfOpen(v);
    }
  };
  const [mode, setMode] = useState<"upload" | "link">("upload");
  // Sprint 5 §3a: what the document IS — the first thing every card shows.
  const [kind, setKind] = useState<DocumentKind>("other");
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      toast.error(t("docs.tooBig"));
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error(t("docs.pickFirst"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim() || file.name;
    const dayDate = (fd.get("dayDate") as string) || "";

    startTransition(async () => {
      try {
        setUploadProgress(t("docs.uploading"));
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        // Sanitize filename and prefix with userId/tripId so the storage
        // INSERT policy passes (first folder must equal auth.uid()).
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(0, 100);
        const path = `${user.id}/${tripId}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("trip-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) throw new Error(upErr.message);

        const { data: urlData } = supabase.storage
          .from("trip-documents")
          .getPublicUrl(path);
        const url = urlData.publicUrl;

        const isImage = file.type.startsWith("image/");

        setUploadProgress(t("docs.saving"));
        const docFd = new FormData();
        docFd.set("tripId", tripId);
        docFd.set("title", title);
        docFd.set("url", url);
        // Sprint 5 §3a: type records the KIND, not the file format.
        docFd.set("type", kind);
        if (dayDate) docFd.set("dayDate", dayDate);
        await createDocument(docFd);

        toast.success(isImage ? t("docs.photoUploaded") : t("docs.fileUploaded"));
        resetState();
        setOpen(false);
      } catch (err: any) {
        toast.error(err?.message || t("docs.uploadFailed"));
      } finally {
        setUploadProgress(null);
      }
    });
  }

  function handleLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDocument(formData);
        toast.success(t("docs.linkSaved"));
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error((err as Error).message || t("docs.saveFailed"));
      }
    });
  }

  return (
    <>
      {!controlled && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 me-1" />
          {t("nav.addDocument")}
        </Button>
      )}
      <BottomSheet
        open={open}
        onClose={() => { setOpen(false); resetState(); }}
        title={t("docs.addTitle")}
        size="md"
      >
        {/* Upload / Link toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 w-fit">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              mode === "upload"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {t("docs.uploadFile")}
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              mode === "link"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            {t("docs.pasteLink")}
          </button>
        </div>

        {mode === "upload" ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">{t("docs.fileLabel")}</Label>
              <label
                htmlFor="doc-file"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 cursor-pointer hover:bg-muted/60 transition-colors text-center"
              >
                <FileUp className="w-6 h-6 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium truncate max-w-full">
                    {file.name}
                    <span className="text-xs text-muted-foreground ms-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{t("docs.clickToChoose")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("docs.fileTypes")}
                    </p>
                  </>
                )}
                <input
                  id="doc-file"
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={onPickFile}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title-up">{t("docs.titleOptional")}</Label>
              <Input
                id="doc-title-up"
                name="title"
                placeholder={file?.name ?? t("docs.titlePh")}
              />
            </div>

            {/* B6: optional description shows under the title in the list. */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-desc-up">{t("docs.descOptional")}</Label>
              <Input
                id="doc-desc-up"
                name="description"
                placeholder={t("docs.descPh")}
              />
            </div>

            {/* Sprint 5 §3a: kind picker — scan your documents by icon. */}
            <div className="space-y-1.5">
              <Label>{t("docs.whatIsIt")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    aria-pressed={kind === k.value}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
                      kind === k.value
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden>{k.icon}</span>
                    {t(k.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-day-up">{t("docs.pinToDay")}</Label>
              <Input id="doc-day-up" name="dayDate" type="date" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending || !file}
              >
                {uploadProgress ?? (isPending ? t("docs.working") : t("docs.upload"))}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <input type="hidden" name="tripId" value={tripId} />

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">{t("docs.titleLabel")}</Label>
              <Input
                id="doc-title"
                name="title"
                placeholder={t("docs.linkTitlePh")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-url">{t("docs.urlLabel")}</Label>
              <Input
                id="doc-url"
                name="url"
                type="url"
                placeholder="https://docs.google.com/..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-desc">{t("docs.descOptional")}</Label>
              <Input
                id="doc-desc"
                name="description"
                placeholder={t("docs.linkDescPh")}
              />
            </div>

            {/* Sprint 5 §3a: kind picker (link mode) — scan your documents by icon. */}
            <div className="space-y-1.5">
              <Label>{t("docs.whatIsIt")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    aria-pressed={kind === k.value}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
                      kind === k.value
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden>{k.icon}</span>
                    {t(k.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-day">{t("docs.pinToDay")}</Label>
              <Input id="doc-day" name="dayDate" type="date" />
            </div>
            <input type="hidden" name="type" value={kind} />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? t("docs.saving") : t("docs.saveLink")}
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
