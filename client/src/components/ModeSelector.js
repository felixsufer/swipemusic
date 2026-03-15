import React from 'react';
import './ModeSelector.css';

const ModeSelector = ({ currentMode, onModeChange, hasEnoughData }) => {
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

        return (
          <button
            key={mode.id}
            className={`mode-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && onModeChange(mode.id)}
            disabled={isDisabled}
          >
            <div className="mode-label">{mode.label}</div>
            <div className="mode-subtitle">
              {isDisabled ? 'Like 5 tracks to unlock' : mode.subtitle}
            </div>
            {isDisabled && <span className="lock-icon">🔒</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
