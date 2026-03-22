import React, { useState, useCallback, useRef } from 'react';
import './SearchScreen.css';

const API_BASE = '/api';

const SearchScreen = ({ onPlayTrack, onLike, onSaveToCrate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.tracks || []);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    stopAudio();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const togglePreview = (track) => {
    if (!track.preview) return;

    if (playingId === track.id) {
      stopAudio();
      return;
    }

    stopAudio();
    const audio = new Audio(track.preview);
    audio.volume = 0.8;
    audio.play().catch(() => {});
    audio.addEventListener('ended', () => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);

    // Also notify parent PlayerBar
    if (onPlayTrack) onPlayTrack(track);
  };

  const QUICK_SEARCHES = [
    { label: '🎛 Techno', q: 'techno' },
    { label: '🏠 House', q: 'house music' },
    { label: '🥁 Drum & Bass', q: 'drum and bass' },
    { label: '🌊 Melodic Techno', q: 'melodic techno' },
    { label: '💥 Breakbeat', q: 'breakbeat' },
    { label: '🍄 Psytrance', q: 'psytrance' },
    { label: '🎤 Hip Hop', q: 'hip hop' },
    { label: '🌍 Afro House', q: 'afro house' },
  ];

  return (
    <div className="search-screen">
      {/* Search bar */}
      <div className="search-bar-container">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Artist, track, label..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button className="search-clear" onClick={handleClear}>✕</button>
          )}
        </div>
      </div>

      {/* Quick searches (only shown when query is empty) */}
      {!hasSearched && !isLoading && (
        <div className="quick-searches">
          <p className="quick-label">Quick searches</p>
          <div className="quick-chips">
            {QUICK_SEARCHES.map(({ label, q }) => (
              <button
                key={q}
                className="quick-chip"
                onClick={() => {
                  setQuery(q);
                  doSearch(q);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="search-loading">
          <div className="search-spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">
              <p>No results for "<strong>{query}</strong>"</p>
              <p className="search-empty-sub">Try an artist name or track title</p>
            </div>
          ) : (
            <>
              <p className="results-count">{results.length} results</p>
              <div className="results-list">
                {results.map((track) => (
                  <div key={track.id} className="result-row">
                    <div
                      className={`result-artwork ${!track.preview ? 'no-preview' : ''}`}
                      onClick={() => togglePreview(track)}
                    >
                      {track.artworkSmall || track.artwork ? (
                        <img
                          src={track.artworkSmall || track.artwork}
                          alt={track.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="artwork-placeholder">🎵</div>
                      )}
                      {track.preview && (
                        <div className={`play-overlay ${playingId === track.id ? 'playing' : ''}`}>
                          {playingId === track.id ? '⏸' : '▶'}
                        </div>
                      )}
                    </div>

                    <div className="result-info" onClick={() => togglePreview(track)}>
                      <div className="result-title">{track.title}</div>
                      <div className="result-artist">{track.artist}</div>
                      {track.album && (
                        <div className="result-album">{track.album}</div>
                      )}
                      <div className="result-meta">
                        {track.bpm && <span className="result-bpm">♩ {track.bpm} BPM</span>}
                        {track.duration && (
                          <span className="result-duration">
                            {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                          </span>
                        )}
                        {!track.preview && <span className="result-no-preview">No preview</span>}
                      </div>
                    </div>

                    <div className="result-actions">
                      {onLike && (
                        <button
                          className="result-action-btn result-like"
                          onClick={() => onLike(track)}
                          title="Like"
                        >
                          ♥
                        </button>
                      )}
                      {onSaveToCrate && (
                        <button
                          className="result-action-btn result-crate"
                          onClick={() => onSaveToCrate(track)}
                          title="Save to Crate"
                        >
                          🔖
                        </button>
                      )}
                      {track.deepLink && (
                        <a
                          className="result-action-btn result-open"
                          href={track.deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in Deezer"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchScreen;
