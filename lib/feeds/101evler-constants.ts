/**
 * 101evler XML Import — sabit lookup tabloları.
 * Kaynak: "101evler XML Documentation - TR.pdf".
 */

export type Option<T = number> = { id: T; label: string };

/* ────────── İlan Tipi <type_id> ────────── */
export const TYPE_ID_OPTIONS: Option[] = [
  { id: 1,  label: "Villa" },
  { id: 2,  label: "Daire" },
  { id: 3,  label: "İkiz Villa" },
  { id: 4,  label: "Müstakil Ev" },
  { id: 5,  label: "Arsa" },
  { id: 6,  label: "Tarla" },
  { id: 7,  label: "Dükkan" },
  { id: 8,  label: "Hotel" },
  { id: 9,  label: "Studio" },
  { id: 10, label: "Penthouse" },
  { id: 11, label: "Bungalow" },
  { id: 12, label: "İş Yeri" },
  { id: 14, label: "Depo" },
  { id: 15, label: "Devremülk" },
  { id: 16, label: "Komple Bina" },
  { id: 17, label: "Metruk Bina" },
  { id: 18, label: "Devren Satılık İşyeri" },
  { id: 19, label: "Ofis" },
  { id: 20, label: "Residence" },
  { id: 21, label: "Yarım İnşaat" },
  { id: 22, label: "Konut ve Ticari İmarlı Arsa" },
  { id: 23, label: "Ticari İmarlı Arsa" },
  { id: 24, label: "Sanayi İmarlı Arsa" },
  { id: 25, label: "Turizm İmarlı Arsa" },
  { id: 27, label: "Zeytinlik" },
];

