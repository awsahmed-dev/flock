/**
 * Thailand — «بانكوك وبوكيت».
 *
 * A river city and an island, eighty-five minutes apart in the air. Two
 * sleeping bases with four day shapes each, and two day-trip bases — the old
 * capital north of Bangkok, and Phi Phi off Phuket — that are mornings you
 * leave for and evenings you come back from, not places to move the bags to.
 *
 * Phuket is curated away from the strip: the days here are limestone bays,
 * a Muslim stilt village older than the resorts, an old tin town, and the
 * southern capes. Bangkok's evenings are the river and the markets. Where a
 * famous stop only runs at weekends or closes with the tide, the line says so
 * — that is the part a plan is actually for.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Bangkok ──────────────────────────────────────────────────────────── */

const BANGKOK_DAYS: CuratedDay[] = [
  {
    key: "bangkok-arrive",
    title: "Land, and get on the river",
    titleAr: "الوصول… وعلى طول للنهر",
    places: [
      { name: "Chao Phraya express boat from Sathorn", nameAr: "قارب تشاو فرايا السريع من ساتورن", why: "The orange-flag boat is the cheapest ride in the city and the best view in it — board at Sathorn and stay on until the light goes.", whyAr: "قارب العلم البرتقالي أرخص مواصلة بالمدينة وأحلى إطلالة فيها — اركبوا من ساتورن واقعدوا فيه لين يروح الضوء.", category: "sight", rating: 4.5, priceBand: 0, startTime: "16:30" },
      { name: "Wat Arun", nameAr: "معبد وات أرون", why: "Cross at Tha Tien and climb the central prang as the sun drops — the porcelain covering it is broken Chinese ballast, and it catches the last light.", whyAr: "اعبروا من تا تيين واطلعوا البرج الأوسط والشمس نازلة — الخزف اللي يكسوه بقايا صحون صينية، ويلمع بآخر ضوء.", category: "sight", rating: 4.7, priceBand: 1, startTime: "17:45" },
      { name: "Asiatique The Riverfront", nameAr: "آسياتيك الواجهة النهرية", why: "Old riverside warehouses turned night market, with a free shuttle boat from Sathorn — come for the walk along the water, not the ferris wheel.", whyAr: "مخازن قديمة على النهر تحولت سوق ليلي، وفيه قارب مجاني من ساتورن — تعالوا للمشية على الماء، مو للعجلة الدوارة.", category: "shop", rating: 4.2, priceBand: 1, startTime: "19:30" },
    ],
  },
  {
    key: "bangkok-old",
    title: "The old city, early",
    titleAr: "المدينة القديمة… بدري",
    places: [
      { name: "Grand Palace", nameAr: "القصر الكبير", why: "Be at the gate at eight, shoulders and knees covered or you're renting a shirt — and the Emerald Buddha hall empties for ten minutes at nine while the groups do the courtyard.", whyAr: "كونوا عند البوابة الساعة ثمانية، وبملابس تغطي الأكتاف والركب وإلا بتستأجرون — وقاعة بوذا الزمردي تفضى عشر دقايق الساعة تسعة وقت ما تكون المجموعات بالساحة.", category: "sight", rating: 4.6, priceBand: 2, startTime: "08:00" },
      { name: "Wat Pho", nameAr: "معبد وات فو", why: "The reclining Buddha is forty-six metres long and cannot be photographed whole, so stop trying — walk the corridor and look at the feet, inlaid in mother-of-pearl.", whyAr: "بوذا المستلقي طوله ٤٦ متر وما ينصور كامل، فلا تتعبون نفسكم — امشوا الممر وشوفوا القدمين، مطعّمة بعرق اللؤلؤ.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:30" },
      { name: "Tha Maharaj", nameAr: "تا مهاراج", why: "A shaded riverside terrace five minutes from the palace gate — the only lunch in the old city that isn't a plastic stool in 34 degrees.", whyAr: "شرفة مظللة على النهر على بعد خمس دقايق من باب القصر — الغداء الوحيد بالمدينة القديمة اللي مو كرسي بلاستيك بحر ٣٤ درجة.", category: "food", rating: 4.2, priceBand: 2, startTime: "12:30" },
      { name: "Wat Saket Golden Mount", nameAr: "معبد الجبل الذهبي", why: "Three hundred and forty-four steps spiralling up an artificial hill — go at five, the bells at the top are there to be rung, and the old city turns gold underneath you.", whyAr: "٣٤٤ درجة تلتف حول تلة صناعية — اطلعوا الساعة خمسة، الأجراس فوق موجودة عشان تُقرع، والمدينة القديمة تتذهّب تحتكم.", category: "sight", rating: 4.5, priceBand: 1, startTime: "16:30" },
    ],
  },
  {
    key: "bangkok-markets",
    title: "Markets, silk, and a new park",
    titleAr: "أسواق وحرير وحديقة جديدة",
    places: [
      { name: "Or Tor Kor Market", nameAr: "سوق أور تور كور", why: "The government fruit market across the road from Chatuchak — mangosteen and durian cut and boxed, and clean enough to eat standing at the stall.", whyAr: "سوق الفواكه الحكومي قبال تشاتوتشاك — مانغوستين ودوريان مقطّع ومعلّب، ونظيف لدرجة تاكلونه وأنتم واقفين.", category: "food", rating: 4.5, priceBand: 2, startTime: "09:30" },
      { name: "Chatuchak Weekend Market", nameAr: "سوق تشاتوتشاك", why: "Fifteen thousand stalls, and it only runs Saturday and Sunday — drop a pin on the gate you came in by, or you will not find it again.", whyAr: "خمسة عشر ألف بسطة، وما يفتح إلا السبت والأحد — حطوا علامة على البوابة اللي دخلتوا منها، وإلا ما بتلقونها.", category: "shop", rating: 4.4, priceBand: 1, startTime: "11:00", openDays: [6, 0] },
      { name: "Jim Thompson House", nameAr: "بيت جيم طومسون", why: "Six teak houses moved here by the American who rebuilt Thai silk, then walked into a Malaysian jungle in 1967 and was never found. The guided tour is included and short.", whyAr: "ستة بيوت ساج نقلها الأمريكي اللي أحيا صناعة الحرير التايلاندي، وبعدين دخل غابة ماليزية سنة ١٩٦٧ وما رجع. الجولة مشمولة وقصيرة.", category: "sight", rating: 4.5, priceBand: 1, startTime: "15:00" },
      { name: "Benjakitti Forest Park", nameAr: "منتزه بنجاكيتي", why: "A tobacco factory turned wetland in 2022 — a raised boardwalk over the reeds with the towers behind it, and at six the whole city is jogging it.", whyAr: "مصنع تبغ تحول لأرض رطبة سنة ٢٠٢٢ — ممشى مرفوع فوق القصب والأبراج خلفه، والساعة ستة تكون المدينة كلها تركض فيه.", category: "nature", rating: 4.6, priceBand: 0, startTime: "17:30" },
    ],
  },
  {
    key: "bangkok-green",
    title: "Across the river, and the glass stupa",
    titleAr: "الضفة الثانية والقبة الزجاجية",
    places: [
      { name: "Bang Krachao", nameAr: "بانغ كراتشاو", why: "A jungle peninsula inside the city: a twenty-baht boat across from Klong Toei, then a rented bicycle on concrete paths raised above the swamp. Go before the heat.", whyAr: "شبه جزيرة غابة داخل المدينة: قارب بعشرين بات من كلونغ توي، وبعدها دراجة مستأجرة على ممرات خرسانية مرفوعة فوق المستنقع. روحوا قبل الحر.", category: "nature", rating: 4.5, priceBand: 1, startTime: "08:30" },
      { name: "Wat Paknam Phasi Charoen", nameAr: "معبد وات باكنام", why: "Take the lift to the fifth floor: a green glass stupa under a dome painted with the whole cosmos. It is free, and almost nobody outside Thailand knows it is there.", whyAr: "اطلعوا بالمصعد للدور الخامس: قبة زجاجية خضراء تحت سقف مرسوم عليه الكون كله. مجاني، وبالكاد أحد برا تايلاند يدري فيه.", category: "sight", rating: 4.7, priceBand: 0, startTime: "12:00" },
      { name: "ICONSIAM", nameAr: "آيكون سيام", why: "The indoor floating market on the ground floor is the reason to come — real vendors in real boats, out of the heat — and the riverside deck outside is the best free view in the city.", whyAr: "السوق العائم المسقوف بالدور الأرضي هو السبب — باعة حقيقيين بقوارب حقيقية وبعيد عن الحر — والشرفة على النهر برا أحسن إطلالة مجانية بالمدينة.", category: "shop", rating: 4.5, priceBand: 2, startTime: "15:30" },
    ],
  },
];

