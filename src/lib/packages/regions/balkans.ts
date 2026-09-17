/**
 * Bosnia, and Azerbaijan.
 *
 * Named for the Balkans because Bosnia is the reason it exists — Sarajevo
 * and Mostar are the two destinations this audience asks for by name and
 * that the corpus answered with nothing. Baku sits here too. It is not the
 * Balkans and we are not pretending otherwise; it is one stayable base and
 * one day trip, and a region of its own would have been a folder with a
 * single file in it. If either half grows, split it.
 *
 * Same rules as `library.ts`: a base owns its days, a route owns only an
 * ordering, and `maxNights` never exceeds the day shapes written for it.
 *
 * Mostar appears twice on purpose. Most people see it as a long day out of
 * Sarajevo, which is `mostar` — a day-trip base with one shape. But the town
 * empties at five when the coaches leave, and the people who stay the night
 * get a different place, so `mostar_stay` is a separate, stayable base with
 * its own two days. Two ids, because they are two different trips.
 */

import type { Base, BaseId, CuratedDay, Route } from "@/lib/packages/types";
import type { Region } from "@/lib/packages/regions";

/* ── Sarajevo ─────────────────────────────────────────────────────────── */

const SARAJEVO_DAYS: CuratedDay[] = [
  {
    key: "sarajevo-arrive",
    title: "Baščaršija, the first evening",
    titleAr: "باشتشارشيا… أول مساء",
    places: [
      { name: "Sebilj", nameAr: "سبيل باشتشارشيا", why: "The wooden fountain everyone meets at — drink from it, the local line is that you'll come back to the city if you do.", whyAr: "السبيل الخشبي اللي يتواعد عنده الكل — اشربوا منه، وأهل البلد يقولون إن اللي يشرب منه يرجع للمدينة.", category: "sight", rating: 4.6, priceBand: 0, startTime: "16:30" },
      { name: "Kazandžiluk", nameAr: "سوق النحّاسين", why: "One narrow lane of coppersmiths still hammering at six in the evening — that noise is the shops working, not a show.", whyAr: "زقاق ضيق فيه نحّاسين لايزالون يطرقون الساعة ستة المسا — الصوت شغل حقيقي مو عرض.", category: "shop", rating: 4.5, priceBand: 1, startTime: "17:30" },
      { name: "Ćevabdžinica Željo", nameAr: "مطعم چيفابجينيتسا جيليو", why: "Ćevapi in a somun bread with raw onion and kajmak — order by the count of ten, and it is halal, like nearly every grill in this quarter.", whyAr: "چيفابي بخبز الصومون مع بصل نيء وقيمر — اطلبوا بعدد عشرة، وهو حلال مثل تقريبًا كل المشاوي بهالحي.", category: "food", rating: 4.5, priceBand: 1, startTime: "19:00", dietary: ["halal"] },
    ],
  },
  {
    key: "sarajevo-ottoman",
    title: "The Ottoman quarter, properly",
    titleAr: "الحي العثماني… بتمهّل",
    places: [
      { name: "Gazi Husrev-beg Mosque", nameAr: "جامع غازي خسرو بك", why: "Built in 1531 and still the city's main mosque — the courtyard fountain and the old clock tower next door keep lunar time, the only one left in the world.", whyAr: "بُني سنة ١٥٣١ ولا يزال جامع المدينة الرئيسي — وشادروان الصحن وبرج الساعة اللي جنبه يضبطون التوقيت القمري، الوحيد الباقي بالعالم.", category: "sight", rating: 4.8, priceBand: 0, startTime: "09:30" },
      { name: "Morića Han", nameAr: "خان موريتشا", why: "The last surviving caravanserai in the city — walk into the courtyard, sit under the vine, and the traffic outside stops existing.", whyAr: "آخر خان باقٍ بالمدينة — ادخلوا الفناء واقعدوا تحت الدالية وبينقطع صوت الشارع تمامًا.", category: "rest", rating: 4.5, priceBand: 1, startTime: "11:00" },
      { name: "Aščinica ASDŽ", nameAr: "أشتشينيتسا ASDŽ", why: "Point at the pots in the window: stuffed onions, okra stew, dolma and a bowl of begova čorba — a halal kitchen, and they close when the pots run out in the afternoon.", whyAr: "أشّروا على القدور بالواجهة: بصل محشي ويخنة بامية ودولمة وصحن «بيغوفا تشوربا» — مطبخ حلال، ويسكّرون أول ما تخلص القدور بالعصر.", category: "food", rating: 4.5, priceBand: 1, startTime: "12:30", dietary: ["halal"] },
      { name: "Latin Bridge", nameAr: "الجسر اللاتيني", why: "The corner beside it is where the First World War started — the bridge is ordinary, the plaque is two sentences, and standing there is the point.", whyAr: "الزاوية اللي جنبه هي وين بدأت الحرب العالمية الأولى — الجسر عادي واللوحة سطرين، والوقوف هناك هو المقصد.", category: "sight", rating: 4.4, priceBand: 0, startTime: "14:00" },
    ],
  },
  {
    key: "sarajevo-siege",
    title: "The siege, and the city hall",
    titleAr: "الحصار… ودار البلدية",
    places: [
      { name: "Vijećnica", nameAr: "دار البلدية (فييتشنيتسا)", why: "The pseudo-Moorish city hall, burned with two million books in 1992 and rebuilt stripe for stripe — the atrium ceiling is what you came for.", whyAr: "دار البلدية بطرازها المغربي، احترقت ومعها مليونين كتاب سنة ١٩٩٢ وأُعيد بناؤها خط بخط — وسقف البهو هو سبب الزيارة.", category: "sight", rating: 4.7, priceBand: 1, startTime: "09:30" },
      { name: "Tunnel of Hope", nameAr: "نفق الأمل", why: "Eight hundred metres dug under the runway by hand, the city's only way in and out for three years — twenty metres of it are still open to walk.", whyAr: "ثمانمئة متر محفورة باليد تحت مدرج المطار، وكانت منفذ المدينة الوحيد ثلاث سنين — ولا يزال عشرين متر منها مفتوح للمشي.", category: "sight", rating: 4.7, priceBand: 1, startTime: "11:30" },
      { name: "Kovači Martyrs' Memorial Cemetery", nameAr: "مقبرة شهداء كوفاتشي", why: "White markers stepped up the hillside above the old town — go quietly, families still visit, and the view over the valley is from among them.", whyAr: "شواهد بيضا مدرّجة على المنحدر فوق البلدة القديمة — ادخلوا بهدوء، لايزال أهاليهم يزورون، والإطلالة على الوادي من بينها.", category: "sight", rating: 4.7, priceBand: 0, startTime: "15:00" },
      { name: "Žuta Tabija", nameAr: "الطابية الصفراء", why: "An 18th-century bastion twenty minutes' climb above the cemetery — the whole bowl of the city is under you, and in Ramadan the cannon fires from here.", whyAr: "طابية من القرن الثامن عشر على بعد عشرين دقيقة طلوع فوق المقبرة — حوض المدينة كله تحتكم، وبرمضان يُطلق المدفع من هنا.", category: "nature", rating: 4.7, priceBand: 0, startTime: "17:30" },
    ],
  },
  {
    key: "sarajevo-trebevic",
    title: "Up Trebević",
    titleAr: "طلعة تريبيفيتش",
    places: [
      { name: "Trebević cable car", nameAr: "تلفريك تريبيفيتش", why: "Nine minutes from the bottom of the old town to a mountain — the original line was destroyed in the war and this one reopened in 2018.", whyAr: "تسع دقايق من أسفل البلدة القديمة لجبل كامل — الخط الأصلي دُمّر بالحرب وهذا فتح من جديد سنة ٢٠١٨.", category: "nature", rating: 4.7, priceBand: 1, startTime: "10:00" },
      { name: "Vidikovac Trebević", nameAr: "مطل تريبيفيتش", why: "A ten-minute walk from the top station to a platform over the valley — this is the photograph, not the one from the cable car.", whyAr: "عشر دقايق مشي من المحطة العليا لمنصة فوق الوادي — هذي هي الصورة، مو اللي من التلفريك.", category: "sight", rating: 4.6, priceBand: 0, startTime: "11:00" },
      { name: "1984 Olympic bobsleigh track", nameAr: "مضمار البوبسليد الأولمبي ١٩٨٤", why: "A concrete Olympic track abandoned in the forest and painted end to end — you can walk down the inside of it the whole way.", whyAr: "مضمار أولمبي خرساني متروك بالغابة ومرسوم من أوله لآخره — وتقدرون تنزلون من داخله لين النهاية.", category: "walk", rating: 4.6, priceBand: 0, startTime: "12:30" },
      { name: "Inat Kuća", nameAr: "بيت العناد", why: "Bosnian home cooking — stuffed vine leaves, veal baked under the sač, and a plate of pita — in the house whose owner made the Austrians move it across the river brick by brick rather than sell it.", whyAr: "أكل بوسني بيتي — ورق عنب محشي، ولحم عجل مخبوز تحت الصاج، وصحن «بيتا» — بالبيت اللي خلّى صاحبه النمساويين ينقلونه عبر النهر طوبة طوبة بدل ما يبيعه.", category: "food", rating: 4.3, priceBand: 2, startTime: "15:00", dietary: ["unverified"] },
    ],
  },
];

