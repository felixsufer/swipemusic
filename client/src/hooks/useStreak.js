import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'swipemusic_streak';

/**
 * Tracks daily swipe streak and today's session stats.
 * Pure localStorage — no Supabase needed (lightweight, works for anon users too).
 *
 * Streak logic:
 *  - If last active date = today → streak already counted, just update today stats
 *  - If last active date = yesterday → bump streak on first activity today
 *  - If last active date is older or missing → reset streak to 1
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

export const useStreak = () => {
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

  // On mount, also check if streak has expired (more than 1 day gap since last active)
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
      return updated;
    });
  }, []);

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
