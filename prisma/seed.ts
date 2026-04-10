import { PrismaClient } from "@prisma/client";
import { defaultMegaMenu } from "../lib/default-menu";

const prisma = new PrismaClient();

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

const detailSample = JSON.stringify({
  salesPrice: { value: "€ 1.250.000", visible: true },
  listingNo: { value: "AE-REF-1042", visible: true },
  statusText: { value: "Satılık", visible: true },
  housingType: { value: "Müstakil Ev", visible: true },
  agencyRef: { value: "ALFA-7781", visible: true },
  pricePerM2: { value: "€ 6.250 / m²", visible: true },
  totalPlot: { value: "850 m²", visible: true },
  interiorArea: { value: "200 m²", visible: true },
  floor: { value: "2 kat", visible: true },
  buildingAge: { value: "8 yıl", visible: true },
  pool: { value: "Özel havuz", visible: true },
  garden: { value: "Bakımlı bahçe", visible: true },
  fireplace: { value: "Var", visible: true },
  livingRoom: { value: "2", visible: true },
});

const featuresSample = JSON.stringify([
  "3 yatak odası",
  "3 banyo",
  "Özel yüzme havuzu",
  "Bakımlı ve olgun bahçeler",
  "Geniş çatı terası",
  "Şömine",
  "Plaja 500 m",
  "Sakin mahalle",
  "Modern mutfak",
]);

const nearbySample = JSON.stringify([
  { name: "Sardunya Bay", distance: "700 m" },
  { name: "Bestmar Supermarket", distance: "2.1 km" },
  { name: "Lapta Holiday Club Hotel", distance: "3.8 km" },
  { name: "Camelot Beach", distance: "5.6 km" },
  { name: "Girne Amerikan Üniversitesi", distance: "13.3 km" },
]);

const officePhone = "+90 533 860 65 35";
/** wa.me için rakamlar ayrıştırılır; gösterim telefon ile aynı */
const officeWhatsapp = "+90 533 860 65 35";
const officeAddress = "Şehit Gazeteci Hasan Tahsin Caddesi No.26/1 Ortaköy\nLefkoşa";

