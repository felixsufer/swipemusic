const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://swipemusic-production-f108.up.railway.app/api/spotify/callback';

const SCOPES = [
  'user-library-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email'
].join(' ');

/**
 * GET /api/spotify/auth
 * Redirect user to Spotify OAuth
 */
router.get('/auth', (req, res) => {
  if (!CLIENT_ID) return res.status(503).json({ error: 'Spotify not configured' });
  const state = Math.random().toString(36).slice(2);
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

/**
 * GET /api/spotify/callback
 * Handle Spotify OAuth callback, exchange code for token
 */
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect('/?spotify_error=' + error);

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const token = await tokenRes.json();
    if (token.error) throw new Error(token.error_description);

    // Redirect to frontend with token (short-lived, stored in localStorage)
    const params = new URLSearchParams({
      spotify_access_token: token.access_token,
      spotify_refresh_token: token.refresh_token,
      spotify_expires_in: token.expires_in
    });
    res.redirect('/?' + params.toString());
  } catch (err) {
    console.error('Spotify callback error:', err.message);
    res.redirect('/?spotify_error=token_exchange_failed');
  }
});

/**
 * GET /api/spotify/library
 * Fetch user's saved tracks from Spotify (pass access_token in header)
 */
router.get('/library', async (req, res) => {
  const token = req.headers['x-spotify-token'];
  if (!token) return res.status(401).json({ error: 'No Spotify token' });

  try {
    let tracks = [];
    let url = 'https://api.spotify.com/v1/me/tracks?limit=50';

    // Fetch up to 200 liked tracks (4 pages)
    for (let page = 0; page < 4; page++) {
      const spotRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      const data = await spotRes.json();
      if (data.error) break;

      const pageTracks = (data.items || []).map(({ track }) => ({
        id: `spotify:${track.id}`,
        title: track.name,
        artist: track.artists?.[0]?.name || 'Unknown',
        album: track.album?.name || null,
        artwork: track.album?.images?.[0]?.url || null,
        preview: track.preview_url || null,
        deepLink: `https://open.spotify.com/track/${track.id}`,
        source: 'spotify',
        spotifyUri: track.uri,
        popularity: track.popularity || 0,
        genre: null, // Spotify doesn't return genre at track level
        duration: track.duration_ms ? Math.floor(track.duration_ms / 1000) : null,
      }));

      tracks = [...tracks, ...pageTracks];
      if (!data.next) break;
      url = data.next;
    }

    res.json({ tracks, count: tracks.length });
  } catch (err) {
    console.error('Spotify library error:', err.message);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

/**
 * POST /api/spotify/export
 * Create a Spotify playlist from SwipeSound crate
 * Body: { access_token, tracks: [{title, artist}], playlist_name }
 */
router.post('/export', async (req, res) => {
  const { access_token, tracks, playlist_name = 'SwipeSound Crate' } = req.body;
  if (!access_token || !tracks?.length) {
    return res.status(400).json({ error: 'Missing token or tracks' });
  }

  try {
    // 1. Get user's Spotify ID
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const me = await meRes.json();
    if (me.error) throw new Error(me.error.message);

    // 2. Create playlist
    const playlistRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlist_name,
        description: 'Exported from SwipeSound 🎧',
        public: false
      })
    });
    const playlist = await playlistRes.json();
    if (playlist.error) throw new Error(playlist.error.message);

    // 3. Search each track on Spotify to get URI
    const uris = [];
    for (const track of tracks.slice(0, 100)) {
      try {
        const q = encodeURIComponent(`track:${track.title} artist:${track.artist}`);
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
          headers: { 'Authorization': `Bearer ${access_token}` }
        });
        const searchData = await searchRes.json();
        const found = searchData.tracks?.items?.[0];
        if (found) uris.push(found.uri);
      } catch (e) { /* skip unmatched tracks */ }
    }

    if (uris.length === 0) {
      return res.status(422).json({ error: 'No tracks found on Spotify', playlist_url: playlist.external_urls?.spotify });
    }

    // 4. Add tracks to playlist (in batches of 100)
    for (let i = 0; i < uris.length; i += 100) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: uris.slice(i, i + 100) })
      });
    }

    res.json({
      ok: true,
      playlist_url: playlist.external_urls?.spotify,
      playlist_id: playlist.id,
      tracks_added: uris.length,
      tracks_total: tracks.length
    });
  } catch (err) {
    console.error('Spotify export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
