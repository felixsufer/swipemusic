const DeezerProvider = require("../providers/DeezerProvider");
const LastFmProvider = require("../providers/LastFmProvider");
const { normalizeTrack } = require("../models/Track");

const deezer = new DeezerProvider();
const lastfm = new LastFmProvider();

class FeedEngine {
  // Build candidate pool based on mode
  async buildCandidatePool(mode, options = {}) {
    const { genre, likedTrackIds = [], likedArtists = [], limit = 50 } = options;
    let candidates = [];

    if (mode === "trending") {
      candidates = await deezer.getTrendingTracks(limit);
    } else if (mode === "genre" && genre) {
      // Use multiple search strategies and merge results
      // Last.fm gives accurate genre tags; Deezer gives previews
      const [deezerTracks, lastfmTracks] = await Promise.allSettled([
        deezer.getTracksByGenre(genre, 0),
        lastfm.getTopTracksByTag(genre, 30)
      ]);
      const deezerResults = deezerTracks.status === "fulfilled" ? deezerTracks.value : [];
      const lastfmResults = lastfmTracks.status === "fulfilled" ? lastfmTracks.value : [];

      // For Last.fm tracks without previews, try to find on Deezer
      const enriched = await Promise.allSettled(
        lastfmResults.filter(t => !t.preview).slice(0, 10).map(t =>
          deezer.search(`${t.artist} ${t.title}`).then(r => r[0] || null)
        )
      );
      const enrichedTracks = enriched
        .filter(r => r.status === "fulfilled" && r.value)
        .map(r => r.value);

      candidates = [...deezerResults, ...enrichedTracks];
      // If still empty, fallback to broader search
      if (candidates.length === 0) {
        candidates = await deezer.search(genre);
      }
    } else if (mode === "recommendations" && likedTrackIds.length > 0) {
      // Use last 3 liked tracks to seed similarity
      const seedTracks = likedTrackIds.slice(-3);
      const similarArrays = await Promise.allSettled(
        seedTracks.map(id => {
          // Extract the actual Deezer ID from our compound ID format (deezer:123 -> 123)
          const deezerId = id.includes(':') ? id.split(':')[1] : id;
          return deezer.getRelatedTracks(deezerId);
        })
      );
      candidates = similarArrays
        .filter(r => r.status === "fulfilled")
        .flatMap(r => r.value);
      // Fallback to trending if not enough
      if (candidates.length < 10) {
        const trending = await deezer.getTrendingTracks(30);
        candidates = [...candidates, ...trending];
      }
    } else {
      // Default: trending
      candidates = await deezer.getTrendingTracks(limit);
    }

    return candidates;
  }

  // Hard filter: remove seen, liked, skipped, blacklisted
  hardFilter(candidates, { seenIds = [], likedIds = [], skippedIds = [], blacklistedIds = [] }) {
    const blocked = new Set([...seenIds, ...likedIds, ...skippedIds, ...blacklistedIds]);
    return candidates.filter(t => !blocked.has(t.id) && !blocked.has(t.sourceId));
  }

  // Artist diversity: max 1 track per artist per window
  applyArtistDiversity(candidates) {
    const seenArtists = new Set();
    const result = [];
    const overflow = [];
    for (const track of candidates) {
      const artist = (track.artist || "").toLowerCase();
      if (!seenArtists.has(artist)) {
        seenArtists.add(artist);
        result.push(track);
      } else {
        overflow.push(track);
      }
    }
    // Add overflow at end so we don't lose tracks if pool is small
    return [...result, ...overflow];
  }

  // Dedup by sourceId
  dedup(candidates) {
    const seen = new Set();
    return candidates.filter(t => {
      const key = t.id || t.sourceId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Score tracks
  score(candidates, { likedGenres = {}, mode = "trending" }) {
    return candidates.map(track => {
      let score = 0;
      // Popularity signal (0-100)
      score += Math.min((track.popularity || 0) / 1000000, 100) * 0.4;
      // Preview available bonus
      if (track.previewAvailable) score += 20;
      // Genre affinity
      if (track.genre && likedGenres[track.genre]) {
        score += likedGenres[track.genre] * 10;
      }
      // Mode adjustments
      if (mode === "trending") score += (track.popularity || 0) / 1000000 * 20;
      if (mode === "genre") score += track.previewAvailable ? 15 : 0;
      return { ...track, _score: score };
    }).sort((a, b) => b._score - a._score);
  }

  // Main feed generation
  async generateFeed(mode, options = {}) {
    const { limit = 20, seenIds = [], likedTrackIds = [], skippedIds = [], blacklistedIds = [], likedGenres = {} } = options;

    try {
      // 1. Build candidate pool
      let candidates = await this.buildCandidatePool(mode, options);

      // 2. Dedup
      candidates = this.dedup(candidates);

      // 3. Hard filter
      candidates = this.hardFilter(candidates, {
        seenIds,
        likedIds: likedTrackIds,
        skippedIds,
        blacklistedIds
      });

      // 4. Artist diversity
      candidates = this.applyArtistDiversity(candidates);

      // 5. Score + rank
      candidates = this.score(candidates, { likedGenres, mode });

      // 6. Return top N
      return candidates.slice(0, limit);
    } catch (err) {
      console.error("FeedEngine error:", err.message);
      // Fallback: simple search
      try {
        return await deezer.search('top hits');
      } catch (e) {
        return [];
      }
    }
  }
}

module.exports = new FeedEngine();
