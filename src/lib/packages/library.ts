/**
 * The base library — «المدن، مو المسارات».
 *
 * canonical.ts owns routes that own days. That was the right first shape and
 * the wrong second one: the moment someone added a fourth night in Kyoto or
 * swapped Osaka for Kanazawa, the curated content stayed behind with the
 * route and the new nights came through blank. Content that belongs to a
 * route can only ever describe the route it was written for.
 *
 * So this file inverts it. A BASE owns its days — everything you can do while
 * sleeping there, including the places you reach in the morning and are back
 * from by dinner. A ROUTE owns nothing but an ordering, a set of ratios, and
 * the trains between them. Add a base and its content arrives with it. Drop
 * one and nothing else changes. Stretch a trip and the ceiling holds, because
 * the ceiling (maxNights) is a property of the place, not of the plan.
 *
 * Two kinds of base live here:
 *   • sleeping bases — `days[]` full, `maxNights` > 0, and enough distinct day
 *     shapes to fill that ceiling with no blank day. Where we could not write
 *     an honest extra day, the ceiling came down instead of a day being padded.
 *   • day-trip bases — `days: []`, `maxNights: 0`, one `dayTrip` shape. Nara
 *     and Kazbegi are not places most people sleep; they are mornings you
 *     leave for and evenings you come back from. Listing them as bases is what
 *     lets a Tbilisi base carry the mountains without pretending you moved.
 *
 * Same rules as canon: hand-curated, no generated venue, nothing closed, and a
 * monthly freshness pass. The `why` line is the whole product — one concrete
 * sentence a person can repeat to a friend as their own. The Arabic is written
 * Arabic, not translated English.
 */

import type {
  Base,
  BaseId,
  CuratedDay,
  Route,
} from "@/lib/packages/types";
import { REGIONS } from "@/lib/packages/regions";

/* ── Japan ─────────────────────────────────────────────────────────────── */

