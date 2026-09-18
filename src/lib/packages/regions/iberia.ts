/**
 * Iberia — Portugal.
 *
 * This region exists because somebody typed "Lisbon" into the destination
 * field and got back nothing at all. Portugal is one of the three or four
 * European destinations a Gulf traveller actually books, and we were
 * answering it with a blank screen.
 *
 * Same discipline as `library.ts`: a BASE owns its days, a ROUTE owns only an
 * ordering and a set of ratios, and `maxNights` never exceeds the number of
 * day shapes a base can honestly fill. Sintra, Cascais and the Douro are
 * mornings you leave for and evenings you come back from — they are bases so
 * that Lisbon and Porto can carry them, not places we pretend you move to.
 *
 * On the Douro: the valley is sold everywhere as a tasting circuit. It is
 * also, and first, the oldest demarcated wine region's landscape — a river
 * cut through terraced schist, reached by what is genuinely one of Europe's
 * great train lines. That is what this day is built on.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Lisbon ───────────────────────────────────────────────────────────── */

const LISBON_DAYS: CuratedDay[] = [
  {
    key: "lisbon-arrive",
    title: "Alfama, the first evening",
    titleAr: "الفاما… أول مساء",
    places: [
      { name: "Miradouro das Portas do Sol", nameAr: "مطل بورتاش دو سول", why: "The terrace the whole city is photographed from — get there an hour before sunset and the roofs turn orange under you.", whyAr: "الشرفة اللي تتصور منها المدينة كلها — كونوا فيها قبل الغروب بساعة وبتشوفون السطوح تصير برتقالية تحتكم.", category: "sight", priceBand: 0, startTime: "17:00" },
      { name: "Alfama backstreets", nameAr: "أزقة الفاما", why: "Walk downhill with no map — the quarter survived the 1755 earthquake, which is why the lanes make no sense.", whyAr: "انزلوا مشي بدون خريطة — الحي نجا من زلزال ١٧٥٥، وعشان كذا أزقته ما لها منطق.", category: "walk", priceBand: 0, startTime: "18:15" },
      { name: "Chapitô à Mesa", nameAr: "مطعم شابيتو آ ميزا", why: "A circus school with a terrace restaurant on its roof — the view costs the same as the food, which is unusual here.", whyAr: "مدرسة سيرك وفوق سطحها مطعم بشرفة — الإطلالة بنفس سعر الأكل، وهذا نادر بهالمدينة.", category: "food", priceBand: 2, startTime: "20:00", dietary: ["pork-served"] },
    ],
  },
  {
    key: "lisbon-belem",
    title: "Belém, where the ships left from",
    titleAr: "بيلين… من هنا أبحرت السفن",
    places: [
      { name: "Mosteiro dos Jerónimos", nameAr: "دير جيرونيموش", why: "Be in the cloister queue by 09:15 — the carved stonework is the reason, and by noon you can't see it for people.", whyAr: "كونوا بطابور الفناء الساعة ٩:١٥ — النقش الحجري هو السبب، وبعد الظهر ما بتشوفونه من الزحمة.", category: "sight", priceBand: 1, startTime: "09:30" },
      { name: "Pastéis de Belém", nameAr: "باشتيش دي بيلين", why: "Custard tarts baked to a monastery recipe and handed over still hot, with cinnamon to shake on yourself — ignore the takeaway line down the street and go inside, the back rooms seat 400 and are usually half empty.", whyAr: "تارت كسترد بوصفة دير قديم يعطونكم إياها وهي سخنة، ومعها قرفة ترشونها بأنفسكم — لا تدخلون طابور السفري بالشارع وادخلوا جوّا، القاعات الخلفية تسع ٤٠٠ وغالبًا نص فاضية.", category: "food", priceBand: 1, startTime: "11:30", dietary: ["vegetarian"] },
      { name: "Belém Tower", nameAr: "برج بيلين", why: "Small inside and not worth a long queue — the thing to do is walk out on the causeway at low tide and look back at it.", whyAr: "من جوّا صغير وما يستاهل طابور طويل — الأحلى تمشون على الممر وقت الجزر وتلتفتون له.", category: "sight", priceBand: 1, startTime: "13:00" },
      { name: "MAAT", nameAr: "متحف الفن والعمارة والتقنية", why: "Skip the ticket if you're tired — the roof is a public ramp you can walk up for free, and the river is the exhibit.", whyAr: "لو تعبانين تجاوزوا التذكرة — السطح منحدر عام تطلعونه ببلاش، والنهر هو المعروض.", category: "sight", priceBand: 1, startTime: "15:30" },
    ],
  },
  {
    key: "lisbon-baixa",
    title: "Baixa, Chiado and the high street",
    titleAr: "بايشا وشيادو والشارع العالي",
    places: [
      { name: "Praça do Comércio", nameAr: "ساحة التجارة", why: "The square opens straight onto the river with no railing — stand at the water steps, that's where the boats used to land.", whyAr: "الساحة تفتح على النهر مباشرة وبدون سور — وقفوا عند درج الماي، من هنا كانت ترسو المراكب.", category: "sight", priceBand: 0, startTime: "09:30" },
      { name: "Convento do Carmo", nameAr: "دير الكارمو", why: "A church with no roof since the earthquake — and from the square outside it you reach the top of the Santa Justa lift without paying for the lift.", whyAr: "كنيسة بلا سقف من يوم الزلزال — ومن الساحة اللي قبالها توصلون لأعلى مصعد سانتا جوشتا بدون ما تدفعون للمصعد.", category: "sight", priceBand: 1, startTime: "11:00" },
      { name: "Time Out Market", nameAr: "سوق تايم أوت", why: "Twenty-six kitchens around shared tables — grilled fish, salt-cod cakes, steak sandwiches, pastries — useful when the group wants six different things and nobody wants to argue.", whyAr: "ستة وعشرين مطبخ حول طاولات مشتركة — سمك مشوي وكرات الباكالاو وسندويش ستيك وحلويات — مفيد لما تبي المجموعة ست أشياء مختلفة وما أحد يبي يتجادل.", category: "food", priceBand: 2, startTime: "13:30", dietary: ["seafood", "pork-served"] },
      { name: "Miradouro de São Pedro de Alcântara", nameAr: "مطل ساو بيدرو دي ألكانتارا", why: "The castle sits exactly opposite across the valley — come at dusk and you watch it get lit while you're standing there.", whyAr: "القلعة قبالكم بالضبط من الجهة الثانية للوادي — تعالوا وقت المغرب وبتشوفونها تضوي وأنتم واقفين.", category: "sight", priceBand: 0, startTime: "17:30" },
    ],
  },
  {
    key: "lisbon-nacoes",
    title: "Parque das Nações, by the water",
    titleAr: "بارك داش ناسويش… على الماي",
    places: [
      { name: "Oceanário de Lisboa", nameAr: "أوشيانريو لشبونة", why: "One enormous central tank you circle twice, once from above and once from below — the best thing in the city with children.", whyAr: "حوض مركزي ضخم تلفون حوله مرتين، مرة من فوق ومرة من تحت — أحلى شي بالمدينة مع الأطفال.", category: "sight", priceBand: 2, startTime: "10:00" },
      { name: "Senhor Peixe", nameAr: "مطعم سنيور بيشي", why: "Pick the fish off the ice at the counter, they weigh it and grill it whole over charcoal — sea bass, bream or the big red prawns, with boiled potatoes and nothing else on the plate.", whyAr: "اختاروا السمكة من على الثلج عند الواجهة، يوزنونها ويشوونها كاملة على الفحم — قاروص أو شعري أو روبيان أحمر كبير، ومعها بطاطا مسلوقة وبس.", category: "food", priceBand: 2, startTime: "13:00", dietary: ["seafood"] },
      { name: "Telecabine Lisboa", nameAr: "تلفريك لشبونة", why: "Eight minutes over the water for the length of the waterfront — ride it one way and walk the other, it's the cheaper half.", whyAr: "ثمان دقايق فوق الماي على طول الواجهة — اركبوه باتجاه واحد وارجعوا مشي، الرجعة هي النص الأرخص.", category: "sight", priceBand: 1, startTime: "15:00" },
      { name: "Parque das Nações riverside", nameAr: "واجهة بارك داش ناسويش النهرية", why: "The Vasco da Gama bridge runs 17 km across the estuary in front of you and never seems to reach the far side.", whyAr: "جسر فاسكو دا غاما يمتد ١٧ كيلو عبر المصب قدامكم ويبدو ما يوصل الضفة الثانية أبدًا.", category: "walk", priceBand: 0, startTime: "16:30" },
    ],
  },
  {
    key: "lisbon-castelo",
    title: "The castle, Mouraria and Graça",
    titleAr: "القلعة والموراريا وغراسا",
    places: [
      { name: "Castelo de São Jorge", nameAr: "قلعة ساو جورجي", why: "Go at opening and walk the ramparts first — the ticket is worth it for the walls, not for what's inside them.", whyAr: "روحوا مع الافتتاح وامشوا الأسوار أول شي — التذكرة تستاهل عشان الأسوار، مو عشان اللي داخلها.", category: "sight", priceBand: 2, startTime: "09:00" },
      { name: "Feira da Ladra", nameAr: "سوق فيرا دا لادرا", why: "Tuesdays and Saturdays only, and the good half is the far end where people sell out of blankets on the ground.", whyAr: "الثلاثاء والسبت بس، والنص الحلو هو الطرف البعيد وين يفرشون البضاعة على بطانيات بالأرض.", category: "shop", priceBand: 1, startTime: "11:00", openDays: [2, 6] },
      { name: "Mouraria", nameAr: "حي الموراريا", why: "The Moorish quarter, and still the immigrant quarter — Bengali and Pakistani kitchens doing biryani and grilled chicken on and around Rua do Benformoso, most of them halal and saying so at the door.", whyAr: "الحي المغاربي، ولا يزال حي المهاجرين — مطابخ بنغالية وباكستانية تسوّي برياني ودجاج مشوي بشارع بينفورموزو وحواليه، وأغلبها حلال ومكتوبة على الباب.", category: "food", priceBand: 1, startTime: "13:00", dietary: ["unverified"] },
      { name: "Miradouro da Senhora do Monte", nameAr: "مطل سنيورا دو مونتي", why: "The highest terrace in Lisbon and the only one locals still outnumber visitors on — bring something to sit on.", whyAr: "أعلى شرفة بلشبونة والوحيدة اللي أهلها أكثر من زوارها — خذوا معكم شي تقعدون عليه.", category: "sight", priceBand: 0, startTime: "17:30" },
    ],
  },
];

