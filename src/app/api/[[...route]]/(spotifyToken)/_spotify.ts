// src/app/api/[[...route]]/(spotifyToken)/_spotify.ts
//--------------------------------------------------
// Spotify API を叩く共有ユーティリティ
//--------------------------------------------------
import axios from "axios";

/* ===== 楽曲メタデータ型 ===== */
export type SpotifyTrackMeta = {
  uri: string | null;
  name: string | null;
  artist: string | null;
  albumImage: string | null;
  preview: string | null; // ★ 追加
};

/* --------------------------------------------------
 * プレイリスト作成
 * --------------------------------------------------*/
export async function createSpotifyPlaylist(
  userId: string,
  accessToken: string,
  playlistName: string,
  isPublic = false
): Promise<string> {
  const res = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    { name: playlistName, public: isPublic },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data.id as string;
}

/* --------------------------------------------------
 * 楽曲検索（常に “最大 3 件” の候補配列を返す）
 * --------------------------------------------------*/
export async function searchSpotifyTrack(
  query: string,
  accessToken: string,
  limit = 3,
  market = "JP" // ★ デフォルト JP
): Promise<SpotifyTrackMeta[]> {
  const url =
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}` +
    `&type=track&limit=${limit}&market=${market}`; // ★ 追加
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.data.tracks.items.map((it: any) => ({
    uri: it.uri ?? null,
    name: it.name ?? null,
    artist: it.artists?.[0]?.name ?? null,
    albumImage: it.album?.images?.[0]?.url ?? null,
    preview: it.preview_url ?? null, // ★ ここ！
  }));
}

/* --------------------------------------------------
 * プレイリストへ楽曲追加
 * --------------------------------------------------*/
export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: (string | null)[],
  accessToken: string
) {
  const uris = trackUris.filter(Boolean);
  if (!uris.length) return;

  await axios.post(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    { uris },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
