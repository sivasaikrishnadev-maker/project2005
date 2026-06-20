const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getMySessions, getSession, completeSession } = require('../controllers/sessionController');

router.use(protect);
router.get('/',              getMySessions);           // GET   /api/sessions
router.get('/:id',           getSession);              // GET   /api/sessions/:id
router.patch('/:id/complete',completeSession);         // PATCH /api/sessions/:id/complete

module.exports = router;