/* ── Phuket ───────────────────────────────────────────────────────────── */

const PHUKET_DAYS: CuratedDay[] = [
  {
    key: "phuket-arrive",
    title: "Land, and the west coast",
    titleAr: "الوصول… والساحل الغربي",
    places: [
      { name: "Kata Beach", nameAr: "شاطئ كاتا", why: "An hour south of the airport, and the last twenty minutes of that road is the point — a wide bay, calm water from November to April, and nothing like Patong.", whyAr: "ساعة جنوب المطار، وآخر عشرين دقيقة من الطريق هي المقصد — خليج واسع وماء هادي من نوفمبر لأبريل، ولا يشبه باتونغ أبدًا.", category: "nature", rating: 4.5, priceBand: 0, startTime: "16:00" },
      { name: "Karon Viewpoint", nameAr: "مطل كارون", why: "Fifteen minutes uphill from Kata: three bays in one frame, and the sun goes down at the right-hand end of it. Come at six, leave at seven.", whyAr: "ربع ساعة طلوع من كاتا: ثلاثة خلجان بإطار واحد، والشمس تغيب بطرفه الأيمن. تعالوا الساعة ستة وارجعوا سبعة.", category: "sight", rating: 4.5, priceBand: 0, startTime: "18:00" },
    ],
  },
  {
    key: "phuket-oldtown",
    title: "Old Town, and the Big Buddha at dusk",
    titleAr: "البلدة القديمة… وبوذا الكبير وقت الغروب",
    places: [
      { name: "Phuket Old Town", nameAr: "بلدة بوكيت القديمة", why: "Thalang Road is Sino-Portuguese: tin money, Chinese courtyards, Portuguese fronts — walk it before eleven while the arcades are still in shade.", whyAr: "شارع ثالانغ صيني-برتغالي: فلوس القصدير وأفنية صينية وواجهات برتغالية — امشوه قبل الحادية عشرة والأروقة لا زالت بالظل.", category: "walk", rating: 4.5, priceBand: 0, startTime: "09:30" },
      { name: "Soi Romanee", nameAr: "زقاق روماني", why: "One short lane of painted shophouses off Thalang, restored door by door — it is the photograph of Phuket that isn't a beach.", whyAr: "زقاق قصير من بيوت ملوّنة يتفرع من ثالانغ، رمّموه باب باب — وهو صورة بوكيت الوحيدة اللي مو شاطئ.", category: "walk", rating: 4.4, priceBand: 0, startTime: "10:45" },
      { name: "Wat Chalong", nameAr: "معبد وات شالونغ", why: "The island's main temple, and the top floor of the pagoda holds a bone fragment of the Buddha — shoes come off at the stairs, not at the door.", whyAr: "معبد الجزيرة الرئيسي، وبالدور الأعلى من البرج شظية عظم منسوبة لبوذا — الأحذية تنخلع عند الدرج مو عند الباب.", category: "sight", rating: 4.5, priceBand: 0, startTime: "14:30" },
      { name: "Big Buddha Phuket", nameAr: "بوذا الكبير ببوكيت", why: "Forty-five metres of white marble on the ridge between two coasts — come for the last hour of light, when both seas are visible and the marble turns orange.", whyAr: "خمسة وأربعين متر رخام أبيض على الحافة بين ساحلين — تعالوا بآخر ساعة ضوء، لما يبان البحران ويصير الرخام برتقالي.", category: "sight", rating: 4.6, priceBand: 0, startTime: "16:30" },
    ],
  },
  {
    key: "phuket-phangnga",
    title: "Phang Nga Bay, and the village on stilts",
    titleAr: "خليج فانغ نغا والقرية على الأعمدة",
    places: [
      { name: "Ao Phang Nga National Park", nameAr: "محمية آو فانغ نغا", why: "Leave from Ao Por on the north-east coast rather than Phuket town — you're on the water an hour earlier and inside the limestone before the Krabi boats arrive.", whyAr: "اطلعوا من آو بور بالساحل الشمالي الشرقي بدل مدينة بوكيت — بتكونون بالماء قبل بساعة وبين الصخور قبل ما توصل قوارب كرابي.", category: "nature", rating: 4.6, priceBand: 2, startTime: "08:30" },
      { name: "Ko Panyi", nameAr: "جزيرة كو باني", why: "A Muslim fishing village of around 1,800 people built entirely on stilts over the water, with its own mosque, school, and a floating football pitch the children built themselves. Eat lunch here.", whyAr: "قرية صيد مسلمة فيها قرابة ١٨٠٠ نسمة مبنية كاملة على أعمدة فوق الماء، ولها مسجدها ومدرستها وملعب كرة عائم بناه أطفالها بأنفسهم. تغدوا هنا.", category: "food", rating: 4.4, priceBand: 1, startTime: "11:30" },
      { name: "James Bond Island", nameAr: "جزيرة جيمس بوند", why: "Ko Tapu is a twenty-metre limestone needle photographed since 1974 — you get ten minutes on a small beach, and the ride between the cliffs is the real thing.", whyAr: "كو تابو إبرة جيرية بعشرين متر تنصوّر من سنة ١٩٧٤ — عندكم عشر دقايق على شاطئ صغير، والمشوار بين الجروف هو الحلو فعلًا.", category: "sight", rating: 4.3, priceBand: 1, startTime: "14:00" },
    ],
  },
  {
    key: "phuket-south",
    title: "The southern tip",
    titleAr: "الطرف الجنوبي",
    places: [
      { name: "Nai Harn Beach", nameAr: "شاطئ ناي هارن", why: "The last real beach before the island ends — a lagoon behind it, no hotel strip in front of it, and the best swimming on Phuket in the dry season.", whyAr: "آخر شاطئ حقيقي قبل ما تنتهي الجزيرة — بحيرة خلفه وما فيه صف فنادق قدامه، وأحسن سباحة ببوكيت بموسم الجفاف.", category: "nature", rating: 4.6, priceBand: 0, startTime: "09:30" },
      { name: "Rawai Seafood Market", nameAr: "سوق سمك راواي", why: "Pick your fish off the ice and carry it across the road — the kitchens opposite cook it by weight, and you pay a third of a hotel's price for the same snapper.", whyAr: "اختاروا سمككم من على الثلج وعدوا فيه الشارع — المطابخ المقابلة تطبخه بالوزن، وبتدفعون ثلث سعر الفندق لنفس السمكة.", category: "food", rating: 4.3, priceBand: 2, startTime: "13:00" },
      { name: "Promthep Cape", nameAr: "رأس بروم تيب", why: "The southernmost point, and the whole island drives out here for sunset — park at the lighthouse end and walk the ridge away from the terrace.", whyAr: "أقصى نقطة جنوب، والجزيرة كلها تجي هنا للغروب — اركنوا عند المنارة وامشوا على الحافة بعيد عن المدرج.", category: "sight", rating: 4.6, priceBand: 0, startTime: "17:30" },
    ],
  },
];

