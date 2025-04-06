"use client";
import React from "react";
import SpotifyAuth from "../../components/spotifyAuth";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-green-500 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6">
        Welcome to Spotify Setlist Generator
      </h1>
      <p className="mb-6">ログインしてはじめましょう</p>
      <SpotifyAuth />
    </div>
  );
}
