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
  const [response, setResponse] = useState<{ data: { result?: string } } | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const storedToken = localStorage.getItem("spotifyAccessToken");
    if (storedToken) {
      setSpotifyToken(storedToken);
    }

    if (code) {
      console.log("Spotify認証コードを取得:", code);

      axios
        .post("/api/callback", { code })
        .then((res) => {
          console.log("Spotifyアクセストークン取得成功:", res.data);
          localStorage.setItem("spotifyAccessToken", res.data.access_token);
          setSpotifyToken(res.data.access_token);

          // URL から `code` を削除してリロード防止
          window.history.replaceState({}, document.title, "/");
        })
        .catch((error) => {
          console.error("Spotify認証エラー:", error);
          alert("Spotify認証に失敗しました。再度ログインしてください。");
        });
    }
  }, []);

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

    if (!spotifyToken) {
      alert("Spotifyの再ログインが必要です");
      window.location.href = "/api/auth";
      return;
    }

    const formData = new FormData();
    formData.append("file", imageFile);

    try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
      },
    });

      if (!res.ok) {
        throw new Error(`アップロードに失敗しました: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("アップロードエラー:", error);
      setResultMsg("アップロードに失敗しました。");
    }
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

    if (!spotifyToken) {
      alert("Spotifyの再ログインが必要です");
      window.location.href = "/api/auth";
      return;
    }

    try {
      await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${spotifyToken}`,
        },
      });

      if (!response) {
        console.error("Response is null");
        setResultMsg("レスポンスが取得できませんでした。");
        return;
      }

      const resData: { result?: string } = response.data;

      if (!resData || typeof resData.result !== "string") {
        throw new Error("無効なレスポンスデータ");
      }

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
        const trackURIs = parsedData.tracks.map(
          (track: { trackURI: string }) => track.trackURI
        );

        const spotifyResponse = await axios.post("/api/create-playlist", {
          playlistName: name,
          trackURIs,
        });

        if (spotifyResponse.data.success) {
          setResultMsg(
            `プレイリスト作成成功! 🎵\nSpotifyで確認: ${spotifyResponse.data.playlistUrl}`
          );
        } else {
          setResultMsg("プレイリスト作成に失敗しました。");
        }
      } else {
        console.log(
          "setResultMsg にエラーメッセージを設定:",
          parsedData.message
        );
        setResultMsg(parsedData.message || "トラックが見つかりませんでした。");
      }
    } catch (error: any) {
      console.error("送信エラー:", error);
      if (error.response?.status === 401) {
        alert("Spotifyの認証が切れました。再ログインしてください。");
        localStorage.removeItem("spotifyAccessToken");
        window.location.href = "/api/auth";
        return;
      }
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
