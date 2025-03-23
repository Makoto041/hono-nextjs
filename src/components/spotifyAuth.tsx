"use client";
import React from "react";

export default function SpotifyAuth() {
    const handleLogin = async () => {
        window.location.href = "/api/auth";
    };
  return (
    <button
      onClick={handleLogin}
      className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
    >
      Spotifyでログイン
    </button>
  );
}
