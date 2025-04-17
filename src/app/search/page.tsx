// src/app/search/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PlaylistForm from "@/components/playlistForm";

/** 3 つの状態を持つ */
type AuthState = "loading" | "ok" | "ng";

export default function SearchPage() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/getToken", { credentials: "include" })
      .then((res) => setAuth(res.ok ? "ok" : "ng"))
      .catch(() => setAuth("ng"));
  }, []);

  /* --- 判定 --- */
  if (auth === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-500">
        認証確認中…
      </div>
    );
  }

  if (auth === "ng") {
    router.replace("/login"); // ← ここでリダイレクト
    return null;
  }

  /* auth === "ok" のときだけ描画 */
  return (
    <div className="min-h-screen bg-black text-green-500 flex items-center justify-center p-4 overflow-y-auto">
      <PlaylistForm />
    </div>
  );
}
