const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Richpanel AI Agent Server is running',
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// API Routes
app.use('/api/chat', require('./src/routes/chat'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/agent', require('./src/routes/agent'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Richpanel AI Agent Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${corsOptions.origin}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
