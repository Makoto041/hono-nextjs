// src/app/api/[[...route]]/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "./(spotifyToken)/auth";
import upload from "./(gemini)/upload";
import callback from "./(spotifyToken)/callback";

const app = new Hono().basePath("/api");

// ルートごとに個別にルーティング
app.route("/upload", upload);
app.route("/auth", auth);
app.route("/callback", callback); 

export const GET = handle(app);
export const POST = handle(app);
