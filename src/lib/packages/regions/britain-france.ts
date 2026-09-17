/**
 * Britain and France — London and Paris.
 *
 * They sit in one region because Gulf travellers routinely do them as one
 * trip: the Eurostar is two and a half hours city-centre to city-centre, and
 * a family that has flown seven hours is not going to visit one and not the
 * other. Keeping them apart would have meant `london-paris` living nowhere.
 *
 * Same rules as `library.ts`. A base owns its days; `maxNights` never exceeds
 * the number of day shapes written for it. Oxford, Windsor and Versailles
 * are day-trip bases — trains out in the morning, back before dinner — so
 * London and Paris can carry them without anyone pretending you moved hotel.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── London ───────────────────────────────────────────────────────────── */

const LONDON_DAYS: CuratedDay[] = [
  {
    key: "london-arrive",
    title: "First evening on the river",
    titleAr: "أول مساء على النهر",
    places: [
      { name: "Westminster Bridge", nameAr: "جسر ويستمنستر", why: "Stand on the south end, not the north — that's the side the clock tower is photographed from, and it's free.", whyAr: "وقفوا بالطرف الجنوبي مو الشمالي — من هالجهة تتصور ساعة البرج، وببلاش.", category: "sight", rating: 4.7, priceBand: 0, startTime: "16:30" },
      { name: "St James's Park", nameAr: "حديقة سانت جيمس", why: "Cut through it rather than around it — the bridge in the middle looks straight down the lake at the palace.", whyAr: "اقطعوها من النص مو من حولها — الجسر اللي بوسطها يطل على البحيرة والقصر بخط واحد.", category: "nature", rating: 4.7, priceBand: 0, startTime: "17:30" },
      { name: "Trafalgar Square", nameAr: "ساحة ترافلغار", why: "The National Gallery behind it is free and open late on Fridays — one room is a better first night than a whole museum.", whyAr: "المعرض الوطني اللي خلفها مجاني ويفتح متأخر يوم الجمعة — قاعة وحدة أحلى أول ليلة من متحف كامل.", category: "sight", rating: 4.6, priceBand: 0, startTime: "19:00" },
      { name: "Dishoom Covent Garden", nameAr: "ديشوم كوفنت غاردن", why: "Bombay café food eight minutes from the square — black daal cooked overnight, chicken ruby, pau bhaji and endless chai. No bookings after five, so leave your name and wait. Bacon is on the breakfast menu.", whyAr: "أكل مقاهي بومباي على بعد ثمان دقايق من الساحة — دال أسود مطبوخ طول الليل، ودجاج «روبي»، وباو باجي، وشاي ما ينتهي. ما يحجزون بعد الخامسة، فاتركوا اسمكم وانتظروا. وبقائمة الفطور لحم خنزير.", category: "food", rating: 4.5, priceBand: 2, startTime: "20:30", dietary: ["vegetarian", "pork-served"] },
    ],
  },
  {
    key: "london-city",
    title: "The Tower and the old City",
    titleAr: "البرج والمدينة القديمة",
    places: [
      { name: "Tower of London", nameAr: "برج لندن", why: "Join the free Yeoman Warder tour at the gate — forty minutes, told by someone who lives inside the walls.", whyAr: "انضموا لجولة الحرس المجانية عند البوابة — أربعين دقيقة يحكيها واحد ساكن داخل الأسوار.", category: "sight", rating: 4.6, priceBand: 3, startTime: "09:00" },
      { name: "Tower Bridge", nameAr: "جسر البرج", why: "The glass floor in the high walkway puts the road forty metres under your feet — check the lift times before you buy.", whyAr: "الأرضية الزجاجية بالممر العلوي تخلي الشارع أربعين متر تحت أرجلكم — شوفوا أوقات فتح الجسر قبل ما تشترون.", category: "sight", rating: 4.6, priceBand: 2, startTime: "12:00" },
      { name: "Borough Market", nameAr: "سوق بورو", why: "Go for lunch, not for shopping — the cooked stalls at the back are the market: grilled cheese sandwiches, fish from the coast that morning, curries by the box. The gift jars at the front are not.", whyAr: "روحوا للغداء مو للتسوق — بسطات الطبخ بالخلف هي السوق: سندويشات جبن مشوية، وسمك جا من الساحل نفس الصباح، وكاري بالعلبة. والمرطبانات بالواجهة لا.", category: "food", rating: 4.5, priceBand: 2, startTime: "13:30", dietary: ["seafood", "pork-served"] },
      { name: "St Paul's Cathedral", nameAr: "كاتدرائية القديس بولس", why: "Cross the Millennium Bridge towards it at dusk — the dome grows the whole way and the walk costs nothing.", whyAr: "اقطعوا جسر الميلينيوم باتجاهها وقت المغرب — القبة تكبر طول الطريق والمشية ببلاش.", category: "sight", rating: 4.6, priceBand: 2, startTime: "16:00" },
    ],
  },
  {
    key: "london-museums",
    title: "Museums, the park and Edgware Road",
    titleAr: "المتاحف والحديقة وشارع إدجوير",
    places: [
      { name: "Natural History Museum", nameAr: "متحف التاريخ الطبيعي", why: "Free, and the building is the exhibit — enter by the Exhibition Road door and you skip the queue on Cromwell Road entirely.", whyAr: "مجاني، والمبنى نفسه هو المعروض — ادخلوا من باب شارع إكزيبيشن وبتتجاوزون طابور كرومويل كامل.", category: "sight", rating: 4.7, priceBand: 0, startTime: "10:00" },
      { name: "Victoria and Albert Museum", nameAr: "متحف فيكتوريا وألبرت", why: "Next door and also free — the Islamic Middle East gallery holds the Ardabil carpet, the oldest dated carpet in the world.", whyAr: "جنبه وبعد مجاني — قاعة الشرق الأوسط الإسلامي فيها سجادة أردبيل، أقدم سجادة مؤرخة بالعالم.", category: "sight", rating: 4.7, priceBand: 0, startTime: "13:00" },
      { name: "Hyde Park and the Serpentine", nameAr: "هايد بارك والسربنتاين", why: "Rent a pedalo for half an hour — it's the one thing in central London that costs less than the coffee next to it.", whyAr: "استأجروا قارب دواسات نص ساعة — الشي الوحيد بوسط لندن اللي أرخص من القهوة اللي جنبه.", category: "nature", rating: 4.6, priceBand: 1, startTime: "15:30" },
      { name: "Edgware Road", nameAr: "شارع إدجوير", why: "A kilometre of Lebanese, Egyptian and Iraqi kitchens open past midnight — mixed grills, mezze by the dozen, fresh bread and knafeh — and the further north you walk, the less it's a tourist street.", whyAr: "كيلو كامل مطابخ لبنانية ومصرية وعراقية تفتح لبعد منتصف الليل — مشاوي مشكلة ومازات بالجملة وخبز طازج وكنافة — وكل ما طلعتم شمال، قلّ كونه شارع سياح.", category: "food", rating: 4.3, priceBand: 2, startTime: "19:00", dietary: ["halal"] },
    ],
  },
  {
    key: "london-west",
    title: "Markets, canals and the hill",
    titleAr: "أسواق وقنوات وتلة",
    places: [
      { name: "Portobello Road Market", nameAr: "سوق بورتوبيلو رود", why: "Saturday is the full market and also the crush — any other morning you get the painted houses without the queue for them.", whyAr: "السبت هو السوق الكامل وهو الزحمة — أي صباح ثاني تلقون البيوت الملونة بدون طابور عليها.", category: "shop", rating: 4.4, priceBand: 1, startTime: "10:00" },
      { name: "Little Venice", nameAr: "البندقية الصغيرة", why: "Houseboats where two canals meet — the towpath from here to Camden is fifty flat minutes through the back of the zoo.", whyAr: "بيوت عائمة عند ملتقى قناتين — وممشى القناة من هنا لكامدن خمسين دقيقة مستوية تمر خلف حديقة الحيوان.", category: "walk", rating: 4.5, priceBand: 0, startTime: "13:00" },
      { name: "Camden Market", nameAr: "سوق كامدن", why: "The lock end is fifty food stalls — Ethiopian platters, Venezuelan arepas, dumplings by the steamer basket — and the stable end is everything else. Eat at the first, browse the second, ignore the middle.", whyAr: "جهة الهويس فيها خمسين بسطة أكل — صواني إثيوبية وأريباس فنزويلية وفطائر مبخّرة بالسلة — وجهة الإسطبلات كل شي ثاني. كلوا بالأولى وتفرجوا بالثانية وتجاوزوا اللي بينهم.", category: "food", rating: 4.3, priceBand: 1, startTime: "15:00", dietary: ["unverified"] },
      { name: "Primrose Hill", nameAr: "تلة بريمروز", why: "Ten minutes uphill from Camden for the skyline everyone films — there's a stone at the top naming the towers you're looking at.", whyAr: "عشر دقايق طلوع من كامدن للأفق اللي يصوره الكل — وفوق حجر مكتوب عليه أسماء الأبراج اللي تشوفونها.", category: "nature", rating: 4.7, priceBand: 0, startTime: "18:00" },
    ],
  },
  {
    key: "london-greenwich",
    title: "Down the river to Greenwich",
    titleAr: "مع النهر إلى غرينتش",
    places: [
      { name: "Cutty Sark", nameAr: "سفينة كَتي سارك", why: "Take the Thames Clipper down instead of the train — it costs a few pounds more and is the best hour on the river.", whyAr: "خذوا قارب التيمز بدل القطار — أغلى بجنيهات وهو أحلى ساعة على النهر.", category: "sight", rating: 4.5, priceBand: 2, startTime: "10:30" },
      { name: "Painted Hall", nameAr: "القاعة المرسومة", why: "Forty thousand square feet of ceiling painted by one man over nineteen years — they hand you a mirror so your neck survives it.", whyAr: "أربعين ألف قدم مربع سقف رسمها رجل واحد بتسعة عشر سنة — ويعطونكم مرآة عشان ترحمون رقابكم.", category: "sight", rating: 4.7, priceBand: 2, startTime: "11:45" },
      { name: "Greenwich Market", nameAr: "سوق غرينتش", why: "Covered, small, and mostly food at lunchtime — paella off a metre-wide pan, Thai curries, salt-beef sandwiches — twenty minutes and you've seen it, which is the right amount.", whyAr: "مسقوف وصغير وأغلبه أكل وقت الغداء — بايلا من مقلاة بعرض متر، وكاري تايلاندي، وسندويشات لحم مملّح — عشرين دقيقة وتكونون شفتوه، وهذا الوقت المناسب.", category: "food", rating: 4.3, priceBand: 1, startTime: "13:00", dietary: ["seafood", "unverified"] },
      { name: "Royal Observatory Greenwich", nameAr: "المرصد الملكي بغرينتش", why: "Walk up through the park rather than paying at the gate first — the view from the slope below it is the famous one, and it's free.", whyAr: "اطلعوا من الحديقة مشي قبل ما تدفعون عند البوابة — الإطلالة المشهورة من المنحدر اللي تحته، وهي مجانية.", category: "sight", rating: 4.5, priceBand: 2, startTime: "15:00" },
    ],
  },
];

