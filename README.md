# SwipeMusic

A mobile-first PWA music discovery app where users swipe through tracks (like Tinder) to build their taste profile.

## Architecture

- **Backend** (`server/`): Node.js/Express server that proxies Deezer API and handles taste profile logic
- **Frontend** (`client/`): React PWA with mobile-first swipe UI

## Features

- **Google OAuth Authentication**: Secure login with Google account
- **Supabase Data Persistence**: Cloud-synced liked/skipped tracks across devices
- Swipe right to like, left to skip tracks
- Three discovery modes:
  - **Trending**: Latest popular tracks
  - **Genre**: Browse tracks by genre (Electronic, Dance, Techno, House, Pop, Rock, Hip Hop, Rap)
  - **For You**: Personalized recommendations (unlocks after 5+ likes)
- 30-second audio preview for each track
- Built-in music player
- Taste profile based on liked tracks
- User profile menu with avatar and sign-out option
- Anonymous mode fallback (localStorage) for unauthenticated users

## Getting Started

### 1. Supabase Setup

Before running the app, you need to set up the database tables in Supabase:

1. Go to your Supabase project SQL Editor
2. Run the SQL script from `server/supabase-setup.sql`
3. This creates the following tables:
   - `user_profiles` - User profile information
   - `liked_tracks` - User's liked tracks with full track data
   - `skipped_tracks` - User's skipped track IDs

### 2. Backend

```bash
cd server
npm install
npm start
# Server runs on http://localhost:3001
```

### 3. Frontend

```bash
cd client
npm install --legacy-peer-deps
npm start
# Client runs on http://localhost:3000
```

The app will prompt you to sign in with Google. Once authenticated, all your liked/skipped tracks will be synced to Supabase.

## Tech Stack

### Backend
- Express.js
- CORS
- node-fetch
- Deezer API (no auth required)

### Frontend
- React
- Supabase (authentication + database)
- @supabase/supabase-js
- react-tinder-card
- framer-motion
- HTML5 Audio API
- LocalStorage (fallback for anonymous users)

## PWA Configuration

The app is configured as a Progressive Web App with:
- `manifest.json` for installability
- Service worker for offline capability
- Mobile-first responsive design
- Dark theme optimized for music discovery

## API Endpoints

- `GET /api/tracks?mode=[trending|genre|recommendations]&genre=...&likedTrackIds=...`
- `GET /api/track/:id`
- `GET /api/search?q=...&genre=...`
- `GET /health`

## Project Structure

```
swipemusic/
├── server/
│   ├── providers/
│   │   ├── MusicProvider.js (abstract interface)
│   │   ├── DeezerProvider.js (Deezer API implementation)
│   │   └── SpotifyProvider.js (stub)
│   ├── routes/
│   │   └── music.js
│   ├── supabase-setup.sql (database schema)
│   ├── index.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SwipeCard.js
│   │   │   ├── SwipeStack.js
│   │   │   ├── ModeSelector.js
│   │   │   ├── PlayerBar.js
│   │   │   ├── LikedTracks.js
│   │   │   └── AuthScreen.js (Google OAuth screen)
│   │   ├── hooks/
│   │   │   ├── useTasteProfile.js (Supabase sync)
│   │   │   └── useAuth.js (authentication)
│   │   ├── lib/
│   │   │   └── supabase.js (Supabase client)
│   │   ├── App.js
│   │   └── App.css
│   ├── public/
│   │   └── manifest.json
│   └── package.json
└── README.md
```

## Development Notes

- **Authentication**: Google OAuth via Supabase Auth
- **Data Persistence**: Authenticated users get cloud sync via Supabase; anonymous users fall back to localStorage
- **Database**: PostgreSQL via Supabase with Row Level Security policies
- Backend proxies Deezer API to avoid CORS issues
- Taste profile derives genre preferences from liked tracks
- After 5 likes, recommendation mode unlocks
- Mobile-first design with dark theme (#1a1a2e, #16213e)
- User avatars and profile info pulled from Google OAuth metadata

## Authentication Flow

1. User opens app → sees AuthScreen if not logged in
2. Click "Sign in with Google" → OAuth flow via Supabase
3. Successful auth → redirects back to app
4. App loads user's liked tracks from Supabase
5. All swipes sync to Supabase in real-time
6. User menu shows avatar and allows sign out

## Database Schema

**user_profiles**
- `id` (uuid, references auth.users)
- `email`, `display_name`, `avatar_url`
- `created_at`

**liked_tracks**
- `id` (bigserial)
- `user_id` (uuid, references auth.users)
- `track_id` (text)
- `track_data` (jsonb) - Full track object for offline access
- `liked_at` (timestamptz)

**skipped_tracks**
- `id` (bigserial)
- `user_id` (uuid, references auth.users)
- `track_id` (text)
- `skipped_at` (timestamptz)
