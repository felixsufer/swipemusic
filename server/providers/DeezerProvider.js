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
    // Artist seeds per genre — searched randomly to get real genre tracks
    // Much more accurate than searching by genre keyword
    this.genreArtistSeeds = {
      techno: ['Charlotte de Witte', 'Richie Hawtin', 'Adam Beyer', 'Amelie Lens', 'FJAAK', 'Svreca', 'Dax J', 'Rebekah'],
      house: ['Disclosure', 'MK', 'Duke Dumont', 'Chris Lake', 'Jamie Jones', 'Frankie Knuckles', 'Larry Heard', 'Kerri Chandler'],
      deephouse: ['Larry Heard', 'Kerri Chandler', 'Gene Hunt', 'Moodymann', 'Theo Parrish', 'Floating Points'],
      dubstep: ['Skrillex', 'Excision', 'Flux Pavilion', 'Zomboy', 'Kill the Noise', 'Benga', 'Digital Mystikz'],
      dnb: ['Chase & Status', 'Pendulum', 'Noisia', 'High Contrast', 'LTJ Bukem', 'Goldie', 'Andy C', 'Shy FX'],
      trance: ['Armin van Buuren', 'Paul van Dyk', 'Ferry Corsten', 'Above & Beyond', 'Tiësto', 'Sasha', 'John Digweed'],
      electronic: ['Four Tet', 'Aphex Twin', 'Burial', 'Bonobo', 'Jon Hopkins', 'Moderat', 'Floating Points'],
      jungle: ['Goldie', 'LTJ Bukem', '4hero', 'Shy FX', 'Roni Size', 'Photek'],
      garage: ['Craig David', 'MJ Cole', 'Todd Edwards', 'El-B', 'Zed Bias'],
      ambient: ['Brian Eno', 'The Orb', 'Moby', 'Boards of Canada', 'Stars of the Lid', 'Gas'],
      breakbeat: ['The Prodigy', 'The Chemical Brothers', 'Fatboy Slim', 'Daft Punk', 'Basement Jaxx'],
      industrial: ['Nine Inch Nails', 'Skinny Puppy', 'Front 242', 'Coil', 'Einstürzende Neubauten'],
      bass: ['Skream', 'Benga', 'Digital Mystikz', 'Mala', 'Loefah', 'Coki'],
      dance: ['David Guetta', 'Calvin Harris', 'Avicii', 'Martin Garrix', 'Kygo', 'Swedish House Mafia'],
      hiphop: ['Kendrick Lamar', 'J. Cole', 'Drake', 'Travis Scott', 'Tyler the Creator', 'Joey Bada$$'],
      rap: ['Kendrick Lamar', 'Jay-Z', 'Nas', 'Wu-Tang Clan', 'Rakim', 'Big L'],
      pop: ['Dua Lipa', 'The Weeknd', 'Billie Eilish', 'Harry Styles', 'Taylor Swift', 'Ariana Grande'],
      rock: ['Radiohead', 'Arctic Monkeys', 'The Strokes', 'Tame Impala', 'Arcade Fire', 'LCD Soundsystem'],
      metal: ['Metallica', 'Slayer', 'Mastodon', 'Gojira', 'Converge', 'Neurosis'],
      rnb: ['Frank Ocean', 'SZA', 'Daniel Caesar', 'H.E.R.', 'Solange', 'Blood Orange']
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

      const response = await fetch(url, { timeout: 8000 });
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        return data.data.map(track => this.formatTrack(track));
      }

      return [];
    } catch (error) {
      console.error('Deezer search error:', error.message);
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
      const response = await fetch(`${this.baseUrl}/chart/0/tracks?limit=${limit}`, { timeout: 6000 });
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        return data.data.map(track => this.formatTrack(track));
      }

      // Fallback: search for popular tracks
      return this.search('top hits');
    } catch (error) {
      console.error('Deezer getTrendingTracks error:', error.message);
      // Fallback: search for popular tracks
      try {
        return this.search('top hits');
      } catch (e) {
        return [];
      }
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
   * Get tracks by genre using artist seeds — much more accurate than keyword search
   * Picks 2-3 random artists from the seed list and fetches their top tracks
   */
  async getTracksByGenreSeeds(genre) {
    const seeds = this.genreArtistSeeds[genre.toLowerCase()];
    if (!seeds || seeds.length === 0) return [];

    try {
      // Pick 3 random artists from seeds
      const shuffled = seeds.sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, 3);

      const results = await Promise.allSettled(
        picked.map(artist => this.search(artist))
      );

      return results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(t => t.preview); // only tracks with previews
    } catch (err) {
      console.error('getTracksByGenreSeeds error:', err.message);
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
