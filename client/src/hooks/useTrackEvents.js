import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for tracking events to Supabase and loading seen track history
 * Persists across sessions and devices
 */
export const useTrackEvents = (userId = null) => {
  const [seenIds, setSeenIds] = useState(new Set());
  const [blacklistedIds, setBlacklistedIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load history from Supabase on mount
  useEffect(() => {
    if (!userId) {
      setLoaded(true);
      return;
    }

    const loadHistory = async () => {
      try {
        // Load all events from last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from('track_events')
          .select('track_id, event_type')
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo);

        if (error) throw error;

        if (data) {
          const seen = new Set();
          const blacklisted = new Set();

          data.forEach(row => {
            seen.add(row.track_id);
            if (row.event_type === 'blacklist') {
              blacklisted.add(row.track_id);
            }
          });

          setSeenIds(seen);
          setBlacklistedIds(blacklisted);
        }
      } catch (err) {
        console.error('Error loading track history:', err);
      } finally {
        setLoaded(true);
      }
    };

    loadHistory();
  }, [userId]);

  // Write an event to Supabase
  const recordEvent = useCallback(async (eventType, track, meta = {}) => {
    if (!userId || !track) return;

    // Update local state immediately
    setSeenIds(prev => new Set([...prev, track.id]));
    if (eventType === 'blacklist') {
      setBlacklistedIds(prev => new Set([...prev, track.id]));
    }

    // Write to Supabase
    try {
      await supabase.from('track_events').insert({
        user_id: userId,
        track_id: track.id,
        track_data: track,
        event_type: eventType,
        mode: meta.mode || null,
        genre: meta.genre || null
      });
    } catch (err) {
      // Non-critical — don't break the UX
      console.error('Error recording event:', err.message);
    }
  }, [userId]);

  return {
    seenIds,
    blacklistedIds,
    recordEvent,
    loaded
  };
};

export default useTrackEvents;