/* ── Porto ────────────────────────────────────────────────────────────── */

const PORTO_DAYS: CuratedDay[] = [
  {
    key: "porto-ribeira",
    title: "The Ribeira and the bridge",
    titleAr: "الريبيرا والجسر",
    places: [
      { name: "Ribeira", nameAr: "حي الريبيرا", why: "Tall thin houses stacked on the quay — walk the arcade behind the front row, the prices halve twenty metres in.", whyAr: "بيوت طويلة ضيقة مركومة على الرصيف — امشوا الرواق اللي خلف الصف الأول، الأسعار تنص بعشرين متر.", category: "walk", priceBand: 0, startTime: "11:00" },
      { name: "Palácio da Bolsa", nameAr: "قصر البورصة", why: "The old stock exchange keeps an Arab Room copied from the Alhambra — guided entry only, and it is the reason to go.", whyAr: "البورصة القديمة فيها «القاعة العربية» منسوخة من قصر الحمراء — الدخول بجولة فقط، وهي سبب الزيارة.", category: "sight", priceBand: 2, startTime: "13:00" },
      { name: "Ponte Luís I upper deck", nameAr: "الطابق العلوي لجسر لويش الأول", why: "The metro and the pedestrians share the top deck — cross on foot, it's sixty metres above the river with nothing in the way.", whyAr: "المترو والمشاة يتشاركون الطابق العلوي — اقطعوه مشي، ستين متر فوق النهر وما في شي يحجب.", category: "walk", priceBand: 0, startTime: "17:00" },
      { name: "Mercado Beira-Rio", nameAr: "سوق بيرا-ريو", why: "A covered food hall on the Gaia quay at the foot of the bridge — grilled sardines, salt-cod fritters and custard tarts from twenty counters, and the terrace outside has the whole of Porto facing you at sunset.", whyAr: "قاعة أكل مسقوفة على رصيف غايا عند قدم الجسر — سردين مشوي وكرات باكالاو وتارت كسترد من عشرين طاولة، والشرفة برا قبالها بورتو كاملة وقت الغروب.", category: "food", priceBand: 1, startTime: "18:15", dietary: ["seafood", "pork-served"] },
    ],
  },
  {
    key: "porto-clerigos",
    title: "Clérigos, Lello and the market",
    titleAr: "كليريغوش وليلو والسوق",
    places: [
      { name: "São Bento railway station", nameAr: "محطة ساو بينتو", why: "Twenty thousand hand-painted tiles inside a working station concourse — you can walk in off the street and nobody asks anything.", whyAr: "عشرين ألف بلاطة مرسومة باليد داخل صالة محطة شغّالة — تدخلون من الشارع وما أحد يسألكم شي.", category: "sight", priceBand: 0, startTime: "09:00" },
      { name: "Livraria Lello", nameAr: "مكتبة ليلو", why: "Book the first slot of the day online — the staircase is the whole point and it's unphotographable after ten.", whyAr: "احجزوا أول موعد باليوم أونلاين — الدرج هو المقصد كله وما ينتصور بعد العاشرة.", category: "shop", priceBand: 1, startTime: "10:30" },
      { name: "Torre dos Clérigos", nameAr: "برج كليريغوش", why: "225 steps up a spiral that gets narrower as you go — the reward is the only view where you see Porto's roofs, not its river.", whyAr: "٢٢٥ درجة بحلزون يضيق كل ما طلعتم — والمكافأة الإطلالة الوحيدة اللي تشوفون فيها سطوح بورتو، مو نهرها.", category: "sight", priceBand: 1, startTime: "12:00" },
      { name: "Mercado do Bolhão", nameAr: "سوق بولياو", why: "Reopened in 2022 in its own restored building — the ground-floor stalls are the real market, and the upstairs counters do grilled fish, soups and cheese plates at market prices.", whyAr: "فتح من جديد سنة ٢٠٢٢ بمبناه المرمّم — بسطات الدور الأرضي هي السوق الحقيقي، والطاولات فوق تقدم سمك مشوي وشوربات وأطباق جبن بأسعار السوق.", category: "food", priceBand: 1, startTime: "14:00", dietary: ["seafood", "pork-served"] },
    ],
  },
  {
    key: "porto-foz",
    title: "Down the river to the sea",
    titleAr: "مع النهر لين البحر",
    places: [
      { name: "Jardins do Palácio de Cristal", nameAr: "حدائق قصر الكريستال", why: "Terraced gardens on a cliff over the Douro, free, and with peacocks that will follow you if you look interested.", whyAr: "حدائق مدرجات على جرف فوق الدورو، مجانية، وفيها طواويس بتتبعكم إذا شافتكم مهتمين.", category: "nature", priceBand: 0, startTime: "09:30" },
      { name: "Tram 1 along the Douro", nameAr: "ترام رقم ١ على ضفة الدورو", why: "A 1930s wooden tram that runs the riverbank to the ocean — pay the driver, sit on the left, twenty-five minutes.", whyAr: "ترام خشبي من الثلاثينات يمشي على الضفة لين المحيط — ادفعوا للسائق، اقعدوا على اليسار، خمسة وعشرين دقيقة.", category: "walk", priceBand: 1, startTime: "11:30" },
      { name: "Farol de Felgueiras", nameAr: "منارة فيلغيراش", why: "A short black lighthouse on a breakwater the Atlantic breaks straight over — stand back, people get soaked here weekly.", whyAr: "منارة سوداء قصيرة على حاجز أمواج يضربه الأطلسي مباشرة — ابعدوا شوي، الناس تنبل هنا كل أسبوع.", category: "nature", priceBand: 0, startTime: "13:00" },
      { name: "Rua Heróis de França", nameAr: "شارع إيرويش دي فرانسا", why: "Matosinhos grills its fish on the pavement down this whole street — pick by the smoke, not by the menu.", whyAr: "ماتوزينيوش تشوي سمكها على الرصيف بطول هالشارع — اختاروا بالدخان، مو بالقائمة.", category: "food", priceBand: 2, startTime: "15:30", dietary: ["seafood"] },
    ],
  },
];

