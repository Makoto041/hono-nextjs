"use client";
import React from "react";
import SpotifyAuth from "../../components/spotifyAuth";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative mb-8" style={{ width: 350, height: 350 }}>
        <svg
          version="1.1"
          width="350"
          height="350"
          viewBox="0 0 350 350"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 背景 */}
          <rect width="350" height="350" fill="#000000" />

          {/* 円で全体を囲む */}
          <circle
            cx="175"
            cy="175"
            r="160"
            fill="none"
            stroke="#1DB954"
            strokeWidth="6"
          />

          {/* 波形をイメージしたライン群 */}
          <g
            transform="translate(175, 125)"
            stroke="#1DB954"
            strokeWidth="8"
            strokeLinecap="round"
          >
            {/* 左半分 */}
            <line x1="-70" y1="0" x2="-70" y2="-25" />
            <line x1="-52.5" y1="0" x2="-52.5" y2="-50" />
            <line x1="-35" y1="0" x2="-35" y2="-75" />
            <line x1="-17.5" y1="0" x2="-17.5" y2="-50" />
            <line x1="0" y1="0" x2="0" y2="-25" />
            {/* 右半分 */}
            <line x1="17.5" y1="0" x2="17.5" y2="-50" />
            <line x1="35" y1="0" x2="35" y2="-75" />
            <line x1="52.5" y1="0" x2="52.5" y2="-50" />
            <line x1="70" y1="0" x2="70" y2="-25" />
          </g>

          {/* サイト名 */}
          <text
            x="50%"
            y="180"
            fill="#1DB954"
            fontSize="32"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
          >
            Setlistify
          </text>
        </svg>

        {/* ログインボタンを円の下側に配置 */}
        <div
          className="absolute"
          style={{ top: "230px", left: "50%", transform: "translateX(-50%)" }}
        >
          <SpotifyAuth />
        </div>
      </div>
    </div>
  );
}
