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

type Track = {
  title: string;
  artist: string;
  spotify: {
    uri: string | null;
    name: string | null;
    artist: string | null;
    albumImage: string | null;
  };
};

export default function PlaylistForm() {
  /* ------------- state ------------- */
  const [playlistName, setPlaylistName] = useState("");
  const [inputType, setInputType] = useState<"text" | "image">("image");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [manualTracks, setManualTracks] = useState([{ title: "", artist: "" }]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  /* -------- 検索 -------- */
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    const fd = new FormData();
    fd.append("inputType", inputType);

    if (inputType === "image") {
      if (!imageFile) return alertStop();
      fd.append("file", imageFile);
    } else {
      const payload = manualTracks
        .filter((t) => t.title && t.artist)
        .map((t) => `${t.title} - ${t.artist}`)
        .join("\n");
      if (!payload) return alertStop();
      fd.append("setlistText", payload);
    }

    try {
      const res = await axios.post("/api/search", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      const list = res.data.tracks as Track[];
      setTracks(list);
      setChecked(list.map((t) => !!t.spotify.uri));
    } catch (e: any) {
      setMsg(e.response?.data?.error ?? "検索失敗");
    } finally {
      setLoading(false);
    }

    function alertStop() {
      setLoading(false);
      alert("入力を確認してください");
    }
  };

  /* -------- 作成 -------- */
  const handleCreate = async () => {
    const uris = tracks
      .filter((_, i) => checked[i])
      .map((t) => t.spotify.uri!)
      .filter(Boolean);
    if (!uris.length) return alert("1曲以上選択してください");

    const name =
      playlistName || `${new Date().toISOString().slice(0, 10)} Setlist`;

    setLoading(true);
    try {
      const res = await axios.post(
        "/api/create-playlist",
        { playlistName: name, uris },
        { withCredentials: true }
      );
      setMsg(`✅ 完了！\n${res.data.playlistUrl}`);
    } catch (e: any) {
      setMsg(e.response?.data?.error ?? "作成失敗");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setTracks([]);
    setChecked([]);
    setPlaylistName("");
    setImageFile(null);
    setManualTracks([{ title: "", artist: "" }]);
    setMsg("");
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = (i: number) =>
    setChecked((b) => b.map((v, idx) => (idx === i ? !v : v)));

  useEffect(() => {
    if (fileRef.current && imageFile) fileRef.current.title = imageFile.name;
  }, [imageFile]);

  /* ------------- render ------------- */
  return (
    <div className="w-full max-w-7xl mx-auto relative">
      {/* 背景ドット */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,_rgba(32,32,32,0.6)_1px,_transparent_1px)] bg-[length:18px_18px]" />

      {/* ヘッダ */}
      {tracks.length > 0 && (
        <header className="sticky top-0 z-10 bg-black/80 backdrop-blur px-4 py-3 border-b border-green-500 flex flex-wrap items-center gap-3">
          {/* EQ アニメ */}
          <div className="flex gap-[3px] mr-2">
            <span className="w-1 h-4 bg-green-500 animate-eq1" />
            <span className="w-1 h-4 bg-green-500 animate-eq2" />
            <span className="w-1 h-4 bg-green-500 animate-eq3" />
          </div>

          <input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="プレイリスト名"
            className="flex-1 min-w-[180px] p-2 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={!checked.some(Boolean) || loading}
            className="px-6 py-2 bg-green-600 text-black font-semibold rounded disabled:opacity-40 transition hover:scale-105"
          >
            {loading ? "作成中…" : "✅ 作成"}
          </button>
          <button
            onClick={resetAll}
            className="px-4 py-2 text-green-400 hover:text-green-200 transition text-sm"
          >
            新規セットリスト
          </button>
          {msg && (
            <pre className="w-full text-green-400 whitespace-pre-wrap">
              {msg}
            </pre>
          )}
        </header>
      )}

      {/* フォーム */}
      {tracks.length === 0 && (
        <form
          onSubmit={handleSearch}
          className="grid gap-8 md:grid-cols-2 p-8 animate-fade-in"
        >
          {/* 左 */}
          <div className="space-y-4">
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as "text" | "image")}
              className="w-full p-3 rounded bg-black border border-green-500 text-green-500 focus:outline-none"
            >
              <option value="text">テキスト入力</option>
              <option value="image">画像アップロード</option>
            </select>

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
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  e.target.files && setImageFile(e.target.files[0])
                }
                className="w-full text-green-500 file:mr-4 file:py-2 file:px-4
                           file:rounded file:border-0 file:bg-green-600 file:text-black
                           hover:file:bg-green-500 bg-black rounded border border-green-500 cursor-pointer"
              />
            )}
          </div>

          {/* 右 */}
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black disabled:opacity-50 transition hover:scale-105"
            >
              {loading ? "検索中…" : "OCR＋Spotify 検索"}
            </button>
          </div>
        </form>
      )}

      {/* カード */}
      {tracks.length > 0 && (
        <section className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
          {tracks.map((t, i) => (
            <label
              key={i}
              className={`flex gap-3 p-4 rounded border group
                ${
                  checked[i]
                    ? "border-green-500 bg-green-900/10"
                    : "border-gray-600 opacity-70"
                }
                hover:border-green-400 transition`}
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="shrink-0 h-6 w-6 accent-green-500 mt-1"
              />
              {t.spotify.albumImage ? (
                <img
                  src={t.spotify.albumImage}
                  alt=""
                  className="shrink-0 w-16 h-16 object-cover rounded group-hover:scale-105 transition"
                />
              ) : (
                <div className="shrink-0 w-16 h-16 bg-gray-700 flex items-center justify-center text-[10px] rounded">
                  no
                  <br />
                  img
                </div>
              )}
              <div className="flex flex-col gap-3 overflow-hidden leading-snug">
                <div>
                  <p className="text-[11px] text-green-400 flex items-center gap-1">
                    📷 OCR
                  </p>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-gray-300">{t.artist}</p>
                </div>
                <div>
                  <p className="text-[11px] text-green-400 flex items-center gap-1">
                    🎧 Spotify
                  </p>
                  {t.spotify.uri ? (
                    <>
                      <p className="font-semibold">{t.spotify.name}</p>
                      <p className="text-xs text-gray-300">
                        {t.spotify.artist}
                      </p>
                    </>
                  ) : (
                    <p className="italic text-sm text-red-400">
                      見つかりません
                    </p>
                  )}
                </div>
              </div>
            </label>
          ))}
        </section>
      )}

      {/* keyframes */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes eq1 {
          0%,
          100% {
            height: 4px;
          }
          50% {
            height: 16px;
          }
        }
        @keyframes eq2 {
          0%,
          100% {
            height: 16px;
          }
          50% {
            height: 4px;
          }
        }
        @keyframes eq3 {
          0%,
          100% {
            height: 10px;
          }
          50% {
            height: 18px;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease forwards;
        }
        .animate-eq1 {
          animation: eq1 1s linear infinite;
        }
        .animate-eq2 {
          animation: eq2 1s linear infinite 0.2s;
        }
        .animate-eq3 {
          animation: eq3 1s linear infinite 0.4s;
        }
      `}</style>
    </div>
  );
}
