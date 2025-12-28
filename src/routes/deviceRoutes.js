const express = require('express');
const router = express.Router();
const { authenticateDevice } = require('../middleware/auth');
const {
    registerDevice,
    getPolicies,
    reportViolation,
    submitRequest,
    checkApprovalStatus,
    getUrls,
    heartbeat,
    applyPolicy,
    logViolationsBatch,
    getAccessRequests,
    uploadApps
} = require('../controllers/deviceController');

// Public routes
router.post('/register', registerDevice);

// Protected device routes
router.get('/policies', authenticateDevice, getPolicies);
router.post('/policies', authenticateDevice, applyPolicy);
router.post('/violations', authenticateDevice, reportViolation);
router.post('/violations/batch', authenticateDevice, logViolationsBatch);
router.post('/requests', authenticateDevice, submitRequest);
router.get('/requests', authenticateDevice, getAccessRequests);
router.get('/requests/:request_id', authenticateDevice, checkApprovalStatus);

// NEW ROUTES (Fixes 404 errors)
router.get('/urls', authenticateDevice, getUrls);
router.post('/heartbeat', authenticateDevice, heartbeat);
router.post('/apps', authenticateDevice, uploadApps);

module.exports = router;
