const express = require('express');
const router = express.Router();
const DeezerProvider = require('../providers/DeezerProvider');

const musicProvider = new DeezerProvider();

/**
 * GET /api/tracks
 * Fetch tracks by mode and parameters
 *
 * Query params:
 * - mode: 'trending' | 'genre' | 'recommendations'
 * - genre: genre name (when mode=genre)
 * - likedTrackIds: comma-separated track IDs (when mode=recommendations)
 * - offset: pagination offset
 */
router.get('/tracks', async (req, res) => {
  try {
    const { mode = 'trending', genre, likedTrackIds, offset = 0 } = req.query;

    let tracks = [];

    switch (mode) {
      case 'trending':
        tracks = await musicProvider.getTrendingTracks(50);
        break;

      case 'genre':
        if (!genre) {
          return res.status(400).json({ error: 'Genre parameter required for genre mode' });
        }
        tracks = await musicProvider.getTracksByGenre(genre, parseInt(offset));
        break;

      case 'recommendations':
        const trackIds = likedTrackIds ? likedTrackIds.split(',') : [];
        tracks = await musicProvider.getRecommendations(trackIds);
        break;

      default:
        return res.status(400).json({ error: 'Invalid mode. Use: trending, genre, or recommendations' });
    }

    res.json({
      tracks,
      count: tracks.length,
      mode,
      offset: parseInt(offset)
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

module.exports = router;
