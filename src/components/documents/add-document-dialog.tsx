"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDocument } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, Link as LinkIcon, FileUp } from "lucide-react";

interface Props {
  tripId: string;
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
export function AddDocumentDialog({ tripId }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
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
      toast.error(`File is too big — keep it under 20 MB`);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error("Pick a file first");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string)?.trim() || file.name;
    const dayDate = (fd.get("dayDate") as string) || "";

    startTransition(async () => {
      try {
        setUploadProgress("Uploading…");
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
        const type = isImage ? "image" : "pdf";

        setUploadProgress("Saving…");
        const docFd = new FormData();
        docFd.set("tripId", tripId);
        docFd.set("title", title);
        docFd.set("url", url);
        docFd.set("type", type);
        if (dayDate) docFd.set("dayDate", dayDate);
        await createDocument(docFd);

        toast.success(isImage ? "Photo uploaded" : "File uploaded");
        resetState();
        setOpen(false);
      } catch (err: any) {
        toast.error(err?.message || "Upload failed");
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
        toast.success("Link saved");
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error((err as Error).message || "Failed to save link");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add document
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
        </DialogHeader>

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
            Upload file
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
            Paste link
          </button>
        </div>

        {mode === "upload" ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">PDF or image (under 20 MB)</Label>
              <label
                htmlFor="doc-file"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 cursor-pointer hover:bg-muted/60 transition-colors text-center"
              >
                <FileUp className="w-6 h-6 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium truncate max-w-full">
                    {file.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to choose a file</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG, WEBP, or GIF
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
              <Label htmlFor="doc-title-up">Title (optional)</Label>
              <Input
                id="doc-title-up"
                name="title"
                placeholder={file?.name ?? "Booking confirmation"}
              />
            </div>

            {/* B6: optional description shows under the title in the list. */}
            <div className="space-y-1.5">
              <Label htmlFor="doc-desc-up">Description (optional)</Label>
              <Input
                id="doc-desc-up"
                name="description"
                placeholder="e.g. for Aws + Mubarak · check-in 3pm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-day-up">Pin to day (optional)</Label>
              <Input id="doc-day-up" name="dayDate" type="date" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isPending || !file}
              >
                {uploadProgress ?? (isPending ? "Working…" : "Upload")}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="type" value="link" />

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                name="title"
                placeholder="Visa requirements doc"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-url">URL</Label>
              <Input
                id="doc-url"
                name="url"
                type="url"
                placeholder="https://docs.google.com/..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-desc">Description (optional)</Label>
              <Input
                id="doc-desc"
                name="description"
                placeholder="e.g. official visa rules · valid 90 days"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-day">Pin to day (optional)</Label>
              <Input id="doc-day" name="dayDate" type="date" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Saving…" : "Save link"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
