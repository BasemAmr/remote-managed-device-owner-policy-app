const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const managementRoutes = require('./routes/managementRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Self-Control Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/management', managementRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Self-Control Backend Server Running      ║
╚════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV}
⏰ Started: ${new Date().toLocaleString()}

Available endpoints:
  GET  /                        - API info
  GET  /health                  - Health check
  
  Auth API:
  POST /api/auth/login          - Admin login
  POST /api/auth/register       - Create admin (setup only)
  GET  /api/auth/verify         - Verify token
  
  Device API:
  POST /api/device/register     - Register device
  GET  /api/device/policies     - Get policies
  POST /api/device/violations   - Report violation
  POST /api/device/requests     - Submit request
  
  Management API (🔒 Protected):
  GET  /api/management/devices  - List devices
  GET  /api/management/requests - Pending requests
  GET  /api/management/violations - View violations

Press Ctrl+C to stop
  `);
});

module.exports = app;
