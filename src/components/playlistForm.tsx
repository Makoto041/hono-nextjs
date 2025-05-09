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
    if (!url) {
      setToast("この候補はプレビューがありません");
      setTimeout(() => setToast(""), 2500);
      return;
    }

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
      if (openOnCreate) {
        const url = data.playlistUrl;
        const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
        if (isMobile) {
          const match = url.match(/playlist\/([A-Za-z0-9]+)/);
          const playlistId = match ? match[1] : null;
          const appUrl = playlistId ? `spotify:playlist:${playlistId}` : url;
          window.location.href = appUrl;
          setTimeout(() => {
            window.location.href = url;
          }, 1000);
        } else {
          window.open(url, "_blank");
        }
      }
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
    if (fileRef.current && imageFile) {
      fileRef.current.previousElementSibling?.setAttribute(
        "title",
        imageFile.name
      );
    }
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

      {/* Header */}
      {tracks.length > 0 && (
        <header className="sticky top-0 z-10 bg-black/80 backdrop-blur px-3 py-2 border-b border-green-500 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
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
            <a href="/search">
              <span className="text-green-400 font-semibold">Setlistify</span>
            </a>
          </div>

          <div className="flex-1 mx-2">
            <input
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="プレイリスト名"
              className="w-full p-2 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
            />
          </div>

          {/* Spotify トグル - PC は横配置 / Mobile は縦で全幅 */}
          <div className="w-full sm:w-auto order-3 sm:order-2 flex justify-center sm:justify-start mt-2 sm:mt-0">
            <label className="w-full sm:w-auto flex items-center gap-1 p-1 bg-black/20 rounded border border-green-500 text-green-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-green-500"
                checked={openOnCreate}
                onChange={() => setOpenOnCreate((x) => !x)}
              />
              作成後に Spotify を開く
            </label>
          </div>

          {/* 新規 / 作成 + Spotify トグル */}
          <div className="order-4 sm:order-4 mt-2 sm:mt-0 w-full sm:w-auto flex flex-col items-stretch gap-2">
            {/* ボタン行 */}
            <div className="flex flex-row gap-2">
              <button
                onClick={resetAll}
                className="flex-1 sm:flex-none px-8 py-3 sm:px-6 sm:py-2 border border-green-500 text-green-500 font-semibold rounded hover:bg-green-500 hover:text-black transition"
              >
                新規
              </button>
              <button
                onClick={handleCreate}
                disabled={!checked.some(Boolean) || loading}
                className="flex-1 sm:flex-none px-8 py-3 sm:px-6 sm:py-2 bg-green-600 text-black font-semibold rounded disabled:opacity-40 hover:scale-105 transition"
              >
                {loading ? "作成中…" : "✅ 作成"}
              </button>
            </div>
          </div>

          {/* Spotify Attribution */}
          <div className="w-full mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
            <img
              src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png"
              alt="Spotify"
              className="h-4"
            />
            <span>
              Content and previews provided by{" "}
              <a
                href="https://www.spotify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Spotify
              </a>
            </span>
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
            <a href="/" className="cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-14 h-14 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3v13.55A4 4 0 1 0 14 21V8h4V3h-6z" />
              </svg>
            </a>
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
                <div key={idx} className="flex flex-col sm:flex-row gap-2">
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
            className="w-full py-3 bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 text-black font-bold rounded shadow-lg hover:shadow-emerald-400/60 active:scale-95 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                {/* spinner */}
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                読み込み中…
              </span>
            ) : (
              "🚀 OCR＋Spotify 検索"
            )}
          </button>
        </form>
      )}

      {/* ───────── 検索結果カード ───────── */}
      {tracks.length > 0 && (
        <section className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t, i) => {
            const selected = selIdx[i];

            return (
              <div
                key={i}
                onClick={() =>
                  setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))
                }
                className={`p-4 rounded cursor-pointer border transform transition-shadow duration-200
                  hover:shadow-lg hover:-translate-y-1
                  ${
                    checked[i]
                      ? "border-green-500 bg-green-900/10"
                      : "border-gray-600 opacity-70"
                  }`}
              >
                <div className="flex gap-3">
                  {/* チェックボックス */}
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() =>
                      setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-6 w-6 accent-green-500"
                  />

                  {/* 候補画像＆ナビゲーション */}
                  <div className="relative group">
                    {t.spotify.map((cand, idx) => {
                      if (idx !== selected) return null;
                      const id = cand.uri?.split(":")[2];
                      const url = id
                        ? `https://open.spotify.com/track/${id}`
                        : undefined;
                      return (
                        <React.Fragment key={idx}>
                          <img
                            src={cand.albumImage!}
                            alt={cand.name!}
                            className="w-28 h-28 object-cover rounded"
                          />
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-1 right-1 p-1 bg-black/70 rounded-full hover:bg-green-600 transition"
                            >
                              {/* external‑link icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z" />
                                <path d="M5 5h5V3H3v7h2V5z" />
                              </svg>
                            </a>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* 前へ */}
                    {t.spotify.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelIdx((arr) =>
                            arr.map((v, idx2) =>
                              idx2 === i
                                ? (v - 1 + t.spotify.length) % t.spotify.length
                                : v
                            )
                          );
                        }}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        ❮
                      </button>
                    )}

                    {/* 次へ */}
                    {t.spotify.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelIdx((arr) =>
                            arr.map((v, idx2) =>
                              idx2 === i ? (v + 1) % t.spotify.length : v
                            )
                          );
                        }}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        ❯
                      </button>
                    )}

                    {/* ドットインジケーター */}
                    {t.spotify.length > 1 && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {t.spotify.map((_, n) => (
                          <span
                            key={n}
                            className={`w-2 h-2 rounded-full ${
                              selected === n ? "bg-green-500" : "bg-gray-500/60"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OCR結果 ＋ 候補表示 */}
                  <div className="flex-1 overflow-hidden text-sm">
                    {/* OCR結果 */}
                    <p className="text-green-400 text-[11px]">📷 OCR</p>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-gray-300">{t.artist}</p>

                    {/* 候補名 */}
                    <p className="mt-2 text-green-400 text-[11px]">
                      🎧 候補 {selected + 1}/{t.spotify.length}
                    </p>
                    {t.spotify.map((cand, idx) => {
                      if (idx !== selected) return null;
                      const id = cand.uri?.split(":")[2];
                      const url = id
                        ? `https://open.spotify.com/track/${id}`
                        : undefined;
                      return url ? (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold hover:underline block"
                        >
                          {cand.name}
                        </a>
                      ) : (
                        <p key={idx} className="font-semibold">
                          {cand.name}
                        </p>
                      );
                    })}
                    <p className="text-gray-300">
                      {t.spotify[selected]?.artist}
                    </p>
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
