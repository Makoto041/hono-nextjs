// src/app/api/[[...route]]/(spotifyToken)/create-playlist.ts
import { Hono } from "hono";
import { ensureSpotifyToken, SpotifyEnv } from "@/lib/ensureSpotifyToken";
import { createSpotifyPlaylist, addTracksToPlaylist } from "./_spotify";

const create = new Hono<SpotifyEnv>();
create.use("*", ensureSpotifyToken);

create.post("/", async (c) => {
  const { playlistName, uris } = await c.req.json<{
    playlistName: string;
    uris: string[];
  }>();

  if (!uris?.length) return c.json({ error: "No tracks selected" }, 400);

  const token = c.get("spotifyAccessToken") as string;

  const me = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userId = (await me.json()).id;

  const id = await createSpotifyPlaylist(userId, token, playlistName);
  await addTracksToPlaylist(id, uris, token);

  return c.json({
    success: true,
    playlistUrl: `https://open.spotify.com/playlist/${id}`,
  });
});

export default create;