/* ── Paris ────────────────────────────────────────────────────────────── */

const PARIS_DAYS: CuratedDay[] = [
  {
    key: "paris-arrive",
    title: "First evening, the tower",
    titleAr: "أول مساء… البرج",
    places: [
      { name: "Rue Cler", nameAr: "شارع كلير", why: "A pedestrian market street ten minutes from the tower — buy the bread, the cheese, the strawberries and a fruit tart here and carry the whole dinner to the lawn. The charcuterie counters are pork.", whyAr: "شارع سوق للمشاة على بعد عشر دقايق من البرج — اشتروا الخبز والجبن والفراولة وتارت فواكه من هنا واحملوا العشا كامل للمرج. وواجهات «الشاركوتري» كلها لحم خنزير.", category: "food", rating: 4.4, priceBand: 1, startTime: "16:00", dietary: ["vegetarian", "pork-served"] },
      { name: "Trocadéro", nameAr: "تروكاديرو", why: "Come out of the métro on the Trocadéro side and the tower is simply there, whole, across the river — the only place it arrives all at once.", whyAr: "اطلعوا من المترو بجهة تروكاديرو وبيكون البرج قدامكم كامل عبر النهر — المكان الوحيد اللي يجيكم فيه دفعة وحدة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "17:00" },
      { name: "Eiffel Tower", nameAr: "برج إيفل", why: "If the summit is sold out, the second floor by stairs is cheaper, quicker, and the better view of the city anyway.", whyAr: "لو القمة محجوزة بالكامل، الدور الثاني بالدرج أرخص وأسرع وإطلالته على المدينة أحلى أصلًا.", category: "sight", rating: 4.7, priceBand: 3, startTime: "18:30" },
      { name: "Champ de Mars", nameAr: "شان دو مارس", why: "Sit on the grass for the first hour of dark — the tower sparkles for five minutes on every hour and the lawn is where you watch it from.", whyAr: "اقعدوا على العشب أول ساعة بعد الظلمة — البرج يلمع خمس دقايق مع كل ساعة، والمرج هو مكان المشاهدة.", category: "rest", rating: 4.6, priceBand: 0, startTime: "20:00" },
    ],
  },
  {
    key: "paris-louvre",
    title: "The Louvre and the gardens",
    titleAr: "اللوفر والحدائق",
    places: [
      { name: "Musée du Louvre", nameAr: "متحف اللوفر", why: "Enter by the Porte des Lions or the Carrousel, never the pyramid — and pick two wings, because nobody has ever finished it.", whyAr: "ادخلوا من باب الأسود أو من الكاروسيل، ولا تدخلون من الهرم — واختاروا جناحين بس، لأن ما أحد خلّصه بحياته.", category: "sight", rating: 4.7, priceBand: 2, startTime: "09:00" },
      { name: "Jardin des Tuileries", nameAr: "حديقة التويلري", why: "The green metal chairs are free and you can drag them anywhere — take two to the round pond and that's the afternoon.", whyAr: "الكراسي الحديد الخضرا مجانية وتقدرون تسحبونها وين ما تبون — خذوا كرسيين للبركة الدائرية وهذا العصر كله.", category: "rest", rating: 4.6, priceBand: 0, startTime: "13:00" },
      { name: "Galerie Vivienne", nameAr: "رواق فيفيان", why: "An 1823 glass-roofed arcade with a mosaic floor, two streets off the noise — Paris had shopping malls before anyone else and this is the proof.", whyAr: "رواق زجاجي من ١٨٢٣ بأرضية فسيفساء، شارعين بس بعيد عن الضجة — باريس سبقت الكل بالمولات، وهذا الدليل.", category: "shop", rating: 4.6, priceBand: 1, startTime: "15:00" },
      { name: "Rue Montorgueil", nameAr: "شارع مونتورغوي", why: "A market street closed to cars ten minutes from the Louvre — oysters shucked on the pavement, roast chicken turning in the window, and Stohrer, baking pastries on this street since 1730. The charcuterie is pork.", whyAr: "شارع سوق مقفول بوجه السيارات على بعد عشر دقايق من اللوفر — محار يُفتح على الرصيف، ودجاج يدور بالشوّاية بالواجهة، ومخبز «ستوريه» يخبز بهالشارع من سنة ١٧٣٠. و«الشاركوتري» لحم خنزير.", category: "food", rating: 4.5, priceBand: 1, startTime: "17:00", dietary: ["seafood", "pork-served"] },
    ],
  },
  {
    key: "paris-montmartre",
    title: "Montmartre, downhill",
    titleAr: "مونمارتر… نازل",
    places: [
      { name: "Sacré-Cœur", nameAr: "كنيسة القلب المقدس", why: "Take the funicular up on your métro ticket and walk everything else down — the steps beat most people before they arrive.", whyAr: "اطلعوا بالقطار المائل بتذكرة المترو نفسها وانزلوا الباقي مشي — الدرج يكسر أغلب الناس قبل ما يوصلون.", category: "sight", rating: 4.6, priceBand: 0, startTime: "09:30" },
      { name: "Place du Tertre", nameAr: "ساحة تيرتر", why: "The portrait painters will quote you a price before you've stopped walking — agree it out loud first, or keep walking.", whyAr: "رسامين البورتريه بيقولون لكم سعر قبل ما توقفون — اتفقوا عليه بصوت عالي أول، أو كملوا مشي.", category: "walk", rating: 4.2, priceBand: 1, startTime: "11:00" },
      { name: "Le Mur des Je t'aime", nameAr: "جدار «أحبك»", why: "A small wall in a small square with 'I love you' in three hundred languages — Arabic is there, and finding it takes about a minute.", whyAr: "جدار صغير بساحة صغيرة مكتوب عليه «أحبك» بثلاثمئة لغة — والعربية موجودة، وتلقونها بدقيقة تقريبًا.", category: "sight", rating: 4.2, priceBand: 0, startTime: "13:00" },
      { name: "Rue des Martyrs", nameAr: "شارع الشهداء", why: "The market street the hill actually shops on — bakers pulling baguettes out at four, cheese counters, fruit stalls, and no view of anything, which is why it's still real. Half the windows are charcuterie, so pork.", whyAr: "شارع السوق اللي تتسوق منه التلة فعلًا — مخابز تطلّع الباغيت الساعة أربعة، وواجهات أجبان، وبسطات فواكه، وبدون أي إطلالة، وعشان كذا لايزال حقيقي. ونص الواجهات «شاركوتري»، يعني لحم خنزير.", category: "food", rating: 4.5, priceBand: 1, startTime: "15:00", dietary: ["vegetarian", "pork-served"] },
    ],
  },
  {
    key: "paris-marais",
    title: "The island and the Marais",
    titleAr: "الجزيرة والماريه",
    places: [
      { name: "Sainte-Chapelle", nameAr: "السانت شابيل", why: "Fifteen metres of stained glass on every side of one small room — go on a bright morning, because the building has no lights.", whyAr: "خمسة عشر متر زجاج ملون من كل جهة بغرفة وحدة صغيرة — روحوا بصباح مشمس، لأن المبنى ما فيه إضاءة.", category: "sight", rating: 4.8, priceBand: 2, startTime: "09:00" },
      { name: "Notre-Dame de Paris", nameAr: "كاتدرائية نوتردام", why: "Reopened at the end of 2024 with the stone scrubbed pale — free to enter, but book the timed slot the night before or you'll queue an hour.", whyAr: "فتحت من جديد بآخر ٢٠٢٤ وحجرها منظّف وصار فاتح — الدخول مجاني، بس احجزوا الموعد من الليلة اللي قبل وإلا بتوقفون ساعة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "11:00" },
      { name: "Place des Vosges", nameAr: "ساحة الفوج", why: "The oldest planned square in Paris, and the arcade running round all four sides is covered — the one reliable wet-afternoon plan.", whyAr: "أقدم ساحة مخططة بباريس، والرواق اللي يلف الجهات الأربع مسقوف — الخطة الوحيدة المضمونة بعصر ممطر.", category: "walk", rating: 4.7, priceBand: 0, startTime: "14:00" },
      { name: "Rue des Rosiers", nameAr: "شارع الروزييه", why: "Falafel in pita with fried aubergine, hummus and pickled cabbage, handed out of a window with a queue down the street at four in the afternoon — join the shorter one, they are all the same recipe, and the kitchens are kosher, so no meat and no pork in them.", whyAr: "فلافل بخبز البيتا مع باذنجان مقلي وحمص وملفوف مخلل، يناولونها من شباك وطابورها نازل بالشارع الساعة أربعة العصر — ادخلوا الأقصر، كلهم نفس الوصفة، والمطابخ كوشير فما فيها لا لحم ولا خنزير.", category: "food", rating: 4.4, priceBand: 1, startTime: "16:00", dietary: ["vegetarian"] },
    ],
  },
  {
    key: "paris-leftbank",
    title: "The Left Bank, slowly",
    titleAr: "الضفة اليسرى… على مهل",
    places: [
      { name: "Musée d'Orsay", nameAr: "متحف أورسيه", why: "A railway station turned museum — go to the fifth floor first, before the Impressionist rooms fill, then come down through everything else.", whyAr: "محطة قطار تحولت متحف — اطلعوا الدور الخامس أول قبل ما تنزحم قاعات الانطباعيين، وبعدها انزلوا على الباقي.", category: "sight", rating: 4.8, priceBand: 2, startTime: "09:30" },
      { name: "Jardin du Luxembourg", nameAr: "حديقة لوكسمبورغ", why: "Rent a wooden sailboat at the big pond and push it with a stick — it has cost a euro or two and entertained children since 1927.", whyAr: "استأجروا قارب شراعي خشبي عند البركة الكبيرة وادفعوه بعصا — بيورو أو اثنين، ويسلي العيال من ١٩٢٧.", category: "nature", rating: 4.7, priceBand: 1, startTime: "12:30" },
      { name: "Grande Mosquée de Paris", nameAr: "جامع باريس الكبير", why: "Built in 1926 in Moroccan style, with a tiled courtyard and a tea room open to anyone — mint tea and a place to actually sit down.", whyAr: "بُني سنة ١٩٢٦ على الطراز المغربي، وفيه صحن مبلّط ومقهى مفتوح للجميع — شاي بالنعناع ومكان تقعدون فيه فعلًا.", category: "sight", rating: 4.5, priceBand: 1, startTime: "15:00" },
      { name: "Rue Mouffetard", nameAr: "شارع موفتار", why: "One of the oldest streets in the city, downhill all the way, and the market end at the bottom is where you buy dinner — crêpes off a griddle, roast chicken and potatoes from under it, cheese by the wedge. The charcuterie windows are pork.", whyAr: "من أقدم شوارع المدينة، ونازل طول الطريق، وطرف السوق بأسفله هو وين تشترون العشا — كريب من على الصاج، ودجاج مشوي وبطاطا من تحته، وجبن بالقطعة. وواجهات «الشاركوتري» لحم خنزير.", category: "food", rating: 4.4, priceBand: 1, startTime: "17:00", dietary: ["vegetarian", "pork-served"] },
    ],
  },
];

/* ── Day-trip shapes ──────────────────────────────────────────────────── */

const OXFORD_DAYTRIP: CuratedDay = {
  key: "oxford-daytrip",
  title: "Oxford in a day",
  titleAr: "أكسفورد بيوم",
  places: [
    { name: "Radcliffe Camera", nameAr: "مكتبة رادكليف", why: "An hour from Paddington, and the round library is the first thing you see — you can't go in without a tour, so book the Bodleian one for straight after.", whyAr: "ساعة من محطة بادينغتون، وأول شي تشوفونه المكتبة الدائرية — ما يدخلونكم إلا بجولة، فاحجزوا جولة البودليان بعدها مباشرة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "10:30" },
    { name: "Bodleian Library Divinity School", nameAr: "قاعة اللاهوت بمكتبة البودليان", why: "A 15th-century vaulted ceiling with no pillars holding it up — the cheapest ticket in Oxford and the single best room in it.", whyAr: "سقف مقبب من القرن الخامس عشر بدون أعمدة تسنده — أرخص تذكرة بأكسفورد وأحلى قاعة فيها.", category: "sight", rating: 4.7, priceBand: 1, startTime: "11:15" },
    { name: "Covered Market", nameAr: "السوق المسقوف", why: "Trading since 1774, two minutes off the high street — filled bagels, a pie counter, and a cake shop that has iced Oxford's exam cakes for a century. Lunch here costs a third of what the college-facing cafés charge, and the butchers hang pork and game in the aisle.", whyAr: "شغّال من ١٧٧٤ وعلى بعد دقيقتين من الشارع الرئيسي — بيغل محشي، وواجهة فطائر، ومحل كيك يزيّن كيك امتحانات أكسفورد من قرن. الغداء هنا بثلث سعر المقاهي اللي قبال الكليات، والجزارين معلّقين لحم خنزير وطرائد بالممر.", category: "food", rating: 4.4, priceBand: 1, startTime: "13:00", dietary: ["vegetarian", "pork-served"] },
    { name: "Christ Church Meadow", nameAr: "مرج كنيسة المسيح", why: "Open, free, and a flat twenty-five-minute loop down to the river — the best thing in Oxford costs nothing.", whyAr: "مفتوح ومجاني ودورته مستوية بخمسة وعشرين دقيقة تنزل للنهر — أحلى شي بأكسفورد ما يكلف شي.", category: "nature", rating: 4.6, priceBand: 0, startTime: "14:30" },
  ],
};

const WINDSOR_DAYTRIP: CuratedDay = {
  key: "windsor-daytrip",
  title: "Windsor in a day",
  titleAr: "وندسور بيوم",
  places: [
    { name: "Windsor Castle", nameAr: "قلعة وندسور", why: "Forty minutes from Paddington, and the oldest occupied castle in the world — check the day before, it closes without warning when the family is in.", whyAr: "أربعين دقيقة من بادينغتون، وأقدم قلعة مسكونة بالعالم — تأكدوا من اليوم اللي قبل، تسكّر بدون إنذار لما تكون العائلة موجودة.", category: "sight", rating: 4.6, priceBand: 3, startTime: "10:00" },
    { name: "St George's Chapel", nameAr: "كنيسة القديس جورج", why: "Inside the castle ticket and often walked past — ten kings are under this floor, and the fan vaulting overhead is the reason to look up.", whyAr: "داخلة بتذكرة القلعة وأغلب الناس تمر عليها — عشرة ملوك تحت هالأرضية، والسقف المروحي فوق هو سبب رفع الرأس.", category: "sight", rating: 4.7, priceBand: 0, startTime: "11:30" },
    { name: "The Long Walk", nameAr: "الممشى الطويل", why: "Four and a half kilometres of straight avenue running from the castle gate into the deer park — walk ten minutes of it and turn around.", whyAr: "أربعة كيلو ونص شارع مستقيم يمتد من باب القلعة لمنتزه الغزلان — امشوا منه عشر دقايق وارجعوا.", category: "walk", rating: 4.7, priceBand: 0, startTime: "14:00" },
    { name: "Eton High Street", nameAr: "شارع إيتون الرئيسي", why: "Cross the footbridge and you're in a different town — antiquarian bookshops, and boys in tailcoats going to lessons on a weekday.", whyAr: "اقطعوا جسر المشاة وبتلقون أنفسكم ببلدة ثانية — مكتبات كتب نادرة، وطلاب بمعاطف رسمية رايحين دروسهم بيوم أسبوع.", category: "walk", rating: 4.4, priceBand: 1, startTime: "16:00" },
  ],
};

const VERSAILLES_DAYTRIP: CuratedDay = {
  key: "versailles-daytrip",
  title: "Versailles in a day",
  titleAr: "فرساي بيوم",
  places: [
    { name: "Château de Versailles", nameAr: "قصر فرساي", why: "Forty minutes on the RER C, and the state apartments are a one-way route — take the 09:00 slot or accept walking it shoulder to shoulder.", whyAr: "أربعين دقيقة بقطار RER C، وأجنحة الدولة مسار باتجاه واحد — خذوا موعد ٩:٠٠ أو اقبلوا تمشونه كتف بكتف.", category: "sight", rating: 4.6, priceBand: 3, startTime: "09:30" },
    { name: "Gardens of Versailles", nameAr: "حدائق فرساي", why: "Free on most days and bigger than the town — rent a golf cart or a bike at the canal, because walking to the far end and back is three hours.", whyAr: "مجانية بأغلب الأيام وأكبر من البلدة نفسها — استأجروا عربة أو دراجة عند القناة، لأن المشي لآخرها ورجوع ثلاث ساعات.", category: "nature", rating: 4.7, priceBand: 0, startTime: "12:00" },
    { name: "Hameau de la Reine", nameAr: "قرية الملكة", why: "A working farm village a queen had built so she could pretend to be a villager — the strangest thing on the estate, and the emptiest.", whyAr: "قرية مزرعة حقيقية بنتها ملكة عشان تتظاهر إنها قروية — أغرب شي بالمحمية وأكثرها فراغًا.", category: "sight", rating: 4.6, priceBand: 1, startTime: "14:30" },
    { name: "Marché Notre-Dame", nameAr: "سوق نوتردام", why: "The town's own market square, ten minutes from the gates — rotisserie chickens, oysters on ice, cheese and tarts under four covered halls, and nobody on the tour buses knows it's there. The charcuterie hall is pork.", whyAr: "ساحة سوق البلدة نفسها، على بعد عشر دقايق من البوابات — دجاج مشوي على الشوّاية، ومحار على الثلج، وأجبان وتارت تحت أربع قاعات مسقوفة، وما أحد من باصات الجولات يدري عنها. وقاعة «الشاركوتري» لحم خنزير.", category: "food", rating: 4.4, priceBand: 1, startTime: "17:00", dietary: ["seafood", "pork-served"] },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const BRITAIN_FRANCE_BASES: Record<BaseId, Base> = {
  london: {
    id: "london",
    name: "London",
    nameAr: "لندن",
    country: "GB",
    lat: 51.5074,
    lng: -0.1278,
    photoQuery: "London England Thames Tower Bridge skyline",
    match: ["london", "england", "britain", "united kingdom", "لندن", "بريطانيا", "إنجلترا", "انجلترا"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["oxford", "windsor"],
    pairsWith: ["paris"],
    days: LONDON_DAYS,
  },
  paris: {
    id: "paris",
    name: "Paris",
    nameAr: "باريس",
    country: "FR",
    lat: 48.8566,
    lng: 2.3522,
    photoQuery: "Paris France Eiffel Tower Seine",
    match: ["paris", "france", "باريس", "فرنسا"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["versailles"],
    pairsWith: ["london"],
    days: PARIS_DAYS,
  },

  /* day-trip bases */
  oxford: {
    id: "oxford",
    name: "Oxford",
    nameAr: "أكسفورد",
    country: "GB",
    lat: 51.752,
    lng: -1.2577,
    photoQuery: "Oxford England Radcliffe Camera colleges",
    match: ["oxford", "أكسفورد", "اوكسفورد"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: OXFORD_DAYTRIP,
  },
  windsor: {
    id: "windsor",
    name: "Windsor",
    nameAr: "وندسور",
    country: "GB",
    lat: 51.4839,
    lng: -0.6044,
    photoQuery: "Windsor Castle England",
    match: ["windsor", "وندسور", "ويندسور"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: WINDSOR_DAYTRIP,
  },
  versailles: {
    id: "versailles",
    name: "Versailles",
    nameAr: "فرساي",
    country: "FR",
    lat: 48.8049,
    lng: 2.1204,
    photoQuery: "Palace of Versailles France gardens",
    match: ["versailles", "فرساي"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: VERSAILLES_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const BRITAIN_FRANCE_ROUTES: Route[] = [
  {
    id: "london-classic",
    match: ["london", "england", "britain", "لندن", "بريطانيا", "إنجلترا"],
    title: "The classic London route",
    titleAr: "المسار الكلاسيكي للندن",
    subtitle: "One hotel, with Oxford and Windsor as day trips",
    subtitleAr: "فندق واحد، وأكسفورد ووندسور طلعات يوم",
    provenance: "The city is big but the trains out of it are short — nothing here is worth packing twice for.",
    provenanceAr: "المدينة كبيرة بس القطارات الطالعة منها قصيرة — ما فيه شي هنا يستاهل تحزمون مرتين.",
    forWho: "Your first time in London.",
    forWhoAr: "أول زيارة للندن.",
    legs: [{ baseId: "london", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "paris-classic",
    match: ["paris", "france", "باريس", "فرنسا"],
    title: "The classic Paris route",
    titleAr: "المسار الكلاسيكي لباريس",
    subtitle: "Right bank, left bank, and Versailles",
    subtitleAr: "الضفة اليمنى والضفة اليسرى وفرساي",
    provenance: "Ordered so you never cross the river twice in one day — which is what makes Paris feel small.",
    provenanceAr: "مرتّب بحيث ما تقطعون النهر مرتين بنفس اليوم — وهذا اللي يخلي باريس تحس صغيرة.",
    forWho: "One hotel, the whole week.",
    forWhoAr: "فندق واحد الأسبوع كله.",
    legs: [{ baseId: "paris", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "london-paris",
    match: ["london", "paris", "england", "france", "لندن", "باريس", "بريطانيا", "فرنسا"],
    title: "London and Paris, one trip",
    titleAr: "لندن وباريس برحلة وحدة",
    subtitle: "London → Paris by Eurostar",
    subtitleAr: "لندن ← باريس باليوروستار",
    provenance: "St Pancras to Gare du Nord is two and a half hours, centre to centre, with no airport at either end.",
    provenanceAr: "من سانت بانكراس لمحطة الشمال ساعتين ونص، من قلب المدينة لقلب المدينة، وبدون مطار بالطرفين.",
    forWho: "Two capitals, and you'd rather not fly twice.",
    forWhoAr: "عاصمتين، وما تبون تطيرون مرتين.",
    legs: [
      { baseId: "london", nightsRatio: 4 },
      { baseId: "paris", nightsRatio: 4 },
    ],
    transport: [{ from: "london", to: "paris", mode: "train", minutes: 150 }],
    minNights: 8,
  },
];

export const BRITAIN_FRANCE: Region = {
  bases: BRITAIN_FRANCE_BASES,
  routes: BRITAIN_FRANCE_ROUTES,
};

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte. [lat, lng], four
 * decimals, the venue itself. Streets and districts are pinned at the street.
 */
export const BRITAIN_FRANCE_COORDS: Record<string, readonly [number, number]> = {
  /* London */
  "Westminster Bridge": [51.5008, -0.1219],
  "St James's Park": [51.5027, -0.134],
  "Trafalgar Square": [51.508, -0.1281],
  "Dishoom Covent Garden": [51.5124, -0.1269],
  "Tower of London": [51.5081, -0.0759],
  "Tower Bridge": [51.5055, -0.0754],
  "Borough Market": [51.5055, -0.091],
  "St Paul's Cathedral": [51.5138, -0.0984],
  "Natural History Museum": [51.4967, -0.1764],
  "Victoria and Albert Museum": [51.4966, -0.1722],
  "Hyde Park and the Serpentine": [51.5053, -0.1653],
  "Edgware Road": [51.5185, -0.165],
  "Portobello Road Market": [51.517, -0.205],
  "Little Venice": [51.5218, -0.183],
  "Camden Market": [51.5414, -0.1465],
  "Primrose Hill": [51.5388, -0.1606],
  "Cutty Sark": [51.4827, -0.0096],
  "Painted Hall": [51.483, -0.0057],
  "Greenwich Market": [51.4816, -0.009],
  "Royal Observatory Greenwich": [51.4769, -0.0005],

  /* Oxford */
  "Radcliffe Camera": [51.7534, -1.254],
  "Bodleian Library Divinity School": [51.754, -1.2545],
  "Covered Market": [51.752, -1.2573],
  "Christ Church Meadow": [51.748, -1.254],

  /* Windsor */
  "Windsor Castle": [51.4839, -0.6044],
  "St George's Chapel": [51.4836, -0.6062],
  "The Long Walk": [51.479, -0.6045],
  "Eton High Street": [51.489, -0.6082],

  /* Paris */
  "Rue Cler": [48.8566, 2.3065],
  Trocadéro: [48.862, 2.2885],
  "Eiffel Tower": [48.8584, 2.2945],
  "Champ de Mars": [48.8556, 2.2986],
  "Musée du Louvre": [48.8606, 2.3376],
  "Jardin des Tuileries": [48.8635, 2.327],
  "Galerie Vivienne": [48.8666, 2.34],
  "Rue Montorgueil": [48.8639, 2.3465],
  "Sacré-Cœur": [48.8867, 2.3431],
  "Place du Tertre": [48.8865, 2.3406],
  "Le Mur des Je t'aime": [48.8841, 2.3383],
  "Rue des Martyrs": [48.8794, 2.3396],
  "Sainte-Chapelle": [48.8554, 2.345],
  "Notre-Dame de Paris": [48.853, 2.3499],
  "Place des Vosges": [48.8556, 2.3655],
  "Rue des Rosiers": [48.8573, 2.3596],
  "Musée d'Orsay": [48.86, 2.3266],
  "Jardin du Luxembourg": [48.8462, 2.3372],
  "Grande Mosquée de Paris": [48.842, 2.3552],
  "Rue Mouffetard": [48.842, 2.3497],

  /* Versailles */
  "Château de Versailles": [48.8049, 2.1204],
  "Gardens of Versailles": [48.806, 2.113],
  "Hameau de la Reine": [48.8199, 2.1104],
  "Marché Notre-Dame": [48.806, 2.134],
};
