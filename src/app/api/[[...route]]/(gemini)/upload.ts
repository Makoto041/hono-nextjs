import { Hono } from "hono";
import { Buffer } from "buffer";
import { analyzeImageWithGemini } from "./_gemini";
import {
  createSpotifyPlaylist,
  addTracksToPlaylist,
  searchSpotifyTrack,
} from "../(spotify)/_spotify";

const upload = new Hono();

upload.post("/", async (c) => {
  const formData = await c.req.formData();
  const fileField = formData.get("file");
  if (!(fileField instanceof File) || !fileField.type.startsWith("image/")) {
    return c.json({ error: "Invalid file" }, 400);
  }

  const buffer = await fileField.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString("base64");

  const prompt = `画像のセットリストをOCRで解析し、JSON形式で出力してください。`;

  const responseJson = await analyzeImageWithGemini(
    base64Image,
    fileField.name,
    prompt
  );

  if (!responseJson.tracks || responseJson.tracks.length === 0) {
    return c.json({ error: "No tracks found" }, 400);
  }

  const spotifyToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!spotifyToken) {
    return c.json({ error: "Spotify access token missing" }, 401);
  }

  const playlistId = await createSpotifyPlaylist(
    process.env.SPOTIFY_USER_ID!,
    spotifyToken,
    "Generated Playlist"
  );

  const trackUris = await Promise.all(
    responseJson.tracks.map(
      async (track: { trackName: string; artistNames: string[] }) => {
        const query = `${track.trackName} ${track.artistNames.join(" ")}`;
        return await searchSpotifyTrack(query, spotifyToken);
      }
    )
  );

  await addTracksToPlaylist(playlistId, trackUris, spotifyToken);

  return c.json({ message: "Playlist created", playlistId });
});

export default upload;
