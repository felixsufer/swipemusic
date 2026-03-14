import React from 'react';
import './ModeSelector.css';

const ModeSelector = ({ currentMode, onModeChange, hasEnoughData }) => {
  const modes = [
    { id: 'recommendations', label: 'For You', requiresData: true },
    { id: 'trending', label: 'Trending', requiresData: false },
    { id: 'genre', label: 'Genre', requiresData: false }
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
            {mode.label}
            {isDisabled && <span className="lock-icon">🔒</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
