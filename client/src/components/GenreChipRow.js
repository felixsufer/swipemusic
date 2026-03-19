import React, { useEffect, useRef } from 'react';
import { GENRE_VIBES } from './HomeScreen';
import './GenreChipRow.css';

const GenreChipRow = ({ selectedGenre, onSelectGenre }) => {
  const rowRef = useRef(null);

  // Scroll selected chip into view when it changes
  useEffect(() => {
    if (!rowRef.current) return;
    const activeChip = rowRef.current.querySelector('.genre-chip.active');
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedGenre]);

  return (
    <div className="genre-chip-row" ref={rowRef}>
      {GENRE_VIBES.map(vibe => {
        const isActive = selectedGenre === vibe.id;
        return (
          <button
            key={vibe.id}
            className={`genre-chip ${isActive ? 'active' : ''}`}
            style={{
              '--chip-accent': vibe.accent,
              '--chip-bg': vibe.color,
            }}
            onClick={() => onSelectGenre(vibe.id)}
          >
            <span className="chip-emoji">{vibe.emoji}</span>
            <span className="chip-label">{vibe.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default GenreChipRow;
