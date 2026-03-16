import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import './SwipeCard.css';

const SwipeCard = ({ track, onSwipe, isTop, showHint, mode }) => {
  const [hintVisible, setHintVisible] = useState(false);
  const controls = useAnimation();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const saveOpacity = useTransform(y, [-100, -20], [1, 0]);

  // Color overlay based on drag direction
  const dragColorLeft = useTransform(x, [-150, 0], [0.3, 0]);
  const dragColorRight = useTransform(x, [0, 150], [0, 0.3]);
  const dragColorUp = useTransform(y, [-150, 0], [0.3, 0]);

  // Show hint animation on first load
  useEffect(() => {
    if (showHint && isTop) {
      const timer = setTimeout(() => {
        setHintVisible(true);
        controls.start({
          x: [0, 50, 0],
          transition: { duration: 0.8, ease: 'easeInOut' }
        }).then(() => {
          setHintVisible(false);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showHint, isTop, controls]);

  const handleDragEnd = async (event, info) => {
    const threshold = 100;
    const upThreshold = 80;

    if (info.offset.y < -upThreshold && Math.abs(info.offset.x) < threshold) {
      // Swipe UP = Save to Crate
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      await controls.start({ y: -700, opacity: 0, transition: { duration: 0.3 } });
      onSwipe('up', track);
    } else if (info.offset.x > threshold) {
      if (navigator.vibrate) navigator.vibrate(50);
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3 } });
      onSwipe('right', track);
    } else if (info.offset.x < -threshold) {
      if (navigator.vibrate) navigator.vibrate(50);
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3 } });
      onSwipe('left', track);
    } else {
      controls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWhyLabel = () => {
    if (mode === 'recommendations') return '✦ Similar to your likes';
    if (mode === 'genre') return `✦ ${track.genre || 'Genre'}`;
    if (mode === 'trending') return '✦ Trending';
    return null;
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, y, rotate, touchAction: 'none' }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileDrag={{ scale: 1.03 }}
    >
      <div className="card-content" style={{ backgroundImage: `url(${track.artwork || track.albumCover})` }}>
        {/* Source badge */}
        <div className="source-badge">{(track.source || 'deezer').toUpperCase()}</div>

        {/* BPM chip */}
        {track.bpm && (
          <div className="bpm-chip">♩ {track.bpm} BPM</div>
        )}

        {/* Why label */}
        {getWhyLabel() && (
          <div className="why-label">{getWhyLabel()}</div>
        )}
        {/* Color overlays for drag feedback */}
        <motion.div className="drag-overlay" style={{ backgroundColor: 'rgba(255, 23, 68, 1)', opacity: dragColorLeft }} />
        <motion.div className="drag-overlay" style={{ backgroundColor: 'rgba(0, 230, 118, 1)', opacity: dragColorRight }} />
        <motion.div className="drag-overlay" style={{ backgroundColor: 'rgba(99, 102, 241, 1)', opacity: dragColorUp }} />

        {/* Stamps */}
        <motion.div className="stamp stamp-like" style={{ opacity: likeOpacity }}>LIKE ♥</motion.div>
        <motion.div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>NOPE ✕</motion.div>
        <motion.div className="stamp stamp-save" style={{ opacity: saveOpacity }}>CRATE 🔖</motion.div>

        <div className="card-overlay">
          <div className="card-info">
            <h2 className="track-title">{track.title}</h2>
            <p className="track-artist">{track.artist}</p>
          </div>
        </div>
      </div>
      {hintVisible && (
        <div className="swipe-hint">Swipe to discover</div>
      )}
    </motion.div>
  );
};

export default SwipeCard;
