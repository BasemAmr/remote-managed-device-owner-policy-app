const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');
const {
    registerDevice,
    getPolicies,
    reportViolation,
    submitRequest,
    checkApprovalStatus
} = require('../controllers/deviceController');

// Public routes
router.post('/register', registerDevice);

// Protected device routes
router.get('/policies', authenticateDevice, getPolicies);
router.post('/violations', authenticateDevice, reportViolation);
router.post('/requests', authenticateDevice, submitRequest);
router.get('/requests/:request_id', authenticateDevice, checkApprovalStatus);

module.exports = router;
