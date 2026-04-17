
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const translationsMap = [
  {
    title: "Alsancak’ta Dağ ve Deniz Manzaralı Lüks Müstakil Villa",
    en: {
      title: "Luxury Detached Villa with Mountain and Sea View in Alsancak",
      shortDescription: "Modern 3+1 villa with private pool, large garden and terrace.",
      longDescription: "<p>This wonderful villa offers you a unique life. Enjoy comfort with wide terraces and modern design.</p>"
    },
    ru: {
      title: "Роскошная отдельная вилла с видом на горы и море в Алсанджаке",
      shortDescription: "Современная вилла 3+1 с частным бассейном, большим садом и террасой.",
      longDescription: "<p>Эта замечательная вилла предлагает вам уникальную жизнь. Наслаждайтесь комфортом с широкими террасами и современным дизайном.</p>"
    },
    de: {
      title: "Luxuriöse freistehende Villa mit Berg- und Meerblick in Alsancak",
      shortDescription: "Moderne 3+1 Villa mit privatem Pool, großem Garten und Terrasse.",
      longDescription: "<p>Diese wundervolle Villa bietet Ihnen ein einzigartiges Leben. Genießen Sie Komfort mit weiten Terrassen und modernem Design.</p>"
    },
    fa: {
      title: "ویلای لوکس مستقل با دید کوه و دریا در آلسانجاک",
      shortDescription: "ویلای مدرن ۳+۱ با استخر اختصاصی، باغ بزرگ و تراس.",
      longDescription: "<p>این ویلای شگفت‌انگیز زندگی منحصر به فردی را به شما پیشنهاد می‌دهد. از راحتی با تراس‌های پهن و طراحی مدرن لذت ببرید.</p>"
    }
  },
  {
    title: "Girne Merkezde Eşyalı Kiralık 1+1 Rezidans",
    en: {
      title: "Furnished 1+1 Residence for Rent in Kyrenia Center",
      shortDescription: "Modern design 1+1 apartment in a secured site, very close to transportation networks.",
      longDescription: "<p>Located right in the center of the city, this residence has an elevator and indoor parking.</p>"
    },
    ru: {
      title: "Меблированная резиденция 1+1 в аренду в центре Кирении",
      shortDescription: "Современная квартира 1+1 в охраняемом комплексе, в непосредственной близости от транспортных сетей.",
      longDescription: "<p>Эта резиденция, расположенная в самом центре города, имеет лифт и крытую парковку.</p>"
    },
    de: {
      title: "Möblierte 1+1 Residenz zur Miete im Zentrum von Kyrenia",
      shortDescription: "Modern gestaltete 1+1 Wohnung in einer gesicherten Anlage, ganz in der Nähe von Verkehrsnetzen.",
      longDescription: "<p>Dieses Wohnhaus liegt direkt im Zentrum der Stadt und verfügt über einen Aufzug und eine Tiefgarage.</p>"
    },
    fa: {
      title: "واحد ۱+۱ مبله اجاره‌ای در مرکز گیرنه",
      shortDescription: "آپارتمان ۱+۱ با طراحی مدرن در مجتمع نگهبانی‌دار، بسیار نزدیک به شبکه‌های حمل و نقل.",
      longDescription: "<p>این اقامتگاه که در مرکز شهر واقع شده است، دارای آسانسور و پارکینگ سرپوشیده می‌باشد.</p>"
    }
  }
];

async function main() {
  for (const item of translationsMap) {
    const listing = await prisma.listing.findFirst({
      where: { title: item.title }
    });
    if (listing) {
      const trans = {
        en: item.en,
        ru: item.ru,
        de: item.de,
        fa: item.fa
      };
      await prisma.listing.update({
        where: { id: listing.id },
        data: { translations: JSON.stringify(trans) }
      });
      console.log(`Updated: ${item.title}`);
    } else {
      console.log(`Not found: ${item.title}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
