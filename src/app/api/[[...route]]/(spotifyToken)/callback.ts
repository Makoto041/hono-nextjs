// src/app/api/[[...route]]/(spotifyToken)/callback.ts
import { Hono } from "hono";
import axios from "axios";
import { getCookie, setCookie } from "hono/cookie";
import dotenv from "dotenv";
dotenv.config();

const app = new Hono();

// ── GET /api/callback ───────────────────────────────────────
app.get("/", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const codeVerifier = getCookie(c, "code_verifier");

  /* state/PKCE 妥当性チェック */
  if (!code || !state || state !== storedState || !codeVerifier) {
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  /* トークンエンドポイントへ */
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    code_verifier: codeVerifier,
  });

  const tokenRes = await axios.post(
    "https://accounts.spotify.com/api/token",
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const token = tokenRes.data as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  /* Cookie 発行 (HttpOnly) */
  setCookie(c, "spotifyAccessToken", token.access_token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: token.expires_in,
  });
  setCookie(c, "spotifyRefreshToken", token.refresh_token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  setCookie(
    c,
    "spotifyAccessExp",
    String(Date.now() + token.expires_in * 1000),
    { path: "/", secure: true, sameSite: "Lax" }
  );

  /* 任意：クリーンアップ */
  setCookie(c, "oauth_state", "", { path: "/", maxAge: 0 });
  setCookie(c, "code_verifier", "", { path: "/", maxAge: 0 });

  return c.redirect("/search");
});

export default app;
