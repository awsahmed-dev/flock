"use client";

/**
 * DEV-ONLY preview of the AI planner wizard with built-in mock data —
 * lets us review the full journey (vibe → rhythm → route → results)
 * locally without ANTHROPIC/GOOGLE keys or a database. The page patches
 * window.fetch for /api/ai/plan only; server actions (add/vote) will
 * still fail locally — this is a UI preview, not a data flow.
 *
 * Not linked anywhere; returns 404 in production builds.
 */

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { AiPlannerPanel } from "@/components/trips/ai-planner-panel";

const img = (seed: string, w = 640, h = 420) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const maps = (name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

const ROUTE = {
  numDays: 9,
  legs: [
    {
      city: "Tokyo",
      cityLabel: "طوكيو",
      nights: 4,
      why: "قلب اليابان الحديث — المعابد بجانب ناطحات السحاب، وأفضل طعام في البلد.",
      travel: null,
      photoUrl: img("tokyo-city"),
    },
    {
      city: "Kyoto",
      cityLabel: "كيوتو",
      nights: 3,
      why: "عاصمة الثقافة: ألفا معبد، أحياء الغايشا، وأجمل حدائق اليابان.",
      travel: { mode: "train", note: "شينكانسن سريع، ~ساعتان و15 دقيقة" },
      photoUrl: img("kyoto-temple"),
    },
    {
      city: "Osaka",
      cityLabel: "أوساكا",
      nights: 2,
      why: "مطبخ اليابان وشوارعها الصاخبة — دوتونبوري ليلًا لا يُنسى.",
      travel: { mode: "train", note: "قطار محلي، ~30 دقيقة" },
      photoUrl: img("osaka-night"),
    },
  ],
};

function mkItem(
  day: number,
  type: "activity" | "meal",
  time: string,
  name: string,
  note: string,
  seed: string,
  rating: number,
  reviews: number,
  price: number | null = null,
  alt: { name: string; seed: string; rating: number; reviews: number } | null = null,
) {
  return {
    day,
    type,
    startTime: time,
    note,
    place: {
      placeId: `mock-${seed}`,
      name,
      lat: 35.68,
      lng: 139.76,
      rating,
      userRatingsTotal: reviews,
      priceLevel: price,
      photoUrl: img(seed),
      address: "Tokyo, Japan",
      category: type === "meal" ? "restaurant" : "attraction",
      placeTypes: [],
      mapsUrl: maps(name),
    },
    alt: alt
      ? {
          placeId: `mock-${alt.seed}`,
          name: alt.name,
          lat: 35.68,
          lng: 139.76,
          rating: alt.rating,
          userRatingsTotal: alt.reviews,
          priceLevel: price,
          photoUrl: img(alt.seed),
          address: "Tokyo, Japan",
          category: "attraction",
          placeTypes: [],
          mapsUrl: maps(alt.name),
        }
      : null,
  };
}

const ASSEMBLE: Record<string, { summary: string; items: ReturnType<typeof mkItem>[] }> = {
  Tokyo: {
    summary: "أربعة أيام تجمع أيقونات طوكيو الكبرى مع أزقتها الخفية — من سينسو-جي إلى سماء شيبويا.",
    items: [
      mkItem(1, "activity", "09:00", "معبد سينسو-جي", "أقدم معابد طوكيو وأشهرها — ابدؤوا قبل الزحام وبوابة الرعد خلفكم للصور.", "sensoji", 4.7, 138021),
      mkItem(1, "meal", "13:00", "أساكوسا رامن إيتشيبان", "رامن حلال قريب من المعبد — الطابور يستحق.", "ramen1", 4.6, 2841, 1),
      mkItem(1, "activity", "15:30", "شيبويا سكاي", "أشهر إطلالة في طوكيو — احجزوا الغروب وشاهدوا التقاطع من فوق.", "shibuya", 4.8, 52017, 3, { name: "برج طوكيو", seed: "ttower", rating: 4.5, reviews: 89412 }),
      mkItem(1, "meal", "19:30", "غيوكاتسو موتومورا شيبويا", "كاتسو الواغيو الشهير — تجربة الشواء على حجرك.", "gyukatsu", 4.7, 12746, 2),
      mkItem(2, "activity", "09:30", "ميجي جينغو", "غابة هادئة في قلب المدينة — بوابات التوري العملاقة وبراميل الساكي.", "meiji", 4.6, 75404),
      mkItem(2, "activity", "12:00", "تاكيشيتا ستريت", "شارع هاراجوكو الملوّن — كريب، أزياء، وطاقة لا تهدأ.", "harajuku", 4.4, 33210),
      mkItem(2, "meal", "14:00", "أفوري يوزو رامن", "رامن اليوزو الشهير — خفيف وحمضي ومختلف عن أي رامن جربتموه.", "afuri", 4.5, 8912, 2),
      mkItem(2, "activity", "17:00", "تيم لاب بلانتس", "متحف الأضواء الغامر — امشوا في الماء بين أسماك الكوي الرقمية.", "teamlab", 4.7, 41230, 3),
    ],
  },
  Kyoto: {
    summary: "ثلاثة أيام من المعابد الذهبية وغابات الخيزران وأحياء الغايشا.",
    items: [
      mkItem(5, "activity", "08:30", "فوشيمي إيناري", "آلاف بوابات التوري البرتقالية — اصعدوا مبكرًا قبل الحشود.", "fushimi", 4.7, 98307),
      mkItem(5, "meal", "13:00", "نيشيكي ماركت", "مطبخ كيوتو — تذوقوا وأنتم تمشون بين مئة محل.", "nishiki", 4.3, 27500, 2),
      mkItem(5, "activity", "15:30", "المعبد الذهبي كينكاكو-جي", "الجناح الذهبي على البحيرة — أيقونة كيوتو المطلقة.", "kinkaku", 4.6, 61240),
      mkItem(6, "activity", "09:00", "غابة خيزران أراشياما", "ممر الخيزران الشهير — الضوء بين السيقان سحر صباحي.", "arashiyama", 4.5, 44120),
      mkItem(6, "meal", "13:30", "أوكونومياكي كاتسو", "فطيرة كانساي على الصاج أمامكم.", "okono", 4.6, 3120, 1),
    ],
  },
  Osaka: {
    summary: "يومان لمطبخ اليابان: القلعة نهارًا ودوتونبوري ليلًا.",
    items: [
      mkItem(8, "activity", "09:30", "قلعة أوساكا", "أهم معلم تاريخي في المدينة — الحديقة المحيطة رائعة للمشي.", "osakacastle", 4.4, 98307),
      mkItem(8, "meal", "13:00", "كورومون ماركت", "سوق المأكولات الحي — سلطعون، واغيو، وفواكه لا تُنسى.", "kuromon", 4.1, 20671, 2),
      mkItem(8, "activity", "18:30", "دوتونبوري", "أشهر شارع ليلي في اليابان — اللافتات، الأكل، والفوضى الجميلة.", "dotonbori", 4.5, 71203, null, { name: "شينسيكاي", seed: "shinsekai", rating: 4.3, reviews: 25120 }),
    ],
  },
};

export default function PlannerPreviewPage() {
  const [ready, setReady] = useState(false);

  if (process.env.NODE_ENV === "production") notFound();

  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/ai/plan")) {
        const body = JSON.parse((init?.body as string) ?? "{}");
        if (body.mode === "route") {
          await new Promise((r) => setTimeout(r, 900));
          return new Response(JSON.stringify(ROUTE), { status: 200 });
        }
        if (body.mode === "assemble") {
          await new Promise((r) => setTimeout(r, 1800));
          const data = ASSEMBLE[body.leg?.city as string] ?? ASSEMBLE.Tokyo;
          return new Response(JSON.stringify(data), { status: 200 });
        }
      }
      return realFetch(input as RequestInfo, init);
    };
    setReady(true);
    return () => {
      window.fetch = realFetch;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-2 start-2 z-[100] rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 px-3 py-1 text-[11px] font-bold">
        DEV PREVIEW · mock data
      </div>
      {ready && (
        <AiPlannerPanel
          open
          onClose={() => {}}
          tripId="00000000-0000-0000-0000-000000000000"
          destination="اليابان"
        />
      )}
    </div>
  );
}
