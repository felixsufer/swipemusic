import React, { useMemo, useState } from 'react';
import { GENRE_VIBES } from './HomeScreen';
import './OnboardingFlow.css';

const BPM_RANGES = [
  { label: 'Any tempo', min: null, max: null, desc: 'Keep it open' },
  { label: '< 120', min: null, max: 120, desc: 'Downtempo / chill' },
  { label: '120–128', min: 120, max: 128, desc: 'House groove' },
  { label: '128–135', min: 128, max: 135, desc: 'Tech House energy' },
  { label: '135–145', min: 135, max: 145, desc: 'Trance lift' },
  { label: '145–160', min: 145, max: 160, desc: 'Techno drive' },
  { label: '160–180', min: 160, max: 180, desc: 'DnB pressure' },
  { label: '180+', min: 180, max: null, desc: 'Hard & fast' },
];

const DEFAULT_BPM = BPM_RANGES[0];

const isSameBpm = (a, b) => a.min === b.min && a.max === b.max;

const OnboardingFlow = ({ user, initialPreferences, onComplete, onSkip }) => {
  const [selectedGenres, setSelectedGenres] = useState(initialPreferences?.genres || []);
  const [selectedBpm, setSelectedBpm] = useState(() => {
    const match = BPM_RANGES.find((range) =>
      range.min === initialPreferences?.bpmMin && range.max === initialPreferences?.bpmMax
    );
    return match || DEFAULT_BPM;
  });

  const canContinue = selectedGenres.length > 0;

  const subtitle = useMemo(() => {
    const firstName = user?.user_metadata?.full_name?.split(' ')?.[0];
    return firstName ? `Let’s tune your first session, ${firstName}.` : 'Let’s tune your first session.';
  }, [user]);

  const toggleGenre = (genreId) => {
    setSelectedGenres((prev) => (
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId].slice(0, 5)
    ));
  };

  const handleContinue = () => {
    if (!canContinue) return;

    onComplete({
      genres: selectedGenres,
      bpmMin: selectedBpm.min,
      bpmMax: selectedBpm.max,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-sheet">
        <div className="onboarding-header">
          <span className="onboarding-kicker">First launch setup</span>
          <h2>Set your starting vibe</h2>
          <p>{subtitle}</p>
        </div>

        <section className="onboarding-section">
          <div className="onboarding-section-head">
            <h3>Pick up to 5 genres</h3>
            <span>{selectedGenres.length}/5</span>
          </div>
          <div className="onboarding-genre-grid">
            {GENRE_VIBES.map((genre) => {
              const active = selectedGenres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  className={`onboarding-genre-card ${active ? 'active' : ''}`}
                  style={{ '--genre-accent': genre.accent, '--genre-bg': genre.color }}
                  onClick={() => toggleGenre(genre.id)}
                >
                  <span className="onboarding-genre-emoji">{genre.emoji}</span>
                  <span className="onboarding-genre-label">{genre.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="onboarding-section">
          <div className="onboarding-section-head">
            <h3>Preferred BPM</h3>
            <span>Optional</span>
          </div>
          <div className="onboarding-bpm-list">
            {BPM_RANGES.map((range) => {
              const active = isSameBpm(selectedBpm, range);
              return (
                <button
                  key={range.label}
                  type="button"
                  className={`onboarding-bpm-pill ${active ? 'active' : ''}`}
                  onClick={() => setSelectedBpm(range)}
                >
                  <span>{range.label}</span>
                  <small>{range.desc}</small>
                </button>
              );
            })}
          </div>
        </section>

        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={onSkip}>Skip for now</button>
          <button
            type="button"
            className="onboarding-continue"
            disabled={!canContinue}
            onClick={handleContinue}
          >
            Start discovering
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
