import { Hono } from "hono";
import { handle } from "hono/vercel";
import { setCookie } from "hono/cookie";
import axios from "axios";
export const dynamic = "force-dynamic";
import { randomBytes } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";
import mime from "mime-types";
import dotenv from "dotenv";
dotenv.config();

const app = new Hono().basePath("/api");
const scope =
  "user-read-private user-read-email playlist-modify-private playlist-modify-public ";
// 必要なスコープ

// ParsedForm の型定義
interface ParsedForm {
  fields: { [key: string]: string };
  files: {
    [key: string]: { content: Buffer; filename: string; mimeType?: string };
  };
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? (() => {
  console.error("GEMINI_API_KEY is not set");
  return "";
})();
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? (() => {
  console.error("SPOTIFY_CLIENT_ID is not set");
  return "";
})();
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? (() => {
  console.error("SPOTIFY_REDIRECT_URI is not set");
  return "";
})();

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

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!redirectUri) {
    console.error("SPOTIFY_REDIRECT_URI is not set");
    return c.json({ error: "SPOTIFY_REDIRECT_URI is not set" }, 500);
  }

  if (!clientId) {
    console.error("SPOTIFY_CLIENT_ID is not set");
    return c.json({ error: "SPOTIFY_CLIENT_ID is not set" }, 500);
  }

  if (!clientSecret) {
    console.error("SPOTIFY_CLIENT_SECRET is not set");
    return c.json({ error: "SPOTIFY_CLIENT_SECRET is not set" }, 500);
  }

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
  try {
    const formData = await c.req.formData();
    console.log("受信したフォームデータ:", formData);

    const fileField = formData.get("file");
    if (!fileField) {
      console.error("エラー: ファイルが受信できていません");
      return c.json({ error: "File is missing" }, 400);
    }
    if (!(fileField instanceof File)) {
      console.error("エラー: fileField が File インスタンスではありません");
      return c.json({ error: "Invalid file format" }, 400);
    }
    
    // 画像ファイルかどうかをチェック
    if (!fileField.type.startsWith("image/")) {
      console.error("エラー: アップロードされたファイルが画像ではありません");
      return c.json({ error: "Uploaded file is not an image" }, 400);
    }
    
    console.log("受信したファイル:", fileField);

    // File を base64 変換
    const buffer = await fileField.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    console.log("Base64エンコードされた画像:", base64Image);

    // Google Generative AI クライアントを初期化
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ error: "Gemini API Key is missing" }, 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const mimeType = mime.lookup(fileField.name) || "application/octet-stream";

    // Gemini API へ送信するプロンプト
    const prompt = `
    画像のセットリストをOCRで解析し、以下のJSON形式で出力してください。

    {
      "tracks": [
        {
          "trackName": "楽曲名",
          "artistNames": ["アーティストA", "アーティストB"]
        }
      ]
    }

    もし認識できなかった場合は null を返してください。
    `;

    // Gemini API へリクエスト
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } }, // mimeType を動的に取得
      { text: prompt },
    ]);

    const responseText = result.response.text();
    return c.json({ result: responseText }, 200);
  } catch (error) {
    console.error("Error processing request:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