/* ── Day-trip shapes ──────────────────────────────────────────────────── */

const SINTRA_DAYTRIP: CuratedDay = {
  key: "sintra-daytrip",
  title: "Sintra in a day",
  titleAr: "سينترا بيوم",
  places: [
    { name: "Palácio Nacional da Pena", nameAr: "قصر بينا", why: "Forty minutes on the train from Rossio, then straight up — book the first entry slot, because the palace is a one-way corridor and corridors fill up.", whyAr: "أربعين دقيقة بالقطار من روسيو وبعدها طلوع مباشر — احجزوا أول موعد دخول، لأن القصر ممر باتجاه واحد والممرات تنزحم.", category: "sight", priceBand: 2, startTime: "09:30" },
    { name: "Castelo dos Mouros", nameAr: "قلعة المورو", why: "Ninth-century Moorish walls running along the ridge — walk them to the far tower, where almost nobody bothers to go.", whyAr: "أسوار مغاربية من القرن التاسع تمتد على الحافة — امشوها لين البرج البعيد، وين بالكاد أحد يكلف نفسه.", category: "sight", priceBand: 1, startTime: "12:00" },
    { name: "Quinta da Regaleira", nameAr: "كينتا دا ريغاليرا", why: "Go down the initiation well rather than up it — the spiral is dark, and coming out at the bottom into the grotto is the trick of the place.", whyAr: "انزلوا بئر التدشين بدل ما تطلعونه — الحلزون معتم، والطلعة من تحت للكهف هي حيلة المكان.", category: "sight", priceBand: 2, startTime: "14:30" },
    { name: "Piriquita", nameAr: "مخبز بيريكيتا", why: "Two doors on the same street, same family since 1862 — the travesseiro, a folded pastry filled with almond and egg cream, is the one to order, warm, and only here.", whyAr: "بابين بنفس الشارع، ونفس العائلة من ١٨٦٢ — اطلبوا «ترافيسيرو»، معجنة مطوية محشية لوز وكريمة بيض، وهي سخنة، وما تلقونها إلا هنا.", category: "food", priceBand: 1, startTime: "17:00", dietary: ["vegetarian"] },
  ],
};

