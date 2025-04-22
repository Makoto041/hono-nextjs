import axios from "axios";

let cached: { token: string; exp: number } | null = null;

export async function getServiceAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.exp) return cached.token;

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
      client_id: process.env.SPOTIFY_SERVICE_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_SERVICE_CLIENT_SECRET!,
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  cached = {
    token: res.data.access_token,
    exp: Date.now() + (res.data.expires_in - 30) * 1000,
  };
  return cached.token;
}
