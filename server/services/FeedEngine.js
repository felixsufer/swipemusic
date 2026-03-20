const DeezerProvider = require("../providers/DeezerProvider");
const LastFmProvider = require("../providers/LastFmProvider");
const { normalizeTrack } = require("../models/Track");

const deezer = new DeezerProvider();
const lastfm = new LastFmProvider();

class FeedEngine {
  // Build candidate pool based on mode
  async buildCandidatePool(mode, options = {}) {
    const { genre, likedTrackIds = [], likedArtists = [], limit = 80 } = options;
    let candidates = [];

    if (mode === "trending") {
      candidates = await deezer.getTrendingTracks(limit);
    } else if (mode === "genre" && genre) {
      const [deezerTracks, lastfmTracks] = await Promise.allSettled([
        deezer.getTracksByGenre(genre, 0),
        lastfm.getTopTracksByTag(genre, 30)
      ]);
      const deezerResults = deezerTracks.status === "fulfilled" ? deezerTracks.value : [];
      const lastfmResults = lastfmTracks.status === "fulfilled" ? lastfmTracks.value : [];

      // Enrich Last.fm tracks without previews via Deezer cross-search
      const enriched = await Promise.allSettled(
        lastfmResults.filter(t => !t.preview).slice(0, 15).map(t =>
          deezer.search(`${t.artist} ${t.title}`).then(r => r[0] || null)
        )
      );
      const enrichedTracks = enriched
        .filter(r => r.status === "fulfilled" && r.value)
        .map(r => r.value);

      candidates = [...deezerResults, ...enrichedTracks];
      if (candidates.length === 0) {
        candidates = await deezer.search(genre);
      }
    } else if (mode === "recommendations") {
      if (likedTrackIds.length > 0) {
        // Use last 5 liked tracks as seeds (more signal = better recs)
        const seedTracks = likedTrackIds.slice(-5);
        const similarArrays = await Promise.allSettled(
          seedTracks.map(id => {
            const deezerId = id.includes(':') ? id.split(':')[1] : id;
            return deezer.getRelatedTracks(deezerId);
          })
        );
        candidates = similarArrays
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value);
      }

      // Also pull tracks from liked artists for better coverage
      if (likedArtists.length > 0) {
        const artistSeeds = likedArtists.slice(0, 5);
        const artistTracks = await Promise.allSettled(
          artistSeeds.map(artist => deezer.search(artist).then(r => r.slice(0, 10)))
        );
        const fromArtists = artistTracks
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value);
        candidates = [...candidates, ...fromArtists];
      }

