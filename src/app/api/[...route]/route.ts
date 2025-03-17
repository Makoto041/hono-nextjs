import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "./auth";
import callback from "./callback";
import upload from "./upload/upload";

const app = new Hono().basePath("/api");
app.route("/auth", auth);
app.route("/callback", callback);
app.route("/upload", upload);

export const GET = handle(app);
export const POST = handle(app);
