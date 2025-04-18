// src/app/login/page.tsx
"use client";
import React from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* 背景円 */}
      <div className="absolute w-[40rem] h-[40rem] rounded-full bg-green-700/20 blur-3xl animate-blob" />

      {/* アイコン＋タイトル */}
      <div className="flex flex-col items-center gap-4 animate-drop">
        {/* 音符アイコン */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500 drop-shadow-xl"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>

        <h1 className="text-4xl font-bold text-green-500 tracking-wider">
          Setlistify
        </h1>
      </div>

      {/* ログインボタン */}
      <a
        href="/api/auth"
        className="group mt-12 px-6 py-3 border border-green-500 text-green-500 rounded font-semibold opacity-0
                   animate-fadeIn delay-[1.4s] transition
                   hover:bg-green-500 hover:text-black
                   relative overflow-hidden"
      >
        <span className="relative z-10">Spotifyでログイン</span>
        {/* ホバーで右→左に走る光 */}
        <span className="absolute inset-0 bg-white/40 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
      </a>

      {/* keyframes */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: scale(0.6);
          }
          100% {
            transform: scale(1.4);
          }
        }
        @keyframes drop {
          0% {
            opacity: 0;
            transform: translateY(-60px) scale(0.3);
          }
          60% {
            opacity: 1;
            transform: translateY(8px) scale(1.05);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        .animate-blob {
          animation: blob 8s ease-in-out infinite alternate;
        }
        .animate-drop {
          animation: drop 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s forwards;
        }
      `}</style>
    </div>
  );
}