/* ────────── Bölgeler <area_id> (şehre göre gruplanmış) ────────── */
export const AREA_ID_OPTIONS: Record<string, Option[]> = {
  "Lefkoşa": [
    { id: 198, label: "Akıncılar" }, { id: 9,   label: "Alayköy" },
    { id: 31,  label: "Balıkesir" }, { id: 111, label: "Beyköy" },
    { id: 12,  label: "Cihangir" },  { id: 85,  label: "Çağlayan" },
    { id: 154, label: "Çukurova" },  { id: 29,  label: "Değirmenlik" },
    { id: 30,  label: "Demirhan" },  { id: 163, label: "Dilekkaya" },
    { id: 10,  label: "Dumlupınar" },{ id: 103, label: "Düzova" },
    { id: 200, label: "Erdemli" },   { id: 150, label: "Gaziköy" },
    { id: 147, label: "Gelibolu" },  { id: 13,  label: "Göçmenköy" },
    { id: 180, label: "Gökhan" },    { id: 14,  label: "Gönyeli" },
    { id: 146, label: "Gürpınar" },  { id: 2,   label: "Hamitköy" },
    { id: 15,  label: "Haspolat" },  { id: 162, label: "Kalavaç" },
    { id: 144, label: "Kanlıköy" },  { id: 183, label: "Kırklar" },
    { id: 17,  label: "Kızılbaş" },  { id: 18,  label: "Köşklüçiftlik" },
    { id: 19,  label: "Kumsal" },    { id: 3,   label: "Küçük Kaymaklı" },
    { id: 20,  label: "Lefkoşa Merkez" }, { id: 142, label: "Lefkoşa Surlariçi" },
    { id: 21,  label: "Marmara" },   { id: 22,  label: "Meriç" },
    { id: 16,  label: "Metehan" },   { id: 23,  label: "Minareliköy" },
    { id: 1,   label: "Ortaköy" },   { id: 25,  label: "Sanayi Bölgesi" },
    { id: 26,  label: "Taşkınköy" }, { id: 145, label: "Türkeli" },
    { id: 101, label: "Yeniceköy" }, { id: 27,  label: "Yenikent" },
    { id: 28,  label: "Yenişehir" }, { id: 32,  label: "Yılmazköy" },
    { id: 210, label: "Batıkent" },  { id: 207, label: "Yiğitler" },
  ],
  "Girne": [
    { id: 33,  label: "Ağırdağ" },   { id: 155, label: "Akçiçek" },
    { id: 34,  label: "Akdeniz" },   { id: 35,  label: "Alagadi" },
    { id: 190, label: "Alemdağ" },   { id: 6,   label: "Alsancak" },
    { id: 36,  label: "Arapköy" },   { id: 159, label: "Aşağı Girne" },
    { id: 37,  label: "Bahçeli" },   { id: 38,  label: "Bellapais" },
    { id: 139, label: "Beşparmak" }, { id: 11,  label: "Boğaz" },
    { id: 39,  label: "Çamlıbel" },  { id: 5,   label: "Çatalköy" },
    { id: 109, label: "Dağyolu" },   { id: 40,  label: "Dikmen" },
    { id: 41,  label: "Doğanköy" },  { id: 42,  label: "Edremit" },
    { id: 43,  label: "Esentepe" },  { id: 191, label: "Geçitköy" },
    { id: 44,  label: "Girne Merkez" }, { id: 165, label: "Göçeri" },
    { id: 113, label: "Hisarköy" },  { id: 112, label: "Ilgaz" },
    { id: 89,  label: "İncesu" },    { id: 45,  label: "Karaağaç" },
    { id: 4,   label: "Karakum" },   { id: 46,  label: "Karaoğlanoğlu" },
    { id: 47,  label: "Karmi" },     { id: 48,  label: "Karşıyaka" },
    { id: 114, label: "Kayalar" },   { id: 157, label: "Kılıçarslan" },
    { id: 156, label: "Koruçam" },   { id: 102, label: "Kozan" },
    { id: 117, label: "Kömürcü" },   { id: 127, label: "Küçük Erenköy" },
    { id: 49,  label: "Lapta" },     { id: 50,  label: "Malatya" },
    { id: 51,  label: "Ozanköy" },   { id: 24,  label: "Pınarbaşı" },
    { id: 52,  label: "Sadrazamköy" }, { id: 179, label: "Şirinevler" },
    { id: 86,  label: "Taşkent" },   { id: 130, label: "Tepebaşı" },
    { id: 160, label: "Türk Mahallesi" }, { id: 88,  label: "Yeşiltepe" },
    { id: 158, label: "Yukarı Girne" }, { id: 54,  label: "Zeytinlik" },
  ],
  "Gazimağusa": [
    { id: 55,  label: "Akdoğan" },   { id: 141, label: "Akova" },
    { id: 149, label: "Alaniçi" },   { id: 196, label: "Arıdamı" },
    { id: 119, label: "Aslanköy" },  { id: 192, label: "Atlılar" },
    { id: 152, label: "Aygün" },     { id: 121, label: "Baykal" },
    { id: 56,  label: "Beyarmudu" }, { id: 122, label: "Çanakkale" },
    { id: 194, label: "Çınarlı" },   { id: 58,  label: "Dörtyol" },
    { id: 189, label: "Dumlupınar" }, { id: 59,  label: "Geçitkale" },
    { id: 166, label: "Gönendere" }, { id: 123, label: "Gülseren" },
    { id: 133, label: "Güvercinlik" }, { id: 140, label: "İnönü" },
    { id: 126, label: "Kaleiçi" },   { id: 7,   label: "Karakol" },
    { id: 131, label: "Korkuteli" }, { id: 184, label: "Kurudere" },
    { id: 104, label: "Kuzucuk" },   { id: 8,   label: "Mağusa Merkez" },
    { id: 143, label: "Mağusa Surlariçi" }, { id: 195, label: "Mallıdağ" },
    { id: 125, label: "Maraş" },     { id: 96,  label: "Mormenekşe" },
    { id: 60,  label: "Mutluyaka" }, { id: 148, label: "Paşaköy" },
    { id: 182, label: "Pınarlı" },   { id: 193, label: "Pirhan" },
    { id: 124, label: "Sakarya" },   { id: 94,  label: "Salamis" },
    { id: 61,  label: "Serdarlı" },  { id: 53,  label: "Tatlısu" },
    { id: 203, label: "Tirmen" },    { id: 118, label: "Turunçlu" },
    { id: 62,  label: "Tuzla" },     { id: 188, label: "Türkmenköy" },
    { id: 181, label: "Ulukışla" },  { id: 65,  label: "Vadili" },
    { id: 197, label: "Yamaçköy" },  { id: 63,  label: "Yeni Boğaziçi" },
    { id: 137, label: "Yıldırım" },
    { id: 213, label: "Muratağa" },
  ],
  "Güzelyurt": [
    { id: 186, label: "Akçay" },     { id: 66,  label: "Aşağı Bostancı" },
    { id: 187, label: "Aydınköy" },  { id: 161, label: "Cengizköy" },
    { id: 70,  label: "Güzelyurt Merkez" }, { id: 90,  label: "Kalkanlı" },
    { id: 202, label: "Serhatköy" }, { id: 185, label: "Yayla" },
    { id: 74,  label: "Yukarı Bostancı" }, { id: 75,  label: "Zümrütköy" },
    { id: 211, label: "Mevlevi" },
  ],
  "İskele": [
    { id: 173, label: "Ağıllar" },   { id: 100, label: "Altınova" },
    { id: 170, label: "Ardahan" },   { id: 135, label: "Avtepe" },
    { id: 171, label: "Aygün" },     { id: 76,  label: "Bafra" },
    { id: 92,  label: "Bahçeler" },  { id: 84,  label: "Balalan" },
    { id: 168, label: "Bogaziçi" },  { id: 95,  label: "Boğaz" },
    { id: 64,  label: "Boğaztepe - Monarga" }, { id: 134, label: "Boltaşlı" },
    { id: 129, label: "Büyükkonuk" }, { id: 57,  label: "Çayırova" },
    { id: 177, label: "Derince" },   { id: 77,  label: "Dipkarpaz" },
    { id: 110, label: "Ergazi" },    { id: 175, label: "Esenköy" },
    { id: 78,  label: "İskele Merkez" }, { id: 153, label: "Kaleburnu" },
    { id: 108, label: "Kalecik" },   { id: 120, label: "Kantara" },
    { id: 128, label: "Kaplıca" },   { id: 199, label: "Kilitkaya" },
    { id: 79,  label: "Kumyalı" },   { id: 172, label: "Kurtuluş" },
    { id: 178, label: "Kuruova" },   { id: 167, label: "Kuzucuk" },
    { id: 93,  label: "Long Beach" }, { id: 80,  label: "Mehmetçik" },
    { id: 107, label: "Mersinlik" }, { id: 105, label: "Ötüken" },
    { id: 174, label: "Pamuklu" },   { id: 201, label: "Sazlıköy" },
    { id: 81,  label: "Sınırüstü" }, { id: 99,  label: "Sipahi" },
    { id: 136, label: "Taşlıca" },   { id: 106, label: "Topçuköy" },
    { id: 91,  label: "Turnalar" },  { id: 169, label: "Tuzluca" },
    { id: 164, label: "Yarköy" },    { id: 82,  label: "Yedikonuk" },
    { id: 83,  label: "Yeni Erenköy" }, { id: 176, label: "Yeşilköy" },
    { id: 132, label: "Ziyamet" },
  ],
  "Lefke": [
    { id: 67,  label: "Doğancı" },   { id: 68,  label: "Gaziveren" },
    { id: 69,  label: "Gemikonağı" }, { id: 71,  label: "Lefke" },
    { id: 72,  label: "Yedidalga" }, { id: 73,  label: "Yeşilırmak" },
    { id: 151, label: "Yeşilyurt" },
    { id: 206, label: "Bağlıköy" },  { id: 212, label: "Taşpınar" },
  ],
};

