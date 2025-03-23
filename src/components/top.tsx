"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { generateCodeVerifier, generateCodeChallenge } from "../utils/pkce";
import { loadGetInitialProps } from "next/dist/shared/lib/utils";

export default function Home() {
  const [playlistName, setPlaylistName] = useState<string>("");
  const [inputType, setInputType] = useState<"text" | "image">("text");
  const [setlistText, setSetlistText] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string>("");
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  const authorizationEndpoint = "https://accounts.spotify.com/authorize";
  const tokenEndpoint = "https://accounts.spotify.com/api/token";
  const scope = "user-read-private user-read-email";

  const currentToken = {
    get access_token() {
      return localStorage.getItem("access_token") || null;
    },
    get refresh_token() {
      return localStorage.getItem("refresh_token") || null;
    },
    get expires_in() {
      return localStorage.getItem("expires_in") || null;
    },
    get expires() {
      return localStorage.getItem("expires") || null;
    },

    save: function (response: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }) {
      const { access_token, refresh_token, expires_in } = response;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_in", expires_in.toString());

      const now = new Date();
      const expiry = new Date(now.getTime() + expires_in * 1000);
      localStorage.setItem("expires", expiry.toISOString());
    },
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const storedToken = localStorage.getItem("spotifyAccessToken");
    if (storedToken) {
      setSpotifyToken(storedToken);
    }

    if (code) {
      let codeVerifier = sessionStorage.getItem("code_verifier");
      if (!codeVerifier) {
        codeVerifier = localStorage.getItem("code_verifier");
      }
      console.log("Retrieved code_verifier:", codeVerifier);
      if (!codeVerifier) {
        alert(
          "認証コードまたはコードベリファイアが見つかりません。再度Spotifyでログインしてください。"
        );
        return;
      }
      axios
        .post("/api/callback", { code, codeVerifier })
        .then((res) => {
          localStorage.setItem("spotifyAccessToken", res.data.access_token);
          setSpotifyToken(res.data.access_token);
          sessionStorage.removeItem("code_verifier");
          localStorage.removeItem("code_verifier");
          window.history.replaceState({}, document.title, "/");
        })
        .catch((error) => {
          console.error("Spotify認証エラー:", error);
          alert("Spotify認証に失敗しました。再度ログインしてください。");
        });
    }
  }, []);

  useEffect(() => {
    const handleAuth = async () => {
      const args = new URLSearchParams(window.location.search);
      const code = args.get("code");

      if (code) {
        const token = await getToken(code);
        currentToken.save(token);

        // Remove code from URL so we can refresh correctly.
        const url = new URL(window.location.href);
        url.searchParams.delete("code");

        const updatedUrl = url.search ? url.href : url.href.replace("?", "");
        window.history.replaceState({}, document.title, updatedUrl);
      }

      // If we have a token, we're logged in, so fetch user data and render logged in template
      if (currentToken.access_token) {
        const userData = await getUserData();
        renderTemplate("main", "logged-in-template", userData);
        renderTemplate("oauth", "oauth-template", currentToken);
      } else {
        // Otherwise we're not logged in, so render the login template
        renderTemplate("main", "login");
      }
    };

    handleAuth();
  }, []);
    // Removed duplicate function
  
    // HTML Template Rendering with basic data binding - demoware only.
    function renderTemplate(targetId: string, templateId: string, data: any = null) {
      const template = document.getElementById(templateId) as HTMLTemplateElement | null;
      if (!template) return;
  
      const clone = template.content.cloneNode(true) as DocumentFragment;
      const elements = clone.querySelectorAll("*");
  
      elements.forEach((ele) => {
        const element = ele as HTMLElement;
        const bindingAttrs = [...element.attributes].filter((a) =>
          a.name.startsWith("data-bind")
        );
  
        bindingAttrs.forEach((attr) => {
          const target = attr.name
            .replace(/data-bind-/, "")
            .replace(/data-bind/, "");
          const targetProp = target === "" ? "innerHTML" : target;
  
          try {
            if (targetProp.startsWith("onclick")) {
              element.addEventListener("click", () => eval(attr.value));
            } else {
              element[targetProp as keyof HTMLElement] = eval(
                `data.${attr.value}`
              );
            }
            element.removeAttribute(attr.name);
          } catch (ex) {
            console.error(`Error binding ${attr.value} to ${targetProp}`, ex);
          }
        });
      });
  
      const target = document.getElementById(targetId);
      if (target) {
        target.innerHTML = "";
        target.appendChild(clone);
      }
    }
  }

  // Soptify API Calls
  async function getToken(code) {
    const code_verifier = localStorage.getItem("code_verifier");

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUrl,
        code_verifier: code_verifier,
      }),
    });

    return await response.json();
  }

  async function refreshToken() {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: currentToken.refresh_token,
      }),
    });

  async function getToken(code: string) {
  }

  async function getUserData() {
    const response = await fetch("https://api.spotify.com/v1/me", {
      method: "GET",
      headers: { Authorization: "Bearer " + currentToken.access_token },
    });

    return await response.json();
  }

  // Click handlers
  async function loginWithSpotifyClick() {
    await redirectToSpotifyAuthorize();
  }

  async function logoutClick() {
    localStorage.clear();
    window.location.href = redirectUrl;
  }

  async function refreshTokenClick() {
    const token = await refreshToken();
    currentToken.save(token);
    renderTemplate("oauth", "oauth-template", currentToken);
  }

  // HTML Template Rendering with basic data binding - demoware only.
  function renderTemplate(targetId, templateId, data = null) {
    const template = document.getElementById(templateId);
    const clone = template.content.cloneNode(true);

    const elements = clone.querySelectorAll("*");
    elements.forEach((ele) => {
      const bindingAttrs = [...ele.attributes].filter((a) =>
        a.name.startsWith("data-bind")
      );

      bindingAttrs.forEach((attr) => {
        const target = attr.name
          .replace(/data-bind-/, "")
          .replace(/data-bind/, "");
        const targetType = target.startsWith("onclick")
          ? "HANDLER"
          : "PROPERTY";
        const targetProp = target === "" ? "innerHTML" : target;

        const prefix = targetType === "PROPERTY" ? "data." : "";
        const expression = prefix + attr.value.replace(/;\n\r\n/g, "");

        // Maybe use a framework with more validation here ;)
        try {
          ele[targetProp] =
            targetType === "PROPERTY"
              ? eval(expression)
              : () => {
                  eval(expression);
                };
          ele.removeAttribute(attr.name);
        } catch (ex) {
          console.error(`Error binding ${expression} to ${targetProp}`, ex);
  function renderTemplate(targetId: string, templateId: string, data: any = null) {
    const template = document.getElementById(templateId) as HTMLTemplateElement | null;
    if (!template) return;

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const elements = clone.querySelectorAll("*");

    elements.forEach((ele) => {
      const element = ele as HTMLElement;
      const bindingAttrs = [...element.attributes].filter((a) =>
        a.name.startsWith("data-bind")
      );

      bindingAttrs.forEach((attr) => {
        const target = attr.name
          .replace(/data-bind-/, "")
          .replace(/data-bind/, "");
        const targetProp = target === "" ? "innerHTML" : target;

        try {
          if (targetProp.startsWith("onclick")) {
            element.addEventListener("click", () => eval(attr.value));
          } else {
            element[targetProp as keyof HTMLElement] = eval(
              `data.${attr.value}`
            );
          }
          element.removeAttribute(attr.name);
        } catch (ex) {
          console.error(`Error binding ${attr.value} to ${targetProp}`, ex);
        }
      });
    });

    const target = document.getElementById(targetId);
    if (target) {
      target.innerHTML = "";
      target.appendChild(clone);
    }
  }
      });
    });
  const currentToken = {
    get access_token() {
      return localStorage.getItem("access_token") || null;
    },
    get refresh_token() {
      return localStorage.getItem("refresh_token") || null;
    },
    get expires_in() {
      return localStorage.getItem("expires_in") || null;
    },
    get expires() {
      return localStorage.getItem("expires") || null;
    },

    save: function (response: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }) {
      const { access_token, refresh_token, expires_in } = response;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_in", expires_in.toString());

      const now = new Date();
      const expiry = new Date(now.getTime() + expires_in * 1000);
      localStorage.setItem("expires", expiry.toISOString());
    },
  };
    const target = document.getElementById(targetId);
    target.innerHTML = "";
    target.appendChild(clone);
  }

  const currentToken = {
    get access_token() {
      return localStorage.getItem("access_token") || null;
    },
    get refresh_token() {
      return localStorage.getItem("refresh_token") || null;
    },
    get expires_in() {
      return localStorage.getItem("refresh_in") || null;
    },
    get expires() {
      return localStorage.getItem("expires") || null;
    },

    save: function (response: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }) {
      const { access_token, refresh_token, expires_in } = response;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_in", expires_in.toString());

      const now = new Date();
      const expiry = new Date(now.getTime() + expires_in * 1000);
      localStorage.setItem("expires", expiry.toISOString());
    },
  };
  async function redirectToSpotifyAuthorize() {
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomValues = crypto.getRandomValues(new Uint8Array(64));
    const randomString = randomValues.reduce(
      (acc, x) => acc + possible[x % possible.length],
      ""
    );

    const code_verifier = randomString;
    const data = new TextEncoder().encode(code_verifier);
    const hashed = await crypto.subtle.digest("SHA-256", data);

    const code_challenge_base64 = btoa(
      String.fromCharCode(...new Uint8Array(hashed))
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    window.localStorage.setItem("code_verifier", code_verifier);

    const authUrl = new URL(authorizationEndpoint);
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error("Missing Spotify client ID or redirect URI");
    }

    const params = {
      response_type: "code",
      client_id: clientId,
      scope: scope,
      code_challenge_method: "S256",
      code_challenge: code_challenge_base64,
      redirect_uri: redirectUri,
    };

    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString(); // Redirect the user to the authorization server for login
  }

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
      setResultMsg("アップロードに成功しました。");
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold mb-6 text-green-500">
          Spotify Setlist Generator
        </h1>
        <div className="mb-6">
          <button
            onClick={loadWithSpotify}
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Spotifyでログイン
          </button>
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
        {resultMsg && <p className="mt-6 text-center text-lg">{resultMsg}</p>}
      </div>
    </div>
  );
}
