import { Hono } from "hono";
import { getCookie } from "hono/cookie";

const app = new Hono();

app.get("/", (c) => {
  const spotifyAccessToken = getCookie(c, "spotifyAccessToken");

  if (!spotifyAccessToken) {
    return c.json({ error: "アクセストークンがありません" }, 401);
  }

  return c.json({ spotifyAccessToken });
});

export default app;