/* ────────── Koçan Türü <title_type_id> ────────── */
export const TITLE_TYPE_OPTIONS: Option[] = [
  { id: 1, label: "Türk Koçanlı" },
  { id: 2, label: "Eşdeğer Koçanlı" },
  { id: 3, label: "Yabancı Koçanlı" },
  { id: 4, label: "Devlet Sosyal Konut" },
  { id: 5, label: "Şehit çocuğu" },
  { id: 6, label: "Tahsis" },
  { id: 7, label: "Mücahit Puanı" },
  { id: 8, label: "Leasehold" },
];

/* ────────── Satılık-Kiralık <sale_or_rent> ────────── */
export const SALE_OR_RENT = { S: "Satılık", R: "Kiralık" } as const;
export type SaleOrRent = keyof typeof SALE_OR_RENT;

/* ────────── Fiyat Tipi <price_for> ────────── */
export const PRICE_FOR = { T: "Toplam Fiyat", U: "Birim Fiyatı" } as const;
export type PriceFor = keyof typeof PRICE_FOR;

/* ────────── Kira Ödeme Dönemi <billing_cycle_id> ────────── */
export const BILLING_CYCLE_OPTIONS: Option[] = [
  { id: 5, label: "Aylık Ödemeli" },
  { id: 6, label: "3 Aylık Peşin" },
  { id: 7, label: "6 Aylık Peşin" },
  { id: 8, label: "12 Aylık Peşin" },
];

