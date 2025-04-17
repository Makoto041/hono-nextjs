// src/app/api/[[...route]]/(gemini)/upload.ts
import { Hono } from "hono";
import { Buffer } from "buffer";
import { ensureSpotifyToken, SpotifyEnv } from "@/lib/ensureSpotifyToken";
import { analyzeImageWithGemini } from "./_gemini";
import {
  createSpotifyPlaylist,
  addTracksToPlaylist,
  searchSpotifyTrack,
} from "../(spotifyToken)/_spotify";

// 👇 Env を指定
const upload = new Hono<SpotifyEnv>();

/* 認証ミドルウェアを前段に */
upload.use("*", ensureSpotifyToken);

/* 変更 1: テキスト入力サポート + プレイリスト名取得 */
upload.post("/", async (c) => {
  const formData = await c.req.formData();

  /* ---- 入力形式を判定 ---- */
  const inputType = formData.get("inputType"); // ←追加
  const playlistName =
    (formData.get("playlistName") as string | null) || "Generated Playlist_1";

  let tracks: { title: string; artist: string }[] = [];

  if (inputType === "text") {
    /* テキストが送られてきた場合 */
    const text = formData.get("setlistText") as string | null;
    if (!text) return c.json({ error: "No text provided" }, 400);

    // 行 → {title, artist} にパースする自前関数例
    tracks = text
      .split("\n")
      .map((line) => line.split(" - "))
      .filter((a) => a.length === 2)
      .map(([title, artist]) => ({ title, artist }));
  } else {
    /* ---------- 画像の場合 (現状ロジック) ---------- */
    const fileField = formData.get("file");
    if (!(fileField instanceof File) || !fileField.type.startsWith("image/")) {
      return c.json({ error: "Invalid file" }, 400);
    }

    const buffer = await fileField.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const prompt =
      "画像のセットリストをOCRで解析し、JSON形式で出力してください。";

    tracks = await analyzeImageWithGemini(base64Image, fileField.name, prompt);
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return c.json({ error: "No tracks found" }, 400);
    }
  }

  /* ---- Spotify 処理は共通 ---- */
  const spotifyToken = c.get("spotifyAccessToken") as string;

  const userMe = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${spotifyToken}` },
  });
  if (!userMe.ok)
    return c.json({ error: "Failed to fetch user" }, userMe.status as any);

  const userId = (await userMe.json()).id;
  const playlistId = await createSpotifyPlaylist(
    userId,
    spotifyToken,
    playlistName
  );

  const trackUris = await Promise.all(
    tracks.map((t) =>
      searchSpotifyTrack(`${t.title} ${t.artist}`, spotifyToken)
    )
  );

  await addTracksToPlaylist(playlistId, trackUris, spotifyToken);
  return c.json({ message: "Playlist created", playlistId });
});

export default upload;
