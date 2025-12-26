const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
    adminLogin,
    createAdmin,
    verifyToken
} = require('../controllers/authController');

// Public routes
router.post('/login', adminLogin);
router.post('/register', createAdmin); // For initial setup - should be disabled in production

// Protected routes
router.get('/verify', authenticateAdmin, verifyToken);

module.exports = router;
