// src/app/api/[[...route]]/(gemini)/upload.ts
//--------------------------------------------------
import { Hono, MiddlewareHandler } from "hono";
import { Buffer } from "buffer";
import { analyzeImageWithGemini } from "./_gemini";
import {
  createSpotifyPlaylist,
  addTracksToPlaylist,
  searchSpotifyTrack,
  SpotifyTrackMeta,
} from "../(spotifyToken)/_spotify";
import { ensureSpotifyToken } from "@/lib/ensureSpotifyToken";

/* ===== Context で使う独自変数型 ===== */
type CtxVars = { spotifyAccessToken: string };

/* ===== アプリ ===== */
const app = new Hono<{ Variables: CtxVars }>();

/* トークン注入ミドルウェア（ensureSpotifyToken が c.set する想定） */
app.use("*", ensureSpotifyToken as MiddlewareHandler<{ Variables: CtxVars }>);

/* ------------------------------------------------------------------
 * POST /api/upload
 * 画像 → OCR → Spotify 検索 → プレイリスト作成
 * ------------------------------------------------------------------*/
app.post("/", async (c) => {
  /* ---- 1) 画像取得 ---- */
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return c.json({ error: "Invalid file" }, 400);
  }

  /* ---- 2) OCR (Gemini) ---- */
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const ocrTracks: { title: string; artist: string }[] =
    await analyzeImageWithGemini(
      base64,
      file.name,
      "画像のセットリストをOCRで解析し、JSON形式で出力してください。"
    );

  if (!Array.isArray(ocrTracks) || ocrTracks.length === 0) {
    return c.json({ error: "No tracks found" }, 400);
  }

  /* ---- 3) Spotify ユーザ情報取得 ---- */
  const spotifyToken = c.get("spotifyAccessToken");
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${spotifyToken}` },
  });
  if (!meRes.ok)
    return c.json({ error: "Failed to fetch user" }, meRes.status as any);
  const { id: userId } = await meRes.json();

  /* ---- 4) プレイリスト作成 ---- */
  const playlistId = await createSpotifyPlaylist(
    userId,
    spotifyToken,
    "Generated Playlist"
  );

  /* ---- 5) 各曲検索 → 先頭候補で URI を決定 ---- */
  const trackUris: (string | null)[] = await Promise.all(
    ocrTracks.map(async (t) => {
      const cands: SpotifyTrackMeta[] = await searchSpotifyTrack(
        `${t.title} ${t.artist}`,
        spotifyToken
      );
      const chosen = cands.find((c) => c.uri) ?? null;
      return chosen?.uri ?? null;
    })
  );

  /* ---- 6) 追加 & 完了 ---- */
  await addTracksToPlaylist(playlistId, trackUris, spotifyToken);

  return c.json({ message: "Playlist created", playlistId });
});

export default app;