/* ────────── Fiyat Dönemi <price_period_id> ────────── */
export const PRICE_PERIOD_OPTIONS: Option[] = [
  { id: 3, label: "1 Yıl" },
  { id: 5, label: "6 Ay" },
];

/* ────────── Oda Sayısı <room_count_id> ────────── */
export const ROOM_COUNT_OPTIONS: Option[] = [
  { id: 1,  label: "1+0" }, { id: 2,  label: "1+1" }, { id: 3,  label: "2+1" },
  { id: 4,  label: "2+2" }, { id: 5,  label: "3+1" }, { id: 6,  label: "3+2" },
  { id: 7,  label: "4+1" }, { id: 8,  label: "4+2" }, { id: 9,  label: "5"   },
  { id: 10, label: "5+1" }, { id: 11, label: "5+2" }, { id: 12, label: "5+3" },
  { id: 13, label: "5+4" }, { id: 14, label: "6+1" }, { id: 15, label: "6+2" },
  { id: 16, label: "6+3" }, { id: 17, label: "6+4" }, { id: 18, label: "7+1" },
  { id: 19, label: "7+2" }, { id: 20, label: "7+3" }, { id: 21, label: "8"   },
  { id: 22, label: "2"   },
];

/* ────────── Bina Yaşı <build_age_id> ────────── */
export const BUILD_AGE_OPTIONS: Option[] = [
  { id: 10, label: "0" },   { id: 1,  label: "1" },   { id: 2,  label: "2" },
  { id: 3,  label: "3" },   { id: 4,  label: "4" },   { id: 11, label: "5" },
  { id: 5,  label: "6 - 10" }, { id: 6,  label: "11 - 15" }, { id: 7,  label: "16 - 20" },
  { id: 8,  label: "21 - 25" }, { id: 9,  label: "26" }, { id: 12, label: "Proje Aşamasında" },
];

/* ────────── Eşya Durumu <furnishing_id> ────────── */
export const FURNISHING_OPTIONS: Option[] = [
  { id: 1, label: "Eşyasız" },
  { id: 2, label: "Yarı Eşyalı" },
  { id: 3, label: "Eşyalı" },
  { id: 4, label: "Sadece Beyaz Eşya" },
  { id: 5, label: "Ful Eşyalı" },
];

/* ────────── Fotoğraf Grupları <group_id> ────────── */
export const PHOTO_GROUP_OPTIONS: Option[] = [
  { id: 1,  label: "Dış Görsel" },     { id: 2,  label: "Giriş" },
  { id: 3,  label: "Salon" },          { id: 4,  label: "Mutfak" },
  { id: 5,  label: "Yatak Odası" },    { id: 6,  label: "Banyo" },
  { id: 7,  label: "Ebeveyn Banyo" },  { id: 8,  label: "Çocuk Odası" },
  { id: 9,  label: "Çalışma Odası" },  { id: 10, label: "Teras" },
  { id: 11, label: "Diğer" },          { id: 12, label: "Balkon" },
  { id: 13, label: "Oto Park" },       { id: 14, label: "Garaj" },
  { id: 15, label: "Bodrum" },         { id: 16, label: "Bahçe" },
  { id: 17, label: "Havuz" },          { id: 18, label: "Kiler" },
  { id: 19, label: "Yemek Odası" },    { id: 20, label: "Tapu Görüntüsü" },
  { id: 21, label: "Kat Planı Görüntüsü" }, { id: 22, label: "Site Plan" },
  { id: 23, label: "Uydu Görüntüsü" }, { id: 24, label: "Çamaşır Odası" },
];

/* ────────── Para Birimi kodları (currency) ──────────
 * 101evler gerçek XML export'undan doğrulanmış: GBP = 601.
 * Diğer kodlar henüz export'ta görülmedi, tahminî.
 */
export const CURRENCY_CODE_MAP: Record<string, number> = {
  GBP: 601,
  USD: 602,
  EUR: 603,
  TRY: 604,
};

/* ────────── Reverse lookup yardımcıları ────────── */

export const TYPE_ID_LABEL_MAP: Record<number, string> = Object.fromEntries(
  TYPE_ID_OPTIONS.map((o) => [o.id, o.label]),
);

export const AREA_ID_LABEL_MAP: Record<number, string> = Object.fromEntries(
  Object.values(AREA_ID_OPTIONS)
    .flat()
    .map((o) => [o.id, o.label]),
);

