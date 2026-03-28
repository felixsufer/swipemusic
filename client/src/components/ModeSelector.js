import React from 'react';
import './ModeSelector.css';

// Unlock threshold must match useTasteProfile.js
const FOR_YOU_THRESHOLD = 3;

const ModeSelector = ({ currentMode, onModeChange, hasEnoughData, likedCount = 0 }) => {
  const modes = [
    { id: 'trending', label: 'Trending', subtitle: "What's hot right now", requiresData: false },
    { id: 'recommendations', label: 'For You', subtitle: 'Based on your taste', requiresData: true },
    { id: 'genre', label: 'Genre', subtitle: 'Dig by style', requiresData: false }
  ];

  return (
    <div className="mode-selector">
      {modes.map(mode => {
        const isDisabled = mode.requiresData && !hasEnoughData;
        const isActive = currentMode === mode.id;

        // Dynamic progress label for locked For You tab
        let lockedSubtitle = null;
        if (isDisabled && mode.id === 'recommendations') {
          const remaining = FOR_YOU_THRESHOLD - likedCount;
          if (remaining === 1) {
            lockedSubtitle = 'Like 1 more track to unlock';
          } else {
            lockedSubtitle = `Like ${remaining} more tracks to unlock`;
          }
        }

        return (
          <button
            key={mode.id}
            className={`mode-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && onModeChange(mode.id)}
            disabled={isDisabled}
          >
            <div className="mode-label">{mode.label}</div>
            <div className="mode-subtitle">
              {lockedSubtitle || mode.subtitle}
            </div>
            {isDisabled && (
              <span className="lock-icon" title={`Unlock with ${FOR_YOU_THRESHOLD} likes`}>🔒</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
