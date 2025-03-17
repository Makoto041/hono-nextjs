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

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ??
  (() => {
    console.error("GEMINI_API_KEY is not set");
    return "";
  })();
const SPOTIFY_CLIENT_ID =
  process.env.SPOTIFY_CLIENT_ID ??
  (() => {
    console.error("SPOTIFY_CLIENT_ID is not set");
    return "";
  })();
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ??
  (() => {
    console.error("SPOTIFY_REDIRECT_URI is not set");
    return "";
  })();

app.get("/auth", (c) => {
  // Generate a secure random state string
  const state = randomBytes(16).toString("hex");
  // Set a cookie with the state for CSRF protection (adjust options as needed)
  setCookie(c, "spotify_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/', // パスを明示的に指定
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

// Spotifyのアクセストークンを取得するエンドポイント
 app.get("/callback", async (c) => {
   const code = c.req.query("code");
   console.log("受け取った認証コード:", code);

  if (!code) {
    return c.json({ error: "認証コードが見つかりません" }, 400);
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,  // フロントエンドのURL
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("取得したアクセストークン:", tokenResponse.data);
    return c.json(tokenResponse.data);
  } catch (error) {
    console.error("Spotifyトークン取得エラー:", error);
    return c.json({ error: "トークン取得に失敗しました" }, 500);
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

    if (!fileField.type.startsWith("image/")) {
      console.error("エラー: アップロードされたファイルが画像ではありません");
      return c.json({ error: "Uploaded file is not an image" }, 400);
    }

    console.log("受信したファイル:", fileField);

    const buffer = await fileField.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    console.log("Base64エンコードされた画像:", base64Image);

    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ error: "Gemini API Key is missing" }, 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const mimeType = mime.lookup(fileField.name) || "application/octet-stream";

    const prompt = `
    画像のセットリストをOCRで解析し、以下のJSON形式で出力してください。
    もし認識できなかった場合は null を返してください。
    【出力例】
    {
      "tracks": [
        {
          "artistNames": ["アーティストA", "アーティストB"],
          "trackName": "楽曲名"
        }
      ]
    }
    `;

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      { text: prompt },
    ]);

    const responseText = result.response?.text() || "";
    console.log("Gemini API のレスポンス（Raw Text）:", responseText);

    let responseJson;
    try {
      if (responseText.startsWith("{") || responseText.startsWith("[")) {
        responseJson = JSON.parse(responseText);
      } else {
        const cleanedText = responseText.replace(/```json|```/g, "").trim();
        responseJson = JSON.parse(cleanedText);
      }
    } catch (parseError) {
      console.error("JSON パースエラー:", parseError);
      return c.json({ error: "Failed to parse Gemini API response" }, 500);
    }

    console.log("Gemini API からのレスポンス（JSON）:", responseJson);

    if (!responseJson.tracks || responseJson.tracks.length === 0) {
      console.error("エラー: セットリストが認識できませんでした");
      return c.json({ error: "Setlist could not be recognized" }, 400);
    }

    // Spotify API に送信する処理
    const spotifyAccessToken = c.req.header("Authorization")?.replace("Bearer ", "") || ""; // localStorageからの取得はフロントエンドで行う

    if (!spotifyAccessToken) {
      console.error("エラー: Spotifyのアクセストークンが提供されていません。");
      return c.json({ error: "Spotify access token is missing" }, 401);
    }

    try {
      const userId = process.env.SPOTIFY_USER_ID; // ユーザーIDを環境変数から取得
      if (!userId) {
        console.error("エラー: Spotify User ID is not set");
        return c.json({ error: "Spotify User ID is not set" }, 500);
      }

      const playlistResponse = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: "Generated Playlist",
          public: false
        },
        {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const playlistId = playlistResponse.data.id;
      console.log("作成したプレイリストID:", playlistId);

      const trackUris = [];
      for (const track of responseJson.tracks) {
        const query = encodeURIComponent(
          `${track.trackName} ${track.artistNames.join(" ")}`
        );
        const searchResponse = await axios.get(
          `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${spotifyAccessToken}`,
            },
          }
        );

        if (searchResponse.data.tracks.items.length > 0) {
          trackUris.push(searchResponse.data.tracks.items[0].uri);
        }
      }

      if (trackUris.length > 0) {
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          { uris: trackUris },
          {
            headers: {
              Authorization: `Bearer ${spotifyAccessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Spotify プレイリストにトラックを追加しました。");
      }

      return c.json(
        { message: "Spotify プレイリストを作成しました", responseJson },
        200
      );
    } catch (error: any) {
      if (error.response) {
        console.error(
          `Spotify APIエラー: ${error.response.status} - ${error.response.data.error.message}`
        );
        if (error.response.status === 401) {
          return c.json({ error: "Spotify access token is invalid or expired" }, 401);
        }
      } else {
        console.error("Spotify APIリクエスト中のエラー:", error.message);
      }
      return c.json(
        { error: "Failed to communicate with Spotify API", details: error.message },
        500
      );
    }
  } catch (error) {
    console.error("アップロードエラー:", error);
    return c.json(
      { error: "Internal Server Error", details: error.message },
      500
    );
  }
});

export const GET = handle(app);
export const POST = handle(app);
