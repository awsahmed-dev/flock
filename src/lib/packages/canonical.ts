/**
 * Tier-1 canonical packages — «المسار الكلاسيكي».
 *
 * The roundtable's resolution to the listicle problem (docs/planning-ux-audit
 * .md part 3): the famous route is trustworthy *when it says it's famous*.
 * Presented as "your personal AI plan" the same itinerary reads as generic
 * slop; presented as the classic route most first trips follow, it reads as
 * institutional knowledge — the friend who went last year.
 *
 * These are hand-curated, which is the point: no generation latency, no
 * hallucinated venue, and «جاهزة» is a promise we can actually keep. The
 * group's own saves are layered on top at render time (see buildPackage) —
 * canon owns the skeleton, the crew owns the texture.
 *
 * Ops: a monthly freshness pass re-checks every venue (open/closed, seasonal
 * hours, Ramadan variants). Only destinations in this file may use tier
 * "canonical"; everything else is honestly labelled "assembled".
 */

export interface CanonPlace {
  name: string;
  nameAr: string;
  /** one human line — the reason a person can repeat out loud as their own */
  why: string;
  whyAr: string;
  category: "sight" | "food" | "walk" | "shop" | "nature" | "rest";
  rating?: number;
  /** rough local-currency-free cost band, 0 = free */
  priceBand?: 0 | 1 | 2 | 3;
  startTime?: string;
}

export interface CanonDay {
  title: string;
  titleAr: string;
  city: string;
  cityAr: string;
  places: CanonPlace[];
}

export interface CanonPackage {
  /** match key — lowercased substrings we look for in the destination */
  match: string[];
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  /** the honest provenance line shown on the cover */
  provenance: string;
  provenanceAr: string;
  cities: { name: string; nameAr: string; nights: number }[];
  days: CanonDay[];
}

