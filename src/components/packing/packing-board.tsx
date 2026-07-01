"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
import { UserAvatar } from "@/components/ui/user-avatar";

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
  avatarUrl?: string | null;
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

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.userId, m] as const)),
    [members],
  );

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
    <div className="flex flex-col gap-6 max-w-full pb-24">
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
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/60 w-fit max-w-full overflow-x-auto">
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

      {/* List */}
      {tab === "shared" && (
        <CategoryList
          items={shared}
          onToggle={toggle}
          onDelete={remove}
          userId={userId}
          memberById={memberById}
        />
      )}

      {tab === "mine" && (
        <CategoryList
          items={mine}
          onToggle={toggle}
          onDelete={remove}
          userId={userId}
          memberById={memberById}
        />
      )}

      {tab === "crew" && (
        <CrewView
          members={members}
          crewByMember={crewByMember}
          userId={userId}
        />
      )}

      {/* §4: fixed add-item bar — never inside the scroll; sits above the tab
          bar with safe-area inset. Hidden on the read-only Crew tab. */}
      {tab !== "crew" && (
        <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] xl:bottom-0 xl:start-[280px] z-30 bg-card border-t border-border">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-stretch gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={tab === "shared" ? t("pack.whatDoesGroupNeed") : t("pack.whatYouNeed")}
              className="flex-1 min-w-0 rounded-lg bg-muted/40 border border-border text-sm px-3 h-10 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") add(tab === "shared" ? "shared" : "mine");
              }}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Category"
              className="shrink-0 max-w-[104px] bg-muted/40 text-xs font-semibold rounded-lg px-2 h-10 outline-none border border-border"
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
              aria-label={t("pack.add")}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold px-4 h-10 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("pack.add")}</span>
            </button>
          </div>
        </div>
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
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${
        active
          ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
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
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
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
  memberById,
}: {
  items: Item[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  userId: string;
  memberById: Map<string, Member>;
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
                  adder={memberById.get(item.createdBy)}
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
  adder,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  canDelete: boolean;
  adder?: Member;
}) {
  const t = useT();
  // §4: swipe-left reveals a red delete zone (no always-visible trash icon).
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  function down(e: React.PointerEvent) {
    if (canDelete) startX.current = e.clientX;
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (d < 0) setDx(Math.max(d, -88));
  }
  function up() {
    startX.current = null;
    setDx((cur) => (cur < -56 ? -72 : 0));
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("pack.deleteItem")}
          className="absolute inset-y-0 end-0 w-[72px] flex items-center justify-center bg-destructive text-white"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ transform: `translateX(${dx}px)`, transition: startX.current == null ? "transform 150ms ease" : "none" }}
        className={`relative flex items-center gap-3 border p-3 bg-card touch-pan-y ${
          item.packed ? "border-emerald-500/40" : "border-border"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="-m-2 p-2 shrink-0"
          aria-label={item.packed ? t("pack.markNotPacked") : t("pack.markPacked")}
        >
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              item.packed
                ? "bg-emerald-500 text-white"
                : "border-2 border-muted-foreground/40 hover:border-primary"
            }`}
          >
            {item.packed && <Check className="w-3.5 h-3.5" />}
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              item.packed ? "line-through text-muted-foreground opacity-70" : ""
            }`}
          >
            {item.label}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
          )}
        </div>
        {adder && (
          <span className="shrink-0" title={adder.displayName}>
            <UserAvatar name={adder.displayName} avatarUrl={adder.avatarUrl} seed={adder.userId} size="sm" />
          </span>
        )}
      </div>
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
                <UserAvatar
                  name={m.displayName}
                  avatarUrl={m.avatarUrl}
                  seed={m.userId}
                  size="md"
                />
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
