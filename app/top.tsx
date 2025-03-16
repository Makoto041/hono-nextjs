"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const [playlistName, setPlaylistName] = useState<string>("");
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [setlistText, setSetlistText] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string>("");
  const [response, setResponse] = useState(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImageFile(event.target.files[0]);
    }
  };
  const handleUpload = async () => {
    if (!imageFile) {
      alert("ファイルを選択してください");
      return;
    }

    const formData = new FormData();
    formData.append("file", imageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResponse(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const name =
      playlistName || `${new Date().toISOString().slice(0, 10)} Setlist`;
    const formData = new FormData();
    formData.append("playlistName", name);
    formData.append("inputType", inputType);
    if (inputType === "image" && imageFile) {
      formData.append("file", imageFile);
    }

    try {
      const response = await axios.post("/api/upload", formData);
      const resData = response.data as { result: string };

      console.log("レスポンスデータ:", resData);
      console.log("resData.result:", resData.result);

      let parsedData;
      try {
        parsedData = JSON.parse(resData.result.replace(/```json\n|\n```/g, ""));
      } catch (error) {
        console.error("JSONパースエラー:", error);
        setResultMsg("レスポンスの解析に失敗しました。");
        return;
      }

      console.log("パース後のデータ:", parsedData);

      if (parsedData.tracks && parsedData.tracks.length > 0) {
        const formattedTracks = parsedData.tracks
          .map(
            (track: { trackName: String; artistNames: String[] }) =>
              `${track.trackName} - ${track.artistNames.join(", ")}`
          )
          .join("\n");

        console.log("setResultMsg に設定するデータ:", formattedTracks);
        setResultMsg(`プレイリスト読み取り成功:\n${formattedTracks}`);
      } else {
        console.log(
          "setResultMsg にエラーメッセージを設定:",
          parsedData.message
        );
        setResultMsg(parsedData.message);
      }
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
                onChange={handleFileChange}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
          <button onClick={handleUpload}>アップロード</button>
        </form>
        {response && <pre>{JSON.stringify(response, null, 2)}</pre>}
        {resultMsg && <p className="mt-6 text-center text-lg">{resultMsg}</p>}
      </div>
    </div>
  );
}
