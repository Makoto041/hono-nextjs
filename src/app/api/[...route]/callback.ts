import { Hono } from "hono";
import axios from "axios";
import { handle } from "hono/vercel";
import dotenv from "dotenv";

dotenv.config();

const callback = new Hono();

callback.get("/", async (c) => {
  const code = c.req.query("code");
  const codeVerifier = c.req.query("code_verifier");

  if (!code || !codeVerifier) {
    return c.json(
      { error: "認証コードまたはコードベリファイアが見つかりません" },
      400
    );
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    code_verifier: codeVerifier, // PKCEのために必要
  });

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return c.json(tokenResponse.data);
  } catch (error: any) {
    console.error("Spotifyトークン取得エラー:", error);
    return c.json({ error: "トークン取得に失敗しました" }, 500);
  }
});

export default callback;
