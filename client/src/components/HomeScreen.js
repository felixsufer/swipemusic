import React from 'react';
import './HomeScreen.css';

const GENRE_VIBES = [
  { id: 'techno', label: 'Techno', emoji: '⚡', color: '#1a1a2e', accent: '#e040fb', artists: 'Charlotte de Witte · Richie Hawtin · Amelie Lens' },
  { id: 'house', label: 'House', emoji: '🏠', color: '#0d1b2a', accent: '#00b0ff', artists: 'Frankie Knuckles · Larry Heard · Kerri Chandler' },
  { id: 'dnb', label: 'Drum & Bass', emoji: '🥁', color: '#1b1b0d', accent: '#76ff03', artists: 'Goldie · Andy C · Noisia · Pendulum' },
  { id: 'melodictechno', label: 'Melodic Techno', emoji: '🌊', color: '#0a192f', accent: '#64ffda', artists: 'Anyma · Tale Of Us · Massano' },
  { id: 'deephouse', label: 'Deep House', emoji: '🌙', color: '#0d1117', accent: '#ffd740', artists: 'Moodymann · Theo Parrish · Move D' },
  { id: 'afrohouse', label: 'Afro House', emoji: '🌍', color: '#1a0a00', accent: '#ff6d00', artists: 'Black Coffee · Da Capo · Enoo Napa' },
  { id: 'psytrance', label: 'Psytrance', emoji: '🍄', color: '#0d0d1a', accent: '#ea80fc', artists: 'Infected Mushroom · Astrix · Shpongle' },
  { id: 'jungle', label: 'Jungle', emoji: '🌿', color: '#001400', accent: '#69f0ae', artists: 'Goldie · LTJ Bukem · Shy FX · Photek' },
  { id: 'techhouse', label: 'Tech House', emoji: '🔧', color: '#1a0d1a', accent: '#e040fb', artists: 'Chris Lake · Fisher · Green Velvet' },
  { id: 'ambient', label: 'Ambient', emoji: '🌌', color: '#050510', accent: '#82b1ff', artists: 'Brian Eno · Boards of Canada · Burial' },
  { id: 'breakbeat', label: 'Breakbeat', emoji: '💥', color: '#1a0a00', accent: '#ffab40', artists: 'The Prodigy · Chemical Brothers · Daft Punk' },
  { id: 'dubstep', label: 'Dubstep', emoji: '🔊', color: '#0d001a', accent: '#ff4081', artists: 'Skream · Benga · Digital Mystikz · Mala' },
  { id: 'trance', label: 'Trance', emoji: '✨', color: '#001a1a', accent: '#18ffff', artists: 'Armin van Buuren · Above & Beyond · Sasha' },
  { id: 'electronic', label: 'Electronic', emoji: '🎛️', color: '#1a1a1a', accent: '#b0bec5', artists: 'Four Tet · Aphex Twin · Jon Hopkins · Bonobo' },
  { id: 'hiphop', label: 'Hip-Hop', emoji: '🎤', color: '#1a1200', accent: '#ffd740', artists: 'Kendrick · J. Cole · Tyler the Creator' },
  { id: 'rnb', label: 'R&B', emoji: '💜', color: '#1a0a1a', accent: '#ce93d8', artists: 'Frank Ocean · SZA · Daniel Caesar' },
  { id: 'afrobeats', label: 'Afrobeats', emoji: '🥁', color: '#1a0800', accent: '#ff8f00', artists: 'Burna Boy · Wizkid · Tems · Davido' },
  { id: 'jazz', label: 'Jazz', emoji: '🎷', color: '#1a1000', accent: '#ffc107', artists: 'Miles Davis · Coltrane · Kamasi Washington' },
];

const HomeScreen = ({ onStartSwiping, onSelectGenre, onSelectMode, recentTracks = [], tasteProfile, liked = [], skipped = [] }) => {
  const totalSwipes = liked.length + skipped.length;

  return (
    <div className="home-screen">
      {/* Hero CTA */}
      <div className="home-hero">
        <div className="home-hero-text">
          <h1>SwipeSound</h1>
          <p>Discover music, build your crate</p>
        </div>
        <button className="home-cta-btn" onClick={() => onSelectMode('trending')}>
          Start Discovering →
        </button>
      </div>

      {/* Stats bar */}
      {totalSwipes > 0 && (
        <div className="home-stats">
          <div className="stat-item">
            <span className="stat-num">{totalSwipes}</span>
            <span className="stat-label">Swipes</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{liked.length}</span>
            <span className="stat-label">Liked</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{skipped.length}</span>
            <span className="stat-label">Skipped</span>
          </div>
        </div>
      )}

      {/* Recently discovered */}
      {recentTracks.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">Recently Discovered</h2>
          <div className="recent-tracks">
            {recentTracks.slice(0, 6).map((track, i) => (
              <div key={track.id || i} className="recent-track-chip">
                <img
                  src={track.artwork || track.albumCover}
                  alt={track.title}
                  className="recent-track-art"
                />
                <div className="recent-track-info">
                  <span className="recent-track-title">{track.title}</span>
                  <span className="recent-track-artist">{track.artist}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your taste modes */}
      {tasteProfile && tasteProfile.topGenres.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">Your Vibes</h2>
          <div className="vibe-pills">
            {tasteProfile.topGenres.slice(0, 4).map(g => (
              <button
                key={g.genre}
                className="vibe-pill"
                onClick={() => onSelectGenre(g.genre)}
              >
                {g.genre} <span className="vibe-count">{g.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Genre vibe cards */}
      <section className="home-section">
        <h2 className="home-section-title">Explore by Vibe</h2>
        <div className="vibe-cards-grid">
          {GENRE_VIBES.map(vibe => (
            <button
              key={vibe.id}
              className="vibe-card"
              style={{ background: `linear-gradient(135deg, ${vibe.color} 0%, ${vibe.accent}22 100%)`, borderColor: vibe.accent + '44' }}
              onClick={() => onSelectGenre(vibe.id)}
            >
              <span className="vibe-card-emoji">{vibe.emoji}</span>
              <span className="vibe-card-label" style={{ color: vibe.accent }}>{vibe.label}</span>
              <span className="vibe-card-artists">{vibe.artists}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;
export { GENRE_VIBES };
