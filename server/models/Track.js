// Internal track shape — source-agnostic
function normalizeTrack(raw, source) {
  return {
    id: `${source}:${raw.id || raw.sourceId}`,
    sourceId: String(raw.id || raw.sourceId),
    source: source, // "deezer" | "lastfm" | etc
    title: raw.title || raw.name || "",
    artist: raw.artist?.name || raw.artist || "",
    artistId: String(raw.artist?.id || raw.artistId || ""),
    album: raw.album?.title || raw.album || "",
    artwork: raw.album?.cover_xl || raw.album?.cover_big || raw.album?.cover_medium || raw.artwork || "",
    artworkSmall: raw.album?.cover_medium || raw.artworkSmall || "",
    preview: raw.preview || null, // 30s MP3 URL or null
    deepLink: raw.link || raw.deepLink || null, // open in Deezer/Spotify etc
    genre: raw.genre || raw.genre_name || null,
    subgenre: raw.subgenre || null,
    bpm: raw.bpm || null,
    key: raw.key || null,
    label: raw.label || null,
    releaseDate: raw.release_date || raw.releaseDate || null,
    popularity: raw.rank || raw.popularity || 0,
    duration: raw.duration || 0,
    previewAvailable: !!(raw.preview),
    source_raw: null // don't store raw to keep it clean
  };
}

module.exports = { normalizeTrack };
