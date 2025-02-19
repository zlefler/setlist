import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  context: { params: { artist: string } }
) {
  const { params } = await context;

  if (!params?.artist) {
    return new Response(JSON.stringify({ error: 'Missing artist parameter' }), {
      status: 400,
    });
  }

  const artist = params.artist;

  const existingSetlists = await prisma.setlist.findMany({
    where: { artist },
  });

  if (existingSetlists.length > 0) {
    return new Response(JSON.stringify(existingSetlists), { status: 200 });
  }

  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(
    artist
  )}`;

  const res = await fetch(url, {
    headers: {
      'x-api-key': process.env.SETLIST_FM_API_KEY || '',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch setlists' }), {
      status: res.status,
    });
  }

  const data = await res.json();

  const setlistsToStore = data.setlist.map((s: any) => ({
    artist,
    venue: s.venue.name,
    date: s.eventDate,
    songs: s.sets.set || [],
  }));

  await prisma.setlist.createMany({ data: setlistsToStore });

  return new Response(JSON.stringify(setlistsToStore), { status: 200 });
}
