const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { generateAnalytics, getMyAnalytics, getSessionAnalytics } = require('../controllers/analyticsController');

router.use(protect);
router.post('/generate',              generateAnalytics);     // POST /api/analytics/generate
router.get('/me',                     getMyAnalytics);        // GET  /api/analytics/me
router.get('/session/:sessionId',     getSessionAnalytics);   // GET  /api/analytics/session/:id

module.exports = router;
