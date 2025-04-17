// src/app/api/[[...route]]/(spotifyToken)/auth.ts 
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const app = new Hono();

// ── GET /api/auth ───────────────────────────────────────────
app.get("/", async (c) => {
  /* 1. PKCE コードベリファイア生成 */
  const code_verifier = crypto.randomBytes(64).toString("base64url");

  /* 2. コードチャレンジ作成 */
  const code_challenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");

  /* 3. CSRF 対策 state 生成 */
  const state = crypto.randomUUID();

  /* 4. Cookie 保存 (HttpOnly) */
  setCookie(c, "code_verifier", code_verifier, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 600,
  });
  setCookie(c, "oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 600,
  });

  /* 5. 認可エンドポイントへリダイレクト */
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    code_challenge_method: "S256",
    code_challenge,
    state,
    scope:
      "user-read-private user-read-email playlist-modify-private playlist-modify-public",
  });

  return c.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
});

export default app;
