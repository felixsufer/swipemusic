import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const LOCAL_KEY = 'crates';

/**
 * Hook for managing crate (saved tracks for DJ sets / export)
 * - Authenticated users: synced to Supabase crate_items table
 * - Anonymous users: localStorage fallback
 * - On sign-in: merges any local crate into Supabase
 */
export const useCrate = (userId = null) => {
  const [crateItems, setCrateItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load crate from Supabase (or localStorage if anon)
  useEffect(() => {
    if (!userId) {
      // Anonymous: read from localStorage
      const stored = localStorage.getItem(LOCAL_KEY);
      setCrateItems(stored ? JSON.parse(stored) : []);
      setLoaded(true);
      return;
    }

    const loadCrate = async () => {
      try {
        const { data, error } = await supabase
          .from('crate_items')
          .select('track_data, saved_at')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (error) throw error;

        const tracks = (data || []).map(row => row.track_data);

        // Merge any local crate items (e.g. from before login)
        const localRaw = localStorage.getItem(LOCAL_KEY);
        const localItems = localRaw ? JSON.parse(localRaw) : [];

        if (localItems.length > 0) {
          // Upsert local items into Supabase
          const localToSync = localItems.filter(
            t => !tracks.some(st => st.id === t.id)
          );

          if (localToSync.length > 0) {
            await supabase.from('crate_items').upsert(
              localToSync.map(t => ({
                user_id: userId,
                track_id: t.id,
                track_data: t,
              })),
              { onConflict: 'user_id,track_id' }
            );
            // Clear local storage after successful sync
            localStorage.removeItem(LOCAL_KEY);
          }

          // Merge: Supabase first (fresher), then any not-yet-synced local
          const merged = [...tracks];
          localToSync.forEach(t => {
            if (!merged.some(st => st.id === t.id)) merged.push(t);
          });
          setCrateItems(merged);
        } else {
          setCrateItems(tracks);
          localStorage.removeItem(LOCAL_KEY);
        }
      } catch (err) {
        console.error('Error loading crate:', err);
        // Fallback to localStorage
        const stored = localStorage.getItem(LOCAL_KEY);
        setCrateItems(stored ? JSON.parse(stored) : []);
      } finally {
        setLoaded(true);
      }
    };

    loadCrate();
  }, [userId]);

  // Add to crate
  const addToCrate = useCallback(async (track) => {
    // Prevent duplicates
    setCrateItems(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      const updated = [track, ...prev];

      if (!userId) {
        // Anonymous: persist to localStorage
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      }

      return updated;
    });

    if (userId) {
      try {
        await supabase.from('crate_items').upsert({
          user_id: userId,
          track_id: track.id,
          track_data: track,
        }, { onConflict: 'user_id,track_id' });
      } catch (err) {
        console.error('Error saving crate item:', err.message);
      }
    }
  }, [userId]);

  // Remove from crate
  const removeFromCrate = useCallback(async (trackId) => {
    setCrateItems(prev => {
      const updated = prev.filter(t => t.id !== trackId);

      if (!userId) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      }

      return updated;
    });

    if (userId) {
      try {
        await supabase
          .from('crate_items')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', trackId);
      } catch (err) {
        console.error('Error removing crate item:', err.message);
      }
    }
  }, [userId]);

  // Check if track is in crate
  const isInCrate = useCallback((trackId) => {
    return crateItems.some(t => t.id === trackId);
  }, [crateItems]);

  return {
    crateItems,
    loaded,
    addToCrate,
    removeFromCrate,
    isInCrate,
  };
};

export default useCrate;
