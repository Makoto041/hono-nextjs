// src/app/api/[[...route]]/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "./(spotify)/auth";
import upload from "./(gemini)/upload";
import callback from "./(spotify)/callback";

const app = new Hono().basePath("/api");

// ルートごとに個別にルーティング
app.route("/upload", upload);
app.route("/auth", auth);
app.route("/callback", callback); 

export const GET = handle(app);
export const POST = handle(app);