/* ── Thailand: day-trip shapes ────────────────────────────────────────── */

const AYUTTHAYA_DAYTRIP: CuratedDay = {
  key: "ayutthaya-daytrip",
  title: "Ayutthaya in a day",
  titleAr: "أيوتايا بيوم",
  places: [
    { name: "Bang Pa-In Royal Palace", nameAr: "قصر بانغ با-إن الملكي", why: "Twenty kilometres before the ruins, so stop here on the way up: a Thai king's summer palace built as a Chinese mansion, a Gothic tower and a pavilion in a pond. Nothing matches, and that's the charm.", whyAr: "على بعد عشرين كيلو قبل الأطلال، فقفوا هنا وأنتم طالعين: مقر صيفي لملك تايلاندي بُني قصر صيني وبرج قوطي وجناح وسط بركة. ما فيه شي يناسب الثاني، وهذا جماله.", category: "sight", rating: 4.4, priceBand: 1, startTime: "09:00" },
    { name: "Wat Mahathat", nameAr: "معبد وات ماهاثات", why: "The Buddha head held in the fig roots is here — it sits at ground level and you're asked to crouch, so your head is never higher than his.", whyAr: "رأس بوذا المحتضن بجذور التين موجود هنا — على مستوى الأرض ويطلبون منكم تنحنون، عشان ما يصير رأسكم أعلى من رأسه.", category: "sight", rating: 4.6, priceBand: 1, startTime: "11:00" },
    { name: "Wat Phra Si Sanphet", nameAr: "معبد وات فرا سي سانفيت", why: "Three bell-shaped chedis in a row, holding three kings — this was the royal temple, and the size of the ruin tells you what was burned here in 1767.", whyAr: "ثلاث قباب على شكل جرس بصف واحد، تضم ثلاثة ملوك — هذا كان المعبد الملكي، وحجم الخراب يقول لكم وش احترق هنا سنة ١٧٦٧.", category: "sight", rating: 4.6, priceBand: 1, startTime: "13:30" },
    { name: "Wat Chaiwatthanaram", nameAr: "معبد وات تشايواتانارام", why: "It faces west over the river, so leave it until last — the towers go orange at six and the whole complex empties around then.", whyAr: "يواجه الغرب على النهر، فخلوه بالآخر — أبراجه تصير برتقالية الساعة ستة والموقع كله يفضى بهالوقت.", category: "sight", rating: 4.7, priceBand: 1, startTime: "16:30" },
  ],
};

