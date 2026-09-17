/**
 * Malaysia — «كوالالمبور ولنكاوي».
 *
 * The shape almost every Gulf family already books: a city with a one-hour
 * flight to an island at the end of it. Two sleeping bases, two day-trip
 * bases, and nothing in Kuala Lumpur's plan that is more than an hour from
 * the same hotel.
 *
 * Both ceilings are honest rather than round. Kuala Lumpur has four distinct
 * day shapes and takes four nights; Langkawi has four, and the fourth is an
 * arrival afternoon on the beach rather than a pretend fifth excursion.
 *
 * Curated for travellers who are here for landscape, water, food and family,
 * so the evenings are markets, mosques and hawker streets rather than bars —
 * and where a famous stop is mostly non-halal, the line says so instead of
 * leaving someone to find out at the table.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Kuala Lumpur ─────────────────────────────────────────────────────── */

const KUALA_LUMPUR_DAYS: CuratedDay[] = [
  {
    key: "kl-arrive",
    title: "Land, and look up",
    titleAr: "الوصول… وارفعوا رؤوسكم",
    places: [
      { name: "Petronas Twin Towers", nameAr: "برجا بتروناس", why: "Book the last Skybridge slot of the day — you're on the 86th floor as the lights come on, and the ground-floor queue has gone home.", whyAr: "احجزوا آخر موعد بالجسر المعلق — بتكونون بالدور ٨٦ وقت ما تضوي الأنوار، وطابور تحت يكون راح.", category: "sight", rating: 4.6, priceBand: 2, startTime: "17:30" },
      { name: "KLCC Park", nameAr: "حديقة كي إل سي سي", why: "The fountain show runs on the hour after dark and costs nothing — stand on the far side of the lake so the towers are behind the water.", whyAr: "عرض النوافير كل ساعة بعد المغرب وبالمجان — اوقفوا بالطرف الثاني من البحيرة عشان يصير البرجين خلف الماي.", category: "nature", rating: 4.5, priceBand: 0, startTime: "19:00" },
      { name: "Kampung Baru", nameAr: "كامبونغ بارو", why: "The Malay village that refused to sell: wooden stilt houses with the towers standing right behind them, and nasi lemak served past midnight.", whyAr: "القرية الملاوية اللي رفضت تبيع أرضها: بيوت خشب على أعمدة والبرجين واقفين خلفها، وناسي ليماك لين بعد منتصف الليل.", category: "food", rating: 4.4, priceBand: 1, startTime: "20:30", dietary: ["halal"] },
    ],
  },
  {
    key: "kl-old",
    title: "Old Kuala Lumpur, on foot",
    titleAr: "كوالالمبور القديمة… مشي",
    places: [
      { name: "Masjid Jamek", nameAr: "مسجد جامك", why: "Built where the two muddy rivers meet — that confluence is literally what «Kuala Lumpur» means, and you can stand over it.", whyAr: "مبني عند ملتقى النهرين الطينيين — وهذا الملتقى هو معنى «كوالالمبور» حرفيًا، وتقدرون توقفون فوقه.", category: "sight", rating: 4.5, priceBand: 0, startTime: "08:30" },
      { name: "Merdeka Square", nameAr: "ساحة الاستقلال", why: "A cricket pitch the British left behind, with copper domes down one side — come before ten, there is no shade anywhere on it.", whyAr: "ملعب كريكت خلّفه الإنجليز، وقباب نحاسية على جنبه — تعالوا قبل العاشرة، ما فيه ولا ظل بالساحة كلها.", category: "walk", rating: 4.4, priceBand: 0, startTime: "09:45" },
      { name: "Central Market", nameAr: "السوق المركزي", why: "Air-conditioned and fixed-price downstairs — the batik on the upper floor is the one souvenir here worth carrying home.", whyAr: "مكيّف وأسعاره ثابتة بالدور الأرضي — والباتيك بالدور العلوي هو التذكار الوحيد اللي يستاهل تشيلونه معكم.", category: "shop", rating: 4.3, priceBand: 1, startTime: "11:30" },
      { name: "Restoran Yusoof Dan Zakhir", nameAr: "مطعم يوسف وذاكر", why: "Roti canai pulled and slapped at the front counter, then rice with dhal and fish curry ladled over it — an Indian-Muslim kitchen by the market, halal, and busiest at one.", whyAr: "روتي تشاناي يُفرد ويُضرب عند الطاولة الأمامية، وبعده رز مغرّق بالدال وكاري السمك — مطبخ هندي مسلم جنب السوق، حلال، وأزحم وقت فيه الساعة وحدة.", category: "food", rating: 4.3, priceBand: 1, startTime: "13:00", dietary: ["halal"] },
    ],
  },
  {
    key: "kl-lake-gardens",
    title: "The mosque, the museum, the gardens",
    titleAr: "المسجد والمتحف والحدائق",
    places: [
      { name: "Masjid Negara", nameAr: "المسجد الوطني", why: "The roof is a folded blue star, not a dome — visitors have their own entrance and robes, and outside prayer times the whole colonnade is walkable.", whyAr: "سقفه نجمة زرقاء مطوية مو قبة — للزوار مدخل ورداء خاص، وخارج أوقات الصلاة تقدرون تمشون الرواق كله.", category: "sight", rating: 4.6, priceBand: 0, startTime: "09:00" },
      { name: "Islamic Arts Museum Malaysia", nameAr: "متحف الفنون الإسلامية بماليزيا", why: "The best Islamic art museum in Asia and half the city hasn't been — the scale models of the Haramain and the Ottoman room alone take an hour.", whyAr: "أفضل متحف فن إسلامي بآسيا ونص أهل المدينة ما زاروه — مجسمات الحرمين والغرفة العثمانية لحالها تاخذ ساعة.", category: "sight", rating: 4.7, priceBand: 1, startTime: "10:30" },
      { name: "Saravanaa Bhavan", nameAr: "سارافانا بهافان", why: "Ten minutes down the hill in Brickfields: a south Indian thali on a banana leaf, paper dosa the length of your forearm, and no meat anywhere in the kitchen.", whyAr: "عشر دقايق نزول التلة ببريكفيلدز: ثالي جنوب هندي على ورقة موز، ودوسا رفيعة بطول ساعدكم، وما فيه لحم بالمطبخ أصلًا.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:15", dietary: ["vegetarian"] },
      { name: "KL Bird Park", nameAr: "حديقة الطيور", why: "The net is thrown over the whole valley instead of over cages, so the birds are genuinely flying above you — the best hour of the trip for kids.", whyAr: "الشبكة ممدودة فوق الوادي كله بدل الأقفاص، فالطيور فعلًا تطير فوق رؤوسكم — أحلى ساعة بالرحلة للأطفال.", category: "nature", rating: 4.4, priceBand: 2, startTime: "13:30" },
    ],
  },
  {
    key: "kl-heights",
    title: "Rainforest, tower, riverside",
    titleAr: "غابة وبرج وضفة نهر",
    places: [
      { name: "KL Forest Eco Park", nameAr: "منتزه غابة كوالالمبور", why: "Nine hectares of original rainforest the city built around instead of over — the canopy walkway is free and opens at seven.", whyAr: "تسعة هكتارات غابة أصلية بنت المدينة حولها بدل ما تبني فوقها — وممشى القمم مجاني ويفتح الساعة سبعة.", category: "nature", rating: 4.3, priceBand: 0, startTime: "09:00" },
      { name: "Menara Kuala Lumpur", nameAr: "برج كوالالمبور", why: "A lower tower on a higher hill, so the deck beats the Twin Towers — and it is the one place you can photograph the towers themselves.", whyAr: "برج أقصر لكنه على تلة أعلى، فإطلالته تغلب برجي بتروناس — وهو المكان الوحيد اللي تصورون منه البرجين نفسهم.", category: "sight", rating: 4.5, priceBand: 2, startTime: "10:30" },
      { name: "Thean Hou Temple", nameAr: "معبد ثين هاو", why: "Six tiers of red lanterns on a hill nobody thinks to climb — go for the terrace, which frames the entire southern skyline.", whyAr: "ست طبقات فوانيس حمراء على تلة ما أحد يفكر يطلعها — اطلعوا للشرفة، تأطّر أفق الجنوب كامل.", category: "sight", rating: 4.5, priceBand: 0, startTime: "15:00" },
      { name: "Saloma Link Bridge", nameAr: "جسر سالومة", why: "A footbridge shaped like folded sireh leaves that lights up at seven — this is the shot of the Twin Towers everyone assumes was taken from a drone.", whyAr: "جسر مشاة على شكل ورق السيريه المطوي يضوي الساعة سبعة — ومنه الصورة اللي يظن الكل إنها مصورة بدرون.", category: "walk", rating: 4.4, priceBand: 0, startTime: "19:30" },
    ],
  },
];