async function main() {
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: "ALFA EMLAK",
      phone: officePhone,
      whatsapp: officeWhatsapp,
      email: "info@alfaemlak.com",
      address: officeAddress,
      heroTitle: "Kıbrıs'ın Güvenilir Emlak Platformu",
      heroSubtitle:
        "ALFA EMLAK ile hayalinizdeki konutu, arsayı veya yatırımı keşfedin. Şeffaf süreç, güçlü portföy.",
      footerAbout:
        "ALFA EMLAK, Kuzey Kıbrıs’ta satılık ve kiralık portföyüyle güvenilir danışmanlık sunan kurumsal bir emlak ofisidir.",
      seoTitle: "ALFA EMLAK | Kıbrıs'ın Lüks Emlak Rehberi",
      seoDescription:
        "Satılık, kiralık, proje ve günlük kiralık ilanlar. ALFA EMLAK ile Kıbrıs emlak piyasasında güvenli arayış.",
      socialJson: JSON.stringify({
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        linkedin: "https://linkedin.com",
        youtube: "https://youtube.com",
      }),
      defaultConsultantJson: JSON.stringify({
        name: "Ayşe Demir",
        phone: officePhone,
        whatsapp: officeWhatsapp,
        email: "ayse.demir@alfaemlak.com",
        office: "ALFA EMLAK · Lefkoşa",
        photo: unsplash("photo-1573496359142-b8d87734a5a2"),
        logo: "/placeholder-property.svg",
      }),
      menuJson: JSON.stringify(defaultMegaMenu),
    },
    update: {
      menuJson: JSON.stringify(defaultMegaMenu),
      phone: officePhone,
      whatsapp: officeWhatsapp,
      address: officeAddress,
      defaultConsultantJson: JSON.stringify({
        name: "Ayşe Demir",
        phone: officePhone,
        whatsapp: officeWhatsapp,
        email: "ayse.demir@alfaemlak.com",
        office: "ALFA EMLAK · Lefkoşa",
        photo: unsplash("photo-1573496359142-b8d87734a5a2"),
        logo: "/placeholder-property.svg",
      }),
    },
  });

  const listings = [
    {
      listingId: "AE-2026-0001",
      title: "Karşıyaka’da Deniz Manzaralı Müstakil Villa",
      kind: "SATILIK",
      propertyType: "Villa",
      city: "Girne",
      region: "Karşıyaka",
      neighborhood: "Karşıyaka",
      price: 1250000,
      currency: "EUR",
      shortDescription: "Özel havuz, geniş bahçe ve panoramik deniz manzarası.",
      longDescription: `<p>Bu <strong>müstakil villa</strong>, Girne’nin en gözde bölgelerinden Karşıyaka’da konumlanmaktadır. Geniş yaşam alanları ve doğayla iç içe konumu ile aile yaşamına uygundur.</p><p>İlan, modern mutfak, şömine ve teras alanları ile donatılmıştır.</p>`,
      coverImage: unsplash("photo-1613490493576-7fde63acd811"),
      bedrooms: 3,
      bathrooms: 3,
      areaM2: 200,
      plotAreaM2: 850,
      floor: "2",
      buildingAge: 8,
      livingRooms: 2,
      hasPool: true,
      hasGarden: true,
      hasFireplace: true,
      hasParking: true,
      furnished: false,
      seaView: true,
      detailFields: detailSample,
      features: featuresSample,
      badgeFeatured: true,
      badgeExclusive: true,
      badgeVirtualTour: true,
      badgeVideo: true,
      badgeNew: true,
      badgePriceDrop: false,
      virtualTourUrl: "https://my.matterport.com/show/?m=example",
      virtualTourEnabled: true,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoEnabled: true,
      lat: 35.3364,
      lng: 33.2675,
      mapEnabled: true,
      nearbyPlaces: nearbySample,
      nearbyEnabled: true,
      consultantName: "Ayşe Demir",
      consultantPhone: officePhone,
      consultantWhatsapp: officeWhatsapp,
      consultantEmail: "ayse.demir@alfaemlak.com",
      consultantOffice: "ALFA EMLAK",
      consultantPhoto: unsplash("photo-1573496359142-b8d87734a5a2"),
      consultantOfficeLogo: "/placeholder-property.svg",
      publishStatus: "PUBLISHED",
      views: 1280,
      favoritesCount: 42,
      rating: 4.8,
    },
    {
      listingId: "AE-2026-0002",
      title: "Lefkoşa Merkezde Yatırımlık 2+1 Daire",
      kind: "SATILIK",
      propertyType: "Daire",
      city: "Lefkoşa",
      region: "Merkez",
      neighborhood: "Küçük Kaymaklı",
      price: 189000,
      currency: "EUR",
      shortDescription: "Merkezi konum, otopark ve kapalı site.",
      longDescription:
        "<p>Şehir hayatının tüm imkanlarına yakın, bakımlı apartmanda <em>2+1</em> daire.</p>",
      coverImage: unsplash("photo-1502672260266-1c1ef2d93688"),
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 95,
      plotAreaM2: null,
      floor: "3",
      buildingAge: 12,
      livingRooms: 1,
      hasPool: false,
      hasGarden: false,
      hasFireplace: false,
      hasParking: true,
      furnished: false,
      seaView: false,
      detailFields: JSON.stringify({
        listingNo: { value: "AE-REF-2201", visible: true },
        housingType: { value: "Daire", visible: true },
        interiorArea: { value: "95 m²", visible: true },
      }),
      features: JSON.stringify(["Merkezi konum", "Kapalı otopark", "Güvenlik"]),
      badgeFeatured: true,
      badgeNew: true,
      publishStatus: "PUBLISHED",
      views: 890,
      favoritesCount: 18,
    },
    {
      listingId: "AE-2026-0003",
      title: "İskele Long Beach Önü Günlük Kiralık Daire",
      kind: "GUNLUK_KIRALIK",
      propertyType: "Daire",
      city: "İskele",
      region: "Long Beach",
      price: 120,
      currency: "EUR",
      shortDescription: "Denize yürüme mesafesinde, eşyalı günlük kiralık.",
      longDescription: "<p>Tatil için ideal, ful donanımlı günlük kiralık daire.</p>",
      coverImage: unsplash("photo-1522708323590-d24dbb6b0267"),
      bedrooms: 1,
      bathrooms: 1,
      areaM2: 55,
      furnished: true,
      seaView: true,
      badgeVideo: true,
      publishStatus: "PUBLISHED",
      views: 2100,
      favoritesCount: 67,
    },
    {
      listingId: "AE-2026-0004",
      title: "Girne Marina Yakını Ticari Dükkan",
      kind: "KIRALIK",
      propertyType: "Ticari",
      city: "Girne",
      region: "Merkez",
      price: 3500,
      currency: "EUR",
      shortDescription: "Yoğun yaya trafiği, vitrin cephe.",
      longDescription: "<p>İşletme için yüksek görünürlüklü <strong>ticari dükkân</strong>.</p>",
      coverImage: unsplash("photo-1497366216548-37526070297c"),
      areaM2: 120,
      hasParking: true,
      badgeExclusive: true,
      publishStatus: "PUBLISHED",
      views: 410,
      favoritesCount: 9,
    },
  ];

  for (const data of listings) {
    const { coverImage, ...rest } = data;
    await prisma.listing.create({
      data: {
        ...rest,
        coverImage: typeof coverImage === "string" ? coverImage : null,
        images: {
          create: [
            {
              url:
                typeof coverImage === "string"
                  ? coverImage
                  : unsplash("photo-1564013799919-ab600027ffc6"),
              sortOrder: 0,
              isPrimary: true,
            },
            {
              url: unsplash("photo-1600596542815-ffad4c1539a9"),
              sortOrder: 1,
              isPrimary: false,
            },
            {
              url: unsplash("photo-1600607687939-ce8a6c25118c"),
              sortOrder: 2,
              isPrimary: false,
            },
            {
              url: unsplash("photo-1600566753190-17f0baa2a6c3"),
              sortOrder: 3,
              isPrimary: false,
            },
            {
              url: unsplash("photo-1600585154340-be6161a56a0c"),
              sortOrder: 4,
              isPrimary: false,
            },
          ],
        },
      },
    });
  }

  await prisma.listing.create({
    data: {
      listingId: "AE-2026-0999",
      title: "Taslak Örnek Proje İlanı",
      kind: "PROJE",
      propertyType: "Proje",
      city: "Mağusa",
      region: "İskele",
      price: 450000,
      currency: "EUR",
      shortDescription: "Yalnızca yönetici önizlemesinde görünür taslak.",
      coverImage: unsplash("photo-1545324418-cc1a3fa10c00"),
      publishStatus: "DRAFT",
      bedrooms: 2,
      bathrooms: 2,
      areaM2: 110,
      images: {
        create: [
          {
            url: unsplash("photo-1545324418-cc1a3fa10c00"),
            sortOrder: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
