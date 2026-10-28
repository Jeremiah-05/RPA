// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config();

// Import database connection
require('./config/db');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const claimsRoutes = require('./routes/claimsRoutes');
const policyRoutes = require('./routes/policyRoutes');
const rpaRoutes = require('./routes/rpaRoutes');
const auditRoutes = require('./routes/auditRoutes');
const reportRoutes = require('./routes/reportRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

// Import RPA Output File Watcher
const { initRpaFileWatcher } = require('./utils/fileWatcher');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // Allow React Vite development server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts statically
const receiptsPath = path.join(__dirname, 'uploads', 'receipts');
app.use('/uploads/receipts', express.static(receiptsPath));

// Root Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Automated Expense Claim Verification API',
    timestamp: new Date().toISOString()
  });
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/rpa', rpaRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  // Multer-specific error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size limit exceeded. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Expense Claim RPA Backend is running on port ${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);

  // Start background file watcher for RPA output
  initRpaFileWatcher();
});

module.exports = { app, server };
