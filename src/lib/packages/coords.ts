/**
 * Hand-checked coordinates for every place in the curated library.
 *
 * `library.ts` carries ~160 hand-written places and no coordinates. Without
 * them the app fell back to geocoding a place by its English name against the
 * whole destination country, then persisting whatever came back first — which
 * is how Sensō-ji ended up in Okayama, Nakamise in Hiroshima, and Shibuya
 * Crossing out on the Miura peninsula. A name-search over a country is a
 * guess; these are not.
 *
 * Rules this table was built under:
 *   • one entry per distinct `name` in library.ts, byte-for-byte — macrons and
 *     diacritics included, because that string is the lookup key;
 *   • [latitude, longitude], four decimals (~11 m), pointing at the venue
 *     itself, not the city it sits in;
 *   • where the library names a district, street or stretch rather than a
 *     single door — "Gion at dusk", "Karaköy for dinner", "Shardeni Street" —
 *     the pin is that district or street, because that is where you'd walk;
 *   • where no coordinate could be confirmed, the place is simply absent.
 *     `coordsFor` returns null and the caller decides. A missing pin is
 *     honest; a wrong pin is the bug this file exists to kill.
 *
 * Deliberately absent (no confirmable venue coordinate):
 *   • "Ebisu Yokochō" — the covered arcade is not mapped; only the surrounding
 *     Ebisu 1-chōme block is, which is not the same place.
 *   • "Hakuza gold leaf house" — the Higashi Chaya shop (Hakuza Hikarigura) is
 *     unmapped; the one mapped "Hakuza" is the company's other Kanazawa site.
 *
 * Same discipline as the library: hand-checked, and re-checked when the
 * library changes. Adding a place there means adding it here.
 */

