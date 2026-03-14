/**
 * Abstract MusicProvider interface
 * All music provider implementations must extend this class
 */
class MusicProvider {
  /**
   * Search for tracks by query and genre
   * @param {string} query - Search query
   * @param {string} genre - Genre to filter by
   * @returns {Promise<Array>} Array of track objects
   */
  async search(query, genre) {
    throw new Error('Method "search" must be implemented');
  }

  /**
   * Get tracks by genre with pagination
   * @param {string} genre - Genre name or ID
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} Array of track objects
   */
  async getTracksByGenre(genre, offset = 0) {
    throw new Error('Method "getTracksByGenre" must be implemented');
  }

  /**
   * Get recommended tracks based on liked track IDs
   * @param {Array<string>} likedTrackIds - Array of liked track IDs
   * @returns {Promise<Array>} Array of recommended track objects
   */
  async getRecommendations(likedTrackIds) {
    throw new Error('Method "getRecommendations" must be implemented');
  }

  /**
   * Get track by ID
   * @param {string} trackId - Track ID
   * @returns {Promise<Object>} Track object
   */
  async getTrackById(trackId) {
    throw new Error('Method "getTrackById" must be implemented');
  }

  /**
   * Get trending/chart tracks
   * @param {number} limit - Number of tracks to return
   * @returns {Promise<Array>} Array of track objects
   */
  async getTrendingTracks(limit = 50) {
    throw new Error('Method "getTrendingTracks" must be implemented');
  }
}

module.exports = MusicProvider;
