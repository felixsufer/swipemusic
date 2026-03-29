import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'swipemusic_streak';

/**
 * Tracks daily swipe streak and today's session stats.
 * - Authenticated users: synced to Supabase user_streaks table
 * - Anonymous users: localStorage only
 *
 * Streak logic:
 *  - If last active date = today → streak already counted, just update today stats
 *  - If last active date = yesterday → bump streak on first activity today
 *  - If last active date is older or missing → reset streak to 1
 *
 * On load with userId: reconcile local vs server (take higher streak value).
 * On activity: debounced write to Supabase to avoid per-swipe DB calls.
 */
const getToday = () => new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

export const useStreak = (userId = null) => {
  const [streakData, setStreakData] = useState(() => {
    const stored = loadData();
    const today = getToday();

    if (!stored) {
      return { streak: 0, lastActiveDate: null, todayLikes: 0, todaySwipes: 0, totalDays: 0 };
    }

    // If stored data is from a different day, reset today's counters
    if (stored.lastActiveDate !== today) {
      return {
        streak: stored.streak,
        lastActiveDate: stored.lastActiveDate,
        todayLikes: 0,
        todaySwipes: 0,
        totalDays: stored.totalDays || 0,
      };
    }

    return stored;
  });

  // Track whether Supabase data has been loaded (to avoid overwriting with stale local)
  const supabaseLoadedRef = useRef(false);

  // Debounce timer ref for Supabase writes
  const syncTimerRef = useRef(null);

  // On mount, check if streak has expired (more than 1 day gap since last active)
  useEffect(() => {
    const stored = loadData();
    if (!stored || !stored.lastActiveDate) return;

    const today = getToday();
    const last = new Date(stored.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - last) / (1000 * 60 * 60 * 24));

    // Gap > 1 day means streak is broken — reflect in state but don't save until next activity
    if (diffDays > 1) {
      setStreakData(prev => ({ ...prev, streak: 0 }));
    }
  }, []);

  // Load + reconcile from Supabase when userId is available
  useEffect(() => {
    if (!userId) return;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('user_streaks')
          .select('streak, last_active_date, total_days')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found (new user) — not a real error
          console.warn('Streak load error:', error.message);
          return;
        }

        if (data) {
          const today = getToday();
          const serverLastDate = data.last_active_date; // 'YYYY-MM-DD'
          const serverStreak = data.streak || 0;
          const serverTotal = data.total_days || 0;

          // Check if server streak has expired
          let resolvedStreak = serverStreak;
          if (serverLastDate) {
            const last = new Date(serverLastDate);
            const todayDate = new Date(today);
            const diffDays = Math.round((todayDate - last) / (1000 * 60 * 60 * 24));
            if (diffDays > 1) resolvedStreak = 0;
          }

          // Reconcile: take higher streak between local and server
          setStreakData(prev => {
            const localStreak = prev.streak || 0;
            const winnerStreak = Math.max(localStreak, resolvedStreak);
            const winnerTotal = Math.max(prev.totalDays || 0, serverTotal);

            // Use server's last_active_date if it's more recent
            let lastDate = prev.lastActiveDate;
            if (serverLastDate && (!lastDate || serverLastDate > lastDate)) {
              lastDate = serverLastDate;
            }

            const reconciled = {
              ...prev,
              streak: winnerStreak,
              lastActiveDate: lastDate,
              totalDays: winnerTotal,
            };

            saveData(reconciled);
            return reconciled;
          });
        }
      } catch (err) {
        console.error('Streak Supabase load failed:', err);
      } finally {
        supabaseLoadedRef.current = true;
      }
    };

    loadFromSupabase();
  }, [userId]);

  // Debounced sync to Supabase — called after state updates
  const scheduleSyncToSupabase = useCallback((data) => {
    if (!userId) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await supabase.from('user_streaks').upsert({
          user_id: userId,
          streak: data.streak,
          last_active_date: data.lastActiveDate,
          total_days: data.totalDays,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('Streak sync failed:', err);
      }
    }, 2000); // 2s debounce — batches rapid swipe bursts into one write
  }, [userId]);

  /**
   * Called whenever the user likes or swipes.
   * @param {'like'|'swipe'} eventType
   */
  const recordActivity = useCallback((eventType) => {
    const today = getToday();

    setStreakData(prev => {
      const last = prev.lastActiveDate;
      let newStreak = prev.streak;
      let newTotalDays = prev.totalDays || 0;

      if (last === today) {
        // Already active today — just update counters
      } else {
        // First activity today — figure out streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (last === yesterdayStr) {
          // Consecutive day — extend streak
          newStreak = (prev.streak || 0) + 1;
        } else {
          // Gap → start fresh streak
          newStreak = 1;
        }
        newTotalDays = (prev.totalDays || 0) + 1;
      }

      const updated = {
        streak: newStreak,
        lastActiveDate: today,
        todayLikes: eventType === 'like' ? (prev.todayLikes || 0) + 1 : (prev.todayLikes || 0),
        todaySwipes: (prev.todaySwipes || 0) + 1,
        totalDays: newTotalDays,
      };

      saveData(updated);
      scheduleSyncToSupabase(updated);
      return updated;
    });
  }, [scheduleSyncToSupabase]);

  return {
    streak: streakData.streak,
    todayLikes: streakData.todayLikes,
    todaySwipes: streakData.todaySwipes,
    totalDays: streakData.totalDays || 0,
    lastActiveDate: streakData.lastActiveDate,
    recordActivity,
  };
};

export default useStreak;
