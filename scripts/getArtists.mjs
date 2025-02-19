import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function scrapeAndSaveArtists() {
  const url = 'https://kworb.net/spotify/listeners.html';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const artists = [];

  $("a[href^='artist/']").each((_, a) => {
    const href = $(a).attr('href');
    const name = $(a).text().trim();
    const match = href.match(/artist\/([a-zA-Z0-9]+)_songs\.html/);
    if (match) {
      artists.push({
        name,
        spotifyId: match[1],
      });
    }
  });

  // insert into the database
  await prisma.artist.createMany({
    data: artists,
    skipDuplicates: true,
  });

  console.log(`Inserted ${artists.length} artists into the database.`);
  await prisma.$disconnect();
}

scrapeAndSaveArtists().catch(console.error);
