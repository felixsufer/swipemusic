const MusicProvider = require('./MusicProvider');

/**
 * Spotify provider stub - not yet configured
 */
class SpotifyProvider extends MusicProvider {
  constructor() {
    super();
  }

  async search(query, genre) {
    throw new Error('Spotify provider not yet configured. Please use Deezer provider.');
  }

  async getTracksByGenre(genre, offset = 0) {
    throw new Error('Spotify provider not yet configured. Please use Deezer provider.');
  }

  async getRecommendations(likedTrackIds) {
    throw new Error('Spotify provider not yet configured. Please use Deezer provider.');
  }

  async getTrackById(trackId) {
    throw new Error('Spotify provider not yet configured. Please use Deezer provider.');
  }

  async getTrendingTracks(limit = 50) {
    throw new Error('Spotify provider not yet configured. Please use Deezer provider.');
  }
}

module.exports = SpotifyProvider;
