import React, { useState } from 'react';
import './GestureTutorial.css';

const STEPS = [
  { direction: 'right', emoji: '♥', label: 'Like', description: 'Swipe right to like a track', color: '#00e676', arrow: '→' },
  { direction: 'left', emoji: '✕', label: 'Skip', description: 'Swipe left to skip', color: '#ff1744', arrow: '←' },
  { direction: 'up', emoji: '🔖', label: 'Save to Crate', description: 'Swipe up to save for your next set', color: '#6366f1', arrow: '↑' },
  { direction: 'down', emoji: '🚫', label: 'Block', description: 'Swipe down to never see this track again', color: '#dc2626', arrow: '↓' },
];

const GestureTutorial = ({ onDone }) => {
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="gesture-tutorial-overlay">
      <div className="gesture-tutorial-card">
        <div className="tutorial-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="tutorial-arrow" style={{ color: current.color }}>{current.arrow}</div>
        <div className="tutorial-emoji" style={{ color: current.color }}>{current.emoji}</div>
        <h2 className="tutorial-label" style={{ color: current.color }}>{current.label}</h2>
        <p className="tutorial-desc">{current.description}</p>

        <div className="tutorial-actions">
          {isLast ? (
            <button className="tutorial-btn tutorial-btn-done" onClick={onDone}>
              Let's go 🎧
            </button>
          ) : (
            <>
              <button className="tutorial-btn tutorial-btn-skip" onClick={onDone}>
                Skip intro
              </button>
              <button className="tutorial-btn tutorial-btn-next" style={{ background: current.color }} onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestureTutorial;
