require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS to allow requests from your React frontend
app.use(cors({
  origin: 'http://localhost:3001', // Adjust if your frontend runs on a different port
  credentials: true,
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Configure express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: true,
}));

// Initialize Google OAuth2 client
const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_CALLBACK_URL,
});

// Google OAuth callback endpoint
app.post('/auth/google/callback', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    req.session.user = {
      id: payload['sub'],
      email: payload['email'],
      name: payload['name'],
    };
    res.status(200).json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.status(200).json({ success: true });
  });
});

// Sample API route for dues information
app.get('/api/dues', (req, res) => {
  res.json({
    amountDue: 50,
    status: "Pending"
  });
});

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// API endpoint to get the logged-in user's data
app.get('/api/user', (req, res) => {
  if (req.session && req.session.user) {
    // If the user is logged in, return their session data
    res.status(200).json(req.session.user);
  } else {
    // If no user is logged in, return an unauthorized error
    res.status(401).json({ message: 'Not logged in' });
  }
});

// // Fallback route for SPA (if serving frontend from backend)
// app.get('/*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});