/* ── Langkawi ─────────────────────────────────────────────────────────── */

const LANGKAWI_DAYS: CuratedDay[] = [
  {
    key: "langkawi-arrive",
    title: "Land, and go straight to the sand",
    titleAr: "الوصول… وعلى طول للرمل",
    places: [
      { name: "Pantai Cenang", nameAr: "شاطئ تشينانغ", why: "The airport is eight minutes from this beach, and the water stays shallow a long way out — which is why families end up here and not up north.", whyAr: "المطار على بعد ثمان دقايق من هالشاطئ، والماي ضحل لمسافة طويلة — وعشان كذا العوائل تستقر هنا مو بالشمال.", category: "nature", rating: 4.4, priceBand: 0, startTime: "15:30" },
      { name: "Pantai Tengah", nameAr: "شاطئ تنغاه", why: "The same bay's quiet half, past the headland — the sun drops behind Rebak island and the whole beach turns round to watch it.", whyAr: "النص الهادي من نفس الخليج، بعد الرأس الصخري — الشمس تغيب خلف جزيرة ريباك والشاطئ كله يلتفت يتفرج.", category: "nature", rating: 4.3, priceBand: 0, startTime: "18:00" },
      { name: "Restoran Tomato Nasi Kandar", nameAr: "مطعم توماتو ناسي كاندار", why: "Nasi kandar on the Cenang strip: rice with four curries ladled over it, fried chicken on top, and roti canai pulled to order — it is halal and it never shuts.", whyAr: "ناسي كاندار على شارع تشينانغ: رز مغرّق بأربع كاريات وفوقه دجاج مقلي، وروتي تشاناي يُسحب طلبًا — حلال وما يسكّر أبد.", category: "food", rating: 4.2, priceBand: 1, startTime: "20:00", dietary: ["halal"] },
    ],
  },
  {
    key: "langkawi-sky",
    title: "Up the cable car, down the waterfall",
    titleAr: "طلوع بالتلفريك ونزول عند الشلال",
    places: [
      { name: "Oriental Village", nameAr: "القرية الشرقية", why: "Be here at opening: the cable car is a twenty-minute queue at nine and a two-hour one by noon, and the summit clouds over after eleven.", whyAr: "كونوا هنا مع الافتتاح: التلفريك طابور عشرين دقيقة الساعة تسعة وساعتين الظهر، والقمة تتغطى بالغيم بعد الحادية عشرة.", category: "shop", rating: 4.1, priceBand: 1, startTime: "08:30" },
      { name: "Langkawi Sky Bridge", nameAr: "الجسر المعلق بلنكاوي", why: "A curved deck hung from one mast at 700 metres — on a clear morning the Thai islands are sitting on the horizon to the north.", whyAr: "ممشى منحني معلق من صارية وحدة على ارتفاع ٧٠٠ متر — وبصباح صافي تشوفون الجزر التايلاندية على الأفق شمالًا.", category: "sight", rating: 4.6, priceBand: 2, startTime: "09:30" },
      { name: "Telaga Tujuh Waterfall", nameAr: "شلال تيلاغا توجوه", why: "Seven pools stepping down the same hillside the cable car climbs — the lowest is a ten-minute walk, the top is a hard twenty and worth it.", whyAr: "سبع برك تنزل درج على نفس المنحدر اللي يطلعه التلفريك — أدناها عشر دقايق مشي، وأعلاها عشرين دقيقة تعب وتستاهل.", category: "nature", rating: 4.4, priceBand: 0, startTime: "12:00" },
    ],
  },
  {
    key: "langkawi-kilim",
    title: "Mangroves, eagles, and the north beach",
    titleAr: "المنغروف والنسور وشاطئ الشمال",
    places: [
      { name: "Kilim Karst Geoforest Park", nameAr: "منتزه كيليم الجيولوجي", why: "Book the boat at the Kilim jetty rather than the hotel desk — the same three hours through the limestone channels for about half the money.", whyAr: "احجزوا القارب من رصيف كيليم نفسه مو من مكتب الفندق — نفس الثلاث ساعات بين الممرات الجيرية وبنص السعر تقريبًا.", category: "nature", rating: 4.6, priceBand: 2, startTime: "09:00" },
      { name: "Hole in the Wall", nameAr: "هول إن ذا وول", why: "A floating fish farm at the mouth of the Kilim river where the boats tie up for lunch — you pick the grouper or the squid out of the pens under the deck and they grill it there.", whyAr: "مزرعة سمك عائمة عند مصب نهر كيليم تربط عندها القوارب وقت الغدا — تختارون الهامور أو الحبار من الأقفاص تحت الرصيف ويشوونه لكم بمكانه.", category: "food", rating: 4.3, priceBand: 2, startTime: "12:00", dietary: ["seafood"] },
      { name: "Tanjung Rhu Beach", nameAr: "شاطئ تانجونغ رو", why: "The widest and emptiest sand on the island, with limestone stacks standing offshore — at low tide you can walk out towards the nearest one.", whyAr: "أوسع وأخلى رمل بالجزيرة، وصخور جيرية واقفة بالبحر قبالته — ووقت الجزر تقدرون تمشون باتجاه أقربها.", category: "nature", rating: 4.6, priceBand: 0, startTime: "14:00" },
      { name: "Eagle Square", nameAr: "ساحة النسر", why: "The twelve-metre eagle at Kuah jetty is the postcard; the promenade behind it at sunset is the reason to come — the ferries leave straight into the light.", whyAr: "نسر الاثنا عشر مترًا عند رصيف كواه هو صورة البطاقة؛ لكن الممشى خلفه وقت الغروب هو السبب — والعبّارات تطلع باتجاه الضوء مباشرة.", category: "sight", rating: 4.1, priceBand: 0, startTime: "17:30" },
    ],
  },
  {
    key: "langkawi-islands",
    title: "Three islands in one boat",
    titleAr: "ثلاث جزر بقارب واحد",
    places: [
      { name: "Pulau Dayang Bunting", nameAr: "جزيرة دايانغ بونتينغ", why: "A freshwater lake sitting inside a sea island, twenty metres from salt water — you swim in it, and it is warm all the way down.", whyAr: "بحيرة ماء عذب داخل جزيرة بالبحر، وعلى بعد عشرين متر من الماء المالح — تسبحون فيها، ودافية لين القاع.", category: "nature", rating: 4.4, priceBand: 2, startTime: "09:00" },
      { name: "Pulau Singa Besar", nameAr: "جزيرة سينغا بيسار", why: "The boats cut the engines in the channel and the sea eagles come down one after another — bring the zoom, and ask your captain not to feed them.", whyAr: "القوارب تطفي محركاتها بالممر وتنزل نسور البحر وحدة ورا الثانية — خذوا عدسة تقريب، واطلبوا من القبطان ما يطعمها.", category: "nature", rating: 4.3, priceBand: 1, startTime: "11:30" },
      { name: "Pulau Beras Basah", nameAr: "جزيرة بيراس باسه", why: "White sand, shallow water, and ninety minutes is exactly the right amount of it — the last boats back leave at four.", whyAr: "رمل أبيض وماء ضحل، وساعة ونص هي المدة المضبوطة له — وآخر قوارب الرجعة الساعة أربعة.", category: "nature", rating: 4.3, priceBand: 0, startTime: "13:00" },
      { name: "Yasmin Syrian Restaurant", nameAr: "مطعم ياسمين السوري", why: "Ten minutes back from the jetty: charcoal shish taouk and kebab, hummus and bread straight out of the oven, and the menu is in Arabic.", whyAr: "عشر دقايق من الرصيف: شيش طاووق وكباب على الفحم، وحمص وخبز طالع من الفرن، والمنيو بالعربي.", category: "food", rating: 4.4, priceBand: 2, startTime: "19:00", dietary: ["halal"] },
    ],
  },
];

