"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Backpack,
  Check,
  Plus,
  Trash2,
  Users,
  User,
  Sparkles,
  FileText,
  Smartphone,
  Pill,
  Droplet,
  Tent,
  Tag,
} from "lucide-react";
import {
  createPackingItem,
  togglePackingItem,
  deletePackingItem,
  seedSuggestedPacking,
} from "@/lib/actions/packing";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/components/i18n/locale-provider";

interface Item {
  id: string;
  label: string;
  category: string;
  packed: boolean;
  notes: string | null;
  userId: string | null;
  createdBy: string;
}

interface Member {
  userId: string;
  displayName: string;
}

interface Props {
  tripId: string;
  userId: string;
  items: Item[];
  members: Member[];
  /** B6: hide our internal PageHeader when rendered inside PackBoard. */
  embedded?: boolean;
}

const CATEGORY_META: Record<
  string,
  { i18nKey: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  general: { i18nKey: "general", icon: Tag, color: "text-slate-400" },
  clothes: { i18nKey: "clothes", icon: Tent, color: "text-blue-500" },
  docs: { i18nKey: "documents", icon: FileText, color: "text-amber-500" },
  tech: { i18nKey: "tech", icon: Smartphone, color: "text-violet-500" },
  toiletries: { i18nKey: "toiletries", icon: Droplet, color: "text-cyan-500" },
  medical: { i18nKey: "medical", icon: Pill, color: "text-red-500" },
  outdoor: { i18nKey: "outdoor", icon: Tent, color: "text-emerald-500" },
  other: { i18nKey: "other", icon: Tag, color: "text-muted-foreground" },
};

const CATEGORIES = Object.keys(CATEGORY_META);

/**
 * Packing list — three scoped tabs:
 *
 *  - **Shared** (user_id NULL): items everyone in the crew can check off
 *    (tent, first-aid kit, snacks). Useful for "who's bringing what."
 *  - **Yours**: the current user's personal checklist.
 *  - **Crew**: read-only overview of every other member's lists, grouped
 *    by person — quick way to see who's lagging behind on packing.
 *
 * Server-side enforcement matches: shared toggles are open to all members,
 * personal items only by the owner.
 */