const CASCAIS_DAYTRIP: CuratedDay = {
  key: "cascais-daytrip",
  title: "The coast road to Cascais",
  titleAr: "طريق الساحل إلى كاشكايش",
  places: [
    { name: "Cabo da Roca", nameAr: "رأس روكا", why: "The westernmost point of mainland Europe, and the wind proves it — hold onto anything loose, including the children.", whyAr: "أقصى نقطة غربية ببر أوروبا، والهوا يثبت ذلك — امسكوا كل شي خفيف، وبضمنهم العيال.", category: "nature", priceBand: 0, startTime: "10:00" },
    { name: "Praia do Guincho", nameAr: "شاطئ غينشو", why: "An open Atlantic beach with dunes behind it and the Sintra hills at one end — too rough to swim, perfect to walk.", whyAr: "شاطئ أطلسي مفتوح وخلفه كثبان وبطرفه تلال سينترا — الموج أقوى من السباحة، ومثالي للمشي.", category: "nature", priceBand: 0, startTime: "11:30" },
    { name: "Boca do Inferno", nameAr: "بوكا دو إنفيرنو", why: "A collapsed sea cave the swell drives straight into — come with a rough sea, not a calm one, or there's nothing to see.", whyAr: "كهف بحري منهار يدخله الموج مباشرة — تعالوا والبحر هايج مو هادي، وإلا ما في شي يتشاف.", category: "nature", priceBand: 0, startTime: "13:30" },
    { name: "Cascais old town", nameAr: "بلدة كاشكايش القديمة", why: "A fishing town the Portuguese court moved to for the summer — the lanes behind the marina are still the town, not the resort.", whyAr: "بلدة صيد انتقل لها البلاط البرتغالي بالصيف — الأزقة خلف المارينا لا تزال البلدة نفسها، مو المنتجع.", category: "walk", priceBand: 1, startTime: "15:00" },
  ],
};

