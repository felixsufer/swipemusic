const fetch = require('node-fetch');
const { normalizeTrack } = require('../models/Track');

/**
 * Last.fm API Provider
 * Provides music discovery and similarity data
 */
class LastFmProvider {
  constructor() {
    this.baseUrl = 'https://ws.audioscrobbler.com/2.0/';
    this.apiKey = process.env.LASTFM_API_KEY || '';

    if (!this.apiKey) {
      console.warn('LASTFM_API_KEY not set - Last.fm features will return empty results');
    }
  }

  /**
   * Get similar tracks for a given track
   */
  async getSimilarTracks(artist, title, limit = 20) {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}?method=track.getSimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${this.apiKey}&format=json&limit=${limit}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.similartracks && data.similartracks.track) {
        const tracks = Array.isArray(data.similartracks.track)
          ? data.similartracks.track
          : [data.similartracks.track];

        return tracks.map(track => this.formatTrack(track));
      }

      return [];
    } catch (error) {
      console.error('Last.fm getSimilarTracks error:', error);
      return [];
    }
  }

  /**
   * Get similar artists for a given artist
   */
  async getSimilarArtists(artist, limit = 10) {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&api_key=${this.apiKey}&format=json&limit=${limit}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.similarartists && data.similarartists.artist) {
        const artists = Array.isArray(data.similarartists.artist)
          ? data.similarartists.artist
          : [data.similarartists.artist];

        return artists.map(artist => ({
          name: artist.name,
          mbid: artist.mbid,
          url: artist.url
        }));
      }

      return [];
    } catch (error) {
      console.error('Last.fm getSimilarArtists error:', error);
      return [];
    }
  }

  /**
   * Get top tracks for a given tag/genre
   */
  async getTopTracksByTag(tag, limit = 20) {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}?method=tag.getTopTracks&tag=${encodeURIComponent(tag)}&api_key=${this.apiKey}&format=json&limit=${limit}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.tracks && data.tracks.track) {
        const tracks = Array.isArray(data.tracks.track)
          ? data.tracks.track
          : [data.tracks.track];

        return tracks.map(track => this.formatTrack(track));
      }

      return [];
    } catch (error) {
      console.error('Last.fm getTopTracksByTag error:', error);
      return [];
    }
  }

  /**
   * Get top tags for a track
   */
  async getTopTags(artist, title) {
    if (!this.apiKey) return [];

    try {
      const url = `${this.baseUrl}?method=track.getTopTags&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${this.apiKey}&format=json`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.toptags && data.toptags.tag) {
        const tags = Array.isArray(data.toptags.tag)
          ? data.toptags.tag
          : [data.toptags.tag];

        return tags.map(tag => ({
          name: tag.name,
          count: tag.count
        }));
      }

      return [];
    } catch (error) {
      console.error('Last.fm getTopTags error:', error);
      return [];
    }
  }

  /**
   * Format Last.fm track for normalization
   * Note: Last.fm doesn't provide preview URLs
   */
  formatTrack(track) {
    const artistName = typeof track.artist === 'string'
      ? track.artist
      : track.artist?.name || 'Unknown Artist';

    const trackName = track.name || track.title || '';

    // Use mbid as sourceId, fallback to lastfm:name:artist format
    const sourceId = track.mbid || `${trackName}:${artistName}`.toLowerCase().replace(/\s+/g, '-');

    return normalizeTrack({
      id: sourceId,
      sourceId: sourceId,
      name: trackName,
      title: trackName,
      artist: artistName,
      artistId: track.artist?.mbid || '',
      album: '',
      artwork: track.image?.[3]?.['#text'] || track.image?.[2]?.['#text'] || '',
      artworkSmall: track.image?.[1]?.['#text'] || track.image?.[0]?.['#text'] || '',
      preview: null, // Last.fm doesn't provide preview URLs
      link: track.url || null,
      deepLink: track.url || null,
      popularity: parseInt(track.playcount || track.listeners || 0),
      duration: parseInt(track.duration || 0)
    }, 'lastfm');
  }
}

module.exports = LastFmProvider;
