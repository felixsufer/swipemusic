import React, { useState, useEffect, useRef } from 'react';
import { shareTrack } from '../lib/shareTrack';
import './PlayerBar.css';

const PlayerBar = ({ currentTrack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shareToast, setShareToast] = useState(null); // 'shared' | 'copied' | null
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (currentTrack && currentTrack.preview) {
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio
      audioRef.current = new Audio(currentTrack.preview);

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
      });

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      // Auto-play when new track is set
      audioRef.current.play().catch(err => {
        console.error('Error auto-playing audio:', err);
      });
      setIsPlaying(true);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleProgressBarClick = (e) => {
    if (!audioRef.current || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const result = await shareTrack(currentTrack);
    if (result.method === 'abort') return;
    const msg = result.method === 'share' ? 'shared' : result.method === 'clipboard' ? 'copied' : null;
    if (msg) {
      setShareToast(msg);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShareToast(null), 2500);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  // Always show PlayerBar with placeholder state
  if (!currentTrack) {
    return (
      <div className="player-bar">
        <div className="player-progress-container" style={{ opacity: 0 }}>
          <div className="player-progress" style={{ width: '0%' }}></div>
        </div>

        <div className="player-content">
          <div className="player-info">
            <div className="player-track-info">
              <div className="player-track-title placeholder">Start swiping to play</div>
              <div className="player-track-artist placeholder">Discover music you'll love</div>
            </div>
          </div>

          <div className="player-controls">
            <button className="player-play-button" disabled style={{ opacity: 0.5 }}>
              ▶
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-bar">
      <div
        className="player-progress-container"
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="player-progress" style={{ width: `${progressPercentage}%` }}></div>
      </div>

      <div className="player-content">
        <div className="player-info">
          {(currentTrack.artworkSmall || currentTrack.artwork || currentTrack.albumCoverSmall || currentTrack.albumCover) && (
            <img
              src={currentTrack.artworkSmall || currentTrack.artwork || currentTrack.albumCoverSmall || currentTrack.albumCover}
              alt={currentTrack.album}
              className="player-album-art"
            />
          )}
          <div className="player-track-info">
            <div className="player-track-title">
              <span className="preview-badge">PREVIEW</span>
              {currentTrack.title}
            </div>
            <div className="player-track-artist">{currentTrack.artist}</div>
          </div>
        </div>

        <div className="player-controls">
          <button className="player-play-button" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <button
            className="player-share-button"
            onClick={handleShare}
            title="Share track"
            aria-label="Share track"
          >
            {shareToast === 'shared' ? '✅' : shareToast === 'copied' ? '📋' : '↗'}
          </button>
        </div>
      </div>
      {shareToast && (
        <div className="player-share-toast">
          {shareToast === 'copied' ? 'Link copied!' : 'Shared!'}
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
