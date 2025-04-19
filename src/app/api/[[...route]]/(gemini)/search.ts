// src/app/api/[[...route]]/(gemini)/search.ts
import { Hono } from "hono";
import { Buffer } from "buffer";
import { analyzeImageWithGemini } from "./_gemini";
import { ensureSpotifyToken, SpotifyEnv } from "@/lib/ensureSpotifyToken";
import { searchSpotifyTrack } from "../(spotifyToken)/_spotify";

type OcrTrack = { title: string; artist: string };

const app = new Hono<SpotifyEnv>();
app.use("*", ensureSpotifyToken);

/* --------------------------------------------------
 * POST /api/search
 *    フロントから FormData を受け取り
 *    1) OCR or テキスト → 曲リスト抽出
 *    2) 各曲を Spotify で最大 3 件検索
 *    3) [{ title, artist, spotify: SpotifyMeta[] }] を返す
 * --------------------------------------------------*/
app.post("/", async (c) => {
  const form = await c.req.formData();
  const inputType = form.get("inputType");
  let ocrTracks: OcrTrack[] = [];

  if (inputType === "text") {
    const raw = (form.get("setlistText") as string) ?? "";
    ocrTracks = raw
      .split("\n")
      .map((l) => l.split(" - "))
      .filter((a) => a.length === 2)
      .map(([title, artist]) => ({ title, artist }));
  } else {
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/"))
      return c.json({ error: "Invalid file" }, 400);

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    ocrTracks = await analyzeImageWithGemini(
      base64,
      file.name,
      "画像のセットリストをOCRで解析し、JSON形式で出力してください。"
    );
  }

  if (!ocrTracks.length) return c.json({ error: "No tracks found" }, 400);

  const token = c.get("spotifyAccessToken") as string;
  const result = [];

  for (const t of ocrTracks) {
    const spotifyCandidates = await searchSpotifyTrack(
      `${t.title} ${t.artist}`,
      token,
      3
    );
    result.push({ ...t, spotify: spotifyCandidates });
  }

  return c.json({ tracks: result });
});

export default app;
