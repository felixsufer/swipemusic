import React, { useState, useEffect, useCallback, useRef } from 'react';
import SwipeCard from './SwipeCard';
import './SwipeStack.css';

const HINT_SHOWN_KEY = 'swipemusic_hint_shown';
const API_BASE = '/api';

const SwipeStack = ({ tracks, onLike, onSkip, onNeedMore, onTopCardChange, onUndo, onSaveToCrate, onBlacklist, currentMode }) => {
  const [swipedCount, setSwipedCount] = useState(0);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // BPM cache: trackId -> bpm value (fetched lazily for top card)
  const [bpmCache, setBpmCache] = useState({});
  const fetchingBpm = useRef(new Set());

  // Check if hint should be shown
  useEffect(() => {
    const hintShown = localStorage.getItem(HINT_SHOWN_KEY);
    if (!hintShown) {
      setShowHint(true);
      localStorage.setItem(HINT_SHOWN_KEY, 'true');
    }
  }, []);

  // Notify parent when top card changes
  useEffect(() => {
    if (tracks.length > 0 && swipedCount < tracks.length) {
      const currentTopTrack = tracks[swipedCount];
      if (onTopCardChange) {
        onTopCardChange(currentTopTrack);
      }
    }
  }, [swipedCount, tracks, onTopCardChange]);

  // Lazy BPM fetch: when top card changes, fetch BPM if not cached
  useEffect(() => {
    if (tracks.length === 0 || swipedCount >= tracks.length) return;
    const topTrack = tracks[swipedCount];
    if (!topTrack) return;
    const trackId = topTrack.id;
    // Already have BPM from feed data or cache
    if (topTrack.bpm || bpmCache[trackId] !== undefined) return;
    // Already fetching
    if (fetchingBpm.current.has(trackId)) return;

    const sourceId = topTrack.sourceId || (trackId.includes(':') ? trackId.split(':')[1] : trackId);
    if (!sourceId) return;

    fetchingBpm.current.add(trackId);
    fetch(`${API_BASE}/track/${sourceId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.track) {
          setBpmCache(prev => ({ ...prev, [trackId]: data.track.bpm || null }));
        }
      })
      .catch(() => {})
      .finally(() => fetchingBpm.current.delete(trackId));

    // Pre-fetch BPM for next card (card at index 1) so it's ready when user swipes
    const nextTrack = tracks[swipedCount + 1];
    if (nextTrack && !nextTrack.bpm && bpmCache[nextTrack.id] === undefined && !fetchingBpm.current.has(nextTrack.id)) {
      const nextSourceId = nextTrack.sourceId || (nextTrack.id.includes(':') ? nextTrack.id.split(':')[1] : nextTrack.id);
      if (nextSourceId) {
        fetchingBpm.current.add(nextTrack.id);
        fetch(`${API_BASE}/track/${nextSourceId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && data.track) {
              setBpmCache(prev => ({ ...prev, [nextTrack.id]: data.track.bpm || null }));
            }
          })
          .catch(() => {})
          .finally(() => fetchingBpm.current.delete(nextTrack.id));
      }
    }
  }, [swipedCount, tracks, bpmCache]);

  const visibleTracks = tracks.slice(swipedCount);
  const displayTracks = visibleTracks.slice(0, 3); // render top 3 for perf

  const handleSwipe = useCallback((direction, track) => {
    const swipeAction = {
      track,
      direction,
      index: swipedCount
    };
    setLastSwiped(swipeAction);

    setSwipedCount(prev => {
      const next = prev + 1;
      if (tracks.length - next <= 2) {
        onNeedMore();
      }
      return next;
    });

    if (direction === 'right') {
      onLike(track);
    } else if (direction === 'up') {
      if (onSaveToCrate) onSaveToCrate(track);
    } else if (direction === 'down') {
      if (onBlacklist) onBlacklist(track);
    } else {
      onSkip(track);
    }
  }, [swipedCount, tracks.length, onNeedMore, onLike, onSkip, onSaveToCrate]);

  const handleButtonLike = useCallback(() => {
    if (swipedCount >= tracks.length) return;
    const currentTrack = tracks[swipedCount];
    handleSwipe('right', currentTrack);
  }, [swipedCount, tracks, handleSwipe]);

  const handleButtonSkip = useCallback(() => {
    if (swipedCount >= tracks.length) return;
    const currentTrack = tracks[swipedCount];
    handleSwipe('left', currentTrack);
  }, [swipedCount, tracks, handleSwipe]);

  const handleSaveToCrate = useCallback(() => {
    if (swipedCount >= tracks.length) return;
    const currentTrack = tracks[swipedCount];
    if (onSaveToCrate) {
      onSaveToCrate(currentTrack);
    }
  }, [swipedCount, tracks, onSaveToCrate]);

  const handleBlacklist = useCallback(() => {
    if (swipedCount >= tracks.length) return;
    const currentTrack = tracks[swipedCount];
    if (onBlacklist) {
      onBlacklist(currentTrack);
    }
    // Swipe away the card as "down"
    handleSwipe('down', currentTrack);
    setShowMoreMenu(false);
  }, [swipedCount, tracks, onBlacklist, handleSwipe]);

  const handleOpenInSource = useCallback(() => {
    if (swipedCount >= tracks.length) return;
    const currentTrack = tracks[swipedCount];
    if (currentTrack.deepLink) {
      window.open(currentTrack.deepLink, '_blank');
    } else {
      alert('No external link available for this track');
    }
    setShowMoreMenu(false);
  }, [swipedCount, tracks]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (tracks.length === 0 || swipedCount >= tracks.length) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleButtonLike();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleButtonSkip();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSaveToCrate();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleBlacklist();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tracks, swipedCount, handleButtonLike, handleButtonSkip]);

  const handleUndoClick = () => {
    if (!lastSwiped || swipedCount === 0) return;

    setSwipedCount(prev => prev - 1);

    if (onUndo) {
      onUndo(lastSwiped);
    }

    setLastSwiped(null);
  };

  if (tracks.length === 0) {
    return (
      <div className="swipe-stack-container">
        <div className="empty-stack">
          <div className="skeleton-card"></div>
          <p>Loading tracks...</p>
        </div>
      </div>
    );
  }

  if (swipedCount >= tracks.length) {
    return (
      <div className="swipe-stack-container">
        <div className="empty-stack">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>You're all caught up</p>
          <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '20px' }}>Loading more tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-stack-container">
      <div className="swipe-stack">
        {displayTracks.map((track, index) => {
          // Enhanced depth effect
          let transform = 'none';
          if (index === 1) {
            transform = 'scale(0.95) translateY(14px)';
          } else if (index === 2) {
            transform = 'scale(0.90) translateY(28px)';
          }

          return (
            <div
              key={track.id}
              className="card-layer"
              style={{
                zIndex: displayTracks.length - index,
                transform,
                pointerEvents: index === 0 ? 'auto' : 'none',
              }}
            >
              <SwipeCard
                track={(index === 0 || index === 1) ? { ...track, bpm: track.bpm || bpmCache[track.id] || null } : track}
                onSwipe={handleSwipe}
                isTop={index === 0}
                showHint={showHint && index === 0}
                mode={currentMode}
              />
            </div>
          );
        })}
      </div>

      {/* Action buttons below the stack */}
      <div className="action-buttons">
        <button
          className="action-btn btn-skip"
          onClick={handleButtonSkip}
          aria-label="Skip track"
        >
          ✕
        </button>
        <button
          className="action-btn btn-crate"
          onClick={handleSaveToCrate}
          aria-label="Save to crate"
        >
          🔖
        </button>
        <button
          className="action-btn btn-like"
          onClick={handleButtonLike}
          aria-label="Like track"
        >
          ♥
        </button>
        <div className="more-menu-container">
          <button
            className="action-btn btn-more"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            aria-label="More options"
          >
            ···
          </button>
          {showMoreMenu && (
            <div className="more-menu">
              <button onClick={handleOpenInSource}>Open in source</button>
              <button onClick={handleBlacklist} className="danger">Not for me / Blacklist</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwipeStack;
