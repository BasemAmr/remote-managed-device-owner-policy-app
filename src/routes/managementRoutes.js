const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const {
    getDevices,
    getInstalledApps,
    setAppPolicy,
    setAppPolicyRedShield,
    getBlockedUrls,
    addBlockedUrl,
    removeBlockedUrl,
    setBlockedUrlRedShield,
    getPendingRequests,
    resolveRequest,
    getViolations,
    updateSettings,
    getSettings,
    getDeviceAccessibilityServices,
    setAccessibilityServiceLock,
    setAccessibilityRedShield,
    getDevicePermissions
} = require('../controllers/managementController');

// All management routes require admin authentication
router.use(authenticateAdmin);

// Device management
router.get('/devices', getDevices);
router.get('/devices/:device_id/apps', getInstalledApps);
router.get('/devices/:device_id/settings', getSettings);
router.put('/devices/:device_id/settings', updateSettings);

// App policies
router.post('/policies/apps', setAppPolicy);
router.patch('/policies/apps/red-shield', setAppPolicyRedShield);

// URL blacklist
router.get('/policies/urls', getBlockedUrls);
router.post('/policies/urls', addBlockedUrl);
router.delete('/policies/urls/:id', removeBlockedUrl);
router.patch('/policies/urls/:id/red-shield', setBlockedUrlRedShield);

// Approval requests
router.get('/requests', getPendingRequests);
router.put('/requests/:id', resolveRequest);

// Violations
router.get('/violations', getViolations);

// Accessibility services
router.get('/devices/:device_id/accessibility-services', getDeviceAccessibilityServices);
router.post('/devices/:device_id/accessibility-services/lock', setAccessibilityServiceLock);
router.patch('/devices/:device_id/accessibility-services/red-shield', setAccessibilityRedShield);
router.get('/devices/:device_id/permissions', getDevicePermissions);

module.exports = router;
