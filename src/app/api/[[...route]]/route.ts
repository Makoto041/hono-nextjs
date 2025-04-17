// src/app/api/[[...route]]/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "./(spotifyToken)/auth";
import upload from "./(gemini)/upload";
import callback from "./(spotifyToken)/callback";
import getToken from "./(spotifyToken)/getToken";
import search from "./(gemini)/search";
import create from "./(spotifyToken)/create-playlist";

const app = new Hono().basePath("/api");

// ルートごとに個別にルーティング
app.route("/upload", upload);
app.route("/auth", auth);
app.route("/callback", callback);
app.route("/getToken", getToken);
app.route("/search", search);
app.route("/create-playlist", create);

export const GET = handle(app);
export const POST = handle(app);