/* ── Malaysia: day-trip shapes ────────────────────────────────────────── */

const BATU_CAVES_DAYTRIP: CuratedDay = {
  key: "batu-caves-daytrip",
  title: "Batu Caves in a morning",
  titleAr: "كهوف باتو بصباح",
  places: [
    { name: "Batu Caves", nameAr: "كهوف باتو", why: "Two hundred and seventy-two painted steps under a gold statue forty-three metres high — be on them by half seven, before the heat and the macaques wake up.", whyAr: "مئتين واثنين وسبعين درجة ملوّنة تحت تمثال ذهبي بارتفاع ٤٣ متر — كونوا عليها الساعة ٧:٣٠، قبل ما يصحى الحر والقرود.", category: "sight", rating: 4.4, priceBand: 0, startTime: "07:30" },
    { name: "Ramayana Cave", nameAr: "كهف رامايانا", why: "The quiet cave at the far left of the complex — the whole Ramayana painted in dioramas, and almost every bus walks straight past it.", whyAr: "الكهف الهادي بأقصى يسار الموقع — ملحمة رامايانا كاملة بمجسمات ملوّنة، وتقريبًا كل الباصات تعديه.", category: "sight", rating: 4.2, priceBand: 1, startTime: "09:30" },
    { name: "Zoo Negara", nameAr: "حديقة الحيوان الوطنية", why: "Twenty-five minutes on from the caves — go after three, when the heat breaks and the tapirs and sun bears finally come out of the shade.", whyAr: "خمسة وعشرين دقيقة بعد الكهوف — ادخلوا بعد الثالثة، لما يخف الحر ويطلع التابير والدببة الشمسية من الظل.", category: "nature", rating: 4.1, priceBand: 2, startTime: "15:00" },
  ],
};

