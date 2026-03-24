import React, { useState } from 'react';
import './LikedTracks.css';

const LikedTracks = ({ tracks, crateItems = [], onClose, onUnlike, onRemoveFromCrate }) => {
  const [activeTab, setActiveTab] = useState('liked');
  const displayTracks = activeTab === 'liked' ? tracks : crateItems;
  const isEmpty = (!tracks || tracks.length === 0) && (!crateItems || crateItems.length === 0);

  return (
    <div className="liked-tracks-container-fullscreen">
      <div className="liked-tracks-header">
        <h2>Crates</h2>
      </div>

      <div className="crate-tabs">
        <button
          className={`crate-tab ${activeTab === 'liked' ? 'active' : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          Liked ({tracks?.length || 0})
        </button>
        <button
          className={`crate-tab ${activeTab === 'crate' ? 'active' : ''}`}
          onClick={() => setActiveTab('crate')}
        >
          Saved to Crate ({crateItems?.length || 0})
        </button>
      </div>

      {displayTracks.length === 0 ? (
        <div className="empty-liked">
          <p>
            {activeTab === 'liked'
              ? 'No liked tracks yet'
              : 'No tracks saved to crate'}
          </p>
          <p className="subtext">
            {activeTab === 'liked'
              ? 'Start swiping right on tracks you love!'
              : 'Use the 🔖 button to save tracks for later'}
          </p>
        </div>
      ) : (
        <div className="liked-tracks-grid">
          {displayTracks.map((track) => (
            <div key={track.id} className="liked-track-card">
              <div className="track-card-image">
                <img src={track.artworkSmall || track.artwork || track.albumCoverMedium || track.albumCover} alt={track.album} />
                {activeTab === 'liked' && (
                  <button
                    className="unlike-button"
                    onClick={() => onUnlike(track.id)}
                    title="Remove from liked"
                  >
                    ♥
                  </button>
                )}
                {activeTab === 'crate' && onRemoveFromCrate && (
                  <button
                    className="unlike-button"
                    onClick={() => onRemoveFromCrate(track.id)}
                    title="Remove from crate"
                    style={{ backgroundColor: 'rgba(99,102,241,0.85)' }}
                  >
                    🗑
                  </button>
                )}
                <div className="track-source-badge">
                  {(track.source || 'deezer').toUpperCase()}
                </div>
              </div>
              <div className="track-card-info">
                <div className="track-card-title">{track.title}</div>
                <div className="track-card-artist">{track.artist}</div>
                {track.genre && (
                  <div className="track-card-genre">{track.genre}</div>
                )}
                {track.deepLink && (
                  <button
                    className="track-open-button"
                    onClick={() => window.open(track.deepLink, '_blank')}
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedTracks;
