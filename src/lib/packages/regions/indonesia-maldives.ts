/**
 * Bali and the Maldives — «بالي والمالديف».
 *
 * Two destinations that get sold as one kind of holiday and are nothing
 * alike, so they are modelled differently on purpose.
 *
 * Bali is split into TWO sleeping bases rather than one. Ubud is ninety
 * minutes inland from the coast, and a single «Bali» base would have put half
 * its curated days two hours from the hotel — exactly the lie the base model
 * exists to prevent. Split, each base's days are all inside an hour of its
 * own bed, and moving once at the midpoint is one taxi, not seven.
 *
 * The Maldives is a resort trip and its ceiling says so: three day shapes,
 * three nights of curation, and no fourth. A Maldives day is a reef, a
 * sandbank and a sunset; inventing a fifth distinct excursion to round the
 * number up would be writing a brochure, not a plan. Past three nights the
 * app offers free days, which is the truth of the place.
 *
 * Curated around landscape, water, temples and food — the cliffs, the rice
 * terraces, the reef, a grilled fish on the sand at Jimbaran — rather than
 * the beach-club strip, which is the other Bali and not this one.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Ubud ─────────────────────────────────────────────────────────────── */

const UBUD_DAYS: CuratedDay[] = [
  {
    key: "ubud-arrive",
    title: "Land, and climb the ridge",
    titleAr: "الوصول… وطلعة الحافة",
    places: [
      { name: "Campuhan Ridge Walk", nameAr: "ممشى حافة تشامبوهان", why: "Ninety minutes from the airport and then this: a paved spine between two river valleys with no traffic on it, and it is the only hour of the day under 30 degrees.", whyAr: "ساعة ونص من المطار وبعدها هذا: ممشى مرصوف على ظهر بين واديين وما فيه سيارات، وهي الساعة الوحيدة باليوم تحت الثلاثين درجة.", category: "walk", rating: 4.5, priceBand: 0, startTime: "16:00" },
      { name: "Ubud Palace", nameAr: "قصر أوبود", why: "The legong dance in the palace courtyard starts at 7:30 and the tickets are sold at the gate from six — sit on the left, the gamelan orchestra is on the right.", whyAr: "رقصة الليغونغ بفناء القصر تبدأ ٧:٣٠ والتذاكر تنباع عند البوابة من الساعة ستة — اقعدوا على اليسار، فرقة الغاميلان على اليمين.", category: "sight", rating: 4.3, priceBand: 1, startTime: "18:00" },
      { name: "Fair Warung Balé", nameAr: "فير وارونغ بالي", why: "Dinner after the dance at a warung that puts what it makes into a free clinic up the road — nasi campur, chicken sate, and it is still open when the palace empties.", whyAr: "عشا بعد الرقصة بوارونغ يحوّل أرباحه لعيادة مجانية بنفس الشارع — ناسي تشامبور وسيخ دجاج، ولا زال مفتوح لما يفضى القصر.", category: "food", rating: 4.5, priceBand: 1, startTime: "20:45", dietary: ["unverified"] },
    ],
  },
  {
    key: "ubud-terraces",
    title: "Rice terraces and holy water",
    titleAr: "مدرجات الرز والماء المقدس",
    places: [
      { name: "Tegallalang Rice Terrace", nameAr: "مدرجات تيغالالانغ", why: "Be there by half seven: the mist is still in the valley, the swings aren't running yet, and the farmer who owns each terrace takes a small fee at the top of his own steps.", whyAr: "كونوا هناك ٧:٣٠: الضباب لا زال بالوادي، والمراجيح ما اشتغلت، وكل مزارع ياخذ مبلغ بسيط عند درج مدرجته.", category: "nature", rating: 4.5, priceBand: 1, startTime: "07:30" },
      { name: "Tirta Empul", nameAr: "معبد تيرتا إمبول", why: "A thousand-year-old spring temple where Balinese still queue to bathe — you can watch from the wall without joining, and a sarong is required either way.", whyAr: "معبد نبع عمره ألف سنة ولا زال البالينيون يصطفون فيه للاغتسال — تقدرون تتفرجون من فوق الجدار بدون مشاركة، والسارونغ مطلوب بالحالتين.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
      { name: "Gunung Kawi", nameAr: "غونونغ كاوي", why: "Three hundred steps down into a river gorge to ten shrines cut straight into the cliff in the 11th century — the climb back up is the price, and it is a fair one.", whyAr: "ثلاثمئة درجة نزول لوادي نهر وفيه عشرة أضرحة منحوتة بالجرف من القرن الحادي عشر — والطلعة رجعة هي الثمن، وثمن عادل.", category: "sight", rating: 4.6, priceBand: 1, startTime: "12:00" },
      { name: "Tegenungan Waterfall", nameAr: "شلال تيغينونغان", why: "The one waterfall here you reach without a hike — a hundred and sixty steps down, and go late: the afternoon light comes straight down the gorge.", whyAr: "الشلال الوحيد هنا اللي توصلونه بدون مشي جبلي — مئة وستين درجة نزول، وروحوا بالعصر: ضوء العصر ينزل بالوادي مباشرة.", category: "nature", rating: 4.3, priceBand: 1, startTime: "15:30" },
    ],
  },
  {
    key: "ubud-north",
    title: "The crater, the lake, the terraces",
    titleAr: "الفوّهة والبحيرة والمدرجات",
    places: [
      { name: "Penelokan viewpoint", nameAr: "مطل بينيلوكان", why: "Breakfast facing a live volcano sitting in its own crater lake — go early: by ten the cloud comes up the valley and you will see nothing at all.", whyAr: "فطور قبال بركان حي قاعد داخل بحيرة فوهته — روحوا بدري: الساعة عشرة يطلع الغيم من الوادي وما بتشوفون ولا شي.", category: "nature", rating: 4.5, priceBand: 1, startTime: "07:30" },
      { name: "Pura Ulun Danu Beratan", nameAr: "معبد أولون دانو براتان", why: "The temple that looks like it is floating on Lake Bratan — it is on the 50,000-rupiah note, it sits at 1,200 metres, and you will want a jacket.", whyAr: "المعبد اللي يبان طافي على بحيرة براتان — موجود على ورقة الخمسين ألف روبية، وعلى ارتفاع ١٢٠٠ متر، وبتحتاجون جاكيت.", category: "sight", rating: 4.6, priceBand: 1, startTime: "11:00" },
      { name: "Jati Harum", nameAr: "جاتي هاروم", why: "A bamboo terrace on the Jatiluwih road: nasi goreng, chicken sate and a young coconut opened at the table, with the whole valley of terraces under the railing.", whyAr: "مصطبة خيزران على طريق جاتيلويه: ناسي غورينغ وسيخ دجاج وجوزة هند صغيرة تنفتح عند الطاولة، والوادي كله مدرجات تحت الدرابزين.", category: "food", rating: 4.2, priceBand: 1, startTime: "13:30", dietary: ["unverified"] },
      { name: "Jatiluwih Rice Terraces", nameAr: "مدرجات جاتيلويه", why: "UNESCO-listed, an hour from the nearest tour bus: terraces to the horizon, a four-kilometre loop path through them, and no swings, no cafés, no queue.", whyAr: "مدرجة على قائمة اليونسكو وبعيدة ساعة عن أقرب باص سياحي: مدرجات لين الأفق، ومسار دائري أربعة كيلو بينها، وبلا مراجيح ولا كوفيات ولا طوابير.", category: "nature", rating: 4.6, priceBand: 1, startTime: "14:30" },
    ],
  },
  {
    key: "ubud-monkeys",
    title: "Monkeys, stone, and the market",
    titleAr: "قرود وحجر والسوق",
    places: [
      { name: "Sacred Monkey Forest Sanctuary", nameAr: "غابة القرود المقدسة", why: "Three temples in a ravine of banyan trees with around 1,200 macaques living in them — sunglasses off, nothing in your hands, and they will ignore you.", whyAr: "ثلاثة معابد بوادي أشجار بانيان ويسكنها قرابة ١٢٠٠ قرد — شيلوا النظارات وما تمسكون شي بأيديكم، وبيتجاهلونكم.", category: "nature", rating: 4.4, priceBand: 1, startTime: "09:00" },
      { name: "Goa Gajah", nameAr: "غوا غاجاه", why: "The «Elephant Cave» is a demon's mouth carved into rock in the 11th century — you are inside it in five minutes, but the bathing pools below are where people sit.", whyAr: "«كهف الفيل» فم شيطان منحوت بالصخر من القرن الحادي عشر — تخلصونه بخمس دقايق، لكن برك الاغتسال تحته هي اللي يقعد عندها الناس.", category: "sight", rating: 4.4, priceBand: 1, startTime: "11:30" },
      { name: "Sanak Masakan Padang", nameAr: "ساناك مساكان بادانغ", why: "Padang food is Sumatran Muslim cooking: you point at the bowls stacked in the window — beef rendang, jackfruit curry, fried chicken — and pay only for what you take.", whyAr: "أكل بادانغ مطبخ مسلمي سومطرة: تأشرون على الصحون المرصوصة بالواجهة — رندانغ لحم وكاري كاتهل ودجاج مقلي — وتدفعون على اللي تاخذونه بس.", category: "food", rating: 4.2, priceBand: 1, startTime: "12:45", dietary: ["halal-friendly"] },
      { name: "Pura Taman Saraswati", nameAr: "معبد تامان ساراسواتي", why: "A lotus pond with the temple at the end of it, two minutes from the market and free to walk into — come at two, when the flowers are open.", whyAr: "بركة لوتس والمعبد بآخرها، على بعد دقيقتين من السوق ودخولها مجاني — تعالوا الساعة اثنين، وقت ما تكون الزهور مفتحة.", category: "sight", rating: 4.5, priceBand: 0, startTime: "14:00" },
    ],
  },
];

/* ── Seminyak ─────────────────────────────────────────────────────────── */

const SEMINYAK_DAYS: CuratedDay[] = [
  {
    key: "seminyak-arrive",
    title: "Down to the sunset side",
    titleAr: "نزول لجهة الغروب",
    places: [
      { name: "Seminyak Beach", nameAr: "شاطئ سمينياك", why: "Bali's west coast faces the sunset, which is the whole reason this strip exists — the sand is dark volcanic grey and the current is real, so swim between the flags.", whyAr: "ساحل بالي الغربي يواجه الغروب، وهذا كل سبب وجود هالشريط — الرمل رمادي بركاني والتيار قوي فعلًا، فاسبحوا بين الأعلام.", category: "nature", rating: 4.3, priceBand: 0, startTime: "16:30" },
      { name: "Petitenget Temple", nameAr: "معبد بيتيتنغيت", why: "A small sea temple standing on the beach itself with the sunset behind it — offerings on the steps every evening, and you can stand at the wall without going in.", whyAr: "معبد بحري صغير واقف على الشاطئ نفسه والغروب خلفه — قرابين على درجه كل مساء، وتقدرون توقفون عند السور بدون دخول.", category: "sight", rating: 4.4, priceBand: 0, startTime: "18:15" },
      { name: "Ayam Betutu Asli Gilimanuk", nameAr: "أيام بيتوتو أصلي غيليمانوك", why: "One dish, done for fifty years: a whole chicken steamed in a paste of lemongrass, shallot and chilli, with rice and blanched greens — there is nothing else on the menu, so just say how hot.", whyAr: "طبق واحد من خمسين سنة: دجاجة كاملة على البخار بخلطة ليمون عشبي وبصل وفلفل، مع رز وخضار مسلوقة — ما فيه غيره بالمنيو، فقولوا بس كم تبونها حارة.", category: "food", rating: 4.3, priceBand: 1, startTime: "19:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "seminyak-tanahlot",
    title: "North to the fields and Tanah Lot",
    titleAr: "شمالًا للحقول وتانه لوت",
    places: [
      { name: "Batu Bolong Beach", nameAr: "شاطئ باتو بولونغ", why: "Go at eight while the surf school is the only thing on the sand — there is a temple on the rocks at the north end that the tide cuts off twice a day.", whyAr: "روحوا الساعة ثمانية والشاطئ ما فيه غير مدرسة الأمواج — وفيه معبد على الصخور بالطرف الشمالي يقطعه المد مرتين باليوم.", category: "nature", rating: 4.3, priceBand: 0, startTime: "08:00" },
      { name: "Warung Varuna", nameAr: "وارونغ فارونا", why: "Breakfast two lanes back from Batu Bolong: nasi campur built in front of you from the trays — rice, tempeh, sambal, a skewer of grilled chicken — and iced coffee with it.", whyAr: "فطور على بعد زقاقين من باتو بولونغ: ناسي تشامبور يتركّب قدامكم من الصواني — رز وتمبيه وسامبال وسيخ دجاج مشوي — ومعاه قهوة مثلجة.", category: "food", rating: 4.3, priceBand: 1, startTime: "09:30", dietary: ["unverified"] },
      { name: "Taman Ayun Temple", nameAr: "معبد تامان آيون", why: "A royal temple inside its own moat, with eleven-tier thatched towers you look at from a garden path — the calmest big temple on the island, because the coaches skip it.", whyAr: "معبد ملكي داخل خندق مائي، وأبراج بأحد عشر طبقة من القش تشوفونها من ممشى الحديقة — أهدأ معبد كبير بالجزيرة، لأن الباصات تعديه.", category: "sight", rating: 4.5, priceBand: 1, startTime: "11:00" },
      { name: "Tanah Lot", nameAr: "تانه لوت", why: "A temple on a rock that becomes an island twice a day — check the tide before you leave, and watch from the northern cliff path rather than the packed terrace.", whyAr: "معبد على صخرة تصير جزيرة مرتين باليوم — شوفوا جدول المد قبل ما تطلعون، وتفرجوا من ممشى الجرف الشمالي بدل المدرج المزحوم.", category: "sight", rating: 4.6, priceBand: 1, startTime: "16:30" },
    ],
  },
  {
    key: "seminyak-uluwatu",
    title: "The southern cliffs",
    titleAr: "جروف الجنوب",
    places: [
      { name: "Uluwatu Temple", nameAr: "معبد أولواتو", why: "Seventy metres of cliff straight down to the sea with a temple on the lip of it — hold on to your sunglasses, the monkeys here are professionals.", whyAr: "سبعين متر جرف نازل عمودي على البحر وفوق حافته معبد — امسكوا نظاراتكم زين، قرود هالمكان محترفة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
      { name: "Padang Padang Beach", nameAr: "شاطئ بادانغ بادانغ", why: "You reach it through a crack in the rock and down a staircase — it is small, and the entrance is exactly why it is worth the steps.", whyAr: "توصلونه من شق بالصخر وبعده درج نازل — صغير، ومدخله بالضبط هو اللي يخلي الدرج يستاهل.", category: "nature", rating: 4.4, priceBand: 1, startTime: "12:30" },
      { name: "Melasti Beach", nameAr: "شاطئ ميلاستي", why: "A road cut down through white limestone cliffs to a flat turquoise bay — the descent is the photograph, and the water is the calmest in the south.", whyAr: "طريق محفور بين جروف جيرية بيضاء ينزل لخليج فيروزي هادي — النزلة هي الصورة، والماء أهدأ ماء بالجنوب.", category: "nature", rating: 4.5, priceBand: 0, startTime: "15:00" },
      { name: "Jimbaran Bay", nameAr: "خليج جيمباران", why: "Tables on the sand, fish chosen by weight, and planes coming in low over the bay — agree the price per kilo before they put it on the grill.", whyAr: "طاولات على الرمل، وسمك تختارونه بالوزن، والطيارات تعدي واطية فوق الخليج — اتفقوا على سعر الكيلو قبل ما يحطونه على الجمر.", category: "food", rating: 4.4, priceBand: 2, startTime: "18:00", dietary: ["seafood", "unverified"] },
    ],
  },
];

/* ── The Maldives ─────────────────────────────────────────────────────── */

const MALDIVES_DAYS: CuratedDay[] = [
  {
    key: "maldives-arrive",
    title: "Malé, and then the water",
    titleAr: "ماليه… وبعدها الماء",
    places: [
      { name: "Hukuru Miskiy", nameAr: "مسجد هوكورو ميسكي", why: "The old Friday mosque is built of carved coral stone, not brick — 1658, and the interior lacquer work has never been replaced. Ask at the Islamic Centre for the key.", whyAr: "المسجد الجامع القديم مبني من حجر المرجان المنحوت مو الطوب — سنة ١٦٥٨، وزخارف الورنيش بداخله ما تغيرت أبدًا. اسألوا بالمركز الإسلامي عن المفتاح.", category: "sight", rating: 4.6, priceBand: 0, startTime: "10:30" },
      { name: "Malé Fish Market", nameAr: "سوق السمك بماليه", why: "Tuna the length of your arm coming off the boats onto a wet tiled floor at midday — it is the one place in the country that is neither a resort nor a queue.", whyAr: "تونة بطول ذراعكم تنزل من القوارب على أرض بلاط مبلولة وقت الظهر — المكان الوحيد بالبلد اللي لا منتجع ولا طابور.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:00", dietary: ["halal", "seafood"] },
      { name: "Velana International Airport", nameAr: "مطار فيلانا الدولي", why: "The seaplane terminal is a shuttle ride from arrivals and the flight is the best twenty minutes of the trip — ask for a seat behind the pilot, and note the last seaplane leaves before sunset.", whyAr: "صالة الطائرات المائية على بعد باص من صالة الوصول، والرحلة أحلى عشرين دقيقة بالسفرة — اطلبوا مقعد خلف الكابتن، وانتبهوا إن آخر طيارة مائية تطلع قبل الغروب.", category: "sight", rating: 4.5, priceBand: 3, startTime: "15:00" },
    ],
  },
  {
    key: "maldives-reef",
    title: "One reef, and nothing after it",
    titleAr: "شعبة وحدة… وبعدها ولا شي",
    places: [
      { name: "Banana Reef", nameAr: "شعاب البنانا", why: "The first reef anyone dived in the Maldives, and still the one to snorkel — go on the morning boat, before the current turns and the visibility drops.", whyAr: "أول شعاب غاص فيها أحد بالمالديف، ولا زالت الأفضل للسنوركل — روحوا بقارب الصباح، قبل ما ينقلب التيار وتقل الرؤية.", category: "nature", rating: 4.7, priceBand: 2, startTime: "08:30" },
      { name: "Kuda Bandos", nameAr: "كودا باندوس", why: "An uninhabited picnic island twenty minutes out — sand, shade, a reef off the end of it, and no building. Take water; there is nothing to buy.", whyAr: "جزيرة خالية للنزهة على بعد عشرين دقيقة — رمل وظل وشعاب بطرفها وما فيه أي مبنى. خذوا معكم ماء، ما فيه شي ينشرى.", category: "rest", rating: 4.4, priceBand: 1, startTime: "12:30" },
    ],
  },
  {
    key: "maldives-island",
    title: "The islands where people live",
    titleAr: "الجزر اللي يسكنها الناس",
    places: [
      { name: "Maafushi", nameAr: "مافوشي", why: "A local island of about three thousand people, half an hour by speedboat: a harbour, a school, a mosque and guesthouses. This is the Maldives that is a country, not a lagoon.", whyAr: "جزيرة أهلية فيها قرابة ثلاثة آلاف نسمة، نص ساعة بالقارب السريع: ميناء ومدرسة ومسجد وبيوت ضيافة. هذي المالديف كبلد، مو كبحيرة.", category: "walk", rating: 4.2, priceBand: 1, startTime: "09:30" },
      { name: "Hiyala Mariyaad", nameAr: "هيالا مارياد", why: "Maldivian home food on Maafushi's one street: garudhiya, a clear tuna broth you pour over rice with lime and chilli, and mas huni with flatbread if anything is left from the morning.", whyAr: "أكل مالديفي بيتي بشارع مافوشي الوحيد: «غارودِيا» مرق تونة صافي تصبونه على الرز مع ليمون وفلفل، و«ماس هوني» مع خبز رقاق إذا بقي شي من الصبح.", category: "food", rating: 4.2, priceBand: 1, startTime: "12:00", dietary: ["halal", "seafood"] },
      { name: "Gulhi", nameAr: "غولهي", why: "Twenty minutes further north and a tenth the size — a fishing island with one street, and a sandbank off its western tip that surfaces at low tide.", whyAr: "عشرين دقيقة شمالًا وبعُشر الحجم — جزيرة صيد بشارع واحد، وفيها لسان رملي بطرفها الغربي يطلع وقت الجزر.", category: "nature", rating: 4.3, priceBand: 1, startTime: "13:30" },
    ],
  },
];

/* ── Day-trip shapes ──────────────────────────────────────────────────── */

const NUSA_PENIDA_DAYTRIP: CuratedDay = {
  key: "nusa-penida-daytrip",
  title: "Nusa Penida in a day",
  titleAr: "نوسا بينيدا بيوم",
  places: [
    { name: "Kelingking Beach", nameAr: "شاطئ كيلينغكينغ", why: "The boat from Sanur leaves at 7:30 so your pickup is at six — and this headland is why people still do it. The viewpoint is five minutes from the car park; the climb down is an hour of rope and ladder each way.", whyAr: "القارب من سانور يطلع ٧:٣٠ فالتوصيلة الساعة ستة — وهالرأس الصخري هو السبب اللي يخلي الناس تسويها. المطل على بعد خمس دقايق من الموقف؛ والنزول ساعة حبال وسلالم بكل اتجاه.", category: "nature", rating: 4.7, priceBand: 1, startTime: "09:30" },
    { name: "Broken Beach", nameAr: "الشاطئ المكسور", why: "A circular cove with an arch the sea cut through the cliff — walk the rim clockwise and look down into the pool for manta rays, they pass through in the morning.", whyAr: "خليج دائري وقوس قطعه البحر بالجرف — لفوا الحافة مع عقارب الساعة وطالعوا البركة تحت، شفنين المانتا يعبرون منها الصبح.", category: "nature", rating: 4.6, priceBand: 1, startTime: "11:30" },
    { name: "Angel's Billabong", nameAr: "أنجلز بيلابونغ", why: "A natural rock pool beside Broken Beach that is only safe at dead low tide — if there is any swell at all, look at it and do not get in. People have drowned here.", whyAr: "بركة صخرية طبيعية جنب الشاطئ المكسور وما تأمن إلا بأقصى الجزر — وإذا فيه أي موج، تفرجوا وبس ولا تنزلون. ناس غرقوا هنا.", category: "nature", rating: 4.5, priceBand: 1, startTime: "12:15" },
    { name: "Crystal Bay", nameAr: "خليج كريستال", why: "The one beach on the island you can actually swim off — leave it until late, it faces west, and the boats back to Sanur go at four.", whyAr: "الشاطئ الوحيد بالجزيرة اللي تقدرون تسبحون منه فعلًا — خلوه للآخر، يواجه الغرب، وقوارب الرجعة لسانور الساعة أربعة.", category: "nature", rating: 4.4, priceBand: 1, startTime: "15:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const BASES: Record<BaseId, Base> = {
  ubud: {
    id: "ubud",
    name: "Ubud",
    nameAr: "أوبود",
    country: "ID",
    lat: -8.5069,
    lng: 115.2625,
    photoQuery: "Ubud Bali rice terraces temple",
    match: ["ubud", "bali", "indonesia", "أوبود", "بالي", "إندونيسيا", "اندونيسيا"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["nusa_penida"],
    pairsWith: ["seminyak"],
    days: UBUD_DAYS,
  },
  seminyak: {
    id: "seminyak",
    name: "Seminyak",
    nameAr: "سمينياك",
    country: "ID",
    lat: -8.69,
    lng: 115.167,
    photoQuery: "Seminyak Bali beach sunset",
    match: ["seminyak", "سمينياك"],
    typicalNights: 3,
    maxNights: 3,
    reachable: ["nusa_penida"],
    pairsWith: ["ubud"],
    days: SEMINYAK_DAYS,
  },
  maldives: {
    id: "maldives",
    name: "Maldives",
    nameAr: "المالديف",
    country: "MV",
    lat: 4.1755,
    lng: 73.5093,
    photoQuery: "Maldives atoll lagoon overwater villa",
    match: ["maldives", "maldive", "المالديف", "جزر المالديف"],
    typicalNights: 3,
    maxNights: 3,
    reachable: [],
    pairsWith: [],
    days: MALDIVES_DAYS,
  },

  /* Bali — day-trip base */
  nusa_penida: {
    id: "nusa_penida",
    name: "Nusa Penida",
    nameAr: "نوسا بينيدا",
    country: "ID",
    lat: -8.7278,
    lng: 115.5444,
    photoQuery: "Nusa Penida Kelingking Beach Bali",
    match: ["nusa penida", "نوسا بينيدا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: NUSA_PENIDA_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const ROUTES: Route[] = [
  {
    id: "bali-classic",
    match: ["bali", "ubud", "seminyak", "indonesia", "بالي", "أوبود", "سمينياك", "إندونيسيا"],
    title: "The classic Bali route",
    titleAr: "المسار الكلاسيكي لبالي",
    subtitle: "Ubud → the coast",
    subtitleAr: "أوبود ← الساحل",
    provenance: "Inland first, sea second. Ubud is ninety minutes from the beach, so splitting the stay is the difference between two hours in a car every day and none.",
    provenanceAr: "الداخل أول والبحر بعده. أوبود ساعة ونص عن الشاطئ، وتقسيم الإقامة هو الفرق بين ساعتين سواقة كل يوم وبين ولا دقيقة.",
    forWho: "Six nights or more, and you'd rather not spend them in a car.",
    forWhoAr: "ست ليالٍ أو أكثر، وما تبون تقضونها بالسيارة.",
    legs: [
      { baseId: "ubud", nightsRatio: 3 },
      { baseId: "seminyak", nightsRatio: 3 },
    ],
    transport: [{ from: "ubud", to: "seminyak", mode: "car", minutes: 90 }],
    minNights: 6,
  },
  {
    id: "maldives-classic",
    match: ["maldives", "maldive", "المالديف", "جزر المالديف"],
    title: "The Maldives, at the speed it actually goes",
    titleAr: "المالديف… على سرعتها الحقيقية",
    subtitle: "Malé, the reef, and the islands people live on",
    subtitleAr: "ماليه والشعاب والجزر اللي يسكنها الناس",
    provenance: "Three curated days and no more, because a resort week is three days of plans and the rest is water — we would rather say that than invent a fourth island.",
    provenanceAr: "ثلاثة أيام مكتوبة وبس، لأن أسبوع المنتجع ثلاثة أيام خطط والباقي ماء — ونفضل نقولها بدل ما نخترع جزيرة رابعة.",
    forWho: "A honeymoon, or the week after a long trip.",
    forWhoAr: "شهر عسل، أو أسبوع بعد رحلة طويلة.",
    legs: [{ baseId: "maldives", nightsRatio: 3 }],
    transport: [],
    minNights: 3,
  },
];

export const INDONESIA_MALDIVES: Region = { bases: BASES, routes: ROUTES };

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte, [lat, lng] at the
 * venue. Southern-hemisphere latitudes are negative; the Maldives entries
 * are pinned at the island or the reef itself, which is where you get in the
 * water, not at the resort that sold you the boat.
 */
export const INDONESIA_MALDIVES_COORDS: Record<string, readonly [number, number]> = {
  /* Ubud and around */
  "Campuhan Ridge Walk": [-8.5063, 115.2551],
  "Ubud Palace": [-8.5069, 115.2625],
  "Fair Warung Balé": [-8.5074, 115.2652],
  "Jati Harum": [-8.3651, 115.1427],
  "Tegallalang Rice Terrace": [-8.4313, 115.2794],
  "Tirta Empul": [-8.4156, 115.3153],
  "Gunung Kawi": [-8.4227, 115.3122],
  "Tegenungan Waterfall": [-8.5751, 115.2889],
  "Penelokan viewpoint": [-8.2758, 115.3617],
  "Pura Ulun Danu Beratan": [-8.2752, 115.1669],
  "Jatiluwih Rice Terraces": [-8.3703, 115.1327],
  "Sacred Monkey Forest Sanctuary": [-8.5188, 115.2585],
  "Goa Gajah": [-8.5236, 115.2872],
  "Pura Taman Saraswati": [-8.5063, 115.2632],
  "Sanak Masakan Padang": [-8.5091, 115.265],

  /* The coast and the south */
  "Seminyak Beach": [-8.6913, 115.157],
  "Petitenget Temple": [-8.6798, 115.1513],
  "Ayam Betutu Asli Gilimanuk": [-8.7007, 115.1764],
  "Batu Bolong Beach": [-8.6577, 115.1287],
  "Warung Varuna": [-8.6548, 115.1317],
  "Taman Ayun Temple": [-8.5417, 115.1725],
  "Tanah Lot": [-8.6212, 115.0868],
  "Uluwatu Temple": [-8.8291, 115.0849],
  "Padang Padang Beach": [-8.8106, 115.103],
  "Melasti Beach": [-8.8483, 115.1614],
  "Jimbaran Bay": [-8.79, 115.1633],

  /* Nusa Penida */
  "Kelingking Beach": [-8.7514, 115.4725],
  "Broken Beach": [-8.7222, 115.4563],
  "Angel's Billabong": [-8.7237, 115.457],
  "Crystal Bay": [-8.7175, 115.4508],

  /* Maldives */
  "Hukuru Miskiy": [4.1775, 73.5094],
  "Malé Fish Market": [4.1781, 73.5083],
  "Velana International Airport": [4.1918, 73.5291],
  "Banana Reef": [4.2683, 73.5417],
  "Kuda Bandos": [4.2783, 73.4943],
  Maafushi: [3.943, 73.4906],
  "Hiyala Mariyaad": [3.9439, 73.4906],
  Gulhi: [3.9716, 73.4936],
};
