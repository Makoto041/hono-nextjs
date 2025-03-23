"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";

interface PlaylistFormProps {
  spotifyToken: string | null;
}

export default function PlaylistForm({ spotifyToken }: PlaylistFormProps) {
  const [playlistName, setPlaylistName] = useState<string>("");
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [setlistText, setSetlistText] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFile(e.target.files[0]);
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
      setResultMsg("アップロードに成功しました。");
    } catch (error) {
      console.error("アップロードエラー:", error);
      setResultMsg("アップロードに失敗しました。");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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
      const res = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${spotifyToken}`,
        },
      });
      const parsedData = res.data;
      if (!parsedData || typeof parsedData.result !== "string") {
        throw new Error("無効なレスポンスデータ");
      }
      let finalParsedData;
      try {
        finalParsedData = JSON.parse(
          parsedData.result.replace(/```json\n|\n```/g, "")
        );
      } catch (error) {
        console.error("JSONパースエラー:", error);
        setResultMsg("レスポンスの解析に失敗しました。");
        return;
      }
      if (finalParsedData.tracks && finalParsedData.tracks.length > 0) {
        const trackURIs = finalParsedData.tracks.map(
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
        setResultMsg(
          finalParsedData.message || "トラックが見つかりませんでした。"
        );
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
            placeholder={`例:\n1: STAY - Smile High, Antwaun Stanley\n2: In Touch - Daul, Charli Taft\n3: WE ARE - eill\n...`}
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 h-40"
          ></textarea>
        </div>
      ) : (
        <div>
          <label className="block font-medium mb-2">セットリスト（画像）</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}
      <div className="flex gap-4">
        <button type="button" onClick={handleUpload}>
          アップロード
        </button>
        <button type="submit">送信</button>
      </div>
      {resultMsg && <p className="mt-6 text-center text-lg">{resultMsg}</p>}
    </form>
  );
}
