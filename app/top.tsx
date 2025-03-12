'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import axios from "axios";

interface ApiResponse {
  playlistId?: string;
  message: string;
}


export default function Home() {
  const [playlistName, setPlaylistName] = useState<string>("");
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [setlistText, setSetlistText] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // プレイリスト名が未入力の場合、今日の日付＋Setlist をデフォルトに設定
    const name =
      playlistName || `${new Date().toISOString().slice(0, 10)} Setlist`;
    const formData = new FormData();
    formData.append("playlistName", name);
    formData.append("inputType", inputType);
    if (inputType === "text") {
      formData.append("setlistText", setlistText);
    } else if (inputType === "image" && imageFile) {
      formData.append("image", imageFile);
    }

    try {
      // エンドポイントは "/api/upload" 固定
      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const resData = response.data as ApiResponse;
      setResultMsg(
        resData.playlistId
          ? `プレイリスト作成成功！ID: ${resData.playlistId}`
          : resData.message
      );
    } catch (error: any) {
      console.error("送信エラー:", error);
      setResultMsg(error.response?.data?.message || "エラーが発生しました。");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-6 text-green-500">
          Spotify Setlist Generator
        </h1>
        {/* Spotifyログイン用リンク */}
        <div className="mb-6">
          <a
            href="/api/auth"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Spotifyでログイン
          </a>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-2">プレイリスト名</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="（空欄の場合は日付＋Setlist）"
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block font-medium mb-2">入力形式</label>
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as "text" | "image")}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="text">テキスト</option>
              <option value="image">画像</option>
            </select>
          </div>
          {inputType === "text" ? (
            <div>
              <label className="block font-medium mb-2">
                セットリスト（テキスト）
              </label>
              <textarea
                value={setlistText}
                onChange={(e) => setSetlistText(e.target.value)}
                placeholder="例:&#10;1: STAY - Smile High, Antwaun Stanley&#10;2: In Touch - Daul, Charli Taft&#10;3: WE ARE - eill&#10;..."
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 h-40"
              ></textarea>
            </div>
          ) : (
            <div>
              <label className="block font-medium mb-2">
                セットリスト（画像）
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-green-500 hover:bg-green-600 transition-colors font-semibold rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          >
            {loading ? "処理中..." : "プレイリスト作成"}
          </button>
        </form>
        {resultMsg && <p className="mt-6 text-center text-lg">{resultMsg}</p>}
      </div>
    </div>
  );
};



// export default function Hello() {
//   const [message, setMessage] = useState<string>()

//   useEffect(() => {
//     const fetchData = async () => {
//       const res = await fetch('/api/hello')
//       const {message} = await res.json()
//       setMessage(message)
//     }
//     fetchData()
//   }, [])

//   return <section className="w-full py-12 md:py-24 lg:py-32">
//           <div className="flex flex-col items-center justify-center px-4 md:px-6 space-y-4">
//             <p className="max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
//               Here is the response to your API call:
//             </p>
//             <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
//               {!message ? "Loading..." : message}        
//             </h1>
//             <Link
//           href="/api/hello"
//           className="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 "
//           prefetch={false}
//         >
//           View the API call
//         </Link>
//           </div>
//         </section>
// }