const PUTRAJAYA_DAYTRIP: CuratedDay = {
  key: "putrajaya-daytrip",
  title: "Putrajaya in a day",
  titleAr: "بوتراجايا بيوم",
  places: [
    { name: "Putra Mosque", nameAr: "مسجد بوترا", why: "Rose granite that goes pink at the water line, standing half over the lake — robes at the door, and the basement hall stays cool when the square outside is 35 degrees.", whyAr: "جرانيت وردي يزداد وردة عند خط الماء، ونصف المسجد فوق البحيرة — رداء عند الباب، والقاعة السفلية باردة والساحة برا ٣٥ درجة.", category: "sight", rating: 4.6, priceBand: 0, startTime: "09:30" },
    { name: "Perdana Putra", nameAr: "بردانا بوترا", why: "The green-domed building on every Putrajaya postcard is the prime minister's office — you can't go in, but the square in front of it is the best angle on the mosque.", whyAr: "المبنى ذو القبة الخضراء اللي بكل بطاقات بوتراجايا هو مكتب رئيس الوزراء — ما تدخلونه، لكن الساحة قدامه أحسن زاوية على المسجد.", category: "sight", rating: 4.4, priceBand: 0, startTime: "10:45" },
    { name: "Seri Wawasan Bridge", nameAr: "جسر سري واواسان", why: "A sail-shaped cable bridge you are allowed to walk — the footway is on the lake side and the crossing takes ten minutes.", whyAr: "جسر معلق على شكل شراع ومسموح تمشونه — ممر المشاة على جهة البحيرة والعبور عشر دقايق.", category: "walk", rating: 4.4, priceBand: 0, startTime: "12:00" },
    { name: "Masjid Tuanku Mizan Zainal Abidin", nameAr: "مسجد توانكو ميزان زين العابدين", why: "The Iron Mosque: seventy per cent steel, walls of laser-cut mesh instead of stone, so the prayer hall is lit entirely by pattern. Emptier and stranger than the pink one.", whyAr: "المسجد الحديدي: سبعين بالمئة فولاذ، وجدرانه شبك مقصوص بالليزر بدل الحجر، فالقاعة كلها مضاءة بالزخرفة. أهدى وأغرب من الوردي.", category: "sight", rating: 4.6, priceBand: 0, startTime: "16:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const BASES: Record<BaseId, Base> = {
  kuala_lumpur: {
    id: "kuala_lumpur",
    name: "Kuala Lumpur",
    nameAr: "كوالالمبور",
    country: "MY",
    lat: 3.139,
    lng: 101.6869,
    photoQuery: "Kuala Lumpur Malaysia Petronas Towers skyline",
    match: ["kuala lumpur", "kuala-lumpur", "malaysia", "كوالالمبور", "كوالا لمبور", "ماليزيا"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["batu_caves", "putrajaya"],
    pairsWith: ["langkawi"],
    days: KUALA_LUMPUR_DAYS,
  },
  langkawi: {
    id: "langkawi",
    name: "Langkawi",
    nameAr: "لنكاوي",
    country: "MY",
    lat: 6.35,
    lng: 99.75,
    photoQuery: "Langkawi Malaysia beach islands",
    match: ["langkawi", "لنكاوي", "لانكاوي"],
    typicalNights: 3,
    maxNights: 4,
    reachable: [],
    pairsWith: ["kuala_lumpur"],
    days: LANGKAWI_DAYS,
  },

  /* Malaysia — day-trip bases */
  batu_caves: {
    id: "batu_caves",
    name: "Batu Caves",
    nameAr: "كهوف باتو",
    country: "MY",
    lat: 3.2379,
    lng: 101.684,
    photoQuery: "Batu Caves Malaysia coloured steps",
    match: ["batu caves", "كهوف باتو"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: BATU_CAVES_DAYTRIP,
  },
  putrajaya: {
    id: "putrajaya",
    name: "Putrajaya",
    nameAr: "بوتراجايا",
    country: "MY",
    lat: 2.9264,
    lng: 101.6964,
    photoQuery: "Putrajaya Malaysia Putra Mosque lake",
    match: ["putrajaya", "بوتراجايا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: PUTRAJAYA_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const ROUTES: Route[] = [
  {
    id: "malaysia-classic",
    match: ["malaysia", "kuala lumpur", "langkawi", "ماليزيا", "كوالالمبور", "لنكاوي"],
    title: "The classic Malaysia route",
    titleAr: "المسار الكلاسيكي لماليزيا",
    subtitle: "Kuala Lumpur → Langkawi",
    subtitleAr: "كوالالمبور ← لنكاوي",
    provenance: "City first, island second — one hour in the air between them, and it is the shape most Gulf families already book.",
    provenanceAr: "المدينة أول والجزيرة بعدها — ساعة طيران بينهم، وهذا الشكل اللي تحجزه أغلب العوائل الخليجية أصلًا.",
    forWho: "A week or more, and you want a beach at the end of it.",
    forWhoAr: "أسبوع أو أكثر، وتبون بحر بالآخر.",
    legs: [
      { baseId: "kuala_lumpur", nightsRatio: 4 },
      { baseId: "langkawi", nightsRatio: 4 },
    ],
    transport: [{ from: "kuala_lumpur", to: "langkawi", mode: "flight", minutes: 60 }],
    minNights: 8,
  },
  {
    id: "malaysia-kl",
    match: ["malaysia", "kuala lumpur", "ماليزيا", "كوالالمبور"],
    title: "Kuala Lumpur, and what's around it",
    titleAr: "كوالالمبور وما حولها",
    subtitle: "One hotel, with the caves and Putrajaya as day trips",
    subtitleAr: "فندق واحد، والكهوف وبوتراجايا طلعات يوم",
    provenance: "Everything here is inside an hour of the same hotel, and the two best days are outside the city.",
    provenanceAr: "كل شي بالخطة على بعد ساعة من نفس الفندق، وأحلى يومين برا المدينة.",
    forWho: "A short trip, or a first one.",
    forWhoAr: "رحلة قصيرة، أو أول مرة.",
    legs: [{ baseId: "kuala_lumpur", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
];

export const MALAYSIA: Region = { bases: BASES, routes: ROUTES };

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte, [lat, lng] at the
 * venue itself. Same discipline as coords.ts: where a name is a district, a
 * street or an island, the pin is that district, street or island, because
 * that is where you would actually be standing.
 */
export const MALAYSIA_COORDS: Record<string, readonly [number, number]> = {
  /* Kuala Lumpur */
  "Petronas Twin Towers": [3.1578, 101.7117],
  "KLCC Park": [3.1562, 101.7135],
  "Kampung Baru": [3.1631, 101.704],
  "Masjid Jamek": [3.1489, 101.6957],
  "Merdeka Square": [3.1478, 101.6935],
  "Central Market": [3.1455, 101.6959],
  "Restoran Yusoof Dan Zakhir": [3.145, 101.6958],
  "Masjid Negara": [3.142, 101.6917],
  "Islamic Arts Museum Malaysia": [3.1417, 101.6888],
  "Saravanaa Bhavan": [3.131, 101.6859],
  "KL Bird Park": [3.1425, 101.6876],
  "KL Forest Eco Park": [3.15, 101.7022],
  "Menara Kuala Lumpur": [3.1528, 101.7038],
  "Thean Hou Temple": [3.1215, 101.6866],
  "Saloma Link Bridge": [3.1623, 101.7113],

  /* Batu Caves and Putrajaya */
  "Batu Caves": [3.2379, 101.684],
  "Ramayana Cave": [3.2368, 101.6832],
  "Zoo Negara": [3.2061, 101.7589],
  "Putra Mosque": [2.9366, 101.6919],
  "Perdana Putra": [2.9372, 101.6945],
  "Seri Wawasan Bridge": [2.9253, 101.6842],
  "Masjid Tuanku Mizan Zainal Abidin": [2.9166, 101.6772],

  /* Langkawi */
  "Pantai Cenang": [6.2879, 99.7256],
  "Pantai Tengah": [6.2792, 99.7238],
  "Restoran Tomato Nasi Kandar": [6.285, 99.7323],
  "Yasmin Syrian Restaurant": [6.2959, 99.7238],
  "Hole in the Wall": [6.4166, 99.8631],
  "Oriental Village": [6.3846, 99.6707],
  "Langkawi Sky Bridge": [6.3826, 99.665],
  "Telaga Tujuh Waterfall": [6.3792, 99.6742],
  "Kilim Karst Geoforest Park": [6.4072, 99.8551],
  "Tanjung Rhu Beach": [6.4551, 99.8141],
  "Eagle Square": [6.3111, 99.8483],
  "Pulau Dayang Bunting": [6.1869, 99.7867],
  "Pulau Singa Besar": [6.22, 99.75],
  "Pulau Beras Basah": [6.2058, 99.7282],
};
