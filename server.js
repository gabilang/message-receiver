const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// All requests should return the auth-callback.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'auth-callback.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Web App B server running at http://localhost:${PORT}`);
});
