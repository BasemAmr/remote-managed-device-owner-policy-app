/**
 * Entry point for Render/Production environments
 * Redirects to the actual server implementation in src/server.js
 */
require('./src/server.js');

// // Keep-alive logic for Render
// const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://remote-managed-device-owner-policy-app.onrender.com';
// const INTERVAL = 1800000; // 30 minutes

// function reloadWebsite() {
//     fetch(RENDER_URL)
//         .then(response => {
//             console.log(`[Keep-Alive] Pinged at ${new Date().toISOString()}: Status Code ${response.status}`);
//         })
//         .catch(error => {
//             console.error(`[Keep-Alive] Error at ${new Date().toISOString()}:`, error.message);
//         });
// }

// // Start the keep-alive interval
// if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
//     console.log(`[Keep-Alive] Monitoring started for ${RENDER_URL}`);
//     setInterval(reloadWebsite, INTERVAL);
// }