export const TITLE_TYPE_LABEL_MAP: Record<number, string> = Object.fromEntries(
  TITLE_TYPE_OPTIONS.map((o) => [o.id, o.label]),
);

export const ROOM_COUNT_LABEL_MAP: Record<number, string> = Object.fromEntries(
  ROOM_COUNT_OPTIONS.map((o) => [o.id, o.label]),
);

export const BUILD_AGE_LABEL_MAP: Record<number, string> = Object.fromEntries(
  BUILD_AGE_OPTIONS.map((o) => [o.id, o.label]),
);

export const FURNISHING_LABEL_MAP: Record<number, string> = Object.fromEntries(
  FURNISHING_OPTIONS.map((o) => [o.id, o.label]),
);

export const BILLING_CYCLE_LABEL_MAP: Record<number, string> = Object.fromEntries(
  BILLING_CYCLE_OPTIONS.map((o) => [o.id, o.label]),
);

export const PRICE_PERIOD_LABEL_MAP: Record<number, string> = Object.fromEntries(
  PRICE_PERIOD_OPTIONS.map((o) => [o.id, o.label]),
);

export const CURRENCY_NUMBER_TO_CODE: Record<number, string> = Object.fromEntries(
  Object.entries(CURRENCY_CODE_MAP).map(([code, num]) => [num, code]),
);

/* ────────── İlan Özellikleri <ad_specs> ──────────
 * features (jsonb) dizisindeki TR etiketten 101evler tag adına eşleme.
 * Site form'undaki "Özellikler / Ekipmanlar" textarea'sından gelen serbest
 * metinler ve admin checkbox'ları kapsanır. Eşleşmeyenler XML'de yazılmaz.
 *
 * Boolean kolonlar (has_pool, has_garden, sea_view ...) ayrıca builder
 * tarafından öncelikli olarak doldurulur — burada feature-text fallback'i.
 */
export const AD_SPECS_FROM_FEATURES: Record<string, string> = {
  // İç özellikler
  "klima": "ac",
  "balkon": "balcony",
  "barbekü": "barbeku",
  "barbeku": "barbeku",
  "ankastre mutfak": "builtin_kitchen",
  "banyo": "bath_check",
  "panjur": "blind",
  "seramik": "ceramic",
  "sınır duvarları": "bounding_wall",
  "sınır duvarı": "bounding_wall",
  "çift cam": "cift_cam",
  "şehir manzarası": "city_view",
  "kapalı otopark": "closed_park",
  "gömme dolap": "closet",
  "doğu cepheli": "east_face",
  "elektrik altyapısı": "electrical_infrastructure",
  "diafon": "entryphone",
  "yangın alarmı": "fire_alarm",
  "şömine": "fireplace",
  "garaj": "garage",
  "bahçe": "garden",
  "jeneratör": "generator",
  "şehir içi": "in_city",
  "kepenk": "kepenk",
  "kartonpiyer": "kartonpiyer",
  "çamaşır odası": "laundry",
  "asansör": "lift",
  "sende katlı": "loft_sende_kat",
  "ebeveyn wc": "master_bath",
  "ebeveyn dolabı": "master_cabinnet",
  "dağ manzarası": "mountain_view",
  "doğa manzarası": "nature_view",
  "yeşillik manzaralı": "nature_view",
  "yeni": "new",
  "kuzey cepheli": "north_face",
  "panel kapı": "panel_door",
  "parke": "parquet",
  "havuz": "park",
  "özel havuz": "private_pool",
  "ortak havuz": "public_pool",
  "yol": "road",
  "sarı taş ev": "sari_tas",
  "denize sıfır": "sea_front",
  "deniz manzarası": "sea_view",
  "güvenlik kamerası": "security_cam",
  "duş": "shower",
  "solar elektrik üretimi": "solar_electric",
  "güney cepheli": "south_face",
  "çelik kapı": "steel_door",
  "su kuyusu": "su_kuyusu",
  "teras": "terrace",
  "ısı yalıtımı": "thermal_insulation",
  "tv altyapısı": "tv_infrastructure",
  "vestiyer": "vestiyer",
  "duvar kağıdı": "wallpaper",
  "su pompası": "water_booster",
  // PDF'te "Su Yalıtımı" yazıyor, 101evler panelinde "Su Altyapısı" görünüyor.
  "su yalıtımı": "water_infrastructure",
  "su altyapısı": "water_infrastructure",
  "su deposu": "water_tank",
  "batı cephesi": "west_face",
};

