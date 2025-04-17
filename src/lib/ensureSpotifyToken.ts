import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { Buffer } from "buffer";
import type { MiddlewareHandler } from "hono";

export type SpotifyEnv = {
  Variables: {
    spotifyAccessToken: string;
  };
};

/**
 * 認証必須ルート用ミドルウェア
 *  - Access‑Token が切れそう / 切れている場合は自動リフレッシュ
 *  - Cookie を更新しつつ後続ハンドラに token を渡す
 */
export const ensureSpotifyToken: MiddlewareHandler<SpotifyEnv> = async (
  c,
  next
) => {
  let accessToken = getCookie(c, "spotifyAccessToken");
  const refreshTok = getCookie(c, "spotifyRefreshToken");
  const expString = getCookie(c, "spotifyAccessExp");
  const willExpire = expString && Date.now() > Number(expString) - 30_000; // 30 秒前

  if (!accessToken || willExpire) {
    if (!refreshTok) return c.json({ error: "Not authenticated" }, 401);

    // --- OAuth 2.1 / PKCE 仕様でリフレッシュ ---
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTok,
      client_id: process.env.SPOTIFY_CLIENT_ID!, // public‑client なので secret 不要
    });

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) return c.json({ error: "Failed to refresh" }, 401);

    const data: {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    } = await res.json();

    accessToken = data.access_token;

    // --- Cookie 更新 ---
    setCookie(c, "spotifyAccessToken", accessToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: data.expires_in,
    });
    setCookie(
      c,
      "spotifyAccessExp",
      String(Date.now() + data.expires_in * 1000),
      { path: "/", secure: true, sameSite: "Lax" }
    );
    if (data.refresh_token) {
      setCookie(c, "spotifyRefreshToken", data.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  c.set("spotifyAccessToken", accessToken); // 型エラー消える
  await next();
};
