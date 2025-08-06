import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import qs from 'qs';

const prisma = new PrismaClient();

async function getToken() {
  const data = {
    grant_type: 'client_credentials',
    client_id: '8ad24b94be5a4d6a8fbe519977631c04',
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  };
  const url = 'https://accounts.spotify.com/api/token';
  const res = await axios.post(
    url,
    qs.stringify(data), // form-encoded
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return res.data.access_token;
}

async function getSongData(id, token) {
  const url = `https://api.spotify.com/v1/tracks/${id}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = response.json();
    return data;
  } catch (e) {
    throw new Error(e.message);
  }
}

async function getAllSongs() {
  return prisma.song.findMany();
}

async function addSongsToDatabase(arr) {
  await prisma.spotifySongInfo.createMany({
    data: arr,
    skipDuplicates: true,
  });
  console.log(`Inserted ${arr.length} artists into the database.`);
  await prisma.$disconnect();
}

async function processAllSongs() {
  const token = await getToken();
  const songs = await getAllSongs();
  let songCount = songs.length;
  let i = 1;
  songArr = [];
  for (const song of songs.slice(0, 3)) {
    await new Promise((r) => setTimeout(r, 1000));
    const songData = await getSongData(song.spotifyId, token);
    songArr.push(songData);
    songCount += 1;
    console.log(`Loading songs for song ${i}/${songCount}...`);
  }
  addSongsToDatabase(songArr);
}
processAllSongs().catch(console.error);