export function PackingBoard({ tripId, userId, items, members, embedded }: Props) {
  const t = useT();
  const [tab, setTab] = useState<"shared" | "mine" | "crew">("shared");
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  const shared = useMemo(() => items.filter((i) => i.userId === null), [items]);
  const mine = useMemo(
    () => items.filter((i) => i.userId === userId),
    [items, userId],
  );
  const crewByMember = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of items) {
      if (!i.userId || i.userId === userId) continue;
      const list = map.get(i.userId) ?? [];
      list.push(i);
      map.set(i.userId, list);
    }
    return map;
  }, [items, userId]);

  const counts = {
    shared: { total: shared.length, packed: shared.filter((i) => i.packed).length },
    mine: { total: mine.length, packed: mine.filter((i) => i.packed).length },
  };

  function add(scope: "shared" | "mine") {
    const label = newLabel.trim();
    if (!label) {
      toast.error(t("pack.giveItName"));
      return;
    }
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("label", label);
    fd.set("category", newCategory);
    fd.set("scope", scope);
    startTransition(async () => {
      try {
        await createPackingItem(fd);
        setNewLabel("");
      } catch (e: any) {
        toast.error(e?.message || t("pack.couldntAdd"));
      }
    });
  }

  function toggle(itemId: string) {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("itemId", itemId);
    startTransition(async () => {
      try {
        await togglePackingItem(fd);
      } catch (e: any) {
        toast.error(e?.message || t("pack.couldntUpdate"));
      }
    });
  }

  function remove(itemId: string) {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("itemId", itemId);
    startTransition(async () => {
      try {
        await deletePackingItem(fd);
      } catch (e: any) {
        toast.error(e?.message || t("pack.couldntDelete"));
      }
    });
  }

  function seed() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    startTransition(async () => {
      try {
        await seedSuggestedPacking(fd);
        toast.success(t("pack.suggestedAdded"));
      } catch (e: any) {
        toast.error(e?.message || t("pack.couldntSeed"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-full">
      {/* B8/B6: PageHeader is hidden when embedded inside PackBoard (which
          owns the shared title). The "Start with suggestions" CTA stays
          visible in both modes — surfaced on its own row when embedded. */}
      {embedded ? (
        items.length === 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={seed}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t("pack.startWithSuggestions")}
            </button>
          </div>
        )
      ) : (
        <PageHeader
          title={t("pack.headerTitle")}
          subtitle={t("pack.headerSubtitle")}
          action={
            items.length === 0 ? (
              <button
                type="button"
                onClick={seed}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start with suggestions
              </button>
            ) : null
          }
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 w-fit max-w-full overflow-x-auto">
        <TabButton
          active={tab === "shared"}
          onClick={() => setTab("shared")}
          icon={Users}
          label={t("pack.shared")}
          count={counts.shared.total}
        />
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          icon={User}
          label={t("pack.yours")}
          count={counts.mine.total}
        />
        <TabButton
          active={tab === "crew"}
          onClick={() => setTab("crew")}
          icon={Users}
          label={t("pack.crew")}
          count={crewByMember.size}
        />
      </div>

      {tab !== "crew" && (
        <ProgressBar
          packed={tab === "shared" ? counts.shared.packed : counts.mine.packed}
          total={tab === "shared" ? counts.shared.total : counts.mine.total}
        />
      )}

      {/* Add-item row */}
      {tab !== "crew" && (
        <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-border bg-card p-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={
              tab === "shared"
                ? t("pack.whatDoesGroupNeed")
                : t("pack.whatYouNeed")
            }
            className="flex-1 min-w-0 bg-transparent text-sm px-2 py-1.5 outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter") add(tab === "shared" ? "shared" : "mine");
            }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-muted/40 text-xs font-semibold rounded-lg px-2 py-1.5 outline-none border border-border"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`pack.categories.${CATEGORY_META[c]?.i18nKey ?? "other"}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => add(tab === "shared" ? "shared" : "mine")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-violet-600 text-white text-xs font-bold px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("pack.add")}
          </button>
        </div>
      )}

      {/* List */}
      {tab === "shared" && (
        <CategoryList
          items={shared}
          onToggle={toggle}
          onDelete={remove}
          userId={userId}
        />
      )}

      {tab === "mine" && (
        <CategoryList
          items={mine}
          onToggle={toggle}
          onDelete={remove}
          userId={userId}
        />
      )}

      {tab === "crew" && (
        <CrewView
          members={members}
          crewByMember={crewByMember}
          userId={userId}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span
        className={`text-[10px] tabular-nums px-1.5 rounded-full ${
          active ? "bg-primary/15 text-primary" : "bg-muted-foreground/15"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ProgressBar({ packed, total }: { packed: number; total: number }) {
  const t = useT();
  if (total === 0) return null;
  const pct = Math.round((packed / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">
          {t("pack.ofPacked", { packed, total })}
        </span>
        <span className="font-bold text-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategoryList({
  items,
  onToggle,
  onDelete,
  userId,
}: {
  items: Item[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  userId: string;
}) {
  const t = useT();
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of items) {
      const cat = i.category in CATEGORY_META ? i.category : "other";
      const list = map.get(cat) ?? [];
      list.push(i);
      map.set(cat, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <Backpack className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">{t("pack.nothingOnList")}</p>
        <p className="text-xs mt-1">{t("pack.addToStart")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([cat, list]) => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.other;
        const Icon = meta.icon;
        return (
          <section key={cat} className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-1">
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
              <p className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">
                {t(`pack.categories.${meta.i18nKey}`)} · {list.length}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {list.map((item) => (
                <PackingRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item.id)}
                  canDelete={
                    item.createdBy === userId || item.userId === userId
                  }
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PackingRow({
  item,
  onToggle,
  onDelete,
  canDelete,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const t = useT();
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all ${
        item.packed ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 ${
          item.packed
            ? "bg-emerald-500 text-white"
            : "border-2 border-muted-foreground/40 hover:border-primary"
        }`}
        aria-label={item.packed ? t("pack.markNotPacked") : t("pack.markPacked")}
      >
        {item.packed && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            item.packed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.label}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
        )}
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive transition-all"
          aria-label={t("pack.deleteItem")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function CrewView({
  members,
  crewByMember,
  userId,
}: {
  members: Member[];
  crewByMember: Map<string, Item[]>;
  userId: string;
}) {
  const t = useT();
  const others = members.filter((m) => m.userId !== userId);

  if (others.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">{t("pack.flyingSolo")}</p>
        <p className="text-xs mt-1">{t("pack.inviteCrew")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {others.map((m) => {
        const list = crewByMember.get(m.userId) ?? [];
        const packed = list.filter((i) => i.packed).length;
        return (
          <section key={m.userId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {m.displayName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-bold truncate">{m.displayName}</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-muted-foreground shrink-0">
                {packed}/{list.length}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("pack.nothingPackedYet")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {list.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                        i.packed
                          ? "bg-emerald-500 text-white"
                          : "border border-muted-foreground/30"
                      }`}
                    >
                      {i.packed && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span
                      className={`truncate ${
                        i.packed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {i.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
