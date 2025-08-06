import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAllArtists() {
  return prisma.artist.findMany();
}

async function getToken() {
  const data = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: data.toString(),
  });

  const json = await res.json();
  return json.access_token;
}

async function getInfo(id, token, resource, slug = '') {
  const url = `https://api.spotify.com/v1/${resource}/${id}/${slug}`;
  while (true) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 429) {
      const retryAfter = +res.headers.get('Retry-After') || 5;
      console.warn(`rate limited, retrying in ${retryAfter}s`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fetch failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data;
  }
}

async function updateSong(songs, song) {
  const match = songs.find(
    (s) =>
      s.title.toLowerCase().includes(song.name.toLowerCase()) ||
      song.name.toLowerCase().includes(s.title.toLowerCase())
  );
  if (match) {
    const existing = await prisma.song.findUnique({
      where: { spotifyId: song.id },
    });
    if (!existing) {
      await prisma.song.update({
        where: { id: match.id },
        data: { spotifyId: song.id },
      });
      return { match: true };
    }
  }
  return { match: false };
}

async function checkArtists() {
  const token = await getToken();
  const artists = await getAllArtists();
  let artistIndex = 457;
  for (const artist of artists.slice(457)) {
    console.log(`checking artist ${artistIndex}/${artists.length - 457}...`);
    let updateCount = 0;
    const songs = await prisma.song.findMany({
      where: {
        artistId: artist.id,
      },
    });
    const albums = await getInfo(artist.spotifyId, token, 'artists', 'albums');
    for (const album of albums.items) {
      await new Promise((r) => setTimeout(r, 100));
      const songList = await getInfo(album.id, token, 'albums');
      for (const song of songList.tracks?.items) {
        const update = await updateSong(songs, song);
        if (update.match) updateCount++;
      }
    }
    console.log(`updated ${updateCount} tracks for artist ${artistIndex}`);
    artistIndex++;
  }
}

checkArtists();