/* ────────── Serbest metin özellik eşleşmesi ──────────
 * `features` dizisi admin tarafında serbest yazılıyor ("Gölet ve Dağ Manzaralı",
 * "Ana yol üzeri" …). Tam eşleşme bu metinleri yakalayamadığı için normalize
 * edilmiş gövde (stem) araması yapıyoruz.
 */

/** Türkçe metni eşleşme için sadeleştirir: küçük harf, aksan yok, tek boşluk. */
export function normalizeFeatureText(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** `stem` metnin içinde geçiyorsa tag işaretlenir; `not` varsa o geçtiğinde atlanır. */
export const AD_SPEC_FEATURE_PATTERNS: Array<{ stem: string; tag: string; not?: string[] }> = [
  // Manzara / konum
  { stem: "dag manzara", tag: "mountain_view" },
  { stem: "denize sifir", tag: "sea_front" },
  { stem: "deniz manzara", tag: "sea_view" },
  { stem: "sehir manzara", tag: "city_view" },
  { stem: "doga manzara", tag: "nature_view" },
  { stem: "yesillik manzara", tag: "nature_view" },
  { stem: "yesil manzara", tag: "nature_view" },
  { stem: "ana yol", tag: "road" },
  { stem: "yol uzeri", tag: "road" },
  { stem: "sehir merkez", tag: "in_city" },
  { stem: "sehir ici", tag: "in_city" },
  // Cephe
  { stem: "kuzey cephe", tag: "north_face" },
  { stem: "guney cephe", tag: "south_face" },
  { stem: "dogu cephe", tag: "east_face" },
  { stem: "bati cephe", tag: "west_face" },
  // Altyapı
  { stem: "elektrik altyapi", tag: "electrical_infrastructure" },
  { stem: "su altyapi", tag: "water_infrastructure" },
  { stem: "su yalitim", tag: "water_infrastructure" },
  { stem: "isi yalitim", tag: "thermal_insulation" },
  { stem: "su kuyusu", tag: "su_kuyusu" },
  { stem: "su deposu", tag: "water_tank" },
  { stem: "su pompa", tag: "water_booster" },
  { stem: "jenerator", tag: "generator" },
  { stem: "solar", tag: "solar_electric" },
  { stem: "tv altyapi", tag: "tv_infrastructure" },
  // Havuz (özel/ortak önce, genel "havuz" onlar yokken)
  { stem: "ozel havuz", tag: "private_pool" },
  { stem: "ortak havuz", tag: "public_pool" },
  { stem: "havuz", tag: "park", not: ["ozel havuz", "ortak havuz"] },
  // Diğer yaygın özellikler
  { stem: "klima", tag: "ac" },
  { stem: "asansor", tag: "lift" },
  { stem: "somine", tag: "fireplace" },
  { stem: "balkon", tag: "balcony" },
  { stem: "teras", tag: "terrace" },
  { stem: "bahce", tag: "garden" },
  { stem: "garaj", tag: "garage" },
  { stem: "kapali otopark", tag: "closed_park" },
  { stem: "ankastre", tag: "builtin_kitchen" },
  { stem: "camasir oda", tag: "laundry" },
  { stem: "guvenlik kamera", tag: "security_cam" },
  { stem: "cift cam", tag: "cift_cam" },
  { stem: "celik kapi", tag: "steel_door" },
  { stem: "sinir duvar", tag: "bounding_wall" },
  { stem: "barbeku", tag: "barbeku" },
  { stem: "gomme dolap", tag: "closet" },
  { stem: "sari tas", tag: "sari_tas" },
];

/* ────────── Arsa konum etiketleri → <ad_specs> ──────────
 * lib/land-parcel-detail.ts içindeki LAND_LOCATION_TAG_DEFS id'leri.
 * "koy_merkezi" için 101evler tarafında karşılık yok.
 */
export const LAND_TAG_TO_AD_SPEC: Record<string, string> = {
  dag_manzara: "mountain_view",
  deniz_manzara: "sea_view",
  sehir_merkezi: "in_city",
  ana_yol: "road",
};

/* ────────── Arsa / arazi ilan tipleri <type_id> ──────────
 * Bu tiplerde 101evler'in "Alan" alanı parsel büyüklüğüdür (kapalı alan değil).
 */
export const LAND_TYPE_IDS = new Set<number>([5, 6, 22, 23, 24, 25, 27]);
