
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      translations: true
    }
  });
  console.log(JSON.stringify(listings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
