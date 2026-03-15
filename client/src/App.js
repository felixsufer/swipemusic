import React, { useState, useEffect, useCallback } from 'react';
import ModeSelector from './components/ModeSelector';
import SwipeStack from './components/SwipeStack';
import PlayerBar from './components/PlayerBar';
import LikedTracks from './components/LikedTracks';
import AuthScreen from './components/AuthScreen';
import { useTasteProfile } from './hooks/useTasteProfile';
import { useAuth } from './hooks/useAuth';
import './App.css';

const API_BASE = '/api';

function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [currentMode, setCurrentMode] = useState('trending');
  const [tracks, setTracks] = useState([]);
  const [seenTrackIds, setSeenTrackIds] = useState(new Set());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLikedTracks, setShowLikedTracks] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('electronic');
  const [stackKey, setStackKey] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [blacklistedIds, setBlacklistedIds] = useState(() => {
    const stored = localStorage.getItem('blacklistedIds');
    return stored ? JSON.parse(stored) : [];
  });
  const [crateItems, setCrateItems] = useState(() => {
    const stored = localStorage.getItem('crates');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentTab, setCurrentTab] = useState('discover');

  const {
    liked,
    tasteProfile,
    likeTrack,
    skipTrack,
    unlikeTrack,
    hasEnoughData,
    getLikedTrackIds
  } = useTasteProfile(user?.id);

  // Fetch tracks based on current mode
  const fetchTracks = useCallback(async (append = false) => {
    setIsLoading(true);
    try {
      let url = `${API_BASE}/tracks?mode=${currentMode}&limit=20`;

      if (currentMode === 'genre') {
        url += `&genre=${selectedGenre}`;
      } else if (currentMode === 'recommendations') {
        const likedIds = getLikedTrackIds();
        if (likedIds.length > 0) url += `&likedTrackIds=${likedIds.join(',')}`;
      }

      // Always send seen + blacklisted to backend so it filters them out
      if (seenTrackIds.size > 0) {
        url += `&seenIds=${Array.from(seenTrackIds).join(',')}`;
      }
      if (blacklistedIds.length > 0) {
        url += `&blacklistedIds=${blacklistedIds.join(',')}`;
      }
      // Also send liked IDs so backend never returns already-liked tracks
      const likedIds = getLikedTrackIds();
      if (likedIds.length > 0) {
        url += `&likedTrackIds=${likedIds.join(',')}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.tracks && data.tracks.length > 0) {
        // Also filter client-side as a safety net
        const newTracks = data.tracks.filter(track => !seenTrackIds.has(track.id));

        if (append) {
          setTracks(prev => [...prev, ...newTracks]);
        } else {
          setTracks(newTracks);
        }

        // Update seen track IDs — persist across mode switches
        setSeenTrackIds(prev => {
          const updated = new Set(prev);
          newTracks.forEach(track => updated.add(track.id));
          return updated;
        });
      } else {
        console.warn('No tracks received');
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMode, selectedGenre, getLikedTrackIds, seenTrackIds, blacklistedIds]);

  // Fetch tracks when mode changes
  useEffect(() => {
    fetchTracks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode, selectedGenre]);

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setTracks([]);
    // DO NOT reset seenTrackIds — persist across mode switches so backend never re-serves same tracks
    setCurrentTrack(null);
    setStackKey(prev => prev + 1);
  };

  const handleLike = (track) => {
    likeTrack(track);
  };

  const handleSkip = (track) => {
    skipTrack(track);
  };

  const handleSaveToCrate = (track) => {
    const updated = [...crateItems, track];
    setCrateItems(updated);
    localStorage.setItem('crates', JSON.stringify(updated));
  };

  const handleBlacklist = (track) => {
    const updated = [...blacklistedIds, track.id];
    setBlacklistedIds(updated);
    localStorage.setItem('blacklistedIds', JSON.stringify(updated));

    // Send event to backend
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'blacklist',
        track_id: track.id,
        user_id: user?.id,
        session_id: Date.now()
      })
    }).catch(err => console.error('Error sending blacklist event:', err));
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
