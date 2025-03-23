import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import dotenv from "dotenv";

dotenv.config();

const app = new Hono();

// Spotify認証用エンドポイント
app.get("/spotify-auth", async (c) => {
  // 1. コードベリファイアの生成
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = Array.from(randomValues).reduce(
    (acc, x) => acc + possible[x % possible.length],
    ""
  );
  const code_verifier = randomString;

  // 2. コードチャレンジの作成
  const data = new TextEncoder().encode(code_verifier);
  const hashedBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashedArray = new Uint8Array(hashedBuffer);
  const code_challenge = btoa(String.fromCharCode(...hashedArray))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // 3. コードベリファイアをCookieに保存
  c.cookie("code_verifier", code_verifier, {
    path: "/",
    secure: true,
    sameSite: "Strict",
  });

  // 4. 環境変数からSpotify情報を取得
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return c.json({ error: "Missing Spotify client ID or redirect URI" }, 500);
  }

  // 5. 認証用URLの構築
  const authorizationEndpoint = "https://accounts.spotify.com/authorize";
  const scope = "user-read-private user-read-email";
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
