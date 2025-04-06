import { Hono } from "hono";
import axios from "axios";
import { getCookie, setCookie } from "hono/cookie";
import dotenv from "dotenv";

dotenv.config();

const app = new Hono();

// Spotify認証コールバック用エンドポイント
// 認証コードを受け取り、アクセストークンを取得する
// 認証コードを受け取るためのエンドポイント

app.get("/", async (c) => {
  // URLクエリから認証コードを取得
  const code = c.req.query("code");
  // クッキーから code_verifier を取得
  const storedCodeVerifier = getCookie(c, "code_verifier");
  console.log("code_verifier", storedCodeVerifier);

  if (!code || !storedCodeVerifier) {
    return c.json(
      { error: "認証コードまたはコードベリファイアが見つかりません" },
      400
    );
  }

  // 必要な環境変数の存在チェック
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!redirectUri || !clientId) {
    return c.json(
      { error: "サーバー設定エラー：環境変数が不足しています" },
      500
    );
  }

  try {
  const token = await getToken(code, storedCodeVerifier);

  // ここでトークンをクッキー保存する処理
    setCookie(c, "access_token", token.access_token, {
      path: "/",
      secure: true, // TODO : 本番環境では true にすること
      sameSite: "Lax",
      httpOnly: true,
    });
  // メインページ（トップページ）にリダイレクトする
  return c.redirect("/search");
} catch (error: any) {
  console.error(
    "Spotifyトークン取得エラー:",
    error.response ? error.response.data : error.message
  );
  return c.json({ error: "トークン取得に失敗しました" }, 500);
}
});

async function getToken(code: string, code_verifier: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUrl = process.env.SPOTIFY_REDIRECT_URI!;
  const tokenEndpoint = "https://accounts.spotify.com/api/token";

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUrl,
    code_verifier: code_verifier,
  });

  const response = await axios.post(tokenEndpoint, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

export default app;