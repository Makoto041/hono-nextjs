import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = new Hono();

// Spotify認証用エンドポイント
app.get("/", async (c) => {
  // 1. コードベリファイアの生成
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.randomBytes(64);
  const randomString = Array.from(randomValues).reduce(
    (acc, x) => acc + possible[x % possible.length],
    ""
  );
  const code_verifier = randomString;

  // 2. コードチャレンジの作成
  const hashed = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64");
  const code_challenge = hashed
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // 3. コードベリファイアをCookieに保存
  setCookie(c, "code_verifier", code_verifier, {
    path: "/",
    secure: true,
    sameSite: "Lax",
    httpOnly: true,
  });
  // 4. 環境変数からSpotify情報を取得
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return c.json({ error: "Missing Spotify client ID or redirect URI" }, 500);
  }

  // 5. 認証用URLの構築
  const authorizationEndpoint = "https://accounts.spotify.com/authorize";
  const scope =
    "user-read-private user-read-email playlist-modify-private playlist-modify-public";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scope,
    code_challenge_method: "S256",
    code_challenge: code_challenge,
    redirect_uri: redirectUri,
  });
  const authUrl = `${authorizationEndpoint}?${params.toString()}`;

  // 6. 認証URLへリダイレクト
  return c.redirect(authUrl);
});



export default app;
