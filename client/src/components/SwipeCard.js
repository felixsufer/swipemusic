import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import './SwipeCard.css';

const SwipeCard = ({ track, onSwipe, isTop, showHint }) => {
  const [hintVisible, setHintVisible] = useState(false);
  const controls = useAnimation();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  // Color overlay based on drag direction
  const dragColorLeft = useTransform(x, [-150, 0], [0.3, 0]);
  const dragColorRight = useTransform(x, [0, 150], [0, 0.3]);

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
    if (info.offset.x > threshold) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      await controls.start({ x: 600, opacity: 0, transition: { duration: 0.3 } });
      onSwipe('right', track);
    } else if (info.offset.x < -threshold) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      await controls.start({ x: -600, opacity: 0, transition: { duration: 0.3 } });
      onSwipe('left', track);
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, rotate, touchAction: 'none' }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileDrag={{ scale: 1.03 }}
    >
      <div className="card-content" style={{ backgroundImage: `url(${track.albumCover})` }}>
        {/* Color overlays for drag feedback */}
        <motion.div
          className="drag-overlay"
          style={{
            backgroundColor: 'rgba(255, 23, 68, 1)',
            opacity: dragColorLeft
          }}
        />
        <motion.div
          className="drag-overlay"
          style={{
            backgroundColor: 'rgba(0, 230, 118, 1)',
            opacity: dragColorRight
          }}
        />

        {/* Stamps — inside overflow:hidden card */}
        <motion.div className="stamp stamp-like" style={{ opacity: likeOpacity }}>LIKE ♥</motion.div>
        <motion.div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>NOPE ✕</motion.div>

        <div className="card-overlay">
          <div className="card-info">
            <h2 className="track-title">{track.title}</h2>
            <p className="track-artist">{track.artist}</p>
            {track.duration && (
              <span className="track-duration">{formatDuration(track.duration)}</span>
            )}
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
