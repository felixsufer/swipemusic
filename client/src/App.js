import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ModeSelector from './components/ModeSelector';
import SwipeStack from './components/SwipeStack';
import PlayerBar from './components/PlayerBar';
import LikedTracks from './components/LikedTracks';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';
import GestureTutorial from './components/GestureTutorial';
import GenreChipRow from './components/GenreChipRow';
import BpmFilter from './components/BpmFilter';
import SearchScreen from './components/SearchScreen';
import OnboardingFlow from './components/OnboardingFlow';
import { useTasteProfile } from './hooks/useTasteProfile';
import { useTrackEvents } from './hooks/useTrackEvents';
import { useCrate } from './hooks/useCrate';
import { useAuth } from './hooks/useAuth';
import { useStreak } from './hooks/useStreak';
import './App.css';

const API_BASE = '/api';
const ONBOARDING_STORAGE_KEY = 'swipemusic_onboarding_v1';

function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [currentMode, setCurrentMode] = useState('trending');
  const [tracks, setTracks] = useState([]);
  // Per-mode seen track IDs — session only (DB handles cross-session)
  const [seenTrackIdsByMode, setSeenTrackIdsByMode] = useState(
    { trending: new Set(), genre: new Set(), recommendations: new Set() }
  );
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLikedTracks, setShowLikedTracks] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('electronic');
  const [stackKey, setStackKey] = useState(0);
  const [bpmMin, setBpmMin] = useState(null);
  const [bpmMax, setBpmMax] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Track events + DB-persisted seen/blacklist history
  const { seenIds: dbSeenIds, blacklistedIds: dbBlacklistedIds, recordEvent, loaded: eventsLoaded } = useTrackEvents(user?.id);

  const [localBlacklistedIds, setLocalBlacklistedIds] = useState(() => {
    const stored = localStorage.getItem('blacklistedIds');
    return stored ? JSON.parse(stored) : [];
  });
  // Crate — now synced to Supabase via useCrate hook
  const { crateItems, addToCrate, removeFromCrate, isInCrate } = useCrate(user?.id);
  const [currentTab, setCurrentTab] = useState('home');
  const [recentTracks, setRecentTracks] = useState([]);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('swipemusic_tutorial_done'));
  const [onboardingPreferences, setOnboardingPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Session momentum — tracks liked THIS session for algo boosting
  const [sessionLikedGenres, setSessionLikedGenres] = useState({});
  const [sessionLikedArtists, setSessionLikedArtists] = useState([]);

  // Session streak + daily stats — pass userId for Supabase sync
  const { streak, todayLikes, todaySwipes, totalDays, recordActivity: recordStreakActivity } = useStreak(user?.id);

  // Spotify OAuth token
  const [spotifyToken, setSpotifyToken] = useState(() => localStorage.getItem('spotify_access_token') || null);

  // Session ID for event tracking
  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
  }, []);

  // Handle Spotify OAuth callback tokens from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('spotify_access_token');
    const refresh = params.get('spotify_refresh_token');
    if (token) {
      localStorage.setItem('spotify_access_token', token);
      if (refresh) localStorage.setItem('spotify_refresh_token', refresh);
      setSpotifyToken(token);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const {
    liked,
    skipped,
    tasteProfile,
    likeTrack,
    skipTrack,
    unlikeTrack,
    hasEnoughData,
    getLikedTrackIds
  } = useTasteProfile(user?.id);

  useEffect(() => {
    if (!user) return;

    const hasExistingTaste = liked.length > 0 || skipped.length > 0;
    const alreadyCompleted = Boolean(onboardingPreferences?.completedAt);

    setShowOnboarding(!hasExistingTaste && !alreadyCompleted);
  }, [user, liked.length, skipped.length, onboardingPreferences]);

  // Merge DB blacklist with local blacklist — stable reference
  const allBlacklistedIds = useMemo(() => [
    ...localBlacklistedIds,
    ...Array.from(dbBlacklistedIds)
  ], [localBlacklistedIds, dbBlacklistedIds]);

  // Fetch tracks based on current mode
  const fetchTracks = useCallback(async (append = false) => {
    setIsLoading(true);
    try {
      const modeKey = currentMode === 'genre' ? `genre_${selectedGenre}` : currentMode;
      const currentSeenIds = seenTrackIdsByMode[modeKey] || new Set();

      // Merge per-mode session seen IDs with DB seen IDs
      const allSeenIds = new Set([...currentSeenIds, ...dbSeenIds]);

      // Request more candidates when we have a large seen history
      const fetchLimit = Math.min(50, 20 + Math.floor(allSeenIds.size / 5));
      let url = `${API_BASE}/tracks?mode=${currentMode}&limit=${fetchLimit}`;

      if (currentMode === 'genre') {
        url += `&genre=${selectedGenre}`;
      }
      if (allSeenIds.size > 0) {
        // Cap at 200 to avoid URL length issues — DB handles the rest
        const seenArr = Array.from(allSeenIds).slice(-200);
        url += `&seenIds=${seenArr.join(',')}`;
      }

      // Always send liked + skipped + blacklisted across all modes
      const likedIds = getLikedTrackIds();
      if (likedIds.length > 0) url += `&likedTrackIds=${likedIds.join(',')}`;

      // Send liked artists for better recommendations
      const likedArtists = tasteProfile.topArtists.map(a => a.artist).filter(Boolean);
      if (likedArtists.length > 0) url += `&likedArtists=${encodeURIComponent(likedArtists.join(','))}`;

      // Send liked genres for scoring
      if (tasteProfile.topGenres.length > 0) {
        const genreMap = {};
        tasteProfile.topGenres.forEach(g => { genreMap[g.genre] = g.count; });
        url += `&likedGenres=${encodeURIComponent(JSON.stringify(genreMap))}`;
      } else if (onboardingPreferences?.genres?.length > 0) {
        const seededGenreMap = {};
        onboardingPreferences.genres.forEach((genre) => { seededGenreMap[genre] = 2; });
        url += `&likedGenres=${encodeURIComponent(JSON.stringify(seededGenreMap))}`;
      }

      // Send session momentum (in-session likes have 3x weight on backend)
      if (Object.keys(sessionLikedGenres).length > 0) {
        url += `&sessionLikedGenres=${encodeURIComponent(JSON.stringify(sessionLikedGenres))}`;
      }
      if (sessionLikedArtists.length > 0) {
        url += `&sessionLikedArtists=${encodeURIComponent(sessionLikedArtists.join(','))}`;
      }

      const skippedIds = skipped.map(t => t.id).filter(Boolean);
      if (skippedIds.length > 0) url += `&skippedIds=${skippedIds.join(',')}`;

      if (allBlacklistedIds.length > 0) url += `&blacklistedIds=${allBlacklistedIds.join(',')}`;

      if (bpmMin != null) url += `&bpmMin=${bpmMin}`;
      if (bpmMax != null) url += `&bpmMax=${bpmMax}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.tracks && data.tracks.length > 0) {
        const newTracks = data.tracks.filter(t => !currentSeenIds.has(t.id));

        if (append) {
          setTracks(prev => [...prev, ...newTracks]);
        } else {
          setTracks(newTracks);
        }

        // Update per-mode seen IDs and persist to sessionStorage
        setSeenTrackIdsByMode(prev => {
          const updated = { ...prev };
          const modeSet = new Set(prev[modeKey] || []);
          newTracks.forEach(t => modeSet.add(t.id));
          updated[modeKey] = modeSet;
          // DB (useTrackEvents) handles cross-session persistence
          return updated;
        });
      } else {
        setTracks([]);
        console.warn('No tracks received');
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMode, selectedGenre, getLikedTrackIds, seenTrackIdsByMode, allBlacklistedIds, skipped, dbSeenIds, bpmMin, bpmMax, tasteProfile.topGenres, onboardingPreferences, sessionLikedGenres, sessionLikedArtists]);

  // Fetch tracks when mode changes — wait for DB history to load first
  useEffect(() => {
    if (!eventsLoaded) return; // Don't fetch until DB seenIds are loaded
    fetchTracks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode, selectedGenre, eventsLoaded]);

  // Re-fetch when BPM filter changes (handleBpmChange already reset the stack)
  useEffect(() => {
    if (!eventsLoaded) return;
    fetchTracks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpmMin, bpmMax]);

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setTracks([]);
    setCurrentTrack(null);
    setStackKey(prev => prev + 1);
    // seenTrackIdsByMode persists per-mode — switching modes gives fresh content
    // but switching BACK to same mode won't re-show already-seen tracks
  };

  const handleBpmChange = (min, max) => {
    setBpmMin(min);
    setBpmMax(max);
    // Reset stack so new BPM filter applies immediately
    setTracks([]);
    setStackKey(prev => prev + 1);
  };

  const handleLike = (track) => {
    likeTrack(track);
    recordEvent('like', track, { mode: currentMode, genre: selectedGenre });
    recordStreakActivity('like');
    setRecentTracks(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 10));

    // Update session momentum
    if (track.genre) {
      setSessionLikedGenres(prev => ({ ...prev, [track.genre]: (prev[track.genre] || 0) + 1 }));
    }
    if (track.artist) {
      setSessionLikedArtists(prev => [track.artist, ...prev.filter(a => a !== track.artist)].slice(0, 10));
    }
  };

  const handleSkip = (track) => {
    skipTrack(track);
    recordEvent('skip', track, { mode: currentMode, genre: selectedGenre });
    recordStreakActivity('swipe');
    setRecentTracks(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 10));
  };

  const handleSaveToCrate = (track) => {
    addToCrate(track);
    handleSaveToCrateEvent(track);
  };

  const handleBlacklist = (track) => {
    const updated = [...localBlacklistedIds, track.id];
    setLocalBlacklistedIds(updated);
    localStorage.setItem('blacklistedIds', JSON.stringify(updated));
    recordEvent('blacklist', track, { mode: currentMode, genre: selectedGenre });
  };

  const handleSaveToCrateEvent = (track) => {
    recordEvent('save_crate', track, { mode: currentMode, genre: selectedGenre });
  };

  const handleNeedMore = () => {
    // Load more tracks when running low — always fetch when called (SwipeStack decides when to call)
    if (!isLoading) {
      fetchTracks(true);
    }
  };

  const handleTopCardChange = (track) => {
    // Auto-play when top card changes
    if (track) {
      setCurrentTrack(track);
    }
  };

  const handleUndo = (lastSwiped) => {
    // Remove from liked or skipped
    if (lastSwiped.direction === 'right') {
      unlikeTrack(lastSwiped.track.id);
    }
    // For skipped tracks, we don't need to do anything since skipTrack doesn't persist
  };

  const handleUnlike = (trackId) => {
    unlikeTrack(trackId);
  };

  const handleSignOut = () => {
    setShowUserMenu(false);
    signOut();
  };

  const handleCompleteOnboarding = (preferences) => {
    setOnboardingPreferences(preferences);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(preferences));
    setSelectedGenre(preferences.genres?.[0] || 'electronic');
    setBpmMin(preferences.bpmMin ?? null);
    setBpmMax(preferences.bpmMax ?? null);
    setCurrentMode('genre');
    setCurrentTab('discover');
    setTracks([]);
    setStackKey((prev) => prev + 1);
    setShowOnboarding(false);
  };

  const handleSkipOnboarding = () => {
    const skippedPreferences = {
      genres: [],
      bpmMin: null,
      bpmMax: null,
      completedAt: new Date().toISOString(),
      skipped: true,
    };
    setOnboardingPreferences(skippedPreferences);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(skippedPreferences));
    setShowOnboarding(false);
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-logo">
          <h1 className="app-title">SwipeSound</h1>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />;
  }

  const handleSelectGenre = (genre) => {
    setSelectedGenre(genre);
    handleModeChange('genre');
    setCurrentTab('discover');
  };

  const handleSelectMode = (mode) => {
    handleModeChange(mode);
    setCurrentTab('discover');
  };

  const renderTabContent = () => {
    if (currentTab === 'home') {
      return <HomeScreen
        onStartSwiping={() => handleSelectMode('trending')}
        onSelectGenre={handleSelectGenre}
        onSelectMode={handleSelectMode}
        recentTracks={recentTracks}
        tasteProfile={tasteProfile}
        liked={liked}
        skipped={skipped}
        hasEnoughData={hasEnoughData}
        crateItems={crateItems}
        streak={streak}
        todayLikes={todayLikes}
        todaySwipes={todaySwipes}
        totalDays={totalDays}
        onboardingPreferences={onboardingPreferences}
      />;
    } else if (currentTab === 'discover') {
      return <SwipeStack
        key={stackKey}
        tracks={tracks}
        onLike={handleLike}
        onSkip={handleSkip}
        onNeedMore={handleNeedMore}
        onTopCardChange={handleTopCardChange}
        onUndo={handleUndo}
        onSaveToCrate={handleSaveToCrate}
        onBlacklist={handleBlacklist}
        currentMode={currentMode}
        tasteProfile={tasteProfile}
      />;
    } else if (currentTab === 'search') {
      return <SearchScreen
        onPlayTrack={(track) => setCurrentTrack(track)}
        onLike={handleLike}
        onSaveToCrate={handleSaveToCrate}
      />;
    } else if (currentTab === 'crates') {
      return <LikedTracks
        tracks={liked}
        crateItems={crateItems}
        onClose={() => setCurrentTab('discover')}
        onUnlike={handleUnlike}
        onRemoveFromCrate={removeFromCrate}
      />;
    } else if (currentTab === 'profile') {
      return (
        <div className="profile-screen">
          <div className="profile-header">
            {user?.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="avatar" className="profile-avatar" />
            )}
            <h2>{user?.user_metadata?.full_name || user?.email}</h2>
          </div>
          <div className="profile-stats">
            <div className="pstat"><span className="pstat-num">{liked.length + skipped.length}</span><span className="pstat-label">Swipes</span></div>
            <div className="pstat"><span className="pstat-num">{liked.length}</span><span className="pstat-label">Liked</span></div>
            <div className="pstat"><span className="pstat-num">{skipped.length}</span><span className="pstat-label">Skipped</span></div>
            <div className="pstat"><span className="pstat-num">{crateItems.length}</span><span className="pstat-label">In Crate</span></div>
          </div>
          {tasteProfile.topGenres.length > 0 && (
            <div className="profile-section">
              <h3>Top Genres</h3>
              <div className="profile-tags">
                {tasteProfile.topGenres.map(g => (
                  <span key={g.genre} className="profile-tag">{g.genre} <b>{g.count}</b></span>
                ))}
              </div>
            </div>
          )}
          {tasteProfile.topArtists.length > 0 && (
            <div className="profile-section">
              <h3>Top Artists</h3>
              <div className="profile-tags">
                {tasteProfile.topArtists.map(a => (
                  <span key={a.artist} className="profile-tag">{a.artist} <b>{a.count}</b></span>
                ))}
              </div>
            </div>
          )}
          <div className="profile-section">
            <h3>Spotify</h3>
            {spotifyToken ? (
              <div className="spotify-connected">
                <span>✅ Connected</span>
                <button className="spotify-export-btn" onClick={async () => {
                  if (!crateItems.length) return alert('Your crate is empty!');
                  try {
                    const res = await fetch('/api/spotify/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ access_token: spotifyToken, tracks: crateItems, playlist_name: 'SwipeSound Crate' })
                    });
                    const data = await res.json();
                    if (data.playlist_url) window.open(data.playlist_url, '_blank');
                    else alert('Export done! ' + (data.tracks_added || 0) + ' tracks added.');
                  } catch (e) { alert('Export failed'); }
                }}>
                  Export Crate → Spotify Playlist
                </button>
              </div>
            ) : (
              <a href="/api/spotify/auth" className="spotify-connect-btn">
                Connect Spotify
              </a>
            )}
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">SwipeSound</h1>
          <div className="header-actions">
            <div className="user-menu-container">
              <button
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User avatar" />
                ) : (
                  <span className="avatar-fallback">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </button>
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-name">
                      {user.user_metadata?.full_name || user.email}
                    </div>
                  </div>
                  <button className="user-menu-item" onClick={handleSignOut}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {currentTab === 'discover' && (
          <>
          <ModeSelector
            currentMode={currentMode}
            onModeChange={handleModeChange}
            hasEnoughData={hasEnoughData}
            likedCount={liked.length}
          />

          {currentMode === 'genre' && (
            <GenreChipRow
              selectedGenre={selectedGenre}
              onSelectGenre={(genre) => {
                setSelectedGenre(genre);
                setTracks([]);
                setStackKey(prev => prev + 1);
              }}
            />
          )}

          <BpmFilter
            bpmMin={bpmMin}
            bpmMax={bpmMax}
            onChange={handleBpmChange}
          />

          {hasEnoughData && tasteProfile.topGenres.length > 0 && (
            <div className="taste-profile">
              <div className="profile-label">Your taste:</div>
              <div className="top-genres">
                {tasteProfile.topGenres.slice(0, 3).map((g, i) => (
                  <span key={i} className="genre-tag">{g.genre}</span>
                ))}
              </div>
            </div>
          )}
        </>
        )}
      </header>

      <main className="app-main">
        {renderTabContent()}
      </main>

      <PlayerBar currentTrack={currentTrack} />

      {showOnboarding && (
        <OnboardingFlow
          user={user}
          initialPreferences={onboardingPreferences}
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
        />
      )}

      {/* Tutorial overlay */}
      {showTutorial && currentTab === 'discover' && (
        <GestureTutorial onDone={() => {
          localStorage.setItem('swipemusic_tutorial_done', 'true');
          setShowTutorial(false);
        }} />
      )}

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button
          className={`nav-tab ${currentTab === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'discover' ? 'active' : ''}`}
          onClick={() => { if (currentTab !== 'discover') { setCurrentTab('discover'); } }}
        >
          <span className="nav-icon">🎵</span>
          <span className="nav-label">Discover</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => setCurrentTab('search')}
        >
          <span className="nav-icon">🔍</span>
          <span className="nav-label">Search</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'crates' ? 'active' : ''}`}
          onClick={() => setCurrentTab('crates')}
        >
          <span className="nav-icon">🗂</span>
          <span className="nav-label">Crates</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </div>
    </div>
  );
}

export default App;
