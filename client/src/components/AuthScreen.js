import React from 'react';
import './AuthScreen.css';

const AuthScreen = ({ onSignIn }) => {
  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-logo">
          <h1 className="auth-title">SwipeMusic</h1>
          <p className="auth-tagline">Discover music you'll love. One swipe at a time.</p>
        </div>

        <button className="google-sign-in-button" onClick={onSignIn}>
          <span className="google-icon">🎵</span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
