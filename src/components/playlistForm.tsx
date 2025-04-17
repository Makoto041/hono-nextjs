// src/components/PlaylistForm.tsx
"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";

/**
 * フロントエンドは HttpOnly Cookie に入っている Spotify トークンを
 * 直接読む必要がないため、localStorage や Authorization ヘッダは
 * 一切使わないシンプルなフォームになっています。
 */
export default function PlaylistForm() {
  /* ------------- state ------------- */
  const [playlistName, setPlaylistName] = useState("");
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [setlistText, setSetlistText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  /* ------------- handlers ------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setImageFile(e.target.files[0]);
  };

  /**
   * 画像だけをサクッとアップロードしたいとき用
   * （submit でも同じ API を叩くので必須ではない）
   */
  const handleUpload = async () => {
    if (!imageFile) return alert("ファイルを選択してください");

    const formData = new FormData();
    formData.append("file", imageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include", // ← Cookie を必ず送る
    });

    setResultMsg(res.ok ? "アップロード成功！" : "アップロード失敗…");
  };

  /** 「送信」ボタン */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    /* 送信用のフォームデータ生成 */
    const name =
      playlistName || `${new Date().toISOString().slice(0, 10)} Setlist`;
    const formData = new FormData();
    formData.append("playlistName", name);
    formData.append("inputType", inputType);

    if (inputType === "image") {
      if (!imageFile) {
        alert("画像を選択してください");
        setLoading(false);
        return;
      }
      formData.append("file", imageFile);
    } else {
      formData.append("setlistText", setlistText);
    }

    try {
      /**
       * back‑end (Hono) が Cookie から Spotify トークンを読んでくれるため
       * Authorization ヘッダは不要。credentials:"include" だけで OK
       */
      const res = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      /* 期待するレスポンス構造に合わせて表示を調整 */
      const { message, playlistId, error } = res.data as {
        message?: string;
        playlistId?: string;
        error?: string;
      };

      setResultMsg(
        error
          ? `エラー: ${error}`
          : message
          ? `${message}\nPlaylist ID: ${playlistId}`
          : "処理が完了しました。"
      );
    } catch (err: any) {
      console.error(err);
      setResultMsg(
        err.response?.data?.error ||
          err.message ||
          "不明なエラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------- JSX ------------- */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* プレイリスト名 */}
      <div>
        <label className="block font-medium mb-2">プレイリスト名</label>
        <input
          type="text"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="（空欄の場合は日付＋Setlist）"
          className="w-full p-3 rounded bg-black border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-500"
        />
      </div>

      {/* 入力形式 */}
      <div>
        <label className="block font-medium mb-2">入力形式</label>
        <select
          value={inputType}
          onChange={(e) => setInputType(e.target.value as "text" | "image")}
          className="w-full p-3 rounded bg-black border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-500"
        >
          <option value="text">テキスト</option>
          <option value="image">画像</option>
        </select>
      </div>

      {/* テキスト or 画像入力 */}
      {inputType === "text" ? (
        <div>
          <label className="block font-medium mb-2">
            セットリスト（テキスト）
          </label>
          <textarea
            value={setlistText}
            onChange={(e) => setSetlistText(e.target.value)}
            placeholder={`例:\n1: STAY - Smile High, Antwaun Stanley\n2: In Touch - Daul, Charli Taft\n3: WE ARE - eill\n...`}
            className="w-full p-3 rounded bg-black border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 h-40 text-green-500"
          />
        </div>
      ) : (
        <div>
          <label className="block font-medium mb-2">セットリスト（画像）</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-2 bg-black rounded border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-500"
          />
        </div>
      )}

      {/* ボタン類 */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black disabled:opacity-50"
        >
          アップロード
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black disabled:opacity-50"
        >
          {loading ? "送信中…" : "送信"}
        </button>
      </div>

      {/* 結果メッセージ */}
      {resultMsg && (
        <p className="mt-6 text-center text-lg whitespace-pre-wrap">
          {resultMsg}
        </p>
      )}
    </form>
  );
}
