const fetch = require('node-fetch');
const MusicProvider = require('./MusicProvider');
const { normalizeTrack } = require('../models/Track');

/**
 * SoundCloud public API provider
 * Uses SoundCloud's public search without OAuth (public tracks only)
 */
class SoundCloudProvider extends MusicProvider {
  constructor() {
    super();
    this.baseUrl = 'https://api.soundcloud.com';
    this.clientId = process.env.SOUNDCLOUD_CLIENT_ID || null;

    // Genre → search terms optimized for SoundCloud's tagging
    this.genreSearchTerms = {
      techno: 'techno underground dark',
      house: 'house music deep soulful',
      deephouse: 'deep house organic',
      melodictechno: 'melodic techno progressive',
      dnb: 'drum and bass liquid',
      dubstep: 'dubstep heavy',
      trance: 'trance progressive uplifting',
      ambient: 'ambient atmospheric drone',
      electronic: 'electronic experimental IDM',
      jungle: 'jungle breakbeat amen',
      psytrance: 'psytrance goa',
      afrohouse: 'afro house tribal',
      hiphop: 'hip hop underground boom bap',
      rnb: 'rnb soul neo',
    };
  }

  isAvailable() {
    return !!this.clientId;
  }

  async search(query, limit = 20) {
    if (!this.isAvailable()) return [];
    try {
      const url = `${this.baseUrl}/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${this.clientId}&filter=streamable`;
      const res = await fetch(url, { timeout: 8000 });
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.filter(t => t.streamable && t.stream_url).map(t => this.formatTrack(t));
    } catch (err) {
      console.error('SoundCloud search error:', err.message);
      return [];
    }
  }

  async getTracksByGenre(genre) {
    const term = this.genreSearchTerms[genre.toLowerCase()] || genre;
    return this.search(term, 30);
  }

  async getTrendingTracks(limit = 20) {
    if (!this.isAvailable()) return [];
    try {
      const url = `${this.baseUrl}/tracks?limit=${limit}&client_id=${this.clientId}&filter=streamable&order=hotness`;
      const res = await fetch(url, { timeout: 8000 });
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.filter(t => t.streamable).map(t => this.formatTrack(t));
    } catch (err) {
      console.error('SoundCloud trending error:', err.message);
      return [];
    }
  }

  formatTrack(raw) {
    const streamUrl = raw.stream_url
      ? `${raw.stream_url}?client_id=${this.clientId}`
      : null;

    return normalizeTrack({
      id: `sc:${raw.id}`,
      title: raw.title,
      artist: raw.user?.username || 'Unknown',
      album: null,
      preview: streamUrl,
      link: raw.permalink_url,
      artwork: raw.artwork_url?.replace('-large', '-t500x500') || null,
      genre: raw.genre || null,
      duration: raw.duration ? Math.floor(raw.duration / 1000) : null,
      rank: raw.playback_count || 0,
    }, 'soundcloud');
  }
}

module.exports = SoundCloudProvider;
