/**
 * Egypt — Cairo, and the temples up the river.
 *
 * Cairo is the rare city that genuinely holds five nights: the Giza plateau
 * and the Grand Egyptian Museum are a full day on their own, Fatimid Cairo is
 * another, the Citadel another, Old Cairo and the Nile another, and Saqqara
 * and Dahshur are a fifth that most trips skip and shouldn't. Luxor holds
 * three — east bank, Valley of the Kings, and the quieter west bank — and no
 * more, so the ceiling stops at three rather than being padded to four.
 *
 * Alexandria and Fayoum are mornings you leave Cairo for and evenings you come
 * back from. They are listed as day-trip bases so that a Cairo stay can carry
 * them without pretending you moved hotel.
 *
 * `EGYPT_COORDS` below pins every place name here that could be confirmed
 * against a mapped venue. Where one could not be, it is simply absent —
 * a missing pin is honest, a wrong one is not.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Cairo ─────────────────────────────────────────────────────────────── */

const CAIRO_DAYS: CuratedDay[] = [
  {
    key: "cairo-giza",
    title: "The plateau, and the new museum",
    titleAr: "الهضبة… والمتحف الجديد",
    places: [
      { name: "Pyramids of Giza", nameAr: "أهرامات الجيزة", why: "Be at the gate when it opens. By eleven you are sharing Khufu with four thousand people and the light has gone flat white.", whyAr: "كونوا عند البوابة مع الافتتاح. بعد الحادية عشر بتتقاسمون خوفو مع أربعة آلاف واحد والضوء يصير أبيض مسطح.", category: "sight", rating: 4.7, priceBand: 2, startTime: "08:00" },
      { name: "Great Sphinx of Giza", nameAr: "أبو الهول", why: "Walk down to it instead of taking the horse — it is eight minutes, and the approach through the valley temple is how it was built to be seen.", whyAr: "انزلوا له مشي بدل ما تاخذون حصان — ثمان دقايق، والدخول من معبد الوادي هو الطريقة اللي بُني عشان تشوفونه فيها.", category: "sight", rating: 4.6, priceBand: 0, startTime: "10:30" },
      { name: "Grand Egyptian Museum", nameAr: "المتحف المصري الكبير", why: "Give it four hours and start on the grand staircase — Tutankhamun's five thousand pieces are all in one room here for the first time since they came out of the ground.", whyAr: "أعطوه أربع ساعات وابدأوا من الدرج الكبير — كنز توت عنخ آمون كامل، خمسة آلاف قطعة، بقاعة وحدة لأول مرة من يوم طلعت من الأرض.", category: "sight", rating: 4.8, priceBand: 2, startTime: "13:00" },
    ],
  },
  {
    key: "cairo-fatimid",
    title: "Fatimid Cairo, on foot",
    titleAr: "القاهرة الفاطمية… مشي",
    places: [
      { name: "Al-Azhar Mosque", nameAr: "الجامع الأزهر", why: "A thousand years of teaching around one courtyard — sit against a column in the sahn for ten minutes before you go anywhere else in this city.", whyAr: "ألف سنة تدريس حول صحن واحد — اقعدوا يمّ عمود بالصحن عشر دقايق قبل ما تروحون أي مكان ثاني بهالمدينة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "09:30" },
      { name: "Khan el-Khalili", nameAr: "خان الخليلي", why: "Prices on the main square start at four times what you should pay. Walk two lanes in and they start at two.", whyAr: "الأسعار بالميدان الرئيسي تبدأ بأربع أضعاف المفروض. ادخلوا زقاقين جوّا وبتبدأ بضعفين.", category: "shop", rating: 4.4, priceBand: 1, startTime: "11:00" },
      { name: "Al-Azhar Park", nameAr: "حديقة الأزهر", why: "Built on a five-hundred-year-old rubbish mound; the upper terrace looks straight across the whole medieval skyline as the sun drops behind it.", whyAr: "مبنية فوق تلة زبالة عمرها خمسمية سنة؛ والشرفة العليا تطل على خط المدينة المملوكي كامل والشمس تنزل خلفه.", category: "nature", rating: 4.6, priceBand: 1, startTime: "16:30" },
      { name: "Al-Muizz Street", nameAr: "شارع المعز لدين الله", why: "Go after dark, when it is lit and closed to cars — a kilometre of Fatimid and Mamluk façades, and you can walk inside most of them.", whyAr: "روحوا بعد الظلام، لما يضوي ويتسكّر بوجه السيارات — كيلو واجهات فاطمية ومملوكية، وأغلبها تقدرون تدخلونه.", category: "walk", rating: 4.6, priceBand: 0, startTime: "18:30" },
    ],
  },
  {
    key: "cairo-citadel",
    title: "The Citadel and the great mosques",
    titleAr: "القلعة والمساجد الكبرى",
    places: [
      { name: "Citadel of Saladin", nameAr: "قلعة صلاح الدين", why: "Get there at opening for the terrace: on a clear morning you can see the pyramids from the wall, twenty kilometres off, and the Muhammad Ali mosque is inside the same ticket.", whyAr: "اوصلوا مع الافتتاح عشان الشرفة: بصباح صافي تشوفون الأهرام من السور على بعد عشرين كيلو، وجامع محمد علي داخل نفس التذكرة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "09:00" },
      { name: "Mosque-Madrasa of Sultan Hassan", nameAr: "مسجد ومدرسة السلطان حسن", why: "The entrance corridor is deliberately dark so the courtyard hits you when you step out of it — stand in the middle and clap once.", whyAr: "ممر الدخول معتم بقصد عشان الصحن يضربكم أول ما تطلعون منه — اوقفوا بالنص وصفقوا مرة.", category: "sight", rating: 4.7, priceBand: 1, startTime: "11:30" },
      { name: "Mosque of Ibn Tulun", nameAr: "جامع ابن طولون", why: "The oldest mosque in Cairo still standing in its original form, and its spiral minaret is the only one in the city you are allowed to climb.", whyAr: "أقدم مسجد بالقاهرة لسا واقف على شكله الأصلي، ومئذنته الحلزونية الوحيدة بالمدينة اللي مسموح تطلعونها.", category: "sight", rating: 4.7, priceBand: 0, startTime: "14:00" },
    ],
  },
  {
    key: "cairo-nile",
    title: "Old Cairo and the river",
    titleAr: "مصر القديمة والنهر",
    places: [
      { name: "Mosque of Amr ibn al-As", nameAr: "جامع عمرو بن العاص", why: "The first mosque built in Africa, rebuilt many times since — the forest of columns inside stays cool at any hour of the day.", whyAr: "أول مسجد بُني بإفريقيا، وأعيد بناؤه مرات من بعدها — وغابة الأعمدة جوّاه باردة بأي ساعة من النهار.", category: "sight", rating: 4.5, priceBand: 0, startTime: "09:00" },
      { name: "Hanging Church", nameAr: "الكنيسة المعلقة", why: "Built on top of a Roman gate, so the floor is genuinely suspended — there is a glass panel where you can look down into the gap.", whyAr: "مبنية فوق بوابة رومانية، فأرضيتها معلقة فعلًا — وفيه لوح زجاج تطلون منه على الفراغ تحت.", category: "sight", rating: 4.5, priceBand: 0, startTime: "10:30" },
      { name: "The Egyptian Museum in Tahrir", nameAr: "المتحف المصري بالتحرير", why: "Half-emptied into the new museum and much better for it — what is left has room to breathe, and the Amarna rooms on the ground floor are the reason to still come.", whyAr: "انتقل نصه للمتحف الجديد وصار أحسن بكثير — اللي بقي صار له مساحة، وقاعات العمارنة بالدور الأرضي هي سبب الزيارة لين الحين.", category: "sight", rating: 4.5, priceBand: 2, startTime: "13:30" },
      { name: "Cairo Tower", nameAr: "برج القاهرة", why: "Forty-five floors above the island — go up an hour before Maghrib and watch the Nile turn from brown to orange under you.", whyAr: "خمسة وأربعين دور فوق الجزيرة — اطلعوا قبل المغرب بساعة وشوفوا النيل يتحول من بني لبرتقالي تحتكم.", category: "sight", rating: 4.4, priceBand: 1, startTime: "17:30" },
    ],
  },
  {
    key: "cairo-saqqara",
    title: "Saqqara and Dahshur",
    titleAr: "سقارة ودهشور",
    places: [
      { name: "Step Pyramid of Djoser", nameAr: "هرم زوسر المدرج", why: "The first pyramid anybody built, a hundred years before Giza — and since the restoration you can walk down inside it.", whyAr: "أول هرم بُني بالتاريخ، قبل الجيزة بمية سنة — ومن بعد الترميم تقدرون تنزلون جوّاه مشي.", category: "sight", rating: 4.7, priceBand: 2, startTime: "09:00" },
      { name: "Memphis open-air museum", nameAr: "متحف ميت رهينة المفتوح", why: "Twenty minutes and one enormous fallen Ramses lying on his back — worth it as the stop between Saqqara and Dahshur, not as a destination.", whyAr: "عشرين دقيقة وتمثال رمسيس ضخم ساقط على ظهره — تستاهل كوقفة بين سقارة ودهشور، مو كهدف بحالها.", category: "sight", rating: 4.2, priceBand: 1, startTime: "12:00" },
      { name: "Bent Pyramid", nameAr: "الهرم المنحني", why: "The one where they changed the angle halfway up because it was about to collapse — and it is the emptiest pyramid in Egypt, on most days completely.", whyAr: "الهرم اللي غيّروا زاويته بالنص لأنه كان راح ينهار — وهو أخلى هرم بمصر من الزوار، وبأغلب الأيام فاضي تمامًا.", category: "sight", rating: 4.6, priceBand: 1, startTime: "14:00" },
      { name: "Red Pyramid", nameAr: "الهرم الأحمر", why: "The first true pyramid, and you can climb down a sixty-three-metre shaft into three corbelled chambers with nobody else inside them.", whyAr: "أول هرم كامل الشكل، وتقدرون تنزلون ممر ثلاثة وستين متر لثلاث غرف مقبّبة وما فيها أحد غيركم.", category: "sight", rating: 4.6, priceBand: 1, startTime: "15:30" },
    ],
  },
];

/* ── Luxor ─────────────────────────────────────────────────────────────── */

const LUXOR_DAYS: CuratedDay[] = [
  {
    key: "luxor-karnak",
    title: "The east bank",
    titleAr: "البر الشرقي",
    places: [
      { name: "Karnak Temple", nameAr: "معبد الكرنك", why: "Thirty pharaohs each added to it over two thousand years — go straight to the hypostyle hall at opening and stand in it alone for ten minutes.", whyAr: "ثلاثين فرعون كل واحد زاد عليه على مدى ألفين سنة — روحوا لقاعة الأعمدة مع الافتتاح واوقفوا فيها لحالكم عشر دقايق.", category: "sight", rating: 4.8, priceBand: 2, startTime: "08:00" },
      { name: "Luxor Museum", nameAr: "متحف الأقصر", why: "Small, cold and perfectly lit — an hour here teaches you more than a whole day at Karnak, and almost nobody bothers with it.", whyAr: "صغير وبارد وإضاءته مظبوطة — ساعة فيه تعلمكم أكثر من يوم كامل بالكرنك، وبالكاد أحد يهتم فيه.", category: "sight", rating: 4.6, priceBand: 1, startTime: "11:30" },
      { name: "Luxor Temple", nameAr: "معبد الأقصر", why: "Come back to it after dark — it is the one great temple lit at night, and the avenue of sphinxes runs out of it straight into the modern town.", whyAr: "ارجعوا له بعد الظلام — المعبد الكبير الوحيد اللي ينوّر بالليل، وطريق الكباش يطلع منه لداخل البلد الحديثة مباشرة.", category: "sight", rating: 4.7, priceBand: 2, startTime: "18:00" },
    ],
  },
  {
    key: "luxor-kings",
    title: "Valley of the Kings",
    titleAr: "وادي الملوك",
    places: [
      { name: "Valley of the Kings", nameAr: "وادي الملوك", why: "The standard ticket covers any three tombs — take Ramesses IV, Ramesses IX and Merenptah, and only pay the separate fee for Seti I if the budget stretches.", whyAr: "التذكرة العادية تغطي أي ثلاث مقابر — خذوا رمسيس الرابع ورمسيس التاسع ومرنبتاح، وما تدفعون التذكرة المنفصلة لسيتي الأول إلا لو الميزانية تسمح.", category: "sight", rating: 4.7, priceBand: 2, startTime: "07:00" },
      { name: "Temple of Hatshepsut", nameAr: "معبد حتشبسوت", why: "Three terraces cut into a three-hundred-metre cliff — be there before nine, because after that the stone starts throwing the heat back at you.", whyAr: "ثلاث مدرجات محفورة بجرف ثلاثمية متر — كونوا هناك قبل التاسعة، لأن بعدها الحجر يبدأ يرجع لكم الحر بوجهكم.", category: "sight", rating: 4.6, priceBand: 2, startTime: "10:00" },
      { name: "Colossi of Memnon", nameAr: "تمثالا ممنون", why: "All that is left of a mortuary temple larger than Karnak — everything that stood behind these two was carried off by the Nile.", whyAr: "كل اللي بقي من معبد جنائزي أكبر من الكرنك — وكل اللي كان واقف خلف هالتمثالين جرفه النيل.", category: "sight", rating: 4.3, priceBand: 0, startTime: "12:00" },
    ],
  },
  {
    key: "luxor-westbank",
    title: "The quiet west bank",
    titleAr: "البر الغربي الهادي",
    places: [
      { name: "Deir el-Medina", nameAr: "دير المدينة", why: "The village where the men who cut the royal tombs lived, with their own small tombs on the slope above — better painted than most of the kings' are.", whyAr: "القرية اللي عاش فيها الرجال اللي حفروا مقابر الملوك، وفوقها بالمنحدر مقابرهم الصغيرة — ملونة أحسن من أغلب مقابر الملوك نفسها.", category: "sight", rating: 4.6, priceBand: 1, startTime: "08:30" },
      { name: "Medinet Habu", nameAr: "مدينة هابو", why: "The colour is still on the ceilings here because hardly anyone comes — this is what Karnak looked like when it was painted.", whyAr: "الألوان لسا على السقوف هنا لأن بالكاد أحد يجي — كذا كان شكل الكرنك وهو ملوّن.", category: "sight", rating: 4.7, priceBand: 1, startTime: "11:00" },
      { name: "Banana Island", nameAr: "جزيرة الموز", why: "Twenty minutes upriver by felucca — a farm island of banana and mango where the tea arrives with sugarcane you cut yourself.", whyAr: "عشرين دقيقة عكس التيار بالفلوكة — جزيرة مزارع موز ومانجو، والشاي يجيكم مع قصب تقطعونه بأيديكم.", category: "nature", rating: 4.3, priceBand: 1, startTime: "16:00" },
    ],
  },
];

/* ── Egypt: day-trip shapes ────────────────────────────────────────────── */

const ALEXANDRIA_DAYTRIP: CuratedDay = {
  key: "alexandria-daytrip",
  title: "Alexandria in a day",
  titleAr: "الإسكندرية بيوم",
  places: [
    { name: "Bibliotheca Alexandrina", nameAr: "مكتبة الإسكندرية", why: "Two and a half hours by train from Ramses, and you can walk straight into the reading room — eleven terraced floors under one tilted disc.", whyAr: "ساعتين ونص بالقطار من رمسيس، وتدخلون قاعة المطالعة مباشرة — إحدى عشر مدرج تحت قرص مايل واحد.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:30" },
    { name: "Citadel of Qaitbay", nameAr: "قلعة قايتباي", why: "Built out of the rubble of the lighthouse that stood on this exact rock — you can still pick out granite columns laid flat inside the walls.", whyAr: "مبنية من أنقاض الفنار اللي كان واقف على نفس هالصخرة — ولسا تقدرون تميزون أعمدة جرانيت مسطحة داخل الجدران.", category: "sight", rating: 4.5, priceBand: 1, startTime: "13:00" },
    { name: "Abu al-Abbas al-Mursi Mosque", nameAr: "جامع المرسي أبو العباس", why: "The city's main mosque, cream stone on an open square by the fishing harbour — pray Dhuhr here and eat two streets behind it.", whyAr: "جامع المدينة الرئيسي، حجر كريمي على ساحة مفتوحة عند ميناء الصيد — صلوا الظهر فيه وكلوا بشارعين خلفه.", category: "sight", rating: 4.6, priceBand: 0, startTime: "14:30" },
    { name: "Montaza Gardens", nameAr: "حدائق المنتزه", why: "The old royal gardens at the far east end of the Corniche — pine trees running down to a private bay, and a fraction of the crowd of the city beaches.", whyAr: "الحدايق الملكية القديمة بأقصى شرق الكورنيش — صنوبر ينزل لخليج خاص، وزحمة أقل بكثير من شواطئ المدينة.", category: "nature", rating: 4.4, priceBand: 1, startTime: "17:00" },
  ],
};

const FAYOUM_DAYTRIP: CuratedDay = {
  key: "fayoum-daytrip",
  title: "Fayoum in a day",
  titleAr: "الفيوم بيوم",
  places: [
    { name: "Wadi El Rayan waterfalls", nameAr: "شلالات وادي الريان", why: "The only waterfalls in Egypt, and they exist by accident — drainage water spilling from one desert lake into the one below it.", whyAr: "الشلالات الوحيدة بمصر، وموجودة بالغلط — ماء صرف ينزل من بحيرة صحراوية للبحيرة اللي تحتها.", category: "nature", rating: 4.3, priceBand: 1, startTime: "11:00" },
    { name: "Wadi Al-Hitan", nameAr: "وادي الحيتان", why: "Forty-million-year-old whale skeletons lying in open desert exactly where they died — the trail is three kilometres and there is no shade on any of it.", whyAr: "هياكل حيتان عمرها أربعين مليون سنة مرمية بالصحرا المفتوحة بنفس مكان ما ماتت — المسار ثلاثة كيلو وما فيه ظل ولا بمتر منه.", category: "nature", rating: 4.7, priceBand: 2, startTime: "13:30" },
    { name: "Tunis Village", nameAr: "قرية تونس", why: "A pottery village on the ridge above Lake Qarun — the workshops will put the children on a wheel, and half of them serve lunch as well.", whyAr: "قرية فخار على الحافة فوق بحيرة قارون — والورش تقعّد العيال على الدولاب، ونصها يقدم غدا كمان.", category: "shop", rating: 4.5, priceBand: 1, startTime: "16:30" },
  ],
};

/* ── The bases ─────────────────────────────────────────────────────────── */

const EGYPT_BASES: Record<BaseId, Base> = {
  cairo: {
    id: "cairo",
    name: "Cairo",
    nameAr: "القاهرة",
    country: "EG",
    lat: 30.0444,
    lng: 31.2357,
    photoQuery: "Cairo Egypt pyramids skyline",
    match: ["cairo", "egypt", "giza", "القاهرة", "مصر", "الجيزة"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["alexandria", "fayoum"],
    pairsWith: ["luxor"],
    days: CAIRO_DAYS,
  },
  luxor: {
    id: "luxor",
    name: "Luxor",
    nameAr: "الأقصر",
    country: "EG",
    lat: 25.6872,
    lng: 32.6396,
    photoQuery: "Luxor Egypt Karnak temple Nile",
    match: ["luxor", "karnak", "الأقصر", "الاقصر"],
    typicalNights: 3,
    maxNights: 3,
    reachable: [],
    pairsWith: ["cairo"],
    days: LUXOR_DAYS,
  },
  alexandria: {
    id: "alexandria",
    name: "Alexandria",
    nameAr: "الإسكندرية",
    country: "EG",
    lat: 31.2001,
    lng: 29.9187,
    photoQuery: "Alexandria Egypt Qaitbay Citadel corniche",
    match: ["alexandria", "الإسكندرية", "الاسكندرية"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: ALEXANDRIA_DAYTRIP,
  },
  fayoum: {
    id: "fayoum",
    name: "Fayoum",
    nameAr: "الفيوم",
    country: "EG",
    lat: 29.3084,
    lng: 30.8428,
    photoQuery: "Fayoum Egypt Wadi El Rayan waterfalls",
    match: ["fayoum", "faiyum", "fayyum", "الفيوم"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: FAYOUM_DAYTRIP,
  },
};

/* ── The routes ────────────────────────────────────────────────────────── */

const EGYPT_ROUTES: Route[] = [
  {
    id: "egypt-cairo",
    match: ["egypt", "cairo", "giza", "مصر", "القاهرة", "الجيزة"],
    title: "Cairo, one hotel",
    titleAr: "القاهرة… فندق واحد",
    subtitle: "Cairo, with Alexandria and Fayoum as day trips",
    subtitleAr: "القاهرة، والإسكندرية والفيوم طلعات يوم",
    provenance: "Five nights in one hotel because Cairo has five genuinely different days in it, and the train does the moving instead of your suitcase.",
    provenanceAr: "خمس ليالٍ بفندق واحد لأن القاهرة فيها خمس أيام مختلفة فعلًا، والقطار هو اللي يتحرك بدل شنطكم.",
    forWho: "A first trip, or travelling with parents.",
    forWhoAr: "أول زيارة، أو سفر مع الوالدين.",
    legs: [{ baseId: "cairo", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "egypt-cairo-luxor",
    match: ["egypt", "cairo", "luxor", "مصر", "القاهرة", "الأقصر"],
    title: "Cairo and Luxor",
    titleAr: "القاهرة والأقصر",
    subtitle: "Cairo → Luxor, by air",
    subtitleAr: "القاهرة ← الأقصر، طيران",
    provenance: "The seventy-minute flight buys you a whole day back over the night train, and Luxor is where the pyramids' story actually continues.",
    provenanceAr: "رحلة السبعين دقيقة ترجع لكم يوم كامل مقارنة بقطار الليل، والأقصر هي اللي تكمل قصة الأهرام فعلًا.",
    forWho: "A week or more, and you came for the temples.",
    forWhoAr: "أسبوع أو أكثر، وجيتوا عشان المعابد.",
    legs: [
      { baseId: "cairo", nightsRatio: 4 },
      { baseId: "luxor", nightsRatio: 3 },
    ],
    transport: [{ from: "cairo", to: "luxor", mode: "flight", minutes: 70 }],
    minNights: 7,
  },
];

export const EGYPT: Region = {
  bases: EGYPT_BASES,
  routes: EGYPT_ROUTES,
};

/**
 * Hand-checked pins for the places above, keyed by `name` byte-for-byte.
 *
 * [latitude, longitude], four decimals, pointing at the venue rather than the
 * city around it. "Pyramids of Giza" is pinned on Khufu, "Citadel of Saladin"
 * on the citadel walls rather than the Muhammad Ali mosque inside them, and
 * "Wadi El Rayan waterfalls" on the falls between the two lakes.
 *
 * Every place in this file has a pin.
 */
export const EGYPT_COORDS: Record<string, readonly [number, number]> = {
  /* ── Giza ────────────────────────────────────────────────────────────── */
  "Pyramids of Giza": [29.9792, 31.1342],
  "Great Sphinx of Giza": [29.9753, 31.1375],
  "Grand Egyptian Museum": [29.9946, 31.1191],

  /* ── Fatimid Cairo ───────────────────────────────────────────────────── */
  "Al-Azhar Mosque": [30.0458, 31.2627],
  "Khan el-Khalili": [30.0489, 31.2613],
  "Al-Azhar Park": [30.0401, 31.2641],
  "Al-Muizz Street": [30.0493, 31.2612],

  /* ── The Citadel ─────────────────────────────────────────────────────── */
  "Citadel of Saladin": [30.0293, 31.2616],
  "Mosque-Madrasa of Sultan Hassan": [30.0324, 31.2562],
  "Mosque of Ibn Tulun": [30.0287, 31.2502],

  /* ── Old Cairo and the river ─────────────────────────────────────────── */
  "Mosque of Amr ibn al-As": [30.0098, 31.233],
  "Hanging Church": [30.0053, 31.23],
  "The Egyptian Museum in Tahrir": [30.048, 31.2336],
  "Cairo Tower": [30.046, 31.2243],

  /* ── Saqqara and Dahshur ─────────────────────────────────────────────── */
  "Step Pyramid of Djoser": [29.8712, 31.2166],
  "Memphis open-air museum": [29.8495, 31.2551],
  "Bent Pyramid": [29.7902, 31.2095],
  "Red Pyramid": [29.8086, 31.2062],

  /* ── Luxor ───────────────────────────────────────────────────────────── */
  "Karnak Temple": [25.7159, 32.6578],
  "Luxor Museum": [25.7077, 32.6445],
  "Luxor Temple": [25.6995, 32.6391],
  "Valley of the Kings": [25.7405, 32.6018],
  "Temple of Hatshepsut": [25.7383, 32.6064],
  "Colossi of Memnon": [25.7205, 32.6104],
  "Deir el-Medina": [25.7284, 32.601],
  "Medinet Habu": [25.72, 32.6007],
  "Banana Island": [25.683, 32.6226],

  /* ── Alexandria ──────────────────────────────────────────────────────── */
  "Bibliotheca Alexandrina": [31.2087, 29.9089],
  "Citadel of Qaitbay": [31.2137, 29.8854],
  "Abu al-Abbas al-Mursi Mosque": [31.2057, 29.8822],
  "Montaza Gardens": [31.2876, 30.0182],

  /* ── Fayoum ──────────────────────────────────────────────────────────── */
  "Wadi El Rayan waterfalls": [29.1478, 30.3925],
  "Wadi Al-Hitan": [29.2641, 30.023],
  "Tunis Village": [29.3983, 30.4924],
};
