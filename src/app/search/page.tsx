"use client";
import React, { useEffect, useState } from "react";
import PlaylistForm from "../../components/playlistForm";

export default function SearchPage() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotifyAccessToken");
    // トークンがなければログインページへ
    if (!storedToken) {
      window.location.href = "/login";
    } else {
      setSpotifyToken(storedToken);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-black p-6 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-6">Spotify Setlist Generator</h1>
        {/* 検索フォーム */}
        <PlaylistForm spotifyToken={spotifyToken} />

        {/* 検索結果セクション */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">検索結果</h2>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox text-green-500 border-green-500"
              />
              <span className="ml-2">Playlist 1</span>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox text-green-500 border-green-500"
              />
              <span className="ml-2">Playlist 2</span>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button className="px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black">
              全選択
            </button>
            <button className="px-4 py-2 border border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-black">
              選択解除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
