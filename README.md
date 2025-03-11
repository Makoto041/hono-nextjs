# Setlist Spotify

**Setlist Spotify** は、入力されたセットリストから自動的に Spotify プレイリストを生成するサービスです。

セットリストは以下の方法で入力できます：

- テキスト入力（形式：「アーティスト名 - 楽曲名」）
- セットリストの画像アップロード（Gemini 2.0 API を用いた OCR 機能で解析）

画像からのテキスト抽出は、Gemini 2.0 API の OCR 機能で行われ、その後 Spotify で該当する楽曲を検索し、プレイリストを作成します。

## 主な機能

- **入力形式の多様性**
  - テキスト形式、画像アップロードに対応
- **OCR 機能**
  - Gemini 2.0 API を使用して画像からテキストを抽出
- **Spotify との連携**
  - Spotify Web API を利用して楽曲を検索、自動的にプレイリスト作成
- **モダンなフロントエンド**
  - React、Vite、TypeScript を採用
- **サーバーレスバックエンド**
  - 軽量フレームワーク Hono を使用、Vercel にデプロイ

## プロジェクト構成

```
Setlist-Spotify/
├─ api/                 # バックエンド（Honoサーバーレス関数）
│   ├─ src/
│   │   └─ index.ts   # バックエンドAPIのエントリーポイント
│   ├─ package.json
│   └─ tsconfig.json
├─ client/              # フロントエンド（React、Vite、TypeScript）
│   ├─ public/
│   ├─ src/
│   │   ├─ App.tsx     # メインコンポーネント
│   │   └─ main.tsx    # エントリーポイント
│   ├─ package.json
│   └─ tsconfig.json
├─ vercel.json          # Vercelの設定（ビルド・ルーティング）
└─ README.md
```

## セットアップ方法

### 前提条件

- [Node.js](https://nodejs.org/)（v14 以上推奨）
- npm（Node.js 同梱）

### フロントエンドのセットアップ

```bash
# ディレクトリに移動
cd client

# 依存パッケージのインストール
npm install

# 開発サーバー起動
npm run dev

# 本番用ビルド作成
npm run build
```

### バックエンドのセットアップ

```bash
# ディレクトリに移動
cd api

# 依存パッケージのインストール
npm install

# ローカル環境で動作確認
npm run dev
```

## 環境変数の設定

バックエンド（`api` ディレクトリ）のルートに `.env` ファイルを作成し、以下の内容を追加します（各値は適切な値に置き換えてください）。

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=your_spotify_redirect_uri
SPOTIFY_ACCESS_TOKEN=your_spotify_access_token
```

また、Vercel のプロジェクト設定にも同様の環境変数を設定してください。

## デプロイ

本プロジェクトは Vercel を使用して静的フロントエンドとサーバーレスバックエンドとしてデプロイされます。

### vercel.json の設定例

プロジェクトのルートに`vercel.json`を配置します。

```json
{
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "api/src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/src/index.ts" },
    { "src": "/(.*)", "dest": "/client/$1" }
  ]
}
```

- `/api/*`へのリクエスト → バックエンドに転送
- その他のリクエスト → フロントエンドのビルド成果物に転送

## デプロイ方法（Vercel CLI 使用）

```bash
# Vercel CLIをインストール
npm install -g vercel

# Vercelにログイン
vercel login

# プレビュー環境にデプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

## 使用方法

- **テキスト入力**

  - 「アーティスト名 - 楽曲名」の形式で入力
  - プレイリスト名は任意（未入力の場合は日付＋ Setlist）

- **画像入力**
  - 画像をアップロードすると Gemini 2.0 API で OCR 処理されます。

入力後、Spotify で楽曲を検索・プレイリストが作成され、プレイリストの ID が返却されます。

## トラブルシューティング

- **404 エラーが発生する場合**

  - `vercel.json`の設定やバックエンドのエンドポイントを確認してください。

- **ビルドエラー**

  - ローカルで`npm run build`を実行してエラーを確認、必要に応じて修正。

- **環境変数のエラー**
  - `.env` ファイルおよび Vercel の設定を確認してください。

## ライセンス

MIT License の下で提供されています。

## クレジット

- [Hono](https://hono.dev/) - 軽量サーバーレスフレームワーク
- [React](https://react.dev/) & [Vite](https://vitejs.dev/) - フロントエンドフレームワーク
- [Tailwind CSS](https://tailwindcss.com/) - スタイリング
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - 楽曲検索、プレイリスト作成
- [Gemini 2.0 API](https://ai.google.dev/models/gemini) - OCR 機能
