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

async function fetchWebApi(endpoint, method, body) {
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.SPOTIFY_API_KEY}`,
    },
    method,
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function getTopTracks() {
  // Endpoint reference : https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
  return (
    await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=5', 'GET')
  ).items;
}

const topTracks = await getTopTracks();
console.log(
  topTracks?.map(
    ({ name, artists }) =>
      `${name} by ${artists.map((artist) => artist.name).join(', ')}`
  )
);
