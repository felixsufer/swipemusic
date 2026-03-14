import React from 'react';
import './LikedTracks.css';

const LikedTracks = ({ tracks, onClose, onUnlike }) => {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="liked-tracks-overlay">
        <div className="liked-tracks-container">
          <div className="liked-tracks-header">
            <h2>Liked Tracks</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="empty-liked">
            <p>No liked tracks yet</p>
            <p className="subtext">Start swiping right on tracks you love!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="liked-tracks-overlay" onClick={onClose}>
      <div className="liked-tracks-container" onClick={(e) => e.stopPropagation()}>
        <div className="liked-tracks-header">
          <h2>Liked Tracks ({tracks.length})</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="liked-tracks-grid">
          {tracks.map((track) => (
            <div key={track.id} className="liked-track-card">
              <div className="track-card-image">
                <img src={track.albumCoverMedium || track.albumCover} alt={track.album} />
                <button
                  className="unlike-button"
                  onClick={() => onUnlike(track.id)}
                  title="Remove from liked"
                >
                  ♥
                </button>
              </div>
              <div className="track-card-info">
                <div className="track-card-title">{track.title}</div>
                <div className="track-card-artist">{track.artist}</div>
                {track.genre && (
                  <div className="track-card-genre">{track.genre}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LikedTracks;
