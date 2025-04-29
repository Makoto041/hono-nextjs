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
      `
以下の指示に従って、画像内のセットリストから曲名とアーティスト名のみを高精度で抽出し、シンプルな JSON 配列で返してください。

【手順】
1. OCR を使って画像から全テキストを取得する。
2. 「No.」「#」「Tracklist」「Setlist」「Date」「Venue」「会場」「日付」など、番号・見出し・日付・会場名の行はすべて無視する。
3. 各行を次のいずれかのパターンでマッチさせる：
   - 曲名 と アーティスト名 が「-」「–」「—」「:」「／」「/」「|」などのいずれかで区切られている
   - 順序が逆（「アーティスト名 - 曲名」）の場合も含める
4. 区切り文字と語順のばらつきを自動判別し、必ず「曲名 - アーティスト名」の順序に整形する。
5. 曲名やアーティスト名に数字・記号・複数語が含まれていても対応する。
6. 上記パターンに合致しない行はすべてスキップする。
7. 取得した「曲名 - アーティスト名」を、改行や追加のキーなしで以下の形式の JSON 配列として正確に出力する。

[
  {
    "track_number": トラックナンバー1 (1-indexed),
    "title": "曲名",
    "artist": "アーティスト名"
  },
  {
    "track_number": トラックナンバー2 (1-indexed),
    "title": "曲名",
    "artist": "アーティスト名"
  }, ...
`
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
