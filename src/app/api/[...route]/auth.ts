import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { randomBytes } from "crypto";

const auth = new Hono();

auth.get("/", (c) => {
  const state = randomBytes(16).toString("hex");
  setCookie(c, "spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  const query = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope:
      "user-read-private user-read-email playlist-modify-private playlist-modify-public",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state,
  });

  return c.redirect(`https://accounts.spotify.com/authorize?${query}`);
});

export default auth;
