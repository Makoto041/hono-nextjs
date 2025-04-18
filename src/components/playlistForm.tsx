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

/* ===== 型 ===== */
type SpotifyMeta = {
  uri: string | null;
  name: string | null;
  artist: string | null;
  albumImage: string | null;
  preview: string | null;
};
type Track = { title: string; artist: string; spotify: SpotifyMeta[] };

export default function PlaylistForm() {
  /* ---------- 入力 ---------- */
  const [playlistName, setPlaylistName] = useState("");
  const [inputType, setInputType] = useState<"text" | "image">("image");
  const [manualTracks, setManualTracks] = useState([{ title: "", artist: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  /* ---------- 検索結果 ---------- */
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selIdx, setSelIdx] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);

  /* ---------- UI / 再生 ---------- */
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [playing, setPlaying] = useState<{
    i: number;
    audio: HTMLAudioElement;
  } | null>(null);
  const [openOnCreate, setOpenOnCreate] = useState(true);

  const fileRef = useRef<HTMLInputElement | null>(null);

  /* ---- プレビュー再生 ---- */
  const togglePreview = (idx: number) => {
    const url = tracks[idx].spotify[selIdx[idx]]?.preview;
    if (!url) return alert("この候補はプレビューがありません");

    if (playing?.i === idx) {
      playing.audio.pause();
      setPlaying(null);
      return;
    }

    playing?.audio.pause();
    const a = new Audio(url);
    a.play();
    setPlaying({ i: idx, audio: a });
    a.onended = () => setPlaying(null);
  };

  /* ---- 検索 ---- */
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData();
    fd.append("inputType", inputType);

    if (inputType === "image") {
      if (!imageFile) return halt("画像を選択してください");
      fd.append("file", imageFile);
    } else {
      const payload = manualTracks
        .filter((t) => t.title && t.artist)
        .map((t) => `${t.title} - ${t.artist}`)
        .join("\n");
      if (!payload) return halt("曲を入力してください");
      fd.append("setlistText", payload);
    }

    try {
      const { data } = await axios.post("/api/search", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setTracks(data.tracks);
      setSelIdx(data.tracks.map(() => 0));
      setChecked(data.tracks.map((t: Track) => !!t.spotify[0]?.uri));
    } catch (err: any) {
      alert(err.response?.data?.error ?? "検索失敗");
    } finally {
      setLoading(false);
    }
    function halt(msg: string) {
      setLoading(false);
      alert(msg);
    }
  };

  /* ---- プレイリスト作成 ---- */
  const handleCreate = async () => {
    const uris = tracks
      .map((t, i) => t.spotify[selIdx[i]]?.uri || null)
      .filter((u, i) => checked[i] && u) as string[];
    if (!uris.length) return alert("1曲以上選択してください");

    setLoading(true);
    try {
      const { data } = await axios.post(
        "/api/create-playlist",
        { playlistName: playlistName || "Setlist", uris },
        { withCredentials: true }
      );
      navigator.clipboard.writeText(data.playlistUrl);
      setToast("URL をコピーしました");
      setTimeout(() => setToast(""), 2500);
      if (openOnCreate) window.open(data.playlistUrl, "_blank");
    } catch (err: any) {
      alert(err.response?.data?.error ?? "作成失敗");
    } finally {
      setLoading(false);
    }
  };

  /* ---- リセット ---- */
  const resetAll = () => {
    playing?.audio.pause();
    setTracks([]);
    setSelIdx([]);
    setChecked([]);
    setPlaying(null);
    setPlaylistName("");
    setImageFile(null);
    setManualTracks([{ title: "", artist: "" }]);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    if (fileRef.current && imageFile)
      fileRef.current.previousElementSibling?.setAttribute(
        "title",
        imageFile.name
      );
  }, [imageFile]);

  /* ========== JSX ========== */
  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-black px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}

      {/* Header（プレイリスト名・作成ボタン等は省略せず以前のまま） */}
      {tracks.length > 0 && (
        <header className="sticky top-0 z-10 bg-black/80 backdrop-blur px-4 py-3 border-b border-green-500 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 18V5l12-2v13" strokeWidth={1.5} />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-green-400 font-semibold">Setlistify</span>
          </div>

          <input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="プレイリスト名"
            className="flex-1 min-w-[160px] p-2 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
          />

          <label className="flex items-center gap-1 text-green-400 text-xs cursor-pointer">
            <input
              type="checkbox"
              className="accent-green-500"
              checked={openOnCreate}
              onChange={() => setOpenOnCreate((x) => !x)}
            />
            作成後に Spotify を開く
          </label>

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!checked.some(Boolean) || loading}
              className="px-6 py-2 bg-green-600 text-black font-semibold rounded disabled:opacity-40 hover:scale-105 transition"
            >
              {loading ? "作成中…" : "✅ 作成"}
            </button>
            <button
              onClick={resetAll}
              className="px-4 py-2 text-green-400 hover:text-green-200"
            >
              新規
            </button>
          </div>
        </header>
      )}

      {/* ───────── 入力フォーム（検索前） ───────── */}
      {tracks.length === 0 && (
        <form
          onSubmit={handleSearch}
          className="max-w-md mx-auto mt-24 p-8 border border-green-500 rounded-lg space-y-6"
        >
          {/* ロゴ */}
          <div className="flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-14 h-14 text-green-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3v13.55A4 4 0 1 0 14 21V8h4V3h-6z" />
            </svg>
          </div>

          {/* 入力種別 */}
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value as "text" | "image")}
            className="w-full p-3 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
          >
            <option value="text">テキスト入力</option>
            <option value="image">画像アップロード</option>
          </select>

          {/* テキスト or 画像 */}
          {inputType === "text" ? (
            <div className="space-y-3">
              {manualTracks.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    placeholder="曲名"
                    value={row.title}
                    onChange={(e) =>
                      setManualTracks((r) =>
                        r.map((v, i) =>
                          i === idx ? { ...v, title: e.target.value } : v
                        )
                      )
                    }
                    className="flex-1 p-2 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
                  />
                  <input
                    placeholder="アーティスト"
                    value={row.artist}
                    onChange={(e) =>
                      setManualTracks((r) =>
                        r.map((v, i) =>
                          i === idx ? { ...v, artist: e.target.value } : v
                        )
                      )
                    }
                    className="flex-1 p-2 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
                  />
                  {manualTracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setManualTracks((r) => r.filter((_, i) => i !== idx))
                      }
                      className="px-2 text-red-400 hover:text-red-200"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setManualTracks((r) => [...r, { title: "", artist: "" }])
                }
                className="flex items-center gap-1 px-4 py-1 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black transition text-sm"
              >
                ➕ 行を追加
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  e.target.files && setImageFile(e.target.files[0])
                }
              />
              <label
                onClick={() => fileRef.current?.click()}
                className="block cursor-pointer w-full py-3 text-center border border-green-500 rounded text-green-500 hover:bg-green-500 hover:text-black transition"
              >
                {imageFile ? imageFile.name : "ファイルを選択"}
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black disabled:opacity-50 transition"
          >
            {loading ? "検索中…" : "OCR＋Spotify 検索"}
          </button>
        </form>
      )}

      {/* ───────── 検索結果カード ───────── */}
      {tracks.length > 0 && (
        <section className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t, i) => {
            const cur = t.spotify[selIdx[i]];
            return (
              <div
                key={i}
                className={`p-4 rounded border ${
                  checked[i]
                    ? "border-green-500 bg-green-900/10"
                    : "border-gray-600 opacity-70"
                }`}
              >
                <div className="flex gap-3">
                  {/* チェック */}
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() =>
                      setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))
                    }
                    className="mt-1 h-6 w-6 accent-green-500"
                  />

                  {/* ジャケット ＋ ▼ UI */}
                  <div className="relative">
                    {cur?.albumImage ? (
                      <img
                        src={cur.albumImage}
                        alt=""
                        className="w-28 h-28 object-cover rounded"
                      />
                    ) : (
                      <div className="w-28 h-28 bg-gray-700 text-[10px] flex items-center justify-center rounded">
                        no
                        <br />
                        img
                      </div>
                    )}

                    {/* ▶ / ⏸ */}
                    {cur?.preview && (
                      <button
                        onClick={() => togglePreview(i)}
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center"
                      >
                        {playing?.i === i ? "⏸" : "▶"}
                      </button>
                    )}

                    {/* ← → */}
                    {t.spotify.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setSelIdx((a) =>
                              a.map((v, idx) =>
                                idx === i
                                  ? (v - 1 + t.spotify.length) %
                                    t.spotify.length
                                  : v
                              )
                            )
                          }
                          className="absolute -left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          ❮
                        </button>
                        <button
                          onClick={() =>
                            setSelIdx((a) =>
                              a.map((v, idx) =>
                                idx === i ? (v + 1) % t.spotify.length : v
                              )
                            )
                          }
                          className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          ❯
                        </button>
                      </>
                    )}

                    {/* ●●● */}
                    {t.spotify.length > 1 && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {t.spotify.map((_, n) => (
                          <span
                            key={n}
                            className={`w-2 h-2 rounded-full ${
                              selIdx[i] === n
                                ? "bg-green-500"
                                : "bg-gray-500/60"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OCR / Spotify 詳細 */}
                  <div className="flex-1 overflow-hidden text-sm">
                    <p className="text-green-400 text-[11px]">📷 OCR</p>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-gray-300">{t.artist}</p>

                    <p className="mt-2 text-green-400 text-[11px]">
                      🎧 候補 {selIdx[i] + 1}/{t.spotify.length}
                    </p>
                    {cur ? (
                      <>
                        <p className="font-semibold">{cur.name}</p>
                        <p className="text-gray-300">{cur.artist}</p>
                      </>
                    ) : (
                      <p className="italic text-red-400">見つかりません</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
