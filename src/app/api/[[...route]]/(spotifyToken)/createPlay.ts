// src/app/api/[[...route]]/(spotifyToken)/create-playlist.ts
import { Hono, MiddlewareHandler } from "hono";
import { handle } from "hono/vercel"; // ★ 追加
import { adminGuard } from "@/lib/adminGuard";
import { getServiceAccessToken } from "@/lib/serviceToken";
import { addTracksToPlaylist, createSpotifyPlaylist } from "./_spotify";

/* Context で使う独自変数（今回は空でも可） */
type Vars = {};

/* Hono インスタンス */
const app = new Hono<{ Variables: Vars }>();

/* パスワード必須ミドルウェア */
app.use("*", adminGuard as MiddlewareHandler<{ Variables: Vars }>);

/* POST /api/create-playlist */
app.post("/", async (c) => {
  /* 1) body 取得 */
  const {
    playlistName,
    uris,
    isPublic = false,
  } = await c.req.json<{
    playlistName: string;
    uris: string[];
    isPublic?: boolean;
  }>();

  if (!uris?.length) return c.json({ error: "No URIs supplied" }, 400);

  /* 2) サービスアカウント用トークン */
  const token = await getServiceAccessToken();

  /* 3) あなたの userId */
  const userId = process.env.SPOTIFY_SERVICE_USER_ID!;
  if (!userId) return c.json({ error: "SPOTIFY_SERVICE_USER_ID not set" }, 500);

  /* 4) プレイリスト作成 & 追加 */
  const playlistId = await createSpotifyPlaylist(
    userId,
    token,
    playlistName || "Setlist",
    isPublic
  );
  await addTracksToPlaylist(playlistId, uris, token);

  /* 5) URL 返却 */
  return c.json({
    success: true,
    playlistUrl: `https://open.spotify.com/playlist/${playlistId}`,
  });
});

/* ★ ここを修正：handle を使う */
export const POST = handle(app);