export const PLACE_COORDS: Record<string, readonly [number, number]> = {
  /* ── Tokyo ───────────────────────────────────────────────────────────── */
  "Shibuya Crossing": [35.6595, 139.7005],
  "Nonbei Yokocho": [35.66, 139.7015],
  "Sensō-ji Temple": [35.7148, 139.7967],
  "Nakamise Shopping Street": [35.7125, 139.7965],
  "Ueno Park": [35.7148, 139.7738],
  Akihabara: [35.6984, 139.7731],
  "Meiji Jingu": [35.6764, 139.6993],
  Omotesandō: [35.6673, 139.7079],
  "Shinjuku Gyoen": [35.6851, 139.7095],
  "Omoide Yokocho": [35.6931, 139.6995],
  "Toyosu Market": [35.6453, 139.7864],
  "teamLab Planets TOKYO": [35.6494, 139.7897],
  "Rainbow Bridge promenade": [35.6352, 139.7755],
  Shimokitazawa: [35.6613, 139.6669],
  "Nakameguro canal": [35.6441, 139.699],
  "Daikanyama T-Site": [35.6493, 139.6998],
  "Mount Takao": [35.6252, 139.2437],
  "Yakuō-in": [35.626, 139.2504],
  "Ukai Toriyama": [35.6159, 139.2573],
  "Keiō Takaosan Onsen Gokurakuyu": [35.6321, 139.2693],

  /* ── Kyoto ───────────────────────────────────────────────────────────── */
  "Fushimi Inari Taisha": [34.9671, 135.7727],
  "Nishiki Market": [35.005, 135.7656],
  "Gion at dusk": [35.0027, 135.7749],
  "Arashiyama Bamboo Grove": [35.017, 135.6716],
  "Tenryū-ji": [35.0162, 135.6729],
  "Arashiyama Yoshimura": [35.0143, 135.676],
  "Kinkaku-ji": [35.0395, 135.7295],
  "Kiyomizu-dera": [34.9948, 135.785],
  "Okutan Nanzenji": [35.0124, 135.7931],
  "Nanzen-ji aqueduct": [35.0106, 135.7936],
  "Philosopher's Path to Ginkaku-ji": [35.0209, 135.7941],
  "Nijō Castle": [35.014, 135.7485],
  "Kyoto Imperial Palace": [35.0253, 135.7623],
  "Pontochō alley": [35.006, 135.7711],
  "Byōdō-in": [34.8895, 135.8075],
  "Nakamura Tōkichi Uji Honten": [34.8893, 135.8016],
  "Ujigami Shrine and the riverbank": [34.8921, 135.8115],

  /* ── Osaka ───────────────────────────────────────────────────────────── */
  "Kuromon Ichiba Market": [34.6653, 135.507],
  Dōtonbori: [34.6687, 135.5016],
  "Shitennō-ji": [34.6547, 135.5168],
  "Shinsekai and Tsūtenkaku": [34.6525, 135.5063],
  "Janjan Yokochō": [34.6499, 135.5061],
  "Abeno Harukas 300": [34.6458, 135.514],
  "Osaka Aquarium Kaiyukan": [34.6545, 135.4289],
  "Naniwa Kuishinbo Yokochō": [34.6563, 135.4304],
  "Nakanoshima and Kitahama": [34.6924, 135.5078],
  "Umeda Sky Building": [34.7053, 135.4905],
  "Osaka Castle Park": [34.6865, 135.5272],
  "Tenjinbashisuji Shōtengai": [34.6997, 135.5116],
  "Umekita Park at Osaka Station": [34.7054, 135.4927],

  /* ── Hakone ──────────────────────────────────────────────────────────── */
  Ōwakudani: [35.2446, 139.0199],
  "Hakone Shrine": [35.204, 139.0256],
  "Hakone Shrine torii": [35.2027, 139.0257],
  "Amazake Chaya": [35.2022, 139.049],
  "Tenzan Tōji-kyō": [35.2249, 139.0887],
  "Hakone Open-Air Museum": [35.2443, 139.0521],
  "Pola Museum of Art": [35.2567, 139.0212],
  "Gōra Park": [35.2486, 139.0452],
  "Hatsuhana Honten": [35.2311, 139.1002],

  /* ── Kanazawa ────────────────────────────────────────────────────────── */
  "Kenroku-en": [36.5624, 136.6624],
  "Kanazawa Castle Park": [36.5658, 136.6594],
  Miyoshian: [36.563, 136.6612],
  "21st Century Museum of Contemporary Art": [36.5608, 136.6582],
  "Ōmichō Market": [36.5717, 136.656],
  "Higashi Chaya District": [36.5726, 136.6667],
  "Nagamachi samurai district": [36.564, 136.65],
  "Shirakawa-gō (Ogimachi)": [36.2573, 136.9068],
  "Wada House": [36.26, 136.907],
  Irori: [36.2609, 136.9069],
  "Shiroyama viewpoint": [36.263, 136.908],

  /* ── Hiroshima ───────────────────────────────────────────────────────── */
  "Hiroshima Peace Memorial Museum": [34.3918, 132.4521],
  "A-Bomb Dome and the cenotaph": [34.3955, 132.4535],
  Okonomimura: [34.3913, 132.4619],
  "Itsukushima Shrine": [34.2965, 132.319],
  "Mount Misen": [34.2798, 132.3197],
  "Anago-meshi on Omotesandō": [34.2977, 132.3208],
  "Daishō-in": [34.2928, 132.3188],
  "Shukkei-en": [34.4003, 132.4674],
  "Hiroshima Castle": [34.4021, 132.4595],
  "Kanawa oyster boat": [34.3934, 132.4545],
  "Hondōri arcade": [34.3938, 132.457],

  /* ── Sapporo ─────────────────────────────────────────────────────────── */
  "Ōdori Park": [43.0599, 141.3475],
  "Nijō Market": [43.0582, 141.3585],
  "Sapporo TV Tower": [43.0611, 141.3564],
  "Ganso Ramen Yokochō": [43.0546, 141.3543],
  "Otaru Canal": [43.1978, 141.003],
  "Sakaimachi glass workshops": [43.1944, 141.0061],
  "Otaru Sushiya-dōri": [43.1959, 141.002],
  "Hoheikyo Onsen": [42.9496, 141.1561],
  "Futami Suspension Bridge": [42.9638, 141.1581],
  "Jōzankei foot baths": [42.9649, 141.1633],
  "Soup Curry Garaku": [43.0581, 141.3551],
  "Hokkaidō Jingu": [43.0546, 141.3092],
  "Hokkaido University ginkgo avenue": [43.0748, 141.3435],
  "Mount Moiwa ropeway": [43.0316, 141.3331],
  "Jingisukan Daruma": [43.0549, 141.3525],

  /* ── Japan day trips ─────────────────────────────────────────────────── */
  "Tōdai-ji": [34.689, 135.8398],
  "Nara Park deer": [34.6851, 135.843],
  "Kasuga Taisha": [34.6812, 135.8482],
  Naramachi: [34.6785, 135.8285],
  "Shinkyō Bridge": [36.7533, 139.604],
  "Tōshō-gū": [36.7576, 139.5991],
  "Kegon Falls": [36.7381, 139.5036],
  "Lake Chūzenji": [36.7368, 139.4769],
  "Kōtoku-in Great Buddha": [35.316, 139.5355],
  "Hase-dera": [35.3123, 139.5333],
  "Komachi-dōri": [35.3205, 139.5519],
  "Enoden line to Enoshima": [35.311, 139.4875],
  "Himeji Castle": [34.8393, 134.694],
  "Kōko-en": [34.838, 134.6896],
  "Engyō-ji on Mount Shosha": [34.8888, 134.6591],

  /* ── Istanbul ────────────────────────────────────────────────────────── */
  "Hagia Sophia": [41.0085, 28.98],
  "Blue Mosque": [41.0054, 28.9769],
  "Sultanahmet Köftecisi Selim Usta": [41.008, 28.977],
  "Grand Bazaar": [41.011, 28.9675],
  "Topkapı Palace": [41.0113, 28.9832],
  "Gülhane Park": [41.013, 28.9809],
  "Spice Bazaar": [41.0165, 28.9705],
  "Hamdi Restaurant": [41.0172, 28.9699],
  "Bosphorus ferry to Anadolu Kavağı": [41.1739, 29.0887],
  "Fish lunch at the pier": [41.1739, 29.0887],
  "İstiklal Avenue": [41.0339, 28.9782],
  "Galata Tower": [41.0256, 28.9742],
  "Karaköy for dinner": [41.0234, 28.9772],
  "Kadıköy market streets": [40.9912, 29.0255],
  "Moda seafront walk": [40.9797, 29.0273],
  "Kariye Mosque (Chora)": [41.0312, 28.939],
  Asitane: [41.0309, 28.939],
  "Balat streets": [41.032, 28.9483],
  "Eyüp Sultan Mosque": [41.048, 28.9337],

  /* ── Princes' Islands ────────────────────────────────────────────────── */
  "Büyükada waterfront": [40.8749, 29.1283],
  "Aya Yorgi hill": [40.8487, 29.1195],
  "Lunch one street back": [40.8745, 29.1275],
  "The island loop by bike": [40.8564, 29.119],

  /* ── Bursa ───────────────────────────────────────────────────────────── */
  "Ulu Cami": [40.1831, 29.0614],
  "Koza Han": [40.1844, 29.0635],
  "Kebapçı İskender": [40.1825, 29.0687],
  Cumalıkızık: [40.1764, 29.1723],

  /* ── Tbilisi ─────────────────────────────────────────────────────────── */
  "Abanotubani sulphur baths": [41.6877, 44.8115],
  "Narikala Fortress": [41.6877, 44.8091],
  "Shardeni Street": [41.6905, 44.8084],
  "Jvari Monastery": [41.8383, 44.7335],
  "Svetitskhoveli Cathedral": [41.8423, 44.721],
  Salobie: [41.8284, 44.7251],
  "Chronicle of Georgia": [41.7707, 44.8104],
  "Georgian National Museum": [41.696, 44.8002],
  "Dry Bridge Market": [41.7012, 44.8033],
  "Fabrika courtyard": [41.7096, 44.8028],
  "Open Air Museum of Ethnography": [41.7019, 44.7436],
  "Turtle Lake": [41.7004, 44.7545],
  "Vera and Kiacheli street": [41.7061, 44.7905],
  "Mtatsminda Park": [41.693, 44.7795],
  "Puri Guliani": [41.7022, 44.8052],
  "Meidan Bazaar": [41.6899, 44.8093],

  /* ── Batumi ──────────────────────────────────────────────────────────── */
  "Batumi Boulevard": [41.6536, 41.6345],
  "Piazza and old Batumi": [41.6496, 41.6411],
  "Ali and Nino": [41.6556, 41.6431],
  "Batumi fish market": [41.6492, 41.6633],
  "Batumi Botanical Garden": [41.6944, 41.7083],
  "Mtsvane Kontskhi beach": [41.6918, 41.7052],
  "Argo cable car": [41.6366, 41.6509],
  "Adjarian Khachapuri House": [41.6458, 41.6336],
  "Makhuntseti Waterfall": [41.5749, 41.8583],
  "Queen Tamar's Arch Bridge": [41.5708, 41.8598],
  "Mtirala National Park": [41.6599, 41.8521],

  /* ── Georgia day trips ───────────────────────────────────────────────── */
  "Ananuri Fortress": [42.1637, 44.7031],
  "Russia–Georgia Friendship Monument": [42.4923, 44.4529],
  "Gergeti Trinity Church": [42.6624, 44.6205],
  Sighnaghi: [41.619, 45.9228],
  "The town wall walk": [41.6242, 45.9251],
  "Bodbe Monastery": [41.6067, 45.9329],
};

/**
 * The hand-checked pin for a curated place, or null when we don't have one.
 *
 * Null means "we never confirmed this", not "this place has no location" —
 * so treat it as missing data and leave the place unpinned rather than
 * substituting a city centre or a name search.
 */
/**
 * Regions keep their own coordinate tables beside their content, so a new
 * destination is one new file rather than an edit to three. The central
 * table still wins on a name collision — it is the older, hand-verified one.
 */
import { REGION_COORDS } from "@/lib/packages/regions";

export function coordsFor(name: string): readonly [number, number] | null {
  // central table first, then the regions
  return PLACE_COORDS[name] ?? REGION_COORDS[name] ?? null;
}
