import React, { useState, useEffect, useCallback } from 'react';
import SwipeCard from './SwipeCard';
import './SwipeStack.css';

const HINT_SHOWN_KEY = 'swipemusic_hint_shown';

const SwipeStack = ({ tracks, onLike, onSkip, onNeedMore, onTopCardChange, onUndo }) => {
  const [swipedCount, setSwipedCount] = useState(0);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [showHint, setShowHint] = useState(false);

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
    } else {
      onSkip(track);
    }
  }, [swipedCount, tracks.length, onNeedMore, onLike, onSkip]);

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

  if (tracks.length === 0 || swipedCount >= tracks.length) {
    return (
      <div className="swipe-stack-container">
        <div className="empty-stack">
          <div className="skeleton-card"></div>
          <p>Loading tracks...</p>
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
                track={track}
                onSwipe={handleSwipe}
                isTop={index === 0}
                showHint={showHint && index === 0}
              />
            </div>
          );
        })}
      </div>

      {/* Action buttons below the stack */}
      <div className="action-buttons">
        <button
          className="action-btn btn-nope"
          onClick={handleButtonSkip}
          aria-label="Skip track"
        >
          ✕
        </button>
        <button
          className="action-btn btn-undo"
          onClick={handleUndoClick}
          disabled={!lastSwiped || swipedCount === 0}
          aria-label="Undo last swipe"
          style={{ opacity: (!lastSwiped || swipedCount === 0) ? 0.3 : 1 }}
        >
          ↩
        </button>
        <button
          className="action-btn btn-like"
          onClick={handleButtonLike}
          aria-label="Like track"
        >
          ♥
        </button>
      </div>
    </div>
  );
};

export default SwipeStack;