      // Fallback to trending if not enough data
      if (candidates.length < 10) {
        const trending = await deezer.getTrendingTracks(30);
        candidates = [...candidates, ...trending];
      }
    } else {
      candidates = await deezer.getTrendingTracks(limit);
    }

    return candidates;
  }

  // Hard filter: remove seen, liked, skipped, blacklisted
  hardFilter(candidates, { seenIds = [], likedIds = [], skippedIds = [], blacklistedIds = [] }) {
    const blocked = new Set([...seenIds, ...likedIds, ...skippedIds, ...blacklistedIds]);
    return candidates.filter(t => t && !blocked.has(t.id) && !blocked.has(t.sourceId));
  }

  // Artist diversity: max 2 tracks per artist, max 1 per album
  applyArtistDiversity(candidates) {
    const artistCount = {};
    const seenAlbums = new Set();
    const result = [];
    const overflow = [];

    for (const track of candidates) {
      const artist = (track.artist || "unknown").toLowerCase();
      const albumKey = `${artist}::${(track.album || "").toLowerCase()}`;
      const count = artistCount[artist] || 0;

      if (count < 2 && !seenAlbums.has(albumKey)) {
        artistCount[artist] = count + 1;
        if (track.album) seenAlbums.add(albumKey);
        result.push(track);
      } else {
        overflow.push(track);
      }
    }
    return [...result, ...overflow];
  }

  // Dedup by track ID
  dedup(candidates) {
    const seen = new Set();
    return candidates.filter(t => {
      if (!t) return false;
      const key = t.id || t.sourceId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Score tracks with weighted randomization so feed varies each call
  score(candidates, { likedGenres = {}, likedArtists = [], sessionLikedGenres = {}, sessionLikedArtists = [], mode = "trending" }) {
    const likedArtistSet = new Set(likedArtists.map(a => a.toLowerCase()));
    const sessionArtistSet = new Set(sessionLikedArtists.map(a => a.toLowerCase()));

    return candidates.map(track => {
      let score = 0;

      // Popularity signal
      score += Math.min((track.popularity || 0) / 1000000, 100) * 0.3;

      // Preview available — high priority
      if (track.preview) score += 25;

      // Long-term genre affinity (all-time liked genres)
      if (track.genre && likedGenres[track.genre]) {
        score += Math.min(likedGenres[track.genre] * 6, 30);
      }

      // SESSION MOMENTUM: in-session liked genres count 3x more
      // If user liked 3 techno tracks this session, bias heavily toward techno
      if (track.genre && sessionLikedGenres[track.genre]) {
        score += Math.min(sessionLikedGenres[track.genre] * 18, 54);
      }

      // Long-term artist affinity
      if (likedArtistSet.has((track.artist || "").toLowerCase())) {
        score += 15;
      }

      // SESSION MOMENTUM: artists liked this session count 2x more
      if (sessionArtistSet.has((track.artist || "").toLowerCase())) {
        score += 25;
      }

      // Mode-specific boosts
      if (mode === "trending") score += (track.popularity || 0) / 1000000 * 15;
      if (mode === "recommendations") {
        score += sessionArtistSet.has((track.artist || "").toLowerCase()) ? 20 : 0;
      }

      // Weighted randomization: ±15 noise so top tracks rotate naturally
      score += (Math.random() - 0.5) * 30;

      return { ...track, _score: score };
    }).sort((a, b) => b._score - a._score);
  }

  // Add reason label to each track (for "why this track" display)
  addReasons(tracks, { mode, genre, likedGenres = {}, likedArtists = [] }) {
    const likedArtistSet = new Set(likedArtists.map(a => a.toLowerCase()));
    return tracks.map(track => {
      let reason = null;
      if (mode === 'recommendations') {
        if (likedArtistSet.has((track.artist || '').toLowerCase())) {
          reason = `Based on ${track.artist}`;
        } else if (track.genre && likedGenres[track.genre]) {
          reason = `From your ${track.genre} taste`;
        } else {
          reason = 'Recommended for you';
        }
      } else if (mode === 'genre') {
        reason = genre ? `${genre.charAt(0).toUpperCase() + genre.slice(1)} pick` : 'Genre pick';
      } else if (mode === 'trending') {
        reason = 'Trending now';
      }
      return reason ? { ...track, reason } : track;
    });
  }

  // Main feed generation
  async generateFeed(mode, options = {}) {
    const {
      limit = 20,
      seenIds = [],
      likedTrackIds = [],
      likedArtists = [],
      sessionLikedGenres = {},
      sessionLikedArtists = [],
      skippedIds = [],
      blacklistedIds = [],
      likedGenres = {},
      genre,
      bpmMin = null,
      bpmMax = null
    } = options;

    try {
      // 1. Build candidate pool
      let candidates = await this.buildCandidatePool(mode, options);

      // 2. Dedup
      candidates = this.dedup(candidates);

      // 3. Hard filter (remove seen/liked/skipped/blacklisted)
      candidates = this.hardFilter(candidates, {
        seenIds,
        likedIds: likedTrackIds,
        skippedIds,
        blacklistedIds
      });

      // 4. Enrich with BPM data (cached, parallel)
      candidates = await deezer.enrichWithBpm(candidates);

      // 4b. BPM range filter (only if requested)
      if (bpmMin !== null || bpmMax !== null) {
        const withBpm = candidates.filter(t => {
          if (!t.bpm) return true; // keep unknown BPM tracks (don't over-filter)
          if (bpmMin !== null && t.bpm < bpmMin) return false;
          if (bpmMax !== null && t.bpm > bpmMax) return false;
          return true;
        });
        // If BPM filter leaves too few, fall back to full pool
        candidates = withBpm.length >= 5 ? withBpm : candidates;
      }

      // 5. Artist diversity (max 2 per artist, max 1 per album)
      candidates = this.applyArtistDiversity(candidates);

      // 6. Score + rank with session momentum
      candidates = this.score(candidates, { likedGenres, likedArtists, sessionLikedGenres, sessionLikedArtists, mode });

      // 7. Add reason labels
      candidates = this.addReasons(candidates, { mode, genre, likedGenres, likedArtists });

      // 8. Return top N
      return candidates.slice(0, limit);
    } catch (err) {
      console.error("FeedEngine error:", err.message);
      try {
        return await deezer.search('top hits');
      } catch (e) {
        return [];
      }
    }
  }
}

module.exports = new FeedEngine();
