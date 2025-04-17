// src/app/api/[[...route]]/(gemini)/search.ts
import { Hono } from "hono";
import { Buffer } from "buffer";
import { ensureSpotifyToken, SpotifyEnv } from "@/lib/ensureSpotifyToken";
import { analyzeImageWithGemini } from "./_gemini";
import { searchSpotifyTrack } from "../(spotifyToken)/_spotify";

type OcrTrack = { title: string; artist: string };
type ReturnTrack = OcrTrack & {
  spotify: {
    uri: string | null;
    name: string | null;
    artist: string | null;
    albumImage: string | null;
  };
};

const search = new Hono<SpotifyEnv>();
search.use("*", ensureSpotifyToken);

search.post("/", async (c) => {
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

  /* Spotify で 1 曲ずつ検索 */
  const list: ReturnTrack[] = [];
  for (const t of ocrTracks) {
    const hit = await searchSpotifyTrack(`${t.title} ${t.artist}`, token, true); // true=メタデータ取得
    list.push({
      ...t,
      spotify: hit ?? {
        uri: null,
        name: null,
        artist: null,
        albumImage: null,
      },
    });
  }
  return c.json({ tracks: list });
});

export default search;