/* ── Mostar, as a base ────────────────────────────────────────────────── */

const MOSTAR_STAY_DAYS: CuratedDay[] = [
  {
    key: "mostar-stay-evening",
    title: "Mostar once the coaches leave",
    titleAr: "موستار بعد ما تمشي الباصات",
    places: [
      { name: "Stari Most at dusk", nameAr: "الجسر القديم وقت المغرب", why: "The day trips are gone by five and the bridge is lit from below by eight — the two hours in between are why you stayed.", whyAr: "رحلات اليوم تمشي الساعة خمسة والجسر يضوي من تحت الساعة ثمانية — والساعتين اللي بينهم هي سبب مبيتكم.", category: "sight", rating: 4.9, priceBand: 0, startTime: "18:00" },
      { name: "Kriva Ćuprija", nameAr: "الجسر الأعوج", why: "The small bridge over the side stream was the practice run for the big one, built eight years earlier — and nobody is standing on it.", whyAr: "الجسر الصغير فوق الجدول الجانبي كان بروفة للكبير، مبني قبله بثمان سنين — وما أحد واقف عليه.", category: "walk", rating: 4.5, priceBand: 0, startTime: "19:00" },
      { name: "Restoran Šadrvan", nameAr: "مطعم شادروان", why: "Tables set out in the lane under a vine — ask for the Bosnian plate for two and you'll be given enough for three.", whyAr: "طاولات منصوبة بالزقاق تحت دالية — اطلبوا «الصحن البوسني» لشخصين وبيجيكم يكفي ثلاثة.", category: "food", rating: 4.4, priceBand: 1, startTime: "20:00", dietary: ["unverified"] },
    ],
  },
  {
    key: "mostar-stay-south",
    title: "Počitelj, Kravice and Blagaj",
    titleAr: "بوتشيتيل وكرافيتسه وبلاغاي",
    places: [
      { name: "Počitelj", nameAr: "قرية بوتشيتيل", why: "A stepped Ottoman village stacked on a cliff over the Neretva — climb to the Šišman Ibrahim-pašina mosque and the tower above it.", whyAr: "قرية عثمانية مدرّجة مركومة على جرف فوق نهر نيريتفا — اطلعوا لجامع شيشمان إبراهيم باشا وللبرج اللي فوقه.", category: "sight", rating: 4.6, priceBand: 0, startTime: "10:00" },
      { name: "Kravice Waterfalls", nameAr: "شلالات كرافيتسه", why: "A 25-metre horseshoe of falls into a green pool — go before noon in summer, the car park fills and then the pool does.", whyAr: "حدوة حصان من الشلالات بارتفاع ٢٥ متر تصب ببركة خضرا — روحوا قبل الظهر بالصيف، الموقف ينملي وبعده البركة.", category: "nature", rating: 4.7, priceBand: 1, startTime: "12:30" },
      { name: "Restoran Vrelo", nameAr: "مطعم فريلو", why: "Trout out of the Buna, grilled whole and served with kajmak and bread on a terrace built over the water — ask for a table on the lower deck, right at the river.", whyAr: "سمك تروتة من نهر البونا، مشوي كامل ويجي مع قيمر وخبز على شرفة مبنية فوق الماء — اطلبوا طاولة بالدور الأسفل، على حافة النهر مباشرة.", category: "food", rating: 4.4, priceBand: 2, startTime: "14:30", dietary: ["seafood"] },
      { name: "Blagaj Tekke", nameAr: "تكية بلاغاي", why: "A dervish lodge built against a cliff where the Buna river comes straight out of the rock — the water is the coldest thing you'll touch all trip.", whyAr: "تكية درويشية ملصوقة بجرف، ومن تحته يطلع نهر البونا من الصخر مباشرة — والماي أبرد شي بتلمسونه بالرحلة كلها.", category: "sight", rating: 4.7, priceBand: 1, startTime: "16:00" },
    ],
  },
];

