export type MenuLink = { label: string; href: string };
export type MenuColumn = { title: string; links: MenuLink[] };
export type MenuTopItem = { id: string; label: string; columns: MenuColumn[] };

const regionsAllCyprus: MenuLink[] = [
  { label: "Tüm Kıbrıs", href: "/ilanlar?bolge=tum-kibris" },
  { label: "Girne", href: "/ilanlar?sehir=girne" },
  { label: "Mağusa", href: "/ilanlar?sehir=magusa" },
  { label: "Lefkoşa", href: "/ilanlar?sehir=lefkosa" },
  { label: "İskele", href: "/ilanlar?sehir=iskele" },
  { label: "Lefke", href: "/ilanlar?sehir=lefke" },
  { label: "Güzelyurt", href: "/ilanlar?sehir=guzelyurt" },
];

const regionsProjects: MenuLink[] = [
  { label: "Tüm Kıbrıs", href: "/ilanlar?tur=proje&bolge=tum-kibris" },
  { label: "Girne", href: "/ilanlar?tur=proje&sehir=girne" },
  { label: "Mağusa", href: "/ilanlar?tur=proje&sehir=magusa" },
  { label: "Lefkoşa", href: "/ilanlar?tur=proje&sehir=lefkosa" },
  { label: "İskele", href: "/ilanlar?tur=proje&sehir=iskele" },
  { label: "Güzelyurt", href: "/ilanlar?tur=proje&sehir=guzelyurt" },
];

export const defaultMegaMenu: MenuTopItem[] = [
  {
    id: "satilik",
    label: "Satılık",
    columns: [
      { title: "Konut", links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=satilik&emlak=konut" })) },
      { title: "Arsa / Arazi", links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=satilik&emlak=arsa" })) },
      { title: "Ticari Emlak", links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=satilik&emlak=ticari" })) },
      { title: "Projeler", links: regionsProjects },
      {
        title: "Projeden İkinci El",
        links: [
          { label: "Tüm Kıbrıs", href: "/ilanlar?tur=satilik&ozel=projeden-ikinci-el" },
          { label: "Girne", href: "/ilanlar?tur=satilik&ozel=projeden-ikinci-el&sehir=girne" },
          { label: "Mağusa", href: "/ilanlar?tur=satilik&ozel=projeden-ikinci-el&sehir=magusa" },
        ],
      },
    ],
  },
  {
    id: "projeler",
    label: "Projeler",
    columns: [{ title: "Bölgeler", links: regionsProjects }],
  },
  {
    id: "kiralik",
    label: "Kiralık",
    columns: [
      { title: "Konut", links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=kiralik&emlak=konut" })) },
      { title: "Ticari Emlak", links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=kiralik&emlak=ticari" })) },
      {
        title: "Günlük Kiralık",
        links: regionsAllCyprus.map((l) => ({ ...l, href: l.href + "&tur=gunluk" })),
      },
    ],
  },
  {
    id: "daha-fazla",
    label: "Daha Fazla",
    columns: [
      {
        title: "Kurumsal",
        links: [
          { label: "Hakkımızda", href: "/hakkimizda" },
          { label: "İletişim", href: "/iletisim" },
          { label: "İlanlarımız", href: "/ilanlar" },
        ],
      },
      {
        title: "Yardım",
        links: [
          { label: "Sıkça Sorulan Sorular", href: "/iletisim" },
          { label: "Gizlilik", href: "/iletisim" },
        ],
      },
    ],
  },
];

export function parseMenuJson(raw: string | null | undefined): MenuTopItem[] {
  if (!raw) return defaultMegaMenu;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return defaultMegaMenu;
    return data as MenuTopItem[];
  } catch {
    return defaultMegaMenu;
  }
}
