// src/app/api/[[...route]]/(spotifyToken)/_spotify.ts
//--------------------------------------------------
// Spotify API ヘルパー関数だけを切り出したユーティリティ
//--------------------------------------------------
import axios from "axios";

/* ===== 検索時に返すメタデータ型 ===== */
export type SpotifyTrackMeta = {
  uri: string | null;
  name: string | null;
  artist: string | null;
  albumImage: string | null;
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
 * 楽曲検索（2 通りの戻り値）
 *   searchSpotifyTrack(q, token)          -> URI だけ
 *   searchSpotifyTrack(q, token, true)    -> メタデータ付き
 * --------------------------------------------------*/
export async function searchSpotifyTrack(
  query: string,
  accessToken: string
): Promise<string | null>;
export async function searchSpotifyTrack(
  query: string,
  accessToken: string,
  withMeta: true
): Promise<SpotifyTrackMeta | null>;
export async function searchSpotifyTrack(
  query: string,
  accessToken: string,
  withMeta = false
): Promise<string | SpotifyTrackMeta | null> {
  const res = await axios.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.data.tracks.items.length === 0) return null;

  const item = res.data.tracks.items[0];

  /* メタデータが欲しいか URI だけかで分岐 */
  if (withMeta) {
    return {
      uri: item.uri ?? null,
      name: item.name ?? null,
      artist: item.artists?.[0]?.name ?? null,
      albumImage: item.album?.images?.[0]?.url ?? null,
    };
  }
  return item.uri ?? null;
}

/* --------------------------------------------------
 * プレイリストへ楽曲追加
 * --------------------------------------------------*/
export async function addTracksToPlaylist(
  playlistId: string,
  trackUris: (string | null)[],
  accessToken: string
) {
  const uris = trackUris.filter(Boolean); // null を除外
  if (!uris.length) return;

  await axios.post(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    { uris },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
