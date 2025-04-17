// src/components/PlaylistForm.tsx
"use client";
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";

/* ───── API から受け取るトラック型 ───── */
type Track = {
  /* Gemini OCR */
  title: string;
  artist: string;
  /* Spotify 検索結果（null → ヒットなし） */
  spotify: {
    uri: string | null;
    name: string | null;
    artist: string | null;
    albumImage: string | null;
  };
};

export default function PlaylistForm() {
  /* ───── フォーム入力 state ───── */
  const [playlistName, setPlaylistName] = useState("");
  const [inputType, setInputType] = useState<"text" | "image">("image");
  const [setlistText, setSetlistText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  /* ───── 検索結果 state ───── */
  const [tracks, setTracks] = useState<Track[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);

  /* ───── UI state ───── */
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ─────────────────────────────────────────
   * Step‑1 : OCR + Spotify 検索 (/api/search)
   * ───────────────────────────────────────── */
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const fd = new FormData();
    fd.append("inputType", inputType);
    if (inputType === "image") {
      if (!imageFile) {
        alert("画像を選択してください");
        setLoading(false);
        return;
      }
      fd.append("file", imageFile);
    } else {
      fd.append("setlistText", setlistText);
    }

    try {
      const res = await axios.post("/api/search", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setTracks(res.data.tracks as Track[]);
      setChecked((res.data.tracks as Track[]).map((t) => !!t.spotify.uri));
    } catch (err: any) {
      setMsg(err.response?.data?.error ?? "検索失敗");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
   * Step‑2 : プレイリスト作成 (/api/create-playlist)
   * ───────────────────────────────────────── */
  const handleCreate = async () => {
    const uris = tracks
      .filter((_, i) => checked[i])
      .map((t) => t.spotify.uri!)
      .filter(Boolean);

    if (!uris.length) {
      alert("最低 1 曲は選択してください");
      return;
    }

    const name =
      playlistName || `${new Date().toISOString().slice(0, 10)} Setlist`;

    setLoading(true);
    try {
      const res = await axios.post(
        "/api/create-playlist",
        { playlistName: name, uris },
        { withCredentials: true }
      );
      setMsg(`🎉 プレイリスト作成成功！\n${res.data.playlistUrl}`);
    } catch (err: any) {
      setMsg(err.response?.data?.error ?? "プレイリスト作成失敗");
    } finally {
      setLoading(false);
    }
  };

  /* チェックボックス切替 */
  const toggle = (idx: number) =>
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));

  /* 画像ファイル名を title に表示 */
  useEffect(() => {
    if (fileInputRef.current && imageFile) {
      fileInputRef.current.title = imageFile.name;
    }
  }, [imageFile]);

  /* ─────────────────────────── */
  return (
    <div className="w-full max-w-7xl mx-auto space-y-10">
      {/* ────────── 入力フォーム ────────── */}
      <form onSubmit={handleSearch} className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {/* プレイリスト名 */}
          <div>
            <label className="block font-medium mb-1">プレイリスト名</label>
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
            <label className="block font-medium mb-1">入力形式</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as "text" | "image")}
              className="w-full p-3 rounded bg-black border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-500"
            >
              <option value="text">テキスト</option>
              <option value="image">画像</option>
            </select>
          </div>
        </div>

        {/* テキスト or 画像入力 */}
        {inputType === "text" ? (
          <div>
            <label className="block font-medium mb-1">
              セットリスト（テキスト）
            </label>
            <textarea
              value={setlistText}
              onChange={(e) => setSetlistText(e.target.value)}
              placeholder={`例:\n1: STAY - Smile High, Antwaun Stanley\n2: In Touch - Daul, Charli Taft\n3: WE ARE - eill`}
              className="w-full h-32 p-3 rounded bg-black border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-500"
            />
          </div>
        ) : (
          <div>
            <label className="block font-medium mb-1">
              セットリスト（画像）
            </label>
            {/* file: プレフィックスでボタン部分を緑系に統一 */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files?.[0]) setImageFile(e.target.files[0]);
              }}
              className="w-full
                         text-green-500 file:mr-4 file:py-2 file:px-4
                         file:rounded file:border-0
                         file:text-sm file:font-semibold
                         file:bg-green-600 file:text-black
                         hover:file:bg-green-500
                         bg-black rounded border border-green-500
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        {/* OCR + Spotify 検索実行 */}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black disabled:opacity-50"
          >
            {loading ? "検索中…" : "OCR＋Spotify 検索"}
          </button>
        </div>
      </form>

      {/* ────────── 検索結果カード一覧 ────────── */}
      {tracks.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">
            Gemini OCR × Spotify 検索結果
          </h2>

          {/* グリッドカード (スマホ1列 / タブレット2列 / PC3列) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t, i) => (
              <label
                key={i}
                className={`flex gap-3 p-4 rounded border
                  ${
                    checked[i]
                      ? "border-green-500 bg-green-900/10"
                      : "border-gray-600 opacity-70"
                  }
                  hover:border-green-400 cursor-pointer transition-colors`}
              >
                {/* チェックボックス */}
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className="shrink-0 h-6 w-6 accent-green-500 mt-1"
                />

                {/* ジャケット */}
                {t.spotify.albumImage ? (
                  <img
                    src={t.spotify.albumImage}
                    alt=""
                    className="shrink-0 w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="shrink-0 w-16 h-16 bg-gray-700 flex items-center justify-center text-[10px] rounded">
                    no
                    <br />
                    img
                  </div>
                )}

                {/* 詳細 */}
                <div className="flex flex-col gap-3 overflow-hidden leading-snug">
                  {/* OCR 行 */}
                  <div>
                    <p className="text-[11px] text-green-400 flex items-center gap-1 mb-1">
                      📷 <span>OCR</span>
                    </p>
                    <p className="font-semibold text-base whitespace-normal">
                      {t.title}
                    </p>
                    <p className="text-xs text-gray-300 whitespace-normal">
                      {t.artist}
                    </p>
                  </div>

                  {/* Spotify 行 */}
                  <div>
                    <p className="text-[11px] text-green-400 flex items-center gap-1 mb-1">
                      🎧 <span>Spotify</span>
                    </p>
                    {t.spotify.uri ? (
                      <>
                        <p className="font-semibold text-base whitespace-normal">
                          {t.spotify.name}
                        </p>
                        <p className="text-xs text-gray-300 whitespace-normal">
                          {t.spotify.artist}
                        </p>
                      </>
                    ) : (
                      <p className="italic text-sm text-red-400 whitespace-normal">
                        見つかりません
                      </p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* プレイリスト作成ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!checked.some(Boolean) || loading}
              className="px-8 py-2 bg-green-600 text-black font-semibold rounded disabled:opacity-40"
            >
              {loading ? "作成中…" : "選択した曲でプレイリスト作成"}
            </button>
          </div>
        </div>
      )}

      {/* ────────── メッセージ ────────── */}
      {msg && (
        <pre className="whitespace-pre-wrap text-center text-green-400">
          {msg}
        </pre>
      )}
    </div>
  );
}
