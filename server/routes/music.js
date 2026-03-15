const express = require('express');
const router = express.Router();
const DeezerProvider = require('../providers/DeezerProvider');
const FeedEngine = require('../services/FeedEngine');

const musicProvider = new DeezerProvider();

/**
 * GET /api/tracks
 * Fetch tracks by mode and parameters
 *
 * Query params:
 * - mode: 'trending' | 'genre' | 'recommendations'
 * - genre: genre name (when mode=genre)
 * - likedTrackIds: comma-separated track IDs (when mode=recommendations)
 * - skippedIds: comma-separated skipped track IDs
 * - blacklistedIds: comma-separated blacklisted track IDs
 * - seenIds: comma-separated seen track IDs (this session)
 * - likedGenres: JSON string of liked genres with counts
 * - limit: number of tracks to return (default 20, max 50)
 */
router.get('/tracks', async (req, res) => {
  try {
    const {
      mode = 'trending',
      genre,
      likedTrackIds,
      skippedIds,
      blacklistedIds,
      seenIds,
      likedGenres,
      limit = 20
    } = req.query;

    // Parse comma-separated params
    const parsedLikedIds = likedTrackIds ? likedTrackIds.split(',').filter(Boolean) : [];
    const parsedSkippedIds = skippedIds ? skippedIds.split(',').filter(Boolean) : [];
    const parsedBlacklistedIds = blacklistedIds ? blacklistedIds.split(',').filter(Boolean) : [];
    const parsedSeenIds = seenIds ? seenIds.split(',').filter(Boolean) : [];

    // Parse likedGenres JSON
    let parsedLikedGenres = {};
    if (likedGenres) {
      try {
        parsedLikedGenres = JSON.parse(likedGenres);
      } catch (e) {
        console.error('Error parsing likedGenres:', e);
      }
    }

    // Validate limit
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

    // Generate feed using FeedEngine
    const tracks = await FeedEngine.generateFeed(mode, {
      genre,
      likedTrackIds: parsedLikedIds,
      skippedIds: parsedSkippedIds,
      blacklistedIds: parsedBlacklistedIds,
      seenIds: parsedSeenIds,
      likedGenres: parsedLikedGenres,
      limit: parsedLimit
    });

    res.json({
      tracks,
      count: tracks.length,
      mode
    });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

/**
 * GET /api/track/:id
 * Get single track by ID
 */
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const track = await musicProvider.getTrackById(id);

    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json({ track });
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

/**
 * GET /api/search
 * Search for tracks
 *
 * Query params:
 * - q: search query
 * - genre: optional genre filter
 */
router.get('/search', async (req, res) => {
  try {
    const { q, genre } = req.query;

    if (!q && !genre) {
      return res.status(400).json({ error: 'Query (q) or genre parameter required' });
    }

    const tracks = await musicProvider.search(q || '', genre);

    res.json({
      tracks,
      count: tracks.length,
      query: q,
      genre
    });
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

/**
 * POST /api/events
 * Log user events (likes, skips, blacklists, etc.)
 *
 * Body:
 * - event_type: string (like, skip, blacklist, etc.)
 * - track_id: string
 * - user_id: string (optional)
 * - session_id: string (optional)
 * - metadata: object (optional)
 */
router.post('/events', async (req, res) => {
  const { event_type, track_id, user_id, session_id, metadata } = req.body;

  // Log it at minimum
  console.log("EVENT:", {
    event_type,
    track_id,
    user_id,
    session_id,
    timestamp: new Date().toISOString(),
    metadata
  });

  // TODO: store to Supabase when schema is ready
  res.json({ ok: true });
});

module.exports = router;
