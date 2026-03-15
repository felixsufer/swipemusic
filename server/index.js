const express = require('express');
const cors = require('cors');
const path = require('path');
const musicRoutes = require('./routes/music');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// API routes first
app.use('/api', musicRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React production build
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SwipeSound server running on port ${PORT}`);
});
