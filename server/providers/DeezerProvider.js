const fetch = require('node-fetch');
const MusicProvider = require('./MusicProvider');
const { normalizeTrack } = require('../models/Track');

/**
 * Deezer API implementation of MusicProvider
 * Uses public Deezer API (no authentication required)
 */
class DeezerProvider extends MusicProvider {
  constructor() {
    super();
    this.baseUrl = 'https://api.deezer.com';

    // Deezer genre IDs
    this.genres = {
      electronic: 106,
      dance: 113,
      techno: 106,
      house: 113,
      pop: 132,
      rock: 152,
      hiphop: 116,
      rap: 116,
      metal: 464,
      rnb: 165,
      // Search-based genres (no Deezer genre ID)
      bass: null,
      dubstep: null,
      dnb: null
    };
    // Search terms for genres without Deezer IDs
    this.genreSearchTerms = {
      bass: 'bass music',
      dubstep: 'dubstep',
      dnb: 'drum and bass'
    };
  }

  /**
   * Format Deezer track for normalization
   */
  formatTrack(track) {
    // Map Deezer fields to the format expected by normalizeTrack
    return normalizeTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      preview: track.preview,
      link: track.link,
      genre: track.genre?.name || null,
      genre_name: track.genre?.name || null,
      rank: track.rank,
      duration: track.duration
    }, 'deezer');
  }

  /**
   * Search for tracks by query and genre
   */
  async search(query, genre = null) {
    try {
      let url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=50`;

      if (genre) {
        url = `${this.baseUrl}/search?q=genre:"${encodeURIComponent(genre)}"&limit=50`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        return data.data.map(track => this.formatTrack(track));
      }

      return [];
    } catch (error) {
      console.error('Deezer search error:', error);
      return [];
    }
  }

  /**
   * Get tracks by genre with pagination
   */
  async getTracksByGenre(genre, offset = 0) {
    try {
      const genreLower = genre.toLowerCase();

      // Search-based genres (no Deezer genre ID)
      if (this.genreSearchTerms[genreLower]) {
        return this.search(this.genreSearchTerms[genreLower]);
      }

      const genreId = this.genres[genreLower] || genre;

      // First try to get artists from the genre
      const artistsResponse = await fetch(`${this.baseUrl}/genre/${genreId}/artists?limit=10`);
      const artistsData = await artistsResponse.json();

      if (!artistsData.data || artistsData.data.length === 0) {
        // Fallback to search
        return this.search('', genre);
      }

      // Get top tracks from these artists
      const tracks = [];
      for (const artist of artistsData.data.slice(0, 5)) {
        const topResponse = await fetch(`${this.baseUrl}/artist/${artist.id}/top?limit=10`);
        const topData = await topResponse.json();

        if (topData.data) {
          tracks.push(...topData.data.map(track => this.formatTrack(track)));
        }
      }

      return tracks.slice(offset, offset + 50);
    } catch (error) {
      console.error('Deezer getTracksByGenre error:', error);
      return [];
    }
  }

  /**
   * Get trending/chart tracks
   */
  async getTrendingTracks(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/chart/0/tracks?limit=${limit}`);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        return data.data.map(track => this.formatTrack(track));
      }

      return [];
    } catch (error) {
      console.error('Deezer getTrendingTracks error:', error);
      return [];
    }
  }

  /**
   * Get related tracks for a given track ID
   */
  async getRelatedTracks(trackId) {
    try {
      // First get the track to find its artist
      const track = await this.getTrackById(trackId);
      if (!track || !track.artistId) {
        return [];
      }

      // Get related tracks from the same artist and related artists
      const [artistTopTracks, relatedArtists] = await Promise.allSettled([
        fetch(`${this.baseUrl}/artist/${track.artistId}/top?limit=10`).then(r => r.json()),
        fetch(`${this.baseUrl}/artist/${track.artistId}/related?limit=5`).then(r => r.json())
      ]);

      const tracks = [];

      // Add artist's top tracks (excluding the seed track)
      if (artistTopTracks.status === 'fulfilled' && artistTopTracks.value.data) {
        tracks.push(...artistTopTracks.value.data
          .filter(t => t.id.toString() !== trackId.toString())
          .map(t => this.formatTrack(t))
        );
      }

      // Add tracks from related artists
      if (relatedArtists.status === 'fulfilled' && relatedArtists.value.data) {
        for (const artist of relatedArtists.value.data.slice(0, 3)) {
          const topResponse = await fetch(`${this.baseUrl}/artist/${artist.id}/top?limit=5`);
          const topData = await topResponse.json();
          if (topData.data) {
            tracks.push(...topData.data.map(t => this.formatTrack(t)));
          }
        }
      }

      return tracks.slice(0, 25);
    } catch (error) {
      console.error('Deezer getRelatedTracks error:', error);
      return [];
    }
  }

  /**
   * Get track by ID
   */
  async getTrackById(trackId) {
    try {
      const response = await fetch(`${this.baseUrl}/track/${trackId}`);
      const data = await response.json();

      if (data.id) {
        return this.formatTrack(data);
      }

      return null;
    } catch (error) {
      console.error('Deezer getTrackById error:', error);
      return null;
    }
  }

  /**
   * Get recommended tracks based on liked track IDs
   */
  async getRecommendations(likedTrackIds) {
    try {
      if (!likedTrackIds || likedTrackIds.length === 0) {
        return this.getTrendingTracks();
      }

      // Get details of liked tracks to extract artists and genres
      const likedTracks = await Promise.all(
        likedTrackIds.slice(0, 5).map(id => this.getTrackById(id))
      );

      const validTracks = likedTracks.filter(track => track !== null);

      if (validTracks.length === 0) {
        return this.getTrendingTracks();
      }

      // Extract artist IDs
      const artistIds = [...new Set(validTracks.map(track => track.artistId))];

      // Get recommendations from related artists
      const recommendations = [];

      for (const artistId of artistIds.slice(0, 3)) {
        try {
          // Get artist's top tracks
          const topResponse = await fetch(`${this.baseUrl}/artist/${artistId}/top?limit=10`);
          const topData = await topResponse.json();

          if (topData.data) {
            recommendations.push(...topData.data.map(track => this.formatTrack(track)));
          }

          // Get related artists
          const relatedResponse = await fetch(`${this.baseUrl}/artist/${artistId}/related?limit=5`);
          const relatedData = await relatedResponse.json();

          if (relatedData.data) {
            for (const relatedArtist of relatedData.data.slice(0, 2)) {
              const relatedTopResponse = await fetch(`${this.baseUrl}/artist/${relatedArtist.id}/top?limit=5`);
              const relatedTopData = await relatedTopResponse.json();

              if (relatedTopData.data) {
                recommendations.push(...relatedTopData.data.map(track => this.formatTrack(track)));
              }
            }
          }
        } catch (err) {
          console.error('Error fetching recommendations for artist:', artistId, err);
        }
      }

      // Remove duplicates and already liked tracks
      const uniqueRecommendations = recommendations.filter((track, index, self) =>
        index === self.findIndex(t => t.id === track.id) &&
        !likedTrackIds.includes(track.id)
      );

      return uniqueRecommendations.slice(0, 50);
    } catch (error) {
      console.error('Deezer getRecommendations error:', error);
      return this.getTrendingTracks();
    }
  }
}

module.exports = DeezerProvider;
