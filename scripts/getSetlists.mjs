import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETLIST_FM_API_URL = 'https://api.setlist.fm/rest/1.0/search/setlists';

async function getAllArtists() {
  return prisma.artist.findMany();
}

async function getSetlistsFromSetlistFM(artistName) {
  try {
    const response = await axios.get(SETLIST_FM_API_URL, {
      headers: {
        'x-api-key': process.env.SETLIST_FM_API_KEY,
        Accept: 'application/json',
      },
      params: {
        artistName,
        p: 1, // Only fetching the first page of results
      },
    });

    return response.data.setlist; // Extract setlist array
  } catch (error) {
    console.error(`Error fetching setlists for ${artistName}:`, error);
    return [];
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveSetlistsToDB(artist) {
  const setlists = await getSetlistsFromSetlistFM(artist.name);

  for (const setlist of setlists) {
    await delay(1000); // Add delay to prevent rate-limiting

    // Check if setlist already exists
    const setlistExists = await prisma.setlist.findFirst({
      where: {
        artistId: artist.id,
        venue: setlist.venue?.name ?? 'Unknown Venue',
        date: new Date(setlist.eventDate.split('-').reverse().join('-')),
      },
    });

    if (setlistExists) {
      console.log(
        `Setlist for ${artist.name} at ${setlist.venue?.name} already exists, skipping.`
      );
      continue;
    }

    // Create new setlist entry
    const newSetlist = await prisma.setlist.create({
      data: {
        artistId: artist.id,
        venue: setlist.venue?.name ?? 'Unknown Venue',
        date: new Date(setlist.eventDate.split('-').reverse().join('-')),
      },
    });

    console.log(
      `Created new setlist for ${artist.name} at ${setlist.venue?.name}`
    );

    // Extract song list (ensure we handle nested structure correctly)
    const songs = setlist.sets?.set?.flatMap((set) => set.song) ?? [];

    for (const songData of songs) {
      let song = await prisma.song.findFirst({
        where: { title: songData.name, artistId: artist.id },
      });

      if (!song) {
        song = await prisma.song.create({
          data: {
            title: songData.name,
            artistId: artist.id,
          },
        });
      }

      // Link song to setlist
      await prisma.setlistSong.create({
        data: {
          setlistId: newSetlist.id,
          songId: song.id,
        },
      });

      console.log(`Added "${song.title}" to setlist for ${artist.name}`);
    }
  }
}

async function processAllArtists() {
  const artists = await getAllArtists();

  for (const artist of artists) {
    await saveSetlistsToDB(artist);
  }

  console.log('Finished processing all artists.');
}

processAllArtists()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
  });
