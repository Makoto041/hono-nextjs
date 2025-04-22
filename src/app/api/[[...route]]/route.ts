// src/app/api/[[...route]]/route.ts
//----------------------------------
import { Hono } from "hono";
import { handle } from "hono/vercel";

/* --- 各サブルート --- */
import auth from "./(spotifyToken)/auth";
import callback from "./(spotifyToken)/callback";
import getToken from "./(spotifyToken)/getToken";
import createPlaylist from "./(spotifyToken)/create-playlist"; // ← ここ
import upload from "./(gemini)/upload";
import search from "./(gemini)/search";

/* --- ルート定義 --- */
const app = new Hono().basePath("/api");

app.route("/auth", auth);
app.route("/callback", callback);
app.route("/getToken", getToken);
app.route("/create-playlist", createPlaylist); // ← 新ルート
app.route("/upload", upload);
app.route("/search", search);

export const GET = handle(app);
export const POST = handle(app);
