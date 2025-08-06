import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countDistinctArtistsInSetlists() {
  const result = await prisma.setlist.groupBy({
    by: ['artistId'],
    _count: {
      artistId: true,
    },
  });

  console.log('distinct artist count:', result.length);
}

countDistinctArtistsInSetlists()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
