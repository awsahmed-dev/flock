"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookmarkSimple,
  FolderSimple,
  Plus,
  Airplane,
  Star,
  CircleNotch as Loader2,
} from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import {
  createFolder,
  moveToFolder,
  attachFolderToTrip,
  unsavePlace,
  type SavedRow,
} from "@/lib/actions/saves";

interface Folder {
  id: string;
  name: string;
  count: number;
}

/**
 * The bookmark inbox, modelled on how people already behave in TikTok:
 * save first, sort later, and folders are the only organising idea anyone
 * actually uses. A folder can be handed to a trip whole — which is the
 * "arrange our saves" job the skeptic called the real product.
 */
export function SavesInbox({
  saves,
  folders,
  trips,
}: {
  saves: SavedRow[];
  folders: Folder[];
  trips: { id: string; name: string; destination: string | null }[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const visible = useMemo(
    () => (activeFolder ? saves.filter((s) => s.folderId === activeFolder) : saves),
    [saves, activeFolder],
  );

  /** The funnel inversion: enough saves in one place → offer the trip. */
  const genesis = useMemo(() => {
    if (activeFolder) {
      const f = folders.find((x) => x.id === activeFolder);
      return f && f.count >= 3 ? { label: f.name, count: f.count } : null;
    }
    return saves.length >= 3 ? { label: "", count: saves.length } : null;
  }, [activeFolder, folders, saves.length]);

  function addFolder() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createFolder(name);
        setNewName("");
        setCreating(false);
        router.refresh();
      } catch {
        toast.error(t("saves.failed"));
      }
    });
  }

  return (
    <div className="px-4 pb-24 pt-3">
      {/* folder rail */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveFolder(null)}
          className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border ${
            activeFolder === null ? "bg-primary text-primary-foreground border-primary" : "border-border"
          }`}
        >
          {t("saves.allSaves")} · {saves.length}
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFolder(f.id)}
            className={`shrink-0 h-11 px-4 rounded-full text-[13px] font-semibold border inline-flex items-center gap-1.5 ${
              activeFolder === f.id ? "bg-primary text-primary-foreground border-primary" : "border-border"
            }`}
          >
            <FolderSimple size={14} /> {f.name} · {f.count}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="shrink-0 h-11 w-11 rounded-full border border-border inline-flex items-center justify-center"
          aria-label={t("saves.newFolder")}
        >
          <Plus size={15} />
        </button>
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("saves.folderName")}
            className="flex-1 h-11 rounded-2xl border border-border bg-card px-3.5 text-[14px]"
          />
          <button
            type="button"
            onClick={addFolder}
            disabled={busy}
            className="h-11 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-[13.5px]"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saves.newFolder")}
          </button>
        </div>
      )}

      {/* trip genesis — the inbox's reason to exist */}
      {genesis && trips.length > 0 && activeFolder && (
        <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
          <p className="text-[13.5px] font-bold">
            {t("saves.makeTrip", { count: genesis.count, place: genesis.label })}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {trips.slice(0, 3).map((tr) => (
              <button
                key={tr.id}
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await attachFolderToTrip(activeFolder, tr.id);
                      toast.success(t("saves.planned", { day: tr.name }));
                      router.push(`/trips/${tr.id}/package`);
                    } catch {
                      toast.error(t("saves.failed"));
                    }
                  })
                }
                className="h-11 px-4 rounded-full bg-primary text-primary-foreground text-[12.5px] font-bold inline-flex items-center gap-1.5"
              >
                <Airplane size={13} weight="fill" /> {tr.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <BookmarkSimple size={36} className="mx-auto text-muted-foreground" />
          <p className="mt-3 font-bold text-[16px]">{t("saves.inboxEmpty")}</p>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed px-6">
            {t("saves.inboxEmptyBody")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-muted inline-flex items-center justify-center text-[20px] shrink-0">
                {s.source === "reel" ? "🎬" : "📍"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[14.5px] truncate">{s.placeName}</p>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                  {s.address || s.category || ""}
                </p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {s.rating != null && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Star size={11} weight="fill" className="text-[color:var(--clr-dune,#E0B252)]" />
                      <span dir="ltr">{s.rating}</span>
                    </span>
                  )}
                  <span
                    className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${
                      s.status === "planned"
                        ? "bg-[color:var(--clr-moss,#9BC97E)]/15 text-[color:var(--clr-moss,#5E8C3C)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "planned" ? t("saves.statusPlanned") : t("saves.statusSaved")}
                  </span>
                </div>
                {folders.length > 0 && (
                  <select
                    value={s.folderId ?? ""}
                    onChange={(e) =>
                      startTransition(async () => {
                        await moveToFolder(s.id, e.target.value || null);
                        router.refresh();
                      })
                    }
                    className="mt-2 h-11 rounded-xl border border-border bg-background text-[12.5px] px-2.5"
                    aria-label={t("saves.newFolder")}
                  >
                    <option value="">—</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await unsavePlace(s.id);
                    router.refresh();
                  })
                }
                aria-label={t("common.delete")}
                className="w-11 h-11 -me-1 rounded-xl text-muted-foreground hover:text-destructive shrink-0 inline-flex items-center justify-center text-[15px]"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