const PHI_PHI_DAYTRIP: CuratedDay = {
  key: "phi-phi-daytrip",
  title: "Phi Phi in a day",
  titleAr: "بي بي بيوم",
  places: [
    { name: "Maya Bay", nameAr: "خليج مايا", why: "Closed for four years to let the reef recover and reopened with rules: no boats in the bay, no swimming off the sand, one hour. Take the first ferry and you get it nearly empty.", whyAr: "سكّروه أربع سنوات لين تعافت الشعاب وفتحوه بشروط: ما فيه قوارب داخل الخليج ولا سباحة من الرمل، وساعة وحدة بس. خذوا أول عبّارة وبتلقونه شبه فاضي.", category: "nature", rating: 4.5, priceBand: 2, startTime: "09:30" },
    { name: "Pileh Lagoon", nameAr: "بحيرة بيليه", why: "A flooded crater ringed by cliffs, with water the colour of a swimming pool — get in from the boat, the walls go straight down.", whyAr: "فوهة مغمورة محاطة بجروف، ولون مائها مثل المسابح — انزلوا من القارب، الجدران نازلة عمودي.", category: "nature", rating: 4.7, priceBand: 2, startTime: "11:00" },
    { name: "Phi Phi Don", nameAr: "جزيرة في في دون", why: "The only inhabited island of the group — climb to the viewpoint above Tonsai for the two bays meeting at the sandbar, then take the boat back before the afternoon wind.", whyAr: "الجزيرة المسكونة الوحيدة بالمجموعة — اطلعوا للمطل فوق تونساي وشوفوا الخليجين يلتقيان عند الحاجز الرملي، وارجعوا بالقارب قبل ريح العصر.", category: "walk", rating: 4.3, priceBand: 1, startTime: "13:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const BASES: Record<BaseId, Base> = {
  bangkok: {
    id: "bangkok",
    name: "Bangkok",
    nameAr: "بانكوك",
    country: "TH",
    lat: 13.7563,
    lng: 100.5018,
    photoQuery: "Bangkok Thailand Chao Phraya river temples",
    match: ["bangkok", "thailand", "بانكوك", "تايلاند", "تايلند"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["ayutthaya"],
    pairsWith: ["phuket"],
    days: BANGKOK_DAYS,
  },
  phuket: {
    id: "phuket",
    name: "Phuket",
    nameAr: "بوكيت",
    country: "TH",
    lat: 7.8804,
    lng: 98.3923,
    photoQuery: "Phuket Thailand limestone bay beach",
    match: ["phuket", "بوكيت", "فوكيت"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["phi_phi"],
    pairsWith: ["bangkok"],
    days: PHUKET_DAYS,
  },

  /* Thailand — day-trip bases */
  ayutthaya: {
    id: "ayutthaya",
    name: "Ayutthaya",
    nameAr: "أيوتايا",
    country: "TH",
    lat: 14.3532,
    lng: 100.5689,
    photoQuery: "Ayutthaya Thailand temple ruins",
    match: ["ayutthaya", "أيوتايا", "أيوثايا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: AYUTTHAYA_DAYTRIP,
  },
  phi_phi: {
    id: "phi_phi",
    name: "Phi Phi Islands",
    nameAr: "جزر في في",
    country: "TH",
    lat: 7.7407,
    lng: 98.7784,
    photoQuery: "Phi Phi Islands Thailand Maya Bay",
    match: ["phi phi", "ko phi phi", "في في", "جزر في في"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: PHI_PHI_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const ROUTES: Route[] = [
  {
    id: "thailand-classic",
    match: ["thailand", "bangkok", "phuket", "تايلاند", "تايلند", "بانكوك", "بوكيت"],
    title: "The classic Thailand route",
    titleAr: "المسار الكلاسيكي لتايلاند",
    subtitle: "Bangkok → Phuket",
    subtitleAr: "بانكوك ← بوكيت",
    provenance: "The river and the old city first, the water second — eighty-five minutes in the air between them and nothing else to book.",
    provenanceAr: "النهر والمدينة القديمة أول، والبحر بعدها — ٨٥ دقيقة طيران بينهم وما فيه شي ثاني تحجزونه.",
    forWho: "Your first time in Thailand.",
    forWhoAr: "أول زيارة لتايلاند.",
    legs: [
      { baseId: "bangkok", nightsRatio: 4 },
      { baseId: "phuket", nightsRatio: 4 },
    ],
    transport: [{ from: "bangkok", to: "phuket", mode: "flight", minutes: 85 }],
    minNights: 8,
  },
  {
    id: "thailand-bangkok",
    match: ["thailand", "bangkok", "تايلاند", "تايلند", "بانكوك"],
    title: "Bangkok only, done properly",
    titleAr: "بانكوك وحدها… وبشكل صحيح",
    subtitle: "One base, with the old capital as a day trip",
    subtitleAr: "قاعدة وحدة، والعاصمة القديمة طلعة يوم",
    provenance: "Four days is what the city actually takes, and the ruins are ninety minutes out and back the same evening.",
    provenanceAr: "أربعة أيام هي اللي تحتاجها المدينة فعلًا، والأطلال ساعة ونص رايح وترجعون نفس المساء.",
    forWho: "A short trip, or a stopover that grew.",
    forWhoAr: "رحلة قصيرة، أو ترانزيت طال.",
    legs: [{ baseId: "bangkok", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
];

export const THAILAND: Region = { bases: BASES, routes: ROUTES };

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte, [lat, lng] at the
 * venue. Piers, districts and islands are pinned where you would stand or
 * step ashore, not at the centroid of the administrative area.
 */
export const THAILAND_COORDS: Record<string, readonly [number, number]> = {
  /* Bangkok */
  "Chao Phraya express boat from Sathorn": [13.7188, 100.5139],
  "Wat Arun": [13.7437, 100.4889],
  "Asiatique The Riverfront": [13.7045, 100.5028],
  "Grand Palace": [13.75, 100.4913],
  "Wat Pho": [13.7465, 100.4927],
  "Tha Maharaj": [13.7573, 100.4907],
  "Wat Saket Golden Mount": [13.7537, 100.5065],
  "Or Tor Kor Market": [13.8047, 100.5503],
  "Chatuchak Weekend Market": [13.7996, 100.5504],
  "Jim Thompson House": [13.7492, 100.5282],
  "Benjakitti Forest Park": [13.7283, 100.5601],
  "Bang Krachao": [13.6875, 100.5583],
  "Wat Paknam Phasi Charoen": [13.7196, 100.4665],
  ICONSIAM: [13.7264, 100.5099],

  /* Ayutthaya */
  "Bang Pa-In Royal Palace": [14.232, 100.579],
  "Wat Mahathat": [14.3569, 100.5679],
  "Wat Phra Si Sanphet": [14.3558, 100.5586],
  "Wat Chaiwatthanaram": [14.3422, 100.5411],

  /* Phuket */
  "Kata Beach": [7.8189, 98.2986],
  "Karon Viewpoint": [7.7789, 98.3047],
  "Phuket Old Town": [7.8842, 98.3889],
  "Soi Romanee": [7.8847, 98.3877],
  "Wat Chalong": [7.8462, 98.337],
  "Big Buddha Phuket": [7.8277, 98.3122],
  "Ao Phang Nga National Park": [8.27, 98.5],
  "Ko Panyi": [8.3432, 98.5062],
  "James Bond Island": [8.2745, 98.4998],
  "Nai Harn Beach": [7.7766, 98.3038],
  "Rawai Seafood Market": [7.7738, 98.3253],
  "Promthep Cape": [7.762, 98.3055],

  /* Phi Phi */
  "Maya Bay": [7.6783, 98.7658],
  "Pileh Lagoon": [7.682, 98.771],
  "Phi Phi Don": [7.7407, 98.7784],
};