const TOKYO_DAYS: CuratedDay[] = [
  {
    key: "tokyo-arrive",
    title: "Land, and ease in",
    titleAr: "الوصول… وعلى مهل",
    places: [
      { name: "Shibuya Crossing", nameAr: "تقاطع شيبويا", why: "The first 'we're really here' moment — go at dusk when the screens light up.", whyAr: "أول لحظة تحس فيها إنك وصلت فعلًا — روحوا وقت المغرب لما تشتغل الشاشات.", category: "sight", rating: 4.6, priceBand: 0, startTime: "17:00" },
      { name: "Nonbei Yokocho", nameAr: "نونبي يوكوتشو", why: "Six narrow lanes of counter kitchens — grilled skewers and small plates, four or five seats a shop. Go before 7 or expect to wait.", whyAr: "ستة أزقة ضيقة كلها مطابخ صغيرة — أسياخ مشوية وأطباق صغيرة، وأربعة أو خمسة كراسي بكل محل. روحوا قبل السابعة أو استعدوا تنتظرون.", category: "food", rating: 4.5, priceBand: 2, startTime: "19:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "tokyo-old",
    title: "Old Tokyo",
    titleAr: "طوكيو القديمة",
    places: [
      { name: "Sensō-ji Temple", nameAr: "معبد سينسوجي", why: "Get there before 9 and you'll have the approach almost to yourself.", whyAr: "اوصلوا قبل التاسعة وبتلقون الممشى شبه فاضي لكم.", category: "sight", rating: 4.5, priceBand: 0, startTime: "08:30" },
      { name: "Nakamise Shopping Street", nameAr: "شارع ناكاميسي", why: "Street food the length of the approach — melon pan eaten warm, rice crackers grilled in front of you, and sweet-bean cakes pressed into moulds.", whyAr: "أكل شوارع على طول الممشى — ميلون بان وهو سخن، وبسكوت رز يُشوى قدامكم، وكعك بحشوة الفول الحلو يُكبس بقوالب.", category: "food", rating: 4.3, priceBand: 1, startTime: "10:00", dietary: ["vegetarian"] },
      { name: "Ueno Park", nameAr: "حديقة أوينو", why: "A slow green hour between temples and museums.", whyAr: "ساعة خضراء هادية بين المعابد والمتاحف.", category: "nature", rating: 4.4, priceBand: 0, startTime: "13:00" },
      { name: "Akihabara", nameAr: "أكيهابارا", why: "Six floors of noise and neon — worth it once, even if it's not your thing.", whyAr: "ست طوابق ضجة ونيون — تستاهل مرة، حتى لو مو ذوقكم.", category: "shop", rating: 4.4, priceBand: 1, startTime: "16:00" },
    ],
  },
  {
    key: "tokyo-gardens",
    title: "Views and gardens",
    titleAr: "إطلالات وحدائق",
    places: [
      { name: "Meiji Jingu", nameAr: "ضريح ميجي", why: "Forest in the middle of the city — the gravel path is the point.", whyAr: "غابة بقلب المدينة — الممشى الحصوي هو المقصد.", category: "nature", rating: 4.6, priceBand: 0, startTime: "09:00" },
      { name: "Omotesandō", nameAr: "أوموتيساندو", why: "Architecture street. Window-shop it even if you buy nothing.", whyAr: "شارع العمارة. تمشوا وتفرجوا حتى لو ما اشتريتوا شي.", category: "walk", rating: 4.4, priceBand: 2, startTime: "11:30" },
      { name: "Shinjuku Gyoen", nameAr: "حديقة شينجوكو", why: "The one garden worth the entry fee — three garden styles in one.", whyAr: "الحديقة الوحيدة اللي تستاهل التذكرة — ثلاث طرز بمكان واحد.", category: "nature", rating: 4.7, priceBand: 1, startTime: "14:30" },
      { name: "Omoide Yokocho", nameAr: "أومويدي يوكوتشو", why: "Charcoal-grilled chicken skewers, eaten standing at the counter — smoky, loud, and a few hundred yen a skewer.", whyAr: "أسياخ دجاج مشوية على الفحم، تاكلونها وقوف عند الطاولة — دخان وضجة، والسيخ بمئات قليلة من الينات.", category: "food", rating: 4.4, priceBand: 2, startTime: "19:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "tokyo-bay",
    title: "The bay side",
    titleAr: "جهة الخليج",
    places: [
      { name: "Toyosu Market", nameAr: "سوق تويوسو", why: "Get to the third-floor sushi counters before 7 — same fish that came off the auction, half the queue.", whyAr: "اطلعوا لمطاعم السوشي بالدور الثالث قبل السابعة — نفس السمك النازل من المزاد، وبنص الطابور.", category: "food", rating: 4.4, priceBand: 2, startTime: "07:00", dietary: ["seafood"] },
      { name: "teamLab Planets TOKYO", nameAr: "تيم لاب بلانتس طوكيو", why: "Book the slot a week out and go in barefoot — the water rooms are the part you'll keep talking about.", whyAr: "احجزوا الموعد قبل بأسبوع وادخلوا حفاة — غرف الماي هي اللي بتظلون تتكلمون عنها.", category: "sight", rating: 4.5, priceBand: 2, startTime: "10:30" },
      { name: "Rainbow Bridge promenade", nameAr: "ممشى جسر قوس قزح", why: "Walk the lower deck back toward the city — it's free, it takes forty minutes, and almost nobody does it.", whyAr: "امشوا الطابق السفلي ورجعتكم على المدينة — مجاني، أربعين دقيقة، وبالكاد أحد يسويه.", category: "walk", rating: 4.4, priceBand: 0, startTime: "15:30" },
    ],
  },
  {
    key: "tokyo-neighbourhoods",
    title: "The Tokyo people live in",
    titleAr: "طوكيو اللي يعيشها أهلها",
    places: [
      { name: "Shimokitazawa", nameAr: "شيموكيتازاوا", why: "Second-hand racks and six-seat coffee bars — come on a weekday afternoon, it's a different place on Saturday.", whyAr: "رفوف ملابس مستعملة وكوفيات بستة كراسي — تعالوا يوم أسبوع بعد الظهر، السبت مكان ثاني تمامًا.", category: "shop", rating: 4.5, priceBand: 1, startTime: "11:00" },
      { name: "Nakameguro canal", nameAr: "قناة ناكاميغورو", why: "The canal itself, not the cherry season — the shops tucked under the railway are open all year.", whyAr: "القناة نفسها مو موسم الكرز — المحلات المندسّة تحت سكة القطار فاتحة طول السنة.", category: "walk", rating: 4.5, priceBand: 1, startTime: "14:30" },
      { name: "Daikanyama T-Site", nameAr: "دايكانياما تي-سايت", why: "A bookshop with an armchair section that will take an hour off you without asking.", whyAr: "مكتبة فيها ركن كراسي بيسحب منكم ساعة بدون ما يستأذن.", category: "shop", rating: 4.5, priceBand: 1, startTime: "16:30" },
      { name: "Ebisu Yokochō", nameAr: "إيبيسو يوكوتشو", why: "A covered arcade of about twenty tiny kitchens under one roof — seafood, grilled meat, okonomiyaki — each with its own menu. Walk the row once before you pick.", whyAr: "ممر مسقوف فيه حوالي عشرين مطبخ صغير تحت سقف واحد — بحريات ومشاوي وأوكونومي ياكي — وكل واحد بقائمته. لفّوا الممر مرة قبل ما تختارون.", category: "food", rating: 4.3, priceBand: 2, startTime: "19:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "tokyo-takao",
    title: "Up Mount Takao",
    titleAr: "طلعة جبل تاكاو",
    places: [
      { name: "Mount Takao", nameAr: "جبل تاكاو", why: "Fifty minutes from Shinjuku to a real mountain — cable car up, Trail 6 down through the stream bed.", whyAr: "خمسين دقيقة من شينجوكو وتلقون جبل حقيقي — اطلعوا بالتلفريك وانزلوا مسار ٦ مع مجرى الماي.", category: "nature", rating: 4.5, priceBand: 1, startTime: "09:00" },
      { name: "Yakuō-in", nameAr: "معبد ياكوؤين", why: "Halfway up: cedar, incense, and monks who are working, not performing.", whyAr: "بنص الطلعة: أرز وبخور ورهبان يشتغلون مو يمثلون.", category: "sight", rating: 4.5, priceBand: 0, startTime: "11:00" },
      { name: "Ukai Toriyama", nameAr: "أوكاي توري-ياما", why: "Chicken and river trout grilled over charcoal in your own thatched hut above a garden stream — reserve it, and the free shuttle picks you up at the station.", whyAr: "دجاج وسمك تراوت نهري مشوي على الفحم بكوخ خاص فيكم سقفه قش وتحته جدول حديقة — احجزوا، والباص المجاني يلقطكم من المحطة.", category: "food", rating: 4.5, priceBand: 3, startTime: "13:30", dietary: ["unverified"] },
      { name: "Keiō Takaosan Onsen Gokurakuyu", nameAr: "أونسن تاكاوسان غوكوراكويو", why: "A hot spring built right onto the station — go in before the train back and you'll sleep on it.", whyAr: "عين حارة ملصوقة بالمحطة نفسها — ادخلوها قبل قطار الرجعة وبتنامون بالطريق.", category: "rest", rating: 4.2, priceBand: 2, startTime: "15:00" },
    ],
  },
];

const KYOTO_DAYS: CuratedDay[] = [
  {
    key: "kyoto-arrive",
    title: "Shinkansen to Kyoto",
    titleAr: "الشينكانسن إلى كيوتو",
    places: [
      { name: "Fushimi Inari Taisha", nameAr: "فوشيمي إيناري", why: "Go at 7am. By 10 the gates are a queue, and the whole magic is the quiet.", whyAr: "روحوا الساعة ٧ الصبح. بعد العاشرة تصير البوابات طابور، والسحر كله بالهدوء.", category: "sight", rating: 4.8, priceBand: 0, startTime: "07:30" },
      { name: "Nishiki Market", nameAr: "سوق نيشيكي", why: "Lunch as a walk — grilled skewers, tamagoyaki cut hot off the pan, pickles by the slice: buy one thing from five stalls.", whyAr: "غداء وأنتم ماشين — أسياخ مشوية، وعجة «تاماغوياكي» تُقطع سخنة من المقلاة، ومخللات بالقطعة: خذوا شي واحد من خمس بسطات.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:30", dietary: ["seafood", "unverified"] },
      { name: "Gion at dusk", nameAr: "جيون وقت المغرب", why: "Wooden machiya streets; if you're lucky, a geiko crossing to work.", whyAr: "شوارع البيوت الخشبية؛ وإذا حالفكم الحظ تشوفون جيكو رايحة شغلها.", category: "walk", rating: 4.6, priceBand: 0, startTime: "17:30" },
    ],
  },
  {
    key: "kyoto-bamboo",
    title: "Bamboo and temples",
    titleAr: "الخيزران والمعابد",
    places: [
      { name: "Arashiyama Bamboo Grove", nameAr: "غابة أراشياما", why: "Early or not at all — it's a corridor, and corridors fill up.", whyAr: "بدري أو لا تروحون — هو ممر، والممرات تنزحم.", category: "nature", rating: 4.5, priceBand: 0, startTime: "08:00" },
      { name: "Tenryū-ji", nameAr: "معبد تنريوجي", why: "The garden was designed in 1339 and hasn't needed changing.", whyAr: "الحديقة مصممة من ١٣٣٩ وما احتاجت تغيير.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
      { name: "Arashiyama Yoshimura", nameAr: "أراشياما يوشيمورا", why: "Buckwheat soba ground in the shop that morning, eaten at a window over the river and the bridge — put your name on the list downstairs and wait outside.", whyAr: "سوبا حنطة سوداء مطحونة بالمحل نفس الصباح، تاكلونها عند شباك يطل على النهر والجسر — سجّلوا أسماءكم تحت وانتظروا برا.", category: "food", rating: 4.3, priceBand: 2, startTime: "12:00", dietary: ["unverified"] },
      { name: "Kinkaku-ji", nameAr: "المعبد الذهبي", why: "Ten minutes of looking, and worth the trip across town for them.", whyAr: "عشر دقايق تفرّج، وتستاهل القطع للطرف الثاني من المدينة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "14:00" },
    ],
  },
  {
    key: "kyoto-east",
    title: "The eastern hills, on foot",
    titleAr: "التلال الشرقية… مشي",
    places: [
      { name: "Kiyomizu-dera", nameAr: "معبد كيوميزو", why: "Go at opening — the wooden stage is half empty and the slope up is a different street without the crowd.", whyAr: "روحوا مع الافتتاح — المنصة الخشبية نص فاضية والطلعة تصير شارع ثاني بدون زحمة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "07:30" },
      { name: "Okutan Nanzenji", nameAr: "أوكودان نانزينجي", why: "Yudōfu — blocks of tofu simmered at your own table in a plain broth, with sesame tofu and vegetable tempura — eaten in a temple garden, and there is no meat anywhere on the menu.", whyAr: "يودوفو — قطع توفو تُطبخ على طاولتكم بمرق خفيف، ومعها توفو السمسم وتمبورا خضار — تاكلونها بحديقة معبد، وما فيه لحم بالقائمة أبدًا.", category: "food", rating: 4.4, priceBand: 2, startTime: "11:30", dietary: ["vegetarian"] },
      { name: "Nanzen-ji aqueduct", nameAr: "قناة معبد نانزينجي", why: "A brick aqueduct that looks Roman, standing behind a Zen temple, with nobody in it.", whyAr: "قناة ماء بالطوب شكلها روماني واقفة خلف معبد زن، وما فيها أحد.", category: "sight", rating: 4.6, priceBand: 0, startTime: "13:00" },
      { name: "Philosopher's Path to Ginkaku-ji", nameAr: "درب الفيلسوف إلى المعبد الفضي", why: "Thirty minutes of canal, cats and stone, ending at the temple that refused to be covered in silver.", whyAr: "نص ساعة قناة وقطط وحجر، وتنتهي عند المعبد اللي رفضوا يكسونه بالفضة.", category: "walk", rating: 4.5, priceBand: 1, startTime: "15:00" },
    ],
  },
  {
    key: "kyoto-castle",
    title: "Castle, palace, river",
    titleAr: "قلعة وقصر ونهر",
    places: [
      { name: "Nijō Castle", nameAr: "قلعة نيجو", why: "The corridor floors squeak on purpose — that was the security system, and you can hear it working under you.", whyAr: "أرضيات الممرات تصرصر بقصد — هذا كان نظام الحماية، وتسمعونه يشتغل تحتكم.", category: "sight", rating: 4.5, priceBand: 1, startTime: "09:00" },
      { name: "Kyoto Imperial Palace", nameAr: "القصر الإمبراطوري بكيوتو", why: "Free to enter, and the gravel courtyards are the emptiest large space in the city.", whyAr: "دخوله مجاني، وساحاته الحصوية أوسع مكان فاضي بالمدينة.", category: "sight", rating: 4.4, priceBand: 0, startTime: "11:30" },
      { name: "Pontochō alley", nameAr: "زقاق بونتوتشو", why: "One lane wide with the Kamo river down one side — in summer the kitchens build terraces out over the water. Ask for the terrace.", whyAr: "زقاق بعرض واحد ونهر كامو من جهة — بالصيف المطاعم تبني شرفات فوق الماء. اطلبوا الشرفة.", category: "food", rating: 4.5, priceBand: 2, startTime: "18:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "kyoto-uji",
    title: "Uji, for the tea",
    titleAr: "أوجي… للشاي",
    places: [
      { name: "Byōdō-in", nameAr: "معبد بيودوين", why: "The building on the ten-yen coin — twenty minutes by train, and much better than that description makes it sound.", whyAr: "المبنى اللي على عملة العشر ين — عشرين دقيقة بالقطار، وأحلى بكثير مما يوحي الوصف.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
      { name: "Nakamura Tōkichi Uji Honten", nameAr: "ناكامورا توكيتشي — الفرع الرئيسي بأوجي", why: "Matcha soba and a tea that tastes like the fields outside the window — put your name down and walk the river while you wait.", whyAr: "سوبا بالماتشا وشاي طعمه من المزارع اللي برا الشباك — سجّلوا أسماءكم وتمشوا على النهر لين ينادونكم.", category: "food", rating: 4.5, priceBand: 2, startTime: "12:00", dietary: ["unverified"] },
      { name: "Ujigami Shrine and the riverbank", nameAr: "ضريح أوجيغامي وضفة النهر", why: "The oldest shrine building in Japan, and the walk to it along the water takes twenty unhurried minutes.", whyAr: "أقدم مبنى ضريح باليابان، والمشية له على الماي عشرين دقيقة بدون استعجال.", category: "walk", rating: 4.4, priceBand: 0, startTime: "14:00" },
    ],
  },
];

const OSAKA_DAYS: CuratedDay[] = [
  {
    key: "osaka-eating",
    title: "Osaka, for eating",
    titleAr: "أوساكا… للأكل",
    places: [
      { name: "Kuromon Ichiba Market", nameAr: "سوق كورومون", why: "Grilled scallops standing at the stall. That's the whole plan.", whyAr: "إسكالوب مشوي وأنتم واقفين عند البسطة. هذي كل الخطة.", category: "food", rating: 4.2, priceBand: 2, startTime: "12:00", dietary: ["seafood", "unverified"] },
      { name: "Dōtonbori", nameAr: "دوتونبوري", why: "Loud, lit, and unserious — the anti-Kyoto, which is why it goes last.", whyAr: "ضجة وأنوار وبدون جدية — عكس كيوتو، وعشان كذا جاية بالآخر.", category: "walk", rating: 4.5, priceBand: 0, startTime: "18:00" },
    ],
  },
  {
    key: "osaka-south",
    title: "Shinsekai and the south",
    titleAr: "شينسيكاي والجنوب",
    places: [
      { name: "Shitennō-ji", nameAr: "معبد شيتينوجي", why: "Japan's oldest officially founded temple, and hardly anyone makes the stop.", whyAr: "أقدم معبد تأسس رسميًا باليابان، وبالكاد أحد يقف عنده.", category: "sight", rating: 4.3, priceBand: 1, startTime: "09:30" },
      { name: "Shinsekai and Tsūtenkaku", nameAr: "شينسيكاي وبرج تسوتنكاكو", why: "A 1950s idea of the future, gone gently to seed — go up Tsūtenkaku first and look down on the arcades you're about to eat in.", whyAr: "تصوّر الخمسينات عن المستقبل وقد بهت على مهل — اطلعوا برج تسوتنكاكو أول وشوفوا من فوق الأزقة اللي بتاكلون فيها بعد شوي.", category: "walk", rating: 4.2, priceBand: 1, startTime: "11:30" },
      { name: "Janjan Yokochō", nameAr: "زقاق جان-جان", why: "A covered alley of kushikatsu counters — skewers of beef, prawn and onion breaded and fried to order, and the shared sauce tub is one dip only, never two.", whyAr: "زقاق مسقوف كله طاولات كوشيكاتسو — أسياخ لحم وروبيان وبصل تُغلّف وتُقلى بالطلب، وحوض الصلصة المشترك غمسة وحدة بس، وممنوع ثانية.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:30", dietary: ["pork-served"] },
      { name: "Abeno Harukas 300", nameAr: "أبينو هاروكاس ٣٠٠", why: "Osaka's tallest tower — go up an hour before sunset and stay until the grid lights up.", whyAr: "أطول برج في أوساكا — اطلعوا قبل الغروب بساعة واقعدوا لين تضوي شبكة المدينة.", category: "sight", rating: 4.5, priceBand: 2, startTime: "16:30" },
    ],
  },
  {
    key: "osaka-water",
    title: "Water, rivers, rooftops",
    titleAr: "ماء وأنهار وأسطح",
    places: [
      { name: "Osaka Aquarium Kaiyukan", nameAr: "حوض أوساكا كايوكان", why: "One spiral ramp winding down around a single enormous tank — even people who skip aquariums come out impressed.", whyAr: "منحدر حلزوني واحد ينزل حول حوض ضخم واحد — حتى اللي ما يحب الأحواض يطلع معجب.", category: "sight", rating: 4.5, priceBand: 2, startTime: "10:00" },
      { name: "Naniwa Kuishinbo Yokochō", nameAr: "زقاق نانيوا كويشينبو", why: "A 1960s Osaka street rebuilt indoors beside the aquarium — twenty small kitchens doing takoyaki with octopus inside, okonomiyaki off the griddle, and you eat standing.", whyAr: "شارع أوساكا من الستينات أعيد بناؤه بالداخل جنب الحوض — عشرين مطبخ صغير يسوّون تاكوياكي بأخطبوط داخله وأوكونوميّاكي من على الصاج، وتاكلون وأنتم واقفين.", category: "food", rating: 4.1, priceBand: 1, startTime: "12:30", dietary: ["seafood", "pork-served"] },
      { name: "Nakanoshima and Kitahama", nameAr: "ناكانوشيما وكيتاهاما", why: "An island between two rivers: bank buildings, a rose garden, and coffee on a terrace right over the water.", whyAr: "جزيرة بين نهرين: عمارات بنوك وحديقة ورد وقهوة على شرفة فوق الماي مباشرة.", category: "walk", rating: 4.4, priceBand: 1, startTime: "14:00" },
      { name: "Umeda Sky Building", nameAr: "مبنى أوميدا سكاي", why: "The open-air escalator crossing between the two towers is the ride; the floating garden at the top is just where it leaves you.", whyAr: "السلم المتحرك المكشوف بين البرجين هو الرحلة نفسها؛ والحديقة المعلّقة فوق مجرد المكان اللي ينزلكم فيه.", category: "sight", rating: 4.5, priceBand: 2, startTime: "18:00" },
    ],
  },
  {
    key: "osaka-last",
    title: "Last morning",
    titleAr: "آخر صباح",
    places: [
      { name: "Osaka Castle Park", nameAr: "حديقة قلعة أوساكا", why: "A walk, a coffee, and time to make your flight.", whyAr: "مشية وقهوة ووقت يكفي لرحلتكم.", category: "nature", rating: 4.5, priceBand: 0, startTime: "09:00" },
      { name: "Tenjinbashisuji Shōtengai", nameAr: "شارع تنجين-باشي-سوجي", why: "The longest covered shopping street in Japan, and the middle of it is all food — takoyaki six to a tray, okonomiyaki, and standing sushi counters one stop from Osaka Station.", whyAr: "أطول شارع تسوق مسقوف باليابان، ونصه الأوسط كله أكل — تاكوياكي ست حبات بالصينية، وأوكونوميّاكي، وطاولات سوشي وقوف على بعد محطة وحدة من محطة أوساكا.", category: "food", rating: 4.3, priceBand: 1, startTime: "11:00", dietary: ["seafood", "pork-served"] },
      { name: "Umekita Park at Osaka Station", nameAr: "حديقة أوميكيتا عند محطة أوساكا", why: "Put the bags in a station locker and sit on the grass — the airport train leaves from directly underneath you.", whyAr: "حطوا الشنط بخزانة المحطة واقعدوا على العشب — قطار المطار يطلع من تحتكم مباشرة.", category: "rest", rating: 4.3, priceBand: 0, startTime: "12:30" },
    ],
  },
];

const HAKONE_DAYS: CuratedDay[] = [
  {
    key: "hakone-loop",
    title: "The loop, the long way",
    titleAr: "الجولة… بالطريق الطويل",
    places: [
      { name: "Ōwakudani", nameAr: "أواكوداني", why: "Sulphur steam coming straight out of the hillside — eat the black egg, it's boiled in that water.", whyAr: "بخار كبريت طالع من جوف الجبل — كلوا البيضة السودا، مسلوقة بنفس هالماي.", category: "nature", rating: 4.4, priceBand: 2, startTime: "10:00" },
      { name: "Hakone Shrine", nameAr: "ضريح هاكوني", why: "Come across the lake by boat rather than round it by bus — on a clear afternoon Fuji is behind the far shore, and the cedar stairway up behind the red gate has nobody on it at all.", whyAr: "اقطعوا البحيرة بالقارب بدل ما تلفون حولها بالباص — بعصر صافي بيكون فوجي خلف الضفة البعيدة، ودرج الأرز اللي خلف البوابة الحمراء ما فيه أحد أبدًا.", category: "sight", rating: 4.6, priceBand: 1, startTime: "13:00" },
      { name: "Amazake Chaya", nameAr: "بيت الشاي أماساكي-تشايا", why: "A thatched teahouse on the old Tokaido road, run by the same family for four hundred years — grilled rice cakes off the charcoal, one brushed with soy and one rolled in black sesame.", whyAr: "بيت شاي بسقف قش على طريق التوكايدو القديم، تديره نفس العائلة من أربعمئة سنة — كعك رز مشوي من على الفحم، واحد مدهون بصلصة الصويا وواحد ملفوف بالسمسم الأسود.", category: "food", rating: 4.4, priceBand: 1, startTime: "15:00", dietary: ["vegetarian"] },
      { name: "Tenzan Tōji-kyō", nameAr: "حمامات تنزان توجي-كيو", why: "Open-air rock baths down in the river valley — this is the one locals use, not the hotel one upstairs.", whyAr: "أحواض حجرية مكشوفة نازلة بوادي النهر — هذي اللي يستخدمها أهل المنطقة، مو حق الفندق فوق.", category: "rest", rating: 4.5, priceBand: 2, startTime: "17:30" },
    ],
  },
  {
    key: "hakone-art",
    title: "Art in the hills",
    titleAr: "فن بين الجبال",
    places: [
      { name: "Hakone Open-Air Museum", nameAr: "متحف هاكوني المفتوح", why: "Sculpture spread across a hillside with the mountains behind it, and a hot foot bath waiting at the far end.", whyAr: "منحوتات موزّعة على منحدر وخلفها الجبال، وبآخر الجولة حوض أرجل ساخن ينتظركم.", category: "sight", rating: 4.6, priceBand: 2, startTime: "10:00" },
      { name: "Pola Museum of Art", nameAr: "متحف بولا للفنون", why: "Half-buried in the forest so it doesn't block the trees, and the Impressionist collection inside is genuinely serious.", whyAr: "نص مدفون بالغابة عشان ما يحجب الشجر، ومجموعته الانطباعية جادة فعلًا.", category: "sight", rating: 4.6, priceBand: 2, startTime: "13:30" },
      { name: "Gōra Park", nameAr: "حديقة غورا", why: "A French terraced garden on the way back down to the train, and twenty minutes is exactly enough.", whyAr: "حديقة مدرجات فرنسية بطريق النزول للقطار، وعشرين دقيقة كافية بالضبط.", category: "nature", rating: 4.1, priceBand: 1, startTime: "16:00" },
      { name: "Hatsuhana Honten", nameAr: "هاتسوهانا الفرع الرئيسي", why: "Soba kneaded with grated mountain yam instead of egg — you pour the yam broth over the noodles yourself, at a wooden house over the river in Yumoto.", whyAr: "سوبا معجونة بالبطاطا الجبلية المبشورة بدل البيض — تصبّون مرق البطاطا على النودلز بأنفسكم، ببيت خشبي فوق النهر بيوموتو.", category: "food", rating: 4.3, priceBand: 2, startTime: "17:30", dietary: ["unverified"] },
    ],
  },
];

const KANAZAWA_DAYS: CuratedDay[] = [
  {
    key: "kanazawa-kenrokuen",
    title: "Kenroku-en and the castle",
    titleAr: "كينروكوين والقلعة",
    places: [
      { name: "Kenroku-en", nameAr: "حديقة كينروكوين", why: "One of Japan's three great gardens, and entry is free in the hour before it officially opens — the pond is yours.", whyAr: "وحدة من أعظم ثلاث حدائق باليابان، والدخول مجاني بالساعة اللي قبل الافتتاح الرسمي — البركة كلها لكم.", category: "nature", rating: 4.6, priceBand: 1, startTime: "06:45" },
      { name: "Kanazawa Castle Park", nameAr: "حديقة قلعة كانازاوا", why: "Rebuilt with the original joinery instead of concrete — go inside and you can read the timber frame like a diagram.", whyAr: "أعيد بناؤها بنجارة أصلية مو خرسانة — ادخلوا وبتقرون الهيكل الخشبي كأنه رسم توضيحي.", category: "sight", rating: 4.4, priceBand: 0, startTime: "09:30" },
      { name: "Miyoshian", nameAr: "ميوشي-آن", why: "A teahouse standing on the pond inside Kenroku-en — jibuni, duck simmered in a thick wheat-dusted broth with wasabi on top, is the Kanazawa dish and this is the room to eat it in.", whyAr: "بيت شاي واقف على البركة داخل كينروكوين — الجيبوني، بط مطبوخ بمرق ثقيل مغبّر بالطحين وفوقه وسابي، هو أكلة كانازاوا وهذي القاعة اللي تاكلونها فيها.", category: "food", rating: 4.2, priceBand: 2, startTime: "11:30", dietary: ["unverified"] },
      { name: "21st Century Museum of Contemporary Art", nameAr: "متحف القرن الحادي والعشرين للفن المعاصر", why: "Round, all glass, and free to walk through — you only pay for the rooms, and the Swimming Pool is the one to pay for.", whyAr: "دائري وكله زجاج والمرور فيه مجاني — ما تدفعون إلا للقاعات، وحوض السباحة هو اللي يستاهل الدفع.", category: "sight", rating: 4.4, priceBand: 2, startTime: "13:00" },
    ],
  },
  {
    key: "kanazawa-chaya",
    title: "Tea houses and gold",
    titleAr: "بيوت الشاي والذهب",
    places: [
      { name: "Ōmichō Market", nameAr: "سوق أوميتشو", why: "Seafood bowls for breakfast — sweet shrimp, crab and yellowtail over rice, and the counters at the back of the market cost half what the ones by the entrance do.", whyAr: "أطباق بحرية للفطور — روبيان حلو وسلطعون وسمك الأمبرجاك على رز، والمطاعم بآخر السوق بنص سعر اللي عند المدخل.", category: "food", rating: 4.3, priceBand: 2, startTime: "09:00", dietary: ["seafood"] },
      { name: "Higashi Chaya District", nameAr: "حي هيغاشي تشايا", why: "Lattice-fronted tea houses two hundred years old — go inside Shima, they left it exactly as it was.", whyAr: "بيوت شاي بواجهات مشبكة عمرها مئتين سنة — ادخلوا بيت شيما، تركوه بالضبط كما كان.", category: "walk", rating: 4.5, priceBand: 1, startTime: "11:00" },
      { name: "Hakuza gold leaf house", nameAr: "بيت هاكوزا لرقائق الذهب", why: "Kanazawa makes almost all of Japan's gold leaf — here there's a storeroom lined in it, and ice cream wearing it.", whyAr: "كانازاوا تصنع تقريبًا كل رقائق الذهب باليابان — وهنا مخزن مكسي فيه، وآيس كريم ملبّس فيه.", category: "shop", rating: 4.3, priceBand: 1, startTime: "14:00" },
      { name: "Nagamachi samurai district", nameAr: "حي ناغاماتشي للساموراي", why: "Earth walls wrapped in straw mats against the winter; the Nomura house is the one worth going inside.", whyAr: "جدران طينية يلفونها بحصير القش ضد الشتا؛ وبيت نومورا هو اللي يستاهل الدخول.", category: "walk", rating: 4.3, priceBand: 1, startTime: "16:00" },
    ],
  },
  {
    key: "kanazawa-shirakawa",
    title: "Out to Shirakawa-gō",
    titleAr: "طلعة إلى شيراكاوا-غو",
    places: [
      { name: "Shirakawa-gō (Ogimachi)", nameAr: "شيراكاوا-غو (أوغيماتشي)", why: "Thatched farmhouses in a closed valley, 75 minutes by bus — reserve the seat, it sells out the day before.", whyAr: "بيوت مزارع بسقوف قش بوادي مغلق، ٧٥ دقيقة بالباص — احجزوا المقعد، يخلص من اليوم اللي قبله.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
      { name: "Wada House", nameAr: "بيت وادا", why: "Climb up into the roof space and look at the joints — the whole frame is tied with rope, not a nail in it.", whyAr: "اطلعوا لفراغ السقف وشوفوا الوصلات — الهيكل كله مربوط بالحبال، ما فيه ولا مسمار.", category: "sight", rating: 4.3, priceBand: 1, startTime: "11:15" },
      { name: "Irori", nameAr: "مطعم إيروري", why: "Hōba-miso — miso and mountain vegetables grilled on a magnolia leaf over charcoal at your own sunken hearth — in a farmhouse in the middle of the village.", whyAr: "هوبا-ميسو — ميسو وخضار جبلية تُشوى على ورقة ماغنوليا فوق الفحم عند موقد غائر خاص فيكم — ببيت مزرعة وسط القرية.", category: "food", rating: 4.2, priceBand: 1, startTime: "12:30", dietary: ["vegetarian"] },
      { name: "Shiroyama viewpoint", nameAr: "مطل شيرو-ياما", why: "Twenty minutes uphill for the photograph everyone came for — be up there before the tour buses arrive at three.", whyAr: "عشرين دقيقة طلوع للصورة اللي جا لها الكل — كونوا فوق قبل ما توصل باصات الجولات الساعة ٣.", category: "nature", rating: 4.6, priceBand: 0, startTime: "14:00" },
    ],
  },
];

const HIROSHIMA_DAYS: CuratedDay[] = [
  {
    key: "hiroshima-peace",
    title: "Peace Park",
    titleAr: "حديقة السلام",
    places: [
      { name: "Hiroshima Peace Memorial Museum", nameAr: "متحف هيروشيما التذكاري للسلام", why: "Give it two hours, and don't put anything demanding in the afternoon after it.", whyAr: "أعطوه ساعتين، ولا ترتبون شي ثقيل بعده بالعصر.", category: "sight", rating: 4.7, priceBand: 1, startTime: "09:00" },
      { name: "A-Bomb Dome and the cenotaph", nameAr: "قبة القنبلة والنصب التذكاري", why: "Walk the park along the axis from the cenotaph to the dome — that line was drawn on purpose, and you feel it.", whyAr: "امشوا الحديقة على الخط الممتد من النصب للقبة — هالخط مرسوم بقصد، وتحسونه.", category: "sight", rating: 4.7, priceBand: 0, startTime: "11:30" },
      { name: "Okonomimura", nameAr: "أوكونومي-مورا", why: "Four floors of okonomiyaki griddles in one building — Hiroshima's version layers cabbage, noodles and a fried egg, and the pork belly on top is standard unless you say otherwise.", whyAr: "أربعة طوابق صواني أوكونوميّاكي بمبنى واحد — ونسخة هيروشيما تطبّق الملفوف والنودلز وبيضة مقلية، ولحم الخنزير فوقها أساسي إلا إذا قلتوا غير كذا.", category: "food", rating: 4.2, priceBand: 1, startTime: "13:30", dietary: ["pork-served"] },
    ],
  },
  {
    key: "hiroshima-miyajima",
    title: "Miyajima",
    titleAr: "ميّاجيما",
    places: [
      { name: "Itsukushima Shrine", nameAr: "ضريح إتسوكوشيما", why: "Check the tide table before you leave: high water for the torii floating, low water to walk right out to it.", whyAr: "شوفوا جدول المد قبل ما تطلعون: المد العالي عشان البوابة تطفو، والجزر عشان تمشون لها.", category: "sight", rating: 4.7, priceBand: 1, startTime: "09:00" },
      { name: "Mount Misen", nameAr: "جبل ميسين", why: "Ropeway for most of it, then thirty steep minutes on foot — the whole Inland Sea opens up from the top.", whyAr: "تلفريك لأغلب الطريق، وبعدين ثلاثين دقيقة صعود مشي — والبحر الداخلي كله ينفتح من فوق.", category: "nature", rating: 4.6, priceBand: 2, startTime: "11:00" },
      { name: "Anago-meshi on Omotesandō", nameAr: "أناغو-ميشي بشارع أوموتيساندو", why: "Grilled saltwater eel over rice — it's the island's dish, and better than the oysters everyone photographs.", whyAr: "أنقليس بحري مشوي على رز — أكلة الجزيرة، وأطيب من المحار اللي يصوره الكل.", category: "food", rating: 4.5, priceBand: 2, startTime: "14:00", dietary: ["seafood"] },
      { name: "Daishō-in", nameAr: "معبد دايشوإين", why: "Up the hill away from the crowd — spin the sutra wheels lining the staircase on your way through.", whyAr: "فوق التلة بعيد عن الزحمة — لفّوا أسطوانات السوترا الممتدة على الدرج وأنتم طالعين.", category: "sight", rating: 4.7, priceBand: 0, startTime: "16:00" },
    ],
  },
  {
    key: "hiroshima-garden",
    title: "Garden, castle, arcade",
    titleAr: "حديقة وقلعة وممشى",
    places: [
      { name: "Shukkei-en", nameAr: "حديقة شوكّيإن", why: "A whole landscape shrunk to a garden you can walk in twenty-five minutes, and the carp come to meet you.", whyAr: "منظر طبيعي كامل مصغّر بحديقة تمشونها بخمسة وعشرين دقيقة، والأسماك تجي تستقبلكم.", category: "nature", rating: 4.4, priceBand: 1, startTime: "09:30" },
      { name: "Hiroshima Castle", nameAr: "قلعة هيروشيما", why: "The keep is a 1958 rebuild, but the moat walk and the trees that survived 1945 are the real thing.", whyAr: "البرج إعادة بناء من ١٩٥٨، لكن ممشى الخندق والأشجار اللي نجت من ١٩٤٥ أصلية.", category: "sight", rating: 4.2, priceBand: 1, startTime: "11:00" },
      { name: "Kanawa oyster boat", nameAr: "قارب المحار كانَاوا", why: "A restaurant on a boat moored in the river — oysters off the company's own rafts in the bay, grilled, fried and raw, and the kitchen has cooked nothing else since 1967.", whyAr: "مطعم على قارب راسي بالنهر — محار من أطواف الشركة نفسها بالخليج، مشوي ومقلي ونيء، والمطبخ ما طبخ غيره من ١٩٦٧.", category: "food", rating: 4.4, priceBand: 3, startTime: "13:00", dietary: ["seafood"] },
      { name: "Hondōri arcade", nameAr: "ممشى هوندوري", why: "A covered kilometre of shops and coffee — this is where the city actually spends its Saturday.", whyAr: "كيلو كامل مسقوف محلات وقهوة — هنا تقضي المدينة سبتها فعلًا.", category: "shop", rating: 4.3, priceBand: 1, startTime: "15:00" },
    ],
  },
];

const SAPPORO_DAYS: CuratedDay[] = [
  {
    key: "sapporo-odori",
    title: "Ōdori and the ramen alley",
    titleAr: "أودوري وزقاق الرامن",
    places: [
      { name: "Ōdori Park", nameAr: "حديقة أودوري", why: "A park one block wide and twelve blocks long cutting straight through the middle of the city — walk the whole thing.", whyAr: "حديقة بعرض بلوك وطول اثنا عشر بلوك تشق وسط المدينة — امشوها كاملة.", category: "walk", rating: 4.4, priceBand: 0, startTime: "10:00" },
      { name: "Nijō Market", nameAr: "سوق نيجو", why: "Crab and sea urchin bowls eaten at the counter — ask the price before you sit down, not after.", whyAr: "أطباق سلطعون وقنفذ بحر تتاكل عند الطاولة — اسألوا عن السعر قبل ما تقعدون، مو بعدها.", category: "food", rating: 4.1, priceBand: 2, startTime: "12:00", dietary: ["seafood"] },
      { name: "Sapporo TV Tower", nameAr: "برج تلفزيون سابورو", why: "The view straight down the length of Ōdori, and it costs a third of what the mountain does.", whyAr: "إطلالة على طول أودوري من أوله لآخره، وسعره ثلث اللي بالجبل.", category: "sight", rating: 4.1, priceBand: 1, startTime: "17:00" },
      { name: "Ganso Ramen Yokochō", nameAr: "زقاق غانسو رامن", why: "Eight seats a shop, and the miso ramen comes with sweetcorn, butter and a film of fat on top that keeps it scalding to the last spoon — the pork slices come as standard.", whyAr: "ثمانية كراسي بكل محل، ورامن الميسو يجي بذرة حلوة وزبدة وفوقه طبقة دهن تخليه حار لآخر ملعقة — وشرائح لحم الخنزير أساسية فيه.", category: "food", rating: 4.1, priceBand: 1, startTime: "19:00", dietary: ["pork-served"] },
    ],
  },
  {
    key: "sapporo-otaru",
    title: "Otaru for the day",
    titleAr: "يوم بأوتارو",
    places: [
      { name: "Otaru Canal", nameAr: "قناة أوتارو", why: "Thirty-five minutes by train: stone warehouses along a working canal, and it is better under snow than under sun.", whyAr: "خمسة وثلاثين دقيقة بالقطار: مخازن حجرية على قناة شغّالة، وهي أحلى تحت الثلج منها تحت الشمس.", category: "walk", rating: 4.3, priceBand: 0, startTime: "10:30" },
      { name: "Sakaimachi glass workshops", nameAr: "ورش الزجاج بشارع ساكايماتشي", why: "The glass industry here started with fishing floats — you can blow your own piece in about an hour.", whyAr: "صناعة الزجاج هنا بدأت من عوّامات الصيد — وتقدرون تنفخون قطعتكم بساعة تقريبًا.", category: "shop", rating: 4.3, priceBand: 1, startTime: "12:00" },
      { name: "Otaru Sushiya-dōri", nameAr: "شارع السوشي بأوتارو", why: "A whole street of sushi counters fed by that morning's boats — scallop, herring roe and Hokkaidō salmon — and the set menus cost less than in Sapporo.", whyAr: "شارع كامل مطاعم سوشي من صيد نفس الصباح — إسكالوب وبيض الرنجة وسلمون هوكايدو — وقوائمه أرخص من سابورو.", category: "food", rating: 4.5, priceBand: 2, startTime: "14:00", dietary: ["seafood"] },
    ],
  },
  {
    key: "sapporo-jozankei",
    title: "Jōzankei gorge",
    titleAr: "وادي جوزانكي",
    places: [
      { name: "Hoheikyo Onsen", nameAr: "أونسن هوهيكيو", why: "An hour out of the city into a gorge — outdoor rock baths looking straight into the trees, and in October the colour comes right down to the water.", whyAr: "ساعة برا المدينة داخل وادي — أحواض حجرية مكشوفة تطل على الشجر مباشرة، وبأكتوبر ينزل اللون لين حافة الماي.", category: "rest", rating: 4.5, priceBand: 2, startTime: "11:00" },
      { name: "Futami Suspension Bridge", nameAr: "جسر فوتامي المعلّق", why: "The green river runs right under the bridge; come in October and the entire gorge turns colour around it.", whyAr: "النهر الأخضر يجري تحت الجسر مباشرة؛ تعالوا بأكتوبر وبيتلون الوادي كله حوله.", category: "nature", rating: 4.3, priceBand: 0, startTime: "14:00" },
      { name: "Jōzankei foot baths", nameAr: "أحواض الأرجل بجوزانكي", why: "Free foot baths along the main street — sit in one while you wait for the bus back.", whyAr: "أحواض أرجل مجانية على الشارع الرئيسي — اقعدوا بوحدة وأنتم تنتظرون باص الرجعة.", category: "rest", rating: 4.2, priceBand: 0, startTime: "16:00" },
      { name: "Soup Curry Garaku", nameAr: "سوب كاري غاراكو", why: "Sapporo's own dish, back in town: a whole roast chicken leg and charred vegetables standing in a thin spiced broth, and you pick the heat from one to forty.", whyAr: "أكلة سابورو نفسها، ورجعتكم للمدينة: فخذ دجاج كامل محمّر وخضار مشوية واقفة بمرق متبّل خفيف، وأنتم تختارون الحرارة من واحد لأربعين.", category: "food", rating: 4.5, priceBand: 2, startTime: "19:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "sapporo-maruyama",
    title: "Maruyama and the mountain",
    titleAr: "ماروياما والجبل",
    places: [
      { name: "Hokkaidō Jingu", nameAr: "ضريح هوكايدو", why: "A shrine standing inside a real forest — the squirrels on the path are not part of a garden, they just live there.", whyAr: "ضريح واقف داخل غابة حقيقية — السناجب على الممشى مو جزء من حديقة، هي ساكنة هناك.", category: "sight", rating: 4.5, priceBand: 0, startTime: "09:30" },
      { name: "Hokkaido University ginkgo avenue", nameAr: "ممشى الجنكة بجامعة هوكايدو", why: "A campus anybody can walk into, and in the last week of October the ginkgo avenue is the reason to be in the city.", whyAr: "حرم جامعي يدخله أي أحد، وبآخر أسبوع من أكتوبر يصير ممشى الجنكة هو سبب وجودكم بالمدينة.", category: "walk", rating: 4.5, priceBand: 0, startTime: "12:00" },
      { name: "Mount Moiwa ropeway", nameAr: "تلفريك جبل مويوا", why: "Go up for the last of the daylight and stay for the dark — the city's whole grid switches on underneath you.", whyAr: "اطلعوا لآخر ضوء النهار واقعدوا لين يظلم — شبكة المدينة كاملة تضوي تحتكم.", category: "sight", rating: 4.6, priceBand: 2, startTime: "17:30" },
      { name: "Jingisukan Daruma", nameAr: "جينغيسكان دارُوما", why: "Mutton grilled over a charcoal dome at a fourteen-seat counter — one dish, one dipping sauce, unchanged since 1954, and the queue outside is all locals.", whyAr: "لحم ضأن يُشوى على قبة فحم عند طاولة بأربعة عشر كرسي — أكلة وحدة وصلصة وحدة، ما تغيرت من ١٩٥٤، والطابور برا كله من أهل المدينة.", category: "food", rating: 4.3, priceBand: 2, startTime: "20:00", dietary: ["unverified"] },
    ],
  },
];

/* ── Japan: day-trip shapes ───────────────────────────────────────────── */

const NARA_DAYTRIP: CuratedDay = {
  key: "nara-daytrip",
  title: "Nara in a day",
  titleAr: "نارا بيوم",
  places: [
    { name: "Tōdai-ji", nameAr: "معبد تودايجي", why: "Forty minutes by train, and the Great Buddha hall is the largest wooden building most people will ever stand inside.", whyAr: "أربعين دقيقة بالقطار، وقاعة بوذا الكبير أكبر مبنى خشبي بيوقفون بداخله بحياتهم.", category: "sight", rating: 4.7, priceBand: 1, startTime: "09:30" },
    { name: "Nara Park deer", nameAr: "غزلان حديقة نارا", why: "Bow to them and they bow back — buy the crackers at the end of the visit, not the start, or you'll be followed all day.", whyAr: "انحنوا لها وتنحني لكم — واشتروا البسكوت بآخر الزيارة مو بأولها، وإلا بتتبعكم طول اليوم.", category: "nature", rating: 4.5, priceBand: 0, startTime: "11:00" },
    { name: "Kasuga Taisha", nameAr: "ضريح كاسوغا تايشا", why: "Three thousand stone lanterns line the approach; the dark inner hall of mirrors is the part worth the ticket.", whyAr: "ثلاثة آلاف فانوس حجري على طول الممشى؛ والقاعة الداخلية المعتمة بمراياها هي اللي تستاهل التذكرة.", category: "sight", rating: 4.5, priceBand: 1, startTime: "13:00" },
    { name: "Naramachi", nameAr: "حي نارا-ماتشي", why: "Merchant lanes with lattice fronts and small coffee places — quieter than the park by a wide margin.", whyAr: "أزقة تجار بواجهات مشبكة وكوفيات صغيرة — أهدأ من الحديقة بفرق واضح.", category: "walk", rating: 4.3, priceBand: 1, startTime: "15:30" },
  ],
};

const NIKKO_DAYTRIP: CuratedDay = {
  key: "nikko-daytrip",
  title: "Nikkō in a day",
  titleAr: "نيكّو بيوم",
  places: [
    { name: "Shinkyō Bridge", nameAr: "جسر شينكيو", why: "Two hours from Asakusa on the Tobu limited express — take the 7:30 and you get the shrines before the buses do.", whyAr: "ساعتين من أساكوسا بقطار توبو السريع — خذوا اللي ٧:٣٠ وبتوصلون المعابد قبل الباصات.", category: "sight", rating: 4.2, priceBand: 0, startTime: "09:30" },
    { name: "Tōshō-gū", nameAr: "ضريح توشوغو", why: "Lacquer, gold and carving on every single surface — the exact opposite of every other shrine in Japan, on purpose.", whyAr: "ورنيش وذهب ونقش على كل سطح — عكس أي ضريح ثاني باليابان تمامًا، وبقصد.", category: "sight", rating: 4.6, priceBand: 2, startTime: "10:00" },
    { name: "Kegon Falls", nameAr: "شلالات كيغون", why: "The lift drops you to the base of a hundred-metre fall, and the bus up the hairpin road is half the reason to come.", whyAr: "المصعد ينزلكم لأسفل شلال بمئة متر، وطلعة الباص باللفات نص السبب اللي جيتوا عشانه.", category: "nature", rating: 4.5, priceBand: 1, startTime: "13:30" },
    { name: "Lake Chūzenji", nameAr: "بحيرة تشوزينجي", why: "A mountain lake at 1,200 metres — the air changes the second you step off the bus, even in August.", whyAr: "بحيرة جبلية على ارتفاع ١٢٠٠ متر — الهوا يتغير أول ما تنزلون من الباص، حتى بأغسطس.", category: "nature", rating: 4.5, priceBand: 0, startTime: "15:00" },
  ],
};

const KAMAKURA_DAYTRIP: CuratedDay = {
  key: "kamakura-daytrip",
  title: "Kamakura in a day",
  titleAr: "كاماكورا بيوم",
  places: [
    { name: "Kōtoku-in Great Buddha", nameAr: "بوذا الكبير بمعبد كوتوكوإين", why: "Sitting out in the open since a tsunami took the hall away in 1498 — and for twenty yen you can go inside him.", whyAr: "قاعد بالخلا من ١٤٩٨ لما جرف التسونامي القاعة — وبعشرين ين تقدرون تدخلون جوّاه.", category: "sight", rating: 4.6, priceBand: 1, startTime: "10:00" },
    { name: "Hase-dera", nameAr: "معبد هاسي-ديرا", why: "Terraces climbing the hillside with the bay underneath, and a cave of small carved figures at the bottom of it.", whyAr: "مدرجات طالعة بالمنحدر والخليج تحتها، وبأسفلها كهف منحوتات صغيرة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "11:30" },
    { name: "Komachi-dōri", nameAr: "شارع كوماتشي", why: "Lunch as a walk between the station and the big shrine — the whitebait, raw or grilled, is the local order.", whyAr: "غداء وأنتم ماشين بين المحطة والضريح الكبير — والشيراسو، نيء أو مشوي، هو طلب أهل المنطقة.", category: "food", rating: 4.2, priceBand: 1, startTime: "13:30", dietary: ["seafood", "unverified"] },
    { name: "Enoden line to Enoshima", nameAr: "قطار إينودن إلى إينوشيما", why: "A one-carriage train that runs through people's back gardens and then along the sea wall — sit on the right.", whyAr: "قطار بعربة وحدة يمر بين حدائق البيوت وبعدين على جدار البحر — اقعدوا على اليمين.", category: "walk", rating: 4.5, priceBand: 1, startTime: "15:30" },
  ],
};

const HIMEJI_DAYTRIP: CuratedDay = {
  key: "himeji-daytrip",
  title: "Himeji in a day",
  titleAr: "هيميجي بيوم",
  places: [
    { name: "Himeji Castle", nameAr: "قلعة هيميجي", why: "The one great castle never burned down or rebuilt — be there at opening, because the keep is a queue by eleven.", whyAr: "القلعة الكبرى الوحيدة اللي ما احترقت ولا أُعيد بناؤها — كونوا عندها مع الافتتاح، لأن البرج يصير طابور الساعة ١١.", category: "sight", rating: 4.6, priceBand: 1, startTime: "09:00" },
    { name: "Kōko-en", nameAr: "حديقة كوكوإن", why: "Nine walled gardens side by side next to the castle, and the keep looks over the wall into every one of them.", whyAr: "تسع حدائق مسوّرة جنب بعض بجانب القلعة، والبرج يطل من فوق السور على كل وحدة منها.", category: "nature", rating: 4.4, priceBand: 1, startTime: "11:30" },
    { name: "Engyō-ji on Mount Shosha", nameAr: "معبد إنغيوجي بجبل شوشا", why: "Ropeway up to wooden halls standing in cedar forest — this is where they filmed The Last Samurai, and it earns it.", whyAr: "تلفريك لقاعات خشبية واقفة بين غابة أرز — هنا صوّروا «الساموراي الأخير»، وتستاهل.", category: "sight", rating: 4.6, priceBand: 2, startTime: "14:00" },
  ],
};

const HAKONE_DAYTRIP: CuratedDay = {
  key: "hakone-daytrip",
  title: "Hakone in a day",
  titleAr: "هاكوني بيوم",
  places: [
    { name: "Hakone Open-Air Museum", nameAr: "متحف هاكوني المفتوح", why: "Eighty-five minutes on the Romancecar from Shinjuku — book a forward seat and start here before the coaches land.", whyAr: "خمسة وثمانين دقيقة بقطار الرومانس كار من شينجوكو — احجزوا مقعد أمامي وابدأوا من هنا قبل ما تنزل الباصات.", category: "sight", rating: 4.6, priceBand: 2, startTime: "10:30" },
    { name: "Ōwakudani", nameAr: "أواكوداني", why: "The ropeway crosses right over the steaming valley — that smell is real sulphur, and the black eggs are boiled in it.", whyAr: "التلفريك يعدي فوق الوادي اللي يطلع منه البخار — الريحة كبريت حقيقي، والبيض الأسود مسلوق فيه.", category: "nature", rating: 4.4, priceBand: 2, startTime: "13:00" },
    { name: "Hakone Shrine torii", nameAr: "بوابة ضريح هاكوني", why: "The red gate standing in Lake Ashi, then the boat back across — time it so the last leg is at golden hour.", whyAr: "البوابة الحمراء الواقفة ببحيرة أشي، وبعدها القارب راجع — رتبوا الوقت بحيث آخر مرحلة تكون بساعة الذهب.", category: "sight", rating: 4.6, priceBand: 1, startTime: "15:00" },
    { name: "Amazake Chaya", nameAr: "بيت الشاي أماساكي-تشايا", why: "A thatched teahouse on the old Tokaido road, run by the same family for four hundred years — grilled rice cakes off the charcoal, one brushed with soy and one rolled in black sesame.", whyAr: "بيت شاي بسقف قش على طريق التوكايدو القديم، تديره نفس العائلة من أربعمئة سنة — كعك رز مشوي من على الفحم، واحد مدهون بصلصة الصويا وواحد ملفوف بالسمسم الأسود.", category: "food", rating: 4.4, priceBand: 1, startTime: "16:30", dietary: ["vegetarian"] },
  ],
};

/* ── Istanbul ─────────────────────────────────────────────────────────── */

const ISTANBUL_DAYS: CuratedDay[] = [
  {
    key: "istanbul-sultanahmet",
    title: "Sultanahmet, on foot",
    titleAr: "السلطان أحمد… مشي",
    places: [
      { name: "Hagia Sophia", nameAr: "آيا صوفيا", why: "First thing in the morning — the light comes through the upper windows.", whyAr: "أول شي بالصبح — الضوء يدخل من الشبابيك العلوية.", category: "sight", rating: 4.7, priceBand: 2, startTime: "08:30" },
      { name: "Blue Mosque", nameAr: "المسجد الأزرق", why: "Across the square. Check prayer times before you walk over.", whyAr: "قبال الساحة. شوفوا أوقات الصلاة قبل ما تمشون.", category: "sight", rating: 4.7, priceBand: 0, startTime: "10:30" },
      { name: "Sultanahmet Köftecisi Selim Usta", nameAr: "كفتجي السلطان أحمد — سليم أُسطى", why: "Grilled lamb köfte with a white bean salad, pickled chillies and semolina halva — the shop has served those four things and nothing else since 1920.", whyAr: "كفتة غنم مشوية مع سلطة فاصولياء بيضاء وفلفل مخلل وحلاوة السميد — المحل يقدم هالأربعة وبس من سنة ١٩٢٠.", category: "food", rating: 4.4, priceBand: 1, startTime: "12:30", dietary: ["halal"] },
      { name: "Grand Bazaar", nameAr: "البازار الكبير", why: "Go in without a list. Leave before you're tired, not after.", whyAr: "ادخلوا بدون قائمة. واطلعوا قبل ما تتعبون، مو بعدها.", category: "shop", rating: 4.3, priceBand: 2, startTime: "14:30" },
    ],
  },
  {
    key: "istanbul-palace",
    title: "Palace day",
    titleAr: "يوم القصور",
    places: [
      { name: "Topkapı Palace", nameAr: "قصر توبكابي", why: "Three hours minimum. The Harem ticket is worth the extra.", whyAr: "ثلاث ساعات على الأقل. وتذكرة الحرم تستاهل الزيادة.", category: "sight", rating: 4.6, priceBand: 3, startTime: "09:00" },
      { name: "Gülhane Park", nameAr: "حديقة غولهانة", why: "Downhill from the palace gate — tea under the plane trees.", whyAr: "نازل من باب القصر — شاي تحت أشجار الدلب.", category: "nature", rating: 4.5, priceBand: 0, startTime: "13:30" },
      { name: "Spice Bazaar", nameAr: "السوق المصري", why: "Buy the pistachios here, not at the Grand Bazaar.", whyAr: "اشتروا الفستق من هنا، مو من البازار الكبير.", category: "shop", rating: 4.4, priceBand: 1, startTime: "16:00" },
      { name: "Hamdi Restaurant", nameAr: "مطعم حمدي", why: "Pistachio kebab and Urfa lamb off a charcoal grill, eaten on the top floor with the Golden Horn and the ferries directly under the window — ask for the terrace when you book.", whyAr: "كباب الفستق وضأن أورفا من على الفحم، تاكلونه بالدور الأعلى والقرن الذهبي والعبّارات تحت الشباك مباشرة — اطلبوا الشرفة وأنتم تحجزون.", category: "food", rating: 4.4, priceBand: 2, startTime: "18:00", dietary: ["halal"] },
    ],
  },
  {
    key: "istanbul-bosphorus",
    title: "The Bosphorus",
    titleAr: "البسفور",
    places: [
      { name: "Bosphorus ferry to Anadolu Kavağı", nameAr: "عبّارة البسفور إلى أنادولو كاواغي", why: "The public ferry, not the tourist cruise — same water, a third of the price.", whyAr: "العبّارة العامة، مو الجولة السياحية — نفس الماء وبثلث السعر.", category: "sight", rating: 4.8, priceBand: 1, startTime: "10:00" },
      { name: "Fish lunch at the pier", nameAr: "غداء سمك عند الميناء", why: "Whatever came in that morning — sea bass or bonito — grilled whole at the quayside tables, with a tomato salad and bread.", whyAr: "اللي جا الصبح — قاروص أو بالميدا — مشوي كامل على طاولات الرصيف، ومعه سلطة طماطم وخبز.", category: "food", rating: 4.4, priceBand: 2, startTime: "13:30", dietary: ["halal", "seafood"] },
    ],
  },
  {
    key: "istanbul-modern",
    title: "Modern side",
    titleAr: "الجهة العصرية",
    places: [
      { name: "İstiklal Avenue", nameAr: "شارع الاستقلال", why: "Walk it end to end once; the side streets are the real find.", whyAr: "امشوه من طرف لطرف مرة؛ الشوارع الجانبية هي الاكتشاف الحقيقي.", category: "walk", rating: 4.3, priceBand: 1, startTime: "11:00" },
      { name: "Galata Tower", nameAr: "برج غلطة", why: "Skip the queue and drink the view from a rooftop nearby instead.", whyAr: "تجاوزوا الطابور واشربوا الإطلالة من سطح قريب بدالها.", category: "sight", rating: 4.4, priceBand: 2, startTime: "14:00" },
      { name: "Karaköy for dinner", nameAr: "كاراكوي للعشاء", why: "Where the city eats when it isn't performing for anyone — grilled fish sandwiches by the water, lahmacun off a wood oven, and künefe pulled hot from the tray after.", whyAr: "وين تاكل المدينة لما ما تكون تمثل على أحد — سندويش سمك مشوي عند الماء، ولحم بعجين من فرن حطب، وكنافة تطلع سخنة من الصينية بعدها.", category: "food", rating: 4.5, priceBand: 2, startTime: "19:30", dietary: ["halal"] },
    ],
  },
  {
    key: "istanbul-asia",
    title: "Asia, briefly",
    titleAr: "آسيا… سريعًا",
    places: [
      { name: "Kadıköy market streets", nameAr: "أسواق كاديكوي", why: "Twenty minutes on a ferry and the tourists thin out completely — grilled köfte in bread, stuffed mussels sold by the piece, and Turkish delight cut in front of you.", whyAr: "عشرين دقيقة بالعبّارة والسياح يختفون تمامًا — كفتة مشوية بالخبز، وبلح البحر المحشي بالحبة، وراحة تُقطع قدامكم.", category: "food", rating: 4.6, priceBand: 1, startTime: "11:00", dietary: ["halal"] },
      { name: "Moda seafront walk", nameAr: "كورنيش مودا", why: "Tea on the grass facing the old city you spent three days inside.", whyAr: "شاي على العشب وقبالكم المدينة القديمة اللي قضيتم فيها ٣ أيام.", category: "walk", rating: 4.6, priceBand: 0, startTime: "16:00" },
    ],
  },
  {
    key: "istanbul-goldenhorn",
    title: "The Golden Horn",
    titleAr: "القرن الذهبي",
    places: [
      { name: "Kariye Mosque (Chora)", nameAr: "جامع كاريا (خورا)", why: "Byzantine mosaic on every curve of the ceiling — it reopened in 2024 and is still half empty on a weekday.", whyAr: "فسيفساء بيزنطية على كل انحناءة بالسقف — فتح من جديد سنة ٢٠٢٤ ولسه نص فاضي بأيام الأسبوع.", category: "sight", rating: 4.7, priceBand: 1, startTime: "09:30" },
      { name: "Asitane", nameAr: "مطعم آسيتانة", why: "Ottoman palace dishes rebuilt from the Topkapı kitchen ledgers — melon stuffed with lamb and pistachio, quince cooked with mince — in a courtyard beside the Kariye mosque.", whyAr: "أطباق المطبخ العثماني السلطاني أُعيدت من دفاتر مطابخ توبكابي — شمام محشي بلحم الضأن والفستق، وسفرجل مطبوخ باللحم المفروم — بفناء جنب جامع كاريا.", category: "food", rating: 4.4, priceBand: 3, startTime: "12:30", dietary: ["halal"] },
      { name: "Balat streets", nameAr: "شوارع بلاط", why: "Painted houses stacked up a steep hill — the antique shops on Vodina are what makes the detour worth it.", whyAr: "بيوت ملونة مركومة على تلة حادة — ومحلات الأنتيك بشارع فودينا هي اللي تخلي اللفة تستاهل.", category: "walk", rating: 4.4, priceBand: 0, startTime: "14:00" },
      { name: "Eyüp Sultan Mosque", nameAr: "جامع أبي أيوب الأنصاري", why: "The mosque this city loves most, and the calmest courtyard in it — go outside the Friday hour.", whyAr: "المسجد الأحب على قلب هالمدينة، وأهدأ صحن فيها — روحوا بغير وقت الجمعة.", category: "sight", rating: 4.8, priceBand: 0, startTime: "16:00" },
    ],
  },
];

const PRINCES_ISLANDS_DAYTRIP: CuratedDay = {
  key: "princes-islands-daytrip",
  title: "Büyükada, no cars",
  titleAr: "بويوك أضة… بدون سيارات",
  places: [
    { name: "Büyükada waterfront", nameAr: "واجهة بويوك أضة", why: "Ninety minutes on the ferry from Kabataş and there isn't a private car on the island — wooden Ottoman houses and bicycles instead.", whyAr: "ساعة ونص بالعبّارة من كاباتاش وما في سيارة خاصة بالجزيرة — بيوت عثمانية خشبية ودراجات بدالها.", category: "walk", rating: 4.5, priceBand: 0, startTime: "10:30" },
    { name: "Aya Yorgi hill", nameAr: "تلة آيا يورغي", why: "Walk up or take the electric shuttle — sea on three sides at the top and the city sitting small on the horizon.", whyAr: "اطلعوا مشي أو خذوا الباص الكهربائي — فوق بتلقون البحر من ثلاث جهات والمدينة صغيرة بالأفق.", category: "nature", rating: 4.5, priceBand: 0, startTime: "12:30" },
    { name: "Lunch one street back", nameAr: "غداء بالشارع اللي وراء الواجهة", why: "Everything on the harbour front is priced for day-trippers — one street behind it the same grilled fish, meze and bread cost half.", whyAr: "كل اللي على الواجهة مسعّر لزوار اليوم — وبالشارع اللي وراه نفس السمك المشوي والمازة والخبز بنص السعر.", category: "food", rating: 4.2, priceBand: 2, startTime: "14:30", dietary: ["halal", "seafood"] },
    { name: "The island loop by bike", nameAr: "دورة الجزيرة بالدراجة", why: "An hour of pine and sea on a rented bike, and the loop road has no traffic on it to think about.", whyAr: "ساعة صنوبر وبحر بدراجة مستأجرة، وطريق الدورة ما فيه سيارات تشغل بالكم.", category: "walk", rating: 4.4, priceBand: 1, startTime: "16:00" },
  ],
};

const BURSA_DAYTRIP: CuratedDay = {
  key: "bursa-daytrip",
  title: "Bursa in a day",
  titleAr: "بورصة بيوم",
  places: [
    { name: "Ulu Cami", nameAr: "الجامع الكبير", why: "Fast ferry to Mudanya and a shuttle up — two and a half hours each way, and the twenty-domed prayer hall alone repays it.", whyAr: "عبّارة سريعة لمودانيا وباص لفوق — ساعتين ونص بكل اتجاه، وقاعة الصلاة بقبابها العشرين لحالها تعوّض.", category: "sight", rating: 4.8, priceBand: 0, startTime: "10:30" },
    { name: "Koza Han", nameAr: "خان كوزا", why: "A 15th-century silk caravanserai still trading silk — sit in the courtyard under the mulberry tree before you buy anything.", whyAr: "خان حرير من القرن الخامس عشر لايزال يبيع الحرير — اقعدوا بالفناء تحت شجرة التوت قبل ما تشترون شي.", category: "shop", rating: 4.6, priceBand: 1, startTime: "12:00" },
    { name: "Kebapçı İskender", nameAr: "مطعم كبابجي إسكندر", why: "Sliced lamb over torn bread with tomato and melted butter poured at the table — the dish was invented in this family's kitchen in 1867, and you order it plain, not the 'special'.", whyAr: "شرائح ضأن على خبز مقطّع مع طماطم وزبدة ذايبة تُسكب على الطاولة — الأكلة اخترعوها بمطبخ هالعائلة سنة ١٨٦٧، واطلبوها عادية مو «سبيشال».", category: "food", rating: 4.3, priceBand: 2, startTime: "13:30", dietary: ["halal"] },
    { name: "Cumalıkızık", nameAr: "قرية جومالي كيزيك", why: "A 700-year-old Ottoman village twenty minutes out of town, with breakfast tables set out in the cobbled lanes.", whyAr: "قرية عثمانية عمرها ٧٠٠ سنة على بعد عشرين دقيقة، وطاولات فطور منصوبة بأزقتها المبلّطة.", category: "walk", rating: 4.4, priceBand: 1, startTime: "15:30" },
  ],
};

/* ── Georgia ──────────────────────────────────────────────────────────── */

const TBILISI_DAYS: CuratedDay[] = [
  {
    key: "tbilisi-old",
    title: "Old Tbilisi",
    titleAr: "تبليسي القديمة",
    places: [
      { name: "Abanotubani sulphur baths", nameAr: "حمامات الكبريت", why: "The brick domes district — book a private room, it's the local ritual.", whyAr: "حي القباب الطينية — احجزوا غرفة خاصة، هذي عادة أهل البلد.", category: "rest", rating: 4.4, priceBand: 2, startTime: "10:00" },
      { name: "Narikala Fortress", nameAr: "قلعة ناريكالا", why: "Take the cable car up, walk the ridge down into the old town.", whyAr: "اطلعوا بالتلفريك وانزلوا مشي على الحافة للبلدة القديمة.", category: "sight", rating: 4.6, priceBand: 1, startTime: "13:00" },
      { name: "Shardeni Street", nameAr: "شارع شاردني", why: "Dinner outside; every balcony on this street is somebody's restaurant — order khinkali, the pleated dumplings you hold by the knot, and khachapuri to share.", whyAr: "عشاء بالخارج؛ كل بلكونة بهالشارع مطعم لأحد — اطلبوا الخينكالي، فطائر مطوية تمسكونها من العقدة، وخاتشابوري تتشاركونها.", category: "food", rating: 4.2, priceBand: 2, startTime: "19:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "tbilisi-mtskheta",
    title: "Mtskheta, the old capital",
    titleAr: "متسخيتا… العاصمة القديمة",
    places: [
      { name: "Jvari Monastery", nameAr: "دير جفاري", why: "Sixth-century stone on a bare hill above the point where two rivers meet and visibly refuse to mix.", whyAr: "حجر من القرن السادس على تلة جرداء فوق ملتقى نهرين، وتشوفونهم يرفضون يختلطون.", category: "sight", rating: 4.7, priceBand: 0, startTime: "09:30" },
      { name: "Svetitskhoveli Cathedral", nameAr: "كاتدرائية سفيتيتسخوفيلي", why: "Twenty-five minutes out of the city and the most important church in the country stands in a walled yard you can sit in.", whyAr: "خمسة وعشرين دقيقة برا المدينة، وأهم كنيسة بالبلد واقفة بساحة مسوّرة تقدرون تقعدون فيها.", category: "sight", rating: 4.7, priceBand: 1, startTime: "11:00" },
      { name: "Salobie", nameAr: "مطعم سالوبيه", why: "Lobio — red beans cooked in a clay pot with coriander and walnut — with hot mchadi cornbread and pickles, at the roadside place Georgians have stopped at on this exact drive for fifty years.", whyAr: "لوبيو — فاصولياء حمراء مطبوخة بقدر فخار مع كزبرة وجوز — مع خبز ذرة «مشادي» سخن ومخللات، بالمطعم اللي يقف عنده الجورجيون بنفس هالطريق من خمسين سنة.", category: "food", rating: 4.3, priceBand: 1, startTime: "13:00", dietary: ["vegetarian"] },
      { name: "Chronicle of Georgia", nameAr: "سجلّ جورجيا", why: "Sixteen black pillars on a hill above the reservoir, on the way back in — nobody tells you about it and it costs nothing.", whyAr: "ستة عشر عمود أسود على تلة فوق البحيرة، بطريق الرجعة — ما أحد يخبركم عنه وما يكلف شي.", category: "sight", rating: 4.6, priceBand: 0, startTime: "15:00" },
    ],
  },
  {
    key: "tbilisi-museums",
    title: "Museums and markets",
    titleAr: "متاحف وأسواق",
    places: [
      { name: "Georgian National Museum", nameAr: "المتحف الوطني الجورجي", why: "The gold room is small and extraordinary; skip the rest if you're short.", whyAr: "غرفة الذهب صغيرة ومذهلة؛ تجاوزوا الباقي إذا وقتكم ضيق.", category: "sight", rating: 4.4, priceBand: 1, startTime: "10:30" },
      { name: "Dry Bridge Market", nameAr: "سوق الجسر الجاف", why: "Soviet cameras, silver, and junk. Haggle gently.", whyAr: "كاميرات سوفيتية وفضة وخردة. فاصلوا بلطف.", category: "shop", rating: 4.2, priceBand: 1, startTime: "14:00" },
      { name: "Fabrika courtyard", nameAr: "ساحة فابريكا", why: "Old sewing factory, now the courtyard everyone ends up in — a row of small kitchens around it doing dumplings, grilled chicken and Georgian bread straight from the oven.", whyAr: "مصنع خياطة قديم، صار الساحة اللي ينتهي فيها الكل — وحوله صف مطابخ صغيرة تسوّي فطائر ودجاج مشوي وخبز جورجي طالع من الفرن.", category: "food", rating: 4.5, priceBand: 1, startTime: "19:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "tbilisi-green",
    title: "Turtle Lake and the green side",
    titleAr: "بحيرة السلاحف والجهة الخضراء",
    places: [
      { name: "Open Air Museum of Ethnography", nameAr: "متحف الإثنوغرافيا المفتوح", why: "Real houses carried here from every region of Georgia and rebuilt in pine forest — an hour of walking, not of reading labels.", whyAr: "بيوت حقيقية منقولة من كل منطقة بجورجيا وأعيد بناؤها بين الصنوبر — ساعة مشي، مو ساعة قراءة لوحات.", category: "sight", rating: 4.5, priceBand: 1, startTime: "10:30" },
      { name: "Turtle Lake", nameAr: "بحيرة السلاحف", why: "Cable car up from Vake Park to a loop path and the cafés where the city spends its Sunday.", whyAr: "تلفريك من حديقة فاكيه لممشى دائري وللمقاهي اللي تقضي فيها المدينة يوم أحدها.", category: "nature", rating: 4.3, priceBand: 1, startTime: "13:00" },
      { name: "Vera and Kiacheli street", nameAr: "فيرا وشارع كياتشيلي", why: "The residential side of the city — book a table on Kiacheli for chicken in garlic and walnut sauce and aubergine rolls, and you'll likely be the only visitors in the room.", whyAr: "الجهة السكنية من المدينة — احجزوا طاولة بكياتشيلي لدجاج بصلصة الثوم والجوز ولفائف الباذنجان، وغالبًا بتكونون الزوار الوحيدين بالمكان.", category: "food", rating: 4.4, priceBand: 2, startTime: "19:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "tbilisi-slow",
    title: "Slow last day",
    titleAr: "آخر يوم… على مهل",
    places: [
      { name: "Mtatsminda Park", nameAr: "حديقة متاتسميندا", why: "Funicular up for the whole-city view before the airport.", whyAr: "القطار المائل لفوق وإطلالة المدينة كاملة قبل المطار.", category: "nature", rating: 4.5, priceBand: 1, startTime: "10:00" },
      { name: "Puri Guliani", nameAr: "مخبز بوري غولياني", why: "Bread pulled off the wall of a clay tone oven in front of you, and khachapuri and bean-filled lobiani baked to order — eat in or carry it to the airport.", whyAr: "خبز يُسحب من جدار تنور الطين قدامكم، وخاتشابوري ولوبياني محشي فاصولياء يُخبز بالطلب — كلوا بالمكان أو احملوه معكم للمطار.", category: "food", rating: 4.3, priceBand: 1, startTime: "11:30", dietary: ["vegetarian"] },
      { name: "Meidan Bazaar", nameAr: "بازار الميدان", why: "The bazaar runs under the road by the bridge — churchkhela, enamel and wool, and it's the one place worth ten minutes on the way out.", whyAr: "البازار ماشي تحت الشارع جنب الجسر — تشورتشخيلا ومينا وصوف، وهو المكان الوحيد اللي يستاهل عشر دقايق وأنتم طالعين.", category: "shop", rating: 4.2, priceBand: 1, startTime: "13:00" },
    ],
  },
];

const BATUMI_DAYS: CuratedDay[] = [
  {
    key: "batumi-boulevard",
    title: "The boulevard",
    titleAr: "الكورنيش",
    places: [
      { name: "Batumi Boulevard", nameAr: "كورنيش باتومي", why: "Seven kilometres of seafront with bike rentals at both ends — start at the north end and let the wind push you back.", whyAr: "سبعة كيلو واجهة بحرية ومحلات دراجات بالطرفين — ابدأوا من الشمال وخلوا الهوا يدفعكم بالرجعة.", category: "walk", rating: 4.6, priceBand: 0, startTime: "10:00" },
      { name: "Piazza and old Batumi", nameAr: "البياتزا وباتومي القديمة", why: "Mosaic arcades and balconies for the photos, but the lived-in streets one block behind are the actual city.", whyAr: "أروقة فسيفساء وبلكونات للصور، لكن الشوارع المسكونة بلوك ورا هي المدينة الحقيقية.", category: "walk", rating: 4.3, priceBand: 1, startTime: "13:00" },
      { name: "Ali and Nino", nameAr: "تمثال علي ونينو", why: "Two steel figures that move through each other every ten minutes — wait for the full cycle, it's the point.", whyAr: "تمثالين من الفولاذ يمرّون ببعض كل عشر دقايق — انتظروا الدورة كاملة، هي المقصد.", category: "sight", rating: 4.5, priceBand: 0, startTime: "18:00" },
      { name: "Batumi fish market", nameAr: "سوق سمك باتومي", why: "Pick your fish downstairs, carry it upstairs, and a kitchen grills it while you sit — you pay the two separately.", whyAr: "اختاروا سمككم تحت واطلعوه فوق، والمطبخ يشويه وأنتم قاعدين — وتدفعون للاثنين منفصل.", category: "food", rating: 4.3, priceBand: 2, startTime: "19:30", dietary: ["seafood"] },
    ],
  },
  {
    key: "batumi-greencape",
    title: "Green Cape",
    titleAr: "الرأس الأخضر",
    places: [
      { name: "Batumi Botanical Garden", nameAr: "حديقة باتومي النباتية", why: "A hillside of bamboo, magnolia and a Japanese garden dropping straight into the Black Sea — enter at the top gate and walk down.", whyAr: "منحدر فيه خيزران وماغنوليا وحديقة يابانية ينزل مباشرة بالبحر الأسود — ادخلوا من البوابة العليا وانزلوا مشي.", category: "nature", rating: 4.7, priceBand: 1, startTime: "10:00" },
      { name: "Mtsvane Kontskhi beach", nameAr: "شاطئ متسفاني كونتسخي", why: "The pebble beach directly below the garden, and the water is noticeably clearer than it is in town.", whyAr: "شاطئ الحصى تحت الحديقة مباشرة، والماي أصفى بوضوح من داخل المدينة.", category: "nature", rating: 4.2, priceBand: 0, startTime: "13:30" },
      { name: "Argo cable car", nameAr: "تلفريك أرغو", why: "Two and a half kilometres up the ridge — on a clear evening you can see the coast all the way to the Turkish border.", whyAr: "كيلومترين ونص طلوع على الحافة — وبمساء صافي تشوفون الساحل لين الحدود التركية.", category: "sight", rating: 4.4, priceBand: 2, startTime: "17:00" },
      { name: "Adjarian Khachapuri House", nameAr: "بيت الخاتشابوري الأدجاري", why: "Acharuli khachapuri: a boat of bread filled with melted cheese, with butter and a raw egg stirred through it at the table — one is genuinely enough for two.", whyAr: "خاتشابوري أدجاري: قارب خبز محشي جبن ذايب، ويضيفون زبدة وبيضة نية ويقلّبونها على الطاولة — وحدة تكفي اثنين فعلًا.", category: "food", rating: 4.3, priceBand: 1, startTime: "19:30", dietary: ["vegetarian"] },
    ],
  },
  {
    key: "batumi-adjara",
    title: "Into Adjara",
    titleAr: "داخل أدجارا",
    places: [
      { name: "Makhuntseti Waterfall", nameAr: "شلال ماخونتسيتي", why: "Forty minutes inland by car — the water is cold enough to hurt and people swim in it anyway.", whyAr: "أربعين دقيقة للداخل بالسيارة — الماي بارد لدرجة يوجع والناس تسبح فيه على أي حال.", category: "nature", rating: 4.5, priceBand: 1, startTime: "11:00" },
      { name: "Queen Tamar's Arch Bridge", nameAr: "جسر الملكة تامار", why: "A 12th-century stone arch five minutes from the waterfall, still carrying people across the river every day.", whyAr: "قوس حجري من القرن الثاني عشر على بعد خمس دقايق من الشلال، ولا يزال يعبّر الناس النهر كل يوم.", category: "sight", rating: 4.5, priceBand: 0, startTime: "12:30" },
      { name: "Mtirala National Park", nameAr: "منتزه متيرالا الوطني", why: "Temperate rainforest — the wettest place in Georgia, and green in a way nowhere else on this coast is.", whyAr: "غابة مطيرة معتدلة — أكثر بقعة مطرًا بجورجيا، وخضرتها ما لها مثيل بهالساحل.", category: "nature", rating: 4.4, priceBand: 1, startTime: "14:30" },
      { name: "Acharuli Khachapuri House", nameAr: "بيت الخاتشابوري الأدجاري", why: "The regional dish done properly on the way back into town: a boat of bread filled with cheese and butter with a raw egg dropped in at the table, stirred in while it is still moving. One between two is plenty.", whyAr: "طبق المنطقة على أصوله بطريق الرجعة للمدينة: قارب عجين محشي جبن وزبدة، وبيضة نيّة تتكسر فوقه عند الطاولة وتتقلّب وهي لسا تتحرك. وحدة بين اثنين تكفي.", category: "food", rating: 4.5, priceBand: 1, startTime: "17:30", dietary: ["vegetarian"] },
    ],
  },
];

const KAZBEGI_DAYTRIP: CuratedDay = {
  key: "kazbegi-daytrip",
  title: "Kazbegi day",
  titleAr: "يوم كازبيجي",
  places: [
    { name: "Ananuri Fortress", nameAr: "قلعة أنانوري", why: "The stop everyone makes on the way, and rightly.", whyAr: "الوقفة اللي يسويها الكل بالطريق، وعن حق.", category: "sight", rating: 4.6, priceBand: 0, startTime: "09:30" },
    { name: "Russia–Georgia Friendship Monument", nameAr: "نصب الصداقة الجورجية الروسية", why: "A Soviet mosaic drum built on the lip of a thousand-metre drop — five minutes of your day, and you'll remember it.", whyAr: "أسطوانة فسيفساء سوفيتية مبنية على حافة هاوية ألف متر — خمس دقايق من يومكم، وبتتذكرونها.", category: "sight", rating: 4.5, priceBand: 0, startTime: "11:30" },
    { name: "Gergeti Trinity Church", nameAr: "كنيسة جيرجيتي", why: "Three hours each way and worth every minute — go with a driver, not a bus.", whyAr: "ثلاث ساعات رايح ومثلها جاي وتستاهل — خذوا سائق، مو باص.", category: "nature", rating: 4.8, priceBand: 2, startTime: "14:00" },
  ],
};

const SIGHNAGHI_DAYTRIP: CuratedDay = {
  key: "sighnaghi-daytrip",
  // Named for what the day actually contains — a walled hill town, its
  // wall walk and a monastery. It was titled "Wine country" / the Arabic
  // equivalent, which for this audience is a reason not to open the card,
  // and there was never a winery in it.
  title: "Sighnaghi and the valley",
  titleAr: "سيغناغي والوادي",
  places: [
    { name: "Sighnaghi", nameAr: "سيغناغي", why: "Walled hill town over the Alazani valley — two hours out, easy day.", whyAr: "بلدة مسورة على تلة فوق وادي ألازاني — ساعتين برا، يوم خفيف.", category: "sight", rating: 4.7, priceBand: 0, startTime: "09:30" },
    { name: "The town wall walk", nameAr: "ممشى سور البلدة", why: "Four kilometres of wall with twenty-three towers — climb at the Kedeli tower and the whole valley is in front of you.", whyAr: "أربعة كيلو سور وثلاثة وعشرين برج — اطلعوا من برج كيديلي والوادي كله قدامكم.", category: "walk", rating: 4.5, priceBand: 0, startTime: "11:30" },
    { name: "Bodbe Monastery", nameAr: "دير بودبي", why: "Cypress avenue and a valley view that stops the conversation.", whyAr: "ممشى السرو وإطلالة وادي توقف الكلام.", category: "sight", rating: 4.7, priceBand: 0, startTime: "13:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

const REGION_BASES: Record<BaseId, Base> = {
  /* Japan — sleeping bases */
  tokyo: {
    id: "tokyo",
    name: "Tokyo",
    nameAr: "طوكيو",
    country: "JP",
    lat: 35.6762,
    lng: 139.6503,
    photoQuery: "Tokyo Japan skyline",
    match: ["tokyo", "طوكيو"],
    typicalNights: 4,
    maxNights: 6,
    reachable: ["hakone", "nikko", "kamakura"],
    pairsWith: ["kyoto", "hakone", "osaka", "sapporo"],
    days: TOKYO_DAYS,
  },
  kyoto: {
    id: "kyoto",
    name: "Kyoto",
    nameAr: "كيوتو",
    country: "JP",
    lat: 35.0116,
    lng: 135.7681,
    photoQuery: "Kyoto Japan temple",
    match: ["kyoto", "كيوتو"],
    typicalNights: 3,
    maxNights: 5,
    reachable: ["nara", "himeji"],
    pairsWith: ["osaka", "kanazawa", "tokyo", "hiroshima"],
    days: KYOTO_DAYS,
  },
  osaka: {
    id: "osaka",
    name: "Osaka",
    nameAr: "أوساكا",
    country: "JP",
    lat: 34.6937,
    lng: 135.5023,
    photoQuery: "Osaka Japan Dotonbori",
    match: ["osaka", "أوساكا", "اوساكا"],
    typicalNights: 2,
    maxNights: 4,
    reachable: ["nara", "himeji"],
    pairsWith: ["kyoto", "hiroshima", "tokyo", "kanazawa"],
    days: OSAKA_DAYS,
  },
  hakone: {
    id: "hakone",
    name: "Hakone",
    nameAr: "هاكوني",
    country: "JP",
    lat: 35.2324,
    lng: 139.1069,
    photoQuery: "Hakone Japan Lake Ashi Mount Fuji",
    match: ["hakone", "هاكوني"],
    typicalNights: 1,
    maxNights: 2,
    reachable: [],
    pairsWith: ["tokyo", "kyoto"],
    days: HAKONE_DAYS,
    dayTrip: HAKONE_DAYTRIP,
  },
  kanazawa: {
    id: "kanazawa",
    name: "Kanazawa",
    nameAr: "كانازاوا",
    country: "JP",
    lat: 36.5613,
    lng: 136.6562,
    photoQuery: "Kanazawa Japan Kenrokuen garden",
    match: ["kanazawa", "كانازاوا"],
    typicalNights: 2,
    maxNights: 3,
    reachable: [],
    pairsWith: ["kyoto", "tokyo", "osaka"],
    days: KANAZAWA_DAYS,
  },
  hiroshima: {
    id: "hiroshima",
    name: "Hiroshima",
    nameAr: "هيروشيما",
    country: "JP",
    lat: 34.3853,
    lng: 132.4553,
    photoQuery: "Hiroshima Japan Miyajima torii",
    match: ["hiroshima", "miyajima", "هيروشيما", "مياجيما"],
    typicalNights: 2,
    maxNights: 3,
    reachable: [],
    pairsWith: ["osaka", "kyoto"],
    days: HIROSHIMA_DAYS,
  },
  sapporo: {
    id: "sapporo",
    name: "Sapporo",
    nameAr: "سابورو",
    country: "JP",
    lat: 43.0618,
    lng: 141.3545,
    photoQuery: "Sapporo Hokkaido Japan winter",
    match: ["sapporo", "hokkaido", "hokkaidō", "سابورو", "هوكايدو"],
    typicalNights: 3,
    maxNights: 4,
    reachable: [],
    pairsWith: ["tokyo"],
    days: SAPPORO_DAYS,
  },

  /* Japan — day-trip bases */
  nara: {
    id: "nara",
    name: "Nara",
    nameAr: "نارا",
    country: "JP",
    lat: 34.6851,
    lng: 135.8048,
    photoQuery: "Nara Japan Todaiji deer park",
    match: ["nara", "نارا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: NARA_DAYTRIP,
  },
  nikko: {
    id: "nikko",
    name: "Nikkō",
    nameAr: "نيكّو",
    country: "JP",
    lat: 36.7198,
    lng: 139.6982,
    photoQuery: "Nikko Japan Toshogu shrine",
    match: ["nikko", "nikkō", "نيكو"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: NIKKO_DAYTRIP,
  },
  kamakura: {
    id: "kamakura",
    name: "Kamakura",
    nameAr: "كاماكورا",
    country: "JP",
    lat: 35.3192,
    lng: 139.5467,
    photoQuery: "Kamakura Japan Great Buddha",
    match: ["kamakura", "كاماكورا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: KAMAKURA_DAYTRIP,
  },
  himeji: {
    id: "himeji",
    name: "Himeji",
    nameAr: "هيميجي",
    country: "JP",
    lat: 34.8154,
    lng: 134.6855,
    photoQuery: "Himeji Castle Japan",
    match: ["himeji", "هيميجي"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: HIMEJI_DAYTRIP,
  },

  /* Türkiye */
  istanbul: {
    id: "istanbul",
    name: "Istanbul",
    nameAr: "إسطنبول",
    country: "TR",
    lat: 41.0082,
    lng: 28.9784,
    photoQuery: "Istanbul Turkey Bosphorus skyline",
    match: ["istanbul", "turkey", "türkiye", "turkiye", "اسطنبول", "إسطنبول", "تركيا"],
    typicalNights: 5,
    maxNights: 6,
    reachable: ["princes_islands", "bursa"],
    pairsWith: [],
    days: ISTANBUL_DAYS,
  },
  princes_islands: {
    id: "princes_islands",
    name: "Princes' Islands",
    nameAr: "جزر الأميرات",
    country: "TR",
    lat: 40.8575,
    lng: 29.1231,
    photoQuery: "Buyukada Princes Islands Istanbul",
    match: ["princes islands", "prince islands", "buyukada", "büyükada", "adalar", "جزر الأميرات", "بويوك أضة"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: PRINCES_ISLANDS_DAYTRIP,
  },
  bursa: {
    id: "bursa",
    name: "Bursa",
    nameAr: "بورصة",
    country: "TR",
    lat: 40.1826,
    lng: 29.0665,
    photoQuery: "Bursa Turkey Grand Mosque",
    match: ["bursa", "بورصة", "بورسا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: BURSA_DAYTRIP,
  },

  /* Georgia */
  tbilisi: {
    id: "tbilisi",
    name: "Tbilisi",
    nameAr: "تبليسي",
    country: "GE",
    lat: 41.7151,
    lng: 44.8271,
    photoQuery: "Tbilisi Georgia old town",
    match: ["tbilisi", "georgia", "جورجيا", "تبليسي"],
    typicalNights: 4,
    maxNights: 5,
    reachable: ["kazbegi", "sighnaghi"],
    pairsWith: ["batumi"],
    days: TBILISI_DAYS,
  },
  batumi: {
    id: "batumi",
    name: "Batumi",
    nameAr: "باتومي",
    country: "GE",
    lat: 41.6168,
    lng: 41.6367,
    photoQuery: "Batumi Georgia Black Sea boulevard",
    match: ["batumi", "adjara", "باتومي", "أدجارا"],
    typicalNights: 2,
    maxNights: 3,
    reachable: [],
    pairsWith: ["tbilisi"],
    days: BATUMI_DAYS,
  },
  kazbegi: {
    id: "kazbegi",
    name: "Kazbegi",
    nameAr: "كازبيجي",
    country: "GE",
    lat: 42.6572,
    lng: 44.6417,
    photoQuery: "Gergeti Trinity Church Kazbegi Georgia",
    match: ["kazbegi", "stepantsminda", "gergeti", "كازبيجي", "ستيبانتسميندا"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: KAZBEGI_DAYTRIP,
  },
  sighnaghi: {
    id: "sighnaghi",
    name: "Sighnaghi",
    nameAr: "سيغناغي",
    country: "GE",
    lat: 41.62,
    lng: 45.9217,
    photoQuery: "Sighnaghi Georgia hill town",
    match: ["sighnaghi", "signagi", "kakheti", "سيغناغي", "كاخيتي"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: SIGHNAGHI_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

/**
 * A route is an ordering and a set of ratios — nothing else. minNights on a
 * multi-base route is the sum of its ratios, because below that the route
 * literally cannot be walked without dropping a base. A single-base route has
 * no moves to honour, so its floor is just the shortest trip worth flying for.
 */
const REGION_ROUTES: Route[] = [
  {
    id: "japan-classic",
    match: ["japan", "tokyo", "kyoto", "osaka", "اليابان", "طوكيو", "كيوتو", "أوساكا"],
    title: "The classic Japan route",
    titleAr: "المسار الكلاسيكي لليابان",
    subtitle: "Tokyo → Kyoto → Osaka",
    subtitleAr: "طوكيو ← كيوتو ← أوساكا",
    provenance: "The route most first trips to Japan follow — in this order, for a reason.",
    provenanceAr: "المسار اللي تمشي عليه أغلب أول رحلة لليابان — بهذا الترتيب، ولها سبب.",
    forWho: "Your first time in Japan.",
    forWhoAr: "أول زيارة لليابان.",
    legs: [
      { baseId: "tokyo", nightsRatio: 3 },
      { baseId: "kyoto", nightsRatio: 2 },
      { baseId: "osaka", nightsRatio: 2 },
    ],
    transport: [
      { from: "tokyo", to: "kyoto", mode: "train", minutes: 135 },
      { from: "kyoto", to: "osaka", mode: "train", minutes: 15 },
    ],
    minNights: 7,
  },
  {
    id: "japan-deep",
    match: ["japan", "tokyo", "kyoto", "osaka", "اليابان", "طوكيو", "كيوتو", "أوساكا"],
    title: "Japan, the long way round",
    titleAr: "اليابان… بالطريق الطويل",
    subtitle: "Tokyo → Hakone → Kyoto → Kanazawa → Osaka",
    subtitleAr: "طوكيو ← هاكوني ← كيوتو ← كانازاوا ← أوساكا",
    provenance: "Two nights of the classic route traded for an onsen valley and the Sea of Japan side — the trip people take the second time.",
    provenanceAr: "ليلتين من المسار الكلاسيكي تنبدل بوادي عيون حارة وجهة بحر اليابان — رحلة الزيارة الثانية.",
    forWho: "If you've been to Tokyo before.",
    forWhoAr: "لو زرت طوكيو قبل.",
    legs: [
      { baseId: "tokyo", nightsRatio: 3 },
      { baseId: "hakone", nightsRatio: 1 },
      { baseId: "kyoto", nightsRatio: 3 },
      { baseId: "kanazawa", nightsRatio: 2 },
      { baseId: "osaka", nightsRatio: 2 },
    ],
    transport: [
      { from: "tokyo", to: "hakone", mode: "train", minutes: 85 },
      { from: "hakone", to: "kyoto", mode: "train", minutes: 145 },
      { from: "kyoto", to: "kanazawa", mode: "train", minutes: 130 },
      { from: "kanazawa", to: "osaka", mode: "train", minutes: 160 },
    ],
    minNights: 11,
  },
  {
    id: "japan-easy",
    match: ["japan", "tokyo", "kyoto", "osaka", "اليابان", "طوكيو", "كيوتو", "أوساكا"],
    title: "Two cities, no rush",
    titleAr: "مدينتين… وبدون استعجال",
    subtitle: "Tokyo → Kyoto",
    subtitleAr: "طوكيو ← كيوتو",
    provenance: "One train in the whole trip, and the day trips do the moving instead of you — the shape families actually finish.",
    provenanceAr: "قطار واحد بالرحلة كلها، والطلعات اليومية هي اللي تتحرك بدالكم — الشكل اللي تكمله العوائل فعلًا.",
    forWho: "A gentler pace — two cities only.",
    forWhoAr: "إيقاع هادئ، مدينتين بس.",
    legs: [
      { baseId: "tokyo", nightsRatio: 4 },
      { baseId: "kyoto", nightsRatio: 3 },
    ],
    transport: [{ from: "tokyo", to: "kyoto", mode: "train", minutes: 135 }],
    minNights: 7,
  },
  {
    id: "istanbul-classic",
    match: ["istanbul", "turkey", "türkiye", "turkiye", "اسطنبول", "إسطنبول", "تركيا"],
    title: "The classic Istanbul route",
    titleAr: "المسار الكلاسيكي لإسطنبول",
    subtitle: "Old city → Bosphorus → the other side",
    subtitleAr: "المدينة القديمة ← البسفور ← الضفة الثانية",
    provenance: "The order that keeps you off the tram twice a day.",
    provenanceAr: "الترتيب اللي يريحكم من قطع المدينة مرتين باليوم.",
    forWho: "One hotel, no packing twice.",
    forWhoAr: "فندق واحد، وبدون ما تحزمون مرتين.",
    legs: [{ baseId: "istanbul", nightsRatio: 5 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "georgia-classic",
    match: ["georgia", "tbilisi", "batumi", "kazbegi", "جورجيا", "تبليسي", "باتومي"],
    title: "The classic Georgia route",
    titleAr: "المسار الكلاسيكي لجورجيا",
    subtitle: "Tbilisi, with the mountains and the valley towns as day trips",
    subtitleAr: "تبليسي، والجبال وبلدات الوادي طلعات يوم",
    provenance: "Old town, one mountain day, one valley day — the shape almost every Gulf trip takes.",
    provenanceAr: "البلدة القديمة، ويوم جبال، ويوم وادي — شكل أغلب رحلات الخليج لجورجيا.",
    forWho: "One hotel the whole week.",
    forWhoAr: "فندق واحد الأسبوع كله.",
    legs: [{ baseId: "tbilisi", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "georgia-two-base",
    match: ["georgia", "tbilisi", "batumi", "kazbegi", "جورجيا", "تبليسي", "باتومي"],
    title: "Tbilisi and the Black Sea",
    titleAr: "تبليسي والبحر الأسود",
    subtitle: "Tbilisi → Batumi",
    subtitleAr: "تبليسي ← باتومي",
    provenance: "The train down to the coast is five hours of scenery and costs less than a taxi across Tbilisi.",
    provenanceAr: "قطار النزول للساحل خمس ساعات مناظر، وسعره أقل من تاكسي يقطع تبليسي.",
    forWho: "A week or more, and you want the sea too.",
    forWhoAr: "أسبوع أو أكثر، وتبون البحر معه.",
    legs: [
      { baseId: "tbilisi", nightsRatio: 3 },
      { baseId: "batumi", nightsRatio: 2 },
    ],
    transport: [{ from: "tbilisi", to: "batumi", mode: "train", minutes: 300 }],
    minNights: 5,
  },
];

/* ── Lookups ──────────────────────────────────────────────────────────── */

/** The base with this id, or null. */
export function getBase(id: BaseId): Base | null {
  return BASES[id] ?? null;
}

/**
 * Regions are separate modules so the corpus can grow without every
 * addition touching one enormous file. Anything exported here is merged
 * below; a region only has to export `bases` and `routes`.
 */
export const BASES: Record<BaseId, Base> = {
  ...REGION_BASES,
  ...Object.fromEntries(REGIONS.flatMap((r) => Object.entries(r.bases))),
};

export const ROUTES: Route[] = [...REGION_ROUTES, ...REGIONS.flatMap((r) => r.routes)];

/**
 * Every route we curate for this destination — not just the first. A Japan
 * search should offer the classic, the deep one and the slow one side by
 * side; picking one for the user is the thing the old single-package lookup
 * got wrong.
 */
export function findRoutes(destination: string): Route[] {
  const d = (destination || "").toLowerCase();
  if (!d.trim()) return [];
  return ROUTES.filter((r) => r.match.some((m) => d.includes(m)));
}

/**
 * Resolve a free-text destination to a base.
 *
 * A base's own name beats any other fragment, and after that the longest
 * fragment wins. Both rules exist for the same reason: several bases carry
 * their country as a match key so that a bare "Georgia" still lands
 * somewhere, and without the ranking "batumi georgia" resolves to Tbilisi —
 * the country key is both longer and declared first.
 */
export function findBaseByText(text: string): Base | null {
  const d = (text || "").toLowerCase();
  if (!d.trim()) return null;

  let best: Base | null = null;
  let bestScore = 0;
  for (const base of Object.values(BASES)) {
    for (const m of base.match) {
      if (!d.includes(m)) continue;
      const isOwnName = m === base.id || m === base.name.toLowerCase() || m === base.nameAr;
      const score = m.length + (isOwnName ? 100 : 0);
      if (score > bestScore) {
        best = base;
        bestScore = score;
      }
    }
  }
  return best;
}
