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

const HomeScreen = ({
  onStartSwiping,
  onSelectGenre,
  onSelectMode,
  recentTracks = [],
  tasteProfile,
  liked = [],
  skipped = [],
  hasEnoughData = false,
  crateItems = [],
  streak = 0,
  todayLikes = 0,
  todaySwipes = 0,
  totalDays = 0,
  onboardingPreferences = null,
}) => {
  const totalSwipes = liked.length + skipped.length;

  // Recently liked = last 6 liked tracks from DB (persistent across sessions)
  const recentlyLiked = liked.slice(0, 6);

  // Top artist from taste profile
  const topArtist = tasteProfile?.topArtists?.[0]?.artist || null;
  const topArtistCount = tasteProfile?.topArtists?.[0]?.count || 0;

  // Streak milestone labels
  const streakLabel =
    streak === 0 ? 'Start your streak' :
    streak === 1 ? '1 Day Streak' :
    `${streak} Day Streak`;

  const streakSub =
    streak === 0 ? 'Swipe to begin' :
    streak < 3 ? 'Keep it going tomorrow!' :
    streak < 7 ? 'Getting warmer 🔥' :
    streak < 14 ? 'One week strong!' :
    streak < 30 ? `${streak} days and counting` :
    `🏆 ${streak} day legend`;

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

      {onboardingPreferences?.genres?.length > 0 && (
        <div className="onboarding-summary-card">
          <div className="onboarding-summary-copy">
            <span className="onboarding-summary-kicker">Starter profile</span>
            <strong>{onboardingPreferences.genres.slice(0, 3).join(' • ')}</strong>
            <span>Using your onboarding picks to shape your first feed{onboardingPreferences.bpmMin != null || onboardingPreferences.bpmMax != null ? ` · BPM ${onboardingPreferences.bpmMin ?? '<'}-${onboardingPreferences.bpmMax ?? '+'}` : ''}</span>
          </div>
          <button className="onboarding-summary-btn" onClick={() => onSelectGenre(onboardingPreferences.genres[0])}>
            Jump in →
          </button>
        </div>
      )}

      {/* Streak card — always visible (motivates new users to start) */}
      <div className="streak-card">
        <div className="streak-main">
          <span className="streak-flame">🔥</span>
          <div className="streak-text">
            <span className="streak-count">{streak}</span>
            <span className="streak-label">{streakLabel}</span>
            <span className="streak-sub">{streakSub}</span>
          </div>
        </div>
        <div className="streak-today">
          {todaySwipes > 0 && (
            <>
              <div className="streak-today-item">
                <span className="streak-today-num">{todaySwipes}</span>
                <span>swipes today</span>
              </div>
              <div className="streak-today-item">
                <span className="streak-today-num">{todayLikes}</span>
                <span>liked</span>
              </div>
            </>
          )}
          {todaySwipes === 0 && streak > 0 && (
            <div className="streak-today-item" style={{ opacity: 0.5 }}>
              <span>Swipe to keep<br/>streak alive!</span>
            </div>
          )}
          {totalDays > 1 && (
            <span className="streak-new-badge">{totalDays} days</span>
          )}
        </div>
      </div>

      {/* Stats bar — shown once there's data */}
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
          <div className="stat-item">
            <span className="stat-num">{crateItems.length}</span>
            <span className="stat-label">In Crate</span>
          </div>
        </div>
      )}

      {/* For You unlock card — shown when hasEnoughData */}
      {hasEnoughData && (
        <div className="for-you-card" onClick={() => onSelectMode('recommendations')}>
          <div className="for-you-content">
            <span className="for-you-icon">✨</span>
            <div>
              <div className="for-you-title">For You — Ready</div>
              <div className="for-you-sub">Personalised feed based on {liked.length} liked tracks</div>
            </div>
          </div>
          <span className="for-you-arrow">→</span>
        </div>
      )}

      {/* Recently Liked — from persistent DB */}
      {recentlyLiked.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">Recently Liked</h2>
            <button className="home-section-link" onClick={() => onSelectMode('recommendations')}>
              {hasEnoughData ? 'See For You →' : `${Math.max(0, 3 - liked.length)} more to unlock`}
            </button>
          </div>
          <div className="recent-tracks">
            {recentlyLiked.map((track, i) => (
              <div key={track.id || i} className="recent-track-chip">
                <img
                  src={track.artworkSmall || track.artwork || track.albumCover}
                  alt={track.title}
                  className="recent-track-art"
                  onError={(e) => { e.target.style.background = '#333'; e.target.style.display = 'none'; }}
                />
                <div className="recent-track-info">
                  <span className="recent-track-title">{track.title}</span>
                  <span className="recent-track-artist">{track.artist}</span>
                </div>
                {track.genre && (
                  <span className="recent-track-genre">{track.genre}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top artist spotlight — once taste is established */}
      {topArtist && topArtistCount >= 2 && (
        <div
          className="artist-spotlight"
          onClick={() => {
            // Find matching genre vibe card artist and jump to genre, or go to For You
            if (hasEnoughData) onSelectMode('recommendations');
            else onStartSwiping();
          }}
        >
          <div className="artist-spotlight-inner">
            <span className="spotlight-label">Your top artist</span>
            <span className="spotlight-artist">{topArtist}</span>
            <span className="spotlight-count">{topArtistCount} liked tracks</span>
          </div>
          <span className="spotlight-arrow">→</span>
        </div>
      )}

      {/* Your taste modes */}
      {tasteProfile && tasteProfile.topGenres.length > 0 && (
        <section className="home-section">
          <h2 className="home-section-title">Your Vibes</h2>
          <div className="vibe-pills">
            {tasteProfile.topGenres.slice(0, 5).map(g => (
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
