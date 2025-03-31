import { Hono } from "hono"; // Honoフレームワークをインポート
import { setCookie, getCookie } from "hono/cookie"; // Cookieの操作に必要な関数をインポート
import crypto from "crypto"; // 暗号化とランダム値生成のためのモジュール
import dotenv from "dotenv"; // 環境変数を読み込むためのモジュール

dotenv.config(); // .env ファイルから環境変数を読み込み

// Hono アプリケーションのインスタンスを作成
const app = new Hono();

// Spotify認証用エンドポイント
app.get("/", async (c) => {
  // 1. コードベリファイアの生成
  // PKCE（Proof Key for Code Exchange）のためのコードベリファイアを生成
  // 英数字からランダムな文字列を作成
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  // ランダムバイトを生成
  const randomValues = crypto.randomBytes(64);
  // 文字列として結合してコードベリファイアを作成
  const randomString = Array.from(randomValues).reduce(
    (acc, x) => acc + possible[x % possible.length],
    ""
  );
  const code_verifier = randomString;

  // 2. コードチャレンジの作成
  // code_verifier を SHA-256 でハッシュ化
  const hashed = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64");
  // ハッシュ値を URL 安全な形式に変換
  const code_challenge = hashed
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // 3. コードベリファイアをCookieに保存
  // 認証コードを交換する際に使用するために保存
  setCookie(c, "code_verifier", code_verifier, {
    path: "/",
    secure: true,
    sameSite: "Lax",
    httpOnly: true,
  });
  // 4. 環境変数からSpotify情報を取得
  // SPOTIFY_CLIENT_IDとSPOTIFY_REDIRECT_URIのチェック
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    // 必要な情報がない場合はエラーを返す
    return c.json({ error: "Missing Spotify client ID or redirect URI" }, 500);
  }

  // 5. 認証用URLの構築
  // Spotifyの認証エンドポイント
  const authorizationEndpoint = "https://accounts.spotify.com/authorize";
  // 必要なスコープ（権限）を指定
  const scope =
    "user-read-private user-read-email playlist-modify-private playlist-modify-public";
  // 認証リクエストのパラメータを作成
  const params = new URLSearchParams({
    response_type: "code", // 認証コードを要求
    client_id: clientId,
    scope: scope,
    code_challenge_method: "S256", // PKCEの方法を指定
    code_challenge: code_challenge,
    redirect_uri: redirectUri,
  });
  // 認証URLを生成
  const authUrl = `${authorizationEndpoint}?${params.toString()}`;

  // 6. 認証URLへリダイレクト
  // Spotifyのログインページにユーザーをリダイレクト
  return c.redirect(authUrl);
});

// アプリケーションをエクスポート
export default app;