const DOURO_DAYTRIP: CuratedDay = {
  key: "douro-daytrip",
  title: "The Douro line to Pinhão",
  titleAr: "خط الدورو إلى بينياو",
  places: [
    { name: "Pinhão railway station", nameAr: "محطة قطار بينياو", why: "The last hour of the train from São Bento runs on the water's edge — sit on the right going out, and the station itself is tiled with the harvest.", whyAr: "آخر ساعة من قطار ساو بينتو تمشي على حافة الماي — اقعدوا على اليمين بالذهاب، والمحطة نفسها مبلّطة بمشاهد الحصاد.", category: "sight", priceBand: 1, startTime: "11:00" },
    { name: "Douro river boat from Pinhão", nameAr: "قارب الدورو من بينياو", why: "An hour on a flat-bottomed rabelo from the village quay — the terraces only make sense from the water, which is where they were cut to be seen from.", whyAr: "ساعة بقارب «رابيلو» مسطح من رصيف القرية — المدرجات ما تفهمونها إلا من الماي، ومن الماي قُطعت عشان تنشاف.", category: "nature", priceBand: 2, startTime: "12:30" },
    { name: "Miradouro de Casal de Loivos", nameAr: "مطل كازال دي لويفوش", why: "A ten-minute drive up the hillside behind the village for the view every photograph of this valley is taken from.", whyAr: "عشر دقايق بالسيارة فوق المنحدر خلف القرية، للإطلالة اللي تنتصور منها كل صور هالوادي.", category: "nature", priceBand: 0, startTime: "15:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const IBERIA_BASES: Record<BaseId, Base> = {
  lisbon: {
    id: "lisbon",
    name: "Lisbon",
    nameAr: "لشبونة",
    country: "PT",
    lat: 38.7223,
    lng: -9.1393,
    photoQuery: "Lisbon Portugal Alfama tram viewpoint",
    match: ["lisbon", "lisboa", "portugal", "لشبونة", "لشبونه", "البرتغال"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["sintra", "cascais"],
    pairsWith: ["porto"],
    days: LISBON_DAYS,
  },
  porto: {
    id: "porto",
    name: "Porto",
    nameAr: "بورتو",
    country: "PT",
    lat: 41.1579,
    lng: -8.6291,
    photoQuery: "Porto Portugal Ribeira Douro bridge",
    match: ["porto", "oporto", "بورتو"],
    typicalNights: 3,
    maxNights: 3,
    reachable: ["douro_valley"],
    pairsWith: ["lisbon"],
    days: PORTO_DAYS,
  },

  /* day-trip bases */
  sintra: {
    id: "sintra",
    name: "Sintra",
    nameAr: "سينترا",
    country: "PT",
    lat: 38.7979,
    lng: -9.3907,
    photoQuery: "Sintra Portugal Pena Palace",
    match: ["sintra", "سينترا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: SINTRA_DAYTRIP,
  },
  cascais: {
    id: "cascais",
    name: "Cascais",
    nameAr: "كاشكايش",
    country: "PT",
    lat: 38.6968,
    lng: -9.4215,
    photoQuery: "Cascais Portugal coast Cabo da Roca",
    match: ["cascais", "كاشكايش", "كاسكايش"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: CASCAIS_DAYTRIP,
  },
  douro_valley: {
    id: "douro_valley",
    name: "Douro Valley",
    nameAr: "وادي الدورو",
    country: "PT",
    lat: 41.1906,
    lng: -7.5453,
    photoQuery: "Douro Valley Portugal terraces Pinhao river",
    match: ["douro", "pinhao", "pinhão", "الدورو", "وادي الدورو"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: DOURO_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const IBERIA_ROUTES: Route[] = [
  {
    id: "portugal-lisbon",
    match: ["portugal", "lisbon", "lisboa", "البرتغال", "لشبونة"],
    title: "Lisbon, and what's around it",
    titleAr: "لشبونة وما حولها",
    subtitle: "One hotel, with Sintra and the coast as day trips",
    subtitleAr: "فندق واحد، وسينترا والساحل طلعات يوم",
    provenance: "Sintra and Cascais are both under an hour by train — moving hotels for them costs a day and buys nothing.",
    provenanceAr: "سينترا وكاشكايش أقل من ساعة بالقطار — تغيير الفندق عشانهم يكلفكم يوم وما يجيب شي.",
    forWho: "Your first time in Portugal.",
    forWhoAr: "أول زيارة للبرتغال.",
    legs: [{ baseId: "lisbon", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "portugal-classic",
    match: ["portugal", "lisbon", "lisboa", "porto", "oporto", "البرتغال", "لشبونة", "بورتو"],
    title: "The classic Portugal route",
    titleAr: "المسار الكلاسيكي للبرتغال",
    subtitle: "Lisbon → Porto",
    subtitleAr: "لشبونة ← بورتو",
    provenance: "Two cities and one train between them — the whole country's north–south axis in under three hours.",
    provenanceAr: "مدينتين وقطار واحد بينهم — محور البلد كله من الجنوب للشمال بأقل من ثلاث ساعات.",
    forWho: "A week or more, and you want both cities.",
    forWhoAr: "أسبوع أو أكثر، وتبون المدينتين.",
    legs: [
      { baseId: "lisbon", nightsRatio: 4 },
      { baseId: "porto", nightsRatio: 3 },
    ],
    transport: [{ from: "lisbon", to: "porto", mode: "train", minutes: 170 }],
    minNights: 7,
  },
];

export const IBERIA: Region = { bases: IBERIA_BASES, routes: IBERIA_ROUTES };

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte including
 * diacritics, because the string is the lookup key. [lat, lng], four
 * decimals, pointing at the venue rather than the city. Where the library
 * names a street, district or stretch, the pin is that street.
 */
export const IBERIA_COORDS: Record<string, readonly [number, number]> = {
  /* Lisbon */
  "Miradouro das Portas do Sol": [38.7121, -9.1305],
  "Alfama backstreets": [38.7118, -9.1285],
  "Chapitô à Mesa": [38.7124, -9.1339],
  "Mosteiro dos Jerónimos": [38.6979, -9.2064],
  "Pastéis de Belém": [38.6975, -9.2032],
  "Belém Tower": [38.6916, -9.216],
  MAAT: [38.6955, -9.1946],
  "Praça do Comércio": [38.7075, -9.1366],
  "Convento do Carmo": [38.7118, -9.1406],
  "Time Out Market": [38.7071, -9.1455],
  "Miradouro de São Pedro de Alcântara": [38.7155, -9.1443],
  "Oceanário de Lisboa": [38.7633, -9.0938],
  "Senhor Peixe": [38.771, -9.0925],
  "Telecabine Lisboa": [38.7639, -9.0939],
  "Parque das Nações riverside": [38.768, -9.0935],
  "Castelo de São Jorge": [38.7139, -9.1335],
  "Feira da Ladra": [38.7153, -9.1247],
  Mouraria: [38.7157, -9.1357],
  "Miradouro da Senhora do Monte": [38.7168, -9.132],

  /* Sintra */
  "Palácio Nacional da Pena": [38.7876, -9.3905],
  "Castelo dos Mouros": [38.7924, -9.3893],
  "Quinta da Regaleira": [38.7963, -9.3963],
  Piriquita: [38.7976, -9.3897],

  /* Cascais */
  "Cabo da Roca": [38.7803, -9.4989],
  "Praia do Guincho": [38.7326, -9.472],
  "Boca do Inferno": [38.6925, -9.4288],
  "Cascais old town": [38.6979, -9.4215],

  /* Porto */
  Ribeira: [41.1408, -8.6132],
  "Palácio da Bolsa": [41.1414, -8.6153],
  "Ponte Luís I upper deck": [41.1396, -8.6093],
  "Mercado Beira-Rio": [41.1369, -8.6162],
  "São Bento railway station": [41.1456, -8.6107],
  "Livraria Lello": [41.147, -8.6148],
  "Torre dos Clérigos": [41.1456, -8.6142],
  "Mercado do Bolhão": [41.1497, -8.6069],
  "Jardins do Palácio de Cristal": [41.149, -8.6272],
  "Tram 1 along the Douro": [41.1409, -8.6162],
  "Farol de Felgueiras": [41.1477, -8.6805],
  "Rua Heróis de França": [41.1831, -8.6933],

  /* Douro */
  "Pinhão railway station": [41.1906, -7.5453],
  "Douro river boat from Pinhão": [41.1899, -7.5462],
  "Miradouro de Casal de Loivos": [41.1989, -7.531],
};