/* ── Baku ─────────────────────────────────────────────────────────────── */

const BAKU_DAYS: CuratedDay[] = [
  {
    key: "baku-arrive",
    title: "İçərişəhər, the first evening",
    titleAr: "المدينة الداخلية… أول مساء",
    places: [
      { name: "Qız Qalası", nameAr: "برج العذراء", why: "Nobody agrees what this tower was for, in eight hundred years of trying — climb it for the roofs, then argue about it downstairs.", whyAr: "ما أحد متفق على وظيفة هالبرج من ثمانمئة سنة وهم يحاولون — اطلعوه عشان السطوح، وتجادلوا عنه تحت.", category: "sight", rating: 4.5, priceBand: 1, startTime: "17:00" },
      { name: "İçərişəhər lanes", nameAr: "أزقة المدينة الداخلية", why: "The walled old city is small enough to get lost in for exactly forty minutes — every lane comes out at the wall eventually.", whyAr: "المدينة القديمة المسوّرة صغيرة بحيث تضيعون فيها أربعين دقيقة بالضبط — وكل زقاق يطلعكم على السور بالآخر.", category: "walk", rating: 4.6, priceBand: 0, startTime: "18:00" },
      { name: "Fountains Square", nameAr: "ساحة النافورات", why: "Where the city comes out after dark, families included, and it stays busy past midnight in summer.", whyAr: "وين تطلع المدينة بعد الظلمة، والعوائل معهم، وتظل مزدحمة لبعد منتصف الليل بالصيف.", category: "walk", rating: 4.4, priceBand: 0, startTime: "19:30" },
      { name: "Dolma Restaurant Baku", nameAr: "مطعم دولما بباكو", why: "Dolma three ways — vine leaf, aubergine and pepper — with garlic yoghurt, and lamb kufta the size of a fist. Two minutes from the old city gate.", whyAr: "دولمة بثلاث طرق — ورق عنب وباذنجان وفلفل — مع لبن بالثوم، وكفتة غنم بحجم القبضة. دقيقتين من باب المدينة القديمة.", category: "food", rating: 4.4, priceBand: 2, startTime: "20:30", dietary: ["unverified"] },
    ],
  },
  {
    key: "baku-oldcity",
    title: "Inside the walls",
    titleAr: "داخل الأسوار",
    places: [
      { name: "Shirvanshahs' Palace", nameAr: "قصر الشروانشاهات", why: "A 15th-century royal complex of separate stone pavilions rather than one building — the domed burial vault at the back is the finest carving in it.", whyAr: "مجمع ملكي من القرن الخامس عشر أجنحته حجرية منفصلة مو مبنى واحد — والمدفن المقبب بالخلف فيه أجمل نقش.", category: "sight", rating: 4.6, priceBand: 1, startTime: "09:30" },
      { name: "Juma Mosque", nameAr: "الجامع (جمعة مسجد)", why: "A working Friday mosque inside the old city walls, rebuilt in 1899 on a much older base — quiet, small, and open between prayers.", whyAr: "جامع جمعة شغّال داخل أسوار المدينة القديمة، أُعيد بناؤه سنة ١٨٩٩ على أساس أقدم بكثير — هادي وصغير ومفتوح بين الصلوات.", category: "sight", rating: 4.5, priceBand: 0, startTime: "11:00" },
      { name: "Qutab house", nameAr: "بيت القُتاب", why: "Qutab cooked on a domed iron plate in front of you: paper-thin dough folded over minced lamb, greens or pumpkin, dusted with sumac — three each is lunch.", whyAr: "قُتاب يُخبز على صاج مقبب قدامكم: عجين رفيع مطوي على لحم مفروم أو خضار أو قرع، ومرشوش سماق — ثلاثة للواحد وهذا الغدا.", category: "food", rating: 4.3, priceBand: 1, startTime: "12:30", dietary: ["unverified"] },
      { name: "Taza Pir Mosque", nameAr: "مسجد تازه بير", why: "Baku's main mosque, finished in 1914 with a gilded dome and minarets — fifteen minutes' walk from the old city and visitors are welcome outside prayer.", whyAr: "جامع باكو الرئيسي، اكتمل سنة ١٩١٤ بقبة ومآذن مذهّبة — خمسطعش دقيقة مشي من المدينة القديمة، والزوار مرحّب بهم بغير أوقات الصلاة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "16:30" },
    ],
  },
  {
    key: "baku-boulevard",
    title: "The Boulevard and the hill",
    titleAr: "البوليفار والتلة",
    places: [
      { name: "Azerbaijan Carpet Museum", nameAr: "متحف السجاد الأذربيجاني", why: "The building is a rolled carpet, which sounds like a gimmick until you go in and the galleries unroll with it.", whyAr: "المبنى نفسه سجادة ملفوفة، تحسونها حيلة لين ما تدخلون وتلقون القاعات تنفرد معها.", category: "sight", rating: 4.5, priceBand: 1, startTime: "10:00" },
      { name: "Mini Venice", nameAr: "البندقية الصغيرة", why: "Cut canals with gondolas in the middle of the seafront park — it costs almost nothing and the children will remember it over the museums.", whyAr: "قنوات محفورة وفيها قوارب جندول بقلب حديقة الواجهة — تكلفتها تكاد تكون صفر، والعيال بيتذكرونها أكثر من المتاحف.", category: "rest", rating: 4.3, priceBand: 1, startTime: "12:00" },
      { name: "Baku Boulevard", nameAr: "بوليفار باكو", why: "Sixteen kilometres of Caspian seafront with no traffic on it — the wind comes off the water in the afternoon, which is the point in August.", whyAr: "ستطعش كيلو واجهة بحرية على بحر قزوين وبدون سيارات — والهوا يجي من الماي بالعصر، وهذا المقصد بأغسطس.", category: "walk", rating: 4.7, priceBand: 0, startTime: "14:00" },
      { name: "Highland Park", nameAr: "حديقة المرتفعات", why: "The funicular up from the seafront costs less than a coffee — arrive before sunset, because the Flame Towers behind you light up after it.", whyAr: "القطار المائل الطالع من الواجهة أرخص من فنجان قهوة — اوصلوا قبل الغروب، لأن أبراج اللهب خلفكم تضوي بعده.", category: "sight", rating: 4.7, priceBand: 1, startTime: "17:30" },
    ],
  },
  {
    key: "baku-fire",
    title: "Fire, out on the Absheron",
    titleAr: "النار… بأبشيرون",
    places: [
      { name: "Ateshgah Fire Temple", nameAr: "معبد النار آتشغاه", why: "A pentagonal caravanserai built round a natural gas vent by Indian merchants — the flame is piped now, and the cells around it are the real thing.", whyAr: "خان خماسي الأضلاع بناه تجار هنود حول فتحة غاز طبيعية — اللهب اليوم موصول بأنبوب، لكن الحجرات حوله أصلية.", category: "sight", rating: 4.4, priceBand: 1, startTime: "10:30" },
      { name: "Yanar Dag", nameAr: "يانار داغ", why: "A ten-metre stretch of hillside that has been on fire continuously for decades — it is better after dark, and better still in wind.", whyAr: "شريط من المنحدر بطول عشرة أمتار مشتعل بلا انقطاع من عقود — أحلى بعد الظلمة، وأحلى منها بالهوا.", category: "nature", rating: 4.3, priceBand: 1, startTime: "13:30" },
      { name: "Heydar Aliyev Center", nameAr: "مركز حيدر علييف", why: "Zaha Hadid's building with no straight line anywhere in it — the exterior is free to walk around and is most of the reason people come.", whyAr: "مبنى زها حديد اللي ما فيه ولا خط مستقيم — الخارج مجاني وتقدرون تلفون حوله، وهو أغلب سبب الزيارة.", category: "sight", rating: 4.7, priceBand: 1, startTime: "16:30" },
      { name: "Sumakh", nameAr: "مطعم سوماخ", why: "Azerbaijani cooking done properly: piti in a sealed clay pot you tear bread into, saffron plov under a pastry crust, and dushbara dumplings you eat by the spoonful.", whyAr: "مطبخ أذربيجاني على أصوله: «بيتي» بقدر فخار مسكّر تفتّون فيه الخبز، وبلوّ بالزعفران تحت قشرة عجين، ودوشبرة صغيرة تاكلونها بالملعقة.", category: "food", rating: 4.5, priceBand: 2, startTime: "18:30", dietary: ["unverified"] },
    ],
  },
];

/* ── Day-trip shapes ──────────────────────────────────────────────────── */

const MOSTAR_DAYTRIP: CuratedDay = {
  key: "mostar-daytrip",
  title: "Mostar in a day",
  titleAr: "موستار بيوم",
  places: [
    { name: "Stari Most", nameAr: "الجسر القديم", why: "Two and a half hours from Sarajevo each way — the bridge was shelled to the river bed in 1993 and rebuilt from the stones they dredged back up.", whyAr: "ساعتين ونص من سراييفو بكل اتجاه — الجسر قُصف لين قاع النهر سنة ١٩٩٣ وأُعيد بناؤه من الحجارة اللي طلعوها منه.", category: "sight", rating: 4.9, priceBand: 0, startTime: "11:00" },
    { name: "Kujundžiluk", nameAr: "سوق الصاغة (كويونجيلوك)", why: "The cobbled bazaar either side of the bridge — the copper worked from shell casings is made here, not imported.", whyAr: "البازار المبلّط على جهتي الجسر — والنحاس المشغول من ظروف القذائف يُصنع هنا، مو مستورد.", category: "shop", rating: 4.4, priceBand: 1, startTime: "12:00" },
    { name: "Koski Mehmed-Pasha Mosque", nameAr: "جامع كوسكي محمد باشا", why: "Pay the small extra fee and climb the minaret — it is the view of the bridge, the one every photograph of Mostar is taken from.", whyAr: "ادفعوا الزيادة البسيطة واطلعوا المئذنة — هذي هي إطلالة الجسر، ومنها تتصور كل صور موستار.", category: "sight", rating: 4.6, priceBand: 1, startTime: "13:30" },
    { name: "Blagaj Tekke", nameAr: "تكية بلاغاي", why: "Fifteen minutes out of town: a dervish lodge under a 200-metre cliff, with the Buna river coming out of the rock beneath it.", whyAr: "خمسطعش دقيقة برا البلدة: تكية درويشية تحت جرف بمئتين متر، ونهر البونا يخرج من الصخر تحتها.", category: "sight", rating: 4.7, priceBand: 1, startTime: "15:30" },
  ],
};

const JAJCE_DAYTRIP: CuratedDay = {
  key: "jajce-daytrip",
  title: "Jajce in a day",
  titleAr: "يايتسه بيوم",
  places: [
    { name: "Pliva Waterfall", nameAr: "شلال بليفا", why: "Two and a half hours west of Sarajevo, and the 20-metre fall is inside the town — one river drops into another in the middle of the street plan.", whyAr: "ساعتين ونص غرب سراييفو، والشلال بعشرين متر داخل البلدة نفسها — نهر يصب بنهر بقلب مخطط الشوارع.", category: "nature", rating: 4.7, priceBand: 1, startTime: "11:30" },
    { name: "Jajce Fortress", nameAr: "قلعة يايتسه", why: "The last Bosnian king was crowned here and beheaded below it — climb the walls for the only place you see both rivers meeting at once.", whyAr: "آخر ملوك البوسنة تُوّج هنا وقُطع رأسه تحتها — اطلعوا الأسوار، المكان الوحيد اللي تشوفون منه ملتقى النهرين بنظرة وحدة.", category: "sight", rating: 4.5, priceBand: 1, startTime: "13:00" },
    { name: "Pliva Watermills", nameAr: "طواحين بليفا", why: "Twenty small wooden mills standing in the shallows between the two Pliva lakes — they are miniature, they are real, and they still turn.", whyAr: "عشرين طاحونة خشبية صغيرة واقفة بالماي الضحل بين بحيرتي بليفا — مصغّرة وحقيقية ولا تزال تدور.", category: "sight", rating: 4.5, priceBand: 0, startTime: "15:00" },
  ],
};

const GOBUSTAN_DAYTRIP: CuratedDay = {
  key: "gobustan-daytrip",
  title: "Gobustan in a day",
  titleAr: "قوبوستان بيوم",
  places: [
    { name: "Bibi-Heybat Mosque", nameAr: "مسجد بيبي هيبت", why: "Twenty minutes down the Gobustan road: the original was dynamited in 1936 and this rebuild opened in 1998 — stop on the way out, not the way back.", whyAr: "عشرين دقيقة على طريق قوبوستان: الأصلي نُسف سنة ١٩٣٦ وهذا البناء الجديد فتح سنة ١٩٩٨ — قفوا عنده بالذهاب مو بالرجعة.", category: "sight", rating: 4.7, priceBand: 0, startTime: "09:30" },
    { name: "Gobustan Rock Art Reserve", nameAr: "محمية قوبوستان للنقوش الصخرية", why: "Six thousand carvings on the boulders, the oldest around 12,000 years old — take the marked trail, the best panels are past the first cluster.", whyAr: "ستة آلاف نقش على الصخور، وأقدمها عمره حوالي ١٢ ألف سنة — امشوا المسار المعلّم، وأحلى اللوحات بعد أول تجمّع.", category: "sight", rating: 4.6, priceBand: 1, startTime: "11:00" },
    { name: "Gobustan Museum", nameAr: "متحف قوبوستان", why: "Do it after the rocks, not before — it explains what you have just walked past, and in the other order it explains nothing.", whyAr: "خلوه بعد الصخور مو قبلها — يشرح لكم اللي مريتوا عليه، وبالترتيب المعكوس ما يشرح شي.", category: "sight", rating: 4.5, priceBand: 1, startTime: "13:00" },
    { name: "Gobustan mud volcanoes", nameAr: "براكين الطين بقوبوستان", why: "Cold grey mud burping out of metre-high cones in open desert — the road in destroys ordinary cars, so it's the old Ladas at the gate or nothing.", whyAr: "طين رمادي بارد يتفقع من أقماع بارتفاع متر بصحرا مفتوحة — والطريق يكسّر السيارات العادية، فإما «لادا» قديمة عند البوابة أو لا شي.", category: "nature", rating: 4.4, priceBand: 1, startTime: "15:00" },
  ],
};

/* ── The bases ────────────────────────────────────────────────────────── */

/**
 * `mostar_stay` is declared before `mostar` on purpose: both answer the word
 * "Mostar" with the same score in `findBaseByText`, and a tie goes to
 * whichever is seen first. Someone typing Mostar into the destination box
 * wants somewhere to sleep, so the stayable base has to win.
 */
const BALKANS_BASES: Record<BaseId, Base> = {
  sarajevo: {
    id: "sarajevo",
    name: "Sarajevo",
    nameAr: "سراييفو",
    country: "BA",
    lat: 43.8563,
    lng: 18.4131,
    photoQuery: "Sarajevo Bosnia Bascarsija old town minarets",
    match: ["sarajevo", "bosnia", "bosnia and herzegovina", "herzegovina", "سراييفو", "البوسنة", "بوسنة"],
    typicalNights: 3,
    maxNights: 4,
    reachable: ["mostar", "jajce"],
    pairsWith: ["mostar_stay"],
    days: SARAJEVO_DAYS,
  },
  mostar_stay: {
    id: "mostar_stay",
    name: "Mostar",
    nameAr: "موستار",
    country: "BA",
    lat: 43.3438,
    lng: 17.8078,
    photoQuery: "Mostar Bosnia Stari Most old bridge",
    match: ["mostar", "موستار"],
    typicalNights: 2,
    maxNights: 2,
    reachable: [],
    pairsWith: ["sarajevo"],
    days: MOSTAR_STAY_DAYS,
  },
  baku: {
    id: "baku",
    name: "Baku",
    nameAr: "باكو",
    country: "AZ",
    lat: 40.4093,
    lng: 49.8671,
    photoQuery: "Baku Azerbaijan old city Flame Towers Caspian",
    match: ["baku", "azerbaijan", "باكو", "أذربيجان", "اذربيجان"],
    typicalNights: 4,
    maxNights: 4,
    reachable: ["gobustan"],
    pairsWith: [],
    days: BAKU_DAYS,
  },

  /* day-trip bases */
  mostar: {
    id: "mostar",
    name: "Mostar",
    nameAr: "موستار",
    country: "BA",
    lat: 43.3372,
    lng: 17.8149,
    photoQuery: "Mostar Bosnia old bridge Neretva",
    match: ["mostar", "موستار"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: MOSTAR_DAYTRIP,
  },
  jajce: {
    id: "jajce",
    name: "Jajce",
    nameAr: "يايتسه",
    country: "BA",
    lat: 44.3419,
    lng: 17.2706,
    photoQuery: "Jajce Bosnia Pliva waterfall fortress",
    match: ["jajce", "يايتسه"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: JAJCE_DAYTRIP,
  },
  gobustan: {
    id: "gobustan",
    name: "Gobustan",
    nameAr: "قوبوستان",
    country: "AZ",
    lat: 40.1075,
    lng: 49.383,
    photoQuery: "Gobustan Azerbaijan petroglyphs mud volcanoes",
    match: ["gobustan", "qobustan", "قوبوستان", "غوبوستان"],
    typicalNights: 0,
    maxNights: 0,
    reachable: [],
    pairsWith: [],
    days: [],
    dayTrip: GOBUSTAN_DAYTRIP,
  },
};

/* ── The routes ───────────────────────────────────────────────────────── */

const BALKANS_ROUTES: Route[] = [
  {
    id: "bosnia-classic",
    match: ["bosnia", "sarajevo", "herzegovina", "البوسنة", "سراييفو"],
    title: "The classic Bosnia route",
    titleAr: "المسار الكلاسيكي للبوسنة",
    subtitle: "Sarajevo, with Mostar and Jajce as day trips",
    subtitleAr: "سراييفو، وموستار ويايتسه طلعات يوم",
    provenance: "One hotel in the old town and a driver for two of the days — the shape almost every Gulf trip to Bosnia takes.",
    provenanceAr: "فندق واحد بالبلدة القديمة وسائق ليومين — شكل أغلب رحلات الخليج للبوسنة.",
    forWho: "Four or five nights, and you'd rather unpack once.",
    forWhoAr: "أربع أو خمس ليالي، وتفضلون تفتحون الشنط مرة وحدة.",
    legs: [{ baseId: "sarajevo", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
  {
    id: "bosnia-two-base",
    match: ["bosnia", "sarajevo", "mostar", "herzegovina", "البوسنة", "سراييفو", "موستار"],
    title: "Sarajevo and Mostar",
    titleAr: "سراييفو وموستار",
    subtitle: "Sarajevo → Mostar",
    subtitleAr: "سراييفو ← موستار",
    provenance: "The train through the Neretva canyon is two hours of gorge for the price of a coffee — and Mostar is a different town once the day trips have gone home.",
    provenanceAr: "القطار عبر وادي نيريتفا ساعتين مناظر بسعر فنجان قهوة — وموستار بلدة ثانية بعد ما ترجع رحلات اليوم.",
    forWho: "Five nights or more, and you want the south too.",
    forWhoAr: "خمس ليالي أو أكثر، وتبون الجنوب معها.",
    legs: [
      { baseId: "sarajevo", nightsRatio: 3 },
      { baseId: "mostar_stay", nightsRatio: 2 },
    ],
    transport: [{ from: "sarajevo", to: "mostar_stay", mode: "train", minutes: 130 }],
    minNights: 5,
  },
  {
    id: "azerbaijan-classic",
    match: ["azerbaijan", "baku", "أذربيجان", "باكو"],
    title: "The classic Baku route",
    titleAr: "المسار الكلاسيكي لباكو",
    subtitle: "Old city, boulevard, and the fires outside town",
    subtitleAr: "المدينة القديمة، والبوليفار، ونيران أطراف المدينة",
    provenance: "Everything in Baku is either inside the walls or a forty-minute drive out of them — one hotel covers the lot.",
    provenanceAr: "كل شي بباكو إما داخل الأسوار أو على بعد أربعين دقيقة منها — فندق واحد يغطي الكل.",
    forWho: "A short break, direct from the Gulf.",
    forWhoAr: "إجازة قصيرة، وطيران مباشر من الخليج.",
    legs: [{ baseId: "baku", nightsRatio: 4 }],
    transport: [],
    minNights: 3,
  },
];

export const BALKANS: Region = { bases: BALKANS_BASES, routes: BALKANS_ROUTES };

/* ── Coordinates ──────────────────────────────────────────────────────── */

/**
 * One entry per distinct place name above, byte-for-byte including
 * diacritics. [lat, lng], four decimals, the venue itself.
 *
 * Deliberately absent, because no coordinate could be confirmed to the
 * venue rather than to its general area:
 *   • "Pliva Watermills" — the mills sit somewhere along the shallows
 *     between the two Pliva lakes, a stretch about a kilometre long, and
 *     pinning the middle of it would be a guess dressed as a fact.
 *   • "Gobustan mud volcanoes" — the fields are spread over several square
 *     kilometres of the Dashgil area with no single mapped entrance.
 */
export const BALKANS_COORDS: Record<string, readonly [number, number]> = {
  /* Sarajevo */
  Sebilj: [43.8595, 18.4311],
  Kazandžiluk: [43.8592, 18.4306],
  "Ćevabdžinica Željo": [43.8589, 18.4293],
  "Gazi Husrev-beg Mosque": [43.8593, 18.4274],
  "Morića Han": [43.859, 18.4265],
  "Aščinica ASDŽ": [43.8586, 18.4284],
  "Latin Bridge": [43.8576, 18.4287],
  Vijećnica: [43.859, 18.434],
  "Tunnel of Hope": [43.8189, 18.3362],
  "Kovači Martyrs' Memorial Cemetery": [43.8606, 18.4338],
  "Žuta Tabija": [43.8625, 18.4354],
  "Trebević cable car": [43.8556, 18.429],
  "Vidikovac Trebević": [43.8483, 18.4305],
  "1984 Olympic bobsleigh track": [43.8451, 18.4283],
  "Inat Kuća": [43.8584, 18.4332],

  /* Mostar and the south */
  "Stari Most": [43.3372, 17.8149],
  "Stari Most at dusk": [43.3372, 17.8149],
  Kujundžiluk: [43.3376, 17.8156],
  "Koski Mehmed-Pasha Mosque": [43.338, 17.8146],
  "Kriva Ćuprija": [43.3365, 17.8138],
  "Restoran Šadrvan": [43.3374, 17.8151],
  "Restoran Vrelo": [43.2564, 17.903],
  "Blagaj Tekke": [43.2569, 17.8931],
  Počitelj: [43.133, 17.742],
  "Kravice Waterfalls": [43.1567, 17.6081],

  /* Jajce */
  "Pliva Waterfall": [44.34, 17.2692],
  "Jajce Fortress": [44.3423, 17.2714],

  /* Baku */
  "Qız Qalası": [40.3663, 49.8371],
  "İçərişəhər lanes": [40.3665, 49.834],
  "Fountains Square": [40.372, 49.8375],
  "Dolma Restaurant Baku": [40.3699, 49.837],
  "Shirvanshahs' Palace": [40.3662, 49.8329],
  "Juma Mosque": [40.3662, 49.8353],
  "Qutab house": [40.3686, 49.8356],
  Sumakh: [40.382, 49.8685],
  "Taza Pir Mosque": [40.3737, 49.8323],
  "Azerbaijan Carpet Museum": [40.3642, 49.8318],
  "Mini Venice": [40.3678, 49.8425],
  "Baku Boulevard": [40.37, 49.8462],
  "Highland Park": [40.3589, 49.8295],
  "Ateshgah Fire Temple": [40.4156, 50.0089],
  "Yanar Dag": [40.5017, 49.8878],
  "Heydar Aliyev Center": [40.3959, 49.8674],

  /* Gobustan */
  "Bibi-Heybat Mosque": [40.3246, 49.8078],
  "Gobustan Rock Art Reserve": [40.1053, 49.3786],
  "Gobustan Museum": [40.1075, 49.383],
};
