// /app/api/[...route]/route.ts

import { Hono } from "hono";
import { handle } from "hono/vercel";
import { setCookie } from "hono/cookie";
import axios from "axios";
export const dynamic = "force-dynamic";
import dotenv from "dotenv";
import { randomBytes } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";
import mime from "mime-types";

const app = new Hono().basePath("/api");
const scope = "user-read-private user-read-email playlist-modify-private playlist-modify-public ";
// 必要なスコープ

// ParsedForm の型定義
interface ParsedForm {
  fields: { [key: string]: string };
  files: { [key: string]: { content: Buffer; filename: string; mimeType?: string } };
}
dotenv.config();


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
// const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "";

// GoogleGenerativeAI のインスタンスを生成
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);



app.get("/auth", (c) => {
  // Generate a secure random state string
  const state = randomBytes(16).toString("hex");
  // Set a cookie with the state for CSRF protection (adjust options as needed)
  setCookie(c, "spotify_auth_state", state, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });

  const queryObj = {
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
  };
  const query = new URLSearchParams(queryObj);
  return c.redirect("https://accounts.spotify.com/authorize?" + query);
  // return c.json({
  //   message: 'Hello from Hono on Vercel!'
  // })
});

app.get("/:wild", (c) => {
  const wild = c.req.param("wild");
  return c.json({
    message: `Hello from Hono on Vercel! You're now on /api/${wild}!`,
  });
});
app.get("/callback", async (c) => {
  // クエリパラメータから code を取得
  const code = c.req.query("code");
  if (!code) {
    return c.json({ error: "Authorization code is missing" }, 400);
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  // Basic 認証用のトークン生成
  const basicAuthToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuthToken}`,
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // リダイレクト先の URL を作成（リクエストヘッダーからホストやプロトコルを取得）
    const host = c.req.header("host");
    const protocol = c.req.header("x-forwarded-proto") || "http";
    const absoluteUrl = `${protocol}://${host}/dashboard?access_token=${access_token}`;

    return c.redirect(absoluteUrl);
  } catch (error: any) {
    return c.json(
      {
        error: "Failed to authenticate with Spotify",
        details: error.message,
      },
      500
    );
  }
});


/**
 * POST /upload
 * フロントエンドからのリクエストを受け、セットリストのテキスト抽出と Spotify プレイリスト作成を行うエンドポイント
 */
app.post("/upload", async (c) => {
  console.log("Received /upload request");
  const rawBody = await c.req.parseBody();
  const form: ParsedForm =
    rawBody &&
    typeof rawBody === "object" &&
    "fields" in rawBody &&
    "files" in rawBody
      ? (rawBody as unknown as ParsedForm)
      : { fields: {}, files: {} };
  console.log("Parsed form:", form);

  // プレイリスト名（未指定の場合は今日の日付＋Setlist）
  const playlistName: string =
    form.fields.playlistName ||
    `${new Date().toISOString().slice(0, 10)} Setlist`;
  // 入力形式（"text" または "image"、デフォルトは "text"）
  const inputType: string = form.fields.inputType || "text";
  let rawText = "";

  if (inputType === "text") {
    rawText = form.fields.setlistText || "";
  } else if (inputType === "image") {
    const imageFile = form.files?.image;
    if (imageFile && imageFile.content) {
      const detectedMime =
        imageFile.mimeType || mime.lookup(imageFile.filename) || "image/png";
      const base64Image = imageFile.content.toString("base64");
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: detectedMime,
        },
      };
      const prompt = "この画像からセットリストのテキストを抽出してください。";
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      rawText = response.text();
    } else {
      return c.json({ message: "画像が提供されていません" }, 400);
    }
  } else {
    return c.json({ message: "inputTypeが不正です" }, 400);
  }
  function parseSetlistText(rawText: string): string {
    const lines = rawText.split("\n");
    const formatted: string[] = [];
    let index = 1;
    for (const line of lines) {
      if (line.includes(" - ")) {
        formatted.push(`${index}. ${line.trim()}`);
        index++;
      }
    }
    return formatted.join("\n");
  }

  console.log("Raw text from Gemini:", rawText);
  const formattedSetlist = parseSetlistText(rawText);
  console.log("Formatted setlist:", formattedSetlist);

  
});


export const GET = handle(app);
export const POST = handle(app);
