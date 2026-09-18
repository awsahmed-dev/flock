/**
 * The Gulf region — the trips people here actually take.
 *
 * Three destinations, three different reasons to go: the UAE because it is a
 * short hop and works with children, AlUla because it is the one place in the
 * Kingdom that rewards a whole trip rather than a stop, and Salalah because
 * for three months of the year it is the only green mountain most Gulf
 * families can drive to.
 *
 * Same discipline as `library.ts`. A base owns its days; `maxNights` never
 * exceeds the number of day shapes written for it, so a stretched trip runs
 * out of ceiling instead of running out of content. Where a fifth honest day
 * could not be written, the ceiling came down. Day-trip bases — Al Ain,
 * Khaybar, Mirbat — carry one `dayTrip` shape and no stay, because nobody
 * sleeps there and pretending otherwise is how blank days get made.
 *
 * `GULF_COORDS` below carries a hand-checked pin for every place name here
 * that could be confirmed against a real mapped venue. A handful could not be,
 * and are simply absent: a missing pin is honest, a wrong one is not.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Dubai ─────────────────────────────────────────────────────────────── */

const DUBAI_DAYS: CuratedDay[] = [
  {
    key: "dubai-creek",
    title: "Old Dubai, both banks",
    titleAr: "دبي القديمة… الضفتين",
    places: [
      { name: "Al Fahidi Historical Neighbourhood", nameAr: "حي الفهيدي التاريخي", why: "Wind-tower lanes barely wide enough for two people — go before ten, while the coral-stone walls are still throwing shade.", whyAr: "أزقة البراجيل بالكاد تسع شخصين — روحوا قبل العاشرة وجدران الحجر البحري لسا ترمي ظل.", category: "sight", priceBand: 0, startTime: "09:00" },
      { name: "Abra across Dubai Creek", nameAr: "عبرة عبر خور دبي", why: "One dirham each way on a wooden boat nobody has seen a reason to modernise — you pay the man on board, not on the dock.", whyAr: "درهم واحد بالاتجاه على قارب خشب ما أحد لقى سبب يطوره — تدفعون للمعلم داخل القارب مو على الرصيف.", category: "walk", priceBand: 0, startTime: "11:00" },
      { name: "Deira Gold Souk", nameAr: "سوق الذهب بديرة", why: "Ask the price by the gram and the making charge separately — that is how everyone who lives here buys it, and the spice souk is two lanes over.", whyAr: "اسألوا على سعر الجرام والمصنعية كل وحدة لحالها — كذا يشتري كل اللي عايش هنا، وسوق التوابل على بعد زقاقين.", category: "shop", priceBand: 2, startTime: "11:45" },
      { name: "Al Seef", nameAr: "السيف", why: "The heritage strip on the water: machboos and grilled hammour at tables a metre from the creek, with the abras cutting across in front of you. It only works after dark.", whyAr: "الشريط التراثي على الماء: مجبوس وهامور مشوي على طاولات على بعد متر من الخور، والعبرات تقطع قدامكم. وما يشتغل إلا بعد المغرب.", category: "food", priceBand: 2, startTime: "17:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "dubai-downtown",
    title: "Downtown, top to bottom",
    titleAr: "وسط المدينة… من فوق لتحت",
    places: [
      { name: "Dubai Frame", nameAr: "برواز دبي", why: "Stand on the glass floor at the top and the two halves of the city line up exactly — old Dubai behind you, new Dubai in front.", whyAr: "اوقفوا على الأرضية الزجاجية فوق وبتلقون نصفي المدينة على استقامة وحدة — دبي القديمة خلفكم والجديدة قدامكم.", category: "sight", priceBand: 1, startTime: "09:30" },
      { name: "Al Hallab Restaurant & Sweets", nameAr: "مطعم وحلويات الحلاب", why: "Lebanese mezze and a charcoal mixed grill, then knafeh soaked in orange-blossom syrup — ask for a terrace table facing the fountain lake, and you eat with the Burj in front of you.", whyAr: "مزّات لبنانية ومشاوي على الفحم، وبعدها كنافة مغمورة بقطر ماء الزهر — اطلبوا طاولة بالشرفة المطلة على بحيرة النافورة، وبتاكلون والبرج قدامكم.", category: "food", priceBand: 2, startTime: "12:30", dietary: ["halal"] },
      { name: "Burj Khalifa", nameAr: "برج خليفة", why: "Book the slot that starts an hour before Maghrib: you go up in daylight and come down after the whole city has switched on.", whyAr: "احجزوا الموعد اللي يبدأ قبل المغرب بساعة: تطلعون والدنيا نهار وتنزلون والمدينة كلها مضوية.", category: "sight", priceBand: 3, startTime: "17:00" },
      { name: "The Dubai Fountain", nameAr: "نافورة دبي", why: "Watch from the bridge to Souk Al Bahar rather than the mall terrace — same show, no crush, and you can actually hear the music.", whyAr: "شوفوها من الجسر اللي يودي سوق البحار مو من شرفة المول — نفس العرض وبدون زحمة، وتسمعون الموسيقى فعلًا.", category: "sight", priceBand: 0, startTime: "19:00" },
    ],
  },
  {
    key: "dubai-jumeirah",
    title: "Jumeirah, mosque to souk",
    titleAr: "جميرا… من الجامع للسوق",
    places: [
      { name: "Jumeirah Mosque", nameAr: "مسجد جميرا", why: "One of the few mosques in the city open to visitors all morning — the white stone is at its best before the sun clears the minarets.", whyAr: "من المساجد القليلة بالمدينة اللي تفتح للزوار طول الصبح — والحجر الأبيض بأحلى حالاته قبل ما تعلى الشمس فوق المآذن.", category: "sight", priceBand: 0, startTime: "09:30" },
      { name: "Etihad Museum", nameAr: "متحف الاتحاد", why: "Built over the house where the union was signed in 1971 — the seven pens in the last room are the actual pens.", whyAr: "مبني فوق البيت اللي وُقّع فيه الاتحاد سنة ١٩٧١ — والأقلام السبعة بآخر قاعة هي نفسها الأصلية.", category: "sight", priceBand: 1, startTime: "11:30" },
      { name: "Kite Beach", nameAr: "كايت بيتش", why: "Come at four when the sand has cooled — Burj Al Arab stands at the end of the beach and nobody charges you to look at it.", whyAr: "تعالوا الساعة أربع لما يبرد الرمل — برج العرب واقف بآخر الشاطئ وما أحد ياخذ منكم فلوس عشان تشوفونه.", category: "nature", priceBand: 0, startTime: "16:30" },
      { name: "Bu Qtair Fish Restaurant", nameAr: "مطعم بو قطير", why: "A fishermen's shack by the harbour: you pick the hammour or the kingfish off the tray, they fry it in masala batter and hand it over with rice and paratha — plastic tables on the sand, and a queue from six.", whyAr: "كشك صيادين عند الميناء: تختارون الهامور أو الكنعد من الصينية، ويقلونه بخلطة مسالا ويعطونكم إياه مع رز وبراتا — طاولات بلاستيك على الرمل، والطابور يبدأ من الساعة ستة.", category: "food", priceBand: 1, startTime: "18:30", dietary: ["halal", "seafood"] },
    ],
  },
  {
    key: "dubai-palm",
    title: "The Palm and the marina",
    titleAr: "النخلة والمارينا",
    places: [
      { name: "The View at The Palm", nameAr: "ذا فيو آت ذا بالم", why: "Fifty-two floors up is where the palm shape finally makes sense — from the ground it just looks like more coast.", whyAr: "من الطابق ٥٢ بس يبان شكل النخلة؛ من تحت تحسونه مجرد ساحل زيادة.", category: "sight", priceBand: 2, startTime: "10:00" },
      { name: "Atlantis The Palm", nameAr: "أتلانتس النخلة", why: "The Lost Chambers aquarium is walk-in and takes an hour; the waterpark takes the whole day — pick one before you get in the car.", whyAr: "أكواريوم الغرف المفقودة دخوله مباشر وياخذ ساعة؛ أما المدينة المائية فتاخذ اليوم كله — اختاروا وحدة قبل ما تركبون السيارة.", category: "sight", priceBand: 3, startTime: "12:30" },
      { name: "Dubai Marina Walk", nameAr: "ممشى مرسى دبي", why: "Seven kilometres of promenade under the towers — walk the stretch between the mall and the yacht club and turn back, that's the good part.", whyAr: "سبعة كيلو ممشى تحت الأبراج — امشوا المقطع بين المول ونادي اليخوت وارجعوا، هذا أحلى جزء فيه.", category: "walk", priceBand: 0, startTime: "16:30" },
      { name: "The Walk at JBR", nameAr: "ذا ووك بجي بي آر", why: "Shawarma, mixed grills and juice at pavement tables from November to March, which is when Dubai eats outdoors — the tables on the sand side go first, so send someone ahead.", whyAr: "شاورما ومشاوي مشكلة وعصيرات على طاولات الرصيف من نوفمبر لمارس، وهي الفترة اللي تتعشى فيها دبي برا — طاولات جهة الرمل تروح أول، فقدّموا واحد منكم.", category: "food", priceBand: 2, startTime: "18:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "dubai-dubailand",
    title: "Dubailand, for the kids",
    titleAr: "دبي لاند… للعيال",
    places: [
      { name: "Dubai Miracle Garden", nameAr: "حديقة المعجزة دبي", why: "Forty-five million flowers in open desert, and it only opens November to May — go at nine, before the heat and the coaches.", whyAr: "خمسة وأربعين مليون زهرة بقلب الصحرا، وما تفتح إلا من نوفمبر لمايو — روحوا الساعة تسع قبل الحر والباصات.", category: "nature", priceBand: 2, startTime: "09:30" },
      { name: "IMG Worlds of Adventure", nameAr: "آي إم جي عالم من المغامرات", why: "The largest indoor theme park there is, which in this city is the whole point — it is the same temperature in August as in January.", whyAr: "أكبر مدينة ألعاب مغلقة بالعالم، وهذي فايدتها بهالمدينة — نفس الجو بأغسطس ونفسه بيناير.", category: "sight", priceBand: 3, startTime: "13:00" },
      { name: "Global Village", nameAr: "القرية العالمية", why: "Ninety country pavilions and the food is the real reason: Afghan mantu, Yemeni mandi, Turkish gözleme, one plate from each as you walk — come on a weeknight, weekend parking alone costs you an hour.", whyAr: "تسعين جناح دولة، والأكل هو السبب الحقيقي: منتو أفغاني، ومندي يمني، وجوزلمه تركية، صحن من كل جناح وأنتم ماشين — تعالوا يوم أسبوع، لأن مواقف الويكند لحالها تاخذ ساعة.", category: "food", priceBand: 1, startTime: "18:00", dietary: ["halal-friendly"] },
    ],
  },
];

/* ── Abu Dhabi ─────────────────────────────────────────────────────────── */

const ABU_DHABI_DAYS: CuratedDay[] = [
  {
    key: "abudhabi-mosque",
    title: "The mosque, the palace, the corniche",
    titleAr: "الجامع والقصر والكورنيش",
    places: [
      { name: "Sheikh Zayed Grand Mosque", nameAr: "جامع الشيخ زايد الكبير", why: "Come for Fajr and stay as the light comes up — the marble changes colour, and the courtyard is yours until visitor hours start at nine.", whyAr: "تعالوا لصلاة الفجر واقعدوا لين يطلع الضوء — الرخام يتغير لونه، والصحن كله لكم قبل ما تبدأ ساعات الزيارة التاسعة.", category: "sight", priceBand: 0, startTime: "05:30" },
      { name: "Qasr Al Watan", nameAr: "قصر الوطن", why: "A working presidential palace that opens its state rooms — the Great Hall's dome is thirty-seven metres and they let you stand directly under the middle of it.", whyAr: "قصر رئاسي شغّال يفتح قاعاته الرسمية — قبة القاعة الكبرى سبعة وثلاثين متر ويخلونكم توقفون تحت نصها بالضبط.", category: "sight", priceBand: 2, startTime: "10:30" },
      { name: "Bait El Khetyar", nameAr: "مطعم بيت الختيار", why: "Lebanese mezze laid down twenty plates at a time and a charcoal mixed grill after it — order the arayes and the fattoush, and leave room, they keep bringing bread.", whyAr: "مزّات لبنانية تنزل عشرين صحن دفعة وحدة وبعدها مشاوي مشكلة على الفحم — اطلبوا العرايس والفتوش، وخلّوا مكان، الخبز ما يوقف.", category: "food", priceBand: 2, startTime: "13:00", dietary: ["halal"] },
      { name: "Corniche Family Beach", nameAr: "شاطئ العائلات بالكورنيش", why: "Eight kilometres of Corniche with one fenced family section in the middle — a few dirhams gets you loungers, showers and lifeguards.", whyAr: "ثمانية كيلو كورنيش وبنصه قسم عائلي مسوّر — بكم درهم تلقون كراسي ودشات ومنقذين.", category: "nature", priceBand: 1, startTime: "17:30" },
    ],
  },
  {
    key: "abudhabi-saadiyat",
    title: "Saadiyat: art, then sand",
    titleAr: "السعديات… فن وبعدين رمل",
    places: [
      { name: "Louvre Abu Dhabi", nameAr: "اللوفر أبوظبي", why: "Stand under the dome around midday and the 'rain of light' does exactly what the architect promised it would.", whyAr: "اوقفوا تحت القبة وقت الظهر و«مطر الضوء» يسوي بالضبط اللي وعد فيه المعماري.", category: "sight", priceBand: 2, startTime: "09:30" },
      { name: "Manarat Al Saadiyat", nameAr: "منارة السعديات", why: "Free, cold, and the exhibitions turn over every few weeks — this is where you sit out the worst two hours of the afternoon.", whyAr: "مجاني وبارد والمعارض تتبدل كل كم أسبوع — هنا تقضون أسوأ ساعتين بالعصر.", category: "sight", priceBand: 0, startTime: "12:30" },
      { name: "Beirut Sur Mer", nameAr: "بيروت سور مير", why: "On the Mamsha promenade between the museums and the beach: whole fish picked off the ice and grilled, fattoush, and hot bread with sumac.", whyAr: "على ممشى السعديات بين المتاحف والشاطئ: سمك كامل تختارونه من على الثلج وينشوى قدامكم، وفتوش، وخبز سخن بالسماق.", category: "food", priceBand: 3, startTime: "14:00", dietary: ["seafood", "alcohol-served"] },
      { name: "Saadiyat Public Beach", nameAr: "شاطئ السعديات العام", why: "A protected turtle-nesting beach, so no buildings behind it — walk left from the entrance and in five minutes you are past the last umbrella.", whyAr: "شاطئ محمي لتعشيش السلاحف، فما فيه عمارات خلفه — امشوا يسار من المدخل وبخمس دقايق تتجاوزون آخر شمسية.", category: "nature", priceBand: 1, startTime: "16:00" },
    ],
  },
  {
    key: "abudhabi-yas",
    title: "Yas Island",
    titleAr: "جزيرة ياس",
    places: [
      { name: "Ferrari World Abu Dhabi", nameAr: "عالم فيراري أبوظبي", why: "Formula Rossa hits 240 km/h in under five seconds, and the queue for it is shortest in the first hour after the gates open.", whyAr: "فورمولا روسا توصل ٢٤٠ كم/س بأقل من خمس ثواني، وأقصر طابور لها بأول ساعة بعد فتح الأبواب.", category: "sight", priceBand: 3, startTime: "10:00" },
      { name: "Yas Mall", nameAr: "ياس مول", why: "Joined to the park by a covered bridge, which in Abu Dhabi in July is not a small detail.", whyAr: "موصول بالمدينة بجسر مسقوف، وهذي بأبوظبي بشهر يوليو مو تفصيلة بسيطة.", category: "shop", priceBand: 2, startTime: "15:30" },
      { name: "Dolmabahce Turkish Cuisine", nameAr: "مطعم دولمة باهتشه التركي", why: "Iskender kebab under melted butter and yoghurt, lahmacun straight off the stone, and Turkish tea after — eat here before the track opens, not at the circuit kiosks.", whyAr: "كباب إسكندر تحت الزبدة واللبن، ولحم بعجين طالع من الحجر، وشاي تركي بعده — كلوا هنا قبل ما تفتح الحلبة، مو من أكشاك الحلبة.", category: "food", priceBand: 2, startTime: "17:30", dietary: ["halal"] },
      { name: "Yas Marina Circuit", nameAr: "حلبة مرسى ياس", why: "On TrainYAS nights the Formula 1 track opens free to anyone with a bike or running shoes — the pit straight under the floodlights is what you'll remember.", whyAr: "بليالي «TrainYAS» تنفتح حلبة الفورمولا ١ مجانًا لأي أحد معه سيكل أو جزمة ركض — والمستقيم الرئيسي تحت الكشافات هو اللي بيعلق بذاكرتكم.", category: "walk", priceBand: 0, startTime: "19:00" },
    ],
  },
];

/* ── AlUla ─────────────────────────────────────────────────────────────── */

const ALULA_DAYS: CuratedDay[] = [
  {
    key: "alula-hegra",
    title: "Hegra, and the rocks after it",
    titleAr: "الحِجر… وصخور بعدها",
    places: [
      { name: "Hegra (Mada'in Salih)", nameAr: "الحِجر (مدائن صالح)", why: "One hundred and eleven tombs cut by the same hands that cut Petra — take the earliest rawi tour and you reach Qasr al-Farid before the light flattens.", whyAr: "مية وإحدى عشر مقبرة نحتتها نفس الأيدي اللي نحتت البتراء — خذوا أول جولة راوي وتوصلون قصر الفريد قبل ما يتسطح الضوء.", category: "sight", priceBand: 2, startTime: "08:30" },
      { name: "Jabal AlFil (Elephant Rock)", nameAr: "جبل الفيل", why: "Fifty metres of sandstone that genuinely does look like an elephant, and the sunken fire-pit majlises in the sand around it cost nothing to sit in.", whyAr: "خمسين متر حجر رملي وفعلًا شكله فيل، والمجالس الغائرة بالرمل حوله تقعدون فيها ببلاش.", category: "nature", priceBand: 0, startTime: "16:30" },
      { name: "AlUla Old Town", nameAr: "بلدة العلا القديمة", why: "Nine hundred mud houses packed into one block, emptied in the 1980s and lit at night now — the lanes are barely shoulder-width.", whyAr: "تسعمية بيت طين مركومة ببلوك واحد، انهجرت بالثمانينات وصارت الحين مضوية بالليل — والأزقة بالكاد بعرض كتف.", category: "walk", priceBand: 0, startTime: "18:30" },
    ],
  },
  {
    key: "alula-dadan",
    title: "Dadan and the written mountain",
    titleAr: "دادان والجبل المكتوب",
    places: [
      { name: "Dadan (Al-Khuraybah)", nameAr: "دادان (الخريبة)", why: "The lion tombs are cut high into the red cliff and viewed from a platform below — this is the one site in AlUla where binoculars earn their weight.", whyAr: "مقابر الأسود محفورة عالي بالجرف الأحمر وتشوفونها من منصة تحتها — هذا الموقع الوحيد بالعلا اللي يستاهل تحملون فيه منظار.", category: "sight", priceBand: 2, startTime: "09:00" },
      { name: "Jabal Ikmah", nameAr: "جبل عكمة", why: "An open-air library — hundreds of Dadanitic inscriptions down both walls of the canyon, and the guide will read one out in a language nobody has spoken for two thousand years.", whyAr: "مكتبة مفتوحة — مئات النقوش الدادانية على جدران الوادي من الجهتين، والمرشد بيقرأ لكم وحدة بلغة ما نطق فيها أحد من ألفين سنة.", category: "sight", priceBand: 1, startTime: "11:00" },
      { name: "AlJadidah Arts District", nameAr: "حي الجديدة للفنون", why: "Where AlUla actually eats: a lane of small kitchens and galleries a short walk from Old Town — grills, shawarma, and dates with Saudi coffee after. It only fills up once Isha is done.", whyAr: "هنا تتعشى العلا فعلًا: زقاق مطابخ صغيرة وقالريهات على مشية قصيرة من البلدة القديمة — مشاوي وشاورما، وبعدها تمر وقهوة سعودية. وما يزحم إلا بعد العشا.", category: "food", priceBand: 2, startTime: "18:30", dietary: ["halal-friendly"] },
    ],
  },
  {
    key: "alula-sharaan",
    title: "The reserve, the mirror, the stars",
    titleAr: "المحمية والمرايا والنجوم",
    places: [
      { name: "Sharaan Nature Reserve", nameAr: "محمية شرعان الطبيعية", why: "Arabian leopard country, entered only by 4x4 with a ranger — reserve the day before, they cap the number of vehicles that go in.", whyAr: "أرض النمر العربي، وما تدخلونها إلا بدفع رباعي ومع حارس — احجزوا من اليوم اللي قبل، عدد السيارات الداخلة محدود.", category: "nature", priceBand: 3, startTime: "08:00" },
      { name: "Maraya", nameAr: "مرايا", why: "The largest mirrored building on earth, and from thirty metres away it disappears into the canyon wall completely.", whyAr: "أكبر مبنى مرايا بالعالم، ومن مسافة ثلاثين متر يختفي تمامًا داخل جدار الوادي.", category: "sight", priceBand: 1, startTime: "12:00" },
      { name: "Somewhere AlUla", nameAr: "مطعم سمواير بالعلا", why: "A terrace in a palm grove below the old town: musakhan rolled with sumac and onion, batata harra with truffle, and omm ali made from croissant — eat before you drive out to the stars.", whyAr: "مصطبة بين النخل تحت البلدة القديمة: مسخّن ملفوف بالسماق والبصل، وبطاطا حارة بالكمأ، وأم علي معمولة بالكرواسون — كلوا قبل ما تطلعون للنجوم.", category: "food", priceBand: 2, startTime: "17:00", dietary: ["halal-friendly"] },
      { name: "Gharameel Nature Reserve", nameAr: "محمية الغراميل", why: "Certified dark sky: the rock pillars go black and on a moonless night you see the Milky Way with your own eyes — drive out after Isha.", whyAr: "محمية سماء مظلمة معتمدة: الأعمدة الصخرية تصير سودا، وبليلة بدون قمر تشوفون درب التبانة بعينكم — اطلعوا لها بعد العشا.", category: "nature", priceBand: 2, startTime: "19:30" },
    ],
  },
];

/* ── Salalah ───────────────────────────────────────────────────────────── */

const SALALAH_DAYS: CuratedDay[] = [
  {
    key: "salalah-frankincense",
    title: "Frankincense, from tree to port",
    titleAr: "اللبان… من الشجرة للميناء",
    places: [
      { name: "Sultan Qaboos Mosque Salalah", nameAr: "جامع السلطان قابوس بصلالة", why: "Salalah's grand mosque, and unlike the Muscat one it is never crowded — between Fajr and Dhuhr the courtyard is yours.", whyAr: "جامع صلالة الكبير، وعكس جامع مسقط ما يزحم أبد — بين الفجر والظهر الصحن كله لكم.", category: "sight", priceBand: 0, startTime: "09:00" },
      { name: "Al Haffa Souq", nameAr: "سوق الحافة", why: "Frankincense is sold by grade, not by weight — ask for hojari, the pale green kind, and make them burn a piece before you buy any of it.", whyAr: "اللبان ينباع بالدرجة مو بالوزن — اطلبوا الحوجري، الأخضر الفاتح، وخلّوهم يبخّرون قطعة قدامكم قبل ما تشترون.", category: "shop", priceBand: 1, startTime: "11:00" },
      { name: "Bin Ateeq Restaurant", nameAr: "مطعم بن عتيق", why: "Omani food eaten on the floor of your own curtained room — order the shuwa, lamb buried and slow-cooked for a day, with maqbous rice under it.", whyAr: "أكل عُماني تاكلونه على الأرض بغرفة مستقلة بستارة — اطلبوا الشواء، لحم مدفون ومطبوخ يوم كامل، وتحته رز مقبوس.", category: "food", priceBand: 1, startTime: "13:00", dietary: ["halal"] },
      { name: "Al Baleed Archaeological Park", nameAr: "منتزه البليد الأثري", why: "The ruined port that shipped all of it, and in summer it only opens at four — walk the ramparts at dusk and leave the museum for after dark.", whyAr: "الميناء الخرب اللي كان يصدّره كله، وبالصيف ما يفتح إلا الساعة أربع — امشوا على الأسوار وقت المغرب وخلّوا المتحف بعد الظلام.", category: "sight", priceBand: 1, startTime: "16:30" },
    ],
  },
  {
    key: "salalah-khareef",
    title: "The khareef, east of town",
    titleAr: "الخريف… شرق البلد",
    places: [
      { name: "Ain Razat", nameAr: "عين رزات", why: "A spring running out of the cliff into a garden — in khareef the whole hill behind it is green, which is the reason half the Gulf is here in August.", whyAr: "عين طالعة من الجرف لداخل حديقة — وبالخريف الجبل كله خلفها أخضر، وهذا سبب وجود نص الخليج هنا بأغسطس.", category: "nature", priceBand: 0, startTime: "08:30" },
      { name: "Wadi Darbat", nameAr: "وادي دربات", why: "The waterfalls only run from late June to September — outside khareef it is a lake with camels standing in it, which is worth the drive anyway.", whyAr: "الشلالات ما تجري إلا من آخر يونيو لسبتمبر — وبغير الخريف تلقونها بحيرة والنياق واقفة فيها، وبرضه تستاهل الطريق.", category: "nature", priceBand: 0, startTime: "10:30" },
      { name: "Tawi Attair sinkhole", nameAr: "طوي أعتير", why: "A 211-metre hole in the plateau with birds nesting the whole way down — stay on the platform and hold on to your phone.", whyAr: "حفرة بعمق ٢١١ متر بالهضبة والطيور معششة على طولها — الزموا المنصة وامسكوا جوالاتكم زين.", category: "nature", priceBand: 0, startTime: "13:30" },
      { name: "Taqah Castle", nameAr: "قلعة طاقة", why: "A 19th-century sheikh's house restored room by room — twenty minutes inside explains how everyone in Dhofar lived before oil.", whyAr: "بيت شيخ من القرن التاسع عشر مرمّم غرفة غرفة — عشرين دقيقة جوّاه تشرح لكم كيف كان عايش أهل ظفار قبل النفط.", category: "sight", priceBand: 1, startTime: "16:30" },
    ],
  },
  {
    key: "salalah-mughsail",
    title: "West, to the blowholes",
    titleAr: "غربًا… إلى النافورات",
    places: [
      { name: "Al Mughsail beach", nameAr: "شاطئ المغسيل", why: "Forty minutes west of the city: white sand under a black cliff, and on a weekday there is almost nobody on it.", whyAr: "أربعين دقيقة غرب المدينة: رمل أبيض تحت جرف أسود، وبيوم أسبوع بالكاد تلقون أحد عليه.", category: "nature", priceBand: 0, startTime: "09:30" },
      { name: "Marneef Cave", nameAr: "كهف المرنيف", why: "The blowholes fire hardest in the hour either side of high tide — check the tide table before you drive out or you get a damp hiss and a photo of a hole.", whyAr: "النافورات تطلع بأقواها بساعة قبل المد وساعة بعده — شوفوا جدول المد قبل ما تطلعون، وإلا بتلقون مجرد فشّة رطبة وصورة حفرة.", category: "sight", priceBand: 0, startTime: "11:00" },
      { name: "Mughsayl Beach Restaurant", nameAr: "مطعم شاطئ المغسيل", why: "The only kitchen on this whole stretch of coast: kingfish grilled over coals with rice and lemon, at plastic tables a hundred metres from the blowholes.", whyAr: "المطبخ الوحيد على هالساحل كله: كنعد مشوي على الفحم مع رز وليمون، وطاولات بلاستيك على بعد مية متر من النافورات.", category: "food", priceBand: 1, startTime: "12:30", dietary: ["halal", "seafood"] },
      { name: "Fazayah Beach", nameAr: "شاطئ فزايه", why: "Down a hairpin track past Mughsail — 4x4 only, no shade, no shop, and the best beach in Dhofar by a distance.", whyAr: "نزلة لفات بعد المغسيل — دفع رباعي بس، ولا ظل ولا دكان، وأحلى شاطئ بظفار بفارق واضح.", category: "nature", priceBand: 0, startTime: "15:00" },
    ],
  },
  {
    key: "salalah-ittin",
    title: "Up the jebel, then the marina",
    titleAr: "طلعة الجبل… وبعدها المارينا",
    places: [
      { name: "Job's Tomb (Nabi Ayoub)", nameAr: "ضريح النبي أيوب", why: "On a hilltop thirty kilometres above the city, and in khareef the drive up through the cloud is half the reason to go.", whyAr: "على رأس تلة ثلاثين كيلو فوق المدينة، وبالخريف تكون الطلعة نفسها وأنتم تخترقون الضباب نص السبب.", category: "sight", priceBand: 0, startTime: "09:00" },
      { name: "Wadi Dawkah", nameAr: "وادي دوكة", why: "Five thousand frankincense trees in a dry valley on the Thumrait road — scratch a trunk and the resin beads up white in front of you.", whyAr: "خمسة آلاف شجرة لبان بوادي جاف على طريق ثمريت — اخدشوا جذع وبيطلع الصمغ أبيض قدامكم.", category: "nature", priceBand: 1, startTime: "12:00" },
      { name: "Hawana Salalah", nameAr: "حوانا صلالة", why: "The marina end of town: grilled kingfish and mishkak skewers off the coals on the boardwalk — the only part of Salalah still awake and busy after ten at night.", whyAr: "طرف المدينة عند المارينا: كنعد مشوي ومشاكيك من على الجمر على الممشى الخشبي — والجزء الوحيد بصلالة اللي لسا صاحي ويزحم بعد العشر بالليل.", category: "food", priceBand: 2, startTime: "17:00", dietary: ["unverified"] },
    ],
  },
];

/* ── Gulf: day-trip shapes ─────────────────────────────────────────────── */

const AL_AIN_DAYTRIP: CuratedDay = {
  key: "al-ain-daytrip",
  title: "Al Ain in a day",
  titleAr: "العين بيوم",
  places: [
    { name: "Al Ain Oasis", nameAr: "واحة العين", why: "Ninety minutes inland to 147,000 date palms watered by a falaj that has been running for three thousand years — the shaded walkways are ten degrees cooler than the car park.", whyAr: "ساعة ونص للداخل وتلقون ١٤٧ ألف نخلة تسقيها فلجة شغالة من ثلاثة آلاف سنة — والممرات المظللة أبرد بعشر درجات من الموقف.", category: "nature", priceBand: 0, startTime: "09:30" },
    { name: "Al Jahili Fort", nameAr: "قلعة الجاهلي", why: "Mud brick from 1891, and the permanent Thesiger photography room inside is free and much better than that sounds.", whyAr: "طين وطوب من ١٨٩١، وغرفة صور ثيسيجر الدائمة جوّاها مجانية وأحلى بكثير مما يوحي الوصف.", category: "sight", priceBand: 0, startTime: "11:30" },
    { name: "Green Mubazzarah", nameAr: "المبزرة الخضراء", why: "Hot springs at the foot of the mountain where Emirati families spread carpets on the grass from four o'clock onwards — bring your own and join in.", whyAr: "عيون حارة عند سفح الجبل والعوايل الإماراتية تفرش على العشب من الساعة أربع وطالع — خذوا فرشتكم واقعدوا معهم.", category: "rest", priceBand: 0, startTime: "16:00" },
    { name: "Jebel Hafeet", nameAr: "جبل حفيت", why: "Twelve kilometres of switchbacks up to 1,240 metres — time it for sunset and stop at the upper car park, not the hotel at the summit.", whyAr: "اثنا عشر كيلو لفات لين ارتفاع ١٢٤٠ متر — رتبوها على الغروب وقفوا بالمواقف العليا مو عند فندق القمة.", category: "nature", priceBand: 0, startTime: "17:30" },
  ],
};

const KHAYBAR_DAYTRIP: CuratedDay = {
  key: "khaybar-daytrip",
  title: "Khaybar in a day",
  titleAr: "خيبر بيوم",
  places: [
    { name: "Khaybar Old Town", nameAr: "بلدة خيبر القديمة", why: "Two and a half hours south of AlUla: a black basalt village on the edge of a lava field, emptied last century and mostly still standing.", whyAr: "ساعتين ونص جنوب العلا: قرية بازلت أسود على طرف حرّة بركانية، انهجرت القرن الماضي ولسا أغلبها واقف.", category: "sight", priceBand: 0, startTime: "10:30" },
    { name: "Al-Qamus Fort", nameAr: "حصن القموص", why: "The fort on the ridge above the palms — climb it for the view down over the oasis, which is the whole reason this place was ever worth holding.", whyAr: "الحصن على الحرّة فوق النخل — اطلعوه عشان الإطلالة على الواحة، وهي نفسها سبب إن المكان كان يستاهل الإمساك فيه.", category: "sight", priceBand: 0, startTime: "12:30" },
    { name: "Harrat Khaybar", nameAr: "حرّة خيبر", why: "One of the biggest lava fields in Arabia, with a white volcano sitting in the middle of all the black — you need a 4x4 and a driver who knows the track.", whyAr: "من أكبر حقول الحمم بالجزيرة، وبنص السواد كله بركان أبيض — تحتاجون دفع رباعي وسواق يعرف الدرب.", category: "nature", priceBand: 2, startTime: "15:30" },
  ],
};

const MIRBAT_DAYTRIP: CuratedDay = {
  key: "mirbat-daytrip",
  title: "Mirbat in a day",
  titleAr: "مرباط بيوم",
  places: [
    { name: "Khor Rori (Sumhuram)", nameAr: "خور روري (سمهرم)", why: "They call it the Queen of Sheba's port; what is certain is that the creek behind the ruins fills with flamingos and you look straight down on them.", whyAr: "يسمونه ميناء ملكة سبأ؛ والمؤكد إن الخور خلف الأطلال يمتلئ بالفلامنجو وأنتم تطلون عليه مباشرة.", category: "sight", priceBand: 1, startTime: "09:30" },
    { name: "Bin Ali's Tomb", nameAr: "ضريح بن علي", why: "Two white sugarloaf domes standing alone on the plain before the town — the shape is purely Dhofari and you will not see it anywhere else in Oman.", whyAr: "قبتين بيضاويتين بشكل مخروط واقفتين لحالهما بالسهل قبل البلد — الشكل ظفاري خالص وما بتشوفونه بمكان ثاني بعمان.", category: "sight", priceBand: 0, startTime: "12:00" },
    { name: "Mirbat Castle", nameAr: "حصن مرباط", why: "A small fort over an old harbour of merchant houses with carved doors — the town is half ruin and half lived in, and nobody minds you walking through it.", whyAr: "حصن صغير فوق ميناء قديم وبيوت تجار بأبواب منقوشة — البلدة نص خراب ونص مسكونة، وما أحد يمانع تتمشون فيها.", category: "walk", priceBand: 0, startTime: "13:30" },
    { name: "Jabal Samhan viewpoint", nameAr: "مطل جبل سمحان", why: "The escarpment road climbs to 1,800 metres in about twenty minutes, and from the edge you are looking straight down onto Mirbat and the sea.", whyAr: "طريق الجرف يطلع ١٨٠٠ متر بعشرين دقيقة تقريبًا، ومن الحافة تطلون على مرباط والبحر مباشرة تحتكم.", category: "nature", priceBand: 0, startTime: "16:00" },
  ],
};

/* ── The bases ─────────────────────────────────────────────────────────── */

const GULF_BASES: Record<BaseId, Base> = {
  dubai: {
    id: "dubai",
    name: "Dubai",
    nameAr: "دبي",
    country: "AE",
    lat: 25.2048,
    lng: 55.2708,
    photoQuery: "Dubai UAE Burj Khalifa skyline",
    match: ["dubai", "دبي", "uae", "الإمارات", "الامارات"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["al_ain"],
    pairsWith: ["abu_dhabi"],
    days: DUBAI_DAYS,
  },
  abu_dhabi: {
    id: "abu_dhabi",
    name: "Abu Dhabi",
    nameAr: "أبوظبي",
    country: "AE",
    lat: 24.4539,
    lng: 54.3773,
    photoQuery: "Abu Dhabi Sheikh Zayed Grand Mosque",
    match: ["abu dhabi", "abudhabi", "أبوظبي", "أبو ظبي", "ابوظبي", "uae", "الإمارات"],
    typicalNights: 2,
    maxNights: 3,
    reachable: ["al_ain"],
    pairsWith: ["dubai"],
    days: ABU_DHABI_DAYS,
  },
  al_ain: {
    id: "al_ain",
    name: "Al Ain",
    nameAr: "العين",
    country: "AE",
    lat: 24.2075,
    lng: 55.7447,
    photoQuery: "Al Ain Oasis Jebel Hafeet UAE",
    match: ["al ain", "alain", "al-ain", "العين"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: AL_AIN_DAYTRIP,
  },
  alula: {
    id: "alula",
    name: "AlUla",
    nameAr: "العلا",
    country: "SA",
    lat: 26.6089,
    lng: 37.9232,
    photoQuery: "AlUla Saudi Arabia Hegra desert",
    match: ["alula", "al ula", "al-ula", "العلا", "hegra", "مدائن صالح"],
    typicalNights: 2,
    maxNights: 3,
    reachable: ["khaybar"],
    pairsWith: [],
    days: ALULA_DAYS,
  },
  khaybar: {
    id: "khaybar",
    name: "Khaybar",
    nameAr: "خيبر",
    country: "SA",
    lat: 25.6986,
    lng: 39.2925,
    photoQuery: "Khaybar Saudi Arabia oasis basalt fort",
    match: ["khaybar", "kheibar", "خيبر"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: KHAYBAR_DAYTRIP,
  },
  salalah: {
    id: "salalah",
    name: "Salalah",
    nameAr: "صلالة",
    country: "OM",
    lat: 17.0197,
    lng: 54.0897,
    photoQuery: "Salalah Oman khareef green mountains",
    match: ["salalah", "صلالة", "dhofar", "ظفار", "oman", "عُمان"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["mirbat"],
    pairsWith: [],
    days: SALALAH_DAYS,
  },
  mirbat: {
    id: "mirbat",
    name: "Mirbat",
    nameAr: "مرباط",
    country: "OM",
    lat: 16.9886,
    lng: 54.6922,
    photoQuery: "Mirbat Oman old harbour Dhofar",
    match: ["mirbat", "مرباط"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: MIRBAT_DAYTRIP,
  },
};

/* ── The routes ────────────────────────────────────────────────────────── */

const GULF_ROUTES: Route[] = [
  {
    id: "uae-classic",
    match: ["dubai", "abu dhabi", "uae", "دبي", "أبوظبي", "الإمارات", "الامارات"],
    title: "Dubai and Abu Dhabi",
    titleAr: "دبي وأبوظبي",
    subtitle: "Dubai → Abu Dhabi",
    subtitleAr: "دبي ← أبوظبي",
    provenance: "Two hotels and one ninety-minute drive between them — the split almost every Gulf family ends up making anyway, done deliberately.",
    provenanceAr: "فندقين وسواقة ساعة ونص بينهم — نفس التقسيمة اللي تنتهي لها أغلب العوائل الخليجية، بس معمولة بقصد.",
    forWho: "A week, and you want both cities properly.",
    forWhoAr: "أسبوع، وتبون المدينتين على الأصول.",
    legs: [
      { baseId: "dubai", nightsRatio: 4 },
      { baseId: "abu_dhabi", nightsRatio: 2 },
    ],
    transport: [{ from: "dubai", to: "abu_dhabi", mode: "car", minutes: 90 }],
    minNights: 6,
  },
  {
    id: "uae-dubai-only",
    match: ["dubai", "uae", "دبي", "الإمارات", "الامارات"],
    title: "Dubai, one hotel",
    titleAr: "دبي… فندق واحد",
    subtitle: "Dubai, with Al Ain as the day out",
    subtitleAr: "دبي، والعين طلعة اليوم",
    provenance: "You unpack once. Al Ain and the desert side come to you as day trips instead of a second check-in.",
    provenanceAr: "تفكون الشنط مرة وحدة. والعين وجهة الصحرا تجيكم طلعات يوم بدل تسجيل دخول ثاني.",
    forWho: "Short trip, young kids, or a first visit.",
    forWhoAr: "رحلة قصيرة، أو عيال صغار، أو أول زيارة.",
    legs: [{ baseId: "dubai", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "alula-classic",
    match: ["alula", "al ula", "al-ula", "العلا", "hegra", "مدائن صالح"],
    title: "AlUla, three nights",
    titleAr: "العلا… ثلاث ليالٍ",
    subtitle: "Hegra, Dadan, and the dark sky",
    subtitleAr: "الحِجر ودادان والسماء المظلمة",
    provenance: "Three nights is what AlUla takes: one for Hegra, one for the oasis sites, one for the reserves — and the stars need you to still be there at night.",
    provenanceAr: "ثلاث ليالٍ هي اللي تاخذها العلا: وحدة للحِجر، ووحدة لمواقع الواحة، ووحدة للمحميات — والنجوم تبيكم لسا هناك بالليل.",
    forWho: "A long weekend inside the Kingdom.",
    forWhoAr: "إجازة نهاية أسبوع طويلة داخل المملكة.",
    legs: [{ baseId: "alula", nightsRatio: 3 }],
    transport: [],
    minNights: 2,
  },
  {
    id: "salalah-khareef",
    match: ["salalah", "صلالة", "dhofar", "ظفار"],
    title: "Salalah in khareef",
    titleAr: "صلالة بالخريف",
    subtitle: "Green mountains, from June to September",
    subtitleAr: "جبال خضراء، من يونيو لسبتمبر",
    provenance: "The monsoon trip Gulf families have been taking every August for forty years — it is the one place within a short flight where summer is twenty-three degrees and raining.",
    provenanceAr: "رحلة الخريف اللي تسويها العوائل الخليجية كل أغسطس من أربعين سنة — المكان الوحيد على بعد طيران قصير واللي صيفه ٢٣ درجة ومطر.",
    forWho: "Escaping the Gulf summer with the whole family.",
    forWhoAr: "هروب من صيف الخليج بالعائلة كاملة.",
    legs: [{ baseId: "salalah", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
];

export const GULF: Region = {
  bases: GULF_BASES,
  routes: GULF_ROUTES,
};

/**
 * Hand-checked pins for the places above, keyed by `name` byte-for-byte.
 *
 * [latitude, longitude], four decimals, pointing at the venue rather than the
 * city it sits in. Where the name is a district, beach or reserve rather than
 * a single door, the pin is that place as you'd walk to it.
 *
 * Deliberately absent, because no venue coordinate could be confirmed:
 *   • "Fazayah Beach" — unmapped; it is a track off the Mughsail road.
 *   • "Gharameel Nature Reserve" — no mapped boundary or gate.
 *   • "AlJadidah Arts District" — mapped only as part of AlUla town.
 *   • "Harrat Khaybar" — a lava field the size of a province, not a point.
 */
export const GULF_COORDS: Record<string, readonly [number, number]> = {
  /* ── Dubai ───────────────────────────────────────────────────────────── */
  "Al Fahidi Historical Neighbourhood": [25.2642, 55.3002],
  "Abra across Dubai Creek": [25.2647, 55.293],
  "Deira Gold Souk": [25.2701, 55.2981],
  "Al Seef": [25.2607, 55.3091],
  "Dubai Frame": [25.2355, 55.3004],
  "Al Hallab Restaurant & Sweets": [25.1959, 55.2777],
  "Burj Khalifa": [25.197, 55.2741],
  "The Dubai Fountain": [25.1951, 55.2752],
  "Jumeirah Mosque": [25.2341, 55.2655],
  "Etihad Museum": [25.2414, 55.2693],
  "Kite Beach": [25.163, 55.2067],
  "Bu Qtair Fish Restaurant": [25.1515, 55.1972],
  "The View at The Palm": [25.114, 55.1398],
  "Atlantis The Palm": [25.133, 55.1187],
  "Dubai Marina Walk": [25.0856, 55.1476],
  "The Walk at JBR": [25.0792, 55.1355],
  "Dubai Miracle Garden": [25.0597, 55.2446],
  "IMG Worlds of Adventure": [25.0814, 55.3181],
  "Global Village": [25.0688, 55.3068],

  /* ── Abu Dhabi ───────────────────────────────────────────────────────── */
  "Sheikh Zayed Grand Mosque": [24.4125, 54.4743],
  "Qasr Al Watan": [24.4626, 54.3068],
  "Bait El Khetyar": [24.4882, 54.3712],
  "Corniche Family Beach": [24.4715, 54.3361],
  "Louvre Abu Dhabi": [24.5337, 54.3986],
  "Manarat Al Saadiyat": [24.5345, 54.4191],
  "Beirut Sur Mer": [24.539, 54.4105],
  "Saadiyat Public Beach": [24.5488, 54.4368],
  "Ferrari World Abu Dhabi": [24.4841, 54.6099],
  "Yas Mall": [24.4857, 54.608],
  "Dolmabahce Turkish Cuisine": [24.456, 54.6149],
  "Yas Marina Circuit": [24.4718, 54.6058],

  /* ── Al Ain ──────────────────────────────────────────────────────────── */
  "Al Ain Oasis": [24.219, 55.7629],
  "Al Jahili Fort": [24.2161, 55.7525],
  "Green Mubazzarah": [24.1025, 55.7504],
  "Jebel Hafeet": [24.0586, 55.7775],

  /* ── AlUla ───────────────────────────────────────────────────────────── */
  "Hegra (Mada'in Salih)": [26.7917, 37.9528],
  "Jabal AlFil (Elephant Rock)": [26.6892, 37.9816],
  "AlUla Old Town": [26.617, 37.917],
  "Dadan (Al-Khuraybah)": [26.6558, 37.913],
  "Jabal Ikmah": [26.6855, 37.9029],
  "Sharaan Nature Reserve": [26.8663, 38.2442],
  Maraya: [26.7431, 37.8653],
  "Somewhere AlUla": [26.6295, 37.9139],

  /* ── Khaybar ─────────────────────────────────────────────────────────── */
  "Khaybar Old Town": [25.6986, 39.2925],
  "Al-Qamus Fort": [25.7306, 39.2671],

  /* ── Salalah ─────────────────────────────────────────────────────────── */
  "Sultan Qaboos Mosque Salalah": [17.0199, 54.0871],
  "Al Haffa Souq": [17.0116, 54.1059],
  "Bin Ateeq Restaurant": [17.0208, 54.1202],
  "Al Baleed Archaeological Park": [17.0064, 54.1306],
  "Ain Razat": [17.1299, 54.2381],
  "Wadi Darbat": [17.0667, 54.4833],
  "Tawi Attair sinkhole": [17.114, 54.5581],
  "Taqah Castle": [17.0372, 54.4036],
  "Al Mughsail beach": [16.8831, 53.7931],
  "Marneef Cave": [16.8764, 53.7666],
  "Mughsayl Beach Restaurant": [16.8768, 53.7675],
  "Job's Tomb (Nabi Ayoub)": [17.1105, 53.9949],
  "Wadi Dawkah": [17.339, 54.0764],
  "Hawana Salalah": [17.034, 54.2992],

  /* ── Mirbat ──────────────────────────────────────────────────────────── */
  "Khor Rori (Sumhuram)": [17.0393, 54.4305],
  "Bin Ali's Tomb": [17.0023, 54.6906],
  "Mirbat Castle": [16.9924, 54.6917],
};
