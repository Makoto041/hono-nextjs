import axios from "axios";
import { Hono } from "hono";
import { Buffer } from "buffer";

const app = new Hono();





export async function createSpotifyPlaylist(
  userId: string,
  accessToken: string,
  playlistName: string
) {
  const response = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    {
      name: playlistName,
      public: false,
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.data.id;
}



export async function searchSpotifyTrack(query: string, accessToken: string) {
  const response = await axios.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.data.tracks.items.length > 0) {
    return response.data.tracks.items[0].uri;
  } else {
    return null;
  }
}

export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: string[],
  accessToken: string
) {
  const validUris = trackUris.filter(Boolean); // nullを除外
  if (validUris.length === 0) return;

  await axios.post(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    { uris: validUris },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

app.get('/refresh_token', async (c) => {
  const refreshToken = c.req.query('refresh_token');
  
  if (!refreshToken) {
    return c.json({ error: 'Refresh token is missing' }, 400);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
      }
    );

    return c.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken,
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    return c.json({ error: 'Failed to refresh token' }, 500);
  }
});

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const codeVerifier = c.req.query("code_verifier");

  if (!code || !codeVerifier) {
    return c.json({ error: "Code or code verifier is missing" }, 400);
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return c.json(tokenResponse.data);
  } catch (error: any) {
    console.error("Spotify token acquisition error:", error);
    return c.json({ error: "Failed to acquire token" }, 500);
  }
});

export default app;
