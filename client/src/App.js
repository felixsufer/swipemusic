import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ModeSelector from './components/ModeSelector';
import SwipeStack from './components/SwipeStack';
import PlayerBar from './components/PlayerBar';
import LikedTracks from './components/LikedTracks';
import AuthScreen from './components/AuthScreen';
import { useTasteProfile } from './hooks/useTasteProfile';
import { useTrackEvents } from './hooks/useTrackEvents';
import { useAuth } from './hooks/useAuth';
import './App.css';

const API_BASE = '/api';

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Track events + DB-persisted seen/blacklist history
  const { seenIds: dbSeenIds, blacklistedIds: dbBlacklistedIds, recordEvent, loaded: eventsLoaded } = useTrackEvents(user?.id);

  const [localBlacklistedIds, setLocalBlacklistedIds] = useState(() => {
    const stored = localStorage.getItem('blacklistedIds');
    return stored ? JSON.parse(stored) : [];
  });
  const [crateItems, setCrateItems] = useState(() => {
    const stored = localStorage.getItem('crates');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentTab, setCurrentTab] = useState('discover');

  // Session ID for event tracking
  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

      const skippedIds = skipped.map(t => t.id).filter(Boolean);
      if (skippedIds.length > 0) url += `&skippedIds=${skippedIds.join(',')}`;

      if (allBlacklistedIds.length > 0) url += `&blacklistedIds=${allBlacklistedIds.join(',')}`;

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
  }, [currentMode, selectedGenre, getLikedTrackIds, seenTrackIdsByMode, allBlacklistedIds, skipped, dbSeenIds]);

  // Fetch tracks when mode changes — wait for DB history to load first
  useEffect(() => {
    if (!eventsLoaded) return; // Don't fetch until DB seenIds are loaded
    fetchTracks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode, selectedGenre, eventsLoaded]);

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setTracks([]);
    setCurrentTrack(null);
    setStackKey(prev => prev + 1);
    // seenTrackIdsByMode persists per-mode — switching modes gives fresh content
    // but switching BACK to same mode won't re-show already-seen tracks
  };

  const handleLike = (track) => {
    likeTrack(track);
    recordEvent('like', track, { mode: currentMode, genre: selectedGenre });
  };

  const handleSkip = (track) => {
    skipTrack(track);
    recordEvent('skip', track, { mode: currentMode, genre: selectedGenre });
  };

  const handleSaveToCrate = (track) => {
    const updated = [...crateItems, track];
    setCrateItems(updated);
    localStorage.setItem('crates', JSON.stringify(updated));
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

  const renderTabContent = () => {
    if (currentTab === 'discover') {
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
      />;
    } else if (currentTab === 'crates') {
      return <LikedTracks
        tracks={liked}
        crateItems={crateItems}
        onClose={() => setCurrentTab('discover')}
        onUnlike={handleUnlike}
      />;
    } else if (currentTab === 'search') {
      return <div className="coming-soon">
        <h2>Search</h2>
        <p>Coming soon</p>
      </div>;
    } else if (currentTab === 'profile') {
      return <div className="coming-soon">
        <h2>Profile</h2>
        <p>Coming soon</p>
      </div>;
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
          />

          {currentMode === 'genre' && (
            <div className="genre-selector">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="genre-select"
              >
                <option value="electronic">Electronic</option>
                <option value="dance">Dance</option>
                <option value="techno">Techno</option>
                <option value="house">House</option>
                <option value="bass">Bass Music</option>
                <option value="dubstep">Dubstep</option>
                <option value="dnb">Drum & Bass</option>
                <option value="pop">Pop</option>
                <option value="rock">Rock</option>
                <option value="metal">Metal</option>
                <option value="hiphop">Hip Hop</option>
                <option value="rap">Rap</option>
                <option value="rnb">R&B</option>
              </select>
            </div>
          )}

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

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button
          className={`nav-tab ${currentTab === 'discover' ? 'active' : ''}`}
          onClick={() => setCurrentTab('discover')}
        >
          <span className="nav-icon">🎵</span>
          <span className="nav-label">Discover</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'crates' ? 'active' : ''}`}
          onClick={() => setCurrentTab('crates')}
        >
          <span className="nav-icon">🗂</span>
          <span className="nav-label">Crates</span>
        </button>
        <button
          className={`nav-tab ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => setCurrentTab('search')}
        >
          <span className="nav-icon">🔍</span>
          <span className="nav-label">Search</span>
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