const JAPAN: CanonPackage = {
  match: ["japan", "tokyo", "kyoto", "osaka", "اليابان", "طوكيو", "كيوتو", "أوساكا"],
  title: "The classic Japan route",
  titleAr: "المسار الكلاسيكي لليابان",
  subtitle: "Tokyo → Kyoto → Osaka",
  subtitleAr: "طوكيو ← كيوتو ← أوساكا",
  provenance: "The route most first trips to Japan follow — in this order, for a reason.",
  provenanceAr: "المسار اللي تمشي عليه أغلب أول رحلة لليابان — بهذا الترتيب، ولها سبب.",
  cities: [
    { name: "Tokyo", nameAr: "طوكيو", nights: 3 },
    { name: "Kyoto", nameAr: "كيوتو", nights: 2 },
    { name: "Osaka", nameAr: "أوساكا", nights: 2 },
  ],
  days: [
    {
      title: "Land, and ease in", titleAr: "الوصول… وعلى مهل", city: "Tokyo", cityAr: "طوكيو",
      places: [
        { name: "Shibuya Crossing", nameAr: "تقاطع شيبويا", why: "The first 'we're really here' moment — go at dusk when the screens light up.", whyAr: "أول لحظة تحس فيها إنك وصلت فعلًا — روحوا وقت المغرب لما تشتغل الشاشات.", category: "sight", rating: 4.6, priceBand: 0, startTime: "17:00" },
                { name: "Nonbei Yokocho", nameAr: "نونبي يوكوتشو", why: "A lantern-lit alley of counter kitchens behind the station — six stools a place, no English menus, all the better.", whyAr: "زقاق مضاء بالفوانيس فيه مطابخ صغيرة على الكاونتر خلف المحطة — ست كراسي بالمحل، وما فيه قوائم إنجليزية، وهذا أحلى.", category: "food" },
      ],
    },
    {
      title: "Old Tokyo", titleAr: "طوكيو القديمة", city: "Tokyo", cityAr: "طوكيو",
      places: [
        { name: "Sensō-ji Temple", nameAr: "معبد سينسوجي", why: "Get there before 9 and you'll have the approach almost to yourself.", whyAr: "اوصلوا قبل التاسعة وبتلقون الممشى شبه فاضي لكم.", category: "sight", rating: 4.5, priceBand: 0, startTime: "08:30" },
        { name: "Nakamise Shopping Street", nameAr: "شارع ناكاميسي", why: "Street food the length of the approach — eat the melon pan warm.", whyAr: "أكل شوارع على طول الممشى — كلوا الميلون بان وهو سخن.", category: "food", rating: 4.3, priceBand: 1, startTime: "10:00" },
        { name: "Ueno Park", nameAr: "حديقة أوينو", why: "A slow green hour between temples and museums.", whyAr: "ساعة خضراء هادية بين المعابد والمتاحف.", category: "nature", rating: 4.4, priceBand: 0, startTime: "13:00" },
        { name: "Akihabara", nameAr: "أكيهابارا", why: "Six floors of noise and neon — worth it once, even if it's not your thing.", whyAr: "ست طوابق ضجة ونيون — تستاهل مرة، حتى لو مو ذوقكم.", category: "shop", rating: 4.4, priceBand: 1, startTime: "16:00" },
      ],
    },
    {
      title: "Views and gardens", titleAr: "إطلالات وحدائق", city: "Tokyo", cityAr: "طوكيو",
      places: [
        { name: "Meiji Jingu", nameAr: "ضريح ميجي", why: "Forest in the middle of the city — the gravel path is the point.", whyAr: "غابة بقلب المدينة — الممشى الحصوي هو المقصد.", category: "nature", rating: 4.6, priceBand: 0, startTime: "09:00" },
        { name: "Omotesandō", nameAr: "أوموتيساندو", why: "Architecture street. Window-shop it even if you buy nothing.", whyAr: "شارع العمارة. تمشوا وتفرجوا حتى لو ما اشتريتوا شي.", category: "walk", rating: 4.4, priceBand: 2, startTime: "11:30" },
        { name: "Shinjuku Gyoen", nameAr: "حديقة شينجوكو", why: "The one garden worth the entry fee — three garden styles in one.", whyAr: "الحديقة الوحيدة اللي تستاهل التذكرة — ثلاث طرز بمكان واحد.", category: "nature", rating: 4.7, priceBand: 1, startTime: "14:30" },
        { name: "Omoide Yokocho", nameAr: "أومويدي يوكوتشو", why: "Smoke, skewers, and elbow room for nobody. Dinner standing up.", whyAr: "دخان وأسياخ وزحمة — عشاء وأنتم واقفين.", category: "food", rating: 4.4, priceBand: 2, startTime: "19:00" },
      ],
    },
    {
      title: "Shinkansen to Kyoto", titleAr: "الشينكانسن إلى كيوتو", city: "Kyoto", cityAr: "كيوتو",
      places: [
        { name: "Fushimi Inari Taisha", nameAr: "فوشيمي إيناري", why: "Go at 7am. By 10 the gates are a queue, and the whole magic is the quiet.", whyAr: "روحوا الساعة ٧ الصبح. بعد العاشرة تصير البوابات طابور، والسحر كله بالهدوء.", category: "sight", rating: 4.8, priceBand: 0, startTime: "07:30" },
        { name: "Nishiki Market", nameAr: "سوق نيشيكي", why: "Lunch as a walk — buy one thing from five stalls.", whyAr: "غداء وأنتم ماشين — خذوا شي واحد من خمس بسطات.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:30" },
        { name: "Gion at dusk", nameAr: "جيون وقت المغرب", why: "Wooden machiya streets; if you're lucky, a geiko crossing to work.", whyAr: "شوارع البيوت الخشبية؛ وإذا حالفكم الحظ تشوفون جيكو رايحة شغلها.", category: "walk", rating: 4.6, priceBand: 0, startTime: "17:30" },
      ],
    },
    {
      title: "Bamboo and temples", titleAr: "الخيزران والمعابد", city: "Kyoto", cityAr: "كيوتو",
      places: [
        { name: "Arashiyama Bamboo Grove", nameAr: "غابة أراشياما", why: "Early or not at all — it's a corridor, and corridors fill up.", whyAr: "بدري أو لا تروحون — هو ممر، والممرات تنزحم.", category: "nature", rating: 4.5, priceBand: 0, startTime: "08:00" },
        { name: "Tenryū-ji", nameAr: "معبد تنريوجي", why: "The garden was designed in 1339 and hasn't needed changing.", whyAr: "الحديقة مصممة من ١٣٣٩ وما احتاجت تغيير.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
        { name: "Kinkaku-ji", nameAr: "المعبد الذهبي", why: "Ten minutes of looking, and worth the trip across town for them.", whyAr: "عشر دقايق تفرّج، وتستاهل القطع للطرف الثاني من المدينة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "14:00" },
      ],
    },
    {
      title: "Osaka, for eating", titleAr: "أوساكا… للأكل", city: "Osaka", cityAr: "أوساكا",
      places: [
        { name: "Dōtonbori", nameAr: "دوتونبوري", why: "Loud, lit, and unserious — the anti-Kyoto, which is why it goes last.", whyAr: "ضجة وأنوار وبدون جدية — عكس كيوتو، وعشان كذا جاية بالآخر.", category: "walk", rating: 4.5, priceBand: 0, startTime: "18:00" },
        { name: "Kuromon Ichiba Market", nameAr: "سوق كورومون", why: "Grilled scallops standing at the stall. That's the whole plan.", whyAr: "إسكالوب مشوي وأنتم واقفين عند البسطة. هذي كل الخطة.", category: "food", rating: 4.2, priceBand: 2, startTime: "12:00" },
      ],
    },
    {
      title: "Last morning", titleAr: "آخر صباح", city: "Osaka", cityAr: "أوساكا",
      places: [
        { name: "Osaka Castle Park", nameAr: "حديقة قلعة أوساكا", why: "A walk, a coffee, and time to make your flight.", whyAr: "مشية وقهوة ووقت يكفي لرحلتكم.", category: "nature", rating: 4.5, priceBand: 0, startTime: "09:00" },
      ],
    },
  ],
};

const ISTANBUL: CanonPackage = {
  match: ["istanbul", "turkey", "türkiye", "اسطنبول", "إسطنبول", "تركيا"],
  title: "The classic Istanbul route",
  titleAr: "المسار الكلاسيكي لإسطنبول",
  subtitle: "Old city → Bosphorus → the other side",
  subtitleAr: "المدينة القديمة ← البسفور ← الضفة الثانية",
  provenance: "The order that keeps you off the tram twice a day.",
  provenanceAr: "الترتيب اللي يريحكم من قطع المدينة مرتين باليوم.",
  cities: [{ name: "Istanbul", nameAr: "إسطنبول", nights: 5 }],
  days: [
    {
      title: "Sultanahmet, on foot", titleAr: "السلطان أحمد… مشي", city: "Istanbul", cityAr: "إسطنبول",
      places: [
        { name: "Hagia Sophia", nameAr: "آيا صوفيا", why: "First thing in the morning — the light comes through the upper windows.", whyAr: "أول شي بالصبح — الضوء يدخل من الشبابيك العلوية.", category: "sight", rating: 4.7, priceBand: 2, startTime: "08:30" },
        { name: "Blue Mosque", nameAr: "المسجد الأزرق", why: "Across the square. Check prayer times before you walk over.", whyAr: "قبال الساحة. شوفوا أوقات الصلاة قبل ما تمشون.", category: "sight", rating: 4.7, priceBand: 0, startTime: "10:30" },
        { name: "Basilica Cistern", nameAr: "صهريج البازيليك", why: "Cool, dark, and twenty minutes — the perfect midday break.", whyAr: "بارد ومظلم وعشرين دقيقة — أفضل استراحة ظهر.", category: "sight", rating: 4.5, priceBand: 2, startTime: "13:00" },
        { name: "Grand Bazaar", nameAr: "البازار الكبير", why: "Go in without a list. Leave before you're tired, not after.", whyAr: "ادخلوا بدون قائمة. واطلعوا قبل ما تتعبون، مو بعدها.", category: "shop", rating: 4.3, priceBand: 2, startTime: "15:00" },
      ],
    },
    {
      title: "Palace day", titleAr: "يوم القصور", city: "Istanbul", cityAr: "إسطنبول",
      places: [
        { name: "Topkapı Palace", nameAr: "قصر توبكابي", why: "Three hours minimum. The Harem ticket is worth the extra.", whyAr: "ثلاث ساعات على الأقل. وتذكرة الحرم تستاهل الزيادة.", category: "sight", rating: 4.6, priceBand: 3, startTime: "09:00" },
        { name: "Gülhane Park", nameAr: "حديقة غولهانة", why: "Downhill from the palace gate — tea under the plane trees.", whyAr: "نازل من باب القصر — شاي تحت أشجار الدلب.", category: "nature", rating: 4.5, priceBand: 0, startTime: "13:30" },
        { name: "Spice Bazaar", nameAr: "السوق المصري", why: "Buy the pistachios here, not at the Grand Bazaar.", whyAr: "اشتروا الفستق من هنا، مو من البازار الكبير.", category: "shop", rating: 4.4, priceBand: 1, startTime: "16:00" },
      ],
    },
    {
      title: "The Bosphorus", titleAr: "البسفور", city: "Istanbul", cityAr: "إسطنبول",
      places: [
        { name: "Bosphorus ferry to Anadolu Kavağı", nameAr: "عبّارة البسفور إلى أنادولو كاواغي", why: "The public ferry, not the tourist cruise — same water, a third of the price.", whyAr: "العبّارة العامة، مو الجولة السياحية — نفس الماء وبثلث السعر.", category: "sight", rating: 4.8, priceBand: 1, startTime: "10:00" },
        { name: "Fish lunch at the pier", nameAr: "غداء سمك عند الميناء", why: "Whatever came in that morning, grilled, outside.", whyAr: "اللي جا الصبح، مشوي، وبالخارج.", category: "food", rating: 4.4, priceBand: 2, startTime: "13:30" },
      ],
    },
    {
      title: "Modern side", titleAr: "الجهة العصرية", city: "Istanbul", cityAr: "إسطنبول",
      places: [
        { name: "İstiklal Avenue", nameAr: "شارع الاستقلال", why: "Walk it end to end once; the side streets are the real find.", whyAr: "امشوه من طرف لطرف مرة؛ الشوارع الجانبية هي الاكتشاف الحقيقي.", category: "walk", rating: 4.3, priceBand: 1, startTime: "11:00" },
        { name: "Galata Tower", nameAr: "برج غلطة", why: "Skip the queue and drink the view from a rooftop nearby instead.", whyAr: "تجاوزوا الطابور واشربوا الإطلالة من سطح قريب بدالها.", category: "sight", rating: 4.4, priceBand: 2, startTime: "14:00" },
        { name: "Karaköy for dinner", nameAr: "كاراكوي للعشاء", why: "Where the city eats when it isn't performing for anyone.", whyAr: "وين تاكل المدينة لما ما تكون تمثل على أحد.", category: "food", rating: 4.5, priceBand: 2, startTime: "19:30" },
      ],
    },
    {
      title: "Asia, briefly", titleAr: "آسيا… سريعًا", city: "Istanbul", cityAr: "إسطنبول",
      places: [
        { name: "Kadıköy market streets", nameAr: "أسواق كاديكوي", why: "Twenty minutes on a ferry and the tourists thin out completely.", whyAr: "عشرين دقيقة بالعبّارة والسياح يختفون تمامًا.", category: "food", rating: 4.6, priceBand: 1, startTime: "11:00" },
        { name: "Moda seafront walk", nameAr: "كورنيش مودا", why: "Tea on the grass facing the old city you spent three days inside.", whyAr: "شاي على العشب وقبالكم المدينة القديمة اللي قضيتم فيها ٣ أيام.", category: "walk", rating: 4.6, priceBand: 0, startTime: "16:00" },
      ],
    },
  ],
};

const GEORGIA: CanonPackage = {
  match: ["georgia", "tbilisi", "batumi", "kazbegi", "جورجيا", "تبليسي", "باتومي"],
  title: "The classic Georgia route",
  titleAr: "المسار الكلاسيكي لجورجيا",
  subtitle: "Tbilisi → the mountains → back",
  subtitleAr: "تبليسي ← الجبال ← ورجعة",
  provenance: "Old town, one mountain day, one valley day — the shape almost every Gulf trip takes.",
  provenanceAr: "البلدة القديمة، ويوم جبال، ويوم وادي — شكل أغلب رحلات الخليج لجورجيا.",
  cities: [{ name: "Tbilisi", nameAr: "تبليسي", nights: 5 }],
  days: [
    {
      title: "Old Tbilisi", titleAr: "تبليسي القديمة", city: "Tbilisi", cityAr: "تبليسي",
      places: [
        { name: "Abanotubani sulphur baths", nameAr: "حمامات الكبريت", why: "The brick domes district — book a private room, it's the local ritual.", whyAr: "حي القباب الطينية — احجزوا غرفة خاصة، هذي عادة أهل البلد.", category: "rest", rating: 4.4, priceBand: 2, startTime: "10:00" },
        { name: "Narikala Fortress", nameAr: "قلعة ناريكالا", why: "Take the cable car up, walk the ridge down into the old town.", whyAr: "اطلعوا بالتلفريك وانزلوا مشي على الحافة للبلدة القديمة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "13:00" },
        { name: "Shardeni Street", nameAr: "شارع شاردني", why: "Dinner outside; every balcony on this street is somebody's restaurant.", whyAr: "عشاء بالخارج؛ كل بلكونة بهالشارع مطعم لأحد.", category: "food", rating: 4.2, priceBand: 2, startTime: "19:00" },
      ],
    },
    {
      title: "Kazbegi day", titleAr: "يوم كازبيجي", city: "Tbilisi", cityAr: "تبليسي",
      places: [
        { name: "Gergeti Trinity Church", nameAr: "كنيسة جيرجيتي", why: "Three hours each way and worth every minute — go with a driver, not a bus.", whyAr: "ثلاث ساعات رايح ومثلها جاي وتستاهل — خذوا سائق، مو باص.", category: "nature", rating: 4.8, priceBand: 2, startTime: "07:30" },
        { name: "Ananuri Fortress", nameAr: "قلعة أنانوري", why: "The stop everyone makes on the way, and rightly.", whyAr: "الوقفة اللي يسويها الكل بالطريق، وعن حق.", category: "sight", rating: 4.6, priceBand: 0, startTime: "10:00" },
      ],
    },
    {
      title: "Sighnaghi and the valley", titleAr: "سيغناغي والوادي", city: "Tbilisi", cityAr: "تبليسي",
      places: [
        { name: "Sighnaghi", nameAr: "سيغناغي", why: "Walled hill town over the Alazani valley — two hours out, easy day.", whyAr: "بلدة مسورة على تلة فوق وادي ألازاني — ساعتين برا، يوم خفيف.", category: "sight", rating: 4.7, priceBand: 0, startTime: "09:30" },
        { name: "Bodbe Monastery", nameAr: "دير بودبي", why: "Cypress avenue and a valley view that stops the conversation.", whyAr: "ممشى السرو وإطلالة وادي توقف الكلام.", category: "sight", rating: 4.7, priceBand: 0, startTime: "13:00" },
      ],
    },
    {
      title: "Museums and markets", titleAr: "متاحف وأسواق", city: "Tbilisi", cityAr: "تبليسي",
      places: [
        { name: "Georgian National Museum", nameAr: "المتحف الوطني الجورجي", why: "The gold room is small and extraordinary; skip the rest if you're short.", whyAr: "غرفة الذهب صغيرة ومذهلة؛ تجاوزوا الباقي إذا وقتكم ضيق.", category: "sight", rating: 4.4, priceBand: 1, startTime: "10:30" },
        { name: "Dry Bridge Market", nameAr: "سوق الجسر الجاف", why: "Soviet cameras, silver, and junk. Haggle gently.", whyAr: "كاميرات سوفيتية وفضة وخردة. فاصلوا بلطف.", category: "shop", rating: 4.2, priceBand: 1, startTime: "14:00" },
        { name: "Fabrika courtyard", nameAr: "ساحة فابريكا", why: "Old sewing factory, now the courtyard everyone ends up in.", whyAr: "مصنع خياطة قديم، صار الساحة اللي ينتهي فيها الكل.", category: "food", rating: 4.5, priceBand: 1, startTime: "19:00" },
      ],
    },
    {
      title: "Slow last day", titleAr: "آخر يوم… على مهل", city: "Tbilisi", cityAr: "تبليسي",
      places: [
        { name: "Mtatsminda Park", nameAr: "حديقة متاتسميندا", why: "Funicular up for the whole-city view before the airport.", whyAr: "القطار المائل لفوق وإطلالة المدينة كاملة قبل المطار.", category: "nature", rating: 4.5, priceBand: 1, startTime: "10:00" },
      ],
    },
  ],
};

export const CANONICAL_PACKAGES: CanonPackage[] = [JAPAN, ISTANBUL, GEORGIA];

/** Find the canonical route for a destination string, if we curate one. */
export function findCanonical(destination: string): CanonPackage | null {
  const d = (destination || "").toLowerCase();
  if (!d.trim()) return null;
  for (const pkg of CANONICAL_PACKAGES) {
    if (pkg.match.some((m) => d.includes(m))) return pkg;
  }
  return null;
}
