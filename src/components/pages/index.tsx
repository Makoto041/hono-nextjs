"use client";
import React, { useEffect, useState } from "react";
import SpotifyAuth from "../spotifyAuth";
import PlaylistForm from "../playlistForm";

export default function HomePage() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotifyAccessToken");
    if (storedToken) {
      setSpotifyToken(storedToken);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-6 text-green-500">
          Spotify Setlist Generator
        </h1>
        <div className="mb-6">
          <SpotifyAuth setSpotifyToken={setSpotifyToken} />
        </div>
        <PlaylistForm spotifyToken={spotifyToken} />
      </div>
    </div>
  );
}
