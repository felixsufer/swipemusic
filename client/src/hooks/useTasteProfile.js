import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  LIKED: 'swipemusic_liked_tracks',
  SKIPPED: 'swipemusic_skipped_tracks',
  PROFILE: 'swipemusic_taste_profile'
};

/**
 * Custom hook for managing user's taste profile
 * Tracks liked/skipped tracks in Supabase (when userId is provided) or localStorage
 * @param {string} userId - Optional user ID for Supabase sync
 */
export const useTasteProfile = (userId = null) => {
  const [liked, setLiked] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [tasteProfile, setTasteProfile] = useState({
    topGenres: [],
    topArtists: [],
    totalLiked: 0
  });

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (userId) {
          // Load from Supabase
          const { data: likedData, error: likedError } = await supabase
            .from('liked_tracks')
            .select('*')
            .eq('user_id', userId)
            .order('liked_at', { ascending: false });

          if (likedError) throw likedError;

          if (likedData) {
            // Extract track data from JSONB
            const tracks = likedData.map(row => row.track_data);
            setLiked(tracks);
            updateTasteProfile(tracks);
          }
        } else {
          // Load from localStorage (anonymous user)
          const likedData = localStorage.getItem(STORAGE_KEYS.LIKED);
          const skippedData = localStorage.getItem(STORAGE_KEYS.SKIPPED);
          const profileData = localStorage.getItem(STORAGE_KEYS.PROFILE);

          if (likedData) setLiked(JSON.parse(likedData));
          if (skippedData) setSkipped(JSON.parse(skippedData));
          if (profileData) setTasteProfile(JSON.parse(profileData));
        }
      } catch (error) {
        console.error('Error loading taste profile:', error);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Derive taste profile from liked tracks
  const updateTasteProfile = useCallback((likedTracks) => {
    if (likedTracks.length === 0) {
      setTasteProfile({
        topGenres: [],
        topArtists: [],
        totalLiked: 0
      });
      return;
    }

    // Count genres
    const genreCounts = {};
    const artistCounts = {};

    likedTracks.forEach(track => {
      if (track.genre) {
        genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
      }
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
      }
    });

    // Sort and get top genres and artists
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));

    const profile = {
      topGenres,
      topArtists,
      totalLiked: likedTracks.length
    };

    setTasteProfile(profile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, []);

  // Add track to liked
  const likeTrack = useCallback(async (track) => {
    try {
      if (userId) {
        // Save to Supabase
        const { error } = await supabase
          .from('liked_tracks')
          .insert({
            user_id: userId,
            track_id: track.id,
            track_data: track
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      } else {
        // Save to localStorage (anonymous user)
        setLiked(prev => {
          const newLiked = [...prev, track];
          localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(newLiked));
          updateTasteProfile(newLiked);
          return newLiked;
        });
        return;
      }

      // Update local state
      setLiked(prev => {
        const newLiked = [...prev, track];
        updateTasteProfile(newLiked);
        return newLiked;
      });
    } catch (error) {
      console.error('Error liking track:', error);
    }
  }, [userId, updateTasteProfile]);

  // Add track to skipped
  const skipTrack = useCallback(async (track) => {
    try {
      if (userId) {
        // Save to Supabase
        const { error } = await supabase
          .from('skipped_tracks')
          .insert({
            user_id: userId,
            track_id: track.id
          });

        if (error && error.code !== '23505') { // Ignore unique constraint violations
          throw error;
        }
      } else {
        // Save to localStorage (anonymous user)
        setSkipped(prev => {
          const newSkipped = [...prev, track];
          localStorage.setItem(STORAGE_KEYS.SKIPPED, JSON.stringify(newSkipped));
          return newSkipped;
        });
        return;
      }

      // Update local state
      setSkipped(prev => [...prev, track]);
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  }, [userId]);

  // Remove track from liked
  const unlikeTrack = useCallback(async (trackId) => {
    try {
      if (userId) {
        // Delete from Supabase
        const { error } = await supabase
          .from('liked_tracks')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', trackId);

        if (error) throw error;
      } else {
        // Delete from localStorage (anonymous user)
        setLiked(prev => {
          const newLiked = prev.filter(track => track.id !== trackId);
          localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(newLiked));
          updateTasteProfile(newLiked);
          return newLiked;
        });
        return;
      }

      // Update local state
      setLiked(prev => {
        const newLiked = prev.filter(track => track.id !== trackId);
        updateTasteProfile(newLiked);
        return newLiked;
      });
    } catch (error) {
      console.error('Error unliking track:', error);
    }
  }, [userId, updateTasteProfile]);

  // Clear all data
  const clearAll = useCallback(() => {
    setLiked([]);
    setSkipped([]);
    setTasteProfile({
      topGenres: [],
      topArtists: [],
      totalLiked: 0
    });
    localStorage.removeItem(STORAGE_KEYS.LIKED);
    localStorage.removeItem(STORAGE_KEYS.SKIPPED);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  }, []);

  // Check if we have enough data for recommendations
  const hasEnoughData = liked.length >= 5;

  // Get liked track IDs for API requests
  const getLikedTrackIds = useCallback(() => {
    return liked.map(track => track.id);
  }, [liked]);

  return {
    liked,
    skipped,
    tasteProfile,
    likeTrack,
    skipTrack,
    unlikeTrack,
    clearAll,
    hasEnoughData,
    getLikedTrackIds
  };
};

export default useTasteProfile;
