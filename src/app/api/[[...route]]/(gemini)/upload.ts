import { Hono } from "hono";
import { Buffer } from "buffer";
import { analyzeImageWithGemini } from "./_gemini";
import {
  createSpotifyPlaylist,
  addTracksToPlaylist,
  searchSpotifyTrack,
} from "../(spotifyToken)/_spotify";

const upload = new Hono();

// upload.post("/", async (c) => {
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

  if (
    !responseJson ||
    !Array.isArray(responseJson) ||
    responseJson.length === 0
  ) {
    return c.json({ error: "No tracks found" }, 400);
  }

  const spotifyToken = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!spotifyToken) {
    return c.json({ error: "Spotify access token missing" }, 401);
  }
  // Spotifyのユーザー情報を取得して、ユーザーIDを抽出する
  const userResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${spotifyToken}`,
      Accept: "application/json",
    },
  });
  if (!userResponse.ok) {
    return c.json(
      { error: "Failed to fetch Spotify user info" },
      { status: userResponse.status }
    );
  }
  const userData = await userResponse.json();
  const spotifyUserId = userData.id; // ここがユーザーID（例: "makoto123"）

  // 取得したユーザーIDを使ってプレイリストを作成
  const playlistId = await createSpotifyPlaylist(
    spotifyUserId,
    spotifyToken,
    "Generated Playlist"
  );
  console.log("Playlist ID:", playlistId);

  const trackUris = await Promise.all(
    responseJson.map(async (track: { title: string; artist: string }) => {
      // ここで、titleとartistを連結してクエリ文字列を作成する
      const query = `${track.title} ${track.artist}`;
      return await searchSpotifyTrack(query, spotifyToken);
    })
  );

  await addTracksToPlaylist(playlistId, trackUris, spotifyToken);

  return c.json({ message: "Playlist created", playlistId });
});

export default upload;
