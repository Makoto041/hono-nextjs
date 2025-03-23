import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "./(spotify)/auth";
import upload from "./(gemini)/upload";
import callback from "./(spotify)/callback";
import dotenv from "dotenv";
import { getCookie } from "hono/cookie";
import axios from "axios";

dotenv.config();

const app = new Hono().basePath("/api");

// ルートごとに個別にルーティング
// app.route("/auth", auth);
app.route("/upload", upload);
app.route("/auth", auth);
app.route("/callback", callback); 

export const GET = handle(app);
export const POST = handle(app);
