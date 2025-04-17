// src/components/spotifyAuth.tsx
"use client";
import React from "react";

export default function SpotifyAuth() {
  const handleLogin = async () => {
    // ここでHonoのバックエンド側にリクエストしてOAuth認証開始
    window.location.href = "/api/auth";
  };

  return (
    <button
      onClick={handleLogin}
      className="inline-block bg-black border border-green-500 text-green-500 font-semibold py-2 px-4 rounded hover:bg-green-500 hover:text-black"
    >
      Spotifyでログイン
    </button>
  );
}
