const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
    adminLogin,
    createAdmin,
    verifyToken,
    partnerLogin,
    unlockAdmin,
    createPartner
} = require('../controllers/authController');

// Public routes
router.post('/login', adminLogin);
router.post('/register', createAdmin); // For initial setup - should be disabled in production

// Partner routes
router.post('/partner/login', partnerLogin);
router.post('/partner/register', createPartner); // Can disable in prod
router.post('/partner/unlock', unlockAdmin);

// Protected routes
router.get('/verify', authenticateAdmin, verifyToken);

module.exports = router;
